import { ARMOR_ITEMS, WEAPONS, createWeaponInstance, getUpgradedWeaponSpec } from './weapons.js';

export const ECONOMY_CONFIG = {
  START_CREDITS: 1400,
  MAX_CREDITS: 16000,
  KILL_REWARD: 300,
  ASSIST_REWARD: 150,
  PLANT_REWARD: 300,
  DEFUSE_REWARD: 300,
  WIN_REWARD: 3000,
  OBJECTIVE_WIN_BONUS: 250,
  LOSS_BASE: 1900,
  LOSS_STREAK_STEP: 500,
  MAX_LOSS_STREAK: 4,
};

export function clampCredits(amount) {
  return Math.max(0, Math.min(ECONOMY_CONFIG.MAX_CREDITS, Math.round(amount)));
}

export function calculateRoundReward(won, lossStreak, objectiveCompleted = false) {
  if (won) {
    return ECONOMY_CONFIG.WIN_REWARD + (objectiveCompleted ? ECONOMY_CONFIG.OBJECTIVE_WIN_BONUS : 0);
  }
  const streak = Math.min(Math.max(0, lossStreak), ECONOMY_CONFIG.MAX_LOSS_STREAK);
  return ECONOMY_CONFIG.LOSS_BASE + streak * ECONOMY_CONFIG.LOSS_STREAK_STEP;
}

export function canPurchaseItem(actor, itemId) {
  if (!actor) return { ok: false, reason: 'Invalid actor', cost: 0 };

  if (ARMOR_ITEMS[itemId]) {
    const armorItem = ARMOR_ITEMS[itemId];
    if (actor.armor >= armorItem.armor) {
      return { ok: false, reason: 'Already equipped', cost: armorItem.cost };
    }
    if (actor.credits < armorItem.cost) {
      return { ok: false, reason: 'Not enough Cash', cost: armorItem.cost };
    }
    return { ok: true, reason: '', cost: armorItem.cost };
  }

  const weapon = WEAPONS[itemId];
  if (!weapon) return { ok: false, reason: 'Unknown item', cost: 0 };

  const spec = getUpgradedWeaponSpec(weapon.id, actor.weaponUpgrades);
  if (actor.loadout?.[weapon.slot]?.id === weapon.id && actor.loadout[weapon.slot].ammo === spec.magSize) {
    return { ok: false, reason: 'Equipped', cost: weapon.cost };
  }
  if (actor.credits < weapon.cost) {
    return { ok: false, reason: 'Not enough Cash', cost: weapon.cost };
  }
  return { ok: true, reason: '', cost: weapon.cost };
}

export function purchaseItem(actor, itemId) {
  const check = canPurchaseItem(actor, itemId);
  if (!check.ok) return check;

  if (ARMOR_ITEMS[itemId]) {
    const armorItem = ARMOR_ITEMS[itemId];
    actor.credits = clampCredits(actor.credits - armorItem.cost);
    actor.armor = armorItem.armor;
    return { ok: true, reason: `Purchased ${armorItem.name}`, cost: armorItem.cost, type: 'armor' };
  }

  const weapon = WEAPONS[itemId];
  actor.credits = clampCredits(actor.credits - weapon.cost);
  actor.loadout[weapon.slot] = createWeaponInstance(weapon.id, actor.weaponUpgrades);
  actor.activeSlot = weapon.slot;
  return { ok: true, reason: `Purchased ${weapon.name}`, cost: weapon.cost, type: 'weapon', slot: weapon.slot };
}

export function selectBotBuy(bot, teamWonPrev, roundNumber) {
  if (!bot) return [];
  const bought = [];
  if (roundNumber === 1) {
    if (bot.credits >= ARMOR_ITEMS.kevlar.cost && bot.personality !== 'sharpshooter') {
      const res = purchaseItem(bot, 'kevlar');
      if (res.ok) bought.push('kevlar');
    }
    return bought;
  }

  const desiredByPersonality = {
    aggressor: ['lancer4', 'arx17', 'vektor9', 'hawk12'],
    defender: ['m4k', 'arx17', 'lancer4', 'vektor9'],
    flanker: ['vektor9', 'hawk12', 'lancer4'],
    support: ['arx17', 'lancer4', 'vektor9'],
    sharpshooter: ['longshot', 'm4k', 'lancer4'],
  };

  const prefs = desiredByPersonality[bot.personality] || ['arx17', 'vektor9'];
  const reserveFloor = teamWonPrev ? 0 : 900;

  if (!bot.loadout.primary) {
    for (const wId of prefs) {
      const cost = WEAPONS[wId].cost;
      if (bot.credits - cost >= reserveFloor || bot.credits >= cost + 400) {
        const res = purchaseItem(bot, wId);
        if (res.ok) {
          bought.push(wId);
          break;
        }
      }
    }
  }

  if (bot.armor < 50 && bot.credits >= ARMOR_ITEMS.heavy.cost) {
    const res = purchaseItem(bot, 'heavy');
    if (res.ok) bought.push('heavy');
  } else if (bot.armor < 25 && bot.credits >= ARMOR_ITEMS.kevlar.cost) {
    const res = purchaseItem(bot, 'kevlar');
    if (res.ok) bought.push('kevlar');
  }

  return bought;
}
