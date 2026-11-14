import React, { useState } from 'react';
import { GameSettings, KeyBindings, LanguageCode, VisualTheme } from '../types/game';
import { DEFAULT_SETTINGS, saveSettings } from '../game/storage';
import { DEFAULT_KEYBINDINGS, inputManager } from '../game/input';
import { soundManager } from '../game/audio';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Volume2, Gamepad2, Keyboard, Eye, Globe, RotateCcw, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'controls' | 'gamepad'>('visual');
  const [current, setCurrent] = useState<GameSettings>({ ...settings });
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const t = TRANSLATIONS[current.language] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  const handleLanguageChange = (lang: LanguageCode) => {
    const updated = { ...current, language: lang };
    setCurrent(updated);
    onUpdateSettings(updated);
    saveSettings(updated);
  };

  const handleThemeChange = (theme: VisualTheme) => {
    const updated = { ...current, theme };
    setCurrent(updated);
    onUpdateSettings(updated);
    saveSettings(updated);
  };

  const handleVolumeChange = (type: 'master' | 'sfx' | 'bgm', val: number) => {
    const updated = {
      ...current,
      [type === 'master' ? 'masterVolume' : type === 'sfx' ? 'sfxVolume' : 'bgmVolume']: val,
    };
    setCurrent(updated);
    soundManager.setVolumes(updated.masterVolume, updated.sfxVolume, updated.bgmVolume);
    onUpdateSettings(updated);
    saveSettings(updated);
    if (type === 'sfx') {
      soundManager.playLoot();
    }
  };

  const handleStartRebind = (action: keyof KeyBindings) => {
    setRebindingAction(action);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!rebindingAction) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === 'Escape') {
      setRebindingAction(null);
      return;
    }

    const updatedBindings = {
      ...current.keyBindings,
      [rebindingAction]: e.code,
    };

    const updated = { ...current, keyBindings: updatedBindings };
    setCurrent(updated);
    inputManager.setBindings(updatedBindings);
    onUpdateSettings(updated);
    saveSettings(updated);
    setRebindingAction(null);
    soundManager.playFlashlightClick();
  };

  const handleResetDefaults = () => {
    const reset: GameSettings = {
      ...DEFAULT_SETTINGS,
      language: current.language, // Keep language
      keyBindings: { ...DEFAULT_KEYBINDINGS },
    };
    setCurrent(reset);
    inputManager.setBindings(DEFAULT_KEYBINDINGS);
    soundManager.setVolumes(reset.masterVolume, reset.sfxVolume, reset.bgmVolume);
    onUpdateSettings(reset);
    saveSettings(reset);
  };

  const handleTestVibration = () => {
    inputManager.triggerHaptics(300, 0.9);
    soundManager.playExplosion();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onKeyDown={rebindingAction ? handleKeyDown : undefined}
      tabIndex={0}
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-zinc-700 p-5 shadow-[0_0_35px_rgba(0,0,0,0.8)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 id="settings-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-400">
              {t.settings_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Đóng cài đặt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1.5 mb-4 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`py-2 px-2 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'visual'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Hiển thị / Tối</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2 px-2 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'audio'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Volume2 className="w-4 h-4" /> <span className="hidden sm:inline">Âm Thanh</span>
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-2 px-2 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'controls'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Keyboard className="w-4 h-4" /> <span className="hidden sm:inline">Phím Bấm</span>
          </button>
          <button
            onClick={() => setActiveTab('gamepad')}
            className={`py-2 px-2 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'gamepad'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4" /> <span className="hidden sm:inline">Gamepad</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[280px] max-h-[55vh] overflow-y-auto pr-1 text-sm">
          {/* TAB 1: VISUAL & THEME (EYE CARE) & LANGUAGE */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Globe className="w-4 h-4 text-amber-400" /> {t.settings_language}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { code: 'vi', label: '🇻🇳 Tiếng Việt' },
                    { code: 'en', label: '🇬🇧 English' },
                    { code: 'es', label: '🇪🇸 Español' },
                    { code: 'ja', label: '🇯🇵 日本語' },
                  ].map(item => (
                    <button
                      key={item.code}
                      onClick={() => handleLanguageChange(item.code as LanguageCode)}
                      className={`p-2.5 text-xs font-bold border transition-all text-left ${
                        current.language === item.code
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Eye className="w-4 h-4 text-amber-400" /> {t.settings_theme}
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'midnight',
                      title: t.theme_midnight,
                      desc: 'Màu nền đen OLED sâu, sắc thái dịu mắt, giảm tối đa ánh sáng xanh khi chơi ban đêm.',
                      badge: 'Giảm mỏi mắt 100%',
                    },
                    {
                      id: 'nightvision',
                      title: t.theme_nightvision,
                      desc: 'Mô phỏng kính nhìn đêm quang học xanh phosphor quân sự.',
                      badge: 'Chiến thuật',
                    },
                    {
                      id: 'crt',
                      title: t.theme_crt,
                      desc: 'Hiệu ứng đường quét Scanlines và CRT arcade cổ điển.',
                      badge: 'Hoài niệm Retro',
                    },
                    {
                      id: 'classic',
                      title: t.theme_classic,
                      desc: 'Bóng tối kinh dị u ám nguyên bản của DeadEscape.',
                      badge: 'Kinh dị gốc',
                    },
                  ].map(themeItem => (
                    <button
                      key={themeItem.id}
                      onClick={() => handleThemeChange(themeItem.id as VisualTheme)}
                      className={`w-full p-3 border text-left flex items-start justify-between gap-3 transition-all ${
                        current.theme === themeItem.id
                          ? 'bg-amber-600/20 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-100">{themeItem.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-amber-400 border border-zinc-700">
                            {themeItem.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{themeItem.desc}</p>
                      </div>
                      {current.theme === themeItem.id && <Check className="w-5 h-5 text-amber-400 shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness Adjustment Slider (Balanced) */}
              <div className="p-3 bg-zinc-900 border border-zinc-800">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-zinc-300">
                    Cân bằng độ sáng (Chống mỏi mắt)
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {Math.round((current.brightness || 1.15) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.6"
                  step="0.05"
                  value={current.brightness || 1.15}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...current, brightness: val };
                    setCurrent(updated);
                    onUpdateSettings(updated);
                    saveSettings(updated);
                  }}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Đã tối ưu mức 115% dịu mắt: không bị tối đen mù mịt và cũng không quá chói lóa.
                </p>
              </div>

              {/* Minimap Toggle */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Hiển thị Radar Minimap trong trận</span>
                  <span className="text-[11px] text-zinc-400">Phím tắt nhanh: [M] để ẩn/hiện</span>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...current, minimapVisible: !current.minimapVisible };
                    setCurrent(updated);
                    onUpdateSettings(updated);
                    saveSettings(updated);
                  }}
                  className={`px-3 py-1 text-xs font-bold uppercase border transition-all ${
                    current.minimapVisible
                      ? 'bg-amber-600 text-black border-amber-400'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {current.minimapVisible ? 'BẬT' : 'TẮT'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO CONTROLS */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-zinc-300">{t.settings_master_vol}</label>
                  <span className="text-xs font-mono text-amber-400">{Math.round(current.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.masterVolume}
                  onChange={e => handleVolumeChange('master', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-zinc-300">{t.settings_sfx_vol}</label>
                  <span className="text-xs font-mono text-amber-400">{Math.round(current.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.sfxVolume}
                  onChange={e => handleVolumeChange('sfx', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-zinc-300">{t.settings_bgm_vol}</label>
                  <span className="text-xs font-mono text-amber-400">{Math.round(current.bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.bgmVolume}
                  onChange={e => handleVolumeChange('bgm', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Kiểm tra hiệu ứng âm thanh Web Audio:</span>
                <button
                  onClick={() => soundManager.playShotgun()}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs"
                >
                  Thử tiếng Shotgun 💥
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM CONTROLS KEYBINDINGS */}
          {activeTab === 'controls' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 mb-2">
                Nhấp vào bất kỳ phím nào để gán lại (Bấm phím bất kỳ hoặc Esc để hủy):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'moveUp', label: t.key_move_up },
                  { key: 'moveDown', label: t.key_move_down },
                  { key: 'moveLeft', label: t.key_move_left },
                  { key: 'moveRight', label: t.key_move_right },
                  { key: 'sprint', label: t.key_sprint },
                  { key: 'sneak', label: t.key_sneak },
                  { key: 'interact', label: t.key_interact },
                  { key: 'attack', label: t.key_attack },
                  { key: 'reload', label: t.key_reload },
                  { key: 'flashlight', label: t.key_flashlight },
                  { key: 'crafting', label: t.key_crafting },
                  { key: 'pause', label: t.key_pause },
                ].map(item => {
                  const action = item.key as keyof KeyBindings;
                  const currentBinding = current.keyBindings[action];
                  const isRebinding = rebindingAction === action;

                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800"
                    >
                      <span className="text-xs text-zinc-300">{item.label}</span>
                      <button
                        onClick={() => handleStartRebind(action)}
                        className={`px-3 py-1 text-xs font-mono font-bold border transition-all ${
                          isRebinding
                            ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                            : 'bg-zinc-800 text-amber-400 border-zinc-700 hover:border-amber-500'
                        }`}
                      >
                        {isRebinding ? 'Nhấn phím...' : currentBinding.replace('Key', '')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GAMEPAD CONTROLLER */}
          {activeTab === 'gamepad' && (
            <div className="space-y-4">
              <div
                className={`p-3 border flex items-center justify-between ${
                  inputManager.gamepadConnected
                    ? 'bg-emerald-950/40 border-emerald-600 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  <span className="text-xs font-bold">
                    {inputManager.gamepadConnected ? t.gamepad_connected : t.gamepad_disconnected}
                  </span>
                </div>
                {inputManager.gamepadConnected && (
                  <button
                    onClick={handleTestVibration}
                    className="px-2.5 py-1 bg-emerald-600 text-black font-bold text-xs hover:bg-emerald-500"
                  >
                    Thử Rung Haptic 📳
                  </button>
                )}
              </div>

              {/* Gamepad Layout Guide */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 font-pixel">Sơ đồ nút bấm Gamepad chuẩn:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Cần Trái / D-Pad:</span>
                    <span className="text-amber-400 font-bold">Di chuyển 8 hướng</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Cần Phải (Right Stick):</span>
                    <span className="text-amber-400 font-bold">Xoay hướng ngắm 360°</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút RT / R2 / RB:</span>
                    <span className="text-amber-400 font-bold">Tấn công / Bắn súng</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút LT / L2:</span>
                    <span className="text-amber-400 font-bold">Chạy nước rút (Sprint)</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút A / X (Cross):</span>
                    <span className="text-amber-400 font-bold">Lục đồ / Tương tác [E]</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút B / O (Circle):</span>
                    <span className="text-amber-400 font-bold">Bật/Tắt Đèn pin [F]</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút Y / △ (Triangle):</span>
                    <span className="text-amber-400 font-bold">Mở Chế Tạo [C]</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 py-1">
                    <span>Nút Start / Options:</span>
                    <span className="text-amber-400 font-bold">Tạm dừng (Pause)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.btn_reset_defaults}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase"
          >
            {t.btn_save_settings}
          </button>
        </div>
      </div>
    </div>
  );
};
