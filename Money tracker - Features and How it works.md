# Money tracker by Zestera — Features & How It Works

Oct 30, 2026 · @Shreya Sanghavi

Money tracker (a Zestera app, formerly Rupee Ledger) is a personal expense tracker that runs on your phone, iPhone or Android, from the home screen. On first open an animated welcome screen asks only for your name; after that the Dashboard greets you by first name with Good morning, afternoon or evening. You type an amount, tap a category, say whether you paid by cash, bank account, UPI or credit card, and it is saved with the day, date and time. Money in (salary, refunds, gifts) is logged the same way, and a Fuel card on the Add screen turns the daily fill into one tap. The Dashboard always shows the current month from zero; History keeps every month and year. Budgets, credit-card statement cycles, recurring expenses and income, automatic local copies, backup reminders and a PIN that encrypts the ledger are built in. Everything lives on the phone itself: there is no account, no server and nothing to sign in to. This document describes version 1.2.10, built 16 November 2026. Settings shows the version as a chip; the history of changes is the Version history section below.

## Where it runs

There are two copies of the same app. Use the Claude link to try it; move to the self-hosted copy for daily use.

| Copy | What it is | Best for |
| --- | --- | --- |
| Claude artifact link | The page published from this chat, private to your Claude account | Trying it out, quick changes |
| Self-hosted site (`money-tracker-2026-10-30.zip`) | `index.html` + `sw.js` + `manifest.json` + icons, uploaded to GitHub Pages, Cloudflare Pages or an Azure Static Web App | The real home-screen app: your own URL, no Claude sign-in, opens offline after the first visit |

To put it on your phone: on iPhone, open the site in Safari, tap Share, then **Add to Home Screen**; on Android, open it in Chrome, tap the ⋮ menu, then **Add to Home screen**, or tap the **Install app** button the app shows when Chrome offers to install it. It then opens full screen with its own icon, like a native app. Do this from the self-hosted URL; from the Claude link, the browser pins the Claude viewer page instead of the app.

Data is tied to the URL you open it from. On iPhone the Home Screen app and a Safari tab for the same URL are two separate stores (on Android, Chrome and the installed app share one). If you start on the Claude link, or log in a Safari tab, and later move to the installed app, use Settings → Copy backup on the old one and Restore on the new one. The app shows the install steps for your phone until it is installed.

## Features at a glance

Every feature in the current build, what it does, and the everyday problem it solves.

