'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'.research/wp-walk-world-effects');
const copy=path.join(out,'strike-test-copy/EarthSimulator');
const names=['walkstrike.js','civ.js','walkgen.js','walk.js','walkact.js'];
const sources={};fs.mkdirSync(copy,{recursive:true});
const manifest=names.map(name=>{
  const relative=`EarthSimulator/${name}`,p=path.join(copy,name);
  fs.copyFileSync(path.join(root,relative),p);const raw=fs.readFileSync(p);sources[name]=raw.toString('utf8');
  return {path:relative,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};
});
const script=new vm.Script(sources['walkstrike.js'],{filename:'copied-walkstrike.js'});
const globalExplosion=sources['civ.js'].split(/\r?\n/).slice(1573,1626).join('\n');
assert(globalExplosion.startsWith('function applyExplosion(')&&globalExplosion.endsWith('}'));
const explosionScript=new vm.Script(globalExplosion,{filename:'copied-civ-applyExplosion.js'});
const plain=v=>JSON.parse(JSON.stringify(v));
const noop=()=>{};
function fixture(){
  const calls=[],st={id:0,uid:10,name:'Fixture',era:6,alive:true,cells:new Set([480]),casualties:0,inventions:['radar','electric']};
  const W={simTick:20,nukeWinter:0};
  for(const k of ['pop','urban','industry','veg','fallout','pollution','unrest','ruin','tempPulse','capDirty'])W[k]=Array(961).fill(k==='pop'?1000:['urban','industry','veg'].includes(k)?1:0);
  W.isWater=Array(961).fill(false);
  const WK={time:20,pl:{cell:480,x:6200,y:0,z:6200,yaw:0,hp:100,dead:false,shake:0,vx:0,vy:0,vz:0,onGround:true},
    tier:Array(961).fill(0),fac:Array(961).fill(0),plans:new Map(),wx:{},ui:{},scene:{}};
  const c={W,WK,st,calls,network:false,cover:false,ground:0,water:-100,GRID:{W:31,H:31,N:961},WALK:{CELL:400},
    WK_T:{WILD:0,RURAL:1,VILLAGE:2,OUTER:3,INNER:4,CITY:5},WA:{npcs:[],soldiers:[],animals:[],machines:[],vehs:[]},
    WK_MARKS:[],states:[st],missiles:[],battles:[],explosions:[],performance:{now:()=>1234},
    clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),clamp01:x=>Math.max(0,Math.min(1,x)),lerp:(a,b,t)=>a+(b-a)*t,
    T:(ru,en)=>en,TF:(ru,en,...v)=>en.replace(/\{(\d+)\}/g,(_,i)=>v[i]),tLower:s=>s.toLowerCase(),
    wkStateOf:()=>st,stateOf:()=>st,wkInv:(s,k)=>s.inventions.includes(k),wkPlaceName:i=>'Place '+i,
    wkCityNear:()=>480,wkFmtDist:x=>String(x),wkViewF:()=>[0,-1],wkTerrainY:()=>c.ground,wkWaterAt:()=>c.water,
    wkCellAt:(x,z)=>Math.floor(z/400)*31+Math.floor(x/400),netLive:()=>c.network,
    inB:(x,y)=>x>=0&&y>=0&&x<31&&y<31,idx:(x,y)=>y*31+x,warOf:()=>null,
    pushBattle:(cell,owner,victim,type,life,extra)=>c.battles.push({x:cell%31,y:Math.floor(cell/31),type,life,startTick:W.simTick,...extra}),
    markDirty:()=>calls.push(['dirty']),logEvent:noop,
    wkMsg:noop,wkSfx:noop,waPart:noop,waPuff:noop,waFxBeam:noop,wkActNoise:noop,
    wkHurt:(dmg,kind)=>calls.push(['hurt',dmg,kind]),waDamage:(a,dmg)=>{a.hp=(a.hp??100)-dmg;calls.push(['actor',dmg]);},
    waVehDamage:(v,dmg)=>{v.hp-=dmg;calls.push(['vehicle',dmg]);},waMachineKill:m=>{m.dead=true;calls.push(['machine']);},
    waFlee:n=>{n.state='flee';calls.push(['flee',n.kind]);},
    waBlastDmg:(...args)=>calls.push(['blast',...args.slice(0,5)]),wkBlastWorld:(...args)=>calls.push(['building',...args.slice(0,5)]),
    wkRayCols:()=>c.cover?5:-1,waOccK:()=>1,
    waHookFail:(k,e)=>calls.push(['error',k,e.message]),
    waOn:noop,console:{error:noop},
  };
  c.window=c;WK.tier[480]=c.WK_T.CITY;vm.createContext(c);explosionScript.runInContext(c);script.runInContext(c);
  const run=code=>vm.runInContext(code,c,{timeout:3000});
  // These two functions only construct renderer/DOM objects. No damage or state transition is replaced.
  run(`skCloudMake=()=>null;skFlash=()=>{};
    const makeMissile=(extra={})=>({ti:480,nuke:false,owner:null,prog:.3,speed:.1,x0:1,y0:1,x1:15.5,y1:15.5,...extra});
    const makeNuke=()=>skNukeNew(480,null);
    calls.length=0;`);
  return run;
}
const declarations=plain(fixture()(`({settings:WALK,missileLooks:SK_LOOK,interceptorLook:SK_ICL,calmStates:Object.keys(SK_CALM),hooks:WK_MARKS.length})`));
const results=[];
function check(group,label,code,expected){
  const id=`WK${String(results.length+1).padStart(2,'0')}-${group}`;
  try{assert.deepEqual(plain(fixture()(`{${code}}`)),expected);results.push({id,label,status:'passed'});}
  catch(e){results.push({id,label,status:'failed',error:e.message});console.error(`${id} ${label}\n${e.stack}`);}
}
check('strike_capture','Single player removes nearby missile and holds the original object',
  `const m=makeMissile();missiles.push(m);skScan();[missiles.length,SK.held.has(m),SK.raids[0].m===m,SK.raids[0].shots.filter(s=>s.main).length];`,[0,true,true,1]);
