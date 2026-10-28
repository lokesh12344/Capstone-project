# SmartOps mobile — UX fix list

Audit of `SmartOps/` screens and navigation (2026-10-28). Ordered by impact.

## P0 — users get stuck / can't find it

- [x] **Customers screen is buried.** `CustomerDirectoryScreen` exists, but the only way in is an unlabeled icon in the Khata header (`KhataScreen.js:104`). Make it visible: add a "Customers" row in Profile, a Home quick action, and/or a labeled button in Khata.
- [x] **"No phone number" dead end.** `sendKhataReminder` (`share.js:72`) just shows an alert saying "Add a phone number" without saying where. Use an alert button ("Add number") that opens an inline phone prompt or goes to Customers with that customer open.
- [x] **WhatsApp bill with no phone.** In Records, "WhatsApp bill" (`OrderHistoryScreen.js:328`) opens `wa.me/?text=` with no recipient for walk-in or no-phone customers. Ask for a number first, or hide/relabel the button ("Share via WhatsApp…").
- [x] **Post-sale WhatsApp option is missing silently.** After a cash or UPI sale to a customer with no phone, the "WhatsApp bill" option just doesn't appear (`NewOrderScreen.js:241`). Offer "Add phone & send".
- [x] **Login on every app launch.** `App.js` starts with `authed = false` and never restores the cached session/token, so the shopkeeper has to log in again every time. Restore it on startup.

## P1 — missing everyday actions

- [x] **No customer details in Khata.** You can't edit a customer's phone from the ledger modal, and you can't call them (`tel:` link) from there either.
- [x] **No way to delete or merge customers.** *(Done: remove/restore plus a duplicate warning. Merge is not built, because orders and khata entries are immutable on the server.)* Duplicates get created easily, because "+ Add X as new customer" in New Order doesn't warn when a similar name already exists.
- [x] **No void or return for a sale.** A wrong bill can't be corrected. Stock and khata stay wrong.
- [x] **No delete or archive for products or suppliers.** Discontinued items stay in Inventory, Alerts and Reorder for good.
- [x] **Customer phone isn't shown in New Order search results.** Only the address is shown (`NewOrderScreen.js:370`), which makes two customers with the same name ambiguous.
- [x] **Customer phone validation is only `maxLength=10`.** It accepts 3 digits. The credit flow requires 10, but the directory doesn't.

## P2 — feedback and polish

- [x] **"Sync now" gives no feedback.** It shows no success or error message and no "last synced" time (`ProfileScreen.js:22`). Errors are swallowed in `syncEngine.js:188`.
- [x] **No offline/pending-changes indicator** anywhere in the app.
- [x] **Header actions are icon-only** (Inventory: Alerts / Reorder / Register; Khata: Customers). Add labels or a long-press tooltip; first-time users won't guess them.
- [x] **Khata only lists people who owe money.** There's no way to view the history of a settled customer from that tab.
- [x] **Purchase orders live under Profile → Suppliers.** That's an odd place for a daily task. Consider an Inventory entry point.
- [x] **Logout does a sync first.** If it fails offline, there's no warning that unsynced data may be lost.

## Follow-ups / known limits

- [ ] **Merge duplicate customers.** This needs a server-side reassign of `sale_orders.customer_id` and `ledger_entries.customer_id`, which are both immutable on the server today.
- [ ] **Reorder velocity still counts voided sales.** The `sale` stock transactions stay, and a `return` is added. Backend `analyticsController` sales_7d/30d should net out returns.
- [ ] **Backend tests weren't run locally** (no `TEST_DATABASE_URL`). CI will run them on push.
