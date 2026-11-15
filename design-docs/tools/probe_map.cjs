// Exercise shipped map, panels and statistics in a synthetic DOM and canvas fixture.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, '.research/wp-map-interface');
const copy = path.join(out, 'test-copy/EarthSimulator');
const names = ['core.js', 'units.js', 'climate.js', 'ecology.js', 'fauna.js', 'civ.js', 'society.js',
  'disasters.js', 'render.js', 'ui.js', 'uikit.js', 'flags.js', 'panels.js', 'custom.js', 'stats.js',
  'trade.js', 'world3d.js', 'index.html', 'main.js', 'menu.js', 'net.js'];
fs.mkdirSync(copy, { recursive: true });
const sources = names.map(name => {
  const bytes = fs.readFileSync(path.join(root, 'EarthSimulator', name));
  const dest = path.join(copy, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
  assert(fs.readFileSync(dest).equals(bytes), `Source mismatch: ${name}`);
  return { path: `EarthSimulator/${name}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
});
const source = name => fs.readFileSync(path.join(copy, name), 'utf8');

const VOID = new Set(['input','br','img','hr','meta','link','path','circle','rect','line','polyline','polygon']);
const selectorAttr = /\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/g;
class Element {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase(); this.attrs = attrs; this.events = new Map();
    this.id = attrs.id || ''; this.className = attrs.class || ''; this.children = []; this.style = {};
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-')).map(([k,v]) => [k.slice(5),v]));
    this.width = Number(attrs.width || 120); this.height = Number(attrs.height || 80);
    this.clientWidth = 120; this.clientHeight = 80; this.scrollWidth = 120;
    this.checked = Object.hasOwn(attrs, 'checked'); this._value = attrs.value;
    const members = () => this.className.split(/\s+/).filter(Boolean);
    this.classList = {
      contains: name => members().includes(name),
      add: name => { this.className = [...new Set([...members(),name])].join(' '); },
      remove: name => { this.className = members().filter(k => k !== name).join(' '); },
      toggle: (name, force = !members().includes(name)) => { this.classList[force ? 'add' : 'remove'](name); return force; },
    };
  }
  get firstChild() { return this.children[0] ?? null; }
  get parentElement() { return this.parentNode || null; }
  get options() { return this.querySelectorAll('option'); }
  get value() { return String(this._value ?? this.options[0]?.attrs.value ?? ''); }
  set value(v) { this._value = v; }
  get textContent() { return (this._text ?? '') + this.children.map(x => x.textContent).join(''); }
  set textContent(s) { this._text=String(s); this.children=[]; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(html) {
    this._html = String(html); this._text=''; this.children=[];
    const stack = [this];
    for (const [token] of this._html.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][\w-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>|[^<]+/gi)) {
      if (token.startsWith('</')) {
        const tag = /^<\/([\w-]+)/.exec(token)[1].toUpperCase();
        const k = stack.findLastIndex(el => el.tagName === tag);
        if (k > 0) stack.length = k;
      } else if (/^<[a-z]/i.test(token)) {
        const m = /^<([\w-]+)(.*)>$/s.exec(token), attrs = {};
        for (const a of m[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? '';
        const el = new Element(m[1], attrs); stack.at(-1).appendChild(el);
        if (!VOID.has(m[1]) && !token.endsWith('/>')) stack.push(el);
      } else if (!token.startsWith('<')) {
        const el = stack.at(-1); el._text = (el._text || '') + token;
      }
    }
  }
  removeAttribute(k) { delete this.attrs[k]; delete this[k]; }
  appendChild(el) { el.parentNode=this; this.children.push(el); return el; }
  removeChild(el) { this.children=this.children.filter(x=>x!==el); el.parentNode=null; }
  remove() { this.parentNode?.removeChild(this); }
  matches(token) {
    const attrs = [...token.matchAll(selectorAttr)];
    const attrless = token.replace(selectorAttr, '');
    const tag = /^([\w-]+)/.exec(attrless), id = /#([\w-]+)/.exec(attrless);
    if (tag && this.tagName !== tag[1].toUpperCase() || id && this.id !== id[1]) return false;
    for (const [, part] of attrless.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(part)) return false;
    return attrs.every(([,k,a,b,c]) => {
      const value = k.startsWith('data-') ? this.dataset[k.slice(5)] : this.attrs[k];
      const expected = a ?? b ?? c; return expected == null ? value != null : value === expected;
    });
  }
  closest(selector) {
    for (let el=this; el; el=el.parentNode) if (selector.split(',').some(s=>el.matches(s.trim()))) return el;
    return null;
  }
  querySelectorAll(selector) {
    const patterns = selector.split(',').map(s=>s.trim().split(/\s+/).filter(x=>x!=='>'));
    const found = [];
    const scan = node => {
      for (const el of node.children) {
        if (patterns.some(p => {
          if (!el.matches(p.at(-1))) return false;
          let a=el.parentNode;
          for (let k=p.length-2;k>=0;k--) { while (a && !a.matches(p[k])) a=a.parentNode; if (!a) return false; a=a.parentNode; }
          return true;
        })) found.push(el);
        scan(el);
      }
    };
    scan(this); return found;
  }
  querySelector(s) { return this.querySelectorAll(s)[0] ?? null; }
  addEventListener(k,f) { const all=this.events.get(k)||[]; all.push(f); this.events.set(k,all); }
  removeEventListener(k,f) { this.events.set(k,(this.events.get(k)||[]).filter(x=>x!==f)); }
  fire(k,data={}) {
    const e={target:this,preventDefault(){},stopPropagation(){},...data};
    for (const fn of this.events.get(k)||[]) fn(e);
  }
  getBoundingClientRect() { return { left:0,top:0,width:this.clientWidth,height:this.clientHeight }; }
  setPointerCapture() {}
  getContext() {
    if (!this._ctx) this._ctx = new Proxy({
      createImageData: (w,h) => ({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
      getImageData: (_x,_y,w,h) => ({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
      measureText: t => ({width:String(t).length*6}), createLinearGradient: () => ({addColorStop(){}}),
      putImageData: img => { this.lastImage=img; }, fillText: text => { (this.canvasText ||= []).push(text); },
    }, { get: (o,k) => o[k] ?? (()=>{}) });
    return this._ctx;
  }
  toDataURL() { return 'data:image/png;base64,fixture'; }
}

function fixture({ trade = true, localeComma = false } = {}) {
  const errors=[], handlers=new Map(), timers=new Map(), store=new Map();
  let now=1000, timer=0;
  const page=new Element('html'), head=page.appendChild(new Element('head')), body=page.appendChild(new Element('body'));
  const doc={head,body,createElement:tag=>new Element(tag),getElementById:id=>page.querySelector('#'+id),
    querySelector:s=>page.querySelector(s),querySelectorAll:s=>page.querySelectorAll(s),addEventListener:(...a)=>page.addEventListener(...a)};
  const mount=html=>{const el=body.appendChild(new Element('div'));el.innerHTML=html;return el;};
  const ewin=new Element('window');
  const format=(_,en,...args)=>en.replace(/\{(\d+)\}/g,(m,i)=>args[i]??m);
  const later=(fn,ms)=>{timers.set(++timer,{fn,ms});return timer;};
  const ctx=vm.createContext({
    console:{log(){},warn(){},error:(...args)=>errors.push(args.map(String).join(' '))},
    document:doc, window:{devicePixelRatio:2,addEventListener:(...a)=>ewin.addEventListener(...a)}, navigator:{language:'en-US'},
    sessionStorage:{getItem:()=>'{"w":24,"h":24}'}, localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))},
    performance:{now:()=>now},setTimeout:later,setInterval:later,clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
    Path2D:class {moveTo(){} lineTo(){} closePath(){}}, atob:s=>Buffer.from(s,'base64').toString('latin1'), btoa:s=>Buffer.from(s,'latin1').toString('base64'),
    T:(_,en)=>en,TF:format,TFC:(_, ...a)=>format(...a),TNn:(n,_a,_b,_c,one,many)=>`${n} ${n===1?one:many}`,
    tLower:s=>String(s).toLowerCase(),tUpper:s=>String(s).toUpperCase(),latinNames:()=>true,decComma:()=>localeComma,curLang:()=> 'en',UI_FONT:'sans-serif',
    netAct:(name,fn)=>handlers.set(name,fn),netDo:(name,...args)=>handlers.get(name)?.(...args),
    netLive:()=>false,netExecuting:()=>false,netRemote:()=>false,netAside:()=>false,netNames:fn=>fn(),
  });
  const evalCode=(s,filename='map-fixture')=>vm.runInContext(s,ctx,{filename,timeout:15000});
  const run=s=>{const result=evalCode(s);assert.deepEqual(errors,[],'Engine/UI subscriber failed');return result;};
  const read=s=>JSON.parse(run(`JSON.stringify(${s})`));
  function fragment(name, from, until) {
    const src=source(name), a=src.indexOf(from), b=src.indexOf(until,a+from.length);
    assert(a>=0 && b>a, name);return src.slice(a,b);
  }
  const initial=['units.js','core.js','climate.js','ecology.js','fauna.js','civ.js','society.js','disasters.js',
    'render.js','ui.js','uikit.js','flags.js','panels.js','custom.js'];
  if (trade) initial.push('trade.js');
  for (const name of initial) evalCode(source(name),name);
  evalCode(fragment('world3d.js','const _ov3Out =','// ИНСТАНСЫ:'),'world3d.js/overlayCell3D');
  // Expose closures for assertions only. The test copy stays byte-identical to the client.
  const marker='  return { series, info, pack, unpack, bootstrap, tlOwners,';
  const stats=source('stats.js');
  assert.equal(stats.split(marker).length,2);
  evalCode(stats.replace(marker,`  globalThis.inspectStats = { tabs, sTabs, SI, WI, PRESET, RANK, CITY_COLS, V,
    tlEncode, tlApply, chartSeries, deltaOf, toCSV, stateRows, cityRows, worldFeed, chronicle, growthOf };
${marker}`),'stats.js/read-only test access');
  run(`Math.random=()=>.5; const c=idx(12,12), east=c+1;
    W.elev.fill(.56); W.seaLevel=.4; recomputeStatic(true); W.disasterRate=0; W.dynSea=0;
    W.temp.fill(12); W.tempSmoothed.fill(18); W.precip.fill(500); W.precipSmoothed.fill(800);
    W.eco.fill(.6); W.fertility.fill(.45); W.veg.fill(.6); W.hab.fill(.6); W.biome.fill(BID.borealForest);
    function state(i=c,uid=100){const o=stateBlank(states.length); o.uid=uid; o.alive=true; o.name='Nation '+uid;
      o.cells.add(i); o.area=1; o.capital=i; o.pop=5000; o.era=2; o.tech=5; o.stability=.7; o.literacy=.5;
      W.stateId[i]=o.id; W.pop[i]=o.pop; states.push(o); return o;}
    function year(y){W.simYear=y; simEmit('year',y);}
    function image1(i,overlay){
      _rOvW=1;_rOvH=1;_rOx0=_rOx1=[i%GRID.W];_rOy0=_rOy1=[(i/GRID.W)|0];_rOfx=_rOfy=[0];
      overlayImg={data:new Uint8ClampedArray(4)};overlayCtx={putImageData(){}};
      currentOverlay=overlay;buildOverlay();return [...overlayImg.data];
    }
  `);
  return {run,read,ctx,doc,mount,fragment,store,timers,handlers,setTime:v=>{now=v;}};
}

const results=[];
const near=(a,b,eps=1e-5)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`);
function test(name,fn,options) {
  const id=`MI${String(results.length+1).padStart(2,'0')}-${name}`;
  try { results.push({id,status:'passed',observation:fn(fixture(options))??null}); }
  catch(e) { console.error(id,e.stack);results.push({id,status:'failed',observation:e.message}); }
}

test('layer-registry',({run,read})=>{
  const keys=read('Object.keys(MAP_LAYERS).sort()');
  assert.deepEqual(keys,['culture','disease','fauna','religion','resources','stability','tech','trade','wealth']);
  assert(run('_rIsAreaLayer("political") && _rIsAreaLayer("battles") && _rIsAreaLayer("resources") && !_rIsAreaLayer("disease") && !_rIsAreaLayer("temperature")'));
  return keys;
});
test('layer-select-and-3d-repaint',({run})=>{
  run('var paints=0; function bakeTerrain(){paints++;} window.mode3D=true; setLayer("temperature")');
  assert(run('uiState.layer==="temperature" && currentOverlay==="temperature" && _rOvDirty && paints===1'));
  run('window.mode3D=false; setLayer("rain-unknown")'); assert.equal(run('paints'),1);
  return 'Layer selection invalidates overlay and requests terrain rebake in 3D.';
});
test('temperature-and-rain-scales',({run,read})=>{
  assert.deepEqual(read('rampTemp(-30)'),[0,0,255]); assert.deepEqual(read('rampTemp(45)'),[255,0,0]);
  assert.deepEqual(read('rampPrecip(3001)'),[20,90,200]); assert.deepEqual(read('rampPrecip(-1)'),[245,245,245]);
  const pair=read('[image1(c,"temperature"),overlayCell3D(c,"temperature")]');
  assert.equal(pair[0][3],150); assert.equal(pair[1][3],170); near(pair[0][1],pair[1][1],1);
  assert(run('W.isWater[c]=1; image1(c,"humidity")[3]===0 && overlayCell3D(c,"humidity")[3]===0'));
  return pair;
});
test('2d-fallout-difference',({run,read})=>{
  run('W.pollution[c]=0; W.fallout[c]=.5');
  const value=read('[image1(c,"pollution"),overlayCell3D(c,"pollution")]');
  assert(value[0][3]>180 && value[1][3]===0);
  return value;
});
test('population-overlay-cutoff',({run,read})=>{
  run('W.pop[c]=30; W.pop[east]=120000');
  assert.deepEqual(read('[image1(c,"population")[3],image1(east,"population"),overlayCell3D(east,"population")]'),[0,[210,30,20,220],[210,30,20,225]]);
  return 'Logarithmic population ramp begins above 30.';
});
test('registered-data-layer-shared-colors',({run,read})=>{
  run('W.disease[c]=.5; W.res[c]=RID.oil; W.isWater[c]=1;');
  assert.deepEqual(read('[...overlayCell3D(c,"resources")]'),[166,110,232,235]);
  assert.equal(run('overlayCell3D(c,"disease")[3]'),0);
  run('W.isWater[c]=0; var sample=[...overlayCell3D(c,"disease")];');
  const [a,b]=read('[sample,image1(c,"disease")]'); a.forEach((v,i)=>near(v,b[i],1));
  return a;
});
test('legends-biomes-and-states',({run,read})=>{
  run('W.biome[c]=BID.scorched; var a=state(c), b=state(east,200); b.pop=9000');
  assert.deepEqual(read('_legendBiomes().map(x=>x.label)'),['Scorched waste','Taiga']);
  assert.deepEqual(read('_legendStates().map(x=>x.label)'),['Nation 200','Nation 100']);
  return 'Scorch takes visual priority; nation legend ranks current population.';
});
test('map-overlay-preferences',({run,store})=>{
  run('var changes=0; function mapOv3DApply(){changes++;} mapOvSet("cities",false); mapOvSet("geoReal",false); mapOvSet("unknown",true);');
  assert(run('!uiState.showCities && changes===2 && !MAP_OV.unknown'));
  const saved=JSON.parse(store.get('earthsim.mapov'));
  assert(!saved.cities && !saved.geoReal && saved.rails);
  return Object.keys(saved);
});
test('2d-position-zoom-and-pan',({run,read})=>{
  run('var rect={left:10,top:20,width:480,height:480}; var p0=cellAt(210,240,rect); zoom2dAt(210,240,rect,2); var p1=cellAt(210,240,rect);');
  assert.deepEqual(read('[p0,p1]'),[read('p0'),read('p0')]);
  run('pan2d(999,999,rect); zoom2dAt(10,20,rect,99)'); assert.deepEqual(read('view2d'),{zoom:12,ox:0,oy:0});
  run('zoom2dAt(10,20,{width:0,height:0},.5)'); assert.equal(run('view2d.zoom'),12);
  return 'Input uses logical coordinates and clamps zoom and pan.';
});
test('map-focus-2d-and-3d',({run,read})=>{
  run('focusCell(c,true)'); near(run('view2d.zoom'),2.4);
  run('var _3d={view:{dist:90}}; window.mode3D=true; focusCell(c,true)');
  assert.deepEqual(read('_3d.view'),{dist:34,tx:12.5,tz:12.5});
  return '2D focus centers by logical cell. 3D focus moves target and limits distance.';
});
test('2d-pointer-press-drag-release',({run,ctx,mount,fragment})=>{
  const m=mount('<canvas></canvas><div id="brush-cursor"></div>');const [canvas,cursor]=m.children;
  canvas.clientWidth=canvas.clientHeight=240;Object.assign(ctx,{canvas,cursor});
  run(fragment('ui.js','  let _pan2 = null;','  // --- клавиатура ---'));
  run('setTool("elevation"); uiState.brush=0;');
  canvas.fire('pointerdown',{button:0,clientX:125,clientY:125});
  canvas.fire('pointermove',{clientX:135,clientY:125});
  canvas.fire('pointerup');
  assert(run('W.elev[c]>.60 && W.elev[east]>.60 && !_painting && !_terrainTouched && W.dayOfYear===6'));
  return 'Live terrain and final climate pass run from the copied pointer handler.';
});
test('city-shortcut-and-inspection-routing',({run})=>{
  run(`var a=state(c); cities.push({i:c,x:12,y:12,stateId:0,pop:5000,name:'Central'});
    var opened=''; openCityModal=x=>{opened=x.name;}; openStateModal=()=>{opened='state';};`);
  assert(run('cityAtCell(east).i===c && cityAtCell(c+2)===null'));
  run('inspectClick(east)'); assert.equal(run('opened'),'Central');
  run('var tradeClick=()=>true; opened=""; inspectClick(c)'); assert.equal(run('opened'),'');
  return 'Map click dispatch consults trade before opening nearby city.';
});
test('inspector-live-weather-and-ground',({run,mount,doc})=>{
  mount(['xy','temp','hum','elev-val','elev-fill','wind','cur','pop','fert','eco','poll','res','fauna','settle','cult','land','warn','biome-sw','biome-name'].map(k=>`<div id='insp-${k}'></div>`).join(''));
  run('W.fallout[c]=.1; W.windU[c]=1; W.isWater[c]=0; updateInspector(c)');
  assert.match(doc.getElementById('insp-temp').textContent,/12\.0/); assert.match(doc.getElementById('insp-elev-val').textContent,/1 333|1333/);
  assert.match(doc.getElementById('insp-wind').innerHTML,/8 m\/s/); assert.match(doc.getElementById('insp-poll').textContent,/fallout/);
  run('W.isWater[c]=1; W.seaDepth[c]=900; W.currentU[c]=1.5; updateInspector(c)');
  assert.match(doc.getElementById('insp-elev-val').textContent,/−900/); assert.equal(doc.getElementById('insp-fert').textContent,'—');
  return 'Inspector uses current temperature, scales ground height, switches depth and fields for water.';
});
test('geo-name-contraction',({run,mount,doc})=>{
  mount('<div id="insp-land"></div>');const label=doc.getElementById('insp-land');label.scrollWidth=200;label.clientWidth=50;
  run('_inspLand("Africa",{people:"Kela",n:"Kelida"})');
  assert.equal(label.textContent,'Africa (Kelida)');assert.match(label.title,/Kela/);
  return 'Doubled Earth name shortens to compact form while the title keeps cultural attribution.';
});
test('cursor-dwell',({run,doc,mount,timers})=>{
  mount('<div id="cursor-tip"></div>');const tip=doc.getElementById('cursor-tip');
  run('_hoverCell=c; showTip(c,{clientX:30,clientY:50},{left:10,top:20})');
  const entry=timers.get(run('_dwellTimer'));assert.equal(entry.ms,380);assert.equal(tip.style.opacity,0);
  entry.fn();assert.equal(tip.style.opacity,1);assert.equal(tip.style.left,'20px');
  run('_painting=true; showTip(c,{clientX:0,clientY:0},{left:0,top:0})');assert.equal(run('_dwellTimer'),null);
  return 'Dwell timer is 380ms and suppresses tool dragging.';
});
test('planet-units-input-and-commit',({run,doc,mount})=>{
  mount('<button id="btn-planet"></button><div id="planet"><button class="planet-close"></button><input id="seaLevelSlider"><span id="sea-val"></span><input id="co2Slider"><span id="co2-val"></span><input id="faunaAutoChk"><input id="faunaAutoTool"></div>');
  run('bindPlanetPanel()');
  const sea=doc.getElementById('seaLevelSlider');sea.value=.46;sea.fire('input');
  assert.equal(run('W.dayOfYear'),0);assert.equal(run('W.seaLevel'),.46);assert.match(doc.getElementById('sea-val').textContent,/500 m/);
  sea.fire('change');assert.equal(run('W.dayOfYear'),18);
  const co2=doc.getElementById('co2Slider');co2.value=3;co2.fire('input');assert.equal(doc.getElementById('co2-val').textContent,'840 ppm');
  const fauna=doc.getElementById('faunaAutoTool');fauna.checked=false;fauna.fire('change');assert.equal(doc.getElementById('faunaAutoChk').checked,false);
  return 'Input versus committed sea action and paired fauna switches.';
});
test('units-only-affect-presentation',({run,read})=>{
  const d=read('[_seaText(.46),_paceText(2),uTemp(10,0),uTempD(10,0)]');
  run('UNITS.temp="f"; UNITS.len="us";');
  const x=read('[_seaText(.46),_paceText(2),uTemp(10,0),uTempD(10,0)]');
  assert.notEqual(x[0],d[0]);assert.match(x[2],/50/);assert.match(x[3],/18/);assert.match(d[1],/450/);
  assert.equal(run('W.temp[c]'),12);return {metric:d,imperial:x};
});

test('hud-climate-water-and-total-population',({run,doc,mount})=>{
  mount(['temp','pop','sea','states','co2','eco','wars'].map(k=>`<span id='stat-${k}'></span>`).join('')+'<span id="hud-era"></span><span id="hud-year"></span>');
  run('W.isWater.fill(1); W.isWater[c]=0; W.tempSmoothed[c]=22; W.tempSmoothed[east]=60; W.pop[c]=50; W.pop[east]=100; updateHud()');
  assert.match(doc.getElementById('stat-temp').textContent,/22/);assert.equal(doc.getElementById('stat-pop').textContent,'150');
  assert.equal(doc.getElementById('stat-sea').textContent,'100%');near(run('W.ecoGlobal'),.6);
  return 'Climate uses land only; population sums all cells.';
});
test('hud-all-water-vs-statistics',({run,doc,mount})=>{
  mount('<span id="stat-temp"></span><span id="stat-eco"></span><span id="hud-era"></span>');
  run('W.isWater.fill(1); updateHud()');
  assert.equal(doc.getElementById('stat-eco').textContent,'100%');
  assert.equal(doc.getElementById('hud-era').textContent,'A world without people');
  assert(run('Number.isNaN(_statsMod.measure()[inspectStats.WI.temp]) && _statsMod.measure()[inspectStats.WI.eco]===0'));
  return 'The all-water state has explicit HUD defaults and separate world-statistics values.';
});
test('hud-lag-display',({run,mount,doc})=>{
  mount('<span id="hud-year"></span>');
  run('var SIM_RATE=.55; W.simYear=120.9; W.paused=false; uiState.speed=10; updateHud()');
  assert.match(doc.getElementById('hud-year').textContent,/120.*×6/);
  run('W.paused=true; updateHud()');assert.equal(doc.getElementById('hud-year').classList.contains('lag'),false);
  return 'Lag shows a rounded effective multiplier only while running.';
});
test('world-measure-weighting',({run,read})=>{
  run(`var a=state(c), b=state(east,200); a.pop=100;b.pop=300; W.pop[c]=100;W.pop[east]=300; W.pop[c+2]=100;
    a.tech=2;b.tech=6;a.urbanPct=.5;b.urbanPct=.5;a.gdp=0;a.economy=10;b.gdp=40;
    W.isWater.fill(1); W.isWater[c]=W.isWater[east]=0; W.tempSmoothed[c]=10; W.tempSmoothed[east]=30; W.iceAlbedo[c+2]=1;
    var v=_statsMod.measure();`);
  assert.deepEqual(read('[v[inspectStats.WI.pop],v[inspectStats.WI.tech],v[inspectStats.WI.urban],v[inspectStats.WI.gdp],v[inspectStats.WI.temp],v[inspectStats.WI.claimed]]'),[500,5,.4,50,20,1]);
  near(run('v[inspectStats.WI.ice]'),1/576);
  return 'Technology is weighted by state population. Urban fraction uses all population.';
});
test('nonmutating-live-measure',({run})=>{
  run('var a=state(); _statsMod.bootstrap(true); var before=_statsMod.info().n; _statsMod.measure();');
  assert(run('HIST.n===before && HIST.get(a.uid).s===null && HIST.tl.frames.length===1'));
  return 'Fresh bootstrap captures an ownership frame before the first metric sample.';
});
test('state-row-legacy-fallback',({run,read})=>{
  run('var a=state(); a.gdp=0; a.economy=22000; a.gdpPc=0; a.cityCount=3; year(2);');
  assert.deepEqual(read('[statsSeries(a.uid,"gdp").y,statsSeries(a.uid,"cities").y]'),[[22000],[3]]);
  near(run('statsSeries(a.uid,"gdpPc").y[0]'),4.4);
  return 'Old economy value supplies GDP and inferred GDP per person.';
});
test('sampling-and-series-alignment',({run,read})=>{
  run('_statsMod.bootstrap(true); year(1); year(2); var a=state(); simEmit("stateNew",a,null,"tribe"); year(3); year(4); a.pop=7000; year(6)');
  assert.deepEqual(read('statsSeries(a.uid,"pop")'),{x:[4,6],y:[5000,7000]});
  assert.deepEqual(read('statsSeries("world","pop").x'),[2,4,6]);
  return 'State series starts at its own offset on the global clock.';
});
test('history-thins-shared-time-axis',({run,read})=>{
  run('STAT.CAP=32; _statsMod.bootstrap(true); var a=state(); for(let y=2;y<=66;y+=2)year(y)');
  assert.deepEqual(read('[HIST.n,HIST.step,HIST.t[0],HIST.t[1],HIST.t[HIST.n-1],HIST.get(a.uid).s.n]'),[17,4,2,6,66,17]);
  return 'At capacity, every other old world and state sample remains and step doubles.';
});
test('missing-death-event-archive',({run})=>{
  run('var a=state(); year(2); a.alive=false; year(4);');
  assert(run('HIST.get(a.uid).died===4 && inspectStats.stateRows("dead")[0].uid===100'));
  assert(run('inspectStats.stateRows("dead")[0].power===null && statsSeries(100,"pop").x.length===1'));
  return 'Sampling closes unseen living records and preserves only known metrics.';
});
test('slot-reuse-stable-uids',({run,read})=>{
  run('var a=state(); year(0); a.alive=false; simEmit("stateDead",a,"depop",null); var b=state(east,200); states[0]=b; b.id=0; W.stateId[east]=0; W.stateId[c]=-1; year(4);');
  const pair=read('[...HIST.states.keys()]');assert.deepEqual(pair,[100,200]);
  assert.deepEqual(read('[0,1].map(k=>Array.from(_statsMod.tlOwners(k,new Int32Array(GRID.N))).slice(c,east+1))'),[[100,-1],[-1,200]]);
  return pair;
});
test('timeline-key-and-delta',({run,read})=>{
  run('var a=state(); year(0); W.stateId[east]=a.id; year(4); W.stateId[c]=-1; year(8)');
  assert.deepEqual(read('HIST.tl.frames.map(f=>f.key)'),[true,false,false]);
  assert.deepEqual(read('[0,1,2].map(k=>Array.from(_statsMod.tlOwners(k,new Int32Array(GRID.N))).slice(c,east+1))'),[[100,-1],[100,100],[-1,100]]);
  return 'Deltas preserve unchanged cells and clear unowned cells.';
});
test('timeline-frame-palette-cap',({run,read})=>{
  const a=read(`(()=>{const src=Int32Array.from({length:260},(_,i)=>i+1), dst=new Int32Array(260);
    const f=inspectStats.tlEncode(src,null);inspectStats.tlApply(f,dst);return [f.pal.length,dst[253],dst[254],dst[259]];})()`);
  assert.deepEqual(a,[254,254,-1,-1]);return a;
});
test('timeline-thins-and-reencodes',({run,read})=>{
  run('STAT.TL_CAP=8; _statsMod.bootstrap(true); var a=state(); for(let y=4;y<=32;y+=4){ W.stateId[east]=y%8===0?a.id:-1; year(y); }');
  assert.deepEqual(read('HIST.tl.frames.map(f=>f.y)'),[0,8,16,24,32]); assert.equal(run('HIST.tl.step'),8);
  assert.equal(run('_statsMod.tlOwners(4,new Int32Array(GRID.N))[east]'),100);
  return 'Retained deltas are rebuilt against retained predecessors.';
});
test('history-pack-round-trip',({run,read})=>{
  run('var a=state(); year(0); a.pop=765432; year(4); var save=JSON.parse(JSON.stringify(_statsMod.pack())); _statsMod.bootstrap(false); var ok=_statsMod.unpack(save);');
  assert(run('ok && HIST.n===2 && HIST.tl.frames[0].key && _statsMod.tlOwners(1,new Int32Array(GRID.N))[c]===100'));
  near(run('statsSeries(100,"pop").y[1]'),765432,200);
  const cols=read('[save.wk.length,save.sk.length]');assert.deepEqual(cols,[27,16]);return cols;
});
test('history-keeps-nan-gaps',({run})=>{
  run('W.isWater.fill(1); year(0); var save=JSON.parse(JSON.stringify(_statsMod.pack())); _statsMod.unpack(save);');
  assert(run('Number.isNaN(statsSeries("world","temp").y[0]) && Number.isNaN(statsSeries("world","era").y[0])'));
  return 'Zero-valued missing marker decodes as NaN, separate from measured zero.';
});
test('legacy-no-statistics-load',({run,read})=>{
  run('var a=state(); year(2); W.simYear=80; simEmit("load",{ext:{}})');
  assert.deepEqual(read('statsSeries("world","pop").x'),[80]);
  assert.deepEqual(read('HIST.tl.frames.map(f=>f.y)'),[80]);
  return 'Without stats section the live save starts a new timeline at its current year.';
});
test('state-history-growth-and-delta',({run,read})=>{
  run('var a=state(); year(0); a.pop=10000; year(4); var early=inspectStats.growthOf(HIST.get(100),10000,50); a.pop=15000; year(20)');
  assert.deepEqual(read('[early,inspectStats.growthOf(HIST.get(100),15000,50)]'),[null,2]);
  assert.equal(run('inspectStats.deltaOf({u:"pct",good:-1},.2,.1).cls'),'dn');
  return 'Growth omits history younger than ten years and percent changes retain direction semantics.';
});
test('world-mixed-chart-normalization',({run,read})=>{
  const v=read(`(()=>{const m=inspectStats.WI, w=_statsMod.WM;
    const cs=inspectStats.chartSeries([{m:w[m.temp],data:[-10,10],name:'temp'},{m:w[m.pop],data:[20,100],name:'people'}]);
    return [cs.same,cs.series.map(s=>s.data),cs.series[0].fmt(.5)];})()`);
  assert.deepEqual(v.slice(0,2),[false,[[0,1],[.2,1]]]); assert.match(v[2],/0/);return v;
});
test('compare-four-nations',({run,read})=>{
  run('for(let i=0;i<6;i++)state(idx(i,10),100+i); for(let i=0;i<6;i++)openStats("compare",100+i);');
  assert.deepEqual(read('inspectStats.V.cmp.uids'),[102,103,104,105]);
  return 'Adding a fifth comparison removes the oldest valid selection.';
});
test('tabs-for-living-and-gone',({run,read})=>{
  assert.deepEqual(read('inspectStats.sTabs(false).map(t=>t.id)'),['over','hist','wars','rulers','chron']);
  assert.deepEqual(read('inspectStats.sTabs(true).map(t=>t.id)'),['over','hist','dip','cities','eco','trade','wars','rulers','chron']);
  assert(run('inspectStats.tabs().some(t=>t.id==="trade")'));
  return read('inspectStats.tabs().map(t=>t.id)');
});
test('tabs-without-trade-module',({run})=>{
  assert(run('!inspectStats.tabs().some(t=>t.id==="trade") && !inspectStats.sTabs(true).some(t=>t.id==="trade")'));
  return 'Trade tabs are conditional.';
},{trade:false});
test('csv-locale-rounding-and-quoting',({run})=>{
  const csv=run(`inspectStats.toCSV([{key:'name',label:'Name'},{key:'a',label:'Value'}],[{name:'a;"b"',a:1.23456},{name:'x',a:NaN}])`);
  assert.equal(csv,'\uFEFFName;Value\r\n"a;""b""";1,235\r\nx;');
  return csv;
},{localeComma:true});
test('city-register-occupancy-and-peak',({run,read})=>{
  run('var a=state(); W.pop[c]=5000; W.urban[c]=10000; cities.push({i:c,x:12,y:12,pop:5000,capital:true,stateId:0,name:"Old town"}); cityMeta[c]={founded:9,peak:8000,by:"First"};');
  assert.deepEqual(read('inspectStats.cityRows().map(r=>[r.cap,r.uid,r.urb,r.founded,r.peak])'),[[1,100,5000,9,8000]]);
  return 'Urban occupancy is the smaller of cell population and urban capacity.';
});
test('city-tier-thresholds',({run,read})=>{
  const x=read('[100,120000,120001,1000001].map(p=>{W.pop[c]=p;W.urban[c]=1000;return _cityTier(c);})');
  assert.deepEqual(x,['Town','Town','Large city','Metropolis']);return x;
});
test('city-card-and-link-back-to-map',({run,doc})=>{
  run(`W.pop[c]=5500; W.urban[c]=7000; W.fire[c]=.5; cityMeta[c]={founded:24,peak:8000,by:'Seed'};
    var town={i:c,x:12,y:12,pop:5500,capital:false,stateId:-1,name:'Harbor'}; openCityModal(town);`);
  const win=doc.getElementById('city-win');assert(win.classList.contains('show'));
  const html=win.querySelector('.ui-body').innerHTML;
  for(const key of ['free city','Founded in year 24','at its height','fire','5500','townsfolk']) assert(html.includes(key)||html.replace(/ /g,'').includes(key),key);
  win.querySelector('[data-a=show]').fire('click');assert(!win.classList.contains('show'));near(run('view2d.zoom'),2.4);
  return 'Card uses current cell details and its map link closes the window and centers the cell.';
});
test('global-chronicle-filter-and-badge',({run,mount,doc})=>{
  mount('<div id="chron"><button class="ch-f imp"></button><div id="ch-list"></div></div><button id="btn-chronicle"></button><span id="ev-badge"></span>');
  run('logEvent("war","war row",{imp:2,cell:c}); logEvent("found","found row",{imp:0}); _updateEvBadge();');
  assert.equal(doc.getElementById('ev-badge').textContent,'1');
  run('CHRON.filter="war"; CHRON.imp=true; toggleEventsPanel()');
  assert.equal(run('CHRON.shown.length'),1);assert.equal(doc.getElementById('ev-badge').classList.contains('show'),false);
  return 'Badge skips routine rows and tracks the last observed object.';
});
test('focus-checks-lifetime-and-stable-uid',({run})=>{
  run('var a=state(); var e={year:0,type:"war",d:{s:[a.id],u:[999],cell:east}};');
  assert(run('eventFocus(e) && selectedState===null && view2d.zoom===2.4'));
  assert(run('e.d.u=[100]; a.born=5; e.d.cell=-1; !eventFocus(e)'));
  assert(run('a.born=0; eventFocus(e) && selectedState===a'));
  return 'Old slot reuse suppresses selection but an explicit cell can still focus.';
});
test('world-feed-recovers-first-era',({run})=>{
  run('HIST.rec.eraFirst[3]={name:"First",uid:11,y:80};');
  assert(run('inspectStats.worldFeed().some(e=>e[5]===11 && e[1]==="era")'));
  run('HIST.events.push([80,"era","original",2,-1,11]);');
  assert.equal(run('inspectStats.worldFeed().filter(e=>e[5]===11).length'),1);
  return 'Major feed reconstructs era milestones from records without doubling nearby chronicle rows.';
});
test('state-chronicle-suppresses-nearby-reform-row',({run,read})=>{
  run('var a=state(); year(0); var r=HIST.get(100); r.changes.push([10,"gov","tribe","monarchy","coup"]); r.events.push([11,"reform","Custom reform",2,c,100]);');
  const rows=read('inspectStats.chronicle(a,r)');
  assert(rows.some(e=>e[3].includes('Custom reform')));assert(!rows.some(e=>e[3].includes('Change of government')));
  return rows.length;
});
test('event-notification-priority-and-expiry',({run,setTime,doc})=>{
  run('for(const [i,v] of [3,2,3,2].entries()) _notifyEvent({type:"war",text:"event "+i,d:{imp:v,cell:c}})');
  assert.equal(run('_ntQueue.length'),3);assert(run('_ntQueue.every(q=>q.e.text!=="event 1")'));
  setTime(3500);run('_notifyPump(performance.now())');assert.equal(doc.getElementById('ui-toasts').children.length,1);
  setTime(27000);run('_notifyPump(performance.now())');assert.equal(run('_ntQueue.length'),0);
  return 'Importance queue retains the newest and expires after 25 seconds.';
});
test('notification-suppression-and-preference',({run,setTime,doc,store})=>{
  setTime(5000);run('setNotify(false); _notifyEvent({type:"war",text:"hidden",d:{imp:2}}); _notifyPump(performance.now())');
  assert.equal(store.get('earthsim.notify'),'0');assert.equal(doc.getElementById('ui-toasts'),null);
  assert.equal(run('_ntQueue.length'),0);
  setTime(8000);run('setNotify(true); CHRON.open=true; _notifyEvent({type:"war",text:"in feed",d:{imp:2}}); _notifyPump(performance.now())');
  assert.equal(doc.getElementById('ui-toasts'),null);return 'Muted/open chronicle consumes queued events without showing toasts.';
});
test('uikit-window-stack',({run})=>{
  run('W.paused=false; var a=UI.win("a",{pause:true}), b=UI.win("b",{pause:false}); a.show(); b.show();');
  assert(run('W.paused && UI.anyOpen() && a.isOpen() && b.isOpen()'));
  run('UI.closeTop()');assert(run('a.isOpen() && !b.isOpen() && W.paused'));
  run('UI.closeTop()');assert(run('!UI.anyOpen() && !W.paused'));
  return 'Escape stack adapter closes top first and restores dedicated pause.';
});
test('uikit-table-sorts-null-last-before-limit',({run,read,ctx,doc})=>{
  ctx.host=doc.body.appendChild(new Element('div'));
  run('var t=UI.table(host,{cols:[{key:"k",label:"K",num:true}],rows:[{k:null},{k:1},{k:3}],sortKey:"k",sortDir:-1,limit:2})');
  assert.deepEqual(read('t.shown.map(r=>r.k)'),[3,1]);
  doc.body.querySelector('th.sortable').fire('click');assert.deepEqual(read('t.shown.map(r=>r.k)'),[1,3]);
  return 'Sort precedes row slicing and both directions keep missing values last.';
});
test('uikit-chart-hidpi-and-gaps',({run,ctx,doc})=>{
  const cv=doc.createElement('canvas');ctx.cv=cv;
  run('UI.chart(cv,{x:[0,2,100],series:[{name:"data",data:[0,NaN,9]}],tight:true,h:80});');
  assert.equal(cv.width,240);assert.equal(cv.height,160);
  near(cv._ui.X(1)-cv._ui.X(0),cv._ui.X(2)-cv._ui.X(1));
  assert(run('cv._ui.ser[0].data[1]!==cv._ui.ser[0].data[1]'));
  return 'Canvas uses a device pixel buffer, equal index spacing and retains undefined samples.';
});
test('country-flag-adapter',({run})=>{
  assert(run('ccFlagURI("12")===null && ccFlagURI("ZZ",18).startsWith("data:image/png") && ccGuess()==="US"'));
  run('localStorage.setItem("earthsim.netflag","none")');assert.equal(run('ccMine()'),'');
  return 'Country flag adapter uses local fallback and honors explicit hide.';
});
test('statistics-window-tabs-and-toggle',({run,doc})=>{
  run('var a=state(); year(0); year(4);');
  const tabs=['world','states','ranks','cities','wars','society','science','nature','compare','timelapse','trade'];
  for(const t of tabs) {
    run(`openStats(${JSON.stringify(t)})`);
    const w=doc.getElementById('stats-win');assert(w.classList.contains('show'),t);
    assert(!w.querySelector('.ui-body').textContent.includes('This section could not be shown'),t);
  }
  run('openStats()');assert(!doc.getElementById('stats-win').classList.contains('show'));
  return tabs;
});
test('state-detail-live-to-archive',({run,doc})=>{
  run('var a=state(); year(0); year(4); var w=openStateDetail(a); w.tab("eco");');
  const div=doc.getElementById('stats-state');assert(div.classList.contains('show'));
  run('a.alive=false; simEmit("stateDead",a,"depop",null); _statsMod.refresh();');
  assert(!doc.querySelector('#stats-state [data-tab=eco]'));assert.equal(run('inspectStats.V.sp.tab'),'over');
  assert(doc.querySelector('#stats-state [data-tab=hist]'));
  return 'Open page is rebuilt with archival tabs when its selected nation disappears.';
});
test('timelapse-controls-with-finite-history',({run,doc,timers})=>{
  run('var a=state(); year(0); W.stateId[east]=a.id; year(4); year(8); openStats("timelapse");');
  const w=doc.getElementById('stats-win');w.querySelector('[data-x=prev]').fire('click');
  assert.equal(run('inspectStats.V.tl.i'),1);
  w.querySelector('[data-x=play]').fire('click');
  const play=[...timers.values()].find(t=>t.ms<400);assert(play);
  play.fn();assert.equal(run('inspectStats.V.tl.i'),2);
  play.fn();assert.equal(run('inspectStats.V.tl.play'),false);
  return 'Playback steps through snapshots and stops at the last frame.';
});
test('toast-busy-window-and-expiry',({run,doc,setTime})=>{
  run('var w=UI.win("modal",{}).show(); _notifyEvent({type:"war",text:"delayed",d:{imp:2,cell:c}});');
  setTime(4000);run('_notifyPump(performance.now())');assert.equal(run('_ntQueue.length'),1);
  setTime(27000);run('_notifyPump(performance.now()); w.hide();');assert.equal(run('_ntQueue.length'),0);
  assert.equal(doc.getElementById('ui-toasts'),null);
  return 'Busy view retains fresh entries, but a stale entry is dropped.';
});
test('geo-manual-list-and-mark',({run,handlers})=>{
  handlers.get('geoList')([['land',12,12,'Central Plain'],['mark',13,12,'Marker',2]],'');
  assert.equal(run('placeNameAt(c)'),'Central Plain');
  assert(run('ncGeoLabels().some(el=>el.text==="Marker" && el.kind==="mark")'));
  run('MAP_OV.geo=false;');assert.equal(run('placeNameAt(c)'),'Central Plain');
  return 'Display toggle keeps underlying region lookup and manual marker data.';
});
test('3d-inspection-click-versus-drag',({run,ctx,doc,fragment})=>{
  const canvas=doc.createElement('canvas');ctx.test3d=canvas;
  run('var _3d={canvas:test3d,view:{az:1,el:.6,tx:10,tz:10,dist:40},drag:null}; var inspected=[]; inspectClick=i=>inspected.push(i); function hideTip3D(){} function pick3D(){return {x:12,y:12,i:c};}');
  run(fragment('world3d.js','function bindCam3D()','function resize3D()')+'\nbindCam3D()');
  canvas.fire('pointerdown',{button:0,clientX:12,clientY:12});canvas.fire('pointerup');
  assert.equal(run('inspected.length'),1);
  canvas.fire('pointerdown',{button:0,clientX:12,clientY:12});canvas.fire('pointermove',{clientX:22,clientY:12});canvas.fire('pointerup');
  assert.equal(run('inspected.length'),1);near(run('_3d.view.az'),.95);
  return 'Copied 3D input handlers distinguish an inspect click and a camera drag against a substitute ray pick.';
});
test('planet-slider-versus-action-bounds',({run,handlers})=>{
  const index=source('index.html');
  assert.match(index, /id="co2Slider" min="0.7" max="4" step="0.05"/);
  assert.match(index, /id="paceSlider" min="0.4" max="2.6" step="0.1"/);
  handlers.get('planet')('co2',20);handlers.get('planet')('pace',3);
  assert(run('W.co2===20 && W.pace===3'));
  return 'HTML slider limits are narrower than the planet handler for CO2 and history pace.';
});

const base=fixture();
const declarations=base.read(`({version:GAME_VERSION, statistics:STAT,
  world_metrics:_statsMod.WM,state_metrics:_statsMod.SM, world_tabs:inspectStats.tabs(),
  living_nation_tabs:inspectStats.sTabs(true),historic_nation_tabs:inspectStats.sTabs(false),
  metric_rankings:inspectStats.RANK,nation_columns:inspectStats.PRESET,city_columns:inspectStats.CITY_COLS.map(c=>[c.key,c.label]),
  layers:_LAYER_ORDER, registered_layers:Object.fromEntries(Object.entries(MAP_LAYERS).map(([k,v])=>[k,{label:v.label,group:v.group,borders:!!v.borders,sea:!!v.sea,veil:!!v.veil,smooth:!!v.smooth}])),
  overlays:MAP_OV,temperature_isolines:TEMP_LEVELS,precipitation_isolines:PRECIP_LEVELS,tools:TOOLS,
  simple_legends:Object.entries(_LEGEND()).map(([k,d])=>[k,d.a,d.mn,d.mx])})`);
const failed=results.filter(r=>r.status==='failed').length;
const report={work_package_id:'WP-MAP-INTERFACE',runtime_verified:false,sources,declarations,
  environment:{node:process.version,grid:[24,24],fixture:'Classic scripts in Node VM, synthetic DOM/canvas/clock and in-memory storage. Extra references expose internal stats closures for assertions. No game process, actual canvas raster or room.'},
  passed:results.length-failed,failed,results};
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(`WP-MAP-INTERFACE: ${report.passed} passed, ${failed} failed.`);
process.exitCode=failed?1:0;
