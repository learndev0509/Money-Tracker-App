import { test, expect } from '@playwright/test';
import { App, KEY, PHONE, isEncrypted, isWrappedPinOnly, todayKey } from './helpers';

test.describe.configure({ mode: 'serial' });
let app: App;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'safety');
  await app.goto();
  await app.finishWelcome('Shreya');
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
const txCount = async () => (await app.data()).tx.length;
const addFood = (amount: string, note: string) => app.addExpense(amount, 'Food', note, 'cash');
/** The "Expenses stored on this device" figure on Settings. */
const storedCount = async () => {
  await app.tab('settings');
  return +((await app.text('#main')).match(/Expenses stored on this device(\d+)/) || [0, -1])[1];
};

test('the first save of a day keeps a snapshot of the state before it; later saves the same day do not add one', async () => {
  await app.add();
  await addFood('100', 'One');
  await app.expectStored(() => true);
  let s = await app.snaps();
  expect(s).toHaveLength(1);
  expect(JSON.parse(s[0].raw).tx).toHaveLength(0);
  await addFood('200', 'Two');
  s = await app.snaps();
  expect(s).toHaveLength(1);
});

test('a new day adds a snapshot of the previous state and Settings lists the automatic copies', async () => {
  await page().evaluate(k => {
    const l = JSON.parse(localStorage.getItem(k)!);
    l[0].day = '2026-10-28';
    localStorage.setItem(k, JSON.stringify(l));
  }, 'money-tracker.v1.snapshots');
  await addFood('300', 'Three');
  const s = await app.snaps();
  expect(s, s.map(x => x.day).join(',')).toHaveLength(2);
  expect(s[0].day).toBe(todayKey());
  expect(JSON.parse(s[0].raw).tx).toHaveLength(2);
  await app.tab('settings');
  await expect(app.main).toContainText('Automatic copies');
  await expect(app.main).toContainText('28 October 2026');
  await expect(app.main).toContainText('2 expenses');
  await app.shot('01-snapshots');
});

test('restoring a snapshot asks to confirm, then replaces the ledger', async () => {
  await app.click('[data-ask="snap:2026-10-28"]');
  await expect(page().locator('[data-restore-snap="2026-10-28"]')).toHaveCount(1);
  await app.click('[data-restore-snap="2026-10-28"]');
  await app.expectToast(/Restored 0 expenses/);
  expect(await txCount()).toBe(0);
});

test('delete all empties the ledger with a single-use undo', async () => {
  await app.add();
  await addFood('50', 'Chai');
  await addFood('60', 'Auto');
  await app.tab('settings');
  await app.click('[data-ask="wipe"]');
  await app.click('#wipe');
  await expect(app.toastText).toContainText('All expenses deleted');
  await expect(app.toastBtn).toBeVisible();
  expect(await txCount()).toBe(0);
  await app.toastBtn.click();
  await expect(app.toastText).toContainText('Restored 2 expenses');
  expect(await txCount()).toBe(2);
  await expect(app.toastBtn).toBeHidden();
});

test('setting a PIN encrypts the ledger under a wrapped master key, and its snapshots too', async () => {
  await app.setPin('1111');
  await app.expectToast(/ledger encrypted/);
  await app.expectRaw(r => isWrappedPinOnly(r) && !/Chai/.test(r), 'ledger stored as enc:2 with a pin wrapper');
  await expect
    .poll(
      async () => {
        const s = await app.snaps();
        return s.length === 2 && s.every(x => isEncrypted(x.raw));
      },
      { message: 'both snapshots encrypted' },
    )
    .toBe(true);
  await app.add();
  await addFood('70', 'Dosa');
  await app.expectRaw(isWrappedPinOnly);
  await expect.poll(async () => (await app.snaps())[0].n).toBe(2);
});

test('locked on reload with nothing rendered; a wrong PIN cannot decrypt, the right one does', async () => {
  await app.reload();
  await expect(app.lock).toBeVisible();
  expect((await app.text('#main')).trim()).toBe('');
  await app.pin('9999');
  await app.expectToast(/Wrong PIN/);
  await expect(app.lock).toBeVisible();
  await app.pin('1111');
  await app.expectUnlocked();
  await expect(app.main).toContainText('Dosa');
  expect(await storedCount()).toBe(3);
});

test('changing the PIN re-wraps the master key: the old PIN stops working, the new one unlocks', async () => {
  await app.tab('settings');
  await app.click('[data-detail="pin|change"]');
  const before = JSON.parse((await app.raw())!).pin.ct;
  await app.fill('#p-cur', '1111');
  await app.fill('#p-new', '2222');
  await app.fill('#p-new2', '2222');
  await app.click('#sheet [data-pin-save="change"]');
  await app.expectToast(/PIN changed/);
  await app.expectRaw(r => isWrappedPinOnly(r) && JSON.parse(r).pin.ct !== before, 'pin wrapper re-wrapped');
  await app.reload();
  await app.pin('1111');
  await app.expectToast(/Wrong PIN/);
  await expect(app.lock).toBeVisible();
  await app.pin('2222');
  await app.expectUnlocked();
  expect(await storedCount()).toBe(3);
});

