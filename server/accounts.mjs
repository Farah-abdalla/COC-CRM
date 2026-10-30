import {branchInventory} from '../src/branchStockData.js';
import {personalName,isPersonalAccount} from '../src/personalAccess.js';
import {todaySalesSummary} from '../src/dashboardSales.js';
import {createHRService} from './hr.mjs';
import {changePayment} from '../src/paymentMutations.js';
import {getInvoicePayments} from '../src/paymentData.js';
import {can,inBranch,validateSnapshot} from '../src/accessControl.js';
import {defaultCommissionRules} from '../src/incentiveData.js';
import {DatabaseSync} from 'node:sqlite';
import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {emptySnapshot,visibleSnapshot,mergePermittedSnapshot,normalizePermissions,keys} from '../src/accessControl.js';
import {invoiceBranchNames,nextInvoiceNumber} from '../src/invoiceNumbers.js';
import {inventoryMatrices} from './initialInventory.js';
const derive=promisify(scrypt);
const digest=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('hex');
const duration=12*60*60*1000;
const emailOf=value=>String(value||'').trim().toLowerCase();
const cleanUser=row=>row?{id:row.id,name:row.name,email:row.email,isAdmin:Boolean(row.is_admin),isManager:Boolean(row.is_manager),isOwner:Boolean(row.is_owner),hrRole:row.hr_role||'',dataScope:row.is_admin||row.is_manager||['admin','manager'].includes(row.hr_role)?'branch':row.data_scope||'self',salesPersonName:row.sales_person_name||'',attendanceBranch:row.attendance_branch||'',active:Boolean(row.active),permissions:JSON.parse(row.permissions),branches:JSON.parse(row.branches)}:null;
function validAccount(body,creating){
 const name=String(body.name||'').trim(),email=emailOf(body.email);
 if(!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)throw new Error('Enter a name and a valid email address.');
 if((creating||body.password)&& (typeof body.password!=='string'||body.password.length<12||body.password.length>128))throw new Error('Use a password between 12 and 128 characters.');
 return {name,email};
}
async function passwordHash(password){
 const salt=randomBytes(16).toString('hex');
 const hash=await derive(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
 return salt+':'+hash.toString('hex');
}
const dummySalt='00000000000000000000000000000000';
async function passwordMatches(password,encoded){
 const [salt,expected]=(encoded||dummySalt+':'+dummySalt+dummySalt).split(':');
 const hash=await derive(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
 const target=Buffer.from(expected,'hex');return hash.length===target.length&&timingSafeEqual(hash,target);
}
export function createAccountService(filename,{odoo}={}){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS staff_users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,is_admin INTEGER NOT NULL DEFAULT 0,is_owner INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,permissions TEXT NOT NULL,branches TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS one_owner ON staff_users(is_owner) WHERE is_owner=1;
 CREATE TABLE IF NOT EXISTS staff_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES staff_users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS company_data(id INTEGER PRIMARY KEY CHECK(id=1),snapshot TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS login_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS staff_audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created TEXT NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(staff_users)').all().some(column=>column.name==='is_manager'))db.exec('ALTER TABLE staff_users ADD COLUMN is_manager INTEGER NOT NULL DEFAULT 0');
 if(!db.prepare('PRAGMA table_info(staff_users)').all().some(column=>column.name==='hr_role'))db.exec("ALTER TABLE staff_users ADD COLUMN hr_role TEXT NOT NULL DEFAULT ''");
 if(!db.prepare('PRAGMA table_info(staff_users)').all().some(column=>column.name==='attendance_branch'))db.exec("ALTER TABLE staff_users ADD COLUMN attendance_branch TEXT NOT NULL DEFAULT ''");
 if(!db.prepare('PRAGMA table_info(staff_users)').all().some(column=>column.name==='data_scope'))db.exec("ALTER TABLE staff_users ADD COLUMN data_scope TEXT NOT NULL DEFAULT 'self'");
 if(!db.prepare('PRAGMA table_info(staff_users)').all().some(column=>column.name==='sales_person_name'))db.exec("ALTER TABLE staff_users ADD COLUMN sales_person_name TEXT NOT NULL DEFAULT ''");
 const initial=emptySnapshot();initial.data.branches=invoiceBranchNames;initial.data.commissionRules=defaultCommissionRules();
 for(const [category,matrix] of Object.entries(inventoryMatrices)){initial.matrixEdits[category]={};matrix.values.forEach((row,r)=>row.forEach((value,c)=>{initial.matrixEdits[category][r+':'+c]=value;}));}
 db.prepare('INSERT OR IGNORE INTO company_data(id,snapshot,revision) VALUES(1,?,0)').run(JSON.stringify(initial));
 if(!db.prepare('SELECT id FROM staff_users LIMIT 1').get()&&db.prepare('SELECT revision FROM company_data WHERE id=1').get().revision===0)db.prepare('UPDATE company_data SET snapshot=? WHERE id=1').run(JSON.stringify(initial));
 const storedCompany=db.prepare('SELECT snapshot FROM company_data WHERE id=1').get();
 const storedSnapshot=JSON.parse(storedCompany.snapshot);
 let snapshotExpanded=false;for(const key of keys){if(!Array.isArray(storedSnapshot.data[key])){storedSnapshot.data[key]=key==='commissionRules'?defaultCommissionRules():[];snapshotExpanded=true;}}
 if(snapshotExpanded)db.prepare('UPDATE company_data SET snapshot=?,revision=revision+1 WHERE id=1').run(JSON.stringify(storedSnapshot));
 const cleanAccount=row=>{
  const user=cleanUser(row);if(!user)return null;
  const identity=personalName(user.salesPersonName||user.name);
  const matches=db.prepare('SELECT id,name,sales_person_name FROM staff_users WHERE active=1').all().filter(peer=>personalName(peer.sales_person_name||peer.name)===identity);
  return {...user,salesIdentityUnique:matches.length===1};
 };
 const getUser=id=>db.prepare('SELECT * FROM staff_users WHERE id=?').get(id);
 const audit=(actor,action,target)=>db.prepare('INSERT INTO staff_audit(actor,action,target,created) VALUES(?,?,?,?)').run(actor,action,target,new Date().toISOString());

 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const ownerExists=()=>Boolean(db.prepare('SELECT id FROM staff_users WHERE is_owner=1').get());
 const dataFor=user=>{const row=db.prepare('SELECT * FROM company_data WHERE id=1').get();return {user,revision:row.revision,snapshot:visibleSnapshot(JSON.parse(row.snapshot),user)};};
 const session=(request)=>{const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('coc_session='))?.slice(12);if(!token)return null;const row=db.prepare('SELECT u.* FROM staff_sessions s JOIN staff_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1').get(digest(token),Date.now());return cleanAccount(row);};
 const cookie=(request,token,age)=>'coc_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age+(new URL(request.url).protocol==='https:'?'; Secure':'');
 const respond=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...headers}});
 const fail=(message,status=400)=>respond({error:message},status);
 const throttle=bucket=>{
  const now=Date.now();db.prepare('DELETE FROM login_limits WHERE expires<?').run(now);
  db.prepare('INSERT INTO login_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1').run(bucket,now+15*60*1000);
  return db.prepare('SELECT count FROM login_limits WHERE bucket=?').get(bucket).count;
 };
 const newSession=(request,user)=>{
  const token=random();db.prepare('DELETE FROM staff_sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO staff_sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+duration);
  return respond(dataFor(user),200,{'Set-Cookie':cookie(request,token,duration/1000)});
 };
 const hr=createHRService(db,{audit});
 async function handle(request,{local=false}={}){
  const path=new URL(request.url).pathname,method=request.method;
  if(!path.startsWith('/api/'))return null;
  if(!['GET','POST','PUT','PATCH'].includes(method))return fail('Method not allowed.',405);
  if(method!=='GET'){
   if(request.headers.get('origin')!==new URL(request.url).origin)return fail('Request origin is not allowed.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return fail('JSON content is required.',415);
  }
  let body={};
  if(method!=='GET'){
   const text=await request.text();if(Buffer.byteLength(text)>1850000)return fail('Request is too large.',413);
   try{body=JSON.parse(text);}catch{return fail('Invalid JSON.');}
  }
  try{
   if(path==='/api/auth/session'&&method==='GET'){
    const user=session(request);return user?respond(dataFor(user)):respond({user:null,setupRequired:!ownerExists()});
   }
   if(path==='/api/auth/setup'&&method==='POST'){
    if(!local)return fail('First administrator setup is only available on this computer.',403);
    if(ownerExists())return fail('An administrator already exists.',409);
    if(throttle('setup')>5)return fail('Too many setup attempts. Try again in 15 minutes.',429);
    const {name,email}=validAccount(body,true),hash=await passwordHash(body.password),id=random();
    transaction(()=>{if(ownerExists())throw new Error('An administrator already exists.');db.prepare('INSERT INTO staff_users(id,name,email,password_hash,is_admin,is_owner,active,permissions,branches) VALUES(?,?,?,?,1,1,1,?,?)').run(id,name,email,hash,JSON.stringify(normalizePermissions()),JSON.stringify('all'));audit(id,'Owner created',id);});
    return newSession(request,cleanAccount(getUser(id)));
   }
   if(path==='/api/auth/login'&&method==='POST'){
    const email=emailOf(body.email);
    if(email.length>254)return fail('Email or password is incorrect.',401);
    if(throttle('login:'+email)>10||throttle('login:global')>100)return fail('Too many sign-in attempts. Try again in 15 minutes.',429);
    if(typeof body.password!=='string'||body.password.length>128)return fail('Email or password is incorrect.',401);
    const row=db.prepare('SELECT * FROM staff_users WHERE email=?').get(email);
    const matches=await passwordMatches(body.password,row?.password_hash);
    const latest=row?getUser(row.id):null;
    if(!matches||!latest?.active||latest.password_hash!==row.password_hash)return fail('Email or password is incorrect.',401);
    db.prepare('DELETE FROM login_limits WHERE bucket=?').run('login:'+email);
    return newSession(request,cleanAccount(latest));
   }
   const user=session(request);if(!user)return fail('Please sign in again.',401);
   if(path==='/api/branch-inventory'){
    if(!can(user,'Inventory'))return fail('Inventory access is required.',403);
    if(method!=='GET')return fail('Method not allowed.',405);
    const {data}=JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot);
    const branches=data.branches.filter(branch=>inBranch(user,'branches',branch,data));
    const kind=new URL(request.url).searchParams.get('kind')||'all';
    if(!['all','frames','glasses'].includes(kind))return fail('Choose frames or glasses inventory.',400);
    return respond(branchInventory(data,branches,kind));
   }
   if(path==='/api/dashboard-sales'){
    if(!can(user,'Dashboard Analytics'))return fail('Dashboard access is required.',403);
    if(method!=='GET')return fail('Method not allowed.',405);
    const snapshot=JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot),data=snapshot.data;
    return respond(todaySalesSummary({odooReportProducts:data.odooReportProducts||[],invoices:data.invoices.filter(row=>inBranch(user,'invoices',row,data)),creditNotes:data.creditNotes.filter(row=>inBranch(user,'creditNotes',row,data)),branches:data.branches.filter(branch=>user.isAdmin||user.branches==='all'||user.branches.includes(branch))}));
   }
   if(path==='/api/hr'||path.startsWith('/api/hr/'))return hr.handle(request,user,body);
   if(path==='/api/odoo'||path.startsWith('/api/odoo/')){
    const invoiceProductLookup=path==='/api/odoo/invoice-products'&&method==='GET'&&(can(user,'Invoice List','add')||can(user,'Invoice List','edit'));
    if(!user.isAdmin&&!invoiceProductLookup)return fail('Administrator access is required.',403);
    if(!odoo)return fail('Odoo is not configured on this server.',503);
    return odoo.handle(request);
   }
   if(path==='/api/auth/logout'&&method==='POST'){
    const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('coc_session='))?.slice(12);
    if(token)db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').run(digest(token));
    return respond({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
   }
   if(path==='/api/auth/password'&&method==='POST'){
    if(typeof body.currentPassword!=='string'||body.currentPassword.length>128||!await passwordMatches(body.currentPassword,getUser(user.id).password_hash))return fail('Current password is incorrect.',401);
    validAccount({...user,password:body.password},true);
    const hash=await passwordHash(body.password);
    // Revalidate after asynchronous password hashing.
    if(!session(request))return fail('Please sign in again.',401);
    transaction(()=>{db.prepare('UPDATE staff_users SET password_hash=? WHERE id=?').run(hash,user.id);db.prepare('DELETE FROM staff_sessions WHERE user_id=?').run(user.id);audit(user.id,'Password changed',user.id);});
    return newSession(request,cleanAccount(getUser(user.id)));
   }
   if(path==='/api/task-employees'&&method==='GET'){
    if(!user.isAdmin&&!user.isManager)return fail('Administrator or manager access is required.',403);
    const employees=db.prepare('SELECT * FROM staff_users WHERE active=1 AND is_admin=0 AND is_manager=0 ORDER BY name').all().map(cleanAccount).filter(employee=>user.isAdmin||user.branches==='all'||employee.branches==='all'||employee.branches.some(branch=>user.branches.includes(branch))).map(employee=>({id:employee.id,name:employee.name,branches:employee.branches==='all'?user.branches:user.branches==='all'||user.isAdmin?employee.branches:employee.branches.filter(branch=>user.branches.includes(branch))}));
    return respond({employees});
   }
   if(path==='/api/users'){
    if(!user.isAdmin)return fail('Administrator access is required.',403);
    if(method==='GET')return respond({users:db.prepare('SELECT * FROM staff_users ORDER BY is_owner DESC,name').all().map(cleanAccount)});
    if(method!=='POST'&&method!=='PATCH')return fail('Method not allowed.',405);
    const creating=method==='POST', {name,email}=validAccount(body,creating);
    if(!['','admin','manager','employee'].includes(body.hrRole||''))return fail('Choose a valid HR role.');
    if(body.branches!=='all'&&(!Array.isArray(body.branches)||body.branches.some(branch=>typeof branch!=='string')))return fail('Choose all branches or a list of assigned branches.');
    const knownBranches=JSON.parse(db.prepare('SELECT snapshot FROM company_data WHERE id=1').get().snapshot).data.branches;
    if(Array.isArray(body.branches)&&body.branches.some(branch=>!knownBranches.includes(branch)))return fail('Choose branches from the configured locations.');
    if(body.dataScope!==undefined&&!['self','branch'].includes(body.dataScope))return fail('Choose a valid workspace access scope.');
    if(body.salesPersonName!==undefined&&(typeof body.salesPersonName!=='string'||body.salesPersonName.length>120))return fail('Choose a valid salesperson name.');
    const hash=body.password?await passwordHash(body.password):null;
    const actor=session(request);if(!actor?.isAdmin)return fail('Administrator access is required.',403);
    transaction(()=>{
     const previous=creating?null:getUser(body.id);
     if(!creating&&!previous)throw new Error('Account not found.');
     if(previous?.is_owner&&(!body.isAdmin||body.active===false))throw new Error('The owner must remain an active administrator.');
     if(body.id===user.id&&(!body.isAdmin||body.active===false))throw new Error('You cannot remove your own administrator access.');
     const id=creating?random():body.id;
     if(creating)db.prepare('INSERT INTO staff_users(id,name,email,password_hash,is_admin,is_owner,active,permissions,branches) VALUES(?,?,?,?,?,0,?,?,?)').run(id,name,email,hash,body.isAdmin?1:0,body.active===false?0:1,JSON.stringify(normalizePermissions(body.permissions)),JSON.stringify(body.isAdmin?'all':body.branches));
     else{
      db.prepare('UPDATE staff_users SET name=?,email=?,is_admin=?,active=?,permissions=?,branches=?,password_hash=COALESCE(?,password_hash) WHERE id=?').run(name,email,body.isAdmin?1:0,body.active===false?0:1,JSON.stringify(normalizePermissions(body.permissions)),JSON.stringify(body.isAdmin?'all':body.branches),hash,id);
      db.prepare('DELETE FROM staff_sessions WHERE user_id=?').run(id);
     }
     db.prepare('UPDATE staff_users SET is_manager=? WHERE id=?').run(!body.isAdmin&&body.isManager===true?1:0,id);
     db.prepare('UPDATE staff_users SET hr_role=? WHERE id=?').run(body.hrRole||'',id);
     db.prepare('UPDATE staff_users SET data_scope=?,sales_person_name=? WHERE id=?').run(body.isAdmin||body.isManager||['admin','manager'].includes(body.hrRole)?'branch':body.dataScope??previous?.data_scope??'self',String(body.salesPersonName??previous?.sales_person_name??'').trim(),id);
     const savedUser=cleanAccount(getUser(id));
     const attendanceBranch=body.attendanceBranch===undefined?(savedUser.attendanceBranch||''):body.attendanceBranch;
     if(typeof attendanceBranch!=='string'||(attendanceBranch&&(!knownBranches.includes(attendanceBranch)||(savedUser.branches!=='all'&&!savedUser.branches.includes(attendanceBranch)))))throw new Error('Choose an attendance branch from the account assigned branches.');
     if(body.attendanceBranch!==undefined&&!attendanceBranch&&(creating||savedUser.attendanceBranch))throw new Error('Choose an attendance branch.');
     if(attendanceBranch){
      hr.syncAccount(savedUser,attendanceBranch);
      db.prepare('UPDATE staff_users SET attendance_branch=?,hr_role=? WHERE id=?').run(attendanceBranch,body.hrRole||'employee',id);
     }
     audit(actor.id,creating?'Account created':'Account permissions or password changed',id);
    });
    return respond({users:db.prepare('SELECT * FROM staff_users ORDER BY is_owner DESC,name').all().map(cleanAccount)});
   }
   if(path==='/api/payment-entry'&&method==='PATCH'){
    if(body.actorId!==user.id)return fail('The signed-in account changed. Reload company records.',403);
    const source=body.source,action=body.changes===null?'delete':'edit';
    if(!['Payments','Treasury'].includes(source)||!can(user,source,action))return fail('Payment action permission is required.',403);
    const result=transaction(()=>{
     const row=db.prepare('SELECT * FROM company_data WHERE id=1').get();
     if(!Number.isSafeInteger(body.revision)||body.revision!==row.revision)return null;
     const snapshot=JSON.parse(row.snapshot),payment=getInvoicePayments(snapshot.data.invoices,snapshot.data.invoiceEvents).find(payment=>payment.id===body.rowId);
     const invoice=payment&&snapshot.data.invoices.find(invoice=>String(invoice.id)===String(payment.invoiceId));
     if(!invoice||!inBranch(user,'invoices',invoice,snapshot.data)||!inBranch(user,'invoiceEvents',payment,snapshot.data))throw new Error('Payment is outside your assigned branches or unavailable.');
     const next=changePayment(snapshot,body.rowId,body.changes);validateSnapshot(next);
     db.prepare('UPDATE company_data SET snapshot=?,revision=revision+1 WHERE id=1').run(JSON.stringify(next));
     audit(user.id,action==='delete'?'Payment removed':'Payment edited',String(body.rowId));
     return dataFor(user);
    });
    return result?respond(result):fail('Another user saved newer records. Reload company records before changing this payment.',409);
   }
   if(path==='/api/crm-data'){
    if(method==='GET')return respond(dataFor(user));
    if(method!=='PUT')return fail('Method not allowed.',405);
    const result=transaction(()=>{
     const row=db.prepare('SELECT * FROM company_data WHERE id=1').get();
     if(!Number.isSafeInteger(body.revision)||body.revision!==row.revision)return null;
     const current=JSON.parse(row.snapshot);
     if(isPersonalAccount(user)){
      const numbering=[...current.data.invoices];
      for(const invoice of body.snapshot.data?.invoices||[]){
       const existing=current.data.invoices.find(row=>String(row.id)===String(invoice.id));
       if(existing){invoice.number=existing.number;continue;}
       if(!current.data.branches.includes(invoice.branch))throw new Error('Choose a configured invoice branch.');
       invoice.number=nextInvoiceNumber(numbering,invoice.branch);numbering.push(invoice);
      }
     }
     const merged=mergePermittedSnapshot(current,body.snapshot,user);
     hr.validateBranches(merged.data.branches);
     for(const task of merged.data.tasks){
      if(current.data.tasks.some(previous=>String(previous.id)===String(task.id)))continue;
      const employee=cleanAccount(getUser(task.assigneeId));
      if(!employee?.active||employee.isAdmin||employee.isManager||!merged.data.branches.includes(task.branch)||(employee.branches!=='all'&&!employee.branches.includes(task.branch)))throw new Error('Choose an active employee assigned to the task branch.');
      if(task.assigneeName!==employee.name)throw new Error('Employee details changed. Reopen the task form.');
     }
     db.prepare('UPDATE company_data SET snapshot=?,revision=revision+1 WHERE id=1').run(JSON.stringify(merged));
     audit(user.id,'Records saved','company');
     return {revision:row.revision+1,user,...(isPersonalAccount(user)?{snapshot:visibleSnapshot(merged,user)}:{})};
    });
    return result?respond(result):fail('Another user saved newer records. Download your unsaved backup, then reload the company copy.',409);
   }
   return fail('Not found.',404);
  }catch(error){
   if(String(error.message).includes('UNIQUE constraint failed: staff_users.email'))return fail('This email address already has an account.',409);
   if(error.code?.startsWith('SQLITE')){console.error('Account database request failed:',error.code);return fail('The request could not be saved.',500);}
   return fail(error.message||'The request could not be completed.');
  }
 }
 return {handle,close:()=>db.close()};
}

