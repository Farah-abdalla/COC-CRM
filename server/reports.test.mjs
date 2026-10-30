import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
test('custom reports save, reload, edit and delete through authenticated company storage',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const origin='http://localhost:5173';let cookie='';
 async function request(path,method='GET',body){const response=await service.handle(new Request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{local:true});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,body:await response.json()};}
 let result=await request('/api/auth/setup','POST',{name:'Reports Owner',email:'reports@test.example',password:'reports-test-password-123'});assert.equal(result.status,200);
 const record={id:'custom-1',name:'Customers',source:'customers',columns:['name','branch'],filters:[],groupBy:'branch',sortBy:'name',direction:'asc',totals:[]};
 let state=result.body;state.snapshot.data.customReports=[record];assert.equal((await request('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,200);
 state=(await request('/api/crm-data')).body;assert.deepEqual(state.snapshot.data.customReports,[record]);state.snapshot.data.customReports[0].name='Updated report';assert.equal((await request('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,200);
 state=(await request('/api/crm-data')).body;assert.equal(state.snapshot.data.customReports[0].name,'Updated report');state.snapshot.data.customReports=[];assert.equal((await request('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,200);assert.deepEqual((await request('/api/crm-data')).body.snapshot.data.customReports,[]);
});
