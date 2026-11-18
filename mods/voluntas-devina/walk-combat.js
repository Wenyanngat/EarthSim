(function () {
  'use strict';

  const hp = 1000;
  const exitTime = 20000;
  const returnTime = 60000;
  const lightningTime = 60000;
  const lightningRange = 12;
  const lightningDamage = 300;
  const owner = 'Voluntas Devina';
  const lightning = 'h:vd_lightning';
  let seats = {};
  let report = null;
  let cast = null;
  let receivingLightning = false;
  let normalHP = null;
  let walkStatus = null;
  let exitQueued = false;

  function available() {
    return VOLUNTAS.active && voluntasMode() && VOLUNTAS.winner === null && VOLUNTAS.confirmedWinner === null;
  }

  function localId() { return voluntasLocalPlayer()?.id; }
  function inWalk() { return normalHP !== null; }
  function now() { return NP.on ? Math.round(netRoomSec() * 1000) : Date.now(); }
  function commandTime() { return Math.round((netStepSec() ?? netRoomSec()) * 1000); }
  function validSeat(id) { return VOLUNTAS.players.some(player => player.id === id && id >= 0); }

  function localReport() {
    return report && report.match === VOLUNTAS.matchId && report.id === localId() ? report : null;
  }

  function returnSeconds() {
    if (!available()) return 0;
    const pending = localReport();
    const deadline = Math.max(seats[localId()]?.downUntil || 0, pending?.dead ? pending.at + returnTime : 0);
    return Math.max(0, Math.ceil((deadline - now()) / 1000));
  }

  function exitSeconds() {
    const deadline = Math.max(seats[localId()]?.exitUntil || 0, (localReport()?.at || -exitTime) + exitTime);
    return Math.max(0, Math.ceil((deadline - now()) / 1000));
  }

  function commandBlocked(id) {
    return NP.on ? (seats[id]?.downUntil || 0) > commandTime() : returnSeconds() > 0;
  }

  function orderCommands(commands) {
    if (!voluntasMode() || !commands.some(command => command?.[1] === 'vdWalkReport')) return commands;
    // A death applies before a map action queued for the same room turn.
    const reports = [], actions = [];
    for (const command of commands) (command?.[1] === 'vdWalkReport' ? reports : actions).push(command);
    return reports.concat(actions);
  }

  function applyReport(id, at, dead, stamp) {
    if (!available() || !validSeat(id) || !Number.isSafeInteger(at) || at < 0 || at > stamp + 3000 || typeof dead !== 'boolean') return;
    const seat = seats[id] || (seats[id] = {});
    if (at <= (seat.reportAt ?? -1)) return;
    seat.reportAt = at;
    const time = Math.min(at, stamp);
    seat.exitUntil = time + exitTime;
    if (dead) seat.downUntil = time + returnTime;
  }

  function damage(dead = false) {
    if (!available() || !inWalk()) return;
    const id = localId();
    const at = Math.max(now(), (seats[id]?.reportAt ?? -1) + 1, (localReport()?.at ?? -1) + 1);
    if (NP.on) {
      report = {match: VOLUNTAS.matchId, id, at, dead, sent: -Infinity};
      sendReport();
    } else applyReport(id, at, dead, at);
    if (dead) finishWalk();
    else updateWalkStatus();
  }

  function sendReport() {
    const pending = localReport();
    if (!pending || NP.waiting || NP.ws?.readyState !== 1) return;
    if ((seats[pending.id]?.reportAt ?? -1) >= pending.at) { report = null; return; }
    const wall = performance.now();
    if (wall - pending.sent < 400) return;
    pending.sent = wall;
    netDo('vdWalkReport', pending.at, pending.dead);
  }

  // Damage can arrive in the middle of a Walk frame or a network callback.
  function finishWalk() {
    if (!inWalk() || exitQueued) return;
    exitQueued = true;
    queueMicrotask(() => {
      exitQueued = false;
      if (inWalk()) walkExit();
    });
  }

  function canLeave() {
    if (!inWalk() || !available() || !WK.pl || WK.pl.dead || !exitSeconds()) return true;
    const seconds = exitSeconds();
    const text = TF('До выхода на карту: {0} с', 'Back to the map in {0} s', seconds);
    if (WK.ui.open) flash(text);
    wkMsg(text, 'war');
    return false;
  }

  function cooldown() {
    return Math.max(0, Math.ceil(((seats[localId()]?.lightningUntil || 0) - now()) / 1000));
  }

  function updateWalkStatus() {
    if (!walkStatus) return;
    const seconds = exitSeconds();
    const charge = cooldown();
    const skill = charge ? TF('Молния: {0} с', 'Lightning: {0} s', charge) : T('Q · Молния', 'Q · Lightning');
    const lock = seconds ? TF('До выхода на карту: {0} с', 'Back to the map in {0} s', seconds) : '';
    const text = lock ? skill + '  ·  ' + lock : skill;
    if (walkStatus.textContent !== text) walkStatus.textContent = text;
  }

  function update() {
    if (!available()) { if (VOLUNTAS.active) finishWalk(); return; }
    if (NP.on) sendReport();
    if (returnSeconds()) finishWalk();
    updateWalkStatus();
  }

  function ray(player) {
    const {x, y, z} = wkAimOrigin();
    const cp = Math.cos(player.pitch);
    const dx = -Math.sin(player.yaw) * cp, dy = Math.sin(player.pitch), dz = -Math.cos(player.yaw) * cp;
    const wall = wkRayCols(x, y, z, dx, dy, dz, lightningRange);
    const ground = wkRayGround(x, y, z, dx, dy, dz, lightningRange);
    const limit = Math.min(lightningRange, wall < 0 ? Infinity : wall, ground < 0 ? Infinity : ground);
    const hit = waRayActors(x, y, z, dx, dy, dz, limit);
    const target = hit.a;
    return {target, origin: [x, y, z], end: [x + dx * hit.t, y + dy * hit.t, z + dz * hit.t]};
  }

  function castEffect(shot) {
    const {target, origin, end} = shot;
    const points = [origin];
    for (let i = 1; i < 5; i++) {
      points.push(origin.map((value, axis) => value + (end[axis] - value) * i / 5 + (Math.random() - .5) * .38));
    }
    points.push(end);
    for (let i = 1; i < points.length; i++) waTrace(...points[i - 1], ...points[i], .045, .55, .85, 1, .26);
    wkSfx('shot', {kind: 'laser', vol: .75});
    if (!target || target.dead || target.vanish) return;
    waHitMark();
    if (target.kind === 'netpeer' || target.nwk) return;
    if (target.veh) waVehHit(target, lightningDamage, 'player', 'shot', ...end);
    else if (target.machine) waMachineHit(target, lightningDamage, 'player', 'shot');
    else waDamage(target, lightningDamage, 'player', 0);
  }

  function castLightning() {
    const player = WK.pl;
    if (!available() || !inWalk() || !WK.ready || WK.paused || !player || player.dead || player.swim || player.veh || WA.meCarry) return;
    if (cooldown()) { wkMsg(TF('Молния: {0} с', 'Lightning: {0} s', cooldown())); return; }
    if (NP.on && (NP.waiting || NP.ws?.readyState !== 1 || (cast && now() - cast.at < 2500))) return;
    const shot = ray(player);
    if (!NP.on) {
      const seat = seats[localId()] || (seats[localId()] = {});
      seat.lightningUntil = now() + lightningTime;
      castEffect(shot);
      updateWalkStatus();
      return;
    }
    cast = {shot, player, at: now()};
    const actor = shot.target;
    const target = actor?.kind === 'netpeer' ? actor.peer : actor?.nwk || null;
    _nuWalkNow(performance.now());
    netDoFree('vdLightning', cast.at, target);
  }

  function checkedLightning(src, stamp, target) {
    return available() && validSeat(src) && Number.isSafeInteger(stamp) && stamp >= 0 &&
      (target === null || (target !== src && validSeat(target)) || (typeof target === 'string' && /^[\w:-]{1,24}$/.test(target))) &&
      netUiWalking(src) && !_nuW.get(src)?.dd && !_nuW.get(src)?.vk;
  }

  function lightningCommand(at, target) {
    const from = NP.exec?.from;
    const stamp = commandTime();
    if (!available() || !validSeat(from) || commandBlocked(from) || !Number.isSafeInteger(at) || Math.abs(stamp - at) > 3000) return;
    const seat = seats[from] || (seats[from] = {});
    if (seat.lightningUntil > stamp) return;
    seat.lightningUntil = stamp + lightningTime;
    const player = WK.pl;
    const match = VOLUNTAS.matchId;
    queueMicrotask(() => {
      if (!available() || VOLUNTAS.matchId !== match || !inWalk() || !player || player !== WK.pl || player.dead || Math.abs(now() - stamp) > 3000) return;
      if (from === NP.id) {
        if (cast?.at !== at || cast.player !== player) return;
        const {shot} = cast;
        cast = null;
        castEffect(shot);
        return;
      }
      const hit = {w: lightning, k: 'shot', dmg: lightningDamage, n: 1};
      receivingLightning = true;
      try {
        if (target === NP.id) nwOnPvp(from, hit);
        else if (typeof target === 'string') nwOnHit(from, {...hit, k: target, t: 'h'});
      } finally { receivingLightning = false; }
    });
  }

  function validateHit(original, from, hit, x, y, z, vehicle, self, key) {
    if (!inWalk()) return original(from, hit, x, y, z, vehicle, self, key);
    if (!available() || !validSeat(from) || commandBlocked(from)) return 0;
    if (hit.w === 'h:fist') return original(from, hit, x, y, z, vehicle, self, key);
    if (hit.w !== lightning || !receivingLightning || vehicle) return 0;
    const peer = _nuW.get(from);
    if (!peer || peer.dd || peer.vk || !netUiWalking(from)) return 0;
    const eye = nwPeerY(peer) + lerp(WALK.EYE, WALK.EYE_CROUCH, peer.cr || 0);
    const aim = y + 1.1;
    if (Math.hypot(peer.x - x, eye - aim, peer.z - z) > lightningRange || !wkLos(peer.x, eye, peer.z, x, aim, z)) return 0;
    return lightningDamage;
  }

  function restrictGear() {
    if (!inWalk() || !WK.pl || !WA.wpns.length || WA.wpns.every(key => key === 'fist' || WA_WPN[key]?.type === 'use')) return;
    const previous = WA.wpns[WA.wi];
    WA.wpns = WA.wpns.filter(key => key === 'fist' || WA_WPN[key]?.type === 'use');
    if (!WA.wpns.includes('fist')) WA.wpns.unshift('fist');
    WA.wi = Math.max(0, WA.wpns.indexOf(previous));
    WA.reload = 0;
    waVmSet();
    WK.ui.tHud = 0;
  }

  function restore(value) {
    seats = {};
    for (const {id} of VOLUNTAS.players) {
      if (id < 0 || !value?.[id]) continue;
      const seat = seats[id] = {};
      for (const field of ['reportAt', 'exitUntil', 'downUntil', 'lightningUntil']) {
        const tick = value[id][field];
        if (Number.isSafeInteger(tick) && tick >= 0) seat[field] = tick;
      }
    }
  }

  window.VoluntasCombat = {
    commandBlocked, orderCommands, returnSeconds, update,
    recoverHost: () => voluntasInRoom() && VOLUNTAS.active
  };
  netBag('vdWalk', () => seats, restore);
  netAct('vdWalkReport', (at, dead) => applyReport(NP.exec?.from, at, dead, commandTime()));
  netFree('vdLightning', lightningCommand, (from, [at, target]) => checkedLightning(from, at, target));
  ModAPI.on('save', save => {
    if (VOLUNTAS.active && VOLUNTAS.solo) {
      save.ext.voluntasWalk = Object.fromEntries(Object.entries(seats).map(([id, seat]) => [id, {...seat}]));
    }
  });
  ModAPI.on('load', save => { if (!save.net) { report = null; cast = null; restore(save.ext?.voluntasWalk); } });
  ModAPI.on('worldgen', () => { seats = {}; report = cast = null; });

  ModAPI.ready(() => {
    ModAPI.wrap('walkEnter', (original, cell, opts) => {
      if (!voluntasMode()) return original(cell, opts);
      if (!available() || !validSeat(localId()) || returnSeconds() || !canLeave()) return false;
      return original(cell, {at: opts?.at, bx: opts?.bx, by: opts?.by});
    }, owner);
    ModAPI.before('wkEnterBody', () => {
      if (!available() || !validSeat(localId())) return;
      normalHP = WALK.HP;
      WALK.HP = hp;
    }, owner);
    ModAPI.after('wkActInit', () => {
      if (inWalk()) {
        WA.wpns = ['fist'];
        WA.wi = 0;
      }
    }, owner);
    ModAPI.wrap('walkExit', (original, forced) => {
      if (forced !== true && !canLeave()) return false;
      try { original(); }
      finally {
        if (inWalk()) WALK.HP = normalHP;
        normalHP = walkStatus = cast = null;
      }
      return true;
    }, owner);
    ModAPI.before('_nOff', () => { if (inWalk()) walkExit(true); report = null; }, owner);
    ModAPI.before('wkUiOpen', kind => {
      if (inWalk() && kind === 'map' && !canLeave()) return false;
    }, owner);
    ModAPI.before('wkRespawn', () => { if (inWalk()) return false; }, owner);
    ModAPI.wrap('wkHook', (original, name, ...args) => {
      if (name !== 'death' || !inWalk()) return original(name, ...args);
      damage(true);
      return true;
    }, owner);
    ModAPI.wrap('wkHurt', (original, dmg, why) => {
      const player = WK.pl, before = player?.hp;
      const result = original(dmg, why);
      if (inWalk() && player === WK.pl && player && !player.dead && player.hp < before) damage();
      return result;
    }, owner);
    ModAPI.wrap('zwPlayerTick', (original, dt) => {
      const player = WK.pl, before = player?.hp;
      const result = original(dt);
      if (inWalk() && player === WK.pl && player && !player.dead && player.hp < before) damage();
      return result;
    }, owner);
    ModAPI.after('airBail', () => {
      if (inWalk() && WK.pl?.hp === 0 && !WK.pl.dead) wkHurt(1, 'crash');
    }, owner);
    ModAPI.after('waEquipCheck', restrictGear, owner);
    ModAPI.after('waGive', restrictGear, owner);
    ModAPI.before('wkActWeapon', restrictGear, owner);
    ModAPI.before('waTryAttack', restrictGear, owner);
    ModAPI.before('wkVehEnter', vehicle => {
      if (inWalk() && vehicle?.V?.wpn) return false;
    }, owner);
    ModAPI.before('waVehAttack', () => { if (inWalk()) return false; }, owner);
    for (const name of ['togglePlay', 'stepOnce', '_speedStep', 'netSetPaused', 'netSetSpeed']) {
      ModAPI.before(name, () => { if (VOLUNTAS.winner === null && returnSeconds()) return false; }, owner);
    }
    kitDeny(key => inWalk() && key !== 'fist' && !!WA_WPN[key] && WA_WPN[key].type !== 'use');
    ModAPI.wrap('nwHitOk', validateHit, owner);
    const horn = WK_KEYS.q;
    WK_KEYS.q = (event, key) => {
      if (!inWalk() || WK.pl?.veh) return horn?.(event, key);
      castLightning();
      return true;
    };
    ModAPI.walkOn('enter', () => {
      if (!inWalk()) return;
      walkStatus = VoluntasHUD.el('div', '', WK.root);
      walkStatus.id = 'vd-walk-combat';
      updateWalkStatus();
    });
    ModAPI.after('wkUiOpen', (_, kind) => {
      if (!inWalk() || kind !== 'pause') return;
      const info = document.querySelector('#wk-pause .wk-mode');
      if (info) info.textContent = T('Кулаки · ЛКМ. Молния · Q.', 'Fists · LMB. Lightning · Q.');
    }, owner);
  });
})();
