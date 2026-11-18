(function () {
  'use strict';
  const v = window.VoluntasHUD; if (!v || v.hud) return;
  // Hide the map HUD while keeping the stock menu, dialogs and Walk UI available.
  const ids = ['hud', 'tools-col', 'inspector', 'hint3d', 'stage-hint',
    'goals-dock', 'net-dock', 'planet', 'coach', 'brush-cursor', 'cursor-tip', 'cursor-tip3d',
    'ach-toasts', 'perf-hud', 'ui-tip', 'ui-ttl', 'ui-toasts', 'ui-toasts-over', 'mm-flash',
    'tut-root', 'tut-hints', 'tut-offer'];
  let style = null;
  function hide() {
    if (style) return;
    document.documentElement.setAttribute('data-voluntas', 'active');
    style = document.createElement('style'); style.id = 'vd-hud-style';
    const scope = 'html[data-voluntas] ';
    style.textContent = ids.map(id => scope + '#' + id + '[id]').join(',') + '{display:none!important}' +
      scope + '#game-shell>#legend{display:none!important}' +
      scope + 'body{overflow:hidden!important;margin:0!important;padding:0!important}' +
      scope + '#game-shell[id]{position:fixed!important;inset:54px 0 0!important;width:100%!important;height:calc(100% - 54px)!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;gap:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;overflow:hidden!important;grid-template-columns:1fr!important;grid-template-rows:1fr!important;grid-template-areas:"stage"!important}' +
      scope + '#game-shell>#stage{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;grid-column:1/-1!important;grid-row:1/-1!important;min-width:0;min-height:0;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:hidden!important}' +
      scope + '#canvas-wrap[id]{position:absolute!important;flex:none!important;max-width:none!important;max-height:none!important;overflow:hidden!important;border:0!important;margin:0!important;padding:0!important;box-shadow:none!important;border-radius:0!important}' +
      scope + '#worldCanvas[id]{display:block!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;transform:none!important}';
    document.head.appendChild(style);
    v.viewport.start();
    window.dispatchEvent(new Event('resize'));
  }
  function restore() { v.viewport.stop(); if (style) { style.remove(); style = null; document.documentElement.removeAttribute('data-voluntas'); window.dispatchEvent(new Event('resize')); } }
  function install() {
    v.viewport.install();
    ModAPI.wrap('_anyModalOpen', orig => v.active ? UI.anyOpen() || MENU_UP || v.settings.open : orig(), v.owner);
    v.before('inspectClick', cell => v.active && v.abilityPanel.inspect(cell) ? false : undefined);
    for (const name of ['armyClick3D', 'findNearestBattle'])
      v.before(name, () => v.active && v.abilityPanel.armed ? false : undefined);
  }
  v.hud = { hide, restore, install };
})();
(function () {
  'use strict';
  const v = window.VoluntasHUD; if (!v || v.controller) return;
  let root = null, style = null, waiting = null, waitText = null, chooseAvatar = null;
  v.icons = {
    pause: 'M9 6v12M15 6v12',
    play: 'm9 5 11 7-11 7z',
    exit: 'M14 8V4H4v16h10v-4M10 12h11m-4-4 4 4-4 4',
    settings: 'M10 3h4l.6 2.4 1.3.8 2.4-.7 2 3.4-1.8 1.7v2.8l1.8 1.7-2 3.4-2.4-.7-1.3.8L14 21h-4l-.6-2.4-1.3-.8-2.4.7-2-3.4 1.8-1.7v-2.8L3.7 8.9l2-3.4 2.4.7 1.3-.8zM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
    close: 'm6 6 12 12M18 6 6 18',
    mana: 'M12 2C10 6 4.5 10 4.5 15a7.5 7.5 0 0 0 15 0C19.5 10 14 6 12 2Z'
  };
  v.el = (tag, cls, host) => { const el = document.createElement(tag); if (cls) el.className = cls; if (host) host.appendChild(el); return el; };
  v.setIcon = (host, path) => {
    if (host.dataset.icon === path) return;
    host.dataset.icon = path;
    const ns = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(ns, 'svg');
    for (const [name, value] of Object.entries({viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'})) icon.setAttribute(name, value);
    const shape = document.createElementNS(ns, 'path');
    shape.setAttribute('d', path);
    icon.append(shape);
    host.querySelector('svg')?.remove();
    host.prepend(icon);
  };
  v.button = (host, id, icon, label) => {
    const button = v.el('button', '', host);
    button.type = 'button';
    button.id = id;
    button.title = label;
    button.setAttribute('aria-label', label);
    if (icon) v.setIcon(button, icon);
    return button;
  };
  const css = `
  #vd-hud{position:fixed;inset:0;z-index:190;pointer-events:none;color:#e4e0ec;font:13px/1.4 'Segoe UI',system-ui,sans-serif;--vd-line:#ffffff14;--vd-accent:#b6a1df;--vd-mini-width:min(396px,37vw,47vh);--vd-avatar-width:clamp(92px,14vw,202px);--vd-widget-width:calc(var(--vd-mini-width) + var(--vd-avatar-width) + 16px)}
  #vd-hud *{box-sizing:border-box}#vd-hud [hidden]{display:none!important}
  #vd-hud button{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;background:transparent;color:#aaa4b6;border-radius:3px;min-width:30px;height:30px;padding:0 8px;font:inherit;cursor:pointer;transition:background 140ms,color 140ms,border-color 140ms}
  #vd-hud button:hover{background:#ffffff0b;color:#f3effb}#vd-hud button:focus-visible,#vd-hud canvas:focus-visible{outline:2px solid #b6a1df;outline-offset:2px}
  #vd-hud button[aria-pressed=true]{color:#e1d4fc;background:#a58acb22;border-color:#b6a1df33}
  #vd-hud svg{width:18px;height:18px;flex:none}#vd-hud .vd-top{height:54px;position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid var(--vd-line);background:linear-gradient(180deg,#19171feb,#19171fc9);backdrop-filter:blur(12px);pointer-events:auto}
  #vd-hud .vd-brand{font-size:12px;letter-spacing:.28em;font-weight:650;color:#e4ddec}#vd-hud .vd-top-left{display:flex;align-items:center;gap:14px;min-width:0}#vd-hud .vd-top-right{display:flex;align-items:center;gap:9px;flex:none}
  #vd-hud .vd-time{display:flex;align-items:center;gap:1px;padding:2px;border:1px solid #77708044;border-radius:3px;background:#19181f88}
  #vd-hud .vd-time button{height:26px;min-width:29px;padding:0 6px}#vd-hud .vd-clock{font-size:11px;color:#b2abba;white-space:nowrap;font-variant-numeric:tabular-nums;margin-right:3px}
  #vd-hud .vd-widget{position:absolute;bottom:0;left:0;display:flex;gap:8px;align-items:flex-end;padding:4px}
  #vd-hud .vd-map-pane{width:var(--vd-mini-width)}
  #vd-hud .vd-mini-frame{position:relative;overflow:hidden;background:#102638;border:1px solid #9a8aa04d}
  #vd-hud #vd-minimap{display:block;width:100%;height:100%;cursor:crosshair;touch-action:none;pointer-events:auto}#vd-hud .vd-mini-marker{position:absolute;border:1px solid #e0d3ff;background:#c7b1f211;pointer-events:none;box-shadow:0 0 0 1px #17141f55}
  #vd-hud .vd-character{position:relative;width:var(--vd-avatar-width);display:grid;justify-items:stretch;gap:0;text-align:center;background:linear-gradient(0deg,#1b1920ed 32px,#211d2d44 78%,transparent)}
  #vd-hud .vd-character .vd-avatar-canvas{height:min(252px,29vh);width:100%;cursor:default}
  #vd-hud .vd-character #vd-walk{height:auto;min-height:32px;border-color:#82758f66;color:#e4e0ec;background:#1b1920eb;font-size:11px}
  #vd-hud .vd-reaction{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);width:max-content;max-width:min(210px, var(--vd-avatar-width));padding:6px 9px;border:1px solid #82758f88;border-radius:4px;background:#19171fed;color:#f3effb;font-size:12px}
  #vd-hud .vd-reaction::after{content:'';position:absolute;width:6px;height:6px;bottom:-4px;left:calc(50% - 3px);transform:rotate(45deg);background:#19171f;border-right:1px solid #82758f88;border-bottom:1px solid #82758f88}
  #vd-hud .vd-stats{display:flex;align-items:center;gap:clamp(4px,1vw,16px);min-width:0;margin:0}
  #vd-hud .vd-stats div{min-width:0}
  #vd-hud .vd-stats dt{font-size:10px;color:#b2abba;white-space:nowrap}
  #vd-hud .vd-stats dd{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:12px;font-variant-numeric:tabular-nums}
  #vd-hud .vd-layer-drawer{position:absolute;right:0;top:54px;bottom:132px}
  #vd-hud .vd-layer-panel{height:100%;overflow:auto;overscroll-behavior:contain;pointer-events:auto;padding:12px;background:#19171ff5;border-left:1px solid #82758f66;border-bottom:1px solid #82758f66}
  #vd-hud #vd-layer-handle{position:absolute;right:100%;top:calc(50vh - 54px);transform:translateY(-50%);min-width:28px;height:60px;padding:0;background:#19171fed;border:1px solid #82758f88;border-radius:5px 0 0 5px;font-size:25px;cursor:ew-resize;touch-action:none}
  #vd-hud .vd-layer-views{display:flex;gap:8px;margin-bottom:8px}
  #vd-hud .vd-layer-views button{border-color:#82758f66}
  #vd-hud #legend{display:grid;gap:12px;min-width:0;padding:0;background:none;border:0;box-shadow:none}
  #vd-hud #layer-toggles{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0}
  #vd-hud #layer-toggles .lg-h{margin-top:5px}
  #vd-hud #layer-toggles .lg-row{display:flex;flex-wrap:wrap;overflow:visible;min-width:0;gap:4px}
  #vd-hud #layer-toggles .layer{min-width:0;white-space:normal;height:auto;min-height:27px;font-size:11px}
  #vd-hud #layer-toggles .layer.active{border-color:#b6a1df66;color:#e1d4fc;background:#a58acb22}
  #vd-hud #layer-toggles #layer-cities{align-self:flex-start;margin-top:5px;outline:none}
  #vd-hud #legend-box{display:flex;flex-wrap:wrap;width:100%;max-width:none;margin:0;min-width:0;gap:6px}
  #vd-hud #legend-label{flex-basis:100%;max-width:none;white-space:normal}
  #vd-hud #hud-hint{display:none}
  @media(max-width:1180px){#vd-hud .vd-brand{display:none}#vd-hud .vd-top{padding:0 10px}}
  @media(max-width:700px){#vd-hud .vd-top-left,#vd-hud .vd-top-right{gap:5px}#vd-hud .vd-clock{display:none}#vd-hud button{min-width:28px;padding:0 6px}}
  @media(prefers-reduced-motion:reduce){#vd-hud button{transition:none}}`;
  const matchCss = `
    body:has(#main-menu.show) #vd-hud{visibility:hidden}
    html[data-voluntas] button[data-a="peace"]{display:none}
    #vd-hud button:disabled{opacity:.5;cursor:default}
    #vd-hud .vd-mana{position:relative}
    #vd-hud #vd-mana svg{fill:#b7d7eb99;stroke:#07152e}
    #vd-hud .vd-mana-value{color:#bfd0df;font-size:19px;font-variant-numeric:tabular-nums}
    #vd-hud .vd-match-record{display:grid;min-width:0;font-size:11px;color:#d4c9e2;line-height:1.35}
    #vd-hud .vd-match-record strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
    #vd-hud .vd-match-record span{white-space:nowrap;color:#b2abba;font-variant-numeric:tabular-nums}
    #vd-hud .vd-mana-details{position:absolute;z-index:4;top:calc(100% + 9px);left:0;padding:12px 14px;min-width:175px;background:#1b1d24f5;border:1px solid #70839c77;white-space:nowrap}
    #vd-hud .vd-mana-details::before{content:'';position:absolute;inset:-10px 0 auto;height:10px}
    #vd-hud .vd-actions{position:absolute;bottom:0;left:calc(var(--vd-widget-width) + 6px);right:6px;max-width:560px;margin-inline:auto;pointer-events:auto;padding:5px 8px 7px;border:1px solid #82758f66;border-bottom:0;background:#1b1920ed}
    #vd-hud .vd-actions.vd-armed{border-color:#b6a1df}
    #vd-hud .vd-action-tabs,#vd-hud .vd-action-grid{display:flex;gap:4px}
    #vd-hud .vd-action-tabs{margin-bottom:4px}
    #vd-hud .vd-action-tabs button{height:24px;font-size:11px}
    #vd-hud .vd-action-tabs button[aria-selected=true]{background:#a58acb22;color:#e1d4fc;border-color:#b6a1df33}
    #vd-hud .vd-action{flex:1;min-width:0}
    #vd-hud .vd-action button{width:100%;height:30px;border-color:#81728b66;gap:6px;font-size:11px}
    #vd-hud .vd-action button small{color:#bfd0df;font-size:10px;white-space:nowrap}
    #vd-hud select{width:100%;min-width:0;background:#25212e;border:1px solid #81728b66;color:#e4e0ec;font:inherit;border-radius:2px}
    #vd-hud .vd-action select{margin-top:4px;font-size:11px}
    #vd-hud .vd-action-status{display:block;font-size:11px;color:#e1d4fc;margin:4px 1px 0}
    #vd-hud .vd-action-status:empty{display:none}
    #vd-hud .vd-wait{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max-content;max-width:90%;padding:24px 30px;text-align:center;border:1px solid #4676a8;background:linear-gradient(#0d1e36,#060f1d);box-shadow:0 10px 50px #0008;color:#d5e4f7;pointer-events:auto}
    #vd-hud .vd-wait p{margin:0}
    #vd-hud #vd-guest-avatar{margin-top:10px;border-color:#4676a8}
    @media(max-width:620px){#vd-hud .vd-action button{height:auto;min-height:30px;flex-wrap:wrap;line-height:1.1;gap:2px}}
  `;
  function update() {
    if (!root) return;
    const inMatch = VOLUNTAS.active;
    root.querySelector('#voluntas-actions').hidden = !inMatch;
    waiting.hidden = inMatch || !voluntasInRoom();
    if (!waiting.hidden) {
      const address = NP.isHost ? _nuLanAddr() : '';
      const count = NP.players.filter(player => player.on).length;
      waitText.textContent = [T('Ожидание игроков', 'Waiting for players'), count + '/2', address].filter(Boolean).join(' · ');
      chooseAvatar.hidden = NP.isHost || NP.waiting || !!VOLUNTAS.ready[NP.id]?.avatar;
    }
    if (v.settings.open) v.mana.hide();
    v.time.update();
    v.mana.update();
    v.stats.update();
    v.matchRecord.update();
    v.abilityPanel.update();
    v.avatarDock.update();
    v.layerDrawer.update();
    v.minimap.update(performance.now());
  }
  function start() {
    if (root) return;
    v.listeners = new AbortController();
    v.mounted = true;
    try {
      style = v.el('style', '', document.head); style.id = 'vd-ui-style'; style.textContent = css + matchCss;
      root = v.el('div', '', document.body); root.id = 'vd-hud';
      v.listen(root, 'keydown', event => {
        if (!v.settings.open && event.target.id === 'vd-minimap' && /^Arrow/.test(event.code)) {
          event.preventDefault();
          v.minimap.nudge(event.code);
        }
        if (event.code !== 'Escape' || v.settings.open) event.stopPropagation();
      });
      const bar = v.el('header', 'vd-top', root);
      const left = v.el('div', 'vd-top-left', bar);
      v.el('div', 'vd-brand', left).textContent = 'VOLUNTAS DEVINA';
      v.mana.mount(left);
      v.stats.mount(left);
      v.matchRecord.mount(left);
      const right = v.el('div', 'vd-top-right', bar);
      v.time.mount(right);
      v.settings.mount(right, root);
      v.avatarDock.mount(root);
      v.layerDrawer.mount(root);
      v.abilityPanel.mount(root);
      waiting = v.el('div', 'vd-wait', root);
      waitText = v.el('p', '', waiting);
      waitText.setAttribute('role', 'status');
      chooseAvatar = v.button(waiting, 'vd-guest-avatar', '', T('Выбрать аватар', 'Choose avatar'));
      chooseAvatar.textContent = chooseAvatar.title;
      v.listen(chooseAvatar, 'click', voluntasChooseGuestAvatar);
      v.hud.hide();
      v.edge.start();
      update();
    } catch (e) { stop(); throw e; }
  }
  function stop() {
    if (!v.mounted) return;
    v.mounted = false;
    v.listeners.abort();
    v.edge.stop();
    v.mana.stop();
    v.stats.stop();
    v.matchRecord.stop();
    v.abilityPanel.stop();
    v.settings.stop();
    v.time.stop();
    v.minimap.stop();
    v.avatarDock.stop();
    v.layerDrawer.stop();
    v.hud.restore();
    root?.remove();
    style?.remove();
    root = style = waiting = waitText = chooseAvatar = null;
  }
  v.controller = { start, stop, update };
  ModAPI.ready(() => {
    v.hud.install();
    v.edge.install();
    for (const name of ['worldgen', 'buildBase']) v.after(name, () => v.minimap.invalidate());
    window.addEventListener('pagehide', stop, {once:true});
  });
})();
