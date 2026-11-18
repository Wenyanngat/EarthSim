(function () {
  'use strict';
  const v = window.VoluntasHUD;
  let clock, pause, speeds, mana, manaAmount, manaIncome, manaDetails;
  let actions, available, actionPanels, actionTabs, actionStatus, selected, gesture;
  let character, portrait, avatarOnDisplay, walkButton, bubble, bubbleTimer;
  let stats, statValues;

  const reactions = {
    rain: [['Дождливо как в Лондоне...', 'Rainy as London...'],
      ['Что? Опять нужен дождь?', 'What? More rain?']],
    fauna: [['Пусть здесь кипит жизнь.', 'Let this place teem with life.'],
      ['Им здесь будет хорошо.', 'They’ll thrive here.']],
    resource: [['Копайте здесь.', 'Dig here.'],
      ['Земля полна сокровищ.', 'Treasure lies beneath your feet.']],
    inspire: [['А если попробовать иначе?', 'What if we tried another way?'],
      ['Пусть эта мысль разойдётся по миру.', 'Let this idea travel the world.']],
    hurricane: [['Ветер набирает силу.', 'The winds are rising.'],
      ['Держитесь крепче.', 'Hold on tight.']],
    flood: [['Вода найдёт дорогу.', 'Water will find a way.'],
      ['Река вышла из берегов.', 'The river has burst its banks.']],
    quake: [['Почва уходит из-под ног.', 'The ground is shifting beneath you.'],
      ['Земля содрогнулась.', 'The earth has shaken.']],
    meteor: [['Видите этот огонь в небе?', 'See that fire in the sky?'],
      ['С неба кое-что упало.', 'Something fell from the sky.']]
  };

  let matchRecord, matchNames, matchTotals;
  v.matchRecord = {
    mount(host) {
      matchRecord = v.el('div', 'vd-match-record', host);
      matchNames = v.el('strong', '', matchRecord);
      matchTotals = v.el('span', '', matchRecord);
    },
    update() {
      const local = voluntasLocalPlayer();
      const opponent = VOLUNTAS.players.find(player => player !== local);
      matchRecord.hidden = !voluntasInRoom() || !local || !opponent;
      if (matchRecord.hidden) return;
      const names = local.name + T(' против ', ' vs. ') + opponent.name;
      const totals = voluntasResultText();
      if (matchNames.textContent !== names) matchNames.title = matchNames.textContent = names;
      if (matchTotals.textContent !== totals) matchTotals.textContent = totals;
    },
    stop() { matchRecord = matchNames = matchTotals = null; }
  };

  v.time = {
    mount(host) {
      clock = v.el('span', 'vd-clock', host);
      clock.id = 'vd-clock';
      const group = v.el('div', 'vd-time', host);
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', T('Управление временем', 'Time controls'));
      pause = v.button(group, 'vd-pause', '', T('Пауза', 'Pause'));
      v.listen(pause, 'click', v.time.toggle);
      speeds = [1, 2, 3].map(speed => {
        const button = v.button(group, 'vd-speed-' + speed, '', T('Скорость', 'Speed') + ' ×' + speed);
        button.textContent = '×' + speed;
        v.listen(button, 'click', () => { if (v.time.canChange()) setSpeed(speed); v.time.update(); });
        return [speed, button];
      });
    },
    canChange() { return v.active && VOLUNTAS.active && VOLUNTAS.winner === null && netCanTime(); },
    toggle() { if (v.time.canChange()) togglePlay(); v.time.update(); },
    update() {
      if (!clock) return;
      const paused = NP.on ? NP.paused : W.paused;
      const speed = NP.on ? NP.speed : uiState.speed;
      const label = paused ? T('Продолжить время', 'Resume time') : T('Пауза', 'Pause');
      const stockYear = document.getElementById('hud-year');
      clock.hidden = VOLUNTAS.active && !stockYear?.classList.contains('lag');
      if (!clock.hidden) clock.textContent = stockYear?.textContent || yearShort(W.simYear);
      v.setIcon(pause, paused ? v.icons.play : v.icons.pause);
      pause.title = label;
      pause.setAttribute('aria-label', label);
      pause.setAttribute('aria-pressed', String(paused));
      pause.disabled = !v.time.canChange();
      for (const [value, button] of speeds) {
        button.setAttribute('aria-pressed', String(value === speed));
        button.disabled = pause.disabled;
      }
    },
    stop() { clock = pause = speeds = null; }
  };

  v.mana = {
    mount(host) {
      const wrap = v.el('div', 'vd-mana', host);
      mana = v.button(wrap, 'vd-mana', v.icons.mana, T('Мана', 'Mana'));
      manaAmount = v.el('span', 'vd-mana-value', mana);
      manaDetails = v.el('div', 'vd-mana-details', wrap);
      manaDetails.id = 'vd-mana-details';
      manaDetails.setAttribute('role', 'status');
      manaDetails.hidden = true;
      manaIncome = v.el('span', '', manaDetails);
      mana.setAttribute('aria-controls', manaDetails.id);
      function show(value) {
        manaDetails.hidden = !value;
        mana.setAttribute('aria-expanded', String(value));
      }
      show(false);
      v.listen(wrap, 'pointerenter', () => show(true));
      v.listen(wrap, 'pointerleave', () => { if (document.activeElement !== mana) show(false); });
      v.listen(mana, 'focus', () => show(true));
      v.listen(mana, 'blur', () => show(false));
      v.listen(mana, 'click', () => show(true));
    },
    update() {
      if (!mana) return;
      const player = voluntasLocalPlayer();
      const nation = player && stateByUid(player.uid);
      manaAmount.textContent = (player?.mana || 0).toFixed(1);
      manaIncome.textContent = T('Прирост в год: ', 'Income per year: ') + (nation ? voluntasIncome(nation) : 0).toFixed(2);
    },
    hide() {
      if (!manaDetails) return;
      manaDetails.hidden = true;
      mana.setAttribute('aria-expanded', 'false');
    },
    stop() { mana = manaAmount = manaDetails = manaIncome = null; }
  };

  v.stats = {
    mount(host) {
      stats = v.el('dl', 'vd-stats', host);
      statValues = [
        ['soldiers', T('Солдаты', 'Soldiers')], ['year', T('Год', 'Year')],
        ['era', T('Эпоха', 'Era')], ['gdp', T('ВВП', 'GDP')], ['population', T('Население', 'Population')]
      ].map(([key, label]) => {
        const row = v.el('div', '', stats);
        v.el('dt', '', row).textContent = label;
        const value = v.el('dd', '', row);
        value.dataset.stat = key;
        return value;
      });
    },
    update() {
      const player = voluntasLocalPlayer();
      const nation = player && stateByUid(player.uid);
      stats.hidden = !VOLUNTAS.active;
      if (stats.hidden) return;
      const soldiers = nation ? armyRegsOf(nation.uid).reduce((total, regiment) => total + regiment.men, 0) : 0;
      const values = [UI.fmt(Math.round(soldiers)), yearShort(W.simYear), nation ? eraName(nation.era) : '–',
        UI.fmt(Math.round(nation?.gdp || 0)), UI.fmt(Math.round(nation?.pop || 0))];
      statValues.forEach((field, i) => {
        if (field.textContent !== values[i]) field.title = field.textContent = values[i];
      });
    },
    stop() { stats = statValues = null; }
  };

  function choiceSelect(action, host) {
    const select = v.el('select', '', host);
    select.id = action === 'fauna' ? 'voluntas-fauna-type' : 'voluntas-resource-type';
    select.setAttribute('aria-label', action === 'fauna' ? T('Вид животного', 'Animal species') : T('Тип ресурса', 'Resource type'));
    const options = action === 'fauna'
      ? SPECIES.map((species, index) => [species.key, faunaName(index)])
      : Array.from({length: RES.length - 1}, (_, index) => [String(index + 1), resName(index + 1)]);
    for (const [value, label] of options) {
      const option = v.el('option', '', select);
      option.value = value;
      option.textContent = label;
    }
    return select;
  }
  function selectAction(entry) {
    selected = entry;
    gesture = null;
    if (!actions) return;
    actions.classList.toggle('vd-armed', !!entry);
    for (const item of available) item.button.setAttribute('aria-pressed', String(item === entry));
    actionStatus.textContent = entry ? T('Выберите клетку на карте.', 'Choose a map tile.') : '';
  }
  function setActionTab(id) {
    selectAction(null);
    for (const [key, panel] of actionPanels) panel.hidden = key !== id;
    for (const [key, tab] of actionTabs) tab.setAttribute('aria-selected', String(key === id));
  }
  function attempt(cell) {
    if (!selected) return false;
    const {key, select} = selected;
    const choice = key === 'fauna' ? select.value : key === 'resource' ? Number(select.value) : null;
    selectAction(null);
    netDo('vdAct', key, cell, choice);
    v.abilityPanel.update();
    return true;
  }
  function mountInput() {
    const canvas = document.getElementById('worldCanvas');
    v.listen(canvas, 'pointerdown', event => {
      if (!selected || event.button !== 0 || event.shiftKey || MENU_UP || v.settings.open || UI.anyOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
    }, true);
    v.listen(window, 'pointermove', event => {
      if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4) gesture = null;
    }, true);
    v.listen(window, 'pointercancel', () => { gesture = null; }, true);
    v.listen(window, 'pointerup', event => {
      if (gesture?.id !== event.pointerId) return;
      const start = gesture;
      gesture = null;
      if (event.target !== canvas || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX >= rect.right
          || event.clientY < rect.top || event.clientY >= rect.bottom) return;
      attempt(cellAt(event.clientX, event.clientY, rect).i);
    }, true);
  }

  v.abilityPanel = {
    mount(root) {
      actions = v.el('aside', 'vd-actions', root);
      actions.id = 'voluntas-actions';
      actions.setAttribute('aria-label', T('Деяния', 'Deeds'));
      available = [];
      actionPanels = new Map();
      actionTabs = new Map();
      const tabs = v.el('div', 'vd-action-tabs', actions);
      tabs.setAttribute('role', 'tablist');
      for (const [name, title] of [['good', T('Благодеяния', 'Benevolence')], ['evil', T('Злодеяния', 'Malevolence')]]) {
        const tab = v.button(tabs, 'vd-actions-' + name, '', title);
        tab.textContent = title;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', 'voluntas-' + name);
        actionTabs.set(name, tab);
        v.listen(tab, 'click', () => setActionTab(name));
        const panel = v.el('div', 'vd-action-grid', actions);
        panel.id = 'voluntas-' + name;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        actionPanels.set(name, panel);
        for (const key of Object.keys(VOLUNTAS_COST).filter(key => (name === 'evil') === Object.hasOwn(VOLUNTAS_DISASTER, key))) {
          const slot = v.el('div', 'vd-action', panel);
          const label = T(...VOLUNTAS_LABELS[key]);
          const button = v.button(slot, 'vd-act-' + key, '', label + ' · ' + VOLUNTAS_COST[key]);
          button.dataset.voluntasAction = key;
          v.el('span', '', button).textContent = label;
          v.el('small', '', button).textContent = VOLUNTAS_COST[key] + ' ' + T('маны', 'mana');
          const select = ['fauna', 'resource'].includes(key) ? choiceSelect(key, slot) : null;
          const entry = {key, button, select};
          available.push(entry);
          v.listen(button, 'click', () => selectAction(selected === entry ? null : entry));
        }
      }
      actionStatus = v.el('output', 'vd-action-status', actions);
      actionStatus.setAttribute('aria-live', 'polite');
      setActionTab('good');
      mountInput();
    },
    update() {
      if (!actions) return;
      const player = voluntasLocalPlayer();
      const canAct = VOLUNTAS.active && VOLUNTAS.winner === null && !!(player && stateByUid(player.uid)) && netCanEdit();
      for (const {key, button} of available) button.disabled = !canAct || player.mana < VOLUNTAS_COST[key];
    },
    get armed() { return !!selected; },
    clear() { selectAction(null); },
    inspect(cell) { return window.mode3D && attempt(cell); },
    message(text) { if (actionStatus) actionStatus.textContent = text; },
    stop() { selectAction(null); actions = available = actionPanels = actionTabs = actionStatus = null; }
  };

  function updateCharacter() {
    if (!character) return;
    const player = voluntasLocalPlayer();
    const avatar = voluntasAvatarValid(player?.avatar) ? player.avatar : null;
    if (avatar !== avatarOnDisplay) {
      portrait?.dispose();
      clearTimeout(bubbleTimer);
      portrait = walkButton = bubble = null;
      character.replaceChildren();
      avatarOnDisplay = avatar;
      character.hidden = !avatar;
      if (avatar) {
        bubble = v.el('output', 'vd-reaction', character);
        bubble.hidden = true;
        bubble.setAttribute('aria-live', 'polite');
        portrait = voluntasAvatarPreview(character, true);
        portrait.show(avatar);
        walkButton = v.button(character, 'vd-walk', '', T('Прогулка в столице', 'Walk in the capital'));
        walkButton.textContent = walkButton.title;
        v.listen(walkButton, 'click', voluntasEnterWalk);
      }
    }
    if (walkButton) walkButton.disabled = VOLUNTAS.winner !== null || !stateByUid(player.uid);
  }
  v.avatarDock = {
    mount(root) {
      const widget = v.el('aside', 'vd-widget', root);
      widget.setAttribute('aria-label', T('Карта и персонаж', 'Map and character'));
      v.minimap.mount(widget);
      character = v.el('section', 'vd-character', widget);
      character.setAttribute('aria-label', T('Персонаж', 'Character'));
    },
    update: updateCharacter,
    react(deed) {
      const lines = reactions[deed];
      if (!bubble || !lines) return;
      clearTimeout(bubbleTimer);
      bubble.textContent = lines.map(line => T(...line)).find(line => line !== bubble.textContent);
      bubble.hidden = false;
      bubbleTimer = setTimeout(() => { if (bubble) bubble.hidden = true; }, 2800);
    },
    stop() {
      clearTimeout(bubbleTimer);
      portrait?.dispose();
      portrait = character = walkButton = bubble = null;
      avatarOnDisplay = undefined;
    }
  };
})();
