# COC CRM hosting

Primary client URL: https://coc-optical-crm.cleverflute24.chatgpt.site
Provider: ChatGPT Sites.
Access: public app; online records require ChatGPT sign-in and are private to each account.
Sites project ID: appgprj_6adcdee1cdec8191812f832f0c196b6a
Production version: 3
Source commit: 97a19d3aa38bc07a5a16ea7155dd22a15dd4a5bc
Latest production deployment ID: appgdep_6add516ba2c88191b46c8f98ed561cd2
Deployment state: succeeded.

The user selected ChatGPT online hosting and requested both browser and online data saving.

IMPORTANT: The publishing source is now the full-stack checkout at sites/coc-crm. Its manifest declares d1: DB and does not declare static hosting. Preserve its framework package files, app/, worker/, scripts/, db/, drizzle/, and Vite integration. Update src/ from the parent project as needed; do not replace its package.json with the parent static Vite package or publish the parent dist folder to this Site.

The parent src/ retains the same CRM UI and browser-saving behavior. Online endpoints are implemented in sites/coc-crm/app/api/crm-data/route.ts and app/storage-service.mjs.

Data storage behavior:
- In this browser: keeps existing opticrm_ records and automatically saves on this device.
- Online: sign in with ChatGPT, then load existing online records or choose Copy current records online for the first account copy.
- Online records are private per ChatGPT account and available across devices using that account.
- Browser and online copies stay separate; switching does not overwrite the other copy.
- Online edits autosave within five seconds, with clean devices refreshing every fifteen seconds and on focus.
- Unsaved edits use a device recovery cache. Revision checks prevent stale writes and account-change checks prevent saves to a different signed-in account.
- Download backup exports records, images, and inventory matrices as JSON.
- Online snapshots have a 1.8 MB limit including existing inline exam images.
- The existing email/password demo login is separate from real ChatGPT authentication for online storage.

Validation: 12 automated tests passed; production build passed; a running local D1 preview passed authenticated save/reload, matrix persistence, anonymous rejection, and stale-write checks. Browser visual QA was unavailable because the Windows automation sandbox failed to start.

Use the Sites skill's source workflow to synchronize, package, save, and deploy this existing project. Never edit applied drizzle migrations.

Alternate Netlify URL: https://stunning-shortbread-7fa8d3.netlify.app
Netlify remains the earlier browser-only static version and was not updated for online storage.
Netlify site ID: 424d37d5-f829-45df-9109-62bc24b1ad47
Credentials are managed by their respective tools; do not print or copy them.
