import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
import {cairoToday} from '../src/taskDeadlines.js';
function client(service){let cookie='';return async(path,method='GET',body)=>{const response=await service.handle(new Request('http://localhost:5173'+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:'http://localhost:5173','Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body)})}),{local:true});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,body:await response.json()};};}
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
test('dashboard-only staff receive branch-scoped sales aggregates without raw invoice access',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),staff=client(service),outsider=client(service),anonymous=client(service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@dashboard.test',password:'owner-password-123'}));
 const state=ok(await owner('/api/crm-data'));state.snapshot.data.invoices=[{id:'a',branch:'Nasr City',date:cairoToday(),total:100,salesPerson:'Alice'},{id:'b',branch:'New Cairo',date:cairoToday(),total:500,salesPerson:'Secret Person'}];ok(await owner('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot}));
 for(const [name,permissions] of [['staff',{'Dashboard Analytics':{view:true}}],['outsider',{}]])ok(await owner('/api/users','POST',{dataScope:'branch',name,email:name+'@dashboard.test',password:'staff-password-123',branches:['Nasr City'],permissions}));
 ok(await staff('/api/auth/login','POST',{email:'staff@dashboard.test',password:'staff-password-123'}));ok(await outsider('/api/auth/login','POST',{email:'outsider@dashboard.test',password:'staff-password-123'}));
 const summary=ok(await staff('/api/dashboard-sales'));assert.equal(summary.byBranch.length,1);assert.equal(summary.byBranch[0].grossCents,10000);assert.equal(summary.byBranch[0].branch,'Nasr City');assert.ok(!JSON.stringify(summary).includes('Secret Person'));
 assert.equal(ok(await staff('/api/crm-data')).snapshot.data.invoices.length,0);
 assert.equal((await anonymous('/api/dashboard-sales')).status,401);assert.equal((await outsider('/api/dashboard-sales')).status,403);assert.equal((await staff('/api/dashboard-sales','POST',{})).status,405);
});