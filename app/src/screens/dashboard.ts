import { ui } from '../ui/state';
import {
  addMonths,
  compact,
  daysInMonth,
  money,
  monthLabel,
  parseDate,
  pct,
  shortDate,
  thisMonth,
  thisYear,
  today,
} from '../lib/dates';
import { DAY3, DAYS, MON, MONTHS, esc, greetingWord, pad } from '../lib/constants';
import { byValue, catColor, groupBy, incIn, incInYear, initials, sortTx, sum, txIn, txInYear } from '../queries/ledger';
import { MonthPoint, monthSeries, movers, yearMonths } from '../queries/compare';
import {
  backupBanner,
  budgetBanner,
  budgetSection,
  cashSection,
  catRows,
  dayGroups,
  emptyArt,
  fuelSection,
  incomeSection,
  installBanner,
  leftLine,
  moverRows,
  sourceSection,
  tiles,
  txRow,
} from '../ui/shared';
import { S } from '../data/storage';
import { ADD_BTN } from '../ui/render';
import { barsSVG, dailyChartSVG, donutSVG } from '../ui/charts';
import type { Tx } from '../data/model';
/* ---------- DASHBOARD ---------- */
/** Month | Year: what the arrows step through and what the cards sum. */
export function scopeSeg() {
  const b = (v: 'month' | 'year', label: string) =>
    `<button type="button" data-scope="${v}" class="${ui.scope === v ? 'on' : ''}" aria-pressed="${ui.scope === v}">${label}</button>`;
  return `<div class="seg scope" role="group" aria-label="Show by">${b('month', 'Month')}${b('year', 'Year')}</div>`;
}
export function periodNav() {
  if (ui.scope === 'year') {
    const y = ui.period.slice(0, 4),
      isNow = y === thisYear();
    const next = addMonths(ui.period, 12) > thisMonth() ? thisMonth() : addMonths(ui.period, 12);
    return `<div class="topbar">
    <button type="button" class="btn-icon" data-period="${addMonths(ui.period, -12)}" aria-label="Previous year">‹</button>
    <div style="text-align:center;min-width:0"><h1>${esc(y)}</h1>${isNow ? '<span class="sub">January to today · tap a month to open it</span>' : '<button type="button" class="btn-ghost btn-sm" data-period="' + thisMonth() + '">Back to this year</button>'}</div>
    <button type="button" class="btn-icon" data-period="${next}" aria-label="Next year" ${y >= thisYear() ? 'disabled style="opacity:.3"' : ''}>›</button></div>`;
  }
  const isNow = ui.period === thisMonth();
  return `<div class="topbar">
    <button type="button" class="btn-icon" data-period="${addMonths(ui.period, -1)}" aria-label="Previous month">‹</button>
    <div style="text-align:center;min-width:0"><h1>${esc(monthLabel(ui.period))}</h1>${isNow ? '<span class="sub">Resets on the 1st · History keeps every month</span>' : '<button type="button" class="btn-ghost btn-sm" data-period="' + thisMonth() + '">Back to this month</button>'}</div>
    <button type="button" class="btn-icon" data-period="${addMonths(ui.period, 1)}" aria-label="Next month" ${ui.period >= thisMonth() ? 'disabled style="opacity:.3"' : ''}>›</button></div>`;
}
/** Greeting, the Month | Year switch, the period arrows and the banners; the same above both views. */
function header(includesToday: boolean) {
  const n = new Date();
  return `<div class="greet"><div class="grow"><div class="g-hi">${esc(greetingWord())}${S.profile.firstName ? ', ' + esc(S.profile.firstName) : ''}!</div><div class="g-sub">${esc(DAYS[n.getDay()] + ', ' + n.getDate() + ' ' + MONTHS[n.getMonth()] + ' ' + n.getFullYear())}</div></div>${ADD_BTN}<button type="button" class="avatar" data-go="settings" aria-label="Profile and settings">${esc(initials())}</button></div>
    ${scopeSeg()}
    ${periodNav()}
    ${installBanner()}
    ${includesToday ? budgetBanner() + backupBanner() : ''}`;
}
/** The thin category strip under a hero total. */
function catStrip(cats: { key: string; v: number }[], total: number) {
  return cats.length
    ? `<div class="strip">${cats.map(g => `<i style="width:${(g.v / total) * 100}%;background:${catColor(g.key)}" title="${esc(g.key)}: ${esc(money(g.v))}"></i>`).join('')}</div>`
    : '';
}
/** ▲ 12% / ▼ 8%; past tenfold it reads as a multiple (▲ 73×), which says more than a four-digit percentage. */
const changeText = (total: number, prev: number) => {
  if (!(prev > 0)) return '—';
  const arrow = total <= prev ? '▼ ' : '▲ ';
  return total >= prev * 10
    ? arrow + Math.round(total / prev) + '×'
    : arrow + Math.abs(Math.round(((total - prev) / prev) * 100)) + '%';
};
/** The hero's change chip against a previous total, or nothing when there is no previous total. */
const changeChip = (total: number, prev: number, label: string) =>
  prev > 0
    ? `<div class="delta ${total <= prev ? 'down' : 'up'}">${changeText(total, prev)} vs ${esc(label)} (${esc(money(prev))})</div>`
    : '';

