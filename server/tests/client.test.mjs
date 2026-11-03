import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const code=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>!m[1].includes('application/json'))[2];
const project={project:'UI test',phases:[{title:'개발',tasks:[{id:'a',text:'업무 A',details:'목적: 사용자 요청 처리\n순서: 입력 검증 후 처리\n완료 기준: 성공·실패 확인'},{id:'b',text:'업무 B',done:true}]}]};
async function boot({failTask=false,anonymous=false}={}) {
  let doc;
  class Element {
    constructor(){this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.value='';this.events={};this.open=false;this.disabled=false;this._text='';}
    set textContent(value){this._text=String(value);}get textContent(){return this._text;}
    appendChild(e){this.children.push(e);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}
    focus(){doc.activeElement=this;}scrollIntoView(){}addEventListener(k,v){this.events[k]=v;}
    showModal(){this.open=true;}close(){this.open=false;this.events.close?.();}
  }
  const roots={},requests=[],storage={};
  for(const m of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)){assert(!roots[m[2]],'duplicate ID');roots[m[2]]=new Element;roots[m[2]].id=m[2];}
  roots.data.textContent=JSON.stringify(project);
  roots.trophyIcon.content={cloneNode:()=>Object.assign(new Element,{querySelector:()=>new Element})};
  const filters=['all','pending','done'].map(f=>{const e=new Element;e.dataset.filter=f;return e;});
  function nodes(){const out=[];function walk(e){out.push(e);e.children.forEach(walk);}Object.values(roots).forEach(walk);return out;}
  doc={documentElement:new Element,activeElement:null,createElement:()=>new Element,getElementById:id=>nodes().find(e=>e.id===id),querySelectorAll:()=>filters,querySelector:()=>filters.find(e=>e.attrs['aria-pressed']==='true')};
  let wallet={version:1,balance:1500,owned:[],activeTheme:'lime'};
  async function fetch(path,options={}) {
    const payload=options.body?JSON.parse(options.body):undefined;
    requests.push({path,options,payload});let result;
    if(path==='/api/session')result={user:anonymous?null:{id:'alice',login:'alice'},wallet:anonymous?null:wallet,loginReady:true};
    else if(path==='/api/projects')result=options.method==='POST'?{id:'p1'}:[{id:'p1',title:project.project,done:1,total:2}];
    else if(path==='/api/projects/p1')result=project;
    else if(path==='/api/wallet')result=wallet;
    else if(path==='/api/trophies')result=options.method==='PATCH'?{styleId:payload.styleId}:[{projectId:'p1',title:'완료한 프로젝트',completedDate:'2026-11-04',styleId:1}];
    else if(path==='/api/trophy-styles')result={active:1,owned:[1,16]};
    else if(path==='/api/trophy-shelf-theme')result={theme:payload?.theme || 'classic',owned:['classic']};
    else if(path==='/api/projects/p1/tasks') {
      if(failTask)return {ok:false,json:async()=>({error:'테스트 저장 실패'})};
      wallet={...wallet,balance:1510};result={wallet,reward:payload.done?10:0,date:'2026-11-04'};
    }
    else if(path==='/api/themes/purchase'){wallet={version:1,balance:1410,owned:[payload.themeId],activeTheme:payload.themeId};result=wallet;}
    else if(path==='/api/projects/p1/reset')result={ok:true};
    else throw new Error('Unexpected request: '+path);
    return {ok:true,json:async()=>result};
  }
  const contextLocation={href:'https://tracker.example/?project=p1'};
  await vm.runInNewContext(code,{document:doc,location:contextLocation,URL,fetch,window:{addEventListener(){},matchMedia:()=>({matches:true})},navigator:{},localStorage:{getItem(){throw new Error('Browser storage must not be used');},setItem(){throw new Error('Browser storage must not be used');}},confirm:()=>true,setTimeout:()=>1,clearTimeout(){}});
  return {roots,get:id=>doc.getElementById(id),doc,requests,storage,location:contextLocation};
}

