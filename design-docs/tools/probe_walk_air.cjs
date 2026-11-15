'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-air');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['index.html', 'walk.js', 'walkact.js', 'walkair.js', 'walkeco.js', 'walkgen.js', 'walklaw.js', 'walkmil.js', 'walksea.js'];
const sources = {};
fs.mkdirSync(copy, { recursive: true });
const manifest = names.map(name => {
  const relative = `EarthSimulator/${name}`;
  const destination = path.join(copy, name);
  fs.copyFileSync(path.join(root, relative), destination);
  const data = fs.readFileSync(destination);
  sources[name] = data.toString('utf8');
  return { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
});
const source = new vm.Script(sources['walkair.js'], { filename: 'copied-walkair.js' });
const noop = () => {};
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const calls = [];
  const st = { uid: 10, era: 5, tech: 12, name: 'Fixture', inventions: ['airship', 'flight'] };
  const WK = { time: 20, pl: { cell: 480, x: 6200, y: 0, z: 6200, yaw: 0, pitch: 0, shake: 0,
    hp: 100, hurtT: 0, veh: null }, ui: {}, keys: {}, held: {}, plans: new Map(), wx: {},
    fac: Array(961).fill(0), facOf: Array(961).fill(-1), roadBits: Array(961).fill(0), detail: 1 };
  const context = {
    WALK: { CELL: 400, HP: 100, REGEN_DELAY: 20, HP_REGEN: 2 },
    W: { simYear: 20, isWater: Array(961).fill(false) }, WK, WKP: { jobT: {} }, st,
    GRID: { W: 31, H: 31, N: 961 }, WK_FAC: { AIRPORT: 2, BASE: 1 },
    WK_DX: [1, 0, -1, 0], WK_DZ: [0, 1, 0, -1], statesByCell: {},
    WA: { npcs: [], animals: [], vehs: [], vehGone: new Set(), tEng: 100, fire: false },
    WA_VEH: {}, WA_DRAW: {}, WA_PHYS: {}, WA_VWPN: {}, WA_TARGETS: [], WA_NPC_KINDS: {},
    WK_RECIPE: {}, WK_COL: {}, WK_IMP: {}, WK_FAC_PLAN: {}, WK_CHUNK_HOOKS: [], WK_WINDOWS: {}, WK_KEYS: {}, WK_MARKS: [],
    waOn: (event, fn) => calls.push(['hook', event, fn.name]),
    T: (ru, en) => en, TF: (ru,en,...values) => en.replace(/\{(\d+)\}/g, (_,i) => values[i]),
    TFC: (context,ru,en,...values) => en.replace(/\{(\d+)\}/g, (_,i) => values[i]),
    keyTxt: s => s, clamp: (x,a,b) => Math.max(a,Math.min(b,x)), clamp01: x => Math.max(0,Math.min(1,x)),
    wkSty: era => Math.max(0,Math.min(7,era|0)), wkLk: era => [0,1,2,2,3,3,4,5][era|0],
    wkTerrainY: () => context.ground, wkGround: () => context.ground, wkWaterAt: () => context.water,
    wkCollide: (x,z) => ({ x, z, top: context.ground, hit: false }),
    wkSurface: () => 'grass', wkOcc: () => context.occupancy, wkCellAt: () => context.cell,
    wkH3: () => context.hash, wkStateOf: cell => context.statesByCell[cell] ?? st,
    wkInv: (owner,key) => !!owner?.inventions.includes(key), waCol: () => [0.2,0.3,0.6],
    wkWage: () => 100, wkRep: () => context.reputation, ecoDay: () => context.day,
    wkPay: (uid,n,kind) => {calls.push(['pay',uid,n,kind]); if(context.money<n)return false;context.money-=n;return true;},
    wkEarn: (uid,n,kind) => {calls.push(['earn',uid,n,kind]);context.money+=n;},
    wkMoney: () => context.money, wkFmtMoney: (uid,n) => `${uid}:${n}`,
    waHeat: () => context.heat, waHeatAdd: (...args) => calls.push(['heat',...args]),
    waCrime: (level,x,z) => calls.push(['crime',level,x,z]), waAngry: n => {n.hostile=true;},
    wkRepAdd: (...args) => calls.push(['reputation',...args]), ecoStat: (...args) => calls.push(['stat',...args]),
    wkRadio: noop, wkMsg: noop, wkSay: noop, wkSfx: noop, wkHudSet: noop,
    waPuff: noop, waGroundPuff: noop, waBlast: noop, waActNoise: noop, wkActNoise: noop,
    wkPlaceName: cell => 'Place '+cell, wkCityName: cell => 'City '+cell,
    wkHurt: (...args) => calls.push(['hurt',...args]), wkLocUpdate: noop,
    waVehSpawn: (type,x,z,yaw,opts) => ({...opts,type,x,y:opts.y??context.ground,z,yaw,seed:opts.seed??0.5,
      V:context.WA_VEH[type],odo:0,sp:opts.sp||0,hp:opts.hp||100,hp0:opts.hp||100,
      ai:typeof opts.ai==='function'?opts.ai:null}),
    waVehRemove: v => {v.gone=true;calls.push(['remove',v.type]);},
    wkVehEnter: v => {WK.pl.veh=v;v.pl=true;calls.push(['enter',v.type]);return true;},
    wkVehExit: force => {if(WK.pl.veh)WK.pl.veh.pl=false;WK.pl.veh=null;calls.push(['exit',force]);},
    wkStreamPlan: (...args) => calls.push(['stream',...args]), wkVeil: noop,
    ground: 0, water: -100, occupancy: 9, cell: 480, hash: 0.3, money: 1000, reputation: 0, day: 10, heat: 0, calls,
  };
  context.window = context;
  vm.createContext(context);
  source.runInContext(context, {timeout: 3000});
  const run = code => vm.runInContext(code, context, {timeout: 3000});
  run(`
    const makePlane=(type='prop', opts={})=>waPlaneSpawn(type,6200,6200,0,{exact:true,...opts});
    const makeField=(ci=480)=>{
      WK.fac[ci]=WK_FAC.AIRPORT;
      const L=airLayout(ci), F={ci,L,active:true,stands:[],n:0,mast:null,closed:0};
      AIR.fields.set(ci,F); return F;
    };
    const makeTicket=()=>{
      const F=makeField(), v=makePlane('propliner'), stand={i:0,plane:v,type:'propliner'};
      F.stands=[stand]; v.A.stand=stand;
      const X={ci:480,dest:{ci:490,x:10200,z:6200},v,uid:10,price:100,crime0:2,ph:'board',t:0,done:false};
      AIR.pax=v.A.pax=X; v.crime=0; return {F,v,X};
    };
    const makeJob=(extra={})=>{
      const v=makePlane('prop'), F=makeField(), ax={x:6200,z:6200,tx:0,tz:1,hdg:180};
      const J={ci:480,uid:10,v,kind:'trip',dest:{ci:480,x:6200,z:6200},pay:100,cs:'Test',
        ph:'depart',t:0,T:100,airT:0,flew:false,ground:0,pi:0,pts:[],from:ax,ax,crime0:2,
        said:{},out:0,km:4,done:false,...extra};
      AIR.job=v.A.job=J; v.crime=0; WK.pl.veh=v; return {v,F,J};
    };
    calls.length=0;
  `);
  return run;
}

