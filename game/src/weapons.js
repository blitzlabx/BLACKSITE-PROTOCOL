export const WEAPON_SLOTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};

export const WEAPONS = {
  kestrel: {
    id: 'kestrel',
    name: 'Kestrel P9',
    category: 'Sidearm',
    slot: WEAPON_SLOTS.SECONDARY,
    cost: 400,
    shopCost: 0,
    damage: 32,
    headshotMult: 2.6,
    fireRate: 0.19,
    automatic: false,
    magSize: 12,
    reserveSize: 48,
    reloadTime: 1.35,
    pellets: 1,
    baseSpread: 0.005,
    moveSpread: 0.018,
    crouchMult: 0.65,
    recoilPitch: 0.018,
    recoilYaw: 0.007,
    recoilRecovery: 9.0,
    range: 70,
    moveSpeedMult: 1.0,
    zoomFov: 68,
    color: 0x4b5563,
    accent: 0x10b981,
    barrelType: 'pistol',
    role: 'Crisp semi-auto sidearm for clean eco rounds',
  },
  mallet44: {
    id: 'mallet44',
    name: 'Mallet .44',
    category: 'Heavy Pistol',
    slot: WEAPON_SLOTS.SECONDARY,
    cost: 750,
    shopCost: 900,
    damage: 54,
    headshotMult: 2.5,
    fireRate: 0.36,
    automatic: false,
    magSize: 6,
    reserveSize: 30,
    reloadTime: 1.75,
    pellets: 1,
    baseSpread: 0.0028,
    moveSpread: 0.025,
    crouchMult: 0.58,
    recoilPitch: 0.036,
    recoilYaw: 0.01,
    recoilRecovery: 8.2,
    range: 88,
    moveSpeedMult: 0.98,
    zoomFov: 64,
    color: 0xcbd5e1,
    accent: 0x059669,
    barrelType: 'revolver',
    role: 'High-caliber revolver that punishes wide peeks',
  },
  vektor9: {
    id: 'vektor9',
    name: 'Vektor-9',
    category: 'SMG',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 1250,
    shopCost: 0,
    damage: 23,
    headshotMult: 2.05,
    fireRate: 0.068,
    automatic: true,
    magSize: 32,
    reserveSize: 96,
    reloadTime: 1.65,
    pellets: 1,
    baseSpread: 0.013,
    moveSpread: 0.02,
    crouchMult: 0.72,
    recoilPitch: 0.011,
    recoilYaw: 0.011,
    recoilRecovery: 10.5,
    range: 48,
    moveSpeedMult: 0.98,
    zoomFov: 65,
    color: 0x334155,
    accent: 0x10b981,
    barrelType: 'smg',
    role: 'Fast-handling SMG built for tight entries',
  },
  hawk12: {
    id: 'hawk12',
    name: 'HAWK-12',
    category: 'Shotgun',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 1600,
    shopCost: 0,
    damage: 18,
    headshotMult: 1.5,
    fireRate: 0.78,
    automatic: false,
    magSize: 6,
    reserveSize: 24,
    reloadTime: 2.1,
    pellets: 8,
    baseSpread: 0.062,
    moveSpread: 0.015,
    crouchMult: 0.85,
    recoilPitch: 0.048,
    recoilYaw: 0.016,
    recoilRecovery: 7.0,
    range: 26,
    moveSpeedMult: 0.95,
    zoomFov: 68,
    color: 0x374151,
    accent: 0xea580c,
    barrelType: 'shotgun',
    role: '8-pellet pump shotgun for close corner holds',
  },
  arx17: {
    id: 'arx17',
    name: 'ARX-17',
    category: 'Assault Rifle',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 2700,
    shopCost: 0,
    damage: 34,
    headshotMult: 2.5,
    fireRate: 0.098,
    automatic: true,
    magSize: 30,
    reserveSize: 90,
    reloadTime: 1.95,
    pellets: 1,
    baseSpread: 0.0045,
    moveSpread: 0.036,
    crouchMult: 0.6,
    recoilPitch: 0.017,
    recoilYaw: 0.012,
    recoilRecovery: 8.5,
    range: 92,
    moveSpeedMult: 0.91,
    zoomFov: 60,
    color: 0x262f3b,
    accent: 0x10b981,
    barrelType: 'rifle',
    role: 'Dependable full-auto rifle for mid-range duels',
  },
  lancer4: {
    id: 'lancer4',
    name: 'Lancer R4',
    category: 'Tactical Carbine',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 2950,
    shopCost: 1400,
    damage: 33,
    headshotMult: 2.55,
    fireRate: 0.09,
    automatic: true,
    magSize: 25,
    reserveSize: 75,
    reloadTime: 1.78,
    pellets: 1,
    baseSpread: 0.0036,
    moveSpread: 0.03,
    crouchMult: 0.56,
    recoilPitch: 0.014,
    recoilYaw: 0.009,
    recoilRecovery: 9.8,
    range: 98,
    moveSpeedMult: 0.93,
    zoomFov: 56,
    color: 0x475569,
    accent: 0x34d399,
    barrelType: 'carbine',
    role: 'Integrated optic carbine with tight burst control',
  },
  m4k: {
    id: 'm4k',
    name: 'M4K Marksman',
    category: 'Marksman Rifle',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 3200,
    shopCost: 0,
    damage: 52,
    headshotMult: 2.6,
    fireRate: 0.24,
    automatic: false,
    magSize: 20,
    reserveSize: 60,
    reloadTime: 2.05,
    pellets: 1,
    baseSpread: 0.0018,
    moveSpread: 0.042,
    crouchMult: 0.55,
    recoilPitch: 0.025,
    recoilYaw: 0.008,
    recoilRecovery: 9.5,
    range: 118,
    moveSpeedMult: 0.89,
    zoomFov: 48,
    color: 0x1f2937,
    accent: 0x059669,
    barrelType: 'dmr',
    role: 'Heavy semi-auto DMR with crisp two-shot body drop',
  },
  longshot: {
    id: 'longshot',
    name: 'Longshot M7',
    category: 'Sniper Rifle',
    slot: WEAPON_SLOTS.PRIMARY,
    cost: 4500,
    shopCost: 0,
    damage: 115,
    headshotMult: 2.5,
    fireRate: 1.25,
    automatic: false,
    magSize: 5,
    reserveSize: 15,
    reloadTime: 2.45,
    pellets: 1,
    baseSpread: 0.0007,
    moveSpread: 0.095,
    crouchMult: 0.5,
    recoilPitch: 0.062,
    recoilYaw: 0.014,
    recoilRecovery: 5.5,
    range: 155,
    moveSpeedMult: 0.82,
    zoomFov: 28,
    isScoped: true,
    color: 0x1e293b,
    accent: 0x10b981,
    barrelType: 'sniper',
    role: 'Long-range bolt-action rifle for lane lockdowns',
  },
};