test('a store written by 1.1–1.7 (enc:1 with the PIN key) unlocks and is upgraded to the wrapped format', async () => {
  await page().evaluate(
    async ([k, date]) => {
      const plain = JSON.stringify({
        profile: { firstName: 'Shreya', lastName: '' },
        accounts: [],
        categories: ['Food'],
        tx: [
          {
            id: 'L',
            amount: 77,
            category: 'Food',
            accountId: 'cash',
            method: 'cash',
            date,
            time: '10:00',
            note: 'Legacy',
            recurringId: '',
          },
        ],
        income: [],
        cashIn: [],
        budgets: {},
        recurring: [],
        vehicles: [],
        meta: {},
        flags: { v2: true },
      });
      const salt = crypto.getRandomValues(new Uint8Array(16)),
        iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('money-tracker:4321'),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      );
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
      const b = (u: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(u)));
      localStorage.setItem(k, JSON.stringify({ enc: 1, salt: b(salt), iv: b(iv), ct: b(ct) }));
      localStorage.removeItem('money-tracker.v1.snapshots');
    },
    [KEY, todayKey()] as const,
  ); // dated today so the Month screen shows it
  await app.reload();
  await expect(app.lock).toBeVisible();
  await app.pin('4321');
  await app.expectUnlocked();
  await app.tab('dashboard');
  await expect(app.main).toContainText('Legacy');
  await app.expectRaw(isWrappedPinOnly, 'upgraded to enc:2');
  await app.reload();
  await app.pin('4321');
  await app.expectUnlocked();
  await app.tab('dashboard');
  await expect(app.main).toContainText('Legacy');
});

test('removing the PIN stores plain JSON again, snapshots included', async () => {
  await app.tab('settings');
  await app.click('[data-detail="pin|change"]');
  await app.fill('#p-cur', '4321');
  await app.fill('#p-new', '2222');
  await app.fill('#p-new2', '2222');
  await app.click('#sheet [data-pin-save="change"]');
  await app.expectToast(/PIN changed/);
  await app.tab('settings');
  await app.click('[data-detail="pin|remove"]');
  await app.fill('#p-cur', '2222');
  await app.click('#sheet [data-pin-save="remove"]');
  await app.expectToast(/PIN removed/);
  await app.expectRaw(r => !isEncrypted(r) && /Legacy/.test(r), 'plain JSON again');
  expect((await app.snaps()).every(s => !isEncrypted(s.raw))).toBe(true);
});

test('erase from the lock screen clears the snapshots too', async () => {
  await app.setPin('1111');
  await app.reload();
  await app.click('#pin-forgot');
  await app.click('#pin-erase');
  await expect.poll(async () => (await app.snaps()).length).toBe(0);
  expect(await page().evaluate(k => localStorage.getItem(k) === null, KEY)).toBe(true);
});

test('no install card on a desktop browser', async () => {
  await expect(page().locator('#w-install[hidden]')).toHaveCount(1);
  await expect(page().locator('.banner[data-detail="install|how"]')).toHaveCount(0);
});

test('iOS Safari gets install steps on the welcome, a banner on the Month screen and a steps sheet', async ({
  browser,
}) => {
  const ios = await App.open(browser, 'safety-ios', {
    ...PHONE,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  try {
    await ios.goto();
    const steps = ios.page.locator('#w-install');
    await expect(steps).toBeVisible();
    await expect(steps).toContainText('Add to your Home Screen first');
    await expect(steps).toContainText('Open this page in Safari');
    await expect(steps).toContainText('Add to Home Screen');
    await expect(steps.locator('[data-install-now]')).toHaveCount(0);
    await ios.shot('02-welcome-install');
    await ios.finishWelcome('Shreya');
    const banner = ios.page.locator('.banner[data-detail="install|how"]');
    await expect(banner).toHaveCount(1);
    await banner.click();
    await expect(ios.sheetHead).toContainText('Add to Home Screen');
    await expect(ios.sheetBody).toContainText('Copy backup first');
    await ios.shot('03-install-sheet', false);
    await ios.click('#sheet [data-install-later]');
    await expect(ios.sheet).toBeHidden();
    await expect(banner).toHaveCount(0);
    ios.expectNoErrors();
  } finally {
    await ios.close();
  }
});

test('Android Chrome gets the Chrome menu steps, an Install button once the browser offers one, and the banner', async ({
  browser,
}) => {
  const android = await App.open(browser, 'safety-android', {
    ...PHONE,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  });
  try {
    await android.goto();
    const steps = android.page.locator('#w-install');
    await expect(steps).toBeVisible();
    await expect(steps).toContainText('Add to your Home Screen first');
    await expect(steps).toContainText('Open this page in Chrome');
    await expect(steps).toContainText('Add to Home screen');
    await expect(steps).not.toContainText('Safari');
    await expect(steps.locator('[data-install-now]')).toHaveCount(0);
    await android.finishWelcome('Arjun');
    const banner = android.page.locator('.banner[data-detail="install|how"]');
    await expect(banner).toHaveCount(1);
    await expect(banner).toContainText('Opens full screen');
    await banner.click();
    await expect(android.sheetHead).toContainText('Add to Home Screen');
    await expect(android.sheetBody).toContainText('Open this page in Chrome');
    await expect(android.sheetBody).not.toContainText('Copy backup first');
    await expect(android.sheetBody.locator('[data-install-now]')).toHaveCount(0);
    await android.page.keyboard.press('Escape');
    await expect(android.sheet).toBeHidden();
    // The browser announces that the app can be installed: the sheet gains an Install button that runs its prompt.
    await android.page.evaluate(() => {
      const e = new Event('beforeinstallprompt') as any;
      e.prompt = () => {
        (window as any).__prompted = true;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await banner.click();
    await expect(android.sheetBody.locator('[data-install-now]')).toHaveCount(1);
    await android.shot('04-install-sheet-android', false);
    await android.click('#sheet [data-install-now]');
    await expect.poll(() => android.page.evaluate(() => (window as any).__prompted)).toBe(true);
    await expect(android.sheet).toBeHidden();
    await expect(banner).toHaveCount(0);
    await android.expectToast(/Installed/);
    android.expectNoErrors();
  } finally {
    await android.close();
  }
});

test('no horizontal scroll and no page errors', async () => {
  await app.expectNoHorizontalScroll();
  app.expectNoErrors();
});
