import React,{useEffect,useState} from 'react';
import {TrendingUp,Wallet,Clock,ClipboardList,ArrowRight} from 'lucide-react';
import {useAuth} from './Auth';
import {t,useLanguage,getLocale} from './i18n';
import {cairoToday,monthlyWorkedHours} from './hrData';
import {branchIncentiveTotals} from './branchIncentiveData';
import {invoiceAmounts} from './invoiceAmounts';
import {invoiceCommissionCents} from './incentiveData';
import AttendancePanel from './AttendancePanel';
import './personalWorkspace.css';
export default function PersonalWorkspace({data,hr,onNavigate,onOpenInvoice}){
 useLanguage();const {user}=useAuth(),[now,setNow]=useState(()=>new Date());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const today=cairoToday(now),month=today.slice(0,7),monthStart=month+'-01';
 const daySales=branchIncentiveTotals({...data,startDate:today,endDate:today}).totals,monthSales=branchIncentiveTotals({...data,startDate:monthStart,endDate:today}).totals;
 const monthlyInvoices=data.invoices.filter(invoice=>!invoice.isVoided&&invoice.date?.startsWith(month));
 const commission=monthlyInvoices.reduce((sum,invoice)=>sum+invoiceCommissionCents(invoice,data.commissionRules||[],data.odooReportProducts||[]),0);
 const employee=hr.result?.data.employees.find(row=>row.userId===user.id),hours=employee?monthlyWorkedHours([employee],hr.result.data.attendance,month)[0]:null;
 const tasks=(data.tasks||[]).filter(task=>task.assigneeId===user.id&&task.status!=='Done');
 const invoices=[...data.invoices].filter(invoice=>!invoice.isVoided).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
 const money=cents=>new Intl.NumberFormat(getLocale(),{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(cents/100);
 return <div className="personal-workspace">
  <div className="personal-welcome"><span className="personal-initials">{user.name.trim().split(/\s+/).map(name=>name[0]).slice(0,2).join('').toUpperCase()}</span><div><p>{t('Welcome')}, {user.name}</p><h2>{t('Your work, in one place')}</h2><small>{t('Your own sales, attendance, commissions and tasks.')} · {today}</small></div></div>
  {user.salesIdentityUnique===false&&<p className="access-notice">{t('Your account name matches another account. Ask an administrator to link a unique salesperson name to show older sales.')}</p>}
  <div className="personal-kpis">{[{label:'My sales today',value:money(daySales.netCents),detail:daySales.invoiceCount+' '+t('invoices'),icon:TrendingUp},{label:'My sales this month',value:money(monthSales.netCents),detail:monthSales.invoiceCount+' '+t('invoices'),icon:TrendingUp},{label:'My commission this month',value:money(commission),detail:t('Based on your assigned sales'),icon:Wallet},{label:'My hours this month',value:hours?hours.wholeHours+t('h')+' '+String(hours.minutePart).padStart(2,'0')+t('m'):'--',detail:t('Completed attendance sessions'),icon:Clock}].map(card=><article key={card.label}><div><span>{t(card.label)}</span><card.icon size={20}/></div><strong>{card.value}</strong><small>{card.detail}</small></article>)}</div>
  <AttendancePanel hr={hr}/>
  <section className="panel personal-sales"><div className="panel-head"><div><h2>{t('My recent sales')}</h2><p>{t('Only invoices assigned to your account are shown.')}</p></div><button className="text-btn" onClick={()=>onNavigate('Invoice List')}>{t('View my sales')} <ArrowRight size={14}/></button></div><div className="table-wrap"><table><thead><tr>{['Invoice number','Date','Branch','Total'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{invoices.map(invoice=><tr key={invoice.id}><td><button className="invoice-number-link" onClick={()=>onOpenInvoice(invoice.id)}>{invoice.number||'INV-'+invoice.id}</button></td><td>{invoice.date}</td><td>{t(invoice.branch)}</td><td><b>{money(Math.round(invoiceAmounts(invoice).total*100))}</b></td></tr>)}</tbody></table></div>{!invoices.length&&<p className="empty">{t('No sales are assigned to your account yet.')}</p>}</section>
  <section className="panel personal-tasks"><div className="panel-head"><div><h2><ClipboardList size={18}/> {t('My tasks')}</h2><p>{tasks.length} {t('pending tasks')}</p></div><button className="text-btn" onClick={()=>onNavigate('Tasks')}>{t('View my tasks')}</button></div>{tasks.slice(0,5).map(task=><div className="personal-task-row" key={task.id}><b>{task.title}</b><span>{task.dueDate||'--'}</span></div>)}{!tasks.length&&<p className="muted">{t('No pending tasks assigned to you.')}</p>}</section>
 </div>;
}