export const ARMOR_ITEMS = {
  kevlar: {
    id: 'kevlar',
    name: 'Light Kevlar',
    cost: 650,
    armor: 50,
    role: '50 Armor · Absorbs 45% body damage',
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy Vest + Helm',
    cost: 1000,
    armor: 100,
    role: '100 Armor · Full ballistic protection',
  },
};

export const WEAPON_FINISHES = {
  factory: {
    id: 'factory',
    name: 'Factory Slate',
    cost: 0,
    bodyHex: 0x2d3748,
    accentHex: 0x10b981,
    metalness: 0.68,
    roughness: 0.42,
    previewCss: 'linear-gradient(135deg, #334155, #10b981)',
  },
  silver_alloy: {
    id: 'silver_alloy',
    name: 'Brushed Silver',
    cost: 500,
    bodyHex: 0xcbd5e1,
    accentHex: 0x059669,
    metalness: 0.85,
    roughness: 0.24,
    previewCss: 'linear-gradient(135deg, #e2e8f0, #64748b)',
  },
  emerald_edge: {
    id: 'emerald_edge',
    name: 'Emerald Carbon',
    cost: 900,
    bodyHex: 0x064e3b,
    accentHex: 0x34d399,
    metalness: 0.6,
    roughness: 0.34,
    previewCss: 'linear-gradient(135deg, #065f46, #34d399)',
  },
  arctic_white: {
    id: 'arctic_white',
    name: 'Arctic Ceramic',
    cost: 1100,
    bodyHex: 0xf1f5f9,
    accentHex: 0x047857,
    metalness: 0.32,
    roughness: 0.3,
    previewCss: 'linear-gradient(135deg, #ffffff, #cbd5e1)',
  },
  terracotta: {
    id: 'terracotta',
    name: 'Sunbaked Bronze',
    cost: 1200,
    bodyHex: 0x7c2d12,
    accentHex: 0xf59e0b,
    metalness: 0.55,
    roughness: 0.44,
    previewCss: 'linear-gradient(135deg, #9a3412, #f59e0b)',
  },
  obsidian_gold: {
    id: 'obsidian_gold',
    name: 'Obsidian Crest',
    cost: 1600,
    bodyHex: 0x111827,
    accentHex: 0xfbbf24,
    metalness: 0.88,
    roughness: 0.22,
    previewCss: 'linear-gradient(135deg, #111827, #fbbf24)',
  },
};

