import test from 'node:test';
import assert from 'node:assert/strict';
import {sixMonthsAfter,prescriptionAlerts,prescriptionExam} from './prescriptions.js';
test('six-month prescription review uses calendar months and Cairo dates',()=>{
 assert.equal(sixMonthsAfter('2025-08-31'),'2026-02-28');
 assert.equal(sixMonthsAfter('2023-08-31'),'2024-02-29');
 assert.equal(sixMonthsAfter('2026-02-30'),'');
 const data={customers:[{id:1,branch:'A'}],orders:[],exams:[{id:'old',customerId:1,date:'2025-08-31'}]};
 const user={active:true,branches:['A']};
 assert.equal(prescriptionAlerts(data,user,new Date('2026-02-28T21:59:59Z')).length,0);
 assert.equal(prescriptionAlerts(data,user,new Date('2026-02-28T22:00:00Z')).length,1);
 assert.equal(prescriptionAlerts(data,{...user,branches:['B']},new Date('2026-03-01')).length,0);
 data.exams.push({id:'new',customerId:1,branch:'A',date:'2026-02-01'});
 assert.equal(prescriptionAlerts(data,user,new Date('2026-03-01')).length,0);
 data.exams.push({id:'branch-b',customerId:1,branch:'B',date:'2025-01-01'});
 assert.deepEqual(prescriptionAlerts(data,{...user,isAdmin:true},new Date('2026-03-01')).map(exam=>exam.id),['branch-b']);
});
test('upload uses actual prescription date and rejects invalid images or future dates',()=>{
 const order={id:'wo',customerId:1,branch:'A'},image={name:'rx.jpg',dataUrl:'data:image/jpeg;base64,YQ=='};
 assert.equal(prescriptionExam(order,image,'2025-08-31','staff','rx',new Date('2026-03-01')).date,'2025-08-31');
 assert.throws(()=>prescriptionExam(order,image,'2026-03-02','staff','rx',new Date('2026-03-01')),/actual prescription date/);
 assert.throws(()=>prescriptionExam(order,{...image,dataUrl:'javascript:alert(1)'},'2025-08-31','staff','rx'),/image/);
 assert.throws(()=>prescriptionExam({...order,branch:''},image,'2025-08-31','staff','rx'),/customer and branch/);
});
