import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from './accounts.mjs';
import {cairoToday} from '../src/hrData.js';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {existsSync,unlinkSync} from 'node:fs';
const origin='http://localhost:5173';
function client(getService){let cookie='';return async(path,method='GET',body)=>{
 const service=typeof getService==='function'?getService():getService;
 const response=await service.handle(new Request(origin+path,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'})},...(method==='GET'?{}:{body:JSON.stringify(body)})}),{local:true});
 if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
 return {status:response.status,body:await response.json()};
};}
const point=()=>({latitude:30.0444,longitude:31.2357,accuracy:8,capturedAt:new Date().toISOString()});
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
async function save(actor,action,record){const state=ok(await actor('/api/hr'));return actor('/api/hr','POST',{action,revision:state.revision,record});}
const employee=(code,extra={})=>({employeeCode:code,name:'Same Display Name',branch:'Nasr City',hireDate:'2026-01-01',status:'Active',shiftStart:'09:00',workDays:[0,1,2,3,4],...extra});
test('authorized employee attendance uses existing account links, fresh locations and server timestamps without passkeys',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());
 const owner=client(service),hr=client(service),staff=client(service),peer=client(service),anonymous=client(service),outsider=client(service);
 ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'owner@attendance.test',password:'owner-password-123'}));
 const permissions=Object.fromEntries(['Incentive','Tasks','HR System'].map(page=>[page,{view:true}]));
 const accounts={};
 for(const [email,extra] of [['staff',{name:'Same Display Name',permissions}],['peer',{name:'Same Display Name',permissions}],['hr',{hrRole:'admin'}],['outside',{}],['wrongbranch',{permissions,branches:['New Cairo']}],['disabled',{permissions,active:false}]]){
  accounts[email]=ok(await owner('/api/users','POST',{dataScope:'branch',name:email,email:email+'@attendance.test',password:'staff-password-123',branches:['Nasr City'],active:true,...extra})).users.find(user=>user.email===email+'@attendance.test');
 }
 for(const [actor,email]of [[hr,'hr'],[staff,'staff'],[peer,'peer'],[outsider,'outside']])ok(await actor('/api/auth/login','POST',{email:email+'@attendance.test',password:'staff-password-123'}));
 const first=ok(await save(owner,'employee.save',employee('EXIST-1'))).data.employees.find(e=>e.employeeCode==='EXIST-1');
 const second=ok(await save(owner,'employee.save',employee('EXIST-2',{userId:accounts.peer.id}))).data.employees.find(e=>e.employeeCode==='EXIST-2');
 await t.test('normal sessions and HR roles remain required',async()=>{
  assert.equal((await anonymous('/api/hr')).status,401);assert.equal((await outsider('/api/hr')).status,403);
  assert.equal((await save(staff,'attendance.checkin',{location:point()})).status,400);
  assert.equal((await save(staff,'employee.link',{id:first.id,userId:accounts.staff.id})).status,403);
  assert.equal((await save(peer,'employee.link',{id:first.id,userId:accounts.staff.id})).status,403);
  assert.equal((await staff('/api/hr/webauthn/status')).status,404);
 });
 await t.test('HR administrator links the correct existing IDs and prevents duplicate, inactive or out-of-branch links',async()=>{
  for(const record of [{id:'missing',userId:accounts.staff.id},{id:first.id,userId:'Same Display Name'},{id:first.id,userId:accounts.peer.id},{id:first.id,userId:accounts.wrongbranch.id},{id:first.id,userId:accounts.disabled.id}]){
   assert.equal((await save(hr,'employee.link',record)).status,400,JSON.stringify(record));
  }
  const before=ok(await owner('/api/hr'));const linked=ok(await save(hr,'employee.link',{id:first.id,userId:accounts.staff.id}));
  assert.equal(linked.data.employees.length,before.data.employees.length);assert.equal(linked.data.employees.find(e=>e.id===first.id).userId,accounts.staff.id);
  assert.deepEqual(ok(await staff('/api/hr')).data.employees.map(e=>e.id),[first.id]);
  assert.equal(ok(await peer('/api/hr')).data.employees[0].id,second.id);
 });
 await t.test('missing, invalid, stale or future location cannot create attendance',async()=>{
  const revision=ok(await staff('/api/hr')).revision;
  for(const location of [undefined,{...point(),latitude:91},{...point(),longitude:'31'},{...point(),accuracy:-1},{...point(),capturedAt:'invalid'},{...point(),capturedAt:new Date(Date.now()-180000).toISOString()},{...point(),capturedAt:new Date(Date.now()+60000).toISOString()}]){
   assert.equal((await save(staff,'attendance.checkin',{location})).status,400);
  }
  const state=ok(await staff('/api/hr'));assert.equal(state.revision,revision);assert.equal(state.data.attendance.length,0);
  assert.equal((await save(staff,'attendance.checkin',{employeeId:second.id,location:point()})).status,403);
  assert.equal((await save(owner,'attendance.checkin',{employeeId:first.id,location:point()})).status,403);
 });
 let entered;
 await t.test('Check In succeeds with login and location only; identity, date and time come from the backend',async()=>{
  entered=ok(await save(staff,'attendance.checkin',{location:point(),userId:'forged',employeeName:'Fake',checkIn:'2000-01-01T00:00:00Z',date:'2000-01-01',status:'completed',totalWorkingMinutes:999})).data.attendance[0];
  assert.equal(entered.employeeId,first.id);assert.equal(entered.employeeCode,'EXIST-1');assert.equal(entered.employeeName,'Same Display Name');assert.equal(entered.userId,accounts.staff.id);
  assert.equal(entered.status,'in_progress');assert.equal(entered.source,'self_service');assert.equal(entered.totalWorkingMinutes,null);assert.equal(entered.checkInVerification,undefined);
  assert.ok(Date.parse(entered.checkIn)>Date.now()-60000);assert.equal(entered.date,cairoToday(new Date(entered.checkIn)));assert.equal(entered.checkInLocation.recordedAt,entered.checkIn);
  assert.equal((await save(staff,'attendance.checkin',{location:point()})).status,409);
 });
 await t.test('an open shift blocks relinking through both admin paths and cannot be closed by another employee',async()=>{
  assert.equal((await save(hr,'employee.link',{id:first.id,userId:''})).status,400);
  assert.equal((await save(hr,'employee.save',{...first,userId:''})).status,400);
  assert.equal((await save(peer,'attendance.checkout',{employeeId:first.id,location:point()})).status,403);
  assert.equal((await save(staff,'attendance.checkout',{})).status,400);
  assert.equal(ok(await staff('/api/hr')).data.attendance[0].checkOut,'');
 });
 await t.test('Check Out updates one persistent row and stores exact working minutes',async()=>{
  const ended=ok(await save(staff,'attendance.checkout',{location:point(),checkOut:'2099-01-01T00:00:00Z',totalWorkingMinutes:999})).data.attendance[0];
  assert.equal(ended.id,entered.id);assert.equal(ended.status,'completed');assert.equal(ended.checkOutLocation.longitude,31.2357);
  assert.equal(ended.totalWorkingMinutes,(Date.parse(ended.checkOut)-Date.parse(ended.checkIn))/60000);assert.ok(ended.totalWorkingMinutes>=0);
  assert.equal(ok(await staff('/api/hr')).data.attendance.length,1);assert.equal((await save(staff,'attendance.checkout',{location:point()})).status,409);
  assert.equal((await save(peer,'attendance.checkout',{location:point()})).status,409);
 });
 await t.test('completed daily attendance prevents repeat and concurrent clock-ins',async()=>{
  const state=ok(await staff('/api/hr')),body={revision:state.revision,action:'attendance.checkin',record:{location:point()}};
  const results=await Promise.all([staff('/api/hr','POST',body),staff('/api/hr','POST',body)]);
  assert.deepEqual(results.map(result=>result.status).sort(),[409,409]);
  assert.match(results[0].body.error,/Daily attendance is complete/);
  assert.equal((await save(staff,'attendance.checkin',{location:point()})).status,409);
  assert.equal(ok(await staff('/api/hr')).data.attendance.length,1);
  const peerState=ok(await peer('/api/hr')),peerBody={revision:peerState.revision,action:'attendance.checkin',record:{location:point()}};
  const peerResults=await Promise.all([peer('/api/hr','POST',peerBody),peer('/api/hr','POST',peerBody)]);
  assert.deepEqual(peerResults.map(result=>result.status).sort(),[200,409]);
  assert.equal(ok(await peer('/api/hr')).data.attendance.filter(row=>!row.checkOut).length,1);
 });
});
test('account link and location-only attendance survive SQLite restart',async t=>{
 const file=join(tmpdir(),'opticare-location-attendance-'+randomUUID()+'.sqlite');let service=createAccountService(file);
 t.after(()=>{service.close();for(const suffix of ['','-wal','-shm'])if(existsSync(file+suffix))unlinkSync(file+suffix);});
 const owner=client(()=>service);const account=ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'persist@attendance.test',password:'owner-password-123'})).user;
 const savedEmployee=ok(await save(owner,'employee.save',employee('PERSIST'))).data.employees[0];
 ok(await save(owner,'employee.link',{id:savedEmployee.id,userId:account.id}));
 const entered=ok(await save(owner,'attendance.checkin',{location:point()})).data.attendance[0];
 service.close();service=createAccountService(file);
 const loaded=ok(await owner('/api/hr'));assert.equal(loaded.data.employees[0].userId,account.id);assert.equal(loaded.data.attendance[0].id,entered.id);assert.equal(loaded.data.attendance[0].checkInLocation.latitude,30.0444);
 const ended=ok(await save(owner,'attendance.checkout',{location:point()})).data.attendance[0];
 assert.equal(ended.id,entered.id);assert.equal(ended.status,'completed');assert.equal(ended.totalWorkingMinutes,(Date.parse(ended.checkOut)-Date.parse(ended.checkIn))/60000);
});

