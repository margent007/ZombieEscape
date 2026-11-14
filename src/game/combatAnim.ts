export interface MeleeSwingPose {
  armAngle: number;
  lungeOffset: number;
  torsoTwist: number;
  trailAlpha: number;
}

export interface GunRecoilPose {
  recoilOffset: number;
  muzzlePitch: number;
  flashIntensity: number;
}

/**
 * Computes smooth eased pose for a melee crowbar swing over normalized progress [0..1].
 * Alternates direction based on comboSide (1 = forehand, -1 = backhand).
 */
export function computeMeleeSwingPose(progress: number, comboSide: 1 | -1): MeleeSwingPose {
  const t = Math.max(0, Math.min(1, progress));

  // Fast snap windup->strike (0..0.45), then smooth follow-through recovery (0.45..1.0)
  let swingNorm: number;
  if (t < 0.15) {
    // Brief windup back
    const w = t / 0.15;
    swingNorm = -0.35 * w;
  } else if (t < 0.5) {
    // Explosive forward slash
    const s = (t - 0.15) / 0.35;
    const eased = 1 - Math.pow(1 - s, 3);
    swingNorm = -0.35 + 1.55 * eased; // goes from -0.35 -> +1.20
  } else {
    // Recovery back to neutral
    const r = (t - 0.5) / 0.5;
    const eased = r * r * (3 - 2 * r);
    swingNorm = 1.2 * (1 - eased);
  }

  const armAngle = (swingNorm * 0.95 * comboSide) || 0;
  const lungeCurve = Math.sin(Math.min(1, t * 1.4) * Math.PI);
  const lungeOffset = Math.max(0, lungeCurve) * 7.5;
  const torsoTwist = (swingNorm * 0.22 * comboSide) || 0;
  const trailAlpha = t >= 0.12 && t <= 0.65 ? Math.sin(((t - 0.12) / 0.53) * Math.PI) : 0;

  return {
    armAngle,
    lungeOffset,
    torsoTwist,
    trailAlpha,
  };
}

/**
 * Computes recoil kickback, barrel tilt, and muzzle flash intensity for firearms over progress [0..1].
 */
export function computeGunRecoilPose(
  progress: number,
  weapon: 'pistol' | 'shotgun'
): GunRecoilPose {
  const t = Math.max(0, Math.min(1, progress));
  const maxKick = weapon === 'shotgun' ? -9.5 : -5.5;
  const maxPitch = weapon === 'shotgun' ? -0.22 : -0.12;

  // Instant kick peaking near t=0.14, smooth spring return
  let kickCurve: number;
  if (t < 0.14) {
    kickCurve = t / 0.14;
  } else {
    const r = (t - 0.14) / 0.86;
    kickCurve = Math.pow(1 - r, 2.2);
  }

  const flashWindow = weapon === 'shotgun' ? 0.38 : 0.32;
  const flashIntensity = t < flashWindow ? Math.pow(1 - t / flashWindow, 1.4) : 0;

  return {
    recoilOffset: maxKick * kickCurve,
    muzzlePitch: maxPitch * kickCurve,
    flashIntensity,
  };
}

/**
 * Computes normalized knockback displacement vector from attacker to target.
 */
export function computeKnockbackVector(
  attackerX: number,
  attackerY: number,
  targetX: number,
  targetY: number,
  impulse: number
): { dx: number; dy: number } {
  const vx = targetX - attackerX;
  const vy = targetY - attackerY;
  const len = Math.hypot(vx, vy);
  if (len < 0.001) {
    return { dx: impulse, dy: 0 };
  }
  return {
    dx: (vx / len) * impulse,
    dy: (vy / len) * impulse,
  };
}
