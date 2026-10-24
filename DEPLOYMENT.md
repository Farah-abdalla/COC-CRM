# COC CRM hosting

Published URL: https://coc-optical-crm.cleverflute24.chatgpt.site
Access: owner-private (Sites sign-in).
Site project ID: appgprj_6adcdee1cdec8191812f832f0c196b6a
Deployment ID: appgdep_6adcdf57148c819193c169b42496a700
Saved version ID: appgprj_6adcdee1cdec8191812f832f0c196b6a~appgver_ecd47335024081919813024cc220c0ca
Published source commit: 6c1ba40e77effeb2f21673076bdc528837a59ab2

The publishing checkout is sites/coc-crm, with its own Git repository and .openai/hosting.json. Reuse the existing Site for updates. Sync application changes from this folder into that checkout, then follow the Sites skill to test, build, push, package, and deploy. Do not copy node_modules, local browser records, archives, or credentials.

This is a static browser-local app. Hosting does not upload existing localhost data or synchronize records between users, browsers, or branches. Images and saved records stay in each browser's localStorage. The demo login is not server authentication; Sites controls access to the hosted version. Shared branch records require a backend/database and proper user authorization.
