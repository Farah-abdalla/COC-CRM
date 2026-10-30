import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import {useAuth} from './Auth';
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { workOrderStages, workOrderStage } from './workOrderStages';

const numberOf=record=>record.number||'WO-'+record.id;
const money=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2}).format(Number(value)||0);

export default function WorkOrderBoard({records,customerName,onEdit,onDelete,onSave,invoices=[]}){
  useUiLanguage();

  const auth=useAuth();
  return <>
    <p className="stage-board-help">{uiT("Scroll across the stages. Use an order's Stage menu to move it; linked procurement updates automatically.")}</p>
    <div className="work-order-board" role="region" aria-label={uiT("Work orders by stage")} tabIndex={0}>
      {workOrderStages.map((stage,index)=>{
        const orders=records.filter(record=>workOrderStage(record.status)===stage);
        return <section className={'stage-lane stage-'+index} key={stage} aria-label={uiT(stage+' stage')}>
          <header className="stage-lane-head"><h3><span className="stage-dot"/>{uiT(stage)}</h3><span className="stage-count">{orders.length}</span></header>
          <div className="stage-lane-body">{orders.map(record=><article className="stage-order-card" key={record.id} aria-label={uiT(numberOf(record))}>
            <div className="stage-order-head"><strong>{numberOf(record)}</strong><div className="row-actions"><button className="icon-btn" aria-label={uiT('Edit '+numberOf(record))} disabled={!auth.can('Work Orders','edit')} onClick={()=>onEdit(record)}><Pencil size={15}/></button><button className="icon-btn danger" aria-label={uiT('Delete '+numberOf(record))} disabled={!auth.can('Work Orders','delete')} onClick={()=>onDelete(record.id)}><Trash2 size={15}/></button></div></div>
            <h4>{customerName(record.customerId)}</h4>
            <p className="stage-product">{record.product || uiT('No product added')}</p>
            {record.branch&&<p className="stage-branch">{uiT(record.branch)}</p>}
            <dl><div><dt>{uiT("Invoice")}</dt><dd>{(()=>{const linked=invoices.find(item=>String(item.workOrderId)===String(record.id));return linked?(linked.number||'INV-'+linked.id):String.fromCharCode(8212);})()}</dd></div><div><dt>{uiT("Sales person")}</dt><dd>{record.salesPerson||String.fromCharCode(8212)}</dd></div><div><dt>{uiT("Cashier")}</dt><dd>{record.cashier||String.fromCharCode(8212)}</dd></div><div><dt>{uiT("Order date")}</dt><dd>{record.date||record.purchaseDate||'—'}</dd></div><div><dt>{uiT("Due")}</dt><dd>{record.dueDate||'—'}</dd></div><div><dt>{uiT("Price")}</dt><dd>{money(record.price)}</dd></div></dl>
            <label className="stage-order-select">{uiT("Stage")}<select disabled={!auth.can('Work Orders','edit')} aria-label={uiT('Stage '+numberOf(record))} value={stage} onChange={event=>onSave({...record,status:event.target.value})}>{workOrderStages.map(value=><option key={value} value={value}>{uiT(value)}</option>)}</select></label>
          </article>)}{!orders.length&&<p className="stage-empty">{uiT("No work orders")}</p>}</div>
        </section>;
      })}
    </div>
  </>;
}