import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceItems,invoiceFormItems,normalizeInvoiceItems,invoiceItemTotals,validateInvoiceItems,discountedInvoiceItems,invoiceItemFingerprint} from './invoiceItems.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {itemRefundPlan,invoiceRefundItems,invoiceRefundItem} from './creditNotes.js';
import {invoiceCommission,defaultCommissionRules} from './incentiveData.js';
import {emptySnapshot,mergePermittedSnapshot} from './accessControl.js';
const items=[{id:'frame-1',sku:'Frame A',quantity:2,unitPriceCents:10000,lineTotalCents:20000},{id:'lens-1',sku:'Vegas lenses',quantity:1,unitPriceCents:30000,lineTotalCents:30000}];
const invoice={id:'invoice-1',number:'INV-NC001',branch:'New Cairo',items,...invoiceItemTotals(items),discount:50,shippingCharge:20,adjustment:-5,paid:465};
test('multiple invoice rows calculate subtotal, quantities, discounts, charges and balance',()=>{
 const totals=invoiceAmounts(invoice);assert.equal(totals.subtotal,500);assert.equal(invoice.quantity,3);assert.equal(totals.itemTotal,450);assert.equal(totals.total,465);assert.equal(totals.balance,0);
 assert.equal(invoiceAmounts({...invoice,paid:400}).balance,65);validateInvoiceItems(invoice);
 const draft=normalizeInvoiceItems([{id:'new',sku:' Test ',quantity:'2',unitPrice:'1.23'}]);assert.equal(draft[0].sku,'Test');assert.equal(draft[0].lineTotalCents,246);
 for(const patch of [{quantity:0},{quantity:1.5},{sku:''},{unitPriceCents:-1},{lineTotalCents:1}])assert.throws(()=>normalizeInvoiceItems([{...items[0],...patch}]));
 assert.throws(()=>validateInvoiceItems({...invoice,total:1}),/totals/);
});
test('legacy single-item invoices preserve exact amounts and return IDs when edited',()=>{
 const legacy={id:'old',sku:'Frame',quantity:3,total:100,discount:0,paid:100};
 const converted=normalizeInvoiceItems(invoiceFormItems(legacy));const saved={...legacy,items:converted,...invoiceItemTotals(converted)};
 assert.equal(saved.total,100);assert.equal(converted[0].id,'invoice-item');assert.equal(invoiceItemFingerprint(saved),invoiceItemFingerprint(legacy));
 const notes=[{invoiceId:'old',amount:33.33,items:[{itemId:'invoice-item',quantity:1}]}];
 assert.equal(invoiceRefundItems(saved,notes)[0].remainingQuantity,2);assert.equal(invoiceAmounts(saved).total,100);
});
test('multi-item returns allocate discounts and enforce remaining quantities and paid limits',()=>{
 const allocated=discountedInvoiceItems(invoice);assert.deepEqual(allocated.map(item=>item.discountCents),[2000,3000]);
 const first=itemRefundPlan(invoice,[],[{itemId:'frame-1',quantity:1},{itemId:'lens-1',quantity:1}]);assert.equal(first.amount,360);assert.equal(first.items.length,2);
 const notes=[{invoiceId:invoice.id,amount:first.amount,items:first.items}],refunded={...invoice,refundedAmount:360};
 assert.equal(invoiceRefundItem(refunded,notes).returnedQuantity,2);assert.equal(invoiceRefundItem(refunded,notes).remainingQuantity,1);
 const second=itemRefundPlan(refunded,notes,[{itemId:'frame-1',quantity:1}]);assert.equal(second.amount,90);assert.equal(first.amount+second.amount,450);
 assert(itemRefundPlan(refunded,notes,[{itemId:'lens-1',quantity:1}]).error);
 assert(itemRefundPlan({...invoice,paid:50},[],[{itemId:'frame-1',quantity:1}]).error);
 assert(itemRefundPlan(invoice,[],[{itemId:'frame-1',quantity:1},{itemId:'frame-1',quantity:1}]).error);assert(itemRefundPlan(invoice,[],[]).error);
});
test('partial item returns conserve every penny including legacy rounding',()=>{
 const original={id:'round',sku:'Frame',quantity:3,total:100,discount:0,paid:100};const notes=[];
 for(let i=0;i<3;i++){const refunded=notes.reduce((sum,note)=>sum+note.amount,0),plan=itemRefundPlan({...original,refundedAmount:refunded},notes,1);assert(!plan.error);notes.push({invoiceId:'round',amount:plan.amount,items:plan.items});}
 assert.equal(notes.reduce((sum,note)=>sum+Math.round(note.amount*100),0),10000);assert.equal(invoiceRefundItem(original,notes).remainingQuantity,0);
 const smallItems=[{id:'a',sku:'A',quantity:1,unitPriceCents:1,lineTotalCents:1},{id:'b',sku:'B',quantity:1,unitPriceCents:2,lineTotalCents:2}],small={id:'small',items:smallItems,...invoiceItemTotals(smallItems),discount:0.01,paid:0.02};
 assert.equal(discountedInvoiceItems(small).reduce((sum,item)=>sum+item.discountCents,0),1);assert.equal(itemRefundPlan(small,[],smallItems.map(item=>({itemId:item.id,quantity:1}))).amount,0.02);
});
test('commission matches each item SKU and multiplies the selected rate by matching quantities',()=>{
 assert.equal(invoiceCommission(invoice,defaultCommissionRules()),150);
 const exact=[{id:'exact',name:'Frame A',matchType:'exact',match:'frame a',enabled:true,amountCents:1000}];assert.equal(invoiceCommission(invoice,exact),20);
 const separate={items:[{...items[0],sku:'vegas'},{...items[1],sku:'lens'}]};assert.equal(invoiceCommission(separate,defaultCommissionRules()),0);
});
test('server rejects changing item rows after an item return',()=>{
 const snapshot=emptySnapshot();snapshot.data.invoices=[invoice];snapshot.data.creditNotes=[{id:'note',invoiceId:invoice.id,items:[{itemId:'frame-1',quantity:1}],amount:90}];
 const edited=structuredClone(snapshot);edited.data.invoices[0].items[0].sku='Other frame';const admin={active:true,isAdmin:true,branches:'all'};
 assert.throws(()=>mergePermittedSnapshot(snapshot,edited,admin),/after an item refund/);
});
