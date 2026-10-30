import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React from 'react';
import {Plus,Trash2} from 'lucide-react';
import OdooProductField from './OdooProductField';
import {newInvoiceItem} from './invoiceItems';
import {formatTreasuryAmount} from './treasuryAmounts';
import './invoiceItems.css';
export default function InvoiceItemsEditor({items,onChange,products=[]}){
  useUiLanguage();

 function update(index,key,value){onChange(items.map((item,i)=>{if(i!==index)return item;const next={...item,[key]:value};if(key==='unitPrice')next.unitPriceCents=Math.round((Number(value)||0)*100);if(key==='quantity'||key==='unitPrice')next.lineTotalCents=(Number(next.quantity)||0)*(Number(next.unitPriceCents)||0);return next;}));}
 return <fieldset className="invoice-items-editor span-2"><legend>{uiT("Invoice items")}</legend><div className="invoice-item-grid invoice-item-head" aria-hidden="true"><span>{uiT("Item name")}</span><span>{uiT("Quantity")}</span><span>{uiT("Unit price (EGP)")}</span><span>{uiT("Line total")}</span><span/></div>
  {items.map((item,index)=><div className="invoice-item-grid" key={item.id}><OdooProductField item={item} products={products} index={index} onChange={next=>onChange(items.map((row,i)=>i===index?next:row))}/><label><span className="invoice-item-mobile-label">{uiT("Quantity")}</span><input required type="number" min="1" max="1000000" step="1" aria-label={uiT('Item '+(index+1)+' quantity')} value={item.quantity} onChange={e=>update(index,'quantity',e.target.value)}/></label><label><span className="invoice-item-mobile-label">{uiT("Unit price (EGP)")}</span><input required type="number" min="0" step="0.01" aria-label={uiT('Item '+(index+1)+' unit price')} value={item.unitPrice} onChange={e=>update(index,'unitPrice',e.target.value)}/></label><span className="invoice-line-total">{formatTreasuryAmount(item.lineTotalCents||0)}</span><button className="icon-btn danger" type="button" aria-label={uiT('Remove item '+(index+1))} disabled={items.length===1} onClick={()=>onChange(items.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}
  <button className="secondary" type="button" disabled={items.length>=100} onClick={()=>onChange([...items,newInvoiceItem()])}><Plus size={16}/> {uiT("Add item")}</button>
 </fieldset>;
}
