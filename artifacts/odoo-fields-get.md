# Odoo field inventory

Checked: 2026-10-29T17:13:35.115Z

Known CRM models and their directly referenced relation models; the gateway blocks ir.model enumeration.

10 readable model schemas; 801 field definitions. A field appearing here does not grant write access or guarantee record access. All requests were read-only.

## Work-order mapping

- Invoice identity: account.move.id/name ↔ CRM invoice.odooInvoiceId/number.
- Customer reference: account.move.partner_id ↔ CRM customer.odooPartnerId; direct customer-model access is blocked.
- Invoice lines: account.move.invoice_line_ids → account.move.line; product_id → product.product.
- Possible sales-order bridge: account.move.line.sale_line_ids → sale.order.line. The related sales-order model is blocked, so IDs alone cannot identify or import work orders.
- Branch and staff: account.move.branch_id, coc_salesperson, coc_cashier, invoice_user_id are exposed by fields_get.
- No work-order or prescription relation is exposed by the returned invoice header schema. mrp.workorder and repair.order are blocked.
- Keep CRM invoice.workOrderId linked to a real CRM order. Do not substitute an Odoo sale-line ID or infer a work order from customer/product similarity.
- To enable automatic linking, the gateway owner must provide the actual optical work-order model and allow its read methods, stable ID/number, invoice relation, customer, branch, dates, stage, products and prescription fields. Then verify those definitions with fields_get.

## Model summary

| Model | Fields or access result |
| --- | --- |
| product.product | 224 |
| product.category | 42 |
| stock.quant | 36 |
| coc.branch | 23 |
| stock.location | 38 |
| stock.warehouse | 38 |
| stock.move | 89 |
| account.move.line | 92 |
| account.move | 29 |
| sale.order | COC gateway: model 'sale.order' is not open to this key |
| sale.order.line | COC gateway: model 'sale.order.line' is not open to this key |
| res.partner | COC gateway: model 'res.partner' is not open to this key |
| mrp.workorder | COC gateway: model 'mrp.workorder' is not open to this key |
| repair.order | COC gateway: model 'repair.order' is not open to this key |
| ir.model | COC gateway: model 'ir.model' is not open to this key |
| mail.activity | COC gateway: model 'mail.activity' is not open to this key |
| res.users | COC gateway: model 'res.users' is not open to this key |
| mail.activity.type | COC gateway: model 'mail.activity.type' is not open to this key |
| mail.followers | COC gateway: model 'mail.followers' is not open to this key |
| mail.message | COC gateway: model 'mail.message' is not open to this key |
| product.template | 190 |
| product.template.attribute.value | COC gateway: model 'product.template.attribute.value' is not open to this key |
| product.document | COC gateway: model 'product.document' is not open to this key |
| product.packaging | COC gateway: model 'product.packaging' is not open to this key |
| product.tag | COC gateway: model 'product.tag' is not open to this key |
| stock.warehouse.orderpoint | COC gateway: model 'stock.warehouse.orderpoint' is not open to this key |
| stock.putaway.rule | COC gateway: model 'stock.putaway.rule' is not open to this key |
| stock.storage.category.capacity | COC gateway: model 'stock.storage.category.capacity' is not open to this key |
| res.currency | COC gateway: model 'res.currency' is not open to this key |
| stock.valuation.layer | COC gateway: model 'stock.valuation.layer' is not open to this key |
| purchase.order.line | COC gateway: model 'purchase.order.line' is not open to this key |
| product.combo | COC gateway: model 'product.combo' is not open to this key |
| uom.uom | COC gateway: model 'uom.uom' is not open to this key |
| uom.category | COC gateway: model 'uom.category' is not open to this key |
| res.company | COC gateway: model 'res.company' is not open to this key |
| product.supplierinfo | COC gateway: model 'product.supplierinfo' is not open to this key |
| product.template.attribute.line | COC gateway: model 'product.template.attribute.line' is not open to this key |
| account.tax | COC gateway: model 'account.tax' is not open to this key |
| account.account | COC gateway: model 'account.account' is not open to this key |
| account.account.tag | COC gateway: model 'account.account.tag' is not open to this key |
| stock.route | COC gateway: model 'stock.route' is not open to this key |
| product.removal | COC gateway: model 'product.removal' is not open to this key |
| account.journal | COC gateway: model 'account.journal' is not open to this key |
| stock.storage.category | COC gateway: model 'stock.storage.category' is not open to this key |
| stock.lot | COC gateway: model 'stock.lot' is not open to this key |
| stock.quant.package | COC gateway: model 'stock.quant.package' is not open to this key |
| res.country.state | COC gateway: model 'res.country.state' is not open to this key |
| res.country | COC gateway: model 'res.country' is not open to this key |
| stock.move.line | COC gateway: model 'stock.move.line' is not open to this key |
| stock.rule | COC gateway: model 'stock.rule' is not open to this key |
| stock.picking.type | COC gateway: model 'stock.picking.type' is not open to this key |
| stock.picking | COC gateway: model 'stock.picking' is not open to this key |
| stock.scrap | COC gateway: model 'stock.scrap' is not open to this key |
| procurement.group | COC gateway: model 'procurement.group' is not open to this key |
| stock.package_level | COC gateway: model 'stock.package_level' is not open to this key |
| account.analytic.line | COC gateway: model 'account.analytic.line' is not open to this key |
| account.analytic.account | COC gateway: model 'account.analytic.account' is not open to this key |
| account.journal.group | COC gateway: model 'account.journal.group' is not open to this key |
| account.reconcile.model | COC gateway: model 'account.reconcile.model' is not open to this key |
| account.payment | COC gateway: model 'account.payment' is not open to this key |
| account.bank.statement.line | COC gateway: model 'account.bank.statement.line' is not open to this key |
| account.bank.statement | COC gateway: model 'account.bank.statement' is not open to this key |
| account.tax.group | COC gateway: model 'account.tax.group' is not open to this key |
| account.tax.repartition.line | COC gateway: model 'account.tax.repartition.line' is not open to this key |
| account.full.reconcile | COC gateway: model 'account.full.reconcile' is not open to this key |
| account.partial.reconcile | COC gateway: model 'account.partial.reconcile' is not open to this key |
| account.root | COC gateway: model 'account.root' is not open to this key |
| hr.expense | COC gateway: model 'hr.expense' is not open to this key |
| purchase.order | COC gateway: model 'purchase.order' is not open to this key |

