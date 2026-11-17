// Voluntas Devina mode entry and world creation.
'use strict';

const VOLUNTAS_BOOT = 'voluntas.devina.boot';
const VOLUNTAS = { active: false, solo: false, players: [], year: 0, winner: null };
let voluntasStartQueued = false;
let voluntasShownWinner = null;
let voluntasLayoutActive = false;
let voluntasPreviousLayer = null;
const VOLUNTAS_COST = Object.freeze({ rain: 5, fauna: 8, resource: 12, hurricane: 20, flood: 24, quake: 30, meteor: 45 });
const VOLUNTAS_DISASTER = Object.freeze({ hurricane: true, flood: true, quake: true, meteor: true });
let voluntasSelectedAction = null;
let voluntasPanelOpen = false;
let voluntasTab = 'good';

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

function voluntasOpenSetup() {
  if (netLive()) return;
  const dialog = UI.win('voluntas-setup', { title: 'Voluntas Devina', width: 480 });
  dialog.body.innerHTML = `
    <label for="voluntas-seed">${T('Зерно', 'Seed')}</label>
    <input id="voluntas-seed" class="ui-inp" type="number" min="1" max="2147483646">
    <label for="voluntas-size">${T('Размер', 'Size')}</label>
    <select id="voluntas-size" class="ui-inp">
      <option value="80x60">80 × 60</option>
      <option value="120x90">120 × 90</option>
      <option value="160x120">160 × 120</option>
      <option value="220x220">220 × 220</option>
    </select>
    <label for="voluntas-terrain">${T('Рельеф', 'Terrain')}</label>
    <select id="voluntas-terrain" class="ui-inp">
      <option value="continents">${T('Континенты', 'Continents')}</option>
      <option value="pangea">${T('Пангея', 'Pangaea')}</option>
      <option value="islands">${T('Острова', 'Islands')}</option>
    </select>
    <div id="voluntas-error" role="alert"></div>
  `;
  const seedInput = dialog.body.querySelector('#voluntas-seed');
  const seedRow = document.createElement('div');
  seedRow.style.display = 'flex';
  seedRow.style.gap = '8px';
  seedInput.replaceWith(seedRow);
  seedInput.style.flex = '1';
  seedInput.style.minWidth = '0';
  const randomSeed = document.createElement('button');
  randomSeed.type = 'button';
  randomSeed.className = 'ui-btn';
  randomSeed.textContent = T('Случайное', 'Random');
  randomSeed.addEventListener('click', () => {
    seedInput.value = String(voluntasNewSeed());
    dialog.body.querySelector('#voluntas-error').textContent = '';
  });
  seedInput.addEventListener('input', () => { dialog.body.querySelector('#voluntas-error').textContent = ''; });
  seedRow.append(seedInput, randomSeed);
  seedInput.value = String(voluntasNewSeed());
  const testLabel = document.createElement('label');
  const testInput = document.createElement('input');
  testInput.type = 'checkbox';
  testInput.id = 'voluntas-test';
  testLabel.append(testInput, ' ' + T('Тестовая партия против пустышки', 'Test match against a dummy'));
  dialog.body.querySelector('#voluntas-error').before(testLabel);
  dialog.foot.innerHTML = '';

  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'ui-btn go';
  create.textContent = T('Создать мир', 'Create world');
  create.addEventListener('click', () => {
    const seed = Number(seedInput.value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) {
      dialog.body.querySelector('#voluntas-error').textContent = T('Введите зерно от 1 до 2147483646', 'Enter a seed from 1 to 2147483646');
      return;
    }
    const [w, h] = dialog.body.querySelector('#voluntas-size').value.split('x').map(Number);
    const type = dialog.body.querySelector('#voluntas-terrain').value;
    const solo = testInput.checked;
    const room = { o: { name: 'Voluntas Devina', pass: '', max: 2, edit: 'all' }, lan: true, url: '' };
    try {
      sessionStorage.setItem(VOLUNTAS_BOOT, solo ? 'solo' : 'host');
      if (solo) sessionStorage.removeItem('earthsim.netnew');
      else sessionStorage.setItem('earthsim.netnew', JSON.stringify(room));
    } catch (error) {
      dialog.body.querySelector('#voluntas-error').textContent = T('Не удалось подготовить комнату', 'Could not prepare the room');
      return;
    }
    bootNewMap({ w, h, type, seed, settle: 0, disasters: 0 });
  });
  dialog.foot.appendChild(create);
  dialog.show();
  dialog.el.style.zIndex = '950';
}

