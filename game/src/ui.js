import {
  ARMOR_ITEMS,
  UPGRADE_TRACKS,
  WEAPON_FINISHES,
  WEAPON_LIST,
  WEAPONS,
  getUpgradedWeaponSpec,
  getWeaponSpec,
} from './weapons.js';
import {
  BADGES,
  CHARACTERS,
  OUTFITS,
  getBadgeById,
  getCharacterById,
  getFinishById,
  getOutfitById,
} from './profile.js';
import {
  GAME_MODES,
  SCOREBOARD_DESIGNS,
  TIMER_PRESETS,
} from './settings.js';
import {
  MAP_BOUNDS,
  PLANT_ZONE,
  SECTOR_09_COLLIDERS,
  getActiveMap,
  getAllMaps,
  getZoneAt,
} from './map.js';
import { GAME_PHASES, ROUND_TIMINGS } from './rounds.js';
import { canPurchaseItem } from './economy.js';

function getItemSilhouetteSvg(id, className = 'buy-svg') {
  const paths = {
    kestrel: '<path d="M12 10h28v5H24l-3 10h-6l2-10h-5z" fill="#cbd5e1"/><rect x="36" y="10" width="8" height="3" fill="#10b981"/>',
    mallet44: '<path d="M10 11h34v5H24l-4 10h-6l3-10h-7z" fill="#e2e8f0"/><rect x="24" y="8" width="12" height="5" fill="#10b981"/>',
    vektor9: '<path d="M8 10h38v6H32v8h-6v-8H16l-3 8H9l2-8H8z" fill="#cbd5e1"/><rect x="38" y="11" width="12" height="3" fill="#10b981"/>',
    hawk12: '<path d="M6 12h46v5H26l-6 7h-8l4-7H6z" fill="#cbd5e1"/><rect x="32" y="11" width="18" height="2.5" fill="#f59e0b"/>',
    arx17: '<path d="M6 11h48v5H31l-2 9h-5l1-9H16l-4 7H7l3-7H6z" fill="#e2e8f0"/><rect x="20" y="7" width="10" height="3" fill="#10b981"/>',
    lancer4: '<path d="M6 11h48v5H31l-2 9h-5l1-9H16l-4 7H7l3-7H6z" fill="#e2e8f0"/><rect x="19" y="6" width="14" height="4" fill="#34d399"/>',
    m4k: '<path d="M5 11h50v5H32l-2 9h-5l1-9H15l-4 7H6l3-7H5z" fill="#cbd5e1"/><rect x="19" y="6" width="14" height="4" fill="#10b981"/>',
    longshot: '<path d="M3 12h54v4H32l-2 8h-5l1-8H14l-5 7H4l3-7H3z" fill="#e2e8f0"/><rect x="16" y="6" width="18" height="4" fill="#34d399"/>',
    kevlar: '<path d="M22 5h16l5 6-3 13H20l-3-13z" fill="#064e3b" stroke="#34d399" stroke-width="2.2"/>',
    heavy: '<path d="M20 4h20l6 7-4 14H18l-4-14z" fill="#065f46" stroke="#6ee7b7" stroke-width="2.4"/>',
  };
  return `<svg class="${className}" viewBox="0 0 60 28" aria-hidden="true">${paths[id] || paths.arx17}</svg>`;
}

function getOperatorPortraitSvg(char) {
  const skin = hexCss(char.headColor || 0xd6b49c);
  const visor = hexCss(char.visorTint || 0x10b981);
  const heavy = char.helmetStyle === 'heavy';
  return `
    <svg viewBox="0 0 48 44" width="44" height="40" aria-hidden="true">
      <path d="M8 44c1-10 7-14 16-14s15 4 16 14z" fill="#1e293b" stroke="#64748b" stroke-width="1.2"/>
      <path d="M16 30h16l2 14H14z" fill="#334155"/>
      <rect x="20" y="25" width="8" height="6" rx="2" fill="${skin}"/>
      <rect x="15" y="9" width="18" height="17" rx="6" fill="${heavy ? '#334155' : skin}"/>
      <path d="M13 13c0-6 5-10 11-10s11 4 11 10v3H13z" fill="#1e293b" stroke="#94a3b8" stroke-width="1"/>
      <rect x="16" y="15" width="16" height="4" rx="1.5" fill="${visor}" opacity="0.92"/>
      <rect x="18" y="34" width="12" height="3" rx="1" fill="${visor}"/>
    </svg>
  `;
}

function hexCss(num) {
  return '#' + (num & 0xffffff).toString(16).padStart(6, '0');
}

function renderMapBlueprintSvg(mapSpec) {
  const b = mapSpec.bounds;
  const w = b.maxX - b.minX;
  const h = b.maxZ - b.minZ;
  const toX = (x) => ((x - b.minX) / w) * 160;
  const toY = (z) => ((z - b.minZ) / h) * 110;

  const wallColor = hexCss(mapSpec.palette.wallColor || 0x334155);
  const trimColor = hexCss(mapSpec.palette.trimColor || 0x1e293b);
  const roofColor = hexCss(mapSpec.palette.roofColor || 0x64748b);
  const rockColor = hexCss(mapSpec.palette.rockColor || 0x94a3b8);
  const foliageColor = hexCss(mapSpec.palette.foliageColor || 0x10b981);
  const accent = hexCss(mapSpec.palette.accentColor || 0x10b981);
  const bg = hexCss(mapSpec.palette.floorColor || 0xe2e8f0);

  const decks = (mapSpec.elevatedDecks || [])
    .filter((d) => d.type === 'deck')
    .map((d) => {
      const rx = toX(d.xMin).toFixed(1);
      const ry = toY(d.zMin).toFixed(1);
      const rw = Math.max(3, toX(d.xMax) - toX(d.xMin)).toFixed(1);
      const rh = Math.max(3, toY(d.zMax) - toY(d.zMin)).toFixed(1);
      return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${trimColor}" opacity="0.28" rx="1" />`;
    })
    .join('');

  const rects = mapSpec.colliders
    .filter((c) => c.tag !== 'perimeter')
    .map((c) => {
      const rx = toX(c.minX).toFixed(1);
      const ry = toY(c.minZ).toFixed(1);
      const rw = Math.max(2.2, toX(c.maxX) - toX(c.minX)).toFixed(1);
      const rh = Math.max(2.2, toY(c.maxZ) - toY(c.minZ)).toFixed(1);
      const fill = c.material === 'rock' ? rockColor : c.tag === 'cover' || c.tag === 'low_cover' ? trimColor : wallColor;
      return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="#0f172a" stroke-opacity="0.22" stroke-width="0.5" rx="1" />`;
    })
    .join('');

  const houses = (mapSpec.props?.houses || [])
    .map((hs) => {
      const rx = toX(hs.x - hs.w * 0.5).toFixed(1);
      const ry = toY(hs.z - hs.d * 0.5).toFixed(1);
      const rw = Math.max(4, (hs.w / w) * 160).toFixed(1);
      const rh = Math.max(4, (hs.d / h) * 110).toFixed(1);
      return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${roofColor}" opacity="0.85" rx="1" />`;
    })
    .join('');

  const rocks = (mapSpec.props?.rocks || [])
    .map((r) => `<circle cx="${toX(r.x).toFixed(1)}" cy="${toY(r.z).toFixed(1)}" r="${Math.max(2, (r.s || 1) * 2.2).toFixed(1)}" fill="${rockColor}" />`)
    .join('');

  const trees = (mapSpec.props?.trees || [])
    .map((t) => `<circle cx="${toX(t.x).toFixed(1)}" cy="${toY(t.z).toFixed(1)}" r="${Math.max(2.4, (t.s || 1) * 2.8).toFixed(1)}" fill="${foliageColor}" opacity="0.82" />`)
    .join('');

  const pz = mapSpec.plantZone;
  return `
    <svg viewBox="0 0 160 110" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="0" y="0" width="160" height="110" fill="${bg}" opacity="0.55" />
      ${decks}
      ${houses}
      ${rects}
      ${rocks}
      ${trees}
      <circle cx="${toX(pz.x).toFixed(1)}" cy="${toY(pz.z).toFixed(1)}" r="${((pz.radius / w) * 160).toFixed(1)}" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-width="2" />
      <circle cx="${toX(0).toFixed(1)}" cy="${toY(20).toFixed(1)}" r="3.2" fill="#10b981" />
      <circle cx="${toX(0).toFixed(1)}" cy="${toY(-20).toFixed(1)}" r="3.2" fill="#f59e0b" />
    </svg>
  `;
}

function generateGrainDataUrl() {
  try {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  } catch {
    return '';
  }
}

