import test from 'node:test';
import assert from 'node:assert/strict';
import { getTransferTotals, getAvailableMatrixEdits, getAvailableInventoryItems, prepareStockTransfer } from './transferData.js';
const category='HMC 1.56 Minus';
const matrices={[category]:{rows:['0.00','-0.25'],columns:['0.00','-0.50'],values:[[10,null],[3,4]]}};
const branches=['Branch 1','Branch 2','Branch 3','Branch 4','Branch 5'];
const form={sourceType:'matrix',category,row:'0',column:'0',toBranch:branches[0],date:'2026-10-24',quantity:'2'};
const available=transfers=>getAvailableMatrixEdits({},getTransferTotals(transfers),matrices);
test('sending to five branches reduces stock once and survives reload',()=>{
 const transfers=[];
 for(const branch of branches){const record=prepareStockTransfer({...form,toBranch:branch},branches,available(transfers),[],matrices);transfers.push({...record,id:branch});}
 assert.equal(available(transfers)[category]['0:0'],0);
 const restored=JSON.parse(JSON.stringify(transfers));
 assert.equal(available(restored)[category]['0:0'],0);
 assert.equal(matrices[category].values[0][0],10);
 assert.equal(transfers.reduce((sum,record)=>sum+record.quantity,0),10);
 assert.throws(()=>prepareStockTransfer(form,branches,available(restored),[],matrices),/Only 0/);
});
test('transfers validate quantities, destination, source, prescription, and date',()=>{
 for(const quantity of ['0','-1','1.5','NaN','11'])assert.throws(()=>prepareStockTransfer({...form,quantity},branches,{},[],matrices));
 assert.throws(()=>prepareStockTransfer({...form,toBranch:'Missing'},branches,{},[],matrices),/destination/);
 assert.throws(()=>prepareStockTransfer({...form,row:''},branches,{},[],matrices),/SPH/);
 assert.throws(()=>prepareStockTransfer({...form,row:'99'},branches,{},[],matrices),/valid stock/);
 assert.throws(()=>prepareStockTransfer({...form,date:''},branches,{},[],matrices),/date/);
 assert.throws(()=>prepareStockTransfer({...form,sourceType:'unknown'},branches,{},[],matrices),/stock source/);
 assert.throws(()=>prepareStockTransfer({...form,column:'1',quantity:1},branches,{},[],matrices),/Only 0/);
});
test('later transfers check the remaining quantity',()=>{
 const first=prepareStockTransfer({...form,quantity:7},branches,{},[],matrices);
 assert.equal(available([first])[category]['0:0'],3);
 assert.throws(()=>prepareStockTransfer({...form,quantity:4},branches,available([first]),[],matrices),/Only 3/);
 assert.equal(prepareStockTransfer({...form,quantity:3},branches,available([first]),[],matrices).quantity,3);
});
test('stock item transfers keep other items intact and reject the same branch',()=>{
 const items=[{id:1,category,itemName:'Lens A',quantity:8,branch:branches[0]},{id:2,category,itemName:'Lens B',quantity:5,branch:branches[0]}];
 const itemForm={...form,sourceType:'item',sourceItemId:'1',toBranch:branches[1],quantity:3};
 const record=prepareStockTransfer(itemForm,branches,{},items,matrices);
 const remaining=getAvailableInventoryItems(items,getTransferTotals([record]));
 assert.equal(remaining[0].quantity,5);assert.equal(remaining[1].quantity,5);assert.equal(items[0].quantity,8);
 assert.throws(()=>prepareStockTransfer({...itemForm,toBranch:branches[0]},branches,{},items,matrices),/different/);
 assert.throws(()=>prepareStockTransfer({...itemForm,quantity:6},branches,{},remaining,matrices),/Only 5/);
 assert.throws(()=>prepareStockTransfer({...itemForm,sourceItemId:'unknown'},branches,{},items,matrices),/stock item/);
});
test('matrix overrides and later available-stock edits preserve transfer deductions',()=>{
 const transfers=[{...form,row:0,column:0,quantity:3}];const totals=getTransferTotals(transfers);
 assert.equal(getAvailableMatrixEdits({[category]:{'0:0':20}},totals,matrices)[category]['0:0'],17);
 const desiredAvailable=6,storedQuantity=desiredAvailable+totals.matrix.get(category+'|0:0');
 assert.equal(getAvailableMatrixEdits({[category]:{'0:0':storedQuantity}},totals,matrices)[category]['0:0'],6);
 assert.equal(getAvailableMatrixEdits({[category]:{'0:0':3}},totals,matrices)[category]['0:0'],0);
 assert.equal(getAvailableMatrixEdits({[category]:{'0:0':null}},totals,matrices)[category]['0:0'],null);
});