## product.product

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| activity_ids | Activities | one2many | mail.activity | false | false |  |  |
| activity_state | Activity State | selection |  | false | true | [["overdue","Overdue"],["today","Today"],["planned","Planned"]] | Status based on activities Overdue: Due date is already passed Today: Activity date is today Planned: Future activities. |
| activity_user_id | Responsible User | many2one | res.users | false | true |  |  |
| activity_type_id | Next Activity Type | many2one | mail.activity.type | false | false |  |  |
| activity_type_icon | Activity Type Icon | char |  | false | true |  | Font awesome icon e.g. fa-tasks |
| activity_date_deadline | Next Activity Deadline | date |  | false | true |  |  |
| my_activity_date_deadline | My Activity Deadline | date |  | false | true |  |  |
| activity_summary | Next Activity Summary | char |  | false | false |  |  |
| activity_exception_decoration | Activity Exception Decoration | selection |  | false | true | [["warning","Alert"],["danger","Error"]] | Type of the exception activity on record. |
| activity_exception_icon | Icon | char |  | false | true |  | Icon to indicate an exception activity. |
| message_is_follower | Is Follower | boolean |  | false | true |  |  |
| message_follower_ids | Followers | one2many | mail.followers | false | false |  |  |
| message_partner_ids | Followers (Partners) | many2many | res.partner | false | false |  |  |
| message_ids | Messages | one2many | mail.message | false | false |  |  |
| has_message | Has Message | boolean |  | false | true |  |  |
| message_needaction | Action Needed | boolean |  | false | true |  | If checked, new messages require your attention. |
| message_needaction_counter | Number of Actions | integer |  | false | true |  | Number of messages requiring action |
| message_has_error | Message Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| message_has_error_counter | Number of errors | integer |  | false | true |  | Number of messages with delivery error |
| message_attachment_count | Attachment Count | integer |  | false | true |  |  |
| website_message_ids | Website Messages | one2many | mail.message | false | false |  | Website communication history |
| message_has_sms_error | SMS Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| price_extra | Variant Price Extra | float |  | false | true |  | This is the sum of the extra price of all attributes |
| lst_price | Sales Price | float |  | false | false |  | The sale price is managed from the product template. Click on the 'Configure Variants' button to set the extra attribute prices. |
| default_code | Internal Reference | char |  | false | false |  |  |
| code | Reference | char |  | false | true |  |  |
| partner_ref | Customer Ref | char |  | false | true |  |  |
| active | Active | boolean |  | false | false |  | If unchecked, it will allow you to hide the product without removing it. |
| product_tmpl_id | Product Template | many2one | product.template | true | false |  |  |
| barcode | Barcode | char |  | false | false |  | International Article Number used for product identification. |
| product_template_attribute_value_ids | Attribute Values | many2many | product.template.attribute.value | false | false |  |  |
| product_template_variant_value_ids | Variant Values | many2many | product.template.attribute.value | false | false |  |  |
| combination_indices | Combination Indices | char |  | false | true |  |  |
| is_product_variant | Is Product Variant | boolean |  | false | true |  |  |
| standard_price | Cost | float |  | false | false |  | Value of the product (automatically computed in AVCO).         Used to value the product when the purchase cost is not known (e.g. inventory adjustment).         Used to compute margins on sale orders. |
| volume | Volume | float |  | false | false |  |  |
| weight | Weight | float |  | false | false |  |  |
| pricelist_item_count | Number of price rules | integer |  | false | true |  |  |
| product_document_ids | Documents | one2many | product.document | false | false |  |  |
| product_document_count | Documents Count | integer |  | false | true |  |  |
| packaging_ids | Product Packages | one2many | product.packaging | false | false |  | Gives the different ways to package the same product. |
| additional_product_tag_ids | Variant Tags | many2many | product.tag | false | false |  |  |
| all_product_tag_ids | All Product Tag | many2many | product.tag | false | true |  |  |
| image_variant_1920 | Variant Image | binary |  | false | false |  |  |
| image_variant_1024 | Variant Image 1024 | binary |  | false | true |  |  |
| image_variant_512 | Variant Image 512 | binary |  | false | true |  |  |
| image_variant_256 | Variant Image 256 | binary |  | false | true |  |  |
| image_variant_128 | Variant Image 128 | binary |  | false | true |  |  |
| can_image_variant_1024_be_zoomed | Can Variant Image 1024 be zoomed | boolean |  | false | true |  |  |
| image_1920 | Image | binary |  | false | false |  |  |
| image_1024 | Image 1024 | binary |  | false | true |  |  |
| image_512 | Image 512 | binary |  | false | true |  |  |
| image_256 | Image 256 | binary |  | false | true |  |  |
| image_128 | Image 128 | binary |  | false | true |  |  |
| can_image_1024_be_zoomed | Can Image 1024 be zoomed | boolean |  | false | true |  |  |
| write_date | Write Date | datetime |  | false | true |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| tax_string | Tax String | char |  | false | true |  |  |
| stock_quant_ids | Stock Quant | one2many | stock.quant | false | false |  |  |
| stock_move_ids | Stock Move | one2many | stock.move | false | false |  |  |
| qty_available | Quantity On Hand | float |  | false | true |  | Current quantity of products. In a context with a single Stock Location, this includes goods stored at this Location, or any of its children. In a context with a single Warehouse, this includes goods stored in the Stock Location of this Warehouse, or any of its children. stored in the Stock Location of the Warehouse of this Shop, or any of its children. Otherwise, this includes goods stored in any Stock Location with 'internal' type. |
| virtual_available | Forecasted Quantity | float |  | false | true |  | Forecast quantity (computed as Quantity On Hand - Outgoing + Incoming) In a context with a single Stock Location, this includes goods stored in this location, or any of its children. In a context with a single Warehouse, this includes goods stored in the Stock Location of this Warehouse, or any of its children. Otherwise, this includes goods stored in any Stock Location with 'internal' type. |
| free_qty | Free To Use Quantity  | float |  | false | true |  | Forecast quantity (computed as Quantity On Hand - reserved quantity) In a context with a single Stock Location, this includes goods stored in this location, or any of its children. In a context with a single Warehouse, this includes goods stored in the Stock Location of this Warehouse, or any of its children. Otherwise, this includes goods stored in any Stock Location with 'internal' type. |
| incoming_qty | Incoming | float |  | false | true |  | Quantity of planned incoming products. In a context with a single Stock Location, this includes goods arriving to this Location, or any of its children. In a context with a single Warehouse, this includes goods arriving to the Stock Location of this Warehouse, or any of its children. Otherwise, this includes goods arriving to any Stock Location with 'internal' type. |
| outgoing_qty | Outgoing | float |  | false | true |  | Quantity of planned outgoing products. In a context with a single Stock Location, this includes goods leaving this Location, or any of its children. In a context with a single Warehouse, this includes goods leaving the Stock Location of this Warehouse, or any of its children. Otherwise, this includes goods leaving any Stock Location with 'internal' type. |
| orderpoint_ids | Minimum Stock Rules | one2many | stock.warehouse.orderpoint | false | false |  |  |
| nbr_moves_in | Nbr Moves In | integer |  | false | true |  | Number of incoming stock moves in the past 12 months |
| nbr_moves_out | Nbr Moves Out | integer |  | false | true |  | Number of outgoing stock moves in the past 12 months |
| nbr_reordering_rules | Reordering Rules | integer |  | false | true |  |  |
| reordering_min_qty | Reordering Min Qty | float |  | false | true |  |  |
| reordering_max_qty | Reordering Max Qty | float |  | false | true |  |  |
| putaway_rule_ids | Putaway Rules | one2many | stock.putaway.rule | false | false |  |  |
| storage_category_capacity_ids | Storage Category Capacity | one2many | stock.storage.category.capacity | false | false |  |  |
| show_on_hand_qty_status_button | Show On Hand Qty Status Button | boolean |  | false | true |  |  |
| show_forecasted_qty_status_button | Show Forecasted Qty Status Button | boolean |  | false | true |  |  |
| valid_ean | Barcode is valid EAN | boolean |  | false | true |  |  |
| lot_properties_definition | Lot Properties | properties_definition |  | false | false |  |  |
| standard_price_update_warning | Standard Price Update Warning | char |  | false | true |  |  |
| purchased_product_qty | Purchased | float |  | false | true |  |  |
| is_in_purchase_order | Is In Purchase Order | boolean |  | false | true |  |  |
| value_svl | Value Svl | float |  | false | true |  |  |
| quantity_svl | Quantity Svl | float |  | false | true |  |  |
| avg_cost | Average Cost | monetary |  | false | true |  |  |
| total_value | Total Value | monetary |  | false | true |  |  |
| company_currency_id | Valuation Currency | many2one | res.currency | false | true |  | Technical field to correctly show the currently selected company's currency that corresponds to the totaled value of the product's valuation layers |
| stock_valuation_layer_ids | Stock Valuation Layer | one2many | stock.valuation.layer | false | false |  |  |
| valuation | Inventory Valuation | selection |  | false | true | [["manual_periodic","Manual"],["real_time","Automated"]] | Manual: The accounting entries to value the inventory are not posted automatically.         Automated: An accounting entry is automatically created to value the inventory when a product enters or leaves the company.          |
| cost_method | Costing Method | selection |  | false | true | [["standard","Standard Price"],["fifo","First In First Out (FIFO)"],["average","Average Cost (AVCO)"]] | Standard Price: The products are valued at their standard cost defined on the product.         Average Cost (AVCO): The products are valued at weighted average cost.         First In First Out (FIFO): The products are valued supposing those that enter the company first will also leave it first.          |
| purchase_order_line_ids | PO Lines | one2many | purchase.order.line | false | false |  |  |
| sales_count | Sold | float |  | false | true |  |  |
| product_catalog_product_is_in_sale_order | Product Catalog Product Is In Sale Order | boolean |  | false | true |  |  |
| name | Name | char |  | true | false |  |  |
| sequence | Sequence | integer |  | false | false |  | Gives the sequence order when displaying a product list |
| description | Description | html |  | false | false |  |  |
| description_purchase | Purchase Description | text |  | false | false |  |  |
| description_sale | Sales Description | text |  | false | false |  | A description of the Product that you want to communicate to your customers. This description will be copied to every Sales Order, Delivery Order and Customer Invoice/Credit Note |
| type | Product Type | selection |  | true | false | [["consu","Goods"],["service","Service"],["combo","Combo"]] | Goods are tangible materials and merchandise you provide. A service is a non-material product you provide. |
| combo_ids | Combo Choices | many2many | product.combo | false | false |  |  |
| service_tracking | Create on Order | selection |  | true | false | [["no","Nothing"]] |  |
| categ_id | Product Category | many2one | product.category | true | false |  |  |
| currency_id | Currency | many2one | res.currency | false | true |  |  |
| cost_currency_id | Cost Currency | many2one | res.currency | false | true |  |  |
| list_price | Sales Price | float |  | false | false |  | Price at which the product is sold to customers. |
| volume_uom_name | Volume unit of measure label | char |  | false | true |  |  |
| weight_uom_name | Weight unit of measure label | char |  | false | true |  |  |
| sale_ok | Sales | boolean |  | false | false |  |  |
| purchase_ok | Purchase | boolean |  | false | false |  |  |
| uom_id | Unit of Measure | many2one | uom.uom | true | false |  | Default unit of measure used for all stock operations. |
| uom_name | Unit of Measure Name | char |  | false | true |  |  |
| uom_category_id | UoM Category | many2one | uom.category | false | true |  | Conversion between Units of Measure can only occur if they belong to the same category. The conversion will be made based on the ratios. |
| uom_po_id | Purchase Unit | many2one | uom.uom | true | false |  | Default unit of measure used for purchase orders. It must be in the same category as the default unit of measure. |
| company_id | Company | many2one | res.company | false | false |  |  |
| seller_ids | Vendors | one2many | product.supplierinfo | false | false |  |  |
| variant_seller_ids | Variant Seller | one2many | product.supplierinfo | false | false |  |  |
| color | Color Index | integer |  | false | false |  |  |
| attribute_line_ids | Product Attributes | one2many | product.template.attribute.line | false | false |  |  |
| valid_product_template_attribute_line_ids | Valid Product Attribute Lines | many2many | product.template.attribute.line | false | true |  |  |
| product_variant_ids | Products | one2many | product.product | true | false |  |  |
| product_variant_id | Product | many2one | product.product | false | true |  |  |
| product_variant_count | # Product Variants | integer |  | false | true |  |  |
| has_configurable_attributes | Is a configurable product | boolean |  | false | true |  |  |
| product_tooltip | Product Tooltip | char |  | false | true |  |  |
| is_favorite | Favorite | boolean |  | false | false |  |  |
| product_tag_ids | Tags | many2many | product.tag | false | false |  |  |
| product_properties | Properties | properties |  | false | false |  |  |
| taxes_id | Sales Taxes | many2many | account.tax | false | false |  | Default taxes used when selling the product |
| supplier_taxes_id | Purchase Taxes | many2many | account.tax | false | false |  | Default taxes used when buying the product |
| property_account_income_id | Income Account | many2one | account.account | false | false |  | Keep this field empty to use the default value from the product category. |
| property_account_expense_id | Expense Account | many2one | account.account | false | false |  | Keep this field empty to use the default value from the product category. If anglo-saxon accounting with automated valuation method is configured, the expense account on the product category will be used. |
| account_tag_ids | Account Tags | many2many | account.account.tag | false | false |  | Tags to be set on the base and tax journal items created for this product. |
| fiscal_country_codes | Fiscal Country Codes | char |  | false | true |  |  |
| is_storable | Track Inventory | boolean |  | false | false |  | A storable product is a product for which you manage stock. |
| responsible_id | Responsible | many2one | res.users | false | false |  | This user will be responsible of the next activities related to logistic operations for this product. |
| property_stock_production | Production Location | many2one | stock.location | false | false |  | This stock location will be used, instead of the default one, as the source location for stock moves generated by manufacturing orders. |
| property_stock_inventory | Inventory Location | many2one | stock.location | false | false |  | This stock location will be used, instead of the default one, as the source location for stock moves generated when you do an inventory. |
| sale_delay | Customer Lead Time | integer |  | false | false |  | Delivery lead time, in days. It's the number of days, promised to the customer, between the confirmation of the sales order and the delivery. |
| tracking | Tracking | selection |  | true | false | [["serial","By Unique Serial Number"],["lot","By Lots"],["none","By Quantity"]] | Ensure the traceability of a storable product in your warehouse. |
| description_picking | Description on Picking | text |  | false | false |  |  |
| description_pickingout | Description on Delivery Orders | text |  | false | false |  |  |
| description_pickingin | Description on Receptions | text |  | false | false |  |  |
| location_id | Location | many2one | stock.location | false | false |  |  |
| warehouse_id | Warehouse | many2one | stock.warehouse | false | false |  |  |
| has_available_route_ids | Routes can be selected on this product | boolean |  | false | true |  |  |
| route_ids | Routes | many2many | stock.route | false | false |  | Depending on the modules installed, this will allow you to define the route of the product: whether it will be bought, manufactured, replenished on order, etc. |
| route_from_categ_ids | Category Routes | many2many | stock.route | false | true |  |  |
| can_be_expensed | Expenses | boolean |  | false | false |  | Specify whether the product can be selected in an expense. |
| purchase_method | Control Policy | selection |  | false | false | [["purchase","On ordered quantities"],["receive","On received quantities"]] | On ordered quantities: Control bills based on ordered quantities. On received quantities: Control bills based on received quantities. |
| purchase_line_warn | Purchase Order Line Warning | selection |  | true | false | [["no-message","No Message"],["warning","Warning"],["block","Blocking Message"]] | Selecting the "Warning" option will notify user with the message, Selecting "Blocking Message" will throw an exception with the message and block the flow. The Message has to be written in the next field. |
| purchase_line_warn_msg | Message for Purchase Order Line | text |  | false | false |  |  |
| lot_valuated | Valuation by Lot/Serial number | boolean |  | false | false |  | If checked, the valuation will be specific by Lot/Serial number. |
| property_account_creditor_price_difference | Price Difference Account | many2one | account.account | false | false |  | This account is used in automated inventory valuation to record the price difference between a purchase order and its related vendor bill when validating this vendor bill. |
| service_type | Track Service | selection |  | false | false | [["manual","Manually set quantities on order"]] | Manually set quantities on order: Invoice based on the manually entered quantity, without creating an analytic account. Timesheets on contract: Invoice based on the tracked hours on the related timesheet. Create a task and track hours: Create a task on the sales order validation and track the work hours. |
| sale_line_warn | Sales Order Line | selection |  | true | false | [["no-message","No Message"],["warning","Warning"],["block","Blocking Message"]] | Selecting the "Warning" option will notify user with the message, Selecting "Blocking Message" will throw an exception with the message and block the flow. The Message has to be written in the next field. |
| sale_line_warn_msg | Message for Sales Order Line | text |  | false | false |  |  |
| expense_policy | Re-Invoice Costs | selection |  | false | false | [["no","No"],["cost","At cost"],["sales_price","Sales price"]] | Validated expenses, vendor bills, or stock pickings (set up to track costs) can be invoiced to the customer at either cost or sales price. |
| visible_expense_policy | Re-Invoice Policy visible | boolean |  | false | true |  |  |
| invoice_policy | Invoicing Policy | selection |  | false | false | [["order","Ordered quantities"],["delivery","Delivered quantities"]] | Ordered Quantity: Invoice quantities ordered by the customer. Delivered Quantity: Invoice quantities delivered to the customer. |
| optional_product_ids | Optional Products | many2many | product.template | false | false |  | Optional Products are suggested whenever the customer hits *Add to Cart* (cross-sell strategy, e.g. for computers: warranty, software, etc.). |
| service_to_purchase | Subcontract Service | boolean |  | false | false |  | If ticked, each time you sell this product through a SO, a RfQ is automatically created to buy the product. Tip: don't forget to set a vendor on the product. |
| x_created_time | Created Time | char |  | false | false |  | Imported from Zoho: Created Time |
| x_last_modified_time | Last Modified Time | char |  | false | false |  | Imported from Zoho: Last Modified Time |
| x_package_weight | Package Weight | boolean |  | false | false |  | Imported from Zoho: Package Weight |
| x_sales_account | Sales Account | selection |  | false | false | [["sales","Sales"]] | Imported from Zoho: Sales Account |
| x_is_returnable_item | Is Returnable Item | boolean |  | false | false |  | Imported from Zoho: Is Returnable Item |
| x_package_width | Package Width | boolean |  | false | false |  | Imported from Zoho: Package Width |
| x_manufacturer | Manufacturer | selection |  | false | false | [["china","China"],["france","France"],["germany","Germany"],["italy","Italy"],["jaban","Jaban"],["japan","Japan"],["korea","Korea"],["usa","USA"]] | Imported from Zoho: Manufacturer |
| x_package_length | Package Length | boolean |  | false | false |  | Imported from Zoho: Package Length |
| x_package_height | Package Height | boolean |  | false | false |  | Imported from Zoho: Package Height |
| x_dimension_unit | Dimension Unit | selection |  | false | false | [["cm","cm"]] | Imported from Zoho: Dimension Unit |
| x_weight_unit | Weight Unit | selection |  | false | false | [["kg","kg"]] | Imported from Zoho: Weight Unit |
| x_product_type | Product Type | selection |  | false | false | [["goods","goods"]] | Imported from Zoho: Product Type |
| x_source | Source | integer |  | false | false |  | Imported from Zoho: Source |
| x_item_type | Item Type | selection |  | false | false | [["inventory","Inventory"],["sales_and_purchases","Sales and Purchases"]] | Imported from Zoho: Item Type |
| x_track_inventory | Track Inventory | boolean |  | false | false |  | Imported from Zoho: Track Inventory |
| x_cf_pair_selling_price | Pair Selling Price | integer |  | false | false |  | Imported from Zoho: CF.Pair Selling Price |
| x_status | Status | selection |  | false | false | [["active","Active"]] | Imported from Zoho: Status |
| x_cf_glasses_optics_material | Glasses Optics Material | selection |  | false | false | [["mineral","Mineral"],["plastic","Plastic"],["polycarbonate","Polycarbonate"],["trivex","Trivex"]] | Imported from Zoho: CF.Glasses Optics Material |
| x_unit | Unit | selection |  | false | false | [["cm","cm"],["kg","kg"],["pcs","pcs"]] | Imported from Zoho: Unit |
| x_purchase_account | Purchase Account | selection |  | false | false | [["cost_of_goods_sold","Cost of Goods Sold"]] | Imported from Zoho: Purchase Account |
| x_cf_st_wh_wholesale_b | ST WH WHOLESALE B | char |  | false | false |  | Imported from Zoho: CF.ST WH WHOLESALE B |
| x_preferred_vendor | Preferred Vendor | char |  | false | false |  | Imported from Zoho: Preferred Vendor |
| x_brand | Brand | char |  | false | false |  | Product Brand |
| x_cf_glasses_company_design | Glasses Company Design | char |  | false | false |  | Imported from Zoho: CF.Glasses Company Design |
| x_cf_glasses_optics_type | Glasses Optics Type | selection |  | false | false | [["bifocal","Bifocal"],["digital","Digital"],["progressive","Progressive"],["single_vision","Single Vision"]] | Imported from Zoho: CF.Glasses Optics Type |
| x_cf_glasses_company_availability | Glasses Company Availability | selection |  | false | false | [["eg","EG"],["out","OUT"],["rx_eg","RX EG"],["rx_out","RX OUT"]] | Imported from Zoho: CF.Glasses Company Availability |
| x_unit_name | Unit Name | selection |  | false | false | [["centimeter","Centimeter"],["kilograms","Kilograms"],["pieces","Pieces"]] | Imported from Zoho: Unit Name |
| x_ean | EAN | integer |  | false | false |  | Imported from Zoho: EAN |
| x_inventory_valuation_method | Inventory Valuation Method | selection |  | false | false | [["fifo","fifo"],["wac","wac"]] | Imported from Zoho: Inventory Valuation Method |
| x_gender | Gender | selection |  | false | false | [["man","Man"],["woman","Woman"],["unisex","Unisex"]] | Gender: Man, Woman, or Unisex |
| x_enable_bin_tracking | Enable Bin Tracking | boolean |  | false | false |  | Imported from Zoho: Enable Bin Tracking |
| x_sellable | Sellable | boolean |  | false | false |  | Imported from Zoho: Sellable |
| x_purchasable | Purchasable | boolean |  | false | false |  | Imported from Zoho: Purchasable |
| x_parent_category | Parent Category | selection |  | false | false | [["eyeglasses","Eyeglasses"],["reading","Reading"]] | Imported from Zoho: Parent Category |
| x_cf_vegas_blue_block | Vegas Blue Block | boolean |  | false | false |  | Imported from Zoho: CF.Vegas Blue Block |
| x_cf_glasses_optics_coating | Glasses Optics Coating | char |  | false | false |  | Imported from Zoho: CF.Glasses Optics Coating |
| x_inventory_account | Inventory Account | selection |  | false | false | [["inventory_asset","Inventory Asset"]] | Imported from Zoho: Inventory Account |
| x_cf_glasses_optics_design | Glasses Optics Design | selection |  | false | false | [["aspherical","Aspherical"],["double_as","Double AS"],["freeform","Freeform"],["spherical","Spherical"]] | Imported from Zoho: CF.Glasses Optics Design |
| x_cf_glasses_optics_index | Glasses Optics Index | float |  | false | false |  | Imported from Zoho: CF.Glasses Optics Index |
| x_special_item | Special Item | boolean |  | false | false |  | Mark as special item |
| x_warehouse_name | Warehouse Name | char |  | false | false |  | Imported from Zoho: Warehouse Name |
| x_opening_stock | Opening Stock | integer |  | false | false |  | Imported from Zoho: Opening Stock |
| x_opening_stock_value | Opening Stock Value | integer |  | false | false |  | Imported from Zoho: Opening Stock Value |
| x_is_combo_product | Is Combo Product | boolean |  | false | false |  | Imported from Zoho: Is Combo Product |
| x_cf_glasses_optics_breakability | Glasses Optics Breakability | selection |  | false | false | [["unbreakable","Unbreakable"]] | Imported from Zoho: CF.Glasses Optics Breakability |
| x_age | Age | selection |  | false | false | [["adult","Adult"],["kids","Kids"]] | Age group: Adult or Kids |
| x_2025_glasses | 2025 Glasses | boolean |  | false | false |  | 2025 Glasses: True = Lens, False = Frame |
| x_cf_glasses_company_coating | Glasses Company Coating | char |  | false | false |  | Imported from Zoho: CF.Glasses Company Coating |
| x_zoho_sku | Zoho SKU | char |  | false | false |  | SKU reference from Zoho |
| x_glasses_company_availability | Glasses Company Availability | char |  | false | false |  |  |
| x_glasses_optics_breakability | Glasses Optics Breakability | char |  | false | false |  |  |
| x_glasses_company_design | Glasses Company Design | char |  | false | false |  |  |
| x_glasses_optics_material | Glasses Optics Material | char |  | false | false |  |  |
| x_glasses_company_coating | Glasses Company Coating | char |  | false | false |  |  |
| x_glasses_optics_type | Glasses Optics Type | char |  | false | false |  |  |
| x_glasses_optics_design | Glasses Optics Design | char |  | false | false |  |  |
| x_cf_of_do | CF of do | char |  | false | false |  |  |
| x_glasses_optics_coating | Glasses Optics Coating | char |  | false | false |  |  |
| x_glasses_optics_index | Glasses Optics Index | char |  | false | false |  |  |
| x_pair_selling_price | Pair Selling Price | float |  | false | false |  |  |
| x_vegas_blue_block | Vegas Blue Block | boolean |  | false | false |  |  |

