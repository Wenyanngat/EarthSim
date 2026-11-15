'use strict';

// Run selected shipped functions against small fixtures. No renderer or game save is loaded.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-walk-core');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['civ.js', 'main.js', 'menu.js', 'net.js', 'netwalk.js', 'panels.js', 'ui.js',
  'walk.js', 'walkact.js', 'walkeco.js', 'walkgen.js', 'walklaw.js', 'walksea.js', 'walkstrike.js', 'walktrade.js'];
const hash = data => createHash('sha256').update(data).digest('hex');
fs.mkdirSync(copy, { recursive: true });
const source = {};
const sources = names.map(name => {
  const rel = `EarthSimulator/${name}`;
  const target = path.join(copy, name);
  fs.copyFileSync(path.join(root, rel), target);
  const data = fs.readFileSync(target);
  source[name] = data.toString('utf8').replace(/\r\n/g, '\n');
  return { path: rel, bytes: data.length, sha256: hash(data) };
});

function block(name, start, end) {
  const src = source[name];
  const a = src.indexOf(start);
  const b = src.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `${name}: ${start}..${end}`);
  return src.slice(a, b);
}

function line(name, start) {
  return block(name, start, '\n');
}

function fn(name, symbol) {
  const start = `function ${symbol}(`;
  const first = line(name, start);
  return first.trimEnd().endsWith('}') ? first : block(name, start, '\n}\n') + '\n}';
}

const walk = (...ids) => ids.map(id => fn('walk.js', id)).join('\n');
const gen = (...ids) => ids.map(id => fn('walkgen.js', id)).join('\n');
const act = (...ids) => ids.map(id => fn('walkact.js', id)).join('\n');
const balance = block('walkgen.js', 'const WALK = {', '\n};') + '\n};\n' +
  block('walkact.js', 'Object.assign(WALK, {', '\n});') + '\n});';
const noOp = () => {};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const plain = v => JSON.parse(JSON.stringify(v));
const results = [];
const declarations = {};

function setup(code, extra = {}) {
  const ctx = vm.createContext({ console, clamp, lerp: (a, b, t) => a + (b - a) * t,
    GRID: { W: 3, H: 3, N: 9 }, T: (ru, en) => en, TF: (ru, en) => en,
    WK: {}, W: { isWater: Array(9).fill(0), fallout: Array(9).fill(0) },
    walkActive: false, latinNames: () => true, netLive: () => false,
    wkMsg: noOp, wkSfx: noOp, ...extra });
  vm.runInContext(balance + '\n' + code, ctx);
  return code => vm.runInContext(code, ctx, { timeout: 3000 });
}

function test(group, label, check) {
  const id = `WC${String(results.length + 1).padStart(2, '0')}-${group}`;
  try {
    check();
    results.push({ id, label, status: 'passed' });
  } catch (e) {
    console.error(`${id}: ${label}\n${e.stack}`);
    results.push({ id, label, status: 'failed', error: e.message });
  }
}

const mode = walk('wkOptsOf', 'walkOpts', 'wkOptsNorm');
const profiles = block('walkact.js', 'const WKP = {};', 'function waArmsBind(');
const arms = act('waArmsBind', 'waAmmoKind', 'waAmmoHas', 'waAmmoAdd', 'waAmmoUse', 'waGive', 'waTake', 'waEquipCheck');
const wallet = line('walkeco.js', 'const ecoRich =') + '\n' + ['wkCash', 'wkMoney', 'wkPay'].map(id => fn('walkeco.js', id)).join('\n');
const stockHooks = {};
const stock = setup(mode + '\n' + profiles + arms + '\n' + wallet, {
  hooks: stockHooks, simOn: (event, callback) => stockHooks[event] = callback,
  WA: { mode: 'survival', wi: 0, wpns: [], ammo: {} }, WA_WPN: { fist: {}, rifle: { ammo: 'round' } },
  WA_AMMO: { round: {} }, ecoIssuer: id => id, ecoClamp: clamp, ecoVal: () => 1, ecoStat: noOp, waVmSet: noOp,
  localStorage: { getItem: () => '{"mode":"survival","god":true}' },
});

