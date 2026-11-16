import { el } from '../lib/constants';
import { toast } from '../ui/toast';
import { S, save, setLedger } from '../data/storage';
import { thisMonth, today } from '../lib/dates';
import { applyTheme, render } from '../ui/render';
import { migrate, type Raw } from '../data/model';
import { ui } from '../ui/state';
/* ---------- backup, restore ---------- */
export function download(name: string, text: BlobPart, type: string) {
  try {
    const b = new Blob([text], { type });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(u);
      a.remove();
    }, 1500);
    return true;
  } catch (e) {
    return false;
  }
}
export function copyOrShow(text: string, okMsg: string) {
  const fallback = () => {
    const box = el('#import-box');
    if (box) {
      box.hidden = false;
      const ta = el('#import-text');
      ta.value = text;
      ta.focus();
      ta.select();
    }
    toast('Copy the text below to keep it');
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback);
  } catch (e) {
    fallback();
  }
}
export function markBackup() {
  S.meta.lastBackup = Date.now();
  save();
  const b = el('.banner');
  if (b) b.remove();
}
export function exportData(mode: 'copy' | 'download' | 'share') {
  const json = JSON.stringify(S, null, 2),
    name = 'money-tracker-backup-' + today() + '.json';
  if (mode === 'share') {
    const file = new File([json], name, { type: 'application/json' });
    navigator.share({ files: [file], title: 'Money tracker backup' }).then(
      () => {
        markBackup();
        render(false);
        toast('Backup saved · ' + S.tx.length + ' expense' + (S.tx.length === 1 ? '' : 's'));
      },
      () => {},
    );
    return;
  }
  if (mode === 'download') {
    if (download(name, json, 'application/json')) {
      markBackup();
      render(false);
      toast('Backup downloaded');
    } else toast('Download is not available here; use Copy backup');
    return;
  }
  copyOrShow(json, 'Backup copied. Paste it into Notes to keep it.');
  markBackup();
  render(false);
}
export function importData() {
  let d;
  try {
    d = JSON.parse(el('#import-text').value);
  } catch (e) {
    toast('That is not a valid backup');
    return;
  }
  if (!d || !Array.isArray(d.tx) || !Array.isArray(d.accounts) || !Array.isArray(d.categories)) {
    toast('That is not a Money tracker backup');
    return;
  }
  restoreData(d);
}
export function restoreData(d: Raw) {
  setLedger(migrate(d));
  save();
  applyTheme();
  ui.pending = null;
  ui.period = thisMonth();
  render(true);
  toast('Restored ' + S.tx.length + ' expense' + (S.tx.length === 1 ? '' : 's'));
}
