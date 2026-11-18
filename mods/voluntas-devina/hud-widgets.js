(function () {
  'use strict';
  const v = window.VoluntasHUD;
  let clock, pause, speeds, mana, manaAmount, manaIncome, manaDetails;
  let actions, available, actionPanels, actionTabs, actionStatus, selected, gesture;
  let tuning, brushSize, brushStrength, preview, previewCircle, previewRing, aim;
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
      manaAmount.textContent = (player?.mana || 0).toFixed(1) + ' / ' + VOLUNTAS_MANA_CAP;
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
      ? SPECIES.flatMap((species, index) => VOLUNTAS_FAUNA[species.key] === species.guild
        ? [[species.key, faunaName(index)]] : [])
      : Array.from({length: RES.length - 1}, (_, index) => [String(index + 1), resName(index + 1)]);
    for (const [value, label] of options) {
      const option = v.el('option', '', select);
      option.value = value;
      option.textContent = label;
    }
    return select;
  }
  function levelControl(label, id) {
    const field = v.el('label', '', tuning);
    v.el('span', '', field).textContent = label;
    const input = v.el('input', '', field);
    input.id = id;
    input.type = 'range';
    input.min = input.step = input.value = '1';
    const value = v.el('output', '', field);
    value.setAttribute('for', id);
    v.listen(input, 'input', () => v.abilityPanel.update());
    return {field, input, value};
  }
  function deedChoice(entry) {
    if (entry.key === 'fauna') return entry.select.value;
    if (entry.key === 'resource') return Number(entry.select.value);
    return null;
  }
  function hideTarget() {
    aim = null;
    if (previewCircle) previewCircle.hidden = true;
    if (previewRing) previewRing.visible = false;
  }
  const mapCanvas = () => window.mode3D ? _3d.canvas : mainCanvas;
  function pickTarget({clientX, clientY}) {
    if (window.mode3D) return pick3D({clientX, clientY});
    const rect = mainCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX >= rect.right ||
        clientY < rect.top || clientY >= rect.bottom) return null;
    return cellAt(clientX, clientY, rect);
  }
  function updateTarget(deed, player) {
    if (!deed || !aim || MENU_UP || v.settings.open || UI.anyOpen() || !v.active ||
        document.elementFromPoint(aim.clientX, aim.clientY) !== mapCanvas()) {
      hideTarget();
      return;
    }
    const target = pickTarget(aim);
    if (!target) {
      previewCircle.hidden = true;
      if (previewRing) previewRing.visible = false;
      return;
    }
    const valid = player?.mana >= deed.cost && voluntasDeedTarget(deed, target.i, player);
    if (window.mode3D) {
      if (!_3d.scene) return;
      if (previewRing?.parent !== _3d.scene) {
        releaseRing();
        previewRing = _mkGroundRing(72, 0xffffff, 0.9, false);
        previewRing.name = 'Voluntas Deed Target';
        previewRing.renderOrder = 999;
        _3d.scene.add(previewRing);
      }
      previewRing.material.color.setHex(valid ? 0xcdb5ff : 0xff8c93);
      _fitGroundRing(previewRing, target.x + 0.5, target.y + 0.5, deed.radius, 0.11, 0.12);
      previewRing.visible = true;
    } else {
      const rect = mainCanvas.getBoundingClientRect(), clip = preview.getBoundingClientRect();
      const sx = rect.width / CANVAS_W, sy = rect.height / CANVAS_H, unit = CELL * view2d.zoom;
      previewCircle.style.left = rect.left - clip.left + (view2d.ox + (target.x + 0.5) * unit) * sx + 'px';
      previewCircle.style.top = rect.top - clip.top + (view2d.oy + (target.y + 0.5) * unit) * sy + 'px';
      previewCircle.style.width = 2 * deed.radius * unit * sx + 'px';
      previewCircle.style.height = 2 * deed.radius * unit * sy + 'px';
      previewCircle.dataset.valid = String(valid);
      previewCircle.hidden = false;
    }
  }
  function releaseRing() {
    if (!previewRing) return;
    previewRing.parent?.remove(previewRing);
    previewRing.geometry.dispose();
    previewRing.material.dispose();
    previewRing = null;
  }
  function selectAction(entry) {
    selected = entry;
    if (entry) v.regiments.disarm();
    gesture = null;
    hideTarget();
    if (!actions) return;
    brushSize.input.value = brushStrength.input.value = '1';
    if (entry) {
      const deed = VOLUNTAS_DEEDS[entry.key];
      brushSize.input.max = deed.size || 1;
      brushStrength.input.max = voluntasDeedPower(deed)?.length || 1;
      brushSize.field.hidden = !deed.size;
      brushStrength.field.hidden = !voluntasDeedPower(deed);
    }
    tuning.hidden = !entry || (brushSize.field.hidden && brushStrength.field.hidden);
    actions.classList.toggle('vd-armed', !!entry);
    for (const item of available) item.button.setAttribute('aria-pressed', String(item === entry));
    actionStatus.textContent = entry ? T('Выберите клетку на карте.', 'Choose a map tile.') : '';
    v.abilityPanel.update();
  }
  function setActionTab(id) {
    selectAction(null);
    for (const [key, panel] of actionPanels) panel.hidden = key !== id;
    for (const [key, tab] of actionTabs) tab.setAttribute('aria-selected', String(key === id));
  }
  function attempt(cell) {
    if (!selected) return false;
    const {key} = selected;
    const choice = deedChoice(selected), size = +brushSize.input.value, strength = +brushStrength.input.value;
    selectAction(null);
    netDo('vdAct', key, cell, choice, size, strength);
    v.abilityPanel.update();
    return true;
  }
  function cancelGesture() {
    gesture = null;
    hideTarget();
  }
  function mapAvailable(event) {
    return v.active && event.target === mapCanvas() && !MENU_UP && !v.settings.open && !UI.anyOpen();
  }
  function primaryMapClick(event) {
    return event.button === 0 && !event.shiftKey && !event.altKey && mapAvailable(event);
  }
  function inspectMap(event, hit) {
    const mode3D = window.mode3D;
    if (hit && v.regiments.pick(() => mode3D ? armyClick3D(event) :
        armyClickAt(hit.x, hit.y, event, mainCanvas.getBoundingClientRect()))) return;
    v.regiments.clear();
    if (!hit) return;
    const showBattles = currentOverlay === 'battles' || (mode3D && currentOverlay === 'political');
    const battle = showBattles && findNearestBattle(hit.x, hit.y, 2);
    if (battle) openBattleModal(battle);
    else {
      updateInspector(hit.i);
      inspectClick(hit.i);
    }
  }
  v.mapInput = {
    cancel: cancelGesture,
    defer3D: primaryMapClick,
    inspect3D(event, drag) {
      if (!v.active) return false;
      if (event.type === 'pointerup' && primaryMapClick(event) &&
          Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 4) {
        inspectMap(event, pickTarget(event));
      }
      return true;
    }
  };
  function mountInput() {
    const stage = document.getElementById('stage');
    const canAim = event => selected && !event.shiftKey && !event.altKey && mapAvailable(event);
    v.listen(stage, 'pointerdown', event => {
      const type = selected ? 'deed' : v.regiments.armed ? 'order' : 'inspect';
      if (!primaryMapClick(event) || (type === 'inspect' && window.mode3D)) { cancelGesture(); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.mode3D) hideTip3D();
      else hideTip();
      gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, target: event.target, type};
    }, true);
    v.listen(window, 'pointermove', event => {
      if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4) gesture = null;
      if (canAim(event) && (!event.buttons || gesture)) {
        aim = {clientX:event.clientX, clientY:event.clientY};
        v.abilityPanel.update();
      } else hideTarget();
    }, true);
    v.listen(stage, 'pointermove', event => {
      if (!window.mode3D || (!canAim(event) && !(v.regiments.armed && mapAvailable(event) &&
          !event.shiftKey && !event.altKey)) || (event.buttons && !gesture)) return;
      setHoverRing(null);
      event.stopImmediatePropagation();
    }, true);
    v.listen(window, 'pointercancel', cancelGesture, true);
    v.listen(window, 'blur', cancelGesture);
    v.listen(stage, 'pointerleave', cancelGesture);
    v.listen(window, 'pointerup', event => {
      if (event.target !== mapCanvas() && gesture?.id === event.pointerId) cancelGesture();
    }, true);
    v.listen(stage, 'pointerup', event => {
      if (gesture?.id !== event.pointerId) return;
      const start = gesture;
      gesture = null;
      event.stopImmediatePropagation();
      if (!primaryMapClick(event) || start.target !== event.target ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return;
      const hit = pickTarget(event);
      if (start.type === 'inspect') inspectMap(event, hit);
      else if (start.type === 'order') {
        if (hit) v.regiments.request(hit.i);
        else v.regiments.message(T('Выберите клетку вражеского фронта.', 'Choose an enemy front tile.'));
      } else if (hit) attempt(hit.i);
    }, true);
  }

  v.abilityPanel = {
    mount(root) {
      actions = v.el('aside', 'vd-actions', root);
      actions.id = 'voluntas-actions';
      actions.setAttribute('aria-label', T('Деяния', 'Deeds'));
      v.regiments.mount(actions, root);
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
        for (const [key, deed] of Object.entries(VOLUNTAS_DEEDS)) {
          if ((name === 'evil') !== !!deed.disaster) continue;
          const slot = v.el('div', 'vd-action', panel);
          const label = T(...deed.label);
          const button = v.button(slot, 'vd-act-' + key, '', label);
          button.dataset.voluntasAction = key;
          v.el('span', '', button).textContent = label;
          const price = v.el('small', '', button);
          const select = ['fauna', 'resource'].includes(key) ? choiceSelect(key, slot) : null;
          const entry = {key, button, select, price};
          available.push(entry);
          v.listen(button, 'click', () => selectAction(selected === entry ? null : entry));
          if (select) v.listen(select, 'change', () => v.abilityPanel.update());
        }
      }
      tuning = v.el('div', 'vd-deed-tuning', actions);
      brushSize = levelControl(T('Размер кисти', 'Brush size'), 'vd-brush-size');
      brushStrength = levelControl(T('Сила', 'Strength'), 'vd-brush-strength');
      actionStatus = v.el('output', 'vd-action-status', actions);
      actionStatus.setAttribute('aria-live', 'polite');
      preview = v.el('div', 'vd-deed-preview', root);
      root.prepend(preview);
      previewCircle = v.el('div', 'vd-deed-ring', preview);
      setActionTab('good');
      mountInput();
    },
    update() {
      if (!actions) return;
      const player = voluntasLocalPlayer();
      const canAct = VOLUNTAS.active && VOLUNTAS.winner === null && !!(player && stateByUid(player.uid)) && netCanEdit();
      if (!canAct && selected) { selectAction(null); return; }
      let armedDeed = null;
      for (const entry of available) {
        const {key, price, button} = entry;
        const armed = selected === entry;
        const size = armed ? +brushSize.input.value : 1, strength = armed ? +brushStrength.input.value : 1;
        const deed = voluntasDeed(key, deedChoice(entry), size, strength);
        if (armed) armedDeed = deed;
        const text = deed ? deed.cost + ' ' + T('маны', 'mana') : '–';
        if (price.textContent !== text) {
          price.textContent = text;
          button.title = T(...VOLUNTAS_DEEDS[key].label) + ' · ' + text;
          button.setAttribute('aria-label', button.title);
        }
        button.dataset.affordable = String(!!deed && (player?.mana || 0) >= deed.cost);
        button.disabled = !canAct || !deed || (!armed && player.mana < deed.cost);
      }
      if (armedDeed) {
        brushSize.value.textContent = brushSize.input.value;
        brushStrength.value.textContent = brushStrength.input.value;
      }
      updateTarget(armedDeed, player);
    },
    get armed() { return !!selected; },
    clear() { selectAction(null); },
    hideTarget,
    message(text) { if (actionStatus) actionStatus.textContent = text; },
    stop() {
      selectAction(null);
      releaseRing();
      actions = available = actionPanels = actionTabs = actionStatus = null;
      tuning = brushSize = brushStrength = preview = previewCircle = null;
    }
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
