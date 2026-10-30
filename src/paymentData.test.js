import test from 'node:test';
import assert from 'node:assert/strict';
import {getInvoicePayments} from './paymentData.js';
import {emptySnapshot,normalizePermissions,visibleSnapshot,mergePermittedSnapshot} from './accessControl.js';
const invoice={id:1,number:'INV-NC001',customerId:5,branch:'New Cairo',paid:150};
const event={id:2,invoiceId:1,action:'Payment recorded',amount:150,timestamp:'2026-10-25T10:00:00Z',method:'Instapay',reference:'REF-123'};
test('invoice payment events appear once with invoice, customer, branch and receipt details',()=>{
 const rows=getInvoicePayments([invoice],[event],[{id:5,name:'Customer'}]);
 assert.equal(rows.length,1);assert.equal(rows[0].invoiceNumber,'INV-NC001');assert.equal(rows[0].customerName,'Customer');assert.equal(rows[0].branch,'New Cairo');assert.equal(rows[0].method,'Instapay');assert.equal(rows[0].reference,'REF-123');assert.equal(rows[0].amountCents,15000);
});
test('direct paid amounts and later adjustments reconcile without duplicating event payments',()=>{
 let rows=getInvoicePayments([{...invoice,paid:200}],[event]);assert.equal(rows.length,2);assert.equal(rows.reduce((sum,row)=>sum+row.amountCents,0),20000);assert.equal(rows.find(row=>row.kind==='direct').amountCents,5000);
 rows=getInvoicePayments([{...invoice,paid:100}],[event]);assert.equal(rows.find(row=>row.kind==='adjustment').amountCents,-5000);assert.equal(rows.reduce((sum,row)=>sum+row.amountCents,0),10000);
 assert.equal(getInvoicePayments([{...invoice,paid:0}],[]).length,0);
});
test('legacy payment history remains readable and unrelated events are excluded',()=>{
 const rows=getInvoicePayments([invoice],[{...event,method:undefined,reference:undefined,description:'Cash — RECEIPT'},{...event,id:3,action:'Refund recorded'},{...event,id:4,amount:0}]);
 assert.equal(rows.length,1);assert.equal(rows[0].method,'Cash');assert.equal(rows[0].reference,'RECEIPT');
 const orphan=getInvoicePayments([],[{...event,invoiceNumber:invoice.number,branch:invoice.branch,customerName:'Customer'}]);assert.equal(orphan[0].invoiceNumber,invoice.number);assert.equal(orphan[0].branch,'New Cairo');assert.equal(orphan[0].hasInvoice,false);
});
test('Payments view shares only assigned branch invoice history and grants no write access',()=>{
 const snapshot=emptySnapshot();snapshot.data.branches=['New Cairo','Nasr City'];snapshot.data.invoices=[invoice,{...invoice,id:3,branch:'Nasr City'}];snapshot.data.invoiceEvents=[event,{...event,id:4,invoiceId:3}];
 const user={active:true,branches:['New Cairo'],permissions:normalizePermissions({Payments:{view:true}})};
 const view=visibleSnapshot(snapshot,user);assert.deepEqual(view.data.invoices.map(row=>row.id),[1]);assert.deepEqual(view.data.invoiceEvents.map(row=>row.id),[2]);
 const edited=structuredClone(view);edited.data.invoices[0].paid=999;assert.throws(()=>mergePermittedSnapshot(snapshot,edited,user),/edit permission/);
 const hidden={...user,permissions:normalizePermissions()};assert.deepEqual(visibleSnapshot(snapshot,hidden).data.invoiceEvents,[]);
});