export const UPGRADE_TRACKS = [
  {
    id: 'barrel',
    name: 'Rifled Barrel',
    desc: '+6% damage & extended range per tier',
    maxLevel: 3,
    costs: [450, 800, 1250],
  },
  {
    id: 'trigger',
    name: 'Match Trigger',
    desc: '+6% faster fire rate per tier',
    maxLevel: 3,
    costs: [450, 800, 1250],
  },
  {
    id: 'magazine',
    name: 'Extended Mag',
    desc: '+15% magazine capacity & faster reload',
    maxLevel: 3,
    costs: [350, 650, 1000],
  },
  {
    id: 'stock',
    name: 'Recoil Stabilizer',
    desc: '-12% recoil & tighter spread per tier',
    maxLevel: 3,
    costs: [400, 750, 1150],
  },
];

export const WEAPON_LIST = [
  WEAPONS.vektor9,
  WEAPONS.hawk12,
  WEAPONS.arx17,
  WEAPONS.lancer4,
  WEAPONS.m4k,
  WEAPONS.longshot,
  WEAPONS.kestrel,
  WEAPONS.mallet44,
];

export function getWeaponSpec(weaponId) {
  return WEAPONS[weaponId] || WEAPONS.kestrel;
}

export function getUpgradedWeaponSpec(weaponId, weaponUpgrades = null) {
  const base = getWeaponSpec(weaponId);
  if (!weaponUpgrades || !weaponUpgrades[base.id]) return base;

  const u = weaponUpgrades[base.id];
  const barrelLvl = Math.max(0, Math.min(3, u.barrel || 0));
  const triggerLvl = Math.max(0, Math.min(3, u.trigger || 0));
  const magLvl = Math.max(0, Math.min(3, u.magazine || 0));
  const stockLvl = Math.max(0, Math.min(3, u.stock || 0));

  const magMult = 1 + magLvl * 0.15;
  const magSize = Math.round(base.magSize * magMult);
  const reserveSize = Math.round(base.reserveSize * magMult);

  return {
    ...base,
    damage: Math.round(base.damage * (1 + barrelLvl * 0.06)),
    range: Math.round(base.range * (1 + barrelLvl * 0.08)),
    fireRate: Number((base.fireRate * Math.pow(0.94, triggerLvl)).toFixed(4)),
    magSize,
    reserveSize,
    reloadTime: Number((base.reloadTime * Math.pow(0.93, magLvl)).toFixed(2)),
    baseSpread: base.baseSpread * Math.pow(0.88, stockLvl),
    moveSpread: base.moveSpread * Math.pow(0.9, stockLvl),
    recoilPitch: base.recoilPitch * Math.pow(0.88, stockLvl),
    recoilYaw: base.recoilYaw * Math.pow(0.88, stockLvl),
    upgrades: { barrel: barrelLvl, trigger: triggerLvl, magazine: magLvl, stock: stockLvl },
  };
}

export function createWeaponInstance(weaponId, weaponUpgrades = null) {
  const spec = getUpgradedWeaponSpec(weaponId, weaponUpgrades);
  return {
    id: spec.id,
    ammo: spec.magSize,
    reserve: spec.reserveSize,
  };
}

export function computeShotSpread(weapon, { moveSpeed = 0, isCrouched = false, isScoped = false, burstCount = 0 } = {}) {
  const speedNorm = Math.min(moveSpeed / 6.2, 1.3);
  let spread = weapon.baseSpread + weapon.moveSpread * speedNorm;
  if (isCrouched) spread *= weapon.crouchMult;
  if (isScoped) spread *= weapon.isScoped ? 0.18 : 0.62;
  const burstPenalty = Math.min(burstCount, 10) * (weapon.automatic ? 0.0032 : 0.0045);
  return spread + burstPenalty;
}

export function computeRecoilKick(weapon, burstCount = 0) {
  const climb = weapon.recoilPitch * (1 + Math.min(burstCount, 8) * 0.08);
  const patternPhase = Math.sin(burstCount * 1.45) + (burstCount % 3 === 0 ? 0.35 : -0.25);
  const yaw = weapon.recoilYaw * patternPhase;
  return { pitch: climb, yaw };
}

export function computeDamage(weapon, { isHeadshot = false, distance = 0, targetArmor = 0 } = {}) {
  let raw = weapon.damage;
  if (weapon.id === 'hawk12') {
    const falloff = Math.max(0.25, 1 - Math.max(0, distance - 7) / 19);
    raw *= falloff;
  } else if (weapon.id === 'vektor9') {
    const falloff = Math.max(0.55, 1 - Math.max(0, distance - 16) / 36);
    raw *= falloff;
  }

  if (isHeadshot) {
    raw *= weapon.headshotMult;
  }

  let hpDamage = raw;
  let armorDamage = 0;
  if (targetArmor > 0) {
    const absorbRatio = isHeadshot ? 0.25 : 0.45;
    const absorbed = Math.min(targetArmor, raw * absorbRatio);
    armorDamage = Math.ceil(absorbed);
    hpDamage = Math.max(1, Math.round(raw - absorbed));
  } else {
    hpDamage = Math.round(raw);
  }

  return { hpDamage, armorDamage };
}
