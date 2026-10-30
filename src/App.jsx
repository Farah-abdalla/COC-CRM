import BranchInventory from './BranchInventory';
import PersonalWorkspace from './PersonalWorkspace';
import AttendancePanel from './AttendancePanel';
import {isPersonalAccount} from './personalAccess';
import TodaySalesDashboard from './TodaySalesDashboard';
import './branchLocations.css';
import {branchLocationRecord,branchMapUrl} from './branchLocations';
import sidebarCocLogo from './assets/sidebar-coc-logo.jpg';
import {prepareExamImage} from './prescriptionImage';
import {prescriptionExam,prescriptionAlerts,examBranch} from './prescriptions';
import {LanguageSwitch} from './i18n';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import {invoicePaymentEvent,requireTreasuryAccount} from './paymentMethods';
import {invoiceItemFingerprint} from './invoiceItems';
import TasksPage from './TasksPage';
import ReportsPage from './ReportsPage';
import HRSystem,{useHR} from './HRSystem';
import './workspace.css';
import {overdueTaskNotifications} from './taskDeadlines';
import ExpensesPage from './ExpensesPage';
import PaymentsPage from './PaymentsPage';
import TreasuryPage from './TreasuryPage';
import {useAuth} from './Auth';
import AccountManagement,{MyAccount} from './AccountManagement';
import DataStorage from './DataStorage';
import OdooPage from './OdooPage';
import {useDataStorage} from './useDataStorage';
import './storage.css';
import CreditNotePage from './CreditNotePage';
import { refundedAmount, refundableAmount, nextCreditNumber, invoiceRefundItem, itemRefundPlan } from './creditNotes';
import { invoiceAmounts } from './invoiceAmounts';
import IncentivePage from './IncentivePage';
import { workOrderStage } from './workOrderStages';
import RecordPage from './RecordPages';
import { getTransferTotals, getAvailableMatrixEdits, getAvailableInventoryItems, prepareStockTransfer } from './transferData';
import { inventoryMatrices } from './inventoryData';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, Glasses, ShieldCheck, Eye, Store, Search, Plus, Bell, Menu, X, Pencil, Trash2, Phone, LogOut, Activity, ShoppingBag, ClipboardList, CheckCircle2, XCircle, Package, ArrowLeft, Boxes, FileText, ArrowLeftRight, BadgePercent, ReceiptText, Database, Wallet, BriefcaseBusiness, Landmark, ChevronDown } from 'lucide-react';

const BranchLocationPicker=React.lazy(()=>import('./BranchLocationPicker.jsx'));
const procurementStatuses = ['Pending','Ordered','Received','Cancelled'];
const workOrderNumber = order => order.number||'WO-'+order.id;
const getLinkedWorkOrder = (record,orders) => record.workOrderId
  ? orders.find(order=>String(order.id)===String(record.workOrderId))
  : orders.find(order=>workOrderNumber(order).trim().toLowerCase()===String(record.woNumber||'').trim().toLowerCase());
const syncProcurementRecords = (records,orders) => {
  const synced=records.map(record=>{
    const order=getLinkedWorkOrder(record,orders);
    if(!order)return record;
    const status=workOrderStage(order.status),woNumber=workOrderNumber(order);
    if(String(record.workOrderId)===String(order.id)&&record.status===status&&record.woNumber===woNumber)return record;
    return {...record,workOrderId:order.id,woNumber,status};
  });
  return synced.every((record,index)=>record===records[index])?records:synced;
};
const inventoryCategories = ['Infrared 1.60 Minus','Infrared 1.60 Plus','HMC 1.56 Minus','HMC 1.56 Plus'];
const inventoryCategoryLabel = category => category==='Frames'?'Frames':category?'Vegas '+category:'';
const money = n => new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(Number(n)||0);

const localToday = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-'); };
const salesProfit = record => Number(record.price || 0) - Number(record.amountOfBill || 0);
const salesProfitPercentage = record => Number(record.price || 0) > 0 ? `${(salesProfit(record) / Number(record.price) * 100).toFixed(2)}%` : '—';

const hasDuplicateWo = (records, woNumber, editingId) => {
  const normalized = String(woNumber || '').trim().toLowerCase();
  return records.some(record => record.id !== editingId && String(record.woNumber || '').trim().toLowerCase() === normalized);
};

const filterSalesByDate = (records, startDate, endDate) => records.filter(record => {
  if(!startDate&&!endDate)return true;
  return Boolean(record.date)&&(!startDate||record.date>=startDate)&&(!endDate||record.date<=endDate);
});

const getVendorTransactions = (manualTransactions, salesRecords) => [
  ...manualTransactions,
  ...salesRecords.filter(record=>Number(record.amountOfBill||0)>0).map(record=>({
    id:'sales-'+record.id,sourceSalesId:record.id,date:record.date||'',transactionType:'Bill',
    vendorName:record.vendorName||'',amount:Number(record.amountOfBill),payments:0,woNumber:record.woNumber||'',workOrderId:record.workOrderId||'',reference:record.woNumber||'Sales record',description:record.description||record.notes||record.typeOfSales||''
  }))
];
const isVendorReduction = type => type==='Payment'||type==='Credit';
const buildVendorStatement = (transactions, openingBalance=0) => {
  let balanceCents=Math.round(openingBalance*100), amountCents=0, paymentCents=0;
  const rows=[...transactions].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id).localeCompare(String(b.id),undefined,{numeric:true})).map(record=>{
    const bill=record.transactionType==='Bill'?Math.round(Number(record.amount||0)*100):0;
    const payment=isVendorReduction(record.transactionType)?Math.round(Number(record.payments||0)*100):0;
    amountCents+=bill;paymentCents+=payment;balanceCents+=bill-payment;
    return {...record,amount:bill/100,payments:payment/100,balance:balanceCents/100};
  });
  return {rows,openingBalance,totalAmount:amountCents/100,totalPayments:paymentCents/100,balance:balanceCents/100};
};

const vendorKey = name => String(name||'').trim().toLowerCase();
const getVendorReport = (transactions,startDate,endDate) => {
  if(startDate&&endDate&&startDate>endDate)return buildVendorStatement([]);
  const openingBalance=startDate?buildVendorStatement(transactions.filter(record=>record.date&&record.date<startDate)).balance:0;
  return buildVendorStatement(filterSalesByDate(transactions,startDate,endDate),openingBalance);
};

const getOrderStockCheck = (order,matrices,edits={}) => {
  if(order.lensType!=='Standard'||!['Prescription glasses','Lenses only'].includes(order.product))return {complete:false,groups:[],anyAvailable:false,allAvailable:false};
  const matrix=matrices[order.lensCategory];
  if(!matrix)return {complete:false,groups:[],anyAvailable:false,allAvailable:false};
  const eyes=order.lensEyes==='Right'?['right']:order.lensEyes==='Left'?['left']:['right','left'];
  const groups=[];
  for(const eye of eyes){
    const sph=order[eye+'Sph'],cyl=order[eye+'Cyl'];
    if(sph===undefined||cyl===undefined||String(sph).trim()===''||String(cyl).trim()===''||!Number.isFinite(Number(sph))||!Number.isFinite(Number(cyl)))return {complete:false,groups:[],anyAvailable:false,allAvailable:false};
    const r=matrix.rows.findIndex(value=>Number(value)===Number(sph));
    const c=matrix.columns.findIndex(value=>Number(value)===Number(cyl));
    const key=r+':'+c;
    const existing=groups.find(group=>group.sph===Number(sph)&&group.cyl===Number(cyl));
    if(existing){existing.needed++;existing.eyes.push(eye);continue;}
    const override=edits[order.lensCategory]||{};
    const raw=r<0||c<0?0:Object.prototype.hasOwnProperty.call(override,key)?override[key]:matrix.values[r][c];
    groups.push({sph:Number(sph),cyl:Number(cyl),needed:1,eyes:[eye],quantity:Math.max(0,Number(raw)||0),matched:r>=0&&c>=0});
  }
  return {complete:true,groups,anyAvailable:groups.some(group=>group.quantity>0),allAvailable:groups.every(group=>group.quantity>=group.needed)};
};
const getStandardSalesFamily = type => {
  const name=String(type||'').trim().toLowerCase();
  if(!/stand(?:ard|erd)/.test(name))return '';
  if(name.includes('hmc'))return 'HMC 1.56';
  if(name.includes('infrared'))return 'Infrared 1.60';
  return '';
};
const getSalesStockCheck = (record,matrices,edits={}) => {
  const family=getStandardSalesFamily(record.typeOfSales);
  if(!family||!String(record.lensCategory||'').startsWith(family+' '))return {complete:false,groups:[],anyAvailable:false,allAvailable:false};
  return getOrderStockCheck({...record,product:'Prescription glasses',lensType:'Standard'},matrices,edits);
};
const shouldNotifySalesStock = record => Boolean(getStandardSalesFamily(record.typeOfSales))&&Boolean(String(record.vendorName||'').trim())&&!/\bvegas\b/i.test(String(record.vendorName));
const salesStockMessage = (record,check) => 'This lens is available in Vegas stock. Why was it not ordered from Vegas? '+inventoryCategoryLabel(record.lensCategory)+'. '+check.groups.filter(group=>group.quantity>0).map(group=>'SPH '+group.sph.toFixed(2)+' / CYL '+group.cyl.toFixed(2)+': '+group.quantity+' available, '+group.needed+' needed').join('; ');

const examPrescription = exam => ({rightSph:exam.rightSph??exam.rightEye??'',rightCyl:exam.rightCyl??'',rightAxis:exam.rightAxis??'',rightAdd:exam.rightAdd??'',leftSph:exam.leftSph??exam.leftEye??'',leftCyl:exam.leftCyl??'',leftAxis:exam.leftAxis??'',leftAdd:exam.leftAdd??'',ipd:exam.ipd??''});


