import { test, expect } from '@playwright/test';
import { App } from './helpers';

/* Fuel mileage: optional odometer and litres on the Fuel card, and where the km/L then shows. */
test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'mileage');
  await app.goto();
  await app.finishWelcome('Shreya');
  await app.add();
  await app.click('#fuel-toggle');
  await app.fill('#veh-name', 'Swift');
  await app.click('#veh-add');
  await app.click('#fuel-card [data-fuel-method="cash"]');
});

test.afterAll(async () => {
  await app?.close();
});

const card = () => app.page.locator('#fuel-card');
const link = () => card().locator('[data-fuel-mileage]');
const amount = () => app.page.locator('#fuel-amount');
const odo = () => app.page.locator('#fuel-odo');
const litres = () => app.page.locator('#fuel-litres');
const hint = () => app.page.locator('#fuel-kmpl');
const saveBtn = () => app.page.locator('#fuel-save');

test('mileage is optional: its fields stay closed and a plain fill saves without readings', async () => {
  await expect(link()).toHaveText('Check mileage? Add odometer and litres');
  await expect(odo()).toHaveCount(0);
  await amount().fill('200');
  await saveBtn().click();
  await app.expectToast(/Fuel ₹200 · Swift · Cash$/);
  const t = (await app.data()).tx[0];
  expect('odo' in t || 'litres' in t).toBe(false);
  await expect(odo()).toHaveCount(0);
});

test('the link opens odometer and litres, and closes them again', async () => {
  await link().click();
  await expect(odo()).toBeFocused();
  await expect(litres()).toBeVisible();
  await expect(hint()).toContainText('Optional. Enter the odometer reading and the litres');
  await link().click();
  await expect(odo()).toHaveCount(0);
  await link().click();
});

test('the first reading is stored and promises mileage at the next fill', async () => {
  await amount().fill('1030');
  await odo().fill('5000');
  // without the litres this reading could never give a mileage, so the hint asks for them
  await expect(hint()).toHaveText('First reading for Swift. Add the litres too, or the next fill cannot show mileage.');
  await litres().fill('10');
  await expect(hint()).toHaveText('First reading for Swift. Mileage shows at the next fill · ₹103 a litre');
  await saveBtn().click();
  await app.expectToast(/Fuel ₹1,030 · Swift · Cash$/);
  expect((await app.data()).tx.at(-1)).toMatchObject({ amount: 1030, odo: 5000, litres: 10 });
});

test('the fields stay open for a tracked vehicle, cleared, with the last reading shown', async () => {
  await expect(odo()).toHaveValue('');
  await expect(litres()).toHaveValue('');
  await expect(hint()).toContainText('Last reading 5,000 km on ');
});

test('an odometer at or below the last reading is refused', async () => {
  await amount().fill('900');
  await litres().fill('9');
  await odo().fill('4900');
  await expect(hint()).toContainText('The odometer should read more than last time, 5,000 km');
  await saveBtn().click();
  await app.expectToast(/The odometer should read more than last time, 5,000 km/);
  expect((await app.data()).tx).toHaveLength(2);
});

test('5,000 to 5,080 km on 10 litres is 8 km/L, shown live and in the saved toast', async () => {
  await odo().fill('5080');
  await expect(hint()).toHaveText(/^80 km on 10 L since .+ · 8 km\/L · ₹12\.88 a km · ₹100 a litre$/);
  await saveBtn().click();
  await app.expectToast(/Fuel ₹900 · Swift · Cash · 8 km\/L/);
  expect((await app.data()).tx.at(-1)).toMatchObject({ amount: 900, odo: 5080, litres: 9 });
});

test('a fill with litres but no odometer adds to the fuel used on the next reading', async () => {
  await amount().fill('100');
  await litres().fill('1');
  await saveBtn().click();
  await expect.poll(async () => (await app.data()).tx.length).toBe(4);
  await odo().fill('5180');
  // 9 L at 5,080 km plus the 1 L top-up: 100 km on 10 L
  await expect(hint()).toContainText('100 km on 10 L since ');
  await expect(hint()).toContainText('10 km/L');
  await odo().fill('');
  await app.shot('01-mileage-card');
});

test('the expense sheet shows the reading, the litres and the mileage that fill gave', async () => {
  const id = (await app.data()).tx.find((t: any) => t.odo === 5000).id;
  await app.page.evaluate(() => window.scrollTo(0, 0));
  await app.tab('history');
  await app.click(`[data-detail="tx|${id}"]`);
  const body = (await app.text('#sheet-body')).replace(/\s+/g, ' ');
  expect(body).toContain('Odometer5,000 km');
  expect(body).toContain('Litres10 L · ₹103 a litre');
  expect(body).toContain('Mileage8 km/L · 80 km on 10 L');
  expect(body).toContain('Cost per km₹12.88');
});

test('the edit sheet corrects a reading and the mileage follows', async () => {
  await app.click('#sheet [data-detail^="edit|"]');
  await expect(app.page.locator('#e-odo')).toHaveValue('5000');
  await expect(app.page.locator('#e-litres')).toHaveValue('10');
  await app.fill('#e-odo', '4980');
  await app.click('#sheet [data-save-edit]');
  await app.expectToast(/Saved changes/);
  await app.expectStored(d => d.tx.some((t: any) => t.odo === 4980), 'the corrected odometer is stored');
});

test('the Month screen and the vehicle sheet carry the km/L', async () => {
  await app.tab('dashboard');
  // after the correction: 4,980 to 5,080 km on 10 L
  await expect(app.page.locator('.prow[data-detail^="veh|"]')).toContainText('10 km/L');
  await app.click('.prow[data-detail^="veh|"]');
  const body = (await app.text('#sheet-body')).replace(/\s+/g, ' ');
  expect(body).toContain('Mileage');
  expect(body).toMatch(/This month\s*10 km\/L/);
  expect(body).toMatch(/All time\s*10 km\/L/);
  expect(body).toMatch(/Km driven\s*100/);
  await app.shot('02-mileage-vehicle', false);
  await app.click('#sheet button[data-close]');
});

test('the readings survive a reload', async () => {
  await app.reload();
  const d = await app.data();
  expect(d.tx.filter((t: any) => t.odo).map((t: any) => t.odo)).toEqual([4980, 5080]);
  expect(d.tx.filter((t: any) => t.litres).map((t: any) => t.litres)).toEqual([10, 9, 1]);
});

test('no horizontal scroll and no page errors', async () => {
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
