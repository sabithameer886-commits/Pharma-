import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sliders,
  Bell,
  ChevronDown,
  ChevronUp,
  Pill,
  ArrowRight,
  Sparkles,
  Layers,
  FileScan,
  ShoppingCart,
  CheckCircle2,
  X
} from 'lucide-react';
import { Medicine, Batch } from '../types';

interface LowStockExpiryNotificationWidgetProps {
  medicines: Medicine[];
  batches: Batch[];
  stockThreshold: number;
  onThresholdChange: (newThreshold: number) => void;
  activeFilter: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED';
  onFilterChange: (filter: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED') => void;
  onScanNewBill: () => void;
  onOpenCustomerSale: (medicineId?: string) => void;
}

export const LowStockExpiryNotificationWidget: React.FC<LowStockExpiryNotificationWidgetProps> = ({
  medicines,
  batches,
  stockThreshold,
  onThresholdChange,
  activeFilter,
  onFilterChange,
  onScanNewBill,
  onOpenCustomerSale,
}) => {
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showThresholdControl, setShowThresholdControl] = useState(false);

  // Fast stock lookup map (O(1))
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) {
      map.set(b.medicineId, (map.get(b.medicineId) || 0) + b.quantity);
    }
    return map;
  }, [batches]);

  const today = useMemo(() => new Date('2026-09-22'), []);
  const todayTime = today.getTime();
  const thirtyDaysMs = 30 * 86400000;
  const sixtyDaysMs = 60 * 86400000;
  const ninetyDaysMs = 90 * 86400000;

  // Identify low stock medicines
  const lowStockMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const stock = stockMap.get(m.id) || 0;
      const effectiveThreshold = stockThreshold > 0 ? stockThreshold : (m.minStockAlert || 30);
      return stock <= effectiveThreshold;
    });
  }, [medicines, stockMap, stockThreshold]);

  // Identify out-of-stock medicines
  const outOfStockMedicines = useMemo(() => {
    return medicines.filter((m) => (stockMap.get(m.id) || 0) === 0);
  }, [medicines, stockMap]);

  // Identify expiring and expired batches
  const { expiredBatches, expiringSoonBatches } = useMemo(() => {
    const expired: Array<{ batch: Batch; medicine?: Medicine; daysRemaining: number }> = [];
    const expiringSoon: Array<{ batch: Batch; medicine?: Medicine; daysRemaining: number }> = [];

    const medMap = new Map<string, Medicine>();
    for (const m of medicines) {
      medMap.set(m.id, m);
    }

    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const expTime = new Date(b.expiryDate).getTime();
      const diffMs = expTime - todayTime;
      const daysRemaining = Math.floor(diffMs / 86400000);

      const item = {
        batch: b,
        medicine: medMap.get(b.medicineId),
        daysRemaining,
      };

      if (diffMs < 0) {
        expired.push(item);
      } else if (diffMs <= ninetyDaysMs) {
        expiringSoon.push(item);
      }
    }

    // Sort nearest expiry first
    expiringSoon.sort((a, b) => a.daysRemaining - b.daysRemaining);
    expired.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { expiredBatches: expired, expiringSoonBatches: expiringSoon };
  }, [batches, medicines, todayTime, ninetyDaysMs]);

  // Total critical alerts count
  const totalAlertsCount = lowStockMedicines.length + expiredBatches.length + expiringSoonBatches.length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Banner: Widget Title, Notification Bell & Threshold Slider Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Inventory Health, Low Stock & Expiry Monitor
              </h3>
              {totalAlertsCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold rounded-full animate-pulse">
                  {totalAlertsCount} Alerts Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Live batch quantity auditor detecting shortages below threshold (current: {stockThreshold} units) and upcoming shelf-life expiries.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Threshold Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowThresholdControl(!showThresholdControl)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
              showThresholdControl
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Threshold: {stockThreshold} Units</span>
            {showThresholdControl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Notifications Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
            className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
              showNotificationDrawer
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts Feed</span>
            {totalAlertsCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                showNotificationDrawer ? 'bg-slate-950 text-amber-300' : 'bg-amber-500 text-slate-950'
              }`}>
                {totalAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Threshold Slider */}
      {showThresholdControl && (
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <span>Global Low-Stock Warning Threshold:</span>
              <strong className="text-emerald-400 font-mono">{stockThreshold} units</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              Medicines with total batch stock &le; {stockThreshold} are flagged
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={stockThreshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex items-center space-x-1.5">
              {[15, 30, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onThresholdChange(val)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition ${
                    stockThreshold === val
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 Interactive KPI Cards with One-Click Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Low Stock Alert */}
        <div
          onClick={() => onFilterChange(activeFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
          className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
            activeFilter === 'LOW_STOCK'
              ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
              Low Stock Alert
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-mono text-white">
                {lowStockMedicines.length}
              </span>
              <span className="text-[11px] text-slate-400">items &le; {stockThreshold}</span>
            </div>
            <p className="text-[10px] text-amber-300/80 line-clamp-1 mt-0.5">
              {outOfStockMedicines.length > 0 ? `${outOfStockMedicines.length} completely depleted` : 'Needs replenishment'}
            </p>
          </div>
          <span className="text-[10px] font-semibold text-amber-400 flex items-center space-x-1 pt-1 border-t border-slate-800/80">
            <span>{activeFilter === 'LOW_STOCK' ? '✓ Filter Active' : 'Click to Highlight'}</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Metric 2: Expiring Soon (<90 Days) */}
        <div
          onClick={() => onFilterChange(activeFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
            activeFilter === 'EXPIRING'
              ? 'bg-sky-500/15 border-sky-500/60 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500/40'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-sky-400">
              Expiring Soon
            </span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-mono text-white">
                {expiringSoonBatches.length}
              </span>
              <span className="text-[11px] text-slate-400">batches &lt; 90 days</span>
            </div>
            <p className="text-[10px] text-sky-300/80 line-clamp-1 mt-0.5">
              FEFO priority for patient dispense
            </p>
          </div>
          <span className="text-[10px] font-semibold text-sky-400 flex items-center space-x-1 pt-1 border-t border-slate-800/80">
            <span>{activeFilter === 'EXPIRING' ? '✓ Filter Active' : 'Click to Highlight'}</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Metric 3: Expired Batches */}
        <div
          onClick={() => onFilterChange(activeFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
            activeFilter === 'EXPIRED'
              ? 'bg-rose-500/15 border-rose-500/60 shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/40'
              : 'bg-slate-950/60 border-slate-800/80 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-400">
              Expired Quarantine
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-mono text-white">
                {expiredBatches.length}
              </span>
              <span className="text-[11px] text-slate-400">past shelf date</span>
            </div>
            <p className="text-[10px] text-rose-300/80 line-clamp-1 mt-0.5">
              Remove from retail dispense
            </p>
          </div>
          <span className="text-[10px] font-semibold text-rose-400 flex items-center space-x-1 pt-1 border-t border-slate-800/80">
            <span>{activeFilter === 'EXPIRED' ? '✓ Filter Active' : 'Click to Highlight'}</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Metric 4: Quick Customer Sale Action */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
              Customer POS
            </span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Dispense & Minus Stock</span>
            <p className="text-[10px] text-emerald-300/80 line-clamp-1 mt-0.5">
              Live customer billing & FEFO deduction
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCustomerSale()}
            className="w-full py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold rounded-lg transition flex items-center justify-center space-x-1 shadow-sm"
          >
            <ShoppingCart className="w-3 h-3" />
            <span>Sell to Customer</span>
          </button>
        </div>
      </div>

      {/* Expandable Notification Drawer Feed */}
      {showNotificationDrawer && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Live Pharmacy Stock & Expiry Notifications
              </span>
              <span className="text-[10px] text-slate-400">
                ({totalAlertsCount} pending issues detected)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotificationDrawer(false)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {/* 1. Expired Items (Critical) */}
            {expiredBatches.map(({ batch, medicine, daysRemaining }) => (
              <div
                key={`exp-${batch.id}`}
                className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{medicine?.name || 'Medicine'}</span>
                      <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 font-mono text-[9px] font-bold rounded">
                        EXPIRED ({Math.abs(daysRemaining)} days ago)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Batch: {batch.batchNumber} • Expiry: {batch.expiryDate} • Remaining: {batch.quantity} units
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onScanNewBill}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg shrink-0 transition"
                >
                  Inward Replacement
                </button>
              </div>
            ))}

            {/* 2. Low Stock Alerts */}
            {lowStockMedicines.map((med) => {
              const stock = stockMap.get(med.id) || 0;
              return (
                <div
                  key={`low-${med.id}`}
                  className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-start space-x-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{med.name}</span>
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold rounded">
                          {stock === 0 ? 'OUT OF STOCK' : `ONLY ${stock} UNITS LEFT`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {med.genericName} • Threshold: {stockThreshold} units
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenCustomerSale(med.id)}
                      disabled={stock === 0}
                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 text-[10px] font-bold rounded-lg transition"
                    >
                      Sell
                    </button>
                    <button
                      type="button"
                      onClick={onScanNewBill}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold rounded-lg transition shadow-sm"
                    >
                      Restock Bill
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 3. Expiring Soon (<90 Days) */}
            {expiringSoonBatches.map(({ batch, medicine, daysRemaining }) => (
              <div
                key={`soon-${batch.id}`}
                className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{medicine?.name || 'Medicine'}</span>
                      <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 font-mono text-[9px] font-semibold rounded">
                        Expiring in {daysRemaining} days
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Batch: {batch.batchNumber} • Expiry: {batch.expiryDate} • Stock: {batch.quantity} units
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenCustomerSale(medicine?.id)}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold rounded-lg shrink-0 transition"
                >
                  Dispense FEFO
                </button>
              </div>
            ))}

            {totalAlertsCount === 0 && (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">All Stocks Healthy!</p>
                <p className="text-[11px] text-slate-500">
                  No medicines below {stockThreshold} units threshold or expiring within 90 days.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
