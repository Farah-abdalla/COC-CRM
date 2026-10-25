import {useEffect,useRef,useState} from 'react';
import {validSnapshot,encodeSnapshot} from './storagePayload';
import {saveBrowserSnapshot} from './browserStorage';

const modeKey='opticrm_storageMode';
const draftKey=id=>'opticrm_cloudDraft_'+id;
async function request(method='GET',body) {
  const response=await fetch('/api/crm-data',{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  let result; try {result=await response.json();} catch {throw new Error('Online saving is unavailable on this host. Use the ChatGPT Site.');}
  if(!response.ok){const error=new Error(result.error||'Online saving failed.');error.status=response.status;throw error;}
  return result;
}
export function useDataStorage(data,matrixEdits,setData,setMatrixEdits,loadBrowser) {
  const [view,setView]=useState({mode:'browser',status:'Saved in this browser',busy:false,error:'',user:null,needsSignIn:false,conflict:false});
  const state=useRef({mode:'browser',snapshot:{data,matrixEdits},dirty:false,revision:0,user:null,saving:false,busy:false,epoch:0});
  const latest=useRef({data,matrixEdits});latest.current={data,matrixEdits};
  const browserLoader=useRef(loadBrowser);browserLoader.current=loadBrowser;
  const initialized=useRef(false);
  const publish=patch=>setView(v=>({...v,...patch}));
  function apply(snapshot){state.current.snapshot=snapshot;setData(snapshot.data);setMatrixEdits(snapshot.matrixEdits);}
  function cacheDraft(){const s=state.current;try{localStorage.setItem(draftKey(s.user.id),JSON.stringify({snapshot:s.snapshot,revision:s.revision}));}catch{}}
  async function connect() {
    const s=state.current;if(s.busy||s.saving||s.dirty)return;
    const epoch=++s.epoch;s.busy=true;publish({busy:true,error:'',needsSignIn:false,status:'Connecting to online storage...'});
    try {
      const remote=await request();if(s.epoch!==epoch)return;
      s.user=remote.user;s.revision=remote.revision;s.mode='online';s.conflict=false;
      let cached;try{cached=JSON.parse(localStorage.getItem(draftKey(remote.user.id))||'null');}catch{}
      if(cached && validSnapshot(cached.snapshot)){
        apply(cached.snapshot);s.dirty=true;
        if(cached.revision!==remote.revision){s.conflict=true;publish({conflict:true,error:'This device has unsaved changes and the online copy has also changed. Download your backup before loading the online copy.'});}
      } else if(remote.snapshot) {
        if(!validSnapshot(remote.snapshot))throw new Error('Online records are invalid. Your browser records have not been changed.');
        apply(remote.snapshot);s.dirty=false;
      } else {s.mode='browser';publish({mode:'browser',empty:true,user:remote.user,status:'No online records yet. Choose what to save.'});return;}
      try{localStorage.setItem(modeKey,'online');}catch{}
      publish({mode:'online',user:remote.user,empty:false,status:s.dirty?'Changes waiting to save':'Saved online',needsSignIn:false});
    } catch(error) {
      publish({error:error.status===401?'Sign in with ChatGPT to save and open your online records.':error.message,needsSignIn:error.status===401,status:'Online storage not connected'});
    } finally {if(s.epoch===epoch){s.busy=false;publish({busy:false});}}
  }
  async function initializeOnline() {
    const s=state.current;if(s.busy||s.saving||s.dirty)return;
    s.busy=true;publish({busy:true,error:'',status:'Creating online copy...'});
    try {
      const snapshot=latest.current;encodeSnapshot(snapshot);
      const remote=await request('PUT',{revision:0,snapshot,userId:s.user?.id});
      s.mode='online';s.user=remote.user;s.revision=remote.revision;s.snapshot=snapshot;s.dirty=false;s.conflict=false;
      try{localStorage.setItem(modeKey,'online');}catch{}
      publish({mode:'online',empty:false,user:remote.user,status:'Saved online',conflict:false});
    }catch(error){publish({error:error.status===409?'Online records already exist. Choose Online to load them.':error.message,needsSignIn:error.status===401,status:'Online copy not created'});}
    finally{s.busy=false;publish({busy:false});}
  }
  function commit(snapshot) {
    const s=state.current;
    if(s.busy||s.conflict){window.alert('Resolve the storage message before editing records.');return false;}
    if(s.mode==='browser'){
      try {
        saveBrowserSnapshot(localStorage,snapshot,latest.current);
      }catch{publish({error:'Browser storage is full. Download a backup and reduce saved images.',status:'Not saved'});return false;}
      s.snapshot=snapshot;publish({status:'Saved in this browser',error:''});
    }else{
      try{encodeSnapshot(snapshot);}catch(error){window.alert(error.message);return false;}
      s.snapshot=snapshot;s.dirty=true;cacheDraft();publish({status:'Changes waiting to save',error:''});
    }
    apply(snapshot);return true;
  }
  async function flush() {
    const s=state.current;if(s.mode!=='online'||s.busy||s.saving||s.conflict||!s.dirty)return;
    s.saving=true;const snapshot=s.snapshot;publish({status:'Saving online...'});
    try {
      const remote=await request('PUT',{revision:s.revision,snapshot,userId:s.user.id});
      s.revision=remote.revision;s.dirty=s.snapshot!==snapshot;
      if(s.dirty){cacheDraft();publish({status:'Changes waiting to save',error:''});}
      else {try{localStorage.removeItem(draftKey(s.user.id));}catch{}publish({status:'Saved online',error:'',needsSignIn:false});}
    }catch(error){
      if(error.status===409)s.conflict=true;
      publish({error:error.status===409?'Another device saved newer records. Download your unsaved backup, then load the online copy.':error.message,status:'Not saved online',conflict:s.conflict,needsSignIn:error.status===401});
    }finally{s.saving=false;}
  }
  async function refresh() {
    const s=state.current;
    if(s.mode!=='online'||s.busy||s.saving||s.dirty||s.conflict)return;
    s.busy=true;
    try{
      const remote=await request();
      if(remote.user.id!==s.user.id)throw new Error('Your signed-in account changed. Reload this page to reconnect.');
      if(remote.revision!==s.revision && remote.snapshot){
        if(!validSnapshot(remote.snapshot))throw new Error('Online records are invalid.');
        // Edits made during the fetch remain local and are handled as a conflict.
        if(s.dirty){s.conflict=true;publish({conflict:true,error:'Online records changed. Download your backup before reloading.'});}
        else{s.revision=remote.revision;apply(remote.snapshot);publish({status:'Saved online',error:''});}
      }
    }catch(error){publish({error:error.message,needsSignIn:error.status===401});}
    finally{s.busy=false;}
  }
  function chooseBrowser() {
    const s=state.current;
    if(s.busy||s.saving)return;
    if(s.dirty){publish({error:'Save your online changes or download a backup before leaving online mode.'});return;}
    s.epoch++;s.mode='browser';s.user=null;s.conflict=false;
    apply(browserLoader.current());
    try{localStorage.setItem(modeKey,'browser');}catch{}
    publish({mode:'browser',busy:false,user:null,error:'',conflict:false,empty:false,needsSignIn:false,status:'Saved in this browser'});
  }
  async function reloadOnline(){
    const s=state.current;if(s.saving||s.busy)return;
    if(s.dirty&&!window.confirm('Replace unsaved changes on this device with the online copy? Download a backup first if you need these changes.'))return;
    try{localStorage.removeItem(draftKey(s.user.id));}catch{}
    s.dirty=false;s.conflict=false;publish({conflict:false,error:''});await connect();
  }
  function download(){
    const blob=new Blob([JSON.stringify({format:'coc-crm-backup-v1',savedAt:new Date().toISOString(),...latest.current},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='coc-crm-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  useEffect(()=>{
    if(!initialized.current){initialized.current=true;try{if(localStorage.getItem(modeKey)==='online'||sessionStorage.getItem('opticrm_connectOnline')==='yes'){sessionStorage.removeItem('opticrm_connectOnline');connect();}}catch{}}
    let seconds=0;
    const timer=setInterval(()=>{seconds++;const s=state.current;if(s.dirty){if(seconds%5===0)flush();}else if(seconds%15===0)refresh();},1000);
    const leave=e=>{if(state.current.dirty){e.preventDefault();e.returnValue='';}};
    const focus=()=>refresh();
    window.addEventListener('beforeunload',leave);window.addEventListener('focus',focus);window.addEventListener('online',flush);
    return ()=>{clearInterval(timer);window.removeEventListener('beforeunload',leave);window.removeEventListener('focus',focus);window.removeEventListener('online',flush);};
  },[]);
  return {...view,commit,connect,initializeOnline,chooseBrowser,flush,reloadOnline,download};
}
