import {invoiceAmounts} from './invoiceAmounts.js';
import {invoiceBranchCodes} from './invoiceNumbers.js';
import {discountedInvoiceItems} from './invoiceItems.js';
export const refundedAmount=(invoiceId,notes)=>notes.filter(note=>String(note.invoiceId)===String(invoiceId)).reduce((sum,note)=>sum+Math.round(Number(note.amount||0)*100),0)/100;
export const refundableAmount=invoice=>{const amounts=invoiceAmounts(invoice);return Math.max(0,Math.min(amounts.total,amounts.paid));};
export function nextCreditNumber(notes,branch){
 const prefix='CN-'+(invoiceBranchCodes[branch]||''),pattern=new RegExp('^'+prefix+'([0-9]+)$','i');
 const next=notes.reduce((max,note)=>{const match=String(note.number||'').match(pattern);return Math.max(max,match?Number(match[1]):0);},0)+1;
 return prefix+String(next).padStart(3,'0');
}
export function invoiceRefundItems(invoice,notes){
 const matching=notes.filter(note=>String(note.invoiceId)===String(invoice.id));
 return discountedInvoiceItems(invoice).map(item=>{
  const returnedQuantity=matching.reduce((sum,note)=>sum+(note.items||[]).filter(row=>row.itemId===item.id).reduce((count,row)=>count+Number(row.quantity||0),0),0);
  return {...item,itemId:item.id,returnedQuantity,remainingQuantity:Math.max(0,item.quantity-returnedQuantity),unitPrice:item.lineTotalCents/100/item.quantity,netUnitPrice:item.netTotalCents/100/item.quantity};
 });
}
export function invoiceRefundItem(invoice,notes){
 const items=invoiceRefundItems(invoice,notes),legacyAmount=notes.filter(note=>String(note.invoiceId)===String(invoice.id)&&!note.items?.length).reduce((sum,note)=>sum+Math.round(Number(note.amount||0)*100),0)/100;
 if(items.length===1)return {...items[0],legacyAmount};
 return {sku:items.map(item=>item.sku).join(' + '),quantity:items.reduce((sum,item)=>sum+item.quantity,0),returnedQuantity:items.reduce((sum,item)=>sum+item.returnedQuantity,0),remainingQuantity:items.reduce((sum,item)=>sum+item.remainingQuantity,0),legacyAmount};
}
export function itemRefundPlan(invoice,notes,selection){
 const available=invoiceRefundItems(invoice,notes),requests=Array.isArray(selection)?selection:[{itemId:available[0]?.itemId,quantity:selection}],items=[],ids=new Set();
 if(!requests.length)return {error:'Select at least one item to refund.'};
 for(const requested of requests){
  const item=available.find(row=>row.itemId===requested.itemId),quantity=Number(requested.quantity);
  if(!item||ids.has(requested.itemId))return {error:'Choose valid, unique items to refund.'};ids.add(requested.itemId);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>item.remainingQuantity)return {error:'Choose a whole return quantity from 1 to '+item.remainingQuantity+' for '+item.sku+'.'};
  const start=item.returnedQuantity,end=start+quantity,portion=cents=>Math.round(cents*end/item.quantity)-Math.round(cents*start/item.quantity),netCents=portion(item.netTotalCents),grossCents=portion(item.lineTotalCents);
  if(netCents<=0)return {error:'The selected item has no refundable amount after discount.'};
  items.push({itemId:item.itemId,sku:item.sku,quantity,unitPrice:item.unitPrice,netUnitPrice:item.netUnitPrice,discount:(grossCents-netCents)/100,amount:netCents/100});
 }
 const amountCents=items.reduce((sum,item)=>sum+Math.round(item.amount*100),0);
 if(amountCents>Math.round(refundableAmount(invoice)*100))return {error:'The selected items exceed the remaining amount paid. Choose a smaller return quantity.'};
 return {amount:amountCents/100,items};
}
