import { SheetView } from './index';
import { HSORT, HistSort, hf, ui } from '../../ui/state';
import { S } from '../../data/storage';
import { METHODS } from '../../data/model';
import { METHOD_LABEL } from '../../queries/ledger';
import { esc } from '../../lib/constants';
import { ICON } from '../../lib/icons';
import { catIcon } from '../../ui/shared';
import { histCount, histFilterCount } from '../history';
/* The History screen's Filter and Sort buttons open these two sheets. */

/** Category and Paid with as chips; taps apply at once to the list behind, Show closes. */
export function histFilterSheet(): SheetView {
  const cats = [...new Set(S.tx.map(t => t.category).concat(S.categories))].sort();
  const chip = (attr: string, v: string, on: boolean, inner: string) =>
    `<button type="button" class="chip ${on ? 'on' : ''}" data-${attr}="${esc(v)}">${inner}</button>`;
  const n = histCount(),
    nf = histFilterCount();
  const what = ui.histQuery.trim() ? 'match' : 'expense';
  return {
    title: 'Filter',
    sub: nf ? nf + ' filter' + (nf === 1 ? '' : 's') + ' set' : 'Every expense',
    body: `<div class="form">
    <div><h2>Category</h2><div class="chips">${chip('hf-cat', '', !hf.cat, '<span class="t">All categories</span>')}${cats.map(c => chip('hf-cat', c, hf.cat === c, catIcon(c) + '<span class="t">' + esc(c) + '</span>')).join('')}</div></div>
    <div><h2>Paid with</h2><div class="chips">${chip('hf-method', '', !hf.method, '<span class="t">All payments</span>')}${METHODS.map(m => chip('hf-method', m, hf.method === m, ICON[m] + '<span class="t">' + esc(m === 'cash' ? 'Cash' : METHOD_LABEL[m].replace('Online · ', '')) + '</span>')).join('')}</div></div>
    <button type="button" class="btn-primary" data-close>Show ${n} ${what}${n === 1 ? '' : what === 'match' ? 'es' : 's'}</button>
    ${nf ? '<button type="button" data-hf-reset>Clear filters</button>' : ''}
  </div>`,
  };
}
/** The four orders as rows with a tick on the current one; a tap applies it and closes. */
export function histSortSheet(): SheetView {
  return {
    title: 'Sort',
    sub: 'By date or by amount',
    body: `<div class="list">${(Object.keys(HSORT) as HistSort[])
      .map(
        k =>
          `<button type="button" class="pickrow" data-hf-sort="${k}"><span class="name">${esc(HSORT[k])}</span>${hf.sort === k ? '<span class="tick">✓</span>' : ''}</button>`,
      )
      .join('')}</div>`,
  };
}
