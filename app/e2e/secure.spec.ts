/*
 * Face ID, the service worker and budget notifications need a secure origin. The built app is
 * served from a fake https://money.test through a route that reads dist/, and Chromium's virtual
 * authenticator (CTAP2 with PRF) stands in for the passkey.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type CDPSession } from '@playwright/test';
import { App } from './helpers';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');
const ORIGIN = 'https://money.test';
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

test.describe.configure({ mode: 'serial' });
test.skip(() => !!process.env.APP_URL, 'serves dist/ itself; not for a remote server');
let app: App, cdp: CDPSession, authenticatorId: string;

test.beforeAll(async ({ browser }) => {
  app = await App.open(browser, 'secure', { ignoreHTTPSErrors: true });
  await app.context.route(ORIGIN + '/**', route => {
    const u = new URL(route.request().url());
    const f = path.join(DIST, u.pathname === '/' ? 'index.html' : u.pathname);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({
      status: 200,
      contentType: MIME[path.extname(f)] || 'application/octet-stream',
      body: fs.readFileSync(f),
    });
  });
  await app.context.addInitScript(() => {
    const w = window as any;
    w.__notes = [];
    w.__badge = null;
    class N {
      constructor(t: string, o: unknown) {
        w.__notes.push({ t, o });
      }
      static requestPermission() {
        return Promise.resolve(w.__perm || 'granted');
      }
    }
    Object.defineProperty(N, 'permission', { get: () => w.__perm || 'granted' });
    w.Notification = N;
    (navigator as any).setAppBadge = (n: number) => {
      w.__badge = n;
      return Promise.resolve();
    };
    (navigator as any).clearAppBadge = () => {
      w.__badge = 0;
      return Promise.resolve();
    };
  });
  cdp = await app.context.newCDPSession(app.page);
  await cdp.send('WebAuthn.enable');
  ({ authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true,
    },
  }));
  await app.goto(ORIGIN + '/index.html');
});

test.afterAll(async () => {
  await app?.close();
});

const page = () => app.page;
const notes = () => app.page.evaluate(() => (window as any).__notes as { t: string; o: any }[]);
const badge = () => app.page.evaluate(() => (window as any).__badge as number | null);
const blob = async () => JSON.parse((await app.raw())!);

test('the app serves from an https origin, declares five local faces and the service worker precaches them', async () => {
  expect(await page().evaluate(() => location.origin)).toBe(ORIGIN);
  expect(await page().evaluate(() => [...document.fonts].length)).toBe(5);
  const precached = await page().evaluate(async () => {
    await navigator.serviceWorker.ready;
    const name = (await caches.keys()).find(k => k.startsWith('money-tracker-'));
    if (!name) return [];
    const c = await caches.open(name);
    return (await c.keys()).map(k => new URL(k.url).pathname);
  });
  for (const p of ['/fonts/plex-mono-500.woff', '/icon-180.png', '/manifest.json']) expect(precached).toContain(p);
  await app.finishWelcome('Shreya');
});

test('a newer build taking over offers a reload; the first controller does not', async () => {
  // The first load was claimed by its own worker (activate calls clients.claim) and showed no prompt.
  await page().evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page().evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(app.toast).not.toHaveClass(/show/);
  // A controlled page that sees a controller change has been updated under it.
  await app.reload();
  expect(await page().evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page().evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
  await app.expectToast(/new version is ready/);
  await expect(app.toastBtn).toHaveText('Reload');
  await app.toastBtn.click();
  await expect(app.main.locator('.hero')).toBeVisible();
  await expect(app.toast).not.toHaveClass(/show/);
});

test('Face ID controls stay hidden until a PIN exists', async () => {
  await app.tab('settings');
  await expect(page().locator('[data-face]')).toHaveCount(0);
  await app.setPin('1234');
  await expect(page().locator('[data-face="enrol"]')).toHaveCount(1);
  expect(await app.flat('#main')).toMatch(/FingerprintorfaceunlockOff/);
});

test('enrolling creates a passkey and a Face ID wrapper beside the PIN wrapper', async () => {
  await app.click('[data-face="enrol"]');
  // Chromium's desktop user agent is not an iPhone, so the feature goes by its generic name here.
  await expect(app.toastText).toContainText('Fingerprint or face unlock is on', { timeout: 10_000 });
  await app.expectRaw(r => {
    const b = JSON.parse(r);
    return !!(b.enc === 2 && b.pin && b.face && b.face.id && b.face.salt && b.face.ct);
  }, 'enc:2 with pin and face wrappers');
  await expect(page().locator('[data-face="remove"]')).toHaveCount(1);
  const creds = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  expect(creds.credentials).toHaveLength(1);
  expect(creds.credentials[0].rpId).toBe('money.test');
  expect(creds.credentials[0].isResidentCredential).toBe(true);
});

test('locked on reload with the Face ID button offered; Face ID unlocks the encrypted ledger', async () => {
  await app.add();
  await app.addExpense('150', 'Food', null, 'cash');
  await app.expectRaw(r => JSON.parse(r).enc === 2);
  await app.reload();
  await expect(app.lock).toBeVisible();
  await expect(page().locator('#pin-face')).toBeVisible();
  await expect(page().locator('#lock-sub')).toContainText('Use your fingerprint or face, or enter your PIN');
  await app.click('#pin-face');
  await app.expectUnlocked();
  await expect(app.main).toContainText('₹150');
});

test('the PIN remains the fallback, and changing it leaves the Face ID wrapper untouched', async () => {
  await app.reload();
  await app.pin('1234');
  await app.expectUnlocked();
  const before = await blob();
  await app.tab('settings');
  await app.click('[data-detail="pin|change"]');
  await app.fill('#p-cur', '1234');
  await app.fill('#p-new', '5678');
  await app.fill('#p-new2', '5678');
  await app.click('#sheet [data-pin-save="change"]');
  await app.expectToast(/PIN changed/);
  await app.expectRaw(r => JSON.parse(r).pin.ct !== before.pin.ct, 'pin wrapper re-wrapped');
  const after = await blob();
  expect(after.face.ct).toBe(before.face.ct);
  expect(after.ct).not.toBe(before.ct);
  await app.reload();
  await app.click('#pin-face');
  await app.expectUnlocked();
});

test('without the passkey Face ID fails closed and the PIN path remains', async () => {
  await cdp.send('WebAuthn.clearCredentials', { authenticatorId });
  await app.reload();
  await app.click('#pin-face');
  // eslint-disable-next-line playwright/no-wait-for-timeout -- the failed assertion has no visible result; give it time to have happened
  await page().waitForTimeout(800); // the failed assertion has no visible result; give it time to have happened
  await expect(app.lock).toBeVisible();
  await app.pin('5678');
  await app.expectUnlocked();
});

test('turning Face ID off drops the wrapper; removing the PIN leaves plain JSON and no Face ID controls', async () => {
  await app.tab('settings');
  await app.click('[data-face="remove"]');
  await app.expectRaw(r => !JSON.parse(r).face, 'face wrapper dropped');
  await expect(page().locator('[data-face="enrol"]')).toHaveCount(1);
  await app.click('[data-detail="pin|remove"]');
  await app.fill('#p-cur', '5678');
  await app.click('#sheet [data-pin-save="remove"]');
  await app.expectToast(/PIN removed/);
  await app.expectRaw(r => !/"enc"/.test(r), 'plain JSON');
  await expect(page().locator('[data-face]')).toHaveCount(0);
});

test('adding the first budget asks for alerts and shows them On', async () => {
  await app.select('#budget-cat', 'Food');
  await app.fill('#budget-amt', '1000');
  await app.click('#budget-add');
  await expect.poll(() => app.flat('#main')).toMatch(/AlertsonthisphoneOn/);
  await expect(page().locator('[data-alerts="off"]')).toHaveCount(1);
});

test('crossing 80% toasts but does not notify; 90% and exceeding each post one notification and set the badge', async () => {
  await app.add();
  await app.click('#cat-chips .chip[data-cat="Food"]');
  await app.click('[data-method="cash"]');
  await app.fill('#f-amount', '700');
  await app.click('#save-tx');
  await expect(app.toastText).toContainText('Food is at 85%');
  expect(await notes()).toHaveLength(0);
  await app.fill('#f-amount', '60');
  await app.click('#save-tx');
  await expect.poll(async () => (await notes()).length).toBe(1);
  const n = (await notes())[0];
  expect(n.t).toMatch(/Budget alert · Food/);
  expect(n.o.body).toMatch(/91%/);
  expect(n.o.tag).toBe('budget-Food');
  expect(await badge()).toBe(0);
  await app.fill('#f-amount', '100');
  await app.click('#save-tx');
  await expect.poll(async () => (await notes()).length).toBe(2);
  expect((await notes())[1].o.body).toMatch(/exceeded/);
  await expect.poll(badge).toBe(1);
  await app.fill('#f-amount', '20');
  await app.click('#save-tx');
  await expect(app.toastText).toContainText(/Food is ₹30 over/);
  expect(await notes()).toHaveLength(2);
});

test('alerts can be turned off and stored; removing the over budget clears the badge; denied permission reads as blocked', async () => {
  await app.tab('settings');
  await app.click('[data-alerts="off"]');
  expect(await app.flat('#main')).toMatch(/AlertsonthisphoneOff/);
  await app.expectStored(d => d.meta.alerts === false);
  await app.click('[data-del-budget="Food"]');
  await expect.poll(badge).toBe(0);
  await page().evaluate(() => {
    (window as any).__perm = 'denied';
  });
  await app.tab('dashboard');
  await app.tab('settings');
  await expect(app.main).toContainText('Blocked in phone settings');
  app.expectNoErrors();
});
