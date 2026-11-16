import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, type CashIn, type Tx } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { cashBalance } from '../../src/queries/cash';
import { cashEffect } from '../../src/screens/sheets/forms';
import type { Draft } from '../../src/ui/state';

let n = 0;
const added = (date: string, time: string, amount: number): CashIn => ({
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
const draft = (amount: string): Draft => ({
  kind: 'adjust',
  amount,
  category: '',
  method: 'bank',
  accountId: '',
  date: '2026-11-16',
  time: '23:00',
  note: '',
});

describe('adding cash in hand', () => {
  beforeEach(() => setLedger(defaults()));

  // The shape of a real report: cash a relative gave was entered three times; each entry used to
  // replace the total, and the balance ended far below zero.
  it('every entry adds to what is left', () => {
    S.cashIn.push(
      added('2026-10-01', '10:00', 5000),
      added('2026-11-11', '13:00', 500),
      added('2026-11-16', '23:00', 2000),
    );
    S.tx.push(spend('2026-10-20', '12:00', 4200), spend('2026-11-17', '01:00', 2900));
    expect(cashBalance()).toBe(5000 - 4200 + 500 + 2000 - 2900);
  });
  it('does not depend on the order entries were dated', () => {
    S.tx.push(spend('2026-10-20', '12:00', 4200));
    S.cashIn.push(added('2026-11-16', '23:00', 2000), added('2026-10-01', '10:00', 5000));
    expect(cashBalance()).toBe(2800);
  });
  it('says what the total will be before it is saved', () => {
    S.cashIn.push(added('2026-10-01', '10:00', 5000));
    S.tx.push(spend('2026-10-20', '12:00', 4200));
    expect(cashEffect(draft(''))).toBe('Adds to the ₹800 in hand. Enter cash you were given or already had.');
    expect(cashEffect(draft('2000'))).toBe('Adds to the ₹800 in hand: ₹2,800 after this.');
    expect(cashEffect(draft('1000+500'))).toBe('Adds to the ₹800 in hand: ₹2,300 after this.');
  });
});
