import * as THREE from 'three';
import {
  PLANT_ZONE,
  TEAM_SPAWNS,
  getFloorHeight,
  hasLineOfSight,
  resolveEntityCollision,
} from './map.js';
import { findCoverWaypoint, findPath } from './navigation.js';
import { createWeaponInstance, getWeaponSpec } from './weapons.js';
import { ECONOMY_CONFIG, selectBotBuy } from './economy.js';
import { fireWeapon } from './combat.js';
import { buildOperatorModel } from './models-3d.js';
import { CHARACTERS, OUTFITS } from './profile.js';

export const BOT_PERSONALITIES = ['aggressor', 'defender', 'flanker', 'support', 'sharpshooter'];

const BOT_CALLSIGNS = {
  attackers: ['Flint', 'Moth', 'Sable', 'Rook', 'Marlin'],
  defenders: ['Wren', 'Gull', 'Reef', 'Brine', 'Wake'],
};

const BOT_STATE = {
  ADVANCE: 'ADVANCE',
  PATROL: 'PATROL',
  ENGAGE: 'ENGAGE',
  SEEK_COVER: 'SEEK_COVER',
  RELOAD: 'RELOAD',
  OBJECTIVE: 'OBJECTIVE',
};

export class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];
  }

  initMatchBots(playerTeam) {
    this.disposeBots();
    this.bots = [];

    const atkCount = playerTeam === 'attackers' ? 4 : 5;
    const defCount = playerTeam === 'defenders' ? 4 : 5;

    for (let i = 0; i < atkCount; i++) {
      this.bots.push(this._createBot(`atk_bot_${i}`, BOT_CALLSIGNS.attackers[i], 'attackers', BOT_PERSONALITIES[i % 5], i + (playerTeam === 'attackers' ? 1 : 0)));
    }
    for (let i = 0; i < defCount; i++) {
      this.bots.push(this._createBot(`def_bot_${i}`, BOT_CALLSIGNS.defenders[i], 'defenders', BOT_PERSONALITIES[i % 5], i + (playerTeam === 'defenders' ? 1 : 0)));
    }
  }

  _createBot(id, name, team, personality, spawnIdx) {
    const char = CHARACTERS[(spawnIdx + (team === 'attackers' ? 0 : 2)) % CHARACTERS.length];
    const outfit = OUTFITS[(spawnIdx + 1) % OUTFITS.length];
    const model = buildOperatorModel({
      characterId: char.id,
      outfitId: outfit.id,
      badgeId: 'blitz_founder',
      team,
      weaponId: 'arx17',
    });
    this.scene.add(model.group);
    return {
      id,
      name,
      team,
      personality,
      spawnIdx,
      isPlayer: false,
      alive: true,
      hp: 100,
      armor: 0,
      credits: ECONOMY_CONFIG.START_CREDITS,
      kills: 0,
      assists: 0,
      deaths: 0,
      headshots: 0,
      hits: 0,
      damageDealt: 0,
      damagedBy: new Map(),
      respawnTimer: 0,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      pitch: 0,
      crouched: false,
      scoped: false,
      moveSpeed: 0,
      activeSlot: 'secondary',
      loadout: { primary: null, secondary: createWeaponInstance('kestrel') },
      fireCooldown: 0,
      reloading: false,
      reloadTimer: 0,
      burstCount: 0,
      lastShotTime: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      deathDir: 1,
      lastAttacker: null,
      lastHurtTime: 0,
      state: BOT_STATE.ADVANCE,
      path: [],
      pathIndex: 0,
      repathTimer: 0,
      stuckTimer: 0,
      lastPosX: 0,
      lastPosZ: 0,
      reactionTimer: 0,
      targetEnemy: null,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      strafeTimer: 0,
      walkCycle: 0,
      model,
    };
  }

  respawnBot(bot) {
    const list = TEAM_SPAWNS[bot.team] || TEAM_SPAWNS.attackers;
    const sp = list[bot.spawnIdx % list.length];
    bot.x = sp.x;
    bot.y = sp.y;
    bot.z = sp.z;
    bot.lastPosX = sp.x;
    bot.lastPosZ = sp.z;
    bot.yaw = sp.yaw;
    bot.pitch = 0;
    bot.hp = 100;
    bot.alive = true;
    bot.damagedBy.clear();
    bot.reloading = false;
    bot.reloadTimer = 0;
    bot.fireCooldown = 0.3;
    bot.koTimer = 0;
    bot.stuckTimer = 0;
    bot.targetEnemy = null;
    bot.path = [];
    bot.pathIndex = 0;

    bot.model.group.visible = true;
    bot.model.group.scale.setScalar(1);
    bot.model.group.rotation.set(0, bot.yaw, 0);
    bot.model.group.position.set(bot.x, bot.y, bot.z);
    bot.model.leftLeg.rotation.set(0, 0, 0);
    bot.model.rightLeg.rotation.set(0, 0, 0);
    bot.model.gunGroup.rotation.set(0, 0, 0);
    bot.model.trimMat.emissiveIntensity = 0.45;
  }

  prepareRound(roundNumber, prevWinner) {
    for (const bot of this.bots) {
      this.respawnBot(bot);
      selectBotBuy(bot, prevWinner === bot.team, roundNumber);
      for (const slot of ['primary', 'secondary']) {
        const w = bot.loadout[slot];
        if (w) {
          const spec = getWeaponSpec(w.id);
          w.ammo = spec.magSize;
          w.reserve = spec.reserveSize;
        }
      }
      bot.activeSlot = bot.loadout.primary ? 'primary' : 'secondary';
    }
  }

  _pickPersonalityGoal(bot, objective, allActors, modeId) {
    if (modeId === 'control_zone' || modeId === 'team_deathmatch') {
      if (bot.personality === 'aggressor') {
        const enemy = allActors.find((a) => a.alive && a.team !== bot.team);
        if (enemy && modeId === 'team_deathmatch') return { x: enemy.x, y: enemy.y, z: enemy.z };
      }
      if (bot.personality === 'flanker') {
        return { x: (bot.spawnIdx % 2 === 0 ? 18 : -18), y: 0, z: (Math.random() - 0.5) * 8 };
      }
      return {
        x: PLANT_ZONE.x + (Math.random() - 0.5) * 4.2,
        y: 0,
        z: PLANT_ZONE.z + (Math.random() - 0.5) * 4.2,
      };
    }

    if (bot.team === 'attackers') {
      if (objective.planted) {
        return { x: objective.position.x + (bot.spawnIdx - 2) * 2.5, y: 0, z: objective.position.z + 3.5 };
      }
      if (bot.personality === 'flanker') return { x: 22.0, y: 0, z: -4.0 };
      if (bot.personality === 'sharpshooter') return { x: -22.5, y: 2.5, z: 4.5 };
      if (bot.personality === 'support' || bot.personality === 'aggressor') {
        return { x: PLANT_ZONE.x + (Math.random() - 0.5) * 2.5, y: 0, z: PLANT_ZONE.z + (Math.random() - 0.5) * 2.5 };
      }
      return { x: -13.0, y: 0, z: -2.0 };
    }

    if (objective.planted) {
      return { x: objective.position.x, y: 0, z: objective.position.z };
    }
    if (bot.personality === 'flanker') return { x: 22.0, y: 0, z: 3.5 };
    if (bot.personality === 'sharpshooter') return { x: -22.5, y: 2.5, z: -4.5 };
    if (bot.personality === 'aggressor') {
      const aliveAtk = allActors.find((a) => a.alive && a.team === 'attackers');
      if (aliveAtk) return { x: aliveAtk.x, y: aliveAtk.y, z: aliveAtk.z };
    }
    return { x: (bot.spawnIdx - 2) * 3.2, y: 0, z: -4.2 };
  }

  _findVisibleEnemy(bot, allActors) {
    const eyeY = bot.y + 1.48;
    const fx = -Math.sin(bot.yaw);
    const fz = -Math.cos(bot.yaw);
    const recentlyHurt = performance.now() - bot.lastHurtTime < 2200;

    let best = null;
    let bestDist = Infinity;
    for (const other of allActors) {
      if (!other.alive || other.team === bot.team) continue;
      const dx = other.x - bot.x;
      const dz = other.z - bot.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 46 || dist >= bestDist) continue;

      const dot = (dx / (dist || 1)) * fx + (dz / (dist || 1)) * fz;
      const inFov = dot > 0.35 || dist < 5.5 || (recentlyHurt && bot.lastAttacker?.id === other.id);
      if (!inFov) continue;

      if (hasLineOfSight(bot.x, eyeY, bot.z, other.x, other.y + 1.38, other.z)) {
        bestDist = dist;
        best = other;
      }
    }
    return best;
  }

  update(dt, canAct, allActors, objective, effects, matchState, playerRef, onActorKilled, onPlayerDamaged) {
    const now = performance.now();
    const modeId = matchState?.modeId || 'bomb_defusal';

    for (const bot of this.bots) {
      if (!bot.alive) {
        if (canAct && modeId === 'team_deathmatch') {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0) {
            this.respawnBot(bot);
            continue;
          }
        }
        if (bot.koTimer > 0) {
          bot.koTimer -= dt;
          const total = 0.75;
          const t = 1 - Math.max(0, bot.koTimer) / total;
          bot.model.trimMat.emissiveIntensity = Math.max(0, 0.45 * (1 - t * 3));
          const fall = Math.min(1, t / 0.55);
          const eased = 1 - (1 - fall) * (1 - fall);
          bot.model.group.rotation.x = eased * (Math.PI * 0.48);
          bot.model.group.rotation.z = eased * 0.34 * (bot.deathDir || 1);
          bot.model.leftLeg.rotation.z = -eased * 0.25;
          bot.model.rightLeg.rotation.z = eased * 0.28;
          bot.model.gunGroup.rotation.x = eased * 0.7;
          const sink = t > 0.68 ? ((t - 0.68) / 0.32) : 0;
          bot.model.group.position.y = Math.max(-0.4, bot.y - eased * 0.22 - sink * 0.35);
          if (sink > 0) {
            bot.model.group.scale.setScalar(Math.max(0.05, 1 - sink * 0.85));
          }
        } else {
          bot.model.group.visible = false;
        }
        continue;
      }

      if (bot.hitFlashTimer > 0) {
        bot.hitFlashTimer -= dt;
        bot.model.armorMat.emissive.setHex(bot.hitFlashTimer > 0 ? 0xffffff : 0x000000);
        bot.model.armorMat.emissiveIntensity = bot.hitFlashTimer > 0 ? 0.75 : 0;
      }

      if (!canAct) {
        bot.moveSpeed = 0;
        bot.model.group.position.set(bot.x, bot.y, bot.z);
        bot.model.group.rotation.y = bot.yaw;
        continue;
      }

      bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
      if (now - bot.lastShotTime > 320) bot.burstCount = 0;

      const inst = bot.loadout[bot.activeSlot] || bot.loadout.secondary;
      const spec = getWeaponSpec(inst.id);
      if (bot.reloading) {
        bot.reloadTimer -= dt;
        if (bot.reloadTimer <= 0) {
          const take = Math.min(spec.magSize - inst.ammo, inst.reserve);
          inst.ammo += take;
          inst.reserve -= take;
          bot.reloading = false;
          bot.state = BOT_STATE.ADVANCE;
        }
      } else if (inst.ammo <= 0) {
        if (inst.reserve > 0) {
          bot.reloading = true;
          bot.reloadTimer = spec.reloadTime;
          bot.state = BOT_STATE.SEEK_COVER;
        } else if (bot.activeSlot === 'primary') {
          bot.activeSlot = 'secondary';
        }
      }

      const seenEnemy = this._findVisibleEnemy(bot, allActors);
      if (seenEnemy) {
        if (!bot.targetEnemy || bot.targetEnemy.id !== seenEnemy.id) {
          bot.reactionTimer = 0.18 + Math.random() * 0.16;
        }
        bot.targetEnemy = seenEnemy;
      } else if (bot.targetEnemy && !bot.targetEnemy.alive) {
        bot.targetEnemy = null;
      }

      let doingObjective = false;
      if (modeId === 'bomb_defusal' && !seenEnemy && !bot.reloading) {
        if (bot.team === 'attackers' && !objective.planted && objective.isInsidePlantZone(bot.x, bot.z)) {
          bot.state = BOT_STATE.OBJECTIVE;
          doingObjective = true;
          objective.updateInteraction(dt, bot, true);
        } else if (bot.team === 'defenders' && objective.planted && !objective.defused && objective.isNearPlantedSpike(bot.x, bot.z)) {
          bot.state = BOT_STATE.OBJECTIVE;
          doingObjective = true;
          objective.updateInteraction(dt, bot, true);
        }
      }

      if (doingObjective) {
        bot.moveSpeed = 0;
      } else if (bot.hp < 36 && bot.targetEnemy && bot.state !== BOT_STATE.SEEK_COVER) {
        const cover = findCoverWaypoint(bot, bot.targetEnemy);
        if (cover) {
          bot.state = BOT_STATE.SEEK_COVER;
          bot.path = [cover];
          bot.pathIndex = 0;
        }
      } else if (seenEnemy && !bot.reloading) {
        bot.state = BOT_STATE.ENGAGE;
      } else {
        bot.state = BOT_STATE.ADVANCE;
      }

      let desiredMoveX = 0;
      let desiredMoveZ = 0;
      let speed = 4.6;

      if (bot.state === BOT_STATE.ENGAGE && bot.targetEnemy) {
        const dx = bot.targetEnemy.x - bot.x;
        const dz = bot.targetEnemy.z - bot.z;
        const dist = Math.hypot(dx, dz) || 1;
        const targetYaw = Math.atan2(-dx, -dz);
        bot.yaw = lerpAngle(bot.yaw, targetYaw, Math.min(1, dt * 11));

        bot.strafeTimer -= dt;
        if (bot.strafeTimer <= 0) {
          bot.strafeTimer = 0.5 + Math.random() * 0.7;
          bot.strafeDir *= -1;
        }

        const preferDist =
          bot.personality === 'sharpshooter' ? 20 : bot.personality === 'aggressor' ? 6 : 12;
        if (dist > preferDist + 3) {
          desiredMoveX = dx / dist;
          desiredMoveZ = dz / dist;
          speed = 3.9;
        } else if (dist < preferDist - 3) {
          desiredMoveX = -dx / dist;
          desiredMoveZ = -dz / dist;
          speed = 3.2;
        } else {
          desiredMoveX = (-dz / dist) * bot.strafeDir;
          desiredMoveZ = (dx / dist) * bot.strafeDir;
          speed = bot.fireCooldown > spec.fireRate * 0.5 ? 0.5 : 2.8;
        }

        bot.reactionTimer = Math.max(0, bot.reactionTimer - dt);
        if (bot.reactionTimer <= 0 && bot.fireCooldown <= 0 && !bot.reloading) {
          const aimY = bot.targetEnemy.y + (Math.random() < 0.2 ? 1.54 : 1.12);
          const ox = bot.x;
          const oy = bot.y + 1.48;
          const oz = bot.z;
          const adx = bot.targetEnemy.x - ox;
          const ady = aimY - oy;
          const adz = bot.targetEnemy.z - oz;
          const alen = Math.hypot(adx, ady, adz) || 1;

          const muzzleWorld = new THREE.Vector3();
          bot.model.muzzle.getWorldPosition(muzzleWorld);

          fireWeapon({
            shooter: bot,
            origin: { x: ox, y: oy, z: oz },
            aimDir: { x: adx / alen, y: ady / alen, z: adz / alen },
            muzzlePos: { x: muzzleWorld.x, y: muzzleWorld.y, z: muzzleWorld.z },
            actors: allActors,
            effects,
            matchState,
            playerRef,
            onActorKilled,
            onPlayerDamaged,
          });
        }
      } else if (!doingObjective) {
        bot.repathTimer -= dt;
        if (bot.repathTimer <= 0 || bot.pathIndex >= bot.path.length) {
          bot.repathTimer = 1.4 + Math.random() * 0.9;
          const goal =
            bot.state === BOT_STATE.SEEK_COVER && bot.targetEnemy
              ? findCoverWaypoint(bot, bot.targetEnemy) || this._pickPersonalityGoal(bot, objective, allActors, modeId)
              : this._pickPersonalityGoal(bot, objective, allActors, modeId);
          bot.path = findPath(bot, goal);
          bot.pathIndex = 0;
        }

        const wp = bot.path[bot.pathIndex];
        if (wp) {
          const dx = wp.x - bot.x;
          const dz = wp.z - bot.z;
          const d = Math.hypot(dx, dz);
          if (d < 1.35) {
            bot.pathIndex += 1;
          } else {
            desiredMoveX = dx / d;
            desiredMoveZ = dz / d;
            const targetYaw = Math.atan2(-desiredMoveX, -desiredMoveZ);
            bot.yaw = lerpAngle(bot.yaw, targetYaw, Math.min(1, dt * 8));
          }
        }
      }

      if (Math.hypot(desiredMoveX, desiredMoveZ) > 0.01) {
        bot.moveSpeed = speed * spec.moveSpeedMult;
        const nx = bot.x + desiredMoveX * bot.moveSpeed * dt;
        const nz = bot.z + desiredMoveZ * bot.moveSpeed * dt;
        const floorY = getFloorHeight(nx, nz);
        const col = resolveEntityCollision(nx, floorY, nz, 0.38, 1.75);
        const moved = Math.hypot(col.x - bot.lastPosX, col.z - bot.lastPosZ);
        bot.x = col.x;
        bot.y = col.floorY;
        bot.z = col.z;
        bot.lastPosX = bot.x;
        bot.lastPosZ = bot.z;
        bot.walkCycle += bot.moveSpeed * dt * 2.8;

        if (moved < bot.moveSpeed * dt * 0.22) {
          bot.stuckTimer += dt;
          if (bot.stuckTimer > 0.35) {
            bot.stuckTimer = 0;
            bot.strafeDir *= -1;
            const nudge = resolveEntityCollision(
              bot.x + -desiredMoveZ * bot.strafeDir * 0.6,
              bot.y,
              bot.z + desiredMoveX * bot.strafeDir * 0.6,
              0.38,
              1.75,
            );
            bot.x = nudge.x;
            bot.z = nudge.z;
            bot.repathTimer = 0;
          }
        } else {
          bot.stuckTimer = Math.max(0, bot.stuckTimer - dt);
        }
      } else {
        bot.moveSpeed = 0;
      }

      bot.model.group.position.set(bot.x, bot.y, bot.z);
      bot.model.group.rotation.set(0, bot.yaw, 0);
      const swing = bot.moveSpeed > 0.2 ? Math.sin(bot.walkCycle) * 0.45 : 0;
      bot.model.leftLeg.rotation.x = swing;
      bot.model.rightLeg.rotation.x = -swing;
    }
  }

  disposeBots() {
    for (const bot of this.bots) {
      this.scene.remove(bot.model.group);
    }
  }
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
