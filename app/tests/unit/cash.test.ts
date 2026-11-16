import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, type CashIn, type Income, type Tx } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { cashBalance, cashMoment } from '../../src/queries/cash';
import { cashEffect } from '../../src/screens/sheets/forms';
import type { Draft } from '../../src/ui/state';

let n = 0;
const set = (date: string, time: string, amount: number): CashIn => ({
  id: 'c' + ++n,
  kind: 'adjust',
  amount,
  accountId: '',
  date,
  time,
  note: '',
});
const spend = (date: string, time: string, amount: number): Tx => ({
  id: 't' + ++n,
  amount,
  category: 'Other',
  accountId: 'cash',
  method: 'cash',
  date,
  time,
  note: '',
  recurringId: '',
  vehicleId: '',
});
const received = (date: string, time: string, amount: number): Income => ({
  id: 'i' + ++n,
  amount,
  category: 'Gift',
  accountId: 'cash',
  method: 'cash',
  date,
  time,
  note: '',
  recurringId: '',
});
const draft = (amount: string, date: string, time: string): Draft => ({
  kind: 'adjust',
  amount,
  category: '',
  method: 'bank',
  accountId: '',
  date,
  time,
  note: '',
});

describe('setting cash in hand against receiving cash', () => {
  beforeEach(() => setLedger(defaults()));

  // The shape of a real report: money someone gave was entered with "Set cash in hand" each time.
  it('a Set replaces the total, so cash entered that way loses what was in hand', () => {
    S.cashIn.push(set('2026-10-01', '10:00', 5000), set('2026-11-11', '13:00', 500), set('2026-11-16', '23:00', 2000));
    S.tx.push(spend('2026-10-20', '12:00', 4200), spend('2026-11-17', '01:00', 2900));
    expect(cashBalance()).toBe(2000 - 2900);
  });
  it('the same money entered as cash received adds up', () => {
    S.cashIn.push(set('2026-10-01', '10:00', 5000));
    S.income.push(received('2026-11-11', '13:00', 500), received('2026-11-16', '23:00', 2000));
    S.tx.push(spend('2026-10-20', '12:00', 4200), spend('2026-11-17', '01:00', 2900));
    expect(cashBalance()).toBe(5000 - 4200 + 500 + 2000 - 2900);
  });
  it('gives the balance at a moment', () => {
    S.cashIn.push(set('2026-10-01', '10:00', 5000));
    S.tx.push(spend('2026-10-20', '12:00', 4200), spend('2026-11-17', '01:00', 300));
    expect(cashBalance(cashMoment('2026-10-01', '09:00'))).toBe(0);
    expect(cashBalance(cashMoment('2026-10-20', '11:59'))).toBe(5000);
    // an entry saved in the same minute as another lands after it
    expect(cashBalance(cashMoment('2026-10-20', '12:00'))).toBe(800);
    expect(cashBalance(cashMoment('2026-11-01', ''))).toBe(800);
    expect(cashBalance(cashMoment('2026-12-01', '00:00'))).toBe(500);
    expect(cashBalance()).toBe(500);
  });
  it('says what a Set will replace, and by how much, before it is saved', () => {
    S.cashIn.push(set('2026-10-01', '10:00', 5000));
    S.tx.push(spend('2026-10-20', '12:00', 4200));
    const at = ['2026-11-16', '23:00'] as const;
    expect(cashEffect(draft('', ...at))).toBe('This replaces the ₹800 in hand. It does not add to it.');
    expect(cashEffect(draft('2000', ...at))).toBe(
      'This replaces ₹800 with ₹2,000, ₹1,200 more. It does not add to what you have.',
    );
    expect(cashEffect(draft('300', ...at))).toBe(
      'This replaces ₹800 with ₹300, ₹500 less. It does not add to what you have.',
    );
    expect(cashEffect(draft('800', ...at))).toBe(
      'This replaces ₹800 with ₹800, no change. It does not add to what you have.',
    );
    expect(cashEffect(draft('0', ...at))).toBe(
      'This replaces ₹800 with ₹0, ₹800 less. It does not add to what you have.',
    );
    // backdated to before the spend: it replaces what was in hand then
    expect(cashEffect(draft('6000', '2026-10-10', '09:00'))).toContain('This replaces ₹5,000 with ₹6,000, ₹1,000 more');
  });
});
