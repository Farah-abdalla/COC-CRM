import test from 'node:test';
import assert from 'node:assert/strict';
import {historyRecords,totalWorkingTime} from './attendanceHistoryData.js';
test('history includes saved sessions across report dates and filters only permitted employees',()=>{
 const rows=[{id:1,employeeId:'a',checkIn:'2026-10-28T20:00:00Z'},{id:2,employeeId:'a',checkIn:'2026-10-29T07:00:00Z'},{id:3,employeeId:'b',checkIn:'2026-10-29T08:00:00Z'}];
 assert.deepEqual(historyRecords(rows,new Set(['a'])).map(row=>row.id),[2,1]);assert.deepEqual(rows.map(row=>row.id),[1,2,3]);
});
test('history shows no final duration while open and calculates completed overnight sessions from timestamps',()=>{
 assert.equal(totalWorkingTime({checkIn:'2026-10-28T20:00:00Z',checkOut:''}),null);
 assert.deepEqual(totalWorkingTime({checkIn:'2026-10-28T23:30:00+02:00',checkOut:'2026-10-29T07:45:30+02:00'}),{minutes:495.5,hours:8,minutePart:15,seconds:30});
});
