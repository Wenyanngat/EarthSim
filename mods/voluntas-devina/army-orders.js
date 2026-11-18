'use strict';

function voluntasOrderable(r) {
  return ARMY.ON && r?.men > 0 && r.k !== 'art' && r.task !== 'b' && r.task !== 'e' && r.enc < 0;
}

function voluntasOrderApproach(st, r, cell, prior = -1) {
  if (W.isWater[r.c] || W.stateId[r.c] !== st.id) return -1;
  const x = cell % GRID.W, y = Math.floor(cell / GRID.W);
  const neighbors = [];
  for (const [dx, dy] of NB8) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= GRID.W || ny < 0 || ny >= GRID.H) continue;
    const next = ny * GRID.W + nx;
    if (!W.isWater[next] && W.stateId[next] === st.id) neighbors.push(next);
  }
  neighbors.sort((a, b) =>
    Number(b === prior) - Number(a === prior) || _aCheb(r.c, a) - _aCheb(r.c, b) || a - b);
  return neighbors.find(next => armyPathStep(st, r.c, next) >= 0) ?? -1;
}

function voluntasOrderTarget(st, cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID.N || W.isWater[cell]) return null;
  const foe = states[W.stateId[cell]];
  return foe?.alive && foe !== st && warOf(st, foe) ? foe : null;
}

function voluntasRegimentOrder(unit, cell) {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null ||
      (VOLUNTAS.solo ? NP.on : !voluntasInRoom() || !NP.exec)) return false;
  const id = VOLUNTAS.solo ? 0 : NP.exec.from;
  const own = VOLUNTAS.solo || id === NP.id;
  function reply(ru, en, accepted = false) {
    if (own) VoluntasHUD.regiments.message(T(ru, en));
    return accepted;
  }
  const player = VOLUNTAS.players.find(p => p.id === id && p.id >= 0);
  const found = Number.isSafeInteger(unit) && unit > 0 ? armyFind(unit) : null;
  if (!found || found.st.uid !== player?.uid || !found.st.alive || found.r.men <= 0) {
    return reply('Приказ доступен только для своего действующего полка.', 'Orders require a live regiment of your nation.');
  }
  const {st, r} = found;
  if (cell === null) {
    if (!VOLUNTAS.orders[unit]) return reply('У полка нет приказа.', 'The regiment has no order.');
    voluntasReleaseOrder(r);
    return reply('Приказ отменён.', 'Order cancelled.', true);
  }
  if (!voluntasOrderable(r)) {
    return reply('Этот полк сейчас не может наступать.', 'This regiment cannot advance right now.');
  }
  const foe = voluntasOrderTarget(st, cell);
  if (!foe) return reply('Выберите сухопутную клетку противника.', 'Choose an enemy land tile.');
  const approach = voluntasOrderApproach(st, r, cell);
  if (approach < 0) {
    return reply('У полка нет пути к этой клетке фронта.', 'The regiment cannot reach this front tile.');
  }
  VOLUNTAS.orders[unit] = {uid: st.uid, foe: foe.uid, cell, approach};
  return reply('Приказ принят.', 'Order accepted.', true);
}

function voluntasReleaseOrder(r) {
  const order = VOLUNTAS.orders[r.u];
  delete VOLUNTAS.orders[r.u];
  if (r.task === 'f' && r.t === order.approach && r.fo === order.foe) {
    r.t = -1;
    r.bk = 0;
  }
}

function voluntasAssignOrders(st) {
  if (!VOLUNTAS.active) return;
  for (const r of st.regs) {
    const order = VOLUNTAS.orders[r.u];
    if (order?.uid !== st.uid) continue;
    const foe = voluntasOrderTarget(st, order.cell);
    const approach = foe?.uid === order.foe && voluntasOrderable(r)
      ? voluntasOrderApproach(st, r, order.cell, order.approach) : -1;
    if (approach < 0) {
      voluntasReleaseOrder(r);
      continue;
    }
    if (r.t !== approach || r.fo !== foe.uid) r.bk = 0;
    order.approach = approach;
    r.task = 'f';
    r.fo = foe.uid;
    r.t = approach;
  }
}

function voluntasFightTargets(att, def, engaged, range) {
  if (!VOLUNTAS.active || VOLUNTAS.winner !== null) return null;
  let priority = null;
  for (const r of engaged) {
    const order = VOLUNTAS.orders[r.u];
    if (order?.uid === att.uid && order.foe === def.uid && def.cells.has(order.cell) &&
        !W.isWater[order.cell] && _aCheb(r.c, order.cell) <= range) {
      (priority ??= new Set()).add(order.cell);
    }
  }
  return priority;
}

function* voluntasFightCells(cells, priority) {
  // Ordered tiles go through the same checks ahead of the normal scan cap.
  yield* priority;
  for (const cell of cells) if (!priority.has(cell)) yield cell;
}

function voluntasPruneOrders() {
  for (const [unit, order] of Object.entries(VOLUNTAS.orders)) {
    const found = armyFind(Number(unit));
    if (!found || found.st.uid !== order.uid) {
      delete VOLUNTAS.orders[unit];
    } else if (VOLUNTAS.winner !== null || !voluntasOrderable(found.r) ||
        voluntasOrderTarget(found.st, order.cell)?.uid !== order.foe) {
      voluntasReleaseOrder(found.r);
    }
  }
}

function voluntasRestoreOrders(orders) {
  const restored = {};
  for (const [unit, order] of Object.entries(orders || {})) {
    if (!/^[1-9]\d*$/.test(unit) || !Number.isSafeInteger(Number(unit)) ||
        !Number.isInteger(order?.uid) || !Number.isInteger(order.foe) ||
        !Number.isInteger(order.cell) || order.cell < 0 || order.cell >= GRID.N ||
        !Number.isInteger(order.approach) || order.approach < 0 || order.approach >= GRID.N ||
        !VOLUNTAS.players.some(player => player.uid === order.uid)) continue;
    restored[unit] = {uid: order.uid, foe: order.foe, cell: order.cell, approach: order.approach};
  }
  return restored;
}

netAct('vdOrder', voluntasRegimentOrder);
ModAPI.ready(() => {
  const owner = 'Voluntas Devina';
  ModAPI.wrap('_armyAssign', (original, st) => {
    original(st);
    voluntasAssignOrders(st);
  }, owner);
  ModAPI.on('civTick', voluntasPruneOrders);
  ModAPI.on('warCell', (war, cell) => {
    for (const [unit, order] of Object.entries(VOLUNTAS.orders)) {
      if (order.cell !== cell) continue;
      const found = armyFind(Number(unit));
      if (found) voluntasReleaseOrder(found.r);
      else delete VOLUNTAS.orders[unit];
    }
  });
});
