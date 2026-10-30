import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
const origin='http://localhost:5173';
function client(service){let cookie='';return async(path,method='GET',body)=>{const response=await service.handle(new Request(origin+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body)})}),{local:true});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,body:await response.json()};};}
test('task assignments enforce roles, employee names, branch scope, privacy and persistence',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());
 const admin=client(service),manager=client(service),employee=client(service),other=client(service);
 await admin('/api/auth/setup','POST',{name:'Owner',email:'owner@tasks.test',password:'owner-password-123'});
 async function add(name,branches,extra={}){const result=await admin('/api/users','POST',{dataScope:'branch',name,email:name+'@tasks.test',password:'employee-password-123',branches,active:true,...extra});assert.equal(result.status,200);return result.body.users.find(user=>user.name===name);}
 const worker=await add('Employee',['Nasr City']);
 const second=await add('Other',['Nasr City']);
 const hidden=await add('Hidden',['New Cairo']);
 const disabled=await add('Disabled',['Nasr City'],{active:false});
 const boss=await add('Manager',['Nasr City'],{isManager:true});
 assert.equal(boss.isManager,true);
 assert.equal((await manager('/api/auth/login','POST',{email:'Manager@tasks.test',password:'employee-password-123'})).body.user.isManager,true);
 await employee('/api/auth/login','POST',{email:'Employee@tasks.test',password:'employee-password-123'});
 await other('/api/auth/login','POST',{email:'Other@tasks.test',password:'employee-password-123'});
 assert.equal((await employee('/api/task-employees')).status,403);
 assert.equal((await manager('/api/users')).status,403);
 const options=(await manager('/api/task-employees')).body.employees;
 assert.deepEqual(options.map(person=>person.id).sort(),[worker.id,second.id].sort());
 assert.deepEqual(Object.keys(options[0]).sort(),['branches','id','name']);
 async function attempt(actor,task){const state=(await actor('/api/crm-data')).body;state.snapshot.data.tasks.push(task);return actor('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot});}
 const task={id:'task-one',title:'Call customer',description:'Confirm collection',assigneeId:worker.id,assigneeName:worker.name,branch:'Nasr City',createdBy:boss.id,createdAt:new Date().toISOString(),dueDate:'2026-10-30',status:'Pending'};
 assert.equal((await attempt(manager,task)).status,200);
 assert.equal((await employee('/api/crm-data')).body.snapshot.data.tasks[0].title,task.title);
 assert.deepEqual((await other('/api/crm-data')).body.snapshot.data.tasks,[]);
 assert.equal((await attempt(employee,{...task,id:'forged',createdBy:worker.id})).status,400);
 for(const invalid of [{assigneeId:hidden.id,assigneeName:hidden.name},{assigneeId:disabled.id,assigneeName:disabled.name},{assigneeId:'missing'},{assigneeName:'Forged'},{branch:'New Cairo'},{createdBy:worker.id},{dueDate:'2026-02-30'}]){
  assert.equal((await attempt(manager,{...task,id:crypto.randomUUID(),...invalid})).status,400);
 }
 let state=(await manager('/api/crm-data')).body;state.snapshot.data.tasks[0].title='Changed';
 assert.equal((await manager('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,400);
 state=(await manager('/api/crm-data')).body;state.snapshot.data.tasks=[];
 assert.equal((await manager('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,400);
 const owner=(await admin('/api/auth/session')).body.user;
 assert.equal((await attempt(admin,{...task,id:'admin-task',createdBy:owner.id,assigneeId:hidden.id,assigneeName:hidden.name,branch:'New Cairo'})).status,200);
 assert.equal((await manager('/api/crm-data')).body.snapshot.data.tasks.length,1);
 assert.equal((await admin('/api/crm-data')).body.snapshot.data.tasks.length,2);
 async function complete(actor,patch={}){
  const state=(await actor('/api/crm-data')).body;
  state.snapshot.data.tasks=state.snapshot.data.tasks.map(row=>row.id===task.id?{...row,status:'Done',completedAt:new Date().toISOString(),completedBy:worker.id,...patch}:row);
  return actor('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot});
 }
 assert.equal((await complete(employee,{title:'Unauthorized change'})).status,400);
 assert.equal((await complete(employee,{completedBy:boss.id})).status,400);
 assert.equal((await complete(employee)).status,200);
 assert.equal((await manager('/api/crm-data')).body.snapshot.data.tasks[0].status,'Done');
 state=(await employee('/api/crm-data')).body;state.snapshot.data.tasks[0].status='Pending';
 assert.equal((await employee('/api/crm-data','PUT',{revision:state.revision,snapshot:state.snapshot})).status,400);

});