const declarations = plain(fixture()(`({
  types:AIR_T,vehicleDefinitions:airVehDefs(),parachute:AIR_CHUTE,
  settings:Object.fromEntries(Object.entries(WALK).filter(([key])=>key.startsWith('AIR_'))),
  passengerTypes:Object.keys(AIR_PAX_OK),pilotTypes:Object.keys(AIR_JOB_OK),
  physicalModels:Object.keys(WA_PHYS),windows:Object.keys(WK_WINDOWS)
})`));
const results = [];
function check(group,label,code,expected) {
  const id = `AV${String(results.length+1).padStart(2,'0')}-${group}`;
  try {
    assert.deepEqual(plain(fixture()(`{ ${code} }`)),expected);
    results.push({id,label,status:'passed'});
  } catch(error) {
    console.error(`${id} ${label}\n${error.stack}`);
    results.push({id,label,status:'failed',error:error.message});
  }
}

check('generation','Airship-only aviation creates a station without an airplane generation',
  `st.inventions=['airship']; const L=airLayout(480); [L.station,!!L.mast,airTypesOf(L),L.pad,L.era];`,
  [true,true,null,null,3]);
check('generation','Epoch and inventions select propeller, jet and future generations',
  `const a=airTypesOf(airLayout(480)); st.era=6;st.inventions=['flight','jet'];const b=airTypesOf(airLayout(480));
   st.era=7;st.inventions=[];const c=airTypesOf(airLayout(480));[a,b,c];`,
  [{big:'propliner',small:'biplane'},{big:'liner',small:'prop'},{big:'liner5',small:'taxi5'}]);
