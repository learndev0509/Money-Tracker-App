import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { App } from './helpers';
import pkg from '../package.json' with { type: 'json' };

test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'ui');
  await app.goto();
  await app.finishWelcome('Shreya');
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
const saveBtn = () => app.page.locator('#save-tx');

test('an empty month shows the receipt illustration and the tab indicator sits behind the active tab', async () => {
  await expect(page().locator('.card.empty .art .coin').first()).toBeAttached();
  await expect(page().locator('.card.empty')).toContainText('₹0');
  await expect(page().locator('.tab-ind.live')).toHaveCount(1);
  expect(
    await page().evaluate(() => {
      const a = document.querySelector('.tab-ind')!.getBoundingClientRect(),
        b = document.querySelector('nav .tab.on .ic')!.getBoundingClientRect();
      return Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2;
    }),
  ).toBe(true);
});

test('category chips carry glyphs tinted by category', async () => {
  await app.add();
  await expect(page().locator('#cat-chips .chip .ci svg')).toHaveCount(10);
  expect(
    await page()
      .locator('#cat-chips .chip[data-cat="Food"] .ci')
      .evaluate(e => (e as HTMLElement).style.getPropertyValue('--cc')),
  ).toBe('var(--c1)');
});

test('saving morphs the button into a check, slides the row into Just added, then returns', async () => {
  await app.addExpense('120', 'Food', null);
  await expect(saveBtn()).toHaveClass(/\bdone\b/);
  await expect(saveBtn()).toContainText('Saved');
  await expect(saveBtn().locator('.tick')).toHaveCount(1);
  await expect(page().locator('#recent .txrow.new .ci')).toHaveCount(1);
  await expect(saveBtn()).not.toHaveClass(/\bdone\b/);
  await expect(saveBtn()).toContainText('Save expense');
});

test('the hero carries the 7-day spark and the category strip; the sheet has a grab handle', async () => {
  await app.tab('dashboard');
  await expect(page().locator('.hero .sp')).toHaveCount(Math.min(7, new Date().getDate())); // the last seven days, clipped to the month
  await expect(page().locator('.hero .sp.today')).toHaveCount(1);
  await expect(page().locator('.hero .strip i')).toHaveCount(1);
  await app.click('#main .txrow');
  await expect(page().locator('#sheet-panel .grab')).toHaveCount(1);
  await app.click('#sheet button[data-close]');
});

test('moving to an earlier month slides the screen and the class clears after the animation', async () => {
  await app.click('[data-period][aria-label="Previous month"]');
  const slid = await app.hasClass('#main', 'slide-r');
  expect(slid || /September|August|October/.test(await app.text('h1'))).toBe(true);
  await expect(app.main).not.toHaveClass(/slide-[rl]/);
});

test('appearance: dark applies at once and persists, forced light beats a dark phone, match phone follows the phone', async () => {
  await app.tab('settings');
  await expect(page().locator('#theme-seg [data-theme-pick="system"]')).toHaveClass(/\bon\b/);
  expect(await app.theme()).toBe('');
  await app.click('#theme-seg [data-theme-pick="dark"]');
  expect(await app.theme()).toBe('dark');
  await app.expectStored(d => d.meta.theme === 'dark');
  await app.reload();
  expect(await app.theme()).toBe('dark');
  await app.shot('01-dark-forced');
  await app.tab('settings');
  await app.click('#theme-seg [data-theme-pick="light"]');
  await page().emulateMedia({ colorScheme: 'dark' });
  expect(await app.theme()).toBe('light');
  expect(await page().evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 239, 228)'); // the beige light canvas
  await app.click('#theme-seg [data-theme-pick="system"]');
  expect(await app.theme()).toBe('');
  expect(await page().evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 22, 15)'); // the olive charcoal dark canvas
});

test('reduced motion skips the save morph and the row slide', async () => {
  await page().emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await app.add();
  await app.addExpense('50', 'Food', null);
  await app.expectToast(/Saved/);
  await expect(saveBtn()).not.toHaveClass(/\bdone\b/);
  await expect(page().locator('#recent .txrow.new')).toHaveCount(0);
  await page().emulateMedia({ reducedMotion: 'no-preference' });
});

test('the tab bar is Month · History · Settings and Add sits in every header', async () => {
  expect(
    await page()
      .locator('nav .tab')
      .evaluateAll(l => l.map(b => (b as HTMLElement).dataset.go).join(',')),
  ).toBe('dashboard,history,settings');
  await app.tab('dashboard');
  await expect(page().locator('.greet #add-btn')).toHaveCount(1);
  expect(
    await page()
      .locator('.greet')
      .evaluate(e => [...e.children].map(c => c.id || c.className).join('|')),
  ).toBe('grow|add-btn|avatar');
  await app.tab('history');
  await expect(page().locator('.topbar #add-btn')).toHaveCount(1);
  await app.tab('settings');
  await expect(page().locator('.topbar #add-btn')).toHaveCount(1);
  await app.add();
  await expect(page().locator('h1')).toContainText('Add expense');
  await expect(page().locator('nav .tab.on')).toHaveCount(0);
  await expect(page().locator('.tab-ind')).not.toHaveClass(/\blive\b/);
});