check('strike_capture','Network keeps real missile and displays a separate copy once',
  `network=true;const m=makeMissile();missiles.push(m);skScan();skScan();[missiles.length,SK.raids.length,SK.raids[0].m!==m,SK.held.has(m),SK.held.size];`,[1,1,true,false,1]);
check('strike_capture','Ordinary capture radius includes six cells',
  `missiles.push(makeMissile({ti:486}),makeMissile({ti:487}));skScan();[SK.raids.map(r=>r.ti),missiles.map(m=>m.ti)];`,[[486],[487]]);
check('strike_capture','Nuclear capture radius includes fourteen cells',
  `missiles.push(makeMissile({ti:494,nuke:true}),makeMissile({ti:495,nuke:true}));skScan();[SK.nukes.map(n=>n.ti),missiles.map(m=>m.ti)];`,[[494],[495]]);
check('strike_capture','Ordinary raids have a five-entry capture cap',
  `for(let i=0;i<6;i++)missiles.push(makeMissile());skScan();[SK.raids.length,missiles.length];`,[5,1]);
check('strike_capture','Pending nuclear strikes have a two-entry cap',
  `for(let i=0;i<3;i++)missiles.push(makeMissile({nuke:true}));skScan();[SK.nukes.length,missiles.length];`,[2,1]);
check('strike_capture','Invalid target missile is left outside local processing',
  `missiles.push(makeMissile({ti:-1}));skScan();[missiles.length,SK.held.size,SK.raids.length];`,[1,0,0]);
check('strike_capture','Return preserves progress and prevents duplicate insertion',
  `const m=makeMissile();SK.held.add(m);skReturn(m);skReturn(m);[missiles.length,missiles[0].prog,SK.held.size];`,[1,.3,0]);
check('strike_capture','Exit returns an undetonated real missile',
  `const m=makeMissile();missiles.push(m);skScan();skReset();[missiles.length,missiles[0]===m,SK.held.size,SK.raids.length];`,[1,true,0,0]);
