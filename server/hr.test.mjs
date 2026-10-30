import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {unlinkSync,existsSync} from 'node:fs';
import {createAccountService} from './accounts.mjs';
import {cairoToday} from '../src/hrData.js';
const origin='http://localhost:5173';
function client(getService){let cookie='';return async(path,method='GET',body)=>{const service=typeof getService==='function'?getService():getService;const response=await service.handle(new Request(origin+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body||{})})}),{local:true});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const bytes=Buffer.from(await response.arrayBuffer());return {status:response.status,headers:response.headers,body:response.headers.get('content-type')?.includes('application/json')?JSON.parse(bytes.toString()):bytes};};}
const employee=(name,userId,extra={})=>({employeeCode:name,name,userId,branch:'Nasr City',hireDate:'2026-01-01',status:'Active',shiftStart:'09:00',workDays:[0,1,2,3,4,5,6],salary:15000,address:'Private address',contractNotes:'Confidential contract',leaveAllowances:{annual:2},...extra});
async function change(actor,action,record){
 const state=await actor('/api/hr');assert.equal(state.status,200);
 return actor('/api/hr','POST',{revision:state.body.revision,action,record});
}
const location=()=>({latitude:30.0444,longitude:31.2357,accuracy:12,capturedAt:new Date().toISOString()});
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
test('HR workflows enforce roles, privacy, revisions and preserve all CRM records',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),manager=client(service),worker=client(service),other=client(service),hr=client(service),outsider=client(service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@hr.test',password:'owner-password-123'}));
 const initial=ok(await owner('/api/crm-data'));initial.snapshot.data.inventoryItems.push({id:'existing-stock',itemName:'Company laptop',sku:'LT',quantity:2,branch:'Nasr City'});ok(await owner('/api/crm-data','PUT',{revision:initial.revision,snapshot:initial.snapshot}));
 const crmBefore=ok(await owner('/api/crm-data'));
 const add=async(name,hrRole,branches=['Nasr City'])=>ok(await owner('/api/users','POST',{dataScope:'branch',name,email:name+'@hr.test',password:'staff-password-123',branches,hrRole,active:true})).users.find(u=>u.name===name);
 const boss=await add('Manager','manager'),person=await add('Worker','employee'),peer=await add('Other','employee'),hrUser=await add('HumanResources','admin'),unauthorized=await add('NoHR',''),hidden=await add('Hidden','employee',['New Cairo']);
 for(const [actor,name] of [[manager,'Manager'],[worker,'Worker'],[other,'Other'],[hr,'HumanResources'],[outsider,'NoHR']])ok(await actor('/api/auth/login','POST',{email:name+'@hr.test',password:'staff-password-123'}));
 assert.equal((await outsider('/api/hr')).status,403);assert.equal((await client(service)('/api/hr')).status,401);
 let result=ok(await change(owner,'department.save',{name:'Operations',managerId:boss.id}));const departmentId=result.data.departments[0].id;
 result=ok(await change(owner,'jobTitle.save',{name:'Optician'}));const jobTitleId=result.data.jobTitles[0].id;
 result=ok(await change(hr,'employee.save',employee('EMP-1',person.id,{departmentId,jobTitleId,managerId:boss.id,contractEnd:cairoToday()})));const e=result.data.employees.find(e=>e.userId===person.id);
 result=ok(await change(owner,'employee.save',employee('EMP-2',peer.id)));const second=result.data.employees.find(e=>e.userId===peer.id);
 ok(await change(owner,'employee.save',employee('EMP-3',hidden.id,{branch:'New Cairo',salary:99999})));
 assert.equal((await change(owner,'employee.save',employee('EMP-1',''))).status,400);
 assert.equal((await change(owner,'employee.save',employee('WRONG',hidden.id))).status,400);
 const mine=ok(await worker('/api/hr'));assert.deepEqual(mine.data.employees.map(e=>e.id),[e.id]);assert.equal(mine.data.employees[0].salary,15000);assert.deepEqual(mine.users,[]);
 const team=ok(await manager('/api/hr'));assert.deepEqual(team.data.employees.map(e=>e.id),[e.id]);assert.equal(team.data.employees[0].salary,undefined);assert.equal(team.data.employees[0].contractNotes,undefined);assert.equal(team.data.employees[0].address,undefined);
 assert.equal((await change(manager,'employee.save',{...e,salary:999})).status,403);
 assert.equal((await change(worker,'employee.save',{...e,status:'Inactive'})).status,403);
 assert.equal((await change(manager,'attendance.checkin',{employeeId:e.id,location:location()})).status,403);
 const beforeLocation=ok(await worker('/api/hr'));
 for(const bad of [undefined,{...location(),latitude:91},{...location(),longitude:'31'},{...location(),accuracy:-1},{...location(),capturedAt:'bad'},{...location(),capturedAt:new Date(Date.now()-180000).toISOString()},{...location(),capturedAt:new Date(Date.now()+60000).toISOString()}]){
  assert.equal((await change(worker,'attendance.checkin',{employeeId:e.id,location:bad})).status,400);
 }
 assert.equal(ok(await worker('/api/hr')).revision,beforeLocation.revision);
 const checkin=ok(await change(worker,'attendance.checkin',{employeeId:e.id,location:location(),checkIn:'2000-01-01T00:00:00Z'})).data.attendance.find(a=>a.employeeId===e.id);
 assert.equal(checkin.checkInLocation.latitude,30.0444);assert.equal(checkin.checkInLocation.recordedAt,checkin.checkIn);assert.ok(Date.parse(checkin.checkIn)>Date.now()-60000);
 assert.equal((await change(worker,'attendance.checkout',{employeeId:e.id})).status,400);
 assert.equal(ok(await worker('/api/hr')).data.attendance.find(a=>a.id===checkin.id).checkOut,'');assert.equal((await change(worker,'attendance.checkin',{employeeId:e.id,location:location()})).status,409);
 const checkout=ok(await change(worker,'attendance.checkout',{employeeId:e.id,location:location()})).data.attendance.find(a=>a.id===checkin.id);assert.equal(checkout.checkOutLocation.longitude,31.2357);assert.equal(checkout.checkOutLocation.recordedAt,checkout.checkOut);assert.ok(Date.parse(checkout.checkOut)>=Date.parse(checkout.checkIn));assert.equal((await change(worker,'attendance.checkout',{employeeId:e.id,location:location()})).status,409);
 assert.equal((await change(other,'attendance.checkout',{employeeId:e.id,location:location()})).status,403);
 assert.equal((await change(worker,'attendance.save',{employeeId:e.id})).status,403);
 const yesterday=new Date(Date.parse(cairoToday())-86400000).toISOString().slice(0,10);
 const corrected=ok(await change(owner,'attendance.save',{employeeId:e.id,date:yesterday,checkIn:yesterday+'T07:10:00Z',checkOut:yesterday+'T15:10:00Z',reason:'Paper record reconciled'}));
 assert.equal(corrected.data.attendance.find(a=>a.date===yesterday).reason,'Paper record reconciled');
 assert.equal((await change(owner,'attendance.save',{employeeId:e.id,date:yesterday,checkIn:yesterday+'T07:10:00',reason:'Missing timezone'})).status,400);
 assert.equal((await change(owner,'attendance.save',{employeeId:second.id,date:yesterday,checkIn:yesterday+'T07:10:00Z',reason:''})).status,400);
 ok(await change(owner,'department.save',{id:departmentId,name:'People and Operations',managerId:boss.id}));
 ok(await change(owner,'jobTitle.save',{id:jobTitleId,name:'Senior optician'}));
 let configured=ok(await change(owner,'leaveType.save',{name:'Study leave',allowance:3,limited:true}));const study=configured.data.leaveTypes.find(l=>l.name==='Study leave');
 configured=ok(await change(owner,'leaveType.save',{...study,allowance:4}));assert.equal(configured.data.leaveTypes.find(l=>l.id===study.id).allowance,4);
 const today=cairoToday(),offset=n=>new Date(Date.parse(today)+n*86400000).toISOString().slice(0,10),request={employeeId:e.id,typeId:'annual',start:offset(1),end:offset(2),reason:'Annual break'};
 result=ok(await change(worker,'leave.request',request));const leave=result.data.leaves[0];
 assert.ok(ok(await manager('/api/hr')).data.notifications.some(n=>n.title.includes('requested')));
 assert.equal((await change(worker,'leave.request',{...request,typeId:'sick'})).status,400);
 assert.equal((await change(worker,'leave.request',{...request,start:offset(3),end:offset(3)})).status,400);
 assert.equal((await change(other,'leave.decide',{id:leave.id,status:'Approved'})).status,403);
 assert.equal((await change(worker,'leave.decide',{id:leave.id,status:'Approved'})).status,403);
 result=ok(await change(manager,'leave.decide',{id:leave.id,status:'Approved',decisionNote:'Approved by manager'}));assert.equal(result.data.leaves[0].status,'Approved');
 assert.ok(ok(await worker('/api/hr')).data.notifications.some(n=>n.title.includes('approved')));
 assert.equal((await change(owner,'leave.decide',{id:leave.id,status:'Rejected'})).status,400);
 result=ok(await change(worker,'leave.request',{employeeId:e.id,typeId:'unpaid',start:offset(4),end:offset(4)}));const reject=result.data.leaves.find(l=>l.status==='Pending');ok(await change(manager,'leave.decide',{id:reject.id,status:'Rejected',decisionNote:'Coverage required'}));
 assert.ok(ok(await worker('/api/hr')).data.notifications.some(n=>n.title.includes('rejected')));
 const pdf=Buffer.from('%PDF-1.4\nprivate contract\n%%EOF'),doc={employeeId:e.id,name:'contract.pdf',mime:'application/pdf',content:pdf.toString('base64'),confidential:true,expires:today};
 result=ok(await change(owner,'document.upload',doc));const document=result.data.documents[0];
 assert.ok(result.alerts.some(a=>a.id==='document-'+document.id));assert.ok(result.alerts.some(a=>a.id==='contract-'+e.id));
 assert.equal(ok(await manager('/api/hr')).data.documents.length,0);assert.equal((await manager('/api/hr/documents/'+document.id)).status,404);assert.equal((await other('/api/hr/documents/'+document.id)).status,404);
 const download=await worker('/api/hr/documents/'+document.id);assert.equal(download.status,200);assert.deepEqual(download.body,pdf);assert.match(download.headers.get('content-disposition'),/attachment/);assert.match(download.headers.get('cache-control'),/no-store/);
 assert.equal((await change(owner,'document.upload',{...doc,content:Buffer.from('<script>').toString('base64')})).status,400);
 assert.equal((await change(owner,'document.upload',{...doc,content:Buffer.alloc(750001).toString('base64')})).status,400);
 assert.equal((await change(worker,'document.upload',doc)).status,403);
 result=ok(await change(owner,'asset.save',{tag:'LT-001',name:'Laptop',category:'Laptop',condition:'New',status:'Available',inventoryItemId:'existing-stock'}));const asset=result.data.assets[0];
 ok(await change(owner,'asset.assign',{id:asset.id,employeeId:e.id,dueDate:offset(30)}));assert.equal(ok(await worker('/api/hr')).data.assets.length,1);
 assert.equal((await change(owner,'asset.assign',{id:asset.id,employeeId:second.id})).status,400);
 assert.equal((await change(worker,'asset.return',{id:asset.id,condition:'Good'})).status,403);
 result=ok(await change(owner,'asset.return',{id:asset.id,condition:'Good'}));assert.equal(result.data.assets[0].status,'Available');assert.ok(result.data.assets[0].history[0].returnedAt);
 const stale=ok(await owner('/api/hr'));ok(await change(owner,'jobTitle.save',{name:'Supervisor'}));assert.equal((await owner('/api/hr','POST',{revision:stale.revision,action:'jobTitle.save',record:{name:'Stale'}})).status,409);
 result=ok(await change(owner,'document.archive',{id:document.id}));assert.equal((await worker('/api/hr/documents/'+document.id)).status,404);assert.ok(!result.alerts.some(a=>a.id==='document-'+document.id));
 const note=ok(await worker('/api/hr')).data.notifications[0];ok(await change(worker,'notification.read',{id:note.id}));assert.ok(ok(await worker('/api/hr')).data.notifications.find(n=>n.id===note.id).readBy.includes(person.id));
 ok(await change(owner,'employee.save',{...e,status:'Inactive'}));assert.equal((await change(worker,'leave.request',{...request,typeId:'sick',start:offset(8),end:offset(8)})).status,400);
 const crmAfter=ok(await owner('/api/crm-data'));assert.deepEqual(crmAfter.snapshot,crmBefore.snapshot);assert.equal(crmAfter.revision,crmBefore.revision);assert.equal(JSON.stringify(crmAfter).includes('Private address'),false);
 const branchChange=structuredClone(crmAfter.snapshot);branchChange.data.branches=branchChange.data.branches.filter(b=>b!=='Nasr City');assert.equal((await owner('/api/crm-data','PUT',{revision:crmAfter.revision,snapshot:branchChange})).status,400);
 // Account role changes revoke sessions, including access to previously downloaded file URLs.
 const account=ok(await owner('/api/users')).users.find(u=>u.id===hrUser.id);ok(await owner('/api/users','PATCH',{...account,hrRole:''}));assert.equal((await hr('/api/hr')).status,401);
});
test('HR explicit employee role does not inherit manager privileges from task permissions',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),staff=client(service);ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@roles.test',password:'owner-password-123'}));
 const result=ok(await owner('/api/users','POST',{dataScope:'branch',name:'Task manager',email:'manager@roles.test',password:'staff-password-123',branches:'all',isManager:true,hrRole:'employee'}));assert.equal(result.users.find(u=>u.email==='manager@roles.test').isManager,true);ok(await staff('/api/auth/login','POST',{email:'manager@roles.test',password:'staff-password-123'}));assert.equal(ok(await staff('/api/hr')).role,'employee');
});
test('HR persists on database reopen without changing preexisting CRM rows',async t=>{
 const file=join(tmpdir(),'opticare-hr-'+randomUUID()+'.sqlite');let service=createAccountService(file);t.after(()=>{service.close();for(const suffix of ['', '-wal','-shm'])if(existsSync(file+suffix))unlinkSync(file+suffix);});const owner=client(()=>service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'persist@hr.test',password:'owner-password-123'}));const before=ok(await owner('/api/crm-data'));
 ok(await change(owner,'employee.save',employee('PERSIST','')));service.close();service=createAccountService(file);
 assert.equal(ok(await owner('/api/hr')).data.employees[0].employeeCode,'PERSIST');assert.deepEqual(ok(await owner('/api/crm-data')).snapshot,before.snapshot);
});

