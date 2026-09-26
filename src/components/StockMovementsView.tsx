import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StockMovement } from '../types';

interface StockMovementsViewProps {
  movements: StockMovement[];
  onScanNewBill: () => void;
}

export const StockMovementsView: React.FC<StockMovementsViewProps> = ({
  movements,
  onScanNewBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMovements = movements.filter(
    (m) =>
      (m.medicineName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Dated Stock Ledger & Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable chronological audit log of all medicine stock inwarded from supplier wholesale bills.
          </p>
        </div>

        <button
          onClick={onScanNewBill}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Inward via Bill Scan</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter ledger by medicine, batch #, or invoice #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
        />
      </div>

      {/* Movements Table */}
      <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/80 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-300 font-bold text-[11px]">
              <th className="py-3 px-4 font-mono">Timestamp (Dated)</th>
              <th className="py-3 px-4">Medicine Item</th>
              <th className="py-3 px-3 font-mono">Batch #</th>
              <th className="py-3 px-3 text-center">Movement Type</th>
              <th className="py-3 px-3 text-center text-emerald-400">Inward Qty</th>
              <th className="py-3 px-3 font-mono">Bill / Ref #</th>
              <th className="py-3 px-4">Audit Observations & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No stock movements found.
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => {
                const ts = mov.timestamp || '';
                const datePart = ts.includes('T') ? ts.split('T')[0] : (ts.slice(0, 10) || '2026-09-22');
                const timePart = ts.includes('T') ? ts.split('T')[1] : '';
                const isSale = mov.type === 'SALE';

                return (
                  <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div className="font-bold text-white">{datePart}</div>
                      {timePart && (
                        <div className="text-[10px] text-slate-500">{timePart.slice(0, 5)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{mov.medicineName || '—'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">
                      {mov.batchNumber || '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isSale ? (
                        <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold rounded-full">
                          CUSTOMER SALE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                          PURCHASE INWARD
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-center font-mono font-bold ${
                      isSale ? 'text-amber-400 bg-amber-500/5' : 'text-emerald-400 bg-emerald-500/5'
                    }`}>
                      {isSale ? `-${(mov.quantity || 0).toLocaleString()}` : `+${(mov.quantity || 0).toLocaleString()}`}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-300">
                      {mov.referenceId ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>{mov.referenceId}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-xs">
                      {mov.notes}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
