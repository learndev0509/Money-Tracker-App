import { test, expect } from '@playwright/test';
import { App } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'round2');
  await app.goto();
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
const histBody = () => app.page.locator('#hist-body');
const cashBig = () => app.page.locator('.cash-big');

test('the welcome has an animated logo and little text', async () => {
  await expect(page().locator('#welcome .lg-anim .lg-coin')).toHaveCount(1);
  await expect(page().locator('#welcome .lg-shine')).toHaveCount(1);
  const text = (await app.text('#welcome')).replace(/\s+/g, ' ').trim();
  expect(text.length, text.length + ' chars').toBeLessThan(260);
  await app.shot('01-welcome', false);
  // eslint-disable-next-line playwright/no-wait-for-timeout -- the logo animation settles; screenshot only
  await page().waitForTimeout(1600); // the logo animation settles; screenshot only
  await app.shot('02-welcome-settled');
});

test('the dashboard greets after the welcome and the screen enters with an animation class', async () => {
  await app.finishWelcome('Shreya', 'Sanghavi');
  await expect(page().locator('.g-hi')).toHaveText(/Good (morning|afternoon|evening), Shreya!/);
  await expect(app.main).toHaveClass(/\benter\b/);
});

test('frequent notes are suggested before typing and typing filters them', async () => {
  await app.add();
  await app.fill('#f-amount', '180');
  await app.click('#cat-chips .chip[data-cat="Food"]');
  await app.fill('#f-note', 'Swiggy');
  await app.click('[data-method="online"]');
  await app.click('[data-method="card"]');
  await app.click('[data-open-pick="card"]');
  await app.pick('hdfc millennia', 'HDFC Bank Millennia');
  await app.click('#save-tx');
  await app.addExpense('60', 'Food', 'Chai', 'cash');
  const suggest = page().locator('#note-suggest');
  await expect(suggest).toContainText('Swiggy');
  await expect(suggest).toContainText('Chai');
  await app.click('[data-method="cash"]');
  await app.click('#cat-chips .chip[data-cat="Other"]');
  await app.fill('#f-note', 'sw');
  await expect(suggest).toContainText('Swiggy');
  await expect(suggest).not.toContainText('Chai');
});

test('a suggestion fills the note, category and card', async () => {
  await app.click('#note-suggest [data-note="Swiggy"]');
  await expect(page().locator('#f-note')).toHaveValue('Swiggy');
  await expect(page().locator('#cat-chips .chip.on')).toHaveAttribute('data-cat', 'Food');
  await expect(page().locator('#pay-block .picker .pk-v')).toContainText('HDFC Bank Millennia');
  await app.shot('03-add-suggest');
  await app.fill('#f-amount', '220');
  await app.click('#save-tx');
});

test('deleting an expense offers undo and undo restores it', async () => {
  await app.tab('dashboard');
  const before = (await app.data()).tx.length;
  await app.click('#main .txrow');
  await app.click('#sheet [data-del-tx]');
  await expect(app.toastText).toContainText('Deleted');
  await expect(app.toastBtn).toBeVisible();
  expect((await app.data()).tx).toHaveLength(before - 1);
  await app.toastBtn.click();
  await expect(app.toastText).toContainText('Restored');
  expect((await app.data()).tx).toHaveLength(before);
});

test('the cash card appears once cash was spent, negative before any withdrawal', async () => {
  await expect(page().locator('.cashcard')).toHaveCount(1);
  await expect(cashBig()).toContainText(/-?₹60/);
  await expect(cashBig()).toHaveClass(/\bneg\b/);
});

test('a withdrawal is bank-only and raises the balance', async () => {
  await app.click('.cashcard [data-detail="cashform|withdrawal"]');
  await expect(app.sheet.locator('[data-method="cash"]')).toHaveCount(0);
  await expect(app.sheet.locator('[data-open-pick="bank"]')).toHaveCount(1);
  await app.fill('#e-amount', '2000');
  await app.click('#sheet [data-open-pick="bank"]');
  await app.pick('kotak', 'Kotak Mahindra Bank');
  await expect(app.sheet.locator('.picker .pk-v')).toContainText('Kotak Mahindra Bank');
  await app.click('#sheet [data-save-cash]');
  await expect(cashBig()).toContainText('₹1,940');
});

