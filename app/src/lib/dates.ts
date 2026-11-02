import { DAY3, DAYS, MON, MONTHS, pad } from './constants';
/* ---------- dates & money ---------- */
/** YYYY-MM-DD in local time. Every stored date uses this form. */
export const dateKey = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
/** HH:MM, 24-hour, local time. */
export const timeKey = (d: Date) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const today = () => dateKey(new Date());
/** YYYY-MM of today. Month keys are the first seven characters of a date key. */
export const thisMonth = () => today().slice(0, 7);
export const parseDate = (s: string) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
export const fmtTime = (t: string) => { if (!t) return ''; const p = t.split(':').map(Number); const h = p[0], m = p[1]; return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'pm' : 'am'); };
export const longDate = (s: string) => { const d = parseDate(s); return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
export const midDate = (s: string) => { const d = parseDate(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
export const shortDate = (s: string) => { const d = parseDate(s); return DAY3[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
export const dm = (s: string) => { const d = parseDate(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
export const monthLabel = (k: string) => MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
export const daysInMonth = (k: string) => { const p = k.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); };
export const addMonths = (k: string, n: number) => { const p = k.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
export const fmt0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fmt2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** ₹ with lakh grouping; paise only when the amount has them. */
export const money = (n: number | string) => { const v = Math.round((+n || 0) * 100) / 100; return (Number.isInteger(v) ? fmt0 : fmt2).format(v); };
export const trim0 = (s: string) => s.replace(/\.0+$/, '');
/** ₹2.5k, ₹1.5L, ₹1.20Cr: the short form used in tiles and chart labels. */
export const compact = (n: number | string) => { n = +n || 0; const neg = n < 0; n = Math.abs(n); let s: string; if (n >= 1e7) s = '₹' + trim0((n / 1e7).toFixed(2)) + 'Cr'; else if (n >= 1e5) s = '₹' + trim0((n / 1e5).toFixed(1)) + 'L'; else if (n >= 1e3) s = '₹' + trim0((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + 'k'; else s = '₹' + Math.round(n); return (neg ? '-' : '') + s; };
export const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0;
