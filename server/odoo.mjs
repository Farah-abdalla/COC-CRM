import {groupOdooInvoices} from '../src/odooInvoiceData.js';
// Server-only: never import this module from src/.
const defaults={ODOO_URL:'https://rx.coceyewear.com/odoo-api',ODOO_DB:'coc',ODOO_LOGIN:'external-dev-api',ODOO_KEY_EXPIRES:'2027-01-24'};
const resources={
 'invoice-products':{model:'product.product',fields:['id','name','default_code','barcode','list_price','categ_id'],domain:[['active','=',true]],order:'name asc,id asc'},
 'report-products':{model:'product.product',fields:['id','name','default_code','categ_id'],domain:[],order:'id asc'},
 products:{model:'product.product',fields:['id','name','default_code','barcode','list_price','standard_price','qty_available','categ_id'],domain:[['active','=',true]],search:'name',order:'id asc'},
 categories:{model:'product.category',fields:['id','name','parent_id'],domain:[],search:'name',order:'id asc'},
 stock:{model:'stock.quant',fields:['id','product_id','location_id','quantity','reserved_quantity'],domain:[['location_id.usage','=','internal']],search:'product_id.name',order:'id asc'},
 branches:{model:'coc.branch',fields:['id','name'],domain:[],search:'name',order:'id asc'},
 locations:{model:'stock.location',fields:['id','name','complete_name','usage'],domain:[['usage','=','internal']],search:'complete_name',order:'id asc'},
 warehouses:{model:'stock.warehouse',fields:['id','name'],domain:[],search:'name',order:'id asc'},
 movements:{model:'stock.move',fields:['id','date','product_id','product_uom_qty','location_id','location_dest_id','state'],domain:[],search:'product_id.name',order:'date desc,id desc'},
 sales:{model:'account.move.line',fields:['id','move_id','date','move_name','partner_id','product_id','quantity','price_unit','discount','price_subtotal','price_total','parent_state','journal_id'],domain:[['display_type','=','product'],['parent_state','=','posted']],order:'date desc,id desc'}
};
class OdooError extends Error {constructor(message,status=502){super(message);this.status=status;}}
function date(value,label){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new OdooError('Enter a valid '+label+' date.',400);
 return value;
}
export function buildReadQuery(resource,params){
 const spec=resources[resource];if(!spec)throw new OdooError('Odoo resource not found.',404);
 const allowed=new Set(resource==='report-products'?['offset','limit','ids','names','codes']:resource==='invoice-products'?['offset','limit','q']:['offset','limit','q','from','to','branch','kind','updatedSince']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw new OdooError('Unsupported Odoo filter.',400);
 const integer=(name,fallback,max)=>{const value=params.get(name)??String(fallback);if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>max)throw new OdooError('Invalid '+name+'.',400);return Number(value);};
 const offset=integer('offset',0,10000000),limit=integer('limit',resource==='invoice-products'?20:100,resource==='invoice-products'?50:500);
 if(limit<1)throw new OdooError('Invalid limit.',400);
 const domain=structuredClone(spec.domain);
 if(resource==='report-products'){
  const ids=(params.get('ids')||'').split(',').filter(Boolean);if(ids.length>100||ids.some(id=>!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<1))throw new OdooError('Invalid product IDs.',400);
  const values=name=>{let list;try{list=JSON.parse(params.get(name)||'[]');}catch{throw new OdooError('Invalid product selectors.',400);}if(!Array.isArray(list)||list.length>100||list.some(value=>typeof value!=='string'||!value.trim()||value.length>200))throw new OdooError('Invalid product selectors.',400);return list;};
  const names=values('names'),codes=values('codes'),conditions=[];if(ids.length)conditions.push(['id','in',ids.map(Number)]);if(names.length)conditions.push(['name','in',names]);if(codes.length)conditions.push(['default_code','in',codes]);if(!conditions.length)throw new OdooError('Choose invoice products to link.',400);
  domain.push(...Array(conditions.length-1).fill('|'),...conditions);
 }
 const q=(params.get('q')||'').trim();
 if(q.length>120)throw new OdooError('Search must be 120 characters or fewer.',400);
 if(q){if(resource==='invoice-products')domain.push('|','|',['name','ilike',q],['default_code','ilike',q],['barcode','ilike',q]);else{if(!spec.search)throw new OdooError('Search is not supported for this resource.',400);domain.push([spec.search,'ilike',q]);}}
 const from=params.get('from'),to=params.get('to');
 if(from||to){
  if(!['sales','movements'].includes(resource))throw new OdooError('Date filters are not supported for this resource.',400);
  if(from)domain.push(['date','>=',date(from,'start')]);
  if(to)domain.push(['date','<=',date(to,'end')+(resource==='movements'?' 23:59:59':'')]);
  if(from&&to&&from>to)throw new OdooError('Start date must be before the end date.',400);
 }
 if(resource==='sales'){
  const kind=params.get('kind')||'invoice';
  if(!['invoice','refund'].includes(kind))throw new OdooError('Choose invoices or credit notes.',400);
  domain.push(['move_id.move_type','=',kind==='refund'?'out_refund':'out_invoice']);
  if(params.has('branch')){const branch=integer('branch',0,2147483647);if(!branch)throw new OdooError('Invalid branch.',400);domain.push(['move_id.branch_id','=',branch]);}
 }else if(params.has('kind')||params.has('branch'))throw new OdooError('Sales filters are not supported for this resource.',400);
 if(params.has('updatedSince')){
  const value=params.get('updatedSince');
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)||!Number.isFinite(Date.parse(value.replace(' ','T')+'Z'))||new Date(value.replace(' ','T')+'Z').toISOString().slice(0,19).replace('T',' ')!==value)throw new OdooError('Invalid update timestamp (use UTC).',400);
  domain.push(['write_date','>=',value]);
 }
 return {model:spec.model,domain,kwargs:{fields:spec.fields,limit,offset,order:spec.order}};
}
export function createOdooService(values={},options={}){
 const config={...defaults,...values},fetchImpl=options.fetchImpl||fetch;
 const now=options.now||Date.now,pause=options.pause||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 let uid=null,uidUntil=0,tail=Promise.resolve(),lastCall=0,queued=0;
 const cache=new Map(),pending=new Map();
 const respond=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
 async function rpc(service,method,args){
  if(queued>=12)throw new OdooError('Odoo is busy. Please try again shortly.',429);
  queued++;
  const job=tail.then(async()=>{
   await pause(Math.max(0,350-(now()-lastCall)));lastCall=now();
   let response,data;
   try{
    response=await fetchImpl(config.ODOO_URL.replace(/\/$/,'')+'/jsonrpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{service,method,args},id:1}),signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!response.ok)throw new Error('upstream');
    data=await response.json();
   }catch{throw new OdooError('Cannot reach Odoo. Please try again shortly.');}
   if(data.error){uid=null;uidUntil=0;throw new OdooError('Odoo rejected the read request. Check access and the API key.');}
   if(!Object.hasOwn(data,'result'))throw new OdooError('Odoo returned an invalid response.');
   return data.result;
  });
  tail=job.catch(()=>{});
  try{return await job;}finally{queued--;}
 }
 // Serialize entire reads as well as RPCs, so authentication is reused.
 let reads=Promise.resolve();
 async function read(query){
  const job=reads.then(async()=>{
   if(!uid||now()>=uidUntil){
    uid=await rpc('common','authenticate',[config.ODOO_DB,config.ODOO_LOGIN,config.ODOO_API_KEY,{}]);
    if(!Number.isInteger(uid)||uid<=0){uid=null;throw new OdooError('Odoo authentication failed. Check the API key.',502);}
    uidUntil=now()+30*60*1000;
   }
   const rows=await rpc('object','execute_kw',[config.ODOO_DB,uid,config.ODOO_API_KEY,query.model,'search_read',[query.domain],query.kwargs]);
   if(!Array.isArray(rows))throw new OdooError('Odoo returned an invalid response.');
   // Only approved fields can cross the server boundary.
   return rows.map(row=>Object.fromEntries(query.kwargs.fields.filter(field=>Object.hasOwn(row,field)).map(field=>[field,row[field]])));
  });
  reads=job.catch(()=>{});return job;
 }
 const service={async handle(request){
  try{
   if(request.method!=='GET')return respond({error:'Odoo access is read-only.'},405);
   const url=new URL(request.url),resource=url.pathname.split('/')[3];
   if(url.pathname!=='/api/odoo/'+resource)return respond({error:'Odoo resource not found.'},404);
   if(resource==='status')return respond({configured:Boolean(config.ODOO_API_KEY),keyExpires:config.ODOO_KEY_EXPIRES,readOnly:true});
   if(resource==='invoices'){
    for(const key of url.searchParams.keys())if(!['from','to','branch'].includes(key)||url.searchParams.getAll(key).length!==1)throw new OdooError('Unsupported Odoo filter.',400);
    if(!url.searchParams.get('from'))throw new OdooError('Choose a start date for Odoo invoices.',400);
    const params=new URLSearchParams(url.searchParams);params.set('kind','invoice');params.set('limit','500');
    const lines=[];let fetchedAt;
    for(let page=0;page<20;page++){
     params.set('offset',String(page*500));
     const response=await service.handle(new Request(new URL('/api/odoo/sales?'+params,url),{method:'GET'}));
     if(!response.ok)return response;
     const data=await response.json();lines.push(...data.records);fetchedAt=data.fetchedAt;
     if(!data.hasMore)return respond({records:groupOdooInvoices(lines),fetchedAt,keyExpires:config.ODOO_KEY_EXPIRES});
    }
    throw new OdooError('Too many sales lines. Choose a shorter date range or one branch.',400);
   }
   const query=buildReadQuery(resource,url.searchParams);
   if(!config.ODOO_API_KEY)return respond({error:'Odoo is not configured. Set ODOO_API_KEY on the server.'},503);
   if(config.ODOO_KEY_EXPIRES&&new Date(config.ODOO_KEY_EXPIRES+'T23:59:59Z').getTime()<now())return respond({error:'The Odoo API key has expired. Ask COC for a replacement.'},503);
   const key=JSON.stringify(query),hit=cache.get(key);
   if(hit&&hit.until>now())return respond(hit.body);
   if(!pending.has(key)){
    if(pending.size>=12)return respond({error:'Odoo is busy. Please try again shortly.'},429);
    const job=read(query).then(records=>{
     const body={records,offset:query.kwargs.offset,limit:query.kwargs.limit,hasMore:records.length===query.kwargs.limit,fetchedAt:new Date(now()).toISOString(),keyExpires:config.ODOO_KEY_EXPIRES};
     if(cache.size>=80)cache.delete(cache.keys().next().value);
     cache.set(key,{body,until:now()+60000});return body;
    }).finally(()=>pending.delete(key));
    pending.set(key,job);
   }
   return respond(await pending.get(key));
  }catch(error){return respond({error:error instanceof OdooError?error.message:'The Odoo read could not be completed.'},error instanceof OdooError?error.status:502);}
 }};
 return service;
}
