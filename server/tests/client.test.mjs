import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const code=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>!m[1].includes('application/json'))[2];
const project={project:'UI test',phases:[{title:'개발',tasks:[{id:'a',text:'업무 A',details:'목적: 사용자 요청 처리\n순서: 입력 검증 후 처리\n완료 기준: 성공·실패 확인'},{id:'b',text:'업무 B',done:true}]}]};
async function boot({failTask=false,failTheme=false,anonymous=false,stickerPacks=[],savedWallet,stickers=[],layout}={}) {
  let doc;
  class Element {
    constructor(){this.children=[];this.attrs={};this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.value='';this.events={};this.open=false;this.disabled=false;this._text='';}
    set textContent(value){this._text=String(value);}get textContent(){return this._text;}
    appendChild(e){this.children.push(e);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attrs[k]=v;}
    focus(){doc.activeElement=this;}scrollIntoView(){}addEventListener(k,v){this.events[k]=v;}
    showModal(){this.open=true;}close(){this.open=false;this.events.close?.();}
  }
  const roots={},requests=[],storage={},windowEvents={};
  for(const m of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)){assert(!roots[m[2]],'duplicate ID');roots[m[2]]=new Element;roots[m[2]].id=m[2];}
  if(layout)for(const [id,node] of Object.entries(roots))node.getBoundingClientRect=()=>layout(id);
  roots.data.textContent=JSON.stringify(project);
  roots.trophyIcon.content={cloneNode:()=>Object.assign(new Element,{querySelector:()=>new Element})};
  const filters=['all','pending','done'].map(f=>{const e=new Element;e.dataset.filter=f;return e;});
  function nodes(){const out=[];function walk(e){out.push(e);e.children.forEach(walk);}Object.values(roots).forEach(walk);return out;}
  doc={documentElement:new Element,activeElement:null,createElement:()=>new Element,getElementById:id=>nodes().find(e=>e.id===id),querySelectorAll:()=>filters,querySelector:()=>filters.find(e=>e.attrs['aria-pressed']==='true')};
  let wallet=savedWallet || {version:1,balance:1500,owned:[],activeTheme:'lime'};
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
    else if(path==='/api/sticker-packs')result=stickerPacks;
    else if(path==='/api/projects/p1/stickers')result=options.method==='POST'?{id:'s1',...payload}:options.method==='PATCH'?{ok:true}:stickers;
    else if(path==='/api/projects/p1/tasks') {
      if(failTask)return {ok:false,json:async()=>({error:'테스트 저장 실패'})};
      wallet={...wallet,balance:1510};result={wallet,reward:payload.done?10:0,date:'2026-11-04'};
    }
    else if(path==='/api/themes/purchase'){
      if(failTheme)return {ok:false,json:async()=>({error:'테스트 구매 실패'})};
      const free=payload.themeId==='lime'||wallet.owned.includes(payload.themeId);
      wallet={...wallet,balance:wallet.balance-(free?0:100),owned:free?wallet.owned:[...wallet.owned,payload.themeId],activeTheme:payload.themeId};result=wallet;
    }
    else if(path==='/api/projects/p1/reset')result={ok:true};
    else throw new Error('Unexpected request: '+path);
    return {ok:true,json:async()=>result};
  }
  const contextLocation={href:'https://tracker.example/?project=p1'};
  await vm.runInNewContext(code,{document:doc,location:contextLocation,URL,fetch,window:{addEventListener(name,fn){windowEvents[name]=fn;},matchMedia:()=>({matches:true})},navigator:{},localStorage:{getItem(){throw new Error('Browser storage must not be used');},setItem(){throw new Error('Browser storage must not be used');}},confirm:()=>true,setTimeout:()=>1,clearTimeout(){}});
  return {roots,get:id=>doc.getElementById(id),doc,requests,storage,location:contextLocation,windowEvents};
}

