// Run terrain and climate functions from byte-checked copies of the shipped scripts.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.research/wp-nature');
const copy = path.join(output, 'test-copy/EarthSimulator');
const names = ['core.js', 'earthdata.js', 'climate.js', 'ecology.js', 'custom.js',
  'civ.js', 'main.js', 'menu.js', 'ui.js', 'mods.js', 'disasters.js', 'index.html'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(copy, { recursive: true });
const sources = names.map(name => {
  const bytes = fs.readFileSync(path.join(root, 'EarthSimulator', name));
  const dest = path.join(copy, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
  assert(fs.readFileSync(dest).equals(bytes), `Test source differs: ${name}`);
  return { path: `EarthSimulator/${name}`, sha256: sha(bytes), bytes: bytes.length };
});

const code = name => fs.readFileSync(path.join(copy, name), 'utf8');
function fragment(name, start, end) {
  const source = code(name);
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing ${name} fragment: ${start}`);
  return source.slice(a, b);
}

function world({ earth = true, size = 24, geography = false, save = false } = {}) {
  const errors = [];
  const handlers = new Map();
  const calls = { resources: 0, capacities: 0 };
  const store = new Map([['earthsim.boot', JSON.stringify({ w: size, h: size })]]);
  const ctx = vm.createContext({
    console: { error: (...args) => errors.push(args.map(String).join(' ')) },
    performance: { now: () => 0 },
    sessionStorage: { getItem: key => store.get(key) ?? null, removeItem: key => store.delete(key) },
    document: { head: { appendChild() {} }, addEventListener() {}, getElementById: () => null,
      createElement: () => ({ getContext: () => ({ measureText: s => ({ width: s.length * 7 }) }) }) },
    window: { addEventListener() {} },
    atob: value => Buffer.from(value, 'base64').toString('latin1'),
    btoa: value => Buffer.from(value, 'latin1').toString('base64'),
    T: (_, en) => en, TF: (_, en) => en, latinNames: () => true, UI_FONT: 'sans-serif',
    tUpper: s => String(s).toUpperCase(),
    netAct: (name, fn) => handlers.set(name, fn), netRemote: () => false,
    resDirty: () => { calls.resources++; }, refreshCapacities: () => { calls.capacities++; },
    wars: [], warLog: [], _warSeq: 0, cityNames: {}, cityMeta: {},
  });
  const run = (source, filename = 'nature-probe') => vm.runInContext(source, ctx, { filename, timeout: 90000 });
  const get = source => JSON.parse(run(`JSON.stringify(${source})`));
  const load = name => run(code(name), name);
  load('core.js');
  if (earth) load('earthdata.js');
  for (const name of ['climate.js', 'ecology.js', 'disasters.js']) load(name);
  run('W.disasterRate=0;', 'disable-unrelated-disaster-rolls');
  run(fragment('ui.js', "netAct('planet'", 'function bindSlider('), 'ui.js/planet');
  run(fragment('civ.js', 'function stepCivEcology()', '// список городов'), 'civ.js/ecology');
  run(fragment('civ.js', 'const CIV = {', '\n};') + '\n};', 'civ.js/constants');
  if (geography) {
    run(fragment('civ.js', 'const NAME_A =', '// i18n-ok-end'), 'civ.js/name-roots');
    run('var CULTURES=[{}, {name:"Vel"}, {name:"Mor"}];', 'culture-fixture');
    load('custom.js');
  }
  if (save) load('menu.js');
  return { run, get, errors, calls, planet: handlers.get('planet'), geoList: handlers.get('geoList') };
}

const land = `W.elev.fill(0.48); W.seaLevel=0.4; recomputeStatic(true);
  W.temp.fill(18); W.tempSmoothed.fill(18); W.precip.fill(650); W.precipSmoothed.fill(650);`;
const water = 'W.elev.fill(0.2); W.seaLevel=0.4; recomputeStatic(true);';
const results = [];
const worlds = [];
const fixture = options => { const result = world(options); worlds.push(result); return result; };
const near = (a, b, delta = 1e-6) => assert(Math.abs(a - b) <= delta, `${a} != ${b} within ${delta}`);
function check(id, name, test) {
  try {
    const observation = test();
    results.push({ id: `${id}-${name}`, status: 'passed', observation });
  } catch (error) {
    console.error(id, error.stack);
    results.push({ id: `${id}-${name}`, status: 'failed', observation: error.message });
  }
}

const w = fixture();
const { run, get, planet } = w;
const declarations = get(`({ version: GAME_VERSION, climate: CLIM, calibration: CLIM_BIAS, earth: EARTH,
  earth_data: {version: EARTH_DATA.v, relief: [EARTH_DATA.W, EARTH_DATA.H],
    normals: [EARTH_DATA.cW, EARTH_DATA.cH], fields: Object.keys(EARTH_DATA).slice(5)},
  straits: EARTH_STRAITS, places: {land: EARTH_LANDS.map(e => e[0]),
    sea: EARTH_SEAS.map(e => Array.isArray(e) ? e[0] : e.k)},
  currents: CUR, biome_parameters: ECO, ecology_stride: ECO_STRIPE,
  biomes: BIOME.map((b,i) => ({id:i,...b,civilization:BIOME_CIV[i]})), resources: RES })`);

for (const [id, type, target] of [['N01', 'pangea', 0.46], ['N02', 'continents', 0.40], ['N03', 'islands', 0.20]]) {
  check(id, type, () => {
    const expr = `worldgen(${JSON.stringify(type)}, 18947)`;
    run(expr);
    const terrain = get('[...W.elev]'), resources = get('[...W.res]');
    const fraction = run('1-W.isWater.reduce((s,x)=>s+x,0)/GRID.N');
    near(run('W.seaLevel'), .4);
    near(fraction, target, .012);
    run(expr);
    assert.deepEqual(get('[...W.elev]'), terrain);
    assert.deepEqual(get('[...W.res]'), resources);
    return { fraction, seed: run('worldSeed'), terrain_cells: terrain.length };
  });
}
check('N04', 'flat-and-empty', () => {
  run('worldgen("flat",1)');
  assert(run('W.isWater.every(v=>v===0) && W.elev.every(v=>Math.abs(v-.47)<1e-6)'));
  run('worldgen("empty",1)');
  assert(run('W.isWater.every(v=>v===1) && W.elev.every(v=>Math.abs(v-.34)<1e-6)'));
  return get('({sea:W.seaLevel, depth:W.seaDepth[0]})');
});
check('N05', 'heightmap-dispatch', () => {
  const f = fixture();
  f.run('function modHeightmapBoot(){W.elev.fill(.42); W.seaLevel=.45; return true;} worldgen("heightmap",5);');
  near(f.run('W.seaLevel'), .45);
  assert(f.run('W.isWater.every(Boolean)'));
  f.run('modHeightmapBoot=()=>false; worldgen("heightmap",5)');
  const first = f.get('[...W.elev]');
  f.run('worldgen("continents",5)');
  assert.deepEqual(f.get('[...W.elev]'), first);
  return 'Injected heightmap wins; rejected payload falls through to continents.';
});
check('N06', 'worldgen-state-and-events', () => {
  run('var generations=[], years=[]; simOn("worldgen",k=>generations.push(k)); simOn("year",y=>years.push(y)); W.pop[1]=100; W.pollution[1]=.8; W.co2=3; W.solar=1.08; worldgen("flat",27);');
  assert.deepEqual(get('[W.simYear,W.dayOfYear,W.simTick,W.pop[1],W.co2,W.pollution[1],W.solar,generations,years]'),
    [0,356,0,0,1,0,1.08,['flat'],[]]);
  assert(run('W.riverVer>=2 && W.biome.every((b,i)=>b===W.biomeCand[i])'));
  return 'Initial day 80 advances to 356 during spin-up; year returns to zero and worldgen emits once.';
});
check('N07', 'earth-decoder', () => {
  assert(run('earthDataOK()'));
  const lengths = get('Object.fromEntries(Object.entries(_earthDecode()).filter(([,v])=>ArrayBuffer.isView(v)).map(([k,v])=>[k,v.length]))');
  for (const k of ['lf','lk','zl','zw']) assert.equal(lengths[k], 720*360);
  for (const k of ['t0','ts','tc','p0']) assert.equal(lengths[k], 180*90);
  return lengths;
});
check('N08', 'earth-resampling', () => {
  run('var sample80=earthSample(80,60)');
  assert(run('Object.values(sample80).every(f=>f.length===4800 && f.every(Number.isFinite))'));
  assert(run('sample80.hMean.every((v,i)=>v<=sample80.hMax[i]) && sample80.land.every(v=>v>=0 && v<=1)'));
  assert(run('sample80.t0[30*80+40]>sample80.t0[40]+30'));
  return get('({pole:sample80.t0[40],equator:sample80.t0[30*80+40],equator_rain:sample80.p0[30*80+40]})');
});
const e = fixture({ geography: true, save: true });
check('N09', 'earth-relief-and-seed', () => {
  e.run('genEarth(); recomputeStatic(true)');
  const before = e.get('[...W.elev]');
  assert(e.run('W.isWater.some(Boolean) && W.isWater.some(v=>!v) && W.elev.every(v=>v>=0 && v<=1)'));
  e.run('worldSeed=628; genEarth()');
  assert.deepEqual(e.get('[...W.elev]'), before);
  return e.get('({poleCold:W.poleCold, sea:W.seaLevel, max:Math.max(...W.elev)})');
});
check('N10', 'earth-calibration', () => {
  e.run('var target=_earthCalPending; var earthYears=[]; simOn("year",y=>earthYears.push(y)); worldgen("earth",101)');
  assert(e.run('_climBiasOn && W.climBiasT.some(v=>v!==0) && W.climBiasP.some(v=>v!==0)'));
  assert(e.run('W.tempSmoothed.every((v,i)=>v===target.t0[i]) && W.precipSmoothed.every((v,i)=>v===target.p0[i])'));
  assert.deepEqual(e.get('[W.simYear,W.dayOfYear,earthYears.length,CLIM.curEvery,_climSpin]'), [0,80,0,8,false]);
  return e.get('({nonzero_t:W.climBiasT.filter(Boolean).length, nonzero_p:W.climBiasP.filter(Boolean).length})');
});
check('N11', 'earth-bias-save-and-legacy', () => {
  e.run('var earthSave=serializeWorld(); var origBias=[...W.climBiasT]; climBiasClear(); applyLoadedSave(earthSave);');
  assert(e.run('_climBiasOn && W.climBiasT.every((v,i)=>v===origBias[i])'));
  assert(e.run('earthSave.arrays.climBiasT.t==="Int8Array" && earthSave.ext.ecology.bv===2 && !earthSave.arrays.windU'));
  e.run('for(const k of ["climBiasT","climBiasTs","climBiasTc","climBiasP"]) delete earthSave.arrays[k]; applyLoadedSave(earthSave)');
  assert(!e.run('_climBiasOn'));
  return 'Restored fields activate corrections; absent fields become zero.';
});
check('N12', 'earth-sketch-fallback', () => {
  const f = fixture({ earth: false });
  f.run('worldgen("earth",13)');
  assert(f.run('!earthDataOK() && !_climBiasOn && W.poleCold===15 && W.isWater.some(Boolean) && W.isWater.some(v=>!v)'));
  return f.get('({day:W.dayOfYear,land:W.isWater.filter(v=>!v).length})');
});
check('N13', 'built-in-places', () => {
  const places = e.get(`(() => {const G=earthGeo(); return [G.ok,G.lands.map(x=>x.en),G.seas.map(x=>x.en),G.ver]})()`);
  assert(places[0] && places[1].includes('Africa') && places[2].some(s=>s.includes('Pacific')));
  assert(e.run('Array.from(W.isWater).some((v,i)=>!v && !!earthNameAt(i)) && placeNameAt(-1)===""'));
  e.run('recomputeStatic(true)');
  assert.equal(e.run('earthGeo().ver'), places[3]);
  return { land_names: places[1].length, water_names: places[2].length };
});
check('N14', 'custom-geographic-anchor', () => {
  e.run('var anchor=W.isWater.findIndex((v,i)=>!v && earthNameAt(i)); var oldName=placeNameAt(anchor);');
  const args = e.get('[["land",anchor%GRID.W,(anchor/GRID.W)|0,"Test Peninsula"]]');
  e.geoList(args, '');
  assert.equal(e.run('placeNameAt(anchor)'), 'Test Peninsula');
  assert(e.run('serializeWorld().ext.custom.geo[0][3]==="Test Peninsula"'));
  e.run('simEmit("reset")');
  assert.equal(e.run('placeNameAt(anchor)'), 'Test Peninsula');
  e.run('simEmit("worldgen","earth")');
  assert(e.run('placeNameAt(anchor)===oldName && NC_GEO.length===0'));
  return 'Manual Earth name overrides shipped name, survives reset, clears on worldgen.';
});

check('N15', 'strict-water-and-coast', () => {
  run('W.elev.fill(.5); W.seaLevel=.5; W.elev[idx(6,6)]=.49; W.elev[idx(7,6)]=.2; recomputeStatic(true);');
  assert.deepEqual(get('[W.isWater[idx(5,6)], W.isCoast[idx(5,6)], W.isWater[idx(6,6)], W.isCoast[idx(6,6)], W.isCoast[idx(7,6)]]'), [0,1,1,1,0]);
  near(run('W.seaDepth[idx(6,6)]'),80,.001);
  return 'Equality is dry, neighboring shallow water is coast, deep water is not coast.';
});
check('N16', 'diagonal-land-and-distance', () => {
  run(`${water} W.elev[idx(7,7)]=.6; W.elev[idx(8,8)]=.6; recomputeStatic(true);`);
  assert(run('W.landmass[idx(7,7)]===W.landmass[idx(8,8)] && W.landmass[idx(7,7)]>=0'));
  run(`${land} W.elev[idx(4,4)]=.2; recomputeStatic(true);`);
  assert.deepEqual(get('[W.distOcean[idx(4,4)],W.distOcean[idx(5,5)],W.distOcean[idx(6,6)]]'),[0,1,2]);
  return 'NB8 land components and distance from isolated water.';
});
check('N17', 'river-drainage', () => {
  run(`var ridge=[idx(10,10),idx(11,10),idx(12,10)]; W.seaLevel=.4; W.elev.fill(.39); ridge.forEach((i,k)=>W.elev[i]=.7-k*.1);
    for(let y=9;y<=11;y++)for(let x=9;x<=13;x++)if(!ridge.includes(idx(x,y))&&x!==13)W.elev[idx(x,y)]=.85;
    recomputeStatic(true); W.precipSmoothed.fill(0); W.precipSmoothed[ridge[0]]=2500; var rv=W.riverVer; carveRivers();`);
  assert(run('W.riverVer===rv+1 && W.riverFlux[ridge[1]]>=W.riverFlux[ridge[0]] && W.riverFlux[idx(13,10)]===0'));
  return get('ridge.map(i=>W.riverFlux[i])');
});
check('N18', 'river-plateau', () => {
  run(`${land} W.precipSmoothed.fill(800); carveRivers();`);
  assert(run('W.riverFlux.every(v=>v===1)'));
  run('W.precipSmoothed.fill(0); carveRivers()');
  near(run('W.riverFlux[0]'), Math.sqrt(.08)*1.4-.15);
  return run('W.riverFlux[0]');
});
check('N19', 'resource-repeat-and-water', () => {
  run(`${water} worldSeed=19012; genResources();`);
  assert(run('W.res.every(v=>v===0)'));
  run(`${land} genResources(); var res1=[...W.res]; genResources();`);
  assert(run('W.res.some(Boolean) && W.res.every((v,i)=>v===res1[i] && v<RES.length)'));
  return get('Array.from({length:RES.length},(_,k)=>W.res.filter(v=>v===k).length)');
});
check('N20', 'winds-and-manual-components', () => {
  run(`${water} W.temp.fill(12); W.seasonPhase=0; W.windMul=1; W.windAddU.fill(0); W.windAddV.fill(0); recomputeWinds();`);
  assert(run('W.windU[idx(12,0)]<0 && W.windU[idx(12,12)]<0 && W.windU[idx(12,5)]>0'));
  run('W.windMul=0; W.windAddU[12]=.75; W.windAddV[12]=-.3; recomputeWinds()');
  near(run('W.windU[12]'),.75);
  near(run('W.windV[12]'),-.3);
  assert.equal(run('W.windU[13]'),0);
  return get('[W.windU[12],W.windV[12]]');
});
check('N21', 'currents-and-skip', () => {
  run(`${water} W.currentMul=0; W.curAddU[1]=.4; W.curAddV[1]=-.6; computeCurrents(30);`);
  near(run('W.currentU[1]'),.4);
  run('W.elev[1]=.7; recomputeStatic(true)');
  near(run('W.currentU[1]'),.4);
  run('computeCurrents(30)');
  assert.deepEqual(get('[W.currentU[1],W.currentV[1]]'),[0,0]);
  return 'Manual current survives multiplier zero on water; skipped solve leaves old current until next solve.';
});
check('N22', 'current-peak', () => {
  run(`${water} W.currentMul=1; W.windMul=1; W.curAddU.fill(0); W.curAddV.fill(0); W.stir[idx(10,10)]=2; recomputeWinds(); computeCurrents();`);
  near(run('Math.max(...W.currentU.map((u,i)=>Math.hypot(u,W.currentV[i])))'),1.5,.001);
  return 'Solver rescales peak vector to CUR.peak.';
});
check('N23', 'upwind-water-and-edge', () => {
  run(`${land} W.windU.fill(1); W.windV.fill(0); computeUpwindMoisture(); var edgeWet=W.upwindWet[idx(2,12)], innerWet=W.upwindWet[idx(20,12)]; W.elev[idx(1,12)]=.2; recomputeStatic(true); W.windU.fill(1); W.windV.fill(0); computeUpwindMoisture();`);
  assert(run('edgeWet>innerWet && W.upwindWet[idx(1,12)]===1 && W.upwindWet[idx(2,12)]>0'));
  return get('[edgeWet,innerWet,W.upwindWet[idx(2,12)]]');
});

check('N24', 'calendar-and-spin', () => {
  run('years.length=0; W.simYear=.995; W.dayOfYear=356; _climSpin=true; climateStep();');
  assert.deepEqual(get('[W.dayOfYear,years.length]'),[2,0]);
  run('W.simYear=.995; _climSpin=false; climateStep()');
  assert.deepEqual(get('years'),[1]);
  return get('[W.dayOfYear,W.simYear]');
});
check('N25', 'greenhouse-log-scale', () => {
  const a=fixture(), b=fixture(), c=fixture();
  const step = (f, co2) => f.run(`${land} W.co2=${co2}; W.temp.fill(10); climateStep(); W.temp[idx(12,12)]`);
  const t=[step(a,1),step(b,2),step(c,4)];
  assert(t[1]>t[0]); near(t[1]-t[0],t[2]-t[1],.0001);
  return t;
});
check('N26', 'precipitation-anomaly-and-cap', () => {
  run(`${water} W.temp.fill(27); W.humidity.fill(100); W.precipMul.fill(300); W.pAnom.fill(.5); moisturePass();`);
  assert(run('W.precip.every(v=>v>=0 && v<=6000) && W.precip.some(v=>v===6000)'));
  near(run('W.pAnom[0]'),.503);
  return get('[W.precip[idx(12,12)],W.pAnom[0]]');
});
check('N27', 'ocean-evaporation-ice', () => {
  const f=fixture();
  f.run(`${water} W.temp.fill(15); W.sst.fill(15); W.humidity.fill(0); W.windU.fill(0); W.windV.fill(0); moisturePass(); var warmQ=W.humidity[idx(12,12)]; W.humidity.fill(0); W.iceAlbedo.fill(1); moisturePass();`);
  assert(f.run('warmQ>W.humidity[idx(12,12)] && W.humidity[idx(12,12)]>0'));
  return f.get('[warmQ,W.humidity[idx(12,12)]]');
});
check('N28', 'temperature-pulses', () => {
  run('W.tempPulse.fill(2); W.nukeWinter=10; W.aerosol=10; climateStep()');
  near(run('W.tempPulse[0]'),1.9); near(run('W.nukeWinter'),9.995); near(run('W.aerosol'),9.965);
  return get('[W.tempPulse[0],W.nukeWinter,W.aerosol]');
});
check('N29', 'live-sea-first-reference-and-step', () => {
  run(`${land} W.seaLevel=.4; W._seaAcc=0; W.dynSea=1; W.seaBase=.4; W.seaRefT=1e9; W.tempSmoothed.fill(10); simEmit("year",1);`);
  assert.equal(run('W.seaRefT'),10);
  const dirty = w.calls.resources;
  run('W.tempSmoothed.fill(20); for(let y=2;y<=5;y++)simEmit("year",y)');
  near(run('W.seaLevel'),.4); near(run('W._seaAcc'),.00008);
  assert.equal(w.calls.resources,dirty);
  run('simEmit("year",6)');
  near(run('W.seaLevel'),.4001);
  assert.equal(w.calls.resources,dirty+1);
  return get('[W.seaLevel,W._seaAcc]');
});
check('N30', 'live-sea-rebase-buffer', () => {
  run('W._seaAcc=.00004; W.seaLevel=.41; W.seaRefT=12; W.dynSea=0');
  planet('dynSea',1);
  assert.deepEqual(get('[W.seaBase,W.seaRefT,W._seaAcc]'),[.41,1e9,.00004]);
  planet('dynSea',0); run('simEmit("year",8)');
  assert.equal(run('W._seaAcc'),.00004);
  return 'Re-enable rebases sea and reference, retaining partial accumulated drift.';
});
check('N31', 'planet-bounds', () => {
  for (const k of ['globalForce','solar','tiltMul','windMul','currentMul','pace','co2']) planet(k,99);
  planet('solar','nonnumeric');
  assert.deepEqual(get('[W.globalForce,W.solar,W.tiltMul,W.windMul,W.currentMul,W.pace,W.co2,W.co2ppm]'),[15,1.15,2.5,2.5,2.5,3,20,5600]);
  return 'Action dispatch clamps numeric values; ignores NaN.';
});
check('N32', 'planet-sea-release', () => {
  run('W.dayOfYear=10; W.simYear=.97; years.length=0;');
  const dirty=w.calls.resources, cap=w.calls.capacities;
  planet('sea',.05);
  assert.deepEqual(get('[W.seaLevel,W.dayOfYear]'),[.25,10]);
  planet('seaEnd',1);
  assert.deepEqual(get('[W.seaBase,W.dayOfYear,years]'),[.25,28,[1]]);
  assert.equal(w.calls.resources,dirty+1);
  assert.equal(w.calls.capacities,cap+1);
  return 'Drag changes relief fields immediately; end advances three normal climate steps.';
});
check('N33', 'civilization-clamps-co2', () => {
  run('W.pop.fill(0); W.veg.fill(0);');
  planet('co2',20); run('stepCivEcology()');
  assert.deepEqual(get('[W.co2,W.co2ppm]'),[4.5,1260]);
  planet('co2',.1); run('stepCivEcology()');
  assert.deepEqual(get('[W.co2,W.co2ppm]'),[.7,196]);
  return 'Next civilization update clamps the slider extremes to 0.7 … 4.5.';
});
check('N34', 'civilization-emission-and-green-transition', () => {
  run(`${land} var tech=17; function stateOf(){return {era:6,tech,res:[0,0,5,5,0,1,0]};}
    var indCell=idx(12,12); W.pop.fill(0); W.pop[indCell]=14000; W.urban[indCell]=6000; W.industry.fill(0); W.pollution.fill(0); W.veg.fill(.8); W.co2=1; stepCivEcology();
    var brown=[W.globalEmissions,W.pollution[indCell],W.industry[indCell],W.veg[indCell],W.co2];
    tech=30; W.industry.fill(0); W.pollution.fill(0); W.veg.fill(.8); W.co2=1; stepCivEcology();`);
  assert(run('W.globalEmissions<brown[0] && W.pollution[indCell]<brown[1] && W.industry[indCell]===brown[2] && brown[3]<.8 && brown[4]>1'));
  return get('[brown[0],W.globalEmissions,brown[1],W.pollution[indCell]]');
});

const eco = fixture({ save: true });
check('N35', 'miami-and-heat', () => {
  assert.equal(eco.run('computeNPP(50,0)'),0);
  assert.equal(eco.run('computeNPP(55,2000)'),0);
  assert(eco.run('computeNPP(50,3500)<computeNPP(45,3500) && computeNPP(20,200)>computeNPP(20,100)'));
  return eco.get('[computeNPP(20,100),computeNPP(20,200),computeNPP(45,3500),computeNPP(50,3500)]');
});
check('N36', 'water-biomes', () => {
  const vals=eco.get(`(()=>{const i=idx(12,12); W.isWater[i]=1; W.seaDepth[i]=201; W.isCoast[i]=1; W.tempSmoothed[i]=25;
    const a=classifyBiome(i); W.seaDepth[i]=60; const b=classifyBiome(i); W.tempSmoothed[i]=36;
    return [a,b,classifyBiome(i)];})()`);
  assert.deepEqual(vals,[0,2,1]);
  return vals;
});
check('N37', 'wetland-glacier-and-whittaker', () => {
  eco.run(`${land} var i=idx(12,12); W.elev[i]=.41; W.slope[i]=.01; W.precipSmoothed[i]=1600; W.tempSmoothed[i]=24;`);
  assert(eco.run('classifyBiome(i)===BID.marsh'));
  eco.run('W.isCoast[i]=1'); assert(eco.run('classifyBiome(i)===BID.mangrove'));
  eco.run('W.elev[i]=.85; W.tempSmoothed[i]=-8; W.precipSmoothed[i]=399'); assert(eco.run('classifyBiome(i)===BID.alpine'));
  eco.run('W.precipSmoothed[i]=400'); assert(eco.run('classifyBiome(i)===BID.iceSheet'));
  assert(eco.run('whittaker(19,549)===BID.mediterranean && whittaker(19,550)===BID.temperateDeciduous && whittaker(40,2500)===BID.savanna'));
  return 'Wetlands and mountain ice preempt the temperature/precipitation table.';
});
check('N38', 'full-biome-confirmation', () => {
  eco.run(`${land} W.biome[i]=BID.tundra; W.biomeCand[i]=BID.tundra; W.biomeHold[i]=0; W.temp[i]=56; for(let k=0;k<59;k++)ecologyStep(true);`);
  assert(eco.run('W.biome[i]===BID.tundra && W.biomeCand[i]===BID.scorched && W.biomeHold[i]===59'));
  eco.run('ecologyStep(true)');
  assert(eco.run('W.biome[i]===BID.scorched && W.biomeHold[i]===0 && computeFertility(i)===0'));
  return 'Actual 56°C supplies scorched candidate; transition takes 60 full calls.';
});
check('N39', 'stripe-biome-confirmation', () => {
  eco.run(`${land} _ecoCount=0; W.biome[i]=BID.tundra; W.biomeCand[i]=BID.tundra; W.biomeHold[i]=0; W.tempSmoothed[i]=46;
    for(let k=0;k<56;k++)ecologyStep(false);`);
  assert(eco.run('W.biomeHold[i]===14 && W.biome[i]===BID.tundra && W.npp[i]===0'));
  eco.run('ecologyStep(false)'); assert(eco.run('W.biome[i]===BID.scorched'));
  return 'Row zero modulo four confirms after its fifteenth visit.';
});
check('N40', 'biome-surface-transition', () => {
  eco.run(`${land} W.biome[i]=BID.deepOcean; ecologyStep(true);`);
  assert(eco.run('W.biome[i]>2 && W.biomeAge[i]===0 && W.biomeHold[i]===0'));
  eco.run(`${water} ecologyStep(true);`);
  assert(eco.run('W.biome[i]===BID.deepOcean'));
  return 'Built-in water to land and land to water switch on the next visit.';
});
check('N41', 'fertility-and-fallout', () => {
  eco.run(`${land} W.biome[i]=BID.temperateDeciduous; W.eco[i]=1; W.riverFlux[i]=0; W.slope[i]=0; W.fallout[i]=0; W.pollution[i]=0; var soil0=computeFertility(i); W.riverFlux[i]=.8; var soilRiver=computeFertility(i); W.fallout[i]=.5; W.pollution[i]=.4; var soilPolluted=computeFertility(i);`);
  assert(eco.run('soilRiver>soil0 && soilPolluted<soilRiver'));
  return eco.get('[soil0,soilRiver,soilPolluted]');
});
check('N42', 'smog-fallout-and-volcanic-decay', () => {
  eco.run(`${land} W.pollution.fill(.4); W.fallout.fill(.4); W.volcanic.fill(.4); W.windU.fill(0); W.windV.fill(0); W.eco.fill(1); _ecoCount=0; ecologyStep(false);`);
  const a=eco.get('[W.pollution[i],W.fallout[i],W.volcanic[i],W.volcanic[i+GRID.W],W.eco[i]]');
  near(a[0],.4*.945); near(a[1],.4*.9992); near(a[2],.4*.9992); near(a[3],.4); assert(a[4]<1);
  return a;
});
check('N43', 'mod-water-biome-and-legacy', () => {
  eco.run(`${land} var waterRule={water:true,coast:null,tMin:-100,tMax:100,pMin:0,pMax:9000};
    var modA=modAddBiome({key:"probeA",priority:1,when:waterRule}); var modB=modAddBiome({key:"probeB",priority:3,when:waterRule});
    W.biome[i]=BID.temperateDeciduous; W.elev[i]=.2; recomputeStatic(true); ecologyStep(true);`);
  assert(eco.run('modA===20 && modB===21 && classifyBiome(i)===modB && W.biome[i]===BID.temperateDeciduous && W.biomeHold[i]===1'));
  eco.run('W.biome[i]=19; W.biomeHold[i]=15; simEmit("load",{ext:{}})');
  assert(eco.run('W.biome[i]===modA && W.biomeCand[i]===modA && W.biomeHold[i]===0'));
  eco.run('W.biome[i]=19; simEmit("load",{ext:{ecology:{bv:2}}})');
  assert.equal(eco.run('W.biome[i]'),19);
  return 'Priority rule wins; immediate surface detection uses IDs 0–2; old slot 19 migrates to 20.';
});
check('N44', 'sea-buffer-serialization', () => {
  eco.run('W._seaAcc=.00004; W.seaLevel=.45; W.seaBase=.44; W.seaRefT=13; var seaSave=serializeWorld();');
  assert.deepEqual(eco.get('[seaSave.scal.seaLevel,seaSave.scal.seaBase,seaSave.scal.seaRefT,"_seaAcc" in seaSave.scal]'),[.45,.44,13,false]);
  eco.run('W._seaAcc=-.00002; applyLoadedSave(seaSave)');
  assert.equal(eco.run('W._seaAcc'),-.00002);
  eco.run('worldgen("flat",201)');
  assert.equal(eco.run('W._seaAcc'),-.00002);
  return 'Buffer is absent from saves and remains in memory across in-place apply and regeneration.';
});
check('N45', 'earth-pit-fill', () => {
  const f=fixture();
  f.run('W.elev.fill(.65); W.seaLevel=.4; W.elev[idx(0,5)]=.3; W.elev[idx(4,5)]=.45; _earthFillPits()');
  const raised=f.run('W.elev[idx(4,5)]');
  assert(raised>.65 && raised<.651);
  near(f.run('W.elev[idx(0,5)]'),.3);
  return raised;
});
check('N46', 'strait-cut', () => {
  const f=fixture({size: 80});
  f.run(`W.elev.fill(.6); W.seaLevel=.4; const s0=EARTH_STRAITS[0];
    const at=(lo,la)=>idx(Math.floor((lo+180)/360*GRID.W), Math.round((1-la/90)*(GRID.H-1)/2));
    const a=at(...s0.p[0]), b=at(...s0.p.at(-1)); W.elev[a]=.3; W.elev[b]=.3;
    var beforeCut=_earthWaterLabel()[a]!==_earthWaterLabel()[b]; _earthStraits();`);
  assert(f.run('beforeCut && _earthWaterLabel()[a]===_earthWaterLabel()[b]'));
  near(f.run('W.elev[at(...s0.p[1])]'),.4*(1-60/4000));
  return 'Gibraltar endpoints become connected through a 60 m cut in a synthetic barrier.';
});
check('N47', 'offshore-generation-without-coast', () => {
  const f=fixture({size:80});
  f.run('W.elev.fill(.38); W.seaLevel=.4; worldSeed=19012; recomputeStatic(true); genResources()');
  assert(f.run('W.isCoast.every(v=>!v) && W.res.every(v=>v===0 || v===RID.oil) && W.res.some(Boolean)'));
  return f.run('W.res.filter(v=>v===RID.oil).length');
});
check('N48', 'automatic-geographic-names', () => {
  const f=fixture({geography:true,save:true});
  f.run(`${land} var ci=idx(12,12); W.culture[ci]=1; W.pop[ci]=299; W.simYear=0; _ncAutoPass(true);`);
  assert.equal(f.run('ncGeoAutoCount()'),0);
  f.run('W.pop[ci]=300; W.simYear=5; _ncAutoPass(true); var previous=placeNameAt(ci);');
  assert(f.run('ncGeoAutoCount()===1 && previous && NC_AUTO[0].cr===1'));
  f.run('W.culture[ci]=2; W.simYear=10; _ncAutoPass(true); W.simYear=159; _ncAutoPass(true)');
  assert(f.run('placeNameAt(ci)===previous && NC_AUTO[0].cr===1'));
  f.run('W.simYear=160; _ncAutoPass(true); var savedGeo=serializeWorld();');
  assert(f.run('placeNameAt(ci)!==previous && NC_AUTO[0].cr===2 && savedGeo.ext.custom.auto.list.length===1'));
  f.run('simEmit("reset")'); assert.equal(f.run('ncGeoAutoCount()'),0);
  f.run('applyLoadedSave(savedGeo)'); assert(f.run('ncGeoAutoCount()===1 && NC_AUTO[0].cr===2'));
  return '300 people name a procedural region; another root changes it after 150 years, and saves preserve it.';
});
check('N49', 'pollution-wind-drift', () => {
  const f=fixture();
  f.run(`${land} W.pollution.fill(0); W.windU.fill(1); W.windV.fill(0); var pi=idx(11,12); W.pollution[pi]=1; advectPollution()`);
  assert(f.run('W.pollution[pi]<1 && W.pollution[pi+1]>0 && W.pollution[pi-1]===0'));
  return f.get('[W.pollution[pi-1],W.pollution[pi],W.pollution[pi+1]]');
});
check('N50', 'subscriber-errors', () => {
  const errors=worlds.flatMap(f=>f.errors);
  assert.deepEqual(errors,[]);
  return { vm_fixtures: worlds.length };
});

const failed = results.filter(row => row.status === 'failed').length;
const report = { work_package_id: 'WP-WORLD-NATURE', runtime_verified: false, environment: { node: process.version,
  fixture: 'Classic scripts in Node VM, synthetic GRID and stubbed DOM/storage; no game process.' },
  sources, declarations, passed: results.length - failed, failed, results };
fs.writeFileSync(path.join(output, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`WP-WORLD-NATURE: ${report.passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
