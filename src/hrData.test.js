import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceMetrics,attendanceReport,leaveBalance,workingDates,dateRange,expirationAlerts,validDate} from './hrData.js';
const employee={id:'e',name:'Worker',hireDate:'2026-01-01',branch:'Nasr City',status:'Active',shiftStart:'09:00',workDays:[0,1,2,3,4],leaveAllowances:{annual:21}};
test('HR validates dates and calculates scheduled working days across year boundaries',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2028-02-29'),true);
 assert.throws(()=>dateRange('2026-10-10','2026-10-01'));
 assert.throws(()=>dateRange('2026-01-01','2028-01-01'));
 assert.deepEqual(workingDates('2026-12-31','2027-01-03'),['2026-12-31','2027-01-03']);
});
test('leave reserves pending days, releases rejected days and keeps historical charged dates',()=>{
 const leaves=[{employeeId:'e',typeId:'annual',start:'2026-12-31',end:'2027-01-03',workDates:['2026-12-31','2027-01-03'],status:'Pending'}];
 assert.deepEqual(leaveBalance(employee,'annual',leaves,2026,[]),{allowance:21,used:1,remaining:20});
 assert.equal(leaveBalance({...employee,workDays:[5]},'annual',leaves,2027,[]).used,1);
 leaves[0].status='Rejected';assert.equal(leaveBalance(employee,'annual',leaves,2026,[]).used,0);
});
test('attendance uses Cairo lateness, frozen shift starts, and hours across midnight',()=>{
 const row={checkIn:'2026-01-04T07:15:00Z',checkOut:'2026-01-04T15:45:00Z',shiftStart:'09:00'};
 assert.deepEqual(attendanceMetrics(row,{...employee,shiftStart:'12:00'}),{hours:8.5,lateMinutes:15});
 assert.equal(attendanceMetrics({checkIn:'2026-01-04T21:00:00Z',checkOut:'2026-01-05T05:00:00Z'},employee).hours,8);
});
test('daily and monthly absences exclude days off, approved leave, future dates and prehire dates',()=>{
 const attendance=[{employeeId:'e',date:'2026-01-04',checkIn:'2026-01-04T07:15:00Z',checkOut:'2026-01-04T15:15:00Z'}];
 const leaves=[{employeeId:'e',start:'2026-01-05',end:'2026-01-05',status:'Approved'}];
 const [report]=attendanceReport([employee],attendance,leaves,'2026-01-01','2026-01-31',new Date('2026-01-06T10:00:00Z'));
 assert.equal(report.present,1);assert.equal(report.late,1);assert.equal(report.hours,8);assert.deepEqual(report.absentDates,['2026-01-01','2026-01-06']);
 assert.equal(attendanceReport([employee],[],[], '2026-01-06','2026-01-06',new Date('2026-01-06T05:00:00Z'))[0].absent,0);
 const inactive={...employee,status:'Inactive',endDate:'2026-01-06'};
 assert.equal(attendanceReport([inactive],[],[],'2026-01-01','2026-01-31',new Date('2026-02-01T10:00:00Z'))[0].absent,3);
});
test('expiration alerts include actual contracts and documents, excluding archived or distant files',()=>{
 const alerts=expirationAlerts([{...employee,contractEnd:'2026-10-30'}],[{id:'a',employeeId:'e',name:'ID',expires:'2026-10-01'},{id:'b',employeeId:'e',expires:'2027-01-01'},{id:'c',employeeId:'e',expires:'2026-10-29',archived:true}],'2026-10-28');
 assert.deepEqual(alerts.map(a=>a.id),['document-a','contract-e']);
});


test('monthly employee hours sum completed shifts, exclude open shifts and use Cairo clock-in months',async()=>{
 const {monthlyWorkedHours}=await import('./hrData.js');
 const other={...employee,id:'other',employeeCode:'OTHER',name:'Other Worker'},zero={...employee,id:'zero',name:'No shifts'};
 const rows=[
  {employeeId:'e',checkIn:'2026-01-02T07:00:00Z',checkOut:'2026-01-02T15:30:00Z'},
  {employeeId:'e',checkIn:'2026-01-03T07:00:00Z',checkOut:'2026-01-03T14:45:00Z'},
  {employeeId:'e',checkIn:'2026-01-31T20:00:00Z',checkOut:'2026-02-01T04:00:00Z'},
  {employeeId:'e',checkIn:'2026-01-04T07:00:00Z',checkOut:''},
  {employeeId:'e',checkIn:'2026-01-31T23:00:00Z',checkOut:'2026-02-01T00:00:00Z'},
  {employeeId:'other',checkIn:'2026-01-03T07:00:00Z',checkOut:'2026-01-03T09:00:00Z'},
  {employeeId:'hidden',checkIn:'2026-01-03T07:00:00Z',checkOut:'2026-01-03T15:00:00Z'}
 ];
 const [first,second,empty]=monthlyWorkedHours([employee,other,zero],rows,'2026-01');
 assert.equal(first.hours,24.25);assert.equal(first.wholeHours,24);assert.equal(first.minutePart,15);assert.equal(first.completedShifts,3);assert.equal(first.openShifts,1);
 assert.equal(second.hours,2);assert.equal(empty.hours,0);assert.equal(empty.completedShifts,0);
 assert.equal(monthlyWorkedHours([employee],rows,'2026-02')[0].hours,1);
 assert.equal(monthlyWorkedHours([other],rows,'2026-01').length,1,'Branch-scoped employees remain scoped');
 for(const month of ['2026-13','2026-00','2026-1','bad'])assert.throws(()=>monthlyWorkedHours([employee],rows,month));
});
test('monthly hours aggregate exact timestamps before rounding the displayed minutes',async()=>{
 const {monthlyWorkedHours}=await import('./hrData.js');
 const rows=[1,2].map(day=>({employeeId:'e',checkIn:'2026-01-0'+day+'T07:00:00Z',checkOut:'2026-01-0'+day+'T07:00:30Z'}));
 const [total]=monthlyWorkedHours([employee],rows,'2026-01');assert.equal(total.minutes,1);assert.equal(total.minutePart,1);assert.equal(total.hours,1/60);
});