check('generation','The more advanced field or host state supplies aviation',
  `statesByCell[481]={uid:20,era:6,tech:14,inventions:['flight','jet']}; WK.facOf[480]=481;
   [airGenOf(480).st.uid,airGenOf(480).era,airGenOf(480).old];`, [20,4,false]);
check('generation','Facility filtering removes airports with no usable aviation',
  `st.inventions=[]; const F=[0,2,1],O=[-1,480,480]; airFacFilter(F,O); [F,O];`, [[0,0,1],[-1,-1,480]]);
check('generation','Field coordinates round-trip and the layout key tracks generation',
  `const L=airLayout(480),p=airW(L,23,-14),a=airLocal(L,...p); st.inventions.push('jet');
   [a,airLayout(480)!==L];`, [[23,-14],true]);
check('generation','Empty stand probability and civil type substitutions are explicit',
  `const L=airLayout(480); hash=0.9; const a=airStandType(L,0); hash=0.3;
   [a,airStandType(L,0),airTypeFor('fighter',480),airTypeFor('prop',480)];`, [null,'propliner','pfighter','biplane']);
check('generation','Spawn gives helicopters rotor state and fixed gear to biplanes',
  `const h=makePlane('heli',{y:100}),b=makePlane('biplane'); [h.A.heli,h.A.rotS,h.A.air,b.A.gear,b.A.gearT];`, [1,1,true,1,1]);

check('traffic','Incoming final inside the departure gap blocks runway entry',
  `const F=makeField(),v=makePlane(); v.A.field=F;v.A.ai={k:'arr',ph:'final',s:400};v.sp=30;
   const a=airRwyBlocker(F,null)===v;v.A.ai.s=1000;[a,airRwyBlocker(F,null)];`, [true,null]);
check('traffic','Waiting departures receive a fair window against new arrivals',
  `const F=makeField(),v=makePlane();v.A.field=F;v.A.ai={k:'dep',ph:'hold',wait:12};
   const a=airArrBusy(F);v.A.ai.wait=12.1;[a,airArrBusy(F),airDepBusy(F)];`, [false,true,true]);
check('traffic','Earlier departures retain precedence on the taxiway',
  `const F=makeField(),a=makePlane(),b=makePlane();
   a.A.field=b.A.field=F;a.A.ai={k:'dep',ph:'push',ord:1};b.A.ai={k:'dep',ph:'push',ord:2};
   const no=airDepGo(F,b,b.A.ai);[no,airDepGo(F,a,a.A.ai),F.twy===a];`, [false,true,true]);
