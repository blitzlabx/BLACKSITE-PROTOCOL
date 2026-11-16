import { UPGRADE_TRACKS, WEAPON_FINISHES, WEAPONS } from './weapons.js';

const PROFILE_STORAGE_KEY = 'blitz_fps_profile_v2';

export const CHARACTERS = [
  {
    id: 'callan',
    codename: 'Vanguard',
    name: 'Callan Mercer',
    role: 'Point Breacher',
    origin: 'Edinburgh',
    bio: 'Leads tight site entries and keeps clean crosshairs under pressure.',
    headColor: 0xd6b49c,
    visorTint: 0x10b981,
    helmetStyle: 'tactical',
    stats: { health: 92, speed: 78, armor: 85, offense: 8, defense: 7, mobility: 7, tech: 5 },
  },
  {
    id: 'reyes',
    codename: 'Spectre',
    name: 'Elena Reyes',
    role: 'Recon Marksman',
    origin: 'Monterrey',
    bio: 'Patient lane anchor built for clean long-angle picks and rotations.',
    headColor: 0xc99c7c,
    visorTint: 0x34d399,
    helmetStyle: 'recon',
    stats: { health: 84, speed: 92, armor: 72, offense: 9, defense: 5, mobility: 9, tech: 7 },
  },
  {
    id: 'nadia',
    codename: 'Medic',
    name: 'Nadia Lindqvist',
    role: 'Tactical Support',
    origin: 'Gothenburg',
    bio: 'Keeps squad utility stocked and holds post-plant crossfires.',
    headColor: 0xe6c8b6,
    visorTint: 0x38bdf8,
    helmetStyle: 'comms',
    stats: { health: 96, speed: 80, armor: 82, offense: 6, defense: 8, mobility: 7, tech: 9 },
  },
  {
    id: 'kovac',
    codename: 'Sentinel',
    name: 'Tomas Kovac',
    role: 'Heavy Anchor',
    origin: 'Brno',
    bio: 'Armored site defender built to lock down central lanes.',
    headColor: 0xd4ac94,
    visorTint: 0xf59e0b,
    helmetStyle: 'heavy',
    stats: { health: 100, speed: 68, armor: 98, offense: 7, defense: 10, mobility: 5, tech: 6 },
  },
  {
    id: 'vance',
    codename: 'Engineer',
    name: 'Marcus Vance',
    role: 'Breach Specialist',
    origin: 'Detroit',
    bio: 'Demolitions engineer built for fast plants and rapid site defusals.',
    headColor: 0x9c745b,
    visorTint: 0xfbbf24,
    helmetStyle: 'comms',
    stats: { health: 90, speed: 76, armor: 88, offense: 7, defense: 8, mobility: 6, tech: 10 },
  },
  {
    id: 'sato',
    codename: 'Phantom',
    name: 'Kira Sato',
    role: 'Flank Duelist',
    origin: 'Sapporo',
    bio: 'Silent tunnel flanker built for high-tempo mid-round collapses.',
    headColor: 0xe7cab8,
    visorTint: 0x34d399,
    helmetStyle: 'recon',
    stats: { health: 86, speed: 95, armor: 74, offense: 9, defense: 6, mobility: 10, tech: 7 },
  },
];

export const OUTFITS = [
  {
    id: 'emerald_spec',
    name: 'Emerald Field Kit',
    cost: 0,
    fabricHex: 0x1e293b,
    armorHex: 0x334155,
    trimHex: 0x10b981,
    visorHex: 0x34d399,
    desc: 'Standard issue slate weave with emerald trim.',
  },
  {
    id: 'silver_crest',
    name: 'Silver Crest',
    cost: 650,
    fabricHex: 0x475569,
    armorHex: 0xe2e8f0,
    trimHex: 0x059669,
    visorHex: 0x10b981,
    desc: 'Brushed platinum plates over reinforced slate.',
  },
  {
    id: 'arctic_frost',
    name: 'Arctic Parka',
    cost: 950,
    fabricHex: 0xcbd5e1,
    armorHex: 0xf8fafc,
    trimHex: 0x047857,
    visorHex: 0x6ee7b7,
    desc: 'High-altitude white ceramic vest for cold stations.',
  },
  {
    id: 'timber_ranger',
    name: 'Timber Ranger',
    cost: 1100,
    fabricHex: 0x2d3b2d,
    armorHex: 0x43533f,
    trimHex: 0x84cc16,
    visorHex: 0xfacc15,
    desc: 'Forest olive rig tuned for alpine ridgelines.',
  },
  {
    id: 'cinder_ops',
    name: 'Cinder Dusk',
    cost: 1350,
    fabricHex: 0x292524,
    armorHex: 0x57534e,
    trimHex: 0xea580c,
    visorHex: 0xfbbf24,
    desc: 'Warm charcoal plates accented with amber stripes.',
  },
];

