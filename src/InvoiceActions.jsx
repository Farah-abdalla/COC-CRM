import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import {useAuth} from './Auth';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Mail, Share2, Bell, Printer, CreditCard, ReceiptText, Copy, Barcode, Ban, BookOpen, Lock, Unlock } from 'lucide-react';
import { invoiceAmounts } from './invoiceAmounts';
import { refundableAmount } from './creditNotes';

export const invoiceActionItems=invoice=>{
  const blocked=invoice.locked||invoice.isVoided;
  return [
    {key:'edit',label:'Edit',icon:Pencil,disabled:blocked},
    {key:'email',label:'Send Email',icon:Mail},
    {key:'share',label:'Share',icon:Share2},
    {key:'reminder',label:'Reminders',icon:Bell,disabled:invoice.isVoided||invoice.odooPaymentUnverified||invoiceAmounts(invoice).balance<=0},
    {key:'print',label:'PDF/Print',icon:Printer},
    {key:'payment',label:'Record Payment',icon:CreditCard,disabled:blocked||invoice.odooPaymentUnverified||invoiceAmounts(invoice).balance<=0},
    {key:'credit',label:'Create Credit Note',icon:ReceiptText,disabled:blocked||invoice.remainingReturnQuantity===0||refundableAmount(invoice)<=0},
    {key:'clone',label:'Clone',icon:Copy},
    {key:'barcode',label:'Print Item Barcode',icon:Barcode,disabled:!invoice.sku},
    {key:'void',label:'Void',icon:Ban,disabled:blocked||invoiceAmounts(invoice).originalPaid>0||Number(invoice.refundedAmount)>0},
    {key:'journal',label:'View Journal',icon:BookOpen},
    {key:'lock',label:invoice.locked?'Unlock Invoice':'Lock Invoice',icon:invoice.locked?Unlock:Lock}
  ];
};
export function InvoiceMenu({invoice,onAction,moreOnly=false}){
  useUiLanguage();

  const auth=useAuth();
  const [position,setPosition]=useState(null);
  const buttonRef=useRef(null),menuRef=useRef(null);
  useEffect(()=>{
    if(!position)return;
    const outside=event=>{if(!menuRef.current?.contains(event.target)&&!buttonRef.current?.contains(event.target))setPosition(null);};
    const keyboard=event=>{
      if(event.key==='Escape'){setPosition(null);buttonRef.current?.focus();}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        const items=[...menuRef.current.querySelectorAll('button:not([disabled])')],index=items.indexOf(document.activeElement);
        items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
      }
    };
    document.addEventListener('mousedown',outside);document.addEventListener('keydown',keyboard);
    menuRef.current?.querySelector('button:not([disabled])')?.focus();
    return ()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',keyboard);};
  },[position]);
  const toggle=()=>{
    if(position){setPosition(null);return;}
    const rect=buttonRef.current.getBoundingClientRect();
    setPosition({left:Math.max(8,Math.min(rect.right-224,window.innerWidth-232)),top:Math.min(rect.bottom+5,Math.max(8,window.innerHeight-(moreOnly?294:490)))});
  };
  const items=invoiceActionItems(invoice).filter((_,index)=>!moreOnly||index>=6).map(item=>{const key=item.key;const permission={edit:'edit',clone:'add',credit:'add',payment:'edit',void:'edit',lock:'edit'}[key];return {...item,disabled:item.disabled||(permission&&!auth.can('Invoice List',permission))};});
  return <>
    <button ref={buttonRef} type="button" className="invoice-menu-trigger" aria-label={uiT('Actions '+(invoice.number||'INV-'+invoice.id))} aria-haspopup="menu" aria-expanded={Boolean(position)} onClick={toggle}><MoreHorizontal size={18}/>{!moreOnly&&<span>{uiT("Actions")}</span>}</button>
    {position&&createPortal(<div ref={menuRef} className="invoice-action-menu" style={position} role="menu" aria-label={uiT("Invoice actions")}>{items.map(({key,label,icon:Icon,disabled})=><button key={key} type="button" role="menuitem" disabled={disabled} className={key==='void'?'invoice-action-danger':''} onClick={()=>{setPosition(null);onAction(key);}}><Icon size={15}/>{uiT(label)}</button>)}</div>,document.body)}
  </>;
}
export default function InvoiceToolbar({invoice,onAction}){
  useUiLanguage();

  const auth=useAuth();
  return <div className="invoice-action-toolbar">{invoiceActionItems(invoice).slice(0,6).map(item=>{const key=item.key;const permission={edit:'edit',clone:'add',credit:'add',payment:'edit',void:'edit',lock:'edit'}[key];return {...item,disabled:item.disabled||(permission&&!auth.can('Invoice List',permission))};}).map(({key,label,icon:Icon,disabled})=><button key={key} type="button" disabled={disabled} onClick={()=>onAction(key)}><Icon size={14}/>{uiT(label)}</button>)}<InvoiceMenu invoice={invoice} onAction={onAction} moreOnly/></div>;
}