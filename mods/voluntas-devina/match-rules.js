'use strict';

let voluntasFounding = false;
let voluntasLegacyNotice = false;

function voluntasLockRoster() {
  return voluntasMode() && !voluntasFounding;
}

function voluntasMatchWar(war) {
  if (!VOLUNTAS.active || VOLUNTAS.players.length !== 2 || !war) return false;
  const [a, b] = VOLUNTAS.players.map(player => player.uid);
  return (war.aUid === a && war.bUid === b) || (war.aUid === b && war.bUid === a);
}

function voluntasKeepWar(war) {
  return voluntasMode() && voluntasMatchWar(war) && !!stateByUid(war.aUid) && !!stateByUid(war.bUid);
}

function voluntasEnsureWar() {
  if (VOLUNTAS.winner !== null || VOLUNTAS.players.length !== 2) return;
  const [a, b] = VOLUNTAS.players.map(player => stateByUid(player.uid));
  if (!a || !b) return;
  if (!wars.some(voluntasMatchWar)) declareWar(a, b, 'conquest', true);
  a.truce.delete(b.id);
  b.truce.delete(a.id);
}

function voluntasRestoreMatch(state) {
  VOLUNTAS.active = !!state?.active;
  VOLUNTAS.solo = !!state?.solo;
  VOLUNTAS.players = Array.isArray(state?.players) ? state.players.map(player => ({
    ...player,
    mana: Number.isFinite(player.mana) ? clamp(player.mana, 0, VOLUNTAS_MANA_CAP) : 0,
    avatar: voluntasAvatarValid(player.avatar) ? player.avatar : VOLUNTAS_DEFAULT_AVATAR
  })) : [];
  VOLUNTAS.ready = state?.ready || {};
  VOLUNTAS.year = Number(state?.year) || 0;
  VOLUNTAS.winner = state?.winner ?? null;
  VOLUNTAS.matchId = typeof state?.matchId === 'string' && VOLUNTAS_MATCH_ID.test(state.matchId) ? state.matchId : null;
  const confirmed = state?.confirmedWinner;
  VOLUNTAS.confirmedWinner = confirmed === 'draw' ||
    (Number.isInteger(confirmed) && VOLUNTAS.players.some(player => player.id === confirmed)) ? confirmed : null;
  VOLUNTAS.orders = VOLUNTAS.active && VOLUNTAS.winner === null ? voluntasRestoreOrders(state?.orders) : {};
  if (!VOLUNTAS.active) return;
  const roster = new Set(VOLUNTAS.players.map(player => player.uid));
  if (roster.size !== 2 || states.some(nation => nation.alive && !roster.has(nation.uid))) {
    voluntasReset();
    W.paused = true;
    voluntasLegacyNotice = true;
    return;
  }
  if (VOLUNTAS.winner !== null) W.paused = true;
}

ModAPI.ready(() => {
  const owner = 'Voluntas Devina';
  // Guard entry points before they allocate a nation or reassign cells.
  for (const name of ['nucleateStates', 'foundStateAt', 'secedeChunk', 'checkSecession', '_breakaway', 'polCivilFromCollapse'])
    ModAPI.before(name, () => voluntasLockRoster() ? false : undefined, owner);
  ModAPI.wrap('rulesStateRoom', original => voluntasLockRoster() ? false : original(), owner);
  ModAPI.before('mergeStates', () => voluntasMode() ? false : undefined, owner);
  ModAPI.before('ancSetup', () => voluntasLockRoster() ? false : undefined, owner);
  ModAPI.before('_ancWave', () => voluntasLockRoster() ? false : undefined, owner);
  ModAPI.before('endWar', war => voluntasKeepWar(war) ? false : undefined, owner);
  ModAPI.wrap('_dipOpPeace', (original, from, id, ...args) => {
    return voluntasKeepWar(wars.find(war => war.id === id)) ? false : original(from, id, ...args);
  }, owner);
  ModAPI.before('peaceDialog', () => voluntasMode() ? false : undefined, owner);
  ModAPI.before('_dipCouncilYear', () => wars.some(voluntasKeepWar) ? false : undefined, owner);
  ModAPI.before('togglePlay', () => voluntasMode() && VOLUNTAS.winner !== null ? false : undefined, owner);
  ModAPI.after('netApplySnapshot', () => { if (VOLUNTAS.active) voluntasEnsureWar(); }, owner);
});
