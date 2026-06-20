const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const isTouch = matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0;

const CAT_PALETTES = {
  ginger: { body: 0xe58a4b, dark: 0x9e4e2e, chest: 0xffd6a0, eye: 0x55efc4 },
  tuxedo: { body: 0x29283b, dark: 0x11111b, chest: 0xf4eee1, eye: 0x8bf2d1 },
  midnight: { body: 0x24243d, dark: 0x11101c, chest: 0x454267, eye: 0xc8ff5a },
  calico: { body: 0xe9ddc9, dark: 0x3a3040, chest: 0xf3eee3, eye: 0x66e4b9, patch: 0xd9814c }
};

const LEVELS = {
  cozy: {
    title: 'Sunbeam Flat', time: 94, fog: 0xc8a6be, sky: 0xcab2d6, floor: 0xb97858,
    wall: 0xf2d4c4, accent: 0xf7b267, glow: 0x79e3c1, ambient: 1.2, sun: 2.4
  },
  penthouse: {
    title: 'Skyline Penthouse', time: 102, fog: 0x8398b8, sky: 0x8fa9c6, floor: 0x6d7485,
    wall: 0xdde4eb, accent: 0x6c63ff, glow: 0x7ef0e0, ambient: 1.05, sun: 2.8
  },
  neon: {
    title: 'Midnight Loft', time: 86, fog: 0x17152f, sky: 0x17152f, floor: 0x27253d,
    wall: 0x34304f, accent: 0xff5aa5, glow: 0x54f2d2, ambient: 0.75, sun: 1.5
  }
};

const state = {
  mode: 'menu', selectedCat: 'ginger', selectedLevel: 'cozy', playerName: 'Mochi',
  paused: false, started: false, startAt: 0, duration: 90, timeRemaining: 90,
  fish: 0, checkpoint: 0, finishers: [], multiplayer: false,
  cameraYaw: Math.PI * .65, cameraPitch: .36,
  lastTickSecond: null, toastTimer: null, introSeen: false
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(LEVELS.cozy.sky);
scene.fog = new THREE.FogExp2(LEVELS.cozy.fog, 0.0085);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 260);
camera.position.set(-8, 7, 13);

const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const clock = new THREE.Clock();
const audio = new AudioSystem();
const world = new THREE.Group();
scene.add(world);

let ambientLight = new THREE.HemisphereLight(0xffffff, 0x5b4267, 1.2);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff1d3, 2.4);
sunLight.position.set(-14, 24, 13);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
scene.add(sunLight);

const colliders = [];
const hazards = [];
const movingPlatforms = [];
const fishItems = [];
const checkpoints = [];
const remotePlayers = new Map();
let finishTrigger = null;
let doorPanel = null;
let doorGlow = null;
let dustParticles = null;
let player = null;
let runSeed = 1;

const input = {
  forward: 0, right: 0, jumpQueued: false, pounceQueued: false, rescueQueued: false,
  keys: new Set(), pointerDown: false, pointerX: 0, pointerY: 0,
  touchX: 0, touchY: 0
};

let multiplayer;

class RNG {
  constructor(seed = 1) { this.seed = seed >>> 0; }
  next() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  range(a, b) { return a + (b - a) * this.next(); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}

function makeCanvasTexture(kind, colors = ['#fff', '#ddd']) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  if (kind === 'wood') {
    c.fillStyle = colors[0]; c.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) {
      c.fillStyle = y % 64 ? colors[1] : colors[2] || colors[1];
      c.globalAlpha = .16; c.fillRect(0, y, size, 4); c.globalAlpha = 1;
      for (let x = 0; x < size; x += 48) {
        c.strokeStyle = 'rgba(60,20,10,.18)'; c.beginPath(); c.ellipse(x + (y % 64), y + 16, 18, 4, 0, 0, Math.PI * 2); c.stroke();
      }
    }
  } else if (kind === 'rug') {
    const g = c.createLinearGradient(0, 0, size, size); g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]); c.fillStyle = g; c.fillRect(0, 0, size, size);
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 6;
    for (let i = -size; i < size * 2; i += 36) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i - size, size); c.stroke(); }
    c.strokeStyle = 'rgba(30,20,50,.14)'; c.lineWidth = 3;
    for (let i = 18; i < size; i += 36) { c.beginPath(); c.moveTo(0, i); c.lineTo(size, i); c.stroke(); }
  } else if (kind === 'wall') {
    c.fillStyle = colors[0]; c.fillRect(0, 0, size, size);
    c.fillStyle = 'rgba(255,255,255,.16)';
    for (let y = 10; y < size; y += 34) for (let x = 10; x < size; x += 34) c.arc(x, y, 2, 0, Math.PI * 2), c.fill();
  } else if (kind === 'neon') {
    c.fillStyle = colors[0]; c.fillRect(0, 0, size, size);
    c.strokeStyle = colors[1]; c.lineWidth = 3; c.shadowBlur = 12; c.shadowColor = colors[1];
    for (let i = -size; i < size * 2; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i - size, size); c.stroke(); }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

