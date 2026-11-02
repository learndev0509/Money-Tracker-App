import { test, expect } from '@playwright/test';
import { App } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'features');
  await app.goto();
  await app.finishWelcome('Shreya', 'Sanghavi');
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
/** The month a recurring entry on `day` was last applied: the latest month whose day has come, never before `since`. */
const lastAppliedMonth = (day: number, since: string) => {
  const now = new Date();
  const due = now.getDate() >= day ? now : new Date(now.getFullYear(), now.getMonth(), 0);
  const ym = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
  return ym < since ? since : ym;
};
const budgetCats = () =>
  app.page.locator('#budget-cat option').evaluateAll((l: HTMLOptionElement[]) => l.map(o => o.value));
const amexId = async () =>
  (await app.data()).accounts.find((a: any) => a.name === 'American Express Platinum Travel').id;

test('seed: a cash expense and a card expense through the picker', async () => {
  await app.add();
  await app.addExpense('120', 'Food', 'Chai');
  await app.click('[data-method="online"]');
  await app.click('[data-method="card"]');
  await app.click('[data-open-pick="card"]');
  await app.pick('regalia gold', 'HDFC Bank Regalia Gold');
  await app.addExpense('3999', 'Shopping', null);
  await expect(app.recent).toContainText('Chai');
  await expect(app.recent).toContainText('Regalia');
});

test('an expense can be edited, including its card through the picker, and the dashboard reflects it', async () => {
  await app.click('#recent .txrow'); // most recent = shopping 3999
  await expect(app.sheet.locator('[data-detail^="edit|"]')).toHaveCount(1);
  await app.click('#sheet [data-detail^="edit|"]');
  await expect(page().locator('#e-amount')).toHaveValue('3999');
  await app.fill('#e-amount', '4250.75');
  await app.fill('#e-note', 'Myntra');
  await app.click('#sheet .chip[data-cat="Entertainment"]');
  await app.click('#sheet [data-open-pick="card"]');
  await app.pick('amex platinum travel', 'American Express Platinum Travel');
  await expect(page().locator('#e-amount')).toHaveCount(1);
  await expect(app.sheet.locator('.picker .pk-v')).toContainText('American Express Platinum Travel');
  await app.click('#sheet [data-save-edit]');
  await expect(app.sheet).toBeHidden();
  await app.tab('dashboard');
  await expect(app.main).toContainText('4,250.75');
  await expect(app.main).toContainText('Entertainment');
  await expect(app.main).toContainText('American Express Platinum Travel');
  await expect(app.main).not.toContainText('Regalia Gold');
});

test('budgets start empty; adding one lists it and removes it from the dropdown', async () => {
  await app.tab('settings');
  await expect(page().locator('input[data-budget]')).toHaveCount(0);
  await expect(page().locator('#budget-cat')).toHaveCount(1);
  await expect(app.main).toContainText('None yet');
  await app.select('#budget-cat', 'Entertainment');
  await app.fill('#budget-amt', '4000');
  await app.click('#budget-add');
  await expect(page().locator('input[data-budget="Entertainment"]')).toHaveValue('4000');
  expect(await budgetCats()).not.toContain('Entertainment');
  await expect(app.main).toContainText('250.75 over this month');
  await app.select('#budget-cat', 'Food');
  await app.fill('#budget-amt', '5000');
  await page().press('#budget-amt', 'Enter');
  await expect(page().locator('input[data-budget]')).toHaveCount(2);
  expect(
    await page()
      .locator('input[data-budget]')
      .evaluateAll(l =>
        l
          .map(i => (i as HTMLElement).dataset.budget)
          .sort()
          .join(','),
      ),
  ).toBe('Entertainment,Food');
});

test('the dashboard warns when a budget is over and the category sheet shows the budget line', async () => {
  await app.tab('dashboard');
  const banner = page().locator('.banner');
  await expect(banner).toContainText('Entertainment is over budget');
  await expect(banner).toContainText('by ₹250.75');
  await expect(app.main).toContainText(/250\.75 over/);
  await expect(app.main).toContainText('4,880 left');
  await expect(page().locator('.prow .small.over')).toHaveCount(1);
  await app.shot('01-dashboard-budgets');
  await app.click(`.prow[data-detail="cat|${app.thisMonth()}|Entertainment"]`);
  await expect(app.sheetBody).toContainText('Budget ₹4,000 a month');
  await app.click('#sheet button[data-close]');
});