test('the trophy shelf displays the saved name and completion date',async()=>{
  const b=await boot();
  await b.roots.trophyOpen.onclick();
  assert.equal(b.roots.trophyShelf.open,true);
  const card=b.roots.trophyItems.children[0];
  assert.deepEqual(card.children.slice(1,3).map(n=>n.textContent),['완료한 프로젝트','2026.11.04 완료']);
  card.children[0].children[0].onclick();
  assert.equal(b.roots.trophyPicker.open,true);
  assert.equal(b.roots.trophyChoices.children.length,2);
  await b.roots.trophyChoices.children[1].onclick();
  assert.equal(b.roots.trophyPicker.open,false);
  assert.deepEqual(b.requests.at(-1).payload,{projectId:'p1',styleId:16});
  b.roots.trophyClose.onclick();
  assert.equal(b.roots.trophyShelf.open,false);
});

test('cloud completion, dates, purchase and reset use server state without local wallet writes',async()=>{
  const b=await boot();assert.equal(b.roots.cloudAccount.textContent,'alice · 공용 계정');assert.equal(b.roots.walletBalance.textContent,'1,500 P');
  const task=b.get('t-a');task.checked=true;await task.onchange();
  assert.equal(b.roots.percent.textContent,'100');assert.equal(b.roots.walletBalance.textContent,'1,510 P');assert.equal(b.roots.celebration.open,true);
  assert.deepEqual(b.requests.find(r=>r.path.endsWith('/tasks')).payload,{taskId:'a',done:true});
  b.roots.scheduleTask.value='a';b.roots.scheduleDate.value='2028-02-29';await b.roots.scheduleForm.onsubmit({preventDefault(){}});
  assert.equal(b.get('task-date-a').textContent,'2028-02-29');
  await b.get('buy-pink').onclick();assert.equal(b.roots.walletBalance.textContent,'1,410 P');assert.equal(b.doc.documentElement.style['--lime'],'#ff7de9');
  assert.deepEqual(b.requests.find(r=>r.path==='/api/themes/purchase').payload,{themeId:'pink'});
  await b.roots.reset.onclick();assert.equal(b.roots.percent.textContent,'0');assert.equal(b.roots.walletBalance.textContent,'1,410 P');assert.equal(b.get('task-date-a').textContent,'2028-02-29');
  assert.deepEqual(b.storage,{});assert(b.requests.every(r=>r.options.credentials==='same-origin'));
});
test('failed cloud write reverts the checkbox and never claims completion or reward',async()=>{
  const b=await boot({failTask:true});const task=b.get('t-a');task.checked=true;await task.onchange();
  assert.equal(b.get('t-a').checked,false);assert.equal(b.roots.percent.textContent,'50');assert.equal(b.roots.walletBalance.textContent,'1,500 P');assert.equal(b.roots.celebration.open,false);assert.match(b.roots.cloudStatus.textContent,/저장 실패/);assert.deepEqual(b.storage,{});
});

test('task title opens details without checking completion and the close button dismisses it',async()=>{
  const b=await boot();b.get('detail-a').onclick();assert.equal(b.roots.taskDetail.open,true);assert.equal(b.get('t-a').checked,false);assert.match(b.roots.detailText.textContent,/완료 기준/);b.roots.detailClose.onclick();assert.equal(b.roots.taskDetail.open,false);
  const cb=b.get('t-a');cb.checked=true;await cb.onchange();assert.match(b.get('task-date-a').textContent,/^\d{4}-\d{2}-\d{2}$/);
});

test('anonymous visitors get login guidance and cannot purchase themes',async()=>{
  const b=await boot({anonymous:true});assert.equal(b.roots.cloudLogin.hidden,false);assert.equal(b.roots.cloudControls.hidden,true);assert.equal(b.get('buy-pink').disabled,true);assert.equal(b.roots.walletBalance.textContent,'로그인');
});

test('skill JSON import registers the original payload and navigates to its hosted project',async()=>{
  const b=await boot();b.roots.cloudImportFile.files=[{name:'progress.json',size:500,text:async()=>JSON.stringify(project)}];
  await b.roots.cloudImportFile.onchange();
  const registration=b.requests.find(r=>r.path==='/api/projects'&&r.options.method==='POST');
  assert.deepEqual(registration.payload,project);assert.equal(b.location.href,'/?project=p1');assert.deepEqual(b.storage,{});
});

test('opening the app as a file redirects to the shared site before accessing data or APIs',async()=>{
  let destination;
  await vm.runInNewContext(code,{location:{protocol:'file:',replace(url){destination=url;}},fetch(){throw new Error('Must not call a file API');},document:{getElementById(){throw new Error('Must not initialize a local app');}}});
  assert.equal(destination,'https://sensior-progress-tracker.pages.dev');
});
