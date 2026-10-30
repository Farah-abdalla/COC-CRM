# HR System in COC-CRM

The former HR landing page now connects to the existing local account server and SQLite company database. It does not create another application, authentication system, branch list, or browser record store. Existing COC/Lensko selection still changes branding over the same company records, including HR; it is not tenant separation.

## Setup

1. Start the existing project with `npm run dev` (Node.js with `node:sqlite`, as already required by the account server). Restart an older running server after updating the code.
2. Sign in as an existing CRM administrator. The additive startup migration creates `hr_state`, `hr_files`, and `staff_users.hr_role`. It does not replace `company_data` or existing staff/session records.
3. In **Accounts & permissions**, assign an HR role to existing accounts. Link those accounts to employee profiles in **HR System → Employees**. Account branch access must include the employee branch.
4. Configure departments, managers, job titles, leave types, work days, shift start, and employee allowances. Branch management uses the existing CRM Branches page. Department manager selection supplies the initial manager when assigning an employee to a department; changing a department manager does not silently rewrite existing employee assignments.
5. Review the initial configurable policy: annual leave 21 days, sick leave 15 days, unpaid leave unlimited. These are editable software defaults, not a determination of your company's entitlements. Per-employee allowances override type defaults. Scheduled work days default to Sunday–Thursday.

No production employees, attendance, leave, assets or documents are seeded. Dashboard numbers are calculated from permitted stored records.

## Permissions

| Role | Access |
| --- | --- |
| CRM administrator / owner | Full HR access as well as existing CRM permissions. |
| HR administrator | Full HR administration across all branches, including salary and confidential documents; grants no additional Inventory, Sales, accounts, or other CRM permissions. |
| HR manager | Assigned direct reports within the account's permitted branches, plus their own linked profile. Can decide reports' leave; cannot administer employees, assets or documents, or read reports' salaries, addresses, emergency contacts, contract notes or confidential files. |
| Employee self-service | Own linked profile, salary, documents, leave, attendance and currently assigned assets only. Can request leave, check in/out and mark notifications read. |

Existing accounts with HR System view permission retain employee self-service; a legacy task manager with that permission receives manager access unless an explicit HR employee role overrides it. The dedicated HR role, not the general page add/edit checkboxes, controls HR mutations. Only existing CRM administrators can grant or revoke HR roles. Account changes revoke existing sessions as before.

Employees cannot approve their own leave. Request creators cannot decide requests they submitted on another person's behalf; a different HR administrator or the employee's assigned manager must decide them. All mutation permissions, parent references, branch scope, unique IDs and revision checks are enforced by the API. Confidential documents are available to HR administrators and the document's employee, not managers. Download URLs recheck the current session and document visibility for every request; archived files cannot be downloaded.

Deactivating an employee preserves their HR history and blocks new leave and check-ins. It does **not** disable their CRM account; use the existing account Active setting to revoke CRM access. An already open shift can still be checked out.

## Attendance, leave, and reports

Self-service check-in/out uses the server clock and Cairo dates. Only one attendance record per employee per Cairo day and one open shift are allowed. HR administrators can correct timestamps with a mandatory reason; timestamps must include a timezone and cannot be in the future. Open shifts accumulate working time until checkout. The report attributes an overnight shift to its check-in day. Shift start is stored on attendance records to retain historical lateness.

Daily and monthly reports show presence, absence, late days and working hours and can export CSV. Absence derives from hire/end dates, scheduled work days, check-ins, and approved leave; today's absence is counted after shift start. Past absence reconstruction uses the employee's current work-day schedule. There is no historical roster, public-holiday calendar, overtime/payroll engine, geolocation, or biometric/device integration.

Leave requests count scheduled work days, reserve balances while pending, reject overlaps, and split usage across calendar years. Charged dates are frozen on the request, so changing an employee's schedule does not change that leave's past usage. Approval rechecks changed allowances. Rejection releases the reservation. The calendar shows pending and approved date ranges. This version uses annual allowances without accrual, proration, carryover or half-day calculations.

## Documents, assets, notifications, and storage

Employee photos reuse the existing image preparation helper, with an additional 300,000-character saved-image limit. Employee documents accept PDF, JPEG and PNG with MIME/signature checks, up to **750 KB per file**. Binaries are stored in `hr_files`; metadata and HR records are in `hr_state` in the **same `.local/company.sqlite` database**. Document downloads use attachment and no-store headers. Archiving retains the original database file for history. The HR metadata limit is 15 MB, separate from the existing 1.8 MB CRM snapshot limit. Files are not stored in browser localStorage.

Assets have unique tags, serial numbers, conditions, statuses, assignment and return dates, expected return dates, and assignment histories. Optional inventory references reuse existing inventory item IDs. Assigning or returning an HR asset does not change optical inventory quantities or transfers. HR administrators can maintain asset records; employees/managers see assets assigned to their permitted employees.

Leave request, approval and rejection events generate persistent, recipient-specific in-app notifications. Contract and visible document expiration alerts include expired records and records due within 30 days. They also appear in the existing CRM notification bell. HR refreshes on window focus and every 60 seconds while signed in. There is no background email, SMS, browser push or external notification service.

**Backup:** the existing Data storage JSON download covers CRM snapshot records only; it does not include HR tables or uploaded employee files. Back up the entire SQLite database using SQLite's consistent backup API, including HR tables. Do not rely on copying a live WAL database file alone. The current local database is not encrypted at rest; server permissions do not replace filesystem access controls. Browser preferences and branding selection are not HR storage.

## API and deployment

