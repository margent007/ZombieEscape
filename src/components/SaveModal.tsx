import React, { useState } from 'react';
import { LanguageCode, SaveSlotData } from '../types/game';
import { loadSaveSlot, saveSaveSlot } from '../game/storage';
import { soundManager } from '../game/audio';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Save, Download, Upload, Check, HardDrive } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSaveData: SaveSlotData;
  onLoadData: (data: SaveSlotData) => void;
  lang: LanguageCode;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  currentSaveData,
  onLoadData,
  lang,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('slot_1');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const slots = [
    { id: 'autosave', label: 'Tự Động Lưu (AutoSave)' },
    { id: 'slot_1', label: 'Ô Lưu 1 (Slot 1)' },
    { id: 'slot_2', label: 'Ô Lưu 2 (Slot 2)' },
    { id: 'slot_3', label: 'Ô Lưu 3 (Slot 3)' },
  ];

  const handleSaveToSlot = (slotId: string) => {
    saveSaveSlot(slotId, currentSaveData);
    soundManager.playLoot();
    showToast(`Đã lưu thành công vào [${slotId.toUpperCase()}]!`);
  };

  const handleLoadFromSlot = (slotId: string) => {
    const loaded = loadSaveSlot(slotId);
    onLoadData(loaded);
    soundManager.playCraftSuccess();
    showToast(`Đã tải dữ liệu từ [${slotId.toUpperCase()}]!`);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentSaveData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `deadescape_save_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã xuất file lưu trữ JSON!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        onLoadData(parsed);
        saveSaveSlot('slot_1', parsed);
        soundManager.playCraftSuccess();
        showToast('Nhập dữ liệu thành công!');
      } catch {
        showToast('File lưu trữ không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-zinc-700 p-5 shadow-[0_0_35px_rgba(0,0,0,0.8)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 border border-amber-500 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 id="save-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-400">
                {t.btn_save_game} / {t.btn_load_game}
              </h2>
              <p className="text-xs text-zinc-400">Quản lý ô nhớ cục bộ và sao lưu tệp dữ liệu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng bảng lưu game"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {toastMsg && (
          <div className="mb-3 p-2 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Slot Grid */}
        <div className="space-y-2 mb-4">
          {slots.map(slot => {
            const slotData = loadSaveSlot(slot.id);
            const hasData = slotData.stats.totalEscapes > 0 || slotData.stats.highestLevelUnlocked > 1;
            const dateStr = slotData.timestamp ? new Date(slotData.timestamp).toLocaleString() : 'Chưa có dữ liệu';

            return (
              <div
                key={slot.id}
                className="p-3 bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-zinc-200">{slot.label}</h4>
                  <div className="text-[11px] text-zinc-400 mt-1 space-x-2">
                    <span>Màn đã mở: <b className="text-amber-400">{slotData.stats.highestLevelUnlocked}/4</b></span>
                    <span>·</span>
                    <span>Trốn thoát: <b className="text-emerald-400">{slotData.stats.totalEscapes}</b></span>
                    <span>·</span>
                    <span>Thời gian: <span className="font-mono text-zinc-400">{dateStr}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveToSlot(slot.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold uppercase flex items-center gap-1 border border-amber-400"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu vào đây
                  </button>
                  <button
                    onClick={() => handleLoadFromSlot(slot.id)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase flex items-center gap-1 border border-zinc-600"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải slot này
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import / Export JSON Backup */}
        <div className="p-3 bg-black/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-400">
            Sao lưu ngoại tuyến: Xuất / Nhập file JSON để chuyển sang máy khác.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Xuất JSON
            </button>
            <label className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Nhập JSON
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
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
