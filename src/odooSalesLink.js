import {productLinks} from './productSales.js';
const branchKey=value=>String(value||'').toLowerCase().replace(/\bbranch\b/g,'').replace(/[^a-z0-9\u0600-\u06ff]+/g,'').trim().replace(/\s+/g,' ');
export function matchOdooBranch(name,branches){const matches=branches.filter(branch=>branchKey(branch)===branchKey(name));return matches.length===1?matches[0]:'';}
export async function readLinkedOdooSales(read,filters,crmBranches){
 const params=new URLSearchParams({from:filters.from});if(filters.to)params.set('to',filters.to);if(filters.branch)params.set('branch',filters.branch);
 const remote=await read('/api/odoo/invoices?'+params);
 if(!remote.records.length)return {records:[],products:[],warnings:[]};
 const branches=await read('/api/odoo/branches?limit=500'),assignments=new Map(),warnings=[];
 if(branches.hasMore)throw new Error('Odoo branch list is incomplete. Select one Odoo branch and retry.');
 const mappings=branches.records.map(branch=>({...branch,crmBranch:filters.branch&&String(branch.id)===String(filters.branch)&&filters.crmBranch?filters.crmBranch:matchOdooBranch(branch.name,crmBranches)}));
 if(filters.crmBranch&&!crmBranches.includes(filters.crmBranch))throw new Error('Choose a configured CRM branch.');
 if(filters.branch){const mapping=mappings.find(branch=>String(branch.id)===String(filters.branch));if(mapping?.crmBranch)for(const invoice of remote.records)assignments.set(String(invoice.id),{branch:mapping.crmBranch,odooBranchId:mapping.id});}
 else for(const mapping of mappings.filter(branch=>branch.crmBranch)){
  const query=new URLSearchParams(params);query.set('branch',String(mapping.id));
  const scoped=await read('/api/odoo/invoices?'+query);
  for(const invoice of scoped.records){const previous=assignments.get(String(invoice.id));if(previous&&previous.odooBranchId!==mapping.id)throw new Error('An Odoo invoice matched multiple branches. Select one Odoo branch and retry.');assignments.set(String(invoice.id),{branch:mapping.crmBranch,odooBranchId:mapping.id});}
 }
 const records=remote.records.map(invoice=>({...invoice,...assignments.get(String(invoice.id))}));
 if(records.some(invoice=>!invoice.branch))warnings.push('Some Odoo branches do not match CRM branches. Assign those invoices in Edit.');
 const ids=[...new Set(records.flatMap(invoice=>invoice.lines.map(line=>Array.isArray(line.product_id)?line.product_id[0]:null)).filter(id=>Number.isSafeInteger(id)&&id>0))],products=[];
 try{for(let index=0;index<ids.length;index+=100){const result=await read('/api/odoo/report-products?'+new URLSearchParams({ids:ids.slice(index,index+100).join(','),limit:'100'}));if(result.hasMore)throw new Error('Product list is incomplete.');products.push(...productLinks(result.records));}}
 catch{warnings.push('Invoices were linked, but product categories could not be refreshed.');}
 return {records,products,warnings};
}
