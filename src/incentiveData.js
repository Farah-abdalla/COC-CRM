import {invoiceItems} from './invoiceItems.js';
import {invoiceProductName,cleanOdooProductName} from './invoiceProductData.js';
export const FRAME_COMMISSION_EGP=50;
export const VEGAS_LENS_COMMISSION_EGP=50;
const key=value=>String(value||'').trim().toLowerCase();
export function defaultCommissionRules(){return [
 {id:'frame',name:'Frame',matchType:'contains',match:'frame',amountCents:5000,enabled:true},
 {id:'vegas-lens',name:'Vegas lens',matchType:'vegas-lens',match:'vegas',amountCents:5000,enabled:true}
];}
export function commissionProductKey(product){return Number.isSafeInteger(product.id)&&product.id>0?'id:'+product.id:product.sku?'sku:'+key(product.sku):'name:'+key(product.name);}
export function commissionProducts(invoices=[],products=[]){
 const choices=new Map();
 for(const product of products){const name=cleanOdooProductName(product.name);if(name){const choice={id:product.id,name,sku:String(product.sku||product.default_code||'').trim()};choices.set(commissionProductKey(choice),choice);}}
 for(const invoice of invoices)for(const item of invoiceItems(invoice)){
  const label=String(item.sku||'').trim(),bracket=label.match(/^\[([^\]]+)\]\s*(.+)$/),linked=Number.isSafeInteger(item.odooProductId)&&item.odooProductLabel===label;
  const name=invoiceProductName(item,products);if(!name)continue;
  const choice={...(linked?{id:item.odooProductId}:{}),name,sku:bracket?bracket[1].trim():linked||products.some(product=>key(product.sku||product.default_code)===key(label))?label:''};
  const choiceKey=commissionProductKey(choice);if(!choices.has(choiceKey))choices.set(choiceKey,choice);
 }
 return [...choices.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.sku.localeCompare(b.sku));
}
export function validateCommissionRule(rule){
 if(typeof rule.name!=='string'||!rule.name.trim()||rule.name.length>80)throw new Error('Enter a commission item name of up to 80 characters.');
 if(!['product','exact','contains','vegas-lens'].includes(rule.matchType))throw new Error('Choose a valid item matching rule.');
 if(typeof rule.match!=='string'||!rule.match.trim()||rule.match.length>(rule.matchType==='product'?300:160))throw new Error('Enter a valid product name, SKU or keyword.');
 if(rule.matchType==='product'){
  if(rule.productId!==undefined&&(!Number.isSafeInteger(rule.productId)||rule.productId<1))throw new Error('Choose a valid product.');
  if(rule.productSku!==undefined&&(typeof rule.productSku!=='string'||rule.productSku.length>200))throw new Error('Choose a valid product SKU.');
 }
 if(!Number.isSafeInteger(rule.amountCents)||rule.amountCents<=0)throw new Error('Commission must be greater than zero.');
 if(typeof rule.enabled!=='boolean')throw new Error('Choose whether this commission item is enabled.');
}
export function ruleMatches(invoice,rule,products=[]){
 if(invoice.isVoided||!rule.enabled)return false;
 const match=key(rule.match);if(!match)return false;
 return invoiceItems(invoice).some(item=>{
  const sku=key(item.sku),bracket=String(item.sku||'').trim().match(/^\[([^\]]+)\]\s*(.+)$/),code=bracket?key(bracket[1]):sku,name=key(invoiceProductName(item,products));
  if(rule.matchType==='product'){
   const linked=Number.isSafeInteger(item.odooProductId)&&item.odooProductLabel===String(item.sku||'').trim();
   if(rule.productId&&linked)return item.odooProductId===rule.productId;
   if(rule.productSku&&code===key(rule.productSku))return true;
   // Plain names remain matchable on older invoices with no stored product ID.
   return Boolean(name&&name===match&&(!rule.productSku||!bracket&&name===sku));
  }
  const values=[sku,code,name].filter(Boolean);
  if(rule.matchType==='exact')return values.includes(match);
  if(rule.matchType==='contains')return values.some(value=>value.includes(match));
  return rule.matchType==='vegas-lens'&&values.some(value=>value.includes('vegas')&&/len(?:s|ses)?/.test(value));
 });
}
export function commissionQuantity(invoice,rule,products=[]){
 if(invoice.isVoided||!rule.enabled)return 0;
 return invoiceItems(invoice).reduce((sum,item)=>{const quantity=Number(item.quantity);return sum+(Number.isSafeInteger(quantity)&&quantity>0&&ruleMatches({items:[item]},rule,products)?quantity:0);},0);
}
export function commissionBreakdown(invoice,rules=defaultCommissionRules(),products=[]){return rules.map(rule=>{const quantity=commissionQuantity(invoice,rule,products);return {...rule,quantity,commissionCents:quantity*rule.amountCents};}).filter(rule=>rule.quantity>0);}
export function invoiceCommissionCents(invoice,rules=defaultCommissionRules(),products=[]){return commissionBreakdown(invoice,rules,products).reduce((sum,rule)=>sum+rule.commissionCents,0);}
export const invoiceCommission=(invoice,rules,products)=>invoiceCommissionCents(invoice,rules,products)/100;
export const frameCommission=(invoice,rules=defaultCommissionRules(),products=[])=>commissionBreakdown(invoice,rules,products).filter(rule=>rule.id==='frame').reduce((sum,rule)=>sum+rule.commissionCents,0)/100;
export const vegasLensCommission=(invoice,rules=defaultCommissionRules(),products=[])=>commissionBreakdown(invoice,rules,products).filter(rule=>rule.id==='vegas-lens').reduce((sum,rule)=>sum+rule.commissionCents,0)/100;
export const salesPeople=['Saif','Mohamed Alaa','Mohamed Ashraf','Ehsan'];
