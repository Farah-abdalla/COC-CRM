export function currentAttendanceLocation(){
 return new Promise((resolve,reject)=>{
  if(!window.isSecureContext){reject(new Error('Location requires HTTPS or localhost.'));return;}
  if(!navigator.geolocation){reject(new Error('Location is unavailable on this device.'));return;}
  navigator.geolocation.getCurrentPosition(position=>{
   const {latitude,longitude,accuracy}=position.coords;
   if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(position.timestamp)){reject(new Error('The device returned an invalid location. Attendance was not recorded.'));return;}
   resolve({latitude,longitude,accuracy,capturedAt:new Date(position.timestamp).toISOString()});
  },error=>reject(new Error(error.code===1?'Location permission denied. Allow location access and try again. Attendance was not recorded.':error.code===3?'Location request timed out. Please try again. Attendance was not recorded.':'Your location could not be detected. Please try again. Attendance was not recorded.')),{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 });
}
