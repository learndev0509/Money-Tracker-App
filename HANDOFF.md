# Money tracker — handoff

Version 1.8.0 · 30 October 2026 · Zestera

This is the engineering handoff for the Money tracker web app: what it is, what was built and why, how it is put together, how to change it, and what is still open. The user-facing description of every feature is in `Money tracker - Features and How it works.md`; this file does not repeat it.

## 1. What it is

A personal expense tracker for an iPhone, run as a Home Screen web app from a static host (currently Netlify). One HTML file, no framework, no build step, no server, no account. All data lives in the phone's browser storage; backups are JSON the user copies or downloads. Built for one household's daily use in India: cash, UPI, bank and credit cards, card statement cycles, a fuel log, lakh-grouped rupees.

## 2. What was built, in order

| Version | Date | Delivered |
| --- | --- | --- |
| 0.x | before 23 Oct | Rupee Ledger: the original single-file tracker (amount, category, cash / bank / card, Month and History, backup, PIN gate) |
| 1.0.0 | 23 Oct | Renamed Money tracker. Welcome screen and greeting, cash in hand, monthly budgets, card statement cycles, recurring expenses, undo after delete, note autocomplete, History filters, open-on-Add, service worker |
| 1.1.0 | 29 Oct | Data safety: daily automatic copies, undoable Delete all, `storage.persist()`. iOS install card (Safari tab and app have separate storage). Money in (income). UPI as a payment method. PIN now encrypts the ledger (PBKDF2 → AES-256-GCM) instead of gating it |
| 1.2.0 | 29 Oct | UI pass: Dashboard hero spark + category strip, category glyphs, save-button check, new-row slide, draggable sheets, gliding tab indicator, month slide, empty-state illustration, Appearance setting |
| 1.3.0 | 29 Oct | Fuel in one tap: vehicles, fuel cards with "bill so far", Dashboard Fuel card with fill map and fuel share of each card bill, Vehicle column in CSV |
| 1.4.0 | 30 Oct | Dashboard · History · Settings tab bar with Add in every header; Trends sheet; History rebuilt as a newest-first ledger; calculator on amount fields; ₹ logo and favicon |
| 1.5.0 | 30 Oct | Fuel card behind a Fuel button (closable, selects Fuel category); History filters as dropdowns with sort; 16-colour category palette; stale `pin` field dropped; version chip; `meta.appVersion` in saves |
| 1.6.0 | 30 Oct | Fuel amount clears after save and on close; Budgets settings list only set budgets with an Add row; budget warnings (toast on crossing 80% / exceeding, Dashboard banner while over); monthly PDF expense report |
| 1.7.0 | 30 Oct | Self-hosted fonts (subsetted IBM Plex WOFF under `fonts/`, zero external requests); Save backup to Files via Web Share; Privacy and Terms sheets |
| 1.8.0 | 30 Oct | Face ID unlock (WebAuthn passkey + PRF) over a wrapped random master key, PIN fallback, legacy stores upgraded on unlock; budget notifications at 90%/exceeded; app badge; alerts toggle |

Each version shipped as `money-tracker-<version>.zip`; 1.4.0 and later are what has been on Netlify.

## 3. Files

```
index.html     the whole app: CSS, HTML, JS, bank/card directory, inline Apple touch icon (~215 KB)
sw.js          service worker: page network-first, icons/fonts/assets cache-first, notificationclick focuses the app; CACHE = money-tracker-v7
fonts/         plex-sans-400/500/600.woff, plex-mono-500/600.woff (Latin + ₹ subsets, ~84 KB) + OFL licence
manifest.json  PWA manifest (name, icons, standalone)
favicon.svg, favicon-32.png, icon-180.png, icon-512.png   the ₹ mark
README.txt     deploy and first-run notes for whoever hosts it
Money tracker - Features and How it works.md   user-facing feature and behaviour reference, with version history
HANDOFF.md     this file
tests/         seven Playwright suites + README (see §7)
```

## 4. How `index.html` is organised

Top to bottom, the script is in labelled sections (`/* ---------- name ---------- */`):

