'use strict';

const VOLUNTAS_MENU_STYLE = `
  #voluntas-setup {
    position:fixed; inset:0; width:100%; height:100%; max-width:none; max-height:none;
    padding:0; margin:0; border:0; background:transparent; color:#d7e9f7;
    font:13px/1.5 'Segoe UI',system-ui,sans-serif;
    --line:#0877a4; --input:#04213b; --rail:clamp(116px,11vw,230px);
    --gap:clamp(20px,3vw,76px); --frame-height:clamp(370px,36.7vh,530px);
  }
  #voluntas-setup::backdrop { background:#01040bae; backdrop-filter:blur(4px); }
  #voluntas-setup .vd-mode-scroll {
    height:100%; padding:clamp(26px,22.2vh,320px) 16px 28px;
    overflow:auto; overscroll-behavior:contain; box-sizing:border-box;
  }
  #voluntas-setup .vd-mode-title {
    margin:0 0 clamp(22px,4.15vh,60px); text-align:center;
    font:500 clamp(28px,4.1vw,64px)/1.2 'Segoe UI',system-ui,sans-serif;
    letter-spacing:.035em; color:#fff; text-shadow:0 0 32px #40aefa82;
  }
  #voluntas-setup .vd-mode-layout {
    display:grid; grid-template-columns:var(--rail) minmax(0,480px) var(--rail);
    align-items:start; justify-content:center; gap:var(--gap);
  }
  #voluntas-setup .vd-mode-card {
    border:1px solid var(--line); background:linear-gradient(#031a32,#030a19);
    box-shadow:0 16px 55px #0006;
  }
  #voluntas-setup .vd-mode-form { display:flex; flex-direction:column; min-height:var(--frame-height); }
  #voluntas-setup .vd-mode-head, #voluntas-setup .vd-mode-foot {
    display:flex; justify-content:flex-end; padding:11px 18px;
  }
  #voluntas-setup .vd-mode-head { border-bottom:1px solid #0a3855; }
  #voluntas-setup .vd-mode-foot { border-top:1px solid #0a3855; margin-top:auto; }
  #voluntas-setup .vd-mode-fields { display:grid; gap:5px; padding:14px 18px 12px; }
  #voluntas-setup .vd-description { margin:0 0 10px; color:#c9dfef; }
  #voluntas-setup .vd-seed-row { display:flex; gap:8px; }
  #voluntas-setup .vd-seed-row input { flex:1; min-width:0; }
  #voluntas-setup .vd-mode-input, #voluntas-setup .vd-mode-button, #voluntas-setup .vd-mode-stat {
    min-width:0; min-height:34px; box-sizing:border-box;
    padding:5px 10px; border:1px solid var(--line); border-radius:0;
    background:var(--input); color:inherit; font:inherit; color-scheme:dark;
  }
  #voluntas-setup .vd-mode-button { cursor:pointer; font-weight:600; }
  #voluntas-setup .vd-mode-button:hover { background:#0b3452; border-color:#36a8c9; }
  #voluntas-setup .vd-mode-button:focus-visible, #voluntas-setup .vd-mode-input:focus-visible {
    outline:2px solid #80d5f4; outline-offset:2px;
  }
  #voluntas-setup .vd-mode-close { width:34px; padding:0; display:grid; place-items:center; }
  #voluntas-setup .vd-mode-close svg { width:16px; height:16px; }
  #voluntas-setup .vd-mode-checkbox { display:flex; align-items:center; gap:6px; cursor:pointer; }
  #voluntas-setup .vd-mode-checkbox input { accent-color:#2187ae; margin:0; width:16px; height:16px; }
  #voluntas-setup #voluntas-error, #voluntas-setup .vd-profile-error { color:#ffb5aa; overflow-wrap:anywhere; }
  #voluntas-setup [role=alert]:empty { display:none; }
  #voluntas-setup .vd-mode-profile {
    display:grid; grid-template-columns:37% minmax(0,1fr); gap:12px;
    min-height:198px; margin-top:clamp(16px,2.35vh,34px); padding:10px 14px;
    box-sizing:border-box;
  }
  #voluntas-setup .vd-profile-avatar { min-width:0; min-height:0; display:grid; place-items:center; }
  #voluntas-setup .vd-profile-avatar .vd-avatar-canvas { height:clamp(102px,12.1vh,176px); }
  #voluntas-setup .vd-profile-fields { display:flex; flex-direction:column; gap:10px; }
  #voluntas-setup .vd-profile-fields input { text-align:center; font-weight:600; }
  #voluntas-setup .vd-profile-fields input::placeholder { color:#a8bed2; opacity:1; }
  #voluntas-setup .vd-profile-totals { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(8px,1vw,20px); }
  #voluntas-setup .vd-mode-stat { display:grid; place-items:center; text-align:center; font-variant-numeric:tabular-nums; }
  #voluntas-setup #voluntas-pick-avatar { margin-top:auto; }
  #voluntas-setup .vd-mode-rail { position:relative; pointer-events:none; }
  #voluntas-setup .vd-mode-frame { height:var(--frame-height); padding:15px 9px; box-sizing:border-box; }
  #voluntas-setup .vd-mode-frame img {
    display:block; width:100%; height:100%; object-fit:cover; border-radius:2px; background:#052840;
  }
  #voluntas-setup .vd-mode-figure {
    position:absolute; max-width:none; height:auto; pointer-events:none;
    filter:drop-shadow(0 12px 19px #0006); animation:vd-levitate 8s ease-in-out infinite;
  }
  #voluntas-setup .vd-mode-mask { width:calc(var(--rail) * 1.88); top:-22%; left:calc(var(--rail) * -.91); rotate:-9deg; }
  #voluntas-setup .vd-mode-beads {
    width:calc(var(--rail) * 1.77); bottom:calc(var(--rail) * -1.1); left:calc(var(--rail) * -1.16);
    animation-delay:-2.5s; rotate:-9deg;
  }
  #voluntas-setup .vd-mode-wreath {
    width:calc(var(--rail) * 1.56); bottom:calc(var(--rail) * -1.08); right:calc(var(--rail) * -1.07);
    animation-delay:-5s; scale:-1 1;
  }
  @keyframes vd-levitate { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
  @media (max-width:1400px) {
    #voluntas-setup .vd-mode-mask { top:-13%; left:calc(var(--rail) * -.68); }
    #voluntas-setup .vd-mode-beads { left:calc(var(--rail) * -.76); bottom:calc(var(--rail) * -.76); }
    #voluntas-setup .vd-mode-wreath { right:calc(var(--rail) * -.77); bottom:calc(var(--rail) * -.75); }
  }
  @media (max-height:980px) {
    #voluntas-setup .vd-mode-scroll { padding-top:clamp(22px,5vh,56px); }
    #voluntas-setup .vd-mode-profile { min-height:132px; }
  }
  @media (max-height:710px) {
    #voluntas-setup { --frame-height:410px; line-height:1.35; }
    #voluntas-setup .vd-mode-scroll { padding-block:14px; }
    #voluntas-setup .vd-mode-title { margin-bottom:12px; }
    #voluntas-setup .vd-mode-head, #voluntas-setup .vd-mode-foot { padding-block:6px; }
    #voluntas-setup .vd-mode-fields { gap:3px; padding-block:8px; }
    #voluntas-setup .vd-description { margin-bottom:5px; }
    #voluntas-setup .vd-mode-profile { min-height:130px; margin-top:10px; padding-block:8px; }
    #voluntas-setup .vd-profile-fields { gap:6px; }
  }
  @media (max-width:730px) {
    #voluntas-setup .vd-mode-rail { display:none; }
    #voluntas-setup .vd-mode-layout { grid-template-columns:minmax(0,480px); }
  }
  @media (prefers-reduced-motion:reduce) { #voluntas-setup .vd-mode-figure { animation:none; } }
`;

