import * as THREE from '../vendor/three.module.js';

const CHARACTER_FILES = ['bunny', 'dog', 'cat', 'carrot', 'pelican', 'star'];

export function createCarousel3D(container, hooks = {}) {
  if (!container) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = window.innerWidth > 700;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const root = new THREE.Group();
  scene.add(root);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const textureLoader = new THREE.TextureLoader();

  function loadTexture(path, repeatX = 1, repeatY = 1, offsetY = 0) {
    const texture = textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.offset.y = offsetY;
    return texture;
  }

  const baseTexture = loadTexture('assets/carousel/base.jpg', 2, 1);
  const columnTexture = loadTexture('assets/carousel/column.jpg', 1, 0.25);
  const panelsTexture = loadTexture('assets/carousel/panels.jpg', 2, 1);

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7a04d,
    metalness: 0.68,
    roughness: 0.34,
  });
  const creamMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2e7cd,
    roughness: 0.72,
  });
  const redMaterial = new THREE.MeshStandardMaterial({
    color: 0xb34e42,
    roughness: 0.62,
  });
  const blueMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b98ae,
    roughness: 0.68,
  });
  const baseMaterial = new THREE.MeshStandardMaterial({
    map: baseTexture,
    roughness: 0.76,
    metalness: 0.04,
  });
  const panelsMaterial = new THREE.MeshStandardMaterial({
    map: panelsTexture,
    roughness: 0.7,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  function addMesh(geometry, material, x = 0, y = 0, z = 0, parent = root) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addRing(radius, y, tube = 0.035, material = goldMaterial) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    root.add(ring);
    return ring;
  }

  // ---- base ----
  addMesh(new THREE.CylinderGeometry(2.15, 2.26, 0.36, 96), baseMaterial, 0, 0.18);
  const baseTop = new THREE.Mesh(new THREE.CircleGeometry(2.12, 96), creamMaterial);
  baseTop.rotation.x = -Math.PI / 2;
  baseTop.position.y = 0.365;
  baseTop.receiveShadow = true;
  root.add(baseTop);
  addRing(2.2, 0.37, 0.035);
  addRing(2.3, 0.02, 0.03, goldMaterial);

  // ---- column ----
  const sections = [
    { y: 0.86, h: 1.05, r1: 0.78, r2: 0.6, offset: 0 },
    { y: 1.94, h: 1.05, r1: 0.6, r2: 0.52, offset: 0.25 },
    { y: 3.02, h: 1.05, r1: 0.52, r2: 0.62, offset: 0.5 },
    { y: 4.1, h: 0.95, r1: 0.62, r2: 0.55, offset: 0.75 },
  ];
  sections.forEach((section, index) => {
    const material = new THREE.MeshStandardMaterial({
      map: columnTexture.clone(),
      roughness: 0.68,
      metalness: 0.04,
    });
    material.map.needsUpdate = true;
    material.map.repeat.set(1, 0.25);
    material.map.offset.y = section.offset;
    addMesh(
      new THREE.CylinderGeometry(section.r1, section.r2, section.h, 48),
      material,
      0,
      section.y,
    );
    addRing(section.r2 + 0.03, section.y - section.h / 2, 0.03, [redMaterial, blueMaterial, goldMaterial, redMaterial][index]);
  });

  // capital
  addMesh(new THREE.CylinderGeometry(0.62, 0.5, 0.38, 48), creamMaterial, 0, 4.72);
  addRing(0.63, 4.54, 0.03);
  addRing(0.55, 4.92, 0.025);

  // ---- canopy ----
  const fascia = new THREE.Mesh(
    new THREE.CylinderGeometry(2.72, 2.72, 0.98, 96, 1, true),
    panelsMaterial,
  );
  fascia.position.y = 5.2;
  fascia.castShadow = true;
  root.add(fascia);
  addRing(2.72, 4.7, 0.04, redMaterial);
  addRing(2.75, 5.7, 0.035);

  const roofTexture = makeRoofTexture();
  const roofMaterial = new THREE.MeshStandardMaterial({
    map: roofTexture,
    roughness: 0.66,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.86, 0.95, 48, 1, true), roofMaterial);
  roof.position.y = 6.08;
  roof.castShadow = true;
  root.add(roof);
  addRing(2.86, 5.7, 0.03);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), redMaterial);
  finial.position.y = 6.62;
  finial.castShadow = true;
  root.add(finial);
  addRing(0.19, 6.46, 0.025, goldMaterial);

  // concealed warm lamp under the canopy
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffd79a,
      emissive: 0xffa84d,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    }),
  );
  lamp.position.y = 4.94;
  root.add(lamp);
  addRing(0.52, 5.02, 0.025, goldMaterial);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xfff3df, 0x6f5a87, 1.06);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe2b4, 2.15);
  key.position.set(-4.5, 8, 6);
  key.target.position.set(0, 2.8, 0);
  key.castShadow = renderer.shadowMap.enabled;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xa8c8ff, 1.1);
  rim.position.set(5, 3, -5);
  scene.add(rim);

  const lampLights = [];
  for (let index = 0; index < 3; index += 1) {
    const angle = (index * Math.PI * 2) / 3 + 0.3;
    const light = new THREE.PointLight(0xffb465, 20, 9, 2);
    light.position.set(Math.sin(angle) * 0.7, 4.85, Math.cos(angle) * 0.7);
    scene.add(light);
    lampLights.push(light);
  }

  const fill = new THREE.PointLight(0xb99dff, 8, 16, 2);
  fill.position.set(0, 3, -5);
  scene.add(fill);

  const frontFill = new THREE.PointLight(0xffd9a2, 18, 16, 2);
  frontFill.position.set(0, 3.1, 5.5);
  scene.add(frontFill);

  // ---- state ----
  const orbit = { theta: 0.12, phi: 1.47, radius: 10.6 };
  let frames = [];
  let pickables = [];
  let framesGroup = null;
  let charactersGroup = null;
  let total = 0;
  let frameStep = Math.PI * 2 / 6;
  let lastFront = -1;
  let visible = false;
  let spinning = true;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let gust = 0;
  let time = 0;
  let lastTime = performance.now();
  let snapping = false;
  let night = false;
  let userZoomed = false;
  let disposed = false;

  const emptyTexture = makeEmptyTexture();

  function updateCamera() {
    const target = new THREE.Vector3(0, 3.2, 0);
    const sinPhi = Math.sin(orbit.phi);
    camera.position.set(
      target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
      target.y + orbit.radius * Math.cos(orbit.phi),
      target.z + orbit.radius * sinPhi * Math.cos(orbit.theta),
    );
    camera.lookAt(target);
  }

  function resize() {
    if (!container || disposed) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!userZoomed) {
      orbit.radius = camera.aspect < 1.2 ? 11.8 : 10.6;
    }
    updateCamera();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  function clearDynamic() {
    if (framesGroup) {
      root.remove(framesGroup);
      framesGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
          else child.material.dispose();
        }
      });
    }
    if (charactersGroup) {
      root.remove(charactersGroup);
      charactersGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose());
          else child.material.dispose();
        }
      });
    }
    frames = [];
    pickables = [];
  }

  function load(items) {
    clearDynamic();
    framesGroup = new THREE.Group();
    charactersGroup = new THREE.Group();
    root.add(framesGroup, charactersGroup);
    total = Math.max(items.length, 6);
    frameStep = (Math.PI * 2) / total;
    root.rotation.y = 0;
    lastFront = -1;

    for (let index = 0; index < total; index += 1) {
      const angle = index * frameStep;
      const item = items[index] || null;
      createFrame(item, angle, index);
    }

    const characterCount = Math.min(total, 6);
    for (let index = 0; index < characterCount; index += 1) {
      createCharacter(index, angleBetween(index, characterCount));
    }

    updateIndex(true);
    resize();
  }

  function angleBetween(index, count) {
    return ((index + 0.5) * (Math.PI * 2)) / count;
  }

  function createFrame(item, angle, index) {
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(angle) * 2.06, 5.02, Math.cos(angle) * 2.06);
    pivot.rotation.y = angle;
    pivot.userData.phase = index * 0.9 + 0.3;
    framesGroup.add(pivot);

    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.27, -0.46, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.27, -0.46, 0),
    ]);
    const strings = new THREE.LineSegments(
      stringGeometry,
      new THREE.LineBasicMaterial({ color: 0x5b3b27, transparent: true, opacity: 0.85 }),
    );
    pivot.add(strings);

    const frameGroup = new THREE.Group();
    frameGroup.position.y = -0.98;
    pivot.add(frameGroup);

    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.04, 0.055), goldMaterial);
    outer.castShadow = true;
    frameGroup.add(outer);

    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.94), creamMaterial);
    mat.position.z = 0.03;
    frameGroup.add(mat);

    const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), goldMaterial);
    ornament.position.set(0, 0.55, 0.02);
    frameGroup.add(ornament);

    const photoMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff5e3,
      toneMapped: false,
    });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.82), photoMaterial);
    photo.position.z = 0.036;
    frameGroup.add(photo);

    if (item && item.src) {
      photoMaterial.opacity = 0.98;
      const texture = textureLoader.load(
        item.src,
        (loaded) => {
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = maxAnisotropy;
          cropTexture(loaded, 0.6 / 0.82);
          photoMaterial.map = loaded;
          photoMaterial.needsUpdate = true;
        },
        undefined,
        () => {},
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      photo.userData.photoIndex = item.photoIndex;
      outer.userData.photoIndex = item.photoIndex;
      mat.userData.photoIndex = item.photoIndex;
      pickables.push(outer, mat, photo);
    } else {
      photoMaterial.map = emptyTexture;
      photoMaterial.needsUpdate = true;
    }

    frames.push({ pivot, photo, item });
  }

  function createCharacter(index, angle) {
    const name = CHARACTER_FILES[index % CHARACTER_FILES.length];
    const texture = textureLoader.load(`assets/images/characters/${name}.svg`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), material);
    const radius = 1.32;
    plane.position.set(Math.sin(angle) * radius, 0.73, Math.cos(angle) * radius);
    plane.rotation.y = angle;
    charactersGroup.add(plane);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.27, 24),
      new THREE.MeshBasicMaterial({
        color: 0x1a1424,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(Math.sin(angle) * radius, 0.367, Math.cos(angle) * radius);
    charactersGroup.add(shadow);
  }

  function updateFrameSway() {
    frames.forEach(({ pivot }, index) => {
      const phase = pivot.userData.phase;
      const sway = Math.sin(time * 1.15 + phase) * 0.032 + gust * Math.sin(time * 4.4 + phase) * 0.12;
      pivot.rotation.z = sway;
      pivot.rotation.x =
        Math.cos(time * 0.92 + phase) * 0.015 + gust * Math.cos(time * 3.6 + phase) * 0.05;
    });
  }

  function updateIndex(force = false) {
    if (!total) return;
    const front = ((Math.round(-root.rotation.y / frameStep) % total) + total) % total;
    if (force || front !== lastFront) {
      lastFront = front;
      hooks.onIndex?.(front, total);
    }
  }

  function loop(now) {
    if (disposed) return;
    const delta = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (visible) {
      if (spinning && !dragging && !snapping) {
        root.rotation.y += delta * 0.15;
      }
      time += delta;
      if (gust > 0) gust = Math.max(0, gust - delta * 1.15);
      updateFrameSway();
      updateIndex();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }

  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return;
    const photoIndex = hits[0].object.userData.photoIndex;
    if (photoIndex !== undefined && photoIndex !== null) {
      hooks.onSelect?.(photoIndex);
    }
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    root.rotation.y += dx * 0.008;
    orbit.phi = Math.min(1.56, Math.max(1.16, orbit.phi + dy * 0.003));
    updateCamera();
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
    if (moved < 7) pick(event.clientX, event.clientY);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      orbit.radius = Math.min(15, Math.max(7.2, orbit.radius + event.deltaY * 0.0025));
      userZoomed = true;
      updateCamera();
    },
    { passive: false },
  );

  function setNight(on) {
    night = Boolean(on);
    hemi.intensity = night ? 0.42 : 1.06;
    key.intensity = night ? 0.55 : 2.15;
    rim.intensity = night ? 2.2 : 1.1;
    rim.color.set(night ? 0x9c7bff : 0xa8c8ff);
    fill.intensity = night ? 13 : 8;
    frontFill.intensity = night ? 18 : 10;
    lampLights.forEach((light) => {
      light.intensity = night ? 30 : 20;
    });
    renderer.toneMappingExposure = night ? 0.98 : 1.04;
  }

  function stepCarousel(direction) {
    if (!total || snapping) return;
    snapping = true;
    const base = Math.round(root.rotation.y / frameStep) * frameStep;
    const target = base + direction * frameStep;
    if (window.gsap) {
      window.gsap.to(root.rotation, {
        y: target,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: () => {
          snapping = false;
          updateIndex(true);
        },
      });
    } else {
      root.rotation.y = target;
      snapping = false;
      updateIndex(true);
    }
  }

  function start() {
    visible = true;
    lastTime = performance.now();
    requestAnimationFrame(resize);
  }

  function stop() {
    visible = false;
  }

  function wind() {
    gust = 1;
  }

  function setSpinning(on) {
    spinning = Boolean(on);
  }

  function dispose() {
    disposed = true;
    resizeObserver.disconnect();
    clearDynamic();
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  requestAnimationFrame(loop);

  return {
    load,
    start,
    stop,
    setNight,
    setSpinning,
    wind,
    step: stepCarousel,
    dispose,
  };
}

function cropTexture(texture, targetAspect) {
  const image = texture.image;
  if (!image || !image.width || !image.height) return;
  const aspect = image.width / image.height;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (aspect > targetAspect) {
    texture.repeat.x = targetAspect / aspect;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else {
    texture.repeat.y = aspect / targetAspect;
    texture.offset.y = (1 - texture.repeat.y) / 2;
  }
  texture.needsUpdate = true;
}

function makeRoofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const colors = ['#7999b5', '#efe2c1', '#95aec5', '#efe2c1'];
  const stripe = canvas.width / 8;
  for (let index = 0; index < 8; index += 1) {
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(index * stripe, 0, stripe + 1, canvas.height);
    ctx.strokeStyle = 'rgba(188, 148, 70, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(index * stripe, 0);
    ctx.lineTo(index * stripe, canvas.height);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

function makeEmptyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#fff7e8');
  gradient.addColorStop(1, '#ffe4ef');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#241d1c';
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 14]);
  ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd36e';
  ctx.strokeStyle = '#241d1c';
  ctx.lineWidth = 7;
  const cx = 256;
  const cy = 280;
  const outer = 92;
  const inner = 39;
  ctx.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#241d1c';
  ctx.font = '600 34px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('照片待上传', 256, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