check('traffic','Stale taxiway ownership does not keep the lane busy',
  `const F=makeField(),v=makePlane();F.twy=v; const a=airLaneBusy(F,null);
   v.A.field=F;v.A.ai={k:'arr',ph:'taxi'};const b=airLaneBusy(F,null);v.A.dead=true;
   [a,b,airLaneBusy(F,null)];`, [false,true,false]);
check('traffic','Parking completion releases taxiway, stand reservation and movement count',
  `const F=makeField(),v=makePlane('propliner'),s={i:0,rsv:true};F.n=1;F.twy=v;v.A.field=F;
   v.A.ai={k:'arr',ph:'park',st:s};airTrafficAi(v,0.1);
   [F.n,F.twy,v.A.ai,s.plane===v,s.rsv,v.parked,v.stairs];`, [0,null,null,true,false,true,true]);
check('traffic','A seated passenger does not block the scripted runway',
  `const F=makeField(); WK.pl.veh={A:{pax:{}}};airRunwayBusy(F);`, false);

check('flight','Landing surfaces use plan occupancy and water before terrain fallback',
  `WK.plans.set(480,{});const a=airSurf(6200,6200).k;water=1;
   [a,airSurf(6200,6200).k];`, ['paved','water']);
check('flight','Manual gear input disables automatic gear and fixed gear remains down',
  `const v=makePlane();v.A.air=true;v.A.vv=2;
   airGearStep(v,1,{gearCmd:-1},50,40,AIR_T.prop);const a=[v.A.gearAuto,v.A.gear];
   const b=makePlane('biplane');airGearStep(b,1,{gearCmd:-1},50,40,AIR_T.biplane);[a,b.A.gear];`, [[false,0.5],1]);
check('flight','Automatic gear responds to climb and low descending flight',
  `const v=makePlane();v.A.air=true;v.A.vv=2;airGearStep(v,2,{},50,40,AIR_T.prop);const a=v.A.gear;
   v.A.vv=-2;airGearStep(v,2,{},40,30,AIR_T.prop);[a,v.A.gear];`, [0,1]);
check('flight','Low airspeed raises stall and lowers the nose',
  `const v=makePlane('prop',{y:300,sp:10});airFlight(v,0.1,{...AIR_I0,hold:true});
   [v.A.stall,v.A.th<0,Number.isFinite(v.x+v.y+v.z)];`, [1,true,true]);
check('flight','Airspeed above stall range clears the stall state',
  `const v=makePlane('prop',{y:300,sp:40});airFlight(v,0.1,{...AIR_I0,hold:true});
   [v.A.stall,v.A.air];`, [0,true]);
check('flight','Ceiling drives requested pitch downward',
  `const v=makePlane('prop',{y:700,sp:40});airFlight(v,0.1,{...AIR_I0,aimPitch:0.3});v.A.th<0;`, true);
check('flight','An idle aircraft stays stationary and reverse tug has a bounded speed',
  `const v=makePlane();airFlight(v,1,{...AIR_I0});const a=v.sp;
   airFlight(v,1,{...AIR_I0,rev:true});airFlight(v,1,{...AIR_I0,rev:true});[a,v.sp];`, [0,-3.2]);
check('flight','Assisted ground roll crosses into flight after rotation',
  `const v=makePlane('prop');v.sp=32;airFlight(v,0.1,{...AIR_I0,thrSet:1,aimPitch:0.2});
   [v.A.air,v.A.liftT];`, [true,20]);
check('flight','Passenger booking protects the aircraft health pool',
  `const v=makePlane();const hp=v.A.ahp;v.A.pax={};airDamage(v,100,null,'shot');
   [v.A.ahp===hp,v.A.dead===undefined];`, [true,true]);
check('flight','Frame damage transfers to the separate airframe pool and resets the frame',
  `const v=makePlane();v.hp-=20;const h=v.A.ahp;airTakeFrameDamage(v);[h-v.A.ahp,v.hp===v.hp0];`, [20,true]);
