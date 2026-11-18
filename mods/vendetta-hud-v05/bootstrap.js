(function () {
  'use strict';
  if (window.VendettaTest || !window.ModAPI || ModAPI.api !== 1) return;
  const v = window.VendettaTest = {
    version: '0.5.0', owner: 'vendetta_hud_v05', mode: 'vendetta_test', phase: 'idle', disposed: false,
    installed: false, cleanups: [], sessionCleanups: [], generated: false,
    listen(target, type, fn, options, session) {
      target.addEventListener(type, fn, options);
      (session ? v.sessionCleanups : v.cleanups).push(() => target.removeEventListener(type, fn, options));
    },
    drain(list) { for (const fn of list.splice(0).reverse()) { try { fn(); } catch (e) { console.warn('[VENDETTA] cleanup', e); } } },
    get active() { return !v.disposed && v.phase === 'active'; },
    blocked() { return !v.disposed && ['booting', 'active', 'exiting'].includes(v.phase); },
    before(name, fn) { if (typeof window[name] === 'function') ModAPI.before(name, (...args) => { if (!v.disposed) return fn(...args); }, v.owner); },
    after(name, fn) { if (typeof window[name] === 'function') ModAPI.after(name, (...args) => { if (!v.disposed) return fn(...args); }, v.owner); }
  };
  // Loaded before world3d.js: its capture listener must see only camera keys.
  v.listen(window, 'keydown', e => {
    if (v.menu && v.menu.open && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); v.menu.close(); return; }
    if (!v.blocked()) return;
    if (v.settings && v.settings.open) {
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); v.settings.close(); return; }
      const inSettings = e.target && e.target.closest && e.target.closest('#vendetta-settings');
      if (inSettings) return;
      if (!['Tab', 'Enter', 'Space'].includes(e.code) || !(e.target && e.target.closest && e.target.closest('#vendetta-hud'))) {
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
    }
    const inHud = e.target && e.target.closest && e.target.closest('#vendetta-hud');
    if (inHud && ['Tab', 'Enter', 'Space'].includes(e.code)) return;
    if (inHud && e.target.id === 'vendetta-minimap' && /^Arrow/.test(e.code)) {
      e.preventDefault(); e.stopImmediatePropagation(); if (v.minimap) v.minimap.nudge(e.code); return;
    }
    if (v.active && e.code === 'Space' && (!e.target || e.target.tagName !== 'BUTTON')) {
      e.preventDefault(); e.stopImmediatePropagation(); if (v.time) v.time.toggle(); return;
    }
    const modifiers = e.ctrlKey || e.metaKey || e.altKey;
    const camera = !modifiers && window.mode3D && /^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/.test(e.code);
    const navigation = !modifiers && (e.code === 'Tab' || e.code === 'F11');
    const exitKey = e.target && e.target.id === 'vendetta-exit' && (e.code === 'Enter' || e.code === 'Space');
    if (camera || navigation || exitKey) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape' && v.active) v.session.exit();
  }, true);
})();
