import {attendanceDurationMinutes} from './attendanceDuration.js';
﻿import {cairoToday} from './taskDeadlines.js';
export {cairoToday};
export const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
export function dateRange(start,end){
 if(!validDate(start)||!validDate(end)||end<start)throw new Error('Choose a valid date range.');
 const count=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
 if(count>366)throw new Error('Choose a range of at most one year.');
 return Array.from({length:count},(_,i)=>new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10));
}
export const workingDates=(start,end,workDays=[0,1,2,3,4])=>dateRange(start,end).filter(day=>workDays.includes(new Date(day+'T12:00:00Z').getUTCDay()));
export function cairoMinutes(instant){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));return Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);}
export function attendanceMetrics(row,employee,now=new Date()){
 const shift=row.shiftStart||employee.shiftStart||'09:00',start=Number(shift.slice(0,2))*60+Number(shift.slice(3));
 return {hours:Math.max(0,(Date.parse(row.checkOut||now.toISOString())-Date.parse(row.checkIn))/3600000),lateMinutes:Math.max(0,cairoMinutes(row.checkIn)-start)};
}
export function leaveBalance(employee,type,leaves,year,types){
 const allowance=Number(employee.leaveAllowances?.[type]??types.find(t=>t.id===type)?.allowance??0);
 const consumed=leaves.filter(l=>l.employeeId===employee.id&&l.typeId===type&&['Pending','Approved'].includes(l.status)).reduce((sum,l)=>sum+(l.workDates||workingDates(l.start,l.end,employee.workDays)).filter(d=>d.startsWith(String(year))).length,0);
 return {allowance,used:consumed,remaining:allowance-consumed};
}
export function attendanceReport(employees,attendance,leaves,start,end,now=new Date()){
 const today=cairoToday(now),days=dateRange(start,end).filter(d=>d<=today);
 return employees.filter(e=>(e.hireDate<=end&&(e.status!=='Inactive'||!e.endDate||e.endDate>=start))||attendance.some(a=>a.employeeId===e.id&&a.date>=start&&a.date<=end)).map(employee=>{
  const rows=attendance.filter(a=>a.employeeId===employee.id&&a.date>=start&&a.date<=end);
  const expected=days.filter(day=>day>=employee.hireDate&&(!employee.endDate||day<employee.endDate)&&(employee.workDays||[0,1,2,3,4]).includes(new Date(day+'T12:00:00Z').getUTCDay()));
  const absent=expected.filter(day=>(day<today||cairoMinutes(now)>=Number((employee.shiftStart||'09:00').slice(0,2))*60+Number((employee.shiftStart||'09:00').slice(3)))&&!rows.some(a=>a.date===day)&&!leaves.some(l=>l.employeeId===employee.id&&l.status==='Approved'&&l.start<=day&&l.end>=day));
  return {employeeId:employee.id,name:employee.name,branch:employee.branch,departmentId:employee.departmentId,present:new Set(rows.map(row=>row.date)).size,absent:absent.length,absentDates:absent,hours:rows.reduce((s,r)=>s+attendanceMetrics(r,employee,now).hours,0),late:new Set(rows.filter(r=>attendanceMetrics(r,employee,now).lateMinutes>0).map(r=>r.date)).size};
 });
}
export function expirationAlerts(employees,documents,today=cairoToday()){
 const end=new Date(Date.parse(today)+30*86400000).toISOString().slice(0,10);
 return [...employees.filter(e=>e.status==='Active'&&e.contractEnd&&e.contractEnd<=end).map(e=>({id:'contract-'+e.id,employeeId:e.id,title:e.name+' — contract',date:e.contractEnd})),...documents.filter(d=>!d.archived&&d.expires&&d.expires<=end).map(d=>({id:'document-'+d.id,employeeId:d.employeeId,title:d.name,date:d.expires}))].sort((a,b)=>a.date.localeCompare(b.date));
}

// Completed shifts belong to the Cairo month in which they clocked in.
export function monthlyWorkedHours(employees,attendance,month){
 if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))throw new Error('Choose a valid month.');
 const totals=new Map(employees.map(employee=>[employee.id,{employeeId:employee.id,employeeCode:employee.employeeCode||'',name:employee.name,branch:employee.branch,completedShifts:0,openShifts:0,minutes:0}]));
 for(const row of attendance){
  const total=totals.get(row.employeeId);
  if(!total||cairoToday(new Date(row.checkIn)).slice(0,7)!==month)continue;
  if(!row.checkOut){total.openShifts++;continue;}
  total.minutes+=attendanceDurationMinutes(row.checkIn,row.checkOut);
  total.completedShifts++;
 }
 return [...totals.values()].map(total=>{const wholeMinutes=Math.floor(Math.round(total.minutes*60000)/60000);return {...total,hours:total.minutes/60,wholeHours:Math.floor(wholeMinutes/60),minutePart:wholeMinutes%60};});
}
