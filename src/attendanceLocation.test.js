import test from 'node:test';
import assert from 'node:assert/strict';
import {currentAttendanceLocation} from './attendanceLocation.js';
function device(t,geolocation,secure=true){
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:secure}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation}});
 t.after(()=>{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else delete globalThis.window;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;});
}
test('location capture requests fresh high-accuracy coordinates without manual inputs',async t=>{
 const timestamp=Date.now();let options;
 device(t,{getCurrentPosition(success,error,value){options=value;success({coords:{latitude:30.1,longitude:31.2,accuracy:9},timestamp});}});
 assert.deepEqual(await currentAttendanceLocation(),{latitude:30.1,longitude:31.2,accuracy:9,capturedAt:new Date(timestamp).toISOString()});
 assert.deepEqual(options,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
});
for(const [code,message]of [[1,/permission denied/],[2,/could not be detected/],[3,/timed out/]])test('location error '+code+' blocks attendance and permits a later retry',async t=>{
 let fail=true;device(t,{getCurrentPosition(success,error){if(fail)error({code});else success({coords:{latitude:30,longitude:31,accuracy:10},timestamp:Date.now()});}});
 await assert.rejects(currentAttendanceLocation(),message);fail=false;assert.equal((await currentAttendanceLocation()).latitude,30);
});
test('insecure origins, unavailable GPS and invalid coordinates are rejected',async t=>{
 await t.test('HTTPS required',async t=>{device(t,{getCurrentPosition(){assert.fail('Should not be called');}},false);await assert.rejects(currentAttendanceLocation(),/HTTPS/);});
 await t.test('no geolocation',async t=>{device(t,undefined);await assert.rejects(currentAttendanceLocation(),/unavailable/);});
 await t.test('invalid coordinate',async t=>{device(t,{getCurrentPosition(success){success({coords:{latitude:100,longitude:31,accuracy:10},timestamp:Date.now()});}});await assert.rejects(currentAttendanceLocation(),/invalid location/);});
});