- **constants** — `APP_VERSION`, `APP_BUILD`, storage keys, `VIEWS`, palette, month/day names, `BANK_DIR`/`CARD_DIR` (the 129-bank / 278-card directory with aliases), `DEFAULT_CATS`, `INCOME_SOURCES`, `METHODS`, labels, icons (`ICON`, `CAT_ICON`).
- **storage** — `defaults()`, `migrate(d)`, `readStored()`/`parseStored()`, the crypto helpers (`deriveKey`, `encryptText`, `decryptText`), snapshots, the write queue (`queueWrite`, `save()`), `recodeStorage()` for PIN change/remove.
- **queries** — pure functions over `S`: `txIn(k)`, `incIn(k)`, `fuelIn(k)`, `groupBy`, `sources`, `billPeriod`/`billSoFar`, `cashEvents`/`cashBalance`, `budgetRows`, `applyRecurring`, `noteStats`, `calcEval`/`parseAmt`.
- **ui state** — `view`, `period`, `histYear/histMonth`, `hf` (history filters), `form` (Add screen), `fuel`, `editTx/editRec/editCash/editIncome`, `calcExpr`, `sheetStack`, flags.
- **shared pieces** — `txRow`, `incRow`, `propRow`, `tiles`, `splitBar`, `acctRows`, `sourceSection`, `budgetSection`, `cashSection`, `incomeSection`, `fuelSection`, banners, chart SVGs (`donutSVG`, `dailyChartSVG`, `barsSVG`, `cumulativeSVG`), `payBlockHTML` (the cash/online/bank/UPI/card block shared by every form), `chipsHTML`.
- **ADD / DASHBOARD / HISTORY / SETTINGS** — one `rXxx()` per screen returning the screen's HTML; `render()` swaps it into `#main`.
- **sheets** — `sheetContent(detail)` maps a `kind|arg|arg` string to `{title, sub, body}`; sheets stack (`sheetStack`) with Back.
- **lock screen**, **welcome**, **events** (two delegated listeners on `#main` and `#sheet`, plus `change`/`input`/`keydown`), **PDF**, **boot**.

Rendering is string templates + `innerHTML`; every user string goes through `esc()`. Targeted refreshes (`refreshPay`, `refreshFuel`, `refreshHist`, `refreshSuggest`, `renderSheet`) avoid full re-renders where focus matters.

## 5. Data model and storage

Everything is one JSON object `S`, saved as a string under `localStorage['money-tracker.v1']`.

| Record | Fields |
| --- | --- |
| `accounts[]` | `id, name, type (cash·bank·card), archived, statementDay` — the built-in `cash` account always exists |
| `tx[]` | `id, amount, category, accountId, method (cash·bank·upi·card), date YYYY-MM-DD, time HH:MM, note, recurringId, vehicleId` |
| `income[]` | `id, amount, category (source), accountId, method (cash·bank), date, time, note, recurringId` |
| `cashIn[]` | `id, kind (withdrawal·adjust), amount, accountId, date, time, note` |
| `recurring[]` | `id, kind (expense·income), amount, category, method, accountId, day, note, active, since, lastApplied` |
| `vehicles[]` | `id, name` |
| `budgets` | `{category: rupees}` |
| `categories[]`, `profile{firstName,lastName}`, `meta{lastBackup, startView, theme, appVersion}`, `flags{v2}` | |

Rules that matter:

- **Every view is a query.** No stored totals. Month = `tx.filter(date starts with k)`; cash in hand = replay of `cashIn` + cash spends + cash income in time order.
- **`migrate(d)` is the only entry point for data** (load, restore, snapshot restore). It normalises every record, fills missing fields, drops unknown keys it knows to be stale (`pin`). Keep it tolerant: never throw away user data because a field is odd.
- **Writes go through a queue** (`queueWrite`) because encryption is async; `save()` serialises synchronously, encrypts in the queue, keeps a daily snapshot of the previous stored value (`money-tracker.v1.snapshots`, last 3 days), then writes.
- **Encryption (1.8 layout).** With a PIN set, a random 32-byte master key (`masterRaw`/`masterKey`) encrypts the ledger and snapshots with AES-256-GCM. The main blob is `{enc:2, iv, ct, pin:{salt,iv,ct}, face?:{id,salt,iv,ct}}`: `pin` is the master key wrapped by PBKDF2(pin, salt); `face` is it wrapped by HKDF(PRF output) of the passkey in `id` evaluated with `salt`. Snapshots are `{enc:1, iv, ct}` under the same master key. `wraps` holds the wrappers in memory; `packStore()` writes them with every save. `tryUnlock(pin)` unwraps via PIN; `tryFaceUnlock()` via `navigator.credentials.get` with the `prf` extension. A pre-1.8 blob (`enc:1` with top-level `salt`, ledger encrypted directly with the PIN key) is detected in `tryUnlock`, decrypted with the legacy key, then re-encoded under a fresh master key (`recodeStorage(legacyKey)`). Change PIN = re-wrap only; Remove PIN = decrypt everything and drop both wrappers. Nothing secret is ever stored; wrong PIN / wrong passkey = failed decrypt. Backups stay plain JSON by design.
- **Old key** `rupee-ledger.v1` is read once and migrated. The pre-1.1 `pin` hash is dropped; those users have to set the PIN again.
- **`meta.appVersion`** is stamped on every save so a backup says which build wrote it.

## 6. Decisions worth knowing

