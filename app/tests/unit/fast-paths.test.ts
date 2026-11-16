import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, type Tx } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { accountUse, lastUsed, newest, sortTx } from '../../src/queries/ledger';
import { cashBalance, cashEvents } from '../../src/queries/cash';

/* The single-pass helpers must give exactly what the full sort or scan they replace gave. */

let n = 0;
const tx = (date: string, time: string, over: Partial<Tx> = {}): Tx => ({
  id: 'id' + ((n * 7919) % 1000) + '-' + ++n,
  amount: 100 + n,
  category: 'Food',
  accountId: 'cash',
  method: 'cash',
  date,
  time,
  note: '',
  recurringId: '',
  vehicleId: '',
  ...over,
});
/** The comparator sortTx replaced, kept here as the reference. */
const oldSortTx = (a: Tx, b: Tx) => (b.date + b.time).localeCompare(a.date + a.time) || b.id.localeCompare(a.id);

function sample(): Tx[] {
  const out: Tx[] = [];
  const accts = ['cash', 'b1', 'c1', 'c2'];
  for (let i = 0; i < 400; i++) {
    const d = '2026-' + String(1 + (i % 12)).padStart(2, '0') + '-' + String(1 + ((i * 7) % 28)).padStart(2, '0');
    const t = i % 5 === 0 ? '' : String((i * 3) % 24).padStart(2, '0') + ':' + String((i * 11) % 60).padStart(2, '0');
    const accountId = accts[i % 4];
    out.push(tx(d, t, { accountId, method: accountId === 'cash' ? 'cash' : accountId === 'b1' ? 'upi' : 'card' }));
  }
  // exact duplicates of date and time, so the id tiebreak matters
  out.push(tx('2026-06-06', '06:06'), tx('2026-06-06', '06:06'), tx('2026-06-06', ''));
  return out;
}

describe('fast paths', () => {
  beforeEach(() => {
    n = 0;
    const d = defaults();
    d.tx = sample();
    setLedger(d);
  });

  it('sortTx orders exactly as the localeCompare version did, blank times included', () => {
    const a = S.tx
        .slice()
        .sort(sortTx)
        .map(t => t.id),
      b = S.tx
        .slice()
        .sort(oldSortTx)
        .map(t => t.id);
    expect(a).toEqual(b);
    expect(a[0]).not.toBe(b.at(-1));
  });

  it('newest(list, n) is the head of the full sort', () => {
    const sorted = S.tx.slice().sort(sortTx);
    for (const k of [1, 3, 10]) expect(newest(S.tx, k)).toEqual(sorted.slice(0, k));
    expect(newest([], 3)).toEqual([]);
    expect(newest(S.tx.slice(0, 2), 5)).toEqual(S.tx.slice(0, 2).sort(sortTx));
  });

  it('accountUse matches a scan per account', () => {
    const use = accountUse();
    for (const id of ['cash', 'b1', 'c1', 'c2', 'none']) {
      const mine = S.tx.filter(t => t.accountId === id);
      expect(use.get(id)?.n || 0).toBe(mine.length);
      let last = '';
      for (const t of mine) if (t.date + ' ' + t.time > last) last = t.date + ' ' + t.time;
      expect(lastUsed(id, use)).toBe(last);
      expect(lastUsed(id)).toBe(last);
    }
  });

  it('cashBalance is the sum of the cash events', () => {
    S.income.push({
      id: 'i1',
      amount: 5000,
      category: 'Salary',
      accountId: 'cash',
      method: 'cash',
      date: '2026-03-01',
      time: '09:00',
      note: '',
      recurringId: '',
    });
    S.cashIn.push({
      id: 'w1',
      amount: 2000,
      kind: 'withdrawal',
      accountId: 'b1',
      date: '2026-03-02',
      time: '10:00',
      note: '',
    });
    let bal = 0;
    for (const e of cashEvents()) bal += e.t === 'spend' ? -e.amt : e.amt;
    expect(cashBalance()).toBe(Math.round(bal * 100) / 100);
    expect(cashBalance()).not.toBe(0);
  });
});
