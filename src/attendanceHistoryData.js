import {attendanceDurationMinutes} from './attendanceDuration.js';
export const businessTimeZone='Africa/Cairo';
export function historyRecords(records,employeeIds){
 return records.filter(row=>!employeeIds||employeeIds.has(row.employeeId)).slice().sort((a,b)=>Date.parse(b.checkIn)-Date.parse(a.checkIn));
}
export function totalWorkingTime(row){
 if(!row.checkOut)return null;
 const minutes=attendanceDurationMinutes(row.checkIn,row.checkOut);
 const seconds=Math.floor(Math.round(minutes*60000)/1000);
 return {minutes,hours:Math.floor(seconds/3600),minutePart:Math.floor(seconds%3600/60),seconds:seconds%60};
}