check('flight','Gear-up mild touchdown damages the belly',
  `WK.plans.set(480,{});const v=makePlane();const hp=v.A.ahp;
   airTouch(v,{sink:2,sp:20,gear:0,bank:0,th:0,x:v.x,z:v.z},WK.pl);
   [v.A.belly,Math.round((hp-v.A.ahp)/hp*100),!!v.A.dead];`, [1,32,false]);

check('rotor_zep','Helicopter takes off after the rotor reaches operating speed',
  `const v=makePlane('heli');v.A.rotS=1;airHeliFlight(v,0.1,{f:0,s:0,up:1,aimYaw:0});
   [v.A.air,v.A.vv,v.sp];`, [true,0.8,1.6]);
check('rotor_zep','Rotor loss produces descent',
  `const v=makePlane('heli',{y:100});v.A.rotS=0;v.A.rotT=0;
   airHeliFlight(v,0.1,{f:0,s:0,up:0,aimYaw:null});[v.A.vv<0,v.A.air];`, [true,true]);
check('rotor_zep','Airship ballast shifts equilibrium upward and consumes reserve',
  `const v=makePlane('zep',{y:100});const Z=airZepState(v);
   airZepFlight(v,1,{..._airZI0,ball:true},Z);[Z.eqY,Math.round(Z.ball*520),v.y>100];`, [109,511,true]);
check('rotor_zep','Airship gas shifts equilibrium downward and consumes reserve',
  `const v=makePlane('zep',{y:100});const Z=airZepState(v);
   airZepFlight(v,1,{..._airZI0,gas:true},Z);[Z.eqY,Math.round(Z.gas*520),v.y<100];`, [91,511,true]);
check('rotor_zep','Airship wind is smoothed in flight and disabled while mooring',
  `const v=makePlane('zep',{y:100}),Z=airZepState(v);WK.wx={wind:2,windX:1,windZ:0};v.A.agl=100;
   airZepWind(v,v.A,Z,1);const a=Z.wx;Z.moor={};airZepWind(v,v.A,Z,1);[a>0,Z.wx<a,Z.wz];`, [true,true,0]);
check('rotor_zep','Mooring winch reaches the lock and refills ballast',
  `const F=makeField(),v=makePlane('zep',{y:100}),Z=airZepState(v);F.mast={zep:true};
   Z.moor={ph:'winch',t:0,T:9,x0:v.x,y0:v.y,z0:v.z,yaw0:0,F,M:{x:6210,y:20,z:6200,yaw:0}};
   airZepMoorStep(v,9,Z);Z.ball=0;airZepMoorStep(v,1,Z);
   [Z.moor.ph,v.A.air,F.mast.plane===v,Z.ball,v.x,v.y];`, ['lock',false,true,0.025,6210,20]);
check('rotor_zep','Casting off releases the mast and gives positive buoyancy',
  `const F=makeField(),v=makePlane('zep'),Z=airZepState(v);const s=F.mast={zep:true,plane:v};
   v.A.stand=s;Z.moor={ph:'lock',F};airZepCastOff(v,Z);
   [s.plane,v.A.stand,Z.moor,v.A.air,Z.eqY-v.y];`, [null,null,null,true,26]);

check('passenger','Fare uses origin wage, distance ceiling and foreign surcharge',
  `[airPaxPrice(st,10,false),airPaxPrice(st,10,true),airPaxPrice(st,100,true)];`, [170,213,750]);
check('passenger','Cruise speed clamps while displayed ETA includes non-cruise time',
  `[airPaxVc(3000,false),airPaxVc(30000,false),airPaxEta(3000,false),airPaxVc(30000,true)];`, [90,200,188,62]);
check('passenger','Destinations enforce minimum distance and emit both allowed travel modes',
  `WK.fac[481]=WK.fac[490]=WK_FAC.AIRPORT;const d=airPaxDests(480);d.map(f=>[f.ci,f.zep]);`,
  [[490,false],[490,true]]);
