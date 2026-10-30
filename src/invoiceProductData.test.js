import test from 'node:test';
import assert from 'node:assert/strict';
import {selectInvoiceProduct,clearInvoiceProduct,invoiceProductName,cleanOdooProductName} from './invoiceProductData.js';
import {normalizeInvoiceItems} from './invoiceItems.js';
const product={id:11282,name:'VEGAS BLUE ASP 1.61 BB X6',default_code:'6666660',list_price:150.25};
const blank={id:'line-1',sku:'',quantity:3,unitPrice:'',unitPriceCents:0,lineTotalCents:0};
test('Odoo selection links the SKU and uses catalogue price only for a blank-price line',()=>{
 const item=selectInvoiceProduct(blank,product);assert.equal(item.sku,'6666660');assert.equal(item.odooProductId,11282);assert.equal(item.odooProductName,product.name);assert.equal(item.unitPrice,'150.25');assert.equal(item.lineTotalCents,45075);
 const normalized=normalizeInvoiceItems([item])[0];assert.equal(normalized.odooProductId,11282);assert.equal(normalized.odooProductName,product.name);
 const custom={...blank,unitPrice:'175.00',unitPriceCents:17500,lineTotalCents:52500};assert.equal(selectInvoiceProduct(custom,product).unitPriceCents,17500);assert.equal(selectInvoiceProduct({...custom,unitPrice:'0',unitPriceCents:0},product).unitPriceCents,0);
 assert.equal(selectInvoiceProduct(blank,{...product,default_code:false}).sku,product.name);assert.equal(selectInvoiceProduct(blank,{...product,list_price:false}).unitPrice,'');
});
test('typing a manual SKU clears the old Odoo association without changing the quantity or price',()=>{
 const selected=selectInvoiceProduct(blank,product),manual=clearInvoiceProduct(selected,'MANUAL-1');assert.equal(manual.odooProductId,undefined);assert.equal(manual.odooProductName,undefined);assert.equal(manual.quantity,3);assert.equal(manual.lineTotalCents,45075);assert.equal(normalizeInvoiceItems([manual])[0].sku,'MANUAL-1');assert.throws(()=>selectInvoiceProduct(blank,{id:0,name:'Invalid'}));
});

test('invoice list names use linked product names and preserve legacy item descriptions',()=>{
 const item=selectInvoiceProduct(blank,product);assert.equal(invoiceProductName(item),product.name);assert.equal(item.sku,'6666660');
 assert.equal(invoiceProductName({sku:'[CODE-1] Legacy Frame'}),'Legacy Frame');assert.equal(cleanOdooProductName('[CODE-1] Legacy Frame'),'Legacy Frame');
 assert.equal(invoiceProductName({sku:'6666660'},[{id:11282,sku:'6666660',name:product.name}]),product.name);
 assert.equal(invoiceProductName({sku:'6666660'}),'');assert.equal(invoiceProductName({sku:'Frame description'}),'Frame description');
 assert.equal(invoiceProductName({...item,sku:'New manual item'}),'New manual item','Edited labels cannot display the old linked name');
});
