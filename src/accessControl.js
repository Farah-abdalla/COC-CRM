import {isPersonalAccount,personalRecordAllowed,personalName,ownsSale} from './personalAccess.js';
import {validBranchCoordinates} from './branchLocations.js';
import {validateProductLink} from './productSales.js';
import {validateReport} from './reportData.js';
import {validPrescriptionDate,validPrescriptionImage,examBranch,isLinkedPrescriptionUpload} from './prescriptions.js';
import {cairoToday} from './taskDeadlines.js';
import {canCompleteTask} from './taskDeadlines.js';
import {requireTreasuryAccount} from './paymentMethods.js';
import {validateInvoiceItems,invoiceItemFingerprint} from './invoiceItems.js';
import {validateCommissionRule} from './incentiveData.js';
import {validateExpense} from './expenseData.js';
import {validateTreasuryTransfer,validateNewTreasuryTransfers} from './treasuryTransfers.js';
import {treasuryCategories} from './treasuryAmounts.js';
export const modules = ['Dashboard Analytics','Reports','Customers','Invoice List','Payments','Expenses','Treasury','Credit Note','Work Orders','Tasks','Incentive','HR System','Eye Exams','Branches','Procurement','Inventory','Check Before Order','Vendor Statement','Transfers','Data storage'];
export const actions = ['view','add','edit','delete'];
export const recordModules = {odooReportProducts:['Reports'],customReports:['Reports'],tasks:['Tasks'],customers:['Customers'],orders:['Work Orders'],exams:['Eye Exams'],branches:['Branches'],branchLocations:['Branches'],invoices:['Invoice List','Incentive','Payments','Treasury'],creditNotes:['Credit Note','Invoice List','Treasury'],invoiceEvents:['Invoice List','Payments','Treasury'],salesRecords:['Procurement','Vendor Statement'],inventoryItems:['Inventory'],vendorTransactions:['Vendor Statement'],transfers:['Transfers','Inventory','Check Before Order'],treasuryTransfers:['Treasury'],treasuryBalances:['Treasury'],expenses:['Expenses','Treasury'],commissionRules:['Incentive','Invoice List']};
export const recordWriteModules={...recordModules,expenses:['Expenses'],invoices:['Invoice List'],creditNotes:['Credit Note','Invoice List'],invoiceEvents:['Invoice List']};
export const keys = Object.keys(recordModules);
export const emptySnapshot = () => ({data:Object.fromEntries(keys.map(key=>[key,[]])),matrixEdits:{}});
export function can(user,page,action='view') {
 if(page==='My workspace')return Boolean(user?.active);
 if(isPersonalAccount(user)){
  if(['Dashboard Analytics','Reports','Payments','Treasury','Expenses','Procurement','Vendor Statement','Branches','Inventory','Transfers','Data storage','Check Before Order'].includes(page))return false;
  if(['Invoice List','Incentive','HR System'].includes(page)&&action==='view')return Boolean(user.active);
 }
 if(page==='HR System')return Boolean(user?.active&&action==='view'&&(user.isAdmin||user.hrRole||user.permissions?.['HR System']?.view));
 if(page==='Eye Exams'&&action==='view'&&user?.active&&user.permissions?.['Work Orders']?.view)return true;
 if(page==='Payments'&&action==='add')return false;
 if(page==='Tasks')return Boolean(user?.active&&(action==='view'||action==='edit'||(action==='add'&&(user.isAdmin||user.isManager))));
 if(page==='Incentive'&&action!=='view')return Boolean(user?.active&&user.isAdmin);
 if(action!=='view'&&['Dashboard Analytics','Incentive','Tasks','HR System','Check Before Order','Data storage'].includes(page))return false;
 if(!user?.active)return false;
 if(user.isAdmin)return true;
 return Boolean(user.permissions?.[page]?.view && user.permissions[page][action]);
}
export function normalizePermissions(input={}) {
 return Object.fromEntries(modules.map(page=>[page,Object.fromEntries(actions.map(action=>[action,Boolean(input?.[page]?.view && input?.[page]?.[action])]))]));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function recordBranch(key,record,data) {
 if(key==='branches')return record;
 if(record.branch)return record.branch;
 if(key==='transfers')return record.toBranch||'';
 if(record.invoiceId){const invoice=data.invoices.find(item=>String(item.id)===String(record.invoiceId));if(invoice)return recordBranch('invoices',invoice,data);}
 if(record.workOrderId){const order=data.orders.find(item=>String(item.id)===String(record.workOrderId));if(order)return recordBranch('orders',order,data);}
 if(record.customerId){const customer=data.customers.find(item=>String(item.id)===String(record.customerId));if(customer)return customer.branch||'';}
 return '';
}
const branchAccess=(user,key,record,data)=>key==='treasuryTransfers'?(user.isAdmin||user.branches==='all'||user.branches?.includes(record.fromBranch)||user.branches?.includes(record.toBranch)):key==='tasks'&&!user.isAdmin&&!user.isManager?record.assigneeId===user.id:key==='odooReportProducts'||key==='customReports'||key==='commissionRules'||user.isAdmin||user.branches==='all'||user.branches?.includes(recordBranch(key,record,data));
export function inBranch(user,key,record,data){
 if(isPersonalAccount(user)&&key==='customers'&&!branchAccess(user,key,record,data))return [...data.invoices.map(sale=>({sale,key:'invoices'})),...data.orders.map(sale=>({sale,key:'orders'}))].some(({sale,key:source})=>String(sale.customerId)===String(record.id)&&ownsSale(user,sale)&&branchAccess(user,source,sale,data));
 return branchAccess(user,key,record,data)&&(!isPersonalAccount(user)||personalRecordAllowed(user,key,record,data));
}

export function canReadKey(user,key) {
 // Branch names are configuration for permitted forms, filtered to assigned branches.
 if(key==='branches')return true;
 if(isPersonalAccount(user)&&['invoices','creditNotes','invoiceEvents','customers','odooReportProducts','commissionRules'].includes(key))return true;
 if(key==='creditNotes'&&can(user,'Incentive'))return true;
 return recordModules[key]?.some(page=>can(user,page));
}
export function visibleSnapshot(snapshot,user) {
 const data=Object.fromEntries(keys.map(key=>[key,canReadKey(user,key)?snapshot.data[key].filter(row=>inBranch(user,key,row,snapshot.data)):[]]));
 const matrixAllowed=(can(user,'Inventory')||can(user,'Check Before Order')||can(user,'Transfers'))&&(user.isAdmin||user.branches==='all');
 return {data,matrixEdits:matrixAllowed?snapshot.matrixEdits:{}};
}
export function validateSnapshot(snapshot) {
 if(!snapshot||!snapshot.data||keys.some(key=>!Array.isArray(snapshot.data[key]))||!snapshot.matrixEdits||typeof snapshot.matrixEdits!=='object'||Array.isArray(snapshot.matrixEdits))throw new Error('Invalid records.');
 for(const key of keys){
  const ids=new Set(),treasurySlots=new Set(),commissionNames=new Set();
  for(const row of snapshot.data[key]){
   if(key==='branches'){if(typeof row!=='string'||!row.trim()||ids.has(row))throw new Error('Invalid or duplicate branch.');ids.add(row);continue;}
   if(!row||typeof row!=='object'||Array.isArray(row)||!['string','number'].includes(typeof row.id)||String(row.id)===''||ids.has(String(row.id)))throw new Error('Invalid or duplicate record ID.');
   if(key==='branchLocations'){
    if(typeof row.branch!=='string'||!snapshot.data.branches.includes(row.branch)||typeof row.address!=='string'||row.address.length>500||typeof row.latitude!=='number'||typeof row.longitude!=='number'||!validBranchCoordinates(row.latitude,row.longitude)||treasurySlots.has(row.branch))throw new Error('Select a valid, unique location for an existing branch.');
    treasurySlots.add(row.branch);
   }
   if(key==='odooReportProducts')validateProductLink(row);
   if(key==='customReports')validateReport(row);
   if(key==='commissionRules'){validateCommissionRule(row);const name=row.name.trim().toLowerCase();if(commissionNames.has(name))throw new Error('A commission item with this name already exists.');commissionNames.add(name);}
   if(key==='invoices'&&row.items!==undefined)validateInvoiceItems(row);
   if(key==='invoices'&&row.openingPaymentMethod)requireTreasuryAccount(row.openingPaymentMethod,row.openingPaymentTreasuryCategory);
   if(key==='creditNotes'&&row.method&&row.treasuryCategory)requireTreasuryAccount(row.method,row.treasuryCategory);
   if(key==='invoiceEvents'&&['Payment recorded','Payment adjusted'].includes(row.action)&&row.method){if(row.treasuryCategory)requireTreasuryAccount(row.method,row.treasuryCategory);const cents=Math.round(Number(row.amount)*100);if(!Number.isSafeInteger(cents)||cents===0||(row.action==='Payment recorded'&&cents<0))throw new Error('Invalid invoice payment amount.');}
   if(key==='tasks'){if(typeof row.title!=='string'||!row.title.trim()||row.title.length>160||typeof row.description!=='string'||row.description.length>2000||typeof row.assigneeId!=='string'||!row.assigneeId||typeof row.assigneeName!=='string'||!row.assigneeName||typeof row.branch!=='string'||!row.branch.trim()||typeof row.createdBy!=='string'||!row.createdBy||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||!['Pending','Done'].includes(row.status)||(row.status==='Done'&&(typeof row.completedBy!=='string'||!row.completedBy||typeof row.completedAt!=='string'||!Number.isFinite(Date.parse(row.completedAt))))||(row.dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate)||!Number.isFinite(Date.parse(row.dueDate))||new Date(row.dueDate).toISOString().slice(0,10)!==row.dueDate)))throw new Error('Enter a valid task title, employee, branch, and deadline.');}
   if(key==='exams'&&row.source==='work-order'&&(!row.workOrderId||!row.customerId||!row.branch||typeof row.uploadedBy!=='string'||!row.uploadedBy||typeof row.notes!=='string'||row.notes.length>2000||!validPrescriptionDate(row.date)||row.date>cairoToday()||!validPrescriptionImage(row.examImage)))throw new Error('Enter a valid prescription date and image for the linked work order.');
   if(key==='expenses')validateExpense(row);
   if(key==='treasuryTransfers')validateTreasuryTransfer(row);
   if(key==='treasuryBalances'){
    if(typeof row.branch!=='string'||!row.branch.trim()||!treasuryCategories.includes(row.category)||!Number.isSafeInteger(row.amountCents)||row.amountCents<0)throw new Error('Invalid treasury amount, branch, or category.');
    const slot=JSON.stringify([row.branch,row.category]);if(treasurySlots.has(slot))throw new Error('Invalid duplicate treasury balance.');treasurySlots.add(slot);
   }
   ids.add(String(row.id));
  }
 }
 if(new TextEncoder().encode(JSON.stringify(snapshot)).length>1800000)throw new Error('Records exceed the 1.8 MB limit. Download a backup and reduce saved images.');
}
export function mergePermittedSnapshot(current,incoming,user) {
 validateSnapshot(incoming);
 const visible=visibleSnapshot(current,user), merged={data:{...current.data},matrixEdits:current.matrixEdits};
 for(const key of keys){
  const before=visible.data[key],after=incoming.data[key];
  if(same(before,after))continue;
  if(key==='odooReportProducts'&&!user.isAdmin)throw new Error('Only administrators can update Odoo product links.');
  if(key==='commissionRules'&&!user.isAdmin)throw new Error('Only administrators can change commission items.');
  const id=row=>key==='branches'?row:String(row.id);
  const old=new Map(before.map(row=>[id(row),row])), next=new Map(after.map(row=>[id(row),row]));
  const full=new Map(current.data[key].map(row=>[id(row),row]));
  for(const row of after){
   const previous=old.get(id(row));
   if(previous&&same(previous,row))continue;
   if(key==='invoices'&&previous&&current.data.creditNotes.some(note=>String(note.invoiceId)===String(row.id)&&note.items?.length)&&(invoiceItemFingerprint(previous)!==invoiceItemFingerprint(row)||Number(previous.discount||0)!==Number(row.discount||0)))throw new Error('Invoice items and discount cannot change after an item refund.');
   if(key==='tasks'){
    if(previous){
     const expected={...previous,status:'Done',completedAt:row.completedAt,completedBy:user.id};
     if(!canCompleteTask(user,previous)||Object.keys(row).length!==Object.keys(expected).length||Object.keys(expected).some(field=>!same(row[field],expected[field])))throw new Error('Only task completion is allowed.');
    }else if(row.createdBy!==user.id||row.status!=='Pending'||row.completedAt!==undefined||row.completedBy!==undefined)throw new Error('New tasks must be pending and created by the signed-in account.');
   }
   if(key==='treasuryTransfers'&&!user.isAdmin&&user.branches!=='all'&&(!user.branches?.includes(row.fromBranch)||!user.branches?.includes(row.toBranch)||previous&&(!user.branches?.includes(previous.fromBranch)||!user.branches?.includes(previous.toBranch))))throw new Error('Transfers require access to both source and destination branches.');
   if(isPersonalAccount(user)&&['invoices','orders'].includes(key)){
    if(previous&&((previous.salesPersonId&&previous.salesPersonId!==row.salesPersonId)||(row.salesPersonId&&row.salesPersonId!==user.id)||personalName(previous.salesPerson)!==personalName(row.salesPerson)))throw new Error('You cannot change invoice ownership.');
    if(!previous&&(row.salesPersonId!==user.id||personalName(row.salesPerson)!==personalName(user.salesPersonName||user.name)))throw new Error('New sales must belong to your own account.');
   }
   const action=key==='branchLocations'&&current.data.branches.includes(row.branch)?'edit':previous?'edit':'add';
   const linkedPrescriptionAdd=key==='exams'&&!previous&&isLinkedPrescriptionUpload(row,incoming,current,user)&&can(user,'Work Orders',current.data.orders.some(order=>String(order.id)===String(row.workOrderId))?'edit':'add');
   if(!linkedPrescriptionAdd&&!(key==='invoiceEvents'&&(can(user,'Invoice List','add')||can(user,'Invoice List','edit')))&&!recordWriteModules[key].some(page=>can(user,page,action)))throw new Error('You do not have '+action+' permission for '+recordModules[key][0]+'.');
   if(!previous&&full.has(id(row)))throw new Error('A record with this ID already exists.');
   if(!inBranch(user,key,row,incoming.data))throw new Error('This record is outside your assigned branches. Records without a branch require all-branch access.');
  }
  if(key==='treasuryTransfers')for(const row of before)if(!next.has(id(row))&&!user.isAdmin&&user.branches!=='all'&&(!user.branches?.includes(row.fromBranch)||!user.branches?.includes(row.toBranch)))throw new Error('Transfers require access to both source and destination branches.');
  for(const row of before)if(!next.has(id(row))&&!(key==='branchLocations'&&incoming.data.branches.includes(row.branch)&&can(user,'Branches','edit'))&&!recordWriteModules[key].some(page=>can(user,page,'delete')))throw new Error('You do not have delete permission for '+recordModules[key][0]+'.');
  merged.data[key]=[...after,...current.data[key].filter(row=>!old.has(id(row)))];
 }
 if(!same(visible.matrixEdits,incoming.matrixEdits)){
  if(!can(user,'Inventory','edit')||(!user.isAdmin&&user.branches!=='all'))throw new Error('Editing central stock requires Inventory edit permission and all-branch access.');
  merged.matrixEdits=incoming.matrixEdits;
 }
 // Check final relationships against the merged server state, never client-supplied hidden records.
 for(const key of keys)for(const row of merged.data[key]){
  const old=current.data[key].find(item=>key==='branches'?item===row:String(item.id)===String(row.id));
  if(key==='salesRecords'&&!same(old,row)&&row.branch){
   if(!merged.data.branches.includes(row.branch))throw new Error('Choose a branch from your assigned locations.');
   const order=row.workOrderId&&merged.data.orders.find(order=>String(order.id)===String(row.workOrderId));
   if(order&&order.branch!==row.branch)throw new Error('Procurement branch must match the linked work order.');
  }
  if(!same(old,row)&&!inBranch(user,key,row,merged.data))throw new Error('This record is outside your assigned branches.');
 }
 for(const order of merged.data.orders){
  if(!order.examId)continue;
  const exam=merged.data.exams.find(exam=>String(exam.id)===String(order.examId));
  if(!exam||String(exam.customerId)!==String(order.customerId)||examBranch(exam,merged.data)!==order.branch)throw new Error('Choose an Eye Exam matching the work order customer and branch.');
 }
 for(const exam of merged.data.exams){
  if(exam.source==='work-order'&&!current.data.exams.some(previous=>String(previous.id)===String(exam.id))&&!isLinkedPrescriptionUpload(exam,merged,current,user))throw new Error('Prescription uploads must be linked to their work order.');
 }
 validateNewTreasuryTransfers(current.data,merged.data);
 validateSnapshot(merged);
 return merged;
}
