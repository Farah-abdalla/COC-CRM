import test from 'node:test';
import assert from 'node:assert/strict';
import {treasuryAccountFor,requireTreasuryAccount,invoicePaymentEvent} from './paymentMethods.js';
import {buildTreasuryLedger,treasuryActivityCents} from './treasuryLedger.js';
import {getInvoicePayments} from './paymentData.js';
import {emptySnapshot,normalizePermissions,visibleSnapshot,mergePermittedSnapshot,validateSnapshot} from './accessControl.js';
import {addTestExamples} from './exampleData.js';
const invoice={id:'one',number:'INV-NC001',branch:'New Cairo',customerId:1,total:1000,paid:1000};
const event=(id,amount,method,extra={})=>({id,invoiceId:'one',action:'Payment recorded',amount,method,timestamp:'2026-10-25T12:00:00Z',...extra});
test('payment methods map to accounts and Other requires an explicit account',()=>{
 for(const [method,account] of [['Cash','Cash'],['Bank','Bank'],['Bank transfer','Bank'],['Card','Bank'],['Instapay','Instapay'],['Wallet','Wallet']])assert.equal(requireTreasuryAccount(method),account);
 assert.equal(treasuryAccountFor('Other'),null);assert.throws(()=>requireTreasuryAccount('Other'),/Choose/);assert.equal(requireTreasuryAccount('Other','Wallet'),'Wallet');
 const receipt=invoicePaymentEvent(invoice,12345,{method:'Instapay',reference:'REF'});assert.equal(receipt.amount,123.45);assert.equal(receipt.treasuryCategory,'Instapay');assert.equal(receipt.branch,'New Cairo');assert.equal(receipt.action,'Payment recorded');
 const correction=invoicePaymentEvent(invoice,-1000,{method:'Cash'});assert.equal(correction.action,'Payment adjusted');
 assert.throws(()=>invoicePaymentEvent({...invoice,branch:''},100,{method:'Cash'}),/branch/);
});
test('payments increase matching branch accounts once and never mutate opening balances',()=>{
 const events=[event('a',400,'Cash'),event('b',300,'Card'),event('c',200,'Instapay'),event('d',100,'Wallet'),event('e',50,'Cash',{invoiceId:'two',branch:'Nasr City'})],invoices=[invoice,{...invoice,id:'two',branch:'Nasr City',paid:50}];
 const ledger=buildTreasuryLedger(invoices,events,[]);assert.equal(ledger.rows.length,5);assert.equal(ledger.unassigned.length,0);
 for(const [account,amount] of [['Cash',40000],['Bank',30000],['Instapay',20000],['Wallet',10000]])assert.equal(treasuryActivityCents(ledger.rows,'New Cairo',account),amount);
 assert.equal(treasuryActivityCents(ledger.rows,'Nasr City','Cash'),5000);
 const opening={amountCents:10000};assert.equal(opening.amountCents+treasuryActivityCents(ledger.rows,'New Cairo','Cash'),50000);assert.equal(opening.amountCents,10000);
 assert.deepEqual(buildTreasuryLedger(JSON.parse(JSON.stringify(invoices)),JSON.parse(JSON.stringify(events)),[]),ledger);
});
test('paid field receipts and corrections reconcile without fallback duplicates',()=>{
 const initial=invoicePaymentEvent(invoice,100000,{method:'Cash'}),correction=invoicePaymentEvent(invoice,-20000,{method:'Cash'});
 const invoices=[{...invoice,paid:800}],events=[initial,correction],payments=getInvoicePayments(invoices,events);
 assert.equal(payments.length,2);assert.equal(payments.reduce((sum,row)=>sum+row.amountCents,0),80000);
 const ledger=buildTreasuryLedger(invoices,events,[]);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Cash'),80000);assert.equal(ledger.unassigned.length,0);
});
test('refunds reduce chosen accounts once; legacy refunds use only an unambiguous source',()=>{
 let events=[event('a',1000,'Wallet'),{id:'journal',invoiceId:'one',action:'Refund recorded',amount:100}],notes=[{id:'refund',invoiceId:'one',amount:100,branch:'New Cairo',method:'Wallet',treasuryCategory:'Wallet'}];
 let ledger=buildTreasuryLedger([invoice],events,notes);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Wallet'),90000);assert.equal(ledger.rows.length,2);
 ledger=buildTreasuryLedger([invoice],[event('cash',1000,'Cash')],[{id:'old',invoiceId:'one',amount:100}]);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Cash'),90000);
 ledger=buildTreasuryLedger([invoice],[event('cash',500,'Cash'),event('bank',500,'Card')],[{id:'old',invoiceId:'one',amount:100}]);assert.equal(ledger.unassigned.length,1);assert.equal(ledger.rows.filter(row=>row.kind==='Refund').length,0);
});
test('unknown older receipts stay unassigned until a method is selected',()=>{
 let ledger=buildTreasuryLedger([{...invoice,paid:200}],[],[]);assert.equal(ledger.rows.length,0);assert.equal(ledger.unassigned.length,1);
 ledger=buildTreasuryLedger([{...invoice,paid:200,openingPaymentMethod:'Bank transfer',openingPaymentTreasuryCategory:'Bank'}],[],[]);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Bank'),20000);assert.equal(ledger.unassigned.length,0);
 const snapshot=emptySnapshot();snapshot.data.invoices=[invoice];snapshot.data.invoiceEvents=[event('old-other',1000,'Other')];validateSnapshot(snapshot);assert.equal(buildTreasuryLedger([invoice],snapshot.data.invoiceEvents,[]).unassigned.length,1);
});
test('Treasury access exposes only assigned branch activity and never grants invoice editing',()=>{
 const snapshot=emptySnapshot();snapshot.data.branches=['New Cairo','Nasr City'];snapshot.data.invoices=[invoice,{...invoice,id:'two',branch:'Nasr City'}];snapshot.data.invoiceEvents=[event('a',1000,'Cash'),event('b',1000,'Cash',{invoiceId:'two'})];snapshot.data.creditNotes=[{id:'credit',invoiceId:'one',amount:100}];snapshot.data.treasuryBalances=[{id:'base',branch:'New Cairo',category:'Cash',amountCents:10000}];
 const user={active:true,branches:['New Cairo'],permissions:normalizePermissions({Treasury:{view:true,edit:true,add:true,delete:true}})},view=visibleSnapshot(snapshot,user);
 assert.equal(view.data.invoices.length,1);assert.equal(view.data.invoiceEvents.length,1);assert.equal(view.data.creditNotes.length,1);
 for(const mutate of [s=>s.data.invoices[0].paid=500,s=>s.data.invoices=[],s=>s.data.invoiceEvents.push(event('forged',100,'Cash')),s=>s.data.creditNotes[0].amount=1]){
  const incoming=structuredClone(view);mutate(incoming);assert.throws(()=>mergePermittedSnapshot(snapshot,incoming,user),/permission/);
 }
 const allowed=structuredClone(view);allowed.data.treasuryBalances[0].amountCents=20000;assert.equal(mergePermittedSnapshot(snapshot,allowed,user).data.treasuryBalances[0].amountCents,20000);
});
test('existing system examples link receipts and refund into expected Treasury totals',()=>{
 const snapshot=emptySnapshot();snapshot.data.branches=['New Cairo','Nasr City','Heliopolis'];const {data}=addTestExamples(snapshot,'2026-10-25').snapshot,ledger=buildTreasuryLedger(data.invoices,data.invoiceEvents,data.creditNotes);
 assert.equal(ledger.unassigned.length,0);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Cash'),195000);assert.equal(treasuryActivityCents(ledger.rows,'New Cairo','Instapay'),100000);assert.equal(treasuryActivityCents(ledger.rows,'Nasr City','Wallet'),50000);
 const opening=data.treasuryBalances.find(row=>row.branch==='New Cairo'&&row.category==='Cash').amountCents;assert.equal(opening+treasuryActivityCents(ledger.rows,'New Cairo','Cash'),1445000);
});
