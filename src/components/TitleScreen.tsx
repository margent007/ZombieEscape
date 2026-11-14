import React from 'react';
import { CharacterClass, LanguageCode } from '../types/game';
import { SURVIVOR_PROFILES } from '../game/updates';
import { TRANSLATIONS } from '../i18n/translations';
import { soundManager } from '../game/audio';
import {
  Play,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Settings,
  Sparkles,
  Gamepad2,
  Moon,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenDaily: () => void;
  onOpenLevels: () => void;
  onOpenLeaderboard: () => void;
  onOpenSurvivors: () => void;
  onOpenSettings: () => void;
  onOpenUpdates: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  selectedCharacter: CharacterClass;
  gamepadConnected: boolean;
  lang: LanguageCode;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenDaily,
  onOpenLevels,
  onOpenLeaderboard,
  onOpenSurvivors,
  onOpenSettings,
  onOpenUpdates,
  onToggleMute,
  isMuted,
  selectedCharacter,
  gamepadConnected,
  lang,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const currentSurvivor = SURVIVOR_PROFILES.find(s => s.id === selectedCharacter) || SURVIVOR_PROFILES[0];

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <div
      className="absolute inset-0 z-10 w-full h-full overflow-y-auto flex flex-col justify-between items-center p-3 sm:p-6 bg-zinc-950 font-mono select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 30%, rgba(220, 38, 38, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
          linear-gradient(rgba(18, 16, 16, 0.3) 50%, rgba(0, 0, 0, 0.7) 50%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 4px',
      }}
    >
      {/* Top Header Strip */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10 text-xs">
        <div className="flex items-center gap-2">
          {gamepadConnected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-600 text-emerald-400 font-bold text-[11px]">
              <Gamepad2 className="w-3.5 h-3.5" /> Gamepad Sẵn Sàng
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
              <Gamepad2 className="w-3.5 h-3.5" /> Bàn phím / Chuột
            </span>
          )}

          <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px]">
            v1.3 Outbreak
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            title="Âm thanh [M]"
            aria-label="Bật tắt âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400"
            aria-label="Cài đặt"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cài Đặt</span>
          </button>
        </div>
      </div>

      {/* Hero Title & Centerpiece Lockup */}
      <div className="flex flex-col items-center text-center my-auto z-10">
        {/* Pixel Zombie Badge */}
        <div className="mb-3 px-3 py-1 bg-rose-950/80 border border-rose-600 text-rose-400 text-xs font-pixel tracking-widest flex items-center gap-2 animate-pulse">
          <span>☣</span> 2D PIXEL SURVIVAL ESCAPE <span>☣</span>
        </div>

        {/* Title Logo */}
        <h1
          className="text-3xl sm:text-5xl md:text-6xl font-black font-pixel tracking-wider text-zinc-100 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)] mb-2"
          style={{ textShadow: '4px 4px 0px #7f1d1d, -2px -2px 0px #000' }}
        >
          {t.app_title}
        </h1>

        <p className="text-xs sm:text-sm font-bold text-amber-500 font-pixel tracking-wide mb-6">
          {t.app_subtitle}
        </p>

        {/* Selected Survivor Preview Card */}
        <div
          onClick={onOpenSurvivors}
          className="p-3 bg-zinc-950/90 border border-zinc-800 hover:border-emerald-500 cursor-pointer flex items-center gap-3 mb-6 transition-all shadow-md group"
          title="Bấm để đổi nhân vật"
        >
          <span className="text-2xl p-1 bg-zinc-900 border border-zinc-700">
            {selectedCharacter === 'medic' ? '👨‍⚕️' : selectedCharacter === 'spec_ops' ? '🥷' : '👷‍♂️'}
          </span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400">
                {t[currentSurvivor.nameKey]}
              </span>
              <span className="text-[9px] px-1 bg-zinc-800 text-zinc-400 border border-zinc-700">Đổi [U]</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5">{t[currentSurvivor.bonus]}</p>
          </div>
        </div>

        {/* Primary Action CTAs */}
        <div className="w-full max-w-xs space-y-2">
          {/* PRIMARY START BUTTON */}
          <button
            onClick={onStartGame}
            data-start="true"
            className="w-full py-3.5 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold font-pixel text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 border-2 border-rose-400 shadow-[0_0_25px_rgba(225,29,72,0.5)] active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            {t.btn_start_game}
          </button>

          <button
            onClick={onOpenDaily}
            className="w-full py-2.5 px-4 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 font-bold font-pixel text-xs flex items-center justify-center gap-2 border border-amber-600/80 hover:border-amber-400 transition-all shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
            {t.btn_daily_challenge}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenLevels}
              className="py-2 px-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-700"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {t.btn_level_select}
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="py-2 px-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-700"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              {t.btn_leaderboard}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenUpdates}
              className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center justify-center gap-1 border border-zinc-800"
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              {t.btn_updates}
            </button>
            <button
              onClick={onOpenSettings}
              className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center justify-center gap-1 border border-zinc-800"
            >
              <Moon className="w-3 h-3 text-purple-400" />
              Chế độ tối & Phím
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat borderless inline control hint */}
      <div className="z-10 text-[11px] text-zinc-500 font-mono tracking-wide text-center">
        WASD / Gamepad Di chuyển · Space / Click Tấn công · E Nhặt đồ · C Chế tạo · F Đèn pin · Esc Tạm dừng
      </div>
    </div>
  );
};
