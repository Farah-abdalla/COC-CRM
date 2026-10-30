import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
import {modules,normalizePermissions} from '../src/accessControl.js';
import {cairoToday} from '../src/taskDeadlines.js';
function client(service){let cookie='';return async(path,method='GET',body)=>{const response=await service.handle(new Request('http://localhost:5173'+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:'http://localhost:5173','Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body)})}),{local:true});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,body:await response.json()};};}
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
const all=normalizePermissions(Object.fromEntries(modules.map(page=>[page,{view:true,add:true,edit:true,delete:true}])));
test('ordinary accounts default to personal data, protect same-branch peer sales and retain their own attendance',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),alice=client(service),bob=client(service),team=client(service);
 const admin=ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@self.test',password:'owner-password-123'})).user;
 let users=ok(await owner('/api/users','POST',{name:'Alice Account',email:'alice@self.test',password:'staff-password-123',branches:['Nasr City'],attendanceBranch:'Nasr City',salesPersonName:'Saif',permissions:all})).users;
 const a=users.find(user=>user.email==='alice@self.test');assert.equal(a.dataScope,'self');assert.equal(a.isAdmin,false);
 users=ok(await owner('/api/users','POST',{name:'Bob Account',email:'bob@self.test',password:'staff-password-123',branches:['Nasr City'],attendanceBranch:'Nasr City',salesPersonName:'Ehsan',permissions:all})).users;const b=users.find(user=>user.email==='bob@self.test');
 ok(await owner('/api/users','POST',{name:'Team User',email:'team@self.test',password:'staff-password-123',dataScope:'branch',branches:['Nasr City'],permissions:all}));
 const state=ok(await owner('/api/crm-data')),date=cairoToday();state.snapshot.data.customers=[{id:1,name:'Alice Customer',branch:''},{id:2,name:'Peer Customer',branch:'Nasr City'}];
 state.snapshot.data.invoices=[{id:'own',number:'OWN-1',date,customerId:1,branch:'Nasr City',total:100,salesPerson:'Saif'},{id:'stable',number:'OWN-2',date,customerId:1,branch:'Nasr City',total:50,salesPerson:'Old Name',salesPersonId:a.id},{id:'peer',number:'PEER-SECRET',date,customerId:2,branch:'Nasr City',total:200,salesPerson:'Ehsan',salesPersonId:b.id},{id:'outside',number:'OUTSIDE',date,branch:'New Cairo',total:900,salesPerson:'Saif'}];
 state.snapshot.data.creditNotes=[{id:'own-credit',invoiceId:'own',date,amount:10},{id:'peer-credit',invoiceId:'peer',date,amount:20}];
 state.snapshot.data.invoiceEvents=[{id:'own-event',invoiceId:'own',action:'Viewed'},{id:'peer-event',invoiceId:'peer',action:'Viewed'}];
 state.snapshot.data.tasks=[a,b].map((user,index)=>({id:'task-'+index,title:'Task '+index,description:'Assigned work',assigneeId:user.id,assigneeName:user.name,branch:'Nasr City',createdBy:admin.id,createdAt:new Date().toISOString(),status:'Pending'}));
 ok(await owner('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot}));
 ok(await alice('/api/auth/login','POST',{email:'alice@self.test',password:'staff-password-123'}));ok(await bob('/api/auth/login','POST',{email:'bob@self.test',password:'staff-password-123'}));ok(await team('/api/auth/login','POST',{email:'team@self.test',password:'staff-password-123'}));
 let own=ok(await alice('/api/crm-data'));assert.deepEqual(own.snapshot.data.invoices.map(row=>row.id),['own','stable']);assert.deepEqual(own.snapshot.data.customers.map(row=>row.id),[1]);assert.deepEqual(own.snapshot.data.creditNotes.map(row=>row.id),['own-credit']);assert.deepEqual(own.snapshot.data.invoiceEvents.map(row=>row.id),['own-event']);assert.deepEqual(own.snapshot.data.tasks.map(row=>row.id),['task-0']);assert.ok(!JSON.stringify(own).includes('PEER-SECRET'));
 assert.deepEqual(ok(await bob('/api/crm-data')).snapshot.data.invoices.map(row=>row.id),['peer']);assert.equal(ok(await team('/api/crm-data')).snapshot.data.invoices.length,3);assert.equal(ok(await owner('/api/crm-data')).snapshot.data.invoices.length,4);
 for(const path of ['/api/users','/api/dashboard-sales','/api/task-employees','/api/odoo/sales'])assert.equal((await alice(path)).status,403,path);
 const hr=ok(await alice('/api/hr'));assert.equal(hr.data.employees.length,1);assert.equal(hr.data.employees[0].userId,a.id);assert.equal(hr.users.length,0);
 assert.equal((await alice('/api/hr','POST',{revision:hr.revision,action:'employee.save',record:{id:hr.data.employees[0].id,name:'Forged'}})).status,403);
 const forged=structuredClone(own.snapshot);forged.data.invoices[0].salesPersonId=b.id;assert.equal((await alice('/api/crm-data','PUT',{revision:own.revision,snapshot:forged})).status,400);
 const attack=structuredClone(own.snapshot);attack.data.invoices.push({...state.snapshot.data.invoices[2],salesPerson:'Saif',salesPersonId:a.id});assert.equal((await alice('/api/crm-data','PUT',{revision:own.revision,snapshot:attack})).status,400);
 own=ok(await alice('/api/crm-data'));own.snapshot.data.invoices[0].salesPersonId=a.id;ok(await alice('/api/crm-data','PUT',{revision:own.revision,snapshot:own.snapshot}));
 const owned=ok(await alice('/api/crm-data'));owned.snapshot.data.invoices.push({id:'my-new-sale',number:'PEER-SECRET',date,branch:'Nasr City',customerId:1,total:10,salesPerson:'Saif',salesPersonId:a.id});const created=ok(await alice('/api/crm-data','PUT',{revision:owned.revision,snapshot:owned.snapshot}));assert.notEqual(created.snapshot.data.invoices.find(row=>row.id==='my-new-sale').number,'PEER-SECRET','Server assigns numbers without exposing peer invoices');

});
test('duplicate legacy display names never expose each other sales, but stable account IDs still work',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),first=client(service),second=client(service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@duplicate.test',password:'owner-password-123'}));
 let users;for(const email of ['first@duplicate.test','second@duplicate.test'])users=ok(await owner('/api/users','POST',{name:'Same Name',email,password:'staff-password-123',branches:['Nasr City']})).users;
 const id=users.find(user=>user.email==='first@duplicate.test').id,state=ok(await owner('/api/crm-data'));state.snapshot.data.invoices=[{id:'legacy',branch:'Nasr City',salesPerson:'Same Name',total:100},{id:'stable',branch:'Nasr City',salesPerson:'Same Name',salesPersonId:id,total:200}];ok(await owner('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot}));
 const session=ok(await first('/api/auth/login','POST',{email:'first@duplicate.test',password:'staff-password-123'}));assert.equal(session.user.salesIdentityUnique,false);assert.deepEqual(session.snapshot.data.invoices.map(row=>row.id),['stable']);
 assert.deepEqual(ok(await second('/api/auth/login','POST',{email:'second@duplicate.test',password:'staff-password-123'})).snapshot.data.invoices,[]);
});