function voluntasMenuArt(layout) {
  const mod = MODS.find(entry => entry.id === 'voluntas-devina' && entry.live);
  if (!mod) return;
  const fs = require('node:fs');
  const path = require('node:path');
  const {pathToFileURL} = require('node:url');
  let pool = [];
  try {
    pool = fs.readdirSync(path.join(mod.dir, 'menu', 'screenshots'))
      .filter(name => /^[\w .-]+\.(png|jpe?g|webp)$/i.test(name))
      .map(name => _mProbe(mod.dir, 'menu/screenshots/' + name, MOD_LIMITS.tex))
      .filter(file => file.ok);
  } catch (error) {}
  const el = VoluntasHUD.el;
  for (const side of ['left', 'right']) {
    const rail = el('div', 'vd-mode-rail vd-mode-' + side, layout);
    rail.setAttribute('aria-hidden', 'true');
    const frame = el('div', 'vd-mode-card vd-mode-frame', rail);
    const [shot] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    if (shot) Object.assign(el('img', '', frame), {alt: '', src: pathToFileURL(shot.full).href});
    const figures = side === 'left'
      ? [['mask', 'gejzerich_finger_character.png'], ['beads', 'namisto_character.png']]
      : [['wreath', 'venok_character.png']];
    for (const [name, file] of figures) {
      const asset = _mProbe(mod.dir, 'menu/' + file, MOD_LIMITS.tex);
      if (asset.ok) Object.assign(el('img', 'vd-mode-figure vd-mode-' + name, rail), {
        alt: '', src: pathToFileURL(asset.full).href
      });
    }
  }
}

