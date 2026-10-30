import {LanguageSwitch} from './i18n';
import {t as uiT,useLanguage as useUiLanguage,getLocale as uiLocale} from './i18n';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {can} from './accessControl';
import cocLogo from './assets/coc-logo.jpg';
import './accounts.css';
const Context=createContext(null);
export async function api(path,method='GET',body){
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 let result;try{result=await response.json();}catch{throw new Error('The account server is unavailable. Start this project with npm run dev.');}
 if(!response.ok){const error=new Error(result.error||'Request failed.');error.status=response.status;throw error;}return result;
}
export const useAuth=()=>useContext(Context);
export default function AuthProvider({children}){
  useUiLanguage();

 const [session,setSession]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [form,setForm]=useState({name:'',email:'',password:''});
 async function check(){try{setSession(await api('/api/auth/session'));setError('');}catch(error){setError(error.message);}}
 useEffect(()=>{check();},[]);
 async function submit(event){
  event.preventDefault();setBusy(true);setError('');
  try{setSession(await api(session?.setupRequired?'/api/auth/setup':'/api/auth/login','POST',form));setForm({name:'',email:'',password:''});}catch(error){setError(error.message);}finally{setBusy(false);}
 }
 async function logout(){await api('/api/auth/logout','POST',{});setSession({user:null,setupRequired:false});}
 if(!session?.user)return <div className="login-screen"><div className="login-language"><LanguageSwitch/></div><form className="login-card" onSubmit={submit}>
  <div className="login-logo"><img src={cocLogo} alt={uiT("COC — Cairo Optical Center")}/></div>
  <p className="eyebrow">{uiT("COC CRM")}</p><h1>{session?.setupRequired ? uiT('Create your Admin account') : uiT('Welcome back')}</h1>
  <p className="muted">{session?.setupRequired ? uiT('Set up the company owner. You can create staff accounts and assign permissions after signing in.') : uiT('Sign in with the email and password assigned to you.')}</p>
  {session?.setupRequired&&<label>{uiT("Your name")}<input required maxLength={120} autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
  <label>{uiT("Email")}<input required type="email" autoComplete="username" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
  <label>{uiT("Password")}<input required type="password" minLength={session?.setupRequired?12:undefined} maxLength={128} autoComplete={session?.setupRequired?'new-password':'current-password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
  {session?.setupRequired&&<p className="tiny">{uiT("Use at least 12 characters. There is one owner account; only administrators can create more accounts.")}</p>}
  {error&&<p role="alert" className="account-error">{uiT(error)}</p>}
  <button className="primary full" disabled={busy||!session}>{busy ? uiT('Please wait…') : session?.setupRequired ? uiT('Create Admin account') : uiT('Sign in')}</button>
  {!session&&<button type="button" className="text-btn" onClick={check}>{uiT("Retry connection")}</button>}
 </form></div>;
 return <Context.Provider value={{user:session.user,initial:session,updateUser:user=>setSession(s=>({...s,user})),logout,expire:()=>setSession({user:null,setupRequired:false}),can:(page,action)=>can(session.user,page,action)}}>{children}</Context.Provider>;
}
