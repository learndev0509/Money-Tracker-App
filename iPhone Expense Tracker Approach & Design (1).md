# Money tracker by Zestera — Features & How It Works

Oct 22, 2026 · @Shreya Sanghavi

> Historical: this is the original approach and design write-up for the build of 23 October 2026 (1.0.0), kept as it was. It still says iPhone, CSV export and a PIN gate; the app has since gone phone-neutral, dropped CSV, encrypts with the PIN and runs on Android too. The current description of every feature is `Money tracker - Features and How it works.md`; the engineering notes are `HANDOFF.md`.

Money tracker (a Zestera app, formerly Rupee Ledger) is a personal expense tracker that runs on your iPhone from the home screen. On first open an animated welcome screen asks only for your name; after that the Month screen greets you by first name with Good morning, afternoon or evening. You type an amount, tap a category, say whether you paid by cash, bank account or credit card, and it is saved with the day, date and time. The Month screen always shows the current month from zero; History keeps every month and year. Budgets, credit-card statement cycles, recurring expenses, CSV export, backup reminders and a PIN lock are built in. Everything lives on the phone itself: there is no account, no server and nothing to sign in to. This document describes the build of 23 October 2026 ([open the app](https://claude.ai/artifact/8MZJADDrLDqAX43VWRrDNX)).

## Where it runs

There are two copies of the same app. Use the Claude link to try it; move to the self-hosted copy for daily use.

| Copy | What it is | Best for |
| --- | --- | --- |
| Claude artifact link | The page published from this chat, private to your Claude account | Trying it out, quick changes |
| Self-hosted site (`rupee-ledger-site.zip`) | `index.html` + `sw.js` + `manifest.json` + icons, uploaded to GitHub Pages, Cloudflare Pages or an Azure Static Web App | The real home-screen app: your own URL, no Claude sign-in, opens offline after the first visit |

To put it on the iPhone: open the site in Safari, tap Share, then **Add to Home Screen**. It then opens full screen with its own icon, like a native app. Do this from the self-hosted URL; from the Claude link, Safari pins the Claude viewer page instead of the app.

Data is tied to the URL you open it from. If you start on the Claude link and later move to your own site, use Settings → Copy backup on the old one and Restore on the new one.

## Features at a glance

Every feature in the current build, what it does, and the everyday problem it solves.

| Feature | What it does | Why it is useful |
| --- | --- | --- |
| Starts at zero | A fresh install shows ₹0 and no sample data | What you see is only what you spent |
| Automatic day, date and time | Each expense is stamped with the weekday, date and clock time when you tap Save; a live clock on the Add screen shows what will be recorded | No typing dates; you can later see that the ₹999 Shopping spend was on Friday at 9:12 pm |
| Backdating | A link reveals date and time fields for logging something from earlier; it switches itself off after that save | Catch up on yesterday's spends without the next quick add being wrongly backdated |
| Categories | 10 defaults (Food, Groceries, Transport, Fuel, Shopping, Bills, Rent, Health, Entertainment, Other), each with a colour; add or remove your own in Settings | Groups spending the way you think about it; colours stay consistent across every chart |
| Paid with: Cash or Online | Cash needs nothing more; Online asks Bank account or Credit card | Separates money that left a bank from money that will arrive on a card bill |
| Bank and card directory | A searchable list of 129 Indian banks (public, private, small finance, payments, foreign, co-operative, regional rural) and 278 credit cards across 38 issuers; forgiving search (sbi, j&k, hdfc regalia, amex); anything missing can be added as your own | Correct names without typing; HDFC Regalia Gold and HDFC Millennia stay separate cards |
| Remembered accounts | Once used, a bank or card appears as a one-tap chip and is pre-selected next time | The common case is amount → category → Save |
| Month screen | Total so far, expense count, per-day rate, projected month total, change vs last month | Answers "how am I doing this month" at a glance |
| Day-by-day chart | A bar per day with your daily-average line; today is highlighted | Shows which days the money went, not just how much |
| By category | Donut plus a ranked list with share of month | Shows where the money went |
| Paid with breakdown | Cash / bank / cards split bar, then each bank and each card with its own total | Per-bank and per-card totals, which is what the bill and the statement show |
| Biggest spends | The three largest expenses of the month | The quickest way to spot the one-off that blew the month |
| Tap anything for detail | Rows, donut slices, chart bars and expenses open a bottom sheet with totals, share, breakdowns and the list behind the number; sheets stack with a Back button | Drill from "Food ₹4,200" to "which card paid for it" to the single expense without leaving the screen |
| Month navigation | Arrows move to earlier months; "Back to this month" returns | Compare this month with any earlier one on the same screen |
| History | Year tabs, year total, months with spend, monthly average, highest month, a tappable 12-month chart, category and account breakdowns for the year, year-by-year comparison | The long view: trends, seasonality, which card you lean on |
| Search | One box across all time: notes, categories, bank or card names, "cash", amounts, months, dates; results grouped by month with a total | Find that Swiggy order in March, or everything paid with the Axis card |
| Resets on the 1st | The Month screen always opens on the current month, so it reads zero on the 1st; nothing is deleted | A fresh monthly view without losing history |
| Settings | Manage banks and cards (hide or delete), categories, backup and restore, delete all with a confirm step | Keeps the Add screen tidy as accounts change |
| Backup and restore | Copy a JSON backup to the clipboard (paste into Notes or iCloud Drive); restore by pasting or picking the file | The only safety net for data that lives on one phone |
| Light and dark | Follows the iPhone's appearance; dark colours are designed, not inverted | Readable at night without a flashlight screen |
| Offline | The self-hosted copy installs a service worker, so it opens without a connection after the first visit | Works in a lift, a basement car park or on a flight |
| Edit an expense | Every expense sheet has an Edit button: change the amount, category, cash/bank/card (with the same directory picker), date, time or note | Fix a wrong amount or the wrong card without deleting and re-typing |
| Monthly budgets | A budget per category in Settings; the Month screen opens with a Budgets card showing spent, what is left (or how much over), green under 80%, amber from 80%, red when exceeded | Know on the 20th that Food has ₹1,200 left, not on the 1st that it went ₹2,000 over |
| Card statement cycle | Set a statement day per credit card; the card's row and sheet then show "this bill so far" with the period it covers and the day it closes | Matches what the card bill will say, which the calendar month never does unless the statement is on the 1st |
| Recurring expenses | Rent, SIPs and subscriptions set up once with an amount, category, account and day of the month; the app adds them for you each month (marked auto) and catches up if it was not opened that day; pause or delete any time | The big fixed spends never need typing and are never forgotten |
| CSV export | Copy or download every expense as a CSV (date, time, weekday, amount, category, payment, account, note, recurring) | Opens straight in Excel or Numbers for a year-end review |
| Backup reminder | A banner on the Month screen when you have never backed up and the data is over a week old, or when the last backup is 30 days old; Settings shows the last backup date | Data lives only on the phone; the reminder is what stands between you and a lost year |
| PIN lock | An optional 4-digit PIN asked for when the app opens and after a minute in the background; change or remove it with the current PIN; a forgotten PIN can only be reset by erasing the app and restoring a backup | Keeps casual eyes off the ledger when someone borrows the phone |
| Welcome screen and greeting | The first open shows a welcome page with the Zestera logo, what the app does, and a first name (required) and last name (optional); the Month screen then opens with "Good morning / afternoon / evening, \<first name>!" and an initials avatar that opens Settings → Profile, where the name can be changed | A personal feel without an account; shown once, never again unless the name is cleared or the app is erased |
| Undo after delete | Deleting an expense shows a six-second "Deleted · Undo" toast; tapping Undo puts it back exactly where it was | The one destructive action now has a way back |
| Note autocomplete | Under the note box, your five most frequent notes appear as chips; typing narrows them. Tapping one fills the note and the category and bank or card it usually goes with | After a few weeks most entries are an amount and one tap |
| Open on Add | Settings → Open the app on: Month screen or Add expense | If logging is why you open the app, it opens on the keypad |
| Cash in hand | Log ATM withdrawals (from a bank account) or set the amount in your wallet; cash expenses count against it. A Cash in hand card on the Month screen shows the balance, this month's withdrawals and cash spends, and a history with every movement | Tells you what should be in your wallet, and where cash went |
| Search filters | A chip row above History results: All time / This month / This year, Cash / Bank / Cards, and one chip per category; they combine with the search box and show a running total | "Everything on the Axis card this year" without typing |
| Motion | The welcome logo builds itself (bars rise, coin drops, a shine sweeps) over drifting colour and floating coins; screens fade up, the month total counts up, chart bars grow, the donut draws in, bars widen, buttons press. All of it is off when the phone's Reduce Motion is on | Feels like an app, not a form |

## Adding an expense

A normal spend takes three taps: amount, category, Save. The rest is remembered or recorded for you.

1. **Amount.** The screen opens with the keypad on the ₹ field. Decimals are fine (999.50). Enter on the keypad also saves.
2. **Category.** Tap a chip. The last chip you used stays selected until you change it.
3. **Paid with.** *Cash* needs nothing else. *Online* opens a second choice, *Bank account* or *Credit card*, then shows the bank or card you used last time, pre-selected, plus chips for your other recent ones. Tap **Search all banks…** or **Search all credit cards…** to open the directory.
4. **Note** (optional). A word or two such as Swiggy, petrol, chai. Notes are searchable in History.
5. **Save.** The expense is stamped with the weekday, date and time shown in the live clock at the top. A toast confirms what was saved ("Saved ₹420 · Food · HDFC Bank"), the amount clears, and the keypad stays open for the next one.

**Logging something from earlier.** Tap "Logging something from earlier? Change date or time" to reveal date and time fields (the date cannot be in the future). After that save the fields hide again and the next expense uses the current time, so a catch-up entry never silently backdates the one after it.

**The directory.** The picker is a full-height sheet with a search box at the top. With nothing typed it lists *your* banks or cards first (most recently used, with the date you last used them), then the full directory grouped by sector or issuer. Typing filters as you go; aliases are understood, so sbi, pnb, bob, kotak, amex, stanc, j&k all land on the right entry. Enter picks the first match. If nothing matches, or the right one is not there, one tap adds what you typed as your own entry. Every issuer also has a "credit card (other)" entry for a card the list does not name.

**Validation.** Save refuses an empty or zero amount, an Online payment with no bank or card chosen, and a future date; each shows a short message instead of a dialog.

**Just added.** The three most recent expenses sit under the Save button, each tappable, so you can check, edit or delete a mistake immediately.

&#91;embedded content: add-expense flow · 2 decisions, 1 directory lookup\]

Cash goes straight to Save. Online asks bank or card, then takes the remembered one or a directory pick; either way Save stamps the weekday, date and time.

## The Month screen

The default screen. It opens on the current month, so on the 1st it reads ₹0 and builds up through the month. Arrows at the top move to earlier months; nothing on this screen is ever deleted, it is only filtered by month.

| Block | What it shows | Tap to open |
| --- | --- | --- |
| Hero | Spent so far this month; number of expenses; per-day rate (total ÷ days elapsed); Projected (per-day rate × days in month); a ▼/▲ chip with the change against last month and last month's total | — |
| Budgets this month | Shown when at least one category has a budget: each budgeted category with spent, what is left or how much over, and a bar coloured green, amber (80%+) or red (over); the header totals spent against all budgets | The category, with its budget line at the top of the sheet |
| Day by day | One bar per day of the month, today highlighted, future days greyed, a dashed line at your daily average, the peak day labelled | A day: its total, share of month, by-category list, and every expense that day |
| By category | Donut with the month total in the centre, and a ranked list with share, count and amount | A category: total, share, average per expense, which cash/bank/card paid for it, heaviest day, every expense |
| Paid with | A split bar (cash · bank · cards) with amounts and shares, then a Cash line, each bank account and each credit card with its own total and share | A bank or card: total, share, average, by-category breakdown, heaviest day, every expense on it |
| Biggest spends | The three largest expenses this month | The expense itself |
| All expenses | Every expense grouped by day, newest first, each with category, note, date, time and how it was paid | A day header opens that day; a row opens the expense |

**The expense sheet** shows the amount, category, payment type (Cash, Online · Bank account, Online · Credit card), the bank or card, weekday, date, time and note, with an Edit button, two shortcuts ("All of that day", "\<Category> that month") and a Delete button behind a confirm step. Edit opens the same form as Add inside the sheet; changing the bank or card opens the directory picker and returns to the form.

**Sheets stack.** From a category you can tap a card, then an expense, and use the Back arrow to retrace. The scrim, the ✕ button or the Escape key close everything.

**Past months** show the same blocks with "Spent in September 2026" in the hero and "Highest day" in place of Projected. A "Back to this month" link returns.

## History

History is the long view: every month and every year you have recorded, with search across all of it.

- **Year tabs.** One tab per year with data (the current year is always present). Tap to switch.
- **Year hero.** Total for the year, months with expenses out of months elapsed, average per active month, and the highest month.
- **Month by month.** A 12-month bar chart, the current month highlighted, each bar tappable, followed by a list of active months with expense count, per-day rate, share of year and amount. Tapping a month opens its sheet: total, per day, change vs the previous month, biggest spend, category and paid-with breakdowns, and an **Open in full** button that jumps the Month screen to that month.
- **By category in \<year>.** The year's spend per category; tapping one shows it month by month, then which banks and cards paid for it.
- **Paid with in \<year>.** The cash / bank / cards split for the year and each account's annual total; tapping one shows it month by month, then by category.
- **Year by year.** Appears once you have two or more years; a bar per year, tap to switch.
- **Search.** The box at the top searches every expense ever recorded: category, note, bank or card name, the word cash, amount (2500 or 2,500), month name or full date. Results are grouped by month with a running total, and clearing the box returns to the year view.

## Settings

- **Security.** Set a 4-digit PIN; once set, Change PIN and Remove PIN both ask for the current one. The lock screen has a Forgot link that offers to erase the app (the only way back in without the PIN).
- **Bank accounts and Credit cards.** Lists what you have used or added, with the number of expenses on each. An account with expenses can be **hidden** (it leaves the Add screen but its history stays) and shown again; one with no expenses can be deleted. Each credit card has a **Statement day** menu; once set, the row shows "this bill so far" with the period. **Add a bank** / **Add a credit card** open the same searchable directory as the Add screen.
- **Categories.** Chips for the current set with a ✕ to remove and a box to add. Removing a category keeps its past expenses; they simply stop appearing as a chip (and show in grey on charts). Removing one also clears its budget.
- **Monthly budgets.** One rupee box per category; leave it blank for no budget. Saved as you leave the box.
- **Recurring expenses.** A list of rules (name, category, day, account, when it was last added) with an Add button. Tapping a rule opens it for editing, pausing or deleting; past entries it created stay in the ledger.
- **Backup.** Shows how many expenses are stored and the date of the last backup. **Copy backup** puts the full ledger as JSON on the clipboard; **Download backup** saves it as a file (on your hosted copy). **Copy CSV** and **Download CSV** export every expense for Excel or Numbers. **Restore from a backup** accepts pasted text or a chosen `.json` file and replaces everything on the device.
- **Danger zone.** **Delete all expenses** asks for a confirm before it clears the ledger. Accounts, categories, budgets and recurring rules are kept; recurring rules start again from the current month.

## How it works under the hood

The whole app is one HTML file (about 80 KB) with its styles, script, bank and card directory and home-screen icon inside. There is no framework, no build step, no server and no network call while it runs. The only external request is for the two fonts, and the page falls back to the system font without them.

**Two records.** Everything is derived from two small tables held in memory and saved as one JSON object.

| Record | Fields | Notes |
| --- | --- | --- |
| Account | `id`, `name`, `type` (cash · bank · card), `archived` | One built-in Cash account always exists; banks and cards are created the first time you pick them |
| Expense | `id`, `amount`, `category`, `accountId`, `method` (cash · bank · card), `date` (YYYY-MM-DD), `time` (HH:MM), `note` | Date and time are stored as local-time strings, so an expense stays on the day you logged it |
| Recurring rule | id, amount, category, method, accountId, day, note, active, since, lastApplied | lastApplied is the last month an expense was generated, so a rule is never applied twice for one month |
| Budget | category → rupees per month | Compared against the month's spend in that category at render time |

**Every view is a query, not a stored total.** The Month screen filters expenses whose `date` starts with the chosen month and sums them; by category groups on `category`; the paid-with split groups on `method`, then on `accountId`; History groups on year and on year-month; search runs a text match across the fields. Because nothing is pre-computed, deleting an expense or renaming a category is reflected everywhere at once, and the numbers can never drift apart.

**The month reset is a view, not a deletion.** On the 1st the current month simply has no expenses yet, so the Month screen shows ₹0, while the previous month is one arrow-tap away and stays in History forever.

**Storage.** The JSON object is written to the browser's `localStorage` under the key `rupee-ledger.v1` after every change and read back on launch. If storage is unavailable (a private window, blocked site data) the app still runs and tells you it could not save.

**Upgrades.** On launch a small migration step brings older data up to date: it adds the Cash account and the Fuel category if missing, and sets `method` on expenses saved before payment types existed. Your data is never thrown away by an update.

**Screens.** The page has one main area and a four-tab bar. Each tab re-renders its screen from the current data; detail views are a single bottom sheet that stacks (category → card → expense) with a Back button. The URL hash (`#add`, `#dashboard`, `#history`, `#settings`) remembers the tab.

**Offline.** The self-hosted copy registers `sw.js`, a service worker that serves the page network-first (so updates arrive) and caches it for when there is no connection.

**Recurring expenses run on launch.** Every time the app opens (and whenever it comes back to the foreground) it walks each active rule from the month after `lastApplied` up to the current month, adds an expense dated the rule's day in each month whose day has already passed (clamped to the last day of shorter months), and records the month. Missing a week therefore adds the missed entries once, never twice. New rules choose whether to start this month or next.

**Statement cycles.** For a card with a statement day D, the current bill period runs from the day after the previous statement to the next D (if today is past D in this month, the period closes next month). "This bill so far" sums that card's expenses inside the period up to today.

**Budgets** are compared at render time against the selected month's spend per category, so changing a budget re-colours past months too.

**The PIN** is stored as a salted hash, never as the digits. It gates the screens, not the data: anyone with the phone's Safari storage could still read the JSON, so treat it as a deterrent, not encryption. The app re-locks after a minute in the background.

&#91;embedded content: architecture · 4 screens, 1 state, 2 ways out\]

Nothing leaves the shaded box on its own: the only copies of your data are the phone's storage and the backups you make.

## Your data

Your expenses never leave the phone. That is the app's main privacy property and also its main risk, so it is worth knowing the rules.

- **Where it lives.** In Safari's storage for the site you opened the app from. The Claude link and your own site are two separate stores; the home-screen app and the Safari tab for the same URL share one.
- **What keeps it.** Normal use, app updates (the migration step preserves data), closing the app, restarting the phone.
- **What can lose it.** Losing or resetting the phone; clearing Safari's website data; Safari's own clean-up of a site you have not opened for a long time (the home-screen version is treated more kindly than a tab); Settings → Delete all expenses; erasing the app from the lock screen after a forgotten PIN.
- **The safety net.** Settings → **Copy backup** or **Download backup**, kept in Notes, Files or iCloud Drive. The Month screen reminds you when the last backup is 30 days old (or when you have never backed up and the data is over a week old). **Restore** brings it back onto any phone.
- **Nothing is shared.** There is no sync between devices and no account. If you want the same ledger on an iPad, restore a backup there and keep logging on one device.

## Known limits and what is next

**Limits in the current build**

- The bank and card directory is a snapshot built on 23 October 2026. New cards are added by hand (or on the spot with "Add as your own").
- No sync, no multi-device, no cloud backup beyond the manual copy or download.
- The PIN is a deterrent, not encryption; the data in Safari storage is readable to anyone who can get at the phone's files.
- Recurring expenses are added when the app is opened, so a rule due on the 5th appears the first time you open the app on or after the 5th.
- The Claude link version cannot install a service worker or hand out downloads, so it needs a connection to open and uses Copy instead of Download. The self-hosted copy has both.
- An expense can be split across categories or payment methods only by entering it twice.

**Possible next steps**

1. Host the self-hosted copy and pin that URL to the home screen (in progress).
2. A yearly view of budgets: how many months each category stayed within budget.
3. Split one expense across two categories or two payment methods.
4. Optional iCloud-based sync by saving the backup file to iCloud Drive automatically (needs a native wrapper, not possible from a web app alone).
