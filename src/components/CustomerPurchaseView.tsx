import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Pill,
  Search,
  Building2,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  Printer,
  Receipt,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Filter,
  Sparkles,
  ArrowDownAZ,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Store,
  Boxes,
  Activity,
  Truck,
  MapPin,
  Navigation,
} from 'lucide-react';
import { calculatePharmacyDeliveryFee } from '../utils/deliveryCalculator';
import {
  Medicine,
  Batch,
  Supplier,
  CustomerSale,
  CustomerSaleItem,
  MedicineType,
} from '../types';

interface CustomerPurchaseViewProps {
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  storeName: string;
  onCompleteSale: (sale: CustomerSale) => void;
  onNavigateTab: (tab: any) => void;
  onQuickCreateBatch?: (medicineId: string, quantity?: number, mrp?: number) => void;
}

interface CartItemDraft {
  cartItemId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  packSize: string;
  type: MedicineType;
  image?: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  supplierName: string;
  balanceStock: number; // Balance stock currently available in this batch
  totalMedStock: number; // Balance stock total for this medicine
  quantity: number; // Quantity customer wants to purchase (tablets count if TABLET, packs if PACK)
  unitPrice: number;
  mrp: number;
  gstPercent: number;
  lineTotal: number;
  saleUnit: 'TABLET' | 'PACK';
  tabletsPerPack: number;
  unitLabel: string;
  equivalentPackDeduction: number;
}

