/*
 * The ledger lives as one JSON string under localStorage[KEY]. Every write goes through a queue
 * because encryption is async; save() serialises synchronously, the queue encrypts (if a PIN is on),
 * keeps a daily snapshot of the previous stored value, then writes.
 */
import { APP_VERSION, KEY, OLD_KEY, SNAP_KEY, SNAPS } from '../lib/constants';
import { today } from '../lib/dates';
import { toast } from '../ui/toast';
import {
  decryptText,
  encryptText,
  isEncrypted,
  isEncryptedBlob,
  packStore,
  parseBlob,
  requireKey,
  vault,
  type FaceWrap,
} from './crypto';
import { defaults, migrate, type Ledger } from './model';

/** The ledger. Read it anywhere; replace it only through setLedger() so every module sees the new object. */
export let S: Ledger = defaults();
/** Goes up on every save() and setLedger(), so a cache keyed on it goes stale exactly when the ledger changes. */
export let saves = 0;
export function setLedger(d: Ledger) {
  S = d;
  saves++;
}

export function readStored() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      raw = localStorage.getItem(OLD_KEY);
      if (raw) localStorage.setItem(KEY, raw);
    }
    return raw || '';
  } catch (e) {
    return '';
  }
}
export function parseStored(raw: string): Ledger {
  try {
    const d = JSON.parse(raw);
    if (d && typeof d === 'object') return migrate(d);
  } catch (e) {
    /* fall through */
  }
  return defaults();
}

export interface Snapshot {
  day: string;
  raw: string;
  n: number;
}
export function snapshots(): Snapshot[] {
  try {
    const l = JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
    return Array.isArray(l)
      ? l.filter(s => s && /^\d{4}-\d{2}-\d{2}$/.test(s.day) && typeof s.raw === 'string' && typeof s.n === 'number')
      : [];
  } catch (e) {
    return [];
  }
}
/**
 * Whether the newest stored copy is from this day, read off the head of the stored string so a save
 * after the first of the day does not parse every copy to find out. Every writer puts `day` first.
 */
const hasCopyFor = (day: string) => {
  try {
    return (localStorage.getItem(SNAP_KEY) || '').startsWith('[{"day":"' + day + '"');
  } catch (e) {
    return false;
  }
};
export function keepSnapshot(raw: string, n: number) {
  const day = today();
  if (hasCopyFor(day)) return;
  const list = snapshots();
  if (list.length && list[0].day === day) return;
  list.unshift({ day, raw, n });
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, SNAPS)));
  } catch (e) {
    /* storage full or blocked; the main write will say so */
  }
}

let writeQ: Promise<unknown> = Promise.resolve(),
  savedN = 0;
export function setSavedN(n: number) {
  savedN = n;
}
/** Resolves once every queued write has finished. */
export function flushWrites() {
  return writeQ;
}
export function queueWrite(fn: () => unknown) {
  writeQ = writeQ.then(fn).catch(() => toast('Could not save. Storage is blocked in this browser.'));
}
export function save() {
  S.meta.appVersion = APP_VERSION;
  saves++;
  const json = JSON.stringify(S),
    n = S.tx.length;
  queueWrite(async () => {
    const raw = vault.masterKey ? await packStore(json) : json;
    const prev = localStorage.getItem(KEY);
    if (prev) keepSnapshot(prev, savedN);
    localStorage.setItem(KEY, raw);
    savedN = n;
  });
}
/** Re-encodes the main blob and every snapshot from oldKey (or plaintext) to the current master key (or plaintext). */
export async function recodeStorage(oldKey: CryptoKey | null) {
  const code = async (raw: string, main: boolean) => {
    const json = isEncrypted(raw) ? await decryptText(raw, requireKey(oldKey)) : raw;
    return vault.masterKey ? (main ? packStore(json) : encryptText(json, vault.masterKey)) : json;
  };
  const cur = localStorage.getItem(KEY);
  if (cur) localStorage.setItem(KEY, await code(cur, true));
  const out: Snapshot[] = [];
  for (const s of snapshots()) {
    try {
      out.push({ day: s.day, n: s.n, raw: await code(s.raw, false) });
    } catch (e) {
      /* a copy that cannot be read is dropped */
    }
  }
  localStorage.setItem(SNAP_KEY, JSON.stringify(out));
}
export const plainOf = (raw: string) =>
  !isEncrypted(raw)
    ? Promise.resolve(raw)
    : vault.masterKey
      ? decryptText(raw, vault.masterKey)
      : Promise.reject(new Error('The ledger is locked'));
export const storedFace = (): FaceWrap | null => {
  const o = parseBlob(readStored());
  return o && o.enc === 2 && o.face ? o.face : null;
};

/** Reads storage once at boot. An encrypted store leaves S at defaults until the lock screen unwraps it. */
export function loadInitial() {
  // the stored blob is parsed once: to see whether it is encrypted, and if not, as the ledger itself
  const o = parseBlob(readStored());
  vault.lockedBlob = isEncryptedBlob(o);
  S = vault.lockedBlob || !o ? defaults() : migrate(o);
  savedN = S.tx.length;
  return S;
}
