import React,{useEffect,useRef,useState} from 'react';
import {api} from './Auth';
import {t,useLanguage,getLocale} from './i18n';
import './odoo.css';
const views={
 products:{label:'Products',columns:[['name','Name'],['default_code','SKU'],['barcode','Barcode'],['categ_id','Category'],['list_price','Sale price'],['standard_price','Cost'],['qty_available','On hand']]},
 stock:{label:'Stock by location',columns:[['product_id','Product'],['location_id','Location'],['quantity','On hand'],['reserved_quantity','Reserved']]},
 sales:{label:'Sales',columns:[['date','Date'],['move_name','Invoice'],['partner_id','Customer'],['product_id','Product'],['quantity','Quantity'],['price_unit','Unit price'],['discount','Discount %'],['price_subtotal','Subtotal'],['price_total','Total']]},
 movements:{label:'Stock movements',columns:[['date','Date'],['product_id','Product'],['product_uom_qty','Quantity'],['location_id','From'],['location_dest_id','To'],['state','Status']]},
 branches:{label:'Branches',columns:[['id','ID'],['name','Name']]},
 locations:{label:'Locations',columns:[['name','Name'],['complete_name','Full location'],['usage','Usage']]},
 warehouses:{label:'Warehouses',columns:[['name','Name']]},
 categories:{label:'Categories',columns:[['name','Name'],['parent_id','Parent category']]}
};
const monthStart=()=>{const date=new Date();return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-01';};
const initial={resource:'products',q:'',from:monthStart(),to:'',branch:'',kind:'invoice'};
function cell(value){if(Array.isArray(value))return value[1]??'—';if(value===false||value==null||value==='')return '—';if(typeof value==='number')return new Intl.NumberFormat(getLocale(),{maximumFractionDigits:2}).format(value);return String(value);}
export default function OdooPage({productsOnly=false,onLinkSales}){
 useLanguage();
 const [filters,setFilters]=useState(initial),[applied,setApplied]=useState(initial),[offset,setOffset]=useState(0),[result,setResult]=useState(null),[branches,setBranches]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const requestId=useRef(0),branchCache=useRef(null),[branchError,setBranchError]=useState('');
 const [linking,setLinking]=useState(false),[linkError,setLinkError]=useState('');
 const dated=['sales','movements'].includes(filters.resource);
 async function linkSales(number=''){
  if(linking||!onLinkSales)return;setLinking(true);setLinkError('');
  try{await onLinkSales({from:applied.from,to:applied.to,branch:applied.branch},number);}catch(error){setLinkError(error.message);}finally{setLinking(false);}
 }
 useEffect(()=>{
  let active=true;const id=++requestId.current;
  setBusy(true);setError('');setResult(null);
  async function load(){
   try{
    if(applied.resource==='sales'&&!branchCache.current){
     try{const data=await api('/api/odoo/branches?limit=500');if(!active)return;branchCache.current=data.records;setBranches(data.records);setBranchError('');}
     catch(error){if(!active)return;setBranchError(error.message);}
    }
    const query=new URLSearchParams({limit:'100',offset:String(offset)});
    if(applied.resource!=='sales'&&applied.q)query.set('q',applied.q);
    if(['sales','movements'].includes(applied.resource)){if(applied.from)query.set('from',applied.from);if(applied.to)query.set('to',applied.to);}
    if(applied.resource==='sales'){query.set('kind',applied.kind);if(applied.branch)query.set('branch',applied.branch);}
    const data=await api('/api/odoo/'+applied.resource+'?'+query);
    if(active&&id===requestId.current)setResult(data);
   }catch(error){if(active&&id===requestId.current)setError(error.message);}
   finally{if(active&&id===requestId.current)setBusy(false);}
  }
  load();return()=>{active=false;};
 },[applied,offset,revision]);
 function change(key,value){setFilters(current=>({...current,[key]:value}));}
 function submit(event){event.preventDefault();setOffset(0);setApplied({...filters});}
 const view=views[applied.resource];
 return <section className="panel odoo-panel">
  <div className="panel-head"><div><h2>{t(productsOnly?'Items':'COC Odoo')}</h2><p>{t('Read-only live data. Existing CRM records stay separate.')}</p></div><span className="status ready">{t('Read-only')}</span></div>
  <form className="odoo-filters" onSubmit={submit}>
   {!productsOnly&&<label>{t('View')}<select value={filters.resource} onChange={e=>change('resource',e.target.value)}>{Object.entries(views).map(([key,view])=><option key={key} value={key}>{t(view.label)}</option>)}</select></label>}
   {filters.resource!=='sales'&&<label>{t('Search')}<input maxLength={120} value={filters.q} onChange={e=>change('q',e.target.value)} placeholder={t('Search by name')}/></label>}
   {dated&&<><label>{t('Start date')}<input type="date" required={filters.resource==='sales'} value={filters.from} onChange={e=>change('from',e.target.value)}/></label><label>{t('End date')}<input type="date" min={filters.from||undefined} value={filters.to} onChange={e=>change('to',e.target.value)}/></label></>}
   {filters.resource==='sales'&&<><label>{t('Type')}<select value={filters.kind} onChange={e=>change('kind',e.target.value)}><option value="invoice">{t('Customer invoices')}</option><option value="refund">{t('Credit notes / returns')}</option></select></label><label>{t('Branch')}<select value={filters.branch} onChange={e=>change('branch',e.target.value)}><option value="">{t('All branches')}</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label></>}
   <button className="primary" disabled={busy}>{t(busy?'Loading…':'Load Odoo data')}</button>
  </form>
  {applied.resource==='sales'&&applied.kind==='invoice'&&onLinkSales&&<div className="odoo-sales-link"><button className="secondary" disabled={busy||linking} onClick={()=>linkSales()}>{t(linking?'Linking Odoo sales...':'Link sales to Invoice List')}</button><p className="muted">{t('Open an invoice number to link this date range and view it in Invoice List.')}</p></div>}
  {linkError&&<p className="account-error" role="alert">{t(linkError)}</p>}
  {applied.resource==='sales'&&<p className="muted">{t('Posted customer invoices and credit notes are shown separately. Subtract credit notes when calculating net sales.')}</p>}
  {filters.resource==='sales'&&branchError&&<p className="account-error" role="alert">{t('Branch list unavailable:')} {t(branchError)}</p>}
  {error&&<div className="account-error" role="alert">{t(error)} <button type="button" className="secondary" onClick={()=>setRevision(value=>value+1)} disabled={busy}>{t('Retry connection')}</button></div>}
  {busy&&<p role="status">{t('Loading Odoo data…')}</p>}
  {result&&<><div className="odoo-meta"><p>{t(view.label)} · {result.records.length?`${offset+1}–${offset+result.records.length}`:'0'} · {t('Retrieved')}: {new Date(result.fetchedAt).toLocaleString(getLocale())}</p><p>{t('API key expires')}: {result.keyExpires}</p></div>
   {result.records.length?<div className="table-wrap"><table><thead><tr>{view.columns.map(([key,label])=><th key={key}>{t(label)}</th>)}</tr></thead><tbody>{result.records.map(row=><tr key={row.id}>{view.columns.map(([key])=><td key={key}>{applied.resource==='sales'&&applied.kind==='invoice'&&key==='move_name'&&onLinkSales?<button className="invoice-number-link" disabled={linking} onClick={()=>linkSales(row.move_name)}>{cell(row[key])}</button>:cell(row[key])}</td>)}</tr>)}</tbody></table></div>:<p className="muted">{t('No Odoo records match these filters.')}</p>}
   <div className="odoo-pagination"><button className="secondary" disabled={busy||offset===0} onClick={()=>setOffset(value=>Math.max(0,value-100))}>{t('Previous')}</button><span>{t('Page')} {offset/100+1}</span><button className="secondary" disabled={busy||!result.hasMore} onClick={()=>setOffset(value=>value+100)}>{t('Next')}</button><button className="secondary" disabled={busy} onClick={()=>setRevision(value=>value+1)}>{t('Refresh')}</button></div>
   <p className="tiny">{t('Reads are cached for up to 60 seconds to reduce load on Odoo.')}</p>
  </>}
 </section>;
}
