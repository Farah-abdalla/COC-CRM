import React, { useState } from 'react';
const money=value=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(value);
export default function CreditNotePage({notes,invoiceId='',onClearInvoice,onOpenInvoice}){
  const [query,setQuery]=useState('');
  const rows=notes.filter(note=>(!invoiceId||String(note.invoiceId)===String(invoiceId))&&[note.number,note.invoiceNumber,note.customerName,note.branch,note.sku,note.reason].join(' ').toLowerCase().includes(query.toLowerCase()));
  const total=rows.reduce((sum,note)=>sum+Math.round(Number(note.amount)*100),0)/100;
  return <section className="panel records-panel credit-note-panel">
    <div className="panel-head"><div><h2>Credit notes</h2><p>{rows.length} refunds · Total {money(total)}</p></div></div>
    <div className="record-filters"><label className="record-search"><input aria-label="Search credit notes" placeholder="Search credit note, invoice, or customer..." value={query} onChange={event=>setQuery(event.target.value)}/></label>{invoiceId&&<button className="secondary" onClick={onClearInvoice}>Show all credit notes</button>}</div>
    <div className="table-wrap" tabIndex={0} aria-label="Credit note list"><table><thead><tr><th>Credit note number</th><th>Invoice number</th><th>Customer</th><th>Branch</th><th>Date</th><th>Returned item / SKU</th><th>Quantity</th><th>Refund amount</th><th>Reason</th></tr></thead><tbody>{rows.map(note=><tr key={note.id}><td><b>{note.number}</b></td><td><button className="text-btn" onClick={()=>onOpenInvoice(note.invoiceId)}>{note.invoiceNumber}</button></td><td>{note.customerName}</td><td>{note.branch||'—'}</td><td>{note.date}</td><td>{note.items?.length?note.items.map((item,index)=><div key={index}>{item.sku}</div>):<small>Item quantity not recorded</small>}</td><td>{note.items?.length?note.items.reduce((sum,item)=>sum+Number(item.quantity),0):String.fromCharCode(8212)}</td><td>{money(note.amount)}</td><td className="credit-note-reason">{note.reason}</td></tr>)}</tbody><tfoot><tr><th colSpan={7}>Total refunds</th><td>{money(total)}</td><td></td></tr></tfoot></table></div>
    {!rows.length&&<p className="empty">No credit notes found. Use Refund in Invoice List to record a refund.</p>}
  </section>;
}