import { SheetView } from './index';
import { DIR } from '../../lib/directory';
import { pickerBody } from '../../ui/picker';
/* Bank and card picker sheet. */
export function pickSheet(p: string[]): SheetView {
  const type = p[1] as 'bank' | 'card',
    ctx = p[2] || 'form';
  const n = DIR[type].length;
  const title =
    ctx === 'settings'
      ? type === 'bank'
        ? 'Add a bank account'
        : 'Add a credit card'
      : type === 'bank'
        ? 'Choose the bank account'
        : 'Choose the credit card';
  return {
    title,
    sub: (type === 'bank' ? n + ' banks' : n + ' cards') + ' · search or add your own',
    body: pickerBody(type, ctx),
    tall: true,
    focus: '#pick-search',
  };
}
