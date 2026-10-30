import test from 'node:test';
import assert from 'node:assert/strict';
import {amountToCents} from './treasuryAmounts.js';
import {emptySnapshot,mergePermittedSnapshot,normalizePermissions,visibleSnapshot,validateSnapshot} from './accessControl.js';
test('treasury decimal amounts are exact and reject invalid values',()=>{
 assert.equal(amountToCents('1234.56'),123456);assert.equal(amountToCents('0.1'),10);assert.equal(amountToCents('0'),0);
 for(const amount of ['','-1','1.001','Infinity','NaN','1e3','9007199254740992'])assert.throws(()=>amountToCents(amount));
});
test('branch balances are filtered, protected, and never overwrite other branches',()=>{
 const current=emptySnapshot();current.data.branches=['New Cairo','Nasr City'];current.data.treasuryBalances=[{id:'other',branch:'Nasr City',category:'Cash',amountCents:50000}];
 const user={active:true,branches:['New Cairo'],permissions:normalizePermissions({Treasury:{view:true,add:true,edit:true}})};
 const incoming=visibleSnapshot(current,user);assert.deepEqual(incoming.data.treasuryBalances,[]);
 incoming.data.treasuryBalances.push({id:'mine',branch:'New Cairo',category:'Cash',amountCents:10000});
 const merged=mergePermittedSnapshot(current,incoming,user);assert.equal(merged.data.treasuryBalances.length,2);assert.equal(merged.data.treasuryBalances.find(row=>row.id==='other').amountCents,50000);
 const viewOnly={...user,permissions:normalizePermissions({Treasury:{view:true}})};assert.throws(()=>mergePermittedSnapshot(current,incoming,viewOnly),/add permission/);
 const forbidden=structuredClone(incoming);forbidden.data.treasuryBalances[0].branch='Nasr City';assert.throws(()=>mergePermittedSnapshot(current,forbidden,user),/outside your assigned/);
 const duplicate=structuredClone(merged);duplicate.data.treasuryBalances.push({...duplicate.data.treasuryBalances[0],id:'duplicate'});assert.throws(()=>validateSnapshot(duplicate),/duplicate treasury/);
 const invalid=structuredClone(merged);invalid.data.treasuryBalances[0].amountCents=0.1;assert.throws(()=>validateSnapshot(invalid),/treasury amount/);
});
