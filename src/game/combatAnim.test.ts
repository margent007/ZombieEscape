import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMeleeSwingPose,
  computeGunRecoilPose,
  computeKnockbackVector,
} from './combatAnim';

describe('Combat Animation Math', () => {
  it('computes alternating forehand and backhand melee swing arcs and settles back to 0', () => {
    const startPose = computeMeleeSwingPose(0, 1);
    assert.equal(startPose.armAngle, 0);
    assert.equal(startPose.lungeOffset, 0);

    const strikeForehand = computeMeleeSwingPose(0.45, 1);
    const strikeBackhand = computeMeleeSwingPose(0.45, -1);
    assert.ok(strikeForehand.armAngle > 0.5);
    assert.ok(strikeBackhand.armAngle < -0.5);
    assert.ok(Math.abs(strikeForehand.armAngle + strikeBackhand.armAngle) < 0.001);
    assert.ok(strikeForehand.lungeOffset > 3);
    assert.ok(strikeForehand.trailAlpha > 0.4);

    const endPose = computeMeleeSwingPose(1, 1);
    assert.ok(Math.abs(endPose.armAngle) < 0.001);
    assert.equal(endPose.trailAlpha, 0);
  });

  it('computes stronger kickback and muzzle flash for shotgun than pistol', () => {
    const pistolPeak = computeGunRecoilPose(0.14, 'pistol');
    const shotgunPeak = computeGunRecoilPose(0.14, 'shotgun');

    assert.ok(pistolPeak.recoilOffset < 0);
    assert.ok(shotgunPeak.recoilOffset < pistolPeak.recoilOffset);
    assert.ok(pistolPeak.flashIntensity > 0.3);
    assert.ok(shotgunPeak.flashIntensity > pistolPeak.flashIntensity);

    const recovered = computeGunRecoilPose(1, 'shotgun');
    assert.ok(Math.abs(recovered.recoilOffset) < 0.001);
    assert.equal(recovered.flashIntensity, 0);
  });

  it('computes directional knockback vectors safely even on coincident coordinates', () => {
    const kb = computeKnockbackVector(100, 100, 130, 140, 10);
    assert.ok(Math.abs(kb.dx - 6) < 0.001);
    assert.ok(Math.abs(kb.dy - 8) < 0.001);

    const zeroDist = computeKnockbackVector(50, 50, 50, 50, 12);
    assert.equal(zeroDist.dx, 12);
    assert.equal(zeroDist.dy, 0);
  });
});
