import { test, expect } from '@playwright/test';
import { App } from './helpers';

/* The lock screen follows the Light/Dark choice from Settings, though the ledger holding it is encrypted. */
test.describe.configure({ mode: 'serial' });
let app: App;

const THEME_KEY = 'money-tracker.v1.theme';
const LIGHT = 'rgb(244, 239, 228)';
const DARK = 'rgb(21, 22, 15)';

test.beforeAll(async ({ browser }) => {
  // a phone in dark mode, as in the report
  app = await App.open(browser, 'locktheme', { colorScheme: 'dark' });
  await app.goto();
  await app.finishWelcome('Shreya');
});

test.afterAll(async () => {
  await app?.close();
});

const stored = () => app.page.evaluate(k => localStorage.getItem(k), THEME_KEY);
/** Pick a theme and wait for the encrypted ledger to be rewritten, so a reload cannot outrun the save. */
const pick = async (theme: 'light' | 'dark' | 'system') => {
  const before = await app.raw();
  await app.click(`#theme-seg [data-theme-pick="${theme}"]`);
  await app.expectRaw(r => r !== before, 'the ledger was saved with the new theme');
};
const lockBg = () => app.page.evaluate(() => getComputedStyle(document.querySelector('#lock')!).backgroundColor);

test('choosing Light keeps a plain copy of the choice beside the ledger', async () => {
  await app.tab('settings');
  expect(await stored()).toBeNull();
  await app.click('#theme-seg [data-theme-pick="light"]');
  expect(await app.theme()).toBe('light');
  expect(await stored()).toBe('light');
});

test('with a PIN, the lock screen opens in Light on a dark phone', async () => {
  await app.setPin('1234');
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect(await app.theme()).toBe('light');
  expect(await lockBg()).toBe(LIGHT);
  // the copy survives the locked start, where the ledger in memory is still empty
  expect(await stored()).toBe('light');
  await app.shot('01-lock-light', false);
});

test('unlocking stays Light', async () => {
  await app.pin('1234');
  await app.expectUnlocked();
  expect(await app.theme()).toBe('light');
  expect(await stored()).toBe('light');
});

test('a phone that chose Light before this copy existed gets it on its next unlock', async () => {
  await app.page.evaluate(k => localStorage.removeItem(k), THEME_KEY);
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect(await lockBg()).toBe(DARK);
  await app.pin('1234');
  await app.expectUnlocked();
  expect(await stored()).toBe('light');
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect(await lockBg()).toBe(LIGHT);
  await app.pin('1234');
  await app.expectUnlocked();
});

test('Dark is followed too, and Match phone drops the copy so the lock screen follows the phone', async () => {
  await app.tab('settings');
  await pick('dark');
  expect(await stored()).toBe('dark');
  await app.page.emulateMedia({ colorScheme: 'light' });
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect(await lockBg()).toBe(DARK);
  await app.pin('1234');
  await app.expectUnlocked();
  await app.tab('settings');
  await pick('system');
  expect(await stored()).toBeNull();
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect(await app.theme()).toBe('');
  expect(await lockBg()).toBe(LIGHT);
  await app.pin('1234');
  await app.expectUnlocked();
});

test('erasing from the lock screen forgets the choice', async () => {
  await app.tab('settings');
  await pick('dark');
  expect(await stored()).toBe('dark');
  await app.reload();
  await expect(app.lock).toBeVisible();
  await app.click('#pin-forgot');
  await app.click('#pin-erase');
  await expect(app.welcome).toBeVisible();
  expect(await stored()).toBeNull();
  expect(await app.theme()).toBe('');
});

test('no page errors', async () => {
  app.expectNoErrors();
});
