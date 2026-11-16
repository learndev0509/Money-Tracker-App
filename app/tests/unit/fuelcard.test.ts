import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, type Tx } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { fuel } from '../../src/ui/state';
import { mileageHint, pickVehicle } from '../../src/screens/add';

const tx = (over: Partial<Tx>): Tx => ({
  id: 't1',
  amount: 500,
  category: 'Fuel',
  accountId: 'cash',
  method: 'cash',
  date: '2026-11-10',
  time: '09:00',
  note: '',
  recurringId: '',
  vehicleId: 'v1',
  ...over,
});

describe('the Fuel card', () => {
  beforeEach(() => {
    const d = defaults();
    d.vehicles = [{ id: 'v1', name: 'Swift' }];
    d.accounts.push(
      { id: 'b1', name: 'HDFC Bank', type: 'bank', archived: false, statementDay: null },
      { id: 'c1', name: 'Regalia', type: 'card', archived: false, statementDay: null },
    );
    setLedger(d);
    Object.assign(fuel, {
      vehicleId: '',
      accountId: '',
      amount: '',
      method: 'card',
      mileage: false,
      odo: '',
      litres: '',
    });
  });

  it('comes back as UPI on the bank when the last fill was edited onto a bank account', () => {
    // the card offers Cash, UPI and Card only; an expense edited to Online > Bank must still select one of them
    S.tx = [tx({ accountId: 'b1', method: 'bank' })];
    pickVehicle('v1');
    expect(fuel.method).toBe('upi');
    expect(fuel.accountId).toBe('b1');
  });

  it('keeps Card, UPI and Cash as they were paid', () => {
    for (const [accountId, method] of [
      ['c1', 'card'],
      ['b1', 'upi'],
      ['cash', 'cash'],
    ] as const) {
      S.tx = [tx({ accountId, method })];
      pickVehicle('v1');
      expect(fuel.method).toBe(method);
      expect(fuel.accountId).toBe(accountId);
    }
  });

  it('warns on the first reading when the litres are missing, since that leg can never give a mileage', () => {
    fuel.vehicleId = 'v1';
    fuel.mileage = true;
    fuel.odo = '5080';
    expect(mileageHint()).toBe('First reading for Swift. Add the litres too, or the next fill cannot show mileage.');
    fuel.litres = '10';
    expect(mileageHint()).toBe('First reading for Swift. Mileage shows at the next fill.');
    fuel.amount = '1000';
    expect(mileageHint()).toMatch(/^First reading for Swift\. Mileage shows at the next fill · ₹100 a litre$/);
  });
});
