import {salesPeople} from './incentiveData';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React,{useEffect,useState} from 'react';
import {Plus,Pencil,ShieldCheck,Users,Mail,Store,LockKeyhole,Eye,EyeOff,CheckCircle2} from 'lucide-react';
import {api,useAuth} from './Auth';
import AttendancePanel from './AttendancePanel';
import {modules,actions,normalizePermissions} from './accessControl';
const readOnly=new Set(['Dashboard Analytics','Incentive','Tasks','HR System','Check Before Order','Data storage']);
const blank=()=>({name:'',email:'',password:'',isAdmin:false,isManager:false,hrRole:'employee',dataScope:'self',salesPersonName:'',attendanceBranch:'',active:true,branches:'all',permissions:normalizePermissions()});
export default function AccountManagement({branches,onSaved}){
  useUiLanguage();

 const auth=useAuth(),[users,setUsers]=useState([]),[form,setForm]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const load=()=>api('/api/users').then(result=>setUsers(result.users)).catch(error=>setError(error.message));
 useEffect(()=>{load();},[]);
 function permission(page,action,value){setForm(current=>{const permissions=structuredClone(current.permissions);permissions[page][action]=value;if(action==='view'&&!value)actions.forEach(key=>permissions[page][key]=false);return {...current,permissions};});}
 async function submit(event){
  event.preventDefault();setError('');setBusy(true);
  try{const result=await api('/api/users',form.id?'PATCH':'POST',form);setUsers(result.users);setForm(null);setNotice('Account saved. Attendance is linked to the selected branch. Updated accounts must sign in again.');onSaved?.();if(form.id===auth.user.id)auth.expire();}
  catch(error){setError(error.message);}finally{setBusy(false);}
 }
 return <section className="panel accounts-panel">
  <div className="panel-head"><div><h2>{uiT("Accounts & permissions")}</h2><p>{uiT("Create staff accounts and choose what each person can access.")}</p></div><button className="primary" onClick={()=>{setForm(blank());setError('');setNotice('');}}><Plus size={16}/> {uiT("Add account")}</button></div>
  {notice&&<p className="account-success" role="status">{uiT(notice)}</p>}{error&&!form&&<p className="account-error" role="alert">{uiT(error)}</p>}
  <div className="table-wrap"><table><thead><tr><th>{uiT("Name")}</th><th>{uiT("Email")}</th><th>{uiT("Role")}</th><th>{uiT("Branches")}</th><th>{uiT("Status")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><b>{user.name}</b></td><td>{user.email}</td><td>{user.isOwner ? uiT('Owner') : user.isAdmin ? uiT('Administrator') : user.isManager ? uiT('Manager') : uiT('Staff')}{user.hrRole&&<small>{uiT(user.hrRole==='admin'?'HR administrator':user.hrRole==='manager'?'HR manager':'Employee self-service')}</small>}</td><td>{user.branches === 'all' ? uiT('All branches') : user.branches.join(', ') || uiT('No branches')}</td><td>{user.active ? uiT('Active') : uiT('Disabled')}</td><td><button className="secondary" aria-label={uiT('Edit account '+user.email)} onClick={()=>{setForm({...user,attendanceBranch:user.attendanceBranch||(user.branches!=='all'&&user.branches.length===1?user.branches[0]:''),password:'',permissions:normalizePermissions(user.permissions)});setError('');setNotice('');}}><Pencil size={14}/> {uiT("Edit")}</button></td></tr>)}</tbody></table></div>
  <p className="account-note"><ShieldCheck size={16}/> {uiT("Administrators have full access. Staff receive only the pages, actions, and branch records you assign. Disabled accounts cannot sign in.")}</p>
  {form&&<div className="modal-backdrop"><form className="modal account-modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{uiT("COC / ADMINISTRATION")}</p><h2>{form.id ? uiT('Edit account') : uiT('New staff account')}</h2></div><button type="button" className="icon-btn" aria-label={uiT("Close account editor")} onClick={()=>setForm(null)}>×</button></div>
   <div className="form-grid"><label>{uiT("Name")}<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>{uiT("Email")}<input required type="email" maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label className="span-2">{form.id ? uiT('Reset password (leave empty to keep current password)') : uiT('Password')}<input type="password" required={!form.id} minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><small>{uiT("At least 12 characters.")}</small></label>
    <label className="account-checkbox"><input type="checkbox" disabled={form.isOwner||form.id===auth.user.id} checked={form.isAdmin} onChange={e=>setForm({...form,isAdmin:e.target.checked})}/> {uiT("Administrator — full access")}</label>
    {!form.isAdmin&&<label className="account-checkbox"><input type="checkbox" checked={Boolean(form.isManager)} onChange={e=>setForm({...form,isManager:e.target.checked})}/> {uiT('Manager - can assign tasks')}</label>}
<label>{uiT("HR role")}<select value={form.hrRole||''} onChange={e=>setForm({...form,hrRole:e.target.value})}><option value="">{uiT("No HR role")}</option><option value="admin">{uiT("HR administrator")}</option><option value="manager">{uiT("HR manager")}</option><option value="employee">{uiT("Employee self-service")}</option></select></label>
    {!form.isAdmin&&!form.isManager&&!['admin','manager'].includes(form.hrRole)&&<label>{uiT('Workspace access')}<select value={form.dataScope||'self'} onChange={event=>setForm({...form,dataScope:event.target.value})}><option value="self">{uiT('Personal workspace - own records only')}</option><option value="branch">{uiT('Team workspace - assigned branches')}</option></select><small>{uiT('Personal accounts see only their own sales, attendance, commissions and assigned tasks.')}</small></label>}
    <label>{uiT('Linked salesperson name')}<input list="account-salesperson-names" maxLength={120} value={form.salesPersonName||''} placeholder={form.name||uiT('Uses account name')} onChange={event=>setForm({...form,salesPersonName:event.target.value})}/><datalist id="account-salesperson-names">{salesPeople.map(name=><option key={name} value={name}/>)}</datalist><small>{uiT('Use the exact salesperson name on older invoices. New personal sales use the account ID.')}</small></label>
    <label>{uiT('Attendance branch')}<select required value={form.attendanceBranch||''} onChange={e=>setForm({...form,attendanceBranch:e.target.value})}><option value="">{uiT('Choose...')}</option>{branches.filter(branch=>form.isAdmin||form.branches==='all'||form.branches.includes(branch)).map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select><small>{uiT('Saving this account automatically links an HR employee to this branch.')}</small></label>
    <label className="account-checkbox"><input type="checkbox" disabled={form.isOwner||form.id===auth.user.id} checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> {uiT("Account active")}</label>
   </div>
   {!form.isAdmin&&<><h3>{uiT("Branch access")}</h3><label className="account-checkbox"><input type="checkbox" checked={form.branches==='all'} onChange={e=>setForm({...form,branches:e.target.checked?'all':[]})}/> {uiT("All branches, central stock, and unassigned records")}</label>
    {form.branches!=='all'&&<div className="branch-permissions">{branches.map(branch=><label className="account-checkbox" key={branch}><input type="checkbox" checked={form.branches.includes(branch)} onChange={e=>setForm({...form,branches:e.target.checked?[...form.branches,branch]:form.branches.filter(item=>item!==branch)})}/>{uiT(branch)}</label>)}</div>}
    <h3>{uiT("Page and action permissions")}</h3><div className="permission-shortcuts"><button type="button" className="secondary" onClick={()=>setForm({...form,permissions:Object.fromEntries(modules.map(page=>[page,{view:true,add:!readOnly.has(page)&&page!=='Payments',edit:!readOnly.has(page),delete:!readOnly.has(page)}]))})}>{uiT("Allow all")}</button><button type="button" className="secondary" onClick={()=>setForm({...form,permissions:normalizePermissions()})}>{uiT("Clear all")}</button></div>
    <div className="table-wrap"><table className="permissions-table"><thead><tr><th>{uiT("Page")}</th>{actions.map(action=><th key={action}>{uiT(action[0].toUpperCase() + action.slice(1))}</th>)}</tr></thead><tbody>{modules.map(page=><tr key={page}><th scope="row">{uiT(page)}</th>{actions.map(action=><td key={action}><input type="checkbox" aria-label={uiT(page+' '+action)} disabled={(page==='Payments'&&action==='add')||(action!=='view'&&!form.permissions[page].view)||(action!=='view'&&readOnly.has(page))} checked={Boolean(form.permissions[page][action])} onChange={e=>permission(page,action,e.target.checked)}/></td>)}</tr>)}</tbody></table></div>
    <p className="account-note">{uiT("Payments edit/delete permits receipt corrections or removal and updates the invoice paid amount and Treasury together. Treasury edit/delete also permits these linked payment actions. General invoice editing still requires Invoice List permissions.")}</p>
    <p className="account-note">{uiT('Work Orders view includes branch Eye Exams for prescription links and six-month reminders. Work Orders add/edit allows saving a new prescription through its work order, without granting general Eye Exam editing.')}</p>
    <p className="account-note">{uiT("Grant Customers view for customer names in work orders and invoices. Payments shares invoice data and payment history; Treasury shares branch invoices, payments, and credit notes for linked balances; Incentive shares invoice data; only administrators can manage commission items; Vendor Statement shares procurement data; Inventory and Check Before Order include transfers for stock deductions. Central lens matrices and records without a branch require all-branch access. Treasury has six sections per branch. HR roles control HR administration, assigned reports, and employee self-service. HR administrators can access confidential HR information across all branches; managers cannot view salaries or confidential documents.")}</p>
   </>}
   {error&&<p className="account-error" role="alert">{uiT(error)}</p>}
   <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setForm(null)}>{uiT("Cancel")}</button><button className="primary" disabled={busy}>{busy ? uiT('Saving…') : uiT('Save account')}</button></div>
  </form></div>}
 </section>;
}
export function MyAccount({hr}){
 useUiLanguage();
 const auth=useAuth(),[form,setForm]=useState({currentPassword:'',password:'',confirm:''}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[visible,setVisible]=useState({});
 const user=auth.user;
 const role=user.isOwner?'Owner':user.isAdmin?'Administrator':user.isManager?'Manager':'Staff';
 const initials=user.name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join('').toUpperCase();
 const branchNames=user.branches==='all'?null:Array.isArray(user.branches)?user.branches:[];
 async function submit(event){
  event.preventDefault();setError('');setNotice('');
  if(form.password!==form.confirm){setError('New passwords do not match.');return;}
  setBusy(true);
  try{await api('/api/auth/password','POST',form);setForm({currentPassword:'',password:'',confirm:''});setVisible({});setNotice('Password changed successfully. Other sessions have been signed out.');}
  catch(error){setError(error.message);}finally{setBusy(false);}
 }
 return <><div className="my-account-layout">
  <div className="my-account-summary">
   <section className="panel my-account-profile" aria-label={uiT('My account')}>
    <div className="my-account-profile-banner"/>
    <div className="my-account-profile-body">
     <div className="my-account-avatar" aria-hidden="true">{initials}</div>
     <span className="my-account-role"><ShieldCheck size={14}/>{uiT(role)}</span>
     <h2>{user.name}</h2><p className="my-account-email"><Mail size={16}/><span>{user.email}</span></p>
     <div className="my-account-detail"><span>{uiT('Status')}</span><strong><span className="status-dot"/>{uiT(user.active?'Active':'Disabled')}</strong></div>
     <div className="my-account-detail"><span>{uiT('Role')}</span><strong>{uiT(role)}</strong></div>
    </div>
   </section>
   <section className="panel my-account-access"><h3><Store size={18}/>{uiT('Branch access')}</h3><div className="my-account-branches">{branchNames===null?<span>{uiT('All branches')}</span>:branchNames.length?branchNames.map(branch=><span key={branch}>{uiT(branch)}</span>):<p className="muted">{uiT('No branches')}</p>}</div>{user.hrRole&&<div className="my-account-detail"><span>{uiT('HR role')}</span><strong>{uiT(user.hrRole==='admin'?'HR administrator':user.hrRole==='manager'?'HR manager':'Employee self-service')}</strong></div>}</section>
  </div>
  <section className="panel my-account-security" aria-labelledby="account-password-heading">
   <div className="panel-head"><div className="my-account-section-heading"><span className="my-account-security-icon"><LockKeyhole size={22}/></span><div><h2 id="account-password-heading">{uiT('Change password')}</h2><p>{uiT('Keep your account secure with a strong password.')}</p></div></div></div>
   <form className="password-form my-account-password-form" onSubmit={submit}>
    {['currentPassword','password','confirm'].map((key,index)=><label key={key} htmlFor={'account-'+key}>{uiT(['Current password','New password','Confirm new password'][index])}<div className="my-account-password-input"><input id={'account-'+key} required disabled={busy} type={visible[key]?'text':'password'} minLength={index?12:undefined} maxLength={128} autoComplete={index?'new-password':'current-password'} value={form[key]} aria-describedby={index?'account-password-help':undefined} onChange={event=>{setForm({...form,[key]:event.target.value});setError('');setNotice('');}}/><button type="button" className="icon-btn" disabled={busy} aria-label={uiT((visible[key]?'Hide password':'Show password'))+' ? '+uiT(['Current password','New password','Confirm new password'][index])} aria-pressed={Boolean(visible[key])} onClick={()=>setVisible(current=>({...current,[key]:!current[key]}))}>{visible[key]?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>)}
    <p className="my-account-password-help" id="account-password-help"><ShieldCheck size={16}/>{uiT('At least 12 characters.')}</p>
    {error&&<p className="account-error" role="alert">{uiT(error)}</p>}
    {notice&&<p className="account-success" role="status"><CheckCircle2 size={18}/>{uiT(notice)}</p>}
    <div className="my-account-form-footer"><button className="primary" disabled={busy}><LockKeyhole size={16}/>{uiT(busy?'Saving...':'Change password')}</button></div>
   </form>
  </section>
 </div>{auth.can('HR System')&&hr&&<div className="my-account-attendance"><AttendancePanel hr={hr} showHistory/></div>}</>;
}
