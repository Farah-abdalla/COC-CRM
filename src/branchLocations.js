export function validBranchCoordinates(latitude,longitude){
 return latitude!==''&&longitude!==''&&latitude!=null&&longitude!=null&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))&&Math.abs(Number(latitude))<=90&&Math.abs(Number(longitude))<=180;
}
export function branchMapUrl(location){
 if(!location||!validBranchCoordinates(location.latitude,location.longitude))return '';
 return 'https://www.openstreetmap.org/?mlat='+Number(location.latitude)+'&mlon='+Number(location.longitude)+'#map=18/'+Number(location.latitude)+'/'+Number(location.longitude);
}
export function branchLocationRecord(form,branch,id){
 const address=String(form.address||'').trim();
 if(address.length>500)throw new Error('Branch address must be 500 characters or fewer.');
 if((form.latitude==null||form.latitude==='')&&(form.longitude==null||form.longitude==='')&&!address)return null;
 if(!validBranchCoordinates(form.latitude,form.longitude))throw new Error('Select a valid branch location on the map or enter both coordinates.');
 return {id,branch,address,latitude:Number(form.latitude),longitude:Number(form.longitude)};
}
