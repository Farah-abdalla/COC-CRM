import test from 'node:test';
import assert from 'node:assert/strict';
import {branchSalesIncentiveCents,branchDailyTargets,branchIncentiveTotals,incentiveBranch,incentivePeriodDays} from './branchIncentiveData.js';
import {cairoToday} from './taskDeadlines.js';
import {emptySnapshot,visibleSnapshot,mergePermittedSnapshot,normalizePermissions} from './accessControl.js';
const day='2026-10-28',branches=Object.keys(branchDailyTargets);
const invoice=(id,branch,total,date=day)=>({id,number:'INV-'+id,branch,total,quantity:1,sku:'Frame',date});
const report=options=>branchIncentiveTotals({branches,startDate:day,endDate:day,...options});
test('daily branch targets use the requested amounts and an inclusive calendar-day period',()=>{
 assert.deepEqual(branchDailyTargets,{'New Cairo':5000000,Heliopolis:8000000,'Nasr City':5000000,Mohandseen:2000000});
 assert.equal(report({}).totals.dailyTargetCents,20000000);assert.equal(incentivePeriodDays(day,day),1);
 assert.equal(incentivePeriodDays('2026-10-27',day),2);assert.equal(incentivePeriodDays(day,'2026-10-27'),0);assert.equal(incentivePeriodDays('2026-02-30',day),0);
 assert.equal(cairoToday(new Date('2026-10-27T22:30:00Z')),day);
});
test('net sales use invoice totals after discounts and charges, not payments or lifetime refunds',()=>{
 const sale={...invoice(1,'New Cairo',1000),discount:100,shippingCharge:20,adjustment:-10,paid:0,refundedAmount:300};
 const result=report({invoices:[sale,{...invoice(2,'New Cairo',9999),isVoided:true},invoice(3,'New Cairo',200,'2026-10-27')],creditNotes:[{id:1,invoiceId:1,date:day,amount:200}]});
 const row=result.rows.find(row=>row.branch==='New Cairo');assert.equal(row.invoiceCount,1);assert.equal(row.invoiceCents,91000);assert.equal(row.creditCents,20000);assert.equal(row.netCents,71000);assert.equal(result.totals.netCents,71000);
 assert.equal(result.transactions.reduce((sum,row)=>sum+row.amountCents,0),71000);
});
test('credits follow the credit date, reduce older-invoice sales today, and exchanges net the replacement less the return',()=>{
 const original=invoice(1,'Heliopolis',500,'2026-10-27'),replacement=invoice(2,'Heliopolis',650);
 const credit={id:'return',invoiceId:1,date:day,amount:500};
 const today=report({invoices:[original,replacement],creditNotes:[credit]});assert.equal(today.totals.invoiceCents,65000);assert.equal(today.totals.creditCents,50000);assert.equal(today.totals.netCents,15000);
 const yesterday=report({invoices:[original,replacement],creditNotes:[credit],startDate:'2026-10-27',endDate:'2026-10-27'});assert.equal(yesterday.totals.netCents,50000);
 const refundOnly=report({invoices:[original],creditNotes:[credit]});assert.equal(refundOnly.totals.netCents,-50000);
});
test('branch filters, aliases, unknown targets and multi-day targets preserve all cents',()=>{
 assert.equal(incentiveBranch('Mohadseen'),'Mohandseen');
 const result=report({invoices:[invoice(1,'Mohadseen',25000),invoice(2,'Nasr City',50000)],branch:'Mohandseen'});
 assert.equal(result.rows.length,1);assert.equal(result.totals.netCents,2500000);assert.equal(result.rows[0].achievement,125);assert.equal(result.rows[0].remainingCents,0);
 const period=report({startDate:'2026-10-27',invoices:[]});assert.equal(period.totals.periodTargetCents,40000000);
 const other=report({branches:['Downtown'],invoices:[invoice(1,'Downtown',1.01)],creditNotes:[{id:1,date:day,branch:'Downtown',amount:0.1}]});assert.equal(other.rows[0].periodTargetCents,null);assert.equal(other.totals.netCents,91);
 assert.equal(report({startDate:'',invoices:[invoice(1,'New Cairo',1)]}).rows.length,0);
});
test('Incentive viewers can read assigned branch credits but cannot change them',()=>{
 const snapshot=emptySnapshot();snapshot.data.branches=['New Cairo','Nasr City'];snapshot.data.invoices=[invoice(1,'New Cairo',1000),invoice(2,'Nasr City',2000)];snapshot.data.creditNotes=[{id:1,invoiceId:1,date:day,amount:100},{id:2,invoiceId:2,date:day,amount:200}];
 const user={id:'staff',active:true,isAdmin:false,branches:['New Cairo'],permissions:normalizePermissions({Incentive:{view:true}})};
 const visible=visibleSnapshot(snapshot,user);assert.deepEqual(visible.data.creditNotes.map(note=>note.id),[1]);assert.deepEqual(visible.data.invoices.map(row=>row.id),[1]);
 const changed=structuredClone(visible);changed.data.creditNotes[0].amount=1;assert.throws(()=>mergePermittedSnapshot(snapshot,changed,user),/permission/);
 const hidden={...user,permissions:normalizePermissions({Customers:{view:true}})};assert.equal(visibleSnapshot(snapshot,hidden).data.creditNotes.length,0);
});

