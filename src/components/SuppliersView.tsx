import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Search,
  Plus,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  CreditCard,
  FileCheck2,
  Star,
} from 'lucide-react';
import { Supplier, ScannedBillRecord } from '../types';

interface SuppliersViewProps {
  suppliers: Supplier[];
  bills: ScannedBillRecord[];
  onScanNewBill: () => void;
  onSaveSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  bills,
  onScanNewBill,
  onSaveSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formDlNumber, setFormDlNumber] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Credit 30 Days');
  const [formRating, setFormRating] = useState<number>(5);
  const [sortOrder, setSortOrder] = useState<'NAME_ASC' | 'NAME_DESC' | 'PURCHASES_HIGH' | 'RATING_HIGH'>('NAME_ASC');

  const filteredSuppliers = suppliers
    .filter(
      (s) =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.gstin && s.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      if (sortOrder === 'NAME_ASC') return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      if (sortOrder === 'NAME_DESC') return bName.localeCompare(aName, undefined, { sensitivity: 'base' });
      if (sortOrder === 'PURCHASES_HIGH') return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      if (sortOrder === 'RATING_HIGH') return (b.rating || 0) - (a.rating || 0);
      return aName.localeCompare(bName);
    });

  // Pre-calculate bills aggregation per supplier to prevent lagging
  const supplierBillsSummary = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number }>();
    for (const sup of suppliers) {
      const sNameLower = sup.name.toLowerCase();
      let count = 0;
      let totalAmount = 0;
      for (const b of bills) {
        if (
          b.supplierId === sup.id ||
          (b.supplierName && (b.supplierName.toLowerCase().includes(sNameLower) || sNameLower.includes(b.supplierName.toLowerCase())))
        ) {
          count++;
          totalAmount += b.totalAmount || 0;
        }
      }
      map.set(sup.id, { count, totalAmount });
    }
    return map;
  }, [suppliers, bills]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormContactPerson('');
    setFormGstin('27AABCS' + Math.floor(1000 + Math.random() * 9000) + 'B1Z8');
    setFormDlNumber('DL-MH-' + Math.floor(100000 + Math.random() * 900000));
    setFormPhone('+91 ');
    setFormEmail('');
    setFormAddress('');
    setFormPaymentTerms('Credit 30 Days');
    setFormRating(5);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormName(supplier.name);
    setFormContactPerson(supplier.contactPerson || '');
    setFormGstin(supplier.gstin || '');
    setFormDlNumber(supplier.dlNumber || '');
    setFormPhone(supplier.phone || '');
    setFormEmail(supplier.email || '');
    setFormAddress(supplier.address || '');
    setFormPaymentTerms(supplier.paymentTerms || 'Credit 30 Days');
    setFormRating(supplier.rating || 5);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter supplier name');
      return;
    }

    const supplierToSave: Supplier = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      name: formName.trim(),
      contactPerson: formContactPerson.trim() || undefined,
      gstin: formGstin.trim().toUpperCase() || undefined,
      dlNumber: formDlNumber.trim().toUpperCase() || undefined,
      phone: formPhone.trim() || '+91 98200 00000',
      email: formEmail.trim() || 'orders@pharmawholesaler.com',
      address: formAddress.trim() || 'Pharma Wholesale Hub, India',
      paymentTerms: formPaymentTerms.trim(),
      totalPurchases: editingSupplier ? editingSupplier.totalPurchases : 0,
      rating: formRating,
    };

    if (onSaveSupplier) {
      onSaveSupplier(supplierToSave);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (onDeleteSupplier) {
      onDeleteSupplier(id);
    }
    setSupplierToDelete(null);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span>Pharma Wholesale Suppliers & Distributors</span>
          </h2>
          <p className="text-xs text-slate-400">
            Manage your registered wholesale C&F distributors, drug licenses, GSTIN credentials, and payment terms.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>

          <button
            type="button"
            onClick={onScanNewBill}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Inward Bill from Supplier</span>
          </button>
        </div>
      </div>

      {/* Search & Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact person, GSTIN, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-emerald-500 outline-none"
          >
            <option value="NAME_ASC">Name (A → Z)</option>
            <option value="NAME_DESC">Name (Z → A)</option>
            <option value="PURCHASES_HIGH">Total Purchases (High → Low)</option>
            <option value="RATING_HIGH">Rating (Highest First)</option>
          </select>
          <span className="text-xs text-slate-400 font-mono pl-2 border-l border-slate-800">
            {filteredSuppliers.length} suppliers
          </span>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredSuppliers.map((supplier) => {
          const summary = supplierBillsSummary.get(supplier.id) || { count: 0, totalAmount: 0 };
          const billsCount = summary.count;
          const totalInvoicesValue = summary.totalAmount;

          return (
            <div
              key={supplier.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-white truncate" title={supplier.name}>
                      {supplier.name}
                    </h3>
                    {supplier.contactPerson && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{supplier.contactPerson}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      title="Edit Supplier Details"
                      onClick={() => handleOpenEditModal(supplier)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteSupplier && (
                      <button
                        type="button"
                        title="Delete Supplier"
                        onClick={() => setSupplierToDelete(supplier.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* GSTIN & Drug License */}
                <div className="mt-3 space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                      <FileCheck2 className="w-3 h-3 text-emerald-400" />
                      <span>GSTIN:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {supplier.gstin || '27AABCS1429B1Z8'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-slate-400">Drug License:</span>
                    <span className="font-mono text-slate-300">
                      {supplier.dlNumber || 'MH-MZ4-283918'}
                    </span>
                  </div>
                  {supplier.paymentTerms && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                      <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                        <CreditCard className="w-3 h-3 text-cyan-400" />
                        <span>Terms:</span>
                      </span>
                      <span className="font-medium text-cyan-300 text-[11px]">
                        {supplier.paymentTerms}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact details */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-400 truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-slate-400 line-clamp-2">{supplier.address}</span>
                  </div>
                </div>
              </div>

              {/* Inward Activity stats & Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">
                    Scanned Bills
                  </span>
                  <span className="text-xs font-bold font-mono text-white">
                    {billsCount} Invoices
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">
                    Total Purchases
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    ₹{Math.max(supplier.totalPurchases, totalInvoicesValue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{editingSupplier ? 'Edit Supplier Details' : 'Add New Pharma Supplier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Supplier / C&F Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sun Pharmaceutical Distributors Ltd."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Ramesh Shah (Manager)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98200 11223"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                    placeholder="27AABCS1429B1Z8"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Drug License (DL #)
                  </label>
                  <input
                    type="text"
                    value={formDlNumber}
                    onChange={(e) => setFormDlNumber(e.target.value)}
                    placeholder="MH-MZ4-283918"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="orders@supplier.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="Credit 30 Days">Credit 30 Days</option>
                    <option value="Credit 21 Days">Credit 21 Days</option>
                    <option value="Credit 15 Days">Credit 15 Days</option>
                    <option value="Credit 7 Days">Credit 7 Days</option>
                    <option value="Immediate / Cash">Immediate / Cash</option>
                    <option value="Advance Payment">Advance Payment</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Warehouse / Office Address
                  </label>
                  <textarea
                    rows={2}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Plot 42, Pharma Industrial Estate, Mumbai 400072"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingSupplier ? 'Save Changes' : 'Register Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Delete Supplier?</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove this supplier from your directory? Historical bills and inward batches will still remain safely recorded.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(supplierToDelete)}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
