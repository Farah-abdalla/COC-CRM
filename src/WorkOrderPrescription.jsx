import React,{useEffect,useRef,useState} from 'react';
import {prepareExamImage} from './prescriptionImage';
import {examBranch} from './prescriptions';
import {cairoToday} from './taskDeadlines';
import {t,useLanguage} from './i18n';
export default function WorkOrderPrescription({form,setForm,exams,customers,onBusy}){
 useLanguage();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef(0);
 useEffect(()=>{return()=>{request.current++;onBusy(false);};},[]);
 useEffect(()=>{request.current++;setBusy(false);onBusy(false);},[form.customerId,form.branch]);
 const available=exams.filter(exam=>String(exam.customerId)===String(form.customerId)&&examBranch(exam,{customers})===form.branch);
 const selected=available.find(exam=>String(exam.id)===String(form.examId));
 const image=form.prescriptionUpload||selected?.examImage;
 async function upload(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  const token=++request.current;setBusy(true);onBusy(true);setError('');
  try{const image=await prepareExamImage(file);if(token===request.current)setForm(current=>({...current,prescriptionUpload:image,examId:''}));}
  catch(error){if(token===request.current)setError(error.message);}
  finally{if(token===request.current){setBusy(false);onBusy(false);}}
 }
 return <fieldset className="span-2"><legend>{t('Prescription / Eye Exam')}</legend><div className="form-grid">
  <label className="span-2">{t('Linked Eye Exam')}<select value={form.examId||''} disabled={busy} onChange={event=>{setError('');setForm({...form,examId:event.target.value,prescriptionUpload:null,prescriptionDate:''});}}><option value="">{t('No linked Eye Exam')}</option>{form.examId&&!selected&&<option value={form.examId}>{t('Choose a prescription matching this customer and branch')}</option>}{available.map(exam=><option key={exam.id} value={exam.id}>{exam.date} - {exam.examImage?.name||t('Eye Exam')}</option>)}</select></label>
  <label className="span-2">{t('Upload prescription')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!form.customerId||!form.branch} onChange={upload}/><small>{t('JPG, PNG, or WebP, up to 10 MB. Large images are resized for storage.')}</small></label>
  {busy&&<p role="status">{t('Preparing image...')}</p>}
  {form.prescriptionUpload&&<label>{t('Prescription date')}<input required type="date" max={cairoToday()} value={form.prescriptionDate||''} onChange={event=>setForm({...form,prescriptionDate:event.target.value})}/></label>}
  <p className="muted span-2">{t('Uploading saves a linked Eye Exam when you save the work order. Use the date written on the prescription. Branch reminders appear after six months.')}</p>
  {image?.dataUrl&&<div className="span-2"><details><summary>{t('View prescription')}</summary><img src={image.dataUrl} alt={t('Prescription image')} style={{maxWidth:'100%',maxHeight:360,objectFit:'contain'}}/></details><small>{image.name}</small>{form.prescriptionUpload&&<button type="button" className="secondary" onClick={()=>setForm({...form,prescriptionUpload:null,prescriptionDate:''})}>{t('Remove image')}</button>}</div>}
  {error&&<p className="account-error span-2" role="alert">{t(error)}</p>}
 </div></fieldset>;
}
