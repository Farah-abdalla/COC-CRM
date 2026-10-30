import {t as uiT,useLanguage as useUiLanguage} from './i18n';
import React,{useEffect,useState} from 'react';
import {Plus,Pencil,ShieldCheck,X} from 'lucide-react';
import {useAuth,api} from './Auth';
import {amountToCents,formatTreasuryAmount} from './treasuryAmounts';
import {validateCommissionRule,commissionProducts,commissionProductKey} from './incentiveData';
import './commission.css';
export default function CommissionSettings({rules,onSave,invoices=[],products=[]}){
 useUiLanguage();
 const auth=useAuth(),[form,setForm]=useState(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[catalogue,setCatalogue]=useState([]),[loading,setLoading]=useState(false),[lookupError,setLookupError]=useState(''),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!auth.user.isAdmin||form?.matchType!=='product')return;
  let active=true;setLoading(true);setLookupError('');setCatalogue([]);setHasMore(false);
  const timer=setTimeout(async()=>{try{const result=await api('/api/odoo/products?'+new URLSearchParams({q:query,limit:'20',offset:String(offset)}));if(active){setCatalogue(result.records||[]);setHasMore(Boolean(result.hasMore));}}catch(error){if(active)setLookupError(error.message);}finally{if(active)setLoading(false);}},300);
  return()=>{active=false;clearTimeout(timer);};
 },[auth.user.isAdmin,form?.matchType,query,offset,retry]);
 if(!auth.user.isAdmin)return null;
 const available=commissionProducts(invoices,[...products,...catalogue]);
 const chosen=form?.matchType==='product'&&form.match?{id:form.productId,name:form.match,sku:form.productSku||''}:null;
 if(chosen&&!available.some(product=>commissionProductKey(product)===commissionProductKey(chosen)))available.unshift(chosen);
 const options=available.filter(product=>chosen&&commissionProductKey(product)===commissionProductKey(chosen)||[product.name,product.sku].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const label=rule=>rule.matchType==='product'?rule.match:rule.matchType==='exact'?'Exact SKU: '+rule.match:rule.matchType==='contains'?'SKU contains: '+rule.match:'SKU includes Vegas and lens';
 function open(rule){setError('');setQuery('');setOffset(0);setCatalogue([]);setForm(rule?{...rule,amount:(rule.amountCents/100).toFixed(2)}:{name:'',matchType:'product',match:'',amount:'',enabled:true});}
 function choose(value){const product=available.find(product=>commissionProductKey(product)===value);if(product)setForm({...form,match:product.name,productId:product.id,productSku:product.sku,name:form.name||product.name.slice(0,80)});}
 function submit(event){event.preventDefault();setError('');try{
  const rule={id:form.id||crypto.randomUUID(),name:form.name.trim(),matchType:form.matchType,match:form.match.trim(),...(form.matchType==='product'?{...(form.productId?{productId:form.productId}:{}),productSku:form.productSku||''}:{}),amountCents:amountToCents(form.amount),enabled:form.enabled};
  validateCommissionRule(rule);if(rules.some(item=>item.id!==rule.id&&item.name.trim().toLowerCase()===rule.name.toLowerCase()))throw new Error('A commission item with this name already exists.');
  if(onSave(rule)===true)setForm(null);else setError('The commission item could not be saved. Check the storage message.');
 }catch(error){setError(error.message);}}
 return <section className="panel commission-settings"><div className="panel-head"><div><h2><ShieldCheck size={19}/> {uiT('Commission items')}</h2><p>{uiT('Select invoice products and set their incentive amount.')}</p></div><button className="primary" onClick={()=>open(null)}><Plus size={16}/> {uiT('Add commission item')}</button></div>
  <div className="table-wrap"><table><thead><tr><th>{uiT('Selected')}</th><th>{uiT('Item')}</th><th>{uiT('Linked product / matching')}</th><th>{uiT('Commission per unit')}</th><th>{uiT('Actions')}</th></tr></thead><tbody>{rules.map(rule=><tr key={rule.id}><td><input className="commission-toggle" type="checkbox" aria-label={uiT('Enable commission for '+rule.name)} checked={rule.enabled} onChange={e=>onSave({...rule,enabled:e.target.checked})}/></td><td><b>{rule.name}</b></td><td>{uiT(label(rule))}</td><td>{formatTreasuryAmount(rule.amountCents)}</td><td><button className="secondary" onClick={()=>open(rule)} aria-label={uiT('Edit commission '+rule.name)}><Pencil size={14}/> {uiT('Edit')}</button></td></tr>)}</tbody></table></div>
  {!rules.length&&<p className="empty">{uiT('Add a commission item to begin.')}</p>}<p className="commission-help">{uiT('Each matching unit sold earns the configured commission. Quantity 10 earns 10 times the unit commission. Changes recalculate existing invoices and incentive reports.')}</p>
  {form&&<div className="modal-backdrop" onKeyDown={e=>{if(e.key==='Escape')setForm(null);}}><form className="modal commission-modal" role="dialog" aria-modal="true" aria-labelledby="commission-title" onSubmit={submit}><div className="modal-head"><h2 id="commission-title">{form.id?uiT('Edit commission item'):uiT('Add commission item')}</h2><button className="icon-btn" type="button" aria-label={uiT('Close commission form')} onClick={()=>setForm(null)}><X/></button></div>
   <div className="form-grid"><label>{uiT('Match item by')}<select value={form.matchType} onChange={e=>{setQuery('');setOffset(0);setForm({...form,matchType:e.target.value,match:e.target.value==='vegas-lens'?'vegas':'',productId:undefined,productSku:undefined});}}><option value="product">{uiT('Linked product')}</option><option value="exact">{uiT('Exact SKU')}</option><option value="contains">{uiT('SKU contains keyword')}</option>{form.matchType==='vegas-lens'&&<option value="vegas-lens">{uiT('Vegas lens')}</option>}</select></label><label>{uiT('Commission per unit (EGP) *')}<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
    {form.matchType==='product'&&<><label className="span-2">{uiT('Search products')}<input value={query} maxLength={120} onChange={e=>{setQuery(e.target.value);setOffset(0);}} placeholder={uiT('Search by product name')}/></label><label className="span-2">{uiT('Linked product')} *<select required value={chosen?commissionProductKey(chosen):''} onChange={e=>choose(e.target.value)}><option value="">{uiT('Choose product')}</option>{options.map(product=><option key={commissionProductKey(product)} value={commissionProductKey(product)}>{product.name}{product.sku?' ('+product.sku+')':''}</option>)}</select><small>{uiT('Products from invoices and the Odoo catalogue are available here.')}</small></label>{loading&&<p className="span-2" role="status">{uiT('Loading products...')}</p>}{lookupError&&<div className="span-2" role="status"><p>{uiT('Catalogue unavailable. You can still choose products from existing invoices.')}</p><button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>{uiT('Retry')}</button></div>}{!loading&&(offset>0||hasMore)&&<div className="span-2"><button className="secondary" type="button" disabled={!offset} onClick={()=>setOffset(value=>Math.max(0,value-20))}>{uiT('Previous')}</button> <button className="secondary" type="button" disabled={!hasMore} onClick={()=>setOffset(value=>value+20)}>{uiT('Next')}</button></div>}</>}
    <label className="span-2">{uiT('Item name *')}<input required maxLength={80} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    {['exact','contains'].includes(form.matchType)&&<label className="span-2">{form.matchType==='exact'?uiT('SKU'):uiT('Keyword')} *<input required maxLength={160} value={form.match} onChange={e=>setForm({...form,match:e.target.value})}/><small>{uiT('Matching ignores letter case and surrounding spaces.')}</small></label>}
    <label className="account-checkbox span-2"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/> {uiT('Selected — earns commission')}</label>
   </div>{error&&<p className="account-error" role="alert">{uiT(error)}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setForm(null)}>{uiT('Cancel')}</button><button className="primary" type="submit">{uiT('Save commission item')}</button></div>
  </form></div>}
 </section>;
}
