'use strict';

// Exercise shipped functions in memory using byte-identical input copies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-society-economy');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['civ.js', 'fauna.js', 'net.js', 'netwalk.js', 'people.js', 'walkact.js', 'walkair.js',
  'walkeco.js', 'walkgen.js', 'walkmil.js', 'walkrail.js', 'walksea.js'];
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
const line = (file, prefix) => block(file, prefix, '\n');
function fn(file, name) {
  const prefix = `function ${name}(`;
  const start = line(file, prefix);
  return start.trimEnd().endsWith('}') ? start : block(file, prefix, '\n}\n') + '\n}';
}
const fns = (file, ...names) => names.map(name => fn(file, name)).join('\n');
const eco = (...names) => fns('walkeco.js', ...names);
const ecoLines = (...names) => names.map(name => line('walkeco.js', `const ${name} =`)).join('\n');
const config = (file, marker) => block(file, marker, '\n});') + '\n});';
const balance = block('walkgen.js', 'const WALK = {', '\n};') + '\n};\n' + config('walkeco.js', 'Object.assign(WALK, {');
const eraLook = line('civ.js', 'ERA_LOOK:').split('],')[0] + ']';
const goods = block('walkeco.js', 'const WA_GOODS = {', '\nconst ECO_CATS');
const base = [balance, goods, `const CIV={${eraLook}}, eraCount=()=>8;`, fn('civ.js','eraLook'), fns('walkgen.js','wkLk','wkSty'),
eco('ecoD', 'ecoStat', 'ecoH', 'ecoRng', 'ecoHas', 'wkWage', 'ecoIssuer', 'ecoVal',
  'wkCash', 'wkMoney', 'wkPay', 'wkEarn', 'wkFine', 'wkExchange', 'ecoRep', 'ecoItem', 'ecoInvN', 'ecoInvAdd'),
ecoLines('ECO_SEC_DAY', 'ecoClamp', 'ecoClk', 'ecoDay', 'ecoStOf', 'ecoStUid', 'ecoRich', 'ecoRepOf', 'ecoSeason', 'ecoCellD'),
line('walkeco.js', 'const ecoCellX ='), line('walkeco.js', 'const ECO_ISS ='), 'let _ecoIv=null;'].join('\n');
const plain = v => JSON.parse(JSON.stringify(v));
const noop = () => {};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const results = [];

function fixture() {
  const W = { simYear: 0 };
  for (const k of ['isWater', 'isCoast', 'foodCap', 'pop', 'disease', 'fertility', 'unrest', 'ruin', 'res', 'herb', 'pred', 'industry', 'urban']) W[k] = Array(81).fill(0);
  const states = [{ id: 0, uid: 10, alive: true, era: 6, stability: 1, tech: 20, gdpPc: 250, capital: 42, overlord: -1 },
    { id: 1, uid: 20, alive: true, era: 2, stability: 0.75, tech: 0, gdpPc: 250, capital: 40, overlord: -1 }];
  return { W, GRID: { W: 9, H: 9, N: 81 }, states, stateOf: () => states[0], stateByUid: id => states.find(st => st.alive && st.uid === id),
    WK: { ui: {}, pl: { hp: 100, x: 100, z: 100, cell: 40, era: 4 }, time: 20 },
    WKP: { purse: {}, inv: {}, arm: '', rep: {}, quests: [], arms: { owned: [], reserve: {}, loaded: {} }, jobT: {}, ext: {}, seq: 0 },
    ECX: { rt: new Map(), ownV: [], job: null }, WA: { mode: 'survival', wpns: ['fist'], ammo: {}, gone: new Set() },
    worldSeed: 188, T: (ru, en) => en, TF: (ru, en) => en, wkMsg: noop, wkSfx: noop, wkHudSet: noop,
    wkBanner: noop, wkFmtMoney: (uid, n) => `${uid}/${n}`, clamp, clamp01: n => clamp(n, 0, 1),
    ecoCurStamp: noop, tLower: s => s.toLowerCase(), wkFail: (name, e) => { throw e; },
  };
}

function setup(code, overrides = {}) {
  const ctx = vm.createContext({ ...fixture(), ...overrides });
  vm.runInContext(base + '\n' + code, ctx, { timeout: 3000 });
  return expr => vm.runInContext(`{\n${expr}\n}`, ctx, { timeout: 3000 });
}

function test(group, label, check) {
  const id = `WS${String(results.length + 1).padStart(2, '0')}-${group}`;
  try {
    check();
    results.push({ id, label, status: 'passed' });
  } catch (e) {
    console.error(`${id} ${label}\n${e.stack}`);
    results.push({ id, label, status: 'failed', error: e.message });
  }
}

