(function () {
  'use strict';
  const v = window.VendettaTest;
  if (!v || v.version !== '0.5.0' || v.mana) return;

  let element = null, trigger = null, panel = null, style = null, closeTimer = null;
  let hovered = false, focused = false;
  const listeners = [];
  function listen(target, type, fn) {
    v.listen(target, type, fn, undefined, true);
    listeners.push(() => target.removeEventListener(type, fn));
  }
  function cancelClose() { clearTimeout(closeTimer); closeTimer = null; }
  function place() {
    if (!element || !panel || panel.hidden) return;
    const rect = element.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(220, Math.max(0, viewport - 16));
    const left = Math.max(8, Math.min(rect.left, viewport - width - 8));
    panel.style.width = width + 'px'; panel.style.left = (left - rect.left) + 'px';
  }
  function hide() {
    cancelClose(); hovered = focused = false;
    if (panel) { panel.hidden = true; panel.setAttribute('aria-hidden', 'true'); }
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
  function show() {
    cancelClose();
    if (!element || !v.active || v.disposed || (v.settings && v.settings.open)) return;
    panel.hidden = false; panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true'); place();
  }
  function scheduleClose() {
    cancelClose();
    if (hovered || focused) return;
    closeTimer = setTimeout(() => { closeTimer = null; if (!hovered && !focused) hide(); }, 140);
  }
  function mount(host) {
    if (element) return element;
    style = v.el('style', '', document.head); style.id = 'vendetta-mana-style';
    style.textContent = `
      #vendetta-hud .vt-mana{position:relative;display:inline-flex;align-items:center;flex:none;align-self:center;pointer-events:auto}
      #vendetta-hud .vt-mana-trigger{display:inline-flex;align-items:center;gap:4px;height:28px;padding:2px 4px;cursor:default;border-radius:2px;outline-offset:2px}
      #vendetta-hud .vt-mana-trigger:focus-visible{outline:1px solid #a7b7ce}
      #vendetta-hud #vendetta-mana-icon{display:block;width:18px;height:18px;flex:none;overflow:visible}
      #vendetta-hud .vt-mana-value{color:#bfd0df;font-size:21px;font-weight:400;line-height:1;font-variant-numeric:lining-nums}
      #vendetta-hud .vt-mana-panel{position:absolute;z-index:4;left:0;top:calc(100% + 13px);width:220px;max-width:calc(100vw - 16px);min-height:64px;box-sizing:border-box;background:#1b1d24f5;border:1px solid #70839c77;border-radius:2px;box-shadow:none;pointer-events:auto}
      #vendetta-hud .vt-mana-panel::before{content:'';position:absolute;left:-1px;right:-1px;top:-14px;height:14px;pointer-events:auto}
      @media(max-width:450px){#vendetta-hud .vt-mana-trigger{padding:2px 0;gap:2px}#vendetta-hud .vt-mana-value{font-size:18px}}
    `;
    element = v.el('div', 'vt-mana', host); element.id = 'vendetta-mana';
    trigger = v.el('span', 'vt-mana-trigger', element); trigger.id = 'vendetta-mana-trigger'; trigger.tabIndex = 0;
    trigger.setAttribute('role', 'group'); trigger.setAttribute('aria-label', 'Божественная мана: бесконечно');
    trigger.setAttribute('aria-controls', 'vendetta-mana-panel'); trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg id="vendetta-mana-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 C10.4 5.6 4.5 10.1 4.5 14.8 C4.5 19 7.8 22 12 22 C16.2 22 19.5 19 19.5 14.8 C19.5 10.1 13.6 5.6 12 2Z" fill="#b7d7eb" fill-opacity="0.62" stroke="#07152E" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="vt-mana-value" aria-hidden="true">∞</span>';
    // Empty by design. Future income/expense/details UI can mount into contentHost.
    panel = v.el('div', 'vt-mana-panel', element); panel.id = 'vendetta-mana-panel'; panel.hidden = true;
    panel.setAttribute('role', 'tooltip'); panel.setAttribute('aria-hidden', 'true');
    listen(element, 'pointerenter', () => { hovered = true; show(); });
    listen(element, 'pointerleave', () => { hovered = false; scheduleClose(); });
    listen(element, 'focusin', () => { focused = true; show(); });
    listen(element, 'focusout', e => { if (!element.contains(e.relatedTarget)) { focused = false; scheduleClose(); } });
    listen(window, 'resize', place);
    listen(window, 'blur', hide);
    return element;
  }
  function stop() {
    hide();
    for (const remove of listeners.splice(0)) remove();
    if (element) element.remove(); if (style) style.remove();
    element = trigger = panel = style = null;
  }
  v.mana = { mount, stop, hide, show, get visible() { return !!panel && !panel.hidden; }, get contentHost() { return panel; } };
})();
