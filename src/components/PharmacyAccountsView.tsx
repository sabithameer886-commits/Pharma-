import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Calendar,
  Wallet,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Truck,
  Layers,
  ChevronRight,
  Check,
  Search,
  Percent,
  Sparkles,
} from 'lucide-react';
import {
  Medicine,
  Supplier,
  Batch,
  ScannedBillRecord,
  CustomerSale,
} from '../types';

interface PharmacyAccountsViewProps {
  medicines: Medicine[];
  suppliers: Supplier[];
  batches: Batch[];
  bills: ScannedBillRecord[];
  sales: CustomerSale[];
  storeName?: string;
  onUpdateSupplierPayment?: (
    billId: string,
    additionalPaid: number,
    paymentMode: string,
    notes?: string
  ) => void;
  onNavigateTab: (tab: any) => void;
}

export const PharmacyAccountsView: React.FC<PharmacyAccountsViewProps> = ({
  medicines,
  suppliers,
  batches,
  bills,
  sales,
  storeName = 'Sadi Medical',
  onUpdateSupplierPayment,
  onNavigateTab,
}) => {
  // Time period filter
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'SUPPLIER_DUES' | 'PROFIT_ANALYSIS' | 'DELIVERY'>('OVERVIEW');

  // Supplier Payment Modal
  const [settleBill, setSettleBill] = useState<ScannedBillRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMode, setSettleMode] = useState<string>('BANK_TRANSFER');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [showSettleSuccess, setShowSettleSuccess] = useState(false);

  // Search in dues & profits
  const [searchTerm, setSearchTerm] = useState('');

  // Date filtering logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filterItemDate = (dateStr: string) => {
    if (timeFilter === 'ALL') return true;
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (timeFilter === 'TODAY') return dateStr.startsWith(todayStr);
    if (timeFilter === '7DAYS') return d >= sevenDaysAgo;
    if (timeFilter === '30DAYS') return d >= thirtyDaysAgo;
    return true;
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => filterItemDate(s.date));
  }, [sales, timeFilter]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => filterItemDate(b.invoiceDate || b.uploadedDate));
  }, [bills, timeFilter]);

  // 1. TOTAL MONEY (Total Customer Sales + Revenue)
  const totalMoneyCollected = useMemo(() => {
    return Math.round(filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0) * 100) / 100;
  }, [filteredSales]);

  // Payment Breakdown
  const cashCollected = useMemo(() => {
    return Math.round(filteredSales.filter((s) => s.paymentMethod === 'CASH').reduce((sum, s) => sum + (s.grandTotal || 0), 0) * 100) / 100;
  }, [filteredSales]);

  const upiCollected = useMemo(() => {
    return Math.round(filteredSales.filter((s) => s.paymentMethod === 'UPI').reduce((sum, s) => sum + (s.grandTotal || 0), 0) * 100) / 100;
  }, [filteredSales]);

  const cardCollected = useMemo(() => {
    return Math.round(filteredSales.filter((s) => s.paymentMethod === 'CARD').reduce((sum, s) => sum + (s.grandTotal || 0), 0) * 100) / 100;
  }, [filteredSales]);

  const deliveryRevenue = useMemo(() => {
    return Math.round(filteredSales.reduce((sum, s) => sum + (s.deliveryCharge || 0), 0) * 100) / 100;
  }, [filteredSales]);

  // 2. HOW MANY STOCK SUPPLIED (Total stock/packs received/inwarded from supplier bills)
  const totalStockSupplied = useMemo(() => {
    return filteredBills.reduce((sum, b) => sum + (b.totalUnitsCount || 0), 0);
  }, [filteredBills]);

  const totalWholesaleSpend = useMemo(() => {
    return Math.round(filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0) * 100) / 100;
  }, [filteredBills]);

  // 3. SUPPLIER MONEY PENDING & SUPPLIER MONEY PAID
  const { totalSupplierPaid, totalSupplierPending } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    filteredBills.forEach((b) => {
      const billTotal = b.totalAmount || 0;
      const billPaid = b.amountPaidToSupplier !== undefined ? b.amountPaidToSupplier : billTotal;
      const billPending = b.balancePendingToSupplier !== undefined ? b.balancePendingToSupplier : Math.max(0, billTotal - billPaid);
      paid += billPaid;
      pending += billPending;
    });
    return {
      totalSupplierPaid: Math.round(paid * 100) / 100,
      totalSupplierPending: Math.round(pending * 100) / 100,
    };
  }, [filteredBills]);

  // 4. HOW MANY PROFIT GET (Gross Profit: Customer Selling Revenue - Supplier Purchase Cost of Dispensed Medicines)
  // Map batch purchase price for each batch
  const batchCostMap = useMemo(() => {
    const map = new Map<string, number>();
    batches.forEach((b) => {
      map.set(b.id, b.purchasePrice || 0);
    });
    return map;
  }, [batches]);

  const medicineCostMap = useMemo(() => {
    const map = new Map<string, number>();
    medicines.forEach((m) => {
      map.set(m.id, m.purchasePrice || (m.mrp ? m.mrp * 0.75 : 0));
    });
    return map;
  }, [medicines]);

  const { totalProfitGet, totalCostOfGoodsSold, profitMarginPercent, profitByMedicineList } = useMemo(() => {
    let totalCost = 0;
    let totalRevenue = 0;

    const medMap = new Map<string, {
      name: string;
      unitsSold: number;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const lineRev = item.lineTotal || 0;
        totalRevenue += lineRev;

        // Resolve cost per unit
        let costPerUnit = 0;
        if (item.batchId && batchCostMap.has(item.batchId)) {
          costPerUnit = batchCostMap.get(item.batchId) || 0;
        } else if (item.medicineId && medicineCostMap.has(item.medicineId)) {
          costPerUnit = medicineCostMap.get(item.medicineId) || 0;
        } else {
          costPerUnit = item.unitPrice ? item.unitPrice * 0.75 : 0;
        }

        // If loose tablets, scale cost proportionally
        const deductionPacks = item.equivalentPackDeduction !== undefined
          ? item.equivalentPackDeduction
          : item.saleUnit === 'TABLET'
          ? item.quantity / (item.tabletsPerPack || 10)
          : item.quantity;

        const lineCost = Math.round(costPerUnit * deductionPacks * 100) / 100;
        totalCost += lineCost;

        // Aggregate by medicine name
        const medKey = item.medicineName.trim().toUpperCase();
        const existing = medMap.get(medKey) || {
          name: item.medicineName,
          unitsSold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };

        existing.unitsSold += item.quantity;
        existing.revenue = Math.round((existing.revenue + lineRev) * 100) / 100;
        existing.cost = Math.round((existing.cost + lineCost) * 100) / 100;
        existing.profit = Math.round((existing.revenue - existing.cost) * 100) / 100;
        medMap.set(medKey, existing);
      });
    });

    const netProfit = Math.round((totalRevenue - totalCost) * 100) / 100;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

    const sortedList = Array.from(medMap.values()).sort((a, b) => b.profit - a.profit);

    return {
      totalProfitGet: netProfit,
      totalCostOfGoodsSold: Math.round(totalCost * 100) / 100,
      profitMarginPercent: margin,
      profitByMedicineList: sortedList,
    };
  }, [filteredSales, batchCostMap, medicineCostMap]);

  // Delivery stats
  const deliveryStats = useMemo(() => {
    const deliverySales = filteredSales.filter((s) => s.deliveryType === 'HOME_DELIVERY');
    const freeCount = deliverySales.filter((s) => (s.deliveryCharge || 0) === 0).length;
    const chargedCount = deliverySales.filter((s) => (s.deliveryCharge || 0) > 0).length;
    return {
      totalDeliveries: deliverySales.length,
      freeDeliveriesCount: freeCount,
      chargedDeliveriesCount: chargedCount,
      totalDeliveryChargesCollected: deliveryRevenue,
    };
  }, [filteredSales, deliveryRevenue]);

  // Open Settle Supplier Modal
  const handleOpenSettle = (bill: ScannedBillRecord) => {
    const pending = bill.balancePendingToSupplier !== undefined
      ? bill.balancePendingToSupplier
      : Math.max(0, bill.totalAmount - (bill.amountPaidToSupplier || 0));
    setSettleBill(bill);
    setSettleAmount(pending);
    setSettleMode('BANK_TRANSFER');
    setSettleNotes(`Settlement payment for Bill #${bill.invoiceNumber}`);
  };

  // Submit Supplier Payment
  const handleConfirmSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBill || !onUpdateSupplierPayment) return;
    const payment = Math.min(settleAmount, settleBill.balancePendingToSupplier ?? settleBill.totalAmount);
    if (payment <= 0) return;

    onUpdateSupplierPayment(settleBill.id, payment, settleMode, settleNotes);
    setShowSettleSuccess(true);
    setTimeout(() => {
      setShowSettleSuccess(false);
      setSettleBill(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 pt-2 pb-12">
      {/* Top Header & Time Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Pharmacy Accounts & Financial Overview
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {storeName}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Track Total Revenue, Stock Supplied, Real Gross Profit, and Pending Supplier Dues.
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
          <button
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All-Time
          </button>
          <button
            onClick={() => setTimeFilter('TODAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeFilter === 'TODAY'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('7DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeFilter === '7DAYS'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('30DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeFilter === '30DAYS'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 4 CORE EXECUTIVE METRICS REQUIRED BY USER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOTAL MONEY (Gross Revenue Collected) */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Money (Revenue)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              ₹{totalMoneyCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400 font-mono">
              <span>{filteredSales.length} Sales Bills</span>
              <span>•</span>
              <span className="text-emerald-400">₹{cashCollected} Cash</span>
              <span>•</span>
              <span className="text-teal-400">₹{upiCollected} UPI</span>
            </div>
          </div>
        </div>

        {/* 2. HOW MANY STOCK SUPPLIED */}
        <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Supplied
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-300 font-mono">
              {totalStockSupplied.toLocaleString()} <span className="text-base font-semibold text-slate-400">Packs</span>
            </div>
            <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400 font-mono">
              <span>{filteredBills.length} Inward Bills</span>
              <span>•</span>
              <span className="text-slate-300">Worth ₹{totalWholesaleSpend.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* 3. HOW MANY PROFIT GET */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden transition bg-gradient-to-br from-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Profit Get (Gross)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              ₹{totalProfitGet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center space-x-2 mt-2 text-[11px] text-emerald-300 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 font-bold">
                {profitMarginPercent}% Margin
              </span>
              <span>COGS: ₹{totalCostOfGoodsSold.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* 4. SUPPLIER MONEY PENDING */}
        <div className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Supplier Money Pending
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              totalSupplierPending > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black font-mono ${
              totalSupplierPending > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              ₹{totalSupplierPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400 font-mono">
              <span className="text-emerald-400">Paid: ₹{totalSupplierPaid.toLocaleString('en-IN')}</span>
              <span>•</span>
              <span className={totalSupplierPending > 0 ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                {totalSupplierPending > 0 ? 'Dues To Pay' : 'All Settled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Navigation between detailed ledgers */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'OVERVIEW'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Accounts Breakdown</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SUPPLIER_DUES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'SUPPLIER_DUES'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Supplier Pending Ledger</span>
          {totalSupplierPending > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ₹{totalSupplierPending.toFixed(0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('PROFIT_ANALYSIS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'PROFIT_ANALYSIS'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Profit by Medicine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('DELIVERY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'DELIVERY'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Home Delivery & Fees</span>
          {deliveryStats.totalDeliveries > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
              {deliveryStats.totalDeliveries}
            </span>
          )}
        </button>
      </div>

      {/* ---------------- SUB-TAB 1: OVERVIEW & CASH FLOW ---------------- */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Payment Method */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Customer Collection Breakdown</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300 font-sans font-semibold">Cash in Counter</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-sm">₹{cashCollected.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {totalMoneyCollected > 0 ? `${Math.round((cashCollected / totalMoneyCollected) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-teal-400" />
                  <span className="text-slate-300 font-sans font-semibold">UPI / QR Payment</span>
                </div>
                <div className="text-right">
                  <span className="text-teal-300 font-bold text-sm">₹{upiCollected.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {totalMoneyCollected > 0 ? `${Math.round((upiCollected / totalMoneyCollected) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300 font-sans font-semibold">Credit/Debit Card</span>
                </div>
                <div className="text-right">
                  <span className="text-purple-300 font-bold text-sm">₹{cardCollected.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {totalMoneyCollected > 0 ? `${Math.round((cardCollected / totalMoneyCollected) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300 font-sans font-semibold">Delivery Fees Earned</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-300 font-bold text-sm">₹{deliveryRevenue.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Service Fee</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Profit Margin & Cost Dynamics</span>
            </h3>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Customer Retail Billed:</span>
                <span className="text-white font-bold">₹{totalMoneyCollected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Cost of Goods Sold (Purchase):</span>
                <span className="text-rose-300">-₹{totalCostOfGoodsSold.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
                <span className="text-emerald-400">Net Profit Earned:</span>
                <span className="text-emerald-400 text-lg">₹{totalProfitGet.toFixed(2)}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Average Profit Margin:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {profitMarginPercent}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                Real-time margin calculated against exact batch purchase prices extracted from supplier tax invoices.
              </p>
            </div>
          </div>

          {/* Supplier Dues Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-rose-400" />
                <span>Supplier Balance Status</span>
              </h3>
              <button
                onClick={() => setActiveSubTab('SUPPLIER_DUES')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                View Ledger →
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Wholesale Bills:</span>
                <span className="text-white font-bold">₹{totalWholesaleSpend.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Total Amount Paid to Suppliers:</span>
                <span className="text-emerald-400 font-bold">₹{totalSupplierPaid.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
                <span className="text-rose-400">Balance Pending to Give:</span>
                <span className="text-rose-400 text-lg">₹{totalSupplierPending.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveSubTab('SUPPLIER_DUES')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer border border-emerald-500/20"
              >
                <span>Manage Supplier Payments & Settle Dues</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 2: SUPPLIER PENDING LEDGER & DUES ---------------- */}
      {activeSubTab === 'SUPPLIER_DUES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Supplier Payables & Invoiced Bills Ledger</span>
              </h3>
              <p className="text-xs text-slate-400">
                Review all supplier bills, payments made, and settle pending dues directly.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search supplier, bill #..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {filteredBills.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400">No supplier bills found in this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Invoice # & Date</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3 text-right">Invoice Amount</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance To Give</th>
                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {filteredBills
                    .filter((b) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      return b.invoiceNumber.toLowerCase().includes(q) || b.supplierName.toLowerCase().includes(q);
                    })
                    .map((bill) => {
                      const total = bill.totalAmount || 0;
                      const paid = bill.amountPaidToSupplier !== undefined ? bill.amountPaidToSupplier : total;
                      const pending = bill.balancePendingToSupplier !== undefined ? bill.balancePendingToSupplier : Math.max(0, total - paid);
                      const isFullPaid = pending <= 0;

                      return (
                        <tr key={bill.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">#{bill.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              {bill.invoiceDate || bill.uploadedDate}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className="font-semibold text-slate-200 block">{bill.supplierName}</span>
                            {bill.supplierPhone && (
                              <span className="text-[10px] text-slate-500 font-mono">📞 {bill.supplierPhone}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-white font-bold">
                            ₹{total.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                            ₹{paid.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-black ${pending > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              ₹{pending.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFullPaid
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : paid > 0
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isFullPaid ? 'PAID IN FULL' : paid > 0 ? 'PARTIAL' : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            {pending > 0 ? (
                              <button
                                onClick={() => handleOpenSettle(bill)}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow transition cursor-pointer"
                              >
                                Pay Due
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end space-x-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- SUB-TAB 3: PROFIT BY MEDICINE ---------------- */}
      {activeSubTab === 'PROFIT_ANALYSIS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Profit Breakdown by Medicine Dispensed</span>
              </h3>
              <p className="text-xs text-slate-400">
                Item-level retail selling revenue vs purchase wholesale cost.
              </p>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-slate-400 block">Total Profit:</span>
              <span className="text-emerald-400 font-extrabold text-base">₹{totalProfitGet.toFixed(2)}</span>
            </div>
          </div>

          {profitByMedicineList.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400">
                No customer medicine sales recorded yet. Once medicines are dispensed in the POS, their profit will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Medicine Name</th>
                    <th className="py-2.5 px-3 text-right">Units Dispensed</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3 text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                  {profitByMedicineList.map((item, idx) => {
                    const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 1000) / 10 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {item.unitsSold}
                        </td>
                        <td className="py-2.5 px-3 text-right text-white">
                          ₹{item.revenue.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          ₹{item.cost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          ₹{item.profit.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            margin >= 20
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- SUB-TAB 4: DELIVERY BREAKDOWN ---------------- */}
      {activeSubTab === 'DELIVERY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Home Delivery Logistics & Fee Collection</span>
              </h3>
              <p className="text-xs text-slate-400">
                Rule: Free within 3.0 km. Surcharge starts at ₹50 for 3.1 km + ₹10/km up to 12.0 km.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Deliveries</span>
              <span className="text-xl font-black text-white font-mono">{deliveryStats.totalDeliveries}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Free Deliveries (≤3 km)</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{deliveryStats.freeDeliveriesCount}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Charged Deliveries (&gt;3 km)</span>
              <span className="text-xl font-black text-teal-300 font-mono">{deliveryStats.chargedDeliveriesCount}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Delivery Revenue</span>
              <span className="text-xl font-black text-amber-300 font-mono">₹{deliveryStats.totalDeliveryChargesCollected.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery Pricing Policy Banner */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Current Delivery Zone Rules</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 font-mono">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">0 to 3.0 km</span>
                <span className="text-[11px] text-slate-400 font-sans">₹0 Free Home Delivery for customers</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-teal-300 font-bold block">3.1 to 4.0 km</span>
                <span className="text-[11px] text-slate-400 font-sans">₹50 Base Delivery Surcharge</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-amber-300 font-bold block">4.1 to 12.0 km</span>
                <span className="text-[11px] text-slate-400 font-sans">₹50 + ₹10 for every extra km (Max 12 km)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Supplier Payment Modal */}
      {settleBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-1">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Settle Payment to Supplier</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Record payment to {settleBill.supplierName} for Bill #{settleBill.invoiceNumber}.
            </p>

            {showSettleSuccess ? (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-200">
                  Payment of ₹{settleAmount} recorded successfully!
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmSettlePayment} className="space-y-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Bill Amount:</span>
                    <span className="text-white">₹{settleBill.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Already Paid:</span>
                    <span className="text-emerald-400">₹{(settleBill.amountPaidToSupplier || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                    <span>Balance Pending:</span>
                    <span>₹{(settleBill.balancePendingToSupplier ?? settleBill.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Amount to Give (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={settleBill.balancePendingToSupplier ?? settleBill.totalAmount}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none"
                  />
                  <div className="flex space-x-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSettleAmount(settleBill.balancePendingToSupplier ?? settleBill.totalAmount)}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono cursor-pointer"
                    >
                      Pay Full Due (₹{(settleBill.balancePendingToSupplier ?? settleBill.totalAmount).toFixed(2)})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={settleMode}
                    onChange={(e) => setSettleMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Notes / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="e.g. UTR #, Cheque #, or Receipt ref"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setSettleBill(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                  >
                    Confirm Supplier Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