const stock = setup([eco('ecoBanned', 'ecoAvailEra', 'ecoCapDist', 'ecoCtx', 'ecoDays', 'ecoPrice', 'ecoSellPrice', 'ecoStock',
  'ecoItemName', 'ecoUse', 'ecoQuickHeal', 'ecoHurt', 'ecoBuy', 'ecoSellList', 'ecoSell', 'ecoOwnSync', 'ecoOwnsWeapon', 'ecoSyncArms', 'ecoForm', 'ecoPurseMerge'),
ecoLines('ecoFamine', 'ecoPlague', 'ecoPack', 'ECO_ARM_WHY'), eco('ecoButcher'), fn('walkact.js', 'waButcher'),
`const INVENTIONS=[{key:'currency',tech:4},{key:'auto',tech:12},{key:'iron',tech:2}];
 const WA_VEH={horse:{phys:'horse',n:['','Horse']},car:{phys:'car',n:['','Car']},boat:{phys:'boat',n:['','Boat']}};
 const WA_WPN={fist:{},knife:{},pistol:{},rifle:{}}; const WA_AMMO={rifle:{pack:12}};
 const log=[]; let canPlace=true, nextVehicle=0;
 const ecoCurOf=()=>({rf:[],ef:[]}), ecoCurNation=()=>'', ecoNum=String, TN=()=>'';
 const wkInv=ecoHas, ecoSeaSt=st=>!!st.coastal;
 const wkBeastOf=(st,wanted,cell)=>[].concat(wanted).find(k=>st.tame?.includes(k) && cell!==2);
 const wkTamed=(st,k)=>!!st.tame?.includes(k);
 const ecoGoodName=key=>key, ecoGoodDesc=key=>key, waSpName=sp=>sp.key;
 const waAmmoKind=key=>key==='rifle'?'rifle':null, waAmmoHas=key=>WKP.arms.reserve[key]||0;
 const waAmmoName=key=>key, waAmmoAdd=(key,n)=>WKP.arms.reserve[key]=(WKP.arms.reserve[key]||0)+n;
 const waGive=key=>WKP.arms.owned.push(key), waTake=key=>{ const i=WKP.arms.owned.indexOf(key); if(i<0)return false; WKP.arms.owned.splice(i,1); return true; };
 const ecoFreeSpot=()=>canPlace?[121,122,0]:null, ecoSpawnVeh=type=>({type,id:++nextVehicle,ownerPl:true});
 const waVehRemove=v=>log.push(v.id), wkHeal=n=>WK.pl.hp=Math.min(WALK.HP,WK.pl.hp+n);
 const d={cell:40,type:'g',x:120,z:120};
 WK.plans=new Map([[40,{}]]); WK.ready=true;
 const resetStock=()=>{ WKP.purse={10:100000}; WKP.inv={}; WKP.rep={}; WKP.arms={owned:[],reserve:{},loaded:{}}; WKP.ext={};
   WK.pl.hp=100; WK.pl.dead=false; WK.pl.veh=null; WK.opts={}; WK.ready=true; canPlace=true; ECX.ownDone=false; ECX.ownV=[];
   states[0].era=6; states[0].tech=20; states[0].gov='republic'; states[0].atWar=0; states[0].overlord=-1; ECO_ISS.clear(); }; resetStock();`].join('\n'));

test('money','Currency form follows coast, invention and epoch',()=>assert.deepEqual(plain(stock("[ecoForm({era:0}),ecoForm({era:0,coastal:true}),ecoForm({era:2,tech:2}),ecoForm({era:2,tech:4}),ecoForm({era:6}),ecoForm({era:7})]")),['bead','shell','grain','coin','note','credit']));
test('money','Vassal credit and fine use the issuing overlord purse',()=>assert.deepEqual(plain(stock("resetStock(); states[0].overlord=1; WKP.purse={}; wkEarn(10,11,'test'); [wkCash(20),wkCash(10),wkFine(10,16),Object.keys(WKP.purse)]")),[11,11,5,[]]));
test('money','Wages, exchange fee, war and extinct currency affect valuation',()=>{
  near(stock('wkWage({gdpPc:1000})'),10*4**0.6);
  assert.equal(stock("resetStock(); wkExchange(10,10,16).got"),16);
  near(stock("states[0].atWar=1; ecoVal(10)"),0.092);
  near(stock("ecoD().cur[30]={w:20}; ecoVal(30)"),0.015);
  assert.equal(stock('states[0].atWar=0; wkExchange(30,10,100).got'),13);
});
test('money','Rich option bypasses payment but real cash remains separately readable',()=>assert.deepEqual(plain(stock("resetStock(); WKP.purse[10]=10; WK.opts.rich=true; [wkMoney(10),wkPay(10,500,'buy'),wkCash(10)]")),[1e9,true,10]));

