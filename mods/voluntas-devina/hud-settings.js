(function () {
  'use strict';
  const v = window.VoluntasHUD; if (!v || v.settings) return;
  let panel, backdrop, sections, footer, toggle, closeButton, style, status, controls = [], sound = [], view, fullscreen, layer, waiting = null;
  const actions = [['pause',T('Пауза / пуск', 'Pause / resume')],['toggle3d',T('Вид 2D / 3D', 'Toggle 2D / 3D')],['camF',T('Вперёд', 'Forward')],['camB',T('Назад', 'Back')],['camL',T('Влево', 'Left')],['camR',T('Вправо', 'Right')],['camQL',T('Поворот влево', 'Rotate left')],['camQR',T('Поворот вправо', 'Rotate right')]];
  function hasKeys() { return typeof KEYS !== 'undefined' && ['capture','cancel','capturing','canBind','owner','set','cur','name'].every(k => typeof KEYS[k] === 'function') && KEYS.byId; }
  function cancelCapture() { if (waiting && hasKeys()) KEYS.cancel(); waiting = null; }
  function message(text) { if (status) status.textContent = text; }
  function refresh() {
    for (const [id, button] of controls) button.textContent = waiting === id ? T('Нажмите…', 'Press a key…') : KEYS.name(KEYS.cur(id));
    if (sound.length) { const s = SFX.settings(); for (const [key, input, output] of sound) {
      if (input.type === 'checkbox') input.checked = !!s[key]; else { input.value = String(Math.round(s[key] * 100)); output.textContent = input.value + '%'; }
    } }
    if (view) view.checked = !!window.mode3D;
    if (layer) layer.value = uiState.layer;
    if (fullscreen) fullscreen.checked = isFullscreen();
  }
  function capture(id) {
    if (!v.active || !hasKeys() || !controls.some(row => row[0] === id)) return;
    cancelCapture(); waiting = id; message(T('Нажмите новую клавишу. Esc — отмена.', 'Press a new key. Esc cancels.')); refresh();
    KEYS.capture(code => {
      waiting = null;
      if (!v.active || !panel || panel.hidden) return;
      if (code === 'Escape') message(T('Назначение отменено.', 'Binding cancelled.'));
      else if (!KEYS.canBind(code)) message(T('Эту клавишу назначить нельзя.', 'This key cannot be bound.'));
      else {
        const owner = KEYS.owner(id, code);
        if (owner) message(T('Клавиша уже занята другим действием.', 'The key is already assigned.'));
        else message(KEYS.set(id, code) ? T('Клавиша сохранена.', 'Key saved.') : T('Не удалось изменить клавишу.', 'Could not change the key.'));
      }
      refresh();
    });
  }
  function close(focus = true) {
    if (!panel || panel.hidden) return;
    cancelCapture(); panel.hidden = true; backdrop.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    if (focus && toggle.isConnected) toggle.focus();
  }
  function show() {
    if (!panel || !v.active) return;
    message(''); refresh(); panel.hidden = false; backdrop.hidden = false; toggle.setAttribute('aria-expanded', 'true');
    if (typeof _3d !== 'undefined' && _3d.keys) for (const k in _3d.keys) _3d.keys[k] = false;
    if (typeof _3d !== 'undefined') _3d.drag = null;
    closeButton.focus();
  }
  function section(label, id) {
    const details = v.el('details', 'vd-setting-section', sections); details.id = id; details.open = true;
    const summary = v.el('summary', '', details); summary.textContent = label;
    v.listen(details, 'toggle', () => { if (!details.open) { cancelCapture(); message(''); refresh(); } }, undefined, true);
    return v.el('div', 'vd-setting-body', details);
  }
  function check(host, id, label, onChange) {
    const row = v.el('label', 'vd-setting-row', host); row.htmlFor = id;
    const text = v.el('span', '', row); text.textContent = label;
    const input = v.el('input', '', row); input.id = id; input.type = 'checkbox';
    v.listen(input, 'change', () => { onChange(input.checked); refresh(); }, undefined, true); return input;
  }
  function volume(host, key, title, setter) {
    const row = v.el('label', 'vd-volume', host); row.htmlFor = 'vd-' + key;
    const text = v.el('span', '', row); text.textContent = title;
    const output = v.el('output', '', row);
    const input = v.el('input', '', row); input.id = 'vd-' + key; input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1';
    sound.push([key, input, output]);
    v.listen(input, 'input', () => { setter(Number(input.value) / 100); output.textContent = input.value + '%'; }, undefined, true);
  }
  function mount(host, root) {
    if (panel) return;
    toggle = v.button(host, 'vd-settings-toggle', v.icons.settings, T('Настройки', 'Settings')); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'vd-settings'); toggle.setAttribute('aria-haspopup', 'dialog');
    backdrop = v.el('div', 'vd-settings-backdrop', root); backdrop.id = 'vd-settings-backdrop'; backdrop.hidden = true;
    panel = v.el('section', 'vd-settings', backdrop); panel.id = 'vd-settings'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'vd-settings-title');
    const header = v.el('header','vd-settings-head',panel), title = v.el('h2','',header); title.id = 'vd-settings-title'; title.textContent = T('Настройки', 'Settings');
    closeButton = v.button(header,'vd-settings-close',v.icons.close,T('Закрыть настройки', 'Close settings')); v.listen(closeButton,'click',() => close(),undefined,true);
    sections = v.el('div','vd-settings-sections',panel);
    if (typeof SFX !== 'undefined' && ['settings','setOn','setMusic','setVol','setMusicVol'].every(k => typeof SFX[k] === 'function')) {
      const body = section(T('Звук', 'Sound'), 'vd-settings-sound');
      sound.push(['on', check(body,'vd-sound-on',T('Звук', 'Sound'), value => SFX.setOn(value))]);
      sound.push(['music', check(body,'vd-music-on',T('Музыка', 'Music'), value => SFX.setMusic(value))]);
      volume(body, 'vol', T('Общая громкость', 'Master volume'), value => SFX.setVol(value)); volume(body, 'mvol', T('Музыка', 'Music'), value => SFX.setMusicVol(value));
    }
    const canView = typeof toggle3D === 'function' && typeof set3DMode === 'function';
    const canFullscreen = !!(window.nw && nw.Window) && typeof setFullscreen === 'function' && typeof isFullscreen === 'function';
    if (canView || canFullscreen) {
      const body = section(T('Интерфейс', 'Interface'), 'vd-settings-interface');
      if (canView) view = check(body,'vd-setting-3d',T('Объёмная карта', '3D map'), value => {
        if (value !== !!window.mode3D) voluntasToggleView();
        if (value !== !!window.mode3D) message(T('3D-вид недоступен на этом устройстве.', '3D is unavailable on this device.'));
      });
      if (canFullscreen) fullscreen = check(body,'vd-setting-fullscreen',T('Полный экран', 'Fullscreen'), value => setFullscreen(value));
      const row = v.el('label', 'vd-setting-row', body);
      v.el('span', '', row).textContent = T('Слой карты', 'Map layer');
      layer = v.el('select', '', row);
      for (const native of document.querySelectorAll('#layer-toggles button[data-layer]')) {
        const option = v.el('option', '', layer);
        option.value = native.dataset.layer;
        option.textContent = native.textContent;
      }
      v.listen(layer, 'change', () => setLayer(layer.value));

    }
    if (hasKeys()) {
      const available = actions.filter(([id]) => KEYS.byId[id]);
      if (available.length) {
        const body = section(T('Управление', 'Controls'), 'vd-settings-controls');
        for (const [id, title] of available) {
          const row = v.el('div', 'vd-setting-row', body); const text = v.el('span','',row); text.textContent = title;
          const button = v.button(row, 'vd-bind-' + id, '', T('Назначить: ', 'Bind: ') + title); controls.push([id, button]); v.listen(button,'click',() => capture(id),undefined,true);
        }
        const note = v.el('p','vd-setting-note',body); note.textContent = T('Назначения сохраняются в настройках игры.', 'Key bindings are saved in the game settings.');
      }
    }
    footer = v.el('footer','vd-settings-footer',panel);
    const menuLabel = T('Главное меню', 'Main menu');
    const exit = v.button(footer, 'vd-exit', v.icons.exit, menuLabel);
    exit.className = 'vd-setting-exit';
    v.el('span', '', exit).textContent = menuLabel;
    v.listen(exit, 'click', () => { close(false); showMainMenu(); });
    if (voluntasInRoom()) {
      const leaveLabel = T('Выйти из комнаты', 'Leave room');
      const leave = v.button(footer, 'vd-leave-room', '', leaveLabel);
      leave.textContent = leaveLabel;
      v.listen(leave, 'click', () => { close(false); netUiLeaveAsk(); });
    }
    status = v.el('p','vd-settings-status',footer); status.id = 'vd-settings-status'; status.setAttribute('role','status');
    v.listen(toggle,'click',() => panel.hidden ? show() : close(),undefined,true);
    v.listen(window,'pointerdown', e => { if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) close(false); },true,true);
    v.listen(root,'focusout',() => { if (waiting) { cancelCapture(); message(''); refresh(); } },undefined,true);
    v.listen(panel,'keydown',e => {
      if (e.code !== 'Tab' || typeof panel.querySelectorAll !== 'function') return;
      const items = Array.from(panel.querySelectorAll('button,input,select,summary,[tabindex]')).filter(el => !el.disabled && el.getClientRects().length);
      if (!items.length) return; const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },undefined,true);
    style = v.el('style','',document.head); style.id = 'vd-settings-style'; style.textContent = `
      #vd-hud .vd-top{z-index:3}#vd-hud .vd-widget{z-index:1}
      #vd-hud .vd-settings-backdrop{position:absolute;z-index:4;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#09080d66;pointer-events:auto}
      #vd-hud .vd-settings{display:flex;flex-direction:column;width:780px;max-width:100%;max-height:100%;min-height:0;overflow:hidden;padding:0;background:#1b1920f2;border:1px solid #81728b66;border-radius:3px;pointer-events:auto;color:#c9c3d2;font-size:12px}
      #vd-hud .vd-settings-head{display:flex;align-items:center;justify-content:space-between;flex:none;padding:10px 14px;border-bottom:1px solid #77708033}#vd-hud .vd-settings-head h2{margin:0;font-size:15px;font-weight:500;color:#ddd6e8}
      #vd-hud .vd-settings-sections{display:grid;grid-template-columns:1fr .9fr 1.2fr;align-items:start;gap:16px;padding:14px;overflow:auto;min-height:0;scrollbar-width:thin}
      #vd-hud .vd-setting-section{min-width:0}#vd-hud .vd-setting-section summary{list-style:none;padding:5px 0 9px;cursor:pointer;font-size:12px;font-weight:500;color:#c8c2d1;outline-offset:-2px}
      #vd-hud .vd-setting-section summary::-webkit-details-marker{display:none}#vd-hud .vd-setting-section summary:focus-visible{outline:1px solid #b6a1df;outline-offset:-2px}#vd-hud .vd-setting-section summary::after{content:'›';float:right;color:#8e839e}#vd-hud .vd-setting-section[open] summary::after{content:'⌄'}
      #vd-hud .vd-setting-section summary:hover{color:#e1d5f2}#vd-hud .vd-setting-body{padding:0}#vd-hud .vd-setting-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:31px;color:#a9a1b6;font-size:11px}
      #vd-hud .vd-setting-row select{width:58%}
      #vd-hud .vd-setting-row input{accent-color:#a58acb;cursor:pointer}#vd-hud .vd-setting-row input[type=checkbox]{appearance:none;width:13px;height:13px;margin:0;border:1px solid #81728b88;border-radius:2px;background:#201d26;box-shadow:none}#vd-hud .vd-setting-row input[type=checkbox]:checked{border-color:#ac96ca99;background:#a58acb22}#vd-hud .vd-setting-row input[type=checkbox]:checked::after{content:'✓';display:block;color:#d4c3ed;text-align:center;font:10px/11px 'Segoe UI',sans-serif}
      #vd-hud .vd-setting-row button{font-size:10px;height:25px;border-color:#81728b44;min-width:50px;padding:0 6px}
      #vd-hud .vd-volume{display:grid;grid-template-columns:1fr auto;gap:4px;margin:7px 0;font-size:11px;color:#a9a1b6}#vd-hud .vd-volume output{font-variant-numeric:tabular-nums;color:#b7aac7}#vd-hud .vd-volume input{grid-column:1/-1;width:100%;margin:0;accent-color:#a58acb;cursor:pointer}
      #vd-hud .vd-settings-footer{flex:none;display:flex;align-items:center;gap:12px;padding:8px 14px;border-top:1px solid #77708033}#vd-hud .vd-setting-exit{justify-content:flex-start;width:auto;max-width:100%;height:34px;padding:0 8px;font-size:11px}#vd-hud .vd-setting-exit svg{width:15px;height:15px}#vd-hud .vd-setting-note,#vd-hud .vd-settings-status{font-size:10px;color:#968aab;line-height:1.5;margin:4px 0 0}#vd-hud .vd-settings-status{padding:0;flex:1}#vd-hud .vd-settings-status:empty{display:none}
      @media(max-width:720px){#vd-hud .vd-settings-sections{grid-template-columns:1fr 1fr;gap:12px}#vd-hud #vd-settings-controls{grid-column:1/-1}#vd-hud #vd-settings-controls .vd-setting-body{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}#vd-hud .vd-setting-note{grid-column:1/-1}}
      @media(max-width:480px){#vd-hud .vd-settings-backdrop{padding:10px}#vd-hud .vd-settings-sections{grid-template-columns:1fr}#vd-hud #vd-settings-controls .vd-setting-body{grid-template-columns:1fr}#vd-hud .vd-settings-footer{align-items:flex-start;flex-direction:column;gap:2px}}
    `;
    refresh();
  }
  function stop() {
    cancelCapture(); if (backdrop) backdrop.remove(); if (style) style.remove();
    panel = backdrop = sections = footer = closeButton = toggle = style = status = view = fullscreen = layer = null; controls = []; sound = [];
  }
  v.settings = { mount, show, close, capture, refresh, stop, get open() { return !!panel && !panel.hidden; } };
})();
