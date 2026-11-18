(function () {
  'use strict';
  const v = window.VoluntasHUD; if (!v || v.edge) return;
  const zone = 28;
  let pointer, buttons, last, quietUntil, vx, vy;
  function reset() { pointer = null; buttons = 0; last = null; vx = vy = 0; }
  function direction(x, y, rect) {
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return {x:0,y:0};
    function axis(p, lo, hi) {
      const strength = Math.max(0, 1 - Math.min(p - lo, hi - p) / zone);
      const eased = strength * strength * (3 - 2 * strength);
      return p < (lo + hi) / 2 ? -eased : eased;
    }
    let dx = axis(x, rect.left, rect.right), dy = axis(y, rect.top, rect.bottom);
    const size = Math.hypot(dx, dy), strength = Math.max(Math.abs(dx), Math.abs(dy));
    if (size) { dx = dx / size * strength; dy = dy / size * strength; }
    return {x:dx,y:dy};
  }
  function tick(now) {
    if (!v.active) return;
    const dt = last === null ? 0 : Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!pointer || buttons || now < quietUntil || document.hidden || _anyModalOpen()) { vx = vy = 0; return; }
    if (!dt) return;
    const stage = document.getElementById('stage'); if (!stage) return;
    const rect = stage.getBoundingClientRect(), d = direction(pointer.x, pointer.y, rect);
    const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(pointer.x, pointer.y) : pointer.target;
    if (!hit || !['worldCanvas', 'canvas3d', 'canvas-wrap'].includes(hit.id)) { vx = vy = 0; return; }
    if (window.mode3D) { v.viewport.move(d.x, d.y, dt); return; }
    const response = d.x || d.y ? 12 : 18;
    const retain = Math.exp(-response * dt);
    const carry = (1 - retain) / (response * dt);
    v.viewport.move(d.x + (vx - d.x) * carry, d.y + (vy - d.y) * carry, dt);
    vx = d.x + (vx - d.x) * retain;
    vy = d.y + (vy - d.y) * retain;
  }
  function start() {
    reset();
    quietUntil = 0;
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
  v.edge = { install() { v.before('frame', tick); }, start, stop: reset };
})();