test('shop','Full catalog uniquely separates seven categories and quest goods',()=>{
  const metrics=plain(stock("[Object.keys(WA_GOODS).length,Object.keys(ECO_LOOT).length,new Set(Object.values(WA_GOODS).map(g=>g.k)).size,Object.keys(ECO_LOOT).filter(k=>ECO_LOOT[k].q)]"));
  assert.deepEqual(metrics,[72,7,7,['ore','cargo','letter','chest']]);
});
test('shop','Bans differ by government and leave melee stock alone',()=>assert.deepEqual(plain(stock("[ecoBanned({gov:'dictatorship'},'xbow'),ecoBanned({gov:'theocracy'},'xbow'),ecoBanned({gov:'theocracy'},'a_rifle'),ecoBanned({gov:'republic'},'rifle'),ecoBanned({gov:'dictatorship'},'knife')]")),[true,false,true,false,false]));
test('shop','Survival ammo, coast, contraband and stock categories gate the list',()=>assert.deepEqual(plain(stock(`resetStock(); const has=(t,s,k)=>ecoStock(40,t,7,s).some(o=>o.key===k);
 states[0].gov='theocracy'; states[0].era=6; const a=[has('s',true,'a_rifle'),has('b',true,'a_rifle'),has('b',false,'a_rifle'),has('h',true,'m_mboat')];
 W.isCoast[40]=1; [...a,has('h',true,'m_mboat'),has('a',true,'medkit')]`)),[false,true,false,false,true,true]));
test('shop','Domestication, climate adapter and obsolete technology gate transport',()=>assert.deepEqual(plain(stock(`resetStock(); const st=states[0]; st.era=5; st.tame=['horse'];
 [ecoAvailEra('m_horse',st,40),ecoAvailEra('m_horse',st,2),ecoAvailEra('m_carriage',st,40),ecoAvailEra('m_litter',st,40)]`)),[true,false,false,false]));
test('shop','War, regime, reputation and contraband multiply purchase prices',()=>{
  near(stock("resetStock(); ecoDays('rifle',{cell:40,war:1,st:{gov:'theocracy'},dcap:10,rep:-40,dealer:true})"),20*1.35*1.3*1.1*1.048*1.6);
  near(stock("W.fertility[40]=1; ecoDays('bread',{cell:40,war:0,dcap:0,rep:0,famine:1})"),0.1*0.8*2.6);
  near(stock("ecoDays('medkit',{cell:40,war:0,dcap:0,rep:0,plague:1})"),0.8*2.5);
});
test('shop','Buy charges, rejects duplicates and adds one pack of ammunition',()=>assert.deepEqual(plain(stock(`resetStock(); WKP.purse[10]=1000; d.type='s'; ecoBuy(d,'rifle'); const first=d.bad;
 ecoBuy(d,'rifle'); const second=d.bad; ecoBuy(d,'a_rifle'); [first,second,WKP.arms.owned,WKP.arms.reserve.rifle,WKP.purse[10]<1000]`)),[0,1,['rifle'],12,true]));
test('shop','Sell list excludes worn armor and quest items, buys a spare',()=>assert.deepEqual(plain(stock(`resetStock(); WKP.inv={vest:2,letter:1,hide:3}; ecoD().arm='vest'; const list=ecoSellList(d);
 ecoSell(d,list.find(o=>o.key==='vest')); [list.map(o=>[o.key,o.n]),WKP.inv.vest,ecoD().arm,d.bad]`)),[[['vest',1],['hide',3]],1,'vest',0]));

test('items','Purchasing stronger armor equips it; switching armor preserves items',()=>assert.deepEqual(plain(stock(`resetStock(); ecoInvAdd('furs',1); ecoUse('furs'); ecoBuy(d,'vest'); const upgraded=ecoD().arm;
 ecoUse('furs'); [upgraded,ecoD().arm,WKP.inv.furs,WKP.inv.vest]`)),['vest','furs',1,1]));
test('items','Armor checks owned item, damage cause and radiation flag',()=>assert.deepEqual(plain(stock(`resetStock(); ecoInvAdd('nano',1); ecoUse('nano'); const a=['guard','blast','rad','fall','drown'].map(k=>ecoHurt(100,k));
 ecoInvAdd('nano',-1); [...a.map(x=>Math.round(x*10)/10),ecoHurt(100,'guard')]`)),[34,53.8,50,100,100,100]));
test('items','Quick heal selects smallest sufficient or strongest below needed',()=>assert.deepEqual(plain(stock(`resetStock(); WKP.inv={jerky:1,bandage:1,medkit:1}; WK.pl.hp=69; ecoQuickHeal();
 const first=[WK.pl.hp,ecoInvN('bandage'),ecoInvN('medkit')]; WK.pl.hp=10; ecoQuickHeal(); [...first,WK.pl.hp,ecoInvN('medkit')]`)),[100,0,1,85,0]));
test('items','Health and inventory caps, full/dead players retain consumables',()=>assert.deepEqual(plain(stock(`resetStock(); ecoInvAdd('bread',10005); const max=ecoInvN('bread'); const a=ecoUse('bread');
 WK.pl.hp=5; WK.pl.dead=true; const b=ecoUse('bread'); [max,a,b,ecoInvAdd('bread',-20000),'bread' in WKP.inv]`)),[9999,false,false,0,false]));

test('ownership','Purchase spawns before charging and enforces three owned entries',()=>assert.deepEqual(plain(stock(`resetStock(); canPlace=false; ecoBuy(d,'m_car'); const invalid=[d.bad,WKP.purse[10],ecoD().own.length];
 canPlace=true; for(let i=0;i<4;i++)ecoBuy(d,'m_car'); [...invalid,ecoD().own.length,ECX.ownV.every(v=>v.ownerPl),d.bad]`)),[1,100000,0,3,true,1]));
