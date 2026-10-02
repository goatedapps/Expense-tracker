# Everyday · SGD Expense Tracker

A phone-first expense tracker built with HTML, CSS and vanilla JavaScript. No framework, build step, backend, login or external dependencies.

## Features

- SGD income and expenses, descriptions, categories, multiple labels and date selection.
- Edit/delete transactions and calculate an amount with the built-in keypad.
- Home month/year toggle, matching transaction history and six months/years of paired income/expense bars.
- Overview month/year toggle, scrolling period selector, expense doughnut, cash-flow bars and income line graph.
- Card details, ranked category totals and transaction counts, category transaction lists and back navigation.
- Horizontal swipes, trackpad gestures and arrow keys change periods on Home, Overview and Budgets.
- Search and filter transactions by type, category, label and date range.
- Daily, weekly, bi-weekly, monthly and yearly overall/category budgets, remaining allowance and overspending indicators.
- Budget detail pages with selectable periods, spending bars, a budget-limit line, expense category breakdowns and related transactions.
- Cash Flow details show ranked inflow/outflow categories before drilling down to their transactions.
- Recurring entries: daily, weekdays, weekly, fortnightly, four-weekly, monthly, every 2/3/6 months and yearly.
- CSV exports, complete JSON backup/restore, System, Light, Dark, Colourful, Cheerful and Pastel appearance options.
- Home-screen installation and offline use after the first successful visit.

## Host on GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **main** and **/ (root)**, then **Save**.
4. Once GitHub finishes publishing, open https://goatedapps.github.io/Expense-tracker/.

All paths are relative, so the app works under a GitHub Pages repository path. No GitHub Actions workflow is needed.

## Local preview

From the project directory, run `python3 -m http.server 8000`, then open http://localhost:8000. Use a web server rather than opening the HTML as a file, because JavaScript modules require HTTP(S).

## Transaction entry

The white-and-blue transaction sheet fits a phone screen. Choose a category, then use the calculator keypad in the same area. Tap the category name to choose another category. Labels scroll horizontally. The three-dot menu contains exclusion and deletion options. Arithmetic is evaluated when saving, or by tapping the equals button next to the amount.

## Phone installation

On iPhone: open in Safari, tap Share, then **Add to Home Screen**. On Android: use the browser's **Install app** or **Add to Home screen** option. Visit online once before using offline. In some browsers, installing creates a separate storage context; restore a JSON backup if your records do not carry over.

## Data and backups

Records are stored in `localStorage` under `everyday-sgd-v1`. No financial records are transmitted to GitHub or another server. Data is specific to your browser, device and site origin; it does not sync automatically. Clearing site data can erase it. Download a JSON backup regularly and before moving to another device or site address. Browser storage is not encrypted by this app.

CSV exports use `Date,Wallet,Type,Category name,Amount,Currency,Note,Labels`, matching the supplied source-app export without Author. Wallet is blank, expenses are negative, income is positive, and amounts use eight decimal places. Original imported timestamps are preserved; entries with only a date export Singapore midnight as a UTC timestamp. CSV exports are for spreadsheets; JSON backups include transactions, categories, labels, budgets, recurring rules and settings. Restoring a backup replaces current records. The app validates imports and preserves unreadable saved data rather than overwriting it.

Amounts use integer cents. Daily, weekly and bi-weekly budgets repeat from the selected start date. Monthly and yearly budgets follow calendar months and calendar years, with the first period beginning on the chosen start date. Limits apply per period without prorating the first period. Existing budgets without a frequency default to monthly. Budget screens navigate by month; cards show the active period for the current month or the latest period intersecting a past month. Detail charts show complete periods intersecting the month, including cross-month dates, and allow selecting a different period. Excluded transactions stay in history/exports but do not contribute to cash flow, charts or budgets. Future transactions are shown as scheduled until their dates arrive. Home totals, history and charts follow the selected month or year; setting a custom date range overrides that selection for history and its CSV export.

Recurring transactions are processed when the app opens or resumes, including missed due dates. A monthly rule anchored on the 31st uses the last day in shorter months, then returns to the 31st. Weekday rules skip weekends (not public holidays). Editing an occurrence affects only that transaction; edit the rule under Settings to change future entries. Pausing prevents generation; resuming catches up missed occurrences. Deleting a generated occurrence does not regenerate it. Removing a rule keeps its recorded transactions.

## Updating

Edit the files directly and commit to `main`. GitHub Pages will republish. Increment the cache name in `sw.js` when changing cached assets. Installed clients receive the new service worker after the old app windows close and reopen.

## Verification

The implementation was checked with automated model tests and browser flows for transaction entry/edit/delete, calculator, filters, budgets, recurring dates, labels/categories, backups, CSV downloads, persistence, phone layouts and offline loading.

Appearance is saved on this device and included in JSON backups. Existing System/Light/Dark preferences are preserved. Light retains the white-and-blue palette; System follows the device’s light/dark preference.

Siri/Shortcuts voice entry can prefill a transaction for confirmation. See [the iPhone setup guide](SHORTCUTS.md). Settings includes a paste-link fallback for Home Screen apps when iOS opens a Shortcut link in Safari.

In Settings, **Open ‘Add transaction’ by default** opens a new transaction on launch and when returning to the app, without replacing an entry already being edited. It is off by default and included in JSON backups. Voice links take priority over a blank entry on launch. Closing or saving an entry returns to the app normally; navigating between tabs does not reopen it.
