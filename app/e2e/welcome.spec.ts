import { test, expect } from '@playwright/test';
import { App, KEY } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;
test.beforeAll(async ({ browser }) => { app = await App.open(browser, 'welcome'); await app.goto(); });
test.afterAll(async () => { await app?.close(); });

test('welcome shows on first run with brand and app name', async () => {
  await expect(app.welcome).toBeVisible();
  await expect(app.welcome).toContainText('Money tracker');
  await expect(app.welcome).toContainText('Zestera');
  await app.shot('01-welcome');
});

test('an empty first name is blocked', async () => {
  await app.click('#w-go');
  await expect(app.welcome).toBeVisible();
  await expect(app.toast).toContainText(/first name/);
});

test('Enter in the last name finishes the welcome and shows the dashboard', async () => {
  await app.fill('#w-first', 'Shreya'); await app.fill('#w-last', 'Sanghavi'); await app.page.press('#w-last', 'Enter');
  await expect(app.welcome).toBeHidden();
  await expect(app.page.locator('nav .tab.on')).toHaveAttribute('data-go', 'dashboard');
  await expect(app.page.locator('.g-hi')).toHaveText(/^Good (morning|afternoon|evening), Shreya!$/);
  await expect(app.page.locator('.avatar')).toHaveText('SS');
  await app.shot('02-dashboard-greeting', false);
});

test('welcome does not show again after a reload', async () => {
  await app.reload();
  await expect(app.welcome).toBeHidden();
});

test('the avatar opens Settings with the profile, and a rename changes the greeting', async () => {
  await app.click('.avatar');
  await expect(app.main).toContainText('Profile');
  await expect(app.page.locator('input[data-profile="firstName"]')).toHaveValue('Shreya');
  await app.fill('input[data-profile="firstName"]', 'Shreyaa'); await app.page.dispatchEvent('input[data-profile="firstName"]', 'change');
  await app.tab('dashboard');
  await expect(app.page.locator('.g-hi')).toContainText('Shreyaa!');
});

test('the old storage key is picked up', async () => {
  await app.page.evaluate(k => { const d = localStorage.getItem(k)!; localStorage.removeItem(k); localStorage.setItem('rupee-ledger.v1', d); }, KEY);
  await app.reload();
  await expect(app.welcome).toBeHidden();
  await expect(app.page.locator('.g-hi')).toContainText('Shreyaa');
});

test('a restore without a name brings the welcome back', async () => {
  await app.patch(d => { d.profile = { firstName: '', lastName: '' }; });
  await app.reload();
  await expect(app.welcome).toBeVisible();
  await app.expectNoHorizontalScroll();
  await app.page.emulateMedia({ colorScheme: 'dark' }); await app.shot('03-welcome-dark');
  app.expectNoErrors();
});
