import React, { useState, useMemo } from 'react';
import {
  Pill,
  Search,
  Plus,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building2,
  Tag,
  ShoppingCart,
  Database,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Filter,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  Edit2,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { Medicine, Batch, MedicineType, InventoryCategory } from '../types';
import { LowStockExpiryNotificationWidget } from './LowStockExpiryNotificationWidget';
import { CategoryEditModal } from './CategoryEditModal';
import { AiInventoryAnalysisModal, AiInventoryAnalysisData } from './AiInventoryAnalysisModal';
import { computeLocalAiInventoryAnalysis } from '../utils/aiInventoryAuditor';

export type CategoryFilterKey =
  | 'ALL'
  | 'EXPIRED'
  | 'EXPIRING'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVERSTOCKED'
  | 'REORDER_NEEDED'
  | 'CUSTOM_TAGGED';

interface MedicinesViewProps {
  medicines: Medicine[];
  batches: Batch[];
  onScanNewBill: () => void;
  onOpenCustomerSale: (medicineId?: string) => void;
  onLoadBulkMedicines?: () => void;
  onUpdateMedicine?: (medicine: Medicine) => void;
  onBulkUpdateMedicines?: (updatedList: Medicine[]) => void;
  onInsertMedicine?: (
    newMed: Medicine,
    initialBatch?: {
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
      quantity: number;
      purchasePrice: number;
      mrp: number;
    }
  ) => void;
  isLoadingBulk?: boolean;
}

const ITEMS_PER_PAGE = 24;
const ALPHABET_LIST = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const DOSAGE_TYPES_LIST: Array<'ALL' | MedicineType> = [
  'ALL',
  'Syrup',
  'Tablet',
  'Ointment',
  'Capsule',
  'Injection',
  'Drops',
  'Inhaler',
  'Gel',
  'Cream',
  'Powder',
  'Suspension',
  'Other',
];

export const MedicinesView: React.FC<MedicinesViewProps> = ({
  medicines,
  batches,
  onScanNewBill,
  onOpenCustomerSale,
  onLoadBulkMedicines,
  onUpdateMedicine,
  onBulkUpdateMedicines,
  onInsertMedicine,
  isLoadingBulk = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [stockThreshold, setStockThreshold] = useState<number>(30);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterKey>('ALL');
  const [sortOrder, setSortOrder] = useState<
    'ALPHA_ASC' | 'ALPHA_DESC' | 'TYPE_GROUP' | 'STOCK_LOW' | 'STOCK_HIGH' | 'PRICE_LOW' | 'PRICE_HIGH'
  >('ALPHA_ASC');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // AI Inventory Analysis Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AiInventoryAnalysisData | null>(null);

  // Category Edit Modal State
  const [categoryModalMed, setCategoryModalMed] = useState<Medicine | null>(null);

  // Computed alert filter to keep LowStockExpiryNotificationWidget perfectly in sync
  const activeAlertFilter: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' =
    selectedCategory === 'LOW_STOCK' || selectedCategory === 'EXPIRING' || selectedCategory === 'EXPIRED'
      ? selectedCategory
      : 'ALL';

  const handleAlertFilterChange = (f: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED') => {
    setSelectedCategory(f);
    setCurrentPage(1);
  };

  // Insert New Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGeneric, setAddGeneric] = useState('');
  const [addType, setAddType] = useState<MedicineType>('Tablet');
  const [addManufacturer, setAddManufacturer] = useState('Pharma Labs Ltd');
  const [addPackSize, setAddPackSize] = useState('10 Tablets / Strip');
  const [addMrp, setAddMrp] = useState<number>(120);
  const [addPurchasePrice, setAddPurchasePrice] = useState<number>(80);
  const [addSellingPrice, setAddSellingPrice] = useState<number>(114);
  const [addMinStock, setAddMinStock] = useState<number>(30);
  const [addBatchNumber, setAddBatchNumber] = useState('');
  const [addExpiryDate, setAddExpiryDate] = useState('2028-06-30');
  const [addMfgDate, setAddMfgDate] = useState('2025-06');
  const [addInitialStock, setAddInitialStock] = useState<number>(100);
  const [addSuccessNotice, setAddSuccessNotice] = useState<string | null>(null);

  // Edit medicine modal state
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [editName, setEditName] = useState('');
  const [editGeneric, setEditGeneric] = useState('');
  const [editType, setEditType] = useState<MedicineType>('Tablet');
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(30);
  const [editPackSize, setEditPackSize] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');

  // Fast O(1) batch & stock lookup maps
  const { stockMap, medicineBatchesMap } = useMemo(() => {
    const sMap = new Map<string, number>();
    const bMap = new Map<string, Batch[]>();

    for (const b of batches) {
      sMap.set(b.medicineId, (sMap.get(b.medicineId) || 0) + b.quantity);

      const existing = bMap.get(b.medicineId);
      if (existing) {
        existing.push(b);
      } else {
        bMap.set(b.medicineId, [b]);
      }
    }

    return { stockMap: sMap, medicineBatchesMap: bMap };
  }, [batches]);

  const todayTime = useMemo(() => new Date().getTime(), []);
  const ninetyDaysMs = 90 * 86400000;

  // Pre-calculate medicine count per alphabet letter for instant badge display
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('ALL', medicines.length);

    for (const m of medicines) {
      const firstChar = m.name.trim().charAt(0).toUpperCase();
      if (firstChar >= 'A' && firstChar <= 'Z') {
        counts.set(firstChar, (counts.get(firstChar) || 0) + 1);
      }
    }
    return counts;
  }, [medicines]);

  // Pre-calculate medicine count per formulation type
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('ALL', medicines.length);

    for (const m of medicines) {
      counts.set(m.type, (counts.get(m.type) || 0) + 1);
    }
    return counts;
  }, [medicines]);

  // Pre-calculate counts for Smart AI & Inventory Categories
  const categoryCounts = useMemo(() => {
    let expired = 0;
    let nearExpiry = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let overstocked = 0;
    let reorderNeeded = 0;
    let customTagged = 0;

    for (const m of medicines) {
      const stock = stockMap.get(m.id) || 0;
      const mBatches = medicineBatchesMap.get(m.id) || [];
      const threshold = stockThreshold > 0 ? stockThreshold : (m.minStockAlert || 30);

      const hasExpired =
        mBatches.some((b) => b.quantity > 0 && new Date(b.expiryDate).getTime() < todayTime) ||
        (m.aiCategories && m.aiCategories.includes('EXPIRED'));
      const hasNearExp =
        mBatches.some((b) => {
          if (b.quantity <= 0) return false;
          const diff = new Date(b.expiryDate).getTime() - todayTime;
          return diff >= 0 && diff <= ninetyDaysMs;
        }) || (m.aiCategories && m.aiCategories.includes('EXPIRING_SOON'));
      const isOut = stock === 0 || (m.aiCategories && m.aiCategories.includes('OUT_OF_STOCK'));
      const isLow =
        (stock > 0 && stock <= threshold) || (m.aiCategories && m.aiCategories.includes('LOW_STOCK'));
      const isOver =
        stock > threshold * 3 || (m.aiCategories && m.aiCategories.includes('OVERSTOCKED'));
      const isReorder = isLow || isOut || (m.aiCategories && m.aiCategories.includes('REORDER_NEEDED'));
      const isCustom = Boolean(m.customCategory) || (m.aiCategories && m.aiCategories.length > 0);

      if (hasExpired) expired++;
      if (hasNearExp) nearExpiry++;
      if (isOut) outOfStock++;
      if (isLow) lowStock++;
      if (isOver) overstocked++;
      if (isReorder) reorderNeeded++;
      if (isCustom) customTagged++;
    }

    return {
      ALL: medicines.length,
      EXPIRED: expired,
      EXPIRING: nearExpiry,
      LOW_STOCK: lowStock,
      OUT_OF_STOCK: outOfStock,
      OVERSTOCKED: overstocked,
      REORDER_NEEDED: reorderNeeded,
      CUSTOM_TAGGED: customTagged,
    };
  }, [medicines, stockMap, medicineBatchesMap, stockThreshold, todayTime, ninetyDaysMs]);

  // Filtered medicines list
  const filteredMeds = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const list = medicines.filter((m) => {
      // 1. Search matching
      if (search) {
        const matchesName = m.name.toLowerCase().includes(search);
        const matchesGeneric = m.genericName.toLowerCase().includes(search);
        const matchesMfg = m.manufacturer.toLowerCase().includes(search);
        const matchesBarcode = m.barcode ? m.barcode.includes(search) : false;
        if (!matchesName && !matchesGeneric && !matchesMfg && !matchesBarcode) {
          return false;
        }
      }

      // 2. Alphabet Filter (A, B, C...)
      if (selectedLetter !== 'ALL') {
        const firstLetter = m.name.trim().charAt(0).toUpperCase();
        if (firstLetter !== selectedLetter) {
          return false;
        }
      }

      // 3. Formulation Dosage Type matching (Syrup, Tablet, Ointment, etc.)
      if (selectedType !== 'ALL' && m.type !== selectedType) {
        return false;
      }

      // 4. Category & AI Alert filter matching
      const currentStock = stockMap.get(m.id) || 0;
      const medBatches = medicineBatchesMap.get(m.id) || [];
      const effectiveThreshold = stockThreshold > 0 ? stockThreshold : (m.minStockAlert || 30);
      const isLowStock = currentStock > 0 && currentStock <= effectiveThreshold;
      const isOutOfStock = currentStock === 0;
      const isOverstocked = currentStock > effectiveThreshold * 3;
      const hasExpired = medBatches.some((b) => b.quantity > 0 && new Date(b.expiryDate).getTime() < todayTime);
      const hasExpiringSoon = medBatches.some((b) => {
        if (b.quantity <= 0) return false;
        const diff = new Date(b.expiryDate).getTime() - todayTime;
        return diff >= 0 && diff <= ninetyDaysMs;
      });
      const hasCategoryTag = (cat: string) =>
        (m.aiCategories && m.aiCategories.includes(cat as any)) ||
        (m.customCategory && m.customCategory.toLowerCase().includes(cat.toLowerCase()));

      if (selectedCategory === 'LOW_STOCK') {
        if (!isLowStock && !hasCategoryTag('LOW_STOCK')) return false;
      } else if (selectedCategory === 'EXPIRING') {
        if (!hasExpiringSoon && !hasCategoryTag('EXPIRING_SOON') && !hasCategoryTag('EXPIRING')) return false;
      } else if (selectedCategory === 'EXPIRED') {
        if (!hasExpired && !hasCategoryTag('EXPIRED')) return false;
      } else if (selectedCategory === 'OUT_OF_STOCK') {
        if (!isOutOfStock && !hasCategoryTag('OUT_OF_STOCK')) return false;
      } else if (selectedCategory === 'OVERSTOCKED') {
        if (!isOverstocked && !hasCategoryTag('OVERSTOCKED')) return false;
      } else if (selectedCategory === 'REORDER_NEEDED') {
        if (!isLowStock && !isOutOfStock && !hasCategoryTag('REORDER_NEEDED')) return false;
      } else if (selectedCategory === 'CUSTOM_TAGGED') {
        const isCustom = Boolean(m.customCategory) || (m.aiCategories && m.aiCategories.length > 0);
        if (!isCustom) return false;
      }

      return true;
    });

    // Sort medicines
    return list.sort((a, b) => {
      if (sortOrder === 'ALPHA_ASC') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortOrder === 'ALPHA_DESC') {
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      }
      if (sortOrder === 'TYPE_GROUP') {
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0) return typeCompare;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortOrder === 'STOCK_LOW') {
        const stockA = stockMap.get(a.id) || 0;
        const stockB = stockMap.get(b.id) || 0;
        return stockA - stockB;
      }
      if (sortOrder === 'STOCK_HIGH') {
        const stockA = stockMap.get(a.id) || 0;
        const stockB = stockMap.get(b.id) || 0;
        return stockB - stockA;
      }
      if (sortOrder === 'PRICE_LOW') {
        return a.mrp - b.mrp;
      }
      if (sortOrder === 'PRICE_HIGH') {
        return b.mrp - a.mrp;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [
    medicines,
    searchTerm,
    selectedLetter,
    selectedType,
    selectedCategory,
    sortOrder,
    stockMap,
    medicineBatchesMap,
    stockThreshold,
    todayTime,
    ninetyDaysMs,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMeds.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMeds = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredMeds.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMeds, safeCurrentPage]);

  // Reset to page 1 on search or filter change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (t: string) => {
    setSelectedType(t);
    setCurrentPage(1);
  };

  const handleLetterChange = (letter: string) => {
    setSelectedLetter(letter);
    if (letter !== 'ALL') {
      if (selectedCategory !== 'ALL') setSelectedCategory('ALL');
    }
    setCurrentPage(1);
  };

  const handleCategoryChange = (c: CategoryFilterKey) => {
    setSelectedCategory(c);
    setCurrentPage(1);
  };

  // Run AI Inventory Analysis & Categorization
  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    setIsAiModalOpen(true);
    try {
      const summary = medicines.slice(0, 120).map((m) => {
        const stock = stockMap.get(m.id) || 0;
        const mBatches = medicineBatchesMap.get(m.id) || [];
        const nearestExpBatch = mBatches
          .filter((b) => b.quantity > 0)
          .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
        return {
          id: m.id,
          name: m.name,
          generic: m.genericName,
          type: m.type,
          stock,
          minAlert: m.minStockAlert || 30,
          mrp: m.mrp,
          nearestExpiry: nearestExpBatch ? nearestExpBatch.expiryDate : 'N/A',
          hasExpired: mBatches.some((b) => b.quantity > 0 && new Date(b.expiryDate).getTime() < todayTime),
        };
      });

      const res = await fetch('/api/analyze-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventorySummary: summary }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysisResult(data);
      } else {
        throw new Error('API returned status ' + res.status);
      }
    } catch (err) {
      console.warn('Falling back to local heuristic AI auditor:', err);
      const localData = computeLocalAiInventoryAnalysis(
        medicines,
        batches,
        stockMap,
        medicineBatchesMap,
        todayTime,
        ninetyDaysMs
      );
      setAiAnalysisResult(localData);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply all AI categories directly to medicines
  const handleApplyAllAiCategories = (categorizations: AiInventoryAnalysisData['categorizations']) => {
    const catMap = new Map<string, { categories: string[]; reason: string }>();
    for (const c of categorizations) {
      catMap.set(c.medicineId, { categories: c.categories, reason: c.reason });
    }

    const updatedList = medicines.map((m) => {
      const found = catMap.get(m.id);
      if (found) {
        return {
          ...m,
          aiCategories: found.categories as InventoryCategory[],
          aiReason: found.reason,
        };
      }
      return m;
    });

    if (onBulkUpdateMedicines) {
      onBulkUpdateMedicines(updatedList);
    } else if (onUpdateMedicine) {
      updatedList.forEach((m) => onUpdateMedicine(m));
    }
  };

  // Save single medicine category
  const handleSaveSingleCategory = (
    medicineId: string,
    customCategory: string,
    aiCategories: InventoryCategory[]
  ) => {
    const target = medicines.find((m) => m.id === medicineId);
    if (!target || !onUpdateMedicine) return;
    onUpdateMedicine({
      ...target,
      customCategory: customCategory || undefined,
      aiCategories: aiCategories.length > 0 ? aiCategories : undefined,
    });
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setEditName(med.name);
    setEditGeneric(med.genericName);
    setEditType(med.type);
    setEditMrp(med.mrp);
    setEditPurchasePrice(med.purchasePrice);
    setEditSellingPrice(med.sellingPrice || med.mrp);
    setEditMinStock(med.minStockAlert || 30);
    setEditPackSize(med.packSize);
    setEditManufacturer(med.manufacturer);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMed) return;

    const updatedMed: Medicine = {
      ...editingMed,
      name: editName.trim(),
      genericName: editGeneric.trim(),
      type: editType,
      mrp: Number(editMrp) || editingMed.mrp,
      purchasePrice: Number(editPurchasePrice) || editingMed.purchasePrice,
      sellingPrice: Number(editSellingPrice) || editingMed.sellingPrice,
      minStockAlert: Number(editMinStock) || 30,
      packSize: editPackSize.trim() || editingMed.packSize,
      manufacturer: editManufacturer.trim() || editingMed.manufacturer,
    };

    if (onUpdateMedicine) {
      onUpdateMedicine(updatedMed);
    }
    setEditingMed(null);
  };

  const handleSaveNewMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;

    const newMedId = `med-cat-${Date.now()}`;
    const newMed: Medicine = {
      id: newMedId,
      name: addName.trim(),
      genericName: addGeneric.trim() || 'Prescription Formulation',
      type: addType,
      manufacturer: addManufacturer.trim() || 'Pharma Labs Ltd',
      strength: 'Standard',
      packSize: addPackSize.trim() || '10 Tablets / Strip',
      mrp: Number(addMrp) || 100,
      purchasePrice: Number(addPurchasePrice) || 70,
      sellingPrice: Number(addSellingPrice) || Math.round((Number(addMrp) || 100) * 0.95 * 100) / 100,
      discountPercent: 5,
      gstPercent: 12,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      classification: 'OTC',
      minStockAlert: Number(addMinStock) || 30,
      createdAt: new Date().toISOString().split('T')[0],
      isFromBill: false,
    };

    if (onInsertMedicine) {
      onInsertMedicine(newMed, {
        batchNumber: addBatchNumber.trim().toUpperCase() || `BN-${Math.floor(1000 + Math.random() * 9000)}`,
        mfgDate: addMfgDate,
        expiryDate: addExpiryDate,
        quantity: Number(addInitialStock) || 0,
        purchasePrice: Number(addPurchasePrice) || 70,
        mrp: Number(addMrp) || 100,
      });
    }

    setAddSuccessNotice(`Inserted "${newMed.name}" into inventory with ${addInitialStock} units!`);
    setTimeout(() => {
      setAddSuccessNotice(null);
      setIsAddModalOpen(false);
      setAddName('');
      setAddGeneric('');
      setAddBatchNumber('');
    }, 1200);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Dashboard Widget: Low Stock & Expiry Notification System */}
      <LowStockExpiryNotificationWidget
        medicines={medicines}
        batches={batches}
        stockThreshold={stockThreshold}
        onThresholdChange={setStockThreshold}
        activeFilter={activeAlertFilter}
        onFilterChange={handleAlertFilterChange}
        onScanNewBill={onScanNewBill}
        onOpenCustomerSale={onOpenCustomerSale}
      />

      {/* 2. Top Header & 15,000 Database Loader */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Pill className="w-5 h-5 text-emerald-400" />
            <span>Pharmacy Catalog & Batch Inventory</span>
            <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 font-mono text-xs rounded-full border border-slate-700">
              {medicines.length.toLocaleString()} Medicines
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time batch stock tracking, sorted alphabetically and by formulation (Syrups, Tablets, Ointments), with instant customer POS dispensing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* AI Inventory Audit & Categorization Button */}
          <button
            type="button"
            onClick={handleRunAiAnalysis}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition flex items-center space-x-1.5 transform active:scale-95 border border-purple-400/30"
            title="Audit stock health, categorize expiry & low stock, and generate smart replenishment actions"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Inventory Audit</span>
          </button>

          {/* Insert / Add Medicine Button */}
          <button
            type="button"
            onClick={() => {
              setAddBatchNumber(`BN-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/10 transition flex items-center space-x-1.5 transform active:scale-95"
            title="Insert a new medicine directly with formulation, MRP, batch number, and stock"
          >
            <Plus className="w-4 h-4" />
            <span>+ Insert Medicine</span>
          </button>

          {/* Sell to Customer Quick POS */}
          <button
            type="button"
            onClick={() => onOpenCustomerSale()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Customer Sale (POS)</span>
          </button>

          {/* Inward via Bill Scan */}
          <button
            type="button"
            onClick={onScanNewBill}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-2"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Inward via Bill Scan</span>
          </button>
        </div>
      </div>

      {/* 2.5. Smart Inventory & AI Categories Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            </div>
            <div>
              <span className="font-bold text-white">Smart Inventory & AI Categories</span>
              <span className="text-slate-400 ml-1.5 hidden sm:inline text-[11px]">
                Filter by AI-assessed stock health and clinical status
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunAiAnalysis}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Run Deep AI Audit</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { key: 'ALL' as const, label: 'All Medicines', count: categoryCounts.ALL },
            { key: 'REORDER_NEEDED' as const, label: '🛒 Needed Medicines List', count: categoryCounts.REORDER_NEEDED },
            { key: 'LOW_STOCK' as const, label: '📉 Low Stock', count: categoryCounts.LOW_STOCK },
            { key: 'EXPIRED' as const, label: '🚨 Expired Batches', count: categoryCounts.EXPIRED },
            { key: 'EXPIRING' as const, label: '⚠️ Near Expiry (<90d)', count: categoryCounts.EXPIRING },
            { key: 'OUT_OF_STOCK' as const, label: '🔴 Out of Stock', count: categoryCounts.OUT_OF_STOCK },
            { key: 'OVERSTOCKED' as const, label: '📦 Overstocked', count: categoryCounts.OVERSTOCKED },
            { key: 'CUSTOM_TAGGED' as const, label: '🏷️ Custom / Tagged', count: categoryCounts.CUSTOM_TAGGED },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-purple-950 text-purple-200' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Alphabetical Jump Bar (A, B, C, D, ... Z) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md space-y-2.5">
        <div className="flex flex-wrap items-center justify-between px-1 text-xs gap-2">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold">
            <ArrowDownAZ className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold">Alphabetical Catalog Filter (A-Z):</span>
            {selectedLetter !== 'ALL' && (
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono text-xs font-bold">
                Letter &quot;{selectedLetter}&quot; ({letterCounts.get(selectedLetter) || 0} medicines)
              </span>
            )}
          </div>
          {selectedLetter !== 'ALL' && (
            <button
              type="button"
              onClick={() => handleLetterChange('ALL')}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline font-mono font-medium"
            >
              Reset to All Letters ({medicines.length.toLocaleString()})
            </button>
          )}
        </div>

        {/* Responsive flex-wrap letter buttons */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pb-1">
          {ALPHABET_LIST.map((letter) => {
            const count = letterCounts.get(letter) || 0;
            const isSelected = selectedLetter === letter;

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleLetterChange(letter)}
                className={`min-w-[34px] sm:min-w-[38px] h-9 px-1.5 sm:px-2 rounded-lg text-xs font-mono font-bold transition flex flex-col items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400 font-black'
                    : count > 0 || letter === 'ALL'
                    ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                    : 'bg-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
                }`}
                title={letter === 'ALL' ? `All Letters (${medicines.length.toLocaleString()} medicines)` : `Letter ${letter} (${count} medicines starting with ${letter})`}
              >
                <span className="leading-tight">{letter}</span>
                <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                  {letter === 'ALL' ? 'ALL' : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Letter Notification Banner */}
        {selectedLetter !== 'ALL' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black font-mono flex items-center justify-center text-xs shadow">
                {selectedLetter}
              </span>
              <span className="text-slate-200">
                Alphabet letter <strong>&quot;{selectedLetter}&quot;</strong> active: Showing all{' '}
                <strong className="text-emerald-400 font-mono text-sm">{filteredMeds.length.toLocaleString()}</strong> medicines starting with{' '}
                <strong>&quot;{selectedLetter}&quot;</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleLetterChange('ALL')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-xs font-semibold transition"
            >
              Clear Letter Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Formulation Dosage Form Bar (Syrup, Tablet, Ointment, etc.) */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Formulation / Dosage Types:</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {selectedType === 'ALL' ? 'All Formulations' : `${selectedType}s (${typeCounts.get(selectedType) || 0})`}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {DOSAGE_TYPES_LIST.map((t) => {
            const isSelected = selectedType === t;
            const count = typeCounts.get(t) || 0;

            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{t === 'ALL' ? 'All Types' : t}</span>
                {t !== 'ALL' && count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Search, Alert Filters, and Sort Order Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by brand name, generic composition, manufacturer, or barcode..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Active Category Filter Badges */}
        {selectedCategory !== 'ALL' && (
          <div className="flex items-center space-x-1.5 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg text-xs text-purple-300">
            <span>Category: <strong className="uppercase font-mono">{selectedCategory.replace('_', ' ')}</strong></span>
            <button
              onClick={() => handleCategoryChange('ALL')}
              className="text-purple-400 hover:text-white font-bold ml-1 text-xs"
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* Sort Order Selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sort:</span>
          </label>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:border-emerald-500 outline-none"
          >
            <option value="ALPHA_ASC">Alphabetical (A → Z)</option>
            <option value="ALPHA_DESC">Alphabetical (Z → A)</option>
            <option value="TYPE_GROUP">Formulation (Syrup, Tablet, Ointment...)</option>
            <option value="STOCK_LOW">Stock (Low → High)</option>
            <option value="STOCK_HIGH">Stock (High → Low)</option>
            <option value="PRICE_LOW">Price / MRP (Low → High)</option>
            <option value="PRICE_HIGH">Price / MRP (High → Low)</option>
          </select>
        </div>
      </div>

      {/* Pagination Bar Top */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing{' '}
          <strong className="text-white font-mono">
            {filteredMeds.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
          </strong>{' '}
          -{' '}
          <strong className="text-white font-mono">
            {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredMeds.length)}
          </strong>{' '}
          of <strong className="text-emerald-400 font-mono">{filteredMeds.length.toLocaleString()}</strong> medicines
          {selectedLetter !== 'ALL' && ` [Letter: ${selectedLetter}]`}
          {selectedType !== 'ALL' && ` [Type: ${selectedType}]`}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page <strong className="text-white">{safeCurrentPage}</strong> of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 6. Medicines Grid with Highlighted Low-Stock & Expiry Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        {paginatedMeds.map((med) => {
          const currentStock = stockMap.get(med.id) || 0;
          const medBatches = medicineBatchesMap.get(med.id) || [];

          const effectiveThreshold = stockThreshold > 0 ? stockThreshold : (med.minStockAlert || 30);
          const isLowStock = currentStock <= effectiveThreshold;
          const isOutOfStock = currentStock === 0;

          // Check if any active batch is expired or expiring soon
          const hasExpiredBatch = medBatches.some((b) => b.quantity > 0 && new Date(b.expiryDate).getTime() < todayTime);
          const hasExpiringSoonBatch = medBatches.some((b) => {
            if (b.quantity <= 0) return false;
            const diff = new Date(b.expiryDate).getTime() - todayTime;
            return diff >= 0 && diff <= ninetyDaysMs;
          });

          return (
            <div
              key={med.id}
              className={`rounded-xl p-4 shadow-md flex flex-col justify-between space-y-3 transition relative overflow-hidden ${
                isOutOfStock
                  ? 'bg-rose-950/20 border-2 border-rose-500/60 ring-1 ring-rose-500/20'
                  : isLowStock
                  ? 'bg-amber-950/20 border-2 border-amber-500/60 ring-1 ring-amber-500/20'
                  : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Highlight Badge Bar */}
              {(isLowStock || hasExpiredBatch || hasExpiringSoonBatch) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {isOutOfStock && (
                    <span className="px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] font-mono font-bold rounded-md flex items-center space-x-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>OUT OF STOCK</span>
                    </span>
                  )}
                  {!isOutOfStock && isLowStock && (
                    <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold rounded-md flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>LOW STOCK: &le; {effectiveThreshold} UNITS</span>
                    </span>
                  )}
                  {hasExpiredBatch && (
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold rounded-md flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>BATCH EXPIRED</span>
                    </span>
                  )}
                  {!hasExpiredBatch && hasExpiringSoonBatch && (
                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono font-semibold rounded-md flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>EXPIRING &lt; 90D</span>
                    </span>
                  )}
                </div>
              )}

              {/* Medicine Basic Info & Edit Button */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-white tracking-tight truncate" title={med.name}>
                      {med.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{med.genericName}</p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 text-[10px] font-semibold rounded-md">
                      {med.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(med)}
                      title="Edit Medicine Details"
                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="line-clamp-1">{med.manufacturer}</span>
                  <span>•</span>
                  <span>{med.packSize}</span>
                </div>

                {/* Bill Inward Source Reference */}
                {med.lastInwardBillId && (
                  <div className="mt-2.5 p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <FileText className="w-3 h-3 text-emerald-400" />
                      <span>From Bill: <strong className="font-mono">{med.lastInwardBillId}</strong></span>
                    </span>
                    {med.lastInwardDate && (
                      <span className="font-mono text-[10px] text-emerald-400/80">
                        {med.lastInwardDate}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Price & Stock Stats */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">
                    Verified True MRP / Cost
                  </span>
                  <div className="flex items-center space-x-1.5 font-mono">
                    <span className="text-xs font-bold text-white">₹{med.mrp.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400">
                      (Cost: ₹{med.purchasePrice.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">
                    Available Stock
                  </span>
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                      isOutOfStock
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isLowStock
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {currentStock.toLocaleString()} Units
                  </span>
                </div>
              </div>

              {/* Active Batches List */}
              {medBatches.length > 0 && (
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Active Batches ({medBatches.length}):
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                    {medBatches.map((b) => {
                      const isExpired = new Date(b.expiryDate).getTime() < todayTime;
                      const isExpiringSoon =
                        !isExpired && new Date(b.expiryDate).getTime() - todayTime <= ninetyDaysMs;

                      return (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between text-[11px] font-mono p-1 rounded ${
                            isExpired
                              ? 'bg-rose-500/10 text-rose-300'
                              : isExpiringSoon
                              ? 'bg-sky-500/10 text-sky-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{b.batchNumber}</span>
                          <span className="text-[10px]">
                            {isExpired ? 'EXPIRED' : `Exp: ${b.expiryDate}`}
                          </span>
                          <span className="font-bold">{b.quantity} units</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smart AI & Custom Category Badges Bar */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {med.customCategory && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-md flex items-center space-x-1">
                      <Tag className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{med.customCategory}</span>
                    </span>
                  )}
                  {med.aiCategories &&
                    med.aiCategories.map((cat) => (
                      <span
                        key={cat}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 ${
                          cat === 'EXPIRED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : cat === 'EXPIRING_SOON'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : cat === 'LOW_STOCK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : cat === 'OUT_OF_STOCK'
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                            : cat === 'OVERSTOCKED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : cat === 'REORDER_NEEDED'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5 opacity-70" />
                        <span>{cat.replace('_', ' ')}</span>
                      </span>
                    ))}
                  <button
                    type="button"
                    onClick={() => setCategoryModalMed(med)}
                    className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-[10px] font-semibold flex items-center space-x-1 transition"
                    title="Add or edit custom category and status tags"
                  >
                    <Tag className="w-2.5 h-2.5 text-emerald-400" />
                    <span>+ Category</span>
                  </button>
                </div>
                {med.aiReason && (
                  <p
                    className="text-[10px] text-purple-300/90 bg-purple-950/40 border border-purple-500/20 px-2 py-1 rounded line-clamp-1 italic"
                    title={med.aiReason}
                  >
                    AI: {med.aiReason}
                  </p>
                )}
              </div>

              {/* Quick Customer Sale Button: Always allows dispensing so billing is never blocked */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  Min Alert: {med.minStockAlert} units
                </span>
                <button
                  type="button"
                  onClick={() => onOpenCustomerSale(med.id)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 shadow-sm transform active:scale-95"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{currentStock === 0 ? 'Dispense / Bill' : 'Sell to Customer'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar Bottom */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">
            Page <strong className="text-white font-mono">{safeCurrentPage}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong> (Total {filteredMeds.length.toLocaleString()} items)
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-slate-300 font-semibold transition"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-slate-300 font-semibold transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-slate-300 font-semibold transition flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-xs text-slate-300 font-semibold transition"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {editingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Medicine Catalog Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingMed(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Medicine Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Generic / Pharmacological Composition
                  </label>
                  <input
                    type="text"
                    value={editGeneric}
                    onChange={(e) => setEditGeneric(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Formulation / Dosage Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as MedicineType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  >
                    <option value="Syrup">Syrup</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Injection">Injection</option>
                    <option value="Drops">Drops</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Gel">Gel</option>
                    <option value="Cream">Cream</option>
                    <option value="Powder">Powder</option>
                    <option value="Suspension">Suspension</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Pack Size
                  </label>
                  <input
                    type="text"
                    value={editPackSize}
                    onChange={(e) => setEditPackSize(e.target.value)}
                    placeholder="e.g. 10 Tablets/Strip, 100ml Bottle"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Maximum Retail Price (MRP ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMrp}
                    onChange={(e) => setEditMrp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Purchase Rate (Cost ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Manufacturer / Company
                  </label>
                  <input
                    type="text"
                    value={editManufacturer}
                    onChange={(e) => setEditManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMed(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Medicine</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insert / Add New Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Insert New Medicine</h3>
                  <p className="text-[11px] text-slate-400">
                    Add new medicine to catalog with formulation type, MRP, batch number, and initial stock
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSuccessNotice && (
              <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{addSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewMedicine} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Medicine Brand Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 650mg, Benadryl Syrup, Betadine Ointment"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Generic / Salt Composition
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol IP 650mg"
                    value={addGeneric}
                    onChange={(e) => setAddGeneric(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Formulation / Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as MedicineType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                  >
                    {DOSAGE_TYPES_LIST.filter((t) => t !== 'ALL').map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Manufacturer / Company
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla Ltd, Sun Pharma"
                    value={addManufacturer}
                    onChange={(e) => setAddManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Packaging / Pack Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Tablets / Strip, 100ml Bottle"
                    value={addPackSize}
                    onChange={(e) => setAddPackSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Pricing Fields */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Maximum Retail Price (MRP ₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addMrp}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAddMrp(val);
                      if (addPurchasePrice === 0 || addPurchasePrice > val) {
                        setAddPurchasePrice(Math.round(val * 0.7 * 100) / 100);
                      }
                      setAddSellingPrice(Math.round(val * 0.95 * 100) / 100);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Wholesale Purchase Rate (Cost ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addPurchasePrice}
                    onChange={(e) => setAddPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Retail Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addSellingPrice}
                    onChange={(e) => setAddSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    value={addMinStock}
                    onChange={(e) => setAddMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Initial Batch & Stock Details */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Initial Batch & Stock Inward
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BAT-2026A"
                        value={addBatchNumber}
                        onChange={(e) => setAddBatchNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono uppercase focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={addExpiryDate}
                        onChange={(e) => setAddExpiryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Mfg Date
                      </label>
                      <input
                        type="month"
                        value={addMfgDate}
                        onChange={(e) => setAddMfgDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Initial Stock (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={addInitialStock}
                        onChange={(e) => setAddInitialStock(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Medicine & Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Inventory Analysis & Categorization Modal */}
      <AiInventoryAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        isLoading={isAnalyzing}
        data={aiAnalysisResult}
        onReanalyze={handleRunAiAnalysis}
        onApplyAllCategories={handleApplyAllAiCategories}
        onOpenCustomerSale={onOpenCustomerSale}
      />

      {/* Individual Medicine Category & Tag Edit Modal */}
      {categoryModalMed && (
        <CategoryEditModal
          isOpen={Boolean(categoryModalMed)}
          onClose={() => setCategoryModalMed(null)}
          medicine={categoryModalMed}
          currentStock={stockMap.get(categoryModalMed.id) || 0}
          onSaveCategory={handleSaveSingleCategory}
        />
      )}
    </div>
  );
};
