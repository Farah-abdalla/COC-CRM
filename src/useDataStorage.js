import {readLinkedOdooSales} from './odooSalesLink';
import {importOdooInvoices as mergeOdooInvoices} from './mergeOdooInvoices';
import {addTestExamples} from './exampleData';
import {useEffect,useRef,useState} from 'react';
import {api,useAuth} from './Auth';
import {mergePermittedSnapshot,validateSnapshot} from './accessControl';
export function useDataStorage(data,matrixEdits,setData,setMatrixEdits){
 const auth=useAuth(),user=useRef(auth.user),importing=useRef(false);user.current=auth.user;
 const [view,setView]=useState({mode:'company',status:'Saved to company records',busy:false,error:'',conflict:false});
 const state=useRef({snapshot:auth.initial.snapshot,revision:auth.initial.revision,dirty:false,saving:false,conflict:false,blocked:false});
 const apply=snapshot=>{state.current.snapshot=snapshot;setData(snapshot.data);setMatrixEdits(snapshot.matrixEdits);};
 const publish=patch=>setView(current=>({...current,...patch}));
 function commit(snapshot){
  const s=state.current;if(s.action){window.alert('Wait for the current save to finish.');return false;}if(s.conflict||s.blocked){window.alert('Download your unsaved backup and reload company records before editing.');return false;}
  try{mergePermittedSnapshot(s.snapshot,snapshot,user.current);}catch(error){window.alert(error.message);return false;}
  s.dirty=true;apply(snapshot);publish({status:'Changes waiting to save',error:''});return true;
 }
 async function flush(){
  const s=state.current;if(!s.dirty||s.saving||s.conflict||s.blocked)return;
  s.saving=true;const snapshot=s.snapshot;publish({status:'Saving company records…'});
  try{const remote=await api('/api/crm-data','PUT',{revision:s.revision,snapshot});s.revision=remote.revision;s.dirty=s.snapshot!==snapshot;if(!s.dirty&&remote.snapshot)apply(remote.snapshot);publish({status:s.dirty?'Changes waiting to save':'Saved to company records',error:''});}
  catch(error){if(error.status===409)s.conflict=true;if(error.status===401||error.status===403)s.blocked=true;publish({status:'Not saved',error:error.message,conflict:s.conflict});}
  finally{s.saving=false;}
 }
 async function changePayment(rowId,changes,source){
  const s=state.current;
  if(s.action||s.saving)throw new Error('Wait for the current save to finish.');
  if(s.conflict||s.blocked)throw new Error('Reload company records before changing payments.');
  await flush();
  if(s.dirty||s.saving||s.conflict||s.blocked)throw new Error('Save pending changes or resolve the storage error before changing payments.');
  s.saving=true;s.action=true;publish({busy:true,status:'Saving company records…',error:''});
  try{
   const remote=await api('/api/payment-entry','PATCH',{revision:s.revision,rowId,changes,source,actorId:user.current.id});
   if(remote.user.id!==user.current.id){s.blocked=true;throw new Error('The signed-in account changed. Reload company records.');}
   s.revision=remote.revision;s.dirty=false;auth.updateUser(remote.user);apply(remote.snapshot);publish({status:'Saved to company records',error:''});
  }catch(error){if(error.status===409)s.conflict=true;if(error.status===401)s.blocked=true;publish({status:'Not saved',error:error.message,conflict:s.conflict});throw error;}
  finally{s.saving=false;s.action=false;publish({busy:false});}
 }
 async function refresh(force=false){
  const s=state.current;if(s.saving||(!force&&(s.dirty||s.conflict||s.blocked)))return;
  try{const remote=await api('/api/crm-data');if(remote.user.id!==user.current.id){s.blocked=true;publish({error:'The signed-in account changed. Download your unsaved backup, then sign out.'});return;}
   // Do not overwrite edits made during the request.
   if(!force&&s.dirty)return;
   auth.updateUser(remote.user);s.revision=remote.revision;s.dirty=false;s.conflict=false;s.blocked=false;apply(remote.snapshot);publish({status:'Saved to company records',error:'',conflict:false});
  }catch(error){publish({error:error.message});if(error.status===401&&!s.dirty)auth.expire();}
 }
 async function reloadOnline(){if(state.current.dirty&&!window.confirm('Replace unsaved changes with company records? Download a backup first if you need these changes.'))return;await refresh(true);}
 function download(){const blob=new Blob([JSON.stringify({format:'coc-crm-backup-v1',savedAt:new Date().toISOString(),...state.current.snapshot},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='coc-crm-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function importBrowser(){
  if(!user.current.isOwner){window.alert('Only the owner can import old browser records.');return;}
  if(!window.confirm('Replace shared company records with the old records from this browser? Download a company backup first.'))return;
  try{const next=structuredClone(state.current.snapshot);let found=false;for(const key of Object.keys(next.data)){const raw=localStorage.getItem('opticrm_'+key);if(raw!==null){next.data[key]=JSON.parse(raw);found=true;}}const matrix=localStorage.getItem('opticrm_inventoryMatrices');if(matrix){for(const [category,edits] of Object.entries(JSON.parse(matrix))){next.matrixEdits[category]={...(next.matrixEdits[category]||{}),...edits};}}if(!found)throw new Error('No old CRM records were found in this browser.');commit(next);}catch(error){window.alert(error.message);}
 }
 async function loadExamples(){
  if(!user.current.isAdmin){window.alert('Only administrators can load test examples.');return;}
  if(state.current.saving){window.alert('Wait for the current save to finish.');return;}
  try{const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),result=addTestExamples(state.current.snapshot,today);
   if(!result.totalAdded){publish({notice:'Test examples are already loaded. Existing records were kept.'});return;}
   if(!commit(result.snapshot))return;await flush();publish({notice:state.current.dirty?'Test examples are waiting to save. Check the storage status.':'Test examples added. Existing records were kept.'});
  }catch(error){publish({error:error.message});}
 }
 async function importOdooInvoices(filters){
  if(!user.current.isAdmin)throw new Error('Administrator access is required.');
  if(importing.current)throw new Error('An Odoo import is already running.');
  importing.current=true;
  try{
  await flush();if(state.current.dirty||state.current.saving||state.current.conflict||state.current.blocked)throw new Error('Save pending changes before linking Odoo sales.');
  const actor=user.current.id;
  const remote=await readLinkedOdooSales(api,filters,state.current.snapshot.data.branches);
  if(user.current.id!==actor)throw new Error('The signed-in account changed. Reload company records.');
  const s=state.current;
  const result=mergeOdooInvoices(s.snapshot.data,remote.records,{});
  const products=new Map((s.snapshot.data.odooReportProducts||[]).map(product=>[product.id,product]));for(const product of remote.products)products.set(product.id,product);result.data.odooReportProducts=[...products.values()];
  const nextSnapshot={...s.snapshot,data:result.data};
  try{validateSnapshot(nextSnapshot);}catch(error){if(String(error.message).includes('1.8 MB'))throw new Error('Selected range exceeds available CRM storage. Choose a shorter date range.');throw error;}
  if(result.added||result.updated||JSON.stringify(s.snapshot.data.odooReportProducts)!==JSON.stringify(result.data.odooReportProducts)){if(!commit(nextSnapshot))throw new Error('Unable to save imported invoices.');await flush();if(s.dirty||s.conflict||s.blocked)throw new Error('Imported invoices are waiting to save. Check the storage status.');}
  const importedIds=new Set(remote.records.map(invoice=>String(invoice.id)));
  return {added:result.added,existing:result.existing,updated:result.updated,skipped:result.skipped,warnings:remote.warnings,linkedInvoices:result.data.invoices.filter(invoice=>invoice.odooInvoiceId&&importedIds.has(String(invoice.odooInvoiceId))).map(invoice=>({id:invoice.id,number:invoice.number}))};
  }finally{importing.current=false;}
 }
 async function signOut(){if(state.current.saving){window.alert('Wait for the current save to finish.');return;}if(state.current.dirty&&!window.confirm('Sign out and discard unsaved changes? Download a backup first to keep them.'))return;try{await auth.logout();}catch(error){publish({error:error.message});}}
 useEffect(()=>{let seconds=0;const timer=setInterval(()=>{seconds++;if(state.current.dirty){if(seconds%5===0)flush();}else if(seconds%15===0)refresh();},1000);const focus=()=>refresh(),leave=e=>{if(state.current.dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('focus',focus);window.addEventListener('beforeunload',leave);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('beforeunload',leave);};},[]);
 return {...view,user:auth.user,commit,flush,importOdooInvoices,changePayment,reloadOnline,download,importBrowser,loadExamples,signOut};
}
