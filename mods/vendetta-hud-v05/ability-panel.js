(function () {
  'use strict';
  const v = window.VendettaTest;
  if (!v || v.version !== '0.5.0' || v.abilityPanel) return;
  let panel = null, style = null;

  function mount(root) {
    if (panel) return panel;
    style = v.el('style', '', document.head);
    style.id = 'vendetta-ability-style';
    style.textContent = `
      #vendetta-hud #vendetta-ability-panel{
        position:absolute;z-index:1;left:50%;bottom:0;
        transform:translateX(-50%);
        width:min(560px,calc(100% - var(--vt-widget-width,208px) - var(--vt-widget-width,208px) - 16px));
        max-width:100%;height:76px;margin:0;padding:0;box-sizing:border-box;
        border:1px solid #82758f44;border-bottom:0;
        border-radius:2px 2px 0 0;background:#1b1920d9;
        box-shadow:none;pointer-events:auto;overflow:hidden;
      }
      @media(max-height:480px){#vendetta-hud #vendetta-ability-panel{height:65px}}
    `;
    panel = v.el('div', '', root);
    panel.id = 'vendetta-ability-panel';
    return panel;
  }

  function stop() {
    if (panel) panel.remove();
    if (style) style.remove();
    panel = style = null;
  }

  // Future ability UI can mount its elements into this container.
  // This component deliberately has no slots, labels, resources or gameplay state.
  v.abilityPanel = { mount, stop, get container() { return panel; } };
})();
