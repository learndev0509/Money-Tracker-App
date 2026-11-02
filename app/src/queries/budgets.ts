import { groupBy, txIn } from './ledger';
import { S } from '../data/storage';
import { money } from '../lib/dates';
/* budgets: compared at render time, so changing one re-colours past months */
export interface BudgetRow { c: string; spent: number; b: number; left: number; ratio: number }
export function budgetRows(k: string): BudgetRow[] {
  const by = groupBy(txIn(k), t => t.category);
  return Object.keys(S.budgets).filter(c => S.budgets[c] > 0).map(c => { const g = by.find(x => x.key === c); const spent = g ? g.v : 0, b = S.budgets[c]; return { c, spent, b, left: b - spent, ratio: spent / b }; }).sort((a, b) => b.ratio - a.ratio);
}
export const budgetTone = (r: number) => r >= 1 ? 'over' : r >= .8 ? 'warn' : 'ok';
export const budgetColor = (r: number) => r >= 1 ? 'var(--danger)' : r >= .8 ? 'var(--warn)' : 'var(--good)';
export const budgetText = (row: { left: number }) => row.left >= 0 ? money(row.left) + ' left' : money(-row.left) + ' over';