export class TacticalUI {
  constructor(callbacks, inputHub, initialSettings, initialProfile, preview3d = null) {
    this.callbacks = callbacks;
    this.input = inputHub;
    this.settings = { ...initialSettings };
    this.profile = initialProfile;
    this.preview3d = preview3d;

    this.elSplash = document.getElementById('screen-splash');
    this.elLobby = document.getElementById('screen-lobby');
    this.elHud = document.getElementById('hud-overlay');
    this.elBuy = document.getElementById('modal-buy');
    this.elResults = document.getElementById('modal-results');
    this.elScoreboard = document.getElementById('modal-scoreboard');
    this.elPause = document.getElementById('modal-pause');
    this.elSettings = document.getElementById('modal-settings');
    this.elMatchOver = document.getElementById('modal-match-over');
    this.elMobileControls = document.getElementById('mobile-controls');

    this.elPreviewBox = document.getElementById('preview-viewport-box');
    this.elSplashBgSlot = document.getElementById('splash-bg-slot');
    this.elHomeBgSlot = document.getElementById('home-bg-slot');
    this.elArmoryPreviewSlot = document.getElementById('armory-preview-slot');
    this.elPreviewOverlayControls = document.getElementById('preview-overlay-controls');
    this.elPreviewDragHint = document.getElementById('preview-drag-hint');

    const grainEl = document.getElementById('film-grain');
    const grainUrl = generateGrainDataUrl();
    if (grainEl && grainUrl) grainEl.style.backgroundImage = `url(${grainUrl})`;

    this.elAtkScore = document.getElementById('hud-score-atk');
    this.elDefScore = document.getElementById('hud-score-def');
    this.elRoundNum = document.getElementById('hud-round-num');
    this.elTimer = document.getElementById('hud-timer');
    this.elPhaseBanner = document.getElementById('hud-phase-banner');
    this.elObjBeacon = document.getElementById('hud-obj-beacon');
    this.elMinimapWrap = document.getElementById('minimap-wrap');
    this.elZoneName = document.getElementById('hud-zone-name');
    this.elHp = document.getElementById('hud-hp');
    this.elArmor = document.getElementById('hud-armor');
    this.elHpBar = document.getElementById('hud-hp-bar');
    this.elWeaponName = document.getElementById('hud-weapon-name');
    this.elAmmo = document.getElementById('hud-ammo');
    this.elReserve = document.getElementById('hud-reserve');
    this.elCredits = document.getElementById('hud-credits');
    this.elSlot1 = document.getElementById('slot-primary');
    this.elSlot2 = document.getElementById('slot-secondary');
    this.elKillFeed = document.getElementById('hud-kill-feed');
    this.elCrosshair = document.getElementById('crosshair');
    this.elHitmarker = document.getElementById('hitmarker');
    this.elScope = document.getElementById('sniper-scope');
    this.elDamageVignette = document.getElementById('damage-vignette');
    this.elDamageArc = document.getElementById('damage-arc');
    this.elInteractPrompt = document.getElementById('interact-prompt');
    this.elInteractFill = document.getElementById('interact-fill');
    this.elInteractLabel = document.getElementById('interact-label');
    this.elBuyHint = document.getElementById('buy-hint');
    this.elKiaBanner = document.getElementById('kia-banner');
    this.elReloadLabel = document.getElementById('reload-label');
    this.elAliveAtk = document.getElementById('alive-atk');
    this.elAliveDef = document.getElementById('alive-def');

    this.elTouchBuy = document.getElementById('touch-buy');
    this.elTouchAds = document.getElementById('touch-ads');
    this.elTouchInteract = document.getElementById('touch-interact');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.buyGrid = document.getElementById('buy-grid');
    this.buyCredits = document.getElementById('buy-credits');
    this.resultsTitle = document.getElementById('results-title');
    this.resultsReason = document.getElementById('results-reason');
    this.resultsEconomy = document.getElementById('results-economy');
    this.resultsTable = document.getElementById('results-table');
    this.scoreboardTable = document.getElementById('scoreboard-table');
    this.matchOverTable = document.getElementById('match-over-table');

    this.matchOverTitle = document.getElementById('match-over-title');
    this.matchOverScore = document.getElementById('match-over-score');
    this.matchOverStats = document.getElementById('match-over-stats');

    this.inSplash = true;
    this.activeNav = 'home';
    this.activeArmoryTab = 'characters';
    this.activeShopFilter = 'all';
    this.homePreviewMode = 'operator';
    this.previewMode = 'operator';
    this.buyOpen = false;
    this.scoreboardOpen = false;
    this.settingsOpen = false;
    this.selectedTeam = 'attackers';
    this._lastKillFeedKey = '';
    this._lastScoreboardKey = '';

    this._bindButtons();
    this._bindLobbyNavigation();
    this._bindMobileControls();
    this._startSplashLoader();
    this.applySettings(this.settings);
    this.refreshLobby();
  }

  _startSplashLoader() {
    const fill = document.getElementById('splash-progress-fill');
    const txt = document.getElementById('splash-progress-text');
    if (!fill) return;
    let pct = 18;
    fill.style.width = `${pct}%`;
    const step = () => {
      pct = Math.min(100, pct + 24);
      fill.style.width = `${pct}%`;
      if (pct >= 100) {
        if (txt) txt.textContent = 'Assets Loaded · Ready to Deploy';
      } else {
        setTimeout(step, 140);
      }
    };
    setTimeout(step, 120);
  }

  dismissSplash(immediate = false) {
    if (!this.inSplash && this.elSplash?.classList.contains('hidden')) return;
    this.inSplash = false;
    this.elSplash?.classList.add('hidden');
    if (!immediate) {
      this.elLobby?.classList.remove('hidden');
      document.body.dataset.state = 'title';
      this.refreshLobby();
    }
  }

  setProfile(nextProfile) {
    this.profile = nextProfile;
    this.refreshLobby();
  }

