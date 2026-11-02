/* Handlers for the four screens (#main): clicks by data-* attribute or id, inputs and changes by id. */
import { SUPPORT_EMAIL, el, isView, ordinal } from '../lib/constants';
import { dateKey, money, timeKey, today } from '../lib/dates';
import { parseAmt } from '../lib/calc';
import { clearErrors, problemReport } from '../lib/errors';
import { FUEL, isMethod } from '../data/model';
import { S, plainOf, save, snapshots } from '../data/storage';
import { acct, initials } from '../queries/ledger';
import { fuel, form, hf, isCalcTarget, isHistSort, ui } from '../ui/state';
import { toast } from '../ui/toast';
import { applyTheme, go, render, slideMain } from '../ui/render';
import { notifySupported, setAlerts } from '../ui/notify';
import { remember, setMethodOn } from '../ui/pay';
import {
  addVehicle,
  applySuggestion,
  fuelBtnLabel,
  fuelHint,
  refreshFuel,
  refreshPay,
  refreshSuggest,
  resetFuel,
  saveFuel,
  saveTx,
} from '../screens/add';
import { histBody, refreshHist } from '../screens/history';
import { wipe } from '../screens/settings';
import { openSheet } from '../screens/sheets';
import { faceEnrol, faceRemove } from '../screens/security';
import { copyOrShow, exportCSV, exportData, importData, restoreData } from '../reports/backup';
import { exportPDF } from '../reports/pdf';

type ButtonHandler = (value: string, b: HTMLButtonElement) => void;

/** Open or close the Fuel card on the Add screen; opening selects the Fuel category. */
function toggleFuel(open: boolean) {
  ui.fuelOpen = open;
  if (!ui.fuelOpen) resetFuel();
  if (ui.fuelOpen) {
    if (!S.categories.includes(FUEL)) {
      S.categories.push(FUEL);
      save();
    }
    form.category = FUEL;
  }
  render(false);
  if (ui.fuelOpen) {
    const i = el(S.vehicles.length ? '#fuel-amount' : '#veh-name');
    if (i) i.focus();
  }
}

/** Clicks by the data-* attribute the button carries; the first attribute found in this order wins. */
const clicksByData: [string, ButtonHandler][] = [
  [
    'go',
    v => {
      if (isView(v)) go(v);
    },
  ],
  [
    'calc',
    v => {
      if (!isCalcTarget(v)) return;
      ui.calcTarget = v;
      const i = el(v === 'fuel' ? '#fuel-amount' : '#f-amount');
      ui.calcExpr = i ? i.value : '';
      openSheet('calc|' + v);
    },
  ],
  ['fuelClose', () => toggleFuel(false)],
  [
    'veh',
    v => {
      fuel.vehicleId = v;
      fuel.accountId = '';
      fuel.amount = '';
      ui.fuelAddingVeh = false;
      refreshFuel();
    },
  ],
  [
    'vehNew',
    () => {
      ui.fuelAddingVeh = true;
      refreshFuel();
      const i = el('#veh-name');
      if (i) i.focus();
    },
  ],
  [
    'delVeh',
    v => {
      S.vehicles = S.vehicles.filter(x => x.id !== v);
      save();
      render(false);
    },
  ],
  [
    'fuelAcct',
    v => {
      fuel.accountId = v;
      refreshFuel();
    },
  ],
  [
    'cat',
    v => {
      form.category = v;
      el('#main')
        .querySelectorAll<HTMLElement>('#cat-chips .chip')
        .forEach(c => c.classList.toggle('on', c.dataset.cat === v));
    },
  ],
  ['note', v => applySuggestion(v)],
  [
    'method',
    v => {
      if (v === 'online' || isMethod(v)) {
        setMethodOn(form, v);
        refreshPay();
      }
    },
  ],
  [
    'openPick',
    (v, b) => {
      ui.pickQuery = '';
      openSheet('pick|' + v + '|' + (b.dataset.ctx || 'form'));
    },
  ],
  [
    'acct',
    v => {
      const a = acct(v);
      if (a) {
        form.accountId = a.id;
        remember(a);
      }
      refreshPay();
    },
  ],
  [
    'period',
    v => {
      const dir = v < ui.period ? 'slide-r' : 'slide-l';
      ui.period = v;
      render(false);
      slideMain(dir);
    },
  ],
  [
    'hfClear',
    () => {
      hf.method = '';
      hf.cat = '';
      hf.sort = 'new';
      ui.histQuery = '';
      const si = el('#hist-search');
      if (si) si.value = '';
      refreshHist();
    },
  ],
  [
    'themePick',
    v => {
      if (v === 'system') delete S.meta.theme;
      else if (v === 'light' || v === 'dark') S.meta.theme = v;
      save();
      applyTheme();
      el('#main')
        .querySelectorAll<HTMLElement>('#theme-seg button')
        .forEach(x => x.classList.toggle('on', x.dataset.themePick === v));
    },
  ],
  [
    'start',
    v => {
      if (v === 'add') S.meta.startView = 'add';
      else delete S.meta.startView;
      save();
      el('#main')
        .querySelectorAll<HTMLElement>('#start-seg button')
        .forEach(x => x.classList.toggle('on', x.dataset.start === v));
      toast('The app will open on ' + (v === 'add' ? 'Add expense' : 'the Dashboard'));
    },
  ],
  [
    'ask',
    v => {
      ui.pending = v;
      render(false);
    },
  ],
  [
    'cancel',
    () => {
      ui.pending = null;
      render(false);
    },
  ],
  [
    'delAcct',
    v => {
      S.accounts = S.accounts.filter(a => a.id !== v);
      ui.pending = null;
      save();
      render(false);
    },
  ],
  [
    'toggleAcct',
    v => {
      const a = acct(v);
      if (a) {
        a.archived = !a.archived;
        save();
        render(false);
      }
    },
  ],
  ['pdf', v => exportPDF(v || el('#pdf-month').value)],
  [
    'face',
    v => {
      if (v === 'enrol') faceEnrol();
      else if (v === 'remove') faceRemove();
    },
  ],
  ['alerts', v => setAlerts(v === 'on')],
  [
    'delBudget',
    v => {
      delete S.budgets[v];
      save();
      render(false);
      toast('No budget for ' + v);
    },
  ],
  [
    'delCat',
    v => {
      S.categories = S.categories.filter(c => c !== v);
      delete S.budgets[v];
      if (form.category === v) form.category = '';
      save();
      render(false);
    },
  ],
  [
    'clearErrors',
    () => {
      clearErrors();
      render(false);
      toast('Error log cleared');
    },
  ],
  [
    'restoreSnap',
    v => {
      const s = snapshots().find(x => x.day === v);
      if (s)
        plainOf(s.raw).then(
          json => restoreData(JSON.parse(json)),
          () => toast('That copy could not be read'),
        );
    },
  ],
];

