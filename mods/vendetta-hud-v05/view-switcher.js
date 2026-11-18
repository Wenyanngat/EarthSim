(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.switcher) return;
  let map, character, buttons = [], selected = 'map';
  function select(name) {
    if (!map || !['map', 'character'].includes(name)) return; selected = name;
    map.hidden = name !== 'map'; character.hidden = name !== 'character';
    for (const [key, b] of buttons) b.setAttribute('aria-pressed', String(key === name));
    if (name === 'map') v.minimap.update(performance.now());
  }
  function mount(root) {
    const widget = v.el('aside', 'vt-widget', root); widget.id = 'vendetta-widget'; widget.setAttribute('aria-label', 'Карта и персонаж');
    const tabs = v.el('div', 'vt-tabs', widget); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Виджет');
    for (const [key, text, icon] of [['map','Миникарта',v.icons.map],['character','Персонаж',v.icons.person]]) {
      const b = v.button(tabs, 'vendetta-view-' + key, icon, text); buttons.push([key, b]);
      v.listen(b, 'click', () => select(key), undefined, true);
    }
    const body = v.el('div', 'vt-widget-body', widget); map = v.minimap.mount(body); character = v.characterPanel.mount(body); select('map');
  }
  function stop() { buttons = []; map = character = null; selected = 'map'; }
  v.switcher = { mount, select, stop, get selected() { return selected; } };
})();
