export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type ItemId =
  | 'bandage'
  | 'medkit'
  | 'wood_plank'
  | 'scrap_metal'
  | 'alcohol'
  | 'bottle'
  | 'cloth'
  | 'battery'
  | 'nails'
  | 'ammo_pistol'
  | 'ammo_shotgun'
  | 'pistol'
  | 'shotgun'
  | 'crowbar'
  | 'molotov'
  | 'barricade_item'
  | 'noise_decoy'
  | 'generator_fuse'
  | 'car_battery'
  | 'spark_plug'
  | 'fuel_can'
  | 'subway_key'
  | 'military_keycard'
  | 'hazmat_cure'
  | 'mall_master_key'
  | 'valve_wheel'
  | 'prison_keycard'
  | 'coolant_rod'
  | 'ship_manifest'
  | 'adrenaline_shot';

export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'crafting' | 'placeable' | 'quest';

export interface ItemDef {
  id: ItemId;
  nameKey: string;
  descKey: string;
  category: ItemCategory;
  icon: string;
  stackable: boolean;
  maxStack?: number;
  healAmount?: number;
  damage?: number;
  range?: number;
  ammoType?: ItemId;
  fireRate?: number; // ms
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

export interface InventoryItem {
  itemId: ItemId;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  nameKey: string;
  descKey: string;
  resultItemId: ItemId;
  resultCount: number;
  ingredients: { itemId: ItemId; count: number }[];
  category: 'medical' | 'survival' | 'combat';
}

export type ZombieType = 'walker' | 'runner' | 'spitter' | 'dog' | 'tank_mutant';

export interface Zombie {
  id: string;
  type: ZombieType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  sightRadius: number;
  hearingRadius: number;
  state: 'idle' | 'wandering' | 'alert' | 'chasing' | 'attacking' | 'dead';
  angle: number;
  targetPos: { x: number; y: number } | null;
  attackCooldown: number;
  telegraphTimer: number; // For windup visual warning
  hitFlashTimer?: number; // Brief flash when taking damage
  deathTimer: number;
  lootDrop?: ItemId;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  distanceLeft: number;
  isPlayer: boolean;
  type: 'bullet' | 'pellet' | 'acid' | 'molotov' | 'decoy';
}

export interface Barricade {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

export interface DecoyActive {
  id: string;
  x: number;
  y: number;
  timeLeft: number;
  beepsLeft: number;
}

export interface FirePatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
}

export interface LootContainer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'crate' | 'locker' | 'ambulance' | 'med_cabinet' | 'trash_bin';
  searched: boolean;
  loot: { itemId: ItemId; count: number }[];
  searchTime: number; // total required ms
  searchProgress: number; // current ms
}

export interface GroundItem {
  id: string;
  itemId: ItemId;
  count: number;
  x: number;
  y: number;
  spawnTime: number;
  life: number;
}

export type TrapType = 'exploding_barrel' | 'electric_wire';

export interface EnvironmentalTrap {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number; // blast or shock radius
  hp: number;
  maxHp: number;
  damage: number;
  state: 'armed' | 'primed' | 'active' | 'cooldown' | 'destroyed';
  fuseTimer: number; // countdown before barrel explodes once primed
  activeTimer: number; // active shock/explosion visual duration
  cooldownTimer: number; // recharge duration for electric wire
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'table' | 'car' | 'tree' | 'debris';
}

export interface Objective {
  id: string;
  type: 'collect_item' | 'reach_exit' | 'kill_boss' | 'survive_timer';
  targetItemId?: ItemId;
  targetCount?: number;
  currentCount?: number;
  descriptionKey: string;
  completed: boolean;
}

export interface LevelConfig {
  id: number;
  key: string;
  nameKey: string;
  descKey: string;
  width: number;
  height: number;
  playerSpawn: { x: number; y: number };
  exitZone: { x: number; y: number; width: number; height: number };
  ambientColor: string;
  darkness: number; // 0 (bright) to 1 (pitch black)
  obstacles: Obstacle[];
  containers: LootContainer[];
  traps: EnvironmentalTrap[];
  initialZombies: { type: ZombieType; x: number; y: number }[];
  objectives: Objective[];
  exitRequiresItems?: { itemId: ItemId; count: number }[];
}

export type CharacterClass = 'medic' | 'spec_ops' | 'engineer';

export interface SurvivorProfile {
  id: CharacterClass;
  nameKey: string;
  descKey: string;
  bonus: string;
  baseHp: number;
  baseStamina: number;
  baseBattery: number;
  startingItems: { itemId: ItemId; count: number }[];
}

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  sprint: string;
  sneak: string;
  interact: string;
  attack: string;
  reload: string;
  flashlight: string;
  crafting: string;
  minimap: string;
  quickUse: string;
  quickBackpack: string;
  sonarPing: string;
  pause: string;
}

export type LanguageCode = 'vi' | 'en' | 'es' | 'ja';
export type VisualTheme = 'midnight' | 'nightvision' | 'crt' | 'classic';

export interface GameSettings {
  language: LanguageCode;
  theme: VisualTheme;
  brightness: number; // 0.6 (dark) to 1.6 (bright)
  minimapVisible: boolean;
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  screenShake: boolean;
  highContrast: boolean;
  keyBindings: KeyBindings;
  vibration: boolean;
}

export interface LeaderboardRecord {
  id: string;
  playerName: string;
  score: number;
  levelName: string;
  timeSeconds: number;
  zombiesSlain: number;
  itemsCrafted: number;
  mode: 'campaign' | 'daily';
  date: string;
}

export interface PlayerStats {
  totalEscapes: number;
  totalDeaths: number;
  totalZombiesSlain: number;
  totalItemsCrafted: number;
  highestLevelUnlocked: number;
  dailyStreak: number;
  unlockedClasses: CharacterClass[];
}

export interface SaveSlotData {
  version: string;
  timestamp: number;
  stats: PlayerStats;
  selectedCharacter: CharacterClass;
  highScores: Record<string, number>;
}
