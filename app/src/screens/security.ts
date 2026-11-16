/* Settings → Security: PIN set/change/remove and Face ID enrolment over the wrapped master key. */
import { bioTitle, el } from '../lib/constants';
import {
  b64,
  newMaster,
  pinOn,
  faceSupported,
  pinWrapFor,
  prfKey,
  rnd,
  unwrapWithPin,
  vault,
  wrapMaster,
} from '../data/crypto';
import { S, flushWrites, queueWrite, recodeStorage, save } from '../data/storage';
import { toast } from '../ui/toast';
import { render } from '../ui/render';
import { closeSheet } from './sheets';

export async function pinOk(pin: string) {
  return !!(vault.wraps.pin && (await unwrapWithPin(pin, vault.wraps.pin)));
}
export async function savePin(mode: string) {
  const v = (id: string) => {
    const i = el(id);
    return i ? String(i.value || '').trim() : '';
  };
  if (!(window.crypto && crypto.subtle)) {
    toast('Encryption needs the app to be opened from an https address');
    return;
  }
  if (mode !== 'set' && !(await pinOk(v('#p-cur')))) {
    toast('Current PIN is wrong');
    const i = el('#p-cur');
    if (i) {
      i.value = '';
      i.focus();
    }
    return;
  }
  let n = '';
  if (mode !== 'remove') {
    n = v('#p-new');
    if (!/^\d{4}$/.test(n)) {
      toast('The PIN must be exactly 4 digits');
      return;
    }
    if (n !== v('#p-new2')) {
      toast('The two PINs do not match');
      const i = el('#p-new2');
      if (i) {
        i.value = '';
        i.focus();
      }
      return;
    }
  }
  if (mode === 'set') {
    await newMaster();
    vault.wraps = { pin: await pinWrapFor(n), face: null };
    queueWrite(() => recodeStorage(null));
  } else if (mode === 'change') {
    vault.wraps.pin = await pinWrapFor(n);
  } else {
    const oldKey = vault.masterKey;
    vault.masterKey = null;
    vault.masterRaw = null;
    vault.wraps = { pin: null, face: null };
    queueWrite(() => recodeStorage(oldKey));
  }
  save();
  await flushWrites();
  closeSheet();
  render(false);
  toast(mode === 'set' ? 'PIN turned on · ledger encrypted' : mode === 'change' ? 'PIN changed' : 'PIN removed');
}
export async function faceEnrol() {
  if (!pinOn()) {
    toast('Set a PIN first; it stays as the fallback');
    return;
  }
  if (!faceSupported()) {
    toast(bioTitle() + ' unlock needs the app opened from its https address on a phone');
    return;
  }
  const salt = rnd(32),
    challenge = rnd(32);
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Money tracker', id: location.hostname },
        // One ledger per origin, so one fixed user id: re-enrolling replaces the passkey instead of adding a second one.
        user: {
          id: new TextEncoder().encode('money-tracker'),
          name: 'money-tracker',
          displayName: S.profile.firstName || 'Money tracker',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60000,
        extensions: { prf: { eval: { first: salt } } },
      },
    })) as PublicKeyCredential;
    let prf = (cred.getClientExtensionResults().prf || {}).results;
    if (!prf || !prf.first) {
      // Safari evaluates PRF only on assertion, so ask once more; this costs a second Face ID prompt.
      const a = (await navigator.credentials.get({
        publicKey: {
          challenge: rnd(32),
          rpId: location.hostname,
          allowCredentials: [{ id: cred.rawId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
          extensions: { prf: { eval: { first: salt } } },
        },
      })) as PublicKeyCredential;
      prf = (a.getClientExtensionResults().prf || {}).results;
    }
    if (!prf || !prf.first) {
      toast(
        'This phone cannot derive a key from its passkey yet (needs iOS 18 or later, or a recent Chrome on Android)',
      );
      return;
    }
    const w = await wrapMaster(await prfKey(prf.first));
    vault.wraps.face = { id: b64(cred.rawId), salt: b64(salt), iv: w.iv, ct: w.ct };
    save();
    await flushWrites();
    render(false);
    toast(bioTitle() + ' unlock is on');
  } catch (e) {
    const err = e as Error | undefined;
    if (err && err.name !== 'NotAllowedError') toast(bioTitle() + ' could not be set up: ' + (err.message || err.name));
  }
}
export function faceRemove() {
  vault.wraps.face = null;
  save();
  render(false);
  toast(bioTitle() + ' unlock is off · PIN still protects the ledger');
}
