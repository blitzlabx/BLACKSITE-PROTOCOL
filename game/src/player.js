import * as THREE from 'three';
import { TEAM_SPAWNS, resolveEntityCollision } from './map.js';
import {
  computeRecoilKick,
  createWeaponInstance,
  getUpgradedWeaponSpec,
} from './weapons.js';
import { buildWeaponModel } from './models-3d.js';
import { ECONOMY_CONFIG } from './economy.js';
import { audio } from './audio.js';

const EYE_STAND = 1.58;
const EYE_CROUCH = 1.05;
const GRAVITY = 19.5;
const JUMP_VEL = 6.5;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _muzzleWorld = new THREE.Vector3();
const _ejectWorld = new THREE.Vector3();

function buildDecryptorRig() {
  const rig = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.08, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.7 }),
  );
  rig.add(body);

  const screenBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.055),
    new THREE.MeshBasicMaterial({ color: 0x064e3b }),
  );
  screenBg.rotation.x = -Math.PI * 0.38;
  screenBg.position.set(0, 0.044, -0.02);
  rig.add(screenBg);

  const progressBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.096, 0.014, 0.01),
    new THREE.MeshBasicMaterial({ color: 0x34d399 }),
  );
  progressBar.position.set(0, 0.046, -0.025);
  rig.add(progressBar);

  const ledMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), ledMat);
  led.position.set(0.05, 0.046, 0.05);
  rig.add(led);

  rig.visible = false;
  return { group: rig, progressBar, ledMat };
}

export class PlayerController {
  constructor(camera) {
    this.camera = camera;
    this.id = 'player';
    this.name = 'You';
    this.isPlayer = true;
    this.team = 'attackers';
    this.alive = true;
    this.hp = 100;
    this.armor = 0;
    this.credits = ECONOMY_CONFIG.START_CREDITS;
    this.kills = 0;
    this.assists = 0;
    this.deaths = 0;
    this.headshots = 0;
    this.hits = 0;
    this.damageDealt = 0;
    this.damagedBy = new Map();
    this.respawnTimer = 0;

    this.sensitivityScale = 1.0;
    this.invertY = false;
    this.baseFov = 74;
    this.animationScale = 1.0;

    this.selectedFinish = 'factory';
    this.selectedBadge = 'blitz_founder';
    this.weaponUpgrades = {};

    this.x = 0;
    this.y = 0;
    this.z = 20;
    this.vy = 0;
    this.grounded = true;
    this.crouched = false;
    this.eyeHeight = EYE_STAND;
    this.yaw = 0;
    this.pitch = 0;
    this.moveSpeed = 0;
    this.scoped = false;

    this.activeSlot = 'secondary';
    this.loadout = {
      primary: null,
      secondary: createWeaponInstance('kestrel'),
    };
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 1.8;
    this.reloadSnapPlayed = false;
    this.burstCount = 0;
    this.lastShotTime = 0;

    this.interactingMode = null;
    this.interactingProgress = 0;
    this.inspectTimer = 0;

    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.trauma = 0;
    this.damageFlash = 0;
    this.damageDirAngle = 0;
    this.hitmarkerTimer = 0;
    this.hitmarkerHeadshot = false;

    this.walkBobPhase = 0;
    this.stepDistAccum = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.strafeRoll = 0;
    this.kickZ = 0;
    this.deployTransitionTimer = 0;

    this.viewmodelRoot = new THREE.Group();
    this.camera.add(this.viewmodelRoot);

    this.plantRig = buildDecryptorRig();
    this.plantRig.group.position.set(0.06, -0.15, -0.34);
    this.camera.add(this.plantRig.group);

    const flashCanvas = document.createElement('canvas');
    flashCanvas.width = 64;
    flashCanvas.height = 64;
    const fctx = flashCanvas.getContext('2d');
    const grad = fctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 240, 1)');
    grad.addColorStop(0.35, 'rgba(255, 200, 80, 0.85)');
    grad.addColorStop(1, 'rgba(255, 140, 20, 0)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, 64, 64);
    const flashTex = new THREE.CanvasTexture(flashCanvas);
    flashTex.colorSpace = THREE.SRGBColorSpace;

    this.muzzleFlashMat = new THREE.MeshBasicMaterial({
      map: flashTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.muzzleFlashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), this.muzzleFlashMat);
    this.viewmodelRoot.add(this.muzzleFlashMesh);
    this.muzzleFlashTimer = 0;

    this.weaponModels = new Map();
    this.currentMuzzle = null;
    this.currentWeaponEntry = null;
    this.syncWeaponModel();
  }

