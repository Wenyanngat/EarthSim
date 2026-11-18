(function () {
  'use strict';
  const v = window.VoluntasHUD = {
    owner: 'Voluntas Devina HUD',
    mounted: false,
    get active() { return v.mounted && !walkActive; },
    listen(target, type, handler, options) {
      const opts = typeof options === 'boolean' ? {capture: options} : options;
      target.addEventListener(type, handler, {...opts, signal: v.listeners.signal});
    },
    before(name, fn) {
      if (typeof window[name] === 'function') ModAPI.before(name, fn, v.owner);
    },
    after(name, fn) {
      if (typeof window[name] === 'function') ModAPI.after(name, fn, v.owner);
    }
  };

  // Register before world3d.js so its camera listener sees remapped camera keys.
  window.addEventListener('keydown', event => {
    if (!v.active || MENU_UP || event.altKey || event.metaKey) return;
    const stop = () => { event.preventDefault(); event.stopImmediatePropagation(); };
    if (v.settings.open && event.code === 'Escape') {
      stop();
      v.settings.close();
      return;
    }
    if (!UI.anyOpen() && event.code === 'Escape' &&
        (v.abilityPanel.armed || v.regiments.armed || v.regiments.selected)) {
      stop();
      if (v.abilityPanel.armed) v.abilityPanel.clear();
      else if (v.regiments.armed) v.regiments.disarm();
      else v.regiments.clear();
      return;
    }
    if (v.settings.open || event.target.closest?.('#vd-hud, .ui-win')) return;
    if (UI.anyOpen() || ['Escape', 'F11', 'F2', 'F5', 'F9'].includes(event.code)) return;
    if (event.code === 'Tab') {
      stop();
      if (!event.repeat) voluntasToggleView();
      return;
    }
    if (event.code === 'Space') {
      stop();
      if (!event.repeat) v.time.toggle();
      return;
    }
    if (window.mode3D && /^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/.test(event.code)) return;
    stop();
  }, true);
})();
