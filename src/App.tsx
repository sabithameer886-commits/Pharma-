import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Medicine,
  Supplier,
  Batch,
  StockMovement,
  ScannedBillRecord,
  ExtractedMedicineItem,
  BillFinancialSummary,
  CustomerSale,
  UserRole,
} from './types';
import { Header, TabType } from './components/Header';
import { BillScannerView } from './components/BillScannerView';
import { ScannedBillsHistoryView } from './components/ScannedBillsHistoryView';
import { CustomerPurchaseView } from './components/CustomerPurchaseView';
import { MedicinesView } from './components/MedicinesView';
import { SuppliersView } from './components/SuppliersView';
import { StockMovementsView } from './components/StockMovementsView';
import { CustomerSaleModal } from './components/CustomerSaleModal';
import { UserLoginModal } from './components/UserLoginModal';
import { AiInventoryAnalysisView } from './components/AiInventoryAnalysisView';
import { AiRestockSupplierModal } from './components/AiRestockSupplierModal';
import { PharmacyAccountsView } from './components/PharmacyAccountsView';
import { ShieldCheck, HeartPulse, ShoppingCart } from 'lucide-react';
import { loadShopData, saveShopData, saveActiveSession, clearActiveSession, getActiveSession } from './utils/shopStorage';

export default function App() {
  // Start directly on the Bill Scanner tab
  const [activeTab, setActiveTab] = useState<TabType>('scanner');

  // User Authentication Session & Store Name
  const initialSession = useMemo(() => getActiveSession(), []);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return initialSession.isAuthenticated;
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return initialSession.email || 'pharmacist@sadimedical.com';
  });
  const [userPhone, setUserPhone] = useState<string>(() => {
    return initialSession.phone || '9876543210';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return initialSession.role || 'OWNER';
  });
  const [userName, setUserName] = useState<string>(() => {
    return initialSession.name || 'Sadi Pharmacist';
  });
  const [storeName, setStoreName] = useState<string>(() => {
    return initialSession.storeName || 'Sadi Medical';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);

  // Shop state management: 8,000 medicines (tablets, syrups, ointments, etc.) in alphabetical order,
  // shared across any email login for the same shop name
  const [isShopLoaded, setIsShopLoaded] = useState<boolean>(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [scannedBills, setScannedBills] = useState<ScannedBillRecord[]>([]);
  const [sales, setSales] = useState<CustomerSale[]>([]);

  // Customer Sale Modal state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false);
  const [saleTargetMedicineId, setSaleTargetMedicineId] = useState<string | undefined>(undefined);
  const [isLoadingBulk, setIsLoadingBulk] = useState<boolean>(false);

  // Initial load on component mount: load existing shop data or generate 8,000 alphabetical catalog
  useEffect(() => {
    const shopData = loadShopData(storeName);
    setMedicines(shopData.medicines);
    setSuppliers(shopData.suppliers);
    setBatches(shopData.batches);
    setMovements(shopData.movements);
    setScannedBills(shopData.scannedBills);
    setSales(shopData.sales);
    setIsShopLoaded(true);
  }, []);

  // Persist any updates back into the shop storage
  useEffect(() => {
    if (isShopLoaded && medicines.length > 0) {
      saveShopData(storeName, {
        medicines,
        batches,
        suppliers,
        scannedBills,
        movements,
        sales,
      });
    }
  }, [storeName, isShopLoaded, medicines, batches, suppliers, scannedBills, movements, sales]);

  // When user switches or updates store name, load that store's existing data
  const handleUpdateStoreName = (name: string) => {
    const targetStore = name.trim() || 'Sadi Medical';
    setStoreName(targetStore);
    try {
      localStorage.setItem('pharmabill_store_name', targetStore);
    } catch {}

    const existingData = loadShopData(targetStore);
    setMedicines(existingData.medicines);
    setSuppliers(existingData.suppliers);
    setBatches(existingData.batches);
    setMovements(existingData.movements);
    setScannedBills(existingData.scannedBills);
    setSales(existingData.sales);
  };

  // When user logs in with Email/Phone + Store
  const handleUserLogin = (
    email: string,
    store?: string,
    role: UserRole = 'OWNER',
    phone?: string,
    name?: string
  ) => {
    const cleanEmail = email.trim();
    const targetStore = (store || storeName).trim() || 'Sadi Medical';

    setUserEmail(cleanEmail);
    setStoreName(targetStore);
    setUserRole(role);
    if (phone) setUserPhone(phone);
    if (name) setUserName(name);

    saveActiveSession(cleanEmail, targetStore, role, phone, name);

    // Load that store's isolated database
    const existingData = loadShopData(targetStore);
    setMedicines(existingData.medicines);
    setSuppliers(existingData.suppliers);
    setBatches(existingData.batches);
    setMovements(existingData.movements);
    setScannedBills(existingData.scannedBills);
    setSales(existingData.sales);

    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  };

  const handleSignOut = () => {
    try {
      localStorage.setItem('pharmabill_auth_session_active', 'false');
    } catch {}
    clearActiveSession();
    setIsAuthenticated(false);
    setIsLoginModalOpen(true);
  };

  // Reload or refresh bulk medicines
  const handleLoadBulkMedicines = useCallback(() => {
    setIsLoadingBulk(true);
    setTimeout(() => {
      const refreshed = loadShopData(storeName);
      setMedicines(refreshed.medicines);
      setBatches(refreshed.batches);
      setIsLoadingBulk(false);
    }, 150);
  }, [storeName]);

  // Handle Customer Sale & reduce from the item total quantity minus purchased quantity
  const handleCompleteSale = (sale: CustomerSale) => {
    setSales((prev) => [sale, ...prev]);

    const newMovements: StockMovement[] = [];

    setBatches((prevBatches) => {
      const updated = [...prevBatches];

      for (const item of sale.items) {
        // Compute exact pack deduction: if sold as loose tablets (1, 2, 3), deduct fractional strip (e.g. 3/10 = 0.3)
        const packDeduction =
          item.equivalentPackDeduction !== undefined
            ? item.equivalentPackDeduction
            : item.saleUnit === 'TABLET'
            ? Math.round((item.quantity / (item.tabletsPerPack || 10)) * 1000) / 1000
            : item.quantity;

        let neededQty = packDeduction;

        // 1. Primary deduction from the specific chosen batch
        const batchIndex = updated.findIndex((b) => b.id === item.batchId);
        if (batchIndex !== -1 && updated[batchIndex].quantity > 0) {
          const b = updated[batchIndex];
          const deduct = Math.min(b.quantity, neededQty);
          const newQty = Math.max(0, Math.round((b.quantity - deduct) * 1000) / 1000);
          updated[batchIndex] = {
            ...b,
            quantity: newQty,
          };
          neededQty = Math.max(0, Math.round((neededQty - deduct) * 1000) / 1000);
        }

        // 2. Secondary deduction from any other batch of this same medicine if needed
        if (neededQty > 0) {
          for (let i = 0; i < updated.length && neededQty > 0; i++) {
            if (
              updated[i].medicineId === item.medicineId &&
              updated[i].id !== item.batchId &&
              updated[i].quantity > 0
            ) {
              const deduct = Math.min(updated[i].quantity, neededQty);
              const newQty = Math.max(0, Math.round((updated[i].quantity - deduct) * 1000) / 1000);
              updated[i] = {
                ...updated[i],
                quantity: newQty,
              };
              neededQty = Math.max(0, Math.round((neededQty - deduct) * 1000) / 1000);
            }
          }
        }

        // 3. Calculate total remaining stock for this medicine across all batches
        const remainingForMed = Math.round(
          updated
            .filter((b) => b.medicineId === item.medicineId)
            .reduce((sum, b) => sum + b.quantity, 0) * 100
        ) / 100;

        const openingStockForMed = Math.round((remainingForMed + packDeduction) * 100) / 100;

        const isTabletSale = item.saleUnit === 'TABLET';
        const saleDesc = isTabletSale
          ? `${item.quantity} loose tablet(s) (@ ₹${item.unitPrice.toFixed(2)}/tab)`
          : `${item.quantity} pack(s)`;

        newMovements.push({
          id: `mov-sale-${Date.now()}-${item.batchId}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          type: 'SALE',
          quantity: item.quantity,
          openingStock: openingStockForMed,
          currentStock: remainingForMed,
          referenceId: sale.invoiceNumber,
          notes: `Dispensed ${saleDesc} to customer ${sale.customerName} (${sale.paymentMethod}) • Stock before: ${openingStockForMed} − ${packDeduction} = ${remainingForMed} strips`,
        });
      }

      return updated;
    });

    if (newMovements.length > 0) {
      setMovements((prev) => [...newMovements, ...prev]);
    }
  };

  const handleOpenCustomerSale = (medId?: string) => {
    setSaleTargetMedicineId(medId);
    setIsSaleModalOpen(true);
  };

  // Handle Bill Inward Event
  const handleInwardSuccess = (
    newBatches: Batch[],
    newMovements: StockMovement[],
    invoiceData: {
      supplierName: string;
      supplierAddress?: string;
      supplierPhone?: string;
      supplierEmail?: string;
      supplierGstin?: string;
      supplierDlNumber?: string;
      invoiceNumber: string;
      totalAmount: number;
      billImage?: string;
      enhancedBillImage?: string;
      totalUnits: number;
      invoiceDate: string;
      purchaseDate?: string;
      paymentTerms?: string;
      dueDate?: string;
      uploadedDate: string;
      items: ExtractedMedicineItem[];
      totals: BillFinancialSummary;
      verificationFlags: string[];
      rawTextFormat?: string;
      amountPaidToSupplier?: number;
      balancePendingToSupplier?: number;
      supplierPaymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
      supplierPaymentMode?: string;
      supplierPaymentNotes?: string;
    },
    newMedicinesToRegister?: Medicine[],
    updatedExistingMedicines?: Array<{
      id: string;
      mrp?: number;
      sellingPrice?: number;
      isFromBill: boolean;
      lastInwardBillId: string;
      lastInwardDate: string;
    }>
  ) => {
    // 1. Add new batches
    setBatches((prev) => [...newBatches, ...prev]);

    // 2. Add new movements to ledger
    setMovements((prev) => [...newMovements, ...prev]);

    // 3. Register any new medicines extracted from the bill (preserve alphabetical order)
    if (newMedicinesToRegister && newMedicinesToRegister.length > 0) {
      setMedicines((prev) => {
        const combined = [...prev, ...newMedicinesToRegister];
        return combined.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      });
    }

    // 4. Update existing medicines with True MRP and bill inward dates
    if (updatedExistingMedicines && updatedExistingMedicines.length > 0) {
      setMedicines((prev) =>
        prev.map((med) => {
          const update = updatedExistingMedicines.find((u) => u.id === med.id);
          if (update) {
            return {
              ...med,
              mrp: update.mrp !== undefined ? update.mrp : med.mrp,
              sellingPrice: update.sellingPrice !== undefined ? update.sellingPrice : med.sellingPrice,
              isFromBill: true,
              lastInwardBillId: update.lastInwardBillId,
              lastInwardDate: update.lastInwardDate,
            };
          }
          return med;
        })
      );
    }

    // Calculate payment settlement details for supplier
    const amountPaid = invoiceData.amountPaidToSupplier !== undefined ? invoiceData.amountPaidToSupplier : invoiceData.totalAmount;
    const balancePending = invoiceData.balancePendingToSupplier !== undefined ? invoiceData.balancePendingToSupplier : 0;
    const paymentStatus = invoiceData.supplierPaymentStatus || (balancePending === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING');

    // 5. Update or Register Supplier total purchases & balances
    setSuppliers((prev) => {
      const match = prev.find(
        (s) =>
          (invoiceData.supplierGstin && s.gstin && s.gstin.trim().toUpperCase() === invoiceData.supplierGstin.trim().toUpperCase()) ||
          s.name.toLowerCase().includes(invoiceData.supplierName.toLowerCase()) ||
          invoiceData.supplierName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (match) {
        return prev.map((s) =>
          s.id === match.id
            ? {
                ...s,
                totalPurchases: s.totalPurchases + invoiceData.totalAmount,
                totalPaid: (s.totalPaid || 0) + amountPaid,
                totalPending: (s.totalPending || 0) + balancePending,
                phone: invoiceData.supplierPhone || s.phone,
                email: invoiceData.supplierEmail || s.email,
                address: invoiceData.supplierAddress || s.address,
                gstin: invoiceData.supplierGstin || s.gstin,
                dlNumber: invoiceData.supplierDlNumber || s.dlNumber,
              }
            : s
        );
      } else {
        const newSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          name: invoiceData.supplierName,
          phone: invoiceData.supplierPhone || '',
          email: invoiceData.supplierEmail || '',
          address: invoiceData.supplierAddress || '',
          gstin: invoiceData.supplierGstin || '',
          dlNumber: invoiceData.supplierDlNumber || '',
          totalPurchases: invoiceData.totalAmount,
          totalPaid: amountPaid,
          totalPending: balancePending,
          rating: 5.0,
        };
        return [...prev, newSupplier];
      }
    });

    // 6. Record in Scanned Bills Archive
    const newBillRecord: ScannedBillRecord = {
      id: `bill-rec-${Date.now()}`,
      invoiceNumber: invoiceData.invoiceNumber,
      supplierName: invoiceData.supplierName,
      supplierGstin: invoiceData.supplierGstin,
      supplierAddress: invoiceData.supplierAddress,
      supplierPhone: invoiceData.supplierPhone,
      supplierEmail: invoiceData.supplierEmail,
      supplierDlNumber: invoiceData.supplierDlNumber,
      invoiceDate: invoiceData.invoiceDate,
      uploadedDate: invoiceData.uploadedDate,
      dueDate: invoiceData.dueDate,
      paymentTerms: invoiceData.paymentTerms,
      totalAmount: invoiceData.totalAmount,
      totalItemsCount: invoiceData.items.length,
      totalUnitsCount: invoiceData.totalUnits,
      billImage: invoiceData.billImage,
      enhancedBillImage: invoiceData.enhancedBillImage,
      status: 'VERIFIED_INWARDED',
      amountPaidToSupplier: amountPaid,
      balancePendingToSupplier: balancePending,
      supplierPaymentStatus: paymentStatus,
      supplierPaymentMode: (invoiceData.supplierPaymentMode as any) || 'BANK_TRANSFER',
      paymentNotes: invoiceData.supplierPaymentNotes,
      items: invoiceData.items,
      totals: invoiceData.totals,
      verificationFlags: invoiceData.verificationFlags,
      rawTextFormat: invoiceData.rawTextFormat,
      createdAt: new Date().toISOString(),
    };

    setScannedBills((prev) => [newBillRecord, ...prev]);

    // Automatically navigate to the main inventory interface after verifying and inwarding
    setActiveTab('medicines');
  };

  // Update supplier payment for a bill (e.g. paying dues in Accounts or History)
  const handleUpdateSupplierPayment = (
    billId: string,
    additionalPaid: number,
    paymentMode: string,
    notes?: string
  ) => {
    let affectedBill: ScannedBillRecord | undefined;

    setScannedBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        affectedBill = b;
        const currentPaid = b.amountPaidToSupplier !== undefined ? b.amountPaidToSupplier : b.totalAmount;
        const newPaid = Math.min(b.totalAmount, currentPaid + additionalPaid);
        const newBalance = Math.max(0, b.totalAmount - newPaid);
        const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
        return {
          ...b,
          amountPaidToSupplier: newPaid,
          balancePendingToSupplier: newBalance,
          supplierPaymentStatus: newStatus,
          supplierPaymentMode: (paymentMode as any) || b.supplierPaymentMode,
          paymentNotes: notes ? `${b.paymentNotes ? b.paymentNotes + '; ' : ''}${notes}` : b.paymentNotes,
        };
      })
    );

    if (affectedBill) {
      const targetName = (affectedBill as ScannedBillRecord).supplierName.toLowerCase();
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.name.toLowerCase() !== targetName) return s;
          const curPaid = s.totalPaid || 0;
          const curPending = s.totalPending || 0;
          return {
            ...s,
            totalPaid: curPaid + additionalPaid,
            totalPending: Math.max(0, curPending - additionalPaid),
          };
        })
      );
    }
  };

  // Full Editing: Update Medicine in Catalog
  const handleUpdateMedicine = (updatedMed: Medicine) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === updatedMed.id ? updatedMed : m))
    );
  };

  // Bulk update medicines (for AI Categorization)
  const handleBulkUpdateMedicines = (updatedList: Medicine[]) => {
    setMedicines(updatedList);
  };

  // Explicit user deletion of scanned bills
  const handleDeleteBill = (billId: string) => {
    setScannedBills((prev) => prev.filter((b) => b.id !== billId));
  };

  // Explicit user deletion of customer sales bills
  const handleDeleteSale = (saleId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  // Insert Medicine directly into Catalog (with initial batch & inward movement)
  const handleInsertMedicine = (
    newMed: Medicine,
    initialBatch?: {
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
      quantity: number;
      purchasePrice: number;
      mrp: number;
    }
  ) => {
    // 1. Add to medicines catalog in alphabetical order
    setMedicines((prev) => {
      const exists = prev.some((m) => m.id === newMed.id);
      const list = exists ? prev.map((m) => (m.id === newMed.id ? newMed : m)) : [...prev, newMed];
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    });

    // 2. If initial batch details provided, create Batch & Movement
    if (initialBatch && initialBatch.quantity > 0) {
      const batchId = `batch-init-${Date.now()}`;
      const newBatch: Batch = {
        id: batchId,
        medicineId: newMed.id,
        batchNumber: initialBatch.batchNumber.trim().toUpperCase() || `BN-${Date.now().toString().slice(-4)}`,
        mfgDate: initialBatch.mfgDate || new Date().toISOString().slice(0, 7),
        expiryDate: initialBatch.expiryDate || '2028-06-30',
        quantity: initialBatch.quantity,
        initialQuantity: initialBatch.quantity,
        purchasePrice: initialBatch.purchasePrice || newMed.purchasePrice,
        mrp: initialBatch.mrp || newMed.mrp,
        supplierId: 'sup-direct',
        supplierName: 'Direct Catalog Entry',
        invoiceNumber: 'DIRECT-CATALOG',
        receivedDate: new Date().toISOString().split('T')[0],
      };

      setBatches((prev) => [newBatch, ...prev]);

      const movement: StockMovement = {
        id: `mov-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        medicineId: newMed.id,
        medicineName: newMed.name,
        batchId,
        batchNumber: newBatch.batchNumber,
        type: 'PURCHASE',
        quantity: initialBatch.quantity,
        openingStock: 0,
        currentStock: initialBatch.quantity,
        referenceId: 'DIRECT-ENTRY',
        notes: `Direct medicine catalog insertion • Batch ${newBatch.batchNumber} • Expiry ${newBatch.expiryDate}`,
      };

      setMovements((prev) => [movement, ...prev]);
    }
  };

  // Quick Create Batch for POS billing if medicine is out of stock
  const handleQuickCreateBatch = (medicineId: string, quantity = 50, mrp?: number) => {
    const med = medicines.find((m) => m.id === medicineId);
    if (!med) return;
    const batchId = `batch-pos-${Date.now()}`;
    const effectiveMrp = mrp || med.mrp || 100;
    const newBatch: Batch = {
      id: batchId,
      medicineId: med.id,
      batchNumber: `BN-POS-${Math.floor(1000 + Math.random() * 9000)}`,
      mfgDate: new Date().toISOString().slice(0, 7),
      expiryDate: new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0],
      quantity,
      initialQuantity: quantity,
      purchasePrice: med.purchasePrice || Math.round(effectiveMrp * 0.7),
      mrp: effectiveMrp,
      supplierId: 'sup-pos',
      supplierName: 'Emergency POS Stock Addition',
      invoiceNumber: 'POS-QUICK-STOCK',
      receivedDate: new Date().toISOString().split('T')[0],
    };
    setBatches((prev) => [newBatch, ...prev]);
  };

  // Full Editing: Save or Update Supplier
  const handleSaveSupplier = (supplierToSave: Supplier) => {
    setSuppliers((prev) => {
      const idx = prev.findIndex((s) => s.id === supplierToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = supplierToSave;
        return copy;
      }
      return [...prev, supplierToSave];
    });
  };

  // Full Editing: Delete Supplier
  const handleDeleteSupplier = (supplierId: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
  };

  // Calculate live alert count for low-stock, out-of-stock, and expired items
  const aiAlertsCount = useMemo(() => {
    const stockMap = new Map<string, number>();
    for (const b of batches) {
      if (b.quantity > 0) {
        stockMap.set(b.medicineId, (stockMap.get(b.medicineId) || 0) + b.quantity);
      }
    }
    let count = 0;
    for (const m of medicines) {
      const st = stockMap.get(m.id) || 0;
      if (st <= (m.minStockAlert || 30)) count++;
    }
    const todayMs = Date.now();
    for (const b of batches) {
      if (b.quantity > 0 && new Date(b.expiryDate).getTime() < todayMs) count++;
    }
    return count;
  }, [medicines, batches]);

  // If not authenticated, require store login and prevent access to protected store pages
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
          <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  PharmaBill AI System
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">
                  Pharmaceutical Stock Control, Bill OCR & POS
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Store Portal</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <UserLoginModal
            isOpen={true}
            onLogin={handleUserLogin}
            currentEmail={userEmail}
            currentStoreName={storeName}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewScan={() => setActiveTab('scanner')}
        onOpenCustomerSale={() => handleOpenCustomerSale()}
        onOpenRestock={() => setIsRestockModalOpen(true)}
        totalBillsCount={scannedBills.length}
        totalMedicinesCount={medicines.length}
        aiAlertsCount={aiAlertsCount}
        storeName={storeName}
        onUpdateStoreName={handleUpdateStoreName}
        userEmail={userEmail}
        userPhone={userPhone}
        userRole={userRole}
        userName={userName}
        onSignOut={handleSignOut}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 py-3.5 sm:py-4.5">
        {/* Scanner View is kept in DOM so navigating between tabs never loses active bill data or camera */}
        <div className={activeTab === 'scanner' ? 'block' : 'hidden'}>
          <BillScannerView
            medicines={medicines}
            suppliers={suppliers}
            storeName={storeName}
            onInwardSuccess={handleInwardSuccess}
            onViewHistory={() => setActiveTab('history')}
            onSaveSupplier={handleSaveSupplier}
            onNavigateTab={setActiveTab}
            onOpenCustomerSale={handleOpenCustomerSale}
          />
        </div>

        {activeTab === 'customer-purchase' && (
          <CustomerPurchaseView
            medicines={medicines}
            batches={batches}
            suppliers={suppliers}
            storeName={storeName}
            onCompleteSale={handleCompleteSale}
            onNavigateTab={setActiveTab}
            onQuickCreateBatch={handleQuickCreateBatch}
          />
        )}

        {activeTab === 'accounts' && (
          <PharmacyAccountsView
            medicines={medicines}
            suppliers={suppliers}
            batches={batches}
            bills={scannedBills}
            sales={sales}
            storeName={storeName}
            onUpdateSupplierPayment={handleUpdateSupplierPayment}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'history' && (
          <ScannedBillsHistoryView
            bills={scannedBills}
            sales={sales}
            onOpenScanner={() => setActiveTab('scanner')}
            onOpenSaleModal={() => handleOpenCustomerSale()}
            onDeleteBill={handleDeleteBill}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {activeTab === 'medicines' && (
          <MedicinesView
            medicines={medicines}
            batches={batches}
            onScanNewBill={() => setActiveTab('scanner')}
            onOpenCustomerSale={handleOpenCustomerSale}
            onLoadBulkMedicines={handleLoadBulkMedicines}
            onUpdateMedicine={handleUpdateMedicine}
            onBulkUpdateMedicines={handleBulkUpdateMedicines}
            onInsertMedicine={handleInsertMedicine}
            isLoadingBulk={isLoadingBulk}
          />
        )}

        {activeTab === 'ai-analysis' && (
          <AiInventoryAnalysisView
            medicines={medicines}
            batches={batches}
            suppliers={suppliers}
            onOpenCustomerSale={handleOpenCustomerSale}
            onOpenRestockModal={() => setIsRestockModalOpen(true)}
            onScanNewBill={() => setActiveTab('scanner')}
            onInwardNeededMedicines={() => {
              setActiveTab('scanner');
            }}
            onQuickRestock={(medicineId, qty) => {
              handleQuickCreateBatch(medicineId, qty);
            }}
            onUpdateMedicine={handleUpdateMedicine}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            bills={scannedBills}
            onScanNewBill={() => setActiveTab('scanner')}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        )}

        {activeTab === 'movements' && (
          <StockMovementsView
            movements={movements}
            onScanNewBill={() => setActiveTab('scanner')}
          />
        )}
      </main>

      {/* Customer Sale Modal (POS with live batch deduction) */}
      <CustomerSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setActiveTab('medicines');
        }}
        medicines={medicines}
        batches={batches}
        initialMedicineId={saleTargetMedicineId}
        storeName={storeName}
        onCompleteSale={handleCompleteSale}
        onQuickCreateBatch={handleQuickCreateBatch}
      />

      {/* AI Restock from Supplier Modal */}
      <AiRestockSupplierModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        medicines={medicines}
        batches={batches}
        suppliers={suppliers}
        storeName={storeName}
        userEmail={userEmail}
      />

      {/* User Login Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleUserLogin}
        currentEmail={userEmail}
        currentStoreName={storeName}
      />

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-4 text-center text-xs text-slate-400">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">PharmaBill AI System</span>
            <span className="text-slate-500">•</span>
            <span>Intelligent Pharmaceutical Document Scanner, Stock Control & Customer POS</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
            <button
              onClick={() => handleOpenCustomerSale()}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Dispense / Sell Medicine</span>
            </button>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drug License & GSTIN Audited</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
