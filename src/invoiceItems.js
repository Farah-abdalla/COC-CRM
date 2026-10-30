const cents=value=>Math.round((Number(value)||0)*100);
export const newInvoiceItem=()=>({id:crypto.randomUUID(),sku:'',quantity:1,unitPrice:'',unitPriceCents:0,lineTotalCents:0});
export function invoiceItems(invoice){
 if(Array.isArray(invoice.items)&&invoice.items.length)return invoice.items.map(item=>({...item,quantity:Number(item.quantity),unitPriceCents:item.unitPriceCents??cents(item.unitPrice),lineTotalCents:item.lineTotalCents??cents(item.unitPrice)*Number(item.quantity)}));
 const quantity=Number(invoice.quantity)||1,total=cents(invoice.total);
 return [{id:'invoice-item',sku:String(invoice.sku||''),quantity,unitPriceCents:Math.round(total/quantity),lineTotalCents:total}];
}
export const invoiceSubtotalCents=invoice=>invoiceItems(invoice).reduce((sum,item)=>sum+item.lineTotalCents,0);
export const invoiceItemFingerprint=invoice=>JSON.stringify(invoiceItems(invoice).map(({id,sku,quantity,unitPriceCents,lineTotalCents})=>({id,sku,quantity,unitPriceCents,lineTotalCents})));
export const invoiceFormItems=invoice=>invoiceItems(invoice).map(item=>({...item,unitPrice:(item.unitPriceCents/100).toFixed(2)}));
export function invoiceItemTotals(items){return {total:items.reduce((sum,item)=>sum+(Number(item.lineTotalCents)||0),0)/100,quantity:items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0),sku:items.map(item=>item.sku.trim()).filter(Boolean).join(' + ')};}
export function normalizeInvoiceItems(items){
 if(!Array.isArray(items)||items.length<1||items.length>100)throw new Error('Add between 1 and 100 invoice items.');
 const normalized=items.map(item=>({...((Number.isSafeInteger(item.odooProductId)&&item.odooProductId>0&&item.odooProductLabel===String(item.sku||'').trim())?{odooProductId:item.odooProductId,odooProductLabel:item.odooProductLabel,...(typeof item.odooProductName==='string'?{odooProductName:item.odooProductName.slice(0,300)}:{})}:{}),id:item.id,sku:String(item.sku||'').trim(),quantity:Number(item.quantity),unitPriceCents:item.unitPriceCents??cents(item.unitPrice),lineTotalCents:item.lineTotalCents??cents(item.unitPrice)*Number(item.quantity)}));
 validateInvoiceItems({items:normalized,...invoiceItemTotals(normalized)});
 return normalized;
}
export function validateInvoiceItems(invoice){
 const items=invoice.items;
 if(!Array.isArray(items)||items.length<1||items.length>100)throw new Error('Add between 1 and 100 invoice items.');
 const ids=new Set();let total=0,quantity=0;
 for(const item of items){
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw new Error('Invoice items need unique IDs.');ids.add(item.id);
  if(typeof item.sku!=='string'||!item.sku.trim()||item.sku.length>200)throw new Error('Enter a SKU of up to 200 characters for every item.');
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>1000000)throw new Error('Each item needs a whole quantity from 1 to 1,000,000.');
  if(!Number.isSafeInteger(item.unitPriceCents)||item.unitPriceCents<0||!Number.isSafeInteger(item.lineTotalCents)||item.lineTotalCents<0||Math.abs(item.lineTotalCents-item.unitPriceCents*item.quantity)>Math.floor(item.quantity/2))throw new Error('Enter a valid unit price for every item.');
  total+=item.lineTotalCents;quantity+=item.quantity;
 }
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(quantity)||cents(invoice.total)!==total||Number(invoice.quantity)!==quantity)throw new Error('Invoice totals must match its items.');
}
export function discountedInvoiceItems(invoice){
 const items=invoiceItems(invoice),subtotal=items.reduce((sum,item)=>sum+item.lineTotalCents,0),discount=cents(invoice.discount);
 let running=0,previousDiscount=0;
 return items.map(item=>{running+=item.lineTotalCents;const allocated=subtotal>0?Math.round(discount*running/subtotal):0;const discountCents=allocated-previousDiscount;previousDiscount=allocated;return {...item,discountCents,netTotalCents:item.lineTotalCents-discountCents};});
}
