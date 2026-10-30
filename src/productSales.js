import {discountedInvoiceItems,invoiceItems} from './invoiceItems.js';
export const productSalesFields=['sunglasses','eyeglasses','vegasX6','accessories'];
export const productCountFields=productSalesFields.map(field=>field+'Count');
const text=value=>String(value||'').trim();
const key=value=>text(value).replace(/\s+/g,' ').toLowerCase();
export function productGroup(product){
 const category=Array.isArray(product.categ_id)?product.categ_id[1]:product.categoryName||'',name=product.name||'';
 if(/\baccessor(?:y|ies)\b/i.test(category))return 'accessories';
 if(/vegas/i.test(category+' '+name)&&/\bx\s*6\b/i.test(category+' '+name))return 'vegasX6';
 if(/sunglasses/i.test(category))return 'sunglasses';
 if(/eyeglasses/i.test(category))return 'eyeglasses';
 return '';
}
export function productSelectors(invoices){
 const selectors=new Map();
 for(const invoice of invoices)for(const item of invoiceItems(invoice)){
  const label=text(item.sku),match=label.match(/^\[([^\]]+)\]\s*(.+)$/),id=Number(item.odooProductId);
  const selector={...(Number.isSafeInteger(id)&&id>0&&item.odooProductLabel===label?{id}:{}),name:match?match[2]:label,code:match?match[1]:label};
  if(selector.id||selector.name)selectors.set(JSON.stringify(selector),selector);
 }
 return [...selectors.values()];
}
export function validateProductLink(row){
 if(!Number.isSafeInteger(row.id)||row.id<1||typeof row.name!=='string'||!row.name||row.name.length>300||typeof row.sku!=='string'||row.sku.length>200||typeof row.categoryName!=='string'||row.categoryName.length>300||(row.categoryId!==null&&(!Number.isSafeInteger(row.categoryId)||row.categoryId<1)))throw new Error('Invalid Odoo product link.');
}
export function productLinks(records){return records.map(product=>({id:product.id,name:text(product.name).slice(0,300),sku:text(product.default_code).slice(0,200),categoryId:Array.isArray(product.categ_id)?product.categ_id[0]:null,categoryName:Array.isArray(product.categ_id)?text(product.categ_id[1]).slice(0,300):''}));}
export function invoiceProductResolver(links=[]){
 const byId=new Map(links.map(product=>[product.id,product])),byName=new Map(),byCode=new Map();
 for(const product of links){for(const [index,value] of [[byName,product.name],[byCode,product.sku]]){const k=key(value);if(!k)continue;if(!index.has(k))index.set(k,[]);index.get(k).push(product);}}
 const unique=list=>list?.length===1?list[0]:null;
 return item=>{
  const label=text(item.sku),match=label.match(/^\[([^\]]+)\]\s*(.+)$/),id=Number(item.odooProductId);
  return Number.isSafeInteger(id)&&id>0&&item.odooProductLabel===label?byId.get(id):unique(byCode.get(key(match?match[1]:label)))||unique(byName.get(key(match?match[2]:label)));
 };
}
export function productSales(invoice,links=[],{includeCounts=false}={}){
 const totals=Object.fromEntries(productSalesFields.map(field=>[field,0])),counts=Object.fromEntries(productCountFields.map(field=>[field,0]));if(invoice.isVoided)return {...totals,...(includeCounts?counts:{})};
 const resolveProduct=invoiceProductResolver(links);
 for(const item of discountedInvoiceItems(invoice)){
  const product=resolveProduct(item);
  if(!product)continue;const group=productGroup(product);if(group){totals[group]+=item.netTotalCents;counts[group+'Count']+=Number(item.quantity)||0;}
 }
 return {...Object.fromEntries(Object.entries(totals).map(([field,cents])=>[field,cents/100])),...(includeCounts?counts:{})};
}
