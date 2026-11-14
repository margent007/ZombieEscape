import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CharacterClass,
  EnvironmentalTrap,
  GameState,
  InventoryItem,
  ItemId,
  LevelConfig,
  Projectile,
  Barricade,
  DecoyActive,
  FirePatch,
  Zombie,
  GroundItem,
  GameSettings,
  SaveSlotData,
} from './types/game';
import { GAME_LEVELS } from './game/levels';
import { ITEM_REGISTRY } from './game/items';
import {
  calculateGameScore,
  calculateNoiseLevel,
  checkAABBCollision,
  distance,
  getDailyChallengeConfig,
} from './game/logic';
import {
  computeBarrelBlastEffects,
  damageTrap,
  getTrapCenter,
  isPointInTrapTrigger,
  isProjectileHittingTrap,
  stepTrapTimers,
  triggerTrapOnContact,
} from './game/traps';
import { computeKnockbackVector } from './game/combatAnim';
import { inputManager } from './game/input';
import { soundManager } from './game/audio';
import { GameRenderer } from './game/renderer';
import {
  DEFAULT_SETTINGS,
  getActiveSlotId,
  INITIAL_SAVE_DATA,
  loadSaveSlot,
  loadSettings,
  saveSaveSlot,
  saveSettings,
} from './game/storage';
import { SURVIVOR_PROFILES } from './game/updates';

// Modals & UI Components
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { CraftingModal } from './components/CraftingModal';
import { SettingsModal } from './components/SettingsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DailyChallengeModal } from './components/DailyChallengeModal';
import { SurvivorModal } from './components/SurvivorModal';
import { SaveModal } from './components/SaveModal';
import { UpdatesModal } from './components/UpdatesModal';
import { GameOverModal, PauseModal, VictoryModal } from './components/StatusModals';
import { LevelSelectModal } from './components/LevelSelectModal';

