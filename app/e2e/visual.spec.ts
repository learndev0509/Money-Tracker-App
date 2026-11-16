/*
 * Visual regression: the fixture ledger rendered at a frozen clock (30 Oct 2026, 6:30 pm IST) and
 * compared pixel for pixel with the baselines in e2e/visual/. The golden HTML snapshots in
 * tests/golden/ catch markup changes; these catch stylesheet and layout changes.
 *
 *   npx playwright test visual --update-snapshots     accept a new look after an intended change
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { App, KEY, PHONE } from './helpers';

const FIXTURE = fs.readFileSync(
  path.resolve(import.meta.dirname, '..', 'tests', 'fixtures', 'backup-1.8.0.json'),
  'utf8',
);
const FROZEN = new Date('2026-10-30T18:30:00+05:30');

test.describe.configure({ mode: 'serial' });
// Baselines are per platform. Where this platform has none (a CI runner on Linux, say), comparing
// would only fail, so the spec skips unless it was asked to record (`--update-snapshots`).
const BASELINES = fs.existsSync(path.resolve(import.meta.dirname, 'visual', `dashboard-${process.platform}.png`));
const recording = () => ['all', 'changed'].includes(String(test.info().config.updateSnapshots));
test.skip(
  () => !BASELINES && !recording(),
  `no visual baselines for ${process.platform}; record them with --update-snapshots`,
);
let app: App;

test.beforeAll(async ({ browser }) => {
  // reduced motion: no entrance slide and no 650 ms count-up of the hero total, so every capture is the end state
  app = await App.open(browser, 'visual', { ...PHONE, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });
  // the fixture forces dark; drop that so the emulated colour scheme decides and both looks get a baseline
  await app.context.addInitScript(
    ([k, json]) => {
      if (!localStorage.getItem(k)) {
        const d = JSON.parse(json);
        delete d.meta.theme;
        localStorage.setItem(k, JSON.stringify(d));
      }
    },
    [KEY, FIXTURE] as const,
  );
  await app.page.clock.setFixedTime(FROZEN);
  await app.goto();
});

test.afterAll(async () => {
  await app?.close();
});

// full-page captures paint the fixed tab bar wherever the viewport happens to be, so visual.css hides it
// there; 'dashboard-top' is a plain viewport capture that keeps it in place
const shot = (name: string) =>
  expect(app.page).toHaveScreenshot(name + '.png', {
    fullPage: true,
    stylePath: path.resolve(import.meta.dirname, 'visual.css'),
  });
// a sheet is a fixed overlay: a full-page capture stitches it at a different offset each time once the page
// behind it is long, so sheets are captured at viewport size, which is what a phone shows anyway
const sheetShot = (name: string) => expect(app.page).toHaveScreenshot(name + '.png');

test('Month screen', async () => {
  await app.tab('dashboard');
  await shot('dashboard');
  await expect(app.page).toHaveScreenshot('dashboard-top.png');
});

test('Month screen in dark mode', async () => {
  await app.page.emulateMedia({ colorScheme: 'dark' });
  await shot('dashboard-dark');
  await app.page.emulateMedia({ colorScheme: 'light' });
});

test('History', async () => {
  await app.tab('history');
  await shot('history');
});

test('Settings', async () => {
  await app.tab('settings');
  await shot('settings');
});

test('Add expense', async () => {
  await app.add();
  await shot('add');
});

test('Expense sheet', async () => {
  await app.tab('dashboard');
  await app.click('#main .txrow');
  await sheetShot('sheet-expense');
  await app.click('#sheet button[data-close]');
});

test('Trends sheet', async () => {
  await app.click('.hero.tap');
  await sheetShot('sheet-trends');
  await app.click('#sheet button[data-close]');
});

test('no page errors', async () => {
  app.expectNoErrors();
});
