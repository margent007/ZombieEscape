import { InventoryItem, ItemId, CraftingRecipe, SaveSlotData } from '../types/game';
import { CRAFTING_RECIPES } from './items';

/**
 * Checks count of a specific item in player inventory
 */
export function getInventoryCount(inventory: InventoryItem[], itemId: ItemId): number {
  const item = inventory.find(i => i.itemId === itemId);
  return item ? item.count : 0;
}

/**
 * Adds an item to the inventory (stacking or creating new slot)
 */
export function addToInventory(
  inventory: InventoryItem[],
  itemId: ItemId,
  count: number = 1
): InventoryItem[] {
  if (count <= 0) return [...inventory];
  const next = inventory.map(i => ({ ...i }));
  const existing = next.find(i => i.itemId === itemId);
  if (existing) {
    existing.count += count;
  } else {
    next.push({ itemId, count });
  }
  return next;
}

/**
 * Removes an item count from inventory. Returns new inventory or null if not enough.
 */
export function removeFromInventory(
  inventory: InventoryItem[],
  itemId: ItemId,
  count: number = 1
): InventoryItem[] | null {
  const existing = inventory.find(i => i.itemId === itemId);
  if (!existing || existing.count < count) return null;

  const next: InventoryItem[] = [];
  for (const item of inventory) {
    if (item.itemId === itemId) {
      const remaining = item.count - count;
      if (remaining > 0) {
        next.push({ itemId, count: remaining });
      }
    } else {
      next.push({ ...item });
    }
  }
  return next;
}

/**
 * Tests if the player has required ingredients for a recipe
 */
export function canCraftRecipe(inventory: InventoryItem[], recipe: CraftingRecipe): boolean {
  for (const ingredient of recipe.ingredients) {
    const available = getInventoryCount(inventory, ingredient.itemId);
    if (available < ingredient.count) {
      return false;
    }
  }
  return true;
}

/**
 * Executes a craft: deducts ingredients, adds output. Returns null if missing materials.
 */
export function craftRecipe(
  inventory: InventoryItem[],
  recipe: CraftingRecipe
): { nextInventory: InventoryItem[]; success: boolean } {
  if (!canCraftRecipe(inventory, recipe)) {
    return { nextInventory: inventory, success: false };
  }

  let cur = [...inventory];
  for (const ing of recipe.ingredients) {
    const updated = removeFromInventory(cur, ing.itemId, ing.count);
    if (!updated) return { nextInventory: inventory, success: false };
    cur = updated;
  }

  cur = addToInventory(cur, recipe.resultItemId, recipe.resultCount);
  return { nextInventory: cur, success: true };
}

/**
 * Computes end-of-run score based on speed, zombies slain, items crafted, and remaining health
 */
export function calculateGameScore(params: {
  escaped: boolean;
  timeSeconds: number;
  zombiesSlain: number;
  itemsCrafted: number;
  remainingHpPercent: number;
  isDaily: boolean;
}): number {
  const { escaped, timeSeconds, zombiesSlain, itemsCrafted, remainingHpPercent, isDaily } = params;

  let base = escaped ? 10000 : 2000;
  // Time bonus: up to 5000 points if fast (< 300s)
  const timeBonus = escaped ? Math.max(0, Math.floor(5000 - timeSeconds * 12)) : 0;
  const killScore = zombiesSlain * 250;
  const craftScore = itemsCrafted * 150;
  const healthBonus = Math.floor(remainingHpPercent * 30); // 0 to 3000

  let total = base + timeBonus + killScore + craftScore + healthBonus;
  if (isDaily) {
    total = Math.floor(total * 1.5); // 50% extra score in Daily Challenge
  }

  return Math.max(100, total);
}

/**
 * Deterministic PRNG based on string seed (e.g. YYYY-MM-DD)
 */
export function pseudoRandom(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface DailyModifier {
  id: string;
  nameKey: string;
  descKey: string;
  zombieSpeedMult: number;
  zombieHpMult: number;
  lootRateMult: number;
  flashlightDrainMult: number;
  badgeColor: string;
}

export const POSSIBLE_DAILY_MODIFIERS: DailyModifier[] = [
  {
    id: 'blood_moon',
    nameKey: 'mod_blood_moon_name',
    descKey: 'mod_blood_moon_desc',
    zombieSpeedMult: 1.25,
    zombieHpMult: 1.1,
    lootRateMult: 1.5,
    flashlightDrainMult: 1.0,
    badgeColor: '#ef4444',
  },
  {
    id: 'pitch_black',
    nameKey: 'mod_pitch_black_name',
    descKey: 'mod_pitch_black_desc',
    zombieSpeedMult: 1.0,
    zombieHpMult: 1.0,
    lootRateMult: 1.2,
    flashlightDrainMult: 1.6,
    badgeColor: '#8b5cf6',
  },
  {
    id: 'dense_fog',
    nameKey: 'mod_dense_fog_name',
    descKey: 'mod_dense_fog_desc',
    zombieSpeedMult: 0.9,
    zombieHpMult: 1.2,
    lootRateMult: 1.3,
    flashlightDrainMult: 1.2,
    badgeColor: '#06b6d4',
  },
  {
    id: 'berserk_horde',
    nameKey: 'mod_berserk_horde_name',
    descKey: 'mod_berserk_horde_desc',
    zombieSpeedMult: 1.3,
    zombieHpMult: 1.25,
    lootRateMult: 2.0,
    flashlightDrainMult: 1.0,
    badgeColor: '#f97316',
  },
];

export function getDailyChallengeConfig(dateStr: string) {
  const rng = pseudoRandom(dateStr);
  const modIdx = Math.floor(rng() * POSSIBLE_DAILY_MODIFIERS.length);
  const modifier = POSSIBLE_DAILY_MODIFIERS[modIdx];
  return {
    date: dateStr,
    modifier,
    seed: dateStr,
  };
}

/**
 * 2D Collision Helpers
 */
export function checkAABBCollision(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Noise Level Calculation
 */
export function calculateNoiseLevel(
  moving: boolean,
  isSprinting: boolean,
  isSneaking: boolean,
  firingWeapon: boolean,
  isShotgun: boolean
): number {
  if (firingWeapon) {
    return isShotgun ? 100 : 70;
  }
  if (!moving) return 0;
  if (isSneaking) return 15;
  if (isSprinting) return 80;
  return 35; // Normal walking
}

/**
 * Validates and sanitizes imported/loaded save slot
 */
export function validateSaveData(data: unknown): SaveSlotData | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<SaveSlotData>;
  if (!d.version || !d.stats) return null;

  return {
    version: d.version,
    timestamp: typeof d.timestamp === 'number' ? d.timestamp : Date.now(),
    selectedCharacter: (d.selectedCharacter as any) || 'medic',
    stats: {
      totalEscapes: Number(d.stats?.totalEscapes) || 0,
      totalDeaths: Number(d.stats?.totalDeaths) || 0,
      totalZombiesSlain: Number(d.stats?.totalZombiesSlain) || 0,
      totalItemsCrafted: Number(d.stats?.totalItemsCrafted) || 0,
      highestLevelUnlocked: Math.max(1, Math.min(10, Number(d.stats?.highestLevelUnlocked) || 1)),
      dailyStreak: Number(d.stats?.dailyStreak) || 0,
      unlockedClasses: Array.isArray(d.stats?.unlockedClasses)
        ? d.stats.unlockedClasses
        : ['medic', 'spec_ops', 'engineer'],
    },
    highScores: d.highScores && typeof d.highScores === 'object' ? d.highScores : {},
  };
}
