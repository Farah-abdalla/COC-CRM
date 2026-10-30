import TreasuryTransferForm from './TreasuryTransferForm.jsx';
import TreasuryStatement from './TreasuryStatement.jsx';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React,{useMemo,useState} from 'react';
import {Banknote,Landmark,ArrowLeftRight,Wallet,ShoppingBag,ReceiptText,Store,ArrowLeft,ChevronRight} from 'lucide-react';
import {useAuth} from './Auth';
import {amountToCents,formatTreasuryAmount} from './treasuryAmounts';
import {buildTreasuryLedger,treasuryActivityCents} from './treasuryLedger';
import {paymentTreasuryAccounts} from './paymentMethods';
import './treasury.css';
const sections=[{name:'Cash',icon:Banknote,description:'Cash held at the branch'},{name:'Bank',icon:Landmark,description:'Bank and card receipts'},{name:'Instapay',icon:ArrowLeftRight,description:'Instapay receipts and payments'},{name:'Wallet',icon:Wallet,description:'Mobile wallet activity'},{name:'Purchases',icon:ShoppingBag,description:'Branch purchase records'},{name:'Expenses',icon:ReceiptText,description:'Branch operating expenses'}];
function AmountEditor({branch,category,record,activityCents,onSave,onRemove}){
  useUiLanguage();

 const auth=useAuth(),[amount,setAmount]=useState(record?(record.amountCents/100).toFixed(2):''),[error,setError]=useState(''),[notice,setNotice]=useState(''),linked=paymentTreasuryAccounts.includes(category),opening=record?.amountCents||0;
 const allowed=auth.can('Treasury',record?'edit':'add');
 const [editing,setEditing]=useState(!record);
 function remove(){if(!window.confirm(uiT('Remove this opening amount? Linked invoice payments and refunds will remain.')))return;setError('');setNotice('');if(onRemove(record.id)===true)setNotice('Opening amount removed.');else setError('The opening amount could not be removed. Check the storage status.');}
 function submit(event){event.preventDefault();setError('');setNotice('');try{const amountCents=amountToCents(amount);if(onSave({id:record?.id||crypto.randomUUID(),branch,category,amountCents,updatedAt:new Date().toISOString()})===true){setNotice('Opening amount updated. Changes save automatically.');setEditing(false);}else setError('The amount could not be saved. Check the storage status.');}catch(error){setError(error.message);}}
 return <div className="treasury-amount-editor"><div className="treasury-balance" aria-live="polite">{formatTreasuryAmount(opening+activityCents)}</div>
  {linked&&<dl className="treasury-balance-breakdown"><div><dt>{uiT("Opening amount")}</dt><dd>{formatTreasuryAmount(opening)}</dd></div><div><dt>{uiT("Net account activity")}</dt><dd>{formatTreasuryAmount(activityCents)}</dd></div></dl>}
  {!record&&<p className="muted">{linked ? uiT('Opening amount is zero until set.') : uiT('No amount set yet.')}</p>}
  {record&&<div className="row-actions">{allowed&&<button type="button" className="secondary" onClick={()=>{setAmount((record.amountCents/100).toFixed(2));setEditing(value=>!value);setError('');setNotice('');}}>{uiT(editing?'Cancel':'Edit amount')}</button>}{auth.can('Treasury','delete')&&<button type="button" className="secondary danger" onClick={remove}>{uiT('Remove amount')}</button>}</div>}
  {allowed&&editing&&<form onSubmit={submit}><label>{linked ? uiT('Opening amount (EGP)') : uiT('Amount (EGP)')}<input required type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setNotice('');}} placeholder={uiT("0.00")}/></label><button className="primary" type="submit">{record ? uiT('Update amount') : uiT('Set amount')}</button></form>}
  {error&&<p className="account-error" role="alert">{uiT(error)}</p>}{notice&&<p className="account-success" role="status">{uiT(notice)}</p>}
 </div>;
}
export default function TreasuryPage({branches,balances=[],invoices=[],events=[],creditNotes=[],expenses=[],transfers=[],onTransfer,onOpenExpenses,onSave,onRemove,onChangePayment,onOpenInvoice}){
  useUiLanguage();

 const auth=useAuth(),[showTransfer,setShowTransfer]=useState(false),[transferNotice,setTransferNotice]=useState('');
 const [selection,setSelection]=useState(null),ledger=useMemo(()=>buildTreasuryLedger(invoices,events,creditNotes,expenses,transfers),[invoices,events,creditNotes,expenses,transfers]);
 const selected=selection&&branches.includes(selection.branch)?selection:null,category=sections.find(section=>section.name===selected?.section);
 const accountRows=name=>name==='Expenses'?ledger.expenseRows:ledger.rows;
 const findRecord=(branch,name)=>balances.find(record=>record.branch===branch&&record.category===name);
 const available=(branch,name)=>(findRecord(branch,name)?.amountCents||0)+treasuryActivityCents(ledger.rows,branch,name);
 const transferAction=auth.can('Treasury','add')&&onTransfer&&branches.length>0&&<button type="button" className="primary" onClick={()=>{setTransferNotice('');setShowTransfer(true);}}><ArrowLeftRight size={16}/> {uiT('Transfer between treasuries')}</button>;
 const transferForm=showTransfer&&<TreasuryTransferForm branches={branches} source={selected} available={available} onSave={record=>{const saved=onTransfer(record);if(saved===true)setTransferNotice('Transfer recorded. Changes save automatically.');return saved;}} onClose={()=>setShowTransfer(false)}/>;
 const transferStatus=transferNotice&&<p className="account-success" role="status">{uiT(transferNotice)}</p>;
 if(selected&&category){
  const Icon=category.icon,record=findRecord(selected.branch,category.name),activity=accountRows(category.name).filter(row=>row.branch===selected.branch&&row.category===category.name),net=treasuryActivityCents(activity,selected.branch,category.name);
  return <section className="panel treasury-detail">
   <div className="panel-head"><div><p className="eyebrow">{uiT(selected.branch)} {uiT("/ TREASURY")}</p><h2><Icon size={21}/>{uiT(category.name)}</h2><p>{uiT(category.description)}</p></div><button className="secondary" onClick={()=>setSelection(null)}><ArrowLeft size={16}/> {uiT("All branches")}</button></div>
   <div className="treasury-transfer-toolbar">{transferAction}{transferStatus}</div>{transferForm}
   <nav className="treasury-tabs" aria-label={uiT(selected.branch+' treasury sections')}>{sections.map(section=><button key={section.name} className={section.name===category.name?'active':''} aria-current={section.name===category.name?'page':undefined} onClick={()=>setSelection({...selected,section:section.name})}>{uiT(section.name)}</button>)}</nav>
   <div className="treasury-empty"><span className="treasury-category-icon"><Icon size={26}/></span><h3>{uiT(selected.branch)} · {uiT(category.name)}</h3><AmountEditor key={selected.branch+'|'+category.name+'|'+(record?.id||'empty')} branch={selected.branch} category={category.name} record={record} activityCents={net} onSave={onSave} onRemove={onRemove}/></div>
   <TreasuryStatement key={selected.branch+'|'+category.name} rows={activity} openingCents={record?.amountCents||0} invoices={invoices} onChangePayment={onChangePayment} onOpenInvoice={onOpenInvoice} onOpenExpenses={onOpenExpenses}/>
  </section>;
 }
 return <div className="treasury-branches">
  <div className="treasury-transfer-toolbar">{transferAction}{transferStatus}</div>{transferForm}
  <p className="access-notice">{uiT("Cash, Bank, Instapay, and Wallet show opening amounts plus deposits, less refunds and expenses. Expenses also appear in the Expenses statement. Bank transfers and card payments post to Bank.")}</p>
  {ledger.unassigned.length>0&&<p className="access-notice">{ledger.unassigned.length} {uiT("entries have no confirmed branch/account and are excluded from payment account balances. Assign an account to older payments or Other expenses to include them.")}</p>}
  {branches.map(branch=><section className="panel treasury-branch" key={branch} aria-label={uiT(branch+' treasury')}>
   <div className="panel-head"><div className="treasury-branch-title"><span className="treasury-branch-icon"><Store size={22}/></span><div><h2>{uiT(branch)}</h2><p>{uiT("Branch treasury")}</p></div></div><span className="treasury-section-count">{uiT("6 sections")}</span></div>
   <div className="treasury-section-grid">{sections.map(({name,icon:Icon,description})=>{const record=findRecord(branch,name),net=treasuryActivityCents(accountRows(name),branch,name),total=(record?.amountCents||0)+net;return <button className="treasury-section" key={name} aria-label={uiT(branch+' '+name+', '+formatTreasuryAmount(total))} onClick={()=>setSelection({branch,section:name})}><span className="treasury-category-icon"><Icon size={22}/></span><span className="treasury-section-copy"><strong>{uiT(name)}</strong><span className="treasury-card-amount">{formatTreasuryAmount(total)}</span><small>{record || net ? description : uiT('No amount set')}</small></span><ChevronRight className="treasury-chevron" size={18}/></button>;})}</div>
  </section>)}
  {!branches.length&&<section className="panel"><div className="treasury-empty"><Store size={30}/><h3>{uiT("No branches available")}</h3><p>{uiT("Add a branch or ask your administrator to assign branch access.")}</p></div></section>}
 </div>;
}
