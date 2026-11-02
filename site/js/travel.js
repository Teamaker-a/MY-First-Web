import * as THREE from '../vendor/three.module.js';
import { travel as fallbackTravel } from './data.js';
import { loadSiteContent } from './content-store.js?v=20261103a';
import { MusicBox } from './music.js';
import { createCarousel3D } from './carousel3d.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const gsap = window.gsap;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const music = new MusicBox();
let travel = fallbackTravel;

const dom = {
  canvas: $('#globe-canvas'),
  canvas2d: $('#globe-canvas-2d'),
  globeStage: $('#globeStage'),
  travelNav: $('.travel-nav'),
  travelIntro: $('#travelIntro'),
  introEnter: $('#introEnter'),
  introSkip: $('#introSkip'),
  introSound: $('#introSound'),
  introDust: $('#introDust'),
  enterBtn: $('#enterBtn'),
  mapStage: $('#mapStage'),
  map: $('#chinaMap'),
  mapTooltip: $('#mapTooltip'),
  mapPlaces: $('#mapPlaces'),
  backToGlobe: $('#backToGlobe'),
  visitedCount: $('#visitedCount'),
  wishCount: $('#wishCount'),
  demoChip: $('#demoChip'),
  placeOverlay: $('#placeOverlay'),
  placeContent: $('.place-content'),
  placeClose: $('#placeClose'),
  placeMusic: $('#placeMusic'),
  placeBackdrop: $('#placeBackdrop'),
  placeEyebrow: $('#placeEyebrow'),
  placeTitle: $('#placeTitle'),
  placeSubtitle: $('#placeSubtitle'),
  placeNote: $('#placeNote'),
  carouselStage: $('#carouselStage'),
  carousel3d: $('#carousel3d'),
  sparkleField: $('#sparkleField'),
  carouselRing: $('#carouselRing'),
  carouselPrev: $('#carouselPrev'),
  carouselNext: $('#carouselNext'),
  carouselCount: $('#carouselCount'),
  carouselWind: $('#carouselWind'),
  carouselSpin: $('#carouselSpin'),
  carouselMode: $('#carouselMode'),
  photoModal: $('#photoModal'),
  photoModalMedia: $('#photoModalMedia'),
  photoModalCaption: $('#photoModalCaption'),
  photoModalClose: $('#photoModalClose'),
  soundToggle: $('#soundToggle'),
  toast: $('#toast'),
};

const state = {
  view: 'globe',
  introDone: false,
  transitioning: false,
  globeActive: true,
  globeReady: false,
  mapReady: false,
  autoRotate: true,
  dragging: false,
  dragMoved: 0,
  dragStart: { x: 0, y: 0, lastX: 0, lastY: 0, t: 0 },
  targetRotY: 0,
  targetRotX: -0.08,
  carousel: {
    angle: 0,
    step: 60,
    count: 0,
    photos: [],
    place: null,
    dragging: false,
    moved: 0,
    startX: 0,
    startAngle: 0,
    snapping: false,
    hover: false,
    spinning: true,
  },
  soundEnabled: true,
  nightMode: true,
  renderMode: 'webgl',
  carousel3d: null,
  mode3d: false,
  fallbackAngle: 195,
  fallbackZoom: 1,
  fallbackEarth: null,
  fallbackClouds: null,
  fallbackCtx: null,
};

let renderer = null;
let scene = null;
let camera = null;
let globe = null;
let clouds = null;
let stars = null;
let sphere = null;
let raycaster = null;
let pointerNDC = null;
let lastFrame = performance.now();
let toastTimer = null;

const NS = 'http://www.w3.org/2000/svg';

// ------------------------------------------------------------------ helpers

function shortName(name) {
  return String(name || '')
    .replace(/壮族自治区$/, '')
    .replace(/回族自治区$/, '')
    .replace(/维吾尔自治区$/, '')
    .replace(/特别行政区$/, '')
    .replace(/自治区$/, '')
    .replace(/[省市]$/, '');
}

function statusOf(name) {
  if (travel.visited.includes(name)) return 'visited';
  if (travel.wishlist.includes(name)) return 'wishlist';
  return 'neutral';
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('show'), 2200);
}

function baseGlobeZ() {
  const width = dom.canvas.clientWidth || window.innerWidth;
  const height = dom.canvas.clientHeight || window.innerHeight;
  const aspect = width / Math.max(1, height);
  if (aspect < 0.9) return 4.3;
  if (aspect < 1.2) return 3.95;
  return 3.7;
}

// -------------------------------------------------------------------- globe

async function initGlobe() {
  let world;
  try {
    const response = await fetch('assets/data/world-countries.geojson');
    if (!response.ok) throw new Error('world map');
    world = await response.json();
  } catch (error) {
    showToast('世界地图数据加载失败');
    return;
  }

  if (new URLSearchParams(window.location.search).get('earth') === '2d') {
    initFallbackGlobe(world);
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: true });
  } catch (error) {
    initFallbackGlobe(world);
    return;
  }

  state.renderMode = 'webgl';

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const texture = makeEarthTexture(world);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 3.35);

  globe = new THREE.Group();
  globe.rotation.x = 0.22;
  globe.rotation.y = -((105 + 90) * Math.PI) / 180;
  scene.add(globe);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.92,
    metalness: 0.02,
  });
  sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), material);
  globe.add(sphere);

  const cloudTexture = makeCloudTexture();
  cloudTexture.colorSpace = THREE.SRGBColorSpace;
  clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 64, 64),
    new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      roughness: 1,
    }),
  );
  globe.add(clouds);

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const keyLight = new THREE.DirectionalLight(0xfff0d6, 2.1);
  keyLight.position.set(-3.2, 2.2, 4);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x75b9ff, 1.15);
  rimLight.position.set(3.4, -1.2, -3.6);
  scene.add(rimLight);

  stars = makeStars();
  scene.add(stars);

  raycaster = new THREE.Raycaster();
  pointerNDC = new THREE.Vector2();

  resizeGlobe();
  camera.position.z = baseGlobeZ();
  state.targetRotY = globe.rotation.y;
  state.targetRotX = globe.rotation.x;

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => resizeGlobe()).observe(dom.canvas);
  }
  bindGlobeEvents();

  state.globeReady = true;
  requestAnimationFrame(renderLoop);
}

