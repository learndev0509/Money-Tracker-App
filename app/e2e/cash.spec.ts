import { test, expect } from '@playwright/test';
import { App } from './helpers';

/* Cash in hand: cash added by hand adds to whatever is left; it never replaces the total. */
test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'cash');
  await app.goto();
  await app.finishWelcome('Shreya');
  await app.add();
  await app.addExpense('200', 'Food', 'Chai', 'cash');
  await app.tab('dashboard');
});

test.afterAll(async () => {
  await app?.close();
});

const cashBig = () => app.page.locator('.cashcard .cash-big');
const effect = () => app.page.locator('#cash-effect');
const addCash = async (amount: string, note = '') => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await app.fill('#e-amount', amount);
  if (note) await app.fill('#e-note', note);
  await app.click('#sheet [data-save-cash]');
};

test('below zero, the card says to add the cash you have', async () => {
  await expect(cashBig()).toContainText('₹200');
  await expect(cashBig()).toHaveClass(/\bneg\b/);
  await expect(app.page.locator('.cashcard')).toContainText('Add the cash you have');
  await expect(app.page.locator('.cashcard [data-detail="incomeform|new|cash"]')).toHaveCount(0);
});

test('the form says what the total will be, live', async () => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await expect(app.sheetHead).toContainText('Add cash in hand');
  await expect(effect()).toHaveText('Adds to the -₹200 in hand. Enter cash you were given or already had.');
  await app.fill('#e-amount', '5000');
  await expect(effect()).toHaveText('Adds to the -₹200 in hand: ₹4,800 after this.');
  await app.click('#sheet [data-save-cash]');
  await app.expectToast(/Added ₹5,000 · cash in hand now ₹4,800/);
  await expect(cashBig()).toContainText('₹4,800');
});

test('a second and third entry add to what is left instead of replacing it', async () => {
  await addCash('2000', 'Given by an uncle');
  await expect(cashBig()).toContainText('₹6,800');
  await addCash('500');
  await expect(cashBig()).toContainText('₹7,300');
  const d = await app.data();
  expect(d.cashIn.map((c: any) => [c.kind, c.amount])).toEqual([
    ['adjust', 5000],
    ['adjust', 2000],
    ['adjust', 500],
  ]);
  expect(d.income).toHaveLength(0);
});

test('a cash spend after that comes off the running total', async () => {
  await app.add();
  await app.addExpense('300', 'Transport', 'Auto', 'cash');
  await app.tab('dashboard');
  await expect(cashBig()).toContainText('₹7,000');
});

test('an empty or zero amount is refused', async () => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await app.fill('#e-amount', '0');
  await app.click('#sheet [data-save-cash]');
  await app.expectToast(/Enter an amount/);
  expect((await app.data()).cashIn).toHaveLength(3);
  await app.click('#sheet button[data-close]');
});

test('the cash history lists each entry as cash added, with the running total', async () => {
  await app.click('.cashcard [data-detail="cash|list"]');
  await expect(app.sheetBody).toContainText('Cash added · Given by an uncle');
  await expect(app.sheetBody).toContainText('+₹2,000');
  await expect(app.sheetBody).toContainText('after this ₹6,800');
  await expect(app.sheetBody).not.toContainText('Set to');
  await app.shot('01-cash-history', false);
  await app.click('#sheet button[data-close]');
});

test('removing an entry takes its amount back off', async () => {
  await app.click('.cashcard [data-detail="cash|list"]');
  await app.click('#sheet [data-ask^="cash:"]');
  await app.click('#sheet [data-del-cash]');
  await app.expectStored(d => d.cashIn.length === 2, 'one entry removed');
  await app.click('#sheet button[data-close]');
  await expect(cashBig()).toContainText('₹6,500');
});

test('Settings offers the withdrawal and Add cash in hand, nothing else', async () => {
  await app.tab('settings');
  await expect(app.main.locator('[data-detail="cashform|adjust"]')).toHaveText('Add cash in hand');
  await expect(app.main.locator('[data-detail="incomeform|new|cash"]')).toHaveCount(0);
});

test('no horizontal scroll and no page errors', async () => {
  await app.tab('dashboard');
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
