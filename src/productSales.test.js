import test from 'node:test';
import assert from 'node:assert/strict';
import {productGroup,productSales,productLinks,productSelectors} from './productSales.js';
import {normalizeInvoiceItems} from './invoiceItems.js';
import {reportSources,runReport} from './reportData.js';
import {emptySnapshot,mergePermittedSnapshot,normalizePermissions,visibleSnapshot} from './accessControl.js';
import {importOdooInvoices} from './mergeOdooInvoices.js';
const records=[{id:7057,name:'Sunglasses 4900',default_code:'OUTSIDESUNGLASSES',categ_id:[6,'Sunglasses']},{id:7614,name:'Eyeglasses 999',default_code:'Eyeglasses 999',categ_id:[4,'Eyeglasses']},{id:11282,name:'VEGAS BLUE ASP 1.61 BB X6',default_code:'6666660',categ_id:[14,'VEGAS X6 1.61 Lens']},{id:14438,name:'VEGAS PHOTO GREY SHMC 1.56 BB X6',default_code:'6666667',categ_id:[17,'Glasses']}];
const links=productLinks(records);
test('Odoo categories and X6 names select product groups without classifying unrelated Vegas products',()=>{
 assert.equal(productGroup(records[0]),'sunglasses');assert.equal(productGroup(records[1]),'eyeglasses');assert.equal(productGroup(records[2]),'vegasX6');assert.equal(productGroup(records[3]),'vegasX6');
 assert.equal(productGroup({name:'VEGAS FASHION ROUND',categ_id:[6,'Sunglasses']}),'sunglasses');assert.equal(productGroup({name:'VEGAS 1.56 SHMC AR',categ_id:[17,'Glasses']}),'');
});
test('product tiles use exact Odoo links and allocate invoice discounts across product lines',()=>{
 const invoice={items:[{id:'sun',sku:'[OUTSIDESUNGLASSES] Sunglasses 4900',quantity:2,unitPriceCents:10000,lineTotalCents:20000},{id:'eye',sku:'Eyeglasses 999',quantity:1,unitPriceCents:10000,lineTotalCents:10000},{id:'vegas',sku:'6666660',quantity:1,unitPriceCents:10000,lineTotalCents:10000}],discount:40,shippingCharge:30,adjustment:5};
 assert.deepEqual(productSales(invoice,links),{sunglasses:180,eyeglasses:90,vegasX6:90,accessories:0});assert.deepEqual(productSales({...invoice,isVoided:true},links),{sunglasses:0,eyeglasses:0,vegasX6:0,accessories:0});
 assert.deepEqual(productSales({sku:'random sunglasses item',quantity:1,total:100},links),{sunglasses:0,eyeglasses:0,vegasX6:0,accessories:0});
 assert.deepEqual(productSales({sku:'Eyeglasses 999',quantity:1,total:100},[...links,{...links[1],id:9}]),{sunglasses:0,eyeglasses:0,vegasX6:0,accessories:0},'Ambiguous names do not guess a product');
 const selectors=productSelectors([invoice]);assert.equal(selectors[0].code,'OUTSIDESUNGLASSES');assert.equal(selectors[0].name,'Sunglasses 4900');
});
test('Odoo imports retain stable product IDs through unchanged item editing and clear changed product links',()=>{
 const source={id:71,number:'ODOO/71',customerId:8,customer:'Customer',date:'2026-10-28',lines:[{id:10,product_id:[7057,'Original Odoo label'],quantity:1,price_total:100}]};
 const imported=importOdooInvoices(emptySnapshot().data,[source]).data.invoices[0],item=imported.items[0];assert.equal(item.odooProductId,7057);
 assert.equal(productSales(imported,links).sunglasses,100);assert.equal(normalizeInvoiceItems([item])[0].odooProductId,7057);
 assert.equal(normalizeInvoiceItems([{...item,sku:'Different item'}])[0].odooProductId,undefined);
});
test('product tiles follow selected branches and invoice dates, and staff cannot forge shared product links',()=>{
 const snapshot=emptySnapshot();snapshot.data.odooReportProducts=links;snapshot.data.branches=['A','B'];snapshot.data.invoices=[{id:1,branch:'A',date:'2026-10-28',sku:'6666660',quantity:1,total:100},{id:2,branch:'B',date:'2026-10-28',sku:'Eyeglasses 999',quantity:1,total:200},{id:3,branch:'A',date:'2026-09-01',sku:'Eyeglasses 999',quantity:1,total:900}];
 const source=reportSources(snapshot.data,()=>true).branchSales,result=runReport(source,{source:'branchSales',filters:[{field:'branch',operator:'equals',value:'A'},{field:'date',operator:'on or after',value:'2026-10-01'}],groupBy:'branch',totals:['sunglasses','eyeglasses','vegasX6']});assert.deepEqual(result.totals,{sunglasses:0,eyeglasses:0,vegasX6:100});
 const user={id:'staff',active:true,branches:['A'],permissions:normalizePermissions({'Reports':{view:true,add:true,edit:true,delete:true}})},visible=visibleSnapshot(snapshot,user);assert.equal(visible.data.odooReportProducts.length,4);const next=structuredClone(visible);next.data.odooReportProducts[0].name='Forged';assert.throws(()=>mergePermittedSnapshot(snapshot,next,user),/Only administrators/);
});

