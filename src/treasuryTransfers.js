import {amountToCents} from './treasuryAmounts.js';
import {paymentTreasuryAccounts} from './paymentMethods.js';
import {validExpenseDate} from './expenseData.js';
import {cairoToday} from './taskDeadlines.js';
import {buildTreasuryLedger,treasuryActivityCents} from './treasuryLedger.js';
export function validateTreasuryTransfer(row){
 if(!Number.isSafeInteger(row.amountCents)||row.amountCents<=0)throw new Error('Transfer amount must be greater than zero.');
 if(!row.fromBranch||typeof row.fromBranch!=='string'||!row.toBranch||typeof row.toBranch!=='string')throw new Error('Choose source and destination branches.');
 if(!paymentTreasuryAccounts.includes(row.fromCategory)||!paymentTreasuryAccounts.includes(row.toCategory))throw new Error('Choose source and destination treasury accounts.');
 if(row.fromBranch===row.toBranch&&row.fromCategory===row.toCategory)throw new Error('Choose a different destination treasury.');
 if(!validExpenseDate(row.date)||row.date>cairoToday())throw new Error('Choose a valid transfer date up to today.');
 if(typeof row.reference!=='string'||row.reference.length>200||typeof row.description!=='string'||row.description.length>500)throw new Error('Transfer reference or description is too long.');
}
export function treasuryAvailableCents(data,branch,category){
 const ledger=buildTreasuryLedger(data.invoices||[],data.invoiceEvents||[],data.creditNotes||[],data.expenses||[],data.treasuryTransfers||[]);
 return ((data.treasuryBalances||[]).find(row=>row.branch===branch&&row.category===category)?.amountCents||0)+treasuryActivityCents(ledger.rows,branch,category);
}
export function prepareTreasuryTransfer(form,branches){
 const row={id:crypto.randomUUID(),fromBranch:form.fromBranch,fromCategory:form.fromCategory,toBranch:form.toBranch,toCategory:form.toCategory,amountCents:amountToCents(form.amount),date:form.date,reference:String(form.reference||'').trim(),description:String(form.description||'').trim(),createdAt:new Date().toISOString()};
 validateTreasuryTransfer(row);
 if(!branches.includes(row.fromBranch)||!branches.includes(row.toBranch))throw new Error('Choose branches from your assigned locations.');
 return row;
}
export function validateNewTreasuryTransfers(current,data){
 const existing=new Set((current.treasuryTransfers||[]).map(row=>String(row.id))),added=(data.treasuryTransfers||[]).filter(row=>!existing.has(String(row.id))).reverse().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
 const working={...data,treasuryTransfers:(data.treasuryTransfers||[]).filter(row=>existing.has(String(row.id)))};
 for(const row of added){
  if(!data.branches.includes(row.fromBranch)||!data.branches.includes(row.toBranch))throw new Error('Choose branches from your assigned locations.');
  const source=treasuryAvailableCents(working,row.fromBranch,row.fromCategory),destination=treasuryAvailableCents(working,row.toBranch,row.toCategory);
  if(!Number.isSafeInteger(source)||source<row.amountCents)throw new Error('Insufficient balance in the source treasury.');
  if(!Number.isSafeInteger(destination+row.amountCents))throw new Error('The destination balance is too large.');
  working.treasuryTransfers.push(row);
 }
}