check('strike_capture','Network exit does not add local copies to the world list',
  `network=true;const m=makeMissile();missiles.push(m);skScan();skReset();[missiles.length,missiles[0]===m,SK.held.size];`,[1,true,0]);
check('strike_capture','Arrival far away returns an unspent ordinary missile',
  `const m=makeMissile();missiles.push(m);skScan();WK.pl.cell=0;skArrive();[missiles[0]===m,SK.raids.length,SK.held.size];`,[true,0,0]);

check('strike_alarm','Electric settlement uses siren and an earlier state uses bells',
  `const a=skAlarmAt(480,st);st.inventions=[];st.era=2;const b=skAlarmAt(480,st);WK.tier.fill(0);[a,b,skAlarmAt(480,st)];`,['raid','bell','']);
check('strike_alarm','Modern air defence requires settlement or nearby facility',
  `WK.tier.fill(0);const a=skGuarded(480,st);WK.fac[481]=1;const b=skGuarded(480,st);st.era=5;[a,b,skGuarded(480,st)];`,[false,true,false]);
check('strike_alarm','Radar discovery enables warning before modern era',
  `st.era=3;const a=skWarned(st);st.inventions=[];[a,skWarned(st)];`,[true,false]);
check('strike_alarm','Nuclear warning has forty seconds or four seconds without warning',
  `const a=makeNuke();st.era=3;st.inventions=[];const b=makeNuke();[a.tDet,b.tDet];`,[40,4]);
check('strike_alarm','Replay raid has no main world missile',
  `const r=skRaidNew(480,null,{extra:true});[r.mapDone,r.extra,r.shots.length>=2&&r.shots.length<=3,r.shots.some(s=>s.main)];`,[true,true,true,false]);
check('strike_alarm','Main salvo projectile never receives an interception plan',
  `const r=skRaidNew(480,makeMissile());[r.icp,r.shots[0].main,r.shots[0].ic];`,[.4,true,null]);
check('strike_alarm','Hard panic includes a guard but still excludes soldiers and hostile actors',
  `WA.npcs=[{kind:'guard',state:'stand',x:6200,z:6200},{kind:'soldier',state:'stand',x:6200,z:6200},{kind:'civ',hostile:true,state:'stand',x:6200,z:6200}];
   skPanic(6200,6200,100,true);WA.npcs.map(n=>n.state);`,['flee','stand','stand']);

check('strike_map','Main ordinary impact applies real global damage once through raid flag',
  `const m=makeMissile(),r={m,mapDone:false,firstHit:-1,t:5,local:false};SK.held.add(m);water=10;
   skImpact(r,{main:true},9000,10,9000);skImpact(r,{main:true},9000,10,9000);[W.pop[480],explosions.length,SK.held.size,r.mapDone];`,[450,1,0,true]);
check('strike_map','Secondary impact only calls local damage',
  `water=10;const r={m:makeMissile(),mapDone:false,firstHit:-1,t:5,local:false};skImpact(r,{main:false},9000,10,9000);
   [W.pop[480],explosions.length,calls.filter(c=>c[0]==='blast').length];`,[1000,0,1]);
check('strike_map','Network local main impact cannot apply world explosion',
  `network=true;water=10;const m=makeMissile(),r={m,mapDone:false,firstHit:-1,t:5,local:false};SK.held.add(m);skImpact(r,{main:true},9000,10,9000);
   [W.pop[480],explosions.length,SK.held.size,r.mapDone];`,[1000,0,0,true]);
check('strike_map','Ordinary world blast leaves 45 percent population at center and 75.25 percent at neighbor',
  `applyExplosion(480,false,null);[W.pop[480],W.pop[481],W.ruin[480],W.urban[480],battles[0].life];`,[450,752.5,.45,.5,10]);
check('strike_map','Ordinary world impact into water leaves land population unchanged',
  `W.isWater[480]=true;applyExplosion(480,false,null);[W.pop[480],W.pop[481],battles.length];`,[1000,1000,0]);
