import test from 'node:test';
import assert from 'node:assert/strict';
import {cairoToday,isTaskOverdue,overdueTaskNotifications,taskStatus,canCompleteTask} from './taskDeadlines.js';
test('deadline lasts through Cairo day and alerts only its assigner until done',()=>{
 const task={id:'task',createdBy:'manager',dueDate:'2026-01-10',status:'Pending'};
 assert.equal(cairoToday(new Date('2026-01-10T21:59:59Z')),'2026-01-10');
 assert.equal(isTaskOverdue(task,new Date('2026-01-10T21:59:59Z')),false);
 const after=new Date('2026-01-10T22:00:00Z');
 assert.equal(isTaskOverdue(task,after),true);
 assert.equal(overdueTaskNotifications([task],'manager',after).length,1);
 assert.equal(overdueTaskNotifications([task],'other',after).length,0);
 assert.equal(overdueTaskNotifications([{...task,status:'Done'}],'manager',after).length,0);
 assert.equal(isTaskOverdue({...task,dueDate:''},after),false);
 assert.equal(cairoToday(new Date('2026-07-10T21:00:00Z')),'2026-07-11');
});

test('employee task status becomes Missed after deadline and can still be completed',()=>{
 const task={status:'Pending',assigneeId:'employee',dueDate:'2026-01-10'};
 const before=new Date('2026-01-10T21:59:59Z'),after=new Date('2026-01-10T22:00:00Z');
 assert.equal(taskStatus(task,before),'Pending');
 assert.equal(taskStatus(task,after),'Missed');
 assert.equal(taskStatus({...task,dueDate:''},after),'Pending');
 assert.equal(canCompleteTask({id:'employee',active:true},task),true);
 assert.equal(canCompleteTask({id:'other',active:true},task),false);
 assert.equal(taskStatus({...task,status:'Done'},after),'Done');
 assert.equal(canCompleteTask({id:'employee',active:true},{...task,status:'Done'}),false);
});
