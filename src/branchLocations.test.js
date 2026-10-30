import test from 'node:test';
import assert from 'node:assert/strict';
import {branchLocationRecord,branchMapUrl,validBranchCoordinates} from './branchLocations.js';
import {emptySnapshot,mergePermittedSnapshot,visibleSnapshot,validateSnapshot} from './accessControl.js';
import {encodeSnapshot} from './storagePayload.js';
test('branch locations validate coordinates and build safe map links',()=>{
 assert.equal(branchLocationRecord({},'Nasr City','loc'),null);
 assert.deepEqual(branchLocationRecord({address:' Main Street ',latitude:'30.04',longitude:'31.23'},'Nasr City','loc'),{id:'loc',branch:'Nasr City',address:'Main Street',latitude:30.04,longitude:31.23});
 for(const [latitude,longitude] of [['',31],[30,''],[91,31],[30,181],['bad',31],[Infinity,31]]){assert.equal(validBranchCoordinates(latitude,longitude),false);assert.throws(()=>branchLocationRecord({address:'Branch',latitude,longitude},'Nasr City','loc'));}
 assert.equal(validBranchCoordinates(0,0),true);assert.equal(branchMapUrl({latitude:'javascript:alert(1)',longitude:0}),'');
 assert.match(branchMapUrl({latitude:30,longitude:31}),/^https:\/\/www\.openstreetmap\.org\//);
});
test('branch location records enforce parent, uniqueness, branch scope, and edit permissions',()=>{
 const current=emptySnapshot();current.data.branches=['Nasr City','New Cairo'];
 current.data.branchLocations=[{id:'other',branch:'New Cairo',address:'Other',latitude:30,longitude:31}];
 const editor={active:true,branches:['Nasr City'],permissions:{Branches:{view:true,edit:true}}};
 const incoming=visibleSnapshot(current,editor);assert.equal(incoming.data.branchLocations.length,0);
 incoming.data.branchLocations=[{id:'own',branch:'Nasr City',address:'My Branch',latitude:30.1,longitude:31.2}];
 const merged=mergePermittedSnapshot(current,incoming,editor);assert.equal(merged.data.branchLocations.length,2);assert.ok(encodeSnapshot(merged).includes('My Branch'));
 const reader={...editor,permissions:{Branches:{view:true}}};assert.throws(()=>mergePermittedSnapshot(current,incoming,reader),/edit permission/);
 const invalid=structuredClone(merged);invalid.data.branchLocations.push({...invalid.data.branchLocations[0],id:'duplicate'});assert.throws(()=>validateSnapshot(invalid));
 invalid.data.branchLocations=[{id:'missing',branch:'Missing',address:'',latitude:30,longitude:31}];assert.throws(()=>validateSnapshot(invalid));
 const remove=visibleSnapshot(merged,editor);remove.data.branchLocations=[];assert.equal(mergePermittedSnapshot(merged,remove,editor).data.branchLocations.length,1);
});