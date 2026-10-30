import {cairoToday} from './taskDeadlines.js';
export function validPrescriptionDate(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export function sixMonthsAfter(value){
 if(!validPrescriptionDate(value))return '';
 const [year,month,day]=value.split('-').map(Number),target=new Date(Date.UTC(year,month-1+6,1));
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(day,last));return target.toISOString().slice(0,10);
}
export function examBranch(exam,data){
 return exam.branch||data.orders?.find(order=>String(order.id)===String(exam.workOrderId))?.branch||data.customers?.find(customer=>String(customer.id)===String(exam.customerId))?.branch||'';
}
export function prescriptionAlerts(data,user,now=new Date()){
 const latest=new Map(),today=cairoToday(now);
 for(const exam of data.exams||[]){
  const branch=examBranch(exam,data);
  if(!branch||!validPrescriptionDate(exam.date)||exam.date>today||(!user.isAdmin&&user.branches!=='all'&&!user.branches?.includes(branch)))continue;
  const key=JSON.stringify([String(exam.customerId),branch]),previous=latest.get(key);
  if(!previous||exam.date>previous.date)latest.set(key,{...exam,branch});
 }
 return [...latest.values()].filter(exam=>sixMonthsAfter(exam.date)<today).map(exam=>({...exam,reviewDate:sixMonthsAfter(exam.date)}));
}
export function validPrescriptionImage(image){
 return Boolean(image&&typeof image.name==='string'&&image.name.length<=255&&typeof image.dataUrl==='string'&&image.dataUrl.length<=1500000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl));
}
export function prescriptionExam(order,image,date,userId,id,now=new Date()){
 if(!order.customerId||!order.branch)throw new Error('Choose a customer and branch before uploading a prescription.');
 if(!validPrescriptionDate(date)||date>cairoToday(now))throw new Error('Enter the actual prescription date, today or earlier.');
 if(!validPrescriptionImage(image))throw new Error('Choose a valid prescription image.');
 return {id,customerId:order.customerId,branch:order.branch,workOrderId:order.id,date,examImage:image,source:'work-order',uploadedBy:userId,notes:''};
}
export function isLinkedPrescriptionUpload(exam,incoming,current,user){
 if(exam.source!=='work-order'||exam.uploadedBy!==user.id)return false;
 const fields=['id','customerId','branch','workOrderId','date','examImage','source','uploadedBy','notes'];
 if(Object.keys(exam).some(key=>!fields.includes(key)))return false;
 const order=incoming.data.orders.find(order=>String(order.id)===String(exam.workOrderId));
 if(!order||String(order.examId)!==String(exam.id)||String(order.customerId)!==String(exam.customerId)||order.branch!==exam.branch)return false;
 const old=current.data.orders.find(item=>String(item.id)===String(order.id));
 if(old&&JSON.stringify(old)===JSON.stringify(order))return false;
 return true;
}
