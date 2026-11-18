'use strict';

const VOLUNTAS_FLAG_HEIGHT = 5.2;
const voluntasFlags = new Map();

function voluntasDropFlag(uid, flag) {
  flag.parent?.remove(flag);
  flag.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  voluntasFlags.delete(uid);
}

function voluntasClearFlags() {
  for (const [uid, flag] of voluntasFlags) voluntasDropFlag(uid, flag);
}

function voluntasMakeFlag(nation) {
  const flag = new THREE.Group();
  flag.name = 'voluntas-capital-' + nation.uid;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .065, VOLUNTAS_FLAG_HEIGHT, 8),
    new THREE.MeshBasicMaterial({color:0xe8dac0}));
  pole.position.y = VOLUNTAS_FLAG_HEIGHT / 2;
  flag.add(pole);

  const cloth = new THREE.Shape();
  cloth.moveTo(.05, 0);
  cloth.lineTo(2.75, 0);
  cloth.lineTo(2.38, -.7);
  cloth.lineTo(2.75, -1.4);
  cloth.lineTo(.05, -1.4);
  cloth.closePath();
  const color = new THREE.Color('rgb(' + nation.color.join(',') + ')');
  const banner = new THREE.Mesh(new THREE.ShapeGeometry(cloth),
    new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide, fog:false}));
  banner.position.y = VOLUNTAS_FLAG_HEIGHT - .1;
  flag.add(banner);
  _3d.scene.add(flag);
  return flag;
}

function voluntasDrawFlags() {
  if (!VOLUNTAS.active || !voluntasMode() || !window.mode3D || !_3d.scene || walkActive) return;
  const living = new Set();
  for (const {uid} of VOLUNTAS.players) {
    const nation = stateByUid(uid);
    if (!nation || nation.capital < 0 || nation.capital >= GRID.N || W.isWater[nation.capital]) continue;
    living.add(uid);
    const x = nation.capital % GRID.W + .5;
    const z = Math.floor(nation.capital / GRID.W) + .5;
    let flag = voluntasFlags.get(uid);
    if (flag && flag.parent !== _3d.scene) { voluntasDropFlag(uid, flag); flag = null; }
    if (!flag) { flag = voluntasMakeFlag(nation); voluntasFlags.set(uid, flag); }
    flag.position.set(x, Math.max(0, surfAt(x, z)), z);
    flag.rotation.y = _3d.vc.az;
    const color = nation.color.join(',');
    if (flag.userData.color !== color) {
      flag.userData.color = color;
      flag.children[1].material.color.setStyle('rgb(' + color + ')');
    }
  }
  for (const [uid, flag] of voluntasFlags) if (!living.has(uid)) voluntasDropFlag(uid, flag);
}

ModAPI.ready(() => {
  ModAPI.before('render3D', voluntasDrawFlags, 'Voluntas Devina');
  ModAPI.before('_dispose3D', voluntasClearFlags, 'Voluntas Devina');
  ModAPI.after('set3DMode', () => { if (!window.mode3D) voluntasClearFlags(); }, 'Voluntas Devina');
  ModAPI.walkOn('enter', voluntasClearFlags);
  ModAPI.on('worldgen', voluntasClearFlags);
  window.addEventListener('pagehide', voluntasClearFlags, {once:true});
});