  _bindButtons() {
    document.querySelectorAll('[data-team-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedTeam = btn.dataset.teamPick;
        document.querySelectorAll('[data-team-pick]').forEach((b) => {
          b.classList.toggle('active', b.dataset.teamPick === this.selectedTeam);
        });
        this.callbacks.onSelectTeam?.(this.selectedTeam);
      });
    });

    document.getElementById('btn-deploy')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onStartMatch?.(this.selectedTeam);
    });
    document.getElementById('btn-maps-play')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onStartMatch?.(this.selectedTeam);
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.setSettingsOpen(true);
    });
    document.getElementById('btn-settings-close')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.setSettingsOpen(false);
    });
    document.getElementById('btn-settings-reset')?.addEventListener('click', () => this._handleResetSettings());
    document.getElementById('btn-lobby-settings-reset')?.addEventListener('click', () => this._handleResetSettings());

    document.getElementById('btn-ready-now')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.setBuyOpen(false);
      this.callbacks.onSkipBuyPhase?.();
    });
    document.getElementById('btn-buy-close')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.setBuyOpen(false);
    });

    document.getElementById('btn-mute')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      const muted = this.callbacks.onToggleMute?.();
      this.settings.muted = muted;
      this.applySettings(this.settings);
    });
    document.getElementById('btn-pause')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onTogglePause?.();
    });
    document.getElementById('btn-resume')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onTogglePause?.();
    });
    document.getElementById('btn-restart-match')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onStartMatch?.(this.selectedTeam);
    });
    document.getElementById('btn-return-menu')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onReturnMenu?.();
    });
    document.getElementById('btn-play-again')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onStartMatch?.(this.selectedTeam);
    });
    document.getElementById('btn-matchover-lobby')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onReturnMenu?.();
    });

    document.getElementById('btn-splash-start')?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.callbacks.onEnterLobby?.();
      this.dismissSplash(false);
    });
    window.addEventListener('keydown', (e) => {
      if (this.inSplash && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        this.callbacks.onEnterLobby?.();
        this.dismissSplash(false);
      }
    });

    document.getElementById('btn-home-pv-char')?.addEventListener('click', () => {
      this.homePreviewMode = 'operator';
      this._syncPreviewSubject();
    });
    document.getElementById('btn-home-pv-wpn')?.addEventListener('click', () => {
      this.homePreviewMode = 'weapon';
      this._syncPreviewSubject();
    });

    document.getElementById('btn-pv-operator')?.addEventListener('click', () => {
      this.previewMode = 'operator';
      this._syncPreviewSubject();
    });
    document.getElementById('btn-pv-weapon')?.addEventListener('click', () => {
      this.previewMode = 'weapon';
      this._syncPreviewSubject();
    });
    document.getElementById('btn-pv-reset')?.addEventListener('click', () => {
      this.preview3d?.resetView();
      document.getElementById('btn-pv-autorotate')?.classList.add('active');
    });
    document.getElementById('btn-pv-autorotate')?.addEventListener('click', (e) => {
      if (!this.preview3d) return;
      this.preview3d.autoRotate = !this.preview3d.autoRotate;
      e.currentTarget.classList.toggle('active', this.preview3d.autoRotate);
    });
  }

  _bindLobbyNavigation() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => this.switchLobbyView(btn.dataset.nav));
    });
    document.querySelectorAll('[data-jump-nav]').forEach((btn) => {
      btn.addEventListener('click', () => this.switchLobbyView(btn.dataset.jumpNav));
    });

    document.querySelectorAll('[data-armory-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeArmoryTab = btn.dataset.armoryTab;
        if (this.activeArmoryTab === 'weapons' || this.activeArmoryTab === 'upgrades') {
          this.previewMode = 'weapon';
        } else {
          this.previewMode = 'operator';
        }
        document.querySelectorAll('[data-armory-tab]').forEach((b) =>
          b.classList.toggle('active', b.dataset.armoryTab === this.activeArmoryTab),
        );
        this.renderArmory();
        this._syncPreviewSubject();
      });
    });

    document.querySelectorAll('[data-shop-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeShopFilter = btn.dataset.shopFilter;
        document.querySelectorAll('[data-shop-filter]').forEach((b) =>
          b.classList.toggle('active', b.dataset.shopFilter === this.activeShopFilter),
        );
        this.renderShop();
      });
    });
  }

  switchLobbyView(viewId) {
    this.activeNav = viewId;
    document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === viewId));
    document.querySelectorAll('.view-pane').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== viewId));
    this.refreshLobby();
  }

  refreshLobby() {
    const char = getCharacterById(this.profile.selectedCharacter);
    const outfit = getOutfitById(this.profile.selectedOutfit);
    const badge = getBadgeById(this.profile.selectedBadge);
    const weapon = getWeaponSpec(this.profile.selectedWeapon);

    const hdrCredits = document.getElementById('hdr-credits');
    if (hdrCredits) hdrCredits.textContent = `$${this.profile.credits.toLocaleString()}`;
    const hdrChar = document.getElementById('hdr-char-name');
    if (hdrChar) hdrChar.textContent = char.name;
    const hdrBadge = document.getElementById('hdr-badge-dot');
    if (hdrBadge) {
      hdrBadge.textContent = badge.short;
      hdrBadge.style.background = badge.color;
      hdrBadge.title = badge.name;
    }

    const inSplash = this.inSplash && !this.elSplash?.classList.contains('hidden');
    const inLobbyHome = !this.inSplash && !this.elLobby.classList.contains('hidden') && this.activeNav === 'home';
    const inLobbyArmory = !this.inSplash && !this.elLobby.classList.contains('hidden') && this.activeNav === 'armory';
    const shouldRenderPreview = inSplash || inLobbyHome || inLobbyArmory;

    if (this.elPreviewBox) {
      if (inSplash && this.elSplashBgSlot) {
        this.elSplashBgSlot.appendChild(this.elPreviewBox);
      } else if (inLobbyHome && this.elHomeBgSlot) {
        this.elHomeBgSlot.appendChild(this.elPreviewBox);
      } else if (inLobbyArmory && this.elArmoryPreviewSlot) {
        this.elArmoryPreviewSlot.appendChild(this.elPreviewBox);
      }
    }

    this.elPreviewOverlayControls?.classList.toggle('hidden', !inLobbyArmory);
    this.elPreviewDragHint?.classList.toggle('hidden', !inLobbyArmory);

    if (this.preview3d) {
      this.preview3d.setActive(shouldRenderPreview);
      if (shouldRenderPreview) {
        this._syncPreviewSubject();
        requestAnimationFrame(() => this.preview3d?.resize());
      }
    }

    const homeCap = document.getElementById('home-preview-caption');
    if (homeCap) homeCap.textContent = `${char.name} · ${outfit.name} · ${weapon.name}`;

    this.renderHome();
    if (this.activeNav === 'maps') this.renderMaps();
    if (this.activeNav === 'armory') this.renderArmory();
    if (this.activeNav === 'shop') this.renderShop();
    if (this.activeNav === 'dashboard') this.renderDashboard();
    if (this.activeNav === 'settings') {
      this._renderSettingsInto(document.getElementById('lobby-settings-mount'));
    }
  }

  _syncPreviewSubject() {
    if (!this.preview3d) return;
    const badge = getBadgeById(this.profile.selectedBadge);
    const badgePill = document.getElementById('preview-badge-pill');
    if (badgePill) {
      badgePill.textContent = `${badge.name} [${badge.short}]`;
      badgePill.style.borderColor = badge.color;
    }
    const modeToUse = this.inSplash
      ? 'splash'
      : this.activeNav === 'home'
        ? this.homePreviewMode
        : this.previewMode;

    document.getElementById('btn-home-pv-char')?.classList.toggle('active', this.homePreviewMode === 'operator');
    document.getElementById('btn-home-pv-wpn')?.classList.toggle('active', this.homePreviewMode === 'weapon');
    document.getElementById('btn-pv-operator')?.classList.toggle('active', this.previewMode === 'operator');
    document.getElementById('btn-pv-weapon')?.classList.toggle('active', this.previewMode === 'weapon');

    const wpn = getWeaponSpec(this.profile.selectedWeapon);
    const fin = getFinishById(this.profile.selectedFinish);
    const char = getCharacterById(this.profile.selectedCharacter);
    const outfit = getOutfitById(this.profile.selectedOutfit);
    const lbl = document.getElementById('armory-subject-label');
    if (lbl) {
      lbl.textContent =
        modeToUse === 'weapon'
          ? `${wpn.name} · ${fin.name}`
          : `${char.name} · ${outfit.name}`;
    }

    this.preview3d.updateSubject({
      mode: modeToUse,
      characterId: this.profile.selectedCharacter,
      outfitId: this.profile.selectedOutfit,
      badgeId: this.profile.selectedBadge,
      weaponId: this.profile.selectedWeapon,
      finishId: this.profile.selectedFinish,
      weaponUpgrades: this.profile.weaponUpgrades,
    });
  }

  renderHome() {
    const p = this.profile;
    const activeChar = getCharacterById(p.selectedCharacter);

    const opGrid = document.getElementById('home-operators-grid');
    if (opGrid) {
      opGrid.innerHTML = CHARACTERS.map((c) => {
        const sel = c.id === p.selectedCharacter;
        return `
        <button type="button" class="op-tile ${sel ? 'active' : ''}" data-home-char="${c.id}" title="${c.name} — ${c.role}">
          <div class="op-portrait">${getOperatorPortraitSvg(c)}</div>
          <span class="op-codename">${c.codename || c.name.split(' ')[0]}</span>
        </button>`;
      }).join('');
      opGrid.querySelectorAll('[data-home-char]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onEquipProfileItem?.('character', b.dataset.homeChar);
        }),
      );
    }

    const nameEl = document.getElementById('home-char-name');
    if (nameEl) nameEl.textContent = activeChar.name;
    const roleEl = document.getElementById('home-char-role');
    if (roleEl) roleEl.textContent = activeChar.role;

    const statsEl = document.getElementById('home-char-stats');
    if (statsEl) {
      const st = activeChar.stats || { health: 90, speed: 80, armor: 85, offense: 8, defense: 7, mobility: 7, tech: 6 };
      statsEl.innerHTML = `
        <div class="stat-list">
          <div class="stat-row">
            <div class="stat-row-top"><span>Health</span><strong>${st.health}/100</strong></div>
            <div class="stat-track"><div class="stat-fill amber" style="width:${st.health}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-top"><span>Speed</span><strong>${st.speed}/100</strong></div>
            <div class="stat-track"><div class="stat-fill cyan" style="width:${st.speed}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-top"><span>Armor</span><strong>${st.armor}/100</strong></div>
            <div class="stat-track"><div class="stat-fill" style="width:${st.armor}%"></div></div>
          </div>
        </div>
        <div class="mini-attr-grid">
          <div class="mini-attr"><span>Offense</span><strong>${st.offense}/10</strong></div>
          <div class="mini-attr"><span>Defense</span><strong>${st.defense}/10</strong></div>
          <div class="mini-attr"><span>Mobility</span><strong>${st.mobility}/10</strong></div>
          <div class="mini-attr"><span>Tech</span><strong>${st.tech}/10</strong></div>
        </div>
      `;
    }

    const loadoutEl = document.getElementById('home-loadout-panel');
    if (loadoutEl) {
      const pri = getUpgradedWeaponSpec(p.selectedWeapon, p.weaponUpgrades);
      const fin = getFinishById(p.selectedFinish);
      const outfit = getOutfitById(p.selectedOutfit);
      const badge = getBadgeById(p.selectedBadge);
      const lvls = p.weaponUpgrades?.[pri.id] || { barrel: 0, trigger: 0, magazine: 0, stock: 0 };
      const rawDmg = pri.damage * (pri.pellets || 1);
      const dmgLabel = pri.pellets > 1 ? `${pri.damage}x${pri.pellets}` : `${rawDmg}`;
      const rpm = Math.round(60 / pri.fireRate);
      const accPct = Math.max(25, Math.min(98, Math.round(100 - pri.baseSpread * 1600)));

      loadoutEl.innerHTML = `
        <div class="loadout-slot">
          <div class="loadout-slot-hdr">
            <span class="loadout-slot-tag">Primary</span>
            <span class="loadout-wpn-stats">DMG ${dmgLabel} · MAG ${pri.magSize} · ${fin.name}</span>
          </div>
          <div class="loadout-svg-wrap">
            <div style="width:94px;flex-shrink:0;">${getItemSilhouetteSvg(pri.id, 'buy-svg')}</div>
            <div style="flex:1;min-width:0;">
              <div class="loadout-wpn-name">${pri.name}</div>
              <div style="display:flex;gap:8px;font-size:10px;color:#94a3b8;margin-top:2px;">
                <span>DMG ${dmgLabel}</span><span>${rpm} RPM</span><span>ACC ${accPct}%</span>
              </div>
            </div>
          </div>
          <div class="loadout-attach-row">
            <div class="attach-box ${lvls.barrel ? 'upgraded' : ''}">Barrel ${lvls.barrel ? `T${lvls.barrel}` : 'Std'}</div>
            <div class="attach-box ${lvls.trigger ? 'upgraded' : ''}">Trigger ${lvls.trigger ? `T${lvls.trigger}` : 'Std'}</div>
            <div class="attach-box ${lvls.magazine ? 'upgraded' : ''}">Mag ${lvls.magazine ? `T${lvls.magazine}` : 'Std'}</div>
            <div class="attach-box ${lvls.stock ? 'upgraded' : ''}">Stock ${lvls.stock ? `T${lvls.stock}` : 'Std'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="loadout-slot">
            <div class="loadout-slot-hdr">
              <span class="loadout-slot-tag">Sidearm</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:44px;flex-shrink:0;">${getItemSilhouetteSvg('kestrel', 'buy-svg')}</div>
              <div>
                <div style="font-size:12px;font-weight:800;color:#f8fafc;">Kestrel P9</div>
                <div style="font-size:10px;color:#94a3b8;">DMG 32 · ACC 92</div>
              </div>
            </div>
          </div>
          <div class="loadout-slot">
            <div class="loadout-slot-hdr">
              <span class="loadout-slot-tag">Outfit &amp; Badge</span>
            </div>
            <div style="font-size:12px;font-weight:800;color:#f8fafc;">${outfit.name}</div>
            <div style="font-size:10px;color:#6ee7b7;margin-top:2px;">[${badge.short}] ${badge.name}</div>
          </div>
        </div>
      `;
    }

    const activeMap = getActiveMap();
    const mapName = document.getElementById('home-map-name');
    const mapSub = document.getElementById('home-map-sub');
    const mapThumb = document.getElementById('home-map-thumb');
    if (mapName) mapName.textContent = activeMap.name;
    if (mapSub) mapSub.textContent = activeMap.subtitle;
    if (mapThumb) mapThumb.innerHTML = renderMapBlueprintSvg(activeMap);

    const modeMount = document.getElementById('home-mode-picks');
    if (modeMount) {
      modeMount.innerHTML = GAME_MODES.map(
        (m) => `<button type="button" class="seg-btn ${this.settings.selectedModeId === m.id ? 'active' : ''}" data-home-mode="${m.id}">${m.short}</button>`,
      ).join('');
      modeMount.querySelectorAll('[data-home-mode]').forEach((b) =>
        b.addEventListener('click', () => this._emitSettingPatch({ selectedModeId: b.dataset.homeMode })),
      );
    }

    const timerMount = document.getElementById('home-timer-picks');
    if (timerMount) {
      timerMount.innerHTML = TIMER_PRESETS.map(
        (t) => `<button type="button" class="seg-btn ${this.settings.roundTimerSeconds === t.id ? 'active' : ''}" data-home-timer="${t.id}">${t.id}s</button>`,
      ).join('');
      timerMount.querySelectorAll('[data-home-timer]').forEach((b) =>
        b.addEventListener('click', () => this._emitSettingPatch({ roundTimerSeconds: Number(b.dataset.homeTimer) })),
      );
    }

    const sbMount = document.getElementById('home-sb-picks');
    if (sbMount) {
      sbMount.innerHTML = SCOREBOARD_DESIGNS.map(
        (d) => `<button type="button" class="seg-btn ${this.settings.scoreboardDesign === d.id ? 'active' : ''}" data-home-sb="${d.id}">${d.name}</button>`,
      ).join('');
      sbMount.querySelectorAll('[data-home-sb]').forEach((b) =>
        b.addEventListener('click', () => this._emitSettingPatch({ scoreboardDesign: b.dataset.homeSb })),
      );
    }
  }

  renderMaps() {
    const grid = document.getElementById('maps-grid');
    if (!grid) return;
    const maps = getAllMaps();
    grid.innerHTML = maps
      .map((m) => {
        const selected = m.id === this.settings.selectedMapId;
        const badgeTag = (m.terrainTags || m.subtitle || 'Arena').split(' · ')[0];
        return `
        <div class="map-card ${selected ? 'selected' : ''}">
          <div class="map-radar-box">${renderMapBlueprintSvg(m)}</div>
          <div class="map-title-row">
            <span class="map-name">${m.name}</span>
            <span class="map-biome">${badgeTag}</span>
          </div>
          <div class="map-desc">${m.terrainTags || m.subtitle}</div>
          <div class="map-actions">
            <button type="button" class="btn-silver ${selected ? 'active' : ''}" data-pick-map="${m.id}">${selected ? 'Selected' : 'Select'}</button>
            <button type="button" class="btn-emerald" style="padding:8px 10px;font-size:12px;" data-launch-map="${m.id}">Play</button>
          </div>
        </div>`;
      })
      .join('');

    grid.querySelectorAll('[data-pick-map]').forEach((b) =>
      b.addEventListener('click', () => {
        this._emitSettingPatch({ selectedMapId: b.dataset.pickMap });
        this.callbacks.onSelectMap?.(b.dataset.pickMap);
        this.renderMaps();
      }),
    );
    grid.querySelectorAll('[data-launch-map]').forEach((b) =>
      b.addEventListener('click', () => {
        this._emitSettingPatch({ selectedMapId: b.dataset.launchMap });
        this.callbacks.onSelectMap?.(b.dataset.launchMap);
        this.callbacks.onStartMatch?.(this.selectedTeam);
      }),
    );
  }

  renderArmory() {
    const mount = document.getElementById('armory-tab-content');
    if (!mount) return;
    const p = this.profile;

    if (this.activeArmoryTab === 'characters') {
      mount.innerHTML = `
        <div style="margin-bottom:14px;">
          <span class="form-label">Characters</span>
          <div class="option-grid">
            ${CHARACTERS.map((c) => {
              const sel = p.selectedCharacter === c.id;
              return `
              <button type="button" class="item-card ${sel ? 'selected' : ''}" data-sel-char="${c.id}">
                <div class="item-head"><span class="item-title">${c.name}</span><span class="item-tag">${sel ? 'Active' : c.role}</span></div>
                <div class="item-desc">${c.bio}</div>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div>
          <span class="form-label">Outfits</span>
          <div class="option-grid">
            ${OUTFITS.map((o) => {
              const owned = p.unlockedOutfits.includes(o.id);
              const sel = p.selectedOutfit === o.id;
              return `
              <div class="item-card ${sel ? 'selected' : ''}">
                <div class="swatch-bar" style="background:linear-gradient(90deg, ${hexCss(o.fabricHex)}, ${hexCss(o.armorHex)}, ${hexCss(o.trimHex)})"></div>
                <div class="item-head"><span class="item-title">${o.name}</span><span class="item-tag">${sel ? 'Equipped' : owned ? 'Owned' : `$${o.cost}`}</span></div>
                <div class="item-desc">${o.desc}</div>
                <button type="button" class="${owned ? 'btn-silver' : 'btn-emerald'} ${sel ? 'active' : ''}" style="padding:6px 10px;font-size:11px;margin-top:auto;" data-armory-outfit="${o.id}">
                  ${sel ? 'Equipped' : owned ? 'Equip' : `Unlock $${o.cost}`}
                </button>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
      mount.querySelectorAll('[data-sel-char]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onEquipProfileItem?.('character', b.dataset.selChar);
        }),
      );
      mount.querySelectorAll('[data-armory-outfit]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onPurchaseOrEquip?.('outfit', b.dataset.armoryOutfit);
        }),
      );
    } else if (this.activeArmoryTab === 'weapons') {
      const finishes = Object.values(WEAPON_FINISHES);
      mount.innerHTML = `
        <div style="margin-bottom:14px;">
          <span class="form-label">Primary &amp; Sidearm Firearms</span>
          <div class="option-grid">
            ${WEAPON_LIST.map((w) => {
              const owned = p.unlockedWeapons.includes(w.id);
              const sel = p.selectedWeapon === w.id;
              return `
              <div class="item-card ${sel ? 'selected' : ''}">
                <div class="item-head"><span class="item-title">${w.name}</span><span class="item-tag">${sel ? 'Selected' : owned ? w.category : `$${w.shopCost}`}</span></div>
                <div class="item-desc">${w.role}</div>
                <button type="button" class="${owned ? 'btn-silver' : 'btn-emerald'} ${sel ? 'active' : ''}" style="padding:6px 10px;font-size:11px;margin-top:auto;" data-armory-weapon="${w.id}">
                  ${sel ? 'Inspecting 3D' : owned ? 'Select' : `Unlock $${w.shopCost}`}
                </button>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div>
          <span class="form-label">Weapon Finishes</span>
          <div class="option-grid">
            ${finishes
              .map((f) => {
                const owned = p.unlockedFinishes.includes(f.id);
                const sel = p.selectedFinish === f.id;
                return `
                <div class="item-card ${sel ? 'selected' : ''}">
                  <div class="swatch-bar" style="background:${f.previewCss}"></div>
                  <div class="item-head"><span class="item-title">${f.name}</span><span class="item-tag">${sel ? 'Equipped' : owned ? 'Owned' : `$${f.cost}`}</span></div>
                  <button type="button" class="${owned ? 'btn-silver' : 'btn-emerald'} ${sel ? 'active' : ''}" style="padding:6px 10px;font-size:11px;margin-top:auto;" data-armory-finish="${f.id}">
                    ${sel ? 'Equipped' : owned ? 'Apply' : `Unlock $${f.cost}`}
                  </button>
                </div>`;
              })
              .join('')}
          </div>
        </div>
      `;
      mount.querySelectorAll('[data-armory-weapon]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onPurchaseOrEquip?.('weapon', b.dataset.armoryWeapon);
        }),
      );
      mount.querySelectorAll('[data-armory-finish]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onPurchaseOrEquip?.('finish', b.dataset.armoryFinish);
        }),
      );
    } else if (this.activeArmoryTab === 'upgrades') {
      const wId = p.selectedWeapon;
      const spec = getUpgradedWeaponSpec(wId, p.weaponUpgrades);
      const lvls = p.weaponUpgrades?.[wId] || { barrel: 0, trigger: 0, magazine: 0, stock: 0 };
      mount.innerHTML = `
        <div class="item-card" style="margin-bottom:12px;flex-direction:row;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#f8fafc;">${spec.name} Benchmarks</div>
            <div style="font-size:12px;color:#94a3b8;">Damage ${spec.damage} · Mag ${spec.magSize} · Reload ${spec.reloadTime}s · Range ${spec.range}m</div>
          </div>
          <select id="upgrade-weapon-select" class="btn-silver">
            ${WEAPON_LIST.filter((w) => p.unlockedWeapons.includes(w.id))
              .map((w) => `<option value="${w.id}" ${w.id === wId ? 'selected' : ''}>${w.name}</option>`)
              .join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          ${UPGRADE_TRACKS.map((tr) => {
            const lvl = lvls[tr.id] || 0;
            const maxed = lvl >= tr.maxLevel;
            const cost = maxed ? 0 : tr.costs[lvl];
            const canAfford = !maxed && p.credits >= cost;
            return `
            <div class="upgrade-row">
              <div>
                <div style="font-size:13px;font-weight:800;color:#f8fafc;">${tr.name} <span style="color:#34d399;">Tier ${lvl}/${tr.maxLevel}</span></div>
                <div style="font-size:11px;color:#94a3b8;">${tr.desc}</div>
                <div class="tier-pips">
                  ${[0, 1, 2].map((idx) => `<span class="tier-pip ${idx < lvl ? 'on' : ''}"></span>`).join('')}
                </div>
              </div>
              <button type="button" class="${maxed ? 'btn-silver' : 'btn-emerald'}" style="padding:8px 14px;font-size:12px;" ${maxed || !canAfford ? 'disabled' : ''} data-upgrade-track="${tr.id}">
                ${maxed ? 'Maxed' : `Upgrade $${cost}`}
              </button>
            </div>`;
          }).join('')}
        </div>
      `;
      document.getElementById('upgrade-weapon-select')?.addEventListener('change', (e) => {
        this.callbacks.onPurchaseOrEquip?.('weapon', e.target.value);
      });
      mount.querySelectorAll('[data-upgrade-track]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onUpgradeWeapon?.(wId, b.dataset.upgradeTrack);
        }),
      );
    } else if (this.activeArmoryTab === 'badges') {
      mount.innerHTML = `
        <span class="form-label">Player Badges (Shown on 3D Vest, Lobby &amp; Scoreboard)</span>
        <div class="option-grid">
          ${BADGES.map((bg) => {
            const owned = p.unlockedBadges.includes(bg.id);
            const sel = p.selectedBadge === bg.id;
            return `
            <div class="item-card ${sel ? 'selected' : ''}">
              <div class="item-head">
                <span class="sb-badge-tag" style="background:${bg.color};font-size:12px;padding:3px 9px;">${bg.short}</span>
                <span class="item-tag">${sel ? 'Equipped' : owned ? 'Owned' : `$${bg.cost}`}</span>
              </div>
              <div class="item-title">${bg.name}</div>
              <div class="item-desc">${bg.desc}</div>
              <button type="button" class="${owned ? 'btn-silver' : 'btn-emerald'} ${sel ? 'active' : ''}" style="padding:6px 10px;font-size:11px;margin-top:auto;" data-armory-badge="${bg.id}">
                ${sel ? 'Equipped' : owned ? 'Equip Badge' : `Unlock $${bg.cost}`}
              </button>
            </div>`;
          }).join('')}
        </div>
      `;
      mount.querySelectorAll('[data-armory-badge]').forEach((b) =>
        b.addEventListener('click', () => {
          this.callbacks.onPurchaseOrEquip?.('badge', b.dataset.armoryBadge);
        }),
      );
    }
  }

  renderShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    const p = this.profile;

    const catalog = [
      ...WEAPON_LIST.map((w) => ({
        cat: 'weapon',
        id: w.id,
        name: w.name,
        cost: w.shopCost || 0,
        owned: p.unlockedWeapons.includes(w.id),
        equipped: p.selectedWeapon === w.id,
        desc: `${w.category} · ${w.role}`,
        swatch: '',
      })),
      ...OUTFITS.map((o) => ({
        cat: 'outfit',
        id: o.id,
        name: o.name,
        cost: o.cost,
        owned: p.unlockedOutfits.includes(o.id),
        equipped: p.selectedOutfit === o.id,
        desc: o.desc,
        swatch: `linear-gradient(90deg, ${hexCss(o.fabricHex)}, ${hexCss(o.armorHex)}, ${hexCss(o.trimHex)})`,
      })),
      ...Object.values(WEAPON_FINISHES).map((f) => ({
        cat: 'finish',
        id: f.id,
        name: f.name,
        cost: f.cost,
        owned: p.unlockedFinishes.includes(f.id),
        equipped: p.selectedFinish === f.id,
        desc: 'Custom anodized firearm finish',
        swatch: f.previewCss,
      })),
      ...BADGES.map((b) => ({
        cat: 'badge',
        id: b.id,
        name: b.name,
        cost: b.cost,
        owned: p.unlockedBadges.includes(b.id),
        equipped: p.selectedBadge === b.id,
        desc: b.desc,
        swatch: b.color,
      })),
    ].filter((item) => this.activeShopFilter === 'all' || item.cat === this.activeShopFilter);

    grid.innerHTML = catalog
      .map((item) => {
        const canAfford = p.credits >= item.cost;
        return `
        <div class="item-card ${item.equipped ? 'selected' : ''}">
          ${item.swatch ? `<div class="swatch-bar" style="background:${item.swatch}"></div>` : ''}
          <div class="item-head">
            <span class="item-title">${item.name}</span>
            <span class="item-tag">${item.equipped ? 'Equipped' : item.owned ? 'Owned' : `$${item.cost}`}</span>
          </div>
          <div class="item-desc">${item.desc}</div>
          <div style="display:flex;gap:6px;margin-top:auto;">
            <button type="button" class="${item.owned ? 'btn-silver' : 'btn-emerald'} ${item.equipped ? 'active' : ''}" style="flex:1;padding:6px 8px;font-size:11px;" ${!item.owned && !canAfford ? 'disabled' : ''} data-shop-buy="${item.cat}:${item.id}">
              ${item.equipped ? 'Equipped' : item.owned ? 'Equip' : `Buy $${item.cost}`}
            </button>
            <button type="button" class="btn-silver" style="padding:6px 8px;font-size:11px;" data-shop-preview="${item.cat}:${item.id}">3D</button>
          </div>
        </div>`;
      })
      .join('');

    grid.querySelectorAll('[data-shop-buy]').forEach((b) =>
      b.addEventListener('click', () => {
        const [cat, id] = b.dataset.shopBuy.split(':');
        this.callbacks.onPurchaseOrEquip?.(cat, id);
      }),
    );
    grid.querySelectorAll('[data-shop-preview]').forEach((b) =>
      b.addEventListener('click', () => {
        const [cat, id] = b.dataset.shopPreview.split(':');
        if (cat === 'weapon') {
          this.activeArmoryTab = 'weapons';
          this.previewMode = 'weapon';
          this.callbacks.onEquipProfileItem?.('weaponPreview', id);
        } else if (cat === 'finish') {
          this.activeArmoryTab = 'weapons';
          this.previewMode = 'weapon';
          this.callbacks.onEquipProfileItem?.('finishPreview', id);
        } else {
          this.activeArmoryTab = cat === 'badge' ? 'badges' : 'characters';
          this.previewMode = 'operator';
          this.callbacks.onEquipProfileItem?.(`${cat}Preview`, id);
        }
        this.switchLobbyView('armory');
      }),
    );
  }

  renderDashboard() {
    const s = this.profile.stats;
    const winPct = s.matchesPlayed > 0 ? Math.round((s.wins / s.matchesPlayed) * 100) : 0;
    const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2);
    const kpiEl = document.getElementById('dashboard-kpis');
    if (kpiEl) {
      const kpis = [
        { label: 'Matches Played', val: s.matchesPlayed },
        { label: 'Wins / Win %', val: `${s.wins} (${winPct}%)` },
        { label: 'Total Kills', val: s.kills },
        { label: 'K / D Ratio', val: kd },
        { label: 'Headshots', val: s.headshots },
        { label: 'Total Damage', val: s.damageDealt.toLocaleString() },
      ];
      kpiEl.innerHTML = kpis
        .map((k) => `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.val}</div></div>`)
        .join('');
    }

    const char = getCharacterById(this.profile.selectedCharacter);
    const outfit = getOutfitById(this.profile.selectedOutfit);
    const badge = getBadgeById(this.profile.selectedBadge);
    const wpn = getWeaponSpec(this.profile.selectedWeapon);
    const fin = getFinishById(this.profile.selectedFinish);
    const sumEl = document.getElementById('dashboard-loadout-summary');
    if (sumEl) {
      sumEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
          <div class="item-card"><strong>Character</strong><div style="color:#94a3b8;margin-top:3px;">${char.name} (${char.role})</div></div>
          <div class="item-card"><strong>Outfit</strong><div style="color:#94a3b8;margin-top:3px;">${outfit.name}</div></div>
          <div class="item-card"><strong>Signature Gun</strong><div style="color:#94a3b8;margin-top:3px;">${wpn.name} · ${fin.name}</div></div>
          <div class="item-card"><strong>Badge</strong><div style="margin-top:3px;"><span class="sb-badge-tag" style="background:${badge.color};">${badge.short}</span> ${badge.name}</div></div>
        </div>
      `;
    }

    const histEl = document.getElementById('dashboard-history-body');
    if (histEl) {
      if (!this.profile.matchHistory.length) {
        histEl.innerHTML = '<tr><td colspan="6" style="color:#94a3b8;text-align:center;padding:18px;">No completed matches yet. Start a match to track career results.</td></tr>';
      } else {
        histEl.innerHTML = this.profile.matchHistory
          .map(
            (m) => `
          <tr>
            <td><strong>${m.mapName}</strong></td>
            <td>${m.modeName}</td>
            <td style="color:${m.won ? '#34d399' : '#f87171'};font-weight:800;">${m.won ? 'Win' : 'Loss'}</td>
            <td>${m.scoreText}</td>
            <td>${m.kills}/${m.assists}/${m.deaths}</td>
            <td style="color:#34d399;font-weight:700;">+$${m.rewardCredits}</td>
          </tr>`,
          )
          .join('');
      }
    }
  }

  _emitSettingPatch(patch) {
    this.settings = { ...this.settings, ...patch };
    this.applySettings(this.settings);
    this.callbacks.onChangeSettings?.(this.settings);
    if (!this.elLobby.classList.contains('hidden')) {
      this.renderHome();
      if (this.activeNav === 'settings') {
        this._renderSettingsInto(document.getElementById('lobby-settings-mount'));
      }
    }
    if (this.settingsOpen) {
      this._renderSettingsInto(document.getElementById('modal-settings-mount'));
    }
  }

  _handleResetSettings() {
    const fresh = this.callbacks.onResetSettings?.();
    if (fresh) {
      this.settings = { ...fresh };
      this.applySettings(this.settings);
      this.refreshLobby();
      if (this.settingsOpen) {
        this._renderSettingsInto(document.getElementById('modal-settings-mount'));
      }
    }
  }

  _renderSettingsInto(mountEl) {
    if (!mountEl) return;
    const s = this.settings;

    const segRow = (label, valText, key, options) => `
      <div class="setting-row">
        <div class="setting-top"><span>${label}</span><span class="setting-val">${valText}</span></div>
        <div class="seg-group">
          ${options
            .map(
              (o) => `<button type="button" class="seg-btn ${String(s[key]) === String(o.val) ? 'active' : ''}" data-set-key="${key}" data-set-val="${o.val}">${o.label}</button>`,
            )
            .join('')}
        </div>
      </div>`;

    const rangeRow = (label, valText, key, min, max, step) => `
      <div class="setting-row">
        <div class="setting-top"><span>${label}</span><span class="setting-val">${valText}</span></div>
        <input class="setting-range" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" data-range-key="${key}" />
      </div>`;

    mountEl.innerHTML = [
      segRow('Texture Quality', s.textureQuality.toUpperCase(), 'textureQuality', [
        { val: 'fast', label: 'Fast' },
        { val: 'balanced', label: 'Balanced' },
        { val: 'high', label: 'High' },
      ]),
      segRow('Animation Detail', s.animationLevel.toUpperCase(), 'animationLevel', [
        { val: 'minimal', label: 'Minimal' },
        { val: 'standard', label: 'Standard' },
        { val: 'expressive', label: 'Expressive' },
      ]),
      segRow('Graphics Quality', s.graphicsQuality.toUpperCase(), 'graphicsQuality', [
        { val: 'low', label: 'Low' },
        { val: 'medium', label: 'Medium' },
        { val: 'high', label: 'High' },
      ]),
      segRow('Shadows & Fog', `${s.shadowsEnabled ? 'Shadows On' : 'No Shadows'} · ${s.fogEnabled ? 'Fog On' : 'No Fog'}`, 'shadowsEnabled', [
        { val: 'true', label: 'Shadows On' },
        { val: 'false', label: 'Shadows Off' },
      ]),
      segRow('Scoreboard Design', SCOREBOARD_DESIGNS.find((d) => d.id === s.scoreboardDesign)?.name || 'Classic', 'scoreboardDesign',
        SCOREBOARD_DESIGNS.map((d) => ({ val: d.id, label: d.name.split(' ')[0] })),
      ),
      segRow('Game Mode', GAME_MODES.find((m) => m.id === s.selectedModeId)?.short || 'Defusal', 'selectedModeId',
        GAME_MODES.map((m) => ({ val: m.id, label: m.short })),
      ),
      segRow('Match Timer', `${s.roundTimerSeconds}s`, 'roundTimerSeconds',
        TIMER_PRESETS.map((t) => ({ val: t.id, label: `${t.id}s` })),
      ),
      segRow('Rounds to Win', `First to ${s.roundsToWin}`, 'roundsToWin', [
        { val: 3, label: 'First to 3' },
        { val: 5, label: 'First to 5' },
        { val: 7, label: 'First to 7' },
      ]),
      rangeRow('Field of View', `${s.fov}°`, 'fov', 65, 95, 1),
      rangeRow('Brightness / Exposure', `${Number(s.exposure).toFixed(2)}`, 'exposure', 0.85, 1.45, 0.05),
      rangeRow('Mouse Sensitivity', `${Number(s.sensitivity).toFixed(2)}x`, 'sensitivity', 0.3, 2.5, 0.05),
      segRow('Invert Y-Axis', s.invertY ? 'Inverted' : 'Normal', 'invertY', [
        { val: 'false', label: 'Normal' },
        { val: 'true', label: 'Inverted' },
      ]),
      rangeRow('Master Volume', `${Math.round(s.masterVolume * 100)}%`, 'masterVolume', 0, 1, 0.05),
      rangeRow('SFX Volume', `${Math.round(s.sfxVolume * 100)}%`, 'sfxVolume', 0, 1, 0.05),
      segRow('Crosshair Style', s.crosshairStyle.toUpperCase(), 'crosshairStyle', [
        { val: 'dynamic', label: 'Dynamic' },
        { val: 'tactical', label: 'Emerald' },
        { val: 'dot', label: 'Dot' },
        { val: 'cross', label: 'Static' },
      ]),
      segRow('Minimap Size', s.minimapSize.toUpperCase(), 'minimapSize', [
        { val: 'small', label: 'Small' },
        { val: 'medium', label: 'Medium' },
        { val: 'large', label: 'Large' },
      ]),
      rangeRow('Mobile Controls Opacity', `${Math.round(s.mobileOpacity * 100)}%`, 'mobileOpacity', 0.35, 1, 0.05),
      rangeRow('Mobile Controls Scale', `${Number(s.mobileScale).toFixed(2)}x`, 'mobileScale', 0.75, 1.35, 0.05),
    ].join('');

    mountEl.querySelectorAll('[data-set-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.setKey;
        const raw = btn.dataset.setVal;
        let val = raw;
        if (raw === 'true') val = true;
        else if (raw === 'false') val = false;
        else if (key === 'roundTimerSeconds' || key === 'roundsToWin') val = Number(raw);
        this._emitSettingPatch({ [key]: val });
      });
    });

    mountEl.querySelectorAll('[data-range-key]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.rangeKey;
        this._emitSettingPatch({ [key]: parseFloat(inp.value) });
      });
    });
  }

  _bindMobileControls() {
    const joy = document.getElementById('touch-joystick');
    const nub = document.getElementById('touch-stick-nub');
    if (joy && nub && this.input) {
      let stickPid = null;
      const updateStick = (clientX, clientY) => {
        const rect = joy.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const maxR = rect.width * 0.36;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        nub.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        this.input.setVirtualMove(dx / maxR, -dy / maxR);
      };
      const resetStick = () => {
        stickPid = null;
        nub.style.transform = 'translate(0px, 0px)';
        this.input.setVirtualMove(0, 0);
      };

      joy.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        stickPid = e.pointerId;
        joy.setPointerCapture?.(e.pointerId);
        updateStick(e.clientX, e.clientY);
      });
      joy.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickPid) return;
        updateStick(e.clientX, e.clientY);
      });
      joy.addEventListener('pointerup', (e) => { if (e.pointerId === stickPid) resetStick(); });
      joy.addEventListener('pointercancel', (e) => { if (e.pointerId === stickPid) resetStick(); });
    }

    const fireBtn = document.getElementById('touch-fire');
    fireBtn?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      fireBtn.setPointerCapture?.(e.pointerId);
      this.input?.setTouchFire(true);
    });
    const endFire = () => this.input?.setTouchFire(false);
    fireBtn?.addEventListener('pointerup', endFire);
    fireBtn?.addEventListener('pointercancel', endFire);

    this.elTouchAds?.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = this.input?.toggleTouchAds();
      this.elTouchAds.classList.toggle('active', Boolean(on));
    });
    document.getElementById('touch-reload')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.input?.triggerVirtualKey('KeyR');
    });
    document.getElementById('touch-swap')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onTouchSwap?.();
    });
    this.elTouchBuy?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.input?.triggerVirtualKey('KeyB');
    });
    this.elTouchInteract?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.elTouchInteract.setPointerCapture?.(e.pointerId);
      this.input?.setTouchInteract(true);
    });
    const endInt = () => this.input?.setTouchInteract(false);
    this.elTouchInteract?.addEventListener('pointerup', endInt);
    this.elTouchInteract?.addEventListener('pointercancel', endInt);
  }

  applySettings(settings) {
    this.settings = { ...settings };
    this.elCrosshair.className = `crosshair style-${settings.crosshairStyle || 'dynamic'}`;
    this.elMinimapWrap.className = `minimap-wrap size-${settings.minimapSize || 'medium'}`;
    document.documentElement.style.setProperty('--mobile-opacity', String(settings.mobileOpacity ?? 0.78));
    document.documentElement.style.setProperty('--mobile-scale', String(settings.mobileScale ?? 1.0));
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) muteBtn.textContent = settings.muted ? 'Audio Off [M]' : 'Audio On [M]';
  }

  setSettingsOpen(open) {
    this.settingsOpen = open;
    this.elSettings.classList.toggle('hidden', !open);
    if (open) {
      this._renderSettingsInto(document.getElementById('modal-settings-mount'));
    }
  }

  setBuyOpen(open, player) {
    this.buyOpen = open;
    this.elBuy.classList.toggle('hidden', !open);
    if (open && player) this.renderBuyMenu(player);
  }

  setScoreboardOpen(open, actors, matchState) {
    this.scoreboardOpen = open;
    this.elScoreboard.classList.toggle('hidden', !open);
    if (open && actors) {
      this._renderScoreboardInto(this.scoreboardTable, actors, matchState);
    }
  }

  renderBuyMenu(player) {
    this.buyCredits.textContent = `$${player.credits}`;
    const items = [...WEAPON_LIST, ARMOR_ITEMS.kevlar, ARMOR_ITEMS.heavy];
    this.buyGrid.innerHTML = '';

    items.forEach((item, idx) => {
      const check = canPurchaseItem(player, item.id);
      const isEquipped =
        (item.slot && player.loadout[item.slot]?.id === item.id) ||
        (!item.slot && player.armor >= item.armor);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `buy-card${isEquipped ? ' equipped' : ''}${!check.ok && !isEquipped ? ' disabled' : ''}`;
      card.disabled = !check.ok && !isEquipped;
      card.dataset.buyItem = item.id;

      const dmgBar = item.damage ? Math.min(100, Math.round((item.damage * (item.pellets || 1)) / 1.4)) : item.armor;
      const rofBar = item.fireRate ? Math.min(100, Math.round(8 / item.fireRate)) : 60;

      card.innerHTML = `
        <div class="buy-card-top">
          <span class="buy-key">[${idx + 1}]</span>
          <span class="buy-cat">${item.category || 'Armor'}</span>
          <span class="buy-cost">$${item.cost}</span>
        </div>
        ${getItemSilhouetteSvg(item.id)}
        <div class="buy-name">${item.name}</div>
        <div class="buy-role">${item.role}</div>
        <div class="buy-bars">
          <div class="buy-bar-row"><span>${item.armor ? 'ARMOR' : 'DAMAGE'}</span><div><i style="width:${dmgBar}%"></i></div></div>
          ${item.fireRate ? `<div class="buy-bar-row"><span>RATE</span><div><i style="width:${rofBar}%"></i></div></div>` : ''}
        </div>
        <div class="buy-status">${isEquipped ? 'Equipped' : check.ok ? 'Buy' : check.reason}</div>
      `;

      card.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.callbacks.onBuyItem?.(item.id);
      });
      this.buyGrid.appendChild(card);
    });
  }

  _renderScoreboardInto(container, actors, matchState) {
    const design = this.settings.scoreboardDesign || 'classic';
    container.className = `sb-wrap design-${design}`;

    const atk = [...actors.filter((a) => a.team === 'attackers')].sort((a, b) => b.kills - a.kills);
    const def = [...actors.filter((a) => a.team === 'defenders')].sort((a, b) => b.kills - a.kills);
    const playerBadge = getBadgeById(this.profile.selectedBadge);

    const sbTitle = document.getElementById('scoreboard-header-title');
    const sbMeta = document.getElementById('scoreboard-meta');
    if (sbTitle) sbTitle.textContent = `${getActiveMap().name} · Scoreboard`;
    if (sbMeta) sbMeta.textContent = `${GAME_MODES.find((m) => m.id === matchState.modeId)?.name || 'Defusal'} · Round ${matchState.roundNumber}`;

    const renderTeam = (label, cls, list) => {
      const scoreVal =
        matchState.modeId === 'team_deathmatch'
          ? (cls === 'atk' ? matchState.tdmKills.attackers : matchState.tdmKills.defenders)
          : (cls === 'atk' ? matchState.scores.attackers : matchState.scores.defenders);

      return `
      <div class="sb-team">
        <div class="sb-team-hdr ${cls}">
          <span>${label}</span>
          <span>${matchState.modeId === 'team_deathmatch' ? `KILLS: ${scoreVal}` : `SCORE: ${scoreVal}`}</span>
        </div>
        <table class="sb-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Badge</th>
              ${design === 'detailed' ? '<th>Weapon</th>' : ''}
              <th>K</th>
              <th>A</th>
              <th>D</th>
              <th>HS%</th>
              <th>DMG</th>
              <th>Cash</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((a) => {
                const hsPct = a.hits > 0 ? `${Math.round((a.headshots / a.hits) * 100)}%` : '0%';
                const bg = a.isPlayer ? playerBadge : BADGES[a.spawnIdx % BADGES.length];
                const wpnName = getWeaponSpec((a.loadout[a.activeSlot] || a.loadout.secondary)?.id).name;
                const displayName = a.isPlayer
                  ? `${getCharacterById(this.profile.characterId).name} (You)`
                  : a.name;
                return `
              <tr class="${a.isPlayer ? 'me' : ''} ${!a.alive ? 'dead' : ''}">
                <td>${displayName}</td>
                <td><span class="sb-badge-tag" style="background:${bg.color};">${bg.short}</span></td>
                ${design === 'detailed' ? `<td>${wpnName}</td>` : ''}
                <td>${a.kills}</td>
                <td>${a.assists || 0}</td>
                <td>${a.deaths}</td>
                <td>${hsPct}</td>
                <td>${a.damageDealt || 0}</td>
                <td>${a.isPlayer ? `$${a.credits}` : `$${a.credits}`}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>`;
    };

    container.innerHTML =
      renderTeam('Tide · Attackers', 'atk', atk) +
      renderTeam('Cinder · Defenders', 'def', def);
  }

  syncScreenState({ matchState, paused, player, actors, objective }) {
    const isTouch = Boolean(this.input?.isTouchMode);
    document.body.classList.toggle('has-touch', isTouch);

    const phase = matchState.phase;
    if (phase === GAME_PHASES.MAIN_MENU) {
      if (this.inSplash) {
        document.body.dataset.state = 'splash';
        this.elSplash?.classList.remove('hidden');
        this.elLobby.classList.add('hidden');
      } else {
        document.body.dataset.state = 'title';
        this.elSplash?.classList.add('hidden');
        this.elLobby.classList.remove('hidden');
      }
      this.elHud.classList.add('hidden');
      this.elBuy.classList.add('hidden');
      this.elResults.classList.add('hidden');
      this.elPause.classList.add('hidden');
      this.elMatchOver.classList.add('hidden');
      if (this.preview3d && (this.inSplash || this.activeNav === 'home' || this.activeNav === 'armory')) {
        this.preview3d.setActive(true);
      }
      return;
    }

    this.inSplash = false;
    this.elSplash?.classList.add('hidden');
    this.elLobby.classList.add('hidden');
    if (this.preview3d) this.preview3d.setActive(false);

    if (paused) {
      document.body.dataset.state = 'paused';
      this.elPause.classList.toggle('hidden', this.settingsOpen);
    } else {
      this.elPause.classList.add('hidden');
    }

    if (phase === GAME_PHASES.MATCH_OVER) {
      document.body.dataset.state = 'gameover';
      this.elHud.classList.add('hidden');
      this.elBuy.classList.add('hidden');
      this.elResults.classList.add('hidden');
      this.elMatchOver.classList.remove('hidden');
      const playerWon = matchState.matchWinner === player.team;
      this.matchOverTitle.textContent = playerWon ? 'Victory' : 'Defeat';
      this.matchOverTitle.className = `modal-title ${playerWon ? 'win' : 'lose'}`;
      const scoreLabel =
        matchState.modeId === 'team_deathmatch'
          ? `${matchState.tdmKills.attackers} — ${matchState.tdmKills.defenders} Kills`
          : `${matchState.scores.attackers} — ${matchState.scores.defenders}`;
      this.matchOverScore.textContent = `${getActiveMap().name} · ${scoreLabel}`;
      this.matchOverStats.textContent = `Kills: ${player.kills} · Assists: ${player.assists || 0} · Deaths: ${player.deaths} · Damage: ${player.damageDealt || 0}`;
      this._renderScoreboardInto(this.matchOverTable, actors, matchState);
      return;
    }

    this.elMatchOver.classList.add('hidden');
    if (!paused) document.body.dataset.state = 'playing';
    this.elHud.classList.remove('hidden');

    const showMobilePad =
      isTouch &&
      !paused &&
      !this.buyOpen &&
      !this.settingsOpen &&
      !this.scoreboardOpen &&
      phase !== GAME_PHASES.ROUND_RESULTS &&
      player.alive;
    this.elMobileControls?.classList.toggle('hidden', !showMobilePad);

    if (phase === GAME_PHASES.ROUND_RESULTS) {
      this.elResults.classList.remove('hidden');
      const out = matchState.lastRoundOutcome;
      if (out) {
        const playerWon = out.winner === player.team;
        this.resultsTitle.textContent = playerWon ? 'Round Won' : 'Round Lost';
        this.resultsTitle.className = `modal-title ${playerWon ? 'win' : 'lose'}`;
        this.resultsReason.textContent = `${out.winner === 'attackers' ? 'Tide' : 'Cinder'} · ${out.reason}`;
        this.resultsEconomy.textContent = `Winner +$${out.winReward}  |  Loser +$${out.loseReward}  |  Next round in ${Math.ceil(matchState.phaseTimer)}s`;
      }
      const key = `${matchState.roundNumber}_${matchState.scores.attackers}_${matchState.scores.defenders}`;
      if (key !== this._lastScoreboardKey) {
        this._lastScoreboardKey = key;
        this._renderScoreboardInto(this.resultsTable, actors, matchState);
      }
    } else {
      this.elResults.classList.add('hidden');
    }

    this.updateHUD({ matchState, player, actors, objective });
  }

  updateHUD({ matchState, player, actors, objective }) {
    const phase = matchState.phase;
    const isTdm = matchState.modeId === 'team_deathmatch';
    const isCtrl = matchState.modeId === 'control_zone';

    this.elAtkScore.textContent = String(isTdm ? matchState.tdmKills.attackers : matchState.scores.attackers);
    this.elDefScore.textContent = String(isTdm ? matchState.tdmKills.defenders : matchState.scores.defenders);
    this.elRoundNum.textContent = isTdm
      ? `FIRST TO ${ROUND_TIMINGS.TDM_TARGET_KILLS}`
      : `ROUND ${matchState.roundNumber} OF ${matchState.roundsToWin * 2 - 1}`;

    if (objective.planted && !objective.defused && !objective.detonated) {
      this.elTimer.textContent = objective.detonateTimer.toFixed(1);
      this.elTimer.classList.add('urgent');
      this.elPhaseBanner.textContent = 'Charge Armed — Detonating';
      this.elPhaseBanner.className = 'phase-banner urgent';
    } else {
      this.elTimer.classList.remove('urgent');
      const secs = Math.max(0, Math.ceil(matchState.phaseTimer));
      const m = Math.floor(secs / 60);
      const s = String(secs % 60).padStart(2, '0');
      this.elTimer.textContent = `${m}:${s}`;
      if (phase === GAME_PHASES.BUY_PHASE) {
        this.elPhaseBanner.textContent = this.input?.isTouchMode ? 'Buy Phase — Tap BUY' : 'Buy Phase — Press [B] for Requisition';
        this.elPhaseBanner.className = 'phase-banner buy';
      } else if (phase === GAME_PHASES.ROUND_START) {
        this.elPhaseBanner.textContent = 'Get Ready';
        this.elPhaseBanner.className = 'phase-banner';
      } else if (isTdm) {
        this.elPhaseBanner.textContent = `Team Deathmatch · First to ${ROUND_TIMINGS.TDM_TARGET_KILLS}`;
        this.elPhaseBanner.className = 'phase-banner';
      } else if (isCtrl) {
        this.elPhaseBanner.textContent = `Control Sector: Tide ${Math.round(matchState.controlProgress.attackers)}% · Cinder ${Math.round(matchState.controlProgress.defenders)}%`;
        this.elPhaseBanner.className = 'phase-banner';
      } else if (matchState.modeId === 'elimination') {
        this.elPhaseBanner.textContent = 'Elimination — Defeat opposing squad';
        this.elPhaseBanner.className = 'phase-banner';
      } else {
        this.elPhaseBanner.textContent =
          player.team === 'attackers' ? 'Plant the charge at Center Zone' : 'Defend the Center Zone';
        this.elPhaseBanner.className = 'phase-banner';
      }
    }

    const distToCore = Math.round(Math.hypot(player.x - PLANT_ZONE.x, player.z - PLANT_ZONE.z));
    if (isCtrl) {
      this.elObjBeacon.textContent = `Zone · ${distToCore}m · ${Math.round(matchState.controlProgress[player.team] || 0)}%`;
      this.elObjBeacon.classList.remove('armed');
    } else if (isTdm || matchState.modeId === 'elimination') {
      this.elObjBeacon.textContent = `${getActiveMap().name} · ${distToCore}m`;
      this.elObjBeacon.classList.remove('armed');
    } else if (objective.planted && !objective.defused) {
      this.elObjBeacon.textContent = `Armed · ${distToCore}m`;
      this.elObjBeacon.classList.add('armed');
    } else {
      this.elObjBeacon.textContent = `Site · ${distToCore}m`;
      this.elObjBeacon.classList.remove('armed');
    }

    this.elBuyHint.classList.toggle('hidden', phase !== GAME_PHASES.BUY_PHASE || Boolean(this.input?.isTouchMode));
    this.elTouchBuy?.classList.toggle('hidden', phase !== GAME_PHASES.BUY_PHASE);
    this.elKiaBanner?.classList.toggle('hidden', player.alive || phase !== GAME_PHASES.ACTIVE_COMBAT || isTdm);

    const atkTeam = actors.filter((a) => a.team === 'attackers');
    const defTeam = actors.filter((a) => a.team === 'defenders');
    this.elAliveAtk.innerHTML = atkTeam.map((a) => `<span class="pip atk ${a.alive ? 'on' : 'off'}"></span>`).join('');
    this.elAliveDef.innerHTML = defTeam.map((a) => `<span class="pip def ${a.alive ? 'on' : 'off'}"></span>`).join('');

    const zone = getZoneAt(player.x, player.z);
    this.elZoneName.textContent = zone.name;
    this.elHp.textContent = String(Math.round(player.hp));
    this.elArmor.textContent = String(Math.round(player.armor));
    this.elHpBar.style.width = `${Math.max(0, Math.min(100, player.hp))}%`;
    this.elHpBar.classList.toggle('low', player.hp <= 30);

    const { instance, spec } = player.getActiveWeapon();
    this.elWeaponName.textContent = spec.name.toUpperCase();
    this.elAmmo.textContent = String(instance.ammo);
    this.elReserve.textContent = `/ ${instance.reserve}`;
    this.elCredits.textContent = `$${player.credits}`;
    this.elReloadLabel.classList.toggle('hidden', !player.reloading);

    const prim = player.loadout.primary;
    this.elSlot1.textContent = prim ? `[1] ${getWeaponSpec(prim.id).name}` : '[1] —';
    this.elSlot1.classList.toggle('active', player.activeSlot === 'primary');
    this.elSlot2.textContent = `[2] ${getWeaponSpec(player.loadout.secondary.id).name}`;
    this.elSlot2.classList.toggle('active', player.activeSlot === 'secondary');

    const spreadPx = Math.round(4 + player.moveSpeed * 1.45 + player.burstCount * 1.9 + (player.crouched ? -2 : 0));
    this.elCrosshair.style.setProperty('--gap', `${Math.max(3, spreadPx)}px`);
    this.elCrosshair.classList.toggle('hidden', player.scoped && spec.isScoped);
    this.elScope.classList.toggle('hidden', !(player.scoped && spec.isScoped));

    if (player.hitmarkerTimer > 0) {
      this.elHitmarker.classList.remove('hidden');
      this.elHitmarker.classList.toggle('hs', player.hitmarkerHeadshot);
    } else {
      this.elHitmarker.classList.add('hidden');
    }

    this.elDamageVignette.style.opacity = String(Math.min(0.85, player.damageFlash));
    if (player.damageFlash > 0.05) {
      this.elDamageArc.classList.remove('hidden');
      const deg = (player.damageDirAngle * 180) / Math.PI;
      this.elDamageArc.style.transform = `translate(-50%, -50%) rotate(${Math.round(-deg)}deg)`;
      this.elDamageArc.style.opacity = String(Math.min(1, player.damageFlash * 1.3));
    } else {
      this.elDamageArc.classList.add('hidden');
    }

    let promptText = '';
    let progress = 0;
    const holdKeyLabel = this.input?.isTouchMode ? '[CORE]' : '[E]';
    if (player.alive && phase === GAME_PHASES.ACTIVE_COMBAT && matchState.modeId === 'bomb_defusal') {
      if (player.team === 'attackers' && !objective.planted && objective.isInsidePlantZone(player.x, player.z)) {
        progress = objective.planterId === player.id ? objective.plantProgress : 0;
        promptText = progress > 0 ? 'Arming Charge...' : `Hold ${holdKeyLabel} to Arm Charge`;
      } else if (player.team === 'defenders' && objective.planted && !objective.defused && objective.isNearPlantedSpike(player.x, player.z)) {
        progress = objective.defuserId === player.id ? objective.defuseProgress : 0;
        promptText = progress > 0 ? 'Defusing Charge...' : `Hold ${holdKeyLabel} to Defuse Charge`;
      }
    }
    this.elInteractPrompt.classList.toggle('hidden', !promptText);
    this.elTouchInteract?.classList.toggle('active', Boolean(promptText));
    if (promptText) {
      this.elInteractLabel.textContent = promptText;
      this.elInteractFill.style.width = `${Math.round(progress * 100)}%`;
    }

    const kfKey = matchState.killFeed.map((k) => k.id).join('|');
    if (kfKey !== this._lastKillFeedKey) {
      this._lastKillFeedKey = kfKey;
      this.elKillFeed.innerHTML = matchState.killFeed
        .map(
          (k) => `
          <div class="kf-row">
            <span class="${k.killerTeam}">${k.killer}</span>
            <span class="kf-wpn">[${k.weapon}${k.headshot ? ' ⌖' : ''}]</span>
            <span class="${k.victimTeam}">${k.victim}</span>
          </div>`,
        )
        .join('');
    }

    this._renderMinimap(player, actors, objective);
  }

  _renderMinimap(player, actors, objective) {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.5, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const scale = 3.2;
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(player.yaw);

    const drawX = (wx) => (wx - player.x) * scale;
    const drawY = (wz) => (wz - player.z) * scale;

    ctx.strokeStyle = objective.planted ? '#ef4444' : '#10b981';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(drawX(PLANT_ZONE.x), drawY(PLANT_ZONE.z), PLANT_ZONE.radius * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    for (const col of SECTOR_09_COLLIDERS) {
      if (col.tag === 'catwalk_cover') continue;
      ctx.fillRect(
        drawX(col.minX),
        drawY(col.minZ),
        Math.max(2, (col.maxX - col.minX) * scale),
        Math.max(2, (col.maxZ - col.minZ) * scale),
      );
    }

    if (objective.planted) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(drawX(objective.position.x), drawY(objective.position.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const actor of actors) {
      if (!actor.alive || actor.isPlayer) continue;
      if (actor.team === player.team) {
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(drawX(actor.x), drawY(actor.z), 3.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (actor.targetEnemy) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(drawX(actor.x), drawY(actor.z), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.lineTo(w * 0.5 - 26, h * 0.5 - 48);
    ctx.lineTo(w * 0.5 + 26, h * 0.5 - 48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5 - 6);
    ctx.lineTo(w * 0.5 + 4.5, h * 0.5 + 4.5);
    ctx.lineTo(w * 0.5, h * 0.5 + 2);
    ctx.lineTo(w * 0.5 - 4.5, h * 0.5 + 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
