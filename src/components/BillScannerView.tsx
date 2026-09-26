import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Building,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Eye,
  FileCheck,
  X,
  Percent,
  Hash,
  Boxes,
  Store,
  ArrowUpRight,
  ShoppingBag,
  ShieldCheck,
  Calculator,
  AlertTriangle,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  Link,
  SlidersHorizontal,
  Banknote,
  Clock,
  CreditCard,
} from 'lucide-react';
import {
  Medicine,
  Supplier,
  Batch,
  StockMovement,
  ExtractedMedicineItem,
  BillFinancialSummary,
  MedicineType,
} from '../types';
import {
  enhanceDocumentForOcr,
  rotateDocumentPage,
  EnhancedDocumentResult,
  fileToDataUrl,
} from '../utils/imageEnhancer';

export interface BillPageItem {
  id: string;
  pageNumber: number;
  originalImage: string;
  enhancedImage: string;
  width: number;
  height: number;
  rotation: number;
  fileName: string;
  fileType: string;
}

interface BillScannerViewProps {
  medicines: Medicine[];
  suppliers: Supplier[];
  storeName?: string;
  onInwardSuccess: (
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
  ) => void;
  onViewHistory: () => void;
  onSaveSupplier?: (supplier: Supplier) => void;
  onNavigateTab?: (tab: 'scanner' | 'history' | 'medicines' | 'ai-analysis' | 'suppliers' | 'movements') => void;
  onOpenCustomerSale?: (medicineId?: string) => void;
}

