import {createOdooService} from './odoo.mjs';
import {createAccountService} from './accounts.mjs';
import {resolve} from 'node:path';
export function accountMiddleware(options={}){
 const service=createAccountService(options.filename||resolve('.local/company.sqlite'),{odoo:createOdooService(options.odooEnv||process.env)});
 const middleware=async(req,res,next)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith('/api/'))return next();
  // Never trust a forwarded Host for the setup check or request origin.
  const host=String(req.headers.host||'');
  if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'This local server accepts localhost requests only.'}));return;}
  try{
   let bytes=0;const chunks=[];
   for await(const chunk of req){bytes+=chunk.length;if(bytes>1850000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const request=new Request('http://'+host+req.url,{method:req.method,headers:req.headers,...(req.method!=='GET'&&req.method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});
   const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
   const response=await service.handle(request,{local:loopback});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Local API failed:',error.name);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The local server could not complete the request.'}));}
 };
 return {middleware,close:service.close};
}