test('mode', 'Default mode and survival flag normalization', () => {
  assert.deepEqual(plain(stock('wkOptsOf(null)')), { mode: 'armed', god: false, rich: false });
  assert.deepEqual(plain(stock('walkOpts()')), { mode: 'survival', god: false, rich: false });
});
test('mode', 'Option-provider errors fall back and armed flags survive', () => {
  assert.equal(stock("wkOptsNorm(() => { throw Error('fixture'); }).mode"), 'survival');
  assert.equal(stock("wkOptsNorm(() => ({god: true, rich: true})).rich"), true);
});
test('mode', 'Armed spends no stored ammunition; survival consumes what exists', () => {
  assert.deepEqual(plain(stock("waGive('rifle', 4); WA.mode='armed'; waArmsBind(); [waAmmoHas('round') === Infinity, waAmmoUse('round', 9), WKP.arms.reserve.round]")), [true, 9, 4]);
  assert.deepEqual(plain(stock("WA.mode='survival'; waArmsBind(); [WA.wpns, WA.ammo===WKP.arms.loaded, waAmmoUse('round',9), waAmmoHas('round')]")), [['fist', 'rifle'], true, 4, 0]);
});
test('mode', 'Removing owned equipment clears its loaded field and returns to fists', () => {
  assert.deepEqual(plain(stock("WKP.arms.loaded.rifle=2; WA.wi=1; [waTake('rifle'), WA.wpns, WA.wi, 'rifle' in WKP.arms.loaded, waTake('fist')]")), [true, ['fist'], 0, false, false]);
});
test('mode', 'Rich payment leaves real balance intact and regular payment debits it', () => {
  assert.deepEqual(plain(stock('WKP.purse[6]=40; WK.opts={rich:true}; [wkMoney(6),wkPay(6,100),wkCash(6)]')), [1e9, true, 40]);
  assert.deepEqual(plain(stock('WK.opts={}; [wkPay(6,41),wkPay(6,30),wkCash(6)]')), [false, true, 10]);
});

test('profile', 'Legacy profile migrates in place and keeps extension values', () => {
  assert.deepEqual(plain(stock("const old = WKP; hooks.load({ext:{walk:{purse:{7:42},ext:{demo:{count:3}},seq:6}}}); [old===WKP, WKC.list.length,WKP.purse[7],WKP.ext.demo.count,wkpId()]")), [true, 1, 42, 3, 7]);
});
test('profile', 'Creation carries onboarding and sequence but isolates inventory and money', () => {
  assert.deepEqual(plain(stock("WKP.ext.eco={tips:{seen:1}}; const second=wkcCreate('A < B'); [second,WKC.list[1].name,WKP.purse[7]||0,WKP.ext.eco.tips.seen,WKP.seq]")), [2, 'A B', 0, 1, 7]);
});
test('profile', 'Switch restores the first hero and keeps the second snapshot', () => {
  assert.deepEqual(plain(stock("WKP.inv.food=3; WKP.bounty[8]=50; [wkcSwitch(1),WKP.purse[7],wkcList()[1].items,wkcList()[1].wanted]")), [true, 42, 3, 1]);
});
test('profile', 'World save v2 takes live and inactive data and restores active ID', () => {
  assert.deepEqual(plain(stock('const save={ext:{}}; hooks.save(save); hooks.reset(); hooks.load(save); [save.ext.walk.v,WKC.cur,WKP.purse[7],wkcSwitch(2),WKP.inv.food,WKP.bounty[8]]')), [2, 1, 42, true, 3, 50]);
});
test('profile', 'Active walk rejects roster switching, creation, deletion, reset and UI rename', () => {
  assert.deepEqual(plain(stock("walkActive=true; [!!wkcLocked(),wkcSwitch(1),wkcCreate('X'),wkcDelete(1),wkcReset()]")), [true, false, 0, false, false]);
  stock(fn('ui.js', '_wcHave') + '\n' + fn('ui.js', '_wcLocked') + '\n' + fn('ui.js', '_wcCommit'));
  assert.equal(stock("const document={getElementById:()=>({value:'New'})}; let _wcEdit=1; _wcCommit(); WKC.list[0].name"), 'Wanderer');
  stock('walkActive=false');
});
test('profile', 'Reset cleans only active profile and retains tips and quest counter', () => {
  assert.deepEqual(plain(stock('WKP.seq=23; [wkcReset(),WKC.cur,WKP.inv.food||0,WKP.bounty[8]||0,WKP.ext.eco.tips.seen,WKP.seq,wkcList().length]')), [true, 2, 0, 0, 1, 23, 2]);
});
test('profile', 'Deleting active selects its neighbor; last hero cannot be removed', () => {
  assert.deepEqual(plain(stock('const third=wkcCreate("C"); wkcSwitch(2); [wkcDelete(2),WKC.cur===third,wkcDelete(1),wkcDelete(third),wkcList().length]')), [true, true, true, false, 1]);
});
test('profile', 'Roster accepts 100 unique valid IDs and falls back to first hero', () => {
  assert.deepEqual(plain(stock("wkcLoad({cur:9999,chars:[{id:0},{id:1,name:'first'},{id:1,name:'duplicate'},...Array.from({length:105},(_,i)=>({id:i+2,name:'X'.repeat(30)}))]}); [WKC.cur,WKC.list[0].name,WKC.list.length,WKC.list[99].name.length,wkcCreate('full')]")), [1, 'first', 100, 24, 0]);
});
test('profile', 'World generation clears all characters', () => {
  assert.deepEqual(plain(stock('hooks.worldgen(); [WKC.cur,WKC.list.length,WKP.seq,Object.keys(WKP.purse).length]')), [1, 1, 0, 0]);
});

const noopNames = ['wkCss', 'wkHudMake', 'wkResize', 'wkEnvMake', 'wkEnvDispose', 'wkGenDispose',
  'wkHudDrop', 'wkVeil', 'wkLock', 'wkUiClose', 'wkLocUpdate', 'wkWxTarget', 'wkStreamPlan'];
