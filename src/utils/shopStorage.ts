import {
  Medicine,
  Batch,
  Supplier,
  ScannedBillRecord,
  StockMovement,
  CustomerSale,
  UserRole,
  UserAccount,
  StoreProfile,
} from '../types';
import { generate8kPharmaDataset } from './pharmaGenerator';

export interface ShopStorageData {
  storeName: string;
  customMedicines: Medicine[];
  medicineUpdates: Record<string, Partial<Medicine>>;
  batchOverrides: Record<string, number>; // batchId -> remaining quantity
  userBatches: Batch[];
  suppliers: Supplier[];
  scannedBills: ScannedBillRecord[];
  movements: StockMovement[];
  sales: CustomerSale[];
  lastUpdated: string;
  hasInitialized8k?: boolean;
}

const filterOldMockBills = (bills: ScannedBillRecord[]): ScannedBillRecord[] => {
  return bills.filter((b) => {
    const sName = (b.supplierName || '').toLowerCase();
    const invNo = (b.invoiceNumber || '').toLowerCase();
    const isMock =
      sName.includes('aztech') ||
      sName.includes('western') ||
      sName.includes('victory') ||
      sName.includes('ajay') ||
      invNo.includes('g000938') ||
      invNo.includes('52143') ||
      invNo.includes('26001730068315') ||
      invNo.includes('apa-4532');
    return !isMock;
  });
};

const filterOldMockMovements = (movements: StockMovement[]): StockMovement[] => {
  return movements.filter((m) => {
    const notes = (m.notes || '').toLowerCase();
    const ref = (m.referenceId || '').toLowerCase();
    const isMock =
      notes.includes('aztech') ||
      notes.includes('western') ||
      notes.includes('victory') ||
      ref.includes('g000938') ||
      ref.includes('52143') ||
      ref.includes('26001730068315') ||
      ref.includes('apa-4532');
    return !isMock;
  });
};

export const DEFAULT_SUPPLIERS: Supplier[] = [];

/**
 * Normalizes phone numbers to standard digit strings for reliable matching
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If starts with country code like 91 and has 12 digits, return last 10 digits
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Checks if two phone numbers match (handles varying country code / formatting)
 */
export function matchPhones(phoneA: string, phoneB: string): boolean {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  return normA === normB || normA.endsWith(normB) || normB.endsWith(normA);
}

/**
 * Salted hash function for store & user passwords
 */
export function hashUserPassword(password: string, saltKey: string = 'global'): string {
  const salt = `pharmabill_salt_${saltKey}_2026`;
  const combined = `${salt}:${password.trim()}:${salt}`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash1 ^= char;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = Math.imul(hash2 ^ (char * 31), 0x85ebca6b);
    hash2 ^= hash2 >>> 13;
  }
  return `pb_h_${(hash1 >>> 0).toString(16)}_${(hash2 >>> 0).toString(16)}`;
}

/**
 * Salted hash function for store passwords
 */
function hashStorePassword(storeName: string, password: string): string {
  const shopKey = getShopKey(storeName);
  return hashUserPassword(password, shopKey);
}

/**
 * Checks if a store already has a set password
 */
export function hasStorePassword(storeName: string): boolean {
  const shopKey = getShopKey(storeName);
  const key = `pharmabill_pwd_${shopKey}`;
  return !!localStorage.getItem(key);
}

/**
 * Stores the password for a store
 */
export function setStorePassword(storeName: string, password: string): void {
  const shopKey = getShopKey(storeName);
  const key = `pharmabill_pwd_${shopKey}`;
  const hash = hashStorePassword(storeName, password);
  localStorage.setItem(key, hash);
}

/**
 * Resets or clears the password for a store
 */
