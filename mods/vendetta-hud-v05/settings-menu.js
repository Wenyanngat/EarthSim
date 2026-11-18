(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.settings) return;
  let panel, backdrop, sections, footer, toggle, closeButton, style, status, controls = [], sound = [], view, fullscreen, waiting = null;
  const actions = [['pause','Пауза / пуск'],['toggle3d','Вид 2D / 3D'],['camF','Вперёд'],['camB','Назад'],['camL','Влево'],['camR','Вправо'],['camQL','Поворот влево'],['camQR','Поворот вправо']];
  function hasKeys() { return typeof KEYS !== 'undefined' && ['capture','cancel','capturing','canBind','owner','set','cur','name'].every(k => typeof KEYS[k] === 'function') && KEYS.byId; }
  function cancelCapture() { if (waiting && hasKeys()) KEYS.cancel(); waiting = null; }
  function message(text) { if (status) status.textContent = text; }
  function refresh() {
    for (const [id, button] of controls) button.textContent = waiting === id ? 'Нажмите…' : KEYS.name(KEYS.cur(id));
    if (sound.length) { const s = SFX.settings(); for (const [key, input, output] of sound) {
      if (input.type === 'checkbox') input.checked = !!s[key]; else { input.value = String(Math.round(s[key] * 100)); output.textContent = input.value + '%'; }
    } }
    if (view) view.checked = !!window.mode3D;
    if (fullscreen) fullscreen.checked = isFullscreen();
  }
  function capture(id) {
    if (!v.active || !hasKeys() || !controls.some(row => row[0] === id)) return;
    cancelCapture(); waiting = id; message('Нажмите новую клавишу. Esc — отмена.'); refresh();
    KEYS.capture(code => {
      waiting = null;
      if (!v.active || !panel || panel.hidden) return;
      if (code === 'Escape') message('Назначение отменено.');
      else if (!KEYS.canBind(code)) message('Эту клавишу назначить нельзя.');
      else {
        const owner = KEYS.owner(id, code);
        if (owner) message('Клавиша уже занята другим действием.');
        else message(KEYS.set(id, code) ? 'Клавиша сохранена.' : 'Не удалось изменить клавишу.');
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
    const details = v.el('details', 'vt-setting-section', sections); details.id = id; details.open = true;
    const summary = v.el('summary', '', details); summary.textContent = label;
    v.listen(details, 'toggle', () => { if (!details.open) { cancelCapture(); message(''); refresh(); } }, undefined, true);
    return v.el('div', 'vt-setting-body', details);
  }
  function check(host, id, label, onChange) {
    const row = v.el('label', 'vt-setting-row', host); row.htmlFor = id;
    const text = v.el('span', '', row); text.textContent = label;
    const input = v.el('input', '', row); input.id = id; input.type = 'checkbox';
    v.listen(input, 'change', () => { onChange(input.checked); refresh(); }, undefined, true); return input;
  }
  function volume(host, key, title, setter) {
    const row = v.el('label', 'vt-volume', host); row.htmlFor = 'vendetta-' + key;
    const text = v.el('span', '', row); text.textContent = title;
    const output = v.el('output', '', row);
    const input = v.el('input', '', row); input.id = 'vendetta-' + key; input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1';
    sound.push([key, input, output]);
    v.listen(input, 'input', () => { setter(Number(input.value) / 100); output.textContent = input.value + '%'; }, undefined, true);
  }
  function mount(host, root) {
    if (panel) return;
    toggle = v.button(host, 'vendetta-settings-toggle', v.icons.settings, 'Настройки'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'vendetta-settings'); toggle.setAttribute('aria-haspopup', 'dialog');
    backdrop = v.el('div', 'vt-settings-backdrop', root); backdrop.id = 'vendetta-settings-backdrop'; backdrop.hidden = true;
    panel = v.el('section', 'vt-settings', backdrop); panel.id = 'vendetta-settings'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'vendetta-settings-title');
    const header = v.el('header','vt-settings-head',panel), title = v.el('h2','',header); title.id = 'vendetta-settings-title'; title.textContent = 'Настройки';
    closeButton = v.button(header,'vendetta-settings-close',v.icons.close,'Закрыть настройки'); v.listen(closeButton,'click',() => close(),undefined,true);
    sections = v.el('div','vt-settings-sections',panel);
    if (typeof SFX !== 'undefined' && ['settings','setOn','setMusic','setVol','setMusicVol'].every(k => typeof SFX[k] === 'function')) {
      const body = section('Звук', 'vendetta-settings-sound');
      sound.push(['on', check(body,'vendetta-sound-on','Звук', value => SFX.setOn(value))]);
      sound.push(['music', check(body,'vendetta-music-on','Музыка', value => SFX.setMusic(value))]);
      volume(body, 'vol', 'Общая громкость', value => SFX.setVol(value)); volume(body, 'mvol', 'Музыка', value => SFX.setMusicVol(value));
    }
    const canView = typeof toggle3D === 'function' && typeof set3DMode === 'function';
    const canFullscreen = !!(window.nw && nw.Window) && typeof setFullscreen === 'function' && typeof isFullscreen === 'function';
    if (canView || canFullscreen) {
      const body = section('Интерфейс', 'vendetta-settings-interface');
      if (canView) view = check(body,'vendetta-setting-3d','Объёмная карта', value => {
        if (value !== !!window.mode3D) toggle3D();
        if (value !== !!window.mode3D) message('3D-вид недоступен на этом устройстве.');
      });
      if (canFullscreen) fullscreen = check(body,'vendetta-setting-fullscreen','Полный экран', value => setFullscreen(value));
    }
    if (hasKeys()) {
      const available = actions.filter(([id]) => KEYS.byId[id]);
      if (available.length) {
        const body = section('Управление', 'vendetta-settings-controls');
        for (const [id, title] of available) {
          const row = v.el('div', 'vt-setting-row', body); const text = v.el('span','',row); text.textContent = title;
          const button = v.button(row, 'vendetta-bind-' + id, '', 'Назначить: ' + title); controls.push([id, button]); v.listen(button,'click',() => capture(id),undefined,true);
        }
        const note = v.el('p','vt-setting-note',body); note.textContent = 'Назначения сохраняются в настройках игры.';
      }
    }
    footer = v.el('footer','vt-settings-footer',panel);
    const exit = v.button(footer, 'vendetta-exit', v.icons.exit + '<span>Выход в главное меню</span>', 'Выход в главное меню'); exit.className = 'vt-setting-exit';
    v.listen(exit,'click',() => { close(false); v.session.exit(); },undefined,true);
    status = v.el('p','vt-settings-status',footer); status.id = 'vendetta-settings-status'; status.setAttribute('role','status');
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
    style = v.el('style','',document.head); style.id = 'vendetta-settings-style'; style.textContent = `
      #vendetta-hud .vt-top{z-index:3}#vendetta-hud .vt-widget{z-index:1}
      #vendetta-hud .vt-settings-backdrop{position:absolute;z-index:4;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#09080d66;pointer-events:auto}
      #vendetta-hud .vt-settings{display:flex;flex-direction:column;width:780px;max-width:100%;max-height:100%;min-height:0;overflow:hidden;padding:0;background:#1b1920f2;border:1px solid #81728b66;border-radius:3px;pointer-events:auto;color:#c9c3d2;font-size:12px}
      #vendetta-hud .vt-settings-head{display:flex;align-items:center;justify-content:space-between;flex:none;padding:10px 14px;border-bottom:1px solid #77708033}#vendetta-hud .vt-settings-head h2{margin:0;font-size:15px;font-weight:500;color:#ddd6e8}
      #vendetta-hud .vt-settings-sections{display:grid;grid-template-columns:1fr .9fr 1.2fr;align-items:start;gap:16px;padding:14px;overflow:auto;min-height:0;scrollbar-width:thin}
      #vendetta-hud .vt-setting-section{min-width:0}#vendetta-hud .vt-setting-section summary{list-style:none;padding:5px 0 9px;cursor:pointer;font-size:12px;font-weight:500;color:#c8c2d1;outline-offset:-2px}
      #vendetta-hud .vt-setting-section summary::-webkit-details-marker{display:none}#vendetta-hud .vt-setting-section summary:focus-visible{outline:1px solid #b6a1df;outline-offset:-2px}#vendetta-hud .vt-setting-section summary::after{content:'›';float:right;color:#8e839e}#vendetta-hud .vt-setting-section[open] summary::after{content:'⌄'}
      #vendetta-hud .vt-setting-section summary:hover{color:#e1d5f2}#vendetta-hud .vt-setting-body{padding:0}#vendetta-hud .vt-setting-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:31px;color:#a9a1b6;font-size:11px}
      #vendetta-hud .vt-setting-row input{accent-color:#a58acb;cursor:pointer}#vendetta-hud .vt-setting-row input[type=checkbox]{appearance:none;width:13px;height:13px;margin:0;border:1px solid #81728b88;border-radius:2px;background:#201d26;box-shadow:none}#vendetta-hud .vt-setting-row input[type=checkbox]:checked{border-color:#ac96ca99;background:#a58acb22}#vendetta-hud .vt-setting-row input[type=checkbox]:checked::after{content:'✓';display:block;color:#d4c3ed;text-align:center;font:10px/11px 'Segoe UI',sans-serif}
      #vendetta-hud .vt-setting-row button{font-size:10px;height:25px;border-color:#81728b44;min-width:50px;padding:0 6px}
      #vendetta-hud .vt-volume{display:grid;grid-template-columns:1fr auto;gap:4px;margin:7px 0;font-size:11px;color:#a9a1b6}#vendetta-hud .vt-volume output{font-variant-numeric:tabular-nums;color:#b7aac7}#vendetta-hud .vt-volume input{grid-column:1/-1;width:100%;margin:0;accent-color:#a58acb;cursor:pointer}
      #vendetta-hud .vt-settings-footer{flex:none;display:flex;align-items:center;gap:12px;padding:8px 14px;border-top:1px solid #77708033}#vendetta-hud .vt-setting-exit{justify-content:flex-start;width:auto;max-width:100%;height:34px;padding:0 8px;font-size:11px}#vendetta-hud .vt-setting-exit svg{width:15px;height:15px}#vendetta-hud .vt-setting-note,#vendetta-hud .vt-settings-status{font-size:10px;color:#968aab;line-height:1.5;margin:4px 0 0}#vendetta-hud .vt-settings-status{padding:0;flex:1}#vendetta-hud .vt-settings-status:empty{display:none}
      @media(max-width:720px){#vendetta-hud .vt-settings-sections{grid-template-columns:1fr 1fr;gap:12px}#vendetta-hud #vendetta-settings-controls{grid-column:1/-1}#vendetta-hud #vendetta-settings-controls .vt-setting-body{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}#vendetta-hud .vt-setting-note{grid-column:1/-1}}
      @media(max-width:480px){#vendetta-hud .vt-settings-backdrop{padding:10px}#vendetta-hud .vt-settings-sections{grid-template-columns:1fr}#vendetta-hud #vendetta-settings-controls .vt-setting-body{grid-template-columns:1fr}#vendetta-hud .vt-settings-footer{align-items:flex-start;flex-direction:column;gap:2px}}
    `;
    refresh();
  }
  function stop() {
    cancelCapture(); if (backdrop) backdrop.remove(); if (style) style.remove();
    panel = backdrop = sections = footer = closeButton = toggle = style = status = view = fullscreen = null; controls = []; sound = [];
  }
  v.settings = { mount, show, close, capture, refresh, stop, get open() { return !!panel && !panel.hidden; } };
})();
