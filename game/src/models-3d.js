import * as THREE from 'three';
import { getWeaponSpec, WEAPON_FINISHES } from './weapons.js';
import { getBadgeById, getCharacterById, getOutfitById } from './profile.js';

function makeEngravedPlateTexture(text, bgHex, fgHex) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 56);
  ctx.fillStyle = fgHex;
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWeaponModel(weaponSpecOrId, { finishId = 'factory', upgrades = null, forViewmodel = false } = {}) {
  const spec = typeof weaponSpecOrId === 'string' ? getWeaponSpec(weaponSpecOrId) : weaponSpecOrId;
  const finish = WEAPON_FINISHES[finishId] || WEAPON_FINISHES.factory;

  const u = upgrades || spec.upgrades || { barrel: 0, trigger: 0, magazine: 0, stock: 0 };
  const barrelLvl = u.barrel || 0;
  const triggerLvl = u.trigger || 0;
  const magLvl = u.magazine || 0;
  const stockLvl = u.stock || 0;

  const g = new THREE.Group();
  const bodyColor = finishId === 'factory' ? spec.color : finish.bodyHex;
  const accentColor = finishId === 'factory' ? spec.accent : finish.accentHex;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: finish.roughness ?? 0.38,
    metalness: finish.metalness ?? 0.72,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.55,
    metalness: 0.58,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.28,
    metalness: 0.45,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.85,
    metalness: 0.1,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: accentColor });

  let mag = null;
  let magBaseY = -0.078;

  if (spec.barrelType === 'pistol' || spec.barrelType === 'revolver') {
    const isRev = spec.barrelType === 'revolver';
    const slideLen = isRev ? 0.25 : 0.23;

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.04, slideLen), bodyMat);
    slide.position.set(0, 0.025, -0.06);
    g.add(slide);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.008, slideLen * 0.72), darkMat);
    topRail.position.set(0, 0.048, -0.06);
    g.add(topRail);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.2), darkMat);
    frame.position.set(0, -0.006, -0.045);
    g.add(frame);

    if (isRev) {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.056, 12), chromeMat);
      cylinder.rotation.x = Math.PI * 0.5;
      cylinder.position.set(0, 0.02, -0.03);
      g.add(cylinder);
    }

    const barrelLen = 0.04 + barrelLvl * 0.035;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(barrelLvl > 0 ? 0.014 : 0.011, barrelLvl > 0 ? 0.015 : 0.011, barrelLen, 10),
      barrelLvl > 0 ? accentMat : chromeMat,
    );
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.023, -0.175 - barrelLen * 0.5);
    g.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.112, 0.052), darkMat);
    grip.position.set(0, -0.052, 0.022);
    grip.rotation.x = 0.24;
    g.add(grip);

    magBaseY = -0.068;
    mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.095 + magLvl * 0.016, 0.038), accentMat);
    mag.position.set(0, magBaseY, 0.028);
    mag.rotation.x = 0.24;
    g.add(mag);

    if (forViewmodel) {
      const glove = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.072, 0.085), gloveMat);
      glove.position.set(0, -0.056, 0.035);
      glove.rotation.x = 0.24;
      g.add(glove);
    }

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.014), glowMat);
    frontSight.position.set(0, 0.052, -0.155);
    g.add(frontSight);

    if (triggerLvl > 0 || !forViewmodel) {
      const underLight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.052), chromeMat);
      underLight.position.set(0, -0.02, -0.115);
      g.add(underLight);
    }

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.023, -0.185 - barrelLen);
    g.add(muzzle);

    const eject = new THREE.Object3D();
    eject.position.set(0.026, 0.03, -0.04);
    g.add(eject);

    return { group: g, muzzle, eject, mag, magBaseY };
  }

  const len =
    spec.barrelType === 'sniper' ? 0.68 :
    spec.barrelType === 'dmr' ? 0.56 :
    spec.barrelType === 'shotgun' ? 0.52 :
    spec.barrelType === 'smg' ? 0.34 : 0.48;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.072, len * 0.64), bodyMat);
  receiver.position.set(0, 0.005, -0.09);
  g.add(receiver);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.036, len * 0.52), darkMat);
  lower.position.set(0, -0.025, -0.07);
  g.add(lower);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, len * 0.58), chromeMat);
  rail.position.set(0, 0.045, -0.1);
  g.add(rail);

  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.054, len * 0.38), accentMat);
  shroud.position.set(0, 0.006, -0.14 - len * 0.34);
  g.add(shroud);

  const extraBarrel = barrelLvl * 0.045;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, len * 0.58 + extraBarrel, 12),
    chromeMat,
  );
  barrel.rotation.x = Math.PI * 0.5;
  barrel.position.set(0, 0.014, -0.1 - len * 0.56 - extraBarrel * 0.5);
  g.add(barrel);

  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(barrelLvl >= 2 ? 0.024 : 0.019, 0.02, 0.055 + barrelLvl * 0.025, 10),
    darkMat,
  );
  muzzleBrake.rotation.x = Math.PI * 0.5;
  muzzleBrake.position.set(0, 0.014, -0.1 - len * 0.85 - extraBarrel);
  g.add(muzzleBrake);

  if (spec.barrelType === 'shotgun') {
    const underTube = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, len * 0.48, 10), darkMat);
    underTube.rotation.x = Math.PI * 0.5;
    underTube.position.set(0, -0.016, -0.26);
    g.add(underTube);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.044, 0.14), accentMat);
    pump.position.set(0, -0.016, -0.24);
    g.add(pump);
  }

  magBaseY = -0.082 - magLvl * 0.014;
  const magHeight = (spec.barrelType === 'smg' ? 0.15 : 0.125) + magLvl * 0.028;
  mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, magHeight, 0.048), magLvl > 0 ? accentMat : darkMat);
  mag.position.set(0, magBaseY, -0.145);
  mag.rotation.x = spec.barrelType === 'smg' ? 0.14 : -0.16;
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.098, 0.044), darkMat);
  grip.position.set(0, -0.065, -0.012);
  grip.rotation.x = 0.25;
  g.add(grip);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.016), triggerLvl > 0 ? glowMat : chromeMat);
  trigger.position.set(0, -0.042, -0.048);
  g.add(trigger);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.068, 0.18), bodyMat);
  stock.position.set(0, -0.008, 0.14);
  g.add(stock);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.085, 0.024), darkMat);
  stockPad.position.set(0, -0.012, 0.232);
  g.add(stockPad);

  if (stockLvl > 0) {
    const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.024, 0.11), accentMat);
    cheekRiser.position.set(0, 0.03, 0.13);
    g.add(cheekRiser);
  }

  if (['rifle', 'carbine', 'dmr', 'sniper'].includes(spec.barrelType) || barrelLvl > 0) {
    const scopeLen = spec.barrelType === 'sniper' ? 0.25 : spec.barrelType === 'dmr' ? 0.16 : 0.1;
    const scopeRadius = spec.barrelType === 'sniper' ? 0.023 : 0.018;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(scopeRadius, scopeRadius * 1.1, scopeLen, 12), darkMat);
    scope.rotation.x = Math.PI * 0.5;
    scope.position.set(0, 0.072, -0.09);
    g.add(scope);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.024, scopeLen * 0.45), chromeMat);
    mount.position.set(0, 0.056, -0.09);
    g.add(mount);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(scopeRadius * 0.84, scopeRadius * 0.84, 0.006, 12), glowMat);
    lens.rotation.x = Math.PI * 0.5;
    lens.position.set(0, 0.072, -0.09 + scopeLen * 0.5);
    g.add(lens);
  }

  const plateTex = makeEngravedPlateTexture('BLITZ', '#0f172a', '#10b981');
  if (plateTex) {
    const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.4 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.061, 0.022, 0.088), plateMat);
    plate.position.set(0, 0.008, -0.06);
    g.add(plate);
  }

  if (forViewmodel) {
    const supportHand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.055, 0.085), gloveMat);
    supportHand.position.set(-0.02, -0.036, -0.23);
    g.add(supportHand);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.014, -0.14 - len * 0.86 - extraBarrel);
  g.add(muzzle);

  const eject = new THREE.Object3D();
  eject.position.set(0.034, 0.022, -0.09);
  g.add(eject);

  return { group: g, muzzle, eject, mag, magBaseY };
}