check('passenger','Wanted state and an existing ticket block ticket sale',
  `heat=1;const a=!!airPaxWhy(480);heat=0;makeTicket();[a,!!airPaxWhy(480)];`, [true,true]);
check('passenger','Insufficient funds leave the aircraft unbooked',
  `const {F,v}=makeTicket();AIR.pax=null;v.A.pax=null;money=50;
   const ok=airPaxBuy(480,{ci:490,x:10200,z:6200,d:4000,km:4,price:100,zep:false});
   [ok,AIR.pax,v.A.pax,money];`, [false,null,null,50]);
check('passenger','Ticket purchase reserves the selected aircraft and removes its crime marker',
  `const {F,v}=makeTicket();AIR.pax=null;v.A.pax=null;v.crime=2;
   const ok=airPaxBuy(480,{ci:490,x:10200,z:6200,d:4000,km:4,price:100,zep:false});
   [ok,AIR.pax.v===v,v.crime,money];`, [true,true,0,900]);
check('passenger','Refund restores the marker and pays 80 percent once',
  `const {v,X}=makeTicket();airPaxEnd(false,'',true);airPaxEnd(false,'',true);
   [X.done,v.crime,v.A.pax,calls.filter(c=>c[0]==='earn')];`, [true,2,null,[['earn',10,80,'refund']]]);
check('passenger','Destroyed boarding aircraft refunds a waiting ticket',
  `const {v,X}=makeTicket();v.A.dead=true;airPaxTick(1);[X.done,X.ok,calls.filter(c=>c[0]==='earn')];`,
  [true,false,[['earn',10,80,'refund']]]);
check('passenger','Missed boarding timeout forfeits the ticket',
  `const {X}=makeTicket();airPaxTick(301);[X.done,calls.filter(c=>c[0]==='earn')];`, [true,[]]);
check('passenger','Leaving the airfield also forfeits a waiting ticket',
  `const {X}=makeTicket();WK.pl.x+=651;airPaxTick(1);[X.done,calls.filter(c=>c[0]==='earn')];`, [true,[]]);
check('passenger','Ordinary exit is blocked while the ticket flight is en route',
  `const {v,X}=makeTicket();X.ph='cruise';[airPaxExit(v,false),X.done];`, [false,false]);
check('passenger','Skip keeps final approach distance and requests scene streaming',
  `const {v,X}=makeTicket();X.zep=false;X.wi=0;airPaxSkip(v,X,[26200,6200],20000,true);
   [v.x,Math.hypot(v.x-26200,v.z-6200),X.skT,calls.filter(c=>c[0]==='stream').length];`, [17200,9000,3,1]);

check('jobs_rental','Pilot pay has distance cap, reputation adjustment and separate airship scale',
  `reputation=100;[airJobPay(st,'trip',10,false),airJobPay(st,'trip',100,false),airJobPay(st,'loop',0,true)];`, [575,688,300]);
check('jobs_rental','Cooldown uses successful origin-day record and includes the one-day boundary',
  `WKP.jobT[airJobKey(480)]=10;const a=airJobCool(480);day=11;[a,airJobCool(480)];`, [true,false]);
check('jobs_rental','Dispatch rejects wanted players',
  `heat=1;!!airJobWhy(480);`, true);
check('jobs_rental','Contract acceptance binds the legal aircraft and distinct boarding timer',
  `const F=makeField(),v=makePlane();const s={i:0,plane:v};F.stands=[s];v.A.stand=s;
   const ok=airJobAccept(480,{kind:'trip',ci:490,x:10200,z:6200,d:4000,km:4,pay:100});
   [ok,v.crime,AIR.job.ph,Math.round(AIR.job.T)];`, [true,0,'board',324]);
check('jobs_rental','Boarding the service aircraft starts the flight clock',
  `const {v,J}=makeJob({ph:'board',t:120});airJobBoard(v);[J.ph,J.t];`, ['depart',0]);
