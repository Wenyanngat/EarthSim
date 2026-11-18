'use strict';

const VOLUNTAS_AVATARS = Object.freeze({
  horned: {file: 'fig1_rogatyi.glb', label: ['Рогатый', 'Horned']},
  beads: {file: 'fig2_namysto.glb', label: ['Намисто', 'Beads']},
  mask: {file: 'fig3_maska.glb', label: ['Маска', 'Mask']},
  wreath: {file: 'fig4_vinok.glb', label: ['Венок', 'Wreath']}
});
const VOLUNTAS_DEFAULT_AVATAR = 'horned';
const VOLUNTAS_AVATAR_PREFERENCE = 'voluntas.avatar';

function voluntasAvatarValid(id) {
  return typeof id === 'string' && Object.hasOwn(VOLUNTAS_AVATARS, id);
}

async function voluntasLoadAvatar(id) {
  if (!voluntasAvatarValid(id)) throw Error('Unknown Voluntas avatar');
  const mod = MODS.find(entry => entry.id === 'voluntas-devina' && entry.live);
  if (!mod) throw Error('Voluntas Devina assets are unavailable');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const file = await fs.readFile(path.join(mod.dir, 'avatars', VOLUNTAS_AVATARS[id].file));
  if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(4) !== 2 ||
      file.readUInt32LE(8) !== file.length || file.readUInt32LE(16) !== 0x4e4f534a) throw Error('Invalid avatar GLB');
  const jsonEnd = 20 + file.readUInt32LE(12);
  const data = JSON.parse(file.toString('utf8', 20, jsonEnd));
  if (file.readUInt32LE(jsonEnd + 4) !== 0x004e4942 || data.meshes.length !== 1 ||
      data.nodes.length !== 1 || data.meshes[0].primitives.length !== 1) throw Error('Unsupported avatar mesh');
  const bin = file.subarray(jsonEnd + 8);
  const part = data.meshes[0].primitives[0];
  const geo = new THREE.BufferGeometry();
  function bytes(index) {
    const view = data.bufferViews[index];
    return bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  }
  function attribute(index, ArrayType, size, componentType) {
    const accessor = data.accessors[index];
    const view = data.bufferViews[accessor.bufferView];
    if (accessor.componentType !== componentType || view.byteStride || accessor.sparse) throw Error('Unsupported avatar accessor');
    const buffer = bytes(accessor.bufferView);
    const from = accessor.byteOffset || 0;
    const to = from + accessor.count * size * ArrayType.BYTES_PER_ELEMENT;
    if (to > buffer.length) throw Error('Truncated avatar accessor');
    return new THREE.BufferAttribute(new ArrayType(Uint8Array.from(buffer.subarray(from, to)).buffer), size);
  }
  geo.setAttribute('position', attribute(part.attributes.POSITION, Float32Array, 3, 5126));
  geo.setAttribute('normal', attribute(part.attributes.NORMAL, Float32Array, 3, 5126));
  geo.setAttribute('uv', attribute(part.attributes.TEXCOORD_0, Float32Array, 2, 5126));
  geo.setIndex(attribute(part.indices, Uint16Array, 1, 5123));
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const height = box.max.y - box.min.y;
  geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  geo.scale(1.75 / height, 1.75 / height, 1.75 / height);
  const source = data.materials[part.material].pbrMetallicRoughness;
  const image = data.images[data.textures[source.baseColorTexture.index].source];
  const map = new THREE.Texture();
  try {
    map.image = await new Promise((resolve, reject) => {
      const bitmap = new Image();
      const timeout = setTimeout(() => finish(Error('Avatar texture timed out')), 5000);
      function finish(error) {
        clearTimeout(timeout);
        bitmap.onload = bitmap.onerror = null;
        if (error) reject(error);
        else resolve(bitmap);
      }
      bitmap.onload = () => finish();
      bitmap.onerror = () => finish(Error('Avatar texture could not be decoded'));
      bitmap.src = 'data:image/png;base64,' + bytes(image.bufferView).toString('base64');
    });
    map.flipY = false;
    map.encoding = THREE.sRGBEncoding;
    map.needsUpdate = true;
  } catch (error) {
    geo.dispose();
    map.dispose();
    throw error;
  }
  const material = new THREE.MeshStandardMaterial({map, side: THREE.DoubleSide,
    metalness: source.metallicFactor, roughness: source.roughnessFactor});
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'voluntas-avatar-' + id;
  return {mesh, dispose() { mesh.parent?.remove(mesh); geo.dispose(); material.dispose(); map.dispose(); }};
}