class Scene {
  children = [];
  add(o) { this.children.push(o); }
  remove(o) { this.children.splice(this.children.indexOf(o), 1); }
}
const lifecycle = setup(mode + '\n' + walk('walkEnter', 'wkEnterBody', 'wkHook', 'walkExit', 'walkSimSpeed',
  'wkPrefsSave', 'wkPlayerSpawn', 'wkTeleport', 'wkReadyCheck', 'wkRespawn') + '\n' +
  gen('wkChunkKey') + '\n' + line('walk.js', 'const _wkCo ='), {
  ...Object.fromEntries(noopNames.map(name => [name, noOp])),
  window: { devicePixelRatio: 2 }, performance: { now: () => 1000 },
  localStorage: { getItem: () => '{"help":1}' },
  THREE: { Scene, PerspectiveCamera: class { rotation = {}; }, Color: class {}, PCFShadowMap: 1, PCFSoftShadowMap: 2 },
  document: { body: { classList: { add: noOp, remove: noOp } } }, wkGfx: () => 1,
  wkSfxScene: noOp, wkBind: noOp, wkHeight: () => 12, wkGround: () => 12, wkWaterAt: () => 0,
  wkAgeOf: () => 5, wkEraOf: () => 2, wkSpawnPoint: cell => ({ x: cell * 400 + 200, z: 200 }),
  wkCollide: (x, z) => ({ x, z, hit: false }), init3D: () => true, WK_T: { VILLAGE: 2 },
  _3d: { canvas: {}, rend: { pr: 2, shadowMap: { enabled: false, type: 42 },
    getPixelRatio() { return this.pr; }, setPixelRatio(v) { this.pr = v; }, getClearColor: () => ({ getHex: () => 7 }),
    getClearAlpha: () => 0.25, setRenderTarget: noOp, setClearColor(a, b) { this.clear = [a, b]; } } },
});
lifecycle(`const calls=[]; W.paused=true; WK.tier=[0,2,5,0,0,0,0,0,0]; WK.chunks=new Map();
  function waHookRun(...args) { calls.push(args); }
  function wkGenInit() { WK.shadows=2; }
  function focusCell(i, exact) { calls.push(['focus',i,exact]); }
  function wkStreamAcceptAll() { calls.push(['flush']); WK.pendN=0; }
  function wkUiOpen(window) { calls.push([window]); }
  WK.el={modal:{classList:{remove(){} }}};`);
test('entry', 'Entry suspends map pause and creates local clocks, scene and player', () => {
  assert.deepEqual(plain(lifecycle("[walkEnter(0,{mode:'survival'}),W.paused,window.walkActive,WK.tod,WK.time,walkSimSpeed(),WK.pl.hp,WK.ready,WK.cam.rotation.order,_3d.rend.pr]")), [true, false, true, 9.5, 0, 0, 100, false, 'YXZ', 1.5]);
  assert.deepEqual(plain(lifecycle('calls.map(x=>x[0])')), ['enter', 'arrive']);
});
test('entry', 'World speed is independent from walk clock and pauses locally', () => {
  assert.equal(lifecycle('WK.simMode=1; walkSimSpeed()'), 0.02);
  assert.equal(lifecycle('WK.simMode=2; walkSimSpeed()'), 0.1);
  assert.equal(lifecycle('WK.paused=true; walkSimSpeed()'), 0);
});
test('entry', 'Active entry teleports, respects hook and water eligibility', () => {
  assert.deepEqual(plain(lifecycle("W.isWater[2]=1; [wkTeleport(2,{force:true}),walkEnter(-1),walkEnter(1,{mode:'armed'}),WK.opts.mode]")), [false, false, true, 'survival']);
  assert.deepEqual(plain(lifecycle('waCanTeleport=()=>({ok:false}); [wkTeleport(0),wkTeleport(0,{force:true})]')), [false, true]);
});
test('entry', 'Teleport flushes pending structure, retains HP and consumes spawn callback', () => {
  assert.deepEqual(plain(lifecycle('WK.pl.hp=37; WK.pendN=2; WK.spawnAt=()=>({cell:1,x:250,z:230,deck:true}); wkTeleport(1,{force:true}); [WK.pl.hp,WK.pl.x,WK.spawnAt,WK.pendN,calls.at(-2)[0],calls.at(-1)[2]]')), [37, 250, null, 0, 'flush', 'teleport']);
});
test('entry', 'Ready gate rejects incomplete chunks and opens after timeout', () => {
  assert.deepEqual(plain(lifecycle('wkReadyCheck(); const before=WK.ready; WK.readyT=-10000; WK.wantHelp=true; wkReadyCheck(); [before,WK.ready,WK.last,calls.at(-1)[0]]')), [false, true, 0, 'help']);
});
test('entry', 'Respawn searches land villages and emits arrive without replacing session options', () => {
  assert.deepEqual(plain(lifecycle("WK.pl.cell=0; WK.pl.hp=0; WK.pl.dead=true; wkRespawn(-1); [WK.pl.cell,WK.pl.hp,WK.pl.dead,WK.opts.mode,calls.at(-1)[2]]")), [1, 100, false, 'survival', 'respawn']);
});
test('entry', 'Exit restores renderer settings, prior pause and map focus', () => {
  assert.deepEqual(plain(lifecycle('walkExit(); [W.paused,window.walkActive,WK.scene,_3d.rend.pr,_3d.rend.shadowMap.type,_3d.rend.clear,calls.at(-2)[0],calls.at(-1)]')), [true, false, null, 2, 42, [7, 0.25], 'exit', ['focus', 1, true]]);
});

