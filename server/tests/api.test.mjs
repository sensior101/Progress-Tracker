import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker,{hash,registerProject,setTask,purchaseTheme,getWallet,validateProject,completionDate} from '../src/worker.mjs';

const origin='https://tracker.example';
const template={project:'테스트 프로젝트',projectId:'stable-project',phases:[{title:'개발',tasks:[{id:'one',text:'업무 1'},{id:'two',text:'업무 2'}]}]};
async function fixture(legacy=false) {
  const sql=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()) { if(legacy&&file!=='0001_wallet.sql')continue; sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8')); }
  const db={
    prepare(query) {
      let args=[];
      const statement={
        bind(...values){args=values;return statement;},
        first(){return Promise.resolve(sql.prepare(query).get(...args)||null);},
        all(){return Promise.resolve({results:sql.prepare(query).all(...args)});},
        run(){const r=sql.prepare(query).run(...args);return Promise.resolve({meta:{changes:Number(r.changes)}});},
        execute(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}
      };return statement;
    },
    async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}
  };
  for(const id of ['alice','bob']) {
    sql.prepare('INSERT INTO users(id,login) VALUES(?,?)').run(id,id);
    sql.prepare('INSERT INTO wallets(user_id) VALUES(?)').run(id);
  }
  const token='a'.repeat(64);
  sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(await hash(token),'alice',Math.floor(Date.now()/1000)+1000);
  const env={DB:db,PUBLIC_ORIGIN:origin,GITHUB_CLIENT_ID:'client',GITHUB_CLIENT_SECRET:'test-only-secret'};
  function request(path,method='GET',payload,options={}) {
    const headers={'Cookie':'__Host-pt_session='+token,...options.headers};
    if(method!=='GET')headers.Origin=options.origin||origin;
    if(payload!==undefined){headers['Content-Type']='application/json';}
    if(options.anonymous)delete headers.Cookie;
    return worker.fetch(new Request(origin+path,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload)}),env);
  }
  return {sql,db,env,request};
}

test('migrations initialize a zero wallet and protect incomplete rewards',async()=>{
  const {db,sql}=await fixture();assert.equal((await getWallet(db,'alice')).balance,0);
  const {id}=await registerProject(db,'alice',template);
  assert.throws(()=>sql.prepare('INSERT INTO task_reward_claims(project_id,task_id,user_id) VALUES(?,?,?)').run(id,'one','alice'),/task_incomplete/);
  assert.equal((await getWallet(db,'alice')).balance,0);sql.close();
});
test('shelf themes require ownership and charge 100P once across retries',async()=>{
  const {request,sql}=await fixture();
  const path='/api/trophy-shelf-theme';
  sql.prepare("UPDATE users SET shelf_theme='arcade' WHERE id='alice'").run();
  assert.deepEqual(await (await request(path)).json(),{theme:'classic',owned:['classic']});
  assert.equal((await request(path,'PATCH',{theme:'arcade'})).status,403);
  assert.equal((await request(path,'POST',{theme:'arcade'})).status,409);
  sql.prepare("UPDATE wallets SET balance=100 WHERE user_id='alice'").run();
  const purchases=await Promise.all([request(path,'POST',{theme:'arcade'}),request(path,'POST',{theme:'arcade'})]);
  for(const purchase of purchases){
    assert.equal(purchase.status,200);
    assert.equal((await purchase.json()).balance,0);
  }
  assert.equal((await request(path,'PATCH',{theme:'arcade'})).status,200);
  assert.deepEqual(await (await request(path)).json(),{theme:'arcade',owned:['classic','arcade']});
  assert.equal((await request(path,'PATCH',{theme:'classic'})).status,200);
  sql.close();
});

