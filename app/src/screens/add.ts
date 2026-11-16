import { Account, Tx } from '../data/model';
import { S, save } from '../data/storage';
import {
  acct,
  acctName,
  activeAccounts,
  billSoFar,
  catColor,
  chooseMsg,
  fuelIn,
  fuelTrack,
  isFuel,
  kmpl,
  legKm,
  num1,
  lastUsed,
  accountUse,
  newest,
  lastFuel,
  payLabel,
  sortTx,
  sum,
  vehName,
} from '../queries/ledger';
import { txRow } from '../ui/shared';
import { noteStats, noteSuggestions } from '../queries/notes';
import { form, fuel, ui } from '../ui/state';
import { DAYS, MONTHS, el, esc, norm, reduceMotion, uid } from '../lib/constants';
import { CALC_BTN, CAT_ICON, ICON, glyph } from '../lib/icons';
import { dateKey, dm, fmtTime, money, shortDate, thisMonth, timeKey, today } from '../lib/dates';
import { catChipsHTML, payBlockHTML, remember } from '../ui/pay';
import { parseAmt, posNum } from '../lib/calc';
import { FUEL, acctTypeOf } from '../data/model';
import { render } from '../ui/render';
import { toast } from '../ui/toast';
import { budgetWarn } from '../ui/notify';
/* ---------- ADD ---------- */
export function recentHTML(fresh?: boolean) {
  const r = newest(S.tx, 3);
  return r.length
    ? `<div class="list">${r.map((t, i) => txRow(t, fresh && i === 0)).join('')}</div>`
    : '<div class="hint">Your first expense will appear here with its day, date and time.</div>';
}
export function noteSuggestHTML() {
  const list = noteSuggestions(form.note);
  if (!list.length) return '';
  return (
    `<span class="hint" style="width:100%">${form.note.trim() ? 'Looks like' : 'Frequent'} · tap to fill category and account too</span>` +
    list
      .map(
        s =>
          `<button type="button" class="chip sm suggest" data-note="${esc(s.note)}"><span class="dot" style="background:${catColor(s.category)}"></span><span class="t">${esc(s.note)}</span><span class="small">· ${esc(s.method === 'cash' ? 'Cash' : acctName(s.accountId))}</span></button>`,
      )
      .join('')
  );
}
export function rAdd() {
  if (!S.categories.includes(form.category)) form.category = S.categories[0] || '';
  const n = new Date();
  // While the Fuel card is open it is the whole form: a fill is only ever a Fuel expense, so the
  // manual form (amount, category, paid with, note) stays out of the way until the card is closed.
  const now = `<div class="now"><span class="now-day" id="clock-day">${esc(DAYS[n.getDay()])}</span><span class="now-rest" id="clock-rest">${esc(n.getDate() + ' ' + MONTHS[n.getMonth()] + ' ' + n.getFullYear() + ' · ' + fmtTime(timeKey(n)))}</span><span class="now-hint">Day, date and time are recorded automatically when you save.</span></div>`;
  const manual = `${now}
    <div class="amount-in"><span class="cur">₹</span><input id="f-amount" type="text" inputmode="decimal" placeholder="0" value="${esc(form.amount)}" aria-label="Amount" autocomplete="off" enterkeyhint="done">${CALC_BTN('form')}</div>
    <div><h2>Category</h2><div class="chips" id="cat-chips">${catChipsHTML(form.category)}</div></div>
    <div id="pay-block">${payBlockHTML(form, 'form')}</div>
    <div><label class="f">Note (optional)<input id="f-note" type="text" value="${esc(form.note)}" placeholder="e.g. Swiggy, petrol, chai" maxlength="60" autocomplete="off"></label><div class="chips" id="note-suggest">${noteSuggestHTML()}</div></div>
    <button type="button" class="btn-link" id="toggle-backdate">${form.backdate ? 'Use the current date and time instead' : 'Logging something from earlier? Change date or time'}</button>
    <div id="backdate" class="two" ${form.backdate ? '' : 'hidden'}><label class="f">Date<input id="f-date" type="date" value="${esc(form.date || today())}" max="${today()}"></label><label class="f">Time<input id="f-time" type="time" value="${esc(form.time || timeKey(n))}"></label></div>
    <button type="button" class="btn-primary" id="save-tx">Save expense</button>`;
  return `<div class="view">
    <div class="topbar"><h1>Add expense</h1><span class="row" style="gap:2px"><button type="button" class="btn-ghost btn-sm ${ui.fuelOpen ? 'on' : ''}" id="fuel-toggle" aria-expanded="${ui.fuelOpen}" aria-controls="fuel-card">${ICON.fuel}Fuel</button><button type="button" class="btn-ghost btn-sm" data-detail="incomeform|new">Money in</button><button type="button" class="btn-ghost btn-sm" data-detail="cashform|withdrawal">Cash out</button></span></div>
    ${ui.fuelOpen ? fuelCardHTML() + now : manual}
    <section class="card"><div class="card-head"><h2>Just added</h2><span class="sub">Tap one to check, edit or delete</span></div><div id="recent">${recentHTML()}</div></section>
  </div>`;
}
export function refreshPay() {
  const pb = el('#pay-block');
  if (pb) pb.innerHTML = payBlockHTML(form, 'form');
}
/** The account the Fuel card pays from: none for cash, else the bank (UPI) or card chosen. */
const fuelAcct = () => (fuel.method === 'cash' ? undefined : acct(fuel.accountId));
/** Switch the card to a vehicle: the amount clears and the vehicle's own last way of paying comes back. */
export function pickVehicle(id: string) {
  fuel.vehicleId = id;
  fuel.amount = '';
  fuel.odo = '';
  fuel.litres = '';
  ui.fuelAddingVeh = false;
  // Mileage is optional: its fields open by themselves only for a vehicle already being tracked.
  fuel.mileage = !!fuelTrack(id).open;
  const lf = lastFuel(id),
    la = lf ? acct(lf.accountId) : undefined;
  if (lf && lf.method === 'cash') {
    fuel.method = 'cash';
    fuel.accountId = 'cash';
  } else if (lf && la && !la.archived) {
    // the card knows Cash, UPI and Card only, so a fill edited onto a bank account comes back as UPI
    fuel.method = la.type === 'card' ? 'card' : 'upi';
    fuel.accountId = la.id;
  } else {
    const c = acct(form.lastCard);
    fuel.method = 'card';
    fuel.accountId = c && !c.archived ? c.id : '';
  }
}
/** Cash, UPI or Card on the Fuel card: the vehicle's last fill paid that way picks the account, else fuelDefaults() does. */
export function pickFuelMethod(m: 'cash' | 'upi' | 'card') {
  fuel.method = m;
  if (m === 'cash') {
    fuel.accountId = 'cash';
    return;
  }
  const type = acctTypeOf(m),
    cur = acct(fuel.accountId);
  if (cur && cur.type === type && !cur.archived) return;
  const lv = S.tx
      .filter(t => isFuel(t) && t.vehicleId === fuel.vehicleId && acctTypeOf(t.method) === type)
      .sort(sortTx)[0],
    la = lv ? acct(lv.accountId) : undefined;
  fuel.accountId = la && la.type === type && !la.archived ? la.id : '';
}
export function fuelDefaults() {
  if (!S.vehicles.some(v => v.id === fuel.vehicleId)) {
    const lf = lastFuel();
    pickVehicle(lf && S.vehicles.some(v => v.id === lf.vehicleId) ? lf.vehicleId : S.vehicles[0].id);
  }
  if (fuel.method === 'cash') {
    fuel.accountId = 'cash';
    return;
  }
  const type = acctTypeOf(fuel.method),
    cur = acct(fuel.accountId);
  if (!cur || cur.archived || cur.type !== type) {
    // the one remembered from the main form, else the first chip the card will show
    const rem = acct(type === 'bank' ? form.lastBank : form.lastCard);
    fuel.accountId = rem && !rem.archived && rem.type === type ? rem.id : fuelAccounts(type)[0]?.id || '';
  }
}
/** The chips under Cash / UPI / Card: accounts fuel went on before, then the ones used most recently for anything. */
function fuelAccounts(type: 'bank' | 'card') {
  const forFuel = [
    ...new Set(
      S.tx
        .filter(t => isFuel(t) && acctTypeOf(t.method) === type)
        .sort(sortTx)
        .map(t => t.accountId),
    ),
  ]
    .map(acct)
    .filter((x): x is Account => !!x && x.type === type && !x.archived);
  const use = accountUse();
  const recent = activeAccounts(type)
    .filter(x => !forFuel.includes(x))
    .map(x => ({ x, u: lastUsed(x.id, use) }))
    .sort((p, q) => q.u.localeCompare(p.u))
    .map(p => p.x);
  return forFuel.concat(recent).slice(0, 3);
}
export function resetFuel() {
  fuel.vehicleId = '';
  fuel.accountId = '';
  fuel.amount = '';
  fuel.odo = '';
  fuel.litres = '';
  fuel.mileage = false;
  fuel.method = 'card';
  ui.fuelAddingVeh = false;
}
export function fuelBtnLabel() {
  const amt = parseAmt(fuel.amount),
    a = fuelAcct();
  return (
    'Log fuel' +
    (amt > 0 ? ' · ' + money(amt) : '') +
    (vehName(fuel.vehicleId) ? ' · ' + vehName(fuel.vehicleId) : '') +
    (fuel.method === 'cash' ? ' · Cash' : a ? ' · ' + (fuel.method === 'upi' ? 'UPI · ' : '') + a.name : '')
  );
}
export function fuelHint() {
  const a = fuelAcct(),
    b = a ? billSoFar(a.id) : null,
    amt = parseAmt(fuel.amount) || 0;
  return a && b
    ? 'After this, ' + a.name + ' bill so far ' + money(b.sum + amt) + ' (closes ' + dm(b.to) + ')'
    : a && a.type === 'card'
      ? 'Set ' + a.name + "'s statement day in Settings to see the bill here."
      : fuel.method === 'cash'
        ? 'Comes off the cash in hand.'
        : '';
}
/** The line under the odometer and litres fields: the mileage this reading gives, or what is still needed. */
export function mileageHint() {
  const odo = posNum(fuel.odo),
    litres = posNum(fuel.litres),
    amt = parseAmt(fuel.amount) || 0,
    open = fuelTrack(fuel.vehicleId).open,
    rate = litres && amt > 0 ? ' · ' + money(amt / litres) + ' a litre' : '';
  if (!open)
    return odo
      ? litres
        ? 'First reading for ' + vehName(fuel.vehicleId) + '. Mileage shows at the next fill' + (rate || '.')
        : 'First reading for ' + vehName(fuel.vehicleId) + '. Add the litres too, or the next fill cannot show mileage.'
      : 'Optional. Enter the odometer reading and the litres at each fill; mileage shows from the second fill' +
          (rate || '.');
  const from = open.from.odo || 0,
    last = num1(from) + ' km on ' + dm(open.from.date);
  if (!odo) return 'Last reading ' + last + rate;
  if (odo <= from) return 'The odometer should read more than last time, ' + last + '.';
  const km = legKm(open, odo);
  if (!km)
    return (
      num1(odo - from) + ' km since ' + dm(open.from.date) + ' · no mileage, a fill since then has no litres' + rate
    );
  return (
    num1(km) +
    ' km on ' +
    num1(open.litres) +
    ' L since ' +
    dm(open.from.date) +
    ' · ' +
    kmpl(km / open.litres) +
    ' · ' +
    money(open.cost / km) +
    ' a km' +
    rate
  );
}
function fuelMileageHTML() {
  const link = `<button type="button" class="btn-link" data-fuel-mileage aria-expanded="${fuel.mileage}" style="margin-top:6px">${fuel.mileage ? 'Skip mileage for this fill' : 'Check mileage? Add odometer and litres'}</button>`;
  if (!fuel.mileage) return link;
  return `${link}
    <div class="two"><label class="f">Odometer (km)<input id="fuel-odo" type="text" inputmode="decimal" placeholder="e.g. 5080" value="${esc(fuel.odo)}" maxlength="9" autocomplete="off" enterkeyhint="done"></label><label class="f">Litres<input id="fuel-litres" type="text" inputmode="decimal" placeholder="e.g. 10" value="${esc(fuel.litres)}" maxlength="7" autocomplete="off" enterkeyhint="done"></label></div>
    <div class="hint" id="fuel-kmpl" style="margin-top:6px">${esc(mileageHint())}</div>`;
}
/** The pay row of the Fuel card: Cash, UPI or Card, then the accounts of that type used for fuel before. */
function fuelPayHTML() {
  const seg = `<div class="seg seg3" style="margin-top:10px">${(['cash', 'upi', 'card'] as const).map(m => `<button type="button" data-fuel-method="${m}" class="${fuel.method === m ? 'on' : ''}">${ICON[m]}${{ cash: 'Cash', upi: 'UPI', card: 'Card' }[m]}</button>`).join('')}</div>`;
  if (fuel.method === 'cash') return seg;
  const type = acctTypeOf(fuel.method),
    a = acct(fuel.accountId);
  const used = fuelAccounts(type);
  if (a && a.type === type && !used.some(c => c.id === a.id)) used.unshift(a);
  const bill = (c: Account) => {
    const b = c.type === 'card' ? billSoFar(c.id) : null;
    return b ? '<span class="small">bill so far ' + esc(money(b.sum)) + '</span>' : '';
  };
  const other =
    type === 'card'
      ? used.length
        ? 'Other card…'
        : 'Choose the credit card…'
      : used.length
        ? 'Other bank…'
        : 'Choose the bank for UPI…';
  return `${seg}
    <div class="chips paychips">${used.map(c => `<button type="button" class="chip ${c.id === fuel.accountId ? 'on' : ''}" data-fuel-acct="${c.id}">${ICON[type]}<span class="t">${esc(c.name)}</span>${bill(c)}</button>`).join('')}<button type="button" class="chip suggest" data-open-pick="${type}" data-ctx="fuel"><span class="t">${other}</span></button></div>`;
}
export const vehInputHTML = () =>
  `<div class="row" style="margin-top:10px"><input class="grow" id="veh-name" placeholder="Vehicle, e.g. Swift, Activa" maxlength="30" autocomplete="off"><button type="button" id="veh-add">Add</button></div>`;
