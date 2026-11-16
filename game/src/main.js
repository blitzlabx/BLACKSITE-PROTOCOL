import { TacticalRenderer } from './renderer.js';
import { EffectsManager } from './effects.js';
import { ObjectiveManager } from './objectives.js';
import { PlayerController } from './player.js';
import { BotManager } from './bots.js';
import { fireWeapon } from './combat.js';
import { GameEngine, InputHub } from './engine.js';
import { TacticalUI } from './ui.js';
import { purchaseItem } from './economy.js';
import { ARMOR_ITEMS, WEAPON_LIST, createWeaponInstance, getWeaponSpec } from './weapons.js';
import { PLANT_ZONE, getActiveMap, setActiveMap } from './map.js';
import { rebuildNavigationForMap } from './navigation.js';
import { ArmoryPreview3D } from './preview3d.js';
import {
  loadProfile,
  recordMatchResult,
  saveProfile,
  unlockShopItem,
  upgradeWeaponTrack,
} from './profile.js';
import {
  GAME_PHASES,
  advanceAfterRoundResults,
  beginActiveCombat,
  beginBuyPhase,
  beginRoundStart,
  checkRoundWinCondition,
  createMatchState,
  resolveRoundOutcome,
  startNewMatch,
} from './rounds.js';
import { audio } from './audio.js';
import { GAME_MODES, loadSettings, resetSettings, saveSettings } from './settings.js';

const params = new URLSearchParams(window.location.search);

let settings = loadSettings();
if (params.get('map')) settings.selectedMapId = params.get('map');
if (params.get('mode')) settings.selectedModeId = params.get('mode');

setActiveMap(settings.selectedMapId);
rebuildNavigationForMap(getActiveMap());

let profile = loadProfile();

const mountEl = document.getElementById('canvas-mount');
const gfx = new TacticalRenderer(mountEl);
gfx.applySettings(settings);

const previewCanvas = document.getElementById('armory-preview-canvas');
const preview3d = previewCanvas ? new ArmoryPreview3D(previewCanvas) : null;

const effects = new EffectsManager(gfx.scene);
const objective = new ObjectiveManager(gfx.scene);
const player = new PlayerController(gfx.camera);
const bots = new BotManager(gfx.scene);
const input = new InputHub();
const matchState = createMatchState('attackers');

audio.applySettings(settings);
player.applySettings(settings);
player.applyProfile(profile);

let paused = false;
let matchInitialized = false;
let matchRecorded = false;
let plantTickCooldown = 0;

function getAllActors() {
  return [player, ...bots.bots];
}

function switchArenaMap(mapId) {
  const m = setActiveMap(mapId);
  rebuildNavigationForMap(m);
  gfx.buildMap(m, settings);
  objective.reset();
  if (matchState.phase === GAME_PHASES.MAIN_MENU) {
    stageShowcaseBots();
  }
}

function stageShowcaseBots() {
  bots.initMatchBots('attackers');
  bots.prepareRound(1, null);
  const showcaseCoords = [
    [-1.2, 2.4, 0.4],
    [2.6, -2.5, 2.8],
    [-4.2, -1.6, 1.9],
    [-6.5, 1.2, -0.6],
  ];
  for (let i = 0; i < Math.min(4, bots.bots.length); i++) {
    const b = bots.bots[i];
    const [bx, bz, byaw] = showcaseCoords[i];
    b.x = bx;
    b.z = bz;
    b.yaw = byaw;
    b.model.group.position.set(bx, 0, bz);
    b.model.group.rotation.set(0, byaw, 0);
  }
}

function startRoundSetup() {
  objective.reset();
  gfx.setCoreAlertState(false);
  const prevWinner = matchState.lastRoundOutcome ? matchState.lastRoundOutcome.winner : null;
  player.spawnForRound(0);
  bots.prepareRound(matchState.roundNumber, prevWinner);
  beginBuyPhase(matchState);
  ui.setBuyOpen(false, player);

  if (matchState.modeId === 'team_deathmatch') {
    const favSpec = getWeaponSpec(profile.selectedWeapon);
    if (favSpec.slot === 'primary' && !player.loadout.primary) {
      player.loadout.primary = createWeaponInstance(favSpec.id, player.weaponUpgrades);
      player.activeSlot = 'primary';
      player.syncWeaponModel();
    }
    beginActiveCombat(matchState);
  }
}