test('two percent is paid on all net sales only when the branch daily target is met or exceeded',()=>{
 assert.equal(branchSalesIncentiveCents(4999999,5000000),0);
 assert.equal(branchSalesIncentiveCents(5000000,5000000),100000);
 assert.equal(branchSalesIncentiveCents(6000000,5000000),120000);
 assert.equal(branchSalesIncentiveCents(5000051,5000000),100001);
 assert.equal(branchSalesIncentiveCents(-10000,5000000),0);
 assert.equal(branchSalesIncentiveCents(5000000,null),0);
 const result=report({invoices:[invoice(1,'New Cairo',50000),invoice(2,'Heliopolis',80000),invoice(3,'Nasr City',49999.99),invoice(4,'Mohadseen',25000)]});
 assert.equal(result.totals.incentiveCents,310000);
 assert.equal(result.rows.find(row=>row.branch==='Nasr City').incentiveCents,0);
});
test('refunds and exchanges affect the qualifying day before calculating two percent',()=>{
 const invoices=[invoice(1,'New Cairo',60000)],creditNotes=[{id:1,branch:'New Cairo',date:day,amount:10000}];
 assert.equal(report({invoices,creditNotes}).totals.incentiveCents,100000);
 assert.equal(report({invoices,creditNotes:[{...creditNotes[0],amount:10000.01}]}).totals.incentiveCents,0);
 const previous=invoice(2,'New Cairo',10000,'2026-10-27');
 assert.equal(report({invoices:[...invoices,previous],creditNotes:[{id:1,invoiceId:2,date:day,amount:10000}]}).totals.incentiveCents,100000);
 assert.equal(report({invoices:[{...invoices[0],isVoided:true}]}).totals.incentiveCents,0);
});
test('date ranges sum daily branch incentives and do not replace daily targets with an aggregate threshold',()=>{
 const result=report({startDate:'2026-10-27',invoices:[invoice(1,'New Cairo',60000,'2026-10-27'),invoice(2,'New Cairo',30000)]});
 const row=result.rows.find(row=>row.branch==='New Cairo');
 assert.equal(row.netCents,9000000);assert.equal(row.periodTargetCents,10000000);assert.equal(row.incentiveCents,120000);assert.equal(row.qualifyingDays,1);
 assert.equal(result.dailyRows.find(row=>row.date===day).incentiveCents,0);
 assert.equal(result.totals.incentiveCents,120000);
 const branch=report({branch:'New Cairo',invoices:[invoice(1,'New Cairo',49000),invoice(2,'Heliopolis',100000)]});assert.equal(branch.totals.incentiveCents,0);
 assert.equal(report({startDate:''}).totals.incentiveCents,0);
});
