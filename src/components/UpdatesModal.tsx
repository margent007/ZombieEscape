import React from 'react';
import { LanguageCode } from '../types/game';
import { CONTENT_PATCHES } from '../game/updates';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
}

export const UpdatesModal: React.FC<UpdatesModalProps> = ({ isOpen, onClose, lang }) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="updates-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-zinc-700 p-5 shadow-[0_0_35px_rgba(0,0,0,0.8)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 border border-sky-500 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="updates-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-sky-400">
                {t.updates_title}
              </h2>
              <p className="text-xs text-zinc-400">Các bản cập nhật tính năng định kỳ & nội dung mới nhất</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng bản cập nhật"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patch List */}
        <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
          {CONTENT_PATCHES.map((patch, idx) => (
            <div
              key={patch.version}
              className={`p-4 border ${
                idx === 0
                  ? 'bg-zinc-900 border-sky-500/70 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-100 font-pixel">{patch.version}</span>
                  {idx === 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-sky-500 text-black font-bold uppercase">
                      {t.updates_latest_badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400 font-mono">{patch.date}</span>
              </div>

              <h4 className="text-xs font-bold text-amber-400 mb-2">{patch.titleKey}</h4>

              <ul className="space-y-1.5">
                {patch.highlights.map((item, hIdx) => (
                  <li key={hIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
