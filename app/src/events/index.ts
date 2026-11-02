/*
 * Event wiring. Buttons declare what they do with data-* attributes or an id; the tables in
 * main.ts and sheet.ts map those to the functions in screens/ and ui/. Adding a button means
 * adding one row to a table.
 */
import { el } from '../lib/constants';
import { closeSheet } from '../screens/sheets';
import { bindMain } from './main';
import { bindSheet } from './sheet';

export function bindEvents() {
  bindMain();
  bindSheet();
  bindSheetDrag();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el('#sheet').hidden) closeSheet();
  });
}

/** Drag the sheet down to close it (from the grab handle or the header). */
function bindSheetDrag() {
  const panel = el('#sheet-panel');
  let y0: number | null = null,
    dy = 0,
    t0 = 0;
  const start = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,input,select')) return;
    y0 = e.clientY;
    dy = 0;
    t0 = performance.now();
    panel.classList.add('drag');
    panel.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    if (y0 == null) return;
    const fast = dy / (performance.now() - t0) > 0.6;
    y0 = null;
    panel.classList.remove('drag');
    if (dy > 110 || (fast && dy > 30)) {
      panel.classList.add('out');
      setTimeout(() => {
        panel.classList.remove('out');
        panel.style.transform = '';
        closeSheet();
      }, 260);
    } else panel.style.transform = '';
  };
  ['.grab', '.panel-head'].forEach(sel => el(sel).addEventListener('pointerdown', start));
  panel.addEventListener('pointermove', move);
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
}