function resizeGlobe() {
  if (state.renderMode === '2d') {
    resizeFallbackCanvas();
    return;
  }
  if (!renderer || !camera) return;
  const width = dom.canvas.clientWidth;
  const height = dom.canvas.clientHeight;
  if (!width || !height) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (state.view === 'globe' && !state.transitioning) {
    camera.position.z = baseGlobeZ();
  }
}

function initFallbackGlobe(world) {
  state.renderMode = '2d';
  dom.canvas.hidden = true;
  dom.canvas2d.hidden = false;
  dom.canvas = dom.canvas2d;
  state.fallbackEarth = makeEarthCanvas(world);
  state.fallbackClouds = makeCloudCanvas();
  state.fallbackAngle = 195;
  state.fallbackZoom = 1;
  resizeFallbackCanvas();
  bindGlobeEvents();
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => resizeFallbackCanvas()).observe(dom.canvas);
  }
  state.globeReady = true;
  requestAnimationFrame(fallbackLoop);
  showToast('当前浏览器未启用 WebGL，已切换到 2D 地球');
}

function resizeFallbackCanvas() {
  if (!dom.canvas || !dom.canvas.clientWidth) return;
  const width = dom.canvas.clientWidth;
  const height = dom.canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dom.canvas.width = Math.round(width * dpr);
  dom.canvas.height = Math.round(height * dpr);
  state.fallbackCtx = dom.canvas.getContext('2d');
  if (!state.fallbackCtx) return;
  state.fallbackCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFallbackGlobe();
}

function drawFallbackGlobe() {
  const ctx = state.fallbackCtx;
  if (!ctx || !dom.canvas) return;
  const width = dom.canvas.clientWidth;
  const height = dom.canvas.clientHeight;
  if (!width || !height) return;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42 * state.fallbackZoom;

  ctx.clearRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.32);
  glow.addColorStop(0, 'rgba(120, 190, 255, 0.18)');
  glow.addColorStop(1, 'rgba(120, 190, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
  ctx.fill();

  const shadow = ctx.createRadialGradient(cx, cy + radius * 0.98, 0, cx, cy + radius * 0.98, radius * 0.62);
  shadow.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 1.04, radius * 0.62, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#86cce2';
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  if (state.fallbackEarth) {
    const drawWidth = radius * 4;
    const drawHeight = radius * 2;
    const offset = (((state.fallbackAngle % 360) + 360) % 360) / 360 * drawWidth;
    ctx.drawImage(state.fallbackEarth, offset - drawWidth, cy - drawHeight / 2, drawWidth, drawHeight);
    ctx.drawImage(state.fallbackEarth, offset, cy - drawHeight / 2, drawWidth, drawHeight);
  }

  if (state.fallbackClouds) {
    const drawWidth = radius * 4;
    const drawHeight = radius * 2;
    const offset =
      ((((state.fallbackAngle * 0.82) % 360) + 360) % 360) / 360 * drawWidth;
    ctx.globalAlpha = 0.24;
    ctx.drawImage(state.fallbackClouds, offset - drawWidth, cy - drawHeight / 2, drawWidth, drawHeight);
    ctx.drawImage(state.fallbackClouds, offset, cy - drawHeight / 2, drawWidth, drawHeight);
    ctx.globalAlpha = 1;
  }

  const shade = ctx.createRadialGradient(
    cx - radius * 0.36,
    cy - radius * 0.4,
    radius * 0.1,
    cx,
    cy,
    radius * 1.02,
  );
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  shade.addColorStop(0.42, 'rgba(255, 255, 255, 0.04)');
  shade.addColorStop(0.78, 'rgba(10, 20, 45, 0.12)');
  shade.addColorStop(1, 'rgba(4, 10, 30, 0.58)');
  ctx.fillStyle = shade;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(190, 230, 255, 0.32)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(120, 190, 255, 0.12)';
  ctx.lineWidth = 9;
  ctx.stroke();
}

function fallbackLoop(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state.globeActive && state.renderMode === '2d') {
    if (state.autoRotate && !state.dragging && !reduceMotion) {
      state.fallbackAngle += delta * 8;
    }
    drawFallbackGlobe();
  }
  requestAnimationFrame(fallbackLoop);
}

function renderLoop(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.renderMode === 'webgl' && state.globeActive && renderer && scene && camera) {
    if (!state.transitioning) {
      if (state.autoRotate && !state.dragging && !reduceMotion) {
        state.targetRotY += delta * 0.085;
      }
      globe.rotation.y += (state.targetRotY - globe.rotation.y) * Math.min(1, delta * 6);
      globe.rotation.x += (state.targetRotX - globe.rotation.x) * Math.min(1, delta * 6);
    }
    clouds.rotation.y += delta * 0.012;
    stars.rotation.y += delta * 0.0025;
    renderer.render(scene, camera);
  }

  requestAnimationFrame(renderLoop);
}

function bindGlobeEvents() {
  dom.canvas.addEventListener('pointerdown', onGlobePointerDown);
  dom.canvas.addEventListener('pointermove', onGlobePointerMove);
  dom.canvas.addEventListener('pointerup', onGlobePointerUp);
  dom.canvas.addEventListener('pointercancel', onGlobePointerCancel);
  dom.canvas.addEventListener('wheel', onGlobeWheel, { passive: false });
}

function onGlobePointerDown(event) {
  if (event.button !== 0 || state.view !== 'globe' || state.transitioning) return;
  state.dragging = true;
  state.dragMoved = 0;
  state.dragStart = {
    x: event.clientX,
    y: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    t: performance.now(),
  };
  state.autoRotate = false;
  try {
    dom.canvas.setPointerCapture(event.pointerId);
  } catch (error) {
    /* ignore */
  }
}

