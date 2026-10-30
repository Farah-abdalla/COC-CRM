import {getInvoicePayments} from './paymentData.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {requireTreasuryAccount} from './paymentMethods.js';
export function changePayment(snapshot,rowId,changes){
 const row=getInvoicePayments(snapshot.data.invoices,snapshot.data.invoiceEvents).find(row=>row.id===rowId);
 if(!row)throw new Error('Payment no longer exists. Reload company records.');
 const invoice=snapshot.data.invoices.find(invoice=>String(invoice.id)===String(row.invoiceId));
 if(!invoice)throw new Error('The linked invoice is unavailable.');
 if(invoice.locked||invoice.isVoided)throw new Error('Unlock an active invoice before changing its payments.');
 const removing=changes===null;
 let amountCents=0,account;
 if(!removing){
  amountCents=changes.amountCents;
  if(!Number.isSafeInteger(amountCents)||amountCents===0||Math.sign(amountCents)!==Math.sign(row.amountCents))throw new Error('Enter a positive amount. Payment corrections keep their original sign.');
  account=requireTreasuryAccount(changes.method,changes.treasuryCategory);
  if(typeof changes.reference!=='string'||changes.reference.length>200||typeof changes.timestamp!=='string'||!Number.isFinite(Date.parse(changes.timestamp)))throw new Error('Enter a valid payment date and reference.');
 }
 const paidCents=Math.round(Number(invoice.paid||0)*100)+amountCents-row.amountCents;
 const refundedCents=snapshot.data.creditNotes.filter(note=>String(note.invoiceId)===String(invoice.id)).reduce((sum,note)=>sum+Math.round(Number(note.amount||0)*100),0);
 if(!Number.isSafeInteger(paidCents)||paidCents<refundedCents||paidCents<0||paidCents>Math.round(invoiceAmounts(invoice).originalTotal*100))throw new Error('Payment changes must keep the invoice paid amount between its refunds and total.');
 let events=snapshot.data.invoiceEvents;
 const event=events.find(event=>'payment-'+event.id===rowId);
 if(removing){
  if(event)events=events.filter(item=>item!==event);
 }else{
  const updated={...(event||{}),id:event?.id||crypto.randomUUID(),invoiceId:invoice.id,invoiceNumber:invoice.number,customerId:invoice.customerId,branch:invoice.branch,action:amountCents>0?'Payment recorded':'Payment adjusted',amount:amountCents/100,method:changes.method,treasuryCategory:account,reference:changes.reference,description:changes.method+(changes.reference?' - '+changes.reference:''),timestamp:new Date(changes.timestamp).toISOString()};
  events=event?events.map(item=>item===event?updated:item):[updated,...events];
 }
 return {...snapshot,data:{...snapshot.data,invoices:snapshot.data.invoices.map(item=>item===invoice?{...item,paid:paidCents/100}:item),invoiceEvents:events}};
}