check('strike_map','Nuclear world explosion writes fallout ruin and winter',
  `applyExplosion(480,true,null);[W.pop[480],W.fallout[480],W.ruin[480],W.nukeWinter,battles[0].life];`,[20,1,1,1.2,16]);
check('strike_map','Nuclear state transition calls the world explosion once',
  `const m=makeMissile({nuke:true});SK.held.add(m);const n=skNukeNew(480,m);n.tDet=.1;
   skNukeStep(n,.2);skNukeStep(n,.2);[W.pop[480],explosions.length,SK.held.size,n.det];`,[20,1,0,true]);
check('strike_map','Detonated missile is not returned by reset',
  `const m=makeMissile({nuke:true});SK.held.add(m);const n=skNukeNew(480,m);n.tDet=.1;skNukeStep(n,.2);skReset();[missiles.length,SK.held.size,explosions.length];`,[0,0,1]);
check('strike_map','Fresh nuclear mark reconstruction skips shock damage and map mutation',
  `const n=skNukeNew(480,null,{after:true,ts:120});skNukeStep(n,1);[n.noShock,n.plHit,n.det,explosions.length,calls.filter(c=>c[0]==='hurt').length];`,[true,true,true,0,0]);
check('strike_map','Mark heuristic distinguishes remaining life and fallout',
  `[skMarkNuke({life:10,startTick:20},480),skMarkNuke({life:16,startTick:20},480),(()=>{W.fallout[480]=.6;return skMarkNuke({life:1,startTick:20},480);})()];`,[false,true,true]);
check('strike_map','Repeated arrival does not replay the same missile mark',
  `water=10;battles.push({type:'missile',x:15,y:15,life:10,startTick:20});skDecal=()=>{};skMarksArrive();skMarksArrive();[SK.raids.length,explosions.length];`,[1,0]);
check('strike_map','Low level apply helper relies on caller guards and is not itself idempotent',
  `const m=makeMissile();skMapApply(m);skMapApply(m);[Math.round(W.pop[480]*10)/10,explosions.length];`,[202.5,2]);
check('strike_map','Failed world apply consumes held missile and reports error without retry',
  `water=10;applyExplosion=()=>{throw new Error('fixture failure');};const m=makeMissile(),r={m,mapDone:false,firstHit:-1,t:5,local:false};
   SK.held.add(m);skImpact(r,{main:true},9000,10,9000);skImpact(r,{main:true},9000,10,9000);
   [r.mapDone,SK.held.size,explosions.length,calls.filter(c=>c[0]==='error').length];`,[true,0,0,1]);
check('strike_map','Fault in local raid step forces world impact and removes local raid',
  `const m=makeMissile();SK.held.add(m);skRaidNew(480,m);skRaidStep=()=>{throw new Error('step fault');};
   skUpdate(.1);skUpdate(.1);[W.pop[480],explosions.length,SK.held.size,SK.raids.length,missiles.length];`,[450,1,0,0,0]);
check('strike_map','Fault in undetonated local nuclear step forces world impact',
  `const m=makeMissile({nuke:true});SK.held.add(m);skNukeNew(480,m);skNukeStep=()=>{throw new Error('step fault');};
   skUpdate(.1);skUpdate(.1);[W.pop[480],explosions.length,SK.held.size,SK.nukes.length,missiles.length];`,[20,1,0,0,0]);

check('strike_damage','Nuclear damage boundaries and interpolation are explicit',
  `[229,230,479,480,1050,2100].map(skNukeHurt);`,[999,220,220,220,60,0]);
check('strike_damage','Wall cover reduces blast damage to forty percent',
  `const n=makeNuke();WK.pl.x+=480;cover=true;skShockPlayer(n,480);calls.filter(c=>c[0]==='hurt');`,[['hurt',88,'blast']]);
check('strike_damage','Uncovered nuclear shock at first boundary deals 220',
  `const n=makeNuke();WK.pl.x+=480;skShockPlayer(n,480);calls.filter(c=>c[0]==='hurt');`,[['hurt',220,'blast']]);
