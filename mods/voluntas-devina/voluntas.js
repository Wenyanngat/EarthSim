// Voluntas Devina mode entry and world creation.
'use strict';

const VOLUNTAS_BOOT = 'voluntas.devina.boot';
const VOLUNTAS = {
  active: false, solo: false, players: [], ready: {}, year: 0, winner: null, matchId: null, confirmedWinner: null,
  orders: {}
};
let voluntasStartQueued = false;
let voluntasReadySent = false;
let voluntasGuestPrompted = false;
let voluntasShownWinner = null;
let voluntasResultRetryAt = 0;
let voluntasLayoutActive = false;
let voluntasUiReady = false;
let voluntasTimer = null;
let voluntasSetupRetry = null;
let voluntasPreviousLayer = null;
let voluntasPrevious3D = false;
const VOLUNTAS_SMALL_MAP = {
  25: { scale: 0.55, relief: 0.64 },
  40: { scale: 0.625, relief: 0.81 },
  60: { scale: 0.9375, relief: 1 }
};

function voluntasModePending() {
  try { return sessionStorage.getItem(VOLUNTAS_BOOT); }
  catch (error) { return null; }
}

function voluntasNewSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}

function voluntasTerrainTuning(type, seed) {
  if (voluntasUiReady || !_boot?.voluntasMatch || _boot.mode !== 'new' ||
      _boot.type !== type || _boot.seed !== seed || GRID.W !== GRID.H) return null;
  return VOLUNTAS_SMALL_MAP[GRID.W] || null;
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
  button.addEventListener('click', () => voluntasOpenSetup());
  version.after(button);
}

function voluntasStyleDialog(dialog, zIndex = 980) {
  dialog.box.classList.add('vd-dialog');
  dialog.el.style.zIndex = String(zIndex);
}

function voluntasBootMatch(size, type, seed, solo) {
  const [w, h] = size.split('x').map(Number);
  const room = { o: { name: 'Voluntas Devina', pass: '', max: 2, edit: 'all' }, lan: true, url: '' };
  try {
    if (solo) sessionStorage.removeItem('earthsim.netnew');
    else sessionStorage.setItem('earthsim.netnew', JSON.stringify(room));
    sessionStorage.setItem(VOLUNTAS_BOOT, solo ? 'solo' : 'host');
  } catch (storageError) {
    try { sessionStorage.removeItem('earthsim.netnew'); } catch (cleanupError) {}
    return false;
  }
  bootNewMap({ w, h, type, seed, settle: 0, disasters: 0, voluntasMatch: true });
  return true;
}

ModAPI.after('showMainMenu', voluntasAddMenuButton, 'Voluntas Devina');
ModAPI.before('netUiAfterBoot', () => {
  const pending = voluntasModePending();
  if (!pending || !_boot?.voluntasMatch || _boot.mode !== 'new') return;
  if (worldSeed === _boot.seed && voluntasSelectCapitals()) return;
  voluntasSetupRetry = { size: _boot.w + 'x' + _boot.h, terrain: _boot.type, seed: _boot.seed, solo: pending === 'solo' };
  sessionStorage.removeItem(VOLUNTAS_BOOT);
  sessionStorage.removeItem('earthsim.netnew');
  W.paused = true;
  syncPlayGlyph();
  return false;
}, 'Voluntas Devina');

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

function voluntasReady(avatar, nickname) {
  if (!voluntasInRoom() || VOLUNTAS.active || !NP.exec || !voluntasAvatarValid(avatar)) return;
  const id = NP.exec.from;
  const name = voluntasCleanNickname(nickname);
  if (!Number.isInteger(id) || id < 0 || !name || VOLUNTAS.ready[id]?.avatar) return;
  VOLUNTAS.ready[id] = {avatar, name};
}

