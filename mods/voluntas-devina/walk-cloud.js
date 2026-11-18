'use strict';

(() => {
  const owner = 'Voluntas Devina';
  const cruise = 10 / 3.6;
  const boost = 100 / 3.6;
  const recallMs = 350;
  const hover = 3;
  const footprint = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // The stock relay already carries the model token alongside the Walk pose.
  const cloudModel = 'vd_cloud';
  const clouds = new Map();
  let geometry, material, rider, recall, viewHint;
  let landing = false, height = hover;

  function eligible(player) {
    return walkActive && player && !player.dead && !player.veh &&
      VOLUNTAS.active && voluntasMode() && !!voluntasLocalPlayer();
  }

  function riding(player) {
    return rider === player && eligible(player);
  }

  function mount() {
    const player = WK.pl;
    if (!eligible(player)) return false;
    if (rider === player) return true;
    rider = player;
    landing = false;
    height = hover;
    recall = null;
    WK.tp = false;
    WK.keys.jump = false;
    player.vy = 0;
    const label = WK.root?.querySelector('#wk-foot [data-ka="view"]')?.nextSibling;
    if (label?.nodeType === Node.TEXT_NODE) {
      viewHint = {label, text: label.data};
      label.data = label.data.replace(/^\S+/, T('посадка', 'land'));
    }
    return true;
  }

  function removeCloud(id) {
    const group = clouds.get(id);
    group?.parent?.remove(group);
    clouds.delete(id);
  }

  function dismount() {
    rider = null;
    recall = null;
    landing = false;
    if (viewHint) {
      viewHint.label.data = viewHint.text;
      viewHint = null;
    }
    removeCloud(null);
  }

  // Higher floors and roofs count only when the player is already above them.
  function surface(x, z, y) {
    const ground = wkGround(x, z, y + .25);
    const from = y + .08, to = Math.min(y - .1, ground - .1);
    const floor = wkVSweep(x, z, WALK.RADIUS, from, to, WALK.HEAD_H).floor;
    const roof = wiRoofSweep(x, z, from, to).floor;
    return Math.max(ground, floor, roof);
  }

  function dry(x, z, support) {
    return wkWaterAt(x, z, wkTerrainY(x, z)) <= support;
  }

  function canLand(player, support) {
    const {x, y, z} = player;
    const chunk = WK.chunks.get(wkChunkKey(Math.floor(x / WALK.CHUNK), Math.floor(z / WALK.CHUNK)));
    if (chunk?.state !== 1 || (chunk.dState !== 1 && !(chunk.fail > 1))) return false;
    if (!dry(x, z, support) || wkCollide(x, z, WALK.RADIUS, support + .06, 0).hit) return false;
    const r = WALK.RADIUS;
    for (const [ux, uz] of footprint) {
      const dx = r * ux, dz = r * uz;
      const near = surface(x + dx, z + dz, Math.min(y, support + .25) + .25);
      if (Math.abs(near - support) > r * .65 || !dry(x + dx, z + dz, near)) return false;
    }
    return true;
  }

  function drive(player, dt, wx, wz, talk) {
    if (!riding(player)) return false;
    const speed = WK.keys.run ? boost : cruise;
    const ease = -Math.expm1(-4 * dt);
    player.vx += (wx * speed - player.vx) * ease;
    player.vz += (wz * speed - player.vz) * ease;
    player.crouch = 0;
    player.onGround = false;

    if (!talk && !landing) {
      const lift = Number(!!WK.held.space) - Number(!!WK.keys.crouch);
      height = clamp(height + lift * 5 * dt, hover, 64);
    }
    const {x, y, z} = player;
    const support = surface(x, z, y);
    const water = wkWaterAt(x, z, wkTerrainY(x, z));
    let target = Math.max(support, water) + height;
    if (landing) {
      target = Math.max(support + .85, water + 1.25);
      if (y - support < 1.2 && Math.hypot(player.vx, player.vz) <= cruise + .1 &&
          canLand(player, support)) target = support - .08;
    }
    const velocity = clamp((target - y) * 5, -3.2, 6);
    player.vy += (velocity - player.vy) * -Math.expm1(-10 * dt);
    player.y += player.vy * dt;
    return true;
  }

  function step(original, dt) {
    const player = WK.pl;
    if (!riding(player)) return original(dt);
    // Keep each move shorter than the actor radius at boost speed.
    const speed = Math.max(WK.keys.run ? boost : cruise, Math.hypot(player.vx, player.vz));
    const count = Math.max(1, Math.ceil(dt * speed / (WALK.RADIUS * .65)));
    for (let i = 0; i < count; i++) {
      original(dt / count);
      if (!riding(player)) break;
      if (!landing || !player.onGround || Math.hypot(player.vx, player.vz) > cruise + .1) continue;
      if (canLand(player, player.y)) {
        dismount();
        break;
      }
    }
  }

  function recallKey() {
    const player = WK.pl;
    if (!WK.ready || !eligible(player)) return false;
    if (riding(player)) return true;
    const now = performance.now();
    if (recall?.player === player && recall.released && now - recall.at <= recallMs) return mount();
    if (player.onGround && !player.swim) recall = {player, at: now, released: false};
    return false;
  }

  function descend() {
    if (!riding(WK.pl)) return false;
    if (!landing) {
      landing = true;
      wkMsg(T('Снижение. Направьте облако к сухой площадке.', 'Landing. Steer toward a dry, even surface.'));
    }
    return true;
  }

  function peer(pose) {
    if (!pose || pose.peer == null || !netLive() || !VOLUNTAS.active || !voluntasInRoom()) return false;
    const p = _nuW.get(pose.peer);
    return p?.n === pose && !pose.vanish && !p.vk && !p.dd && !p.sm && p.vm === cloudModel &&
      netUiWalking(pose.peer) && NP.players.some(seat => seat.id === pose.peer && seat.on) &&
      VOLUNTAS.players.some(seat => seat.id === pose.peer);
  }

  function show(id, pose, yaw) {
    let group = clouds.get(id);
    if (!group) {
      geometry ||= new THREE.SphereGeometry(1, 16, 10);
      material ||= new THREE.MeshStandardMaterial({color: 0xf1f6ff, roughness: 1});
      group = new THREE.Group();
      const puffs = [
        [0, -.5, -.15, 1.05, .60, 1.22],
        [-.73, -.49, -.65, .74, .49, .92],
        [.74, -.52, -.81, .74, .46, 1.02],
        [0, -.37, -1.45, .88, .52, 1.10],
        [.60, -.34, -2.12, .60, .45, .83],
        [-.56, -.41, -2.17, .63, .42, .78],
        [.17, -.55, .80, .96, .46, .82]
      ];
      for (const [x, y, z, w, h, d] of puffs) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(w, h, d);
        group.add(mesh);
      }
      WK.scene.add(group);
      clouds.set(id, group);
    }
    group.position.set(pose.x, pose.y, pose.z);
    group.rotation.y = yaw;
  }

  function draw() {
    if (rider && !riding(WK.pl)) dismount();
    if (rider && WK.ready) show(null, rider, rider.yaw);
    for (const id of clouds.keys()) if (id !== null && !peer(_nuW.get(id)?.n)) removeCloud(id);
    if (!netLive() || !WK.ready || !VOLUNTAS.active || !voluntasInRoom()) return;
    for (const [id, p] of _nuW) if (peer(p.n)) show(id, p.n, p.n.yaw - Math.PI);
  }

  function clearScene() {
    dismount();
    for (const id of clouds.keys()) removeCloud(id);
    geometry?.dispose();
    material?.dispose();
    geometry = material = null;
  }

  window.VoluntasCloud = {mount, riding, drive, peer};
  ModAPI.ready(() => {
    const oldView = WK_KEYS.v, oldSpace = WK_KEYS.space;
    WK_KEYS.v = (e, key) => descend() || oldView?.(e, key);
    WK_KEYS.space = (e, key) => recallKey() || oldSpace?.(e, key);
    ModAPI.after('wkOnKeyUp', (_, e) => {
      if (recall && wkKeyName(e) === 'space') recall.released = true;
    }, owner);
    ModAPI.before('wkOnBlur', () => { recall = null; }, owner);
    document.addEventListener('visibilitychange', () => { if (document.hidden) recall = null; });
    ModAPI.before('wkVehEnter', () => {
      if (riding(WK.pl)) return false;
      recall = null;
    }, owner);
    ModAPI.wrap('wkPlayerStep', step, owner);
    ModAPI.after('wkCamUpdate', draw, owner);
    ModAPI.walkOn('arrive', clearScene);
    ModAPI.walkOn('exit', clearScene);
    ModAPI.walkOn('death', dismount);
    ModAPI.after('nwWalkState', state => {
      if (riding(WK.pl) && WK.ready) state.vm = cloudModel;
    }, owner);
  });
})();
