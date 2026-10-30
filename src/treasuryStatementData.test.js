import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTreasuryStatement} from './treasuryStatementData.js';
import {buildTreasuryLedger,treasuryActivityCents} from './treasuryLedger.js';
import {emptySnapshot,normalizePermissions,visibleSnapshot,mergePermittedSnapshot} from './accessControl.js';
import {prepareExpense} from './expenseData.js';
const expense={id:'cost',branch:'A',date:'2026-01-02',category:'Utilities',description:'Electricity bill',paidTo:'Power company',reference:'REC-42',method:'Cash',amountCents:2500};
test('statements sort deposits and withdrawals and carry prior activity into opening balance',()=>{
 const rows=[{id:'b',date:'2026-01-03',amountCents:-300},{id:'a',date:'2026-01-01',amountCents:1000},{id:'old',date:'',amountCents:200},{id:'same',date:'2026-01-03',amountCents:500},{id:'future',date:'2026-01-05',amountCents:900}];
 const result=buildTreasuryStatement(rows,10000,{startDate:'2026-01-02',endDate:'2026-01-03'});
 assert.equal(result.openingCents,11200);assert.deepEqual(result.rows.map(row=>row.id),['b','same']);
 assert.deepEqual(result.rows.map(row=>row.balanceCents),[10900,11400]);
 assert.equal(result.depositsCents,500);assert.equal(result.withdrawalsCents,300);assert.equal(result.closingCents,11400);
 assert.equal(buildTreasuryStatement(rows,10000,{startDate:'2026-01-04',endDate:'2026-01-01'}).invalid,true);
 assert.equal(buildTreasuryStatement([],1234).closingCents,1234);
 const cairo=buildTreasuryStatement([{id:'night',date:'2026-01-01T22:30:00Z',amountCents:100}],0,{startDate:'2026-01-02',endDate:'2026-01-02'});
 assert.equal(cairo.rows[0].statementDate,'2026-01-02');
});
test('expenses debit their payment accounts once and preserve descriptions in expense statements',()=>{
 const invoices=[{id:'i',branch:'A',total:100,paid:100}],events=[{id:'p',invoiceId:'i',branch:'A',action:'Payment recorded',amount:100,method:'Cash',timestamp:'2026-01-01T10:00:00Z'}];
 const ledger=buildTreasuryLedger(invoices,events,[],[expense,{...expense,id:'other-branch',branch:'B'},{...expense,id:'other-method',method:'Other'},{...expense,id:'wallet',method:'Other',treasuryCategory:'Wallet'}]);
 assert.equal(treasuryActivityCents(ledger.rows,'A','Cash'),7500);assert.equal(treasuryActivityCents(ledger.rows,'A','Wallet'),-2500);
 const row=ledger.rows.find(row=>row.id==='expense-cost');assert.equal(row.description,'Electricity bill');assert.equal(row.expenseCategory,'Utilities');assert.equal(row.reference,'REC-42');
 assert.equal(ledger.unassigned.filter(row=>row.kind==='Expense').length,1);
 assert.equal(ledger.expenseRows.filter(row=>row.branch==='A').length,3);
 const statement=buildTreasuryStatement(ledger.rows.filter(row=>row.branch==='A'&&row.category==='Cash'),5000);
 assert.equal(statement.closingCents,12500);assert.equal(statement.withdrawalsCents,2500);
 assert.deepEqual(buildTreasuryLedger(JSON.parse(JSON.stringify(invoices)),events,[],[expense]).rows,buildTreasuryLedger(invoices,events,[],[expense]).rows);
});
test('Treasury view includes only assigned branch expenses and grants no expense writes',()=>{
 const s=emptySnapshot();s.data.expenses=[expense,{...expense,id:'hidden',branch:'B'}];
 const user={active:true,branches:['A'],permissions:normalizePermissions({Treasury:{view:true,add:true,edit:true,delete:true}})};
 const view=visibleSnapshot(s,user);assert.deepEqual(view.data.expenses.map(row=>row.id),['cost']);
 const edit=structuredClone(view);edit.data.expenses[0].description='Changed';assert.throws(()=>mergePermittedSnapshot(s,edit,user),/edit permission/);
 const remove=structuredClone(view);remove.data.expenses=[];assert.throws(()=>mergePermittedSnapshot(s,remove,user),/delete permission/);
 const add=structuredClone(view);add.data.expenses.push({...expense,id:'new'});assert.throws(()=>mergePermittedSnapshot(s,add,user),/add permission/);
});
test('Other expense method requires an explicit account for new saves',()=>{
 const form={...expense,amount:'25.00',method:'Other'};
 assert.throws(()=>prepareExpense(form,['A']),/Treasury account/);
 assert.equal(prepareExpense({...form,treasuryCategory:'Bank'},['A']).treasuryCategory,'Bank');
});
