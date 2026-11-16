import { computeDamage, computeShotSpread, getUpgradedWeaponSpec } from './weapons.js';
import { ECONOMY_CONFIG, clampCredits } from './economy.js';
import { raycastMap } from './map.js';
import { audio } from './audio.js';

function raySphereDist(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, maxDist) {
  const mx = ox - cx;
  const my = oy - cy;
  const mz = oz - cz;
  const b = mx * dx + my * dy + mz * dz;
  const c = mx * mx + my * my + mz * mz - r * r;
  if (c > 0 && b > 0) return null;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  const hitT = t < 0 ? 0 : t;
  return hitT <= maxDist ? hitT : null;
}

function rayCylinderApproxHit(ox, oy, oz, dx, dy, dz, actor, maxDist) {
  const baseY = actor.y;
  const headY = baseY + (actor.crouched ? 1.05 : 1.56);
  const headRadius = 0.21;

  const headHit = raySphereDist(ox, oy, oz, dx, dy, dz, actor.x, headY, actor.z, headRadius, maxDist);
  if (headHit !== null) {
    return { dist: headHit, isHeadshot: true };
  }

  const torsoRadius = 0.34;
  let bestBody = null;
  const chestY = baseY + (actor.crouched ? 0.68 : 1.12);
  const waistY = baseY + (actor.crouched ? 0.38 : 0.65);

  for (const cy of [chestY, waistY]) {
    const t = raySphereDist(ox, oy, oz, dx, dy, dz, actor.x, cy, actor.z, torsoRadius, maxDist);
    if (t !== null && (bestBody === null || t < bestBody)) {
      bestBody = t;
    }
  }
  if (bestBody !== null) {
    return { dist: bestBody, isHeadshot: false };
  }
  return null;
}

