import { SheetView, closeSheet } from './index';
import { form, ui } from '../../ui/state';
import { INCOME_SOURCES } from '../../data/model';
import { acct, acctName, payLabel } from '../../queries/ledger';
import { dateKey, fmtTime, longDate, midDate, money, parseDate, timeKey, today } from '../../lib/dates';
import { S, save } from '../../data/storage';
import { incomeFormHTML } from './forms';
import { DAYS, esc, uid } from '../../lib/constants';
import { recurLabel } from '../../queries/recurring';
import { parseAmt } from '../../lib/calc';
import { offerUndo, toast } from '../../ui/toast';
import { remember } from '../../ui/pay';
import { render } from '../../ui/render';
/* Money in: the form sheet, the detail sheet, save and delete. */
export function incomeFormSheet(p: string[]): SheetView {
  if (p[1] === 'new') {
    if (!ui.editIncome || ui.editIncome.id) {
      const n = new Date();
      ui.editIncome = {
        id: '',
        amount: '',
        category: INCOME_SOURCES[0],
        method: 'bank',
        accountId: acct(form.lastBank) ? form.lastBank : '',
        date: dateKey(n),
        time: timeKey(n),
        note: '',
      };
    }
  } else if (!ui.editIncome || ui.editIncome.id !== p[1]) {
    const t = S.income.find(x => x.id === p[1]);
    if (!t) return { title: 'Money in', body: '<div class="hint">This entry was deleted.</div>' };
    ui.editIncome = { ...t, amount: String(t.amount) };
  }
  const ei = ui.editIncome,
    orig = ei.id ? S.income.find(x => x.id === ei.id) : undefined;
  return {
    title: ei.id ? 'Edit money in' : 'Money in',
    sub: orig ? 'Originally ' + longDate(orig.date) : 'Salary, a refund, cash someone gave you',
    body: incomeFormHTML(ei),
    tall: true,
    focus: '#e-amount',
  };
}
export function incSheet(p: string[]): SheetView {
  const t = S.income.find(x => x.id === p[1]);
  if (!t) return { title: 'Money in', body: '<div class="hint">This entry was deleted.</div>' };
  const rec = t.recurringId ? S.recurring.find(r => r.id === t.recurringId) : null;
  return {
    title: 'Money in',
    sub: longDate(t.date) + (t.time ? ' at ' + fmtTime(t.time) : ''),
    body: `<div class="tx-detail"><div class="tx-amt" style="color:var(--good)">+${esc(money(t.amount))}</div>
      <div class="tx-cat"><span class="dot" style="background:var(--good)"></span>${esc(t.category)}${t.recurringId ? '<span class="tag">auto</span>' : ''}</div>
      <dl class="kv-list"><div><dt>Received into</dt><dd>${esc(t.method === 'cash' ? 'Cash' : acctName(t.accountId))}</dd></div><div><dt>Day</dt><dd>${esc(DAYS[parseDate(t.date).getDay()])}</dd></div><div><dt>Date</dt><dd>${esc(midDate(t.date))}</dd></div><div><dt>Time</dt><dd>${t.time ? esc(fmtTime(t.time)) : 'Not recorded'}</dd></div>${t.note ? `<div><dt>Note</dt><dd>${esc(t.note)}</dd></div>` : ''}${t.recurringId ? `<div><dt>Added by</dt><dd>${rec ? 'Recurring: ' + esc(recurLabel(rec)) : 'A recurring entry (since deleted)'}</dd></div>` : ''}</dl>
      <button type="button" class="btn-primary" data-detail="incomeform|${t.id}">Edit</button>
      <button type="button" class="btn-danger" data-del-inc="${t.id}">Delete this entry</button></div>`,
  };
}
export function saveIncome() {
  const st = ui.editIncome;
  if (!st) return;
  const amt = parseAmt(st.amount);
  if (!(amt > 0)) {
    toast('Enter an amount');
    return;
  }
  if (st.method !== 'cash' && !acct(st.accountId)) {
    toast('Choose the bank account');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(st.date)) {
    toast('Pick a valid date');
    return;
  }
  if (st.date > today()) {
    toast('The date cannot be in the future');
    return;
  }
  const t = {
    id: st.id || uid(),
    amount: Math.round(amt * 100) / 100,
    category: st.category,
    accountId: st.method === 'cash' ? 'cash' : st.accountId,
    method: st.method as 'cash' | 'bank',
    date: st.date,
    time: /^\d{2}:\d{2}$/.test(st.time) ? st.time : '',
    note: String(st.note || '').trim(),
    recurringId: st.recurringId || '',
  };
  const i = S.income.findIndex(x => x.id === t.id);
  if (i >= 0) S.income[i] = t;
  else S.income.push(t);
  save();
  remember(acct(t.accountId));
  closeSheet();
  render(false);
  toast((i >= 0 ? 'Saved changes · ' : 'Money in · ') + money(t.amount) + ' · ' + t.category + ' · ' + payLabel(t));
}
export function deleteIncome(id: string) {
  const i = S.income.findIndex(x => x.id === id);
  if (i < 0) return;
  const t = S.income[i];
  S.income.splice(i, 1);
  save();
  closeSheet();
  render(false);
  offerUndo('Deleted ' + money(t.amount) + ' · ' + t.category, () => {
    S.income.splice(Math.min(i, S.income.length), 0, t);
    save();
    render(false);
    toast('Restored ' + money(t.amount) + ' · ' + t.category);
  });
}
