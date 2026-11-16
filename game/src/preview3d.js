import * as THREE from 'three';
import { RoomEnvironment } from './room-environment.js';
import { buildOperatorModel, buildWeaponModel } from './models-3d.js';

function isSoftwareGlContext(canvas) {
  try {
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class ArmoryPreview3D {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.isSoftwareGl = isSoftwareGlContext(canvasEl);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060c13);
    this.scene.fog = new THREE.FogExp2(0x060c13, 0.048);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, 1.5, 0.05, 80);
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    const hemi = new THREE.HemisphereLight(0xcbe7ff, 0x0b1622, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xf1f5f9, 2.05);
    key.position.set(3.8, 6.4, 4.8);
    this.scene.add(key);

    const rimEmerald = new THREE.DirectionalLight(0x10b981, 1.9);
    rimEmerald.position.set(-4.5, 3.2, -3.5);
    this.scene.add(rimEmerald);

    const rimAmber = new THREE.DirectionalLight(0xf59e0b, 0.95);
    rimAmber.position.set(4.2, 2.4, -4.0);
    this.scene.add(rimAmber);

    const pedLight = new THREE.PointLight(0x34d399, 2.4, 7.5);
    pedLight.position.set(0, 0.35, 0.4);
    this.scene.add(pedLight);

    this.hangar = this._buildHangarEnvironment();
    this.scene.add(this.hangar);

    this.pedestal = this._buildPedestal();
    this.scene.add(this.pedestal);

    this.subject = null;
    this.mode = 'operator'; // 'splash' | 'operator' | 'weapon'
    this.autoRotate = true;

    this.yaw = 0.28;
    this.pitch = 0.08;
    this.targetYaw = 0.28;
    this.targetPitch = 0.08;
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._active = false;
    this._raf = 0;
    this._lastTick = performance.now();
    this._elapsed = 0;

    this._bindInteraction();
    this.resize();
  }

  _createHangarFloorTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#09121c';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 64; i < 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildHangarEnvironment() {
    const g = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      map: this._createHangarFloorTexture(),
      roughness: 0.42,
      metalness: 0.58,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.y = -0.14;
    g.add(floor);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111c29, roughness: 0.55, metalness: 0.65 });
    const holoScreenMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const emeraldStripMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const cyanStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const skyHalo = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.06, 10, 56), cyanStripMat);
    skyHalo.rotation.x = Math.PI * 0.5;
    skyHalo.position.set(0, 4.9, -2.0);
    g.add(skyHalo);

    const pillarCoords = [
      [-5.6, -5.8],
      [5.6, -5.8],
      [-8.2, -9.4],
      [8.2, -9.4],
    ];
    for (const [px, pz] of pillarCoords) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, 9, 1.1), pillarMat);
      col.position.set(px, 4.2, pz);
      g.add(col);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.2, 0.08), emeraldStripMat);
      strip.position.set(px + (px < 0 ? 0.46 : -0.46), 3.2, pz + 0.52);
      g.add(strip);
    }

    const screen1 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), holoScreenMat);
    screen1.position.set(-3.9, 2.2, -4.6);
    screen1.rotation.y = 0.42;
    g.add(screen1);

    const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), holoScreenMat);
    screen2.position.set(4.1, 2.0, -4.8);
    screen2.rotation.y = -0.38;
    g.add(screen2);

    const shipMat = new THREE.MeshStandardMaterial({ color: 0x0b1520, roughness: 0.7, metalness: 0.4 });
    const shipBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 1.6), shipMat);
    shipBody.position.set(3.4, 3.3, -12.5);
    shipBody.rotation.y = -0.22;
    g.add(shipBody);
    const shipWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 4.2), shipMat);
    shipWing.position.set(3.2, 3.25, -12.5);
    shipWing.rotation.y = -0.22;
    g.add(shipWing);

    return g;
  }

  _buildPedestal() {
    const g = new THREE.Group();
    const outerMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
    const innerPlate = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.65 });
    const silverTrim = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.9 });
    const glowRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const outerGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const holoRimMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.78, 0.14, 48), outerMetal);
    baseTier.position.y = -0.07;
    g.add(baseTier);

    const silverBevel = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.025, 10, 48), silverTrim);
    silverBevel.rotation.x = Math.PI * 0.5;
    silverBevel.position.y = 0.0;
    g.add(silverBevel);

    const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.32, 0.05, 48), innerPlate);
    topPlate.position.y = 0.015;
    g.add(topPlate);

    const innerGlowRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.022, 10, 48), glowRingMat);
    innerGlowRing.rotation.x = Math.PI * 0.5;
    innerGlowRing.position.y = 0.04;
    g.add(innerGlowRing);

    const outerGlowRing = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.014, 10, 48), outerGlowMat);
    outerGlowRing.rotation.x = Math.PI * 0.5;
    outerGlowRing.position.y = 0.025;
    g.add(outerGlowRing);

    const holoField = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.36, 0.42, 48, 1, true), holoRimMat);
    holoField.position.y = 0.22;
    g.add(holoField);

    this._pedestalGlow = innerGlowRing;
    return g;
  }

  _bindInteraction() {
    this.canvas.style.touchAction = 'none';
    this.canvas.style.cursor = 'grab';

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode === 'splash') return;
      this._dragging = true;
      this.autoRotate = false;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;

      this.targetYaw += dx * 0.012;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.01, -1.35, 1.35);
    });

    const stopDrag = () => {
      this._dragging = false;
      this.canvas.style.cursor = this.mode === 'splash' ? 'default' : 'grab';
    };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);

    this.canvas.addEventListener('wheel', (e) => {
      if (this.mode === 'splash') return;
      e.preventDefault();
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + e.deltaY * 0.001, 0.62, 1.55);
    }, { passive: false });

    this.canvas.addEventListener('dblclick', () => {
      if (this.mode !== 'splash') this.resetView();
    });
  }

  resetView() {
    if (this.mode === 'splash') {
      this.targetYaw = 0.06;
      this.targetPitch = 0.02;
    } else if (this.mode === 'weapon') {
      this.targetYaw = 0.82;
      this.targetPitch = 0.14;
    } else {
      this.targetYaw = 0.34;
      this.targetPitch = 0.06;
    }
    this.targetZoom = 1.0;
    this.autoRotate = this.mode !== 'splash';
  }

  setMode(mode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.canvas.style.cursor = mode === 'splash' ? 'default' : 'grab';
      this.resetView();
    }
  }

  updateSubject({
    mode = this.mode,
    characterId = 'callan',
    outfitId = 'emerald_spec',
    badgeId = 'blitz_founder',
    weaponId = 'arx17',
    finishId = 'factory',
    weaponUpgrades = null,
  } = {}) {
    this.setMode(mode);
    if (this.subject) {
      this.pivot.remove(this.subject);
      this.subject = null;
    }

    if (mode === 'splash') {
      this.pedestal.visible = true;
      this.pedestal.scale.setScalar(1.38);
      const squad = new THREE.Group();

      const centerOp = buildOperatorModel({
        characterId,
        outfitId,
        badgeId,
        team: 'preview',
        weaponId,
        finishId,
        weaponUpgrades: weaponUpgrades?.[weaponId] || weaponUpgrades,
      });
      centerOp.group.position.set(0, -0.96, 0.28);
      centerOp.group.rotation.y = Math.PI - 0.34;
      squad.add(centerOp.group);

      const leftOp = buildOperatorModel({
        characterId: 'kovac',
        outfitId: 'cinder_ops',
        badgeId: 'demolition',
        team: 'preview',
        weaponId: 'lancer4',
        finishId: 'obsidian_gold',
      });
      leftOp.group.position.set(-1.12, -0.96, -0.35);
      leftOp.group.rotation.y = Math.PI + 0.36;
      squad.add(leftOp.group);

      const rightOp = buildOperatorModel({
        characterId: 'reyes',
        outfitId: 'silver_crest',
        badgeId: 'sharpshooter',
        team: 'preview',
        weaponId: 'm4k',
        finishId: 'silver_alloy',
      });
      rightOp.group.position.set(1.12, -0.96, -0.32);
      rightOp.group.rotation.y = Math.PI - 0.44;
      squad.add(rightOp.group);

      this.subject = squad;
      this.pivot.position.set(0, 0.96, 0);
      this.pivot.add(this.subject);
    } else if (mode === 'weapon') {
      this.pedestal.visible = false;
      const built = buildWeaponModel(weaponId, {
        finishId,
        upgrades: weaponUpgrades?.[weaponId] || weaponUpgrades,
        forViewmodel: false,
      });
      built.group.scale.setScalar(2.6);
      const box = new THREE.Box3().setFromObject(built.group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      built.group.position.sub(center);
      this.subject = built.group;
      this.pivot.position.set(0, 0, 0);
      this.pivot.add(this.subject);
    } else {
      this.pedestal.visible = true;
      this.pedestal.scale.setScalar(1.0);
      const op = buildOperatorModel({
        characterId,
        outfitId,
        badgeId,
        team: 'preview',
        weaponId,
        finishId,
        weaponUpgrades: weaponUpgrades?.[weaponId] || weaponUpgrades,
      });
      op.group.position.set(0, -0.96, 0);
      op.group.rotation.y = Math.PI - 0.34;
      this.subject = op.group;
      this.pivot.position.set(0, 0.96, 0);
      this.pivot.add(this.subject);
    }

    if (this._active) this.renderOnce();
  }

  setActive(active) {
    if (this._active === active) return;
    this._active = active;
    if (active) {
      this.resize();
      this._lastTick = performance.now();
      this._schedule();
    } else {
      cancelAnimationFrame(this._raf);
      clearTimeout(this._raf);
    }
  }

  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(240, Math.round(rect?.width || this.canvas.clientWidth || 720));
    const h = Math.max(220, Math.round(rect?.height || this.canvas.clientHeight || 540));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _schedule() {
    if (!this._active) return;
    if (this.isSoftwareGl) {
      this._raf = window.setTimeout(() => this._loop(), 240);
    } else {
      this._raf = requestAnimationFrame(() => this._loop());
    }
  }

  _loop() {
    if (!this._active) return;
    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.005, (now - this._lastTick) / 1000));
    this._lastTick = now;
    this._elapsed += dt;

    if (this.mode === 'splash') {
      this.targetYaw = Math.sin(this._elapsed * 0.45) * 0.14;
      this.targetPitch = 0.03;
    } else if (this.autoRotate && !this._dragging) {
      this.targetYaw += dt * 0.36;
    }

    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 10, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 10, dt);
    this.zoom = THREE.MathUtils.damp(this.zoom, this.targetZoom, 10, dt);

    this.pivot.rotation.order = 'YXZ';
    this.pivot.rotation.y = this.yaw;
    this.pivot.rotation.x = this.pitch;

    const baseDist = this.mode === 'splash' ? 4.35 : this.mode === 'weapon' ? 2.65 : 3.25;
    const dist = baseDist * this.zoom;
    const targetY = this.mode === 'weapon' ? 0 : this.mode === 'splash' ? 0.72 : 0.96;
    const camY = this.mode === 'weapon' ? 0.1 : this.mode === 'splash' ? 1.12 : 1.16;
    this.camera.position.set(0, camY, dist);
    this.camera.lookAt(0, targetY, 0);

    if (this.pedestal.visible) {
      this.pedestal.rotation.y = this.yaw;
    }

    this.renderOnce();
    this._schedule();
  }

  renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.setActive(false);
    this.renderer.dispose();
  }
}
