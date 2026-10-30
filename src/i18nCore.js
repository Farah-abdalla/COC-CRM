import arabic from './locales/ar.js';
export const languagePreferenceKey='opticrm_language';
export const normalizeLanguage=value=>String(value||'').toLowerCase()==='ar'?'ar':'en';
export function readLanguagePreference(storage){try{return normalizeLanguage(storage?.getItem(languagePreferenceKey));}catch{return 'en';}}
export function saveLanguagePreference(storage,language){const value=normalizeLanguage(language);try{storage?.setItem(languagePreferenceKey,value);}catch{}return value;}
let activeLanguage=readLanguagePreference(typeof localStorage==='undefined'?null:localStorage);
export const getLanguage=()=>activeLanguage;
export const setActiveLanguage=value=>(activeLanguage=normalizeLanguage(value));
export const getLocale=(kind='number')=>activeLanguage==='ar'?'ar-EG':kind==='date'?'en-GB':'en-EG';
const exactKeyOf=value=>value.trim().replace(/\s+/g,' ').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\.\.\./g,'…');
const keyOf=value=>exactKeyOf(value).toLowerCase();
const exactDictionary=new Map(Object.entries(arabic).map(([key,value])=>[exactKeyOf(key),value]));
const lookup=value=>exactDictionary.get(exactKeyOf(value))||dictionary.get(keyOf(value));
const dictionary=new Map(Object.entries(arabic).map(([key,value])=>[keyOf(key),value]));
const prefixEntries=Object.entries(arabic).filter(([key])=>(key.length>25&&/[?.:]$/.test(key))||(key.length>=4&&/:$/.test(key))).sort((a,b)=>b[0].length-a[0].length);
export function t(value,language=activeLanguage){
 if(language!=='ar'||typeof value!=='string'||!value.trim())return value;
 const leading=value.match(/^\s*/)[0],trailing=value.match(/\s*$/)[0],text=value.trim(),key=keyOf(text);
 let translated=lookup(text);
 if(!translated&&text.endsWith('*')){const base=lookup(text.slice(0,-1));if(base)translated=base+' *';}
 if(!translated){
  let match=text.match(/^You do not have (view|add|edit|delete) permission for (.+)\.$/i);if(match)translated='ليس لديك صلاحية '+t(match[1],'ar')+' في '+t(match[2],'ar')+'.';
  match=text.match(/^You do not have permission to (add|edit) records in (.+)\.$/i);if(match)translated='ليس لديك صلاحية '+t(match[1],'ar')+' سجلات في '+t(match[2],'ar')+'.';
  match=text.match(/^Only (\d+) units are available\. Reduce the transfer quantity\.$/);if(match)translated='المتاح '+match[1]+' وحدات فقط. قلل كمية التحويل.';
  match=text.match(/^Choose a whole return quantity from 1 to (\d+) for (.+)\.$/);if(match)translated='اختر كمية إرجاع صحيحة من 1 إلى '+match[1]+' للصنف '+match[2]+'.';
 }
 if(!translated){for(const [prefix,result] of prefixEntries){if(text.startsWith(prefix+' ')){translated=result+' '+(/:$/.test(prefix)?text.slice(prefix.length+1):t(text.slice(prefix.length+1),'ar'));break;}}}
 return translated?leading+translated+trailing:value;
}
