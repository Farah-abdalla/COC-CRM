import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
import {normalizePermissions,emptySnapshot,mergePermittedSnapshot,visibleSnapshot} from '../src/accessControl.js';
const origin='http://localhost:5173';
function client(service){let cookie='';return {async request(path,method='GET',body){const response=await service.handle(new Request(origin+path,{method,headers:{...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{}),Cookie:cookie},...(method!=='GET'?{body:JSON.stringify(body||{})}:{})}),{local:true});const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return {status:response.status,body:await response.json(),cookie:next};},get cookie(){return cookie;}};}
const permissions=(page,rights=['view'])=>normalizePermissions({[page]:Object.fromEntries(rights.map(right=>[right,true]))});
test('email accounts enforce permissions, branch privacy, session revocation, and revisions',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),staff=client(service),outsider=client(service);
 let session;
 await t.test('owner setup is local, unique, and creates an HttpOnly session',async()=>{
  let result=await service.handle(new Request(origin+'/api/auth/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Owner',email:'owner@example.com',password:'owner-password-123'})}),{local:false});assert.equal(result.status,403);
  const result2=await owner.request('/api/auth/setup','POST',{name:'Owner',email:'owner@example.com',password:'owner-password-123'});assert.equal(result2.status,200);assert.match(result2.cookie,/HttpOnly/);assert.match(result2.cookie,/SameSite=Strict/);session=result2.body;assert.equal(session.user.isOwner,true);
  assert.equal((await outsider.request('/api/auth/setup','POST',{name:'Other',email:'other@example.com',password:'other-password-123'})).status,409);
 });
 await t.test('anonymous reads, forged origins, and wrong passwords are rejected',async()=>{
  assert.equal((await outsider.request('/api/crm-data')).status,401);
  assert.equal((await outsider.request('/api/auth/login','POST',{email:'owner@example.com',password:'wrong'})).status,401);
  const response=await service.handle(new Request(origin+'/api/users',{method:'POST',headers:{Origin:'http://evil.test','Content-Type':'application/json',Cookie:owner.cookie},body:'{}'}));assert.equal(response.status,403);
 });
 await t.test('admin creates staff; passwords are not returned',async()=>{
  const result=await owner.request('/api/users','POST',{dataScope:'branch',name:'Staff',email:'staff@example.com',password:'staff-password-123',active:true,isAdmin:false,branches:['Nasr City'],permissions:permissions('Customers',['view','add','edit'])});
  assert.equal(result.status,200);assert.equal(JSON.stringify(result.body).includes('staff-password'),false);assert.equal(JSON.stringify(result.body).includes('password_hash'),false);
  assert.equal((await owner.request('/api/users','POST',{dataScope:'branch',name:'Duplicate',email:'staff@example.com',password:'staff-password-123',branches:'all'})).status,409);
 });
 await t.test('only permitted branch records are returned; hidden modules are empty',async()=>{
  const snapshot=structuredClone(session.snapshot);snapshot.data.customers=[{id:1,name:'Allowed',branch:'Nasr City'},{id:2,name:'Hidden',branch:'New Cairo'}];snapshot.data.orders=[{id:10,customerId:2,branch:'New Cairo'}];
  assert.equal((await owner.request('/api/crm-data','PUT',{revision:session.revision,snapshot})).status,200);
  const login=await staff.request('/api/auth/login','POST',{email:'STAFF@example.com',password:'staff-password-123'});assert.equal(login.status,200);
  assert.deepEqual(login.body.snapshot.data.customers.map(row=>row.id),[1]);assert.deepEqual(login.body.snapshot.data.orders,[]);assert.deepEqual(login.body.snapshot.matrixEdits,{});
  assert.equal((await staff.request('/api/users')).status,403);
 });
 await t.test('direct unauthorized writes, deletes, branch changes, and hidden-ID overwrites fail',async()=>{
  const remote=(await staff.request('/api/crm-data')).body;
  for(const change of [s=>s.data.orders.push({id:11,branch:'Nasr City'}),s=>s.data.customers.splice(0,1),s=>s.data.customers[0].branch='New Cairo',s=>s.data.customers.push({id:2,name:'Overwrite',branch:'Nasr City'}),s=>s.matrixEdits.fake={'0:0':12}]){
   const snapshot=structuredClone(remote.snapshot);change(snapshot);const result=await staff.request('/api/crm-data','PUT',{revision:remote.revision,snapshot});assert.equal(result.status,400);
  }
  const snapshot=structuredClone(remote.snapshot);snapshot.data.customers[0].name='Edited';
  assert.equal((await staff.request('/api/crm-data','PUT',{revision:remote.revision,snapshot})).status,200);
  const all=(await owner.request('/api/crm-data')).body;assert.equal(all.snapshot.data.customers.find(row=>row.id===2).name,'Hidden');assert.equal(all.snapshot.data.orders.length,1);
  assert.equal((await owner.request('/api/crm-data','PUT',{revision:remote.revision,snapshot:all.snapshot})).status,409);
 });
 await t.test('disabling accounts revokes existing sessions and prevents sign-in',async()=>{
  const users=(await owner.request('/api/users')).body.users;const user=users.find(user=>user.email==='staff@example.com');
  assert.equal((await owner.request('/api/users','PATCH',{...user,active:false})).status,200);
  assert.equal((await staff.request('/api/crm-data')).status,401);
  assert.equal((await staff.request('/api/auth/login','POST',{email:'staff@example.com',password:'staff-password-123'})).status,401);
  const admin=users.find(user=>user.isOwner);
  assert.equal((await owner.request('/api/users','PATCH',{...admin,active:false})).status,400);
 });
 await t.test('password changes require the old password and logout invalidates cookies',async()=>{
  assert.equal((await owner.request('/api/auth/password','POST',{currentPassword:'wrong',password:'new-owner-password-123'})).status,401);
  assert.equal((await owner.request('/api/auth/password','POST',{currentPassword:'owner-password-123',password:'new-owner-password-123'})).status,200);
  assert.equal((await outsider.request('/api/auth/login','POST',{email:'owner@example.com',password:'owner-password-123'})).status,401);
  assert.equal((await owner.request('/api/auth/logout','POST')).status,200);
  assert.equal((await owner.request('/api/crm-data')).status,401);
 });
});
test('linked branch checks use server records, not forged hidden parents',()=>{
 const snapshot=emptySnapshot();snapshot.data.customers=[{id:2,branch:'New Cairo'}];const user={active:true,isAdmin:false,branches:['Nasr City'],permissions:permissions('Eye Exams',['view','add'])};
 const incoming=visibleSnapshot(snapshot,user);incoming.data.exams.push({id:4,customerId:2});
 assert.throws(()=>mergePermittedSnapshot(snapshot,incoming,user),/outside your assigned/);
});
test('failed login attempts are throttled',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const actor=client(service);
 for(let i=0;i<10;i++)assert.equal((await actor.request('/api/auth/login','POST',{email:'missing@example.com',password:'wrong'})).status,401);
 assert.equal((await actor.request('/api/auth/login','POST',{email:'missing@example.com',password:'wrong'})).status,429);
});

test('report-only permissions cannot modify source records; stock checks include deductions',()=>{
 const snapshot=emptySnapshot();snapshot.data.invoices=[{id:1,branch:'Nasr City'}];snapshot.data.transfers=[{id:2,toBranch:'Nasr City',quantity:1}];
 const viewer={active:true,isAdmin:false,branches:'all',permissions:permissions('Incentive',['view','delete'])};
 const incoming=visibleSnapshot(snapshot,viewer);incoming.data.invoices=[];
 assert.throws(()=>mergePermittedSnapshot(snapshot,incoming,viewer),/delete permission/);
 const checker={...viewer,permissions:permissions('Check Before Order')};
 assert.equal(visibleSnapshot(snapshot,checker).data.transfers.length,1);
});
