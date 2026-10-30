import {isPersonalAccount} from './personalAccess';
import OdooInvoiceImport from './OdooInvoiceImport.jsx';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import WorkOrderPrescription from './WorkOrderPrescription';
import PaymentRoutingFields from './PaymentRoutingFields';
import {getInvoicePayments} from './paymentData';
import {invoiceProductName} from './invoiceProductData';
import InvoiceItemsEditor from './InvoiceItemsEditor';
import {newInvoiceItem,invoiceItems,invoiceFormItems,invoiceItemTotals,normalizeInvoiceItems} from './invoiceItems';
import {useAuth} from './Auth';
import InvoiceToolbar, { InvoiceMenu } from './InvoiceActions';
import InvoiceActionDialog from './InvoiceActionDialog';
import { code39Bars } from './barcodeData';
import RefundInvoice from './RefundInvoice';
import { refundableAmount } from './creditNotes';
import { invoiceAmounts } from './invoiceAmounts';
import InvoicePrint from './InvoicePrint';
import { invoiceBranchCodes, nextInvoiceNumber } from './invoiceNumbers';
import { invoiceCommission, salesPeople } from './incentiveData';
import WorkOrderBoard from './WorkOrderBoard';
import { workOrderStages, workOrderStage } from './workOrderStages';
import React, { useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, X, Printer, RotateCcw, ReceiptText } from 'lucide-react';

