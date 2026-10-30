import test from 'node:test';
import assert from 'node:assert/strict';
import {reportSources,runReport,reportCSV,validateReport} from './reportData.js';
import {emptySnapshot,visibleSnapshot,mergePermittedSnapshot,normalizePermissions,can} from './accessControl.js';
const config={id:'r1',name:'Sales by branch',source:'invoices',columns:['number','total','customer.name'],filters:[],groupBy:'branch',sortBy:'total',direction:'desc',totals:['total','balance']};
const fixture=()=>{const s=emptySnapshot();s.data.branches=['A','B'];s.data.customers=[{id:1,name:'Alice',branch:'A'},{id:2,name:'Bob',branch:'B'}];s.data.invoices=[{id:10,number:'INV1',customerId:1,branch:'A',date:'2026-10-01',total:100,paid:30},{id:11,number:'INV2',customerId:1,branch:'A',date:'2026-10-28',total:50,paid:10},{id:12,number:'INV3',customerId:2,branch:'B',date:'2026-10-28',total:200,paid:200}];s.data.orders=[{id:20,customerId:1,branch:'A'},{id:21,customerId:1,branch:'A'}];return s;};
test('linked reports preserve source grain and financial totals after date filtering',()=>{
 const sources=reportSources(fixture().data,()=>true),source=sources.invoices;
 assert.equal(source.rows.length,3);assert.equal(source.rows[0]['customer.name'],'Alice');
 const result=runReport(source,{...config,filters:[{field:'date',operator:'on or after',value:'2026-10-28'},{field:'date',operator:'on or before',value:'2026-10-28'}]});
 assert.equal(result.count,2);assert.deepEqual(result.totals,{total:250,balance:40});assert.equal(result.rows[0].number,'INV3');assert.equal(result.groups.length,2);
});
test('report definitions do not grant access to hidden modules, branches or linked records',()=>{
 const user={id:'staff',active:true,branches:['A'],permissions:normalizePermissions({'Reports':{view:true,add:true,edit:true,delete:true},'Invoice List':{view:true}})};
 const snapshot=fixture();snapshot.data.customReports=[config];const visible=visibleSnapshot(snapshot,user),sources=reportSources(visible.data,page=>can(user,page));
 assert.equal(sources.customers,undefined);assert.equal(sources.stockMatrix,undefined);assert.equal(sources.invoices.rows.length,2);assert.equal(sources.invoices.fields.includes('customer.name'),false);
 const next=structuredClone(visible);next.data.customReports.push({...config,id:'r2'});assert.equal(mergePermittedSnapshot(snapshot,next,user).data.customReports.length,2);
 next.data.invoices[0].total=999;assert.throws(()=>mergePermittedSnapshot(snapshot,next,user),/edit permission/);
 const denied={...user,permissions:normalizePermissions()};assert.equal(visibleSnapshot(snapshot,denied).data.customReports.length,0);
});
test('report field discovery excludes file payloads and exposes permitted HR links and invoice lines',()=>{
 const data=fixture().data;data.customers[0].photo='data:image/png;base64,abc';data.customers[0].password='hidden';
 const sources=reportSources(data,()=>true,{employees:[{id:'e1',name:'Employee',photo:'data:image/png;base64,abc'}],attendance:[{id:'a1',employeeId:'e1',date:'2026-10-28'}]});
 assert.equal(sources.customers.fields.includes('photo'),false);assert.equal(sources.invoices.fields.includes('customer.password'),false);assert.equal(sources.attendance.rows[0]['employee.name'],'Employee');
 assert.equal(sources.invoiceItems.rows.length,3);assert.equal(sources.invoiceItems.rows[0]['invoice.number'],'INV1');assert.equal(sources.invoiceItems.rows[0].lineTotal,100);
});
test('report calculations handle numeric comparisons, missing fields and safe CSV export',()=>{
 const source={fields:['amount','name'],rows:[{amount:10,name:'A'},{amount:2,name:'B'},{amount:null,name:'C'}]};
 const result=runReport(source,{...config,groupBy:'',sortBy:'amount',totals:['amount'],filters:[{field:'amount',operator:'greater than',value:'3'}]});assert.equal(result.count,1);assert.equal(result.totals.amount,10);
 assert.equal(runReport(source,{...config,filters:[{field:'hidden',operator:'contains',value:''}]}).count,0);
 const csv=reportCSV(['Name'],[['=1+1'],['  @cmd'],['a,"b"\nc']]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes("  '@cmd"));assert.ok(csv.includes('"a,""b""\nc"'));
 assert.doesNotThrow(()=>validateReport(config));assert.throws(()=>validateReport({...config,source:'unknown'}));assert.throws(()=>validateReport({...config,columns:[]}));
});

test('branch sales summarize dated nonvoided invoices and linked refunds without duplicating sales',()=>{
 const snapshot=fixture();snapshot.data.invoices.push({id:13,number:'VOID',date:'2026-10-28',branch:'A',total:999,paid:0,isVoided:true},{id:14,number:'UNDATED',branch:'A',total:80,paid:0});
 snapshot.data.creditNotes=[{id:'cn1',invoiceId:11,amount:5}];
 const source=reportSources(snapshot.data,()=>true).branchSales;
 const report={...config,source:'branchSales',columns:['branch','netSales'],totals:['grossSales','refunds','netSales','paid','balance'],filters:[{field:'date',operator:'on or after',value:'2026-10-28'},{field:'date',operator:'on or before',value:'2026-10-28'}]};
 validateReport(report);let result=runReport(source,report);assert.equal(result.count,2);assert.deepEqual(result.totals,{grossSales:250,refunds:5,netSales:245,paid:205,balance:40});assert.equal(result.groups.length,2);
 result=runReport(source,{...report,filters:[...report.filters,{field:'branch',operator:'equals',value:'A'}]});assert.equal(result.count,1);assert.equal(result.totals.netSales,45);assert.equal(result.groups[0].value,'A');
 assert.equal(reportSources(snapshot.data,page=>page==='Reports').branchSales,undefined,'Reports access does not expose invoice sales');
});

test('multiple branch selections stay separate and an empty selection has no results',()=>{
 const source=reportSources(fixture().data,()=>true).branchSales;
 const report={...config,source:'branchSales',columns:['branch','netSales'],totals:['netSales'],sortBy:'netSales',filters:[{field:'branch',operator:'is one of',value:JSON.stringify(['A','B'])},{field:'date',operator:'on or after',value:'2026-10-28'},{field:'date',operator:'on or before',value:'2026-10-28'}]};
 validateReport(report);const result=runReport(source,report);assert.equal(result.count,2);assert.deepEqual(result.groups.map(group=>[group.value,group.totals.netSales]),[['B',200],['A',50]]);assert.equal(result.totals.netSales,250);
 const empty={...report,filters:[{field:'branch',operator:'is one of',value:'[]'}]};assert.equal(runReport(source,empty).count,0);
 assert.throws(()=>validateReport({...report,filters:[{field:'branch',operator:'is one of',value:'bad json'}]}));
});
