'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-sea');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['index.html', 'walk.js', 'walkact.js', 'walksea.js', 'walkeco.js', 'walkgen.js', 'walklaw.js', 'walkmil.js', 'trade.js'];
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
const source = new vm.Script(sources['walksea.js'], { filename: 'copied-walksea.js' });
const basisSource = sources['walkact.js'].slice(sources['walkact.js'].indexOf('function waVehBasis('));
const basis = new vm.Script(basisSource.slice(0,basisSource.indexOf('\n}')+2),{filename:'copied-walkact-basis.js'});
const noop = () => {};
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const calls = [];
  const st = { uid: 10, era: 5, tech: 12, name: 'Fixture', inventions: ['sailing', 'steamship'] };
  const WK = { time: 20, pl: { cell: 480, x: 6200, y: 0, z: 6200, yaw: 0, pitch: 0, shake: 0,
    hp: 100, hurtT: 0, veh: null, vx:0,vz:0,vy:0,onGround:true }, ui: {}, keys: {}, held: {}, plans: new Map(), plat:[], wx: {},
    fac: Array(961).fill(0), facOf: Array(961).fill(-1), roadBits: Array(961).fill(0), detail: 1 };
  const context = {
    WALK: { CELL: 400, HP: 100, REGEN_DELAY: 20, HP_REGEN: 2 },
    W: { simYear: 20, stateId:Array(961).fill(10), terrainVer:0, seaLevel:0, isWater: Array(961).fill(false) }, WK, WKP: { jobT: {} }, st,
    GRID: { W: 31, H: 31, N: 961 }, WK_FAC: { AIRPORT: 2, BASE: 1 },
    NB8:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],
    WK_DX: [1, 0, -1, 0], WK_DZ: [0, 1, 0, -1], statesByCell: {},
    WA: { npcs: [], animals: [], vehs: [], vehGone: new Set(), tEng: 100, fire: false },
    WA_VEH: {}, WA_DRAW: {}, WA_PHYS: {}, WA_VWPN: {}, WA_TARGETS: [], WA_NPC_KINDS: {},
    WK_HEAVY:[], WA_CARRY:[], WK_RECIPE: {}, WK_COL: {}, WK_IMP: {}, WK_FAC_PLAN: {}, WK_CHUNK_HOOKS: [], WK_WINDOWS: {}, WK_KEYS: {}, WK_MARKS: [],
    waOn: (event, fn) => calls.push(['hook', event, fn.name]),
    T: (ru, en) => en, TNn:(n)=>String(n), TF: (ru,en,...values) => en.replace(/\{(\d+)\}/g, (_,i) => values[i]),
    TFC: (context,ru,en,...values) => en.replace(/\{(\d+)\}/g, (_,i) => values[i]),
    keyTxt: s => s, clamp: (x,a,b) => Math.max(a,Math.min(b,x)), clamp01: x => Math.max(0,Math.min(1,x)),
    wkSty: era => Math.max(0,Math.min(7,era|0)), wkLk: era => [0,1,2,2,3,3,4,5][era|0],
    wkTerrainY: () => context.terrain, wkHeight: () => context.terrain, wkGround: () => context.ground, wkWaterAt: () => context.water,
    wkCollide: (x,z) => ({ x, z, top: context.ground, hit: false }),
    wkSurface: () => 'grass', wkOcc: () => context.occupancy, wkCellAt: () => context.cell,
    wkH3: () => context.hash, wkStateOf: cell => context.statesByCell[cell] ?? st,
    wkInv: (owner,key) => !!owner?.inventions.includes(key), waCol: () => [0.2,0.3,0.6],
    wkWageAt:()=>100, wkWage: () => 100, wkRep: () => context.reputation, ecoDay: () => context.day,
    wkPay: (uid,n,kind) => {calls.push(['pay',uid,n,kind]); if(context.money<n)return false;context.money-=n;return true;},
    wkEarn: (uid,n,kind) => {calls.push(['earn',uid,n,kind]);context.money+=n;},
    wkMoney: () => context.money, wkFmtMoney: (uid,n) => `${uid}:${n}`,
    waHeat: () => context.heat, waHeatAdd: (...args) => calls.push(['heat',...args]),
    waCrime: (level,x,z) => calls.push(['crime',level,x,z]), waAngry: n => {n.hostile=true;},
    wkRepAdd: (...args) => calls.push(['reputation',...args]), ecoStat: (...args) => calls.push(['stat',...args]),
    wkRadio: noop, wkMsg: noop, wkSay: noop, wkSfx: noop, wkHudSet: noop,
    waPuff: noop, waGroundPuff: noop, waBlast: noop, waActNoise: noop, wkActNoise: noop,
    wkPlaceName: cell => 'Place '+cell, wkCityName: cell => 'City '+cell,
    wkHurt: (...args) => calls.push(['hurt',...args]), wkLocUpdate: noop, waDry:()=>context.dry, latinNames:()=>true, walkActive:true,
    waVehInput:()=>context.input, input:{f:0,s:0,brake:false},
    waVehCollide:(v,x,z)=>({x,z,hit:false}), waVehDamage:(v,n)=>{v.hp-=n;calls.push(['damage',n]);},
    wkRng:()=>()=>context.hash, wkAgeOf:()=>st.era, wkEraOf:()=>3, dry:true,
    setTimeout:(fn)=>{calls.push(['timer']);context.pending=fn;},
    wkTeleport:(ci,opts)=>{calls.push(['teleport',ci,opts]);return context.teleportOk;},teleportOk:true,
    console:{error:noop},
    waVehSpawn: (type,x,z,yaw,opts) => ({...opts,type,x,y:opts.y??context.ground,z,yaw,seed:opts.seed??0.5,
      V:context.WA_VEH[type],odo:0,sp:opts.sp||0,hp:opts.hp??context.WA_VEH[type]?.hp??100,hp0:opts.hp??context.WA_VEH[type]?.hp??100,d:0,pitch:0,roll:0,
      ai:typeof opts.ai==='function'?opts.ai:null}),
    waVehRemove: v => {v.gone=true;calls.push(['remove',v.type]);},
    wkVehEnter: v => {WK.pl.veh=v;v.pl=true;calls.push(['enter',v.type]);return true;},
    wkVehExit: force => {if(WK.pl.veh)WK.pl.veh.pl=false;WK.pl.veh=null;calls.push(['exit',force]);},
    wkStreamPlan: (...args) => calls.push(['stream',...args]), wkVeil: noop,
    terrain: -10, ground: 1, water: 0, occupancy: 9, cell: 480, hash: 0.3, money: 1000, reputation: 0, day: 10, heat: 0, calls,
  };
  context.window = context;
  vm.createContext(context);
  basis.runInContext(context, {timeout: 3000});
  source.runInContext(context, {timeout: 3000});
  const run = code => vm.runInContext(code, context, {timeout: 3000});
  run(`
    const makeShip=(type='cog',opts={})=>waShipSpawn(type,6200,6200,0,{seed:0.3,...opts});
    const makePort=()=>{
      const b={id:0,x:6200,z:6200,gx:6210,gz:6200,gy:1,yaw:0,len:90,beam:20,state:'moored',ok:true,ship:null};
      const pl={ci:480,era:3,age:5,st,special:{port:{big:true,berths:[b],shoreX:6200,shoreZ:6200}}};
      const port={ci:480,pl,sp:pl.special.port,act:true,init:true,ctr:[6200,6200]};
      WK.plans.set(480,pl);SEA.ports.set(480,port);return {b,pl,port};
    };
    const makeMoored=()=>{const v=makeShip(),p=makePort();v.sea.mode='moored';v.sea.berth=p.b;v.sea.port=p.port;p.b.ship=v;return {v,...p};};
    const makeTicket=(ph='board')=>{const {v,b,port}=makeMoored();const X={ci:480,uid:10,price:100,km:500,days:2,
      dest:{ci:490,name:'Destination'},from:'Origin',type:'cog',seed:0.3,col:[.2,.3,.4],era:2,v,ph,t:0,done:false};
      SEA.px=v.sea.px=X;return {v,b,port,X};};
    const makeShift=(opts={})=>{
      const {v,b,pl,port}=makeMoored();const z={ci:480,b,pl,geo:{ok:true,stack:{x:6200,z:6200,y:1,hw:3,hd:3}},stk:{n:0,cap:30},pile:[],dockers:[]};
      SEA_DK.zones.set('480:0',z);const J=SEA_DK.job={ci:480,uid:10,got:0,earned:0,t0:20,hold:null,bid:0,ship:null,...opts};
      return {J,z,v,b,port};};
    calls.length=0;
  `);
  return run;
}