check('jobs_rental','Completed flight pays an intact-aircraft bonus and cooldown once',
  `const {v,J}=makeJob();airJobWin();airJobTick(0.1);
   [J.done,J.ok,J.paid,v.crime,WKP.jobT['480:pilot'],calls.filter(c=>c[0]==='earn'||c[0]==='reputation')];`,
  [true,true,115,2,10,[['earn',10,115,'job'],['reputation',10,0.8]]]);
check('jobs_rental','A wrong field after a confirmed flight fails without payment',
  `const {J}=makeJob({flew:true,airT:13});cell=481;airJobTick(3.1);
   [J.done,J.ok,calls.filter(c=>c[0]==='earn')];`, [true,false,[]]);
check('jobs_rental','Target pavement and sufficient flight history complete a pilot trip',
  `const {J}=makeJob({flew:true,airT:13});WK.plans.set(480,{});airJobTick(0.1);[J.done,J.ok,J.paid];`, [true,true,115]);
check('jobs_rental','Expired contract and abandoned cockpit fail without payment',
  `const {J}=makeJob({t:100});airJobTick(0.1);[J.done,J.ok,calls.filter(c=>c[0]==='earn')];`, [true,false,[]]);
check('jobs_rental','Airship passenger boarding gates departure and then finishes',
  `const {v,J}=makeJob({zep:true,ph:'pax',pax:10,paxIn:0,paxT:0});const a=!!airZepJobHold(v);
   airZepJobTick(J,22);[a,J.ph,J.paxIn,airZepJobHold(v)];`, [true,'depart',10,'']);
check('jobs_rental','Airship timetable applies a late flag only beyond its tolerance',
  `const {v,J}=makeJob({zep:true,ph:'depart',depAt:100});WK.time=145;airZepCastHook(v,null);
   const a=J.late;J.depT=0;WK.time=145.1;airZepCastHook(v,null);[a,J.late];`, [false,true]);
check('jobs_rental','Airship final award combines intact and timetable bonuses',
  `const {J}=makeJob({zep:true,late:false});airJobWin();[J.paid,J.done];`, [135,true]);
check('jobs_rental','Rental cancellation before boarding refunds 80 percent',
  `const {J}=makeJob({kind:'rent',ph:'board',price:120});airRentCancel('');
   [J.done,calls.filter(c=>c[0]==='earn')];`, [true,[['earn',10,96,'refund']]]);
check('jobs_rental','Rental cancellation after boarding has no refund',
  `const {J}=makeJob({kind:'rent',ph:'depart',price:120});airRentCancel('');
   [J.done,calls.filter(c=>c[0]==='earn')];`, [true,[]]);
check('jobs_rental','Rental grace is inclusive until strictly exceeded',
  `const {v,J}=makeJob({kind:'rent',T:600,t:675});const a=airRentTick(J);
   J.t=675.1;const b=airRentTick(J);[a,b,J.done,v.crime,!!AIR.hj];`, [false,true,true,2,true]);

check('law','Hijack escalates civil and military theft at different minimum levels',
  `const v=makePlane();WK.pl.veh=v;airHijackStart(v,false);
   const a=calls.filter(c=>c[0]==='heat');calls.length=0;
   const m=makePlane('fighter',{owner:'mil'});WK.pl.veh=m;airHijackStart(m,false);[a,calls.filter(c=>c[0]==='heat')];`,
  [[['heat',2,'hijack']],[['heat',3,'hijack']]]);
check('law','A nation without flight cannot supply interceptors',
  `st.inventions=['airship'];const v=makePlane('zep');WK.pl.veh=v;airHijackStart(v,false);
   airScramble(AIR.hj);[AIR.hj.noAir,AIR.hj.waves,AIR.hj.fighters.length];`, [true,3,0]);
check('law','Interceptor type follows real epoch and jet discovery',
  `const a=airMilType(st);st.inventions.push('jet');const b=airMilType(st);st.era=7;
   [a,b,airMilType(st)];`, ['pfighter','fighter','drone']);
