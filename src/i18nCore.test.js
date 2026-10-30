import test from 'node:test';
import assert from 'node:assert/strict';
import {t,getLocale,getLanguage,setActiveLanguage,normalizeLanguage,readLanguagePreference,saveLanguagePreference,languagePreferenceKey} from './i18nCore.js';
test('English and Arabic translate UI labels in both directions and preserve user records',()=>{
 assert.equal(t('Payments','ar'),'المدفوعات');assert.equal(t('Payments','en'),'Payments');assert.equal(t('New expense','ar'),'مصروف جديد');assert.equal(t('  Cash  ','ar'),'  النقدية  ');assert.equal(t('Invoice branch *','ar'),'فرع الفاتورة *');
 const sku='FRAME-CUSTOM-123',customer='Jane Doe',invoice='INV-NC001';for(const text of [sku,customer,invoice])assert.equal(t(text,'ar'),text);
 assert.equal(t(500,'ar'),500);assert.equal(t(null,'ar'),null);assert.equal(t('You do not have edit permission for Expenses.','ar'),'ليس لديك صلاحية تعديل في المصروفات.');
});
test('language preference is separate from records and unsupported values fall back to English',()=>{
 const stored=new Map([['opticrm_customers','unchanged']]),storage={getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)};
 assert.equal(readLanguagePreference(storage),'en');saveLanguagePreference(storage,'ar');assert.equal(stored.get(languagePreferenceKey),'ar');assert.equal(stored.get('opticrm_customers'),'unchanged');assert.equal(readLanguagePreference(storage),'ar');assert.equal(normalizeLanguage('fr'),'en');
 const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};assert.equal(readLanguagePreference(broken),'en');assert.equal(saveLanguagePreference(broken,'ar'),'ar');
});
test('dates and amounts follow the active language without changing numeric values',()=>{
 try{setActiveLanguage('ar');assert.equal(getLanguage(),'ar');assert.equal(getLocale(),'ar-EG');assert.equal(getLocale('date'),'ar-EG');assert.equal(t('Invoice List'),'قائمة الفواتير');setActiveLanguage('en');assert.equal(getLocale(),'en-EG');assert.equal(getLocale('date'),'en-GB');assert.equal(t('Invoice List'),'Invoice List');}finally{setActiveLanguage('en');}
});
