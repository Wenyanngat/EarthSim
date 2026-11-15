// Execute shipped baseline code in an isolated VM using immutable test copies.
// This is a numerical/contract probe, not an observation of the running game.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-baseline');
const copy = path.join(out, 'test-copy/EarthSimulator');
fs.mkdirSync(copy, { recursive: true });
const names = ['package.json', 'index.html', 'core.js', 'main.js', 'climate.js',
  'ecology.js', 'civ.js', 'ui.js', 'net.js', 'walk.js', 'walkgen.js', 'netwalk.js'];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const sources = {};
for (const name of names) {
  const data = fs.readFileSync(path.join(root, 'EarthSimulator', name));
  const dest = path.join(copy, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, data);
  assert.equal(hash(fs.readFileSync(dest)), hash(data), `Test copy drift: ${name}`);
  sources[name] = { path: `EarthSimulator/${name}`, sha256: hash(data), bytes: data.length };
}
const read = name => fs.readFileSync(path.join(copy, name), 'utf8');
function between(name, begin, end) {
  const text = read(name), start = text.indexOf(begin), stop = text.indexOf(end, start + begin.length);
  assert(start >= 0 && stop > start, `Missing source anchors: ${name}`);
  return text.slice(start, stop);
}
const results = [];
function test(id, fn) {
  try { results.push({ id, status: 'passed', observed: fn() ?? null }); }
  catch (error) { results.push({ id, status: 'failed', error: error.message }); }
}
function context(boot = null, cost = 0) {
  let clock = 0;
  const calls = [], errors = [], store = new Map();
  const c = vm.createContext({
    sessionStorage: { getItem: () => typeof boot === 'string' ? boot : JSON.stringify(boot), removeItem: k => calls.push(`remove:${k}`) },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    performance: { now: () => clock },
    console: { error: (...v) => errors.push(String(v[0])), warn: (...v) => errors.push(String(v[0])) },
    document: { readyState: 'loading', addEventListener: () => {}, getElementById: () => null },
    window: {}, requestAnimationFrame: () => calls.push('rAF'), setTimeout: () => {},
    T: (ru, en) => en, uiState: { speed: 1 }, MENU_UP: false,
    netLive: () => false, initRender: () => calls.push('initRender'), bindUI: () => calls.push('bindUI'),
    refreshCapacities: () => calls.push('capacities'), buildBase: () => {}, buildBorders: () => {},
    updateHud: () => {}, renderFrame: () => {}, refreshHover: () => {},
    climateStep: () => { calls.push('climate'); clock += cost; },
    ecologyStep: () => calls.push('ecology'), civTick: () => { calls.push('civ'); clock += cost; },
    netFrame: () => calls.push('netFrame'),
  });
  vm.runInContext(read('core.js'), c, { filename: 'test-copy/core.js' });
  vm.runInContext(read('main.js'), c, { filename: 'test-copy/main.js' });
  const run = code => vm.runInContext(code, c);
  return { c, calls, errors, store, run };
}
test('B01-default-grid-and-field-initializers', () => {
  const p = context();
  assert.equal(p.run('GRID.N'), 4800);
  assert.equal(p.run('W.stateId[0]'), -1); assert.equal(p.run('W.rTier[0]'), 255);
  assert.equal(p.run('W.precipMul[0]'), 1); assert.equal(p.run('W.tempSmoothed[0]'), 15);
  return { grid: p.run('[GRID.W, GRID.H, GRID.N]'), field_count: p.run('Object.keys(W).length') };
});
test('B02-boot-grid-bounds-and-pair-validation', () => {
  assert.equal(context({ w: 24, h: 220 }).run('GRID.N'), 5280);
  assert.equal(context({ w: 220.9, h: 24 }).run('GRID.W'), 80);
  assert.equal(context({ w: 24.9, h: 24.9 }).run('GRID.W'), 24);
  assert.equal(context({ w: 23, h: 60 }).run('GRID.W'), 80);
  assert.equal(context('{invalid').run('_boot'), null);
});
test('B03-event-failure-isolation-and-once-per-name-log', () => {
  const p = context(); p.run(`globalThis.log=[]; simOn('x',()=>{throw Error('probe')}); simOn('x',(a,b,c,d)=>log.push([a,b,c,d])); simEmit('x',1,2,3,4); simEmit('x',5);`);
  assert.equal(p.errors.length, 1); assert.equal(p.run('log.length'), 2);
  assert.equal(p.run('log[0].join()'), '1,2,3,4');
});
test('B04-event-live-array-addition', () => {
  const p = context(); p.run(`globalThis.log=[]; simOn('x',()=>{log.push('a'); simOn('x',()=>log.push('b'));}); simEmit('x');`);
  assert.equal(p.run('log.join()'), 'a,b');
});
test('B05-ordinary-scheduler-10-seconds', () => {
  const p = context(); for (let i = 0; i < 100; i++) p.run('simAdvance(100,1)');
  const counts = { climate: p.calls.filter(x => x === 'climate').length, civ: p.calls.filter(x => x === 'civ').length };
  assert.equal(counts.climate, 60); assert.equal(counts.civ, 23);
  assert.equal(p.calls.slice(0, 5).join(), 'climate,ecology,climate,ecology,civ');
  return counts;
});
test('B06-scheduler-thresholds-and-climate-tie', () => {
  const p = context(); p.run('simAdvance(165,1)'); assert.equal(p.calls.length, 0);
  p.run('simAdvance(1,1)'); assert.equal(p.calls.join(), 'climate,ecology');
  const q = context(); q.run('simAdvance(430,1)'); assert.equal(q.calls.join(), 'climate,ecology,civ,climate,ecology');
});
test('B07-overload-one-step-and-equal-debt-cut', () => {
  const p = context(null, 15); p.run('simAdvance(200,50)');
  assert.equal(p.calls.join(), 'climate,ecology');
  assert.equal(p.run('_civAcc'), 860); assert.equal(p.run('_climateAcc'), 694);
  p.run('simAdvance(0,50)'); assert.equal(p.calls.at(-1), 'civ');
  return { after_first_frame: { climate_debt_ms: 694, civ_debt_ms: 860 }, step_cost_ms: 15 };
});
test('B08-pause-debt-preserves-substep-fractions', () => {
  const p = context(); p.run('_climateAcc=1000; _civAcc=1000; simAdvance(100,0)');
  assert.equal(p.run('_climateAcc'), 165); assert.equal(p.run('_civAcc'), 429);
  p.run('_climateAcc=40; _civAcc=70; simDropDebt()');
  assert.equal(p.run('_climateAcc'), 40); assert.equal(p.run('_civAcc'), 70);
});
test('B09-frame-200ms-cap', () => {
  const p = context(); p.run('frame(1000)');
  assert.equal(p.calls.filter(x => x === 'climate').length, 1); assert.equal(p.run('_last'), 1000);
});
test('B10-menu-pauses-local-world-and-skips-render', () => {
  const p = context(); p.run('MENU_UP=true; frame(100)');
  assert.equal(p.run('W.paused'), true); assert.equal(p.calls.length, 0);
});
test('B11-menu-keeps-network-frame', () => {
  const p = context(); p.c.netLive = () => true; p.run('MENU_UP=true; frame(100)');
  assert.equal(p.calls.join(), 'netFrame'); assert.equal(p.run('W.paused'), false);
});
test('B12-loop-recovers-and-requests-next-frame', () => {
  const p = context(); p.run(`frame=()=>{throw Error('probe')}; loop(1); loop(2)`);
  assert.equal(p.errors.length, 1); assert.equal(p.calls.join(), 'rAF,rAF');
});
function climateContext() {
  const p = context({ w: 24, h: 24 });
  vm.runInContext(read('climate.js'), p.c, { filename: 'test-copy/climate.js' });
  vm.runInContext(read('ecology.js'), p.c, { filename: 'test-copy/ecology.js' });
  return p;
}
test('B13-real-worldgen-warmup-and-final-clock', () => {
  const p = climateContext(); p.run(`globalThis.years=[]; simOn('year',y=>years.push(y)); worldgen('flat',1);`);
  assert.equal(p.run('W.simYear'), 0); assert.equal(p.run('W.simTick'), 0);
  assert.equal(p.run('years.length'), 0);
  return { simYear: p.run('W.simYear'), dayOfYear: p.run('W.dayOfYear'), year_events: 0 };
});
test('B14-real-boot-parameter-warmup-advances-year-silently', () => {
  const p = climateContext(); p.run(`globalThis.years=[]; globalThis.gens=0; simOn('year',y=>years.push(y)); simOn('worldgen',()=>gens++); worldgen('flat',1); _applyBootParams({co2:1});`);
  assert(Math.abs(p.run('W.simYear') - 0.1) < 1e-12); assert.equal(p.run('years.length'), 0);
  assert.equal(p.run('gens'), 2);
  return { simYear: p.run('W.simYear'), dayOfYear: p.run('W.dayOfYear'), worldgen_events: p.run('gens') };
});
test('B15-real-climate-calendar-floating-boundary', () => {
  const p = climateContext(); p.run(`globalThis.years=[]; simOn('year',y=>years.push([y,W.simYear])); for(let i=0;i<120;i++)climateStep();`);
  const before = p.run('W.simYear'), events = p.run('years.length');
  assert.equal(events, 1); assert(before < 2); p.run('climateStep()'); assert.equal(p.run('years.length'), 2);
  return { after_120_steps: before, year_events_after_120: events, second_year_event_after_step: 121 };
});
test('B16-manual-step-actual-ui-handler', () => {
  const p = context(); let handler;
  p.c.netAct = (name, fn) => { assert.equal(name, 'step'); handler = fn; };
  vm.runInContext(between('ui.js', "netAct('step',", '\n'), p.c);
  p.run('W.paused=true'); handler();
  assert.equal(p.calls.join(), 'climate,ecology,civ'); assert.equal(p.run('W.paused'), true);
});
test('B17-network-order-independent-of-singleplayer-debt', () => {
  const p = context(); p.c.NET = { CLIM_MS: 166, CIV_MS: 430 };
  vm.runInContext(between('net.js', 'let _nVt = 0', '// ---------- граф объектов'), p.c);
  p.run('while(netStepOne(430)){}');
  assert.equal(p.calls.join(), 'climate,ecology,climate,ecology,civ');
  assert.equal(p.run('_nClim'), 2); assert.equal(p.run('_nCiv'), 1);
});
function bootContext(boot, load) {
  const p = context(boot);
  p.c.worldgen = (type, seed) => p.calls.push(`worldgen:${type}:${seed}`);
  p.c.settleTribes = () => p.calls.push('settle');
  p.c._applyBootParams = () => p.calls.push('bootParams');
  p.c.loadWorldFromStorage = () => { if (load === 'throw') throw Error('probe'); return load; };
  return p;
}
test('B18-boot-default', () => {
  const p = bootContext(null); p.run('start()'); assert(p.calls.includes('worldgen:continents:undefined')); assert(p.calls.includes('settle'));
});
test('B19-boot-load-success', () => {
  const p = bootContext({ mode: 'load', key: 'probe' }, true); p.run('start()');
  assert(!p.calls.some(x => x.startsWith('worldgen:'))); assert(p.calls.includes('remove:earthsim.boot'));
});
for (const load of [false, 'throw']) test(`B20-boot-load-fallback-${load}`, () => {
  const p = bootContext({ mode: 'load', key: 'probe' }, load); p.run('start()');
  assert(p.calls.includes('settle')); assert.equal(p.store.get('earthsim.badsaves'), '["probe"]');
});
test('B21-boot-network-placeholder', () => {
  const p = bootContext({ mode: 'net' }); p.c.netBootJoin = () => p.calls.push('join'); p.run('start()');
  assert(p.calls.includes('worldgen:flat:1')); assert(p.calls.includes('join')); assert(!p.calls.includes('settle'));
});
test('B22-boot-new-mod-fallback-and-settlement', () => {
  const p = bootContext({ mode: 'new', type: 'islands', seed: 42, world: 'probe', settle: true });
  p.c.modWorldBoot = () => false; p.run('start()');
  assert(p.calls.includes('worldgen:islands:42')); assert(p.calls.includes('settle')); assert(p.calls.includes('bootParams'));
});
test('B23-boot-new-mod-success-and-scenario', () => {
  const p = bootContext({ mode: 'new', world: 'probe', scenario: 'probe', settle: true });
  p.c.modWorldBoot = () => true; p.c.startScenarioFromBoot = () => p.calls.push('scenario'); p.run('start()');
  assert(!p.calls.some(x => x.startsWith('worldgen:'))); assert(!p.calls.includes('settle')); assert(p.calls.includes('scenario'));
});
test('B24-boot-parameters-clamps', () => {
  const p = context(); p.run('_applyBootParams({pace:99,disasters:1.9,dynSea:1})');
  assert.equal(p.run('W.pace'), 3); assert.equal(p.run('W.disasterRate'), 1); assert.equal(p.run('W.dynSea'), 1);
});
test('B25-walk-world-speed-independent-of-local-clock', () => {
  const p = context(); p.c.WALK = { SIM_SLOW: 0.02, SIM_FAST: 0.1 }; p.c.WK = { paused: false, simMode: 0 }; p.c.walkActive = true;
  vm.runInContext(between('walk.js', 'function walkSimSpeed()', '\n'), p.c);
  assert.equal(p.run('walkSimSpeed()'), 0); p.c.WK.simMode = 1; assert.equal(p.run('walkSimSpeed()'), 0.02);
  p.c.WK.simMode = 2; assert.equal(p.run('walkSimSpeed()'), 0.1); p.c.WK.paused = true; assert.equal(p.run('walkSimSpeed()'), 0);
});
const p = context();
const fields = p.run(`Object.entries(W).map(([name,value])=>({name,type:ArrayBuffer.isView(value)?value.constructor.name:typeof value,length:ArrayBuffer.isView(value)?value.length:undefined,initial:ArrayBuffer.isView(value)?value[0]:value,bytes_per_cell:ArrayBuffer.isView(value)?value.BYTES_PER_ELEMENT:undefined}))`);
const report = { format_version: '1.0.0', work_package_id: 'WP-BASELINE', game_version: '2.1.4',
  environment: { node: process.version, platform: process.platform, architecture: process.arch },
  method: 'Shipped code evaluated in isolated node:vm contexts from SHA-256-matched test copies. No game UI, Steam, network or real save storage.',
  runtime_verified: false, sources: Object.values(sources), results, declared_W_fields: fields,
  passed: results.filter(x => x.status === 'passed').length, failed: results.filter(x => x.status === 'failed').length };
fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: '.research/wp-baseline/probe-results.json', failures: results.filter(x => x.status === 'failed') }));
process.exitCode = report.failed ? 1 : 0;
