(function () {
  'use strict';
  const v = window.VoluntasHUD;
  const portraits = {
    horned: 'avatars/fig1_rogatyi.png',
    beads: 'menu/namisto_character.png',
    mask: 'avatars/gejzerich_character.png',
    wreath: 'menu/venok_character.png'
  };
  let panel, title, attack, cancel, marker, markerFrame, projected;
  let unit = null, armed = false, mapPicking = false;

  function ownRegiment(id) {
    const found = id === null ? null : armyFind(id);
    return found?.st.uid === voluntasLocalPlayer()?.uid && found?.r.men > 0 ? found : null;
  }

  function positionMarker(r) {
    const mode3D = window.mode3D;
    const canvas = mode3D ? _3d.canvas : mainCanvas;
    if (!canvas || r.task === 'b') return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const hits = mode3D ? _w3 : _wm;
    let x, y;
    for (let j = 0; j < hits.hitN; j++) {
      if (hits.hit[j * 3 + 2] !== r.u) continue;
      x = hits.hit[j * 3];
      y = hits.hit[j * 3 + 1];
      break;
    }
    if (x === undefined) {
      const t = r.mt === W.simTick && !W.paused ? _civFrac() : 1;
      const scale = mode3D ? 1 : CELL;
      x = (r.pc % GRID.W + (r.c % GRID.W - r.pc % GRID.W) * t + .5) * scale;
      const fromRow = Math.floor(r.pc / GRID.W), toRow = Math.floor(r.c / GRID.W);
      y = (fromRow + (toRow - fromRow) * t + .5) * scale;
    }
    if (mode3D) {
      if (!_3d.cam) return false;
      projected ??= new THREE.Vector3();
      projected.set(x, Math.max(0, surfAt(x, y)), y).project(_3d.cam);
      if (projected.z < -1 || projected.z > 1) return false;
      x = (projected.x + 1) * rect.width / 2;
      y = (1 - projected.y) * rect.height / 2;
    } else {
      x = (view2d.ox + x * view2d.zoom) * rect.width / CANVAS_W;
      y = (view2d.oy + y * view2d.zoom) * rect.height / CANVAS_H;
    }
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return false;
    marker.style.left = rect.left + x + 'px';
    marker.style.top = rect.top + y + 'px';
    return true;
  }

  function drawMarker() {
    markerFrame = null;
    const found = ownRegiment(unit);
    if (!found || VOLUNTAS.winner !== null) { clear(); return; }
    marker.hidden = MENU_UP || !positionMarker(found.r);
    markerFrame = requestAnimationFrame(drawMarker);
  }

  function disarm() {
    if (!armed) return;
    armed = false;
    v.mapInput.cancel();
    v.abilityPanel.message('');
    update();
  }

  function clear() {
    disarm();
    unit = null;
    cancelAnimationFrame(markerFrame);
    markerFrame = null;
    if (marker) marker.hidden = true;
    if (panel) panel.hidden = true;
  }

  function update() {
    if (!panel || unit === null) return;
    const found = ownRegiment(unit);
    if (!found || VOLUNTAS.winner !== null) { clear(); return; }
    const order = VOLUNTAS.orders[unit];
    const name = regName(found.r, found.st);
    title.textContent = order
      ? name + ' · ' + T('Цель', 'Target') + ' ' + (order.cell % GRID.W + 1) + ', ' + (Math.floor(order.cell / GRID.W) + 1)
      : name;
    const canEdit = netCanEdit() && !NP.waiting;
    attack.disabled = !canEdit || !voluntasOrderable(found.r);
    attack.setAttribute('aria-pressed', String(armed));
    cancel.hidden = !order;
    cancel.disabled = !canEdit;
    if (attack.disabled && armed) disarm();
  }

  function select(id) {
    const found = ownRegiment(id);
    clear();
    if (!found || !VOLUNTAS.active || VOLUNTAS.winner !== null) return false;
    unit = id;
    panel.hidden = false;
    const avatar = voluntasLocalPlayer().avatar;
    const mod = MODS.find(entry => entry.id === 'voluntas-devina' && entry.live);
    if (mod) {
      const {pathToFileURL} = require('node:url');
      const path = require('node:path');
      marker.src = pathToFileURL(path.join(mod.dir, portraits[avatar] || portraits.horned)).href;
    }
    update();
    drawMarker();
    return true;
  }

  v.regiments = {
    mount(host, root) {
      panel = v.el('div', 'vd-regiment', host);
      panel.hidden = true;
      title = v.el('strong', 'vd-regiment-name', panel);
      attack = v.button(panel, 'vd-order-attack', '', T('Атаковать', 'Attack'));
      attack.textContent = attack.title;
      v.listen(attack, 'click', () => {
        if (armed) { disarm(); return; }
        v.abilityPanel.clear();
        armed = true;
        this.message(T('Выберите клетку вражеского фронта.', 'Choose an enemy front tile.'));
        update();
      });
      cancel = v.button(panel, 'vd-order-cancel', '', T('Отменить приказ', 'Cancel order'));
      cancel.textContent = cancel.title;
      v.listen(cancel, 'click', () => {
        disarm();
        netDo('vdOrder', unit, null);
      });
      const close = v.button(panel, 'vd-regiment-close', v.icons.close, T('Снять выбор полка', 'Deselect regiment'));
      v.listen(close, 'click', clear);
      marker = v.el('img', 'vd-regiment-marker', root);
      marker.alt = '';
      marker.hidden = true;
    },
    update, clear, disarm,
    get armed() { return armed; },
    get selected() { return unit !== null; },
    request(cell) {
      disarm();
      this.message(T('Отправка приказа…', 'Sending order…'));
      netDo('vdOrder', unit, cell);
    },
    message(text) { v.abilityPanel.message(text); },
    pick(click) {
      mapPicking = true;
      try { return click(); }
      finally { mapPicking = false; }
    },
    stop() {
      clear();
      panel = title = attack = cancel = marker = projected = null;
    }
  };

  ModAPI.ready(() => {
    ModAPI.wrap('openRegiment', (original, id) => {
      if (mapPicking && select(id)) return null;
      return original(id);
    }, v.owner);
  });
})();
