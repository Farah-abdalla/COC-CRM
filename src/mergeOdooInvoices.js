import {cleanOdooProductName} from './invoiceProductData.js';
import {invoiceItemTotals,validateInvoiceItems} from './invoiceItems.js';
export function importOdooInvoices(data,records,{branch='',now=new Date().toISOString()}={}){
 const next={...data,customers:[...data.customers],invoices:[...data.invoices],invoiceEvents:[...data.invoiceEvents]};
 const summary={added:0,existing:0,updated:0,skipped:[]};
 const known=new Set(data.invoices.filter(r=>r.odooInvoiceId).map(r=>String(r.odooInvoiceId)));
 for(const source of records){
  if(known.has(String(source.id))){
   summary.existing++;
   const existing=next.invoices.find(record=>String(record.odooInvoiceId)===String(source.id));
   if(existing&&!existing.branch&&source.branch){next.invoices=next.invoices.map(record=>record===existing?{...record,branch:source.branch,...(source.odooBranchId?{odooBranchId:source.odooBranchId}:{})}:record);summary.updated++;}
   continue;
  }
  try{
   if(!Number.isSafeInteger(source.id)||source.id<1||!Number.isSafeInteger(source.customerId)||source.customerId<1)throw new Error('Missing Odoo invoice or customer ID.');
   const id='odoo-coc-'+source.id;
   if(next.invoices.some(r=>String(r.id)===id||r.number===source.number))throw new Error('Invoice number or ID already exists in CRM.');
   const items=[],odooAdjustments=[];let adjustmentCents=0;
   for(const line of source.lines){
    const quantity=Number(line.quantity),gross=Number(line.price_total),label=String(Array.isArray(line.product_id)?line.product_id[1]:'Odoo item '+line.id).slice(0,200);
    if(!Number.isSafeInteger(quantity)||quantity<1||!Number.isFinite(gross))throw new Error('Unsupported item quantity or amount.');
    const lineTotalCents=Math.round(gross*100);
    if(/^invoice adjustment$/i.test(cleanOdooProductName(label).trim())){adjustmentCents+=lineTotalCents;odooAdjustments.push({lineId:line.id,description:label,amountCents:lineTotalCents});continue;}
    if(gross<0)throw new Error('Unsupported item quantity or amount.');
    items.push({id:'odoo-line-'+line.id,sku:label,quantity,unitPriceCents:Math.round(lineTotalCents/quantity),lineTotalCents,...(Array.isArray(line.product_id)&&Number.isSafeInteger(line.product_id[0])?{odooProductId:line.product_id[0],odooProductLabel:label,odooProductName:cleanOdooProductName(line.product_id[1]).slice(0,300)}:{})});
   }
   const sourceCents=items.reduce((sum,item)=>sum+item.lineTotalCents,0)+adjustmentCents;
   if(sourceCents<0||(source.total!=null&&Math.round(Number(source.total)*100)!==sourceCents))throw new Error('Odoo invoice totals do not match the source lines.');
   let customer=next.customers.find(r=>String(r.odooPartnerId)===String(source.customerId));
   const customerId=customer?.id??-source.customerId;
   if(!customer&&next.customers.some(r=>String(r.id)===String(customerId)))throw new Error('Customer ID already exists in CRM.');
   const invoice={id,number:source.number,odooInvoiceId:source.id,odooPaymentUnverified:true,customerId,customerName:source.customer,branch:source.branch||branch,...(source.odooBranchId?{odooBranchId:source.odooBranchId}:{}),date:source.date,dueDate:'',items,...invoiceItemTotals(items),discount:0,shippingCharge:0,adjustment:adjustmentCents/100,...(odooAdjustments.length?{odooAdjustments}:{}),paid:0,salesPerson:'',cashier:'',workOrderId:'',notes:'Imported from Odoo. Item prices include source discounts and tax. Odoo payment history is unavailable; reconcile payments before collection. Changes are saved in CRM only.'};
   validateInvoiceItems(invoice);
   if(!customer){customer={id:customerId,odooPartnerId:source.customerId,name:source.customer||'Odoo customer '+source.customerId,phone:'',email:'',branch:'',joined:source.date,notes:'Imported from Odoo.'};next.customers.push(customer);}
   next.invoices.push(invoice);known.add(String(source.id));
   if(!next.invoiceEvents.some(event=>event.id==='odoo-import-'+source.id))next.invoiceEvents.push({id:'odoo-import-'+source.id,invoiceId:id,action:'Invoice imported',timestamp:now,description:'Imported from Odoo '+source.number+'. Payment history not provided.'});summary.added++;
  }catch(error){summary.skipped.push({number:source.number,reason:error.message});}
 }
 return {data:next,...summary};
}