/** Clicks by element id, for buttons that carry no data-* attribute. */
const clicksById: Record<string, (b: HTMLButtonElement) => void> = {
  'fuel-toggle': () => toggleFuel(!ui.fuelOpen),
  'veh-add': () => addVehicle(),
  'fuel-save': () => saveFuel(),
  'toggle-backdate': b => {
    form.backdate = !form.backdate;
    el('#backdate').hidden = !form.backdate;
    b.textContent = form.backdate
      ? 'Use the current date and time instead'
      : 'Logging something from earlier? Change date or time';
    if (form.backdate) {
      const n = new Date();
      form.date = form.date || dateKey(n);
      form.time = form.time || timeKey(n);
      el('#f-date').value = form.date;
      el('#f-time').value = form.time;
    }
  },
  'save-tx': () => saveTx(),
  'budget-add': () => {
    const c = el('#budget-cat').value,
      v = Math.round(parseAmt(el('#budget-amt').value) || 0);
    if (!(v > 0)) {
      toast('Enter the monthly amount');
      el('#budget-amt').focus();
      return;
    }
    S.budgets[c] = v;
    save();
    render(false);
    toast(c + ' budget ' + money(v) + ' a month');
    if (notifySupported() && Notification.permission === 'default' && S.meta.alerts !== false) setAlerts(true);
  },
  'add-cat': () => {
    const inp = el('#new-cat');
    const n = (inp.value || '').replace(/\|/g, '').trim();
    if (!n) {
      inp.focus();
      return;
    }
    if (S.categories.some(c => c.toLowerCase() === n.toLowerCase())) {
      toast('That category already exists');
      return;
    }
    S.categories.push(n);
    save();
    render(false);
  },
  export: () => exportData('copy'),
  'export-dl': () => exportData('download'),
  'export-share': () => exportData('share'),
  csv: () => exportCSV(false),
  'csv-dl': () => exportCSV(true),
  'import-toggle': () => {
    const box = el('#import-box');
    box.hidden = false;
    el('#import-text').focus();
  },
  import: () => importData(),
  wipe: () => wipe(),
  'report-copy': () => copyOrShow(problemReport(), 'Report copied · paste it into an email or message'),
  'report-mail': () => {
    const body = problemReport().slice(0, 1800);
    location.href =
      'mailto:' +
      SUPPORT_EMAIL +
      '?subject=' +
      encodeURIComponent('Money tracker problem report') +
      '&body=' +
      encodeURIComponent(body);
  },
};

