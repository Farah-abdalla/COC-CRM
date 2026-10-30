import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReadQuery,createOdooService} from './odoo.mjs';
test('report product queries accept only bounded exact product identifiers and no arbitrary domain or cost fields',async()=>{
 const query=buildReadQuery('report-products',new URLSearchParams({ids:'7057,11282',names:JSON.stringify(['Eyeglasses 999']),codes:JSON.stringify(['6666660'])}));
 assert.deepEqual(query.kwargs.fields,['id','name','default_code','categ_id']);assert.ok(query.domain.some(value=>Array.isArray(value)&&value[0]==='id'&&value[1]==='in'));
 for(const params of ['','ids=0','ids=-1','ids=1&fields=standard_price','ids=1&domain=[]','names=not-json','names='+encodeURIComponent(JSON.stringify([1])),'ids='+Array.from({length:101},(_,i)=>i+1).join(',')])assert.throws(()=>buildReadQuery('report-products',new URLSearchParams(params)));
 const service=createOdooService({ODOO_API_KEY:'test',ODOO_KEY_EXPIRES:'2099-01-01'},{pause:async()=>{},fetchImpl:async(_url,options)=>{const request=JSON.parse(options.body).params;return Response.json({result:request.service==='common'?5:[{id:7057,name:'Sunglasses',default_code:'SUN',categ_id:[6,'Sunglasses'],standard_price:999,password:'hidden'}]});}});
 const response=await service.handle(new Request('http://localhost/api/odoo/report-products?ids=7057'));assert.equal(response.status,200);assert.deepEqual((await response.json()).records,[{id:7057,name:'Sunglasses',default_code:'SUN',categ_id:[6,'Sunglasses']}]);
});
