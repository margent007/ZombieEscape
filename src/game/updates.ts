import { SurvivorProfile } from '../types/game';

export interface UpdatePatch {
  version: string;
  date: string;
  titleKey: string;
  badge: 'major' | 'event' | 'hotfix';
  highlights: string[];
}

export const SURVIVOR_PROFILES: SurvivorProfile[] = [
  {
    id: 'medic',
    nameKey: 'char_medic_name',
    descKey: 'char_medic_desc',
    bonus: 'char_medic_perk',
    baseHp: 110,
    baseStamina: 100,
    baseBattery: 100,
    startingItems: [
      { itemId: 'crowbar', count: 1 },
      { itemId: 'bandage', count: 2 },
      { itemId: 'alcohol', count: 1 },
      { itemId: 'cloth', count: 2 },
    ],
  },
  {
    id: 'spec_ops',
    nameKey: 'char_spec_ops_name',
    descKey: 'char_spec_ops_desc',
    bonus: 'char_spec_ops_perk',
    baseHp: 100,
    baseStamina: 125,
    baseBattery: 100,
    startingItems: [
      { itemId: 'pistol', count: 1 },
      { itemId: 'ammo_pistol', count: 18 },
      { itemId: 'bandage', count: 1 },
    ],
  },
  {
    id: 'engineer',
    nameKey: 'char_engineer_name',
    descKey: 'char_engineer_desc',
    bonus: 'char_engineer_perk',
    baseHp: 95,
    baseStamina: 100,
    baseBattery: 180,
    startingItems: [
      { itemId: 'crowbar', count: 1 },
      { itemId: 'wood_plank', count: 3 },
      { itemId: 'scrap_metal', count: 4 },
      { itemId: 'nails', count: 4 },
      { itemId: 'battery', count: 2 },
    ],
  },
];

export const CONTENT_PATCHES: UpdatePatch[] = [
  {
    version: 'v1.3 - Outbreak Extreme',
    date: '2026-11',
    titleKey: 'Cập nhật Vùng Căn Cứ & Trực Thăng Cứu Hộ',
    badge: 'major',
    highlights: [
      'Thêm Màn 4: Căn cứ Quân sự Outpost Zero với trùm Đột Biến Khổng Lồ.',
      'Hỗ trợ toàn diện điều khiển qua Gamepad với rung phản hồi lực haptic.',
      'Chế độ hiển thị chống mỏi mắt Midnight Deep OLED và Night Vision.',
      'Bảng xếp hạng trực tuyến phân cấp đa danh mục toàn cầu.',
    ],
  },
  {
    version: 'v1.2 - Toxic Wasteland',
    date: '2026-10',
    titleKey: 'Đêm Huyết Nguyệt & Thử Thách Hàng Ngày',
    badge: 'event',
    highlights: [
      'Hệ thống Thử thách hàng ngày thay đổi biến thể thời tiết mỗi 24 giờ.',
      'Cơ chế chế tạo mìn âm thanh dụ địch & bom xăng tự chế.',
      'Tối ưu hóa âm thanh vòm bằng Web Audio API không phụ thuộc mạng.',
    ],
  },
  {
    version: 'v1.1 - The Suburbs Crawlers',
    date: '2026-09',
    titleKey: 'Khu Ngoại Ô & Zombie Phun Độc',
    badge: 'major',
    highlights: [
      'Bổ sung màn chơi Khu Ngoại Ô và Ga Tàu Điện Ngầm bí ẩn.',
      'Thêm phân lớp nhân vật Bác Sĩ Quân Y và Kỹ Sư Sinh Tồn.',
      'Hệ thống lưu trữ dữ liệu người chơi cục bộ an toàn 100%.',
    ],
  },
  {
    version: 'v1.0 - Genesis Release',
    date: '2026-08',
    titleKey: 'Khởi đầu sinh tồn Pixel 2D',
    badge: 'major',
    highlights: [
      'Đồ họa Pixel Art hoài niệm kết hợp nón ánh sáng đèn pin chân thực.',
      'Cơ chế lén lút (Stealth) vs Tiếng động (Noise).',
      'Kho vũ khí xà beng, súng ngắn cảnh sát và shotgun uy lực.',
    ],
  },
];
