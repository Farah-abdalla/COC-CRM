import {discountedInvoiceItems} from './invoiceItems.js';
import {invoiceProductResolver} from './productSales.js';
import {branchIncentiveTotals,incentiveBranch} from './branchIncentiveData.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {cairoToday} from './taskDeadlines.js';
export function todaySalesSummary(data,now=new Date()){
 const date=cairoToday(now),report=branchIncentiveTotals({...data,startDate:date,endDate:date}),salespeople=new Map(),categorySales=new Map(),resolveProduct=invoiceProductResolver(data.odooReportProducts||[]);
 for(const invoice of data.invoices||[]){
  if(invoice.isVoided||invoice.date!==date)continue;
  const branch=incentiveBranch(invoice.branch),name=String(invoice.salesPerson||'').trim()||'Unassigned salesperson',key=JSON.stringify([branch,name]);
  if(!salespeople.has(key))salespeople.set(key,{branch,name,amountCents:0});
  salespeople.get(key).amountCents+=Math.round(invoiceAmounts(invoice).originalTotal*100);
  for(const item of discountedInvoiceItems(invoice)){
   const product=resolveProduct(item);if(!product)continue;
   const categoryName=Array.isArray(product.categ_id)?product.categ_id[1]:product.categoryName||'';
   const category=/\beyeglasses\b/i.test(categoryName)?'Eyeglasses':/\bsunglasses\b/i.test(categoryName)?'Sunglasses':/\bglasses\b/i.test(categoryName)?'Glasses':'';
   if(!category)continue;
   const productId=product.id,productName=String(product.name||product.sku).trim(),categoryKey=JSON.stringify([branch,productId,category]);
   if(!categorySales.has(categoryKey))categorySales.set(categoryKey,{branch,productId,productName,category,amountCents:0,quantity:0});
   const row=categorySales.get(categoryKey);row.amountCents+=item.netTotalCents;row.quantity+=item.quantity;
  }
 }
 return {date,updatedAt:now.toISOString(),categorySales:[...categorySales.values()],byBranch:report.rows.map(row=>({branch:row.branch,invoiceCount:row.invoiceCount,grossCents:row.invoiceCents,refundCents:row.creditCents,netCents:row.netCents})).sort((a,b)=>b.netCents-a.netCents||a.branch.localeCompare(b.branch)),salespeople:[...salespeople.values()].sort((a,b)=>b.amountCents-a.amountCents)};
}

export function categoryProductRankings(rows=[],branch='all'){
 return ['Eyeglasses','Sunglasses','Glasses'].map(category=>{
  const products=new Map();
  for(const row of rows){
   if(row.category!==category||(branch!=='all'&&row.branch!==branch))continue;
   const key=String(row.productId);
   if(!products.has(key))products.set(key,{productId:row.productId,name:row.productName,amountCents:0,quantity:0});
   const product=products.get(key);product.amountCents+=row.amountCents;product.quantity+=row.quantity;
  }
  return {category,products:[...products.values()].filter(row=>row.quantity>0).sort((a,b)=>b.quantity-a.quantity||b.amountCents-a.amountCents||a.name.localeCompare(b.name))};
 });
}