export function fireWeapon({
  shooter,
  origin,
  aimDir,
  muzzlePos,
  actors,
  effects,
  matchState,
  playerRef,
  onActorKilled,
  onPlayerDamaged,
}) {
  const slotObj = shooter.loadout[shooter.activeSlot];
  if (!slotObj || slotObj.ammo <= 0 || shooter.reloading) return { fired: false };

  const weapon = getUpgradedWeaponSpec(slotObj.id, shooter.weaponUpgrades);
  slotObj.ammo -= 1;
  shooter.fireCooldown = weapon.fireRate;
  shooter.burstCount = (shooter.burstCount || 0) + 1;
  shooter.lastShotTime = performance.now();

  const spread = computeShotSpread(weapon, {
    moveSpeed: shooter.moveSpeed || 0,
    isCrouched: shooter.crouched,
    isScoped: shooter.scoped,
    burstCount: shooter.burstCount,
  });

  const distToListener = playerRef
    ? Math.hypot(origin.x - playerRef.x, origin.y - (playerRef.y + 1.5), origin.z - playerRef.z)
    : 0;
  audio.playShot(weapon.id, shooter.isPlayer ? 0 : distToListener);

  if (effects && muzzlePos) {
    effects.triggerMuzzleLight(muzzlePos.x, muzzlePos.y, muzzlePos.z);
  }

  let anyHit = false;
  let anyHeadshot = false;
  let anyKill = false;

  for (let p = 0; p < weapon.pellets; p++) {
    const sx = (Math.random() - 0.5) * 2 * spread;
    const sy = (Math.random() - 0.5) * 2 * spread;
    const sz = (Math.random() - 0.5) * 2 * spread;

    let dx = aimDir.x + sx;
    let dy = aimDir.y + sy;
    let dz = aimDir.z + sz;
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;

    const wallHit = raycastMap(origin.x, origin.y, origin.z, dx, dy, dz, weapon.range);
    const maxDist = wallHit ? wallHit.dist : weapon.range;

    let hitActor = null;
    let hitIsHeadshot = false;
    let actorDist = maxDist;

    for (const target of actors) {
      if (!target.alive || target.team === shooter.team || target.id === shooter.id) continue;
      const hit = rayCylinderApproxHit(origin.x, origin.y, origin.z, dx, dy, dz, target, actorDist);
      if (hit && hit.dist < actorDist) {
        actorDist = hit.dist;
        hitActor = target;
        hitIsHeadshot = hit.isHeadshot;
      }
    }

    const endX = origin.x + dx * actorDist;
    const endY = origin.y + dy * actorDist;
    const endZ = origin.z + dz * actorDist;

    if (effects && muzzlePos) {
      const tracerColor = shooter.team === 'attackers' ? 0x34d399 : 0xffb347;
      effects.spawnTracer(muzzlePos.x, muzzlePos.y, muzzlePos.z, endX, endY, endZ, tracerColor);
    }

    if (hitActor) {
      anyHit = true;
      if (hitIsHeadshot) anyHeadshot = true;

      const { hpDamage, armorDamage } = computeDamage(weapon, {
        isHeadshot: hitIsHeadshot,
        distance: actorDist,
        targetArmor: hitActor.armor,
      });

      const appliedHpDmg = Math.min(hitActor.hp, hpDamage);
      hitActor.armor = Math.max(0, hitActor.armor - armorDamage);
      hitActor.hp = Math.max(0, hitActor.hp - hpDamage);
      hitActor.hitFlashTimer = 0.12;
      hitActor.lastAttacker = shooter;
      hitActor.lastHurtTime = performance.now();

      shooter.damageDealt = (shooter.damageDealt || 0) + appliedHpDmg;
      shooter.hits = (shooter.hits || 0) + 1;
      if (hitIsHeadshot) shooter.headshots = (shooter.headshots || 0) + 1;

      if (!hitActor.damagedBy) hitActor.damagedBy = new Map();
      hitActor.damagedBy.set(shooter.id, (hitActor.damagedBy.get(shooter.id) || 0) + appliedHpDmg);

      if (effects) {
        effects.spawnImpactBurst(endX, endY, endZ, -dx, 0.2, -dz, true, hitIsHeadshot ? 14 : 8);
      }

      if (hitActor.isPlayer && onPlayerDamaged) {
        onPlayerDamaged(hpDamage, shooter);
      }

      if (hitActor.hp <= 0 && hitActor.alive) {
        hitActor.alive = false;
        hitActor.deaths += 1;
        hitActor.koTimer = 0.75;
        hitActor.respawnTimer = 3.0;
        hitActor.deathDir = Math.random() < 0.5 ? 1 : -1;
        shooter.kills += 1;
        shooter.credits = clampCredits(shooter.credits + ECONOMY_CONFIG.KILL_REWARD);
        anyKill = true;

        // Credit assists to teammates who dealt >= 20 damage
        if (hitActor.damagedBy) {
          for (const [assisterId, dmg] of hitActor.damagedBy.entries()) {
            if (assisterId !== shooter.id && dmg >= 20) {
              const assister = actors.find((a) => a.id === assisterId);
              if (assister && assister.team === shooter.team) {
                assister.assists = (assister.assists || 0) + 1;
                assister.credits = clampCredits(assister.credits + ECONOMY_CONFIG.ASSIST_REWARD);
              }
            }
          }
          hitActor.damagedBy.clear();
        }

        if (matchState) {
          if (matchState.modeId === 'team_deathmatch') {
            matchState.tdmKills[shooter.team] = (matchState.tdmKills[shooter.team] || 0) + 1;
          }
          matchState.killFeed.unshift({
            id: `${Date.now()}_${Math.random()}`,
            killer: shooter.name,
            killerTeam: shooter.team,
            victim: hitActor.name,
            victimTeam: hitActor.team,
            weapon: weapon.name,
            headshot: hitIsHeadshot,
            ttl: 5.5,
          });
          if (matchState.killFeed.length > 5) matchState.killFeed.length = 5;
        }

        if (onActorKilled) {
          onActorKilled(hitActor, shooter, hitIsHeadshot, weapon);
        }
      }
    } else if (wallHit && effects) {
      effects.spawnImpactBurst(
        endX,
        endY,
        endZ,
        wallHit.nx,
        wallHit.ny,
        wallHit.nz,
        false,
        weapon.id === 'hawk12' ? 3 : 6,
      );
    }
  }

  if (shooter.isPlayer && anyHit) {
    audio.playHitmarker(anyHeadshot);
    if (anyKill) {
      audio.playKillConfirm();
    }
  }

  return { fired: true, anyHit, anyHeadshot, anyKill };
}
