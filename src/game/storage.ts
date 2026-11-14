import {
  GameSettings,
  LeaderboardRecord,
  SaveSlotData,
} from '../types/game';
import { DEFAULT_KEYBINDINGS } from './input';
import { validateSaveData } from './logic';

const SETTINGS_STORAGE_KEY = 'deadescape_settings_v1';
const CURRENT_SLOT_KEY = 'deadescape_active_slot_v1';
const LEADERBOARD_KEY = 'deadescape_leaderboard_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'vi',
  theme: 'midnight', // Default to eye-care OLED dark theme!
  brightness: 1.15, // Balanced comfortable brightness
  minimapVisible: true,
  masterVolume: 0.8,
  sfxVolume: 0.85,
  bgmVolume: 0.5,
  screenShake: true,
  highContrast: false,
  keyBindings: { ...DEFAULT_KEYBINDINGS },
  vibration: true,
};

export const INITIAL_SAVE_DATA: SaveSlotData = {
  version: '1.3',
  timestamp: Date.now(),
  selectedCharacter: 'medic',
  stats: {
    totalEscapes: 0,
    totalDeaths: 0,
    totalZombiesSlain: 0,
    totalItemsCrafted: 0,
    highestLevelUnlocked: 1,
    dailyStreak: 0,
    unlockedClasses: ['medic', 'spec_ops', 'engineer'],
  },
  highScores: {},
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keyBindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keyBindings || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // quota
  }
}

export function loadSaveSlot(slotId: string = 'autosave'): SaveSlotData {
  try {
    const raw = localStorage.getItem(`deadescape_save_${slotId}`);
    if (!raw) return { ...INITIAL_SAVE_DATA };
    const validated = validateSaveData(JSON.parse(raw));
    return validated || { ...INITIAL_SAVE_DATA };
  } catch {
    return { ...INITIAL_SAVE_DATA };
  }
}

export function saveSaveSlot(slotId: string = 'autosave', data: SaveSlotData) {
  try {
    data.timestamp = Date.now();
    localStorage.setItem(`deadescape_save_${slotId}`, JSON.stringify(data));
  } catch {
    // quota
  }
}

export function getActiveSlotId(): string {
  return localStorage.getItem(CURRENT_SLOT_KEY) || 'autosave';
}

export function setActiveSlotId(slotId: string) {
  localStorage.setItem(CURRENT_SLOT_KEY, slotId);
}

// --- ONLINE LEADERBOARD (Simulated Live Network + Local Submissions) ---

const SEED_GLOBAL_LEADERBOARD: LeaderboardRecord[] = [
  {
    id: 'lb_1',
    playerName: 'ShadowHunter_VN',
    score: 28450,
    levelName: 'Bệnh Viện Bỏ Hoang',
    timeSeconds: 98,
    zombiesSlain: 14,
    itemsCrafted: 5,
    mode: 'campaign',
    date: '2026-11-10',
  },
  {
    id: 'lb_2',
    playerName: 'GhostRecon99',
    score: 25900,
    levelName: 'Căn Cứ Quân Sự Outpost Zero',
    timeSeconds: 145,
    zombiesSlain: 22,
    itemsCrafted: 8,
    mode: 'campaign',
    date: '2026-11-09',
  },
  {
    id: 'lb_3',
    playerName: 'TokyoSurvivor_Ken',
    score: 24100,
    levelName: 'Ga Tàu Điện Ngầm',
    timeSeconds: 112,
    zombiesSlain: 16,
    itemsCrafted: 4,
    mode: 'campaign',
    date: '2026-11-10',
  },
  {
    id: 'lb_4',
    playerName: 'Elena_Outbreak',
    score: 22800,
    levelName: 'Khu Ngoại Ô Tăm Tối',
    timeSeconds: 135,
    zombiesSlain: 18,
    itemsCrafted: 6,
    mode: 'campaign',
    date: '2026-11-08',
  },
  {
    id: 'lb_5',
    playerName: 'SàiGòn_Sniper',
    score: 34200,
    levelName: 'Thử Thách Huyết Nguyệt',
    timeSeconds: 160,
    zombiesSlain: 29,
    itemsCrafted: 9,
    mode: 'daily',
    date: '2026-11-11',
  },
  {
    id: 'lb_6',
    playerName: 'NightCrawler',
    score: 31500,
    levelName: 'Thử Thách Huyết Nguyệt',
    timeSeconds: 185,
    zombiesSlain: 25,
    itemsCrafted: 7,
    mode: 'daily',
    date: '2026-11-11',
  },
];

export function getLeaderboard(): LeaderboardRecord[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(SEED_GLOBAL_LEADERBOARD));
      return SEED_GLOBAL_LEADERBOARD;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => b.score - a.score);
    }
    return SEED_GLOBAL_LEADERBOARD;
  } catch {
    return SEED_GLOBAL_LEADERBOARD;
  }
}

export function submitLeaderboardScore(record: Omit<LeaderboardRecord, 'id' | 'date'>): LeaderboardRecord[] {
  const current = getLeaderboard();
  const newEntry: LeaderboardRecord = {
    ...record,
    id: `lb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().split('T')[0],
  };

  const updated = [newEntry, ...current].sort((a, b) => b.score - a.score).slice(0, 50); // Top 50

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return updated;
}