test('ownership','Return instantiates purchases once; wreck removes descriptors and live references',()=>assert.deepEqual(plain(stock(`resetStock(); ecoD().own.push({t:'horse'},{t:'car'}); ecoOwnSync(); const a=ECX.ownV[0].id;
 ecoOwnSync(); const same=a===ECX.ownV[0].id; ECX.ownV[0].wreck=true; ecoOwnSync(); [same,ecoD().own,ECX.ownV.length]`)),[true,[{t:'car'}],1]));
test('ownership','Sale refuses occupied vehicle then removes owned descriptor and instance',()=>assert.deepEqual(plain(stock(`resetStock(); ecoBuy(d,'m_car'); const it=ecoSellList(d).find(o=>o.kind==='own');
 WK.pl.veh=ECX.ownV[0]; ecoSell(d,it); const a=[d.bad,ecoD().own.length]; WK.pl.veh=null; ecoSell(d,it); [...a,d.bad,ecoD().own.length,ECX.ownV.length,log.length]`)),[1,1,0,0,0,1]));

test('hunt','Butchery heals once and yields scaled hides, meat and trophy',()=>assert.deepEqual(plain(stock(`resetStock(); WK.pl.hp=40; const a={S:{key:'wolf',guild:'pred',size:1.2,danger:0.8}};
 ecoButcher(a); ecoButcher(a); [WK.pl.hp,a.vanish,ecoInvN('hide'),ecoInvN('meat'),ecoInvN('trophy')]`)),[68,true,2,3,1]));
test('hunt','Birds give meat but no hide',()=>assert.deepEqual(plain(stock("resetStock(); ecoButcher({S:{key:'goose',guild:'bird',size:1}}); [ecoInvN('hide'),ecoInvN('meat'),ecoInvN('trophy')]")),[0,2,0]));

const actors=setup([fns('walkact.js','waCast','waNpcMax','waNpcSync','waFlee','waAngry','waKillPerson','waAnimalKill','waAnimalStep'),
fns('walkgen.js','wkRng'),line('walkgen.js','const WK_T ='),`let _wkS=123;
 const events=[]; const netLive=()=>false, WK_T_FIX=WK_T, waCrowd=()=>0, waDry=()=>true, wkViewF=()=>[0,-1];
 const waKindOf=()=>null, waHookList=()=>null, waHookRun=(...args)=>events.push(args.slice(0,1));
 const waGroundPuff=()=>{}, wkUiClose=()=>{WK.dlg=null;}, wkCellAt=()=>40;
 const waCrime=(n)=>events.push(['crime',n]); const peopleKill=(p,why)=>{events.push(['person',typeof p==='number'?p:p.id,why]); return true;};
 const civShock=()=>events.push(['shock']); const waProf=()=> 'role', personName=()=> 'name';
 const faunaHunt=(...args)=>events.push(['hunt',...args]);
 const waAMove=()=>false, waHurtPlayer=(damage,why)=>events.push([damage,why]);
 const waNpcSpawn=(pl,r)=>{ WA.npcs.push({...r,role:r,state:'stand',d:10}); WA.live.set(r.id,r); };
 const pl={i:40,era:2,tier:WK_T_FIX.VILLAGE,spots:[{k:'ruler',x:900,z:900},{k:'guard',x:901,z:901},{k:'priest',x:902,z:902},{k:'farm',x:903,z:903},{k:'home',x:904,z:904}],nav:{x:[905,906],z:[900,901],kind:[2,2]},special:{}};
 Object.assign(WA,{npcs:[],live:new Map(),herdKills:new Map(),cand:[],fresh:true,kills:0});
 Object.assign(WK,{detail:2,env:{night:0},wx:{rain:0,snow:0,ash:0},tier:Array(81).fill(2),plans:new Map([[40,pl]]),cells:new Map([[40,{}]])});
 Object.assign(WK.pl,{x:1800,z:1800}); const waGoHome=n=>n.state='home';`].join('\n'));
test('npc','Seeded cast retains IDs and prioritizes planned offices before passers-by',()=>assert.deepEqual(plain(actors(`const a=waCast(pl); delete pl.cast; const b=waCast(pl);
 [JSON.stringify(a)===JSON.stringify(b),b.slice(0,4).map(r=>r.kind),b[0].id,b.some(r=>r.walk)]`)),[true,['ruler','guard','priest','farm'],20480,true]));
test('npc','Night filter keeps posts but suppresses daytime roles on fresh spawn',()=>assert.deepEqual(plain(actors(`for(const r of waCast(pl)){ r.x+=900; r.z+=900; }
 WK.env.night=0.9; waNpcSync(); [WA.npcs.some(n=>n.kind==='ruler'),WA.npcs.some(n=>n.kind==='guard'),WA.npcs.some(n=>n.kind==='farm'),WA.npcs.every(n=>!n.day)]`)),[true,true,false,true]));
test('npc','Flee and hostile state dismiss the current conversation',()=>assert.deepEqual(plain(actors(`const n={state:'talk',back:'work'}; WK.dlg={npc:n}; waFlee(n,2,3,4); const f=[n.state,n.back0,n.t,WK.dlg];
 WK.dlg={npc:n}; waAngry(n); [...f,n.state,n.hostile,WK.dlg]`)),['flee','work',4,null,'fight',true,null]));