function voluntasChooseGuestAvatar() {
  if (!voluntasInRoom() || NP.isHost || VOLUNTAS.active || NP.waiting || VOLUNTAS.ready[NP.id]?.avatar) return;
  voluntasAvatarDialog(localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE), avatar => {
    localStorage.setItem(VOLUNTAS_AVATAR_PREFERENCE, avatar);
    netDo('vdReady', avatar, voluntasPlayerName());
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
  const inRoom = voluntasInRoom();
  if (inRoom && !NP.waiting && VOLUNTAS.matchId) {
    if (NP.isHost && VOLUNTAS.winner !== null && VOLUNTAS.confirmedWinner === null &&
        performance.now() >= voluntasResultRetryAt) {
      voluntasResultRetryAt = performance.now() + 1000;
      netDo('vdResult', VOLUNTAS.matchId, VOLUNTAS.winner);
    }
    voluntasRecordResult();
  }
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
  if (inRoom && !NP.waiting && !VOLUNTAS.active && VOLUNTAS.winner === null) {
    if (NP.isHost) {
      const saved = localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE);
      if (!VOLUNTAS.ready[NP.id]?.avatar && !voluntasReadySent) {
        voluntasReadySent = true;
        netDo('vdReady', voluntasAvatarValid(saved) ? saved : VOLUNTAS_DEFAULT_AVATAR, voluntasPlayerName());
      }
      const ids = NP.players.filter(p => p.on).map(p => p.id).sort((a, b) => a - b);
      if (ids.length === 2 && ids.every(id => VOLUNTAS.ready[id]?.avatar) && !voluntasStartQueued) {
        const matchId = require('node:crypto').randomUUID();
        voluntasStartQueued = true;
        netDo('vdStart', ids, matchId);
      }
    } else if (!voluntasGuestPrompted && !VOLUNTAS.ready[NP.id]?.avatar) {
      voluntasGuestPrompted = true;
      voluntasChooseGuestAvatar();
    }
  }
  const result = inRoom && VOLUNTAS.matchId ? VOLUNTAS.confirmedWinner : VOLUNTAS.winner;
  if (enabled && !NP.waiting && result !== null && result !== voluntasShownWinner) {
    voluntasShownWinner = result;
    const dialog = UI.win('voluntas-result', { title: 'Voluntas Devina', width: 440 });
    const victor = VOLUNTAS.players.find(p => p.id === result);
    const name = victor && (victor.name || NP.players.find(p => p.id === victor.id)?.name);
    dialog.body.textContent = !victor
      ? T('Обе державы погибли. Ничья.', 'Both nations fell. Draw.')
      : VOLUNTAS.solo
        ? victor.id === 0 ? T('Победа', 'Victory') : T('Поражение', 'Defeat')
        : T('Победитель: ', 'Winner: ') + (name || String(victor.id));
    dialog.foot.replaceChildren();
    if (inRoom && voluntasLocalPlayer()) {
      VoluntasHUD.el('span', 'ui-muted', dialog.foot).textContent = voluntasResultText();
    }
    dialog.show();
    voluntasStyleDialog(dialog);
  }
}

function voluntasSelectCapitals() {
  const candidates = [];
  for (let cell = 0; cell < GRID.N; cell++) {
    if (W.isWater[cell] || W.stateId[cell] >= 0 || !(W.foodCap[cell] >= 3000)) continue;
    candidates.push(cell);
  }
  candidates.sort((a, b) => W.foodCap[b] - W.foodCap[a] || a - b);
  const minDistanceSquared = (Math.min(GRID.W, GRID.H) / 3) ** 2;
  for (let i = 0; i < candidates.length - 1; i++) {
    const first = candidates[i];
    const x = first % GRID.W, y = Math.floor(first / GRID.W);
    for (let j = i + 1; j < candidates.length; j++) {
      const second = candidates[j];
      const dx = second % GRID.W - x, dy = Math.floor(second / GRID.W) - y;
      if (dx * dx + dy * dy >= minDistanceSquared) return [first, second];
    }
  }
  return null;
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

function voluntasStart(ids, matchId) {
  if (!voluntasInRoom() || VOLUNTAS.active || NP.exec?.from !== NP.hostId ||
      typeof matchId !== 'string' || !VOLUNTAS_MATCH_ID.test(matchId)) return;
  if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1] ||
      ids.some(id => !Number.isInteger(id) || !voluntasAvatarValid(VOLUNTAS.ready[id]?.avatar))) return;
  if (voluntasCreateMatch(ids.map(id => ({id, ...VOLUNTAS.ready[id]})), false)) VOLUNTAS.matchId = matchId;
}

