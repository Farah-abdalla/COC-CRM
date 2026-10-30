import {categoryProductRankings} from './dashboardSales.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {todaySalesSummary} from './dashboardSales.js';
test('today sales use Cairo dates, invoice totals and dated credits without double counting refunds',()=>{
 const invoices=[{id:1,date:'2026-10-29',branch:'Nasr City',total:100.11,discount:10,shippingCharge:5,adjustment:-1,paid:999,refundedAmount:20,salesPerson:'Alice'},{id:2,date:'2026-10-29',branch:'New Cairo',total:200.20,salesPerson:'Bob'},{id:3,date:'2026-10-28',branch:'Nasr City',total:500},{id:4,date:'2026-10-29',branch:'Nasr City',total:999,isVoided:true},{id:5,branch:'Nasr City',total:999}];
 const creditNotes=[{id:'a',invoiceId:3,date:'2026-10-29',amount:120},{id:'b',invoiceId:1,date:'2026-10-28',amount:20},{id:'c',invoiceId:2,date:'2026-10-29',amount:15,isVoided:true}];
 const summary=todaySalesSummary({invoices,creditNotes,branches:['Nasr City','New Cairo','Heliopolis']},new Date('2026-10-28T22:30:00Z'));
 assert.equal(summary.date,'2026-10-29');
 const nasr=summary.byBranch.find(row=>row.branch==='Nasr City');assert.deepEqual(nasr,{branch:'Nasr City',invoiceCount:1,grossCents:9411,refundCents:12000,netCents:-2589});
 assert.equal(summary.byBranch.find(row=>row.branch==='New Cairo').netCents,20020);assert.equal(summary.byBranch.find(row=>row.branch==='Heliopolis').netCents,0);
 assert.deepEqual(summary.salespeople.find(row=>row.name==='Alice'),{branch:'Nasr City',name:'Alice',amountCents:9411});
 assert.equal(summary.salespeople.length,2);assert.ok(!JSON.stringify(summary).includes('invoiceId'));
});
test('empty dashboard data returns real zero branch totals',()=>{const result=todaySalesSummary({invoices:[],creditNotes:[],branches:['A']},new Date('2026-10-29T10:00:00Z'));assert.equal(result.byBranch[0].netCents,0);assert.equal(result.byBranch[0].invoiceCount,0);assert.deepEqual(result.salespeople,[]);});

test('category product rankings use exact catalogue categories, quantities and discounted line totals',()=>{
 const odooReportProducts=[{id:1,name:'V2054 Clip',sku:'CLIP',categoryName:'Eyeglasses'},{id:2,name:'V2030',sku:'FRAME',categoryName:'Eyeglasses'},{id:3,name:'Sun Model',sku:'SUN',categoryName:'Sunglasses'},{id:4,name:'Lens Model',sku:'LENS',categoryName:'Glasses'},{id:5,name:'Sunglasses case',sku:'CASE',categoryName:'Accessories'}];
 const invoices=[{id:1,date:'2026-10-29',branch:'A',salesPerson:'Alice',discount:40,shippingCharge:99,items:[{id:'clip',sku:'CLIP',quantity:3,unitPriceCents:10000,lineTotalCents:30000},{id:'lens',sku:'LENS',quantity:1,unitPriceCents:10000,lineTotalCents:10000}]},{id:2,date:'2026-10-29',branch:'B',salesPerson:'Bob',sku:'FRAME',quantity:2,total:900},{id:3,date:'2026-10-29',branch:'A',sku:'SUN',quantity:1,total:100},{id:4,date:'2026-10-28',branch:'A',sku:'FRAME',quantity:99,total:9900},{id:5,date:'2026-10-29',branch:'A',sku:'FRAME',quantity:99,total:9900,isVoided:true},{id:6,date:'2026-10-29',branch:'A',sku:'CASE',quantity:99,total:9900}];
 const summary=todaySalesSummary({invoices,creditNotes:[],branches:['A','B'],odooReportProducts},new Date('2026-10-29T10:00:00Z'));
 const result=categoryProductRankings(summary.categorySales);
 assert.deepEqual(result[0].products.map(row=>row.name),['V2054 Clip','V2030']);assert.equal(result[0].products[0].quantity,3);assert.equal(result[0].products[0].amountCents,27000);assert.equal(result[2].products[0].amountCents,9000);assert.equal(result[1].products[0].name,'Sun Model');
 assert.deepEqual(categoryProductRankings(summary.categorySales,'A')[0].products.map(row=>row.name),['V2054 Clip']);assert.deepEqual(categoryProductRankings(summary.categorySales,'Missing').map(row=>row.products),[[],[],[]]);
});
test('product ranking combines one product across branches and uses revenue to order equal quantities',()=>{
 const rows=[{branch:'A',category:'Glasses',productId:1,productName:'A',amountCents:10000,quantity:1},{branch:'B',category:'Glasses',productId:1,productName:'A',amountCents:10000,quantity:2},{branch:'A',category:'Glasses',productId:2,productName:'B',amountCents:25000,quantity:3}];
 const result=categoryProductRankings(rows)[2].products;assert.deepEqual(result.map(row=>row.name),['B','A']);assert.equal(result[1].quantity,3);assert.equal(result[1].amountCents,20000);assert.equal(categoryProductRankings(rows,'B')[2].products[0].name,'A');
});