ModAPI.after('showMainMenu', voluntasAddMenuButton, 'Voluntas Devina');

function voluntasInRoom() {
  return typeof NP !== 'undefined' && NP.on && NP.room && NP.room.name === 'Voluntas Devina';
}

function voluntasMode() {
  return !!voluntasModePending() || voluntasInRoom() || (VOLUNTAS.solo && !netLive()) || (NP.on && VOLUNTAS.active);
}

function voluntasUse2D() {
  if (!window.mode3D || typeof set3DMode !== 'function') return;
  if (!set3DMode(false)) return;
  const button = document.getElementById('btn-3d');
  if (button) { button.classList.remove('on'); button.textContent = '3D'; }
  if (typeof buildBase === 'function') buildBase();
  if (typeof buildBorders === 'function') buildBorders();
  if (typeof rUrgent === 'function') rUrgent();
}

function voluntasRender() {
  const enabled = voluntasMode();
  document.body.classList.toggle('voluntas-mode', enabled);
  if (enabled) {
    if (!voluntasLayoutActive) {
      voluntasPreviousLayer = uiState.layer;
      setLayer('political');
      voluntasLayoutActive = true;
    }
    voluntasUse2D();
    const coach = document.getElementById('coach');
    if (coach) coach.classList.remove('show');
  } else if (voluntasLayoutActive) {
    voluntasLayoutActive = false;
    if (voluntasPreviousLayer) setLayer(voluntasPreviousLayer);
    voluntasPreviousLayer = null;
    if (typeof view3DStart === 'function') view3DStart();
  }
  const display = document.getElementById('voluntas-mana');
  if (display) {
    const player = VOLUNTAS.players.find(p => p.id === (VOLUNTAS.solo ? 0 : NP.id));
    const amount = player ? player.mana : 0;
    display.querySelector('.voluntas-mana-label').textContent = T('Мана', 'Mana') + ': ';
    display.querySelector('.voluntas-mana-fill').style.width = Math.max(0, Math.min(100, amount)) + '%';
    display.querySelector('.voluntas-mana-value').textContent = amount.toFixed(1);
    const top = document.getElementById('voluntas-mana-top');
    if (top) top.textContent = T('Мана', 'Mana') + ': ' + amount.toFixed(1);
    document.querySelectorAll('#voluntas-actions [data-voluntas-action]').forEach(button => {
      button.disabled = !enabled || !VOLUNTAS.active || VOLUNTAS.winner !== null
        || !player || !stateByUid(player.uid) || amount < VOLUNTAS_COST[button.dataset.voluntasAction];
    });
  }
  if (!enabled && (voluntasPanelOpen || voluntasSelectedAction)) {
    voluntasPanelOpen = false;
    voluntasSelectedAction = null;
    voluntasPanelSync();
  }
  const waiting = document.getElementById('voluntas-wait');
  if (waiting) {
    waiting.hidden = !enabled || VOLUNTAS.active || !voluntasInRoom() || !NP.isHost;
    if (!waiting.hidden) waiting.textContent = T('Ожидание второго игрока', 'Waiting for the second player')
      + ' · ' + (typeof _nuLanAddr === 'function' ? _nuLanAddr() : '');
  }
  if (voluntasInRoom() && NP.isHost && !VOLUNTAS.active && VOLUNTAS.winner === null) {
    const players = NP.players.filter(p => p.on).sort((a, b) => a.id - b.id);
    if (players.length === 2 && !voluntasStartQueued) {
      voluntasStartQueued = true;
      netDo('vdStart', players.map(p => ({ id: p.id, name: p.name })));
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
    dialog.foot.innerHTML = '';
    dialog.show();
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
  VOLUNTAS.players = players.map((player, index) => {
    const cell = capitals[index];
    W.pop[cell] = 3000;
    W.urban[cell] = 200;
    const nation = foundStateAt(cell);
    nation.name = player.name;
    nation.pop = W.pop[cell];
    return { id: player.id, name: player.name, uid: nation.uid, mana: 0 };
  });
  VOLUNTAS.active = true;
  VOLUNTAS.solo = solo;
  VOLUNTAS.year = W.simYear;
  VOLUNTAS.winner = null;
  voluntasShownWinner = null;
  if (solo) { W.paused = false; syncPlayGlyph(); }
  else if (NP.isHost) netSetPaused(false);
  return true;
}

function voluntasStart(players) {
  if (!voluntasInRoom() || VOLUNTAS.active || !Array.isArray(players) || players.length !== 2) return;
  if (!NP.exec || NP.exec.from !== NP.hostId || players[0].id === players[1].id) return;
  voluntasCreateMatch(players, false);
}

function voluntasTick() {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null) return;
  const elapsed = Math.max(0, W.simYear - VOLUNTAS.year);
  VOLUNTAS.year = W.simYear;
  for (const player of VOLUNTAS.players) {
    const nation = stateByUid(player.uid);
    if (!nation) continue;
    const income = 0.25 + Math.sqrt(Math.max(0, nation.gdp) / 1000000);
    player.mana = Math.min(100, player.mana + elapsed * income);
  }
  const survivors = VOLUNTAS.players.filter(p => stateByUid(p.uid));
  if (survivors.length < 2) {
    VOLUNTAS.winner = survivors.length ? survivors[0].id : 'draw';
    if (VOLUNTAS.solo) { W.paused = true; syncPlayGlyph(); }
    else if (NP.isHost) netSetPaused(true);
  }
}

function voluntasReset() {
  VOLUNTAS.active = false;
  VOLUNTAS.solo = false;
  VOLUNTAS.players = [];
  VOLUNTAS.year = 0;
  VOLUNTAS.winner = null;
  voluntasStartQueued = false;
  voluntasShownWinner = null;
  voluntasSelectedAction = null;
  voluntasPanelOpen = false;
  voluntasTab = 'good';
  voluntasPanelSync();
}

function voluntasArea(cell) {
  const x = cell % GRID.W, y = Math.floor(cell / GRID.W), cells = [];
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
    if (xx >= 0 && yy >= 0 && xx < GRID.W && yy < GRID.H) cells.push(yy * GRID.W + xx);
  }
  return cells;
}