  applySettings(settings) {
    if (!settings) return;
    this.sensitivityScale = Number.isFinite(settings.sensitivity) ? settings.sensitivity : 1.0;
    this.invertY = Boolean(settings.invertY);
    this.baseFov = Number.isFinite(settings.fov) ? settings.fov : 74;
    this.animationScale =
      settings.animationLevel === 'minimal' ? 0.35 :
      settings.animationLevel === 'expressive' ? 1.45 : 1.0;
  }

  applyProfile(profile) {
    if (!profile) return;
    this.selectedFinish = profile.selectedFinish || 'factory';
    this.selectedBadge = profile.selectedBadge || 'blitz_founder';
    this.weaponUpgrades = profile.weaponUpgrades || {};
    for (const entry of this.weaponModels.values()) {
      this.viewmodelRoot.remove(entry.group);
    }
    this.weaponModels.clear();
    this.syncWeaponModel();
  }

  resetMatch(team, profile = null) {
    this.team = team;
    this.credits = ECONOMY_CONFIG.START_CREDITS;
    this.armor = 0;
    this.kills = 0;
    this.assists = 0;
    this.deaths = 0;
    this.headshots = 0;
    this.hits = 0;
    this.damageDealt = 0;
    this.damagedBy.clear();
    if (profile) this.applyProfile(profile);

    const favId = profile?.selectedWeapon;
    const starterPrimary = favId && favId !== 'kestrel' && favId !== 'mallet44' ? null : null;
    this.loadout = {
      primary: starterPrimary,
      secondary: createWeaponInstance('kestrel', this.weaponUpgrades),
    };
    this.activeSlot = 'secondary';
    this.syncWeaponModel();
  }

  spawnForRound(spawnIndex = 0) {
    const list = TEAM_SPAWNS[this.team] || TEAM_SPAWNS.attackers;
    const sp = list[spawnIndex % list.length];
    this.x = sp.x;
    this.y = sp.y;
    this.z = sp.z;
    this.vy = 0;
    this.grounded = true;
    this.crouched = false;
    this.eyeHeight = EYE_STAND;
    this.yaw = sp.yaw;
    this.pitch = 0;
    this.hp = 100;
    this.alive = true;
    this.damagedBy.clear();
    this.scoped = false;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadSnapPlayed = false;
    this.interactingMode = null;
    this.interactingProgress = 0;
    this.inspectTimer = 0;
    this.fireCooldown = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.trauma = 0;
    this.damageFlash = 0;
    this.deployTransitionTimer = 0.45;

    for (const slot of ['primary', 'secondary']) {
      const w = this.loadout[slot];
      if (w) {
        const spec = getUpgradedWeaponSpec(w.id, this.weaponUpgrades);
        w.ammo = spec.magSize;
        w.reserve = spec.reserveSize;
      }
    }
    this.activeSlot = this.loadout.primary ? 'primary' : 'secondary';
    this.syncWeaponModel();
    this.applyCameraTransform(0.016);
  }

  getActiveWeapon() {
    const inst = this.loadout[this.activeSlot] || this.loadout.secondary;
    return { instance: inst, spec: getUpgradedWeaponSpec(inst.id, this.weaponUpgrades) };
  }

  switchSlot(slot) {
    if (!this.loadout[slot] || this.activeSlot === slot) return;
    this.activeSlot = slot;
    this.reloading = false;
    this.reloadTimer = 0;
    this.scoped = false;
    this.inspectTimer = 0;
    this.syncWeaponModel();
    audio.playSwap();
  }

  syncWeaponModel() {
    const { spec } = this.getActiveWeapon();
    for (const [id, entry] of this.weaponModels.entries()) {
      entry.group.visible = id === spec.id;
      if (entry.mag) {
        entry.mag.position.y = entry.magBaseY;
        entry.mag.rotation.z = 0;
      }
    }
    if (!this.weaponModels.has(spec.id)) {
      const built = buildWeaponModel(spec, {
        finishId: this.selectedFinish,
        upgrades: this.weaponUpgrades?.[spec.id],
        forViewmodel: true,
      });
      this.viewmodelRoot.add(built.group);
      this.weaponModels.set(spec.id, built);
    }
    const active = this.weaponModels.get(spec.id);
    active.group.visible = true;
    this.currentMuzzle = active.muzzle;
    this.currentWeaponEntry = active;
  }

