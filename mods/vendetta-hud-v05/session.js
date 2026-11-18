(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.session) return;
  const key = 'earthsim.boot';
  let watchdog = null, launchToken = null;
  function boot() { return typeof _boot !== 'undefined' ? _boot : null; }
  function isTest(b) { return !!b && b.mode === 'new' && b.vendettaMode === v.mode && typeof b.vendettaToken === 'string'; }
  function clearOwnBoot() {
    const raw = sessionStorage.getItem(key);
    if (raw && isTest(JSON.parse(raw))) sessionStorage.removeItem(key);
  }
  function cleanup() {
    clearTimeout(watchdog); watchdog = null;
    v.drain(v.sessionCleanups);
    if (v.hud) v.hud.restore();
    if (v.exitUI) v.exitUI.hide();
    v.generated = false;
  }
  function fail(message) {
    const wasBooting = v.phase === 'booting';
    cleanup(); v.phase = 'idle'; launchToken = null;
    try { clearOwnBoot(); } catch (e) { console.warn('[VENDETTA] boot cleanup', e); }
    const loader = document.getElementById('loader'); if (loader) loader.classList.add('hide');
    if (wasBooting && typeof showMainMenu === 'function') showMainMenu();
    if (v.menu) { v.menu.show(); v.menu.error(message); }
  }
  function begin() {
    if (v.disposed || v.phase !== 'idle') return;
    if (typeof netLive === 'function' && netLive()) { v.menu.error('TEST недоступен в сетевой комнате.'); return; }
    if (typeof bootNewMap !== 'function') { v.menu.error('Штатный запуск мира недоступен.'); return; }
    launchToken = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    v.phase = 'launching'; v.menu.busy(true);
    try {
      // Let the native launcher save the preceding ordinary game and flush storage.
      bootNewMap({ w: 80, h: 60, type: 'continents', settle: 1,
        vendettaMode: v.mode, vendettaToken: launchToken });
      const written = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (!isTest(written) || written.vendettaToken !== launchToken) throw Error('Конфигурация запуска не записана.');
      watchdog = setTimeout(() => fail('Переход в мир не завершён. Повторите запуск.'), 4000);
    } catch (e) { fail('Не удалось запустить TEST: ' + e.message); }
  }
  function exit() {
    if (!v.active) return;
    v.phase = 'exiting';
    try {
      clearOwnBoot();
      // A fresh page drops world/UI closures, pending native timers and mod hooks.
      location.reload();
      watchdog = setTimeout(() => { cleanup(); v.phase = 'idle'; showMainMenu(); }, 4000);
    } catch (e) { cleanup(); v.phase = 'idle'; showMainMenu(); v.menu.show(); v.menu.error('Перезагрузка недоступна: ' + e.message); }
  }
  function install() {
    const b = boot();
    if (isTest(b)) { v.phase = 'booting'; v.hud.hide(); }
    v.after('_applyBootParams', () => { if (v.phase === 'booting') v.generated = true; });
    // A generation exception is otherwise swallowed by native start() and replaced by a fallback world.
    ModAPI.wrap('worldgen', function (orig, ...args) {
      if (v.disposed) return orig(...args);
      if (v.active) { exit(); return; }
      try { return orig(...args); } catch (e) { if (v.phase === 'booting') fail('Ошибка генерации TEST: ' + e.message); throw e; }
    }, v.owner);
    v.before('showMainMenu', () => { if (v.active) { exit(); return false; } });
    for (const name of ['bootNewMap', 'bootLoadMap', 'loadWorldFromStorage', 'resetLife'])
      v.before(name, () => { if (v.active) { exit(); return false; } });
    // Disposable test worlds must not overwrite ordinary autosaves or quick saves.
    for (const name of ['autosaveTick', '_saveOnExit', '_saveOnExitAuto', 'quickSave'])
      v.before(name, () => v.blocked() ? false : undefined);
    ModAPI.started(() => {
      if (v.disposed || v.phase !== 'booting') return;
      if (!v.generated) { fail('Инициализация TEST не подтверждена.'); return; }
      try {
        if (typeof netLive === 'function' && netLive()) throw Error('активна сетевая комната');
        setTool('inspect');
        v.phase = 'active'; v.hud.hide(); v.exitUI.show();
      } catch (e) { fail('Ошибка инициализации TEST: ' + e.message); }
    });
  }
  v.session = { begin, exit, fail, cleanup, install, isTest };
})();