const life = setup(walk('wkPlayerSpawn', 'wkPlayerStep', 'wkHurt', 'wkHeal') + '\n' + line('walk.js', 'const _wkCo ='), {
  performance: { now: () => 0 }, wkHeight: () => 5, wkAgeOf: () => 0, wkEraOf: () => 0,
  wkSpawnPoint: () => ({ x: 200, z: 200 }), wkStreamPlan: noOp, wkCellAt: () => 0,
  wkSurface: () => 'grass', wkLocUpdate: noOp, wkCollide: (x, z) => ({ x, z, top: -1e9 }),
});
life(`let floor=5, water=0, heavy=false, consume=false, armor=1;
  const events=[]; WK.ui={}; WK.keys={}; WK.time=9;
  function wkGround() { return floor; }
  function wkWaterAt() { return water; }
  function wkHeavy() { return heavy; }
  function wkHook(name, why) { events.push([name,why]); return consume; }
  function wkUiOpen(window) { events.push([window]); }
  function waHookHurt(dmg) { return dmg*armor; }
  function reset() { WK.opts={}; WK.ui={}; WK.keys={}; floor=5; water=0; heavy=false; consume=false; armor=1; W.fallout[0]=0; events.length=0; wkPlayerSpawn(0); WK.pl.yaw=0; }
  reset();`);
test('life', 'Walking, sprint, diagonal clamp and carrying use shipped speeds', () => {
  life('WK.keys.fwd=true; WK.keys.right=true; wkPlayerStep(0.1)');
  near(life('Math.hypot(WK.pl.vx,WK.pl.vz)'), 4.3);
  near(life('WK.keys.run=true; wkPlayerStep(0.1); Math.hypot(WK.pl.vx,WK.pl.vz)'), 7.8);
  near(life('heavy=true; WK.keys.jump=true; wkPlayerStep(0.1); Math.hypot(WK.pl.vx,WK.pl.vz)'), 2.4);
  assert.equal(life('WK.pl.onGround'), true);
});
test('life', 'Window suppresses motion input and crouch reduces speed', () => {
  near(life("reset(); WK.keys={fwd:true,crouch:true}; wkPlayerStep(0.1); -WK.pl.vz"), 1.9);
  near(life("WK.ui.open='dlg'; wkPlayerStep(0.1); Math.abs(WK.pl.vz)"), 0);
});
test('life', 'Jump launches a living player; an impact above threshold damages', () => {
  assert.equal(life('reset(); WK.keys.jump=true; wkPlayerStep(0.1); WK.pl.vy>0 && !WK.pl.onGround'), true);
  assert(life('reset(); Object.assign(WK.pl,{y:5.1,vy:-12,onGround:false}); wkPlayerStep(0.1); WK.pl.hp < 86 && WK.pl.onGround'));
});
test('life', 'Water activates swim; a sustained dive emits drowning damage', () => {
  assert.deepEqual(plain(life('reset(); water=8; floor=2; WK.pl.y=5; WK.keys.crouch=true; WK.pl.wet=14; wkPlayerStep(0.1); [WK.pl.swim,WK.pl.wet,WK.pl.hp]')), [true, 12, 92]);
});
test('life', 'Fallout ticks at the current cell and quiet time later regenerates', () => {
  near(life('reset(); W.fallout[0]=0.5; WK.pl.rad=1; wkPlayerStep(0.1); WK.pl.hp'), 97.5);
  near(life('W.fallout[0]=0; WK.pl.hurtT=6.1; wkPlayerStep(0.1); WK.pl.hp'), 97.7);
});
test('life', 'Armor runs before HP reduction; god mode restores HP immediately', () => {
  assert.equal(life("reset(); armor=0.5; wkHurt(20,'test'); WK.pl.hp"), 90);
  assert.equal(life("WK.opts.god=true; wkHurt(300,'test'); WK.pl.hp"), 100);
});
test('life', 'Lethal damage calls the death hook and opens default UI only if unhandled', () => {
  assert.deepEqual(plain(life("reset(); wkHurt(101,'fall'); [WK.pl.dead,wkHeal(5),events]")), [true, 0, [['death', 'fall'], ['dead']]]);
  assert.deepEqual(plain(life("reset(); consume=true; wkHurt(101,'guard'); events")), [['death', 'guard']]);
});
test('life', 'Law excludes environmental deaths and intercepts eligible guard deaths', () => {
  const law = setup(fn('walklaw.js', 'lawDeath'), { LAW: { stars: 2 }, lawArrestCtx: () => ({}), lawOfficerNear: () => false, lawArrest: noOp });
  assert.deepEqual(plain(law("['fall','drown','rad','beast','fire','guard'].map(lawDeath)")), [false, false, false, false, false, true]);
});

