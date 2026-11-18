'use strict';

const VOLUNTAS_MANA_CAP = 200;
const VOLUNTAS_FAUNA = Object.freeze({ aurochs: 'herb', cod: 'fish', wolf: 'pred' });
const VOLUNTAS_DEEDS = Object.freeze({
  rain:      { label: ['Дождь', 'Rain'], cost: 5, size: 4, power: [0.2, 0.4, 0.6, 0.8, 1] },
  fauna:     { label: ['Животные', 'Animals'], cost: 8, size: 4, power: [0.016, 0.032, 0.048, 0.064, 0.08] },
  resource:  { label: ['Ресурсы', 'Resources'], cost: 12, size: 4 },
  inspire:   { label: ['Озарение', 'Inspiration'], cost: 18, power: [1, 1.5, 2, 2.5, 3] },
  hurricane: { label: ['Ураган', 'Hurricane'], cost: 20, disaster: true },
  flood:     { label: ['Потоп', 'Flood'], cost: 24, disaster: true },
  quake:     { label: ['Землетрясение', 'Earthquake'], cost: 30, disaster: true },
  meteor:    { label: ['Метеорит', 'Meteorite'], cost: 45, disaster: true }
});
const VOLUNTAS_DISASTER_POWER = Object.freeze([0.1, 0.3, 0.5, 0.75, 1]);

function voluntasDeedPower(deed) {
  return deed.disaster ? VOLUNTAS_DISASTER_POWER : deed.power;
}

function voluntasDeed(action, choice = null, size = 1, strength = 1) {
  if (typeof action !== 'string' || !Object.hasOwn(VOLUNTAS_DEEDS, action)) return null;
  const deed = VOLUNTAS_DEEDS[action];
  const powers = voluntasDeedPower(deed);
  if (!Number.isInteger(size) || size < 1 || size > (deed.size || 1) ||
      !Number.isInteger(strength) || strength < 1 || strength > (powers?.length || 1)) return null;
  let species = null;
  if (action === 'fauna') {
    if (typeof choice !== 'string' || !Object.hasOwn(VOLUNTAS_FAUNA, choice)) return null;
    species = SPECIES.find(sp => sp.key === choice && sp.guild === VOLUNTAS_FAUNA[choice]);
    if (!species) return null;
  } else if (action === 'resource') {
    if (!Number.isInteger(choice) || choice < 1 || choice >= RES.length) return null;
  } else if (choice !== null) return null;
  const power = powers?.[strength - 1];
  let radius = 0.5;
  if (deed.disaster) radius = disasterRadius(action, power);
  else if (deed.size) radius = size === 1 ? 0.6 : size + 0.5;
  const cost = Math.ceil(deed.cost * (1 + (size - 1) / 2 + (strength - 1) / 4));
  return { action, choice, species, radius, power, cost, disaster: deed.disaster };
}

function voluntasDeedTarget(deed, cell, player, visit) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID.N) return false;
  if (deed.disaster) return true;
  const { action, species, choice, radius, power } = deed;
  if (action === 'inspire') {
    const nation = stateOf(cell);
    if (!nation || nation.uid !== player?.uid) return false;
    return nation.tech < Math.min(CIV.TECH_CAP, rulesTechMax(nation)) ||
      nation.stability < 1 || (nation._golden || 0) < 2;
  }
  if (action === 'rain' && W.isWater[cell]) return false;
  if (species && (!_fa.ready || !!W.isWater[cell] !== species._sea)) return false;
  let valid = false;
  _around(cell % GRID.W, Math.floor(cell / GRID.W), radius, (i, weight) => {
    let affects;
    if (action === 'rain') {
      affects = !W.isWater[i] && (W.fire[i] > 0 || W.pAnom[i] < Math.fround(1.3 + 0.5 * power * weight));
    } else if (species) {
      affects = !!W.isWater[i] === species._sea && W[species.guild][i] < 1 && _fa.realm[i] < FAUNA.realms.length;
    } else {
      affects = W.res[i] !== choice;
    }
    if (!affects) return;
    valid = true;
    if (visit) visit(i);
  });
  return valid;
}

function voluntasAct(action, cell, choice, size, strength) {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null ||
      (VOLUNTAS.solo ? NP.on : !voluntasInRoom() || !NP.exec)) return false;
  const id = VOLUNTAS.solo ? 0 : NP.exec.from;
  const own = VOLUNTAS.solo || id === NP.id;
  const deny = (ru, en) => {
    if (own) VoluntasHUD.abilityPanel.message(T(ru, en));
    return false;
  };
  const unavailable = () => deny('Деяние здесь недоступно.', 'The deed cannot be used here.');
  const player = VOLUNTAS.players.find(p => p.id === id);
  const deed = voluntasDeed(action, choice, size, strength);
  if (!deed || !player || !stateByUid(player.uid) || !Number.isFinite(player.mana)) return unavailable();
  if (player.mana < deed.cost) return deny('Не хватает маны.', 'Not enough mana.');

  let changed = false;
  if (action === 'fauna') {
    voluntasDeedTarget(deed, cell, player, i => { if (faunaSeed(i, choice, deed.power) > 0) changed = true; });
  } else if (action === 'resource') {
    changed = voluntasDeedTarget(deed, cell, player, i => { W.res[i] = choice; });
    if (changed) resDirty();
  } else if (voluntasDeedTarget(deed, cell, player)) {
    changed = deed.disaster ? !!disasterTrigger(action, cell, deed.power, true)
      : godPower(action, cell, deed.radius, deed.power);
  }
  if (!changed) return unavailable();
  player.mana -= deed.cost;
  rLayerDirty();
  markDirty('base');
  rUrgent();
  if (own) {
    VoluntasHUD.abilityPanel.message(T(...VOLUNTAS_DEEDS[action].label) + ' · −' + deed.cost + ' ' + T('маны', 'mana'));
    VoluntasHUD.avatarDock.react(action);
  }
  return true;
}