test('npc','Player kill of a local ruler enters persistent people path; scene population is untouched',()=>assert.deepEqual(plain(actors(`events.length=0; W.pop[40]=1234; const n2={kind:'ruler',id:50,per:{id:77},pl:{st:{uid:10}},role:{},d:100};
 waKillPerson(n2,'player'); [n2.dead,WA.gone.has(50),W.pop[40],events]`)),[true,true,1234,[['kill'],['person',77,'assassinated'],['crime',4]]]));
test('hunt','Animal kill removes the local actor, fires quest hook and projects even a module herd to world hunt',()=>assert.deepEqual(plain(actors(`events.length=0; const H={id:-13,list:[],mod:true,tame:true}; const a2={S:{key:'aurochs',guild:'herb',danger:0},H,x:1800,z:1800,cat:'land'};
 H.list.push(a2); waAnimalKill(a2,'player'); [a2.dead,H.list.length,WA.herdKills.get(-13),events]`)),[true,0,1,[['kill'],['hunt',40,'aurochs',1],['crime',1]]]));
test('hunt','Non-player animal death reaches quest hook without world hunt',()=>assert.deepEqual(plain(actors(`events.length=0; const H2={id:8,list:[]}; const a3={S:{key:'deer',guild:'herb'},H:H2,cat:'land'};
 H2.list.push(a3); waAnimalKill(a3,'other'); [H2.list.length,events]`)),[0,[['kill']]]));

const quest=setup([ecoLines('ECO_QKINDS','ECO_QSET','ecoMine','ECO_QWHO','ecoQActive','ecoPickR','ecoTT','ecoFamine','ecoPlague'),
block('walkeco.js','const ECO_STF =','const ECO_QWHO'),block('walkeco.js','const ECO_QK =','// ---- тексты заданий'),
eco('ecoQClean','ecoRewardM','ecoQCtx','ecoQuestAccept','ecoQRt','ecoQDropItems','ecoQuestFinish','ecoQAdvance','ecoQuestTick',
  'ecoQuestWorld','ecoQuestSync','ecoWorldEnter','ecoWorldMark','ecoJobShift','ecoGiverPerson','ecoGiverDead','ecoEscortActive','ecoQuestExit','ecoQuestKill','ecoCanTeleport','ecoLostTake',
  'ecoLoadWhere','ecoLoadPut','ecoLoadClear','ecoOreLost','ecoOreCol','ecoQuestGive'),
ecoLines('ECO_QCLOSED','ECO_YEAR_DAYS','ECO_CARGO','ecoLoadVehOk'),`const events=[]; const c0=40, state=states[0];
 Object.assign(state,{_foes:new Set([1]),capital:42,era:5});
 W.foodCap[c0]=100; W.pop[c0]=190; W.disease[c0]=0.3; W.unrest[c0]=0.5; W.ruin[c0]=0.1; W.pred[c0]=0.4; W.herb[c0]=0.5; W.isCoast[c0]=1; W.res[42]=1;
 const RES=[null,{key:'iron',era:1,color:[100,100,100]}], SPECIES=[{key:'wolf',guild:'pred',danger:0.7}], faunaSpeciesAt=()=>[{sp:0}];
 const ecoLandOf=()=>1, ecoWildSpot=()=>({cell:42,x:2000,z:1800}), ecoCitiesFor=()=>[{c:42,d:3}], ecoCargoOk=()=>true;
 const person={id:80,npc:[42,1001],died:null,name:'test',_dy:200}; const npcPerson=()=>person, personAge=()=>25, personById=id=>id===80?person:null;
 const rulerOf=()=>({id:1}), wkInv=()=>true, wkStateOf=()=>state;
 const waName=()=> 'client', waProf=()=> 'merchant', ecoQTitle=q=>q.kind, ecoFailText=k=>k, ecoQObj=q=>q.kind, ecoItemName=k=>k;
 const ecoAllQ=()=>WKP.quests.filter(ecoMine), ecoCampLeave=()=>{}, ecoQTx=()=>({thanks:'thanks'}), netDoFree=(...r)=>events.push(r);
 const wkpId=()=>++WKP.seq;
 const giver={cell:40,slot:5,id:40*512+5,role:{x:1800,z:1800},look:{},per:person};
 const context=()=>({...ecoQCtx(c0,5,'civ'),R:()=>0.35});
 const accept=kind=>ecoQuestAccept({key:'40:5:'+kind,kind,q:ECO_QK[kind].gen(context()).q},giver);
 const resetQ=()=>{WKP.quests=[]; WKP.inv={}; WKP.rep={}; WKP.purse={}; WKP.jobT={}; WKP.ext={}; events.length=0;
  ECX.rt.clear(); ECX.gapDays=0; W.simYear=0; person.died=null; state.alive=true; giver.vanish=false; WA.gone.clear(); WA.vehs=[]; WK.pl.dead=false; WK.pl.veh=null;};`].join('\n'));
