import { beforeEach, describe, expect, it } from 'vitest';
import { APP_VERSION, KEY, OLD_KEY, SNAP_KEY } from '../../src/lib/constants';
import {
  b64,
  decryptText,
  deriveKey,
  encryptText,
  isEncrypted,
  newMaster,
  packStore,
  parseBlob,
  pinWrapFor,
  rnd,
  unb64,
  unwrapWithPin,
  vault,
} from '../../src/data/crypto';
import { S, flushWrites, loadInitial, recodeStorage, save, snapshots } from '../../src/data/storage';
import backup from '../fixtures/backup-1.8.0.json';
import oldBackup from '../fixtures/backup-rupee-ledger.json';

const resetVault = () => {
  vault.masterKey = null;
  vault.masterRaw = null;
  vault.wraps = { pin: null, face: null };
  vault.lockedBlob = false;
};

describe('master key wrapping', () => {
  beforeEach(resetVault);
  it('wraps the master key with the PIN and only the right PIN unwraps it', async () => {
    await newMaster();
    const w = await pinWrapFor('1234');
    expect(w.salt).toBeTruthy();
    expect(w.iv).toBeTruthy();
    expect(w.ct).toBeTruthy();
    const mr = await unwrapWithPin('1234', w);
    expect(mr && b64(mr)).toBe(b64(vault.masterRaw!));
    expect(await unwrapWithPin('0000', w)).toBeNull();
  });
  it('packs the ledger as an enc:2 blob that decrypts under the master key', async () => {
    await newMaster();
    vault.wraps = { pin: await pinWrapFor('1234'), face: null };
    const blob = await packStore('{"a":1}');
    const o = parseBlob(blob)!;
    expect(o.enc).toBe(2);
    expect(o.pin).toEqual(vault.wraps.pin);
    expect(o.face).toBeUndefined();
    expect(isEncrypted(blob)).toBe(true);
    expect(await decryptText(blob, vault.masterKey!)).toBe('{"a":1}');
    expect(isEncrypted('{"tx":[]}')).toBe(false);
  });
  it('still reads a pre-1.8 blob encrypted directly with the PIN key', async () => {
    const salt = rnd(16);
    const legacy = await deriveKey('4321', salt);
    const raw = JSON.stringify({ ...parseBlob(await encryptText('{"b":2}', legacy)), salt: b64(salt) });
    const o = parseBlob(raw)!;
    expect(o.enc).toBe(1);
    expect(o.salt).toBeTruthy();
    expect(await decryptText(raw, await deriveKey('4321', unb64(o.salt)))).toBe('{"b":2}');
    await expect(decryptText(raw, await deriveKey('9999', unb64(o.salt)))).rejects.toBeDefined();
  });
});

describe('storage', () => {
  beforeEach(resetVault);
  it('loads a plain ledger through migrate', () => {
    localStorage.setItem(KEY, JSON.stringify(backup));
    const s = loadInitial();
    expect(s).toBe(S);
    expect(S.tx).toHaveLength(7);
    expect(vault.lockedBlob).toBe(false);
  });
  it('migrates the old rupee-ledger key once', () => {
    localStorage.setItem(OLD_KEY, JSON.stringify(oldBackup));
    loadInitial();
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(oldBackup));
    expect(S.categories).toContain('Fuel');
    expect(S.profile.firstName).toBe('Priya');
  });
  it('save() stamps the version, writes JSON and keeps one snapshot a day', async () => {
    localStorage.setItem(KEY, JSON.stringify(backup));
    loadInitial();
    S.tx.push({
      id: 'n1',
      amount: 10,
      category: 'Food',
      accountId: 'cash',
      method: 'cash',
      date: '2026-10-30',
      time: '10:00',
      note: '',
      recurringId: '',
      vehicleId: '',
    });
    save();
    await flushWrites();
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.meta.appVersion).toBe(APP_VERSION);
    expect(stored.tx).toHaveLength(8);
    expect(stored.pin).toBeUndefined();
    expect(snapshots()).toHaveLength(1);
    expect(snapshots()[0].n).toBe(7);
    expect(JSON.parse(snapshots()[0].raw).tx).toHaveLength(8);
    save();
    await flushWrites();
    expect(snapshots()).toHaveLength(1);
  });
  it('leaves an encrypted store locked until the PIN unwraps it', async () => {
    await newMaster();
    vault.wraps = { pin: await pinWrapFor('1234'), face: null };
    localStorage.setItem(KEY, await packStore(JSON.stringify(backup)));
    resetVault();
    loadInitial();
    expect(vault.lockedBlob).toBe(true);
    expect(S.tx).toEqual([]);
  });
  it('recodes the store and its snapshots when a PIN is set and removed', async () => {
    localStorage.setItem(KEY, JSON.stringify(backup));
    localStorage.setItem(SNAP_KEY, JSON.stringify([{ day: '2026-10-29', raw: JSON.stringify(oldBackup), n: 3 }]));
    loadInitial();
    await newMaster();
    vault.wraps = { pin: await pinWrapFor('1234'), face: null };
    await recodeStorage(null);
    expect(isEncrypted(localStorage.getItem(KEY)!)).toBe(true);
    const snap = snapshots()[0];
    expect(parseBlob(snap.raw)!.enc).toBe(1);
    expect(JSON.parse(await decryptText(snap.raw, vault.masterKey!)).profile.firstName).toBe('Priya');
    const old = vault.masterKey;
    vault.masterKey = null;
    vault.masterRaw = null;
    vault.wraps = { pin: null, face: null };
    await recodeStorage(old);
    expect(isEncrypted(localStorage.getItem(KEY)!)).toBe(false);
    // recoding works on the stored text, so the round trip is byte-for-byte lossless
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(backup));
    expect(JSON.parse(snapshots()[0].raw).profile.firstName).toBe('Priya');
  });
});
