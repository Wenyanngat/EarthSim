(function () {
  'use strict';
  const v = window.VendettaTest; if (!v || v.version !== '0.5.0' || v.time) return;
  let clock, pause, speeds = [], previous = null;
  function update() {
    if (!clock) return;
    const year = Number.isFinite(W.simYear) ? Math.floor(W.simYear) : null;
    const day = Number.isFinite(W.dayOfYear) ? Math.floor(W.dayOfYear) + 1 : null;
    clock.textContent = (day === null ? '' : 'День ' + day + ' · ') + (year === null ? 'Время недоступно' : 'Год ' + year);
    pause.innerHTML = W.paused ? v.icons.play : v.icons.pause;
    pause.setAttribute('aria-label', W.paused ? 'Продолжить время' : 'Пауза');
    pause.title = W.paused ? 'Продолжить время' : 'Пауза';
    pause.setAttribute('aria-pressed', String(W.paused));
    for (const [speed, button] of speeds) button.setAttribute('aria-pressed', String(uiState.speed === speed));
  }
  function toggle() { if (!v.active) return; togglePlay(); update(); }
  function speed(value) { if (!v.active || ![1, 2, 3].includes(value)) return; setSpeed(value); update(); }
  function mount(host) {
    previous = { speed: uiState.speed, paused: W.paused };
    clock = v.el('span', 'vt-clock', host); clock.id = 'vendetta-clock';
    const controls = v.el('div', 'vt-time', host); controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Управление временем');
    pause = v.button(controls, 'vendetta-pause', '', 'Пауза'); v.listen(pause, 'click', toggle, undefined, true);
    for (const n of [1, 2, 3]) { const b = v.button(controls, 'vendetta-speed-' + n, n + (n === 1 ? '›' : '»'), 'Скорость ×' + n); speeds.push([n, b]); v.listen(b, 'click', () => speed(n), undefined, true); }
    setSpeed(1); update();
  }
  function stop() { if (previous) { setSpeed(previous.speed); W.paused = previous.paused; } previous = null; clock = pause = null; speeds = []; }
  v.time = { mount, update, toggle, speed, stop };
})();