function onGlobePointerMove(event) {
  if (!state.dragging) return;
  const dx = event.clientX - state.dragStart.lastX;
  const dy = event.clientY - state.dragStart.lastY;
  state.dragStart.lastX = event.clientX;
  state.dragStart.lastY = event.clientY;
  state.dragMoved += Math.abs(dx) + Math.abs(dy);
  if (state.renderMode === '2d') {
    state.fallbackAngle += dx * 0.32;
    return;
  }
  state.targetRotY += dx * 0.005;
  state.targetRotX = clamp(state.targetRotX + dy * 0.003, -0.62, 0.62);
}

function onGlobePointerUp(event) {
  if (!state.dragging) return;
  state.dragging = false;
  try {
    dom.canvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    /* ignore */
  }
  const moved = state.dragMoved;
  const elapsed = performance.now() - state.dragStart.t;
  window.setTimeout(() => {
    if (state.view === 'globe' && !state.transitioning) state.autoRotate = true;
  }, moved < 8 ? 0 : 1600);

  if (moved < 9 && elapsed < 700 && hitGlobe(event.clientX, event.clientY)) {
    enterMap();
  }
}

function onGlobePointerCancel() {
  state.dragging = false;
  state.autoRotate = true;
}

function onGlobeWheel(event) {
  if (state.view !== 'globe' || state.transitioning) return;
  event.preventDefault();
  if (state.renderMode === '2d') {
    state.fallbackZoom = clamp(state.fallbackZoom - event.deltaY * 0.0006, 0.82, 1.18);
    drawFallbackGlobe();
    return;
  }
  const base = baseGlobeZ();
  camera.position.z = clamp(
    camera.position.z + event.deltaY * 0.0012,
    base * 0.72,
    base * 1.55,
  );
}

function hitGlobe(clientX, clientY) {
  if (state.renderMode === '2d') {
    const rect = dom.canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.42 * state.fallbackZoom;
    return Math.hypot(clientX - cx, clientY - cy) <= radius;
  }
  if (!raycaster || !camera || !sphere) return false;
  const rect = dom.canvas.getBoundingClientRect();
  pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  return raycaster.intersectObject(sphere, false).length > 0;
}

