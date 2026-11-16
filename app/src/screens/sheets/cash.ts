import { SheetView, closeSheet } from './index';
import { form, ui } from '../../ui/state';
import { acct, acctName, catColor } from '../../queries/ledger';
import { dateKey, fmtTime, money, shortDate, timeKey, today } from '../../lib/dates';
import { cashBalance, cashEvents } from '../../queries/cash';
import { cashFormHTML } from './forms';
import { esc, uid } from '../../lib/constants';
import { parseAmt } from '../../lib/calc';
import { toast } from '../../ui/toast';
import { S, save } from '../../data/storage';
import { remember } from '../../ui/pay';
import { render } from '../../ui/render';
/* Cash in hand: withdrawal/adjust form, the cash ledger sheet, and the save. */
export function cashFormSheet(p: string[]): SheetView {
  const k = p[1] === 'adjust' ? 'adjust' : 'withdrawal';
  if (!ui.editCash || ui.editCash.kind !== k) {
    const n = new Date();
    ui.editCash = {
      kind: k,
      amount: '',
      category: '',
      method: 'bank',
      accountId: acct(form.lastBank) ? form.lastBank : '',
      date: dateKey(n),
      time: timeKey(n),
      note: '',
    };
  }
  return {
    title: k === 'adjust' ? 'Add cash in hand' : 'Log a cash withdrawal',
    sub: k === 'adjust' ? 'Cash in hand now: ' + money(cashBalance()) : 'From an ATM or a bank counter',
    body: cashFormHTML(ui.editCash),
    tall: true,
    focus: '#e-amount',
  };
}
export function cashListSheet(_p: string[]): SheetView {
  const ev = cashEvents().reverse();
  let bal = cashBalance();
  const note = (r: { note: string }) => (r.note ? '<span class="note"> · ' + esc(r.note) + '</span>' : '');
  const rows = ev
    .map(e => {
      const line = `<div class="item"><span class="dot" style="background:${e.t === 'spend' ? catColor(e.ref.category) : e.t === 'income' ? 'var(--good)' : e.t === 'adjust' ? 'var(--ink-2)' : 'var(--src-bank)'}"></span><span class="name">${e.t === 'spend' ? esc(e.ref.category) + note(e.ref) : e.t === 'income' ? 'Received · ' + esc(e.ref.category) + note(e.ref) : e.t === 'adjust' ? 'Cash added' + note(e.ref) : 'Withdrawal' + (acct(e.ref.accountId) ? ' · ' + esc(acctName(e.ref.accountId)) : '') + note(e.ref)}<span class="small">${esc(shortDate(e.ref.date))}${e.ref.time ? ' · ' + esc(fmtTime(e.ref.time)) : ''} · after this ${esc(money(bal))}</span></span><span class="amt" style="${e.t === 'spend' ? 'color:var(--danger)' : 'color:var(--good)'}">${e.t === 'spend' ? '−' : '+'}${esc(money(e.amt))}</span>${e.t === 'spend' || e.t === 'income' ? `<button type="button" class="btn-ghost btn-sm" data-detail="${e.t === 'spend' ? 'tx' : 'inc'}|${e.ref.id}">›</button>` : ui.pending === 'cash:' + e.ref.id ? `<span class="confirm"><button type="button" class="btn-sm btn-danger" data-del-cash="${e.ref.id}">Delete</button><button type="button" class="btn-sm" data-cancel>No</button></span>` : `<button type="button" class="btn-ghost btn-sm" data-ask="cash:${e.ref.id}">✕</button>`}</div>`;
      if (e.t === 'spend') bal += e.amt;
      else bal -= e.amt;
      return line;
    })
    .join('');
  return {
    title: 'Cash in hand',
    sub: money(cashBalance()) + ' right now',
    body: rows ? `<div class="list">${rows}</div>` : '<div class="empty"><span>No cash activity yet.</span></div>',
  };
}
export function saveCash() {
  const st = ui.editCash;
  if (!st) return;
  const amt = parseAmt(st.amount);
  if (!(amt > 0)) {
    toast('Enter an amount');
    return;
  }
  if (st.kind === 'withdrawal' && !acct(st.accountId)) {
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
  const c = {
    id: uid(),
    kind: st.kind as 'withdrawal' | 'adjust',
    amount: Math.round(amt * 100) / 100,
    accountId: st.kind === 'withdrawal' ? st.accountId : '',
    date: st.date,
    time: /^\d{2}:\d{2}$/.test(st.time) ? st.time : '',
    note: String(st.note || '').trim(),
  };
  S.cashIn.push(c);
  save();
  if (c.accountId) remember(acct(c.accountId));
  closeSheet();
  render(false);
  toast(
    (c.kind === 'adjust' ? 'Added ' : 'Withdrew ') + money(c.amount) + ' · cash in hand now ' + money(cashBalance()),
  );
}