function voluntasAct(action, cell, choice) {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null || !Number.isInteger(cell)
    || cell < 0 || cell >= GRID.N || !Object.hasOwn(VOLUNTAS_COST, action)) return;
  if (VOLUNTAS.solo ? NP.on : !voluntasInRoom() || !NP.exec) return;
  const id = VOLUNTAS.solo ? 0 : NP.exec.from;
  const player = VOLUNTAS.players.find(p => p.id === id);
  if (!player || !stateByUid(player.uid) || !Number.isFinite(player.mana)
    || player.mana < VOLUNTAS_COST[action]) return;

  const cells = voluntasArea(cell);
  let changed = false;
  if (action === 'rain') {
    if (W.isWater[cell] || !cells.some(i => !W.isWater[i])) return;
    changed = godPower('rain', cell, 1.5, 0.2);
  } else if (action === 'fauna') {
    const species = typeof SPECIES !== 'undefined' && SPECIES.find(s => s.key === choice);
    if (!species || typeof faunaSeed !== 'function') return;
    const water = !!species._sea;
    const field = species.guild === 'fish' ? W.fish
      : species.guild === 'pred' ? W.pred : species.guild === 'herb' ? W.herb : null;
    for (const i of cells) {
      if (!!W.isWater[i] !== water || (field && field[i] >= 1)) continue;
      if (faunaSeed(i, choice, 0.016) > 0) changed = true;
    }
  } else if (action === 'resource') {
    if (!Number.isInteger(choice) || choice < 1 || choice >= RES.length) return;
    for (const i of cells) if (W.res[i] !== choice) { W.res[i] = choice; changed = true; }
    if (changed && typeof resDirty === 'function') resDirty();
  } else if (Object.hasOwn(VOLUNTAS_DISASTER, action)) {
    changed = !!disasterTrigger(action, cell, 0.1, true);
  }
  if (!changed) return;
  player.mana -= VOLUNTAS_COST[action];
  if (typeof rLayerDirty === 'function') rLayerDirty();
  if (typeof markDirty === 'function') markDirty('base');
  if (typeof rUrgent === 'function') rUrgent();
  if (!NP.on || NP.exec.from === NP.id) {
    const names = {
      rain: ['Дождь', 'Rain'], fauna: ['Животные', 'Animals'], resource: ['Ресурсы', 'Resources'],
      hurricane: ['Ураган', 'Hurricane'], flood: ['Потоп', 'Flood'],
      quake: ['Землетрясение', 'Earthquake'], meteor: ['Метеорит', 'Meteorite']
    };
    const label = T(...names[action]);
    if (typeof flash === 'function') flash(label + ': −' + VOLUNTAS_COST[action] + ' ' + T('маны', 'mana'));
  }
}

