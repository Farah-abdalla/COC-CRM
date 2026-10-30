import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySnapshot} from './accessControl.js';
import {changePayment} from './paymentMutations.js';
import {getInvoicePayments} from './paymentData.js';
import {buildTreasuryLedger,treasuryActivityCents} from './treasuryLedger.js';
function snapshot(){const s=emptySnapshot();s.data.invoices=[{id:'i',number:'INV-1',customerId:1,branch:'A',total:200,paid:100}];s.data.invoiceEvents=[{id:'cash',invoiceId:'i',action:'Payment recorded',amount:60,method:'Cash',branch:'A'},{id:'bank',invoiceId:'i',action:'Payment recorded',amount:40,method:'Card',branch:'A'}];return s;}
const patch=(amountCents,method='Wallet')=>({amountCents,method,treasuryCategory:'',reference:'updated',timestamp:'2026-10-26T12:00:00Z'});
test('payment editing and removal update invoice and Treasury without fallback duplicates',()=>{
 const current=snapshot(),edited=changePayment(current,'payment-cash',patch(3000));
 assert.equal(current.data.invoices[0].paid,100);assert.equal(edited.data.invoices[0].paid,70);
 let ledger=buildTreasuryLedger(edited.data.invoices,edited.data.invoiceEvents,[]);
 assert.equal(treasuryActivityCents(ledger.rows,'A','Cash'),0);assert.equal(treasuryActivityCents(ledger.rows,'A','Wallet'),3000);
 const removed=changePayment(edited,'payment-bank',null);assert.equal(removed.data.invoices[0].paid,30);
 assert.equal(getInvoicePayments(removed.data.invoices,removed.data.invoiceEvents).length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(removed)),removed);
});
test('legacy direct payment edits become explicit receipts and direct removal stays removed',()=>{
 const s=snapshot();s.data.invoiceEvents=s.data.invoiceEvents.slice(0,1);
 const edited=changePayment(s,'invoice-paid-i',patch(3500));
 assert.equal(edited.data.invoices[0].paid,95);assert.equal(getInvoicePayments(edited.data.invoices,edited.data.invoiceEvents).some(row=>row.kind==='direct'),false);
 const removed=changePayment(s,'invoice-paid-i',null);assert.equal(removed.data.invoices[0].paid,60);assert.equal(getInvoicePayments(removed.data.invoices,removed.data.invoiceEvents).length,1);
});
test('negative corrections preserve sign and changes respect total, refunds, locks and voids',()=>{
 const s=snapshot();s.data.invoiceEvents=[{id:'receipt',invoiceId:'i',action:'Payment recorded',amount:120,method:'Cash'},{id:'adjustment',invoiceId:'i',action:'Payment adjusted',amount:-20,method:'Cash'}];
 assert.equal(changePayment(s,'payment-adjustment',patch(-1000,'Cash')).data.invoices[0].paid,110);
 assert.equal(changePayment(s,'payment-adjustment',null).data.invoices[0].paid,120);
 assert.throws(()=>changePayment(s,'payment-adjustment',patch(1000)),/original sign/);
 assert.throws(()=>changePayment(s,'payment-receipt',patch(30000)),/refunds and total/);
 s.data.creditNotes=[{id:'credit',invoiceId:'i',amount:90}];
 assert.throws(()=>changePayment(s,'payment-receipt',null),/refunds and total/);
 s.data.invoices[0].locked=true;assert.throws(()=>changePayment(s,'payment-adjustment',null),/Unlock/);
 s.data.invoices[0].locked=false;s.data.invoices[0].isVoided=true;assert.throws(()=>changePayment(s,'payment-adjustment',null),/Unlock/);
});
