import { test, expect } from '@playwright/test';
import { App } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;
test.beforeAll(async ({ browser }) => { app = await App.open(browser, 'round3'); await app.goto(); await app.finishWelcome('Shreya'); });
test.afterAll(async () => { await app?.close(); });

const page = () => app.page;
const payBlock = () => app.page.locator('#pay-block');
const upi = () => app.page.locator('#pay-block [data-method="upi"]');
const hdfcId = async () => (await app.data()).accounts.find((a: any) => a.name === 'HDFC Bank').id;

test('Online offers bank, UPI and card; UPI asks for the bank', async () => {
  await app.add(); await app.click('[data-method="online"]');
  await expect(upi()).toHaveCount(1);
  await expect(payBlock().locator('.seg3')).toHaveCount(1);
  await upi().click();
  await expect(payBlock().locator('.picker .pk-l')).toContainText('UPI · Bank');
  await expect(payBlock().locator('.picker')).toHaveAttribute('data-open-pick', 'bank');
});

test('choosing the bank keeps UPI selected and the expense saves as UPI on that bank', async () => {
  await app.click('[data-open-pick="bank"]'); await app.pick('hdfc', 'HDFC Bank');
  await expect(upi()).toHaveClass(/\bon\b/);
  await app.addExpense('250', 'Food', 'Swiggy');
  const d = await app.data();
  expect(d.tx[0].method).toBe('upi');
  expect(d.tx[0].accountId).toBe(await hdfcId());
  await expect(app.recent).toContainText('UPI · HDFC Bank');
  await expect(upi()).toHaveClass(/\bon\b/);
});

test('a note suggestion restores UPI and its bank', async () => {
  await app.click('[data-method="bank"]'); await app.addExpense('1000', 'Bills', 'Electricity');
  await app.click('[data-method="cash"]'); await app.fill('#f-note', 'sw'); await app.click('#note-suggest [data-note="Swiggy"]');
  await expect(upi()).toHaveClass(/\bon\b/);
  await expect(payBlock().locator('.picker .pk-v')).toContainText('HDFC Bank');
  await app.fill('#f-amount', '150'); await app.click('#save-tx');
});

test('the dashboard splits UPI from Bank and the bank row carries the account total', async () => {
  await app.tab('dashboard');
  const dash = await app.text('#main');
  expect(dash).toMatch(/UPI ₹400/); expect(dash).toMatch(/Bank ₹1,000/);
  const flat = dash.replace(/\s+/g, '');
  expect(flat).toMatch(/BankaccountsHDFCBank3expenses100%₹1,400/);
  expect(flat).toMatch(/UPIHDFCBank2expenses29%₹400/);
  await app.shot('01-upi-dashboard');
});

test('the UPI row opens the bank filtered to UPI and the expense sheet labels UPI with its bank', async () => {
  await app.click(`.prow[data-detail="acct|${app.thisMonth()}|${await hdfcId()}|upi"]`);
  await expect(app.sheetHead).toContainText('HDFC Bank · UPI');
  await expect(app.sheetBody).toContainText('₹400');
  await expect(app.sheetBody).not.toContainText('Electricity');
  await app.click('#sheet .txrow');
  await expect(app.sheetBody).toContainText('Online · UPI');
  await expect(app.sheetBody).toContainText('Bank');
  await app.click('#sheet button[data-close]');
});

test('the History payment filter narrows to UPI rows', async () => {
  await app.tab('history'); await app.select('#h-method', 'upi');
  const body = page().locator('#hist-body');
  await expect(body).toContainText('2 expenses · filtered');
  await expect(body).toContainText('Swiggy'); await expect(body).not.toContainText('Electricity'); await expect(body).toContainText('UPI');
  await app.click('#hist-filters [data-hf-clear]');
});

test('the CSV separates payment and account for UPI', async () => {
  await app.tab('settings');
  const csv = await app.copyCsv();
  expect(csv).toMatch(/Online · UPI,HDFC Bank,Swiggy/);
});

test('a recurring expense can be on UPI and keeps the remembered bank', async () => {
  await app.click('[data-detail="recur|new"]'); await app.fill('#e-amount', '499'); await app.click('#sheet .chip[data-cat="Entertainment"]'); await app.fill('#e-note', 'Netflix');
  await app.click('#sheet [data-method="upi"]');
  await expect(app.sheet.locator('[data-method="upi"]')).toHaveClass(/\bon\b/);
  await expect(app.sheet.locator('.picker .pk-v')).toContainText('HDFC Bank');
  // due today, so it is added at once whatever the date (the original suite used the 28th and only passed late in a month)
  await app.select('#e-day', String(new Date().getDate())); await app.select('#e-since', 'this'); await app.click('#sheet [data-save-recur]');
  await expect(app.main).toContainText('Netflix');
  await expect(app.main).toContainText('UPI · HDFC Bank');
});

