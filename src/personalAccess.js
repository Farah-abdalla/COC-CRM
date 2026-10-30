export const personalName=value=>String(value||'').trim().replace(/\s+/g,' ').toLowerCase();
export const isPersonalAccount=user=>Boolean(user&&user.dataScope==='self'&&!user.isAdmin&&!user.isManager&&!['admin','manager'].includes(user.hrRole));
export function ownsSale(user,record){
 if(record.salesPersonId)return String(record.salesPersonId)===String(user.id);
 return user.salesIdentityUnique!==false&&Boolean(personalName(record.salesPerson))&&personalName(record.salesPerson)===personalName(user.salesPersonName||user.name);
}
export function personalRecordAllowed(user,key,record,data){
 if(key==='invoices'||key==='orders')return ownsSale(user,record);
 if(key==='creditNotes'||key==='invoiceEvents'){const invoice=data.invoices.find(row=>String(row.id)===String(record.invoiceId));return Boolean(invoice&&ownsSale(user,invoice));}
 if(key==='customers')return record.createdBy===user.id||[...data.invoices,...data.orders].some(sale=>String(sale.customerId)===String(record.id)&&ownsSale(user,sale));
 if(key==='exams')return record.uploadedBy===user.id||data.orders.some(sale=>(String(sale.examId)===String(record.id)||String(record.workOrderId)===String(sale.id))&&ownsSale(user,sale));
 return true;
}
