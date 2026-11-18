(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.topBar) return;
  v.topBar = { mount(root) {
    const bar = v.el('header', 'vt-top', root); bar.id = 'vendetta-top-bar';
    const left = v.el('div', 'vt-top-left', bar);
    const brand = v.el('div', 'vt-brand', left); brand.textContent = 'VENDETTA';
    v.mana.mount(left);
    const right = v.el('div', 'vt-top-right', bar); v.time.mount(right);
    v.settings.mount(right, root);
    return bar;
  } };
})();
