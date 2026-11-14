import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Flashlight, Hand, Heart, Radio, RefreshCw, Zap } from 'lucide-react';
import { inputManager } from '../game/input';
import { ItemId } from '../types/game';
import { ITEM_REGISTRY } from '../game/items';

interface MobileControlsProps {
  equippedWeapon: ItemId;
  ammoCount: number;
  flashlightOn: boolean;
  interactTargetName: string | null;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  equippedWeapon,
  ammoCount,
  flashlightOn,
  interactTargetName,
}) => {
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const attackPadRef = useRef<HTMLDivElement | null>(null);
  const movePointerId = useRef<number | null>(null);
  const aimPointerId = useRef<number | null>(null);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aimKnobOffset, setAimKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprintLocked, setSprintLocked] = useState(false);
  const [isFiring, setIsFiring] = useState(false);

  const sprintLockedRef = useRef(false);
  useEffect(() => {
    sprintLockedRef.current = sprintLocked;
  }, [sprintLocked]);

  useEffect(() => {
    return () => {
      inputManager.resetTouch();
    };
  }, []);

  const weaponDef = ITEM_REGISTRY[equippedWeapon];

  const updateMoveStick = (clientX: number, clientY: number) => {
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);

    const kx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const ky = dist > 0 ? Math.sin(angle) * clampedDist : 0;
    setKnobOffset({ x: kx, y: ky });

    if (dist < 6) {
      inputManager.setTouchMove(0, 0, sprintLockedRef.current);
      return;
    }

    const norm = Math.min(1, dist / maxR);
    const nx = Math.cos(angle) * norm;
    const ny = Math.sin(angle) * norm;
    const edgeSprint = norm > 0.86 || sprintLockedRef.current;
    inputManager.setTouchMove(nx, ny, edgeSprint);
  };

  const resetMoveStick = () => {
    movePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    inputManager.setTouchMove(0, 0, sprintLockedRef.current);
  };

  const updateAttackAim = (clientX: number, clientY: number) => {
    const el = attackPadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist >= 10) {
      const clamped = Math.min(26, dist);
      const angle = Math.atan2(dy, dx);
      setAimKnobOffset({ x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped });
      inputManager.setTouchAim(angle);
    } else {
      setAimKnobOffset({ x: 0, y: 0 });
      inputManager.setTouchAim(null);
    }
  };

  const resetAttackAim = () => {
    aimPointerId.current = null;
    setIsFiring(false);
    setAimKnobOffset({ x: 0, y: 0 });
    inputManager.setTouchHold('attack', false);
    inputManager.setTouchAim(null);
  };

  return (
    <div
      data-testid="mobile-controls"
      className="fixed inset-x-0 bottom-0 z-30 pointer-events-none select-none touch-none px-3 pb-3 sm:px-5 sm:pb-5 flex items-end justify-between"
    >
      {/* LEFT THUMB ZONE: VIRTUAL ANALOG JOYSTICK + SPRINT TOGGLE */}
      <div className="flex flex-col items-start gap-2 pointer-events-auto touch-none">
        <button
          type="button"
          data-testid="mobile-sprint-btn"
          onPointerDown={e => {
            e.preventDefault();
            const next = !sprintLocked;
            setSprintLocked(next);
            sprintLockedRef.current = next;
          }}
          className={`px-2.5 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition-colors ${
            sprintLocked
              ? 'bg-rose-600/85 border-rose-300 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
              : 'bg-zinc-950/80 border-zinc-700 text-zinc-300'
          }`}
        >
          <Zap className="w-3 h-3" />
          CHẠY
        </button>

        <div
          ref={joystickRef}
          data-testid="mobile-joystick"
          onPointerDown={e => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            movePointerId.current = e.pointerId;
            updateMoveStick(e.clientX, e.clientY);
          }}
          onPointerMove={e => {
            if (movePointerId.current !== e.pointerId) return;
            updateMoveStick(e.clientX, e.clientY);
          }}
          onPointerUp={e => {
            if (movePointerId.current === e.pointerId) resetMoveStick();
          }}
          onPointerCancel={e => {
            if (movePointerId.current === e.pointerId) resetMoveStick();
          }}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-950/60 border-2 border-zinc-600/80 backdrop-blur-[2px] flex items-center justify-center shadow-xl touch-none"
        >
          {/* Crosshair guide lines */}
          <div className="absolute inset-3 rounded-full border border-dashed border-zinc-700/70 pointer-events-none" />
          <div
            className="w-12 h-12 rounded-full bg-amber-500/85 border-2 border-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.5)] pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* RIGHT THUMB ZONE: COMBAT & SURVIVAL ACTIONS */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto touch-none">
        {/* Secondary tactical buttons row */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="mobile-heal-btn"
            onPointerDown={e => {
              e.preventDefault();
              inputManager.triggerTouchAction('quickUse');
            }}
            className="w-10 h-10 rounded-full bg-emerald-950/85 border border-emerald-500/80 text-emerald-300 flex items-center justify-center active:scale-95 shadow-md"
            aria-label="Hồi máu nhanh"
            title="Hồi máu / Adrenaline"
          >
            <Heart className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="mobile-sonar-btn"
            onPointerDown={e => {
              e.preventDefault();
              inputManager.triggerTouchAction('sonarPing');
            }}
            className="w-10 h-10 rounded-full bg-sky-950/85 border border-sky-500/80 text-sky-300 flex items-center justify-center active:scale-95 shadow-md"
            aria-label="Radar Sonar"
            title="Radar Sonar"
          >
            <Radio className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="mobile-flashlight-btn"
            onPointerDown={e => {
              e.preventDefault();
              inputManager.triggerTouchAction('flashlight');
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 shadow-md ${
              flashlightOn
                ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                : 'bg-zinc-950/85 border-zinc-700 text-zinc-400'
            }`}
            aria-label="Đèn pin"
            title="Đèn pin"
          >
            <Flashlight className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="mobile-weapon-btn"
            onPointerDown={e => {
              e.preventDefault();
              inputManager.triggerTouchAction('reload');
            }}
            className="h-10 px-2.5 rounded-full bg-zinc-950/85 border border-zinc-600 text-zinc-100 flex items-center gap-1 active:scale-95 shadow-md text-xs font-bold"
            aria-label="Đổi vũ khí"
            title="Đổi vũ khí"
          >
            <span>{weaponDef?.icon || '🔧'}</span>
            {weaponDef?.ammoType && (
              <span className="text-[10px] text-amber-400 font-pixel">{ammoCount}</span>
            )}
            <RefreshCw className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Primary Action Row: Interact + Attack/Aim Pad */}
        <div className="flex items-end gap-2.5">
          <button
            type="button"
            data-testid="mobile-interact-btn"
            onPointerDown={e => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              inputManager.setTouchHold('interact', true);
            }}
            onPointerUp={e => {
              e.preventDefault();
              inputManager.setTouchHold('interact', false);
            }}
            onPointerCancel={() => inputManager.setTouchHold('interact', false)}
            className={`w-13 h-13 rounded-full border-2 flex flex-col items-center justify-center gap-0.5 active:scale-95 shadow-lg transition-all ${
              interactTargetName
                ? 'bg-amber-500/90 border-amber-200 text-black animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.75)]'
                : 'bg-zinc-950/80 border-zinc-600 text-zinc-200'
            }`}
            aria-label="Tương tác / Mở hòm"
          >
            <Hand className="w-4 h-4" />
            <span className="text-[9px] font-bold leading-none">MỞ</span>
          </button>

          {/* Attack + Drag-to-Aim Pad */}
          <div
            ref={attackPadRef}
            data-testid="mobile-attack-btn"
            onPointerDown={e => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              aimPointerId.current = e.pointerId;
              setIsFiring(true);
              inputManager.setTouchHold('attack', true);
              updateAttackAim(e.clientX, e.clientY);
            }}
            onPointerMove={e => {
              if (aimPointerId.current !== e.pointerId) return;
              updateAttackAim(e.clientX, e.clientY);
            }}
            onPointerUp={e => {
              if (aimPointerId.current === e.pointerId) resetAttackAim();
            }}
            onPointerCancel={e => {
              if (aimPointerId.current === e.pointerId) resetAttackAim();
            }}
            className={`relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center shadow-2xl touch-none transition-colors ${
              isFiring
                ? 'bg-rose-600/85 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.8)]'
                : 'bg-rose-950/85 border-rose-500 text-rose-200'
            }`}
            aria-label="Tấn công và Ngắm"
          >
            <div
              className="flex flex-col items-center justify-center pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${aimKnobOffset.x * 0.45}px, ${aimKnobOffset.y * 0.45}px)`,
              }}
            >
              <Crosshair className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wider mt-0.5">ĐÁNH</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