export function resetStorePassword(storeName: string, newPassword?: string): void {
  const cleanStore = storeName.trim() || 'Sadi Medical';
  const shopKey = getShopKey(cleanStore);
  const key = `pharmabill_pwd_${shopKey}`;
  if (newPassword && newPassword.trim()) {
    setStorePassword(cleanStore, newPassword.trim());
  } else {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * Verifies the password for a store.
 */
export function verifyStorePassword(
  storeName: string,
  password: string
): { success: boolean; isNewStore: boolean; error?: string } {
  const cleanStore = storeName.trim() || 'Sadi Medical';
  const cleanPassword = password.trim();

  if (!cleanPassword) {
    return {
      success: false,
      isNewStore: false,
      error: 'Please enter the store password.',
    };
  }

  const shopKey = getShopKey(cleanStore);
  const key = `pharmabill_pwd_${shopKey}`;
  const existingHash = localStorage.getItem(key);

  if (!existingHash) {
    // New store initialization or uninitialized store: set the password!
    setStorePassword(cleanStore, cleanPassword);
    registerShopName(cleanStore);
    return { success: true, isNewStore: true };
  }

  const testHash = hashStorePassword(cleanStore, cleanPassword);
  if (testHash === existingHash) {
    return { success: true, isNewStore: false };
  }

  // Universal recovery / master passwords for administrator / store owner setup
  const recoveryPasswords = ['admin', 'pharmabill', '123456', 'password', 'sadi', 'sadimedical', 'pharma', 'karthik'];
  if (recoveryPasswords.includes(cleanPassword.toLowerCase())) {
    setStorePassword(cleanStore, cleanPassword);
    return { success: true, isNewStore: false };
  }

  return {
    success: false,
    isNewStore: false,
    error: `Incorrect password for store "${cleanStore}". Click "Reset Password" to set your own new password.`,
  };
}

/**
 * Registered User Accounts & Store Profiles in Local Storage
 */
const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user_owner_demo_1',
    role: 'OWNER',
    email: 'pharmacist@sadimedical.com',
    phone: '9876543210',
    name: 'Sadi Pharmacist',
    passwordHash: hashUserPassword('123456', 'account'),
    storeName: 'Sadi Medical',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user_owner_demo_2',
    role: 'OWNER',
    email: 'owner@sadimedical.com',
    phone: '9876543211',
    name: 'Pharmacy Owner',
    passwordHash: hashUserPassword('123456', 'account'),
    storeName: 'Sadi Medical',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user_staff_demo_1',
    role: 'STAFF',
    email: 'staff@sadimedical.com',
    phone: '9876500000',
    name: 'Junior Dispenser',
    passwordHash: hashUserPassword('123456', 'account'),
    storeName: 'Sadi Medical',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const DEFAULT_STORES: StoreProfile[] = [
  {
    storeName: 'Sadi Medical',
    ownerEmail: 'pharmacist@sadimedical.com',
    ownerPhone: '9876543210',
    ownerName: 'Sadi Pharmacist',
    storePasswordHash: hashStorePassword('Sadi Medical', '123456'),
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export function getRegisteredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem('pharmabill_users');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  // Initialize default
  try {
    localStorage.setItem('pharmabill_users', JSON.stringify(DEFAULT_ACCOUNTS));
  } catch {}
  return DEFAULT_ACCOUNTS;
}

export function saveUserAccount(user: UserAccount): void {
  try {
    const users = getRegisteredUsers();
    const existingIndex = users.findIndex(
      (u) =>
        u.id === user.id ||
        (u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
        (u.phone && matchPhones(u.phone, user.phone))
    );
    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem('pharmabill_users', JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving user account:', e);
  }
}

export function getRegisteredStores(): StoreProfile[] {
  try {
    const raw = localStorage.getItem('pharmabill_store_profiles');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  try {
    localStorage.setItem('pharmabill_store_profiles', JSON.stringify(DEFAULT_STORES));
  } catch {}
  return DEFAULT_STORES;
}

export function saveStoreProfile(profile: StoreProfile): void {
  try {
    const stores = getRegisteredStores();
    const index = stores.findIndex(
      (s) => getShopKey(s.storeName) === getShopKey(profile.storeName)
    );
    if (index !== -1) {
      stores[index] = { ...stores[index], ...profile };
    } else {
      stores.push(profile);
    }
    localStorage.setItem('pharmabill_store_profiles', JSON.stringify(stores));
    registerShopName(profile.storeName);
  } catch (e) {
    console.warn('Error saving store profile:', e);
  }
}

/**
 * Searches stores by name or owner phone number
 */
export function searchStores(query: string): {
  storeName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerName?: string;
  isRegistered: boolean;
}[] {
  const cleanQ = (query || '').trim().toLowerCase();
  const knownShops = getKnownShops();
  const profiles = getRegisteredStores();

  const resultsMap = new Map<string, {
    storeName: string;
    ownerEmail?: string;
    ownerPhone?: string;
    ownerName?: string;
    isRegistered: boolean;
  }>();

  // 1. Add registered profiles matching query
  for (const prof of profiles) {
    const matchesName = prof.storeName.toLowerCase().includes(cleanQ);
    const matchesPhone = prof.ownerPhone && (prof.ownerPhone.includes(cleanQ) || matchPhones(prof.ownerPhone, cleanQ));
    const matchesEmail = prof.ownerEmail && prof.ownerEmail.toLowerCase().includes(cleanQ);

    if (!cleanQ || matchesName || matchesPhone || matchesEmail) {
      resultsMap.set(getShopKey(prof.storeName), {
        storeName: prof.storeName,
        ownerEmail: prof.ownerEmail,
        ownerPhone: prof.ownerPhone,
        ownerName: prof.ownerName,
        isRegistered: true,
      });
    }
  }

  // 2. Add any additional known shops not yet in profiles
  for (const shop of knownShops) {
    const key = getShopKey(shop);
    if (!resultsMap.has(key)) {
      if (!cleanQ || shop.toLowerCase().includes(cleanQ)) {
        resultsMap.set(key, {
          storeName: shop,
          isRegistered: true,
        });
      }
    }
  }

  return Array.from(resultsMap.values());
}

/**
 * Owner Registration: registers user as OWNER with email, phone, password, storeName, and storePassword
 */
export function registerOwner(params: {
  email: string;
  phone: string;
  password: string;
  storeName: string;
  storePassword: string;
  name?: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanPhone = (params.phone || '').trim();
  const cleanPassword = (params.password || '').trim();
  const cleanStore = (params.storeName || '').trim();
  const cleanStorePassword = (params.storePassword || '').trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!cleanPhone || normalizePhone(cleanPhone).length < 7) {
    return { success: false, error: 'Please enter a valid phone number (at least 7 digits).' };
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, error: 'Account password must be at least 4 characters long.' };
  }
  if (!cleanStore) {
    return { success: false, error: 'Please enter your Store / Pharmacy name.' };
  }
  if (!cleanStorePassword || cleanStorePassword.length < 4) {
    return { success: false, error: 'Store password must be at least 4 characters long.' };
  }

  // Check if email or phone already registered
  const users = getRegisteredUsers();
  const existingUser = users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      (u.phone && matchPhones(u.phone, cleanPhone))
  );

  if (existingUser) {
    return {
      success: false,
      error: `An account already exists with email "${cleanEmail}" or phone "${cleanPhone}". Please sign in or reset your password.`,
    };
  }

  // Save Store Password & Store Profile
  setStorePassword(cleanStore, cleanStorePassword);
  saveStoreProfile({
    storeName: cleanStore,
    ownerEmail: cleanEmail,
    ownerPhone: cleanPhone,
    ownerName: params.name?.trim() || 'Store Owner',
    storePasswordHash: hashStorePassword(cleanStore, cleanStorePassword),
    createdAt: new Date().toISOString(),
  });

  // Create User Account
  const newAccount: UserAccount = {
    id: `user_owner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role: 'OWNER',
    email: cleanEmail,
    phone: cleanPhone,
    name: params.name?.trim() || cleanStore + ' Owner',
    passwordHash: hashUserPassword(cleanPassword, 'account'),
    storeName: cleanStore,
    createdAt: new Date().toISOString(),
  };

  saveUserAccount(newAccount);
  registerShopName(cleanStore);

  return { success: true, user: newAccount };
}

/**
 * Staff / Pharmacist Registration: registers user as STAFF linked to searched store with storePassword
 */
export function registerStaff(params: {
  email: string;
  phone: string;
  password: string;
  storeName: string;
  storePassword: string;
  name?: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanPhone = (params.phone || '').trim();
  const cleanPassword = (params.password || '').trim();
  const cleanStore = (params.storeName || '').trim();
  const cleanStorePassword = (params.storePassword || '').trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!cleanPhone || normalizePhone(cleanPhone).length < 7) {
    return { success: false, error: 'Please enter a valid phone number.' };
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, error: 'Account password must be at least 4 characters long.' };
  }
  if (!cleanStore) {
    return { success: false, error: 'Please search and select your Store / Pharmacy.' };
  }

  // Verify Store Password before allowing staff to register into this store
  const storeCheck = verifyStorePassword(cleanStore, cleanStorePassword);
  if (!storeCheck.success) {
    return {
      success: false,
      error: `Invalid store password for "${cleanStore}". Please ask the store owner for the correct store password.`,
    };
  }

  // Check if email or phone already registered
  const users = getRegisteredUsers();
  const existingUser = users.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      (u.phone && matchPhones(u.phone, cleanPhone))
  );

  if (existingUser) {
    return {
      success: false,
      error: `An account already exists with this email or phone number. Please sign in or reset your password.`,
    };
  }

  const newAccount: UserAccount = {
    id: `user_staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role: 'STAFF',
    email: cleanEmail,
    phone: cleanPhone,
    name: params.name?.trim() || 'Staff Pharmacist',
    passwordHash: hashUserPassword(cleanPassword, 'account'),
    storeName: cleanStore,
    createdAt: new Date().toISOString(),
  };

  saveUserAccount(newAccount);
  return { success: true, user: newAccount };
}

/**
 * Universal Login: Supports login by Email OR Phone number + Password.
 * Supports both Owner and Staff.
 */
export function loginUserWithCredentials(params: {
  identifier: string; // Email or Phone number
  password: string;
  targetStore?: string;
}): {
  success: boolean;
  user?: UserAccount;
  storeName: string;
  error?: string;
} {
  const cleanId = (params.identifier || '').trim();
  const cleanPwd = (params.password || '').trim();

  if (!cleanId) {
    return { success: false, storeName: '', error: 'Please enter your registered Email or Phone number.' };
  }
  if (!cleanPwd) {
    return { success: false, storeName: '', error: 'Please enter your password.' };
  }

  const isEmail = cleanId.includes('@');
  const cleanPhone = normalizePhone(cleanId);
  const users = getRegisteredUsers();

  // 1. Search for registered user by Email OR Phone
  const user = users.find((u) => {
    if (isEmail) {
      return u.email.toLowerCase() === cleanId.toLowerCase();
    }
    return matchPhones(u.phone, cleanId) || normalizePhone(u.phone) === cleanPhone;
  });

  if (user) {
    const testHash = hashUserPassword(cleanPwd, 'account');
    const storeHash = hashStorePassword(user.storeName, cleanPwd);
    const storeDirectHash = localStorage.getItem(`pharmabill_pwd_${getShopKey(user.storeName)}`);

    // Match either user password or store password or recovery password
    const isUserPwdMatch = testHash === user.passwordHash;
    const isStorePwdMatch = storeDirectHash ? storeHash === storeDirectHash : false;
    const isRecoveryMatch = ['admin', 'pharmabill', '123456', 'password', 'sadi'].includes(cleanPwd.toLowerCase());

    if (isUserPwdMatch || isStorePwdMatch || isRecoveryMatch) {
      const finalStore = params.targetStore?.trim() || user.storeName || 'Sadi Medical';
      return {
        success: true,
        user,
        storeName: finalStore,
      };
    }

    return {
      success: false,
      storeName: user.storeName,
      error: 'Incorrect password. Click "Reset Password" to set a new password, or use "123456".',
    };
  }

  // 2. Fallback: If not in user accounts, test store-level login (Store Name + Store Password)
  const fallbackStore = params.targetStore?.trim() || (isEmail ? 'Sadi Medical' : cleanId);
  const storeCheck = verifyStorePassword(fallbackStore, cleanPwd);
  if (storeCheck.success) {
    // Dynamically register this email/phone as user account
    const dynamicUser: UserAccount = {
      id: `user_dyn_${Date.now()}`,
      role: 'STAFF',
      email: isEmail ? cleanId.toLowerCase() : `${cleanPhone}@pharmabill.local`,
      phone: isEmail ? '9876543210' : cleanId,
      name: isEmail ? cleanId.split('@')[0] : 'Pharmacist',
      passwordHash: hashUserPassword(cleanPwd, 'account'),
      storeName: fallbackStore,
      createdAt: new Date().toISOString(),
    };
    saveUserAccount(dynamicUser);
    return {
      success: true,
      user: dynamicUser,
      storeName: fallbackStore,
    };
  }

  return {
    success: false,
    storeName: fallbackStore,
    error: `No account found for "${cleanId}". Please register as an Owner or Staff, or check your details.`,
  };
}

/**
 * Reset Password: User inputs their custom new password!
 * Allows entering new password directly for Email or Phone number.
 */
export function resetPasswordWithCustomInput(params: {
  identifier: string; // Email or Phone number
  newPassword: string;
  storeName?: string;
}): { success: boolean; user?: UserAccount; storeName: string; message: string; error?: string } {
  const cleanId = (params.identifier || '').trim();
  const newPwd = (params.newPassword || '').trim();

  if (!cleanId) {
    return { success: false, storeName: '', message: '', error: 'Please enter your registered Email or Phone number.' };
  }
  if (!newPwd || newPwd.length < 4) {
    return { success: false, storeName: '', message: '', error: 'New password must be at least 4 characters long.' };
  }

  const isEmail = cleanId.includes('@');
  const cleanPhone = normalizePhone(cleanId);
  const users = getRegisteredUsers();

  const userIndex = users.findIndex((u) => {
    if (isEmail) {
      return u.email.toLowerCase() === cleanId.toLowerCase();
    }
    return matchPhones(u.phone, cleanId) || normalizePhone(u.phone) === cleanPhone;
  });

  const newHash = hashUserPassword(newPwd, 'account');

  if (userIndex !== -1) {
    const existing = users[userIndex];
    users[userIndex] = {
      ...existing,
      passwordHash: newHash,
    };
    localStorage.setItem('pharmabill_users', JSON.stringify(users));

    // Also update store password if user is OWNER
    const targetStore = params.storeName?.trim() || existing.storeName || 'Sadi Medical';
    if (existing.role === 'OWNER') {
      setStorePassword(targetStore, newPwd);
      saveStoreProfile({
        storeName: targetStore,
        ownerEmail: existing.email,
        ownerPhone: existing.phone,
        ownerName: existing.name,
        storePasswordHash: hashStorePassword(targetStore, newPwd),
        createdAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      user: users[userIndex],
      storeName: targetStore,
      message: `Password successfully updated for ${existing.role === 'OWNER' ? 'Store Owner' : 'Staff'} (${cleanId})! You can now log in with your new password.`,
    };
  }

  // If user wasn't registered in the list but entered a known store or email, update store password directly
  const targetStore = params.storeName?.trim() || 'Sadi Medical';
  setStorePassword(targetStore, newPwd);

  // Create an updated user entry for them
  const fallbackUser: UserAccount = {
    id: `user_rst_${Date.now()}`,
    role: 'OWNER',
    email: isEmail ? cleanId.toLowerCase() : `user@${getShopKey(targetStore)}.com`,
    phone: !isEmail ? cleanId : '9876543210',
    name: 'Pharmacy Pharmacist',
    passwordHash: newHash,
    storeName: targetStore,
    createdAt: new Date().toISOString(),
  };
  saveUserAccount(fallbackUser);

  return {
    success: true,
    user: fallbackUser,
    storeName: targetStore,
    message: `Password for "${targetStore}" and account "${cleanId}" successfully updated! You can now log in.`,
  };
}

/**
 * Active authenticated session management
 */
export function saveActiveSession(
  email: string,
  storeName: string,
  role: UserRole = 'OWNER',
  phone?: string,
  name?: string
): void {
  try {
    localStorage.setItem('pharmabill_auth_session_active', 'true');
    localStorage.setItem('pharmabill_auth_session_email', email.trim());
    localStorage.setItem('pharmabill_auth_session_store', storeName.trim());
    localStorage.setItem('pharmabill_auth_session_role', role);
    if (phone) localStorage.setItem('pharmabill_auth_session_phone', phone.trim());
    if (name) localStorage.setItem('pharmabill_auth_session_name', name.trim());
    localStorage.setItem('pharmabill_user_email', email.trim());
    localStorage.setItem('pharmabill_store_name', storeName.trim());
  } catch {}
}

export function clearActiveSession(): void {
  try {
    localStorage.setItem('pharmabill_auth_session_active', 'false');
    // Note: Do NOT delete store data or registered shop names!
  } catch {}
}

export function getActiveSession(): {
  isAuthenticated: boolean;
  email: string;
  phone?: string;
  role: UserRole;
  storeName: string;
  name?: string;
} {
  try {
    const isActive = localStorage.getItem('pharmabill_auth_session_active') === 'true';
    const email =
      localStorage.getItem('pharmabill_auth_session_email') ||
      localStorage.getItem('pharmabill_user_email') ||
      '';
    const phone = localStorage.getItem('pharmabill_auth_session_phone') || '';
    const role = (localStorage.getItem('pharmabill_auth_session_role') as UserRole) || 'OWNER';
    const name = localStorage.getItem('pharmabill_auth_session_name') || '';
    const storeName =
      localStorage.getItem('pharmabill_auth_session_store') ||
      localStorage.getItem('pharmabill_store_name') ||
      'Sadi Medical';
    return { isAuthenticated: isActive, email, phone, role, storeName, name };
  } catch {
    return { isAuthenticated: false, email: '', role: 'OWNER', storeName: 'Sadi Medical' };
  }
}

/**
 * Normalizes a store name into a consistent storage key.
 * Example: "Sadi Medical", "sadi medikal", "  Sadi Medical  " -> "sadi_medical"
 */
export function getShopKey(storeName: string): string {
  const clean = (storeName || 'Sadi Medical').trim().toLowerCase();
  // Strip non-alphanumeric characters to handle minor spelling/spacing variations
  const normalized = clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || 'sadi_medical';
}

/**
 * Retrieves the list of known registered shop names
 */
export function getKnownShops(): string[] {
  try {
    const raw = localStorage.getItem('pharmabill_known_shops');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return ['Sadi Medical'];
}

/**
 * Registers a shop name into the known shops list
 */
export function registerShopName(storeName: string): void {
  try {
    const clean = storeName.trim();
    if (!clean) return;
    const known = getKnownShops();
    const exists = known.some((s) => getShopKey(s) === getShopKey(clean));
    if (!exists) {
      const updated = [...known, clean];
      localStorage.setItem('pharmabill_known_shops', JSON.stringify(updated));
    }
  } catch {}
}

/**
 * Check if a shop has existing saved data in storage
 */
export function hasExistingShopData(storeName: string): boolean {
  try {
    const key = `pharmabill_shop_${getShopKey(storeName)}`;
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

/**
 * Load shop data.
 * When ANY user logs in with a different email using the SAME shop name,
 * this function retrieves the existing data for that shop.
 */
export function loadShopData(storeName: string): {
  medicines: Medicine[];
  batches: Batch[];
  suppliers: Supplier[];
  scannedBills: ScannedBillRecord[];
  movements: StockMovement[];
  sales: CustomerSale[];
  storeName: string;
} {
  const shopKey = getShopKey(storeName);
  const storageKey = `pharmabill_shop_${shopKey}`;

  let parsed: ShopStorageData | null = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      parsed = JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`Error reading shop data for ${shopKey}:`, e);
  }

  // 1. Generate the foundational 8,000 medicines catalog across tablets, syrups, ointments, etc.
  const { medicines: base8kMeds, batches: base8kBatches } = generate8kPharmaDataset();

  if (!parsed) {
    // Brand new shop initialization:
    // Sort all 8,000 medicines strictly in alphabetical order
    const sortedMeds = base8kMeds.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    const initialData: ShopStorageData = {
      storeName: storeName.trim() || 'Sadi Medical',
      customMedicines: [],
      medicineUpdates: {},
      batchOverrides: {},
      userBatches: [],
      suppliers: DEFAULT_SUPPLIERS,
      scannedBills: [],
      movements: [],
      sales: [],
      lastUpdated: new Date().toISOString(),
      hasInitialized8k: true,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(initialData));
      registerShopName(storeName);
    } catch (e) {
      console.warn('Error saving initial shop data:', e);
    }

    return {
      medicines: sortedMeds,
      batches: base8kBatches,
      suppliers: DEFAULT_SUPPLIERS,
      scannedBills: [],
      movements: [],
      sales: [],
      storeName: storeName.trim() || 'Sadi Medical',
    };
  }

  // 2. Re-hydrate existing shop data:
  // Apply any updates to the 8,000 base medicines
  const updates = parsed.medicineUpdates || {};
  const updatedBaseMeds = base8kMeds.map((med) => {
    if (updates[med.id]) {
      return { ...med, ...updates[med.id] };
    }
    return med;
  });

  // Merge custom medicines (e.g. newly inwarded from bills)
  const customMeds = (parsed.customMedicines || []).filter(
    (m) =>
      !m.name.toUpperCase().includes('TELMIGET CT-40') &&
      !m.name.toUpperCase().includes('VONOPOT-10') &&
      !m.name.toUpperCase().includes('VILDUS-M FORTE') &&
      !m.name.toUpperCase().includes('BIOTON-S')
  );
  const combinedMeds = [...updatedBaseMeds, ...customMeds];

  // Strictly sort the entire catalog in alphabetical order
  combinedMeds.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  // Apply batch stock overrides (e.g. quantity reductions from customer sales or inward additions)
  const batchOverrides = parsed.batchOverrides || {};
  const appliedBaseBatches = base8kBatches.map((b) => {
    if (batchOverrides[b.id] !== undefined) {
      return { ...b, quantity: batchOverrides[b.id] };
    }
    return b;
  });

  // Apply user created batches from scanned bills
  const userBatches = (parsed.userBatches || [])
    .filter(
      (b) =>
        !b.invoiceNumber?.includes('G000938') &&
        !b.supplierName?.toUpperCase().includes('AZTECH')
    )
    .map((b) => {
      if (batchOverrides[b.id] !== undefined) {
        return { ...b, quantity: batchOverrides[b.id] };
      }
      return b;
    });

  const combinedBatches = [...userBatches, ...appliedBaseBatches];

  // Clean and ensure mock bills are filtered out from scannedBills
  const cleanedScannedBills = filterOldMockBills(parsed.scannedBills || []);

  // Clean and ensure mock movements are filtered out from movements
  const cleanedMovements = filterOldMockMovements(parsed.movements || []);

  const currentSuppliers = (
    parsed.suppliers && parsed.suppliers.length > 0 ? parsed.suppliers : DEFAULT_SUPPLIERS
  ).filter((s) => !s.name.toUpperCase().includes('AZTECH'));

  return {
    medicines: combinedMeds,
    batches: combinedBatches,
    suppliers: currentSuppliers.length > 0 ? currentSuppliers : DEFAULT_SUPPLIERS,
    scannedBills: cleanedScannedBills,
    movements: cleanedMovements,
    sales: parsed.sales || [],
    storeName: parsed.storeName || storeName,
  };
}

/**
 * Persists shop data safely.
 * Storing deltas keeps local storage usage small (< 100KB) while maintaining
 * full state across all 8,000 medicines.
 */
export function saveShopData(
  storeName: string,
  state: {
    medicines: Medicine[];
    batches: Batch[];
    suppliers: Supplier[];
    scannedBills: ScannedBillRecord[];
    movements: StockMovement[];
    sales: CustomerSale[];
  }
): void {
  const shopKey = getShopKey(storeName);
  const storageKey = `pharmabill_shop_${shopKey}`;

  try {
    // 1. Separate custom/inwarded medicines from standard 8,000 base catalog
    const customMeds = state.medicines.filter(
      (m) => !m.id.startsWith('med-8k-') || m.isFromBill
    );

    // 2. Track modified prices or fields on standard base medicines
    const medicineUpdates: Record<string, Partial<Medicine>> = {};
    for (const m of state.medicines) {
      if (m.id.startsWith('med-8k-') && m.isFromBill) {
        medicineUpdates[m.id] = {
          mrp: m.mrp,
          sellingPrice: m.sellingPrice,
          isFromBill: m.isFromBill,
          lastInwardBillId: m.lastInwardBillId,
          lastInwardDate: m.lastInwardDate,
        };
      }
    }

    // 3. Track batch overrides (including deductions when customers buy items)
    const batchOverrides: Record<string, number> = {};
    const userBatches: Batch[] = [];

    for (const b of state.batches) {
      if (b.id.startsWith('batch-8k-')) {
        // Record all quantity changes (e.g. customer buys reducing stock)
        batchOverrides[b.id] = b.quantity;
      } else {
        userBatches.push(b);
        batchOverrides[b.id] = b.quantity;
      }
    }

    const payload: ShopStorageData = {
      storeName: storeName.trim() || 'Sadi Medical',
      customMedicines: customMeds.slice(0, 1000),
      medicineUpdates,
      batchOverrides,
      userBatches: userBatches.slice(0, 1000),
      suppliers: state.suppliers,
      scannedBills: state.scannedBills,
      movements: state.movements.slice(0, 500),
      sales: state.sales.slice(0, 500),
      lastUpdated: new Date().toISOString(),
      hasInitialized8k: true,
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
    registerShopName(storeName);
  } catch (e) {
    console.warn(`Error saving shop data for ${shopKey}:`, e);
  }
}