function handleStartMatch(team = 'attackers') {
  audio.unlock();
  paused = false;
  matchRecorded = false;
  ui.setSettingsOpen(false);
  switchArenaMap(settings.selectedMapId);
  startNewMatch(matchState, team, {
    modeId: settings.selectedModeId,
    mapId: settings.selectedMapId,
    roundDuration: settings.roundTimerSeconds,
    roundsToWin: settings.roundsToWin,
  });
  player.resetMatch(team, profile);
  bots.initMatchBots(team);
  matchInitialized = true;
  startRoundSetup();
  ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
}

function handleTogglePause() {
  if (matchState.phase === GAME_PHASES.MAIN_MENU || matchState.phase === GAME_PHASES.MATCH_OVER) return;
  if (ui.settingsOpen) {
    ui.setSettingsOpen(false);
    ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
    return;
  }
  paused = !paused;
  if (paused) {
    document.exitPointerLock?.();
    input.clear();
  }
  ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
}

function handleBuyItem(itemId) {
  const allowBuy = matchState.phase === GAME_PHASES.BUY_PHASE || matchState.modeId === 'team_deathmatch';
  if (!allowBuy) return;
  const res = purchaseItem(player, itemId);
  if (res.ok) {
    audio.playBuyClick();
    player.syncWeaponModel();
    ui.renderBuyMenu(player);
  }
}

const ui = new TacticalUI(
  {
    onEnterLobby: () => {
      audio.unlock();
      audio.playUiTick();
    },
    onSelectTeam: (t) => {
      matchState.playerTeam = t;
      audio.playUiTick();
    },
    onSelectMap: (mapId) => {
      settings.selectedMapId = mapId;
      saveSettings(settings);
      switchArenaMap(mapId);
      audio.playUiTick();
    },
    onStartMatch: (t) => handleStartMatch(t),
    onSkipBuyPhase: () => {
      if (matchState.phase === GAME_PHASES.BUY_PHASE) {
        beginActiveCombat(matchState);
      }
    },
    onBuyItem: (id) => handleBuyItem(id),
    onToggleMute: () => {
      const muted = audio.toggleMute();
      settings.muted = muted;
      saveSettings(settings);
      return muted;
    },
    onTogglePause: () => handleTogglePause(),
    onChangeSettings: (next) => {
      const mapChanged = next.selectedMapId !== settings.selectedMapId;
      settings = { ...next };
      saveSettings(settings);
      audio.applySettings(settings);
      player.applySettings(settings);
      gfx.applySettings(settings);
      if (mapChanged) switchArenaMap(settings.selectedMapId);
    },
    onResetSettings: () => {
      settings = resetSettings();
      audio.applySettings(settings);
      player.applySettings(settings);
      gfx.applySettings(settings);
      switchArenaMap(settings.selectedMapId);
      return settings;
    },
    onEquipProfileItem: (kind, id) => {
      if (kind === 'character') profile.selectedCharacter = id;
      else if (kind === 'weaponPreview') profile.selectedWeapon = profile.unlockedWeapons.includes(id) ? id : profile.selectedWeapon;
      else if (kind === 'finishPreview') profile.selectedFinish = profile.unlockedFinishes.includes(id) ? id : profile.selectedFinish;
      else if (kind === 'outfitPreview') profile.selectedOutfit = profile.unlockedOutfits.includes(id) ? id : profile.selectedOutfit;
      else if (kind === 'badgePreview') profile.selectedBadge = profile.unlockedBadges.includes(id) ? id : profile.selectedBadge;
      saveProfile(profile);
      player.applyProfile(profile);
      ui.setProfile(profile);
      audio.playUiTick();
    },
    onPurchaseOrEquip: (category, itemId) => {
      const res = unlockShopItem(profile, category, itemId);
      if (res.ok) {
        audio.playBuyClick();
        player.applyProfile(profile);
        ui.setProfile(profile);
      }
    },
    onUpgradeWeapon: (weaponId, trackId) => {
      const res = upgradeWeaponTrack(profile, weaponId, trackId);
      if (res.ok) {
        audio.playBuyClick();
        player.applyProfile(profile);
        ui.setProfile(profile);
      }
    },
    onTouchSwap: () => {
      if (!player.loadout.primary) return;
      player.switchSlot(player.activeSlot === 'primary' ? 'secondary' : 'primary');
    },
    onReturnMenu: () => {
      paused = false;
      ui.setSettingsOpen(false);
      matchState.phase = GAME_PHASES.MAIN_MENU;
      document.exitPointerLock?.();
      ui.setBuyOpen(false);
      stageShowcaseBots();
      ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
      ui.refreshLobby();
    },
  },
  input,
  settings,
  profile,
  preview3d,
);

