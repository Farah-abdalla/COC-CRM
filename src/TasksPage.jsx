import React,{useState} from 'react';
import {taskStatus,canCompleteTask} from './taskDeadlines';
import {Plus,X} from 'lucide-react';
import {api,useAuth} from './Auth';
import {t,useLanguage} from './i18n';
export default function TasksPage({records=[],branches=[],onSave,onComplete,now,storage}){
 useLanguage();
 const auth=useAuth(),[form,setForm]=useState(null),[employees,setEmployees]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function open(){setLoading(true);setError('');try{const result=await api('/api/task-employees');setEmployees(result.employees);setForm({title:'',description:'',assigneeId:'',branch:'',dueDate:''});}catch(error){setError(error.message);}finally{setLoading(false);}}
 const employee=employees.find(person=>person.id===form?.assigneeId);
 const availableBranches=employee?(employee.branches==='all'?branches:branches.filter(branch=>employee.branches.includes(branch))):[];
 function submit(event){event.preventDefault();setError('');if(!employee){setError('Choose an employee.');return;}const task={...form,title:form.title.trim(),description:form.description.trim(),id:crypto.randomUUID(),assigneeName:employee.name,createdBy:auth.user.id,createdAt:new Date().toISOString(),status:'Pending'};if(onSave(task)){setForm(null);}else setError('The task could not be added. Check the storage status.');}
 return <section className="panel">
  <div className="panel-head"><div><h2>{t('Tasks')}</h2><p>{t(auth.can('Tasks','add')?'Assign tasks to employees by name.':'Tasks assigned to you.')}</p></div>{auth.can('Tasks','add')&&<button className="primary" disabled={loading||storage.conflict} onClick={open}><Plus size={17}/>{t(loading?'Loading...':'Add task')}</button>}</div>
  <p className="muted">{t('Deadlines run until the end of the selected day (Cairo time). Overdue task alerts appear in the assigner’s notification bell while signed in.')}</p>
  <p className="muted">{t("Task status changes automatically from Pending to Missed after the deadline (Cairo time). Employees can select Done for their own tasks.")}</p>
  <p className="muted" role="status">{t(storage.status)}</p>{storage.error&&<p className="account-error" role="alert">{t(storage.error)}</p>}{error&&!form&&<p className="account-error" role="alert">{t(error)}</p>}
  <div className="table-wrap"><table><thead><tr>{['Task','Employee','Branch','Deadline','Status'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{[...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(task=><tr key={task.id}><td><b>{task.title}</b>{task.description&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{task.description}</p>}</td><td>{task.assigneeName}</td><td>{t(task.branch)}</td><td>{task.dueDate||'—'}</td><td>{canCompleteTask(auth.user,task)?<select aria-label={t('Task status')+': '+task.title} value={taskStatus(task,now)} disabled={storage.conflict} onChange={event=>{if(event.target.value==='Done'){setError('');if(!onComplete(task))setError('The task could not be completed. Check the storage status.');}}}><option value={taskStatus(task,now)}>{t(taskStatus(task,now))}</option><option value="Done">{t('Done')}</option></select>:<span>{t(taskStatus(task,now))}</span>}</td></tr>)}</tbody></table></div>
  {!records.length&&<p className="muted">{t('No tasks yet.')}</p>}
  {form&&<div className="modal-backdrop" onKeyDown={event=>{if(event.key==='Escape')setForm(null);}}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="task-title" onSubmit={submit}><div className="modal-head"><h2 id="task-title">{t('Add task')}</h2><button type="button" className="icon-btn" aria-label={t('Close task form')} onClick={()=>setForm(null)}><X/></button></div>
   <div className="form-grid"><label className="span-2">{t('Task title')}<input autoFocus required maxLength={160} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>{t('Employee')}<select required value={form.assigneeId} onChange={e=>setForm({...form,assigneeId:e.target.value,branch:''})}><option value="">{t('Choose employee')}</option>{employees.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    <label>{t('Branch')}<select required value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}><option value="">{t('Choose branch')}</option>{availableBranches.map(branch=><option key={branch} value={branch}>{t(branch)}</option>)}</select></label>
    <label>{t('Deadline')}<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
    <label className="span-2">{t('Description')}<textarea rows={3} maxLength={2000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
   </div>{!employees.length&&<p className="muted">{t('No active employees in your assigned branches. Ask an administrator to add employee accounts.')}</p>}{error&&<p className="account-error" role="alert">{t(error)}</p>}
   <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setForm(null)}>{t('Cancel')}</button><button className="primary" disabled={!employees.length||!form.title.trim()}>{t('Save task')}</button></div>
  </form></div>}
 </section>;
}
