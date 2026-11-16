import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { acctName, billPeriod, groupBy, methodOf, payLabel, sources, sum, txIn } from '../../src/queries/ledger';
import { budgetRows, budgetText } from '../../src/queries/budgets';
import { cashBalance, cashEvents, hasCashActivity } from '../../src/queries/cash';
import { addedSummary, addedText, applyRecurringTo, recurLabel, type AddedEntry } from '../../src/queries/recurring';
import { noteStats, noteSuggestions } from '../../src/queries/notes';
import { today } from '../../src/lib/dates';
import backup from '../fixtures/backup-1.8.0.json';

const load = () => {
  const d = migrate(JSON.parse(JSON.stringify(backup)));
  setLedger(d);
  return d;
};

describe('ledger queries', () => {
  beforeEach(load);
  it('selects a month and sums it', () => {
    const oct = txIn('2026-10');
    expect(oct).toHaveLength(6);
    expect(sum(oct)).toBe(120 + 3999 + 2500 + 450 + 80 + 15000);
    expect(txIn('2026-09')).toHaveLength(1);
  });
  it('splits a month by payment method, with UPI as its own slice', () => {
    expect(sources(txIn('2026-10'))).toEqual({ cash: 120, bank: 15450, upi: 80, card: 6499 });
  });
  it('labels payments and accounts', () => {
    const upi = S.tx.find(t => t.id === 't5')!;
    expect(methodOf(upi)).toBe('upi');
    expect(payLabel(upi)).toBe('UPI · HDFC Bank');
    expect(payLabel(S.tx.find(t => t.id === 't1')!)).toBe('Cash');
    expect(acctName('nope')).toBe('Unknown account');
  });
  it('groups and counts', () => {
    const g = groupBy(txIn('2026-10'), t => t.category).sort((a, b) => b.v - a.v);
    expect(g[0]).toMatchObject({ key: 'Rent', v: 15000, n: 1 });
    expect(g.find(x => x.key === 'Food')).toMatchObject({ v: 200, n: 2 });
  });
});

describe('statement cycle', () => {
  it('always brackets today and ends on the statement day', () => {
    for (const day of [1, 15, 28, 31]) {
      const p = billPeriod(day);
      expect(p.from <= today()).toBe(true);
      expect(p.to >= today()).toBe(true);
      expect(+p.to.slice(8, 10)).toBeLessThanOrEqual(day);
    }
  });
});

describe('budgets', () => {
  beforeEach(load);
  it('ranks budgets by how used up they are and reports what is left', () => {
    const rows = budgetRows('2026-10');
    expect(rows.map(r => r.c)).toEqual(['Shopping', 'Food']);
    expect(rows[0]).toMatchObject({ spent: 3999, b: 4000, left: 1 });
    expect(budgetText(rows[0])).toBe('₹1 left');
    expect(budgetText({ ...rows[0], left: -250 })).toBe('₹250 over');
  });
});

describe('cash in hand', () => {
  beforeEach(load);
  it('adds cash added by hand, withdrawals and cash income, and takes off cash spends', () => {
    const ev = cashEvents();
    expect(ev.map(e => e.t)).toEqual(['spend', 'adjust', 'spend', 'withdrawal', 'income']);
    expect(cashBalance()).toBe(-300 + 1000 - 120 + 2000 + 500);
    expect(hasCashActivity()).toBe(true);
  });
});

describe('recurring entries', () => {
  it('adds the months since lastApplied up to today, never beyond it', () => {
    const d = load();
    const rent = d.recurring.find(r => r.id === 'r1')!;
    rent.lastApplied = '';
    rent.since = '2026-08';
    const n0 = d.tx.length;
    expect(applyRecurringTo(d, '2026-10', 0)).toBe(2);
    expect(d.tx.slice(n0).map(t => t.date)).toEqual(['2026-08-01', '2026-09-01']);
    expect(rent.lastApplied).toBe('2026-09');
    expect(applyRecurringTo(d, '2026-10', 30)).toBe(1);
    expect(d.tx.at(-1)).toMatchObject({
      date: '2026-10-01',
      recurringId: 'r1',
      amount: 15000,
      method: 'bank',
      vehicleId: '',
    });
    expect(applyRecurringTo(d, '2026-10', 30)).toBe(0);
  });
  it('clamps the day for short months and routes income to the income list', () => {
    const d = load();
    const sal = d.recurring.find(r => r.id === 'r2')!;
    sal.lastApplied = '';
    sal.since = '2026-02';
    sal.day = 31;
    const n0 = d.income.length;
    expect(applyRecurringTo(d, '2026-03', 31)).toBe(2);
    expect(d.income.slice(n0).map(i => i.date)).toEqual(['2026-02-28', '2026-03-31']);
    expect(d.income.at(-1)!.method).toBe('bank');
  });
  it('skips paused entries', () => {
    const d = load();
    d.recurring.forEach(r => {
      r.active = false;
      r.lastApplied = '';
    });
    expect(applyRecurringTo(d, '2026-10', 30)).toBe(0);
  });
  it('describes each entry it added, for the toast and the notification', () => {
    const d = load();
    const rent = d.recurring.find(r => r.id === 'r1')!;
    rent.lastApplied = '';
    rent.since = '2026-09';
    const out: AddedEntry[] = [];
    const n = applyRecurringTo(d, '2026-10', 30, out);
    expect(out).toHaveLength(n);
    expect(out.filter(a => a.label === recurLabel(rent))).toEqual([
      { kind: 'expense', amount: 15000, label: recurLabel(rent), date: '2026-09-01' },
      { kind: 'expense', amount: 15000, label: recurLabel(rent), date: '2026-10-01' },
    ]);
    expect(addedText({ kind: 'income', amount: 85000, label: 'Salary', date: '2026-10-01' })).toBe('Salary +₹85,000');
    const many = Array.from({ length: 5 }, (_, i) => ({
      kind: 'expense' as const,
      amount: 100 + i,
      label: 'E' + i,
      date: '',
    }));
    expect(addedSummary(many.slice(0, 2))).toBe('E0 ₹100, E1 ₹101');
    expect(addedSummary(many)).toBe('E0 ₹100, E1 ₹101, E2 ₹102 and 2 more');
  });
});

describe('note memory', () => {
  beforeEach(load);
  it('remembers what a note usually goes with and suggests by prefix', () => {
    const s = noteStats().find(x => x.key === 'swiggy')!;
    expect(s).toMatchObject({ category: 'Food', accountId: 'a-hdfc', method: 'upi', count: 1 });
    expect(noteSuggestions('sw').map(x => x.note)).toEqual(['Swiggy', 'Swiggy Instamart']);
    expect(noteSuggestions('').length).toBeLessThanOrEqual(5);
    expect(noteSuggestions('zzz')).toEqual([]);
  });
});
