import React, { useState } from 'react';
import { LeaderboardRecord, LanguageCode } from '../types/game';
import { getLeaderboard } from '../game/storage';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Trophy, Medal, Flame, Calendar } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, lang }) => {
  const [filter, setFilter] = useState<'all' | 'daily' | 'campaign'>('all');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  const records = getLeaderboard().filter(r => (filter === 'all' ? true : r.mode === filter));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <div className="relative w-full max-w-3xl bg-zinc-950 border-2 border-amber-600/80 p-5 shadow-[0_0_35px_rgba(217,119,6,0.25)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-500 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 id="leaderboard-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-400">
                {t.btn_leaderboard}
              </h2>
              <p className="text-xs text-zinc-400">Bảng vàng những người sinh tồn trốn thoát xuất sắc nhất</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng bảng xếp hạng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold uppercase transition-all ${
              filter === 'all'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('daily')}
            className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all ${
              filter === 'daily'
                ? 'bg-rose-600 text-black border border-rose-400'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Thử Thách Hàng Ngày
          </button>
          <button
            onClick={() => setFilter('campaign')}
            className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all ${
              filter === 'campaign'
                ? 'bg-sky-600 text-black border border-sky-400'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Chiến Dịch Màn Chơi
          </button>
        </div>

        {/* Table */}
        <div className="max-h-[55vh] overflow-y-auto border border-zinc-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 sticky top-0">
              <tr>
                <th className="p-2.5 text-center w-12">#</th>
                <th className="p-2.5">Người chơi</th>
                <th className="p-2.5">Màn / Thử thách</th>
                <th className="p-2.5 text-center">Thời gian</th>
                <th className="p-2.5 text-center">Diệt Zombie</th>
                <th className="p-2.5 text-right">Điểm số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {records.map((rec, index) => {
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                return (
                  <tr
                    key={rec.id}
                    className={`hover:bg-zinc-900/60 transition-colors ${
                      isTop1 ? 'bg-amber-950/20 text-amber-200' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center font-bold">
                      {isTop1 ? (
                        <span className="text-amber-400 flex justify-center">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : isTop2 ? (
                        <span className="text-zinc-300 flex justify-center">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : isTop3 ? (
                        <span className="text-amber-700 flex justify-center">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : (
                        index + 1
                      )}
                    </td>
                    <td className="p-2.5 font-bold flex items-center gap-2">
                      <span className="text-zinc-200">{rec.playerName}</span>
                      {rec.mode === 'daily' && (
                        <span className="text-[9px] px-1 bg-rose-950 text-rose-400 border border-rose-800">
                          DAILY
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-zinc-400">{rec.levelName}</td>
                    <td className="p-2.5 text-center font-mono">{rec.timeSeconds}s</td>
                    <td className="p-2.5 text-center font-mono text-rose-400">{rec.zombiesSlain} 💀</td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-400 text-sm">
                      {rec.score.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
