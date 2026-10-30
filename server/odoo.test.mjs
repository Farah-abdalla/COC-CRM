import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReadQuery,createOdooService} from './odoo.mjs';
import {createAccountService} from './accounts.mjs';
const config={ODOO_API_KEY:'test-only-secret',ODOO_KEY_EXPIRES:'2099-01-24'};
const request=path=>new Request('http://localhost:5173/api/odoo/'+path);
const options=fetchImpl=>({fetchImpl,pause:async()=>{}});
test('only fixed read queries, approved fields and bounded pagination are accepted',()=>{
 const query=buildReadQuery('stock',new URLSearchParams('limit=500&offset=500'));
 assert.deepEqual(query.domain,[['location_id.usage','=','internal']]);
 assert.equal(query.kwargs.limit,500);assert.equal(query.kwargs.offset,500);
 for(const path of ['res.users','write','unlink'])assert.throws(()=>buildReadQuery(path,new URLSearchParams()));
 for(const params of ['limit=501','offset=-1','limit=0','fields=password','domain=[]','method=write','offset=1&offset=2','branch=1','q='+('x'.repeat(121)),'updatedSince=2026-02-30 00:00:00'])assert.throws(()=>buildReadQuery('products',new URLSearchParams(params)));
 assert.throws(()=>buildReadQuery('sales',new URLSearchParams('from=2026-02-30')));
 assert.throws(()=>buildReadQuery('sales',new URLSearchParams('from=2026-11-01&to=2026-10-01')));
});
test('sales use posted product lines, customer document types and Odoo branch IDs',()=>{
 for(const [kind,type]of [['invoice','out_invoice'],['refund','out_refund']]){
  const query=buildReadQuery('sales',new URLSearchParams({kind,branch:'7',from:'2026-10-01',to:'2026-10-31'}));
  for(const condition of [['display_type','=','product'],['parent_state','=','posted'],['move_id.move_type','=',type],['move_id.branch_id','=',7]])assert.ok(query.domain.some(value=>JSON.stringify(value)===JSON.stringify(condition)));
  assert.ok(query.kwargs.fields.includes('price_subtotal'));
 }
 const moves=buildReadQuery('movements',new URLSearchParams('to=2026-10-31'));
 assert.ok(moves.domain.some(value=>value[2]==='2026-10-31 23:59:59'));
 const changes=buildReadQuery('products',new URLSearchParams('updatedSince=2026-10-01 00:00:00'));
 assert.ok(changes.domain.some(value=>value[0]==='write_date'));
});
test('RPC authenticates once, serializes reads, deduplicates/cache hits, and strips extra fields',async()=>{
 const calls=[];let active=0,maxActive=0;
 const service=createOdooService(config,options(async(url,init)=>{
  active++;maxActive=Math.max(maxActive,active);
  await new Promise(resolve=>setTimeout(resolve,5));
  const body=JSON.parse(init.body);calls.push(body.params);
  assert.equal(url,'https://rx.coceyewear.com/odoo-api/jsonrpc');
  assert.equal(init.redirect,'error');
  active--;
  return Response.json({result:body.params.service==='common'?18:[{id:1,name:'Test',password:config.ODOO_API_KEY}]});
 }));
 const [a,b,c]=await Promise.all([service.handle(request('products')),service.handle(request('products')),service.handle(request('branches'))]);
 assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(c.status,200);
 assert.equal(maxActive,1);assert.equal(calls.length,3);assert.equal(calls[0].method,'authenticate');
 for(const call of calls.slice(1)){assert.equal(call.method,'execute_kw');assert.equal(call.args[4],'search_read');assert.ok(call.args[6].fields.length);}
 assert.deepEqual((await a.json()).records,[{id:1,name:'Test'}]);
 await service.handle(request('products'));assert.equal(calls.length,3);
});
test('failures do not expose upstream errors or credentials; invalid operations never call Odoo',async()=>{
 let count=0;
 const service=createOdooService(config,options(async()=>{count++;return Response.json({error:{data:{debug:'password '+config.ODOO_API_KEY}}});}));
 assert.equal((await service.handle(new Request(request('products'),{method:'POST'}))).status,405);
 assert.equal((await service.handle(request('products?method=write'))).status,400);
 assert.equal(count,0);
 const result=await service.handle(request('products'));assert.equal(result.status,502);assert.ok(!(await result.text()).includes(config.ODOO_API_KEY));
 assert.equal((await createOdooService().handle(request('products'))).status,503);
 assert.equal((await createOdooService({...config,ODOO_KEY_EXPIRES:'2000-01-01'}).handle(request('products'))).status,503);
 const status=await createOdooService(config).handle(request('status'));assert.ok(!(await status.text()).includes(config.ODOO_API_KEY));
});
test('cached data expires and failed authentication is recoverable',async()=>{
 let time=Date.now(),count=0,fail=true;
 const service=createOdooService(config,{...options(async(_url,init)=>{
  count++;const call=JSON.parse(init.body).params;
  return Response.json({result:call.service==='common'?(fail?false:9):[]});
 }),now:()=>time});
 assert.equal((await service.handle(request('products'))).status,502);fail=false;
 assert.equal((await service.handle(request('products'))).status,200);assert.equal(count,3);
 time+=61000;
 assert.equal((await service.handle(request('products'))).status,200);assert.equal(count,4);
});
test('account boundary rejects anonymous and staff Odoo access and allows administrators',async t=>{
 let count=0;const service=createAccountService(':memory:',{odoo:{handle:async()=>{count++;return Response.json({records:[]});}}});t.after(()=>service.close());
 const origin='http://localhost:5173';
 const call=(path,method='GET',body,cookie='')=>service.handle(new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}),{local:true});
 assert.equal((await call('/api/odoo/products')).status,401);
 const setup=await call('/api/auth/setup','POST',{name:'Owner',email:'owner@odoo.test',password:'owner-password-123'});
 assert.equal(setup.status,200);const owner=setup.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/odoo/products','GET',null,owner)).status,200);assert.equal(count,1);
 assert.equal((await call('/api/users','POST',{dataScope:'branch',name:'Staff',email:'staff@odoo.test',password:'staff-password-123',branches:'all',permissions:{}},owner)).status,200);
 const login=await call('/api/auth/login','POST',{email:'staff@odoo.test',password:'staff-password-123'});
 const staff=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/odoo/products','GET',null,staff)).status,403);assert.equal(count,1);
});

