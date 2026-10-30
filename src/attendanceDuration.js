export function attendanceDurationMinutes(checkIn,checkOut){
 const start=Date.parse(checkIn),end=Date.parse(checkOut);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw new Error('Attendance timestamps are invalid or the check-out precedes check-in.');
 return (end-start)/60000;
}
