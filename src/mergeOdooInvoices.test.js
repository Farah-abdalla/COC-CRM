import test from 'node:test';
import assert from 'node:assert/strict';
import {importOdooInvoices} from './mergeOdooInvoices.js';
import {emptySnapshot,validateSnapshot,mergePermittedSnapshot} from './accessControl.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {getInvoicePayments} from './paymentData.js';
const invoice=(id=7,customerId=4)=>({id,number:'ODOO/'+id,customerId,customer:'Customer',date:'2026-10-27',lines:[{id:id*10,product_id:[1,'Frame'],quantity:3,price_unit:10,discount:10,price_subtotal:27,price_total:30.78}]});
test('imports native editable invoices with exact totals, linked customers, and no fabricated payments',()=>{
 const current=emptySnapshot(),result=importOdooInvoices(current.data,[invoice()]);
 assert.equal(result.added,1);assert.equal(current.data.invoices.length,0);assert.equal(result.skipped.length,0);
 const record=result.data.invoices[0];assert.equal(record.number,'ODOO/7');assert.equal(record.customerId,result.data.customers[0].id);
 assert.equal(invoiceAmounts(record).total,30.78);assert.equal(record.odooPaymentUnverified,true);assert.equal(record.paid,0);assert.equal(record.branch,'');assert.equal(record.dueDate,'');
 assert.deepEqual(getInvoicePayments(result.data.invoices,result.data.invoiceEvents),[]);
 validateSnapshot({...current,data:result.data});
 const admin={id:'owner',active:true,isAdmin:true,branches:'all'};
 assert.equal(mergePermittedSnapshot(current,{...current,data:result.data},admin).data.invoices.length,1);
});
test('repeated imports preserve CRM changes, payments, locks, customers and work-order links',()=>{
 const first=importOdooInvoices(emptySnapshot().data,[invoice()]);const saved=first.data.invoices[0];
 Object.assign(saved,{paid:12,locked:true,workOrderId:'wo-1',notes:'CRM edits',odooPaymentUnverified:false});
 const next=importOdooInvoices(first.data,[{...invoice(),number:'Changed upstream'}]);
 assert.equal(next.added,0);assert.equal(next.existing,1);assert.deepEqual(next.data.invoices[0],saved);assert.equal(next.data.customers.length,1);assert.equal(next.data.invoiceEvents.length,1);
});
test('multiple invoices share the same external customer without matching unrelated names',()=>{
 const data=emptySnapshot().data;data.customers.push({id:99,name:'Customer'});
 const result=importOdooInvoices(data,[invoice(7),invoice(8)]);
 assert.equal(result.added,2);assert.equal(result.data.customers.length,2);assert.equal(result.data.invoices[0].customerId,result.data.invoices[1].customerId);
});
test('unsupported lines and collisions are reported without partially creating customers or invoices',()=>{
 const data=emptySnapshot().data;data.invoices.push({id:'local',number:'ODOO/7'});
 const fractional=invoice(8);fractional.lines[0].quantity=1.5;
 const result=importOdooInvoices(data,[invoice(),fractional]);
 assert.equal(result.added,0);assert.equal(result.skipped.length,2);assert.equal(result.data.customers.length,0);assert.equal(result.data.invoices.length,1);
});
test('reimport after local deletion does not duplicate import journal IDs',()=>{
 const first=importOdooInvoices(emptySnapshot().data,[invoice()]);first.data.invoices=[];
 const second=importOdooInvoices(first.data,[invoice()]);assert.equal(second.data.invoiceEvents.length,1);validateSnapshot({...emptySnapshot(),data:second.data});
});


test('Odoo invoice adjustment lines retain exact totals using the native adjustment field',()=>{
 const source={id:99,number:'HEL/INV/2026/05136',customerId:4,customer:'Customer',date:'2026-10-29',total:2600,lines:[{id:10,product_id:[1,'Invoice Adjustment'],quantity:1,price_total:-10},{id:11,product_id:[2,'[S-W-A-VG8601 C1] VG8601 C1'],quantity:1,price_total:2610}]};
 const result=importOdooInvoices(emptySnapshot().data,[source]);assert.equal(result.added,1);assert.equal(result.skipped.length,0);const saved=result.data.invoices[0];assert.equal(saved.items.length,1);assert.equal(saved.total,2610);assert.equal(saved.adjustment,-10);assert.equal(invoiceAmounts(saved).originalTotal,2600);assert.equal(saved.odooAdjustments[0].lineId,10);validateSnapshot({...emptySnapshot(),data:result.data});
 const invalid={...source,id:100,number:'BAD',lines:[{id:1,product_id:[2,'Returned Frame'],quantity:1,price_total:-10}]};assert.equal(importOdooInvoices(emptySnapshot().data,[invalid]).skipped.length,1,'Negative merchandise lines must not be mistaken for adjustments');
 const mismatch={...source,id:101,number:'MISMATCH',total:999};assert.equal(importOdooInvoices(emptySnapshot().data,[mismatch]).skipped.length,1);
});