const declarations = plain(fixture()(`({
  types:SEA_SHIPS,vehicleDefinitions:Object.fromEntries(Object.keys(SEA_SHIPS).map(k=>[k,WA_VEH[k]])),
  settings:Object.fromEntries(Object.entries(WALK).filter(([key])=>key.startsWith('SEA_'))),
  civilEpochs:SEA_ERA_CIV,warEpochs:SEA_ERA_WAR,civilStages:SEA_STY_CIV,warStages:SEA_STY_WAR,
  ports:SEA_PORT,passengerTypes:SEA_PAX_TYPES,deckPlans:SEA_DECK,gunPorts:SEA_GUN,gunKinds:SEA_GUNK,
  crateHeights:SEA_CK,crateDimensions:SEA_CK_DIM,physicalModels:Object.keys(WA_PHYS),windows:Object.keys(WK_WINDOWS)
})`));
const results=[];
function check(group,label,code,expected){
  const id=`SV${String(results.length+1).padStart(2,'0')}-${group}`;
  try {assert.deepEqual(plain(fixture()(`{ ${code} }`)),expected);results.push({id,label,status:'passed'});}
  catch(error){console.error(`${id} ${label}\n${error.stack}`);results.push({id,label,status:'failed',error:error.message});}
}

check('generation','Registry has eight civil and seven military hulls',
  `const a=Object.values(SEA_SHIPS);[a.length,a.filter(k=>!k.war).length,a.filter(k=>k.war).length];`,[15,8,7]);
