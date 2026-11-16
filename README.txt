Money tracker by Zestera - self-hosted copy (version 1.2.6, 30 Oct 2026; numbered 1.8.0 until 16 Nov 2026)
Settings shows the version; the change history is in the .md document.

Upload this whole folder to any static host (GitHub Pages, Cloudflare Pages, Azure Static Web App, Netlify).
Then on your phone: iPhone - open the site in Safari -> Share -> Add to Home Screen;
Android - open it in Chrome -> menu -> Add to Home screen (or tap Install app when the app offers it).

Files:
  index.html     the app (single file, no build step)
  Money tracker - Features and How it works.md   what every screen does and how it works under the hood
  HANDOFF.md     engineering handoff: build history, architecture, data model, tests, how to release
  sw.js          service worker so the app opens offline after the first visit
  manifest.json  app name/icon for Android and desktop installs (iOS uses the tags inside index.html)
  icon-*.png     home-screen icons (the ₹ mark)
  favicon.svg, favicon-32.png   browser-tab icon
  fonts/         IBM Plex Sans and Mono (subsets, OFL) - the app loads nothing from the internet
  app/           the same app as TypeScript modules built with Vite (npm run build -> app/dist); see app/README.md

First open shows the welcome screen and asks for your name; after that the app opens on the Dashboard.
Expenses, money in (salary, refunds, gifts) and a one-tap Fuel card all live on the Add screen; paid-with covers
cash, bank, UPI and credit cards. See the .md document for the full feature list.
Settings -> Backup also makes a monthly PDF statement (share sheet on the phone, download elsewhere).
Your data stays in that site's browser storage on your phone. Use Settings -> Save backup to Files (where the phone can share files) or Copy / Download backup now and then;
the app reminds you after 30 days. It also keeps a copy of the ledger as it stood at the start of each of the last 3 days
it was used (Settings -> Backup -> Automatic copies), and Delete all can be undone from the toast.

Add it to the Home Screen before logging anything. On iPhone a Safari tab and the installed app keep separate data, and iOS can
clear a tab's data after 7 days unused; on Android, Chrome and the installed app share one store. The app shows the steps for
your phone until it is installed.

Setting a PIN encrypts the ledger and its automatic copies on the phone (AES-256). With a PIN set, Settings -> Security ->
Unlock with Face ID (iPhone, iOS 18+) or with fingerprint or face (Android, recent Chrome) adds a passkey that opens the same
ledger; the PIN stays as the fallback. Backups you copy or
download are plain JSON. A forgotten PIN can only be reset by erasing the app and restoring a backup.
Budgets can post a notification on the phone at 90% and when exceeded (allow it when asked); the icon shows how many are over.
The PIN needs an https address (or the Home Screen app), which every static host above provides.
