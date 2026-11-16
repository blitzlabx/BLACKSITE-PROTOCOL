import * as THREE from 'three';

const PARTICLE_COUNT = 160;
const CASING_POOL_SIZE = 32;
const TRACER_POOL_SIZE = 18;
const RING_POOL_SIZE = 16;

const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();
const _dummyMat = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _color = new THREE.Color();
const _zAxis = new THREE.Vector3(0, 0, 1);

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;

    const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.13);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, PARTICLE_COUNT);
    this.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkMesh.frustumCulled = false;
    this.scene.add(this.sparkMesh);

    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0.35,
        px: 0,
        py: -50,
        pz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
        gravity: 14,
      });
      _dummyPos.set(0, -50, 0);
      _dummyScale.set(0, 0, 0);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      this.sparkMesh.setMatrixAt(i, _dummyMat);
      this.sparkMesh.setColorAt(i, _color.setHex(0xea580c));
    }
    this.particleCursor = 0;

    const casingGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.036, 6);
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.28,
      metalness: 0.9,
    });
    this.casingMesh = new THREE.InstancedMesh(casingGeo, casingMat, CASING_POOL_SIZE);
    this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casingMesh.frustumCulled = false;
    this.scene.add(this.casingMesh);

    this.casings = [];
    for (let i = 0; i < CASING_POOL_SIZE; i++) {
      this.casings.push({
        active: false,
        life: 0,
        maxLife: 1.4,
        px: 0,
        py: -50,
        pz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        floorY: 0.02,
      });
      _dummyPos.set(0, -50, 0);
      _dummyScale.set(0, 0, 0);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      this.casingMesh.setMatrixAt(i, _dummyMat);
    }
    this.casingCursor = 0;

    const tracerGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 5, 1, true);
    this.tracers = [];
    for (let i = 0; i < TRACER_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(tracerGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.tracers.push({ mesh, mat, life: 0, maxLife: 0.085 });
    }
    this.tracerCursor = 0;

    const ringGeo = new THREE.RingGeometry(0.05, 0.17, 12);
    this.rings = [];
    for (let i = 0; i < RING_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, mat, life: 0, maxLife: 0.2 });
    }
    this.ringCursor = 0;

    this.muzzleLight = new THREE.PointLight(0xffb74d, 0, 9, 2);
    this.muzzleLight.position.set(0, -20, 0);
    this.scene.add(this.muzzleLight);
    this.muzzleLightTimer = 0;
  }

  spawnTracer(sx, sy, sz, ex, ey, ez, colorHex = 0xffd275) {
    const t = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % TRACER_POOL_SIZE;

    _dir.set(ex - sx, ey - sy, ez - sz);
    const len = _dir.length();
    if (len < 0.1) return;
    _dir.multiplyScalar(1 / len);

    _mid.set((sx + ex) * 0.5, (sy + ey) * 0.5, (sz + ez) * 0.5);
    t.mesh.position.copy(_mid);
    t.mesh.quaternion.setFromUnitVectors(_up, _dir);
    t.mesh.scale.set(1, len, 1);
    t.mat.color.setHex(colorHex);
    t.mat.opacity = 0.85;
    t.life = 0.085;
    t.maxLife = 0.085;
    t.mesh.visible = true;
  }

  spawnShellCasing(x, y, z, rightX, rightZ, floorY = 0) {
    const c = this.casings[this.casingCursor];
    this.casingCursor = (this.casingCursor + 1) % CASING_POOL_SIZE;

    c.active = true;
    c.maxLife = 1.35;
    c.life = c.maxLife;
    c.px = x;
    c.py = y;
    c.pz = z;
    const sideSpd = 1.6 + Math.random() * 1.1;
    c.vx = rightX * sideSpd + (Math.random() - 0.5) * 0.5;
    c.vy = 1.5 + Math.random() * 0.9;
    c.vz = rightZ * sideSpd + (Math.random() - 0.5) * 0.5;
    c.rx = Math.random() * Math.PI;
    c.ry = Math.random() * Math.PI;
    c.rz = Math.random() * Math.PI;
    c.vrx = (Math.random() - 0.5) * 24;
    c.vry = (Math.random() - 0.5) * 18;
    c.vrz = (Math.random() - 0.5) * 26;
    c.floorY = floorY + 0.02;
  }

  spawnImpactBurst(x, y, z, nx = 0, ny = 1, nz = 0, isFlesh = false, count = 8) {
    const ring = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % RING_POOL_SIZE;
    ring.mesh.position.set(x + nx * 0.02, y + ny * 0.02, z + nz * 0.02);
    _dir.set(nx, ny, nz).normalize();
    ring.mesh.quaternion.setFromUnitVectors(_zAxis, _dir);
    ring.mesh.scale.setScalar(isFlesh ? 1.35 : 0.9);
    ring.mat.color.setHex(isFlesh ? 0xdc2626 : 0xf59e0b);
    ring.mat.opacity = 0.88;
    ring.life = 0.2;
    ring.maxLife = 0.2;
    ring.mesh.visible = true;

    const baseColor = isFlesh ? 0xdc2626 : 0xf59e0b;
    const altColor = isFlesh ? 0x7f1d1d : 0xbae6fd;

    for (let i = 0; i < count; i++) {
      const idx = this.particleCursor;
      const p = this.particles[idx];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_COUNT;
      p.active = true;
      p.maxLife = isFlesh ? 0.28 + Math.random() * 0.22 : 0.2 + Math.random() * 0.22;
      p.life = p.maxLife;
      p.px = x + nx * 0.04;
      p.py = y + ny * 0.04;
      p.pz = z + nz * 0.04;
      const spd = isFlesh ? 1.8 + Math.random() * 3.8 : 2.5 + Math.random() * 5.2;
      p.vx = nx * spd + (Math.random() - 0.5) * 3.8;
      p.vy = ny * spd + Math.random() * (isFlesh ? 2.1 : 3.2);
      p.vz = nz * spd + (Math.random() - 0.5) * 3.8;
      p.size = isFlesh ? 1.25 + Math.random() * 0.45 : 0.8 + Math.random() * 0.45;
      p.gravity = isFlesh ? 18 : 13;
      _color.setHex(i % 2 === 0 ? baseColor : altColor);
      this.sparkMesh.setColorAt(idx, _color);
    }
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  triggerMuzzleLight(x, y, z) {
    this.muzzleLight.position.set(x, y, z);
    this.muzzleLight.intensity = 5.5;
    this.muzzleLightTimer = 0.045;
  }

  update(dt) {
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= dt;
      if (this.muzzleLightTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    let anyParticleDirty = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyParticleDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummyPos.set(0, -50, 0);
        _dummyScale.set(0, 0, 0);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        this.sparkMesh.setMatrixAt(i, _dummyMat);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.px += p.vx * dt;
      p.py += p.vy * dt;
      p.pz += p.vz * dt;
      if (p.py < 0.03) {
        p.py = 0.03;
        p.vy *= -0.3;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }

      const ratio = p.life / p.maxLife;
      _dummyPos.set(p.px, p.py, p.pz);
      _dir.set(p.vx, p.vy, p.vz);
      if (_dir.lengthSq() > 0.001) {
        _dir.normalize();
        _dummyQuat.setFromUnitVectors(_up, _dir);
      }
      const s = p.size * ratio;
      _dummyScale.set(s, s * 1.6, s);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      this.sparkMesh.setMatrixAt(i, _dummyMat);
    }
    if (anyParticleDirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }

    let anyCasingDirty = false;
    for (let i = 0; i < CASING_POOL_SIZE; i++) {
      const c = this.casings[i];
      if (!c.active) continue;
      anyCasingDirty = true;
      c.life -= dt;
      if (c.life <= 0) {
        c.active = false;
        _dummyPos.set(0, -50, 0);
        _dummyScale.set(0, 0, 0);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        this.casingMesh.setMatrixAt(i, _dummyMat);
        continue;
      }

      c.vy -= 14.5 * dt;
      c.px += c.vx * dt;
      c.py += c.vy * dt;
      c.pz += c.vz * dt;
      c.rx += c.vrx * dt;
      c.ry += c.vry * dt;
      c.rz += c.vrz * dt;

      if (c.py <= c.floorY) {
        c.py = c.floorY;
        if (Math.abs(c.vy) > 0.4) {
          c.vy *= -0.42;
          c.vx *= 0.6;
          c.vz *= 0.6;
          c.vrx *= 0.5;
          c.vrz *= 0.5;
        } else {
          c.vy = 0;
          c.vx *= 0.84;
          c.vz *= 0.84;
          c.vrx = 0;
          c.vry = 0;
          c.vrz = 0;
        }
      }

      const fade = c.life < 0.25 ? c.life / 0.25 : 1;
      _dummyPos.set(c.px, c.py, c.pz);
      _dummyEuler.set(c.rx, c.ry, c.rz);
      _dummyQuat.setFromEuler(_dummyEuler);
      _dummyScale.setScalar(fade);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      this.casingMesh.setMatrixAt(i, _dummyMat);
    }
    if (anyCasingDirty) {
      this.casingMesh.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < TRACER_POOL_SIZE; i++) {
      const t = this.tracers[i];
      if (!t.mesh.visible) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.mesh.visible = false;
      } else {
        t.mat.opacity = 0.85 * (t.life / t.maxLife);
      }
    }

    for (let i = 0; i < RING_POOL_SIZE; i++) {
      const r = this.rings[i];
      if (!r.mesh.visible) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
      } else {
        const k = 1 - r.life / r.maxLife;
        r.mesh.scale.setScalar(0.9 + k * 1.4);
        r.mat.opacity = 0.88 * (1 - k);
      }
    }
  }
}
