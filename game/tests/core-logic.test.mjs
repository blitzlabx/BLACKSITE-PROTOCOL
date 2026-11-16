import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WEAPONS,
  computeDamage,
  computeShotSpread,
  createWeaponInstance,
  getUpgradedWeaponSpec,
} from '../src/weapons.js';
import {
  ECONOMY_CONFIG,
  calculateRoundReward,
  canPurchaseItem,
  purchaseItem,
  selectBotBuy,
} from '../src/economy.js';
import {
  TEAM_SPAWNS,
  getAllMaps,
  getFloorHeight,
  hasLineOfSight,
  raycastMap,
  resolveEntityCollision,
  setActiveMap,
} from '../src/map.js';
import { findCoverWaypoint, findPath, rebuildNavigationForMap } from '../src/navigation.js';
import {
  GAME_PHASES,
  advanceAfterRoundResults,
  beginActiveCombat,
  beginBuyPhase,
  checkRoundWinCondition,
  createMatchState,
  resolveRoundOutcome,
  startNewMatch,
} from '../src/rounds.js';
import { DEFAULT_SETTINGS, loadSettings, resetSettings, saveSettings } from '../src/settings.js';
import { createDefaultProfile, recordMatchResult, unlockShopItem, upgradeWeaponTrack } from '../src/profile.js';

test('weapons: headshot multiplier, armor mitigation, and upgrade scaling', () => {
  const arx = WEAPONS.arx17;
  const bodyNoArmor = computeDamage(arx, { isHeadshot: false, distance: 15, targetArmor: 0 });
  const headNoArmor = computeDamage(arx, { isHeadshot: true, distance: 15, targetArmor: 0 });
  assert.equal(bodyNoArmor.hpDamage, 34);
  assert.equal(headNoArmor.hpDamage, 85);

  const bodyArmor = computeDamage(arx, { isHeadshot: false, distance: 15, targetArmor: 100 });
  assert.ok(bodyArmor.hpDamage < bodyNoArmor.hpDamage);
  assert.ok(bodyArmor.armorDamage > 0);

  const upgraded = getUpgradedWeaponSpec('arx17', {
    arx17: { barrel: 2, trigger: 2, magazine: 2, stock: 2 },
  });
  assert.ok(upgraded.damage > arx.damage);
  assert.ok(upgraded.magSize > arx.magSize);
  assert.ok(upgraded.fireRate < arx.fireRate);
  assert.ok(upgraded.baseSpread < arx.baseSpread);
});

test('weapons: movement increases spread and crouching/scoping tightens it', () => {
  const m4k = WEAPONS.m4k;
  const still = computeShotSpread(m4k, { moveSpeed: 0, isCrouched: false });
  const moving = computeShotSpread(m4k, { moveSpeed: 5.8, isCrouched: false });
  const crouched = computeShotSpread(m4k, { moveSpeed: 0, isCrouched: true });
  assert.ok(moving > still);
  assert.ok(crouched < still);
});

test('economy: buying weapons and armor deducts credits and equips loadout', () => {
  const player = {
    credits: 3500,
    armor: 0,
    activeSlot: 'secondary',
    loadout: { primary: null, secondary: createWeaponInstance('kestrel') },
  };

  assert.equal(canPurchaseItem(player, 'longshot').ok, false);
  const res = purchaseItem(player, 'arx17');
  assert.equal(res.ok, true);
  assert.equal(player.credits, 800);
  assert.equal(player.loadout.primary.id, 'arx17');
  assert.equal(player.activeSlot, 'primary');

  const armorRes = purchaseItem(player, 'kevlar');
  assert.equal(armorRes.ok, true);
  assert.equal(player.armor, 50);
  assert.equal(player.credits, 150);
});

test('economy: loss streak bonus escalates up to cap and bot buy equips weapon', () => {
  assert.equal(calculateRoundReward(true, 3, true), ECONOMY_CONFIG.WIN_REWARD + ECONOMY_CONFIG.OBJECTIVE_WIN_BONUS);
  assert.equal(calculateRoundReward(false, 0), 1900);
  assert.equal(calculateRoundReward(false, 2), 2900);
  assert.equal(calculateRoundReward(false, 10), 3900);

  const bot = {
    personality: 'aggressor',
    credits: 4000,
    armor: 0,
    activeSlot: 'secondary',
    loadout: { primary: null, secondary: createWeaponInstance('kestrel') },
  };
  const bought = selectBotBuy(bot, true, 2);
  assert.ok(bought.length >= 1);
  assert.ok(bot.loadout.primary !== null);
});