function makeEarthTexture(world) {
  const texture = new THREE.CanvasTexture(makeEarthCanvas(world));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeEarthCanvas(world) {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#c2edf4');
  ocean.addColorStop(0.5, '#8fd2e6');
  ocean.addColorStop(1, '#6dbbd8');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#ffffff';
  for (let index = 0; index < 90; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const rx = 18 + Math.random() * 95;
    const ry = 3 + Math.random() * 14;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * 0.25 - 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.2;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#f5e6b8';
  ctx.strokeStyle = '#d3b072';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = 'rgba(75, 55, 25, 0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  for (const feature of world.features) {
    if (!feature.geometry) continue;
    drawGeoPath(ctx, feature.geometry, width, height);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  const iceTop = ctx.createLinearGradient(0, 0, 0, 64);
  iceTop.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  iceTop.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = iceTop;
  ctx.fillRect(0, 0, width, 64);

  const iceBottom = ctx.createLinearGradient(0, height, 0, height - 76);
  iceBottom.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  iceBottom.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = iceBottom;
  ctx.fillRect(0, height - 76, width, 76);

  return canvas;
}

function drawGeoPath(ctx, geometry, width, height) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach(([lon, lat], index) => {
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
    }
  }
}

function makeCloudTexture() {
  const texture = new THREE.CanvasTexture(makeCloudCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCloudCanvas() {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.filter = 'blur(9px)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let index = 0; index < 80; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const rx = 18 + Math.random() * 70;
    const ry = 5 + Math.random() * 16;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}

function makeStars() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 7 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.78,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

// ------------------------------------------------------------- globe <-> map

function enterMap() {
  if (state.view !== 'globe' || state.transitioning) return;
  if (!state.globeReady || !state.mapReady) {
    showToast(state.mapReady ? '地球还在准备…' : '中国地图加载中…');
    return;
  }
  state.transitioning = true;
  state.autoRotate = false;

  let watchdog = null;
  const finishEnter = () => {
    window.clearTimeout(watchdog);
    if (state.view === 'map') return;
    state.view = 'map';
    state.globeActive = false;
    state.transitioning = false;
  };
  watchdog = window.setTimeout(() => {
    if (!state.transitioning) return;
    dom.globeStage.style.opacity = '0';
    dom.canvas.style.opacity = '0';
    showMapStage();
    finishEnter();
  }, 2600);

  if (state.renderMode === '2d') {
    const fallbackTimeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: finishEnter,
    });
    fallbackTimeline
      .to(dom.globeStage, { opacity: 0, duration: 0.5 }, 0.15)
      .to(dom.canvas, { opacity: 0, duration: 0.55 }, 0.25)
      .add(showMapStage, 0.7)
      .to({}, { duration: 0.35 });
    return;
  }

  const targetY = -((105 + 90) * Math.PI) / 180;
  const current = globe.rotation.y;
  const delta = (((targetY - current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const finalY = current + delta + Math.PI * 2;
  const zoomZ = baseGlobeZ() * 0.48;

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete: finishEnter,
  });

  timeline
    .to(globe.rotation, { y: finalY, x: 0.08, duration: 1.25 }, 0)
    .to(camera.position, { z: zoomZ, duration: 1.35, ease: 'power2.in' }, 0)
    .to(dom.globeStage, { opacity: 0, duration: 0.45 }, 0.8)
    .to(dom.canvas, { opacity: 0, duration: 0.5 }, 0.9)
    .add(showMapStage, 1.02)
    .to({}, { duration: 0.4 });
}

function showMapStage() {
  if (!dom.mapStage.hidden) return;
  dom.mapTooltip.hidden = true;
  dom.mapStage.hidden = false;
  dom.mapStage.style.opacity = '1';
  dom.mapStage.classList.remove('map-enter');
  void dom.mapStage.offsetWidth;
  dom.mapStage.classList.add('map-enter');
  $$('.province', dom.map).forEach((path) => {
    path.style.opacity = '1';
  });
  $$('.province-label', dom.map).forEach((label) => {
    label.style.opacity = '1';
  });
}

function showGlobe() {
  if (state.view !== 'map' || state.transitioning) return;
  state.transitioning = true;

  const finish = () => {
    if (state.view === 'globe') return;
    dom.mapStage.hidden = true;
    dom.mapStage.style.opacity = '';
    state.view = 'globe';
    state.globeActive = true;
    state.autoRotate = true;
    if (state.renderMode === 'webgl') {
      state.targetRotY = globe.rotation.y;
      state.targetRotX = 0.22;
      globe.rotation.x = 0.22;
      camera.position.z = baseGlobeZ();
    } else {
      state.fallbackAngle = 195;
      state.fallbackZoom = 1;
    }
    dom.canvas.style.opacity = '1';
    dom.globeStage.style.opacity = '1';
    state.transitioning = false;
  };

  gsap.to(dom.mapStage, { opacity: 0, duration: 0.35, onComplete: finish });
  window.setTimeout(finish, 600);
}

// ---------------------------------------------------------------------- map

async function initMap() {
  try {
    const response = await fetch('assets/data/china-provinces.json');
    if (!response.ok) throw new Error('china map');
    const china = await response.json();
    buildChinaMap(china.features);
    state.mapReady = true;
  } catch (error) {
    showToast('中国地图数据加载失败');
  }
}

function buildChinaMap(features) {
  const usable = features.filter((feature) => feature.properties && feature.properties.name);
  const width = 1000;
  const height = 580;
  const padding = 46;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const feature of usable) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [lon, lat] of ring) {
          const [x, y] = mercator(lon, lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (height - (maxY - minY) * scale) / 2 + maxY * scale;

  const toPoint = (lon, lat) => {
    const [x, y] = mercator(lon, lat);
    return [x * scale + offsetX, -y * scale + offsetY];
  };

  const svg = dom.map;
  svg.innerHTML = '';
  const labelLayer = document.createElementNS(NS, 'g');

  for (const feature of usable) {
    const name = feature.properties.name;
    const status = statusOf(name);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', pathData(feature.geometry, toPoint));
    path.setAttribute('class', `province ${status}`);
    path.dataset.name = name;

    if (status !== 'neutral') {
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute(
        'aria-label',
        `${shortName(name)}，${status === 'visited' ? '去过' : '最想去'}`,
      );
    }

    const title = document.createElementNS(NS, 'title');
    title.textContent = name;
    path.appendChild(title);

    path.addEventListener('pointerenter', (event) => showTooltip(name, status, event));
    path.addEventListener('pointermove', moveTooltip);
    path.addEventListener('pointerleave', hideTooltip);
    path.addEventListener('click', () => onProvinceClick(name, status));
    path.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onProvinceClick(name, status);
      }
    });

    svg.appendChild(path);
  }

  const hiddenLabels = new Set(['北京市', '天津市', '上海市', '香港特别行政区', '澳门特别行政区']);
  const labelOffsets = {
    '江苏省': [-14, 0],
    '浙江省': [16, 6],
    '安徽省': [-8, -8],
    '福建省': [12, 6],
    '广东省': [-6, 10],
    '广西壮族自治区': [-12, 6],
    '海南省': [0, 10],
    '台湾省': [12, 4],
    '宁夏回族自治区': [4, -4],
  };

  for (const feature of usable) {
    const name = feature.properties.name;
    if (hiddenLabels.has(name)) continue;
    const center = feature.properties.centroid || feature.properties.center;
    if (!center) continue;
    const [x, y] = toPoint(center[0], center[1]);
    const [dx, dy] = labelOffsets[name] || [0, 0];
    const status = statusOf(name);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(x + dx));
    text.setAttribute('y', String(y + dy));
    text.setAttribute('class', `province-label${status !== 'neutral' ? ' strong' : ''}`);
    text.textContent = shortName(name);
    labelLayer.appendChild(text);
  }

  svg.appendChild(labelLayer);

  dom.visitedCount.textContent = String(travel.visited.length);
  dom.wishCount.textContent = String(travel.wishlist.length);
  dom.demoChip.hidden = !travel.demo;
  renderMapPlaces();
}

function renderMapPlaces() {
  if (!dom.mapPlaces) return;
  dom.mapPlaces.innerHTML = travel.visited
    .slice(0, 5)
    .map((name) => {
      const place = getPlace(name);
      const photos = travel.places[name] && travel.places[name].photos;
      const tone = photos && photos[0] && photos[0].tone ? photos[0].tone : ['#f3c6d3', '#8fb8c9'];
      return `
        <button class="place-list-item" data-name="${esc(name)}">
          <span class="place-thumb" style="--c1:${tone[0]};--c2:${tone[1]}"></span>
          <span class="place-text">
            <strong>${esc(place.title)}</strong>
            <small>${esc(place.subtitle)}</small>
          </span>
          <span class="place-arrow">↗</span>
        </button>`;
    })
    .join('');
}

function mercator(lon, lat) {
  // 简单的等距圆柱投影：横屏下中国地图更饱满，也更像游戏地图。
  return [lon, lat];
}

