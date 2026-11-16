const STORAGE_KEY = 'blitz_fps_settings_v2';

export const SCOREBOARD_DESIGNS = [
  { id: 'classic', name: 'Classic Split', desc: 'Clean side-by-side team sheets with K/A/D/HS%/DMG' },
  { id: 'compact', name: 'Compact Strip', desc: 'Condensed low-profile scoreboard overlay' },
  { id: 'broadcast', name: 'Tournament Card', desc: 'Bold emerald & cinder match banner headers' },
  { id: 'detailed', name: 'Full Telemetry', desc: 'Shows badge, weapon, K/A/D, HS%, DMG, and Cash' },
];

export const TIMER_PRESETS = [
  { id: 45, label: '45s Fast' },
  { id: 60, label: '60s Crisp' },
  { id: 90, label: '90s Standard' },
  { id: 120, label: '120s Tactical' },
  { id: 180, label: '180s Extended' },
];

export const GAME_MODES = [
  { id: 'bomb_defusal', name: 'Bomb Defusal', short: 'Defusal', desc: 'Plant or defuse the Core Charge across 5v5 rounds.' },
  { id: 'team_deathmatch', name: 'Team Deathmatch', short: 'TDM', desc: 'Fast squad respawns. First team to 25 kills wins.' },
  { id: 'control_zone', name: 'Control Zone', short: 'Control', desc: 'Hold the central sector to push team capture to 100%.' },
  { id: 'elimination', name: 'Squad Elimination', short: 'Elim', desc: 'Pure 5v5 gunplay with zero respawns until one side stands.' },
];

export const DEFAULT_SETTINGS = {
  sensitivity: 1.0,
  invertY: false,
  masterVolume: 0.85,
  sfxVolume: 0.9,
  muted: false,
  crosshairStyle: 'dynamic', // 'dynamic' | 'tactical' | 'dot' | 'cross'
  minimapSize: 'medium',     // 'small' | 'medium' | 'large'
  mobileOpacity: 0.78,
  mobileScale: 1.0,

  textureQuality: 'high',    // 'fast' | 'balanced' | 'high'
  animationLevel: 'standard',// 'minimal' | 'standard' | 'expressive'
  graphicsQuality: 'high',   // 'low' | 'medium' | 'high'
  shadowsEnabled: true,
  fogEnabled: true,
  fov: 74,
  exposure: 1.15,

  scoreboardDesign: 'classic', // 'classic' | 'compact' | 'broadcast' | 'detailed'
  roundTimerSeconds: 90,
  roundsToWin: 5,
  selectedMapId: 'kilnyard',
  selectedModeId: 'bomb_defusal',
};

export function loadSettings() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sensitivity: clampNum(parsed.sensitivity, 0.3, 2.5, DEFAULT_SETTINGS.sensitivity),
      masterVolume: clampNum(parsed.masterVolume, 0, 1, DEFAULT_SETTINGS.masterVolume),
      sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULT_SETTINGS.sfxVolume),
      mobileOpacity: clampNum(parsed.mobileOpacity, 0.35, 1, DEFAULT_SETTINGS.mobileOpacity),
      mobileScale: clampNum(parsed.mobileScale, 0.75, 1.35, DEFAULT_SETTINGS.mobileScale),
      fov: clampNum(parsed.fov, 65, 95, DEFAULT_SETTINGS.fov),
      exposure: clampNum(parsed.exposure, 0.85, 1.45, DEFAULT_SETTINGS.exposure),
      roundTimerSeconds: [45, 60, 90, 120, 180].includes(Number(parsed.roundTimerSeconds))
        ? Number(parsed.roundTimerSeconds)
        : DEFAULT_SETTINGS.roundTimerSeconds,
      roundsToWin: [3, 5, 7].includes(Number(parsed.roundsToWin))
        ? Number(parsed.roundsToWin)
        : DEFAULT_SETTINGS.roundsToWin,
      invertY: Boolean(parsed.invertY),
      muted: Boolean(parsed.muted),
      shadowsEnabled: parsed.shadowsEnabled !== false,
      fogEnabled: parsed.fogEnabled !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage restrictions
  }
}

export function resetSettings() {
  const fresh = { ...DEFAULT_SETTINGS };
  saveSettings(fresh);
  return fresh;
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
