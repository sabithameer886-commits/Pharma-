import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Search,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  User,
  Crown,
  RotateCcw,
  Check,
  Users,
} from 'lucide-react';
import { UserRole } from '../types';
import {
  searchStores,
  getKnownShops,
  loginUserWithCredentials,
  registerOwner,
  registerStaff,
  resetPasswordWithCustomInput,
  getRegisteredUsers,
} from '../utils/shopStorage';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin: (
    email: string,
    storeName: string,
    role?: UserRole,
    phone?: string,
    name?: string
  ) => void;
  currentEmail?: string;
  currentStoreName?: string;
}

type ModalTab = 'login' | 'register' | 'reset-password';

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentEmail = '',
  currentStoreName = 'Sadi Medical',
}) => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<ModalTab>('login');

  // Shared / Login state
  const [loginIdentifier, setLoginIdentifier] = useState(
    currentEmail || 'pharmacist@sadimedical.com'
  );
  const [loginPassword, setLoginPassword] = useState('123456');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [selectedStore, setSelectedStore] = useState(currentStoreName || 'Sadi Medical');

  // Store search state
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [isSearchingStore, setIsSearchingStore] = useState(false);

  // Registration state
  const [registerRole, setRegisterRole] = useState<UserRole>('OWNER');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Store fields for Owner registration
  const [regStoreName, setRegStoreName] = useState('Sadi Medical');
  const [regStorePassword, setRegStorePassword] = useState('');
  const [showRegStorePassword, setShowRegStorePassword] = useState(false);

  // Reset Password State (User directly inputs new password)
  const [resetIdentifier, setResetIdentifier] = useState(
    currentEmail || 'pharmacist@sadimedical.com'
  );
  const [resetStoreName, setResetStoreName] = useState(currentStoreName || 'Sadi Medical');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification and Error state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available stores filtered by search query
  const searchResults = useMemo(() => {
    return searchStores(storeSearchQuery);
  }, [storeSearchQuery, isOpen]);

  const knownShops = useMemo(() => getKnownShops(), [isOpen]);

  // Sync props when opening
  useEffect(() => {
    if (isOpen) {
      if (currentEmail) setLoginIdentifier(currentEmail);
      if (currentStoreName) {
        setSelectedStore(currentStoreName);
        setResetStoreName(currentStoreName);
      }
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentEmail, currentStoreName]);

  if (!isOpen) return null;

  // 1. Handle Login (Email or Phone + Password)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanIdentifier = loginIdentifier.trim();
    const cleanPassword = loginPassword.trim();
    const cleanStore = selectedStore.trim() || 'Sadi Medical';

    if (!cleanIdentifier) {
      setError('Please enter your registered Email or Phone number.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    const result = loginUserWithCredentials({
      identifier: cleanIdentifier,
      password: cleanPassword,
      targetStore: cleanStore,
    });

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
      return;
    }

    const user = result.user;
    onLogin(
      user?.email || (cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@pharmabill.local`),
      result.storeName,
      user?.role || 'OWNER',
      user?.phone,
      user?.name
    );
  };

  // 2. Handle Registration (Owner or Staff)
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (registerRole === 'OWNER') {
      // Owner requires: email, phone, password, store name, store password
      if (!regEmail.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (!regPhone.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!regStoreName.trim()) {
        setError('Please enter your Pharmacy / Store name.');
        return;
      }
      if (!regPassword.trim() || regPassword.length < 4) {
        setError('Account password must be at least 4 characters.');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setError('Account passwords do not match.');
        return;
      }
      if (!regStorePassword.trim() || regStorePassword.length < 4) {
        setError('Store password must be at least 4 characters.');
        return;
      }

      const res = registerOwner({
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        storeName: regStoreName,
        storePassword: regStorePassword,
        name: regName.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Registration failed.');
        return;
      }

      setSuccessMessage(`Store "${regStoreName}" and Owner account registered successfully! Logging you in...`);
      setTimeout(() => {
        if (res.user) {
          onLogin(res.user.email, res.user.storeName, 'OWNER', res.user.phone, res.user.name);
        }
      }, 1000);
    } else {
      // Staff requires: email, phone, password, search & select store, store password
      if (!regEmail.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (!regPhone.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!selectedStore.trim()) {
        setError('Please search and select the store you work at.');
        return;
      }
      if (!regPassword.trim() || regPassword.length < 4) {
        setError('Account password must be at least 4 characters.');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setError('Account passwords do not match.');
        return;
      }
      if (!regStorePassword.trim()) {
        setError(`Please enter the store password for "${selectedStore}" provided by the store owner.`);
        return;
      }

      const res = registerStaff({
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        storeName: selectedStore,
        storePassword: regStorePassword,
        name: regName.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Registration failed.');
        return;
      }

      setSuccessMessage(`Staff account registered for "${selectedStore}"! Logging you in...`);
      setTimeout(() => {
        if (res.user) {
          onLogin(res.user.email, res.user.storeName, 'STAFF', res.user.phone, res.user.name);
        }
      }, 1000);
    }
  };

  // 3. Handle Reset Password (User inputs custom password directly)
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanId = resetIdentifier.trim();
    const cleanNewPwd = newPassword.trim();
    const cleanConfirm = confirmNewPassword.trim();
    const cleanStore = resetStoreName.trim();

    if (!cleanId) {
      setError('Please enter your registered Email or Phone number.');
      return;
    }
    if (!cleanNewPwd) {
      setError('Please input your new password.');
      return;
    }
    if (cleanNewPwd.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (cleanNewPwd !== cleanConfirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    const res = resetPasswordWithCustomInput({
      identifier: cleanId,
      newPassword: cleanNewPwd,
      storeName: cleanStore,
    });

    if (!res.success) {
      setError(res.error || 'Password reset failed.');
      return;
    }

    setSuccessMessage(res.message);
    setLoginIdentifier(cleanId);
    setLoginPassword(cleanNewPwd);
    setSelectedStore(res.storeName);

    // Auto-login after brief delay
    setTimeout(() => {
      onLogin(
        res.user?.email || (cleanId.includes('@') ? cleanId : `${cleanId}@pharmabill.local`),
        res.storeName,
        res.user?.role || 'OWNER',
        res.user?.phone,
        res.user?.name
      );
    }, 1200);
  };

  // Quick Demo Logins
  const handleQuickDemoOwner = () => {
    setLoginIdentifier('pharmacist@sadimedical.com');
    setLoginPassword('123456');
    setSelectedStore('Sadi Medical');
    setError(null);
    onLogin('pharmacist@sadimedical.com', 'Sadi Medical', 'OWNER', '9876543210', 'Sadi Pharmacist');
  };

  const handleQuickDemoStaff = () => {
    setLoginIdentifier('staff@sadimedical.com');
    setLoginPassword('123456');
    setSelectedStore('Sadi Medical');
    setError(null);
    onLogin('staff@sadimedical.com', 'Sadi Medical', 'STAFF', '9876500000', 'Junior Dispenser');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-4 sm:pt-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-slate-100 max-h-[95vh] overflow-y-auto my-auto">
        {/* Header Branding */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              PharmaBill Portal
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Owner & Staff
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Sign in with Email or Phone • Search Pharmacy • Reset Password
            </p>
          </div>
        </div>

        {/* Tab Switcher: Login | Register | Reset Password */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reset-password');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeTab === 'reset-password'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>Reset Password</span>
          </button>
        </div>

        {/* Feedback Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
              {activeTab === 'login' && error.includes('password') && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset-password');
                    setResetIdentifier(loginIdentifier);
                    setResetStoreName(selectedStore);
                    setError(null);
                  }}
                  className="mt-1 text-emerald-400 hover:text-emerald-300 font-bold underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Input new custom password here
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* ----------------- TAB 1: LOGIN (EMAIL OR PHONE + PASSWORD) ----------------- */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email or Phone Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Email Address or Phone Number <span className="text-rose-400 ml-1">*</span>
                </span>
                <span className="text-[10px] text-slate-500">Owner or Staff</span>
              </label>
              <div className="relative">
                <input
                  id="login-identifier-input"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. owner@store.com or 9876543210"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Log in using your registered email or phone number.
              </p>
            </div>

            {/* Store Selection & Search */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Pharmacy / Store Name <span className="text-rose-400 ml-1">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSearchingStore(!isSearchingStore)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>{isSearchingStore ? 'Hide Store Search' : 'Search Store'}</span>
                </button>
              </div>

              {/* Store Search Input Bar */}
              {isSearchingStore && (
                <div className="mb-2 p-2 bg-slate-950 rounded-xl border border-emerald-500/30">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={storeSearchQuery}
                      onChange={(e) => setStoreSearchQuery(e.target.value)}
                      placeholder="Search store by name, owner phone..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {searchResults.map((item) => (
                        <button
                          key={item.storeName}
                          type="button"
                          onClick={() => {
                            setSelectedStore(item.storeName);
                            setIsSearchingStore(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            selectedStore.toLowerCase() === item.storeName.toLowerCase()
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'hover:bg-slate-850 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="font-semibold">{item.storeName}</span>
                          </div>
                          {item.ownerPhone && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              📞 {item.ownerPhone}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-2 px-1">
                      No matching registered store found. You can type the store name directly below.
                    </p>
                  )}
                </div>
              )}

              <input
                id="login-store-name-input"
                type="text"
                value={selectedStore}
                onChange={(e) => {
                  setSelectedStore(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Sadi Medical"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
              />

              {/* Quick Store Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {knownShops.map((shop) => (
                  <button
                    key={shop}
                    type="button"
                    onClick={() => setSelectedStore(shop)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-md border font-mono transition cursor-pointer ${
                      selectedStore.trim().toLowerCase() === shop.trim().toLowerCase()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    🏪 {shop}
                  </button>
                ))}
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Password <span className="text-rose-400 ml-1">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reset-password');
                    setResetIdentifier(loginIdentifier);
                    setResetStoreName(selectedStore);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  Forgot or Change Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your account or store password"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Login Chips */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Demo Sign-In:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleQuickDemoOwner}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Owner Demo</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickDemoStaff}
                  className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                >
                  <Users className="w-3 h-3 text-teal-400" />
                  <span>Staff Demo</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                id="submit-login-btn"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 cursor-pointer ml-auto"
              >
                <KeyRound className="w-4 h-4" />
                <span>Sign In to Store</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB 2: REGISTER (OWNER OR STAFF) ----------------- */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* User Type Switcher: Store Owner vs Staff / Pharmacist */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Account Type:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegisterRole('OWNER');
                    setError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    registerRole === 'OWNER'
                      ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        Store Owner
                        {registerRole === 'OWNER' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400">Create & manage pharmacy</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegisterRole('STAFF');
                    setError(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    registerRole === 'STAFF'
                      ? 'bg-teal-950/40 border-teal-500/60 ring-1 ring-teal-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        Staff / Pharmacist
                        {registerRole === 'STAFF' && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400">Join existing pharmacy</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Store Details */}
            {registerRole === 'OWNER' ? (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Pharmacy & Store Details</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Store / Pharmacy Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={regStoreName}
                    onChange={(e) => setRegStoreName(e.target.value)}
                    placeholder="e.g. Sadi Medical, City Pharmacy"
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Store Security Password <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-amber-400 font-mono">Store Master Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegStorePassword ? 'text' : 'password'}
                      value={regStorePassword}
                      onChange={(e) => setRegStorePassword(e.target.value)}
                      placeholder="Master password for this pharmacy store"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegStorePassword(!showRegStorePassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegStorePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Staff members will use this store password to join and dispense medicines in your store.
                  </p>
                </div>
              </div>
            ) : (
              /* Staff: Search & Select Pharmacy */
              <div className="p-3 bg-teal-950/20 border border-teal-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-teal-400" />
                    <span>Search & Connect to Pharmacy</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Search by store or phone</span>
                </div>

                {/* Store Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    placeholder="Search store name, phone number..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                {/* Matching Stores list */}
                <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  {searchResults.map((item) => (
                    <button
                      key={item.storeName}
                      type="button"
                      onClick={() => setSelectedStore(item.storeName)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition cursor-pointer ${
                        selectedStore.toLowerCase() === item.storeName.toLowerCase()
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <Building2 className="w-3 h-3 text-teal-400 shrink-0" />
                        <span>{item.storeName}</span>
                      </span>
                      {selectedStore.toLowerCase() === item.storeName.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Store Security Password <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-400 font-mono">Provided by Store Owner</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegStorePassword ? 'text' : 'password'}
                      value={regStorePassword}
                      onChange={(e) => setRegStorePassword(e.target.value)}
                      placeholder={`Enter password for "${selectedStore}"`}
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegStorePassword(!showRegStorePassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegStorePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Details: Email, Phone, Name */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. you@store.com"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. John Doe / Pharmacist"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Account Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Account Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Submit Register Button */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Already have an account? Sign In
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2 cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>{registerRole === 'OWNER' ? 'Register Store & Owner' : 'Register Staff Account'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB 3: RESET PASSWORD (USER CAN INPUT PASSWORD) ----------------- */}
        {activeTab === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              <div className="flex items-start space-x-2">
                <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Reset & Set Your New Password</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Enter your registered email or phone number and type your new password directly below.
                  </p>
                </div>
              </div>
            </div>

            {/* Identifier: Email or Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Registered Email or Phone Number <span className="text-rose-400 ml-1">*</span>
                </span>
              </label>
              <input
                type="text"
                value={resetIdentifier}
                onChange={(e) => {
                  setResetIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. pharmacist@sadimedical.com or 9876543210"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Store / Pharmacy Name <span className="text-rose-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={resetStoreName}
                onChange={(e) => setResetStoreName(e.target.value)}
                placeholder="e.g. Sadi Medical"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition"
              />
            </div>

            {/* DIRECT USER INPUT: New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Input New Password <span className="text-rose-400 ml-1">*</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Custom Input</span>
              </label>
              <div className="relative">
                <input
                  id="reset-new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your new password"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* DIRECT USER INPUT: Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center">
                <Lock className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                Confirm New Password <span className="text-rose-400 ml-1">*</span>
              </label>
              <input
                id="reset-confirm-password-input"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Re-type your new password"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back to Sign In
              </button>

              <button
                type="submit"
                id="submit-reset-password-btn"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Save New Password & Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        )}

        {/* Footer Security Badge */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-center text-[11px] text-slate-500 space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role-based Store Isolation • Secure Salted Password Storage</span>
        </div>
      </div>
    </div>
  );
};
