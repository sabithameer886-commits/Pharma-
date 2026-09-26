import React, { useState } from 'react';
import { Tag, X, Check, Sparkles, AlertTriangle, ShieldAlert, Clock, PackageCheck, Zap } from 'lucide-react';
import { Medicine, InventoryCategory } from '../types';

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  currentStock: number;
  onSaveCategory: (medicineId: string, customCategory: string, aiCategories: InventoryCategory[]) => void;
}

const PRESET_CATEGORIES: Array<{ key: InventoryCategory; label: string; icon: any; color: string }> = [
  { key: 'EXPIRED', label: 'Expired Stock', icon: ShieldAlert, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { key: 'EXPIRING_SOON', label: 'Near Expiry (<90d)', icon: Clock, color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { key: 'LOW_STOCK', label: 'Low Stock Alert', icon: AlertTriangle, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { key: 'OUT_OF_STOCK', label: 'Out of Stock', icon: AlertTriangle, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { key: 'OVERSTOCKED', label: 'Overstocked Excess', icon: PackageCheck, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { key: 'REORDER_NEEDED', label: 'Urgent Reorder', icon: Zap, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { key: 'FAST_MOVER', label: 'Fast Mover (OTC)', icon: Sparkles, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { key: 'OPTIMAL', label: 'Optimal Stock', icon: Check, color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
];

const COMMON_TAGS = [
  'Pediatric Fever',
  'Chronic Care (Diabetes/BP)',
  'Antibiotics & Anti-Infective',
  'Cold & Cough Syrup',
  'Skin & Dermatological',
  'Pain Relief & Analgesic',
  'High Margin Specialty',
  'Cold Storage 2-8°C',
];

export const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  onClose,
  medicine,
  currentStock,
  onSaveCategory,
}) => {
  if (!isOpen || !medicine) return null;

  const [selectedCategories, setSelectedCategories] = useState<InventoryCategory[]>(
    medicine.aiCategories || []
  );
  const [customTag, setCustomTag] = useState<string>(medicine.customCategory || '');

  const toggleCategory = (cat: InventoryCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCategory(medicine.id, customTag.trim(), selectedCategories);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Edit Category & Smart Tags
              </h3>
              <p className="text-[11px] text-slate-400">
                {medicine.name} • Stock: <strong className="text-emerald-400 font-mono">{currentStock}</strong> units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Smart Inventory Categories */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Select Inventory Status Categories:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_CATEGORIES.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedCategories.includes(preset.key);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => toggleCategory(preset.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center space-x-2 text-left ${
                      isSelected
                        ? `${preset.color} font-bold ring-1 ring-emerald-500/40`
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 truncate">{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Category / Group Tag */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Custom Clinical or Pharmacy Tag (Optional):
            </label>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="e.g. Pediatric Fever, Chronic Care, Fast Mover"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none placeholder-slate-500"
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1.5">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCustomTag(tag)}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition ${
                    customTag === tag
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Categories</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