const questRows=plain(quest("Object.fromEntries(ECO_QKINDS.map(k=>{const r=ECO_QK[k].gen(context());return [k,{stages:r.q.stages.map(s=>s.t),give:r.q.give||{},reward:r.q.rw,deadline:r.q.dl}];}))"));
const questStages={ grain:['item','give'],remedy:['item','give'],bandits:['kill','give'],ore:['go','go'],cargo:['go'],kin:['talk','give'],
  predator:['kill','give'],courier:['go'],letter:['go'],escort:['escort'],hides:['item','give'],lost:['find','give'] };
for(const [kind, stages] of Object.entries(questStages)){
  test('quest-generator',`Built-in ${kind} generator projects required stages and positive reward`,()=>{
    assert.deepEqual(questRows[kind].stages,stages);
    assert(questRows[kind].reward.m>0 && questRows[kind].deadline>0);
  });
}
test('quest-generator','World prerequisites prevent irrelevant deliveries and hunts',()=>assert.deepEqual(plain(quest(`const original=[W.foodCap[40],W.disease[40],W.pred[40]]; W.foodCap[40]=1000; W.disease[40]=0; W.pred[40]=0;
 const hits=['grain','remedy','predator'].map(k=>ECO_QK[k].gen(context())); [W.foodCap[40],W.disease[40],W.pred[40]]=original; hits`)),[null,null,null]));
test('quests','Offer repeats within a season and refusal includes the exact reputation boundary',()=>assert.deepEqual(plain(quest(`resetQ(); let o=null, chosen=-1;
 for(let i=0;i<80&&!o;i++){o=wkQuestGen(40,i,'civ'); if(o)chosen=i;}
 const stable=JSON.stringify(o)===JSON.stringify(wkQuestGen(40,chosen,'civ')); WKP.rep[10]=-25;
 [!!o,stable,wkQuestGen(40,chosen,'civ')]`)),[true,true,null]));
test('quests','Accept writes inventory, tracking, giver identity and active cap',()=>assert.deepEqual(plain(quest(`resetQ(); const q=accept('cargo'); for(let k=0;k<5;k++)accept('hides');
 [q.stage,q.gpk,ecoInvN('cargo'),WKP.quests.length,accept('hides'),ecoD().track]`)),[0,'42:1001',1,6,null,6]));
test('quests','Collection advances and missing items return give stage to collection',()=>assert.deepEqual(plain(quest(`resetQ(); const q1=accept('grain'); ecoInvAdd('grain',q1.d.n); ecoQuestTick(q1,0.25); const first=q1.stage;
 ecoInvAdd('grain',-q1.d.n); ecoQuestTick(q1,0.25); [first,q1.stage]`)),[1,0]));
test('quests','Completion pays and emits a world request for plague relief',()=>assert.deepEqual(plain(quest(`resetQ(); const q2=accept('remedy'); ecoQuestFinish(q2,true); ecoQuestFinish(q2,true);
 [q2.st,wkCash(10)===q2.rw.m,ecoRepOf(10),ecoD().st.quests,events[0][0],events[0][1],events[0][3]===0.012*q2.d.n,events.length]`)),['done',true,6,1,'wkQuest',1,true,1]));
test('quests','Loss condition consumes given goods and elapsed local time penalizes standing',()=>assert.deepEqual(plain(quest(`resetQ(); const q3=accept('cargo'); ecoD().clk=q3.dl+1; ecoQuestSync(); [q3.st,q3.fin,ecoInvN('cargo'),ecoRepOf(10),ecoD().st.failed,ecoD().track]`)),['failed','time',0,-2,1,0]));
test('quests','Map gap shortens a deadline and shifts work cooldowns',()=>assert.deepEqual(plain(quest(`resetQ(); ecoD().wy=0; WKP.jobT={'40:pilot':10,'40:field':3}; const q4=accept('grain'); W.simYear=10/360;
 ecoWorldEnter(); ecoQuestSync(); [q4.fin,ecoD().st.failed||0,ecoRepOf(10),WKP.jobT]`)),['late',0,0,{'40:pilot':0}]));
test('quests','Death of a giver precedes deadline and a fallen issuer closes the job',()=>assert.deepEqual(plain(quest(`resetQ(); const q5=accept('grain'); person.died=1; ecoD().clk=q5.dl+1; ecoQuestSync(); const a5=q5.fin;
 person.died=null; const q6=accept('hides'); state.alive=false; ecoQuestSync(); [a5,q6.fin,ecoD().st.failed||0]`)),['giver','state',0]));
test('quests','Escort blocks teleport and exit fails it while restoring local giver role',()=>assert.deepEqual(plain(quest(`resetQ(); const q7=accept('escort'); const blocked=typeof ecoCanTeleport()==='string'; ecoQuestExit();
 [blocked,q7.fin,WA.gone.has(giver.id),ecoCanTeleport(),ecoD().st.failed]`)),[true,'exit',false,true,1]));
