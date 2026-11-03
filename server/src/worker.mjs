const SESSION='__Host-pt_session', OAUTH='__Host-pt_oauth', MAX_BODY=256*1024;
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const now=()=>Math.floor(Date.now()/1000);
export const completionDate=(instant=new Date())=>new Date(instant.getTime()+9*60*60*1000).toISOString().slice(0,10);
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
const cookie=(request,name)=>request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
const secureCookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function challenge(value){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function text(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError(400,`${label} 값이 올바르지 않습니다.`);return value;}
export function validateProject(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new HttpError(400,'프로젝트 JSON이 필요합니다.');
 text(data.project,200,'프로젝트 이름');if(data.projectId!==undefined)text(data.projectId,120,'프로젝트 ID');
 if(!Array.isArray(data.phases)||data.phases.length>50)throw new HttpError(400,'단계 목록을 확인하세요.');
 const ids=new Set(),tasks=[];
 for(const phase of data.phases){text(phase?.title,200,'단계 이름');if(!Array.isArray(phase.tasks))throw new HttpError(400,'업무 목록을 확인하세요.');
  for(const task of phase.tasks){text(task?.id,120,'업무 ID');text(task.text,1000,'업무 이름');if(ids.has(task.id))throw new HttpError(400,'업무 ID가 중복됩니다.');ids.add(task.id);if(task.details!==undefined&&(typeof task.details!=='string'||task.details.length>20000))throw new HttpError(400,'상세 설명은 20,000자 이하의 문자열이어야 합니다.');if(task.done!==undefined&&typeof task.done!=='boolean')throw new HttpError(400,'완료 상태는 true 또는 false여야 합니다.');const date=task.date||'';validateDate(date);tasks.push({id:task.id,done:task.done===true?1:0,date});}
 }
 if(!tasks.length||tasks.length>300)throw new HttpError(400,'업무를 1~300개 등록하세요.');return tasks;
}
function validateDate(value){if(value==='')return;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))throw new HttpError(400,'날짜 형식을 확인하세요.');const date=new Date(value+'T12:00:00Z');if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw new HttpError(400,'유효한 날짜를 선택하세요.');}
async function body(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'JSON 요청만 지원합니다.');
 if(Number(request.headers.get('Content-Length'))>MAX_BODY)throw new HttpError(413,'요청이 너무 큽니다.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'요청 내용이 없습니다.');let size=0,chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();throw new HttpError(413,'요청이 너무 큽니다.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new HttpError(400,'JSON 객체 형식이 필요합니다.');}
}
async function user(request,db){const token=cookie(request,SESSION);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return stmt(db,'SELECT u.id,u.login FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await hash(token),now()).first();}
export async function getWallet(db,userId){const row=await stmt(db,'SELECT balance,active_theme FROM wallets WHERE user_id=?',userId).first();const owned=await stmt(db,'SELECT theme_id FROM purchases WHERE user_id=? ORDER BY theme_id',userId).all();return {version:1,balance:row.balance,activeTheme:row.active_theme,owned:owned.results.map(r=>r.theme_id)};}
async function trophyStyles(db,userId){
 const active=await stmt(db,'SELECT style_id FROM trophy_preferences WHERE user_id=?',userId).first();
 const owned=await stmt(db,'SELECT style_id FROM trophy_purchases WHERE user_id=? ORDER BY style_id',userId).all();
 return {active:active?.style_id ?? 1,owned:[1,...owned.results.map(row=>row.style_id)]};
}
async function selectTrophyStyle(db,userId,styleId,purchaseOnly){
 if(!Number.isInteger(styleId)||styleId<1||styleId>20)throw new HttpError(400,'존재하지 않는 트로피입니다.');
 if(purchaseOnly){
  if(styleId!==1)await stmt(db,'INSERT INTO trophy_purchases(user_id,style_id) VALUES(?,?) ON CONFLICT(user_id,style_id) DO NOTHING',userId,styleId).run();
 }else if(styleId===1)await stmt(db,'DELETE FROM trophy_preferences WHERE user_id=?',userId).run();
 else await db.batch([
  stmt(db,'INSERT INTO trophy_purchases(user_id,style_id) VALUES(?,?) ON CONFLICT(user_id,style_id) DO NOTHING',userId,styleId),
  stmt(db,'INSERT INTO trophy_preferences(user_id,style_id) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET style_id=excluded.style_id',userId,styleId)
 ]);
 return {styles:await trophyStyles(db,userId),wallet:await getWallet(db,userId)};
}
async function changeProjectTrophy(db,userId,projectId,styleId){
 if(!Number.isInteger(styleId)||styleId<1||styleId>20)throw new HttpError(400,'존재하지 않는 트로피입니다.');
 const result=await stmt(db,`UPDATE project_trophies SET style_id=?
  WHERE project_id=? AND user_id=?
  AND (?=1 OR EXISTS(SELECT 1 FROM trophy_purchases WHERE user_id=? AND style_id=?))`,
  styleId,projectId,userId,styleId,userId,styleId).run();
 if(!result.meta.changes){
  if(!await stmt(db,'SELECT project_id FROM project_trophies WHERE project_id=? AND user_id=?',projectId,userId).first())
   throw new HttpError(404,'획득한 트로피를 찾을 수 없습니다.');
  throw new HttpError(403,'보유한 디자인만 적용할 수 있습니다.');
 }
 return {styleId};
}
async function project(db,userId,id){const row=await stmt(db,'SELECT * FROM projects WHERE id=? AND user_id=?',id,userId).first();if(!row)throw new HttpError(404,'프로젝트를 찾을 수 없습니다.');return row;}
function awardTrophy(db,userId,projectValue,byKey=false){
 return stmt(db,`INSERT INTO project_trophies(project_id,user_id,title,completed_date)
 SELECT p.id,p.user_id,p.title,? FROM projects p WHERE p.user_id=? AND p.${byKey?'project_key':'id'}=?
 AND EXISTS(SELECT 1 FROM tasks t WHERE t.project_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.project_id=p.id AND t.done=0)
 ON CONFLICT(project_id) DO NOTHING`,completionDate(),userId,projectValue);
}
async function projectData(db,row){const result=await stmt(db,'SELECT id,done,date FROM tasks WHERE project_id=?',row.id).all();const tasks=new Map(result.results.map(t=>[t.id,t]));const data=JSON.parse(row.snapshot);for(const phase of data.phases)for(const task of phase.tasks){const saved=tasks.get(task.id);task.done=!!saved?.done;task.date=saved?.date||'';}data.projectId=row.project_key;return data;}
export async function registerProject(db,userId,data){
 const tasks=validateProject(data),key=data.projectId||'name-'+await hash(data.project),id=crypto.randomUUID();
 const operations=[stmt(db,'INSERT INTO projects(id,user_id,project_key,title,snapshot) VALUES(?,?,?,?,?) ON CONFLICT(user_id,project_key) DO UPDATE SET title=excluded.title,snapshot=excluded.snapshot',id,userId,key,data.project,JSON.stringify(data))];
 // Re-import updates task definitions but preserves existing progress and reward identity.
 for(const task of tasks)operations.push(stmt(db,'INSERT INTO tasks(project_id,id,done,date) SELECT id,?,?,? FROM projects WHERE project_key=? AND user_id=? ON CONFLICT(project_id,id) DO NOTHING',task.id,task.done,task.date,key,userId));
 operations.push(stmt(db,'DELETE FROM tasks WHERE project_id=(SELECT id FROM projects WHERE user_id=? AND project_key=?) AND id NOT IN (SELECT value FROM json_each(?))',userId,key,JSON.stringify(tasks.map(t=>t.id))));
 operations.push(stmt(db,`INSERT INTO task_reward_claims(project_id,task_id,user_id) SELECT t.project_id,t.id,p.user_id FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.user_id=? AND p.project_key=? AND t.done=1 AND NOT EXISTS(SELECT 1 FROM task_reward_claims c WHERE c.project_id=t.project_id AND c.task_id=t.id)`,userId,key));
 operations.push(awardTrophy(db,userId,key,true));
 await db.batch(operations);return stmt(db,'SELECT id FROM projects WHERE user_id=? AND project_key=?',userId,key).first();
}
export async function setTask(db,userId,projectId,taskId,patch){
 await project(db,userId,projectId);if(!await stmt(db,'SELECT id FROM tasks WHERE project_id=? AND id=?',projectId,taskId).first())throw new HttpError(404,'업무를 찾을 수 없습니다.');const operations=[];
 if(typeof patch.done==='boolean')operations.push(stmt(db,'UPDATE tasks SET done=?,date=CASE WHEN done=0 AND ?=1 THEN ? ELSE date END WHERE project_id=? AND id=?',patch.done?1:0,patch.done?1:0,completionDate(),projectId,taskId));
 else if(Object.hasOwn(patch,'date')){validateDate(patch.date);operations.push(stmt(db,'UPDATE tasks SET date=? WHERE project_id=? AND id=?',patch.date,projectId,taskId));}
 else throw new HttpError(400,'변경할 완료 상태 또는 날짜가 필요합니다.');
 if(patch.done===true)operations.push(stmt(db,`INSERT INTO task_reward_claims(project_id,task_id,user_id) SELECT t.project_id,t.id,p.user_id FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.id=? AND p.user_id=? AND t.id=? AND t.done=1 ON CONFLICT(project_id,task_id) DO NOTHING`,projectId,userId,taskId));
 if(patch.done===true)operations.push(awardTrophy(db,userId,projectId));
 const results=await db.batch(operations);
 const saved=await stmt(db,'SELECT date FROM tasks WHERE project_id=? AND id=?',projectId,taskId).first();
 return {wallet:await getWallet(db,userId),reward:results[1]?.meta.changes?10:0,date:saved.date,trophyAwarded:!!results[2]?.meta.changes};
}
export async function purchaseTheme(db,userId,themeId){
 if(themeId!=='lime'&&!await stmt(db,'SELECT id FROM themes WHERE id=?',themeId).first())throw new HttpError(400,'존재하지 않는 테마입니다.');const operations=[];
 if(themeId!=='lime')operations.push(stmt(db,'INSERT INTO purchases(user_id,theme_id) VALUES(?,?) ON CONFLICT(user_id,theme_id) DO NOTHING',userId,themeId));
 operations.push(stmt(db,"UPDATE wallets SET active_theme=? WHERE user_id=? AND (?='lime' OR EXISTS(SELECT 1 FROM purchases WHERE user_id=? AND theme_id=?))",themeId,userId,themeId,userId,themeId));await db.batch(operations);return getWallet(db,userId);
}
async function auth(request,env,path){
 if(path==='/auth/logout'&&request.method==='POST'){const token=cookie(request,SESSION);if(token)await stmt(env.DB,'DELETE FROM sessions WHERE token_hash=?',await hash(token)).run();return json({ok:true},200,{'Set-Cookie':secureCookie(SESSION,'',0)});}
 if(request.method!=='GET')throw new HttpError(405,'지원하지 않는 요청입니다.');
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.PUBLIC_ORIGIN)throw new HttpError(503,'GitHub 로그인 설정이 아직 완료되지 않았습니다.');
 const origin=new URL(env.PUBLIC_ORIGIN).origin;if(new URL(request.url).origin!==origin)throw new HttpError(400,'설정된 사이트 주소로 접속하세요.');
 if(path==='/auth/login'){
  const state=random(),verifier=random();await env.DB.batch([stmt(env.DB,'DELETE FROM oauth_states WHERE expires_at<?',now()),stmt(env.DB,'DELETE FROM sessions WHERE expires_at<?',now()),stmt(env.DB,'INSERT INTO oauth_states(state_hash,verifier,expires_at) VALUES(?,?,?)',await hash(state),verifier,now()+600)]);
  const url=new URL('https://github.com/login/oauth/authorize');for(const [key,value]of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:origin+'/auth/callback',state,code_challenge:await challenge(verifier),code_challenge_method:'S256'}))url.searchParams.set(key,value);
  return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':secureCookie(OAUTH,state,600),'Cache-Control':'no-store'}});
 }
 if(path==='/auth/callback'){
  const url=new URL(request.url),state=url.searchParams.get('state'),code=url.searchParams.get('code');if(!state||!code||state!==cookie(request,OAUTH))throw new HttpError(400,'로그인 확인에 실패했습니다. 다시 시도하세요.');
  const record=await stmt(env.DB,'DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING verifier',await hash(state),now()).first();if(!record)throw new HttpError(400,'로그인 요청이 만료되었습니다.');
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,code_verifier:record.verifier,redirect_uri:origin+'/auth/callback'})});const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)throw new HttpError(401,'GitHub 인증을 완료하지 못했습니다.');
  const response=await fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+token.access_token,'User-Agent':'Progress-Tracker',Accept:'application/vnd.github+json'}});const profile=await response.json();if(!response.ok||!Number.isSafeInteger(profile.id)||typeof profile.login!=='string')throw new HttpError(401,'GitHub 계정을 확인하지 못했습니다.');
  const id='github:'+profile.id,session=random();await env.DB.batch([stmt(env.DB,'INSERT INTO users(id,login) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login',id,profile.login),stmt(env.DB,'INSERT INTO wallets(user_id) VALUES(?) ON CONFLICT(user_id) DO NOTHING',id),stmt(env.DB,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await hash(session),id,now()+604800)]);
  const headers=new Headers({Location:'/', 'Cache-Control':'no-store'});headers.append('Set-Cookie',secureCookie(SESSION,session,604800));headers.append('Set-Cookie',secureCookie(OAUTH,'',0));return new Response(null,{status:302,headers});
 }
 throw new HttpError(404,'경로를 찾을 수 없습니다.');
}
async function route(request,env){
 const url=new URL(request.url),path=url.pathname;if(!['GET','POST','PATCH'].includes(request.method))throw new HttpError(405,'지원하지 않는 요청입니다.');
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)throw new HttpError(403,'다른 사이트에서의 변경 요청은 허용하지 않습니다.');
 if(path.startsWith('/auth/'))return auth(request,env,path);
 if(path==='/api/health'){await env.DB.prepare('SELECT user_id FROM wallets LIMIT 1').first();return json({status:'ok',storage:'D1'});}
 const account=await user(request,env.DB);if(path==='/api/session')return json({user:account,wallet:account?await getWallet(env.DB,account.id):null,loginReady:!!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.PUBLIC_ORIGIN)});if(!account)throw new HttpError(401,'로그인이 필요합니다.');const id=account.id;
 if(path==='/api/wallet'&&request.method==='GET')return json(await getWallet(env.DB,id));
 if(path==='/api/trophies'&&request.method==='GET')return json((await stmt(env.DB,'SELECT project_id AS projectId,title,completed_date AS completedDate,style_id AS styleId FROM project_trophies WHERE user_id=? ORDER BY completed_date DESC,project_id',id).all()).results);
 if(path==='/api/trophies'&&request.method==='PATCH'){
  const patch=await body(request);
  return json(await changeProjectTrophy(env.DB,id,text(patch.projectId,120,'프로젝트 ID'),patch.styleId));
 }
 if(path==='/api/trophy-styles'&&request.method==='GET')return json(await trophyStyles(env.DB,id));
 if(path==='/api/trophy-shelf-theme'&&request.method==='GET'){
  const row=await stmt(env.DB,'SELECT shelf_theme AS theme FROM users WHERE id=?',id).first();
  const purchases=await stmt(env.DB,'SELECT theme FROM shelf_theme_purchases WHERE user_id=?',id).all();
  const owned=['classic',...purchases.results.map(row=>row.theme)];
  return json({theme:owned.includes(row.theme)?row.theme:'classic',owned});
 }
 if(path==='/api/trophy-shelf-theme'&&request.method==='POST'){
  const {theme}=await body(request);
  if(!['steel','arcade','museum','walnut','observatory'].includes(theme))throw new HttpError(400,'구매할 수 없는 진열장 테마입니다.');
  await stmt(env.DB,'INSERT INTO shelf_theme_purchases(user_id,theme) VALUES(?,?) ON CONFLICT(user_id,theme) DO NOTHING',id,theme).run();
  return json(await getWallet(env.DB,id));
 }
 if(path==='/api/trophy-shelf-theme'&&request.method==='PATCH'){
  const {theme}=await body(request);
  if(!['classic','steel','arcade','museum','walnut','observatory'].includes(theme))throw new HttpError(400,'존재하지 않는 진열장 테마입니다.');
  const saved=await stmt(env.DB,`UPDATE users SET shelf_theme=? WHERE id=?
   AND (?='classic' OR EXISTS(SELECT 1 FROM shelf_theme_purchases WHERE user_id=? AND theme=?))`,
   theme,id,theme,id,theme).run();
  if(!saved.meta.changes)throw new HttpError(403,'보유한 진열장 테마만 선택할 수 있습니다.');
  return json({theme});
 }
 if(path==='/api/trophy-styles'&&request.method==='POST'){
  const purchase=await body(request);
  return json(await selectTrophyStyle(env.DB,id,purchase.styleId,purchase.purchaseOnly===true));
 }
 if(path==='/api/themes/purchase'&&request.method==='POST')return json(await purchaseTheme(env.DB,id,(await body(request)).themeId));
 if(path==='/api/projects'&&request.method==='GET')return json((await stmt(env.DB,'SELECT p.id,p.title,COUNT(t.id) AS total,COALESCE(SUM(t.done),0) AS done FROM projects p LEFT JOIN tasks t ON t.project_id=p.id WHERE p.user_id=? GROUP BY p.id ORDER BY p.created_at DESC',id).all()).results);
 if(path==='/api/projects'&&request.method==='POST')return json(await registerProject(env.DB,id,await body(request)),201);
 const match=path.match(/^\/api\/projects\/([^/]+)(?:\/(tasks|reset))?$/);if(match){const row=await project(env.DB,id,match[1]);if(!match[2]&&request.method==='GET')return json(await projectData(env.DB,row));if(match[2]==='tasks'&&request.method==='PATCH'){const patch=await body(request);return json(await setTask(env.DB,id,row.id,text(patch.taskId,120,'업무 ID'),patch));}if(match[2]==='reset'&&request.method==='POST'){await stmt(env.DB,'UPDATE tasks SET done=0 WHERE project_id=?',row.id).run();return json({ok:true});}}
 throw new HttpError(404,'경로를 찾을 수 없습니다.');
}
export default {async fetch(request,env){try{return await route(request,env);}catch(error){if(String(error.message).includes('insufficient_points'))return json({error:'포인트가 부족합니다.'},409);if(error instanceof HttpError)return json({error:error.message},error.status);return json({error:'서버 처리에 실패했습니다. 잠시 후 다시 시도하세요.'},500);}}};