check('generation','Every ship exposes shared ship physics and sampled hull circles',
  `Object.keys(SEA_SHIPS).every(k=>WA_VEH[k].phys==='ship'&&WA_VEH[k].circles.length>=2&&WA_VEH[k].water===1);`,true);
check('generation','Stage five overrides the visible epoch mixture',
  `[seaPickType(3,.9,false,5),seaPickType(3,.1,true,5),seaPickType(3,.9,true,5)];`,['steamer','ironclad','destroyer']);
check('generation','Discovery fallback removes steam and then sails',
  `st.inventions=[];const a=seaInvSub('destroyer',st),b=seaInvSub('container',st);st.inventions=['sailing'];
   [a,b,seaInvSub('destroyer',st),seaInvSub('container',st)];`,['trireme','mgalley','frigate','carrack']);
check('generation','No-sail marker belongs to oared fallback hulls',
  `st.inventions=[];[seaNoSail('mgalley',st),seaNoSail('trireme',st),seaNoSail('cog',st)];`,[true,true,false]);
check('generation','Spawn rejects missing type and shallow water',
  `terrain=-1;[makeShip('missing'),makeShip('cog')];`,[null,null]);
check('generation','Force spawn bypasses the initial depth gate',
  `terrain=0;const v=makeShip('cog',{force:true});[v.type,v.hp,v.sea.crimeLvl,v.noF];`,['cog',420,2,true]);
check('generation','Military ship has greater theft level and naval weapon',
  `const v=makeShip('destroyer');[v.sea.crimeLvl,v.V.wpn,v.owner,v.V.armor];`,[3,'naval','sea',.85]);

check('navigation','Route needs at least two points',`seaRoute([[0,0]]);`,null);
check('navigation','Straight route preserves length endpoints speed and reverse mode',
  `const r=seaRoute([[0,0,.4,1],[0,30,.8]],{stop:true});[r.len,r.z[0],r.z[r.n-1],r.rev[0],r.stop];`,[30,0,30,1,true]);
check('navigation','Follow selects distance pose and callback',
  `const v=makeShip(),r=seaRoute([[6200,6200],[6200,6230]]);seaFollow(v,r,{s0:12,vs:2});
   [v.z,v.sea.s,v.sea.vs,v.ai===seaRouteAI];`,[6212,12,2,true]);
check('navigation','Depth sampling considers the hull width and ends',
  `const v=makeShip();wkTerrainY=(x,z)=>x>6202?-0.2:-10;seaMinDepth(v.x,v.z,0,SEA_SHIPS.cog);`,.2);
