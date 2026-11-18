(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.viewport) return;
  let enabled = false, last = '', snapshot = null, wrapSnapshot = null;
  function bounds() {
    const stage = document.getElementById('stage'), canvas = document.getElementById('worldCanvas');
    if (!stage || !canvas) return null;
    const s = stage.getBoundingClientRect(), c = canvas.getBoundingClientRect();
    if (!c.width || !c.height) return null;
    return { s, c, left: (s.left - c.left) * CANVAS_W / c.width, top: (s.top - c.top) * CANVAS_H / c.height,
      width: s.width * CANVAS_W / c.width, height: s.height * CANVAS_H / c.height };
  }
  function clampView() {
    const b = bounds(); if (!b) return;
    view2d.ox = clamp(view2d.ox, b.left + b.width - CANVAS_W * view2d.zoom, b.left);
    view2d.oy = clamp(view2d.oy, b.top + b.height - CANVAS_H * view2d.zoom, b.top);
  }
  function sync() {
    const stage = document.getElementById('stage'); if (!stage || !mainCanvas) return;
    // clientWidth/clientHeight round away fractional CSS pixels at noninteger DPI.
    const rect = stage.getBoundingClientRect(), w = rect.width, h = rect.height, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w < 2 || h < 2) return;
    const key = [w, h, dpr].join(':'); if (key === last) return; last = key;
    const scale = Math.max(w / CANVAS_W, h / CANVAS_H);
    const dw = CANVAS_W * scale, dh = CANVAS_H * scale;
    const bw = Math.min(2560, Math.max(16, Math.round(dw * dpr))), bh = Math.max(16, Math.round(bw * CANVAS_H / CANVAS_W));
    _rDpr = bw / CANVAS_W; _rUi = clamp(CANVAS_W / dw * 1.22, .55, 4);
    mainCanvas.width = bw; mainCanvas.height = bh;
    mainCanvas.style.width = dw + 'px'; mainCanvas.style.height = dh + 'px';
    const wrap = document.getElementById('canvas-wrap');
    if (wrap) { wrap.style.width = dw + 'px'; wrap.style.height = dh + 'px'; wrap.style.left = ((w - dw) / 2) + 'px'; wrap.style.top = ((h - dh) / 2) + 'px'; }
    _rLand.valid = false; _rB.dirty = true; _rB.urgentT = performance.now(); _rWat.key = ''; _rAr.stat = '';
    clampView();
  }
  function visibleWorld() {
    const b = bounds(); if (!b) return null;
    return { x: (b.left - view2d.ox) / (CELL * view2d.zoom), y: (b.top - view2d.oy) / (CELL * view2d.zoom),
      w: b.width / (CELL * view2d.zoom), h: b.height / (CELL * view2d.zoom) };
  }
  function center(x, y) {
    if (!v.active) return;
    if (window.mode3D && typeof _3d !== 'undefined') { _3d.view.tx = clamp(x, 0, GRID.W); _3d.view.tz = clamp(y, 0, GRID.H); return; }
    const b = bounds(); if (!b) return;
    view2d.ox = b.left + b.width / 2 - x * CELL * view2d.zoom;
    view2d.oy = b.top + b.height / 2 - y * CELL * view2d.zoom;
    clampView();
  }
  // Both inputs feed the game's existing camera state; no second camera exists.
  function move(x, y, seconds) {
    if (!v.active || !(seconds > 0)) return;
    if (window.mode3D && typeof _3d !== 'undefined') {
      const camera = _3d.view, speed = camera.dist * W3D.KEY_PAN * (1000 / 16.7) * seconds;
      const forward = -y, sn = Math.sin(camera.az), cs = Math.cos(camera.az);
      camera.tx = clamp(camera.tx + (cs * x - sn * forward) * speed, 0, GRID.W);
      camera.tz = clamp(camera.tz + (-sn * x - cs * forward) * speed, 0, GRID.H);
      return;
    }
    const b = bounds(); if (!b) return;
    const speed = Math.min(b.s.width, b.s.height) * .55;
    pan2d(-x * speed * seconds, -y * speed * seconds, b.c);
  }
  function start() {
    if (enabled) return;
    enabled = true; last = ''; snapshot = { ...view2d };
    const wrap = document.getElementById('canvas-wrap'); if (wrap) wrapSnapshot = Object.fromEntries(['width','height','left','top'].map(key => [key, wrap.style[key]]));
    sync();
  }
  function stop() {
    if (!enabled) return; enabled = false; last = '';
    if (snapshot) Object.assign(view2d, snapshot); snapshot = null; _rStageW = 0; _rStageH = 0; _rLastDpr = 0;
    const wrap = document.getElementById('canvas-wrap'); if (wrap && wrapSnapshot) for (const key of ['width','height','left','top']) wrap.style[key] = wrapSnapshot[key]; wrapSnapshot = null;
  }
  function install() {
    ModAPI.wrap('_rSyncSize', orig => { if (!v.disposed && enabled && !window.mode3D) return sync(); return orig(); }, v.owner);
    ModAPI.wrap('clampPan2d', orig => { if (!v.disposed && enabled && !window.mode3D) return clampView(); return orig(); }, v.owner);
    v.after('set3DMode', () => { if (enabled) { last = ''; if (!window.mode3D) sync(); } });
    v.listen(window, 'resize', () => { if (enabled && !window.mode3D) sync(); });
    const stage = document.getElementById('stage');
    if (stage) for (const type of ['pointerdown', 'pointermove', 'wheel']) v.listen(stage, type, e => {
      if (v.active && v.settings && v.settings.open) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, {capture:true, passive:false});
  }
  v.viewport = { install, start, stop, sync, center, move, visibleWorld, bounds };
})();
