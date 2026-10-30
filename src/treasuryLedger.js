import {getInvoicePayments} from './paymentData.js';
import {treasuryAccountFor} from './paymentMethods.js';
export function buildTreasuryLedger(invoices,events,creditNotes,expenses=[],transfers=[]){
 const payments=getInvoicePayments(invoices,events),invoiceById=new Map(invoices.map(invoice=>[String(invoice.id),invoice])),accounts=new Map(),rows=[],unassigned=[];
 for(const payment of payments){const account=treasuryAccountFor(payment.method,payment.treasuryCategory);if(account&&payment.amountCents>0){const id=String(payment.invoiceId);if(!accounts.has(id))accounts.set(id,new Set());accounts.get(id).add(account);}}
 const soleAccount=id=>{const set=accounts.get(String(id));return set?.size===1?[...set][0]:null;};
 for(const payment of payments){
  const category=treasuryAccountFor(payment.method,payment.treasuryCategory),row={...payment,category,kind:payment.kind==='adjustment'?'Adjustment':'Payment'};
  if(category&&row.branch)rows.push(row);else unassigned.push(row);
 }
 for(const note of creditNotes){
  const amountCents=Math.round(Number(note.amount||0)*100);if(!Number.isSafeInteger(amountCents)||amountCents<=0)continue;
  const invoice=invoiceById.get(String(note.invoiceId)),category=treasuryAccountFor(note.method,note.treasuryCategory)||soleAccount(note.invoiceId);
  const row={id:'refund-'+note.id,invoiceId:note.invoiceId,invoiceNumber:note.invoiceNumber||invoice?.number||'INV-'+note.invoiceId,branch:note.branch||invoice?.branch||'',category,amountCents:-amountCents,date:note.date||'',method:note.method||category||'Not specified',reference:note.number||note.reason||'Refund',kind:'Refund',hasInvoice:Boolean(invoice)};
  if(category&&row.branch)rows.push(row);else unassigned.push(row);
 }
 const expenseRows=[];
 for(const expense of expenses){
  if(!Number.isSafeInteger(expense.amountCents)||expense.amountCents<=0)continue;
  const category=treasuryAccountFor(expense.method,expense.treasuryCategory);
  const row={id:'expense-'+expense.id,expenseId:expense.id,branch:expense.branch||'',category,amountCents:-expense.amountCents,date:expense.date||'',method:expense.method,reference:expense.reference||'',description:expense.description||'',expenseCategory:expense.category||'',paidTo:expense.paidTo||'',kind:'Expense'};
  expenseRows.push({...row,category:'Expenses'});
  if(category&&row.branch)rows.push(row);else unassigned.push(row);
 }
 for(const transfer of transfers){
  if(!Number.isSafeInteger(transfer.amountCents)||transfer.amountCents<=0)continue;
  const common={transferId:transfer.id,date:transfer.date,reference:transfer.reference,description:transfer.description,kind:'Transfer'};
  rows.push({...common,id:'treasury-transfer-out-'+transfer.id,branch:transfer.fromBranch,category:transfer.fromCategory,amountCents:-transfer.amountCents,counterpartyBranch:transfer.toBranch,counterpartyCategory:transfer.toCategory});
  rows.push({...common,id:'treasury-transfer-in-'+transfer.id,branch:transfer.toBranch,category:transfer.toCategory,amountCents:transfer.amountCents,counterpartyBranch:transfer.fromBranch,counterpartyCategory:transfer.fromCategory});
 }
 return {expenseRows,rows:rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))),unassigned};
}
export const treasuryActivityCents=(rows,branch,category)=>rows.filter(row=>row.branch===branch&&row.category===category).reduce((sum,row)=>sum+row.amountCents,0);
