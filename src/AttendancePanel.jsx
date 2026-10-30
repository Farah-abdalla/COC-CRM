import React,{useEffect,useRef,useState} from 'react';
import {MapPin,Clock,LogIn,LogOut,Fingerprint} from 'lucide-react';

import {t,useLanguage,getLocale} from './i18n';
import {cairoToday,attendanceMetrics} from './hrData';
import {totalWorkingTime} from './attendanceHistoryData.js';
import {currentAttendanceLocation} from './attendanceLocation';
import './hr.css';
import AttendanceHistory from './AttendanceHistory.jsx';
export default function AttendancePanel({hr,showHistory=false}){
 useLanguage();
 const [expanded,setExpanded]=useState(false),[location,setLocation]=useState(null),[pending,setPending]=useState(false),[phase,setPhase]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[now,setNow]=useState(()=>new Date());
 const working=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!expanded)return;const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer);},[expanded]);
 const userId=hr.result?.userId;
 const own=hr.result?.data.employees.find(employee=>employee.userId===userId);
 const rows=own?hr.result.data.attendance.filter(row=>row.employeeId===own.id):[];
 const open=rows.find(row=>!row.checkOut),today=rows.filter(row=>row.date===cairoToday(now)).sort((a,b)=>b.checkIn.localeCompare(a.checkIn))[0],current=open||today||rows.slice().sort((a,b)=>b.checkIn.localeCompare(a.checkIn))[0];
 const clockedOutToday=rows.some(row=>row.checkOut&&cairoToday(new Date(row.checkOut))===cairoToday(now));
 const dailyComplete=!open&&(Boolean(today)||clockedOutToday);
 const busy=pending||hr.busy||hr.loading;
 async function act(action){
  if(working.current||busy||!own||(action==='attendance.checkin'&&(open||dailyComplete))||(action==='attendance.checkout'&&(!open||clockedOutToday)))return;working.current=true;setPending(true);setError('');setNotice('');setLocation(null);
  try{
   setPhase('Detecting location...');
   const next=await currentAttendanceLocation();if(!mounted.current)return;setLocation(next);setPhase('Saving attendance...');
   // No account ID or timestamp is submitted. The server derives identity and time.
   const saved=await hr.save(action,{location:next});
   if(saved&&mounted.current){setNow(new Date());setNotice(action==='attendance.checkin'?'Check In saved with your current location.':'Check Out saved. Total working minutes calculated by the server.');}
  }catch(error){if(mounted.current)setError(error.message);}
  finally{working.current=false;if(mounted.current){setPending(false);setPhase('');}}
 }
 const duration=current?.checkOut?totalWorkingTime(current):null;
 const time=value=>value?new Date(value).toLocaleString(getLocale(),{timeZone:'Africa/Cairo',dateStyle:'medium',timeStyle:'medium'}):'--';
 return <section className="panel attendance-self-service" aria-label={t('Attendance')} aria-busy={busy||!hr.result} data-hr-revision={hr.result?.revision}>
  <div className="panel-head"><div><h2><Clock size={20}/>{t('Attendance')}</h2><p>{own?own.name+' · '+t(own.branch):t('Record your location and working hours.')}</p></div><button type="button" className={'attendance-fingerprint '+(open?'is-clocked-in':'')} aria-label={t('Open clock in and clock out')} aria-expanded={expanded} disabled={busy||!hr.result} onClick={()=>setExpanded(value=>!value)}><Fingerprint size={38} aria-hidden="true"/></button></div>
  {!hr.result&&hr.error&&<div className="attendance-self-service-body"><p className="account-error" role="alert">{t(hr.error)}</p><button className="secondary" type="button" disabled={hr.loading} onClick={()=>hr.refresh()}>{t('Reload HR')}</button></div>}
  {expanded&&<div className="attendance-self-service-body">
   <p className="muted">{t('Check In and Check Out automatically capture your current location. Times use Cairo time.')}</p>
   {pending&&<p role="status">{t(phase)}</p>}
   {location&&<p className="attendance-location" role="status"><MapPin size={16}/><span>{t('Current location')}: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} / {t('Accuracy')}: {Math.round(location.accuracy)} m</span></p>}
   {error&&<p className="account-error" role="alert">{t(error)} <button className="text-btn" type="button" disabled={busy} onClick={()=>setError('')}>{t('Retry')}</button></p>}
   {hr.error&&<p className="account-error" role="alert">{t(hr.error)}</p>}
   {notice&&<p className="account-success" role="status">{t(notice)}</p>}
   {!hr.result?<button type="button" className="secondary" disabled={busy} onClick={()=>hr.refresh()}>{t('Reload HR')}</button>:!own?<div className="access-notice"><p>{t('No employee profile is linked to your account. Ask an HR administrator to use Employees > Link account and select your account email.')}</p><button type="button" className="secondary" disabled={busy} onClick={()=>hr.refresh()}>{t('Refresh account link')}</button></div>:<>
    <p className="attendance-clock-status">{t(open?'Clocked in':dailyComplete?'Attendance completed for today':'Ready to clock in')} · {now.toLocaleTimeString(getLocale(),{timeZone:'Africa/Cairo',timeStyle:'medium'})}</p><div className="attendance-time-grid"><div><span>{t('Clock In')}</span><strong>{time(current?.checkIn)}</strong>{current&&<small>{t('Location')}: {current.checkInLocation?current.checkInLocation.latitude.toFixed(6)+', '+current.checkInLocation.longitude.toFixed(6):t('Not recorded')}</small>}</div><div><span>{t('Clock Out')}</span><strong title={current?.checkOut?time(current.checkOut):undefined}>{current?.checkOut?new Date(current.checkOut).toLocaleTimeString(getLocale(),{timeZone:'Africa/Cairo',timeStyle:'medium'}):'--'}</strong>{current?.checkOutLocation&&<small>{t('Location')}: {current.checkOutLocation.latitude.toFixed(6)}, {current.checkOutLocation.longitude.toFixed(6)}</small>}</div><div className="attendance-worked-total"><span>{t('Total Hours Worked')}</span><output>{duration?duration.hours+t('h')+' '+String(duration.minutePart).padStart(2,'0')+t('m'):open?attendanceMetrics(open,own,now).hours.toFixed(2)+' '+t('hours'):'--'}</output><small>{t('Total hours = Clock Out - Clock In')}</small>{current?.checkOut&&<small>{t('Total working minutes')}: {Number(current.totalWorkingMinutes).toLocaleString(getLocale(),{maximumFractionDigits:2})}</small>}{open&&<small>{t('In progress')}: {attendanceMetrics(open,own,now).hours.toFixed(2)} {t('hours')}</small>}</div></div>
    {dailyComplete&&<p className="account-success" role="status">{t('One clock-in and one clock-out per day. You can clock in again on the next Cairo calendar day.')}</p>}
    <div className="hr-actions"><button type="button" className="primary" disabled={busy||own.status!=='Active'||Boolean(open)||dailyComplete} onClick={()=>act('attendance.checkin')}><LogIn size={16}/>{t('Clock In')}</button><button type="button" className="secondary" disabled={busy||!open||clockedOutToday} onClick={()=>act('attendance.checkout')}><LogOut size={16}/>{t('Clock Out')}</button></div>
   </>}
   {showHistory&&hr.result&&<AttendanceHistory records={rows} employees={hr.result.data.employees}/>}
  </div>}
 </section>;
}