test('quests','Kill progress accepts marked animals and a player kill of the matching nearby species',()=>assert.deepEqual(plain(quest(`resetQ(); const q8=accept('predator'); const s=q8.stages[0]; s.n=2;
 ecoQuestKill({S:{key:'wolf'},x:s.x,z:s.z},'other'); const b8=s.k;
 ecoQuestKill({eq:q8.id},'other'); ecoQuestKill({S:{key:'wolf'},x:s.x,z:s.z},'player'); [b8,s.k,q8.stage]`)),[0,2,1]));
test('quests','Lost chest requires living player on foot within range',()=>assert.deepEqual(plain(quest(`resetQ(); const q9=accept('lost'); const s9=q9.stages[0]; Object.assign(WK.pl,{x:s9.x,z:s9.z,veh:{}});
 ecoLostTake(q9); const b9=q9.stage; WK.pl.veh=null; ecoLostTake(q9); [b9,q9.stage,ecoInvN('chest')]`)),[0,1,1]));

const jobs=setup([eco('ecoJobPayFor','ecoJobRelease','ecoJobEnd','ecoJobPick','ecoJobDeliver','ecoJobTick'),
ecoLines('ECO_JOBP','ecoJobKey','ecoJobDone','ecoJobPartial'),
fns('walksea.js','seaPutStack','seaShiftEnd'),line('walksea.js','const seaCratePay ='),line('walksea.js','const seaHasEco ='),
fns('walkrail.js','rlJobPay'), fns('walkair.js','airJobPay','airJobWin'),
config('walkair.js','Object.assign(WALK, {'),`Object.assign(WALK,{${line('walkeco.js','ECO_QUIT_K:').split('//')[0]}
 ${line('walksea.js','SEA_CRATE_PAY:').split('//')[0]} ${line('walksea.js','SEA_DAY_MAX:').split('//')[0]}
 ${line('walksea.js','SEA_SHIFT_BONUS:').split('//')[0]} ${line('walksea.js','SEA_SHIFT_BONUS_N:').split('//')[0]}
 ${line('walkair.js','AIR_ZEP_JOB_PAY:').split('//')[0]} ${line('walkair.js','AIR_ZEP_JOB_LOOP:').split('//')[0]} ${line('walkair.js','AIR_ZEP_JOB_ONTIME:').split('//')[0]}});
 const SEA_DK={job:null}, seaRec={p:0,sb:{}}, seaDkRec=()=>seaRec, seaStackN=z=>z.stk.n, seaPuff=()=>{}, seaMoneyStr=(ci,n)=>String(n);
 const wkStateOf=ecoStOf, wkWageAt=ci=>Math.round(wkWage(ecoStOf(ci))), wkRep=ecoRepOf, wkRepAdd=ecoRep;
 const AIR={job:null}, airDay=ecoDay, airJobKey=ci=>ci+':pilot', airTr=T, airJobSay=()=>{}, airJobEnd=ok=>{AIR.job.done=true;AIR.job.ok=ok;};
 const ecoPuff=()=>{}, ecoMW=k=>k, ecoJobL=k=>k;
 const job=(o={})=>{const x=Object.assign({uid:10,pay:40,key:'40:field',kind:'field',n:4,got:0,pts:[],t:0,T:5,R:20,cx:100,cz:100},o); ECX.job=x;return x;};
 const resetJobs=()=>{WKP.purse={};WKP.rep={};WKP.jobT={};WKP.ext={};WK.pl.veh=null;WK.pl.dead=false;WK.pl.x=100;WK.pl.z=100;WK.env={night:1};};`].join('\n'));
test('jobs','Short job pay uses wage, site quality and reputation',()=>assert.deepEqual(plain(jobs(`resetJobs(); const st=states[0]; st.gdpPc=1000; W.fertility[40]=1; WKP.rep[10]=40;
 [ecoJobPayFor('field',st,40),ecoJobPayFor('watch',st,40)]`)),[17,34]));
test('jobs','Full completion pays and writes a shared mine/oil cooldown key where applicable',()=>assert.deepEqual(plain(jobs(`resetJobs(); ecoD().clk=900; WKP.rep[10]=-4; job({key:'40:mine'}); ecoJobEnd('',true);
 [wkCash(10),ecoRepOf(10),ecoJobDone(40,'oil'),WKP.jobT['40:mine'],ecoD().st.jobs]`)),[40,-2.5,true,1,1]));
test('jobs','Partial payout covers delivered cargo only and leaves cooldown unset',()=>assert.deepEqual(plain(jobs(`resetJobs(); job({got:2}); ecoJobTick(6); [wkCash(10),ecoJobDone(40,'field'),ecoRepOf(10),ECX.job]`)),[14,false,0,null]));
test('jobs','Picking and delivering mutates the load, source slot and stack',()=>assert.deepEqual(plain(jobs(`resetJobs(); const point={slot:0}; const J=job({pts:[point],site:{have:[true],n:0},drop:{x:100,z:100}});
 ecoJobPick(J,point); const pre=[J.carry,J.site.have[0]]; ecoJobDeliver(J); [...pre,J.carry,J.got,J.site.n,point.done]`)),[1,false,0,1,1,1]));
