(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.edge) return;
  const zone = 16;
  let running = false, installed = false, pointer = null, buttons = 0, last = null, quietUntil = 0;
  function reset() { pointer = null; buttons = 0; last = null; }
  function direction(x, y, rect) {
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return {x:0,y:0};
    const axis = (p, lo, hi) => p < lo + zone ? -(1 - (p - lo) / zone) : p > hi - zone ? 1 - (hi - p) / zone : 0;
    let dx = axis(x, rect.left, rect.right), dy = axis(y, rect.top, rect.bottom);
    const size = Math.hypot(dx, dy), strength = Math.max(Math.abs(dx), Math.abs(dy));
    if (size) { dx = dx / size * strength; dy = dy / size * strength; }
    return {x:dx,y:dy};
  }
  function tick(now) {
    const dt = last === null ? 0 : Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    if (!running || !v.active || !pointer || buttons || !dt || now < quietUntil || document.hidden) return;
    if ((v.settings && v.settings.open) || (typeof _anyModalOpen === 'function' && _anyModalOpen())) return;
    const stage = document.getElementById('stage'); if (!stage) return;
    const rect = stage.getBoundingClientRect(), d = direction(pointer.x, pointer.y, rect); if (!d.x && !d.y) return;
    const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(pointer.x, pointer.y) : pointer.target;
    if (!hit || !['worldCanvas', 'canvas3d', 'canvas-wrap'].includes(hit.id)) return;
    v.viewport.move(d.x, d.y, dt);
  }
  function install() {
    if (installed) return; installed = true;
    v.before('frame', now => tick(now));
    v.listen(window, 'pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') { reset(); return; }
      pointer = {x:e.clientX,y:e.clientY,target:e.target}; buttons = e.buttons || 0;
    }, true);
    v.listen(window, 'pointerdown', e => { buttons = e.buttons || 1; }, true);
    v.listen(window, 'pointerup', e => { buttons = e.buttons || 0; }, true);
    v.listen(window, 'pointercancel', reset, true);
    v.listen(window, 'pointerout', e => { if (!e.relatedTarget) reset(); }, true);
    v.listen(window, 'blur', reset);
    v.listen(document, 'visibilitychange', () => { if (document.hidden) reset(); });
    v.listen(window, 'wheel', () => { quietUntil = performance.now() + 150; }, {capture:true, passive:true});
  }
  function start() { reset(); running = true; quietUntil = 0; }
  function stop() { running = false; quietUntil = 0; reset(); }
  v.edge = { install, start, stop, tick, direction, zone };
})();
