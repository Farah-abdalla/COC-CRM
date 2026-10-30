import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReadQuery,createOdooService} from './odoo.mjs';
import {createAccountService} from './accounts.mjs';
test('invoice-product searches cover name, SKU and barcode and expose only approved catalogue fields',async()=>{
 const query=buildReadQuery('invoice-products',new URLSearchParams('q=6666660'));assert.equal(query.kwargs.limit,20);for(const field of ['name','default_code','barcode'])assert.ok(query.domain.some(row=>Array.isArray(row)&&row[0]===field&&row[1]==='ilike'&&row[2]==='6666660'));
 assert.equal(query.kwargs.fields.includes('standard_price'),false);assert.equal(query.kwargs.fields.includes('qty_available'),false);
 for(const value of ['limit=51','offset=-1','fields=standard_price','branch=1','ids=1','domain=[]','q=a&q=b'])assert.throws(()=>buildReadQuery('invoice-products',new URLSearchParams(value)));
 const service=createOdooService({ODOO_API_KEY:'test',ODOO_KEY_EXPIRES:'2099-01-01'},{pause:async()=>{},fetchImpl:async(_url,init)=>{const rpc=JSON.parse(init.body).params;return Response.json({result:rpc.service==='common'?5:[{id:11282,name:'VEGAS X6',default_code:'6666660',barcode:'123',list_price:150,categ_id:[14,'VEGAS X6'],standard_price:70,qty_available:99}]});}});
 const response=await service.handle(new Request('http://localhost/api/odoo/invoice-products?q=6666660'));assert.equal(response.status,200);const record=(await response.json()).records[0];assert.equal(record.default_code,'6666660');assert.equal(record.standard_price,undefined);assert.equal(record.qty_available,undefined);
});
test('invoice writers can search products without receiving general Odoo access',async t=>{
 const service=createAccountService(':memory:',{odoo:{handle:async()=>Response.json({records:[]})}});t.after(()=>service.close());const origin='http://localhost:5173';
 async function request(path,method='GET',body,cookie=''){const response=await service.handle(new Request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{local:true});return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 assert.equal((await request('/api/odoo/invoice-products')).status,401);const owner=(await request('/api/auth/setup','POST',{name:'Owner',email:'owner@products.test',password:'products-test-password-123'})).cookie;
 for(const [role,rights] of [['writer',{view:true,add:true}],['viewer',{view:true}],['editor',{view:true,edit:true}],['unrelated',{}]]){
  const email=role+'@products.test';assert.equal((await request('/api/users','POST',{dataScope:'branch',name:role,email,password:'products-test-password-123',branches:'all',permissions:{'Invoice List':rights}},owner)).status,200);
  const cookie=(await request('/api/auth/login','POST',{email,password:'products-test-password-123'})).cookie;assert.equal((await request('/api/odoo/invoice-products?q=666', 'GET',null,cookie)).status,['writer','editor'].includes(role)?200:403);
  for(const path of ['/api/odoo/products','/api/odoo/sales','/api/odoo/report-products?ids=1'])assert.equal((await request(path,'GET',null,cookie)).status,403);
  assert.equal((await request('/api/odoo/invoice-products','POST',{},cookie)).status,403);
 }
});
