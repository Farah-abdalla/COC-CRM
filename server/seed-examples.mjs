import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAccountService} from './accounts.mjs';
import {addTestExamples} from '../src/exampleData.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),filename=resolve(root,'.local/company.sqlite');
const service=createAccountService(filename);service.close();
const db=new DatabaseSync(filename);
try{
 db.exec('BEGIN IMMEDIATE');
 const row=db.prepare('SELECT snapshot,revision FROM company_data WHERE id=1').get(),current=JSON.parse(row.snapshot),now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 const result=addTestExamples(current,today);
 if(result.totalAdded){
  const backupDir=resolve(root,'.local/backups');mkdirSync(backupDir,{recursive:true});
  writeFileSync(resolve(backupDir,'before-test-examples-'+now.toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify({format:'coc-crm-backup-v1',savedAt:now.toISOString(),...current},null,2));
  db.prepare('UPDATE company_data SET snapshot=?,revision=revision+1 WHERE id=1').run(JSON.stringify(result.snapshot));
  const owner=db.prepare('SELECT id FROM staff_users WHERE is_owner=1').get();
  db.prepare('INSERT INTO staff_audit(actor,action,target,created) VALUES(?,?,?,?)').run(owner?.id||'local-maintenance','Test examples added','company',now.toISOString());
 }
 db.exec('COMMIT');console.log(JSON.stringify({totalAdded:result.totalAdded,added:result.added,existingRecordsPreserved:true}));
}catch(error){db.exec('ROLLBACK');console.error(error.message);process.exitCode=1;}finally{db.close();}
