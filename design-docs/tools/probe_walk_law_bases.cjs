'use strict';

// Run selected game rules in a VM. Copy inputs byte-for-byte and use memory-only fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-law-bases');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['core.js', 'index.html', 'walk.js', 'walkact.js', 'walkair.js', 'walkeco.js', 'walkgen.js', 'walklaw.js', 'walkmil.js', 'walksea.js'];
const sources = {};
fs.mkdirSync(copy, { recursive: true });
const manifest = names.map(name => {
  const rel = `EarthSimulator/${name}`;
  const target = path.join(copy, name);
  fs.copyFileSync(path.join(root, rel), target);
  const data = fs.readFileSync(target);
  sources[name] = data.toString('utf8').replace(/\r\n/g, '\n');
  return { path: rel, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
});

function block(file, from, until) {
  const s = sources[file], a = s.indexOf(from), b = s.indexOf(until, a + from.length);
  assert(a >= 0 && b > a, `${file}: ${from}..${until}`);
  return s.slice(a, b);
}
const line = (file, from) => block(file, from, '\n');
function fn(file, name) {
  const from = `function ${name}(`;
  const first = line(file, from);
  return first.trimEnd().endsWith('}') ? first : block(file, from, '\n}\n') + '\n}';
}
const functions = (file, ...names) => names.map(name => fn(file, name)).join('\n');
const law = (...names) => functions('walklaw.js', ...names);
const mil = (...names) => functions('walkmil.js', ...names);
const eco = (...names) => functions('walkeco.js', ...names);
const act = (...names) => functions('walkact.js', ...names);
const lawLines = (...names) => names.map(name => line('walklaw.js', `const ${name} =`)).join('\n');
const ecoLines = (...names) => names.map(name => line('walkeco.js', `const ${name} =`)).join('\n');
const config = file => block(file, 'Object.assign(WALK, {', '\n});') + '\n});';
const worldBalance = block('walkgen.js', 'const WALK = {', '\n};') + '\n};';
const lawBase = config('walklaw.js') + '\n' + block('walklaw.js', 'const LAW_KINDS =', 'function lawAng(');
const milBase = config('walkmil.js') + '\n' + block('walkmil.js', 'const MIL = {', '// ---- мелкие помощники');
const plain = value => JSON.parse(JSON.stringify(value));
const noop = () => {};
const clamp = (n, a, b) => Math.max(a, Math.min(n, b));
const results = [];

function setup(src, extra = {}) {
  const W = { simYear: 20, isWater: Array(81).fill(0), stateId: Array(81).fill(1) };
  const st = { id: 1, uid: 10, era: 4, capital: 40, alive: true, name: 'First' };
  const other = { id: 2, uid: 20, name: 'Second' };
  const WK = { ui: {}, env: {}, time: 20, hints: [], plans: new Map(), dynCols: [], tier: Array(81).fill(2), roadBits: Array(81).fill(0),
    pl: { x: 200, y: 0, z: 200, vx: 0, vy: 0, vz: 0, cell: 40, era: 4, wanted: 0, onGround: true } };
  const WKP = { bounty: {}, audience: {}, purse: {}, rep: {}, arms: { owned: [], reserve: {}, loaded: {} }, ext: {} };
  const ctx = vm.createContext({ GRID: { W: 9, H: 9, N: 81 }, W, WK, WKP, st, other,
    WK_T: { WILD: 0, RURAL: 1, VILLAGE: 2, OUTER: 3, INNER: 4, CITY: 5 },
    walkActive: true, WA: { npcs: [], soldiers: [], vehs: [], mode: 'survival', gone: new Set() },
    WA_NPC_KINDS: {}, WA_VEH: {}, WA_DRAW: {}, stAt: st, stateByUid: uid => uid === 10 ? st : uid === 20 ? other : null,
    wkCellAt: () => 40, wkStateOf: () => st, wkEraOf: () => 4, wkGround: () => 0, wkWaterAt: () => -100,
    clamp, clamp01: n => clamp(n, 0, 1), T: (ru, en) => en, TF: (ru, en) => en, tLower: s => s.toLowerCase(),
    wkMsg: noop, wkSfx: noop, wkSay: noop, wkBanner: noop, wkHudSet: noop, waPuff: noop,
    waAngry: n => { n.hostile = true; n.state = 'fight'; }, lawStandDown: n => { n.hostile = false; },
    wkFmtMoney: (uid, n) => `${uid}:${n}`, wkWageAt: () => 10, wkWage: () => 10,
    ...extra });
  vm.runInContext(worldBalance + '\n' + src, ctx, { timeout: 3000 });
  return code => vm.runInContext(`{\n${code}\n}`, ctx, { timeout: 3000 });
}

function test(group, label, check) {
  const id = `WL${String(results.length + 1).padStart(2, '0')}-${group}`;
  try {
    check();
    results.push({ id, label, status: 'passed' });
  } catch (e) {
    console.error(`${id} ${label}\n${e.stack}`);
    results.push({ id, label, status: 'failed', error: e.message });
  }
}
function equal(group, label, fixture, code, expected) {
  test(group, label, () => assert.deepEqual(plain(fixture(code)), expected));
}

const heat = law('lawSighted', 'waHeat', 'waHeatAdd', 'waHeatClear', 'lawStandDownAll', 'lawWantedSync', 'lawRaised',
  'lawBountyOk', 'lawBounty', 'lawBountyAt', 'lawStarsTick', 'lawAlarmFor', 'lawPlanOf');
const core = setup([config('walkact.js'), lawBase, heat, config('walkeco.js'),
  eco('ecoD', 'ecoStat', 'ecoRep', 'ecoRepMove', 'ecoRepTalk', 'ecoOnCrime', 'ecoCrimeNote', 'ecoRepDrift'),
  ecoLines('ecoClamp', 'ECO_SEC_DAY', 'ecoClk', 'ecoRepOf', 'ecoFinePrice', 'ecoAlmsPrice', 'ecoStUid', 'ecoStOf'),
  act('waCrime', 'waHookList', 'waOn', 'waHookRun', 'waCanTeleport'),
  law('lawLos', 'lawSight', 'lawCanSee', 'lawReachable', 'lawCrime', 'lawCatchStart', 'lawCatchRefuse', 'lawKill', 'lawCanTeleport',
    'lawZoneCrime', 'lawNotice', 'lawRecognise', 'lawJoin', 'waLawReset', 'waLawInfo', 'lawFootSync', 'lawCarSync', 'lawDistField', 'lawJunction', 'lawCarKind', 'lawPlCars', 'lawBlockEnd'),
  lawLines('lawNationOf', 'lawNb', 'LDF'),
  `let ruler=100, rayCol=-1, rayLand=-1, water=-100, crimeCell=40, era=4, age=6, auto=true, own=st, fight=null, distRoad=0;
   const events=[], WA_HOOKS={}; const wkCellAt=()=>crimeCell, wkEraOf=()=>era, wkAgeOf=()=>age, wkSty=e=>e, wkInv=()=>auto;
   const wkStateOf=()=>own, stateOf=()=>own, rulerOf=()=>({id:ruler}), wkRayCols=()=>rayCol, wkRayGround=()=>rayLand, wkWaterAt=()=>water;
   const waWarZone=()=>fight, waSideAnger=(f,k)=>events.push(['side',k]), lawPalAlarm=(ci,why)=>events.push(['palace',ci,why]);
   const lawZoneMsg=()=>{}, lawFenceDist=()=>0, waFlee=n=>{n.fled=true;}, waHookFail=(k,e)=>{throw e;};
   const lawFootSpawn=(k,n)=>events.push([k,n]), lawSpawnCar=a=>events.push(['car',a]), lawSpawnMounted=()=>events.push(['mount']);
   const waVehRemove=v=>events.push(['remove',v.id]);
   const wkRoadDist=()=>distRoad, wkMoney=uid=>WKP.purse[uid]||0;
   const wkPay=(uid,n)=>{if(wkMoney(uid)<n)return false;WKP.purse[uid]-=n;return true;};
   WA_VEH.police30={}; waOn('crime',lawCrime); waOn('crime',ecoOnCrime); waOn('canTeleport',lawCanTeleport);
   const npc=(x,z,conf={})=>({kind:'guard',x,y:0,z,d:Math.hypot(x-WK.pl.x,z-WK.pl.z),era:4,pl:{st},...conf});
   const reset=()=>{waHeatClear('silent'); LAW.pal.clear(); LAW.foot=[]; LAW.cars=[]; LAW.parked=[]; LAW.arrest=null;
     LAW.zone=null;LAW.tFoot=LAW.tCar=0; LAW.seenT=LAW.crimeT=LAW.noticeT=-99; LAW.crimeV=null;
     W.simYear=20; WK.time=20; WK.roadBits.fill(0); WK.plans.clear(); WK.tier.fill(2); WK.env.night=0; Object.assign(WK.pl,{x:200,y:0,z:200,cell:40,era:4,onGround:true,dead:false,crouch:0,veh:null});
     WA.npcs=[]; WA.soldiers=[]; WA.vehs=[]; WKP.audience={}; WKP.bounty={}; WKP.rep={}; WKP.purse={}; WKP.ext={};
     ruler=100; rayCol=rayLand=-1; water=-100; crimeCell=40; era=4; age=6; auto=true; own=st; fight=null; events.length=0; };`].join('\n'));

equal('crime','A handled crime still runs later standing callback',core,`reset(); WA.npcs=[npc(210,200),npc(215,200,{kind:'civ'})]; waCrime(2,200,200,null);
 [LAW.stars,WK.pl.wanted,WKP.rep[10],WA.npcs[0].hostile,WA.npcs[1].fled]`,[2,45,-5,true,true]);
equal('crime','Petty offense without a guard hurts standing in a law cell but adds no stars',core,`reset(); waCrime(1,200,200,null); [LAW.stars,ecoRepOf(10),ecoD().lc]`,[0,-2,0]);
equal('crime','Wilderness without law still updates the last offense time',core,`reset(); WK.tier[40]=0; ecoD().clk=39; waCrime(3,200,200,null); [LAW.stars,ecoRepOf(10),ecoD().lc]`,[0,0,39]);
equal('crime','Witness-based detention and refusing it raise distinct states',core,`reset(); const n=npc(210,200); WA.npcs=[n]; waCrime(1,200,200,null); const a=[LAW.stars,n.state]; lawCatchRefuse(n); [...a,LAW.stars,n.state]`,[1,'catch',2,'fight']);
equal('crime','Repeated hits on the same victim use the smaller point increment',core,`reset(); const n=npc(200,202,{kind:'civ'}); lawCrime(2,200,200,n,{law:true}); WK.time+=1;
 lawCrime(2,200,200,n,{law:true}); const a=LAW.pts; WK.time+=10; lawCrime(2,200,200,n,{law:true}); [LAW.stars,a,Math.round(LAW.pts*100)]`,[2,0.08,42]);
equal('crime','Guard assault and guard death raise higher thresholds',core,`reset(); const n=npc(200,202); lawCrime(2,200,200,n,{law:true}); const a=LAW.stars; lawKill(n,'player'); [a,LAW.stars,WKP.bounty[10].stars]`,[3,4,4]);
equal('crime','Battle crime only angers the land-owning side with nearby witnesses',core,`reset(); fight={sides:[{st:other},{st}]}; WA.soldiers=[{fight,side:0,x:201,z:200},{fight,side:1,x:205,z:200}];
 lawZoneCrime(1,200,200,null); lawZoneCrime(2,200,200,null); events`,[['side',1]]);
equal('crime','Portable map travel is blocked while stars remain',core,`reset(); waHeatAdd(2,'fixture'); const a=waCanTeleport(); waHeatClear('silent'); [a.ok,typeof a.msg,waCanTeleport().ok]`,[false,'string',true]);

equal('pursuit','Sight uses era, night, crouch and separate ray obstruction checks',core,`reset(); WK.env.night=1; WK.pl.crouch=1;
 const a=lawSight(4); rayCol=10; const b=lawCanSee(225,0,200,25,4); const c=lawCanSee(205,0,200,5,4); rayCol=-1; rayLand=10;
 [Math.round(a*10)/10,b,c,lawCanSee(230,0,200,30,4)]`,[57.6,false,true,false]);
equal('pursuit','Search starts after sight loss, then high stars decay more slowly',core,`reset(); waHeatAdd(3,'fixture'); lawStarsTick(0.25);
 lawStarsTick(8); const a=LAW.state; lawStarsTick(1.25); lawStarsTick(23); [a,LAW.state,LAW.stars,WK.pl.wanted]`,['chase','search',2,45]);
equal('pursuit','Renewed sight clears search time and saves last movement',core,`reset(); waHeatAdd(2,'fixture'); lawStarsTick(0.25); lawStarsTick(10);
 Object.assign(WK.pl,{x:321,vx:4}); WK.time=36; lawSighted(); lawStarsTick(0.25); [LAW.state,LAW.unseenT,LAW.decayT,LAW.last.x,LAW.last.vx,LAW.last.t]`,['chase',0,0,321,4,36]);
equal('pursuit','Own guard joins at two stars, foreign guard at four',core,`reset(); const a=npc(205,200), b=npc(206,200,{pl:{st:other}}); WA.npcs=[a,b];
 waHeatAdd(2,'fixture'); lawNotice(); const first=[!!a.hostile,!!b.hostile]; waHeatAdd(4,'fixture'); lawNotice(); [...first,b.hostile]`,[true,false,true]);
equal('pursuit','Foot reinforcement respects seen, reachable and battle-zone gates',core,`reset(); waHeatAdd(3,'fixture'); LAW.zone={}; lawFootSync(); LAW.zone=null; water=4; lawFootSync(); water=-100;
 lawFootSync(); lawFootSync(); events`,[['police',2]]);
equal('pursuit','Car model uses era and motor-age technology; response respects zone',core,`reset(); era=3; age=4; const a=lawCarKind(40); age=5; const b=lawCarKind(40); auto=false; const c=lawCarKind(40);
 era=4; waHeatAdd(2,'fixture'); LAW.zone={}; lawCarSync(); LAW.zone=null; lawCarSync(); [a,b,c,events]`,[null,'police30',null,[['car',false]]]);
equal('pursuit','Road distances use reciprocal links and route to the finite branch',core,`reset(); WK.pl.cell=40; WK.roadBits[40]=1; WK.roadBits[41]=1|4|2; WK.roadBits[42]=4; WK.roadBits[50]=0;
 const F=lawDistField(); [F.dist[42],F.mark[50]===F.gen,lawJunction({law:{}},42,[0,2]),lawJunction({},42,[2])]`,[2,false,2,-1]);
equal('pursuit','Ports can give the initial warrant an adjacent land owner',core,`reset(); own=null; WK.plans.set(39,{st:other,water:false,CX:200,CZ:200}); waHeatAdd(4,'fixture'); [LAW.st,WKP.bounty[20].stars]`,[20,4]);

equal('profile','Warrant survives current heat removal and expires past the validity boundary',core,`reset(); waHeatAdd(4,'fixture'); waHeatClear('silent'); W.simYear=32;
 const valid=!!lawBountyAt(40); W.simYear=32.1; [valid,lawBountyAt(40),Object.keys(WKP.bounty)]`,[true,null,[]]);
equal('profile','Changed ruler invalidates a warrant',core,`reset(); waHeatAdd(5,'fixture'); const rec=WKP.bounty[10]; ruler=101; [rec.ruler,lawBountyAt(40)]`,[100,null]);
equal('profile','Recognition revives current heat below the stored warrant level',core,`reset(); waHeatAdd(5,'fixture'); waHeatClear('silent'); WA.npcs=[npc(210,200)]; lawRecognise(); [LAW.stars,WA.npcs[0].hostile,WKP.bounty[10].stars]`,[4,true,5]);
equal('profile','Character switch clears transient memory while retaining stored warrant and pass',core,`reset(); waHeatAdd(4,'fixture'); WKP.audience[40]={y:20};
 const a=waLawReset({bounty:false,audience:false}); const b=waLawInfo(); [a,b.stars,b.bounties.length,b.audiences,LAW.last]`,[{heat:4,bounty:0,audience:0},0,1,1,null]);

equal('reputation','Standing is bounded, penalized by offense level and valued by state UID',core,`reset(); ecoRep(20,125); ecoOnCrime(4,200,200,null,{law:true,cell:40}); [ecoRepOf(10),ecoRepOf(20),ecoRepOf(0)]`,[-25,100,0]);
equal('reputation','Quiet recovery waits half a day, caps elapsed step and preserves positive standing',core,`reset(); WKP.rep={10:-20,20:4}; const D=ecoD(); D.rd=1; D.clk=120; D.lc=0; ecoRepDrift(); const a=ecoRepOf(10);
 D.clk=720; ecoRepDrift(); [a,ecoRepOf(10),ecoRepOf(20),D.rd]`,[-20,-19.931,4,720]);
equal('reputation','Temple donation costs local money and caps standing at 15',core,`reset(); WKP.purse[10]=100; ecoRep(10,14); const d={home:[],opts:[]}; const o=ecoRepTalk({kind:'priest'},st,d);
 o[0].fn(); d.opts[1].fn(); [ecoRepOf(10),WKP.purse[10]]`,[15,70]);
equal('reputation','A guard settlement zeros negative standing; a warrant blocks it',core,`reset(); WKP.purse[10]=100; ecoRep(10,-20); WKP.bounty[10]={stars:4,year:20,ruler:100};
 const d={home:[],opts:[]}; const offer=()=>ecoRepTalk({kind:'guard',cell:40},st,d)[1].fn(); offer(); const before=[d.opts.length,ecoRepOf(10),WKP.purse[10]];
 delete WKP.bounty[10]; offer(); d.opts[0].fn(); [...before,ecoRepOf(10),WKP.purse[10]]`,[0,-20,100,0,76]);

const arrest = setup([lawBase, heat, law('lawFineAmount', 'lawConfiscate', 'lawVehCat', 'lawHurt', 'lawArrestCtx', 'lawCanSurrender',
  'lawArrest', 'lawReleaseCell', 'lawRelease', 'lawDeath', 'lawOfficerNear', 'lawSurrenderKey', 'lawReset'),
  `const events=[]; const rulerOf=()=>({id:100}); let funds=20;
   const wkFine=(u,n)=>{const x=Math.min(n,funds); funds-=x;return n-x;};
   const wkRespawn=cell=>events.push(['respawn',cell]), wkUiOpen=(name,d)=>events.push([name,d||null]);
   const wkVehExit=()=>{WK.pl.veh=null;}, lawPalReturn=()=>{};
   const WA_WPN={knife:{era:1,dmg:5,n:['','Knife']},high:{era:4,dmg:5,n:['','High']},middle:{era:2,dmg:8,n:['','Middle']}};
   const waAmmoName=k=>k, waAmmoAdd=(k,n)=>WKP.arms.reserve[k]+=n;
   const waTake=k=>{const i=WKP.arms.owned.indexOf(k);if(i<0)return false;WKP.arms.owned.splice(i,1);delete WKP.arms.loaded[k];return true;};
   const reset=()=>{lawReset(true); events.length=0; funds=20; WK.time=20; WKP.bounty={}; WKP.arms={owned:['knife','high','middle'],reserve:{test:100},loaded:{high:5}};
     WA.mode='survival'; WA.npcs=[]; WK.tier.fill(5); WK.tier[38]=2; WK.pl.cell=40; WK.pl.veh=null; WK.pl.dead=false; WK.pl.onGround=true; WK.pl.y=0;};`].join('\n'));

equal('arrest','Fine uses local wage and halves on surrender',arrest,`reset(); [1,2,3,4,5].map(k=>[lawFineAmount(k,false),lawFineAmount(k,true)])`,[[10,5],[30,15],[70,35],[160,80],[300,150]]);
equal('arrest','Surrender key opens a confirmation on ground, not while airborne',arrest,`reset(); LAW.stars=2; WK.pl.veh={air:true,V:{phys:'plane'}};
 const a=lawSurrenderKey(); WK.pl.veh=null; const b=lawSurrenderKey(); [a,b,events]`,[true,true,[['surrender',null]]]);
equal('arrest','Arrest keeps high warrant, debits available cash and releases outside town',arrest,`reset(); waHeatAdd(4,'fixture'); lawArrest('caught','guard'); const d=LAW.arrest;
 const a=[LAW.stars,d.unpaid,d.paid,d.cell,d.bounty,WKP.arms.reserve.test,WKP.arms.owned.slice(),'high' in WKP.arms.loaded]; lawRelease();
 [...a,LAW.arrest,events.at(-1),WKP.bounty[10].stars]`,[0,140,'10:20',38,true,21,['knife'],false,null,['respawn',38],4]);
equal('arrest','Surrender keeps owned weapons but confiscates part of reserve',arrest,`reset(); funds=1000; waHeatAdd(3,'fixture'); lawArrest('surrender');
 [LAW.arrest.unpaid,LAW.arrest.bounty,WKP.arms.reserve.test,WKP.arms.owned,funds]`,[0,false,79,['knife','high','middle'],965]);
equal('arrest','Standard mode keeps its arms through confiscation',arrest,`reset(); WA.mode='armed'; [lawConfiscate(1,false),WKP.arms.reserve.test,WKP.arms.owned.length]`,[[],100,3]);
equal('arrest','Death from falls and water bypasses arrest; crash requires a nearby officer',arrest,`reset(); waHeatAdd(2,'fixture'); const a=['fall','drown','rad','beast','crash'].map(lawDeath);
 WA.npcs=[{kind:'guard',d:29}]; [...a,lawDeath('crash'),LAW.arrest.kind]`,[false,false,false,false,false,true,'caught']);
equal('arrest','Remembered vehicle context makes a ranged death require nearby officer',arrest,`reset(); waHeatAdd(2,'fixture'); WK.pl.veh={V:{phys:'plane'},air:true}; lawHurt(50,'guard'); WK.pl.veh=null;
 const a=lawDeath('guard'); WK.time+=4; const b=lawDeath('guard'); [a,b,LAW.arrest.ctx.cat]`,[false,true,'']);

const palace = setup([lawBase, heat, law('waAudience', 'waAudienceGrant', 'waAudienceRevoke', 'lawBribe', 'lawMoneyStr', 'lawPalGet',
  'lawInside', 'lawFenceDist', 'lawGateStep', 'lawBlastGate', 'lawPalAlarm', 'lawPalEnd', 'lawPalReturn', 'lawPalFar',
  'lawAlarmTick', 'lawPalTick', 'lawFire', 'lawEvacStart', 'lawEvacStep', 'lawHide', 'lawGuardTalk'),
  block('walklaw.js','WA_NPC_KINDS.ruler =','// разговор у ворот'),
  `let rich=0, cash=0, armed=false; const events=[];
   const palace={x:200,z:200,hw:20,hd:18,r:25,yaw:0,gate:{},inner:{x:200,z:200}};
   const pl={i:40,era:4,st,special:{palace},spots:[]}; WK.plans.set(40,pl);
   const lawGateInit=S=>{if(!S.gate&&pl.special.palace.gate)S.gate={x:200,y:0,z:218,w:8,u:0,want:0,dyn:{on:false}};};
   const lawPals=()=>[pl], lawShout=(ci,text)=>events.push(['warn',ci]), lawReinforce=()=>true, lawStep=()=>true;
   const waThreat=()=>armed, wkRep=()=>rich, wkPay=(uid,n,why)=>{events.push([why,n]);if(cash<n)return false;cash-=n;return true;};
   const rulerOf=()=>({id:100}); const guard={cell:40,zone:'gate',pl}; const dlg=()=>({opts:[],home:[]}); const wkUiClose=()=>{WK.ui.open=null;};
   const reset=()=>{WA.npcs=[]; WA.gone.clear(); LAW.pal.clear(); waHeatClear('silent'); WKP.audience={}; WKP.bounty={};
    W.simYear=20; WK.time=20; WK.ui.open=null; WK.pl.dead=false;WK.pl.x=200;WK.pl.z=200;
    pl.era=4;palace.gate={};palace.hw=20;armed=false;rich=0;cash=0;events.length=0;};`].join('\n'));
equal('palace','Pass lasts less than one world year; legacy true also reads as valid',palace,`reset(); waAudienceGrant(40,'letter'); const a=WKP.audience[40]; W.simYear=20.9; const b=waAudience(40);
 W.simYear=21; WKP.audience[39]=true; [a,b,waAudience(40),waAudience(39)]`,[{y:20,why:'letter'},true,false,true]);
equal('palace','Gate guard grants courtesy at 50 standing',palace,`reset(); rich=50; const d=dlg(); lawGuardTalk(guard,d); d.opts[0].fn(); [WKP.audience[40].why,events]`,['fame',[]]);
equal('palace','Bribe requires funds and costs four local wage days',palace,`reset(); const d=dlg(); lawGuardTalk(guard,d); d.opts[0].fn(); d.opts[0].fn(); const a=waAudience(40);
 cash=40; lawGuardTalk(guard,d); d.opts[0].fn(); d.opts[0].fn(); [a,WKP.audience[40].why,cash,events]`,[false,'bribe',0,[['bribe',40],['bribe',40]]]);
equal('palace','Guard dialogue denies armed players, active heat and non-gate posts',palace,`reset(); armed=true; const a=lawGuardTalk(guard,dlg()); armed=false; LAW.stars=1;
 const b=lawGuardTalk(guard,dlg()); LAW.stars=0; [a,b,lawGuardTalk({...guard,zone:'wall'},dlg())]`,[false,false,false]);
equal('palace','Pardon deletes the local warrant on payment and leaves standing untouched',palace,`reset(); waAudienceGrant(40,'letter'); WKP.bounty[10]={stars:4,year:20,ruler:100}; WKP.bounty[20]={stars:4}; WKP.rep[10]=-70; cash=300;
 const d=dlg(); WA_NPC_KINDS.ruler.talk({cell:40,era:4,pl},d); d.opts[0].fn(); d.opts[0].fn(); [cash,Object.keys(WKP.bounty),WKP.rep[10],waAudience(40),events]`,[0,['20'],-70,true,[['pardon',300]]]);
equal('palace','Open dialogue resets warnings; unauthorized entry can then raise two stars',palace,`reset(); lawPalTick(pl,1.25); WK.ui.open='dlg'; lawPalTick(pl,4);
 const s=lawPalGet(40), a=[s.state,s.wT]; WK.ui.open=null; lawPalTick(pl,2.25); [...a,s.state,s.why,LAW.stars]`,['calm',0,'alarm','trespass',2]);
equal('palace','Tribal edge warns first and uses a deeper interior with doubled delay',palace,`reset(); pl.era=0; palace.gate=null; WK.pl.x=209; lawPalTick(pl,5);
 const s=lawPalGet(40), a=[s.wT,s.state,events.length]; WK.pl.x=205; lawPalTick(pl,3); const b=s.state; lawPalTick(pl,1.5); [...a,b,s.state]`,[0,'calm',1,'calm','alarm']);
equal('palace','Armed warning with a pass still raises alarm and revokes the pass',palace,`reset(); waAudienceGrant(40,'test'); armed=true;
 lawPalTick(pl,3); const s=lawPalGet(40); [s.why,LAW.stars,s.gate.want,waAudience(40)]`,['weapon',3,1,false]);
equal('palace','Leaving court after a visit revokes the pass',palace,`reset(); waAudienceGrant(40,'letter'); lawPalTick(pl,1.25); WK.pl.x=260; lawPalTick(pl,0.25); [waAudience(40),lawPalGet(40).in]`,[false,0]);
equal('palace','Alarm evacuates the ruler and return waits for local cooldown',palace,`reset(); const n={cell:40,kind:'ruler',era:4,role:{id:77},d:40}; WA.npcs=[n]; lawFire('virtual',{type:'gun'});
 const s=lawPalGet(40); lawEvacStep(n,8); const a=[s.state,n.vanish,WA.gone.has(77)]; lawPalEnd(s,pl,palace);
 WK.time=171; lawPalFar(s,0.25); [...a,WA.gone.has(77),s.gate.want,s.ret]`,['alarm',true,true,false,0,0]);
equal('palace','Broken palace gate stays collision-free in the session',palace,`reset(); lawPalAlarm(40,'trespass'); const g=lawPalGet(40).gate; lawGateStep(g,1);
 const a=g.dyn.on; lawBlastGate(200,0,218,3,100); lawGateStep(g,1); [a,g.broken,g.dyn.on,g.u]`,[true,true,false,0]);

const bases = setup([milBase, mil('milPermOf', 'milGatePt', 'milFence', 'milArrive', 'milOverfly', 'milZoneTick', 'milAlarm', 'milEnd',
  'milAlarmTick', 'milGateStep', 'milGateBusy', 'milGateBreak', 'milBlastGate', 'milBaseGet', 'milBaseDrop', 'milBaseAt', 'milCrime',
  'milVehDefs', 'milStySt', 'milVehOk', 'milVehFor', 'milMountFor', 'milClear', 'waMilResponse', 'milStyPl', 'milParkType'),
  line('walkmil.js','const milTr ='), line('walkmil.js','const milHeat ='),
  `let lastHeat=0, armed=false, tech=new Set(), tier=6;
   const events=[], ECX={job:null}; const wkFenceStyle=()=>1, wkHeight=()=>0, waThreat=()=>armed;
   const waHeat=()=>lastHeat, waHeatAdd=(k,label)=>{lastHeat=k;events.push([k,label]);};
   const milStand=n=>{n.hostile=false;}, milShout=B=>events.push(['warn',B.ci]);
   const milGateHint=()=>{}, milReinforce=()=>true, milRespClear=()=>{}, milRespPrune=()=>{};
   const wkSty=e=>e, wkInv=(st,key)=>tech.has(key), wkVehAlt=()=>null;
   const milRespEra=()=>4, milRespSty=()=>tier, milRespState=()=>st, milRespAir=()=>events.push(['air']);
   const milRespVeh=k=>{MIL.resp.veh.push({mr:true,type:k});events.push([k]);return true;}; const milRespFoot=n=>{events.push(['foot',n]); return n;};
   Object.assign(WA_VEH,milVehDefs()); for(const k of Object.keys(WA_VEH)) WA_DRAW[k]=true;
   const gate={x:200,y:0,z:240,yaw:0,w:8,b:{x:200,y:0,z:240,yaw:0,leaf:{w:8,h:4,d:1}}};
   const M={era:4,cx:200,cz:200,H:40,yaw:0,gate}; const pl={i:40,special:{mil:M}}; let B;
   const reset=()=>{milClear(true); MIL.resp.foot=[];MIL.resp.veh=[]; MIL.resp.air=null; events.length=0;ECX.job=null;lastHeat=0;tech=new Set();armed=false;
     WK.time=20;Object.assign(WK.pl,{x:200,y:0,z:200,cell:40,dead:false,veh:null});WK.plans.set(40,pl);WA.npcs=[];
     B=milBaseGet(40,pl);MIL.near.push(B);};`].join('\n'));
equal('bases','Base arrival without permission relocates a live pedestrian outside',bases,`reset(); milArrive(40,'enter'); [WK.pl.x,WK.pl.z,WK.pl.y,WK.pl.onGround,milFence(B,WK.pl.x,WK.pl.z)]`,[200,256,0,true,16]);
equal('bases','Expired recruitment pass is removed',bases,`reset(); MIL.perm.set(40,25); const a=milPermOf(40); WK.time=25; [a,milPermOf(40),MIL.perm.has(40)]`,[true,false,false]);
equal('bases','Guard duty produces a distance-adjusted exit allowance and loses it on exit',bases,`reset(); ECX.job={kind:'mil',cell:40}; const a=milPermOf(40); ECX.job=null; const b=milPermOf(40); const t=MIL.exit.t1-WK.time;
 WK.pl.z=250; milZoneTick(B,0.25); [a,b,t,MIL.exit,MIL.perm.has(40)]`,[true,true,41,null,false]);
equal('bases','High overflight suspends alert timers, low intrusion triggers alarm',bases,`reset(); WK.pl.veh={A:{air:true,agl:70},V:{}}; milZoneTick(B,3); const a=[B.st,B.wT];
 WK.pl.veh.A.agl=30; milZoneTick(B,3); [...a,B.st,B.why,lastHeat,B.gate.want]`,['calm',0,'alarm','trespass',3,1]);
equal('bases','Alarm revokes recruitment and marks the local garrison hostile',bases,`reset(); MIL.perm.set(40,200); WA.npcs=[{kind:'msoldier',mil:{ci:40}},{kind:'msoldier',mil:{ci:41}}];
 milAlarm(B,'assault'); [MIL.perm.has(40),B.st,WA.npcs[0].hostile,!!WA.npcs[1].hostile,lastHeat]`,[false,'alarm',true,false,3]);
equal('bases','Gate close waits for its delay and an unobstructed opening',bases,`reset(); milAlarm(B,'fixture'); const g=B.gate;
 milGateStep(B,1); const a=g.u; WK.time=24; WK.pl.z=240; milGateStep(B,1); const b=g.u; WK.pl.z=200; milGateStep(B,1); [a,b,g.u,g.dyn.on]`,[0,0,1,true]);
equal('bases','Broken base gate survives local recreation until full cleanup',bases,`reset(); B.gate.dyn.on=true; milBlastGate(200,0,240,8,100);
 const a=[B.gate.broken,B.gate.dyn.on,B.st]; milClear(false); const b=milBaseGet(40,pl).gate.broken; milClear(true); const c=milBaseGet(40,pl).gate.broken; [...a,b,c]`,[true,false,'calm',true,false]);
equal('bases','Base alert stands down after distance and time condition',bases,`reset(); milAlarm(B,'fixture'); WK.time=100; WK.pl.z=700; milZoneTick(B,4.25); [B.st,B.gate.want]`,['calm',0]);
equal('bases','Equipment respects registered model, technology and exact tier',bases,`reset(); tech.add('tank'); const a=milVehOk('htank',st,7), b=milVehOk('htank',st,6);
 delete WA_DRAW.htank; const c=milVehOk('htank',st,7); WA_DRAW.htank=true; tech.clear(); [a,b,c,milVehOk('htank',st,7)]`,[true,false,false,false]);
equal('bases','Garrison crime and unprotected local major crime can alarm the base',bases,`reset(); milCrime(1,200,200,null,{}); const a=B.st; milCrime(2,200,200,{kind:'msoldier',mil:{ci:40}},{}); const b=B.why;
 milEnd(B,true); milCrime(3,200,200,null,{}); [a,b,B.why,lastHeat]`,['calm','assault','theft',3]);
equal('bases','Military pursuit responds at five stars and chooses era-eligible equipment',bases,`reset(); const a=waMilResponse(4,200,200); tech.add('tank'); tier=7; const b=waMilResponse(5,200,200);
 [a,b,events]`,[0,4,[['htank'],['foot',3],['air']]]);

const adapters=setup([config('walkair.js'), functions('walkair.js','airHijackStart'), functions('walksea.js','seaTheft','seaLawAnchor'),
  `const events=[], SEA_SHIPS={boat:{},war:{war:true}}, AIR_T={plane:{},zep:{zep:true}}, AIR={gone:new Set()};
   let ship=null; const seaPlayerShip=()=>ship, waDry=()=>true;
   const wkCellAt=(x,z)=>x===500?39:40, waCrime=(...params)=>events.push(params), waHeatAdd=(...params)=>events.push(params);
   const airHeat=()=>0, airNearestPort=()=>({ci:40}), airNearestMast=()=>({ci:40}), airStOf=()=>st, wkInv=()=>false, wkSty=e=>e;
   const airSay=()=>{}, airZepCrew=()=>{};`].join('\n'));
equal('adapters','Docked ship theft routes a water anchor to land and consumes crime marker',adapters,`W.isWater[39]=1;
 const v={type:'war',sea:{mode:'moored',berth:{gx:500,gz:400},crimeLvl:3,port:{ci:40,sp:{shoreX:500,shoreZ:400}}}};
 ship=v; seaTheft(v); seaTheft(v); [events,v.sea.crimeLvl,seaLawAnchor()]`,[[[3,1800,1800,null]],0,{x:500,z:400,ci:40}]);
equal('adapters','Aircraft theft sends civilian and military heat and tests air availability',adapters,`events.length=0; airHijackStart({x:200,z:200,A:{type:'plane'}},false);
 const a=[AIR.hj.mil,AIR.hj.noAir]; airHijackStart({owner:'mil',x:200,z:200,A:{type:'zep',baseKey:1}},true); [...a,AIR.hj.mil,AIR.gone.has(1),events]`,[false,true,true,true,[[2,'hijack'],[3,'hijack'],[2,200,200,null]]]);

const facilities=setup([functions('walkgen.js','wkFacCompute','wkH2','wkH3'), line('walkgen.js','const WK_FAC ='), line('walkgen.js','const WK_DX ='),
  line('core.js','const NB8 ='), `const _wkS=61, CIV={AT_AIR:5}, states=[st], landH=()=>0.002, wkAgeOf=()=>st.era, wkInv=()=>false;
  W.isCoast=Array(81).fill(0); W.urban=Array(81).fill(0); st.cells=new Set(Array.from({length:81},(_,i)=>i)); st.capital=40;
  const tiers=Array(81).fill(0), riv=Array(81).fill(0); tiers[40]=5;
  const build=(prev,old)=>{const F=Array(81).fill(0), O=Array(81).fill(-1), P=Array(81).fill(0);
   wkFacCompute(tiers,riv,F,O,P,prev,old,null,null); return {F,O,ids:F.flatMap((k,i)=>k===WK_FAC.BASE?[i]:[])};};`].join('\n'));
equal('facility','Base allocator respects area cap and stable requested sites',facilities,`const a=build(), b=build(); [a.ids.length,JSON.stringify(a.ids)===JSON.stringify(b.ids),a.ids.every(i=>a.O[i]===40 && i!==40)]`,[3,true,true]);
equal('facility','Already accepted base keeps its cell while valid and disappears after flooding',facilities,`const a=build(), i=a.ids[0], b=build(a.F,a.O); W.isWater[i]=1;
 const c=build(b.F,b.O); [b.ids.includes(i),c.ids.includes(i),c.ids.length]`,[true,false,3]);
equal('facility','Earliest world era does not allocate this base class',facilities,`W.isWater.fill(0); st.era=0; build().ids`,[]);
equal('pursuit','Clearing roadblock removes its obstacle and retires surviving cars',core,`reset(); const a={id:1}, b={id:2,wreck:true};
 LAW.block={cars:[a,b],blocker:{id:3}}; lawBlockEnd(); [LAW.block,LAW.parked.map(v=>v.id),events]`,[null,[1],[['remove',3]]]);
equal('bases','Displayed park entry remains gated by discoveries at materialization',bases,`reset(); st.era=7; const pl={st,era:5,i:40}; const none=milParkType('htank',pl);
 tech.add('tank'); [none,milParkType('htank',pl)]`,[null,'htank']);

const declarations = {
  law_balance: plain(core("Object.fromEntries(Object.entries(WALK).filter(([k])=>k.startsWith('LAW_')))")),
  base_balance: plain(bases("Object.fromEntries(Object.entries(WALK).filter(([k])=>k.startsWith('MIL_')))")),
  vehicle_availability: plain(bases("Object.fromEntries(Object.entries(WA_VEH).map(([k,v])=>[k,{era:v.era,age:v.age,inv:v.inv,obs:v.obs,tame:v.tame,wpn:v.wpn}]))")),
};
const failed = results.filter(r => r.status === 'failed').length;
const report = { work_package_id: 'WP-WALK-LAW-BASES', environment: `Node ${process.version} | isolated VM | ${process.platform}`,
  sources: manifest, declarations, results, passed: results.length - failed, failed, runtime_verified: false };
fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed}/${results.length} isolated checks passed`);
if (failed) process.exitCode = 1;
