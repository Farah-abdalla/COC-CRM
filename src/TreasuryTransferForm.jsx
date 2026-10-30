import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeftRight,X} from 'lucide-react';
import {t,useLanguage} from './i18n';
import {paymentTreasuryAccounts} from './paymentMethods';
import {formatTreasuryAmount} from './treasuryAmounts';
import {prepareTreasuryTransfer} from './treasuryTransfers';
import {cairoToday} from './taskDeadlines';
export default function TreasuryTransferForm({branches,source,available,onSave,onClose}){
 useLanguage();const dialog=useRef(null),[form,setForm]=useState({fromBranch:source?.branch||branches[0]||'',fromCategory:paymentTreasuryAccounts.includes(source?.section)?source.section:'Cash',toBranch:source?.branch||branches[0]||'',toCategory:source?.section==='Bank'?'Cash':'Bank',date:cairoToday(),amount:'',reference:'',description:''}),[error,setError]=useState('');
 useEffect(()=>{const previous=document.activeElement,node=dialog.current;node.showModal();return()=>{node.close();previous?.focus();};},[]);
 const update=(key,value)=>{setForm(current=>({...current,[key]:value}));setError('');};
 function submit(event){event.preventDefault();try{const row=prepareTreasuryTransfer(form,branches);if(row.amountCents>available(form.fromBranch,form.fromCategory))throw new Error('Insufficient balance in the source treasury.');if(onSave(row)!==true)throw new Error('The transfer could not be saved. Check the storage status.');onClose();}catch(error){setError(error.message);}}
 return <dialog ref={dialog} className="modal treasury-transfer-modal" aria-labelledby="treasury-transfer-title" onCancel={event=>{event.preventDefault();onClose();}}><form onSubmit={submit}>
  <div className="modal-head"><h2 id="treasury-transfer-title"><ArrowLeftRight size={20}/> {t('Transfer between treasuries')}</h2><button type="button" className="icon-btn" aria-label={t('Close')} onClick={onClose}><X/></button></div>
  <div className="form-grid">
   <label>{t('From branch')}<select autoFocus required value={form.fromBranch} onChange={e=>update('fromBranch',e.target.value)}>{branches.map(branch=><option key={branch} value={branch}>{t(branch)}</option>)}</select></label>
   <label>{t('From treasury')}<select required value={form.fromCategory} onChange={e=>update('fromCategory',e.target.value)}>{paymentTreasuryAccounts.map(name=><option key={name} value={name}>{t(name)}</option>)}</select></label>
   <p className="span-2 treasury-transfer-available">{t('Available balance')}: <strong>{formatTreasuryAmount(available(form.fromBranch,form.fromCategory))}</strong></p>
   <label>{t('To branch')}<select required value={form.toBranch} onChange={e=>update('toBranch',e.target.value)}>{branches.map(branch=><option key={branch} value={branch}>{t(branch)}</option>)}</select></label>
   <label>{t('To treasury')}<select required value={form.toCategory} onChange={e=>update('toCategory',e.target.value)}>{paymentTreasuryAccounts.map(name=><option key={name} value={name}>{t(name)}</option>)}</select></label>
   <label>{t('Amount (EGP)')}<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={e=>update('amount',e.target.value)}/></label>
   <label>{t('Date')}<input required type="date" max={cairoToday()} value={form.date} onChange={e=>update('date',e.target.value)}/></label>
   <label className="span-2">{t('Reference')}<input maxLength={200} value={form.reference} onChange={e=>update('reference',e.target.value)}/></label>
   <label className="span-2">{t('Description')}<textarea rows={2} maxLength={500} value={form.description} onChange={e=>update('description',e.target.value)}/></label>
  </div>{error&&<p className="account-error" role="alert">{t(error)}</p>}
  <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>{t('Cancel')}</button><button type="submit" className="primary">{t('Save transfer')}</button></div>
 </form></dialog>;
}
