import { HistSort } from '../ui/state';
import { Tx } from '../data/model';
import { S } from '../data/storage';
import { longDate, money, monthLabel, today } from '../lib/dates';
import { HSORT, hf, histSorter, ui } from '../ui/state';
import { METHOD_LABEL, groupBy, methodOf, payLabel, sum, txIn } from '../queries/ledger';
import { MONTHS, el, esc, pad } from '../lib/constants';
import { METHODS } from '../data/model';
import { ADD_BTN } from '../ui/render';
import { SEARCH_SVG } from '../lib/icons';
import { dayGroups, txRow } from '../ui/shared';
/* ---------- HISTORY ---------- */
export const histYears = () =>
  [
    ...new Set(
      S.tx
        .map(t => +t.date.slice(0, 4))
        .filter(y => y <= +today().slice(0, 4))
        .concat([+today().slice(0, 4)]),
    ),
  ].sort((a, b) => b - a);
export function histFilter(list: Tx[]) {
  return list.filter(t => (!hf.method || methodOf(t) === hf.method) && (!hf.cat || t.category === hf.cat));
}
export function filterChipsHTML() {
  const ys = histYears(),
    curY = +today().slice(0, 4),
    curM = +today().slice(5, 7);
  if (!ys.includes(ui.histYear)) ui.histYear = ys[0];
  if (ui.histYear === curY && ui.histMonth > curM) ui.histMonth = curM;
  const cats = [...new Set(S.tx.map(t => t.category).concat(S.categories))].sort();
  const opt = (v: string | number, label: string | number, sel: boolean, extra?: string) =>
    `<option value="${esc(v)}" ${sel ? 'selected' : ''} ${extra || ''}>${esc(label)}</option>`;
  const sel = (id: string, label: string, on: boolean, opts: string) =>
    `<label>${label}<select id="${id}" class="${on ? 'on' : ''}" aria-label="${label}">${opts}</select></label>`;
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1,
      n = txIn(ui.histYear + '-' + pad(m)).length;
    return opt(
      m,
      MONTHS[m - 1] + (n ? ' · ' + n : ''),
      m === ui.histMonth,
      ui.histYear === curY && m > curM ? 'disabled' : '',
    );
  }).join('');
  return `<div class="hsel">
    ${sel('h-year', 'Year', false, ys.map(y => opt(y, y, y === ui.histYear)).join(''))}
    ${sel('h-month', 'Month', false, months)}
    ${sel('h-cat', 'Category', !!hf.cat, opt('', 'All categories', !hf.cat) + cats.map(c => opt(c, c, hf.cat === c)).join(''))}
    ${sel('h-method', 'Paid with', !!hf.method, opt('', 'All payments', !hf.method) + METHODS.map(m => opt(m, m === 'cash' ? 'Cash' : METHOD_LABEL[m].replace('Online · ', ''), hf.method === m)).join(''))}
    ${sel('h-sort', 'Sort', hf.sort !== 'new', (Object.keys(HSORT) as HistSort[]).map(k => opt(k, HSORT[k], hf.sort === k)).join(''))}
    <label>&nbsp;<button type="button" class="btn-sm" style="min-height:40px" data-hf-clear ${hf.cat || hf.method || hf.sort !== 'new' || ui.histQuery.trim() ? '' : 'disabled style="opacity:.4;min-height:40px"'}>Clear filters</button></label>
  </div>`;
}
export function rHist() {
  return `<div class="view"><div class="topbar"><div><h1>History</h1><span class="sub">${S.tx.length} expense${S.tx.length === 1 ? '' : 's'} all time</span></div>${ADD_BTN}</div>
    <div class="search">${SEARCH_SVG}<input id="hist-search" type="search" placeholder="Search notes, categories, banks, cards, amounts" value="${esc(ui.histQuery)}" autocomplete="off"></div>
    <div id="hist-filters">${filterChipsHTML()}</div>
    <div id="hist-body">${histBody()}</div></div>`;
}
export function histBody() {
  return ui.histQuery.trim() ? searchHTML() : monthListHTML();
}
export function refreshHist() {
  const f = el('#hist-filters'),
    b = el('#hist-body');
  if (f) f.innerHTML = filterChipsHTML();
  if (b) b.innerHTML = histBody();
}
export function monthListHTML() {
  const k = ui.histYear + '-' + pad(ui.histMonth),
    all = txIn(k),
    items = histFilter(all).sort(histSorter()),
    filtered = !!(hf.method || hf.cat);
  const byAmount = hf.sort === 'high' || hf.sort === 'low';
  return `<div class="view">
    <div class="kv" style="padding:0 2px"><span>${esc(monthLabel(k))} · ${items.length} expense${items.length === 1 ? '' : 's'}${filtered ? ' · filtered' : ''} · ${esc(HSORT[hf.sort].toLowerCase())}</span><b>${esc(money(sum(items)))}</b></div>
    ${items.length ? `<section class="card">${byAmount ? `<div class="list">${items.map(txRow).join('')}</div>` : dayGroups(items, hf.sort === 'old')}</section>` : `<div class="card empty"><strong>${all.length ? 'Nothing matches the filters in ' + esc(monthLabel(k)) : 'Nothing spent in ' + esc(monthLabel(k))}</strong><span>${all.length ? 'Change Category or Paid with above to see every expense that month.' : 'Pick another month or year above.'}</span>${all.length ? '<button type="button" class="btn-sm" data-hf-clear>Clear filters</button>' : ''}</div>`}
  </div>`;
}
export function searchHTML() {
  const q = ui.histQuery.trim().toLowerCase();
  const hits = histFilter(S.tx)
    .filter(
      t =>
        t.category.toLowerCase().includes(q) ||
        t.note.toLowerCase().includes(q) ||
        payLabel(t).toLowerCase().includes(q) ||
        METHOD_LABEL[methodOf(t)].toLowerCase().includes(q) ||
        String(t.amount).includes(q.replace(/,/g, '')) ||
        monthLabel(t.date.slice(0, 7)).toLowerCase().includes(q) ||
        longDate(t.date).toLowerCase().includes(q),
    )
    .sort(histSorter());
  const what = [
    '“' + ui.histQuery.trim() + '”',
    hf.method ? { cash: 'cash', bank: 'bank accounts', upi: 'UPI', card: 'cards' }[hf.method] : '',
    hf.cat || '',
  ]
    .filter(Boolean)
    .join(' · ');
  if (!hits.length)
    return `<div class="card empty"><strong>No expenses match ${esc(what)}</strong><span>Try fewer filters, or a category, a note, a bank or card name, an amount or a month.</span><button type="button" class="btn-sm" data-hf-clear>Clear search</button></div>`;
  const groups = groupBy(hits, t => t.date.slice(0, 7)).sort(
    (a, b) => (hf.sort === 'old' ? -1 : 1) * b.key.localeCompare(a.key),
  );
  return `<div class="view"><div class="kv" style="padding:0 2px"><span>${hits.length} match${hits.length === 1 ? '' : 'es'} · ${esc(what)} <button type="button" class="btn-link btn-sm" style="min-height:0;padding:0 4px" data-hf-clear>clear</button></span><b>${esc(money(sum(hits)))}</b></div>
    ${hf.sort === 'high' || hf.sort === 'low' ? `<section class="card"><div class="list">${hits.map(txRow).join('')}</div></section>` : groups.map(g => `<section class="card"><button type="button" class="dayhead" data-detail="month|${g.key}" style="padding-top:0"><span>${esc(monthLabel(g.key))} · ${g.n}</span><span class="amt">${esc(money(g.v))}</span></button><div class="list">${g.items.map(txRow).join('')}</div></section>`).join('')}</div>`;
}
