export const invoiceBranchCodes={'Nasr City':'N','New Cairo':'NC',Heliopolis:'H',Mohandseen:'M',Downtown:'D'};
export const invoiceBranchNames=Object.keys(invoiceBranchCodes);
export function nextInvoiceNumber(invoices,branch){
  const code=invoiceBranchCodes[branch];
  if(!code)return '';
  const pattern=new RegExp('^INV-'+code+'([0-9]+)$','i');
  const next=invoices.reduce((max,invoice)=>{const match=String(invoice.number||'').match(pattern);return Math.max(max,match?Number(match[1]):0);},0)+1;
  return 'INV-'+code+String(next).padStart(3,'0');
}