const currency=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(Number(value)||0);
const today=()=>{const date=new Date();return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');};
const numberOf=(record,invoice)=>record.number||(invoice?'INV-':'WO-')+record.id;
const orderStatuses=workOrderStages;
const invoiceStatus=record=>record.isVoided?'Voided':Number(record.refundedAmount)>0?(invoiceAmounts(record).total<=0?'Refunded':'Partially refunded'):record.odooPaymentUnverified?'Not reconciled':invoiceAmounts(record).paid>=invoiceAmounts(record).total?'Paid':Number(record.paid)>0?'Partially paid':'Unpaid';
const newNumber=(records,prefix)=>{
  let next=records.reduce((max,record)=>{const match=String(record.number||'').match(new RegExp('^'+prefix+'-([0-9]+)$'));return Math.max(max,match?Number(match[1]):0);},0)+1;
  while(records.some(record=>record.number===prefix+'-'+String(next).padStart(4,'0')))next++;
  return prefix+'-'+String(next).padStart(4,'0');
};

export default function RecordPage({kind,records,customers,branches,products=[],commissionRules=[],exams=[],workOrders=[],invoices=[],onSave,onDelete,onCreateCustomer,onRefund,onViewCreditNotes,onInvoiceAction,invoiceEvents=[],creditNotes=[],initialQuery='',onImportOdoo}){
  useUiLanguage();

  const auth=useAuth();
  const invoice=kind==='invoice',module=invoice?'Invoice List':'Work Orders';
  const [query,setQuery]=useState(initialQuery);
  const [status,setStatus]=useState('All');
  const [branchFilter,setBranchFilter]=useState('all');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const invalidDateRange=Boolean(startDate&&endDate&&startDate>endDate);
  const branchOptions=[...new Set([...branches,...records.map(record=>record.branch).filter(Boolean)])].sort((a,b)=>a.localeCompare(b));
  const [form,setForm]=useState(null);
  const [prescriptionLoading,setPrescriptionLoading]=useState(false);
  const [printingInvoice,setPrintingInvoice]=useState(null);
  const [autoPrintInvoice,setAutoPrintInvoice]=useState(true);
  const [barcodeOnly,setBarcodeOnly]=useState(false);
  const [actionDialog,setActionDialog]=useState(null);
  const currentPrintingInvoice=printingInvoice?(records.find(record=>record.id===printingInvoice.id)||printingInvoice):null;
  const [refundingInvoice,setRefundingInvoice]=useState(null);
  const invoiceReturnFocus=useRef(null);
  const closeInvoicePrint=useCallback(()=>{setPrintingInvoice(null);requestAnimationFrame(()=>{if(invoiceReturnFocus.current?.isConnected)invoiceReturnFocus.current.focus();});},[]);
  const [error,setError]=useState('');
  const [newCustomer,setNewCustomer]=useState(null);
  const [customerError,setCustomerError]=useState('');
  const originalPaymentInvoice=invoice&&form?.id?records.find(record=>record.id===form.id):null;
  const oldPaidRemainder=originalPaymentInvoice?getInvoicePayments([originalPaymentInvoice],invoiceEvents).find(row=>row.id==='invoice-paid-'+originalPaymentInvoice.id):null;
  const customerName=id=>customers.find(customer=>String(customer.id)===String(id))?.name||'Unknown customer';
  const visible=records.filter(record=>{
    if(!invoice){
      if(invalidDateRange)return false;
      if(branchFilter.startsWith('branch:')&&record.branch!==branchFilter.slice(7))return false;
      const date=record.date||record.purchaseDate||'';
      if((startDate||endDate)&&(!date||(startDate&&date<startDate)||(endDate&&date>endDate)))return false;
    }
    return (status==='All'||(invoice?invoiceStatus(record):workOrderStage(record.status))===status)&&[numberOf(record,invoice),customerName(record.customerId),record.product,record.sku,...(invoice?invoiceItems(record).map(item=>invoiceProductName(item,products)):[]),record.branch,record.salesPerson,record.cashier].join(' ').toLowerCase().includes(query.toLowerCase());
  });
  const open=record=>{
    if(!auth.can(module,record?'edit':'add')){window.alert(uiT('You do not have permission for this action.'));return;}
    setError('');
    setForm(record?{...record,...(invoice?{items:invoiceFormItems(record)}:{}),number:numberOf(record,invoice),date:record.date||record.purchaseDate||today(),...(!invoice?{status:workOrderStage(record.status),invoiceId:invoices.find(item=>String(item.workOrderId)===String(record.id))?.id||''}:{})}:invoice?
      {number:nextInvoiceNumber(records,branches.find(branch=>invoiceBranchCodes[branch])||''),branch:branches.find(branch=>invoiceBranchCodes[branch])||'',customerId:'',date:today(),dueDate:today(),workOrderId:'',items:[newInvoiceItem()],sku:'',quantity:1,total:'0',discount:'0',shippingCharge:'0',adjustment:'0',paid:'0',paymentMethod:'Cash',paymentTreasuryCategory:'Cash',salesPerson:'',cashier:'',notes:''}:
      {number:newNumber(records,'WO'),invoiceId:'',customerId:'',date:today(),dueDate:'',branch:branches[0]||'',product:'Prescription glasses',brand:'',price:'',status:'New',salesPerson:'',cashier:'',notes:''});
  };
  const runInvoiceAction=(record,type)=>{
    const action={edit:'edit',clone:'add',credit:'add',payment:'edit',void:'edit',lock:'edit'}[type];if(action&&!auth.can(module,action)){window.alert(uiT('You do not have permission for this action.'));return;}
    if(type==='edit'){setPrintingInvoice(null);open(record);return;}
    if(type==='clone'){
      setPrintingInvoice(null);
      const clone={...record,sourceInvoiceId:record.id,id:undefined,number:nextInvoiceNumber(records,record.branch),date:today(),dueDate:today(),workOrderId:'',paid:0,locked:false,isVoided:false,voidReason:'',voidedAt:undefined};
      delete clone.odooInvoiceId;delete clone.odooPaymentUnverified;delete clone.refundedAmount;delete clone.remainingReturnQuantity;delete clone.returnedQuantity;open(clone);return;
    }
    if(type==='print'||type==='barcode'||type==='view'){
      if(!printingInvoice)invoiceReturnFocus.current=document.activeElement;
      if(printingInvoice?.id===record.id&&type==='print'&&!barcodeOnly){window.print();return;}
      if(printingInvoice?.id===record.id&&type==='barcode'&&barcodeOnly){window.print();return;}
      if(type==='barcode'&&!invoiceItems(record).every(item=>code39Bars(item.sku))){window.alert(uiT('This SKU cannot be encoded as Code 39. Use ASCII characters and a shorter SKU.'));return;}
      setAutoPrintInvoice(type!=='view');setBarcodeOnly(type==='barcode');setPrintingInvoice(record);return;
    }
    if(type==='credit'){setPrintingInvoice(null);setRefundingInvoice(record);return;}
    if(type==='lock'){const result=onInvoiceAction(record.id,'lock');if(result!==true)window.alert(uiT(result));return;}
    setActionDialog({type,invoiceId:record.id});
  };
  const addCustomer=event=>{
    const controls=event.currentTarget.closest('fieldset').querySelectorAll('input,select');
    for(const control of controls){if(!control.reportValidity())return;}
    const customer={...newCustomer,name:newCustomer.name.trim(),phone:newCustomer.phone.trim(),email:newCustomer.email.trim(),joined:today(),notes:''};
    if(!customer.name||!customer.phone){setCustomerError('Enter the customer name and phone number.');return;}
    const id=onCreateCustomer(customer);
    if(id===null||id===undefined){setCustomerError('Unable to save the customer. Please try again.');return;}
    setForm(current=>({...current,customerId:id,...(invoice?{workOrderId:''}:{invoiceId:'',examId:'',prescriptionUpload:null,prescriptionDate:''})}));
    setNewCustomer(null);setCustomerError('');setError('');
  };
  const submit=event=>{
    event.preventDefault();
    if(prescriptionLoading){setError('Wait for the prescription image to finish processing.');return;}
    const clean={...form,number:form.number.trim(),customerId:Number(form.customerId),salesPerson:String(form.salesPerson||'').trim(),cashier:String(form.cashier||'').trim()};
    delete clean.refundedAmount;delete clean.remainingReturnQuantity;delete clean.returnedQuantity;
    if(isPersonalAccount(auth.user)){clean.salesPersonId=auth.user.id;clean.salesPerson=auth.user.salesPersonName||auth.user.name;}
    if(!clean.salesPerson||!clean.cashier){setError('Select a sales person and cashier.');return;}
    if(invoice){
      const original=records.find(record=>record.id===form.id);
      clean.branch=original?.branch||form.branch||'';
      if(!original&&!invoiceBranchCodes[clean.branch]){setError('Choose an invoice branch.');return;}
      clean.number=original?numberOf(original,true):nextInvoiceNumber(records,clean.branch);
      clean.date=original?.date||today();
      clean.dueDate=clean.odooInvoiceId?(form.dueDate||''):clean.date;
      try{clean.items=normalizeInvoiceItems(form.items);Object.assign(clean,invoiceItemTotals(clean.items));}catch(error){setError(error.message);return;}
    }
    if(!clean.number||!customers.some(customer=>customer.id===clean.customerId)||!clean.date){setError('Enter a number, customer, and date.');return;}
    if(records.some(record=>record.id!==clean.id&&numberOf(record,invoice).trim().toLowerCase()===clean.number.toLowerCase())){setError('This '+(invoice?'invoice':'work order')+' number already exists.');return;}
    if(clean.dueDate&&clean.dueDate<clean.date){setError('Due date must be on or after the record date.');return;}
    for(const field of invoice?['total','discount','shippingCharge','paid']:['price']){
      const value=Number(clean[field]??0);
      if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER/100){setError('Enter valid non-negative amounts.');return;}
      clean[field]=Math.round(value*100)/100;
    }
    if(invoice){
      clean.quantity=Number(clean.quantity??1);
      if(!Number.isSafeInteger(clean.quantity)||clean.quantity<1){setError('Enter a whole quantity of at least 1.');return;}
      if(clean.discount>clean.total){setError('Discount cannot exceed the subtotal.');return;}
      const adjustment=Number(form.adjustment??0);
      if(!Number.isFinite(adjustment)||Math.abs(adjustment)>Number.MAX_SAFE_INTEGER/100){setError('Enter a valid adjustment amount.');return;}
      clean.adjustment=Math.round(adjustment*100)/100;
      const amounts=invoiceAmounts(clean);
      if(amounts.itemTotal+amounts.shippingCharge+amounts.adjustment<0){setError('Adjustment cannot make the invoice total negative.');return;}
      if(clean.paid>invoiceAmounts(clean).total){setError('Amount paid cannot exceed the final invoice total.');return;}
    }
    if(!invoice){clean.status=workOrderStage(clean.status);clean.purchaseDate=clean.date;clean.product=clean.product.trim();if(!clean.product){setError('Enter a product or service.');return;}}
    if(onSave({...clean,id:clean.id??crypto.randomUUID()})){setForm(null);setError('');}
    else setError('Unable to save this record. Please try again.');
  };
  return <section className="panel records-panel">
    {invoice&&auth.user.isAdmin&&onImportOdoo&&<OdooInvoiceImport onImport={onImportOdoo}/>}
    <div className="panel-head"><div><h2>{invoice ? uiT('Invoices') : uiT('Work orders')}</h2><p>{visible.length} {uiT("of ")}{records.length} {uiT("records")}</p></div><button className="primary" disabled={!auth.can(module,'add')} onClick={()=>open(null)}><Plus size={17}/> {invoice ? uiT('Add invoice') : uiT('Add work order')}</button></div>
    <div className="record-filters"><label className="record-search"><Search size={17}/><input aria-label={uiT(invoice?'Search invoices':'Search work orders')} placeholder={uiT(invoice?'Search number, customer, or item name...':'Search number or customer...')} value={query} onChange={event=>setQuery(event.target.value)}/></label><label>{invoice ? uiT('Status') : uiT('Stage')}<select value={status} onChange={event=>setStatus(event.target.value)}>{['All',...(invoice?['Not reconciled','Unpaid','Partially paid','Paid','Partially refunded','Refunded','Voided']:orderStatuses)].map(value=><option key={value} value={value}>{uiT(value)}</option>)}</select></label>{!invoice&&<><label>{uiT("Branch")}<select aria-label={uiT("Filter by branch")} value={branchFilter} onChange={event=>setBranchFilter(event.target.value)}><option value="all">{uiT("All branches")}</option>{branchOptions.map(branch=><option key={branch} value={'branch:'+branch}>{uiT(branch)}</option>)}</select></label><label>{uiT("From date")}<input aria-label={uiT("From date")} type="date" value={startDate} max={endDate||undefined} onChange={event=>setStartDate(event.target.value)}/></label><label>{uiT("To date")}<input aria-label={uiT("To date")} type="date" value={endDate} min={startDate||undefined} onChange={event=>setEndDate(event.target.value)}/></label><button className="secondary" onClick={()=>{setQuery('');setStatus('All');setBranchFilter('all');setStartDate('');setEndDate('');}}>{uiT("Clear filters")}</button></>}</div>
    {!invoice&&invalidDateRange&&<p className="sales-date-error" role="alert">{uiT("To date must be on or after From date.")}</p>}
    {!invoice&&(startDate||endDate)&&<p className="stage-board-help">{uiT("Filters use the work order date and include both dates. Orders without a date are excluded.")}</p>}
    {invoice?(<div className="table-wrap" tabIndex={0} aria-label={uiT(invoice?'Invoice list':'Work order list')}><table><thead><tr><th>{invoice ? uiT('Invoice number') : uiT('Work order')}</th><th>{uiT("Customer")}</th><th>{uiT("Branch")}</th><th>{uiT("Sales person")}</th><th>{uiT("Cashier")}</th><th>{uiT("Date")}</th><th>{uiT("Total")}</th>{invoice&&<><th>{uiT("Paid")}</th><th>{uiT("Balance")}</th></>}<th>{uiT("Status")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{visible.map(record=><tr key={record.id}><td><button type="button" className="invoice-number-link" onClick={()=>runInvoiceAction(record,'view')}>{numberOf(record,invoice)}</button>{record.locked&&<small className="invoice-locked-label">{uiT("Locked")}</small>}</td><td>{customerName(record.customerId)}</td><td>{uiT(record.branch) || String.fromCharCode(8212)}</td><td>{record.salesPerson||String.fromCharCode(8212)}</td><td>{record.cashier||String.fromCharCode(8212)}</td><td>{record.date||record.purchaseDate||'—'}</td><td>{currency(invoiceAmounts(record).total)}</td>{invoice&&<><td>{record.odooPaymentUnverified?uiT('Not available'):currency(invoiceAmounts(record).paid)}</td><td>{record.odooPaymentUnverified?uiT('Not available'):currency(invoiceAmounts(record).balance)}</td></>}<td><span className={'status '+((invoice?invoiceStatus(record)==='Paid':['Ready','Delivered'].includes(record.status))?'ready':record.status==='Cancelled'?'cancelled':'in-progress')}>{invoice ? uiT(invoiceStatus(record)) : uiT(workOrderStage(record.status)) || uiT('New')}</span></td><td><div className="row-actions"><InvoiceMenu invoice={record} onAction={type=>runInvoiceAction(record,type)}/>{invoice&&<><button type="button" className="icon-btn" title={uiT(refundableAmount(record)>0?'Refund invoice':'No refundable payment remaining')} aria-label={uiT('Refund '+numberOf(record,true))} disabled={!auth.can('Invoice List','add')||record.locked||record.isVoided||record.remainingReturnQuantity===0||refundableAmount(record)<=0} onClick={()=>setRefundingInvoice(record)}><RotateCcw size={16}/></button>{Number(record.refundedAmount)>0&&<button type="button" className="icon-btn" title={uiT("View linked credit notes")} aria-label={uiT('Credit notes '+numberOf(record,true))} onClick={()=>onViewCreditNotes(record.id)}><ReceiptText size={16}/></button>}</>}{invoice&&<button type="button" className="icon-btn" title={uiT("Print invoice")} aria-label={uiT('Print '+numberOf(record,true))} onClick={()=>runInvoiceAction(record,'print')}><Printer size={16}/></button>}<button className="icon-btn" aria-label={uiT('Edit '+numberOf(record,invoice))} disabled={!auth.can(module,'edit')||record.locked||record.isVoided} onClick={()=>open(record)}><Pencil size={16}/></button><button className="icon-btn danger" aria-label={uiT('Delete '+numberOf(record,invoice))} disabled={!auth.can(module,'delete')||record.locked} onClick={()=>onDelete(record.id)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>): <WorkOrderBoard records={visible} customerName={customerName} onEdit={open} onDelete={onDelete} onSave={onSave} invoices={invoices}/>}
    {!visible.length&&<p className="empty">{records.length ? uiT('No records match your filters.') : invoice ? uiT('No invoices yet. Add your first invoice to begin.') : uiT('No work orders yet. Add your first work order to begin.')}</p>}
    {refundingInvoice&&<RefundInvoice invoice={refundingInvoice} creditNotes={creditNotes} customerName={customerName(refundingInvoice.customerId)} onRefund={onRefund} onClose={()=>setRefundingInvoice(null)}/>}
    {currentPrintingInvoice&&<InvoicePrint products={products} invoice={currentPrintingInvoice} customer={customers.find(customer=>String(customer.id)===String(currentPrintingInvoice.customerId))} workOrder={workOrders.find(order=>String(order.id)===String(currentPrintingInvoice.workOrderId))} onClose={closeInvoicePrint} autoPrint={autoPrintInvoice} barcodeOnly={barcodeOnly} toolbarActions={<InvoiceToolbar invoice={currentPrintingInvoice} onAction={type=>runInvoiceAction(currentPrintingInvoice,type)}/>}/>}
    {actionDialog&&<InvoiceActionDialog type={actionDialog.type} invoice={records.find(record=>record.id===actionDialog.invoiceId)} customer={customers.find(customer=>String(customer.id)===String(records.find(record=>record.id===actionDialog.invoiceId)?.customerId))} events={invoiceEvents.filter(event=>String(event.invoiceId)===String(actionDialog.invoiceId))} onAction={onInvoiceAction} onClose={()=>setActionDialog(null)}/>}
    {form&&<div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setForm(null);}} onKeyDown={event=>{if(event.key==='Escape')setForm(null);}}>
      <form className="modal record-modal" role="dialog" aria-modal="true" aria-labelledby="record-form-title" onSubmit={submit}>
        <div className="modal-head"><h2 id="record-form-title">{form.id ? uiT('Edit') : uiT('Add')} {invoice ? uiT('invoice') : uiT('work order')}</h2><button type="button" className="icon-btn" aria-label={uiT("Close form")} onClick={()=>setForm(null)}><X/></button></div>
        <div className="form-grid">
          {invoice&&<label>{uiT("Invoice branch *")}<select required disabled={Boolean(form.id&&records.find(item=>item.id===form.id)?.branch)} value={form.branch||''} onChange={event=>setForm({...form,branch:event.target.value,...(!form.id?{number:nextInvoiceNumber(records,event.target.value)}:{})})}><option value="">{uiT("Choose branch")}</option>{[...new Set([...branches.filter(branch=>invoiceBranchCodes[branch]),...(form.branch?[form.branch]:[])])].map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select></label>}
          <label>{invoice ? uiT('Invoice number') : uiT('Work order number')} *<input autoFocus={!invoice} required readOnly={invoice} value={form.number} onChange={event=>setForm({...form,number:event.target.value})}/></label>
          <label>{uiT("Customer *")}<select required value={newCustomer?'__new_customer__':form.customerId} onChange={event=>{if(event.target.value==='__new_customer__'){setNewCustomer({name:'',phone:'',email:'',branch:branches[0]||''});setCustomerError('');}else{setNewCustomer(null);setCustomerError('');setForm({...form,customerId:event.target.value,...(invoice?{workOrderId:''}:{invoiceId:'',examId:'',prescriptionUpload:null,prescriptionDate:''})});}}}><option value="">{uiT("Choose customer")}</option><option value="__new_customer__">{uiT("+ New customer")}</option>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          {newCustomer&&<fieldset className="inline-customer-fields span-2"><legend>{uiT("New customer")}</legend><div className="form-grid">
            <label>{uiT("Full name *")}<input autoFocus required value={newCustomer.name} onChange={event=>setNewCustomer({...newCustomer,name:event.target.value})} placeholder={uiT("Customer full name")}/></label>
            <label>{uiT("Phone number *")}<input required type="tel" value={newCustomer.phone} onChange={event=>setNewCustomer({...newCustomer,phone:event.target.value})} placeholder={uiT("01xxxxxxxxx")}/></label>
            <label>{uiT("Email")}<input type="email" value={newCustomer.email} onChange={event=>setNewCustomer({...newCustomer,email:event.target.value})} placeholder={uiT("customer@email.com")}/></label>
            <label>{uiT("Customer branch")}<select value={newCustomer.branch} onChange={event=>setNewCustomer({...newCustomer,branch:event.target.value})}><option value="">{uiT("Choose branch")}</option>{branches.map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select></label>
          </div>{customerError&&<p className="sales-date-error" role="alert">{uiT(customerError)}</p>}<div className="inline-customer-actions"><button type="button" className="secondary" onClick={()=>{setNewCustomer(null);setCustomerError('');}}>{uiT("Cancel new customer")}</button><button type="button" className="primary" onClick={addCustomer}>{uiT("Save customer")}</button></div></fieldset>}
          {!invoice&&<WorkOrderPrescription form={form} setForm={setForm} exams={exams} customers={customers} onBusy={setPrescriptionLoading}/>}
          {!invoice&&<label className="span-2">{uiT("Invoice")}<select value={form.invoiceId||''} onChange={event=>setForm({...form,invoiceId:event.target.value})}><option value="">{uiT("No linked invoice")}</option>{invoices.filter(item=>String(item.customerId)===String(form.customerId)&&(!item.workOrderId||String(item.workOrderId)===String(form.id))).map(item=><option key={item.id} value={item.id}>{numberOf(item,true)} — {item.sku || uiT('No SKU')}</option>)}</select><small>{uiT("Choose a customer to see their available invoices.")}</small></label>}
          <label>{uiT("Sales person *")}<select required disabled={isPersonalAccount(auth.user)} value={isPersonalAccount(auth.user)?auth.user.salesPersonName||auth.user.name:form.salesPerson||''} onChange={event=>setForm({...form,salesPerson:event.target.value})}><option value="">{uiT("Choose sales person")}</option>{isPersonalAccount(auth.user)&&<option value={auth.user.salesPersonName||auth.user.name}>{auth.user.salesPersonName||auth.user.name}</option>}{form.salesPerson&&!salesPeople.includes(form.salesPerson)&&<option value={form.salesPerson}>{form.salesPerson}</option>}{salesPeople.map(name=><option key={name} value={name}>{uiT(name)}</option>)}</select></label>
          <label>{uiT("Cashier *")}<select required value={form.cashier||''} onChange={event=>setForm({...form,cashier:event.target.value})}><option value="">{uiT("Choose cashier")}</option>{form.cashier&&form.cashier!=='Sama'&&<option value={form.cashier}>{form.cashier}</option>}<option value="Sama">{uiT("Sama")}</option></select></label>
          <label>{uiT("Date *")}<input required type="date" readOnly={invoice} value={form.date} onChange={event=>setForm({...form,date:event.target.value})}/></label>
          <label>{uiT("Due date")}<input type="date" readOnly={invoice&&!form.odooInvoiceId} min={form.date} max={invoice&&!form.odooInvoiceId?form.date:undefined} value={invoice&&!form.odooInvoiceId?form.date:form.dueDate||''} onChange={event=>setForm({...form,dueDate:event.target.value})}/></label>
          {invoice&&form.odooInvoiceId&&<label className="span-2"><span>{uiT('Odoo opening payments verified')}</span><input type="checkbox" checked={!form.odooPaymentUnverified} onChange={event=>setForm({...form,odooPaymentUnverified:!event.target.checked})}/><small>{uiT('Enter the verified amount already paid before enabling payment collection and reminders.')}</small></label>}{invoice&&!form.odooInvoiceId&&<p className="sales-match-hint span-2">{uiT("Invoice date and due date are fixed to the day the invoice is created.")}</p>}
          {invoice?<><label className="span-2">{uiT("Linked work order")}<select value={form.workOrderId||''} onChange={event=>{const id=event.target.value,order=workOrders.find(order=>String(order.id)===id);setForm(current=>{let items=current.items;if(order&&items.length===1&&!items[0].sku.trim()){const cents=Math.round((Number(order.price)||0)*100);items=[{...items[0],sku:order.sku||'',quantity:1,unitPrice:(cents/100).toFixed(2),unitPriceCents:cents,lineTotalCents:cents}];}return {...current,workOrderId:id,items,...invoiceItemTotals(items)};});}}><option value="">{uiT("No linked work order")}</option>{workOrders.filter(order=>String(order.customerId)===String(form.customerId)&&!invoices.some(item=>item.id!==form.id&&String(item.workOrderId)===String(order.id))).map(order=><option key={order.id} value={order.id}>{numberOf(order,false)} — {order.product}</option>)}</select></label><InvoiceItemsEditor products={products} items={form.items} onChange={items=>setForm({...form,items,...invoiceItemTotals(items)})}/><label>{uiT("Salesperson commission (EGP)")}<input readOnly value={invoiceCommission(form,commissionRules,products).toFixed(2)}/><small>{uiT("Commission follows the items selected by an administrator in Incentive.")}</small></label><label>{uiT("Subtotal (EGP) *")}<input required type="number" min="0" step="0.01" readOnly value={form.total}/></label><label>{uiT("Total quantity")}<input readOnly value={form.quantity}/></label><label>{uiT("Discount (EGP)")}<input type="number" min="0" max={form.total||0} step="0.01" value={form.discount??0} onChange={event=>setForm({...form,discount:event.target.value})}/></label><label>{uiT("Shipping charge (EGP)")}<input type="number" min="0" step="0.01" value={form.shippingCharge??0} onChange={event=>setForm({...form,shippingCharge:event.target.value})}/></label><label>{uiT("Adjustment (EGP)")}<input type="number" step="0.01" value={form.adjustment??0} onChange={event=>setForm({...form,adjustment:event.target.value})}/></label><label>{uiT("Final total (EGP)")}<input readOnly value={invoiceAmounts(form).originalTotal.toFixed(2)}/></label><label>{uiT("Paid (EGP) *")}<input required type="number" min="0" max={invoiceAmounts(form).originalTotal} step="0.01" value={form.paid} onChange={event=>setForm({...form,paid:event.target.value})}/></label>{Number(form.paid)!==Number(originalPaymentInvoice?.paid||0)&&<PaymentRoutingFields method={form.paymentMethod||''} treasuryCategory={form.paymentTreasuryCategory||''} branch={form.branch} onChange={routing=>setForm({...form,paymentMethod:routing.method,paymentTreasuryCategory:routing.treasuryCategory})}/>}{oldPaidRemainder&&<PaymentRoutingFields title={uiT("Earlier paid amount method")} required={false} method={form.openingPaymentMethod||''} treasuryCategory={form.openingPaymentTreasuryCategory||''} branch={form.branch} onChange={routing=>setForm({...form,openingPaymentMethod:routing.method,openingPaymentTreasuryCategory:routing.treasuryCategory})}/>}</>:<><label>{uiT("Product / service *")}<input required value={form.product||''} onChange={event=>setForm({...form,product:event.target.value})}/></label><label>{uiT("Brand")}<input value={form.brand||''} onChange={event=>setForm({...form,brand:event.target.value})}/></label><label>{uiT("Branch")}<select value={form.branch||''} onChange={event=>setForm({...form,branch:event.target.value,examId:'',prescriptionUpload:null,prescriptionDate:''})}><option value="">{uiT("Unassigned")}</option>{branches.map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select></label><label>{uiT("Price (EGP) *")}<input required type="number" min="0" step="0.01" value={form.price} onChange={event=>setForm({...form,price:event.target.value})}/></label><label className="span-2">{uiT("Stage")}<select value={form.status} onChange={event=>setForm({...form,status:event.target.value})}>{orderStatuses.map(value=><option key={value} value={value}>{uiT(value)}</option>)}</select></label></>}
          <label className="span-2">{uiT("Notes")}<textarea rows={3} value={form.notes||''} onChange={event=>setForm({...form,notes:event.target.value})}/></label>
        </div>
        {!customers.length&&<p className="sales-date-error">{uiT("Choose New customer above to add a customer before saving.")}</p>}
        {error&&<p role="alert" className="sales-date-error">{uiT(error)}</p>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setForm(null)}>{uiT("Cancel")}</button><button type="submit" className="primary" disabled={!customers.length||Boolean(newCustomer)}>{uiT("Save ")}{invoice ? uiT('invoice') : uiT('work order')}</button></div>
      </form>
    </div>}
  </section>;
}