function pathData(geometry, toPoint) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let path = '';
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach(([lon, lat], index) => {
        const [x, y] = toPoint(lon, lat);
        path += `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      path += 'Z';
    }
  }
  return path;
}

function showTooltip(name, status, event) {
  dom.mapTooltip.hidden = false;
  const label =
    status === 'visited'
      ? '<em>去过</em>'
      : status === 'wishlist'
        ? '<em>最想去</em>'
        : '还没点亮';
  dom.mapTooltip.innerHTML = `${esc(shortName(name))} · ${label}`;
  dom.mapTooltip.classList.toggle('wish', status === 'wishlist');
  moveTooltip(event);
}

function moveTooltip(event) {
  dom.mapTooltip.style.left = `${event.clientX}px`;
  dom.mapTooltip.style.top = `${event.clientY}px`;
}

function hideTooltip() {
  dom.mapTooltip.hidden = true;
}

function onProvinceClick(name, status) {
  hideTooltip();
  if (status === 'neutral') {
    showToast('这里还没点亮，先记在愿望清单里？');
    return;
  }
  openPlace(name);
}

// --------------------------------------------------------------------- place

function getPlace(name) {
  const data = travel.places[name] || {};
  const status = statusOf(name);
  const short = shortName(name);
  return {
    name,
    status,
    short,
    title: data.title || (status === 'wishlist' ? `${short} · 愿望清单` : `${short} · 旅行记录`),
    subtitle: data.subtitle || (status === 'wishlist' ? '还没去，先留个位置' : '照片整理中'),
    note:
      data.note ||
      (status === 'wishlist'
        ? '这个地方还在愿望清单里。等真正出发的那天，再把照片放进来。'
        : '这里的照片还在整理，之后会补上。'),
    wish: Boolean(data.wish) || status === 'wishlist',
    photos: Array.isArray(data.photos) ? data.photos.slice() : [],
  };
}

function openPlace(name) {
  const place = getPlace(name);
  if (!place.photos.length) {
    place.photos = [
      {
        caption: place.wish ? '总有一天会去' : '照片整理中',
        motif: 'mountain',
        tone: ['#ffd1dc', '#9db8d8'],
      },
      {
        caption: place.wish ? '想在这里醒来' : '正在整理',
        motif: 'forest',
        tone: ['#d9e8d2', '#8fa89a'],
      },
      {
        caption: place.wish ? '留给未来的照片' : '很快就会补上',
        motif: 'city',
        tone: ['#f3d9b8', '#b08f76'],
      },
    ];
  }

  dom.placeEyebrow.textContent = place.wish
    ? 'WISHLIST · 愿望清单'
    : `VISITED · ${place.subtitle.split('·').pop().trim() || '旅行记录'}`;
  dom.placeTitle.textContent = place.title;
  dom.placeSubtitle.textContent = place.subtitle;
  dom.placeNote.textContent = place.note;

  buildCarousel(place.photos, place);
  state.place = place;
  state.carousel.spinning = true;
  dom.placeOverlay.classList.toggle('night', state.nightMode);
  updateSpinButton();
  updateModeButton();
  dom.placeOverlay.hidden = false;
  dom.placeOverlay.style.opacity = '1';
  document.body.classList.add('place-open');
  dom.placeContent.classList.remove('place-enter');
  void dom.placeContent.offsetWidth;
  dom.placeContent.classList.add('place-enter');

  const items = place.photos.map((photo, index) => ({
    ...photo,
    src: photo.src || makePlaceholder(photo),
    photoIndex: index,
  }));

  if (!state.carousel3d) {
    state.carousel3d = createCarousel3D(dom.carousel3d, {
      onSelect: (photoIndex) => {
        const current = state.place;
        if (!current) return;
        const photo = current.photos[photoIndex];
        if (photo) {
          window.setTimeout(() => openPhotoModal(photo, current), 0);
        }
      },
      onIndex: (front, total) => {
        dom.carouselCount.textContent = `${front + 1} / ${total}`;
      },
    });
    window.__carousel3d = state.carousel3d;
  }

  if (state.carousel3d) {
    state.mode3d = true;
    dom.placeOverlay.classList.add('mode-3d');
    state.carousel3d.load(items);
    state.carousel3d.setNight(state.nightMode);
    state.carousel3d.setSpinning(state.carousel.spinning);
    state.carousel3d.start();
  } else {
    state.mode3d = false;
    dom.placeOverlay.classList.remove('mode-3d');
  }

  requestAnimationFrame(() => {
    if (!state.mode3d) {
      updateCarouselRadius();
      updateCarouselTransform();
      updateCarouselCount();
    }
  });

  if (state.soundEnabled && !music.playing) {
    const started = music.start();
    updateSound(started);
  }
}

function closePlace() {
  if (dom.placeOverlay.hidden) return;
  const finish = () => {
    if (dom.placeOverlay.hidden) return;
    dom.placeOverlay.hidden = true;
    dom.placeOverlay.style.opacity = '';
    document.body.classList.remove('place-open');
    state.carousel3d?.stop();
    state.place = null;
    state.carousel.hover = false;
  };
  gsap.to(dom.placeOverlay, { opacity: 0, duration: 0.25, onComplete: finish });
  window.setTimeout(finish, 420);
}

// ------------------------------------------------------------------ carousel

function buildCarousel(photos, place) {
  const count = photos.length;
  const step = 360 / count;
  const carousel = state.carousel;
  const characters = ['bunny', 'dog', 'cat', 'carrot', 'pelican', 'star'];
  carousel.angle = 0;
  carousel.step = step;
  carousel.count = count;
  carousel.photos = photos;
  carousel.place = place;
  carousel.snapping = false;
  carousel.moved = 0;
  carousel.dragging = false;

  dom.carouselRing.innerHTML = '';
  photos.forEach((photo, index) => {
    const card = document.createElement('figure');
    card.className = 'carousel-card';
    card.style.setProperty('--angle', `${index * step}deg`);
    card.dataset.index = String(index);
    const src = photo.src || makePlaceholder(photo);
    const rider = characters[index % characters.length];
    card.innerHTML = `
      <img class="card-rider" src="assets/images/characters/${rider}.svg" alt="" aria-hidden="true" draggable="false">
      <div class="card-frame">
        <img src="${src}" alt="${esc(photo.caption || place.short)}" loading="lazy">
        ${photo.src ? '' : '<span class="card-badge">照片待上传</span>'}
      </div>
      <figcaption>${esc(photo.caption || `第 ${index + 1} 张`)}</figcaption>
    `;
    dom.carouselRing.appendChild(card);
  });

  updateCarouselRadius();
  updateCarouselTransform();
  updateCarouselCount();
}

function updateCarouselRadius() {
  const card = dom.carouselRing.querySelector('.carousel-card');
  if (!card) return;
  const cardWidth = card.offsetWidth || 200;
  const gap = cardWidth > 160 ? 34 : 22;
  const radius = Math.round(((cardWidth + gap) * state.carousel.count) / (Math.PI * 2));
  const minRadius = cardWidth > 160 ? 190 : 150;
  dom.carouselRing.style.setProperty('--radius', `${Math.max(minRadius, radius)}px`);
}

function updateCarouselTransform() {
  const carousel = state.carousel;
  if (!carousel.count) return;
  dom.carouselRing.style.transform = `rotateX(-6deg) rotateY(${carousel.angle}deg)`;
  const cards = dom.carouselRing.children;
  for (let index = 0; index < cards.length; index += 1) {
    const worldAngle = ((carousel.angle + index * carousel.step) * Math.PI) / 180;
    const front = (Math.cos(worldAngle) + 1) / 2;
    cards[index].style.opacity = String(0.26 + front * 0.74);
    cards[index].style.zIndex = String(Math.round(front * 100));
  }
}

function updateCarouselCount() {
  const carousel = state.carousel;
  if (!carousel.count) {
    dom.carouselCount.textContent = '0 / 0';
    return;
  }
  const index = ((Math.round(-carousel.angle / carousel.step) % carousel.count) + carousel.count) % carousel.count;
  dom.carouselCount.textContent = `${index + 1} / ${carousel.count}`;
}

function carouselLoop() {
  const carousel = state.carousel;
  if (
    state.place &&
    dom.photoModal.hidden &&
    carousel.spinning &&
    !carousel.dragging &&
    !carousel.snapping &&
    !carousel.hover &&
    !reduceMotion
  ) {
    carousel.angle = (carousel.angle + 0.075) % 360;
    updateCarouselTransform();
    updateCarouselCount();
  }
  requestAnimationFrame(carouselLoop);
}

function snapCarousel() {
  const carousel = state.carousel;
  if (!carousel.count) return;
  if (reduceMotion) {
    carousel.angle = Math.round(carousel.angle / carousel.step) * carousel.step;
    updateCarouselTransform();
    updateCarouselCount();
    return;
  }
  carousel.snapping = true;
  gsap.to(carousel, {
    angle: Math.round(carousel.angle / carousel.step) * carousel.step,
    duration: 0.5,
    ease: 'power2.out',
    onUpdate: () => {
      updateCarouselTransform();
      updateCarouselCount();
    },
    onComplete: () => {
      carousel.snapping = false;
    },
  });
}

function rotateCarousel(direction) {
  if (state.mode3d && state.carousel3d) {
    state.carousel3d.step(direction);
    return;
  }
  const carousel = state.carousel;
  if (!carousel.count || carousel.snapping) return;
  const base = Math.round(carousel.angle / carousel.step) * carousel.step;
  carousel.snapping = true;
  gsap.to(carousel, {
    angle: base + direction * carousel.step,
    duration: reduceMotion ? 0.001 : 0.55,
    ease: 'power2.out',
    onUpdate: () => {
      updateCarouselTransform();
      updateCarouselCount();
    },
    onComplete: () => {
      carousel.snapping = false;
    },
  });
}

function bindCarouselEvents() {
  dom.carouselPrev.addEventListener('click', () => rotateCarousel(1));
  dom.carouselNext.addEventListener('click', () => rotateCarousel(-1));

  dom.carouselStage.addEventListener('pointerdown', (event) => {
    if (!state.place || event.button !== 0) return;
    const carousel = state.carousel;
    carousel.dragging = true;
    carousel.moved = 0;
    carousel.startX = event.clientX;
    carousel.startAngle = carousel.angle;
    try {
      dom.carouselStage.setPointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
  });

  dom.carouselStage.addEventListener('pointermove', (event) => {
    const carousel = state.carousel;
    if (!carousel.dragging) return;
    const dx = event.clientX - carousel.startX;
    carousel.moved = Math.max(carousel.moved, Math.abs(dx));
    carousel.angle = carousel.startAngle + dx * 0.28;
    updateCarouselTransform();
    updateCarouselCount();
  });

  const endDrag = (event) => {
    const carousel = state.carousel;
    if (!carousel.dragging) return;
    carousel.dragging = false;
    try {
      dom.carouselStage.releasePointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
    if (carousel.moved <= 8 && carousel.place) {
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const card = hit && hit.closest('.carousel-card');
      if (card && card.dataset.index !== undefined) {
        const photo = carousel.photos[Number(card.dataset.index)];
        if (photo) {
          // 延迟到 click 事件之后再打开，避免同一次点击命中弹层背景又把它关掉
          window.setTimeout(() => {
            if (state.place) openPhotoModal(photo, carousel.place);
          }, 0);
          return;
        }
      }
    }
    snapCarousel();
  };

  dom.carouselStage.addEventListener('pointerup', endDrag);
  dom.carouselStage.addEventListener('pointercancel', endDrag);
  dom.carouselStage.addEventListener('pointerenter', () => {
    state.carousel.hover = true;
  });
  dom.carouselStage.addEventListener('pointerleave', () => {
    state.carousel.hover = false;
  });
}

function makePlaceholder(photo) {
  const [colorA, colorB] = Array.isArray(photo.tone) && photo.tone.length === 2
    ? photo.tone
    : ['#f3c6d3', '#8fb8c9'];
  const motif = photo.motif || 'mountain';
  const motifs = {
    mountain: `
      <circle cx="470" cy="250" r="72" fill="rgba(255,248,230,.78)"/>
      <path d="M0 690 L170 420 L300 590 L455 350 L640 690 L640 900 L0 900 Z" fill="rgba(55,65,85,.28)"/>
      <path d="M0 760 L220 520 L380 690 L540 480 L640 620 L640 900 L0 900 Z" fill="rgba(35,45,62,.42)"/>`,
    water: `
      <circle cx="470" cy="270" r="78" fill="rgba(255,248,230,.75)"/>
      <path d="M0 630 Q160 585 320 630 T640 630 L640 900 L0 900 Z" fill="rgba(40,80,110,.28)"/>
      <path d="M0 710 Q160 665 320 710 T640 710 L640 900 L0 900 Z" fill="rgba(30,60,90,.4)"/>
      <path d="M0 790 Q160 745 320 790 T640 790 L640 900 L0 900 Z" fill="rgba(20,45,70,.5)"/>`,
    city: `
      <circle cx="500" cy="235" r="58" fill="rgba(255,248,230,.68)"/>
      <g fill="rgba(45,40,60,.36)">
        <rect x="55" y="520" width="110" height="380"/>
        <rect x="190" y="430" width="90" height="470"/>
        <rect x="300" y="560" width="130" height="340"/>
        <rect x="450" y="470" width="100" height="430"/>
        <rect x="565" y="610" width="60" height="290"/>
      </g>
      <g fill="rgba(255,228,170,.45)">
        <rect x="78" y="550" width="14" height="18"/><rect x="110" y="550" width="14" height="18"/><rect x="78" y="590" width="14" height="18"/>
        <rect x="215" y="470" width="14" height="18"/><rect x="245" y="470" width="14" height="18"/><rect x="215" y="510" width="14" height="18"/>
        <rect x="330" y="600" width="18" height="20"/><rect x="370" y="600" width="18" height="20"/><rect x="330" y="650" width="18" height="20"/>
        <rect x="475" y="510" width="14" height="18"/><rect x="510" y="510" width="14" height="18"/><rect x="475" y="555" width="14" height="18"/>
      </g>`,
    forest: `
      <circle cx="480" cy="245" r="64" fill="rgba(255,248,230,.72)"/>
      <g fill="rgba(40,70,58,.4)">
        <path d="M80 900 L150 620 L220 900 Z"/>
        <path d="M180 900 L260 560 L340 900 Z"/>
        <path d="M300 900 L370 650 L440 900 Z"/>
        <path d="M430 900 L510 590 L590 900 Z"/>
      </g>`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="900" viewBox="0 0 640 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stop-color="${colorA}"/>
        <stop offset="1" stop-color="${colorB}"/>
      </linearGradient>
      <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".12"/>
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="1" stop-color="#141428" stop-opacity=".18"/>
      </linearGradient>
    </defs>
    <rect width="640" height="900" fill="url(#bg)"/>
    ${motifs[motif] || motifs.mountain}
    <rect width="640" height="900" fill="url(#veil)"/>
    <g fill="#ffffff" opacity=".2">
      <circle cx="90" cy="120" r="2"/><circle cx="150" cy="90" r="1.5"/><circle cx="220" cy="160" r="1.2"/>
      <circle cx="560" cy="110" r="1.6"/><circle cx="590" cy="180" r="1.2"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ----------------------------------------------------------------- photo modal

function openPhotoModal(photo, place) {
  const src = photo.src || makePlaceholder(photo);
  dom.photoModalMedia.innerHTML = `<img src="${src}" alt="${esc(photo.caption || place.short)}">`;
  dom.photoModalCaption.textContent = `${photo.caption || place.short}${photo.src ? '' : ' · 示例图'}`;
  dom.photoModal.hidden = false;
  dom.photoModal.style.opacity = '1';
  dom.photoModal.classList.remove('modal-enter');
  void dom.photoModal.offsetWidth;
  dom.photoModal.classList.add('modal-enter');
}

function closePhotoModal() {
  if (dom.photoModal.hidden) return;
  const finish = () => {
    if (dom.photoModal.hidden) return;
    dom.photoModal.hidden = true;
    dom.photoModal.style.opacity = '';
  };
  gsap.to(dom.photoModal, { opacity: 0, duration: 0.2, onComplete: finish });
  window.setTimeout(finish, 360);
}

// -------------------------------------------------------------------- music

function updateSound(on) {
  const pressed = String(Boolean(on));
  [dom.soundToggle, dom.placeMusic, dom.introSound].forEach((button) => {
    if (!button) return;
    button.setAttribute('aria-pressed', pressed);
    button.classList.toggle('is-on', Boolean(on));
  });
  document.body.classList.toggle('music-on', Boolean(on));
  const label = dom.soundToggle.querySelector('.sound-label');
  if (label) label.textContent = on ? '音乐开' : '音乐';
  const introLabel = dom.introSound?.querySelector('.intro-sound-label');
  if (introLabel) introLabel.textContent = on ? 'SOUND ON' : 'SOUND OFF';
}

function toggleMusic() {
  const playing = music.toggle();
  state.soundEnabled = playing;
  updateSound(playing);
  if (!playing) showToast('背景音乐已关闭');
}

function updateSpinButton() {
  const on = state.carousel.spinning;
  dom.carouselSpin.textContent = on ? '暂停旋转' : '继续旋转';
  dom.carouselSpin.setAttribute('aria-pressed', String(!on));
}

function updateModeButton() {
  const night = state.nightMode;
  dom.carouselMode.textContent = night ? '☀ 白天' : '☾ 夜晚';
  dom.carouselMode.setAttribute('aria-pressed', String(night));
}

function bindCarouselToolbar() {
  dom.carouselWind.addEventListener('click', () => {
    if (state.mode3d && state.carousel3d) {
      state.carousel3d.wind();
      return;
    }
    const stage = dom.carouselStage;
    stage.classList.remove('gust');
    void stage.offsetWidth;
    stage.classList.add('gust');
    window.setTimeout(() => stage.classList.remove('gust'), 1300);
  });

  dom.carouselSpin.addEventListener('click', () => {
    state.carousel.spinning = !state.carousel.spinning;
    state.carousel3d?.setSpinning(state.carousel.spinning);
    updateSpinButton();
  });

  dom.carouselMode.addEventListener('click', () => {
    state.nightMode = !state.nightMode;
    dom.placeOverlay.classList.toggle('night', state.nightMode);
    state.carousel3d?.setNight(state.nightMode);
    updateModeButton();
  });
}

// --------------------------------------------------------------------- bind

function fillSparkles(field, count) {
  if (!field) return;
  const colors = ['#f7ead0', '#e6c98f', '#fffaf0', '#d9a7a0', '#c9c0e8'];
  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement('span');
    sparkle.className = `sparkle${index % 4 === 0 ? ' dot' : ''}`;
    sparkle.style.setProperty('--x', `${8 + Math.random() * 84}%`);
    sparkle.style.setProperty('--y', `${6 + Math.random() * 88}%`);
    sparkle.style.setProperty('--s', `${1.5 + Math.random() * 4}px`);
    sparkle.style.setProperty('--d', `${2.8 + Math.random() * 4}s`);
    sparkle.style.setProperty('--delay', `${-Math.random() * 7}s`);
    sparkle.style.setProperty('--o', `${0.4 + Math.random() * 0.5}`);
    sparkle.style.setProperty('--c', colors[index % colors.length]);
    field.appendChild(sparkle);
  }
}

function initSparkles() {
  const compact = window.innerWidth < 700;
  fillSparkles(dom.sparkleField, compact ? 30 : 60);
  fillSparkles(dom.introDust, compact ? 24 : 48);
}

function initIntro() {
  const skip =
    document.documentElement.classList.contains('skip-travel-intro') || reduceMotion;
  if (skip) {
    if (dom.travelIntro) dom.travelIntro.hidden = true;
    document.body.classList.remove('intro-active');
    state.introDone = true;
    return;
  }
  document.body.classList.add('intro-active');
  state.autoRotate = false;
  state.transitioning = true;
  state.introDone = false;
  if (dom.travelIntro) dom.travelIntro.hidden = false;
}

function enterExperience() {
  if (state.introDone) return;
  state.introDone = true;
  try {
    sessionStorage.setItem('travelIntroSeen', '1');
  } catch (error) {
    /* ignore */
  }
  document.body.classList.remove('intro-active');
  state.transitioning = false;
  state.autoRotate = true;

  const intro = dom.travelIntro;
  if (!intro) return;

  if (!window.gsap) {
    intro.hidden = true;
    return;
  }

  if (state.renderMode === 'webgl' && camera) {
    const targetZ = baseGlobeZ();
    camera.position.z = targetZ * 1.12;
    gsap.to(camera.position, { z: targetZ, duration: 1.7, ease: 'power2.out' }, 0.35);
  }

  const timeline = gsap.timeline({
    onComplete: () => {
      intro.hidden = true;
    },
  });

  timeline
    .to('.intro-center', { opacity: 0, y: -18, duration: 0.8, ease: 'power2.in' }, 0.35)
    .to('.intro-title', { scale: 2.25, duration: 1.35, ease: 'power2.in' }, 0)
    .to('.intro-pattern', { scale: 1.35, opacity: 0, duration: 1.5, ease: 'power2.in' }, 0)
    .to('.intro-dust', { opacity: 0, duration: 0.8 }, 0)
    .to(intro, { clipPath: 'circle(0% at 50% 50%)', duration: 1.3, ease: 'power2.inOut' }, 0.3)
    .fromTo(
      [dom.travelNav, dom.globeStage],
      { opacity: 0 },
      { opacity: 1, duration: 0.9 },
      0.6,
    );
}

function bindUI() {
  initSparkles();
  initIntro();
  dom.introEnter.addEventListener('click', enterExperience);
  dom.introSkip.addEventListener('click', enterExperience);
  dom.introSound.addEventListener('click', toggleMusic);
  dom.enterBtn.addEventListener('click', enterMap);
  dom.backToGlobe.addEventListener('click', showGlobe);
  dom.mapPlaces.addEventListener('click', (event) => {
    const item = event.target.closest('.place-list-item');
    if (item) openPlace(item.dataset.name);
  });
  dom.placeClose.addEventListener('click', closePlace);
  dom.placeBackdrop.addEventListener('click', closePlace);
  dom.photoModalClose.addEventListener('click', closePhotoModal);
  dom.photoModal.addEventListener('click', (event) => {
    if (event.target === dom.photoModal) closePhotoModal();
  });

  dom.soundToggle.addEventListener('click', toggleMusic);
  dom.placeMusic.addEventListener('click', toggleMusic);

  bindCarouselEvents();
  bindCarouselToolbar();

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!dom.photoModal.hidden) {
        closePhotoModal();
        return;
      }
      if (!dom.placeOverlay.hidden) {
        closePlace();
        return;
      }
      if (state.view === 'map') {
        showGlobe();
        return;
      }
    }
    if (!dom.placeOverlay.hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      rotateCarousel(event.key === 'ArrowLeft' ? 1 : -1);
    }
  });

  window.addEventListener('resize', () => {
    resizeGlobe();
    if (!dom.placeOverlay.hidden) {
      updateCarouselRadius();
      updateCarouselTransform();
    }
  });

  requestAnimationFrame(carouselLoop);
}

// --------------------------------------------------------------------- init

async function init() {
  try {
    const content = await loadSiteContent();
    if (content.travel) travel = content.travel;
  } catch (error) {
    // Keep the bundled travel data if the content file cannot be loaded.
  }

  bindUI();
  await Promise.all([initGlobe(), initMap()]);
}

window.__travel = {
  state,
  enterMap,
  showGlobe,
  openPlace,
  closePlace,
  rotateCarousel,
  updateCarouselTransform,
};

init();
