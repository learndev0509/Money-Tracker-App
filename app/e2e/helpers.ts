/*
 * Shared helper for the browser suites. Each spec is one story told in order (serial mode) on a
 * single phone-sized page; `App` wraps that page with the handful of actions every story needs
 * and collects page errors so the last test of each story can assert there were none.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
} from '@playwright/test';

export const KEY = 'money-tracker.v1';
export const SNAP = 'money-tracker.v1.snapshots';
export const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const SHOTS = path.resolve(import.meta.dirname, 'shots');

export type Ledger = Record<string, any>;
export type Snapshot = { day: string; n: number; raw: string };

export class App {
  readonly errors: string[] = [];
  readonly main: Locator;
  readonly sheet: Locator;
  readonly sheetHead: Locator;
  readonly sheetBody: Locator;
  readonly toast: Locator;
  readonly toastText: Locator;
  readonly toastBtn: Locator;
  readonly welcome: Locator;
  readonly lock: Locator;
  readonly recent: Locator;
  readonly nav: Locator;

  constructor(
    readonly page: Page,
    readonly context: BrowserContext,
    readonly suite: string,
  ) {
    page.on('pageerror', e => this.errors.push('pageerror: ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g/.test(m.text())) this.errors.push('console: ' + m.text());
    });
    this.main = page.locator('#main');
    this.sheet = page.locator('#sheet');
    this.sheetHead = page.locator('#sheet-head');
    this.sheetBody = page.locator('#sheet-body');
    this.toast = page.locator('#toast');
    this.toastText = page.locator('#toast-text');
    this.toastBtn = page.locator('#toast-btn');
    this.welcome = page.locator('#welcome');
    this.lock = page.locator('#lock');
    this.recent = page.locator('#recent');
    this.nav = page.locator('nav');
  }

  /** A fresh phone-sized context and page for one story. */
  static async open(browser: Browser, suite: string, options: BrowserContextOptions = {}) {
    const context = await browser.newContext({ ...PHONE, ...options });
    return new App(await context.newPage(), context, suite);
  }
  async close() {
    await this.context.close();
  }

  // --- navigation
  /** Load the app and wait until it has booted: welcome, lock screen or a rendered screen. */
  async goto(url = '/index.html') {
    await this.page.goto(url);
    await this.booted();
  }
  async reload() {
    await this.page.reload();
    await this.booted();
  }
  private async booted() {
    await this.page.locator('#welcome:not([hidden]), #lock:not([hidden]), #main > *').first().waitFor();
  }
  /** Fill in the welcome screen if it is showing. */
  async finishWelcome(first = 'Shreya', last = '') {
    if (await this.welcome.isHidden()) return;
    await this.page.fill('#w-first', first);
    if (last) await this.page.fill('#w-last', last);
    await this.page.click('#w-go');
    await expect(this.welcome).toBeHidden();
  }
  async tab(view: 'dashboard' | 'history' | 'settings') {
    await this.page.click(`nav [data-go="${view}"]`);
  }
  async add() {
    await this.page.click('#add-btn');
  }

  // --- small actions; `click` takes the first match like the original page.click did
  async click(selector: string) {
    await this.page.locator(selector).first().click();
  }
  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }
  async select(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }
  async text(selector: string) {
    return (await this.page.textContent(selector)) || '';
  }
  async flat(selector: string) {
    return (await this.text(selector)).replace(/\s+/g, '');
  }
  async value(selector: string) {
    return this.page.inputValue(selector);
  }
  async count(selector: string) {
    return this.page.locator(selector).count();
  }
  async has(selector: string) {
    return (await this.count(selector)) > 0;
  }
  async hasClass(selector: string, cls: string) {
    return this.page
      .locator(selector)
      .first()
      .evaluate((e, c) => e.classList.contains(c), cls);
  }
  /** Type into the bank/card picker and choose the named entry. */
  async pick(query: string, name: string) {
    await this.page.fill('#pick-search', query);
    await this.page.click(`#pick-list [data-pick="${name}"]`);
  }
  /** Tap digits on the lock screen keypad, once the shake after a wrong PIN has cleared the entry. */
  async pin(digits: string) {
    await expect(this.page.locator('#pin-dots')).not.toHaveClass(/\bshake\b/);
    for (const k of digits) await this.page.click(`#keypad [data-key="${k}"]`);
  }
  async expectUnlocked() {
    await expect(this.lock).toBeHidden({ timeout: 8_000 });
  }
  async expectToast(re: RegExp) {
    await expect(this.toast).toContainText(re, { timeout: 5_000 });
  }
  /** Save an expense from the Add screen: amount, category, note, method. */
  async addExpense(
    amount: string,
    category: string,
    note: string | null = '',
    method: 'cash' | 'online' | 'bank' | 'upi' | 'card' | null = null,
  ) {
    await this.page.fill('#f-amount', amount);
    await this.page.click(`#cat-chips .chip[data-cat="${category}"]`);
    if (note !== null) await this.page.fill('#f-note', note);
    if (method) await this.page.click(`[data-method="${method}"]`);
    await this.page.click('#save-tx');
  }
  /** Set a PIN from Settings through the pin sheet. */
  async setPin(pin: string) {
    await this.click('[data-detail="pin|set"]');
    await this.fill('#p-new', pin);
    await this.fill('#p-new2', pin);
    await this.click('#sheet [data-pin-save="set"]');
    await this.expectToast(/PIN turned on/);
  }

  // --- storage
  raw() {
    return this.page.evaluate(k => localStorage.getItem(k), KEY);
  }
  data(): Promise<Ledger> {
    return this.page.evaluate(k => JSON.parse(localStorage.getItem(k)!), KEY);
  }
  snaps(): Promise<Snapshot[]> {
    return this.page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), SNAP);
  }
  /** Edit the stored ledger in place (plain JSON only). */
  patch(fn: (d: Ledger) => void) {
    return this.page.evaluate(
      ([k, src]) => {
        const d = JSON.parse(localStorage.getItem(k)!);
        new Function('d', `(${src})(d)`)(d);
        localStorage.setItem(k, JSON.stringify(d));
      },
      [KEY, fn.toString()] as const,
    );
  }
  /** Wait until the stored ledger satisfies `pred` (saves after crypto are asynchronous). */
  async expectStored(pred: (d: Ledger) => boolean, message?: string) {
    await expect.poll(async () => pred(await this.data()), { message }).toBe(true);
  }
  async expectRaw(pred: (raw: string) => boolean, message?: string) {
    await expect.poll(async () => pred((await this.raw()) || ''), { message }).toBe(true);
  }
  theme() {
    return this.page.evaluate(() => document.documentElement.dataset.theme || '');
  }
  thisMonth() {
    return todayKey().slice(0, 7);
  }

  // --- checks shared by every story
  async shot(name: string, fullPage = true) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await this.page.screenshot({ path: path.join(SHOTS, `${this.suite}-${name}.png`), fullPage });
  }
  async expectNoHorizontalScroll() {
    expect(
      await this.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      'no horizontal scroll',
    ).toBe(true);
  }
  expectNoErrors() {
    expect(this.errors, 'page and console errors').toEqual([]);
  }
}

/** Plain-JSON check for the encrypted blob layouts. */
export const isEncrypted = (s: string | null) => {
  try {
    const o = JSON.parse(s || '');
    return !!(o && (o.enc === 1 || o.enc === 2) && o.ct && o.iv);
  } catch {
    return false;
  }
};
export const isWrappedPinOnly = (s: string | null) => {
  try {
    const o = JSON.parse(s || '');
    return !!(o && o.enc === 2 && o.ct && o.iv && o.pin && o.pin.salt && o.pin.ct && !o.face);
  } catch {
    return false;
  }
};

/** Today as the app's local date key (YYYY-MM-DD). */
export const todayKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
