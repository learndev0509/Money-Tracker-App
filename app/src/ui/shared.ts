import { Income, Method } from '../data/model';
import { Tx } from '../data/model';
import { CAT_ICON, INC_ICON, glyph } from '../lib/icons';
import {
  SRC_LABEL,
  acctColor,
  acctName,
  billSoFar,
  byValue,
  catColor,
  fuelIn,
  groupBy,
  incIn,
  methodOf,
  payLabel,
  sortTx,
  sources,
  srcColor,
  sum,
  txIn,
  txInPeriod,
  vehName,
} from '../queries/ledger';
import type { Mover } from '../queries/compare';
import { MON, esc, isAndroid, isIOS, needsInstall } from '../lib/constants';
import { canPromptInstall } from './install';
import {
  compact,
  daysInMonth,
  dm,
  fmtTime,
  longDate,
  money,
  parseDate,
  pct,
  shortDate,
  thisMonth,
  today,
} from '../lib/dates';
import { FUEL, METHODS } from '../data/model';
import { cashBalance, hasCashActivity } from '../queries/cash';
import { budgetColor, budgetRows, budgetText, budgetTone } from '../queries/budgets';
import { S } from '../data/storage';
import { canShareFiles, ui } from './state';
export const catIcon = (c: string) => glyph(CAT_ICON[String(c).toLowerCase()] || CAT_ICON.other, catColor(c));
export const incIcon = () => glyph(INC_ICON, 'var(--good)');
export function txRow(t: Tx, fresh = false) {
  return `<button type="button" class="txrow${fresh ? ' new' : ''}" data-detail="tx|${t.id}">
    ${catIcon(t.category)}
    <span class="name">${esc(t.category)}${t.note ? '<span class="note"> · ' + esc(t.note) + '</span>' : ''}${t.vehicleId && vehName(t.vehicleId) ? '<span class="note"> · ' + esc(vehName(t.vehicleId)) + '</span>' : ''}${t.recurringId ? '<span class="tag">auto</span>' : ''}<span class="small">${esc(shortDate(t.date))}${t.time ? ' · ' + esc(fmtTime(t.time)) : ''} · ${esc(payLabel(t))}</span></span>
    <span class="amt">${esc(money(t.amount))}</span><span class="chev">›</span></button>`;
}
export function incRow(t: Income) {
  return `<button type="button" class="txrow" data-detail="inc|${t.id}">
    ${incIcon()}
    <span class="name">${esc(t.category)}${t.note ? '<span class="note"> · ' + esc(t.note) + '</span>' : ''}${t.recurringId ? '<span class="tag">auto</span>' : ''}<span class="small">${esc(shortDate(t.date))}${t.time ? ' · ' + esc(fmtTime(t.time)) : ''} · ${esc(payLabel(t))}</span></span>
    <span class="amt" style="color:var(--good)">+${esc(money(t.amount))}</span><span class="chev">›</span></button>`;
}
/** A proportion row: name, share bar, amount, tap for detail. */
export interface PropRow {
  detail: string;
  color: string;
  name: string;
  sub?: string;
  tone?: string;
  pct?: number | null;
  amount: number;
  fill?: number;
  barColor?: string;
}
export function propRow(o: PropRow) {
  return `<button type="button" class="prow" data-detail="${esc(o.detail)}">
    <span class="prow-top"><span class="dot" style="background:${o.color}"></span><span class="name">${esc(o.name)}${o.sub ? '<span class="small' + (o.tone ? ' ' + o.tone : '') + '">' + esc(o.sub) + '</span>' : ''}</span>${o.pct != null ? '<span class="pct">' + o.pct + '%</span>' : ''}<span class="amt">${esc(money(o.amount))}</span><span class="chev">›</span></span>
    <span class="bar"><i style="width:${Math.min(100, Math.max(1, o.fill != null ? o.fill : o.pct || 0))}%;background:${o.barColor || o.color}"></i></span></button>`;
}
export function tiles(arr: [string, string | number][]) {
  return `<div class="stats">${arr.map(x => `<div class="stat"><span class="s-l">${esc(x[0])}</span><span class="s-v">${esc(x[1])}</span></div>`).join('')}</div>`;
}
export function splitBar(s: Record<Method, number>) {
  const t = s.cash + s.bank + s.upi + s.card;
  if (!t) return '';
  const segs = METHODS.filter(m => s[m] > 0).map(m => [m, SRC_LABEL[m]] as [Method, string]);
  return `<div class="split">${segs.map(x => `<i style="width:${Math.max(1, (s[x[0]] / t) * 100)}%;background:${srcColor(x[0])}"></i>`).join('')}</div>
  <div class="split-legend">${segs.map(x => `<span><span class="dot" style="background:${srcColor(x[0])}"></span>${x[1]} ${esc(money(s[x[0]]))} · ${pct(s[x[0]], t)}%</span>`).join('')}</div>`;
}
export function catRows(items: Tx[], total: number, detailFn: (c: string) => string) {
  return groupBy(items, t => t.category)
    .sort(byValue)
    .map(g =>
      propRow({
        detail: detailFn(g.key),
        color: catColor(g.key),
        name: g.key,
        sub: g.n + ' expense' + (g.n === 1 ? '' : 's'),
        amount: g.v,
        pct: pct(g.v, total),
      }),
    )
    .join('');
}
export function acctRows(
  items: Tx[],
  total: number,
  type: string,
  detailFn: (id: string) => string,
  withBill?: boolean,
) {
  const inType = (t: Tx) => {
    const m = methodOf(t);
    return type === 'bank' ? m === 'bank' || m === 'upi' : m === type;
  };
  const rows = groupBy(items.filter(inType), t => t.accountId).sort(byValue);
  if (!rows.length)
    return type === 'cash' || type === 'upi'
      ? ''
      : `<div class="hint" style="padding:6px 0">Nothing from ${type === 'bank' ? 'bank accounts' : 'credit cards'}.</div>`;
  return rows
    .map(g => {
      let sub = g.n + ' expense' + (g.n === 1 ? '' : 's');
      if (withBill && type === 'card') {
        const b = billSoFar(g.key);
        if (b) sub += ' · this bill so far ' + money(b.sum) + ' (closes ' + dm(b.to) + ')';
      }
      if (withBill && type === 'cash' && hasCashActivity()) sub = money(cashBalance()) + ' in hand · ' + sub;
      return propRow({
        detail: detailFn(g.key) + (type === 'upi' ? '|upi' : ''),
        color: type === 'upi' ? srcColor('upi') : acctColor(g.key),
        name: acctName(g.key),
        sub,
        amount: g.v,
        pct: pct(g.v, total),
      });
    })
    .join('');
}
export function sourceSection(items: Tx[], total: number, detailFn: (id: string) => string, withBill?: boolean) {
  const s = sources(items);
  return `${splitBar(s)}${s.cash ? `<div class="list" style="margin-top:10px">${acctRows(items, total, 'cash', detailFn, withBill)}</div>` : ''}
    <h3>Bank accounts</h3><div class="list">${acctRows(items, total, 'bank', detailFn)}</div>
    ${s.upi ? `<h3>UPI</h3><div class="list">${acctRows(items, total, 'upi', detailFn)}</div>` : ''}
    <h3>Credit cards</h3><div class="list">${acctRows(items, total, 'card', detailFn, withBill)}</div>`;
}
export function dayGroups(tx: Tx[], oldest?: boolean) {
  const dir = oldest ? -1 : 1,
    rows = oldest ? (a: Tx, b: Tx) => sortTx(b, a) : sortTx;
  return groupBy(tx, t => t.date)
    .sort((a, b) => dir * b.key.localeCompare(a.key))
    .map(
      g =>
        `<div class="daygroup"><button type="button" class="dayhead" data-detail="day|${g.key}"><span>${esc(longDate(g.key))}</span><span class="amt">${esc(money(g.v))}</span></button><div class="list">${g.items
          .sort(rows)
          .map(t => txRow(t))
          .join('')}</div></div>`,
    )
    .join('');
}
export function budgetSection(k: string, heading?: string) {
  const rows = budgetRows(k);
  if (!rows.length) return '';
  const spent = rows.reduce((t, r) => t + r.spent, 0),
    total = rows.reduce((t, r) => t + r.b, 0),
    over = rows.filter(r => r.left < 0).length;
  return `<section class="card"><div class="card-head"><h2>${heading || 'Budgets'}</h2><span class="sub">${esc(money(spent))} of ${esc(money(total))}${over ? ' · ' + over + ' over' : ''}</span></div>
    <div class="list">${rows.map(r => propRow({ detail: 'cat|' + k + '|' + r.c, color: catColor(r.c), name: r.c, sub: budgetText(r) + ' of ' + money(r.b), tone: budgetTone(r.ratio), amount: r.spent, fill: r.ratio * 100, barColor: budgetColor(r.ratio) })).join('')}</div></section>`;
}
export function cashSection(k: string) {
  if (!hasCashActivity()) return '';
  const bal = cashBalance();
  const wd = S.cashIn.filter(c => c.kind === 'withdrawal' && c.date.slice(0, 7) === k);
  const spent = sum(txIn(k).filter(t => methodOf(t) === 'cash'));
  return `<section class="cashcard"><div class="card-head"><h2>Cash in hand</h2><span class="sub">${esc(money(sum(wd)))} withdrawn · ${esc(money(spent))} spent${k === thisMonth() ? ' this month' : ' in ' + esc(MON[+k.slice(5, 7) - 1])}</span></div>
    <div class="cash-big ${bal < 0 ? 'neg' : ''}">${esc(money(bal))}</div>
    ${bal < 0 ? '<div class="hint">Below zero: some cash spends came before a withdrawal was logged. Set the real amount to correct it.</div>' : ''}
    <div class="cash-row"><button type="button" data-detail="cashform|withdrawal">Log a withdrawal</button><button type="button" data-detail="cashform|adjust">Set cash in hand</button><button type="button" class="btn-ghost" data-detail="cash|list">History</button></div></section>`;
}
/** The steps for this phone: Safari's Share menu on iPhone, Chrome's menu (or its own Install prompt) on Android. */
export function installStepsHTML() {
  const steps = isIOS()
    ? [
        'Open this page in Safari.',
        'Tap the Share button (the square with an arrow).',
        'Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.',
      ]
    : [
        'Open this page in Chrome.',
        'Tap the ⋮ menu at the top right.',
        'Tap <b>Add to Home screen</b> (or <b>Install app</b>), then <b>Install</b>.',
      ];
  const hint = isIOS()
    ? 'The Home Screen app and this Safari tab keep separate data. If you have already logged expenses here, go to Settings → Copy backup first, then Restore inside the installed app.'
    : 'The installed app opens full screen with its own icon and keeps everything you have logged in this browser.';
  return `${canPromptInstall() ? '<button type="button" style="width:100%;margin-bottom:10px" data-install-now>Install app</button>' : ''}<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
  <div class="hint" style="margin-top:10px">${hint}</div>`;
}
/** One line for the Settings footer: how to install on this phone. */
export const installHint = () =>
  isIOS()
    ? 'open in Safari, tap Share, then Add to Home Screen.'
    : isAndroid()
      ? 'open in Chrome, tap the ⋮ menu, then Add to Home screen.'
      : 'add it to your phone’s Home Screen from the browser menu.';