test('crossing 80%, the budget, and going further over each raise a warning toast after the saved toast', async () => {
  await app.add();
  await app.addExpense('3900', 'Food', '', 'cash');
  await app.expectToast(/Food is at 80% of its ₹5,000 budget/);
  await app.fill('#f-amount', '1000');
  await app.click('#save-tx');
  await app.expectToast(/Food budget exceeded · ₹5,020 of ₹5,000/);
  await expect(app.toast).toHaveClass(/\bwarn\b/);
  await app.fill('#f-amount', '50');
  await app.click('#save-tx');
  await app.expectToast(/Food is ₹70 over its ₹5,000 budget/);
  await app.patch(d => {
    d.tx = d.tx.filter((t: any) => !(t.category === 'Food' && t.amount >= 50 && t.note === ''));
  });
  await app.reload();
});

test('removing a budget returns the category to the dropdown', async () => {
  await app.tab('settings');
  await app.click('[data-del-budget="Food"]');
  expect(await budgetCats()).toContain('Food');
  await expect(page().locator('input[data-budget="Food"]')).toHaveCount(0);
  await app.select('#budget-cat', 'Food');
  await app.fill('#budget-amt', '5000');
  await app.click('#budget-add');
});

test('a statement day on the Amex card shows the bill so far on Settings, the Month screen and the card sheet', async () => {
  await app.tab('settings');
  const id = await amexId();
  await app.select(`select[data-stmt="${id}"]`, '15');
  await expect(app.main).toContainText('this bill so far');
  await app.tab('dashboard');
  await expect(app.main).toContainText(/this bill so far ₹4,250\.75 \(closes 15 /);
  await app.click(`.prow[data-detail^="acct|"][data-detail$="|${id}"]`);
  await expect(app.sheetBody).toContainText(/This bill so far \(/);
  await app.click('#sheet button[data-close]');
});

test('a recurring rent on the 1st starting this month is added at once, listed in Settings and tagged auto', async () => {
  await app.tab('settings');
  await app.click('[data-detail="recur|new"]');
  await expect(page().locator('#e-day')).toHaveCount(1);
  await app.fill('#e-amount', '18000');
  await app.click('#sheet .chip[data-cat="Rent"]');
  await app.fill('#e-note', 'Flat rent');
  await app.click('#sheet [data-method="bank"]');
  await app.click('#sheet [data-open-pick="bank"]');
  await app.pick('sbi', 'State Bank of India');
  await app.select('#e-day', '1');
  await app.select('#e-since', 'this');
  await app.click('#sheet [data-save-recur]');
  await expect(app.main).toContainText('Flat rent');
  await expect(app.main).toContainText('last added');
  await app.tab('dashboard');
  await expect(app.main).toContainText('18,000');
  await expect(app.main).toContainText('auto');
});

test('a reload does not add the recurring entry twice, and it can be paused', async () => {
  await app.reload();
  expect((await app.data()).tx.filter((t: any) => t.recurringId)).toHaveLength(1);
  await app.tab('settings');
  await app.click('[data-detail^="recur|"]');
  await app.select('#e-active', '0');
  await app.click('#sheet [data-save-recur]');
  await expect(app.main).toContainText('paused');
});

test('CSV copy produces header plus three rows and CSV download fires', async () => {
  await expect(page().locator('#csv')).toHaveCount(1);
  await expect(page().locator('#csv-dl')).toHaveCount(1);
  const csv = await app.copyCsv();
  expect(csv.split(/\r?\n/), 'header + 3 rows').toHaveLength(4);
  const [dl] = await Promise.all([page().waitForEvent('download'), app.click('#csv-dl')]);
  expect(dl.suggestedFilename()).toMatch(/\.csv$/);
});

test('the backup reminder shows for old data never backed up, goes after a backup, and returns after 31 days', async () => {
  await app.patch(d => {
    d.tx[0].date = '2026-09-01';
    delete d.meta.lastBackup;
  });
  await app.reload();
  await app.tab('dashboard');
  const banner = page().locator('.banner[data-go="settings"]');
  await expect(banner).toHaveCount(1);
  await banner.click();
  await expect(page().locator('nav .tab.on')).toHaveAttribute('data-go', 'settings');
  await app.click('#export');
  await expect(app.main).toContainText('Last backup');
  expect((await app.text('#main')).split('Last backup')[1].slice(0, 30)).not.toMatch(/never/);
  await app.tab('dashboard');
  await expect(banner).toHaveCount(0);
  await app.patch(d => {
    d.meta.lastBackup = Date.now() - 31 * 864e5;
  });
  await app.reload();
  await app.tab('dashboard');
  await expect(app.main).toContainText('Last backup 31 days ago');
});

test('a PIN locks the app on reload; a wrong PIN is rejected, the right one unlocks', async () => {
  await app.tab('settings');
  await app.setPin('1234');
  await expect(app.main).toContainText('Change PIN');
  await app.reload();
  await expect(app.lock).toBeVisible();
  await app.shot('02-lock', false);
  await app.pin('1111');
  await app.expectToast(/Wrong PIN/);
  await expect(app.lock).toBeVisible();
  await app.pin('1234');
  await app.expectUnlocked();
});

test('changing the PIN needs the current one; the PIN can be removed', async () => {
  await app.tab('settings');
  await app.click('[data-detail="pin|change"]');
  await app.fill('#p-cur', '0000');
  await app.fill('#p-new', '5678');
  await app.fill('#p-new2', '5678');
  await app.click('#sheet [data-pin-save="change"]');
  await app.expectToast(/Current PIN is wrong/);
  await app.fill('#p-cur', '1234');
  await app.fill('#p-new', '5678');
  await app.fill('#p-new2', '5678');
  await app.click('#sheet [data-pin-save="change"]');
  await app.expectToast(/PIN changed/);
  await app.click('[data-detail="pin|remove"]');
  await app.fill('#p-cur', '5678');
  await app.click('#sheet [data-pin-save="remove"]');
  await app.expectToast(/PIN removed/);
  await expect(app.main).toContainText('Set a 4-digit PIN');
});

test('forgot PIN erases the ledger and unlocks', async () => {
  await app.setPin('9999');
  await app.reload();
  await app.click('#pin-forgot');
  await app.click('#pin-erase');
  await app.expectUnlocked();
  await app.finishWelcome('Shreya', 'Sanghavi');
  await expect(app.main).toContainText('₹0');
});

test('a backup carrying statement days, budgets and recurring entries migrates and applies due recurring', async () => {
  await page().evaluate(k => {
    localStorage.setItem(
      k,
      JSON.stringify({
        profile: { firstName: 'Shreya', lastName: 'Sanghavi' },
        accounts: [
          { id: 'a1', name: 'HDFC Bank', type: 'bank' },
          { id: 'c1', name: 'Axis Bank Magnus', type: 'card', statementDay: 20 },
        ],
        categories: ['Food', 'Transport', 'Other'],
        tx: [{ id: 'x', amount: 50, category: 'Food', accountId: 'a1', date: '2026-10-02' }],
        budgets: { Food: '3000', Bad: 0 },
        recurring: [
          {
            id: 'r1',
            amount: 999,
            category: 'Other',
            method: 'card',
            accountId: 'c1',
            day: 5,
            note: 'Netflix',
            active: true,
            since: '2026-10',
            lastApplied: '',
          },
        ],
      }),
    );
  }, 'money-tracker.v1');
  await app.reload();
  const mig = await app.data();
  expect(mig.accounts.find((a: any) => a.id === 'c1').statementDay).toBe(20);
  expect(mig.budgets.Food).toBe(3000);
  expect('Bad' in mig.budgets).toBe(false);
  expect(mig.recurring[0].lastApplied).toBe(lastAppliedMonth(5, '2026-10'));
  expect(mig.tx.some((t: any) => t.recurringId === 'r1')).toBe(true);
});

test('an old hashed pin field does not lock the app and is dropped on the next save', async () => {
  await app.patch(d => {
    d.pin = 'daec90c8';
  });
  await app.reload();
  await expect(app.lock).toBeHidden();
  await app.tab('settings');
  await app.fill('#new-cat', 'Wedding');
  await app.click('#add-cat');
  await app.expectStored(d => !('pin' in d), 'pin field dropped');
});

test('thirteen categories get thirteen distinct colours with Other grey', async () => {
  await app.patch(d => {
    d.categories.push('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
  });
  await app.reload();
  await app.tab('settings');
  const dots = await page()
    .locator('[data-del-cat]')
    .evaluateAll(l => l.map(b => (b.previousElementSibling!.previousElementSibling as HTMLElement).style.background));
  expect(new Set(dots).size, dots.join(' ')).toBe(13);
  expect(dots[9]).toBe('var(--c10)');
  expect(dots[10]).toBe('var(--c11)');
  expect(dots.slice(0, 9)).not.toContain('var(--c10)');
  await app.expectNoHorizontalScroll();
  await app.shot('03-settings');
  await page().emulateMedia({ colorScheme: 'dark' });
  await app.tab('dashboard');
  await app.shot('04-dashboard-dark');
  app.expectNoErrors();
});
