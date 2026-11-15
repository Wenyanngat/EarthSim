// Exercise shipped menu handlers in a VM with in-memory storage and a small DOM fixture.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const dir = path.join(root, '.research/wp-menu');
const copy = path.join(dir, 'test-copy/EarthSimulator');
const moduleNames = [
  'core.js', 'climate.js', 'ecology.js', 'fauna.js', 'civ.js', 'society.js',
  'goals.js', 'savestore.js', 'changelog.js', 'menunews.js', 'menu.js', 'main.js',
];
const names = [...moduleNames, 'ui.js', 'net.js', 'mods.js', 'demomode.js',
  'disasters.js', 'index.html', 'credits.html', 'package.json'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(copy, { recursive: true });
const sources = names.map(name => {
  const bytes = fs.readFileSync(path.join(root, 'EarthSimulator', name));
  const dest = path.join(copy, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
  assert(fs.readFileSync(dest).equals(bytes), 'Test source differs: ' + name);
  return { path: 'EarthSimulator/' + name, sha256: sha(bytes), bytes: bytes.length };
});

class FixtureEvent {
  constructor(type, options = {}) { Object.assign(this, options); this.type = type; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.stopped = true; }
}

class Element {
  constructor(tag, attrs = {}, trace = []) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.children = [];
    this.events = {};
    this.style = { setProperty(k, v) { this[k] = v; } };
    this.id = attrs.id || '';
    this.className = attrs.class || '';
    this.dataset = Object.fromEntries(Object.entries(attrs)
      .filter(([k]) => k.startsWith('data-')).map(([k, v]) => [k.slice(5), v]));
    this._value = attrs.value;
    this.defaultValue = attrs.value || '';
    this.defaultChecked = this.checked = 'checked' in attrs;
    this.defaultSelected = 'selected' in attrs;
    this.disabled = 'disabled' in attrs;
    this.min = attrs.min || '';
    this.max = attrs.max || '';
    this.type = attrs.type || '';
    this.trace = trace;
    const tokens = () => this.className.split(/\s+/).filter(Boolean);
    this.classList = {
      contains: k => tokens().includes(k),
      add: k => { this.className = [...new Set([...tokens(), k])].join(' '); },
      remove: k => { this.className = tokens().filter(x => x !== k).join(' '); },
      toggle: (k, on = !tokens().includes(k)) => {
        if (on) this.classList.add(k);
        else this.classList.remove(k);
        return on;
      },
    };
  }
  get options() { return this.querySelectorAll('option'); }
  get value() {
    if (this._value !== undefined) return String(this._value);
    if (this.tagName === 'SELECT') {
      const opts = this.options;
      return (opts.find(o => o.defaultSelected) || opts[0])?.value || '';
    }
    return '';
  }
  set value(v) { this._value = v; }
  get textContent() { return (this._text || '') + this.children.map(e => e.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(html) {
    this.children = [];
    this._text = '';
    this._html = html;
    if (this.tagName === 'SELECT') this._value = undefined;
    const stack = [this];
    for (const m of html.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][\w-]*(?:[^"'<>]|"[^"]*"|'[^']*')*>|[^<]+/gi)) {
      const token = m[0];
      if (token.startsWith('</')) {
        const tag = token.slice(2, -1).trim().toUpperCase();
        while (stack.length > 1 && stack.pop().tagName !== tag) {}
      } else if (/^<[a-z]/i.test(token)) {
        const tag = /^<([\w-]+)/.exec(token)[1].toLowerCase();
        const attr = {};
        for (const a of token.slice(tag.length + 1, -1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)) {
          attr[a[1]] = a[2] ?? a[3] ?? a[4] ?? '';
        }
        const el = new Element(tag, attr, this.trace);
        stack.at(-1).appendChild(el);
        if (!['input', 'img', 'br', 'hr', 'meta', 'link', 'path'].includes(tag) && !token.endsWith('/>')) stack.push(el);
      } else if (!token.startsWith('<')) {
        const e = stack.at(-1);
        e._text = (e._text || '') + token;
      }
    }
  }
  appendChild(el) { el.parentElement = this; this.children.push(el); return el; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(e => e !== this); }
  matches(sel) {
    const tag = /^[a-z][\w-]*/i.exec(sel);
    if (tag && this.tagName !== tag[0].toUpperCase()) return false;
    for (const [, name, quoted, double, bare] of sel.matchAll(/\[([\w-]+)(?:=(?:'([^']*)'|"([^"]*)"|([^\]]+)))?\]/g)) {
      const value = name.startsWith('data-') ? this.dataset[name.slice(5)] : this.attrs[name];
      const expected = quoted ?? double ?? bare;
      if (value === undefined || (expected !== undefined && value !== expected)) return false;
    }
    const simple = sel.replace(/\[[^\]]+\]/g, '');
    for (const [, id] of simple.matchAll(/#([\w-]+)/g)) if (this.id !== id) return false;
    for (const [, cls] of simple.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(cls)) return false;
    return !sel.endsWith(':checked') || this.checked;
  }
  closest(sel) {
    for (let e = this; e; e = e.parentElement) if (e.matches(sel)) return e;
    return null;
  }
  querySelectorAll(sel) {
    const parts = sel.split(' ');
    const leaf = parts.pop();
    const parent = parts[0];
    const out = [];
    function visit(e) {
      for (const el of e.children) {
        if (el.matches(leaf) && (!parent || el.parentElement.closest(parent))) out.push(el);
        visit(el);
      }
    }
    visit(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
  dispatchEvent(ev) {
    if (!ev.target) ev.target = this;
    for (const fn of this.events[ev.type] || []) fn(ev);
    if (ev.bubbles && !ev.stopped && this.parentElement) this.parentElement.dispatchEvent(ev);
  }
  click() {
    if (this.disabled) return;
    if (this.tagName === 'A') this.trace.push(['link', this.href, this.target, this.rel]);
    this.dispatchEvent(new FixtureEvent('click', { bubbles: true }));
  }
  focus() {}
  select() {}
}

function storage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: i => [...data.keys()][i],
    getItem: k => data.get(k) ?? null,
    setItem(k, v) {
      if (this.failWrites && this.failWrites(k)) throw Error('fixture storage denied');
      data.set(k, String(v));
    },
    removeItem: k => data.delete(k),
  };
}

function fixture(options = {}) {
  const trace = [];
  const errors = [];
  const timers = [];
  const localStorage = storage();
  const sessionStorage = storage();
  sessionStorage.setItem('earthsim.boot', JSON.stringify(options.boot ?? { w: 24, h: 24 }));
  const make = tag => new Element(tag, {}, trace);
  const doc = make('document');
  doc.head = doc.appendChild(make('head'));
  doc.body = doc.appendChild(make('body'));
  doc.getElementById = id => doc.querySelector('#' + id);
  doc.createElement = make;
  doc.readyState = 'loading';
  for (const id of ['loader', 'btn-menu', 'btn-play', 'play-glyph', 'worldType']) {
    const el = doc.body.appendChild(make('div'));
    el.id = id;
    if (id === 'loader') el.className = 'hide';
    if (id === 'worldType') el.value = 'flat';
  }
  let now = 10000;
  let language = 'en';
  const room = { on: false, isHost: false, paused: false };
  const acts = new Map();
  const ui = { tool: 'inspect', speed: 1 };
  const window = { close: () => trace.push(['close']), open: (...a) => trace.push(['open', ...a]), addEventListener() {} };
  const c = vm.createContext({
    window, document: doc, localStorage, sessionStorage, Event: FixtureEvent,
    location: { reload: () => trace.push(['reload']) },
    setTimeout: (fn, ms) => timers.push({ fn, ms }), setInterval: () => 1, clearTimeout() {}, clearInterval() {},
    requestAnimationFrame: fn => { trace.push(['frame scheduled']); return 1; },
    performance: { now: () => now }, UI_FONT: 'sans-serif',
    console: { log() {}, warn: (...a) => trace.push(['warn', ...a.map(String)]), error: (...a) => errors.push(a.map(String).join(' ')) },
    btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
    T: (a, b) => language === 'ru' ? a : b,
    TF: (a, b, ...args) => (language === 'ru' ? a : b).replace(/\{(\d+)\}/g, (_, i) => args[i]),
    TL: 'en', TNn: (n, a, b, c, one, many) => n + ' ' + (n === 1 ? one : many),
    curLang: () => language, curLocale: () => language, uM: n => Math.round(n) + ' m',
    LANGS: [{id:'en',en:'English',name:'English'},{id:'ru',en:'Russian',name:'Русский'}],
    uiState: ui, setTool: key => { ui.tool = key; }, NP: room,
    netLive: () => room.on, netCanTime: () => !room.on || room.isHost,
    netAct: (key, fn) => acts.set(key, fn),
    netDo: (key, ...args) => { trace.push(['netDo', key, ...args]); if (!room.on) return acts.get(key)(...args); },
    netFrame: n => trace.push(['netFrame', n]),
    netTimeDeny: () => trace.push(['time denied']), netLoadDeny: () => trace.push(['load denied']),
    netUiAfterBoot: () => trace.push(['netUiAfterBoot']), netBootJoin: b => trace.push(['join', b]),
    netNames: fn => fn(), netAside: () => false, latinNames: () => true,
    initRender() {}, bindUI() {}, syncPlanetSliders() {}, renderStatePanel() {}, buildBase() {}, buildBorders() {},
    updateHud: () => trace.push(['hud']), renderFrame: () => trace.push(['render']), refreshHover() {},
    UI: {
      esc: s => String(s).replace(/[&<>"']/g, v => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[v])),
      icon: () => '', anyOpen: () => !!doc.querySelector('#ui-confirm.show'),
      win(id) {
        doc.getElementById(id)?.remove();
        const el = doc.body.appendChild(make('div'));
        el.id = id;
        const body = el.appendChild(make('div'));
        const foot = el.appendChild(make('div'));
        return { el, body, foot, show: () => el.classList.add('show'), hide: () => el.classList.remove('show') };
      },
      closeTop() {
        const el = doc.querySelector('#ui-confirm.show');
        if (!el) return false;
        el.classList.remove('show');
        return true;
      },
    },
    FileReader: class { readAsText(f) { this.result = f.text; this.onload(); } },
    Blob: class { constructor(parts) { this.parts = parts; } },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL: () => {} },
  });
  const run = js => {
    const v = vm.runInContext(js, c, { timeout: 10000 });
    assert.deepEqual(errors, [], 'Shipped subscriber logged an exception');
    return v;
  };
  for (const n of moduleNames) vm.runInContext(fs.readFileSync(path.join(copy, n), 'utf8'), c, { filename: 'test-copy/' + n });
  const uiText = fs.readFileSync(path.join(copy, 'ui.js'), 'utf8');
  const begin = uiText.indexOf('let _worldTouched = false;');
  const end = uiText.indexOf('function syncBrush()', begin);
  assert(begin >= 0 && end > begin);
  vm.runInContext(uiText.slice(begin, end), c, { filename: 'test-copy/ui.js:lifecycle' });
  run('Math.random=()=>.41');
  const node = sel => {
    const el = doc.querySelector(sel);
    assert(el, 'Missing fixture node ' + sel);
    return el;
  };
  const save = (name, meta = {}, contents = {}) => run('SaveStore.write')(
    name, { v: 3, w: 24, h: 24, scal: {}, states: [], arrays: {}, ...contents },
    { w: 24, h: 24, year: 2, ts: 1, ...meta },
  );
  const key = (k, code = '') => run('onKey')(new FixtureEvent('keydown', { key: k, code, target: doc.body }));
  const click = sel => node(sel).click();
  const pane = name => click(".mm-item[data-pane='" + name + "']");
  const change = (sel, value) => {
    const el = node(sel);
    el.value = value;
    el.dispatchEvent(new FixtureEvent('change', { bubbles: true }));
  };
  const confirm = label => {
    const button = doc.querySelectorAll('#ui-confirm button').find(e => e.textContent === label);
    assert(button, 'Missing confirmation ' + label);
    button.click();
  };
  const boot = () => JSON.parse(sessionStorage.getItem('earthsim.boot'));
  const writes = () => trace.filter(e => e[0] === 'reload').length;
  return { c, run, trace, timers, localStorage, sessionStorage, room, window, doc, ui,
    save, key, click, pane, confirm, node, change, boot, writes, clock: t => { now = t; },
    lang: l => { language = l; } };
}

const results = [];
function test(id, fn) {
  try { results.push({ id, status: 'passed', observed: fn() ?? null }); }
  catch (error) { results.push({ id, status: 'failed', error: error.stack }); }
}

test('M01-start-menu-continue-loads-most-recent-eligible-save', () => {
  const f = fixture({boot: false});
  f.save('Older', { ts: 10 }); f.save('Broken', { ts: 30 }); f.save('Good', { ts: 20, year: 42 });
  f.localStorage.setItem('earthsim.badsaves', '["Broken"]');
  f.run('showMainMenu()');
  assert(f.node(".mm-item[data-pane='continue']").textContent.includes('Good · year 42'));
  f.pane('continue');
  assert.equal(f.boot().key, 'Good'); assert.equal(f.writes(), 1);
});
test('M02-start-menu-no-saves-continues-existing-background', () => {
  const f = fixture({boot: false});
  f.run('W.simYear=7;showMainMenu()'); f.pane('continue');
  assert.equal(f.run('W.simYear'), 7); assert.equal(f.run('MENU_UP'), false); assert.equal(f.writes(), 0);
});
test('M03-in-game-continue-resumes-without-load', () => {
  const f = fixture(); f.save('Good'); f.run('W.paused=false;showMainMenu();showMainMenu()');
  assert.equal(f.run('W.paused'), true); f.pane('continue');
  assert.equal(f.run('W.paused'), false); assert.equal(f.writes(), 0);
});
test('M04-esc-at-startup-dismisses-without-continue-load', () => {
  const f = fixture({ boot: false }); f.save('Good'); f.run('showMainMenu()'); f.key('Escape');
  assert.equal(f.run('MENU_UP'), false); assert.equal(f.run('_menuStartup'), false); assert.equal(f.writes(), 0);
});
test('M05-walk-menu-restores-both-pauses', () => {
  const f = fixture();
  f.run('globalThis.walkActive=true;globalThis.WK={paused:false,last:17};W.paused=true;showMainMenu()');
  assert.equal(f.run('WK.paused'), true); f.run('hideMainMenu()');
  assert.equal(f.run('W.paused'), true); assert.equal(f.run('WK.paused'), false); assert.equal(f.run('WK.last'), 0);
});
test('M06-frame-skips-world-render-and-advances-room', () => {
  const f = fixture(); f.run('showMainMenu();W.paused=false;frame(100)');
  assert.equal(f.run('W.paused'), true); assert.equal(f.trace.some(e => e[0] === 'render'), false);
  f.room.on = true; f.run('frame(200)');
  assert(f.trace.some(e => e[0] === 'netFrame')); assert.equal(f.run('_menuIdle'), true);
});
test('M07-room-blocks-new-scenario-load-and-workshop-panes', () => {
  const f = fixture(); f.room.on = true; f.run('showMainMenu()');
  for (const s of ['new', 'scn', 'load', 'mods']) f.pane(s);
  assert.equal(f.trace.filter(e => e[0] === 'load denied').length, 4);
  f.pane('save'); assert.equal(f.run('_curPane'), 'save');
});
test('M08-settings-cancel-restores-persisted-autosave', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('set'); f.change('#set-autosave', '20');
  assert.equal(f.run('autosaveMinutes()'), 20); f.click('#set-cancel');
  assert.equal(f.run('autosaveMinutes()'), 10); assert.equal(f.run('MENU_UP'), true);
});
test('M09-settings-apply-keeps-current-autosave', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('set'); f.change('#set-autosave', '20'); f.click('#set-apply');
  assert.equal(f.run('autosaveMinutes()'), 20); assert.equal(f.run('_curPane'), null);
});
test('M10-escape-priority-confirm-then-pane-then-menu', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new'); f.run('uiAlert("test")');
  f.key('Escape'); assert.equal(f.run('_curPane'), 'new');
  f.key('Escape'); assert.equal(f.run('_curPane'), null); assert.equal(f.run('MENU_UP'), true);
  f.key('Escape'); assert.equal(f.run('MENU_UP'), false);
});
test('M11-escape-sheathes-tool-before-menu', () => {
  const f = fixture(); f.ui.tool = 'population'; f.key('Escape');
  assert.equal(f.ui.tool, 'inspect'); assert.equal(f.run('MENU_UP'), false);
  f.key('Escape'); assert.equal(f.run('MENU_UP'), true);
});
test('M12-default-form-renders-actual-declarations', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new');
  assert.equal(f.run('JSON.stringify(_ngRead(_menuEl))'), JSON.stringify({
    w:80,h:60,type:'continents',dis:1,settle:1,dynSea:1,fauna:1,fauto:1,sea:.4,co2:1,sun:1,pace:1,
  }));
});
test('M13-preset-form-clamps-size-and-slider-values', () => {
  const f = fixture(); f.run('showMainMenu();_ngApply(_menuEl,{w:5,h:999,sea:.9,pace:0,type:"missing"})');
  assert.equal(f.run('JSON.stringify([_ngRead(_menuEl).w,_ngRead(_menuEl).h,_ngRead(_menuEl).sea,_ngRead(_menuEl).pace,_ngRead(_menuEl).type])'), '[24,220,0.6,0.4,"continents"]');
});
test('M14-seed-filter-strips-nondigits-and-rejects-upper-limit', () => {
  const f = fixture(); f.run('showMainMenu()');
  f.node('#mm-seed').value = '-12x34';
  assert.equal(f.run('_ngRead(_menuEl).seed'), 1234);
  f.node('#mm-seed').value = '2147483647';
  assert.equal(f.run('_ngRead(_menuEl).seed'), undefined);
});
test('M15-boot-omits-climate-by-numerical-default', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new');
  f.change('#mm-sea', '48'); f.change('#mm-sea', '40'); f.click('#mm-create');
  for (const k of ['seaLevel', 'co2', 'solar']) assert(!(k in f.boot()));
  assert.equal(f.boot().mode, 'new');
});
test('M16-flat-boot-excludes-tribes-but-keeps-nondefault-climate', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new');
  f.change('#mm-type', 'flat'); f.change('#mm-co2', '130'); f.click('#mm-create');
  assert.equal(f.boot().settle, 0); assert.equal(f.boot().co2, 1.3);
});
test('M17-no-fauna-user-change-unchecks-autogenesis', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new'); f.change('#mm-fauna', '-1');
  assert.equal(f.node('#mm-fauto').checked, false);
  f.node('#mm-fauto').checked = true; f.click('#mm-create');
  assert.equal(f.boot().fauna, -1); assert.equal(f.boot().faunaAuto, 1);
});
test('M18-seven-built-ins-and-user-edit-detaches-selection', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new');
  assert.equal(f.run('_NG_BUILTIN().length'), 7);
  f.change('#mm-preset', 'b:isles');
  assert.equal(f.node('#mm-type').value, 'islands'); assert.equal(f.node('#mm-sea').value, '44');
  assert.equal(f.node('#mm-preset-ren').disabled, true);
  f.change('#mm-co2', '105'); assert.equal(f.node('#mm-preset').value, '');
});
test('M19-setting-presets-validate-names-and-bound-list', () => {
  const f = fixture();
  const many = Array.from({ length: 34 }, (_, i) => ({ n: 'x' + i, v: {} }));
  f.localStorage.setItem('earthsim.ngPresets', JSON.stringify([null,{ n:'   Ab   C ',v:{} },{n:'ab c',v:{w:5}},...many]));
  assert.equal(f.run('_ngPresets().length'), 30); assert.equal(f.run('_ngPresets()[0].n'), 'Ab C');
  f.localStorage.setItem('earthsim.ngPresets', '{'); assert.equal(f.run('_ngPresets().length'), 0);
});
test('M20-preset-save-overwrite-requires-confirmation-and-keeps-seed', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new'); f.node('#mm-seed').value = '123';
  f.click('#mm-preset-save'); f.node('#mm-preset-name').value = 'My  Map'; f.click('#mm-preset-ok');
  assert.equal(f.run('_ngPresets()[0].n'), 'My Map'); assert.equal(f.run('_ngPresets()[0].v.seed'), 123);
  f.change('#mm-pace', '18'); f.click('#mm-preset-save'); f.click('#mm-preset-ok');
  assert.equal(f.run('_ngPresets()[0].v.pace'), 1);
  f.confirm('Overwrite'); assert.equal(f.run('_ngPresets()[0].v.pace'), 1.8);
});
test('M21-rename-collision-replaces-only-on-confirmation', () => {
  const f = fixture(); f.localStorage.setItem('earthsim.ngPresets', '[{"n":"A","v":{"seed":5}},{"n":"B","v":{"seed":6}}]');
  f.run('showMainMenu()'); f.pane('new'); f.change('#mm-preset', 'u:0');
  f.click('#mm-preset-ren'); f.node('#mm-preset-name').value = 'b'; f.click('#mm-preset-ok');
  assert.equal(f.run('_ngPresets().length'), 2); f.confirm('Replace');
  assert.equal(f.run('JSON.stringify(_ngPresets())'), '[{"n":"b","v":{"seed":5}}]');
});
test('M22-delete-confirmation-and-defaults', () => {
  const f = fixture(); f.localStorage.setItem('earthsim.ngPresets','[{"n":"A","v":{"sun":1.05}}]');
  f.run('showMainMenu()'); f.pane('new'); f.change('#mm-preset','u:0'); f.click('#mm-preset-del');
  assert.equal(f.run('_ngPresets().length'),1); f.confirm('Delete');
  assert.equal(f.run('_ngPresets().length'),0); f.click('#mm-preset-def');
  assert.equal(f.node('#mm-sun').value,'100');
});
test('M23-new-game-last-settings-drop-seed-and-survive-storage-failure', () => {
  const f = fixture(); f.run('showMainMenu()'); f.pane('new');
  f.node('#mm-seed').value = '456'; f.sessionStorage.failWrites = k => k === 'earthsim.boot';
  f.click('#mm-create');
  assert(!('seed' in JSON.parse(f.localStorage.getItem('earthsim.ngLast'))));
  assert.equal(f.writes(), 0); assert(f.doc.querySelector('#ui-confirm.show'));
});
test('M24-new-game-reloads-after-failed-exit-autosave', () => {
  const f = fixture(); f.run('W.simYear=5;states.push({alive:true,cells:new Set([0])});showMainMenu()'); f.pane('new');
  f.localStorage.failWrites = k => k.startsWith('earthsim.save.');
  assert.equal(f.run('_saveOnExit()'), true);
  f.click('#mm-create'); assert.equal(f.localStorage.getItem('earthsim.save.Autosave'), null); assert.equal(f.writes(),1);
});
test('M25-quick-regen-save-branch-stays-on-failure', () => {
  const f = fixture(); f.run('W.simYear=7;askNewWorld()');
  f.localStorage.failWrites = k => k.startsWith('earthsim.save.');
  f.confirm('Save and create');
  assert.equal(f.run('W.simYear'),7); assert.equal(f.trace.filter(e=>e[0]==='netDo').length,0);
});
test('M26-quick-regen-save-branch-resets-on-success', () => {
  const f = fixture(); f.run('W.simYear=7;askNewWorld()'); f.confirm('Save and create');
  assert.equal(f.run('W.simYear'),0); assert.equal(f.run('SaveStore.exists("World before re-creation, year 7")'),true); assert.equal(f.writes(),0);
});
test('M27-quick-regen-preserves-selected-scalars-and-ends-scenario', () => {
  const f = fixture();
  f.run('activeScenario={def:{}};W.globalForce=2;W.solar=1.02;W.windMul=1.1;W.dynSea=1;W.pace=1.6;W.co2=2;W.simYear=9;W.faunaRich=-1;W.pop[1]=100;regen()');
  assert.equal(f.run('JSON.stringify([W.globalForce,W.solar,W.windMul,W.dynSea,W.pace,W.co2,W.simYear,W.faunaRich,W.pop[1],activeScenario])'), '[2,1.02,1.1,1,1.6,1,0,-1,0,null]');
});
test('M28-erase-life-always-confirms-and-preserves-scenario-time-and-fauna', () => {
  const f = fixture();
  f.run('W.simYear=2;W.simTick=55;W.pop[0]=120;W.herb[0]=.5;W.elev[0]=.52;W.nukeWinter=2;activeScenario={def:{}};askResetLife()');
  assert.equal(f.run('W.pop[0]'),120); f.confirm('Erase people and nations');
  assert.equal(f.run('JSON.stringify([W.pop[0],W.herb[0],W.simYear,W.simTick,W.nukeWinter,!!activeScenario])'),'[0,0.5,2,55,0,true]');
  assert(Math.abs(f.run('W.elev[0]')-.52)<1e-6);
});
test('M29-room-host-only-world-actions', () => {
  const f = fixture(); f.room.on = true; f.run('askNewWorld();askResetLife()');
  assert.equal(f.trace.filter(e=>e[0]==='time denied').length,2);
  f.room.isHost = true; f.run('regen();resetLife()');
  const acts = f.trace.filter(e=>e[0]==='netDo');
  assert.equal(acts[0][1],'regen'); assert.equal(typeof acts[0][3],'number'); assert.equal(acts[1][1],'resetLife');
});
test('M30-quit-confirm-dispatches-nw-after-demo-flush', () => {
  const f = fixture();
  f.window.nw = { App: { quit: () => f.trace.push(['quit']) } }; f.c.nw = f.window.nw;
  f.c.demoFlush = () => f.trace.push(['flush']); f.run('showMainMenu()'); f.pane('quit');
  assert(!f.trace.some(e=>e[0]==='quit')); f.confirm('Quit');
  assert.deepEqual(f.trace.filter(e=>['quit','flush','close'].includes(e[0])),[['flush'],['quit']]);
});
test('M31-install-uses-nw-close-and-fallback-window-close', () => {
  const f = fixture(); let handler;
  const host = { on: (k, fn) => { assert.equal(k, 'close'); handler=fn; }, close: force => f.trace.push(['native-close',force]) };
  f.window.nw = {Window:{get:()=>host}}; f.c.nw = f.window.nw;
  f.run('installMenuButton()'); handler.call(host); assert(f.trace.some(e=>e[0]==='native-close'&&e[1]));
  f.run('_quitApp()'); assert(f.trace.some(e=>e[0]==='close'));
});
test('M32-load-dimensions-and-prefix-boundary', () => {
  const f = fixture(); f.save('Bad',{}, {w:25}); f.save('Good',{}, {scal:{simYear:18}});
  assert.equal(f.run('loadWorldFromStorage("Bad")'),false);
  assert.equal(f.run('loadWorldFromStorage("earthsim.save.Good")'),true); assert.equal(f.run('W.simYear'),18);
});
test('M33-boot-load-failure-marks-and-caps-bad-saves', () => {
  const f = fixture({boot:{mode:'load',key:'Missing',w:24,h:24}});
  f.localStorage.setItem('earthsim.badsaves',JSON.stringify(Array.from({length:23},(_,i)=>'old'+i)));
  f.run('start()');
  const list=JSON.parse(f.localStorage.getItem('earthsim.badsaves'));
  assert.equal(list.length,20); assert.equal(list.at(-1),'Missing');
  assert.equal(f.sessionStorage.getItem('earthsim.boot'),null); assert.equal(f.run('W.simYear'),0);
});
test('M34-boot-new-applies-real-params-and-final-history-options', () => {
  const f=fixture({boot:{mode:'new',type:'flat',seed:123,w:24,h:24,co2:1.3,fauna:-1,faunaAuto:0,pace:1.7,disasters:2,dynSea:1}});
  f.run('globalThis.events=0;simOn("worldgen",()=>events++);start()');
  assert.equal(f.run('JSON.stringify([worldSeed,W.co2ppm,W.pace,W.disasterRate,W.dynSea,W.faunaRich,W.faunaAuto,events])'),'[123,364,1.7,2,1,-1,0,2]');
  assert(Math.abs(f.run('W.simYear') - .1) < 1e-12);
});
test('M35-network-boot-starts-flat-placeholder-and-handoff', () => {
  const f=fixture({boot:{mode:'net',w:24,h:24,room:'fixture'}}); f.run('start()');
  assert.equal(f.run('worldSeed'),1);
  assert(f.trace.some(e=>e[0]==='join'&&e[1].room==='fixture'));
});
test('M36-save-overwrite-confirmation-respects-current-pause-snapshot', () => {
  const f=fixture(); f.save('Map',{}, {scal:{simYear:3}});
  f.run('W.simYear=9;W.paused=false;showMainMenu()'); f.pane('save'); f.node('#mm-savename').value='Map';
  f.click('#mm-save'); assert.equal(f.run('SaveStore.read("Map").scal.simYear'),3); f.confirm('Overwrite');
  assert.equal(f.run('SaveStore.read("Map").scal.simYear'),9); assert.equal(f.run('SaveStore.read("Map").scal.paused'),false);
});
test('M37-import-name-collision-and-boot-handoff', () => {
  const f=fixture(); f.save('map'); f.run('showMainMenu()'); f.pane('load');
  const e=f.node('#mm-file'); e.files=[{name:'map.json',text:'{"w":24,"h":24,"scal":{"simYear":4},"arrays":{}}'}];
  e.dispatchEvent(new FixtureEvent('change'));
  assert.equal(f.boot().key,'map (2)'); assert.equal(f.run('SaveStore.read("map (2)").scal.simYear'),4);
});
test('M38-import-rejects-size-and-keeps-page', () => {
  const f=fixture(); f.run('showMainMenu()'); f.pane('load');
  const e=f.node('#mm-file'); e.files=[{name:'bad.json',text:'{"w":221,"h":24,"arrays":{}}'}];
  e.dispatchEvent(new FixtureEvent('change'));
  assert.equal(f.writes(),0); assert(f.node('#ui-confirm').textContent.includes('221×24'));
});
test('M39-localized-quick-slot-finds-old-and-replaces-after-success', () => {
  const f=fixture(); f.save('Быстрое сохранение'); f.run('quickLoad()');
  assert.equal(f.boot().key,'Быстрое сохранение');
  f.run('quickSave()'); assert.equal(f.run('SaveStore.exists("Quick save")'),true); assert.equal(f.run('SaveStore.exists("Быстрое сохранение")'),false);
});
test('M40-f5-menu-disabled-and-f9-room-denied', () => {
  const f=fixture(); f.run('showMainMenu()'); f.key('F5');
  assert.equal(f.run('SaveStore.list().length'),0);
  f.room.on=true; f.key('F9'); assert(f.trace.some(e=>e[0]==='load denied'));
});
test('M41-autosave-requires-live-state-and-new-integer-year', () => {
  const f=fixture(); f.localStorage.setItem('earthsim.autosave','1'); f.clock(71000);
  f.run('W.paused=false;W.simYear=4;autosaveTick()'); assert.equal(f.run('SaveStore.exists("Autosave")'),false);
  f.run('states.push({alive:true,cells:new Set([0])})'); f.clock(132000); f.run('autosaveTick()');
  assert.equal(f.run('SaveStore.read("Autosave").scal.simYear'),4);
  f.clock(193000); f.run('W.simYear=4.9;autosaveTick()'); assert.equal(f.run('SaveStore.read("Autosave").scal.simYear'),4);
});
test('M42-autosave-failure-still-marks-current-integer-year', () => {
  const f=fixture(); f.localStorage.setItem('earthsim.autosave','1'); f.clock(71000);
  f.run('W.paused=false;W.simYear=4;states.push({alive:true,cells:new Set([0])})');
  f.localStorage.failWrites=k=>k.startsWith('earthsim.save.'); f.run('autosaveTick()');
  f.localStorage.failWrites=null; f.clock(132000); f.run('autosaveTick()');
  assert.equal(f.run('_autoYear'),4); assert.equal(f.run('SaveStore.exists("Autosave")'),false);
});
test('M43-news-local-data-folding-and-language-fallback', () => {
  const f=fixture(); f.lang('de'); f.run('showMainMenu()');
  assert.equal(f.doc.querySelectorAll('.mn-v.open').length,1);
  assert.equal(f.node('.mn-road').dataset.url.endsWith('/en/#roadmap'),true);
  f.click('#mn-tog'); assert.equal(f.localStorage.getItem('earthsim.menu.news'),'0');
  assert(f.node('#mm-news').classList.contains('shut'));
});
test('M44-news-https-only-nw-and-anchor-routes', () => {
  const f=fixture(); f.run('mmOpenLink("http://example.invalid/");mmOpenLink("https://example.invalid/")');
  assert.deepEqual(f.trace.filter(e=>e[0]==='link'),[['link','https://example.invalid/','_blank','noopener']]);
  f.window.nw={Shell:{openExternal:url=>f.trace.push(['shell',url])}}; f.c.nw=f.window.nw;
  f.run('mmOpenLink("https://example.invalid/")'); assert(f.trace.some(e=>e[0]==='shell'));
});
test('M45-credits-routes-and-sample-file', () => {
  const f=fixture(); f.run('showMainMenu()'); f.pane('cred'); f.click('#mm-cred-tg'); f.click('#mm-cred-lic');
  assert(f.trace.some(e=>e[0]==='open'&&e[1]==='https://t.me/gamesforfarmnews'));
  assert(f.node('#mm-flash').textContent.includes('credits.html'));
  const file=fs.readFileSync(path.join(copy,'credits.html'),'utf8');
  assert(file.includes('This is sample credits page.')&&file.includes('generate_about_credits=true'));
});
test('M46-scenario-card-passes-id-and-config-through-new-boot', () => {
  const f=fixture(); f.run('showMainMenu()'); f.pane('scn'); f.click('.scn-card');
  assert.equal(f.boot().scenario,f.run('SCENARIOS[0].id')); assert.equal(f.boot().mode,'new');
});
test('M47-menu-window-size-sets-grid-before-world-allocation', () => {
  const f=fixture({boot:{mode:'new',w:27,h:31}}); assert.equal(f.run('W.pop.length'),837);
  const bad=fixture({boot:{mode:'new',w:221,h:31}}); assert.equal(bad.run('W.pop.length'),4800);
});
test('M48-start-without-boot-queues-lobby-and-seeds-population', () => {
  const f = fixture({ boot: false });
  let index = 0;
  f.c.fixedDraw = () => ((++index * 313) % 4800) / 4800;
  f.run('Math.random=fixedDraw;start()');
  assert(f.timers.some(t => t.ms === 380));
  assert(f.run('W.pop.some(p=>p>0)'));
  assert.equal(f.run('MENU_UP'), false);
});
test('M49-scenario-boot-applies-supplied-scenario-after-generation', () => {
  const f = fixture({ boot: { mode:'new', w:24, h:24, type:'flat', scenario:'fixture', settle:1, pace:2 } });
  f.run('SCENARIOS.push({id:"fixture",name:"Fixture",desc:""});start()');
  assert.equal(f.run('activeScenario.def.id'), 'fixture');
  assert.equal(f.run('W.pace'), 1);
  assert.equal(f.run('W.pop.reduce((a,b)=>a+b,0)'), 0);
});
test('M50-missing-addon-world-falls-back-to-generator', () => {
  const f = fixture({ boot: { mode:'new', w:24, h:24, type:'flat', world:'fixture', seed:73 } });
  f.c.modWorldBoot = cfg => { f.trace.push(['addon attempted', cfg.world]); return false; };
  f.run('start()');
  assert(f.trace.some(e => e[0] === 'addon attempted'));
  assert.equal(f.run('worldSeed'), 73);
});
test('M51-r-needs-two-presses-and-cancel-keeps-world', () => {
  const f = fixture(); f.run('W.simYear=9'); f.key('r','KeyR');
  assert.equal(f.doc.querySelector('#ui-confirm.show'), null);
  f.clock(10200); f.key('r','KeyR');
  assert(f.doc.querySelector('#ui-confirm.show'));
  f.confirm('Cancel'); assert.equal(f.run('W.simYear'),9);
});
test('M52-save-repair-removes-name-from-continue-exclusion', () => {
  const f = fixture();
  f.localStorage.setItem('earthsim.badsaves', '["Fixed","Other"]');
  assert.equal(f.run('saveWorldToStorage("Fixed")'), 'Fixed');
  assert.equal(f.localStorage.getItem('earthsim.badsaves'), '["Other"]');
});
test('M53-credits-license-opens-alongside-native-executable', () => {
  const f = fixture();
  f.window.nw = { Shell: { openItem: p => f.trace.push(['item',p]) } };
  f.c.nw = f.window.nw;
  f.c.require = mod => { assert.equal(mod, 'path'); return path.win32; };
  f.c.process = { execPath: 'X:\\Fixture\\EarthSimulator.exe' };
  f.run('showMainMenu()'); f.pane('cred'); f.click('#mm-cred-lic');
  assert(f.trace.some(e => e[0] === 'item' && e[1] === 'X:\\Fixture\\credits.html'));
});
test('M54-try-load-write-failure-blocks-reload', () => {
  const f = fixture(); f.sessionStorage.failWrites = () => true;
  f.run('bootLoadMap("Old",24,24)');
  assert.equal(f.writes(), 0);
  assert(f.node('#ui-confirm').textContent.includes('storage unavailable'));
});
test('M55-no-scenario-bootstrap-when-continue-has-no-valid-metadata', () => {
  const f = fixture({ boot: false });
  f.localStorage.setItem('earthsim.save.Legacy', '{"w":24,"h":24,"arrays":{}}');
  assert.equal(f.run('SaveStore.list().length'),1);
  f.run('showMainMenu()'); f.pane('continue');
  assert.equal(f.writes(),0);
});
test('M56-auto-slot-preserves-older-language-on-write-failure', () => {
  const f = fixture(); f.save('Автосохранение');
  f.localStorage.failWrites = k => k.startsWith('earthsim.save.');
  assert.equal(f.run('_slotWrite("auto",AUTOSAVE_NAME())'), null);
  assert.equal(f.run('SaveStore.exists("Автосохранение")'), true);
});
test('M57-reset-emits-reset-without-worldgen', () => {
  const f = fixture();
  f.run('globalThis.resetEvents=[];simOn("reset",()=>resetEvents.push("reset"));simOn("worldgen",()=>resetEvents.push("worldgen"));resetLife()');
  assert.equal(f.run('JSON.stringify(resetEvents)'), '["reset"]');
});
test('M58-restoring-room-menu-uses-current-room-pause', () => {
  const f = fixture();
  f.room.on = true; f.run('W.paused=false;showMainMenu()');
  assert.equal(f.run('W.paused'),false);
  f.room.paused = true; f.run('hideMainMenu()');
  assert.equal(f.run('W.paused'),true);
});

