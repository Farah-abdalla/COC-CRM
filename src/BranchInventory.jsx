import React,{useEffect,useState} from 'react';
import {Store,Package,Search,RefreshCw,Plus} from 'lucide-react';
import {api} from './Auth';
import {t,useLanguage,getLocale} from './i18n';
import './branchInventory.css';
export default function BranchInventory({refreshKey,onAdd,onEdit,kind='frames'}){
 useLanguage();
 const [data,setData]=useState(null),[branch,setBranch]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[retry,setRetry]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(true),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');api('/api/branch-inventory?kind='+kind).then(result=>{if(active)setData(result);}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[refreshKey,retry,kind]);
 const selected=data?.branches.some(row=>row.branch===branch)?branch:'';
 const categories=[...new Set((data?.rows||[]).filter(row=>!selected||row.branch===selected).map(row=>row.category).filter(Boolean))];
 const selectedCategory=categories.includes(category)?category:'';
 const rows=(data?.rows||[]).filter(row=>(!selected||row.branch===selected)&&(!selectedCategory||row.category===selectedCategory)&&[row.itemName,row.sku,row.category,row.sph,row.cyl].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const count=value=>Number(value).toLocaleString(getLocale(),{maximumFractionDigits:2});
 const last=Math.max(0,Math.ceil(rows.length/50)-1),current=Math.min(page,last);
 return <section className="panel branch-inventory" aria-labelledby="branch-inventory-heading">
  <div className="panel-head"><div><p className="eyebrow">{t('STOCK BY BRANCH')}</p><h2 id="branch-inventory-heading">{t(kind==='frames'?'Frames inventory':'Glasses inventory')}</h2><p>{t(kind==='frames'?'Frame models and available quantities for every branch.':'Available lens stock and received transfers for every branch.')}</p><small>{t('Based on CRM stock and transfers.')}</small></div><button className="secondary" disabled={busy} onClick={()=>setRetry(value=>value+1)}><RefreshCw size={16}/>{t('Refresh')}</button></div>
  {error&&<p className="account-error" role="alert">{t(error)}</p>}
  {busy&&!data&&<p role="status">{t('Loading...')}</p>}
  {data&&<>
   <div className="branch-stock-cards">{data.branches.map(row=><button type="button" className={'branch-stock-card '+(selected===row.branch?'selected':'')} key={row.branch} aria-pressed={selected===row.branch} onClick={()=>{setBranch(selected===row.branch?'':row.branch);setCategory('');setPage(0);}}><span><Store size={17}/>{t(row.branch)}</span><strong>{count(row.units)} <small>{t('units')}</small></strong><span>{count(row.stockLines)} {t('Stock lines')}{row.lowStock>0&&<em>{count(row.lowStock)} {t('Low stock')}</em>}</span></button>)}</div>
   <div className="branch-stock-filters"><label>{t('Branch')}<select aria-label={t('Inventory branch')} value={selected} onChange={event=>{setBranch(event.target.value);setCategory('');setPage(0);}}><option value="">{t('All branches')}</option>{data.branches.map(row=><option key={row.branch} value={row.branch}>{t(row.branch)}</option>)}</select></label><label>{t('Category')}<select value={selectedCategory} onChange={event=>{setCategory(event.target.value);setPage(0);}}><option value="">{t('All categories')}</option>{categories.map(name=><option key={name} value={name}>{t(name)}</option>)}</select></label><label className="branch-stock-search">{t('Search')}<span><Search size={16}/><input aria-label={t('Search branch inventory')} placeholder={t(kind==='frames'?'Frame model or SKU...':'Product, SKU or prescription...')} value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/></span></label>{onAdd&&<button className="primary" onClick={()=>onAdd(selected||data.branches[0]?.branch||'')}><Plus size={16}/>{t(kind==='frames'?'Add frame':'Add stock item')}</button>}</div>
   <div className="branch-stock-total" role="status"><Package size={17}/><strong>{count(rows.reduce((sum,row)=>sum+row.quantity,0))} {t('units')}</strong><span>{count(rows.length)} {t('Stock lines')}</span></div>
   <div className="table-wrap"><table><thead><tr>{['Branch',kind==='frames'?'Frame model':'Item name','Category','SKU',...(kind==='frames'?[]:['SPH','CYL']),'Available','Source','Status',...(onEdit?['Actions']:[])].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{rows.slice(current*50,current*50+50).map(row=><tr key={row.id}><td>{t(row.branch)}</td><td><b>{t(row.itemName)}</b></td><td>{t(row.category)||'—'}</td><td>{row.sku||'—'}</td>{kind!=='frames'&&<><td>{row.sph===''?'—':row.sph}</td><td>{row.cyl===''?'—':row.cyl}</td></>}<td><strong>{count(row.quantity)}</strong></td><td>{t(row.source)}</td><td><span className={'status '+(row.quantity===0?'pending':row.minQuantity>0&&row.quantity<=row.minQuantity?'pending':'ready')}>{t(row.quantity===0?'Out of stock':row.minQuantity>0&&row.quantity<=row.minQuantity?'Low stock':'In stock')}</span></td>{onEdit&&<td>{row.id.startsWith('item:')&&<button className="text-btn" onClick={()=>onEdit(row.id)}>{t('Edit')}</button>}</td>}</tr>)}</tbody></table></div>
   {!rows.length&&<p className="branch-stock-empty">{t('No stock found for this branch or search.')}</p>}
   {last>0&&<div className="branch-stock-pagination"><button className="secondary" disabled={current===0} onClick={()=>setPage(current-1)}>{t('Previous')}</button><span>{count(current+1)} / {count(last+1)}</span><button className="secondary" disabled={current===last} onClick={()=>setPage(current+1)}>{t('Next')}</button></div>}
  </>}
 </section>;
}
