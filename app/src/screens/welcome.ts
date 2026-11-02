/* First run: asks for a name, and on iPhone shows the Add to Home Screen steps. */
import { el, greetingWord, needsInstall } from '../lib/constants';
import { thisMonth } from '../lib/dates';
import { S, save } from '../data/storage';
import { ui } from '../ui/state';
import { toast } from '../ui/toast';
import { render } from '../ui/render';
import { installStepsHTML } from '../ui/shared';
import { openSheet } from './sheets';

export function showWelcome() {
  const w = el('#welcome'),
    wi = el('#w-install');
  wi.hidden = !needsInstall();
  if (!wi.hidden) wi.innerHTML = '<h2>Add to your Home Screen first</h2>' + installStepsHTML();
  w.hidden = false;
  w.scrollTop = 0;
  document.body.classList.add('locked');
}
export function finishWelcome() {
  const first = String(el('#w-first').value || '')
      .trim()
      .slice(0, 30),
    last = String(el('#w-last').value || '')
      .trim()
      .slice(0, 30);
  if (!first) {
    toast('Please enter your first name');
    el('#w-first').focus();
    return;
  }
  S.profile = { firstName: first, lastName: last };
  save();
  el('#welcome').hidden = true;
  document.body.classList.remove('locked');
  ui.period = thisMonth();
  ui.view = 'dashboard';
  try {
    location.hash = 'dashboard';
  } catch (e) {
    /* sandboxed frame */
  }
  render(true);
  toast(greetingWord() + ', ' + first + '! You are all set.');
}
export function bindWelcome() {
  el('#w-go').addEventListener('click', finishWelcome);
  el('#welcome').addEventListener('click', e => {
    const detail = (e.target as HTMLElement).closest<HTMLElement>('[data-detail]')?.dataset.detail;
    if (detail !== undefined) {
      el('#sheet').classList.add('over');
      openSheet(detail);
    }
  });
  el('#welcome').addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && /^w-/.test(t.id || '')) {
      e.preventDefault();
      if (t.id === 'w-first') el('#w-last').focus();
      else finishWelcome();
    }
  });
}
