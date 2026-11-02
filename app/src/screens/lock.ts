/* Lock screen: PIN keypad and Face ID over the encrypted store. */
import { KEY, OLD_KEY, SNAP_KEY, el } from '../lib/constants';
import { thisMonth } from '../lib/dates';
import { defaults, type Raw } from '../data/model';
import {
  decBody,
  decryptText,
  deriveKey,
  faceSupported,
  importAes,
  newMaster,
  parseBlob,
  pinOn,
  pinWrapFor,
  prfKey,
  rnd,
  unb64,
  unwrapWithPin,
  vault,
} from '../data/crypto';
import {
  S,
  flushWrites,
  parseStored,
  readStored,
  recodeStorage,
  setLedger,
  setSavedN,
  storedFace,
} from '../data/storage';
import { applyRecurring } from '../queries/recurring';
import { ui } from '../ui/state';
import { toast } from '../ui/toast';
import { applyTheme, go, render, updateClock } from '../ui/render';
import { updateBadge } from '../ui/notify';
import { closeSheet } from './sheets';
import { showWelcome } from './welcome';

export function lock() {
  ui.pinEntry = '';
  ui.unlocking = false;
  closeSheet();
  el('#pin-reset').hidden = true;
  el('#pin-forgot').hidden = false;
  drawDots();
  const f = el('#pin-face');
  f.hidden = !(storedFace() && faceSupported());
  el('#lock-sub').textContent = f.hidden ? 'Enter your PIN to continue' : 'Use Face ID or enter your PIN';
  el('#lock').hidden = false;
  document.body.classList.add('locked');
}
export function unlock() {
  el('#lock').hidden = true;
  document.body.classList.remove('locked');
  ui.pinEntry = '';
}
export function drawDots() {
  el('#pin-dots')
    .querySelectorAll('i')
    .forEach((d, i) => d.classList.toggle('on', i < ui.pinEntry.length));
}
export function shakePin(msg: string) {
  const d = el('#pin-dots');
  d.classList.add('shake');
  setTimeout(() => {
    d.classList.remove('shake');
    ui.pinEntry = '';
    drawDots();
  }, 360);
  toast(msg);
}
export async function finishUnlock(json: string, o: Raw) {
  vault.wraps = { pin: o.pin || null, face: o.face || null };
  setLedger(parseStored(json));
  setSavedN(S.tx.length);
  unlock();
  if (vault.lockedBlob) {
    vault.lockedBlob = false;
    applyTheme();
    applyRecurring();
    render(true);
    if (!S.profile.firstName) showWelcome();
  }
}
export async function tryUnlock(pin: string) {
  ui.unlocking = true;
  await flushWrites();
  const raw = readStored(),
    o = parseBlob(raw);
  let json: string | null = null;
  try {
    if (o && o.enc === 2 && o.pin) {
      const mr = await unwrapWithPin(pin, o.pin);
      if (mr) {
        vault.masterRaw = mr;
        vault.masterKey = await importAes(mr);
        json = await decryptText(raw, vault.masterKey);
      }
    } else if (o && o.enc === 1 && o.salt) {
      const legacy = await deriveKey(pin, unb64(o.salt));
      json = await decryptText(raw, legacy);
      await newMaster();
      vault.wraps = { pin: await pinWrapFor(pin), face: null };
      await recodeStorage(legacy);
    }
  } catch (e) {
    json = null;
  }
  ui.unlocking = false;
  if (json == null) {
    vault.masterKey = null;
    vault.masterRaw = null;
    shakePin('Wrong PIN');
    return;
  }
  await finishUnlock(json, parseBlob(readStored()) || {});
}
export async function tryFaceUnlock() {
  const raw = readStored(),
    o = parseBlob(raw);
  if (!(o && o.enc === 2 && o.face)) return;
  ui.unlocking = true;
  try {
    const a = (await navigator.credentials.get({
      publicKey: {
        challenge: rnd(32),
        rpId: location.hostname,
        allowCredentials: [{ id: unb64(o.face.id), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
        extensions: { prf: { eval: { first: unb64(o.face.salt) } } },
      },
    })) as PublicKeyCredential;
    const prf = (a.getClientExtensionResults().prf || {}).results;
    if (!prf || !prf.first) throw new Error('no-prf');
    const mr = await decBody(o.face, await prfKey(prf.first));
    vault.masterRaw = mr;
    vault.masterKey = await importAes(mr);
    const json = await decryptText(raw, vault.masterKey);
    ui.unlocking = false;
    await finishUnlock(json, o);
  } catch (e) {
    ui.unlocking = false;
    vault.masterKey = null;
    vault.masterRaw = null;
    if (e && (e as Error).name !== 'NotAllowedError') toast('Face ID did not unlock · use your PIN');
  }
}
/** Erase everything from the lock screen (forgotten PIN) and start over at the welcome screen. */
export function eraseAll() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
    localStorage.removeItem(SNAP_KEY);
  } catch (e) {
    /* nothing to remove */
  }
  setLedger(defaults());
  setSavedN(0);
  vault.masterKey = null;
  vault.masterRaw = null;
  vault.wraps = { pin: null, face: null };
  vault.lockedBlob = false;
  unlock();
  ui.period = thisMonth();
  go('dashboard');
  showWelcome();
  toast('Everything was erased. Restore a backup from Settings.');
}

export function bindLock() {
  el('#keypad').addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-key]');
    if (!b || ui.unlocking) return;
    const k = b.dataset.key ?? '';
    if (k === 'del') ui.pinEntry = ui.pinEntry.slice(0, -1);
    else if (ui.pinEntry.length < 4) ui.pinEntry += k;
    drawDots();
    if (ui.pinEntry.length === 4) tryUnlock(ui.pinEntry);
  });
  el('#pin-face').addEventListener('click', () => {
    if (!ui.unlocking) tryFaceUnlock();
  });
  el('#pin-forgot').addEventListener('click', () => {
    el('#pin-reset').hidden = false;
    el('#pin-forgot').hidden = true;
  });
  el('#pin-erase-cancel').addEventListener('click', () => {
    el('#pin-reset').hidden = true;
    el('#pin-forgot').hidden = false;
  });
  el('#pin-erase').addEventListener('click', eraseAll);
  document.addEventListener('keydown', e => {
    if (el('#lock').hidden) return;
    if (/^\d$/.test(e.key)) {
      const b = el('#keypad [data-key="' + e.key + '"]');
      if (b) b.click();
    } else if (e.key === 'Backspace') {
      el('#keypad [data-key="del"]').click();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ui.hiddenAt = Date.now();
      updateBadge();
      return;
    }
    if (pinOn() && ui.hiddenAt && Date.now() - ui.hiddenAt > 60000) lock();
    ui.hiddenAt = 0;
    if (applyRecurring()) render(false);
    updateClock();
  });
}
