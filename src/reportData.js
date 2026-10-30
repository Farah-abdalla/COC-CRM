import {productSales} from './productSales.js';
import {taskStatus} from './taskDeadlines.js';
import {invoiceItems} from './invoiceItems.js';
import {invoiceAmounts} from './invoiceAmounts.js';
import {refundedAmount} from './creditNotes.js';
import {getInvoicePayments} from './paymentData.js';
import {invoiceCommission} from './incentiveData.js';
import {buildTreasuryLedger} from './treasuryLedger.js';
export const sourceModules={branchSales:'Invoice List',customers:'Customers',orders:'Work Orders',invoices:'Invoice List',invoiceItems:'Invoice List',creditNoteItems:'Credit Note',payments:'Payments',creditNotes:'Credit Note',invoiceEvents:'Invoice List',exams:'Eye Exams',branches:'Branches',salesRecords:'Procurement',vendorTransactions:'Vendor Statement',inventoryItems:'Inventory',stockMatrix:'Inventory',transfers:'Transfers',treasuryBalances:'Treasury',treasuryActivity:'Treasury',expenses:'Expenses',commissionRules:'Incentive',tasks:'Tasks',employees:'HR System',attendance:'HR System',leaves:'HR System',departments:'HR System',jobTitles:'HR System',assets:'HR System',documents:'HR System',leaveTypes:'HR System'};
export const sourceLabels={branchSales:'Sales by branch',orders:'Work Orders',invoices:'Invoice List',invoiceItems:'Invoice items',creditNoteItems:'Returned items',salesRecords:'Procurement',inventoryItems:'Inventory',stockMatrix:'Stock matrix',vendorTransactions:'Vendor Statement',invoiceEvents:'Invoice activity',treasuryBalances:'Treasury balances',treasuryActivity:'Treasury activity',commissionRules:'Commission rules',creditNotes:'Credit Note',exams:'Eye Exams',jobTitles:'Job titles',leaveTypes:'Leave types'};
export const fieldLabel=key=>key.split('.').map(part=>part.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase())).join(' / ');
const blocked=/password|secret|token|photo|image|content|dataurl|readby/i;
const scalar=row=>Object.fromEntries(Object.entries(row||{}).filter(([key,value])=>!blocked.test(key)&&(value===null||['string','number','boolean'].includes(typeof value))&&!String(value??'').startsWith('data:')));
const defaults={branchSales:['id','number','date','branch','customerId','grossSales','refunds','netSales','paid','balance','sunglasses','eyeglasses','vegasX6','sunglassesCount','eyeglassesCount','vegasX6Count','accessories','accessoriesCount'],customers:['id','name','phone','email','branch','joined'],orders:['id','number','customerId','invoiceId','branch','date','status','product'],invoices:['id','number','customerId','workOrderId','branch','date','total','paid','balance'],payments:['id','invoiceNumber','customerName','date','branch','method','amount'],expenses:['id','date','branch','category','paidTo','amount'],tasks:['id','title','assigneeName','branch','dueDate','status']};
export function reportSources(data,can,hrData={},matrices={}){
 const sources={};
 for(const [key,module] of Object.entries(sourceModules)){
  if(!can(module))continue;
  let rows=data[key]||hrData[key]||[];
  if(key==='branchSales')rows=(data.invoices||[]).filter(invoice=>!invoice.isVoided).map(invoice=>{const amounts=invoiceAmounts({...invoice,refundedAmount:refundedAmount(invoice.id,data.creditNotes||[])});return {id:invoice.id,number:invoice.number||'INV-'+invoice.id,date:invoice.date||'',branch:invoice.branch||'',customerId:invoice.customerId,grossSales:amounts.originalTotal,refunds:amounts.refunded,netSales:amounts.total,paid:amounts.paid,balance:amounts.balance,...productSales(invoice,data.odooReportProducts||[],{includeCounts:true})};});
  if(key==='tasks')rows=rows.map(row=>({...row,status:taskStatus(row)}));
  if(key==='invoiceItems')rows=(data.invoices||[]).flatMap(invoice=>invoiceItems(invoice).map(item=>({...item,id:invoice.id+':'+item.id,invoiceId:invoice.id,customerId:invoice.customerId,workOrderId:invoice.workOrderId,branch:invoice.branch,date:invoice.date||'',invoiceNumber:invoice.number,unitPrice:item.unitPriceCents/100,lineTotal:item.lineTotalCents/100})));
  if(key==='creditNoteItems')rows=(data.creditNotes||[]).flatMap(note=>(note.items||[]).map((item,index)=>({...item,id:note.id+':'+index,creditNoteId:note.id,invoiceId:note.invoiceId,branch:note.branch,date:note.date,creditNoteNumber:note.number})));
  if(key==='branches')rows=(data.branches||[]).map(name=>({name,branch:name}));
  if(key==='invoices')rows=(data.invoices||[]).map(row=>({...row,...invoiceAmounts({...row,refundedAmount:refundedAmount(row.id,data.creditNotes||[])}),...(can('Incentive')?{commission:invoiceCommission(row,data.commissionRules||[])}:{})}));
  if(key==='payments')rows=getInvoicePayments(data.invoices||[],data.invoiceEvents||[],can('Customers')?data.customers||[]:[]).map(row=>({...row,amount:row.amountCents/100}));
  if(key==='treasuryActivity'){const ledger=buildTreasuryLedger(data.invoices||[],data.invoiceEvents||[],data.creditNotes||[],data.expenses||[],data.treasuryTransfers||[]);rows=[...ledger.rows,...ledger.unassigned].filter(row=>!row.transferId||(data.branches||[]).includes(row.branch)).map(row=>({...row,amount:row.amountCents/100}));}
  if(key==='stockMatrix')rows=Object.entries(matrices).flatMap(([category,matrix])=>matrix.values.flatMap((row,r)=>row.map((quantity,c)=>({category,sph:matrix.rows[r],cyl:matrix.columns[c],quantity})).filter(row=>row.quantity!==null)));
  const clean=rows.map(row=>{const result=scalar(row);if(Number.isFinite(row.amountCents))result.amount=row.amountCents/100;return result;});
  sources[key]={label:sourceLabels[key]||fieldLabel(key),rows:clean,fields:[...new Set([...(defaults[key]||['id','name','date','branch','status']),...clean.flatMap(row=>Object.keys(row))])]};
 }
 // Many-to-one joins preserve the grain of the source, avoiding duplicate financial totals.
 const links=[['customerId','customers','customer'],['invoiceId','invoices','invoice'],['workOrderId','orders','workOrder'],['examId','exams','exam'],['employeeId','employees','employee'],['departmentId','departments','department'],['jobTitleId','jobTitles','jobTitle'],['typeId','leaveTypes','leaveType']];
 const baseFields=Object.fromEntries(Object.entries(sources).map(([key,source])=>[key,[...source.fields]]));
 const indexes=Object.fromEntries(Object.entries(sources).map(([key,source])=>[key,new Map(source.rows.filter(row=>row.id!==undefined).map(row=>[String(row.id),row]))]));
 for(const [key,source] of Object.entries(sources)){
  const available=links.filter(([foreign,target])=>key!==target&&sources[target]&&source.fields.includes(foreign));
  source.rows=source.rows.map(row=>{const next={...row};for(const [foreign,target,prefix] of available){const linked=indexes[target].get(String(row[foreign]));for(const field of baseFields[target])next[prefix+'.'+field]=linked?.[field]??'';}return next;});
  source.fields=[...new Set([...source.fields,...available.flatMap(([,target,prefix])=>baseFields[target].map(field=>prefix+'.'+field))])];
 }
 return sources;
}
export function reportChoices(value){try{const choices=JSON.parse(value);return Array.isArray(choices)&&choices.length<=100&&choices.every(choice=>typeof choice==='string'&&choice.length<=200)?choices:null;}catch{return null;}}
export const operators=['is one of','contains','equals','not equals','greater than','less than','on or after','on or before','is empty','is not empty'];
export function validateReport(report){
 const field=value=>typeof value==='string'&&value.length>0&&value.length<=120&&!['__proto__','constructor','prototype'].includes(value);
 if(typeof report.name!=='string'||!report.name.trim()||report.name.length>120||!Object.hasOwn(sourceModules,report.source)||!Array.isArray(report.columns)||!report.columns.length||report.columns.length>80||!report.columns.every(field)||!Array.isArray(report.filters)||report.filters.length>20||report.filters.some(f=>!f||!field(f.field)||!operators.includes(f.operator)||typeof f.value!=='string'||f.value.length>(f.operator==='is one of'?5000:500)||(f.operator==='is one of'&&reportChoices(f.value)===null))||!['asc','desc'].includes(report.direction)||typeof report.groupBy!=='string'||(report.groupBy&&!field(report.groupBy))||typeof report.sortBy!=='string'||(report.sortBy&&!field(report.sortBy))||!Array.isArray(report.totals)||report.totals.length>80||!report.totals.every(field))throw new Error('Choose a report name, source, columns, and valid filters.');
}
const number=value=>value!==''&&value!==null&&value!==undefined&&typeof value!=='boolean'&&Number.isFinite(Number(value));
export function runReport(source,config){
 if(!source)return {rows:[],groups:[],totals:{},count:0};
 const fields=new Set(source.fields),compare=(a,b)=>number(a)&&number(b)?Number(a)-Number(b):String(a??'').localeCompare(String(b??''),undefined,{numeric:true});
 const rows=source.rows.filter(row=>(config.filters||[]).every(f=>{
  if(!fields.has(f.field))return false;
  const value=row[f.field],a=String(value??'').toLowerCase(),b=String(f.value??'').toLowerCase();
  switch(f.operator){case 'is one of':return (reportChoices(f.value)||[]).some(choice=>choice.toLowerCase()===a);case 'contains':return a.includes(b);case 'equals':return a===b;case 'not equals':return a!==b;case 'greater than':return number(value)&&number(f.value)&&Number(value)>Number(f.value);case 'less than':return number(value)&&number(f.value)&&Number(value)<Number(f.value);case 'on or after':return !!a&&a.slice(0,10)>=b;case 'on or before':return !!a&&a.slice(0,10)<=b;case 'is empty':return !a;case 'is not empty':return !!a;default:return false;}
 })).sort((a,b)=>config.sortBy?compare(a[config.sortBy],b[config.sortBy])*(config.direction==='desc'?-1:1):0);
 const totalFields=(config.totals||[]).filter(field=>fields.has(field)),sum=list=>Object.fromEntries(totalFields.map(field=>[field,Math.round(list.reduce((n,row)=>n+(number(row[field])?Number(row[field]):0),0)*1e6)/1e6]));
 const grouped=new Map();if(config.groupBy&&fields.has(config.groupBy))for(const row of rows){const value=String(row[config.groupBy]??'');if(!grouped.has(value))grouped.set(value,[]);grouped.get(value).push(row);}
 return {rows,count:rows.length,totals:sum(rows),groups:[...grouped].map(([value,list])=>({value,count:list.length,totals:sum(list)}))};
}
export function reportCSV(headers,rows){const cell=value=>'"'+String(value??'').replace(typeof value==='number'?/$^/:/^(\s*)([=+@-])/,"$1'$2").replaceAll('"','""')+'"';return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');}