check('navigation','Manual throttle has forward and reverse limits',
  `const v=makeShip();WK.pl.veh=v;input.f=1;seaShipStep(v,10,WK.pl,false);input.f=-1;seaShipStep(v,10,WK.pl,false);
   [v.sea.th,Number.isFinite(v.x),v.air];`,[-.4,true,false]);
check('navigation','Brake stops throttle without new movement input',
  `const v=makeShip();WK.pl.veh=v;v.sea.th=.8;input.brake=true;seaShipStep(v,1,WK.pl,false);v.sea.th;`,0);
check('navigation','Unbinding frees the berth and cancels route ownership',
  `const {v,b}=makeMoored();v.sea.route={};seaUnbind(v);[b.ship,b.state,v.sea.berth,v.sea.route,v.sea.mode];`,[null,'free',null,null,'player']);
check('navigation','Harbour counts maneuvers separately from moored hulls',
  `const {v,port}=makeMoored();const a=seaPortShips(port);v.sea.mode='in';[a,seaPortShips(port)];`,[{n:1,mv:0},{n:1,mv:1}]);
check('navigation','Deck passenger holds ordinary departure',
  `const {v}=makeMoored();v.sea.pax=true;seaDepart(v);[v.sea.mode,v.sea.dwell];`,['moored',6]);
check('navigation','Active ticket holds ordinary departure',
  `const {v}=makeTicket();seaDepart(v);[v.sea.mode,v.sea.dwell];`,['moored',6]);

check('deck','Attach enables shared moving platform and sets deck passenger flag',
  `const v=makeShip();const ok=seaDeckAttach(v,0,0);[ok,SEA.dk.mode,v.deckOn,v.sea.pax,WK.plat.length,WK.pl.swim];`,[true,'deck',true,true,1,false]);
check('deck','Repeated attachment never duplicates the platform',
  `const v=makeShip();seaDeckAttach(v,0,0);seaDeckAttach(v,0,0);WK.plat.length;`,1);
check('deck','Drop releases attachment and the shared platform',
  `const v=makeShip();seaDeckAttach(v,0,0);seaDeckDrop();[SEA.dk,WK.plat.length,v.deckOn,v.sea.pax];`,[null,0,false,false]);
check('deck','Gangway is available only while moored',
  `const {v}=makeMoored(),K=SEA_SHIPS.cog,D=seaDeckInfo(K);const g=seaGangGeom(v,K,D,{});v.sea.mode='out';
   [!!g,g.len>0,seaGangGeom(v,K,D,{})];`,[true,true,null]);
check('deck','Deck pose carries player with translated hull',
  `const v=makeShip();seaDeckAttach(v,0,0);const x=WK.pl.x,z=WK.pl.z;v.x+=10;v.z+=20;seaDeckStep(.1);
   [WK.pl.x-x,WK.pl.z-z];`,[10,20]);
check('deck','Wreck releases the player deck attachment',
  `const v=makeShip();seaDeckAttach(v,0,0);v.wreck=20;seaDeckUpdate(.1);[SEA.dk,WK.plat.length];`,[null,0]);
check('deck','Leaving helm starts forty-second unattended travel',
  `const v=makeShip();const ok=seaShipExit(v,false);[ok,SEA.dk.mode,v.sea.auto,v.sea.autoT,v.sea.mode];`,[true,'deck',true,40,'auto']);
check('deck','Timed-out unattended travel brakes to idle',
  `const v=makeShip();v.sea.autoT=0;v.sea.th=.01;seaAutoAI(v,1);[v.sea.mode,v.sea.auto,v.sp];`,['idle',false,0]);

check('work','Daily record reset keeps arrival counters',
  `let r=seaDkRec(480);r.p=9;r.ar[0]=7;r.sb[0]=3;r.lo.push([1]);day++;r=seaDkRec(480);[r.p,r.ar[0],r.sb,r.lo];`,[0,7,{},[]]);
check('work','Per-crate pay uses local wage and rounds',`[seaCratePay(480),seaUnloadBonus(480)];`,[9,50]);
check('work','ECO job and heat independently block shift',
  `makePort();ECX={job:{}};const a=!!seaShiftWhy(480);ECX.job=null;heat=1;[a,!!seaShiftWhy(480)];`,[true,true]);
check('work','Daily quota blocks a new shift',
  `makePort();seaDkRec(480).p=18;!!seaShiftWhy(480);`,true);
