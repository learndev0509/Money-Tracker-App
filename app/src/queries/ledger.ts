import { FUEL, isMethod, type Account, type AccountType, type Method, type Tx } from '../data/model';
import { S } from '../data/storage';
import { COLORS, EXTRA_COLORS, pad } from '../lib/constants';
import { today } from '../lib/dates';
/* ---------- queries: pure functions over the ledger S ---------- */

/** Anything with a date and time: expenses, income, recurring templates. */
export interface Dated { date: string; time: string; id: string }
/** Anything paid from an account: enough to know the method and the label. */
export interface Paid { method?: string; accountId: string }

export const sum = (arr: { amount: number }[]) => arr.reduce((t, x) => t + (+x.amount || 0), 0);
/** Expenses in a month, `k` = YYYY-MM. */
export const txIn = (k: string) => S.tx.filter(t => t.date.slice(0, 7) === k);
export const incIn = (k: string) => S.income.filter(t => t.date.slice(0, 7) === k);
export const isFuel = (t: Tx) => t.category === FUEL;
export const fuelIn = (k: string) => txIn(k).filter(isFuel);
export const lastFuel = (vid?: string) => S.tx.filter(t => isFuel(t) && (!vid || t.vehicleId === vid)).sort(sortTx)[0] || null;
export const vehName = (id: string) => { const v = S.vehicles.find(x => x.id === id); return v ? v.name : ''; };
/** Newest first by date, time, then id. */
export const sortTx = (a: Dated, b: Dated) => (b.date + b.time).localeCompare(a.date + a.time) || b.id.localeCompare(a.id);
export const acct = (id: string) => S.accounts.find(a => a.id === id);
export const acctName = (id: string) => { const a = acct(id); return a ? a.name : 'Unknown account'; };
/** The method of a record, falling back to the account type for records written before methods existed. */
export const methodOf = (t: Paid): Method => { if (isMethod(t.method)) return t.method; if (t.accountId === 'cash') return 'cash'; const a = acct(t.accountId); return a ? (a.type === 'cash' ? 'cash' : a.type) : 'bank'; };
export const METHOD_LABEL: Record<Method, string> = { cash: 'Cash', bank: 'Online · Bank account', upi: 'Online · UPI', card: 'Online · Credit card' };
export const SRC_LABEL: Record<Method, string> = { cash: 'Cash', bank: 'Bank', upi: 'UPI', card: 'Cards' };
export const payLabel = (t: Paid) => { const m = methodOf(t); return m === 'cash' ? 'Cash' : (m === 'upi' ? 'UPI · ' : '') + acctName(t.accountId); };
export const chooseMsg = (m: string) => m === 'card' ? 'Choose the credit card' : 'Choose the bank account';
export const activeAccounts = (type: AccountType) => S.accounts.filter(a => a.type === type && !a.archived);
/** A category's colour variable by its position in the category list; removed categories show grey. */
export const catColor = (c: string) => { const i = S.categories.indexOf(c); return i < 0 ? 'var(--c10)' : 'var(' + (i < COLORS.length ? COLORS[i] : EXTRA_COLORS[(i - COLORS.length) % EXTRA_COLORS.length]) + ')'; };
export const srcColor = (type: string) => 'var(--src-' + (type === 'cash' || type === 'card' || type === 'upi' ? type : 'bank') + ')';
export const acctColor = (id: string) => { const a = acct(id); return srcColor(a ? a.type : 'bank'); };
export interface Group<T> { key: string; v: number; n: number; items: T[] }
export function groupBy<T extends { amount: number }>(arr: T[], keyFn: (t: T) => string): Group<T>[] { const m = new Map<string, Group<T>>(); arr.forEach(t => { const k = keyFn(t); let g = m.get(k); if (!g) { g = { key: k, v: 0, n: 0, items: [] }; m.set(k, g); } g.v += t.amount; g.n++; g.items.push(t); }); return [...m.values()]; }
export const byValue = (a: { v: number }, b: { v: number }) => b.v - a.v;
/** 'date time' of the last expense on an account, '' if none; used to order account chips. */
export function lastUsed(id: string) { let m = ''; S.tx.forEach(t => { if (t.accountId === id) { const k = t.date + ' ' + t.time; if (k > m) m = k; } }); return m; }
export function sources(items: (Paid & { amount: number })[]) { const s: Record<Method, number> = { cash: 0, bank: 0, upi: 0, card: 0 }; items.forEach(t => { s[methodOf(t)] += t.amount; }); return s; }

/* credit-card statement cycle */
/** The statement period that contains today for a card whose statement closes on `day`. */
export function billPeriod(day: number) {
  const t = today(), y = +t.slice(0, 4), m = +t.slice(5, 7), d = +t.slice(8, 10);
  const dim = (yy: number, mm: number) => new Date(yy, mm, 0).getDate(); const dayIn = (yy: number, mm: number) => Math.min(day, dim(yy, mm));
  let eY = y, eM = m; if (d > dayIn(y, m)) { eM++; if (eM > 12) { eM = 1; eY++; } }
  const end = eY + '-' + pad(eM) + '-' + pad(dayIn(eY, eM));
  let sY = eY, sM = eM - 1; if (sM < 1) { sM = 12; sY--; }
  const sd = dayIn(sY, sM) + 1;
  const from = sd > dim(sY, sM) ? eY + '-' + pad(eM) + '-01' : sY + '-' + pad(sM) + '-' + pad(sd);
  return { from, to: end };
}
export function billSoFar(id: string, cat?: string) { const a = acct(id); if (!a || a.type !== 'card' || !a.statementDay) return null; const p = billPeriod(a.statementDay); const items = S.tx.filter(t => t.accountId === id && (!cat || t.category === cat) && t.date >= p.from && t.date <= today()); return { sum: sum(items), n: items.length, from: p.from, to: p.to }; }

export const initials = () => ((S.profile.firstName[0] || '') + (S.profile.lastName[0] || '')).toUpperCase() || '·';
export type { Account };
