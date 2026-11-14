import React, { useState } from 'react';
import { LanguageCode } from '../types/game';
import { TRANSLATIONS } from '../i18n/translations';
import { submitLeaderboardScore } from '../game/storage';
import { soundManager } from '../game/audio';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, ArrowRight, Home, Send, Check } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  score: number;
  timeSeconds: number;
  zombiesSlain: number;
  itemsCrafted: number;
  levelName: string;
  isDaily: boolean;
  hasNextLevel: boolean;
  lang: LanguageCode;
  onNextLevel: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  score,
  timeSeconds,
  zombiesSlain,
  itemsCrafted,
  levelName,
  isDaily,
  hasNextLevel,
  lang,
  onNextLevel,
  onRestart,
  onMainMenu,
}) => {
  const [playerName, setPlayerName] = useState('Survivor_' + Math.floor(Math.random() * 899 + 100));
  const [submitted, setSubmitted] = useState(false);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  React.useEffect(() => {
    if (isOpen) {
      soundManager.playVictory();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#f59e0b', '#38bdf8'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || submitted) return;

    submitLeaderboardScore({
      playerName: playerName.trim(),
      score,
      levelName,
      timeSeconds,
      zombiesSlain,
      itemsCrafted,
      mode: isDaily ? 'daily' : 'campaign',
    });

    setSubmitted(true);
    soundManager.playLoot();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-emerald-500 p-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] text-zinc-100 font-mono text-center">
        <div className="inline-flex p-3 bg-emerald-950/60 border border-emerald-500 text-emerald-400 mb-3">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-bold font-pixel tracking-wider text-emerald-400 mb-1">
          {t.modal_victory_title}
        </h2>
        <p className="text-xs text-zinc-400 mb-4">{t.modal_victory_subtitle}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 bg-black/70 p-3 border border-zinc-800 text-xs mb-4 text-left">
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_time}</span>
            <span className="font-bold font-pixel text-zinc-200">{timeSeconds}s</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_kills}</span>
            <span className="font-bold font-pixel text-rose-400">{zombiesSlain} 💀</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_crafted}</span>
            <span className="font-bold font-pixel text-amber-400">{itemsCrafted} 🛠️</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_score}</span>
            <span className="font-bold font-pixel text-emerald-400 text-sm">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Online Leaderboard Submission */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="mb-4 p-2.5 bg-zinc-900 border border-zinc-800 text-xs">
            <label className="block text-[11px] text-zinc-400 mb-1.5 font-bold">
              Gửi điểm lên Bảng xếp hạng trực tuyến:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Nhập tên của bạn"
                className="flex-1 bg-black border border-zinc-700 px-2.5 py-1 text-zinc-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase flex items-center gap-1 text-xs"
              >
                <Send className="w-3 h-3" /> Gửi
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-4 p-2 bg-emerald-950/60 border border-emerald-600 text-emerald-300 text-xs flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> Đã ghi danh vào Bảng xếp hạng toàn cầu!
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {hasNextLevel && !isDaily && (
            <button
              onClick={onNextLevel}
              data-start="true"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase flex items-center justify-center gap-2 border border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            >
              {t.btn_next_level} <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRestart}
              className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t.btn_restart}
            </button>
            <button
              onClick={onMainMenu}
              className="py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> {t.btn_main_menu}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  timeSeconds: number;
  zombiesSlain: number;
  lang: LanguageCode;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  timeSeconds,
  zombiesSlain,
  lang,
  onRestart,
  onMainMenu,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  React.useEffect(() => {
    if (isOpen) {
      soundManager.playGameOver();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-rose-600 p-6 shadow-[0_0_40px_rgba(225,29,72,0.4)] text-zinc-100 font-mono text-center">
        <h2 className="text-xl font-bold font-pixel tracking-wider text-rose-500 mb-1 animate-pulse">
          {t.modal_gameover_title}
        </h2>
        <p className="text-xs text-zinc-400 mb-5">{t.modal_gameover_subtitle}</p>

        <div className="grid grid-cols-3 gap-2 bg-black/80 p-3 border border-zinc-800 text-xs mb-5 text-center">
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_time}</span>
            <span className="font-bold font-pixel text-zinc-200">{timeSeconds}s</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_kills}</span>
            <span className="font-bold font-pixel text-rose-400">{zombiesSlain}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">{t.stat_score}</span>
            <span className="font-bold font-pixel text-amber-400">{score}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRestart}
            data-start="true"
            className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-rose-400"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t.btn_restart}
          </button>
          <button
            onClick={onMainMenu}
            className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> {t.btn_main_menu}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenSave: () => void;
  onMainMenu: () => void;
  lang: LanguageCode;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onOpenSettings,
  onOpenSave,
  onMainMenu,
  lang,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm bg-zinc-950 border-2 border-zinc-700 p-6 shadow-[0_0_35px_rgba(0,0,0,0.8)] text-zinc-100 font-mono text-center">
        <h2 className="text-base font-bold font-pixel tracking-wider text-amber-400 mb-5">
          TẠM DỪNG (PAUSED)
        </h2>

        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase border border-amber-400"
          >
            {t.btn_resume}
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase"
          >
            {t.btn_restart}
          </button>

          <button
            onClick={onOpenSave}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase"
          >
            {t.btn_save_game} / {t.btn_load_game}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold uppercase"
          >
            {t.btn_settings}
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs uppercase"
          >
            {t.btn_main_menu}
          </button>
        </div>
      </div>
    </div>
  );
};
