// Exercise the shipped game handlers with synthetic worlds and in-memory adapters.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-disasters');
const copy = path.join(out, 'test-copy/EarthSimulator');
const files = ['core.js', 'climate.js', 'ecology.js', 'civ.js', 'disasters.js', 'ui.js', 'goals.js',
  'mods.js', 'stats.js', 'people.js', 'menu.js', 'main.js', 'index.html'];
fs.mkdirSync(copy, { recursive: true });
const sources = files.map(name => {
  const bytes = fs.readFileSync(path.join(root, 'EarthSimulator', name));
  const dest = path.join(copy, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
  assert(fs.readFileSync(dest).equals(bytes), `Source mismatch: ${name}`);
  return { path: `EarthSimulator/${name}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
});
const script = name => fs.readFileSync(path.join(copy, name), 'utf8');

function fixture() {
  const handlers = new Map();
  const errors = [];
  const feedback = [];
  let now = 1000;
  const rate = { disabled: false, style: {}, dataset: { rate: '1' }, title: 'Original tip', classList: { toggle() {} } };
  const format = (_, en, ...args) => en.replace(/\{(\d+)\}/g, (match, i) => args[i] ?? match);
  const context = vm.createContext({
    console: { log() {}, warn: (...a) => errors.push(a.join(' ')), error: (...a) => errors.push(a.join(' ')) },
    sessionStorage: { getItem: () => '{"w":24,"h":24}' },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: sel => sel.startsWith('#disaster-rate') ? [rate] : [] },
    window: {}, performance: { now: () => now }, UI_FONT: 'sans-serif',
    T: (_, en) => en, TF: format, TFC: (_, ...args) => format(...args),
    TNn: (n, _a, _b, _c, one, many) => `${n} ${n === 1 ? one : many}`, tLower: s => String(s).toLowerCase(),
    netAct: (id, fn) => handlers.set(id, fn), netDo: (id, ...args) => handlers.get(id)(...args),
    netLive: () => false, netRemote: () => false, netExecuting: () => false, netAside: () => false,
    latinNames: () => true, netNames: fn => fn(), flash: s => feedback.push(s), setOverlay() {}, _rOvDirty: false,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
  });
  const exec = (code, filename = 'disaster-fixture') => vm.runInContext(code, context, { filename, timeout: 10000 });
  const run = code => {
    const result = exec(code);
    assert.deepEqual(errors, [], 'Ignored simulation exception');
    return result;
  };
  const read = expr => JSON.parse(run(`JSON.stringify(${expr})`));
  const load = name => exec(script(name), name);
  function fragment(name, start, stop) {
    const s = script(name), from = s.indexOf(start), end = s.indexOf(stop, from + start.length);
    assert(from >= 0 && end > from, name);
    exec(s.slice(from, end), `${name}/${start}`);
  }
  for (const name of ['core.js', 'climate.js', 'ecology.js', 'civ.js', 'disasters.js', 'ui.js', 'goals.js']) load(name);
  run(`Math.random=()=>.5; const c=idx(12,12), e=c+1, west=c-1;
    W.simYear=100; W.simTick=100; W.disasterRate=0; W.dynSea=0;
    W.elev.fill(.6); W.seaLevel=.4; recomputeStatic(true);
    W.temp.fill(25); W.sst.fill(25); W.precip.fill(600); W.precipSmoothed.fill(600);
    W.veg.fill(.8); W.habEff.fill(1); W.hab.fill(1); W.capacity.fill(1000); W.stateId.fill(-1);
    W.windU.fill(0); W.windV.fill(0); _worldPop=100000;
    function inhabit(i,n=1000){W.pop[i]=n; W.urban[i]=100; W.industry[i]=1; W.capDirty[i]=0;}
    function nation(i){const st=stateBlank(states.length); st.uid=100+st.id; st.alive=true; st.name='State '+st.id;
      st.capital=i; st.cells.add(i); st.area=1; st.pop=1000; st.military=100; st.stability=.5; st.exhaust=.5;
      states.push(st); W.stateId[i]=st.id; inhabit(i); return st;}
    function coast(){for(let y=0;y<GRID.H;y++)for(let x=0;x<12;x++)W.elev[idx(x,y)]=.3; recomputeStatic(true);}
    function yearRoll(name,i){for(const k of Object.keys(DIS))if(k.startsWith('P_'))DIS[k]=0;
      DIS['P_'+name]=2; W.disasterRate=2; Math.random=()=>(i+.01)/GRID.N; simEmit('year',101);}
  `);
  return { run, read, load, fragment, rate, handlers, feedback, time: value => { now = value; } };
}

const results = [];
const near = (actual, expected, eps = 1e-5) => assert(Math.abs(actual - expected) <= eps, `${actual} != ${expected}`);
function test(name, effect) {
  const id = `DD${String(results.length + 1).padStart(2, '0')}-${name}`;
  try {
    results.push({ id, status: 'passed', observation: effect(fixture()) ?? null });
  } catch (error) {
    console.error(id, error.stack);
    results.push({ id, status: 'failed', observation: error.message });
  }
}

test('dispatch-and-circle', ({ run, read }) => {
  assert(run('disasterTrigger("none", c)===null && disasterTrigger("fire", -1)===null'));
  assert(run('!godPower("rain", GRID.N,1,1)'));
  assert.deepEqual(read('(()=>{let a=[]; _around(0,0,1,(i,k)=>a.push([i,k])); return a.map(x=>x[0]);})()'), [0,1,24]);
  assert.deepEqual(read('[disasterTrigger("fire",c,-9).power,disasterTrigger("fire",c,9).power,disasterTrigger("fire",c).power]'), [.1,1,.7]);
  return 'Invalid index/type returns no event; defaults and explicit strength use the shipped clamp.';
});
test('volcano-instant-fields', ({ run, read }) => {
  run('inhabit(c); W.aerosol=5; var d=disasterTrigger("volcano",c,1,true)');
  assert.deepEqual(read('[W.pop[c],Math.round(W.urban[c]),W.fire[c],W.ruin[c],W.volcanic[c],W.tempPulse[c],W.aerosol,d.r,d.life,worldEvents[0].type]'), [250,30,1,1,1,3,6,3.2,2.2,'player']);
  return 'Earthwork, ash, casualties and burning fields checked in a synthetic center cell.';
});
test('volcano-ocean-player-island', ({ run, read }) => {
  run('W.elev.fill(.2); recomputeStatic(true); disasterTrigger("volcano",c,1,false); var before=W.isWater[c]; disasterTrigger("volcano",c,1,true);');
  assert.deepEqual(read('[before,W.isWater[c],W.isWater[e],W.isWater[e+GRID.W]]'), [1,0,0,1]);
  near(run('W.elev[c]'),.58);
  return run('W.landmass[c]>=0');
});
test('quake-tsunami-cascade-and-log', ({ run, read }) => {
  run('coast(); Math.random=()=>.9; inhabit(c); var v=disasterTrigger("quake",west,1,true);');
  assert.deepEqual(read('DISASTERS.map(d=>d.type)'), ['quake','tsunami']);
  near(run('DISASTERS[1].power'),.8);
  assert(run('W.pop[c]<860 && worldEvents.some(e=>e.type==="player"&&e.d.dis==="quake") && worldEvents.some(e=>e.type==="disaster"&&e.d.dis==="tsunami")'));
  return read('DISASTERS.map(d=>({type:d.type,life:d.life}))');
});
test('dry-quake-cascade-roll', ({ run }) => {
  run('coast(); Math.random=()=>.5; disasterTrigger("quake",c,1,false)');
  assert.equal(run('DISASTERS.length'),1);
  run('Math.random=()=>.49; disasterTrigger("quake",c,1,false)');
  assert.equal(run('DISASTERS.at(-1).type'),'tsunami');
  return 'Dry coastal epicenter requires a roll below 0.5.';
});
test('tsunami-coast-only', ({ run, read }) => {
  run('coast(); [west,c,e].forEach(i=>inhabit(i)); disasterTrigger("tsunami",c,1,false);');
  assert.deepEqual(read('[W.pop[west],W.pop[c],W.pop[e],W.capDirty[c],W.capDirty[e]]'),[1000,600,1000,1,0]);
  return 'Only dry coast takes tsunami damage.';
});
test('meteor-crater-ring-and-dust', ({ run, read }) => {
  run('inhabit(c); var d=disasterTrigger("meteor",c,.2,true);');
  near(run('W.elev[c]'),.59);
  assert.deepEqual(read('[W.pop[c],W.tempPulse[c],W.aerosol,W.fire[c],d.life,worldEvents[0].d.imp]'),[30,10,2,0,1,3]);
  near(run('W.fire[c+2]'),.9);
  return 'Power scales the crater, radius and dust. The center population multiplier is 0.03.';
});
test('water-meteor-tsunami', ({ run, read }) => {
  run('coast(); inhabit(c); disasterTrigger("meteor",west,.1,false)');
  assert.deepEqual(read('DISASTERS.map(d=>[d.type,d.power])'),[['meteor',.1],['tsunami',1]]);
  near(run('W.elev[west]'),.3);
  return 'Water impact keeps elevation and spawns a full-strength tsunami.';
});
test('fire-ignition-versus-marker', ({ run, read }) => {
  run('W.veg[e]=.12-1e-6; var d=disasterTrigger("fire",c,.4,true);');
  assert.deepEqual(read('[W.fire[c],W.fire[e],_disRadius("fire",.4),d.r,d.life]'),[1,0,1.6,2.8,.6]);
  return 'Fire preview uses initial ignition radius. Active marker has a separate radius.';
});
test('fire-civ-tick-spread-and-loss', ({ run, read }) => {
  run('inhabit(c); W.precip.fill(0); W.windU[c]=1; _ignite(c,1); simEmit("civTick")');
  const v = read('[W.fire[c],W.fire[e],W.pop[c],W.pop[e],W.veg[c],W.pollution[c],W.ruin[c]]');
  [.72,.8,975,0,.56,.05,.04].forEach((x,i)=>near(v[i],x));
  near(run('W.veg[e]'),.8);
  return v;
});
test('fire-rain-suppression-and-expiry', ({ run }) => {
  run('W.precip.fill(1800); W.windU[c]=1; _ignite(c,1); var d=_push("fire",c,2,.01,1); _disTick();');
  near(run('W.fire[c]'),.42);
  assert(run('W.fire[e]===0 && DISASTERS.length===0 && _burning.has(c)'));
  run('for(let k=0;k<6;k++)_disTick();');
  assert(run('W.fire[c]===0 && !_burning.has(c)'));
  return 'Cells burn independently of the expired visual event. Heavy rain damps fire and blocks spread.';
});
test('hurricane-movement-and-landfall', ({ run, read }) => {
  run('inhabit(c); W.windU[c]=1; var d=disasterTrigger("hurricane",c,1,true);');
  assert.deepEqual(read('[W.pop[c],worldEvents.length,d.vy]'),[1000,0,.18]);
  run('_disTick()');
  near(run('d.x'),12.8); near(run('d.y'),12.68); near(run('d.life'),run('.8-DT_YEAR*3.5'));
  assert(run('d.hit===1 && d.dead>0 && W.pAnom[c]===2 && W.capDirty[c]===0 && worldEvents[0].type==="disaster"'));
  run('_disTick(); d.x=.01; d.vx=-2; _disTick();');
  assert.deepEqual(read('[worldEvents.length,DISASTERS.length]'),[1,0]);
  return 'Hurricane moves on the tick, loses 3.5× time over the old dry cell and announces landfall once.';
});
test('drought-reapplies-and-relaxes', ({ run }) => {
  run('var d=disasterTrigger("drought",c,1,true)');
  near(run('W.pAnom[c]'),.38);
  run('moisturePass()'); assert(run('W.pAnom[c]>.38'));
  run('_disTick()'); near(run('W.pAnom[c]'),.38);
  run('d.life=.001; _disTick(); moisturePass()');
  assert(run('W.pAnom[c]>.38 && !DISASTERS.includes(d)'));
  return 'Drought refreshes anomaly during its last tick. Climate recovery continues after expiration.';
});
test('flood-damage-filter-and-quench', ({ run, read }) => {
  run('[c,e,west].forEach(i=>{inhabit(i);_ignite(i,.8);}); W.riverFlux[c]=.3; disasterTrigger("flood",c,1,true)');
  assert.deepEqual(read('[W.pop[c],W.pop[e],W.pop[west],W.fire[c],W.fire[e],W.capDirty[c],W.capDirty[e]]'),[900,1000,1000,0,0,1,0]);
  near(run('W.pAnom[c]'),2.3);
  assert(run('_burning.has(c)')); run('_disTick()'); assert(!run('_burning.has(c)'));
  return 'Wetting and fire removal apply beyond the damage filter.';
});
test('flash-freeze-pulse', ({ run, read }) => {
  run('coast(); W.tempPulse[west]=-58; inhabit(c); var d=disasterTrigger("blizzard",c,1,true);');
  assert.deepEqual(read('[W.tempPulse[c],W.tempPulse[west],W.pop[c],W.capDirty[c],d.life]'),[-14,-60,1000,1,.5]);
  run('climateStep()'); near(run('W.tempPulse[c]'),-13.3);
  return 'Freeze writes the weather pulse. Climate decays it independently of the active marker.';
});
test('epidemic-threshold-and-immunity', ({ run, read }) => {
  run('inhabit(c,199); var rejected=disasterTrigger("plague",c,1,true); inhabit(c,200); inhabit(e,301); inhabit(west,300); W.immune[c]=100; var p=disasterTrigger("plague",c,1,true);');
  assert.deepEqual(read('[rejected,W.immune[c],W.immune[e],W.immune[west],W.disease[west],p.r,p.life]'),[null,0,200,0,0,3,3]);
  near(run('W.disease[c]'),.9);
  assert(run('W.disease[e]>.6 && W.pop[c]===200'));
  run('W.pop[c]=301; disasterTrigger("plague",c,.2,false)');
  assert.equal(run('W.immune[c]'),200);
  return 'Manual epidemic accepts ≥200 dry residents. Area immunity is applied only above 300 people.';
});
test('epidemic-demography-and-medicine', ({ run, read }) => {
  run('var a=nation(c), b=nation(e); a.tech=9; b.tech=15; W.disease[c]=W.disease[e]=.9; W.immune[c]=W.immune[e]=200; stepPopulation()');
  near(run('W.pop[c]'),892,.001); near(run('W.pop[e]'),978.4,.001);
  assert.deepEqual(read('[W.immune[c],W.immune[e]]'),[199,199]);
  near(run('W.disease[c]'),.765);
  return read('[W.pop[c],W.pop[e]]');
});
test('epidemic-neighbor-demography', ({ run }) => {
  run('var nw=c-GRID.W-1; inhabit(c); inhabit(nw); W.disease[c]=.9; W.immune[c]=200; Math.random=()=>0; stepPopulation();');
  near(run('W.disease[nw]'),.9*.92);
  assert.equal(run('W.immune[nw]'),200);
  return 'Adjacent target receives disease and immunity from the population pass.';
});

for (const [type, setup, expected] of [
  ['volcano','W.slope[c]=.35','volcano'], ['quake','','quake'],
  ['hurricane','coast(); var c1=idx(9,9); W.temp[c1]=25', 'hurricane'],
  ['drought','','drought'], ['flood','W.riverFlux[c]=.2','flood'], ['fire','','fire'],
  ['plague','inhabit(c,21000); cities.push({i:c,pop:21000})','plague'],
  ['meteor','','meteor'], ['blizzard','','blizzard'],
]) {
  test(`annual-${type}`, ({ run, read }) => {
    run(`${setup}; yearRoll(${JSON.stringify(type.toUpperCase())},${type === 'hurricane' ? 'c1' : 'c'});`);
    assert.equal(run('DISASTERS[0]?.type'),expected);
    return read('DISASTERS.map(d=>d.type)');
  });
}
test('annual-selection-can-reject', ({ run }) => {
  run('W.veg.fill(.3-1e-6); yearRoll("FIRE",c); yearRoll("FLOOD",c); W.elev.fill(.42); recomputeStatic(true); yearRoll("VOLCANO",c);');
  assert.equal(run('DISASTERS.length'),0);
  run('inhabit(c,22000); W.immune[c]=1; cities.push({i:c,pop:22000}); yearRoll("PLAGUE",c)');
  assert.equal(run('DISASTERS.length'),0);
  return 'A passed roll still needs eligible terrain/vegetation/river/city.';
});
test('frequency-and-direct-invocation', ({ run }) => {
  run('for(const k of Object.keys(DIS))if(k.startsWith("P_"))DIS[k]=1; Math.random=()=>0; simEmit("year",101)');
  assert.equal(run('DISASTERS.length'),0);
  assert(run('disasterTrigger("blizzard",c,1,true)!==null'));
  return 'Rate zero suppresses annual rolls. Direct game tools remain available.';
});
test('annual-frequency-area-floor', ({ run }) => {
  run('W.elev.fill(.3); recomputeStatic(true); W.disasterRate=1; for(const k of Object.keys(DIS))if(k.startsWith("P_"))DIS[k]=0; DIS.P_METEOR=.1; Math.random=()=>.033; simEmit("year",101)');
  assert.equal(run('DISASTERS.length'),0);
  run('Math.random=()=>.032; simEmit("year",102)');
  assert.equal(run('DISASTERS[0].type'),'meteor');
  return 'All-water fixture still uses the 200-cell floor in roll scaling.';
});

test('rain-area-fire-and-dirty', ({ run }) => {
  run('coast(); _ignite(c,1); W.pAnom[west]=.4; W.capDirty[c]=0; godPower("rain",c,2,2)');
  near(run('W.pAnom[c]'),2.3); near(run('W.pAnom[west]'),.4);
  assert(run('W.fire[c]===0 && W.capDirty[c]===1 && DISASTERS.length===0'));
  return 'Direct rain mutates dry cell fields without creating an active disaster.';
});
test('blessing-clears-disease-preserves-immunity', ({ run, read }) => {
  run('W.eco[c]=.2; W.disease[c]=.8; W.immune[c]=33; W.unrest[c]=W.ruin[c]=W.fallout[c]=1; godPower("bless",c,2,2)');
  const a=read('[W.eco[c],W.disease[c],W.immune[c],W.unrest[c],W.ruin[c],W.fallout[c],W.volcanic[c],W.capDirty[c]]');
  [.5,0,33,.2,.2,.3,1,1].forEach((x,i)=>near(a[i],x));
  return a;
});
test('inspiration-cap-and-golden-age', ({ run }) => {
  assert(!run('godPower("inspire",c,1,2)'));
  run('var a=nation(c); a.tech=CIV.TECH_CAP-.1; a._golden=1.7; godPower("inspire",c,1,2)');
  assert(run('a.tech===CIV.TECH_CAP && a._golden===2 && worldEvents[0].type==="player"'));
  near(run('a.stability'),.7);
  return 'Inspiration needs an owner; it applies the real civilization golden-age helper.';
});
test('peace-border-and-interior', ({ run }) => {
  run('var a=nation(c), b=nation(e), z=nation(idx(4,4)); a._nb=new Map([[b.id,4],[z.id,1]]); var tracked=declareWar(a,b); declareWar(a,z); godPower("peace",c,1,1)');
  assert(run('wars.length===1 && warBetween(a,z) && !warBetween(a,b) && tracked.result==="white" && !warLog.length'));
  near(run('a.exhaust'),.3); near(run('b.exhaust'),.3);
  run('W.stateId[e]=-1; godPower("peace",c,1,1)');
  assert.equal(run('wars.length'),0); near(run('a.exhaust'),.09); near(run('a.stability'),.65);
  return 'Border peace closes one war; interior peace closes all wars involving the nation.';
});
test('scenario-discord-relations-only', ({ run }) => {
  run('var a=nation(c), b=nation(e); a._nb=new Map([[b.id,2]]); a.truce.set(b.id,200); b.truce.set(a.id,200); godPower("discord",c,1,1)');
  assert(run('!wars.length && !a.truce.has(b.id) && !b.truce.has(a.id) && a.stability===.5'));
  near(run('a.relations.get(b.id)'),-.6);
  run('W.stateId[e]=-1; godPower("discord",c,1,1)'); near(run('a.stability'),.3);
  return 'godPower discord changes relations, clears truces and can lower stability.';
});
test('ui-twin-click-discord', ({ run }) => {
  run('var a=nation(c), b=nation(e); applyPointTool("discord",TOOLS.discord,c);');
  assert(run('!wars.length && uiState.discordA===a.uid'));
  run('applyPointTool("discord",TOOLS.discord,e);');
  assert(run('wars.length===1 && warBetween(a,b).cause==="border" && uiState.discordA===null'));
  near(run('a.relations.get(b.id)'),-.85);
  return 'Two targets enter godDiscord via the registered action and open a real game war.';
});
test('ui-discord-selection-timeout', ({ run, time }) => {
  run('var a=nation(c), b=nation(e); applyPointTool("discord",TOOLS.discord,c);');
  time(46000); run('applyPointTool("discord",TOOLS.discord,e);');
  assert(run('!wars.length && uiState.discordA===b.uid'));
  return 'First choice expires at 45 seconds.';
});
test('ui-repeat-nation-discord-limit', ({ run, read }) => {
  run('var a=nation(c), ns=[]; for(let i=0;i<6;i++)ns.push(nation(idx(i,5))); a._nb=new Map(ns.map((s,i)=>[s.id,i+1])); applyPointTool("discord",TOOLS.discord,c); applyPointTool("discord",TOOLS.discord,c)');
  assert.deepEqual(read('wars.map(w=>w.b)'),[6,5,4,3]);
  assert(run('a.relations.get(1)===-1 && a.relations.get(2)===-1')); near(run('a.stability'),.3);
  return read('wars.map(w=>w.b)');
});
test('ui-disaster-latch-and-strength', ({ run, read }) => {
  run('setTool("quake"); uiState.strength=8; applyTool(12,12); applyTool(13,12); finishPaint(); applyTool(13,12);');
  assert.deepEqual(read('DISASTERS.map(d=>[d.x,d.power])'),[[12.5,.8],[13.5,.8]]);
  return 'Point tool fires once until brush completion, using slider strength / 10.';
});
test('ui-area-and-biome-brush', ({ run }) => {
  run('setTool("rain"); uiState.brush=1; uiState.strength=5; W.pAnom.fill(1); applyTool(12,12);');
  assert(run('W.pAnom[e]>1 && W.pAnom[c+2]===1'));
  run('setTool("terrain"); uiState.biome="alpine"; uiState.brush=0; applyTool(12,12)');
  assert(run('W.temp[c]===1 && W.precip[c]===800 && W.biome[c]===BID.alpine && _terrainTouched'));
  return 'Area power covers the circular brush once. Biome tool writes climate, relief and current biome.';
});
test('ui-eraser-keeps-natural-and-resource-fields', ({ run, read }) => {
  run('var a=nation(c); W.res[c]=RID.iron; W.ruin[c]=.4; W.fire[c]=.4; W.fallout[c]=.4; W.immune[c]=88; W.tempForce[c]=5; W.windAddU[c]=1; setTool("eraser"); uiState.brush=0; applyTool(12,12)');
  assert.deepEqual(read('[W.pop[c],W.stateId[c],W.res[c],W.tempForce[c],W.windAddU[c],W.immune[c],a.cells.size]'),[0,-1,1,0,0,88,0]);
  for (const field of ['ruin','fire','fallout']) near(run(`W.${field}[c]`),.4);
  return 'Eraser clears ownership and listed brush fields without removing deposits or ruin/fire/fallout.';
});
test('scenario-tool-and-rate-locks', ({ run, rate }) => {
  run('setTool("inspire"); var def={lock:["dis"],lockTools:["inspire"]}; _applyScenarioLocks(def,true); setTool("inspire")');
  assert(run('uiState.tool==="inspect" && _toolLocks.inspire===1'));
  assert.equal(rate.disabled,true);
  run('_applyScenarioLocks(def,false); setTool("inspire");');
  assert(run('uiState.tool==="inspire" && !_toolLocks.inspire'));
  assert.equal(rate.disabled,false); assert.equal(rate.title,'Original tip');
  run('activeScenario={def:SCENARIOS.find(s=>s.enforce?.disasters===4),won:true}; _goalsTickCount=15; goalsTick();');
  assert.equal(run('W.disasterRate'),4);
  return 'Scenario disables widgets, deselects an active banned tool, restores controls and can enforce rate.';
});
test('scheduled-disaster-and-power-ingress', ({ run, fragment }) => {
  fragment('mods.js','function _mEvSt(','function _mClimateShift(');
  run(`var at={mode:'xy',x:.51,y:.51}, store={};
    var ev={uid:'fixture',year:7,once:true,every:0,when:null,chance:1,act:{do:'disaster',type:'volcano',at,power:1}};
    W.elev.fill(.2); recomputeStatic(true);`);
  assert(!run('_mEventCheck(ev,6,store,null,()=>({}),false)'));
  assert(run('_mEventCheck(ev,7,store,null,()=>({}),false) && W.isWater[c]===1 && DISASTERS.length===1'));
  assert(!run('_mEventCheck(ev,8,store,null,()=>({}),false)'));
  run('W.elev[c]=.6; recomputeStatic(true); var a=nation(c); _mEventFire({act:{do:"power",type:"inspire",at,power:2,radius:4}},null)');
  near(run('a._golden'),.8);
  return 'Scheduled events call the same game functions. Scheduled volcano passes byPlayer=false.';
});
test('active-list-bound-and-save-load', ({ run, load, read }) => {
  load('menu.js');
  run('for(let k=0;k<43;k++)_push("drought",c,4,k,1); _ignite(c,.8); W.fire[e]=.05; W.aerosol=2.7; W.pAnom[c]=.38; var save=JSON.parse(JSON.stringify(serializeWorld()));');
  assert.deepEqual(read('[save.ext.disasters.list.length,save.ext.disasters.list[0].life,save.scal.aerosol,save.arrays.fire.t]'),[40,3,2.7,'Float32Array']);
  run('DISASTERS.length=0; _burning.clear(); W.fire.fill(0); applyLoadedSave(save);');
  assert(run('DISASTERS.length===40 && _burning.has(c) && !_burning.has(e)'));
  near(run('W.pAnom[c]'),.38);
  return 'JSON round trip restores active records, scalar and field state; burning cache is reconstructed.';
});
test('reset-versus-worldgen', ({ run, handlers }) => {
  run('_ignite(c,.8); _push("fire",c,4,1,1); W.aerosol=2; W.pAnom[c]=.38;');
  handlers.get('resetLife')();
  assert(run('DISASTERS.length===0 && W.fire[c]===0 && _burning.has(c) && W.aerosol===2 && W.pAnom[c]<.39'));
  run('_disTick();'); assert(!run('_burning.has(c)'));
  run('_ignite(c,.8); _push("fire",c,4,1,1); worldgen("flat",9);');
  assert(run('DISASTERS.length===0 && !_burning.size && W.aerosol===0 && W.pAnom[c]===1'));
  return 'Reset preserves weather residue and the next tick drains its stale fire index. Generation clears both.';
});
test('disaster-stats-object-and-chronicle', ({ run, read, load }) => {
  load('stats.js'); load('menu.js');
  run('var d=disasterTrigger("hurricane",c,1,false); var y0=HIST.dis.n; simEmit("year",101); var y1=HIST.dis.n; simEmit("year",102);');
  assert.deepEqual(read('[y0,y1,HIST.dis.n,HIST.disLog.length]'),[0,1,1,0]);
  run('disasterTrigger("fire",c,1,true); var save=JSON.parse(JSON.stringify(serializeWorld())); applyLoadedSave(save); simEmit("year",103);');
  assert.deepEqual(read('[HIST.dis.n,HIST.dis.by.hurricane,HIST.dis.by.fire,HIST.disLog.length]'),[2,1,1,1]);
  return 'Counters deduplicate active objects across polling and load. Chronicle is a separate list.';
});
test('short-unlogged-event-expires-before-count', ({ run, read, load }) => {
  load('stats.js');
  run('disasterTrigger("tsunami",c,1,true);');
  assert.deepEqual(read('[DISASTERS.length,HIST.dis.n,worldEvents.length]'),[1,0,0]);
  run('for(let k=0;k<8;k++)_disTick(); simEmit("year",101);');
  assert.deepEqual(read('[DISASTERS.length,HIST.dis.n,HIST.disLog.length]'),[0,0,0]);
  return 'Short marker with an empty event message can expire between statistics polls.';
});
test('famine-detector-food-capacity-and-cooldown', ({ run }) => {
  run('inhabit(c,2000); W.foodCapS[c]=1000; checkClimateEvents(); W.simTick+=40; W.foodCapS[c]=500; W.precip[c]=300; checkClimateEvents();');
  assert(run('worldEvents[0].type==="famine" && worldEvents[0].text.includes("drought")'));
  near(run('W.unrest[c]'),.2);
  run('W.simTick+=40; W.foodCapS[c]=250; checkClimateEvents()');
  assert.equal(run('worldEvents.length'),1);
  return 'Famine uses food-capacity history and a separate per-region event cooldown.';
});
test('brush-water-current-and-deposit', ({ run }) => {
  run('uiState.brush=0; setTool("water"); applyTool(12,12); liveRecompute();');
  assert(run('W.isWater[c]===1 && W.isWater[e]===0'));
  const day = run('W.dayOfYear'); run('finishPaint();');
  assert.equal(run('W.dayOfYear'),(day+6)%360);
  run('setTool("current"); _dragDX=1; applyTool(12,12); applyTool(13,12);');
  near(run('W.curAddU[c]'),.125); assert.equal(run('W.curAddU[e]'),0);
  run('setTool("resource"); uiState.res=RID.iron; applyTool(12,12)');
  assert(run('W.res[c]===RID.iron && _resTouched'));
  return 'Relief release advances climate. Manual currents require water; the resource brush can place iron in water.';
});
test('population-brush-and-city-eligibility', ({ run }) => {
  run('coast(); uiState.brush=0; setTool("population"); W.hab[c]=0; applyTool(12,12); applyTool(11,12)');
  assert(run('W.pop[c]===500 && W.pop[west]===0'));
  run('uiState.dir=-1; applyTool(12,12);'); assert.equal(run('W.pop[c]'),0);
  run('applyPointTool("city",TOOLS.city,c);'); assert.equal(run('W.pop[c]'),0);
  run('var a=nation(c); W.hab[c]=.07; applyPointTool("city",TOOLS.city,c);');
  assert(run('W.pop[c]===14000 && W.urban[c]===9000 && W.devLevel[c]===200'));
  return 'Population can be painted on any dry surface. City requires suitability before creation.';
});
test('scheduled-action-attempt-consumption', ({ run, fragment }) => {
  fragment('mods.js','function _mEvSt(','function _mClimateShift(');
  run(`var event={uid:'denied',year:4,once:true,every:0,when:null,chance:1,
    act:{do:'disaster',type:'plague',at:{mode:'xy',x:.51,y:.51},power:1}}; var seen={}`);
  assert(run('_mEventCheck(event,4,seen,null,()=>({}),false) && !DISASTERS.length && seen.denied.n===1'));
  run('inhabit(c,500)'); assert(!run('_mEventCheck(event,5,seen,null,()=>({}),false)'));
  return 'Scheduled attempt is recorded even when the game handler rejects the target.';
});

const d = fixture();
const declarations = d.read(`({version:GAME_VERSION, constants:DIS, civ_disaster_year_step:DT_YEAR,
  names:_DIS_NAME, epidemic_names:{ru:_PLAGUE_RU,en:_PLAGUE_EN}, tools:TOOLS, biome_paint:BIOME_PAINT,
  default_ui:uiState, preview_radii:Object.fromEntries(Object.keys(_DIS_NAME).map(k=>[k,[.1,.5,1].map(p=>_disRadius(k,p))]))})`);
const failed = results.filter(row => row.status === 'failed').length;
const report = { work_package_id:'WP-DISASTERS-DIVINE', runtime_verified:false, sources, declarations,
  environment:{node:process.version, grid:[24,24], fixture:'Shipped classic scripts in Node VM, synthetic map/state, forced RNG where needed, DOM and command adapters, in-memory serialization. No game process.'},
  passed:results.length-failed, failed, results };
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`WP-DISASTERS-DIVINE: ${report.passed} passed, ${failed} failed.`);
process.exitCode=failed ? 1 : 0;
