import { ui } from '../ui/state';
import {
  addMonths,
  compact,
  daysInMonth,
  money,
  monthLabel,
  parseDate,
  shortDate,
  thisMonth,
  today,
} from '../lib/dates';
import { DAY3, DAYS, MON, MONTHS, esc, greetingWord, pad } from '../lib/constants';
import { byValue, catColor, groupBy, incIn, initials, sortTx, sum, txIn } from '../queries/ledger';
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
  sourceSection,
  txRow,
} from '../ui/shared';
import { S } from '../data/storage';
import { ADD_BTN } from '../ui/render';
import { dailyChartSVG, donutSVG } from '../ui/charts';
/* ---------- DASHBOARD ---------- */
export function periodNav() {
  const isNow = ui.period === thisMonth();
  return `<div class="topbar">
    <button type="button" class="btn-icon" data-period="${addMonths(ui.period, -1)}" aria-label="Previous month">‹</button>
    <div style="text-align:center;min-width:0"><h1>${esc(monthLabel(ui.period))}</h1>${isNow ? '<span class="sub">Resets on the 1st · History keeps every month</span>' : '<button type="button" class="btn-ghost btn-sm" data-period="' + thisMonth() + '">Back to this month</button>'}</div>
    <button type="button" class="btn-icon" data-period="${addMonths(ui.period, 1)}" aria-label="Next month" ${ui.period >= thisMonth() ? 'disabled style="opacity:.3"' : ''}>›</button></div>`;
}
export function rDash() {
  const tx = txIn(ui.period).sort(sortTx),
    total = sum(tx),
    isCur = ui.period === thisMonth(),
    dim = daysInMonth(ui.period);
  const elapsed = isCur ? +today().slice(8, 10) : dim,
    avg = elapsed ? total / elapsed : 0;
  const prevK = addMonths(ui.period, -1),
    prevTotal = sum(txIn(prevK));
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;
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
  const strip = cats.length
    ? `<div class="strip">${cats.map(g => `<i style="width:${(g.v / total) * 100}%;background:${catColor(g.key)}" title="${esc(g.key)}: ${esc(money(g.v))}"></i>`).join('')}</div>`
    : '';
  let deltaHtml = ll
    ? `<div class="delta ${ll.left >= 0 ? 'down' : 'up'}">${esc(money(Math.abs(ll.left)))} ${ll.left >= 0 ? 'left of' : 'over the'} ${esc(money(inc))} in</div>`
    : '';
  if (delta != null)
    deltaHtml += `<div class="delta ${delta <= 0 ? 'down' : 'up'}">${delta <= 0 ? '▼' : '▲'} ${Math.abs(Math.round(delta * 100))}% vs ${esc(MON[+prevK.slice(5, 7) - 1])} (${esc(money(prevTotal))})</div>`;
  const n = new Date();
  return `<div class="view">
    <div class="greet"><div class="grow"><div class="g-hi">${esc(greetingWord())}${S.profile.firstName ? ', ' + esc(S.profile.firstName) : ''}!</div><div class="g-sub">${esc(DAYS[n.getDay()] + ', ' + n.getDate() + ' ' + MONTHS[n.getMonth()] + ' ' + n.getFullYear())}</div></div>${ADD_BTN}<button type="button" class="avatar" data-go="settings" aria-label="Profile and settings">${esc(initials())}</button></div>
    ${periodNav()}
    ${installBanner()}
    ${isCur ? budgetBanner() + backupBanner() : ''}
    <div class="hero tap" data-detail="trend|${ui.period}" role="button" tabindex="0" aria-label="Open trends"><div class="lbl">${isCur ? 'Spent so far this month' : 'Spent in ' + esc(monthLabel(ui.period))}</div><div class="big" data-count="${total}">${esc(money(total))}</div>
      <div class="hero-grid">
        <div class="tile"><span class="t-l">Expenses</span><span class="t-v">${tx.length}</span></div>
        <div class="tile"><span class="t-l">Per day</span><span class="t-v">${esc(compact(avg))}</span></div>
        <div class="tile"><span class="t-l">${isCur ? 'Projected' : 'Highest day'}</span><span class="t-v">${isCur ? esc(compact(avg * dim)) : hiDay ? esc(compact(hiDay.v)) : '—'}</span></div>
      </div>${tx.length ? spark + strip : ''}${deltaHtml}</div>
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
