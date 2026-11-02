/*
 * The data model. Everything the app stores is one Ledger object, saved as JSON under one
 * localStorage key. This shape, and the backup JSON it produces, is the contract with every phone
 * that has the app installed: change it only together with a step in migrate().
 */
import { uid } from '../lib/constants';

export type Method = 'cash' | 'bank' | 'upi' | 'card';
export type AccountType = 'cash' | 'bank' | 'card';
export interface Account { id: string; name: string; type: AccountType; archived: boolean; statementDay: number | null }
export interface Tx { id: string; amount: number; category: string; accountId: string; method: Method; date: string; time: string; note: string; recurringId: string; vehicleId: string }
export interface Income { id: string; amount: number; category: string; accountId: string; method: 'cash' | 'bank'; date: string; time: string; note: string; recurringId: string }
export interface CashIn { id: string; kind: 'withdrawal' | 'adjust'; amount: number; accountId: string; date: string; time: string; note: string }
export interface Recurring { id: string; kind: 'expense' | 'income'; amount: number; category: string; method: Method; accountId: string; day: number; note: string; active: boolean; since: string; lastApplied: string }
export interface Vehicle { id: string; name: string }
export interface Profile { firstName: string; lastName: string }
export interface Meta { lastBackup?: number; startView?: 'add'; theme?: 'light' | 'dark'; appVersion?: string; alerts?: false }
export interface Ledger {
  profile: Profile;
  accounts: Account[];
  categories: string[];
  tx: Tx[];
  income: Income[];
  cashIn: CashIn[];
  budgets: Record<string, number>;
  recurring: Recurring[];
  vehicles: Vehicle[];
  meta: Meta;
  flags: { v2: boolean; [k: string]: unknown };
}

export const CASH: Account = { id: 'cash', name: 'Cash', type: 'cash', archived: false, statementDay: null };
export const DEFAULT_CATS = ['Food', 'Groceries', 'Transport', 'Fuel', 'Shopping', 'Bills', 'Rent', 'Health', 'Entertainment', 'Other'];
export const INCOME_SOURCES = ['Salary', 'Business', 'Freelance', 'Interest', 'Refund', 'Gift', 'Other'];
export const FUEL = 'Fuel';
export const METHODS: Method[] = ['cash', 'bank', 'upi', 'card'];
export const isMethod = (x: unknown): x is Method => (METHODS as unknown[]).includes(x);
export const acctTypeOf = (m: Method | string): 'bank' | 'card' => m === 'card' ? 'card' : 'bank';
export function defaults(): Ledger { return { profile: { firstName: '', lastName: '' }, accounts: [Object.assign({}, CASH)], categories: DEFAULT_CATS.slice(), tx: [], income: [], cashIn: [], budgets: {}, recurring: [], vehicles: [], meta: {}, flags: { v2: true } }; }

/**
 * The only entry point for data from outside (load, restore, snapshot restore). Normalises every
 * record, fills missing fields and drops keys known to be stale. Tolerant by design: never throw
 * away user data because a field looks odd.
 */
