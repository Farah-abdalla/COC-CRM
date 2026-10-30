import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceDurationMinutes} from './attendanceDuration.js';
test('working minutes use real timestamps, including overnight and timezone offsets',()=>{
 assert.equal(attendanceDurationMinutes('2026-10-29T23:30:00+02:00','2026-10-30T07:45:30+02:00'),495.5);
 assert.equal(attendanceDurationMinutes('2026-10-29T20:00:00Z','2026-10-29T22:00:00+02:00'),0);
 for(const [start,end] of [['bad','2026-10-29T12:00:00Z'],['2026-10-29T12:00:00Z','bad'],['2026-10-29T13:00:00Z','2026-10-29T12:00:00Z']])assert.throws(()=>attendanceDurationMinutes(start,end));
});