export const BADGES = [
  {
    id: 'blitz_founder',
    name: 'BLITZ Crest',
    cost: 0,
    color: '#059669',
    hex: 0x10b981,
    short: 'BZ',
    desc: 'Official BLITZ league insignia.',
  },
  {
    id: 'first_blood',
    name: 'Opening Pick',
    cost: 400,
    color: '#0d9488',
    hex: 0x14b8a6,
    short: 'OP',
    desc: 'Awarded to entry duelists who strike first.',
  },
  {
    id: 'sharpshooter',
    name: 'Deadeye',
    cost: 700,
    color: '#0284c7',
    hex: 0x38bdf8,
    short: 'DE',
    desc: 'Crosshair discipline and clean headshot rate.',
  },
  {
    id: 'demolition',
    name: 'Site Breacher',
    cost: 850,
    color: '#d97706',
    hex: 0xf59e0b,
    short: 'SB',
    desc: 'For relentless planters and defusers.',
  },
  {
    id: 'ace_clutch',
    name: 'Clutch Crown',
    cost: 1200,
    color: '#10b981',
    hex: 0x34d399,
    short: 'CC',
    desc: 'Reserve emblem for last-second round saves.',
  },
  {
    id: 'veteran_star',
    name: 'Silver Star',
    cost: 1500,
    color: '#475569',
    hex: 0xe2e8f0,
    short: 'SS',
    desc: 'Platinum service star worn by top squad leads.',
  },
];

export function createDefaultProfile() {
  return {
    credits: 3200,
    selectedCharacter: 'callan',
    selectedOutfit: 'emerald_spec',
    selectedWeapon: 'arx17',
    selectedFinish: 'factory',
    selectedBadge: 'blitz_founder',
    unlockedCharacters: ['callan', 'reyes', 'nadia', 'kovac', 'vance', 'sato'],
    unlockedOutfits: ['emerald_spec'],
    unlockedWeapons: ['kestrel', 'vektor9', 'hawk12', 'arx17', 'm4k', 'longshot'],
    unlockedFinishes: ['factory'],
    unlockedBadges: ['blitz_founder'],
    weaponUpgrades: {
      arx17: { barrel: 0, trigger: 0, magazine: 0, stock: 0 },
    },
    stats: {
      matchesPlayed: 0,
      wins: 0,
      kills: 0,
      assists: 0,
      deaths: 0,
      headshots: 0,
      damageDealt: 0,
    },
    matchHistory: [],
  };
}

export function loadProfile() {
  const base = createDefaultProfile();
  try {
    const raw = window.localStorage?.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      credits: Number.isFinite(parsed.credits) ? Math.max(0, Math.round(parsed.credits)) : base.credits,
      unlockedOutfits: Array.isArray(parsed.unlockedOutfits) ? parsed.unlockedOutfits : base.unlockedOutfits,
      unlockedWeapons: Array.isArray(parsed.unlockedWeapons) ? parsed.unlockedWeapons : base.unlockedWeapons,
      unlockedFinishes: Array.isArray(parsed.unlockedFinishes) ? parsed.unlockedFinishes : base.unlockedFinishes,
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : base.unlockedBadges,
      weaponUpgrades: parsed.weaponUpgrades && typeof parsed.weaponUpgrades === 'object' ? parsed.weaponUpgrades : base.weaponUpgrades,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      matchHistory: Array.isArray(parsed.matchHistory) ? parsed.matchHistory.slice(0, 20) : [],
    };
  } catch {
    return base;
  }
}

export function saveProfile(profile) {
  try {
    window.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota / private mode
  }
}

