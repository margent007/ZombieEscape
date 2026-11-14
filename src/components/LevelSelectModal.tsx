import React from 'react';
import { LanguageCode } from '../types/game';
import { GAME_LEVELS } from '../game/levels';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Lock, Play, MapPin } from 'lucide-react';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  highestLevelUnlocked: number;
  onSelectLevel: (levelId: number) => void;
  lang: LanguageCode;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  highestLevelUnlocked,
  onSelectLevel,
  lang,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="levels-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-amber-600/80 p-5 shadow-[0_0_35px_rgba(217,119,6,0.3)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 border border-amber-500 text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="levels-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-400">
                {t.btn_level_select}
              </h2>
              <p className="text-xs text-zinc-400">
                Tiến trình: <span className="text-emerald-400 font-bold">{Math.min(10, highestLevelUnlocked)}/10 Màn chơi</span> đã mở khóa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng chọn màn chơi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Cards Grid (Scrollable for 10 stages) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-h-[62vh] overflow-y-auto pr-1">
          {GAME_LEVELS.map(lvl => {
            const isUnlocked = lvl.id <= highestLevelUnlocked;

            return (
              <div
                key={lvl.id}
                className={`p-4 border flex flex-col justify-between transition-all ${
                  isUnlocked
                    ? 'bg-zinc-900/90 border-zinc-700 hover:border-amber-500/80 shadow-md'
                    : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 font-bold font-pixel bg-zinc-800 text-amber-400 border border-zinc-700">
                      MÀN {lvl.id}
                    </span>
                    {!isUnlocked && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold">
                        <Lock className="w-3.5 h-3.5" /> Khóa
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-zinc-100 mb-1">{t[lvl.nameKey] || lvl.key}</h3>
                  <p className="text-xs text-zinc-400 mb-3">{t[lvl.descKey] || ''}</p>
                </div>

                <button
                  onClick={() => {
                    if (isUnlocked) {
                      onClose();
                      onSelectLevel(lvl.id);
                    }
                  }}
                  disabled={!isUnlocked}
                  className={`w-full py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
                    isUnlocked
                      ? 'bg-amber-600 hover:bg-amber-500 text-black border border-amber-400'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-black" /> Vào Màn Này
                    </>
                  ) : (
                    'Chưa vượt qua màn trước'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 text-xs font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
