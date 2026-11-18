// Voluntas Devina mode entry and world creation.
'use strict';

const VOLUNTAS_BOOT = 'voluntas.devina.boot';
const VOLUNTAS = { active: false, solo: false, players: [], ready: {}, year: 0, winner: null };
let voluntasStartQueued = false;
let voluntasReadySent = false;
let voluntasGuestPrompted = false;
let voluntasShownWinner = null;
let voluntasLayoutActive = false;
let voluntasUiReady = false;
let voluntasTimer = null;
let voluntasPreviousLayer = null;
let voluntasPrevious3D = false;
const VOLUNTAS_COST = Object.freeze({ rain: 5, fauna: 8, resource: 12, hurricane: 20, flood: 24, quake: 30, meteor: 45 });
const VOLUNTAS_DISASTER = Object.freeze({ hurricane: true, flood: true, quake: true, meteor: true });
const VOLUNTAS_LABELS = Object.freeze({
  rain: ['Дождь', 'Rain'], fauna: ['Животные', 'Animals'], resource: ['Ресурсы', 'Resources'],
  hurricane: ['Ураган', 'Hurricane'], flood: ['Потоп', 'Flood'],
  quake: ['Землетрясение', 'Earthquake'], meteor: ['Метеорит', 'Meteorite']
});

function voluntasModePending() {
  try { return sessionStorage.getItem(VOLUNTAS_BOOT); }
  catch (error) { return null; }
}

function voluntasNewSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}

