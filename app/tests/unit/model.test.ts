import { describe, expect, it } from 'vitest';
import { defaults, migrate } from '../../src/data/model';
import backup from '../fixtures/backup-1.8.0.json';
import oldBackup from '../fixtures/backup-rupee-ledger.json';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('defaults()', () => {
  it('starts at zero with the built-in cash account and the ten default categories', () => {
    const d = defaults();
    expect(d.tx).toEqual([]);
    expect(d.income).toEqual([]);
    expect(d.cashIn).toEqual([]);
    expect(d.accounts).toEqual([{ id: 'cash', name: 'Cash', type: 'cash', archived: false, statementDay: null }]);
    expect(d.categories).toHaveLength(10);
    expect(d.categories).toContain('Fuel');
    expect(d.flags.v2).toBe(true);
  });
});

describe('migrate() on a 1.8.0 backup', () => {
  const d = migrate(clone(backup));
  it('keeps the cash account first and normalises statement days', () => {
    expect(d.accounts[0].id).toBe('cash');
    expect(d.accounts.find(a => a.id === 'a-regalia')!.statementDay).toBe(15);
    expect(d.accounts.find(a => a.id === 'a-old')!.statementDay).toBeNull();
  });
  it('drops records with bad dates, rounds amounts and fills missing fields', () => {
    expect(d.tx.map(t => t.id)).not.toContain('bad');
    expect(d.tx).toHaveLength(7);
    expect(d.tx.find(t => t.id === 't2')!.amount).toBe(3999);
    const t4 = d.tx.find(t => t.id === 't4')!;
    expect(t4.method).toBe('bank');
    expect(t4.recurringId).toBe('');
    expect(t4.vehicleId).toBe('');
  });
  it('cleans income, cash movements, recurring entries and vehicles', () => {
    expect(d.income.map(i => i.id)).toEqual(['i1', 'i2']);
    expect(d.cashIn.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(d.recurring.map(r => r.id)).toEqual(['r1', 'r2']);
    expect(d.recurring.find(r => r.id === 'r2')!.method).toBe('bank');
    expect(d.vehicles).toEqual([{ id: 'v1', name: 'Swift' }]);
  });
  it('keeps only positive whole-rupee budgets', () => {
    expect(d.budgets).toEqual({ Food: 5000, Shopping: 4000 });
  });
  it('keeps known meta, drops the stale pin hash and keeps custom categories', () => {
    expect(d.meta.startView).toBe('add');
    expect(d.meta.theme).toBe('dark');
    expect(d.meta.lastBackup).toBe(1761800000000);
    expect(d.meta.alerts).toBeUndefined();
    expect((d as any).pin).toBeUndefined();
    expect(d.categories).toContain('Kids');
    expect(d.profile).toEqual({ firstName: 'Shreya', lastName: 'Sanghavi' });
  });
  it('is idempotent: migrating its own output changes nothing', () => {
    expect(migrate(clone(d))).toEqual(d);
  });
});

describe('migrate() on a pre-1.0 Rupee Ledger backup', () => {
  const d = migrate(clone(oldBackup));
  it('adds the Fuel category after Transport once and sets the v2 flag', () => {
    expect(d.flags.v2).toBe(true);
    expect(d.categories.indexOf('Fuel')).toBe(d.categories.indexOf('Transport') + 1);
    expect(d.categories.filter(c => c === 'Fuel')).toHaveLength(1);
  });
  it('infers the payment method from the account and coerces strings', () => {
    expect(d.tx.find(t => t.id === 'x1')!.method).toBe('cash');
    expect(d.tx.find(t => t.id === 'x1')!.amount).toBe(250);
    expect(d.tx.find(t => t.id === 'x2')!.method).toBe('card');
    expect(d.tx.find(t => t.id === 'x2')!.time).toBe('');
    expect(d.tx.find(t => t.id === 'x3')!.method).toBe('bank');
    expect(d.accounts.find(a => a.id === 'k1')!.statementDay).toBe(20);
  });
  it('fills every collection and drops the old PIN hash', () => {
    expect(d.income).toEqual([]);
    expect(d.cashIn).toEqual([]);
    expect(d.recurring).toEqual([]);
    expect(d.vehicles).toEqual([]);
    expect(d.profile).toEqual({ firstName: 'Priya', lastName: '' });
    expect((d as any).pin).toBeUndefined();
    expect(d.meta).toEqual({});
  });
});