const keys = setup(walk('wkKeyName', 'wkOnKeyDown', 'wkOnKeyUp', 'wkOnBlur') + '\n' + fn('walkeco.js', 'ecoKey') + '\n' +
  block('walkeco.js', 'const ECO_WIN_JOURNAL =', "ecoKey('b',"), {
  walkActive: true, WK_KEYS: {}, WK_WINDOWS: {}, NP: { walkT: 3 }, UI: { anyOpen: () => false },
});
keys(`WK.held={}; WK.keys={}; WK.ui={}; WK.pl={}; WK.simMode=0;
  const actions=[]; const event=(key,code='',repeat=false)=>({key,code,repeat,preventDefault(){},stopPropagation(){}});
  const press=(...args)=>wkOnKeyDown(event(...args));
  function wkUiOpen(kind,data) { actions.push([kind,data]); WK.ui.open=kind; }
  function wkUiClose() { actions.push(['close']); WK.ui.open=null; }
  function wkWinOf(kind) { return WK_WINDOWS[kind]; }
  function wkDlgPick(i) { actions.push(['answer',i]); }
  function wkActInteract() { actions.push(['interact']); }
  function wkVehKey(k) { actions.push(['vehicle',k]); return true; }
  function netCanTime() { return true; }
  function netWalkTimeName() { return ''; }
  function netSetWalkTime(v) { NP.walkT=v; }`);
test('controls', 'Physical keys, arrows and modifiers normalize to walk tokens', () => {
  assert.deepEqual(plain(keys("[wkKeyName(event('ц','KeyW')),wkKeyName(event('ArrowLeft')),wkKeyName(event('Control','ControlRight')),wkKeyName(event('!','Digit1'))]")), ['w', 'left', 'ctrl', '1']);
});
test('controls', 'Repeat maintains held state; release and blur clear it', () => {
  assert.deepEqual(plain(keys("press('w','KeyW',true); const held=WK.keys.fwd && WK.held.w; wkOnKeyUp(event('w','KeyW')); press('s','KeyS'); wkOnBlur(); [held,WK.keys.fwd,WK.keys.back,WK.held.s]")), [true, false, false, false]);
});
test('controls', 'Dialog intercepts digits and E before module or vehicle', () => {
  assert.deepEqual(plain(keys("WK_KEYS.e=()=>{actions.push(['module']);return true}; WK.pl.veh={}; WK.ui.open='dlg'; press('3'); press('e'); actions.splice(0)")), [['answer', 2], ['close']]);
});
test('controls', 'Module, vehicle and base action run in priority order', () => {
  assert.deepEqual(plain(keys("press('e'); delete WK_KEYS.e; press('e'); WK.pl.veh=null; press('e'); actions.splice(0)")), [['module'], ['vehicle', 'e'], ['interact']]);
});
test('controls', 'Local time cycles through three modes; room T delegates to host interface', () => {
  assert.deepEqual(plain(keys("[1,2,3].map(()=>{press('t');return WK.simMode;})")), [1, 2, 0]);
  assert.equal(keys("netLive=()=>true; press('t'); NP.walkT"), 0);
  assert.equal(keys("NP.walkT=3; netCanTime=()=>false; press('t'); NP.walkT"), 3);
});
test('journal', 'J opens pausing journal at Quests and closes the same window', () => {
  assert.deepEqual(plain(keys("press('j'); press('j'); [ECO_WIN_JOURNAL.pause,actions.splice(0)]")), [true, [['journal', { tab: 'quests' }], ['close']]]);
});
test('journal', 'Four tabs render and task/item actions use current profile handlers', () => {
  keys(`const shell={classList:{add(){}},addEventListener(_,cb){this.click=cb;},querySelector(k){return k==='.ui-tabs'?tabs:body;}};
    const tabs={querySelectorAll:()=>[]}, body={scrollTop:7}, state={}, d={};
    UI.esc=v=>v; const ecoCss=()=>{}, ecoD=()=>state;
    const ecoJournalQuests=()=> 'quests', ecoJournalPurse=()=> 'purse', ecoJournalItems=()=> 'items', ecoJournalRep=()=> 'rep';
    const ecoQById=id=>({id,st:'active'}), ecoQuestFinish=(q,ok,reason)=>actions.push([q.id,ok,reason]), ecoUse=item=>actions.push([item]);
    const foot={appendChild(){}}, api={foot:()=>foot, btn:()=>({}),close(){}};
    const click=(dataset,attr='')=>shell.click({target:{closest:()=>({dataset,hasAttribute:k=>k===attr})}});
    ECO_WIN_JOURNAL.build(shell,d,api);`);
  assert.deepEqual(plain(keys("['quests','purse','items','rep'].map(tab=>{click({tab});return body.innerHTML})")), ['quests', 'purse', 'items', 'rep']);
  assert.deepEqual(plain(keys("click({trk:'4'}); click({ask:'4'},'data-ask'); const prompt=d.confirm; click({drop:'4'}); click({use:'food'}); ECO_WIN_JOURNAL.close(shell,d); [state.track,prompt,d.confirm,d.render,body.scrollTop,actions.splice(0)]")), [4, 4, 0, null, 7, [[4, false, 'abandon'], ['food']]]);
});

