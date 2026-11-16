import { esc, pad } from '../lib/constants';
import { compact, daysInMonth, money, monthLabel, shortDate, thisMonth, today } from '../lib/dates';
import { sum } from '../queries/ledger';
import type { Tx } from '../data/model';
/** One slice of the category donut. */
export interface DonutPart {
  name: string;
  value: number;
  color: string;
  detail: string;
}
/** One bar of a bar chart; `on` highlights it, `detail` opens a sheet on tap, `period` opens that month on the Dashboard. */
export interface Bar {
  label: string;
  v: number;
  on?: boolean;
  detail?: string;
  period?: string;
  /** Drawn as a stub: a month still ahead. */
  future?: boolean;
}
/* charts */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const f = (v: number) => v.toFixed(2);
  return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${r} ${r} 0 ${large} 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}
export function donutSVG(parts: DonutPart[], total: number, top: string, bottom: string) {
  const cx = 70,
    cy = 70,
    r = 54,
    sw = 16;
  let out = '';
  if (parts.length === 1) {
    const p = parts[0];
    out = `<circle class="arc" pathLength="1" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${sw}" data-detail="${esc(p.detail)}" style="cursor:pointer"><title>${esc(p.name)}: ${esc(money(p.value))}</title></circle>`;
  } else {
    const gap = 2.5 / r;
    let a = -Math.PI / 2;
    parts.forEach((p, i) => {
      const span = (p.value / total) * Math.PI * 2;
      const a0 = a + gap / 2,
        a1 = a + span - gap / 2;
      if (a1 > a0)
        out += `<path class="arc" pathLength="1" d="${arcPath(cx, cy, r, a0, a1)}" fill="none" stroke="${p.color}" stroke-width="${sw}" data-detail="${esc(p.detail)}" style="cursor:pointer;--d:${i * 90}ms"><title>${esc(p.name)}: ${esc(money(p.value))}</title></path>`;
      a += span;
    });
  }
  return `<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Spend by category"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="${sw}"/>${out}
    <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="14" font-weight="600" style="fill:var(--ink);font-family:var(--mono);pointer-events:none">${esc(top)}</text>
    <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="9" style="fill:var(--muted);font-family:var(--font);pointer-events:none">${esc(bottom)}</text></svg>`;
}
export function dailyChartSVG(k: string, tx: Tx[]) {
  const n = daysInMonth(k);
  const by = new Array(n + 1).fill(0);
  tx.forEach(t => {
    by[+t.date.slice(8, 10)] += t.amount;
  });
  const max = Math.max.apply(null, by.concat([1]));
  const W = 340,
    H = 150,
    L = 6,
    R = 6,
    T = 16,
    B = 22,
    plot = H - T - B,
    slot = (W - L - R) / n,
    bw = Math.max(4, slot - 3);
  const isCur = k === thisMonth(),
    td = +today().slice(8, 10);
  const elapsed = isCur ? td : n,
    avg = elapsed ? sum(tx) / elapsed : 0;
  const f = (v: number) => v.toFixed(1);
  let out = '';
  if (avg > 0) {
    const y = T + plot - (avg / max) * plot;
    out += `<line x1="${L}" x2="${W - R}" y1="${f(y)}" y2="${f(y)}" style="stroke:var(--muted);stroke-dasharray:3 3;opacity:.7"/><text x="${W - R}" y="${f(y - 4)}" text-anchor="end" font-size="9" style="fill:var(--muted);font-family:var(--font)">avg ${esc(compact(avg))}/day</text>`;
  }
  for (let d = 1; d <= n; d++) {
    const x = L + (d - 1) * slot + (slot - bw) / 2,
      v = by[d],
      future = isCur && d > td,
      isToday = isCur && d === td,
      key = k + '-' + pad(d);
    const h = v ? Math.max(3, (v / max) * plot) : 0,
      y = T + plot - h;
    if (future)
      out += `<rect x="${f(x)}" y="${T + plot - 2}" width="${f(bw)}" height="2" rx="1" style="fill:var(--line);opacity:.5"/>`;
    else
      out += `<g data-detail="day|${key}" style="cursor:pointer"><title>${esc(shortDate(key))}: ${esc(money(v))}</title><rect x="${f(x - 1.5)}" y="${T}" width="${f(bw + 3)}" height="${plot}" fill="transparent"/>${v ? `<rect class="gbar" x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(h)}" rx="2" style="fill:var(--accent);opacity:${isToday ? 1 : 0.55};--d:${d * 14}ms"/>` : `<rect x="${f(x)}" y="${T + plot - 2}" width="${f(bw)}" height="2" rx="1" style="fill:var(--line)"/>`}</g>`;
    if (d === 1 || d % 5 === 0 || (d === n && n % 5 >= 3))
      out += `<text x="${f(x + bw / 2)}" y="${H - 7}" text-anchor="middle" font-size="9" style="fill:var(${isToday ? '--ink' : '--muted'});font-family:var(--font)">${d}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="height:auto" role="img" aria-label="Daily spend for ${esc(monthLabel(k))}"><text x="${L}" y="10" font-size="9" style="fill:var(--muted);font-family:var(--font)">peak day ${esc(compact(max))}</text>${out}</svg>`;
}
export function barsSVG(items: Bar[]) {
  const W = 340,
    H = 130,
    L = 6,
    R = 6,
    T = 16,
    B = 22,
    plot = H - T - B,
    n = items.length,
    slot = (W - L - R) / n,
    bw = Math.min(34, slot - 8);
  const max = Math.max.apply(null, items.map(x => x.v).concat([1]));
  const f = (v: number) => v.toFixed(1);
  let out = '';
  items.forEach((x, i) => {
    const px = L + i * slot + (slot - bw) / 2,
      h = x.v ? Math.max(3, (x.v / max) * plot) : 0,
      y = T + plot - h;
    const tap = x.detail
      ? `data-detail="${esc(x.detail)}" style="cursor:pointer"`
      : x.period && !x.future
        ? `data-period="${esc(x.period)}" data-scope="month" style="cursor:pointer"`
        : '';
    out += `<g ${tap}><title>${esc(x.label)}: ${esc(money(x.v))}</title><rect x="${f(px - 2)}" y="${T}" width="${f(bw + 4)}" height="${plot}" fill="transparent"/>${x.v ? `<rect class="gbar" x="${f(px)}" y="${f(y)}" width="${f(bw)}" height="${f(h)}" rx="4" style="fill:var(--accent);opacity:${x.on ? 1 : 0.55};--d:${i * 50}ms"/><text x="${f(px + bw / 2)}" y="${f(y - 4)}" text-anchor="middle" font-size="9" style="fill:var(--ink-2);font-family:var(--font)">${esc(compact(x.v))}</text>` : `<rect x="${f(px)}" y="${T + plot - 2}" width="${f(bw)}" height="2" rx="1" style="fill:var(--line);opacity:${x.future ? 0.5 : 1}"/>`}<text x="${f(px + bw / 2)}" y="${H - 7}" text-anchor="middle" font-size="9.5" style="fill:var(${x.on ? '--ink' : '--muted'});font-family:var(--font)">${esc(x.label)}</text></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="height:auto" role="img">${out}</svg>`;
}
export function cumulativeSVG(cur: Tx[], prev: Tx[], dim: number, pdim: number, upto: number) {
  const W = 340,
    H = 150,
    L = 8,
    R = 44,
    T = 12,
    B = 20,
    plot = H - T - B,
    pw = W - L - R;
  const f = (v: number) => v.toFixed(1);
  const run = (tx: Tx[], n: number) => {
    const by = new Array(n + 1).fill(0);
    tx.forEach(t => {
      by[+t.date.slice(8, 10)] += t.amount;
    });
    const c: number[] = [];
    let s = 0;
    for (let d = 1; d <= n; d++) {
      s += by[d];
      c.push(s);
    }
    return c;
  };
  const a = run(cur, dim),
    b = run(prev, pdim),
    max = Math.max(a[a.length - 1], b[b.length - 1], 1),
    n = Math.max(dim, pdim);
  const pt = (c: number, i: number) => f(L + (i / (n - 1)) * pw) + ' ' + f(T + plot - (c / max) * plot);
  const path = (c: number[], len: number) =>
    'M' +
    c
      .slice(0, len)
      .map((v, i) => pt(v, i))
      .join(' L');
  const al = upto ? Math.min(upto, dim) : dim;
  const end = (c: number[], len: number, color: string, w: number) =>
    `<circle cx="${f(L + ((len - 1) / (n - 1)) * pw)}" cy="${f(T + plot - (c[len - 1] / max) * plot)}" r="3.5" style="fill:${color}"/><text x="${f(L + ((len - 1) / (n - 1)) * pw + 7)}" y="${f(T + plot - (c[len - 1] / max) * plot + 3.5)}" font-size="9.5" font-weight="${w}" style="fill:${color};font-family:var(--mono)">${esc(compact(c[len - 1]))}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="height:auto" role="img" aria-label="Running total this month against last month">
    ${[0.25, 0.5, 0.75, 1].map(q => `<line x1="${L}" x2="${L + pw}" y1="${f(T + plot - q * plot)}" y2="${f(T + plot - q * plot)}" style="stroke:var(--line)"/>`).join('')}
    <path class="arc" pathLength="1" d="${path(b, pdim)}" fill="none" style="stroke:var(--muted);stroke-width:2;stroke-dasharray:4 3"/>
    <path class="arc" pathLength="1" d="${path(a, al)}" fill="none" style="stroke:var(--accent);stroke-width:2.5;--d:120ms"/>
    ${end(b, pdim, 'var(--muted)', 500)}${end(a, al, 'var(--accent)', 600)}
    ${[1, 10, 20, n].map(d => `<text x="${f(L + ((d - 1) / (n - 1)) * pw)}" y="${H - 6}" text-anchor="middle" font-size="9" style="fill:var(--muted);font-family:var(--font)">${d}</text>`).join('')}</svg>`;
}