export function buildOperatorModel({
  characterId = 'callan',
  outfitId = 'emerald_spec',
  badgeId = 'blitz_founder',
  team = 'attackers',
  weaponId = 'arx17',
  finishId = 'factory',
  weaponUpgrades = null,
} = {}) {
  const char = getCharacterById(characterId);
  const outfit = getOutfitById(outfitId);
  const badge = getBadgeById(badgeId);

  const g = new THREE.Group();
  const isAtk = team === 'attackers';

  const trimHex = team === 'preview' ? outfit.trimHex : isAtk ? 0xf97316 : 0x10b981;
  const armorHex = team === 'preview' ? outfit.armorHex : isAtk ? 0x3f2e26 : 0x1e2e2b;
  const fabricHex = team === 'preview' ? outfit.fabricHex : 0x1f2937;

  const armorMat = new THREE.MeshStandardMaterial({ color: armorHex, roughness: 0.48, metalness: 0.42 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: fabricHex, roughness: 0.82, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: char.headColor, roughness: 0.7, metalness: 0.05 });
  const plateDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.6 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimHex,
    emissive: trimHex,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.4,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: outfit.visorHex || char.visorTint,
    emissive: outfit.visorHex || char.visorTint,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.7,
  });

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.36, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI * 0.5;
  shadowDisc.position.y = 0.015;
  g.add(shadowDisc);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.74, 0);
  const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), fabricMat);
  legMeshL.position.y = -0.32;
  legMeshL.castShadow = true;
  leftLeg.add(legMeshL);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.3), plateDarkMat);
  bootL.position.set(0, -0.66, -0.03);
  leftLeg.add(bootL);
  const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.08), armorMat);
  kneeL.position.set(0, -0.28, -0.12);
  leftLeg.add(kneeL);
  g.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.74, 0);
  const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), fabricMat);
  legMeshR.position.y = -0.32;
  legMeshR.castShadow = true;
  rightLeg.add(legMeshR);
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.3), plateDarkMat);
  bootR.position.set(0, -0.66, -0.03);
  rightLeg.add(bootR);
  const kneeR = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.08), armorMat);
  kneeR.position.set(0, -0.28, -0.12);
  rightLeg.add(kneeR);
  g.add(rightLeg);

  const torso = new THREE.Group();
  torso.position.y = 1.08;

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.32), plateDarkMat);
  belt.position.y = -0.28;
  torso.add(belt);

  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.3), fabricMat);
  jacket.castShadow = true;
  torso.add(jacket);

  const vestFront = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.34), armorMat);
  vestFront.position.y = 0.04;
  vestFront.castShadow = true;
  torso.add(vestFront);

  const trimBand = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.36), trimMat);
  trimBand.position.y = 0.14;
  torso.add(trimBand);

  const badgeTex = makeEngravedPlateTexture(badge.short || 'BZ', '#0f172a', badge.color || '#10b981');
  if (badgeTex) {
    const bMat = new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.3, metalness: 0.5 });
    const badgePlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.02), bMat);
    badgePlate.position.set(0.12, 0.15, -0.18);
    torso.add(badgePlate);
  }

  for (const side of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.24), armorMat);
    pauldron.position.set(side * 0.32, 0.2, 0);
    pauldron.rotation.z = side * -0.18;
    torso.add(pauldron);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), fabricMat);
    arm.position.set(side * 0.32, -0.02, -0.08);
    arm.rotation.x = 0.65;
    arm.rotation.z = side * 0.12;
    torso.add(arm);
  }
  g.add(torso);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.09, 12), armorMat);
  collar.position.set(0, 1.38, 0);
  g.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.18, 12), skinMat);
  neck.position.set(0, 1.44, 0);
  g.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.54, 0);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.25, 0.25), skinMat);
  headGroup.add(face);

  const helmetTop = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.19, 0.33), armorMat);
  helmetTop.position.set(0, 0.08, 0.01);
  helmetTop.castShadow = true;
  headGroup.add(helmetTop);

  if (char.helmetStyle === 'heavy') {
    const mandible = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.16), plateDarkMat);
    mandible.position.set(0, -0.06, -0.09);
    headGroup.add(mandible);
  } else if (char.helmetStyle === 'comms') {
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), trimMat);
    earL.rotation.z = Math.PI * 0.5;
    earL.position.set(-0.16, 0.01, 0);
    headGroup.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.16;
    headGroup.add(earR);
  } else if (char.helmetStyle === 'recon') {
    const hoodRim = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.25, 0.12), fabricMat);
    hoodRim.position.set(0, 0.05, 0.12);
    headGroup.add(hoodRim);
  }

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.085, 0.06), visorMat);
  visor.position.set(0, 0.03, -0.145);
  headGroup.add(visor);
  g.add(headGroup);

  const wSpec = getWeaponSpec(weaponId);
  const gunBuilt = buildWeaponModel(wSpec, { finishId, upgrades: weaponUpgrades, forViewmodel: false });
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0.24, 1.15, -0.26);
  gunGroup.scale.setScalar(1.22);
  gunGroup.add(gunBuilt.group);
  g.add(gunGroup);

  return {
    group: g,
    leftLeg,
    rightLeg,
    torso,
    headGroup,
    gunGroup,
    muzzle: gunBuilt.muzzle,
    armorMat,
    trimMat,
    visorMat,
    trimColor: trimHex,
  };
}
