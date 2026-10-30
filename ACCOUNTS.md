# Local CRM accounts

Start with Node.js 24 or newer:

    npm install
    npm run dev

Open http://localhost:5173. On the first visit, create the owner account with your own email and a password of at least 12 characters. There are no default credentials.

In Accounts & permissions, add staff accounts, choose their pages and view/add/edit/delete permissions, and assign all branches or selected branches. Administrators have full access. Accounts can be disabled and passwords reset; changing an account revokes its existing sessions. My account lets each person change their own password.

The local server stores accounts, sessions, audit entries, and shared records in .local/company.sqlite (including SQLite WAL files while running). Keep this folder private, preserve it during updates, and back it up while the server is stopped. It is excluded from Git and blocked from Vite file serving. Deleting it deletes the local accounts and company database. Passwords are hashed using scrypt and sessions use HttpOnly cookies.

The original browser records are preserved. The owner can use Data storage > Import old browser records to copy them into company storage. Download a company backup before replacing existing records. Browser backups do not contain account credentials.

Changes save within five seconds. Concurrent edits are protected by revision checks; if another user saved first, download your unsaved backup and reload company records. Unsaved edits stay in memory and trigger a leave-page warning. They are not copied into browser storage on shared devices.

Branch-restricted accounts cannot read central matrices or unassigned records. Customer names require Customers view. Incentive shares invoice records; Vendor Statement shares procurement records; Inventory and Check Before Order include transfer records for stock deductions. These relationships are explained in the permissions editor.

HR System currently contains a landing page. Its account access can be configured now; HR workflows have not been implemented.

This account backend runs on this computer's local server. It is not included in the existing ChatGPT Sites deployment. Do not copy this parent src into that hosted checkout without first migrating its backend to support these sessions and shared permissions. Existing hosted per-ChatGPT-account records are unchanged. Static hosting of dist alone does not run this account API.

Validation:

    npm test
    npm run build

npm run preview serves the built UI and local account API at http://localhost:4173. Keep using the same origin to access legacy browser records (localStorage is origin-specific).

Treasury cards show saved EGP amounts for Cash, Bank, Instapay, Wallet, Purchases, and Expenses per branch. Click a section to set its amount (Treasury add permission) or update an existing amount (Treasury edit permission). Amounts are entered manually and stored as integer piastres; they are not derived from invoice payments or a transaction ledger.

Payments lists Record Payment events from Invoice List automatically, including payment method and reference. Existing legacy payment events remain readable. Amounts entered directly in an invoice Paid field are included as undated direct payments; negative adjustments reconcile later changes to the Paid amount. Payments permission grants read access to invoices and their payment history within the assigned branches, without granting edit access or the Invoice List page. Expenses has a New expense form, expense list, and total by branch.

New expense captures date, branch, positive amount in EGP, category, payment method, payee, description, and receipt reference. Expenses are saved to shared company records. View/add/edit/delete permissions are separate and branch restrictions apply on the server. Expense records are separate from manually set Treasury amounts.

Incentive includes Admin-only commission settings. Administrators can add items matched by exact SKU or keyword, edit the EGP commission, and select/unselect eligible items. Frame and Vegas lens start enabled at EGP 50 each. Each matching enabled rule pays once per invoice; overlapping matches add together. Changes recalculate existing invoice commissions and reports. Staff can view the report when permitted but cannot change rules, even with invoice edit access.

Invoices support multiple SKU rows, quantities, and unit prices. Subtotal and total quantity are calculated from the rows. Legacy invoices remain readable and editable. Printing includes every line; barcodes print separately per line. Item returns select quantities per line and allocate the invoice discount in integer piastres. Commission rules match individual item SKUs and still pay each matching rule once per invoice.

System test examples: Administrators can use Data storage > Load test examples. Examples are marked [TEST] and include linked customers, five invoice/payment states, multi-item invoices, refunds, expenses, exams, procurement, vendor activity, test stock/transfers, and Treasury amounts only for currently empty branch/category slots. Existing records, matrix stock, commission rules, and account credentials are not replaced. Repeated loads skip existing example IDs. The local maintenance command npm run seed:examples loads the same records, creates a pre-load backup in the private .local/backups folder, and records the operation in the audit table.

Treasury is linked to invoice receipts. Cash maps to Cash, Bank/Card/Bank transfer to Bank, Instapay to Instapay, and Wallet to Wallet. Other requires an explicit Treasury account. Saved Treasury amounts are opening balances; current balances add invoice receipts and payment corrections, and subtract credit note refunds. Current balances are derived from records so refreshes cannot post the same receipt twice. New amounts entered in invoice Paid fields create receipt/correction events. Older unitemized paid amounts can be assigned a method when editing the invoice. Existing refunds with one known receipt account use that account; ambiguous old entries stay unassigned and are excluded with a notice. Treasury access grants read access to branch invoice/payment/refund records but never invoice edit permissions. Expenses and purchases remain separate from this invoice-payment linkage.

