/*
 * Encryption: the ledger and its snapshots are AES-GCM under a random master key. The master key is
 * wrapped by the PIN (PBKDF2) and, optionally, by a Face ID passkey (WebAuthn PRF). Stores written
 * before 1.8 (enc:1) are encrypted directly with the PIN key and are upgraded on first unlock.
 *
 * Stored blob layouts (frozen; see HANDOFF.md §5):
 *   enc:2  {enc:2, iv, ct, pin:{salt,iv,ct}, face?:{id,salt,iv,ct}}   main ledger
 *   enc:1  {enc:1, iv, ct}                                              snapshots under the master key
 *   enc:1  {enc:1, iv, ct, salt}                                        pre-1.8 ledger under the PIN key
 */
export const ENC_ITER = 100000;

export interface EncBody { iv: string; ct: string }
export interface PinWrap extends EncBody { salt: string }
export interface FaceWrap extends EncBody { id: string; salt: string }
export interface Wraps { pin: PinWrap | null; face: FaceWrap | null }

/** In-memory key material. Nothing here is ever written to storage unwrapped. */
export const vault = {
  masterKey: null as CryptoKey | null,
  masterRaw: null as Uint8Array<ArrayBuffer> | null,
  wraps: { pin: null, face: null } as Wraps,
  /** True while an encrypted store is waiting for the PIN or Face ID. */
  lockedBlob: false,
};

/** The key a locked-only operation needs; throws rather than letting crypto fail on null. */
export function requireKey(k: CryptoKey | null) { if (!k) throw new Error('The ledger is locked'); return k; }
export const b64 = (buf: ArrayBuffer | Uint8Array) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 8192))); return btoa(s); };
export const unb64 = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));
export const rnd = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const parseBlob = (raw: string): any => { try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
export const isEncrypted = (raw: string) => { const o = parseBlob(raw); return !!(o && (o.enc === 1 || o.enc === 2) && o.iv && o.ct); };
export const importAes = (raw: BufferSource) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function deriveKey(pin: string, salt: BufferSource) { const base = await crypto.subtle.importKey('raw', new TextEncoder().encode('money-tracker:' + pin), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ENC_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function prfKey(prf: BufferSource) { const base = await crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('money-tracker:face') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
export async function encBody(bytes: BufferSource, key: CryptoKey): Promise<EncBody> { const iv = rnd(12); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes); return { iv: b64(iv), ct: b64(ct) }; }
export async function decBody(o: EncBody, key: CryptoKey) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct))); }
export async function encryptText(text: string, key: CryptoKey) { return JSON.stringify(Object.assign({ enc: 1 }, await encBody(new TextEncoder().encode(text), key))); }
export async function decryptText(raw: string, key: CryptoKey) { return new TextDecoder().decode(await decBody(parseBlob(raw), key)); }
/** The main ledger blob: ciphertext plus both wrappers of the master key. */
export async function packStore(json: string) { return JSON.stringify(Object.assign({ enc: 2, pin: vault.wraps.pin, face: vault.wraps.face || undefined }, await encBody(new TextEncoder().encode(json), requireKey(vault.masterKey)))); }
export async function wrapMaster(kek: CryptoKey) { if (!vault.masterRaw) throw new Error('No master key to wrap'); return encBody(vault.masterRaw, kek); }
export const pinOn = () => !!vault.masterKey;
export const faceOn = () => !!vault.wraps.face;
export const faceSupported = () => { try { return !!(window.PublicKeyCredential && isSecureContext && location.hostname); } catch (e) { return false; } };
export async function newMaster() { vault.masterRaw = rnd(32); vault.masterKey = await importAes(vault.masterRaw); }
export async function pinWrapFor(pin: string): Promise<PinWrap> { const salt = rnd(16); const w = await wrapMaster(await deriveKey(pin, salt)); return { salt: b64(salt), iv: w.iv, ct: w.ct }; }
export async function unwrapWithPin(pin: string, w: PinWrap) { try { return await decBody(w, await deriveKey(pin, unb64(w.salt))); } catch (e) { return null; } }
