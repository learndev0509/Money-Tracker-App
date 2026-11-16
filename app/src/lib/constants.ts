/* App-wide constants and tiny helpers with no dependency on the ledger. */
export const APP_VERSION: string = __APP_VERSION__;
export const APP_BUILD: string = __APP_BUILD__;
/** Where "Report a problem" sends its email. Empty means the Copy button only. */
export const SUPPORT_EMAIL = '';
export const KEY = 'money-tracker.v1',
  OLD_KEY = 'rupee-ledger.v1',
  SNAP_KEY = 'money-tracker.v1.snapshots',
  SNAPS = 3;
export const ERR_KEY = 'money-tracker.v1.errors';
/** A plain copy of the Light/Dark choice, readable while the ledger is still locked. */
export const THEME_KEY = 'money-tracker.v1.theme';
export const VIEWS = ['add', 'dashboard', 'history', 'settings'] as const;
export type View = (typeof VIEWS)[number];
export const isView = (x: unknown): x is View => (VIEWS as readonly unknown[]).includes(x);
export const COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--c9', '--c10'],
  EXTRA_COLORS = ['--c11', '--c12', '--c13', '--c14', '--c15', '--c16'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const pad = (n: number) => String(n).padStart(2, '0');
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const esc = (s: unknown) =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
/** What a screen element looks like to the rendering code: an element that may also be a form control. */
export type El = HTMLElement & { value: string; files?: FileList | null; select(): void };
/** querySelector as the app uses it: the result is used directly and may be null at runtime, exactly as before. */
export const el = <T = El>(sel: string, root?: ParentNode): T => (root || document).querySelector(sel) as unknown as T;
export const norm = (s: unknown) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
export const ordinal = (n: number) =>
  n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
export const reduceMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
};
export const isIOS = () => {
  try {
    return (
      /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  } catch (e) {
    return false;
  }
};
export const isAndroid = () => {
  try {
    return /Android/i.test(navigator.userAgent);
  } catch (e) {
    return false;
  }
};
/** True when the page runs as the installed Home Screen app rather than in a browser tab. */
export const isInstalled = () => {
  try {
    return !!navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  } catch (e) {
    return false;
  }
};
/** The install card shows on any phone, iPhone or Android, until the app is on the Home Screen. */
export const needsInstall = () => (isIOS() || isAndroid()) && !isInstalled();
/** What this phone calls its biometric unlock: Face ID on iPhone, fingerprint or face elsewhere. */
export const bioName = () => (isIOS() ? 'Face ID' : 'fingerprint or face');
export const bioTitle = () => (isIOS() ? 'Face ID' : 'Fingerprint or face');
