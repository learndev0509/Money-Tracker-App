/* Handlers inside the sheet (#sheet): pickers, the edit forms, the calculator, PIN and deletes. */
import { el } from '../lib/constants';
import { money } from '../lib/dates';
import { INCOME_SOURCES, isMethod } from '../data/model';
import { S, save } from '../data/storage';
import { acct } from '../queries/ledger';
import { cashBalance } from '../queries/cash';
import { ui, type Draft } from '../ui/state';
import { toast } from '../ui/toast';
import { go, render } from '../ui/render';
import { chooseAccount, remember, setMethodOn } from '../ui/pay';
import { pickListHTML } from '../ui/picker';
import { calcKey, calcUse, closeSheet, deleteIncome, deleteTx, openSheet, renderSheet, saveCash, saveEdit, saveIncome, saveRecur, sheetBack, sheetState } from '../screens/sheets';
import { savePin } from '../screens/security';

type ButtonHandler = (value: string, b: HTMLButtonElement, st: Draft | null) => void;

const pickType = () => { const cur = ui.sheetStack[ui.sheetStack.length - 1] || ''; return cur.split('|')[1] === 'card' ? 'card' : 'bank'; };
const pickCtx = () => { const cur = ui.sheetStack[ui.sheetStack.length - 1] || ''; return cur.split('|')[2] || 'form'; };

/** Buttons in a sheet by data-* attribute; `st` is the draft the open sheet edits, if any. */
const clicksByData: [string, ButtonHandler][] = [
  ['cat', (v, _b, st) => { if (!st) return; st.category = v; el('#sheet').querySelectorAll<HTMLElement>('.chip[data-cat]').forEach(c => c.classList.toggle('on', c.dataset.cat === v)); }],
  ['method', (v, _b, st) => { if (st && (v === 'online' || isMethod(v))) { setMethodOn(st, v); renderSheet(); } }],
  ['acct', (v, _b, st) => { if (!st) return; const a = acct(v); if (a) { st.accountId = a.id; remember(a); } renderSheet(); }],
  ['installLater', () => { ui.installHintHidden = true; closeSheet(); render(false); }],
  ['calc', (_v, _b, st) => { ui.calcTarget = 'sheet'; ui.calcExpr = st ? String(st.amount || '') : ''; openSheet('calc|sheet'); }],
  ['ck', v => calcKey(v)],
  ['calcUse', () => calcUse()],
  ['saveEdit', () => saveEdit()],
  ['saveRecur', () => saveRecur()],
  ['saveCash', () => saveCash()],
  ['saveIncome', () => saveIncome()],
  ['delInc', v => deleteIncome(v)],
  ['kind', (v, _b, st) => { if (st && (v === 'expense' || v === 'income')) { st.kind = v; st.category = v === 'income' ? INCOME_SOURCES[0] : (S.categories[0] || ''); renderSheet(); } }],
  ['pinSave', v => savePin(v)],
  ['ask', v => { ui.pending = v; renderSheet(); }],
  ['cancel', () => { ui.pending = null; renderSheet(); }],
  ['delTx', v => deleteTx(v)],
  ['delRec', v => { S.recurring = S.recurring.filter(x => x.id !== v); ui.pending = null; save(); closeSheet(); render(false); toast('Recurring expense deleted'); }],
  ['delCash', v => { S.cashIn = S.cashIn.filter(x => x.id !== v); ui.pending = null; save(); renderSheet(); render(false); toast('Removed · cash in hand now ' + money(cashBalance())); }],
  ['openMonth', v => { ui.period = v; closeSheet(); go('dashboard'); }],
];

export function bindSheet() {
  const sheet = el('#sheet');
  sheet.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]')) { closeSheet(); return; }
    if (t.closest('[data-back]')) { sheetBack(); return; }
    const pk = t.closest<HTMLElement>('[data-pick]'); if (pk) { chooseAccount(pk.dataset.pick, pickType(), pickCtx()); return; }
    if (t.closest('[data-pick-custom]')) { chooseAccount(ui.pickQuery, pickType(), pickCtx()); return; }
    const op = t.closest<HTMLElement>('[data-open-pick]'); if (op) { ui.pickQuery = ''; openSheet('pick|' + op.dataset.openPick + '|' + (op.dataset.ctx || 'form')); return; }
    const detail = t.closest<HTMLElement>('[data-detail]')?.dataset.detail; if (detail !== undefined) { openSheet(detail); return; }
    const b = t.closest('button'); if (!b) return; const d = b.dataset, st = sheetState();
    for (const [key, run] of clicksByData) if (key in d) { run(d[key] ?? '', b, st); return; }
  });
  sheet.addEventListener('input', e => {
    const t = e.target as HTMLInputElement, st = sheetState();
    if (t.id === 'pick-search') { ui.pickQuery = t.value; const list = el('#pick-list'); if (list) list.innerHTML = pickListHTML(pickType(), pickCtx()); return; }
    if (!st) return;
    if (t.id === 'e-amount') st.amount = t.value; else if (t.id === 'e-note') st.note = t.value; else if (t.id === 'e-date') st.date = t.value; else if (t.id === 'e-time') st.time = t.value;
  });
  sheet.addEventListener('change', e => {
    const t = e.target as HTMLInputElement, st = sheetState(); if (!st) return;
    if (t.id === 'e-day') st.day = +t.value; else if (t.id === 'e-since') st.since = t.value; else if (t.id === 'e-active') st.active = t.value === '1';
  });
  sheet.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && t.id === 'pick-search') { e.preventDefault(); const first = el('#pick-list [data-pick]'); if (first) first.click(); else { const c = el('#pick-list [data-pick-custom]'); if (c) c.click(); } }
    if (e.key === 'Enter' && /^p-/.test(t.id || '')) { e.preventDefault(); const b = el('#sheet [data-pin-save]'); if (b) b.click(); }
  });
}
