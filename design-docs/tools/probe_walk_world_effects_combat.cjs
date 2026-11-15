'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'.research/wp-walk-world-effects');
const copy=path.join(out,'combat-test-copy/EarthSimulator');fs.mkdirSync(copy,{recursive:true});
const files=['walkact.js','walkeco.js','walkmil.js','walkair.js','walksea.js','walkgen.js','civ.js','netwalk.js'];
const sources={},manifest=files.map(file=>{const relative=`EarthSimulator/${file}`,target=path.join(copy,file);fs.copyFileSync(path.join(root,relative),target);const b=fs.readFileSync(target);sources[file]=b.toString('utf8');return {path:relative,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};});
const selected=[];
function range(file,start,end){const lines=sources[file].split(/\r?\n/);selected.push({file,start,end});return lines.slice(start-1,end).join('\n');}
function fn(file,name){const lines=sources[file].split(/\r?\n/),a=lines.findIndex(s=>s.startsWith(`function ${name}(`));assert(a>=0,name);let b=a;if(!lines[a].trimEnd().endsWith('}')){b=lines.findIndex((s,i)=>i>a&&s==='}');assert(b>a,name);}return range(file,a+1,b+1);}
function constant(file,name){const lines=sources[file].split(/\r?\n/),a=lines.findIndex(s=>s.startsWith(`const ${name} =`));assert(a>=0,name);let b=a;if(!lines[a].trimEnd().endsWith('};')){b=lines.findIndex((s,i)=>i>a&&s==='};');assert(b>a,name);}return range(file,a+1,b+1);}
const funcs=['waAmmoKind','waAmmoHas','waAmmoAdd','waAmmoUse','waHas','waGive','waTake','waWpnOk','wkActReload','waTryAttack','waMeleeHit','waBowTick','waBowPull','waDamage','waKillPerson','waOccK','waHurtPlayer','waBlastK','waBlastCover','waBlastDmg','waSideAnger','waBattleSide','waSideFoe','waWarZone','waFightSync','waMachineKill','waVehDamage','waVehHit','waRocketBlow','waMachineType','waSideInv'];
const settingLines=sources['walkact.js'].split(/\r?\n/),settingEnd=settingLines.findIndex((s,i)=>i>15&&s==='});')+1;
const body=[range('walkact.js',16,settingEnd),range('walkact.js',4752,4802),range('walkact.js',5343,5353),
 'let _waBlastRays=0; const _waBT=[0,0,0], _waP3=[0,0,0];',...funcs.map(n=>fn('walkact.js',n)),
 range('walkeco.js',747,747),fn('walkeco.js','ecoHurt'),constant('walkmil.js','MIL_T'),constant('walkair.js','AIR_GUN'),constant('walksea.js','SEA_GUN'),constant('walksea.js','SEA_GUNK')].join('\n');
