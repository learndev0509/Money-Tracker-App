import { describe, expect, it } from 'vitest';
import { APP_VERSION, ERR_KEY } from '../../src/lib/constants';
import { clearErrors, problemReport, readErrors, recordError } from '../../src/lib/errors';

describe('crash log', () => {
  it('keeps the newest fifty errors, trimmed, and nothing else', () => {
    for (let i = 0; i < 60; i++)
      recordError(
        'boom ' + i,
        'Error: boom\n    at a\n    at b\n    at c\n    at d\n    at e\n    at f\n    at g',
        '#add',
      );
    const list = readErrors();
    expect(list).toHaveLength(50);
    expect(list[0].msg).toBe('boom 59');
    expect(list[0].version).toBe(APP_VERSION);
    expect(list[0].stack.split('\n')).toHaveLength(6);
    expect(list[0].where).toBe('#add');
  });
  it('survives junk in storage and clears', () => {
    localStorage.setItem(ERR_KEY, 'not json');
    expect(readErrors()).toEqual([]);
    recordError('x');
    expect(readErrors()).toHaveLength(1);
    clearErrors();
    expect(readErrors()).toEqual([]);
  });
  it('writes a report with the version, device facts and the last ten errors', () => {
    for (let i = 0; i < 12; i++) recordError('err ' + i);
    const r = problemReport();
    expect(r).toContain('Money tracker ' + APP_VERSION);
    expect(r).toContain('Browser: vitest');
    expect(r).toContain('Last 10 errors');
    expect(r).toContain('err 11');
    expect(r).not.toContain('err 1\n');
    clearErrors();
    expect(problemReport()).toContain('No errors recorded.');
  });
});
