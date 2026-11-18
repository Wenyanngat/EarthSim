(function () {
  'use strict';
  const v = window.VoluntasHUD;
  const widthKey = 'voluntas.layerDrawerWidth';
  let panel, handle, legend, anchor, viewButtons, open = false, drag = null;
  let requestedWidth = 336;

  function resize() {
    if (!panel) return;
    const maxWidth = Math.min(780, Math.max(150, Math.floor(innerWidth * .56)));
    panel.style.width = clamp(requestedWidth, Math.min(240, maxWidth), maxWidth) + 'px';
  }

  function setOpen(value) {
    open = value;
    panel.hidden = !open;
    handle.setAttribute('aria-expanded', String(open));
    handle.textContent = open ? '›' : '‹';
  }

  function update() {
    for (const [enabled, button] of viewButtons || []) {
      button.setAttribute('aria-pressed', String(enabled === !!window.mode3D));
    }
  }

  function mount(root) {
    const dock = v.el('aside', 'vd-layer-drawer', root);
    panel = v.el('div', 'vd-layer-panel', dock);
    panel.id = 'vd-layer-panel';
    const views = v.el('div', 'vd-layer-views', panel);
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', T('Вид карты', 'Map view'));
    viewButtons = [false, true].map(enabled => {
      const label = enabled ? '3D' : '2D';
      const button = v.button(views, 'vd-layer-view-' + label.toLowerCase(), '', label);
      button.textContent = label;
      v.listen(button, 'click', () => {
        if (enabled !== !!window.mode3D) voluntasToggleView();
        update();
      });
      return [enabled, button];
    });

    legend = document.getElementById('legend');
    anchor = document.createComment('Map layers');
    legend.before(anchor);
    panel.append(legend);
    handle = v.button(dock, 'vd-layer-handle', '', T('Слои карты', 'Map layers'));
    handle.setAttribute('aria-controls', panel.id);
    const savedWidth = Number(localStorage.getItem(widthKey));
    if (savedWidth > 0) requestedWidth = savedWidth;
    resize();
    setOpen(open);
    update();

    v.listen(window, 'resize', resize);
    v.listen(handle, 'pointerdown', event => {
      if (event.button !== 0) return;
      drag = {id: event.pointerId, from: event.clientX, moved: false, width: panel.getBoundingClientRect().width};
      handle.setPointerCapture(event.pointerId);
    });
    v.listen(handle, 'pointermove', event => {
      if (drag?.id !== event.pointerId || (!drag.moved && Math.abs(event.clientX - drag.from) < 5)) return;
      drag.moved = true;
      requestedWidth = drag.width + drag.from - event.clientX;
      resize();
      setOpen(true);
    });
    v.listen(handle, 'pointerup', event => {
      if (drag?.id !== event.pointerId || !drag.moved) return;
      requestedWidth = panel.getBoundingClientRect().width;
      localStorage.setItem(widthKey, String(requestedWidth));
    });
    v.listen(handle, 'pointercancel', () => { drag = null; });
    v.listen(handle, 'click', event => {
      if (!event.detail || !drag?.moved) setOpen(!open);
      drag = null;
    });
  }

  function stop() {
    document.getElementById('mapov-pop')?.remove();
    if (anchor) anchor.replaceWith(legend);
    panel = handle = legend = anchor = viewButtons = drag = null;
    open = false;
  }
  v.layerDrawer = {mount, update, stop};
})();
