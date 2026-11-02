/* Screen state: what is being shown, filters, drafts being edited. Nothing here is persisted. */
import type { View } from '../lib/constants';
import type { Method, Tx } from '../data/model';
import { thisMonth, today } from '../lib/dates';
import { sortTx } from '../queries/ledger';

/** A record being edited in a sheet: amount as typed, plus whichever fields that kind of record has. */
export interface Draft {
  id?: string;
  kind?: 'expense' | 'income' | 'withdrawal' | 'adjust';
  amount: string;
  category: string;
  method: Method;
  accountId: string;
  date: string;
  time: string;
  note: string;
  day?: number;
  since?: string;
  active?: boolean;
  lastApplied?: string;
  recurringId?: string;
  vehicleId?: string;
}
/** The minimum the shared pay block needs from any draft or form. */
export interface PayState {
  method: Method;
  accountId: string;
}

export const ui = {
  view: 'dashboard' as View,
  period: thisMonth(),
  histYear: +today().slice(0, 4),
  histMonth: +today().slice(5, 7),
  histQuery: '',
  /** A delete awaiting its Yes/No, as 'kind:id'. */
  pending: null as string | null,
  sheetStack: [] as string[],
  pickQuery: '',
  fuelAddingVeh: false,
  fuelOpen: false,
  calcExpr: '',
  calcTarget: 'form' as CalcTarget,
  editTx: null as Draft | null,
  editRec: null as Draft | null,
  editCash: null as Draft | null,
  editIncome: null as Draft | null,
  pinEntry: '',
  hiddenAt: 0,
  undoToken: null as object | null,
  installHintHidden: false,
  unlocking: false,
};

export const HSORT = {
  new: 'Newest first',
  old: 'Oldest first',
  high: 'Amount: high to low',
  low: 'Amount: low to high',
};
export type HistSort = keyof typeof HSORT;
export const isHistSort = (x: unknown): x is HistSort => typeof x === 'string' && x in HSORT;
export type CalcTarget = 'form' | 'fuel' | 'sheet';
export const isCalcTarget = (x: unknown): x is CalcTarget => x === 'form' || x === 'fuel' || x === 'sheet';
export const hf = { method: '' as '' | Method, cat: '', sort: 'new' as HistSort };
export const histSorter = (): ((a: Tx, b: Tx) => number) =>
  hf.sort === 'old'
    ? (a, b) => sortTx(b, a)
    : hf.sort === 'high'
      ? (a, b) => b.amount - a.amount || sortTx(a, b)
      : hf.sort === 'low'
        ? (a, b) => a.amount - b.amount || sortTx(a, b)
        : sortTx;
/** The Fuel card's draft. `method` exists only so the shared pay block can treat it like any other draft. */
export const fuel = { vehicleId: '', accountId: '', amount: '', method: 'card' as Method };
export const form = {
  amount: '',
  category: '',
  method: 'cash' as Method,
  accountId: 'cash',
  lastBank: '',
  lastCard: '',
  lastOnline: '' as '' | Method,
  note: '',
  backdate: false,
  date: '',
  time: '',
};
export const canDownload = (() => {
  try {
    return window.self === window.top;
  } catch (e) {
    return false;
  }
})();
export const canShareFiles = () => {
  try {
    return !!(
      navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })
    );
  } catch (e) {
    return false;
  }
};
