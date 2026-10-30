export const paymentMethods=['Cash','Bank','Card','Bank transfer','Instapay','Wallet','Other'];
export const paymentTreasuryAccounts=['Cash','Bank','Instapay','Wallet'];
export function treasuryAccountFor(method,explicit=''){
 const value=String(method||'').trim().toLowerCase();
 const mapped={cash:'Cash',card:'Bank',bank:'Bank','bank transfer':'Bank',instapay:'Instapay','insta pay':'Instapay',wallet:'Wallet'}[value];
 return mapped||(paymentTreasuryAccounts.includes(explicit)?explicit:null);
}
export function requireTreasuryAccount(method,explicit=''){
 if(!paymentMethods.includes(method))throw new Error('Choose a payment method.');
 const account=treasuryAccountFor(method,explicit);
 if(!account)throw new Error('Choose the Treasury account for this payment.');
 return account;
}
export function invoicePaymentEvent(invoice,amountCents,{method,treasuryCategory='',reference='',customerName=''}={}){
 if(!Number.isSafeInteger(amountCents)||amountCents===0)throw new Error('Enter a valid payment amount.');
 if(!invoice.branch)throw new Error('Choose an invoice branch before recording a payment.');
 const account=requireTreasuryAccount(method,treasuryCategory);
 return {id:crypto.randomUUID(),invoiceId:invoice.id,invoiceNumber:invoice.number||'INV-'+invoice.id,branch:invoice.branch,customerId:invoice.customerId,customerName,action:amountCents>0?'Payment recorded':'Payment adjusted',description:method+(reference?' — '+reference:''),amount:amountCents/100,timestamp:new Date().toISOString(),method,treasuryCategory:account,reference};
}
