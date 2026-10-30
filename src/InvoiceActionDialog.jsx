import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import PaymentRoutingFields from './PaymentRoutingFields';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { invoiceAmounts } from './invoiceAmounts';
const money=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(value);
export default function InvoiceActionDialog({type,invoice,customer,events,onAction,onClose}){
  useUiLanguage();

  const totals=invoiceAmounts(invoice);
  const [amount,setAmount]=useState(totals.balance.toFixed(2));
  const [method,setMethod]=useState('Cash'),[reference,setReference]=useState('');
  const [treasuryCategory,setTreasuryCategory]=useState('Cash');
  const [reason,setReason]=useState(''),[error,setError]=useState('');
  const [recipient,setRecipient]=useState(customer?.email||'');
  const [subject,setSubject]=useState((type==='reminder'?'Payment reminder: ':'Invoice ')+invoice.number);
  const [message,setMessage]=useState(['Dear '+(customer?.name||'customer')+',','',(type==='reminder'?'This is a reminder for ':'Please find the details for ')+invoice.number+'.','Total: '+money(totals.total),'Paid: '+(invoice.odooPaymentUnverified?uiT('Not available'):money(totals.paid)),'Balance due: '+(invoice.odooPaymentUnverified?uiT('Not available'):money(totals.balance)),'','Thank you,','COC — Cairo Optical Center'].join(String.fromCharCode(10)));
  const [copied,setCopied]=useState(false);
  const submit=event=>{
    event.preventDefault();
    const result=onAction(invoice.id,type,type==='payment'?{amount:Number(amount),method,treasuryCategory,reference:reference.trim()}:{reason:reason.trim()});
    if(result===true)onClose();else setError(typeof result==='string'?result:'The action could not be saved.');
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(message);setCopied(true);}catch{setError('Copy the invoice details from the text box.');}};
  const title={payment:'Record Payment',void:'Void Invoice',journal:'Invoice Journal',email:'Email draft',reminder:'Payment reminder draft',share:'Share Invoice'}[type];
  return createPortal(<div className="modal-backdrop invoice-action-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}} onKeyDown={event=>{if(event.key==='Escape')onClose();}}>
    <form className="modal invoice-action-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-action-title" onSubmit={submit}>
      <div className="modal-head"><h2 id="invoice-action-title">{uiT(title)}</h2><button autoFocus type="button" className="icon-btn" aria-label={uiT("Close invoice action")} onClick={onClose}><X/></button></div>
      <p className="refund-reference"><strong>{invoice.number}</strong><span>{customer?.name}</span></p>
      {type==='payment'&&<><p className="sales-match-hint">{uiT("Balance due: ")}{money(totals.balance)}{uiT(". Record a payment received from the customer.")}</p><div className="form-grid"><label>{uiT("Amount (EGP) *")}<input required type="number" min="0.01" max={totals.balance} step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></label><PaymentRoutingFields method={method} treasuryCategory={treasuryCategory} branch={invoice.branch} onChange={routing=>{setMethod(routing.method);setTreasuryCategory(routing.treasuryCategory);}}/><label className="span-2">{uiT("Reference")}<input value={reference} onChange={event=>setReference(event.target.value)} placeholder={uiT("Receipt or transaction reference")}/></label></div></>}
      {type==='void'&&<><p className="sales-match-hint">{uiT("Voiding keeps the invoice for reference and excludes it from payment and incentive activity.")}</p><label>{uiT("Reason *")}<textarea required rows={3} value={reason} onChange={event=>setReason(event.target.value)}/></label></>}
      {type==='journal'&&<div className="invoice-journal"><p className="sales-match-hint">{uiT("Invoice activity history")}</p>{events.length?events.map(event=><article key={event.id}><strong>{event.action}</strong><small>{new Date(event.timestamp).toLocaleString(uiLocale("date"))}</small><p>{event.description}</p>{event.amount!==undefined&&<b>{money(event.amount)}</b>}</article>):<p className="empty">{uiT("No recorded activity for this invoice yet.")}</p>}</div>}
      {(type==='email'||type==='reminder')&&<div className="form-grid"><label className="span-2">{uiT("To")}<input type="email" value={recipient} onChange={event=>setRecipient(event.target.value)} placeholder={uiT("Customer email")}/></label><label className="span-2">{uiT("Subject")}<input value={subject} onChange={event=>setSubject(event.target.value)}/></label><label className="span-2">{uiT("Message")}<textarea rows={8} value={message} onChange={event=>setMessage(event.target.value)}/></label><p className="sales-match-hint span-2">{uiT("Open the draft in your email app, then review and send it. Attach a PDF from PDF/Print if needed.")}</p></div>}
      {type==='share'&&<label>{uiT("Invoice details")}<textarea rows={9} value={message} onChange={event=>setMessage(event.target.value)}/></label>}
      {error&&<p role="alert" className="sales-date-error">{uiT(error)}</p>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>{uiT("Close")}</button>{(type==='payment'||type==='void')&&<button className="primary" type="submit">{type === 'payment' ? uiT('Save payment') : uiT('Void invoice')}</button>}{(type==='email'||type==='reminder')&&<a className="primary" href={'mailto:'+encodeURIComponent(recipient)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message)}>{uiT("Open email draft")}</a>}{type==='share'&&<button type="button" className="primary" onClick={copy}>{copied ? uiT('Copied') : uiT('Copy invoice details')}</button>}</div>
    </form>
  </div>,document.body);
}