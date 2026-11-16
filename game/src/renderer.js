import * as THREE from 'three';
import { RoomEnvironment } from './room-environment.js';
import { getActiveMap } from './map.js';

export function detectSoftwareWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function getTexResolution(textureQuality) {
  if (textureQuality === 'fast') return 256;
  if (textureQuality === 'balanced') return 512;
  return 1024;
}

function hexStr(num) {
  return '#' + (num & 0xffffff).toString(16).padStart(6, '0');
}

function makeFloorTexture(kind, baseHex, maxAniso, texRes) {
  const size = Math.min(512, texRes);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = hexStr(baseHex);
  ctx.fillRect(0, 0, size, size);

  if (kind === 'cobble' || kind === 'stone' || kind === 'tile') {
    const step = size / 4;
    ctx.strokeStyle = kind === 'tile' ? 'rgba(15, 23, 42, 0.16)' : 'rgba(20, 16, 12, 0.36)';
    ctx.lineWidth = Math.max(2, size / 128);
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(size, x); ctx.stroke();
    }
    for (let i = 0; i < 650; i++) {
      const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      ctx.fillStyle = shade;
      ctx.fillRect(Math.random() * size, Math.random() * size, 6, 6);
    }
  } else if (kind === 'grass' || kind === 'sand' || kind === 'snow') {
    for (let i = 0; i < 1400; i++) {
      const shade = Math.random() > 0.5
        ? (kind === 'snow' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)')
        : 'rgba(15,23,42,0.09)';
      ctx.fillStyle = shade;
      ctx.fillRect(Math.random() * size, Math.random() * size, 5, 3);
    }
  } else {
    for (let i = 0; i < 1100; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 2;
    const step = size / 2;
    ctx.strokeRect(1, 1, step, step);
    ctx.strokeRect(step, step, step - 1, step - 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 12);
  tex.anisotropy = maxAniso;
  return tex;
}

function makeCrateTexture(baseHex, accentHex, label, maxAniso) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(20, 20); ctx.lineTo(236, 236);
  ctx.moveTo(236, 20); ctx.lineTo(20, 236);
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.fillRect(24, 106, 208, 42);
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeBlitzSignTexture(text, bgColor, fgColor, maxAniso) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = fgColor;
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeSkyTexture(topHex, horizonHex) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.55, horizonHex);
  grad.addColorStop(1, horizonHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TacticalRenderer {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.08, 220);
    this.scene.add(this.camera);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.animatedProps = [];
    this.coreLight = null;
    this.coreSiteRing = null;
    this.coreBeamMat = null;
    this.ambientMotes = null;
    this._currentSettings = { textureQuality: 'high', shadowsEnabled: true, fogEnabled: true, exposure: 1.15, graphicsQuality: 'high' };

    this.buildMap(getActiveMap(), this._currentSettings);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  applySettings(settings) {
    if (!settings) return;
    const needRebuild =
      settings.textureQuality !== this._currentSettings.textureQuality ||
      settings.shadowsEnabled !== this._currentSettings.shadowsEnabled ||
      settings.fogEnabled !== this._currentSettings.fogEnabled ||
      settings.graphicsQuality !== this._currentSettings.graphicsQuality;

    this._currentSettings = { ...this._currentSettings, ...settings };
    this.renderer.toneMappingExposure = settings.exposure ?? 1.15;
    if (!this.isSoftwareGl) {
      const pr = settings.graphicsQuality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, settings.graphicsQuality === 'medium' ? 1.5 : 2);
      this.renderer.setPixelRatio(pr);
      this.renderer.shadowMap.enabled = Boolean(settings.shadowsEnabled);
    }

    if (needRebuild) {
      this.buildMap(getActiveMap(), this._currentSettings);
    }
  }

  buildMap(mapSpec, settings = this._currentSettings) {
    while (this.mapGroup.children.length > 0) {
      const ch = this.mapGroup.children[0];
      this.mapGroup.remove(ch);
      ch.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose?.();
      });
    }
    this.animatedProps = [];

    const p = mapSpec.palette;
    const maxAniso = settings.textureQuality === 'fast' ? 1 : this.renderer.capabilities.getMaxAnisotropy();
    const texRes = getTexResolution(settings.textureQuality || 'high');
    const allowShadows = !this.isSoftwareGl && settings.shadowsEnabled !== false;

    this.scene.background = new THREE.Color(p.fogColor);
    this.scene.fog = settings.fogEnabled !== false
      ? new THREE.FogExp2(p.fogColor, p.fogDensity || 0.01)
      : null;

    if (mapSpec.openSky) {
      const skyTex = makeSkyTexture(p.skyTop, p.skyHorizon);
      const skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(135, 24, 14),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
      );
      this.mapGroup.add(skyDome);
    }

    const hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, 1.05);
    this.mapGroup.add(hemi);

    const key = new THREE.DirectionalLight(p.sunColor, 2.05);
    key.position.set(-18, 28, 16);
    key.target.position.set(0, 0, 0);
    key.castShadow = allowShadows;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 85;
    key.shadow.camera.left = -34;
    key.shadow.camera.right = 34;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.mapGroup.add(key);
    this.mapGroup.add(key.target);

    const coreLight = new THREE.PointLight(p.accentColor, 20, 26, 1.6);
    coreLight.position.set(0, 5.0, 0);
    this.mapGroup.add(coreLight);
    this.coreLight = coreLight;

    const floorTex = makeFloorTexture(p.floorKind, p.floorColor, maxAniso, texRes);
    const silverCrateTex = makeCrateTexture('#cbd5e1', '#059669', 'BLITZ', maxAniso);
    const emeraldCrateTex = makeCrateTexture('#065f46', '#10b981', 'BLITZ', maxAniso);
    const woodCrateTex = makeCrateTexture('#78350f', '#b45309', 'BLITZ', maxAniso);

    const mats = {
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.08 }),
      perimeter: new THREE.MeshStandardMaterial({ color: p.wallColor, roughness: 0.82, metalness: 0.12 }),
      wall: new THREE.MeshStandardMaterial({ color: p.wallColor, roughness: 0.78, metalness: 0.12 }),
      pillar: new THREE.MeshStandardMaterial({ color: p.trimColor, roughness: 0.55, metalness: 0.35 }),
      crate_silver: new THREE.MeshStandardMaterial({ map: silverCrateTex, roughness: 0.4, metalness: 0.5 }),
      crate_emerald: new THREE.MeshStandardMaterial({ map: emeraldCrateTex, roughness: 0.45, metalness: 0.35 }),
      crate_wood: new THREE.MeshStandardMaterial({ map: woodCrateTex, roughness: 0.78, metalness: 0.08 }),
      railing: new THREE.MeshStandardMaterial({ color: p.accentColor, roughness: 0.4, metalness: 0.5 }),
      rock: new THREE.MeshStandardMaterial({ color: p.rockColor, roughness: 0.92, metalness: 0.04, flatShading: true }),
      roof: new THREE.MeshStandardMaterial({ color: p.roofColor, roughness: 0.65, metalness: 0.2 }),
      foliage: new THREE.MeshStandardMaterial({ color: p.foliageColor, roughness: 0.82, metalness: 0.05, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, metalness: 0.02 }),
      trim: new THREE.MeshStandardMaterial({ color: p.trimColor, roughness: 0.5, metalness: 0.5 }),
      window: new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x0ea5e9, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.8 }),
      accentGlow: new THREE.MeshStandardMaterial({ color: p.accentColor, emissive: p.accentColor, emissiveIntensity: 2.0, roughness: 0.2 }),
      moltenGlow: new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xea580c, emissiveIntensity: 2.5, roughness: 0.3 }),
    };

    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: p.floorColor, roughness: 0.92 }),
    );
    outerGround.rotation.x = -Math.PI * 0.5;
    outerGround.position.y = -0.05;
    this.mapGroup.add(outerGround);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(58, 50), mats.floor);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    this.mapGroup.add(floor);

    const pz = mapSpec.plantZone;
    const corePad = new THREE.Mesh(
      new THREE.CylinderGeometry(pz.radius + 0.65, pz.radius + 0.95, 0.06, 12),
      mats.trim,
    );
    corePad.position.set(pz.x, 0.03, pz.z);
    corePad.receiveShadow = true;
    this.mapGroup.add(corePad);

    const siteRing = new THREE.Mesh(
      new THREE.RingGeometry(pz.radius - 0.16, pz.radius, 36),
      new THREE.MeshBasicMaterial({ color: p.accentColor, side: THREE.DoubleSide }),
    );
    siteRing.rotation.x = -Math.PI * 0.5;
    siteRing.position.set(pz.x, 0.07, pz.z);
    this.mapGroup.add(siteRing);
    this.coreSiteRing = siteRing;

    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(0, 5.4, 0);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.12, 10, 32), mats.trim);
    outerRing.rotation.x = Math.PI * 0.5;
    reactorGroup.add(outerRing);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.07, 8, 28), mats.accentGlow);
    innerRing.rotation.x = Math.PI * 0.5;
    reactorGroup.add(innerRing);
    this.animatedProps.push({ obj: reactorGroup, type: 'spinY', speed: 0.45 });
    this.mapGroup.add(reactorGroup);

    for (const col of mapSpec.colliders) {
      if (col.material === 'landmark_kiln') {
        this._buildLandmarkFurnace(col, mats, maxAniso);
        continue;
      }
      if (col.material === 'rock') {
        const rock = this._buildRockCluster(Math.max(col.w, col.d) * 0.45, mats, false);
        rock.position.set(col.x, col.y, col.z);
        rock.scale.set(col.w / Math.max(1, col.d), col.h / 1.8, 1);
        this.mapGroup.add(rock);
        continue;
      }

      const mat = mats[col.material] || mats.wall;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(col.w, col.h, col.d), mat);
      mesh.position.set(col.x, col.y + col.h * 0.5, col.z);
      mesh.castShadow = col.h >= 0.9;
      mesh.receiveShadow = true;
      this.mapGroup.add(mesh);

      if (col.tag === 'partition' || col.tag === 'divider') {
        const cornice = new THREE.Mesh(new THREE.BoxGeometry(col.w + 0.16, 0.2, col.d + 0.16), mats.trim);
        cornice.position.set(col.x, col.y + col.h + 0.08, col.z);
        this.mapGroup.add(cornice);

        const strip = new THREE.Mesh(new THREE.BoxGeometry(col.w + 0.05, 0.07, col.d + 0.05), mats.accentGlow);
        strip.position.set(col.x, 2.35, col.z);
        this.mapGroup.add(strip);
      }
    }

    this._buildDecks(mapSpec.elevatedDecks, mats);

    for (const h of mapSpec.props?.houses || []) {
      this._buildHouse(h, mats, maxAniso);
    }

    for (const r of mapSpec.props?.rocks || []) {
      const rock = this._buildRockCluster(r.s || 1.5, mats, Boolean(r.blitz), maxAniso);
      rock.position.set(r.x, 0, r.z);
      this.mapGroup.add(rock);
    }

    for (const t of mapSpec.props?.trees || []) {
      const tree = this._buildTree(t.type || 'pine', t.s || 1.2, mats, Boolean(t.blitz), maxAniso);
      tree.position.set(t.x, 0, t.z);
      this.mapGroup.add(tree);
    }

    for (const lbl of mapSpec.props?.blitzLabels || []) {
      const tex = makeBlitzSignTexture(lbl.text, lbl.bg || '#0f172a', lbl.fg || '#10b981', maxAniso);
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.88, 0.08),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.25 }),
      );
      sign.position.set(lbl.x, lbl.y, lbl.z);
      sign.rotation.y = lbl.ry || 0;
      this.mapGroup.add(sign);
    }

    if (!mapSpec.openSky) {
      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(58, 50),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }),
      );
      ceiling.rotation.x = Math.PI * 0.5;
      ceiling.position.y = mapSpec.bounds.ceilingY;
      this.mapGroup.add(ceiling);

      const girderGeo = new THREE.BoxGeometry(56, 0.42, 0.55);
      for (let z = -20; z <= 20; z += 8) {
        const girder = new THREE.Mesh(girderGeo, mats.trim);
        girder.position.set(0, mapSpec.bounds.ceilingY - 0.3, z);
        this.mapGroup.add(girder);
      }
    }

    this._buildAmbientMotes(p.accentColor);
  }

  _buildLandmarkFurnace(col, mats, maxAniso) {
    const g = new THREE.Group();
    g.position.set(col.x, 0, col.z);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.5, 4.0), mats.trim);
    plinth.position.y = 0.25;
    plinth.castShadow = true;
    g.add(plinth);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 5.2, 8), mats.wall);
    drum.position.y = 3.0;
    drum.castShadow = true;
    g.add(drum);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.5, 8), mats.moltenGlow);
    glow.position.y = 2.05;
    g.add(glow);
    const tex = makeBlitzSignTexture('BLITZ', '#0f172a', '#f59e0b', maxAniso);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.1), new THREE.MeshStandardMaterial({ map: tex }));
    plaque.position.set(0, 3.4, 1.85);
    g.add(plaque);
    this.mapGroup.add(g);
  }

  _buildDecks(decks, mats) {
    for (const d of decks) {
      if (d.type === 'deck') {
        const w = d.xMax - d.xMin;
        const dep = d.zMax - d.zMin;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.26, dep), mats.trim);
        mesh.position.set((d.xMin + d.xMax) * 0.5, d.y - 0.13, (d.zMin + d.zMax) * 0.5);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.mapGroup.add(mesh);
      } else {
        const w = d.xMax - d.xMin;
        const lenZ = d.zMax - d.zMin;
        const dy = d.yEnd - d.yStart;
        const hyp = Math.hypot(lenZ, dy);
        const angle = Math.atan2(dy, lenZ);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, hyp), mats.trim);
        ramp.position.set((d.xMin + d.xMax) * 0.5, (d.yStart + d.yEnd) * 0.5 - 0.1, (d.zMin + d.zMax) * 0.5);
        ramp.rotation.x = -angle;
        ramp.receiveShadow = true;
        this.mapGroup.add(ramp);
      }
    }
  }

  _buildHouse(h, mats, maxAniso) {
    const g = new THREE.Group();
    g.position.set(h.x, 0, h.z);

    const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), mats.wall);
    body.position.y = h.h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(h.w + 0.3, 0.5, h.d + 0.3), mats.trim);
    plinth.position.y = 0.25;
    g.add(plinth);

    if (h.roofType === 'pitched') {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.72, 2.8, 4), mats.roof);
      roof.position.y = h.h + 1.4;
      roof.rotation.y = Math.PI * 0.25;
      roof.scale.set(h.w / Math.max(h.w, h.d), 1, h.d / Math.max(h.w, h.d));
      roof.castShadow = true;
      g.add(roof);
    } else {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(h.w + 0.4, 0.55, h.d + 0.4), mats.roof);
      parapet.position.y = h.h + 0.27;
      g.add(parapet);
    }

    for (const wz of [-h.d * 0.25, h.d * 0.25]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(h.w + 0.1, 1.1, 1.5), mats.window);
      win.position.set(0, h.h * 0.62, wz);
      g.add(win);
    }

    if (h.blitzSign) {
      const tex = makeBlitzSignTexture('BLITZ', '#0f172a', '#10b981', maxAniso);
      const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
      const wallSign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.35, 4.2), signMat);
      wallSign.position.set(h.x < 0 ? h.w * 0.5 + 0.1 : -h.w * 0.5 - 0.1, h.h * 0.78, 0);
      g.add(wallSign);

      const roofBillboard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 4.4), signMat);
      roofBillboard.position.set(h.x < 0 ? h.w * 0.2 : -h.w * 0.2, h.h + 1.85, 0);
      g.add(roofBillboard);
    }

    this.mapGroup.add(g);
  }

  _buildRockCluster(scale, mats, withBlitz, maxAniso = 1) {
    const g = new THREE.Group();
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), mats.rock);
    main.position.y = scale * 0.65;
    main.rotation.set(0.3, 0.5, 0.2);
    main.castShadow = true;
    main.receiveShadow = true;
    g.add(main);

    const sub = new THREE.Mesh(new THREE.DodecahedronGeometry(scale * 0.6, 0), mats.rock);
    sub.position.set(scale * 0.7, scale * 0.4, scale * 0.35);
    sub.rotation.set(0.7, 0.1, 0.4);
    sub.castShadow = true;
    g.add(sub);

    if (withBlitz) {
      const tex = makeBlitzSignTexture('BLITZ', '#334155', '#34d399', maxAniso);
      const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 1.15, scale * 0.4, 0.08),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }),
      );
      plaque.position.set(0, scale * 0.85, scale * 0.78);
      plaque.rotation.x = -0.22;
      g.add(plaque);
    }
    return g;
  }

  _buildTree(type, scale, mats, withBlitz, maxAniso = 1) {
    const g = new THREE.Group();
    const trunkH = (type === 'palm' ? 4.2 : 2.2) * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.26 * scale, trunkH, 7),
      mats.trunk,
    );
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    g.add(trunk);

    if (type === 'cypress') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 4.4 * scale, 8), mats.foliage);
      cone.position.y = trunkH + 1.9 * scale;
      cone.castShadow = true;
      g.add(cone);
    } else if (type === 'palm') {
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.45 * scale, 0.08 * scale, 2.2 * scale), mats.foliage);
        const a = (i * Math.PI * 2) / 6;
        frond.position.set(Math.sin(a) * 0.9 * scale, trunkH, Math.cos(a) * 0.9 * scale);
        frond.rotation.y = a;
        frond.rotation.x = 0.25;
        g.add(frond);
      }
    } else {
      for (let tier = 0; tier < 3; tier++) {
        const r = (1.45 - tier * 0.34) * scale;
        const h = (1.9 - tier * 0.25) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mats.foliage);
        cone.position.y = trunkH + tier * 1.05 * scale;
        cone.castShadow = true;
        g.add(cone);
      }
    }

    if (withBlitz) {
      const tex = makeBlitzSignTexture('BLITZ', '#064e3b', '#ecfdf5', maxAniso);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.95 * scale, 0.34 * scale, 0.62 * scale),
        new THREE.MeshStandardMaterial({ map: tex }),
      );
      band.position.y = Math.min(2.1, trunkH * 0.65);
      g.add(band);
    }
    return g;
  }

  _buildAmbientMotes(accentHex) {
    const count = 70;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: accentHex,
      size: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.ambientMotes = new THREE.Points(geo, mat);
    this.mapGroup.add(this.ambientMotes);
  }

  setCoreAlertState(planted) {
    const accent = getActiveMap().palette.accentColor || 0x10b981;
    if (this.coreLight) {
      this.coreLight.color.setHex(planted ? 0xef4444 : accent);
    }
    if (this.coreSiteRing) {
      this.coreSiteRing.material.color.setHex(planted ? 0xef4444 : accent);
    }
  }

  updateAnimatedProps(elapsed) {
    for (const item of this.animatedProps) {
      if (item.type === 'spinY') {
        item.obj.rotation.y = elapsed * item.speed;
      }
    }
    if (this.ambientMotes) {
      this.ambientMotes.rotation.y = elapsed * 0.016;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
