import { SheetView } from './index';
import { groupBy, sum, txIn } from '../../queries/ledger';
import { addMonths, compact, daysInMonth, money, monthLabel, parseDate, pct, thisMonth, today } from '../../lib/dates';
import { DAY3, MON, esc, pad } from '../../lib/constants';
import { catIcon, tiles } from '../../ui/shared';
import { barsSVG, cumulativeSVG, dailyChartSVG } from '../../ui/charts';
/* Trends sheet: this month against last month. */
export function trendSheet(p: string[]): SheetView {
  const k = p[1],
    cur = txIn(k),
    prevK = addMonths(k, -1),
    prev = txIn(prevK),
    total = sum(cur),
    pt = sum(prev),
    isCur = k === thisMonth(),
    dim = daysInMonth(k),
    elapsed = isCur ? +today().slice(8, 10) : dim;
  const byWd = [0, 0, 0, 0, 0, 0, 0],
    cnt = [0, 0, 0, 0, 0, 0, 0];
  cur.forEach(t => {
    byWd[parseDate(t.date).getDay()] += t.amount;
  });
  for (let d = 1; d <= elapsed; d++) cnt[parseDate(k + '-' + pad(d)).getDay()]++;
  const wd = [1, 2, 3, 4, 5, 6, 0].map(i => ({
    label: DAY3[i],
    v: cnt[i] ? byWd[i] / cnt[i] : 0,
    on: isCur && i === new Date().getDay(),
  }));
  const months = Array.from({ length: 6 }, (_, i) => {
    const mk = addMonths(k, i - 5);
    return { label: MON[+mk.slice(5, 7) - 1], v: sum(txIn(mk)), on: mk === k, detail: 'month|' + mk };
  });
  const cats = groupBy(cur, t => t.category),
    pcats = groupBy(prev, t => t.category);
  const movers = cats
    .map(g => {
      const q = pcats.find(x => x.key === g.key);
      return { c: g.key, v: g.v, pv: q ? q.v : 0, d: g.v - (q ? q.v : 0) };
    })
    .concat(pcats.filter(q => !cats.some(g => g.key === q.key)).map(q => ({ c: q.key, v: 0, pv: q.v, d: -q.v })))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 6);
  return {
    title: 'Trends',
    sub: monthLabel(k) + ' against ' + monthLabel(prevK),
    tall: true,
    body: `${tiles([
      ['This month', money(total)],
      ['Last month', money(pt)],
      ['Change', pt ? (total >= pt ? '▲ ' : '▼ ') + Math.abs(pct(total - pt, pt)) + '%' : '—'],
      ['Per day', compact(elapsed ? total / elapsed : 0)],
    ])}
      <h3>Running total</h3><div class="chart">${cumulativeSVG(cur, prev, dim, daysInMonth(prevK), isCur ? elapsed : 0)}</div><div class="legend"><span><i style="background:var(--accent)"></i>${esc(monthLabel(k))}</span><span><i style="background:var(--muted)"></i>${esc(monthLabel(prevK))}</span></div>
      <h3>Day by day</h3><div class="chart">${dailyChartSVG(k, cur)}</div>
      <h3>Average by weekday</h3><div class="chart">${barsSVG(wd)}</div>
      <h3>Last six months</h3><div class="chart">${barsSVG(months)}</div>
      ${movers.length ? `<h3>What moved</h3><div class="list">${movers.map(m => `<button type="button" class="prow" data-detail="cat|${k}|${esc(m.c)}"><span class="prow-top">${catIcon(m.c)}<span class="name">${esc(m.c)}<span class="small">${esc(money(m.pv))} last month</span></span><span class="amt" style="color:${m.d > 0 ? 'var(--danger)' : m.d < 0 ? 'var(--good)' : 'inherit'}">${m.d > 0 ? '▲ ' : m.d < 0 ? '▼ ' : ''}${esc(money(Math.abs(m.d)))}</span><span class="chev">›</span></span></button>`).join('')}</div>` : ''}`,
  };
}