test('jobs','Death releases a short shift without the partial payday',()=>assert.deepEqual(plain(jobs(`resetJobs(); job({got:2}); WK.pl.dead=true; ecoJobTick(0.1); [wkCash(10),ECX.job]`)),[0,null]));
test('jobs','Dock quota awards each crate immediately and a qualifying settlement bonus',()=>assert.deepEqual(plain(jobs(`resetJobs(); states[0].gdpPc=250; seaRec.p=17;
 const crate={st:1}; SEA_DK.job={ci:40,uid:10,got:7,earned:7,hold:{c:crate}};
 seaPutStack({ci:40,b:{id:1},stk:{n:4,cap:12},geo:{stack:{x:0,y:0,z:0}}}); [seaRec.p,seaRec.sb[1],crate.st,SEA_DK.job,wkCash(10),ecoRepOf(10)]`)),[18,5,3,null,4,0.4]));
test('jobs','Train payment goes to the destination station currency for that stop',()=>assert.deepEqual(plain(jobs("resetJobs(); [rlJobPay(40,0.9),rlJobPay(40,0.9*0.55),wkCash(10),Object.keys(WKP.jobT).length]")),[9,5,14,0]));
test('jobs','Pilot circuit, trip cap, and airship timing bonuses have separate terms',()=>assert.deepEqual(plain(jobs(`resetJobs(); const st=states[0]; const ps=[airJobPay(st,'loop',0,false),airJobPay(st,'trip',100,false),airJobPay(st,'loop',0,true),airJobPay(st,'trip',100,true)];
 AIR.job={v:{A:{ahp:90,ahp0:100}},ci:40,pay:100,uid:10,zep:true,late:false}; airJobWin(); [...ps,AIR.job.ok,wkCash(10),ecoRepOf(10),WKP.jobT['40:pilot']]`)),[15,55,24,80,true,135,0.8,0]));

test('money','Legacy vassal balances consolidate without the exchanger commission',()=>assert.deepEqual(plain(stock(`resetStock(); states[0].overlord=1; WKP.purse={10:18,20:5}; ecoPurseMerge(); WKP.purse`)),{'20':23}));
test('hunt','Predator stalks, charges and bites in the wild, then retreats in a settlement',()=>assert.deepEqual(plain(actors(`events.length=0; WA.biteT=-100; WK.tier[40]=0;
 Object.assign(WK.pl,{vx:0,vz:0}); const animal={x:1800,z:1785,yaw:0,r:1,t:4,cd:0,graze:0,amp:1,hp:50,hp0:50,S:{guild:'pred',danger:0.8,size:1,speed:1},H:{},cat:'land',state:'idle'};
 waAnimalStep(animal,0.1,30); const a=animal.state; waAnimalStep(animal,0.1,15); const b=animal.state; waAnimalStep(animal,0.1,1);
 WK.tier[40]=2; waAnimalStep(animal,0.1,8); [a,b,animal.state,events]`)),['stalk','charge','flee',[[19,'beast']]]));
test('quests','Successful hand-in consumes the required goods and pays once',()=>assert.deepEqual(plain(quest(`resetQ(); const q=accept('grain'); const d={}; ecoInvAdd('grain',q.d.n+1); ecoQuestTick(q,0.25);
 ecoQuestGive(q,giver,d); [q.st,ecoInvN('grain'),wkCash(10)===q.rw.m,ecoD().st.quests]`)),['done',1,true,1]));
test('quests','Ore belongs to the loading vehicle and rewinds if that vehicle is wrecked',()=>assert.deepEqual(plain(quest(`resetQ(); const q=accept('ore'); const a={type:'cart',sp:0,cargo:2}, b={type:'cart',sp:0}; WA.vehs=[a,b]; WK.pl.veh=a;
 Object.assign(WK.pl,{x:q.stages[0].x,z:q.stages[0].z}); ecoQuestTick(q,4); const t=[q.stage,a.eload,a.keep,ecoInvN('ore')];
 WK.pl.veh=b; Object.assign(WK.pl,{x:q.stages[1].x,z:q.stages[1].z}); ecoQuestTick(q,0.1); const old=q.stage;
 a.wreck=true; ecoQuestTick(q,0.1); [...t,old,q.stage,a.eload,a.keep,a.cargo]`)),[1,4,true,0,1,0,0,false,2]));

const declarations = {
  goods: plain(stock('WA_GOODS')), loot: plain(stock('ECO_LOOT')),
  quest_kinds: plain(quest('ECO_QKINDS')), armor_coefficients: plain(stock('ECO_ARM_WHY')),
  work_pay_days: plain(jobs("Object.fromEntries(Object.entries(ECO_JOBP).map(([k,v])=>[k,WALK[v]]))")),
};
const failed = results.filter(r => r.status === 'failed').length;
const report = { work_package_id: 'WP-WALK-SOCIETY-ECONOMY', environment: `Node ${process.version} | isolated VM | ${process.platform}`,
  sources: manifest, declarations, fixture_observations: { generated_quests: questRows }, results,
  passed: results.length - failed, failed, runtime_verified: false };
fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed}/${results.length} isolated checks passed`);
if (failed) process.exitCode = 1;