test('maps: all 10 maps have clear spawns, valid BLITZ signage, and connected navigation paths', () => {
  const maps = getAllMaps();
  assert.equal(maps.length, 10);

  for (const mapSpec of maps) {
    setActiveMap(mapSpec.id);
    rebuildNavigationForMap(mapSpec);

    for (const team of ['attackers', 'defenders']) {
      for (const sp of TEAM_SPAWNS[team]) {
        const res = resolveEntityCollision(sp.x, sp.y, sp.z, 0.38, 1.75);
        assert.ok(
          Math.hypot(res.x - sp.x, res.z - sp.z) < 0.01,
          `Map ${mapSpec.id} spawn ${team} collided at (${sp.x}, ${sp.z})`,
        );
      }
    }

    const hasBlitzProp =
      (mapSpec.props?.blitzLabels?.length || 0) > 0 ||
      (mapSpec.props?.houses || []).some((h) => h.blitzSign) ||
      (mapSpec.props?.rocks || []).some((r) => r.blitz) ||
      (mapSpec.props?.trees || []).some((t) => t.blitz);
    assert.ok(hasBlitzProp, `Map ${mapSpec.id} missing BLITZ landmarks`);

    const path = findPath({ x: 0, y: 0, z: 18 }, { x: 0, y: 0, z: -18 });
    assert.ok(path.length >= 3, `Map ${mapSpec.id} navigation path broken`);
  }

  setActiveMap('kilnyard');
  rebuildNavigationForMap();
  assert.equal(getFloorHeight(0, 0), 0);
  assert.ok(getFloorHeight(-22.5, 0) >= 2.0);
  const wallHit = raycastMap(0, 1.5, 0, 0, 0, -1, 100);
  assert.ok(wallHit !== null);
  const cover = findCoverWaypoint({ x: -3, y: 0, z: 4 }, { x: 0, y: 0, z: -10 });
  assert.ok(cover !== null || hasLineOfSight(0, 1.5, 0, 0, 1.5, -2) === true);
});

test('rounds: bomb_defusal, team_deathmatch, control_zone, and elimination win conditions', () => {
  const match = createMatchState('attackers');
  assert.equal(match.phase, GAME_PHASES.MAIN_MENU);

  startNewMatch(match, 'attackers', { modeId: 'bomb_defusal', roundDuration: 60, roundsToWin: 3 });
  assert.equal(match.roundNumber, 1);
  assert.equal(match.roundDuration, 60);

  beginBuyPhase(match);
  assert.equal(match.phase, GAME_PHASES.BUY_PHASE);

  beginActiveCombat(match);
  assert.equal(match.phase, GAME_PHASES.ACTIVE_COMBAT);
  assert.equal(match.phaseTimer, 60);

  const midPlant = checkRoundWinCondition({
    modeId: 'bomb_defusal',
    attackersAlive: 0,
    defendersAlive: 2,
    spikePlanted: true,
    spikeDetonated: false,
    spikeDefused: false,
    combatTimeRemaining: 20,
  });
  assert.equal(midPlant, null);

  const tdmWin = checkRoundWinCondition({
    modeId: 'team_deathmatch',
    attackersAlive: 4,
    defendersAlive: 4,
    tdmKills: { attackers: 25, defenders: 19 },
    combatTimeRemaining: 45,
  });
  assert.equal(tdmWin.winner, 'attackers');

  const ctrlWin = checkRoundWinCondition({
    modeId: 'control_zone',
    attackersAlive: 3,
    defendersAlive: 3,
    controlProgress: { attackers: 40, defenders: 100 },
    combatTimeRemaining: 30,
  });
  assert.equal(ctrlWin.winner, 'defenders');

  const elimWin = checkRoundWinCondition({
    modeId: 'elimination',
    attackersAlive: 2,
    defendersAlive: 0,
    combatTimeRemaining: 30,
  });
  assert.equal(elimWin.winner, 'attackers');

  const actors = [
    { team: 'attackers', credits: 800 },
    { team: 'defenders', credits: 800 },
  ];
  resolveRoundOutcome(match, elimWin, actors);
  assert.equal(match.scores.attackers, 1);

  const nextPhase = advanceAfterRoundResults(match);
  assert.equal(nextPhase, GAME_PHASES.BUY_PHASE);
  assert.equal(match.roundNumber, 2);
});

test('profile: shop unlocks, weapon upgrades, and match history updates', () => {
  const profile = createDefaultProfile();
  const startCash = profile.credits;

  const unlockRes = unlockShopItem(profile, 'outfit', 'silver_crest');
  assert.equal(unlockRes.ok, true);
  assert.equal(profile.selectedOutfit, 'silver_crest');
  assert.ok(profile.credits < startCash);

  const upRes = upgradeWeaponTrack(profile, 'arx17', 'barrel');
  assert.equal(upRes.ok, true);
  assert.equal(profile.weaponUpgrades.arx17.barrel, 1);

  const reward = recordMatchResult(profile, {
    mapName: 'Kiln Courtyard',
    modeName: 'Defusal',
    won: true,
    scoreText: '5-2',
    kills: 11,
    assists: 2,
    deaths: 4,
    headshots: 4,
    damageDealt: 1320,
  });
  assert.ok(reward > 0);
  assert.equal(profile.stats.matchesPlayed, 1);
  assert.equal(profile.stats.wins, 1);
  assert.equal(profile.matchHistory.length, 1);
});

test('settings: load/save/reset safely clamps values including graphics, timer, and scoreboard', () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
    },
  };

  saveSettings({
    ...DEFAULT_SETTINGS,
    sensitivity: 99,
    invertY: true,
    masterVolume: -5,
    fov: 140,
    scoreboardDesign: 'broadcast',
    roundTimerSeconds: 120,
  });
  const loaded = loadSettings();
  assert.equal(loaded.sensitivity, 2.5);
  assert.equal(loaded.masterVolume, 0);
  assert.equal(loaded.invertY, true);
  assert.equal(loaded.fov, 95);
  assert.equal(loaded.scoreboardDesign, 'broadcast');
  assert.equal(loaded.roundTimerSeconds, 120);

  const reset = resetSettings();
  assert.equal(reset.sensitivity, DEFAULT_SETTINGS.sensitivity);
  assert.equal(reset.scoreboardDesign, DEFAULT_SETTINGS.scoreboardDesign);
  delete globalThis.window;
});