const data = fixture();
data.run('showMainMenu()');
const declarations = JSON.parse(data.run('JSON.stringify({version:GAME_VERSION,presets:_NG_BUILTIN(),defaults:_ngRead(_menuEl),sliders:_NG_SLIDERS,presetLimit:NG_MAX,presetNameLimit:NG_NAME_MAX,newsChannels:MM_LINKS,steam:MM_STEAM_HUB,roadmap:MM_ROADMAP,newsVersions:CHANGELOG.map(({v,d})=>({v,d})),scenarioIds:SCENARIOS.map(s=>s.id)})'));
const passed = results.filter(r=>r.status==='passed').length;
const report = {
  format_version:'1.0.0', work_package_id:'WP-MENU-LIFECYCLE', runtime_verified:false, sources, declarations,
  environment:{
    kind:'isolated-node-vm', node:process.version,
    executed_modules:moduleNames,
    fragment:{file:'ui.js',start:'let _worldTouched = false;',end_exclusive:'function syncBrush()'},
    fixture:'Minimal DOM driven by shipped menu markup, fake window/shell and browser storage, synthetic saves and 24×24 worlds. No functions in shipped source are replaced.',
    limitations:['No layout, real browser, desktop window, user saves, disk backend, external navigation, room transport or active mods.','The lifecycle fragment uses in-memory netAct/netDo adapters. Individual preparation and dispatch are observable, server execution is outside the fixture.'],
  }, passed, failed:results.length-passed, results,
};
fs.writeFileSync(path.join(dir,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed,failed:report.failed,failures:results.filter(r=>r.status==='failed')},null,2));
process.exitCode=report.failed?1:0;
