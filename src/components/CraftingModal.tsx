import React from 'react';
import { CraftingRecipe, InventoryItem, LanguageCode } from '../types/game';
import { CRAFTING_RECIPES, ITEM_REGISTRY } from '../game/items';
import { canCraftRecipe, craftRecipe, getInventoryCount } from '../game/logic';
import { soundManager } from '../game/audio';
import { TRANSLATIONS } from '../i18n/translations';
import { X, Hammer, Shield, Cross, Flame } from 'lucide-react';

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onUpdateInventory: (newInv: InventoryItem[]) => void;
  lang: LanguageCode;
  onItemCrafted: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateInventory,
  lang,
  onItemCrafted,
}) => {
  const [activeCategory, setActiveCategory] = React.useState<'all' | 'medical' | 'combat' | 'survival'>('all');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  const filteredRecipes = CRAFTING_RECIPES.filter(
    r => activeCategory === 'all' || r.category === activeCategory
  );

  const handleCraft = (recipe: CraftingRecipe) => {
    const res = craftRecipe(inventory, recipe);
    if (res.success) {
      soundManager.playCraftSuccess();
      onUpdateInventory(res.nextInventory);
      onItemCrafted();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crafting-title"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-amber-600/80 rounded-none p-5 shadow-[0_0_30px_rgba(217,119,6,0.3)] text-zinc-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 border border-amber-500 text-amber-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 id="crafting-title" className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-400">
                {t.btn_crafting}
              </h2>
              <p className="text-xs text-zinc-400">Tạo vũ khí, y tế & công cụ từ nguyên liệu nhặt được</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
            aria-label="Đóng bảng chế tạo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold uppercase transition-all ${
              activeCategory === 'all'
                ? 'bg-amber-600 text-black border border-amber-400'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveCategory('medical')}
            className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all ${
              activeCategory === 'medical'
                ? 'bg-emerald-600 text-black border border-emerald-400'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <Cross className="w-3.5 h-3.5" /> Y Tế
          </button>
          <button
            onClick={() => setActiveCategory('combat')}
            className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all ${
              activeCategory === 'combat'
                ? 'bg-rose-600 text-black border border-rose-400'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Vũ Khí & Đạn
          </button>
          <button
            onClick={() => setActiveCategory('survival')}
            className={`px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition-all ${
              activeCategory === 'survival'
                ? 'bg-sky-600 text-black border border-sky-400'
                : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Phòng Thủ & Bẫy
          </button>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {filteredRecipes.map(recipe => {
            const resultDef = ITEM_REGISTRY[recipe.resultItemId];
            const craftable = canCraftRecipe(inventory, recipe);

            return (
              <div
                key={recipe.id}
                className={`p-3 border flex flex-col justify-between transition-all ${
                  craftable
                    ? 'bg-zinc-900/90 border-amber-500/60 shadow-[0_0_12px_rgba(217,119,6,0.15)]'
                    : 'bg-zinc-950/60 border-zinc-800 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1 bg-zinc-800 border border-zinc-700">{resultDef.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">
                          {t[recipe.nameKey] || resultDef.id} {recipe.resultCount > 1 ? `x${recipe.resultCount}` : ''}
                        </h4>
                        <span className="text-[10px] text-zinc-400 font-pixel">
                          {resultDef.category.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Required Ingredients */}
                  <div className="bg-black/60 p-2 border border-zinc-800/80 my-2 space-y-1">
                    <p className="text-[11px] text-zinc-400 font-bold mb-1">Nguyên liệu cần:</p>
                    {recipe.ingredients.map(ing => {
                      const ingDef = ITEM_REGISTRY[ing.itemId];
                      const available = getInventoryCount(inventory, ing.itemId);
                      const hasEnough = available >= ing.count;

                      return (
                        <div key={ing.itemId} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-zinc-300">
                            <span>{ingDef.icon}</span>
                            <span>{t[ingDef.nameKey] || ingDef.id}</span>
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              hasEnough ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {available}/{ing.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Craft Action Button */}
                <button
                  onClick={() => handleCraft(recipe)}
                  disabled={!craftable}
                  className={`w-full py-2 px-3 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                    craftable
                      ? 'bg-amber-600 hover:bg-amber-500 text-black border border-amber-400 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5" />
                  {craftable ? 'Chế tạo ngay' : 'Thiếu nguyên liệu'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Phím tắt: [C] hoặc nút [Y] trên tay cầm để đóng/mở</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