check('work','Store delivery pays immediately and consumes held crate',
  `const {J,z}=makeShift();J.hold={k:0,c:{st:1}};const h=J.hold;seaPutStack(z);
   [money,J.got,J.earned,J.hold,h.c.st,seaDkRec(480).p];`,[1009,1,9,null,3,1]);
check('work','Eight crates qualify for a thirty-unit settlement bonus',
  `makeShift({got:8,earned:72});seaShiftEnd('settle',true);[money,SEA_DK.job,calls.filter(c=>c[0]==='earn')];`,[1030,null,[['earn',10,30,'dock']]]);
check('work','Quitting keeps piecework and adds no settlement bonus',
  `makeShift({got:8,earned:72});seaShiftEnd('quit',false);[money,SEA_DK.job,calls.filter(c=>c[0]==='earn')];`,[1000,null,[]]);
check('work','Daily quota delivery settles with a shift bonus',
  `const {J,z}=makeShift({got:8});seaDkRec(480).p=17;J.hold={k:0,c:{st:1}};seaPutStack(z);[money,SEA_DK.job,seaDkRec(480).p];`,[1039,null,18]);
check('work','Unload bonus waits for last cargo and is paid once',
  `const {J,v}=makeShift();J.ship=v;v.sea.cargo=[{st:0}];seaUnloadCheck(J);const a=money;v.sea.cargo[0].st=3;
   seaUnloadCheck(J);seaUnloadCheck(J);[a,money,J.ship,J.earned];`,[1000,1050,null,50]);
check('work','Lost unloading ship removes special goal without bonus',
  `const {J,v}=makeShift();J.ship=v;v.sea.mode='out';seaUnloadCheck(J);[money,J.ship,SEA_DK.job===J];`,[1000,null,true]);
check('work','Store identity follows original berth unless it disappeared',
  `const a={},b={};[seaStoreOk({zT:a},b),seaStoreOk({zT:a},a),seaStoreOk({zT:{gone:true}},b)];`,[false,true,true]);
check('work','Gangway blocks dropping cargo',
  `const {J,v}=makeShift();J.hold={k:0};SEA.dk={v,mode:'gang'};[seaDropHeld(true),!!J.hold];`,[false,true]);
check('work','Swimming returns held deck cargo to source',
  `const {J}=makeShift();const it={st:1};J.hold={it,k:0};WK.pl.swim=true;seaDropHeld(true);[J.hold,it.st];`,[null,0]);
check('work','Carrying clamps speed to 2.4 meters per second',
  `const {J}=makeShift();J.hold={k:0};WK.pl.vx=8;seaJobTick(1);[Math.round(WK.pl.vx*10),Math.round((6200-WK.pl.x)*10),seaDockKeySpace()];`,[24,56,true]);
check('work','Vehicle entry ends shift',
  `makeShift();WK.pl.veh={};seaJobTick(.1);SEA_DK.job;`,null);
check('work','Distance ends shift outside 350-meter port envelope',
  `makeShift();WK.pl.x+=351;seaJobTick(.1);SEA_DK.job;`,null);
check('work','Whole-ship contract triples the cargo waiting allowance',
  `const {J,v}=makeShift();v.sea.cargo=[{st:0}];v.sea.holdT=256;const a=seaHoldShip(v);v.sea.holdT=256;J.ship=v;
   [a,seaHoldShip(v),v.sea.holdT];`,[false,true,264]);
check('work','SEA removes only overlapping port ECO dock spots',
  `ECX={spots:[{kind:'dock',port:{sea:true}},{kind:'dock',port:{}},{kind:'factory'}]};seaTrimEcoDock();ECX.spots.map(s=>s.kind);`,['dock','factory']);

check('passenger','Fare uses wage days with foreign markup and cap',
  `[seaPxPrice(st,2,false),seaPxPrice(st,2,true),seaPxPrice(st,100,false)];`,[45,56,350]);
check('passenger','Valid large port offers tickets until a dock shift starts',
  `makePort();const a=seaPaxWhy(480);SEA_DK.job={};[a,!!seaPaxWhy(480)];`,['',true]);
check('passenger','Held air ticket blocks simultaneous sea ticket',
  `makePort();airPaxLive=()=>true;!!seaPaxWhy(480);`,true);
