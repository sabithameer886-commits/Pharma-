import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  Trash2,
  Phone,
  Building2,
  FileText,
  Image as ImageIcon,
  Share2,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  Mail,
} from 'lucide-react';
import { Medicine, Batch, Supplier } from '../types';

export interface RestockOrderItem {
  id: string;
  medicineId?: string;
  medicineName: string;
  genericName: string;
  packSize: string;
  tabletsPerPack: number;
  currentStock: number;
  minAlert: number;
  selected: boolean;
  unitType: 'PACK' | 'TABLET';
  orderedQuantity: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  reason: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'MANUAL';
  supplierName?: string;
  notes?: string;
}

interface AiRestockSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  storeName?: string;
  userEmail?: string;
}

export const AiRestockSupplierModal: React.FC<AiRestockSupplierModalProps> = ({
  isOpen,
  onClose,
  medicines,
  batches,
  suppliers,
  storeName = 'Sadi Medical',
  userEmail,
}) => {
  // Supplier selection - populated from existing database suppliers
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [supplierEmail, setSupplierEmail] = useState<string>('');
  const [customPoNumber, setCustomPoNumber] = useState<string>(() => {
    return `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  // Mobile collapsed controls state to save vertical space
  const [isConfigCollapsed, setIsConfigCollapsed] = useState<boolean>(false);

  // Filter & Search - Initialized to ALL so user manually selects medicines
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'SELECTED' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Restock items list (fully editable by user)
  const [orderItems, setOrderItems] = useState<RestockOrderItem[]>([]);

  // Manual Add Item state
  const [manualSearch, setManualSearch] = useState<string>('');
  const [showManualDropdown, setShowManualDropdown] = useState<boolean>(false);

  // Canvas & Image generation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [showImagePreviewModal, setShowImagePreviewModal] = useState<boolean>(false);

  // Status feedback
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [hasCopiedText, setHasCopiedText] = useState<boolean>(false);
  const [hasCopiedImage, setHasCopiedImage] = useState<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setStatusNotice({ message, type });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // 1. Analyze inventory and generate recommendations when opened
  // Note: All recommendations start UNSELECTED so the user manually selects them
  useEffect(() => {
    if (!isOpen) return;

    if (suppliers.length > 0) {
      const first = suppliers[0];
      setSelectedSupplierId(first.id);
      setSelectedSupplierName(first.name);
      setSupplierPhone(first.phone || '');
      setSupplierEmail(first.email || '');
    }

    // Compute live stock
    const stockMap = new Map<string, number>();
    const now = Date.now();
    const ninetyDaysMs = 90 * 86400000;
    const expiringMedicineIds = new Set<string>();

    for (const b of batches) {
      if (b.quantity > 0) {
        stockMap.set(b.medicineId, (stockMap.get(b.medicineId) || 0) + b.quantity);
        const expTime = new Date(b.expiryDate).getTime();
        if (expTime - now <= ninetyDaysMs) {
          expiringMedicineIds.add(b.medicineId);
        }
      }
    }

    const items: RestockOrderItem[] = [];

    // Evaluate each medicine
    for (const med of medicines) {
      const currentStock = stockMap.get(med.id) || 0;
      const minAlert = med.minStockAlert || 20;

      // Extract tablets per pack
      let tabsPerPack = 10;
      const match = (med.packSize || '').match(/(\d+)\s*(?:tabs?|tablets?|caps?|capsules?|'s|\/)/i);
      if (match) tabsPerPack = parseInt(match[1], 10) || 10;

      if (currentStock === 0) {
        // Requirement 6: Start UNSELECTED for manual selection
        items.push({
          id: `item-${med.id}`,
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName || 'Active Formulation',
          packSize: med.packSize || '10 Tablets / Strip',
          tabletsPerPack: tabsPerPack,
          currentStock: 0,
          minAlert,
          selected: false,
          unitType: 'PACK',
          orderedQuantity: Math.max(10, minAlert),
          priority: 'URGENT',
          reason: 'OUT_OF_STOCK',
          supplierName: med.manufacturer || selectedSupplierName || 'Wholesale Supplier',
        });
      } else if (currentStock <= minAlert) {
        const neededPacks = Math.max(5, minAlert * 2 - currentStock);
        items.push({
          id: `item-${med.id}`,
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName || 'Active Formulation',
          packSize: med.packSize || '10 Tablets / Strip',
          tabletsPerPack: tabsPerPack,
          currentStock,
          minAlert,
          selected: false,
          unitType: 'PACK',
          orderedQuantity: neededPacks,
          priority: currentStock <= minAlert * 0.4 ? 'HIGH' : 'NORMAL',
          reason: 'LOW_STOCK',
          supplierName: med.manufacturer || selectedSupplierName || 'Wholesale Supplier',
        });
      } else if (expiringMedicineIds.has(med.id)) {
        items.push({
          id: `item-${med.id}`,
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName || 'Active Formulation',
          packSize: med.packSize || '10 Tablets / Strip',
          tabletsPerPack: tabsPerPack,
          currentStock,
          minAlert,
          selected: false,
          unitType: 'PACK',
          orderedQuantity: 10,
          priority: 'NORMAL',
          reason: 'EXPIRING',
          supplierName: med.manufacturer || selectedSupplierName || 'Wholesale Supplier',
        });
      }
    }

    // Sort: OUT_OF_STOCK first, then LOW_STOCK, then EXPIRING, then alphabetical
    items.sort((a, b) => {
      const order = { OUT_OF_STOCK: 0, LOW_STOCK: 1, EXPIRING: 2, MANUAL: 3 };
      if (order[a.reason] !== order[b.reason]) return order[a.reason] - order[b.reason];
      return a.medicineName.localeCompare(b.medicineName);
    });

    setOrderItems(items);
  }, [isOpen, medicines, batches, suppliers]);

  // Handle supplier selection from database
  const handleSelectSupplierId = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (supplierId === 'custom') {
      return;
    }
    const found = suppliers.find((s) => s.id === supplierId);
    if (found) {
      setSelectedSupplierName(found.name);
      setSupplierPhone(found.phone || '');
      setSupplierEmail(found.email || '');
    }
  };

  const handleSelectSupplier = (name: string) => {
    setSelectedSupplierName(name);
    const found = suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedSupplierId(found.id);
      if (found.phone) setSupplierPhone(found.phone);
      if (found.email) setSupplierEmail(found.email);
    }
  };

  // Toggle select item
  const handleToggleSelect = (id: string) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select all in current filtered view
  const handleSelectFiltered = (select: boolean) => {
    const idsToToggle = new Set(filteredItems.map((i) => i.id));
    setOrderItems((prev) =>
      prev.map((item) => (idsToToggle.has(item.id) ? { ...item, selected: select } : item))
    );
  };

  // Quick Select: Top 10 Urgent
  const handleSelectTop10Urgent = () => {
    setOrderItems((prev) => {
      let count = 0;
      return prev.map((item) => {
        if (item.reason === 'OUT_OF_STOCK' && count < 10) {
          count++;
          return { ...item, selected: true };
        }
        return item;
      });
    });
    setActiveTabFilter('SELECTED');
    showNotification('Selected Top 10 Urgent Out-of-Stock items.', 'success');
  };

  // Quick Select: Top 5 Urgent
  const handleSelectTop5Urgent = () => {
    setOrderItems((prev) => {
      let count = 0;
      return prev.map((item) => {
        if ((item.reason === 'OUT_OF_STOCK' || item.reason === 'LOW_STOCK') && count < 5) {
          count++;
          return { ...item, selected: true };
        }
        return item;
      });
    });
    setActiveTabFilter('SELECTED');
    showNotification('Selected Top 5 Urgent restock items.', 'success');
  };

  // Deselect all items
  const handleDeselectAll = () => {
    setOrderItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  // Update item quantity
  const handleUpdateQuantity = (id: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.orderedQuantity + delta);
        return { ...item, orderedQuantity: newQty };
      })
    );
  };

  // Update item quantity directly via input
  const handleDirectQuantityInput = (id: string, value: string) => {
    const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10) || 1;
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, orderedQuantity: Math.max(1, parsed) };
      })
    );
  };

  // Update unit type (Pack vs Loose Tablet)
  const handleUpdateUnitType = (id: string, unit: 'PACK' | 'TABLET') => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.unitType === unit) return item;

        let newQty = item.orderedQuantity;
        if (unit === 'TABLET') {
          newQty = Math.max(10, item.orderedQuantity * item.tabletsPerPack);
        } else {
          newQty = Math.max(1, Math.ceil(item.orderedQuantity / item.tabletsPerPack));
        }

        return { ...item, unitType: unit, orderedQuantity: newQty };
      })
    );
  };

  // Delete item from restock list
  const handleDeleteItem = (id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add custom medicine from catalog
  const handleAddCustomMedicine = (med: Medicine) => {
    let tabsPerPack = 10;
    const match = (med.packSize || '').match(/(\d+)\s*(?:tabs?|tablets?|caps?|capsules?|'s|\/)/i);
    if (match) tabsPerPack = parseInt(match[1], 10) || 10;

    const newItem: RestockOrderItem = {
      id: `manual-${Date.now()}-${med.id}`,
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.genericName || 'Active Formulation',
      packSize: med.packSize || '10 Tablets / Strip',
      tabletsPerPack: tabsPerPack,
      currentStock: 0,
      minAlert: med.minStockAlert || 20,
      selected: true,
      unitType: 'PACK',
      orderedQuantity: 10,
      priority: 'NORMAL',
      reason: 'MANUAL',
      supplierName: med.manufacturer || selectedSupplierName,
    };

    setOrderItems((prev) => [newItem, ...prev]);
    setManualSearch('');
    setShowManualDropdown(false);
    setActiveTabFilter('SELECTED');
    showNotification(`Added ${med.name} to restock order.`, 'success');
  };

  // Filtered order items
  const filteredItems = useMemo(() => {
    return orderItems.filter((item) => {
      // Tab filter
      if (activeTabFilter === 'SELECTED' && !item.selected) return false;
      if (activeTabFilter === 'OUT_OF_STOCK' && item.reason !== 'OUT_OF_STOCK') return false;
      if (activeTabFilter === 'LOW_STOCK' && item.reason !== 'LOW_STOCK') return false;
      if (activeTabFilter === 'EXPIRING' && item.reason !== 'EXPIRING') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.medicineName.toLowerCase().includes(q) ||
          item.genericName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [orderItems, activeTabFilter, searchQuery]);

  // Selected items summary
  const selectedItems = useMemo(() => {
    return orderItems.filter((item) => item.selected);
  }, [orderItems]);

  const totalSelectedUnits = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.orderedQuantity, 0);
  }, [selectedItems]);

  // Generate crisp HTML5 Canvas Purchase Order Image
  const generatePurchaseOrderImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
      setIsGeneratingImage(true);
      const itemsToRender = selectedItems;
      if (itemsToRender.length === 0) {
        setIsGeneratingImage(false);
        resolve(null);
        return;
      }

      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsGeneratingImage(false);
        resolve(null);
        return;
      }

      // Dynamically size canvas height to fit all selected medicines without cutoff
      const visibleList = itemsToRender;

      const scale = 2;
      const width = 1200 * scale;
      const rowHeight = 46 * scale;
      const headerHeight = 220 * scale;
      const footerHeight = 160 * scale;
      const height = headerHeight + visibleList.length * rowHeight + footerHeight;

      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Top banner
      const bannerGrad = ctx.createLinearGradient(0, 0, width, 0);
      bannerGrad.addColorStop(0, '#047857');
      bannerGrad.addColorStop(1, '#0f766e');
      ctx.fillStyle = bannerGrad;
      ctx.fillRect(0, 0, width, 140 * scale);

      // Header Text: Store Name & Title
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${30 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(storeName.toUpperCase(), 40 * scale, 55 * scale);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = `bold ${16 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText('PHARMACEUTICAL RESTOCK PURCHASE ORDER', 40 * scale, 85 * scale);

      // Order Details on right of banner
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${18 * scale}px "JetBrains Mono", monospace`;
      ctx.fillText(customPoNumber, width - 40 * scale, 50 * scale);

      ctx.font = `${14 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#d1fae5';
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      ctx.fillText(`Date & Time: ${dateFormatted}, ${timeFormatted}`, width - 40 * scale, 75 * scale);
      ctx.fillText(`Total Items: ${visibleList.length} Formulations`, width - 40 * scale, 100 * scale);
      ctx.textAlign = 'left';

      // Supplier Info Bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40 * scale, 155 * scale, width - 80 * scale, 50 * scale);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(40 * scale, 155 * scale, width - 80 * scale, 50 * scale);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `${12 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText('SUPPLIER:', 60 * scale, 185 * scale);

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${15 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText((selectedSupplierName || 'Wholesale Distributor').toUpperCase(), 140 * scale, 185 * scale);

      if (supplierPhone) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${12 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(`WhatsApp: ${supplierPhone}`, width - 400 * scale, 185 * scale);
      }
      if (supplierEmail) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${11 * scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(`Email: ${supplierEmail}`, width - 200 * scale, 185 * scale);
      }

      // Table Header
      const tableStartY = 220 * scale;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(40 * scale, tableStartY, width - 80 * scale, 36 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${13 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText('#', 55 * scale, tableStartY + 23 * scale);
      ctx.fillText('MEDICINE / FORMULATION NAME', 100 * scale, tableStartY + 23 * scale);
      ctx.fillText('SALT / COMPOSITION', 520 * scale, tableStartY + 23 * scale);
      ctx.fillText('PACK SIZE / UNIT', 800 * scale, tableStartY + 23 * scale);
      ctx.fillText('RESTOCK QUANTITY', 950 * scale, tableStartY + 23 * scale);
      ctx.fillText('STATUS', 1100 * scale, tableStartY + 23 * scale);

      // Table Rows
      let currentY = tableStartY + 36 * scale;

      visibleList.forEach((item, index) => {
        ctx.fillStyle = index % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(40 * scale, currentY, width - 80 * scale, rowHeight);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5 * scale;
        ctx.strokeRect(40 * scale, currentY, width - 80 * scale, rowHeight);

        // Sl No
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${13 * scale}px "JetBrains Mono", monospace`;
        ctx.fillText(`${index + 1}`, 55 * scale, currentY + 28 * scale);

        // Medicine Name - Auto-fit / wrap cleanly to avoid overlapping
        let medFont = 14;
        ctx.font = `bold ${medFont * scale}px "Plus Jakarta Sans", sans-serif`;
        let medName = item.medicineName;
        while (ctx.measureText(medName).width > 400 * scale && medFont > 10) {
          medFont -= 1;
          ctx.font = `bold ${medFont * scale}px "Plus Jakarta Sans", sans-serif`;
        }
        if (ctx.measureText(medName).width > 400 * scale) {
          while (ctx.measureText(medName + '...').width > 400 * scale && medName.length > 5) {
            medName = medName.slice(0, -1);
          }
          medName += '...';
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillText(medName, 100 * scale, currentY + 28 * scale);

        // Generic Name
        ctx.fillStyle = '#cbd5e1';
        ctx.font = `${12 * scale}px "Plus Jakarta Sans", sans-serif`;
        const salt = item.genericName.length > 26 ? item.genericName.slice(0, 26) + '...' : item.genericName;
        ctx.fillText(salt, 520 * scale, currentY + 28 * scale);

        // Packing / Unit
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${12 * scale}px "Plus Jakarta Sans", sans-serif`;
        const packLabel = item.unitType === 'PACK' ? (item.packSize || 'Strip') : 'Loose Tablet';
        ctx.fillText(packLabel, 800 * scale, currentY + 28 * scale);

        // Restock Quantity (user modified)
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${14 * scale}px "JetBrains Mono", monospace`;
        const qtyLabel =
          item.unitType === 'PACK'
            ? `${item.orderedQuantity} Strips`
            : `${item.orderedQuantity} Tablets`;
        ctx.fillText(qtyLabel, 950 * scale, currentY + 28 * scale);

        // Reason / Priority
        if (item.reason === 'OUT_OF_STOCK') {
          ctx.fillStyle = '#f87171';
          ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText('OUT OF STOCK', 1100 * scale, currentY + 28 * scale);
        } else if (item.reason === 'LOW_STOCK') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText('LOW STOCK', 1100 * scale, currentY + 28 * scale);
        } else if (item.reason === 'EXPIRING') {
          ctx.fillStyle = '#fb923c';
          ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText('EXPIRING SOON', 1100 * scale, currentY + 28 * scale);
        } else {
          ctx.fillStyle = '#a78bfa';
          ctx.font = `bold ${11 * scale}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText('MANUAL REORDER', 1100 * scale, currentY + 28 * scale);
        }

        currentY += rowHeight;
      });

      // Footer Box
      currentY += 20 * scale;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40 * scale, currentY, width - 80 * scale, 90 * scale);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(40 * scale, currentY, width - 80 * scale, 90 * scale);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = `bold ${13 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText('DISPATCH INSTRUCTIONS:', 60 * scale, currentY + 30 * scale);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `${12 * scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(
        '1. Please dispatch fresh batches with minimum 2 years expiry date. 2. Send invoice copy on dispatch.',
        60 * scale,
        currentY + 52 * scale
      );
      ctx.fillText(
        `Authorized Store Stamp: ${storeName} • Generated via PharmaBill AI • Store System Verified`,
        60 * scale,
        currentY + 74 * scale
      );

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      setGeneratedImageUrl(dataUrl);
      setIsGeneratingImage(false);
      resolve(dataUrl);
    });
  };

  // Helper to format clean WhatsApp text summary (Requirement 11)
  const generateWhatsAppMessageText = (): string => {
    const supName = selectedSupplierName.trim() || 'Supplier';
    let text = `Hello ${supName},\n\n`;
    text += `Please find our restock purchase request from ${storeName}:\n\n`;

    selectedItems.forEach((item, idx) => {
      const unitStr = item.unitType === 'PACK' ? 'Strips' : 'Tablets';
      text += `${idx + 1}. ${item.medicineName} — ${item.orderedQuantity} ${unitStr}\n`;
    });

    text += `\nTotal Items: ${selectedItems.length}\n`;
    text += `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n\n`;
    text += `Image preview attached/generated.`;
    return text;
  };

  // APPLY Button Workflow (Requirement 8, 9, 10, 11)
  // Workflow: AI Restock -> Select Medicines -> Adjust Quantities -> Select Supplier -> APPLY -> Generate Restock Image -> Open WhatsApp
  const handleApplyRestock = async () => {
    if (selectedItems.length === 0) {
      showNotification('Please select at least 1 medicine to restock.', 'error');
      return;
    }

    const cleanPhone = supplierPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      showNotification(
        'Please enter or select a valid supplier phone number to send via WhatsApp.',
        'error'
      );
      return;
    }

    // 1. Generate restock request image for ONLY the selected medicines
    const dataUrl = await generatePurchaseOrderImage();

    // 2. Automatically copy image to clipboard and trigger download
    if (dataUrl) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setHasCopiedImage(true);
        }
      } catch (clipErr) {
        console.warn('Clipboard write note:', clipErr);
      }

      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${storeName.replace(/\s+/g, '_')}_Restock_Order_${customPoNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {}

      // 3. Display preview modal so user can view/manage the generated image
      setShowImagePreviewModal(true);
    }

    // 4. Open WhatsApp conversation with the supplier with the formatted message
    const messageText = generateWhatsAppMessageText();
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    showNotification(
      'Restock Request Image generated & WhatsApp opened with your purchase request!',
      'success'
    );
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    let dataUrl = generatedImageUrl;
    if (!dataUrl) {
      dataUrl = await generatePurchaseOrderImage();
    }
    if (!dataUrl) return;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setHasCopiedImage(true);
        showNotification('Purchase Order Image copied to clipboard! Paste directly into WhatsApp.', 'success');
        setTimeout(() => setHasCopiedImage(false), 4000);
      } else {
        showNotification('Direct clipboard image copy not supported in this browser. Please download the image.', 'info');
      }
    } catch {
      showNotification('Could not copy image directly. Image is ready for download.', 'info');
    }
  };

  // Download Order Image
  const handleDownloadImage = async () => {
    let dataUrl = generatedImageUrl;
    if (!dataUrl) {
      dataUrl = await generatePurchaseOrderImage();
    }
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${storeName.replace(/\s+/g, '_')}_Restock_Order_${customPoNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Purchase Order image downloaded successfully.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 overflow-hidden">
      {/* Hidden canvas for image rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modal Container: Fullscreen on mobile (100dvh), centered dialog on desktop */}
      <div className="bg-slate-900 sm:border sm:border-slate-800 sm:rounded-2xl w-full sm:max-w-6xl h-full sm:h-[92vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Header - Compact */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  AI Restock from Supplier
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold shrink-0">
                  WhatsApp Image PO
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Customize required units & send an instant high-resolution graphic order to WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Mobile Toggle to expand/collapse Supplier Inputs */}
            <button
              onClick={() => setIsConfigCollapsed((prev) => !prev)}
              className="sm:hidden px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
            >
              <span>{isConfigCollapsed ? 'Show Supplier' : 'Hide'}</span>
              {isConfigCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status notification banner */}
        {statusNotice && (
          <div
            className={`px-3 py-2 text-xs font-semibold flex items-center space-x-2 border-b shrink-0 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300'
                : statusNotice.type === 'error'
                ? 'bg-rose-950/70 border-rose-500/30 text-rose-300'
                : 'bg-sky-950/70 border-sky-500/30 text-sky-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate">{statusNotice.message}</span>
          </div>
        )}

        {/* Restock Workflow Step Banner (Requirement 8) */}
        <div className="bg-slate-950 px-3.5 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-emerald-400 font-bold whitespace-nowrap">1. AI Restock</span>
          <span className="text-slate-600">→</span>
          <span className="text-white whitespace-nowrap">2. Select Medicines</span>
          <span className="text-slate-600">→</span>
          <span className="text-white whitespace-nowrap">3. Adjust Quantities</span>
          <span className="text-slate-600">→</span>
          <span className="text-white whitespace-nowrap">4. Select Supplier</span>
          <span className="text-slate-600">→</span>
          <span className="text-emerald-400 font-bold whitespace-nowrap">5. Click APPLY</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-300 whitespace-nowrap">6. WhatsApp PO</span>
        </div>

        {/* Supplier & Order Config Bar (Requirement 9: Real Supplier Details from Database) */}
        {!isConfigCollapsed && (
          <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs shrink-0 transition-all">
            {/* Supplier Selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">
                Select Supplier (From Database)
              </label>
              <div className="relative">
                <Building2 className="w-3 h-3 text-emerald-400 absolute left-2 top-2 pointer-events-none" />
                <select
                  value={selectedSupplierId || (suppliers[0]?.id || '')}
                  onChange={(e) => handleSelectSupplierId(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-emerald-500 text-xs truncate cursor-pointer"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Supplier</option>
                </select>
              </div>
              {selectedSupplierId === 'custom' && (
                <input
                  type="text"
                  value={selectedSupplierName}
                  onChange={(e) => setSelectedSupplierName(e.target.value)}
                  placeholder="Enter Supplier Name"
                  className="w-full mt-1 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
              )}
            </div>

            {/* Supplier WhatsApp Phone Number */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate flex justify-between">
                <span>WhatsApp Number</span>
                {supplierEmail && (
                  <span className="text-[9px] text-slate-400 truncate max-w-[120px]" title={supplierEmail}>
                    {supplierEmail}
                  </span>
                )}
              </label>
              <div className="relative">
                <Phone className="w-3 h-3 text-emerald-400 absolute left-2 top-2 pointer-events-none" />
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* PO Number */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">
                PO Number
              </label>
              <div className="relative">
                <FileText className="w-3 h-3 text-emerald-400 absolute left-2 top-2 pointer-events-none" />
                <input
                  type="text"
                  value={customPoNumber}
                  onChange={(e) => setCustomPoNumber(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-mono font-semibold focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Selected Summary */}
            <div className="flex items-center justify-between sm:justify-end">
              <div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-right w-full sm:w-auto">
                <p className="text-[9px] uppercase font-bold text-slate-400">Selected For Restock</p>
                <p className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                  {selectedItems.length} items <span className="text-[10px] font-normal text-slate-400">({totalSelectedUnits} units)</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Pills & Add Item Bar */}
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {/* Category Filter Chips - Horizontally scrollable on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 shrink-0">
            <button
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 ${
                activeTabFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:bg-slate-800 bg-slate-950/60'
              }`}
            >
              All AI Recommendations ({orderItems.length})
            </button>

            <button
              onClick={() => setActiveTabFilter('SELECTED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center space-x-1 ${
                activeTabFilter === 'SELECTED'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-400 hover:bg-emerald-950/40 bg-slate-950/60'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Selected ({selectedItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTabFilter('OUT_OF_STOCK')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center space-x-1 ${
                activeTabFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400 hover:bg-rose-950/40 bg-slate-950/60'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Out of Stock ({orderItems.filter((i) => i.reason === 'OUT_OF_STOCK').length})</span>
            </button>

            <button
              onClick={() => setActiveTabFilter('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center space-x-1 ${
                activeTabFilter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-slate-950 font-bold shadow-xs'
                  : 'text-amber-400 hover:bg-amber-950/40 bg-slate-950/60'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Low Stock ({orderItems.filter((i) => i.reason === 'LOW_STOCK').length})</span>
            </button>

            <button
              onClick={() => setActiveTabFilter('EXPIRING')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center space-x-1 ${
                activeTabFilter === 'EXPIRING'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-orange-400 hover:bg-orange-950/40 bg-slate-950/60'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Expiring ({orderItems.filter((i) => i.reason === 'EXPIRING').length})</span>
            </button>

            <button
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 ${
                activeTabFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
            >
              All ({orderItems.length})
            </button>
          </div>

          {/* Quick Search & Add Medicine from Catalog */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto shrink-0">
            {/* Search list */}
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Manual Add autocomplete */}
            <div className="relative">
              <input
                type="text"
                placeholder="+ Add drug..."
                value={manualSearch}
                onChange={(e) => {
                  setManualSearch(e.target.value);
                  setShowManualDropdown(e.target.value.trim().length > 1);
                }}
                className="w-28 sm:w-36 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 truncate"
              />
              {showManualDropdown && manualSearch.trim().length > 1 && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-50 p-1">
                  {medicines
                    .filter((m) => m.name.toLowerCase().includes(manualSearch.toLowerCase()))
                    .slice(0, 8)
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleAddCustomMedicine(m)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs flex flex-col transition"
                      >
                        <span className="font-bold text-white">{m.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{m.genericName || m.packSize}</span>
                      </button>
                    ))}
                  {medicines.filter((m) => m.name.toLowerCase().includes(manualSearch.toLowerCase())).length === 0 && (
                    <div className="p-2 text-center text-[11px] text-slate-400">
                      No matching medicine in catalog
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action strip: Quick selector pills & counts */}
        <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-400 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectTop5Urgent}
              className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold transition"
            >
              + Top 5 Urgent
            </button>
            <button
              onClick={handleSelectTop10Urgent}
              className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold transition"
            >
              + Top 10 Urgent
            </button>
            <button
              onClick={() => handleSelectFiltered(true)}
              className="hover:text-emerald-400 font-semibold text-[11px] transition ml-1"
            >
              Select All Shown
            </button>
            <span>•</span>
            <button
              onClick={handleDeselectAll}
              className="hover:text-rose-400 font-semibold text-[11px] transition"
            >
              Clear All
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredItems.length} of {orderItems.length}
          </span>
        </div>

        {/* Main List Section - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No items match your filter.</p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={handleSelectTop5Urgent}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Select Top 5 Urgent Items
                </button>
                <button
                  onClick={() => setActiveTabFilter('OUT_OF_STOCK')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  View Out of Stock
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    item.selected
                      ? 'bg-slate-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Checkbox (☐ / ☑) & Medicine Details (Requirement 6) */}
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className="mt-0.5 p-1 text-slate-400 hover:text-emerald-400 transition shrink-0"
                      title={item.selected ? 'Deselect this medicine' : 'Select this medicine for restock'}
                    >
                      {item.selected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          onClick={() => handleToggleSelect(item.id)}
                          className={`font-extrabold text-xs sm:text-sm tracking-tight truncate cursor-pointer ${
                            item.selected ? 'text-white' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {item.medicineName}
                        </span>

                        {/* Status Reason Pill */}
                        {item.reason === 'OUT_OF_STOCK' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            0 Stock (Urgent)
                          </span>
                        )}
                        {item.reason === 'LOW_STOCK' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            Low ({item.currentStock})
                          </span>
                        )}
                        {item.reason === 'EXPIRING' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0">
                            Expiring
                          </span>
                        )}
                        {item.reason === 'MANUAL' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 truncate">
                        {item.genericName} • <span className="text-slate-300">{item.packSize}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Quantity Adjustments (Requirement 7) & Unit Selector */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {/* Quick Quantity Buttons: 10, 20, 30, 50 */}
                    <div className="flex items-center space-x-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase mr-0.5 hidden md:inline">
                        Qty:
                      </span>
                      {[10, 20, 30, 50].map((qtyVal) => (
                        <button
                          key={qtyVal}
                          type="button"
                          onClick={() => {
                            if (!item.selected) {
                              setOrderItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, selected: true, orderedQuantity: qtyVal } : it))
                              );
                            } else {
                              handleDirectQuantityInput(item.id, String(qtyVal));
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                            item.orderedQuantity === qtyVal
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {qtyVal}
                        </button>
                      ))}
                    </div>

                    {/* Unit Selector: Packs/Strips vs Single Loose Tablets */}
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
                      <button
                        onClick={() => handleUpdateUnitType(item.id, 'PACK')}
                        className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition ${
                          item.unitType === 'PACK'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Order in Full Strips"
                      >
                        Strip
                      </button>
                      <button
                        onClick={() => handleUpdateUnitType(item.id, 'TABLET')}
                        className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition ${
                          item.unitType === 'TABLET'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Order in Single / Loose Tablets"
                      >
                        Tablet
                      </button>
                    </div>

                    {/* Quantity Stepper & Direct Input */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition text-xs"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        value={item.orderedQuantity}
                        onChange={(e) => handleDirectQuantityInput(item.id, e.target.value)}
                        className="w-12 py-0.5 text-center bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-md text-emerald-300 font-bold font-mono text-xs focus:outline-none"
                      />

                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition shrink-0"
                      title="Remove from restock order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALWAYS-VISIBLE Sticky Action Footer (Desktop & Mobile) */}
        <div className="p-2.5 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Summary Label */}
          <div className="flex items-center justify-between sm:justify-start sm:space-x-3 text-xs">
            <div>
              <span className="font-extrabold text-emerald-400 font-mono text-xs sm:text-sm">
                {selectedItems.length}
              </span>{' '}
              <span className="text-slate-300 font-semibold">items selected</span>
              <span className="text-slate-500 text-[11px] ml-1">
                ({totalSelectedUnits} units) for <strong className="text-white">{selectedSupplierName || 'Supplier'}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Preview Image */}
            <button
              onClick={async () => {
                const url = await generatePurchaseOrderImage();
                if (url) setShowImagePreviewModal(true);
              }}
              disabled={isGeneratingImage || selectedItems.length === 0}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1 disabled:opacity-40"
              title="Preview generated Purchase Order image"
            >
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">{isGeneratingImage ? 'Generating...' : 'Preview Image'}</span>
            </button>

            {/* Download Image */}
            <button
              onClick={handleDownloadImage}
              disabled={selectedItems.length === 0}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1 disabled:opacity-40"
              title="Download Purchase Order PNG"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Download</span>
            </button>

            {/* Copy Image */}
            <button
              onClick={handleCopyImageToClipboard}
              disabled={selectedItems.length === 0}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1 disabled:opacity-40"
              title="Copy Image to Clipboard"
            >
              {hasCopiedImage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span className="hidden md:inline">{hasCopiedImage ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Primary Action: APPLY Button (Requirement 8) */}
            <button
              id="ai-restock-apply-btn"
              type="button"
              onClick={handleApplyRestock}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>APPLY</span>
              <span className="text-[11px] font-bold opacity-80">(Generate Image & Open WhatsApp)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImagePreviewModal && generatedImageUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Purchase Order Image Preview
                </h3>
              </div>
              <button
                onClick={() => setShowImagePreviewModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={generatedImageUrl}
                alt="Purchase Order"
                className="max-w-full rounded-lg shadow-2xl border border-slate-800 object-contain"
              />
            </div>

            <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={handleCopyImageToClipboard}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Image</span>
              </button>
              <button
                onClick={handleDownloadImage}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  setShowImagePreviewModal(false);
                  handleApplyRestock();
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
