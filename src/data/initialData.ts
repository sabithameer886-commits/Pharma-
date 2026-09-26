import { Medicine, Supplier, Batch, StockMovement, ScannedBillRecord, CustomerSale } from '../types';

// Clean initial datasets - only user-scanned and user-entered bill data will be stored
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_MEDICINES: Medicine[] = [];
export const INITIAL_BATCHES: Batch[] = [];
export const INITIAL_MOVEMENTS: StockMovement[] = [];
export const INITIAL_SCANNED_BILLS: ScannedBillRecord[] = [];
export const INITIAL_CUSTOMER_SALES: CustomerSale[] = [];
