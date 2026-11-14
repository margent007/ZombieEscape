import { ItemId, Zombie, ZombieType } from '../types/game';
import { distance } from './logic';

export interface ZombieBlueprint {
  type: ZombieType;
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  radius: number;
  hitRadius: number;
  sightRadius: number;
  hearingRadius: number;
  eyeColor: string;
}

export const ZOMBIE_BLUEPRINTS: Record<ZombieType, ZombieBlueprint> = {
  walker: {
    type: 'walker',
    baseHp: 55,
    baseSpeed: 82,
    baseDamage: 14,
    radius: 16,
    hitRadius: 18,
    sightRadius: 230,
    hearingRadius: 320,
    eyeColor: '#ef4444',
  },
  runner: {
    type: 'runner',
    baseHp: 34,
    baseSpeed: 145,
    baseDamage: 14,
    radius: 15,
    hitRadius: 18,
    sightRadius: 270,
    hearingRadius: 350,
    eyeColor: '#fde047',
  },
  spitter: {
    type: 'spitter',
    baseHp: 48,
    baseSpeed: 108,
    baseDamage: 14,
    radius: 16,
    hitRadius: 18,
    sightRadius: 310,
    hearingRadius: 330,
    eyeColor: '#a3e635',
  },
  dog: {
    type: 'dog',
    baseHp: 38,
    baseSpeed: 174,
    baseDamage: 18,
    radius: 13,
    hitRadius: 17,
    sightRadius: 260,
    hearingRadius: 380,
    eyeColor: '#f87171',
  },
  tank_mutant: {
    type: 'tank_mutant',
    baseHp: 330,
    baseSpeed: 92,
    baseDamage: 35,
    radius: 28,
    hitRadius: 32,
    sightRadius: 240,
    hearingRadius: 350,
    eyeColor: '#ef4444',
  },
  crawler: {
    type: 'crawler',
    baseHp: 38,
    baseSpeed: 64,
    baseDamage: 16,
    radius: 13,
    hitRadius: 16,
    sightRadius: 215,
    hearingRadius: 300,
    eyeColor: '#fb7185',
  },
  bloater: {
    type: 'bloater',
    baseHp: 135,
    baseSpeed: 65,
    baseDamage: 20,
    radius: 21,
    hitRadius: 24,
    sightRadius: 240,
    hearingRadius: 340,
    eyeColor: '#bef264',
  },
  stalker: {
    type: 'stalker',
    baseHp: 46,
    baseSpeed: 152,
    baseDamage: 21,
    radius: 15,
    hitRadius: 18,
    sightRadius: 340,
    hearingRadius: 400,
    eyeColor: '#67e8f9',
  },
  armored: {
    type: 'armored',
    baseHp: 170,
    baseSpeed: 84,
    baseDamage: 20,
    radius: 17,
    hitRadius: 20,
    sightRadius: 250,
    hearingRadius: 330,
    eyeColor: '#f97316',
  },
};

export function createZombieEntity(
  id: string,
  type: ZombieType,
  x: number,
  y: number,
  options: {
    hpMult?: number;
    speedMult?: number;
    initialState?: Zombie['state'];
    targetPos?: { x: number; y: number } | null;
  } = {}
): Zombie {
  const bp = ZOMBIE_BLUEPRINTS[type] || ZOMBIE_BLUEPRINTS.walker;
  const hpMult = options.hpMult ?? 1.0;
  const speedMult = options.speedMult ?? 1.0;
  const hp = Math.round(bp.baseHp * hpMult);

  return {
    id,
    type,
    x,
    y,
    hp,
    maxHp: hp,
    speed: bp.baseSpeed * speedMult,
    damage: bp.baseDamage,
    sightRadius: bp.sightRadius,
    hearingRadius: bp.hearingRadius,
    state: options.initialState ?? 'idle',
    angle: Math.random() * Math.PI * 2,
    targetPos: options.targetPos ?? null,
    attackCooldown: 0,
    telegraphTimer: 0,
    lungeCooldown: type === 'stalker' ? 1.5 : 0,
    deathTimer: 0,
  };
}

export function pickReinforcementZombieType(levelId: number, rngVal: number): ZombieType {
  const r = Math.max(0, Math.min(0.9999, rngVal));
  if (levelId <= 2) {
    if (r < 0.34) return 'walker';
    if (r < 0.56) return 'runner';
    if (r < 0.74) return 'crawler';
    if (r < 0.88) return 'dog';
    return 'stalker';
  }
  if (levelId <= 5) {
    if (r < 0.22) return 'walker';
    if (r < 0.40) return 'runner';
    if (r < 0.54) return 'crawler';
    if (r < 0.68) return 'stalker';
    if (r < 0.82) return 'spitter';
    if (r < 0.93) return 'bloater';
    return 'armored';
  }
  // Levels 6 - 10: High-intensity mixed apocalypse horde
  if (r < 0.14) return 'walker';
  if (r < 0.30) return 'runner';
  if (r < 0.42) return 'crawler';
  if (r < 0.56) return 'stalker';
  if (r < 0.70) return 'spitter';
  if (r < 0.83) return 'bloater';
  if (r < 0.95) return 'armored';
  return 'tank_mutant';
}

export function computeBloaterBurstEffects(
  bloater: Pick<Zombie, 'x' | 'y'>,
  player: { x: number; y: number }
): { burstRadius: number; playerDamage: number } {
  const burstRadius = 85;
  const d = distance(bloater.x, bloater.y, player.x, player.y);
  if (d > burstRadius) {
    return { burstRadius, playerDamage: 0 };
  }
  const falloff = Math.max(0.45, 1 - d / burstRadius);
  return {
    burstRadius,
    playerDamage: Math.round(22 * falloff),
  };
}

export function rollZombieLoot(type: ZombieType, roll: number): { itemId: ItemId | null; count: number; extraAmmo?: number } {
  if (type === 'tank_mutant') {
    return {
      itemId: roll < 0.6 ? 'adrenaline_shot' : 'medkit',
      count: 1,
      extraAmmo: 4,
    };
  }
  if (type === 'armored') {
    if (roll < 0.35) return { itemId: 'ammo_shotgun', count: 4 };
    if (roll < 0.75) return { itemId: 'ammo_pistol', count: 8 };
    return { itemId: 'scrap_metal', count: 3 };
  }
  if (type === 'bloater') {
    if (roll < 0.35) return { itemId: 'medkit', count: 1 };
    if (roll < 0.7) return { itemId: 'alcohol', count: 2 };
    return { itemId: 'bandage', count: 1 };
  }
  if (type === 'spitter' && roll < 0.8) {
    return roll < 0.25
      ? { itemId: 'alcohol', count: 1 }
      : roll < 0.5
      ? { itemId: 'cloth', count: 1 }
      : { itemId: 'ammo_pistol', count: 6 };
  }
  if (type === 'stalker' && roll < 0.65) {
    return roll < 0.4 ? { itemId: 'ammo_pistol', count: 6 } : { itemId: 'battery', count: 1 };
  }
  if (type === 'runner' && roll < 0.55) {
    return roll < 0.35 ? { itemId: 'ammo_pistol', count: 4 } : { itemId: 'bandage', count: 1 };
  }
  if (type === 'crawler' && roll < 0.48) {
    return roll < 0.25 ? { itemId: 'cloth', count: 2 } : { itemId: 'nails', count: 2 };
  }
  if (type === 'walker' && roll < 0.45) {
    return roll < 0.22 ? { itemId: 'scrap_metal', count: 1 } : { itemId: 'cloth', count: 1 };
  }
  return { itemId: null, count: 0 };
}
