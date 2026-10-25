import React from 'react';
import {Cloud,HardDrive,Download,RefreshCw} from 'lucide-react';
export default function DataStorage({storage}) {
 const s=storage;
 return <section className="panel storage-panel" aria-label="Data storage">
   <div className="panel-head"><div><h2>Choose where to save</h2><p>Browser and online records are separate. Switching keeps the other copy.</p></div><button className="secondary" onClick={s.download}><Download size={16}/> Download backup</button></div>
   <div className="storage-options">
     <button className={'storage-option '+(s.mode==='browser'?'selected':'')} disabled={s.busy} onClick={s.chooseBrowser} aria-pressed={s.mode==='browser'}><HardDrive size={26}/><strong>In this browser</strong><span>Automatically saved on this device, including after you close and reopen the browser.</span><small>{s.mode==='browser'?'Selected':'Use browser records'}</small></button>
     <button className={'storage-option '+(s.mode==='online'?'selected':'')} disabled={s.busy} onClick={s.connect} aria-pressed={s.mode==='online'}><Cloud size={26}/><strong>Online</strong><span>Save with your ChatGPT account. Open the same records on another device using the same account.</span><small>{s.mode==='online'?'Selected':'Connect online storage'}</small></button>
   </div>
   <p className="storage-status" role="status" aria-live="polite">{s.status}{s.user?' · '+s.user.email:''}</p>
   {s.mode==='online'&&<p className="muted">Changes save automatically. Other devices refresh every 15 seconds. Unsaved changes keep a recovery copy in this browser.</p>}
   {s.error&&<p className="storage-error" role="alert">{s.error}</p>}
   {s.needsSignIn&&<a className="primary storage-signin" href="/signin-with-chatgpt?return_to=%2F" target="_top" onClick={()=>{sessionStorage.setItem('opticrm_connectOnline','yes');}}>Sign in with ChatGPT</a>}
   {s.empty&&<div className="storage-empty"><h3>Create your online copy</h3><p>No online records exist for this account. Copy the records currently open in this browser to online storage. Your browser records will stay here.</p><button className="primary" disabled={s.busy} onClick={s.initializeOnline}>Copy current records online</button></div>}
   {s.mode==='online'&&<div className="storage-actions"><button className="secondary" disabled={s.busy} onClick={s.flush}><Cloud size={16}/> Save now / retry</button><button className="secondary" disabled={s.busy} onClick={s.reloadOnline}><RefreshCw size={16}/> Load online copy</button></div>}
 </section>;
}
