'use strict';

const VOLUNTAS_NICKNAME = 'voluntas.nickname';
const VOLUNTAS_RESULT_PREFIX = 'voluntas.result.';
const VOLUNTAS_NICKNAME_LIMIT = 24;
const VOLUNTAS_MATCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let voluntasTotals = null;
let voluntasRecordedMatch = null;

function voluntasCleanNickname(value) {
  if (typeof value !== 'string') return '';
  const singleLine = value.replace(/[\p{Cc}\u2028-\u202e\u2066-\u2069<>&"'`\\]/gu, '').trim();
  return Array.from(singleLine).slice(0, VOLUNTAS_NICKNAME_LIMIT).join('');
}

function voluntasNickname() {
  try { return voluntasCleanNickname(localStorage.getItem(VOLUNTAS_NICKNAME)); }
  catch (error) { return ''; }
}

function voluntasPlayerName() {
  return voluntasNickname() || voluntasCleanNickname(netPlayerName()) || T('Игрок', 'Player');
}

function voluntasResultTotals() {
  if (voluntasTotals) return voluntasTotals;
  const totals = {wins: 0, losses: 0};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(VOLUNTAS_RESULT_PREFIX) || !VOLUNTAS_MATCH_ID.test(key.slice(VOLUNTAS_RESULT_PREFIX.length))) continue;
      const outcome = localStorage.getItem(key);
      if (outcome === 'win') totals.wins++;
      if (outcome === 'loss') totals.losses++;
    }
    voluntasTotals = totals;
  } catch (error) {}
  return totals;
}

function voluntasResultText() {
  const {wins, losses} = voluntasResultTotals();
  return T('Победы', 'Wins') + ' ' + wins + ' · ' + T('Поражения', 'Losses') + ' ' + losses;
}

function voluntasRecordResult() {
  const {matchId, active, solo, players, confirmedWinner: winner} = VOLUNTAS;
  if (!active || solo || !voluntasInRoom() || NP.waiting || !Number.isInteger(winner) ||
      players.length !== 2 || !players.some(player => player.id === winner) ||
      !VOLUNTAS_MATCH_ID.test(matchId) || matchId === voluntasRecordedMatch) return;
  const player = voluntasLocalPlayer();
  if (!player) return;
  const key = VOLUNTAS_RESULT_PREFIX + matchId;
  try {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, player.id === winner ? 'win' : 'loss');
    }
    voluntasTotals = null;
    voluntasRecordedMatch = matchId;
  } catch (error) {}
}

window.addEventListener('storage', event => {
  if (event.key === null || event.key.startsWith(VOLUNTAS_RESULT_PREFIX)) {
    voluntasTotals = null;
    voluntasRecordedMatch = null;
  }
});