check('strike_damage','Inner fireball schedules delayed fire death',
  `const n=makeNuke();n.tDet=0;skNukeStep(n,.1);skNukeStep(n,.9);calls.filter(c=>c[0]==='hurt');`,[['hurt',9999,'fire']]);
check('strike_damage','Each actor receives the wave once across repeated rings',
  `const n=makeNuke();const a={x:6680,z:6200,hp:1000};WA.npcs.push(a);skShockActors(n,500);skShockActors(n,600);[a.hp,calls.filter(c=>c[0]==='actor').length];`,[714,1]);
check('strike_damage','Nearby vehicle receives five times the shock actor base once',
  `const n=makeNuke();const v={x:6680,z:6200,hp:2000,pl:true};WA.vehs.push(v);skShockActors(n,500);skShockActors(n,600);[v.hp,calls.filter(c=>c[0]==='vehicle').length];`,[900,1]);
check('strike_damage','Far lethal vehicle is quietly marked wreck',
  `const n=makeNuke();const v={x:6680,z:6200,hp:100};WA.vehs.push(v);skShockActors(n,500);[v.hp,!!v.wreck,calls.filter(c=>c[0]==='vehicle').length];`,[0,true,0]);
check('strike_damage','Rail vehicles and road control blocks skip vehicle wave path',
  `const n=makeNuke();WA.vehs=[{x:6200,z:6200,hp:100,tr:true},{x:6200,z:6200,hp:100,rblock:true}];skShockActors(n,500);WA.vehs.map(v=>v.hp);`,[100,100]);
check('strike_damage','Fire removes expired entries',
  `skFireAdd(6200,0,6200,2,.1);skFiresStep(.2);SK.fires.length;`,0);
check('strike_damage','Standing fire accrues six damage after emission accumulation',
  `skFireAdd(6200,0,6200,2,100);for(let i=0;i<8;i++)skFiresStep(.1);calls.filter(c=>c[0]==='hurt');`,[['hurt',6,'fire']]);
check('strike_damage','Vehicle occupant skips local standing-fire hurt path',
  `WK.pl.veh={};skFireAdd(6200,0,6200,2,100);for(let i=0;i<10;i++)skFiresStep(.1);calls.filter(c=>c[0]==='hurt');`,[]);
check('strike_damage','Fire pool stays within fourteen entries',
  `for(let i=0;i<20;i++)skFireAdd(6200+i,0,6200,2,100);SK.fires.length;`,14);
check('strike_damage','Fallout respawn candidate excludes water radiation and empty cells',
  `WK.tier.fill(0);WK.tier[484]=WK_T.VILLAGE;WK.tier[476]=WK_T.VILLAGE;W.fallout[484]=.1;[skSafeCell(480,480),(()=>{W.isWater[476]=true;return skSafeCell(480,480);})()];`,[476,-1]);
check('strike_damage','Nuclear death changes respawn cell to safe settlement',
  `WK.tier.fill(0);WK.tier[484]=WK_T.VILLAGE;const n=makeNuke();n.det=true;[skDeath('rad'),WK.pl.cell];`,[false,484]);
check('strike_damage','Ash holds before gradual decay',
  `SK.wx.ash=.5;SK.wx.hold=1;skWxStep(.5);const a=SK.wx.ash;skWxStep(1);skWxStep(24);[a,Math.round(SK.wx.ash*1000)];`,[.5,415]);

const passed=results.filter(x=>x.status==='passed').length;
const report={work_package_id:'WP-WALK-WORLD-EFFECTS',runtime_verified:false,sources:manifest,
  environment:{node:process.version,kind:'full copied walkstrike.js plus exact civ.js applyExplosion in fresh VM; synthetic world and actors; renderer cloud and DOM flash constructors replaced'},
  declarations,passed,failed:results.length-passed,results};
fs.writeFileSync(path.join(out,'strike-probe.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Strike: ${passed}/${results.length} isolated checks passed.`);process.exitCode=report.failed?1:0;
