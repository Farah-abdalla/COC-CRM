# Read-only Odoo integration

Start the local CRM with `npm run dev`, sign in as an administrator, and open **Odoo** in the sidebar. Choose a view and press **Load Odoo data** to apply filters. Products load when the page opens.

The integration reads products, categories, internal stock, branches, internal locations, warehouses, stock movements, and posted customer invoice/credit-note lines. Sales default to the current month; branch filters use Odoo branch IDs. Customer invoices and credit notes are separate views: subtract credit notes when calculating net sales. Results are paginated at 100 records per page.

Odoo views read live data without sending changes to Odoo. Sales can be linked into the native CRM Invoice List with the displayed date and branch filters. The current CRM connector imports invoice lines. A live fields_get audit also confirmed access to invoice-header field definitions; prescriptions and work orders remain unavailable through the models checked. See the schema inventory below.

## Configuration

The supplied key is configured in the ignored `.env.local` file. Only the Node server reads it. Never use a `VITE_` prefix for credentials. The browser calls authenticated `/api/odoo/<resource>` endpoints; the server checks administrator access and exposes only fixed `search_read` queries with explicit fields. Arbitrary models, methods, fields, and domains are not accepted.

For a new installation, copy `.env.example` to `.env.local` and set `ODOO_API_KEY`. Restart Vite after changing credentials. Existing environment variables take precedence over the file. The current key expires on **24 January 2027**: ask COC for a replacement before then and update both `ODOO_API_KEY` and `ODOO_KEY_EXPIRES`.

Requests run sequentially, at least 350 ms apart, with 20-second request timeouts. Identical reads share in-flight requests and are cached for 60 seconds; the queue and cache are bounded. Refresh may return a recent cached result. Dates on sales are invoice dates; stock movement timestamps and the optional `updatedSince=YYYY-MM-DD HH:mm:ss` API parameter use Odoo's UTC timestamps. `updatedSince` uses an inclusive boundary; consumers doing incremental sync must page all results and deduplicate by ID.

The root project's Vite development and preview servers provide these endpoints. A static `dist` deployment alone cannot provide them. The older hosted checkout at `sites/coc-crm` is unchanged; publishing this local account system requires a separate backend migration and runtime secrets configuration.

## Connection verification

On 27 October 2026, the configured endpoint https://rx.coceyewear.com/odoo-api authenticated successfully with the updated server-only credentials. Read-only product and branch requests each returned HTTP 200 and one record through the CRM connector. Restart an already-running Vite server after changing credentials.

## Invoice List

Invoice List now uses the native CRM table and actions for Odoo imports. For administrators, opening the page imports today's invoices automatically; Load invoices from Odoo can load another date range. The previous source selector and separate Odoo sales component were removed. Imported invoices retain Odoo numbers and stable IDs, create linked customers, and persist through company storage. Existing imported invoices and CRM edits are never overwritten; duplicates and unsupported quantities are reported. Imported prices include source discounts and tax. Branches are matched through verified Odoo branch-filtered reads. Staff, cashier and due date are unavailable from this API and must be assigned in Edit. Opening payments are marked Not reconciled, with payment collection and reminders enabled after verification in Edit. Import creates no payment or Treasury entries. Edits are local to CRM and are not sent to Odoo.

Company snapshots retain their existing 1.8 MB limit. Choose smaller date ranges when a full month exceeds available storage; oversized imports do not replace or partially save company records.

## Branch-sales product links

The Sales by branch report now resolves invoice products with an administrator-only, read-only report-products endpoint using bounded exact product IDs, names or SKU codes. It returns only product ID, name, SKU and category. Sunglasses and Eyeglasses use Odoo categories; Vegas X6 uses the verified Vegas/X6 product or category name. Successful product links are stored in company records for Reports users. Only administrators can update them. Product tiles show discounted merchandise sales before returns and exclude shipping/adjustments. New invoice imports retain Odoo product IDs; the original association is cleared when an item label changes.

## Invoice SKU picker

In Invoice List, add or edit an invoice and search the SKU field by Odoo product name, SKU/default code, or barcode. Selecting a result fills its SKU and stores its stable Odoo product ID and name on the line. A product without a SKU uses its name. New lines with a blank price use the catalogue sale price; prices already entered are preserved. Manual text edits clear the old product association. Search is debounced, keyboard accessible, and paginated. Existing/manual invoice items remain editable if Odoo is unavailable.

The invoice-products endpoint is GET-only, limited to 50 products per page, and accepts only search and pagination parameters. Signed-in administrators and staff with Invoice List add/edit rights can use it. It exposes product ID, name, SKU, barcode, sale price and category, with no costs or stock. Other Odoo endpoints retain administrator-only authorization. No Odoo records are modified.

Invoice List displays linked item names in the Item name column, one name per line, and supports searching by item name. SKU codes remain stored for Odoo links and barcodes. New imports retain their product names; older Odoo display labels have their bracketed code prefix removed. Saved product mappings resolve older codes when available. Unresolved numeric codes show Item name unavailable.

## Linked Odoo sales

In Odoo > Sales, click an invoice number or Link sales to Invoice List. The displayed date range and Odoo branch filter are imported before opening Invoice List. Original Odoo invoice numbers, line amounts, product IDs and customers are preserved. All sales lines are paged before grouping, so partial invoices are never imported. Existing imports are deduplicated by Odoo invoice ID; existing CRM edits are preserved. Only a missing branch can be filled on an existing invoice.

Branch attribution is verified by reading Odoo sales with each matched branch filter. Names are matched after ignoring spaces, punctuation and the word Branch, including Downtown Branch / Downtown and Ecommerce / E-Commerce. Unmatched branches are reported and remain unassigned. Product categories for linked invoice items are refreshed through exact product IDs and stored for the dashboard rankings. If the catalogue is unavailable, invoices remain available and the import reports a warning. Payment history and salesperson headers remain unavailable in this gateway; no payment or salesperson is fabricated.

Explicit Odoo product lines named Invoice Adjustment, including negative amounts, are stored in the native invoice adjustment field. Their source line IDs and amounts are retained. Merchandise totals remain editable line items, and the final invoice amount is checked against the grouped Odoo total. Other unsupported negative merchandise lines are reported rather than reinterpreted.

Invoice creation now shows product names in the item selector and product suggestions. The receipt also uses product names rather than SKU codes. Stable SKU and Odoo product IDs remain stored for exact catalogue links, stock matching and barcode printing. The compact Invoice List continues to hide its item-name column as configured.

## Live field discovery

Run `node server/inspectOdooFields.mjs` from the project directory with the server-only Odoo credentials configured. This script authenticates, calls only `fields_get` for the known CRM models and their directly referenced relation models, and writes `artifacts/odoo-fields-get.json` plus a readable `artifacts/odoo-fields-get.md`. It never creates or changes Odoo records and does not expose a new browser endpoint. Model enumeration through `ir.model` is blocked, so this is an inventory of checked models, not proof that no other custom model exists.

The 29 October 2026 audit found invoice-header fields including `branch_id`, `coc_salesperson`, `coc_cashier`, `invoice_user_id`, `payment_state` and `amount_residual`. Their presence in field metadata does not itself verify record-read or write access. Invoice lines expose `sale_line_ids`, but the key rejects `sale.order.line`, `sale.order`, `mrp.workorder` and `repair.order`. No work-order relation appears in the returned invoice-header fields. Existing CRM work-order links remain local until COC opens the actual optical work-order model and its invoice relation; sale-line IDs must not be treated as CRM work-order IDs.