## product.category

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| message_is_follower | Is Follower | boolean |  | false | true |  |  |
| message_follower_ids | Followers | one2many | mail.followers | false | false |  |  |
| message_partner_ids | Followers (Partners) | many2many | res.partner | false | false |  |  |
| message_ids | Messages | one2many | mail.message | false | false |  |  |
| has_message | Has Message | boolean |  | false | true |  |  |
| message_needaction | Action Needed | boolean |  | false | true |  | If checked, new messages require your attention. |
| message_needaction_counter | Number of Actions | integer |  | false | true |  | Number of messages requiring action |
| message_has_error | Message Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| message_has_error_counter | Number of errors | integer |  | false | true |  | Number of messages with delivery error |
| message_attachment_count | Attachment Count | integer |  | false | true |  |  |
| website_message_ids | Website Messages | one2many | mail.message | false | false |  | Website communication history |
| message_has_sms_error | SMS Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| name | Name | char |  | true | false |  |  |
| complete_name | Complete Name | char |  | false | true |  |  |
| parent_id | Parent Category | many2one | product.category | false | false |  |  |
| parent_path | Parent Path | char |  | false | false |  |  |
| child_id | Child Categories | one2many | product.category | false | false |  |  |
| product_count | # Products | integer |  | false | true |  | The number of products under this category (Does not consider the children categories) |
| product_properties_definition | Product Properties | properties_definition |  | false | false |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| property_account_income_categ_id | Income Account | many2one | account.account | false | false |  | This account will be used when validating a customer invoice. |
| property_account_expense_categ_id | Expense Account | many2one | account.account | false | false |  | The expense is accounted for when a vendor bill is validated, except in anglo-saxon accounting with perpetual inventory valuation in which case the expense (Cost of Goods Sold account) is recognized at the customer invoice validation. |
| route_ids | Routes | many2many | stock.route | false | false |  |  |
| removal_strategy_id | Force Removal Strategy | many2one | product.removal | false | false |  | Set a specific removal strategy that will be used regardless of the source location for this product category. FIFO: products/lots that were stocked first will be moved out first. LIFO: products/lots that were stocked last will be moved out first. Closest location: products/lots closest to the target location will be moved out first. FEFO: products/lots with the closest removal date will be moved out first (the availability of this method depends on the "Expiration Dates" setting). Least Packages: FIFO but with the least number of packages possible when there are several packages containing the same product. |
| parent_route_ids | Parent Routes | many2many | stock.route | false | true |  |  |
| total_route_ids | Total routes | many2many | stock.route | false | true |  |  |
| putaway_rule_ids | Putaway Rules | one2many | stock.putaway.rule | false | false |  |  |
| packaging_reserve_method | Reserve Packagings | selection |  | false | false | [["full","Reserve Only Full Packagings"],["partial","Reserve Partial Packagings"]] | Reserve Only Full Packagings: will not reserve partial packagings. If customer orders 2 pallets of 1000 units each and you only have 1600 in stock, then only 1000 will be reserved Reserve Partial Packagings: allow reserving partial packagings. If customer orders 2 pallets of 1000 units each and you only have 1600 in stock, then 1600 will be reserved |
| filter_for_stock_putaway_rule | stock.putaway.rule | boolean |  | false | false |  |  |
| property_valuation | Inventory Valuation | selection |  | false | false | [["manual_periodic","Manual"],["real_time","Automated"]] | Manual: The accounting entries to value the inventory are not posted automatically.         Automated: An accounting entry is automatically created to value the inventory when a product enters or leaves the company.          |
| property_cost_method | Costing Method | selection |  | false | false | [["standard","Standard Price"],["fifo","First In First Out (FIFO)"],["average","Average Cost (AVCO)"]] | Standard Price: The products are valued at their standard cost defined on the product.         Average Cost (AVCO): The products are valued at weighted average cost.         First In First Out (FIFO): The products are valued supposing those that enter the company first will also leave it first.          |
| property_stock_journal | Stock Journal | many2one | account.journal | false | false |  | When doing automated inventory valuation, this is the Accounting Journal in which entries will be automatically posted when stock moves are processed. |
| property_stock_account_input_categ_id | Stock Input Account | many2one | account.account | false | false |  | Counterpart journal items for all incoming stock moves will be posted in this account, unless there is a specific valuation account                 set on the source location. This is the default value for all products in this category. It can also directly be set on each product. |
| property_stock_account_output_categ_id | Stock Output Account | many2one | account.account | false | false |  | When doing automated inventory valuation, counterpart journal items for all outgoing stock moves will be posted in this account,                 unless there is a specific valuation account set on the destination location. This is the default value for all products in this category.                 It can also directly be set on each product. |
| property_stock_valuation_account_id | Stock Valuation Account | many2one | account.account | false | false |  | When automated inventory valuation is enabled on a product, this account will hold the current value of the products. |
| property_account_creditor_price_difference_categ | Price Difference Account | many2one | account.account | false | false |  | This account will be used to value price difference between purchase price and accounting cost. |
| property_account_downpayment_categ_id | Downpayment Account | many2one | account.account | false | false |  | This account will be used on Downpayment invoices. |

