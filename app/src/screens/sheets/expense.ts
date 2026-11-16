import { SheetView, closeSheet } from './index';
import { S, save } from '../../data/storage';
import { FUEL } from '../../data/model';
import { ui } from '../../ui/state';
import { fmtTime, longDate, midDate, money, parseDate, today } from '../../lib/dates';
import { editFormHTML } from './forms';
import {
  METHOD_LABEL,
  acct,
  acctName,
  catColor,
  chooseMsg,
  fuelTrack,
  kmpl,
  methodOf,
  num1,
  vehName,
} from '../../queries/ledger';
import { DAYS, esc } from '../../lib/constants';
import { recurLabel } from '../../queries/recurring';
import { parseAmt, posNum } from '../../lib/calc';
import { offerUndo, toast } from '../../ui/toast';
import { remember } from '../../ui/pay';
import { render } from '../../ui/render';
import { budgetWarn } from '../../ui/notify';
/* Expense detail and edit sheets, with their save and delete. */
export function editSheet(p: string[]): SheetView {
  const t = S.tx.find(x => x.id === p[1]);
  if (!t) return { title: 'Expense', body: '<div class="hint">This expense was deleted.</div>' };
  if (!ui.editTx || ui.editTx.id !== p[1])
    ui.editTx = {
      ...t,
      amount: String(t.amount),
      odoIn: t.odo ? String(t.odo) : '',
      litresIn: t.litres ? String(t.litres) : '',
    };
  return {
    title: 'Edit expense',
    sub: 'Originally ' + longDate(t.date),
    body: editFormHTML(ui.editTx, 'edit'),
    tall: true,
  };
}
export function txSheet(p: string[]): SheetView {
  const t = S.tx.find(x => x.id === p[1]);
  if (!t) return { title: 'Expense', body: '<div class="hint">This expense was deleted.</div>' };
  const m = methodOf(t);
  const rec = t.recurringId ? S.recurring.find(r => r.id === t.recurringId) : null;
  // A fill's mileage is the leg it starts: the km driven on its fuel until the next odometer reading.
  const leg = t.odo ? fuelTrack(t.vehicleId).legs.find(l => l.from.id === t.id) : undefined;
  const row = (k: string, v: string) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  const fuelRows =
    (t.vehicleId && vehName(t.vehicleId) ? row('Vehicle', vehName(t.vehicleId)) : '') +
    (t.odo ? row('Odometer', num1(t.odo) + ' km') : '') +
    (t.litres ? row('Litres', num1(t.litres) + ' L · ' + money(t.amount / t.litres) + ' a litre') : '') +
    (leg
      ? row('Mileage', kmpl(leg.kmpl) + ' · ' + num1(leg.km) + ' km on ' + num1(leg.litres) + ' L') +
        row('Cost per km', money(leg.cost / leg.km))
      : t.odo
        ? row('Mileage', 'Shows after the next fill with an odometer reading')
        : '');
  return {
    title: 'Expense',
    sub: longDate(t.date) + (t.time ? ' at ' + fmtTime(t.time) : ''),
    body: `<div class="tx-detail"><div class="tx-amt">${esc(money(t.amount))}</div>
      <div class="tx-cat"><span class="dot" style="background:${catColor(t.category)}"></span>${esc(t.category)}${t.recurringId ? '<span class="tag">auto</span>' : ''}</div>
      <dl class="kv-list"><div><dt>Payment</dt><dd>${esc(METHOD_LABEL[m])}</dd></div>${m !== 'cash' ? `<div><dt>${m === 'card' ? 'Card' : 'Bank'}</dt><dd>${esc(acctName(t.accountId))}</dd></div>` : ''}<div><dt>Day</dt><dd>${esc(DAYS[parseDate(t.date).getDay()])}</dd></div><div><dt>Date</dt><dd>${esc(midDate(t.date))}</dd></div><div><dt>Time</dt><dd>${t.time ? esc(fmtTime(t.time)) : 'Not recorded'}</dd></div>${fuelRows}${t.note ? `<div><dt>Note</dt><dd>${esc(t.note)}</dd></div>` : ''}${t.recurringId ? `<div><dt>Added by</dt><dd>${rec ? 'Recurring: ' + esc(recurLabel(rec)) : 'A recurring expense (since deleted)'}</dd></div>` : ''}</dl>
      <button type="button" class="btn-primary" data-detail="edit|${t.id}">Edit</button>
      <div class="two"><button type="button" data-detail="day|${t.date}">All of that day</button><button type="button" data-detail="cat|${t.date.slice(0, 7)}|${esc(t.category)}">${esc(t.category)} that month</button></div>
      <button type="button" class="btn-danger" data-del-tx="${t.id}">Delete this expense</button></div>`,
  };
}
export function saveEdit() {
  const st = ui.editTx;
  if (!st) return;
  const t = S.tx.find(x => x.id === st.id);
  if (!t) {
    closeSheet();
    return;
  }
  const amt = parseAmt(st.amount);
  if (!(amt > 0)) {
    toast('Enter an amount');
    return;
  }
  if (!st.category) {
    toast('Pick a category');
    return;
  }
  if (st.method !== 'cash' && !acct(st.accountId)) {
    toast(chooseMsg(st.method));
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
  // A reading that cannot be read is refused, not quietly dropped from the ledger.
  const odoIn = String(st.odoIn || '').trim(),
    litresIn = String(st.litresIn || '').trim(),
    odo = Math.round(posNum(odoIn) * 10) / 10,
    litres = Math.round(posNum(litresIn) * 100) / 100;
  if (st.category === FUEL && t.vehicleId) {
    if (odoIn && !odo) {
      toast('The odometer should be a number of km, like 5080');
      return;
    }
    if (litresIn && !litres) {
      toast('Litres should be a number, like 10');
      return;
    }
  }
  t.amount = Math.round(amt * 100) / 100;
  t.category = st.category;
  t.method = st.method;
  t.accountId = st.method === 'cash' ? 'cash' : st.accountId;
  t.date = st.date;
  t.time = /^\d{2}:\d{2}$/.test(st.time) ? st.time : '';
  t.note = String(st.note || '').trim();
  if (st.category !== FUEL) {
    // no longer a fill: a vehicle and readings left behind would skew that vehicle's mileage
    t.vehicleId = '';
    delete t.odo;
    delete t.litres;
  } else if (t.vehicleId) {
    if (odo) t.odo = odo;
    else delete t.odo;
    if (litres) t.litres = litres;
    else delete t.litres;
  }
  save();
  remember(acct(t.accountId));
  closeSheet();
  render(false);
  toast('Saved changes · ' + money(t.amount) + ' · ' + t.category);
  budgetWarn(t);
}
export function deleteTx(id: string) {
  const i = S.tx.findIndex(x => x.id === id);
  if (i < 0) return;
  const t = S.tx[i];
  S.tx.splice(i, 1);
  save();
  closeSheet();
  render(false);
  offerUndo('Deleted ' + money(t.amount) + ' · ' + t.category, () => {
    S.tx.splice(Math.min(i, S.tx.length), 0, t);
    save();
    render(false);
    toast('Restored ' + money(t.amount) + ' · ' + t.category);
  });
}
