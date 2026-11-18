(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.characterPanel) return;
  v.characterPanel = { mount(host) {
    const pane = v.el('section', 'vt-character', host); pane.id = 'vendetta-character'; pane.hidden = true;
    const portrait = v.el('div', 'vt-portrait', pane); portrait.innerHTML = v.icons.person; portrait.setAttribute('aria-hidden', 'true');
    const name = v.el('strong', '', pane); name.textContent = 'Персонаж не выбран';
    const fields = v.el('div', 'vt-character-fields', pane); fields.textContent = 'Имя —';
    const attributes = v.el('div', '', fields); attributes.textContent = 'Характеристики —';
    return pane;
  } };
})();
