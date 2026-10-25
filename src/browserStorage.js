export function saveBrowserSnapshot(storage,snapshot,previous) {
 const writes=Object.entries(snapshot.data).filter(([key,value])=>value!==previous.data[key]).map(([key,value])=>['opticrm_'+key,JSON.stringify(value)]);
 if(snapshot.matrixEdits!==previous.matrixEdits)writes.push(['opticrm_inventoryMatrices',JSON.stringify(snapshot.matrixEdits)]);
 const originals=writes.map(([key])=>[key,storage.getItem(key)]);
 try{for(const [key,value] of writes)storage.setItem(key,value);}
 catch(error){for(const [key,value] of originals.reverse()){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}throw error;}
}
