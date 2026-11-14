import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToInventory,
  removeFromInventory,
  getInventoryCount,
  canCraftRecipe,
  craftRecipe,
  calculateGameScore,
  calculateNoiseLevel,
  checkAABBCollision,
  distance,
  getDailyChallengeConfig,
  validateSaveData,
} from './logic';
import { CRAFTING_RECIPES } from './items';
import { InventoryItem } from '../types/game';

test('inventory management: add, count, and remove items', () => {
  let inv: InventoryItem[] = [];
  assert.equal(getInventoryCount(inv, 'cloth'), 0);

  inv = addToInventory(inv, 'cloth', 2);
  assert.equal(getInventoryCount(inv, 'cloth'), 2);

  inv = addToInventory(inv, 'cloth', 3);
  assert.equal(getInventoryCount(inv, 'cloth'), 5);

  const reduced = removeFromInventory(inv, 'cloth', 2);
  assert.ok(reduced);
  assert.equal(getInventoryCount(reduced, 'cloth'), 3);

  const failRemove = removeFromInventory(reduced, 'cloth', 10);
  assert.equal(failRemove, null);
});

test('crafting recipe: validation and execution', () => {
  const bandageRecipe = CRAFTING_RECIPES.find(r => r.id === 'craft_bandage')!;
  assert.ok(bandageRecipe);

  // Insufficient items
  let inv: InventoryItem[] = [{ itemId: 'cloth', count: 1 }];
  assert.equal(canCraftRecipe(inv, bandageRecipe), false);

  // Sufficient items (2 cloth, 1 alcohol)
  inv = [
    { itemId: 'cloth', count: 2 },
    { itemId: 'alcohol', count: 1 },
  ];
  assert.equal(canCraftRecipe(inv, bandageRecipe), true);

  const { nextInventory, success } = craftRecipe(inv, bandageRecipe);
  assert.equal(success, true);
  assert.equal(getInventoryCount(nextInventory, 'bandage'), 1);
  assert.equal(getInventoryCount(nextInventory, 'cloth'), 0);
  assert.equal(getInventoryCount(nextInventory, 'alcohol'), 0);

  // Adrenaline crafting recipe (1 alcohol, 1 cloth, 1 battery)
  const adrRecipe = CRAFTING_RECIPES.find(r => r.id === 'craft_adrenaline')!;
  assert.ok(adrRecipe);
  inv = [
    { itemId: 'alcohol', count: 1 },
    { itemId: 'cloth', count: 1 },
    { itemId: 'battery', count: 1 },
  ];
  assert.equal(canCraftRecipe(inv, adrRecipe), true);
  const adrResult = craftRecipe(inv, adrRecipe);
  assert.equal(adrResult.success, true);
  assert.equal(getInventoryCount(adrResult.nextInventory, 'adrenaline_shot'), 1);
});

test('score calculation awards bonuses for escape, speed, kills, and health', () => {
  const victoryScore = calculateGameScore({
    escaped: true,
    timeSeconds: 120,
    zombiesSlain: 10,
    itemsCrafted: 3,
    remainingHpPercent: 90,
    isDaily: false,
  });

  const defeatScore = calculateGameScore({
    escaped: false,
    timeSeconds: 50,
    zombiesSlain: 2,
    itemsCrafted: 0,
    remainingHpPercent: 0,
    isDaily: false,
  });

  assert.ok(victoryScore > defeatScore, 'Victory score should be higher than defeat score');
  assert.ok(victoryScore >= 10000, 'Victory base is at least 10,000');

  // Daily challenge adds 50% bonus
  const dailyVictoryScore = calculateGameScore({
    escaped: true,
    timeSeconds: 120,
    zombiesSlain: 10,
    itemsCrafted: 3,
    remainingHpPercent: 90,
    isDaily: true,
  });
  assert.equal(dailyVictoryScore, Math.floor(victoryScore * 1.5));
});

test('noise level accurately reflects player activity', () => {
  assert.equal(calculateNoiseLevel(false, false, false, false, false), 0);
  assert.equal(calculateNoiseLevel(true, false, true, false, false), 15);
  assert.equal(calculateNoiseLevel(true, false, false, false, false), 35);
  assert.equal(calculateNoiseLevel(true, true, false, false, false), 80);
  assert.equal(calculateNoiseLevel(false, false, false, true, false), 70); // pistol
  assert.equal(calculateNoiseLevel(false, false, false, true, true), 100); // shotgun
});

test('collision and distance helpers work accurately', () => {
  const rectA = { x: 10, y: 10, width: 20, height: 20 };
  const rectB = { x: 25, y: 25, width: 20, height: 20 };
  const rectC = { x: 100, y: 100, width: 20, height: 20 };

  assert.equal(checkAABBCollision(rectA, rectB), true);
  assert.equal(checkAABBCollision(rectA, rectC), false);

  assert.equal(distance(0, 0, 3, 4), 5);
});

test('daily challenge config is deterministic given same date string', () => {
  const d1 = getDailyChallengeConfig('2026-11-11');
  const d2 = getDailyChallengeConfig('2026-11-11');
  assert.equal(d1.modifier.id, d2.modifier.id);
  assert.equal(d1.date, '2026-11-11');
});

test('save slot validation sanitizes corrupted or missing keys', () => {
  const valid = validateSaveData({
    version: '1.0',
    timestamp: 123456789,
    selectedCharacter: 'spec_ops',
    stats: {
      totalEscapes: 5,
      totalDeaths: 2,
      totalZombiesSlain: 40,
      totalItemsCrafted: 12,
      highestLevelUnlocked: 3,
      dailyStreak: 2,
      unlockedClasses: ['medic', 'spec_ops', 'engineer'],
    },
    highScores: { hospital: 15000 },
  });

  assert.ok(valid);
  assert.equal(valid.selectedCharacter, 'spec_ops');
  assert.equal(valid.stats.totalEscapes, 5);
  assert.equal(valid.stats.highestLevelUnlocked, 3);

  // Level cap clamp up to 10
  const maxLvl = validateSaveData({
    version: '1.0',
    timestamp: 123456789,
    selectedCharacter: 'medic',
    stats: {
      totalEscapes: 10,
      totalDeaths: 0,
      totalZombiesSlain: 200,
      totalItemsCrafted: 50,
      highestLevelUnlocked: 99,
      dailyStreak: 5,
      unlockedClasses: ['medic'],
    },
    highScores: {},
  });
  assert.ok(maxLvl);
  assert.equal(maxLvl.stats.highestLevelUnlocked, 10);

  // Corrupted data fallback
  const corrupted = validateSaveData({ somethingRandom: 123 });
  assert.equal(corrupted, null);
});
