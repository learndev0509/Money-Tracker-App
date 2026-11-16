import type { CashIn, Income, Tx } from '../data/model';
import { S } from '../data/storage';
import { methodOf } from './ledger';

/** One movement of physical cash, sortable by `k` (date time id). */
export type CashEvent = { k: string; amt: number } & (
  { t: 'withdrawal' | 'adjust'; ref: CashIn } | { t: 'spend'; ref: Tx } | { t: 'income'; ref: Income }
);

/*
 * Cash in hand: cash added by hand (kind 'adjust'), withdrawals and cash income add; cash expenses
 * subtract. 'adjust' once replaced the total; people used it to add cash they were given and lost
 * what they had, so it adds like everything else. The stored kind keeps its old name.
 */
export function cashEvents(): CashEvent[] {
  const ev: CashEvent[] = S.cashIn.map(c => ({
    k: c.date + ' ' + (c.time || '00:00') + ' ' + c.id,
    t: c.kind,
    amt: c.amount,
    ref: c,
  }));
  S.tx.forEach(t => {
    if (methodOf(t) === 'cash')
      ev.push({ k: t.date + ' ' + (t.time || '00:00') + ' ' + t.id, t: 'spend', amt: t.amount, ref: t });
  });
  S.income.forEach(t => {
    if (t.method === 'cash')
      ev.push({ k: t.date + ' ' + (t.time || '00:00') + ' ' + t.id, t: 'income', amt: t.amount, ref: t });
  });
  return ev.sort((a, b) => a.k.localeCompare(b.k));
}
export function cashBalance() {
  let bal = 0;
  cashEvents().forEach(e => {
    if (e.t === 'spend') bal -= e.amt;
    else bal += e.amt;
  });
  return Math.round(bal * 100) / 100;
}
export const hasCashActivity = () =>
  S.cashIn.length > 0 || S.tx.some(t => methodOf(t) === 'cash') || S.income.some(t => t.method === 'cash');
