import cocLogo from './assets/coc-logo.jpg';
import DataStorage from './DataStorage';
import {useDataStorage} from './useDataStorage';
import './storage.css';
import CreditNotePage from './CreditNotePage';
import { refundedAmount, refundableAmount, nextCreditNumber, invoiceRefundItem, itemRefundPlan } from './creditNotes';
import { invoiceAmounts } from './invoiceAmounts';
import { invoiceBranchNames } from './invoiceNumbers';
import IncentivePage from './IncentivePage';
import { workOrderStage } from './workOrderStages';
import RecordPage from './RecordPages';
import { getTransferTotals, getAvailableMatrixEdits, getAvailableInventoryItems, prepareStockTransfer } from './transferData';
import { inventoryMatrices } from './inventoryData';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, Glasses, ShieldCheck, Eye, Store, Search, Plus, Bell, Menu, X, Pencil, Trash2, Phone, LogOut, Activity, ShoppingBag, ClipboardList, CheckCircle2, XCircle, Package, ArrowLeft, Boxes, FileText, ArrowLeftRight, BadgePercent, ReceiptText, Database } from 'lucide-react';

const seed = {
  customers: [
    {id:1,name:'Ahmed Mohamed',phone:'01012345678',email:'ahmed@example.com',branch:'Nasr City',joined:'2026-10-12',notes:'Prefers lightweight frames'},
    {id:2,name:'Mona Ali',phone:'01123456789',email:'mona@example.com',branch:'Maadi',joined:'2026-10-15',notes:'Call before visit'},
    {id:3,name:'Omar Hassan',phone:'01234567890',email:'omar@example.com',branch:'Nasr City',joined:'2026-10-19',notes:''}
  ],
  orders: [
    {id:101,customerId:1,product:'Prescription glasses',brand:'Ray-Ban',price:3200,purchaseDate:'2026-10-12',warrantyEnd:'2027-10-12',status:'Ready'},
    {id:102,customerId:2,product:'Sunglasses',brand:'VEGAS',price:1800,purchaseDate:'2026-10-15',warrantyEnd:'2027-04-15',status:'Delivered'}
  ],
  exams: [
    {id:201,customerId:1,date:'2026-10-12',rightEye:'-1.25',leftEye:'-1.00',notes:'Routine check'},
    {id:202,customerId:2,date:'2026-10-15',rightEye:'-0.50',leftEye:'-0.75',notes:'Follow-up in 6 months'}
  ],
  branches: [...invoiceBranchNames],
  invoices: [],
  creditNotes: [],
  invoiceEvents: [],
  salesRecords: [],
  inventoryItems: [],
  vendorTransactions: [],
  transfers: []
};
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
const inventoryCategoryLabel = category => category?'Vegas '+category:'';
const load = (key) => {
  try {
    const stored=localStorage.getItem('opticrm_'+key);
    let value=stored?JSON.parse(stored):seed[key];
    if(key==='branches'&&!localStorage.getItem('opticrm_migration_removeMaadi_v1')){
      value=value.filter(branch=>String(branch).trim().toLowerCase()!=='maadi');
      localStorage.setItem('opticrm_branches',JSON.stringify(value));
      localStorage.setItem('opticrm_migration_removeMaadi_v1','done');
    }
    if(key==='branches'&&!localStorage.getItem('opticrm_migration_invoiceBranches_v1')){
      value=[...value,...invoiceBranchNames.filter(name=>!value.some(branch=>branch.trim().toLowerCase()===name.toLowerCase()))];
      localStorage.setItem('opticrm_branches',JSON.stringify(value));
      localStorage.setItem('opticrm_migration_invoiceBranches_v1','done');
    }
    return value;
  } catch { return seed[key]; }
};
const money = n => new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(Number(n)||0);

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
    vendorName:record.vendorName||'',amount:Number(record.amountOfBill),payments:0,reference:record.woNumber||'Sales record'
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
const prepareExamImage = file => new Promise((resolve,reject)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){reject(new Error('Choose a JPG, PNG, or WebP image.'));return;}
  if(file.size>10*1024*1024){reject(new Error('Choose an image smaller than 10 MB.'));return;}
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('The image could not be read. Please try again.'));
  reader.onload=()=>{
    const image=new Image();
    image.onerror=()=>reject(new Error('The image could not be opened. Choose another image.'));
    image.onload=()=>{
      try{
        const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        const context=canvas.getContext('2d');if(!context)throw new Error('Image upload is unavailable in this browser.');
        context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
        let dataUrl=canvas.toDataURL('image/jpeg',0.85);
        if(dataUrl.length>1200000)dataUrl=canvas.toDataURL('image/jpeg',0.65);
        if(dataUrl.length>1500000)throw new Error('The image is too large to save. Choose a smaller image.');
        resolve({dataUrl,name:file.name});
      }catch(error){reject(error);}
    };
    image.src=String(reader.result);
  };
  reader.readAsDataURL(file);
});