function voluntasSetupFields(container) {
  const el = VoluntasHUD.el;
  el('p', 'vd-description', container).textContent = T(
    'В Voluntas Devina два игрока становятся богами соперничающих держав. С началом партии страны уже воюют, а мир заключить нельзя. Копите ману и тратьте её на добродеяния и злодеяния. Помогайте своей стране дождём, животными и ресурсами, обрушивайте бедствия на соперника. Побеждает бог, чья держава выживет. Перед стартом выберите свой игровой аватар.',
    'In Voluntas Devina, two players become gods of rival nations. Both nations start at war and cannot make peace. Earn mana and spend it on deeds. Aid your nation with rain, animals, and resources, or unleash disasters on your rival. The last nation standing wins. Choose your avatar before playing.'
  );
  function label(id, name) {
    Object.assign(el('label', '', container), {htmlFor: id, textContent: name});
  }
  function select(id, name, options) {
    label(id, name);
    const field = el('select', 'vd-mode-input', container);
    field.id = id;
    for (const [value, text] of options) Object.assign(el('option', '', field), {value, textContent: text});
    return field;
  }
  label('voluntas-seed', T('Зерно', 'Seed'));
  const seedRow = el('div', 'vd-seed-row', container);
  const seedInput = el('input', 'vd-mode-input', seedRow);
  Object.assign(seedInput, {id: 'voluntas-seed', type: 'number', min: '1', max: '2147483646', value: String(voluntasNewSeed())});
  const randomSeed = el('button', 'vd-mode-button', seedRow);
  randomSeed.type = 'button';
  randomSeed.textContent = T('Случайное', 'Random');
  const size = select('voluntas-size', T('Размер', 'Size'), [
    ['25x25', '25 × 25'], ['40x40', '40 × 40'], ['60x60', '60 × 60'],
    ['80x60', '80 × 60'], ['120x90', '120 × 90'], ['160x120', '160 × 120'], ['220x220', '220 × 220']
  ]);
  size.value = '80x60';
  const terrain = select('voluntas-terrain', T('Рельеф', 'Terrain'), [
    ['continents', T('Континенты', 'Continents')], ['pangea', T('Пангея', 'Pangaea')], ['islands', T('Острова', 'Islands')]
  ]);
  const testLabel = el('label', 'vd-mode-checkbox', container);
  const testInput = el('input', '', testLabel);
  Object.assign(testInput, {id: 'voluntas-test', type: 'checkbox'});
  testLabel.append(T('Тестовая партия против пустышки', 'Test match against a dummy'));
  const error = el('div', '', container);
  error.id = 'voluntas-error';
  error.setAttribute('role', 'alert');
  randomSeed.addEventListener('click', () => {
    seedInput.value = String(voluntasNewSeed());
    error.textContent = '';
  });
  for (const field of [seedInput, size, terrain]) {
    field.addEventListener('input', () => { error.textContent = ''; });
  }
  return {seedInput, size, terrain, testInput, error};
}

