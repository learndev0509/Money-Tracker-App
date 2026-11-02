import { el } from '../lib/constants';
import { ui } from './state';

export interface ToastAction {
  label: string;
  fn: () => void;
}
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, action?: ToastAction | null, tone?: 'warn', ms = action ? 6000 : 2400) {
  const t = el('#toast'),
    tx = el('#toast-text'),
    b = el('#toast-btn');
  tx.textContent = msg;
  t.classList.toggle('warn', tone === 'warn');
  if (action) {
    b.hidden = false;
    b.textContent = action.label;
    b.onclick = () => {
      b.hidden = true;
      t.classList.remove('show', 'act');
      action.fn();
    };
    t.classList.add('act');
  } else {
    b.hidden = true;
    b.onclick = null;
    t.classList.remove('act');
  }
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    t.classList.remove('show', 'act');
    b.hidden = true;
  }, ms);
}
/** A toast with an Undo button; only the latest offer can still be taken. */
export function offerUndo(msg: string, restore: () => void) {
  const t = {};
  ui.undoToken = t;
  toast(msg, {
    label: 'Undo',
    fn: () => {
      if (ui.undoToken !== t) return;
      ui.undoToken = null;
      restore();
    },
  });
}