check('passenger','Before departure voluntary refund pays eighty percent once',
  `makeTicket('aboard');seaPaxEnd(false,'',true);seaPaxEnd(false,'',true);[money,SEA.px.done,SEA.px.v.sea.px];`,[1080,true,null]);
check('passenger','Numeric cancellation refund pays full price',
  `makeTicket();seaPaxEnd(false,'',1);money;`,1100);
check('passenger','Actual deck boarding advances ticket to aboard',
  `const {v,X}=makeTicket();seaDeckAttach(v,0,0);seaPaxTick(.1);[X.ph,X.t];`,['aboard',0]);
check('passenger','Gangway preserves waiting phase',
  `const {v,X}=makeTicket();seaDeckAttach(v,0,0);SEA.dk.mode='gang';seaPaxTick(1);[X.ph,X.done];`,['board',false]);
check('passenger','Waiting timeout loses unused ticket without refund',
  `const {X}=makeTicket();seaPaxTick(301);[X.done,X.ok,money];`,[true,false,1000]);
check('passenger','Leaving before departure returns eighty percent',
  `const {X}=makeTicket('aboard');seaPaxTick(.1);[X.done,X.ok,money];`,[true,false,1080]);
check('passenger','Leaving after departure returns no money',
  `const {X}=makeTicket('depart');seaPaxTick(.1);[X.done,X.ok,money];`,[true,false,1000]);
check('passenger','Ship lost before departure refunds full fare',
  `const {v,X}=makeTicket();v.wreck=20;seaPaxTick(.1);[X.done,X.ok,money];`,[true,false,1100]);
check('passenger','Heat before sailing cancels with eighty-percent refund',
  `const {v,X}=makeTicket('aboard');seaDeckAttach(v,0,0);heat=1;seaPaxTick(.1);[X.done,money];`,[true,1080]);
check('passenger','Teleport is blocked in departure veil and arrival',
  `const {X}=makeTicket();const a=seaPaxCanTp();X.ph='depart';const b=seaPaxCanTp()!==true;X.ph='veil';const c=seaPaxCanTp()!==true;
   X.ph='arrive';const d=seaPaxCanTp()!==true;X.ph='moored';[a,b,c,d,seaPaxCanTp()];`,[true,true,true,true,true]);
check('passenger','Ordinary clear refunds aboard ticket',
  `const {X}=makeTicket('aboard');seaPaxClear(false);[SEA.px,X.done,money];`,[null,true,1080]);
check('passenger','Internal passage teleport preserves ticket during clear',
  `const {X}=makeTicket('veil');SEA.pxTp=true;seaPaxClear(false);[SEA.px===X,X.done,money];`,[true,false,1000]);
check('passenger','Compressed passage leaves historical year and local day unchanged',
  `const {X}=makeTicket('veil');seaPaxGo(X);[calls.filter(c=>c[0]==='teleport'),W.simYear,day,X.done,X.ok,SEA.pxTp];`,[[['teleport',490,{force:true}]],20,10,true,true,false]);
check('passenger','Failed passage teleports back and fully refunds',
  `const {X}=makeTicket('veil');teleportOk=false;seaPaxGo(X);[money,X.done,X.ok,calls.filter(c=>c[0]==='teleport').map(c=>c[1])];`,[1100,true,false,[490,480]]);
check('passenger','Water distance seeds adjacent shore at half a cell',
  `W.isWater[481]=true;const d=seaPxField(480);[d[481],Number.isFinite(d[482])];`,[.5,false]);
check('passenger','Water path rejects diagonal passage between two dry corners',
  `W.isWater[481]=W.isWater[513]=true;Number.isFinite(seaPxField(480)[513]);`,false);
check('passenger','Distance cache invalidates on terrain revision',
  `W.isWater[481]=W.isWater[513]=true;seaPxField(480);W.isWater[482]=true;
   const a=Number.isFinite(seaPxField(480)[513]);W.terrainVer++;[a,Number.isFinite(seaPxField(480)[513])];`,[false,true]);
check('passenger','Connected ports offer destinations while isolated ports do not',
  `makePort();WK.port=Array(961).fill(0);WK.port[486]=WK.port[487]=1;WALK.SEA_PAX_KMC=1;
   for(let i=481;i<=485;i++)W.isWater[i]=true;seaPaxDests(480).map(f=>f.ci);`,[486]);