export function installBanner() {
  if (!needsInstall() || ui.installHintHidden) return '';
  const why = isIOS()
    ? 'In a Safari tab, iOS can clear this data after 7 days unused. Tap for the steps.'
    : 'Opens full screen with its own icon, like an app. Tap for the steps.';
  return `<button type="button" class="banner" data-detail="install|how"><span class="grow"><b>Add to your Home Screen</b><span class="small">${why}</span></span><span class="chev">›</span></button>`;
}
/** The categories that moved most against the previous period, each opening that category in `k`. */
export function moverRows(ms: Mover[], k: string, prevLabel: string) {
  return ms
    .map(
      m =>
        `<button type="button" class="prow" data-detail="cat|${k}|${esc(m.c)}"><span class="prow-top">${catIcon(m.c)}<span class="name">${esc(m.c)}<span class="small">${esc(money(m.pv))} ${esc(prevLabel)}</span></span><span class="amt" style="color:${m.d > 0 ? 'var(--danger)' : m.d < 0 ? 'var(--good)' : 'inherit'}">${m.d > 0 ? '▲ ' : m.d < 0 ? '▼ ' : ''}${esc(money(Math.abs(m.d)))}</span><span class="chev">›</span></span></button>`,
    )
    .join('');
}
export function leftLine(k: string, inc: number) {
  const left = inc - sum(txInPeriod(k));
  return {
    left,
    html: `<span>${left >= 0 ? 'Left to spend' : 'Spent beyond what came in'}</span><b style="color:${left >= 0 ? 'var(--good)' : 'var(--danger)'}">${esc(money(Math.abs(left)))}</b>`,
  };
}
export function incomeSection(k: string) {
  const inc = incIn(k).sort(sortTx);
  if (!inc.length) return '';
  return `<section class="card"><div class="card-head"><h2>Money in</h2><span class="sub">${esc(money(sum(inc)))} received</span></div>
    <div class="kv" style="margin-bottom:8px">${leftLine(k, sum(inc)).html}</div><div class="list">${inc.map(incRow).join('')}</div></section>`;
}
export function fuelSection(k: string) {
  const fills = fuelIn(k);
  if (!fills.length) return '';
  const total = sum(fills),
    dim = daysInMonth(k),
    isCur = k === thisMonth(),
    td = +today().slice(8, 10),
    elapsed = isCur ? td : dim;
  const days = new Set(fills.map(t => +t.date.slice(8, 10)));
  const map = `<div class="fdays" aria-label="Days with a fill">${Array.from({ length: dim }, (_, i) => {
    const d = i + 1;
    return `<i class="fd${days.has(d) ? ' on' : ''}${isCur && d === td ? ' today' : ''}${isCur && d > td ? ' future' : ''}" title="${d}"></i>`;
  }).join('')}</div>`;
  const vehRows = groupBy(fills, t => t.vehicleId)
    .sort(byValue)
    .map(g =>
      propRow({
        detail: 'veh|' + k + '|' + g.key,
        color: catColor(FUEL),
        name: vehName(g.key) || 'No vehicle',
        sub: g.n + ' fill' + (g.n === 1 ? '' : 's') + ' · ' + money(g.v / g.n) + ' each',
        amount: g.v,
        pct: pct(g.v, total),
      }),
    )
    .join('');
  const cardLines = isCur
    ? groupBy(
        fills.filter(t => methodOf(t) === 'card'),
        t => t.accountId,
      )
        .map(g => {
          const b = billSoFar(g.key),
            f = billSoFar(g.key, FUEL);
          return b && f
            ? `<div class="kv"><span>${esc(acctName(g.key))} · fuel is ${esc(money(f.sum))} of this bill</span><b>${esc(money(b.sum))}</b></div>`
            : '';
        })
        .join('')
    : '';
  return `<section class="card"><div class="card-head"><h2>Fuel</h2><span class="sub">Filled on ${days.size} of ${elapsed} days</span></div>
    ${tiles([
      [isCur ? 'This month' : 'Total', money(total)],
      ['Fills', fills.length],
      ['Per fill', compact(total / fills.length)],
      ['Per day', compact(total / elapsed)],
    ])}
    <div style="margin-top:12px">${map}</div>
    <div class="list" style="margin-top:8px">${vehRows}</div>
    ${cardLines ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">${cardLines}</div>` : ''}</section>`;
}
export function emptyArt() {
  return `<svg class="art" viewBox="0 0 150 120" aria-hidden="true"><defs><linearGradient id="ea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--hero-a)"/><stop offset="1" stop-color="var(--hero-c)"/></linearGradient></defs>
    <path d="M38 14h58v86l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5z" fill="var(--surface-2)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M50 34h34M50 48h26M50 62h30" stroke="var(--line)" stroke-width="3" stroke-linecap="round"/>
    <text x="67" y="90" text-anchor="middle" font-family="var(--mono)" font-size="18" font-weight="600" fill="var(--ink)">₹0</text>
    <g class="coin"><circle cx="118" cy="40" r="17" fill="var(--gold)"/><circle cx="118" cy="40" r="12" fill="none" stroke="var(--gold-2)" stroke-width="2"/><text x="118" y="46" text-anchor="middle" font-family="var(--mono)" font-size="16" font-weight="600" fill="var(--gold-ink)">₹</text></g>
    <g class="coin coin2"><circle cx="26" cy="84" r="11" fill="url(#ea)" opacity=".9"/><circle cx="26" cy="84" r="7" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/></g></svg>`;
}
export function budgetBanner() {
  const over = budgetRows(thisMonth()).filter(r => r.left < 0);
  if (!over.length) return '';
  return `<button type="button" class="banner" style="background:var(--danger-soft)" data-detail="cat|${thisMonth()}|${esc(over[0].c)}"><span class="grow"><b>${over.length === 1 ? esc(over[0].c) + ' is over budget' : over.length + ' budgets are over'}</b><span class="small">${esc(over.map(r => r.c + ' by ' + money(-r.left)).join(' · '))}</span></span><span class="chev">›</span></button>`;
}
export function backupBanner() {
  if (!S.tx.length) return '';
  const last = +(S.meta.lastBackup || 0);
  const oldest = S.tx.reduce((m, t) => (t.date < m ? t.date : m), today());
  const ageDays = Math.floor((Date.now() - parseDate(oldest).getTime()) / 864e5);
  const sinceDays = last ? Math.floor((Date.now() - last) / 864e5) : null;
  const due = last ? sinceDays !== null && sinceDays >= 30 : ageDays >= 7;
  if (!due) return '';
  return `<button type="button" class="banner" data-go="settings"><span class="grow"><b>${last ? 'Last backup ' + sinceDays + ' days ago' : 'No backup yet'}</b><span class="small">${S.tx.length} expense${S.tx.length === 1 ? '' : 's'} live only on this phone. Tap to ${canShareFiles() ? 'save a backup to Files' : 'copy a backup'}.</span></span><span class="chev">›</span></button>`;
}
