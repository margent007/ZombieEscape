import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZOMBIE_BLUEPRINTS,
  createZombieEntity,
  pickReinforcementZombieType,
  computeBloaterBurstEffects,
  rollZombieLoot,
} from './zombies';
import { ZombieType } from '../types/game';

describe('Zombie Archetypes & Spawning Logic', () => {
  it('defines blueprints for all 9 zombie types including new archetypes', () => {
    const allTypes: ZombieType[] = [
      'walker',
      'runner',
      'spitter',
      'dog',
      'tank_mutant',
      'crawler',
      'bloater',
      'stalker',
      'armored',
    ];
    for (const t of allTypes) {
      const bp = ZOMBIE_BLUEPRINTS[t];
      assert.ok(bp, `Missing blueprint for ${t}`);
      assert.ok(bp.baseHp > 0);
      assert.ok(bp.baseSpeed > 0);
      assert.ok(bp.baseDamage > 0);
    }
    assert.ok(ZOMBIE_BLUEPRINTS.armored.baseHp > ZOMBIE_BLUEPRINTS.walker.baseHp * 2);
    assert.ok(ZOMBIE_BLUEPRINTS.bloater.baseHp > ZOMBIE_BLUEPRINTS.walker.baseHp * 2);
    assert.ok(ZOMBIE_BLUEPRINTS.stalker.baseSpeed > ZOMBIE_BLUEPRINTS.walker.baseSpeed * 1.5);
  });

  it('creates zombie entities with multipliers and lunge cooldowns', () => {
    const stalker = createZombieEntity('z_st', 'stalker', 300, 400, {
      hpMult: 1.5,
      speedMult: 1.2,
      initialState: 'chasing',
    });
    assert.equal(stalker.type, 'stalker');
    assert.equal(stalker.hp, Math.round(46 * 1.5));
    assert.equal(stalker.state, 'chasing');
    assert.ok((stalker.lungeCooldown ?? 0) > 0);
  });

  it('picks varied reinforcement types including new archetypes across levels', () => {
    const earlyTypes = new Set<ZombieType>();
    const lateTypes = new Set<ZombieType>();
    for (let i = 0; i < 20; i++) {
      const r = i / 20;
      earlyTypes.add(pickReinforcementZombieType(1, r));
      lateTypes.add(pickReinforcementZombieType(8, r));
    }
    assert.ok(earlyTypes.has('crawler'));
    assert.ok(earlyTypes.has('stalker'));
    assert.ok(lateTypes.has('bloater'));
    assert.ok(lateTypes.has('armored'));
    assert.ok(lateTypes.has('tank_mutant'));
  });

  it('computes bloater toxic burst damage inside 85px radius and zero outside', () => {
    const near = computeBloaterBurstEffects({ x: 100, y: 100 }, { x: 120, y: 100 });
    assert.ok(near.playerDamage > 0);

    const far = computeBloaterBurstEffects({ x: 100, y: 100 }, { x: 250, y: 100 });
    assert.equal(far.playerDamage, 0);
  });

  it('drops guaranteed supplies from armored and bloater zombies', () => {
    const armoredLoot = rollZombieLoot('armored', 0.2);
    assert.equal(armoredLoot.itemId, 'ammo_shotgun');
    assert.ok(armoredLoot.count >= 4);

    const bloaterLoot = rollZombieLoot('bloater', 0.15);
    assert.equal(bloaterLoot.itemId, 'medkit');
  });
});
