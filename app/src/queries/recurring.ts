import { pad, uid } from '../lib/constants';
import { addMonths, daysInMonth, money, thisMonth, today } from '../lib/dates';
import { S, save } from '../data/storage';
import type { Ledger } from '../data/model';
import { toast } from '../ui/toast';
import { notifyRecurring } from '../ui/notify';

/** One entry a recurring rule just created, as the toast and the notification name it. */
export interface AddedEntry {
  kind: 'expense' | 'income';
  amount: number;
  label: string;
  date: string;
}
/** "Rent ₹15,000", "Salary +₹85,000". */
export const addedText = (a: AddedEntry) => a.label + ' ' + (a.kind === 'income' ? '+' : '') + money(a.amount);

/**
 * Adds every due recurring entry to the ledger: from the month after lastApplied (or `since`) up to
 * the current month `tm`, on each month's day or the last day of shorter months, but never beyond
 * today (`td`). Pure apart from mutating `d`; returns how many entries were added, and pushes a
 * description of each onto `out` when given.
 */
export function applyRecurringTo(d: Ledger, tm: string, td: number, out?: AddedEntry[]) {
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
      if (out)
        out.push({
          kind: r.kind === 'income' ? 'income' : 'expense',
          amount: r.amount,
          label: recurLabel(r),
          date: entry.date,
        });
      m = addMonths(m, 1);
    }
  });
  return added;
}
/** The toast and notification line for what was just added: every entry up to three, then a count. */
export function addedSummary(added: AddedEntry[]) {
  const names = added.slice(0, 3).map(addedText);
  return names.join(', ') + (added.length > 3 ? ' and ' + (added.length - 3) + ' more' : '');
}
/** Runs the rules against the ledger; when anything was added, saves, toasts and (if allowed) notifies. */
export function applyRecurring() {
  const added: AddedEntry[] = [];
  const n = applyRecurringTo(S, thisMonth(), +today().slice(8, 10), added);
  if (n) {
    save();
    toast(
      (n === 1 ? 'Added automatically: ' : n + ' entries added automatically: ') + addedSummary(added),
      null,
      undefined,
      6000,
    );
    notifyRecurring(added);
  }
  return n;
}
export const recurLabel = (r: { note: string; category: string }) => r.note || r.category;