check('passenger','War removes an otherwise connected foreign destination',
  `makePort();WK.port=Array(961).fill(0);WK.port[486]=1;WALK.SEA_PAX_KMC=1;
   for(let i=481;i<=485;i++)W.isWater[i]=true;statesByCell[486]={uid:20};atWar=()=>true;seaPaxDests(480);`,[]);
check('passenger','Successful purchase pays and reserves selected existing hull',
  `const {v}=makeMoored();v.sea.var={lv:seaRoute([[6200,6200],[6200,6600]])};
   const ok=seaPaxBuy(480,{ci:490,name:'Destination',types:['cog'],price:45,km:100,days:2});
   [ok,money,SEA.px.v===v,SEA.px.ph,v.sea.rt.to,calls.filter(c=>c[0]==='pay')];`,[true,955,true,'board','Destination',[['pay',10,45,'ticket']]]);
check('passenger','Insufficient funds leave existing hull unreserved',
  `const {v}=makeMoored();money=1;const ok=seaPaxBuy(480,{price:45});[ok,money,v.sea.px??null,calls.filter(c=>c[0]==='pay')];`,[false,1,null,[]]);
check('passenger','No usable hull or berth makes no ticket charge',
  `makePort();const ok=seaPaxBuy(480,{types:['cog'],price:45});[ok,money,SEA.px,calls.filter(c=>c[0]==='pay')];`,[false,1000,null,[]]);
check('passenger','Aboard phase departs after fourteen seconds and compresses at 300 meters',
  `const {v,X}=makeTicket('aboard');v.sea.var={lv:seaRoute([[6200,6200],[6200,6700]])};seaDeckAttach(v,0,0);
   seaPaxTick(14);const a=X.ph;seaPaxTick(.1);const b=X.ph;v.sea.s=300;seaPaxTick(.1);[a,b,X.ph];`,['aboard','depart','veil']);
check('passenger','Leaving at arrival completes passage without refund',
  `const {X}=makeTicket('arrive');X.msg=0;seaPaxTick(.1);[X.done,X.ok,money];`,[true,true,1000]);
check('passenger','Remaining aboard at destination closes ticket after 240 seconds',
  `const {v,X}=makeTicket('moored');seaDeckAttach(v,0,0);seaPaxTick(241);[X.done,X.ok,money];`,[true,true,1000]);

check('crew','Civil captain arms with knife while common sailor stays unarmed',
  `const v=makeShip(),a={sr:0,hp:40},b={sr:2,hp:40};seaCrewArm(a,v);seaCrewArm(b,v);[a.item[0],b.item,a.hostile,b.hostile,a.K.crime];`,[8,null,true,true,false]);
check('crew','Military captain retains melee weapon with health and armor floor',
  `const v=makeShip('destroyer',{era:4}),n={sr:0,hp:30};seaCrewArm(n,v);[n.item[0],n.ranged,n.hp,n.armor];`,[2,false,80,.12]);
check('crew','Merchant riot captain shouts while brave crew fights',
  `const v=makeShip();v.sea.riot={brave:[false,true],msgT:20};const a={sr:0,sq:0},b={sr:1,sq:1};
   seaRiotJoin(a,v);seaRiotJoin(b,v);[a.rt,a.state,b.hostile,b.state];`,['shout','flee',true,'fight']);
check('crew','Military riot arms every surviving participant',
  `const v=makeShip('destroyer');v.sea.riot={brave:[]};const n={sr:2,hp:30};seaRiotJoin(n,v);[n.hostile,n.state,n.rt??null];`,[true,'fight',null]);
check('crew','Riot calms only after sixty seconds away and disarms ordinary crew',
  `const v=makeShip();const n={sh:1,hostile:true,item:[8],rt:'run'};v.sea.riot={last:20,seen:20};v.sea.crewN=[n];
   WK.time=79;seaRiotTick();const a=!!v.sea.riot;WK.time=80;seaRiotTick();[a,v.sea.riot,n.hostile,n.sh,n.state];`,[true,null,false,0,'stand']);
