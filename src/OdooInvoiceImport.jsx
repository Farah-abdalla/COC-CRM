import {cairoToday} from './taskDeadlines';
import React,{useEffect,useRef,useState} from 'react';
import {t,useLanguage} from './i18n';
import './odoo.css';
export default function OdooInvoiceImport({onImport}){
 useLanguage();const run=useRef(onImport);run.current=onImport;
 const [filters,setFilters]=useState(()=>({from:cairoToday(),to:cairoToday()})),[busy,setBusy]=useState(false),[error,setError]=useState(''),[summary,setSummary]=useState(null);
 const mounted=useRef(false),started=useRef(false);
 async function load(values){setBusy(true);setError('');setSummary(null);try{const result=await run.current(values);if(mounted.current)setSummary(result);}catch(error){if(mounted.current)setError(error.message);}finally{if(mounted.current)setBusy(false);}}
 useEffect(()=>{mounted.current=true;if(!started.current){started.current=true;load(filters);}return()=>{mounted.current=false;};},[]);
 const change=(key,value)=>setFilters(current=>({...current,[key]:value}));
 return <div className="odoo-invoice-import">
  <form className="odoo-filters" onSubmit={event=>{event.preventDefault();load(filters);}}>
   <label>{t('Start date')}<input required type="date" value={filters.from} max={filters.to||undefined} onChange={event=>change('from',event.target.value)}/></label>
   <label>{t('End date')}<input type="date" value={filters.to} min={filters.from} onChange={event=>change('to',event.target.value)}/></label>
   <button className="secondary" disabled={busy}>{t(busy?'Loading...':'Load invoices from Odoo')}</button>
  </form>
  <p className="muted">{t('Odoo sales are linked to Invoice List with original invoice numbers, matching branches, item amounts and product categories. Reconcile opening payments in Edit.')}</p>
  {busy&&<p role="status">{t('Loading Odoo data...')}</p>}
  {error&&<p className="account-error" role="alert">{t(error)}</p>}
  {summary&&<div role="status"><p className="muted">{t('Imported')}: {summary.added} · {t('Already in CRM')}: {summary.existing} · {t('Skipped')}: {summary.skipped.length} · {t('Branches linked')}: {summary.updated||0}</p>{summary.warnings?.map(warning=><p className="account-error" key={warning}>{t(warning)}</p>)}{summary.skipped.length>0&&<details><summary>{t('View skipped invoices')}</summary><ul>{summary.skipped.map((row,i)=><li key={i}>{row.number}: {t(row.reason)}</li>)}</ul></details>}</div>}
 </div>;
}
