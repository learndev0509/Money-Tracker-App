import { SheetView } from './index';
import { APP_BUILD, APP_VERSION, esc } from '../../lib/constants';
import { midDate } from '../../lib/dates';
import { installStepsHTML } from '../../ui/shared';
/* Privacy, Terms and the Add to Home Screen sheet. */
export function privacySheet(_p: string[]): SheetView {
  return {
    title: 'Privacy',
    sub: 'What this app does with your data',
    tall: true,
    body: `<div class="form" style="gap:12px;font-size:14px;color:var(--ink-2)">
      <p><b style="color:var(--ink)">Nothing leaves your phone.</b> Every expense, income entry, account name, vehicle, budget and setting is stored in this browser's storage on this device. There is no account, no sign-in, no server and no analytics. The app makes no network request while you use it; after the first visit it opens offline.</p>
      <p><b style="color:var(--ink)">We cannot see your data.</b> The people who publish this app have no copy of it and no way to read it. If you lose the phone or clear the site's data, the only copies are the backups you made.</p>
      <p><b style="color:var(--ink)">Backups are yours.</b> Copy backup, Save to Files, Download and the CSV and PDF reports produce files on your phone or clipboard. Where you send them is up to you. Backup files are plain, readable JSON even when a PIN is set.</p>
      <p><b style="color:var(--ink)">The PIN encrypts your ledger.</b> With a PIN set, the data in storage is AES-256 encrypted with a random key that only your PIN can unwrap. The PIN is never stored. A forgotten PIN cannot be recovered; the only way back is to erase and restore a backup.</p>
      <p><b style="color:var(--ink)">Face ID unlock</b> adds a passkey on your iPhone whose secret can also unwrap that key. The passkey lives in iCloud Keychain, so Apple syncs the key material (never your ledger) between your devices. The PIN remains the fallback. Turning Face ID off removes the passkey's access.</p>
      <p><b style="color:var(--ink)">Budget alerts</b> are notifications this app posts on this phone when a save crosses a budget line. Nothing is sent anywhere to produce them; there is no push server.</p>
      <p><b style="color:var(--ink)">Error log.</b> The app keeps the last few errors it hit on this phone so that Settings → Report a problem can show them. The log holds no expenses or names, and it is sent only if you copy or email it yourself.</p>
      <p><b style="color:var(--ink)">What the site itself can see.</b> Loading the page is an ordinary web request to the host it is served from (currently a static host), which records the request like any website would. The bank and credit-card directory is built into the page; choosing one is not sent anywhere.</p>
      <p><b style="color:var(--ink)">iPhone storage rules.</b> A Safari tab and the Home Screen app keep separate data, and iOS can clear a Safari tab's data after 7 days unused. Install it to the Home Screen and keep a backup.</p>
      <p><b style="color:var(--ink)">Changes.</b> If any of this changes, the version number in Settings changes with it and the notes for that version say so.</p>
      <p class="hint">Money tracker by Zestera · version ${APP_VERSION} · ${esc(midDate(APP_BUILD))}</p>
      <button type="button" data-close>Close</button></div>`,
  };
}
export function termsSheet(_p: string[]): SheetView {
  return {
    title: 'Terms',
    sub: 'Plain terms for a personal tool',
    body: `<div class="form" style="gap:12px;font-size:14px;color:var(--ink-2)">
      <p>Money tracker is a personal record-keeping tool provided as is, free of charge. It is not financial, tax or legal advice, and it is not connected to any bank, card issuer or payment app; the figures it shows are the ones you typed.</p>
      <p>You are responsible for your own backups. Because the data lives only on your device, the publisher cannot restore it for you.</p>
      <p>The app may be updated at any time; your data is preserved across updates by the built-in migration step, and the version number in Settings shows what you are running.</p>
      <p>Bank and card names are used only to label your own entries and belong to their respective owners.</p>
      <p class="hint">Money tracker by Zestera · version ${APP_VERSION}</p>
      <button type="button" data-close>Close</button></div>`,
  };
}
export function installSheet(_p: string[]): SheetView {
  return {
    title: 'Add to Home Screen',
    sub: 'Opens like an app and keeps your data safe',
    body: `<div class="form">${installStepsHTML()}<button type="button" data-install-later>Not now</button></div>`,
  };
}
