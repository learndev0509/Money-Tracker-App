import { test, expect } from '@playwright/test';
import { App } from './helpers';

/* Cash in hand: "Set cash in hand" replaces the total and says so; "Cash received" adds to it. */
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

test('below zero, the card points at cash that was never added', async () => {
  await expect(cashBig()).toContainText('₹200');
  await expect(cashBig()).toHaveClass(/\bneg\b/);
  await expect(app.page.locator('.cashcard')).toContainText('Add the cash you received or withdrew');
});

test('Set cash in hand says what it replaces, live, and that it does not add', async () => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await expect(app.sheetHead).toContainText('Set cash in hand');
  await expect(effect()).toHaveText('This replaces the -₹200 in hand. It does not add to it.');
  await app.fill('#e-amount', '5000');
  await expect(effect()).toHaveText('This replaces -₹200 with ₹5,000, ₹5,200 more. It does not add to what you have.');
  await app.click('#sheet [data-save-cash]');
  await app.expectToast(/Cash in hand set to ₹5,000, was -₹200/);
  await expect(cashBig()).toContainText('₹5,000');
});

test('Cash received opens Money in on Cash and Gift and adds to the total', async () => {
  await app.click('.cashcard [data-detail="incomeform|new|cash"]');
  await expect(app.sheetHead).toContainText('Cash received');
  await expect(app.sheetHead).toContainText('Adds to your cash in hand: ₹5,000 now');
  await expect(app.sheet.locator('.chip[data-cat="Gift"]')).toHaveClass(/\bon\b/);
  await expect(app.sheet.locator('[data-method="cash"]')).toHaveClass(/\bon\b/);
  await app.fill('#e-amount', '2000');
  await app.fill('#e-note', 'Given by an uncle');
  await app.click('#sheet [data-save-income]');
  await app.expectToast(/Money in · ₹2,000 · Gift · Cash/);
  await expect(cashBig()).toContainText('₹7,000');
  const d = await app.data();
  expect(d.income.at(-1)).toMatchObject({ amount: 2000, method: 'cash', accountId: 'cash', category: 'Gift' });
  expect(d.cashIn).toHaveLength(1);
});

test('the Set form offers Cash received instead, and warns how much a lower figure drops', async () => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await app.fill('#e-amount', '3000');
  await expect(effect()).toHaveText('This replaces ₹7,000 with ₹3,000, ₹4,000 less. It does not add to what you have.');
  await app.click('#sheet [data-detail="incomeform|new|cash"]');
  await expect(app.sheetHead).toContainText('Cash received');
  await app.fill('#e-amount', '3000');
  await app.click('#sheet [data-save-income]');
  await expect(cashBig()).toContainText('₹10,000');
  expect((await app.data()).cashIn).toHaveLength(1);
});

test('the cash history shows the set as = and the cash received as +', async () => {
  await app.click('.cashcard [data-detail="cash|list"]');
  await expect(app.sheetBody).toContainText('Set to ₹5,000');
  await expect(app.sheetBody).toContainText('Received · Gift');
  await expect(app.sheetBody).toContainText('+₹2,000');
  await app.shot('01-cash-history', false);
  await app.click('#sheet button[data-close]');
});

test('Settings has Cash received beside the withdrawal and the set', async () => {
  await app.tab('settings');
  await expect(app.main.locator('[data-detail="incomeform|new|cash"]')).toBeVisible();
  await expect(app.main.locator('[data-detail="cashform|adjust"]')).toBeVisible();
  await expect(app.main).toContainText('Set cash in hand replaces the total with what you counted.');
});

test('no horizontal scroll and no page errors', async () => {
  await app.tab('dashboard');
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