function voluntasOpenSetup(retry) {
  if (netLive() || document.getElementById('voluntas-setup')) return;
  const {el, setIcon, icons} = VoluntasHUD;
  const opener = document.querySelector('.voluntas-entry');
  const modal = el('dialog', 'show', document.body);
  modal.id = 'voluntas-setup';
  modal.setAttribute('aria-labelledby', 'voluntas-setup-title');
  const page = el('div', 'vd-mode-scroll', modal);
  const title = el('h1', 'vd-mode-title', page);
  title.id = 'voluntas-setup-title';
  title.textContent = 'VOLUNTAS DEVINA';
  const layout = el('div', 'vd-mode-layout', page);
  voluntasMenuArt(layout);
  const center = el('div');
  layout.insertBefore(center, layout.lastElementChild);
  const form = el('form', 'vd-mode-card vd-mode-form', center);
  form.noValidate = true;
  const head = el('div', 'vd-mode-head', form);
  const close = el('button', 'vd-mode-button vd-mode-close', head);
  close.type = 'button';
  close.setAttribute('aria-label', T('Закрыть', 'Close'));
  setIcon(close, icons.close);
  const {seedInput, size, terrain, testInput, error} = voluntasSetupFields(el('div', 'vd-mode-fields', form));
  if (retry) {
    seedInput.value = String(retry.seed);
    size.value = retry.size;
    terrain.value = retry.terrain;
    testInput.checked = retry.solo;
    error.textContent = T(
      'Нет подходящих мест для двух столиц. Измените зерно, размер карты или рельеф.',
      'There is no room for two capitals. Change the seed, map size, or terrain.'
    );
  }
  const foot = el('div', 'vd-mode-foot', form);
  const create = el('button', 'vd-mode-button go', foot);
  create.type = 'submit';
  create.textContent = T('Создать мир', 'Create world');

  const card = el('section', 'vd-mode-card vd-mode-profile', center);
  card.setAttribute('aria-label', T('Профиль игрока', 'Player profile'));
  const portrait = voluntasAvatarPreview(el('div', 'vd-profile-avatar', card));
  const fields = el('div', 'vd-profile-fields', card);
  const nickname = el('input', 'vd-mode-input', fields);
  nickname.id = 'voluntas-nickname';
  nickname.type = 'text';
  nickname.autocomplete = 'off';
  nickname.value = voluntasNickname();
  nickname.placeholder = T('Никнейм игрока', 'Player nickname');
  nickname.setAttribute('aria-label', nickname.placeholder);
  const totals = el('div', 'vd-profile-totals', fields);
  const {wins, losses} = voluntasResultTotals();
  el('div', 'vd-mode-stat', totals).textContent = T('Победы', 'Wins') + ' · ' + wins;
  el('div', 'vd-mode-stat', totals).textContent = T('Поражения', 'Losses') + ' · ' + losses;
  const profileError = el('div', 'vd-profile-error', fields);
  profileError.setAttribute('role', 'alert');
  const avatar = el('button', 'vd-mode-button', fields);
  avatar.type = 'button';
  avatar.id = 'voluntas-pick-avatar';
  avatar.textContent = T('Выбрать аватар', 'Choose avatar');
  const preferred = localStorage.getItem(VOLUNTAS_AVATAR_PREFERENCE);
  let avatarId = retry && voluntasAvatarValid(preferred) ? preferred : null;
  if (avatarId) avatar.textContent = T('Аватар', 'Avatar') + ' · ' + T(...VOLUNTAS_AVATARS[avatarId].label);
  portrait.show(voluntasAvatarValid(preferred) ? preferred : VOLUNTAS_DEFAULT_AVATAR);

  function saveNickname() {
    const name = voluntasCleanNickname(nickname.value);
    try {
      if (localStorage.getItem(VOLUNTAS_NICKNAME) !== name) localStorage.setItem(VOLUNTAS_NICKNAME, name);
      profileError.textContent = '';
      return true;
    } catch (storageError) {
      profileError.textContent = T('Не удалось сохранить никнейм.', 'Could not save the nickname.');
      return false;
    }
  }
  nickname.addEventListener('input', saveNickname);
  nickname.addEventListener('blur', () => {
    if (saveNickname()) nickname.value = voluntasNickname();
  });
  avatar.addEventListener('click', () => {
    page.inert = true;
    voluntasAvatarDialog(avatarId || preferred, selected => {
      try { localStorage.setItem(VOLUNTAS_AVATAR_PREFERENCE, selected); }
      catch (storageError) {
        error.textContent = T('Не удалось сохранить аватар.', 'Could not save the avatar.');
        return;
      }
      avatarId = selected;
      avatar.textContent = T('Аватар', 'Avatar') + ' · ' + T(...VOLUNTAS_AVATARS[selected].label);
      portrait.show(selected);
      error.textContent = '';
    }, modal, () => { page.inert = false; avatar.focus(); });
  });
  const closeMenu = () => {
    if (modal.querySelector('#voluntas-avatar.show')) UI.win('voluntas-avatar').hide();
    modal.close();
    portrait.dispose();
    modal.remove();
    opener?.focus();
  };
  close.addEventListener('click', closeMenu);
  modal.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (modal.querySelector('#voluntas-avatar.show')) UI.win('voluntas-avatar').hide();
    else closeMenu();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const seed = Number(seedInput.value);
    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) {
      error.textContent = T('Введите зерно от 1 до 2147483646', 'Enter a seed from 1 to 2147483646');
      seedInput.focus();
      return;
    }
    if (!avatarId) {
      error.textContent = T('Подтвердите аватар перед стартом.', 'Confirm your avatar before starting.');
      avatar.focus();
      return;
    }
    if (!saveNickname()) { nickname.focus(); return; }
    if (voluntasBootMatch(size.value, terrain.value, seed, testInput.checked)) closeMenu();
    else error.textContent = T('Не удалось подготовить комнату', 'Could not prepare the room');
  });
  modal.showModal();
}

function voluntasInstallMenuStyle() {
  VoluntasHUD.el('style', '', document.head).textContent = VOLUNTAS_MENU_STYLE;
}
