import type { Method } from '../data/model';
import { S } from '../data/storage';
import { norm } from '../lib/constants';
import { methodOf } from './ledger';
/* note memory: what a note usually goes with */
export interface NoteStat {
  key: string;
  note: string;
  count: number;
  last: string;
  category: string;
  accountId: string;
  method: Method;
}
/** Every distinct note, most used first, carrying the category and account it last went with. */
export function noteStats(): NoteStat[] {
  const m = new Map<string, NoteStat>();
  S.tx.forEach(t => {
    const n = String(t.note || '').trim();
    if (!n) return;
    const k = norm(n);
    if (!k) return;
    let s = m.get(k);
    const stamp = t.date + ' ' + t.time;
    if (!s) {
      s = { key: k, note: n, count: 0, last: '', category: t.category, accountId: t.accountId, method: methodOf(t) };
      m.set(k, s);
    }
    s.count++;
    if (stamp > s.last) {
      s.last = stamp;
      s.note = n;
      s.category = t.category;
      s.accountId = t.accountId;
      s.method = methodOf(t);
    }
  });
  return [...m.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}
export function noteSuggestions(typed: string) {
  const all = noteStats();
  const q = norm(typed);
  if (!q) return all.slice(0, 5);
  return all
    .filter(
      s => s.key !== q && (s.key.startsWith(q) || s.key.split(' ').some(w => w.startsWith(q)) || s.key.includes(q)),
    )
    .slice(0, 5);
}
