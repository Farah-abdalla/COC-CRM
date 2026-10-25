import test from 'node:test';
import assert from 'node:assert/strict';
import {saveBrowserSnapshot} from './browserStorage.js';
function storage(failKey){const values=new Map([['opticrm_customers','[{"id":1}]'],['opticrm_exams','[]']]);let failed=false;return {values,getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem(key,value){if(key===failKey&&!failed){failed=true;throw Error('Storage quota exceeded');}values.set(key,value);}};}
test('browser saves preserve untouched records and persist matrix edits',()=>{
 const db=storage(),previous={data:{customers:[{id:1}],exams:[]},matrixEdits:{}};
 const next={data:{...previous.data,customers:[{id:1},{id:2}]},matrixEdits:{HMC:{'0:0':9}}};
 saveBrowserSnapshot(db,next,previous);
 assert.equal(JSON.parse(db.values.get('opticrm_customers')).length,2);
 assert.deepEqual(JSON.parse(db.values.get('opticrm_inventoryMatrices')),next.matrixEdits);
 assert.equal(db.values.get('opticrm_exams'),'[]');
});
test('a full browser store rolls back partially written records',()=>{
 const db=storage('opticrm_exams'),before=new Map(db.values);
 const previous={data:{customers:[{id:1}],exams:[]},matrixEdits:{}};
 assert.throws(()=>saveBrowserSnapshot(db,{data:{customers:[{id:2}],exams:[{id:3}]},matrixEdits:{}},previous));
 assert.deepEqual(db.values,before);
});
