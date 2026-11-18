(function () {
  'use strict';
  const v = window.VoluntasHUD; if (!v || v.minimap) return;
  let pane, canvas, marker, cached, rect = null, dirty = true, last = -Infinity, stamp = '', world = null;
  function invalidate() { dirty = true; }
  function bake(now) {
    const key = [GRID.W, GRID.H, W.terrainVer, W.riverVer, W.seaLevel, Math.floor(W.simYear * 4)].join(':');
    if (world !== W.pop) { dirty = true; last = -Infinity; world = W.pop; }
    if ((dirty || key !== stamp) && now - last >= 2000) {
      rect = renderMiniMap(cached, 0, 0, GRID.W, GRID.H);
      stamp = key; dirty = false; last = now;
    }
  }
  function update(now) {
    if (!pane || pane.hidden || !v.active) return;
    bake(now); const g = canvas.getContext('2d'); g.drawImage(cached, 0, 0);
    const w = canvas.width, h = canvas.height;
    if (!rect) return;
    if (window.mode3D && typeof _3d !== 'undefined') {
      marker.hidden = true; canvas.setAttribute('aria-label', T('Миникарта, центр камеры', 'Minimap, camera center'));
      const x = (_3d.vc.tx - rect.x0) / rect.cw * w, y = (_3d.vc.tz - rect.y0) / rect.ch * h;
      g.strokeStyle = '#ddd0ff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.moveTo(x, y - 8); g.lineTo(x, y + 8); g.stroke();
    } else {
      canvas.setAttribute('aria-label', T('Миникарта, видимая область камеры', 'Minimap, visible camera area')); const b = v.viewport.visibleWorld(); if (!b) return;
      marker.hidden = false;
      marker.style.left = Math.max(0, (b.x - rect.x0) / rect.cw * 100) + '%';
      marker.style.top = Math.max(0, (b.y - rect.y0) / rect.ch * 100) + '%';
      marker.style.width = Math.min(100, b.w / rect.cw * 100) + '%'; marker.style.height = Math.min(100, b.h / rect.ch * 100) + '%';
    }
  }
  function move(e) {
    if (!rect || !v.active) return;
    const b = canvas.getBoundingClientRect();
    v.viewport.center(rect.x0 + clamp((e.clientX - b.left) / b.width, 0, 1) * rect.cw,
      rect.y0 + clamp((e.clientY - b.top) / b.height, 0, 1) * rect.ch); update(performance.now());
  }
  function nudge(code) {
    if (!pane || !v.active) return;
    const b = v.viewport.visibleWorld();
    if (!window.mode3D && !b) return;
    const x = window.mode3D ? _3d.view.tx : b.x + b.w / 2, y = window.mode3D ? _3d.view.tz : b.y + b.h / 2;
    v.viewport.center(x + (code === 'ArrowLeft' ? -2 : code === 'ArrowRight' ? 2 : 0), y + (code === 'ArrowUp' ? -2 : code === 'ArrowDown' ? 2 : 0)); update(performance.now());
  }
  function mount(host) {
    pane = v.el('section', 'vd-map-pane', host); pane.id = 'vd-minimap-pane';
    const frame = v.el('div', 'vd-mini-frame', pane);
    canvas = document.createElement('canvas'); canvas.id = 'vd-minimap'; canvas.width = 192; canvas.height = Math.max(60, Math.round(192 * GRID.H / GRID.W));
    canvas.setAttribute('aria-label', T('Миникарта. Нажмите для перемещения камеры', 'Minimap. Click to move the camera')); canvas.tabIndex = 0;
    frame.style.aspectRatio = GRID.W + ' / ' + GRID.H;
    frame.appendChild(canvas); marker = v.el('div', 'vd-mini-marker', frame); marker.id = 'vd-camera-marker';
    cached = document.createElement('canvas'); cached.width = canvas.width; cached.height = canvas.height;
    v.listen(canvas, 'pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); move(e); }, undefined, true);
    dirty = true; last = -Infinity; stamp = ''; world = null; update(performance.now()); return pane;
  }
  function stop() { pane = canvas = marker = cached = rect = null; world = null; dirty = true; }
  v.minimap = { mount, update, invalidate, stop, nudge };
})();
