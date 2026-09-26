import React from 'react';
import {
  FileScan,
  History,
  Pill,
  Building2,
  TrendingUp,
  PlusCircle,
  Calendar,
  Sparkles,
  ShoppingCart,
  BrainCircuit,
  LogOut,
  User,
  Crown,
  Users,
  DollarSign,
} from 'lucide-react';
import { UserRole } from '../types';

export type TabType =
  | 'scanner'
  | 'customer-purchase'
  | 'accounts'
  | 'history'
  | 'medicines'
  | 'ai-analysis'
  | 'suppliers'
  | 'movements';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewScan: () => void;
  onOpenCustomerSale?: () => void;
  onOpenRestock?: () => void;
  totalBillsCount: number;
  totalMedicinesCount: number;
  aiAlertsCount?: number;
  storeName: string;
  onUpdateStoreName: (name: string) => void;
  userEmail?: string;
  userPhone?: string;
  userRole?: UserRole;
  userName?: string;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewScan,
  onOpenCustomerSale,
  onOpenRestock,
  totalBillsCount,
  totalMedicinesCount,
  aiAlertsCount = 0,
  storeName,
  onUpdateStoreName,
  userEmail,
  userPhone,
  userRole = 'OWNER',
  userName,
  onSignOut,
  onOpenLogin,
}) => {
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Logo, Branding & Store Name Input directly below PharmaBill */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileScan className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center">
                  PharmaBill <span className="ml-1.5 text-emerald-400 font-mono text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">AI</span>
                </h1>
                <span className="hidden 2xl:inline-block text-[11px] font-medium text-slate-400 border-l border-slate-800 pl-2">
                  Medicine & Supplier Bill Scanner
                </span>
              </div>

              {/* Dedicated space for store name input (e.g. Sadi Medical) below PharmaBill */}
              <div className="flex items-center mt-0.5 space-x-1">
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Store:</span>
                <div className="relative flex items-center">
                  <Building2 className="w-3 h-3 text-emerald-400 absolute left-2 pointer-events-none" />
                  <input
                    id="header-store-name-input"
                    type="text"
                    value={storeName}
                    onChange={(e) => onUpdateStoreName(e.target.value)}
                    placeholder="e.g. Sadi Medical"
                    className="text-xs font-semibold text-emerald-300 bg-slate-950/70 hover:bg-slate-950 focus:bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-md pl-6 pr-2 py-0.5 focus:outline-none transition w-32 sm:w-40 placeholder:text-slate-500"
                    title="Store Name (e.g. Sadi Medical)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Full inline on large desktop (xl+) */}
          <nav className="hidden xl:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'scanner'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bill Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('customer-purchase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'customer-purchase'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Customer Purchase</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'accounts'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Accounts & Profit</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Bills History</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'history' ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {totalBillsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('medicines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'medicines'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medicines</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'medicines' ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {totalMedicinesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai-analysis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'ai-analysis'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Analysis</span>
              {aiAlertsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'ai-analysis'
                    ? 'bg-white text-purple-900'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {aiAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Suppliers</span>
            </button>

            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'movements'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Stock Ledger</span>
            </button>
          </nav>

          {/* Right Action & Dated Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Login Account Info */}
            {userEmail ? (
              <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                    userRole === 'OWNER'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-teal-500/20 text-teal-300'
                  }`}
                  title={userRole === 'OWNER' ? 'Store Owner' : 'Staff Pharmacist'}
                >
                  {userRole === 'OWNER' ? (
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-medium text-slate-200 truncate max-w-[120px]" title={userName || userEmail}>
                      {userName || userEmail.split('@')[0]}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold uppercase ${
                        userRole === 'OWNER'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {userRole}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono truncate max-w-[140px]">
                    {userPhone ? `📞 ${userPhone}` : userEmail}
                  </span>
                </div>
                {onOpenLogin && (
                  <button
                    onClick={onOpenLogin}
                    className="text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded text-[10px] hover:bg-slate-800 transition"
                    title="Switch user or store / Reset password"
                  >
                    Switch
                  </button>
                )}
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-slate-400 hover:text-rose-400 px-1.5 py-1 rounded hover:bg-slate-800 transition flex items-center space-x-1 cursor-pointer"
                    title="Log out of store"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden md:inline text-[11px] font-semibold text-rose-400">Logout</span>
                  </button>
                )}
              </div>
            ) : (
              onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )
            )}

            {/* Current Dated Indicator */}
            <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-slate-200">{todayFormatted}</span>
            </div>

            {/* AI Restock from Supplier Button */}
            {onOpenRestock && (
              <button
                type="button"
                onClick={onOpenRestock}
                className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-400/30 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transform active:scale-95"
                title="AI Restock from Supplier & Send WhatsApp Order"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">AI Restock</span>
              </button>
            )}

            {/* Customer POS Multi-Item Dispense Button */}
            {onOpenCustomerSale && (
              <button
                type="button"
                onClick={onOpenCustomerSale}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-sm transform active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Dispense</span>
              </button>
            )}

            <button
              onClick={onOpenNewScan}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/10 transition flex items-center space-x-1.5 transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Scan Bill</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Tabs (Shown on screens < xl) */}
        <div className="flex xl:hidden items-center space-x-1 py-1.5 overflow-x-auto border-t border-slate-800 touch-pan-x scrollbar-none">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'scanner' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('customer-purchase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'customer-purchase' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Customer Purchase</span>
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'accounts' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Accounts & Profit</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'history' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Bills ({totalBillsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'medicines' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicines ({totalMedicinesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-analysis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'ai-analysis' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>AI Analysis</span>
            {aiAlertsCount > 0 && (
              <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'ai-analysis' ? 'bg-white text-purple-900' : 'bg-purple-950 text-purple-200'
              }`}>
                {aiAlertsCount}
              </span>
            )}
          </button>
          {onOpenRestock && (
            <button
              onClick={onOpenRestock}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>AI Restock</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'suppliers' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Suppliers</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center space-x-1 ${
              activeTab === 'movements' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Stock Ledger</span>
          </button>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center space-x-1 bg-rose-950/40 text-rose-400 border border-rose-500/30 hover:bg-rose-950/60 transition"
              title="Log out of store"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