test('staff with Incentive, Tasks and Attendance permissions can record only their own located shift',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service),staff=client(service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@attendance.test',password:'owner-password-123'}));
 const permissions=Object.fromEntries(['Incentive','Tasks','HR System'].map(page=>[page,{view:true}]));
 const account=ok(await owner('/api/users','POST',{dataScope:'branch',name:'Attendance staff',email:'staff@attendance.test',password:'staff-password-123',branches:['Nasr City'],active:true,permissions})).users.find(u=>u.email==='staff@attendance.test');
 const e=ok(await change(owner,'employee.save',employee('ATT-1',account.id))).data.employees.find(e=>e.userId===account.id);
 ok(await staff('/api/auth/login','POST',{email:'staff@attendance.test',password:'staff-password-123'}));
 const before=ok(await staff('/api/hr'));assert.equal(before.role,'employee');assert.deepEqual(before.data.employees.map(e=>e.id),[e.id]);
 const entered=ok(await change(staff,'attendance.checkin',{employeeId:e.id,location:location()}));assert.equal(entered.data.attendance[0].createdBy,account.id);
 const ended=ok(await change(staff,'attendance.checkout',{employeeId:e.id,location:location(),checkOut:'2099-01-01T00:00:00Z',totalHours:999})).data.attendance[0];
 assert.ok(Date.parse(ended.checkOut)<=Date.now());assert.equal(ended.totalHours,undefined);
 assert.equal((await change(staff,'employee.save',{...e,salary:99999})).status,403);
});