test('sticker placement reopens the last used pack and dragging saves the drop point',async()=>{
  const {roots,requests}=await boot({stickerPacks:['basic','weather']});
  const canvas=roots.projectCanvas;
  canvas.closest=()=>null;
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:1000,height:1000});
  assert.equal(roots.stickerEditToggle.hidden,false);
  roots.stickerEditToggle.onclick();
  assert.equal(roots.stickerSurface.hidden,false);
  assert.equal(roots.stickerLayer.inert,false);
  roots.stickerSurface.onclick({clientX:100,clientY:200});
  await roots.stickerAttach.onclick();
  assert.equal(roots.stickerOptions.children.length,2);
  roots.stickerOptions.children[0].onclick();
  await roots.stickerOptions.children[0].onclick();
  const sticker=roots.stickerLayer.children[0];
  sticker.onclick({stopPropagation(){}});
  sticker.getBoundingClientRect=()=>({left:80,top:180,width:40,height:40});
  sticker.setPointerCapture=()=>{};
  sticker.onpointerdown({isPrimary:true,button:0,pointerId:1,clientX:100,clientY:200});
  sticker.onpointermove({pointerId:1,clientX:40,clientY:300});
  await sticker.onpointerup({pointerId:1,clientX:40,clientY:300});
  assert.deepEqual(requests.at(-1).payload,{moveId:'s1',x:0.04,y:0.3});
  sticker.onpointerdown({isPrimary:true,button:0,pointerId:2,clientX:120,clientY:220,target:sticker.children[4]});
  sticker.onpointermove({pointerId:2,clientX:140,clientY:240});
  await sticker.onpointerup({pointerId:2,clientX:140,clientY:240});
  assert.deepEqual(requests.at(-1).payload,{resizeId:'s1',scale:2});
  sticker.onpointerdown({isPrimary:true,button:0,pointerId:3,clientX:100,clientY:200});
  sticker.onpointermove({pointerId:3,clientX:140,clientY:240});
  assert.equal(sticker.style['--sticker-scale'],2);
  await sticker.onpointerup({pointerId:3,clientX:140,clientY:240});
  assert.equal(sticker.style['--sticker-scale'],2);
  roots.stickerSurface.onclick({clientX:200,clientY:200});
  await roots.stickerAttach.onclick();
  assert.equal(roots.stickerOptions.children.length,20);
  assert.equal(roots.stickerEditorTitle.textContent,'기본 스티커팩');
  roots.stickerEditorClose.onclick();
  roots.stickerEditToggle.onclick();
  assert.equal(roots.stickerLayer.inert,true);
  assert.equal(roots.stickerSurface.hidden,true);
  assert.equal(roots.stickerAttach.hidden,true);
});

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
  await b.get('buy-receipt').onclick();assert.equal(b.roots.walletBalance.textContent,'1,410 P');assert.equal(b.doc.documentElement.style['--lime'],'#d0392b');
  assert.deepEqual(b.requests.find(r=>r.path==='/api/themes/purchase').payload,{themeId:'receipt'});
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
  const b=await boot({anonymous:true});assert.equal(b.roots.cloudLogin.hidden,false);assert.equal(b.roots.cloudControls.hidden,true);assert.equal(b.get('buy-receipt').disabled,true);assert.equal(b.roots.walletBalance.textContent,'로그인');
});

for(const themeId of ['retro','blueprint','receipt'])test(themeId+' preview restores the saved theme on close and purchase persists across reopen',async()=>{
  const b=await boot();
  const originalRequests=b.requests.length;
  b.get('preview-'+themeId).onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,themeId);
  assert.equal(b.requests.length,originalRequests);
  b.roots.shopClose.onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,'lime');
  await b.get('buy-'+themeId).onclick();
  assert.deepEqual(b.requests.at(-1).payload,{themeId:themeId});
  assert.equal(b.doc.documentElement.dataset.appearance,themeId);
  assert.equal(b.roots.walletBalance.textContent,'1,400 P');
  b.get('preview-chalkboard').onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,'chalkboard');
  b.roots.shopClose.onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,themeId);
  b.roots.theme.onclick();
  assert.equal(b.doc.documentElement.dataset.theme,'dark');
  assert.equal(b.doc.documentElement.dataset.appearance,themeId);
  await b.roots.defaultTheme.onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,'lime');
  await b.get('buy-'+themeId).onclick();
  assert.equal(b.roots.walletBalance.textContent,'1,400 P');
  const reloaded=await boot({savedWallet:{version:1,balance:1400,owned:[themeId],activeTheme:themeId}});
  assert.equal(reloaded.doc.documentElement.dataset.appearance,themeId);
});

