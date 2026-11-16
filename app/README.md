# Money tracker · module build

The same app as `../index.html`, split into TypeScript modules and built with Vite. Same screens, same
behaviour, same storage key, same encrypted blob layout and the same backup JSON: a phone that has the
single-file 1.8.0 installed can open this build and carry on. The user-facing reference is still
`../Money tracker - Features and How it works.md`; the engineering history is `../HANDOFF.md`.

## Commands

```
npm install                 once; then `npx playwright install chromium` for the browser suites
npm run dev                 Vite dev server with hot reload (no service worker in dev)
npm run format              Prettier over the whole folder (format:check only reports)
npm run lint                ESLint: recommended JS/TS rules plus the Playwright rules for e2e/
npm run typecheck           tsc --noEmit
npm test                    Vitest unit tests (tests/unit)
npm run build               production build into dist/ (deploy that folder)
npm run preview             serve dist/ on http://127.0.0.1:4173
npm run e2e                 build dist/, serve it, and run the browser suites (Playwright Test, e2e/*.spec.ts)
npm run e2e:report          open the HTML report of the last run (traces for any failure)
npm run e2e:legacy          the eight original suites from ../tests through e2e/run.cjs
npm run check               format:check, lint, typecheck, test, e2e (which builds) in that order
```

`npm run e2e -- fuel ui` runs only the specs whose file name matches. `APP_URL=https://staging.example
npm run e2e` points the specs at a server that is already up (secure.spec.ts skips: it serves dist/
itself). `npm run e2e -- --update-snapshots` accepts a new look in the visual baselines.

## Layout

```
index.html            page markup only (head tags, tab bar, welcome, sheet, lock screen, toast)
src/main.ts           boot: read storage, pick the first screen, wire events, render or lock
src/styles.css        the stylesheet, unchanged apart from font paths
src/sw.js             service-worker template; the build fills in the cache name and asset list
src/lib/              constants, dates and money formatting, the amount calculator, the bank and
                      card directory, SVG icons, the crash log
src/data/model.ts     the Ledger type, defaults(), migrate()   <- the data contract
src/data/crypto.ts    AES-GCM, PBKDF2 and HKDF helpers, the in-memory key `vault`, blob layouts
src/data/storage.ts   the ledger `S`, localStorage read/write queue, snapshots, recode on PIN change
src/queries/          pure functions over the ledger: month slices, statement cycles, budgets,
                      cash in hand, recurring entries, note memory
src/ui/               screen state (`ui`, `form`, `fuel`, `hf`), toast, render loop, notifications,
                      shared row/section/chart builders, the pay block, the bank/card picker
src/screens/          one module per screen (add, dashboard, history, settings), security (PIN and
                      Face ID), lock screen, welcome
src/screens/sheets/   the sheet stack (index.ts, with the kind → builder registry) and one module per
                      sheet: expense, income, recurring, cash, calc, trend, period drill-downs, pick,
                      pin, legal; each holds its builder and its save/delete handlers
src/reports/          backup JSON, the hand-written PDF
src/events/           the delegated listeners: main.ts for the four screens and sheet.ts for the
                      sheet, each a table of handlers keyed by data-* attribute or element id
tests/unit/           Vitest: migrate against fixtures, calculator and formatting, queries,
                      crypto round trips, storage, the crash log, and the golden snapshots
tests/golden/         one file per screen, sheet and report as rendered from the fixture ledger
                      at a frozen clock (30 Oct 2026, 6:30 pm); golden.test.ts compares against them
tests/fixtures/       a 1.8.0 backup and a pre-1.0 Rupee Ledger backup; add one per release
e2e/*.spec.ts         Playwright Test: the eight original stories (features, fuel, round2, round3,
                      safety, secure, ui, welcome) as serial specs, plus visual.spec.ts
e2e/helpers.ts        the App helper every spec uses: open a phone-sized page, finish the welcome,
                      pick a bank, tap the keypad, read storage, wait for a toast
e2e/visual/           screenshot baselines for visual.spec.ts (one set per platform)
e2e/run.cjs           runs ../tests/*.test.js (the original suites, untouched) against dist/
playwright.config.ts  phone viewport, build + preview as the web server, traces on failure
```

