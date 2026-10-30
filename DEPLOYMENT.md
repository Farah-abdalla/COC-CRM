# COC CRM hosting

Primary client URL: https://coc-optical-crm.cleverflute24.chatgpt.site
Provider: ChatGPT Sites
Owner: DRAGON (media.dragon8@gmail.com)
Site project ID: appgprj_6adcdee1cdec8191812f832f0c196b6a
Production version: 4
Source commit: 8ef6dad862df518fa088acc12416ff505faef650
Latest production deployment ID: appgdep_6ae0ee5a096c81919326e93bebdb3649
Deployment state: succeeded
Runtime environment revision: 2

Publishing source: sites/coc-crm. Preserve its Vinext framework files and D1 binding DB. Do not publish the parent static dist folder to this Site.

The latest local CRM UI is now hosted with durable shared company storage. Hosted sign-in uses ChatGPT; the imported owner maps to DRAGON. Administrators add staff using their exact ChatGPT email in Accounts & permissions. Staff access requires an active assigned account; branch/page/action permissions are enforced by the server. Passwords and local sessions were not uploaded. The local email/password backend remains unchanged.

Transferred local revision: 19
Imported staff assignments: 2
Verified snapshot SHA-256: fb59b66a1252cdcf190afdf9f13447657856e1c4f913c6229b54395c48ac363c
Record counts: {"customers":27,"orders":5,"exams":3,"branches":5,"invoices":27,"creditNotes":1,"invoiceEvents":33,"salesRecords":2,"inventoryItems":1,"vendorTransactions":4,"transfers":1,"treasuryBalances":18,"expenses":3,"commissionRules":3,"tasks":1}

The local SQLite database was preserved and backed up with SQLite's consistent online backup API:
C:\Users\j\Desktop\opticare-crm\.local\backups\online-transfer-2026-10-27T18-32-37-167Z.sqlite
Records-only backup:
C:\Users\j\Desktop\opticare-crm\.local\backups\online-records-2026-10-27T18-32-37-167Z.json

The transferred online snapshot checksum matched the local copy exactly. Existing hosted per-user crm_snapshots rows remain untouched; the latest version uses separate crm_company, crm_company_staff and crm_company_audit tables. Applied migration history is immutable.

Online and local databases are separate after this one-time copy. Subsequent online saves persist across devices for assigned company staff; subsequent local edits do not automatically synchronize online. Download backup remains available in Data storage.

The one-time transfer secret CRM_IMPORT_TOKEN was removed after verification, and the saved version was redeployed with environment revision 2. Re-import cannot replace initialized company records. Runtime Odoo settings are configured as server-only secrets.

Validation: parent 77 tests passed; hosted 57 tests passed; production build passed; built Worker with real local D1 passed authenticated load, save/reload, stale-write rejection, anonymous rejection, unassigned-email rejection, and rendered-page HTTP checks. Browser visual QA was unavailable because the Windows automation sandbox could not start.

Alternate old static Netlify URL: https://stunning-shortbread-7fa8d3.netlify.app
This alternate URL was not updated.

