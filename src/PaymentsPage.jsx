import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import PaymentEntryActions from './PaymentEntryActions';
import {treasuryAccountFor} from './paymentMethods';
import React,{useMemo,useState} from 'react';
import {Search,Wallet} from 'lucide-react';
import {getInvoicePayments} from './paymentData';
import {formatTreasuryAmount} from './treasuryAmounts';
export default function PaymentsPage({invoices,events,customers,branches,onOpenInvoice,onChangePayment}){
  useUiLanguage();

 const [query,setQuery]=useState(''),[branch,setBranch]=useState('');
 const payments=useMemo(()=>getInvoicePayments(invoices,events,customers),[invoices,events,customers]);
 const rows=payments.filter(row=>(!branch||row.branch===branch)&&[row.invoiceNumber,row.customerName,row.method,row.reference].join(' ').toLowerCase().includes(query.toLowerCase()));
 const total=rows.reduce((sum,row)=>sum+row.amountCents,0);
 return <section className="panel payments-panel">
  <div className="panel-head"><div><h2>{uiT("Invoice payments")}</h2><p>{uiT("Payments recorded in Invoice List appear here automatically.")}</p></div><div className="payments-total"><small>{uiT("Total received")}</small><strong>{formatTreasuryAmount(total)}</strong></div></div>
  <div className="payments-filters"><div className="search-inline"><Search size={16}/><input aria-label={uiT("Search payments")} placeholder={uiT("Invoice, customer, reference…")} value={query} onChange={e=>setQuery(e.target.value)}/></div><label>{uiT("Branch")}<select value={branch} onChange={e=>setBranch(e.target.value)}><option value="">{uiT("All branches")}</option>{branches.map(name=><option key={name} value={name}>{uiT(name)}</option>)}</select></label><span className="muted">{rows.length} {uiT("payment entries")}</span></div>
  <div className="table-wrap"><table><thead><tr><th>{uiT("Payment date")}</th><th>{uiT("Invoice")}</th><th>{uiT("Customer")}</th><th>{uiT("Branch")}</th><th>{uiT("Method")}</th><th>{uiT("Treasury account")}</th><th>{uiT("Reference / source")}</th><th>{uiT("Amount")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.date ? new Date(row.date).toLocaleString('en-GB') : uiT('Not recorded')}</td><td>{onOpenInvoice&&row.hasInvoice?<button className="invoice-number-link" onClick={()=>onOpenInvoice(row.invoiceId)}>{row.invoiceNumber}</button>:<b>{row.invoiceNumber}</b>}</td><td>{row.customerName}</td><td>{uiT(row.branch) || uiT('Unassigned')}</td><td>{uiT(row.method)}</td><td>{treasuryAccountFor(row.method, row.treasuryCategory) || uiT('Not assigned')}</td><td>{row.reference||'—'}</td><td className={row.amountCents<0?'profit-loss':''}><b>{formatTreasuryAmount(row.amountCents)}</b></td><td><PaymentEntryActions row={row} invoice={invoices.find(invoice=>String(invoice.id)===String(row.invoiceId))} source="Payments" onChange={onChangePayment}/></td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={7}>{uiT("Total received")}</th><td><b>{formatTreasuryAmount(total)}</b></td><td/></tr></tfoot></table></div>
  {!rows.length&&<div className="treasury-empty"><Wallet size={28}/><h3>{payments.length ? uiT('No matching payments') : uiT('No invoice payments yet')}</h3><p>{payments.length ? uiT('Try another search or branch.') : uiT('Open Invoice List and choose Record Payment on an invoice.')}</p></div>}
  {payments.some(row=>row.kind!=='payment')&&<p className="payments-note">{uiT("Older paid amounts without receipt details are included as separate entries. Assign their method when editing the invoice to link them to Treasury.")}</p>}
 </section>;
}
