import {invoiceAmounts} from './invoiceAmounts.js';
export const branchDailyTargets={'New Cairo':5000000,Heliopolis:8000000,'Nasr City':5000000,Mohandseen:2000000};
export const branchSalesIncentivePercent=2;
export function branchSalesIncentiveCents(netCents,targetCents){
 if(!Number.isSafeInteger(netCents)||!Number.isSafeInteger(targetCents)||targetCents<=0||netCents<targetCents)return 0;
 return Math.round(netCents*branchSalesIncentivePercent/100);
}
export function incentiveBranch(value){
 const name=String(value||'').trim(),key=name.toLowerCase().replace(/\s+/g,' ');
 if(['mohadseen','mohandseen','mohandessin','mohandeseen','mohandessen'].includes(key))return 'Mohandseen';
 return Object.keys(branchDailyTargets).find(branch=>branch.toLowerCase()===key)||name||'Unassigned branch';
}
export function incentivePeriodDays(startDate,endDate){
 const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!valid(startDate)||!valid(endDate)||endDate<startDate)return 0;
 return Math.round((Date.parse(endDate)-Date.parse(startDate))/86400000)+1;
}
export function branchIncentiveTotals({invoices=[],creditNotes=[],branches=[],startDate,endDate,branch='all'}){
 const days=incentivePeriodDays(startDate,endDate),rows=new Map(),transactions=[];
 const selected=branch==='all'?'all':incentiveBranch(branch);
 const ensure=name=>{name=incentiveBranch(name);if(selected!=='all'&&selected!==name)return null;if(!rows.has(name))rows.set(name,{branch:name,invoiceCount:0,invoiceCents:0,creditCount:0,creditCents:0,dailyTargetCents:branchDailyTargets[name]??null});return rows.get(name);};
 if(!days)return {days:0,rows:[],transactions:[],dailyRows:[],totals:{invoiceCount:0,invoiceCents:0,creditCount:0,creditCents:0,netCents:0,dailyTargetCents:0,periodTargetCents:0,incentiveCents:0}};
 branches.forEach(ensure);
 const inPeriod=date=>typeof date==='string'&&date>=startDate&&date<=endDate;
 for(const invoice of invoices){
  if(invoice.isVoided||!inPeriod(invoice.date))continue;
  const row=ensure(invoice.branch);if(!row)continue;
  // Use the original invoice value. Dated credits are deducted separately once.
  const amountCents=Math.round(invoiceAmounts(invoice).originalTotal*100);
  row.invoiceCount++;row.invoiceCents+=amountCents;
  transactions.push({id:'invoice:'+invoice.id,type:'Invoice',reference:invoice.number||'INV-'+invoice.id,invoiceNumber:invoice.number||'INV-'+invoice.id,date:invoice.date,branch:row.branch,amountCents});
 }
 const byId=new Map(invoices.map(invoice=>[String(invoice.id),invoice]));
 for(const note of creditNotes){
  if(note.isVoided||!inPeriod(note.date))continue;
  const invoice=byId.get(String(note.invoiceId)),row=ensure(note.branch||invoice?.branch);if(!row)continue;
  const amountCents=Math.round((Number(note.amount)||0)*100);if(amountCents<=0)continue;
  row.creditCount++;row.creditCents+=amountCents;
  transactions.push({id:'credit:'+note.id,type:'Credit / refund',reference:note.number||'CN-'+note.id,invoiceNumber:note.invoiceNumber||invoice?.number||'',date:note.date,branch:row.branch,amountCents:-amountCents});
 }
 const daily=new Map();
 for(const transaction of transactions){const key=JSON.stringify([transaction.branch,transaction.date]);if(!daily.has(key))daily.set(key,{branch:transaction.branch,date:transaction.date,netCents:0,dailyTargetCents:branchDailyTargets[transaction.branch]??null});daily.get(key).netCents+=transaction.amountCents;}
 const dailyRows=[...daily.values()].map(row=>({...row,incentiveCents:branchSalesIncentiveCents(row.netCents,row.dailyTargetCents)})).sort((a,b)=>b.date.localeCompare(a.date)||a.branch.localeCompare(b.branch));
 const dailyByBranch=new Map();for(const day of dailyRows){if(!dailyByBranch.has(day.branch))dailyByBranch.set(day.branch,{incentiveCents:0,qualifyingDays:0});const total=dailyByBranch.get(day.branch);total.incentiveCents+=day.incentiveCents;if(day.dailyTargetCents>0&&day.netCents>=day.dailyTargetCents)total.qualifyingDays++;}
 const result=[...rows.values()].map(row=>{const netCents=row.invoiceCents-row.creditCents,periodTargetCents=row.dailyTargetCents===null?null:row.dailyTargetCents*days;return {...row,incentiveCents:dailyByBranch.get(row.branch)?.incentiveCents||0,qualifyingDays:dailyByBranch.get(row.branch)?.qualifyingDays||0,netCents,periodTargetCents,remainingCents:periodTargetCents===null?null:Math.max(0,periodTargetCents-netCents),achievement:periodTargetCents?netCents/periodTargetCents*100:null};});
 const totals=result.reduce((sum,row)=>{for(const field of Object.keys(sum))sum[field]+=row[field]??0;return sum;},{invoiceCount:0,invoiceCents:0,creditCount:0,creditCents:0,netCents:0,dailyTargetCents:0,periodTargetCents:0,incentiveCents:0});
 return {days,rows:result,totals,dailyRows,transactions:transactions.sort((a,b)=>b.date.localeCompare(a.date)||a.reference.localeCompare(b.reference))};
}
