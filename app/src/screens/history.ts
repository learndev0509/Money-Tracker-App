import { Income, Tx } from '../data/model';
import { S } from '../data/storage';
import { longDate, money, monthLabel, today } from '../lib/dates';
import { HSORT, HSORT_SHORT, hf, histSorter, ui } from '../ui/state';
import { METHOD_LABEL, groupBy, methodOf, payLabel, sum, txIn, txInYear } from '../queries/ledger';
import { MONTHS, el, esc, pad } from '../lib/constants';
import { ADD_BTN } from '../ui/render';
import { ICON, SEARCH_SVG } from '../lib/icons';
import { dayGroups, incRow, txRow } from '../ui/shared';
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
/** The Category and Paid with dropdowns, applied to expenses or to income. */
export function histFilter<T extends Tx | Income>(list: T[]) {
  return list.filter(t => (!hf.method || methodOf(t) === hf.method) && (!hf.cat || t.category === hf.cat));
}
/** How many Category / Paid with filters are set, for the Filter button and the sheet. */
export const histFilterCount = () => (hf.cat ? 1 : 0) + (hf.method ? 1 : 0);
/** Whether the Clear button has anything to clear: a filter, a sort off newest first, or a search. */
export const histDirty = () => !!(hf.cat || hf.method || hf.sort !== 'new' || ui.histQuery.trim());
/** The Year and Month dropdowns, then the Filter, Sort and Clear buttons (the first two open sheets). */
export function filterChipsHTML() {
  const ys = histYears(),
    curY = +today().slice(0, 4),
    curM = +today().slice(5, 7);
  if (!ys.includes(ui.histYear)) ui.histYear = ys[0];
  if (ui.histYear === curY && ui.histMonth > curM) ui.histMonth = curM;
  const opt = (v: string | number, label: string | number, sel: boolean, extra?: string) =>
    `<option value="${esc(v)}" ${sel ? 'selected' : ''} ${extra || ''}>${esc(label)}</option>`;
  const sel = (id: string, label: string, opts: string) =>
    `<label>${label}<select id="${id}" aria-label="${label}">${opts}</select></label>`;
  const months =
    opt(0, 'All months', ui.histMonth === 0) +
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1,
        n = txIn(ui.histYear + '-' + pad(m)).length;
      return opt(
        m,
        MONTHS[m - 1] + (n ? ' · ' + n : ''),
        m === ui.histMonth,
        ui.histYear === curY && m > curM ? 'disabled' : '',
      );
    }).join('');
  const nf = histFilterCount();
  return `<div class="hsel">
    ${sel('h-year', 'Year', ys.map(y => opt(y, y, y === ui.histYear)).join(''))}
    ${sel('h-month', 'Month', months)}
  </div>
  <div class="htools">
    <button type="button" id="h-filter" class="${nf ? 'on' : ''}" data-detail="hfilter" aria-label="Filter${nf ? ', ' + nf + ' set' : ''}">${ICON.filter}Filter${nf ? ' · ' + nf : ''}</button>
    <button type="button" id="h-sort" class="${hf.sort !== 'new' ? 'on' : ''}" data-detail="hsort" aria-label="Sort: ${esc(HSORT[hf.sort])}">${ICON.sort}${esc(HSORT_SHORT[hf.sort])}</button>
    <button type="button" id="h-clear" data-hf-clear aria-label="Clear filters, sort and search" ${histDirty() ? '' : 'disabled'}>${ICON.brush}Clear</button>
  </div>`;
}
/** What the Filter sheet's button will show: the expenses the current filters leave in the list or the search. */
export function histCount() {
  if (ui.histQuery.trim()) return searchHits().length;
  return histFilter(ui.histMonth ? txIn(ui.histYear + '-' + pad(ui.histMonth)) : txInYear(ui.histYear)).length;
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
/** The whole year, one card per month with its total, each grouped by day inside. */
function monthSections(items: Tx[]) {
  const oldest = hf.sort === 'old';
  return groupBy(items, t => t.date.slice(0, 7))
    .sort((a, b) => (oldest ? -1 : 1) * b.key.localeCompare(a.key))
    .map(
      g =>
        `<section class="card"><button type="button" class="dayhead monthhead" data-detail="month|${g.key}"><span>${esc(monthLabel(g.key))} · ${g.n}</span><span class="amt">${esc(money(g.v))}</span></button>${dayGroups(g.items, oldest)}</section>`,
    )
    .join('');
}
/** The Month dropdown's choice: one month, or the whole year when it is on "All months". */
export function monthListHTML() {
  const year = !ui.histMonth,
    k = ui.histYear + '-' + pad(ui.histMonth),
    label = year ? String(ui.histYear) : monthLabel(k),
    all = year ? txInYear(ui.histYear) : txIn(k),
    items = histFilter(all).sort(histSorter()),
    filtered = !!(hf.method || hf.cat);
  const byAmount = hf.sort === 'high' || hf.sort === 'low';
  const list = byAmount
    ? `<section class="card"><div class="list">${items.map(t => txRow(t)).join('')}</div></section>`
    : year
      ? monthSections(items)
      : `<section class="card">${dayGroups(items, hf.sort === 'old')}</section>`;
  return `<div class="view">
    <div class="kv" style="padding:0 2px"><span>${esc(label)} · ${items.length} expense${items.length === 1 ? '' : 's'}${filtered ? ' · filtered' : ''} · ${esc(HSORT[hf.sort].toLowerCase())}</span><b>${esc(money(sum(items)))}</b></div>
    ${items.length ? list : `<div class="card empty"><strong>${all.length ? 'Nothing matches the filters in ' + esc(label) : 'Nothing spent in ' + esc(label)}</strong><span>${all.length ? 'Change the filter above to see every expense that ' + (year ? 'year' : 'month') + '.' : 'Pick another month or year above.'}</span>${all.length ? '<button type="button" class="btn-sm" data-hf-clear>Clear filters</button>' : ''}</div>`}
  </div>`;
}
/** The total of a search result: what was spent, and what came in when any income matched. */
function searchTotal(items: (Tx | Income)[]) {
  const inc = new Set<Tx | Income>(S.income);
  const spent = sum(items.filter(t => !inc.has(t))),
    got = sum(items.filter(t => inc.has(t)));
  const plus = got ? `<span style="color:var(--good)">+${esc(money(got))}</span>` : '';
  return spent || !got ? esc(money(spent)) + (plus ? ' ' + plus : '') : plus;
}
/** Every expense and income across all time that matches the search box and the filters, in the chosen order. */
function searchHits(): (Tx | Income)[] {
  const q = ui.histQuery.trim().toLowerCase();
  const matches = (t: Tx | Income) =>
    t.category.toLowerCase().includes(q) ||
    t.note.toLowerCase().includes(q) ||
    payLabel(t).toLowerCase().includes(q) ||
    METHOD_LABEL[methodOf(t)].toLowerCase().includes(q) ||
    String(t.amount).includes(q.replace(/,/g, '')) ||
    monthLabel(t.date.slice(0, 7)).toLowerCase().includes(q) ||
    longDate(t.date).toLowerCase().includes(q);
  return [...histFilter(S.tx), ...histFilter(S.income)].filter(matches).sort(histSorter());
}
export function searchHTML() {
  const inc = new Set<Tx | Income>(S.income);
  const hits = searchHits();
  const row = (t: Tx | Income) => (inc.has(t) ? incRow(t as Income) : txRow(t as Tx));
  const what = [
    '“' + ui.histQuery.trim() + '”',
    hf.method ? { cash: 'cash', bank: 'bank accounts', upi: 'UPI', card: 'cards' }[hf.method] : '',
    hf.cat || '',
  ]
    .filter(Boolean)
    .join(' · ');
  if (!hits.length)
    return `<div class="card empty"><strong>Nothing matches ${esc(what)}</strong><span>Try fewer filters, or a category, a note, a bank or card name, an amount or a month.</span><button type="button" class="btn-sm" data-hf-clear>Clear search</button></div>`;
  const groups = groupBy(hits, t => t.date.slice(0, 7)).sort(
    (a, b) => (hf.sort === 'old' ? -1 : 1) * b.key.localeCompare(a.key),
  );
  return `<div class="view"><div class="kv" style="padding:0 2px"><span>${hits.length} match${hits.length === 1 ? '' : 'es'} · ${esc(what)} <button type="button" class="btn-link btn-sm" style="min-height:0;padding:0 4px" data-hf-clear>clear</button></span><b>${searchTotal(hits)}</b></div>
    ${hf.sort === 'high' || hf.sort === 'low' ? `<section class="card"><div class="list">${hits.map(row).join('')}</div></section>` : groups.map(g => `<section class="card"><button type="button" class="dayhead" data-detail="month|${g.key}" style="padding-top:0"><span>${esc(monthLabel(g.key))} · ${g.n}</span><span class="amt">${searchTotal(g.items)}</span></button><div class="list">${g.items.map(row).join('')}</div></section>`).join('')}</div>`;
}
