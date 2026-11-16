import { test, expect } from '@playwright/test';
import { App } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'fuel');
  await app.goto();
  await app.finishWelcome('Shreya');
  await app.add();
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
const card = () => app.page.locator('#fuel-card');
const toggle = () => app.page.locator('#fuel-toggle');
const vehicleOn = () => app.page.locator('#fuel-card .chip[data-veh].on .t');
const cardOn = () => app.page.locator('#fuel-card .chip[data-fuel-acct].on .t');
const amount = () => app.page.locator('#fuel-amount');
const saveBtn = () => app.page.locator('#fuel-save');

test('the fuel card is hidden by default behind a Fuel button', async () => {
  await expect(card()).toHaveCount(0);
  await expect(toggle()).toBeVisible();
  await expect(page().locator('#cat-chips .chip.on')).toHaveAttribute('data-cat', 'Food');
});

test('the Fuel button opens the card first on Add, asks for a vehicle and selects the Fuel category', async () => {
  await toggle().click();
  await expect(card().locator('#veh-name')).toBeVisible();
  await expect(page().locator('#main .view > :nth-child(2)')).toHaveId('fuel-card');
  await expect(toggle()).toHaveClass(/\bon\b/);
  await expect(page().locator('#cat-chips .chip.on')).toHaveAttribute('data-cat', 'Fuel');
});

test('the close button hides the card', async () => {
  await card().locator('[data-fuel-close]').click();
  await expect(card()).toHaveCount(0);
  await expect(toggle()).not.toHaveClass(/\bon\b/);
});

test('a vehicle is added with Enter and selected; without a card the button asks for one', async () => {
  await toggle().click();
  await app.fill('#veh-name', 'Swift');
  await page().press('#veh-name', 'Enter');
  await expect(vehicleOn()).toHaveText('Swift');
  expect((await app.data()).vehicles).toHaveLength(1);
  await expect(card()).toContainText('Choose the credit card…');
});

test('the picker returns to the fuel card with the card chosen', async () => {
  await card().locator('[data-open-pick="card"]').click();
  await app.pick('regalia gold', 'HDFC Bank Regalia Gold');
  await expect(app.sheet).toBeHidden();
  await expect(cardOn()).toHaveText('HDFC Bank Regalia Gold');
});

test('the save button reads the whole fill', async () => {
  await amount().fill('2000');
  await expect(saveBtn()).toHaveText(/Log fuel · ₹2,000 · Swift · HDFC Bank Regalia Gold/);
});

test('a fill saves as a Fuel expense on the card with the vehicle', async () => {
  await saveBtn().click();
  await expect(saveBtn()).toContainText('Saved');
  const d = await app.data();
  expect(d.tx).toHaveLength(1);
  expect(d.tx[0]).toMatchObject({ category: 'Fuel', method: 'card', vehicleId: d.vehicles[0].id });
  await expect(app.recent).toContainText('Fuel · Swift');
});

test('the amount clears after a save, ready for the next fill', async () => {
  await expect(amount()).toHaveValue('');
  await expect(card()).toContainText('₹2,000 this month · 1 fill');
  await expect(saveBtn()).toHaveText(/^Log fuel · Swift · HDFC Bank Regalia Gold$/);
});

test('a second vehicle starts blank and can use another card', async () => {
  await card().locator('[data-veh-new]').click();
  await app.fill('#veh-name', 'Activa');
  await app.click('#veh-add');
  await expect(vehicleOn()).toHaveText('Activa');
  await expect(amount()).toHaveValue('');
  await expect(cardOn()).toHaveText('HDFC Bank Regalia Gold');
  await card().locator('[data-open-pick="card"]').click();
  await app.pick('amex platinum travel', 'American Express Platinum Travel');
  await amount().fill('300');
  await saveBtn().click();
  await expect(saveBtn()).toHaveText(/^Log fuel · Activa · American Express Platinum Travel$/);
  await expect(card().locator('.chip[data-fuel-acct]')).toHaveCount(2);
});

test('switching vehicle restores its own last card and keeps the amount empty', async () => {
  await card().locator('.chip[data-veh]:has-text("Swift")').click();
  await expect(amount()).toHaveValue('');
  await expect(cardOn()).toHaveText('HDFC Bank Regalia Gold');
});

test('closing the card clears the typed amount and the vehicle box', async () => {
  await amount().fill('123');
  await card().locator('[data-veh-new]').click();
  await app.fill('#veh-name', 'Scrap');
  await card().locator('[data-fuel-close]').click();
  await toggle().click();
  await expect(amount()).toHaveValue('');
  await expect(card().locator('#veh-name')).toHaveCount(0);
  expect((await app.data()).vehicles).toHaveLength(2);
});

test('fuel stays open across screens and a statement day shows the bill on the card chip and the hint', async () => {
  await app.tab('settings');
  const amex = (await app.data()).accounts.find((a: any) => a.name === 'American Express Platinum Travel').id;
  await app.select(`select[data-stmt="${amex}"]`, '15');
  await expect(app.main).toContainText('this bill so far');
  await app.add();
  await expect(card()).toBeVisible();
  await card().locator(`.chip[data-fuel-acct="${amex}"]`).click();
  await amount().fill('2000');
  await expect(card()).toContainText(/American Express Platinum Travel\s*bill so far ₹300/);
  await expect(page().locator('#fuel-hint')).toContainText(
    /After this, American Express Platinum Travel bill so far ₹2,300 \(closes 15 /,
  );
  await amount().fill('');
  await app.shot('01-fuel-card');
});

test('the Month screen has the Fuel card with totals, the fill map and per-vehicle rows', async () => {
  await app.tab('dashboard');
  const m = await app.text('#main');
  expect(m).toMatch(/Fuel/);
  expect(m).toMatch(/Filled on 1 of \d+ days/);
  expect(m.replace(/\s+/g, '')).toMatch(/Fills2/);
  expect(m).toMatch(/₹2,300/);
  await expect(page().locator('.fdays .fd.on.today')).toHaveCount(1);
  const now = new Date();
  await expect(page().locator('.fdays .fd')).toHaveCount(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  expect(m).toMatch(/Swift/);
  expect(m).toMatch(/Activa/);
  expect(m).toMatch(/1 fill · ₹2,000 each/);
  expect(m).toMatch(/American Express Platinum Travel · fuel is ₹300 of this bill/);
});

test('the vehicle sheet lists the fills', async () => {
  await app.click('.prow[data-detail^="veh|"]');
  await expect(app.sheetHead).toContainText('Swift · fuel');
  await expect(app.sheetBody).toContainText('Fills');
  await expect(app.sheetBody).toContainText('₹2,000');
  await app.click('#sheet button[data-close]');
  await app.shot('02-fuel-month');
});

test('removing a vehicle keeps its fills', async () => {
  await app.tab('settings');
  await app.click('[data-del-veh]');
  await app.expectStored(d => d.vehicles.length === 1 && d.tx.length === 2, 'one vehicle left, both fills kept');
});

test('no horizontal scroll and no page errors', async () => {
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
