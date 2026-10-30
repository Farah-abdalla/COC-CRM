# Custom reports

Open Reports in the sidebar and click New report to open a separate report-selection page. Select a report type to continue to the Report builder page, where the report name is focused automatically. Use Back to reports to return to the saved-report library. Choose a data source, select columns (including linked customer, invoice, work order or HR fields), add filters, choose grouping and sorting, and select numeric totals. Results update as you change the layout. Preview is paginated; Export CSV downloads all matching rows or group summaries.

Enter a report name and select Save report to store its layout in company records. Reopen it from Saved reports, update it, save a copy, or delete it. Saved layouts contain settings rather than copied results, so opening them runs against current records. Standard company save status, conflict protection, backups and account permissions apply.

Administrators have Reports access automatically. Assign staff Reports view/add/edit/delete rights in Accounts & permissions. Reports never grants access to source modules or branches. Shared layouts can be opened by users with Reports view access, but each user's results follow their own existing source permissions. HR records retain the HR API's role scope and private-field restrictions. Attachments, images, credentials and file contents are excluded.

Sources cover CRM collections, invoice and returned line items, payments, treasury activity, stock matrices and available custom inventory, plus permitted HR collections. External Odoo data appears after invoice import into CRM; this builder does not query arbitrary external Odoo models. Reports does not aggregate administration credentials or account secrets.

Implemented in the local project. The separately hosted source and production site require their normal release workflow to receive this change.

## Sales by branch

Choose New report → Sales by branch. Select All branches or one branch, then Start date and End date. The preset groups invoices by branch and totals gross sales, refunds, net sales, paid and balance in EGP. Dates are inclusive and refer to the invoice date. Voided invoices are excluded; linked refunds reduce the original invoice regardless of refund date. Undated invoices are excluded while date filtering. Save report preserves branch/date filters for reopening; CSV exports the branch summary. Existing invoice and branch permissions apply.

Branch selection supports multiple checked branches, Select all branches, and Clear selection. Each selected branch with matching invoices gets a separate summary row and its own named totals section, plus combined totals. Saving preserves the selected branches and dates. Previously saved single-branch reports remain supported.

## Odoo product tiles

Sunglasses, Eyeglasses and Vegas X6 tiles follow Balance in combined and individual branch totals and CSV summaries. Values are product line sales after invoice discounts, before returns, excluding shipping/adjustments. Only exact linked Odoo products count: category names identify Sunglasses/Eyeglasses; Vegas plus X6 in product/category identifies Vegas X6. No SKU substring guesses are used. Administrators refresh links from the report; successful links persist in company storage for permitted staff. Requests resolve only invoice product IDs or exact names/SKUs and never read costs or modify Odoo. Older imported display names are resolved exactly; ambiguous names are not counted. New imports retain stable Odoo product IDs, preserved while the original item label is unchanged.

Each product square shows its sales amount and Count together. Count is the sum of sold product quantities before returns, using the same exact Odoo links and branch/date filters as the amount. Combined and individual branch squares show their respective counts. CSV includes product-count columns.

Accessories is included as a fourth product square, using the verified Odoo Accessories category. It shows discounted sales and sold quantity in the same square for combined and separate branch totals, follows the selected dates, and appears in CSV exports.
