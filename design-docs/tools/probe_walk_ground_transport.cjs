'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-ground-transport');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['index.html', 'walk.js', 'walkact.js', 'walkair.js', 'walkeco.js', 'walkgen.js', 'walklaw.js', 'walkmil.js', 'walkrail.js', 'walksea.js'];
const sources = {};
fs.mkdirSync(copy, { recursive: true });
const manifest = names.map(name => {
  const relative = `EarthSimulator/${name}`;
  const target = path.join(copy, name);
  fs.copyFileSync(path.join(root, relative), target);
  const data = fs.readFileSync(target);
  sources[name] = data.toString('utf8').replace(/\r\n/g, '\n');
  return { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
});

function block(file, start, end) {
  const source = sources[file], first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert(first >= 0 && last > first, `${file}: ${start}..${end}`);
  return source.slice(first, last);
}
function fn(file, name) {
  const start = `function ${name}(`, line = block(file, start, '\n');
  return line.trimEnd().endsWith('}') ? line : block(file, start, '\n}\n') + '\n}';
}
const act = (...names) => names.map(name => fn('walkact.js', name)).join('\n');
const noop = () => {};
const events = [];
const W = { isWater: Array(49).fill(false), simTick: 0 };
const WK = { time: 10, pl: { x: 10, y: 0, z: 10, yaw: 0, cell: 24, shake: 0 },
  tier: Array(49).fill(2), hc: Array(49).fill(0), roadBits: Array(49).fill(0), railBits: Array(49).fill(0),
  fac: Array(49).fill(0), plans: new Map(), ui: {}, keys: {}, env: { night: 0 }, dynCols: [] };
const WA = { npcs: [], animals: [], soldiers: [], vehs: [], junc: new Map(), jwait: new Map() };
const ctx = vm.createContext({ WALK: { RADIUS: 0.4, CELL: 500 }, W, WK, WA, GRID: { W: 7, H: 7, N: 49 },
  WK_T: { INNER: 4 }, WK_DX: [1, 0, -1, 0], WK_DZ: [0, 1, 0, -1],
  WA_PHYS: {}, WA_DRAW: {}, WA_TARGETS: [], WK_RECIPE: {}, WK_COL: {}, WK_IMP: {}, WK_KEYS: {}, WK_MARKS: [],
  WK_FAC_PLAN: {}, WK_CHUNK_HOOKS: [], waOn: noop, wkJobAdd: (key, spec) => events.push(['register',key,spec.at ?? null]),
  clamp: (v,a,b) => Math.max(a, Math.min(b,v)), clamp01: v => Math.max(0,Math.min(1,v)),
  T: (ru,en) => en, TF: (ru,en,...args) => en.replace(/\{(\d+)\}/g, (_,i) => args[i]),
  keyTxt: s => s, wkMsg: s => events.push(['message',s]), wkSfx: noop, wkHudSet: noop, waPuff: noop, waPart: noop,
  wkWageAt: () => 100, wkFmtMoney: (uid,n) => `${uid}:${n}`, wkStateOf: cell => cell < 0 ? null : {uid: cell},
  wkPay: (uid,n,k) => { events.push(['pay',uid,n,k]); return WK.money >= n; },
  wkEarn: (...args) => events.push(['earn',...args]), ecoRep: (...args) => events.push(['rep',...args]),
  wkGround: () => 0, wkTerrainY: () => 0, wkHeight: () => 2, wkCellAt: () => 24,
  wkCollide: (x,z) => ({x,z,hit:false}), wkRng: () => () => 0,
  wkLegPoint: (i,k,t,out) => {out[0]=200;out[1]=10;return out;}, wkLegClass: () => 3,
  wkEraOf: () => WK.era ?? 4, wkInv: () => WK.inv ?? true, wkVehHas: () => WK.tame ?? true,
  wkRailClass: () => WK.cls ?? 1, wkH3: () => WK.hash ?? 0,
  wkStationZone: i => WK.stations?.[i] || null,
  waCrime: (...args) => events.push(['crime',...args]), waHeatAdd: (...args) => events.push(['heat',...args]),
  wkVehEnter: v => { WK.pl.veh = v; return true; }, wkVehExit: force => events.push(['exit',force]),
  waDamage: (n,d,by) => { n.dead = true; events.push(['actorHit',d,by]); },
  waVehWreck: v => { v.wreck = true; events.push(['wreck']); }, wkHurt: (...args) => events.push(['hurt',...args]),
  events,
});

const run = code => vm.runInContext(code, ctx, {timeout: 3000});
run(block('walkact.js', 'const WA_VEH = {', '// Реестры, которые пополняют'));
run(block('walkact.js', 'Object.assign(WA_VEH, {', '\n});') + '\n});');
run(fn('walkeco.js', 'ecoVehDefs') + '\nObject.assign(WA_VEH, ecoVehDefs());');
run(fn('walkmil.js', 'milVehDefs') + '\nObject.assign(WA_VEH, milVehDefs());');
run(block('walkmil.js', "for (const k of ['chariot',", '\n'));
run(block('walklaw.js', 'WA_VEH.police =', 'WA_DRAW.rblock'));
run(block('walklaw.js', 'if (WA_VEH.car30) WA_VEH.police30', '\n'));
run(block('walkair.js', 'const AIR_T = {', '\n};') + '\n};');
run(fn('walkair.js', 'airVehDefs'));
run(block('walkair.js', 'const AIR_CHUTE =', '\n'));
run(`{ const D=airVehDefs(); for(const k in D.D) WA_VEH[k]=Object.assign({},D.B,D.D[k],{A:AIR_T[k]});
  WA_VEH.chute=Object.assign({},AIR_CHUTE); }`);
run(block('walksea.js', 'const SEA_SHIPS = {', '\n};') + '\n};');
run(fn('walksea.js', 'seaMakeVeh') + '\nfor(const k in SEA_SHIPS) WA_VEH[k]=seaMakeVeh(k,SEA_SHIPS[k]);');
run(sources['walkrail.js']);
const declarations = JSON.parse(JSON.stringify(run(`({
  railKinds: RL_KINDS, registeredTrainTypes: Object.keys(WA_VEH).filter(k=>k.startsWith('train_')),
  railSettings: Object.fromEntries(Object.entries(WALK).filter(([key])=>key.startsWith('RAIL_'))),
  jobRegistration: events, vehicles: Object.entries(WA_VEH).map(([key,v])=>({key, ...v}))
})`)));

run(`
  var _waIn = {}, _waLp = [0, 0], WA_ROAD_V = [0, 3, 6, 9, 15, 20];
  var waIsTraffic = v => v.ai === 'traffic', waVehPick = () => WK.pick || 'car', waVehCtx = () => ({}), WA_VEHNPC = {};
  var waVehSpawn = (type,x,z,yaw,opts) => ({type,x,z,yaw,...opts}), waHookPick = () => undefined;
  const straight = (from=0,to=4000) => ({pcs:[{t:0, x0:from,z0:0,x1:to,z1:0,ux:1,uz:0,s0:0,len:to-from}],
    fin:to-from,h:0,stops:[],nodes:[],ended:false});
  const train = (props={}) => ({id:1,kind:'diesel',mode:'ai',len:60,sp:10,s:100,state:'run',door:0,
    d:10,route:straight(),cars:[{type:'loco',x:100,z:0,y:0,pitch:0,yaw:Math.PI/2,L:17.2}], ...props});
  const station = (cell,s) => ({cell,s,z:{x:s,z:0}});
  const resetJob = (p={}) => {
    const T=train({mode:'drive', sp:0, s:230, route:straight(), legal:true});
    T.route.stops=[station(24,100),station(25,200),station(26,400)];
    T.v={tr:T}; RLX.trains=[T]; WK.pl.veh=T.v; WK.pl.dead=false;
    const J={cell:24,T,stage:'drive',t:0,hold:0,hudT:100,want:2,got:0,earned:0,served:{},missed:{},...p};
    T.job=RLX.job=J; events.length=0;
    return [T,J];
  };
`);
run(act('waEdgeOk','waPickNext','waVehInput','waThrottle','waSteer','waVehCircles','waVehPushPlayer','waTrafficSpawn'));

const results = [];
function check(group, label, code, expected) {
  const id = `GT${String(results.length+1).padStart(2,'0')}-${group}`;
  try {
    assert.deepEqual(JSON.parse(JSON.stringify(run(`{ ${code} }`))), expected);
    results.push({id,label,status:'passed'});
  } catch (error) {
    console.error(`${id} ${label}\n${error.stack}`);
    results.push({id,label,status:'failed',error:error.message});
  }
}

check('road','Road edges require a reciprocal link and a valid grid neighbor',
  `WK.roadBits[25]=0; const v={V:{},era:3}; const no=waEdgeOk(v,24,0);
   WK.roadBits[25]=4; [no,waEdgeOk(v,24,0),waEdgeOk(v,27,0)];`, [false,true,false]);
check('road','Epoch, invention, husbandry and urban restriction gate progress',
  `const v={V:{inv:'auto',tame:'horse',rural:true},era:4}; WK.era=3;
   const a=waEdgeOk(v,24,0); WK.era=4; WK.inv=false; const b=waEdgeOk(v,24,0); WK.inv=true; WK.tame=false;
   const c=waEdgeOk(v,24,0); WK.tame=true; WK.tier[25]=4; const d=waEdgeOk(v,24,0);
   WK.tier[25]=2; [a,b,c,d,waEdgeOk(v,24,0)];`, [false,false,false,false,true]);
check('road','Junction chooses the viable outbound leg ahead of unavailable ones',
  `WK.roadBits[24]=11; const a=waPickNext({V:{},era:4},24,3); WK.roadBits[24]=8;
   [a,waPickNext({V:{},era:4},24,3)];`, [0,-1]);
check('road','Open UI suppresses vehicle input',
  `WK.keys={fwd:true,right:true,run:true,jump:true}; WK.ui.open='dialog'; const a={...waVehInput()};
   WK.ui.open=false; const b=waVehInput(); [a.f,a.s,a.brake,b.f,b.s,b.brake];`, [0,0,false,1,1,true]);
check('road','Throttle, neutral drag, handbrake and reverse cap',
  `const v={V:{acc:2},sp:0}; waThrottle(v,{f:1},10,1); const a=v.sp;
   waThrottle(v,{f:0},10,0.5); const b=v.sp; waThrottle(v,{f:0,brake:true},10,1); const c=v.sp;
   v.sp=-10; waThrottle(v,{f:-1},10,1); [a,Math.round(b*100),c,v.sp];`, [2,128,0,-3.5]);
check('road','Steering reverses with the direction of vehicle travel',
  `const v={V:{turn:1,max:20},yaw:0,sp:5}; const a=waSteer(v,{s:1},1); v.sp=-5;
   [Math.sign(a),Math.sign(waSteer(v,{s:1},1))];`, [-1,1]);
check('road','Long chassis has multiple collision circles and caches them',
  `const V={w:1,len:8,front:4}, a=waVehCircles(V); [a.length,a===waVehCircles(V),a[0][0]>a[3][0]];`, [4,true,true]);
check('road','Only the moving front damages the walking player in the selected overlap',
  `events.length=0; const v={V:{w:1,front:2,len:4},x:0,z:0,y:0,yaw:0,sp:10};
   const p={x:0,z:2,y:0}; waVehPushPlayer(v,p); [p.z,v.sp,events];`, [2.4,3,[['hurt',15,'crash']]]);
check('road','Invisible rail blocker is ignored by pedestrian body collisions',
  `const p={x:0,z:2,y:0}; waVehPushPlayer({V:{},rlblock:true,x:0,z:0,y:0,yaw:0,sp:10},p); p.z;`, 2);
check('road','Traffic spawns on dry reachable roads and rejects overlapping traffic',
  `const rnd=Math.random; Math.random=()=>0.5; WK.roadBits[24]=4; WA.vehs=[];
   const a=waTrafficSpawn(WK.pl,3,3,0,false);
   WA.vehs=[{x:205,z:10,ai:'traffic'}]; const b=waTrafficSpawn(WK.pl,3,3,0,false);
   W.isWater[24]=true; WA.vehs=[]; const c=waTrafficSpawn(WK.pl,3,3,0,false);
   W.isWater[24]=false; Math.random=rnd; [a,b,c];`, [true,false,false]);

check('rail_map','Map era projects to steam, modern and maglev class thresholds',
  `[rlClsOfEra(4),rlClsOfEra(5),rlClsOfEra(6),rlClsOfEra(7)];`, [1,2,2,3]);
check('rail_map','Diagonal projects to two cardinal edges and both endpoint stations',
  `const e=[]; const n=rlNetFromMap({rail:[{path:[16,24],era:5}]},(...a)=>e.push(a));
   [e,RLX.lines[0].cells,n.st[16],n.st[24],n.st[17]];`, [[[16,17,2],[17,24,2]],[16,17,24],1,1,0]);
check('rail_map','Detour avoids water and reserved facilities',
  `W.isWater[17]=true; WK.fac[23]=1; const p=rlDetour(16,24); W.isWater[17]=false; WK.fac[23]=0;
   [p[0],p.at(-1),p.includes(17),p.includes(23),p.length];`, [16,24,false,false,7]);
check('rail_map','Steam and diesel accept both conventional classes',
  `WK.cls=1; const a=['steam','diesel','electric','maglev'].map(k=>rlKindOk(k,24,0));
   WK.cls=2; const b=['steam','diesel','maglev'].map(k=>rlKindOk(k,24,0)); [a,b];`, [[true,true,false,false],[true,true,false]]);
check('rail_map','Maglev class rejects conventional traction',
  `WK.cls=3; const r=['steam','diesel','electric','maglev'].map(k=>rlKindOk(k,24,0)); WK.cls=1; r;`, [false,false,false,true]);
check('rail_map','Linear path evaluation supplies position and heading',
  `const p={}; rtAt(straight(),210,p); [p.x,p.z,p.dx,p.dz];`, [210,0,1,0]);

check('rail_service','Fare is a tenth of the current wage and verifies available funds',
  `events.length=0; WK.money=9; const a=rlPayFare(); WK.money=10; const b=rlPayFare();
   [a,b,events.filter(e=>e[0]==='pay')];`, [false,true,[['pay',24,10,'train'],['pay',24,10,'train']]]);
check('rail_service','Steam passenger stock includes a separate tender',
  `const T=train({kind:'steam'}); rlConsist(T,()=>0); T.cars.map(c=>c.type);`, ['loco','tender','coach','coach']);
check('rail_service','Freight and maglev use distinct consist recipes',
  `const A=train({kind:'diesel',freight:true}), B=train({kind:'maglev'}); rlConsist(A,()=>0); rlConsist(B,()=>0);
   [A.cars.length,A.cars[1].type,B.cars.map(c=>c.type)];`, [6,'flat',['mhead','mid','mtail']]);
check('rail_service','Regular operation and a legal job take the cab through different crime paths',
  `events.length=0; WK.pl.veh=null; const a=train({v:{}}); rlHijack(a,0,{});
   WK.pl.veh=null; const b=train({v:{}}); rlHijack(b,0,{legal:true});
   [a.mode,a.legal,b.mode,b.legal,events.filter(e=>e[0]==='crime'||e[0]==='heat')];`,
  ['drive',false,'drive',true,[['crime',2,100,0,null],['heat',1,'train']]]);
check('rail_service','Exit at low speed and two presses for moving train exit',
  `events.length=0; const T=train({sp:1.2}); rlLeaveAsk(T); T.sp=8; rlLeaveAsk(T); rlLeaveAsk(T);
   [T.jumping,events.filter(e=>e[0]==='exit')];`, [true,[['exit',false],['exit',true]]]);
check('rail_service','Maglev cab exists at both nose ends and not in a middle coach',
  `const T=train({kind:'maglev'}); rlConsist(T,()=>0); [0,1,2].map(i=>!!rlCab(T,i));`, [true,false,true]);

check('rail_dispatch','Ridden train outranks AI and equal priorities use lower id',
  `const a=train({id:2,mode:'pass'}), b=train({id:1}), c=train({id:3});
   [rlSenior(a,b),rlSenior(b,a),rlSenior(b,c),rlSenior(c,b)];`, [true,false,true,false]);
check('rail_dispatch','A job extends the player reserve and caps the reservation',
  `const T=train({mode:'drive',sp:0}); const a=rlLw(T); T.resS=1100; const b=rlLw(T);
   T.resS=9000; [a,b,rlLw(T)];`, [520,1200,2600]);
check('rail_dispatch','AI station occupancy extends its sampled window',
  `const a=train({sp:0}); const b=rlLw(a); a.state='dwell'; [b,rlLw(a)];`, [40,140]);
check('rail_dispatch','Window excludes a parallel same-direction approach',
  `const a=train({mode:'pass',sp:0}); rlWinBuild(a);
   [rlWinHit(a,112,0,1,0,9),rlWinHit(a,112,0,-1,0,9),rlWinHit(a,112,40,-1,0,9)];`, [false,true,false]);
check('rail_dispatch','Nearby trailing consist blocks reversing; distant consist does not',
  `const T=train({s:250}); const O=train({id:2,cars:[{x:165,z:0}]}); RLX.trains=[T,O];
   const a=rlTrainBehind(T,160)===O; O.cars[0].x=0; [a,rlTrainBehind(T,160)];`, [true,null]);
check('rail_dispatch','Curve limits depend on the train curve radius and lateral balance',
  `const T=train({s:30}); T.route.pcs=[{t:1,r:30,s0:20,len:50}];
   [Math.round(rlArcLimit(T,{brk:0.9})*100),Math.round(rlArcNow(T)*100)];`, [574,574]);
check('rail_dispatch','Two AI trains making contact do not enter the derail branch',
  `events.length=0; const a=train({sp:20}), b=train({sp:2}); rlCollide(a,b,b.cars[0]);
   [a.sp,!!a.dead,!!b.dead];`, [0,false,false]);
check('rail_dispatch','A fast player collision derails both consists',
  `events.length=0; WK.pl.veh=null; const a=train({sp:20,mode:'drive',v:{}}), b=train({sp:2,v:{}});
   rlCollide(a,b,b.cars[0]); [a.sp,b.sp,a.dead,b.dead,a.v.wreck,b.v.wreck];`, [0,0,true,true,true,true]);

check('rail_jobs','Precise stop pays its own station immediately and sets next reservation',
  `const [T,J]=resetJob(); rlJobTick(1.4); rlJobTick(0.1);
   [J.got,J.earned,T.resS,events.filter(e=>e[0]==='earn')];`, [1,90,430,[['earn',25,90,'job']]]);
check('rail_jobs','Edge of accepted stop pays 55 percent of the normal award',
  `const [T,J]=resetJob(); T.s=260; rlJobTick(1.4);
   [J.got,J.earned,events.filter(e=>e[0]==='earn')];`, [1,50,[['earn',25,50,'job']]]);
check('rail_jobs','Passing a platform marks it missed and does not pay for it',
  `const [T,J]=resetJob(); T.s=301; rlJobTick(0.1);
   [J.got,!!J.missed[25],T.resS,events.filter(e=>e[0]==='earn')];`, [0,true,430,[]]);
check('rail_jobs','Completing all required stations pays the origin bonus once',
  `const [T,J]=resetJob(); rlJobTick(1.4); T.s=430; rlJobTick(1.4); rlJobTick(1.4);
   [RLX.job,T.legal,events.filter(e=>e[0]==='earn'||e[0]==='rep')];`,
  [null,false,[['earn',25,90,'job'],['earn',26,90,'job'],['earn',24,50,'job'],['rep',24,0.4]]]);
check('rail_jobs','Briefly leaving a stopped train holds it and allows resumed control',
  `const [T,J]=resetJob(); WK.pl.veh=null; WK.pl.x=100; WK.pl.z=0; T.mode='ai'; rlJobTick(1);
   const a=[T.jobHold,J.away.t]; WK.pl.veh=T.v; T.mode='drive'; rlJobTick(0.1); [a,T.jobHold,J.away];`, [[1,1],0,null]);
check('rail_jobs','Leaving too long cancels without refunding an earned stop',
  `const [T,J]=resetJob(); rlJobTick(1.4); WK.pl.veh=null; T.mode='ai'; rlJobTick(151);
   [RLX.job,J.earned,events.filter(e=>e[0]==='earn')];`, [null,90,[['earn',25,90,'job']]]);
check('rail_jobs','Cooldown credits world ticks and expires on clock reversal',
  `W.simTick=20; RLX.clk=85; rlJobMarkEnd(24); W.simTick=22; RLX.clk=95;
   const a=rlJobCool(24); W.simTick=19; [a,rlJobCool(24),RLX.jobT[24]===undefined];`, [80,0,true]);
check('rail_jobs','A lost train applies a fresh cooldown',
  `const [T,J]=resetJob(); T.dead=true; rlJobTick(1);
   [RLX.job,T.job,rlJobCool(24)];`, [null,null,150]);

check('crossing','Closed crossing classification distinguishes arms and total breakage',
  `const xg={x:0,z:0,a:4,hwC:3,st:1,arm:1}; RLX.xs=[xg];
   const a=!!rlXingShut(0,0); xg.st=2; xg.arm=0.4; const b=!!rlXingShut(0,0);
   xg.broken=true; [a,b,!!rlXingShut(0,0),!!rlXingShut(20,0)];`, [false,false,true,false]);
check('crossing','Warning, lowering, locked and reopening phases control physical arms',
  `WK.pl.x=200; RLX.trains=[]; RLX.tX=99;
   const xg={x:0,z:0,st:0,arm:0,eta:10,t:0,cols:[{ai:0,on:false}],blk:[{},{}]}; RLX.xs=[xg];
   rlXingTick(0.1); const a=xg.st; rlXingTick(3.1); const b=xg.st; rlXingTick(3.5);
   const c=[xg.st,xg.cols[0].on]; xg.eta=30; rlXingTick(1.7); [a,b,c,xg.st];`, [1,2,[3,true],4]);
check('crossing','Blast damage threshold clears arm colliders for the loaded crossing',
  `const xg={x:0,z:0,a:4,cols:[{on:true}]}; RLX.xs=[xg];
   rlBlastXing(0,0,0,3,24); const a=xg.cols[0].on; rlBlastXing(0,0,0,3,25);
   [a,xg.broken,xg.cols[0].on];`, [true,true,false]);
check('crossing','Legal driver incident on a closed crossing continues at the ordinary threshold',
  `const [T,J]=resetJob(); T.sp=20; T.pedT=999; WA.npcs=[{x:100,z:0,y:0,r:0.3}];
   RLX.xs=[{x:100,z:0,a:4,hwC:3,st:3,arm:1}]; rlHit(T,0.1);
   [RLX.job===J,T.legal,events.filter(e=>e[0]==='actorHit')];`, [true,true,[['actorHit',999,null]]]);
check('crossing','Legal driver collision outside a closed crossing cancels the shift',
  `const [T,J]=resetJob(); T.sp=20; T.pedT=999; WA.npcs=[{x:100,z:0,y:0,r:0.3}];
   RLX.xs=[]; rlHit(T,0.1); [RLX.job,T.legal,events.filter(e=>e[0]==='actorHit')];`, [null,false,[['actorHit',999,null]]]);
check('crossing','Reckless closed crossing branch attributes the hit to the player',
  `const [T,J]=resetJob(); T.sp=26; T.pedT=999; WA.npcs=[{x:100,z:0,y:0,r:0.3}];
   RLX.xs=[{x:100,z:0,a:4,hwC:3,st:3,arm:1}]; rlHit(T,0.1);
   [RLX.job,T.legal,events.filter(e=>e[0]==='actorHit')];`, [null,false,[['actorHit',999,'player']]]);

run(act('wkVehEnter', 'wkActVehicle', 'waVehRelease', 'waVehDamage'));
run(`
  var WA_VWPN={}, keyPair=()=>'', keyLabel=()=>'', waHookEmit=()=>{}, waIsTraffic=()=>false;
  var waCrewFresh=v=>!!v.crew, waCrewOut=v=>{v.crewOut=true;events.push(['crewOut']);},
    waVehEject=()=>null, wkSay=()=>{}, waFlee=()=>{};
  const vehicle=()=>({V:{phys:'car',max:20,ride:1},x:10,y:0,z:10,yaw:0,sp:0,ai:null,hp:100});
  const resetVehicle=()=>{WK.pl.veh=null;WK.pl.dead=false;WA.vTarget=null;events.length=0;};
`);
check('vehicle','Common entry rejects wrecked or remotely occupied vehicles',
  `resetVehicle(); const v=vehicle(); v.wreck=1; const a=wkVehEnter(v); v.wreck=0; v.peer=1;
   const b=wkVehEnter(v); v.peer=0; [a,b,wkVehEnter(v),v.pl,v.ai,v.sp];`, [false,false,true,true,null,0]);
check('vehicle','Ordinary on-foot vehicle action refuses leaving at speed above 4.5',
  `resetVehicle(); const v=vehicle(); v.sp=5; WK.pl.veh=v; wkActVehicle();
   [WK.pl.veh===v,events.filter(e=>e[0]==='exit').length];`, [true,0]);
check('vehicle','Government transport dispatches its crime marker on entry',
  `resetVehicle(); const v=vehicle(); v.crime=3; WA.vTarget=v; wkActVehicle();
   [WK.pl.veh===v,events.filter(e=>e[0]==='crime')];`, [true,[['crime',3,10,10,null]]]);
check('vehicle','A fleeing required crew prevents entry to a litter or rickshaw',
  `resetVehicle(); const v=vehicle(); v.V.crewNeed=1; v.crewOut=true; WA.vTarget=v; wkActVehicle();
   WK.pl.veh;`, null);
check('vehicle','Damage routes through remote ownership before local health writes',
  `resetVehicle(); const v=vehicle(); v.peer=true; waVehDamage(v,10,'player','shot');
   v.peer=false; waVehDamage(v,10,'fx','shot'); waVehDamage(v,10,null,'crash'); v.hp;`, 90);
check('vehicle','Health depletion reaches the wreck handler',
  `resetVehicle(); const v=vehicle(); waVehDamage(v,101,null,'crash'); [v.hp,v.wreck];`, [-1,true]);
check('vehicle','Common parked release detaches the player and stops the vehicle',
  `resetVehicle(); const v=vehicle(); WK.pl.veh=v; v.pl=true;v.sp=10;v.air=true;
   waVehRelease(v,false,false); [WK.pl.veh,v.pl,v.sp,v.air,v.ai,v.parked];`, [null,false,0,false,null,true]);

const passed = results.filter(row => row.status === 'passed').length;
const report = {work_package_id:'WP-WALK-GROUND-TRANSPORT', runtime_verified:false, sources:manifest,
  environment:{node:process.version,kind:'isolated VM with copied shipped code'}, declarations,
  passed,failed:results.length-passed,results};
fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(report,null,2)+'\n');
console.log(`Ground transport: ${passed}/${results.length} isolated checks passed.`);
process.exitCode = report.failed ? 1 : 0;
