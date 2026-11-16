import { save } from '../data/storage';
import { render } from '../ui/render';
import { offerUndo, toast } from '../ui/toast';
import { readErrors } from '../lib/errors';
import { SUPPORT_EMAIL } from '../lib/constants';
import { S, snapshots } from '../data/storage';
import { billSoFar, catColor, initials, payLabel } from '../queries/ledger';
import { APP_BUILD, APP_VERSION, SNAPS, bioName, bioTitle, esc, isIOS, ordinal } from '../lib/constants';
import { dateKey, dm, midDate, money, monthLabel, thisMonth } from '../lib/dates';
import { canDownload, canShareFiles, ui } from '../ui/state';
import { recurLabel } from '../queries/recurring';
import { ADD_BTN } from '../ui/render';
import { faceOn, faceSupported, pinOn } from '../data/crypto';
import { BANK_ENTRIES, CARD_ENTRIES } from '../lib/directory';
import { CAT_ICON, SEARCH_SVG, glyph } from '../lib/icons';
import { cashBalance } from '../queries/cash';
import { FUEL } from '../data/model';
import { vehInputHTML } from './add';
import { catIcon, installHint } from '../ui/shared';
import { budgetRows, budgetText } from '../queries/budgets';
import { notifyState, recurAlertsState } from '../ui/notify';
/* ---------- SETTINGS ---------- */
export function rSettings() {
  const list = (type: 'bank' | 'card') => {
    const rows = S.accounts.filter(a => a.type === type);
    if (!rows.length) return `<div class="hint">None yet. Pick one while adding an expense and it appears here.</div>`;
    return rows
      .map(a => {
        const n = S.tx.filter(t => t.accountId === a.id).length;
        const bill = type === 'card' ? billSoFar(a.id) : null;
        return `<div class="item" style="flex-wrap:wrap"><span class="name"${type === 'card' ? ' style="flex-basis:100%"' : ''}>${esc(a.name)}<span class="small">${n ? n + ' expense' + (n === 1 ? '' : 's') : 'No expenses'}${a.archived ? ' · hidden from Add' : ''}${bill ? ' · this bill so far ' + money(bill.sum) + ' (' + dm(bill.from) + ' – ' + dm(bill.to) + ')' : ''}</span></span>
        ${type === 'card' ? `<select class="sm" data-stmt="${a.id}" aria-label="Statement day for ${esc(a.name)}"><option value="">Statement day: not set</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${a.statementDay === i + 1 ? 'selected' : ''}>Statement on the ${ordinal(i + 1)}</option>`).join('')}</select><span class="row" style="flex:1;justify-content:flex-end">` : ''}
        ${
          ui.pending === 'acct:' + a.id
            ? `<span class="confirm">Delete? <button type="button" class="btn-sm btn-danger" data-del-acct="${a.id}">Yes</button><button type="button" class="btn-sm" data-cancel>No</button></span>`
            : n
              ? `<button type="button" class="btn-ghost btn-sm" data-toggle-acct="${a.id}">${a.archived ? 'Show' : 'Hide'}</button>`
              : `<button type="button" class="btn-ghost btn-sm" data-ask="acct:${a.id}">Delete</button>`
        }${type === 'card' ? '</span>' : ''}</div>`;
      })
      .join('');
  };
  const recRows = S.recurring.length
    ? S.recurring
        .map(
          r =>
            `<button type="button" class="txrow" data-detail="recur|${r.id}"><span class="dot" style="background:${r.kind === 'income' ? 'var(--good)' : catColor(r.category)}"></span><span class="name">${esc(recurLabel(r))}${r.kind === 'income' ? '<span class="tag">in</span>' : ''}${r.active ? '' : '<span class="tag" style="background:var(--surface-2);color:var(--muted)">paused</span>'}<span class="small">${esc(r.category)} · on the ${ordinal(r.day)} · ${esc(payLabel(r))}${r.lastApplied ? ' · last added ' + esc(monthLabel(r.lastApplied)) : ''}</span></span><span class="amt">${esc(money(r.amount))}</span><span class="chev">›</span></button>`,
        )
        .join('')
    : '<div class="hint">None yet. Rent, salary, SIPs and subscriptions can be added here once and logged for you every month.</div>';
  const lastB = +(S.meta.lastBackup || 0);
  const errs = readErrors();
  const rowsNow = budgetRows(thisMonth());
  const startAdd = S.meta.startView === 'add';
  const snaps = snapshots();
  const budgeted = S.categories.filter(c => S.budgets[c] > 0),
    unbudgeted = S.categories.filter(c => !(S.budgets[c] > 0));
  const reportMonths = [...new Set([...S.tx, ...S.income].map(t => t.date.slice(0, 7)).concat([thisMonth()]))]
    .sort()
    .reverse();
  return `<div class="view"><div class="topbar"><h1>Settings</h1>${ADD_BTN}</div>
    <section class="card"><h2>Profile</h2>
      <div class="row" style="margin-top:10px"><span class="avatar" id="profile-avatar" aria-hidden="true">${esc(initials())}</span><span class="grow"><b id="profile-name">${esc((S.profile.firstName + ' ' + S.profile.lastName).trim() || 'No name yet')}</b><span class="small">The Dashboard greets you by first name.</span></span></div>
      <div class="two" style="margin-top:10px"><label class="f">First name<input type="text" data-profile="firstName" value="${esc(S.profile.firstName)}" maxlength="30" autocomplete="given-name"></label><label class="f">Last name<input type="text" data-profile="lastName" value="${esc(S.profile.lastName)}" maxlength="30" autocomplete="family-name"></label></div></section>
    <section class="card"><h2>Appearance</h2>
      <div class="seg seg3" id="theme-seg">${[
        ['system', 'Match phone'],
        ['light', 'Light'],
        ['dark', 'Dark'],
      ]
        .map(
          ([k, l]) =>
            `<button type="button" data-theme-pick="${k}" class="${(S.meta.theme || 'system') === k ? 'on' : ''}">${l}</button>`,
        )
        .join('')}</div></section>
    <section class="card"><h2>Open the app on</h2>
      <div class="seg" id="start-seg"><button type="button" data-start="dashboard" class="${startAdd ? '' : 'on'}">Dashboard</button><button type="button" data-start="add" class="${startAdd ? 'on' : ''}">Add expense</button></div>
      <div class="hint" style="margin-top:8px">Pick Add expense if logging is what you open the app for; the Dashboard stays one tap away.</div></section>
    <section class="card"><h2>Security</h2>
      <div class="kv" style="margin-top:10px"><span>${pinOn() ? 'A 4-digit PIN is asked for when the app opens and after a minute in the background. The ledger stored on this phone is encrypted with it.' : 'No PIN. Anyone with the phone unlocked can open the ledger, and it is stored unencrypted.'}</span></div>
      <div class="${pinOn() ? 'two' : ''}" style="margin-top:10px">${pinOn() ? `<button type="button" data-detail="pin|change">Change PIN</button><button type="button" data-detail="pin|remove">Remove PIN</button>` : `<button type="button" data-detail="pin|set">Set a 4-digit PIN</button>`}</div>
      ${
        pinOn()
          ? `<div class="kv" style="margin-top:12px"><span>${bioTitle()} unlock</span><b>${faceOn() ? 'On' : 'Off'}</b></div>
      ${faceSupported() ? `<button type="button" style="width:100%;margin-top:8px" data-face="${faceOn() ? 'remove' : 'enrol'}">${faceOn() ? 'Turn off ' + bioName() + ' unlock' : 'Unlock with ' + bioName()}</button><div class="hint" style="margin-top:6px">${faceOn() ? bioTitle() + ' opens the same encrypted ledger; the PIN stays as the fallback. The passkey behind it lives in your phone’s passkey store' + (isIOS() ? ' (iCloud Keychain).' : ' (Google Password Manager on Android).') : 'Creates a passkey on this phone' + (isIOS() ? ' (iOS 18 or later)' : ' (a recent Chrome on Android)') + ' whose secret unlocks the ledger. The PIN stays as the fallback.'}</div>` : `<div class="hint" style="margin-top:6px">${bioTitle()} unlock needs the app opened from its https address, ideally from the Home Screen, on ${isIOS() ? 'an iPhone with iOS 18 or later' : 'a phone with passkeys (iOS 18 or later, or a recent Chrome on Android)'}.</div>`}`
          : ''
      }</section>
    <section class="card"><h2>Bank accounts</h2><div class="list" style="margin-top:8px">${list('bank')}</div>
      <button type="button" class="picker" data-open-pick="bank" data-ctx="settings"><span class="pk"><span class="pk-l">Add a bank</span><span class="pk-v ph">Search ${BANK_ENTRIES.length} banks or add your own…</span></span>${SEARCH_SVG}</button></section>
    <section class="card"><h2>Credit cards</h2><div class="list" style="margin-top:8px">${list('card')}</div>
      <button type="button" class="picker" data-open-pick="card" data-ctx="settings"><span class="pk"><span class="pk-l">Add a credit card</span><span class="pk-v ph">Search ${CARD_ENTRIES.length} cards or add your own…</span></span>${SEARCH_SVG}</button>
      <div class="hint" style="margin-top:8px">Set each card's statement day to see "this bill so far" on the Dashboard. Anything with expenses can be hidden but not deleted, so history stays complete.</div></section>
    <section class="card"><h2>Cash in hand</h2>
      <div class="kv" style="margin-top:10px"><span>Right now</span><b>${esc(money(cashBalance()))}</b></div>
      <div class="two" style="margin-top:10px"><button type="button" data-detail="cashform|withdrawal">Log a withdrawal</button><button type="button" data-detail="cashform|adjust">Set cash in hand</button></div>
      <div class="hint" style="margin-top:8px">Log ATM withdrawals as they happen; cash spends then count against them and the Dashboard shows what should be in your wallet.</div></section>
    <section class="card"><h2>Vehicles</h2>
      <div class="chips">${S.vehicles.map(v => `<span class="chip">${glyph(CAT_ICON.transport, catColor(FUEL))}<span class="t">${esc(v.name)}</span><button type="button" class="btn-ghost btn-sm" style="padding:0 2px;min-height:0" data-del-veh="${v.id}" aria-label="Remove ${esc(v.name)}">✕</button></span>`).join('') || '<span class="hint">None yet. The Fuel card on the Add screen logs each fill against a vehicle.</span>'}</div>
      ${vehInputHTML()}
      <div class="hint" style="margin-top:8px">Removing a vehicle keeps its fills in the ledger.</div></section>
    <section class="card"><h2>Categories</h2>
      <div class="chips">${S.categories.map(c => `<span class="chip"><span class="dot" style="background:${catColor(c)}"></span><span class="t">${esc(c)}</span><button type="button" class="btn-ghost btn-sm" style="padding:0 2px;min-height:0" data-del-cat="${esc(c)}" aria-label="Remove ${esc(c)}">✕</button></span>`).join('')}</div>
      <div class="row" style="margin-top:10px"><input class="grow" id="new-cat" placeholder="New category" maxlength="24"><button type="button" id="add-cat">Add</button></div>
      <div class="hint" style="margin-top:8px">Removing a category keeps its past expenses; it just stops appearing as a chip.</div></section>
    <section class="card"><div class="card-head"><h2>Monthly budgets</h2><span class="sub">${budgeted.length ? budgeted.length + ' set' : 'None yet'}</span></div>
      ${budgeted.length ? `<div class="list">${budgeted.map(c => `<div class="item">${catIcon(c)}<span class="name">${esc(c)}<span class="small">${esc(budgetText(rowsNow.find(r => r.c === c) ?? { left: 0 }))} this month</span></span><span class="row" style="gap:4px"><span class="hint">₹</span><input class="sm" type="text" inputmode="numeric" data-budget="${esc(c)}" value="${S.budgets[c]}" aria-label="Monthly budget for ${esc(c)}" style="width:92px"><button type="button" class="btn-ghost btn-sm" data-del-budget="${esc(c)}" aria-label="Remove budget for ${esc(c)}">✕</button></span></div>`).join('')}</div>` : ''}
      ${unbudgeted.length ? `<div class="row" style="margin-top:10px;gap:6px"><select id="budget-cat" class="sm" style="flex:1;min-height:44px;font-size:15px" aria-label="Category">${unbudgeted.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><span class="row" style="gap:4px;flex:1"><span class="hint">₹</span><input id="budget-amt" type="text" inputmode="numeric" placeholder="per month" aria-label="Budget amount"></span><button type="button" id="budget-add">Add</button></div>` : '<div class="hint" style="margin-top:8px">Every category has a budget.</div>'}
      <div class="kv" style="margin-top:12px"><span>Alerts on this phone</span><b>${{ on: 'On', off: 'Off', blocked: 'Blocked in phone settings', unsupported: 'Not available here' }[notifyState()]}</b></div>
      ${notifyState() === 'on' ? '<button type="button" style="width:100%;margin-top:8px" data-alerts="off">Turn off alerts</button>' : notifyState() === 'off' ? '<button type="button" style="width:100%;margin-top:8px" data-alerts="on">Allow alerts</button>' : ''}
      <div class="hint" style="margin-top:8px">The Dashboard shows what is left, turns amber at 80% and red when a budget is exceeded. A toast warns the moment a save crosses 80%; at 90% and when a budget is exceeded the app also posts a notification (if allowed) and the Home Screen icon shows how many budgets are over.</div></section>
    <section class="card"><div class="card-head"><h2>Recurring</h2><span class="sub">Expenses and money in, added each month</span></div>
      <div class="list">${recRows}</div>
      <button type="button" style="width:100%;margin-top:10px" data-detail="recur|new">Add a recurring entry</button>
      <div class="kv" style="margin-top:12px"><span>Tell me when an entry is added</span><b>${{ on: 'On', off: 'Off', blocked: 'Blocked in phone settings', unsupported: 'Not available here' }[recurAlertsState()]}</b></div>
      ${recurAlertsState() === 'on' ? '<button type="button" style="width:100%;margin-top:8px" data-recur-alerts="off">Turn off</button>' : recurAlertsState() === 'off' ? '<button type="button" style="width:100%;margin-top:8px" data-recur-alerts="on">Notify me</button>' : ''}
      <div class="hint" style="margin-top:8px">Due entries are added when the app opens or comes back to the foreground; a toast and a notification then name each one. There is no server, so nothing arrives while the app is closed.</div></section>
    <section class="card"><h2>Backup</h2>
      <div class="kv" style="margin-top:10px"><span>Expenses stored on this device</span><b>${S.tx.length}</b></div>
      <div class="kv" style="margin-top:4px"><span>Last backup</span><b>${lastB ? esc(midDate(dateKey(new Date(lastB)))) : 'never'}</b></div>
      ${canShareFiles() ? '<button type="button" class="btn-primary" style="margin-top:10px" id="export-share">Save backup to Files</button>' : ''}
      <div class="two" style="margin-top:10px"><button type="button" id="export">Copy backup</button>${canDownload ? '<button type="button" id="export-dl">Download backup</button>' : ''}</div>
      <div class="row" style="margin-top:10px;gap:6px"><select id="pdf-month" class="sm" style="flex:1;min-height:44px;font-size:15px" aria-label="Report month">${reportMonths.map(m => `<option value="${m}">${esc(monthLabel(m))}</option>`).join('')}</select><button type="button" id="pdf-dl" data-pdf="">PDF report</button></div>
      <button type="button" style="width:100%;margin-top:10px" id="import-toggle">Restore from a backup</button>
      <div id="import-box" hidden style="margin-top:10px"><textarea id="import-text" placeholder="Paste a backup here"></textarea><div class="two" style="margin-top:8px"><input type="file" id="import-file" accept="application/json,.json" style="min-height:44px"><button type="button" id="import">Restore backup</button></div><div class="hint" style="margin-top:6px">Restoring replaces everything on this device.</div></div>
      <div class="hint" style="margin-top:8px">The backup is the full ledger as JSON; the PDF is a month's statement with a running balance, by category and paid with.${canDownload ? '' : ' Downloads are available on your own hosted copy; here, Copy and paste into Notes.'}</div>
      ${
        snaps.length
          ? `<h3>Automatic copies</h3><div class="list">${snaps
              .map(s => {
                const n = s.n;
                return `<div class="item"><span class="name">${esc(midDate(s.day))}<span class="small">As it was at the start of that day · ${n} expense${n === 1 ? '' : 's'}</span></span>${ui.pending === 'snap:' + s.day ? `<span class="confirm">Replace everything? <button type="button" class="btn-sm btn-danger" data-restore-snap="${s.day}">Yes</button><button type="button" class="btn-sm" data-cancel>No</button></span>` : `<button type="button" class="btn-ghost btn-sm" data-ask="snap:${s.day}">Restore</button>`}</div>`;
              })
              .join('')}</div>
      <div class="hint" style="margin-top:8px">The app keeps a copy of the ledger as it stood at the start of each of the last ${SNAPS} days it was used, so a bad restore or an accidental delete can be undone. These live on this phone too, so they are not a substitute for a backup.</div>`
          : ''
      }</section>
    <section class="card"><div class="card-head"><h2>Report a problem</h2><span class="sub">${errs.length ? errs.length + ' error' + (errs.length === 1 ? '' : 's') + ' logged' : 'No errors logged'}</span></div>
      <div class="hint" style="margin-top:8px">If something went wrong, copy this report and send it to whoever looks after the app. It holds the app version, your browser details and the last few errors; none of your expenses.</div>
      <div class="two" style="margin-top:10px"><button type="button" id="report-copy">Copy report</button>${SUPPORT_EMAIL ? '<button type="button" id="report-mail">Email report</button>' : ''}${errs.length ? '<button type="button" class="btn-ghost" data-clear-errors>Clear log</button>' : ''}</div></section>
    <section class="card"><h2>Danger zone</h2>
      ${ui.pending === 'wipe' ? `<div class="confirm" style="margin-top:10px">Delete every expense? <button type="button" class="btn-sm btn-danger" id="wipe">Yes, delete all</button><button type="button" class="btn-sm" data-cancel>No</button></div>` : `<button type="button" class="btn-danger" style="margin-top:10px" data-ask="wipe">Delete all expenses</button>`}</section>
    <div class="hint" style="text-align:center">Money tracker by Zestera · ${installHint()}</div>
    <div class="row" style="justify-content:center;gap:4px"><button type="button" class="btn-link btn-sm" data-detail="privacy|app">Privacy</button><span class="hint">·</span><button type="button" class="btn-link btn-sm" data-detail="terms|app">Terms</button></div>
    <div style="text-align:center;margin-top:6px"><span class="chip sm" id="version-chip"><span class="t">Version ${APP_VERSION}</span><span class="small">· ${esc(midDate(APP_BUILD))}</span></span></div></div>`;
}

/* Danger zone: delete every expense, undoable from the toast */
export function wipe() {
  const kept = { tx: S.tx, income: S.income, cashIn: S.cashIn, recurring: S.recurring.map(r => Object.assign({}, r)) };
  S.tx = [];
  S.income = [];
  S.cashIn = [];
  S.recurring.forEach(r => {
    r.lastApplied = '';
    r.since = thisMonth();
  });
  ui.pending = null;
  save();
  render(true);
  offerUndo('All expenses deleted', () => {
    S.tx = kept.tx;
    S.income = kept.income;
    S.cashIn = kept.cashIn;
    S.recurring = kept.recurring;
    save();
    render(true);
    toast('Restored ' + kept.tx.length + ' expense' + (kept.tx.length === 1 ? '' : 's'));
  });
}
