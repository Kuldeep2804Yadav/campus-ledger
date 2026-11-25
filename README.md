# Campus Ledger

Campus Ledger is a college-level expense tracker for students. It uses HTML, CSS, and vanilla JavaScript and displays amounts in Indian rupees.

## Run the project

Extract the ZIP and open `dist/index.html` in a recent version of Chrome, Edge, or Firefox. It comes with sample transactions and budgets so the dashboard has data on the first visit.

You can also run it through a local development server. From the extracted folder, run `python -m http.server 8000 --directory dist` and open `http://localhost:8000`. This gives browser storage a consistent origin.

## Features

1. **Monthly dashboard** — see income, expenses, and the balance for the selected month.
2. **Transaction management** — add, edit, and delete income and expenses. Search descriptions and filter by type or category.
3. **Monthly budgets** — set category limits, see how much remains, and spot overspending.
4. **Visual reports** — compare six months of income and expenses and view a category breakdown.
5. **CSV export** — export the selected month's transactions or the filtered list for use in Excel.

## Source files

| File | Purpose |
| --- | --- |
| `dist/index.html` | App shell, navigation, and transaction forms |
| `dist/styles.css` | Colour palette, layout, charts, and responsive styles |
| `dist/app.js` | Transactions, budgets, reporting, CSV generation, and browser storage |

Transactions store a description, date, type, category, unique ID, and amount in whole paise. Monthly budgets are stored by month and category. The app uses browser local storage, so records persist in the same browser and are specific to the address or local file used to open the app.

## Suggested classroom demo

1. Open the dashboard and review the sample cash flow.
2. Add a ₹150 Food expense. Show how the dashboard and charts update.
3. Set the Food budget below the total spent to show the over-budget state.
4. Filter transactions to Food and export a CSV.
5. Refresh the page to show that the added expense and budget are saved.