check('law','Grounded arrival after stolen flight closes the incident and emits crime',
  `const F=makeField(),v=makePlane();WK.pl.veh=v;airHijackStart(v,false);AIR.hj.wasAir=true;
   airHijackTick(0.1);[AIR.hj.done,AIR.hj.res,calls.filter(c=>c[0]==='crime')];`,
  [true,'landed',[['crime',2,6200,6200]]]);
check('law','Airborne aircraft and canopy each block map teleport',
  `const v=makePlane('prop',{y:100});WK.pl.veh=v;const a=typeof airCanTp();WK.pl.veh={C:{}};
   const b=typeof airCanTp();WK.pl.veh=null;[a,b,airCanTp()];`, ['string','string',true]);

check('parachute','Manual bailout includes the 45-meter boundary',
  `const v=makePlane('prop',{y:44});WK.pl.veh=v;const a=airBail(v,false);v.y=45;
   [a,airBail(v,false),WK.pl.veh.type,v.A.abandoned];`, [false,true,'chute',true]);
check('parachute','Destruction by a shot above the safety margin ejects into a canopy object',
  `const v=makePlane('prop',{y:200,sp:40});WK.pl.veh=v;airDestroy(v,'shot',null);
   [v.A.dead,WK.pl.veh.type,calls.filter(c=>c[0]==='hurt')];`, [true,'chute',[]]);
check('parachute','Low-altitude destruction reaches the common fatal-damage path',
  `const v=makePlane('prop',{y:60,sp:40});WK.pl.veh=v;airDestroy(v,'shot',null);
   [WK.pl.veh,calls.filter(c=>c[0]==='hurt')];`, [null,[['hurt',400,'blast']]]);
check('parachute','Automatic deployment begins below 200 meters',
  `const v=airMakeChute(6200,199,6200,0,0,-10,0);WK.pl.veh=v;airParaStep(v,0.1,WK.pl);
   [v.C.st,v.C.open];`, [1,0]);
check('parachute','Opening phase reaches deployed canopy and safe descent',
  `const v=airMakeChute(6200,100,6200,0,0,-10,0);v.C.st=1;WK.pl.veh=v;
   airParaStep(v,1.4,WK.pl);[v.C.st,v.C.open,Math.round(v.C.vy*10)];`, [2,1,-52]);
check('parachute','Unopened land impact defers fatal damage and repeated exit is idempotent',
  `const v=airMakeChute(6200,0,6200,0,0,-54,0);v.C.landed='land';v.C.gy=0;v.C.hit=54;
   airParaExit(v,true);const a={...AIR.pend};airParaExit(v,true);[a,AIR.pend,v.C.st];`,
  [{dmg:999,why:'fall'},{dmg:999,why:'fall'},3]);
check('parachute','Canopy water landing avoids a hard land-impact award',
  `const v=airMakeChute(6200,0,6200,0,0,-5.2,0);v.C.st=2;v.C.landed='water';v.C.gy=1;v.C.hit=5.2;
   airParaExit(v,true);[AIR.pend,WK.pl.onGround,Math.round(WK.pl.y*10)];`, [null,false,-2]);
check('parachute','Soft clear preserves gone stands while full clear removes them',
  `AIR.gone.add(1);AIR_LAYC.set(480,{});airClear(false);const a=AIR.gone.size;airClear(true);
   [a,AIR.gone.size,AIR_LAYC.size,AIR.pax,AIR.job,AIR.hj];`, [1,0,0,null,null,null]);

const passed = results.filter(row=>row.status==='passed').length;
const report = {work_package_id:'WP-WALK-AIR',runtime_verified:false,sources:manifest,
  environment:{node:process.version,kind:'full copied walkair.js in isolated VM with synthetic scene and adapters'},
  declarations,passed,failed:results.length-passed,results};
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Air: ${passed}/${results.length} isolated checks passed.`);
process.exitCode=report.failed?1:0;