test('the calculator shows a live result, collapses on equals and puts the result in the amount field', async () => {
  await app.click('.amount-in [data-calc="form"]');
  await expect(app.sheetHead).toContainText('Calculator');
  await expect(app.sheet.locator('[data-ck]')).toHaveCount(20);
  for (const k of ['1', '2', '0', '+', '4', '5', '×', '2']) await app.click(`#sheet [data-ck="${k}"]`);
  await expect(page().locator('#calc-expr')).toHaveText('120+45×2');
  await expect(page().locator('#calc-res')).toContainText('= ₹210');
  await app.click('#sheet [data-ck="="]');
  await expect(page().locator('#calc-expr')).toHaveText('210');
  for (const k of ['÷', '4']) await app.click(`#sheet [data-ck="${k}"]`);
  await app.click('#sheet [data-calc-use]');
  await expect(app.sheet).toBeHidden();
  await expect(page().locator('#f-amount')).toHaveValue('52.5');
});

test('a typed expression saves as its value, an unfinished one is refused', async () => {
  await app.addExpense('250+180-30', 'Food', null);
  await app.expectToast(/Saved ₹400/);
  await app.fill('#f-amount', '10%+');
  await app.click('#save-tx');
  await app.expectToast(/Enter an amount/);
});

test('the calculator works inside the edit sheet and returns to it', async () => {
  await app.click('#recent .txrow');
  await app.click('#sheet [data-detail^="edit|"]');
  await app.click('#sheet [data-calc="sheet"]');
  for (const k of ['C', '8', '0', '0']) await app.click(`#sheet [data-ck="${k}"]`);
  await app.click('#sheet [data-calc-use]');
  await expect(app.sheet.locator('[data-save-edit]')).toHaveCount(1);
  await expect(page().locator('#e-amount')).toHaveValue('800');
  await app.click('#sheet button[data-close]');
});

test('the hero opens Trends with four charts; a mover opens the category sheet on top; Day by day opens Trends too', async () => {
  await app.tab('dashboard');
  await app.click('.hero.tap');
  await expect(app.sheetHead).toContainText('Trends');
  for (const s of ['Running total', 'Average by weekday', 'Last six months', 'What moved'])
    await expect(app.sheetBody).toContainText(s);
  await expect(app.sheetBody.locator('.chart svg')).toHaveCount(4);
  await app.click('#sheet .prow[data-detail^="cat|"]');
  await expect(app.sheetHead).toContainText('Food');
  await expect(page().locator('#sheet-back')).toBeVisible();
  await app.click('#sheet button[data-close]');
  await app.click('.card [data-detail^="trend|"]');
  await expect(app.sheetHead).toContainText('Trends');
  await app.shot('02-trends', false);
  await app.click('#sheet button[data-close]');
});

test('Year shows the year hero, twelve month bars and a row per month; a month row returns to that month', async () => {
  await app.reload();
  await app.tab('dashboard');
  const y = String(new Date().getFullYear());
  await expect(app.main.locator('.seg.scope [data-scope="month"]')).toHaveClass(/\bon\b/);
  await expect(app.main.locator('.card h2', { hasText: 'Month by month' })).toHaveCount(1);
  await app.click('.seg.scope [data-scope="year"]');
  await expect(app.main.locator('.topbar h1')).toHaveText(y);
  await expect(app.main.locator('.hero .lbl')).toContainText('Spent so far in ' + y);
  // Twelve bars, of which only the months up to now are tappable; the rest are stubs.
  await expect(app.main.locator('.chart svg g')).toHaveCount(12);
  await expect(app.main.locator('.chart svg g[data-period]')).toHaveCount(new Date().getMonth() + 1);
  const rows = app.main.locator('.prow[data-period]');
  await expect(rows.first()).toContainText(/expense/); // only months with expenses get a row
  await expect(rows.first()).toContainText(/^[A-Z][a-z]+/);
  await app.click('.card .prow[data-detail^="cat|' + y + '|"]');
  await expect(app.sheetHead).toContainText(y);
  await app.click('#sheet button[data-close]');
  await app.shot('05-dashboard-year');
  await rows.first().click();
  await expect(app.main.locator('.seg.scope [data-scope="month"]')).toHaveClass(/\bon\b/);
  await expect(app.main.locator('.hero .lbl')).toContainText('Spent so far this month');
});

