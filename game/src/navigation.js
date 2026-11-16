import { getActiveMap, hasLineOfSight } from './map.js';

let WAYPOINTS = [];
let WP_MAP = new Map();
let ADJACENCY = new Map();

export function rebuildNavigationForMap(mapSpec = getActiveMap()) {
  const graph = mapSpec?.graph;
  if (!graph) return;
  WAYPOINTS = graph.waypoints.map((w) => ({ ...w }));
  WP_MAP = new Map(WAYPOINTS.map((wp) => [wp.id, wp]));
  ADJACENCY = new Map(WAYPOINTS.map((wp) => [wp.id, []]));

  for (const [a, b] of graph.edges) {
    const wa = WP_MAP.get(a);
    const wb = WP_MAP.get(b);
    if (!wa || !wb) continue;
    const dist = Math.hypot(wa.x - wb.x, wa.y - wb.y, wa.z - wb.z);
    ADJACENCY.get(a).push({ id: b, cost: dist });
    ADJACENCY.get(b).push({ id: a, cost: dist });
  }
}

rebuildNavigationForMap();

export function getWaypoints() {
  return WAYPOINTS;
}

export function getWaypoint(id) {
  return WP_MAP.get(id) || null;
}

export function findNearestWaypoint(pos, preferVisible = false) {
  let best = null;
  let bestDist = Infinity;
  for (const wp of WAYPOINTS) {
    const d = Math.hypot(wp.x - pos.x, wp.y - pos.y, wp.z - pos.z);
    if (d >= bestDist) continue;
    if (preferVisible && !hasLineOfSight(pos.x, pos.y + 1.2, pos.z, wp.x, wp.y + 1.2, wp.z)) {
      continue;
    }
    bestDist = d;
    best = wp;
  }
  if (!best && preferVisible) return findNearestWaypoint(pos, false);
  return best;
}

export function findPath(startPos, goalPos) {
  if (WAYPOINTS.length === 0) rebuildNavigationForMap();
  const startWp = findNearestWaypoint(startPos, true);
  const goalWp = findNearestWaypoint(goalPos, true);
  if (!startWp || !goalWp) return [{ x: goalPos.x, y: goalPos.y || 0, z: goalPos.z }];
  if (startWp.id === goalWp.id) return [goalWp];

  const dist = new Map();
  const prev = new Map();
  const unvisited = new Set(WAYPOINTS.map((w) => w.id));
  for (const w of WAYPOINTS) dist.set(w.id, Infinity);
  dist.set(startWp.id, 0);

  while (unvisited.size > 0) {
    let currId = null;
    let currBest = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id);
      if (d < currBest) {
        currBest = d;
        currId = id;
      }
    }
    if (!currId || currId === goalWp.id || currBest === Infinity) break;
    unvisited.delete(currId);

    for (const edge of ADJACENCY.get(currId) || []) {
      if (!unvisited.has(edge.id)) continue;
      const alt = currBest + edge.cost;
      if (alt < dist.get(edge.id)) {
        dist.set(edge.id, alt);
        prev.set(edge.id, currId);
      }
    }
  }

  const path = [];
  let step = goalWp.id;
  while (step) {
    path.unshift(WP_MAP.get(step));
    if (step === startWp.id) break;
    step = prev.get(step);
  }
  return path.length > 0 ? path : [goalWp];
}

export function findCoverWaypoint(botPos, threatPos) {
  if (WAYPOINTS.length === 0) rebuildNavigationForMap();
  let bestWp = null;
  let bestScore = Infinity;

  for (const wp of WAYPOINTS) {
    const dBot = Math.hypot(wp.x - botPos.x, wp.z - botPos.z);
    if (dBot > 18 || dBot < 1.2) continue;
    const occluded = !hasLineOfSight(wp.x, wp.y + 1.35, wp.z, threatPos.x, (threatPos.y || 0) + 1.4, threatPos.z);
    if (!occluded) continue;
    const score = dBot - (wp.cover ? 3.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestWp = wp;
    }
  }
  return bestWp;
}