function voluntasTick() {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null) return;
  const elapsed = Math.max(0, W.simYear - VOLUNTAS.year);
  VOLUNTAS.year = W.simYear;
  for (const player of VOLUNTAS.players) {
    const nation = stateByUid(player.uid);
    if (!nation) continue;
    const income = voluntasIncome(nation);
    player.mana = Math.min(VOLUNTAS_MANA_CAP, player.mana + elapsed * income);
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

function voluntasConfirmResult(matchId, winner) {
  if (!voluntasInRoom() || NP.exec?.from !== NP.hostId || !VOLUNTAS.active || VOLUNTAS.solo ||
      !VOLUNTAS.matchId || matchId !== VOLUNTAS.matchId || VOLUNTAS.confirmedWinner !== null) return;
  if (winner !== 'draw' && !VOLUNTAS.players.some(player => player.id === winner)) return;
  VOLUNTAS.confirmedWinner = winner;
}

function voluntasReset() {
  VOLUNTAS.active = false;
  VOLUNTAS.solo = false;
  VOLUNTAS.players = [];
  VOLUNTAS.ready = {};
  VOLUNTAS.year = 0;
  VOLUNTAS.winner = null;
  VOLUNTAS.matchId = null;
  VOLUNTAS.confirmedWinner = null;
  VOLUNTAS.orders = {};
  voluntasStartQueued = false;
  voluntasReadySent = false;
  voluntasGuestPrompted = false;
  voluntasShownWinner = null;
  voluntasResultRetryAt = 0;
}

function voluntasInstallUi() {
  const style = document.createElement('style');
  style.textContent = `
    .vd-dialog { color:#d5e4f7; border:1px solid #4676a8 !important;
      background:linear-gradient(#0d1e36,#060f1d) !important; }
    .vd-dialog .ui-inp, .vd-dialog .ui-btn {
      border-color:#4676a8; background:#142641; color:#d5e4f7; }
    .vd-avatar-status:empty { display:none; }
    .vd-avatar-choices { display:flex; gap:4px; flex-wrap:wrap; }
    .vd-avatar-choices [aria-pressed=true] { border-color:#b6a1df; background:#3c3351; }
    .vd-avatar-canvas { width:100%; height:min(265px,38vh); display:block; touch-action:none; cursor:grab; }
    .vd-avatar-status { margin:4px 0; color:#c6d7ef; }
  `;
  document.head.append(style);
  voluntasInstallMenuStyle();
  const pending = voluntasModePending();
  if (pending === 'solo') {
    const saved = localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE);
    if (!netLive() && voluntasCreateMatch([
      { id: 0, name: voluntasPlayerName(), avatar: voluntasAvatarValid(saved) ? saved : VOLUNTAS_DEFAULT_AVATAR },
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
  if (voluntasSetupRetry) {
    showMainMenu();
    voluntasOpenSetup(voluntasSetupRetry);
    voluntasSetupRetry = null;
  }
}

netAct('vdStart', voluntasStart);
netAct('vdReady', voluntasReady);
netAct('vdAct', voluntasAct);
netAct('vdResult', voluntasConfirmResult);
netBag('voluntas', () => VOLUNTAS, value => {
  voluntasRestoreMatch(value);
  voluntasStartQueued = false;
});
netHashAdd('voluntas', () => {
  const state = JSON.stringify(VOLUNTAS);
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
  return ['vdReady', 'vdStart', 'vdAct', 'vdOrder', 'vdResult', 'noop'].includes(command[1]);
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
