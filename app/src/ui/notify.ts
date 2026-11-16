import { Tx } from '../data/model';
import { S, save } from '../data/storage';
import { toast } from './toast';
import { render } from './render';
import { vault } from '../data/crypto';
import { budgetRows } from '../queries/budgets';
import { money, pct, thisMonth } from '../lib/dates';
import { sum, txIn } from '../queries/ledger';
export const notifySupported = () => 'Notification' in window;
export const notifyState = () =>
  !notifySupported()
    ? 'unsupported'
    : Notification.permission === 'denied'
      ? 'blocked'
      : Notification.permission === 'granted' && S.meta.alerts !== false
        ? 'on'
        : 'off';
export async function setAlerts(on: boolean) {
  if (!notifySupported()) {
    toast('This browser cannot show notifications');
    return;
  }
  if (!on) {
    S.meta.alerts = false;
    save();
    render(false);
    toast('Budget alerts off');
    return;
  }
  let perm = Notification.permission;
  if (perm === 'default') {
    try {
      perm = await Notification.requestPermission();
    } catch (e) {
      perm = 'denied';
    }
  }
  if (perm !== 'granted') {
    toast('Notifications are blocked for this app in your phone’s settings');
    render(false);
    return;
  }
  delete S.meta.alerts;
  save();
  render(false);
  toast('Budget alerts on');
}
export function notify(title: string, body: string, tag: string) {
  if (notifyState() !== 'on') return;
  const o = { body, tag, icon: 'icon-180.png', badge: 'icon-180.png' };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready)
      navigator.serviceWorker.ready
        .then(r => r.showNotification(title, o))
        .catch(() => {
          try {
            new Notification(title, o);
          } catch (e) {}
        });
    else new Notification(title, o);
  } catch (e) {}
}
export function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  const n = vault.lockedBlob ? 0 : budgetRows(thisMonth()).filter(r => r.left < 0).length;
  try {
    (n ? navigator.setAppBadge!(n) : navigator.clearAppBadge!()).catch(() => {});
  } catch (e) {}
}
export function budgetWarn(t: Tx) {
  const b = S.budgets[t.category];
  if (!(b > 0)) return;
  const spent = sum(txIn(t.date.slice(0, 7)).filter(x => x.category === t.category)),
    before = spent - t.amount,
    r = spent / b,
    r0 = before / b;
  let msg = '',
    push = '';
  if (r > 1) {
    if (r0 > 1) msg = t.category + ' is ' + money(spent - b) + ' over its ' + money(b) + ' budget';
    else {
      msg = t.category + ' budget exceeded · ' + money(spent) + ' of ' + money(b);
      push = msg;
    }
  } else if (r >= 0.9 && r0 < 0.9) {
    msg = t.category + ' is at ' + pct(spent, b) + '% of its ' + money(b) + ' budget';
    push = msg;
  } else if (r >= 0.8 && r0 < 0.8) msg = t.category + ' is at ' + pct(spent, b) + '% of its ' + money(b) + ' budget';
  if (msg) setTimeout(() => toast(msg, null, 'warn'), 1400);
  if (push)
    notify(
      'Budget alert · ' + t.category,
      push + ' · ' + money(Math.max(0, b - spent)) + (spent > b ? ' over' : ' left') + ' this month',
      'budget-' + t.category,
    );
  updateBadge();
}
