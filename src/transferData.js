export const getTransferTotals = transfers => {
  const matrix=new Map(),items=new Map();
  transfers.forEach(transfer=>{
    if(transfer.sourceType==='matrix'){
      const key=transfer.category+'|'+transfer.row+':'+transfer.column;
      matrix.set(key,(matrix.get(key)||0)+Number(transfer.quantity));
    }else if(transfer.sourceType==='item'){
      const key=String(transfer.sourceItemId);items.set(key,(items.get(key)||0)+Number(transfer.quantity));
    }
  });
  return {matrix,items};
};
export const getAvailableMatrixEdits = (edits,totals,matrices) => {
  const available={...edits};
  totals.matrix.forEach((quantity,key)=>{
    const [category,cell]=key.split('|'),[row,column]=cell.split(':').map(Number);
    if(!matrices[category]?.values[row]||column>=matrices[category].columns.length)return;
    const raw=Object.prototype.hasOwnProperty.call(edits[category]||{},cell)?edits[category][cell]:matrices[category].values[row][column];
    available[category]={...(available[category]||{}),[cell]:raw===null||raw===''?null:Math.max(0,Number(raw||0)-quantity)};
  });
  return available;
};
export const getAvailableInventoryItems = (items,totals) => items.map(item=>({...item,quantity:Math.max(0,Number(item.quantity||0)-(totals.items.get(String(item.id))||0))}));
export const prepareStockTransfer = (form,branches,availableEdits,availableItems,matrices) => {
  const quantity=Number(form.quantity);
  if(!Number.isSafeInteger(quantity)||quantity<=0)throw new Error('Enter a positive whole-number quantity.');
  if(!branches.includes(form.toBranch))throw new Error('Choose a destination from the Branches list.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(form.date||''))throw new Error('Choose a transfer date.');
  let record,available;
  if(form.sourceType==='matrix'){
    const matrix=matrices[form.category];
    if(!matrix||String(form.row??'')===''||String(form.column??'')==='')throw new Error('Choose a stock category, SPH, and CYL.');
    const row=Number(form.row),column=Number(form.column);
    if(!Number.isInteger(row)||!Number.isInteger(column)||row<0||column<0||row>=matrix.rows.length||column>=matrix.columns.length)throw new Error('Choose a valid stock prescription.');
    const cell=row+':'+column;
    available=Number(Object.prototype.hasOwnProperty.call(availableEdits[form.category]||{},cell)?availableEdits[form.category][cell]:matrix.values[row][column])||0;
    record={sourceType:'matrix',category:form.category,row,column,sph:matrix.rows[row],cyl:matrix.columns[column],sourceBranch:'Inventory'};
  }else if(form.sourceType==='item'){
    const item=availableItems.find(candidate=>String(candidate.id)===String(form.sourceItemId)&&candidate.category===form.category);
    if(!item)throw new Error('Choose an inventory stock item.');
    if(item.branch&&item.branch===form.toBranch)throw new Error('Choose a branch different from the stock item source branch.');
    available=Number(item.quantity)||0;
    record={sourceType:'item',category:item.category,sourceItemId:item.id,itemName:item.itemName,sku:item.sku||'',sourceBranch:item.branch||'Inventory'};
  }else throw new Error('Choose a stock source.');
  if(quantity>available)throw new Error('Only '+available+' units are available. Reduce the transfer quantity.');
  return {...record,date:form.date,toBranch:form.toBranch,quantity};
};

