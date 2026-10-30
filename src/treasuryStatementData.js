import {cairoToday} from './taskDeadlines.js';
export function statementDate(value){
 if(typeof value!=='string'||!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const date=new Date(value);return Number.isFinite(date.getTime())?cairoToday(date):'';
}
export function buildTreasuryStatement(rows,openingCents,{startDate='',endDate=''}={}){
 if(startDate&&endDate&&startDate>endDate)return {invalid:true,rows:[],openingCents,closingCents:openingCents,depositsCents:0,withdrawalsCents:0};
 const ordered=rows.map(row=>({...row,statementDate:statementDate(row.date)})).sort((a,b)=>a.statementDate.localeCompare(b.statementDate)||String(a.date||'').localeCompare(String(b.date||''))||String(a.id).localeCompare(String(b.id)));
 let balance=openingCents,carried=openingCents,depositsCents=0,withdrawalsCents=0;const visible=[];
 for(const row of ordered){
  if(startDate&&(!row.statementDate||row.statementDate<startDate)){balance+=row.amountCents;carried=balance;continue;}
  if(endDate&&row.statementDate&&row.statementDate>endDate)continue;
  const depositCents=Math.max(0,row.amountCents),withdrawalCents=Math.max(0,-row.amountCents);
  balance+=row.amountCents;depositsCents+=depositCents;withdrawalsCents+=withdrawalCents;
  visible.push({...row,depositCents,withdrawalCents,balanceCents:balance});
 }
 return {invalid:false,rows:visible,openingCents:carried,closingCents:balance,depositsCents,withdrawalsCents};
}
