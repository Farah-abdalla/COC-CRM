// Build branch stock from opening items and the complete transfer ledger.
export const isFrameStock=record=>/\bframes?\b/i.test(String(record.category||''));
export function branchInventory(data,allowedBranches=data.branches||[],kind='all'){
 const branches=[...new Set(allowedBranches)],allowed=new Set(branches),rows=new Map(),outgoing=new Map();
 for(const transfer of data.transfers||[])if(transfer.sourceType==='item')outgoing.set(String(transfer.sourceItemId),(outgoing.get(String(transfer.sourceItemId))||0)+(Number(transfer.quantity)||0));
 for(const item of data.inventoryItems||[]){
  if(!allowed.has(item.branch))continue;
  rows.set('item:'+item.id,{id:'item:'+item.id,branch:item.branch,itemName:item.itemName||item.sku||'Stock item',sku:item.sku||'',category:item.category||'',sph:'',cyl:'',quantity:Math.max(0,(Number(item.quantity)||0)-(outgoing.get(String(item.id))||0)),minQuantity:Number(item.minQuantity)||0,source:'Stock item'});
 }
 for(const transfer of data.transfers||[]){
  if(!allowed.has(transfer.toBranch))continue;
  const matrix=transfer.sourceType==='matrix',key=JSON.stringify([transfer.toBranch,transfer.sourceType,matrix?transfer.category:String(transfer.sourceItemId),matrix?transfer.row:'',matrix?transfer.column:'']);
  const id='received:'+key;
  if(!rows.has(id))rows.set(id,{id,branch:transfer.toBranch,itemName:matrix?'Prescription lens':transfer.itemName||transfer.sku||'Stock item',sku:matrix?'':transfer.sku||'',category:transfer.category||'',sph:matrix?transfer.sph??'':'',cyl:matrix?transfer.cyl??'':'',quantity:0,minQuantity:0,source:'Received transfers'});
  rows.get(id).quantity+=Number(transfer.quantity)||0;
 }
 const records=[...rows.values()].filter(row=>kind==='all'||(kind==='frames'?isFrameStock(row):!isFrameStock(row))).sort((a,b)=>a.branch.localeCompare(b.branch)||a.category.localeCompare(b.category)||a.itemName.localeCompare(b.itemName));
 const summary=branches.map(branch=>{const stock=records.filter(row=>row.branch===branch);return {branch,units:stock.reduce((sum,row)=>sum+row.quantity,0),stockLines:stock.length,lowStock:stock.filter(row=>row.minQuantity>0&&row.quantity<=row.minQuantity).length};});
 return {branches:summary,rows:records};
}
