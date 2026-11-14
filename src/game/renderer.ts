import {
  Barricade,
  DecoyActive,
  EnvironmentalTrap,
  FirePatch,
  GroundItem,
  LevelConfig,
  LootContainer,
  Obstacle,
  Projectile,
  Zombie,
} from '../types/game';
import { ITEM_REGISTRY } from './items';
import { computeGunRecoilPose, computeMeleeSwingPose } from './combatAnim';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // 0 to 1
  size: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  color: string;
  radius: number;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  comboSide: 1 | -1;
  hit: boolean;
  life: number; // 1 -> 0
  maxLife: number;
}

export interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  isShell?: boolean;
  rotation?: number;
  vRot?: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightingCanvas: HTMLCanvasElement | null = null;
  private lightingCtx: CanvasRenderingContext2D | null = null;
  public bloodSplats: BloodParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public slashEffects: SlashEffect[] = [];
  public combatParticles: CombatParticle[] = [];
  private lastAnimTick: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    if (typeof document !== 'undefined') {
      this.lightingCanvas = document.createElement('canvas');
      this.lightingCtx = this.lightingCanvas.getContext('2d');
    }
  }

  public addFloatingText(text: string, x: number, y: number, color: string = '#ffffff', size: number = 13) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      life: 1.0,
      size,
    });
  }

  public addBlood(x: number, y: number, count: number = 5) {
    const colors = ['#881337', '#991b1b', '#7f1d1d', '#581c87'];
    for (let i = 0; i < count; i++) {
      this.bloodSplats.push({
        x: x + (Math.random() * 24 - 12),
        y: y + (Math.random() * 24 - 12),
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 4 + 2,
      });
    }
    // Limit splats
    if (this.bloodSplats.length > 250) {
      this.bloodSplats.splice(0, 50);
    }
  }

  public addMeleeSlash(x: number, y: number, angle: number, comboSide: 1 | -1, hit: boolean) {
    this.slashEffects.push({
      x,
      y,
      angle,
      comboSide,
      hit,
      life: 0.19,
      maxLife: 0.19,
    });
  }

  public addImpactSparks(
    x: number,
    y: number,
    baseAngle: number,
    color: string = '#fef08a',
    count: number = 7
  ) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      const spd = 90 + Math.random() * 190;
      const maxLife = 0.16 + Math.random() * 0.16;
      this.combatParticles.push({
        x,
        y,
        vx: Math.cos(baseAngle + spread) * spd,
        vy: Math.sin(baseAngle + spread) * spd,
        color,
        size: 2 + Math.random() * 2.5,
        life: maxLife,
        maxLife,
      });
    }
    if (this.combatParticles.length > 180) {
      this.combatParticles.splice(0, 40);
    }
  }

  public addShellCasing(x: number, y: number, aimAngle: number, isShotgun: boolean = false) {
    const ejectAngle = aimAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.45;
    const spd = 75 + Math.random() * 55;
    const maxLife = 0.55;
    this.combatParticles.push({
      x: x + Math.cos(aimAngle) * 14,
      y: y + Math.sin(aimAngle) * 14,
      vx: Math.cos(ejectAngle) * spd,
      vy: Math.sin(ejectAngle) * spd,
      color: isShotgun ? '#dc2626' : '#facc15',
      size: isShotgun ? 5 : 3.5,
      life: maxLife,
      maxLife,
      isShell: true,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 18,
    });
  }

  public render(params: {
    level: LevelConfig;
    player: {
      x: number;
      y: number;
      angle: number;
      hp: number;
      maxHp: number;
      stamina: number;
      flashlightOn: boolean;
      battery: number;
      equippedWeapon: string;
      isAttacking: boolean;
      attackType: 'melee' | 'pistol' | 'shotgun';
      attackProgress?: number;
      attackComboSide?: 1 | -1;
      isMoving?: boolean;
      aimAngle: number;
      activeSearchContainerId: string | null;
      searchProgress: number;
      adrenalineTimer?: number;
    };
    groundItems?: GroundItem[];
    sonarTimer?: number;
    zombies: Zombie[];
    projectiles: Projectile[];
    barricades: Barricade[];
    decoys: DecoyActive[];
    firePatches: FirePatch[];
    cameraX: number;
    cameraY: number;
    cameraTrauma: number;
    theme: string;
    brightness?: number;
    exitUnlocked: boolean;
  }) {
    const {
      level,
      player,
      groundItems = [],
      sonarTimer = 0,
      zombies,
      projectiles,
      barricades,
      decoys,
      firePatches,
      cameraX,
      cameraY,
      cameraTrauma,
      theme,
      brightness = 1.15,
      exitUnlocked,
    } = params;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Apply Camera Shake (trauma^2)
    const shakeAngle = Math.random() * Math.PI * 2;
    const shakeMag = cameraTrauma * cameraTrauma * 16;
    const shakeX = Math.cos(shakeAngle) * shakeMag;
    const shakeY = Math.sin(shakeAngle) * shakeMag;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Camera transform
    ctx.translate(
      Math.floor(width / 2 - cameraX + shakeX),
      Math.floor(height / 2 - cameraY + shakeY)
    );

    // --- 1. RENDER WORLD FLOOR & GRID ---
    this.renderFloor(ctx, level);

    // Render blood splats on floor
    for (const b of this.bloodSplats) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 2. RENDER EXIT GATE / EXTRACTION ZONE ---
    this.renderExitZone(ctx, level.exitZone, exitUnlocked);

    // --- 2.5 RENDER GROUND ITEMS (DROPPED LOOT) ---
    this.renderGroundItems(ctx, groundItems);

    // --- 3. RENDER CONTAINERS ---
    this.renderContainers(ctx, level.containers, player.activeSearchContainerId, player.searchProgress);

    // --- 4. RENDER BARRICADES ---
    this.renderBarricades(ctx, barricades);

    // --- 5. RENDER FIRE PATCHES, TRAPS & DECOYS ---
    this.renderTraps(ctx, level.traps || []);
    this.renderFirePatches(ctx, firePatches);
    this.renderDecoys(ctx, decoys);

    // --- 6. RENDER OBSTACLES (WALLS & PROPS) ---
    this.renderObstacles(ctx, level.obstacles);

    const nowTick = performance.now();
    const animDt = this.lastAnimTick > 0 ? Math.min(0.05, (nowTick - this.lastAnimTick) / 1000) : 0.016;
    this.lastAnimTick = nowTick;

    // --- 7. RENDER PROJECTILES ---
    this.renderProjectiles(ctx, projectiles);

    // --- 8. RENDER ZOMBIES ---
    for (const z of zombies) {
      this.renderZombie(ctx, z, sonarTimer);
    }

    // --- 9. RENDER PLAYER ---
    this.renderPlayer(ctx, player);

    // --- 9.2 RENDER MELEE SLASH ARCS & COMBAT IMPACT SPARKS ---
    this.renderSlashEffects(ctx, animDt);
    this.renderCombatParticles(ctx, animDt);

    // --- 9.5 RENDER SONAR PULSE WAVE ---
    this.renderSonarWave(ctx, player.x, player.y, sonarTimer);

    // --- 10. RENDER FLOATING TEXTS ---
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // --- 11. DYNAMIC LIGHTING / FOG OF WAR & FLASHLIGHT CONE ---
    this.renderLightingOverlay(
      ctx,
      width,
      height,
      player,
      cameraX,
      cameraY,
      level.darkness,
      decoys,
      firePatches,
      exitUnlocked,
      level.exitZone,
      brightness,
      zombies,
      level.traps || []
    );

    // --- 12. LOW HEALTH VIGNETTE ---
    if (player.hp < player.maxHp * 0.35) {
      const vignetteIntensity = 1 - player.hp / (player.maxHp * 0.35);
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.3,
        width / 2,
        height / 2,
        width * 0.7
      );
      grad.addColorStop(0, 'rgba(153, 27, 27, 0)');
      grad.addColorStop(1, `rgba(153, 27, 27, ${0.45 * vignetteIntensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // --- 13. RETRO VISUAL FILTER OVERLAY ---
    if (theme === 'nightvision') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  private renderFloor(ctx: CanvasRenderingContext2D, level: LevelConfig) {
    // Base tile color - balanced dark slate
    ctx.fillStyle = '#202532';
    ctx.fillRect(0, 0, level.width, level.height);

    // Tile grid (64x64 pixel tiles) with visible clean lines
    ctx.strokeStyle = '#2d3546';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 0; x <= level.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, level.height);
      ctx.stroke();
    }
    for (let y = 0; y <= level.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(level.width, y);
      ctx.stroke();
    }
  }

  private renderExitZone(
    ctx: CanvasRenderingContext2D,
    zone: { x: number; y: number; width: number; height: number },
    unlocked: boolean
  ) {
    ctx.save();
    // Glowing perimeter
    ctx.strokeStyle = unlocked ? '#22c55e' : '#eab308';
    ctx.fillStyle = unlocked ? 'rgba(34, 197, 94, 0.22)' : 'rgba(234, 179, 8, 0.12)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

    // Exit sign
    ctx.font = '10px "Press Start 2P", monospace, sans-serif';
    ctx.fillStyle = unlocked ? '#4ade80' : '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(
      unlocked ? 'EXIT [RUN!]' : 'LOCKED',
      zone.x + zone.width / 2,
      zone.y + zone.height / 2 + 4
    );
    ctx.restore();
  }

  private renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
    for (const obs of obstacles) {
      if (obs.type === 'wall') {
        // Pixel brick wall
        ctx.fillStyle = '#374151';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // 3D Top bevel
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(obs.x, obs.y, obs.width, Math.min(8, obs.height));

        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'table') {
        // Medical table / hospital bed
        ctx.fillStyle = '#475569';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#cbd5e1';
        // Red cross
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(obs.x + obs.width / 2 - 4, obs.y + obs.height / 2 - 10, 8, 20);
        ctx.fillRect(obs.x + obs.width / 2 - 10, obs.y + obs.height / 2 - 4, 20, 8);
      } else if (obs.type === 'car') {
        // Abandoned Car
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Windshield
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(obs.x + 12, obs.y + 6, obs.width - 24, 12);
        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(obs.x + 2, obs.y + 4, 6, 6);
        ctx.fillRect(obs.x + 2, obs.y + obs.height - 10, 6, 6);
      } else {
        // Debris / Crates
        ctx.fillStyle = '#292524';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#44403c';
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
    }
  }

  private renderContainers(
    ctx: CanvasRenderingContext2D,
    containers: LootContainer[],
    activeSearchId: string | null,
    searchProgress: number
  ) {
    for (const c of containers) {
      ctx.save();
      if (c.searched) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(c.x, c.y, c.width, c.height);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(c.x, c.y, c.width, c.height);
      } else {
        // Pulsing unsearched glow
        ctx.fillStyle = c.type === 'med_cabinet' ? '#065f46' : c.type === 'ambulance' ? '#991b1b' : '#78350f';
        ctx.fillRect(c.x, c.y, c.width, c.height);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x, c.y, c.width, c.height);

        // Icon hint
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = c.type === 'med_cabinet' ? '🏥' : c.type === 'ambulance' ? '🚑' : c.type === 'locker' ? '🗄️' : '📦';
        ctx.fillText(icon, c.x + c.width / 2, c.y + c.height / 2);
      }

      // Sleek Circular Search Progress Bar with percentage
      if (activeSearchId === c.id && searchProgress > 0) {
        const pct = Math.min(1, searchProgress / c.searchTime);
        const cx = c.x + c.width / 2;
        const cy = c.y + c.height / 2;
        const r = c.width * 0.8;

        // Background track
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Glowing progress arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Percentage text banner
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(pct * 100)}%`, cx, c.y - 12);
      }

      ctx.restore();
    }
  }

  private renderGroundItems(ctx: CanvasRenderingContext2D, items: GroundItem[]) {
    const time = performance.now() / 1000;
    for (const item of items) {
      const def = ITEM_REGISTRY[item.itemId];
      if (!def) continue;

      ctx.save();
      const bob = Math.sin(time * 5 + item.x * 0.05) * 3;
      const drawX = item.x;
      const drawY = item.y + bob;

      // Outer glow aura
      ctx.fillStyle = def.rarity === 'rare' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.3)';
      ctx.beginPath();
      ctx.arc(drawX, drawY + 8, 14, 0, Math.PI * 2);
      ctx.fill();

      // Item icon
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, drawX, drawY);

      // Quantity tag if count > 1
      if (item.count > 1) {
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(`x${item.count}`, drawX + 12, drawY - 4);
        ctx.fillText(`x${item.count}`, drawX + 12, drawY - 4);
      }

      ctx.restore();
    }
  }

  private renderSonarWave(ctx: CanvasRenderingContext2D, px: number, py: number, sonarTimer: number) {
    if (sonarTimer <= 0) return;
    const progress = 1 - (sonarTimer / 4.0); // 0 to 1 over 4 seconds
    const radius = progress * 650;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.85})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (radius > 80) {
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, radius - 80, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderBarricades(ctx: CanvasRenderingContext2D, barricades: Barricade[]) {
    for (const b of barricades) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      // Wood cross planks
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.width, b.height);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.width, b.y + b.height);
      ctx.moveTo(b.x + b.width, b.y);
      ctx.lineTo(b.x, b.y + b.height);
      ctx.stroke();

      // Health bar
      const hpPct = b.hp / b.maxHp;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(b.x, b.y - 7, b.width, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(b.x, b.y - 7, b.width * hpPct, 4);
    }
  }

  private renderTraps(ctx: CanvasRenderingContext2D, traps: EnvironmentalTrap[]) {
    const now = Date.now();
    for (const trap of traps) {
      ctx.save();
      const cx = trap.x + trap.width / 2;
      const cy = trap.y + trap.height / 2;

      if (trap.type === 'exploding_barrel') {
        if (trap.state === 'destroyed') {
          // Scorched blast crater & twisted metal remains
          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 11, 0.4, Math.PI * 1.6);
          ctx.stroke();
        } else if (trap.state === 'active') {
          // Active blast fireball & expanding shockwave ring
          const progress = 1 - Math.max(0, trap.activeTimer) / 0.45;
          const blastR = Math.max(18, trap.radius * (0.35 + progress * 0.75));

          const blastGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, blastR);
          blastGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          blastGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.85)');
          blastGrad.addColorStop(0.7, 'rgba(249, 115, 22, 0.55)');
          blastGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = blastGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, blastR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(251, 146, 60, ${Math.max(0, 1 - progress)})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, trap.radius * Math.min(1, 0.25 + progress * 0.85), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Armed or Primed Barrel
          const isPrimed = trap.state === 'primed';
          const flash = isPrimed && Math.floor(now / 70) % 2 === 0;

          if (isPrimed) {
            // Pulsing warning blast zone ring
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.arc(cx, cy, trap.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Ground shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(cx + 2, cy + 4, 15, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Pixel Fuel Drum body
          ctx.fillStyle = flash ? '#f97316' : '#dc2626';
          ctx.fillRect(trap.x + 2, trap.y + 2, trap.width - 4, trap.height - 4);
          // Steel drum ribs
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(trap.x + 1, trap.y + 2, trap.width - 2, 4);
          ctx.fillRect(trap.x + 1, trap.y + trap.height - 6, trap.width - 2, 4);
          // Hazard yellow stripe across center
          ctx.fillStyle = flash ? '#ffffff' : '#facc15';
          ctx.fillRect(trap.x + 3, cy - 4, trap.width - 6, 8);
          // Hazard diamond/flame glyph
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(cx - 3, cy - 3, 6, 6);
          ctx.strokeStyle = '#450a0a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(trap.x + 2, trap.y + 2, trap.width - 4, trap.height - 4);

          if (isPrimed) {
            // Fizzing sparks above barrel
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx + (Math.random() - 0.5) * 14, trap.y - 4 + (Math.random() - 0.5) * 6, 4, 4);
            // Fuse countdown bar
            const pct = Math.max(0, Math.min(1, trap.fuseTimer / 0.75));
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(trap.x, trap.y - 8, trap.width, 4);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(trap.x, trap.y - 8, trap.width * pct, 4);
          } else if (trap.hp < trap.maxHp) {
            const pct = trap.hp / trap.maxHp;
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(trap.x, trap.y - 7, trap.width, 3);
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(trap.x, trap.y - 7, trap.width * pct, 3);
          }
        }
      } else {
        // ELECTRIC WIRE TRAP
        const isActive = trap.state === 'active';
        const isCooldown = trap.state === 'cooldown';

        // Floor hazard zone frame
        ctx.fillStyle = isActive
          ? 'rgba(34, 211, 238, 0.22)'
          : isCooldown
          ? 'rgba(51, 65, 85, 0.25)'
          : 'rgba(14, 116, 144, 0.16)';
        ctx.fillRect(trap.x, trap.y, trap.width, trap.height);

        ctx.strokeStyle = isActive ? '#67e8f9' : isCooldown ? '#64748b' : '#eab308';
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(trap.x, trap.y, trap.width, trap.height);
        ctx.setLineDash([]);

        // Copper wire strands laid across the zone
        ctx.strokeStyle = isCooldown ? '#475569' : '#d97706';
        ctx.lineWidth = 2;
        const rows = 3;
        for (let r = 1; r <= rows; r++) {
          const wy = trap.y + (trap.height * r) / (rows + 1);
          ctx.beginPath();
          ctx.moveTo(trap.x + 4, wy);
          ctx.lineTo(trap.x + trap.width - 4, wy);
          ctx.stroke();
        }

        // High-voltage junction box on top-left corner
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(trap.x - 3, trap.y - 3, 14, 14);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(trap.x - 3, trap.y - 3, 14, 14);
        // LED status indicator
        ctx.fillStyle = isActive ? '#ffffff' : isCooldown ? '#f59e0b' : '#22d3ee';
        ctx.fillRect(trap.x + 2, trap.y + 2, 4, 4);

        // Armed idle spark glint
        if (trap.state === 'armed' && (now % 900) < 160) {
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(trap.x + 12, trap.y + trap.height * 0.35);
          ctx.lineTo(cx, trap.y + trap.height * 0.55);
          ctx.lineTo(trap.x + trap.width - 10, trap.y + trap.height * 0.4);
          ctx.stroke();
        }

        // Active high-voltage lightning arcs across the trap
        if (isActive) {
          for (let bolt = 0; bolt < 3; bolt++) {
            ctx.strokeStyle = bolt === 0 ? '#ffffff' : '#22d3ee';
            ctx.lineWidth = bolt === 0 ? 2.2 : 1.5;
            ctx.beginPath();
            const startY = trap.y + 6 + Math.random() * (trap.height - 12);
            ctx.moveTo(trap.x + 4, startY);
            const segments = 5;
            for (let s = 1; s < segments; s++) {
              const bx = trap.x + (trap.width * s) / segments;
              const by = trap.y + 6 + Math.random() * (trap.height - 12);
              ctx.lineTo(bx, by);
            }
            ctx.lineTo(trap.x + trap.width - 4, trap.y + 6 + Math.random() * (trap.height - 12));
            ctx.stroke();
          }
        } else if (isCooldown) {
          const pct = Math.max(0, 1 - trap.cooldownTimer / 4.5);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(trap.x + 14, trap.y - 5, trap.width - 16, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(trap.x + 14, trap.y - 5, (trap.width - 16) * pct, 4);
        }
      }

      ctx.restore();
    }
  }

  private renderFirePatches(ctx: CanvasRenderingContext2D, fires: FirePatch[]) {
    for (const f of fires) {
      const grad = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.radius);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      grad.addColorStop(0.4, 'rgba(249, 115, 22, 0.65)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();

      // Flickering sparks
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * f.radius * 1.2;
        const oy = (Math.random() - 0.5) * f.radius * 1.2;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(f.x + ox, f.y + oy, 3, 3);
      }
    }
  }

  private renderDecoys(ctx: CanvasRenderingContext2D, decoys: DecoyActive[]) {
    for (const d of decoys) {
      // Radiating sound rings
      const pulse = (Date.now() % 600) / 600;
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 * (1 - pulse)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 20 + pulse * 60, 0, Math.PI * 2);
      ctx.stroke();

      // Device icon
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(d.x - 7, d.y - 7, 14, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(d.x - 3, d.y - 3, 6, 6);
      ctx.restore();
    }
  }

  private renderSlashEffects(ctx: CanvasRenderingContext2D, dt: number) {
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const s = this.slashEffects[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.slashEffects.splice(i, 1);
        continue;
      }

      const t = 1 - s.life / s.maxLife; // 0 -> 1
      const alpha = Math.max(0, 1 - Math.pow(t, 1.4));
      const arcSpan = 1.65;
      const sweepStart = s.angle - (arcSpan * 0.55) * s.comboSide;
      const sweepEnd = s.angle + (arcSpan * 0.55) * s.comboSide;
      const anticlockwise = s.comboSide < 0;

      ctx.save();
      ctx.translate(s.x, s.y);

      // Outer crimson/cyan impact crescent
      const radius = 56 + t * 14;
      ctx.strokeStyle = s.hit
        ? `rgba(244, 63, 94, ${alpha * 0.78})`
        : `rgba(56, 189, 248, ${alpha * 0.65})`;
      ctx.lineWidth = (1 - t) * 12 + 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, radius, sweepStart, sweepEnd, anticlockwise);
      ctx.stroke();

      // Inner razor steel flash core
      ctx.strokeStyle = `rgba(248, 250, 252, ${alpha * 0.92})`;
      ctx.lineWidth = (1 - t) * 5 + 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 3, sweepStart, sweepEnd, anticlockwise);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderCombatParticles(ctx: CanvasRenderingContext2D, dt: number) {
    for (let i = this.combatParticles.length - 1; i >= 0; i--) {
      const pt = this.combatParticles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.combatParticles.splice(i, 1);
        continue;
      }

      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.88;
      pt.vy *= 0.88;
      if (pt.rotation !== undefined && pt.vRot !== undefined) {
        pt.rotation += pt.vRot * dt;
      }

      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      if (pt.rotation) ctx.rotate(pt.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;

      if (pt.isShell) {
        ctx.fillRect(-pt.size / 2, -1.5, pt.size, 3);
      } else {
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
      }
      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
    for (const p of projectiles) {
      ctx.save();
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const nx = p.vx / speed;
      const ny = p.vy / speed;

      if (p.type === 'bullet') {
        const tailLen = 22;
        const grad = ctx.createLinearGradient(p.x - nx * tailLen, p.y - ny * tailLen, p.x, p.y);
        grad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        grad.addColorStop(1, '#fef08a');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - nx * tailLen, p.y - ny * tailLen);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'pellet') {
        const tailLen = 16;
        const grad = ctx.createLinearGradient(p.x - nx * tailLen, p.y - ny * tailLen, p.x, p.y);
        grad.addColorStop(0, 'rgba(251, 146, 60, 0)');
        grad.addColorStop(1, '#fb923c');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - nx * tailLen, p.y - ny * tailLen);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'acid') {
        ctx.fillStyle = 'rgba(132, 204, 22, 0.35)';
        ctx.beginPath();
        ctx.arc(p.x - nx * 6, p.y - ny * 6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a3e635';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'molotov') {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      }
      ctx.restore();
    }
  }

  private renderZombie(ctx: CanvasRenderingContext2D, z: Zombie, sonarTimer: number = 0) {
    if (z.state === 'dead') {
      // Rotting corpse remains with dried dark blood
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle);
      // Dark coagulated blood pool
      ctx.fillStyle = '#300808';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 11, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Crumpled decaying torso
      ctx.fillStyle = '#2b3628';
      ctx.fillRect(-8, -6, 16, 12);
      // Exposed bone splinters
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2, -3, 6, 2);
      // Severed ragged limb
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 2, 7, 4);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(z.angle);

    const now = Date.now();
    // Shambling lurching walk cycle twitch + bite lunge
    const isBiting = z.attackCooldown > 0.65;
    const lungeOffset = isBiting ? Math.sin(((z.attackCooldown - 0.65) / 0.35) * Math.PI) * 7 : 0;
    if (lungeOffset > 0) ctx.translate(lungeOffset, 0);

    const lurch = Math.sin(now * 0.007 + z.x * 0.1) * 2;
    const armTwitch = Math.cos(now * 0.009 + z.y * 0.1) * 3 + (isBiting ? 5 : 0);

    // Hit recoil flash pulse
    const isHitFlashing = (z.hitFlashTimer || 0) > 0;
    if (isHitFlashing) {
      ctx.scale(1.12, 0.9);
    }

    // Telegraph flash windup before lunging or spitting acid
    if (z.telegraphTimer > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, z.type === 'tank_mutant' ? 46 : 28, 0, Math.PI * 2);
      ctx.stroke();
    }

    const radius = z.type === 'tank_mutant' ? 28 : z.type === 'dog' ? 13 : 16;

    // --- ZOMBIE ARCHETYPE RENDERING ---
    if (z.type === 'walker') {
      // 1. Shambling Decaying Human Zombie (Horror Corpse)
      // Ragged torn shirt on back
      ctx.fillStyle = '#1e293b'; // Torn civilian dark shirt
      ctx.beginPath();
      ctx.ellipse(-2 + lurch, 0, 13, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Exposed rotting spine & ribcage
      ctx.fillStyle = '#3f4e3c'; // Decaying flesh
      ctx.fillRect(-7, -4, 6, 8);
      ctx.fillStyle = '#cbd5e1'; // Exposed rib bone
      ctx.fillRect(-5, -3, 3, 2);
      ctx.fillRect(-5, 1, 3, 2);
      // Dried festering blood wound
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(-3, -2, 4, 5);

      // Rotting shoulders & rotting head
      ctx.fillStyle = '#3b4938'; // Sickly decomposing green-gray
      ctx.beginPath();
      ctx.arc(3, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Patch of decaying hair
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, -3, 5, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // Sunken eye sockets & dead cataracts / red infection
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(7, -4, 3, 3);
      ctx.fillRect(7, 2, 3, 3);
      ctx.fillStyle = '#ef4444'; // Glowing dead red pupil
      ctx.fillRect(8, -3, 2, 2);
      ctx.fillRect(8, 2, 2, 2);

      // Gaping bloody jaw hanging open with crooked yellow teeth
      ctx.fillStyle = '#290606';
      ctx.fillRect(9, -3, 4, 6);
      ctx.fillStyle = '#fef08a'; // Yellow rot teeth
      ctx.fillRect(11, -3, 2, 2);
      ctx.fillRect(11, 1, 2, 2);

      // Outstretched decaying arms with bloody claws
      ctx.fillStyle = '#3b4938';
      // Left arm (reaching forward)
      ctx.fillRect(4, -12, 14 + armTwitch, 4);
      // Right arm (twisted forward)
      ctx.fillRect(4, 8, 12 - armTwitch, 4);
      // Sharp bloody claw tips
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(17 + armTwitch, -13, 3, 5);
      ctx.fillRect(15 - armTwitch, 7, 3, 5);

    } else if (z.type === 'runner') {
      // 2. Crimson Fast Runner (Flayed skin, frenzied predator)
      // Emaciated flayed body
      ctx.fillStyle = '#7f1d1d'; // Crimson flayed muscle
      ctx.beginPath();
      ctx.ellipse(-2, 0, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Exposed spine vertebrae
      ctx.fillStyle = '#f1f5f9';
      for (let i = -7; i <= 1; i += 3) {
        ctx.fillRect(i, -1.5, 2, 3);
      }

      // Twitching predatory skull
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(5, lurch * 0.8, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Manic glowing yellow/white eyes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(9, -3 + lurch * 0.8, 2.5, 2.5);
      ctx.fillRect(9, 2 + lurch * 0.8, 2.5, 2.5);

      // Elongated skeletal claw arms poised to pounce
      ctx.fillStyle = '#581c87';
      ctx.fillRect(4, -11, 17, 3.5);
      ctx.fillRect(4, 8, 17, 3.5);
      // Razor bone talons
      ctx.fillStyle = '#f87171';
      ctx.fillRect(20, -12, 4, 5);
      ctx.fillRect(20, 7, 4, 5);

    } else if (z.type === 'spitter') {
      // 3. Putrid Toxic Spitter (Bloated corpse, dripping acid pustules)
      ctx.fillStyle = '#312e81'; // Putrid rotting flesh
      ctx.beginPath();
      ctx.arc(-2, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Bloated, pulsating acidic bile sacs
      const bilePulse = Math.sin(now * 0.01) * 2;
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(4, -5, 5 + bilePulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, 5, 5 - bilePulse * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Distorted skull dripping venom
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(6, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // Corrosive acid drool from maw
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(11, -2, 5, 4);

      // Milky dead cataract eyes
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(10, -4, 2, 2);
      ctx.fillRect(10, 2, 2, 2);

    } else if (z.type === 'dog') {
      // 4. Undead Feral Hound (Skeletal rabid beast)
      // Emaciated canine torso with exposed ribs
      ctx.fillStyle = '#422006';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 16, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Exposed rib bones
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-6, -4, 2, 8);
      ctx.fillRect(-1, -4, 2, 8);
      ctx.fillRect(4, -4, 2, 8);

      // Snarling canine skull with bloody snout
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(10, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Fangs and bloody saliva
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(14, -3, 4, 2);
      ctx.fillRect(14, 1, 4, 2);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(13, -1, 3, 2);

      // Dead glowing eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(11, -3, 2, 2);
      ctx.fillRect(11, 2, 2, 2);

    } else if (z.type === 'tank_mutant') {
      // 5. Giant Tank Behemoth (Grotesque mutated undead titan)
      // Massive rotting necrotic muscle torso
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(-4, 0, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Mutated crimson muscle sinews & broken iron chains
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-14, -14, 8, 28);
      ctx.fillStyle = '#94a3b8'; // Broken rusty chain links
      ctx.fillRect(-6, -16, 12, 4);
      ctx.fillRect(-6, 12, 12, 4);

      // Fractured skull with exposed pulsating necrotic brain
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(10, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      // Exposed pulsating brain tissue
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(6, -2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Demonic glowing red eye slits
      ctx.fillStyle = '#f87171';
      ctx.fillRect(17, -5, 4, 3);
      ctx.fillRect(17, 3, 4, 3);

      // Massive crushing spiked fists
      ctx.fillStyle = '#292524';
      ctx.fillRect(14, -22, 18, 14);
      ctx.fillRect(14, 8, 18, 14);
      ctx.fillStyle = '#ef4444'; // Spikes & blood
      ctx.fillRect(30, -20, 4, 4);
      ctx.fillRect(30, 16, 4, 4);
    }

    if ((z.hitFlashTimer || 0) > 0) {
      // Bright impact hit flash overlay
      ctx.fillStyle = 'rgba(254, 226, 226, 0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Zombie HP Bar (show if damaged)
    if (z.hp < z.maxHp && z.hp > 0) {
      const barW = z.type === 'tank_mutant' ? 56 : 28;
      const pct = z.hp / z.maxHp;
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(z.x - barW / 2, z.y - radius - 10, barW, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(z.x - barW / 2, z.y - radius - 10, barW * pct, 4);
    }
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    player: {
      x: number;
      y: number;
      angle: number;
      hp: number;
      maxHp: number;
      stamina: number;
      flashlightOn: boolean;
      battery: number;
      equippedWeapon: string;
      isAttacking: boolean;
      attackType: 'melee' | 'pistol' | 'shotgun';
      attackProgress?: number;
      attackComboSide?: 1 | -1;
      isMoving?: boolean;
      aimAngle: number;
      speed?: number;
    }
  ) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.aimAngle);

    const attackProgress = player.attackProgress ?? 0;
    const comboSide: 1 | -1 = player.attackComboSide ?? 1;
    const meleePose =
      player.isAttacking && player.attackType === 'melee'
        ? computeMeleeSwingPose(attackProgress, comboSide)
        : null;
    const gunPose =
      player.isAttacking && (player.attackType === 'pistol' || player.attackType === 'shotgun')
        ? computeGunRecoilPose(attackProgress, player.attackType)
        : null;

    if (meleePose) {
      ctx.translate(meleePose.lungeOffset, 0);
      ctx.rotate(meleePose.torsoTwist);
    } else if (gunPose) {
      ctx.translate(gunPose.recoilOffset * 0.45, 0);
    }

    const now = Date.now();
    // Walking leg animation when survivor is moving
    const moving = Boolean(player.isMoving || (player.speed && player.speed > 180));
    const legOffset = moving ? Math.sin(now * 0.018) * 6 : 0;

    // --- 1. COMBAT BOOTS & LEGS ---
    ctx.fillStyle = '#0f172a'; // Black combat boots
    ctx.fillRect(-12 + legOffset, -10, 10, 5);
    ctx.fillRect(-12 - legOffset, 5, 10, 5);

    // --- 2. SURVIVOR BACKPACK ---
    ctx.fillStyle = '#451a03'; // Heavy rugged leather canvas pack
    ctx.beginPath();
    ctx.ellipse(-10, 0, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f'; // Backpack bedroll strap
    ctx.fillRect(-14, -8, 4, 16);

    // --- 3. SURVIVOR TACTICAL TORSO ---
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -8, 8, 16);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -9, 12, 3);
    ctx.fillRect(-8, 6, 12, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -11, 4, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-3, -10, 1.5, 1.5);

    // --- 4. SURVIVOR HEAD & FACE ---
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(1, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(-1, 0, 7.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(4, -4, 4, 8);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(3, 2, 3, 2);

    // --- 5. LEFT ARM & FLASHLIGHT ---
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(1, -12, 12, 4);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(12, -12, 3, 4);

    // Flashlight casing mounted near left arm
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, -13, 8, 4);
    ctx.fillStyle = player.flashlightOn && player.battery > 0 ? '#fef08a' : '#94a3b8';
    ctx.fillRect(17, -13.5, 2.5, 5);

    // --- 6. RIGHT ARM + ANIMATED WEAPONS ---
    ctx.save();
    if (meleePose) {
      // Pivot right shoulder during crowbar swing
      ctx.translate(4, 8);
      ctx.rotate(meleePose.armAngle);
      ctx.translate(-4, -8);
    } else if (gunPose) {
      // Kick right arm & weapon back during recoil
      ctx.translate(gunPose.recoilOffset * 0.7, 0);
      ctx.rotate(gunPose.muzzlePitch);
    }

    // Right arm sleeve & hand
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(1, 8, 14, 4);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(14, 8, 3, 4);

    if (player.equippedWeapon === 'crowbar') {
      // Motion smear trail behind crowbar tip during peak swing
      if (meleePose && meleePose.trailAlpha > 0.05) {
        ctx.fillStyle = `rgba(248, 250, 252, ${meleePose.trailAlpha * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(14, 6);
        ctx.lineTo(38, 4 - comboSide * 10);
        ctx.lineTo(34, 9);
        ctx.closePath();
        ctx.fill();
      }
      // Heavy Steel Crowbar
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(14, 6, 20, 3.5);
      // Red curved prying claw hook
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(30, 3, 6, 9);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(34, 4, 3, 4);
    } else if (player.equippedWeapon === 'pistol') {
      // 9mm Tactical Handgun
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(14, 4, 15, 5);
      ctx.fillStyle = '#475569';
      const slideBack = gunPose ? gunPose.recoilOffset * 0.45 : 0;
      ctx.fillRect(16 + slideBack, 5, 8, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(27, 4, 2, 2);
    } else if (player.equippedWeapon === 'shotgun') {
      // 12-Gauge Pump-Action Shotgun
      ctx.fillStyle = '#78350f';
      ctx.fillRect(10, 4, 8, 5);
      ctx.fillRect(18, 5, 10, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(18, 4, 22, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(38, 4, 4, 5);
    }

    // --- 7. STAR MUZZLE FLASH (ANIMATED OVER ~70ms) ---
    if (gunPose && gunPose.flashIntensity > 0.02) {
      const flashX = player.equippedWeapon === 'shotgun' ? 44 : 31;
      const flashRadius = (player.attackType === 'shotgun' ? 22 : 14) * (0.6 + gunPose.flashIntensity * 0.6);
      const mGrad = ctx.createRadialGradient(flashX, 6, 2, flashX, 6, flashRadius);
      mGrad.addColorStop(0, `rgba(255, 255, 255, ${gunPose.flashIntensity})`);
      mGrad.addColorStop(0.35, `rgba(254, 240, 138, ${gunPose.flashIntensity * 0.9})`);
      mGrad.addColorStop(0.7, `rgba(249, 115, 22, ${gunPose.flashIntensity * 0.6})`);
      mGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(flashX, 6, flashRadius, 0, Math.PI * 2);
      ctx.fill();

      // Forward directional muzzle blast spike
      ctx.fillStyle = `rgba(254, 249, 195, ${gunPose.flashIntensity * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(flashX - 2, 3);
      ctx.lineTo(flashX + flashRadius * 1.45, 6);
      ctx.lineTo(flashX - 2, 9);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ctx.save();
      ctx.font = `bold ${ft.size}px "Press Start 2P", monospace, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();

      ft.y -= 0.6;
      ft.life -= 0.02;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private renderLightingOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: {
      x: number;
      y: number;
      flashlightOn: boolean;
      battery: number;
      aimAngle: number;
      isAttacking?: boolean;
      attackType?: 'melee' | 'pistol' | 'shotgun';
      attackProgress?: number;
    },
    cameraX: number,
    cameraY: number,
    darkness: number,
    decoys: DecoyActive[],
    firePatches: FirePatch[],
    exitUnlocked: boolean,
    exitZone: { x: number; y: number; width: number; height: number },
    brightness: number = 1.0,
    zombies: Zombie[] = [],
    traps: EnvironmentalTrap[] = []
  ) {
    if (!this.lightingCanvas || !this.lightingCtx) {
      if (typeof document !== 'undefined') {
        this.lightingCanvas = document.createElement('canvas');
        this.lightingCtx = this.lightingCanvas.getContext('2d');
      }
    }
    if (!this.lightingCanvas || !this.lightingCtx) return;

    if (this.lightingCanvas.width !== width || this.lightingCanvas.height !== height) {
      this.lightingCanvas.width = width;
      this.lightingCanvas.height = height;
    }

    const lCtx = this.lightingCtx;
    lCtx.save();
    lCtx.clearRect(0, 0, width, height);

    // Enforce authentic survival horror darkness:
    // User requested darker map that scales up in later levels, with light strictly focused around the player
    const effectiveDarkness = Math.min(0.96, Math.max(0.78, darkness + 0.12));
    lCtx.fillStyle = `rgba(0, 0, 0, ${effectiveDarkness})`;
    lCtx.fillRect(0, 0, width, height);

    // Carve out light using destination-out on the offscreen canvas
    lCtx.globalCompositeOperation = 'destination-out';

    const playerScreenX = width / 2;
    const playerScreenY = height / 2;

    // 1. Focused player ambient light (immediate surroundings visible, dark outside)
    const ambientRadius = 105;
    const ambientGrad = lCtx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      0,
      playerScreenX,
      playerScreenY,
      ambientRadius
    );
    ambientGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    ambientGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.9)');
    ambientGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.4)');
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lCtx.fillStyle = ambientGrad;
    lCtx.beginPath();
    lCtx.arc(playerScreenX, playerScreenY, ambientRadius, 0, Math.PI * 2);
    lCtx.fill();

    // 1.5 Gunfire Muzzle Flash Light Burst
    if (
      player.isAttacking &&
      (player.attackType === 'pistol' || player.attackType === 'shotgun') &&
      (player.attackProgress ?? 0) < 0.35
    ) {
      const flashR = player.attackType === 'shotgun' ? 210 : 155;
      const mx = playerScreenX + Math.cos(player.aimAngle) * 28;
      const my = playerScreenY + Math.sin(player.aimAngle) * 28;
      const mGrad = lCtx.createRadialGradient(mx, my, 0, mx, my, flashR);
      mGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      mGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = mGrad;
      lCtx.beginPath();
      lCtx.arc(mx, my, flashR, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 2. High-Powered Flashlight Beam (piercing deep into darkness)
    if (player.flashlightOn && player.battery > 0) {
      const flicker = player.battery < 15 && Math.random() < 0.25 ? 0.4 : 1.0;
      const beamLength = 440 * flicker;
      const fov = 0.76; // ~86 degrees cone

      lCtx.save();
      lCtx.translate(playerScreenX, playerScreenY);
      lCtx.rotate(player.aimAngle);

      const coneGrad = lCtx.createRadialGradient(0, 0, 12, 0, 0, beamLength);
      coneGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      coneGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.92)');
      coneGrad.addColorStop(0.9, 'rgba(0, 0, 0, 0.45)');
      coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lCtx.fillStyle = coneGrad;
      lCtx.beginPath();
      lCtx.moveTo(0, 0);
      lCtx.arc(0, 0, beamLength, -fov / 2, fov / 2);
      lCtx.closePath();
      lCtx.fill();

      lCtx.restore();
    }

    // 3. Fire patches illumination
    for (const f of firePatches) {
      const fx = f.x - cameraX + width / 2;
      const fy = f.y - cameraY + height / 2;
      const fireGrad = lCtx.createRadialGradient(fx, fy, 0, fx, fy, f.radius * 1.8);
      fireGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = fireGrad;
      lCtx.beginPath();
      lCtx.arc(fx, fy, f.radius * 1.8, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 4. Decoy beeps illumination
    for (const d of decoys) {
      const dx = d.x - cameraX + width / 2;
      const dy = d.y - cameraY + height / 2;
      const dGrad = lCtx.createRadialGradient(dx, dy, 0, dx, dy, 90);
      dGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = dGrad;
      lCtx.beginPath();
      lCtx.arc(dx, dy, 90, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 4.5 Environmental Traps illumination (pilot glow & active blast/arc flash)
    for (const trap of traps) {
      if (trap.state === 'destroyed') continue;
      const tx = trap.x + trap.width / 2 - cameraX + width / 2;
      const ty = trap.y + trap.height / 2 - cameraY + height / 2;
      const lightR =
        trap.state === 'active'
          ? trap.type === 'exploding_barrel'
            ? 230
            : 145
          : trap.state === 'primed'
          ? 95
          : 55;
      const strength = trap.state === 'active' ? 1 : trap.state === 'primed' ? 0.8 : 0.45;
      const tGrad = lCtx.createRadialGradient(tx, ty, 0, tx, ty, lightR);
      tGrad.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = tGrad;
      lCtx.beginPath();
      lCtx.arc(tx, ty, lightR, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 5. Exit Zone glow if unlocked
    if (exitUnlocked) {
      const ex = exitZone.x + exitZone.width / 2 - cameraX + width / 2;
      const ey = exitZone.y + exitZone.height / 2 - cameraY + height / 2;
      const eGrad = lCtx.createRadialGradient(ex, ey, 0, ex, ey, 150);
      eGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      eGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = eGrad;
      lCtx.beginPath();
      lCtx.arc(ex, ey, 150, 0, Math.PI * 2);
      lCtx.fill();
    }

    lCtx.restore();

    // Composite offscreen lighting mask cleanly onto the main game canvas
    ctx.drawImage(this.lightingCanvas, 0, 0);

    // Active trap colored flash bloom over scene
    for (const trap of traps) {
      if (trap.state !== 'active') continue;
      const tx = trap.x + trap.width / 2 - cameraX + width / 2;
      const ty = trap.y + trap.height / 2 - cameraY + height / 2;
      const bloomR = trap.type === 'exploding_barrel' ? 190 : 115;
      const bloomGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, bloomR);
      if (trap.type === 'exploding_barrel') {
        bloomGrad.addColorStop(0, 'rgba(251, 146, 60, 0.35)');
        bloomGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      } else {
        bloomGrad.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
        bloomGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      }
      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, bloomR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm flashlight beam aura
    if (player.flashlightOn && player.battery > 0) {
      ctx.save();
      ctx.translate(playerScreenX, playerScreenY);
      ctx.rotate(player.aimAngle);
      const warmGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 440);
      warmGrad.addColorStop(0, 'rgba(254, 240, 138, 0.15)');
      warmGrad.addColorStop(0.7, 'rgba(254, 240, 138, 0.05)');
      warmGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 440, -0.76 / 2, 0.76 / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Eerie glowing eyes piercing the darkness for distant zombies lurking in pitch black
    for (const z of zombies) {
      if (z.state === 'dead') continue;
      const zScreenX = z.x - cameraX + width / 2;
      const zScreenY = z.y - cameraY + height / 2;

      // Distance from player center on screen
      const distToPlayerScreen = Math.hypot(zScreenX - playerScreenX, zScreenY - playerScreenY);
      if (distToPlayerScreen > 95 && distToPlayerScreen < 520) {
        // Lurking in the shadows: draw menacing glowing eyes
        ctx.save();
        ctx.translate(zScreenX, zScreenY);
        ctx.rotate(z.angle);
        const eyeColor = z.type === 'runner' ? '#fde047' : z.type === 'spitter' ? '#a3e635' : '#ef4444';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 6;
        ctx.fillRect(8, -4, 2.5, 2.5);
        ctx.fillRect(8, 2, 2.5, 2.5);
        ctx.restore();
      }
    }
  }
}