const textures = {
  wood: makeCanvasTexture('wood', ['#b96f50', '#7c3f32', '#d58a5e']),
  darkWood: makeCanvasTexture('wood', ['#5c4b5b', '#31293d', '#7f6a75']),
  rug: makeCanvasTexture('rug', ['#ef7c75', '#7d63ce']),
  wall: makeCanvasTexture('wall', ['#efd6c8']),
  neon: makeCanvasTexture('neon', ['#1d1a35', '#6cf5d8'])
};
textures.wood.repeat.set(3, 1); textures.darkWood.repeat.set(3, 1); textures.rug.repeat.set(2, 1); textures.wall.repeat.set(3, 2); textures.neon.repeat.set(3, 2);

function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? .62, metalness: opts.metalness ?? .04, map: opts.map || null, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.emissiveIntensity || 0, transparent: opts.transparent || false, opacity: opts.opacity ?? 1 });
}

function mesh(geometry, mat, position, rotation = null, scale = null) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.copy(position);
  if (rotation) m.rotation.set(rotation.x, rotation.y, rotation.z);
  if (scale) m.scale.copy(scale);
  m.castShadow = true; m.receiveShadow = true;
  world.add(m);
  return m;
}

function addBox(name, pos, size, mat, options = {}) {
  const m = mesh(new THREE.BoxGeometry(size.x, size.y, size.z, 2, 2, 2), mat, pos, options.rotation);
  m.name = name;
  if (options.collider !== false) {
    const c = { mesh: m, pos: m.position, size: size.clone(), topOnly: options.topOnly ?? true, wallJump: !!options.wallJump, dynamic: !!options.dynamic, tag: options.tag || name };
    colliders.push(c);
    m.userData.collider = c;
  }
  return m;
}

function addRoundedBox(name, pos, size, mat, radius = .2, options = {}) {
  const shape = new THREE.Shape();
  const w = size.x, h = size.z, r = Math.min(radius, w / 2, h / 2);
  shape.moveTo(-w/2+r,-h/2); shape.lineTo(w/2-r,-h/2); shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  shape.lineTo(w/2,h/2-r); shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2); shape.lineTo(-w/2+r,h/2);
  shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); shape.lineTo(-w/2,-h/2+r); shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth:size.y, bevelEnabled:true, bevelSize:Math.min(.08,r/3), bevelThickness:.05, bevelSegments:2 });
  geo.rotateX(Math.PI/2); geo.translate(0,size.y/2,size.z/2);
  const m = mesh(geo, mat, pos);
  m.name = name;
  if (options.collider !== false) colliders.push({ mesh:m,pos:m.position,size:size.clone(),topOnly:options.topOnly??true,wallJump:!!options.wallJump,dynamic:!!options.dynamic,tag:options.tag||name });
  return m;
}

function clearWorld() {
  while (world.children.length) {
    const child = world.children.pop();
    child.traverse?.(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.()); else o.material?.dispose?.(); });
  }
  colliders.length = 0; hazards.length = 0; movingPlatforms.length = 0; fishItems.length = 0; checkpoints.length = 0;
  remotePlayers.clear(); finishTrigger = null; doorPanel = null; doorGlow = null; dustParticles = null; player = null;
}

function addFloor(theme) {
  const floorMap = state.selectedLevel === 'neon' ? textures.neon : state.selectedLevel === 'penthouse' ? textures.darkWood : textures.wood;
  const floorMat = material(theme.floor, { map: floorMap, roughness: .75 });
  addBox('floor', new THREE.Vector3(24, -.55, 0), new THREE.Vector3(70, 1, 26), floorMat, { topOnly: true });

  const wallMat = material(theme.wall, { map: state.selectedLevel === 'neon' ? textures.neon : textures.wall, roughness: .88 });
  addBox('back wall', new THREE.Vector3(24, 6, -12.6), new THREE.Vector3(70, 13, .8), wallMat, { topOnly:false, wallJump:true });
  addBox('side wall', new THREE.Vector3(-10.6, 6, 0), new THREE.Vector3(.8, 13, 26), wallMat, { topOnly:false, wallJump:true });
  addBox('far wall', new THREE.Vector3(58.6, 6, 0), new THREE.Vector3(.8, 13, 26), wallMat, { topOnly:false, wallJump:true });

  const rugMat = material(0xffffff, { map:textures.rug, roughness:.95 });
  const rug = mesh(new THREE.BoxGeometry(15,.05,8), rugMat, new THREE.Vector3(-2,.02,0));
  rug.receiveShadow = true;
}
