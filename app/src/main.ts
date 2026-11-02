/* Boot: read storage, pick the first screen, wire events, render (or lock). */
import './styles.css';
import { isView } from './lib/constants';
import { installErrorLog } from './lib/errors';
import { vault } from './data/crypto';
import { S, loadInitial } from './data/storage';
import { applyRecurring } from './queries/recurring';
import { ui } from './ui/state';
import { applyTheme, go, moveTabInd, render, updateClock } from './ui/render';
import { bindEvents } from './events';
import { bindLock, lock } from './screens/lock';
import { bindWelcome, showWelcome } from './screens/welcome';

installErrorLog();
loadInitial();

let h = '';
try {
  h = (location.hash || '').replace('#', '');
} catch (e) {
  /* no hash access */
}
ui.view = isView(h) ? h : S.meta.startView === 'add' ? 'add' : 'dashboard';

bindLock();
bindWelcome();
bindEvents();
document.querySelectorAll<HTMLElement>('nav .tab').forEach(b =>
  b.addEventListener('click', () => {
    const v = b.dataset.go;
    if (isView(v)) go(v);
  }),
);
window.addEventListener('hashchange', () => {
  let x = '';
  try {
    x = (location.hash || '').replace('#', '');
  } catch (e) {
    /* ignore */
  }
  if (isView(x) && x !== ui.view) {
    ui.view = x;
    render(true);
  }
});
try {
  navigator.storage.persist().catch(() => {
    /* not granted */
  });
} catch (e) {
  /* unsupported */
}
applyTheme();
window.addEventListener('resize', moveTabInd);
setInterval(updateClock, 15000);
if (vault.lockedBlob) lock();
else {
  applyRecurring();
  render(true);
  if (!S.profile.firstName) showWelcome();
}

if (import.meta.env.PROD) {
  try {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol))
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support is optional */
      });
  } catch (e) {
    /* ignore */
  }
}
