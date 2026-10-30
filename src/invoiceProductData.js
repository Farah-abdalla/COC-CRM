export function clearInvoiceProduct(item,sku){
 const {odooProductId,odooProductLabel,odooProductName,...record}=item;
 return {...record,sku};
}
export function selectInvoiceProduct(item,product){
 if(!Number.isSafeInteger(product?.id)||product.id<1||typeof product.name!=='string'||!product.name.trim())throw new Error('Choose a valid Odoo product.');
 const sku=String(product.default_code||product.name).trim().slice(0,200);
 const selected={...item,sku,odooProductId:product.id,odooProductLabel:sku,odooProductName:product.name.slice(0,300)};
 if((item.unitPrice===''||item.unitPrice===undefined||item.unitPrice===null)&&product.list_price!==false&&product.list_price!==null&&product.list_price!==undefined){
  const priceCents=Math.round(Number(product.list_price)*100);
  if(Number.isSafeInteger(priceCents)&&priceCents>=0){selected.unitPriceCents=priceCents;selected.unitPrice=(priceCents/100).toFixed(2);selected.lineTotalCents=priceCents*(Number(selected.quantity)||0);}
 }
 return selected;
}

export function cleanOdooProductName(value){return String(value||'').trim().replace(/^\[[^\]]+\]\s*/, '').trim();}
export function invoiceProductName(item,products=[]){
 const sku=String(item.sku||'').trim(),linked=Number.isSafeInteger(item.odooProductId)&&item.odooProductLabel===sku;
 if(linked&&typeof item.odooProductName==='string'&&item.odooProductName.trim())return cleanOdooProductName(item.odooProductName);
 const product=linked?products.find(product=>product.id===item.odooProductId):null;
 if(product?.name)return cleanOdooProductName(product.name);
 const bracket=sku.match(/^\[([^\]]+)\]\s*(.+)$/),matches=products.filter(product=>String(product.sku||product.default_code||'').trim()===(bracket?bracket[1]:sku)&&Boolean(sku));
 if(matches.length===1)return cleanOdooProductName(matches[0].name);
 if(bracket)return bracket[2].trim();
 // Older unlinked invoices used the SKU field as their free-text item description.
 return /^\d+$/.test(sku)?'':sku;
}