/** An untrusted record as it arrives from storage or a backup: any field may be missing or wrong. */
export type Raw = Record<string, any>;
export function migrate(d: Raw): Ledger {
  d.accounts = (d.accounts || []).filter((a: Raw) => a && a.id !== 'cash').map((a: Raw) => ({ id: a.id || uid(), name: String(a.name || 'Account'), type: a.type === 'card' ? 'card' : 'bank', archived: !!a.archived, statementDay: (a.type === 'card' && +a.statementDay >= 1 && +a.statementDay <= 31) ? +a.statementDay : null }));
  d.accounts.unshift(Object.assign({}, CASH));
  d.categories = (d.categories || []).map(String).filter(Boolean);
  d.flags = d.flags && typeof d.flags === 'object' ? d.flags : {};
  if (!d.flags.v2) { d.flags.v2 = true; if (!d.categories.some((c: string) => c.toLowerCase() === 'fuel')) { const i = d.categories.indexOf('Transport'); d.categories.splice(i >= 0 ? i + 1 : d.categories.length, 0, 'Fuel'); } }
  if (!d.categories.length) d.categories = DEFAULT_CATS.slice();
  const typeOf = (id: string): AccountType => { const a = d.accounts.find((x: Raw) => x.id === id); return a ? a.type : 'bank'; };
  const okDate = (s: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')), okTime = (s: unknown) => /^\d{2}:\d{2}$/.test(String(s || ''));
  d.tx = (d.tx || []).filter((t: Raw) => t && okDate(t.date)).map((t: Raw) => {
    const accountId = t.accountId || ''; let method = t.method; if (!METHODS.includes(method)) method = accountId === 'cash' ? 'cash' : typeOf(accountId);
    return { id: t.id || uid(), amount: Math.round((+t.amount || 0) * 100) / 100, category: String(t.category || 'Other'), accountId: method === 'cash' ? 'cash' : accountId, method, date: t.date, time: okTime(t.time) ? t.time : '', note: String(t.note || ''), recurringId: t.recurringId || '', vehicleId: t.vehicleId || '' };
  });
  d.cashIn = Array.isArray(d.cashIn) ? d.cashIn.filter((c: Raw) => c && okDate(c.date) && (+c.amount > 0 || c.kind === 'adjust')).map((c: Raw) => ({ id: c.id || uid(), kind: c.kind === 'adjust' ? 'adjust' : 'withdrawal', amount: Math.round((+c.amount || 0) * 100) / 100, accountId: c.accountId || '', date: c.date, time: okTime(c.time) ? c.time : '', note: String(c.note || '') })) : [];
  delete d.pin;
  d.vehicles = Array.isArray(d.vehicles) ? d.vehicles.filter((v: Raw) => v && String(v.name || '').trim()).map((v: Raw) => ({ id: v.id || uid(), name: String(v.name).trim().slice(0, 30) })) : [];
  d.income = Array.isArray(d.income) ? d.income.filter((t: Raw) => t && okDate(t.date) && +t.amount > 0).map((t: Raw) => ({ id: t.id || uid(), amount: Math.round(+t.amount * 100) / 100, category: INCOME_SOURCES.includes(t.category) ? t.category : 'Other', accountId: t.method === 'cash' || !t.accountId ? 'cash' : t.accountId, method: t.method === 'cash' ? 'cash' : 'bank', date: t.date, time: okTime(t.time) ? t.time : '', note: String(t.note || ''), recurringId: t.recurringId || '' })) : [];
  const b: Record<string, number> = {}; if (d.budgets && typeof d.budgets === 'object') Object.keys(d.budgets).forEach(k => { const v = Math.round(+d.budgets[k] || 0); if (v > 0) b[k] = v; }); d.budgets = b;
  d.recurring = Array.isArray(d.recurring) ? d.recurring.filter((r: Raw) => r && +r.amount > 0).map((r: Raw) => { const kind = r.kind === 'income' ? 'income' : 'expense'; let method = METHODS.includes(r.method) ? r.method : 'cash'; if (kind === 'income' && method !== 'cash') method = 'bank'; return { id: r.id || uid(), kind, amount: Math.round(+r.amount * 100) / 100, category: String(r.category || 'Other'), method, accountId: method === 'cash' || !r.accountId ? 'cash' : r.accountId, day: Math.min(31, Math.max(1, +r.day || 1)), note: String(r.note || ''), active: r.active !== false, since: /^\d{4}-\d{2}$/.test(r.since || '') ? r.since : '', lastApplied: /^\d{4}-\d{2}$/.test(r.lastApplied || '') ? r.lastApplied : '' }; }) : [];
  const pr = d.profile && typeof d.profile === 'object' ? d.profile : {}; d.profile = { firstName: String(pr.firstName || '').trim().slice(0, 30), lastName: String(pr.lastName || '').trim().slice(0, 30) };
  d.meta = d.meta && typeof d.meta === 'object' ? d.meta : {};
  if (d.meta.startView !== 'add') delete d.meta.startView;
  if (d.meta.theme !== 'light' && d.meta.theme !== 'dark') delete d.meta.theme;
  if (typeof d.meta.appVersion !== 'string') delete d.meta.appVersion;
  if (d.meta.alerts !== false) delete d.meta.alerts;
  return d as Ledger;
}