export const BillScannerView: React.FC<BillScannerViewProps> = ({
  medicines,
  suppliers,
  storeName = 'Sadi Medical',
  onInwardSuccess,
  onViewHistory,
  onSaveSupplier,
  onNavigateTab,
  onOpenCustomerSale,
}) => {
  // Multi-page document storage (Preserves both Original & Enhanced copies)
  const [pages, setPages] = useState<BillPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'ENHANCED' | 'ORIGINAL'>('ENHANCED');

  // Zoom & Pan state for Image Viewer
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullScreenViewer, setIsFullScreenViewer] = useState<boolean>(false);

  // Dedicated Input Spaces for Supplier Details (Populated strictly from OCR, never hardcoded)
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierAddress, setSupplierAddress] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  const [supplierGstin, setSupplierGstin] = useState<string>('');
  const [supplierDlNumber, setSupplierDlNumber] = useState<string>('');

  // Dedicated Input Spaces for Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Extracted Item Details
  const [items, setItems] = useState<ExtractedMedicineItem[]>([]);

  // Raw text format returned by extraction
  const [rawTextFormat, setRawTextFormat] = useState<string>('');
  const [showRawTextModal, setShowRawTextModal] = useState<boolean>(false);
  const [hasCopiedText, setHasCopiedText] = useState<boolean>(false);

  // Scanning & Progress States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const appendFileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast / Feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'info' | 'error' | 'warning'>('info');

  const showToast = (msg: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    setFeedbackMessage(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Supplier Database Matching (Requirement 12)
  const matchedDbSupplier = useMemo(() => {
    if (!supplierName || supplierName.trim().length < 3) return null;
    const cleanScanned = supplierName.trim().toLowerCase();
    const cleanGst = supplierGstin.trim().toUpperCase();

    // 1. Exact GSTIN match
    if (cleanGst) {
      const gstMatch = suppliers.find((s) => s.gstin && s.gstin.trim().toUpperCase() === cleanGst);
      if (gstMatch) return { supplier: gstMatch, matchReason: 'Verified GSTIN Match' };
    }

    // 2. Name match or strong substring
    const nameMatch = suppliers.find((s) => {
      const sName = s.name.trim().toLowerCase();
      return sName === cleanScanned || sName.includes(cleanScanned) || cleanScanned.includes(sName);
    });

    if (nameMatch) {
      return { supplier: nameMatch, matchReason: 'Existing Supplier Name Match' };
    }

    return null;
  }, [supplierName, supplierGstin, suppliers]);

  // Current Active Page
  const activePage = pages[activePageIndex] || null;

  // Camera start
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access unavailable:', err);
      showToast('Camera access is unavailable. Please upload a bill image instead.', 'error');
    }
  };

  // Camera stop
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    stopCamera();

    // Process through ultra image enhancement pipeline
    await processAndAddFiles([dataUrl], true);
  };

  // Handle Multi-file Upload / File Input
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>, isAppend = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    await processAndAddFiles(fileList, !isAppend);

    if (e.target) {
      e.target.value = '';
    }
  };

  // Process uploaded files through enhancement pipeline and trigger OCR
  const processAndAddFiles = async (sources: Array<File | string>, replaceExisting = true) => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(10);
      setAnalysisStep('Uploading & validating document format...');

      const newPages: BillPageItem[] = [];
      const basePageNum = replaceExisting ? 1 : pages.length + 1;

      for (let i = 0; i < sources.length; i++) {
        const item = sources[i];
        setAnalysisProgress(15 + Math.round(((i + 1) / sources.length) * 20));
        setAnalysisStep(`Enhancing image, removing shadows & sharpening (Page ${basePageNum + i})...`);

        const enhancedResult = await enhanceDocumentForOcr(item, {
          pageNumber: basePageNum + i,
          contrastBoost: 1.28,
          sharpen: true,
          removeShadows: true,
        });

        newPages.push({
          id: `page-${Date.now()}-${i}`,
          pageNumber: basePageNum + i,
          originalImage: enhancedResult.originalImage,
          enhancedImage: enhancedResult.enhancedImage,
          width: enhancedResult.width,
          height: enhancedResult.height,
          rotation: enhancedResult.rotation,
          fileName: enhancedResult.fileName,
          fileType: enhancedResult.fileType,
        });
      }

      const allPages = replaceExisting ? newPages : [...pages, ...newPages];
      setPages(allPages);
      setActivePageIndex(replaceExisting ? 0 : pages.length);

      // Perform OCR on all pages
      await executeOcrScan(allPages);
    } catch (err: any) {
      console.error('Document enhancement/upload error:', err);
      showToast(err.message || 'Failed to enhance bill image. Please upload a clear image.', 'error');
      setIsAnalyzing(false);
    }
  };

  // Execute High Accuracy Multimodal Table OCR
  const executeOcrScan = async (pagesToScan: BillPageItem[]) => {
    if (pagesToScan.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(40);
    setAnalysisStep('Detecting bill structure, table headers & supplier details...');

    try {
      // Progress simulation steps
      const progressTimer = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 88) {
            clearInterval(progressTimer);
            return 88;
          }
          if (prev >= 65) setAnalysisStep('Extracting medicine rows, batch numbers, expiries & rates...');
          else if (prev >= 50) setAnalysisStep('Detecting table columns & aligning medicine data...');
          return prev + 6;
        });
      }, 400);

      const enhancedPayloads = pagesToScan.map((p) => p.enhancedImage || p.originalImage);

      const res = await fetch('/api/analyze-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pages: enhancedPayloads,
          image: enhancedPayloads[0],
        }),
      });

      clearInterval(progressTimer);
      setAnalysisProgress(92);
      setAnalysisStep('Verifying line calculations & cross-checking data...');

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      // Populate Supplier Details directly from OCR
      if (data.supplierName) setSupplierName(data.supplierName);
      if (data.supplierAddress) setSupplierAddress(data.supplierAddress);
      if (data.supplierPhone) setSupplierPhone(data.supplierPhone);
      if (data.supplierEmail) setSupplierEmail(data.supplierEmail);
      if (data.supplierGstin) setSupplierGstin(data.supplierGstin);
      if (data.supplierDlNumber) setSupplierDlNumber(data.supplierDlNumber);

      // Populate Invoice Details
      if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
      if (data.invoiceDate) setInvoiceDate(data.invoiceDate);
      if (data.purchaseDate) setPurchaseDate(data.purchaseDate);
      if (data.paymentTerms) setPaymentTerms(data.paymentTerms);
      if (data.dueDate) setDueDate(data.dueDate);

      // Set raw text format
      if (data.rawTextFormat) {
        setRawTextFormat(data.rawTextFormat);
      }

      // Populate Items Table
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        setAnalysisProgress(100);
        setAnalysisStep('Ready for review.');

        const lowConfidenceCount = data.items.filter((i: any) => i.confidence === 'LOW').length;
        if (lowConfidenceCount > 0) {
          showToast(
            `Extracted ${data.items.length} items. ${lowConfidenceCount} field(s) marked for user verification.`,
            'warning'
          );
        } else {
          showToast(`Successfully extracted ${data.items.length} medicine rows with high accuracy!`, 'success');
        }
      } else {
        showToast('No medicine rows detected. Spaces are open for manual entry.', 'info');
      }
    } catch (err: any) {
      console.error('OCR analysis error:', err);
      showToast(
        err.message || 'Unable to process this bill. Please upload a clearer image.',
        'error'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-scan current pages
  const handleRescanCurrentPages = () => {
    if (pages.length === 0) {
      showToast('Please upload a bill image first.', 'info');
      return;
    }
    executeOcrScan(pages);
  };

  // Rotate active page (90 degrees clockwise or counterclockwise)
  const handleRotateActivePage = async (degrees: 90 | -90) => {
    if (!activePage) return;
    try {
      const rotated = await rotateDocumentPage(
        {
          originalImage: activePage.originalImage,
          enhancedImage: activePage.enhancedImage,
          width: activePage.width,
          height: activePage.height,
          rotation: activePage.rotation,
          fileName: activePage.fileName,
          fileType: activePage.fileType,
          pageNumber: activePage.pageNumber,
        },
        degrees
      );

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex
            ? {
                ...p,
                enhancedImage: rotated.enhancedImage,
                rotation: rotated.rotation,
                width: rotated.width,
                height: rotated.height,
              }
            : p
        )
      );
      showToast(`Page ${activePage.pageNumber} rotated ${degrees > 0 ? '90° clockwise' : '90° counter-clockwise'}.`, 'info');
    } catch (e) {
      console.warn('Rotation error:', e);
    }
  };

  // Remove a specific page
  const handleRemovePage = (indexToRemove: number) => {
    const updated = pages.filter((_, idx) => idx !== indexToRemove).map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
    }));
    setPages(updated);
    setActivePageIndex((prev) => Math.min(prev, Math.max(0, updated.length - 1)));
    showToast(`Page ${indexToRemove + 1} removed.`, 'info');
  };

  // Add Item Row
  const handleAddItemRow = () => {
    const newItem: ExtractedMedicineItem = {
      id: `item-${Date.now()}-${items.length}`,
      medicineName: '',
      genericName: '',
      strength: '',
      dosageForm: 'Tablet',
      batchNumber: '',
      mfgDate: '',
      expiryDate: '',
      quantity: 1,
      freeQuantity: 0,
      mrp: 0,
      trueMrp: 0,
      purchasePrice: 0,
      discountPercent: 0,
      gstPercent: 12,
      taxAmount: 0,
      lineTotal: 0,
      type: 'Tablet',
      confidence: 'HIGH',
      verificationStatus: 'VALID',
      isNewMedicine: true,
      pageNumber: activePage ? activePage.pageNumber : 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update Item Cell
  const handleUpdateItemCell = (
    index: number,
    field: keyof ExtractedMedicineItem,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };

        // Auto-recalculate line totals & GST when quantity, price, discount or GST changes
        if (
          field === 'quantity' ||
          field === 'purchasePrice' ||
          field === 'discountPercent' ||
          field === 'gstPercent'
        ) {
          const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const rate = Number(field === 'purchasePrice' ? value : updated.purchasePrice) || 0;
          const disc = Number(field === 'discountPercent' ? value : updated.discountPercent) || 0;
          const gst = Number(field === 'gstPercent' ? value : updated.gstPercent) || 0;

          const taxable = Math.round(qty * rate * (1 - disc / 100) * 100) / 100;
          const tax = Math.round(((taxable * gst) / 100) * 100) / 100;
          updated.taxAmount = tax;
          updated.lineTotal = Math.round((taxable + tax) * 100) / 100;
        }

        if (field === 'mrp') {
          updated.trueMrp = Number(value);
        }

        // If user manually edits a flagged low-confidence field, upgrade its confidence
        if (field === 'batchNumber' || field === 'expiryDate' || field === 'medicineName') {
          if (value && String(value).trim().length > 1) {
            updated.confidence = 'HIGH';
            updated.verificationStatus = 'VALID';
          }
        }

        return updated;
      })
    );
  };

  // Remove Item Row
  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Clear All
  const handleClearAll = () => {
    setSupplierName('');
    setSupplierAddress('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierGstin('');
    setSupplierDlNumber('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPurchaseDate('');
    setPaymentTerms('');
    setDueDate('');
    setItems([]);
    setPages([]);
    setActivePageIndex(0);
    setRawTextFormat('');
    showToast('All bill spaces and images cleared.', 'info');
  };

  // Recalculate and Align All Math
  const handleRecalculateAndAlignMath = () => {
    setItems((prev) =>
      prev.map((item) => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.purchasePrice) || 0;
        const disc = Number(item.discountPercent) || 0;
        const gst = Number(item.gstPercent) || 0;

        const taxable = Math.round(qty * rate * (1 - disc / 100) * 100) / 100;
        const tax = Math.round(((taxable * gst) / 100) * 100) / 100;
        const total = Math.round((taxable + tax) * 100) / 100;

        return {
          ...item,
          taxAmount: tax,
          lineTotal: total,
          trueMrp: item.mrp || rate,
        };
      })
    );
    showToast('Calculated line amounts, taxes, and totals aligned!', 'success');
  };

  // Copy Formatted Text
  const handleCopyFormattedText = () => {
    const textToCopy = rawTextFormat || 'No text extracted';
    navigator.clipboard.writeText(textToCopy);
    setHasCopiedText(true);
    setTimeout(() => setHasCopiedText(false), 2500);
    showToast('Formatted text copied to clipboard!', 'success');
  };

  // Financial Totals Calculation
  const subtotal = useMemo(() => {
    return Math.round(
      items.reduce((sum, it) => {
        const qty = Number(it.quantity) || 0;
        const rate = Number(it.purchasePrice) || 0;
        const disc = Number(it.discountPercent) || 0;
        return sum + qty * rate * (1 - disc / 100);
      }, 0) * 100
    ) / 100;
  }, [items]);

  const totalGst = useMemo(() => {
    return Math.round(
      items.reduce((sum, it) => sum + (Number(it.taxAmount) || 0), 0) * 100
    ) / 100;
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.round(
      items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0) * 100
    ) / 100;
  }, [items]);

  const totalUnits = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [items]);

  // Supplier Payment Options for Bill Settlement
  const [paymentOption, setPaymentOption] = useState<'FULL' | 'MANUAL' | 'CREDIT'>('FULL');
  const [manualSupplierPaid, setManualSupplierPaid] = useState<number>(0);
  const [supplierPaymentMode, setSupplierPaymentMode] = useState<string>('BANK_TRANSFER');
  const [supplierPaymentNotes, setSupplierPaymentNotes] = useState<string>('');

  const effectiveSupplierPaid = useMemo(() => {
    if (paymentOption === 'FULL') return grandTotal;
    if (paymentOption === 'CREDIT') return 0;
    return Math.min(grandTotal, Math.max(0, manualSupplierPaid));
  }, [paymentOption, grandTotal, manualSupplierPaid]);

  const balanceToGiveSupplier = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - effectiveSupplierPaid) * 100) / 100);
  }, [grandTotal, effectiveSupplierPaid]);

  // CONFIRM & SAVE: User must explicitly review and click to save (Requirement 9 & 10)
  const handleConfirmAndSave = () => {
    const cleanSupplier = supplierName.trim();
    const cleanInvoiceNum = invoiceNumber.trim();
    const effectiveInvoiceDate = invoiceDate || new Date().toISOString().split('T')[0];
    const uploadedDate = new Date().toISOString().split('T')[0];

    if (!cleanSupplier) {
      showToast('Please verify or enter the Supplier Name before saving.', 'error');
      return;
    }

    if (!cleanInvoiceNum) {
      showToast('Please verify or enter the Invoice Number before saving.', 'error');
      return;
    }

    if (items.length === 0 || !items.some((i) => i.medicineName && i.medicineName.trim())) {
      showToast('Please ensure at least one medicine row has a name before saving.', 'error');
      return;
    }

    const newMedicinesToRegister: Medicine[] = [];
    const updatedExistingMedicines: Array<{
      id: string;
      mrp?: number;
      sellingPrice?: number;
      isFromBill: boolean;
      lastInwardBillId: string;
      lastInwardDate: string;
    }> = [];

    const newBatches: Batch[] = [];
    const newMovements: StockMovement[] = [];

    let totalCalculatedUnits = 0;
    let totalCalculatedAmount = 0;

    const effectiveSupplierId = matchedDbSupplier
      ? matchedDbSupplier.supplier.id
      : `sup-${cleanSupplier.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    items.forEach((it, idx) => {
      const cleanName = (it.medicineName || '').trim();
      if (!cleanName) return;

      const existing = medicines.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      const targetMedId = existing ? existing.id : `med-${Date.now()}-${idx}`;
      const batchQty = Number(it.quantity) || 1;
      const rate = Number(it.purchasePrice) || 0;
      const mrp = Number(it.mrp) || rate * 1.25 || 100;
      const lineTotal = Number(it.lineTotal) || batchQty * rate;

      totalCalculatedUnits += batchQty;
      totalCalculatedAmount += lineTotal;

      if (!existing) {
        const newMed: Medicine = {
          id: targetMedId,
          name: cleanName,
          genericName: (it.genericName || '').trim() || 'Active Formulation',
          type: (it.dosageForm as MedicineType) || it.type || 'Tablet',
          manufacturer: it.manufacturer || cleanSupplier,
          packSize: it.packSize || '10 Tablets / Strip',
          mrp: mrp,
          purchasePrice: rate,
          sellingPrice: mrp,
          gstPercent: Number(it.gstPercent) || 12,
          minStockAlert: 20,
          createdAt: uploadedDate,
          isFromBill: true,
          lastInwardBillId: cleanInvoiceNum,
          lastInwardDate: effectiveInvoiceDate,
        };
        newMedicinesToRegister.push(newMed);
      } else {
        updatedExistingMedicines.push({
          id: existing.id,
          mrp: mrp,
          sellingPrice: mrp,
          isFromBill: true,
          lastInwardBillId: cleanInvoiceNum,
          lastInwardDate: effectiveInvoiceDate,
        });
      }

      // Create Batch
      const batchId = `batch-${Date.now()}-${idx}`;
      const batchNum = (it.batchNumber || '').trim().toUpperCase() || `BN-${Date.now().toString().slice(-4)}`;

      const newBatch: Batch = {
        id: batchId,
        medicineId: targetMedId,
        batchNumber: batchNum,
        mfgDate: (it.mfgDate || '').trim() || uploadedDate.slice(0, 7),
        expiryDate: (it.expiryDate || '').trim() || '2028-12-31',
        quantity: batchQty,
        initialQuantity: batchQty,
        purchasePrice: rate,
        mrp: mrp,
        supplierId: effectiveSupplierId,
        supplierName: cleanSupplier,
        invoiceNumber: cleanInvoiceNum,
        receivedDate: effectiveInvoiceDate,
        invoicePhoto: activePage ? activePage.originalImage : undefined,
      };
      newBatches.push(newBatch);

      // Create Stock Movement
      newMovements.push({
        id: `mov-${Date.now()}-${idx}`,
        timestamp: new Date().toISOString(),
        medicineId: targetMedId,
        medicineName: cleanName,
        batchId,
        batchNumber: batchNum,
        type: 'PURCHASE',
        quantity: batchQty,
        openingStock: 0,
        currentStock: batchQty,
        referenceId: cleanInvoiceNum,
        notes: `Inwarded from bill ${cleanInvoiceNum} (${cleanSupplier}) into ${storeName}`,
      });
    });

    // Save/Update supplier in database
    if (onSaveSupplier) {
      onSaveSupplier({
        id: effectiveSupplierId,
        name: cleanSupplier,
        contactPerson: 'Billing Desk',
        phone: supplierPhone.trim() || (matchedDbSupplier?.supplier.phone || 'N/A'),
        email: supplierEmail.trim() || (matchedDbSupplier?.supplier.email || ''),
        address: supplierAddress.trim() || (matchedDbSupplier?.supplier.address || ''),
        gstin: supplierGstin.trim() || (matchedDbSupplier?.supplier.gstin || ''),
        dlNumber: supplierDlNumber.trim() || (matchedDbSupplier?.supplier.dlNumber || ''),
        totalPurchases: (matchedDbSupplier?.supplier.totalPurchases || 0) + grandTotal,
        paymentTerms: paymentTerms.trim() || 'Credit 30 Days',
        rating: matchedDbSupplier?.supplier.rating || 4.8,
        notes: `Inwarded bill ${cleanInvoiceNum} on ${effectiveInvoiceDate}`,
      });
    }

    const totals: BillFinancialSummary = {
      subtotal,
      totalGst,
      discountAmount: 0,
      roundOff: 0,
      grandTotal,
      calculatedSumOfItems: grandTotal,
      isMathVerified: true,
    };

    onInwardSuccess(
      newBatches,
      newMovements,
      {
        supplierName: cleanSupplier,
        supplierAddress: supplierAddress.trim(),
        supplierPhone: supplierPhone.trim(),
        supplierEmail: supplierEmail.trim(),
        supplierGstin: supplierGstin.trim(),
        supplierDlNumber: supplierDlNumber.trim(),
        invoiceNumber: cleanInvoiceNum,
        totalAmount: grandTotal,
        billImage: activePage ? activePage.originalImage : undefined,
        enhancedBillImage: activePage ? activePage.enhancedImage : undefined,
        totalUnits: totalCalculatedUnits,
        invoiceDate: effectiveInvoiceDate,
        purchaseDate: purchaseDate.trim(),
        paymentTerms: paymentTerms.trim(),
        dueDate: dueDate.trim(),
        uploadedDate,
        items,
        totals,
        verificationFlags: ['Exact Image Extracted', 'User Verified & Confirmed', 'High-Accuracy OCR'],
        rawTextFormat,
        amountPaidToSupplier: effectiveSupplierPaid,
        balancePendingToSupplier: balanceToGiveSupplier,
        supplierPaymentStatus: balanceToGiveSupplier === 0 ? 'PAID' : (effectiveSupplierPaid > 0 ? 'PARTIAL' : 'PENDING'),
        supplierPaymentMode,
        supplierPaymentNotes,
      },
      newMedicinesToRegister,
      updatedExistingMedicines
    );

    showToast(`Bill #${cleanInvoiceNum} from ${cleanSupplier} confirmed & saved into inventory!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in duration-200 ${
            feedbackType === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
              : feedbackType === 'error'
              ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
              : feedbackType === 'warning'
              ? 'bg-amber-950/90 border-amber-500/30 text-amber-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : feedbackType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : feedbackType === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Upload Triggers */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ULTRA-ACCURATE OCR
              </span>
              <span className="text-xs text-slate-400">
                • Store: <strong className="text-emerald-300">{storeName}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Supplier Purchase Bill Scanner
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-0.5">
              Upload any pharmaceutical invoice (JPG, PNG, WEBP, HEIC, or PDF). High-resolution shadow removal, contrast enhancement, table alignment, and confidence verification extract true printed values.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {rawTextFormat && (
              <button
                onClick={() => setShowRawTextModal(true)}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Text Output</span>
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-slate-950/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* File Upload Trigger */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer p-4 bg-slate-950/80 hover:bg-slate-950 border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 rounded-xl transition flex items-center space-x-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf"
              onChange={(e) => handleFileSelection(e, false)}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition">
                Upload Bill / Invoice
              </p>
              <p className="text-[11px] text-slate-400">JPG, PNG, WEBP, HEIC, PDF</p>
            </div>
          </div>

          {/* Camera Capture Trigger */}
          <div
            onClick={startCamera}
            className="group cursor-pointer p-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-teal-500/60 rounded-xl transition flex items-center space-x-3"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition">
                Take Photo
              </p>
              <p className="text-[11px] text-slate-400">Snap directly with camera</p>
            </div>
          </div>

          {/* Add Manual Item Row */}
          <div
            onClick={handleAddItemRow}
            className="group cursor-pointer p-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/60 rounded-xl transition flex items-center space-x-3"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                Add Medicine Row
              </p>
              <p className="text-[11px] text-slate-400">Add an empty item row</p>
            </div>
          </div>

          {/* Confirm & Save Button */}
          <div
            onClick={handleConfirmAndSave}
            className={`group cursor-pointer p-4 rounded-xl transition flex items-center space-x-3 shadow-lg ${
              items.length > 0 && supplierName
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Boxes className="w-5 h-5 font-bold" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                CONFIRM & SAVE
              </p>
              <p className="text-[11px] text-slate-300 font-medium">
                {items.length > 0 ? `${items.length} items to inward` : 'Verify & inward to stock'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Camera Viewfinder Modal */}
        {isCameraActive && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 animate-pulse" />
                <span>Align Supplier Bill Inside Viewfinder</span>
              </span>
              <button
                onClick={stopCamera}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Cancel
              </button>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-black max-h-[420px] flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full max-h-[400px] object-contain" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-400/60 pointer-events-none rounded-lg flex items-center justify-center">
                <span className="text-[11px] text-emerald-200 bg-slate-950/80 px-2 py-1 rounded">
                  Ensure table columns and batch codes are clear
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Enhance Bill</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-step Scanning Progress Bar (Requirement 14) */}
        {isAnalyzing && (
          <div className="mt-4 p-4 bg-slate-950/90 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="font-bold text-emerald-300">{analysisStep}</span>
              </div>
              <span className="font-mono text-emerald-400 text-xs font-bold">{analysisProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 transition-all duration-300 rounded-full"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* USER REVIEW SCREEN: SPLIT LAYOUT (LEFT: Bill Image Viewer, RIGHT: Extracted Data Review) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: ORIGINAL / ENHANCED BILL IMAGE VIEWER (45-50% width on Desktop) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bill Document Viewer
              </h3>
            </div>

            {/* View Mode Toggle: Enhanced vs Original */}
            {pages.length > 0 && (
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setViewMode('ENHANCED')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    viewMode === 'ENHANCED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Sharpened, contrast-enhanced and shadow-compensated OCR view"
                >
                  Enhanced
                </button>
                <button
                  onClick={() => setViewMode('ORIGINAL')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    viewMode === 'ORIGINAL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Original uploaded file untouched"
                >
                  Original
                </button>
              </div>
            )}
          </div>

          {/* Multi-page Navigation Tabs (Requirement 6) */}
          {pages.length > 0 && (
            <div className="flex items-center justify-between mt-3 pb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {pages.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                      activePageIndex === idx
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>Page {p.pageNumber}</span>
                  </button>
                ))}

                {/* Add Page Button */}
                <input
                  ref={appendFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf"
                  onChange={(e) => handleFileSelection(e, true)}
                  className="hidden"
                />
                <button
                  onClick={() => appendFileInputRef.current?.click()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1 transition"
                  title="Upload additional page to this bill"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>Add Page</span>
                </button>
              </div>

              {/* Delete Active Page */}
              {pages.length > 1 && (
                <button
                  onClick={() => handleRemovePage(activePageIndex)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                  title="Remove this page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Interactive Document Display Box */}
          <div className="mt-3 relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden min-h-[380px] max-h-[620px] flex items-center justify-center select-none">
            {activePage ? (
              activePage.fileType === 'application/pdf' ? (
                <div className="p-8 text-center space-y-3">
                  <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">PDF Bill Document Loaded</p>
                  <p className="text-[11px] text-slate-400 font-mono">{activePage.fileName}</p>
                  <p className="text-[11px] text-emerald-300">All pages analyzed directly via multimodal AI</p>
                </div>
              ) : (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                  <img
                    src={viewMode === 'ENHANCED' ? activePage.enhancedImage : activePage.originalImage}
                    alt={`Bill Document - Page ${activePage.pageNumber}`}
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease',
                    }}
                    className="max-h-[580px] w-auto object-contain rounded-lg"
                  />
                </div>
              )
            ) : (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <Upload className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No bill document uploaded yet.</p>
                <p className="text-[11px] text-slate-500">
                  Upload an image or snap with camera to view here with zoom & rotation.
                </p>
              </div>
            )}

            {/* Document Controls Overlay */}
            {activePage && activePage.fileType !== 'application/pdf' && (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.2))}
                    className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white ml-1"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleRotateActivePage(-90)}
                    className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded"
                    title="Rotate 90° Left"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRotateActivePage(90)}
                    className="p-1 hover:text-emerald-400 hover:bg-slate-800 rounded"
                    title="Rotate 90° Right"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRescanCurrentPages}
                    disabled={isAnalyzing}
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold rounded text-[11px] flex items-center space-x-1"
                    title="Re-run OCR extraction on this document"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Rescan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EXTRACTED DATA REVIEW & DEDICATED INPUT SPACES (50-55% width on Desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* SECTION 1: SUPPLIER DETAILS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  SUPPLIER DETAILS
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  (Visible Distributor / Agency)
                </span>
              </div>

              {/* Database Match Indicator (Requirement 12) */}
              {matchedDbSupplier ? (
                <div className="flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] text-emerald-300">
                  <Link className="w-3 h-3 text-emerald-400" />
                  <span>Linked to Existing: <strong>{matchedDbSupplier.supplier.name}</strong></span>
                </div>
              ) : supplierName.trim().length > 0 ? (
                <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg text-[11px] text-slate-400 border border-slate-800">
                  <span>New Supplier Record</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Apex Pharma Wholesale"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GST Number (GSTIN)
                </label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none transition uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier Address
                </label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Distributor postal address"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supplier Phone & Email
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: INVOICE DETAILS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                INVOICE & PAYMENT DETAILS
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Invoice Number <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-8941"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none transition font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Invoice Date
                </label>
                <input
                  type="text"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Terms / Due Date
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 30 Days Credit"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: EXTRACTED MEDICINES TABLE (Dedicated Tabular Input Spaces) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  MEDICINE ITEM DETAILS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-emerald-300">
                  {items.length} items
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddItemRow}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
                <button
                  onClick={handleRecalculateAndAlignMath}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                  title="Cross-check line totals, tax, and calculations"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Verify Math</span>
                </button>
              </div>
            </div>

            {/* Table Content */}
            {items.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400">
                  No medicine rows extracted yet. Upload a bill image or click "Add Row" to enter items.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
                  <thead className="bg-slate-950 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2.5 min-w-[180px]">Medicine / Item Name</th>
                      <th className="py-2 px-2 min-w-[140px]">Generic / Salt</th>
                      <th className="py-2 px-2 min-w-[95px]">Batch No.</th>
                      <th className="py-2 px-1.5 min-w-[85px]">Expiry</th>
                      <th className="py-2 px-1.5 min-w-[65px] text-right">Qty</th>
                      <th className="py-2 px-1.5 min-w-[65px] text-right">Free</th>
                      <th className="py-2 px-1.5 min-w-[75px] text-right">MRP (₹)</th>
                      <th className="py-2 px-1.5 min-w-[75px] text-right">Rate (₹)</th>
                      <th className="py-2 px-1.5 min-w-[65px] text-right">Disc %</th>
                      <th className="py-2 px-1.5 min-w-[60px] text-right">GST %</th>
                      <th className="py-2 px-2.5 min-w-[90px] text-right">Net Amount</th>
                      <th className="py-2 px-1.5 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-sans">
                    {items.map((item, idx) => {
                      const isLowConfidence = item.confidence === 'LOW';
                      return (
                        <tr
                          key={item.id || idx}
                          className={`transition ${
                            isLowConfidence
                              ? 'bg-amber-950/25 border-l-2 border-amber-400'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Row Number & Confidence Tag */}
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[11px]">
                            {isLowConfidence ? (
                              <span title="Please verify this row (partially unclear from bill)">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />
                              </span>
                            ) : (
                              idx + 1
                            )}
                          </td>

                          {/* Medicine Name */}
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.medicineName}
                              onChange={(e) => handleUpdateItemCell(idx, 'medicineName', e.target.value)}
                              placeholder="Medicine brand & strength"
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none font-medium"
                            />
                          </td>

                          {/* Generic / Salt */}
                          <td className="py-1.5 px-1.5">
                            <input
                              type="text"
                              value={item.genericName}
                              onChange={(e) => handleUpdateItemCell(idx, 'genericName', e.target.value)}
                              placeholder="Active salt"
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none"
                            />
                          </td>

                          {/* Batch No. */}
                          <td className="py-1.5 px-1.5">
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleUpdateItemCell(idx, 'batchNumber', e.target.value.toUpperCase())}
                              placeholder={isLowConfidence ? 'Please verify' : 'Batch #'}
                              className={`w-full bg-slate-950 border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none uppercase ${
                                !item.batchNumber
                                  ? 'border-amber-500/80 text-amber-300'
                                  : 'border-slate-700/80 text-emerald-300 focus:border-emerald-500'
                              }`}
                            />
                          </td>

                          {/* Expiry Date */}
                          <td className="py-1.5 px-1">
                            <input
                              type="text"
                              value={item.expiryDate}
                              onChange={(e) => handleUpdateItemCell(idx, 'expiryDate', e.target.value)}
                              placeholder="MM/YY"
                              className={`w-full bg-slate-950 border rounded-lg px-1.5 py-1 text-xs font-mono focus:outline-none ${
                                !item.expiryDate
                                  ? 'border-amber-500/80 text-amber-300'
                                  : 'border-slate-700/80 text-slate-200 focus:border-emerald-500'
                              }`}
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemCell(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-white focus:outline-none"
                            />
                          </td>

                          {/* Free Quantity */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              value={item.freeQuantity || 0}
                              onChange={(e) => handleUpdateItemCell(idx, 'freeQuantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-slate-400 focus:outline-none"
                            />
                          </td>

                          {/* MRP */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) => handleUpdateItemCell(idx, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-slate-300 focus:outline-none"
                            />
                          </td>

                          {/* Purchase Rate / PTR */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice}
                              onChange={(e) => handleUpdateItemCell(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-emerald-300 focus:outline-none font-semibold"
                            />
                          </td>

                          {/* Discount % */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.discountPercent || 0}
                              onChange={(e) => handleUpdateItemCell(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-slate-400 focus:outline-none"
                            />
                          </td>

                          {/* GST % */}
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.gstPercent}
                              onChange={(e) => handleUpdateItemCell(idx, 'gstPercent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-xs font-mono text-right text-slate-300 focus:outline-none"
                            />
                          </td>

                          {/* Net Line Total */}
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.lineTotal}
                              onChange={(e) => handleUpdateItemCell(idx, 'lineTotal', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono text-right text-white font-bold focus:outline-none"
                            />
                          </td>

                          {/* Delete Row */}
                          <td className="py-1.5 px-1.5 text-center">
                            <button
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUPPLIER PAYMENT SETTLEMENT & HOW MUCH TO GIVE */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Supplier Payment & Dues Settlement
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Choose how much money to give supplier for this bill.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-mono">Invoice Grand Total:</span>
                  <span className="text-sm font-black text-white font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* 3 Option Buttons: Full Amount Paid | Manually Enter | Credit / Pay Later */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  How much money to give supplier?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('FULL')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      paymentOption === 'FULL'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Full Amount Paid</div>
                        <div className="text-[10px] text-slate-400 font-mono">Give ₹{grandTotal.toFixed(2)} in full</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOption('MANUAL');
                      if (manualSupplierPaid === 0) setManualSupplierPaid(Math.round(grandTotal / 2));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      paymentOption === 'MANUAL'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">✎</div>
                      <div>
                        <div className="text-xs font-bold">Manually Enter</div>
                        <div className="text-[10px] text-slate-400 font-mono">Partial or Custom Amount</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('CREDIT')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      paymentOption === 'CREDIT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Credit / Pay Later</div>
                        <div className="text-[10px] text-slate-400 font-mono">₹0 paid now (Full Pending)</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* If Manually Enter is selected */}
              {paymentOption === 'MANUAL' && (
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Enter Amount Given to Supplier (₹):
                    </label>
                    <div className="flex space-x-1.5 font-mono text-[10px]">
                      <button
                        type="button"
                        onClick={() => setManualSupplierPaid(0)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        ₹0
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualSupplierPaid(Math.round(grandTotal / 2))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        50% (₹{Math.round(grandTotal / 2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualSupplierPaid(grandTotal)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        Exact (₹{grandTotal})
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={grandTotal}
                    value={manualSupplierPaid}
                    onChange={(e) => setManualSupplierPaid(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount given to supplier"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 font-bold focus:outline-none"
                  />
                </div>
              )}

              {/* Payment Mode & Settlement Live Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Invoice Amount</span>
                  <span className="text-white font-bold text-sm">₹{grandTotal.toFixed(2)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Money Given to Supplier</span>
                  <span className="text-emerald-400 font-bold text-sm">₹{effectiveSupplierPaid.toFixed(2)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Balance to Give Supplier</span>
                  <span className={`font-bold text-sm ${balanceToGiveSupplier > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{balanceToGiveSupplier.toFixed(2)}
                    {balanceToGiveSupplier === 0 && <span className="text-[10px] ml-1 font-sans text-emerald-400 font-normal">(No Due)</span>}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Payment Mode</span>
                  <select
                    value={supplierPaymentMode}
                    onChange={(e) => setSupplierPaymentMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Summary & Confirm Bar */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-5">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Total Units</span>
                  <span className="text-slate-200 font-bold text-sm">{totalUnits}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Subtotal</span>
                  <span className="text-slate-200 font-bold text-sm">₹{subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">GST Total</span>
                  <span className="text-slate-300 font-bold text-sm">₹{totalGst.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">
                    Grand Total
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleConfirmAndSave}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition cursor-pointer"
                >
                  <Boxes className="w-4 h-4" />
                  <span>CONFIRM & SAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Text Output Modal */}
      {showRawTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Extracted Bill Data Format</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Standardized pharmaceutical bill extraction format.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyFormattedText}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {hasCopiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedText ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={() => setShowRawTextModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl p-4 border border-slate-800">
              <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed">
                {rawTextFormat}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRawTextModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