Rendering is unchanged: functions return HTML strings, `render()` swaps the current screen into
`#main`, every user string goes through `esc()`, and buttons declare their action in `data-*`
attributes. To add a button, add one row to the matching table in `src/events/`; to add a sheet,
add a module under `src/screens/sheets/` and one entry to `SHEETS` in its `index.ts`.

## State

The single file kept its state in closure variables. Modules cannot reassign each other's
bindings, so:

- the ledger is `S` in `data/storage.ts`; read it anywhere, replace it only via `setLedger()`;
- screen state is the `ui` object in `ui/state.ts` (`ui.view`, `ui.period`, `ui.sheetStack`, the
  drafts being edited, ...), plus the `form`, `fuel` and `hf` objects that were already objects;
- key material is the `vault` object in `data/crypto.ts` (`masterKey`, `masterRaw`, `wraps`,
  `lockedBlob`); nothing in it is ever written to storage unwrapped.

## What the build adds

- **Version and build date** come from `package.json` (`version`, `buildDate`) through Vite's
  `define`; Settings shows them, every save stamps `meta.appVersion`.
- **Service worker** is generated: `vite.config.ts` reads `src/sw.js`, fills in the emitted asset
  list and names the cache `money-tracker-<version>-<hash of every precached file>`. Any change to
  a script, style, icon or font changes the name, so installed copies drop the old cache without a
  manual bump.
- **Crash log** (`src/lib/errors.ts`): the last 50 page errors are kept on the phone under
  `money-tracker.v1.errors` with message, trimmed stack, app version and open screen; never ledger
  data. Settings → Report a problem shows the count, copies a report (device facts plus the last ten
  errors) and clears the log. Set `SUPPORT_EMAIL` in `src/lib/constants.ts` to also get an Email
  button. The Privacy sheet says so.
- **TypeScript**: `strict` with `noImplicitAny` on. Every function parameter is typed, from the
  data model through the queries to the templates and event handlers. Records read from storage or
  a backup enter as `Raw` and leave `migrate()` as `Ledger`; drafts being edited are `Draft`; the
  shared pay block takes any `PayState`. Casts are kept to DOM event targets and the two places where
  a string from the page is checked against a union (`isView`, `isMethod`, `isHistSort`).

## Formatting and lint

Prettier (`.prettierrc.json`: 120 columns, single quotes, no parentheses around a lone arrow
argument) formats everything except what `.prettierignore` lists: the golden files and fixtures,
which are compared byte for byte, and `index.html`, `src/styles.css` and `public/`, which stay as in
the single-file app. `npm run format` before a commit; `npm run check` only reports.

ESLint (`eslint.config.js`) runs the recommended JavaScript and TypeScript rules with two
adjustments that match how the app is written: an empty `catch` is allowed, because that is how it
ignores an API the phone lacks, and a function argument beginning with `_` may go unused. `any` is
allowed in the tests, which read raw ledgers; in `src/` the only one left is the `Raw` type that
records carry until `migrate()` has run. The Playwright rules apply to `e2e/`, where the `App`
helper's `expect*` methods count as assertions and the three deliberate fixed waits carry a
disable comment saying why.

## Golden snapshots

`tests/unit/golden.test.ts` renders the four screens in several states, every sheet, the banners,
and the PDF from `tests/fixtures/backup-1.8.0.json` with the clock frozen, and compares
each result character for character with the file of the same name in `tests/golden/`. Any
refactor that changes output fails there in milliseconds, without a browser. When an output change
is intended, read the diff Vitest prints, then accept it with `npx vitest run -u` and commit the
updated golden files with the change. The browser suites remain the check that the page behaves;
the goldens are the check that it still renders the same markup, and `visual.spec.ts` that it
still looks the same.

## Browser suites

