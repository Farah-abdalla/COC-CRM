# HR System

The existing HR page now supports employee profiles, attendance, leave approvals, private documents, company assets, and HR roles using the existing local account server and SQLite database. See [HR.md](HR.md) for setup, permissions, backup requirements, verification, and separate hosted-backend requirements.

# Odoo live data

Administrators can open **Odoo** in the local CRM to browse read-only Odoo data. See [ODOO.md](ODOO.md) for configuration and usage.

# Local staff accounts

The local CRM now uses email/password accounts and shared server records. See [ACCOUNTS.md](ACCOUNTS.md) for setup, permissions, data migration, and the distinction from the existing hosted version. The older demo notes below describe the previous browser-only version.

# COC CRM — starter project

A React + Vite demo for managing an optical store's customers, orders/warranties, eye exams, and branches.

## Run locally
1. Install Node.js (LTS recommended).
2. Extract the ZIP and open this folder in VS Code.
3. Open a terminal in this folder and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL Vite prints, usually `http://localhost:5173`.

## Included
- Responsive dashboard and navigation
- Demo login screen
- Add/edit/delete customer profiles
- Search customers by name, phone, email, or branch
- Orders with purchase and warranty dates
- Eye exam records linked to customers
- Branch list and adding branches
- Data persistence in this browser via localStorage

## Important limitations
- Login is only a demo; any non-empty email and password works. It is NOT secure authentication.
- Data is stored in this browser on this device, not shared across branches or users.
- Do not enter real customer or prescription information into this demo.
- Before real deployment, connect a backend/database, implement real authentication and server-side authorization/branch permissions, audit logging, backups, validation, and privacy controls. Security-test it before entering real data.
- This is an independent demo inspired by common CRM workflows, not Zoho's software or source code.

## Inventory matrices (added October 2026)
- The four Inventory categories now contain the reference quantity grids from the four supplied images.
- The row and column headers represent the measurements in the source pictures; the intersection stores the stock quantity.
- Click a cell to edit its quantity. Edits are saved automatically in the same browser (localStorage key `opticrm_inventoryMatrices`). Original photographed values are in `src/inventoryData.js` and remain unchanged.
- A dash in the picture is represented by a blank (null) cell; it is not automatically counted as a stock quantity.
- Category cards show matrix totals separately from the original custom stock-item totals. The original Add stock item list is preserved below each matrix.
- Browser-local demo storage is not synchronized between users, browsers, or branches.

Branch inventory is available inside **Inventory**. Branch cards and filters show CRM stock items plus received transfers. Outgoing item transfers reduce source quantities; removing a transfer restores the source and destination totals. Inventory summaries are restricted to the account's permitted branches. Central Vegas lens matrices remain in the category cards below. These totals use CRM records, not an Odoo stock synchronization.


Inventory has separate **Frames inventory** and **Glasses inventory** tabs. Frames inventory opens by default and shows only the Frames category, with frame-model/SKU search, branch quantities, an Add frame action, and editing of opening stock records. Glasses inventory retains lens transfers, SPH/CYL, and the existing central Vegas lens matrices. Select Frames in Transfers to transfer frame stock items.

