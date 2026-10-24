import { invoiceAmounts } from './invoiceAmounts';
import { invoiceBranchCodes } from './invoiceNumbers';
export const refundedAmount=(invoiceId,notes)=>notes.filter(note=>String(note.invoiceId)===String(invoiceId)).reduce((sum,note)=>sum+Math.round(Number(note.amount||0)*100),0)/100;
export const refundableAmount=invoice=>{const amounts=invoiceAmounts(invoice);return Math.max(0,Math.min(amounts.total,amounts.paid));};
export function nextCreditNumber(notes,branch){
  const prefix='CN-'+(invoiceBranchCodes[branch]||'');
  const pattern=new RegExp('^'+prefix+'([0-9]+)$','i');
  const next=notes.reduce((max,note)=>{const match=String(note.number||'').match(pattern);return Math.max(max,match?Number(match[1]):0);},0)+1;
  return prefix+String(next).padStart(3,'0');
}
export function invoiceRefundItem(invoice,notes){
  const quantity=Number(invoice.quantity)||1;
  const matching=notes.filter(note=>String(note.invoiceId)===String(invoice.id));
  const returnedQuantity=matching.reduce((sum,note)=>sum+(note.items||[]).filter(item=>item.itemId==='invoice-item').reduce((count,item)=>count+Number(item.quantity||0),0),0);
  const legacyAmount=matching.filter(note=>!note.items?.length).reduce((sum,note)=>sum+Math.round(Number(note.amount||0)*100),0)/100;
  const amounts=invoiceAmounts(invoice);
  return {itemId:'invoice-item',sku:invoice.sku||'',quantity,returnedQuantity,remainingQuantity:Math.max(0,quantity-returnedQuantity),unitPrice:amounts.subtotal/quantity,netUnitPrice:amounts.itemTotal/quantity,legacyAmount};
}
export function itemRefundPlan(invoice,notes,requestedQuantity){
  const item=invoiceRefundItem(invoice,notes),quantity=Number(requestedQuantity);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>item.remainingQuantity)return {error:'Choose a whole quantity from 1 to '+item.remainingQuantity+'.'};
  const amounts=invoiceAmounts(invoice),start=item.returnedQuantity,end=start+quantity;
  const proportional=cents=>Math.round(cents*end/item.quantity)-Math.round(cents*start/item.quantity);
  const netCents=proportional(Math.round(amounts.itemTotal*100)),grossCents=proportional(Math.round(amounts.subtotal*100));
  if(netCents<=0)return {error:'This item has no refundable amount after discount.'};
  if(netCents>Math.round(refundableAmount(invoice)*100))return {error:'The selected items exceed the remaining amount paid. Choose a smaller return quantity.'};
  return {amount:netCents/100,items:[{itemId:item.itemId,sku:item.sku,quantity,unitPrice:item.unitPrice,netUnitPrice:item.netUnitPrice,discount:(grossCents-netCents)/100,amount:netCents/100}]};
}