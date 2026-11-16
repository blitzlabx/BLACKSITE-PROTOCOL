import * as THREE from 'three';
import { PLANT_ZONE } from './map.js';
import { audio } from './audio.js';

export const OBJECTIVE_CONFIG = {
  PLANT_DURATION: 3.0,
  DEFUSE_DURATION: 4.4,
  DETONATION_TIME: 35.0,
  INTERACT_RADIUS: 2.6,
};

export class ObjectiveManager {
  constructor(scene) {
    this.scene = scene;
    this.planted = false;
    this.detonated = false;
    this.defused = false;
    this.detonateTimer = OBJECTIVE_CONFIG.DETONATION_TIME;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.planterId = null;
    this.defuserId = null;
    this.position = new THREE.Vector3(PLANT_ZONE.x, 0, PLANT_ZONE.z);
    this.beepCooldown = 0;

    this.group = this._buildSpikeProp();
    this.group.visible = false;
    this.scene.add(this.group);
  }

  _buildSpikeProp() {
    const g = new THREE.Group();

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1d232b,
      roughness: 0.45,
      metalness: 0.82,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.35,
    });
    this.coreGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      emissive: 0xff3b30,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.1,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.14, 6), baseMat);
    base.position.y = 0.07;
    base.castShadow = true;
    g.add(base);

    const finGeo = new THREE.BoxGeometry(0.06, 0.34, 0.16);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(finGeo, accentMat);
      const ang = (i * Math.PI * 2) / 3;
      fin.position.set(Math.cos(ang) * 0.22, 0.24, Math.sin(ang) * 0.22);
      fin.rotation.y = -ang;
      g.add(fin);
    }

    this.coreCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.46, 12), this.coreGlowMat);
    this.coreCylinder.position.y = 0.36;
    g.add(this.coreCylinder);

    this.haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 24), accentMat);
    this.haloRing.position.y = 0.44;
    this.haloRing.rotation.x = Math.PI * 0.5;
    g.add(this.haloRing);

    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.pulsePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, 4.6, 12, 1, true), pillarMat);
    this.pulsePillar.position.y = 2.3;
    g.add(this.pulsePillar);

    this.beaconLight = new THREE.PointLight(0xff3b30, 2.8, 12, 2);
    this.beaconLight.position.y = 0.7;
    g.add(this.beaconLight);

    return g;
  }

  reset() {
    this.planted = false;
    this.detonated = false;
    this.defused = false;
    this.detonateTimer = OBJECTIVE_CONFIG.DETONATION_TIME;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.planterId = null;
    this.defuserId = null;
    this.beepCooldown = 0;
    this.group.visible = false;
    this.position.set(PLANT_ZONE.x, 0, PLANT_ZONE.z);
  }

  isInsidePlantZone(x, z) {
    return Math.hypot(x - PLANT_ZONE.x, z - PLANT_ZONE.z) <= PLANT_ZONE.radius;
  }

  isNearPlantedSpike(x, z) {
    return this.planted && Math.hypot(x - this.position.x, z - this.position.z) <= OBJECTIVE_CONFIG.INTERACT_RADIUS;
  }

  plantAt(x, z, actorId) {
    this.planted = true;
    this.plantProgress = 1;
    this.planterId = actorId;
    this.detonateTimer = OBJECTIVE_CONFIG.DETONATION_TIME;
    this.position.set(x, 0, z);
    this.group.position.set(x, 0, z);
    this.group.visible = true;
    audio.playSpikeBeep(0.8);
  }

  updateInteraction(dt, actor, wantsInteract) {
    if (!actor || !actor.alive) {
      if (this.planterId === actor?.id) {
        this.plantProgress = 0;
        this.planterId = null;
      }
      if (this.defuserId === actor?.id) {
        this.defuseProgress = 0;
        this.defuserId = null;
      }
      return null;
    }

    if (actor.team === 'attackers' && !this.planted) {
      if (wantsInteract && this.isInsidePlantZone(actor.x, actor.z)) {
        this.planterId = actor.id;
        this.plantProgress = Math.min(1, this.plantProgress + dt / OBJECTIVE_CONFIG.PLANT_DURATION);
        if (this.plantProgress >= 1) {
          this.plantAt(actor.x, actor.z, actor.id);
          return 'planted';
        }
        return 'planting';
      } else if (this.planterId === actor.id) {
        this.plantProgress = 0;
        this.planterId = null;
      }
    }

    if (actor.team === 'defenders' && this.planted && !this.defused && !this.detonated) {
      if (wantsInteract && this.isNearPlantedSpike(actor.x, actor.z)) {
        this.defuserId = actor.id;
        this.defuseProgress = Math.min(1, this.defuseProgress + dt / OBJECTIVE_CONFIG.DEFUSE_DURATION);
        if (this.defuseProgress >= 1) {
          this.defused = true;
          this.beaconLight.color.setHex(0x38bdf8);
          this.coreGlowMat.color.setHex(0x38bdf8);
          this.coreGlowMat.emissive.setHex(0x38bdf8);
          audio.playSpikeBeep(0.2);
          return 'defused';
        }
        return 'defusing';
      } else if (this.defuserId === actor.id) {
        this.defuseProgress = 0;
        this.defuserId = null;
      }
    }
    return null;
  }

  update(dt, elapsed) {
    if (!this.planted || this.defused || this.detonated) return;

    this.detonateTimer = Math.max(0, this.detonateTimer - dt);
    const urgency = 1 - this.detonateTimer / OBJECTIVE_CONFIG.DETONATION_TIME;
    const interval = Math.max(0.16, 1.0 - urgency * 0.84);

    this.beepCooldown -= dt;
    if (this.beepCooldown <= 0) {
      this.beepCooldown = interval;
      audio.playSpikeBeep(urgency);
      this.beaconLight.intensity = 4.2;
      this.coreGlowMat.emissiveIntensity = 3.5;
    } else {
      this.beaconLight.intensity = THREE.MathUtils.damp(this.beaconLight.intensity, 1.1, 10, dt);
      this.coreGlowMat.emissiveIntensity = THREE.MathUtils.damp(this.coreGlowMat.emissiveIntensity, 1.4, 10, dt);
    }

    this.haloRing.rotation.z = elapsed * (2.5 + urgency * 6);
    this.haloRing.position.y = 0.44 + Math.sin(elapsed * 4) * 0.04;

    if (this.detonateTimer <= 0) {
      this.detonated = true;
      this.beaconLight.intensity = 8;
    }
  }
}
