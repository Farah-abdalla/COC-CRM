import React,{useMemo,useState} from 'react';
import {t,useLanguage} from './i18n';
import {formatTreasuryAmount} from './treasuryAmounts';
import {buildTreasuryStatement} from './treasuryStatementData.js';
import PaymentEntryActions from './PaymentEntryActions';
export default function TreasuryStatement({rows,openingCents,invoices,onChangePayment,onOpenInvoice,onOpenExpenses}){
 useLanguage();const [startDate,setStartDate]=useState(''),[endDate,setEndDate]=useState('');
 const statement=useMemo(()=>buildTreasuryStatement(rows,openingCents,{startDate,endDate}),[rows,openingCents,startDate,endDate]);
 return <div className="treasury-statement">
  <div className="panel-head"><div><h2>{t('Treasury statement')}</h2><p>{t('Deposits increase the balance. Withdrawals reduce it. Expenses include their category and description.')}</p></div></div>
  <div className="record-filters"><label>{t('From date')}<input type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label><label>{t('To date')}<input type="date" value={endDate} onChange={event=>setEndDate(event.target.value)}/></label><button type="button" className="secondary" onClick={()=>{setStartDate('');setEndDate('');}}>{t('Clear filters')}</button></div>
  {statement.invalid?<p className="account-error" role="alert">{t('To date must be on or after From date.')}</p>:<div className="table-wrap"><table><thead><tr>{['Date','Reference / description','Deposit','Withdrawals','Running balance','Actions'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>
   <tr className="vendor-opening-balance"><th scope="row" colSpan={4}>{t(startDate?'Balance brought forward':'Opening Balance')}</th><td><b>{formatTreasuryAmount(statement.openingCents)}</b></td><td/></tr>
   {statement.rows.map(row=><tr key={row.id}><td>{row.statementDate||t('Not recorded')}</td><td><b>{t(row.kind)}</b>{row.expenseCategory&&<span> - {t(row.expenseCategory)}</span>}{row.description&&<p>{row.description}</p>}{row.paidTo&&<small>{t('Paid to')}: {row.paidTo}</small>}{row.invoiceNumber&&<div>{onOpenInvoice&&row.hasInvoice?<button type="button" className="invoice-number-link" onClick={()=>onOpenInvoice(row.invoiceId)}>{row.invoiceNumber}</button>:row.invoiceNumber}</div>}{row.counterpartyBranch&&<div>{t(row.amountCents<0?'To treasury':'From treasury')}: {t(row.counterpartyBranch)} / {t(row.counterpartyCategory)}</div>}{row.reference&&<div>{t('Reference')}: {row.reference}</div>}{row.method&&<small>{t('Method')}: {t(row.method)}</small>}</td><td>{row.depositCents?formatTreasuryAmount(row.depositCents):'-'}</td><td>{row.withdrawalCents?formatTreasuryAmount(row.withdrawalCents):'-'}</td><td className={row.balanceCents<0?'profit-loss':''}><b>{formatTreasuryAmount(row.balanceCents)}</b></td><td>{row.kind==='Transfer'?t('Treasury transfer'):row.kind==='Expense'?(onOpenExpenses?<button type="button" className="text-btn" onClick={onOpenExpenses}>{t('Manage in Expenses')}</button>:t('Manage in Expenses')):row.kind==='Refund'?t('Manage in Credit Note'):<PaymentEntryActions row={row} invoice={invoices.find(invoice=>String(invoice.id)===String(row.invoiceId))} source="Treasury" onChange={onChangePayment}/>}</td></tr>)}
  </tbody><tfoot><tr><th scope="row" colSpan={2}>{t('Period totals / Closing balance')}</th><td><b>{formatTreasuryAmount(statement.depositsCents)}</b></td><td><b>{formatTreasuryAmount(statement.withdrawalsCents)}</b></td><td><b>{formatTreasuryAmount(statement.closingCents)}</b></td><td/></tr></tfoot></table></div>}
  {!statement.invalid&&!statement.rows.length&&<p className="empty">{t('No transactions in this period.')}</p>}
  {startDate&&rows.some(row=>!row.date)&&<p className="muted">{t('Undated older payments are included in the balance brought forward.')}</p>}
 </div>;
}