export default function App() {
  // Navigation & Game State
  const [gameState, setGameState] = useState<GameState>('title');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [saveData, setSaveData] = useState<SaveSlotData>(() => loadSaveSlot());
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterClass>(() => saveData.selectedCharacter || 'medic');
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [isDaily, setIsDaily] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);

  // Modals Open States
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isSurvivorOpen, setIsSurvivorOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModal] = useState(false);

  // End of run stats snapshot
  const [runStats, setRunStats] = useState({
    score: 0,
    timeSeconds: 0,
    zombiesSlain: 0,
    itemsCrafted: 0,
    levelName: '',
  });

  // HUD Reactive States (Throttled for 60fps performance)
  const [hudHp, setHudHp] = useState<number>(100);
  const [hudMaxHp, setHudMaxHp] = useState<number>(100);
  const [hudStamina, setHudStamina] = useState<number>(100);
  const [hudMaxStamina, setHudMaxStamina] = useState<number>(100);
  const [hudBattery, setHudBattery] = useState<number>(100);
  const [hudMaxBattery, setHudMaxBattery] = useState<number>(100);
  const [hudNoise, setHudNoise] = useState<number>(0);
  const [hudFlashlight, setHudFlashlight] = useState<boolean>(true);
  const [hudWeapon, setHudWeapon] = useState<ItemId>('crowbar');
  const [hudAmmo, setHudAmmo] = useState<number>(0);
  const [hudEscapeReady, setHudEscapeReady] = useState<boolean>(false);
  const [hudSneaking, setHudSneaking] = useState<boolean>(false);
  const [hudSprinting, setHudSprinting] = useState<boolean>(false);
  const [hudInteractName, setHudInteractName] = useState<string | null>(null);

  // Canvas & Simulation Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Mutable Game Simulation State (inside useRef so 60Hz loop doesn't re-render React)
  const simStateRef = useRef<{
    level: LevelConfig;
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      hp: number;
      maxHp: number;
      stamina: number;
      maxStamina: number;
      battery: number;
      maxBattery: number;
      flashlightOn: boolean;
      angle: number;
      aimAngle: number;
      speed: number;
      inventory: InventoryItem[];
      equippedWeapon: ItemId;
      isAttacking: boolean;
      attackCooldown: number;
      attackType: 'melee' | 'pistol' | 'shotgun';
      attackAnimTimer: number;
      attackAnimDuration: number;
      attackComboSide: 1 | -1;
      activeSearchContainerId: string | null;
      searchProgress: number;
      isSearching: boolean;
    };
    zombies: Zombie[];
    projectiles: Projectile[];
    barricades: Barricade[];
    decoys: DecoyActive[];
    firePatches: FirePatch[];
    groundItems: GroundItem[];
    sonarTimer: number;
    adrenalineTimer: number;
    zombieMoanTimer: number;
    reinforcementTimer: number;
    trapFeedbackTimer: number;
    camera: { x: number; y: number; trauma: number };
    stats: {
      timeElapsed: number;
      zombiesSlain: number;
      itemsCrafted: number;
    };
    objectives: { id: string; completed: boolean }[];
    exitUnlocked: boolean;
    levelStartTime: number;
  }>({
    level: GAME_LEVELS[0],
    player: {
      x: 120,
      y: 150,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      battery: 100,
      maxBattery: 100,
      flashlightOn: true,
      angle: 0,
      aimAngle: 0,
      speed: 155,
      inventory: [],
      equippedWeapon: 'crowbar',
      isAttacking: false,
      attackCooldown: 0,
      attackType: 'melee',
      attackAnimTimer: 0,
      attackAnimDuration: 0.24,
      attackComboSide: 1,
      activeSearchContainerId: null,
      searchProgress: 0,
      isSearching: false,
    },
    zombies: [],
    projectiles: [],
    barricades: [],
    decoys: [],
    firePatches: [],
    groundItems: [],
    sonarTimer: 0,
    adrenalineTimer: 0,
    zombieMoanTimer: 10,
    reinforcementTimer: 40,
    trapFeedbackTimer: 0,
    camera: { x: 120, y: 150, trauma: 0 },
    stats: { timeElapsed: 0, zombiesSlain: 0, itemsCrafted: 0 },
    objectives: [],
    exitUnlocked: false,
    levelStartTime: 0,
  });

  // Keep body dataset state in sync with ultra-mode requirements
  useEffect(() => {
    document.body.dataset.state = gameState === 'victory' || gameState === 'gameover' ? 'gameover' : gameState;
  }, [gameState]);

  // Init input & audio bindings
  useEffect(() => {
    inputManager.init();
    inputManager.setBindings(settings.keyBindings);
    soundManager.setVolumes(settings.masterVolume, settings.sfxVolume, settings.bgmVolume);

    const interval = setInterval(() => {
      setGamepadConnected(inputManager.gamepadConnected);
    }, 500);

    return () => {
      inputManager.cleanup();
      clearInterval(interval);
      soundManager.stopAmbience();
    };
  }, [settings]);

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startRun(1, false);
    }
  }, []);

  // Update canvas size on resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize and spawn a level run
  const startRun = useCallback(
    (levelId: number, daily: boolean = false) => {
      const baseLevel = GAME_LEVELS.find(l => l.id === levelId) || GAME_LEVELS[0];
      // Clone level data
      const lvlConfig: LevelConfig = JSON.parse(JSON.stringify(baseLevel));

      // Check daily modifier if daily mode
      let zombieSpeedMult = 1.0;
      let zombieHpMult = 1.0;
      let flashlightDrainMult = 1.0;

      if (daily) {
        const todayStr = new Date().toISOString().split('T')[0];
        const dailyCfg = getDailyChallengeConfig(todayStr);
        zombieSpeedMult = dailyCfg.modifier.zombieSpeedMult;
        zombieHpMult = dailyCfg.modifier.zombieHpMult;
        flashlightDrainMult = dailyCfg.modifier.flashlightDrainMult;
      }

      // Survivor profile
      const survivor = SURVIVOR_PROFILES.find(s => s.id === selectedCharacter) || SURVIVOR_PROFILES[0];

      // Spawn player
      const initialInventory: InventoryItem[] = survivor.startingItems.map(it => ({ ...it }));
      const hasGun = initialInventory.some(i => i.itemId === 'pistol');
      const startWeapon: ItemId = hasGun ? 'pistol' : 'crowbar';

      // Spawn zombies
      const spawnedZombies: Zombie[] = lvlConfig.initialZombies.map((iz, idx) => {
        const baseSpeed = iz.type === 'runner' ? 140 : iz.type === 'dog' ? 170 : iz.type === 'spitter' ? 110 : iz.type === 'tank_mutant' ? 90 : 80;
        const baseHp = iz.type === 'tank_mutant' ? 320 : iz.type === 'runner' ? 30 : iz.type === 'dog' ? 35 : iz.type === 'spitter' ? 45 : 55;
        const baseDmg = iz.type === 'tank_mutant' ? 35 : iz.type === 'dog' ? 18 : 14;

        return {
          id: `z_${idx}_${iz.type}`,
          type: iz.type,
          x: iz.x,
          y: iz.y,
          hp: Math.round(baseHp * zombieHpMult),
          maxHp: Math.round(baseHp * zombieHpMult),
          speed: baseSpeed * zombieSpeedMult,
          damage: baseDmg,
          sightRadius: iz.type === 'runner' ? 260 : iz.type === 'spitter' ? 300 : 220,
          hearingRadius: 320,
          state: 'idle',
          angle: Math.random() * Math.PI * 2,
          targetPos: null,
          attackCooldown: 0,
          telegraphTimer: 0,
          deathTimer: 0,
        };
      });

      simStateRef.current = {
        level: lvlConfig,
        player: {
          x: lvlConfig.playerSpawn.x,
          y: lvlConfig.playerSpawn.y,
          vx: 0,
          vy: 0,
          hp: survivor.baseHp,
          maxHp: survivor.baseHp,
          stamina: survivor.baseStamina,
          maxStamina: survivor.baseStamina,
          battery: survivor.baseBattery,
          maxBattery: survivor.baseBattery,
          flashlightOn: true,
          angle: 0,
          aimAngle: 0,
          speed: selectedCharacter === 'spec_ops' ? 178 : 155,
          inventory: initialInventory,
          equippedWeapon: startWeapon,
          isAttacking: false,
          attackCooldown: 0,
          attackType: 'melee',
          attackAnimTimer: 0,
          attackAnimDuration: 0.24,
          attackComboSide: 1,
          activeSearchContainerId: null,
          searchProgress: 0,
          isSearching: false,
        },
        zombies: spawnedZombies,
        projectiles: [],
        barricades: [],
        decoys: [],
        firePatches: [],
        groundItems: [],
        sonarTimer: 0,
        adrenalineTimer: 0,
        zombieMoanTimer: 8 + Math.random() * 6,
        reinforcementTimer: Math.max(25, 45 - levelId * 2),
        trapFeedbackTimer: 0,
        camera: { x: lvlConfig.playerSpawn.x, y: lvlConfig.playerSpawn.y, trauma: 0 },
        stats: { timeElapsed: 0, zombiesSlain: 0, itemsCrafted: 0 },
        objectives: lvlConfig.objectives.map(o => ({ id: o.id, completed: false })),
        exitUnlocked: false,
        levelStartTime: performance.now(),
      };

      setCurrentLevelId(levelId);
      setIsDaily(daily);
      setGameState('playing');
      soundManager.startAmbience();
      soundManager.playFlashlightClick();
    },
    [selectedCharacter]
  );

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!rendererRef.current) {
      rendererRef.current = new GameRenderer(canvas);
    }
    const renderer = rendererRef.current;

    lastTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.05); // Clamped simulation step

      const sim = simStateRef.current;
      const p = sim.player;
      const lvl = sim.level;
      const inputs = inputManager.getInputs();

      // Timers decrement
      sim.sonarTimer = Math.max(0, sim.sonarTimer - dt);
      sim.adrenalineTimer = Math.max(0, sim.adrenalineTimer - dt);

      // Check Pause trigger [Esc / P / Gamepad Start]
      if (inputs.pause) {
        setGameState('paused');
        return;
      }

      // Check Crafting menu trigger [C / Gamepad Y]
      if (inputs.crafting) {
        setIsCraftingOpen(prev => !prev);
        soundManager.playCraftSuccess();
      }

      // Check Quick Backpack drawer [Tab]
      if (inputs.quickBackpack) {
        setIsCraftingOpen(prev => !prev);
        soundManager.playCraftSuccess();
      }

      // Check Sonar Ping [Q / Gamepad LB]
      if (inputs.sonarPing && sim.sonarTimer <= 0) {
        sim.sonarTimer = 4.0;
        soundManager.playSonarPing();
        renderer.addFloatingText('RADAR SONAR PING!', p.x, p.y - 30, '#38bdf8', 12);
      }

      // Check Quick Use Item [X / Gamepad R3]
      if (inputs.quickUse) {
        const adr = p.inventory.find(i => i.itemId === 'adrenaline_shot' && i.count > 0);
        const med = p.inventory.find(i => i.itemId === 'medkit' && i.count > 0);
        const ban = p.inventory.find(i => i.itemId === 'bandage' && i.count > 0);

        if (adr) {
          adr.count -= 1;
          sim.adrenalineTimer = 12.0;
          p.stamina = Math.min(p.maxStamina, p.stamina + 35);
          soundManager.playAdrenaline();
          renderer.addFloatingText('Adrenaline Rush! +45% Tốc Độ', p.x, p.y - 30, '#38bdf8', 12);
        } else if (med && p.hp < p.maxHp) {
          med.count -= 1;
          p.hp = Math.min(p.maxHp, p.hp + 50);
          soundManager.playBandage();
          renderer.addFloatingText('+50 HP', p.x, p.y - 30, '#22c55e', 14);
        } else if (ban && p.hp < p.maxHp) {
          ban.count -= 1;
          p.hp = Math.min(p.maxHp, p.hp + 25);
          soundManager.playBandage();
          renderer.addFloatingText('+25 HP', p.x, p.y - 30, '#22c55e', 14);
        } else {
          soundManager.playFlashlightClick();
        }
      }

      // Check Flashlight toggle [F / Gamepad B]
      if (inputs.flashlight) {
        p.flashlightOn = !p.flashlightOn;
        soundManager.playFlashlightClick();
      }

      // Check Minimap toggle [M]
      if (inputs.minimap) {
        setSettings(s => {
          const next = !s.minimapVisible;
          saveSettings({ ...s, minimapVisible: next });
          return { ...s, minimapVisible: next };
        });
        soundManager.playFlashlightClick();
      }

      // 1. PLAYER AIM ANGLE
      if (inputs.gamepadAimAngle !== null) {
        p.aimAngle = inputs.gamepadAimAngle;
      } else {
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        p.aimAngle = Math.atan2(inputManager.mouseY - screenCenterY, inputManager.mouseX - screenCenterX);
      }

      // 2. PLAYER MOVEMENT & STAMINA
      const isSprinting = inputs.sprint && p.stamina > 5 && (inputs.dx !== 0 || inputs.dy !== 0);
      const isSneaking = inputs.sneak && !isSprinting;

      let speedMult = 1.0;
      if (sim.adrenalineTimer > 0) {
        speedMult *= 1.45;
        // Cyan speed trail particle
        if (Math.random() < 0.25) {
          renderer.addBlood(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 8, 2);
        }
      }
      if (isSprinting) {
        speedMult *= 1.6;
        p.stamina = Math.max(0, p.stamina - dt * 25);
      } else if (isSneaking) {
        speedMult *= 0.55;
        p.stamina = Math.min(p.maxStamina, p.stamina + dt * 15);
      } else {
        p.stamina = Math.min(p.maxStamina, p.stamina + dt * 18);
      }

      const moveX = inputs.dx * p.speed * speedMult * dt;
      const moveY = inputs.dy * p.speed * speedMult * dt;

      // Collision with map borders & obstacles
      const nextX = Math.max(35, Math.min(lvl.width - 35, p.x + moveX));
      const nextY = Math.max(35, Math.min(lvl.height - 35, p.y + moveY));

      const playerBoxX = { x: nextX - 14, y: p.y - 14, width: 28, height: 28 };
      let collideX = false;
      for (const obs of lvl.obstacles) {
        if (checkAABBCollision(playerBoxX, obs)) {
          collideX = true;
          break;
        }
      }
      for (const bar of sim.barricades) {
        if (checkAABBCollision(playerBoxX, bar)) {
          collideX = true;
          break;
        }
      }
      if (!collideX) p.x = nextX;

      const playerBoxY = { x: p.x - 14, y: nextY - 14, width: 28, height: 28 };
      let collideY = false;
      for (const obs of lvl.obstacles) {
        if (checkAABBCollision(playerBoxY, obs)) {
          collideY = true;
          break;
        }
      }
      for (const bar of sim.barricades) {
        if (checkAABBCollision(playerBoxY, bar)) {
          collideY = true;
          break;
        }
      }
      if (!collideY) p.y = nextY;

      // Footstep audio tick
      if (moveX !== 0 || moveY !== 0) {
        if (Math.random() < (isSprinting ? 0.18 : isSneaking ? 0.05 : 0.09)) {
          soundManager.playFootstep(isSprinting, isSneaking);
        }
      }

      // Flashlight Battery Drain
      if (p.flashlightOn && p.battery > 0) {
        const drainRate = selectedCharacter === 'engineer' ? 0.5 : 1.2;
        p.battery = Math.max(0, p.battery - dt * drainRate);
      }

      // Noise Level
      const isFiring = p.isAttacking && p.attackCooldown > 0.2;
      const noise = calculateNoiseLevel(
        moveX !== 0 || moveY !== 0,
        isSprinting,
        isSneaking,
        isFiring,
        p.equippedWeapon === 'shotgun'
      );

      // Low health heartbeat
      if (p.hp < p.maxHp * 0.35) {
        soundManager.playHeartbeat();
      }

      // 3. COMBAT & ATTACKING
      p.attackCooldown = Math.max(0, p.attackCooldown - dt);
      p.attackAnimTimer = Math.max(0, p.attackAnimTimer - dt);
      p.isAttacking = p.attackAnimTimer > 0;

      // Weapon cycling check or hotkeys 1, 2, 3
      const hasCrowbar = p.inventory.some(i => i.itemId === 'crowbar');
      const hasPistol = p.inventory.some(i => i.itemId === 'pistol');
      const hasShotgun = p.inventory.some(i => i.itemId === 'shotgun');

      if (inputs.reload) {
        // Toggle equipped weapon
        if (p.equippedWeapon === 'crowbar' && hasPistol) p.equippedWeapon = 'pistol';
        else if (p.equippedWeapon === 'pistol' && hasShotgun) p.equippedWeapon = 'shotgun';
        else if (hasCrowbar) p.equippedWeapon = 'crowbar';
        soundManager.playFlashlightClick();
      }

      // Zombie Loot Dropping Helper
      const dropZombieLoot = (deadZ: Zombie) => {
        deadZ.state = 'dead';
        sim.stats.zombiesSlain += 1;
        renderer.addBlood(deadZ.x, deadZ.y, 8);

        // Escalating drop chances: tank 100%, spitter 80%, runner 55%, walker 45%
        const roll = Math.random();
        let droppedItem: ItemId | null = null;
        let count = 1;

        if (deadZ.type === 'tank_mutant') {
          // Tank always drops rare adrenaline or medkit + shotgun shells
          droppedItem = Math.random() < 0.6 ? 'adrenaline_shot' : 'medkit';
          sim.groundItems.push({
            id: Math.random().toString(),
            x: deadZ.x + (Math.random() - 0.5) * 20,
            y: deadZ.y + (Math.random() - 0.5) * 20,
            itemId: 'ammo_shotgun',
            count: 4,
            spawnTime: Date.now(),
            life: 180,
          });
        } else if (deadZ.type === 'spitter' && roll < 0.8) {
          const table: ItemId[] = ['alcohol', 'cloth', 'ammo_pistol', 'nails'];
          droppedItem = table[Math.floor(Math.random() * table.length)];
          count = droppedItem === 'ammo_pistol' ? 6 : 1;
        } else if (deadZ.type === 'runner' && roll < 0.55) {
          const table: ItemId[] = ['ammo_pistol', 'bandage', 'scrap_metal'];
          droppedItem = table[Math.floor(Math.random() * table.length)];
          count = droppedItem === 'ammo_pistol' ? 4 : 1;
        } else if (deadZ.type === 'walker' && roll < 0.45) {
          const table: ItemId[] = ['scrap_metal', 'cloth', 'wood_plank', 'bottle'];
          droppedItem = table[Math.floor(Math.random() * table.length)];
        }

        if (droppedItem) {
          sim.groundItems.push({
            id: Math.random().toString(),
            x: deadZ.x + (Math.random() - 0.5) * 14,
            y: deadZ.y + (Math.random() - 0.5) * 14,
            itemId: droppedItem,
            count,
            spawnTime: Date.now(),
            life: 180,
          });
        }
      };

      // Exploding Barrel Detonation Helper (supports chain explosions)
      const detonateBarrel = (barrel: EnvironmentalTrap, visited = new Set<string>()) => {
        if (visited.has(barrel.id)) return;
        visited.add(barrel.id);

        const trapsList = lvl.traps || [];
        const blast = computeBarrelBlastEffects(barrel, sim.zombies, p, trapsList);
        const bc = getTrapCenter(barrel);

        soundManager.playExplosion();
        inputManager.triggerHaptics(260, 1.0);
        sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.72);
        renderer.addFloatingText('BOOM!', bc.x, bc.y - 26, '#f97316', 16);

        sim.firePatches.push({
          id: `fire_${barrel.id}_${Date.now()}`,
          x: bc.x,
          y: bc.y,
          radius: 68,
          duration: 5.5,
        });

        for (const zHit of blast.zombieHits) {
          const zTarget = sim.zombies.find(z => z.id === zHit.id);
          if (!zTarget || zTarget.state === 'dead') continue;
          zTarget.hp -= zHit.damage;
          renderer.addBlood(zTarget.x, zTarget.y, 7);
          renderer.addFloatingText(`-${zHit.damage}`, zTarget.x, zTarget.y - 14, '#fb923c');
          if (zTarget.hp <= 0) {
            dropZombieLoot(zTarget);
          }
        }

        if (blast.playerDamage > 0) {
          p.hp = Math.max(0, p.hp - blast.playerDamage);
          soundManager.playPlayerHurt();
          renderer.addBlood(p.x, p.y, 5);
          renderer.addFloatingText(`-${blast.playerDamage}`, p.x, p.y - 20, '#ef4444');
        }

        // Alert nearby zombies to the blast sound
        for (const z of sim.zombies) {
          if (z.state === 'dead') continue;
          if (distance(bc.x, bc.y, z.x, z.y) < 460 && (z.state === 'idle' || z.state === 'wandering')) {
            z.state = 'chasing';
          }
        }

        // Chain detonation of adjacent barrels
        for (const chainId of blast.chainBarrelIds) {
          const nextBarrel = trapsList.find(t => t.id === chainId);
          if (nextBarrel && nextBarrel.state !== 'destroyed') {
            nextBarrel.hp = 0;
            nextBarrel.fuseTimer = 0;
            nextBarrel.state = 'active';
            nextBarrel.activeTimer = 0.45;
            detonateBarrel(nextBarrel, visited);
          }
        }

        // Chain short-circuit on adjacent electric wires
        for (const wireId of blast.chainWireIds) {
          const nextWire = trapsList.find(t => t.id === wireId);
          if (nextWire && nextWire.state === 'armed') {
            damageTrap(nextWire, 10);
            soundManager.playElectricZap();
            renderer.addFloatingText('⚡ ĐIỆN GIẬT!', nextWire.x + nextWire.width / 2, nextWire.y - 10, '#22d3ee');
          }
        }
      };

      // Weapon attack execution
      if (inputs.attack && p.attackCooldown <= 0) {
        const weaponDef = ITEM_REGISTRY[p.equippedWeapon];

        if (p.equippedWeapon === 'crowbar') {
          // Alternating melee crowbar swing
          p.attackComboSide = p.attackComboSide === 1 ? -1 : 1;
          p.attackAnimDuration = 0.24;
          p.attackAnimTimer = 0.24;
          p.isAttacking = true;
          p.attackCooldown = 0.35;
          p.attackType = 'melee';
          soundManager.playMeleeSwing();

          // Check hit in frontal arc (72px) against zombies & traps
          let hitTarget = false;
          for (const z of sim.zombies) {
            if (z.state === 'dead') continue;
            const dist = distance(p.x, p.y, z.x, z.y);
            if (dist < 72) {
              const angleToZ = Math.atan2(z.y - p.y, z.x - p.x);
              const diff = Math.abs(angleToZ - p.aimAngle);
              if (diff < 1.0 || diff > Math.PI * 2 - 1.0) {
                z.hp -= 45;
                z.hitFlashTimer = 0.14;
                const kb = computeKnockbackVector(p.x, p.y, z.x, z.y, z.type === 'tank_mutant' ? 4 : 12);
                z.x = Math.max(40, Math.min(lvl.width - 40, z.x + kb.dx));
                z.y = Math.max(40, Math.min(lvl.height - 40, z.y + kb.dy));
                renderer.addBlood(z.x, z.y, 6);
                renderer.addImpactSparks(z.x, z.y, angleToZ, '#ef4444', 7);
                renderer.addFloatingText('-45', z.x, z.y - 15, '#f43f5e');
                hitTarget = true;
                sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.25);
                inputManager.triggerHaptics(80, 0.4);

                if (z.hp <= 0) {
                  dropZombieLoot(z);
                }
              }
            }
          }
          for (const trap of lvl.traps || []) {
            if (trap.state === 'destroyed') continue;
            const tc = getTrapCenter(trap);
            if (distance(p.x, p.y, tc.x, tc.y) < 72) {
              const angleToT = Math.atan2(tc.y - p.y, tc.x - p.x);
              const diff = Math.abs(angleToT - p.aimAngle);
              if (diff < 1.0 || diff > Math.PI * 2 - 1.0) {
                const trapRes = damageTrap(trap, 45);
                renderer.addImpactSparks(tc.x, tc.y, angleToT + Math.PI, '#fef08a', 7);
                if (trapRes.detonated) {
                  detonateBarrel(trap);
                  hitTarget = true;
                } else if (trapRes.hit && trap.type === 'exploding_barrel') {
                  soundManager.playBarrelFuse();
                  renderer.addFloatingText('XÌ XÌ...!', tc.x, tc.y - 14, '#facc15');
                  hitTarget = true;
                } else if (trapRes.activated) {
                  soundManager.playElectricZap();
                  renderer.addFloatingText('⚡ ĐIỆN GIẬT!', tc.x, tc.y - 14, '#22d3ee');
                  hitTarget = true;
                }
              }
            }
          }
          renderer.addMeleeSlash(p.x, p.y, p.aimAngle, p.attackComboSide, hitTarget);
          if (hitTarget) soundManager.playMeleeHit();
        } else if (p.equippedWeapon === 'pistol') {
          // Check ammo
          const ammoSlot = p.inventory.find(i => i.itemId === 'ammo_pistol');
          if (ammoSlot && ammoSlot.count > 0) {
            ammoSlot.count -= 1;
            p.attackAnimDuration = 0.18;
            p.attackAnimTimer = 0.18;
            p.isAttacking = true;
            p.attackCooldown = 0.28;
            p.attackType = 'pistol';
            soundManager.playPistol();
            inputManager.triggerHaptics(120, 0.6);
            sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.35);
            renderer.addShellCasing(p.x, p.y, p.aimAngle, false);

            // Spawn projectile
            const vx = Math.cos(p.aimAngle) * 750;
            const vy = Math.sin(p.aimAngle) * 750;
            sim.projectiles.push({
              id: Math.random().toString(),
              x: p.x + Math.cos(p.aimAngle) * 22,
              y: p.y + Math.sin(p.aimAngle) * 22,
              vx,
              vy,
              damage: 42,
              distanceLeft: 420,
              isPlayer: true,
              type: 'bullet',
            });
          } else {
            soundManager.playFlashlightClick(); // dry fire
            renderer.addFloatingText('Hết đạn 9mm!', p.x, p.y - 20, '#f87171');
          }
        } else if (p.equippedWeapon === 'shotgun') {
          // Check shotgun shells
          const shellSlot = p.inventory.find(i => i.itemId === 'ammo_shotgun');
          if (shellSlot && shellSlot.count > 0) {
            shellSlot.count -= 1;
            p.attackAnimDuration = 0.26;
            p.attackAnimTimer = 0.26;
            p.isAttacking = true;
            p.attackCooldown = 0.75;
            p.attackType = 'shotgun';
            soundManager.playShotgun();
            inputManager.triggerHaptics(220, 0.95);
            sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.65);
            renderer.addShellCasing(p.x, p.y, p.aimAngle, true);

            // Spawn 7 pellets in cone
            for (let i = 0; i < 7; i++) {
              const spread = (Math.random() - 0.5) * 0.45;
              const angle = p.aimAngle + spread;
              const speed = 650 + Math.random() * 120;
              sim.projectiles.push({
                id: Math.random().toString(),
                x: p.x + Math.cos(p.aimAngle) * 25,
                y: p.y + Math.sin(p.aimAngle) * 25,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                damage: 20,
                distanceLeft: 290,
                isPlayer: true,
                type: 'pellet',
              });
            }
          } else {
            soundManager.playFlashlightClick();
            renderer.addFloatingText('Hết đạn Shotgun!', p.x, p.y - 20, '#f87171');
          }
        }
      }

      // 4. PROJECTILES SIMULATION
      for (let i = sim.projectiles.length - 1; i >= 0; i--) {
        const proj = sim.projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.distanceLeft -= Math.hypot(proj.vx * dt, proj.vy * dt);

        let hit = false;
        // Check collision with obstacles
        for (const obs of lvl.obstacles) {
          if (
            proj.x > obs.x &&
            proj.x < obs.x + obs.width &&
            proj.y > obs.y &&
            proj.y < obs.y + obs.height
          ) {
            hit = true;
            renderer.addImpactSparks(proj.x, proj.y, Math.atan2(-proj.vy, -proj.vx), '#fde047', 4);
            break;
          }
        }

        if (!hit) {
          // Check collision with environmental traps (bullets/pellets/acid)
          for (const trap of lvl.traps || []) {
            if (isProjectileHittingTrap(trap, proj.x, proj.y)) {
              const trapHit = damageTrap(trap, proj.damage);
              renderer.addImpactSparks(proj.x, proj.y, Math.atan2(-proj.vy, -proj.vx), '#fef08a', 5);
              if (trapHit.detonated) {
                detonateBarrel(trap);
                hit = true;
                break;
              } else if (trapHit.hit && trap.type === 'exploding_barrel') {
                soundManager.playBarrelFuse();
                renderer.addFloatingText('XÌ XÌ...!', trap.x + 15, trap.y - 10, '#facc15');
                hit = true;
                break;
              } else if (trapHit.activated) {
                soundManager.playElectricZap();
                renderer.addFloatingText('⚡ ĐIỆN GIẬT!', trap.x + trap.width / 2, trap.y - 10, '#22d3ee');
                hit = true;
                break;
              }
            }
          }
        }

        if (proj.isPlayer && !hit) {
          // Check collision with zombies
          for (const z of sim.zombies) {
            if (z.state === 'dead') continue;
            if (distance(proj.x, proj.y, z.x, z.y) < (z.type === 'tank_mutant' ? 32 : 18)) {
              z.hp -= proj.damage;
              z.hitFlashTimer = 0.11;
              const kb = computeKnockbackVector(
                proj.x - proj.vx * dt,
                proj.y - proj.vy * dt,
                z.x,
                z.y,
                proj.type === 'pellet' ? 6 : 4
              );
              z.x = Math.max(40, Math.min(lvl.width - 40, z.x + kb.dx));
              z.y = Math.max(40, Math.min(lvl.height - 40, z.y + kb.dy));
              renderer.addBlood(z.x, z.y, 4);
              renderer.addImpactSparks(proj.x, proj.y, Math.atan2(proj.vy, proj.vx), '#dc2626', 5);
              renderer.addFloatingText(`-${proj.damage}`, z.x, z.y - 12, '#fb923c');
              hit = true;
              if (z.hp <= 0) {
                dropZombieLoot(z);
              }
              break;
            }
          }
        } else if (!proj.isPlayer && !hit) {
          // Acid projectile hitting player
          if (distance(proj.x, proj.y, p.x, p.y) < 18) {
            p.hp = Math.max(0, p.hp - proj.damage);
            soundManager.playPlayerHurt();
            inputManager.triggerHaptics(150, 0.7);
            sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.4);
            renderer.addBlood(p.x, p.y, 5);
            hit = true;
          }
        }

        if (hit || proj.distanceLeft <= 0) {
          sim.projectiles.splice(i, 1);
        }
      }

      // 4.5 ENVIRONMENTAL TRAPS UPDATE & PLAYER TRIGGERS
      sim.trapFeedbackTimer = Math.max(0, sim.trapFeedbackTimer - dt);
      let electricShockPulsed = false;
      for (const trap of lvl.traps || []) {
        // Player contact trigger
        if (trap.state === 'armed' && isPointInTrapTrigger(trap, p.x, p.y, 14)) {
          const ev = triggerTrapOnContact(trap, 'player');
          if (ev.event === 'primed') {
            soundManager.playBarrelFuse();
            renderer.addFloatingText('THÙNG SẮP NỔ!', trap.x + 15, trap.y - 14, '#f97316', 12);
          } else if (ev.event === 'activated') {
            soundManager.playElectricZap();
            renderer.addFloatingText('⚡ ĐIỆN GIẬT!', trap.x + trap.width / 2, trap.y - 12, '#22d3ee', 12);
          }
        }

        // Player taking shock damage inside active electric wire
        if (trap.type === 'electric_wire' && trap.state === 'active' && isPointInTrapTrigger(trap, p.x, p.y, 14)) {
          p.hp = Math.max(0, p.hp - trap.damage * 0.45 * dt);
          if (sim.trapFeedbackTimer <= 0) {
            soundManager.playElectricZap();
            soundManager.playPlayerHurt();
            renderer.addFloatingText('⚡ -8', p.x, p.y - 20, '#22d3ee', 12);
            electricShockPulsed = true;
          }
        }

        // Advance trap timers
        const step = stepTrapTimers(trap, dt);
        if (step.justDetonated) {
          detonateBarrel(trap);
        }
      }

      // 5. FIRE PATCHES & DECOYS
      for (let i = sim.firePatches.length - 1; i >= 0; i--) {
        const fire = sim.firePatches[i];
        fire.duration -= dt;
        // Burn nearby zombies
        for (const z of sim.zombies) {
          if (z.state === 'dead') continue;
          if (distance(fire.x, fire.y, z.x, z.y) < fire.radius) {
            z.hp -= 35 * dt;
            if (z.hp <= 0) {
              dropZombieLoot(z);
            }
          }
        }
        if (fire.duration <= 0) sim.firePatches.splice(i, 1);
      }

      for (let i = sim.decoys.length - 1; i >= 0; i--) {
        const dec = sim.decoys[i];
        dec.timeLeft -= dt;
        if (Math.random() < 0.08) soundManager.playDecoyBeep();
        if (dec.timeLeft <= 0) sim.decoys.splice(i, 1);
      }

      // 6. ZOMBIE AI & PATHFINDING
      for (const z of sim.zombies) {
        if (z.state === 'dead') continue;
        if (z.hitFlashTimer) z.hitFlashTimer = Math.max(0, z.hitFlashTimer - dt);

        const distToPlayer = distance(z.x, z.y, p.x, p.y);
        let targetX = p.x;
        let targetY = p.y;

        // Check if there's an active sound decoy nearby
        if (sim.decoys.length > 0) {
          let closestDecoy = sim.decoys[0];
          let minDecoyDist = distance(z.x, z.y, closestDecoy.x, closestDecoy.y);
          for (const d of sim.decoys) {
            const dDist = distance(z.x, z.y, d.x, d.y);
            if (dDist < minDecoyDist) {
              minDecoyDist = dDist;
              closestDecoy = d;
            }
          }
          if (minDecoyDist < 450) {
            targetX = closestDecoy.x;
            targetY = closestDecoy.y;
          }
        }

        const distToTarget = distance(z.x, z.y, targetX, targetY);

        // Sensory detection
        const noiseAlert = noise > 30 && distToPlayer < z.hearingRadius * (noise / 80);
        const sightAlert = distToPlayer < z.sightRadius;

        if (sightAlert || noiseAlert || distToTarget < 350) {
          if (z.state === 'idle' || z.state === 'wandering') {
            z.state = 'chasing';
            if (Math.random() < 0.4) soundManager.playZombieAlert();
          }
        }

        // Zombie contact with Environmental Traps (barrels & electric wires)
        let trapSpeedMult = 1.0;
        for (const trap of lvl.traps || []) {
          if (trap.state === 'destroyed') continue;
          if (trap.state === 'armed' && isPointInTrapTrigger(trap, z.x, z.y, 14)) {
            const ev = triggerTrapOnContact(trap, 'zombie');
            if (ev.event === 'primed') {
              soundManager.playBarrelFuse();
              renderer.addFloatingText('XÌ XÌ...!', trap.x + 15, trap.y - 12, '#facc15', 11);
            } else if (ev.event === 'activated') {
              soundManager.playElectricZap();
              renderer.addFloatingText('⚡ SỐC ĐIỆN!', trap.x + trap.width / 2, trap.y - 12, '#22d3ee', 12);
            }
          }
          if (trap.type === 'electric_wire' && trap.state === 'active' && isPointInTrapTrigger(trap, z.x, z.y, 14)) {
            trapSpeedMult = 0.25; // Stunned / slowed by high voltage
            z.hp -= trap.damage * dt;
            if (z.state === 'idle' || z.state === 'wandering') z.state = 'chasing';
            if (sim.trapFeedbackTimer <= 0) {
              soundManager.playElectricZap();
              renderer.addFloatingText('⚡-15', z.x, z.y - 15, '#67e8f9', 11);
              electricShockPulsed = true;
            }
            if (z.hp <= 0) {
              dropZombieLoot(z);
              break;
            }
          }
        }
        if ((z.state as string) === 'dead') continue;

        if (z.state === 'chasing') {
          z.angle = Math.atan2(targetY - z.y, targetX - z.x);
          const zMoveX = Math.cos(z.angle) * z.speed * trapSpeedMult * dt;
          const zMoveY = Math.sin(z.angle) * z.speed * trapSpeedMult * dt;

          // Check barricade collision
          let blockedByBarricade: Barricade | null = null;
          for (const bar of sim.barricades) {
            if (distance(z.x + zMoveX, z.y + zMoveY, bar.x + bar.width / 2, bar.y + bar.height / 2) < 25) {
              blockedByBarricade = bar;
              break;
            }
          }

          if (blockedByBarricade) {
            blockedByBarricade.hp -= z.damage * dt * 2;
            if (blockedByBarricade.hp <= 0) {
              sim.barricades = sim.barricades.filter(b => b.id !== blockedByBarricade!.id);
              soundManager.playExplosion();
            }
          } else {
            z.x += zMoveX;
            z.y += zMoveY;
          }

          // Special attacks
          z.attackCooldown = Math.max(0, z.attackCooldown - dt);
          z.telegraphTimer = Math.max(0, z.telegraphTimer - dt);

          if (z.type === 'spitter' && distToPlayer < 240 && distToPlayer > 80 && z.attackCooldown <= 0) {
            // Telegraph acid spit
            z.telegraphTimer = 0.4;
            z.attackCooldown = 2.5;
            setTimeout(() => {
              if (z.state !== 'dead') {
                const sAngle = Math.atan2(p.y - z.y, p.x - z.x);
                sim.projectiles.push({
                  id: Math.random().toString(),
                  x: z.x,
                  y: z.y,
                  vx: Math.cos(sAngle) * 350,
                  vy: Math.sin(sAngle) * 350,
                  damage: 22,
                  distanceLeft: 300,
                  isPlayer: false,
                  type: 'acid',
                });
                soundManager.playZombieGrowl(1.4);
              }
            }, 350);
          } else if (distToPlayer < (z.type === 'tank_mutant' ? 44 : 26) && z.attackCooldown <= 0) {
            // Melee bite / slam attack
            z.attackCooldown = z.type === 'tank_mutant' ? 1.6 : 0.9;
            p.hp = Math.max(0, p.hp - z.damage);
            soundManager.playPlayerHurt();
            soundManager.playZombieGrowl(z.type === 'tank_mutant' ? 0.6 : 1.0);
            inputManager.triggerHaptics(180, 0.85);
            sim.camera.trauma = Math.min(1.0, sim.camera.trauma + 0.5);
            renderer.addBlood(p.x, p.y, 7);
            renderer.addFloatingText(`-${z.damage}`, p.x, p.y - 18, '#ef4444');
          }
        }
      }

      // Reset electric shock floating text cadence
      if (electricShockPulsed) {
        sim.trapFeedbackTimer = 0.38;
      }

      // 7. LOOT CONTAINER SEARCHING & INTERACTION (FIXED: Tap to latch or Hold to speed up)
      let hoveredContainer: any = null;
      for (const c of lvl.containers) {
        if (distance(p.x, p.y, c.x + c.width / 2, c.y + c.height / 2) < 68) {
          hoveredContainer = c;
          break;
        }
      }

      if (hoveredContainer && !hoveredContainer.searched) {
        const cTitle = hoveredContainer.type === 'med_cabinet'
          ? 'Tủ thuốc y tế'
          : hoveredContainer.type === 'ambulance'
          ? 'Xe cứu thương'
          : 'Hòm tiếp tế sinh tồn';
        setHudInteractName(`${cTitle} (Bấm [E] mở hòm)`);

        // Tap [E] to start searching or hold [E] to search faster
        if (inputs.interact) {
          p.isSearching = true;
          soundManager.playFlashlightClick();
        }

        if (p.isSearching || inputs.interactHeld || inputs.attackHeld) {
          p.activeSearchContainerId = hoveredContainer.id;
          const searchSpeed = inputs.interactHeld ? 1.6 : 1.0;
          p.searchProgress += dt * 1000 * searchSpeed;

          if (p.searchProgress >= hoveredContainer.searchTime) {
            hoveredContainer.searched = true;
            p.activeSearchContainerId = null;
            p.searchProgress = 0;
            p.isSearching = false;
            soundManager.playLoot();

            // Add loot to inventory
            for (const item of hoveredContainer.loot) {
              const multiplier = selectedCharacter === 'engineer' && item.itemId === 'scrap_metal' ? 2 : 1;
              p.inventory = p.inventory.map(i => ({ ...i }));
              const exist = p.inventory.find(i => i.itemId === item.itemId);
              if (exist) exist.count += item.count * multiplier;
              else p.inventory.push({ itemId: item.itemId, count: item.count * multiplier });

              const itemDef = ITEM_REGISTRY[item.itemId as ItemId];
              const displayName = itemDef ? itemDef.id : item.itemId;
              renderer.addFloatingText(`+${item.count * multiplier} ${displayName}`, p.x, p.y - 25, '#38bdf8');
            }

            // Check if quest objectives updated
            checkObjectives(sim);
          }
        }
      } else {
        if (!hoveredContainer) {
          p.isSearching = false;
          p.activeSearchContainerId = null;
          p.searchProgress = 0;
        }

        // Check nearby armed environmental trap for manual [E] trigger
        let hoveredTrap: EnvironmentalTrap | null = null;
        for (const trap of lvl.traps || []) {
          if (trap.state === 'armed') {
            const tc = getTrapCenter(trap);
            if (distance(p.x, p.y, tc.x, tc.y) < 62) {
              hoveredTrap = trap;
              break;
            }
          }
        }

        if (hoveredTrap) {
          setHudInteractName(
            hoveredTrap.type === 'exploding_barrel'
              ? 'Thùng xăng nổ ([E] kích nổ / Bắn)'
              : 'Dây điện cao thế ([E] kích hoạt)'
          );
          if (inputs.interact) {
            const ev = triggerTrapOnContact(hoveredTrap, 'player');
            const tc = getTrapCenter(hoveredTrap);
            if (ev.event === 'primed') {
              soundManager.playBarrelFuse();
              renderer.addFloatingText('THÙNG SẮP NỔ!', tc.x, tc.y - 16, '#f97316', 12);
            } else if (ev.event === 'activated') {
              soundManager.playElectricZap();
              renderer.addFloatingText('⚡ ĐIỆN GIẬT!', tc.x, tc.y - 16, '#22d3ee', 12);
            }
          }
        } else {
          setHudInteractName(null);
        }
      }

      // 7.5 GROUND LOOT AUTO / PROXIMITY PICKUP
      for (let i = sim.groundItems.length - 1; i >= 0; i--) {
        const gi = sim.groundItems[i];
        gi.life -= dt;
        if (gi.life <= 0) {
          sim.groundItems.splice(i, 1);
          continue;
        }

        const dToPlayer = distance(p.x, p.y, gi.x, gi.y);
        if (dToPlayer < 38 || (dToPlayer < 75 && inputs.interact)) {
          // Collect ground item
          p.inventory = p.inventory.map(item => ({ ...item }));
          const exist = p.inventory.find(item => item.itemId === gi.itemId);
          if (exist) exist.count += gi.count;
          else p.inventory.push({ itemId: gi.itemId, count: gi.count });

          soundManager.playGroundItemPickup();
          const itemDef = ITEM_REGISTRY[gi.itemId];
          const name = itemDef ? itemDef.id : gi.itemId;
          renderer.addFloatingText(`+${gi.count} ${name}`, gi.x, gi.y - 15, '#22c55e');
          sim.groundItems.splice(i, 1);
          checkObjectives(sim);
        }
      }

      // 7.6 AMBIENT HORROR AUDIO & ZOMBIE MOANS IN THE DARK
      sim.zombieMoanTimer -= dt;
      if (sim.zombieMoanTimer <= 0) {
        sim.zombieMoanTimer = 8 + Math.random() * 8;
        const livingZombies = sim.zombies.filter(z => z.state !== 'dead');
        if (livingZombies.length > 0) {
          soundManager.playZombieMoan();
        }
      }

      // 7.7 ESCALATING ZOMBIE REINFORCEMENTS
      sim.reinforcementTimer -= dt;
      if (sim.reinforcementTimer <= 0) {
        sim.reinforcementTimer = Math.max(22, 45 - currentLevelId * 2.5);
        const aliveCount = sim.zombies.filter(z => z.state !== 'dead').length;
        if (aliveCount < 95) {
          const spawnCount = Math.min(4, Math.floor(2 + currentLevelId * 0.4));
          for (let k = 0; k < spawnCount; k++) {
            const edge = Math.floor(Math.random() * 4);
            let sx = 60, sy = 60;
            if (edge === 0) { sx = Math.random() * lvl.width; sy = 60; }
            else if (edge === 1) { sx = Math.random() * lvl.width; sy = lvl.height - 60; }
            else if (edge === 2) { sx = 60; sy = Math.random() * lvl.height; }
            else { sx = lvl.width - 60; sy = Math.random() * lvl.height; }

            const zType = currentLevelId >= 6 && Math.random() < 0.25 ? 'spitter' : Math.random() < 0.35 ? 'runner' : 'walker';
            const baseSpeed = zType === 'runner' ? 140 : zType === 'spitter' ? 110 : 85;
            const baseHp = zType === 'runner' ? 30 : zType === 'spitter' ? 45 : 55;
            sim.zombies.push({
              id: `z_reinforce_${Date.now()}_${k}`,
              type: zType,
              x: sx,
              y: sy,
              hp: baseHp,
              maxHp: baseHp,
              speed: baseSpeed,
              damage: 15,
              sightRadius: 260,
              hearingRadius: 360,
              state: 'chasing',
              angle: Math.random() * Math.PI * 2,
              targetPos: { x: p.x, y: p.y },
              attackCooldown: 0,
              telegraphTimer: 0,
              deathTimer: 0,
            });
          }
          soundManager.playZombieGrowl(0.9);
          renderer.addFloatingText('CẢNH BÁO: ĐÀN ZOMBIE TĂNG VIỆN!', p.x, p.y - 45, '#ef4444', 12);
        }
      }

      // 8. CHECK EXIT ZONE & ESCAPE TRIGGER
      checkObjectives(sim);
      const inExit =
        p.x > lvl.exitZone.x &&
        p.x < lvl.exitZone.x + lvl.exitZone.width &&
        p.y > lvl.exitZone.y &&
        p.y < lvl.exitZone.y + lvl.exitZone.height;

      if (inExit && sim.exitUnlocked) {
        // VICTORY!
        const timeSec = Math.floor((performance.now() - sim.levelStartTime) / 1000);
        const finalScore = calculateGameScore({
          escaped: true,
          timeSeconds: timeSec,
          zombiesSlain: sim.stats.zombiesSlain,
          itemsCrafted: sim.stats.itemsCrafted,
          remainingHpPercent: Math.round((p.hp / p.maxHp) * 100),
          isDaily,
        });

        // Update local save
        const nextSave = { ...saveData };
        nextSave.stats.totalEscapes += 1;
        nextSave.stats.totalZombiesSlain += sim.stats.zombiesSlain;
        nextSave.stats.highestLevelUnlocked = Math.max(
          nextSave.stats.highestLevelUnlocked,
          Math.min(10, currentLevelId + 1)
        );
        saveSaveSlot(getActiveSlotId(), nextSave);
        setSaveData(nextSave);

        setRunStats({
          score: finalScore,
          timeSeconds: timeSec,
          zombiesSlain: sim.stats.zombiesSlain,
          itemsCrafted: sim.stats.itemsCrafted,
          levelName: lvl.nameKey,
        });
        setGameState('victory');
        return;
      }

      // 9. CHECK PLAYER DEATH
      if (p.hp <= 0) {
        const timeSec = Math.floor((performance.now() - sim.levelStartTime) / 1000);
        const finalScore = calculateGameScore({
          escaped: false,
          timeSeconds: timeSec,
          zombiesSlain: sim.stats.zombiesSlain,
          itemsCrafted: sim.stats.itemsCrafted,
          remainingHpPercent: 0,
          isDaily,
        });

        const nextSave = { ...saveData };
        nextSave.stats.totalDeaths += 1;
        nextSave.stats.totalZombiesSlain += sim.stats.zombiesSlain;
        saveSaveSlot(getActiveSlotId(), nextSave);
        setSaveData(nextSave);

        setRunStats({
          score: finalScore,
          timeSeconds: timeSec,
          zombiesSlain: sim.stats.zombiesSlain,
          itemsCrafted: sim.stats.itemsCrafted,
          levelName: lvl.nameKey,
        });
        setGameState('gameover');
        return;
      }

      // Smooth camera follow
      sim.camera.x += (p.x - sim.camera.x) * 0.12;
      sim.camera.y += (p.y - sim.camera.y) * 0.12;
      sim.camera.trauma = Math.max(0, sim.camera.trauma - dt * 1.5);

      // 10. RENDER FRAME
      const attackProgress =
        p.isAttacking && p.attackAnimDuration > 0
          ? 1 - p.attackAnimTimer / p.attackAnimDuration
          : 0;
      renderer.render({
        level: lvl,
        player: {
          x: p.x,
          y: p.y,
          angle: p.angle,
          hp: p.hp,
          maxHp: p.maxHp,
          stamina: p.stamina,
          flashlightOn: p.flashlightOn,
          battery: p.battery,
          equippedWeapon: p.equippedWeapon,
          isAttacking: p.isAttacking,
          attackType: p.attackType,
          attackProgress,
          attackComboSide: p.attackComboSide,
          isMoving: moveX !== 0 || moveY !== 0,
          aimAngle: p.aimAngle,
          activeSearchContainerId: p.activeSearchContainerId,
          searchProgress: p.searchProgress,
        },
        zombies: sim.zombies,
        projectiles: sim.projectiles,
        barricades: sim.barricades,
        decoys: sim.decoys,
        firePatches: sim.firePatches,
        groundItems: sim.groundItems,
        sonarTimer: sim.sonarTimer,
        cameraX: sim.camera.x,
        cameraY: sim.camera.y,
        cameraTrauma: sim.camera.trauma,
        theme: settings.theme,
        brightness: settings.brightness || 1.0,
        exitUnlocked: sim.exitUnlocked,
      });

      // 11. UPDATE REACT HUD VALUES
      setHudHp(p.hp);
      setHudMaxHp(p.maxHp);
      setHudStamina(p.stamina);
      setHudMaxStamina(p.maxStamina);
      setHudBattery(p.battery);
      setHudMaxBattery(p.maxBattery);
      setHudNoise(noise);
      setHudFlashlight(p.flashlightOn);
      setHudWeapon(p.equippedWeapon);
      setHudSneaking(isSneaking);
      setHudSprinting(isSprinting);
      setHudEscapeReady(sim.exitUnlocked);

      const ammoDef = ITEM_REGISTRY[p.equippedWeapon]?.ammoType;
      if (ammoDef) {
        const item = p.inventory.find(i => i.itemId === ammoDef);
        setHudAmmo(item ? item.count : 0);
      } else {
        setHudAmmo(0);
      }

      // Reset single-frame edge triggers
      inputManager.endFrame();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, settings, isDaily, currentLevelId, saveData, selectedCharacter]);

  // Helper to verify if level escape conditions are met
  const checkObjectives = (sim: any) => {
    const lvl = sim.level;
    const inv = sim.player.inventory;

    let unlocked = true;
    if (lvl.exitRequiresItems && lvl.exitRequiresItems.length > 0) {
      for (const req of lvl.exitRequiresItems) {
        const item = inv.find((i: any) => i.itemId === req.itemId);
        if (!item || item.count < req.count) {
          unlocked = false;
          break;
        }
      }
    }

    if (unlocked && !sim.exitUnlocked) {
      sim.exitUnlocked = true;
      soundManager.playEscapeUnlocked();
      rendererRef.current?.addFloatingText('CỔNG THOÁT HIỂM ĐÃ MỞ!', sim.player.x, sim.player.y - 35, '#22c55e', 18);
    } else if (!unlocked) {
      sim.exitUnlocked = false;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundManager.setMuted(nextMute, settings.masterVolume);
  };

  const handleToggleFlashlight = () => {
    if (simStateRef.current?.player) {
      simStateRef.current.player.flashlightOn = !simStateRef.current.player.flashlightOn;
      soundManager.playFlashlightClick();
    }
  };

  return (
    <div
      className={`relative w-full h-screen overflow-hidden select-none bg-black ${
        settings.theme === 'midnight'
          ? 'theme-midnight'
          : settings.theme === 'nightvision'
          ? 'theme-nightvision'
          : settings.theme === 'crt'
          ? 'crt-overlay'
          : ''
      }`}
    >
      {/* 2D CANVAS SURFACE */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair pixelated z-0"
      />

      {/* TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={() => startRun(currentLevelId, false)}
          onOpenDaily={() => setIsDailyOpen(true)}
          onOpenLevels={() => setIsLevelModal(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenSurvivors={() => setIsSurvivorOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenUpdates={() => setIsUpdatesOpen(true)}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          selectedCharacter={selectedCharacter}
          gamepadConnected={gamepadConnected}
          lang={settings.language}
        />
      )}

      {/* PLAYING HUD OVERLAY */}
      {gameState === 'playing' && simStateRef.current && (
        <GameHUD
          hp={hudHp}
          maxHp={hudMaxHp}
          stamina={hudStamina}
          maxStamina={hudMaxStamina}
          battery={hudBattery}
          maxBattery={hudMaxBattery}
          noiseLevel={hudNoise}
          flashlightOn={hudFlashlight}
          equippedWeapon={hudWeapon}
          ammoCount={hudAmmo}
          currentObjective={simStateRef.current.level.objectives[0] || null}
          escapeReady={hudEscapeReady}
          isSneaking={hudSneaking}
          isSprinting={hudSprinting}
          gamepadConnected={gamepadConnected}
          isMuted={isMuted}
          lang={settings.language}
          interactTargetName={hudInteractName}
          level={simStateRef.current.level}
          playerPos={{
            x: simStateRef.current.player.x,
            y: simStateRef.current.player.y,
            aimAngle: simStateRef.current.player.aimAngle,
          }}
          zombies={simStateRef.current.zombies}
          inventory={simStateRef.current.player.inventory}
          minimapVisible={settings.minimapVisible}
          onToggleMinimap={() => {
            setSettings(s => {
              const next = !s.minimapVisible;
              saveSettings({ ...s, minimapVisible: next });
              return { ...s, minimapVisible: next };
            });
          }}
          onOpenCrafting={() => setIsCraftingOpen(true)}
          onTogglePause={() => setGameState('paused')}
          onToggleMute={handleToggleMute}
          onToggleFlashlight={handleToggleFlashlight}
        />
      )}

      {/* CRAFTING MODAL */}
      <CraftingModal
        isOpen={isCraftingOpen}
        onClose={() => setIsCraftingOpen(false)}
        inventory={simStateRef.current?.player?.inventory || []}
        onUpdateInventory={newInv => {
          if (simStateRef.current?.player) {
            simStateRef.current.player.inventory = newInv;
          }
        }}
        lang={settings.language}
        onItemCrafted={() => {
          if (simStateRef.current?.stats) {
            simStateRef.current.stats.itemsCrafted += 1;
          }
        }}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={newSet => {
          setSettings(newSet);
          saveSettings(newSet);
        }}
      />

      {/* LEADERBOARD MODAL */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        lang={settings.language}
      />

      {/* DAILY CHALLENGE MODAL */}
      <DailyChallengeModal
        isOpen={isDailyOpen}
        onClose={() => setIsDailyOpen(false)}
        onStartDaily={() => startRun(1, true)}
        lang={settings.language}
      />

      {/* SURVIVOR SELECT MODAL */}
      <SurvivorModal
        isOpen={isSurvivorOpen}
        onClose={() => setIsSurvivorOpen(false)}
        selectedCharacter={selectedCharacter}
        onSelectCharacter={char => {
          setSelectedCharacter(char);
          const next = { ...saveData, selectedCharacter: char };
          setSaveData(next);
          saveSaveSlot(getActiveSlotId(), next);
        }}
        lang={settings.language}
      />

      {/* SAVE / LOAD MODAL */}
      <SaveModal
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        currentSaveData={saveData}
        onLoadData={loaded => {
          setSaveData(loaded);
          if (loaded.selectedCharacter) setSelectedCharacter(loaded.selectedCharacter);
        }}
        lang={settings.language}
      />

      {/* UPDATES ROADMAP MODAL */}
      <UpdatesModal
        isOpen={isUpdatesOpen}
        onClose={() => setIsUpdatesOpen(false)}
        lang={settings.language}
      />

      {/* LEVEL SELECT MODAL */}
      <LevelSelectModal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModal(false)}
        highestLevelUnlocked={saveData.stats.highestLevelUnlocked}
        onSelectLevel={lvlId => startRun(lvlId, false)}
        lang={settings.language}
      />

      {/* PAUSE MODAL */}
      <PauseModal
        isOpen={gameState === 'paused'}
        onResume={() => setGameState('playing')}
        onRestart={() => startRun(currentLevelId, isDaily)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSave={() => setIsSaveOpen(true)}
        onMainMenu={() => {
          setGameState('title');
          soundManager.stopAmbience();
        }}
        lang={settings.language}
      />

      {/* VICTORY MODAL */}
      <VictoryModal
        isOpen={gameState === 'victory'}
        score={runStats.score}
        timeSeconds={runStats.timeSeconds}
        zombiesSlain={runStats.zombiesSlain}
        itemsCrafted={runStats.itemsCrafted}
        levelName={runStats.levelName}
        isDaily={isDaily}
        hasNextLevel={currentLevelId < 10}
        lang={settings.language}
        onNextLevel={() => startRun(currentLevelId + 1, false)}
        onRestart={() => startRun(currentLevelId, isDaily)}
        onMainMenu={() => {
          setGameState('title');
          soundManager.stopAmbience();
        }}
      />

      {/* GAME OVER MODAL */}
      <GameOverModal
        isOpen={gameState === 'gameover'}
        score={runStats.score}
        timeSeconds={runStats.timeSeconds}
        zombiesSlain={runStats.zombiesSlain}
        lang={settings.language}
        onRestart={() => startRun(currentLevelId, isDaily)}
        onMainMenu={() => {
          setGameState('title');
          soundManager.stopAmbience();
        }}
      />
    </div>
  );
}