- **Single file, no build.** Deliberate: deploy is "upload the folder", and the privacy claim is auditable. Reconsidered twice (React, React Native); both declined before launch — see the design doc's limits and the conversation log. If native ever matters, Capacitor around this file is the cheap route; Expo if a real rewrite is wanted.
- **PIN = encryption, not a gate.** The old FNV hash of a 4-digit PIN was readable from the JSON. A 4-digit key is still brute-forceable offline; the UI says so.
- **Budgets are compared at render time**, so changing one re-colours past months. Warnings are computed at save time by comparing the category's month total before and after the save.
- **UPI is a method, not an account type.** A UPI expense points at a bank account; bank rows total bank+UPI, and a separate UPI section shows the UPI slice.
- **Fuel quick-fill is card-only** by choice (that is how fuel is paid here). Cash/UPI fuel goes through the normal form and lands in the same Fuel card.
- **History is a ledger, Dashboard owns all graphs.** Charts were removed from History on request.
- **PDF is written by hand** (no library) so it works offline and fetches nothing: PDF 1.4, Helvetica/Helvetica-Bold base fonts with a width table for alignment, the ₹ drawn as a vector path (base fonts lack it), Indian digit grouping, A4 pagination with repeated header. Latin text only.
- **Fonts ship with the app** since 1.7.0, subsetted with fontTools to Basic Latin, Latin-1, common punctuation and ₹, as WOFF (brotli was unavailable for WOFF2; the difference is ~15 KB). Plex Sans 400/500/600 came from the owner's Google Fonts download; Plex Mono 500/600 are stand-ins built from Plex Mono Regular and Bold — swap in the real Medium/SemiBold files by re-running the subset if the owner supplies them. With this, the page makes no request after load; the privacy sheet states exactly that.
- **Backup share** uses `navigator.share({files})`, gated by `navigator.canShare`; the button only renders where file sharing exists (iOS/iPadOS Safari and Home Screen apps). Download and Copy remain for everything else.
- **Privacy and Terms are sheets inside the app**, not separate URLs, so they work offline and from the welcome screen (the sheet gets `.over` to sit above the welcome layer).
- **Face ID is a second wrapper, never the only key.** WebAuthn PRF is supported for same-device iCloud passkeys from iOS 18 / Safari 18; cross-device (QR) flows returned wrong or empty PRF values in reports up to Safari 18.4, which is one reason the PIN is mandatory and Face ID optional. `rp.id` is `location.hostname`, so moving domains orphans the passkey (PIN still unlocks; re-enrol). Enrolment reads PRF from `create()` and falls back to an immediate `get()` if the authenticator only evaluates PRF on assertion (Safari does this), which costs a second Face ID prompt once.
- **Notifications are local and save-time only.** `notify()` goes through `serviceWorker.ready.showNotification` (what iOS Home Screen apps require) with `new Notification` as a fallback; permission is requested from the user gesture that adds the first budget and can be toggled in the Budgets card (`meta.alerts=false` opts out). The 90% and exceeded crossings notify; 80% only toasts; already-over spends only toast. `updateBadge()` sets the app badge to the count of over-budget categories on every render and when the app goes to the background. No push server — the privacy sheet says so.

## 7. Tests

`tests/` holds eight standalone Playwright scripts (headless Chromium, `file://` load, no framework). Each prints `PASS`/`FAIL` lines; screenshots go to `tests/shots/`.

```
npm init -y && npm i playwright && npx playwright install chromium
node features.test.js && node welcome.test.js && node round2.test.js && node round3.test.js && node safety.test.js && node ui.test.js && node fuel.test.js && node secure.test.js
```

| Suite | Covers |
| --- | --- |
| features | edit, budgets (add row, warnings, banner), statement day, recurring, CSV, backup reminder, PIN set/change/remove/forgot, migration incl. palette and stale `pin` |
| welcome | first run, greeting, profile, old-key migration |
| round2 | note autocomplete, undo, cash in hand, History dropdowns and sort, open-on-Add, reduced motion |
| round3 | UPI end to end, income end to end incl. recurring salary and CSV |
| safety | snapshots and restore, undoable wipe, encryption lifecycle incl. the pre-1.8 `enc:1` upgrade, erase, iOS install card |
| ui | glyphs, save morph, hero spark, sheets, theme, nav, calculator, Trends, version chip, PDF export, local fonts / zero external requests, privacy and terms, share-to-Files backup |
| secure | served from a fake `https://money.test` origin via Playwright routing with a CDP virtual authenticator (`hasPrf`): Face ID enrol/unlock, PIN fallback, PIN change keeps the Face wrapper, fail-closed without the passkey, service-worker precache over https, budget notifications and badge via stubbed `Notification`/`setAppBadge` |
| fuel | vehicles, fuel toggle/close/clear, cards and bill hints, Dashboard Fuel card, CSV |

