import { pad, uid } from '../lib/constants';
import { addMonths, daysInMonth, thisMonth, today } from '../lib/dates';
import { S, save } from '../data/storage';
import type { Ledger } from '../data/model';
import { toast } from '../ui/toast';

/**
 * Adds every due recurring entry to the ledger: from the month after lastApplied (or `since`) up to
 * the current month `tm`, on each month's day or the last day of shorter months, but never beyond
 * today (`td`). Pure apart from mutating `d`; returns how many entries were added.
 */
export function applyRecurringTo(d: Ledger, tm: string, td: number) {
  let added = 0;
  d.recurring.forEach(r => {
    if (!r.active) return;
    let m = r.lastApplied ? addMonths(r.lastApplied, 1) : r.since || tm;
    let guard = 0;
    while (m <= tm && guard++ < 120) {
      const day = Math.min(r.day, daysInMonth(m));
      if (!(m < tm || day <= td)) break;
      const entry = {
        id: uid(),
        amount: r.amount,
        category: r.category,
        accountId: r.method === 'cash' ? 'cash' : r.accountId,
        method: r.method,
        date: m + '-' + pad(day),
        time: '',
        note: r.note,
        recurringId: r.id,
      };
      if (r.kind === 'income') d.income.push({ ...entry, method: r.method === 'cash' ? 'cash' : 'bank' });
      else d.tx.push({ ...entry, vehicleId: '' });
      r.lastApplied = m;
      added++;
      m = addMonths(m, 1);
    }
  });
  return added;
}
export function applyRecurring() {
  const added = applyRecurringTo(S, thisMonth(), +today().slice(8, 10));
  if (added) {
    save();
    toast(added + ' recurring entr' + (added === 1 ? 'y' : 'ies') + ' added automatically');
  }
  return added;
}
export const recurLabel = (r: { note: string; category: string }) => r.note || r.category;
