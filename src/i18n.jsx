import React,{createContext,useContext,useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {Languages} from 'lucide-react';
import {getLanguage,normalizeLanguage,setActiveLanguage,saveLanguagePreference,languagePreferenceKey} from './i18nCore.js';
export {t,getLocale} from './i18nCore.js';
const LanguageContext=createContext(null);
function applyDocumentLanguage(language){document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';}
export function LanguageProvider({children}){
 const [language,setLanguageState]=useState(getLanguage);
 function setLanguage(value){const next=setActiveLanguage(value);try{saveLanguagePreference(window.localStorage,next);}catch{}applyDocumentLanguage(next);setLanguageState(next);}
 useLayoutEffect(()=>{applyDocumentLanguage(language);},[language]);
 useEffect(()=>{const receive=event=>{if(event.key===languagePreferenceKey){const next=setActiveLanguage(normalizeLanguage(event.newValue));applyDocumentLanguage(next);setLanguageState(next);}};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);},[]);
 const context=useMemo(()=>({language,setLanguage}),[language]);
 return <LanguageContext.Provider value={context}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const context=useContext(LanguageContext);if(!context)throw new Error('LanguageProvider is required.');return context;}
export function LanguageSwitch(){
 const {language,setLanguage}=useLanguage();
 return <button type="button" className="language-switch" onClick={()=>setLanguage(language==='ar'?'en':'ar')} aria-label={language==='ar'?'Switch to English':'التبديل إلى العربية'} title={language==='ar'?'Switch to English':'التبديل إلى العربية'}><Languages size={17}/><span lang={language==='ar'?'en':'ar'}>{language==='ar'?'English':'العربية'}</span></button>;
}