test('setting cash in hand overrides, and a later cash spend reduces it', async () => {
  await app.click('.cashcard [data-detail="cashform|adjust"]');
  await app.fill('#e-amount', '1500');
  await app.click('#sheet [data-save-cash]');
  await expect(cashBig()).toContainText('₹1,500');
  await app.add();
  await app.addExpense('100', 'Transport', 'Auto', 'cash');
  await app.tab('dashboard');
  await expect(cashBig()).toContainText('₹1,400');
});

test('the cash history lists withdrawal, adjust and spends', async () => {
  await app.click('.cashcard [data-detail="cash|list"]');
  await expect(app.sheetBody).toContainText('Withdrawal');
  await expect(app.sheetBody).toContainText('Set to');
  await expect(app.sheetBody).toContainText('Auto');
  await app.shot('04-cash-history', false);
  await app.click('#sheet button[data-close]');
  await expect(app.main).toContainText('₹1,400 in hand');
  await app.shot('05-dashboard');
});

test('History has no charts, five dropdowns defaulting to now, and lists newest first', async () => {
  await app.tab('history');
  await expect(histBody().locator('.chart, .hero, .prow')).toHaveCount(0);
  const now = new Date();
  expect(
    await page()
      .locator('#hist-filters select')
      .evaluateAll(l => l.map(s => s.id).join(',')),
  ).toBe('h-year,h-month,h-cat,h-method,h-sort');
  await expect(page().locator('#h-year')).toHaveValue(String(now.getFullYear()));
  await expect(page().locator('#h-month')).toHaveValue(String(now.getMonth() + 1));
  await expect(page().locator('#h-month option').first()).toHaveText('All months');
  expect(
    await page()
      .locator('#h-month option')
      .evaluateAll((l: HTMLOptionElement[]) =>
        l.filter(o => +o.value > new Date().getMonth() + 1).every(o => o.disabled),
      ),
  ).toBe(true);
  expect(
    await page()
      .locator('#h-year option')
      .evaluateAll((l: HTMLOptionElement[]) => l.every(o => +o.value <= new Date().getFullYear())),
  ).toBe(true);
  const cats = await page()
    .locator('#h-cat option')
    .evaluateAll((l: HTMLOptionElement[]) => l.map(o => o.value));
  expect(cats[0]).toBe('');
  expect(cats).toContain('Food');
  expect(cats).toContain('Fuel');
  expect(cats).toContain('Other');
  expect(
    await page()
      .locator('#h-method option')
      .evaluateAll((l: HTMLOptionElement[]) => l.map(o => o.value).join(',')),
  ).toBe(',cash,bank,upi,card');
  const order = await page()
    .locator('#hist-body .txrow .note')
    .evaluateAll(l => l.map(e => e.textContent!.trim()));
  expect(order[0]).toBe('· Auto');
  expect(order[order.length - 1]).toBe('· Swiggy');
});

test('the payment and category dropdowns narrow the month list, clear resets', async () => {
  await app.select('#h-method', 'cash');
  await expect(histBody()).toContainText('Chai');
  await expect(histBody()).toContainText('Auto');
  await expect(histBody()).not.toContainText('Swiggy');
  await expect(histBody()).toContainText('2 expenses · filtered');
  await expect(page().locator('#h-method')).toHaveClass(/\bon\b/);
  await app.select('#h-cat', 'Food');
  await expect(histBody()).toContainText('Chai');
  await expect(histBody()).not.toContainText('Auto');
  await expect(histBody()).toContainText('1 expense · filtered');
  await app.click('#hist-filters [data-hf-clear]');
  await expect(page().locator('#h-cat')).toHaveValue('');
  await expect(page().locator('#h-method')).toHaveValue('');
  await expect(histBody()).toContainText('4 expenses');
});

