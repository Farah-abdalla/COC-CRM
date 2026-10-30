# Attendance update: existing login and automatic location

## Implemented workflow

Existing CRM account login -> Check In -> browser location capture and server-generated time -> Check Out -> new browser location capture and server-generated time -> saved duration in minutes, displayed as hours and minutes.

Attendance no longer uses passkey registration, WebAuthn, fingerprint checks, biometric verification, or an extra password prompt. The normal account/session authentication, password handling, request-origin checks and existing HR permissions are preserved.

## Account-to-employee relationship

The existing employee.userId relationship is retained. HR administrators can now open Attendance / HR System -> Employees -> Link account on the correct existing employee ID, select the existing account by email, and save.

The link action updates the existing profile rather than creating a new employee. The existing full employee editor and focused link action share backend validation. They reject nonexistent/inactive accounts, accounts outside the employee branch, duplicate account links, self-management, and account-link changes while an attendance shift is open. Staff cannot change their own link. Names alone are never used to infer a link.

An unlinked employee sees clear administrator instructions and a Refresh account link button. The correct production link must still be selected by an authorized HR administrator; this change does not guess a person's identity or seed employees.

## Attendance and history

- The browser requests a fresh device location for each Check In and Check Out. No manual branch/address/coordinate input is required.
- Denied, unavailable, timed-out, invalid or stale location capture does not create a successful attendance entry. The employee can retry.
- The backend derives employee/account identity, Cairo date, timestamps and duration. Client-supplied identity and time fields cannot replace them.
- A transaction prevents duplicate open sessions and duplicate/no-session checkout.
- Check Out updates the same open record, stores both locations, calculates totalWorkingMinutes = (checkOut - checkIn) / 60000, and sets completed status. Open sessions remain in_progress.
- Duration uses actual timestamps and supports midnight crossings; the display uses hours and minutes.
- History contains nine columns: Employee Name, Employee ID, Check-in Location, Attendance Date, Check-in Time, Check-out Location, Check-out Time, Total Working Time, Attendance Status.
- The existing shared HR hook applies the successful backend response immediately, and reloads load saved records from SQLite.
- Historical records are retained. Missing historical location is labelled Not recorded rather than invented.

## Files changed

UI:
- src/AttendancePanel.jsx
- src/attendanceLocation.js (location capture extracted from the removed WebAuthn helper)
- src/AttendanceHistory.jsx
- src/HRSystem.jsx
- src/hr.css
- src/locales/ar.js

Backend and configuration:
- server/hr.mjs
- server/accounts.mjs
- server/http.mjs
- vite.config.js
- package.json
- package-lock.json
- .env.example
- HR.md

Tests:
- server/attendance.test.mjs
- src/attendanceLocation.test.js
- server/hr.test.mjs
- server/hr-ui.test.mjs

Removed:
- server/passkeys.mjs
- src/attendanceWebAuthn.js
- server/passkeys.test.mjs
- server/test-support/virtualAuthenticator.mjs
- @simplewebauthn/server and @simplewebauthn/browser dependencies
- WebAuthn environment settings and attendance enrollment styles/labels

Production dist assets were rebuilt. Unused historical authentication database metadata was preserved; no runtime passkey service or attendance WebAuthn endpoint remains.

## Remaining configuration

1. An HR administrator must explicitly link the correct existing employee ID to the account email once.
2. The account must remain active, have Attendance / HR System access, and have access to the employee's branch.
3. Browser and operating-system location permission must be enabled.
4. Use HTTPS in production or localhost for development, with the existing authenticated backend and persistent SQLite storage available. Static dist hosting alone does not provide the backend; the current local HTTP adapter accepts localhost only.
5. No passkey enrollment, WebAuthn origin/RP configuration, geocoding API key or new external service is required. Locations display captured coordinates; optional reverse geocoding is not configured.

## Test results

- npm.cmd test: 140 passed, 0 failed, 0 skipped.
- npm.cmd run build: passed. The existing Vite bundle-size advisory remains.
- Dependency uninstall audit: 0 vulnerabilities reported.

Tests verify normal account login/permissions, linking by stable IDs despite identical display names, rejected duplicate/inactive/out-of-branch links, open-shift link protection, actual coordinate API options, location denial/unavailability/timeout and retry, forged identity/time rejection, server-generated business date, concurrent duplicate prevention, checkout duration, overnight calculations, and persistence after SQLite restart.

The isolated browser test exercises the HR administrator's Link account UI, signs in as the linked employee, and completes location-only attendance with PublicKeyCredential unavailable and credential get/create instrumented to fail if called. It verifies zero WebAuthn calls, no enrollment UI, all nine history columns, immediate updates, persistence after reload and mobile layout. Simulated coordinates are confined to test fixtures; no test attendance was inserted into the live company database.