test('trophy purchases debit once, reject insufficient funds and retain ownership when switching styles',async()=>{
  const {request,sql}=await fixture();
  const buy=styleId=>request('/api/trophy-styles','POST',{styleId});
  assert.equal((await buy(2)).status,409);
  assert.equal((await buy(21)).status,400);
  sql.prepare('UPDATE wallets SET balance=200 WHERE user_id=?').run('alice');
  const [first,retry]=await Promise.all([buy(20),buy(20)]);
  for(const result of [first,retry]){
    assert.equal(result.status,200);
    const {wallet,styles}=await result.json();
    assert.equal(wallet.balance,0);
    assert.deepEqual(styles,{active:20,owned:[1,20]});
  }
  assert.equal((await buy(2)).status,409);
  assert.deepEqual((await (await buy(1)).json()).styles,{active:1,owned:[1,20]});
  assert.deepEqual((await (await buy(20)).json()).styles,{active:20,owned:[1,20]});
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM point_ledger WHERE event_key LIKE 'trophy:%'").get().count,1);
  sql.close();
});
test('the trophy shelf shows only the account’s first completion, even after reset and rename',async()=>{
  const {db,sql,request}=await fixture();
  const {id}=await registerProject(db,'alice',template);
  const completeBob=structuredClone(template);completeBob.project='Private Bob project';
  completeBob.phases[0].tasks.forEach(task=>task.done=true);
  await registerProject(db,'bob',completeBob);
  assert.equal((await request('/api/trophies','GET',undefined,{anonymous:true})).status,401);
  assert.deepEqual(await (await request('/api/trophies')).json(),[]);
  assert.equal((await setTask(db,'alice',id,'one',{done:true})).trophyAwarded,false);
  assert.equal((await setTask(db,'alice',id,'two',{done:true})).trophyAwarded,true);
  await request('/api/projects/'+id+'/reset','POST',{});
  await registerProject(db,'alice',{...template,project:'Renamed'});
  await setTask(db,'alice',id,'one',{done:true});
  assert.equal((await setTask(db,'alice',id,'two',{done:true})).trophyAwarded,false);
  assert.deepEqual(await (await request('/api/trophies')).json(),[{projectId:id,title:template.project,completedDate:completionDate(),styleId:1}]);
  const second=await registerProject(db,'alice',{...completeBob,project:'Second',projectId:'second'});
  assert.equal((await request('/api/trophies','PATCH',{projectId:id,styleId:16})).status,403);
  sql.prepare('UPDATE wallets SET balance=200 WHERE user_id=?').run('alice');
  assert.equal((await request('/api/trophy-styles','POST',{styleId:16,purchaseOnly:true})).status,200);
  assert.equal((await request('/api/trophies','PATCH',{projectId:id,styleId:16})).status,200);
  const shelf=await (await request('/api/trophies')).json();
  assert.equal(shelf.find(trophy=>trophy.projectId===id).styleId,16);
  assert.equal(shelf.find(trophy=>trophy.projectId===second.id).styleId,1);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM project_trophies WHERE user_id=?').get('bob').count,1);
  sql.close();
});
test('each completed task pays 10P exactly once across retries and reset/recompletion',async()=>{
  const {db,sql}=await fixture();const {id}=await registerProject(db,'alice',template);
  assert.equal((await setTask(db,'alice',id,'one',{done:true})).reward,10);
  const first=await setTask(db,'alice',id,'two',{done:true});assert.equal(first.reward,10);assert.equal(first.wallet.balance,20);
  await Promise.all([setTask(db,'alice',id,'two',{done:true}),setTask(db,'alice',id,'two',{done:true})]);
  await setTask(db,'alice',id,'one',{done:false});await setTask(db,'alice',id,'one',{done:true});
  assert.equal((await getWallet(db,'alice')).balance,20);assert.equal(sql.prepare('SELECT count(*) n FROM task_reward_claims').get().n,2);sql.close();
});
test('purchase debit/ownership/equip are atomic, replay costs nothing',async()=>{
  const {db,sql}=await fixture();const {id}=await registerProject(db,'alice',template);
  await setTask(db,'alice',id,'one',{done:true});await setTask(db,'alice',id,'two',{done:true});
  sql.prepare('UPDATE wallets SET balance=100 WHERE user_id=?').run('alice');
  let wallet=await purchaseTheme(db,'alice','pink');assert.equal(wallet.balance,0);assert.deepEqual(wallet.owned,['pink']);assert.equal(wallet.activeTheme,'pink');
  await purchaseTheme(db,'alice','pink');await purchaseTheme(db,'alice','lime');wallet=await getWallet(db,'alice');assert.equal(wallet.balance,0);assert.equal(wallet.activeTheme,'lime');
  assert.equal(sql.prepare('SELECT count(*) n FROM point_ledger').get().n,3);sql.close();
});
test('insufficient funds and racing different purchases never overdraw or retain ownership',async()=>{
  const {db,sql}=await fixture();sql.prepare('UPDATE wallets SET balance=100 WHERE user_id=?').run('alice');
  const result=await Promise.allSettled([purchaseTheme(db,'alice','blue'),purchaseTheme(db,'alice','orange')]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  const wallet=await getWallet(db,'alice');assert.equal(wallet.balance,0);assert.equal(wallet.owned.length,1);assert.equal(sql.prepare('SELECT count(*) n FROM point_ledger').get().n,1);sql.close();
});
test('re-import preserves identity/progress/reward and syncs task definitions',async()=>{
  const {db,sql}=await fixture();const first=await registerProject(db,'alice',template);await setTask(db,'alice',first.id,'one',{done:true});
  const updated=structuredClone(template);updated.phases[0].tasks.push({id:'three',text:'새 업무'});
  const second=await registerProject(db,'alice',updated);assert.equal(second.id,first.id);assert.equal(sql.prepare('SELECT done FROM tasks WHERE project_id=? AND id=?').get(first.id,'one').done,1);assert.equal(sql.prepare('SELECT count(*) n FROM tasks').get().n,3);sql.close();
});
test('other accounts cannot read, complete or reward another project',async()=>{
  const {db,sql}=await fixture();const {id}=await registerProject(db,'bob',template);
  await assert.rejects(setTask(db,'alice',id,'one',{done:true}),/프로젝트/);
  assert.equal((await getWallet(db,'alice')).balance,0);assert.equal((await getWallet(db,'bob')).balance,0);sql.close();
});
test('validation rejects duplicate tasks, empty tasks, invalid dates and numeric completion',()=>{
  const invalid=structuredClone(template);invalid.phases[0].tasks[1].id='one';assert.throws(()=>validateProject(invalid),/중복/);
  assert.throws(()=>validateProject({...template,phases:[]}),/1~300/);
  const badDate=structuredClone(template);badDate.phases[0].tasks[0].date='2026-02-30';assert.throws(()=>validateProject(badDate),/유효한/);
  const badDone=structuredClone(template);badDone.phases[0].tasks[0].done=1;assert.throws(()=>validateProject(badDone),/true/);
});
test('API enforces authentication, ownership, same-origin writes and content types',async()=>{
  const {request,db,sql}=await fixture();assert.equal((await request('/api/wallet','GET',undefined,{anonymous:true})).status,401);
  assert.equal((await request('/api/projects','POST',template,{origin:'https://evil.example'})).status,403);
  const {id}=await registerProject(db,'bob',template);assert.equal((await request('/api/projects/'+id)).status,404);
  const created=await request('/api/projects','POST',template);assert.equal(created.status,201);
  const project=await created.json();assert.equal((await request('/api/projects/'+project.id+'/tasks','PATCH',{taskId:'one',date:'2028-02-29'})).status,200);
  const data=await (await request('/api/projects/'+project.id)).json();assert.equal(data.phases[0].tasks[0].date,'2028-02-29');
  assert.equal((await request('/api/themes/purchase','POST',{themeId:'blue',price:0,balance:9999})).status,409);
  assert.equal((await request('/api/projects','POST',null)).status,400);sql.close();
});
test('logout revokes the hashed session; raw tokens are never stored',async()=>{
  const {sql,request}=await fixture();assert.notEqual(sql.prepare('SELECT token_hash FROM sessions').get().token_hash,'a'.repeat(64));
  const result=await request('/auth/logout','POST',{});assert.equal(result.status,200);assert.match(result.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await request('/api/wallet')).status,401);sql.close();
});
test('OAuth uses PKCE/one-time state and creates an account without storing GitHub tokens',async()=>{
  const {sql,env}=await fixture();const login=await worker.fetch(new Request(origin+'/auth/login'),env);assert.equal(login.status,302);
  const url=new URL(login.headers.get('Location'));assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),null);
  const state=url.searchParams.get('state');const wrong=await worker.fetch(new Request(origin+'/auth/callback?state='+state+'&code=test'),env);assert.equal(wrong.status,400);
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('access_token')?{access_token:'never-store-this'}:{id:42,login:'octocat'}),{headers:{'Content-Type':'application/json'}});
    const req=()=>new Request(origin+'/auth/callback?state='+state+'&code=test',{headers:{Cookie:'__Host-pt_oauth='+state}});
    const callback=await worker.fetch(req(),env);assert.equal(callback.status,302);assert.match(callback.headers.get('Set-Cookie'),/__Host-pt_session=/);assert.equal(sql.prepare('SELECT login FROM users WHERE id=?').get('github:42').login,'octocat');assert.equal((await worker.fetch(req(),env)).status,400);
    assert.equal(sql.prepare('SELECT count(*) n FROM sessions WHERE token_hash=?').get('never-store-this').n,0);
  }finally{globalThis.fetch=original;sql.close();}
});

