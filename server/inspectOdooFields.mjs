// Server-only, read-only schema audit. Run: node server/inspectOdooFields.mjs
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const defaults=['product.product','product.category','stock.quant','coc.branch','stock.location','stock.warehouse','stock.move','account.move.line','account.move','sale.order','sale.order.line','res.partner','mrp.workorder','repair.order','ir.model'];
const config={...loadEnv('development',process.cwd(),'ODOO_'),...Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('ODOO_')))};
if(!config.ODOO_API_KEY)throw new Error('Configure the server-only ODOO_API_KEY before inspecting fields.');
const secret=config.ODOO_API_KEY,db=config.ODOO_DB||'coc';
async function rpc(service,method,args){
 const response=await fetch((config.ODOO_URL||'https://rx.coceyewear.com/odoo-api').replace(/\/$/,'')+'/jsonrpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{service,method,args},id:1}),signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!response.ok)throw new Error('Odoo schema request failed: HTTP '+response.status);
 const body=await response.json();
 if(body.error)return {error:String(body.error.data?.message||body.error.message||'Request rejected').split(secret).join('[redacted]').slice(0,1500)};
 if(!Object.hasOwn(body,'result'))throw new Error('Odoo returned an invalid schema response.');
 return body.result;
}
const uid=await rpc('common','authenticate',[db,config.ODOO_LOGIN||'external-dev-api',secret,{}]);
if(!Number.isSafeInteger(uid)||uid<=0)throw new Error('Odoo authentication failed.');
const report={checkedAt:new Date().toISOString(),method:'fields_get',scope:'Known CRM models and their directly referenced relation models; the gateway blocks ir.model enumeration.',models:{}};
async function inspect(model){
 await new Promise(resolve=>setTimeout(resolve,400));
 const fields=await rpc('object','execute_kw',[db,uid,secret,model,'fields_get',[],{attributes:['string','type','relation','required','readonly','selection','help','store']}]);
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('Invalid field definitions for '+model);
 report.models[model]=fields;
 console.log(model+': '+(fields.error?'unavailable':Object.keys(fields).length+' fields'));
}
for(const model of defaults)await inspect(model);
const related=[...new Set(Object.values(report.models).filter(fields=>!fields.error).flatMap(fields=>Object.values(fields).map(field=>field.relation).filter(Boolean)))];
for(const model of related.filter(model=>!Object.hasOwn(report.models,model)))await inspect(model);
const escape=value=>String(value??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
const open=Object.entries(report.models).filter(([,fields])=>!fields.error),blocked=Object.entries(report.models).filter(([,fields])=>fields.error);
const lines=['# Odoo field inventory','',`Checked: ${report.checkedAt}`, '',report.scope,'',`${open.length} readable model schemas; ${open.reduce((count,[,fields])=>count+Object.keys(fields).length,0)} field definitions. A field appearing here does not grant write access or guarantee record access. All requests were read-only.`, '', '## Work-order mapping', '', '- Invoice identity: account.move.id/name ↔ CRM invoice.odooInvoiceId/number.', '- Customer reference: account.move.partner_id ↔ CRM customer.odooPartnerId; direct customer-model access is blocked.', '- Invoice lines: account.move.invoice_line_ids → account.move.line; product_id → product.product.', '- Possible sales-order bridge: account.move.line.sale_line_ids → sale.order.line. The related sales-order model is blocked, so IDs alone cannot identify or import work orders.', '- Branch and staff: account.move.branch_id, coc_salesperson, coc_cashier, invoice_user_id are exposed by fields_get.', '- No work-order or prescription relation is exposed by the returned invoice header schema. mrp.workorder and repair.order are blocked.', '- Keep CRM invoice.workOrderId linked to a real CRM order. Do not substitute an Odoo sale-line ID or infer a work order from customer/product similarity.', '- To enable automatic linking, the gateway owner must provide the actual optical work-order model and allow its read methods, stable ID/number, invoice relation, customer, branch, dates, stage, products and prescription fields. Then verify those definitions with fields_get.', '', '## Model summary', '', '| Model | Fields or access result |','| --- | --- |',...Object.entries(report.models).map(([model,fields])=>`| ${model} | ${fields.error?escape(fields.error):Object.keys(fields).length} |`)];
for(const [model,fields] of open){lines.push('',`## ${model}`,'','| Field | Label | Type | Relation | Required | Readonly | Selection | Help |','| --- | --- | --- | --- | --- | --- | --- | --- |');for(const [name,field] of Object.entries(fields))lines.push('| '+[name,field.string,field.type,field.relation,field.required,field.readonly,field.selection?JSON.stringify(field.selection):'',field.help].map(escape).join(' | ')+' |');}
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/odoo-fields-get.json',JSON.stringify(report,null,2)+'\n');
await writeFile('artifacts/odoo-fields-get.md',lines.join('\n')+'\n');
console.log(JSON.stringify({readableModels:open.length,unavailableModels:blocked.length,fields:open.reduce((count,[,fields])=>count+Object.keys(fields).length,0)}));
