export function cairoToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=type=>parts.find(part=>part.type===type).value;
 return value('year')+'-'+value('month')+'-'+value('day');
}
export const isTaskOverdue=(task,now=new Date())=>Boolean(task.dueDate&&task.status!=='Done'&&task.dueDate<cairoToday(now));
export const overdueTaskNotifications=(tasks,userId,now=new Date())=>tasks.filter(task=>task.createdBy===userId&&isTaskOverdue(task,now));
export const canCompleteTask=(user,task)=>Boolean(user?.active&&task.status==='Pending'&&(user.isAdmin||user.isManager||task.assigneeId===user.id));

export const taskStatus=(task,now=new Date())=>task.status==='Done'?'Done':isTaskOverdue(task,now)?'Missed':'Pending';
