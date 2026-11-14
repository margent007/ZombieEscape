import React from 'react';
import { LanguageCode } from '../types/game';
import { getDailyChallengeConfig } from '../game/logic';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Calendar, Skull, Award, Zap, Play } from 'lucide-react';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDaily: () => void;
  lang: LanguageCode;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  isOpen,
  onClose,
  onStartDaily,
  lang,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyConfig = getDailyChallengeConfig(todayStr);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-title"
    >
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-rose-600/90 p-5 shadow-[0_0_35px_rgba(225,29,72,0.3)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600/20 border border-rose-500 text-rose-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="daily-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-rose-400">
                {t.daily_title}
              </h2>
              <p className="text-xs text-zinc-400">
                {t.daily_today}: <span className="text-rose-300 font-bold">{todayStr}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng thử thách hàng ngày"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modifier Banner */}
        <div className="p-4 bg-zinc-900 border-2 border-rose-500/60 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400 font-bold tracking-wider">
              {t.daily_modifier_label}
            </span>
            <span
              className="text-xs px-2 py-0.5 font-bold uppercase text-black"
              style={{ backgroundColor: dailyConfig.modifier.badgeColor }}
            >
              HÔM NAY
            </span>
          </div>

          <div className="flex items-start gap-3">
            <Skull className="w-8 h-8 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {t[dailyConfig.modifier.nameKey] || dailyConfig.modifier.id}
              </h3>
              <p className="text-xs text-zinc-300 mt-1">
                {t[dailyConfig.modifier.descKey] || ''}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tốc độ Zombie: <b className="text-zinc-200">{Math.round(dailyConfig.modifier.zombieSpeedMult * 100)}%</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tài nguyên: <b className="text-zinc-200">+{Math.round((dailyConfig.modifier.lootRateMult - 1) * 100)}%</b></span>
            </div>
          </div>
        </div>

        {/* Daily Bonus Notice */}
        <div className="p-3 bg-amber-950/30 border border-amber-600/50 text-xs text-amber-300 mb-5 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t.daily_bonus_note}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 text-xs font-bold"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onClose();
              onStartDaily();
            }}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase flex items-center gap-2 border border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)]"
          >
            <Play className="w-4 h-4 fill-white" />
            Vào Thử Thách Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
