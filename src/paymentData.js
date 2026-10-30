const cents=value=>Math.round((Number(value)||0)*100);
export function getInvoicePayments(invoices,events,customers=[]){
 const invoiceById=new Map(invoices.map(invoice=>[String(invoice.id),invoice])),customerById=new Map(customers.map(customer=>[String(customer.id),customer.name])),totals=new Map(),rows=[];
 for(const event of events){
  const adjustment=event.action==='Payment adjusted',amount=cents(event.amount);
  if((event.action!=='Payment recorded'&&!adjustment)||!Number.isFinite(Number(event.amount))||amount===0||(!adjustment&&amount<0))continue;
  const invoice=invoiceById.get(String(event.invoiceId)),[legacyMethod,...legacyReference]=String(event.description||'').split(' — ');
  totals.set(String(event.invoiceId),(totals.get(String(event.invoiceId))||0)+amount);
  rows.push({id:'payment-'+event.id,invoiceId:event.invoiceId,invoiceNumber:event.invoiceNumber||invoice?.number||'INV-'+event.invoiceId,customerName:event.customerName||customerById.get(String(invoice?.customerId||event.customerId))||'Customer details unavailable',branch:event.branch||invoice?.branch||'',date:event.timestamp||'',method:event.method||legacyMethod||'Not specified',treasuryCategory:event.treasuryCategory||'',reference:event.reference??legacyReference.join(' — '),amountCents:amount,kind:adjustment?'adjustment':'payment',hasInvoice:Boolean(invoice)});
 }
 for(const invoice of invoices){
  const difference=cents(invoice.paid)-(totals.get(String(invoice.id))||0);if(difference===0)continue;
  rows.push({id:'invoice-paid-'+invoice.id,invoiceId:invoice.id,invoiceNumber:invoice.number||'INV-'+invoice.id,customerName:customerById.get(String(invoice.customerId))||invoice.customerName||'Customer details unavailable',branch:invoice.branch||'',date:'',method:invoice.openingPaymentMethod||'Not specified',treasuryCategory:invoice.openingPaymentTreasuryCategory||'',reference:difference<0?'Invoice paid amount adjustment':'Amount entered directly on invoice',amountCents:difference,kind:difference<0?'adjustment':'direct',hasInvoice:true});
 }
 return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.invoiceNumber).localeCompare(String(b.invoiceNumber),undefined,{numeric:true}));
}
