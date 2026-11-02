/*
 * Golden snapshots: every screen and sheet rendered from the fixture ledger under a frozen clock,
 * compared character for character with the files in tests/golden/. A refactor that changes any
 * output fails here in milliseconds, without a browser. When a change to the output is intended,
 * review the diff and run `npx vitest run -u` to accept it.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrate } from '../../src/data/model';
import { setLedger } from '../../src/data/storage';
import { thisMonth, today } from '../../src/lib/dates';
import { form, fuel, hf, ui } from '../../src/ui/state';
import { rAdd } from '../../src/screens/add';
import { rDash } from '../../src/screens/dashboard';
import { rHist } from '../../src/screens/history';
import { rSettings } from '../../src/screens/settings';
import { sheetContent } from '../../src/screens/sheets';
import { setMethodOn } from '../../src/ui/pay';
import { backupBanner, budgetBanner, installStepsHTML } from '../../src/ui/shared';
import { csvText } from '../../src/reports/backup';
import { monthReportPDF } from '../../src/reports/pdf';
import backup from '../fixtures/backup-1.8.0.json';

const golden = (name: string) => `../golden/${name}`;
const SHEETS = ['tx|t1', 'tx|t6', 'tx|missing', 'inc|i1', 'day|2026-10-05', 'day|2026-10-06', 'cat|2026-10|Food', 'cat|2026-10|Shopping', 'cat|2026-10|Health', 'acct|2026-10|a-regalia', 'acct|2026-10|a-hdfc|upi', 'acct|2026-10|cash', 'month|2026-10', 'month|2026-09', 'month|2026-07', 'trend|2026-10', 'veh|2026-10|v1', 'cash|list', 'cashform|withdrawal', 'cashform|adjust', 'incomeform|new', 'incomeform|i1', 'edit|t2', 'recur|new', 'recur|r1', 'pick|bank|form', 'pick|card|settings', 'pick|card|fuel', 'calc|form', 'pin|set', 'pin|change', 'pin|remove', 'privacy|app', 'terms|app', 'install|how'];

function resetUi() {
  Object.assign(ui, { view: 'dashboard', period: thisMonth(), histYear: +today().slice(0, 4), histMonth: +today().slice(5, 7), histQuery: '', pending: null, sheetStack: [], pickQuery: '', fuelAddingVeh: false, fuelOpen: false, calcExpr: '', calcTarget: 'form', editTx: null, editRec: null, editCash: null, editIncome: null, pinEntry: '', hiddenAt: 0, undoToken: null, installHintHidden: false, unlocking: false });
  Object.assign(form, { amount: '', category: '', method: 'cash', accountId: 'cash', lastBank: '', lastCard: '', lastOnline: '', note: '', backdate: false, date: '', time: '' });
  Object.assign(fuel, { vehicleId: '', accountId: '', amount: '' });
  Object.assign(hf, { method: '', cat: '', sort: 'new' });
}

beforeAll(() => { vi.useFakeTimers({ now: new Date(2026, 9, 30, 18, 30, 0), toFake: ['Date'] }); });
afterAll(() => { vi.useRealTimers(); });
beforeEach(() => { setLedger(migrate(JSON.parse(JSON.stringify(backup)))); resetUi(); });

describe('screens', () => {
  it('dashboard, this month', async () => { await expect(rDash()).toMatchFileSnapshot(golden('dashboard.html')); });
  it('dashboard, last month', async () => { ui.period = '2026-09'; await expect(rDash()).toMatchFileSnapshot(golden('dashboard-previous-month.html')); });
  it('dashboard, empty month', async () => { ui.period = '2026-07'; await expect(rDash()).toMatchFileSnapshot(golden('dashboard-empty-month.html')); });
  it('add', async () => { await expect(rAdd()).toMatchFileSnapshot(golden('add.html')); });
  it('add with the fuel card open', async () => { ui.fuelOpen = true; form.category = 'Fuel'; await expect(rAdd()).toMatchFileSnapshot(golden('add-fuel.html')); });
  it('add with a card chosen, a note being typed and backdating on', async () => {
    setMethodOn(form, 'online'); setMethodOn(form, 'card'); form.accountId = 'a-regalia'; form.note = 'sw'; form.backdate = true; form.date = '2026-10-28'; form.time = '09:15';
    await expect(rAdd()).toMatchFileSnapshot(golden('add-card-note-backdate.html'));
  });
  it('history', async () => { await expect(rHist()).toMatchFileSnapshot(golden('history.html')); });
  it('history with a search', async () => { ui.histQuery = 'swiggy'; await expect(rHist()).toMatchFileSnapshot(golden('history-search.html')); });
  it('history sorted by amount and filtered to cards', async () => { hf.sort = 'high'; hf.method = 'card'; await expect(rHist()).toMatchFileSnapshot(golden('history-sort-high-cards.html')); });
  it('history, oldest first, a month with nothing', async () => { hf.sort = 'old'; ui.histMonth = 7; await expect(rHist()).toMatchFileSnapshot(golden('history-oldest-empty.html')); });
  it('settings', async () => { await expect(rSettings()).toMatchFileSnapshot(golden('settings.html')); });
  it('settings with a delete pending', async () => { ui.pending = 'acct:a-old'; await expect(rSettings()).toMatchFileSnapshot(golden('settings-delete-pending.html')); });
});

describe('sheets', () => {
  for (const d of SHEETS) {
    it(d, async () => {
      ui.sheetStack = [d];
      const r = sheetContent(d);
      await expect(JSON.stringify({ title: r.title, sub: r.sub, tall: r.tall, focus: r.focus }) + '\n' + r.body).toMatchFileSnapshot(golden('sheet-' + d.replace(/[^a-z0-9]+/gi, '_') + '.html'));
    });
  }
  it('bank picker with a search', async () => { ui.sheetStack = ['pick|bank|form']; ui.pickQuery = 'sbi'; await expect(sheetContent('pick|bank|form').body).toMatchFileSnapshot(golden('sheet-pick-bank-search.html')); });
  it('card picker with no match', async () => { ui.sheetStack = ['pick|card|form']; ui.pickQuery = 'zzz'; await expect(sheetContent('pick|card|form').body).toMatchFileSnapshot(golden('sheet-pick-card-nomatch.html')); });
  it('calculator with an expression', async () => { ui.sheetStack = ['calc|form']; ui.calcExpr = '1200+300×2'; await expect(sheetContent('calc|form').body).toMatchFileSnapshot(golden('sheet-calc-expression.html')); });
});

describe('pieces and reports', () => {
  it('banners and install steps', async () => { await expect(backupBanner() + '\n' + budgetBanner() + '\n' + installStepsHTML()).toMatchFileSnapshot(golden('banners.html')); });
  it('CSV', async () => { await expect(csvText()).toMatchFileSnapshot(golden('export.csv')); });
  it('PDF report', async () => { const { bytes, name } = monthReportPDF('2026-10'); expect(name).toBe('money-tracker-2026-10.pdf'); await expect(Buffer.from(bytes).toString('latin1')).toMatchFileSnapshot(golden('report-2026-10.pdf')); });
});