const interaction = setup(act('waTargetFind', 'waTargetScore', 'wkActInteract'), {
  UI: { esc: v => v }, keyLabel: v => v, WA_TARGETS: [],
  WA: { npcs: [], animals: [], soldiers: [], vehs: [], mode: 'armed' }, waProf: () => 'person',
  waHookList: () => null, tLower: v => v, waSpName: () => 'animal',
});
interaction(`WK.pl={x:0,y:0,z:0,yaw:0}; WK.ui={}; const log=[];
  function waTalk(n){log.push(n.id);}
  function waButcher(a){log.push(a.id);}
  function waLoot(n){log.push(n.id);}
  function waLootable(){return true;}`);
test('interact', 'NPC eligibility excludes hostile and rear candidates; E dispatches dialogue', () => {
  assert.deepEqual(plain(interaction("WA.npcs=[{id:'rear',d:2,x:0,z:2},{id:'hostile',d:0.5,x:0,z:-0.5,hostile:true},{id:'front',d:3,x:0,z:-3}]; wkActInteract(); log.splice(0)")), ['front']);
});
test('interact', 'Module target checks reach, elevation and direction and can outrank NPC', () => {
  assert.deepEqual(plain(interaction("const target={x:0,y:0,z:-2,prio:3,act:()=>log.push('module')}; [waTargetScore({...target,y:3},WK.pl,0,-1),waTargetScore({...target,z:2},WK.pl,0,-1),waTargetScore(target,WK.pl,0,-1)]")), [1e9, 1e9, -2]);
  assert.deepEqual(plain(interaction("WA_TARGETS.push(()=>target); wkActInteract(); log.splice(0)")), ['module']);
});
test('interact', 'Dead, seated or modal player cannot use a target; eligible bodies and carcasses dispatch', () => {
  assert.deepEqual(plain(interaction("WK.pl.dead=true; wkActInteract(); WK.pl.dead=false; WK.pl.veh={}; wkActInteract(); WK.pl.veh=null; WK.ui.open='dlg'; wkActInteract(); log.splice(0)")), []);
  assert.deepEqual(plain(interaction("WK.ui.open=null; WA_TARGETS.length=0; WA.npcs=[]; WA.mode='survival'; WA.soldiers=[{id:'body',dead:true,d:2}]; wkActInteract(); WA.animals=[{id:'carcass',dead:true,d:1,r:1}]; wkActInteract(); log.splice(0)")), ['body', 'carcass']);
});

const constants = ['const WK_T =', 'const WK_DX =', 'let _wkS =', 'const WK_BLAST_THIN =', 'const WK_BLAST_TOUGH =',
  'const wkBlastWallK ='].map(s => line('walkgen.js', s)).join('\n');
const world = setup(constants + '\n' + gen('wkRng', 'wkCellAt', 'wkBuildTiers', 'wkWorldChecksum', 'wkPlan', 'wkChunkKey',
  'wkHeldCells', 'wkStreamRefresh', 'wkStreamAcceptAll', 'wkDmgKey', 'wkDmgNote', 'wkDmgSet', 'wkDmgApply',
  'wkBlastThin', 'wkBldDist', 'wkChunkAtXZ', 'wkDmgChunk', 'wkDmgTick', 'wkColOf', 'wkDmgCol', 'wkDmgTopple', 'wkBlastWorld'), {
  CIV: { CITY_URBAN_MIN: 4000, CITY_POP_MIN: 5000 }, wkEraOf: () => 2,
});
world(`W.elev=Array(9).fill(0.4); W.pop=[9000,300,800,300,0,0,300,0,2000];
  W.urban=[11000,0,0,0,0,0,0,0,500]; W.rTier=Array(9).fill(0); W.ruin=Array(9).fill(0);
  W.isWater[6]=1; WK.tier=new Uint8Array(9); WK.imp=new Float32Array(9); WK.flat=new Float32Array(9);
  let sig=3, look=0; const wkCellSig=()=>sig, wkLookSig=()=>look;
  const wkPlanBuild=(i,sig)=>({i,sig}); const wkAddP=(pl,k,x,z,opt)=>pl.bld.push({k,x,z,...opt});
  WK.plans=new Map(); WK.cells=new Map(); WK.chunks=new Map(); WK.queue=[]; WK.dmg=new Map(); WK.dmgQ=new Map();
  WK.ready=true; WK.pl={}; WK.detail=2; WK.time=2; WK.farRebT=0;
  const ch={key:0,state:1,dState:1,vis:true,near:0,ci:0,lookSig:0,queued:0,cols:[]}; WK.chunks.set(0,ch);
  WK.cells.set(0,{i:0,sig:3});
  const building=(k,x=50,z=50,y=0)=>({k,x,z,y,w:10,d:10,h:6,c:1,s:0});`);
