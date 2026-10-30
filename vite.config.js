import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {accountMiddleware} from './server/http.mjs';
export default defineConfig(({mode})=>{
 const odooEnv={...loadEnv(mode,process.cwd(), 'ODOO_'),...Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('ODOO_')))};
 return {
 plugins:[react(),{name:'crm-accounts',configureServer(server){const api=accountMiddleware({odooEnv});server.middlewares.use(api.middleware);server.httpServer?.once('close',api.close);},configurePreviewServer(server){const api=accountMiddleware({odooEnv});server.middlewares.use(api.middleware);server.httpServer?.once('close',api.close);}}],
 server:{host:'127.0.0.1',port:5173,strictPort:true,fs:{deny:['**/.local/**','**/server/**','**/.git/**','**/.env*','**/*.{crt,pem}']}},
 preview:{host:'127.0.0.1',port:4173,strictPort:true}
};
});
