import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Clock,
  PackageCheck,
  TrendingDown,
  ShoppingCart,
  Printer,
  FileScan,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Pill,
  Building2,
  Plus,
  Zap,
  Info,
  Calendar,
  Layers,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { Medicine, Batch, Supplier, MedicineType } from '../types';

export type AiAnalysisSubCategory =
  | 'NEEDED_LIST'
  | 'OUT_OF_STOCK'
  | 'LOW_STOCK'
  | 'EXPIRY_RISK'
  | 'AI_ADVICE';

interface AiInventoryAnalysisViewProps {
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  onOpenCustomerSale?: (medicineId?: string) => void;
  onOpenRestockModal?: () => void;
  onScanNewBill?: () => void;
  onInwardNeededMedicines?: (
    supplierName: string,
    items: Array<{
      medicineId: string;
      medicineName: string;
      quantity: number;
      purchasePrice: number;
      mrp: number;
      type: MedicineType;
    }>
  ) => void;
  onQuickRestock?: (medicineId: string, quantity: number) => void;
  onUpdateMedicine?: (med: Medicine) => void;
}

export const AiInventoryAnalysisView: React.FC<AiInventoryAnalysisViewProps> = ({
  medicines,
  batches,
  suppliers,
  onOpenCustomerSale,
  onOpenRestockModal,
  onScanNewBill,
  onInwardNeededMedicines,
  onQuickRestock,
  onUpdateMedicine,
}) => {
  const [activeCategory, setActiveCategory] = useState<AiAnalysisSubCategory>('NEEDED_LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<'ALL' | 'EXPIRED' | 'NEAR_EXPIRY'>('ALL');
  const [selectedForPo, setSelectedForPo] = useState<Set<string>>(new Set());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const now = useMemo(() => Date.now(), []);
  const ninetyDaysMs = 90 * 86400000;

  // 1. Compute comprehensive batch & stock aggregates
  const {
    stockMap,
    medicineBatchesMap,
    outOfStockList,
    lowStockList,
    neededMedicinesList,
    expiredBatchesList,
    nearExpiryBatchesList,
    totalCapitalAtRisk,
  } = useMemo(() => {
    const sMap = new Map<string, number>();
    const bMap = new Map<string, Batch[]>();

    for (const b of batches) {
      const current = sMap.get(b.medicineId) || 0;
      sMap.set(b.medicineId, current + (b.quantity > 0 ? b.quantity : 0));

      const list = bMap.get(b.medicineId) || [];
      list.push(b);
      bMap.set(b.medicineId, list);
    }

    const outList: Array<{ medicine: Medicine; minAlert: number }> = [];
    const lowList: Array<{ medicine: Medicine; stock: number; minAlert: number }> = [];
    const neededList: Array<{
      medicine: Medicine;
      stock: number;
      minAlert: number;
      suggestedQty: number;
      estimatedCost: number;
      urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
      reason: string;
      preferredSupplier?: Supplier;
    }> = [];

    let atRiskVal = 0;
    const expList: Array<{
      batch: Batch;
      medicine?: Medicine;
      daysRemaining: number;
      isExpired: boolean;
      value: number;
    }> = [];
    const nearList: Array<{
      batch: Batch;
      medicine?: Medicine;
      daysRemaining: number;
      isExpired: boolean;
      value: number;
    }> = [];

    // Index suppliers & medicines for O(1) lookup
    const suppliersById = new Map<string, Supplier>();
    for (const s of suppliers) {
      suppliersById.set(s.id, s);
    }
    const medicinesById = new Map<string, Medicine>();
    for (const m of medicines) {
      medicinesById.set(m.id, m);
    }

    // Evaluate Medicines
    for (const med of medicines) {
      const stock = sMap.get(med.id) || 0;
      const minAlert = med.minStockAlert || 30;
      const rate = med.purchasePrice || Math.round(med.mrp * 0.75);

      const prefSupplier = med.preferredSupplierId ? suppliersById.get(med.preferredSupplierId) : undefined;

      if (stock === 0) {
        outList.push({ medicine: med, minAlert });
        const suggested = minAlert * 2;
        neededList.push({
          medicine: med,
          stock: 0,
          minAlert,
          suggestedQty: suggested,
          estimatedCost: suggested * rate,
          urgency: 'CRITICAL',
          reason: 'Out of stock: immediate prescription bouncing risk',
          preferredSupplier: prefSupplier,
        });
      } else if (stock <= minAlert) {
        lowList.push({ medicine: med, stock, minAlert });
        const suggested = Math.max(10, minAlert * 2 - stock);
        neededList.push({
          medicine: med,
          stock,
          minAlert,
          suggestedQty: suggested,
          estimatedCost: suggested * rate,
          urgency: stock <= Math.round(minAlert * 0.4) ? 'HIGH' : 'MEDIUM',
          reason: `Stock (${stock}) at or below alert threshold (${minAlert})`,
          preferredSupplier: prefSupplier,
        });
      }
    }

    // Evaluate Batches for Expiries
    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const expTime = new Date(b.expiryDate).getTime();
      const diff = expTime - now;
      const daysRemaining = Math.ceil(diff / 86400000);
      const med = medicinesById.get(b.medicineId);
      const batchVal = (b.quantity || 0) * (b.purchasePrice || 0);

      if (diff < 0) {
        atRiskVal += batchVal;
        expList.push({
          batch: b,
          medicine: med,
          daysRemaining,
          isExpired: true,
          value: batchVal,
        });
      } else if (diff <= ninetyDaysMs) {
        atRiskVal += batchVal * 0.5; // partial risk
        nearList.push({
          batch: b,
          medicine: med,
          daysRemaining,
          isExpired: false,
          value: batchVal,
        });
      }
    }

    // Sort needed medicines by urgency then name
    neededList.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
      if (order[a.urgency] !== order[b.urgency]) {
        return order[a.urgency] - order[b.urgency];
      }
      return a.medicine.name.localeCompare(b.medicine.name);
    });

    return {
      stockMap: sMap,
      medicineBatchesMap: bMap,
      outOfStockList: outList,
      lowStockList: lowList,
      neededMedicinesList: neededList,
      expiredBatchesList: expList,
      nearExpiryBatchesList: nearList,
      totalCapitalAtRisk: Math.round(atRiskVal),
    };
  }, [medicines, batches, suppliers, now]);

  // Overall Health Score
  const healthScore = Math.max(
    30,
    Math.min(
      100,
      Math.round(
        100 -
          expiredBatchesList.length * 7 -
          outOfStockList.length * 4 -
          lowStockList.length * 2
      )
    )
  );

  const healthStatus =
    healthScore >= 85
      ? { label: 'EXCELLENT', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
      : healthScore >= 70
      ? { label: 'STABLE', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' }
      : healthScore >= 50
      ? { label: 'ATTENTION NEEDED', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
      : { label: 'CRITICAL RISK', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };

  // Select all / toggle for Purchase Order builder
  const toggleSelectPo = (medId: string) => {
    setSelectedForPo((prev) => {
      const next = new Set(prev);
      if (next.has(medId)) next.delete(medId);
      else next.add(medId);
      return next;
    });
  };

  const selectAllNeeded = () => {
    if (selectedForPo.size === neededMedicinesList.length) {
      setSelectedForPo(new Set());
    } else {
      setSelectedForPo(new Set(neededMedicinesList.map((i) => i.medicine.id)));
    }
  };

  // Run live Gemini AI Audit
  const handleRunAiAudit = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-inventory-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines, batches }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data);
        setActiveCategory('AI_ADVICE');
        setActionSuccessNotice('Gemini AI strategic inventory audit completed!');
        setTimeout(() => setActionSuccessNotice(null), 4000);
      }
    } catch (e) {
      console.error('Failed to run AI audit:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Transfer selected needed medicines into Bill Scanner or Purchase Order
  const handleCreateInwardFromPo = () => {
    const targetItems = neededMedicinesList.filter((item) =>
      selectedForPo.size === 0 ? true : selectedForPo.has(item.medicine.id)
    );

    if (targetItems.length === 0) return;

    if (onInwardNeededMedicines) {
      onInwardNeededMedicines(
        'Apex Healthcare Wholesale Logistics',
        targetItems.map((item) => ({
          medicineId: item.medicine.id,
          medicineName: item.medicine.name,
          quantity: item.suggestedQty,
          purchasePrice: item.medicine.purchasePrice || Math.round(item.medicine.mrp * 0.7),
          mrp: item.medicine.mrp,
          type: item.medicine.type,
        }))
      );
    } else if (onScanNewBill) {
      onScanNewBill();
    }
  };

  // Quick PO Print
  const handlePrintPo = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & AI Health Score Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <span>AI Inventory & Supply-Chain Analysis</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Gemini 3.8 Intelligence
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Continuous surveillance of Out-of-Stock formulations, Low-Stock alerts, Expiry quarantine, and automated Reorder PO list.
                </p>
              </div>
            </div>
          </div>

          {/* Health Index & Live Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center space-x-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Stock Health Index
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white">{healthScore}/100</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthStatus.color}`}>
                    {healthStatus.label}
                  </span>
                </div>
              </div>
            </div>

            {onOpenRestockModal && (
              <button
                onClick={onOpenRestockModal}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer"
                title="Open AI Restock from Supplier & Send WhatsApp Order"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>AI Restock (WhatsApp PO)</span>
              </button>
            )}

            <button
              onClick={handleRunAiAudit}
              disabled={isAiLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-500/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analyzing Stock with AI...' : 'Run Live Gemini Audit'}</span>
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessNotice && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* 4 Interactive Category KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category 1: Needed Medicines (Reorders) */}
        <div
          onClick={() => setActiveCategory('NEEDED_LIST')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
            activeCategory === 'NEEDED_LIST'
              ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                Needed Medicines List
              </span>
              <p className="text-2xl font-black text-white">
                {neededMedicinesList.length}
              </p>
              <p className="text-[11px] text-slate-400">
                Formulations requiring immediate procurement
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Est. PO Value</span>
            <span className="font-mono font-bold text-purple-300">
              ₹
              {neededMedicinesList
                .reduce((acc, item) => acc + item.estimatedCost, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>

        {/* Category 2: Out of Stock */}
        <div
          onClick={() => setActiveCategory('OUT_OF_STOCK')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
            activeCategory === 'OUT_OF_STOCK'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                Out of Stock (0 Units)
              </span>
              <p className="text-2xl font-black text-white">
                {outOfStockList.length}
              </p>
              <p className="text-[11px] text-slate-400">
                Critical stockouts risking bounced orders
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Urgency Level</span>
            <span className="font-bold text-rose-400">CRITICAL PRIORITY</span>
          </div>
        </div>

        {/* Category 3: Low Stock Alerts */}
        <div
          onClick={() => setActiveCategory('LOW_STOCK')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
            activeCategory === 'LOW_STOCK'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Low Stock Thresholds
              </span>
              <p className="text-2xl font-black text-white">
                {lowStockList.length}
              </p>
              <p className="text-[11px] text-slate-400">
                Medicines at or below safety buffer
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Buffer Safety</span>
            <span className="font-bold text-amber-300">Replenish Recommended</span>
          </div>
        </div>

        {/* Category 4: Expiry & Near Expiry */}
        <div
          onClick={() => setActiveCategory('EXPIRY_RISK')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group ${
            activeCategory === 'EXPIRY_RISK'
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-orange-500/50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Expiry & FEFO Batches
              </span>
              <p className="text-2xl font-black text-white">
                {expiredBatchesList.length + nearExpiryBatchesList.length}
              </p>
              <p className="text-[11px] text-slate-400">
                {expiredBatchesList.length} expired • {nearExpiryBatchesList.length} within 90 days
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Capital At Risk</span>
            <span className="font-mono font-bold text-orange-300">
              ₹{totalCapitalAtRisk.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Category Navigation Pills & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCategory('NEEDED_LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeCategory === 'NEEDED_LIST'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Needed Medicines List (PO Builder)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-purple-950 text-purple-200">
              {neededMedicinesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('OUT_OF_STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeCategory === 'OUT_OF_STOCK'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Out of Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-950 text-rose-200">
              {outOfStockList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeCategory === 'LOW_STOCK'
                ? 'bg-amber-600 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-950 text-amber-200">
              {lowStockList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('EXPIRY_RISK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeCategory === 'EXPIRY_RISK'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiry Risk</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-orange-950 text-orange-200">
              {expiredBatchesList.length + nearExpiryBatchesList.length}
            </span>
          </button>

          {aiReport && (
            <button
              onClick={() => setActiveCategory('AI_ADVICE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeCategory === 'AI_ADVICE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-950/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Strategic Insights</span>
            </button>
          )}
        </div>

        {/* Global Search inside Category */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search within category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* VIEW 1: NEEDED MEDICINES LIST (PO BUILDER) */}
      {activeCategory === 'NEEDED_LIST' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Needed Medicines List (Purchase Order Generator)</span>
                <span className="text-xs font-normal text-slate-400">
                  ({neededMedicinesList.length} formulations identified)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Calculated automatically from stockouts and safety stock alerts. Select medicines to generate a PO or inward to scanner.
              </p>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={selectAllNeeded}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                {selectedForPo.size === neededMedicinesList.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>

              <button
                onClick={handlePrintPo}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
                title="Print Purchase Order"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PO</span>
              </button>

              {onOpenRestockModal && (
                <button
                  onClick={onOpenRestockModal}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-lg transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
                  title="Open AI Restock Modal to customize units & send WhatsApp order image"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Restock & Send WhatsApp PO</span>
                </button>
              )}

              <button
                onClick={handleCreateInwardFromPo}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
              >
                <FileScan className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Scanner Inward</span>
              </button>
            </div>
          </div>

          {/* Selected Summary Strip */}
          {selectedForPo.size > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs">
              <span className="text-purple-300 font-semibold">
                {selectedForPo.size} medicines selected for reorder
              </span>
              <span className="font-mono font-bold text-white">
                Estimated Procurement Cost: ₹
                {neededMedicinesList
                  .filter((i) => selectedForPo.has(i.medicine.id))
                  .reduce((acc, i) => acc + i.estimatedCost, 0)
                  .toLocaleString()}
              </span>
            </div>
          )}

          {/* Table of Needed Medicines */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        neededMedicinesList.length > 0 &&
                        selectedForPo.size === neededMedicinesList.length
                      }
                      onChange={selectAllNeeded}
                      className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="py-3 px-4">Medicine & Composition</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Alert Threshold</th>
                  <th className="py-3 px-3 font-bold text-purple-400">Suggested Order Qty</th>
                  <th className="py-3 px-3">Est. Rate</th>
                  <th className="py-3 px-3">Est. Total</th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {neededMedicinesList
                  .filter((item) =>
                    searchTerm
                      ? item.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase())
                      : true
                  )
                  .map((item) => {
                    const isSelected = selectedForPo.has(item.medicine.id);
                    return (
                      <tr
                        key={item.medicine.id}
                        className={`hover:bg-slate-800/40 transition ${
                          isSelected ? 'bg-purple-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPo(item.medicine.id)}
                            className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{item.medicine.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.medicine.genericName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Pack: {item.medicine.packSize} • {item.medicine.manufacturer}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {item.medicine.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-bold ${
                              item.stock === 0 ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            {item.stock} units
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {item.minAlert} units
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-purple-300 text-sm">
                          +{item.suggestedQty}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          ₹{item.medicine.purchasePrice || Math.round(item.medicine.mrp * 0.75)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          ₹{item.estimatedCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.urgency === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : item.urgency === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                            }`}
                          >
                            {item.urgency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (onQuickRestock) {
                                onQuickRestock(item.medicine.id, item.suggestedQty);
                                setActionSuccessNotice(
                                  `Restocked +${item.suggestedQty} units of ${item.medicine.name}!`
                                );
                                setTimeout(() => setActionSuccessNotice(null), 3000);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-bold rounded-lg border border-emerald-500/30 transition cursor-pointer"
                          >
                            + Restock {item.suggestedQty}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: OUT OF STOCK CATEGORY */}
      {activeCategory === 'OUT_OF_STOCK' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="text-rose-400">Out of Stock Medicines (0 Units Available)</span>
                <span className="text-xs font-normal text-slate-400">
                  ({outOfStockList.length} items)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Patients arriving with prescriptions for these items will bounce. Reorder immediately.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {outOfStockList
              .filter((i) =>
                searchTerm
                  ? i.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    i.medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase())
                  : true
              )
              .map(({ medicine, minAlert }) => (
                <div
                  key={medicine.id}
                  className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{medicine.name}</h4>
                        <p className="text-xs text-slate-400">{medicine.genericName}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        0 IN STOCK
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Pack / Form:</span>
                        <span className="text-slate-300 font-semibold">{medicine.packSize} ({medicine.type})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Minimum Safety Alert:</span>
                        <span className="font-mono text-slate-300">{minAlert} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retail MRP:</span>
                        <span className="font-mono font-bold text-emerald-400">₹{medicine.mrp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{medicine.manufacturer}</span>
                    <button
                      onClick={() => {
                        if (onQuickRestock) {
                          onQuickRestock(medicine.id, minAlert * 2);
                          setActionSuccessNotice(`Restocked +${minAlert * 2} units of ${medicine.name}!`);
                          setTimeout(() => setActionSuccessNotice(null), 3000);
                        }
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition"
                    >
                      Emergency Restock (+{minAlert * 2})
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 3: LOW STOCK CATEGORY */}
      {activeCategory === 'LOW_STOCK' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="text-amber-400">Low Stock Formulations</span>
                <span className="text-xs font-normal text-slate-400">
                  ({lowStockList.length} medicines below safety buffer)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Stock is active but has breached the minimum threshold configured for the pharmacy.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 font-bold text-amber-400">Current Stock</th>
                  <th className="py-3 px-3">Alert Threshold</th>
                  <th className="py-3 px-3">Shortfall</th>
                  <th className="py-3 px-3">MRP</th>
                  <th className="py-3 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lowStockList
                  .filter((i) =>
                    searchTerm
                      ? i.medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        i.medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase())
                      : true
                  )
                  .map(({ medicine, stock, minAlert }) => (
                    <tr key={medicine.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{medicine.name}</div>
                        <div className="text-[11px] text-slate-400">{medicine.genericName}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {medicine.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {stock} units
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {minAlert} units
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-400">
                        -{minAlert - stock} units
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        ₹{medicine.mrp}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (onQuickRestock) {
                              onQuickRestock(medicine.id, minAlert * 2 - stock);
                              setActionSuccessNotice(`Restocked ${medicine.name}!`);
                              setTimeout(() => setActionSuccessNotice(null), 3000);
                            }
                          }}
                          className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white text-xs font-bold rounded-lg border border-amber-500/30 transition"
                        >
                          + Restock {minAlert * 2 - stock}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: EXPIRY RISK & FEFO CATEGORY */}
      {activeCategory === 'EXPIRY_RISK' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="text-orange-400">Expiry Risk & FEFO Dispensing Monitor</span>
                <span className="text-xs font-normal text-slate-400">
                  ({expiredBatchesList.length} expired, {nearExpiryBatchesList.length} near expiry)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Expired batches must be segregated into the quarantine rejection bin. Near-expiry batches must be dispensed First-Expiry-First-Out.
              </p>
            </div>

            {/* Sub-filter pills */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedExpiryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedExpiryFilter === 'ALL'
                    ? 'bg-orange-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({expiredBatchesList.length + nearExpiryBatchesList.length})
              </button>
              <button
                onClick={() => setSelectedExpiryFilter('EXPIRED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedExpiryFilter === 'EXPIRED'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Expired ({expiredBatchesList.length})
              </button>
              <button
                onClick={() => setSelectedExpiryFilter('NEAR_EXPIRY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedExpiryFilter === 'NEAR_EXPIRY'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Near Expiry ({nearExpiryBatchesList.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Days Left</th>
                  <th className="py-3 px-3">Remaining Stock</th>
                  <th className="py-3 px-3">Capital at Risk</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Clinical Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...expiredBatchesList, ...nearExpiryBatchesList]
                  .filter((item) => {
                    if (selectedExpiryFilter === 'EXPIRED') return item.isExpired;
                    if (selectedExpiryFilter === 'NEAR_EXPIRY') return !item.isExpired;
                    return true;
                  })
                  .filter((item) =>
                    searchTerm
                      ? item.medicine?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
                      : true
                  )
                  .map(({ batch, medicine, daysRemaining, isExpired, value }) => (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isExpired ? 'bg-rose-950/15' : 'bg-amber-950/10'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-white">
                        {medicine ? medicine.name : 'Unknown Medicine'}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                        {batch.batchNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {batch.expiryDate}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {isExpired ? (
                          <span className="text-rose-400">
                            EXPIRED ({Math.abs(daysRemaining)}d ago)
                          </span>
                        ) : (
                          <span className="text-amber-300">{daysRemaining} days</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {batch.quantity} units
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-orange-300">
                        ₹{value.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isExpired
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isExpired ? 'QUARANTINE' : 'FEFO PRIORITY'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isExpired ? (
                          <span className="text-[11px] font-bold text-rose-400">
                            Block Dispensing & Return to Supplier
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-300">
                            Dispense Older Batch First
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: DEEP AI STRATEGIC ADVICE */}
      {activeCategory === 'AI_ADVICE' && aiReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Gemini AI Clinical & Supply-Chain Audit Report
              </h3>
              <p className="text-xs text-slate-400">
                AI diagnosis generated from live inventory stock level, movement velocities, and seasonal disease epidemiology.
              </p>
            </div>
          </div>

          {/* Executive Summary */}
          {aiReport.executiveSummary && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                Executive Synthesis
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {aiReport.executiveSummary}
              </p>
            </div>
          )}

          {/* Top Urgent Actions */}
          {Array.isArray(aiReport.topUrgentActions) && aiReport.topUrgentActions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Priority Immediate Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {aiReport.topUrgentActions.map((action: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start space-x-2.5 text-xs text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal Epidemiological Advice */}
          {aiReport.seasonalAdvice && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <Info className="w-4 h-4" />
                <span>Seasonal Clinical Disease Forecast & Demand Alert</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {aiReport.seasonalAdvice}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