export default function App(){
  const [data,setData] = useState(()=>{const initial=Object.fromEntries(Object.keys(seed).map(k=>[k,load(k)]));initial.orders=initial.orders.map(order=>({...order,status:workOrderStage(order.status)}));return {...initial,salesRecords:syncProcurementRecords(initial.salesRecords,initial.orders)};});
  const [page,setPage] = useState('Dashboard Analytics');
  const [creditInvoiceId,setCreditInvoiceId]=useState('');
  const [focusedInvoiceId,setFocusedInvoiceId]=useState('');
  const displayInvoices=data.invoices.map(invoice=>({...invoice,refundedAmount:refundedAmount(invoice.id,data.creditNotes),remainingReturnQuantity:invoiceRefundItem(invoice,data.creditNotes).remainingQuantity,returnedQuantity:invoiceRefundItem(invoice,data.creditNotes).returnedQuantity}));
  const [search,setSearch] = useState('');
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
  const [logged,setLogged] = useState(()=>sessionStorage.getItem('opticrm_logged')==='yes');
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [form,setForm] = useState({});
  const [examImagePreview,setExamImagePreview] = useState(null);
  const [examImageLoading,setExamImageLoading] = useState(false);
  const [examImageError,setExamImageError] = useState('');
  const examImageRequest=useRef(0);
  const [inventoryCategory,setInventoryCategory] = useState('');
  const [matrixEdits,setMatrixEdits] = useState(()=>{try{return JSON.parse(localStorage.getItem('opticrm_inventoryMatrices')||'{}')}catch{return {}}});
  const storage=useDataStorage(data,matrixEdits,setData,setMatrixEdits,()=>({
    data:Object.fromEntries(Object.keys(seed).map(key=>[key,load(key)])),
    matrixEdits:(()=>{try{return JSON.parse(localStorage.getItem('opticrm_inventoryMatrices')||'{}')}catch{return {}}})()
  }));
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
  const customerName = id => customers.find(c=>c.id===Number(id))?.name || 'Unknown customer';
  const filteredCustomers = useMemo(()=>customers.filter(c=>[c.name,c.phone,c.email,c.branch].join(' ').toLowerCase().includes(search.toLowerCase())),[customers,search]);
  const nav = [['Dashboard Analytics',LayoutDashboard],['Customers',Users],['Invoice List',FileText],['Credit Note',ReceiptText],['Work Orders',ClipboardList],['Incentive',BadgePercent],['Eye Exams',Eye],['Branches',Store],['Procurement',ClipboardList],['Inventory',Package],['Check Before Order',CheckCircle2],['Vendor Statement',FileText],['Transfers',ArrowLeftRight],['Data storage',Database]];
  function openForm(type,item=null){
    examImageRequest.current++;setExamImageLoading(false);setExamImageError('');
    setModal(type); setEditing(item);
    setForm(item?{...item,...(type==='exam'?examPrescription(item):{})}:type==='customer'?{name:'',phone:'',email:'',branch:data.branches[0]||'',joined:new Date().toISOString().slice(0,10),notes:''}:type==='exam'?{customerId:customers[0]?.id||'',date:localToday(),rightSph:'',rightCyl:'',rightAxis:'',rightAdd:'',leftSph:'',leftCyl:'',leftAxis:'',leftAdd:'',ipd:'',examImage:null,notes:''}:type==='salesRecord'?{lensCategory:'',lensEyes:'Both',rightSph:'',rightCyl:'',leftSph:'',leftCyl:'',date:localToday(),woNumber:'',workOrderId:'',status:'Pending',typeOfSales:'',price:'',amount:'',vendorName:'',amountOfBill:'',salesProfit:''}:type==='vendorTransaction'?{vendorName:vendorNames.get(selectedVendor.slice(7))==='Unassigned vendor'?'':vendorNames.get(selectedVendor.slice(7))||'',date:localToday(),transactionType:'Bill',amount:'',payments:''}:type==='inventoryItem'?{date:localToday(),category:inventoryCategory,itemName:'',sku:'',quantity:'',minQuantity:'',unitPrice:'',branch:data.branches[0]||''}:{name:''});
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
      if(editing){
        save({...data,branches:data.branches.map(branch=>branch===editing.name?name:branch),customers:data.customers.map(customer=>customer.branch===editing.name?{...customer,branch:name}:customer),transfers:data.transfers.map(transfer=>({...transfer,toBranch:transfer.toBranch===editing.name?name:transfer.toBranch,sourceBranch:transfer.sourceBranch===editing.name?name:transfer.sourceBranch})),inventoryItems:data.inventoryItems.map(item=>item.branch===editing.name?{...item,branch:name}:item)});
      } else save({...data,branches:[...data.branches,name]});
    } else {
      const key=modal==='customer'?'customers':modal==='exam'?'exams':modal==='salesRecord'?'salesRecords':modal==='vendorTransaction'?'vendorTransactions':'inventoryItems';
      let list=[...data[key]];
      const clean={...form};
      if(modal==='exam') clean.customerId=Number(form.customerId);
      if(modal==='salesRecord') {
        const linkedOrder=getLinkedWorkOrder(clean,data.orders);
        if(clean.workOrderId&&!linkedOrder){flash('Choose an available work order or remove the link.');return;}
        clean.status=linkedOrder?(linkedOrder.status||'New'):(procurementStatuses.includes(form.status)?form.status:'Pending');
        if(linkedOrder){clean.workOrderId=linkedOrder.id;clean.woNumber=workOrderNumber(linkedOrder);}
        const stockCheck=getSalesStockCheck(clean,inventoryMatrices,availableMatrixEdits);
        if(getStandardSalesFamily(clean.typeOfSales)&&!stockCheck.complete){flash('Select Minus or Plus and enter SPH and CYL for each selected eye.');return;}
        if(shouldNotifySalesStock(clean)&&stockCheck.anyAvailable&&!window.confirm(salesStockMessage(clean,stockCheck)+' Save this sales record anyway?'))return;
        clean.woNumber=String(clean.woNumber||'').trim();
        if(!clean.woNumber){window.alert('Please enter a WO Number.');return;}
        if(hasDuplicateWo(data.salesRecords,clean.woNumber,editing?.id)){
          window.alert(`WO Number "${clean.woNumber}" already exists. This record will still be saved.`);
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
    if(!window.confirm('Delete branch "'+name+'"? Customer and inventory records will be kept with their branch unassigned.'))return;
    save({...data,branches:data.branches.filter(branch=>branch!==name),customers:data.customers.map(customer=>customer.branch===name?{...customer,branch:''}:customer),inventoryItems:data.inventoryItems.map(item=>item.branch===name?{...item,branch:''}:item)});
    flash('Branch deleted');
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
        const cents=Math.round(Number(payload.amount)*100),balance=Math.round(invoiceAmounts(current).balance*100);
        if(!Number.isFinite(cents)||cents<=0||cents>balance)return 'Payment must be greater than zero and no more than the balance due.';
        updated.paid=(Math.round(Number(invoice.paid||0)*100)+cents)/100;
        event=invoiceEvent(invoice.id,'Payment recorded',(payload.method||'Cash')+(payload.reference?' — '+payload.reference:''),cents/100);
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
    const plan=itemRefundPlan(current,data.creditNotes,selection?.quantity);
    if(plan.error)return plan.error;
    const cents=Math.round(plan.amount*100);
    if(!String(reason||'').trim())return 'Enter a reason for the refund.';
    const note={id:crypto.randomUUID(),number:nextCreditNumber(data.creditNotes,invoice.branch),invoiceId:invoice.id,invoiceNumber:invoice.number||'INV-'+invoice.id,customerId:invoice.customerId,customerName:customerName(invoice.customerId),branch:invoice.branch||'',date:localToday(),amount:cents/100,items:plan.items,reason:String(reason).trim(),salesPerson:invoice.salesPerson||'',sku:invoice.sku||''};
    if(!save({...data,creditNotes:[note,...data.creditNotes],invoiceEvents:[invoiceEvent(invoice.id,'Refund recorded',note.number+' — '+plan.items[0].quantity+' × '+plan.items[0].sku+' — '+note.reason,note.amount),...data.invoiceEvents]}))return 'The refund could not be saved.';
    flash('Refund recorded. Credit note '+note.number+' created.');return true;
  }
  function saveInvoice(record){
    delete record.refundedAmount;delete record.remainingReturnQuantity;delete record.returnedQuantity;
    const refunded=refundedAmount(record.id,data.creditNotes),original=data.invoices.find(item=>item.id===record.id);
    const hasItemReturns=data.creditNotes.some(note=>String(note.invoiceId)===String(record.id)&&note.items?.length);
    if(original&&hasItemReturns&&['sku','quantity','total','discount'].some(field=>field==='sku'?String(record[field]||'')!==String(original[field]||''):Number(record[field]??(field==='quantity'?1:0))!==Number(original[field]??(field==='quantity'?1:0)))){
      window.alert('The item, quantity, subtotal, and discount cannot change after an item refund.');return false;
    }
    if(original?.locked||original?.isVoided){window.alert('Unlock an active invoice before editing it.');return false;}
    if(original){record.locked=original.locked||false;record.isVoided=original.isVoided||false;}
    if(refunded>0&&(Number(record.paid)<refunded||invoiceAmounts(record).total<refunded||String(record.customerId)!==String(original?.customerId))){
      window.alert('An invoice with refunds must keep its original customer, and its payment and total cannot be less than the refunded amount.');return false;
    }
    if(record.workOrderId){
      const order=data.orders.find(item=>String(item.id)===String(record.workOrderId));
      if(!order||String(order.customerId)!==String(record.customerId)){window.alert('Select a work order for this customer.');return false;}
      if(data.invoices.some(item=>item.id!==record.id&&String(item.workOrderId)===String(order.id))){window.alert('This work order is already linked to another invoice.');return false;}
    }
    return save({...data,invoices:data.invoices.some(item=>item.id===record.id)?data.invoices.map(item=>item.id===record.id?record:item):[record,...data.invoices],invoiceEvents:[invoiceEvent(record.id,original?'Invoice updated':record.sourceInvoiceId?'Invoice cloned':'Invoice created',record.sourceInvoiceId?'Copied from '+(data.invoices.find(item=>item.id===record.sourceInvoiceId)?.number||record.sourceInvoiceId):record.number),...data.invoiceEvents]});
  }
  function saveWorkOrder(record){
    const {invoiceId,...order}=record;
    let invoices=data.invoices;
    if(Object.prototype.hasOwnProperty.call(record,'invoiceId')){
      const selected=invoiceId?data.invoices.find(item=>String(item.id)===String(invoiceId)):null;
      if(invoiceId&&(!selected||String(selected.customerId)!==String(order.customerId))){window.alert('Select an invoice for this customer.');return false;}
      if(selected?.workOrderId&&String(selected.workOrderId)!==String(order.id)){window.alert('This invoice is already linked to another work order.');return false;}
      invoices=data.invoices.map(item=>selected&&item.id===selected.id?{...item,workOrderId:order.id}:String(item.workOrderId)===String(order.id)?{...item,workOrderId:''}:item);
    }else if(data.invoices.some(item=>String(item.workOrderId)===String(order.id)&&String(item.customerId)!==String(order.customerId))){
      window.alert('Select a matching invoice before changing the customer.');return false;
    }
    if(data.invoices.some(item=>(item.locked||item.isVoided)&&String(item.workOrderId||'')!==String(invoices.find(candidate=>candidate.id===item.id)?.workOrderId||''))){
      window.alert('Unlock an active invoice before changing its work order link.');return false;
    }
    return save({...data,invoices,orders:data.orders.some(item=>item.id===order.id)?data.orders.map(item=>item.id===order.id?order:item):[order,...data.orders]});
  }
  function createCustomer(customer){
    const id=Math.max(Date.now(),...data.customers.map(item=>Number(item.id)||0))+1;
    return save({...data,customers:[{...customer,id},...data.customers]})?id:null;
  }
  function removeCustomer(id){if(!window.confirm('Delete this customer and linked orders/exams?'))return;save({...data,customers:data.customers.filter(c=>c.id!==id),orders:data.orders.filter(o=>o.customerId!==id),exams:data.exams.filter(x=>x.customerId!==id)});flash('Customer deleted');}
  function removeItem(key,id){if(key==='invoices'&&data.invoices.find(item=>item.id===id)?.locked){flash('Unlock this invoice before deleting it.');return;}if(key==='invoices'&&data.creditNotes.some(note=>String(note.invoiceId)===String(id))){flash('This invoice has linked credit notes and cannot be deleted.');return;}if(!window.confirm('Delete this record?'))return;save({...data,[key]:data[key].filter(x=>x.id!==id)});flash('Record deleted');}
  function login(e){e.preventDefault();if(!loginEmail.trim()||!loginPassword.trim())return;sessionStorage.setItem('opticrm_logged','yes');setLogged(true);}
  if(!logged)return <div className="login-screen"><form className="login-card" onSubmit={login}><div className="login-logo"><img src={typeof cocLogo==='string'?cocLogo:cocLogo.src} alt="COC — Cairo Optical Center"/></div><p className="eyebrow">COC CRM</p><h1>Welcome back</h1><p className="muted">Sign in to manage customers, orders and branches.</p><label>Email<input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="you@company.com"/></label><label>Password<input type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Enter any password for this demo"/></label><button className="primary full">Sign in</button><p className="tiny">Demo login only: any non-empty email/password works. This is not secure authentication.</p></form></div>;
  const stats=[{label:'Total customers',value:customers.length,icon:Users,detail:'Registered customer profiles'},{label:'Procurement',value:data.salesRecords.length,icon:ClipboardList,detail:'Procurement records'},{label:'Eye exams',value:data.exams.length,icon:Eye,detail:'Saved exam records'},{label:'Branches',value:data.branches.length,icon:Store,detail:'Configured locations'}];
  return <div className="app-shell">{storage.busy&&<div className="storage-blocked" role="status">Connecting storage...</div>}
    <aside id="workspace-navigation" ref={sidebarRef} aria-label="Workspace navigation" className={`sidebar ${mobileNav?'show':''}`}><div className="brand"><div className="brand-mark"><Glasses size={24}/></div><div><strong>COC</strong><small>Customer Management</small></div><button className="icon-btn close-nav" aria-label="Close navigation" onClick={()=>setMobileNav(false)}><X/></button></div><div className="workspace"><span className="status-dot"/> COC <span className="chevron">⌄</span></div><p className="nav-label">WORKSPACE</p><nav>{nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label||(label==='Inventory'&&page==='Inventory Category')?'active':''}`} onClick={()=>{setPage(label);setMobileNav(false);setSearch('');setCreditInvoiceId('');setFocusedInvoiceId('')}}><Icon size={18}/><span>{label}</span>{label==='Customers'&&<span className="nav-count">{customers.length}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>{storage.mode==='online'?'Online storage':'Browser storage'}</strong><p>{storage.status}</p><button className="text-btn" onClick={()=>setPage('Data storage')}>Storage options</button></div><button className="nav-item logout" onClick={()=>{sessionStorage.removeItem('opticrm_logged');setLogged(false)}}><LogOut size={18}/> Sign out</button><div className="profile"><div className="avatar">AD</div><div><strong>Admin Demo</strong><small>Demo account</small></div><span className="chevron">•••</span></div></div></aside>
    {mobileNav&&<div className="nav-overlay" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area" inert={mobileNav||undefined}><header className="topbar"><button ref={menuRef} className="icon-btn mobile-menu" aria-label="Open navigation" aria-controls="workspace-navigation" aria-expanded={mobileNav} onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><button className={'storage-indicator '+(storage.error?'has-error':'')} onClick={()=>setPage('Data storage')} title={storage.error||storage.status}>{storage.mode==='online'?'Online':'This browser'} · {storage.status}</button><div className="search-top"><Search size={16}/><input aria-label="Search customers" placeholder="Search customers..." value={search} onChange={e=>{setSearch(e.target.value);setPage('Customers')}}/></div><button className="icon-btn notification" title={salesStockAlerts.length+' stock notifications'} aria-label="Stock notifications" aria-expanded={showStockNotifications} onClick={()=>setShowStockNotifications(value=>!value)}><Bell size={19}/>{salesStockAlerts.length>0&&<i/>}</button><div className="avatar">AD</div></div></header>
    <div className="content">{showStockNotifications&&<section className="panel stock-notification-panel" aria-label="Stock notifications"><div className="panel-head"><div><h2>Stock notifications</h2><p>{salesStockAlerts.length} sales records used another vendor while matching Vegas stock is available.</p></div><button className="icon-btn" aria-label="Close stock notifications" onClick={()=>setShowStockNotifications(false)}><X size={18}/></button></div>{salesStockAlerts.map(({record,check})=><div className="order-stock-notice" key={record.id}><strong>WO: {record.woNumber}</strong><p>{salesStockMessage(record,check)}</p><button className="text-btn" onClick={()=>{setPage('Procurement');setShowStockNotifications(false);openForm('salesRecord',record)}}>Review sales record</button></div>)}{!salesStockAlerts.length&&<p className="muted">No sales records need a Vegas stock warning.</p>}</section>}<div className="page-heading"><div><p className="eyebrow">COC / WORKSPACE</p><h1>{page}</h1><p className="muted">{{'Dashboard Analytics':'Here’s what’s happening across your optical stores.',Customers:'Manage customer profiles and contact details.','Invoice List':'Manage customer invoices, payments, and outstanding balances.','Credit Note':'Review customer credit notes and invoice references.','Work Orders':'Follow every work order through preparation, production, shipping, and receipt.','Incentive':'Review Frame and Vegas lens commission by salesperson and invoice date.','Eye Exams':'Keep eye exam records linked to each customer.',Branches:'Manage locations in your optical group.','Procurement':'Compare sales types with vendor names and review bill amounts and profit.','Check Before Order':'Enter a prescription to check Vegas lens availability before placing an order.','Transfers':'View transfers between branches.','Vendor Statement':'View vendor statements and account activity.',Inventory:'Track lens stock across the four inventory categories.','Inventory Category':`Manage stock for ${inventoryCategoryLabel(inventoryCategory)}.`}[page]}</p></div>{page==='Customers'&&<button className="primary" onClick={()=>openForm('customer')}><Plus size={17}/> Add customer</button>}{page==='Eye Exams'&&<button className="primary" onClick={()=>openForm('exam')}><Plus size={17}/> Add eye exam</button>}{page==='Vendor Statement'&&<button className="primary" onClick={()=>openForm('vendorTransaction')}><Plus size={17}/> Add transaction</button>}{page==='Branches'&&<button className="primary" onClick={()=>openForm('branch')}><Plus size={17}/> Add branch</button>}{page==='Procurement'&&<button className="primary" onClick={()=>openForm('salesRecord')}><Plus size={17}/> Add record</button>}{page==='Inventory Category'&&<div className="heading-actions"><button className="secondary" onClick={()=>{setPage('Inventory');setInventoryCategory('')}}><ArrowLeft size={16}/> All categories</button><button className="primary" onClick={()=>openForm('inventoryItem')}><Plus size={17}/> Add stock item</button></div>}</div>
    {page==='Data storage'&&<DataStorage storage={storage}/>}
    {page==='Dashboard Analytics'&&<><div className="stat-grid">{stats.map(s=><div className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><span className="stat-icon"><s.icon size={19}/></span></div><h2>{s.value}</h2><p>{s.detail}</p></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>Recent customers</h2><p>Latest registered profiles</p></div><button className="text-btn" onClick={()=>setPage('Customers')}>View all →</button></div><CustomerTable rows={[...customers].slice(0,5)} onEdit={c=>openForm('customer',c)} onDelete={removeCustomer}/></section><section className="panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Common tasks</p></div></div><div className="quick-actions"><button onClick={()=>openForm('customer')}><span className="quick-icon brand-accent"><Users/></span><span><b>Register customer</b><small>Create a new customer profile</small></span><span className="arrow">→</span></button><button onClick={()=>setPage('Check Before Order')}><span className="quick-icon orange"><Search/></span><span><b>Check before order</b><small>Check prescription stock availability</small></span><span className="arrow">&#8594;</span></button><button onClick={()=>openForm('exam')}><span className="quick-icon green"><Eye/></span><span><b>Add eye exam</b><small>Save an exam to customer history</small></span><span className="arrow">→</span></button></div></section></div></>}
    {page==='Customers'&&<section className="panel"><div className="panel-head"><div><h2>Customer directory</h2><p>{filteredCustomers.length} profiles found</p></div><div className="search-inline"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, phone, email..."/></div></div><CustomerTable rows={filteredCustomers} onEdit={c=>openForm('customer',c)} onDelete={removeCustomer}/>{filteredCustomers.length===0&&<Empty text="No customers found. Try another search or add a customer."/>}</section>}
    {page==='Eye Exams'&&<section className="panel"><div className="panel-head"><div><h2>Eye exam records</h2><p>Prescription values and exam images linked to customers</p></div></div><ExamTable rows={data.exams} customerName={customerName} onEdit={exam=>openForm('exam',exam)} onDelete={id=>removeItem('exams',id)} onViewImage={setExamImagePreview}/>{!data.exams.length&&<Empty text="No eye exams saved yet."/>}</section>}
    {page==='Branches'&&<section className="branch-grid">{data.branches.map((b,i)=><div className="branch-card" key={b}><div className="branch-icon"><Store/></div><div><h3>{b}</h3><p>{customers.filter(c=>c.branch===b).length} registered customers</p></div><span className="branch-number">{String(i+1).padStart(2,'0')}</span><div className="row-actions branch-actions"><button className="icon-btn" onClick={()=>openForm('branch',{name:b})} title="Edit branch" aria-label={"Edit "+b}><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>removeBranch(b)} title="Delete branch" aria-label={"Delete "+b}><Trash2 size={16}/></button></div></div>)}{!data.branches.length&&<Empty text="No branches yet."/>}</section>}
    {page==='Procurement'&&<section className="panel sales-report-panel"><div className="panel-head"><div><h2>Procurement report</h2><p>{reportSales.length} of {data.salesRecords.length} records ? Totals reflect the selected dates.</p></div></div><div className="sales-date-filters"><label>Start Date<input type="date" value={salesStartDate} max={salesEndDate||undefined} onChange={e=>setSalesStartDate(e.target.value)}/></label><label>End Date<input type="date" value={salesEndDate} min={salesStartDate||undefined} onChange={e=>setSalesEndDate(e.target.value)}/></label><button className="secondary" onClick={()=>{setSalesStartDate('');setSalesEndDate('')}} disabled={!salesStartDate&&!salesEndDate}>Clear dates</button></div>{invalidSalesRange&&<p className="sales-date-error" role="alert">End Date must be on or after Start Date.</p>}{(salesStartDate||salesEndDate)&&<p className="sales-match-hint sales-report-note">Both dates are included. Records without a date are excluded from the date report.</p>}<SalesTable rows={reportSales} allRows={data.salesRecords} onEdit={r=>openForm('salesRecord',r)} onDelete={id=>removeItem('salesRecords',id)}/>{!reportSales.length&&<Empty text={data.salesRecords.length?'No sales records match the selected dates.':'No sales records yet. Click Add record to enter one.'}/>}</section>}
    {page==='Inventory'&&<section className="inventory-grid">{inventoryCategories.map((category,index)=>{const count=availableInventoryItems.filter(item=>item.category===category).length;const quantity=availableInventoryItems.filter(item=>item.category===category).reduce((sum,item)=>sum+Number(item.quantity||0),0);return <button className="inventory-category-card" key={category} onClick={()=>{setInventoryCategory(category);setPage('Inventory Category')}}><span className="inventory-card-icon"><Package size={22}/></span><span className="inventory-card-copy"><b>{inventoryCategoryLabel(category)}</b><small>{count} stock items · {quantity} custom-item units · {matrixTotal(category)} matrix units</small></span><span className="inventory-card-number">0{index+1}</span><span className="inventory-card-arrow">→</span></button>})}</section>}
    {page==='Inventory Category'&&<section className="panel inventory-matrix-panel"><div className="panel-head"><div><h2>Stock quantity matrix</h2><p>Row value × column value · Click any cell to edit quantity. Changes save automatically in this browser.</p></div><div className="matrix-total"><span>Total matrix units</span><b>{matrixTotal(inventoryCategory).toLocaleString()}</b></div></div><div className="matrix-scroll"><table className="matrix-table"><thead><tr><th className="matrix-axis">Row / Column</th>{inventoryMatrices[inventoryCategory].columns.map((column,c)=><th key={c}>{column}</th>)}<th className="matrix-sum">Row total</th></tr></thead><tbody>{inventoryMatrices[inventoryCategory].rows.map((row,r)=><tr key={r}><th scope="row">{row}</th>{inventoryMatrices[inventoryCategory].columns.map((_,c)=><td key={c}><input type="text" inputMode="numeric" aria-label={`${inventoryCategoryLabel(inventoryCategory)}, row ${row}, column ${inventoryMatrices[inventoryCategory].columns[c]}`} value={getMatrixValue(inventoryCategory,r,c)??''} placeholder="–" onChange={e=>updateMatrixCell(inventoryCategory,r,c,e.target.value)}/></td>)}<td className="matrix-sum">{inventoryMatrices[inventoryCategory].columns.reduce((sum,_,c)=>sum+Number(getMatrixValue(inventoryCategory,r,c)||0),0)}</td></tr>)}</tbody><tfoot><tr><th>Column total</th>{inventoryMatrices[inventoryCategory].columns.map((_,c)=><td key={c}>{inventoryMatrices[inventoryCategory].rows.reduce((sum,_,r)=>sum+Number(getMatrixValue(inventoryCategory,r,c)||0),0)}</td>)}<td>{matrixTotal(inventoryCategory)}</td></tr></tfoot></table></div><p className="matrix-footnote">A dash in the original sheet is shown as an empty cell, not a recorded quantity. Enter 0 or a positive whole number to update it.</p></section>}
    {page==='Inventory Category'&&<section className="panel"><div className="panel-head"><div><h2>{inventoryCategoryLabel(inventoryCategory)}</h2><p>{availableInventoryItems.filter(item=>item.category===inventoryCategory).length} stock records</p></div></div><InventoryTable rows={availableInventoryItems.filter(item=>item.category===inventoryCategory)} onEdit={item=>openForm('inventoryItem',item)} onDelete={id=>removeItem('inventoryItems',id)}/>{!availableInventoryItems.some(item=>item.category===inventoryCategory)&&<Empty text="No stock items yet. Click Add stock item to add your first item."/>}</section>}
    {page==='Check Before Order'&&<StockCheckPage matrixEdits={availableMatrixEdits}/>}
    {page==='Vendor Statement'&&<section className="panel vendor-statement-panel"><div className="panel-head"><div><h2>Vendor Statement Report</h2><p>Bills are linked by Vendor Name from Procurement. Each vendor has a separate balance.</p></div></div><div className="sales-date-filters vendor-report-filters"><label>Vendor<select value={selectedVendor} onChange={e=>setSelectedVendor(e.target.value)}><option value="all">All vendors</option>{[...vendorNames].sort((a,b)=>a[1].localeCompare(b[1])).map(([key,name])=><option key={key} value={"vendor:"+key}>{name}</option>)}</select></label><label>Start Date<input type="date" value={vendorStartDate} max={vendorEndDate||undefined} onChange={e=>setVendorStartDate(e.target.value)}/></label><label>End Date<input type="date" value={vendorEndDate} min={vendorStartDate||undefined} onChange={e=>setVendorEndDate(e.target.value)}/></label><button className="secondary" onClick={()=>{setSelectedVendor('all');setVendorStartDate('');setVendorEndDate('')}}>Clear filters</button></div>{vendorStartDate&&vendorEndDate&&vendorStartDate>vendorEndDate&&<p role="alert" className="sales-date-error">End Date must be on or after Start Date.</p>}{(vendorStartDate||vendorEndDate)&&<p className="sales-match-hint sales-report-note">Both dates are included. Opening balance includes dated transactions before Start Date. Undated records are excluded while filtering by date.</p>}{vendorGroups.map(group=><section className="vendor-report-group" key={group.key}><h3>{group.name}</h3>{group.key===''&&<p className="sales-match-hint sales-report-note">Edit these transactions to assign a vendor.</p>}<VendorStatementTable transactions={group.transactions} startDate={vendorStartDate} endDate={vendorEndDate} onEdit={record=>record.sourceSalesId!==undefined?openForm('salesRecord',data.salesRecords.find(sale=>sale.id===record.sourceSalesId)):openForm('vendorTransaction',record)} onDelete={id=>removeItem('vendorTransactions',id)}/></section>)}{!vendorGroups.length&&<Empty text="No vendor transactions found. Add a transaction with a vendor name to begin."/>}</section>}
    {page==='Invoice List'&&<RecordPage key={'invoices-'+focusedInvoiceId} kind="invoice" records={displayInvoices} initialQuery={focusedInvoiceId?(data.invoices.find(item=>String(item.id)===String(focusedInvoiceId))?.number||''):''} onRefund={recordRefund} creditNotes={data.creditNotes} onInvoiceAction={invoiceAction} invoiceEvents={data.invoiceEvents} onViewCreditNotes={id=>{setCreditInvoiceId(id);setPage('Credit Note');}} invoices={data.invoices} customers={customers} onCreateCustomer={createCustomer} branches={data.branches} workOrders={data.orders} onSave={saveInvoice} onDelete={id=>removeItem('invoices',id)}/>}
    {page==='Work Orders'&&<RecordPage key="orders" kind="order" records={data.orders} invoices={data.invoices} customers={customers} onCreateCustomer={createCustomer} branches={data.branches} onSave={saveWorkOrder} onDelete={id=>removeItem('orders',id)}/>}
    {page==='Transfers'&&<TransfersPage branches={data.branches} transfers={data.transfers} matrixEdits={availableMatrixEdits} inventoryItems={availableInventoryItems} onTransfer={transferStock}/>} 
    {page==='Credit Note'&&<CreditNotePage notes={data.creditNotes} invoiceId={creditInvoiceId} onClearInvoice={()=>setCreditInvoiceId('')} onOpenInvoice={id=>{setFocusedInvoiceId(id);setPage('Invoice List');}}/>}
    {page==='Incentive'&&<IncentivePage invoices={data.invoices}/>}
    <footer className="footer"><span>© 2026 COC CRM Demo</span><span><Activity size={13}/> {storage.status}</span></footer></div></main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className={modal==='salesRecord'?'modal sales-record-modal':modal==='exam'?'modal exam-modal':'modal'} onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">COC CRM</p><h2>{editing?'Edit':'Add'} {modal==='customer'?'customer':modal==='exam'?'eye exam':modal==='salesRecord'?'sales record':modal==='vendorTransaction'?'vendor transaction':modal==='inventoryItem'?'stock item':'branch'}</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(null)}><X/></button></div>
    {modal==='customer'&&<div className="form-grid"><label>Full name *<input required value={form.name||''} onChange={e=>updateField('name',e.target.value)} placeholder="Customer full name"/></label><label>Phone number *<input required value={form.phone||''} onChange={e=>updateField('phone',e.target.value)} placeholder="01xxxxxxxxx"/></label><label>Email<input type="email" value={form.email||''} onChange={e=>updateField('email',e.target.value)} placeholder="customer@email.com"/></label><label>Branch<select value={form.branch||''} onChange={e=>updateField('branch',e.target.value)}>{data.branches.map(b=><option key={b}>{b}</option>)}</select></label><label>Registration date<input type="date" value={form.joined||''} onChange={e=>updateField('joined',e.target.value)}/></label><label className="span-2">Notes<textarea rows="3" value={form.notes||''} onChange={e=>updateField('notes',e.target.value)} placeholder="Preferences or follow-up notes"/></label></div>}
    {modal==='exam'&&<div className="form-grid"><label>Customer *<select required value={form.customerId||''} onChange={e=>updateField('customerId',e.target.value)}>{customers.map(customer=><option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label>Exam date<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><div className="exam-prescription-grid span-2">{[['right','Right Eye (OD)'],['left','Left Eye (OS)']].map(([eye,title])=><fieldset className="exam-eye-fields" key={eye}><legend>{title}</legend><div className="exam-eye-inputs">{[['Sph','SPH'],['Cyl','CYL'],['Axis','Axis'],['Add','ADD']].map(([suffix,label])=>{const key=eye+suffix;return <label key={key}>{label}<input aria-label={title+' '+label} type="number" step={suffix==='Axis'?'1':'0.25'} min={suffix==='Axis'?'0':undefined} max={suffix==='Axis'?'180':undefined} value={form[key]??''} onChange={event=>updateField(key,event.target.value)} placeholder={suffix==='Axis'?'0 to 180':suffix==='Add'?'+1.50':'-1.00'}/></label>;})}</div></fieldset>)}</div><label className="span-2">IPD (mm)<input type="number" min="0" step="0.1" value={form.ipd??''} onChange={e=>updateField('ipd',e.target.value)} placeholder="e.g. 62"/></label><label className="span-2">Upload exam image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={examImageLoading} onChange={uploadExamImage}/><small>JPG, PNG, or WebP, up to 10 MB. Large images are resized for storage.</small></label>{examImageLoading&&<p className="span-2" role="status">Preparing image...</p>}{examImageError&&<p className="sales-date-error span-2" role="alert">{examImageError}</p>}{form.examImage?.dataUrl&&<div className="exam-image-preview span-2"><button type="button" className="exam-image-button" onClick={()=>setExamImagePreview(form.examImage)} aria-label="View exam image"><img src={form.examImage.dataUrl} alt="Uploaded eye exam"/></button><span>{form.examImage.name}</span><button type="button" className="secondary" disabled={examImageLoading} onClick={()=>updateField('examImage',null)}>Remove image</button></div>}<label className="span-2">Notes<textarea rows="3" value={form.notes||''} onChange={e=>updateField('notes',e.target.value)} placeholder="Exam notes"/></label></div>}
    {modal==='vendorTransaction'&&<div className="form-grid"><label className="span-2">Vendor Name *<input required list="vendor-name-options" value={form.vendorName||''} onChange={e=>updateField('vendorName',e.target.value)} placeholder="Enter vendor name"/><datalist id="vendor-name-options">{[...vendorNames].filter(([key])=>key!=='').map(([key,name])=><option key={key} value={name}/>)}</datalist></label><label>Date *<input required type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>Transaction Type *<select required value={form.transactionType||'Bill'} onChange={e=>updateField('transactionType',e.target.value)}><option>Bill</option><option>Payment</option><option>Credit</option></select></label>{isVendorReduction(form.transactionType)?<label className="span-2">{form.transactionType==='Credit'?'Credit Amount (EGP) *':'Payments (EGP) *'}<input required type="number" min="0.01" step="0.01" value={form.payments??''} onChange={e=>updateField('payments',e.target.value)}/></label>:<label className="span-2">Amount (EGP) *<input required type="number" min="0.01" step="0.01" value={form.amount??''} onChange={e=>updateField('amount',e.target.value)}/></label>}<p className="sales-match-hint span-2">Balance is calculated automatically as total bill amounts minus payments and credits.</p></div>}
    {modal==='branch'&&<label>Branch name *<input required value={form.name||''} onChange={e=>updateField('name',e.target.value)} placeholder="e.g. Heliopolis"/></label>}
    {modal==='inventoryItem'&&<div className="form-grid"><label>Date<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>Category *<select required value={form.category||inventoryCategory} onChange={e=>updateField('category',e.target.value)}>{inventoryCategories.map(category=><option key={category} value={category}>{inventoryCategoryLabel(category)}</option>)}</select></label><label>Item name *<input required value={form.itemName||''} onChange={e=>updateField('itemName',e.target.value)} placeholder="Lens/product name"/></label><label>SKU / Code<input value={form.sku||''} onChange={e=>updateField('sku',e.target.value)} placeholder="Product code"/></label><label>Quantity *<input required min="0" type="number" value={form.quantity??''} onChange={e=>updateField('quantity',e.target.value)}/></label><label>Minimum stock level<input min="0" type="number" value={form.minQuantity??''} onChange={e=>updateField('minQuantity',e.target.value)}/></label><label>Unit price (EGP)<input min="0" step="0.01" type="number" value={form.unitPrice??''} onChange={e=>updateField('unitPrice',e.target.value)}/></label><label>Branch<select value={form.branch||data.branches[0]||''} onChange={e=>updateField('branch',e.target.value)}>{data.branches.map(branch=><option key={branch}>{branch}</option>)}</select></label></div>}
    {modal==='salesRecord'&&<div className="form-grid"><label>Date<input type="date" value={form.date||''} onChange={e=>updateField('date',e.target.value)}/></label><label>Linked work order<select value={linkedProcurementOrder?.id??form.workOrderId??''} onChange={event=>{const order=data.orders.find(item=>String(item.id)===event.target.value);setForm(current=>({...current,workOrderId:order?.id||'',woNumber:order?workOrderNumber(order):'',status:order?.status||'Pending'}));}}><option value="">No linked work order</option>{form.workOrderId&&!linkedProcurementOrder&&<option value={form.workOrderId}>Work order unavailable</option>}{data.orders.map(order=><option key={order.id} value={order.id}>{workOrderNumber(order)} — {customerName(order.customerId)}</option>)}</select></label><label>WO. Number *<input required readOnly={Boolean(form.workOrderId)} value={linkedProcurementOrder?workOrderNumber(linkedProcurementOrder):form.woNumber||''} onChange={e=>updateField('woNumber',e.target.value)} placeholder="e.g. WO-1001"/></label><label>Status<select disabled={Boolean(linkedProcurementOrder)} value={linkedProcurementOrder?.status||form.status||'Pending'} onChange={e=>updateField('status',e.target.value)}>{(linkedProcurementOrder?[linkedProcurementOrder.status||'New']:procurementStatuses).map(status=><option key={status}>{status}</option>)}</select></label>{linkedProcurementOrder&&<p className="sales-match-hint span-2">Status updates automatically from the linked work order. Change it in Work Orders.</p>}<label>Type of Sales *<input required list="sales-type-options" value={form.typeOfSales||''} onChange={e=>setForm(current=>({...current,typeOfSales:e.target.value,lensCategory:getStandardSalesFamily(current.typeOfSales)===getStandardSalesFamily(e.target.value)?current.lensCategory:''}))} placeholder="Select or enter sales type"/><datalist id="sales-type-options">{[...new Set(['Standard HMC','Standard Blue Infrared',...data.salesRecords.map(record=>record.typeOfSales).filter(Boolean)])].map(type=><option key={type} value={type}/>)}</datalist></label>{salesLensFamily&&<><label>Vegas Stock Category *<select required value={form.lensCategory||''} onChange={e=>updateField('lensCategory',e.target.value)}><option value="">Select Minus or Plus</option>{inventoryCategories.filter(category=>category.startsWith(salesLensFamily+' ')).map(category=><option key={category} value={category}>{inventoryCategoryLabel(category)}</option>)}</select></label><label>Eyes<select value={form.lensEyes||'Both'} onChange={e=>updateField('lensEyes',e.target.value)}><option value="Both">Both eyes</option><option value="Right">Right eye only</option><option value="Left">Left eye only</option></select></label>{(form.lensEyes==='Right'?['right']:form.lensEyes==='Left'?['left']:['right','left']).map(eye=><React.Fragment key={eye}><label>{eye==='right'?'Right':'Left'} SPH *<input required type="number" step="0.25" value={form[eye+'Sph']??''} onChange={e=>updateField(eye+'Sph',e.target.value)}/></label><label>{eye==='right'?'Right':'Left'} CYL *<input required type="number" step="0.25" value={form[eye+'Cyl']??''} onChange={e=>updateField(eye+'Cyl',e.target.value)}/></label></React.Fragment>)}{salesStockCheck.complete?<div className={salesStockCheck.anyAvailable?'order-stock-notice span-2':'order-stock-result span-2'} role="status" aria-live="polite"><strong>{salesStockCheck.anyAvailable?(shouldNotifySalesStock(form)?'This lens is available in Vegas stock. Why was it not ordered from Vegas?':'Matching lenses are available in Vegas stock.'):'No matching lenses available in Vegas stock.'}</strong>{salesStockCheck.groups.map((group,index)=><p key={index}>SPH {group.sph.toFixed(2)} / CYL {group.cyl.toFixed(2)}: {group.quantity} available, {group.needed} needed.</p>)}{salesStockCheck.anyAvailable&&!salesStockCheck.allAvailable&&<p>Available stock covers only part of this prescription.</p>}</div>:<p className="sales-match-hint span-2">Select the Vegas stock category and enter SPH (row) and CYL (column) to check availability.</p>}</>}<label>Price<input min="0" type="number" step="0.01" value={form.price??''} onChange={e=>updateField('price',e.target.value)}/></label><label>Vendor Name *<input required value={form.vendorName||''} onChange={e=>updateField('vendorName',e.target.value)} placeholder="Enter vendor name"/></label><label>Amount of Bill<input min="0" type="number" step="0.01" value={form.amountOfBill??''} onChange={e=>updateField('amountOfBill',e.target.value)}/></label><label>Sales Profit<input readOnly value={salesProfit(form).toFixed(2)}/></label><label>Profit %<input readOnly className={salesProfit(form)<0?"profit-loss":""} value={salesProfitPercentage(form)}/></label><p className="sales-match-hint span-2">Sales Profit = Price − Amount of Bill. Profit % = Sales Profit ÷ Price × 100.</p><p className="sales-match-hint span-2">Agreement is checked automatically: Type of Sales and Vendor Name must match exactly (ignoring letter case and extra spaces).</p></div>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button><button className="primary" type="submit" disabled={modal==='exam'&&examImageLoading}>Save {modal==='customer'?'customer':modal==='exam'?'exam':modal==='salesRecord'?'record':modal==='vendorTransaction'?'transaction':modal==='inventoryItem'?'stock item':'branch'}</button></div></form></div>}
    {examImagePreview&&<ExamImageViewer image={examImagePreview} onClose={()=>setExamImagePreview(null)}/>}
    {notice&&<div className="toast">✓ &nbsp;{notice}</div>}
  </div>;
}
function CustomerTable({rows,onEdit,onDelete}){return <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Branch</th><th>Registered</th><th>Actions</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td><div className="customer-cell"><div className="avatar customer-avatar">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div><b>{c.name}</b><small>{c.email||'No email added'}</small></div></div></td><td><span className="phone"><Phone size={13}/>{c.phone}</span></td><td><span className="branch-pill">{c.branch||'—'}</span></td><td>{c.joined||'—'}</td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(c)} title="Edit"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(c.id)} title="Delete"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
function Empty({text}){return <div className="empty"><Users size={25}/><p>{text}</p></div>}

function SalesTable({rows,allRows=rows,onEdit,onDelete}){
  const moneyValue=n=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(Number(n)||0);
  const matches=r=>String(r.typeOfSales||'').trim().toLocaleLowerCase()===String(r.vendorName||'').trim().toLocaleLowerCase();
  const totals = rows.reduce((sum, record) => ({price: sum.price + Number(record.price || 0), amountOfBill: sum.amountOfBill + Number(record.amountOfBill || 0)}), {price: 0, amountOfBill: 0});
  return <div className="table-wrap sales-table"><table><thead><tr><th>Date</th><th>WO. Number</th><th>Type of Sales</th><th>Price</th><th>Vendor Name</th><th>Amount of Bill</th><th>Sales Profit</th><th>Profit %</th><th>Approval</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date||String.fromCharCode(8212)}</td><td className={hasDuplicateWo(allRows,r.woNumber,r.id)?"duplicate-wo":""}><b>{r.woNumber||'—'}</b></td><td>{r.typeOfSales||'—'}</td><td>{moneyValue(r.price)}</td><td>{r.vendorName||'—'}</td><td>{moneyValue(r.amountOfBill)}</td><td><b>{moneyValue(salesProfit(r))}</b></td><td className={salesProfit(r)<0?"profit-loss":""}>{salesProfitPercentage(r)}</td><td>{matches(r)?<span className="agreement agreement-yes"><CheckCircle2 size={16}/> متوافق</span>:<span className="agreement agreement-no"><XCircle size={16}/> غير متوافق</span>}</td><td><span className={'status '+({Pending:'new',Ordered:'in-progress',Received:'ready',Done:'ready',Returned:'cancelled','Glasses Prep':'in-progress',RX:'in-progress',Lab:'in-progress',Tint:'in-progress',Shipping:'in-progress',Waiting:'in-progress',New:'new','In progress':'in-progress',Ready:'ready',Delivered:'ready',Cancelled:'cancelled'}[r.status||'Pending']||'new')}>{r.status||'Pending'}</span></td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(r)} title="Edit"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(r.id)} title="Delete"><Trash2 size={16}/></button></div></td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={3}>Total</th><td>{moneyValue(totals.price)}</td><td colSpan={2}></td><td>{moneyValue(salesProfit(totals))}</td><td className={salesProfit(totals)<0?"profit-loss":""}>{salesProfitPercentage(totals)}</td><td colSpan={3}></td></tr></tfoot></table></div>;
}

function InventoryTable({rows,onEdit,onDelete}){return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Item name</th><th>SKU / Code</th><th>Branch</th><th>Quantity</th><th>Min. stock</th><th>Unit price</th><th>Stock status</th><th>Actions</th></tr></thead><tbody>{rows.map(item=>{const low=Number(item.quantity||0)<=Number(item.minQuantity||0);return <tr key={item.id}><td>{item.date||'—'}</td><td><b>{item.itemName}</b></td><td>{item.sku||'—'}</td><td><span className="branch-pill">{item.branch||'—'}</span></td><td><b>{Number(item.quantity)||0}</b></td><td>{Number(item.minQuantity)||0}</td><td>{money(item.unitPrice)}</td><td><span className={`status ${low?'cancelled':'ready'}`}>{low?'Low stock':'In stock'}</span></td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(item)} title="Edit"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(item.id)} title="Delete"><Trash2 size={16}/></button></div></td></tr>})}</tbody></table></div>}

function VendorStatementTable({transactions,startDate='',endDate='',onEdit,onDelete}){
  const statement=getVendorReport(transactions,startDate,endDate);
  const currency=value=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  return <div className="table-wrap vendor-statement-table"><table><thead><tr><th>Date</th><th>Transaction Type</th><th>Amount</th><th>Payments / Credits</th><th>Balance</th><th>Actions</th></tr></thead><tbody><tr className="vendor-opening-balance"><th scope="row" colSpan={4}>Opening Balance</th><td>{currency(statement.openingBalance)}</td><td></td></tr>{statement.rows.map(record=><tr key={record.id}><td>{record.date||String.fromCharCode(8212)}</td><td><span className={record.transactionType==='Bill'?'status pending':'status ready'}>{record.transactionType}</span>{record.sourceSalesId!==undefined&&<small className="vendor-bill-source">Sales WO: {record.reference}</small>}</td><td>{currency(record.amount)}</td><td>{currency(record.payments)}</td><td><b>{currency(record.balance)}</b></td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(record)} title={record.sourceSalesId!==undefined?"Edit linked sales record":"Edit transaction"} aria-label={record.sourceSalesId!==undefined?"Edit linked sales record":"Edit transaction"}><Pencil size={16}/></button><button className="icon-btn danger" disabled={record.sourceSalesId!==undefined} onClick={()=>onDelete(record.id)} title={record.sourceSalesId!==undefined?"Manage this bill in Procurement":"Delete transaction"} aria-label="Delete transaction"><Trash2 size={16}/></button></div></td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>Period totals / Closing balance</th><td>{currency(statement.totalAmount)}</td><td>{currency(statement.totalPayments)}</td><td>{currency(statement.balance)}</td><td></td></tr></tfoot></table></div>;
}

const emptyStockPrescription={lensCategory:'HMC 1.56 Minus',lensEyes:'Both',rightSph:'',rightCyl:'',leftSph:'',leftCyl:''};
function StockCheckPage({matrixEdits}){
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
  return <section className="panel stock-check-panel"><div className="panel-head"><div><h2>Check lens availability</h2><p>Choose a stock category and enter the prescription. Each selected eye needs one lens.</p></div></div><form onSubmit={checkStock} className="stock-check-form"><div className="form-grid"><label>Stock Category<select value={prescription.lensCategory} onChange={event=>update('lensCategory',event.target.value)}>{inventoryCategories.map(category=><option key={category} value={category}>{inventoryCategoryLabel(category)}</option>)}</select></label><label className="span-2">Eyes<select value={prescription.lensEyes} onChange={event=>update('lensEyes',event.target.value)}><option value="Both">Both eyes</option><option value="Right">Right eye only</option><option value="Left">Left eye only</option></select></label>{(prescription.lensEyes==='Right'?['right']:prescription.lensEyes==='Left'?['left']:['right','left']).map(eye=><React.Fragment key={eye}><label>{eye==='right'?'Right':'Left'} SPH *<input required type="number" step="0.25" value={prescription[eye+'Sph']} placeholder="e.g. -1.00" onChange={event=>update(eye+'Sph',event.target.value)}/></label><label>{eye==='right'?'Right':'Left'} CYL *<input required type="number" step="0.25" value={prescription[eye+'Cyl']} placeholder="e.g. -0.50" onChange={event=>update(eye+'Cyl',event.target.value)}/></label></React.Fragment>)}</div><p className="stock-check-help">SPH matches the stock row and CYL matches the stock column. Enter 0 for a zero power.</p>{error&&<p className="sales-date-error" role="alert">{error}</p>}<div className="stock-check-actions"><button className="primary" type="submit"><Search size={18}/> Check Stock</button><button className="secondary" type="button" onClick={()=>{setPrescription({...emptyStockPrescription});setCheckedPrescription(null);setError('');}}>Clear</button></div></form>{check&&<StockAvailabilityResult prescription={checkedPrescription} check={check}/>}</section>;
}
function StockAvailabilityResult({prescription,check}){
  const state=check.allAvailable?'available':check.anyAvailable?'partial':'unavailable';
  return <div className={'stock-check-result '+state} role="status" aria-live="polite"><h3>{check.allAvailable?'Available in stock':check.anyAvailable?'Partially available in stock':'Not available in stock'}</h3><p>{inventoryCategoryLabel(prescription.lensCategory)}</p><div className="table-wrap"><table><thead><tr><th>Eye</th><th>SPH</th><th>CYL</th><th>Needed</th><th>Available</th><th>Result</th></tr></thead><tbody>{check.groups.map((group,index)=><tr key={index}><td>{group.eyes.map(eye=>eye==='right'?'Right':'Left').join(' + ')}</td><td>{group.sph.toFixed(2)}</td><td>{group.cyl.toFixed(2)}</td><td>{group.needed}</td><td>{group.quantity}</td><td>{group.quantity>=group.needed?'Available':group.quantity>0?'Insufficient quantity':'Not available'}</td></tr>)}</tbody></table></div>{check.groups.some(group=>!group.matched)&&<p>This prescription is outside the selected stock matrix.</p>}<p>{check.allAvailable?'Matching lenses are available from Vegas stock.':check.anyAvailable?'Some lenses are in stock. Additional lenses are needed to complete the prescription.':'No matching lenses are currently available in the selected Vegas stock category.'}</p></div>;
}

function ExamTable({rows,customerName,onEdit,onDelete,onViewImage}){
  return <div className="table-wrap exam-table"><table><thead><tr><th rowSpan={2}>Customer</th><th rowSpan={2}>Exam date</th><th colSpan={4} scope="colgroup">Right Eye (OD)</th><th colSpan={4} scope="colgroup">Left Eye (OS)</th><th rowSpan={2}>IPD (mm)</th><th rowSpan={2}>Image</th><th rowSpan={2}>Notes</th><th rowSpan={2}>Actions</th></tr><tr>{['right','left'].map(eye=>['SPH','CYL','Axis','ADD'].map(label=><th key={eye+label} scope="col">{label}</th>))}</tr></thead><tbody>{rows.map(exam=>{const prescription=examPrescription(exam);return <tr key={exam.id}><td><b>{customerName(exam.customerId)}</b></td><td>{exam.date||String.fromCharCode(8212)}</td>{['rightSph','rightCyl','rightAxis','rightAdd','leftSph','leftCyl','leftAxis','leftAdd','ipd'].map(key=><td key={key}>{prescription[key]!==''?prescription[key]:String.fromCharCode(8212)}</td>)}<td>{exam.examImage?.dataUrl?<button className="exam-image-button" onClick={()=>onViewImage(exam.examImage)} title="View exam image" aria-label="View exam image"><img className="exam-image-thumb" src={exam.examImage.dataUrl} alt="Eye exam attachment"/></button>:String.fromCharCode(8212)}</td><td>{exam.notes||String.fromCharCode(8212)}</td><td><div className="row-actions"><button className="icon-btn" onClick={()=>onEdit(exam)} title="Edit"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>onDelete(exam.id)} title="Delete"><Trash2 size={16}/></button></div></td></tr>;})}</tbody></table></div>;
}
function ExamImageViewer({image,onClose}){
  return <div className="modal-backdrop exam-image-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}} onKeyDown={event=>{if(event.key==='Escape')onClose();}}><div className="exam-image-viewer" role="dialog" aria-modal="true" aria-label="Exam image"><div className="modal-head"><h2>{image.name||'Exam image'}</h2><button autoFocus type="button" className="icon-btn" onClick={onClose} aria-label="Close exam image"><X/></button></div><img src={image.dataUrl} alt="Full eye exam image"/></div></div>;
}

function TransfersPage({branches,transfers,matrixEdits,inventoryItems,onTransfer}){
  const initial={date:localToday(),sourceType:'matrix',category:inventoryCategories[0],row:'',column:'',sourceItemId:'',toBranch:'',quantity:''};
  const [transferForm,setTransferForm]=useState(initial);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const update=(key,value)=>{setTransferForm(current=>({...current,[key]:value}));setError('');setSuccess('');};
  const matrix=inventoryMatrices[transferForm.category];
  const items=inventoryItems.filter(item=>item.category===transferForm.category);
  const item=items.find(candidate=>String(candidate.id)===transferForm.sourceItemId);
  const selectedCell=transferForm.row!==''&&transferForm.column!=='';
  const cell=transferForm.row+':'+transferForm.column;
  const available=transferForm.sourceType==='item'?Number(item?.quantity||0):selectedCell?Number(Object.prototype.hasOwnProperty.call(matrixEdits[transferForm.category]||{},cell)?matrixEdits[transferForm.category][cell]:matrix.values[Number(transferForm.row)]?.[Number(transferForm.column)])||0:0;
  const selectionReady=transferForm.sourceType==='item'?Boolean(item):selectedCell;
  const submitTransfer=event=>{
    event.preventDefault();setError('');setSuccess('');
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
  return <><section className="panel transfer-panel"><div className="panel-head"><div><h2>Send stock to a branch</h2><p>Choose stock, a destination branch, and a quantity. Saving subtracts the quantity from available inventory.</p></div></div>{!branches.length&&<p className="sales-date-error" role="alert">Add destination branches in Branches before making a transfer.</p>}<form className="transfer-form" onSubmit={submitTransfer}><div className="form-grid"><label>Transfer Date *<input required type="date" value={transferForm.date} onChange={event=>update('date',event.target.value)}/></label><label>Destination Branch *<select required value={transferForm.toBranch} onChange={event=>update('toBranch',event.target.value)}><option value="">Choose branch</option>{branches.map(branch=><option key={branch}>{branch}</option>)}</select></label><label>Stock Source<select value={transferForm.sourceType} onChange={event=>{setTransferForm(current=>({...current,sourceType:event.target.value,sourceItemId:'',row:'',column:'',quantity:''}));setError('');setSuccess('');}}><option value="matrix">Lens stock matrix</option><option value="item">Inventory stock item</option></select></label><label>Stock Category<select value={transferForm.category} onChange={event=>{setTransferForm(current=>({...current,category:event.target.value,row:'',column:'',sourceItemId:'',quantity:''}));setError('');setSuccess('');}}>{inventoryCategories.map(category=><option key={category} value={category}>{inventoryCategoryLabel(category)}</option>)}</select></label>{transferForm.sourceType==='matrix'?<><label>SPH (row) *<select required value={transferForm.row} onChange={event=>update('row',event.target.value)}><option value="">Choose SPH</option>{matrix.rows.map((value,index)=><option key={index} value={index}>{value}</option>)}</select></label><label>CYL (column) *<select required value={transferForm.column} onChange={event=>update('column',event.target.value)}><option value="">Choose CYL</option>{matrix.columns.map((value,index)=><option key={index} value={index}>{value}</option>)}</select></label></>:<label className="span-2">Stock Item *<select required value={transferForm.sourceItemId} onChange={event=>update('sourceItemId',event.target.value)}><option value="">Choose stock item</option>{items.map(stock=><option key={stock.id} value={stock.id}>{stock.itemName} - {stock.branch||'Inventory'} - {stock.quantity} available</option>)}</select></label>}<label>Quantity *<input required type="number" min="1" step="1" max={selectionReady?available:undefined} value={transferForm.quantity} onChange={event=>update('quantity',event.target.value)}/></label><div className="transfer-available"><span>Available at source</span><strong>{selectionReady?available:'Select stock'}</strong>{item?.branch&&<small>Source branch: {item.branch}</small>}</div></div>{error&&<p className="sales-date-error" role="alert">{error}</p>}{success&&<p className="transfer-success" role="status">{success}</p>}<button className="primary" type="submit" disabled={!branches.length||!selectionReady||available<=0}><ArrowLeftRight size={18}/> Transfer stock</button></form></section><section className="panel transfer-panel"><div className="panel-head"><div><h2>Stock sent to branches</h2><p>Received quantities from saved transfers, grouped by destination and stock.</p></div></div><div className="transfer-branch-summary">{branches.map(branch=><div key={branch}><b>{branch}</b><span>{transfers.filter(transfer=>transfer.toBranch===branch).reduce((sum,transfer)=>sum+Number(transfer.quantity),0)} units sent</span></div>)}</div>{received.size>0?<div className="table-wrap"><table><thead><tr><th>Branch</th><th>Category</th><th>Prescription / Item</th><th>Units received</th></tr></thead><tbody>{[...received.values()].sort((a,b)=>a.toBranch.localeCompare(b.toBranch)).map((record,index)=><tr key={index}><td>{record.toBranch}</td><td>{inventoryCategoryLabel(record.category)}</td><td>{record.sourceType==='matrix'?'SPH '+record.sph+' / CYL '+record.cyl:record.itemName}</td><td><b>{record.quantity}</b></td></tr>)}</tbody></table></div>:<Empty text="No stock has been transferred yet."/>}</section><section className="panel transfer-panel"><div className="panel-head"><div><h2>Transfer history</h2><p>{transfers.length} saved transfers</p></div></div>{transfers.length?<div className="table-wrap"><table><thead><tr><th>Date</th><th>From</th><th>To branch</th><th>Category</th><th>Prescription / Item</th><th>Quantity</th></tr></thead><tbody>{[...transfers].sort((a,b)=>b.date.localeCompare(a.date)).map(transfer=><tr key={transfer.id}><td>{transfer.date}</td><td>{transfer.sourceBranch||'Inventory'}</td><td>{transfer.toBranch}</td><td>{inventoryCategoryLabel(transfer.category)}</td><td>{transfer.sourceType==='matrix'?'SPH '+transfer.sph+' / CYL '+transfer.cyl:transfer.itemName}</td><td><b>{transfer.quantity}</b></td></tr>)}</tbody></table></div>:<Empty text="No transfers yet."/>}</section></>;
}