const ITEMS_PER_PAGE = 20;
const ALPHABET_LIST = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export const CustomerPurchaseView: React.FC<CustomerPurchaseViewProps> = ({
  medicines,
  batches,
  suppliers,
  storeName,
  onCompleteSale,
  onNavigateTab,
  onQuickCreateBatch,
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Per-medicine quick purchase quantity & unit selector in the table
  const [itemQuantities, setItemQuantities] = useState<{ [medId: string]: number }>({});
  const [itemUnits, setItemUnits] = useState<{ [medId: string]: 'TABLET' | 'PACK' }>({});

  // Active Customer Cart / Purchase Form
  const [cart, setCart] = useState<CartItemDraft[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');

  // Delivery states
  const [deliveryType, setDeliveryType] = useState<'COUNTER_PICKUP' | 'HOME_DELIVERY'>('COUNTER_PICKUP');
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(2.5);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Customer Cash tender & balance states
  const [amountCustomerPaid, setAmountCustomerPaid] = useState<number>(0);

  // Helper functions for tablet parsing
  const getTabletsPerPack = (med: Medicine): number => {
    const match = String(med.packSize || '').match(/(\d+)\s*(?:tabs?|tablets?|caps?|'s|\/)/i);
    return match ? Math.max(1, parseInt(match[1], 10)) : 10;
  };

  const isTabletOrCapsule = (med: Medicine): boolean => {
    return (
      med.type === 'Tablet' ||
      med.type === 'Capsule' ||
      /tabs?|tablets?|caps?|strip/i.test(med.packSize || '')
    );
  };

  // Completed Sale & Receipt view
  const [completedSale, setCompletedSale] = useState<CustomerSale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Precompute stock map & batch mapping for ultra-fast lookup
  const stockByMedId = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches) {
      if (b.quantity > 0) {
        map.set(b.medicineId, (map.get(b.medicineId) || 0) + b.quantity);
      }
    }
    return map;
  }, [batches]);

  // Precompute primary batch & supplier info for each medicine in O(N) linear time
  const medBatchSupplierMap = useMemo(() => {
    // 1. Group batches by medicineId once in a single pass O(batches.length)
    const batchesByMedId = new Map<string, Batch[]>();
    for (const b of batches) {
      const list = batchesByMedId.get(b.medicineId);
      if (list) {
        list.push(b);
      } else {
        batchesByMedId.set(b.medicineId, [b]);
      }
    }

    // 2. Index suppliers by ID for O(1) lookup
    const suppliersById = new Map<string, Supplier>();
    for (const s of suppliers) {
      suppliersById.set(s.id, s);
    }

    const map = new Map<
      string,
      {
        primaryBatch?: Batch;
        activeBatches: Batch[];
        supplierName: string;
        batchNumber: string;
        expiryDate: string;
        allSuppliers: string[];
      }
    >();

    for (const med of medicines) {
      const allMedBatches = batchesByMedId.get(med.id) || [];
      const medBatches = allMedBatches
        .filter((b) => b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      const activeBatch = medBatches[0] || allMedBatches[0];

      // Resolve supplier name: from batch, or preferredSupplierId, or default
      let supName = activeBatch?.supplierName;
      if (!supName && med.preferredSupplierId) {
        const found = suppliersById.get(med.preferredSupplierId);
        if (found) supName = found.name;
      }
      if (!supName) {
        supName = 'Registered Pharma Distributor';
      }

      const allSups = Array.from(
        new Set(
          allMedBatches
            .map((b) => b.supplierName)
            .filter((name) => name && name.trim().length > 0)
        )
      );

      map.set(med.id, {
        primaryBatch: activeBatch,
        activeBatches: medBatches,
        supplierName: supName,
        batchNumber: activeBatch?.batchNumber || 'BN-STD-01',
        expiryDate: activeBatch?.expiryDate || '2028-12-31',
        allSuppliers: allSups.length > 0 ? allSups : [supName],
      });
    }

    return map;
  }, [medicines, batches, suppliers]);

  // Extract unique supplier names for filter dropdown
  const uniqueSupplierNames = useMemo(() => {
    const names = new Set<string>();
    suppliers.forEach((s) => {
      if (s.name) names.add(s.name.trim());
    });
    batches.forEach((b) => {
      if (b.supplierName) names.add(b.supplierName.trim());
    });
    return Array.from(names).sort();
  }, [suppliers, batches]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      // Letter filter
      if (selectedLetter !== 'ALL') {
        if (!med.name.toUpperCase().startsWith(selectedLetter)) {
          return false;
        }
      }

      // In stock filter
      const balanceStock = stockByMedId.get(med.id) || 0;
      if (inStockOnly && balanceStock <= 0) {
        return false;
      }

      // Supplier filter
      if (selectedSupplierFilter !== 'ALL') {
        const info = medBatchSupplierMap.get(med.id);
        const matchesSup =
          info?.allSuppliers.some((s) =>
            s.toLowerCase().includes(selectedSupplierFilter.toLowerCase())
          ) ||
          info?.supplierName
            ?.toLowerCase()
            .includes(selectedSupplierFilter.toLowerCase());
        if (!matchesSup) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const info = medBatchSupplierMap.get(med.id);
        const nameMatch = med.name.toLowerCase().includes(query);
        const genericMatch = (med.genericName || '').toLowerCase().includes(query);
        const supplierMatch = (info?.supplierName || '').toLowerCase().includes(query);
        const batchMatch = (info?.batchNumber || '').toLowerCase().includes(query);
        const barcodeMatch = (med.barcode || '').toLowerCase().includes(query);

        if (!nameMatch && !genericMatch && !supplierMatch && !batchMatch && !barcodeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    medicines,
    selectedLetter,
    inStockOnly,
    selectedSupplierFilter,
    searchTerm,
    stockByMedId,
    medBatchSupplierMap,
  ]);

  // Paginated medicines for fast rendering
  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / ITEMS_PER_PAGE));
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMedicines.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMedicines, currentPage]);

  // Handle adding item to purchase cart (either loose tablets 1, 2, 3... or full pack)
  const handleAddToCart = (med: Medicine, customQty?: number, forcedUnit?: 'TABLET' | 'PACK') => {
    const medInfo = medBatchSupplierMap.get(med.id);
    const balanceStock = stockByMedId.get(med.id) || 0;
    const isTab = isTabletOrCapsule(med);
    const tabCount = getTabletsPerPack(med);
    const activeUnit: 'TABLET' | 'PACK' = forcedUnit || itemUnits[med.id] || (isTab ? 'TABLET' : 'PACK');
    const qtyToBuy = customQty || itemQuantities[med.id] || 1;

    // Check if batch exists
    let chosenBatch = medInfo?.primaryBatch;
    if (!chosenBatch || chosenBatch.quantity <= 0) {
      // Auto create or fallback batch so customer purchase is never blocked
      if (onQuickCreateBatch) {
        onQuickCreateBatch(med.id, Math.max(50, qtyToBuy * 2), med.mrp);
      }
      chosenBatch = {
        id: `batch-pos-${Date.now()}`,
        medicineId: med.id,
        batchNumber: medInfo?.batchNumber || `BN-POS-${Math.floor(1000 + Math.random() * 9000)}`,
        mfgDate: new Date().toISOString().slice(0, 7),
        expiryDate: '2028-12-31',
        quantity: Math.max(50, qtyToBuy * 2),
        initialQuantity: Math.max(50, qtyToBuy * 2),
        purchasePrice: med.purchasePrice || Math.round((med.mrp || 100) * 0.7),
        mrp: med.mrp || 100,
        supplierId: 'sup-pos',
        supplierName: medInfo?.supplierName || 'Primary Supplier',
        invoiceNumber: 'POS-ALLOCATION',
        receivedDate: new Date().toISOString().split('T')[0],
      };
    }

    const stripPrice = chosenBatch.mrp || med.sellingPrice || med.mrp || 50;
    const tabPrice = Math.round((stripPrice / Math.max(1, tabCount)) * 100) / 100;
    const effectiveUnitPrice = activeUnit === 'TABLET' ? tabPrice : stripPrice;
    const gstPercent = med.gstPercent || 5;
    const equivalentPackDeduction =
      activeUnit === 'TABLET'
        ? Math.round((qtyToBuy / Math.max(1, tabCount)) * 1000) / 1000
        : qtyToBuy;
    const unitLabel =
      activeUnit === 'TABLET'
        ? qtyToBuy === 1
          ? '1 Loose Tablet'
          : `${qtyToBuy} Loose Tablets`
        : qtyToBuy === 1
        ? '1 Pack'
        : `${qtyToBuy} Packs`;

    const cartKey = `${med.id}-${activeUnit}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.cartItemId === cartKey);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + qtyToBuy;
        const newEquivDeduction =
          activeUnit === 'TABLET'
            ? Math.round((newQty / Math.max(1, tabCount)) * 1000) / 1000
            : newQty;
        const lineTotal = Math.round(newQty * effectiveUnitPrice * 100) / 100;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          equivalentPackDeduction: newEquivDeduction,
          unitLabel:
            activeUnit === 'TABLET'
              ? `${newQty} Loose Tablets`
              : `${newQty} Packs`,
          lineTotal,
        };
        return updated;
      }

      const lineTotal = Math.round(qtyToBuy * effectiveUnitPrice * 100) / 100;
      const newItem: CartItemDraft = {
        cartItemId: cartKey,
        medicineId: med.id,
        medicineName: med.name,
        genericName: med.genericName,
        packSize: med.packSize || (isTab ? `${tabCount} Tablets` : '1 Unit'),
        type: med.type,
        image: med.image,
        batchId: chosenBatch.id,
        batchNumber: chosenBatch.batchNumber,
        expiryDate: chosenBatch.expiryDate,
        supplierName: chosenBatch.supplierName || medInfo?.supplierName || 'Distributor',
        balanceStock: chosenBatch.quantity,
        totalMedStock: balanceStock,
        quantity: qtyToBuy,
        unitPrice: effectiveUnitPrice,
        mrp: chosenBatch.mrp || med.mrp,
        gstPercent,
        lineTotal,
        saleUnit: activeUnit,
        tabletsPerPack: tabCount,
        unitLabel,
        equivalentPackDeduction,
      };

      return [newItem, ...prev];
    });

    // Reset local quantity input
    setItemQuantities((prev) => ({ ...prev, [med.id]: 1 }));
    showToast(
      activeUnit === 'TABLET'
        ? `Added ${qtyToBuy} Loose Tablet${qtyToBuy > 1 ? 's' : ''} of ${med.name} (₹${(qtyToBuy * tabPrice).toFixed(2)})!`
        : `Added ${qtyToBuy} Pack${qtyToBuy > 1 ? 's' : ''} of ${med.name}!`
    );
  };

  // Update item quantity in cart
  const handleUpdateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = Math.max(1, item.quantity + delta);
            const isTab = item.saleUnit === 'TABLET';
            const tabCount = Math.max(1, item.tabletsPerPack || 10);
            const equivDeduction = isTab
              ? Math.round((newQty / tabCount) * 1000) / 1000
              : newQty;
            const unitLabel = isTab
              ? `${newQty} Loose Tablet${newQty > 1 ? 's' : ''}`
              : `${newQty} Pack${newQty > 1 ? 's' : ''}`;
            return {
              ...item,
              quantity: newQty,
              equivalentPackDeduction: equivDeduction,
              unitLabel,
              lineTotal: Math.round(newQty * item.unitPrice * 100) / 100,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  // Cart financial summary
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  }, [subtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    const discountedSubtotal = subtotal - discountAmount;
    return Math.round(discountedSubtotal * 0.05 * 100) / 100; // Average pharma 5% GST
  }, [subtotal, discountAmount]);

  // Delivery Calculation
  const deliveryCalc = useMemo(() => {
    if (deliveryType === 'COUNTER_PICKUP') {
      return {
        distanceKm: 0,
        deliveryCharge: 0,
        isFree: true,
        isOutOfRange: false,
        maxDistanceKm: 12,
        rateRuleDescription: 'In-Store Counter Pickup',
        distanceBreakdown: 'Counter pickup at pharmacy (₹0)',
      };
    }
    return calculatePharmacyDeliveryFee(deliveryDistanceKm);
  }, [deliveryType, deliveryDistanceKm]);

  const grandTotal = useMemo(() => {
    const deliveryFee = deliveryType === 'HOME_DELIVERY' ? deliveryCalc.deliveryCharge : 0;
    return Math.max(0, Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100);
  }, [subtotal, discountAmount, deliveryType, deliveryCalc]);

  // Customer Cash Tender & Balance Calculation
  const effectiveCustomerPaid = useMemo(() => {
    if (amountCustomerPaid > 0) return amountCustomerPaid;
    return grandTotal;
  }, [amountCustomerPaid, grandTotal]);

  const balanceToGiveCustomer = useMemo(() => {
    return Math.max(0, Math.round((effectiveCustomerPaid - grandTotal) * 100) / 100);
  }, [effectiveCustomerPaid, grandTotal]);

  const remainingCustomerOwes = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - effectiveCustomerPaid) * 100) / 100);
  }, [effectiveCustomerPaid, grandTotal]);

  // Complete Customer Purchase
  const handleExecutePurchase = () => {
    if (cart.length === 0) {
      showToast('Please add at least one medicine item to complete purchase.');
      return;
    }

    if (deliveryType === 'HOME_DELIVERY' && deliveryCalc.isOutOfRange) {
      showToast('Delivery location exceeds maximum distance limit of 12 km.');
      return;
    }

    const saleItems: CustomerSaleItem[] = cart.map((item) => {
      const deduction = item.equivalentPackDeduction ?? item.quantity;
      const remainingStock = Math.max(0, Math.round((item.totalMedStock - deduction) * 100) / 100);
      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        lineTotal: item.lineTotal,
        expiryDate: item.expiryDate,
        formulationType: item.type,
        totalStockBefore: item.totalMedStock,
        remainingStockAfter: remainingStock,
        supplierName: item.supplierName,
        saleUnit: item.saleUnit,
        tabletsPerPack: item.tabletsPerPack,
        unitLabel: item.unitLabel,
        packSize: item.packSize,
        equivalentPackDeduction: deduction,
      };
    });

    const newSale: CustomerSale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      date: new Date().toISOString(),
      items: saleItems,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      grandTotal,
      paymentMethod,
      deliveryType,
      deliveryDistanceKm: deliveryType === 'HOME_DELIVERY' ? deliveryDistanceKm : 0,
      deliveryCharge: deliveryType === 'HOME_DELIVERY' ? deliveryCalc.deliveryCharge : 0,
      deliveryAddress: deliveryType === 'HOME_DELIVERY' ? deliveryAddress.trim() : undefined,
      amountPaidByCustomer: effectiveCustomerPaid,
      balanceReturnedToCustomer: balanceToGiveCustomer,
      customerPendingAmount: remainingCustomerOwes,
    };

    // Execute state updates & stock deductions in App.tsx
    onCompleteSale(newSale);
    setCompletedSale(newSale);
    setShowReceiptModal(true);

    // Clear cart and reset
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setDiscountPercent(0);
    setAmountCustomerPaid(0);
    setDeliveryAddress('');
    showToast('Customer purchase successful! Stock balances updated.');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* TOP BANNER & ACTION HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Customer Purchase & Dispense
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    POS Counter
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Point-of-Sale billing with live balance stock verification, distributor/supplier tracking, and real-time inventory deduction.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center space-x-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Catalog Items</span>
                <span className="font-mono font-bold text-white text-xs">{medicines.length}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">In-Stock Balance</span>
                <span className="font-mono font-bold text-teal-300 text-xs">
                  {medicines.filter((m) => (stockByMedId.get(m.id) || 0) > 0).length} Items
                </span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Active Suppliers</span>
                <span className="font-mono font-bold text-purple-300 text-xs">
                  {uniqueSupplierNames.length}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('scanner')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inward Bill</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Medicine, Salt, Supplier, Batch..."
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Supplier Filter Dropdown */}
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedSupplierFilter}
              onChange={(e) => {
                setSelectedSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none transition appearance-none cursor-pointer"
            >
              <option value="ALL">All Suppliers ({uniqueSupplierNames.length})</option>
              {uniqueSupplierNames.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* In Stock Only Checkbox */}
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2">
            <input
              type="checkbox"
              id="instock-filter"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <label
              htmlFor="instock-filter"
              className="text-xs text-slate-300 font-semibold cursor-pointer select-none"
            >
              Show In-Stock Balance Only
            </label>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedLetter('ALL');
                setSelectedSupplierFilter('ALL');
                setInStockOnly(false);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* ALPHABET A-Z FAST SELECTOR */}
        <div className="mt-3 flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center space-x-1">
            <ArrowDownAZ className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alphabet:</span>
          </span>
          {ALPHABET_LIST.map((letter) => (
            <button
              key={letter}
              onClick={() => {
                setSelectedLetter(letter);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition shrink-0 ${
                selectedLetter === letter
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN SPLIT: LEFT MEDICINES COLUMN TABLE, RIGHT CUSTOMER BILL CART */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: MEDICINES TABLE (COLUMNS: MEDICINE NAME BIG, GENERIC, BALANCE STOCK, SUPPLIER, BATCH, MRP, ACTION) */}
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Pill className="w-5 h-5 text-emerald-400" />
                <span>Medicines Catalog • Purchase Items</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {filteredMedicines.length} medicine records in clean columnar view. Select items to dispense to customer.
              </p>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* COLUMNAR MEDICINES TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold text-white">Item / Medicine Name</th>
                  <th className="py-3 px-3 font-bold text-white">Generic / Salt</th>
                  <th className="py-3 px-3 font-bold text-emerald-400 text-center">Balance Stock</th>
                  <th className="py-3 px-3 font-bold text-purple-300">Supplier / Distributor</th>
                  <th className="py-3 px-3 font-bold text-slate-300">Batch & Exp</th>
                  <th className="py-3 px-3 font-bold text-right text-white">MRP</th>
                  <th className="py-3 px-4 font-bold text-center text-emerald-400">Customer Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {paginatedMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Pill className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-slate-300">No medicines found</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or supplier filter.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMedicines.map((med) => {
                    const medInfo = medBatchSupplierMap.get(med.id);
                    const balanceStock = stockByMedId.get(med.id) || 0;
                    const isOutOfStock = balanceStock <= 0;
                    const isLowStock = balanceStock > 0 && balanceStock <= (med.minStockAlert || 30);
                    const currentQty = itemQuantities[med.id] || 1;

                    return (
                      <tr
                        key={med.id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* 1. Item / Medicine Name (GIVE BIG AS REQUESTED) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start space-x-3">
                            {/* Medicine Image / Pack Icon */}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                              {med.image ? (
                                <img
                                  src={med.image}
                                  alt={med.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Pill className="w-5 h-5 text-emerald-400" />
                              )}
                            </div>

                            <div className="flex flex-col">
                              {/* Big Bold Medicine Name */}
                              <span className="text-base sm:text-lg font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition">
                                {med.name}
                              </span>

                              <div className="flex items-center space-x-2 mt-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                  {med.type || 'Tablet'}
                                </span>
                                {med.packSize && (
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {med.packSize}
                                  </span>
                                )}
                                {med.strength && (
                                  <span className="text-[11px] text-teal-400 font-mono font-semibold">
                                    {med.strength}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Generic / Salt */}
                        <td className="py-3.5 px-3">
                          <span className="text-xs text-slate-300 font-medium block max-w-[180px] truncate" title={med.genericName}>
                            {med.genericName || 'Scientific formulation'}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {med.manufacturer || 'Standard Pharma'}
                          </span>
                        </td>

                        {/* 3. Balance Stock (BIG & CLEAR) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-black border flex items-center space-x-1.5 shadow-sm ${
                                isOutOfStock
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : isLowStock
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOutOfStock
                                    ? 'bg-rose-500'
                                    : isLowStock
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              <span>{balanceStock} Units</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1 font-medium">
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock (<30)' : 'In Stock'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Supplier / Distributor */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span
                              className="font-bold text-xs text-purple-200 truncate max-w-[150px] block"
                              title={medInfo?.supplierName}
                            >
                              {medInfo?.supplierName || 'Registered Distributor'}
                            </span>
                          </div>
                          {medInfo?.primaryBatch?.invoiceNumber && (
                            <span className="text-[10px] text-slate-400 font-mono block pl-5 mt-0.5">
                              Bill: {medInfo.primaryBatch.invoiceNumber}
                            </span>
                          )}
                        </td>

                        {/* 5. Batch & Expiry */}
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-xs font-semibold text-slate-200 block">
                            {medInfo?.batchNumber || 'BN-STD-01'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Exp: {medInfo?.expiryDate || '2028-12-31'}</span>
                          </span>
                        </td>

                        {/* 6. MRP / Selling Price */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-mono font-black text-sm text-white block">
                            ₹{(medInfo?.primaryBatch?.mrp || med.mrp || 50).toFixed(2)}
                            <span className="text-[10px] font-normal text-slate-400 block font-mono">
                              {isTabletOrCapsule(med) ? `/ strip (${getTabletsPerPack(med)} tabs)` : '/ unit'}
                            </span>
                          </span>
                          {isTabletOrCapsule(med) && (
                            <span className="text-[11px] text-emerald-400 font-bold block font-mono">
                              ₹{(Math.round(((medInfo?.primaryBatch?.mrp || med.mrp || 50) / getTabletsPerPack(med)) * 100) / 100).toFixed(2)} / tab
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                            incl. {med.gstPercent || 5}% GST
                          </span>
                        </td>

                        {/* 7. Action / Customer Purchase with Single Tablet Support */}
                        <td className="py-3.5 px-4 text-center">
                          {isTabletOrCapsule(med) ? (
                            <div className="flex flex-col items-center space-y-1.5 min-w-[210px]">
                              {/* Quick Selection Buttons for Tablets or Strips (Requirement 1) */}
                              <div className="flex items-center space-x-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mr-0.5">
                                  {(itemUnits[med.id] || 'TABLET') === 'TABLET' ? 'Tabs:' : 'Strips:'}
                                </span>
                                {(itemUnits[med.id] || 'TABLET') === 'TABLET' ? (
                                  [1, 2, 3, 4, 5].map((tabNum) => (
                                    <button
                                      key={tabNum}
                                      type="button"
                                      onClick={() => handleAddToCart(med, tabNum, 'TABLET')}
                                      className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 rounded text-[10px] font-mono font-black transition transform active:scale-95 shadow-sm"
                                      title={`Add ${tabNum} tablet${tabNum > 1 ? 's' : ''} to purchase`}
                                    >
                                      +{tabNum}
                                    </button>
                                  ))
                                ) : (
                                  [1, 2, 3].map((stripNum) => (
                                    <button
                                      key={stripNum}
                                      type="button"
                                      onClick={() => handleAddToCart(med, stripNum, 'PACK')}
                                      className="px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 rounded text-[10px] font-mono font-black transition transform active:scale-95 shadow-sm"
                                      title={`Add ${stripNum} strip${stripNum > 1 ? 's' : ''} to purchase`}
                                    >
                                      +{stripNum} Strip{stripNum > 1 ? 's' : ''}
                                    </button>
                                  ))
                                )}
                              </div>

                              {/* Unit selector + Quantity input + Add Button */}
                              <div className="flex items-center space-x-1.5 w-full justify-center">
                                <div className="flex items-center space-x-1">
                                  <label className="text-[10px] font-bold text-slate-400">Unit:</label>
                                  <select
                                    value={itemUnits[med.id] || 'TABLET'}
                                    onChange={(e) =>
                                      setItemUnits((prev) => ({
                                        ...prev,
                                        [med.id]: e.target.value as 'TABLET' | 'PACK',
                                      }))
                                    }
                                    className="px-2 py-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-xs font-bold text-emerald-300 outline-none cursor-pointer"
                                  >
                                    <option value="TABLET">Tablet ▼</option>
                                    <option value="PACK">Strip ▼</option>
                                  </select>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <label className="text-[10px] font-bold text-slate-400">Qty:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      setItemQuantities((prev) => ({ ...prev, [med.id]: val }));
                                    }}
                                    className="w-12 px-1.5 py-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold text-center text-white outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(med, currentQty, itemUnits[med.id] || 'TABLET')}
                                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/10 transition flex items-center space-x-1 transform active:scale-95 shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Quantity Stepper */}
                              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemQuantities((prev) => ({
                                      ...prev,
                                      [med.id]: Math.max(1, (prev[med.id] || 1) - 1),
                                    }))
                                  }
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center font-mono font-bold text-xs text-white">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemQuantities((prev) => ({
                                      ...prev,
                                      [med.id]: (prev[med.id] || 1) + 1,
                                    }))
                                  }
                                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Add to Purchase Bill Button */}
                              <button
                                type="button"
                                onClick={() => handleAddToCart(med, currentQty, 'PACK')}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/10 transition flex items-center space-x-1 transform active:scale-95 shrink-0"
                                title="Add to Customer Purchase Bill"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Purchase</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CUSTOMER PURCHASE REGISTER / BILLING CART */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Customer Purchase Register
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {cart.length} item(s) selected
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Customer Information Space */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Customer Details
            </span>

            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name (e.g. Walk-in Customer)"
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>

            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone Number (Optional for invoice SMS)"
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Selected Cart Items Table */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Items for Customer Purchase
            </span>

            {cart.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <ShoppingCart className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Cart is currently empty</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click "+ Purchase" on any medicine from the column view to add.
                </p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {cart.map((item) => {
                  const deduction = item.equivalentPackDeduction ?? item.quantity;
                  const remainingAfterSale = Math.max(0, Math.round((item.totalMedStock - deduction) * 100) / 100);

                  return (
                    <div
                      key={item.cartItemId}
                      className="bg-slate-950 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {/* Medicine Name & Unit Badge */}
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-extrabold text-white leading-tight">
                              {item.medicineName}
                            </h4>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                item.saleUnit === 'TABLET'
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              }`}
                            >
                              {item.saleUnit === 'TABLET' ? `${item.quantity} Loose Tabs` : 'Full Pack'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.genericName} • {item.packSize}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(item.cartItemId)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Supplier & Batch Information */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                        <span className="text-purple-300 font-semibold flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>{item.supplierName}</span>
                        </span>
                        <span>•</span>
                        <span>Batch: {item.batchNumber}</span>
                        <span>•</span>
                        <span>Exp: {item.expiryDate}</span>
                      </div>

                      {/* Balance Stock Before vs After Calculation */}
                      <div className="flex items-center justify-between text-[11px] font-mono bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <span className="text-slate-400">Balance Stock:</span>
                        <span className="font-bold text-emerald-300">
                          {item.totalMedStock} packs →{' '}
                          <span className="text-teal-300 font-extrabold">
                            {remainingAfterSale} left
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            (-{deduction} {item.saleUnit === 'TABLET' ? `pack for ${item.quantity} tabs` : 'packs'})
                          </span>
                        </span>
                      </div>

                      {/* Quantity Selector & Price */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.cartItemId, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs text-white min-w-[36px] text-center">
                            {item.quantity} {item.saleUnit === 'TABLET' ? 'tab' : 'pk'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.cartItemId, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            × ₹{item.unitPrice.toFixed(2)}
                          </span>
                        </div>

                        <span className="font-mono font-bold text-xs text-emerald-400">
                          ₹{item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery & Distance Service Selection */}
          <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Delivery & Location Service</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                {deliveryType === 'COUNTER_PICKUP' ? 'Counter Pickup' : `${deliveryDistanceKm} km`}
              </span>
            </div>

            {/* In-Store vs Home Delivery Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType('COUNTER_PICKUP')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  deliveryType === 'COUNTER_PICKUP'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Counter Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('HOME_DELIVERY')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border cursor-pointer ${
                  deliveryType === 'HOME_DELIVERY'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Home Delivery</span>
              </button>
            </div>

            {/* Home Delivery Parameters */}
            {deliveryType === 'HOME_DELIVERY' && (
              <div className="pt-2 space-y-2.5 animate-in fade-in">
                {/* Distance in KM input & presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>Delivery Distance (km):</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-white">
                      {deliveryDistanceKm} km
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0.5"
                      max="12.0"
                      step="0.1"
                      value={deliveryDistanceKm}
                      onChange={(e) => setDeliveryDistanceKm(parseFloat(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0.1"
                      max="15.0"
                      step="0.1"
                      value={deliveryDistanceKm}
                      onChange={(e) => setDeliveryDistanceKm(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-center text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Quick Distance Presets */}
                  <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(2.0)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                    >
                      2 km (Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(3.0)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                    >
                      3 km (Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(3.5)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 cursor-pointer"
                    >
                      3.5 km (₹50)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(5.0)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 cursor-pointer"
                    >
                      5 km (₹60)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(8.0)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 cursor-pointer"
                    >
                      8 km (₹90)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDistanceKm(12.0)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 cursor-pointer"
                    >
                      12 km (₹130)
                    </button>
                  </div>
                </div>

                {/* Delivery Rule & Fee Badge */}
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    deliveryCalc.isOutOfRange
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                      : deliveryCalc.isFree
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-teal-950/40 border-teal-500/50 text-teal-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-[11px]">{deliveryCalc.rateRuleDescription}</span>
                  </div>
                  <span className="font-mono font-black text-sm">
                    {deliveryCalc.isOutOfRange ? 'NO SERVICE' : deliveryCalc.isFree ? '₹0 FREE' : `₹${deliveryCalc.deliveryCharge}`}
                  </span>
                </div>

                {/* Delivery Address */}
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Customer Delivery Address / Flat / Road"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  paymentMethod === 'CARD'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>
            </div>
          </div>

          {/* Bill Summary Calculations */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="text-white">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1">
                <span>Discount:</span>
                <select
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-[10px] text-emerald-400 rounded px-1 py-0.5 ml-1"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </select>
              </span>
              <span className="text-emerald-400">-₹{discountAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>GST (Included):</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>

            {deliveryType === 'HOME_DELIVERY' && (
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center space-x-1">
                  <Truck className="w-3 h-3 text-emerald-400" />
                  <span>Delivery Charge ({deliveryDistanceKm} km):</span>
                </span>
                <span className={deliveryCalc.deliveryCharge === 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                  {deliveryCalc.deliveryCharge === 0 ? 'FREE (₹0)' : `₹${deliveryCalc.deliveryCharge.toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-black">
              <span className="text-white">Grand Total:</span>
              <span className="text-lg text-emerald-400">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* CUSTOMER PAYMENT & CHANGE / BALANCE CALCULATOR */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>Customer Amount Paid (₹)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Bill Due: ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <input
              type="number"
              step="1"
              min="0"
              value={amountCustomerPaid || ''}
              onChange={(e) => setAmountCustomerPaid(parseFloat(e.target.value) || 0)}
              placeholder={`Enter paid amount (e.g. ₹${grandTotal})`}
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-bold focus:outline-none"
            />

            {/* Quick Tender Denomination Chips */}
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setAmountCustomerPaid(grandTotal)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer"
              >
                Exact (₹{grandTotal})
              </button>
              {[100, 200, 500, 1000, 2000].map((denom) => (
                <button
                  key={denom}
                  type="button"
                  onClick={() => setAmountCustomerPaid(denom)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                >
                  ₹{denom}
                </button>
              ))}
            </div>

            {/* Real-time Change / Balance Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                balanceToGiveCustomer > 0
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : remainingCustomerOwes > 0 && amountCustomerPaid > 0
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <div>
                <span className="text-[10px] block uppercase font-bold tracking-wider">
                  {balanceToGiveCustomer > 0
                    ? 'Balance to Return Customer'
                    : remainingCustomerOwes > 0 && amountCustomerPaid > 0
                    ? 'Remaining Balance Customer Owes'
                    : 'Customer Payment Status'}
                </span>
                <span className="text-sm font-black">
                  {balanceToGiveCustomer > 0
                    ? `Give ₹${balanceToGiveCustomer.toFixed(2)} Change`
                    : remainingCustomerOwes > 0 && amountCustomerPaid > 0
                    ? `Owes ₹${remainingCustomerOwes.toFixed(2)}`
                    : 'Exact Payment Settled'}
                </span>
              </div>
              <span className="text-xl">
                {balanceToGiveCustomer > 0 ? '💵' : remainingCustomerOwes > 0 && amountCustomerPaid > 0 ? '⏳' : '✓'}
              </span>
            </div>
          </div>

          {/* Complete Customer Purchase Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleExecutePurchase}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center justify-center space-x-2 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Customer Purchase</span>
          </button>
        </div>
      </div>

      {/* COMPLETED SALE PRINTABLE RECEIPT MODAL */}
      {showReceiptModal && completedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">
                  Customer Purchase Tax Invoice
                </h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div id="customer-printable-receipt" className="bg-white text-slate-950 p-6 rounded-2xl font-mono text-xs shadow-inner space-y-4">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-lg font-black tracking-tight">{storeName}</h2>
                <p className="text-[10px] text-slate-600">Retail Pharmaceutical & Healthcare</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  GSTIN: 32AACCW9059Q1ZL • DL No: KL-EKM-29482
                </p>
              </div>

              <div className="flex justify-between text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div>
                  <span className="text-slate-500 block">Customer:</span>
                  <span className="font-bold">{completedSale.customerName}</span>
                  {completedSale.customerPhone && (
                    <span className="text-[10px] text-slate-500 block">{completedSale.customerPhone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Invoice #:</span>
                  <span className="font-bold">{completedSale.invoiceNumber}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(completedSale.date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
                  <span>Item / Batch / Supplier</span>
                  <span>Qty × Rate</span>
                  <span>Total</span>
                </div>

                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div>
                      <span className="font-bold block">{item.medicineName}</span>
                      <span className="text-[9px] text-slate-500 block">
                        {item.saleUnit === 'TABLET' ? `${item.quantity} Loose Tablet(s)` : `${item.quantity} Pack(s)`} • Batch: {item.batchNumber} • {item.supplierName || 'Distributor'}
                      </span>
                    </div>
                    <div className="text-center text-slate-600">
                      {item.quantity} {item.saleUnit === 'TABLET' ? 'tabs' : 'packs'} × ₹{item.unitPrice.toFixed(2)}
                    </div>
                    <div className="font-bold text-right">
                      ₹{item.lineTotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>₹{completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({completedSale.discountPercent}%):</span>
                    <span>-₹{completedSale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>GST (Included):</span>
                  <span>₹{completedSale.taxAmount.toFixed(2)}</span>
                </div>
                {completedSale.deliveryType === 'HOME_DELIVERY' && (
                  <div className="flex justify-between text-slate-700">
                    <span>Home Delivery ({completedSale.deliveryDistanceKm} km):</span>
                    <span>{completedSale.deliveryCharge ? `₹${completedSale.deliveryCharge.toFixed(2)}` : 'FREE (₹0)'}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-slate-400 pt-1 text-slate-950">
                  <span>Grand Total:</span>
                  <span>₹{completedSale.grandTotal.toFixed(2)}</span>
                </div>
                {completedSale.amountPaidByCustomer !== undefined && (
                  <div className="flex justify-between text-[11px] text-slate-700 pt-1 border-t border-dashed border-slate-300">
                    <span>Amount Customer Tendered:</span>
                    <span className="font-bold">₹{completedSale.amountPaidByCustomer.toFixed(2)}</span>
                  </div>
                )}
                {completedSale.balanceReturnedToCustomer !== undefined && completedSale.balanceReturnedToCustomer > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                    <span>Change Returned to Customer:</span>
                    <span>₹{completedSale.balanceReturnedToCustomer.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-500 pt-1">
                  Paid via: <span className="font-bold">{completedSale.paymentMethod}</span>
                  {completedSale.deliveryAddress && (
                    <span className="block text-[9px] text-slate-500 mt-0.5">
                      Delivered to: {completedSale.deliveryAddress}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
                <p>Thank you for your visit! Get well soon.</p>
                <p>PharmaBill AI • Stock Automatically Updated</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
