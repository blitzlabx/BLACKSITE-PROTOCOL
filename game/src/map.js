import { MAPS_CATALOG, getMapById } from './maps-catalog.js';

let activeMap = getMapById('kilnyard');

export const CATWALK_HEIGHT = 2.6;
export const MAP_BOUNDS = { ...activeMap.bounds };
export const PLANT_ZONE = { ...activeMap.plantZone };
export const ZONES = [...activeMap.zones];
export const TEAM_SPAWNS = {
  attackers: [...activeMap.spawns.attackers],
  defenders: [...activeMap.spawns.defenders],
};
export const ELEVATED_DECKS = [...activeMap.elevatedDecks];
export const SECTOR_09_COLLIDERS = [...activeMap.colliders];

export function setActiveMap(mapId) {
  activeMap = getMapById(mapId);
  Object.assign(MAP_BOUNDS, activeMap.bounds);
  Object.assign(PLANT_ZONE, activeMap.plantZone);
  ZONES.length = 0;
  ZONES.push(...activeMap.zones);
  TEAM_SPAWNS.attackers = [...activeMap.spawns.attackers];
  TEAM_SPAWNS.defenders = [...activeMap.spawns.defenders];
  ELEVATED_DECKS.length = 0;
  ELEVATED_DECKS.push(...activeMap.elevatedDecks);
  SECTOR_09_COLLIDERS.length = 0;
  SECTOR_09_COLLIDERS.push(...activeMap.colliders);
  return activeMap;
}

export function getActiveMap() {
  return activeMap;
}

export function getAllMaps() {
  return MAPS_CATALOG;
}

export function getFloorHeight(x, z) {
  for (const deck of ELEVATED_DECKS) {
    if (x >= deck.xMin && x <= deck.xMax && z >= deck.zMin && z <= deck.zMax) {
      if (deck.type === 'deck') return deck.y;
      const t = (z - deck.zMin) / (deck.zMax - deck.zMin);
      return deck.yStart + (deck.yEnd - deck.yStart) * Math.max(0, Math.min(1, t));
    }
  }
  return 0;
}

export function getZoneAt(x, z) {
  for (const zone of ZONES) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return zone;
    }
  }
  return ZONES[1] || ZONES[0];
}

export function resolveEntityCollision(x, y, z, radius = 0.38, height = 1.75, colliders = SECTOR_09_COLLIDERS) {
  let nx = Math.max(MAP_BOUNDS.minX + radius, Math.min(MAP_BOUNDS.maxX - radius, x));
  let nz = Math.max(MAP_BOUNDS.minZ + radius, Math.min(MAP_BOUNDS.maxZ - radius, z));
  const floorY = getFloorHeight(nx, nz);
  const ny = Math.max(floorY, y);

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (ny + height <= b.minY + 0.05 || ny >= b.maxY - 0.15) continue;

      const closestX = Math.max(b.minX, Math.min(nx, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(nz, b.maxZ));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          nx += (dx / dist) * overlap;
          nz += (dz / dist) * overlap;
        } else {
          const penLeft = Math.abs(nx - b.minX);
          const penRight = Math.abs(b.maxX - nx);
          const penTop = Math.abs(nz - b.minZ);
          const penBot = Math.abs(b.maxZ - nz);
          const m = Math.min(penLeft, penRight, penTop, penBot);
          if (m === penLeft) nx = b.minX - radius;
          else if (m === penRight) nx = b.maxX + radius;
          else if (m === penTop) nz = b.minZ - radius;
          else nz = b.maxZ + radius;
        }
      }
    }
  }

  const finalFloor = getFloorHeight(nx, nz);
  return { x: nx, y: Math.max(finalFloor, ny), z: nz, floorY: finalFloor };
}

export function rayIntersectAABB(ox, oy, oz, dx, dy, dz, boxObj, maxDist = 200) {
  let tmin = 0;
  let tmax = maxDist;
  let hitNormalX = 0;
  let hitNormalY = 0;
  let hitNormalZ = 0;

  if (Math.abs(dx) < 1e-8) {
    if (ox < boxObj.minX || ox > boxObj.maxX) return null;
  } else {
    const invD = 1 / dx;
    let t1 = (boxObj.minX - ox) * invD;
    let t2 = (boxObj.maxX - ox) * invD;
    let nx = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      nx = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      hitNormalX = nx;
      hitNormalY = 0;
      hitNormalZ = 0;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-8) {
    if (oy < boxObj.minY || oy > boxObj.maxY) return null;
  } else {
    const invD = 1 / dy;
    let t1 = (boxObj.minY - oy) * invD;
    let t2 = (boxObj.maxY - oy) * invD;
    let ny = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      ny = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      hitNormalX = 0;
      hitNormalY = ny;
      hitNormalZ = 0;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-8) {
    if (oz < boxObj.minZ || oz > boxObj.maxZ) return null;
  } else {
    const invD = 1 / dz;
    let t1 = (boxObj.minZ - oz) * invD;
    let t2 = (boxObj.maxZ - oz) * invD;
    let nz = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      nz = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      hitNormalX = 0;
      hitNormalY = 0;
      hitNormalZ = nz;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  if (tmin < 0 || tmin > maxDist) return null;
  return { dist: tmin, nx: hitNormalX, ny: hitNormalY, nz: hitNormalZ };
}

export function raycastMap(ox, oy, oz, dx, dy, dz, maxDist = 200, colliders = SECTOR_09_COLLIDERS) {
  let bestDist = maxDist;
  let bestHit = null;

  if (dy < -1e-6 && oy > 0) {
    const tFloor = -oy / dy;
    if (tFloor > 0 && tFloor < bestDist) {
      bestDist = tFloor;
      bestHit = { dist: tFloor, nx: 0, ny: 1, nz: 0, collider: null };
    }
  }

  if (!activeMap.openSky && dy > 1e-6 && oy < MAP_BOUNDS.ceilingY) {
    const tCeil = (MAP_BOUNDS.ceilingY - oy) / dy;
    if (tCeil > 0 && tCeil < bestDist) {
      bestDist = tCeil;
      bestHit = { dist: tCeil, nx: 0, ny: -1, nz: 0, collider: null };
    }
  }

  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    const hit = rayIntersectAABB(ox, oy, oz, dx, dy, dz, col, bestDist);
    if (hit && hit.dist < bestDist) {
      bestDist = hit.dist;
      bestHit = { ...hit, collider: col };
    }
  }

  return bestHit;
}

export function hasLineOfSight(ax, ay, az, bx, by, bz, colliders = SECTOR_09_COLLIDERS) {
  const vx = bx - ax;
  const vy = by - ay;
  const vz = bz - az;
  const dist = Math.hypot(vx, vy, vz);
  if (dist < 1e-4) return true;
  const inv = 1 / dist;
  const hit = raycastMap(ax, ay, az, vx * inv, vy * inv, vz * inv, dist - 0.15, colliders);
  return hit === null;
}