export function fuelCardHTML() {
  const close =
    '<button type="button" class="btn-icon" data-fuel-close aria-label="Close fuel" style="font-size:16px">✕</button>';
  if (!S.vehicles.length)
    return `<section class="card fuelcard" id="fuel-card"><div class="card-head"><h2>Fuel</h2><span class="row" style="gap:6px"><span class="sub">Daily fills in one tap</span>${close}</span></div><div class="hint">Add your vehicle once. After that a fill is: check the amount, tap.</div>${vehInputHTML()}</section>`;
  fuelDefaults();
  const fills = fuelIn(thisMonth());
  return `<section class="card fuelcard" id="fuel-card"><div class="card-head"><h2>Fuel</h2><span class="row" style="gap:6px"><span class="sub">${fills.length ? esc(money(sum(fills))) + ' this month · ' + fills.length + ' fill' + (fills.length === 1 ? '' : 's') : 'Nothing yet this month'}</span>${close}</span></div>
    <div class="chips" style="margin-top:0">${S.vehicles.map(v => `<button type="button" class="chip ${v.id === fuel.vehicleId ? 'on' : ''}" data-veh="${v.id}">${glyph(CAT_ICON.transport, catColor(FUEL))}<span class="t">${esc(v.name)}</span></button>`).join('')}<button type="button" class="chip suggest" data-veh-new><span class="t">+ vehicle</span></button></div>
    ${ui.fuelAddingVeh ? vehInputHTML() : ''}
    ${fuelPayHTML()}
    <div class="amount-in" style="margin-top:10px"><span class="cur">₹</span><input id="fuel-amount" type="text" inputmode="decimal" placeholder="0" value="${esc(fuel.amount)}" aria-label="Fuel amount" autocomplete="off" enterkeyhint="done">${CALC_BTN('fuel')}</div>
    ${fuelMileageHTML()}
    <button type="button" class="btn-primary" id="fuel-save" style="margin-top:10px">${esc(fuelBtnLabel())}</button>
    <div class="hint" id="fuel-hint" style="margin-top:8px">${esc(fuelHint())}</div></section>`;
}
export function refreshFuel() {
  const c = el('#fuel-card');
  if (c) c.outerHTML = fuelCardHTML();
}
export function morphSaved(id: string, restore: () => string) {
  const sb = el(id);
  if (!sb || reduceMotion()) return;
  sb.classList.add('done');
  sb.innerHTML = '<svg class="tick" viewBox="0 0 24 24"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>Saved';
  setTimeout(() => {
    if (sb.isConnected) {
      sb.classList.remove('done');
      sb.textContent = restore();
    }
  }, 900);
}
export function addVehicle() {
  const inp = el('#veh-name');
  const n = String((inp && inp.value) || '')
    .replace(/\|/g, '')
    .trim();
  if (!n) {
    if (inp) inp.focus();
    return;
  }
  let v = S.vehicles.find(x => x.name.toLowerCase() === n.toLowerCase());
  if (!v) {
    v = { id: uid(), name: n };
    S.vehicles.push(v);
    save();
  }
  pickVehicle(v.id);
  if (ui.view === 'settings') render(false);
  else {
    refreshFuel();
    const i = el('#fuel-amount');
    if (i) i.focus();
  }
}
export function saveFuel() {
  const amt = parseAmt(fuel.amount);
  if (!(amt > 0)) {
    toast('Enter the fuel amount');
    const i = el('#fuel-amount');
    if (i) i.focus();
    return;
  }
  const v = S.vehicles.find(x => x.id === fuel.vehicleId);
  if (!v) {
    toast('Pick a vehicle');
    return;
  }
  const a = fuelAcct();
  if (fuel.method !== 'cash' && !a) {
    toast(chooseMsg(fuel.method));
    return;
  }
  const odo = fuel.mileage ? Math.round(posNum(fuel.odo) * 10) / 10 : 0,
    litres = fuel.mileage ? Math.round(posNum(fuel.litres) * 100) / 100 : 0,
    open = fuelTrack(v.id).open,
    km = open && odo ? legKm(open, odo) : 0;
  // something typed that is not a number is refused, not quietly left out of the fill
  const bad = !fuel.mileage
    ? ''
    : fuel.odo.trim() && !odo
      ? '#fuel-odo'
      : fuel.litres.trim() && !litres
        ? '#fuel-litres'
        : '';
  if (bad) {
    toast(
      bad === '#fuel-odo' ? 'The odometer should be a number of km, like 5080' : 'Litres should be a number, like 10',
    );
    const i = el(bad);
    if (i) i.focus();
    return;
  }
  if (odo && open && odo <= (open.from.odo || 0)) {
    toast('The odometer should read more than last time, ' + num1(open.from.odo || 0) + ' km');
    const i = el('#fuel-odo');
    if (i) i.focus();
    return;
  }
  if (!S.categories.includes(FUEL)) S.categories.push(FUEL);
  const n = new Date(),
    t: Tx = {
      id: uid(),
      amount: Math.round(amt * 100) / 100,
      category: FUEL,
      accountId: a ? a.id : 'cash',
      method: a ? fuel.method : ('cash' as const),
      date: dateKey(n),
      time: timeKey(n),
      note: '',
      recurringId: '',
      vehicleId: v.id,
    };
  if (odo) t.odo = odo;
  if (litres) t.litres = litres;
  S.tx.push(t);
  save();
  remember(a);
  const b = a ? billSoFar(a.id) : null;
  toast(
    'Fuel ' +
      money(t.amount) +
      ' · ' +
      v.name +
      ' · ' +
      payLabel(t) +
      (open && km ? ' · ' + kmpl(km / open.litres) : '') +
      (b ? ' · bill so far ' + money(b.sum) : ''),
  );
  fuel.amount = '';
  fuel.odo = '';
  fuel.litres = '';
  refreshFuel();
  const rec = el('#recent');
  if (rec) rec.innerHTML = recentHTML(!reduceMotion());
  morphSaved('#fuel-save', fuelBtnLabel);
  budgetWarn(t);
  const i = el('#fuel-amount');
  if (i) i.focus();
}
export function refreshSuggest() {
  const s = el('#note-suggest');
  if (s) s.innerHTML = noteSuggestHTML();
}
export function applySuggestion(note: string) {
  const s = noteStats().find(x => x.key === norm(note));
  if (!s) return;
  form.note = s.note;
  const ni = el('#f-note');
  if (ni) ni.value = s.note;
  const parts: string[] = [];
  if (S.categories.includes(s.category)) {
    form.category = s.category;
    parts.push(s.category);
    document
      .querySelectorAll<HTMLElement>('#cat-chips .chip')
      .forEach(c => c.classList.toggle('on', c.dataset.cat === s.category));
  }
  const a = acct(s.accountId);
  if (s.method === 'cash') {
    form.method = 'cash';
    form.accountId = 'cash';
    parts.push('Cash');
  } else if (a && !a.archived) {
    form.method = acctTypeOf(s.method) === a.type ? s.method : a.type;
    form.accountId = a.id;
    remember(a);
    parts.push(a.name);
  }
  refreshPay();
  refreshSuggest();
  toast('Filled like last time · ' + parts.join(' · '));
  const ai = el('#f-amount');
  if (ai && !form.amount) ai.focus();
}
export function saveTx() {
  const amt = parseAmt(form.amount);
  if (!(amt > 0)) {
    toast('Enter an amount');
    const i = el('#f-amount');
    if (i) i.focus();
    return;
  }
  if (!form.category) {
    toast('Pick a category');
    return;
  }
  const method = form.method;
  if (method !== 'cash' && !acct(form.accountId)) {
    toast(chooseMsg(method));
    return;
  }
  const n = new Date();
  let date, time;
  if (form.backdate) {
    date = form.date || dateKey(n);
    time = form.time || timeKey(n);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast('Pick a valid date');
      return;
    }
    if (date > today()) {
      toast('The date cannot be in the future');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) time = '';
  } else {
    date = dateKey(n);
    time = timeKey(n);
  }
  const t = {
    id: uid(),
    amount: Math.round(amt * 100) / 100,
    category: form.category,
    accountId: method === 'cash' ? 'cash' : form.accountId,
    method,
    date,
    time,
    note: form.note.trim(),
    recurringId: '',
    vehicleId: '',
  };
  S.tx.push(t);
  save();
  remember(acct(t.accountId));
  if (method !== 'cash') form.lastOnline = method;
  toast(
    'Saved ' +
      money(t.amount) +
      ' · ' +
      t.category +
      ' · ' +
      payLabel(t) +
      (form.backdate ? ' · ' + shortDate(date) : ''),
  );
  budgetWarn(t);
  form.amount = '';
  form.note = '';
  if (form.backdate) {
    form.backdate = false;
    form.date = '';
    form.time = '';
    const bd = el('#backdate'),
      tb = el('#toggle-backdate');
    if (bd) bd.hidden = true;
    if (tb) tb.textContent = 'Logging something from earlier? Change date or time';
  }
  const ai = el('#f-amount'),
    ni = el('#f-note'),
    rec = el('#recent');
  if (ai) ai.value = '';
  if (ni) ni.value = '';
  if (rec) rec.innerHTML = recentHTML(!reduceMotion());
  morphSaved('#save-tx', () => 'Save expense');
  refreshPay();
  refreshSuggest();
  if (ai) ai.focus();
}
