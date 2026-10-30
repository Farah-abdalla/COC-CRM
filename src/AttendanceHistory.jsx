import React from 'react';
import {t,useLanguage,getLocale} from './i18n';
import {businessTimeZone,historyRecords,totalWorkingTime} from './attendanceHistoryData.js';
const columns=['Employee Name','Employee ID','Check-in Location','Attendance Date','Check-in Time','Check-out Location','Check-out Time','Total Working Time','Attendance Status'];
function locationLabel(point){return point?point.address||point.latitude.toFixed(6)+', '+point.longitude.toFixed(6):t('Not recorded');}
export default function AttendanceHistory({records,employees,employeeIds,emptyMessage}){
 useLanguage();
 const rows=historyRecords(records,employeeIds),time=timestamp=>new Date(timestamp).toLocaleTimeString(getLocale(),{timeZone:businessTimeZone,timeStyle:'medium'});
 return <div className="attendance-history">
  <h3>{t('Attendance history')}</h3><p className="muted">{t('All saved attendance sessions are shown. Times use Cairo time.')}</p>
  <div className="table-wrap"><table aria-label={t('Attendance history')}><thead><tr>{columns.map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{rows.map(row=>{
   const employee=employees.find(employee=>employee.id===row.employeeId),duration=totalWorkingTime(row),completed=Boolean(row.checkOut);
   return <tr key={row.id} data-attendance-id={row.id}><td>{row.employeeName||employee?.name||t('Employee')}</td><td>{row.employeeCode||employee?.employeeCode||row.employeeId}</td><td className="attendance-history-location">{locationLabel(row.checkInLocation)}</td><td>{row.date}</td><td><time dateTime={row.checkIn}>{time(row.checkIn)}</time></td><td className="attendance-history-location">{completed?locationLabel(row.checkOutLocation):'--'}</td><td>{completed?<time dateTime={row.checkOut} title={new Date(row.checkOut).toLocaleString(getLocale(),{timeZone:businessTimeZone})}>{time(row.checkOut)}</time>:'--'}</td><td>{duration?<span title={duration.minutes.toFixed(2)+' '+t('minutes')}>{duration.hours}{t('h')} {String(duration.minutePart).padStart(2,'0')}{t('m')}</span>:'--'}</td><td><span className={'status '+(completed?'completed':'in-progress')}>{t(completed?'Completed':'In Progress')}</span>{row.source==='administrator_correction'&&<small>{t('Administrator correction')}</small>}</td></tr>;
  })}</tbody></table></div>
  {!rows.length&&<p className="access-notice" role="status">{t(emptyMessage||'No attendance has been saved yet. Complete Check In to create your attendance record.')}</p>}
 </div>;
}
