import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, migrate, type Tx } from '../../src/data/model';
import { S, setLedger } from '../../src/data/storage';
import { avgKmpl, fuelTrack, kmpl, legKm } from '../../src/queries/ledger';
import { posNum } from '../../src/lib/calc';

let n = 0;
const fill = (date: string, amount: number, odo?: number, litres?: number, vehicleId = 'v1'): Tx => ({
  id: 'f' + ++n,
  amount,
  category: 'Fuel',
  accountId: 'cash',
  method: 'cash',
  date,
  time: '09:00',
  note: '',
  recurringId: '',
  vehicleId,
  ...(odo ? { odo } : {}),
  ...(litres ? { litres } : {}),
});

describe('fuel mileage', () => {
  beforeEach(() => {
    const d = defaults();
    d.vehicles = [
      { id: 'v1', name: 'Swift' },
      { id: 'v2', name: 'Activa' },
    ];
    setLedger(d);
  });
  it('is the km between two readings over the litres put in at the first', () => {
    S.tx.push(fill('2026-11-01', 1030, 5000, 10), fill('2026-11-08', 900, 5080, 9));
    const { legs, open } = fuelTrack('v1');
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({ km: 80, litres: 10, cost: 1030, kmpl: 8 });
    expect(kmpl(legs[0].kmpl)).toBe('8 km/L');
    expect(open).toMatchObject({ litres: 9, complete: true });
    expect(legKm(open!, 5200)).toBe(120);
  });
  it('has nothing to show for one reading, or for a vehicle that is not tracked', () => {
    S.tx.push(fill('2026-11-01', 1030, 5000, 10), fill('2026-11-02', 300, undefined, undefined, 'v2'));
    expect(fuelTrack('v1').legs).toEqual([]);
    expect(fuelTrack('v2')).toEqual({ legs: [], open: null });
  });
  it('adds the litres of fills made between two readings', () => {
    S.tx.push(fill('2026-11-01', 1000, 5000, 10), fill('2026-11-04', 500, undefined, 5), fill('2026-11-08', 900, 5300));
    expect(fuelTrack('v1').legs[0]).toMatchObject({ km: 300, litres: 15, cost: 1500, kmpl: 20 });
  });
  it('gives no mileage when a fill in between has no litres, or the odometer goes backwards', () => {
    S.tx.push(fill('2026-11-01', 1000, 5000, 10), fill('2026-11-04', 500), fill('2026-11-08', 900, 5300, 9));
    S.tx.push(fill('2026-11-12', 900, 5200, 9), fill('2026-11-16', 900, 5380, 9));
    const { legs } = fuelTrack('v1');
    expect(legs.map(l => l.km)).toEqual([180]);
    expect(avgKmpl(legs)).toBe(20);
  });
  it('averages legs as total km over total litres and keeps vehicles apart', () => {
    S.tx.push(fill('2026-11-01', 1000, 5000, 10), fill('2026-11-08', 500, 5100, 5), fill('2026-11-12', 900, 5200, 9));
    S.tx.push(fill('2026-11-03', 200, 900, 2, 'v2'), fill('2026-11-09', 200, 1000, 2, 'v2'));
    expect(avgKmpl(fuelTrack('v1').legs)).toBeCloseTo(200 / 15);
    expect(fuelTrack('v2').legs[0].kmpl).toBe(50);
  });
  it('keeps the readings through migrate and leaves other expenses without them', () => {
    const d = migrate({
      tx: [
        { id: 'a', amount: 1030, category: 'Fuel', date: '2026-11-01', odo: '5000.04', litres: 10.456 },
        { id: 'b', amount: 50, category: 'Food', date: '2026-11-01', odo: -4, litres: 'x' },
      ],
    });
    expect(d.tx[0]).toMatchObject({ odo: 5000, litres: 10.46 });
    expect('odo' in d.tx[1] || 'litres' in d.tx[1]).toBe(false);
  });
  it('reads typed numbers', () => {
    expect(posNum('5,080')).toBe(5080);
    expect(posNum(' 10.5 ')).toBe(10.5);
    expect(posNum('abc')).toBe(0);
    expect(posNum('-3')).toBe(0);
  });
});