for(const themeId of ['retro','blueprint','receipt'])test('failed '+themeId+' purchase retains the saved theme and wallet',async()=>{
  const b=await boot({failTheme:true});
  await b.get('buy-'+themeId).onclick();
  assert.equal(b.doc.documentElement.dataset.appearance,'lime');
  assert.equal(b.roots.walletBalance.textContent,'1,500 P');
  assert.match(b.roots.shopStatus.textContent,/구매 실패/);
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

test('anchored stickers follow their card when viewport reflows without writing coordinates',async()=>{
 let card={left:100,top:200,width:300,height:200};
 const b=await boot({stickers:[{id:'s1',packId:'basic',sticker:0,x:.2,y:.2,canvas:'page',anchor:{target:'sticker-progress',u:.5,v:.1}}],layout:id=>id==='projectCanvas'?{left:0,top:0,width:1200,height:2000}:id==='sticker-progress'?card:{left:0,top:0,width:0,height:0}});
 await new Promise(resolve=>setImmediate(resolve));
 const sticker=b.roots.stickerLayer.children[0];
 assert.equal(sticker.style.left,'250px');assert.equal(sticker.style.top,'220px');
 const count=b.requests.length;
 card={left:20,top:400,width:350,height:220};b.windowEvents.resize();
 assert.equal(sticker.style.left,'195px');assert.equal(sticker.style.top,'420px');
 assert.equal(b.requests.length,count);
});

test('fixed right-edge offsets survive narrowing, clamping, widening and reload',async()=>{
 let pageWidth=1200,card={left:700,top:200,width:400,height:200};
 const anchor={version:2,target:'sticker-progress',edgeX:1,edgeY:0,dx:-20,dy:12};
 const saved={id:'s1',packId:'basic',sticker:0,x:.9,y:.1,canvas:'page',anchor};
 const layout=id=>id==='projectCanvas'?{left:0,top:0,width:pageWidth,height:2000}:id==='sticker-progress'?card:{left:0,top:0,width:0,height:0};
 const b=await boot({stickers:[saved],layout});await new Promise(r=>setImmediate(r));
 const node=b.roots.stickerLayer.children[0];const requests=b.requests.length;
 assert.equal(node.style.left,'1080px');assert.equal(node.style.top,'212px');
 pageWidth=390;card={left:20,top:400,width:350,height:230};b.windowEvents.resize();
 assert.equal(node.style.left,'350px');assert.equal(node.style.top,'412px');
 pageWidth=100;card={left:0,top:400,width:100,height:230};b.windowEvents.resize();
 assert.equal(node.style.left,'72px');
 pageWidth=1200;card={left:700,top:200,width:400,height:200};b.windowEvents.resize();
 assert.equal(node.style.left,'1080px');assert.equal(b.requests.length,requests);assert.equal(anchor.dx,-20);
 const reloaded=await boot({stickers:[saved],layout});await new Promise(r=>setImmediate(r));
 assert.equal(reloaded.roots.stickerLayer.children[0].style.left,'1080px');
});

test('legacy hero sticker upgrades once to the title text edge',async()=>{
 let width=1000,titleWidth=200;
 const layout=id=>id==='projectCanvas'?{left:0,top:0,width:width,height:2000}:id==='sticker-hero'?{left:0,top:100,width:width,height:100}:id==='title'?{left:0,top:120,width:titleWidth,height:40}:{left:0,top:0,width:0,height:0};
 const b=await boot({stickers:[{id:'s1',packId:'basic',sticker:0,x:.23,y:.075,canvas:'page',anchor:{target:'sticker-hero',u:.23,v:.5}}],layout});
 await new Promise(r=>setImmediate(r));
 const saved=b.requests.find(r=>r.path.endsWith('/stickers')&&r.options.method==='PATCH');
 assert.deepEqual(saved.payload.anchor,{version:2,target:'sticker-title',edgeX:1,edgeY:1,dx:30,dy:-10});
 width=500;titleWidth=180;b.windowEvents.resize();
 assert.equal(b.roots.stickerLayer.children[0].style.left,'210px');
 assert.equal(b.requests.filter(r=>r.path.endsWith('/stickers')&&r.options.method==='PATCH').length,1);
});