function voluntasPanelSync() {
  document.body.classList.toggle('voluntas-panel-open', voluntasPanelOpen);
  const toggle = document.getElementById('voluntas-actions-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(voluntasPanelOpen));
    toggle.textContent = voluntasPanelOpen ? '›' : '‹';
  }
  const good = document.getElementById('voluntas-good');
  const evil = document.getElementById('voluntas-evil');
  if (good) good.hidden = voluntasTab !== 'good';
  if (evil) evil.hidden = voluntasTab !== 'evil';
  document.querySelectorAll('#voluntas-actions [data-voluntas-tab]').forEach(button => {
    button.setAttribute('aria-selected', String(button.dataset.voluntasTab === voluntasTab));
  });
  document.querySelectorAll('#voluntas-actions [data-voluntas-action]').forEach(button => {
    button.classList.toggle('selected', button.dataset.voluntasAction === voluntasSelectedAction);
  });
  const hint = document.getElementById('voluntas-action-hint');
  if (hint) hint.textContent = voluntasSelectedAction
    ? T('Выберите клетку на карте. Размер кисти: 1; сила: 1.', 'Choose a map cell. Brush size: 1; strength: 1.')
    : T('Выберите деяние, затем клетку на карте.', 'Choose an action, then a map cell.');
}

function voluntasInstallActions(stage) {
  const toggle = document.createElement('button');
  toggle.id = 'voluntas-actions-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'voluntas-actions');
  toggle.setAttribute('aria-label', T('Деяния', 'Actions'));
  toggle.addEventListener('click', () => { voluntasPanelOpen = !voluntasPanelOpen; voluntasPanelSync(); });

  const panel = document.createElement('aside');
  panel.id = 'voluntas-actions';
  const tabs = document.createElement('div');
  tabs.className = 'voluntas-tabs';
  tabs.setAttribute('role', 'tablist');
  for (const [key, ru, en] of [['good', 'Благодеяния', 'Benevolence'], ['evil', 'Злодеяния', 'Malevolence']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voluntasTab = key;
    button.setAttribute('role', 'tab');
    button.textContent = T(ru, en);
    button.addEventListener('click', () => {
      voluntasTab = key;
      voluntasSelectedAction = null;
      voluntasPanelSync();
    });
    tabs.appendChild(button);
  }
  panel.appendChild(tabs);
  const good = document.createElement('div');
  good.id = 'voluntas-good';
  for (const [key, ru, en] of [['rain', 'Дождь', 'Rain'], ['fauna', 'Животные', 'Animals'], ['resource', 'Ресурсы', 'Resources']]) {
    const row = document.createElement('div');
    row.className = 'voluntas-action-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voluntasAction = key;
    button.textContent = T(ru, en);
    button.addEventListener('click', () => {
      voluntasSelectedAction = voluntasSelectedAction === key ? null : key;
      voluntasPanelSync();
    });
    const price = document.createElement('small');
    price.textContent = VOLUNTAS_COST[key] + ' ' + T('маны', 'mana');
    row.append(button, price);
    if (key !== 'rain') {
      const select = document.createElement('select');
      select.id = key === 'fauna' ? 'voluntas-fauna-type' : 'voluntas-resource-type';
      select.setAttribute('aria-label', T('Тип', 'Type'));
      if (key === 'fauna') {
        if (typeof SPECIES !== 'undefined') SPECIES.forEach((species, index) => {
          const option = document.createElement('option');
          option.value = species.key;
          option.textContent = faunaName(index);
          select.appendChild(option);
        });
        if (typeof simOn === 'function') simOn('faunaSpecies', index => {
          const species = SPECIES[index];
          if (!species) return;
          const option = Array.from(select.options).find(item => item.value === species.key)
            || document.createElement('option');
          option.value = species.key;
          option.textContent = faunaName(index);
          if (!option.parentNode) select.appendChild(option);
        });
      } else {
        for (let id = 1; id < RES.length; id++) {
          const option = document.createElement('option');
          option.value = String(id);
          option.textContent = resName(id);
          select.appendChild(option);
        }
      }
      row.appendChild(select);
    }
    good.appendChild(row);
  }
  panel.appendChild(good);
  const evil = document.createElement('div');
  evil.id = 'voluntas-evil';
  for (const [key, ru, en] of [
    ['hurricane', 'Ураган', 'Hurricane'], ['flood', 'Потоп', 'Flood'],
    ['quake', 'Землетрясение', 'Earthquake'], ['meteor', 'Метеорит', 'Meteorite']
  ]) {
    const row = document.createElement('div');
    row.className = 'voluntas-action-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voluntasAction = key;
    button.textContent = T(ru, en);
    button.addEventListener('click', () => {
      voluntasSelectedAction = voluntasSelectedAction === key ? null : key;
      voluntasPanelSync();
    });
    const price = document.createElement('small');
    price.textContent = VOLUNTAS_COST[key] + ' ' + T('маны', 'mana');
    row.append(button, price);
    evil.appendChild(row);
  }
  panel.appendChild(evil);
  const hint = document.createElement('p');
  hint.id = 'voluntas-action-hint';
  panel.appendChild(hint);
  stage.append(toggle, panel);
  voluntasPanelSync();

  document.getElementById('worldCanvas').addEventListener('pointerdown', event => {
    if (!voluntasMode() || !voluntasSelectedAction || event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!VOLUNTAS.active || VOLUNTAS.winner !== null) return;
    const player = VOLUNTAS.players.find(p => p.id === (VOLUNTAS.solo ? 0 : NP.id));
    const cost = VOLUNTAS_COST[voluntasSelectedAction];
    if (!player || player.mana < cost) {
      if (typeof flash === 'function') flash(T('Недостаточно маны', 'Not enough mana'));
      return;
    }
    const canvas = event.currentTarget;
    const cell = cellAt(event.clientX, event.clientY, canvas.getBoundingClientRect()).i;
    const choice = voluntasSelectedAction === 'fauna'
      ? document.getElementById('voluntas-fauna-type').value
      : voluntasSelectedAction === 'resource'
        ? Number(document.getElementById('voluntas-resource-type').value) : null;
    netDo('vdAct', voluntasSelectedAction, cell, choice);
  }, true);
}

function voluntasInstallUi() {
  const style = document.createElement('style');
  style.textContent = `
    body.voluntas-mode #game-shell { grid-template-columns: 1fr; grid-template-areas: "hud" "stage" "legend"; }
    body.voluntas-mode #brand, body.voluntas-mode #tools-col, body.voluntas-mode #inspector,
    body.voluntas-mode #goals-dock, body.voluntas-mode #net-dock,
    body.voluntas-mode #stage-hint, body.voluntas-mode #hint3d { display: none !important; }
    body.voluntas-mode #btn-step, body.voluntas-mode #btn-search,
    body.voluntas-mode #btn-3d { display: none !important; }
    body.voluntas-mode #tut-offer { display: none !important; }
    #voluntas-brand { display: none; flex: none; color: #f4c87c;
      font: 700 15px sans-serif; white-space: nowrap; }
    body.voluntas-mode #voluntas-brand { display: block; }
    #voluntas-mana-top { display: none; flex: none; color: #f4c87c;
      font: 700 13px sans-serif; white-space: nowrap; }
    body.voluntas-mode #voluntas-mana-top { display: block; }
    #voluntas-mana { display: none; position: absolute; left: 50%; bottom: 12px;
      transform: translateX(-50%); width: min(300px, calc(100% - 24px));
      padding: 9px 14px; color: #fff; background: rgba(12, 29, 54, .94);
      border: 1px solid #d5a75c; box-shadow: 0 8px 22px rgba(0, 0, 0, .45);
      z-index: 5; font: 700 16px sans-serif; pointer-events: none; text-align: center; }
    body.voluntas-mode #voluntas-mana { display: block; }
    #voluntas-mana-track { height: 5px; margin-bottom: 6px; background: #203859; }
    .voluntas-mana-fill { display: block; height: 100%; background: #e7b65d; }
    #voluntas-wait { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      padding: 18px 24px; background: #172b48; color: #fff; z-index: 6; }
    #voluntas-wait[hidden] { display: none; }
    #voluntas-actions-toggle, #voluntas-actions { display: none; }
    body.voluntas-mode #voluntas-actions-toggle { display: block; position: absolute;
      top: 50%; right: 0; transform: translateY(-50%); z-index: 9; width: 35px;
      height: 86px; background: #172b48; color: #fff; border: 1px solid #d5a75c;
      font: 700 28px sans-serif; cursor: pointer; }
    body.voluntas-mode.voluntas-panel-open #voluntas-actions-toggle { right: min(286px, calc(100% - 45px)); }
    body.voluntas-mode #voluntas-actions { display: block; position: absolute;
      top: 0; bottom: 0; right: 0; z-index: 8; box-sizing: border-box;
      width: min(286px, calc(100% - 45px)); padding: 12px; overflow-y: auto;
      background: rgba(12, 29, 54, .97); color: #fff; border-left: 1px solid #d5a75c;
      transform: translateX(100%); }
    body.voluntas-mode.voluntas-panel-open #voluntas-actions { transform: translateX(0); }
    .voluntas-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .voluntas-tabs button { flex: 1; padding: 9px 4px; color: #d7e4f5;
      background: #203859; border: 1px solid #4d6382; cursor: pointer; }
    .voluntas-tabs button[aria-selected="true"] { color: #fff; border-color: #d5a75c; background: #315b83; }
    .voluntas-action-row { display: grid; gap: 5px; margin-bottom: 12px; }
    .voluntas-action-row button { padding: 10px; color: #fff; background: #254c72;
      border: 1px solid #6683a5; cursor: pointer; text-align: left; }
    .voluntas-action-row button.selected { border-color: #d5a75c; background: #346d8b; }
    .voluntas-action-row button:disabled { opacity: .5; cursor: default; }
    .voluntas-action-row small { color: #f4c87c; }
    .voluntas-action-row select { width: 100%; min-width: 0; padding: 6px;
      color: #fff; background: #172b48; border: 1px solid #6683a5; }
    #voluntas-action-hint, #voluntas-evil { font: 12px/1.4 sans-serif; color: #c8d9ee; }
    #voluntas-good[hidden], #voluntas-evil[hidden] { display: none; }
  `;
  document.head.appendChild(style);
  const brand = document.createElement('div');
  brand.id = 'voluntas-brand';
  brand.textContent = 'Voluntas Devina';
  document.getElementById('clock').before(brand);
  const topMana = document.createElement('div');
  topMana.id = 'voluntas-mana-top';
  document.getElementById('clock').after(topMana);
  const stage = document.getElementById('stage');
  const mana = document.createElement('div');
  mana.id = 'voluntas-mana';
  const track = document.createElement('div');
  track.id = 'voluntas-mana-track';
  const fill = document.createElement('span');
  fill.className = 'voluntas-mana-fill';
  track.appendChild(fill);
  const label = document.createElement('span');
  label.className = 'voluntas-mana-label';
  const value = document.createElement('span');
  value.className = 'voluntas-mana-value';
  mana.append(track, label, value);
  stage.appendChild(mana);
  const waiting = document.createElement('div');
  waiting.id = 'voluntas-wait';
  waiting.hidden = true;
  stage.appendChild(waiting);
  voluntasInstallActions(stage);
  window.addEventListener('keydown', event => {
    if (!voluntasMode() || event.key === 'Escape' || event.key === 'F2') return;
    const menu = document.getElementById('main-menu');
    if (menu && menu.classList.contains('show')) return;
    if (event.target instanceof Element && event.target.closest('#voluntas-actions')) {
      event.stopImmediatePropagation();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  const pending = voluntasModePending();
  if (pending === 'solo') {
    if (!netLive() && voluntasCreateMatch([
      { id: 0, name: netPlayerName() },
      { id: -1, name: T('Пустышка', 'Dummy') }
    ], true)) {
      try { sessionStorage.removeItem(VOLUNTAS_BOOT); } catch (error) {}
    } else {
      uiAlert(T('Не удалось создать тестовую партию', 'Could not start the test match'));
    }
  } else if (pending === 'host') W.paused = true;
  setInterval(voluntasRender, 250);
  voluntasRender();
}

netAct('vdStart', voluntasStart);
netAct('vdAct', voluntasAct);
netBag('voluntas', () => VOLUNTAS, value => {
  VOLUNTAS.active = !!value.active;
  VOLUNTAS.solo = !!value.solo;
  VOLUNTAS.players = value.players || [];
  VOLUNTAS.year = value.year || 0;
  VOLUNTAS.winner = value.winner === undefined ? null : value.winner;
  voluntasStartQueued = false;
});
netHashAdd('voluntas', () => {
  const state = JSON.stringify([VOLUNTAS.active, VOLUNTAS.solo, VOLUNTAS.players, VOLUNTAS.year, VOLUNTAS.winner]);
  let hash = 2166136261;
  for (let index = 0; index < state.length; index++) hash = Math.imul(hash ^ state.charCodeAt(index), 16777619);
  return hash;
});
ModAPI.on('civTick', voluntasTick);
ModAPI.on('worldgen', voluntasReset);
ModAPI.on('save', save => { save.ext.voluntas = { active: VOLUNTAS.active, solo: VOLUNTAS.solo, players: VOLUNTAS.players, year: VOLUNTAS.year, winner: VOLUNTAS.winner }; });
ModAPI.on('load', save => {
  const state = save && save.ext && save.ext.voluntas;
  if (!state) { voluntasReset(); return; }
  VOLUNTAS.active = !!state.active;
  VOLUNTAS.solo = !!state.solo;
  VOLUNTAS.players = Array.isArray(state.players) ? state.players : [];
  VOLUNTAS.year = Number(state.year) || 0;
  VOLUNTAS.winner = state.winner === undefined ? null : state.winner;
});
ModAPI.before('setTool', tool => !voluntasMode() || tool === 'inspect', 'Voluntas Devina');
ModAPI.before('view3DStart', () => !voluntasMode(), 'Voluntas Devina');
ModAPI.before('toggle3D', () => !voluntasMode(), 'Voluntas Devina');
ModAPI.before('netRunCmd', command => {
  if (!voluntasMode() || !Array.isArray(command)) return true;
  return command[1] === 'vdStart' || command[1] === 'vdAct' || command[1] === 'noop';
}, 'Voluntas Devina');
ModAPI.after('_nEnterRoom', () => {
  if (VOLUNTAS.solo && !voluntasInRoom()) {
    voluntasReset();
    voluntasRender();
  }
}, 'Voluntas Devina');
ModAPI.after('_nOff', () => {
  try { sessionStorage.removeItem(VOLUNTAS_BOOT); } catch (error) {}
  voluntasReset();
  if (document.getElementById('voluntas-result')) UI.win('voluntas-result').hide();
  voluntasRender();
}, 'Voluntas Devina');
ModAPI.started(voluntasInstallUi);