test('completion date follows the KST day and retries preserve the existing date',async()=>{
  assert.equal(completionDate(new Date('2026-11-03T14:59:59Z')),'2026-11-03');
  assert.equal(completionDate(new Date('2026-11-03T15:00:00Z')),'2026-11-04');
  const {db,sql}=await fixture();const {id}=await registerProject(db,'alice',template);
  const result=await setTask(db,'alice',id,'one',{done:true});assert.equal(result.date,completionDate());
  sql.prepare('UPDATE tasks SET date=? WHERE project_id=? AND id=?').run('2026-01-01',id,'one');
  assert.equal((await setTask(db,'alice',id,'one',{done:true})).date,'2026-01-01');
  const balance=(await getWallet(db,'alice')).balance;await setTask(db,'alice',id,'one',{done:false});
  const again=await setTask(db,'alice',id,'one',{done:true});assert.equal(again.date,completionDate());assert.equal(again.wallet.balance,balance);sql.close();
});
test('migration retains legacy rewards/ownership and credits only unpaid completed tasks',async()=>{
  const {db,sql}=await fixture(true);
  sql.prepare('INSERT INTO projects(id,user_id,project_key,title,snapshot) VALUES(?,?,?,?,?)').run('old','alice','old','Old',JSON.stringify(template));
  sql.prepare('INSERT INTO tasks(project_id,id,done) VALUES(?,?,1)').run('old','one');
  sql.prepare('INSERT INTO reward_claims(project_id,user_id) VALUES(?,?)').run('old','alice');
  sql.prepare('INSERT INTO purchases(user_id,theme_id) VALUES(?,?)').run('alice','pink');
  sql.prepare('UPDATE tasks SET done=0 WHERE project_id=?').run('old');
  sql.prepare('INSERT INTO projects(id,user_id,project_key,title,snapshot) VALUES(?,?,?,?,?)').run('unpaid','bob','unpaid','Unpaid',JSON.stringify(template));
  sql.prepare('INSERT INTO tasks(project_id,id,done) VALUES(?,?,1)').run('unpaid','one');
  sql.exec(readFileSync(new URL('../migrations/0002_task_rewards.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0003_project_trophies.sql',import.meta.url),'utf8'));
  assert.equal(sql.prepare('SELECT completed_date FROM project_trophies WHERE project_id=?').get('old').completed_date,completionDate());
  assert.equal((await getWallet(db,'alice')).balance,0);assert.deepEqual((await getWallet(db,'alice')).owned,['pink']);
  assert.equal((await setTask(db,'alice','old','one',{done:true})).reward,0);
  assert.equal((await getWallet(db,'bob')).balance,10);
  assert.equal(sql.prepare('SELECT price FROM themes WHERE id=?').get('pink').price,1000);sql.close();
});
test('importing completed tasks credits them once, and removing/readding an ID cannot farm points',async()=>{
  const {db,sql}=await fixture();const data=structuredClone(template);data.phases[0].tasks[0].done=true;
  const {id}=await registerProject(db,'alice',data);assert.equal((await getWallet(db,'alice')).balance,10);
  await registerProject(db,'alice',data);assert.equal((await getWallet(db,'alice')).balance,10);
  const changed=structuredClone(data);changed.phases[0].tasks.shift();await registerProject(db,'alice',changed);
  await registerProject(db,'alice',data);assert.equal((await getWallet(db,'alice')).balance,10);sql.close();
});
