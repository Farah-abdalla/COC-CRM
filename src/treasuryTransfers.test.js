import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTreasuryTransfer,treasuryAvailableCents} from './treasuryTransfers.js';
import {buildTreasuryLedger} from './treasuryLedger.js';
import {buildTreasuryStatement} from './treasuryStatementData.js';
import {emptySnapshot,visibleSnapshot,mergePermittedSnapshot,normalizePermissions} from './accessControl.js';
import {encodeSnapshot} from './storagePayload.js';
const form={fromBranch:'A',fromCategory:'Cash',toBranch:'B',toCategory:'Bank',amount:'123.45',date:'2026-10-25',reference:'REF',description:'Branch float'};
const user=(branches=['A','B'],rights=['view','add'])=>({active:true,branches,permissions:normalizePermissions({Treasury:Object.fromEntries(rights.map(right=>[right,true]))})});
function seed(){const snapshot=emptySnapshot();snapshot.data.branches=['A','B','C'];snapshot.data.treasuryBalances=[{id:'a',branch:'A',category:'Cash',amountCents:20000},{id:'c',branch:'C',category:'Cash',amountCents:50000}];return snapshot;}
function add(current,record,actor=user()){const incoming=visibleSnapshot(current,actor);incoming.data.treasuryTransfers.unshift(record);return mergePermittedSnapshot(current,incoming,actor);}
test('transfer money is exact and invalid amount, date, account, branch, or identical endpoints are rejected',()=>{
 const row=prepareTreasuryTransfer(form,['A','B']);assert.equal(row.amountCents,12345);assert(row.id);
 for(const patch of [{amount:'0'},{amount:'-1'},{amount:'1.001'},{amount:'9007199254740992'},{date:'2026-02-30'},{date:'2999-01-01'},{toBranch:'C'},{toCategory:'Expenses'},{toCategory:'Purchases'},{toBranch:'A',toCategory:'Cash'}])assert.throws(()=>prepareTreasuryTransfer({...form,...patch},['A','B']));
});
test('a cross-branch transfer posts equal debit and credit, survives snapshot encoding and updates statements',()=>{
 const row=prepareTreasuryTransfer(form,['A','B']),saved=add(seed(),row),data=JSON.parse(encodeSnapshot(saved)).data;
 assert.equal(treasuryAvailableCents(data,'A','Cash'),7655);assert.equal(treasuryAvailableCents(data,'B','Bank'),12345);assert.equal(treasuryAvailableCents(data,'C','Cash'),50000);
 assert.equal(data.treasuryBalances.find(row=>row.id==='a').amountCents,20000);
 const ledger=buildTreasuryLedger([],[],[],[],data.treasuryTransfers);assert.equal(ledger.rows.reduce((sum,row)=>sum+row.amountCents,0),0);assert.equal(ledger.rows.length,2);
 const source=buildTreasuryStatement(ledger.rows.filter(row=>row.branch==='A'),20000),destination=buildTreasuryStatement(ledger.rows.filter(row=>row.branch==='B'),0);
 assert.equal(source.withdrawalsCents,12345);assert.equal(source.closingCents,7655);assert.equal(destination.depositsCents,12345);assert.equal(destination.rows[0].counterpartyBranch,'A');
 assert.equal(buildTreasuryStatement(ledger.rows.filter(row=>row.branch==='A'),20000,{startDate:'2026-10-26'}).openingCents,7655);
});
test('same-branch transfers and exact full-balance transfers are allowed',()=>{
 const row=prepareTreasuryTransfer({...form,toBranch:'A',amount:'200'},['A']);const saved=add(seed(),row,user(['A']));assert.equal(treasuryAvailableCents(saved.data,'A','Cash'),0);assert.equal(treasuryAvailableCents(saved.data,'A','Bank'),20000);
});
test('server rejects overdrafts including cumulative transfers, and includes invoice receipts and expenses',()=>{
 const current=seed();assert.throws(()=>add(current,prepareTreasuryTransfer({...form,amount:'200.01'},['A','B'])),/Insufficient/);
 const first=prepareTreasuryTransfer(form,['A','B']),incoming=visibleSnapshot(current,user());incoming.data.treasuryTransfers=[first,{...first,id:'second'}];assert.throws(()=>mergePermittedSnapshot(current,incoming,user()),/Insufficient/);
 current.data.invoices=[{id:'inv',branch:'A',total:100,paid:100,openingPaymentMethod:'Cash'}];
 current.data.expenses=[{id:'e',branch:'A',amountCents:5000,date:form.date,method:'Cash',category:'Rent',description:'Rent',paidTo:'',reference:''}];
 assert.equal(treasuryAvailableCents(current.data,'A','Cash'),25000);assert.equal(treasuryAvailableCents(add(current,prepareTreasuryTransfer({...form,amount:'250'},['A','B'])).data,'A','Cash'),0);
});
test('both branches and Treasury add rights are required; either branch can see its posted activity',()=>{
 const row=prepareTreasuryTransfer(form,['A','B']),current=seed();
 assert.throws(()=>add(current,row,user(['A'])),/both source and destination/);assert.throws(()=>add(current,row,user(['B'])),/both source and destination/);
 assert.throws(()=>add(current,row,user(['A','B'],['view'])),/add permission/);
 const saved=add(current,row);for(const branch of ['A','B'])assert.equal(visibleSnapshot(saved,user([branch])).data.treasuryTransfers.length,1);
 assert.equal(visibleSnapshot(saved,user(['C'])).data.treasuryTransfers.length,0);
 for(const branch of ['A','B']){const incoming=visibleSnapshot(saved,user([branch],['view','delete']));incoming.data.treasuryTransfers=[];assert.throws(()=>mergePermittedSnapshot(saved,incoming,user([branch],['view','delete'])),/both source and destination/);}
});
test('pending transfer chains are validated in creation order and existing hidden transfers are preserved',()=>{
 const current=seed(),first=prepareTreasuryTransfer({...form,amount:'200'},['A','B']),second=prepareTreasuryTransfer({...form,fromBranch:'B',fromCategory:'Bank',toBranch:'A',toCategory:'Wallet',amount:'100'},['A','B']);first.createdAt='2026-10-25T10:00:00Z';second.createdAt='2026-10-25T10:00:01Z';
 const incoming=visibleSnapshot(current,user());incoming.data.treasuryTransfers=[second,first];const saved=mergePermittedSnapshot(current,incoming,user());assert.equal(treasuryAvailableCents(saved.data,'B','Bank'),10000);assert.equal(treasuryAvailableCents(saved.data,'A','Wallet'),10000);
 const actor=user(['C'],['view','edit']),other=visibleSnapshot(saved,actor);other.data.treasuryBalances[0].amountCents=40000;assert.equal(mergePermittedSnapshot(saved,other,actor).data.treasuryTransfers.length,2);
});