export default function App(){
  useUiLanguage();

  const auth=useAuth(),personal=isPersonalAccount(auth.user);
  const hr=useHR(auth.can('HR System'));
  const hrUnread=(hr.result?.data.notifications||[]).filter(n=>!n.readBy.includes(auth.user.id));
  const hrAlerts=hr.result?.alerts||[];
  const workspaceKey = 'coc-crm-workspace-' + auth.user.id;
  const [workspace,setWorkspace] = useState(()=>{
    try{return localStorage.getItem(workspaceKey)==='lensko'?'lensko':'coc';}catch{return 'coc';}
  });
  const workspaceName = workspace==='lensko'?'Lensko':'COC';
  const workspaceLabel = workspace==='lensko'?'Lensko B2B':'COC';
  function changeWorkspace(value){
    if(value!=='coc'&&value!=='lensko')return;
    setWorkspace(value);
    try{localStorage.setItem(workspaceKey,value);}catch{}
    setPage(personal?'My workspace':auth.can('Dashboard Analytics')?'Dashboard Analytics':'My account');
    setMobileNav(false);setSearch('');setExamQuery('');setModal(null);
    setCreditInvoiceId('');setFocusedInvoiceId('');setFocusedWorkOrderId('');
    setShowStockNotifications(false);
  }
  const [data,setData] = useState(()=>auth.initial.snapshot.data);
  const [page,setPage] = useState(()=>personal?'My workspace':auth.can('Dashboard Analytics')?'Dashboard Analytics':auth.user.isAdmin?'Accounts & permissions':'My account');
  const [salesNavOpen,setSalesNavOpen]=useState(true);
  const [inventoryNavOpen,setInventoryNavOpen]=useState(true);
  const [hrNavOpen,setHrNavOpen]=useState(true);
  const [workOrdersNavOpen,setWorkOrdersNavOpen]=useState(true);
  const [procurementNavOpen,setProcurementNavOpen]=useState(true);
  const [creditInvoiceId,setCreditInvoiceId]=useState('');
  const [focusedInvoiceId,setFocusedInvoiceId]=useState('');
  const [focusedWorkOrderId,setFocusedWorkOrderId]=useState('');
  const displayInvoices=data.invoices.map(invoice=>({...invoice,refundedAmount:refundedAmount(invoice.id,data.creditNotes),remainingReturnQuantity:invoiceRefundItem(invoice,data.creditNotes).remainingQuantity,returnedQuantity:invoiceRefundItem(invoice,data.creditNotes).returnedQuantity}));
  const [search,setSearch] = useState('');
  const [examQuery,setExamQuery]=useState('');
  const [selectedVendor,setSelectedVendor] = useState('all');
  const [vendorStartDate,setVendorStartDate] = useState('');
  const [vendorEndDate,setVendorEndDate] = useState('');
  const [salesStartDate,setSalesStartDate] = useState('');
  const [salesEndDate,setSalesEndDate] = useState('');
  const invalidSalesRange = Boolean(salesStartDate&&salesEndDate&&salesStartDate>salesEndDate);
  const reportSales = filterSalesByDate(syncProcurementRecords(data.salesRecords,data.orders),salesStartDate,salesEndDate);
  const [modal,setModal] = useState(null);
  const [editing,setEditing] = useState(null);
  const [mobileNav,setMobileNav] = useState(false);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(()=>{
    if(!mobileNav)return;
    const desktop=window.matchMedia('(min-width: 1025px)');
    if(desktop.matches){setMobileNav(false);return;}
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusable=()=>[...sidebarRef.current.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex="0"]')];
    focusable()[0]?.focus();
    const onKeyDown=event=>{
      if(event.key==='Escape'){setMobileNav(false);return;}
      if(event.key!=='Tab')return;
      const controls=focusable(),first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    const onResize=()=>{if(desktop.matches)setMobileNav(false);};
    document.addEventListener('keydown',onKeyDown);
    desktop.addEventListener('change',onResize);
    return ()=>{
      document.body.style.overflow=previousOverflow;
      document.removeEventListener('keydown',onKeyDown);
      desktop.removeEventListener('change',onResize);
      menuRef.current?.focus();
    };
  },[mobileNav]);
  const [notice,setNotice] = useState('');
  const [showStockNotifications,setShowStockNotifications] = useState(false);
  const [taskClock,setTaskClock]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setTaskClock(new Date()),30000);const focus=()=>setTaskClock(new Date());window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[]);
  const overdueTasks=overdueTaskNotifications(data.tasks||[],auth.user.id,taskClock);
  const prescriptionReminders=prescriptionAlerts(data,auth.user,taskClock);
  const [form,setForm] = useState({});
  const [examImagePreview,setExamImagePreview] = useState(null);
  const [examImageLoading,setExamImageLoading] = useState(false);
  const [examImageError,setExamImageError] = useState('');
  const examImageRequest=useRef(0);
  const [inventoryCategory,setInventoryCategory] = useState('');
  const [inventoryView,setInventoryView]=useState('frames');
  const [matrixEdits,setMatrixEdits] = useState(()=>auth.initial.snapshot.matrixEdits);
  const storage=useDataStorage(data,matrixEdits,setData,setMatrixEdits);
  const transferTotals=useMemo(()=>getTransferTotals(data.transfers),[data.transfers]);
  const availableMatrixEdits=useMemo(()=>getAvailableMatrixEdits(matrixEdits,transferTotals,inventoryMatrices),[matrixEdits,transferTotals]);
  const availableInventoryItems=useMemo(()=>getAvailableInventoryItems(data.inventoryItems,transferTotals),[data.inventoryItems,transferTotals]);
  const getMatrixValue=(category,r,c)=>Object.prototype.hasOwnProperty.call(availableMatrixEdits[category]||{},`${r}:${c}`)?availableMatrixEdits[category][`${r}:${c}`]:inventoryMatrices[category].values[r][c];
  const matrixTotal=category=>inventoryMatrices[category].values.reduce((sum,row,r)=>sum+row.reduce((sub,_,c)=>sub+Number(getMatrixValue(category,r,c)||0),0),0);
  const updateMatrixCell=(category,row,column,text)=>{
    if(text!==''&&(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))))return;
    const transferred=transferTotals.matrix.get(category+'|'+row+':'+column)||0;
    const value=text===''?null:Number(text)+transferred;
    if(value!==null&&!Number.isSafeInteger(value))return;
    const next={...matrixEdits,[category]:{...(matrixEdits[category]||{}),[row+':'+column]:value}};
    storage.commit({data,matrixEdits:next});
  };
  const linkedProcurementOrder=getLinkedWorkOrder(form,data.orders);
  const salesStockCheck=getSalesStockCheck(form,inventoryMatrices,availableMatrixEdits);
  const salesLensFamily=getStandardSalesFamily(form.typeOfSales);
  const salesStockAlerts=data.salesRecords.filter(shouldNotifySalesStock).map(record=>({record,check:getSalesStockCheck(record,inventoryMatrices,availableMatrixEdits)})).filter(alert=>alert.check.anyAvailable);
  const save = next => {
    next={...next,salesRecords:syncProcurementRecords(next.salesRecords,next.orders)};
    return storage.commit({data:next,matrixEdits});
  };
  const flash = msg => { setNotice(msg); window.setTimeout(()=>setNotice(''),2400); };
  const vendorTransactions = getVendorTransactions(data.vendorTransactions,data.salesRecords);
  const vendorNames = new Map();
  [...data.salesRecords,...vendorTransactions].forEach(record=>{
    const key=vendorKey(record.vendorName);
    if(!vendorNames.has(key))vendorNames.set(key,String(record.vendorName||'').trim()||'Unassigned vendor');
  });
  const vendorGroups = [...vendorNames].sort((a,b)=>a[1].localeCompare(b[1])).filter(([key])=>selectedVendor==='all'||selectedVendor==='vendor:'+key).map(([key,name])=>({key,name,transactions:vendorTransactions.filter(record=>vendorKey(record.vendorName)===key)}));
  const customers = data.customers;
  const customerName = id => customers.find(c=>String(c.id)===String(id))?.name || 'Unknown customer';
  const examRows=data.exams.map(exam=>{const linkedWorkOrders=data.orders.filter(order=>String(order.examId||'')===String(exam.id)||String(order.id)===String(exam.workOrderId||''));return {...exam,branch:examBranch(exam,data),linkedWorkOrders,workOrderNumber:exam.workOrderId?workOrderNumber(data.orders.find(order=>String(order.id)===String(exam.workOrderId))||{id:exam.workOrderId}):''};}).filter(exam=>[customerName(exam.customerId),exam.workOrderNumber,...exam.linkedWorkOrders.map(workOrderNumber)].some(value=>String(value||'').toLowerCase().includes(examQuery.trim().toLowerCase())));
  const filteredCustomers = useMemo(()=>customers.filter(c=>[c.name,c.phone,c.email,c.branch].join(' ').toLowerCase().includes(search.toLowerCase())),[customers,search]);
  const nav = (personal?[['My workspace',LayoutDashboard],['Invoice List',FileText],['HR System',Activity],['Incentive',BadgePercent],['Tasks',CheckCircle2],['My account',Users]]:[['Dashboard Analytics',LayoutDashboard],...(auth.user.isAdmin?[['Items',Package]]:[]),['Customers',Users],['Invoice List',FileText],['Payments',Wallet],['Credit Note',ReceiptText],['Work Orders',ClipboardList],['Eye Exams',Eye],['Check Before Order',CheckCircle2],['Procurement',ClipboardList],['Vendor Statement',FileText],['Expenses',ReceiptText],['Treasury',Landmark],['Inventory',Package],['Transfers',ArrowLeftRight],['Incentive',BadgePercent],['Tasks',CheckCircle2],['HR System',Activity],['Reports',FileText],['Branches',Store],['Data storage',Database],...(auth.user.isAdmin?[['Odoo',Database],['Accounts & permissions',ShieldCheck]]:[]),['My account',Users]]).filter(([label])=>label==='My workspace'||label==='My account'||label==='Accounts & permissions'||(['Odoo','Items'].includes(label)&&auth.user.isAdmin)||auth.can(label));
  const navPageLabel=label=>personal?({'Invoice List':'My sales','HR System':'My attendance',Incentive:'My commissions',Tasks:'My tasks'}[label]||label):label==='HR System'?'Attendance':label;
  const procurementPages=['Procurement','Vendor Statement'];
  const procurementNav=nav.filter(([label])=>procurementPages.includes(label));
  useEffect(()=>{if(procurementPages.includes(page))setProcurementNavOpen(true);},[page]);
  const workOrderPages=['Work Orders','Eye Exams','Check Before Order'];
  const workOrderNav=nav.filter(([label])=>workOrderPages.includes(label));
  useEffect(()=>{if(workOrderPages.includes(page))setWorkOrdersNavOpen(true);},[page]);
  const hrPages=['Incentive','Tasks','HR System'];
  const hrNav=nav.filter(([label])=>hrPages.includes(label));
  useEffect(()=>{if(hrPages.includes(page))setHrNavOpen(true);},[page]);
  const inventoryPages=['Inventory','Transfers'];
  const inventoryNav=nav.filter(([label])=>inventoryPages.includes(label));
  useEffect(()=>{if(inventoryPages.includes(page)||page==='Inventory Category')setInventoryNavOpen(true);},[page]);
  const salesPages=['Customers','Invoice List','Payments','Credit Note'];
  const salesNav=nav.filter(([label])=>salesPages.includes(label));
  useEffect(()=>{if(salesPages.includes(page))setSalesNavOpen(true);},[page]);
  const navButton=(label,Icon,child=false)=><button key={label} type="button" className={`nav-item ${child?'nav-child ':''}${page===label||(label==='Reports'&&['New report','Report builder'].includes(page))||(label==='Inventory'&&page==='Inventory Category')?'active':''}`} aria-current={page===label?'page':undefined} onClick={()=>{setPage(label);setMobileNav(false);setSearch('');setCreditInvoiceId('');setFocusedInvoiceId('');}}><Icon size={child?16:18}/><span>{uiT(navPageLabel(label))}</span>{label==='Customers'&&<span className="nav-count">{customers.length}</span>}</button>;
  const allowedPage=page==='My workspace'||page==='My account'||(['Accounts & permissions','Odoo','Items'].includes(page)&&auth.user.isAdmin)||auth.can(['New report','Report builder'].includes(page)?'Reports':page==='Inventory Category'?'Inventory':page);
  useEffect(()=>{if(!allowedPage){setPage(personal?'My workspace':'My account');setModal(null);setShowStockNotifications(false);}},[allowedPage]);
  function openForm(type,item=null){
    const module={customer:'Customers',exam:'Eye Exams',salesRecord:'Procurement',vendorTransaction:'Vendor Statement',inventoryItem:'Inventory',branch:'Branches'}[type];
    if(module&&!auth.can(module,item?'edit':'add')){window.alert(uiT('You do not have permission to '+(item?'edit':'add')+' records in '+module+'.'));return;}
    examImageRequest.current++;setExamImageLoading(false);setExamImageError('');
    setModal(type); setEditing(item);
    setForm(item?{...item,...(type==='exam'?examPrescription(item):{})}:type==='customer'?{name:'',phone:'',email:'',branch:data.branches[0]||'',joined:new Date().toISOString().slice(0,10),notes:''}:type==='exam'?{customerId:customers[0]?.id||'',date:localToday(),rightSph:'',rightCyl:'',rightAxis:'',rightAdd:'',leftSph:'',leftCyl:'',leftAxis:'',leftAdd:'',ipd:'',examImage:null,notes:''}:type==='salesRecord'?{branch:data.branches[0]||'',lensCategory:'',lensEyes:'Both',rightSph:'',rightCyl:'',leftSph:'',leftCyl:'',date:localToday(),woNumber:'',workOrderId:'',status:'Pending',typeOfSales:'',price:'',amount:'',vendorName:'',amountOfBill:'',salesProfit:''}:type==='vendorTransaction'?{vendorName:vendorNames.get(selectedVendor.slice(7))==='Unassigned vendor'?'':vendorNames.get(selectedVendor.slice(7))||'',date:localToday(),transactionType:'Bill',amount:'',payments:'',woNumber:'',reference:'',description:''}:type==='inventoryItem'?{date:localToday(),category:inventoryCategory,itemName:'',sku:'',quantity:'',minQuantity:'',unitPrice:'',branch:data.branches[0]||''}:{name:''});
  }
  const updateField=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function uploadExamImage(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const request=++examImageRequest.current;setExamImageLoading(true);setExamImageError('');
    try{const image=await prepareExamImage(file);if(request===examImageRequest.current)setForm(current=>({...current,examImage:image}));}
    catch(error){if(request===examImageRequest.current)setExamImageError(error.message||'Image upload failed. Please try again.');}
    finally{if(request===examImageRequest.current)setExamImageLoading(false);}
  }
  function submit(e){
    e.preventDefault();
    if(modal==='exam'&&examImageLoading)return;
    if(modal==='branch'){
      const name=(form.name||'').trim(); if(!name)return;
      if(data.branches.some(branch=>branch!==editing?.name&&branch.trim().toLowerCase()===name.toLowerCase())){flash('Branch already exists');return;}
      let location;try{location=branchLocationRecord(form,name,(data.branchLocations||[]).find(row=>row.branch===editing?.name)?.id||crypto.randomUUID());}catch(error){flash(error.message);return;}
      const branchLocations=(data.branchLocations||[]).filter(row=>row.branch!==(editing?.name||name));if(location)branchLocations.push(location);
      if(editing){
        save({...data,branchLocations,branches:data.branches.map(branch=>branch===editing.name?name:branch),treasuryTransfers:(data.treasuryTransfers||[]).map(record=>({...record,fromBranch:record.fromBranch===editing.name?name:record.fromBranch,toBranch:record.toBranch===editing.name?name:record.toBranch})),treasuryBalances:(data.treasuryBalances||[]).map(record=>record.branch===editing.name?{...record,branch:name}:record),expenses:(data.expenses||[]).map(record=>record.branch===editing.name?{...record,branch:name}:record),customers:data.customers.map(customer=>customer.branch===editing.name?{...customer,branch:name}:customer),transfers:data.transfers.map(transfer=>({...transfer,toBranch:transfer.toBranch===editing.name?name:transfer.toBranch,sourceBranch:transfer.sourceBranch===editing.name?name:transfer.sourceBranch})),inventoryItems:data.inventoryItems.map(item=>item.branch===editing.name?{...item,branch:name}:item)});
      } else save({...data,branchLocations,branches:[...data.branches,name]});
    } else {
      const key=modal==='customer'?'customers':modal==='exam'?'exams':modal==='salesRecord'?'salesRecords':modal==='vendorTransaction'?'vendorTransactions':'inventoryItems';
      let list=[...data[key]];
      const clean={...form,...(personal&&modal==='customer'?{createdBy:editing?.createdBy||auth.user.id}:{})};
      if(modal==='exam') clean.customerId=Number(form.customerId);
      if(modal==='salesRecord') {
        const linkedOrder=getLinkedWorkOrder(clean,data.orders);
        if(clean.workOrderId&&!linkedOrder){flash('Choose an available work order or remove the link.');return;}
        clean.status=linkedOrder?(linkedOrder.status||'New'):(procurementStatuses.includes(form.status)?form.status:'Pending');
        if(linkedOrder){clean.workOrderId=linkedOrder.id;clean.woNumber=workOrderNumber(linkedOrder);clean.branch=linkedOrder.branch||'';}
        if(!data.branches.includes(clean.branch)){flash('Choose a branch from your assigned locations.');return;}
        const stockCheck=getSalesStockCheck(clean,inventoryMatrices,availableMatrixEdits);
        if(getStandardSalesFamily(clean.typeOfSales)&&!stockCheck.complete){flash('Select Minus or Plus and enter SPH and CYL for each selected eye.');return;}
        if(shouldNotifySalesStock(clean)&&stockCheck.anyAvailable&&!window.confirm(uiT(salesStockMessage(clean,stockCheck)+' Save this sales record anyway?')))return;
        clean.woNumber=String(clean.woNumber||'').trim();
        if(!clean.woNumber){window.alert(uiT('Please enter a WO Number.'));return;}
        if(hasDuplicateWo(data.salesRecords,clean.woNumber,editing?.id)){
          window.alert(uiT(`WO Number "${clean.woNumber}" already exists. This record will still be saved.`));
        }
        ['price','amount','amountOfBill'].forEach(k=>clean[k]=Number(form[k]||0));
        clean.salesProfit=salesProfit(clean);
      }
      if(modal==='vendorTransaction'){
        delete clean.balance;
        clean.vendorName=String(form.vendorName||'').trim();
        if(!clean.vendorName){flash('Please enter a vendor name.');return;}
        const value=Number(form.transactionType==='Bill'?form.amount:form.payments);
        if(!form.date||!['Bill','Payment','Credit'].includes(form.transactionType)||!Number.isFinite(value)||value<=0){flash('Enter a date and an amount greater than zero.');return;}
        clean.amount=clean.transactionType==='Bill'?Math.round(value*100)/100:0;
        clean.payments=isVendorReduction(clean.transactionType)?Math.round(value*100)/100:0;
      }
      if(modal==='inventoryItem'){['quantity','minQuantity','unitPrice'].forEach(k=>clean[k]=Number(form[k]||0));if(editing)clean.quantity+=transferTotals.items.get(String(editing.id))||0;}
      if(editing) list=list.map(x=>x.id===editing.id?{...clean,id:editing.id}:x);
      else list.unshift({...clean,id:Date.now()});
      if(!save({...data,[key]:list}))return;
    }
    setModal(null); setEditing(null); flash('Saved successfully');
  }
  function transferStock(form){
    try{
      const transfer=prepareStockTransfer(form,data.branches,availableMatrixEdits,availableInventoryItems,inventoryMatrices);
      if(!save({...data,transfers:[{...transfer,id:crypto.randomUUID()},...data.transfers]}))return false;
      flash('Transfer saved. Inventory reduced by '+transfer.quantity+' units.');return true;
    }catch(error){return error.message||'Transfer could not be saved.';}
  }
  function removeBranch(name){
    if((data.treasuryTransfers||[]).some(record=>record.fromBranch===name||record.toBranch===name)){window.alert(uiT('Branches with treasury transfers cannot be deleted.'));return;}
    if(!window.confirm(uiT('Delete branch "'+name+'"? Customer and inventory records will be kept with their branch unassigned.')))return;
    save({...data,branchLocations:(data.branchLocations||[]).filter(row=>row.branch!==name),branches:data.branches.filter(branch=>branch!==name),treasuryBalances:(data.treasuryBalances||[]).filter(record=>record.branch!==name),customers:data.customers.map(customer=>customer.branch===name?{...customer,branch:''}:customer),inventoryItems:data.inventoryItems.map(item=>item.branch===name?{...item,branch:''}:item)});
    flash('Branch deleted');
  }
  async function linkOdooSales(filters,number=''){
    const result=await storage.importOdooInvoices(filters);
    const linked=number?result.linkedInvoices.find(invoice=>invoice.number===number):null;
    if(number&&!linked)throw new Error(result.skipped.find(invoice=>invoice.number===number)?.reason||'The Odoo invoice could not be linked.');
    setFocusedInvoiceId(linked?.id||'');setPage('Invoice List');
    flash('Odoo sales linked to Invoice List.');
    return result;
  }
  function invoiceEvent(invoiceId,action,description,amount){
    return {id:crypto.randomUUID(),invoiceId,action,description,amount,timestamp:new Date().toISOString()};
  }
  function invoiceAction(invoiceId,type,payload={}){
    const invoice=data.invoices.find(item=>String(item.id)===String(invoiceId));
    if(!invoice)return 'Invoice not found.';
    let updated={...invoice},event;
    const current={...invoice,refundedAmount:refundedAmount(invoice.id,data.creditNotes)};
    if(type==='lock'){
      updated.locked=!invoice.locked;
      event=invoiceEvent(invoice.id,updated.locked?'Invoice locked':'Invoice unlocked','Invoice editing '+(updated.locked?'disabled.':'enabled.'));
    }else{
      if(invoice.locked)return 'Unlock this invoice before making changes.';
      if(invoice.isVoided)return 'This invoice has been voided.';
      if(type==='payment'){
        if(invoice.odooPaymentUnverified)return 'Reconcile opening payments in Edit before recording a payment.';
        const cents=Math.round(Number(payload.amount)*100),balance=Math.round(invoiceAmounts(current).balance*100);
        if(!Number.isFinite(cents)||cents<=0||cents>balance)return 'Payment must be greater than zero and no more than the balance due.';
        updated.paid=(Math.round(Number(invoice.paid||0)*100)+cents)/100;
        try{event=invoicePaymentEvent(invoice,cents,{...payload,method:payload.method||'Cash',customerName:customerName(invoice.customerId)});}catch(error){return error.message;}
      }else if(type==='void'){
        if(Number(invoice.paid)>0||current.refundedAmount>0)return 'Invoices with payments or credit notes cannot be voided. Use Refund instead.';
        if(!String(payload.reason||'').trim())return 'Enter a reason for voiding.';
        updated.isVoided=true;updated.voidReason=String(payload.reason).trim();updated.voidedAt=new Date().toISOString();
        event=invoiceEvent(invoice.id,'Invoice voided',updated.voidReason);
      }else return 'Unknown invoice action.';
    }
    if(!save({...data,invoices:data.invoices.map(item=>item.id===invoice.id?updated:item),invoiceEvents:[event,...data.invoiceEvents]}))return 'The invoice action could not be saved.';
    flash(event.action);return true;
  }
  function recordRefund(invoiceId,selection,reason){
    const invoice=data.invoices.find(item=>String(item.id)===String(invoiceId));
    if(!invoice)return 'The invoice is no longer available.';
    if(invoice.locked||invoice.isVoided)return 'Unlock an active invoice before recording a refund.';
    const current={...invoice,refundedAmount:refundedAmount(invoice.id,data.creditNotes)};
    const plan=itemRefundPlan(current,data.creditNotes,selection?.items||selection?.quantity);
    if(plan.error)return plan.error;
    const cents=Math.round(plan.amount*100);
    if(!String(reason||'').trim())return 'Enter a reason for the refund.';
    let refundAccount;try{refundAccount=requireTreasuryAccount(selection?.method||'Cash',selection?.treasuryCategory||'');}catch(error){return error.message;}
    const note={id:crypto.randomUUID(),number:nextCreditNumber(data.creditNotes,invoice.branch),invoiceId:invoice.id,invoiceNumber:invoice.number||'INV-'+invoice.id,customerId:invoice.customerId,customerName:customerName(invoice.customerId),branch:invoice.branch||'',date:localToday(),method:selection?.method||'Cash',treasuryCategory:refundAccount,amount:cents/100,items:plan.items,reason:String(reason).trim(),salesPerson:invoice.salesPerson||'',sku:invoice.sku||''};
    if(!save({...data,creditNotes:[note,...data.creditNotes],invoiceEvents:[invoiceEvent(invoice.id,'Refund recorded',note.number+' — '+plan.items.map(item=>item.quantity+' × '+item.sku).join(', ')+' — '+note.reason,note.amount),...data.invoiceEvents]}))return 'The refund could not be saved.';
    flash('Refund recorded. Credit note '+note.number+' created.');return true;
  }
  function saveInvoice(record){
    delete record.refundedAmount;delete record.remainingReturnQuantity;delete record.returnedQuantity;
    const refunded=refundedAmount(record.id,data.creditNotes),original=data.invoices.find(item=>item.id===record.id);
    const hasItemReturns=data.creditNotes.some(note=>String(note.invoiceId)===String(record.id)&&note.items?.length);
    if(original&&hasItemReturns&&invoiceItemFingerprint(record)!==invoiceItemFingerprint(original)){window.alert(uiT('Invoice items cannot change after an item refund.'));return false;}
    if(original&&hasItemReturns&&['sku','quantity','total','discount'].some(field=>field==='sku'?String(record[field]||'')!==String(original[field]||''):Number(record[field]??(field==='quantity'?1:0))!==Number(original[field]??(field==='quantity'?1:0)))){
      window.alert(uiT('The item, quantity, subtotal, and discount cannot change after an item refund.'));return false;
    }
    if(original?.locked||original?.isVoided){window.alert(uiT('Unlock an active invoice before editing it.'));return false;}
    if(original){record.locked=original.locked||false;record.isVoided=original.isVoided||false;}
    if(refunded>0&&(Number(record.paid)<refunded||invoiceAmounts(record).total<refunded||String(record.customerId)!==String(original?.customerId))){
      window.alert(uiT('An invoice with refunds must keep its original customer, and its payment and total cannot be less than the refunded amount.'));return false;
    }
    if(record.workOrderId){
      const order=data.orders.find(item=>String(item.id)===String(record.workOrderId));
      if(!order||String(order.customerId)!==String(record.customerId)){window.alert(uiT('Select a work order for this customer.'));return false;}
      if(data.invoices.some(item=>item.id!==record.id&&String(item.workOrderId)===String(order.id))){window.alert(uiT('This work order is already linked to another invoice.'));return false;}
    }
    const paymentEvents=[],paidChange=Math.round(Number(record.paid||0)*100)-Math.round(Number(original?.paid||0)*100);
    if(paidChange!==0){try{paymentEvents.push(invoicePaymentEvent(record,paidChange,{method:record.paymentMethod||'',treasuryCategory:record.paymentTreasuryCategory||'',reference:original?'Invoice paid amount change':'Initial invoice payment',customerName:customerName(record.customerId)}));}catch(error){window.alert(uiT(error.message));return false;}}
    return save({...data,invoices:data.invoices.some(item=>item.id===record.id)?data.invoices.map(item=>item.id===record.id?record:item):[record,...data.invoices],invoiceEvents:[...paymentEvents,invoiceEvent(record.id,original?'Invoice updated':record.sourceInvoiceId?'Invoice cloned':'Invoice created',record.sourceInvoiceId?'Copied from '+(data.invoices.find(item=>item.id===record.sourceInvoiceId)?.number||record.sourceInvoiceId):record.number),...data.invoiceEvents]});
  }
  function saveWorkOrder(record){
    const {invoiceId,prescriptionUpload,prescriptionDate,...order}=record;
    let exams=data.exams;
    if(prescriptionUpload){
      try{const exam=prescriptionExam(order,prescriptionUpload,prescriptionDate,auth.user.id,crypto.randomUUID());order.examId=exam.id;exams=[exam,...exams];}
      catch(error){window.alert(uiT(error.message));return false;}
    }
    let invoices=data.invoices;
    if(Object.prototype.hasOwnProperty.call(record,'invoiceId')){
      const selected=invoiceId?data.invoices.find(item=>String(item.id)===String(invoiceId)):null;
      if(invoiceId&&(!selected||String(selected.customerId)!==String(order.customerId))){window.alert(uiT('Select an invoice for this customer.'));return false;}
      if(selected?.workOrderId&&String(selected.workOrderId)!==String(order.id)){window.alert(uiT('This invoice is already linked to another work order.'));return false;}
      invoices=data.invoices.map(item=>selected&&item.id===selected.id?{...item,workOrderId:order.id}:String(item.workOrderId)===String(order.id)?{...item,workOrderId:''}:item);
    }else if(data.invoices.some(item=>String(item.workOrderId)===String(order.id)&&String(item.customerId)!==String(order.customerId))){
      window.alert(uiT('Select a matching invoice before changing the customer.'));return false;
    }
    if(data.invoices.some(item=>(item.locked||item.isVoided)&&String(item.workOrderId||'')!==String(invoices.find(candidate=>candidate.id===item.id)?.workOrderId||''))){
      window.alert(uiT('Unlock an active invoice before changing its work order link.'));return false;
    }
    return save({...data,invoices,exams,orders:data.orders.some(item=>item.id===order.id)?data.orders.map(item=>item.id===order.id?order:item):[order,...data.orders]});
  }
  function createCustomer(customer){
    const id=Math.max(Date.now(),...data.customers.map(item=>Number(item.id)||0))+1;
    return save({...data,customers:[{...customer,id,...(personal?{createdBy:auth.user.id}:{})},...data.customers]})?id:null;
  }
  function removeCustomer(id){if(!window.confirm(uiT('Delete this customer and linked orders/exams?')))return;save({...data,customers:data.customers.filter(c=>c.id!==id),orders:data.orders.filter(o=>o.customerId!==id),exams:data.exams.filter(x=>x.customerId!==id)});flash('Customer deleted');}
  function removeItem(key,id){if(key==='invoices'&&data.invoices.find(item=>item.id===id)?.locked){flash('Unlock this invoice before deleting it.');return;}if(key==='invoices'&&data.creditNotes.some(note=>String(note.invoiceId)===String(id))){flash('This invoice has linked credit notes and cannot be deleted.');return;}if(!window.confirm(uiT('Delete this record?')))return;save({...data,[key]:data[key].filter(x=>x.id!==id)});flash('Record deleted');}
  const stats=[{label:'Total customers',value:customers.length,icon:Users,detail:'Registered customer profiles'},{label:'Procurement',value:data.salesRecords.length,icon:ClipboardList,detail:'Procurement records'},{label:'Eye exams',value:data.exams.length,icon:Eye,detail:'Saved exam records'},{label:'Branches',value:data.branches.length,icon:Store,detail:'Configured locations'}];
  return <div className="app-shell" data-personal={personal||undefined} data-workspace={workspace}>{storage.busy&&<div className="storage-blocked" role="status">{uiT("Connecting storage...")}</div>}
    <aside id="workspace-navigation" ref={sidebarRef} aria-label={uiT("Workspace navigation")} className={`sidebar ${mobileNav?'show':''}`}><div className="brand">{workspace==='coc'?<div className="sidebar-logo"><img src={sidebarCocLogo} alt="COC - Cairo Optical Center"/></div>:<><div className="brand-mark"><Glasses size={24}/></div><div><strong>{workspaceName}</strong><small>{uiT("B2B Management")}</small></div></>}<button className="icon-btn close-nav" aria-label={uiT("Close navigation")} onClick={()=>setMobileNav(false)}><X/></button></div><label className="workspace workspace-switch"><span className="status-dot" aria-hidden="true"/><span className="workspace-switch-label">{uiT("Choose workspace")}</span><select aria-label={uiT("Choose workspace")} value={workspace} onChange={event=>changeWorkspace(event.target.value)}><option value="coc">COC</option><option value="lensko">Lensko B2B</option></select></label><p className="nav-label">{uiT("WORKSPACE")}</p><nav>{nav.map(([label,Icon])=>{if(procurementPages.includes(label)){if(label!==procurementNav[0]?.[0])return null;return <div className="sidebar-nav-group" key="procurement"><button type="button" className={'nav-item nav-group-toggle '+(procurementPages.includes(page)?'group-active':'')} aria-expanded={procurementNavOpen} aria-controls="sidebar-procurement" onClick={()=>setProcurementNavOpen(open=>!open)}><ClipboardList size={18}/><span>{uiT('Procurement')}</span><ChevronDown size={16} className={'nav-group-chevron '+(procurementNavOpen?'expanded':'')}/></button><div id="sidebar-procurement" className="sidebar-subnav" hidden={!procurementNavOpen}>{procurementNav.map(([name,ChildIcon])=>navButton(name,ChildIcon,true))}</div></div>;}if(workOrderPages.includes(label)){if(label!==workOrderNav[0]?.[0])return null;return <div className="sidebar-nav-group" key="work-orders"><button type="button" className={'nav-item nav-group-toggle '+(workOrderPages.includes(page)?'group-active':'')} aria-expanded={workOrdersNavOpen} aria-controls="sidebar-work-orders" onClick={()=>setWorkOrdersNavOpen(open=>!open)}><ClipboardList size={18}/><span>{uiT('Work Orders')}</span><ChevronDown size={16} className={'nav-group-chevron '+(workOrdersNavOpen?'expanded':'')}/></button><div id="sidebar-work-orders" className="sidebar-subnav" hidden={!workOrdersNavOpen}>{workOrderNav.map(([name,ChildIcon])=>navButton(name,ChildIcon,true))}</div></div>;}if(hrPages.includes(label)){if(label!==hrNav[0]?.[0])return null;return <div className="sidebar-nav-group" key="hr"><button type="button" className={'nav-item nav-group-toggle '+(hrPages.includes(page)?'group-active':'')} aria-expanded={hrNavOpen} aria-controls="sidebar-hr" onClick={()=>setHrNavOpen(open=>!open)}><BriefcaseBusiness size={18}/><span>{uiT(personal?'My work':'HR Management')}</span><ChevronDown size={16} className={'nav-group-chevron '+(hrNavOpen?'expanded':'')}/></button><div id="sidebar-hr" className="sidebar-subnav" hidden={!hrNavOpen}>{hrNav.map(([name,ChildIcon])=>navButton(name,ChildIcon,true))}</div></div>;}if(inventoryPages.includes(label)){if(label!==inventoryNav[0]?.[0])return null;return <div className="sidebar-nav-group" key="inventory"><button type="button" className={'nav-item nav-group-toggle '+(inventoryPages.includes(page)||page==='Inventory Category'?'group-active':'')} aria-expanded={inventoryNavOpen} aria-controls="sidebar-inventory" onClick={()=>setInventoryNavOpen(open=>!open)}><Package size={18}/><span>{uiT('Inventory')}</span><ChevronDown size={16} className={'nav-group-chevron '+(inventoryNavOpen?'expanded':'')}/></button><div id="sidebar-inventory" className="sidebar-subnav" hidden={!inventoryNavOpen}>{inventoryNav.map(([name,ChildIcon])=>navButton(name,ChildIcon,true))}</div></div>;}if(!salesPages.includes(label))return navButton(label,Icon);if(label!==salesNav[0]?.[0])return null;return <div className="sidebar-nav-group" key="sales"><button type="button" className={'nav-item nav-group-toggle '+(salesPages.includes(page)?'group-active':'')} aria-expanded={salesNavOpen} aria-controls="sidebar-sales" onClick={()=>setSalesNavOpen(open=>!open)}><ShoppingBag size={18}/><span>{uiT('Sales')}</span><ChevronDown size={16} className={'nav-group-chevron '+(salesNavOpen?'expanded':'')}/></button><div id="sidebar-sales" className="sidebar-subnav" hidden={!salesNavOpen}>{salesNav.map(([name,ChildIcon])=>navButton(name,ChildIcon,true))}</div></div>;})}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>{uiT(personal?'Personal workspace':'Shared company storage')}</strong><p>{uiT(storage.status)}</p><button className="text-btn" onClick={()=>setPage(personal?'My account':'Data storage')}>{uiT(personal?'My account':'Storage options')}</button></div><button className="nav-item logout" onClick={storage.signOut}><LogOut size={18}/> {uiT("Sign out")}</button><div className="profile"><div className="avatar">{auth.user.name.split(' ').map(word=>word[0]).slice(0,2).join('').toUpperCase()}</div><div><strong>{auth.user.name}</strong><small>{auth.user.isOwner ? uiT('Owner') : auth.user.isAdmin ? uiT('Administrator') : uiT('Staff')}</small></div><span className="chevron">•••</span></div></div></aside>
    {mobileNav&&<div className="nav-overlay" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area" inert={mobileNav||undefined}><header className="topbar"><button ref={menuRef} className="icon-btn mobile-menu" aria-label={uiT("Open navigation")} aria-controls="workspace-navigation" aria-expanded={mobileNav} onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">{workspaceLabel}<span>/</span> <b>{uiT(navPageLabel(page))}</b></div><div className="top-actions"><LanguageSwitch/><button className={'storage-indicator '+(storage.error?'has-error':'')} onClick={()=>setPage(personal?'My account':'Data storage')} title={uiT(storage.error||storage.status)}>{storage.mode === 'online' ? uiT('Online') : uiT('This browser')} · {uiT(storage.status)}</button><div className="search-top"><Search size={16}/><input aria-label={uiT("Search customers")} placeholder={uiT("Search customers...")} value={search} onChange={e=>{setSearch(e.target.value);setPage('Customers')}}/></div><button className="icon-btn notification" title={uiT('Notifications')} aria-label={(salesStockAlerts.length+overdueTasks.length+prescriptionReminders.length+hrUnread.length+hrAlerts.length)+' '+uiT('Notifications')} aria-expanded={showStockNotifications} onClick={()=>setShowStockNotifications(value=>!value)}><Bell size={19}/>{salesStockAlerts.length+overdueTasks.length+prescriptionReminders.length+hrUnread.length+hrAlerts.length>0&&<span style={{position:'absolute',top:-3,right:-4,minWidth:17,height:17,borderRadius:9,background:'#c22b36',color:'#fff',fontSize:10,lineHeight:'17px',textAlign:'center'}}>{salesStockAlerts.length+overdueTasks.length+prescriptionReminders.length+hrUnread.length+hrAlerts.length}</span>}</button><div className="avatar">{uiT("AD")}</div></div></header>
    <div className="content" hidden={!allowedPage}>{overdueTasks.length>0&&<div className="order-stock-notice" role="status"><strong>{uiT('Missed tasks')}: {overdueTasks.length}</strong> <button className="text-btn" onClick={()=>setShowStockNotifications(true)}>{uiT('View notifications')}</button></div>}{prescriptionReminders.length>0&&<div className="order-stock-notice" role="status"><strong>{uiT('Prescriptions older than six months')}: {prescriptionReminders.length}</strong> <button className="text-btn" onClick={()=>setShowStockNotifications(true)}>{uiT('View notifications')}</button></div>}{showStockNotifications&&<section className="panel stock-notification-panel" aria-label={uiT("Notifications")}><div className="panel-head"><div><h2>{uiT("Notifications")}</h2><p>{salesStockAlerts.length} {uiT("sales records used another vendor while matching Vegas stock is available.")}</p></div><button className="icon-btn" aria-label={uiT("Close notifications")} onClick={()=>setShowStockNotifications(false)}><X size={18}/></button></div>{overdueTasks.length>0&&<><h3>{uiT('Missed tasks')}</h3>{overdueTasks.map(task=><div className="order-stock-notice" key={task.id}><strong>{task.title}</strong><p>{task.assigneeName} · {uiT('Deadline')}: {task.dueDate} · {uiT('Missed')}</p><button className="text-btn" onClick={()=>{setPage('Tasks');setShowStockNotifications(false);}}>{uiT('Review task')}</button></div>)}</>}{prescriptionReminders.length>0&&<><h3>{uiT('Prescriptions older than six months')}</h3>{prescriptionReminders.map(exam=><div className="order-stock-notice" key={exam.id}><strong>{customerName(exam.customerId)}</strong><p>{uiT(exam.branch)} · {uiT('Prescription date')}: {exam.date} · {uiT('Six-month review')}: {exam.reviewDate}</p><button className="text-btn" onClick={()=>{setPage('Eye Exams');setShowStockNotifications(false);if(exam.examImage)setExamImagePreview(exam.examImage);}}>{uiT('Review prescription')}</button></div>)}</>}<h3>{uiT('HR notifications')}</h3>{hr.error&&auth.can('HR System')&&<p className="account-error">{uiT(hr.error)}</p>}{[...hrUnread,...hrAlerts].map(n=><div className="order-stock-notice" key={'hr-'+n.id}><strong>{n.title}</strong>{n.date&&<p>{uiT('Expiry date')}: {n.date}</p>}<button className="text-btn" onClick={()=>{setPage('HR System');setShowStockNotifications(false);}}>{uiT('Review HR')}</button></div>)}<h3>{uiT('Stock notifications')}</h3>{salesStockAlerts.map(({record,check})=><div className="order-stock-notice" key={record.id}><strong>{uiT("WO: ")}{record.woNumber}</strong><p>{uiT(salesStockMessage(record, check))}</p><button className="text-btn" onClick={()=>{setPage('Procurement');setShowStockNotifications(false);openForm('salesRecord',record)}}>{uiT("Review sales record")}</button></div>)}{!salesStockAlerts.length&&<p className="muted">{uiT("No sales records need a Vegas stock warning.")}</p>}</section>}<div className="page-heading"><div><p className="eyebrow">{workspaceLabel} / {uiT("WORKSPACE")}</p><h1>{page==='Dashboard Analytics'?workspaceLabel+' — '+uiT(navPageLabel(page)):uiT(navPageLabel(page))}</h1><p className="muted">{uiT({ 'Dashboard Analytics': 'Here’s what’s happening across your optical stores.', Customers: 'Manage customer profiles and contact details.', 'Invoice List': 'Manage customer invoices, payments, and outstanding balances.', 'Payments': 'Review payments recorded against customer invoices.', 'Expenses': 'Branch expense management.', 'Treasury': 'Manage Cash, Bank, Instapay, Wallet, Purchases, and Expenses for each branch.', 'Tasks': 'Your task workspace.', 'HR System': 'Employee and human resources management.', 'Credit Note': 'Review customer credit notes and invoice references.', 'Work Orders': 'Follow every work order through preparation, production, shipping, and receipt.', 'Incentive': 'Review salesperson commissions and manage eligible items.', 'Eye Exams': 'Keep eye exam records linked to each customer.', Branches: 'Manage locations in your optical group.', 'Procurement': 'Compare sales types with vendor names and review bill amounts and profit.', 'Check Before Order': 'Enter a prescription to check Vegas lens availability before placing an order.', 'Transfers': 'View transfers between branches.', 'Vendor Statement': 'View vendor statements and account activity.', Inventory: 'Track stock for every branch and manage central lens inventory.', 'Inventory Category': `Manage stock for ${inventoryCategoryLabel(inventoryCategory)}.` }[page])}</p></div>{page==='Customers'&&auth.can('Customers','add')&&<button className="primary" onClick={()=>openForm('customer')}><Plus size={17}/> {uiT("Add customer")}</button>}{page==='Eye Exams'&&auth.can('Eye Exams','add')&&<button className="primary" onClick={()=>openForm('exam')}><Plus size={17}/> {uiT("Add eye exam")}</button>}{page==='Vendor Statement'&&auth.can('Vendor Statement','add')&&<button className="primary" onClick={()=>openForm('vendorTransaction')}><Plus size={17}/> {uiT("Add transaction")}</button>}{page==='Branches'&&auth.can('Branches','add')&&<button className="primary" onClick={()=>openForm('branch')}><Plus size={17}/> {uiT("Add branch")}</button>}{page==='Procurement'&&auth.can('Procurement','add')&&<button className="primary" onClick={()=>openForm('salesRecord')}><Plus size={17}/> {uiT("Add record")}</button>}{page==='Inventory Category'&&<div className="heading-actions"><button className="secondary" onClick={()=>{setPage('Inventory');setInventoryCategory('')}}><ArrowLeft size={16}/> {uiT("All categories")}</button><button className="primary" disabled={!auth.can('Inventory','add')} onClick={()=>openForm('inventoryItem')}><Plus size={17}/> {uiT("Add stock item")}</button></div>}</div>
    {page==='Accounts & permissions'&&auth.user.isAdmin&&<AccountManagement branches={data.branches} onSaved={()=>hr.refresh(true)}/>}
    {page==='My account'&&<MyAccount hr={hr}/>}
    {page==='My workspace'&&<PersonalWorkspace data={data} hr={hr} onNavigate={setPage} onOpenInvoice={id=>{setFocusedInvoiceId(id);setPage('Invoice List');}}/>}
    {!auth.user.isAdmin&&!auth.can(page==='Inventory Category'?'Inventory':page,'add')&&!auth.can(page==='Inventory Category'?'Inventory':page,'edit')&&!auth.can(page==='Inventory Category'?'Inventory':page,'delete')&&page!=='My account'&&<p className="access-notice">{uiT("You have view-only access to this page.")}</p>}
    {!auth.user.isAdmin&&auth.user.branches!=='all'&&['Inventory','Inventory Category','Check Before Order','Transfers'].includes(page)&&<p className="access-notice">{uiT("Central lens stock is restricted to accounts with all-branch access. Only assigned branch records are shown.")}</p>}
    {storage.error&&<div className="access-notice" role="alert">{uiT(storage.error)} <button className="text-btn" onClick={storage.download}>{uiT("Download unsaved backup")}</button> <button className="text-btn" onClick={storage.reloadOnline}>{uiT("Reload company records")}</button></div>}
    {['Reports','New report','Report builder'].includes(page)&&<ReportsPage view={page} onNavigate={setPage} data={{...data,inventoryItems:availableInventoryItems,salesRecords:syncProcurementRecords(data.salesRecords,data.orders)}} hr={hr} matrices={(auth.user.isAdmin||auth.user.branches==='all')?Object.fromEntries(Object.entries(inventoryMatrices).map(([category,matrix])=>[category,{...matrix,values:matrix.values.map((row,r)=>row.map((_,c)=>getMatrixValue(category,r,c)))}])):{}} onSave={customReports=>save({...data,customReports})} onSaveProducts={odooReportProducts=>save({...data,odooReportProducts})} storage={storage}/>}
    {page==='Data storage'&&<DataStorage storage={storage}/>}
    {page==='Odoo'&&auth.user.isAdmin&&<OdooPage key="odoo" onLinkSales={linkOdooSales}/>}
    {page==='Items'&&auth.user.isAdmin&&<OdooPage key="products" productsOnly/>}
    {page==='Treasury'&&<TreasuryPage transfers={data.treasuryTransfers||[]} onTransfer={record=>save({...data,treasuryTransfers:[record,...(data.treasuryTransfers||[])]})} expenses={data.expenses} onOpenExpenses={auth.can('Expenses')?()=>setPage('Expenses'):undefined} onChangePayment={(id,changes)=>storage.changePayment(id,changes,'Treasury')} onRemove={id=>save({...data,treasuryBalances:data.treasuryBalances.filter(record=>record.id!==id)})} branches={data.branches} balances={data.treasuryBalances||[]} invoices={data.invoices} events={data.invoiceEvents} creditNotes={data.creditNotes} onOpenInvoice={auth.can('Invoice List')?id=>{setFocusedInvoiceId(id);setPage('Invoice List');}:undefined} onSave={record=>save({...data,treasuryBalances:(data.treasuryBalances||[]).some(item=>item.id===record.id)?data.treasuryBalances.map(item=>item.id===record.id?record:item):[record,...(data.treasuryBalances||[])]})}/>}
    {page==='Payments'&&<PaymentsPage onChangePayment={(id,changes)=>storage.changePayment(id,changes,'Payments')} invoices={data.invoices} events={data.invoiceEvents} customers={data.customers} branches={data.branches} onOpenInvoice={auth.can('Invoice List')?id=>{setFocusedInvoiceId(id);setPage('Invoice List');}:undefined}/>}
    {page==='Expenses'&&<ExpensesPage branches={data.branches} records={data.expenses||[]} onSave={record=>save({...data,expenses:(data.expenses||[]).some(item=>item.id===record.id)?data.expenses.map(item=>item.id===record.id?record:item):[record,...(data.expenses||[])]})} onDelete={id=>save({...data,expenses:(data.expenses||[]).filter(record=>record.id!==id)})}/>}
    {page==='Tasks'&&<TasksPage records={data.tasks} branches={data.branches} onSave={task=>save({...data,tasks:[...data.tasks,task]})} onComplete={task=>save({...data,tasks:data.tasks.map(row=>row.id===task.id?{...row,status:'Done',completedAt:new Date().toISOString(),completedBy:auth.user.id}:row)})} now={taskClock} storage={storage}/ >}
    {page==='HR System'&&(personal?<AttendancePanel hr={hr} showHistory/>:<HRSystem hr={hr} onOpenBranches={auth.can('Branches')?()=>setPage('Branches'):undefined}/>)}
    {page==='Dashboard Analytics'&&<><TodaySalesDashboard/><div className="stat-grid">{stats.map(s=><div className="stat-card" key={s.label}><div className="stat-top"><span>{uiT(s.label)}</span><span className="stat-icon"><s.icon size={19}/></span></div><h2>{s.value}</h2><p>{uiT(s.detail)}</p></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>{uiT("Recent customers")}</h2><p>{uiT("Latest registered profiles")}</p></div><button className="text-btn" onClick={()=>setPage('Customers')}>{uiT("View all →")}</button></div><CustomerTable rows={[...customers].slice(0,5)} onEdit={c=>openForm('customer',c)} onDelete={removeCustomer}/></section><section className="panel"><div className="panel-head"><div><h2>{uiT("Quick actions")}</h2><p>{uiT("Common tasks")}</p></div></div><div className="quick-actions"><button onClick={()=>openForm('customer')}><span className="quick-icon brand-accent"><Users/></span><span><b>{uiT("Register customer")}</b><small>{uiT("Create a new customer profile")}</small></span><span className="arrow">→</span></button><button onClick={()=>setPage('Check Before Order')}><span className="quick-icon orange"><Search/></span><span><b>{uiT("Check before order")}</b><small>{uiT("Check prescription stock availability")}</small></span><span className="arrow">&#8594;</span></button><button onClick={()=>openForm('exam')}><span className="quick-icon green"><Eye/></span><span><b>{uiT("Add eye exam")}</b><small>{uiT("Save an exam to customer history")}</small></span><span className="arrow">→</span></button></div></section></div></>}
    {page==='Customers'&&<section className="panel"><div className="panel-head"><div><h2>{uiT("Customer directory")}</h2><p>{filteredCustomers.length} {uiT("profiles found")}</p></div><div className="search-inline"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={uiT("Name, phone, email...")}/></div></div><CustomerTable rows={filteredCustomers} onEdit={c=>openForm('customer',c)} onDelete={removeCustomer}/>{filteredCustomers.length===0&&<Empty text={uiT("No customers found. Try another search or add a customer.")}/>}</section>}
    {page==='Eye Exams'&&<section className="panel"><div className="panel-head"><div><h2>{uiT("Eye exam records")}</h2><p>{uiT("Prescription values and exam images linked to customers")}</p></div></div><div className="record-filters"><label className="record-search"><Search size={17}/><input aria-label={uiT('Search Eye Exams by work order number or customer name')} placeholder={uiT('Work order number or customer name...')} value={examQuery} onChange={event=>setExamQuery(event.target.value)}/></label>{examQuery&&<button className="secondary" onClick={()=>setExamQuery('')}>{uiT('Clear search')}</button>}<span className="muted" role="status">{examRows.length} / {data.exams.length}</span></div><ExamTable rows={examRows} onViewWorkOrder={id=>{setFocusedWorkOrderId(id);setPage('Work Orders');}} customerName={customerName} onEdit={exam=>openForm('exam',data.exams.find(item=>item.id===exam.id)||exam)} onDelete={id=>removeItem('exams',id)} onViewImage={setExamImagePreview}/>{!examRows.length&&<Empty text={uiT(data.exams.length?'No matching eye exams.':'No eye exams saved yet.')}/>}</section>}
    {page==='Branches'&&<section className="branch-grid">{data.branches.map((b,i)=><div className="branch-card" key={b}><div className="branch-icon"><Store/></div><div><h3>{uiT(b)}</h3><p>{customers.filter(c=>c.branch===b).length} {uiT("registered customers")}</p>{(()=>{const location=(data.branchLocations||[]).find(row=>row.branch===b);return location?<div className="branch-location-summary"><span>{location.address||Number(location.latitude).toFixed(6)+', '+Number(location.longitude).toFixed(6)}</span><a href={branchMapUrl(location)} target="_blank" rel="noopener noreferrer">{uiT('View branch location')}</a></div>:<p className="branch-location-missing">{uiT('Location not set')}</p>;})()}</div><span className="branch-number">{String(i+1).padStart(2,'0')}</span><div className="row-actions branch-actions"><button className="icon-btn" disabled={!auth.can('Branches','edit')} onClick={()=>openForm('branch',{...(data.branchLocations||[]).find(row=>row.branch===b),name:b})} title={uiT("Edit branch")} aria-label={uiT("Edit "+b)}><Pencil size={16}/></button><button className="icon-btn danger" disabled={!auth.can('Branches','delete')} onClick={()=>removeBranch(b)} title={uiT("Delete branch")} aria-label={uiT("Delete "+b)}><Trash2 size={16}/></button></div></div>)}{!data.branches.length&&<Empty text={uiT("No branches yet.")}/>}</section>}
    {page==='Procurement'&&<section className="panel sales-report-panel"><div className="panel-head"><div><h2>{uiT("Procurement report")}</h2><p>{reportSales.length} {uiT("of ")}{data.salesRecords.length} {uiT("records ? Totals reflect the selected dates.")}</p></div></div><div className="sales-date-filters"><label>{uiT("Start Date")}<input type="date" value={salesStartDate} max={salesEndDate||undefined} onChange={e=>setSalesStartDate(e.target.value)}/></label><label>{uiT("End Date")}<input type="date" value={salesEndDate} min={salesStartDate||undefined} onChange={e=>setSalesEndDate(e.target.value)}/></label><button className="secondary" onClick={()=>{setSalesStartDate('');setSalesEndDate('')}} disabled={!salesStartDate&&!salesEndDate}>{uiT("Clear dates")}</button></div>{invalidSalesRange&&<p className="sales-date-error" role="alert">{uiT("End Date must be on or after Start Date.")}</p>}{(salesStartDate||salesEndDate)&&<p className="sales-match-hint sales-report-note">{uiT("Both dates are included. Records without a date are excluded from the date report.")}</p>}<SalesTable rows={reportSales} allRows={data.salesRecords} onEdit={r=>openForm('salesRecord',r)} onDelete={id=>removeItem('salesRecords',id)}/>{!reportSales.length&&<Empty text={uiT(data.salesRecords.length?'No sales records match the selected dates.':'No sales records yet. Click Add record to enter one.')}/>}</section>}
    {page==='Inventory'&&<><div className="inventory-view-tabs" role="tablist" aria-label={uiT('Inventory type')}>{[['frames','Frames inventory'],['glasses','Glasses inventory']].map(([value,label])=><button key={value} id={'inventory-tab-'+value} role="tab" aria-selected={inventoryView===value} aria-controls="inventory-type-panel" onClick={()=>setInventoryView(value)}>{uiT(label)}</button>)}</div><div id="inventory-type-panel" role="tabpanel" aria-labelledby={'inventory-tab-'+inventoryView}><BranchInventory key={inventoryView} kind={inventoryView} refreshKey={JSON.stringify([data.inventoryItems,data.transfers,data.branches])} onEdit={inventoryView==='frames'&&auth.can('Inventory','edit')?id=>{const item=availableInventoryItems.find(row=>'item:'+row.id===id);if(item)openForm('inventoryItem',item);}:undefined} onAdd={auth.can('Inventory','add')?branch=>{openForm('inventoryItem');setForm(current=>({...current,branch,category:inventoryView==='frames'?'Frames':inventoryCategories[0]}));}:undefined}/></div></>}
    {page==='Inventory'&&inventoryView==='glasses'&&<section className="inventory-grid">{inventoryCategories.map((category,index)=>{const count=availableInventoryItems.filter(item=>item.category===category).length;const quantity=availableInventoryItems.filter(item=>item.category===category).reduce((sum,item)=>sum+Number(item.quantity||0),0);return <button className="inventory-category-card" key={category} onClick={()=>{setInventoryCategory(category);setPage('Inventory Category')}}><span className="inventory-card-icon"><Package size={22}/></span><span className="inventory-card-copy"><b>{uiT(inventoryCategoryLabel(category))}</b><small>{count} {uiT("stock items · ")}{quantity} {uiT("custom-item units · ")}{matrixTotal(category)} {uiT("matrix units")}</small></span><span className="inventory-card-number">0{index+1}</span><span className="inventory-card-arrow">→</span></button>})}</section>}
    {page==='Inventory Category'&&<section className="panel inventory-matrix-panel"><div className="panel-head"><div><h2>{uiT("Stock quantity matrix")}</h2><p>{uiT("Row value × column value · Click any cell to edit quantity. Changes save automatically to company records.")}</p></div><div className="matrix-total"><span>{uiT("Total matrix units")}</span><b>{matrixTotal(inventoryCategory).toLocaleString(uiLocale("date"))}</b></div></div><div className="matrix-scroll"><table className="matrix-table"><thead><tr><th className="matrix-axis">{uiT("Row / Column")}</th>{inventoryMatrices[inventoryCategory].columns.map((column,c)=><th key={c}>{column}</th>)}<th className="matrix-sum">{uiT("Row total")}</th></tr></thead><tbody>{inventoryMatrices[inventoryCategory].rows.map((row,r)=><tr key={r}><th scope="row">{row}</th>{inventoryMatrices[inventoryCategory].columns.map((_,c)=><td key={c}><input disabled={!auth.can('Inventory','edit')||(!auth.user.isAdmin&&auth.user.branches!=='all')} type="text" inputMode="numeric" aria-label={uiT(`${inventoryCategoryLabel(inventoryCategory)}, row ${row}, column ${inventoryMatrices[inventoryCategory].columns[c]}`)} value={getMatrixValue(inventoryCategory,r,c)??''} placeholder={uiT("–")} onChange={e=>updateMatrixCell(inventoryCategory,r,c,e.target.value)}/></td>)}<td className="matrix-sum">{inventoryMatrices[inventoryCategory].columns.reduce((sum,_,c)=>sum+Number(getMatrixValue(inventoryCategory,r,c)||0),0)}</td></tr>)}</tbody><tfoot><tr><th>{uiT("Column total")}</th>{inventoryMatrices[inventoryCategory].columns.map((_,c)=><td key={c}>{inventoryMatrices[inventoryCategory].rows.reduce((sum,_,r)=>sum+Number(getMatrixValue(inventoryCategory,r,c)||0),0)}</td>)}<td>{matrixTotal(inventoryCategory)}</td></tr></tfoot></table></div><p className="matrix-footnote">{uiT("A dash in the original sheet is shown as an empty cell, not a recorded quantity. Enter 0 or a positive whole number to update it.")}</p></section>}
    {page==='Inventory Category'&&<section className="panel"><div className="panel-head"><div><h2>{uiT(inventoryCategoryLabel(inventoryCategory))}</h2><p>{availableInventoryItems.filter(item=>item.category===inventoryCategory).length} {uiT("stock records")}</p></div></div><InventoryTable rows={availableInventoryItems.filter(item=>item.category===inventoryCategory)} onEdit={item=>openForm('inventoryItem',item)} onDelete={id=>removeItem('inventoryItems',id)}/>{!availableInventoryItems.some(item=>item.category===inventoryCategory)&&<Empty text={uiT("No stock items yet. Click Add stock item to add your first item.")}/>}</section>}
    {page==='Check Before Order'&&<StockCheckPage matrixEdits={availableMatrixEdits}/>}
    {page==='Vendor Statement'&&<section className="panel vendor-statement-panel"><div className="panel-head"><div><h2>{uiT("Vendor Statement Report")}</h2><p>{uiT("Bills are linked by Vendor Name from Procurement. Each vendor has a separate balance.")}</p></div></div><div className="sales-date-filters vendor-report-filters"><label>{uiT("Vendor")}<select value={selectedVendor} onChange={e=>setSelectedVendor(e.target.value)}><option value="all">{uiT("All vendors")}</option>{[...vendorNames].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,name])=><option key={key} value={"vendor:"+key}>{uiT(name)}</option>)}</select></label><label>{uiT("Start Date")}<input type="date" value={vendorStartDate} max={vendorEndDate||undefined} onChange={e=>setVendorStartDate(e.target.value)}/></label><label>{uiT("End Date")}<input type="date" value={vendorEndDate} min={vendorStartDate||undefined} onChange={e=>setVendorEndDate(e.target.value)}/></label><button className="secondary" onClick={()=>{setSelectedVendor('all');setVendorStartDate('');setVendorEndDate('')}}>{uiT("Clear filters")}</button></div>{vendorStartDate&&vendorEndDate&&vendorStartDate>vendorEndDate&&<p role="alert" className="sales-date-error">{uiT("End Date must be on or after Start Date.")}</p>}{(vendorStartDate||vendorEndDate)&&<p className="sales-match-hint sales-report-note">{uiT("Both dates are included. Opening balance includes dated transactions before Start Date. Undated records are excluded while filtering by date.")}</p>}{vendorGroups.map(group=><section className="vendor-report-group" key={group.key}><h3>{group.name}</h3>{group.key===''&&<p className="sales-match-hint sales-report-note">{uiT("Edit these transactions to assign a vendor.")}</p>}<p className="muted">{uiT('Bills increase Debt; payments and credit notes increase Credit. Running balance shows the amount owed to this vendor.')}</p><VendorStatementTable onViewWorkOrder={auth.can('Work Orders')?id=>{setFocusedWorkOrderId(id);setPage('Work Orders');}:undefined} transactions={group.transactions} startDate={vendorStartDate} endDate={vendorEndDate} onEdit={record=>record.sourceSalesId!==undefined?openForm('salesRecord',data.salesRecords.find(sale=>sale.id===record.sourceSalesId)):openForm('vendorTransaction',record)} onDelete={id=>removeItem('vendorTransactions',id)}/></section>)}{!vendorGroups.length&&<Empty text={uiT("No vendor transactions found. Add a transaction with a vendor name to begin.")}/>}</section>}
    {page==='Invoice List'&&<RecordPage key={'invoices-'+focusedInvoiceId} kind="invoice" products={data.odooReportProducts||[]} onImportOdoo={storage.importOdooInvoices} commissionRules={data.commissionRules||[]} records={displayInvoices} initialQuery={focusedInvoiceId?(data.invoices.find(item=>String(item.id)===String(focusedInvoiceId))?.number||''):''} onRefund={recordRefund} creditNotes={data.creditNotes} onInvoiceAction={invoiceAction} invoiceEvents={data.invoiceEvents} onViewCreditNotes={id=>{setCreditInvoiceId(id);setPage('Credit Note');}} invoices={data.invoices} customers={customers} onCreateCustomer={createCustomer} branches={data.branches} workOrders={data.orders} onSave={saveInvoice} onDelete={id=>removeItem('invoices',id)}/>}
    {page==='Work Orders'&&<RecordPage key={'orders-'+focusedWorkOrderId} initialQuery={focusedWorkOrderId?(data.orders.find(order=>String(order.id)===String(focusedWorkOrderId))?.number||'WO-'+focusedWorkOrderId):''} kind="order" exams={data.exams} records={data.orders} invoices={data.invoices} customers={customers} onCreateCustomer={createCustomer} branches={data.branches} onSave={saveWorkOrder} onDelete={id=>removeItem('orders',id)}/>}
    {page==='Transfers'&&<TransfersPage branches={data.branches} transfers={data.transfers} matrixEdits={availableMatrixEdits} inventoryItems={availableInventoryItems} onTransfer={transferStock} onRemove={id=>save({...data,transfers:data.transfers.filter(transfer=>transfer.id!==id)})}/>} 
    {page==='Credit Note'&&<CreditNotePage notes={data.creditNotes} invoiceId={creditInvoiceId} onClearInvoice={()=>setCreditInvoiceId('')} onOpenInvoice={id=>{setFocusedInvoiceId(id);setPage('Invoice List');}}/>}
    {page==='Incentive'&&<IncentivePage branches={data.branches} creditNotes={data.creditNotes} products={data.odooReportProducts||[]} invoices={data.invoices} rules={data.commissionRules||[]} onSaveRule={rule=>{if(!auth.user.isAdmin)return false;return save({...data,commissionRules:(data.commissionRules||[]).some(item=>item.id===rule.id)?data.commissionRules.map(item=>item.id===rule.id?rule:item):[...(data.commissionRules||[]),rule]});}}/>}
    <footer className="footer"><span>{uiT("© 2026 COC CRM")}</span><span><Activity size={13}/> {uiT(storage.status)}</span></footer></div></main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className={modal==='salesRecord'?'modal sales-record-modal':modal==='exam'?'modal exam-modal':'modal'} onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{uiT("COC CRM")}</p><h2>{editing ? uiT('Edit') : uiT('Add')} {modal === 'customer' ? uiT('customer') : modal === 'exam' ? uiT('eye exam') : modal === 'salesRecord' ? uiT('sales record') : modal === 'vendorTransaction' ? uiT('vendor transaction') : modal === 'inventoryItem' ? uiT('stock item') : uiT('branch')}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X/></button></div>
    {modal==='customer'&&<div className="form-grid"><label>{uiT("Full name *")}<input required value={form.name||''} onChange={e=>updateField('name',e.target.value)} placeholder={uiT("Customer full name")}/></label><label>{uiT("Phone number *")}<input required value={form.phone||''} onChange={e=>updateField('phone',e.target.value)} placeholder={uiT("01xxxxxxxxx")}/></label><label>{uiT("Email")}<input type="email" value={form.email||''} onChange={e=>updateField('email',e.target.value)} placeholder={uiT("customer@email.com")}/></label><label>{uiT("Branch")}<select value={form.branch||''} onChange={e=>updateField('branch',e.target.value)}>{data.branches.map(b=><option key={b} value={b}>{uiT(b)}</option>)}</select></label><label>{uiT("Registration date")}<input type="date" value={form.joined||''} onChange={e=>updateField('joined',e.target.value)}/></label><label className="span-2">{uiT("Notes")}<textarea rows="3" value={form.notes||''} onChange={e=>updateField('notes',e.target.value)} placeholder={uiT("Preferences or follow-up notes")}/></label></div>}
    {modal==='exam'&&<div className="form-grid"><label>{uiT("Customer *")}<select required value={form.customerId||''} onChange={e=>updateField('customerId',e.target.value)}>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>{uiT("Exam date")}<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><div className="exam-prescription-grid span-2">{[['right','Right Eye (OD)'],['left','Left Eye (OS)']].map(([eye,title])=><fieldset className="exam-eye-fields" key={eye}><legend>{uiT(title)}</legend><div className="exam-eye-inputs">{[['Sph','SPH'],['Cyl','CYL'],['Axis','Axis'],['Add','ADD']].map(([suffix,label])=>{const key=eye+suffix;return <label key={key}>{uiT(label)}<input aria-label={uiT(title+' '+label)} type="number" step={suffix==='Axis'?'1':'0.25'} min={suffix==='Axis'?'0':undefined} max={suffix==='Axis'?'180':undefined} value={form[key]??''} onChange={event=>updateField(key,event.target.value)} placeholder={uiT(suffix==='Axis'?'0 to 180':suffix==='Add'?'+1.50':'-1.00')}/></label>;})}</div></fieldset>)}</div><label className="span-2">{uiT("IPD (mm)")}<input type="number" min="0" step="0.1" value={form.ipd??''} onChange={e=>updateField('ipd',e.target.value)} placeholder={uiT("e.g. 62")}/></label><label className="span-2">{uiT("Upload exam image")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={examImageLoading} onChange={uploadExamImage}/><small>{uiT("JPG, PNG, or WebP, up to 10 MB. Large images are resized for storage.")}</small></label>{examImageLoading&&<p className="span-2" role="status">{uiT("Preparing image...")}</p>}{examImageError&&<p className="sales-date-error span-2" role="alert">{uiT(examImageError)}</p>}{form.examImage?.dataUrl&&<div className="exam-image-preview span-2"><button type="button" className="exam-image-button" onClick={()=>setExamImagePreview(form.examImage)} aria-label={uiT("View exam image")}><img src={form.examImage.dataUrl} alt={uiT("Uploaded eye exam")}/></button><span>{form.examImage.name}</span><button type="button" className="secondary" disabled={examImageLoading} onClick={()=>updateField('examImage',null)}>{uiT("Remove image")}</button></div>}<label className="span-2">{uiT("Notes")}<textarea rows="3" value={form.notes||''} onChange={e=>updateField('notes',e.target.value)} placeholder={uiT("Exam notes")}/></label></div>}
    {modal==='vendorTransaction'&&<div className="form-grid"><label className="span-2">{uiT("Vendor Name *")}<input required list="vendor-name-options" value={form.vendorName||''} onChange={e=>updateField('vendorName',e.target.value)} placeholder={uiT("Enter vendor name")}/><datalist id="vendor-name-options">{[...vendorNames].filter(([key])=>key!=='').map(([key,name])=><option key={key} value={name}/>)}</datalist></label><label>{uiT("Date *")}<input required type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>{uiT("Transaction Type *")}<select required value={form.transactionType||'Bill'} onChange={e=>updateField('transactionType',e.target.value)}><option value={"Bill"}>{uiT("Bill")}</option><option value={"Payment"}>{uiT("Payment")}</option><option value={"Credit"}>{uiT("Credit")}</option></select></label>{isVendorReduction(form.transactionType)?<label className="span-2">{form.transactionType === 'Credit' ? uiT('Credit Amount (EGP) *') : uiT('Payments (EGP) *')}<input required type="number" min="0.01" step="0.01" value={form.payments??''} onChange={e=>updateField('payments',e.target.value)}/></label>:<label className="span-2">{uiT("Amount (EGP) *")}<input required type="number" min="0.01" step="0.01" value={form.amount??''} onChange={e=>updateField('amount',e.target.value)}/></label>}<label className="span-2">{uiT('Work Order')}<input maxLength={120} value={form.woNumber||''} onChange={event=>updateField('woNumber',event.target.value)} placeholder={uiT('Work order number')}/></label><label className="span-2">{uiT('Reference')}<input maxLength={200} value={form.reference||''} onChange={event=>updateField('reference',event.target.value)}/></label><label className="span-2">{uiT('Description')}<textarea rows={3} maxLength={500} value={form.description||''} onChange={event=>updateField('description',event.target.value)}/></label><p className="sales-match-hint span-2">{uiT("Balance is calculated automatically as total bill amounts minus payments and credits.")}</p></div>}
    {modal==='branch'&&<><label>{uiT("Branch name *")}<input required value={form.name||''} onChange={e=>updateField('name',e.target.value)} placeholder={uiT("e.g. Heliopolis")}/></label><React.Suspense fallback={<p role="status">{uiT('Loading map...')}</p>}><BranchLocationPicker value={form} onChange={fields=>setForm(current=>({...current,...fields}))}/></React.Suspense></>}
    {modal==='inventoryItem'&&<div className="form-grid"><label>{uiT("Date")}<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>{uiT("Category *")}<select required value={form.category||inventoryCategory} onChange={e=>updateField('category',e.target.value)}>{(form.category==='Frames'?['Frames']:inventoryCategories).map(category=><option key={category} value={category}>{uiT(inventoryCategoryLabel(category))}</option>)}</select></label><label>{uiT(form.category==='Frames'?"Frame model *":"Item name *")}<input required value={form.itemName||''} onChange={e=>updateField('itemName',e.target.value)} placeholder={uiT(form.category==='Frames'?"Frame model":"Lens/product name")}/></label><label>{uiT("SKU / Code")}<input value={form.sku||''} onChange={e=>updateField('sku',e.target.value)} placeholder={uiT("Product code")}/></label><label>{uiT("Quantity *")}<input required min="0" type="number" value={form.quantity??''} onChange={e=>updateField('quantity',e.target.value)}/></label><label>{uiT("Minimum stock level")}<input min="0" type="number" value={form.minQuantity??''} onChange={e=>updateField('minQuantity',e.target.value)}/></label><label>{uiT("Unit price (EGP)")}<input min="0" step="0.01" type="number" value={form.unitPrice??''} onChange={e=>updateField('unitPrice',e.target.value)}/></label><label>{uiT("Branch")}<select value={form.branch||data.branches[0]||''} onChange={e=>updateField('branch',e.target.value)}>{data.branches.map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select></label></div>}
    {modal==='salesRecord'&&<div className="form-grid"><label>{uiT('Branch *')}<select required disabled={Boolean(linkedProcurementOrder)} value={linkedProcurementOrder?.branch||form.branch||''} onChange={event=>updateField('branch',event.target.value)}><option value="">{uiT('Choose branch')}</option>{data.branches.map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select>{linkedProcurementOrder&&<small>{uiT('Branch follows the linked work order.')}</small>}</label><label>{uiT("Date")}<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>{uiT("Linked work order")}<select value={linkedProcurementOrder?.id??form.workOrderId??''} onChange={event=>{const order=data.orders.find(item=>String(item.id)===event.target.value);setForm(current=>({...current,workOrderId:order?.id||'',woNumber:order?workOrderNumber(order):'',status:order?.status||'Pending',branch:order?.branch||current.branch||''}));}}><option value="">{uiT("No linked work order")}</option>{form.workOrderId&&!linkedProcurementOrder&&<option value={form.workOrderId}>{uiT("Work order unavailable")}</option>}{data.orders.map(order=><option key={order.id} value={order.id}>{workOrderNumber(order)} — {customerName(order.customerId)}</option>)}</select></label><label>{uiT("WO. Number *")}<input required readOnly={Boolean(form.workOrderId)} value={linkedProcurementOrder?workOrderNumber(linkedProcurementOrder):form.woNumber||''} onChange={e=>updateField('woNumber',e.target.value)} placeholder={uiT("e.g. WO-1001")}/></label><label>{uiT("Status")}<select disabled={Boolean(linkedProcurementOrder)} value={linkedProcurementOrder?.status||form.status||'Pending'} onChange={e=>updateField('status',e.target.value)}>{(linkedProcurementOrder?[linkedProcurementOrder.status||'New']:procurementStatuses).map(status=><option key={status} value={status}>{uiT(status)}</option>)}</select></label>{linkedProcurementOrder&&<p className="sales-match-hint span-2">{uiT("Status updates automatically from the linked work order. Change it in Work Orders.")}</p>}<label>{uiT("Type of Sales *")}<input required list="sales-type-options" value={form.typeOfSales||''} onChange={e=>setForm(current=>({...current,typeOfSales:e.target.value,lensCategory:getStandardSalesFamily(current.typeOfSales)===getStandardSalesFamily(e.target.value)?current.lensCategory:''}))} placeholder={uiT("Select or enter sales type")}/><datalist id="sales-type-options">{[...new Set(['Standard HMC','Standard Blue Infrared',...data.salesRecords.map(record=>record.typeOfSales).filter(Boolean)])].map(type=><option key={type} value={type}/>)}</datalist></label>{salesLensFamily&&<><label>{uiT("Vegas Stock Category *")}<select required value={form.lensCategory||''} onChange={e=>updateField('lensCategory',e.target.value)}><option value="">{uiT("Select Minus or Plus")}</option>{inventoryCategories.filter(category=>category.startsWith(salesLensFamily+' ')).map(category=><option key={category} value={category}>{uiT(inventoryCategoryLabel(category))}</option>)}</select></label><label>{uiT("Eyes")}<select value={form.lensEyes||'Both'} onChange={e=>updateField('lensEyes',e.target.value)}><option value="Both">{uiT("Both eyes")}</option><option value="Right">{uiT("Right eye only")}</option><option value="Left">{uiT("Left eye only")}</option></select></label>{(form.lensEyes==='Right'?['right']:form.lensEyes==='Left'?['left']:['right','left']).map(eye=><React.Fragment key={eye}><label>{eye === 'right' ? uiT('Right') : uiT('Left')} {uiT("SPH *")}<input required type="number" step="0.25" value={form[eye+'Sph']??''} onChange={e=>updateField(eye+'Sph',e.target.value)}/></label><label>{eye === 'right' ? uiT('Right') : uiT('Left')} {uiT("CYL *")}<input required type="number" step="0.25" value={form[eye+'Cyl']??''} onChange={e=>updateField(eye+'Cyl',e.target.value)}/></label></React.Fragment>)}{salesStockCheck.complete?<div className={salesStockCheck.anyAvailable?'order-stock-notice span-2':'order-stock-result span-2'} role="status" aria-live="polite"><strong>{salesStockCheck.anyAvailable ? (shouldNotifySalesStock(form) ? uiT('This lens is available in Vegas stock. Why was it not ordered from Vegas?') : uiT('Matching lenses are available in Vegas stock.')) : uiT('No matching lenses available in Vegas stock.')}</strong>{salesStockCheck.groups.map((group,index)=><p key={index}>{uiT("SPH ")}{group.sph.toFixed(2)} {uiT("/ CYL ")}{group.cyl.toFixed(2)}: {group.quantity} {uiT("available, ")}{group.needed} {uiT("needed.")}</p>)}{salesStockCheck.anyAvailable&&!salesStockCheck.allAvailable&&<p>{uiT("Available stock covers only part of this prescription.")}</p>}</div>:<p className="sales-match-hint span-2">{uiT("Select the Vegas stock category and enter SPH (row) and CYL (column) to check availability.")}</p>}</>}<label>{uiT("Price")}<input min="0" type="number" step="0.01" value={form.price??''} onChange={e=>updateField('price',e.target.value)}/></label><label>{uiT("Vendor Name *")}<input required value={form.vendorName||''} onChange={e=>updateField('vendorName',e.target.value)} placeholder={uiT("Enter vendor name")}/></label><label>{uiT("Amount of Bill")}<input min="0" type="number" step="0.01" value={form.amountOfBill??''} onChange={e=>updateField('amountOfBill',e.target.value)}/></label><label>{uiT("Sales Profit")}<input readOnly value={salesProfit(form).toFixed(2)}/></label><label>{uiT("Profit %")}<input readOnly className={salesProfit(form)<0?"profit-loss":""} value={salesProfitPercentage(form)}/></label><p className="sales-match-hint span-2">{uiT("Sales Profit = Price − Amount of Bill. Profit % = Sales Profit ÷ Price × 100.")}</p><p className="sales-match-hint span-2">{uiT("Agreement is checked automatically: Type of Sales and Vendor Name must match exactly (ignoring letter case and extra spaces).")}</p></div>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>{uiT("Cancel")}</button><button className="primary" type="submit" disabled={modal==='exam'&&examImageLoading}>{uiT("Save ")}{modal === 'customer' ? uiT('customer') : modal === 'exam' ? uiT('exam') : modal === 'salesRecord' ? uiT('record') : modal === 'vendorTransaction' ? uiT('transaction') : modal === 'inventoryItem' ? uiT('stock item') : uiT('branch')}</button></div></form></div>}
    {examImagePreview&&<ExamImageViewer image={examImagePreview} onClose={()=>setExamImagePreview(null)}/>}
    {notice&&<div className="toast">✓ &nbsp;{uiT(notice)}</div>}
  </div>;
}
function CustomerTable({rows,onEdit,onDelete}){
  useUiLanguage();
const auth=useAuth();return <div className="table-wrap"><table><thead><tr><th>{uiT("Customer")}</th><th>{uiT("Phone")}</th><th>{uiT("Branch")}</th><th>{uiT("Registered")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><div className="customer-cell"><div className="avatar customer-avatar">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div><b>{c.name}</b><small>{c.email || uiT('No email added')}</small></div></div></td><td><span className="phone"><Phone size={13}/>{c.phone}</span></td><td><span className="branch-pill">{uiT(c.branch) || '—'}</span></td><td>{c.joined||'—'}</td><td><div className="row-actions"><button className="icon-btn" disabled={!auth.can('Customers','edit')} onClick={()=>onEdit(c)} title={uiT("Edit")}><Pencil size={16}/></button><button className="icon-btn danger" disabled={!auth.can('Customers','delete')} onClick={()=>onDelete(c.id)} title={uiT("Delete")}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
function Empty({text}){
  useUiLanguage();
return <div className="empty"><Users size={25}/><p>{uiT(text)}</p></div>}

function SalesTable({rows,allRows=rows,onEdit,onDelete}){
  useUiLanguage();
const auth=useAuth();
  const moneyValue=n=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n)||0);
  const matches=r=>String(r.typeOfSales||'').trim().toLocaleLowerCase()===String(r.vendorName||'').trim().toLocaleLowerCase();
  const totals = rows.reduce((sum, record) => ({price: sum.price + Number(record.price || 0), amountOfBill: sum.amountOfBill + Number(record.amountOfBill || 0)}), {price: 0, amountOfBill: 0});
  return <div className="table-wrap sales-table"><table><thead><tr><th>{uiT("Date")}</th><th>{uiT("Branch")}</th><th>{uiT("WO. Number")}</th><th>{uiT("Type of Sales")}</th><th>{uiT("Price")}</th><th>{uiT("Vendor Name")}</th><th>{uiT("Amount of Bill")}</th><th>{uiT("Sales Profit")}</th><th>{uiT("Profit %")}</th><th>{uiT("Approval")}</th><th>{uiT("Status")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date||String.fromCharCode(8212)}</td><td><span className="branch-pill">{uiT(r.branch)||uiT('Unassigned')}</span></td><td className={hasDuplicateWo(allRows,r.woNumber,r.id)?"duplicate-wo":""}><b>{r.woNumber||'—'}</b></td><td>{r.typeOfSales||'—'}</td><td>{moneyValue(r.price)}</td><td>{r.vendorName||'—'}</td><td>{moneyValue(r.amountOfBill)}</td><td><b>{moneyValue(salesProfit(r))}</b></td><td className={salesProfit(r)<0?"profit-loss":""}>{salesProfitPercentage(r)}</td><td>{matches(r)?<span className="agreement agreement-yes"><CheckCircle2 size={16}/> {uiT("Matched")}</span>:<span className="agreement agreement-no"><XCircle size={16}/> {uiT("Not matched")}</span>}</td><td><span className={'status '+({Pending:'new',Ordered:'in-progress',Received:'ready',Done:'ready',Returned:'cancelled','Glasses Prep':'in-progress',RX:'in-progress',Lab:'in-progress',Tint:'in-progress',Shipping:'in-progress',Waiting:'in-progress',New:'new','In progress':'in-progress',Ready:'ready',Delivered:'ready',Cancelled:'cancelled'}[r.status||'Pending']||'new')}>{uiT(r.status) || uiT('Pending')}</span></td><td><div className="row-actions"><button className="icon-btn" disabled={!auth.can('Procurement','edit')} onClick={()=>onEdit(r)} title={uiT("Edit")}><Pencil size={16}/></button><button className="icon-btn danger" disabled={!auth.can('Procurement','delete')} onClick={()=>onDelete(r.id)} title={uiT("Delete")}><Trash2 size={16}/></button></div></td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={4}>{uiT("Total")}</th><td>{moneyValue(totals.price)}</td><td colSpan={2}></td><td>{moneyValue(salesProfit(totals))}</td><td className={salesProfit(totals)<0?"profit-loss":""}>{salesProfitPercentage(totals)}</td><td colSpan={3}></td></tr></tfoot></table></div>;
}

function InventoryTable({rows,onEdit,onDelete}){
  useUiLanguage();
const auth=useAuth();return <div className="table-wrap"><table><thead><tr><th>{uiT("Date")}</th><th>{uiT("Item name")}</th><th>{uiT("SKU / Code")}</th><th>{uiT("Branch")}</th><th>{uiT("Quantity")}</th><th>{uiT("Min. stock")}</th><th>{uiT("Unit price")}</th><th>{uiT("Stock status")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{rows.map(item=>{const low=Number(item.quantity||0)<=Number(item.minQuantity||0);return <tr key={item.id}><td>{item.date||'—'}</td><td><b>{item.itemName}</b></td><td>{item.sku||'—'}</td><td><span className="branch-pill">{uiT(item.branch) || '—'}</span></td><td><b>{Number(item.quantity)||0}</b></td><td>{Number(item.minQuantity)||0}</td><td>{money(item.unitPrice)}</td><td><span className={`status ${low?'cancelled':'ready'}`}>{low ? uiT('Low stock') : uiT('In stock')}</span></td><td><div className="row-actions"><button className="icon-btn" disabled={!auth.can('Inventory','edit')} onClick={()=>onEdit(item)} title={uiT("Edit")}><Pencil size={16}/></button><button className="icon-btn danger" disabled={!auth.can('Inventory','delete')} onClick={()=>onDelete(item.id)} title={uiT("Delete")}><Trash2 size={16}/></button></div></td></tr>})}</tbody></table></div>}

function VendorStatementTable({transactions,startDate='',endDate='',onEdit,onDelete,onViewWorkOrder}){
  useUiLanguage();
const auth=useAuth();
  const statement=getVendorReport(transactions,startDate,endDate);
  const currency=value=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  return <div className="table-wrap vendor-statement-table"><table><thead><tr><th>{uiT("Date")}</th><th>{uiT("Work Order")}</th><th>{uiT("Reference / description")}</th><th>{uiT("Debt")}</th><th>{uiT("Credit")}</th><th>{uiT("Running balance")}</th><th>{uiT("Actions")}</th></tr></thead><tbody><tr className="vendor-opening-balance"><th scope="row" colSpan={5}>{uiT(startDate?'Balance brought forward':'Opening Balance')}</th><td>{currency(statement.openingBalance)}</td><td></td></tr>{statement.rows.map(record=><tr key={record.id}><td>{record.date||String.fromCharCode(8212)}</td><td>{record.woNumber?(record.workOrderId&&onViewWorkOrder?<button type="button" className="text-btn" onClick={()=>onViewWorkOrder(record.workOrderId)}>{record.woNumber}</button>:record.woNumber):String.fromCharCode(8212)}</td><td><span className={record.transactionType==='Bill'?'status pending':'status ready'}>{uiT(record.transactionType)}</span>{record.reference&&<div><b>{uiT("Reference")}: </b>{record.reference}</div>}{(record.description||record.notes)&&<p>{record.description||record.notes}</p>}{record.sourceSalesId!==undefined&&<small className="vendor-bill-source">{uiT("Procurement")}</small>}</td><td>{currency(record.amount)}</td><td>{currency(record.payments)}</td><td><b>{currency(record.balance)}</b></td><td><div className="row-actions"><button className="icon-btn" disabled={!auth.can('Vendor Statement','edit')} onClick={()=>onEdit(record)} title={uiT(record.sourceSalesId!==undefined?"Edit linked sales record":"Edit transaction")} aria-label={uiT(record.sourceSalesId!==undefined?"Edit linked sales record":"Edit transaction")}><Pencil size={16}/></button><button className="icon-btn danger" disabled={record.sourceSalesId!==undefined||!auth.can('Vendor Statement','delete')} onClick={()=>onDelete(record.id)} title={uiT(record.sourceSalesId!==undefined?"Manage this bill in Procurement":"Delete transaction")} aria-label={uiT("Delete transaction")}><Trash2 size={16}/></button></div></td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={3}>{uiT("Period totals / Closing balance")}</th><td>{currency(statement.totalAmount)}</td><td>{currency(statement.totalPayments)}</td><td>{currency(statement.balance)}</td><td></td></tr></tfoot></table></div>;
}

const emptyStockPrescription={lensCategory:'HMC 1.56 Minus',lensEyes:'Both',rightSph:'',rightCyl:'',leftSph:'',leftCyl:''};
function StockCheckPage({matrixEdits}){
  useUiLanguage();

  const [prescription,setPrescription]=useState(()=>({...emptyStockPrescription}));
  const [checkedPrescription,setCheckedPrescription]=useState(null);
  const [error,setError]=useState('');
  const update=(key,value)=>{setPrescription(current=>({...current,[key]:value}));setCheckedPrescription(null);setError('');};
  const check=checkedPrescription?getOrderStockCheck({...checkedPrescription,product:'Prescription glasses',lensType:'Standard'},inventoryMatrices,matrixEdits):null;
  const checkStock=event=>{
    event.preventDefault();
    if(!getOrderStockCheck({...prescription,product:'Prescription glasses',lensType:'Standard'},inventoryMatrices,matrixEdits).complete){setError('Select the lens category and enter SPH and CYL for each selected eye.');return;}
    setError('');setCheckedPrescription({...prescription});
  };
  return <section className="panel stock-check-panel"><div className="panel-head"><div><h2>{uiT("Check lens availability")}</h2><p>{uiT("Choose a stock category and enter the prescription. Each selected eye needs one lens.")}</p></div></div><form onSubmit={checkStock} className="stock-check-form"><div className="form-grid"><label>{uiT("Stock Category")}<select value={prescription.lensCategory} onChange={event=>update('lensCategory',event.target.value)}>{inventoryCategories.map(category=><option key={category} value={category}>{uiT(inventoryCategoryLabel(category))}</option>)}</select></label><label className="span-2">{uiT("Eyes")}<select value={prescription.lensEyes} onChange={event=>update('lensEyes',event.target.value)}><option value="Both">{uiT("Both eyes")}</option><option value="Right">{uiT("Right eye only")}</option><option value="Left">{uiT("Left eye only")}</option></select></label>{(prescription.lensEyes==='Right'?['right']:prescription.lensEyes==='Left'?['left']:['right','left']).map(eye=><React.Fragment key={eye}><label>{eye === 'right' ? uiT('Right') : uiT('Left')} {uiT("SPH *")}<input required type="number" step="0.25" value={prescription[eye+'Sph']} placeholder={uiT("e.g. -1.00")} onChange={event=>update(eye+'Sph',event.target.value)}/></label><label>{eye === 'right' ? uiT('Right') : uiT('Left')} {uiT("CYL *")}<input required type="number" step="0.25" value={prescription[eye+'Cyl']} placeholder={uiT("e.g. -0.50")} onChange={event=>update(eye+'Cyl',event.target.value)}/></label></React.Fragment>)}</div><p className="stock-check-help">{uiT("SPH matches the stock row and CYL matches the stock column. Enter 0 for a zero power.")}</p>{error&&<p className="sales-date-error" role="alert">{uiT(error)}</p>}<div className="stock-check-actions"><button className="primary" type="submit"><Search size={18}/> {uiT("Check Stock")}</button><button className="secondary" type="button" onClick={()=>{setPrescription({...emptyStockPrescription});setCheckedPrescription(null);setError('');}}>{uiT("Clear")}</button></div></form>{check&&<StockAvailabilityResult prescription={checkedPrescription} check={check}/>}</section>;
}
function StockAvailabilityResult({prescription,check}){
  useUiLanguage();

  const state=check.allAvailable?'available':check.anyAvailable?'partial':'unavailable';
  return <div className={'stock-check-result '+state} role="status" aria-live="polite"><h3>{check.allAvailable ? uiT('Available in stock') : check.anyAvailable ? uiT('Partially available in stock') : uiT('Not available in stock')}</h3><p>{uiT(inventoryCategoryLabel(prescription.lensCategory))}</p><div className="table-wrap"><table><thead><tr><th>{uiT("Eye")}</th><th>{uiT("SPH")}</th><th>{uiT("CYL")}</th><th>{uiT("Needed")}</th><th>{uiT("Available")}</th><th>{uiT("Result")}</th></tr></thead><tbody>{check.groups.map((group,index)=><tr key={index}><td>{group.eyes.map(eye=>eye==='right'?'Right':'Left').join(' + ')}</td><td>{group.sph.toFixed(2)}</td><td>{group.cyl.toFixed(2)}</td><td>{group.needed}</td><td>{group.quantity}</td><td>{group.quantity >= group.needed ? uiT('Available') : group.quantity > 0 ? uiT('Insufficient quantity') : uiT('Not available')}</td></tr>)}</tbody></table></div>{check.groups.some(group=>!group.matched)&&<p>{uiT("This prescription is outside the selected stock matrix.")}</p>}<p>{check.allAvailable ? uiT('Matching lenses are available from Vegas stock.') : check.anyAvailable ? uiT('Some lenses are in stock. Additional lenses are needed to complete the prescription.') : uiT('No matching lenses are currently available in the selected Vegas stock category.')}</p></div>;
}

function ExamTable({rows,customerName,onEdit,onDelete,onViewImage,onViewWorkOrder}){
  useUiLanguage();
const auth=useAuth();
  return <div className="table-wrap exam-table"><table><thead><tr><th rowSpan={2}>{uiT("Customer")}</th><th rowSpan={2}>{uiT("Exam date")}</th><th rowSpan={2}>{uiT('Branch')}</th><th rowSpan={2}>{uiT('Linked work order')}</th><th colSpan={4} scope="colgroup">{uiT("Right Eye (OD)")}</th><th colSpan={4} scope="colgroup">{uiT("Left Eye (OS)")}</th><th rowSpan={2}>{uiT("IPD (mm)")}</th><th rowSpan={2}>{uiT("Image")}</th><th rowSpan={2}>{uiT("Notes")}</th><th rowSpan={2}>{uiT("Actions")}</th></tr><tr>{['right','left'].map(eye=>['SPH','CYL','Axis','ADD'].map(label=><th key={eye+label} scope="col">{uiT(label)}</th>))}</tr></thead><tbody>{rows.map(exam=>{const prescription=examPrescription(exam);return <tr key={exam.id}><td><b>{customerName(exam.customerId)}</b></td><td>{exam.date||String.fromCharCode(8212)}</td><td>{uiT(exam.branch||'')}</td><td>{exam.linkedWorkOrders?.length?exam.linkedWorkOrders.map(order=><div key={order.id}>{auth.can('Work Orders')?<button type="button" className="text-btn" onClick={()=>onViewWorkOrder(order.id)}>{workOrderNumber(order)}</button>:workOrderNumber(order)}</div>):exam.workOrderNumber||String.fromCharCode(8212)}</td>{['rightSph','rightCyl','rightAxis','rightAdd','leftSph','leftCyl','leftAxis','leftAdd','ipd'].map(key=><td key={key}>{prescription[key]!==''?prescription[key]:String.fromCharCode(8212)}</td>)}<td>{exam.examImage?.dataUrl?<button className="exam-image-button" onClick={()=>onViewImage(exam.examImage)} title={uiT("View exam image")} aria-label={uiT("View exam image")}><img className="exam-image-thumb" src={exam.examImage.dataUrl} alt={uiT("Eye exam attachment")}/></button>:String.fromCharCode(8212)}</td><td>{exam.notes||String.fromCharCode(8212)}</td><td><div className="row-actions"><button className="icon-btn" disabled={!auth.can('Eye Exams','edit')} onClick={()=>onEdit(exam)} title={uiT("Edit")}><Pencil size={16}/></button><button className="icon-btn danger" disabled={!auth.can('Eye Exams','delete')} onClick={()=>onDelete(exam.id)} title={uiT("Delete")}><Trash2 size={16}/></button></div></td></tr>;})}</tbody></table></div>;
}
function ExamImageViewer({image,onClose}){
  useUiLanguage();

  return <div className="modal-backdrop exam-image-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}} onKeyDown={event=>{if(event.key==='Escape')onClose();}}><div className="exam-image-viewer" role="dialog" aria-modal="true" aria-label={uiT("Exam image")}><div className="modal-head"><h2>{image.name || uiT('Exam image')}</h2><button autoFocus type="button" className="icon-btn" onClick={onClose} aria-label={uiT("Close exam image")}><X/></button></div><img src={image.dataUrl} alt={uiT("Full eye exam image")}/></div></div>;
}

function TransfersPage({branches,transfers,matrixEdits,inventoryItems,onTransfer,onRemove}){
  useUiLanguage();

  const auth=useAuth();
  const initial={date:localToday(),sourceType:'matrix',category:inventoryCategories[0],row:'',column:'',sourceItemId:'',toBranch:'',quantity:''};
  const [transferForm,setTransferForm]=useState(initial);
  const [removalMessage,setRemovalMessage]=useState(null);
  const removeTransfer=transfer=>{
    if(!auth.can('Transfers','delete'))return;
    if(!window.confirm(uiT('Remove this transfer? Its quantity will be restored to the source stock and removed from the destination totals.')+' '+transfer.quantity+' - '+transfer.toBranch))return;
    const saved=onRemove(transfer.id);
    setRemovalMessage({error:!saved,text:saved?'Transfer removed. Source stock and branch totals have been updated.':'The transfer could not be removed. Check your permissions and storage status.'});
  };
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const update=(key,value)=>{setTransferForm(current=>({...current,[key]:value,...(key==='category'?{sourceType:value==='Frames'?'item':current.sourceType,sourceItemId:'',row:'',column:''}:{})}));setError('');setSuccess('');};
  const matrix=inventoryMatrices[transferForm.category]||inventoryMatrices[inventoryCategories[0]];
  const items=inventoryItems.filter(item=>item.category===transferForm.category);
  const item=items.find(candidate=>String(candidate.id)===transferForm.sourceItemId);
  const selectedCell=transferForm.row!==''&&transferForm.column!=='';
  const cell=transferForm.row+':'+transferForm.column;
  const available=transferForm.sourceType==='item'?Number(item?.quantity||0):selectedCell?Number(Object.prototype.hasOwnProperty.call(matrixEdits[transferForm.category]||{},cell)?matrixEdits[transferForm.category][cell]:matrix.values[Number(transferForm.row)]?.[Number(transferForm.column)])||0:0;
  const selectionReady=transferForm.sourceType==='item'?Boolean(item):selectedCell;
  const submitTransfer=event=>{
    event.preventDefault();setError('');setSuccess('');
    if(!auth.can('Transfers','add')){setError('You do not have permission to add transfers.');return;}
    const result=onTransfer(transferForm);
    if(result!==true){setError(typeof result==='string'?result:'Transfer was not saved. Inventory was not reduced.');return;}
    setSuccess('Transferred '+transferForm.quantity+' units to '+transferForm.toBranch+'. Available inventory has been reduced.');
    setTransferForm(current=>({...current,quantity:''}));
  };
  const received=new Map();
  transfers.forEach(transfer=>{
    const stockKey=transfer.sourceType==='matrix'?'matrix|'+transfer.category+'|'+transfer.row+':'+transfer.column:'item|'+transfer.sourceItemId;
    const key=transfer.toBranch+'|'+stockKey;
    if(!received.has(key))received.set(key,{...transfer,quantity:0});
    received.get(key).quantity+=Number(transfer.quantity);
  });
  return <><section className="panel transfer-panel"><div className="panel-head"><div><h2>{uiT("Send stock to a branch")}</h2><p>{uiT("Choose stock, a destination branch, and a quantity. Saving subtracts the quantity from available inventory.")}</p></div></div>{!branches.length&&<p className="sales-date-error" role="alert">{uiT("Add destination branches in Branches before making a transfer.")}</p>}<form className="transfer-form" onSubmit={submitTransfer}><div className="form-grid"><label>{uiT("Transfer Date *")}<input required type="date" value={transferForm.date} onChange={event=>update('date',event.target.value)}/></label><label>{uiT("Destination Branch *")}<select required value={transferForm.toBranch} onChange={event=>update('toBranch',event.target.value)}><option value="">{uiT("Choose branch")}</option>{branches.map(branch=><option key={branch} value={branch}>{uiT(branch)}</option>)}</select></label><label>{uiT("Stock Source")}<select value={transferForm.sourceType} onChange={event=>{setTransferForm(current=>({...current,sourceType:event.target.value,sourceItemId:'',row:'',column:'',quantity:''}));setError('');setSuccess('');}}><option value="matrix" disabled={transferForm.category==='Frames'}>{uiT("Lens stock matrix")}</option><option value="item">{uiT("Inventory stock item")}</option></select></label><label>{uiT("Stock Category")}<select value={transferForm.category} onChange={event=>{setTransferForm(current=>({...current,category:event.target.value,sourceType:event.target.value==='Frames'?'item':current.sourceType,row:'',column:'',sourceItemId:'',quantity:''}));setError('');setSuccess('');}}>{[...inventoryCategories,'Frames'].map(category=><option key={category} value={category}>{uiT(inventoryCategoryLabel(category))}</option>)}</select></label>{transferForm.sourceType==='matrix'?<><label>{uiT("SPH (row) *")}<select required value={transferForm.row} onChange={event=>update('row',event.target.value)}><option value="">{uiT("Choose SPH")}</option>{matrix.rows.map((value,index)=><option key={index} value={index}>{uiT(value)}</option>)}</select></label><label>{uiT("CYL (column) *")}<select required value={transferForm.column} onChange={event=>update('column',event.target.value)}><option value="">{uiT("Choose CYL")}</option>{matrix.columns.map((value,index)=><option key={index} value={index}>{uiT(value)}</option>)}</select></label></>:<label className="span-2">{uiT("Stock Item *")}<select required value={transferForm.sourceItemId} onChange={event=>update('sourceItemId',event.target.value)}><option value="">{uiT("Choose stock item")}</option>{items.map(stock=><option key={stock.id} value={stock.id}>{stock.itemName} - {uiT(stock.branch) || uiT('Inventory')} - {stock.quantity} {uiT("available")}</option>)}</select></label>}<label>{uiT("Quantity *")}<input required type="number" min="1" step="1" max={selectionReady?available:undefined} value={transferForm.quantity} onChange={event=>update('quantity',event.target.value)}/></label><div className="transfer-available"><span>{uiT("Available at source")}</span><strong>{selectionReady ? available : uiT('Select stock')}</strong>{item?.branch&&<small>{uiT("Source branch: ")}{uiT(item.branch)}</small>}</div></div>{error&&<p className="sales-date-error" role="alert">{uiT(error)}</p>}{success&&<p className="transfer-success" role="status">{uiT(success)}</p>}<button className="primary" type="submit" disabled={!branches.length||!selectionReady||available<=0}><ArrowLeftRight size={18}/> {uiT("Transfer stock")}</button></form></section><section className="panel transfer-panel"><div className="panel-head"><div><h2>{uiT("Stock sent to branches")}</h2><p>{uiT("Received quantities from saved transfers, grouped by destination and stock.")}</p></div></div><div className="transfer-branch-summary">{branches.map(branch=><div key={branch}><b>{uiT(branch)}</b><span>{transfers.filter(transfer=>transfer.toBranch===branch).reduce((sum,transfer)=>sum+Number(transfer.quantity),0)} {uiT("units sent")}</span></div>)}</div>{received.size>0?<div className="table-wrap"><table><thead><tr><th>{uiT("Branch")}</th><th>{uiT("Category")}</th><th>{uiT("Prescription / Item")}</th><th>{uiT("Units received")}</th></tr></thead><tbody>{[...received.values()].sort((a,b)=>a.toBranch.localeCompare(b.toBranch)).map((record,index)=><tr key={index}><td>{record.toBranch}</td><td>{uiT(inventoryCategoryLabel(record.category))}</td><td>{record.sourceType === 'matrix' ? uiT('SPH ') + record.sph + uiT(' / CYL ') + record.cyl : record.itemName}</td><td><b>{record.quantity}</b></td></tr>)}</tbody></table></div>:<Empty text={uiT("No stock has been transferred yet.")}/>}</section><section className="panel transfer-panel"><div className="panel-head"><div><h2>{uiT("Transfer history")}</h2><p>{transfers.length} {uiT("saved transfers")}</p></div></div>{removalMessage&&<p className={removalMessage.error?'account-error':'transfer-success'} role={removalMessage.error?'alert':'status'}>{uiT(removalMessage.text)}</p>}{transfers.length?<div className="table-wrap"><table><thead><tr><th>{uiT("Date")}</th><th>{uiT("From")}</th><th>{uiT("To branch")}</th><th>{uiT("Category")}</th><th>{uiT("Prescription / Item")}</th><th>{uiT("Quantity")}</th><th>{uiT("Actions")}</th></tr></thead><tbody>{[...transfers].sort((a,b)=>b.date.localeCompare(a.date)).map(transfer=><tr key={transfer.id}><td>{transfer.date}</td><td>{transfer.sourceBranch || uiT('Inventory')}</td><td>{transfer.toBranch}</td><td>{uiT(inventoryCategoryLabel(transfer.category))}</td><td>{transfer.sourceType === 'matrix' ? uiT('SPH ') + transfer.sph + uiT(' / CYL ') + transfer.cyl : transfer.itemName}</td><td><b>{transfer.quantity}</b></td><td>{auth.can('Transfers','delete')&&<button type="button" className="secondary danger" aria-label={uiT('Remove transfer')+' '+transfer.date+' '+transfer.toBranch} onClick={()=>removeTransfer(transfer)}><Trash2 size={15}/> {uiT('Remove')}</button>}</td></tr>)}</tbody></table></div>:<Empty text={uiT("No transfers yet.")}/>}</section></>;
}
