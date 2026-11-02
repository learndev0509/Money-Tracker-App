import { describe, expect, it } from 'vitest';
import { calcEval, parseAmt } from '../../src/lib/calc';
import {
  addMonths,
  compact,
  daysInMonth,
  fmtTime,
  longDate,
  money,
  monthLabel,
  pct,
  shortDate,
} from '../../src/lib/dates';
import { esc, norm, ordinal } from '../../src/lib/constants';

describe('calcEval', () => {
  it.each([
    ['12+8', 20],
    ['1+2*3', 7],
    ['10/4', 2.5],
    ['100*18%', 18],
    ['1,200+300', 1500],
    ['2×3÷4', 1.5],
    ['-5+10', 5],
    ['₹ 250 + 50', 300],
    ['7.5*2', 15],
  ])('%s = %d', (expr, v) => {
    expect(calcEval(expr)).toBe(v);
  });
  it('rejects incomplete or foreign input', () => {
    expect(calcEval('5-')).toBeNaN();
    expect(calcEval('abc')).toBeNaN();
    expect(calcEval('')).toBeNaN();
    expect(calcEval('1++2')).toBeNaN();
  });
});
describe('parseAmt', () => {
  it('reads a typed amount, with or without arithmetic', () => {
    expect(parseAmt('₹1,250.50')).toBe(1250.5);
    expect(parseAmt('100+50')).toBe(150);
    expect(parseAmt('')).toBeNaN();
  });
});
describe('money and compact', () => {
  it('formats rupees with lakh grouping and only shows paise when present', () => {
    expect(money(1234567)).toBe('₹12,34,567');
    expect(money(10.5)).toBe('₹10.50');
    expect(money(0)).toBe('₹0');
  });
  it('shortens large numbers the Indian way', () => {
    expect(compact(150000)).toBe('₹1.5L');
    expect(compact(100000)).toBe('₹1L');
    expect(compact(12500000)).toBe('₹1.25Cr');
    expect(compact(10000000)).toBe('₹1Cr');
    expect(compact(2500)).toBe('₹2.5k');
    expect(compact(15000)).toBe('₹15k');
    expect(compact(999)).toBe('₹999');
    expect(compact(-500)).toBe('-₹500');
  });
  it('pct rounds and survives a zero base', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(5, 0)).toBe(0);
  });
});
describe('dates', () => {
  it('labels months, days and times', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
    expect(shortDate('2026-10-30')).toBe('Fri 30 Oct');
    expect(longDate('2026-10-30')).toBe('Friday, 30 October 2026');
    expect(fmtTime('13:05')).toBe('1:05 pm');
    expect(fmtTime('00:05')).toBe('12:05 am');
    expect(fmtTime('')).toBe('');
  });
  it('walks months and knows leap years', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
  });
});
describe('small helpers', () => {
  it('escapes HTML, normalises search text and writes ordinals', () => {
    expect(esc('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
    expect(norm('J&K Bank!')).toBe('j and k bank');
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(31)).toBe('31st');
  });
});
