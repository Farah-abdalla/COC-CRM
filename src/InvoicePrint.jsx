import {invoiceProductName} from './invoiceProductData';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import {invoiceItems,discountedInvoiceItems} from './invoiceItems';
import ItemBarcode from './ItemBarcode';
import cocLogo from './assets/coc-logo.jpg';
import { invoiceAmounts, branchPhone } from './invoiceAmounts';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, ReceiptText, UserRound, MapPin, CalendarDays, ShieldCheck } from 'lucide-react';

const money=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(Number(value)||0);

export default function InvoicePrint({invoice,customer,workOrder,products=[],onClose,autoPrint=true,barcodeOnly=false,toolbarActions}){
  useUiLanguage();

  const number=invoice.number||'INV-'+invoice.id;
  const {subtotal,discount,itemTotal,shippingCharge,adjustment,total,paid,balance,refunded}=invoiceAmounts(invoice);
  const items=discountedInvoiceItems(invoice),quantity=items.reduce((sum,item)=>sum+item.quantity,0);
  const phone=branchPhone(invoice.branch);
  const paymentStatus=invoice.isVoided?'Voided':refunded>0?(total<=0?'Refunded':'Partially refunded'):invoice.odooPaymentUnverified?'Not reconciled':balance<=0?'Paid':paid>0?'Partially paid':'Unpaid';
  const customerInitials=String(customer?.name||'Customer').split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase();
  const now=new Date(),localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const overdue=Boolean(!invoice.isVoided&&!invoice.odooPaymentUnverified&&invoice.dueDate&&invoice.dueDate<localDate&&balance>0);
  const amount=value=>new Intl.NumberFormat(uiLocale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const dateLabel=invoice.date?new Intl.DateTimeFormat(uiLocale("date"),{day:'numeric',month:'short',year:'numeric'}).format(new Date(invoice.date+'T12:00:00')):'—';

  useEffect(()=>{
    const previousTitle=document.title;
    document.title=number;
    document.body.classList.add('printing-invoice');
    let firstFrame,secondFrame,active=true;
    const image=document.querySelector('.invoice-coc-logo-image');
    Promise.resolve(image?.decode()).catch(()=>{}).then(()=>{
      if(active&&autoPrint)firstFrame=requestAnimationFrame(()=>{secondFrame=requestAnimationFrame(()=>{if(active)window.print();});});
    });
    const closeOnEscape=event=>{if(event.key==='Escape')onClose();};
    document.addEventListener('keydown',closeOnEscape);
    return ()=>{
      active=false;
      if(firstFrame)cancelAnimationFrame(firstFrame);
      if(secondFrame)cancelAnimationFrame(secondFrame);
      document.title=previousTitle;
      document.body.classList.remove('printing-invoice');
      document.removeEventListener('keydown',closeOnEscape);
    };
  },[number,onClose,autoPrint,barcodeOnly]);
  return createPortal(<div className="invoice-print-backdrop invoice-detail-view" role="dialog" aria-modal="true" aria-label={uiT('Invoice '+number)}>
    <div className="invoice-view-shell">
      <header className="invoice-view-header">
        <div className="invoice-view-nav"><button autoFocus type="button" className="invoice-back-button" onClick={onClose}><ArrowLeft size={17}/> {uiT("Back to Invoice List")}</button>{invoice.locked&&<span className="invoice-lock-badge"><ShieldCheck size={14}/> {uiT("Locked")}</span>}</div>
        <div className="invoice-view-title"><div><p className="eyebrow">{uiT("CUSTOMER INVOICE")}</p><h1>{number}</h1><p className="invoice-view-subtitle">{uiT(invoice.branch) || uiT('COC')} <span>·</span> {dateLabel}</p></div><span className={'invoice-payment-badge '+(invoice.isVoided?'voided':balance<=0?'settled':'pending')}>{uiT(paymentStatus)}</span></div>
      </header>
      <div className="invoice-print-toolbar"><div className="invoice-toolbar-row">{toolbarActions||<button type="button" className="primary" onClick={()=>window.print()}><Printer size={17}/> {uiT("PDF / Print")}</button>}</div></div>
      <div className="invoice-view-summary"><div><span>{uiT("Invoice total")}</span><strong>{money(total)}</strong><small>{refunded > 0 ? uiT('After credit notes') : uiT('After discount and charges')}</small></div><div><span>{uiT("Amount paid")}</span><strong>{invoice.odooPaymentUnverified?uiT('Not available'):money(paid)}</strong><small>{uiT("Payments received, less refunds")}</small></div><div className="invoice-summary-balance"><span>{uiT("Balance due")}</span><strong>{invoice.odooPaymentUnverified?uiT('Not available'):money(balance)}</strong><small>{balance > 0 ? uiT('Remaining customer payment') : uiT('No outstanding balance')}</small></div></div>
      <div className="invoice-detail-layout">
        <section className="invoice-preview-panel"><div className="invoice-preview-panel-header"><h2><ReceiptText size={18}/>{barcodeOnly ? uiT('Item barcode') : uiT('Invoice preview')}</h2><span>{barcodeOnly ? uiT('Barcode label') : uiT('Receipt')}</span></div><div className="invoice-preview-surface">
    <article className="invoice-paper invoice-receipt">
      {barcodeOnly?<div className="barcode-items">{invoiceItems(invoice).map(item=><ItemBarcode key={item.id} invoice={{...invoice,sku:item.sku,quantity:item.quantity}}/>)}</div>:<>
      {(overdue||invoice.isVoided)&&<div className="receipt-ribbon"><span>{invoice.isVoided ? uiT('Void') : uiT('Overdue')}</span></div>}
      <header className="receipt-header">
        <div className="invoice-coc-logo"><img className="invoice-coc-logo-image" src={cocLogo} alt={uiT("COC — Cairo Optical Center")} loading="eager"/></div>
        <p className="receipt-slogan">{uiT("You can see with COC")}</p>
        {phone&&<p>{phone}</p>}
        <p>{invoice.branch ? uiT(invoice.branch) + uiT(' Branch') : uiT('Cairo Optical Center')}</p>
      </header>
      <h2 className="receipt-document-title">{uiT("Invoice")}</h2>
      <dl className="receipt-meta"><div><dt>{uiT("REF")}</dt><dd>{number}</dd></div><div><dt>{uiT("Date")}</dt><dd>{dateLabel}</dd></div><div><dt>{uiT("Sales Person (CRM)")}</dt><dd>{invoice.salesPerson||'—'}</dd></div>{workOrder&&<div><dt>{uiT("Work order")}</dt><dd>{workOrder.number || uiT('WO-') + workOrder.id}</dd></div>}</dl>
      <section className="receipt-bill-to"><h3>{uiT("Bill To:")}</h3><strong>{customer?.name || uiT('Unknown customer')}</strong>{customer?.phone&&<p>{customer.phone}</p>}</section>
      <table className="receipt-items"><colgroup><col style={{width:'4%'}}/><col style={{width:'34%'}}/><col style={{width:'10%'}}/><col style={{width:'16%'}}/><col style={{width:'17%'}}/><col style={{width:'19%'}}/></colgroup><thead><tr><th>#</th><th>{uiT("Item &")}<br/>{uiT("Description")}</th><th>{uiT("Qty")}</th><th>{uiT("Rate")}</th><th>{uiT("Discount")}</th><th>{uiT("Amount")}</th></tr></thead><tbody>{items.map((item,index)=><tr key={item.id}><td>{index+1}</td><td>{invoiceProductName(item,products)||uiT('Item name unavailable')}</td><td>{item.quantity}<small>{uiT("pcs")}</small></td><td>{amount(item.unitPriceCents/100)}</td><td>{amount(item.discountCents/100)}</td><td>{amount(item.netTotalCents/100)}</td></tr>)}</tbody></table>
      <dl className="receipt-totals"><div><dt>{uiT("Items in Total")}</dt><dd>{quantity}</dd></div><div><dt>{uiT("Sub Total")}</dt><dd>{amount(itemTotal)}</dd></div><div><dt>{uiT("Shipping charge")}</dt><dd>{amount(shippingCharge)}</dd></div><div><dt>{uiT("Adjustment")}</dt><dd>{amount(adjustment)}</dd></div>{refunded>0&&<div><dt>{uiT("Credit notes / Refunded")}</dt><dd>{money(refunded)}</dd></div>}<div className="receipt-total"><dt>{uiT("Total")}</dt><dd>{money(total)}</dd></div>{paid>0&&<div><dt>{uiT("Paid")}</dt><dd>{money(paid)}</dd></div>}<div className="receipt-balance"><dt>{uiT("BALANCE DUE")}</dt><dd>{invoice.odooPaymentUnverified?uiT('Not available'):money(balance)}</dd></div></dl>
      {invoice.notes&&<section className="invoice-paper-notes"><h3>{uiT("Notes")}</h3><p>{invoice.notes}</p></section>}
      </>}
    </article>
        </div></section>
        <aside className="invoice-summary-sidebar">
          <section className="invoice-overview-card"><h2><UserRound size={17}/> {uiT("Customer")}</h2><div className="invoice-customer-overview"><span className="invoice-customer-initials">{customerInitials}</span><div><strong>{customer?.name || uiT('Unknown customer')}</strong><small>{customer?.phone || uiT('No mobile number')}</small></div></div>{customer?.email&&<p className="invoice-customer-email">{customer.email}</p>}</section>
          <section className="invoice-overview-card"><h2><CalendarDays size={17}/> {uiT("Invoice details")}</h2><dl><div><dt>{uiT("Invoice date")}</dt><dd>{invoice.date||'—'}</dd></div><div><dt>{uiT("Due date")}</dt><dd>{invoice.dueDate||(invoice.odooInvoiceId?'—':invoice.date)||'—'}</dd></div><div><dt>{uiT("Sales person")}</dt><dd>{invoice.salesPerson||'—'}</dd></div><div><dt>{uiT("Cashier")}</dt><dd>{invoice.cashier||'—'}</dd></div>{workOrder&&<div><dt>{uiT("Work order")}</dt><dd>{workOrder.number || uiT('WO-') + workOrder.id}</dd></div>}</dl></section>
          <section className="invoice-overview-card"><h2><MapPin size={17}/> {uiT("Branch")}</h2><strong className="invoice-branch-name">{uiT(invoice.branch) || uiT('COC')}</strong>{phone&&<p>{phone}</p>}</section>
          {refunded>0&&<section className="invoice-overview-card invoice-refund-overview"><h2>{uiT("Returns & credits")}</h2><dl><div><dt>{uiT("Returned quantity")}</dt><dd>{invoice.returnedQuantity||0}</dd></div><div><dt>{uiT("Refunded")}</dt><dd>{money(refunded)}</dd></div></dl></section>}
        </aside>
      </div>
    </div>
  </div>,document.body);
}