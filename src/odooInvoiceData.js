// Totals cover the posted product lines available from the gateway.
export function groupOdooInvoices(lines){
 const groups=new Map(),seen=new Set();
 for(const line of lines){
  if(seen.has(line.id))continue;seen.add(line.id);
  const moveId=Array.isArray(line.move_id)?line.move_id[0]:null;
  if(!moveId)throw new Error('Odoo invoice ID is missing.');
  let invoice=groups.get(moveId);
  if(!invoice){invoice={id:moveId,number:line.move_name||line.move_id[1],date:line.date,customerId:Array.isArray(line.partner_id)?line.partner_id[0]:null,customer:Array.isArray(line.partner_id)?line.partner_id[1]:'',lines:[],subtotalCents:0,totalCents:0};groups.set(moveId,invoice);}
  invoice.lines.push(line);
  invoice.subtotalCents+=Math.round(Number(line.price_subtotal||0)*100);
  invoice.totalCents+=Math.round(Number(line.price_total||0)*100);
 }
 return [...groups.values()].map(invoice=>({...invoice,subtotal:invoice.subtotalCents/100,tax:(invoice.totalCents-invoice.subtotalCents)/100,total:invoice.totalCents/100})).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id);
}
