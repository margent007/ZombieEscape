import { ItemId, LanguageCode, Objective, InventoryItem } from '../types/game';
import { ITEM_REGISTRY } from '../game/items';
import { TRANSLATIONS } from '../i18n/translations';
import {
  Heart,
  Zap,
  Battery,
  Volume2,
  VolumeX,
  Pause,
  Hammer,
  Gamepad2,
  Flashlight,
  Radio,
  Sparkles,
  CheckCircle2,
  Circle,
  Smartphone,
} from 'lucide-react';
import { Minimap } from './Minimap';
import { LevelConfig, Zombie } from '../types/game';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  battery: number;
  maxBattery: number;
  noiseLevel: number;
  flashlightOn: boolean;
  equippedWeapon: ItemId;
  ammoCount: number;
  currentObjective: Objective | null;
  escapeReady: boolean;
  isSneaking: boolean;
  isSprinting: boolean;
  gamepadConnected: boolean;
  isMuted: boolean;
  lang: LanguageCode;
  interactTargetName: string | null;
  level: LevelConfig;
  playerPos: { x: number; y: number; aimAngle: number };
  zombies: Zombie[];
  inventory: InventoryItem[];
  minimapVisible: boolean;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  onToggleMinimap: () => void;
  onOpenCrafting: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleFlashlight: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  stamina,
  maxStamina,
  battery,
  maxBattery,
  noiseLevel,
  flashlightOn,
  equippedWeapon,
  ammoCount,
  currentObjective,
  escapeReady,
  isSneaking,
  isSprinting,
  gamepadConnected,
  isMuted,
  lang,
  interactTargetName,
  level,
  playerPos,
  zombies,
  inventory,
  minimapVisible,
  showTouchControls,
  onToggleTouchControls,
  onToggleMinimap,
  onOpenCrafting,
  onTogglePause,
  onToggleMute,
  onToggleFlashlight,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const weaponDef = ITEM_REGISTRY[equippedWeapon];

  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const staminaPct = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const batteryPct = Math.max(0, Math.min(100, (battery / maxBattery) * 100));
  const noisePct = Math.max(0, Math.min(100, noiseLevel));

  const ObjectivePanel = (
    <div className="flex flex-col items-center w-full md:max-w-lg">
      {escapeReady ? (
        <div className="bg-emerald-600/95 text-black px-3 py-1.5 sm:px-5 sm:py-2.5 border-2 border-emerald-300 font-bold font-pixel text-[10px] sm:text-sm animate-bounce shadow-[0_0_25px_rgba(34,197,94,0.7)] text-center">
          ⚠️ {t.hud_escape_ready} ⚠️
          <span className="hidden sm:block text-[10px] uppercase font-mono font-normal text-emerald-950 mt-0.5">
            Tiến ngay về khu vực cổng thoát hiểm màu xanh!
          </span>
        </div>
      ) : (
        <div className="bg-zinc-950/92 border border-amber-600/80 px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-xl text-center w-full md:min-w-[260px]">
          <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-bold text-amber-500 tracking-wider mb-0.5 sm:mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {t.hud_objective}
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-100 font-bold mb-1 line-clamp-2">
            {currentObjective ? t[currentObjective.descriptionKey] || 'Hoàn thành điều kiện thoát hiểm' : 'Tìm đường thoát thân'}
          </p>

          {/* Dynamic Required Quest Items Checklist */}
          {level.exitRequiresItems && level.exitRequiresItems.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-zinc-800 pt-1 text-left">
              {level.exitRequiresItems.map(req => {
                const held = inventory.find(i => i.itemId === req.itemId)?.count || 0;
                const isDone = held >= req.count;
                const itemDef = ITEM_REGISTRY[req.itemId];
                const itemName = t[itemDef?.nameKey] || req.itemId;
                const pct = Math.min(100, Math.round((held / req.count) * 100));

                return (
                  <div key={req.itemId} className="text-[10px] sm:text-[11px] bg-zinc-900/80 p-0.5 px-1.5 sm:p-1 sm:px-2 border border-zinc-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      {isDone ? (
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className={`truncate ${isDone ? 'text-emerald-300 font-bold' : 'text-zinc-200'}`}>
                        {itemName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`font-pixel text-[9px] sm:text-[10px] ${isDone ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {held}/{req.count}
                      </span>
                      <div className="hidden sm:block w-12 h-1.5 bg-zinc-950 border border-zinc-700 overflow-hidden">
                        <div
                          className={`h-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none flex flex-col justify-between p-2 sm:p-3 font-mono">
      {/* TOP STACK */}
      <div className="flex flex-col gap-1.5">
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          {/* TOP-LEFT CLUSTER: VITALITY BARS */}
          <div className="bg-zinc-950/90 border border-zinc-800 p-2 sm:p-3 w-[148px] sm:w-auto sm:min-w-[220px] sm:max-w-[280px] shadow-lg pointer-events-auto">
            {/* Health Bar */}
            <div className="mb-1.5 sm:mb-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                <span className="flex items-center gap-1 font-bold text-rose-400">
                  <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-rose-500" />
                  <span className="hidden sm:inline">{t.hud_hp}</span>
                </span>
                <span className="font-bold text-rose-300 font-pixel text-[9px] sm:text-[10px]">
                  {Math.round(hp)}/{maxHp}
                </span>
              </div>
              <div className="w-full h-2.5 sm:h-3 bg-zinc-900 border border-zinc-700/80 overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all duration-150"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="mb-1.5 sm:mb-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-500" />
                  <span className="hidden sm:inline">{t.hud_stamina}</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-300 font-pixel">
                  {Math.round(staminaPct)}%
                </span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-zinc-900 border border-zinc-700/80 overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-75"
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
            </div>

            {/* Battery & Noise */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] pt-1 border-t border-zinc-800/80">
              <div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-zinc-400 mb-0.5">
                  <span className="flex items-center gap-0.5">
                    <Battery className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" />
                    <span className="hidden sm:inline">{t.hud_battery}</span>
                  </span>
                  <span className="text-sky-300">{Math.round(batteryPct)}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      batteryPct < 20 ? 'bg-rose-500 animate-pulse' : 'bg-sky-400'
                    }`}
                    style={{ width: `${batteryPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-zinc-400 mb-0.5">
                  <span className="truncate">{t.hud_noise}</span>
                  <span className={noisePct > 60 ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                    {Math.round(noisePct)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      noisePct > 60 ? 'bg-rose-500' : 'bg-zinc-400'
                    }`}
                    style={{ width: `${noisePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stance Indicator */}
            {(isSneaking || isSprinting) && (
              <div className="mt-1.5 text-[9px] sm:text-[10px] flex items-center gap-1.5">
                {isSneaking && (
                  <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {t.hud_sneak}
                  </span>
                )}
                {isSprinting && (
                  <span className="px-1.5 py-0.5 bg-rose-950 text-rose-400 border border-rose-800 font-bold animate-pulse">
                    {t.hud_run}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* TOP-CENTER (DESKTOP >= md): MISSION OBJECTIVE */}
          <div className="hidden md:flex flex-col items-center max-w-lg">
            {ObjectivePanel}
          </div>

          {/* TOP-RIGHT CLUSTER: MINIMAP & UTILITY BUTTONS */}
          <div className="flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-auto">
            {/* Tactical Radar Minimap */}
            <Minimap
              level={level}
              player={playerPos}
              zombies={zombies}
              exitUnlocked={escapeReady}
              visible={minimapVisible}
              onToggleVisible={onToggleMinimap}
            />

            {/* Quick utility icons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {gamepadConnected && (
                <div
                  className="p-1.5 sm:p-2 bg-emerald-950/80 border border-emerald-600 text-emerald-400"
                  title="Gamepad đã kết nối"
                >
                  <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}

              <button
                type="button"
                data-testid="toggle-touch-btn"
                onClick={onToggleTouchControls}
                className={`p-1.5 sm:p-2 border transition-colors ${
                  showTouchControls
                    ? 'bg-sky-950/90 border-sky-500 text-sky-300'
                    : 'bg-zinc-950/90 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                }`}
                title="Bật/Tắt nút cảm ứng điện thoại"
                aria-label="Điều khiển cảm ứng"
              >
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenCrafting}
                className="p-1.5 sm:p-2 bg-zinc-950/90 border border-amber-600/80 text-amber-400 hover:bg-amber-600 hover:text-black transition-colors"
                title="Mở Bảng Chế Tạo [C / TAB]"
                aria-label="Bảng chế tạo"
              >
                <Hammer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 sm:p-2 bg-zinc-950/90 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Bật/Tắt âm thanh"
                aria-label="Âm thanh"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              <button
                type="button"
                onClick={onTogglePause}
                className="p-1.5 sm:p-2 bg-zinc-950/90 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Tạm dừng [Esc / P]"
                aria-label="Tạm dừng"
              >
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE (< md): COMPACT MISSION STRIP BELOW TOP BAR SO NO HORIZONTAL OVERLAP */}
        <div className="flex md:hidden justify-center px-1">
          <div className="max-w-xs w-full">{ObjectivePanel}</div>
        </div>
      </div>

      {/* BOTTOM ROW: INTERACTION HINT & DESKTOP WEAPON SLOTS */}
      <div
        className={`flex flex-col items-center gap-1.5 ${
          showTouchControls ? 'mb-24 sm:mb-28' : ''
        }`}
      >
        {/* Contextual Interaction Hint */}
        {interactTargetName && (
          <div className="bg-black/95 border-2 border-amber-500 px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs text-amber-400 font-bold flex items-center gap-2 animate-pulse shadow-lg pointer-events-none text-center max-w-[240px] sm:max-w-none">
            <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] sm:text-[10px] font-pixel shrink-0">
              {showTouchControls ? 'MỞ' : 'E'}
            </span>
            <span className="truncate">{interactTargetName}</span>
          </div>
        )}

        {/* BOTTOM WEAPON & EQUIPMENT BAR (hidden when touch controls provide integrated weapon/action pad) */}
        {!showTouchControls && (
          <div className="bg-zinc-950/95 border border-zinc-800 p-2 sm:p-2.5 flex items-center gap-3 sm:gap-4 shadow-2xl pointer-events-auto">
            {/* Flashlight toggle */}
            <button
              type="button"
              onClick={onToggleFlashlight}
              className={`p-2 border flex items-center gap-1.5 text-xs font-bold transition-all ${
                flashlightOn && battery > 0
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Bật/Tắt Đèn Pin [F]"
            >
              <Flashlight className="w-4 h-4" />
              <span className="hidden sm:inline">[F]</span>
            </button>

            {/* Quick Action Badges (Desktop) */}
            <div className="hidden md:flex items-center gap-2 pr-2 border-r border-zinc-800">
              <div
                className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-sky-800 text-sky-400 text-[11px]"
                title="Sóng Siêu Âm Radar Quét Zombie [Q]"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="font-bold">[Q] Sonar</span>
              </div>

              {(() => {
                const adrCount = inventory.find(i => i.itemId === 'adrenaline_shot')?.count || 0;
                const medCount = inventory.find(i => i.itemId === 'medkit')?.count || 0;
                return (
                  <div
                    className={`flex items-center gap-1 px-2 py-1 border text-[11px] ${
                      adrCount > 0
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                        : medCount > 0
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                    title="Dùng nhanh Thuốc / Adrenaline [X]"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="font-bold">
                      [X] {adrCount > 0 ? `Adrenaline (${adrCount})` : medCount > 0 ? `Medkit (${medCount})` : 'Hồi Máu'}
                    </span>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={onOpenCrafting}
                className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-amber-800 text-amber-400 hover:bg-zinc-800 text-[11px]"
                title="Mở Ba Lô & Chế Tạo [TAB]"
              >
                <span className="font-bold">[TAB] Ba Lô</span>
              </button>
            </div>

            {/* Equipped Weapon Card */}
            <div className="flex items-center gap-3 pr-2">
              <span className="text-2xl p-1 bg-zinc-900 border border-zinc-800">{weaponDef.icon}</span>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-pixel block">
                  {t.hud_equipped} <span className="text-zinc-600">[R: Đổi]</span>
                </span>
                <h4 className="text-xs font-bold text-zinc-100">{t[weaponDef.nameKey] || weaponDef.id}</h4>
              </div>

              {/* Ammo Readout if gun */}
              {weaponDef.ammoType && (
                <div className="pl-3 border-l border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase block font-pixel">
                    {t.hud_ammo}
                  </span>
                  <span
                    className={`text-sm font-bold font-pixel ${
                      ammoCount <= 3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                    }`}
                  >
                    {ammoCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
