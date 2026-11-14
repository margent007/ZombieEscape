import React from 'react';
import { CharacterClass, LanguageCode } from '../types/game';
import { SURVIVOR_PROFILES } from '../game/updates';
import { TRANSLATIONS } from '../i18n/translations';
import { X, UserCheck, Shield, Heart, Zap, Battery } from 'lucide-react';

interface SurvivorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacter: CharacterClass;
  onSelectCharacter: (char: CharacterClass) => void;
  lang: LanguageCode;
}

export const SurvivorModal: React.FC<SurvivorModalProps> = ({
  isOpen,
  onClose,
  selectedCharacter,
  onSelectCharacter,
  lang,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survivors-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-emerald-600/80 p-5 shadow-[0_0_35px_rgba(16,185,129,0.25)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 border border-emerald-500 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="survivors-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-emerald-400">
                {t.survivors_title}
              </h2>
              <p className="text-xs text-zinc-400">Mỗi nhân vật sở hữu chỉ số cơ bản và đặc quyền sinh tồn riêng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng chọn nhân vật"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Characters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {SURVIVOR_PROFILES.map(char => {
            const isSelected = selectedCharacter === char.id;

            return (
              <div
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`p-3.5 border cursor-pointer flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl p-1 bg-zinc-800 border border-zinc-700">
                      {char.id === 'medic' ? '👨‍⚕️' : char.id === 'spec_ops' ? '🥷' : '👷‍♂️'}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-black font-bold uppercase">
                        Đang chọn
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-zinc-100">{t[char.nameKey] || char.id}</h3>
                  <p className="text-xs text-zinc-400 mt-1 mb-3">{t[char.descKey] || ''}</p>

                  {/* Attributes */}
                  <div className="space-y-1.5 bg-black/60 p-2 border border-zinc-800 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Heart className="w-3.5 h-3.5 text-rose-400" /> Máu:
                      </span>
                      <span className="font-bold text-rose-400">{char.baseHp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Thể lực:
                      </span>
                      <span className="font-bold text-amber-400">{char.baseStamina}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Battery className="w-3.5 h-3.5 text-sky-400" /> Pin đèn:
                      </span>
                      <span className="font-bold text-sky-400">{char.baseBattery}%</span>
                    </div>
                  </div>
                </div>

                {/* Perk */}
                <div className="p-2 bg-emerald-950/30 border border-emerald-800/60 text-[11px] text-emerald-300">
                  <div className="flex items-center gap-1 font-bold text-emerald-400 mb-0.5">
                    <Shield className="w-3 h-3" /> Đặc quyền:
                  </div>
                  <span>{t[char.bonus] || ''}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase"
          >
            Xác Nhận Chọn
          </button>
        </div>
      </div>
    </div>
  );
};