test('Settings shows the version chip as a label and saves stamp the app version', async () => {
  await app.tab('settings');
  const chip = page().locator('#version-chip');
  const built = new Date(pkg.buildDate + 'T12:00:00');
  await expect(chip).toContainText('Version ' + pkg.version);
  await expect(chip).toContainText(
    built.getDate() + ' ' + built.toLocaleString('en-GB', { month: 'long' }) + ' ' + built.getFullYear(),
  );
  expect(await chip.evaluate(e => e.tagName)).toBe('SPAN');
  expect((await app.data()).meta.appVersion).toBe(pkg.version);
});

test('Settings exports a well-formed PDF named by month, and the dashboard links to it', async () => {
  const [dl] = await Promise.all([page().waitForEvent('download'), app.click('#pdf-dl')]);
  expect(dl.suggestedFilename()).toMatch(/^money-tracker-\d{4}-\d{2}\.pdf$/);
  const pdf = fs.readFileSync((await dl.path())!).toString('latin1');
  expect(pdf.slice(0, 8)).toBe('%PDF-1.4');
  expect(pdf).toMatch(/%%EOF$/);
  expect(pdf).toMatch(/\/Type \/Pages \/Kids \[.*\] \/Count \d+/);
  expect(pdf).toMatch(/Helvetica-Bold/);
  expect(pdf).toMatch(/expense report/);
  expect(pdf).toMatch(/\(Balance\)/);
  expect(pdf).toMatch(/\(Final balance\)/);
  await app.tab('dashboard');
  await expect(page().locator('[data-pdf]').first()).toBeAttached();
});

test('no request leaves the page and all five Plex faces load from fonts/', async () => {
  expect(
    await page().evaluate(() =>
      performance
        .getEntriesByType('resource')
        .every(r => !/^https?:/.test(r.name) || r.name.startsWith(location.origin)),
    ),
  ).toBe(true);
  expect(
    await page().evaluate(async () => {
      await document.fonts.ready;
      const l = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight);
      return [
        'IBM Plex Sans 400',
        'IBM Plex Sans 500',
        'IBM Plex Sans 600',
        'IBM Plex Mono 500',
        'IBM Plex Mono 600',
      ].every(x => l.includes(x));
    }),
  ).toBe(true);
});

test('Privacy and Terms open from Settings; Save to Files is hidden where files cannot be shared', async () => {
  await app.tab('settings');
  await expect(page().locator('[data-detail="privacy|app"]')).toHaveCount(1);
  await expect(page().locator('[data-detail="terms|app"]')).toHaveCount(1);
  await expect(page().locator('#export-share')).toHaveCount(0);
  await app.click('[data-detail="privacy|app"]');
  for (const s of ['Nothing leaves your phone', 'no analytics', 'AES-256', 'version ' + pkg.version])
    await expect(app.sheetBody).toContainText(s);
  await app.click('#sheet button[data-close]');
  await app.click('[data-detail="terms|app"]');
  await expect(app.sheetHead).toContainText('Terms');
  await expect(app.sheetBody).toContainText('as is');
  await app.click('#sheet button[data-close]');
});

test('Save backup to Files appears when the phone can share files and hands over the JSON backup', async () => {
  await page().evaluate(() => {
    (navigator as any).canShare = () => true;
    (navigator as any).share = (d: any) => {
      (window as any).__shared = d;
      return Promise.resolve();
    };
  });
  await app.tab('dashboard');
  await app.tab('settings');
  await expect(page().locator('#export-share')).toHaveCount(1);
  await expect(app.main).toContainText(/save a backup to Files|Last backup/);
  await app.click('#export-share');
  await app.expectToast(/Backup saved/);
  const shared = await page().evaluate(() => {
    const s = (window as any).__shared;
    return s && { n: s.files[0].name, t: s.files[0].type, size: s.files[0].size };
  });
  expect(shared.n).toMatch(/^money-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(shared.t).toBe('application/json');
  expect(shared.size).toBeGreaterThan(100);
  expect((await app.text('#main')).split('Last backup')[1].slice(0, 30)).not.toMatch(/never/);
});

test('Privacy opens above the welcome screen and closing returns to it', async () => {
  await app.patch(d => {
    d.profile = { firstName: '', lastName: '' };
  });
  await app.reload();
  await app.click('#welcome [data-detail="privacy|welcome"]');
  await expect(app.sheet).toBeVisible();
  await expect(app.sheet).toHaveClass(/\bover\b/);
  await expect(app.sheetHead).toContainText('Privacy');
  await app.click('#sheet button[data-close]');
  await expect(app.welcome).toBeVisible();
  await expect(app.sheet).not.toHaveClass(/\bover\b/);
  await app.finishWelcome('Shreya');
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
