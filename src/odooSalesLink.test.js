import test from 'node:test';
import assert from 'node:assert/strict';
import {readLinkedOdooSales,matchOdooBranch} from './odooSalesLink.js';
import {importOdooInvoices} from './mergeOdooInvoices.js';
import {emptySnapshot,validateSnapshot} from './accessControl.js';
const invoice=(id,number)=>({id,number,customerId:10+id,customer:'Customer '+id,date:'2026-10-29',lines:[{id:id*10,product_id:[3,'[V2054] V2054 Clip'],quantity:2,price_total:100}]});
test('Odoo sales link original numbers to verified CRM branches and product categories',async()=>{
 const a=invoice(1,'DT/INV/1'),b=invoice(2,'NC/INV/2'),unmatched=invoice(3,'WEB/INV/3'),calls=[];
 const read=async path=>{calls.push(path);const url=new URL(path,'http://localhost');if(url.pathname.endsWith('/branches'))return {records:[{id:2,name:'Downtown Branch'},{id:6,name:'New Cairo'},{id:7,name:'Ecommerce'}]};if(url.pathname.endsWith('/report-products'))return {records:[{id:3,name:'V2054 Clip',default_code:'V2054',categ_id:[4,'Eyeglasses']}]};return {records:url.searchParams.get('branch')==='2'?[a]:url.searchParams.get('branch')==='6'?[b]:[a,b,unmatched]};};
 const remote=await readLinkedOdooSales(read,{from:'2026-10-29',to:'2026-10-29'},['Downtown','New Cairo']);
 assert.equal(remote.records[0].branch,'Downtown');assert.equal(remote.records[1].branch,'New Cairo');assert.equal(remote.records[2].branch,undefined);assert.equal(remote.products[0].categoryName,'Eyeglasses');assert.equal(calls.filter(path=>path.startsWith('/api/odoo/invoices')).length,3);
 const base=emptySnapshot();base.data.branches=['Downtown','New Cairo'];const imported=importOdooInvoices(base.data,remote.records);assert.equal(imported.added,3);assert.equal(imported.data.invoices[0].number,'DT/INV/1');assert.equal(imported.data.invoices[0].branch,'Downtown');assert.equal(imported.data.invoices[0].odooBranchId,2);validateSnapshot({...base,data:imported.data});
});
test('repeat imports fill only missing branch links and preserve existing CRM edits and payment records',()=>{
 const record=invoice(1,'DT/INV/1'),first=importOdooInvoices(emptySnapshot().data,[record]);Object.assign(first.data.invoices[0],{notes:'Local notes',paid:10,locked:true});
 const second=importOdooInvoices(first.data,[{...record,branch:'Downtown',odooBranchId:2}]);assert.equal(second.added,0);assert.equal(second.updated,1);assert.equal(second.data.invoices.length,1);assert.equal(second.data.invoices[0].branch,'Downtown');assert.equal(second.data.invoices[0].notes,'Local notes');assert.equal(second.data.invoices[0].paid,10);assert.equal(second.data.invoices[0].locked,true);assert.equal(first.data.invoices[0].branch,'');
 const third=importOdooInvoices(second.data,[{...record,branch:'New Cairo',odooBranchId:6}]);assert.equal(third.updated,0);assert.equal(third.data.invoices[0].branch,'Downtown');
});
test('one Odoo branch imports directly and failed branch reads never return partially assigned records',async()=>{
 assert.equal(matchOdooBranch('Downtown Branch',['Downtown']),'Downtown');assert.equal(matchOdooBranch('Ecommerce',['Downtown']),'');assert.equal(matchOdooBranch('Ecommerce',['E-Commerce']),'E-Commerce');
 const a=invoice(1,'A');let invoiceReads=0;
 const read=async path=>{if(path.includes('/branches'))return {records:[{id:2,name:'Downtown Branch'}]};if(path.includes('/report-products'))throw Error('Catalogue unavailable');invoiceReads++;return {records:[a]};};
 const remote=await readLinkedOdooSales(read,{from:'2026-10-29',branch:'2'},['Downtown']);assert.equal(invoiceReads,1);assert.equal(remote.records[0].branch,'Downtown');assert.equal(remote.warnings.length,1);
 await assert.rejects(()=>readLinkedOdooSales(async path=>{if(path.includes('/branches'))throw Error('No branch data');return {records:[a]};},{from:'2026-10-29'},['Downtown']),/No branch data/);
});