test('sorting by amount is a flat list, oldest first reverses', async () => {
  await app.select('#h-sort', 'high');
  const amts = await page()
    .locator('#hist-body .txrow .amt')
    .evaluateAll(l => l.map(e => +e.textContent!.replace(/[^\d.]/g, '')));
  expect(amts.join(',')).toBe('220,180,100,60');
  await expect(histBody().locator('.dayhead')).toHaveCount(0);
  await app.select('#h-sort', 'old');
  expect(
    (
      await page()
        .locator('#hist-body .txrow .note')
        .evaluateAll(l => l.map(e => e.textContent!.trim()))
    )[0],
  ).toBe('· Swiggy');
  await app.select('#h-sort', 'new');
});

test('a search with no match offers clear, and clear returns to the month list', async () => {
  await app.fill('#hist-search', 'zzz');
  await expect(histBody()).toContainText('Nothing matches');
  await expect(histBody().locator('[data-hf-clear]')).toHaveCount(1);
  await app.click('#hist-body [data-hf-clear]');
  await expect(histBody()).toContainText('expenses');
  await expect(page().locator('#hist-search')).toHaveValue('');
  await expect(page().locator('#h-month')).toHaveCount(1);
});

test('a past year appears in the dropdown and opens on December; a future-dated entry adds no year', async () => {
  await app.patch(d => {
    d.tx.push(
      {
        id: 'old',
        amount: 999,
        category: 'Other',
        accountId: 'cash',
        method: 'cash',
        date: '2025-03-04',
        time: '10:00',
        note: 'Old one',
        recurringId: '',
      },
      {
        id: 'fut',
        amount: 5,
        category: 'Other',
        accountId: 'cash',
        method: 'cash',
        date: '2031-01-01',
        time: '',
        note: 'From the future',
        recurringId: '',
      },
    );
  });
  await app.reload();
  await app.tab('history');
  expect(
    await page()
      .locator('#h-year option')
      .evaluateAll((l: HTMLOptionElement[]) => l.map(o => o.value).join(',')),
  ).toBe(new Date().getFullYear() + ',2025');
  await app.select('#h-year', '2025');
  await expect(page().locator('#h-month')).toHaveValue('12');
  expect(
    await page()
      .locator('#h-month option')
      .evaluateAll((l: HTMLOptionElement[]) => l.every(o => !o.disabled)),
  ).toBe(true);
  await app.select('#h-month', '3');
  await expect(histBody()).toContainText('March 2025 · 1 expense');
  await expect(histBody()).toContainText('Old one');
  await app.shot('06-history');
  // "All" lists the whole year as one card per month, and survives a change of year.
  await app.select('#h-month', '0');
  await expect(page().locator('#h-month option:checked')).toHaveText('All months');
  await expect(histBody()).toContainText('2025 · 1 expense');
  await expect(histBody().locator('.monthhead')).toHaveText(/March 2025 · 1/);
  await expect(histBody()).toContainText('Old one');
  await app.select('#h-year', String(new Date().getFullYear()));
  await expect(page().locator('#h-month')).toHaveValue('0');
  await expect(histBody()).toContainText(new Date().getFullYear() + ' · ');
  await expect(histBody().locator('.monthhead').first()).toBeVisible();
  await app.patch(d => {
    d.tx = d.tx.filter((t: any) => t.id !== 'old' && t.id !== 'fut');
  });
  await app.reload();
});

test('the app opens on Add when set, and on Month when reset', async () => {
  await app.tab('settings');
  await app.click('#start-seg [data-start="add"]');
  await app.goto();
  await expect(page().locator('h1')).toContainText('Add expense');
  await expect(page().locator('nav .tab.on')).toHaveCount(0);
  await app.tab('settings');
  await app.click('#start-seg [data-start="dashboard"]');
  await app.goto();
  await expect(page().locator('nav .tab.on')).toHaveAttribute('data-go', 'dashboard');
});

test('reduced motion skips the entrance animation', async () => {
  await page().emulateMedia({ reducedMotion: 'reduce' });
  await app.tab('history');
  await expect(app.main).not.toHaveClass(/\benter\b/);
  await page().emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' });
  await app.patch(d => {
    d.profile = { firstName: '', lastName: '' };
  });
  await app.goto();
  // eslint-disable-next-line playwright/no-wait-for-timeout -- let the welcome animation finish; screenshot only
  await page().waitForTimeout(1800); // let the welcome animation finish; screenshot only
  await app.shot('07-welcome-dark');
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
