import React, { useState } from 'react';
import { frameCommission, vegasLensCommission, invoiceCommission, salesPeople } from './incentiveData';

const money=value=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(value);
const personKey=name=>String(name||'').trim().toLowerCase();

export default function IncentivePage({invoices}){
  const [salesPerson,setSalesPerson]=useState('all');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const names=new Map(salesPeople.map(name=>[personKey(name),name]));
  invoices.forEach(invoice=>{const key=personKey(invoice.salesPerson);if(key&&!names.has(key))names.set(key,invoice.salesPerson.trim());});
  const invalidRange=Boolean(startDate&&endDate&&startDate>endDate);
  const eligible=invoices.filter(invoice=>!invoice.isVoided&&invoiceCommission(invoice)>0&&personKey(invoice.salesPerson));
  const rows=eligible.filter(invoice=>!invalidRange&&(salesPerson==='all'||personKey(invoice.salesPerson)===salesPerson)&&(!(startDate||endDate)||(invoice.date&&(!startDate||invoice.date>=startDate)&&(!endDate||invoice.date<=endDate)))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.number||'').localeCompare(String(b.number||'')));
  const groups=new Map();
  rows.forEach(invoice=>{
    const person=personKey(invoice.salesPerson),key=JSON.stringify([person,invoice.date||'']);
    if(!groups.has(key))groups.set(key,{person:nameFor(person),date:invoice.date||'',count:0,frames:0,vegas:0,total:0});
    const group=groups.get(key);group.count++;group.frames+=frameCommission(invoice)>0?1:0;group.vegas+=vegasLensCommission(invoice)>0?1:0;group.total+=invoiceCommission(invoice);
  });
  function nameFor(key){return names.get(key)||key;}
  const total=rows.reduce((sum,invoice)=>sum+invoiceCommission(invoice),0);
  return <section className="panel incentive-panel">
    <div className="panel-head"><div><h2>Salesperson incentive report</h2><p>Frame: EGP 50. Vegas lens: EGP 50. Invoices containing both earn EGP 100.</p></div></div>
    <div className="record-filters">
      <label>Sales person<select aria-label="Filter incentive salesperson" value={salesPerson} onChange={event=>setSalesPerson(event.target.value)}><option value="all">All salespeople</option>{[...names].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label>From date<input aria-label="Incentive from date" type="date" value={startDate} max={endDate||undefined} onChange={event=>setStartDate(event.target.value)}/></label>
      <label>To date<input aria-label="Incentive to date" type="date" value={endDate} min={startDate||undefined} onChange={event=>setEndDate(event.target.value)}/></label>
      <button className="secondary" onClick={()=>{setSalesPerson('all');setStartDate('');setEndDate('');}}>Clear filters</button>
    </div>
    {invalidRange&&<p className="sales-date-error" role="alert">To date must be on or after From date.</p>}
    <p className="stage-board-help">Dates refer to the invoice date and include both selected dates. Totals update when invoices change.</p>
    <div className="incentive-summary"><div><span>Eligible invoices</span><strong>{rows.length}</strong></div><div><span>Total commission</span><strong data-testid="commission-total">{money(total)}</strong></div></div>
    <div className="table-wrap incentive-report-table" tabIndex={0} aria-label="Commission by salesperson and date"><table><thead><tr><th>Sales person</th><th>Invoice date</th><th>Frame invoices</th><th>Vegas lens invoices</th><th>Total commission</th></tr></thead><tbody>{[...groups].map(([key,group])=><tr key={key}><td><b>{group.person}</b></td><td>{group.date||'—'}</td><td>{group.frames}</td><td>{group.vegas}</td><td><b>{money(group.total)}</b></td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total</th><td>{rows.filter(invoice=>frameCommission(invoice)>0).length}</td><td>{rows.filter(invoice=>vegasLensCommission(invoice)>0).length}</td><td>{money(total)}</td></tr></tfoot></table></div>
    {!rows.length&&<p className="empty">No commission-eligible invoices match the selected salesperson and dates.</p>}
    {rows.length>0&&<><h3 className="incentive-detail-heading">Invoice details</h3><div className="table-wrap incentive-invoices-table" tabIndex={0} aria-label="Invoices earning commission"><table><thead><tr><th>Invoice number</th><th>Date</th><th>Sales person</th><th>SKU</th><th>Frame commission</th><th>Vegas lens commission</th><th>Total commission</th></tr></thead><tbody>{rows.map(invoice=><tr key={invoice.id}><td><b>{invoice.number||'INV-'+invoice.id}</b></td><td>{invoice.date||'—'}</td><td>{nameFor(personKey(invoice.salesPerson))}</td><td>{invoice.sku}</td><td>{money(frameCommission(invoice))}</td><td>{money(vegasLensCommission(invoice))}</td><td>{money(invoiceCommission(invoice))}</td></tr>)}</tbody></table></div></>}
  </section>;
}