test('the income form offers From chips and cash or bank only, pre-picking the remembered bank', async () => {
  await app.add(); await app.click('[data-detail="incomeform|new"]');
  await expect(app.sheet.locator('.chip[data-cat="Salary"]')).toHaveCount(1);
  await expect(app.sheet.locator('[data-method="cash"]')).toHaveCount(1);
  await expect(app.sheet.locator('[data-method="upi"], [data-method="card"]')).toHaveCount(0);
  await expect(app.sheet.locator('.picker .pk-v')).toContainText('HDFC Bank');
});

test('salary saves to income, not to expenses', async () => {
  await app.fill('#e-amount', '50000'); await app.click('#sheet .chip[data-cat="Salary"]'); await app.fill('#e-note', 'October'); await app.click('#sheet [data-save-income]');
  const d = await app.data();
  expect(d.income).toHaveLength(1); expect(d.income[0].method).toBe('bank'); expect(d.tx).toHaveLength(4);
  await app.click('[data-detail="incomeform|new"]'); await app.fill('#e-amount', '2000'); await app.click('#sheet .chip[data-cat="Gift"]'); await app.click('#sheet [data-method="cash"]'); await app.click('#sheet [data-save-income]');
});

test('the dashboard shows left to spend against money in, lists both entries and raises cash in hand', async () => {
  await app.tab('dashboard');
  await expect(app.main).toContainText('₹50,101 left of ₹52,000 in');
  await expect(app.main).toContainText('Money in');
  await expect(app.main).toContainText('+₹50,000'); await expect(app.main).toContainText('+₹2,000'); await expect(app.main).toContainText('Salary · October');
  await expect(page().locator('.cash-big')).toContainText('₹2,000');
  await app.shot('02-income-dashboard');
});

test('an income entry opens its sheet, edits in place, deletes with undo', async () => {
  const salary = () => page().locator('.txrow[data-detail^="inc|"]:has-text("Salary")');
  await salary().click();
  await expect(app.sheetHead).toContainText('Money in');
  await expect(app.sheetBody).toContainText('Received into');
  await app.click('#sheet [data-detail^="incomeform|"]'); await app.fill('#e-amount', '55000'); await app.click('#sheet [data-save-income]');
  let d = await app.data();
  expect(d.income.find((t: any) => t.category === 'Salary').amount).toBe(55000); expect(d.income).toHaveLength(2);
  await salary().click(); await app.click('#sheet [data-del-inc]');
  await expect(app.toastText).toContainText('Deleted ₹55,000');
  expect((await app.data()).income).toHaveLength(1);
  await app.toastBtn.click();
  await app.expectStored(d => d.income.length === 2, 'undo restores the income');
  await app.click('.cashcard [data-detail="cash|list"]');
  await expect(app.sheetBody).toContainText('Received · Gift');
  await app.click('#sheet button[data-close]');
});

test('a recurring entry can be money in and is added this month with the auto tag', async () => {
  await app.tab('settings');
  await app.click('[data-detail="recur|new"]'); await app.click('#sheet [data-kind="income"]');
  await expect(app.sheet.locator('.chip[data-cat="Salary"]')).toHaveCount(1);
  await expect(app.sheet.locator('[data-method="upi"]')).toHaveCount(0);
  await expect(app.sheet.locator('[data-save-recur]')).toContainText('Add recurring income');
  await app.fill('#e-amount', '60000'); await app.click('#sheet .chip[data-cat="Salary"]'); await app.fill('#e-note', 'Pay day');
  await app.select('#e-day', '1'); await app.select('#e-since', 'this'); await app.click('#sheet [data-save-recur]');
  const d = await app.data();
  expect(d.income.some((t: any) => t.recurringId && t.amount === 60000 && t.date.endsWith('-01'))).toBe(true);
  expect(d.recurring.some((r: any) => r.kind === 'income')).toBe(true);
  await expect(app.main).toContainText('Pay day');
  await expect(app.main.locator('.txrow .tag').first()).toContainText('in');
});

test('the CSV has a Type column with income rows, and a reload does not duplicate the salary', async () => {
  const csv = await app.copyCsv();
  expect(csv).toMatch(/^﻿?Date,Time,Weekday,Type,/);
  expect(csv).toMatch(/,Income,60000,Salary,Online · Bank account,HDFC Bank,Pay day,yes/);
  await app.reload();
  expect((await app.data()).income.filter((t: any) => t.recurringId)).toHaveLength(1);
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