  triggerInspect() {
    if (!this.reloading && !this.interactingMode && this.alive) {
      this.inspectTimer = 1.65;
    }
  }

  startReload() {
    const { instance, spec } = this.getActiveWeapon();
    if (this.reloading || instance.ammo >= spec.magSize || instance.reserve <= 0) return;
    this.reloading = true;
    this.reloadDuration = spec.reloadTime;
    this.reloadTimer = spec.reloadTime;
    this.reloadSnapPlayed = false;
    this.scoped = false;
    this.inspectTimer = 0;
    audio.playReload('out');
  }

  setInteractingObjective(mode, progress) {
    this.interactingMode = mode;
    this.interactingProgress = progress;
  }

  addLookDelta(dx, dy, baseSensitivity = 0.0021) {
    const zoomScale = this.scoped ? 0.52 : 1.0;
    const sens = baseSensitivity * this.sensitivityScale * zoomScale;
    const ySign = this.invertY ? -1 : 1;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * sens * ySign,
      -Math.PI * 0.46,
      Math.PI * 0.46,
    );
    this.swayX = THREE.MathUtils.clamp(this.swayX - dx * 0.00024 * this.animationScale, -0.045, 0.045);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.00024 * ySign * this.animationScale, -0.036, 0.036);
  }

  onFired(spec) {
    this.inspectTimer = 0;
    const kick = computeRecoilKick(spec, this.burstCount);
    this.recoilPitch = Math.min(0.24, this.recoilPitch + kick.pitch);
    this.recoilYaw = THREE.MathUtils.clamp(this.recoilYaw + kick.yaw, -0.08, 0.08);
    this.kickZ = Math.min(0.095, this.kickZ + 0.05 * this.animationScale);
    this.muzzleFlashTimer = 0.045;
    this.muzzleFlashMat.opacity = 0.95;
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
    if (this.currentMuzzle) {
      this.muzzleFlashMesh.position.copy(this.currentMuzzle.position);
    }
  }

  getEjectState() {
    if (this.currentWeaponEntry?.eject) {
      this.currentWeaponEntry.eject.getWorldPosition(_ejectWorld);
    } else {
      _ejectWorld.set(this.x, this.y + this.eyeHeight - 0.14, this.z);
    }
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return {
      x: _ejectWorld.x,
      y: _ejectWorld.y,
      z: _ejectWorld.z,
      rx: _right.x,
      rz: _right.z,
      floorY: this.y,
    };
  }

  onDamaged(hpDamage, attacker) {
    this.trauma = Math.min(1, this.trauma + Math.min(0.65, hpDamage * 0.012));
    this.damageFlash = 0.65;
    if (attacker) {
      const angToAttacker = Math.atan2(attacker.x - this.x, attacker.z - this.z);
      this.damageDirAngle = angToAttacker - this.yaw;
    }
    audio.playPlayerHurt();
  }

  getAimOriginAndDir() {
    _aimDir.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, 0, 'YXZ')).normalize();
    if (this.currentMuzzle) {
      this.currentMuzzle.getWorldPosition(_muzzleWorld);
    } else {
      _muzzleWorld.set(this.x, this.y + this.eyeHeight - 0.12, this.z);
    }
    return {
      origin: { x: this.x, y: this.y + this.eyeHeight, z: this.z },
      dir: { x: _aimDir.x, y: _aimDir.y, z: _aimDir.z },
      muzzle: { x: _muzzleWorld.x, y: _muzzleWorld.y, z: _muzzleWorld.z },
    };
  }

  update(dt, input, canMove = true) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    this.inspectTimer = Math.max(0, this.inspectTimer - dt);
    if (this.deployTransitionTimer > 0) {
      this.deployTransitionTimer = Math.max(0, this.deployTransitionTimer - dt);
    }

    if (performance.now() - this.lastShotTime > 260) {
      this.burstCount = 0;
    }

    const { instance, spec } = this.getActiveWeapon();
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, spec.recoilRecovery, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, spec.recoilRecovery, dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      const progress = 1 - Math.max(0, this.reloadTimer) / Math.max(0.1, this.reloadDuration);
      if (progress >= 0.72 && !this.reloadSnapPlayed) {
        this.reloadSnapPlayed = true;
        audio.playReload('in');
      }
      if (this.reloadTimer <= 0) {
        const needed = spec.magSize - instance.ammo;
        const take = Math.min(needed, instance.reserve);
        instance.ammo += take;
        instance.reserve -= take;
        this.reloading = false;
      }
    }

    if (!this.alive) {
      this.interactingMode = null;
      this.applyCameraTransform(dt);
      return;
    }

    this.crouched = canMove && (input.held.has('ControlLeft') || input.held.has('KeyC'));
    const targetEye = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 14, dt);

    let mx = 0;
    let mz = 0;
    if (canMove) {
      if (input.held.has('KeyW') || input.held.has('ArrowUp')) mz += 1;
      if (input.held.has('KeyS') || input.held.has('ArrowDown')) mz -= 1;
      if (input.held.has('KeyA') || input.held.has('ArrowLeft')) mx -= 1;
      if (input.held.has('KeyD') || input.held.has('ArrowRight')) mx += 1;
      if (Math.abs(input.moveX) > 0.05 || Math.abs(input.moveY) > 0.05) {
        mx += input.moveX;
        mz += input.moveY;
      }
    }
    mx = Math.max(-1, Math.min(1, mx));
    mz = Math.max(-1, Math.min(1, mz));

    const isWalking = input.held.has('ShiftLeft') || input.held.has('ShiftRight');
    const baseSpeed = this.crouched ? 3.0 : isWalking ? 3.5 : 5.75;
    const speed = baseSpeed * spec.moveSpeedMult;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let vx = _forward.x * mz + _right.x * mx;
    let vz = _forward.z * mz + _right.z * mx;
    const mag = Math.hypot(vx, vz);
    if (mag > 0.02) {
      const clampMag = Math.min(1, mag);
      vx = (vx / mag) * speed * clampMag;
      vz = (vz / mag) * speed * clampMag;
      this.moveSpeed = speed * clampMag;
    } else {
      vx = 0;
      vz = 0;
      this.moveSpeed = 0;
    }

    const targetRoll = -mx * 0.045 * this.animationScale;
    this.strafeRoll = THREE.MathUtils.damp(this.strafeRoll, targetRoll, 10, dt);

    if (canMove && input.consumeJustPressed('Space') && this.grounded) {
      this.vy = JUMP_VEL;
      this.grounded = false;
    }

    this.vy -= GRAVITY * dt;
    const nextX = this.x + vx * dt;
    const nextY = this.y + this.vy * dt;
    const nextZ = this.z + vz * dt;

    const resolved = resolveEntityCollision(nextX, nextY, nextZ, 0.38, this.crouched ? 1.2 : 1.75);
    this.x = resolved.x;
    this.z = resolved.z;
    if (resolved.y <= resolved.floorY + 0.01 && this.vy <= 0) {
      this.y = resolved.floorY;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.y = resolved.y;
      this.grounded = false;
    }

    const horizDist = this.grounded ? this.moveSpeed * dt : 0;
    if (horizDist > 0.001) {
      this.walkBobPhase += horizDist * 2.4;
      this.stepDistAccum += horizDist;
      if (this.stepDistAccum >= 1.95) {
        this.stepDistAccum = 0;
        if (!isWalking && !this.crouched) audio.playFootstep();
      }
    }

    this.applyCameraTransform(dt);
  }

  applyCameraTransform(dt) {
    const shake = this.trauma * this.trauma * 0.032 * this.animationScale;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    const { spec } = this.getActiveWeapon();
    const deployEase = this.deployTransitionTimer > 0 ? (this.deployTransitionTimer / 0.45) * 5 : 0;
    const portraitBoost = this.camera.aspect < 0.85 ? 8 : 0;
    const targetFov = (this.scoped ? spec.zoomFov : this.baseFov + portraitBoost) + deployEase;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    const bobY = this.grounded && this.moveSpeed > 0.2 ? Math.sin(this.walkBobPhase) * 0.02 * this.animationScale : 0;
    this.camera.position.set(this.x, this.y + this.eyeHeight + bobY, this.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(
      this.pitch + this.recoilPitch + sx,
      this.yaw + this.recoilYaw + sy,
      0,
    );

    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 10, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 10, dt);
    this.kickZ = THREE.MathUtils.damp(this.kickZ, 0, 14, dt);

    const isInteracting = Boolean(this.interactingMode && this.alive);
    const hideForScope = this.scoped && spec.isScoped;
    this.viewmodelRoot.visible = this.alive && !hideForScope && !isInteracting;

    this.plantRig.group.visible = isInteracting;
    if (isInteracting) {
      const nowSec = performance.now() * 0.001;
      this.plantRig.group.position.set(0.04, -0.13 + Math.sin(nowSec * 14) * 0.005, -0.34);
      this.plantRig.group.rotation.set(0.18 + Math.cos(nowSec * 10) * 0.03, -0.15, 0);
      const fill = Math.max(0.05, this.interactingProgress);
      this.plantRig.progressBar.scale.x = fill;
      this.plantRig.progressBar.position.x = -0.048 * (1 - fill);
      this.plantRig.ledMat.color.setHex(
        Math.sin(nowSec * 18) > 0
          ? this.interactingMode === 'planting' ? 0xf59e0b : 0x10b981
          : 0x0f172a,
      );
    }

    let reloadPitch = 0;
    let reloadRoll = 0;
    let reloadDropY = 0;
    if (this.reloading && this.currentWeaponEntry?.mag) {
      const p = 1 - Math.max(0, this.reloadTimer) / Math.max(0.1, this.reloadDuration);
      const magMesh = this.currentWeaponEntry.mag;
      const baseY = this.currentWeaponEntry.magBaseY;

      if (p < 0.25) {
        const k = p / 0.25;
        reloadPitch = -0.32 * k;
        reloadRoll = 0.26 * k;
        magMesh.position.y = baseY - 0.16 * k;
        magMesh.rotation.z = 0.2 * k;
      } else if (p < 0.65) {
        reloadPitch = -0.35;
        reloadRoll = 0.28;
        reloadDropY = -0.025;
        magMesh.position.y = baseY - 0.18;
        magMesh.rotation.z = 0.22;
      } else if (p < 0.88) {
        const k = 1 - (p - 0.65) / 0.23;
        reloadPitch = -0.32 * k;
        reloadRoll = 0.22 * k;
        magMesh.position.y = baseY - 0.16 * k;
        magMesh.rotation.z = 0.15 * k;
      } else {
        const k = (p - 0.88) / 0.12;
        reloadPitch = Math.sin(k * Math.PI) * 0.08;
        magMesh.position.y = baseY;
        magMesh.rotation.z = 0;
      }
    } else if (this.currentWeaponEntry?.mag) {
      this.currentWeaponEntry.mag.position.y = this.currentWeaponEntry.magBaseY;
      this.currentWeaponEntry.mag.rotation.z = 0;
    }

    const inspectYaw = this.inspectTimer > 0 ? Math.sin((1.65 - this.inspectTimer) / 1.65 * Math.PI) * 0.85 : 0;
    const inspectRoll = this.inspectTimer > 0 ? Math.sin((1.65 - this.inspectTimer) / 1.65 * Math.PI) * 0.42 : 0;

    const bobX = Math.cos(this.walkBobPhase * 0.5) * 0.009 * Math.min(1, this.moveSpeed / 5) * this.animationScale;
    const hipX = this.camera.aspect < 0.85 ? 0.1 : 0.2;
    const adsX = this.scoped ? 0.0 : hipX;
    const adsY = this.scoped ? -0.15 : -0.19;

    this.viewmodelRoot.position.set(
      adsX + this.swayX + bobX,
      adsY + this.swayY + bobY * 0.45 + reloadDropY,
      -0.34 + this.kickZ,
    );
    this.viewmodelRoot.rotation.set(
      reloadPitch + this.kickZ * 1.4,
      inspectYaw,
      this.strafeRoll + reloadRoll + inspectRoll,
    );

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.currentMuzzle) {
        this.muzzleFlashMesh.position.copy(this.currentMuzzle.position);
      }
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashMat.opacity = 0;
      }
    }
  }
}
