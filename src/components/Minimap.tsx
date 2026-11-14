import React, { useRef, useEffect } from 'react';
import { LevelConfig, Zombie } from '../types/game';
import { Compass, Eye, EyeOff } from 'lucide-react';

interface MinimapProps {
  level: LevelConfig;
  player: { x: number; y: number; aimAngle: number };
  zombies: Zombie[];
  exitUnlocked: boolean;
  visible: boolean;
  onToggleVisible: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  level,
  player,
  zombies,
  exitUnlocked,
  visible,
  onToggleVisible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapW = canvas.width;
    const mapH = canvas.height;
    const scaleX = mapW / level.width;
    const scaleY = mapH / level.height;

    // Clear background
    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    ctx.fillRect(0, 0, mapW, mapH);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < mapW; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapH);
      ctx.stroke();
    }
    for (let y = 0; y < mapH; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapW, y);
      ctx.stroke();
    }

    // Draw Obstacles / Walls
    ctx.fillStyle = '#475569';
    for (const obs of level.obstacles) {
      ctx.fillRect(
        obs.x * scaleX,
        obs.y * scaleY,
        Math.max(2, obs.width * scaleX),
        Math.max(2, obs.height * scaleY)
      );
    }

    // Draw Containers
    for (const c of level.containers) {
      ctx.fillStyle = c.searched ? '#334155' : '#f59e0b';
      const cx = c.x * scaleX;
      const cy = c.y * scaleY;
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }

    // Draw Environmental Traps (barrels & electric wires)
    for (const trap of level.traps || []) {
      if (trap.state === 'destroyed') continue;
      if (trap.type === 'exploding_barrel') {
        const tx = (trap.x + trap.width / 2) * scaleX;
        const ty = (trap.y + trap.height / 2) * scaleY;
        ctx.fillStyle = trap.state === 'primed' ? '#ef4444' : '#f97316';
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      } else {
        const tx = trap.x * scaleX;
        const ty = trap.y * scaleY;
        const tw = Math.max(4, trap.width * scaleX);
        const th = Math.max(3, trap.height * scaleY);
        ctx.fillStyle =
          trap.state === 'active'
            ? '#67e8f9'
            : trap.state === 'cooldown'
            ? 'rgba(148, 163, 184, 0.5)'
            : '#06b6d4';
        ctx.fillRect(tx, ty, tw, th);
      }
    }

    // Draw Exit Zone
    const ex = level.exitZone.x * scaleX;
    const ey = level.exitZone.y * scaleY;
    const ew = Math.max(6, level.exitZone.width * scaleX);
    const eh = Math.max(6, level.exitZone.height * scaleY);

    ctx.fillStyle = exitUnlocked ? 'rgba(34, 197, 94, 0.45)' : 'rgba(234, 179, 8, 0.3)';
    ctx.strokeStyle = exitUnlocked ? '#22c55e' : '#eab308';
    ctx.lineWidth = 1.5;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeRect(ex, ey, ew, eh);

    // Draw Zombies blips (red if chasing/alert, dark red if idle)
    for (const z of zombies) {
      if (z.state === 'dead') continue;
      const zx = z.x * scaleX;
      const zy = z.y * scaleY;
      ctx.fillStyle = z.state === 'chasing' ? '#ef4444' : '#991b1b';
      ctx.beginPath();
      ctx.arc(zx, zy, z.type === 'tank_mutant' ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player (Cyan blip + directional heading cone)
    const px = player.x * scaleX;
    const py = player.y * scaleY;

    // Heading cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 14, player.aimAngle - 0.45, player.aimAngle + 0.45);
    ctx.closePath();
    ctx.fill();

    // Player central blip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [level, player, zombies, exitUnlocked, visible]);

  if (!visible) {
    return (
      <button
        onClick={onToggleVisible}
        className="pointer-events-auto p-1.5 bg-zinc-950/90 border border-zinc-700 hover:border-amber-500 text-zinc-300 hover:text-amber-400 text-xs flex items-center gap-1 shadow-lg font-mono"
        title="Mở Radar Minimap [M]"
        aria-label="Mở minimap"
      >
        <Compass className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline text-[11px] font-bold">RADAR [M]</span>
      </button>
    );
  }

  return (
    <div className="pointer-events-auto bg-zinc-950/90 border border-zinc-700 sm:border-2 p-1.5 sm:p-2 shadow-xl font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 sm:pb-1.5 mb-1 sm:mb-1.5 border-b border-zinc-800 text-[9px] sm:text-[10px]">
        <div className="flex items-center gap-1 text-zinc-300 font-bold">
          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span className="text-amber-400 hidden sm:inline">RADAR VÙNG</span>
          <span className="text-amber-400 sm:hidden">RADAR</span>
        </div>
        <button
          onClick={onToggleVisible}
          className="text-zinc-400 hover:text-white p-0.5"
          title="Thu nhỏ [M]"
          aria-label="Thu nhỏ minimap"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>

      {/* Radar Canvas */}
      <div className="relative border border-zinc-800 bg-black">
        <canvas ref={canvasRef} width={160} height={110} className="block w-[104px] h-[68px] md:w-[152px] md:h-[104px]" />
      </div>

      {/* Legend */}
      <div className="hidden lg:grid grid-cols-4 gap-1 pt-1.5 text-[9px] text-zinc-400 text-center">
        <span className="flex items-center justify-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Bạn
        </span>
        <span className="flex items-center justify-center gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Zombie
        </span>
        <span className="flex items-center justify-center gap-0.5">
          <span className="w-1.5 h-1.5 bg-amber-400" /> Hòm
        </span>
        <span className="flex items-center justify-center gap-0.5">
          <span className="w-1.5 h-1.5 bg-emerald-400" /> Thoát
        </span>
      </div>
    </div>
  );
};
