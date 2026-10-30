import {validateSnapshot,mergePermittedSnapshot} from './accessControl.js';
import {invoiceItemTotals} from './invoiceItems.js';
import {itemRefundPlan} from './creditNotes.js';
export const exampleDataset='crm-test-examples-v1';
const tag=row=>({...row,testDataset:exampleDataset});
const dateOffset=(today,days)=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
export function addTestExamples(snapshot,today){
 const next=structuredClone(snapshot),added={};
 const branches=['New Cairo','Nasr City','Heliopolis'].filter(branch=>next.data.branches.includes(branch));
 if(!branches.length){next.data.branches.push('New Cairo');branches.push('New Cairo');added.branches=1;}
 const branch=index=>branches[index%branches.length],d=days=>dateOffset(today,days);
 function add(key,rows){
  for(const original of rows){const row=tag(original),existing=next.data[key].find(record=>String(record.id)===String(row.id));
   if(existing){if(existing.testDataset!==exampleDataset)throw new Error('An existing record uses a reserved example ID. No examples were added.');continue;}
   if(key==='treasuryBalances'&&next.data[key].some(record=>record.branch===row.branch&&record.category===row.category))continue;
   next.data[key].push(row);added[key]=(added[key]||0)+1;
  }
 }
 const customerId=index=>9000000000100+index,orderId=index=>'test-v1-order-'+index,invoiceId=index=>'test-v1-invoice-'+index;
 const names=['Sara Hassan','Karim Adel','Mona Sami','Omar Nabil'];
 add('customers',names.map((name,index)=>({id:customerId(index),name:'[TEST] '+name,phone:'TEST-00'+(index+1),email:'test'+(index+1)+'@example.test',branch:branch(index),joined:d(-7+index),notes:'Fictional system test customer.'})));
 add('orders',[0,1,2,3].map((index)=>({id:orderId(index),number:'WO-TEST-00'+(index+1),customerId:customerId(index),branch:branch(index),date:d(-3+index),purchaseDate:d(-3+index),dueDate:today,product:'Prescription glasses',sku:index===2?'VEGAS LENSES TEST':'FRAME TEST',brand:'[TEST] Sample brand',price:[2450,1600,2000,1000][index],status:['Glasses Prep','Lab','Shipping','Received'][index],salesPerson:['Saif','Mohamed Alaa','Mohamed Ashraf','Ehsan'][index],cashier:'Sama',notes:'Fictional work order for testing stages and invoice links.'})));
 const line=(id,sku,quantity,unitPriceCents)=>({id,sku,quantity,unitPriceCents,lineTotalCents:quantity*unitPriceCents});
 const definitions=[
  {items:[line('test-v1-line-1','FRAME CLASSIC TEST',1,100000),line('test-v1-line-2','VEGAS LENSES TEST',2,75000)],discount:100,shippingCharge:50,paid:2450},
  {items:[line('test-v1-line-3','FRAME LITE TEST',2,60000),line('test-v1-line-4','CONTACT LENS TEST',1,40000)],discount:0,shippingCharge:0,paid:500},
  {items:[line('test-v1-line-5','VEGAS LENSES TEST',1,90000),line('test-v1-line-6','SUNGLASSES TEST',1,120000)],discount:100,shippingCharge:0,paid:0},
  {items:[line('test-v1-line-7','FRAME RETRO TEST',2,50000)],discount:0,shippingCharge:0,paid:1000},
  {items:[line('test-v1-line-8','FRAME VOID TEST',1,20000)],discount:0,shippingCharge:0,paid:0,isVoided:true,voidReason:'[TEST] Voided invoice example'}
 ];
 const invoices=definitions.map((definition,index)=>({id:invoiceId(index),number:'INV-TEST-00'+(index+1),customerId:customerId(index%4),branch:branch(index%4),date:d(-3+index%4),dueDate:d(-3+index%4),workOrderId:index<4?orderId(index):'',salesPerson:['Saif','Mohamed Alaa','Mohamed Ashraf','Ehsan','Saif'][index],cashier:'Sama',adjustment:0,locked:false,notes:'[TEST] Fictional invoice — '+['fully paid, multiple items','partly paid','unpaid','partly returned','voided'][index],...definition,...invoiceItemTotals(definition.items)}));
 add('invoices',invoices);
 const event=(id,index,action,description,amount,method='',reference='')=>({id,invoiceId:invoiceId(index),invoiceNumber:invoices[index].number,branch:invoices[index].branch,customerId:invoices[index].customerId,customerName:'[TEST] '+names[index%4],action,description,amount,timestamp:invoices[index].date+'T10:00:00Z',method,reference});
 add('invoiceEvents',[
  ...invoices.map((invoice,index)=>event('test-v1-created-'+index,index,'Invoice created','[TEST] Example invoice')),
  event('test-v1-payment-1',0,'Payment recorded','Cash — TEST-RECEIPT-001',1450,'Cash','TEST-RECEIPT-001'),
  event('test-v1-payment-2',0,'Payment recorded','Instapay — TEST-INSTA-002',1000,'Instapay','TEST-INSTA-002'),
  event('test-v1-payment-3',1,'Payment recorded','Wallet — TEST-WALLET-003',500,'Wallet','TEST-WALLET-003'),
  event('test-v1-payment-4',3,'Payment recorded','Cash — TEST-RECEIPT-004',1000,'Cash','TEST-RECEIPT-004'),
  event('test-v1-refund-event',3,'Refund recorded','[TEST] One frame returned',500),
  event('test-v1-void-event',4,'Invoice voided','[TEST] Voided invoice example')
 ]);
 const refund=itemRefundPlan(invoices[3],[],[{itemId:'test-v1-line-7',quantity:1}]);
 if(refund.error)throw new Error(refund.error);
 add('creditNotes',[{id:'test-v1-credit-1',number:'CN-TEST-001',invoiceId:invoiceId(3),invoiceNumber:invoices[3].number,customerId:customerId(3),customerName:'[TEST] '+names[3],branch:branch(3),date:today,amount:refund.amount,items:refund.items,reason:'[TEST] One frame returned for testing',salesPerson:'Ehsan',sku:'FRAME RETRO TEST'}]);
 add('exams',[0,1].map(index=>({id:'test-v1-exam-'+index,customerId:customerId(index),date:d(-2+index),rightSph:'-1.25',rightCyl:'-0.50',rightAxis:'90',rightAdd:'0',leftSph:'-1.00',leftCyl:'-0.25',leftAxis:'85',leftAdd:'0',ipd:'62',examImage:null,notes:'[TEST] Fictional prescription for system testing.'})));
 add('expenses',[
  {id:'test-v1-expense-1',branch:branch(0),date:today,category:'Utilities',amountCents:35050,method:'Cash',paidTo:'[TEST] Utility company',description:'[TEST] Electricity bill',reference:'TEST-EXP-001',updatedAt:today+'T11:00:00Z'},
  {id:'test-v1-expense-2',branch:branch(1),date:today,category:'Transport',amountCents:12000,method:'Instapay',paidTo:'[TEST] Courier',description:'[TEST] Branch delivery',reference:'TEST-EXP-002',updatedAt:today+'T11:10:00Z'},
  {id:'test-v1-expense-3',branch:branch(2),date:today,category:'Supplies',amountCents:23000,method:'Bank transfer',paidTo:'[TEST] Supplies company',description:'[TEST] Cleaning supplies',reference:'TEST-EXP-003',updatedAt:today+'T11:20:00Z'}
 ]);
 add('salesRecords',[{id:'test-v1-procurement-1',date:today,workOrderId:orderId(0),woNumber:'WO-TEST-001',status:'Glasses Prep',typeOfSales:'Custom lens',vendorName:'[TEST] Optical supplier',price:2450,amountOfBill:1200}]);
 add('vendorTransactions',[
  {id:'test-v1-vendor-bill',date:d(-2),vendorName:'[TEST] Optical supplier',transactionType:'Bill',amount:800,payments:0,reference:'TEST-BILL-001'},
  {id:'test-v1-vendor-payment',date:today,vendorName:'[TEST] Optical supplier',transactionType:'Payment',amount:0,payments:300,reference:'TEST-VENDOR-PAY-001'}
 ]);
 add('inventoryItems',[{id:'test-v1-stock-1',date:today,category:'HMC 1.56 Minus',itemName:'[TEST] HMC lens pack',sku:'TEST-HMC-STOCK',quantity:10,minQuantity:3,unitPrice:120,branch:branch(0)}]);
 if(branches.length>1)add('transfers',[{id:'test-v1-transfer-1',date:today,sourceType:'item',category:'HMC 1.56 Minus',sourceItemId:'test-v1-stock-1',itemName:'[TEST] HMC lens pack',sku:'TEST-HMC-STOCK',sourceBranch:branch(0),toBranch:branch(1),quantity:2}]);
 const amounts={Cash:1250000,Bank:2500000,Instapay:450000,Wallet:180000,Purchases:750000,Expenses:35050};
 for(const [index,name] of branches.entries())add('treasuryBalances',Object.entries(amounts).map(([category,amountCents])=>({id:'test-v1-treasury-'+index+'-'+category.toLowerCase(),branch:name,category,amountCents:amountCents+index*10000,updatedAt:today+'T12:00:00Z'})));
 validateSnapshot(next);
 mergePermittedSnapshot(snapshot,next,{active:true,isAdmin:true,branches:'all'});
 return {snapshot:next,added,totalAdded:Object.values(added).reduce((sum,count)=>sum+count,0)};
}
