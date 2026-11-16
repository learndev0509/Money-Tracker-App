import { SheetView } from './index';
import { sum, txIn } from '../../queries/ledger';
import { movers } from '../../queries/compare';
import { addMonths, compact, daysInMonth, money, monthLabel, parseDate, pct, thisMonth, today } from '../../lib/dates';
import { DAY3, MON, esc, pad } from '../../lib/constants';
import { moverRows, tiles } from '../../ui/shared';
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
  const moved = movers(cur, prev, 6);
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
      ${moved.length ? `<h3>What moved</h3><div class="list">${moverRows(moved, k, 'last month')}</div>` : ''}`,
  };
}
