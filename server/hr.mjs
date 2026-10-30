import {isPersonalAccount} from '../src/personalAccess.js';
﻿import {randomUUID} from 'node:crypto';
import {attendanceDurationMinutes} from '../src/attendanceDuration.js';
import {cairoToday,validDate,workingDates,leaveBalance,expirationAlerts} from '../src/hrData.js';
const deny=message=>{const e=new Error(message);e.status=403;throw e;};
const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const text=(value,max=200)=>{requireValue(typeof value==='string'&&value.length<=max,'Invalid text field.');return value.trim();};
const date=(value,optional=false)=>{if(optional&&!value)return '';requireValue(validDate(value),'Enter a valid date.');return value;};
const enumOf=(value,list)=>{requireValue(list.includes(value),'Invalid status or type.');return value;};
const base={employees:[],attendance:[],leaves:[],departments:[],jobTitles:[],documents:[],assets:[],notifications:[],leaveTypes:[{id:'annual',name:'Annual leave',allowance:21,limited:true},{id:'sick',name:'Sick leave',allowance:15,limited:true},{id:'unpaid',name:'Unpaid leave',allowance:0,limited:false}]};
export const hrRole=user=>user.isAdmin||user.hrRole==='admin'?'admin':user.hrRole==='manager'||(!user.hrRole&&user.isManager)?'manager':'employee';
export function createHRService(db,{audit}){
 db.exec(`CREATE TABLE IF NOT EXISTS hr_state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS hr_files(id TEXT PRIMARY KEY,name TEXT NOT NULL,mime TEXT NOT NULL,content BLOB NOT NULL);`);
 db.prepare('INSERT OR IGNORE INTO hr_state(id,data) VALUES(1,?)').run(JSON.stringify(base));
 const load=()=>{
  const row=db.prepare('SELECT * FROM hr_state WHERE id=1').get(),data=JSON.parse(row.data);
  // Additive normalization preserves historical records and explicitly labels their provenance.
  for(const attendance of data.attendance){
   attendance.userId??=data.employees.find(e=>e.id===attendance.employeeId)?.userId||'';
   attendance.status=attendance.checkOut?'completed':'in_progress';
   attendance.totalWorkingMinutes=attendance.checkOut?attendanceDurationMinutes(attendance.checkIn,attendance.checkOut):null;
   attendance.source??='legacy';
  }
  return {revision:row.revision,data};
 };
 const users=()=>db.prepare('SELECT id,name,email,branches,active,is_admin,is_manager,hr_role,permissions FROM staff_users').all().map(u=>({...u,branches:JSON.parse(u.branches),hrManager:Boolean(u.is_admin||['admin','manager'].includes(u.hr_role)||(!u.hr_role&&u.is_manager&&JSON.parse(u.permissions)?.['HR System']?.view))}));
 const branches=()=>JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot).data.branches;
 const permitted=user=>user.active&&(user.isAdmin||user.hrRole||isPersonalAccount(user)||user.permissions?.['HR System']?.view);
 const scoped=(user,e)=>hrRole(user)==='admin'||(hrRole(user)==='manager'&&e.managerId===user.id&&(user.branches==='all'||user.branches.includes(e.branch)))||e.userId===user.id;
 const visible=(state,user)=>{
  const role=hrRole(user),employees=state.data.employees.filter(e=>scoped(user,e)),ids=new Set(employees.map(e=>e.id));
  const documents=state.data.documents.filter(d=>ids.has(d.employeeId)&&(!d.confidential||role==='admin'||employees.some(e=>e.id===d.employeeId&&e.userId===user.id)));
  const data={...state.data,employees:employees.map(e=>{const managerName=users().find(u=>u.id===e.managerId)?.name||'';if(role==='admin'||e.userId===user.id)return {...e,managerName};const {salary,contractNotes,address,emergencyContact,...safe}=e;return {...safe,managerName};}),documents,attendance:state.data.attendance.filter(r=>ids.has(r.employeeId)),leaves:state.data.leaves.filter(r=>ids.has(r.employeeId)),assets:state.data.assets.filter(a=>role==='admin'||ids.has(a.employeeId)).map(a=>role==='admin'?a:{...a,history:a.history.filter(h=>ids.has(h.employeeId))}),notifications:state.data.notifications.filter(n=>n.recipients.includes(user.id)&&(role==='admin'||ids.has(n.employeeId)))};
  return {revision:state.revision,role,userId:user.id,branches:role==='admin'||user.branches==='all'?branches():branches().filter(b=>user.branches.includes(b)),users:role==='admin'?users().map(u=>({id:u.id,name:u.name,email:u.email,active:Boolean(u.active),branches:u.branches,isManager:u.hrManager})):[],inventory:role==='admin'?JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot).data.inventoryItems.map(i=>({id:String(i.id),name:i.itemName,sku:i.sku,branch:i.branch})):[],data,alerts:expirationAlerts(data.employees,documents)};
 };
 function mutate(state,user,action,input,now){
  const data=state.data,role=hrRole(user),admin=role==='admin',today=cairoToday(now);
  const needAdmin=()=>{if(!admin)deny('HR administrator access is required.');};
  const employee=id=>{const e=data.employees.find(e=>e.id===id);requireValue(e,'Employee not found.');if(!scoped(user,e))deny('Employee is outside your HR access.');return e;};
  const notify=(employeeId,title,recipientIds)=>{const recipients=[...new Set(recipientIds.filter(Boolean))];if(recipients.length)data.notifications.push({id:randomUUID(),employeeId,title,createdAt:now.toISOString(),recipients,readBy:[]});};
  const admins=()=>users().filter(u=>u.active&&(u.is_admin||u.hr_role==='admin')).map(u=>u.id);
  const validateAccountLink=(next,previous)=>{
   const linked=next.userId&&users().find(account=>account.id===next.userId);
   requireValue(!next.userId||(linked?.active&&(linked.branches==='all'||linked.branches.includes(next.branch))&&!data.employees.some(profile=>profile.id!==next.id&&profile.userId===next.userId)),'Choose an active account with access to the employee branch; each account can link to one employee.');
   requireValue(!next.userId||next.managerId!==next.userId,'An employee cannot be their own manager.');
   requireValue(!previous||previous.userId===next.userId||!data.attendance.some(row=>row.employeeId===previous.id&&!row.checkOut),'Close the employee attendance session before changing the linked account.');
  };
  if(action==='employee.save'){
   needAdmin();const old=input.id?employee(input.id):null;
   const e={id:old?.id||randomUUID(),employeeCode:text(input.employeeCode,40),name:text(input.name,120),photo:text(input.photo||'',300000),email:text(input.email||'',254),phone:text(input.phone||'',50),address:text(input.address||'',500),emergencyContact:text(input.emergencyContact||'',300),branch:text(input.branch),departmentId:text(input.departmentId||''),jobTitleId:text(input.jobTitleId||''),managerId:text(input.managerId||''),userId:text(input.userId||''),hireDate:date(input.hireDate),contractStart:date(input.contractStart,true),contractEnd:date(input.contractEnd,true),contractType:text(input.contractType||'',80),contractNotes:text(input.contractNotes||'',2000),status:enumOf(input.status,['Active','On leave','Inactive']),shiftStart:text(input.shiftStart||'09:00',5),workDays:input.workDays||[0,1,2,3,4],salary:input.salary===''||input.salary==null?'':Number(input.salary),leaveAllowances:input.leaveAllowances||{},endDate:input.status==='Inactive'?(old?.endDate||today):''};
   requireValue(e.name&&e.employeeCode&&branches().includes(e.branch),'Enter employee ID, name, and a configured branch.');
   requireValue(!data.employees.some(p=>p.id!==e.id&&p.employeeCode.toLowerCase()===e.employeeCode.toLowerCase()),'Employee ID already exists.');
   requireValue(!e.photo||/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(e.photo),'Use a JPEG or PNG photo.');
   requireValue(!e.email||/^\S+@\S+\.\S+$/.test(e.email),'Invalid email.');
   requireValue(e.salary===''||(Number.isFinite(e.salary)&&e.salary>=0),'Enter a valid salary.');
   requireValue(/^([01]\d|2[0-3]):[0-5]\d$/.test(e.shiftStart)&&Array.isArray(e.workDays)&&e.workDays.length&&e.workDays.length<=7&&new Set(e.workDays).size===e.workDays.length&&e.workDays.every(d=>Number.isInteger(d)&&d>=0&&d<=6),'Choose work days and a valid shift start.');
   requireValue(!e.contractEnd||e.contractEnd>=(e.contractStart||e.hireDate),'Contract end must follow its start.');
   requireValue(!e.departmentId||data.departments.some(d=>d.id===e.departmentId),'Choose a configured department.');
   requireValue(!e.jobTitleId||data.jobTitles.some(d=>d.id===e.jobTitleId),'Choose a configured job title.');
   const accounts=users(),manager=accounts.find(u=>u.id===e.managerId);
   validateAccountLink(e,old);
   requireValue(!e.managerId||(manager?.active&&e.managerId!==e.userId&&manager.hrManager&&(manager.branches==='all'||manager.branches.includes(e.branch))),'Choose a manager assigned to this branch.');
   requireValue(e.leaveAllowances&&typeof e.leaveAllowances==='object'&&!Array.isArray(e.leaveAllowances)&&Object.entries(e.leaveAllowances).every(([key,value])=>data.leaveTypes.some(t=>t.id===key)&&Number.isFinite(value)&&value>=0&&value<=366),'Invalid leave allowance.');
   if(old)Object.assign(old,e);else data.employees.push(e);
  }else if(action==='employee.link'){
   needAdmin();
   const existing=employee(input.id),userId=text(input.userId||'');
   const next={...existing,userId};
   validateAccountLink(next,existing);
   existing.userId=userId;
  }else if(action==='attendance.checkin'||action==='attendance.checkout'){
   const e=data.employees.find(e=>e.userId===user.id);
   if(!e&&input.employeeId)deny('Only your own check-in and check-out are allowed.');
   requireValue(e,'No employee profile is linked to your account. Ask an HR administrator.');
   if(input.employeeId&&input.employeeId!==e.id)deny('Only your own check-in and check-out are allowed.');
   requireValue(action.endsWith('checkout')||e.status==='Active','Only active employees can check in.');
   requireValue(today>=e.hireDate,'Check-in cannot precede the hire date.');
   const open=data.attendance.find(a=>a.employeeId===e.id&&!a.checkOut);
   const point=input.location;
   requireValue(point&&typeof point==='object'&&Number.isFinite(point.latitude)&&point.latitude>=-90&&point.latitude<=90&&Number.isFinite(point.longitude)&&point.longitude>=-180&&point.longitude<=180&&Number.isFinite(point.accuracy)&&point.accuracy>=0,'A valid current location is required for attendance.');
   requireValue(typeof point.capturedAt==='string'&&Number.isFinite(Date.parse(point.capturedAt))&&now.getTime()-Date.parse(point.capturedAt)<=120000&&Date.parse(point.capturedAt)-now.getTime()<=30000,'Location has expired. Detect your current location again.');
   const location={latitude:point.latitude,longitude:point.longitude,accuracy:point.accuracy,capturedAt:new Date(point.capturedAt).toISOString(),recordedAt:now.toISOString()};
   if(action.endsWith('checkin')){
    if(open){const error=new Error('An attendance session is already open.');error.status=409;throw error;}
    if(data.attendance.some(a=>(a.employeeId===e.id||a.userId===user.id)&&(a.date===today||(a.checkOut&&cairoToday(new Date(a.checkOut))===today)))){const error=new Error('Daily attendance is complete. You can clock in again on the next Cairo calendar day.');error.status=409;throw error;}
    data.attendance.push({id:randomUUID(),employeeId:e.id,userId:user.id,employeeName:e.name,employeeCode:e.employeeCode,date:today,shiftStart:e.shiftStart,checkIn:now.toISOString(),checkOut:'',checkInLocation:location,status:'in_progress',totalWorkingMinutes:null,source:'self_service',createdBy:user.id});
   }else{
    if(!open){const error=new Error('No open check-in exists.');error.status=409;throw error;}
    if(data.attendance.some(a=>a.id!==open.id&&(a.employeeId===e.id||a.userId===user.id)&&a.checkOut&&cairoToday(new Date(a.checkOut))===today)){const error=new Error('You have already clocked out today.');error.status=409;throw error;}
    const checkOut=now.toISOString(),minutes=attendanceDurationMinutes(open.checkIn,checkOut);
    Object.assign(open,{userId:user.id,checkOut,checkOutLocation:location,totalWorkingMinutes:minutes,status:'completed'});
   }
  }else if(action==='attendance.save'){
   needAdmin();const e=employee(input.employeeId),day=date(input.date),checkIn=text(input.checkIn,50),checkOut=text(input.checkOut||'',50);
   requireValue(/(Z|[+-]\d{2}:\d{2})$/.test(checkIn)&&Number.isFinite(Date.parse(checkIn))&&cairoToday(new Date(checkIn))===day&&Date.parse(checkIn)<=now.getTime()&&day>=e.hireDate,'Invalid check-in date or time.');
   requireValue(!checkOut||(/(Z|[+-]\d{2}:\d{2})$/.test(checkOut)&&Number.isFinite(Date.parse(checkOut))&&Date.parse(checkOut)>=Date.parse(checkIn)&&Date.parse(checkOut)<=now.getTime()),'Invalid check-out date or time.');
   const old=input.id&&data.attendance.find(r=>r.id===input.id);requireValue(!input.id||old,'Attendance record not found.');
   requireValue(!data.attendance.some(r=>r.id!==old?.id&&r.employeeId===e.id&&(r.date===day||(!r.checkOut&&!checkOut))),'Attendance already exists for that day or an open shift exists.');
   requireValue(!data.attendance.some(r=>r.id!==old?.id&&r.employeeId===e.id&&Date.parse(r.checkIn)<(checkOut?Date.parse(checkOut):Infinity)&&(r.checkOut?Date.parse(r.checkOut):Infinity)>Date.parse(checkIn)),'Attendance times overlap another shift.');
   const row={id:old?.id||randomUUID(),employeeId:e.id,userId:e.userId||'',date:day,shiftStart:e.shiftStart,checkIn:new Date(checkIn).toISOString(),checkOut:checkOut?new Date(checkOut).toISOString():'',reason:text(input.reason||'',500),updatedBy:user.id,source:'administrator_correction',status:checkOut?'completed':'in_progress',totalWorkingMinutes:checkOut?attendanceDurationMinutes(checkIn,checkOut):null,checkInVerification:null,checkOutVerification:null};requireValue(row.reason,'Enter a correction reason.');if(old)Object.assign(old,row);else data.attendance.push(row);
  }else if(action==='leave.request'){
   const e=employee(input.employeeId);if(!admin&&e.userId!==user.id)deny('Submit leave requests for your own account.');requireValue(e.status==='Active','Employee is inactive.');
   const type=data.leaveTypes.find(t=>t.id===input.typeId);requireValue(type,'Choose a leave type.');const start=date(input.start),end=date(input.end);requireValue(start>=e.hireDate,'Leave cannot precede hire date.');
   const dates=workingDates(start,end,e.workDays);requireValue(dates.length,'The request has no scheduled work days.');
   requireValue(!data.leaves.some(l=>l.employeeId===e.id&&['Pending','Approved'].includes(l.status)&&l.start<=end&&l.end>=start),'Leave overlaps an existing request.');
   const row={id:randomUUID(),employeeId:e.id,typeId:type.id,start,end,workDates:dates,days:dates.length,status:'Pending',reason:text(input.reason||'',1000),createdAt:now.toISOString(),createdBy:user.id};
   if(type.limited){for(const year of new Set(dates.map(d=>Number(d.slice(0,4))))){const balance=leaveBalance(e,type.id,data.leaves,year,data.leaveTypes);requireValue(balance.remaining>=dates.filter(d=>Number(d.slice(0,4))===year).length,'Insufficient leave balance. Pending leave reserves the balance.');}}
   data.leaves.push(row);notify(e.id,e.name+' requested '+type.name,[...admins(),e.managerId]);
  }else if(action==='leave.decide'){
   const row=data.leaves.find(l=>l.id===input.id);requireValue(row,'Leave request not found.');const e=employee(row.employeeId);
   if(!admin&&(role!=='manager'||e.managerId!==user.id))deny('Only HR or the assigned manager can decide leave.');
   requireValue(e.userId!==user.id&&row.createdBy!==user.id,'You cannot approve or reject your own request.');requireValue(row.status==='Pending','This request has already been decided.');
   const decision=enumOf(input.status,['Approved','Rejected']);
   if(decision==='Approved'){const type=data.leaveTypes.find(t=>t.id===row.typeId);if(type?.limited)for(const year of new Set((row.workDates||workingDates(row.start,row.end,e.workDays)).map(d=>Number(d.slice(0,4)))))requireValue(leaveBalance(e,type.id,data.leaves,year,data.leaveTypes).remaining>=0,'Allowance changed. Adjust the leave balance before approval.');}
   row.status=decision;row.decisionNote=text(input.decisionNote||'',1000);row.decidedBy=user.id;row.decidedAt=now.toISOString();
   notify(e.id,'Leave '+row.status.toLowerCase()+': '+e.name,[e.userId,...admins()]);
  }else if(['department.save','jobTitle.save','leaveType.save'].includes(action)){
   needAdmin();const key={'department.save':'departments','jobTitle.save':'jobTitles','leaveType.save':'leaveTypes'}[action],name=text(input.name,120);requireValue(name,'Enter a name.');
   const old=input.id&&data[key].find(r=>r.id===input.id);requireValue(!input.id||old,'Configuration record not found.');requireValue(!data[key].some(r=>r.id!==old?.id&&r.name.toLowerCase()===name.toLowerCase()),'This name already exists.');
   const row={id:old?.id||randomUUID(),name};if(key==='departments'){row.managerId=text(input.managerId||'');requireValue(!row.managerId||users().some(u=>u.id===row.managerId&&u.active&&u.hrManager),'Choose an active manager.');}
   if(key==='leaveTypes'){row.allowance=Number(input.allowance);row.limited=input.limited===true;requireValue(Number.isFinite(row.allowance)&&row.allowance>=0&&row.allowance<=366,'Invalid annual allowance.');}
   if(old)Object.assign(old,row);else data[key].push(row);
  }else if(action==='document.upload'){
   needAdmin();const e=employee(input.employeeId),name=text(input.name,150),mime=enumOf(input.mime,['application/pdf','image/jpeg','image/png']);
   requireValue(name&&!/[\r\n]/.test(name),'Invalid document name.');requireValue(typeof input.content==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(input.content),'Invalid file content.');
   const buffer=Buffer.from(input.content,'base64');requireValue(buffer.length>0&&buffer.length<=750000,'Files must be at most 750 KB.');
   const valid=mime==='application/pdf'?buffer.subarray(0,5).toString()==='%PDF-':mime==='image/png'?buffer.subarray(0,8).toString('hex')==='89504e470d0a1a0a':buffer.subarray(0,3).toString('hex')==='ffd8ff';requireValue(valid,'File content does not match its type.');
   const row={id:randomUUID(),employeeId:e.id,name,mime,size:buffer.length,expires:date(input.expires,true),confidential:input.confidential!==false,category:text(input.category||'Document',80),createdAt:now.toISOString(),archived:false};
   db.prepare('INSERT INTO hr_files(id,name,mime,content) VALUES(?,?,?,?)').run(row.id,name,mime,buffer);data.documents.push(row);
  }else if(action==='document.archive'){
   needAdmin();const row=data.documents.find(d=>d.id===input.id);requireValue(row,'Document not found.');row.archived=true;
  }else if(action==='asset.save'){
   needAdmin();const old=input.id&&data.assets.find(a=>a.id===input.id);requireValue(!input.id||old,'Asset not found.');
   const row={...old,id:old?.id||randomUUID(),tag:text(input.tag,80),name:text(input.name,150),serial:text(input.serial||'',100),category:text(input.category||'Other',80),condition:text(input.condition||'Good',200),inventoryItemId:text(input.inventoryItemId||''),status:old?.employeeId?'Assigned':enumOf(input.status||'Available',['Available','Maintenance','Retired']),employeeId:old?.employeeId||'',history:old?.history||[]};requireValue(row.tag&&row.name&&!data.assets.some(a=>a.id!==row.id&&a.tag.toLowerCase()===row.tag.toLowerCase()),'Enter a unique asset tag and name.');
   const inventory=JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot).data.inventoryItems;
   requireValue(!row.inventoryItemId||inventory.some(i=>String(i.id)===row.inventoryItemId),'Linked inventory item no longer exists.');
   if(old)Object.assign(old,row);else data.assets.push(row);
  }else if(action==='asset.assign'||action==='asset.return'){
   needAdmin();const asset=data.assets.find(a=>a.id===input.id);requireValue(asset,'Asset not found.');
   if(action==='asset.assign'){requireValue(asset.status==='Available'&&!asset.employeeId,'Asset is not available.');const e=employee(input.employeeId);requireValue(e.status==='Active','Employee is inactive.');asset.employeeId=e.id;asset.status='Assigned';asset.assignedAt=today;asset.dueDate=date(input.dueDate,true);requireValue(!asset.dueDate||asset.dueDate>=today,'Return due date cannot precede assignment.');asset.history.push({employeeId:e.id,assignedAt:today,dueDate:asset.dueDate,assignedBy:user.id,condition:asset.condition});}
   else{requireValue(asset.employeeId,'Asset is not assigned.');asset.condition=text(input.condition||asset.condition,200);Object.assign(asset.history.at(-1),{returnedAt:today,returnedBy:user.id,returnCondition:asset.condition});asset.employeeId='';asset.status='Available';asset.returnedAt=today;}
  }else if(action==='notification.read'){
   const row=data.notifications.find(n=>n.id===input.id&&n.recipients.includes(user.id));requireValue(row,'Notification not found.');if(!row.readBy.includes(user.id))row.readBy.push(user.id);
  }else throw new Error('Unknown HR action.');
 }
 async function handle(request,user,body){
  if(!permitted(user))return Response.json({error:'HR access is required.'},{status:403});
  const path=new URL(request.url).pathname;
  const headers={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
  if(request.method==='GET'&&path.startsWith('/api/hr/documents/')){
   const id=decodeURIComponent(path.slice('/api/hr/documents/'.length)),state=load(),doc=visible(state,user).data.documents.find(d=>d.id===id&&!d.archived);
   if(!doc)return Response.json({error:'Document unavailable.'},{status:404,headers});
   const file=db.prepare('SELECT * FROM hr_files WHERE id=?').get(id);if(!file)return Response.json({error:'Document unavailable.'},{status:404,headers});
   return new Response(file.content,{headers:{...headers,'Content-Type':file.mime,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name),'Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(path!=='/api/hr')return Response.json({error:'Not found.'},{status:404,headers});
  if(request.method==='GET')return Response.json(visible(load(),user),{headers});
  if(request.method!=='POST')return Response.json({error:'Method not allowed.'},{status:405,headers});
  db.exec('BEGIN IMMEDIATE');
  try{
   const state=load();if(!Number.isSafeInteger(body.revision)||body.revision!==state.revision){db.exec('ROLLBACK');return Response.json({error:'HR records changed. Reload HR and retry.'},{status:409,headers});}
   mutate(state,user,body.action,body.record||{},new Date());
   requireValue(Buffer.byteLength(JSON.stringify(state.data))<=15000000,'HR records exceed the current 15 MB metadata limit.');
   db.prepare('UPDATE hr_state SET data=?,revision=revision+1 WHERE id=1').run(JSON.stringify(state.data));audit(user.id,'HR '+body.action,body.record?.id||body.record?.employeeId||'HR');db.exec('COMMIT');
   return Response.json(visible(load(),user),{headers});
  }catch(error){db.exec('ROLLBACK');return Response.json({error:error.message},{status:error.status||400,headers});}
 }
 function syncAccount(account,branch){
  const state=load(),data=state.data;
  const linked=data.employees.find(e=>e.userId===account.id);
  const matches=data.employees.filter(e=>!e.userId&&e.email&&e.email.trim().toLowerCase()===account.email.toLowerCase());
  requireValue(linked||matches.length<=1,'Multiple HR profiles use this email. Link the correct employee account in HR before saving.');
  const employee=linked||matches[0];
  requireValue(!employee||employee.branch===branch||!data.attendance.some(a=>a.employeeId===employee.id&&!a.checkOut),'Clock out before changing the attendance branch.');
  if(employee){
   Object.assign(employee,{userId:account.id,name:account.name,email:account.email,branch});
   if(!account.active){employee.accountDisabled=true;employee.status='Inactive';}
   else if(employee.accountDisabled){delete employee.accountDisabled;employee.status='Active';}
  }else{
   let number=1;while(data.employees.some(e=>e.employeeCode.toLowerCase()===('ACC-'+String(number).padStart(4,'0')).toLowerCase()))number++;
   data.employees.push({id:randomUUID(),employeeCode:'ACC-'+String(number).padStart(4,'0'),userId:account.id,name:account.name,email:account.email,branch,photo:'',phone:'',address:'',emergencyContact:'',departmentId:'',jobTitleId:'',managerId:'',hireDate:cairoToday(),contractType:'',contractStart:'',contractEnd:'',contractNotes:'',status:account.active?'Active':'Inactive',...(!account.active?{accountDisabled:true}:{}),shiftStart:'09:00',workDays:[0,1,2,3,4],salary:'',leaveAllowances:{},endDate:''});
  }
  db.prepare('UPDATE hr_state SET data=?,revision=revision+1 WHERE id=1').run(JSON.stringify(data));
 }
 return {handle,syncAccount,validateBranches(next){requireValue(load().data.employees.every(e=>next.includes(e.branch)),'Reassign HR employees before removing or renaming their branch.');}};
}