- `GET /api/hr` returns only permitted HR records, supporting configuration, alerts and the current HR revision.
- `POST /api/hr` applies an allowlisted action with `{revision, action, record}`, validates it in a transaction, and records the actor in the existing staff audit table.
- `GET /api/hr/documents/:id` streams an authorized private attachment.
- HR has its own revision counter so HR saves do not overwrite CRM records or interfere with pending CRM snapshot saves. Stale HR mutations return 409 and require reloading before retrying.
- Removing or renaming a CRM branch with HR employees is rejected until those employees are reassigned.

This upgrade targets the **parent local React/Vite + SQLite application**. `npm run preview` also uses that account server. The separate hosted source under `sites/coc-crm` uses its own D1/ChatGPT-auth backend and database; it was not changed or published. Hosting this upgrade there requires porting the HR routes, role mapping, additive tables/migrations and protected file handling to that backend, then running its tests and deploying it. Local and hosted records do not automatically synchronize. A static `dist` upload alone cannot provide the HR APIs.

## Verification

Run `npm test` and `npm run build`. HR API tests use isolated in-memory or temporary SQLite databases, including persistence after reopening and unchanged existing CRM snapshots and inventory quantities. Calculation tests cover dates, year boundaries, pending/rejected leave, late starts, overnight hours, days off, absences and expirations. The browser test uses an installed Chrome or Edge executable, a temporary profile and an in-memory instance of the existing HTTP middleware; it is skipped when neither browser is installed. `HR_TEST_BROWSER` can specify an installed Chromium executable. Browser screenshots are written to `artifacts/hr-desktop.png` and `artifacts/hr-mobile.png`. Test fixtures never replace real company records.

## Changed files

- `src/App.jsx`: HR page, shared API hook and existing notification-bell integration.
- `src/HRSystem.jsx`, `src/hr.css`: HR sections, forms, profile views, search/filtering, reports/CSV, calendar, loading/error/success states and responsive styling.
- `src/hrData.js`, `src/hrData.test.js`: HR calculations and tests.
- `src/accessControl.js`, `src/AccountManagement.jsx`: HR navigation access and account role management.
- `src/locales/ar.js`: Arabic HR labels.
- `server/accounts.mjs`: additive role migration and authenticated HR routing.
- `server/hr.mjs`, `server/hr.test.mjs`: transactional HR API, private files and integration tests.
- `server/http.mjs`: preserve binary attachment bytes instead of converting them to text.
- `server/hr-ui.test.mjs`: real-browser HR and existing-screen smoke checks.
- `README.md`, `HR.md`: setup, scope, policies, limitations and validation.
- `dist/index.html` and generated `dist/assets/*`: rebuilt production output.

Unrelated preexisting working-tree changes were retained. No new dependencies or external credentials are required for the local implementation.

## Location-based attendance and account linking

The workflow is existing CRM account login, Check In with automatic browser location capture, and Check Out with a fresh location capture. Attendance has no passkey registration, fingerprint requirement, WebAuthn call, or extra account-password prompt. The existing account session, CSRF checks and HR role permissions remain in force.

### Link an existing account to an existing employee

An HR administrator opens Attendance / HR System, selects Employees, and clicks Link account on the correct employee ID. Select the existing account by its email and save. This updates the existing employee.userId relationship; it does not create an employee or match display names. The full employee editor also uses this same link validator.

The backend checks that the account is active, has access to the employee branch, and is not already linked to another employee. Only HR administrators or CRM administrators can change a link. An employee cannot be their own manager, and an open shift must be closed before changing its account link. Staff cannot link themselves or clock attendance on another employee's behalf. An account with no linked employee receives a clear setup message and can refresh the link after an administrator saves it.

### Attendance records and history

Check In and Check Out each call navigator.geolocation.getCurrentPosition with maximumAge 0, high accuracy requested, and a 15-second acquisition timeout. Coordinates and accuracy must be valid. Denied, unavailable, expired or failed location capture does not save attendance. No address, branch location, manual coordinate input or IP fallback replaces captured coordinates.

The existing SQLite HR state stores the authenticated user and linked employee IDs, employee name/code snapshot, Cairo business date, server check-in/check-out timestamps and locations, status and totalWorkingMinutes. The client cannot select attendance identity, time, date or duration. Only one open session is allowed; checkout updates that same row. Duration is (checkOut - checkIn) / 60000 using actual timestamps, including overnight sessions; negative or invalid durations are rejected. The UI displays hours and minutes.

Attendance History shows nine columns: Employee Name, Employee ID, Check-in Location, Attendance Date, Check-in Time, Check-out Location, Check-out Time, Total Working Time, and Attendance Status. In Progress remains active until checkout; completed sessions show Completed. History uses saved backend records across all dates, independently of report-date filters, with existing HR and employee visibility rules. My account uses the same table for the employee's records. A successful save immediately applies the returned server state; reloads read the persisted data again. Administrator corrections remain explicitly authorized and labelled.

### Configuration

Use HTTPS in production, or localhost for development, and allow browser/OS location access. Attendance requires the existing authenticated backend and SQLite database; publishing static dist files alone does not provide that backend. The existing local HTTP adapter accepts localhost only and must be deployed appropriately behind HTTPS for production. No passkey environment settings, device enrollment or new external service credentials are required. No reverse-geocoding provider is configured, so history displays latitude and longitude. Old attendance and unused historical authentication metadata are preserved; the removed WebAuthn endpoints cannot be used.

### Validation

Tests cover existing account authentication, HR permissions, linking by stable IDs, duplicate and out-of-branch link rejection, open-shift link protection, browser geolocation failures/retry, server-owned identity/timestamps, concurrent duplicate prevention, overnight duration, persistent records after SQLite restart, immediate table updates and a browser without WebAuthn support.