Language: Use the العربية / English switch on the login screen or workspace header. The selection is remembered in this browser under opticrm_language and synchronized across tabs. Arabic uses right-to-left navigation, forms, tables, and receipts. UI labels and dates/currency are translated; stored record fields, SKU values, permissions, and select option values stay unchanged. Switching language preserves the current form and unsaved edits.

Tasks: Administrators can mark a non-administrator account as Manager in Accounts & permissions. Administrators and managers can add tasks and select active employee accounts by name. Managers assign and view tasks within their assigned branches. Employees see only their own tasks. Tasks save with shared company records and backups. Title, employee and branch are required; description and due date are optional.

Task deadlines: The Tasks page labels the existing due date as Deadline. A deadline includes the entire selected day in Africa/Cairo time. Unfinished tasks appear in the assigning user's notification bell and overdue banner after that day; alerts are recalculated every 30 seconds and on window focus. Shared updates refresh on the existing 15-second schedule. Employees can mark their own tasks done; administrators and branch managers can also mark visible tasks done. Completion removes the alert. These are in-app alerts while signed in; no email, push, or background delivery is configured. Existing task dates are preserved.

Task status: Employees use the Status dropdown to mark their own assigned tasks Done; administrators and branch managers can complete visible tasks too. Pending tasks automatically display Missed after their deadline day ends in Cairo time. Missed is calculated from the deadline so it updates across devices without background writes. Missed tasks can still be completed and then display Done. The assigner continues receiving in-app missed-task alerts until completion.

Work-order prescriptions: Select an existing Eye Exam for the customer and branch, or upload a JPG, PNG, or WebP and enter the actual prescription date. Saving creates a linked Eye Exam and keeps the image there; later work-order stage changes do not duplicate it. Replacement uploads preserve the earlier exam history. Work Orders view includes branch Eye Exams; Work Orders add/edit permits creating an exam only through a matching work order. General exam edits retain the existing Eye Exams permissions. Staff with Work Orders or Eye Exams view receive in-app branch reminders after the latest prescription for each customer and branch passes six calendar months, using Cairo dates and month-end clamping. A newer prescription clears the older reminder. Reminders appear in the notification bell and workspace banner while signed in; no external message delivery is configured.

Payments and Treasury actions: Payments has separate edit and delete permissions. Edit changes a payment amount, method, account, reference and date; Remove deletes the receipt and adjusts invoice paid by exactly the same amount. Legacy direct paid entries are supported. Negative payment corrections retain their sign. Changes cannot exceed the invoice total, reduce paid below existing refunds, or alter locked/voided invoices. The dedicated server action checks the acting account, branch, action permission and company revision, and records an audit entry. Pending shared changes must save before the action; other edits are blocked during that request. Treasury edit/delete permissions allow linked payment corrections/removal too. Treasury opening amounts have Edit amount and Remove amount actions; removing an opening amount keeps invoice activity and refunds. Refund rows are managed through Credit Notes. Ordinary invoice-field editing still requires Invoice List permissions. Earlier notes describing Payments as view-only have been superseded by these separate permissions.

Treasury statements: Each branch/account now shows Date, Reference / description, Deposit, Withdrawals and Running balance. Rows run in chronological order. From/To filters include both dates; earlier transactions and undated legacy payments carry into the opening balance. Footer totals show period deposits/withdrawals and closing balance. Opening amounts remain the baseline before the listed activity. Invoice receipts are deposits; corrections, refunds and expenses are signed movements. Expense references include category, description, payee, method and receipt reference. Cash/Bank transfer/Card/Instapay/Wallet expenses debit the corresponding account once. The Expenses section also provides a separate expense-only statement; it is a view of the same costs, not another cash posting. New or edited Other expenses require an explicit Treasury account; existing unassigned entries remain visible in the expense statement but do not affect funding-account balances until assigned. Treasury view now includes expense records for assigned branches; writes still require Expenses permissions. Purchases have no inferred cash withdrawals from vendor bills without confirmed payment routing. Earlier notes saying expenses are separate from account linkage are superseded by these statements.

## Personal staff workspaces

Ordinary staff accounts default to Personal workspace - own records only. Their home shows their sales today and this month, monthly commission and completed attendance hours, their own attendance controls, recent invoices, and assigned tasks. Their navigation uses My sales, My attendance, My commissions and My tasks. Personal scope blocks the company dashboard and administration, even if broad page permissions were accidentally checked.

Sales created by a personal account carry its stable account ID. Existing invoices without an account ID match the linked salesperson name (or the account name) only when that identity is unique among active accounts. Accounts & permissions has a Linked salesperson name field for connecting a staff login to existing invoice salesperson labels. Duplicate legacy names do not expose invoices; administrators can set distinct links or assign stable account IDs. Branch access is still enforced. Customers and invoice journals are restricted to their own sales.

Administrators and managers retain their team workspaces. An administrator can explicitly select Team workspace - assigned branches for an operational staff account that needs broader branch records. New accounts must use their own login credentials; creating an account does not change the administrator's current signed-in session.