/** This month against the five before it: bars to tap, the numbers side by side, and what moved. */
function compareCard(k: string, tx: Tx[], total: number) {
  const series = monthSeries(k, 6),
    prevK = addMonths(k, -1),
    prev = txIn(prevK),
    pt = sum(prev),
    past = series.filter(m => m.k !== k && m.v > 0),
    avg = past.length ? past.reduce((t, m) => t + m.v, 0) / past.length : 0,
    hi = series.slice().sort(byValue)[0],
    moved = movers(tx, prev, 3);
  if (!total && !past.length) return '';
  return `<section class="card"><div class="card-head"><h2>Month by month</h2><button type="button" class="btn-link btn-sm" style="min-height:0;padding:0" data-detail="trend|${k}">Trends ›</button></div>
    <div class="chart">${barsSVG(series.map(m => ({ label: m.label, v: m.v, on: m.k === k, period: m.k, future: m.future })))}</div>
    ${tiles([
      ['Last month', pt ? compact(pt) : '—'],
      ['Change', changeText(total, pt)],
      ['Avg of 5 before', avg ? compact(avg) : '—'],
      ['Highest', hi && hi.v ? hi.label + ' ' + compact(hi.v) : '—'],
    ])}
    ${moved.length ? `<h3>What moved vs ${esc(MON[+prevK.slice(5, 7) - 1])}</h3><div class="list">${moverRows(moved, k, 'in ' + MON[+prevK.slice(5, 7) - 1])}</div>` : ''}
    <div class="hint" style="margin-top:8px">Tap a bar to open that month.</div></section>`;
}
function rMonth() {
  const tx = txIn(ui.period).sort(sortTx),
    total = sum(tx),
    isCur = ui.period === thisMonth(),
    dim = daysInMonth(ui.period);
  const elapsed = isCur ? +today().slice(8, 10) : dim,
    avg = elapsed ? total / elapsed : 0;
  const prevK = addMonths(ui.period, -1),
    prevTotal = sum(txIn(prevK));
  const hiDay = groupBy(tx, t => t.date).sort(byValue)[0];
  const cats = groupBy(tx, t => t.category).sort(byValue);
  const top = tx
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const inc = sum(incIn(ui.period)),
    ll = inc ? leftLine(ui.period, inc) : null;
  const lastDay = isCur ? +today().slice(8, 10) : dim,
    byDay: Record<string, number> = {};
  tx.forEach(t => {
    byDay[t.date] = (byDay[t.date] || 0) + t.amount;
  });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = lastDay - 6 + i;
    return d < 1 ? null : { key: ui.period + '-' + pad(d), d };
  }).filter((x): x is { key: string; d: number } => !!x);
  const wmax = Math.max.apply(null, week.map(x => byDay[x.key] || 0).concat([1]));
  const spark = `<div class="spark">${week.map((x, i) => `<span class="sp ${isCur && x.d === lastDay ? 'today' : ''}" style="--h:${Math.round(((byDay[x.key] || 0) / wmax) * 100)}%;--d:${i * 40}ms" title="${esc(shortDate(x.key))}: ${esc(money(byDay[x.key] || 0))}"><i></i><b>${DAY3[parseDate(x.key).getDay()][0]}</b></span>`).join('')}</div>`;
  const deltaHtml =
    (ll
      ? `<div class="delta ${ll.left >= 0 ? 'down' : 'up'}">${esc(money(Math.abs(ll.left)))} ${ll.left >= 0 ? 'left of' : 'over the'} ${esc(money(inc))} in</div>`
      : '') + changeChip(total, prevTotal, MON[+prevK.slice(5, 7) - 1]);
  return `<div class="view">
    ${header(isCur)}
    <div class="hero tap" data-detail="trend|${ui.period}" role="button" tabindex="0" aria-label="Open trends"><div class="lbl">${isCur ? 'Spent so far this month' : 'Spent in ' + esc(monthLabel(ui.period))}</div><div class="big" data-count="${total}">${esc(money(total))}</div>
      <div class="hero-grid">
        <div class="tile"><span class="t-l">Expenses</span><span class="t-v">${tx.length}</span></div>
        <div class="tile"><span class="t-l">Per day</span><span class="t-v">${esc(compact(avg))}</span></div>
        <div class="tile"><span class="t-l">${isCur ? 'Projected' : 'Highest day'}</span><span class="t-v">${isCur ? esc(compact(avg * dim)) : hiDay ? esc(compact(hiDay.v)) : '—'}</span></div>
      </div>${tx.length ? spark + catStrip(cats, total) : ''}${deltaHtml}</div>
    ${compareCard(ui.period, tx, total)}
    ${incomeSection(ui.period)}
    ${fuelSection(ui.period)}
    ${budgetSection(ui.period, isCur ? 'Budgets this month' : 'Budgets')}
    ${cashSection(ui.period)}
    ${
      tx.length
        ? `
    <section class="card"><div class="card-head"><h2>Day by day</h2><button type="button" class="btn-link btn-sm" style="min-height:0;padding:0" data-detail="trend|${ui.period}">Trends ›</button></div><div class="chart">${dailyChartSVG(ui.period, tx)}</div></section>
    <section class="card"><div class="card-head"><h2>By category</h2><span class="sub">Tap for details</span></div>
      <div class="donut-wrap">${donutSVG(
        cats.map(g => ({ name: g.key, value: g.v, color: catColor(g.key), detail: 'cat|' + ui.period + '|' + g.key })),
        total,
        compact(total),
        cats.length + ' categor' + (cats.length === 1 ? 'y' : 'ies'),
      )}
      <div class="list">${catRows(tx, total, c => 'cat|' + ui.period + '|' + c)}</div></div></section>
    <section class="card"><div class="card-head"><h2>Paid with</h2><span class="sub">Cash · bank · UPI · cards</span></div>${sourceSection(tx, total, id => 'acct|' + ui.period + '|' + id, isCur)}</section>
    <section class="card"><div class="card-head"><h2>Biggest spends</h2><span class="sub">Top ${top.length}</span></div><div class="list">${top.map(t => txRow(t)).join('')}</div></section>
    <section class="card"><div class="card-head"><h2>All expenses</h2><button type="button" class="btn-link btn-sm" style="min-height:0;padding:0" data-pdf="${ui.period}">PDF report ›</button></div>${dayGroups(tx)}</section>`
        : `<div class="card empty">${emptyArt()}<strong>Nothing spent in ${esc(monthLabel(ui.period))}${isCur ? ' yet' : ''}</strong><span>Every expense you add shows up here by day, category, cash, bank and card.</span>${isCur ? '<button type="button" class="btn-primary" style="max-width:260px" data-go="add">Add your first expense</button>' : ''}</div>`
    }
  </div>`;
}