test('world', 'Map geometry maps 400 m cells to four 200 m chunks', () => {
  assert.deepEqual(plain(world('[WALK.CELL/WALK.CHUNK,wkCellAt(400,399.9),wkCellAt(399.9,400),wkCellAt(-0.1,0),wkCellAt(1200,0)]')), [2, 1, 3, -1, -1]);
});
test('world', 'Seeded generators repeat by world salt and differ with seed or cell', () => {
  const draws = salt => plain(world(`_wkS=${salt}; constDraw=wkRng(10); [constDraw(),constDraw(),wkRng(11)()]`));
  assert.deepEqual(draws(127), draws(127));
  assert.notDeepEqual(draws(127), draws(128));
  const values = draws(127);
  assert.notEqual(values[0], values[2]);
});
test('world', 'Projected class follows city, inner ring, rural, village and wild tiers', () => {
  assert.deepEqual(plain(world('wkBuildTiers(); [WK.tier[0],WK.tier[1],WK.tier[2],WK.tier[6],WK.tier[8]]')), [5, 4, 1, 0, 2]);
});
test('world', 'Terrain checksum changes on elevation and ignores population', () => {
  assert.deepEqual(plain(world('const ck=wkWorldChecksum(); W.pop[0]+=50; const same=wkWorldChecksum()===ck; W.elev[0]+=0.1; [same,wkWorldChecksum()!==ck]')), [true, true]);
});
test('world', 'Visible nearby cell keeps accepted plan; hidden cell accepts new structure', () => {
  assert.deepEqual(plain(world('const start=wkPlan(0); sig=4; wkStreamRefresh(); [WK.pendN,wkPlan(0)===start,WK.queue.length]')), [1, true, 0]);
  assert.deepEqual(plain(world('ch.vis=false; wkStreamRefresh(); [WK.pendN,wkPlan(0).sig,WK.queue.map(j=>j.kind)]')), [0, 4, [0, 1]]);
});
test('world', 'Visible room cell can recolor separately; teleport accepts pending signature', () => {
  assert.deepEqual(plain(world('ch.vis=true; ch.queued=0; ch.dState=1; WK.queue=[]; sig=5; look=1; netLive=()=>true; wkStreamRefresh(); [WK.pendN,wkPlan(0).sig,WK.queue.map(j=>j.kind)]')), [1, 4, [2]]);
  assert.deepEqual(plain(world('wkStreamAcceptAll(); [WK.pendN,WK.ready,wkPlan(0).sig]')), [0, true, 5]);
});
test('damage', 'Thin props vanish; wall breaches and roof props topple', () => {
  assert.deepEqual(plain(world("const fence=building('fence',52), wall=building('wallseg'), roof=building('dome',50,50,5), pl={i:0,bld:[fence,wall,roof],xb:[]}; WK.plans.set(0,pl); WK.dmgQ.clear(); ch.queued=0; ch.dState=1; WK.queue=[]; wkBlastWorld(50,0,50,10,300); [pl.bld.map(b=>b.k),wall.breach,wall.ruin,WK.dmg.get(0).size]")), [['wallseg'], 1, 1, 3]);
});
test('damage', 'Damage persists when the same plan is regenerated, without editing map fields', () => {
  assert.deepEqual(plain(world("const rebuilt={i:0,bld:[building('fence',52),building('wallseg'),building('dome',50,50,5)],xb:[]}; wkDmgApply(rebuilt); [rebuilt.bld.length,rebuilt.bld[0].breach,W.ruin[0],W.pop[0]]")), [1, 1, 0, 9050]);
});
test('damage', 'Visual rebuild waits for the damage deadline and then queues detail', () => {
  assert.deepEqual(plain(world('wkDmgTick(); const before=WK.queue.length; WK.time+=0.31; wkDmgTick(); [before,WK.queue.map(j=>j.kind),WK.dmgQ.size]')), [0, [1], 0]);
});
test('damage', 'Heavy buildings cap at 12 nearest while thin props use their own branch', () => {
  assert.deepEqual(plain(world("pl.bld=Array.from({length:15},(_,i)=>building('house',50+i)); pl.bld.push(building('bench',50)); WK.dmg.clear(); wkBlastWorld(50,0,50,30,40); [pl.bld.filter(b=>b.hit).length,pl.bld.some(b=>b.k==='bench')]")), [12, false]);
});
test('damage', 'Ruined wall keeps a lower obstacle until breached; collapsed house is passable', () => {
  assert.deepEqual(plain(world("const cols=[]; wkColOf({...building('wallseg'),ruin:1},cols); wkColOf({...building('wallseg'),breach:1},cols); wkColOf({...building('house'),ruin:0.9},cols); cols.map(c=>c.y1)")), [3.6]);
});

const room = setup(fn('netwalk.js', 'nwTod') + '\n' + fn('netwalk.js', 'nwWalkState'), {
  WA: { mesh: {}, era: 2, wpns: ['fist'], wi: 0, swing: 0 }, WA_WPN: { fist: { type: 'melee' } },
});
test('room', 'Shared room clock wraps independently from connection-local walk state', () => {
  room('let seconds=0; function netRoomSec(){return seconds;}');
  near(room('nwTod()'), 9.5);
  near(room('seconds=315; nwTod()'), 20);
  near(room('seconds+=120/2.2; nwTod()'), 0);
});
test('room', 'Remote pose payload leaves character profile and session mode out', () => {
  assert.deepEqual(plain(room("WK.pl={yaw:0,pitch:0,crouch:0.4,swim:true,dead:false}; WK.opts={mode:'survival'}; nwWalkState({})")), { e: 2, by: 3.142, ap: 0, cr: 0.4, sm: 1 });
});

