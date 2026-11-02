/*
 * Crash log: the last 50 errors the page raised, kept on this phone only, for Settings → Report a
 * problem. Entries hold the error message, a trimmed stack and which screen was open; never any
 * ledger data. Nothing is sent anywhere unless the user copies or emails the report.
 */
import { APP_BUILD, APP_VERSION, ERR_KEY } from './constants';

export interface ErrorEntry { at: string; msg: string; stack: string; version: string; where: string }
const MAX = 50;

export function readErrors(): ErrorEntry[] {
  try { const l = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); return Array.isArray(l) ? l.filter(e => e && typeof e.msg === 'string') : []; } catch (e) { return []; }
}
export function recordError(msg: unknown, stack?: unknown, where?: string) {
  const entry: ErrorEntry = { at: new Date().toISOString(), msg: String(msg || 'Unknown error').slice(0, 300), stack: String(stack || '').split('\n').slice(0, 6).join('\n').slice(0, 800), version: APP_VERSION, where: where || '' };
  try { const list = readErrors(); list.unshift(entry); localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) { /* storage blocked: the log is best effort */ }
  return entry;
}
export function clearErrors() { try { localStorage.removeItem(ERR_KEY); } catch (e) { /* ignore */ } }
export function installErrorLog() {
  const where = () => { try { return location.hash || '#'; } catch (e) { return ''; } };
  window.addEventListener('error', e => { recordError(e.message, e.error && e.error.stack, where()); });
  window.addEventListener('unhandledrejection', e => { const r: any = e.reason; recordError(r && r.message ? r.message : String(r), r && r.stack, where()); });
}
/** The text behind "Copy report": device facts plus the last ten errors. */
export function problemReport() {
  const n = navigator;
  const lines = [
    'Money tracker ' + APP_VERSION + ' (built ' + APP_BUILD + ')',
    'Reported ' + new Date().toISOString(),
    'Browser: ' + n.userAgent,
    'Installed app: ' + (n.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ? 'yes' : 'no'),
    'Screen: ' + screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1),
    'Language: ' + n.language,
    '',
  ];
  const errs = readErrors().slice(0, 10);
  lines.push(errs.length ? 'Last ' + errs.length + ' error' + (errs.length === 1 ? '' : 's') + ':' : 'No errors recorded.');
  errs.forEach((e, i) => { lines.push('', (i + 1) + '. ' + e.at + ' · v' + e.version + (e.where ? ' · ' + e.where : ''), e.msg); if (e.stack) lines.push(e.stack); });
  return lines.join('\n');
}
