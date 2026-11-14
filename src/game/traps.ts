import { EnvironmentalTrap, Zombie } from '../types/game';
import { distance } from './logic';

export function createBarrelTrap(id: string, x: number, y: number): EnvironmentalTrap {
  return {
    id,
    type: 'exploding_barrel',
    x,
    y,
    width: 30,
    height: 30,
    radius: 135,
    hp: 40,
    maxHp: 40,
    damage: 140,
    state: 'armed',
    fuseTimer: 0,
    activeTimer: 0,
    cooldownTimer: 0,
  };
}

export function createElectricWireTrap(
  id: string,
  x: number,
  y: number,
  width: number = 70,
  height: number = 45
): EnvironmentalTrap {
  return {
    id,
    type: 'electric_wire',
    x,
    y,
    width,
    height,
    radius: Math.max(width, height) * 0.7,
    hp: 9999,
    maxHp: 9999,
    damage: 42,
    state: 'armed',
    fuseTimer: 0,
    activeTimer: 0,
    cooldownTimer: 0,
  };
}

export function getTrapCenter(trap: EnvironmentalTrap): { x: number; y: number } {
  return {
    x: trap.x + trap.width / 2,
    y: trap.y + trap.height / 2,
  };
}

export function isPointInTrapTrigger(
  trap: EnvironmentalTrap,
  px: number,
  py: number,
  entityRadius: number = 14
): boolean {
  if (trap.state === 'destroyed') return false;

  if (trap.type === 'electric_wire') {
    const pad = entityRadius * 0.45;
    return (
      px >= trap.x - pad &&
      px <= trap.x + trap.width + pad &&
      py >= trap.y - pad &&
      py <= trap.y + trap.height + pad
    );
  }

  const center = getTrapCenter(trap);
  return distance(center.x, center.y, px, py) <= trap.width / 2 + entityRadius;
}

export function isProjectileHittingTrap(
  trap: EnvironmentalTrap,
  px: number,
  py: number
): boolean {
  if (trap.state === 'destroyed') return false;
  if (trap.type === 'exploding_barrel' && trap.state === 'active') return false;
  return (
    px >= trap.x - 4 &&
    px <= trap.x + trap.width + 4 &&
    py >= trap.y - 4 &&
    py <= trap.y + trap.height + 4
  );
}

export function triggerTrapOnContact(
  trap: EnvironmentalTrap,
  _actor: 'player' | 'zombie'
): { triggered: boolean; event: 'primed' | 'activated' | 'none' } {
  if (trap.state !== 'armed') {
    return { triggered: false, event: 'none' };
  }

  if (trap.type === 'exploding_barrel') {
    trap.state = 'primed';
    trap.fuseTimer = 0.75;
    return { triggered: true, event: 'primed' };
  }

  trap.state = 'active';
  trap.activeTimer = 2.4;
  return { triggered: true, event: 'activated' };
}

export function damageTrap(
  trap: EnvironmentalTrap,
  damage: number
): { hit: boolean; detonated: boolean; activated: boolean } {
  if (trap.state === 'destroyed') {
    return { hit: false, detonated: false, activated: false };
  }

  if (trap.type === 'exploding_barrel') {
    if (trap.state === 'active') {
      return { hit: false, detonated: false, activated: false };
    }
    trap.hp = Math.max(0, trap.hp - damage);
    if (trap.hp <= 0) {
      trap.state = 'active';
      trap.fuseTimer = 0;
      trap.activeTimer = 0.45;
      return { hit: true, detonated: true, activated: false };
    }
    if (trap.state === 'armed') {
      trap.state = 'primed';
      trap.fuseTimer = 0.45;
    }
    return { hit: true, detonated: false, activated: false };
  }

  // Electric wire junction box can be shorted from range if currently armed
  if (trap.type === 'electric_wire' && trap.state === 'armed') {
    trap.state = 'active';
    trap.activeTimer = 2.4;
    return { hit: true, detonated: false, activated: true };
  }

  return { hit: false, detonated: false, activated: false };
}

export function stepTrapTimers(
  trap: EnvironmentalTrap,
  dt: number
): { justDetonated: boolean; justFinishedActive: boolean; justRearmed: boolean } {
  let justDetonated = false;
  let justFinishedActive = false;
  let justRearmed = false;

  if (trap.state === 'primed') {
    trap.fuseTimer -= dt;
    if (trap.fuseTimer <= 0) {
      trap.fuseTimer = 0;
      trap.hp = 0;
      trap.state = 'active';
      trap.activeTimer = 0.45;
      justDetonated = true;
    }
  } else if (trap.state === 'active') {
    trap.activeTimer -= dt;
    if (trap.activeTimer <= 0) {
      trap.activeTimer = 0;
      justFinishedActive = true;
      if (trap.type === 'exploding_barrel') {
        trap.state = 'destroyed';
      } else {
        trap.state = 'cooldown';
        trap.cooldownTimer = 4.5;
      }
    }
  } else if (trap.state === 'cooldown') {
    trap.cooldownTimer -= dt;
    if (trap.cooldownTimer <= 0) {
      trap.cooldownTimer = 0;
      trap.state = 'armed';
      justRearmed = true;
    }
  }

  return { justDetonated, justFinishedActive, justRearmed };
}

export interface BarrelBlastResult {
  zombieHits: { id: string; damage: number }[];
  playerDamage: number;
  chainBarrelIds: string[];
  chainWireIds: string[];
}

export function computeBarrelBlastEffects(
  barrel: EnvironmentalTrap,
  zombies: Pick<Zombie, 'id' | 'x' | 'y' | 'state'>[],
  player: { x: number; y: number },
  otherTraps: EnvironmentalTrap[]
): BarrelBlastResult {
  const center = getTrapCenter(barrel);
  const zombieHits: { id: string; damage: number }[] = [];

  for (const z of zombies) {
    if (z.state === 'dead') continue;
    const d = distance(center.x, center.y, z.x, z.y);
    const effectiveRadius = barrel.radius + 16;
    if (d <= effectiveRadius) {
      const falloff = Math.max(0.35, 1 - d / effectiveRadius);
      zombieHits.push({
        id: z.id,
        damage: Math.round(barrel.damage * falloff),
      });
    }
  }

  const distToPlayer = distance(center.x, center.y, player.x, player.y);
  let playerDamage = 0;
  if (distToPlayer <= barrel.radius) {
    const falloff = Math.max(0.3, 1 - distToPlayer / barrel.radius);
    playerDamage = Math.round(Math.min(48, barrel.damage * 0.34) * falloff);
  }

  const chainBarrelIds: string[] = [];
  const chainWireIds: string[] = [];
  for (const other of otherTraps) {
    if (other.id === barrel.id || other.state === 'destroyed') continue;
    const oc = getTrapCenter(other);
    if (distance(center.x, center.y, oc.x, oc.y) <= barrel.radius) {
      if (other.type === 'exploding_barrel' && (other.state === 'armed' || other.state === 'primed')) {
        chainBarrelIds.push(other.id);
      } else if (other.type === 'electric_wire' && other.state === 'armed') {
        chainWireIds.push(other.id);
      }
    }
  }

  return { zombieHits, playerDamage, chainBarrelIds, chainWireIds };
}
