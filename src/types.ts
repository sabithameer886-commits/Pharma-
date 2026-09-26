export type MedicineType =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Powder'
  | 'Suspension'
  | 'Cream'
  | 'Gel'
  | 'Other';

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  type: MedicineType;
  manufacturer: string;
  strength?: string;
  packSize: string;
  mrp: number; // Maximum Retail Price
  purchasePrice: number; // Default or last purchase price
  sellingPrice: number;
  discountPercent?: number;
  gstPercent: number; // e.g. 5, 12, 18
  barcode?: string;
  image?: string;
  classification?: 'Schedule H' | 'Schedule H1' | 'Schedule X' | 'OTC' | 'General';
  minStockAlert: number;
  preferredSupplierId?: string;
  createdAt: string;
  isFromBill?: boolean;
  lastInwardBillId?: string;
  lastInwardDate?: string;
  aiCategories?: InventoryCategory[]; // e.g. 'EXPIRED', 'EXPIRING_SOON', 'LOW_STOCK', 'CRITICAL_REORDER', 'OVERSTOCKED', 'FAST_MOVING'
  customCategory?: string; // User/AI assigned category tag
  aiReason?: string; // Reason provided by AI audit
}

export type InventoryCategory =
  | 'ALL'
  | 'EXPIRED'
  | 'EXPIRING_SOON'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVERSTOCKED'
  | 'OPTIMAL'
  | 'REORDER_NEEDED'
  | 'FAST_MOVER'
  | 'AI_RECOMMENDED_REORDER'
  | 'CUSTOM_TAGGED';

export interface Supplier {
  id: string;
  name: string;
  gstin?: string;
  dlNumber?: string; // Drug License Number
  phone: string;
  email: string;
  address: string;
  contactPerson?: string;
  totalPurchases: number;
  totalPaid?: number;
  totalPending?: number;
  rating?: number;
  paymentTerms?: string;
  notes?: string;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  mfgDate: string; // YYYY-MM or YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  initialQuantity: number;
  purchasePrice: number;
  mrp: number;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  receivedDate: string; // Dated
  invoicePhoto?: string;
}

export interface StockMovement {
  id: string;
  timestamp: string; // Dated
  medicineId: string;
  medicineName: string;
  batchId?: string;
  batchNumber?: string;
  type: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  openingStock: number;
  currentStock: number;
  referenceId?: string; // Invoice / Bill #
  notes: string;
  invoicePhoto?: string;
}

export interface ExtractedMedicineItem {
  id?: string;
  medicineId?: string;
  medicineName: string;
  genericName: string;
  type: MedicineType;
  dosageForm?: string;
  manufacturer?: string;
  packSize?: string;
  tabletsPerPack?: number;
  unitRate?: number;
  unitMrp?: number;
  strength?: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number; // Billed packs/units
  freeQuantity?: number; // Free / scheme quantity
  purchasePrice: number; // Rate / PTR per unit / pack
  mrp: number; // Bill stated MRP
  trueMrp?: number; // Verified true MRP
  existingStockMrp?: number;
  mrpStatus?: 'MATCHED' | 'REVISED_HIGHER' | 'REVISED_LOWER' | 'NEW_ITEM';
  mrpAnalysisNote?: string;
  gstPercent: number;
  taxAmount?: number;
  hsnCode?: string;
  discountPercent?: number;
  lineTotal: number;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  fieldConfidences?: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'>;
  pageNumber?: number;
  isNewMedicine?: boolean;
  isAiExtracted?: boolean;
  verificationStatus?: 'VALID' | 'WARNING' | 'ERROR';
  verificationNotes?: string[];
}

export interface BillFinancialSummary {
  subtotal: number;
  totalDiscount?: number;
  totalGst: number;
  discountAmount: number;
  roundOff: number;
  grandTotal: number;
  calculatedSumOfItems: number;
  isMathVerified: boolean;
  mathDiscrepancyAmount?: number;
}

export interface BillAnalysisResult {
  supplierName: string;
  supplierGstin?: string;
  supplierDlNumber?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  invoiceNumber: string;
  invoiceDate: string; // Dated from paper
  purchaseDate?: string;
  paymentTerms?: string;
  uploadedDate: string; // Inward date
  dueDate?: string;
  paymentMode?: string;
  items: ExtractedMedicineItem[];
  totals: BillFinancialSummary;
  pagesCount?: number;
  imageQuality?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  analysisQualityNote?: string;
  overallVerificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'FLAGGED';
  verificationFlags: string[];
  rawTextFormat?: string;
}

export interface ScannedBillRecord {
  id: string;
  invoiceNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierDlNumber?: string;
  invoiceDate: string; // Dated
  uploadedDate: string; // Dated
  dueDate?: string;
  paymentTerms?: string;
  totalAmount: number;
  totalItemsCount: number;
  totalUnitsCount: number;
  amountPaidToSupplier?: number;
  balancePendingToSupplier?: number;
  supplierPaymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
  supplierPaymentMode?: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CREDIT';
  supplierPaymentDate?: string;
  supplierPaymentNotes?: string;
  paymentNotes?: string;
  billImage?: string;
  enhancedBillImage?: string;
  pagesCount?: number;
  status: 'PENDING_REVIEW' | 'VERIFIED_INWARDED' | 'REJECTED';
  items: ExtractedMedicineItem[];
  totals: BillFinancialSummary;
  verificationFlags: string[];
  createdAt: string;
  rawTextFormat?: string;
}

export interface CustomerSaleItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  expiryDate: string;
  formulationType?: MedicineType;
  totalStockBefore?: number;
  remainingStockAfter?: number;
  supplierName?: string;
  saleUnit?: 'TABLET' | 'PACK'; // Whether sold as loose tablets (1, 2, 3...) or full pack/strip
  tabletsPerPack?: number; // Count of tablets per pack/strip (e.g. 10 or 15)
  unitLabel?: string; // 'Tablet', 'Capsule', 'Strip', etc.
  packSize?: string;
  equivalentPackDeduction?: number; // Quantity in strips deducted from inventory (e.g. 3/10 = 0.3)
}

export interface CustomerSale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  items: CustomerSaleItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  deliveryType?: 'COUNTER_PICKUP' | 'HOME_DELIVERY';
  deliveryDistanceKm?: number;
  deliveryCharge?: number;
  deliveryAddress?: string;
  amountPaidByCustomer?: number;
  balanceReturnedToCustomer?: number;
  customerPendingAmount?: number;
}

export interface StockAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  type: 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED';
  currentStock: number;
  threshold?: number;
  batchNumber?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
}

export type UserRole = 'OWNER' | 'STAFF';

export interface UserAccount {
  id: string;
  role: UserRole;
  email: string;
  phone: string;
  name?: string;
  passwordHash: string;
  storeName: string;
  createdAt: string;
}

export interface StoreProfile {
  storeName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerName?: string;
  storePasswordHash: string;
  createdAt: string;
}