`e2e/*.spec.ts` are the original eight suites rewritten for Playwright Test. Each file is one story
in `serial` mode on a single page: the sections of the old script became named tests, so the list
reporter says which step broke, and a failure leaves a trace (`npm run e2e:report`) instead of a
PASS/FAIL line. Every fixed sleep is gone; the specs wait on what the app shows (`expect(locator)`
auto-retries) or on storage (`app.expectStored`, `app.expectRaw`), and the two places that still
wait a fixed time are screenshots of an animation and a Face ID attempt that has no visible result.
The checks are the same as the originals, with one difference: the old suites were written on
30 October 2026 and four checks only held late in a month (a recurring on the 28th, the seven-day
spark, an October-dated legacy ledger, a recurring's last-applied month). The specs compute those from
today's date.

`visual.spec.ts` loads `tests/fixtures/backup-1.8.0.json`, freezes the clock at 30 Oct 2026 6:30 pm
IST, and compares the four screens, two sheets and dark mode against the PNGs in `e2e/visual/`. The
golden HTML snapshots catch markup changes; this catches stylesheet and layout changes. When a change
in look is intended, run `npm run e2e -- visual --update-snapshots` and commit the new baselines.
Baselines are named per platform; a machine on another OS records its own set on first run.

`npm run e2e:legacy` still runs the untouched `../tests/*.test.js` for as long as they are useful.

## The data contract

`src/data/model.ts` and `src/data/crypto.ts` describe what is on ten phones. Rules carried over:

- `migrate()` is the only way data enters the app and must stay tolerant;
- the stored blob layouts (`enc:2` with `pin`/`face` wrappers, `enc:1` snapshots, pre-1.8 `enc:1`
  with `salt`) are read by `tryUnlock` exactly as before;
- backups stay plain JSON;
- `tests/unit/model.test.ts` runs `migrate()` over the fixtures in `tests/fixtures/`. When a release
  changes the model, add that release's backup as a fixture so every later build proves it still
  loads.

## Releasing

1. Change code under `src/`; keep new UI in the existing style.
2. Bump `version` and `buildDate` in `package.json`.
3. Add the version row to the features document; update `../README.txt` if deploy or first run changed.
4. `npm run check` (format, lint, type check, unit tests, build, browser suites). Accept intended
   golden changes with `npx vitest run -u` and intended visual changes with
   `npm run e2e -- visual --update-snapshots`, and commit them with the change.
5. Deploy `dist/` to the static host. Existing phones pick up `index.html` on the next online open.

## 1.9.0, the first release from this folder

The module build first shipped the single file's behaviour unchanged (1.8.0, proven by the goldens).
1.9.0 (2 November 2026) is the first release that changes it, on purpose:

- only the row just saved slides in: `txRow` takes a boolean, so the lists built with `.map` no
  longer hand it the array index and the `new` class;
- `compact()` trims the trailing zero of a crore (`₹1.2Cr`, not `₹1.20Cr`);
- History search finds income as well as expenses: income rows show in green with a plus, and the
  totals read "spent +came in" wherever an income entry matched;
- a newer build taking over offers a toast, "A new version is ready. Reload" (`src/ui/update.ts`): the
  service worker calls `skipWaiting()`, so the page sees a `controllerchange`, and the registration is
  re-checked whenever the app comes back to the foreground, because the browser only looks for a new
  `sw.js` on navigation and a phone keeps the app open for days.

## Continuous integration

The repository root holds `.github/workflows/check.yml`: on every push to `main` and every pull
request it installs `app/`, installs Chromium and runs `npm run check` on Ubuntu, keeping the
Playwright report and traces as an artifact when something fails. `visual.spec.ts` skips there
until Linux baselines exist; `visual-baselines.yml` (run by hand from the Actions tab) records them
as an artifact to unzip into `e2e/visual/` and commit.

## Not in this folder

Still separate steps from the same plan: the custom domain (Face ID passkeys are bound to the
hostname) and zero-knowledge blob sync if users ask for it.
