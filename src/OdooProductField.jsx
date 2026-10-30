import React,{useEffect,useId,useState} from 'react';
import {api} from './Auth';
import {t,useLanguage} from './i18n';
import {selectInvoiceProduct,clearInvoiceProduct,invoiceProductName,cleanOdooProductName} from './invoiceProductData';
import {formatTreasuryAmount} from './treasuryAmounts';
export default function OdooProductField({item,index,onChange,products=[]}){
 useLanguage();const id=useId(),[open,setOpen]=useState(false),[records,setRecords]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[highlight,setHighlight]=useState(0),[retry,setRetry]=useState(0);
 const linked=Number.isSafeInteger(item.odooProductId)&&item.odooProductLabel===item.sku;
 const displayName=linked?invoiceProductName(item,products):String(item.sku||''),query=displayName.trim().slice(0,120);
 useEffect(()=>{
  if(!open)return;let active=true;setLoading(true);setError('');setRecords([]);setHasMore(false);
  const timer=setTimeout(async()=>{try{const result=await api('/api/odoo/invoice-products?'+new URLSearchParams({q:query,limit:'20',offset:String(offset)}));if(active){setRecords(result.records||[]);setHasMore(Boolean(result.hasMore));setHighlight(0);}}catch(error){if(active)setError(error.message);}finally{if(active)setLoading(false);}},300);
  return()=>{active=false;clearTimeout(timer);};
 },[open,query,offset,retry]);
 function choose(product){try{onChange(selectInvoiceProduct(item,product));setOpen(false);setError('');}catch(error){setError(error.message);}}
 function keyboard(event){
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){setOpen(true);return;}setHighlight(value=>records.length?(value+(event.key==='ArrowDown'?1:-1)+records.length)%records.length:0);}
  if(event.key==='Enter'&&open){event.preventDefault();if(!loading&&records[highlight])choose(records[highlight]);}
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);}
 }
 return <div className="invoice-product-field" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <label htmlFor={id}><span className="invoice-item-mobile-label">{t('Item name')}</span><input id={id} required maxLength={200} autoComplete="off" aria-label={t('Item '+(index+1)+' product name')} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-results'} aria-activedescendant={open&&records[highlight]?id+'-option-'+highlight:undefined} value={displayName} placeholder={t('Search product name or barcode')} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onKeyDown={keyboard} onChange={event=>{onChange(clearInvoiceProduct(item,event.target.value));setOffset(0);setOpen(true);}}/></label>
  {linked&&<small className="invoice-product-linked">{t('Linked to Odoo')}</small>}
  {open&&<div className="invoice-product-popover"><p className="invoice-product-help">{t('Search and select a product by name or barcode.')}</p>{loading&&<p role="status">{t('Loading products...')}</p>}{error&&<div className="invoice-product-error" role="alert">{t(error)}<button type="button" className="secondary" onMouseDown={event=>event.preventDefault()} onClick={()=>setRetry(value=>value+1)}>{t('Retry')}</button></div>}
   <div id={id+'-results'} role="listbox" aria-label={t('Odoo products')} aria-busy={loading}>{records.map((product,i)=><button type="button" role="option" aria-selected={i===highlight} tabIndex={-1} id={id+'-option-'+i} data-odoo-product={product.id} className={'invoice-product-option '+(i===highlight?'highlighted':'')} key={product.id} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setHighlight(i)} onClick={()=>choose(product)}><span><b>{cleanOdooProductName(product.name)}</b>{Array.isArray(product.categ_id)&&<small>{product.categ_id[1]}</small>}</span>{product.list_price!==false&&product.list_price!==null&&product.list_price!==undefined&&<span>{formatTreasuryAmount(Math.round(Number(product.list_price)*100))}</span>}</button>)}</div>
   {!loading&&!error&&!records.length&&<p role="status">{t('No matching Odoo products.')}</p>}{!loading&&!error&&(offset>0||hasMore)&&<div className="invoice-product-pagination"><button type="button" className="secondary" disabled={!offset} onMouseDown={event=>event.preventDefault()} onClick={()=>setOffset(value=>Math.max(0,value-20))}>{t('Previous')}</button><button type="button" className="secondary" disabled={!hasMore} onMouseDown={event=>event.preventDefault()} onClick={()=>setOffset(value=>value+20)}>{t('Next')}</button></div>}
  </div>}
 </div>;
}
