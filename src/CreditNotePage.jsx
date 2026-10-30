import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React, { useState } from 'react';
const money=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(value);
export default function CreditNotePage({notes,invoiceId='',onClearInvoice,onOpenInvoice}){
  useUiLanguage();

  const [query,setQuery]=useState('');
  const rows=notes.filter(note=>(!invoiceId||String(note.invoiceId)===String(invoiceId))&&[note.number,note.invoiceNumber,note.customerName,note.branch,note.sku,note.reason].join(' ').toLowerCase().includes(query.toLowerCase()));
  const total=rows.reduce((sum,note)=>sum+Math.round(Number(note.amount)*100),0)/100;
  return <section className="panel records-panel credit-note-panel">
    <div className="panel-head"><div><h2>{uiT("Credit notes")}</h2><p>{rows.length} {uiT("refunds · Total ")}{money(total)}</p></div></div>
    <div className="record-filters"><label className="record-search"><input aria-label={uiT("Search credit notes")} placeholder={uiT("Search credit note, invoice, or customer...")} value={query} onChange={event=>setQuery(event.target.value)}/></label>{invoiceId&&<button className="secondary" onClick={onClearInvoice}>{uiT("Show all credit notes")}</button>}</div>
    <div className="table-wrap" tabIndex={0} aria-label={uiT("Credit note list")}><table><thead><tr><th>{uiT("Credit note number")}</th><th>{uiT("Invoice number")}</th><th>{uiT("Customer")}</th><th>{uiT("Branch")}</th><th>{uiT("Date")}</th><th>{uiT("Returned item / SKU")}</th><th>{uiT("Quantity")}</th><th>{uiT("Refund amount")}</th><th>{uiT("Reason")}</th></tr></thead><tbody>{rows.map(note=><tr key={note.id}><td><b>{note.number}</b></td><td><button className="text-btn" onClick={()=>onOpenInvoice(note.invoiceId)}>{note.invoiceNumber}</button></td><td>{note.customerName}</td><td>{uiT(note.branch) || '—'}</td><td>{note.date}</td><td>{note.items?.length?note.items.map((item,index)=><div key={index}>{item.sku}</div>):<small>{uiT("Item quantity not recorded")}</small>}</td><td>{note.items?.length?note.items.reduce((sum,item)=>sum+Number(item.quantity),0):String.fromCharCode(8212)}</td><td>{money(note.amount)}</td><td className="credit-note-reason">{note.reason}</td></tr>)}</tbody><tfoot><tr><th colSpan={7}>{uiT("Total refunds")}</th><td>{money(total)}</td><td></td></tr></tfoot></table></div>
    {!rows.length&&<p className="empty">{uiT("No credit notes found. Use Refund in Invoice List to record a refund.")}</p>}
  </section>;
}