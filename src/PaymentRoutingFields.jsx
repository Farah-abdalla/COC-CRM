import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React from 'react';
import {paymentMethods,paymentTreasuryAccounts,treasuryAccountFor} from './paymentMethods';
export default function PaymentRoutingFields({method,treasuryCategory,onChange,branch='',required=true,title='Payment method'}){
  useUiLanguage();

 const account=treasuryAccountFor(method,treasuryCategory);
 return <><label>{uiT(title)}{required?' *':''}<select required={required} value={method} onChange={e=>onChange({method:e.target.value,treasuryCategory:treasuryAccountFor(e.target.value)||''})}><option value="">{required ? uiT('Choose payment method') : uiT('Not assigned')}</option>{paymentMethods.map(name=><option key={name} value={name}>{uiT(name)}</option>)}</select></label>
  {method==='Other'&&<label>{uiT("Treasury account *")}<select required value={treasuryCategory} onChange={e=>onChange({method,treasuryCategory:e.target.value})}><option value="">{uiT("Choose account")}</option>{paymentTreasuryAccounts.map(name=><option key={name} value={name}>{uiT(name)}</option>)}</select></label>}
  {account&&<p className="sales-match-hint span-2">{uiT("Treasury: ")}{branch ? uiT(branch) + ' · ' : ''}{uiT(account)}</p>}
 </>;
}