const script=new vm.Script(body,{filename:'copied-selected-combat-functions.js'});
const plain=v=>JSON.parse(JSON.stringify(v));
function fixture(){
 const calls=[],reserve={},loaded={},WA={mode:'survival',reserve,ammo:loaded,wpns:['fist'],wi:0,cool:0,reload:0,fire:false,projs:[],rockets:[],npcs:[],soldiers:[],animals:[],machines:[],vehs:[],fights:new Map(),fightEnded:new WeakSet(),gone:new Set(),noAmmoT:-99};
 const WK={time:50,detail:0,ui:{},pl:{x:0,y:0,z:0,yaw:0,pitch:0,kick:0,shake:0,crouch:0,vx:0,vz:0,hp:100,dead:false,veh:null,aim:false}};
 const ctx={WALK:{ACT_THRUST_COS:.72,ACT_ROCKET_SELF:1.8},WA,WK,WKP:{arms:{reserve,loaded,owned:[]}},calls,
 W:{isWater:Array(100).fill(false),stateId:Array(100).fill(0)},GRID:{W:10,H:10,N:100},states:[{alive:true,uid:1,pop:1000,casualties:100,exhaust:.1},{alive:true,uid:2,pop:2000,casualties:200,exhaust:.2}],battles:[],
 Math:Object.assign(Object.create(Math),{random:()=>.5}),clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),clamp01:n=>Math.min(1,Math.max(0,n)),
 T:(a,b)=>b,TF:(a,b,...v)=>b.replace(/\{(\d+)\}/g,(_,i)=>v[i]),
 wkSfx:()=>{},wkMsg:()=>{},wkSay:()=>{},wkBanner:()=>{},waPuff:()=>{},waGroundPuff:()=>{},wkUiClose:()=>{},waVmSet:()=>{},wkActNoise:()=>{},waTrace:()=>{},waPart:()=>{},waGunPanic:()=>{},waHitMark:()=>{},
 wkAimOrigin:()=>({x:0,y:1,z:0}),wkRayCols:()=>ctx.wall,wkRayGround:()=>-1,wkTerrainY:()=>1,wall:-1,
 waRayActors:(ox,oy,oz,dx,dy,dz,range)=>ctx.ray?{...ctx.ray}:{a:null,t:range,y:0},
 waBowTip:()=>null,waNoAmmo:()=>calls.push(['empty']),
 waHookRun:(event,...args)=>calls.push(['hook',event]),waHookFail:()=>{},
 wkHurt:(dmg,why)=>calls.push(['hurt',Math.round(dmg*1e6)/1e6,why]),
 waCrime:(lv,x,z)=>calls.push(['crime',lv]),waAngry:a=>{a.hostile=true;},waFlee:()=>{},
 waCrewFresh:()=>false,waCrewFind:()=>-1,waTrainBeastAt:()=>-1,waIsTraffic:()=>false,
 waVehWreck:v=>{v.wreck=50;},waMachineHit:(m,n)=>{m.hp-=n;},
 waRocketLaunch:(x,y,z,dx,dy,dz,w,by)=>calls.push(['rocket',w.pen,by]),
 waBlast:(x,y,z,R,dmg,by,opts)=>calls.push(['blast',R,dmg,opts||null]),
 netLive:()=>ctx.network,network:false,netDoFree:(...args)=>calls.push(['netWorld',...args]),NPC_ID_MIN:()=>10000,
 peopleKill:(...args)=>{calls.push(['peopleKill',...args]);return ctx.peopleOk;},peopleOk:true,
 civShock:(st,kind,k)=>calls.push(['shock',kind,k]),personName:p=>p.name||'Person',stateTitle:st=>st.name||'State',waProf:()=>'',
 nwHitOut:(a,dmg,blast)=>calls.push(['networkHit',dmg,blast]),nwVehDmg:(a,dmg,kind)=>calls.push(['networkVehicle',dmg,kind]),
 wkInv:(st,key)=>!!st.inv?.includes(key),stateByUid:uid=>ctx.states.find(s=>s.uid===uid)||null,atWar:(a,b)=>!!ctx.war,
 walkSimSpeed:()=>ctx.speed,speed:0,waSoldierMake:()=>{},waMachineMake:()=>{},
 WA_GOODS:{vest:{k:'armor',arm:.5},nano:{k:'armor',arm:.66,rad:1}},ecoD:()=>({arm:ctx.armor}),ecoInvN:()=>ctx.armorCount,armor:'vest',armorCount:1,
 };
 vm.createContext(ctx);script.runInContext(ctx,{timeout:3000});
 const run=s=>vm.runInContext(s,ctx,{timeout:3000});
 run(`const equip=k=>{WA.wpns=[k];WA.wi=0;WA.ammo[k]=WA_WPN[k].mag||0;};
 const actor=(opts={})=>({kind:'guard',hp:100,hp0:100,x:0,y:0,z:-1.5,hgt:1.75,r:.3,d:1.5,armor:0,...opts});
 const makeFight=()=>{const b={cas:120,strA:2,strD:1,uA:1,uD:2};const sides=[0,1].map((s)=>({name:'Side '+s,st:states[s],want:10,alive:10,lost:0,byPlayer:0,pool:0,broke:false,hostile:0}));
  const F={x:0,z:0,b,sides,seen:50,over:false,waveT:0,waves:0};WA.fights.set(0,F);return F;};calls.length=0;`);
 return run;
}
const declarations=plain(fixture()(`({weapons:WA_WPN,ammo:WA_AMMO,loadouts:WA_LOADOUT,
 settings:Object.fromEntries(Object.entries(WALK).filter(([k])=>k.startsWith('ACT_'))),armorReasons:ECO_ARM_WHY,
 militaryWeapons:MIL_T,airGun:AIR_GUN,navalGuns:SEA_GUN,navalGunKinds:SEA_GUNK})`));
const results=[];
function check(group,label,code,expected){const id=`WC${String(results.length+1).padStart(2,'0')}-${group}`;try{assert.deepEqual(plain(fixture()(`{${code}}`)),expected);results.push({id,label,status:'passed'});}catch(e){results.push({id,label,status:'failed',error:e.message});console.error(id,label,e.message);}}