test('mode', 'Armed replaces loadout at a higher tier, keeps gear at lower tier and unions discoveries at equal tier', () => {
  stock(`WA.mode='armed'; WA.sty=-1; WA.era=0; WA.loadout=[]; WK.pl={cell:0}; WK.ui={};
    const st={era:2,known:false}; const wkStateOf=()=>st, wkSty=n=>n, tLower=s=>s;
    const waLoadoutFor=(sty,s)=>sty===2 ? ['fist','old'] : s.known ? ['fist','rifle','new'] : ['fist','rifle'];
    Object.assign(WA_WPN,{old:{n:['','old']},new:{n:['','new']}}); WA_WPN.rifle.n=['','rifle'];
    waEquipCheck(true);`);
  assert.deepEqual(plain(stock("const before=WA.wpns.slice(); st.era=3; waEquipCheck(false); const high=WA.wpns.slice(); st.era=2; waEquipCheck(false); const lower=WA.wpns.slice(); st.era=3; st.known=true; waEquipCheck(false); [before, high, lower, WA.wpns]")),
    [['fist', 'old'], ['fist', 'rifle'], ['fist', 'rifle'], ['fist', 'rifle', 'new']]);
  assert.deepEqual(plain(stock("WA.mode='survival'; WA.wpns=['fist']; st.era=4; waEquipCheck(false); WA.wpns")), ['fist']);
});

test('entry', 'Spawn planning consumes battle hint and falls back to facility before plaza', () => {
  const spawn = setup(walk('wkSpawnPoint'), {
    wkPlan: () => ({ special: { plaza: { x: 230, z: 240, r: 10 } }, legs: [null, null, null, null] }),
    wkHeight: () => 3, wkOcc: () => 0,
    waFightArrival: () => ({ fightCell: 1, x: 210, z: 230, face: { x: 210, z: 220 } }),
    wkFacilitySpawn: () => ({ x: 201, z: 203, src: 'port' }),
  });
  assert.deepEqual(plain(spawn("WK.spawnHint='battle'; const a=wkSpawnPoint(0), b=wkSpawnPoint(0); [a.src,a.x,WK.arriveFight,WK.spawnHint,b.src,b.x]")),
    ['battle', 210, 1, null, 'port', 201]);
});

test('entry', 'Room world jump keeps player coordinates and view even on newly flooded cell', () => {
  lifecycle(walk('wkWorldJump', 'wkWorldJumpOk') + '\nfunction wkWorldRebuild(){ calls.push(["rebuild"]); }');
  assert.deepEqual(plain(lifecycle(`walkEnter(1,{mode:'armed'}); Object.assign(WK.pl,{x:230,z:250,yaw:0.9,pitch:0.2,hp:63});
    W.isWater[1]=1; WK.ready=true; netLive=()=>true; waCanTeleport=()=>({ok:true});
    const allowed=!!wkWorldJumpOk(); wkWorldJump('fixture'); [allowed,WK.pl.x,WK.pl.z,WK.pl.yaw,WK.pl.pitch,WK.pl.hp,calls.at(-2)[0]]`)),
    [true, 230, 250, 0.9, 0.2, 63, 'rebuild']);
});

test('damage', 'Disposal clears the walk-session damage journal and refresh queue', () => {
  world(gen('wkGenDispose') + '\nfunction wkStreamReset(){}');
  assert.deepEqual(plain(world('WK.dynCols=[]; WK.plat=[]; WK.disposables=[]; const damageBefore=WK.dmg.size; wkGenDispose(); [damageBefore,WK.dmg.size,WK.dmgQ.size]')), [1, 0, 0]);
});

declarations.balance = plain(world(`Object.fromEntries(${JSON.stringify(['CELL', 'CHUNK', 'QUAD', 'VIEW', 'DETAIL_R', 'BUILD_MS', 'DAY_LEN', 'START_HOUR', 'SIM_SLOW', 'SIM_FAST', 'HP', 'REGEN_DELAY', 'HP_REGEN', 'ACT_CHAR_MAX', 'ACT_CHAR_NAME', 'GEN_BLAST_MAX', 'GEN_BLAST_DELAY'])}.map(k=>[k,WALK[k]]))`));
declarations.settlement_tiers = plain(world('WK_T'));
declarations.building_toughness = plain(world('WK_BLAST_TOUGH'));
declarations.character_profile = plain(stock('wkpBlank()'));
const failed = results.filter(r => r.status === 'failed').length;
const report = { work_package_id: 'WP-WALK-CORE', environment: `Node ${process.version} | isolated VM | ${process.platform}`,
  sources, declarations, results, passed: results.length - failed, failed, runtime_verified: false };
fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed}/${results.length} isolated checks passed`);
if (failed) process.exitCode = 1;
