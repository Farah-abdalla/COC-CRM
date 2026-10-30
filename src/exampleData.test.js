import test from 'node:test';
import assert from 'node:assert/strict';
import {addTestExamples,exampleDataset} from './exampleData.js';
import {emptySnapshot,validateSnapshot} from './accessControl.js';
import {defaultCommissionRules} from './incentiveData.js';
import {getInvoicePayments} from './paymentData.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {refundedAmount} from './creditNotes.js';
test('system examples are valid, linked, idempotent and preserve existing records/settings',()=>{
 const original=emptySnapshot();original.data.branches=['New Cairo','Nasr City','Heliopolis'];original.data.customers=[{id:12,name:'Existing customer',branch:'New Cairo'}];original.data.commissionRules=defaultCommissionRules();original.data.commissionRules[0].enabled=false;
 original.matrixEdits={keep:{'0:0':7}};original.data.treasuryBalances=[{id:'existing-cash',branch:'New Cairo',category:'Cash',amountCents:10000}];
 const {snapshot,totalAdded}=addTestExamples(original,'2026-10-25');assert(totalAdded>0);validateSnapshot(snapshot);assert.equal(original.data.invoices.length,0);
 assert.deepEqual(snapshot.data.customers.find(row=>row.id===12),original.data.customers[0]);assert.deepEqual(snapshot.data.commissionRules,original.data.commissionRules);assert.deepEqual(snapshot.matrixEdits,original.matrixEdits);
 assert.equal(snapshot.data.treasuryBalances.find(row=>row.branch==='New Cairo'&&row.category==='Cash').amountCents,10000);
 assert.equal(snapshot.data.invoices.length,5);assert(snapshot.data.invoices.some(invoice=>invoice.items.length>1));
 for(const invoice of snapshot.data.invoices){assert(snapshot.data.customers.some(customer=>customer.id===invoice.customerId));if(invoice.workOrderId)assert(snapshot.data.orders.some(order=>order.id===invoice.workOrderId));}
 assert.equal(getInvoicePayments(snapshot.data.invoices,snapshot.data.invoiceEvents,snapshot.data.customers).length,4);
 const returned=snapshot.data.invoices.find(invoice=>invoice.id==='test-v1-invoice-3');assert.equal(refundedAmount(returned.id,snapshot.data.creditNotes),500);assert.equal(invoiceAmounts({...returned,refundedAmount:500}).balance,0);
 const again=addTestExamples(snapshot,'2026-10-26');assert.equal(again.totalAdded,0);assert.deepEqual(again.snapshot,snapshot);
 assert(snapshot.data.expenses.every(row=>row.testDataset===exampleDataset));
});
test('example ID collisions fail without modifying current records',()=>{
 const snapshot=emptySnapshot();snapshot.data.branches=['New Cairo'];snapshot.data.customers=[{id:9000000000100,name:'Real customer',branch:'New Cairo'}];
 assert.throws(()=>addTestExamples(snapshot,'2026-10-25'),/reserved example ID/);assert.equal(snapshot.data.customers.length,1);assert.equal(snapshot.data.invoices.length,0);
});
