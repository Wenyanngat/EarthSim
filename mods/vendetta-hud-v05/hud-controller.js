(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.controller) return;
  let root = null, style = null, timer = null;
  const svg = content => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>';
  v.icons = { pause: svg('<path d="M9 6v12M15 6v12"/>'), play: svg('<path d="m9 5 11 7-11 7z"/>'),
    exit: svg('<path d="M14 8V4H4v16h10v-4M10 12h11m-4-4 4 4-4 4"/>'),
    settings: svg('<path d="M10 3h4l.6 2.4 1.3.8 2.4-.7 2 3.4-1.8 1.7v2.8l1.8 1.7-2 3.4-2.4-.7-1.3.8L14 21h-4l-.6-2.4-1.3-.8-2.4.7-2-3.4 1.8-1.7v-2.8L3.7 8.9l2-3.4 2.4.7 1.3-.8z"/><circle cx="12" cy="12" r="3"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    map: svg('<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2zM9 3v15m6-12v15"/>'),
    person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>') };
  v.el = (tag, cls, host) => { const el = document.createElement(tag); if (cls) el.className = cls; if (host) host.appendChild(el); return el; };
  v.button = (host, id, html, label) => { const b = v.el('button', '', host); b.type = 'button'; b.id = id; b.innerHTML = html; b.title = label; b.setAttribute('aria-label', label); return b; };
  const css = `
  #vendetta-hud{position:fixed;inset:0;z-index:960;pointer-events:none;color:#e4e0ec;font:13px/1.4 'Segoe UI',system-ui,sans-serif;--vt-line:#ffffff14;--vt-accent:#b6a1df;--vt-widget-width:208px}
  #vendetta-hud *{box-sizing:border-box}#vendetta-hud [hidden]{display:none!important}
  #vendetta-hud button{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;background:transparent;color:#aaa4b6;border-radius:3px;min-width:30px;height:30px;padding:0 8px;font:inherit;cursor:pointer;transition:background 140ms,color 140ms,border-color 140ms}
  #vendetta-hud button:hover{background:#ffffff0b;color:#f3effb}#vendetta-hud button:focus-visible,#vendetta-hud canvas:focus-visible{outline:2px solid #b6a1df;outline-offset:2px}
  #vendetta-hud button[aria-pressed=true]{color:#e1d4fc;background:#a58acb22;border-color:#b6a1df33}
  #vendetta-hud svg{width:18px;height:18px;flex:none}#vendetta-hud .vt-top{height:54px;position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid var(--vt-line);background:linear-gradient(180deg,#19171feb,#19171fc9);backdrop-filter:blur(12px);pointer-events:auto}
  #vendetta-hud .vt-brand{font-size:12px;letter-spacing:.28em;font-weight:650;color:#e4ddec}#vendetta-hud .vt-top-left{display:flex;align-items:center;gap:14px;min-width:0}#vendetta-hud .vt-top-right{display:flex;align-items:center;gap:9px;flex:none}
  #vendetta-hud .vt-time{display:flex;align-items:center;gap:1px;padding:2px;border:1px solid #77708044;border-radius:3px;background:#19181f88}
  #vendetta-hud .vt-time button{height:26px;min-width:29px;padding:0 6px}#vendetta-hud .vt-clock{font-size:11px;color:#b2abba;white-space:nowrap;font-variant-numeric:tabular-nums;margin-right:3px}
  #vendetta-hud .vt-widget{position:absolute;bottom:0;left:0;width:var(--vt-widget-width);max-width:100%;margin:0;border:0;border-top:1px solid #82758f44;border-right:1px solid #82758f44;border-radius:0;box-shadow:none;background:#1b1920eb;pointer-events:auto;overflow:hidden}
  #vendetta-hud .vt-tabs{display:flex;padding:4px 4px 0;gap:3px}#vendetta-hud .vt-tabs button{flex:none;width:26px;min-width:26px;height:26px;padding:0;border-radius:2px}#vendetta-hud .vt-tabs svg{width:15px;height:15px}
  #vendetta-hud .vt-tabs button[aria-pressed=true]{background:#a58acb12;border-color:#b6a1df66;color:#c3b0de}
  #vendetta-hud .vt-widget-body{padding:4px}#vendetta-hud .vt-mini-frame{position:relative;overflow:hidden;background:#102638;border:1px solid #9a8aa04d;border-radius:0}
  #vendetta-hud #vendetta-minimap{display:block;width:100%;height:100%;cursor:crosshair;touch-action:none}#vendetta-hud .vt-mini-marker{position:absolute;border:1px solid #e0d3ff;background:#c7b1f211;pointer-events:none;box-shadow:0 0 0 1px #17141f55}
  #vendetta-hud .vt-character{min-height:148px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:8px}
  #vendetta-hud .vt-portrait{width:48px;height:48px;border:1px solid #b6a1df29;border-radius:50%;display:grid;place-items:center;color:#8b7a9c;background:#b6a1df09}#vendetta-hud .vt-portrait svg{width:24px;height:24px}
  #vendetta-hud .vt-character strong{font-size:11px;font-weight:500;color:#c8c0d5}#vendetta-hud .vt-character-fields{font-size:10px;line-height:1.8;color:#888092}
  @media(max-width:700px){#vendetta-hud{--vt-widget-width:180px}#vendetta-hud .vt-top{padding:0 10px}#vendetta-hud .vt-brand{letter-spacing:.15em;font-size:10px}#vendetta-hud .vt-clock{font-size:10px}#vendetta-hud button{min-width:28px;padding:0 6px}}
  @media(max-height:480px){#vendetta-hud{--vt-widget-width:154px}#vendetta-hud .vt-character{min-height:108px;gap:4px}#vendetta-hud .vt-portrait{width:32px;height:32px}}
  @media(max-width:450px){#vendetta-hud .vt-brand{letter-spacing:.08em}#vendetta-hud .vt-clock{display:none}#vendetta-hud .vt-top-right{gap:4px}#vendetta-hud .vt-top-left{gap:8px}}
  @media(max-width:600px){#vendetta-hud{--vt-widget-width:clamp(72px,25vw,154px)}}
  @media(prefers-reduced-motion:reduce){#vendetta-hud button{transition:none}}`;
  function update() { if (!root || !v.active) return; if (v.settings.open && v.mana.visible) v.mana.hide(); v.time.update(); v.minimap.update(performance.now()); }
  function start() {
    if (root || !v.active) return;
    try {
      style = v.el('style', '', document.head); style.id = 'vendetta-ui-style'; style.textContent = css;
      root = v.el('div', '', document.body); root.id = 'vendetta-hud';
      v.listen(root, 'keydown', e => { if (v.settings.open || ['Tab', 'Enter', 'Space'].includes(e.code)) e.stopPropagation(); }, undefined, true);
      v.topBar.mount(root); v.switcher.mount(root); v.abilityPanel.mount(root); v.edge.start(); update(); timer = setInterval(update, 200);
    } catch (e) { stop(); throw e; }
  }
  function stop() {
    clearInterval(timer); timer = null; v.edge.stop(); v.mana.stop(); v.abilityPanel.stop(); v.settings.stop(); v.time.stop(); v.minimap.stop(); v.switcher.stop();
    if (root) root.remove(); if (style) style.remove(); root = style = null;
  }
  v.controller = { start, stop, update };
  v.exitUI = { show: start, hide: stop };
  v.dispose = () => { if (v.disposed) return; v.session.cleanup(); v.menu.dispose(); v.drain(v.cleanups); v.disposed = true; v.phase = 'idle'; };
  v.install = () => {
    if (v.installed || v.disposed) return; v.installed = true;
    try {
      v.hud.install(); v.session.install(); v.edge.install();
      v.after('showMainMenu', () => v.menu.mount()); v.after('hideMainMenu', () => v.menu.close());
      for (const name of ['worldgen', 'buildBase']) v.after(name, () => v.minimap.invalidate());
      v.listen(window, 'pagehide', () => v.dispose());
      v.listen(window, 'error', e => { if (v.phase === 'booting') v.session.fail('Ошибка запуска: ' + e.message); });
      v.listen(window, 'unhandledrejection', () => { if (v.phase === 'booting') v.session.fail('Ошибка асинхронного запуска TEST.'); });
    } catch (e) { v.session.fail('Несовместимая версия игры: ' + e.message); }
  };
  ModAPI.ready(v.install);
})();
