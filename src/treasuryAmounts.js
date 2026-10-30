import {getLocale as uiLocale} from './i18nCore.js';
export const treasuryCategories=['Cash','Bank','Instapay','Wallet','Purchases','Expenses'];
export function amountToCents(value){
 const text=String(value).trim();
 if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a non-negative amount with up to two decimal places.');
 const [whole,fraction='']=text.split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents))throw new Error('The amount is too large.');
 return cents;
}
export const formatTreasuryAmount=cents=>new Intl.NumberFormat(uiLocale(),{style:'currency',currency:'EGP',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