function voluntasAvatarPreview(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'vd-avatar-canvas';
  canvas.setAttribute('aria-label', T('Предпросмотр. Перетащите или нажмите стрелки для вращения.', 'Preview. Drag or use arrow keys to rotate.'));
  canvas.tabIndex = 0;
  const status = document.createElement('p');
  status.className = 'vd-avatar-status';
  status.setAttribute('role', 'status');
  host.append(canvas, status);
  const listeners = new AbortController();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    renderer.outputEncoding = THREE.sRGBEncoding;
  } catch (error) {
    canvas.hidden = true;
    status.textContent = T('3D-предпросмотр недоступен.', '3D preview is unavailable.');
    return {show() {}, dispose() { canvas.remove(); status.remove(); }};
  }
  const scene = new THREE.Scene();
  const key = new THREE.DirectionalLight(0xffefd7, 1.0);
  key.position.set(2, 3, 4);
  scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x716178, 1.3), key);
  const camera = new THREE.PerspectiveCamera(33, 1, .05, 20);
  camera.position.set(0, 1.18, 3.65);
  camera.lookAt(0, .9, 0);
  let revision = 0, model = null, pressed = null;
  function render() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    if (!model || width < 2 || height < 2) return;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  function rotate(amount) { if (model) { model.mesh.rotation.y += amount; render(); } }
  const watch = new ResizeObserver(render);
  watch.observe(canvas);
  const opts = {signal: listeners.signal};
  canvas.addEventListener('pointerdown', event => {
    pressed = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  }, opts);
  canvas.addEventListener('pointermove', event => { if (pressed !== null) { rotate((event.clientX - pressed) * .014); pressed = event.clientX; } }, opts);
  canvas.addEventListener('lostpointercapture', () => { pressed = null; }, opts);
  canvas.addEventListener('keydown', event => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return;
    event.preventDefault();
    rotate(event.code === 'ArrowLeft' ? -.15 : .15);
  }, opts);
  return {
    async show(id) {
      const own = ++revision;
      status.textContent = T('Загрузка аватара…', 'Loading avatar…');
      try {
        const next = await voluntasLoadAvatar(id);
        if (own !== revision) { next.dispose(); return; }
        model?.dispose();
        model = next;
        model.mesh.rotation.y = -.27;
        scene.add(model.mesh);
        status.textContent = '';
        render();
      } catch (error) {
        if (own === revision) {
          status.textContent = T('Не удалось загрузить аватар.', 'Could not load the avatar.');
          console.warn('Voluntas avatar:', error);
        }
      }
    },
    dispose() {
      revision++;
      listeners.abort();
      watch.disconnect();
      model?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      status.remove();
    }
  };
}

function voluntasAvatarDialog(initial, confirm) {
  const dialog = UI.win('voluntas-avatar', {title: T('Аватар', 'Avatar'), width: 460});
  if (dialog.isOpen()) return;
  dialog.body.replaceChildren();
  dialog.foot.replaceChildren();
  let selected = voluntasAvatarValid(initial) ? initial : VOLUNTAS_DEFAULT_AVATAR;
  const choices = document.createElement('div');
  choices.className = 'vd-avatar-choices';
  dialog.body.append(choices);
  const preview = voluntasAvatarPreview(dialog.body);
  const buttons = [];
  for (const [id, data] of Object.entries(VOLUNTAS_AVATARS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-btn';
    button.textContent = T(...data.label);
    button.dataset.avatar = id;
    choices.append(button);
    buttons.push(button);
    button.addEventListener('click', () => {
      if (id === selected) return;
      selected = id;
      update();
    });
  }
  function update() {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.avatar === selected));
    preview.show(selected);
  }
  for (const [label, action] of [
    [T('Отмена', 'Cancel'), () => dialog.hide()],
    [T('Подтвердить', 'Confirm'), () => { dialog.hide(); confirm(selected); }]
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-btn';
    button.textContent = label;
    button.addEventListener('click', action);
    dialog.foot.append(button);
  }
  dialog.onClose = () => { preview.dispose(); dialog.onClose = null; dialog.body.replaceChildren(); dialog.foot.replaceChildren(); };
  dialog.show();
  voluntasStyleDialog(dialog, 985);
  update();
  buttons.find(button => button.dataset.avatar === selected).focus();
}

function voluntasEnterWalk() {
  const player = voluntasLocalPlayer();
  const nation = player && stateByUid(player.uid);
  if (nation && nation.capital >= 0 && walkEnter(nation.capital)) {
    WK.tp = true;
    voluntasRender();
  }
}

// Walk keeps ownership of the actor, motion, collision and camera.
const voluntasWalkModels = new Map();
function voluntasWalkDraw(original, pose) {
  if (!VOLUNTAS.active || !voluntasMode()) return original(pose);
  const id = pose === _waMe ? (VOLUNTAS.solo ? 0 : NP.id) : pose.peer;
  const player = VOLUNTAS.players.find(seat => seat.id === id);
  if (!player || !voluntasAvatarValid(player.avatar)) return original(pose);
  let slot = voluntasWalkModels.get(id);
  if (!slot) {
    slot = {scene: WK.scene, model: null};
    voluntasWalkModels.set(id, slot);
    voluntasLoadAvatar(player.avatar).then(model => {
      if (voluntasWalkModels.get(id) !== slot || slot.scene !== WK.scene) return model.dispose();
      slot.model = model;
      slot.scene.add(model.mesh);
      model.mesh.visible = false;
    }).catch(error => console.warn('Voluntas avatar:', error.message));
  }
  if (!slot.model) return original(pose);
  const {mesh} = slot.model;
  const phase = pose.ph || 0;
  const stride = pose.amp || 0;
  const crouch = pose.crouch || 0;
  mesh.visible = true;
  mesh.position.set(pose.x, pose.y + Math.abs(Math.sin(phase)) * stride * .07, pose.z);
  mesh.rotation.set(pose.wl == null ? Math.cos(phase) * stride * .055 : Math.PI * .35, pose.yaw, pose.pose === 4 ? -Math.PI / 2 : Math.sin(phase) * stride * .075, 'YXZ');
  mesh.scale.y = 1 - crouch * .24;
}

function voluntasWalkDispose() {
  for (const slot of voluntasWalkModels.values()) slot.model?.dispose();
  voluntasWalkModels.clear();
}

ModAPI.ready(() => {
  for (const name of ['waHuman', 'waHumanLo']) ModAPI.wrap(name, voluntasWalkDraw, 'Voluntas Devina');
  ModAPI.before('wkActUpdate', () => { for (const {model} of voluntasWalkModels.values()) if (model) model.mesh.visible = false; }, 'Voluntas Devina');
  ModAPI.walkOn('exit', voluntasWalkDispose);
  ModAPI.after('walkExit', () => { if (voluntasMode()) voluntasRender(); }, 'Voluntas Devina');
});