function voluntasAddMenuButton() {
  const side = document.querySelector('#main-menu .mm-side');
  const version = side && side.querySelector('.mm-ver');
  if (!version) return;
  const existing = side.querySelector('.voluntas-entry');
  if (existing) { existing.disabled = netLive(); return; }

  const style = document.createElement('style');
  style.textContent = `
    #main-menu .mm-side:has(> .voluntas-entry) {
      box-sizing: border-box;
    }
    #main-menu .mm-side:has(> .voluntas-entry) > .mm-nav {
      min-height: 0;
      overflow-y: auto;
    }
    #main-menu .mm-side:has(> .voluntas-entry) .mm-item {
      flex-shrink: 0;
    }
    #main-menu .voluntas-entry {
      display: block;
      flex: none;
      width: 100%;
      margin: 8px 0 0;
      padding: 10px 16px;
      border: 1px solid #f16f74;
      background: linear-gradient(#b52b35, #73131e);
      color: #fff;
      font: 700 16px/1.2 sans-serif;
      text-align: center;
      cursor: pointer;
    }
    #main-menu .voluntas-entry:hover { background: #c83b45; }
    #main-menu .voluntas-entry:disabled { opacity: .45; cursor: default; }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'voluntas-entry';
  button.textContent = 'Voluntas Devina';
  button.disabled = netLive();
  button.addEventListener('click', voluntasOpenSetup);
  version.after(button);
}

function voluntasStyleDialog(dialog, zIndex = 980) {
  dialog.box.classList.add('vd-dialog');
  dialog.el.style.zIndex = String(zIndex);
}

function voluntasOpenSetup() {
  if (netLive()) return;
  const dialog = UI.win('voluntas-setup', { title: 'Voluntas Devina', width: 480 });
  dialog.body.replaceChildren();
  dialog.foot.replaceChildren();
  const el = VoluntasHUD.el;
  el('p', 'vd-description', dialog.body).textContent = T(
    'В Voluntas Devina два игрока становятся богами соперничающих держав. С началом партии страны уже воюют, а мир заключить нельзя. Копите ману и тратьте её на добродеяния и злодеяния. Помогайте своей стране дождём, животными и ресурсами, обрушивайте бедствия на соперника. Побеждает бог, чья держава выживет. Перед стартом выберите свой игровой аватар.',
    'In Voluntas Devina, two players become gods of rival nations. Both nations start at war and cannot make peace. Earn mana and spend it on deeds. Aid your nation with rain, animals, and resources, or unleash disasters on your rival. The last nation standing wins. Choose your avatar before playing.'
  );
  const seedLabel = el('label', '', dialog.body);
  seedLabel.htmlFor = 'voluntas-seed';
  seedLabel.textContent = T('Зерно', 'Seed');
  const seedRow = el('div', 'vd-setup-row', dialog.body);
  const seedInput = el('input', 'ui-inp', seedRow);
  Object.assign(seedInput, {id:'voluntas-seed', type:'number', min:'1', max:'2147483646', value:String(voluntasNewSeed())});
  const randomSeed = el('button', 'ui-btn', seedRow);
  randomSeed.type = 'button';
  randomSeed.textContent = T('Случайное', 'Random');
  randomSeed.addEventListener('click', () => {
    seedInput.value = String(voluntasNewSeed());
    error.textContent = '';
  });
  seedInput.addEventListener('input', () => { error.textContent = ''; });
  function select(id, name, options) {
    const label = el('label', '', dialog.body);
    label.htmlFor = id;
    label.textContent = name;
    const field = el('select', 'ui-inp', dialog.body);
    field.id = id;
    for (const [value, text] of options) Object.assign(el('option', '', field), {value, textContent:text});
    return field;
  }
  const size = select('voluntas-size', T('Размер', 'Size'), [['80x60','80 × 60'], ['120x90','120 × 90'], ['160x120','160 × 120'], ['220x220','220 × 220']]);
  const terrain = select('voluntas-terrain', T('Рельеф', 'Terrain'), [
    ['continents', T('Континенты', 'Continents')], ['pangea', T('Пангея', 'Pangaea')], ['islands', T('Острова', 'Islands')]
  ]);
  const testLabel = el('label', '', dialog.body);
  const testInput = document.createElement('input');
  testInput.type = 'checkbox';
  testInput.id = 'voluntas-test';
  testLabel.append(testInput, ' ' + T('Тестовая партия против пустышки', 'Test match against a dummy'));
  const avatar = el('button', 'ui-btn', dialog.body);
  avatar.type = 'button';
  avatar.id = 'voluntas-pick-avatar';
  avatar.textContent = T('Выбрать аватар', 'Choose avatar');
  let avatarId = null;
  avatar.addEventListener('click', () => voluntasAvatarDialog(avatarId || localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE), selected => {
    avatarId = selected;
    localStorage.setItem(VOLUNTAS_AVATAR_PREFERENCE, selected);
    avatar.textContent = T('Аватар', 'Avatar') + ' · ' + T(...VOLUNTAS_AVATARS[selected].label);
    error.textContent = '';
    avatar.focus();
  }));
  const error = el('div', '', dialog.body);
  error.id = 'voluntas-error';
  error.setAttribute('role', 'alert');

  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'ui-btn go';
  create.textContent = T('Создать мир', 'Create world');
  create.addEventListener('click', () => {
    const seed = Number(seedInput.value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) {
      error.textContent = T('Введите зерно от 1 до 2147483646', 'Enter a seed from 1 to 2147483646');
      return;
    }
    if (!avatarId) {
      error.textContent = T('Подтвердите аватар перед стартом.', 'Confirm your avatar before starting.');
      avatar.focus();
      return;
    }
    const [w, h] = size.value.split('x').map(Number);
    const type = terrain.value;
    const solo = testInput.checked;
    const room = { o: { name: 'Voluntas Devina', pass: '', max: 2, edit: 'all' }, lan: true, url: '' };
    try {
      sessionStorage.setItem(VOLUNTAS_BOOT, solo ? 'solo' : 'host');
      if (solo) sessionStorage.removeItem('earthsim.netnew');
      else sessionStorage.setItem('earthsim.netnew', JSON.stringify(room));
    } catch (storageError) {
      error.textContent = T('Не удалось подготовить комнату', 'Could not prepare the room');
      return;
    }
    bootNewMap({ w, h, type, seed, settle: 0, disasters: 0 });
  });
  dialog.foot.appendChild(create);
  dialog.show();
  voluntasStyleDialog(dialog);
}

ModAPI.after('showMainMenu', voluntasAddMenuButton, 'Voluntas Devina');

function voluntasInRoom() {
  return typeof NP !== 'undefined' && NP.on && NP.room && NP.room.name === 'Voluntas Devina';
}

function voluntasMode() {
  return !!voluntasModePending() || voluntasInRoom() || (VOLUNTAS.solo && !netLive()) || (NP.on && VOLUNTAS.active);
}

function voluntasLocalPlayer() {
  return VOLUNTAS.players.find(player => player.id === (VOLUNTAS.solo ? 0 : NP.id));
}

function voluntasIncome(nation) {
  return 0.25 + Math.sqrt(Math.max(0, nation.gdp || 0) / 1000000);
}

function voluntasReady(avatar) {
  if (!voluntasInRoom() || VOLUNTAS.active || !NP.exec || !voluntasAvatarValid(avatar)) return;
  VOLUNTAS.ready[NP.exec.from] = avatar;
}

function voluntasChooseGuestAvatar() {
  if (!voluntasInRoom() || NP.isHost || VOLUNTAS.active || NP.waiting || VOLUNTAS.ready[NP.id]) return;
  voluntasAvatarDialog(localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE), avatar => {
    localStorage.setItem(VOLUNTAS_AVATAR_PREFERENCE, avatar);
    netDo('vdReady', avatar);
  });
}

function voluntasToggleView() {
  if (!voluntasMode() || walkActive) return;
  const key = 'earthsim.view3d';
  const ordinaryView = localStorage.getItem(key);
  try {
    toggle3D();
    localStorage.setItem('voluntas.view3d', window.mode3D ? '1' : '0');
  } finally {
    if (ordinaryView === null) localStorage.removeItem(key);
    else localStorage.setItem(key, ordinaryView);
  }
  VoluntasHUD.settings.refresh();
}

function voluntasRender() {
  if (!voluntasUiReady) return;
  if (voluntasLegacyNotice && !NP.on) {
    voluntasLegacyNotice = false;
    uiAlert(T('Для этого сохранения Voluntas Devina нужна прежняя версия дополнения. Начните новую партию для новых правил.',
      'This Voluntas Devina save needs the earlier add-on version. Start a new match to use the new rules.'));
  }
  const enabled = voluntasMode();
  if (enabled && voluntasTimer === null) voluntasTimer = setInterval(voluntasRender, 200);
  if (!enabled && voluntasTimer !== null) {
    clearInterval(voluntasTimer);
    voluntasTimer = null;
  }
  if (enabled && !voluntasLayoutActive) {
    voluntasPreviousLayer = uiState.layer;
    voluntasPrevious3D = !!window.mode3D;
    voluntasLayoutActive = true;
    setTool('inspect');
    setLayer('political');
    const wanted3D = localStorage.getItem('voluntas.view3d') === '1';
    if (wanted3D !== !!window.mode3D) voluntasToggleView();
  }
  if (enabled && !walkActive) {
    VoluntasHUD.controller.start();
    VoluntasHUD.controller.update();
  } else {
    VoluntasHUD.controller.stop();
  }
  if (!enabled && voluntasLayoutActive) {
    voluntasClearFlags();
    voluntasLayoutActive = false;
    if (voluntasPreviousLayer) setLayer(voluntasPreviousLayer);
    voluntasPreviousLayer = null;
    if (voluntasPrevious3D !== !!window.mode3D && set3DMode(voluntasPrevious3D)) {
      const button = document.getElementById('btn-3d');
      button?.classList.toggle('on', voluntasPrevious3D);
      if (button) button.textContent = voluntasPrevious3D ? '2D' : '3D';
      if (!voluntasPrevious3D) { buildBase(); buildBorders(); rUrgent(); }
    }
  }
  if (voluntasInRoom() && !NP.waiting && !VOLUNTAS.active && VOLUNTAS.winner === null) {
    if (NP.isHost) {
      const saved = localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE);
      if (!VOLUNTAS.ready[NP.id] && !voluntasReadySent) {
        voluntasReadySent = true;
        netDo('vdReady', voluntasAvatarValid(saved) ? saved : VOLUNTAS_DEFAULT_AVATAR);
      }
      const players = NP.players.filter(p => p.on).sort((a, b) => a.id - b.id);
      if (players.length === 2 && players.every(p => voluntasAvatarValid(VOLUNTAS.ready[p.id])) && !voluntasStartQueued) {
        voluntasStartQueued = true;
        netDo('vdStart', players.map(p => ({ id: p.id, name: p.name, avatar: VOLUNTAS.ready[p.id] })));
      }
    } else if (!voluntasGuestPrompted && !VOLUNTAS.ready[NP.id]) {
      voluntasGuestPrompted = true;
      voluntasChooseGuestAvatar();
    }
  }
  if (enabled && VOLUNTAS.winner !== null && VOLUNTAS.winner !== voluntasShownWinner) {
    voluntasShownWinner = VOLUNTAS.winner;
    const dialog = UI.win('voluntas-result', { title: 'Voluntas Devina', width: 440 });
    const victor = VOLUNTAS.players.find(p => p.id === VOLUNTAS.winner);
    const name = victor && (victor.name || NP.players.find(p => p.id === victor.id)?.name);
    dialog.body.textContent = !victor
      ? T('Обе державы погибли. Ничья.', 'Both nations fell. Draw.')
      : VOLUNTAS.solo
        ? victor.id === 0 ? T('Победа', 'Victory') : T('Поражение', 'Defeat')
        : T('Победитель: ', 'Winner: ') + (name || String(victor.id));
    dialog.foot.replaceChildren();
    dialog.show();
    voluntasStyleDialog(dialog);
  }
}

function voluntasSelectCapitals() {
  const candidates = [];
  for (let cell = 0; cell < GRID.N; cell++) {
    if (W.isWater[cell] || W.stateId[cell] >= 0 || W.foodCap[cell] < 3000) continue;
    candidates.push(cell);
  }
  candidates.sort((a, b) => W.foodCap[b] - W.foodCap[a] || a - b);
  const first = candidates[0];
  if (first === undefined) return null;
  const x = first % GRID.W, y = Math.floor(first / GRID.W);
  const second = candidates.find(cell => {
    const dx = cell % GRID.W - x, dy = Math.floor(cell / GRID.W) - y;
    return dx * dx + dy * dy >= Math.pow(Math.min(GRID.W, GRID.H) / 3, 2);
  });
  return second === undefined ? null : [first, second];
}

function voluntasCreateMatch(players, solo) {
  const capitals = voluntasSelectCapitals();
  if (!capitals) return false;
  voluntasFounding = true;
  try {
    VOLUNTAS.players = players.map((player, index) => {
      const cell = capitals[index];
      W.pop[cell] = 3000;
      W.urban[cell] = 200;
      const nation = foundStateAt(cell);
      nation.name = player.name;
      nation.pop = W.pop[cell];
      return { id: player.id, name: player.name, uid: nation.uid, mana: 0, avatar: player.avatar };
    });
  } finally {
    voluntasFounding = false;
  }
  VOLUNTAS.active = true;
  VOLUNTAS.solo = solo;
  VOLUNTAS.year = W.simYear;
  VOLUNTAS.winner = null;
  voluntasShownWinner = null;
  voluntasEnsureWar();
  if (solo) { W.paused = false; syncPlayGlyph(); }
  else if (NP.isHost) netSetPaused(false);
  return true;
}

function voluntasStart(players) {
  if (!voluntasInRoom() || VOLUNTAS.active || !Array.isArray(players) || players.length !== 2) return;
  if (!NP.exec || NP.exec.from !== NP.hostId || players[0]?.id === players[1]?.id
      || players.some(p => !Number.isInteger(p?.id) || typeof p.name !== 'string'
        || !voluntasAvatarValid(p.avatar) || p.avatar !== VOLUNTAS.ready[p.id])) return;
  voluntasCreateMatch(players, false);
}

function voluntasTick() {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null) return;
  const elapsed = Math.max(0, W.simYear - VOLUNTAS.year);
  VOLUNTAS.year = W.simYear;
  for (const player of VOLUNTAS.players) {
    const nation = stateByUid(player.uid);
    if (!nation) continue;
    const income = voluntasIncome(nation);
    player.mana = Math.min(100, player.mana + elapsed * income);
  }
  const survivors = VOLUNTAS.players.filter(p => stateByUid(p.uid));
  if (survivors.length < 2) {
    VOLUNTAS.winner = survivors.length ? survivors[0].id : 'draw';
    const war = wars.find(voluntasMatchWar);
    if (war) endWar(war, stateByUid(war.aUid) ? 'a' : stateByUid(war.bUid) ? 'b' : 'collapse');
    if (VOLUNTAS.solo) { W.paused = true; syncPlayGlyph(); }
    else if (NP.isHost) netSetPaused(true);
  }
}

function voluntasReset() {
  VOLUNTAS.active = false;
  VOLUNTAS.solo = false;
  VOLUNTAS.players = [];
  VOLUNTAS.ready = {};
  VOLUNTAS.year = 0;
  VOLUNTAS.winner = null;
  voluntasStartQueued = false;
  voluntasReadySent = false;
  voluntasGuestPrompted = false;
  voluntasShownWinner = null;
}

function voluntasArea(cell) {
  const x = cell % GRID.W, y = Math.floor(cell / GRID.W), cells = [];
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
    if (xx >= 0 && yy >= 0 && xx < GRID.W && yy < GRID.H) cells.push(yy * GRID.W + xx);
  }
  return cells;
}

function voluntasAct(action, cell, choice) {
  const own = !NP.on || NP.exec?.from === NP.id;
  const deny = () => {
    if (own) VoluntasHUD.abilityPanel.message(T('Деяние здесь недоступно.', 'The deed cannot be used here.'));
    return false;
  };
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null || !Number.isInteger(cell)
    || cell < 0 || cell >= GRID.N || !Object.hasOwn(VOLUNTAS_COST, action)) return deny();
  if (VOLUNTAS.solo ? NP.on : !voluntasInRoom() || !NP.exec) return deny();
  const id = VOLUNTAS.solo ? 0 : NP.exec.from;
  const player = VOLUNTAS.players.find(p => p.id === id);
  if (!player || !stateByUid(player.uid) || !Number.isFinite(player.mana)
    || player.mana < VOLUNTAS_COST[action]) return deny();

  const cells = voluntasArea(cell);
  let changed = false;
  if (action === 'rain') {
    if (W.isWater[cell] || !cells.some(i => !W.isWater[i])) return deny();
    changed = godPower('rain', cell, 1.5, 0.2);
  } else if (action === 'fauna') {
    const species = typeof SPECIES !== 'undefined' && SPECIES.find(s => s.key === choice);
    if (!species || typeof faunaSeed !== 'function') return deny();
    const water = !!species._sea;
    const field = species.guild === 'fish' ? W.fish
      : species.guild === 'pred' ? W.pred : species.guild === 'herb' ? W.herb : null;
    for (const i of cells) {
      if (!!W.isWater[i] !== water || (field && field[i] >= 1)) continue;
      if (faunaSeed(i, choice, 0.016) > 0) changed = true;
    }
  } else if (action === 'resource') {
    if (!Number.isInteger(choice) || choice < 1 || choice >= RES.length) return deny();
    for (const i of cells) if (W.res[i] !== choice) { W.res[i] = choice; changed = true; }
    if (changed && typeof resDirty === 'function') resDirty();
  } else if (Object.hasOwn(VOLUNTAS_DISASTER, action)) {
    changed = !!disasterTrigger(action, cell, 0.1, true);
  }
  if (!changed) return deny();
  player.mana -= VOLUNTAS_COST[action];
  if (typeof rLayerDirty === 'function') rLayerDirty();
  if (typeof markDirty === 'function') markDirty('base');
  if (typeof rUrgent === 'function') rUrgent();
  if (own) VoluntasHUD.abilityPanel.message(T(...VOLUNTAS_LABELS[action]) + ' · −' + VOLUNTAS_COST[action] + ' ' + T('маны', 'mana'));
  return true;
}

function voluntasInstallUi() {
  const style = document.createElement('style');
  style.textContent = `
    .vd-dialog { color:#d5e4f7; border:1px solid #4676a8 !important;
      background:linear-gradient(#0d1e36,#060f1d) !important; }
    .vd-dialog .ui-inp, .vd-dialog .ui-btn {
      border-color:#4676a8; background:#142641; color:#d5e4f7; }
    .vd-dialog #voluntas-error { color:#ffb5aa; }
    .vd-dialog #voluntas-error:empty, .vd-avatar-status:empty { display:none; }
    .vd-dialog .vd-description { color:#c6d7ef; margin:0 0 10px; line-height:1.5; }
    #voluntas-setup .ui-body { display:grid; gap:6px; }
    .vd-setup-row { display:flex; gap:8px; }
    .vd-setup-row input { flex:1; min-width:0; }
    .vd-avatar-choices { display:flex; gap:4px; flex-wrap:wrap; }
    .vd-avatar-choices [aria-pressed=true] { border-color:#b6a1df; background:#3c3351; }
    .vd-avatar-canvas { width:100%; height:min(265px,38vh); display:block; touch-action:none; cursor:grab; }
    .vd-avatar-status { margin:4px 0; color:#c6d7ef; }
  `;
  document.head.append(style);
  const pending = voluntasModePending();
  if (pending === 'solo') {
    const saved = localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE);
    if (!netLive() && voluntasCreateMatch([
      { id: 0, name: netPlayerName(), avatar: voluntasAvatarValid(saved) ? saved : VOLUNTAS_DEFAULT_AVATAR },
      { id: -1, name: T('Пустышка', 'Dummy'), avatar: 'mask' }
    ], true)) {
      try { sessionStorage.removeItem(VOLUNTAS_BOOT); } catch (error) {}
    } else {
      sessionStorage.removeItem(VOLUNTAS_BOOT);
      uiAlert(T('Не удалось создать тестовую партию', 'Could not start the test match'));
    }
  } else if (pending === 'host') W.paused = true;
  voluntasUiReady = true;
  window.addEventListener('pagehide', () => clearInterval(voluntasTimer), {once: true});
  voluntasRender();
}

netAct('vdStart', voluntasStart);
netAct('vdReady', voluntasReady);
netAct('vdAct', voluntasAct);
netBag('voluntas', () => VOLUNTAS, value => {
  voluntasRestoreMatch(value);
  voluntasStartQueued = false;
});
netHashAdd('voluntas', () => {
  const state = JSON.stringify([VOLUNTAS.active, VOLUNTAS.solo, VOLUNTAS.players, VOLUNTAS.ready, VOLUNTAS.year, VOLUNTAS.winner]);
  let hash = 2166136261;
  for (let index = 0; index < state.length; index++) hash = Math.imul(hash ^ state.charCodeAt(index), 16777619);
  return hash;
});
ModAPI.on('civTick', voluntasTick);
ModAPI.on('worldgen', voluntasReset);
ModAPI.on('save', save => { if (voluntasMode()) save.ext.voluntas = {...VOLUNTAS, rulesVersion: 1}; });
ModAPI.on('load', save => {
  const state = save && save.ext && save.ext.voluntas;
  voluntasReset();
  if (state && !save.net) {
    voluntasRestoreMatch(state);
    if (VOLUNTAS.active) voluntasEnsureWar();
  }
  if (voluntasUiReady) queueMicrotask(voluntasRender);
});
ModAPI.before('setTool', tool => !voluntasMode() || tool === 'inspect', 'Voluntas Devina');
ModAPI.before('netRunCmd', command => {
  if (!voluntasMode() || !Array.isArray(command)) return true;
  return ['vdReady', 'vdStart', 'vdAct', 'noop'].includes(command[1]);
}, 'Voluntas Devina');
ModAPI.after('_nEnterRoom', () => {
  if (VOLUNTAS.solo && !voluntasInRoom()) voluntasReset();
  queueMicrotask(voluntasRender);
}, 'Voluntas Devina');
ModAPI.after('_nOff', () => {
  try { sessionStorage.removeItem(VOLUNTAS_BOOT); } catch (error) {}
  voluntasReset();
  if (document.getElementById('voluntas-avatar')) UI.win('voluntas-avatar').hide();
  if (document.getElementById('voluntas-result')) UI.win('voluntas-result').hide();
  voluntasRender();
}, 'Voluntas Devina');
ModAPI.started(voluntasInstallUi);