input.bindCanvas(gfx.renderer.domElement, () => {
  audio.unlock();
  if (
    !input.isTouchMode &&
    matchState.phase !== GAME_PHASES.MAIN_MENU &&
    matchState.phase !== GAME_PHASES.MATCH_OVER &&
    !paused &&
    !ui.buyOpen &&
    !ui.settingsOpen
  ) {
    gfx.renderer.domElement.requestPointerLock?.();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab' && matchState.phase !== GAME_PHASES.MAIN_MENU && matchState.phase !== GAME_PHASES.MATCH_OVER && !paused && !ui.buyOpen && !ui.settingsOpen) {
    e.preventDefault();
    if (!ui.scoreboardOpen) {
      ui.setScoreboardOpen(true, getAllActors(), matchState);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Tab' && ui.scoreboardOpen) {
    ui.setScoreboardOpen(false, getAllActors(), matchState);
  }
});

function handleGlobalKeys() {
  if (ui.settingsOpen) {
    if (input.consumeJustPressed('Escape')) {
      ui.setSettingsOpen(false);
      ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
    }
    return;
  }

  if (matchState.phase === GAME_PHASES.MAIN_MENU) {
    if (ui.activeNav === 'home' && input.consumeJustPressed('Enter')) {
      handleStartMatch(ui.selectedTeam);
    }
    return;
  }

  if (input.consumeJustPressed('KeyM')) {
    const muted = audio.toggleMute();
    settings.muted = muted;
    saveSettings(settings);
    ui.applySettings(settings);
  }

  if (input.consumeJustPressed('Escape') || input.consumeJustPressed('KeyP')) {
    if (ui.buyOpen) {
      ui.setBuyOpen(false);
    } else {
      handleTogglePause();
    }
  }

  if (paused || matchState.phase === GAME_PHASES.MATCH_OVER) return;

  if (input.consumeJustPressed('KeyB')) {
    if (matchState.phase === GAME_PHASES.BUY_PHASE || matchState.modeId === 'team_deathmatch') {
      const next = !ui.buyOpen;
      if (next) document.exitPointerLock?.();
      ui.setBuyOpen(next, player);
    }
  }

  if (ui.buyOpen) {
    const buyList = [...WEAPON_LIST, ARMOR_ITEMS.kevlar, ARMOR_ITEMS.heavy];
    for (let i = 0; i < buyList.length; i++) {
      if (input.consumeJustPressed(`Digit${i + 1}`)) {
        handleBuyItem(buyList[i].id);
      }
    }
    if (input.consumeJustPressed('Space')) {
      ui.setBuyOpen(false);
      if (matchState.phase === GAME_PHASES.BUY_PHASE) beginActiveCombat(matchState);
    }
    return;
  }

  if (input.consumeJustPressed('Digit1')) player.switchSlot('primary');
  if (input.consumeJustPressed('Digit2')) player.switchSlot('secondary');
  if (input.consumeJustPressed('KeyR')) player.startReload();
  if (input.consumeJustPressed('KeyI')) player.triggerInspect();

  const wantsScoreboard = input.held.has('Tab');
  if (wantsScoreboard !== ui.scoreboardOpen) {
    ui.setScoreboardOpen(wantsScoreboard, getAllActors(), matchState);
  }
}

function updateMainMenuCamera(elapsed) {
  const angle = elapsed * 0.18;
  gfx.camera.fov = 64;
  gfx.camera.updateProjectionMatrix();
  gfx.camera.position.set(
    Math.cos(angle) * 14.0,
    6.4 + Math.sin(elapsed * 0.35) * 0.6,
    Math.sin(angle) * 14.0,
  );
  gfx.camera.lookAt(0, 1.4, 0);
  player.viewmodelRoot.visible = false;
  player.plantRig.group.visible = false;
}

const engine = new GameEngine(
  gfx,
  (dt, simDt, elapsed) => {
    handleGlobalKeys();
    gfx.updateAnimatedProps(elapsed);

    if (matchState.phase === GAME_PHASES.MAIN_MENU) {
      updateMainMenuCamera(elapsed);
      effects.update(dt);
      input.endFrame();
      return;
    }

    if (matchState.phase === GAME_PHASES.MATCH_OVER) {
      if (!matchRecorded) {
        matchRecorded = true;
        const won = matchState.matchWinner === player.team;
        const modeObj = GAME_MODES.find((m) => m.id === matchState.modeId);
        const scoreText =
          matchState.modeId === 'team_deathmatch'
            ? `${matchState.tdmKills.attackers}-${matchState.tdmKills.defenders}`
            : `${matchState.scores.attackers}-${matchState.scores.defenders}`;
        recordMatchResult(profile, {
          mapName: getActiveMap().name,
          modeName: modeObj?.short || 'Defusal',
          won,
          scoreText,
          kills: player.kills,
          assists: player.assists || 0,
          deaths: player.deaths,
          headshots: player.headshots || 0,
          damageDealt: player.damageDealt || 0,
        });
        ui.setProfile(profile);
      }
      ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
      input.endFrame();
      return;
    }

    if (paused || ui.settingsOpen) {
      input.endFrame();
      return;
    }

    for (let i = matchState.killFeed.length - 1; i >= 0; i--) {
      matchState.killFeed[i].ttl -= dt;
      if (matchState.killFeed[i].ttl <= 0) {
        matchState.killFeed.splice(i, 1);
      }
    }

    const actors = getAllActors();
    const canMove =
      matchState.phase === GAME_PHASES.ACTIVE_COMBAT ||
      matchState.phase === GAME_PHASES.ROUND_RESULTS;
    const canShoot = matchState.phase === GAME_PHASES.ACTIVE_COMBAT && !ui.buyOpen;

    const fastForwardSteps =
      !player.alive &&
      matchState.modeId !== 'team_deathmatch' &&
      matchState.phase === GAME_PHASES.ACTIVE_COMBAT &&
      input.held.has('KeyF')
        ? 5
        : 1;

    for (let ff = 0; ff < fastForwardSteps; ff++) {
      if (matchState.phase !== GAME_PHASES.ACTIVE_COMBAT && ff > 0) break;

      if (matchState.phase === GAME_PHASES.BUY_PHASE) {
        matchState.phaseTimer -= simDt;
        if (matchState.phaseTimer <= 0) {
          ui.setBuyOpen(false);
          beginRoundStart(matchState);
        }
      } else if (matchState.phase === GAME_PHASES.ROUND_START) {
        matchState.phaseTimer -= simDt;
        if (matchState.phaseTimer <= 0) {
          beginActiveCombat(matchState);
        }
      } else if (matchState.phase === GAME_PHASES.ACTIVE_COMBAT) {
        if (!objective.planted) {
          matchState.phaseTimer = Math.max(0, matchState.phaseTimer - simDt);
        }
        if (matchState.modeId === 'bomb_defusal') {
          objective.update(simDt, elapsed);
          gfx.setCoreAlertState(objective.planted && !objective.defused);
        } else if (matchState.modeId === 'control_zone') {
          const insideAtk = actors.filter(
            (a) => a.alive && a.team === 'attackers' && Math.hypot(a.x - PLANT_ZONE.x, a.z - PLANT_ZONE.z) <= PLANT_ZONE.radius + 1.4,
          ).length;
          const insideDef = actors.filter(
            (a) => a.alive && a.team === 'defenders' && Math.hypot(a.x - PLANT_ZONE.x, a.z - PLANT_ZONE.z) <= PLANT_ZONE.radius + 1.4,
          ).length;
          if (insideAtk > insideDef) {
            matchState.controlProgress.owner = 'attackers';
            matchState.controlProgress.attackers = Math.min(100, matchState.controlProgress.attackers + simDt * 8.0);
          } else if (insideDef > insideAtk) {
            matchState.controlProgress.owner = 'defenders';
            matchState.controlProgress.defenders = Math.min(100, matchState.controlProgress.defenders + simDt * 8.0);
          } else {
            matchState.controlProgress.owner = null;
          }
        }
      } else if (matchState.phase === GAME_PHASES.ROUND_RESULTS) {
        matchState.phaseTimer -= dt;
        if (matchState.phaseTimer <= 0) {
          const next = advanceAfterRoundResults(matchState);
          if (next === GAME_PHASES.BUY_PHASE) {
            startRoundSetup();
          }
        }
      }

      if (ff === 0) {
        const { dx, dy } = input.consumeLookDelta();
        if (!ui.buyOpen && matchInitialized) {
          player.addLookDelta(dx, dy);
        }
      }

      if (!player.alive && matchState.modeId === 'team_deathmatch' && matchState.phase === GAME_PHASES.ACTIVE_COMBAT) {
        player.respawnTimer -= simDt;
        if (player.respawnTimer <= 0) {
          player.spawnForRound(Math.floor(Math.random() * 5));
        }
      }

      const { spec } = player.getActiveWeapon();
      player.scoped = canShoot && player.alive && (input.mouseRight || input.touchAds) && !player.reloading;
      if (ff === 0) {
        player.update(simDt || dt * 0.2, input, canMove && !ui.buyOpen);
      }

      if (ff === 0 && canShoot && player.alive && matchState.modeId === 'bomb_defusal') {
        const wantsInteract = input.held.has('KeyE') || input.touchInteract;
        const objEvent = objective.updateInteraction(simDt, player, wantsInteract);
        if (objEvent === 'planting') {
          player.setInteractingObjective('planting', objective.plantProgress);
          plantTickCooldown -= simDt;
          if (plantTickCooldown <= 0) {
            plantTickCooldown = 0.34;
            audio.playPlantTick(objective.plantProgress);
          }
        } else if (objEvent === 'defusing') {
          player.setInteractingObjective('defusing', objective.defuseProgress);
          plantTickCooldown -= simDt;
          if (plantTickCooldown <= 0) {
            plantTickCooldown = 0.34;
            audio.playPlantTick(objective.defuseProgress);
          }
        } else {
          player.setInteractingObjective(null, 0);
          plantTickCooldown = 0;
        }

        if (objEvent === 'planted' || objEvent === 'defused') {
          player.credits = Math.min(16000, player.credits + 300);
          gfx.setCoreAlertState(objective.planted && !objective.defused);
        }
      } else if (ff === 0) {
        player.setInteractingObjective(null, 0);
      }

      if (ff === 0 && canShoot && player.alive && !player.interactingMode) {
        const fireDown = input.mouseDownLeft || input.touchFire;
        const fireOnce = input.mouseJustPressedLeft || input.touchJustPressedFire;
        const wantsFire = spec.automatic ? fireDown : fireOnce;
        if (wantsFire && player.fireCooldown <= 0 && !player.reloading) {
          const inst = player.loadout[player.activeSlot];
          if (inst.ammo <= 0) {
            audio.playDryClick();
            player.startReload();
          } else {
            const { origin, dir, muzzle } = player.getAimOriginAndDir();
            const result = fireWeapon({
              shooter: player,
              origin,
              aimDir: dir,
              muzzlePos: muzzle,
              actors,
              effects,
              matchState,
              playerRef: player,
              onActorKilled: () => {
                engine.triggerHitstop(0.045);
              },
              onPlayerDamaged: (dmg, atk) => player.onDamaged(dmg, atk),
            });
            if (result.fired) {
              player.onFired(spec);
              const ej = player.getEjectState();
              effects.spawnShellCasing(ej.x, ej.y, ej.z, ej.rx, ej.rz, ej.floorY);
              if (result.anyHit) {
                player.hitmarkerTimer = 0.14;
                player.hitmarkerHeadshot = result.anyHeadshot;
              }
            }
          }
        }
      }

      bots.update(
        simDt,
        matchState.phase === GAME_PHASES.ACTIVE_COMBAT,
        actors,
        objective,
        effects,
        matchState,
        player,
        (victim, killer) => {
          if (killer.isPlayer) engine.triggerHitstop(0.045);
          if (victim.isPlayer) player.onDamaged(100, killer);
        },
        (dmg, atk) => player.onDamaged(dmg, atk),
      );

      if (matchState.phase === GAME_PHASES.ACTIVE_COMBAT) {
        const attackersAlive = actors.filter((a) => a.team === 'attackers' && a.alive).length;
        const defendersAlive = actors.filter((a) => a.team === 'defenders' && a.alive).length;
        const outcome = checkRoundWinCondition({
          modeId: matchState.modeId,
          attackersAlive,
          defendersAlive,
          spikePlanted: objective.planted,
          spikeDetonated: objective.detonated,
          spikeDefused: objective.defused,
          combatTimeRemaining: matchState.phaseTimer,
          tdmKills: matchState.tdmKills,
          controlProgress: matchState.controlProgress,
        });
        if (outcome) {
          resolveRoundOutcome(matchState, outcome, actors);
          audio.playRoundHorn(outcome.winner === player.team);
          ui.setBuyOpen(false);
        }
      }
    }

    effects.update(dt);
    ui.syncScreenState({ matchState, paused, player, actors, objective });
    input.endFrame();
  },
  () => {
    if (matchState.phase !== GAME_PHASES.MAIN_MENU) {
      gfx.render();
    }
  },
);

if (params.get('autostart') === '1') {
  ui.dismissSplash(true);
  handleStartMatch('attackers');
  if (params.get('combat') === '1') {
    beginActiveCombat(matchState);
  }
} else {
  if (params.get('skipSplash') === '1') {
    ui.dismissSplash(false);
  }
  stageShowcaseBots();
  ui.syncScreenState({ matchState, paused, player, actors: getAllActors(), objective });
}

window.__BLACKSITE__ = {
  getState: () => ({
    phase: matchState.phase,
    modeId: matchState.modeId,
    mapId: getActiveMap().id,
    round: matchState.roundNumber,
    scores: { ...matchState.scores },
    tdmKills: { ...matchState.tdmKills },
    isTouchMode: input.isTouchMode,
    settings: { ...settings },
    profileCredits: profile.credits,
    player: {
      hp: player.hp,
      armor: player.armor,
      credits: player.credits,
      weapon: player.getActiveWeapon().spec.id,
      ammo: player.getActiveWeapon().instance.ammo,
      reloading: player.reloading,
      x: Number(player.x.toFixed(2)),
      y: Number(player.y.toFixed(2)),
      z: Number(player.z.toFixed(2)),
    },
    planted: objective.planted,
    botsAlive: bots.bots.filter((b) => b.alive).length,
  }),
  selectMap: (id) => {
    settings.selectedMapId = id;
    saveSettings(settings);
    switchArenaMap(id);
    ui.refreshLobby();
  },
  skipBuyPhase: () => {
    ui.setBuyOpen(false);
    if (matchState.phase === GAME_PHASES.BUY_PHASE) beginActiveCombat(matchState);
  },
  openBuy: () => {
    if (matchState.phase === GAME_PHASES.BUY_PHASE || matchState.modeId === 'team_deathmatch') ui.setBuyOpen(true, player);
  },
  openSettings: () => ui.setSettingsOpen(true),
};

engine.start();