test('counts measure product units inside each category and follow branch/date grouping',()=>{
 const invoice={id:1,branch:'A',date:'2026-10-28',items:[{id:'sun',sku:'OUTSIDESUNGLASSES',quantity:3,unitPriceCents:1000,lineTotalCents:3000},{id:'x6',sku:'6666660',quantity:2,unitPriceCents:2000,lineTotalCents:4000}],discount:7};
 const metrics=productSales(invoice,links,{includeCounts:true});assert.equal(metrics.sunglassesCount,3);assert.equal(metrics.vegasX6Count,2);assert.equal(metrics.eyeglassesCount,0);assert.equal(metrics.sunglasses,27);assert.equal(metrics.vegasX6,36);
 assert.equal(productSales({...invoice,isVoided:true},links,{includeCounts:true}).sunglassesCount,0);
 const snapshot=emptySnapshot();snapshot.data.odooReportProducts=links;snapshot.data.invoices=[invoice,{id:2,branch:'B',date:'2026-10-28',sku:'6666660',quantity:5,total:100},{id:3,branch:'A',date:'2026-09-01',sku:'6666660',quantity:9,total:900}];
 const source=reportSources(snapshot.data,()=>true).branchSales,result=runReport(source,{filters:[{field:'date',operator:'on or after',value:'2026-10-28'}],groupBy:'branch',totals:['sunglassesCount','vegasX6Count']});
 assert.equal(result.totals.sunglassesCount,3);assert.equal(result.totals.vegasX6Count,7);assert.equal(result.groups.find(group=>group.value==='A').totals.vegasX6Count,2);assert.equal(result.groups.find(group=>group.value==='B').totals.vegasX6Count,5);
});

test('Accessories square uses its Odoo category for amount and quantity under branch/date filters',()=>{
 const accessory={id:900,name:'VEGAS X6 lens case',default_code:'CASE001',categ_id:[11,'Accessories']},catalogue=productLinks([...records,accessory]);
 assert.equal(productGroup(accessory),'accessories','An Accessories category takes precedence over a product model name');
 const invoice={id:10,branch:'A',date:'2026-10-28',discount:15,items:[{id:'case',sku:'CASE001',quantity:4,unitPriceCents:2500,lineTotalCents:10000},{id:'sun',sku:'OUTSIDESUNGLASSES',quantity:1,unitPriceCents:5000,lineTotalCents:5000}]};
 const metrics=productSales(invoice,catalogue,{includeCounts:true});assert.equal(metrics.accessories,90);assert.equal(metrics.accessoriesCount,4);assert.equal(metrics.sunglasses,45);assert.equal(productSales({...invoice,isVoided:true},catalogue,{includeCounts:true}).accessoriesCount,0);
 const snapshot=emptySnapshot();snapshot.data.odooReportProducts=catalogue;snapshot.data.invoices=[invoice,{id:11,branch:'B',date:'2026-10-28',sku:'CASE001',quantity:2,total:50},{id:12,branch:'A',date:'2026-09-01',sku:'CASE001',quantity:8,total:200}];
 const source=reportSources(snapshot.data,()=>true).branchSales,config={groupBy:'branch',filters:[{field:'date',operator:'on or after',value:'2026-10-28'},{field:'date',operator:'on or before',value:'2026-10-28'}],totals:['accessories','accessoriesCount']};
 const all=runReport(source,config);assert.equal(all.totals.accessories,140);assert.equal(all.totals.accessoriesCount,6);assert.equal(all.groups.length,2);
 const branch=runReport(source,{...config,filters:[...config.filters,{field:'branch',operator:'equals',value:'A'}]});assert.equal(branch.totals.accessories,90);assert.equal(branch.totals.accessoriesCount,4);
});