## stock.quant

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| product_id | Product | many2one | product.product | true | false |  |  |
| product_tmpl_id | Product Template | many2one | product.template | false | true |  |  |
| product_uom_id | Unit of Measure | many2one | uom.uom | false | true |  | Default unit of measure used for all stock operations. |
| is_favorite | Favorite | boolean |  | false | true |  |  |
| company_id | Company | many2one | res.company | false | true |  | Let this field empty if this location is shared between companies |
| location_id | Location | many2one | stock.location | true | false |  |  |
| warehouse_id | Warehouse | many2one | stock.warehouse | false | true |  |  |
| storage_category_id | Storage Category | many2one | stock.storage.category | false | true |  |  |
| cyclic_inventory_frequency | Inventory Frequency | integer |  | false | true |  |  When different than 0, inventory count date for products stored at this location will be automatically set at the defined frequency. |
| lot_id | Lot/Serial Number | many2one | stock.lot | false | false |  |  |
| lot_properties | Properties | properties |  | false | true |  |  |
| sn_duplicated | Duplicated Serial Number | boolean |  | false | true |  | If the same SN is in another Quant |
| package_id | Package | many2one | stock.quant.package | false | false |  | The package containing this quant |
| owner_id | Owner | many2one | res.partner | false | false |  | This is the owner of the quant |
| quantity | Quantity | float |  | false | true |  | Quantity of products in this quant, in the default unit of measure of the product |
| reserved_quantity | Reserved Quantity | float |  | true | true |  | Quantity of reserved products in this quant, in the default unit of measure of the product |
| available_quantity | Available Quantity | float |  | false | true |  | On hand quantity which hasn't been reserved on a transfer, in the default unit of measure of the product |
| in_date | Incoming Date | datetime |  | true | true |  |  |
| tracking | Tracking | selection |  | false | true | [["serial","By Unique Serial Number"],["lot","By Lots"],["none","By Quantity"]] | Ensure the traceability of a storable product in your warehouse. |
| on_hand | On Hand | boolean |  | false | false |  |  |
| product_categ_id | Product Category | many2one | product.category | false | true |  |  |
| inventory_quantity | Counted Quantity | float |  | false | false |  | The product's counted quantity. |
| inventory_diff_quantity | Difference | float |  | false | true |  | Indicates the gap between the product's theoretical quantity and its counted quantity. |
| inventory_date | Scheduled Date | date |  | false | false |  | Next date the On Hand Quantity should be counted. |
| last_count_date | Last Count Date | date |  | false | true |  | Last time the Quantity was Updated |
| inventory_quantity_set | Inventory Quantity Set | boolean |  | false | false |  |  |
| is_outdated | Quantity has been moved since last count | boolean |  | false | true |  |  |
| user_id | Assigned To | many2one | res.users | false | false |  | User assigned to do product count. |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| accounting_date | Accounting Date | date |  | false | false |  | Date at which the accounting entries will be created in case of automated inventory valuation. If empty, the inventory date will be used. |
| cost_method | Costing Method | selection |  | false | true | [["standard","Standard Price"],["fifo","First In First Out (FIFO)"],["average","Average Cost (AVCO)"]] | Standard Price: The products are valued at their standard cost defined on the product.         Average Cost (AVCO): The products are valued at weighted average cost.         First In First Out (FIFO): The products are valued supposing those that enter the company first will also leave it first.          |

## coc.branch

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| name | Branch Name | char |  | true | false |  |  |
| code | Branch Code | char |  | true | false |  | 2-3 letter code for numbering (e.g., DT for Downtown) |
| company_id | Company | many2one | res.company | true | false |  |  |
| active | Active | boolean |  | false | false |  |  |
| sequence | Sequence | integer |  | false | false |  | Display order |
| warehouse_ids | Warehouses | one2many | stock.warehouse | false | false |  |  |
| journal_ids | Treasuries/Journals | one2many | account.journal | false | false |  |  |
| warehouse_count | Warehouses | integer |  | false | true |  |  |
| journal_count | Treasuries | integer |  | false | true |  |  |
| street | Street | char |  | false | false |  |  |
| street2 | Street2 | char |  | false | false |  |  |
| city | City | char |  | false | false |  |  |
| state_id | State | many2one | res.country.state | false | false |  |  |
| country_id | Country | many2one | res.country | false | false |  |  |
| phone | Phone | char |  | false | false |  |  |
| email | Email | char |  | false | false |  |  |
| manager_id | Branch Manager | many2one | res.users | false | false |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |

