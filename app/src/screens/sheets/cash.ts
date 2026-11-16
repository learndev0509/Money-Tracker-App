import { SheetView, closeSheet } from './index';
import { form, ui, type Draft } from '../../ui/state';
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
  const k = p[1] === 'adjust' ? 'adjust' : p[1] === 'correct' ? 'correct' : 'withdrawal';
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
    title: k === 'adjust' ? 'Add cash in hand' : k === 'correct' ? 'Correct cash in hand' : 'Log a cash withdrawal',
    sub:
      k === 'adjust'
        ? 'Cash in hand now: ' + money(cashBalance())
        : k === 'correct'
          ? 'Count your cash and enter the total'
          : 'From an ATM or a bank counter',
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
      // a correction that took cash off is a negative 'adjust': shown in red with a minus, like a spend
      const down = e.t === 'spend' || e.amt < 0;
      const line = `<div class="item"><span class="dot" style="background:${e.t === 'spend' ? catColor(e.ref.category) : e.t === 'income' ? 'var(--good)' : e.t === 'adjust' ? 'var(--ink-2)' : 'var(--src-bank)'}"></span><span class="name">${e.t === 'spend' ? esc(e.ref.category) + note(e.ref) : e.t === 'income' ? 'Received · ' + esc(e.ref.category) + note(e.ref) : e.t === 'adjust' ? (e.amt < 0 ? 'Correction' : 'Cash added') + note(e.ref) : 'Withdrawal' + (acct(e.ref.accountId) ? ' · ' + esc(acctName(e.ref.accountId)) : '') + note(e.ref)}<span class="small">${esc(shortDate(e.ref.date))}${e.ref.time ? ' · ' + esc(fmtTime(e.ref.time)) : ''} · after this ${esc(money(bal))}</span></span><span class="amt" style="${down ? 'color:var(--danger)' : 'color:var(--good)'}">${down ? '−' : '+'}${esc(money(Math.abs(e.amt)))}</span>${e.t === 'spend' || e.t === 'income' ? `<button type="button" class="btn-ghost btn-sm" data-detail="${e.t === 'spend' ? 'tx' : 'inc'}|${e.ref.id}">›</button>` : ui.pending === 'cash:' + e.ref.id ? `<span class="confirm"><button type="button" class="btn-sm btn-danger" data-del-cash="${e.ref.id}">Delete</button><button type="button" class="btn-sm" data-cancel>No</button></span>` : `<button type="button" class="btn-ghost btn-sm" data-ask="cash:${e.ref.id}">✕</button>`}</div>`;
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
/**
 * "Correct total": the amount is what was counted. The difference from what the app says is stored as
 * an 'adjust' entry, positive or negative, so the correction shows in the cash history and can be
 * removed; nothing is overwritten.
 */
function saveCorrection(st: Draft) {
  const amt = st.amount.trim() === '' ? NaN : parseAmt(st.amount);
  if (!(amt >= 0)) {
    toast('Enter the cash you actually have');
    return;
  }
  const now = cashBalance(),
    diff = Math.round((amt - now) * 100) / 100;
  if (!diff) {
    closeSheet();
    toast('Cash in hand is already ' + money(now));
    return;
  }
  const n = new Date();
  S.cashIn.push({
    id: uid(),
    kind: 'adjust',
    amount: diff,
    accountId: '',
    date: dateKey(n),
    time: timeKey(n),
    note: String(st.note || '').trim() || 'Counted ' + money(amt),
  });
  save();
  closeSheet();
  render(false);
  toast(
    'Cash in hand corrected to ' +
      money(cashBalance()) +
      ' · ' +
      (diff > 0 ? money(diff) + ' added' : money(-diff) + ' taken off'),
  );
}
export function saveCash() {
  const st = ui.editCash;
  if (!st) return;
  if (st.kind === 'correct') {
    saveCorrection(st);
    return;
  }
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