export function getCharacterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function getOutfitById(id) {
  return OUTFITS.find((o) => o.id === id) || OUTFITS[0];
}

export function getBadgeById(id) {
  return BADGES.find((b) => b.id === id) || BADGES[0];
}

export function getFinishById(id) {
  return WEAPON_FINISHES[id] || WEAPON_FINISHES.factory;
}

export function unlockShopItem(profile, category, itemId) {
  let cost = 0;
  let unlockedArrKey = '';
  let equipKey = '';

  if (category === 'outfit') {
    const item = OUTFITS.find((o) => o.id === itemId);
    if (!item) return { ok: false, reason: 'Unknown outfit' };
    cost = item.cost;
    unlockedArrKey = 'unlockedOutfits';
    equipKey = 'selectedOutfit';
  } else if (category === 'finish') {
    const item = WEAPON_FINISHES[itemId];
    if (!item) return { ok: false, reason: 'Unknown finish' };
    cost = item.cost;
    unlockedArrKey = 'unlockedFinishes';
    equipKey = 'selectedFinish';
  } else if (category === 'badge') {
    const item = BADGES.find((b) => b.id === itemId);
    if (!item) return { ok: false, reason: 'Unknown badge' };
    cost = item.cost;
    unlockedArrKey = 'unlockedBadges';
    equipKey = 'selectedBadge';
  } else if (category === 'weapon') {
    const item = WEAPONS[itemId];
    if (!item) return { ok: false, reason: 'Unknown weapon' };
    cost = item.shopCost || 0;
    unlockedArrKey = 'unlockedWeapons';
    equipKey = 'selectedWeapon';
  } else {
    return { ok: false, reason: 'Invalid category' };
  }

  if (profile[unlockedArrKey].includes(itemId)) {
    profile[equipKey] = itemId;
    saveProfile(profile);
    return { ok: true, equipped: true };
  }
  if (profile.credits < cost) {
    return { ok: false, reason: 'Not enough Cash' };
  }
  profile.credits -= cost;
  profile[unlockedArrKey].push(itemId);
  profile[equipKey] = itemId;
  saveProfile(profile);
  return { ok: true, equipped: true, cost };
}

export function upgradeWeaponTrack(profile, weaponId, trackId) {
  const track = UPGRADE_TRACKS.find((t) => t.id === trackId);
  if (!track) return { ok: false, reason: 'Unknown upgrade' };
  if (!profile.weaponUpgrades[weaponId]) {
    profile.weaponUpgrades[weaponId] = { barrel: 0, trigger: 0, magazine: 0, stock: 0 };
  }
  const currentLvl = profile.weaponUpgrades[weaponId][trackId] || 0;
  if (currentLvl >= track.maxLevel) {
    return { ok: false, reason: 'Max tier reached' };
  }
  const cost = track.costs[currentLvl];
  if (profile.credits < cost) {
    return { ok: false, reason: 'Not enough Cash' };
  }
  profile.credits -= cost;
  profile.weaponUpgrades[weaponId][trackId] = currentLvl + 1;
  saveProfile(profile);
  return { ok: true, newLevel: currentLvl + 1, cost };
}

export function recordMatchResult(profile, summary) {
  profile.stats.matchesPlayed += 1;
  if (summary.won) profile.stats.wins += 1;
  profile.stats.kills += summary.kills || 0;
  profile.stats.assists += summary.assists || 0;
  profile.stats.deaths += summary.deaths || 0;
  profile.stats.headshots += summary.headshots || 0;
  profile.stats.damageDealt += summary.damageDealt || 0;

  const rewardCredits = (summary.won ? 650 : 300) + (summary.kills || 0) * 60 + (summary.headshots || 0) * 25;
  profile.credits += rewardCredits;

  profile.matchHistory.unshift({
    id: `${Date.now()}`,
    mapName: summary.mapName,
    modeName: summary.modeName,
    won: Boolean(summary.won),
    scoreText: summary.scoreText,
    kills: summary.kills || 0,
    assists: summary.assists || 0,
    deaths: summary.deaths || 0,
    damage: summary.damageDealt || 0,
    rewardCredits,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  });
  if (profile.matchHistory.length > 15) {
    profile.matchHistory.length = 15;
  }
  saveProfile(profile);
  return rewardCredits;
}