/** One row per month that had expenses, newest first: count, change against the month before, share of the year. Tap opens the month. */
function monthRows(months: MonthPoint[], total: number, elapsed: number) {
  return months
    .slice(0, elapsed)
    .reverse()
    .map((m, i, arr) => {
      const prev = arr[i + 1];
      const sub =
        m.n +
        ' expense' +
        (m.n === 1 ? '' : 's') +
        (prev && prev.v ? ' · ' + changeText(m.v, prev.v) + ' vs ' + prev.label : '');
      return m.v
        ? `<button type="button" class="prow" data-period="${m.k}" data-scope="month"><span class="prow-top"><span class="dot" style="background:var(--accent)"></span><span class="name">${esc(MONTHS[+m.k.slice(5, 7) - 1])}<span class="small">${esc(sub)}</span></span><span class="pct">${pct(m.v, total)}%</span><span class="amt">${esc(money(m.v))}</span><span class="chev">›</span></span><span class="bar"><i style="width:${Math.max(1, pct(m.v, total))}%"></i></span></button>`
        : '';
    })
    .join('');
}
function rYear() {
  const y = ui.period.slice(0, 4),
    tx = txInYear(+y).sort(sortTx),
    total = sum(tx),
    isCur = y === thisYear(),
    months = yearMonths(+y),
    elapsed = isCur ? +today().slice(5, 7) : 12,
    perMonth = elapsed ? total / elapsed : 0,
    hi = months.slice().sort(byValue)[0],
    prevTotal = sum(txInYear(+y - 1)),
    inc = sum(incInYear(+y)),
    ll = inc ? leftLine(y, inc) : null,
    cats = groupBy(tx, t => t.category).sort(byValue),
    top = tx
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    active = months.filter(m => m.v > 0).length;
  const deltaHtml =
    (ll
      ? `<div class="delta ${ll.left >= 0 ? 'down' : 'up'}">${esc(money(Math.abs(ll.left)))} ${ll.left >= 0 ? 'left of' : 'over the'} ${esc(money(inc))} in</div>`
      : '') + changeChip(total, prevTotal, String(+y - 1));
  return `<div class="view">
    ${header(isCur)}
    <div class="hero"><div class="lbl">${isCur ? 'Spent so far in ' + esc(y) : 'Spent in ' + esc(y)}</div><div class="big" data-count="${total}">${esc(money(total))}</div>
      <div class="hero-grid">
        <div class="tile"><span class="t-l">Expenses</span><span class="t-v">${tx.length}</span></div>
        <div class="tile"><span class="t-l">Per month</span><span class="t-v">${esc(compact(perMonth))}</span></div>
        <div class="tile"><span class="t-l">Highest month</span><span class="t-v">${hi && hi.v ? esc(hi.label + ' ' + compact(hi.v)) : '—'}</span></div>
      </div>${catStrip(cats, total)}${deltaHtml}</div>
    ${
      tx.length
        ? `
    <section class="card"><div class="card-head"><h2>Month by month</h2><span class="sub">${active} of ${elapsed} month${elapsed === 1 ? '' : 's'} with expenses</span></div>
      <div class="chart">${barsSVG(months.map(m => ({ label: m.label, v: m.v, on: isCur && m.k === thisMonth(), period: m.k, future: m.future })))}</div>
      <div class="list" style="margin-top:6px">${monthRows(months, total, elapsed)}</div></section>
    ${
      inc
        ? `<section class="card"><div class="card-head"><h2>Money in and out</h2><span class="sub">${esc(money(inc))} received</span></div>
      ${tiles([
        ['In', compact(inc)],
        ['Out', compact(total)],
        [inc >= total ? 'Kept' : 'Overspent', compact(Math.abs(inc - total))],
        ['Share kept', Math.max(0, pct(inc - total, inc)) + '%'],
      ])}</section>`
        : ''
    }
    <section class="card"><div class="card-head"><h2>By category</h2><span class="sub">Tap for details</span></div>
      <div class="donut-wrap">${donutSVG(
        cats.map(g => ({ name: g.key, value: g.v, color: catColor(g.key), detail: 'cat|' + y + '|' + g.key })),
        total,
        compact(total),
        cats.length + ' categor' + (cats.length === 1 ? 'y' : 'ies'),
      )}
      <div class="list">${catRows(tx, total, c => 'cat|' + y + '|' + c)}</div></div></section>
    <section class="card"><div class="card-head"><h2>Paid with</h2><span class="sub">Cash · bank · UPI · cards</span></div>${sourceSection(tx, total, id => 'acct|' + y + '|' + id)}</section>
    <section class="card"><div class="card-head"><h2>Biggest spends</h2><span class="sub">Top ${top.length} of the year</span></div><div class="list">${top.map(t => txRow(t)).join('')}</div></section>`
        : `<div class="card empty">${emptyArt()}<strong>Nothing spent in ${esc(y)}${isCur ? ' yet' : ''}</strong><span>Every month of the year adds up here: by month, category, cash, bank and card.</span>${isCur ? '<button type="button" class="btn-primary" style="max-width:260px" data-go="add">Add your first expense</button>' : ''}</div>`
    }
  </div>`;
}
export function rDash() {
  return ui.scope === 'year' ? rYear() : rMonth();
}
