(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.hud) return;
  // Explicit shipped UI nodes only. Never hide body, game-shell, stage or canvases.
  const ids = ['hud', 'tools-col', 'inspector', 'legend', 'hint3d', 'stage-hint',
    'goals-dock', 'planet', 'coach', 'brush-cursor', 'cursor-tip', 'cursor-tip3d',
    'ach-toasts', 'perf-hud', 'ui-tip', 'ui-ttl', 'ui-toasts', 'ui-toasts-over', 'mm-flash',
    'tut-root', 'tut-hints', 'tut-offer'];
  let style = null;
  function hide() {
    if (style) return;
    document.documentElement.setAttribute('data-vendetta-test', 'active');
    style = document.createElement('style'); style.id = 'vendetta-hud-style';
    const scope = 'html[data-vendetta-test] ';
    style.textContent = ids.map(id => scope + '#' + id + '[id]').join(',') + '{display:none!important}' +
      scope + 'body{overflow:hidden!important;margin:0!important;padding:0!important}' +
      scope + '#game-shell[id]{position:fixed!important;inset:54px 0 0!important;width:100%!important;height:calc(100% - 54px)!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;gap:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;overflow:hidden!important;grid-template-columns:1fr!important;grid-template-rows:1fr!important;grid-template-areas:"stage"!important}' +
      scope + '#game-shell>#stage{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;grid-column:1/-1!important;grid-row:1/-1!important;min-width:0;min-height:0;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important}' +
      scope + '#canvas-wrap[id]{position:absolute!important;flex:none!important;max-width:none!important;max-height:none!important;overflow:hidden!important;border:0!important;margin:0!important;padding:0!important;box-shadow:none!important;border-radius:0!important}' +
      scope + '#worldCanvas[id]{display:block!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;transform:none!important}';
    document.head.appendChild(style);
    v.viewport.start();
    window.dispatchEvent(new Event('resize'));
  }
  function restore() { v.viewport.stop(); if (style) { style.remove(); style = null; document.documentElement.removeAttribute('data-vendetta-test'); window.dispatchEvent(new Event('resize')); } }
  function install() {
    v.viewport.install();
    // Hidden native coach keeps class="show" on first run. It must not block map keys
    // or Map Visualization selection. Preserve UI-kit modals owned by other modules.
    ModAPI.wrap('_anyModalOpen', orig => v.blocked() ? ((typeof UI !== 'undefined' && UI.anyOpen()) || !!(v.settings && v.settings.open)) : orig(), v.owner);
    v.before('inspectClick', i => { if (v.blocked()) { if (v.active && typeof selectStateAt === 'function') selectStateAt(i); return false; } });
    for (const name of ['applyTool', 'applyPointTool', 'armyClick3D', 'armyClickAt',
      'openBattleModal', 'openCityModal', 'openStateModal', 'walkEnter', 'terrPick3D', 'terrPickAt', 'drawLayerLabel'])
      v.before(name, () => v.blocked() ? false : undefined);
    v.before('setTool', name => v.blocked() && name !== 'inspect' ? false : undefined);
    // Clicks on battles bypass inspectClick in the native 2D handler.
    v.before('findNearestBattle', () => v.blocked() ? false : undefined);
  }
  v.hud = { ids, hide, restore, install };
})();