check('weapons','Registry includes 24 weapons and eight ammunition kinds',`[Object.keys(WA_WPN).length,Object.keys(WA_AMMO).length,WA_LOADOUT.length];`,[24,8,8]);
check('ammo','Survival use consumes only available reserve',`WKP.arms.reserve.rifle=3;[waAmmoUse('rifle',5),waAmmoHas('rifle'),Object.hasOwn(WKP.arms.reserve,'rifle')];`,[3,0,false]);
check('ammo','Normal mode keeps finite reserve while returning requested rounds',`WA.mode='normal';WKP.arms.reserve.rifle=3;[waAmmoUse('rifle',5),waAmmoHas('rifle')===Infinity,WKP.arms.reserve.rifle];`,[5,true,3]);
check('ammo','Ammo addition caps at 999 and removes empty reserve',`const a=waAmmoAdd('rifle',2000);waAmmoAdd('rifle',-2000);[a,WKP.arms.reserve,waAmmoAdd('missing',3)];`,[999,{},0]);
check('ammo','Weapon acquisition is idempotent while ammo grant may repeat',`const a=waGive('rifle',5),b=waGive('rifle',5);[a,b,WKP.arms.owned,WA.wpns,waAmmoHas('rifle')];`,[true,false,['rifle'],['fist','rifle'],10]);
check('ammo','Taking a survival weapon removes loaded rounds but preserves reserve',`waGive('rifle',5);WA.ammo.rifle=3;waTake('rifle');[WKP.arms.owned,WA.wpns,WA.ammo.rifle??null,waAmmoHas('rifle'),waTake('fist')];`,[[],['fist'],null,5,false]);
check('ammo','Reload requires nonempty reserve and missing magazine rounds',`equip('pistol');WA.ammo.pistol=0;wkActReload();const a=WA.reload;waAmmoAdd('pistol',1);wkActReload();[a,WA.reload];`,[0,1.4]);
check('ammo','Vehicle occupancy blocks personal reload',`equip('pistol');WA.ammo.pistol=0;waAmmoAdd('pistol',1);WK.pl.veh={};wkActReload();WA.reload;`,0);
check('weapons','Discovery gate distinguishes known and missing inventions',`[waWpnOk(WA_WPN.rifle,{inv:[]}),waWpnOk(WA_WPN.rifle,{inv:['machinegun']})];`,[false,true]);
check('attack','Melee wind-up schedules contact at thirty percent of its rate',`equip('spear');waTryAttack();[WA.cool,WA.swing,WA.hitAt,calls];`,[.85,1,50.255,[['hook','fire']]]);
check('attack','Occupied hands cancel attack and held fire',`equip('rifle');WA.meCarry={};WA.fire=true;waTryAttack();[WA.fire,WA.ammo.rifle,WA.cool];`,[false,24,0]);
check('attack','Swimming prevents attack',`equip('rifle');WK.pl.swim=true;waTryAttack();[WA.ammo.rifle,WA.cool,calls];`,[24,0,[]]);
check('attack','Bow starts drawing without consuming its arrow',`equip('bow');waAmmoAdd('arrow',1);WA.fire=true;waTryAttack();[WA.draw,waAmmoHas('arrow'),WA.projs.length];`,[{t:0,key:'bow'},1,0]);
check('attack','Releasing bow before one third waits for the threshold',`equip('bow');waAmmoAdd('arrow',1);WA.draw={key:'bow',t:0};WA.fire=false;waBowTick(.1);const a=WA.projs.length;waBowTick(.1);[a,WA.projs.length,waAmmoHas('arrow'),Math.round(WA.projs[0].dmg*100)];`,[0,1,0,3131]);
check('attack','Crossbow fires directly with full listed damage and gravity',`equip('xbow');waAmmoAdd('bolt',1);waTryAttack();[WA.projs.length,WA.projs[0].dmg,WA.projs[0].grav,waAmmoHas('bolt')];`,[1,62,7,0]);
check('attack','Gun head hit doubles damage above 84 percent actor height',`equip('pistol');const a=actor();ray={a,t:5,y:a.y+a.hgt*.85};waTryAttack();[a.hp,WA.ammo.pistol];`,[40,8]);
check('attack','Earlier wall occludes the hitscan target',`equip('pistol');const a=actor();ray={a,t:5,y:1};wall=3;waTryAttack();[a.hp,WA.ammo.pistol];`,[100,8]);
check('attack','Last loaded round starts reload only with available reserve',`equip('pistol');WA.ammo.pistol=1;waAmmoAdd('pistol',1);waTryAttack();[WA.ammo.pistol,WA.reload];`,[0,1.5499999999999998]);
check('attack','Rocket spends loaded round and resets heavy weapon steadiness',`equip('rpg');WA.steady=1;waTryAttack();[WA.ammo.rpg,WA.steady,calls.find(c=>c[0]==='rocket')];`,[0,0,['rocket',380,'player']]);
check('melee','Forward actor receives melee damage at deterministic midpoint',`equip('club');const a=actor();WA.npcs=[a];waMeleeHit();[a.hp,Math.round(a.z*10)];`,[78,-18]);
check('melee','Actor behind player beyond near-contact allowance is rejected',`equip('spear');const a=actor({z:2});WA.npcs=[a];waMeleeHit();a.hp;`,100);
check('melee','Selected nearby actor is struck before any wall-ray fallback',`equip('club');const a=actor();WA.npcs=[a];wall=.2;waMeleeHit();a.hp;`,78);
check('damage','Actor armor absorbs half ordinary damage but only 17.5 percent blast damage',`const a=actor({armor:.5}),b=actor({armor:.5});waDamage(a,50,null,0);waDamage(b,50,null,2);[a.hp,b.hp];`,[75,58.75]);
check('damage','Visual-only network hit changes no actor health',`const a=actor();waDamage(a,50,'fx',0);[a.hp,calls];`,[100,[]]);
check('damage','Player hit on mirrored actor forwards damage without local subtraction',`const a=actor({nwk:true});waDamage(a,50,'player',2);[a.hp,calls];`,[100,[['networkHit',50,2]]]);
check('damage','Front shield reduces melee but rear shield does not',`equip('swsh');waHurtPlayer(100,'guard','melee',{x:0,z:-5});waHurtPlayer(100,'guard','melee',{x:0,z:5});calls.filter(c=>c[0]==='hurt');`,[['hurt',55,'guard'],['hurt',100,'guard']]);
check('damage','Vehicle protection adjusts absorption by attack type',`WK.pl.veh={V:{armor:.8}};[waOccK('shot'),waOccK('melee'),waOccK('blast')].map(x=>Math.round(x*100));`,[20,5,35]);
check('damage','Equipment armor uses cause weights and nanotechnology halves radiation',`const a=ecoHurt(100,'blast'),b=ecoHurt(100,'fall');armor='nano';[a,b,ecoHurt(100,'rad')];`,[65,100,50]);
check('blast','Blast core full damage and boundary excludes exact radius',`[waBlastK(0,10),waBlastK(4.5,10),Math.round(waBlastK(7.25,10)*100),waBlastK(10,10)];`,[1,1,59,0]);
check('blast','Occlusion ray budget falls back to full exposure after twenty-four rays',`wall=1;const a=waBlastCover(0,0,0,5,0,0);for(let i=0;i<23;i++)waBlastCover(0,0,0,5,0,0);[a,waBlastCover(0,0,0,5,0,0),_waBlastRays];`,[.3,1,24]);
check('blast','Close blast applies 2.6 multiplier to an actor',`const a=actor({x:0,z:0});WA.npcs=[a];waBlastDmg(0,1,0,10,10,null,{noSelf:true});a.hp;`,74);
check('blast','Visual-only blast leaves actors and player untouched',`const a=actor({z:0});WA.npcs=[a];waBlastDmg(0,1,0,10,10,'fx');[a.hp,calls];`,[100,[]]);
check('blast','Occupied armored vehicle further shields player from blast',`WK.pl.veh={V:{armor:.8}};waBlastDmg(0,1,0,10,100,null);calls.filter(c=>c[0]==='hurt');`,[['hurt',5.25,'blast']]);
check('vehicle','Arrow through a hard frame applies a quarter soft coefficient',`const v={hp:100,V:{soft:.4},x:0,z:0};waVehHit(v,100,null,'arrow',0,1,0);v.hp;`,90);
check('vehicle','Ordinary melee applies fifteen percent to vehicle hull',`const v={hp:100,V:{soft:.4},x:0,z:0};waVehHit(v,100,null,'melee',0,1,0);v.hp;`,85);
check('vehicle','Rocket direct penetration precedes splash and bypasses hull soft coefficient',`const v={veh:true,hp:500,V:{soft:.1,armor:.9},x:0,z:0};waRocketBlow({w:WA_WPN.rpg,by:'player'},0,0,0,v);[v.hp,calls.filter(c=>c[0]==='blast')];`,[120,[['blast',3.8,34,{self:1.8}]]]);
check('vehicle','Rocket hitting occupied frame suppresses duplicate exterior self damage',`const v={veh:true,hp:500,V:{soft:.1},x:0,z:0};WK.pl.veh=v;waRocketBlow({w:WA_WPN.rpg,by:'player'},0,0,0,v);calls.filter(c=>c[0]==='blast');`,[['blast',3.8,34,{noSelf:true}]]);
check('battle','Player soldier kill changes local counters only and does not repeat',`const F=makeFight(),a=actor({kind:'soldier',hp:10,fight:F,side:1});waDamage(a,20,'player',0);waDamage(a,20,'player',0);[F.sides[1].lost,F.sides[1].alive,F.sides[1].byPlayer,F.sides[1].hostile,F.b.cas,states.map(s=>s.casualties)];`,[1,9,1,120,120,[100,200]]);
check('battle','NPC soldier kill does not attribute player assistance',`const F=makeFight(),a=actor({kind:'soldier',hp:10,fight:F,side:1});waDamage(a,20,{},0);[F.sides[1].lost,F.sides[1].byPlayer];`,[1,0]);
check('battle','Machine destruction is local and idempotent',`const F=makeFight(),m={hp:0,x:0,y:0,z:0,fight:F};waMachineKill(m,'player');waMachineKill(m,'player');[m.dead,F.b.cas,states.map(s=>s.casualties),calls.filter(c=>c[0]==='blast').length];`,[true,120,[100,200],1]);
check('battle','Exhausted local pool and thirty percent survivors trigger local retreat',`const F=makeFight();F.sides[1].alive=3;waFightSync();[F.sides[1].broke,F.waveT,F.b.cas];`,[true,76,120]);
check('battle','Paused world stops local battle after allowed repeat waves',`const F=makeFight();F.waveT=49;F.waves=2;waFightSync();[F.over,F.waves,WA.fightEnded.has(F.b),F.b.cas];`,[true,3,true,120]);
check('battle','Running world allows further local waves without changing map result',`const F=makeFight();F.waveT=49;F.waves=2;speed=1;waFightSync();[F.over,F.waves,F.sides.map(s=>s.pool),F.b.cas];`,[false,3,[20,20],120]);
check('battle','Stale battle marker ends local battle after six seconds',`const F=makeFight();F.seen=43;waFightSync();[F.over,WA.fightEnded.has(F.b)];`,[true,true]);
check('battle','UID resolves current side rather than reusing stale state slot',`[waBattleSide(2,0).uid,waBattleSide(99,0),waBattleSide(null,0).uid];`,[2,null,1]);
check('battle','Machine generation gates by actual stage and discoveries',`const a={sty:5,st:{inv:['machinegun']}},b={sty:5,st:{inv:['tank']}},c={sty:6,st:{inv:['tank']}};[waMachineType(a,0),waMachineType(b,0),waMachineType(b,1),waMachineType(c,1)];`,['acar','rtank','acar','apc']);
check('people','Killing a real named civilian invokes people death separately from local battle',`const a=actor({kind:'civ',hp:1,per:{id:12}});waDamage(a,2,'player',0);calls.filter(c=>c[0]==='peopleKill'||c[0]==='crime');`,[['peopleKill',{id:12},'murdered'],['crime',3]]);
check('people','Network ruler death requests shared world action instead of local people mutation',`network=true;const a=actor({kind:'ruler',hp:1,per:{id:12},pl:{st:{uid:1}}});waDamage(a,2,'player',0);calls.filter(c=>c[0]==='peopleKill'||c[0]==='netWorld'||c[0]==='crime');`,[['netWorld','wkKill',12,'assassinated',1],['crime',4]]);

const passed=results.filter(r=>r.status==='passed').length;
const report={work_package_id:'WP-WALK-WORLD-EFFECTS',runtime_verified:false,sources:manifest,
 environment:{node:process.version,kind:'exact unchanged copied combat function ranges in fresh isolated VM; synthetic actors, map, ray casts, profile and graphics adapters'},
 declarations,selected_ranges:selected,passed,failed:results.length-passed,results};
fs.writeFileSync(path.join(out,'combat-probe.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Combat: ${passed}/${results.length} isolated checks passed.`);process.exitCode=report.failed?1:0;
