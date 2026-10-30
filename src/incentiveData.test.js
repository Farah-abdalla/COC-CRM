import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCommissionRules,invoiceCommission,invoiceCommissionCents,validateCommissionRule,commissionProducts,commissionBreakdown} from './incentiveData.js';
import {emptySnapshot,visibleSnapshot,mergePermittedSnapshot,normalizePermissions} from './accessControl.js';
test('default rules preserve Frame and Vegas commission and selected items control totals',()=>{
 const invoice={sku:'Frame and Vegas lenses',quantity:3};const rules=defaultCommissionRules();
 assert.equal(invoiceCommission(invoice,rules),300);
 rules[0].enabled=false;assert.equal(invoiceCommission(invoice,rules),150);
 rules[1].enabled=false;assert.equal(invoiceCommission(invoice,rules),0);
 assert.equal(invoiceCommission(invoice,[]),0);assert.equal(invoiceCommission({...invoice,isVoided:true},defaultCommissionRules()),0);
});
test('custom exact SKU and keyword commissions combine precisely and ignore case',()=>{
 const rules=[{id:'custom',name:'Contact lens',matchType:'exact',match:'cl-001',amountCents:1234,enabled:true},{id:'keyword',name:'Lens bonus',matchType:'contains',match:'CL-',amountCents:66,enabled:true}];
 assert.equal(invoiceCommissionCents({sku:' CL-001 '},rules),1300);assert.equal(invoiceCommissionCents({sku:'CL-001-EXTRA'},rules),66);
 assert.throws(()=>validateCommissionRule({...rules[0],amountCents:0}),/greater than zero/);assert.throws(()=>validateCommissionRule({...rules[0],enabled:'yes'}),/enabled/);
});
test('only administrators can add, edit or deselect commission rules',()=>{
 const current=emptySnapshot();current.data.commissionRules=defaultCommissionRules();
 const admin={active:true,isAdmin:true,branches:'all',permissions:{}};
 const changed=structuredClone(current);changed.data.commissionRules[0].enabled=false;assert.equal(mergePermittedSnapshot(current,changed,admin).data.commissionRules[0].enabled,false);
 changed.data.commissionRules.push({id:'new',name:'Custom item',matchType:'exact',match:'SKU-1',amountCents:1000,enabled:true});assert.equal(mergePermittedSnapshot(current,changed,admin).data.commissionRules.length,3);
 for(const permissions of [normalizePermissions({Incentive:{view:true,add:true,edit:true}}),normalizePermissions({'Invoice List':{view:true,edit:true}})]){
  const staff={active:true,isAdmin:false,branches:['New Cairo'],permissions},incoming=structuredClone(visibleSnapshot(current,staff));
  assert.equal(incoming.data.commissionRules.length,2);incoming.data.commissionRules[0].enabled=false;
  assert.throws(()=>mergePermittedSnapshot(current,incoming,staff),/Only administrators/);
  incoming.data.commissionRules.push({id:'forged',name:'Forged rule',matchType:'exact',match:'SKU-1',amountCents:99999,enabled:true});assert.throws(()=>mergePermittedSnapshot(current,incoming,staff),/Only administrators/);
 }
 const hidden={active:true,branches:'all',permissions:normalizePermissions({Customers:{view:true}})};assert.deepEqual(visibleSnapshot(current,hidden).data.commissionRules,[]);
});

test('product incentive follows linked IDs, codes and legacy names per matching unit',()=>{
 const rule={id:'product-bonus',name:'Vegas X6',matchType:'product',match:'VEGAS BLUE X6',productId:11282,productSku:'6666660',amountCents:5000,enabled:true};
 validateCommissionRule(rule);
 const linked={id:'a',sku:'6666660',odooProductId:11282,odooProductLabel:'6666660',odooProductName:'Renamed Vegas lens',quantity:3,unitPriceCents:100,lineTotalCents:300};
 assert.equal(invoiceCommissionCents({items:[linked,{...linked,id:'b'}]},[rule]),30000);
 assert.equal(invoiceCommissionCents({sku:'[6666660] VEGAS BLUE X6'},[rule]),5000);
 assert.equal(invoiceCommissionCents({sku:'6666660'},[rule]),5000);
 assert.equal(invoiceCommissionCents({sku:'VEGAS BLUE X6'},[rule]),5000);
 assert.equal(invoiceCommissionCents({items:[{...linked,odooProductId:999}]},[rule]),0);
 assert.equal(invoiceCommissionCents({sku:'[OTHER] VEGAS BLUE X6'},[rule]),0);
 assert.equal(invoiceCommissionCents({sku:'6666660',isVoided:true},[rule]),0);
 assert.equal(invoiceCommissionCents({sku:'6666660'},[{...rule,enabled:false}]),0);
 assert.throws(()=>validateCommissionRule({...rule,productId:-1}),/valid product/);
 const current=emptySnapshot(),incoming=structuredClone(current);incoming.data.commissionRules=[rule];
 assert.deepEqual(mergePermittedSnapshot(current,incoming,{active:true,isAdmin:true,branches:'all',permissions:{}}).data.commissionRules,[rule]);
});
test('keyword incentives use the resolved name for products stored as SKU codes',()=>{
 const invoice={sku:'6666660'},products=[{id:11282,sku:'6666660',name:'VEGAS lens X6'}];
 assert.equal(invoiceCommissionCents(invoice,defaultCommissionRules(),products),5000);
});
test('incentive product options include catalogue entries and legacy invoice names',()=>{
 const choices=commissionProducts([{sku:'[CODE] Legacy frame'},{sku:'Manual frame'}],[{id:1,default_code:'C1',name:'Catalogue frame'}]);
 assert.ok(choices.some(product=>product.id===1&&product.sku==='C1'));
 assert.ok(choices.some(product=>product.name==='Legacy frame'&&product.sku==='CODE'));
 assert.ok(choices.some(product=>product.name==='Manual frame'));
});

test('salesperson commission multiplies each matching product rate by its sold quantity',()=>{
 const rules=[{id:'frame',name:'Frame',matchType:'exact',match:'FRAME-A',amountCents:5000,enabled:true},{id:'lens',name:'Lens',matchType:'exact',match:'LENS-A',amountCents:1234,enabled:true}];
 const invoice={items:[{id:'one',sku:'FRAME-A',quantity:10},{id:'two',sku:'FRAME-A',quantity:2},{id:'three',sku:'LENS-A',quantity:3},{id:'other',sku:'OTHER',quantity:100}]};
 const breakdown=commissionBreakdown(invoice,rules);assert.equal(breakdown[0].quantity,12);assert.equal(breakdown[0].commissionCents,60000);assert.equal(breakdown[1].commissionCents,3702);assert.equal(invoiceCommissionCents(invoice,rules),63702);
 assert.equal(invoiceCommission({sku:'FRAME-A',quantity:10},rules),500);
 assert.equal(invoiceCommissionCents({...invoice,isVoided:true},rules),0);
 assert.equal(invoiceCommissionCents(invoice,[{...rules[0],enabled:false}]),0);
 assert.equal(invoiceCommissionCents({items:[{id:'zero',sku:'FRAME-A',quantity:0}]},rules),0);
});
