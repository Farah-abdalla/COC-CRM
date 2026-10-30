import test from 'node:test';
import assert from 'node:assert/strict';
import {groupOdooInvoices} from '../src/odooInvoiceData.js';
import {createOdooService} from './odoo.mjs';
const row=(id,invoice=7)=>({id,move_id:[invoice,'INV'],move_name:'INV',date:'2026-10-27',partner_id:[4,'Customer'],product_id:[3,'Product'],quantity:1,price_unit:0.1,discount:0,price_subtotal:0.1,price_total:0.12});
const request=query=>new Request('http://localhost/api/odoo/invoices?'+query);
function serviceFor(read){return createOdooService({ODOO_API_KEY:'test',ODOO_KEY_EXPIRES:'2099-01-01'},{pause:async()=>{},fetchImpl:async(_url,init)=>{const p=JSON.parse(init.body).params;return Response.json(p.service==='common'?{result:5}:await read(p.args[6],p.args[5][0]));}});}
test('groups by Odoo invoice ID, deduplicates lines, and preserves cents and item details',()=>{
 const invoices=groupOdooInvoices([row(1),row(2),row(2),row(3,8)]);
 assert.equal(invoices.length,2);const invoice=invoices.find(r=>r.id===7);
 assert.equal(invoice.lines.length,2);assert.equal(invoice.subtotal,0.2);assert.equal(invoice.tax,0.04);assert.equal(invoice.total,0.24);
 assert.throws(()=>groupOdooInvoices([{id:1}]));
});
test('reads every page before totaling an invoice split across line pages',async()=>{
 const offsets=[];
 const service=serviceFor(async(kwargs,domain)=>{
  offsets.push(kwargs.offset);assert.ok(kwargs.fields.includes('move_id'));
  assert.ok(domain.some(r=>r[0]==='move_id.move_type'&&r[2]==='out_invoice'));
  assert.ok(domain.some(r=>r[0]==='move_id.branch_id'&&r[2]===4));
  return {result:kwargs.offset===0?Array.from({length:500},(_,i)=>row(i+1)):[row(501)]};
 });
 const response=await service.handle(request('from=2026-10-27&to=2026-10-27&branch=4'));
 assert.equal(response.status,200);const data=await response.json();assert.deepEqual(offsets,[0,500]);
 assert.equal(data.records.length,1);assert.equal(data.records[0].lines.length,501);assert.equal(data.records[0].total,60.12);
});
test('failed later page returns an error instead of incomplete invoice totals',async()=>{
 const service=serviceFor(async kwargs=>kwargs.offset===0?{result:Array.from({length:500},(_,i)=>row(i+1))}:{error:{message:'upstream'}});
 const response=await service.handle(request('from=2026-10-27'));
 assert.equal(response.status,502);assert.ok(!(await response.json()).records);
});
test('invoice endpoint rejects unbounded or unsupported filters before calling upstream',async()=>{
 let calls=0;const service=serviceFor(async()=>{calls++;return {result:[]};});
 for(const query of ['', 'from=2026-02-30', 'from=2026-10-28&to=2026-10-27','from=2026-10-01&kind=refund','from=2026-10-01&offset=1','from=2026-10-01&branch=1&branch=2'])assert.equal((await service.handle(request(query))).status,400);
 assert.equal(calls,0);
});
test('large date ranges never return truncated invoice totals',async()=>{
 const service=serviceFor(async kwargs=>({result:Array.from({length:500},(_,i)=>row(kwargs.offset+i+1))}));
 const response=await service.handle(request('from=2026-10-01'));assert.equal(response.status,400);assert.match((await response.json()).error,/shorter date range/);
});
