# Everyday · SGD Expense Tracker

A phone-first expense tracker built with HTML, CSS and vanilla JavaScript. No framework, build step, backend or login. Dictation uses the browser’s built-in speech recognition.

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

Siri/Shortcuts voice entry can prefill a transaction for confirmation. See [the iPhone setup guide](SHORTCUTS.md). The app’s built-in microphone offers direct transaction dictation; Settings no longer includes a paste-link screen.

In Settings, **Open ‘Add transaction’ by default** has three radio options: **None** opens the normal app view, **Manual** opens a new transaction, and **Dictation** opens a new transaction and immediately attempts browser speech recognition. The preference applies on launch and when returning to the app, without replacing an entry already being edited. If the browser requires a user gesture or permission before listening, the entry remains open with a message to tap the microphone. None is the default. Existing enabled preferences migrate to Manual; existing disabled preferences migrate to None. The choice is included in JSON backups. Voice links take priority over a blank entry on launch. Closing or saving an entry returns to the app normally; navigating between tabs does not reopen it.

An optional Capacitor Android APK wraps the same app without replacing the GitHub Pages version. See [Android installation, transfer and build instructions](ANDROID.md). Browser data and Android data are separate; transfer records with a JSON backup. `npm run android:build` generates the release APK for signing.

## Dictate a transaction in the web app

On Add transaction, tap the microphone, wait for **“Listening”**, then say **“Groceries fifteen dollars”** or **“fifteen dollars Groceries”**. Transactions default to **expense**; say **“Income”** explicitly for income, such as **“Salary five thousand Income”** or **“Income five thousand Salary”**. The words “Add” and “Expense” are optional. A category can appear before or after the amount. Use a full active category name or its first word: “Family” can match “Family and Personal”, and “Personal” can match “Personal Care”. Exact category names take priority; a shorthand matching multiple categories stays unsaved for review. The currently selected date is used (today by default); existing notes and labels are kept.

Amounts can be numbers or words: **“eleven dollars and twenty”**, **“eleven dollars and twenty cents”** and **“eleven dollars twenty”** all mean $11.20. **“60 cents”**, **“sixty cents”**, **“$0.60”** and **“.60”** mean $0.60. These formats apply to browser dictation.

A valid single command automatically saves the transaction and shows its amount/category/type with **Undo** at the centre of the screen for 2 seconds. Low-confidence speech, unclear amounts, unknown/archived categories or multiple commands stay unsaved for correction. Selected recurrence/exclusion options also require the normal Save tap. Only final recognition results are processed, once per listening session. Closing the editor, editing a field or leaving the app cancels listening; late results cannot save a transaction. Dictation is available for new entries; existing entries retain their usual editing flow.

Dictation uses SpeechRecognition/webkitSpeechRecognition with English (Singapore). No engine selector, model download, API key or app backend is needed. Your browser may send the spoken phrase to its speech provider and may require Internet access. Complete, valid final commands are processed immediately without waiting for the recognition session to end.

Allow microphone and speech access when asked. Browser support depends on the device and iOS version. Manual entry remains available when recognition cannot start. The latest default-entry and settings changes received static code review and JavaScript syntax checks only; live dictation testing is left to the user.

Speech startup shows “Starting microphone” until the browser reports readiness. A retry waits for the previous recognition session to end, with an 800 ms fallback for browsers that omit the end event. If startup never reports readiness, the app offers retry after 5 seconds. Listening has a 20-second limit; manually stopping allows 6 seconds for final results. Heard interim text is preserved as a draft if recognition ends or stalls without a final result, and always requires manual confirmation. Cancelled sessions cannot create transactions. These lifecycle changes received static review and syntax checks; intermittent device/browser speech-service failures still need observation on the phone.
