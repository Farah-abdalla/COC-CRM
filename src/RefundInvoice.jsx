import React, { useState } from 'react';
import { X } from 'lucide-react';
import { invoiceAmounts } from './invoiceAmounts';
import { refundableAmount, invoiceRefundItem, itemRefundPlan } from './creditNotes';

const money=value=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(value);
export default function RefundInvoice({invoice,creditNotes=[],customerName,onRefund,onClose}){
  const maximum=refundableAmount(invoice),amounts=invoiceAmounts(invoice),item=invoiceRefundItem(invoice,creditNotes);
  const [selected,setSelected]=useState(true);
  const [quantity,setQuantity]=useState(item.remainingQuantity>0?1:0);
  const [reason,setReason]=useState('');
  const [error,setError]=useState('');
  const plan=selected?itemRefundPlan(invoice,creditNotes,quantity):{error:'Select the item to refund.'};
  const submit=event=>{
    event.preventDefault();
    if(plan.error){setError(plan.error);return;}
    if(!reason.trim()){setError('Enter a reason for the return.');return;}
    const result=onRefund(invoice.id,{quantity:Number(quantity)},reason.trim());
    if(result===true)onClose();else setError(typeof result==='string'?result:'The item refund could not be saved. Please try again.');
  };
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}} onKeyDown={event=>{if(event.key==='Escape')onClose();}}>
    <form className="modal refund-modal item-refund-modal" role="dialog" aria-modal="true" aria-labelledby="refund-title" onSubmit={submit}>
      <div className="modal-head"><h2 id="refund-title">Refund invoice items</h2><button type="button" className="icon-btn" aria-label="Close refund" onClick={onClose}><X/></button></div>
      <p className="refund-reference"><strong>{invoice.number||'INV-'+invoice.id}</strong><span>{customerName}</span></p>
      <dl className="refund-summary"><div><dt>Already refunded</dt><dd>{money(amounts.refunded)}</dd></div><div><dt>Remaining amount paid</dt><dd>{money(maximum)}</dd></div></dl>
      <div className="table-wrap refund-items-table" tabIndex={0} aria-label="Invoice items available for refund"><table><thead><tr><th>Item / SKU</th><th>Sold</th><th>Returned</th><th>Remaining</th><th>Price after discount</th><th>Return quantity</th></tr></thead><tbody><tr><td><label className="refund-item-selection"><input type="checkbox" checked={selected} disabled={item.remainingQuantity<=0} onChange={event=>setSelected(event.target.checked)} aria-label={'Select '+item.sku}/><strong>{item.sku||'No SKU'}</strong></label></td><td>{item.quantity}</td><td>{item.returnedQuantity}</td><td>{item.remainingQuantity}</td><td>{money(item.netUnitPrice)}</td><td><input aria-label="Return quantity" required type="number" min="1" max={item.remainingQuantity} step="1" value={quantity} disabled={!selected||item.remainingQuantity<=0} onChange={event=>setQuantity(event.target.value)}/></td></tr></tbody></table></div>
      <div className="form-grid"><label>Refund amount (EGP)<input readOnly value={(plan.amount||0).toFixed(2)}/></label><label className="span-2">Reason *<textarea required rows={3} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Reason for returning these items"/></label></div>
      <p className="sales-match-hint">The refund is calculated from the selected quantity after the invoice discount. Shipping and adjustments are not refunded with items. A linked credit note records the item, quantity, and amount.</p>
      {item.legacyAmount>0&&<p className="sales-match-hint">Earlier refunds of {money(item.legacyAmount)} did not record item quantities. They are included in the payment limit.</p>}
      {(error||plan.error)&&<p className="sales-date-error" role="alert">{error||plan.error}</p>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={maximum<=0||item.remainingQuantity<=0||!selected||Boolean(plan.error)}>Refund selected items</button></div>
    </form>
  </div>;
}