check('crew','Stolen hot crew remains hostile after riot expires',
  `const v=makeShip();const n={sh:1,hostile:true};v.sea.hot=true;v.sea.riot={last:0,seen:0};v.sea.crewN=[n];
   WK.time=100;seaRiotTick();[v.sea.riot,n.hostile,n.sh];`,[null,true,1]);

check('law','Theft is charged once at dry port cell',
  `const {v}=makeMoored();seaTheft(v);seaTheft(v);[v.sea.crimeLvl,calls.filter(c=>c[0]==='crime')];`,[0,[['crime',2,6200,6200]]]);
check('law','Bad water-side anchor falls back to port cell center',
  `const {v,port}=makeMoored();W.isWater[480]=true;port.sp.shoreX=1;port.sp.shoreZ=2;seaTheft(v);
   calls.filter(c=>c[0]==='crime');`,[['crime',2,6200,6200]]);
check('law','Law anchor follows gangway ashore only while moored',
  `const {v}=makeMoored();seaDeckAttach(v,0,0);const a=seaLawAnchor();v.sea.mode='out';[a,seaLawAnchor()];`,[{x:6210,z:6200,ci:480},null]);
check('law','Gangway spacing blocks the next boarding pursuer',
  `const {v}=makeMoored(),g={len:10,lx:1,lz:0};const n={};seaBoardStart(n,v,g);[seaBoardCan(v,g),seaBoardCount(v),seaBoardOn(v)];`,[false,1,true]);
check('law','Boarding cap is four and ignores dead pursuers',
  `const {v}=makeMoored(),g={len:10};for(let i=0;i<4;i++){const n={};seaBoardStart(n,v,g);n.sb.m='deck';}
   const a=seaBoardCan(v,g);SEA.bd[0].dead=true;[a,seaBoardCan(v,g),seaBoardCount(v)];`,[false,true,3]);
check('law','Player at gangway foot blocks pursuer boarding',
  `const {v}=makeMoored();SEA.dk={v,mode:'gang',u:.02};seaBoardCan(v,{len:10});`,false);
check('law','Level one noise leaves ticket office open but level two closes it',
  `makePort();seaFearAdd(6200,6200,1);const a=seaPortUneasy(480);seaFearAdd(6200,6200,2);[a,seaPortUneasy(480),SEA.fear.length,SEA.fear[0].lvl];`,[false,true,1,2]);
check('law','Murder event lasts 150 seconds and repeated event increments wave',
  `makePort();const e=seaFearAdd(6200,6200,3);seaFearAdd(6200,6200,1);[e.until,e.k,e.lvl];`,[170,2,3]);
check('law','Corpse or hostile actor prevents calm return near warehouse',
  `WA.npcs=[{x:6201,z:6200,dead:true}];const a=seaSpotCalm(6200,6200);WA.npcs[0].vanish=true;[a,seaSpotCalm(6200,6200)];`,[false,true]);

check('lifecycle','Sinking clears berth once and destroys hull',
  `const {v,b}=makeMoored();const a=seaSink(v),c=seaSink(v);[a,c,v.hp,v.sea.mode,b.ship,b.state,v.sea.berth];`,[true,false,0,'sink',null,'free',null]);
check('lifecycle','Sink lasts fifteen seconds and removes ship at end',
  `const v=makeShip();seaSink(v);WK.time+=15;seaBitsSpawn=()=>{};seaSinkStep(v,.1);[v.gone,SEA.ships.length];`,[true,0]);
check('lifecycle','Remove clears tracked ship and occupied berth',
  `const {v,b}=makeMoored();seaRemove(v);[v.gone,SEA.ships.length,b.ship,b.state];`,[true,0,null,'free']);
check('lifecycle','Clear releases ships ports shots and platforms',
  `const {v}=makeMoored();seaDeckAttach(v,0,0);SEA.shots.push({});seaClear(false);
   [SEA.ships.length,SEA.ports.size,SEA.shots.length,SEA.dk,WK.plat.length];`,[0,0,0,null,0]);

const passed=results.filter(row=>row.status==='passed').length;
const report={work_package_id:'WP-WALK-SEA',runtime_verified:false,sources:manifest,
  environment:{node:process.version,kind:'full copied walksea.js in fresh isolated VM with synthetic scene and adapters'},
  declarations,passed,failed:results.length-passed,results};
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Sea: ${passed}/${results.length} isolated checks passed.`);
process.exitCode=report.failed?1:0;

