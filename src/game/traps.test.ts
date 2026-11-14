import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBarrelTrap,
  createElectricWireTrap,
  isPointInTrapTrigger,
  isProjectileHittingTrap,
  triggerTrapOnContact,
  damageTrap,
  stepTrapTimers,
  computeBarrelBlastEffects,
} from './traps';

describe('Environmental Traps Logic', () => {
  it('does NOT trigger barrels or electric wires when walked over by zombies', () => {
    const barrel = createBarrelTrap('b_z', 100, 100);
    const wire = createElectricWireTrap('w_z', 200, 200, 70, 45);

    assert.equal(isPointInTrapTrigger(barrel, 115, 115, 14), true);
    assert.equal(isPointInTrapTrigger(wire, 235, 220, 14), true);

    const barrelRes = triggerTrapOnContact(barrel, 'zombie');
    assert.equal(barrelRes.triggered, false);
    assert.equal(barrelRes.event, 'none');
    assert.equal(barrel.state, 'armed');

    const wireRes = triggerTrapOnContact(wire, 'zombie');
    assert.equal(wireRes.triggered, false);
    assert.equal(wireRes.event, 'none');
    assert.equal(wire.state, 'armed');
  });

  it('primes and detonates an exploding barrel when stepped on by player', () => {
    const barrel = createBarrelTrap('b1', 100, 100);
    assert.equal(barrel.state, 'armed');
    assert.equal(isPointInTrapTrigger(barrel, 115, 115, 14), true);
    assert.equal(isPointInTrapTrigger(barrel, 250, 250, 14), false);

    const contact = triggerTrapOnContact(barrel, 'player');
    assert.equal(contact.triggered, true);
    assert.equal(contact.event, 'primed');
    assert.equal(barrel.state, 'primed');

    // Step part of fuse
    const step1 = stepTrapTimers(barrel, 0.25);
    assert.equal(step1.justDetonated, false);
    assert.equal(barrel.state, 'primed');

    // Step past fuse -> detonation
    const step2 = stepTrapTimers(barrel, 0.55);
    assert.equal(step2.justDetonated, true);
    assert.equal(barrel.state, 'active');

    // Step past active explosion flash -> destroyed
    const step3 = stepTrapTimers(barrel, 0.6);
    assert.equal(step3.justFinishedActive, true);
    assert.equal(barrel.state, 'destroyed');
  });

  it('detonates an exploding barrel immediately when damaged by player to 0 HP', () => {
    const barrel = createBarrelTrap('b2', 200, 200);
    assert.equal(isProjectileHittingTrap(barrel, 215, 215), true);

    const res1 = damageTrap(barrel, 25);
    assert.equal(res1.hit, true);
    assert.equal(res1.detonated, false);
    assert.equal(barrel.state, 'primed');

    const res2 = damageTrap(barrel, 25);
    assert.equal(res2.hit, true);
    assert.equal(res2.detonated, true);
    assert.equal(barrel.state, 'active');
  });

  it('leaves zombies completely unharmed by barrel blasts while still damaging player and chaining traps', () => {
    const barrelA = createBarrelTrap('ba', 100, 100); // center 115,115, radius 135
    const barrelB = createBarrelTrap('bb', 170, 110); // center 185,125 (dist ~71)
    const barrelFar = createBarrelTrap('bc', 500, 500);
    const wireNear = createElectricWireTrap('ew1', 150, 100, 60, 40);

    const blast = computeBarrelBlastEffects(
      barrelA,
      [
        { id: 'z1', x: 120, y: 120, state: 'chasing' },
        { id: 'z2', x: 115, y: 115, state: 'idle' },
      ],
      { x: 160, y: 115 },
      [barrelA, barrelB, barrelFar, wireNear]
    );

    assert.equal(blast.zombieHits.length, 0);
    assert.ok(blast.playerDamage > 0 && blast.playerDamage <= 48);
    assert.deepEqual(blast.chainBarrelIds, ['bb']);
    assert.deepEqual(blast.chainWireIds, ['ew1']);
  });

  it('activates electric wire on player contact, enters cooldown, and re-arms', () => {
    const wire = createElectricWireTrap('w1', 300, 400, 70, 45);
    assert.equal(isPointInTrapTrigger(wire, 330, 420, 14), true);

    const trig = triggerTrapOnContact(wire, 'player');
    assert.equal(trig.triggered, true);
    assert.equal(trig.event, 'activated');
    assert.equal(wire.state, 'active');

    // Step past 2.4s active duration -> cooldown
    const stepDone = stepTrapTimers(wire, 2.5);
    assert.equal(stepDone.justFinishedActive, true);
    assert.equal(wire.state, 'cooldown');

    // Second contact during cooldown does not trigger
    const trigDuringCd = triggerTrapOnContact(wire, 'player');
    assert.equal(trigDuringCd.triggered, false);

    // Step past 4.5s cooldown -> armed again
    const stepRearm = stepTrapTimers(wire, 4.6);
    assert.equal(stepRearm.justRearmed, true);
    assert.equal(wire.state, 'armed');
  });

  it('allows shooting an armed electric wire to trigger an immediate shock discharge', () => {
    const wire = createElectricWireTrap('w2', 100, 200, 70, 45);
    const dmgRes = damageTrap(wire, 42);
    assert.equal(dmgRes.hit, true);
    assert.equal(dmgRes.activated, true);
    assert.equal(wire.state, 'active');
  });
});
