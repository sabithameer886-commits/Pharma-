import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Phone,
  Pill,
  Layers,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Truck,
  MapPin,
  Store,
} from 'lucide-react';
import { calculatePharmacyDeliveryFee } from '../utils/deliveryCalculator';
import { Medicine, Batch, CustomerSale, CustomerSaleItem, MedicineType } from '../types';

export interface CartItem {
  cartId: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  packSize: string;
  type?: MedicineType;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  supplierName?: string;
  maxBatchStock: number;
  totalMedStockBefore?: number;
  quantity: number;
  unitPrice: number;
  mrp: number;
  gstPercent: number;
  lineTotal: number;
  saleUnit: 'TABLET' | 'PACK';
  tabletsPerPack: number;
  unitLabel: string;
  equivalentPackDeduction: number;
}

interface CustomerSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  batches: Batch[];
  initialMedicineId?: string;
  storeName?: string;
  onCompleteSale: (sale: CustomerSale) => void;
  onQuickCreateBatch?: (medicineId: string, quantity?: number, mrp?: number) => void;
}

export const CustomerSaleModal: React.FC<CustomerSaleModalProps> = ({
  isOpen,
  onClose,
  medicines,
  batches,
  initialMedicineId,
  storeName = 'Sadi Medical',
  onCompleteSale,
  onQuickCreateBatch,
}) => {
  // Customer Details
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [saleErrorNotice, setSaleErrorNotice] = useState<string | null>(null);
  const [marketRateData, setMarketRateData] = useState<any | null>(null);

  // Delivery states
  const [deliveryType, setDeliveryType] = useState<'COUNTER_PICKUP' | 'HOME_DELIVERY'>('COUNTER_PICKUP');
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(2.5);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Customer Cash tender & balance states
  const [amountCustomerPaid, setAmountCustomerPaid] = useState<number>(0);

  // Multi-Item Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Item Picker / Add Form State
  const [selectedMedId, setSelectedMedId] = useState<string>(initialMedicineId || medicines[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleLetter, setSelectedSaleLetter] = useState<string>('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [saleUnit, setSaleUnit] = useState<'TABLET' | 'PACK'>('TABLET');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Completed receipt state
  const [completedSale, setCompletedSale] = useState<CustomerSale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Sync initial medicine when opened
  useEffect(() => {
    if (initialMedicineId) {
      setSelectedMedId(initialMedicineId);
    } else if (!selectedMedId && medicines.length > 0) {
      setSelectedMedId(medicines[0].id);
    }
  }, [initialMedicineId, medicines]);

  // Selected medicine details for picker
  const currentMed = useMemo(() => {
    return medicines.find((m) => m.id === selectedMedId);
  }, [medicines, selectedMedId]);

  // Derive packaging & tablet parameters
  const tabletsPerPack = useMemo(() => {
    if (!currentMed) return 10;
    const match = String(currentMed.packSize || '').match(/(\d+)\s*(?:tabs?|tablets?|caps?|'s|\/)/i);
    return match ? Math.max(1, parseInt(match[1], 10)) : 10;
  }, [currentMed]);

  const isTabletOrCapsule = useMemo(() => {
    if (!currentMed) return false;
    return (
      currentMed.type === 'Tablet' ||
      currentMed.type === 'Capsule' ||
      /tabs?|tablets?|caps?|strip/i.test(currentMed.packSize || '')
    );
  }, [currentMed]);

  // Synchronize unit toggle whenever selected medicine changes
  useEffect(() => {
    if (currentMed) {
      const isTab = currentMed.type === 'Tablet' || currentMed.type === 'Capsule' || /tabs?|tablets?|caps?|strip/i.test(currentMed.packSize || '');
      setSaleUnit(isTab ? 'TABLET' : 'PACK');
      setItemQuantity(1);
    }
  }, [currentMed]);

  const stripPrice = currentMed ? (currentMed.sellingPrice || currentMed.mrp || 10) : 10;
  const tabletPrice = Math.round((stripPrice / Math.max(1, tabletsPerPack)) * 100) / 100;
  const effectiveUnitPrice = saleUnit === 'TABLET' ? tabletPrice : stripPrice;

  // Available batches for selected medicine with stock > 0
  const availableBatches = useMemo(() => {
    if (!selectedMedId) return [];
    return batches
      .filter((b) => b.medicineId === selectedMedId && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()); // FEFO
  }, [batches, selectedMedId]);

  // Total stock across batches for selected medicine in packs
  const totalAvailableStock = useMemo(() => {
    return Math.round(availableBatches.reduce((sum, b) => sum + b.quantity, 0) * 100) / 100;
  }, [availableBatches]);

  // Total stock in single tablets
  const totalAvailableTablets = useMemo(() => {
    return Math.round(totalAvailableStock * tabletsPerPack);
  }, [totalAvailableStock, tabletsPerPack]);

  // Auto-select batch if current selection invalid or changed
  useEffect(() => {
    if (availableBatches.length > 0) {
      const exists = availableBatches.some((b) => b.id === selectedBatchId);
      if (!exists) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else {
      setSelectedBatchId('');
    }
  }, [availableBatches, selectedBatchId]);

  const activeBatch = useMemo(() => {
    return availableBatches.find((b) => b.id === selectedBatchId) || availableBatches[0];
  }, [availableBatches, selectedBatchId]);

  // Filtered medicines for picker search (alphabetically sorted with letter indexing)
  const searchedMeds = useMemo(() => {
    let list = medicines;
    if (selectedSaleLetter !== 'ALL') {
      list = list.filter((m) => m.name.trim().charAt(0).toUpperCase() === selectedSaleLetter);
    }
    if (!searchTerm.trim()) {
      return list.slice(0, selectedSaleLetter !== 'ALL' ? 30 : 15);
    }
    const q = searchTerm.toLowerCase();
    return list
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          (m.barcode && m.barcode.includes(q))
      )
      .slice(0, 30);
  }, [medicines, searchTerm, selectedSaleLetter]);

  // Already selected pack deduction in cart for the active batch
  const alreadyInCartBatchPacks = useMemo(() => {
    if (!activeBatch) return 0;
    return cartItems
      .filter((item) => item.batchId === activeBatch.id)
      .reduce((sum, item) => sum + (item.equivalentPackDeduction ?? item.quantity), 0);
  }, [cartItems, activeBatch]);

  const remainingBatchStockPacks = Math.max(0, Math.round(((activeBatch?.quantity || 0) - alreadyInCartBatchPacks) * 100) / 100);
  const remainingBatchStockTablets = Math.floor(remainingBatchStockPacks * tabletsPerPack);

  // Auto-populate cart with initial medicine on modal open if cart is empty
  useEffect(() => {
    if (isOpen && initialMedicineId && cartItems.length === 0) {
      const med = medicines.find((m) => m.id === initialMedicineId);
      const medBatches = batches
        .filter((b) => b.medicineId === initialMedicineId && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      const batch = medBatches[0];

      if (med && batch) {
        const isTab = med.type === 'Tablet' || med.type === 'Capsule' || /tabs?|tablets?|caps?|strip/i.test(med.packSize || '');
        const match = String(med.packSize || '').match(/(\d+)\s*(?:tabs?|tablets?|caps?|'s|\/)/i);
        const tabCount = match ? Math.max(1, parseInt(match[1], 10)) : 10;
        const initialUnit: 'TABLET' | 'PACK' = isTab ? 'TABLET' : 'PACK';
        const sPrice = med.sellingPrice || med.mrp || 10;
        const tPrice = Math.round((sPrice / tabCount) * 100) / 100;
        const uPrice = initialUnit === 'TABLET' ? tPrice : sPrice;
        const totalMedStock = medBatches.reduce((acc, b) => acc + b.quantity, 0);
        const initialItem: CartItem = {
          cartId: `cart-${Date.now()}-init`,
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName,
          packSize: med.packSize,
          type: med.type,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          maxBatchStock: batch.quantity,
          totalMedStockBefore: totalMedStock,
          quantity: 1,
          unitPrice: uPrice,
          mrp: med.mrp || sPrice,
          gstPercent: med.gstPercent || 12,
          lineTotal: uPrice * 1,
          saleUnit: initialUnit,
          tabletsPerPack: tabCount,
          unitLabel: initialUnit === 'TABLET' ? '1 Loose Tablet' : '1 Pack',
          equivalentPackDeduction: initialUnit === 'TABLET' ? Math.round((1 / tabCount) * 1000) / 1000 : 1,
        };
        setCartItems([initialItem]);
      }
    }
  }, [isOpen, initialMedicineId]);

  // Add Item to Multi-Item Cart
  const handleAddToCart = (overrideQty?: number, overrideUnit?: 'TABLET' | 'PACK') => {
    setSaleErrorNotice(null);
    if (!currentMed) {
      setSaleErrorNotice('Please select a medicine.');
      return;
    }
    if (!activeBatch) {
      if (onQuickCreateBatch) {
        onQuickCreateBatch(currentMed.id, 50, currentMed.mrp);
        setSaleErrorNotice(`Auto-generated stock batch (50 units) for ${currentMed.name}. Click 'Add' now!`);
        return;
      }
      setSaleErrorNotice('Please select a medicine and valid batch.');
      return;
    }

    const activeUnit = overrideUnit || saleUnit;
    const qtyToBuy = overrideQty || itemQuantity;

    if (qtyToBuy <= 0) {
      setSaleErrorNotice('Please enter a quantity greater than 0.');
      return;
    }

    const packDeduction =
      activeUnit === 'TABLET'
        ? Math.round((qtyToBuy / tabletsPerPack) * 1000) / 1000
        : qtyToBuy;

    if (packDeduction > remainingBatchStockPacks) {
      if (activeUnit === 'TABLET') {
        setSaleErrorNotice(`Only ${remainingBatchStockTablets} tablets (${remainingBatchStockPacks.toFixed(2)} strips) available in batch ${activeBatch.batchNumber}.`);
      } else {
        setSaleErrorNotice(`Only ${Math.floor(remainingBatchStockPacks)} packs available in batch ${activeBatch.batchNumber}.`);
      }
      return;
    }

    const uPrice = activeUnit === 'TABLET' ? tabletPrice : stripPrice;
    const unitLabel =
      activeUnit === 'TABLET'
        ? `${qtyToBuy} Loose Tablet${qtyToBuy > 1 ? 's' : ''}`
        : `${qtyToBuy} Pack${qtyToBuy > 1 ? 's' : ''}`;

    const existingIndex = cartItems.findIndex(
      (it) => it.batchId === activeBatch.id && it.saleUnit === activeUnit
    );

    if (existingIndex !== -1) {
      // Update existing cart item quantity
      setCartItems((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQty = item.quantity + qtyToBuy;
            const newPackDeduction =
              item.saleUnit === 'TABLET'
                ? Math.round((newQty / tabletsPerPack) * 1000) / 1000
                : newQty;
            const newLabel =
              item.saleUnit === 'TABLET'
                ? `${newQty} Loose Tablet${newQty > 1 ? 's' : ''}`
                : `${newQty} Pack${newQty > 1 ? 's' : ''}`;
            return {
              ...item,
              quantity: newQty,
              unitLabel: newLabel,
              equivalentPackDeduction: newPackDeduction,
              lineTotal: Math.round(newQty * item.unitPrice * 100) / 100,
            };
          }
          return item;
        })
      );
    } else {
      // Add new cart item
      const newItem: CartItem = {
        cartId: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        medicineId: currentMed.id,
        medicineName: currentMed.name,
        genericName: currentMed.genericName,
        packSize: currentMed.packSize,
        type: currentMed.type,
        batchId: activeBatch.id,
        batchNumber: activeBatch.batchNumber,
        expiryDate: activeBatch.expiryDate,
        supplierName: activeBatch.supplierName,
        maxBatchStock: activeBatch.quantity,
        totalMedStockBefore: totalAvailableStock,
        quantity: qtyToBuy,
        unitPrice: uPrice,
        mrp: currentMed.mrp || stripPrice,
        gstPercent: currentMed.gstPercent || 12,
        lineTotal: Math.round(qtyToBuy * uPrice * 100) / 100,
        saleUnit: activeUnit,
        tabletsPerPack,
        unitLabel,
        equivalentPackDeduction: packDeduction,
      };
      setCartItems((prev) => [...prev, newItem]);
    }

    // Reset item quantity back to 1
    setItemQuantity(1);
  };

  // Remove item from cart
  const handleRemoveFromCart = (cartId: string) => {
    setCartItems((prev) => prev.filter((it) => it.cartId !== cartId));
  };

  // Update item quantity in cart
  const handleUpdateCartQuantity = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(cartId);
      return;
    }
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.cartId === cartId) {
          const tabCount = it.tabletsPerPack || 10;
          const newPackDeduction =
            it.saleUnit === 'TABLET'
              ? Math.round((newQty / tabCount) * 1000) / 1000
              : newQty;
          const newLabel =
            it.saleUnit === 'TABLET'
              ? `${newQty} Loose Tablet${newQty > 1 ? 's' : ''}`
              : `${newQty} Pack${newQty > 1 ? 's' : ''}`;
          return {
            ...it,
            quantity: newQty,
            unitLabel: newLabel,
            equivalentPackDeduction: newPackDeduction,
            lineTotal: Math.round(newQty * it.unitPrice * 100) / 100,
          };
        }
        return it;
      })
    );
  };

  // Overall Financial Calculations for Multi-Item Bill
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.lineTotal, 0);
  }, [cartItems]);

  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const taxableAmount = subtotal - discountAmount;

  // Weighted GST calculation
  const totalTaxAmount = useMemo(() => {
    let tax = 0;
    for (const item of cartItems) {
      const itemNet = item.lineTotal * (1 - discountPercent / 100);
      tax += (itemNet * item.gstPercent) / (100 + item.gstPercent);
    }
    return Math.round(tax * 100) / 100;
  }, [cartItems, discountPercent]);

  // Delivery calculation
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

  const deliveryFee = deliveryType === 'HOME_DELIVERY' ? deliveryCalc.deliveryCharge : 0;
  const grandTotal = Math.max(0, Math.round(taxableAmount + deliveryFee));

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

  // Online Medicine Rate Lookup for quick verification
  const handleLookupRates = async (medicineName: string, genericName?: string) => {
    setLookupLoading(true);
    try {
      const res = await fetch('/api/lookup-medicine-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName, genericName }),
      });
      const data = await res.json();
      setMarketRateData(data);
    } catch {
      setSaleErrorNotice('Could not retrieve live market rates.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Confirm Sale & Auto-Minus Stock for ALL items in Bill
  const handleConfirmSale = () => {
    if (cartItems.length === 0) {
      setSaleErrorNotice('Please add at least one medicine item to the bill before confirming.');
      return;
    }

    if (deliveryType === 'HOME_DELIVERY' && deliveryCalc.isOutOfRange) {
      setSaleErrorNotice('Delivery distance exceeds maximum range of 12.0 km.');
      return;
    }

    const saleItems: CustomerSaleItem[] = cartItems.map((item) => {
      const stockBefore = item.totalMedStockBefore ?? 45;
      const packDeduct = item.equivalentPackDeduction;
      const remainingAfter = Math.max(0, Math.round((stockBefore - packDeduct) * 100) / 100);
      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        batchId: item.batchId,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        lineTotal: Math.round(item.quantity * item.unitPrice * (1 - discountPercent / 100) * 100) / 100,
        expiryDate: item.expiryDate,
        formulationType: item.type,
        totalStockBefore: stockBefore,
        remainingStockAfter: remainingAfter,
        supplierName: item.supplierName,
        saleUnit: item.saleUnit,
        tabletsPerPack: item.tabletsPerPack,
        unitLabel: item.unitLabel,
        equivalentPackDeduction: item.equivalentPackDeduction,
      };
    });

    const saleRecord: CustomerSale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: `RX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      date: new Date().toISOString(),
      items: saleItems,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount: totalTaxAmount,
      grandTotal,
      paymentMethod,
      deliveryType,
      deliveryDistanceKm: deliveryType === 'HOME_DELIVERY' ? deliveryDistanceKm : 0,
      deliveryCharge: deliveryFee,
      deliveryAddress: deliveryType === 'HOME_DELIVERY' ? deliveryAddress.trim() : undefined,
      amountPaidByCustomer: effectiveCustomerPaid,
      balanceReturnedToCustomer: balanceToGiveCustomer,
      customerPendingAmount: remainingCustomerOwes,
    };

    onCompleteSale(saleRecord);
    setCompletedSale(saleRecord);
    setShowReceipt(true);
  };

  const handlePrint = (autoClose: boolean = false) => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print error', e);
    }
    if (autoClose) {
      onClose();
    }
  };

  const handleCompleteAndPrint = () => {
    if (cartItems.length === 0) {
      setSaleErrorNotice('Please add at least one medicine item to the bill before confirming.');
      return;
    }
    handleConfirmSale();
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Print error', e);
      }
    }, 250);
  };

  const handleResetForNewSale = () => {
    setShowReceipt(false);
    setCompletedSale(null);
    setCartItems([]);
    setItemQuantity(1);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col my-auto max-h-[95vh] sm:max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Multi-Item Customer Dispense & POS Sale</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded">
                  Auto-Minus Multi-Stock
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Dispense multiple medicines on one bill, auto-minus stock across batches, and calculate overall totals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {saleErrorNotice && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{saleErrorNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaleErrorNotice(null)}
                className="text-amber-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          )}

          {marketRateData && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-200 flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-bold text-sky-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Market Pricing Verification: {marketRateData.medicineName}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
                  <div>MRP: ₹{marketRateData.standardMrp}</div>
                  <div>Wholesale: ₹{marketRateData.wholesaleRate}</div>
                  <div>GST: {marketRateData.gstPercent}%</div>
                  <div>Mfg: {marketRateData.manufacturer}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMarketRateData(null)}
                className="text-sky-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          )}

          {showReceipt && completedSale ? (
            /* RECEIPT VIEW */
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  Multi-Item Bill Processed Successfully!
                </h4>
                <p className="text-xs text-emerald-300">
                  Stock deducted for <strong>{completedSale.items.length} items</strong> (
                  {completedSale.items.reduce((s, i) => s + i.quantity, 0)} total units) across all inventory batches.
                </p>
              </div>

              {/* Printable Invoice Slip */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-lg font-sans space-y-4 border border-slate-200">
                <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      {(storeName || 'PHARMABILL HEALTHCARE PHARMACY').toUpperCase()}
                    </h2>
                    <p className="text-[11px] text-slate-600">DL: MH-MZ4-283918 • GSTIN: 27AABCS1429B1Z8</p>
                    <p className="text-[11px] text-slate-600">Retail Patient Cash Memo / Tax Invoice</p>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="font-bold text-slate-900">{completedSale.invoiceNumber}</span>
                    <p className="text-slate-500">{new Date(completedSale.date).toLocaleString()}</p>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 text-xs py-2 bg-slate-50 px-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Patient / Customer</span>
                    <span className="font-semibold text-slate-800">{completedSale.customerName}</span>
                    {completedSale.customerPhone && (
                      <span className="text-[11px] text-slate-500 block">Phone: {completedSale.customerPhone}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Payment Method</span>
                    <span className="font-semibold text-slate-800 font-mono">{completedSale.paymentMethod}</span>
                    <span className="text-[11px] text-emerald-600 block font-semibold">Total Items: {completedSale.items.length}</span>
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
                    {completedSale.items.map((item, i) => {
                      const before = item.totalStockBefore ?? (item.quantity + 45);
                      const after = item.remainingStockAfter ?? 45;
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center py-0.5 border-b border-emerald-100/60 last:border-0"
                        >
                          <span className="text-slate-800 font-medium">
                            {i + 1}. {item.medicineName} ({item.batchNumber})
                          </span>
                          <span>
                            Total Stock: <strong className="text-slate-900">{before}</strong> units − Customer Buy:{' '}
                            <strong className="text-rose-700 font-bold">{item.quantity}</strong> = Remaining Stock:{' '}
                            <strong className="text-emerald-950 font-bold bg-emerald-200/60 px-1.5 py-0.5 rounded">
                              {after}
                            </strong>{' '}
                            units
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-[10px] uppercase font-bold">
                      <th className="py-1.5">#</th>
                      <th className="py-1.5">Medicine Description</th>
                      <th className="py-1.5 font-mono">Batch</th>
                      <th className="py-1.5 font-mono">Exp</th>
                      <th className="py-1.5 text-center">Unit & Qty</th>
                      <th className="py-1.5 text-right font-mono">MRP</th>
                      <th className="py-1.5 text-right font-mono">Rate (₹)</th>
                      <th className="py-1.5 text-right font-mono">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {completedSale.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-slate-500 text-[11px]">{i + 1}</td>
                        <td className="py-2 font-sans font-semibold text-slate-900">
                          <div>{item.medicineName}</div>
                          {item.formulationType && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-normal">
                              {item.formulationType}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-slate-600">{item.batchNumber}</td>
                        <td className="py-2 text-slate-600">{item.expiryDate}</td>
                        <td className="py-2 text-center font-bold text-slate-900">
                          {item.saleUnit === 'TABLET'
                            ? `${item.quantity} Tablet${item.quantity > 1 ? 's' : ''}`
                            : `${item.quantity} Strip${item.quantity > 1 ? 's' : ''}`}
                        </td>
                        <td className="py-2 text-right text-slate-600">₹{item.mrp.toFixed(2)}</td>
                        <td className="py-2 text-right text-slate-600">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2 text-right font-bold text-slate-900">₹{item.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Overall Totals */}
                <div className="border-t border-slate-200 pt-3 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal of {completedSale.items.length} Purchased Items:</span>
                    <span>₹{completedSale.subtotal.toFixed(2)}</span>
                  </div>
                  {completedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({completedSale.discountPercent}%):</span>
                      <span>-₹{completedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Included GST Taxes:</span>
                    <span>₹{completedSale.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
                    <span className="font-sans">Overall Grand Total Paid:</span>
                    <span>₹{completedSale.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  Thank you for visiting! Prescribed medicines are non-returnable. Keep in a cool, dry place.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForNewSale}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  + Make Another Multi-Item Bill
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePrint(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
                    title="Print bill receipt and keep dialog open"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Bill Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(true)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg transform active:scale-95"
                    title="Print bill receipt and return to main interface"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print & Go to Main</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
                    title="Return to main interface"
                  >
                    <span>Main Interface</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MULTI-ITEM SALE ENTRY FORM */
            <div className="space-y-5">
              {/* Customer & Billing Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Patient / Customer Name</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Mobile # (Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Payment Mode</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {paymentMethod}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-1 rounded text-xs font-semibold transition ${
                        paymentMethod === 'CASH'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`py-1 rounded text-xs font-semibold transition ${
                        paymentMethod === 'UPI'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`py-1 rounded text-xs font-semibold transition ${
                        paymentMethod === 'CARD'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Card
                    </button>
                  </div>
                </div>
              </div>

              {/* ITEM ADDITION BOX: Search, Select Batch, Add to Cart */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Medicine Item to Customer Bill</span>
                  </span>
                  {currentMed && (
                    <button
                      type="button"
                      onClick={() => handleLookupRates(currentMed.name, currentMed.genericName)}
                      disabled={lookupLoading}
                      className="px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[11px] font-semibold flex items-center space-x-1"
                      title="Analyze standard market rates"
                    >
                      <Sparkles className={`w-3 h-3 ${lookupLoading ? 'animate-spin' : ''}`} />
                      <span>{lookupLoading ? 'Checking...' : 'Check Market Rates'}</span>
                    </button>
                  )}
                </div>

                {/* Alphabet Filter for Fast 25,000 Catalog Selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold flex items-center space-x-1">
                      <span>Alphabet Quick Index:</span>
                      {selectedSaleLetter !== 'ALL' && (
                        <span className="text-emerald-400 font-bold font-mono">
                          Letter &quot;{selectedSaleLetter}&quot;
                        </span>
                      )}
                    </span>
                    {selectedSaleLetter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setSelectedSaleLetter('ALL')}
                        className="text-[10px] text-emerald-400 hover:underline font-mono"
                      >
                        Reset (All Letters)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                    {['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => {
                      const isSel = selectedSaleLetter === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => {
                            setSelectedSaleLetter(letter);
                            setSearchTerm('');
                          }}
                          className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-mono font-bold transition flex items-center justify-center shrink-0 ${
                            isSel
                              ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Medicine Search input */}
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search medicine by brand name, salt composition, or barcode (stored alphabetically)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {(searchTerm.trim() || selectedSaleLetter !== 'ALL') && (
                    <div className="max-h-44 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg divide-y divide-slate-800 z-10 shadow-lg">
                      <div className="p-1.5 bg-slate-950 text-[10px] text-slate-400 font-mono flex justify-between">
                        <span>
                          {selectedSaleLetter !== 'ALL'
                            ? `Medicines starting with "${selectedSaleLetter}" (${searchedMeds.length} items)`
                            : `Search results (${searchedMeds.length})`}
                        </span>
                        <span>Click item to Select</span>
                      </div>
                      {searchedMeds.map((med) => (
                        <div
                          key={med.id}
                          onClick={() => {
                            setSelectedMedId(med.id);
                            setSearchTerm('');
                          }}
                          className={`p-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition ${
                            selectedMedId === med.id ? 'bg-emerald-500/10' : ''
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white block">{med.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {med.genericName} • {med.packSize} • {med.type}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400 block">
                              ₹{med.sellingPrice || med.mrp}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              MRP ₹{med.mrp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active medicine summary & batch selection */}
                {currentMed && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="sm:col-span-5 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white">{currentMed.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {currentMed.type || 'Tablet'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate" title={currentMed.genericName}>
                        {currentMed.genericName} • {currentMed.packSize}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">
                          Strip: ₹{stripPrice.toFixed(2)}
                        </span>
                        {isTabletOrCapsule && (
                          <span className="text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            1 Tab: ₹{tabletPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Stock: {totalAvailableStock} strips ({totalAvailableTablets} tabs)
                        </span>
                      </div>
                    </div>

                    {/* Batch Selection */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Select Batch (FEFO Rule)</span>
                      </label>
                      {availableBatches.length > 0 ? (
                        <select
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:border-emerald-500 outline-none"
                        >
                          {availableBatches.map((b, i) => (
                            <option key={b.id} value={b.id}>
                              {b.batchNumber} (Exp: {b.expiryDate} • Avail: {Math.max(0, Math.round((b.quantity - alreadyInCartBatchPacks) * 100) / 100)} strips)
                              {i === 0 ? ' [Earliest]' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center space-x-1.5 py-0.5">
                          <span className="text-xs text-rose-400 font-semibold">0 in Stock</span>
                          {onQuickCreateBatch && (
                            <button
                              type="button"
                              onClick={() => {
                                onQuickCreateBatch(currentMed.id, 50, currentMed.mrp);
                                setSaleErrorNotice(`Quick-stocked 50 units for ${currentMed.name}. Click 'Add' now!`);
                              }}
                              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold"
                            >
                              ⚡ +50 Quick Stock
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Unit Selector: "Tablet ▼" or "Strip ▼" */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Unit
                      </label>
                      <select
                        value={saleUnit}
                        onChange={(e) => {
                          setSaleUnit(e.target.value as 'TABLET' | 'PACK');
                          setItemQuantity(1);
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-emerald-300 focus:border-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="TABLET">Tablet ▼</option>
                        <option value="PACK">Strip ▼</option>
                      </select>
                    </div>

                    {/* Quantity & Add Button */}
                    <div className="sm:col-span-3 flex items-center space-x-2">
                      <div className="w-20">
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={saleUnit === 'TABLET' ? remainingBatchStockTablets || 1 : Math.floor(remainingBatchStockPacks) || 1}
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                          disabled={remainingBatchStockPacks <= 0}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-center text-emerald-300 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart()}
                        disabled={remainingBatchStockPacks <= 0}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1 self-end shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Single Tablet / Strip Selection (Requirement 1 & 2) */}
                    {isTabletOrCapsule && (
                      <div className="sm:col-span-12 p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            {/* Clear Unit Selector: Tablet ▼ or Strip ▼ */}
                            <div className="flex items-center space-x-1.5">
                              <label className="text-xs font-bold text-slate-300">Unit:</label>
                              <select
                                value={saleUnit}
                                onChange={(e) => {
                                  setSaleUnit(e.target.value as 'TABLET' | 'PACK');
                                  setItemQuantity(1);
                                }}
                                className="px-2.5 py-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-xs font-bold text-emerald-300 outline-none cursor-pointer"
                              >
                                <option value="TABLET">Tablet ▼</option>
                                <option value="PACK">Strip ▼</option>
                              </select>
                            </div>

                            {/* Quantity Input */}
                            <div className="flex items-center space-x-1.5">
                              <label className="text-xs font-bold text-slate-300">Quantity:</label>
                              <input
                                type="number"
                                min="1"
                                value={itemQuantity}
                                onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-xs font-mono font-bold text-center text-white outline-none"
                              />
                            </div>
                          </div>

                          {/* Quick Selection Buttons for Tablets or Strips (Requirement 1) */}
                          <div className="flex items-center space-x-1 text-xs font-mono">
                            <span className="text-[10px] text-slate-400 font-sans mr-1">
                              {saleUnit === 'TABLET' ? 'Quick Tablets:' : 'Quick Strips:'}
                            </span>
                            {saleUnit === 'TABLET' ? (
                              [1, 2, 3, 4, 5, 10].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setItemQuantity(num)}
                                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                                    itemQuantity === num
                                      ? 'bg-emerald-400 text-slate-950 font-black shadow'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  {num} Tab{num > 1 ? 's' : ''}
                                </button>
                              ))
                            ) : (
                              [1, 2, 3, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setItemQuantity(num)}
                                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                                    itemQuantity === num
                                      ? 'bg-cyan-400 text-slate-950 font-black shadow'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  {num} Strip{num > 1 ? 's' : ''}
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Live Pricing & Stock Deduction Preview */}
                        <div className="flex flex-wrap items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/80">
                          <div className="text-slate-300">
                            {saleUnit === 'TABLET' ? (
                              <span>
                                Buying <strong className="text-emerald-300 font-bold">{itemQuantity} loose tablet(s)</strong> @{' '}
                                <strong className="text-white">₹{tabletPrice.toFixed(2)}/tab</strong> = Total{' '}
                                <strong className="text-emerald-400 font-bold">₹{(itemQuantity * tabletPrice).toFixed(2)}</strong>
                              </span>
                            ) : (
                              <span>
                                Buying <strong className="text-cyan-300 font-bold">{itemQuantity} pack(s)</strong> @{' '}
                                <strong className="text-white">₹{stripPrice.toFixed(2)}/pack</strong> = Total{' '}
                                <strong className="text-cyan-400 font-bold">₹{(itemQuantity * stripPrice).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            Deduction:{' '}
                            <strong className="text-rose-400 font-bold">
                              {saleUnit === 'TABLET'
                                ? `${(itemQuantity / tabletsPerPack).toFixed(2)} strip (${itemQuantity} tabs)`
                                : `${itemQuantity} strip(s)`}
                            </strong>{' '}
                            from batch stock
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Total Quantity Minus Customer Buy Indicator */}
                    <div className="sm:col-span-12 mt-1 px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Deduction Formula:</span>
                      </span>
                      <span className="text-slate-200">
                        Total Stock: <strong className="text-white font-bold">{totalAvailableStock}</strong> strips − Customer Buy:{' '}
                        <strong className="text-rose-400 font-bold">
                          {saleUnit === 'TABLET'
                            ? `${itemQuantity} loose tablet(s) (${(itemQuantity / tabletsPerPack).toFixed(2)} strip)`
                            : `${itemQuantity} pack(s)`}
                        </strong> = Remaining Stock:{' '}
                        <strong className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                          {saleUnit === 'TABLET'
                            ? `${Math.max(0, Math.round((totalAvailableStock - itemQuantity / tabletsPerPack) * 100) / 100)} strips`
                            : `${Math.max(0, totalAvailableStock - itemQuantity)} strips`}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CURRENT BILL ITEMS LIST (Multi-Item Table) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Purchased Items in this Bill ({cartItems.length} items)</span>
                  </h4>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Clear Bill
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                    No items in customer bill yet. Search and add medicines above to build a multi-item purchase.
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                          <th className="py-2 px-3">Medicine Description</th>
                          <th className="py-2 px-2 font-mono">Batch</th>
                          <th className="py-2 px-2 font-mono">Exp</th>
                          <th className="py-2 px-2 text-right font-mono">MRP</th>
                          <th className="py-2 px-2 text-right font-mono">Rate (₹)</th>
                          <th className="py-2 px-2 text-center">Qty to Minus</th>
                          <th className="py-2 px-3 text-right font-mono">Total (₹)</th>
                          <th className="py-2 px-2 text-center">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {cartItems.map((item) => (
                          <tr key={item.cartId} className="hover:bg-slate-900/40 transition">
                            <td className="py-2 px-3">
                              <span className="font-bold text-white block">{item.medicineName}</span>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  item.saleUnit === 'TABLET'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}>
                                  {item.saleUnit === 'TABLET' ? `${item.quantity} Loose Tab(s)` : `${item.quantity} Pack(s)`}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.genericName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 font-mono text-emerald-300 text-xs">{item.batchNumber}</td>
                            <td className="py-2 px-2 font-mono text-slate-400 text-[11px]">{item.expiryDate}</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-400">₹{item.mrp.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right font-mono text-white">
                              ₹{item.unitPrice.toFixed(2)}
                              <span className="text-[10px] text-slate-400 block font-sans">
                                {item.saleUnit === 'TABLET' ? '/tab' : '/pack'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.cartId, item.quantity - 1)}
                                  className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-xs flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="w-10 text-center font-mono font-bold text-emerald-300">
                                  {item.quantity} {item.saleUnit === 'TABLET' ? 'T' : 'P'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(item.cartId, item.quantity + 1)}
                                  className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-xs flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                -{item.equivalentPackDeduction} strip
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              ₹{item.lineTotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.cartId)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* OVERALL FINANCIAL BREAKDOWN & STOCK DEDUCTION PREVIEW */}
              {cartItems.length > 0 && (
                <div className="space-y-3">
                  {/* Delivery Location & Service in Modal */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Delivery & Location Service</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {deliveryType === 'COUNTER_PICKUP' ? 'Counter Pickup (₹0)' : `${deliveryDistanceKm} km: ${deliveryCalc.rateRuleDescription}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('COUNTER_PICKUP')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border cursor-pointer ${
                          deliveryType === 'COUNTER_PICKUP'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <Store className="w-3 h-3" />
                        <span>Counter Pickup</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('HOME_DELIVERY')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border cursor-pointer ${
                          deliveryType === 'HOME_DELIVERY'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <Truck className="w-3 h-3" />
                        <span>Home Delivery</span>
                      </button>
                    </div>

                    {deliveryType === 'HOME_DELIVERY' && (
                      <div className="space-y-2 pt-1 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px] font-sans">Distance (km):</span>
                          <span className="text-white font-bold">{deliveryDistanceKm} km</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="12.0"
                          step="0.1"
                          value={deliveryDistanceKm}
                          onChange={(e) => setDeliveryDistanceKm(parseFloat(e.target.value) || 0)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <button type="button" onClick={() => setDeliveryDistanceKm(2.5)} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300">2.5km (Free)</button>
                          <button type="button" onClick={() => setDeliveryDistanceKm(3.5)} className="px-2 py-0.5 rounded bg-slate-900 text-teal-300">3.5km (₹50)</button>
                          <button type="button" onClick={() => setDeliveryDistanceKm(5.0)} className="px-2 py-0.5 rounded bg-slate-900 text-teal-300">5km (₹60)</button>
                          <button type="button" onClick={() => setDeliveryDistanceKm(8.0)} className="px-2 py-0.5 rounded bg-slate-900 text-teal-300">8km (₹90)</button>
                          <button type="button" onClick={() => setDeliveryDistanceKm(12.0)} className="px-2 py-0.5 rounded bg-slate-900 text-teal-300">12km (₹130)</button>
                        </div>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Customer Delivery Address"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    {/* Left: Discount selector & Cash tender */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                          <span>Discount on Total Bill</span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            -₹{discountAmount.toFixed(2)}
                          </span>
                        </label>
                        <div className="flex items-center space-x-1.5">
                          {[0, 5, 10, 15].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountPercent(pct)}
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold font-mono transition ${
                                discountPercent === pct
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cash Tender & Change Return */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300">Customer Paid (₹):</span>
                          <button
                            type="button"
                            onClick={() => setAmountCustomerPaid(grandTotal)}
                            className="text-[10px] text-emerald-400 font-mono hover:underline"
                          >
                            Exact (₹{grandTotal})
                          </button>
                        </div>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={amountCustomerPaid || ''}
                          onChange={(e) => setAmountCustomerPaid(parseFloat(e.target.value) || 0)}
                          placeholder={`Enter amount paid (₹${grandTotal})`}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none"
                        />
                        <div className={`p-2 rounded-lg text-[11px] font-mono flex items-center justify-between ${
                          balanceToGiveCustomer > 0
                            ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                            : remainingCustomerOwes > 0 && amountCustomerPaid > 0
                            ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 text-slate-400'
                        }`}>
                          <span>{balanceToGiveCustomer > 0 ? 'Give Change to Customer:' : remainingCustomerOwes > 0 && amountCustomerPaid > 0 ? 'Customer Owes Balance:' : 'Payment Status:'}</span>
                          <span className="font-black text-xs">
                            {balanceToGiveCustomer > 0 ? `₹${balanceToGiveCustomer.toFixed(2)}` : remainingCustomerOwes > 0 && amountCustomerPaid > 0 ? `₹${remainingCustomerOwes.toFixed(2)}` : 'Exact Paid'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Overall Totals */}
                    <div className="space-y-1.5 text-xs font-mono justify-self-stretch flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)} units):</span>
                          <span className="text-slate-200">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Discount ({discountPercent}%):</span>
                            <span>-₹{discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Included GST Taxes:</span>
                          <span>₹{totalTaxAmount.toFixed(2)}</span>
                        </div>
                        {deliveryType === 'HOME_DELIVERY' && (
                          <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                            <span>Delivery ({deliveryDistanceKm} km):</span>
                            <span className={deliveryFee === 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                              {deliveryFee === 0 ? 'FREE (₹0)' : `₹${deliveryFee.toFixed(2)}`}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                        <span className="text-xs text-white font-sans font-bold">Overall Grand Total</span>
                        <span className="text-lg font-extrabold font-mono text-emerald-400">
                          ₹{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {cartItems.length} medicine {cartItems.length === 1 ? 'item' : 'items'} in bill
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSale}
                    disabled={cartItems.length === 0}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm & View Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteAndPrint}
                    disabled={cartItems.length === 0}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 transform active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Confirm Sale & Print Bill (Minus Stock)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