261 checks at 1.8.0. The suites wait fixed milliseconds in places; `features` uses `toastHas()` for the slow (PBKDF2) PIN paths. A lone intermittent failure that passes on re-run is harness timing, not the app.

Real-data check: a restored production backup (14 expenses, ₹4.21 L, custom category, cash adjust) was walked through every screen on 30 Oct; it found the grey-palette bug and the stale `pin`, both fixed in 1.5.0.

## 8. Releasing a change

1. Edit `index.html`. Keep new UI in the existing style (string templates, `esc()`, `data-*` events, no comments that narrate).
2. Bump `APP_VERSION` (and `APP_BUILD`) at the top of the script.
3. Add a row to **Version history** in the features doc; update any feature row the change touches; update `README.txt` if deploy or first-run changes.
4. If `sw.js` or any precached asset (icons, fonts) changed, bump `CACHE` (`money-tracker-v7`, …) so installed copies drop the old cache.
5. Run the seven suites; add or adjust checks for the change.
6. Zip the folder as `money-tracker-<version>.zip`; upload the contents over the Netlify site. Existing phones pick up `index.html` on the next online open (network-first); the Home Screen icon only changes if the app is re-added.

Verification habit used throughout: reproduce first, fix, add the test that would have caught it, run everything, look at the screens, and say plainly when something cannot be reproduced.

## 9. Device checklist for 1.8.0 (not runnable here)

Run once on the real iPhone, from the Home Screen app on the https URL:

1. Settings → Security → Set a PIN → Unlock with Face ID. Expect one or two Face ID prompts, then "Face ID unlock is on". If it says the iPhone cannot derive a key (needs iOS 18), note the iOS version.
2. Force-quit, reopen: lock screen shows "Unlock with Face ID" above the keypad; tap it; Face ID; ledger appears.
3. Reopen, enter the PIN instead: unlocks.
4. Change PIN; reopen; Face ID still unlocks.
5. Add a budget (allow notifications when asked); save an expense that crosses 90%; expect a toast and a banner notification; exceed it; expect a second notification and a badge number on the icon; delete the budget; badge clears.
6. Settings → Face ID off, then on again (re-enrol), then Remove PIN; confirm Face ID controls disappear and the lock screen no longer appears.

If 1 fails only on the cross-device (QR) path, that matches the known WebKit limitation and is not a bug here.

## 10. Known limits and open items

- Plex Mono 500/600 are stand-ins (Regular/Bold) until the real weights are supplied.
- The "Zestera" name has not been checked against the trademark register.
- Face ID enrolment and notifications were verified with Chromium's virtual authenticator and stubbed Notification API, not on an iPhone; see the device checklist.
- PDF: Latin text only; non-Latin notes print as `?`. Embedding a font costs ~100 KB.
- Fuel: amount only (no litres/odometer, so no mileage).
- History search covers expenses, not income.
- Budget warnings are in-app only; a web app on iOS cannot post notifications without a server.
- No sync, no multi-device; backups are manual (plus the 3-day automatic copies on the same phone).
- `tests/` suites are scripts, not a runner; done for the module build in `app/e2e/` (Playwright Test, see §12). Note that four of the original checks only pass late in a month (written on 30 October); the specs compute them from the date.

## 11. Where things are

- Live: the owner's Netlify site (URL held by the owner).
- Source of record: the latest `money-tracker-<version>.zip` handed over on 30 Oct 2026 (1.8.0). No git repository exists yet; creating one from the zip and tagging `v1.6.0` is the obvious first step for anyone taking this on.

## 12. Module build (app/)

The same app, split into TypeScript modules and built with Vite, lives in `app/` (added 30 October 2026). It keeps the storage key, the encrypted blob layout and the backup JSON, so phones on the single-file 1.8.0 can move to it without a migration. It adds unit tests over `migrate()`, the queries and the crypto round trips, a generated service worker whose cache name changes with the assets, and a local crash log behind Settings → Report a problem. The suites in `tests/` were rewritten as Playwright Test specs in `app/e2e/` (2 November 2026: same checks, locators and auto-waiting instead of sleeps, traces on failure, a visual-regression spec over the fixture ledger); `app/e2e/run.cjs` still runs the originals in `tests/` (unchanged) against the built output. How it is organised, built and released is in `app/README.md`. The project became a git repository on 2 November 2026 with `.github/workflows/check.yml` running `npm run check` on pushes and pull requests; the same day Prettier and ESLint (with the Playwright rules) were added to `app/` and the modules reformatted, with the goldens proving the output unchanged. The root `index.html` stays the deployed 1.8.0 until the module build replaces it on the host.