## stock.location

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| name | Location Name | char |  | true | false |  |  |
| complete_name | Full Location Name | char |  | false | true |  |  |
| active | Active | boolean |  | false | false |  | By unchecking the active field, you may hide a location without deleting it. |
| usage | Location Type | selection |  | true | false | [["supplier","Vendor Location"],["view","View"],["internal","Internal Location"],["customer","Customer Location"],["inventory","Inventory Loss"],["production","Production"],["transit","Transit Location"]] | * Vendor Location: Virtual location representing the source location for products coming from your vendors * View: Virtual location used to create a hierarchical structures for your warehouse, aggregating its child locations ; can't directly contain products * Internal Location: Physical locations inside your own warehouses, * Customer Location: Virtual location representing the destination location for products sent to your customers * Inventory Loss: Virtual location serving as counterpart for inventory operations used to correct stock levels (Physical inventories) * Production: Virtual counterpart location for production operations: this location consumes the components and produces finished products * Transit Location: Counterpart location that should be used in inter-company or inter-warehouses operations |
| location_id | Parent Location | many2one | stock.location | false | false |  | The parent location that includes this location. Example : The 'Dispatch Zone' is the 'Gate 1' parent location. |
| child_ids | Contains | one2many | stock.location | false | false |  |  |
| child_internal_location_ids | Internal locations among descendants | many2many | stock.location | false | true |  | This location (if it's internal) and all its descendants filtered by type=Internal. |
| comment | Additional Information | html |  | false | false |  |  |
| posx | Corridor (X) | integer |  | false | false |  | Optional localization details, for information purpose only |
| posy | Shelves (Y) | integer |  | false | false |  | Optional localization details, for information purpose only |
| posz | Height (Z) | integer |  | false | false |  | Optional localization details, for information purpose only |
| parent_path | Parent Path | char |  | false | false |  |  |
| company_id | Company | many2one | res.company | false | false |  | Let this field empty if this location is shared between companies |
| scrap_location | Is a Scrap Location? | boolean |  | false | false |  | Check this box to allow using this location to put scrapped/damaged goods. |
| replenish_location | Replenish Location | boolean |  | false | false |  | Activate this function to get all quantities to replenish at this particular location |
| removal_strategy_id | Removal Strategy | many2one | product.removal | false | false |  | Defines the default method used for suggesting the exact location (shelf) where to take the products from, which lot etc. for this location. This method can be enforced at the product category level, and a fallback is made on the parent locations if none is set here. FIFO: products/lots that were stocked first will be moved out first. LIFO: products/lots that were stocked last will be moved out first. Closet location: products/lots closest to the target location will be moved out first. FEFO: products/lots with the closest removal date will be moved out first (the availability of this method depends on the "Expiration Dates" setting). |
| putaway_rule_ids | Putaway Rules | one2many | stock.putaway.rule | false | false |  |  |
| barcode | Barcode | char |  | false | false |  |  |
| quant_ids | Quant | one2many | stock.quant | false | false |  |  |
| cyclic_inventory_frequency | Inventory Frequency | integer |  | false | false |  |  When different than 0, inventory count date for products stored at this location will be automatically set at the defined frequency. |
| last_inventory_date | Last Inventory | date |  | false | true |  | Date of the last inventory at this location. |
| next_inventory_date | Next Expected | date |  | false | true |  | Date for next planned inventory based on cyclic schedule. |
| warehouse_view_ids | Warehouse View | one2many | stock.warehouse | false | true |  |  |
| warehouse_id | Warehouse | many2one | stock.warehouse | false | true |  |  |
| storage_category_id | Storage Category | many2one | stock.storage.category | false | false |  |  |
| outgoing_move_line_ids | Outgoing Move Line | one2many | stock.move.line | false | false |  |  |
| incoming_move_line_ids | Incoming Move Line | one2many | stock.move.line | false | false |  |  |
| net_weight | Net Weight | float |  | false | true |  |  |
| forecast_weight | Forecasted Weight | float |  | false | true |  |  |
| is_empty | Is Empty | boolean |  | false | true |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| valuation_in_account_id | Stock Valuation Account (Incoming) | many2one | account.account | false | false |  | Used for real-time inventory valuation. When set on a virtual location (non internal type), this account will be used to hold the value of products being moved from an internal location into this location, instead of the generic Stock Output Account set on the product. This has no effect for internal locations. |
| valuation_out_account_id | Stock Valuation Account (Outgoing) | many2one | account.account | false | false |  | Used for real-time inventory valuation. When set on a virtual location (non internal type), this account will be used to hold the value of products being moved out of this location and into an internal location, instead of the generic Stock Output Account set on the product. This has no effect for internal locations. |

## stock.warehouse

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| name | Warehouse | char |  | true | false |  |  |
| active | Active | boolean |  | false | false |  |  |
| company_id | Company | many2one | res.company | true | true |  | The company is automatically set from your user preferences. |
| partner_id | Address | many2one | res.partner | false | false |  |  |
| view_location_id | View Location | many2one | stock.location | true | false |  |  |
| lot_stock_id | Location Stock | many2one | stock.location | true | false |  |  |
| code | Short Name | char |  | true | false |  | Short name used to identify your warehouse |
| route_ids | Routes | many2many | stock.route | false | false |  | Defaults routes through the warehouse |
| reception_steps | Incoming Shipments | selection |  | true | false | [["one_step","Receive and Store (1 step)"],["two_steps","Receive then Store (2 steps)"],["three_steps","Receive, Quality Control, then Store (3 steps)"]] | Default incoming route to follow |
| delivery_steps | Outgoing Shipments | selection |  | true | false | [["ship_only","Deliver (1 step)"],["pick_ship","Pick then Deliver (2 steps)"],["pick_pack_ship","Pick, Pack, then Deliver (3 steps)"]] | Default outgoing route to follow |
| wh_input_stock_loc_id | Input Location | many2one | stock.location | false | false |  |  |
| wh_qc_stock_loc_id | Quality Control Location | many2one | stock.location | false | false |  |  |
| wh_output_stock_loc_id | Output Location | many2one | stock.location | false | false |  |  |
| wh_pack_stock_loc_id | Packing Location | many2one | stock.location | false | false |  |  |
| mto_pull_id | MTO rule | many2one | stock.rule | false | false |  |  |
| pick_type_id | Pick Type | many2one | stock.picking.type | false | false |  |  |
| pack_type_id | Pack Type | many2one | stock.picking.type | false | false |  |  |
| out_type_id | Out Type | many2one | stock.picking.type | false | false |  |  |
| in_type_id | In Type | many2one | stock.picking.type | false | false |  |  |
| int_type_id | Internal Type | many2one | stock.picking.type | false | false |  |  |
| qc_type_id | Quality Control Type | many2one | stock.picking.type | false | false |  |  |
| store_type_id | Storage Type | many2one | stock.picking.type | false | false |  |  |
| xdock_type_id | Cross Dock Type | many2one | stock.picking.type | false | false |  |  |
| crossdock_route_id | Crossdock Route | many2one | stock.route | false | false |  |  |
| reception_route_id | Receipt Route | many2one | stock.route | false | false |  |  |
| delivery_route_id | Delivery Route | many2one | stock.route | false | false |  |  |
| resupply_wh_ids | Resupply From | many2many | stock.warehouse | false | false |  | Routes will be created automatically to resupply this warehouse from the warehouses ticked |
| resupply_route_ids | Resupply Routes | one2many | stock.route | false | false |  | Routes will be created for these resupply warehouses and you can select them on products and product categories |
| sequence | Sequence | integer |  | false | false |  | Gives the sequence of this line when displaying the warehouses. |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| branch_id | Branch | many2one | coc.branch | true | false |  | The branch this warehouse belongs to |
| buy_to_resupply | Buy to Resupply | boolean |  | false | false |  | When products are bought, they can be delivered to this warehouse |
| buy_pull_id | Buy rule | many2one | stock.rule | false | false |  |  |

## stock.move

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| name | Description | char |  | true | false |  |  |
| sequence | Sequence | integer |  | false | false |  |  |
| priority | Priority | selection |  | false | true | [["0","Normal"],["1","Urgent"]] |  |
| date | Date Scheduled | datetime |  | true | false |  | Scheduled date until move is done, then date of actual move processing |
| date_deadline | Deadline | datetime |  | false | true |  | In case of outgoing flow, validate the transfer before this date to allow to deliver at promised date to the customer.         In case of incoming flow, validate the transfer before this date in order to have these products in stock at the date promised by the supplier |
| company_id | Company | many2one | res.company | true | false |  |  |
| product_id | Product | many2one | product.product | true | false |  |  |
| never_product_template_attribute_value_ids | Never attribute Values | many2many | product.template.attribute.value | false | false |  |  |
| description_picking | Description of Picking | text |  | false | false |  |  |
| product_qty | Real Quantity | float |  | false | false |  | Quantity in the default UoM of the product |
| product_uom_qty | Demand | float |  | true | false |  | This is the quantity of product that is planned to be moved.Lowering this quantity does not generate a backorder.Changing this quantity on assigned moves affects the product reservation, and should be done with care. |
| product_uom | UoM | many2one | uom.uom | true | false |  |  |
| product_uom_category_id | Category | many2one | uom.category | false | true |  | Conversion between Units of Measure can only occur if they belong to the same category. The conversion will be made based on the ratios. |
| product_tmpl_id | Product Template | many2one | product.template | false | true |  |  |
| location_id | Source Location | many2one | stock.location | true | false |  | The operation takes and suggests products from this location. |
| location_dest_id | Intermediate Location | many2one | stock.location | true | false |  | The operations brings product to this location |
| location_final_id | Final Location | many2one | stock.location | false | false |  | The operation brings the products to the intermediate location.But this operation is part of a chain of operations targeting the final location. |
| location_usage | Source Location Type | selection |  | false | true | [["supplier","Vendor Location"],["view","View"],["internal","Internal Location"],["customer","Customer Location"],["inventory","Inventory Loss"],["production","Production"],["transit","Transit Location"]] | * Vendor Location: Virtual location representing the source location for products coming from your vendors * View: Virtual location used to create a hierarchical structures for your warehouse, aggregating its child locations ; can't directly contain products * Internal Location: Physical locations inside your own warehouses, * Customer Location: Virtual location representing the destination location for products sent to your customers * Inventory Loss: Virtual location serving as counterpart for inventory operations used to correct stock levels (Physical inventories) * Production: Virtual counterpart location for production operations: this location consumes the components and produces finished products * Transit Location: Counterpart location that should be used in inter-company or inter-warehouses operations |
| location_dest_usage | Destination Location Type | selection |  | false | true | [["supplier","Vendor Location"],["view","View"],["internal","Internal Location"],["customer","Customer Location"],["inventory","Inventory Loss"],["production","Production"],["transit","Transit Location"]] | * Vendor Location: Virtual location representing the source location for products coming from your vendors * View: Virtual location used to create a hierarchical structures for your warehouse, aggregating its child locations ; can't directly contain products * Internal Location: Physical locations inside your own warehouses, * Customer Location: Virtual location representing the destination location for products sent to your customers * Inventory Loss: Virtual location serving as counterpart for inventory operations used to correct stock levels (Physical inventories) * Production: Virtual counterpart location for production operations: this location consumes the components and produces finished products * Transit Location: Counterpart location that should be used in inter-company or inter-warehouses operations |
| partner_id | Destination Address  | many2one | res.partner | false | false |  | Optional address where goods are to be delivered, specifically used for allotment |
| move_dest_ids | Destination Moves | many2many | stock.move | false | false |  | Optional: next stock move when chaining them |
| move_orig_ids | Original Move | many2many | stock.move | false | false |  | Optional: previous stock move when chaining them |
| picking_id | Transfer | many2one | stock.picking | false | false |  |  |
| state | Status | selection |  | false | true | [["draft","New"],["waiting","Waiting Another Move"],["confirmed","Waiting Availability"],["partially_available","Partially Available"],["assigned","Available"],["done","Done"],["cancel","Cancelled"]] | * New: The stock move is created but not confirmed. * Waiting Another Move: A linked stock move should be done before this one. * Waiting Availability: The stock move is confirmed but the product can't be reserved. * Available: The product of the stock move is reserved. * Done: The product has been transferred and the transfer has been confirmed. |
| picked | Picked | boolean |  | false | false |  | This checkbox is just indicative, it doesn't validate or generate any product moves. |
| price_unit | Unit Price | float |  | false | false |  |  |
| origin | Source Document | char |  | false | false |  |  |
| procure_method | Supply Method | selection |  | true | false | [["make_to_stock","Default: Take From Stock"],["make_to_order","Advanced: Apply Procurement Rules"]] | By default, the system will take from the stock in the source location and passively wait for availability. The other possibility allows you to directly create a procurement on the source location (and thus ignore its current stock) to gather products. If we want to chain moves and have this one to wait for the previous, this second option should be chosen. |
| scrapped | Scrapped | boolean |  | false | true |  | Check this box to allow using this location to put scrapped/damaged goods. |
| scrap_id | Scrap operation | many2one | stock.scrap | false | true |  |  |
| group_id | Procurement Group | many2one | procurement.group | false | false |  |  |
| rule_id | Stock Rule | many2one | stock.rule | false | false |  | The stock rule that created this stock move |
| propagate_cancel | Propagate cancel and split | boolean |  | false | false |  | If checked, when this move is cancelled, cancel the linked move too |
| delay_alert_date | Delay Alert Date | datetime |  | false | true |  | Process at this date to be on time |
| picking_type_id | Operation Type | many2one | stock.picking.type | false | false |  |  |
| is_inventory | Inventory | boolean |  | false | false |  |  |
| move_line_ids | Move Line | one2many | stock.move.line | false | false |  |  |
| origin_returned_move_id | Origin return move | many2one | stock.move | false | false |  | Move that created the return move |
| returned_move_ids | All returned moves | one2many | stock.move | false | false |  | Optional: all returned moves created from this move |
| availability | Forecasted Quantity | float |  | false | true |  | Quantity in stock that can still be reserved for this move |
| restrict_partner_id | Owner  | many2one | res.partner | false | false |  |  |
| route_ids | Destination route | many2many | stock.route | false | false |  | Preferred route |
| warehouse_id | Warehouse | many2one | stock.warehouse | false | false |  | the warehouse to consider for the route selection on the next procurement (if any). |
| has_tracking | Product with Tracking | selection |  | false | true | [["serial","By Unique Serial Number"],["lot","By Lots"],["none","By Quantity"]] | Ensure the traceability of a storable product in your warehouse. |
| quantity | Quantity | float |  | false | false |  |  |
| show_operations | Show Detailed Operations | boolean |  | false | true |  | If this checkbox is ticked, the pickings lines will represent detailed stock operations. If not, the picking lines will represent an aggregate of detailed stock operations. |
| picking_code | Type of Operation | selection |  | false | true | [["incoming","Receipt"],["outgoing","Delivery"],["internal","Internal Transfer"]] |  |
| show_details_visible | Details Visible | boolean |  | false | true |  |  |
| is_storable | Track Inventory | boolean |  | false | true |  | A storable product is a product for which you manage stock. |
| additional | Whether the move was added after the picking's confirmation | boolean |  | false | false |  |  |
| is_locked | Is Locked | boolean |  | false | true |  |  |
| is_initial_demand_editable | Is initial demand editable | boolean |  | false | true |  |  |
| is_quantity_done_editable | Is quantity done editable | boolean |  | false | true |  |  |
| reference | Reference | char |  | false | true |  |  |
| move_lines_count | Move Lines Count | integer |  | false | true |  |  |
| package_level_id | Package Level | many2one | stock.package_level | false | false |  |  |
| picking_type_entire_packs | Move Entire Packages | boolean |  | false | true |  | If ticked, you will be able to select entire packages to move |
| display_assign_serial | Display Assign Serial | boolean |  | false | true |  |  |
| display_import_lot | Display Import Lot | boolean |  | false | true |  |  |
| next_serial | First SN/Lot | char |  | false | false |  |  |
| next_serial_count | Number of SN/Lots | integer |  | false | false |  |  |
| orderpoint_id | Original Reordering Rule | many2one | stock.warehouse.orderpoint | false | false |  |  |
| forecast_availability | Forecast Availability | float |  | false | true |  |  |
| forecast_expected_date | Forecasted Expected date | datetime |  | false | true |  |  |
| lot_ids | Serial Numbers | many2many | stock.lot | false | false |  |  |
| reservation_date | Date to Reserve | date |  | false | true |  | Computes when a move should be reserved |
| product_packaging_id | Packaging | many2one | product.packaging | false | false |  |  |
| product_packaging_qty | Reserved Packaging Quantity | float |  | false | true |  |  |
| product_packaging_quantity | Done Packaging Quantity | float |  | false | true |  |  |
| show_quant | Show Quant | boolean |  | false | true |  |  |
| show_lots_m2o | Show lot_id | boolean |  | false | true |  |  |
| show_lots_text | Show lot_name | boolean |  | false | true |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| coc_transfer_type | COC Transfer Type | selection |  | false | false | [["internal","Internal Transfer"],["receive","Purchase Order Receipt"],["sale","Customer Sale"],["adjustment","Manual Adjustment"],["count","Stock Count Adjustment"]] | Type of COC transfer |
| coc_reference | COC Reference | char |  | false | false |  | Reference to PO, Invoice, or other document |
| coc_reason | Transfer Reason | text |  | false | false |  | Why this transfer was made |
| coc_user_id | COC User | many2one | res.users | false | false |  | User who initiated transfer from COC system |
| to_refund | Update quantities on SO/PO | boolean |  | false | false |  | Trigger a decrease of the delivered/received quantity in the associated Sale Order/Purchase Order |
| account_move_ids | Account Move | one2many | account.move | false | false |  |  |
| stock_valuation_layer_ids | Stock Valuation Layer | one2many | stock.valuation.layer | false | false |  |  |
| analytic_account_line_ids | Analytic Account Line | many2many | account.analytic.line | false | false |  |  |
| purchase_line_id | Purchase Order Line | many2one | purchase.order.line | false | true |  |  |
| created_purchase_line_ids | Created Purchase Order Lines | many2many | purchase.order.line | false | false |  |  |
| sale_line_id | Sale Line | many2one | sale.order.line | false | false |  |  |

## account.move.line

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| analytic_distribution | Analytic Distribution | json |  | false | false |  |  |
| analytic_precision | Analytic Precision | integer |  | false | false |  |  |
| distribution_analytic_account_ids | Distribution Analytic Account | many2many | account.analytic.account | false | true |  |  |
| move_id | Journal Entry | many2one | account.move | true | true |  |  |
| journal_id | Journal | many2one | account.journal | false | true |  |  |
| journal_group_id | Ledger | many2one | account.journal.group | false | false |  |  |
| company_id | Company | many2one | res.company | false | true |  |  |
| company_currency_id | Company Currency | many2one | res.currency | false | true |  |  |
| move_name | Number | char |  | false | true |  |  |
| parent_state | Status | selection |  | false | true | [["draft","Draft"],["posted","Posted"],["cancel","Cancelled"]] |  |
| date | Date | date |  | false | true |  |  |
| invoice_date | Invoice/Bill Date | date |  | false | true |  |  |
| ref | Reference | char |  | false | true |  |  |
| is_storno | Company Storno Accounting | boolean |  | false | true |  | Utility field to express whether the journal item is subject to storno accounting |
| sequence | Sequence | integer |  | false | false |  |  |
| move_type | Type | selection |  | false | true | [["entry","Journal Entry"],["out_invoice","Customer Invoice"],["out_refund","Customer Credit Note"],["in_invoice","Vendor Bill"],["in_refund","Vendor Credit Note"],["out_receipt","Sales Receipt"],["in_receipt","Purchase Receipt"]] |  |
| account_id | Account | many2one | account.account | false | false |  |  |
| account_name | Account Name | char |  | false | true |  |  |
| account_code | Code | char |  | false | true |  |  |
| name | Label | char |  | false | false |  |  |
| debit | Debit | monetary |  | false | false |  |  |
| credit | Credit | monetary |  | false | false |  |  |
| balance | Balance | monetary |  | false | false |  |  |
| cumulated_balance | Cumulated Balance | monetary |  | false | true |  | Cumulated balance depending on the domain and the order chosen in the view. |
| currency_rate | Currency Rate | float |  | false | true |  | Currency rate from company currency to document currency. |
| amount_currency | Amount in Currency | monetary |  | false | false |  | The amount expressed in an optional other currency if it is a multi-currency entry. |
| currency_id | Currency | many2one | res.currency | true | false |  |  |
| is_same_currency | Is Same Currency | boolean |  | false | true |  |  |
| partner_id | Partner | many2one | res.partner | false | false |  |  |
| is_imported | Is Imported | boolean |  | false | false |  |  |
| reconcile_model_id | Reconciliation Model | many2one | account.reconcile.model | false | true |  |  |
| payment_id | Originator Payment | many2one | account.payment | false | true |  | The payment that created this entry |
| statement_line_id | Originator Statement Line | many2one | account.bank.statement.line | false | true |  | The statement line that created this entry |
| statement_id | Statement | many2one | account.bank.statement | false | true |  | The bank statement used for bank reconciliation |
| commercial_partner_country | Commercial Partner Country | many2one | res.country | false | true |  |  |
| tax_ids | Taxes | many2many | account.tax | false | false |  |  |
| group_tax_id | Originator Group of Taxes | many2one | account.tax | false | false |  |  |
| tax_line_id | Originator Tax | many2one | account.tax | false | true |  | Indicates that this journal item is a tax line |
| tax_group_id | Originator tax group | many2one | account.tax.group | false | true |  |  |
| tax_base_amount | Base Amount | monetary |  | false | true |  |  |
| tax_repartition_line_id | Originator Tax Distribution Line | many2one | account.tax.repartition.line | false | true |  | Tax distribution line that caused the creation of this move line, if any |
| tax_tag_ids | Tags | many2many | account.account.tag | false | false |  | Tags assigned to this line by the tax creating it, if any. It determines its impact on financial reports. |
| tax_tag_invert | Invert Tags | boolean |  | false | false |  |  |
| amount_residual | Residual Amount | monetary |  | false | true |  | The residual amount on a journal item expressed in the company currency. |
| amount_residual_currency | Residual Amount in Currency | monetary |  | false | true |  | The residual amount on a journal item expressed in its currency (possibly not the company currency). |
| reconciled | Reconciled | boolean |  | false | true |  |  |
| full_reconcile_id | Matching | many2one | account.full.reconcile | false | true |  |  |
| matched_debit_ids | Matched Debits | one2many | account.partial.reconcile | false | true |  | Debit journal items that are matched with this journal item. |
| matched_credit_ids | Matched Credits | one2many | account.partial.reconcile | false | true |  | Credit journal items that are matched with this journal item. |
| matching_number | Matching # | char |  | false | false |  | Matching number for this line, 'P' if it is only partially reconcile, or the name of the full reconcile if it exists. |
| is_account_reconcile | Account Reconcile | boolean |  | false | true |  | Check this box if this account allows invoices & payments matching of journal items. |
| account_type | Internal Type | selection |  | false | true | [["asset_receivable","Receivable"],["asset_cash","Bank and Cash"],["asset_current","Current Assets"],["asset_non_current","Non-current Assets"],["asset_prepayments","Prepayments"],["asset_fixed","Fixed Assets"],["liability_payable","Payable"],["liability_credit_card","Credit Card"],["liability_current","Current Liabilities"],["liability_non_current","Non-current Liabilities"],["equity","Equity"],["equity_unaffected","Current Year Earnings"],["income","Income"],["income_other","Other Income"],["expense","Expenses"],["expense_depreciation","Depreciation"],["expense_direct_cost","Cost of Revenue"],["off_balance","Off-Balance Sheet"]] | Account Type is used for information purpose, to generate country-specific legal reports, and set the rules to close a fiscal year and generate opening entries. |
| account_internal_group | Internal Group | selection |  | false | true | [["equity","Equity"],["asset","Asset"],["liability","Liability"],["income","Income"],["expense","Expense"],["off","Off Balance"]] |  |
| account_root_id | Account Root | many2one | account.root | false | true |  |  |
| product_category_id | Product Category | many2one | product.category | false | true |  |  |
| display_type | Display Type | selection |  | true | false | [["product","Product"],["cogs","Cost of Goods Sold"],["tax","Tax"],["discount","Discount"],["rounding","Rounding"],["payment_term","Payment Term"],["line_section","Section"],["line_note","Note"],["epd","Early Payment Discount"]] |  |
| product_id | Product | many2one | product.product | false | false |  |  |
| product_uom_id | Unit of Measure | many2one | uom.uom | false | false |  |  |
| product_uom_category_id | Category | many2one | uom.category | false | true |  | Conversion between Units of Measure can only occur if they belong to the same category. The conversion will be made based on the ratios. |
| quantity | Quantity | float |  | false | false |  | The optional quantity expressed by this line, eg: number of product sold. The quantity is not a legal requirement but is very useful for some reports. |
| date_maturity | Due Date | date |  | false | false |  | This field is used for payable and receivable journal entries. You can put the limit date for the payment of this line. |
| price_unit | Unit Price | float |  | false | false |  |  |
| price_subtotal | Subtotal | monetary |  | false | true |  |  |
| price_total | Total | monetary |  | false | true |  |  |
| discount | Discount (%) | float |  | false | false |  |  |
| tax_calculation_rounding_method | Tax calculation rounding method | selection |  | false | true | [["round_per_line","Round per Line"],["round_globally","Round Globally"]] |  |
| term_key | Term Key | binary |  | false | true |  |  |
| epd_key | Epd Key | binary |  | false | true |  |  |
| epd_needed | Epd Needed | binary |  | false | true |  |  |
| epd_dirty | Epd Dirty | boolean |  | false | true |  |  |
| discount_allocation_key | Discount Allocation Key | binary |  | false | true |  |  |
| discount_allocation_needed | Discount Allocation Needed | binary |  | false | true |  |  |
| discount_allocation_dirty | Discount Allocation Dirty | boolean |  | false | true |  |  |
| analytic_line_ids | Analytic lines | one2many | account.analytic.line | false | false |  |  |
| discount_date | Discount Date | date |  | false | true |  | Last date at which the discounted amount must be paid in order for the Early Payment Discount to be granted |
| discount_amount_currency | Discount amount in Currency | monetary |  | false | false |  |  |
| discount_balance | Discount Balance | monetary |  | false | false |  |  |
| payment_date | Next Payment Date | date |  | false | true |  |  |
| is_refund | Is Refund | boolean |  | false | true |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| expense_id | Expense | many2one | hr.expense | false | false |  |  |
| is_downpayment | Is Downpayment | boolean |  | false | false |  |  |
| purchase_line_id | Purchase Order Line | many2one | purchase.order.line | false | false |  |  |
| purchase_order_id | Purchase Order | many2one | purchase.order | false | true |  |  |
| stock_valuation_layer_ids | Stock Valuation Layer | one2many | stock.valuation.layer | false | false |  |  |
| cogs_origin_id | Cogs Origin | many2one | account.move.line | false | false |  |  |
| sale_line_ids | Sales Order Lines | many2many | sale.order.line | false | true |  |  |

## account.move

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| name | Number | char |  | false | false |  |  |
| date | Date | date |  | true | false |  |  |
| state | Status | selection |  | true | true | [["draft","Draft"],["posted","Posted"],["cancel","Cancelled"]] |  |
| move_type | Type | selection |  | true | true | [["entry","Journal Entry"],["out_invoice","Customer Invoice"],["out_refund","Customer Credit Note"],["in_invoice","Vendor Bill"],["in_refund","Vendor Credit Note"],["out_receipt","Sales Receipt"],["in_receipt","Purchase Receipt"]] |  |
| journal_id | Journal | many2one | account.journal | true | false |  |  |
| invoice_line_ids | Invoice lines | one2many | account.move.line | false | false |  |  |
| invoice_date | Invoice/Bill Date | date |  | false | false |  |  |
| invoice_date_due | Due Date | date |  | false | false |  |  |
| partner_id | Partner | many2one | res.partner | false | false |  |  |
| currency_id | Currency | many2one | res.currency | true | false |  |  |
| amount_untaxed | Untaxed Amount | monetary |  | false | true |  |  |
| amount_tax | Tax | monetary |  | false | true |  |  |
| amount_total | Total | monetary |  | false | true |  |  |
| amount_residual | Amount Due | monetary |  | false | true |  |  |
| amount_untaxed_signed | Untaxed Amount Signed | monetary |  | false | true |  |  |
| amount_total_signed | Total Signed | monetary |  | false | true |  |  |
| amount_residual_signed | Amount Due Signed | monetary |  | false | true |  |  |
| payment_state | Payment Status | selection |  | false | true | [["not_paid","Not Paid"],["in_payment","In Payment"],["paid","Paid"],["partial","Partially Paid"],["reversed","Reversed"],["blocked","Blocked"],["invoicing_legacy","Invoicing App Legacy"]] |  |
| reversed_entry_id | Reversal of | many2one | account.move | false | true |  |  |
| invoice_user_id | Salesperson | many2one | res.users | false | false |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| coc_salesperson | Sales Person | char |  | false | false |  |  |
| coc_cashier | Cashier | char |  | false | false |  |  |
| branch_id | Branch | many2one | coc.branch | false | false |  | Branch for this invoice. Auto-selects the correct journal. |
| coc_sales_channel | Sales Channel | selection |  | false | false | [["store","Store"],["online","Online"],["noon","Noon"],["jumia","Jumia"],["amazon","Amazon"],["facebook","Facebook"],["instagram","Instagram"],["whatsapp","WhatsApp"],["tiktok","TikTok"],["website","Website"]] | Sales channel for Ecommerce branch invoices |

## product.template

| Field | Label | Type | Relation | Required | Readonly | Selection | Help |
| --- | --- | --- | --- | --- | --- | --- | --- |
| image_1920 | Image | binary |  | false | false |  |  |
| image_1024 | Image 1024 | binary |  | false | true |  |  |
| image_512 | Image 512 | binary |  | false | true |  |  |
| image_256 | Image 256 | binary |  | false | true |  |  |
| image_128 | Image 128 | binary |  | false | true |  |  |
| activity_ids | Activities | one2many | mail.activity | false | false |  |  |
| activity_state | Activity State | selection |  | false | true | [["overdue","Overdue"],["today","Today"],["planned","Planned"]] | Status based on activities Overdue: Due date is already passed Today: Activity date is today Planned: Future activities. |
| activity_user_id | Responsible User | many2one | res.users | false | true |  |  |
| activity_type_id | Next Activity Type | many2one | mail.activity.type | false | false |  |  |
| activity_type_icon | Activity Type Icon | char |  | false | true |  | Font awesome icon e.g. fa-tasks |
| activity_date_deadline | Next Activity Deadline | date |  | false | true |  |  |
| my_activity_date_deadline | My Activity Deadline | date |  | false | true |  |  |
| activity_summary | Next Activity Summary | char |  | false | false |  |  |
| activity_exception_decoration | Activity Exception Decoration | selection |  | false | true | [["warning","Alert"],["danger","Error"]] | Type of the exception activity on record. |
| activity_exception_icon | Icon | char |  | false | true |  | Icon to indicate an exception activity. |
| message_is_follower | Is Follower | boolean |  | false | true |  |  |
| message_follower_ids | Followers | one2many | mail.followers | false | false |  |  |
| message_partner_ids | Followers (Partners) | many2many | res.partner | false | false |  |  |
| message_ids | Messages | one2many | mail.message | false | false |  |  |
| has_message | Has Message | boolean |  | false | true |  |  |
| message_needaction | Action Needed | boolean |  | false | true |  | If checked, new messages require your attention. |
| message_needaction_counter | Number of Actions | integer |  | false | true |  | Number of messages requiring action |
| message_has_error | Message Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| message_has_error_counter | Number of errors | integer |  | false | true |  | Number of messages with delivery error |
| message_attachment_count | Attachment Count | integer |  | false | true |  |  |
| website_message_ids | Website Messages | one2many | mail.message | false | false |  | Website communication history |
| message_has_sms_error | SMS Delivery error | boolean |  | false | true |  | If checked, some messages have a delivery error. |
| name | Name | char |  | true | false |  |  |
| sequence | Sequence | integer |  | false | false |  | Gives the sequence order when displaying a product list |
| description | Description | html |  | false | false |  |  |
| description_purchase | Purchase Description | text |  | false | false |  |  |
| description_sale | Sales Description | text |  | false | false |  | A description of the Product that you want to communicate to your customers. This description will be copied to every Sales Order, Delivery Order and Customer Invoice/Credit Note |
| type | Product Type | selection |  | true | false | [["consu","Goods"],["service","Service"],["combo","Combo"]] | Goods are tangible materials and merchandise you provide. A service is a non-material product you provide. |
| combo_ids | Combo Choices | many2many | product.combo | false | false |  |  |
| service_tracking | Create on Order | selection |  | true | false | [["no","Nothing"]] |  |
| categ_id | Product Category | many2one | product.category | true | false |  |  |
| currency_id | Currency | many2one | res.currency | false | true |  |  |
| cost_currency_id | Cost Currency | many2one | res.currency | false | true |  |  |
| list_price | Sales Price | float |  | false | false |  | Price at which the product is sold to customers. |
| standard_price | Cost | float |  | false | false |  | Value of the product (automatically computed in AVCO).         Used to value the product when the purchase cost is not known (e.g. inventory adjustment).         Used to compute margins on sale orders. |
| volume | Volume | float |  | false | false |  |  |
| volume_uom_name | Volume unit of measure label | char |  | false | true |  |  |
| weight | Weight | float |  | false | false |  |  |
| weight_uom_name | Weight unit of measure label | char |  | false | true |  |  |
| sale_ok | Sales | boolean |  | false | false |  |  |
| purchase_ok | Purchase | boolean |  | false | false |  |  |
| uom_id | Unit of Measure | many2one | uom.uom | true | false |  | Default unit of measure used for all stock operations. |
| uom_name | Unit of Measure Name | char |  | false | true |  |  |
| uom_category_id | UoM Category | many2one | uom.category | false | true |  | Conversion between Units of Measure can only occur if they belong to the same category. The conversion will be made based on the ratios. |
| uom_po_id | Purchase Unit | many2one | uom.uom | true | false |  | Default unit of measure used for purchase orders. It must be in the same category as the default unit of measure. |
| company_id | Company | many2one | res.company | false | false |  |  |
| packaging_ids | Product Packages | one2many | product.packaging | false | false |  | Gives the different ways to package the same product. |
| seller_ids | Vendors | one2many | product.supplierinfo | false | false |  |  |
| variant_seller_ids | Variant Seller | one2many | product.supplierinfo | false | false |  |  |
| active | Active | boolean |  | false | false |  | If unchecked, it will allow you to hide the product without removing it. |
| color | Color Index | integer |  | false | false |  |  |
| is_product_variant | Is a product variant | boolean |  | false | true |  |  |
| attribute_line_ids | Product Attributes | one2many | product.template.attribute.line | false | false |  |  |
| valid_product_template_attribute_line_ids | Valid Product Attribute Lines | many2many | product.template.attribute.line | false | true |  |  |
| product_variant_ids | Products | one2many | product.product | true | false |  |  |
| product_variant_id | Product | many2one | product.product | false | true |  |  |
| product_variant_count | # Product Variants | integer |  | false | true |  |  |
| barcode | Barcode | char |  | false | false |  |  |
| default_code | Internal Reference | char |  | false | false |  |  |
| pricelist_item_count | Number of price rules | integer |  | false | true |  |  |
| product_document_ids | Documents | one2many | product.document | false | false |  |  |
| product_document_count | Documents Count | integer |  | false | true |  |  |
| can_image_1024_be_zoomed | Can Image 1024 be zoomed | boolean |  | false | true |  |  |
| has_configurable_attributes | Is a configurable product | boolean |  | false | true |  |  |
| product_tooltip | Product Tooltip | char |  | false | true |  |  |
| is_favorite | Favorite | boolean |  | false | false |  |  |
| product_tag_ids | Tags | many2many | product.tag | false | false |  |  |
| product_properties | Properties | properties |  | false | false |  |  |
| id | ID | integer |  | false | true |  |  |
| display_name | Display Name | char |  | false | true |  |  |
| create_uid | Created by | many2one | res.users | false | true |  |  |
| create_date | Created on | datetime |  | false | true |  |  |
| write_uid | Last Updated by | many2one | res.users | false | true |  |  |
| write_date | Last Updated on | datetime |  | false | true |  |  |
| taxes_id | Sales Taxes | many2many | account.tax | false | false |  | Default taxes used when selling the product |
| tax_string | Tax String | char |  | false | true |  |  |
| supplier_taxes_id | Purchase Taxes | many2many | account.tax | false | false |  | Default taxes used when buying the product |
| property_account_income_id | Income Account | many2one | account.account | false | false |  | Keep this field empty to use the default value from the product category. |
| property_account_expense_id | Expense Account | many2one | account.account | false | false |  | Keep this field empty to use the default value from the product category. If anglo-saxon accounting with automated valuation method is configured, the expense account on the product category will be used. |
| account_tag_ids | Account Tags | many2many | account.account.tag | false | false |  | Tags to be set on the base and tax journal items created for this product. |
| fiscal_country_codes | Fiscal Country Codes | char |  | false | true |  |  |
| is_storable | Track Inventory | boolean |  | false | false |  | A storable product is a product for which you manage stock. |
| responsible_id | Responsible | many2one | res.users | false | false |  | This user will be responsible of the next activities related to logistic operations for this product. |
| property_stock_production | Production Location | many2one | stock.location | false | false |  | This stock location will be used, instead of the default one, as the source location for stock moves generated by manufacturing orders. |
| property_stock_inventory | Inventory Location | many2one | stock.location | false | false |  | This stock location will be used, instead of the default one, as the source location for stock moves generated when you do an inventory. |
| sale_delay | Customer Lead Time | integer |  | false | false |  | Delivery lead time, in days. It's the number of days, promised to the customer, between the confirmation of the sales order and the delivery. |
| tracking | Tracking | selection |  | true | false | [["serial","By Unique Serial Number"],["lot","By Lots"],["none","By Quantity"]] | Ensure the traceability of a storable product in your warehouse. |
| description_picking | Description on Picking | text |  | false | false |  |  |
| description_pickingout | Description on Delivery Orders | text |  | false | false |  |  |
| description_pickingin | Description on Receptions | text |  | false | false |  |  |
| qty_available | Quantity On Hand | float |  | false | true |  |  |
| virtual_available | Forecasted Quantity | float |  | false | true |  |  |
| incoming_qty | Incoming | float |  | false | true |  |  |
| outgoing_qty | Outgoing | float |  | false | true |  |  |
| location_id | Location | many2one | stock.location | false | false |  |  |
| warehouse_id | Warehouse | many2one | stock.warehouse | false | false |  |  |
| has_available_route_ids | Routes can be selected on this product | boolean |  | false | true |  |  |
| route_ids | Routes | many2many | stock.route | false | false |  | Depending on the modules installed, this will allow you to define the route of the product: whether it will be bought, manufactured, replenished on order, etc. |
| nbr_moves_in | Nbr Moves In | integer |  | false | true |  | Number of incoming stock moves in the past 12 months |
| nbr_moves_out | Nbr Moves Out | integer |  | false | true |  | Number of outgoing stock moves in the past 12 months |
| nbr_reordering_rules | Reordering Rules | integer |  | false | true |  |  |
| reordering_min_qty | Reordering Min Qty | float |  | false | true |  |  |
| reordering_max_qty | Reordering Max Qty | float |  | false | true |  |  |
| route_from_categ_ids | Category Routes | many2many | stock.route | false | true |  |  |
| show_on_hand_qty_status_button | Show On Hand Qty Status Button | boolean |  | false | true |  |  |
| show_forecasted_qty_status_button | Show Forecasted Qty Status Button | boolean |  | false | true |  |  |
| can_be_expensed | Expenses | boolean |  | false | false |  | Specify whether the product can be selected in an expense. |
| purchased_product_qty | Purchased | float |  | false | true |  |  |
| purchase_method | Control Policy | selection |  | false | false | [["purchase","On ordered quantities"],["receive","On received quantities"]] | On ordered quantities: Control bills based on ordered quantities. On received quantities: Control bills based on received quantities. |
| purchase_line_warn | Purchase Order Line Warning | selection |  | true | false | [["no-message","No Message"],["warning","Warning"],["block","Blocking Message"]] | Selecting the "Warning" option will notify user with the message, Selecting "Blocking Message" will throw an exception with the message and block the flow. The Message has to be written in the next field. |
| purchase_line_warn_msg | Message for Purchase Order Line | text |  | false | false |  |  |
| cost_method | Costing Method | selection |  | false | true | [["standard","Standard Price"],["fifo","First In First Out (FIFO)"],["average","Average Cost (AVCO)"]] | Standard Price: The products are valued at their standard cost defined on the product.         Average Cost (AVCO): The products are valued at weighted average cost.         First In First Out (FIFO): The products are valued supposing those that enter the company first will also leave it first.          |
| valuation | Inventory Valuation | selection |  | false | true | [["manual_periodic","Manual"],["real_time","Automated"]] | Manual: The accounting entries to value the inventory are not posted automatically.         Automated: An accounting entry is automatically created to value the inventory when a product enters or leaves the company.          |
| lot_valuated | Valuation by Lot/Serial number | boolean |  | false | false |  | If checked, the valuation will be specific by Lot/Serial number. |
| property_account_creditor_price_difference | Price Difference Account | many2one | account.account | false | false |  | This account is used in automated inventory valuation to record the price difference between a purchase order and its related vendor bill when validating this vendor bill. |
| service_type | Track Service | selection |  | false | false | [["manual","Manually set quantities on order"]] | Manually set quantities on order: Invoice based on the manually entered quantity, without creating an analytic account. Timesheets on contract: Invoice based on the tracked hours on the related timesheet. Create a task and track hours: Create a task on the sales order validation and track the work hours. |
| sale_line_warn | Sales Order Line | selection |  | true | false | [["no-message","No Message"],["warning","Warning"],["block","Blocking Message"]] | Selecting the "Warning" option will notify user with the message, Selecting "Blocking Message" will throw an exception with the message and block the flow. The Message has to be written in the next field. |
| sale_line_warn_msg | Message for Sales Order Line | text |  | false | false |  |  |
| expense_policy | Re-Invoice Costs | selection |  | false | false | [["no","No"],["cost","At cost"],["sales_price","Sales price"]] | Validated expenses, vendor bills, or stock pickings (set up to track costs) can be invoiced to the customer at either cost or sales price. |
| visible_expense_policy | Re-Invoice Policy visible | boolean |  | false | true |  |  |
| sales_count | Sold | float |  | false | true |  |  |
| invoice_policy | Invoicing Policy | selection |  | false | false | [["order","Ordered quantities"],["delivery","Delivered quantities"]] | Ordered Quantity: Invoice quantities ordered by the customer. Delivered Quantity: Invoice quantities delivered to the customer. |
| optional_product_ids | Optional Products | many2many | product.template | false | false |  | Optional Products are suggested whenever the customer hits *Add to Cart* (cross-sell strategy, e.g. for computers: warranty, software, etc.). |
| service_to_purchase | Subcontract Service | boolean |  | false | false |  | If ticked, each time you sell this product through a SO, a RfQ is automatically created to buy the product. Tip: don't forget to set a vendor on the product. |
| x_created_time | Created Time | char |  | false | false |  | Imported from Zoho: Created Time |
| x_last_modified_time | Last Modified Time | char |  | false | false |  | Imported from Zoho: Last Modified Time |
| x_package_weight | Package Weight | boolean |  | false | false |  | Imported from Zoho: Package Weight |
| x_sales_account | Sales Account | selection |  | false | false | [["sales","Sales"]] | Imported from Zoho: Sales Account |
| x_is_returnable_item | Is Returnable Item | boolean |  | false | false |  | Imported from Zoho: Is Returnable Item |
| x_package_width | Package Width | boolean |  | false | false |  | Imported from Zoho: Package Width |
| x_manufacturer | Manufacturer | selection |  | false | false | [["china","China"],["france","France"],["germany","Germany"],["italy","Italy"],["jaban","Jaban"],["japan","Japan"],["korea","Korea"],["usa","USA"]] | Imported from Zoho: Manufacturer |
| x_package_length | Package Length | boolean |  | false | false |  | Imported from Zoho: Package Length |
| x_package_height | Package Height | boolean |  | false | false |  | Imported from Zoho: Package Height |
| x_dimension_unit | Dimension Unit | selection |  | false | false | [["cm","cm"]] | Imported from Zoho: Dimension Unit |
| x_weight_unit | Weight Unit | selection |  | false | false | [["kg","kg"]] | Imported from Zoho: Weight Unit |
| x_product_type | Product Type | selection |  | false | false | [["goods","goods"]] | Imported from Zoho: Product Type |
| x_source | Source | integer |  | false | false |  | Imported from Zoho: Source |
| x_item_type | Item Type | selection |  | false | false | [["inventory","Inventory"],["sales_and_purchases","Sales and Purchases"]] | Imported from Zoho: Item Type |
| x_track_inventory | Track Inventory | boolean |  | false | false |  | Imported from Zoho: Track Inventory |
| x_cf_pair_selling_price | Pair Selling Price | integer |  | false | false |  | Imported from Zoho: CF.Pair Selling Price |
| x_status | Status | selection |  | false | false | [["active","Active"]] | Imported from Zoho: Status |
| x_cf_glasses_optics_material | Glasses Optics Material | selection |  | false | false | [["mineral","Mineral"],["plastic","Plastic"],["polycarbonate","Polycarbonate"],["trivex","Trivex"]] | Imported from Zoho: CF.Glasses Optics Material |
| x_unit | Unit | selection |  | false | false | [["cm","cm"],["kg","kg"],["pcs","pcs"]] | Imported from Zoho: Unit |
| x_purchase_account | Purchase Account | selection |  | false | false | [["cost_of_goods_sold","Cost of Goods Sold"]] | Imported from Zoho: Purchase Account |
| x_cf_st_wh_wholesale_b | ST WH WHOLESALE B | char |  | false | false |  | Imported from Zoho: CF.ST WH WHOLESALE B |
| x_preferred_vendor | Preferred Vendor | char |  | false | false |  | Imported from Zoho: Preferred Vendor |
| x_brand | Brand | char |  | false | false |  | Product Brand |
| x_cf_glasses_company_design | Glasses Company Design | char |  | false | false |  | Imported from Zoho: CF.Glasses Company Design |
| x_cf_glasses_optics_type | Glasses Optics Type | selection |  | false | false | [["bifocal","Bifocal"],["digital","Digital"],["progressive","Progressive"],["single_vision","Single Vision"]] | Imported from Zoho: CF.Glasses Optics Type |
| x_cf_glasses_company_availability | Glasses Company Availability | selection |  | false | false | [["eg","EG"],["out","OUT"],["rx_eg","RX EG"],["rx_out","RX OUT"]] | Imported from Zoho: CF.Glasses Company Availability |
| x_unit_name | Unit Name | selection |  | false | false | [["centimeter","Centimeter"],["kilograms","Kilograms"],["pieces","Pieces"]] | Imported from Zoho: Unit Name |
| x_ean | EAN | integer |  | false | false |  | Imported from Zoho: EAN |
| x_inventory_valuation_method | Inventory Valuation Method | selection |  | false | false | [["fifo","fifo"],["wac","wac"]] | Imported from Zoho: Inventory Valuation Method |
| x_gender | Gender | selection |  | false | false | [["man","Man"],["woman","Woman"],["unisex","Unisex"]] | Gender: Man, Woman, or Unisex |
| x_enable_bin_tracking | Enable Bin Tracking | boolean |  | false | false |  | Imported from Zoho: Enable Bin Tracking |
| x_sellable | Sellable | boolean |  | false | false |  | Imported from Zoho: Sellable |
| x_purchasable | Purchasable | boolean |  | false | false |  | Imported from Zoho: Purchasable |
| x_parent_category | Parent Category | selection |  | false | false | [["eyeglasses","Eyeglasses"],["reading","Reading"]] | Imported from Zoho: Parent Category |
| x_cf_vegas_blue_block | Vegas Blue Block | boolean |  | false | false |  | Imported from Zoho: CF.Vegas Blue Block |
| x_cf_glasses_optics_coating | Glasses Optics Coating | char |  | false | false |  | Imported from Zoho: CF.Glasses Optics Coating |
| x_inventory_account | Inventory Account | selection |  | false | false | [["inventory_asset","Inventory Asset"]] | Imported from Zoho: Inventory Account |
| x_cf_glasses_optics_design | Glasses Optics Design | selection |  | false | false | [["aspherical","Aspherical"],["double_as","Double AS"],["freeform","Freeform"],["spherical","Spherical"]] | Imported from Zoho: CF.Glasses Optics Design |
| x_cf_glasses_optics_index | Glasses Optics Index | float |  | false | false |  | Imported from Zoho: CF.Glasses Optics Index |
| x_special_item | Special Item | boolean |  | false | false |  | Mark as special item |
| x_warehouse_name | Warehouse Name | char |  | false | false |  | Imported from Zoho: Warehouse Name |
| x_opening_stock | Opening Stock | integer |  | false | false |  | Imported from Zoho: Opening Stock |
| x_opening_stock_value | Opening Stock Value | integer |  | false | false |  | Imported from Zoho: Opening Stock Value |
| x_is_combo_product | Is Combo Product | boolean |  | false | false |  | Imported from Zoho: Is Combo Product |
| x_cf_glasses_optics_breakability | Glasses Optics Breakability | selection |  | false | false | [["unbreakable","Unbreakable"]] | Imported from Zoho: CF.Glasses Optics Breakability |
| x_age | Age | selection |  | false | false | [["adult","Adult"],["kids","Kids"]] | Age group: Adult or Kids |
| x_2025_glasses | 2025 Glasses | boolean |  | false | false |  | 2025 Glasses: True = Lens, False = Frame |
| x_cf_glasses_company_coating | Glasses Company Coating | char |  | false | false |  | Imported from Zoho: CF.Glasses Company Coating |
| x_zoho_sku | Zoho SKU | char |  | false | false |  | SKU reference from Zoho |
| x_glasses_company_availability | Glasses Company Availability | char |  | false | false |  |  |
| x_glasses_optics_breakability | Glasses Optics Breakability | char |  | false | false |  |  |
| x_glasses_company_design | Glasses Company Design | char |  | false | false |  |  |
| x_glasses_optics_material | Glasses Optics Material | char |  | false | false |  |  |
| x_glasses_company_coating | Glasses Company Coating | char |  | false | false |  |  |
| x_glasses_optics_type | Glasses Optics Type | char |  | false | false |  |  |
| x_glasses_optics_design | Glasses Optics Design | char |  | false | false |  |  |
| x_cf_of_do | CF of do | char |  | false | false |  |  |
| x_glasses_optics_coating | Glasses Optics Coating | char |  | false | false |  |  |
| x_glasses_optics_index | Glasses Optics Index | char |  | false | false |  |  |
| x_pair_selling_price | Pair Selling Price | float |  | false | false |  |  |
| x_vegas_blue_block | Vegas Blue Block | boolean |  | false | false |  |  |
