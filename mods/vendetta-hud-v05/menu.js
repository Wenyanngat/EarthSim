(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.menu) return;
  let panel = null, test = null, start = null, message = null, style = null;
  function close() {
    if (!panel) return;
    panel.hidden = true;
    if (test && test.isConnected) test.focus();
  }
  function show() {
    if (!panel) return;
    busy(false); message.textContent = ''; panel.hidden = false; start.focus();
  }
  function busy(value) { if (start) start.disabled = value; }
  function mount() {
    const nav = document.querySelector('#main-menu .mm-nav');
    if (!nav || v.disposed || (test && test.isConnected)) return;
    test = document.createElement('button'); test.type = 'button'; test.id = 'vendetta-test';
    test.className = 'mm-item'; test.textContent = 'TEST'; nav.insertBefore(test, nav.children[2] || null);
    v.listen(test, 'click', show);
    if (!style) {
      style = document.createElement('style'); style.id = 'vendetta-menu-style';
      style.textContent = '#vendetta-menu[hidden]{display:none!important}#vendetta-menu{position:fixed;inset:0;z-index:940;display:flex;align-items:center;justify-content:center;background:rgba(2,6,14,.95);color:#d5e4f7}#vendetta-menu>section{width:min(400px,85vw);padding:36px;border:1px solid #4676a8;background:linear-gradient(#0d1e36,#060f1d)}#vendetta-menu h1{margin:0 0 30px;letter-spacing:.2em}#vendetta-menu button{width:100%;margin-top:12px}#vendetta-error{color:#ffb5aa;white-space:pre-wrap}';
      document.head.appendChild(style);
    }
    if (panel) panel.remove();
    panel = document.createElement('div'); panel.id = 'vendetta-menu'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'vendetta-title');
    const section = document.createElement('section'), title = document.createElement('h1');
    title.id = 'vendetta-title'; title.textContent = 'VENDETTA'; section.appendChild(title);
    start = document.createElement('button'); start.type = 'button'; start.className = 'mm-btn go'; start.textContent = 'Начать';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'mm-btn'; back.textContent = 'Назад';
    message = document.createElement('p'); message.id = 'vendetta-error'; message.setAttribute('role', 'status');
    section.append(start, back, message); panel.appendChild(section); document.body.appendChild(panel);
    v.listen(start, 'click', () => v.session.begin()); v.listen(back, 'click', close);
    v.listen(panel, 'keydown', e => { if (e.code === 'Tab') { e.preventDefault(); (document.activeElement === start ? back : start).focus(); } });
  }
  v.menu = { mount, show, close, busy, error(text) { if (message) message.textContent = text; busy(false); },
    get open() { return !!panel && !panel.hidden; },
    dispose() { for (const el of [test, panel, style]) if (el) el.remove(); panel = test = style = null; } };
})();