/** Live edits of the Add form, the Fuel card and the History search. */
const inputsById: Record<string, (t: HTMLInputElement) => void> = {
  'f-amount': t => {
    form.amount = t.value;
  },
  'fuel-amount': t => {
    fuel.amount = t.value;
    const b = el('#fuel-save'),
      h = el('#fuel-hint');
    if (b) b.textContent = fuelBtnLabel();
    if (h) h.textContent = fuelHint();
  },
  'f-note': t => {
    form.note = t.value;
    refreshSuggest();
  },
  'f-date': t => {
    form.date = t.value;
  },
  'f-time': t => {
    form.time = t.value;
  },
  'hist-search': t => {
    ui.histQuery = t.value;
    const hb = el('#hist-body');
    if (hb) hb.innerHTML = histBody();
  },
};

/** Selects and committed fields: History filters, the import file, and the Settings fields. */
const changesById: Record<string, (t: HTMLInputElement) => void> = {
  'h-year': t => {
    ui.histYear = +t.value;
    ui.histMonth = ui.histYear === +today().slice(0, 4) ? +today().slice(5, 7) : 12;
    refreshHist();
  },
  'h-month': t => {
    ui.histMonth = +t.value;
    refreshHist();
  },
  'h-cat': t => {
    hf.cat = t.value;
    refreshHist();
  },
  'h-method': t => {
    hf.method = isMethod(t.value) ? t.value : '';
    refreshHist();
  },
  'h-sort': t => {
    hf.sort = isHistSort(t.value) ? t.value : 'new';
    refreshHist();
  },
  'import-file': t => {
    const f = t.files && t.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      el('#import-text').value = String(r.result || '');
    };
    r.readAsText(f);
  },
};
const changesByData: [string, (value: string, t: HTMLInputElement) => void][] = [
  [
    'stmt',
    (v, t) => {
      const a = acct(v);
      if (a) {
        a.statementDay = +t.value || null;
        save();
        render(false);
        toast(a.statementDay ? a.name + ' statement on the ' + ordinal(a.statementDay) : 'Statement day cleared');
      }
    },
  ],
  [
    'profile',
    (v, t) => {
      if (v !== 'firstName' && v !== 'lastName') return;
      S.profile[v] = String(t.value || '')
        .trim()
        .slice(0, 30);
      save();
      const nm = el('#profile-name'),
        av = el('#profile-avatar');
      if (nm) nm.textContent = (S.profile.firstName + ' ' + S.profile.lastName).trim() || 'No name yet';
      if (av) av.textContent = initials();
      toast('Saved');
    },
  ],
  [
    'budget',
    (v, t) => {
      const n = Math.round(parseAmt(t.value) || 0);
      if (n > 0) S.budgets[v] = n;
      else delete S.budgets[v];
      save();
      render(false);
      toast(n > 0 ? v + ' budget ' + money(n) + ' a month' : 'No budget for ' + v);
    },
  ],
];

/** Enter in a field acts like its button. */
const enterById: Record<string, (t: HTMLElement) => void> = {
  'f-amount': () => saveTx(),
  'budget-amt': () => el('#budget-add').click(),
  'fuel-amount': () => saveFuel(),
  'veh-name': () => addVehicle(),
};

export function bindMain() {
  const main = el('#main');
  main.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const detail = target.closest<HTMLElement>('[data-detail]')?.dataset.detail;
    if (detail !== undefined) {
      openSheet(detail);
      return;
    }
    const b = target.closest('button');
    if (!b) return;
    const d = b.dataset;
    for (const [key, run] of clicksByData)
      if (key in d) {
        run(d[key] ?? '', b);
        return;
      }
    if (Object.hasOwn(clicksById, b.id)) clicksById[b.id](b);
  });
  main.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (Object.hasOwn(inputsById, t.id)) inputsById[t.id](t);
  });
  main.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (Object.hasOwn(changesById, t.id)) {
      changesById[t.id](t);
      return;
    }
    for (const [key, run] of changesByData)
      if (key in t.dataset) {
        run(t.dataset[key] ?? '', t);
        return;
      }
  });
  main.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (e.key !== 'Enter') return;
    if (Object.hasOwn(enterById, t.id)) {
      e.preventDefault();
      enterById[t.id](t);
      return;
    }
    if (t.dataset && t.dataset.budget !== undefined) t.blur();
  });
}
