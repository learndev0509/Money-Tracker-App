/* Comparisons across months: a run of months for a bar chart, a year's twelve, and what moved by category. */
import { Tx } from '../data/model';
import { MON, pad } from '../lib/constants';
import { addMonths, thisMonth } from '../lib/dates';
import { groupBy, sum, txIn } from './ledger';

/** One month in a series: its key, short label, total, count, and whether it is still ahead. */
export interface MonthPoint {
  k: string;
  label: string;
  v: number;
  n: number;
  future: boolean;
}
const point = (k: string): MonthPoint => {
  const tx = txIn(k);
  return { k, label: MON[+k.slice(5, 7) - 1], v: sum(tx), n: tx.length, future: k > thisMonth() };
};
/** The `n` months ending at `k`, oldest first. */
export const monthSeries = (k: string, n: number) =>
  Array.from({ length: n }, (_, i) => point(addMonths(k, i - n + 1)));
/** January to December of a year. */
export const yearMonths = (y: number) => Array.from({ length: 12 }, (_, i) => point(y + '-' + pad(i + 1)));

/** A category's change between two sets of expenses: its totals in each and the difference. */
export interface Mover {
  c: string;
  v: number;
  pv: number;
  d: number;
}
/** The `n` categories that changed most between `prev` and `cur`, largest change first. */
export function movers(cur: Tx[], prev: Tx[], n: number): Mover[] {
  const cats = groupBy(cur, t => t.category),
    pcats = groupBy(prev, t => t.category);
  return cats
    .map(g => {
      const q = pcats.find(x => x.key === g.key);
      return { c: g.key, v: g.v, pv: q ? q.v : 0, d: g.v - (q ? q.v : 0) };
    })
    .concat(pcats.filter(q => !cats.some(g => g.key === q.key)).map(q => ({ c: q.key, v: 0, pv: q.v, d: -q.v })))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, n);
}
