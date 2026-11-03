// Run only against an already running local Wrangler Pages server.
import assert from 'node:assert/strict';
import {writeFile,mkdir,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash} from '../src/worker.mjs';
const origin='http://127.0.0.1:8788';
const id='qa-'+crypto.randomUUID(),token=crypto.randomUUID().replaceAll('-','').repeat(2);
const seed=new URL('../.wrangler/qa-seed.sql',import.meta.url),cleanup=new URL('../.wrangler/qa-cleanup.sql',import.meta.url);
const wrangler=new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url);
const cwd=new URL('../',import.meta.url);
async function sql(file,query){await writeFile(file,query);execFileSync(process.execPath,[fileURLToPath(wrangler),'d1','execute','progress-tracker','--local','--file',fileURLToPath(file)],{cwd,stdio:'pipe'});}
await mkdir(new URL('../.wrangler/',import.meta.url),{recursive:true});
await sql(seed,`INSERT INTO users(id,login) VALUES('${id}','local-qa'); INSERT INTO wallets(user_id,balance) VALUES('${id}',80); INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('${await hash(token)}','${id}',${Math.floor(Date.now()/1000)+600});`);
async function api(path,method='GET',payload){const response=await fetch(origin+path,{method,headers:{Cookie:'__Host-pt_session='+token,Origin:origin,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});const result=await response.json();assert(response.ok,JSON.stringify(result));return result;}
try{
  assert.equal((await api('/api/health')).status,'ok');
  const project=await api('/api/projects','POST',{project:'Local QA',projectId:id,phases:[{title:'검증',tasks:[{id:'a',text:'업무 A'},{id:'b',text:'업무 B'}]}]});
  await api('/api/projects/'+project.id+'/tasks','PATCH',{taskId:'a',done:true});
  let result=await api('/api/projects/'+project.id+'/tasks','PATCH',{taskId:'b',done:true});assert.equal(result.reward,10);assert.equal(result.wallet.balance,100);
  result=await api('/api/projects/'+project.id+'/tasks','PATCH',{taskId:'b',done:true});assert.equal(result.reward,0);
  let wallet=await api('/api/themes/purchase','POST',{themeId:'blue',price:0});assert.equal(wallet.balance,0);assert.deepEqual(wallet.owned,['blue']);
  wallet=await api('/api/themes/purchase','POST',{themeId:'blue'});assert.equal(wallet.balance,0);
  await api('/api/projects/'+project.id+'/tasks','PATCH',{taskId:'a',date:'2028-02-29'});
  assert.equal((await api('/api/projects/'+project.id)).phases[0].tasks[0].date,'2028-02-29');
  const response=await fetch(origin+'/api/themes/purchase',{method:'POST',headers:{Cookie:'__Host-pt_session='+token,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({themeId:'pink'})});assert.equal(response.status,409);
  console.log('PASS: actual Wrangler/Pages/D1 runtime: health, account session, project import, one-time reward, debit/ownership, retry, date persistence, insufficient funds.');
}finally{
  await sql(cleanup,`DELETE FROM point_ledger WHERE user_id='${id}'; DELETE FROM purchases WHERE user_id='${id}'; DELETE FROM task_reward_claims WHERE user_id='${id}'; DELETE FROM reward_claims WHERE user_id='${id}'; DELETE FROM projects WHERE user_id='${id}'; DELETE FROM sessions WHERE user_id='${id}'; DELETE FROM wallets WHERE user_id='${id}'; DELETE FROM users WHERE id='${id}';`);
  await unlink(seed);await unlink(cleanup);
}
