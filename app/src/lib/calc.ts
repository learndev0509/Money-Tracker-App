export function calcEval(str: unknown): number {
  const s = String(str || '')
    .replace(/[₹,\s]/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
  const tok = s.match(/\d*\.?\d+%?|[+\-*/]/g) || [];
  if (!tok.length || tok.join('') !== s) return NaN;
  const nums: number[] = [],
    ops: string[] = [];
  let expectNum = true;
  for (const t of tok) {
    if (/[+*/]/.test(t) || (t === '-' && !expectNum)) {
      if (expectNum) return NaN;
      ops.push(t);
      expectNum = true;
      continue;
    }
    if (t === '-') {
      nums.push(0);
      ops.push('-');
      continue;
    }
    if (!expectNum) return NaN;
    nums.push(t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t));
    expectNum = false;
  }
  if (expectNum) return NaN;
  const pass = (set: string) => {
    for (let i = 0; i < ops.length;) {
      if (set.includes(ops[i])) {
        const a = nums[i],
          b = nums[i + 1],
          o = ops[i];
        nums.splice(i, 2, o === '*' ? a * b : o === '/' ? a / b : o === '+' ? a + b : a - b);
        ops.splice(i, 1);
      } else i++;
    }
  };
  pass('*/');
  pass('+-');
  return Number.isFinite(nums[0]) ? Math.round(nums[0] * 100) / 100 : NaN;
}
export const parseAmt = (v: unknown): number => {
  const s = String(v || '');
  return /[+*/×÷%−]|\d-/.test(s) ? calcEval(s) : parseFloat(s.replace(/[^\d.]/g, ''));
};
