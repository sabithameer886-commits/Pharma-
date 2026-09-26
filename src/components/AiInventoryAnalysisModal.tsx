import React, { useState } from 'react';
import {
  Sparkles,
  X,
  ShieldAlert,
  AlertTriangle,
  Clock,
  PackageCheck,
  Zap,
  TrendingDown,
  CheckCircle2,
  Check,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { Medicine, Batch } from '../types';

export interface AiInventoryAnalysisData {
  healthScore: number;
  healthStatus: string;
  totalAtRiskValue: number;
  expiredCount: number;
  nearExpiryCount: number;
  lowStockCount: number;
  overstockedCount: number;
  reorderNeededCount: number;
  categorizations: Array<{
    medicineId: string;
    medicineName: string;
    currentStock: number;
    nearestExpiry: string;
    categories: string[];
    riskScore: number;
    primaryAction: string;
    recommendedOrderQty: number;
    reason: string;
  }>;
  executiveSummary: string;
  topUrgentActions: string[];
}

interface AiInventoryAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: AiInventoryAnalysisData | null;
  onReanalyze: () => void;
  onApplyAllCategories: (categorizations: AiInventoryAnalysisData['categorizations']) => void;
  onOpenCustomerSale?: (medicineId?: string) => void;
}

export const AiInventoryAnalysisModal: React.FC<AiInventoryAnalysisModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  data,
  onReanalyze,
  onApplyAllCategories,
  onOpenCustomerSale,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [hasAppliedNotice, setHasAppliedNotice] = useState(false);

  if (!isOpen) return null;

  const filteredItems = data?.categorizations.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.categories.includes(filterCategory);
  }) || [];

  const handleApply = () => {
    if (!data) return;
    onApplyAllCategories(data.categorizations);
    setHasAppliedNotice(true);
    setTimeout(() => setHasAppliedNotice(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  AI Stock Health & Categorization Audit
                </h3>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold rounded-full border border-purple-500/30">
                  Gemini AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated risk assessment for expired batches, low-stock reorder thresholds, and FEFO clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onReanalyze}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
              <span>{isLoading ? 'Analyzing...' : 'Re-Run Audit'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Applied Notice Banner */}
        {hasAppliedNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-200 animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Success:</strong> AI inventory categories and recommendations have been tagged to all medicines in your catalog!
              </span>
            </div>
            <button onClick={() => setHasAppliedNotice(false)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center animate-spin">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Auditing Pharmacy Inventory with AI...</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Cross-referencing batches, expiration dates, safety thresholds, and dispensing velocities.
                </p>
              </div>
            </div>
          ) : !data ? (
            <div className="py-16 text-center text-slate-400">
              No audit data available. Click &quot;Re-Run Audit&quot; to inspect inventory.
            </div>
          ) : (
            <>
              {/* Top Executive Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Health Score Card */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Pharmacy Health Score
                    </span>
                    <div className="flex items-baseline space-x-1.5 mt-1">
                      <span
                        className={`text-3xl font-extrabold font-mono ${
                          data.healthScore >= 80
                            ? 'text-emerald-400'
                            : data.healthScore >= 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {data.healthScore}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">/100</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-300 block mt-0.5">
                      Status: <strong className="text-white">{data.healthStatus.replace('_', ' ')}</strong>
                    </span>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                      data.healthScore >= 80
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : data.healthScore >= 60
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Stock at Risk */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">
                      Stock Value at Risk
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
                      ₹{data.totalAtRiskValue.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Expired or &lt;90d expiring stock
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </div>

                {/* Expired Batches */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">
                      Expired Batches
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-rose-400 mt-1 block">
                      {data.expiredCount} Medicines
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Quarantine required immediately
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                </div>

                {/* Low Stock & Reorders */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                      Reorder Depletions
                    </span>
                    <span className="text-2xl font-extrabold font-mono text-amber-400 mt-1 block">
                      {data.reorderNeededCount} Medicines
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Below threshold or depleted
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* AI Urgent Action Recommendations */}
              {data.topUrgentActions && data.topUrgentActions.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">
                      AI Immediate Directives:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.topUrgentActions.map((action, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-900/80 border border-purple-500/20 rounded-lg text-xs text-slate-200 flex items-start space-x-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter Chips & Auto-Apply Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filter:</span>
                  </span>
                  {[
                    { key: 'ALL', label: 'All Audited' },
                    { key: 'EXPIRED', label: `Expired (${data.expiredCount})` },
                    { key: 'EXPIRING_SOON', label: `Near Expiry (${data.nearExpiryCount})` },
                    { key: 'LOW_STOCK', label: `Low Stock (${data.lowStockCount})` },
                    { key: 'OVERSTOCKED', label: `Overstocked (${data.overstockedCount})` },
                    { key: 'REORDER_NEEDED', label: `Reorder Needed (${data.reorderNeededCount})` },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => setFilterCategory(btn.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        filterCategory === btn.key
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition flex items-center space-x-2 shrink-0"
                  title="Tag each medicine with its AI categorized status in the master catalog"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply AI Categories to Catalog</span>
                </button>
              </div>

              {/* Table of Classified Medicines */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60 shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-2 text-center">Stock</th>
                      <th className="py-2.5 px-2 font-mono">Nearest Expiry</th>
                      <th className="py-2.5 px-3">AI Assigned Category</th>
                      <th className="py-2.5 px-3">Recommended Action</th>
                      <th className="py-2.5 px-3">Clinical / Financial Reason</th>
                      <th className="py-2.5 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No medicines match the selected AI category filter.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.medicineId} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {item.medicineName}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-200">
                            {item.currentStock}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-300">
                            {item.nearestExpiry}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {item.categories.map((c) => (
                                <span
                                  key={c}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    c === 'EXPIRED'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : c === 'EXPIRING_SOON'
                                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                      : c === 'LOW_STOCK'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : c === 'OUT_OF_STOCK'
                                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                                      : c === 'OVERSTOCKED'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {c.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-200">
                            {item.primaryAction}
                            {item.recommendedOrderQty > 0 && (
                              <span className="text-emerald-400 font-mono font-bold block text-[10px]">
                                PO Qty: +{item.recommendedOrderQty} units
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-400 leading-snug">
                            {item.reason}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {onOpenCustomerSale && item.currentStock > 0 && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenCustomerSale(item.medicineId);
                                }}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold transition"
                              >
                                Dispense
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {data ? `Total Classified: ${data.categorizations.length} medicines` : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
