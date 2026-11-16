import { Draft, ui } from '../../ui/state';
import { esc, ordinal } from '../../lib/constants';
import { CALC_BTN } from '../../lib/icons';
import { catChipsHTML, payBlockHTML, srcChipsHTML } from '../../ui/pay';
import { addMonths, daysInMonth, money, monthLabel, thisMonth, today } from '../../lib/dates';
import { cashBalance } from '../../queries/cash';
import { parseAmt } from '../../lib/calc';
/* The three edit forms the sheets share: expense/recurring, money in, cash. */
export function editFormHTML(st: Draft, ctx: string) {
  const isRec = ctx === 'recur',
    isInc = isRec && st.kind === 'income';
  return `<div class="form">
    ${isRec ? `<div class="seg"><button type="button" data-kind="expense" class="${isInc ? '' : 'on'}">Expense</button><button type="button" data-kind="income" class="${isInc ? 'on' : ''}">Money in</button></div>` : ''}
    <div class="amount-in"><span class="cur">₹</span><input id="e-amount" type="text" inputmode="decimal" placeholder="0" value="${esc(st.amount === '' ? '' : st.amount)}" aria-label="Amount" autocomplete="off">${CALC_BTN('sheet')}</div>
    <div><h2>${isInc ? 'From' : 'Category'}</h2><div class="chips">${isInc ? srcChipsHTML(st.category) : catChipsHTML(st.category)}</div></div>
    <div>${payBlockHTML(st, ctx, isInc ? 'in' : undefined)}</div>
    ${
      isRec
        ? `<label class="f">Day of the month<select id="e-day">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${st.day === i + 1 ? 'selected' : ''}>${ordinal(i + 1)}${i + 1 > 28 ? ' (or the last day of shorter months)' : ''}</option>`).join('')}</select></label>`
        : `<div class="two"><label class="f">Date<input id="e-date" type="date" value="${esc(st.date)}" max="${today()}"></label><label class="f">Time<input id="e-time" type="time" value="${esc(st.time)}"></label></div>`
    }
    ${
      ctx === 'edit' && st.vehicleId
        ? `<div class="two"><label class="f">Odometer (km, optional)<input id="e-odo" type="text" inputmode="decimal" value="${esc(st.odoIn || '')}" maxlength="9" autocomplete="off"></label><label class="f">Litres (optional)<input id="e-litres" type="text" inputmode="decimal" value="${esc(st.litresIn || '')}" maxlength="7" autocomplete="off"></label></div>
    `
        : ''
    }<label class="f">Note${isRec ? ' (shown as the name)' : ' (optional)'}<input id="e-note" type="text" value="${esc(st.note)}" placeholder="${isInc ? 'e.g. Salary, SIP payout' : isRec ? 'e.g. Rent, Netflix, SIP' : 'e.g. Swiggy, petrol, chai'}" maxlength="60"></label>
    ${isRec && !st.id ? `<label class="f">Start<select id="e-since"><option value="this" ${st.since === 'this' ? 'selected' : ''}>This month (${esc(monthLabel(thisMonth()))})${Math.min(st.day ?? 1, daysInMonth(thisMonth())) <= +today().slice(8, 10) ? ' · added right away' : ''}</option><option value="next" ${st.since === 'next' ? 'selected' : ''}>Next month (${esc(monthLabel(addMonths(thisMonth(), 1)))})</option></select></label>` : ''}
    ${isRec && st.id ? `<label class="f">Status<select id="e-active"><option value="1" ${st.active ? 'selected' : ''}>Active · adds every month</option><option value="0" ${st.active ? '' : 'selected'}>Paused</option></select></label>` : ''}
    <button type="button" class="btn-primary" data-save-${ctx}>${isRec ? (st.id ? 'Save changes' : isInc ? 'Add recurring income' : 'Add recurring expense') : 'Save changes'}</button>
    ${isRec && st.id ? (ui.pending === 'rec:' + st.id ? `<div class="confirm">Delete this recurring entry? Past entries stay. <button type="button" class="btn-sm btn-danger" data-del-rec="${st.id}">Yes, delete</button><button type="button" class="btn-sm" data-cancel>No</button></div>` : `<button type="button" class="btn-danger" data-ask="rec:${st.id}">Delete recurring entry</button>`) : ''}
    <button type="button" data-back>Cancel</button>
  </div>`;
}
export function incomeFormHTML(st: Draft) {
  return `<div class="form">
    <div class="amount-in"><span class="cur">₹</span><input id="e-amount" type="text" inputmode="decimal" placeholder="0" value="${esc(st.amount)}" aria-label="Amount" autocomplete="off">${CALC_BTN('sheet')}</div>
    <div><h2>From</h2><div class="chips">${srcChipsHTML(st.category)}</div></div>
    <div>${payBlockHTML(st, 'income', 'in')}</div>
    <div class="two"><label class="f">Date<input id="e-date" type="date" value="${esc(st.date)}" max="${today()}"></label><label class="f">Time<input id="e-time" type="time" value="${esc(st.time)}"></label></div>
    <label class="f">Note (optional)<input id="e-note" type="text" value="${esc(st.note)}" placeholder="e.g. October salary, Diwali bonus" maxlength="60"></label>
    <button type="button" class="btn-primary" data-save-income>${st.id ? 'Save changes' : 'Add money in'}</button>
    <button type="button" data-back>Cancel</button>
  </div>`;
}
/** What saving "Add cash in hand" will do, in words: it adds to the cash already there. */
export function cashEffect(st: Draft) {
  const now = cashBalance(),
    amt = parseAmt(st.amount);
  return amt > 0
    ? 'Adds to the ' + money(now) + ' in hand: ' + money(now + amt) + ' after this.'
    : 'Adds to the ' + money(now) + ' in hand. Enter cash you were given or already had.';
}
export function cashFormHTML(st: Draft) {
  const isAdj = st.kind === 'adjust';
  return `<div class="form">
    <div class="amount-in"><span class="cur">₹</span><input id="e-amount" type="text" inputmode="decimal" placeholder="0" value="${esc(st.amount)}" aria-label="Amount" autocomplete="off">${CALC_BTN('sheet')}</div>
    ${isAdj ? `<div class="hint" id="cash-effect">${esc(cashEffect(st))}</div>` : `<div>${payBlockHTML(st, 'cash', 'bank')}</div>`}
    <div class="two"><label class="f">Date<input id="e-date" type="date" value="${esc(st.date)}" max="${today()}"></label><label class="f">Time<input id="e-time" type="time" value="${esc(st.time)}"></label></div>
    <label class="f">Note (optional)<input id="e-note" type="text" value="${esc(st.note)}" placeholder="${isAdj ? 'e.g. Given by a relative' : 'e.g. ATM near office'}" maxlength="60"></label>
    <button type="button" class="btn-primary" data-save-cash>${isAdj ? 'Add cash in hand' : 'Log withdrawal'}</button>
    <button type="button" data-back>Cancel</button>
  </div>`;
}