| Feature | What it does | Why it is useful |
| --- | --- | --- |
| Starts at zero | A fresh install shows ₹0 and no sample data | What you see is only what you spent |
| Automatic day, date and time | Each expense is stamped with the weekday, date and clock time when you tap Save; a live clock on the Add screen shows what will be recorded | No typing dates; you can later see that the ₹999 Shopping spend was on Friday at 9:12 pm |
| Backdating | A link reveals date and time fields for logging something from earlier; it switches itself off after that save | Catch up on yesterday's spends without the next quick add being wrongly backdated |
| Categories | 10 defaults (Food, Groceries, Transport, Fuel, Shopping, Bills, Rent, Health, Entertainment, Other), each with a colour and a line glyph shown in chips and rows; add or remove your own in Settings. Up to 16 categories get distinct colours; a removed category shows grey | Groups spending the way you think about it; colours and glyphs stay consistent across every screen |
| Paid with: Cash or Online | Cash needs nothing more; Online asks Bank account, UPI or Credit card. UPI is tied to a bank account | Separates money that left a bank from money that will arrive on a card bill, and shows UPI spends as their own line, which is how people think about GPay and PhonePe |
| Bank and card directory | A searchable list of 129 Indian banks (public, private, small finance, payments, foreign, co-operative, regional rural) and 278 credit cards across 38 issuers; forgiving search (sbi, j&k, hdfc regalia, amex); anything missing can be added as your own | Correct names without typing; HDFC Regalia Gold and HDFC Millennia stay separate cards |
| Remembered accounts | Once used, a bank or card appears as a one-tap chip and is pre-selected next time | The common case is amount → category → Save |
| Dashboard | Month or Year: total so far, expense count, per-day or per-month rate, projected month total, change vs last month or last year; a Month by month card that compares the last six months (or all twelve in the Year view) with tappable bars and what moved by category | Answers "how am I doing this month", "how does it compare" and "what did the year cost" at a glance |
| Day-by-day chart | A bar per day with your daily-average line; today is highlighted | Shows which days the money went, not just how much |
| By category | Donut plus a ranked list with share of month | Shows where the money went |
| Paid with breakdown | Cash / bank / UPI / cards split bar, then each bank account (bank transfers plus UPI on it), a UPI section per bank, and each card with its own total | Per-bank and per-card totals, which is what the bill and the statement show |
| Biggest spends | The three largest expenses of the month, or the five largest of the year in the Year view | The quickest way to spot the one-off that blew the month |
| Tap anything for detail | Rows, donut slices, chart bars and expenses open a bottom sheet with totals, share, breakdowns and the list behind the number; sheets stack with a Back button | Drill from "Food ₹4,200" to "which card paid for it" to the single expense without leaving the screen |
| Month and year navigation | Arrows move to earlier months, or earlier years with the Year switch on; "Back to this month" / "Back to this year" returns; a bar or a month row in the Year view opens that month | Compare this month with any earlier one on the same screen, and see what a whole year cost |
| History | A chronological ledger that opens on the current year with every month: Year and Month dropdowns (never the future) pick the whole year or one month; below them a Filter button opens a sheet of Category and Paid with chips, a Sort button a sheet of the four orders, and a Clear button resets filters, sort and search; each month lists every expense by day. The search box searches all time | Find any expense by when it happened; the graphs live on the Dashboard |
| Search | One box across all time, over expenses and income: notes, categories, bank or card names, "cash", amounts, months, dates; results grouped by month with what was spent and, when income matched, what came in | Find that Swiggy order in March, or everything paid with the Axis card |
| Resets on the 1st | The Dashboard always opens on the current month, so it reads zero on the 1st; nothing is deleted | A fresh monthly view without losing history |
| Settings | Appearance, security, banks and cards (hide or delete), vehicles, categories, budgets, recurring, backup and restore, delete all with a confirm step; the app version is shown at the bottom | Keeps the Add screen tidy as accounts change |
| Backup and restore | **Save backup to Files** (one tap into the phone's share sheet → Files, Drive, Mail, WhatsApp), or copy the JSON to the clipboard, or download it; restore by pasting or picking the file | The only safety net for data that lives on one phone, now one tap on the phone |
| Light and dark | Follows the phone's appearance. Light is beige with a sage accent and sky blue in the hero and for bank money; dark is the same family on a warm olive charcoal, designed, not inverted | Readable at night without a flashlight screen |
| Offline | The self-hosted copy installs a service worker, so it opens without a connection after the first visit | Works in a lift, a basement car park or on a flight |
| Edit an expense | Every expense sheet has an Edit button: change the amount, category, cash/bank/card (with the same directory picker), date, time or note | Fix a wrong amount or the wrong card without deleting and re-typing |
| Monthly budgets | Settings lists only the categories that have a budget, each editable or removable, with an Add row (category dropdown + amount) for the rest. The Dashboard opens with a Budgets card showing spent, what is left (or how much over), green under 80%, amber from 80%, red when exceeded | Know on the 20th that Food has ₹1,200 left, not on the 1st that it went ₹2,000 over |
| Budget warnings | The save that takes a category past 80% shows a warning toast right after the saved message; at 90% and when the budget is exceeded the app also posts a notification on the phone (once allowed), and later spends say how far over. While any budget is over this month a red banner sits at the top of the Dashboard and the Home Screen icon shows how many budgets are over | You hear about it at the moment it happens, and the icon keeps reminding you |
| PDF report | Settings → Backup → PDF report (pick the month), or "PDF report ›" on the Dashboard's All expenses card: an A4 statement with Money in, Total expenses and Balance, a dated ledger with Credit, Debit and running Balance, then By category and Paid with. On iPhone it opens the share sheet (Save to Files, Mail, WhatsApp); elsewhere it downloads | A month's statement to send or file, made on the phone with no server |
| Card statement cycle | Set a statement day per credit card; the card's row and sheet then show "this bill so far" with the period it covers and the day it closes | Matches what the card bill will say, which the calendar month never does unless the statement is on the 1st |
| Recurring expenses | Rent, SIPs and subscriptions set up once with an amount, category, account and day of the month; the app adds them for you each month (marked auto) and catches up if it was not opened that day; pause or delete any time. Each time it adds one, a toast names it and, with alerts allowed, a notification does too ("Added automatically: Rent ₹15,000"); Settings → Recurring turns the notification off | The big fixed spends never need typing and are never forgotten, and you still hear about each one |
| Backup reminder | A banner on the Dashboard when you have never backed up and the data is over a week old, or when the last backup is 30 days old; Settings shows the last backup date | Data lives only on the phone; the reminder is what stands between you and a lost year |
| PIN lock | An optional 4-digit PIN asked for when the app opens and after a minute in the background; the ledger on the phone is encrypted with it; change or remove it with the current PIN; a forgotten PIN can only be reset by erasing the app and restoring a backup | Keeps the ledger unreadable to anyone who gets at the phone's files, as well as off the screen |
| Face ID / fingerprint unlock | With a PIN set, Settings → Security → Unlock with Face ID (iPhone, iOS 18 or later) or Unlock with fingerprint or face (Android, a recent Chrome) creates a passkey on the phone whose secret unlocks the same encrypted ledger. The lock screen then offers a biometric button above the keypad; the PIN stays as the fallback | Open the app with a glance or a touch, without weakening the encryption |
| Welcome screen and greeting | The first open shows a welcome page with the Zestera logo, what the app does, and a first name (required) and last name (optional); the Dashboard then opens with "Good morning / afternoon / evening, \<first name>!" and an initials avatar that opens Settings → Profile, where the name can be changed | A personal feel without an account; shown once, never again unless the name is cleared or the app is erased |
| Undo after delete | Deleting an expense shows a six-second "Deleted · Undo" toast; tapping Undo puts it back exactly where it was | The one destructive action now has a way back |
| Note autocomplete | Under the note box, your five most frequent notes appear as chips; typing narrows them. Tapping one fills the note and the category and bank or card it usually goes with | After a few weeks most entries are an amount and one tap |
| Open on Add | Settings → Open the app on: Dashboard or Add expense | If logging is why you open the app, it opens on the keypad |
| Cash in hand | Log ATM withdrawals (from a bank account) or set the amount in your wallet; cash expenses count against it. A Cash in hand card on the Dashboard shows the balance, this month's withdrawals and cash spends, and a history with every movement | Tells you what should be in your wallet, and where cash went |
| Search filters | The Filter and Sort sheets apply to search results too, with a running total | "Everything paid by UPI with Swiggy in the note" without scrolling |
| Money in | Salary, business, freelance, interest, refunds, gifts, logged from the Add screen into cash or a bank account, with recurring rules for salary on the 1st; the Dashboard shows "left to spend" against the month's income and History shows the year's income by source | The number people actually want is what is left, not only what went out |
| Trends | Tap the Dashboard hero or Day by day → Trends for the detailed view: this month against last, a running-total curve for both, the daily bars, average by weekday, the last six months, and "what moved" by category | The at-a-glance numbers stay on the Dashboard; the detailed graphs are one tap away and nowhere else |
| Calculator | A key next to every amount field opens a keypad with + − × ÷ and %; "Use" drops the result into the field. Typing an expression such as `250+180-30` straight into the amount works too | Split a bill or add a receipt without leaving the form |
| Fuel in one tap | A Fuel card on the Add screen, opened from the Fuel button at the top and closable (closing clears what was typed); while it is open it replaces the manual form, since a fill is always a Fuel expense: vehicle chips, Cash / UPI / Card, the banks or cards you fuel with ("bill so far" on each card), an amount box that clears after each save, one button, and optional odometer and litres for mileage in km/L. The Dashboard shows a Fuel card with a 31-day fill map, per-vehicle totals with their mileage and how much of each card's current bill is fuel | A daily fill takes a glance and a tap, and the card bill is visible before you pay |
| Automatic copies | The ledger as it stood at the start of each of the last 3 days it was used, restorable from Settings; Delete all can be undone from the toast | A bad restore or a mis-tap is recoverable without a backup |
| Encrypted with the PIN | Setting a PIN encrypts the stored ledger and its automatic copies (AES-256-GCM under a random master key that the PIN unwraps) | The data in the browser's storage is unreadable without the PIN or the passkey, not just hidden behind a screen |
| Privacy and Terms | A Privacy page (what the app stores, where, who can see it, what the PIN does, what the host sees) and plain Terms, reachable from the welcome screen and the bottom of Settings | The claim "nothing leaves the phone" is written down and checkable |
| Install card | On any phone outside the installed app, the welcome screen and the Dashboard show the steps for that phone (Share → Add to Home Screen on iPhone; the Chrome menu → Add to Home screen, or an Install app button when Chrome offers it, on Android) and, on iPhone, that a Safari tab's data can be cleared after 7 days unused | Stops people logging a month into a tab that iOS will wipe, and gets Android users the full-screen app |
| Appearance | Settings → Match phone / Light / Dark | Choose the look rather than follow the phone |
| Motion | The welcome logo builds itself over drifting colour and floating coins; the Dashboard hero drifts slowly and carries a 7-day spark with today in gold and a category strip; Save turns into a check and the new row slides in; sheets have a grab handle and swipe down to dismiss; one indicator glides along the tab bar; month arrows slide the screen in from the direction you moved; an empty month shows a receipt-and-coins illustration. All of it is off when the phone's Reduce Motion is on | Motion answers what you did; it is not decoration |

## Adding an expense

A normal spend takes three taps: amount, category, Save. The rest is remembered or recorded for you.

1. **Amount.** The screen opens with the keypad on the ₹ field. Decimals are fine (999.50). Enter on the keypad also saves.
2. **Category.** Tap a chip. The last chip you used stays selected until you change it.
3. **Paid with.** *Cash* needs nothing else. *Online* opens a second choice, *Bank*, *UPI* or *Card*; UPI asks for the bank it runs on. It then shows the bank or card you used last time, pre-selected, plus chips for your other recent ones. Tap **Search all banks…** or **Search all credit cards…** to open the directory.
4. **Note** (optional). A word or two such as Swiggy, petrol, chai. Notes are searchable in History.
5. **Save.** The expense is stamped with the weekday, date and time shown in the live clock at the top. A toast confirms what was saved ("Saved ₹420 · Food · HDFC Bank"), the amount clears, and the keypad stays open for the next one.

**Logging something from earlier.** Tap "Logging something from earlier? Change date or time" to reveal date and time fields (the date cannot be in the future). After that save the fields hide again and the next expense uses the current time, so a catch-up entry never silently backdates the one after it.

**The directory.** The picker is a full-height sheet with a search box at the top. With nothing typed it lists *your* banks or cards first (most recently used, with the date you last used them), then the full directory grouped by sector or issuer. Typing filters as you go; aliases are understood, so sbi, pnb, bob, kotak, amex, stanc, j&k all land on the right entry. Enter picks the first match. If nothing matches, or the right one is not there, one tap adds what you typed as your own entry. Every issuer also has a "credit card (other)" entry for a card the list does not name.

**Validation.** Save refuses an empty or zero amount, an Online payment with no bank or card chosen, and a future date; each shows a short message instead of a dialog.

**Just added.** The three most recent expenses sit under the Save button, each tappable, so you can check, edit or delete a mistake immediately.

**Money in.** Tap *Money in* at the top of the Add screen: amount, source (Salary, Business, Freelance, Interest, Refund, Gift, Other), received into cash or a bank account, date and time, note. Cash income raises cash in hand. Entries appear in a Money in card on the Dashboard with "left to spend", and each opens for editing or deleting (with undo).

**Fuel.** Tap *Fuel* at the top of the Add screen to open the Fuel card (✕ closes it; it stays open while you move around the app). While it is open the manual form is out of the way: a fill is always a Fuel expense, so there is nothing else to choose. Add a vehicle once (Swift, Activa, …). After that: the vehicle chip, *Cash*, *UPI* or *Card*, then the banks or cards you have fuelled with (cards show "bill so far"; *Other bank…* / *Other card…* opens the directory), the amount, and one button that spells out the fill. The amount clears after each save; closing the card clears anything typed. Under the button the app says what that card's bill will be after this fill and when it closes. Each vehicle remembers its own last way of paying, and switching to Card or UPI brings back the card or bank that vehicle used that way last. *Check mileage? Add odometer and litres* opens two optional fields (they stay open for a vehicle already being tracked): the first reading starts a stretch, the next one ends it, and the line under the fields gives the km driven, the litres put in and the mileage in km/L, with the price per litre. The mileage also shows on the Dashboard Fuel card, in the vehicle sheet (this month and all time) and on the expense itself; a stretch with a fill of unknown litres has no mileage.

&#91;embedded content: add-expense flow · 2 decisions, 1 directory lookup\]

Cash goes straight to Save. Online asks bank or card, then takes the remembered one or a directory pick; either way Save stamps the weekday, date and time.

## Navigation

The tab bar is Dashboard · History · Settings. The round + button in the header of every screen opens Add; on the Dashboard it sits beside your avatar.

## The Dashboard

The default screen. It opens on the current month, so on the 1st it reads ₹0 and builds up through the month. A **Month | Year** switch under the greeting sets what the arrows step through and what every block sums: the month, or that month's whole year. Nothing on this screen is ever deleted, it is only filtered by period.

**Month view**

| Block | What it shows | Tap to open |
| --- | --- | --- |
| Hero | Tap it for Trends. Spent so far this month; number of expenses; per-day rate (total ÷ days elapsed); Projected (per-day rate × days in month); a 7-day spark of real spend with today in gold; a thin strip of the month's categories; "₹X left of ₹Y in" when the month has income; a ▼/▲ chip with the change against last month | — |
| Month by month | This month beside the five before it: a bar per month with the amount on top; tiles for last month, the change against it, the average of the five months before and the highest of the six; the three categories that moved most against last month, up in red and down in green | A bar opens that month on the Dashboard; a mover opens the category; Trends › opens the full comparison |
| Money in | Shown when the month has income: what came in, what is left to spend, and each entry | The entry, with Edit and Delete |
| Fuel | Shown when the month has fills: this month's total, fills, per fill, per day; a 31-day map with filled days in the Fuel colour and today outlined; a row per vehicle; for each card with a statement day, how much of its current bill is fuel | A vehicle: its fills that month |
| Over-budget banner | Red banner at the top while any category is over its budget this month, naming each and by how much | The first category named |
| Budgets this month | Shown when at least one category has a budget: each budgeted category with spent, what is left or how much over, and a bar coloured green, amber (80%+) or red (over); the header totals spent against all budgets | The category, with its budget line at the top of the sheet |
| Day by day | One bar per day of the month, today highlighted, future days greyed, a dashed line at your daily average, the peak day labelled; a Trends link in the header | A day: its total, share of month, by-category list, and every expense that day |
| By category | Donut with the month total in the centre, and a ranked list with share, count and amount | A category: total, share, average per expense, which cash/bank/card paid for it, heaviest day, every expense |
| Paid with | A split bar (cash · bank · UPI · cards) with amounts and shares, then a Cash line, each bank account, a UPI section with each bank's UPI spend, and each credit card with its own total and share | A bank or card: total, share, average, by-category breakdown, heaviest day, every expense on it; a UPI row opens the bank filtered to UPI |
| Biggest spends | The three largest expenses this month | The expense itself |
| All expenses | Every expense grouped by day, newest first, each with category, note, date, time and how it was paid; "PDF report ›" in the header exports this month | A day header opens that day; a row opens the expense |

**The expense sheet** shows the amount, category, payment type (Cash, Online · Bank account, Online · Credit card), the bank or card, weekday, date, time and note, with an Edit button, two shortcuts ("All of that day", "\<Category> that month") and a Delete button behind a confirm step. Edit opens the same form as Add inside the sheet; changing the bank or card opens the directory picker and returns to the form.

**Sheets stack.** From a category you can tap a card, then an expense, and use the Back arrow to retrace. The scrim, the ✕ button or the Escape key close everything.

**Past months** show the same blocks with "Spent in September 2026" in the hero and "Highest day" in place of Projected. A "Back to this month" link returns.

**Year view** (the Year switch; arrows step a year at a time, never past this one)

| Block | What it shows | Tap to open |
| --- | --- | --- |
| Hero | Spent so far in 2026 (or Spent in 2025); number of expenses; per month (total ÷ months elapsed); the highest month; the category strip; "₹X left of ₹Y in" against the year's income; a ▼/▲ chip against the previous year when it has expenses | — |
| Month by month | Twelve bars, January to December, the current month highlighted and months still ahead drawn as stubs; under them a row per month that had expenses, newest first, with its expense count, the change against the month before (a multiple such as ▲ 73× past tenfold), its share of the year and a share bar | A bar or a row opens that month in the Month view |
| Money in and out | Shown when the year has income: in, out, what was kept or overspent, and the share kept | — |
| By category | The year's donut and ranked list | The category across the whole year: total, share of year, average per expense, how it was paid, heaviest day, every expense |
| Paid with | The year's split bar and each cash, bank, UPI and card line | The account across the whole year |
| Biggest spends | The five largest expenses of the year | The expense itself |

## History

History is the ledger: every expense, newest first, with nothing to interpret.

- **Dropdowns.** Year (only years with expenses, plus the current one; never the future) and Month (All months, then Jan–Dec with each month's count; months still ahead this year are disabled). History opens on the current year with All months; a month chosen in one year moves to the latest month of the next, while All months stays on.
- **Filter, Sort and Clear.** Three buttons under the dropdowns. **Filter** opens a sheet of Category chips (every category) and Paid with chips (Cash, Bank account, UPI, Credit card); each tap applies to the list behind the sheet at once, the button at the bottom says how many expenses that leaves and closes the sheet, and the Filter button then shows how many filters are set. **Sort** opens a sheet with newest first, oldest first, amount high to low and amount low to high; a tap applies it and closes, and the button shows the order chosen. **Clear** resets the filters, the sort and the search, and is greyed out when there is nothing to clear.
- **The list.** The month's expenses grouped by day with the day total on each header and the month total at the top; sorting by amount shows one flat list instead. Tap a day header for that day, a row for the expense. With Month on **All months**, the whole year is listed as one card per month, each with its total and its days inside; the year total sits at the top and tapping a month heading opens that month.
- **Search.** The box searches every expense and every income entry ever recorded: category, note, bank or card name, the word cash or UPI, amount (2500 or 2,500), month name or full date. Results are grouped by month; each heading shows what was spent and, when an income entry matched, what came in with a plus in green. Clearing returns to the month list.

## Settings

- **Appearance.** Match phone, Light or Dark.
- **Security.** Set a 4-digit PIN; the ledger and its automatic copies are then stored encrypted. Change PIN re-wraps the key; Remove PIN decrypts everything and also turns the biometric unlock off. **Unlock with Face ID** on iPhone, or **Unlock with fingerprint or face** on Android (shown once a PIN is set, on https), creates a passkey and turns the lock screen's biometric button on; **Turn off … unlock** removes its access. The lock screen has a Forgot link that offers to erase the app (the only way back in without the PIN or the passkey). Setting a PIN needs an https address or the Home Screen app.
- **Bank accounts and Credit cards.** Lists what you have used or added, with the number of expenses on each. An account with expenses can be **hidden** (it leaves the Add screen but its history stays) and shown again; one with no expenses can be deleted. Each credit card has a **Statement day** menu; once set, the row shows "this bill so far" with the period. **Add a bank** / **Add a credit card** open the same searchable directory as the Add screen.
- **Vehicles.** The vehicles the Fuel card logs against; removing one keeps its fills.
- **Categories.** Chips for the current set with a ✕ to remove and a box to add. Removing a category keeps its past expenses; they simply stop appearing as a chip (and show in grey on charts). Removing one also clears its budget.
- **Monthly budgets.** Only budgeted categories are listed, each with an editable amount (saved as you leave the box), how it stands this month, and a ✕ to remove. Below, a dropdown of the remaining categories with an amount box and Add. Adding the first budget asks permission for alerts; an **Alerts on this phone** line shows On, Off, Blocked in phone settings or Not available, with a button to allow or turn off.
- **Recurring.** Expenses and money in: a list of rules (name, category or source, day, account, when it was last added) with an Add button. Tapping a rule opens it for editing, pausing or deleting; past entries it created stay in the ledger. Below the list, **Tell me when an entry is added** shows On, Off, Blocked or Not available with a Notify me / Turn off button: when on, every entry a rule adds is announced with a notification naming it and the amount, alongside the toast. It uses the same permission as budget alerts; there is no server, so the notification appears when the app opens or returns to the foreground and adds the entry, never while the app is closed.
- **Backup.** Shows how many expenses are stored and the date of the last backup. **Save backup to Files** (shown when the phone can share files: iPhone, iPad and Android Chrome) opens the share sheet with the JSON backup so it can go to Files, Drive, Mail or WhatsApp in one tap; **Copy backup** puts the full ledger as JSON on the clipboard; **Download backup** saves it as a file (on your hosted copy). **PDF report** builds a month's statement (choose the month in the dropdown) and shares or downloads it. **Restore from a backup** accepts pasted text or a chosen `.json` file and replaces everything on the device. **Automatic copies** lists the ledger as it stood at the start of each of the last 3 days the app was used; each can be restored after a confirm. Backups are plain JSON even when a PIN is set.
- **Version, Privacy, Terms.** A chip at the bottom shows the version and build date (the history is the Version history section of this document); Privacy and Terms open as sheets. Privacy is also linked from the welcome screen.
- **Danger zone.** **Delete all expenses** asks for a confirm before it clears expenses, income and the cash log, then offers Undo for six seconds. Accounts, categories, budgets, vehicles and recurring rules are kept; recurring rules start again from the current month.

## How it works under the hood

The app is a handful of static files: one page, one script and one stylesheet built from TypeScript modules (the older single-file copy, one HTML file of about 215 KB, behaves the same and is still what some phones run), plus five small font files and the icons. The mark is a white ₹ (IBM Plex Mono's glyph) on a sage-to-sky tile with a gold coin; it ships as `favicon.svg` and `favicon-32.png` for the browser tab and `icon-180.png` / `icon-512.png` for the Home Screen. There is no framework, no build step, no server and no network request at all once the page is loaded: the two typefaces (IBM Plex Sans 400/500/600 and IBM Plex Mono 500/600) ship with the app as subsetted WOFF files under `fonts/` (Latin plus ₹, about 84 KB in total, OFL-licensed) and the service worker caches them for offline use.

**A few records.** Everything is derived from a handful of small tables held in memory and saved as one JSON object.

| Record | Fields | Notes |
| --- | --- | --- |
| Account | `id`, `name`, `type` (cash · bank · card), `archived`, `statementDay` | One built-in Cash account always exists; banks and cards are created the first time you pick them |
| Expense | `id`, `amount`, `category`, `accountId`, `method` (cash · bank · upi · card), `date` (YYYY-MM-DD), `time` (HH:MM), `note`, `recurringId`, `vehicleId`, `odo`, `litres` (fuel fills only) | Date and time are stored as local-time strings, so an expense stays on the day you logged it. UPI entries point at a bank account |
| Income | `id`, `amount`, `category` (the source), `accountId`, `method` (cash · bank), `date`, `time`, `note`, `recurringId` | Cash income counts towards cash in hand |
| Vehicle | `id`, `name` | Fills reference it by id, so renaming or removing one never touches the ledger |
| Cash movement | `id`, `kind` (withdrawal · adjust), `amount`, `accountId`, `date`, `time`, `note` | Cash in hand is replayed from these plus cash spends and cash income, in time order |
| Recurring rule | id, kind (expense · income), amount, category, method, accountId, day, note, active, since, lastApplied | lastApplied is the last month an entry was generated, so a rule is never applied twice for one month |
| Budget | category → rupees per month | Compared against the month's spend in that category at render time |

**Every view is a query, not a stored total.** The Dashboard filters expenses whose `date` starts with the chosen month and sums them; by category groups on `category`; the paid-with split groups on `method`, then on `accountId`; History groups on year and on year-month; search runs a text match across the fields. Because nothing is pre-computed, deleting an expense or renaming a category is reflected everywhere at once, and the numbers can never drift apart.

**The month reset is a view, not a deletion.** On the 1st the current month simply has no expenses yet, so the Dashboard shows ₹0, while the previous month is one arrow-tap away and stays in History forever.

**Storage.** The app version is written into `meta.appVersion` on every save. The JSON object is written to the browser's `localStorage` under the key `money-tracker.v1` after every change (the old `rupee-ledger.v1` key is read once and migrated) and read back on launch. Writes go through a queue so they land in order. Once a day, the first save keeps the previous state under `money-tracker.v1.snapshots` (the last 3 days). On launch the app asks the browser for persistent storage. If storage is unavailable (a private window, blocked site data) the app still runs and tells you it could not save.

**Upgrades.** On launch a small migration step brings older data up to date: it adds the Cash account and the Fuel category if missing, sets `method` on expenses saved before payment types existed, and fills in empty income, vehicle and recurring-kind fields. Your data is never thrown away by an update. One exception: the old PIN, which was a hash, is dropped; set the PIN again and the ledger is encrypted.

**Screens.** The page has one main area, a three-tab bar and a header Add button. Layout respects the phone's safe areas (notch, Dynamic Island, home indicator or gesture bar) in both portrait and the installed full-screen mode. Each tab re-renders its screen from the current data; detail views are a single bottom sheet that stacks (category → card → expense) with a Back button. The URL hash (`#add`, `#dashboard`, `#history`, `#settings`) remembers the tab.

**Offline.** The self-hosted copy registers `sw.js`, a service worker that serves the page network-first (so updates arrive) and pre-caches the page, manifest, icons and fonts for when there is no connection.

**Recurring rules run on launch.** Every time the app opens (and whenever it comes back to the foreground) it walks each active rule from the month after `lastApplied` up to the current month, adds an expense or an income entry dated the rule's day in each month whose day has already passed (clamped to the last day of shorter months), and records the month. Missing a week therefore adds the missed entries once, never twice. New rules choose whether to start this month or next. Whatever was added is named in a toast and, unless turned off in Settings → Recurring, in one notification listing each entry (up to three by name, then a count).

**Statement cycles.** For a card with a statement day D, the current bill period runs from the day after the previous statement to the next D (if today is past D in this month, the period closes next month). "This bill so far" sums that card's expenses inside the period up to today.

**Budgets** are compared at render time against the selected month's spend per category, so changing a budget re-colours past months too. After each save the app compares the category's month total before and after: crossing 80% or crossing the budget triggers the warning toast, and any spend while already over says the overage.

**The PDF** is written by the app itself, with no library and no server: an A4 page tree using the PDF base fonts Helvetica and Helvetica-Bold (so the file is small and the text selectable), with the ₹ sign drawn as a vector glyph because the base fonts lack it. Amounts use Indian grouping. On a phone that supports sharing files it goes to the share sheet; otherwise it downloads.

**The PIN and Face ID** never store a secret. The ledger and its automatic copies are AES-256-GCM ciphertext under a random 256-bit master key. That master key is stored wrapped: once by a key derived from the PIN (PBKDF2-SHA256, 100,000 rounds, random salt) and, when Face ID unlock is on, once more by a key derived (HKDF) from the passkey's PRF output for a stored salt. Either unwraps the master key; a wrong PIN or a different passkey simply fails to decrypt. Changing the PIN re-wraps; turning Face ID off drops its wrapper; removing the PIN decrypts everything. Stores written before 1.2.6 (ledger encrypted directly with the PIN key) are upgraded to this layout on their first unlock. Until a key is available nothing is rendered. A 4-digit PIN has only 10,000 combinations, so someone with the phone's files and time could still get in; it slows them down rather than stops them. Backups you copy or download are plain JSON. The app re-locks after a minute in the background. Web Crypto and WebAuthn need a secure context, so PIN and Face ID can be set only on https or in the Home Screen app; the passkey is bound to the site's domain and synced by the phone's passkey store (iCloud Keychain on iPhone, Google Password Manager on Android).

**Budget alerts** are local notifications: when a save crosses 90% of a budget or exceeds it, the app asks the service worker to show a notification on this phone (`Notification` permission, granted once from the Budgets card). There is no push server, so nothing fires while the app is closed; the Home Screen badge (`setAppBadge`) carries the count of over-budget categories between opens.

&#91;embedded content: architecture · 4 screens, 1 state, 2 ways out\]

Nothing leaves the shaded box on its own: the only copies of your data are the phone's storage and the backups you make.

## Your data

Your expenses never leave the phone. That is the app's main privacy property and also its main risk, so it is worth knowing the rules.

- **Where it lives.** In the browser's storage for the site you opened the app from. The Claude link and your own site are two separate stores, and on iPhone so are the Home Screen app and a Safari tab for the same URL: logging in a tab and then installing gives you an empty ledger in the app. Use Copy backup, then Restore inside the app. On Android, Chrome and the installed app share one store.
- **What keeps it.** Normal use, app updates (the migration step preserves data), closing the app, restarting the phone.
- **What can lose it.** Losing or resetting the phone; clearing the browser's site data; on iPhone, for a Safari *tab*, iOS clearing the site's data after 7 days without using it (the Home Screen app is exempt and keeps its own days-of-use count); erasing the app from the lock screen after a forgotten PIN. Settings → Delete all expenses can be undone from the toast, and the automatic copies cover a bad restore.
- **The safety net.** Settings → **Save backup to Files** (one tap on the phone), or **Copy backup** / **Download backup**, kept in Notes, Files, iCloud Drive or Google Drive. The Dashboard reminds you when the last backup is 30 days old (or when you have never backed up and the data is over a week old). **Restore** brings it back onto any phone. The automatic copies live on the same phone, so they are not a substitute for a backup.
- **Nothing is shared.** There is no sync between devices and no account. If you want the same ledger on an iPad, restore a backup there and keep logging on one device.

## Version history

| Version | Date | What changed |
| --- | --- | --- |
| 1.2.10 | 16 Nov 2026 | The Fuel card stands alone: while it is open the manual form is out of the way, a fill can be paid in Cash or by UPI as well as on a card (each vehicle remembers its own way of paying), and optional odometer and litres give the mileage in km/L on the card, the Dashboard, the vehicle sheet and the expense; History opens on the current year with All months, and the Category, Paid with and Sort dropdowns become Filter, Sort and Clear buttons under Year and Month, each opening a sheet; a toast and, with alerts allowed, a notification name every entry a recurring rule adds, with a switch under Settings → Recurring |
| 1.2.9 | 16 Nov 2026 | New colours: the light theme is beige with a sage accent and sky blue in the hero, on bank money and the tab bar; the dark theme is the same family on a warm olive charcoal; the app icon follows the new gradient, so re-add it to the Home Screen to see the new icon |
| 1.2.8 | 16 Nov 2026 | Dashboard gets a Month \| Year switch: a Month by month card compares the last six months with what moved by category, and the Year view sums the whole year by month, category, account and biggest spends (category and account sheets open across a year); History's Month dropdown gains All months for the whole year; the app addresses Android as well as iPhone: the install card shows Chrome's steps with an Install button where the browser offers one, and biometric unlock is called fingerprint or face off iPhone; CSV export removed from Backup (JSON backup and the PDF report remain); the service worker now takes over the page on its first install and only a good page replaces the offline copy; enrolling Face ID again replaces the passkey instead of adding a second one |
| 1.2.7 | 2 Nov 2026 | First release from the module build (`app/`), same data on the phone; History search covers income as well as expenses, with what came in shown beside what was spent; a "new version is ready" toast with a Reload button when an update has installed, checked whenever the app returns to the foreground; only the expense just saved slides in (other rows no longer animate); crore amounts drop the trailing zero (₹1.2Cr) |
| 1.2.6 | 30 Oct 2026 | Face ID unlock via a passkey (WebAuthn PRF) wrapping the same encrypted ledger, PIN as fallback; ledger moved to a wrapped random master key (older stores upgrade on first unlock); budget notifications at 90% and when exceeded; Home Screen badge with the count of over-budget categories; alerts toggle in Settings |
| 1.2.5 | 30 Oct 2026 | Fonts shipped with the app (IBM Plex Sans and Mono subsets under `fonts/`), so no request leaves the phone; Save backup to Files via the share sheet; Privacy and Terms pages from the welcome screen and Settings |
| 1.2.4 | 30 Oct 2026 | Fuel amount clears after each save and closing the card clears the form; budgets in Settings list only set budgets with an Add row; warning toast when a save crosses 80% or exceeds a budget and a Dashboard banner while over; monthly PDF expense report (share or download) |
| 1.2.3 | 30 Oct 2026 | Fuel card behind a Fuel button on Add (closable; selects the Fuel category); History filters as Year, Month, Category, Paid with and Sort dropdowns; 16-colour category palette; stale `pin` field dropped from storage and backups; cash-in-hand layout at lakh amounts; version chip in Settings and `meta.appVersion` in backups |
| 1.2.2 | 30 Oct 2026 | Dashboard · History · Settings tab bar with Add in every header; Trends sheet; History as a newest-first ledger by year and month; calculator on amount fields; ₹ logo |
| 1.2.1 | 29 Oct 2026 | Fuel in one tap with vehicles and card bills; Dashboard Fuel card; Vehicle column in CSV |
| 1.2.0 | 29 Oct 2026 | UI pass: hero spark and strip, category glyphs, save morph, draggable sheets, tab indicator, empty-state art, Appearance setting |
| 1.1.0 | 29 Oct 2026 | Automatic copies and undoable Delete all; install card; Money in; UPI; PIN encrypts the ledger |
| 1.0.0 | 23 Oct 2026 | Renamed to Money tracker; welcome screen; cash in hand, budgets, statement cycles, recurring, undo, autocomplete, filters, offline |
| 0.x | before 23 Oct 2026 | Rupee Ledger: the original tracker with amount, category, cash / bank / card, Month and History, backup and a PIN gate |

Every save stamps `meta.appVersion` into the ledger, so a backup says which version wrote it.

**Numbering.** On 16 November 2026 the releases after 1.2.0 were renumbered: routine releases step the third number (1.2.1, 1.2.2 … 1.2.10, 1.2.11) and the second number is kept for a bigger milestone (1.3.0). What used to be 1.3.0 to 1.11.0 is now 1.2.1 to 1.2.9. A backup or an installed copy may still carry an old stamp: 1.8.0 means 1.2.6, 1.9.0 means 1.2.7, 1.10.0 means 1.2.8 and 1.11.0 means 1.2.9.

## Known limits and what is next

**Limits in the current build**

- The bank and card directory is a snapshot built on 23 October 2026. New cards are added by hand (or on the spot with "Add as your own").
- Budget notifications fire only at the moment of a save (no push server); on iPhone only from the Home Screen app, on Android from Chrome or the installed app, with notifications allowed.
- Biometric unlock needs iOS 18 or later and the Home Screen app on iPhone, or a recent Chrome with Google Password Manager passkeys on Android; the passkey is tied to the site's domain, so a domain change means re-enrolling (the PIN still works).
- The PDF report uses the PDF base fonts, so notes in Gujarati, Hindi or other non-Latin scripts print as `?` in the report (they are intact in the app and the backup). Embedding a font would fix it at about 100 KB.
- No sync, no multi-device, no cloud backup beyond the manual copy or download.
- The PIN is a 4-digit key; it makes the stored data unreadable without it but cannot resist a determined offline guess.
- Recurring expenses are added when the app is opened, so a rule due on the 5th appears the first time you open the app on or after the 5th.
- The Claude link version cannot install a service worker or hand out downloads, so it needs a connection to open and uses Copy instead of Download. The self-hosted copy has both.
- An expense can be split across categories or payment methods only by entering it twice.

**Possible next steps**

1. Host the self-hosted copy and pin that URL to the home screen (in progress).
2. Check the "Zestera" name against the trademark register before a public listing.
3. A yearly view of budgets: how many months each category stayed within budget.
4. Split one expense across two categories or two payment methods.
5. Optional iCloud-based sync by saving the backup file to iCloud Drive automatically (needs a native wrapper, not possible from a web app alone).
