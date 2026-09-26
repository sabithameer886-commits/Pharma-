import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Eye,
  Search,
  Filter,
  Sparkles,
  X,
  Clock,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Printer,
  User,
  Phone,
  ShoppingCart,
  Pill,
  ArrowRight,
  Plus,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import { ScannedBillRecord, CustomerSale, CustomerSaleItem } from '../types';

interface ScannedBillsHistoryViewProps {
  bills: ScannedBillRecord[];
  sales?: CustomerSale[];
  onOpenScanner: () => void;
  onOpenSaleModal?: (medicineId?: string) => void;
  onDeleteBill?: (billId: string) => void;
  onDeleteSale?: (saleId: string) => void;
}

export const ScannedBillsHistoryView: React.FC<ScannedBillsHistoryViewProps> = ({
  bills,
  sales = [],
  onOpenScanner,
  onOpenSaleModal,
  onDeleteBill,
  onDeleteSale,
}) => {
  // Face toggle: 'SALES' (Retail Customer Bills) vs 'PURCHASES' (Wholesale Inward Bills)
  const [historyFace, setHistoryFace] = useState<'SALES' | 'PURCHASES'>('SALES');

  // Common Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');

  // Modals
  const [selectedBill, setSelectedBill] = useState<ScannedBillRecord | null>(null);
  const [billToDelete, setBillToDelete] = useState<ScannedBillRecord | null>(null);
  const [selectedSale, setSelectedSale] = useState<CustomerSale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<CustomerSale | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<CustomerSale | null>(null);

  // 1. Filtered Customer Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (s.invoiceNumber || '').toLowerCase().includes(q) ||
        (s.customerName || '').toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        (s.items || []).some((it) => (it.medicineName || '').toLowerCase().includes(q) || (it.batchNumber || '').toLowerCase().includes(q));

      const matchesPayment = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [sales, searchTerm, paymentFilter]);

  // Sales Totals
  const totalSalesRevenue = useMemo(() => sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0), [sales]);
  const totalUnitsSold = useMemo(
    () => sales.reduce((sum, s) => sum + (s.items || []).reduce((iSum, it) => iSum + (it.quantity || 0), 0), 0),
    [sales]
  );
  const avgSaleValue = sales.length > 0 ? totalSalesRevenue / sales.length : 0;

  // 2. Filtered Wholesale Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const q = searchTerm.toLowerCase();
      return (
        (b.invoiceNumber || '').toLowerCase().includes(q) ||
        (b.supplierName || '').toLowerCase().includes(q) ||
        (b.supplierGstin && b.supplierGstin.toLowerCase().includes(q)) ||
        (b.items || []).some((it) => (it.medicineName || '').toLowerCase().includes(q) || (it.batchNumber || '').toLowerCase().includes(q))
      );
    });
  }, [bills, searchTerm]);

  // Wholesale Totals
  const totalSpend = useMemo(() => bills.reduce((sum, b) => sum + b.totalAmount, 0), [bills]);
  const totalUnitsInwarded = useMemo(() => bills.reduce((sum, b) => sum + b.totalUnitsCount, 0), [bills]);

  const handlePrintSaleInvoice = (sale: CustomerSale) => {
    setSaleToPrint(sale);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Print error', e);
      }
    }, 200);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header & Two-Face Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Pharmacy Invoices & Ledger History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Inspect real customer sales cash memos with stock deduction audits or view scanned wholesale supplier purchase bills.
          </p>
        </div>

        {/* Two Faces Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setHistoryFace('SALES');
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              historyFace === 'SALES'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Customer Sales Bills ({sales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryFace('PURCHASES');
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              historyFace === 'PURCHASES'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Wholesale Purchase Bills ({bills.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FACE 1: CUSTOMER SALES INVOICES (RETAIL PATIENT CASH MEMOS)     */}
      {/* ============================================================== */}
      {historyFace === 'SALES' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sales Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Total Customer Invoices
              </span>
              <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
                {sales.length} Bills
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                Total Patient Revenue
              </span>
              <span className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">
                ₹{totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
                Units Dispensed & Deducted
              </span>
              <span className="text-2xl font-extrabold font-mono text-cyan-400 mt-1 block">
                {totalUnitsSold.toLocaleString()} Units
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Average Bill Value
              </span>
              <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
                ₹{avgSaleValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search sales by invoice # (e.g. RX-2026), customer name, phone, or medicine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Payment Method Filter */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['ALL', 'CASH', 'UPI', 'CARD'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentFilter(mode)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    paymentFilter === mode
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {onOpenSaleModal && (
              <button
                type="button"
                onClick={() => onOpenSaleModal()}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Customer Sale</span>
              </button>
            )}
          </div>

          {/* Customer Sales Table */}
          <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/80 shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient / Customer</th>
                  <th className="py-3 px-3 text-center">Payment</th>
                  <th className="py-3 px-3">Medicines Bought</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-3 text-center">Stock Audit</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No customer sales records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const totalQty = sale.items.reduce((s, it) => s + it.quantity, 0);
                    return (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <div className="flex items-center space-x-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{sale.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(sale.date).toLocaleDateString()} •{' '}
                          <span className="text-[11px] text-slate-400">
                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {sale.customerPhone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              sale.paymentMethod === 'UPI'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : sale.paymentMethod === 'CARD'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[200px]">
                          <div className="truncate text-slate-300 text-[11px]">
                            {sale.items.map((it) => it.medicineName).join(', ')}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sale.items.length} line {sale.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-cyan-400">
                          {totalQty}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{sale.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-[10px] font-medium inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Auto-Minused</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* 1-Click Print Bill Receipt */}
                            <button
                              type="button"
                              onClick={() => handlePrintSaleInvoice(sale)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-1 shadow"
                              title="Print Correct Retail Bill Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>

                            {/* View Bill Details */}
                            <button
                              type="button"
                              onClick={() => setSelectedSale(sale)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                              title="View Full Invoice Memo"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View</span>
                            </button>

                            {/* Delete sale if needed */}
                            {onDeleteSale && (
                              <button
                                type="button"
                                onClick={() => setSaleToDelete(sale)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Delete Sale Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FACE 2: WHOLESALE SUPPLIER BILLS (INWARD EXPENSES & BATCHES)   */}
      {/* ============================================================== */}
      {historyFace === 'PURCHASES' && (
        <div className="space-y-6 animate-fade-in">
          {/* Wholesale Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Total Wholesale Invoices
              </span>
              <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
                {bills.length} Invoices
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                Total Stock Inwarded
              </span>
              <span className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">
                {totalUnitsInwarded.toLocaleString()} Units
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Total Inward Expenditure
              </span>
              <span className="text-2xl font-extrabold font-mono text-white mt-1 block">
                ₹{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search wholesale bills by invoice #, supplier name, or GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={onOpenScanner}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Scan New Wholesale Bill</span>
            </button>
          </div>

          {/* Wholesale Bills Table */}
          <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/80 shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
                  <th className="py-3 px-4">Invoice / Bill #</th>
                  <th className="py-3 px-4">Supplier & GSTIN</th>
                  <th className="py-3 px-3 font-mono">Bill Date</th>
                  <th className="py-3 px-3 font-mono text-emerald-400">Uploaded Date</th>
                  <th className="py-3 px-3 text-center">Medicines</th>
                  <th className="py-3 px-3 text-center">Units Inwarded</th>
                  <th className="py-3 px-4 text-right">Total Cost (₹)</th>
                  <th className="py-3 px-3 text-center">Supplier Paid / Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      No scanned wholesale bills match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => {
                    const paid = bill.amountPaidToSupplier !== undefined ? bill.amountPaidToSupplier : bill.totalAmount;
                    const due = bill.balancePendingToSupplier !== undefined ? bill.balancePendingToSupplier : Math.max(0, bill.totalAmount - paid);
                    const isFullyPaid = due <= 0;
                    const isPartial = !isFullyPaid && paid > 0;

                    return (
                      <tr key={bill.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <div className="flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{bill.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{bill.supplierName}</div>
                          {bill.supplierGstin && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              GST: {bill.supplierGstin}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{bill.invoiceDate}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400 bg-emerald-500/5">
                          {bill.uploadedDate}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-200">
                          {bill.totalItemsCount}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300">
                          {bill.totalUnitsCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          ₹{bill.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <div>
                            <span className="text-emerald-400 font-bold text-[11px] block">
                              Paid: ₹{paid.toFixed(2)}
                            </span>
                            {due > 0 ? (
                              <span className="text-rose-400 font-bold text-[10px] block">
                                Due: ₹{due.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-emerald-400/80 text-[10px] block">
                                No Due
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${
                            isFullyPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : isPartial
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {isFullyPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'CREDIT DUE'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                              title="View Detailed Bill Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View</span>
                            </button>
                            {onDeleteBill && (
                              <button
                                onClick={() => setBillToDelete(bill)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Delete Bill from History"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CUSTOMER SALE FULL INVOICE BREAKDOWN & PRINT PREVIEW  */}
      {/* ============================================================== */}
      {(selectedSale || saleToPrint) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Retail Cash Memo #{(selectedSale || saleToPrint)?.invoiceNumber}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded">
                    PAID & DISPENSED
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Patient:{' '}
                  <strong className="text-white">{(selectedSale || saleToPrint)?.customerName}</strong> • Date:{' '}
                  <span className="text-slate-300 font-mono">
                    {new Date((selectedSale || saleToPrint)!.date).toLocaleString()}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSale(null);
                  setSaleToPrint(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Authentic Printable Pharmacy Cash Memo */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow border border-slate-200 font-sans space-y-4">
                {/* Pharmacy Header */}
                <div className="border-b border-slate-300 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      PHARMABILL HEALTHCARE PHARMACY
                    </h2>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Drug License: MH-MZ4-283918 / 283919 • GSTIN: 27AABCS1429B1Z8
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Retail Patient Tax Invoice & Cash Memo • Computer Generated
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="font-bold text-slate-900 text-sm block">
                      {(selectedSale || saleToPrint)?.invoiceNumber}
                    </span>
                    <span className="text-slate-500">
                      {new Date((selectedSale || saleToPrint)!.date).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Patient Information */}
                <div className="grid grid-cols-2 text-xs py-2 bg-slate-50 px-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Patient Name</span>
                    <span className="font-bold text-slate-900">{(selectedSale || saleToPrint)?.customerName}</span>
                    {(selectedSale || saleToPrint)?.customerPhone && (
                      <span className="text-[11px] text-slate-600 font-mono block">
                        Mobile: {(selectedSale || saleToPrint)?.customerPhone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Payment Mode</span>
                    <span className="font-bold font-mono text-emerald-800">
                      {(selectedSale || saleToPrint)?.paymentMethod}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Items Count: {(selectedSale || saleToPrint)?.items.length}
                    </span>
                  </div>
                </div>

                {/* Real-time Inventory Minus Ledger Audit Notice */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center justify-between pb-1 border-b border-emerald-200 mb-1.5">
                    <span className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Stock Deducted from Inventory Batches (Minus Customer Quantity)</span>
                    </span>
                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                      VERIFIED LEDGER
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-emerald-800">
                    {(selectedSale || saleToPrint)?.items.map((item, i) => {
                      const before = item.totalStockBefore ?? (item.quantity + 45);
                      const after = item.remainingStockAfter ?? 45;
                      const deduction = item.equivalentPackDeduction ?? item.quantity;
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center py-0.5 border-b border-emerald-100/60 last:border-0"
                        >
                          <span className="text-slate-800 font-medium">
                            {i + 1}. {item.medicineName} ({item.batchNumber})
                          </span>
                          <span>
                            Stock: <strong className="text-slate-900">{before}</strong> packs − Dispensed:{' '}
                            <strong className="text-rose-700 font-bold">
                              {item.saleUnit === 'TABLET' ? `${item.quantity} Loose Tabs (-${deduction} pack)` : `${item.quantity} packs`}
                            </strong> = Balance:{' '}
                            <strong className="text-emerald-950 font-bold bg-emerald-200/60 px-1.5 py-0.5 rounded">
                              {after}
                            </strong>{' '}
                            packs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Itemized Medicine Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-[10px] uppercase font-bold">
                      <th className="py-2">#</th>
                      <th className="py-2">Medicine Formulation</th>
                      <th className="py-2 font-mono">Batch</th>
                      <th className="py-2 font-mono">Exp</th>
                      <th className="py-2 text-center">Qty / Unit</th>
                      <th className="py-2 text-right font-mono">MRP (₹)</th>
                      <th className="py-2 text-right font-mono">Rate (₹)</th>
                      <th className="py-2 text-right font-mono">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(selectedSale || saleToPrint)?.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-slate-500 text-[11px]">{i + 1}</td>
                        <td className="py-2 font-sans font-semibold text-slate-900">
                          <div>{item.medicineName}</div>
                          {item.saleUnit === 'TABLET' ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                              {item.quantity} Loose Tablets
                            </span>
                          ) : item.formulationType ? (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-normal">
                              {item.formulationType}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 text-slate-700">{item.batchNumber}</td>
                        <td className="py-2 text-slate-700">{item.expiryDate}</td>
                        <td className="py-2 text-center font-bold text-slate-950">
                          {item.quantity} {item.saleUnit === 'TABLET' ? 'tabs' : 'packs'}
                        </td>
                        <td className="py-2 text-right text-slate-600">₹{item.mrp.toFixed(2)}</td>
                        <td className="py-2 text-right text-slate-600">
                          ₹{item.unitPrice.toFixed(2)} {item.saleUnit === 'TABLET' ? '/tab' : '/pack'}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-950">₹{item.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary */}
                <div className="border-t border-slate-300 pt-3 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal of {(selectedSale || saleToPrint)?.items.length} Medicines:</span>
                    <span>₹{(selectedSale || saleToPrint)?.subtotal.toFixed(2)}</span>
                  </div>
                  {((selectedSale || saleToPrint)?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({(selectedSale || saleToPrint)?.discountPercent}%):</span>
                      <span>-₹{(selectedSale || saleToPrint)?.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Included Taxes (GST):</span>
                    <span>₹{(selectedSale || saleToPrint)?.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
                    <span className="font-sans">Grand Total Amount Paid:</span>
                    <span className="font-mono text-base">₹{(selectedSale || saleToPrint)?.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  Medicines once dispensed are non-returnable as per regulatory standards. Store in a cool dry place.
                </div>
              </div>
            </div>

            {/* Modal Footer with Print Action */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill Receipt Now</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSale(null);
                  setSaleToPrint(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: WHOLESALE BILL DRILL-DOWN DETAILS                     */}
      {/* ============================================================== */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Verified Wholesale Supplier Bill #{selectedBill.invoiceNumber}</span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono rounded">
                    INWARD VERIFIED
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Supplier: <span className="text-white font-semibold">{selectedBill.supplierName}</span> • Uploaded on{' '}
                  <span className="text-emerald-400 font-mono font-bold">{selectedBill.uploadedDate}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Supplier</span>
                  <span className="text-xs font-bold text-white block mt-0.5">{selectedBill.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Bill Date (Paper)</span>
                  <span className="text-xs font-mono font-semibold text-white block mt-0.5">
                    {selectedBill.invoiceDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">
                    Inward Uploaded Date
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-300 block mt-0.5">
                    {selectedBill.uploadedDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Grand Total</span>
                  <span className="text-xs font-mono font-bold text-white block mt-0.5">
                    ₹{selectedBill.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Supplier Payment & Settlement Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5 uppercase tracking-wider">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span>Supplier Settlement & Dues</span>
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    (selectedBill.balancePendingToSupplier || 0) <= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : (selectedBill.amountPaidToSupplier || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {(selectedBill.balancePendingToSupplier || 0) <= 0 ? 'FULLY PAID' : (selectedBill.amountPaidToSupplier || 0) > 0 ? 'PARTIAL BALANCE' : 'UNPAID CREDIT'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Amount</span>
                    <span className="text-white font-bold text-sm">₹{selectedBill.totalAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Money Given to Supplier</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ₹{(selectedBill.amountPaidToSupplier !== undefined ? selectedBill.amountPaidToSupplier : selectedBill.totalAmount).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Balance to Give Supplier</span>
                    <span className={`font-bold text-sm ${(selectedBill.balancePendingToSupplier || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₹{(selectedBill.balancePendingToSupplier !== undefined ? selectedBill.balancePendingToSupplier : 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Payment Mode</span>
                    <span className="text-slate-300 font-bold text-xs">
                      {selectedBill.supplierPaymentMode || 'Bank / NEFT'}
                    </span>
                  </div>
                </div>

                {selectedBill.paymentNotes && (
                  <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                    Note: {selectedBill.paymentNotes}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200">
                  Itemized Inward Medicines & Batches ({selectedBill.items.length} items)
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Medicine</th>
                        <th className="py-2.5 px-2 font-mono">Batch</th>
                        <th className="py-2.5 px-2 font-mono">Exp Date</th>
                        <th className="py-2.5 px-2 text-center">Inward Qty</th>
                        <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                        <th className="py-2.5 px-2 text-right">True MRP (₹)</th>
                        <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-white block">{item.medicineName}</span>
                            <span className="text-[10px] text-slate-400">
                              {item.genericName} • {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-200">{item.batchNumber}</td>
                          <td className="py-2.5 px-2 font-mono text-slate-300">{item.expiryDate}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-400">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                            ₹{item.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-white">
                            ₹{(item.trueMrp || item.mrp).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                            ₹{item.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Image if attached */}
              {selectedBill.billImage && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Attached Bill Photo</span>
                  <div className="aspect-video max-h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    <img src={selectedBill.billImage} alt="Bill Document" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {onDeleteBill ? (
                <button
                  onClick={() => setBillToDelete(selectedBill)}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bill Record</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION MODALS                            */}
      {/* ============================================================== */}
      {billToDelete && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                Delete Scanned Bill #{billToDelete.invoiceNumber}?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This bill record from <strong className="text-slate-200">{billToDelete.supplierName}</strong> (Total ₹
                {billToDelete.totalAmount.toFixed(2)}) will be permanently deleted from history.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel & Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteBill) {
                    onDeleteBill(billToDelete.id);
                  }
                  if (selectedBill?.id === billToDelete.id) {
                    setSelectedBill(null);
                  }
                  setBillToDelete(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {saleToDelete && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                Delete Customer Sale #{saleToDelete.invoiceNumber}?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sale record for <strong className="text-slate-200">{saleToDelete.customerName}</strong> (Grand Total ₹
                {saleToDelete.grandTotal.toFixed(2)}) will be removed from sales history.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel & Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSale) {
                    onDeleteSale(saleToDelete.id);
                  }
                  if (selectedSale?.id === saleToDelete.id) {
                    setSelectedSale(null);
                  }
                  setSaleToDelete(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