test('daily attendance resets on the next Cairo day and overnight checkout uses that day allowance',async t=>{
 const service=createAccountService(':memory:');t.after(()=>service.close());const owner=client(service);
 const account=ok(await owner('/api/auth/setup','POST',{name:'Owner',email:'daily@attendance.test',password:'owner-password-123'})).user;
 const profile=ok(await save(owner,'employee.save',employee('DAILY',{userId:account.id}))).data.employees[0];
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-28T08:00:00Z')});
 ok(await save(owner,'attendance.checkin',{location:point()}));
 t.mock.timers.tick(8*3600000);
 ok(await save(owner,'attendance.checkout',{location:point()}));
 assert.equal((await save(owner,'attendance.checkin',{location:point()})).status,409);
 assert.equal((await save(owner,'attendance.checkout',{location:point()})).status,409);
 assert.equal((await save(owner,'attendance.save',{employeeId:profile.id,date:'2026-10-28',checkIn:'2026-10-28T17:00:00Z',checkOut:'2026-10-28T18:00:00Z',reason:'Duplicate daily record'})).status,400);
 t.mock.timers.tick(24*3600000);
 ok(await owner('/api/auth/login','POST',{email:'daily@attendance.test',password:'owner-password-123'}));
 const next=ok(await save(owner,'attendance.checkin',{location:point()}));
 assert.equal(next.data.attendance.length,2);assert.equal(next.data.attendance[1].date,'2026-10-29');
 t.mock.timers.tick(24*3600000);
 ok(await owner('/api/auth/login','POST',{email:'daily@attendance.test',password:'owner-password-123'}));
 const closed=ok(await save(owner,'attendance.checkout',{location:point()}));
 assert.equal(closed.data.attendance[1].totalWorkingMinutes,1440);
 assert.equal((await save(owner,'attendance.checkin',{location:point()})).status,409,'An overnight checkout consumes today attendance allowance');
 t.mock.timers.tick(24*3600000);
 ok(await owner('/api/auth/login','POST',{email:'daily@attendance.test',password:'owner-password-123'}));
 assert.equal(ok(await save(owner,'attendance.checkin',{location:point()})).data.attendance.length,3);
});