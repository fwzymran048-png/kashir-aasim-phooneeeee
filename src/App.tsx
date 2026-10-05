import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  loadAppData,
  dbSaveInventory,
  dbSaveQuickProducts,
  dbSaveCustomers,
  dbSaveSuppliers,
  dbSaveVouchers,
  dbSaveCompletedInvoices,
  dbSaveHeldInvoices,
  dbSaveStockMovements,
  dbGetUsers,
  dbSaveUsers,
  dbGetRoles,
  dbSaveRoles,
  dbGetAuditLogs,
  dbAddAuditLog,
  dbSaveSetting,
  dbRestoreAll,
  dbCompleteInvoiceTransaction,
  processStockMovementForInvoice,
  hashPassword,
  StockMovement,
  Supplier,
  User,
  Role,
  Permission,
  AuditLog,
  InvoiceItem,
  SavedInvoice,
  Customer,
  QuickProduct,
  Voucher,
  InventoryItem,
  AccountsSubTab,
  Treasury,
  Bank,
  SpecialAccount,
  Cheque,
  OpenInvoiceSession,
  Shift,
  dbSaveTreasuries,
  dbSaveBanks,
  dbSaveSpecialAccounts,
  dbSaveCheques,
  dbGetTreasuries,
  dbGetBanks,
  dbGetSpecialAccounts,
  dbGetCheques,
  dbGetShifts,
  dbSaveOpenInvoiceDraft,
  dbSaveShifts,
  dbSaveShift,
  dbUpdateShift,
  dbDeleteShift,
  FinancialTransfer,
  dbGetFinancialTransfers,
  verifyUserPin,
  dbGetAdminRecoveryCode,
  dbSaveAdminRecoveryCode,
  DEFAULT_ADMIN_RECOVERY_CODE
} from './services/storage';
import {
  Printer,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Save,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  FileText,
  UserPlus,
  Phone,
  HelpCircle,
  Clock,
  Settings,
  Database,
  Calendar,
  Layers,
  ShoppingBag,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  Calculator,
  UserCheck,
  Download,
  Upload,
  BarChart2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Scale,
  Users,
  Lock,
  Key,
  UserX,
  ShieldAlert,
  AlertTriangle,
  Eye,
  EyeOff,
  Package,
  Building2
} from 'lucide-react';

import StoresView from './components/StoresView';
import ReportsView from './components/ReportsView';
import InvoicesArchiveView from './components/InvoicesArchiveView';
import BalancesView from './components/BalancesView';
import { ExcelInvoiceGrid } from './components/pos/ExcelInvoiceGrid';
import { SavedInvoiceBalancesView } from './components/pos/SavedInvoiceBalancesView';
import { ShiftModal } from './components/shifts/ShiftModal';
import MultiPaymentModal from './components/modals/MultiPaymentModal';
import UniversalSmartSearchModal from './components/modals/UniversalSmartSearchModal';
import { InvoicePayment } from './types/pos';

const INITIAL_OPEN_INVOICES: OpenInvoiceSession[] = [
  {
    id: 'OPEN-1',
    sessionName: 'حودة جلالة',
    type: 'بيع',
    customerName: 'حودة جلالة',
    customerPhone: '01012345678',
    selectedPriceLevel: 'سعر1',
    selectedBranch: 'عاصم فون - الفرع الرئيسي',
    selectedDrawer: 'الدرج الرئيسي',
    items: [
      {
        id: '1',
        code: '8841',
        name: 'شاشة ايفون تايب سي',
        category: 'شاشة',
        quantity: 1,
        price: 250,
        costPrice: 180,
        total: 250,
        serialNumber: 'SN-904812',
        notes: 'ضمان 30 يوم'
      },
      {
        id: '2',
        code: '3302',
        name: 'اسكرينة متنوعة X10',
        category: 'إكسسوارات',
        quantity: 2,
        price: 35,
        costPrice: 15,
        total: 70,
        serialNumber: '',
        notes: ''
      }
    ],
    discount: 0,
    tax: 0,
    paid: 0
  },
  {
    id: 'OPEN-2',
    sessionName: 'حميدة الدرة',
    type: 'بيع',
    customerName: 'حميدة الدرة',
    customerPhone: '01122334455',
    selectedPriceLevel: 'سعر1',
    selectedBranch: 'عاصم فون - الفرع الرئيسي',
    selectedDrawer: 'الدرج الرئيسي',
    items: [
      {
        id: '10',
        code: '5011',
        name: 'شاشة سامسونج A52',
        category: 'شاشة',
        quantity: 1,
        price: 320,
        costPrice: 240,
        total: 320,
        serialNumber: 'SN-552109',
        notes: 'أصلي توكيل'
      },
      {
        id: '11',
        code: '1002',
        name: 'جراب هاوس A55',
        category: 'جراب',
        quantity: 1,
        price: 60,
        costPrice: 30,
        total: 60,
        serialNumber: '',
        notes: ''
      }
    ],
    discount: 10,
    tax: 0,
    paid: 300
  },
  {
    id: 'OPEN-3',
    sessionName: 'خالد شعيب',
    type: 'بيع',
    customerName: 'خالد شعيب',
    customerPhone: '01233445566',
    selectedPriceLevel: 'سعر1',
    selectedBranch: 'عاصم فون - الفرع الرئيسي',
    selectedDrawer: 'الدرج الرئيسي',
    items: [
      {
        id: '20',
        code: '7721',
        name: 'سماعة Xo هيدفون عالي',
        category: 'سماعة',
        quantity: 1,
        price: 150,
        costPrice: 95,
        total: 150,
        serialNumber: '',
        notes: ''
      }
    ],
    discount: 0,
    tax: 0,
    paid: 150
  }
];

export default function App() {
  // Menu Container Ref for Outside Clicks
  const menuRef = useRef<HTMLDivElement>(null);

  // Top Navigation & Active View State
  const [mainViewMode, setMainViewMode] = useState<'pos' | 'stores' | 'reports' | 'invoices' | 'balances' | 'suppliers'>('pos');
  const [activeTabGroup, setActiveTabGroup] = useState<'بيع' | 'شراء' | 'مرتجع بيع' | 'مرتجع شراء' | 'نقل' | 'تالف' | 'تسوية'>('بيع');
  const [activeAccountsSubTab, setActiveAccountsSubTab] = useState<AccountsSubTab>('عملاء');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showQuickProducts, setShowQuickProducts] = useState(true);

  // Open Active Invoice Sessions (شريط الفواتير المفتوحة)
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceSession[]>(INITIAL_OPEN_INVOICES);
  const [activeOpenInvoiceId, setActiveOpenInvoiceId] = useState<string>('OPEN-1');
  const isSwitchingSessionRef = useRef<boolean>(false);
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Invoice Customer & Settings State
  const [customerName, setCustomerName] = useState('حودة جلالة');
  const [customerPhone, setCustomerPhone] = useState('01012345678');
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<'سعر1' | 'سعر2' | 'سعر3' | 'سعر4'>('سعر1');
  const [selectedBranch, setSelectedBranch] = useState('عاصم فون - الفرع الرئيسي');
  const [selectedDrawer, setSelectedDrawer] = useState('الدرج الرئيسي');
  const [selectedOriginalInvoiceId, setSelectedOriginalInvoiceId] = useState<string>('');

  // Search & Navigation States
  const [codeQuery, setCodeQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState<number>(0);
  const [invoiceHistoryIndex, setInvoiceHistoryIndex] = useState<number>(-1);

  // Guard against duplicate rapid additions
  const isAddingItemRef = useRef<boolean>(false);

  // New Item Input State & Smart Calculation
  const [itemCategory, setItemCategory] = useState('شاشة');
  const [itemName, setItemName] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [itemPrice, setItemPrice] = useState<number | string>(0);
  const [itemQuantity, setItemQuantity] = useState<number | string>(1);
  const [itemValue, setItemValue] = useState<number | string>(0);
  const [itemNotes, setItemNotes] = useState('');
  const [lastEditedField, setLastEditedField] = useState<'quantity' | 'price' | 'value'>('quantity');

  // Input refs for Enter key navigation
  const codeQueryInputRef = useRef<HTMLInputElement>(null);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const itemQtyInputRef = useRef<HTMLInputElement>(null);
  const itemPriceInputRef = useRef<HTMLInputElement>(null);
  const itemValueInputRef = useRef<HTMLInputElement>(null);
  const itemSerialInputRef = useRef<HTMLInputElement>(null);
  const itemNotesInputRef = useRef<HTMLInputElement>(null);

  // Invoice Items List State
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      code: '8841',
      name: 'شاشة ايفون تايب سي',
      category: 'شاشة',
      quantity: 1,
      price: 250,
      costPrice: 180,
      total: 250,
      serialNumber: 'SN-904812',
      notes: 'ضمان 30 يوم'
    },
    {
      id: '2',
      code: '3302',
      name: 'اسكرينة متنوعة X10',
      category: 'إكسسوارات',
      quantity: 2,
      price: 35,
      costPrice: 15,
      total: 70,
      serialNumber: '',
      notes: ''
    }
  ]);

  // Financial Summary State
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [currentPayments, setCurrentPayments] = useState<InvoicePayment[]>([]);
  const [showMultiPaymentModal, setShowMultiPaymentModal] = useState<boolean>(false);

  // Saved / Completed & Held Invoices History
  const [completedInvoices, setCompletedInvoices] = useState<SavedInvoice[]>([]);
  const [heldInvoices, setHeldInvoices] = useState<SavedInvoice[]>([]);

  // Registered Customers List
  const [customersList, setCustomersList] = useState<Customer[]>([
    { id: '1', name: 'عميل نقدي', phone: '0000000000', balance: 0, notes: 'عميل افتراضي' },
    { id: '2', name: 'محمد أحمد المحمود', phone: '01012345678', balance: 450, notes: 'عميل جملة' },
    { id: '3', name: 'شركة السلام التجارية', phone: '01099887766', balance: 0, notes: 'عميل تجزئة' },
    { id: '4', name: 'مهندس خالد السعدي', phone: '01234567890', balance: 0, notes: 'صيانة دورية' },
    { id: '5', name: 'حودة جلالة', phone: '01012345678', balance: 0, notes: 'عميل منتظم' },
    { id: '6', name: 'حميدة الدرة', phone: '01122334455', balance: 70, notes: 'عميل مميز' },
    { id: '7', name: 'خالد شعيب', phone: '01233445566', balance: 0, notes: 'عميل كاشير' }
  ]);

  // Registered Suppliers List
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([
    { id: 'SUP-1', name: 'شركة البركة للإلكترونيات', phone: '01198765432', balance: 1200, notes: 'مورد معتمد للأجهزة والتطبيقات', address: 'القاهرة' },
    { id: 'SUP-2', name: 'مؤسسة النور للتوريدات', phone: '01055544332', balance: 0, notes: 'مورد إكسسوارات', address: 'الجيزة' },
    { id: 'SUP-3', name: 'شركة العالمية لقطع الغيار', phone: '01288877665', balance: 3500, notes: 'مورد قطع غيار وشاشات', address: 'طنطا' }
  ]);

  // Selected Supplier State for Purchases
  const [supplierName, setSupplierName] = useState('شركة البركة للإلكترونيات');
  const [supplierPhone, setSupplierPhone] = useState('01198765432');
  const [selectedSupplierId, setSelectedSupplierId] = useState('SUP-1');

  // Cash Vouchers List
  const [vouchersList, setVouchersList] = useState<Voucher[]>([
    { id: 'VCH-101', type: 'قبض', date: new Date().toLocaleDateString('ar-EG'), name: 'محمد أحمد المحمود', amount: 500, notes: 'دفعة حساب', drawer: 'الدرج الرئيسي', partyType: 'customer', partyId: '2' },
    { id: 'VCH-102', type: 'صرف', date: new Date().toLocaleDateString('ar-EG'), name: 'مصاريف ضيافة ونظافة', amount: 150, notes: 'نثرية محل', drawer: 'الدرج الرئيسي', partyType: 'general' }
  ]);

  // Inventory Database
  const [inventoryDb, setInventoryDb] = useState<InventoryItem[]>([
    { code: '8841', name: 'شاشة ايفون تايب سي', category: 'شاشة', price: 250, costPrice: 180, wholesalePrice: 220, stock: 20, minStock: 5 },
    { code: '3302', name: 'اسكرينة متنوعة X10', category: 'إكسسوارات', price: 35, costPrice: 15, wholesalePrice: 25, stock: 50, minStock: 10 },
    { code: '5011', name: 'شاشة سامسونج A52', category: 'شاشة', price: 320, costPrice: 240, wholesalePrice: 290, stock: 15, minStock: 5 },
    { code: '1002', name: 'جراب هاوس A55', category: 'جراب', price: 60, costPrice: 30, wholesalePrice: 45, stock: 30, minStock: 8 },
    { code: '7721', name: 'سماعة Xo هيدفون عالي', category: 'سماعة', price: 150, costPrice: 95, wholesalePrice: 125, stock: 25, minStock: 5 },
    { code: '9901', name: 'شاحن Vx الأصلي', category: 'شاحن', price: 45, costPrice: 28, wholesalePrice: 38, stock: 40, minStock: 10 },
    { code: '4410', name: 'وصلة اوتو جي', category: 'وصلة', price: 20, costPrice: 10, wholesalePrice: 15, stock: 60, minStock: 10 },
    { code: '6620', name: 'كابل ايفون تايب سي', category: 'كابل', price: 110, costPrice: 70, wholesalePrice: 90, stock: 35, minStock: 10 }
  ]);

  // Quick Side Products List matching screenshot exactly
  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([
    { key: '1', name: 'Vx', category: 'شاحن', price: 45 },
    { key: '2', name: 'هاوس A55', category: 'جراب', price: 60 },
    { key: '3', name: 'Ac', category: 'كابل', price: 25 },
    { key: '4', name: 'نوكيا دولي', category: 'هاتف', price: 450 },
    { key: '5', name: 'تايب سي شعبي', category: 'كابل', price: 15 },
    { key: '6', name: '35h', category: 'سماعة', price: 30 },
    { key: '7', name: 'وش نوكيا صغير', category: 'إكسسوارات', price: 20 },
    { key: '8', name: 'مادة شاشات', category: 'صيانة', price: 80 },
    { key: '9', name: '4 جيجا', category: 'ذاكرة', price: 90 },
    { key: '0', name: 'بازوكة', category: 'سماعة', price: 180 },
    { key: '.', name: 'إبرة', category: 'صيانة', price: 5 },
    { key: 'A', name: 'ايفون تايب سي في ايفون', category: 'كابل', price: 110 },
    { key: 'B', name: 'Xo هيدفون عالي', category: 'سماعة', price: 150 },
    { key: 'C', name: 'X10 الترا', category: 'ساعة', price: 650 },
    { key: 'D', name: 'ربح الكاش', category: 'خدمة', price: 10 },
    { key: 'E', name: 'ايربود', category: 'سماعة', price: 220 },
    { key: 'F', name: 'اوتو جي', category: 'وصلة', price: 20 },
    { key: 'G', name: 'اسكرينة متنوعة', category: 'إكسسوارات', price: 35 }
  ]);

  // Modals Visibility
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCustomerListModal, setShowCustomerListModal] = useState(false);
  const [showSupplierListModal, setShowSupplierListModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showSupplierStatementModal, setShowSupplierStatementModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [counterpartyRoleFilter, setCounterpartyRoleFilter] = useState<'all' | 'customer' | 'supplier' | 'dual'>('all');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [customerTypingValue, setCustomerTypingValue] = useState<string | null>(null);

  // Global Search State for Cashier (Change 2)
  const [cashierGlobalSearch, setCashierGlobalSearch] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState<'قبض' | 'صرف'>('قبض');
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showUniversalSearchModal, setShowUniversalSearchModal] = useState(false);
  const [activeSavedInvoiceView, setActiveSavedInvoiceView] = useState<SavedInvoice | null>(null);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<SavedInvoice | null>(null);
  const [lastPrintedInvoice, setLastPrintedInvoice] = useState<SavedInvoice | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const isSavingRef = useRef(false);

  // Users, Roles, Audit & Auth State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [auditLogsList, setAuditLogsList] = useState<AuditLog[]>([]);

  // Accounts Tab Persistence States (Treasuries, Banks, Special Accounts, Cheques)
  const [treasuriesList, setTreasuriesList] = useState<Treasury[]>([]);
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [specialAccountsList, setSpecialAccountsList] = useState<SpecialAccount[]>([]);
  const [chequesList, setChequesList] = useState<Cheque[]>([]);
  const [financialTransfersList, setFinancialTransfersList] = useState<FinancialTransfer[]>([]);

  // Shift Management State
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Active Open Shift for current user / register
  const activeShift = useMemo(() => {
    return shiftsList.find(s => s.status === 'OPEN' && (!currentUser || s.userId === currentUser.id)) ||
           shiftsList.find(s => s.status === 'OPEN') || null;
  }, [shiftsList, currentUser]);

  // User Auth & Switch Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Privileged Action Authorization Dialog State
  const [privilegedAuthDialog, setPrivilegedAuthDialog] = useState<{
    isOpen: boolean;
    requiredPermission: Permission;
    actionDescription: string;
    supervisorUserId: string;
    pin: string;
    error: string;
    onAuthorized: () => void;
  } | null>(null);

  // Change Own PIN Modal State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // Global Safe Editing Lock State (PART B: Default ON / Locked on every startup, in-memory only)
  const [isEditLocked, setIsEditLocked] = useState<boolean>(true);

  // Admin Reset User PIN Modal State
  const [adminResetPinTarget, setAdminResetPinTarget] = useState<User | null>(null);
  const [adminResetNewPin, setAdminResetNewPin] = useState('');
  const [adminResetConfirmPin, setAdminResetConfirmPin] = useState('');
  const [adminResetError, setAdminResetError] = useState('');

  // Admin Recovery Code Modal State (نسيت الرقم السري)
  const [showAdminRecoveryModal, setShowAdminRecoveryModal] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Admin Recovery Code in Admin Settings
  const [adminRecoveryCode, setAdminRecoveryCode] = useState<string>(DEFAULT_ADMIN_RECOVERY_CODE);
  const [showRecoveryCodePlain, setShowRecoveryCodePlain] = useState(false);

  // Admin Settings Modal Sub-Tab State ('settings' | 'users' | 'roles' | 'audit')
  const [adminSubTab, setAdminSubTab] = useState<'settings' | 'users' | 'roles' | 'audit'>('settings');

  // User Management Form State inside Admin Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormDisplayName, setUserFormDisplayName] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRoleId, setUserFormRoleId] = useState('CASHIER');
  const [userFormActive, setUserFormActive] = useState(true);

  // Role Permissions Form State inside Admin Modal
  const [editingRoleId, setEditingRoleId] = useState<string>('ADMIN');
  const [roleFormPermissions, setRoleFormPermissions] = useState<Permission[]>([]);

  // Check Permission Helper Function
  const checkPermission = (permission: Permission, actionDescription: string): boolean => {
    if (!currentUser) {
      alert(`عذراً، يجب تسجيل الدخول أولاً لتنفيذ [${actionDescription}].`);
      setShowLoginModal(true);
      return false;
    }
    if (!currentUser.active) {
      alert(`عذراً، هذا الحساب (${currentUser.displayName}) معطل حالياً.`);
      return false;
    }
    const userRole = rolesList.find(r => r.id === currentUser.roleId);
    if (!userRole) {
      alert(`عذراً، الدور المخصص للمستخدم غير محدد.`);
      return false;
    }
    if (userRole.permissions.includes(permission)) {
      return true;
    }
    const errorMsg = `عذراً، المستخدم (${currentUser.displayName}) لا يمتلك صلاحية [${actionDescription}].`;
    alert(errorMsg);
    dbAddAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'BLOCKED_ACTION',
      details: `محاولة تنفيذ غير مصرح بها: ${actionDescription} (المطلوب: ${permission})`
    }).then(() => dbGetAuditLogs().then(setAuditLogsList));
    return false;
  };

  // Execute Action with Permission or request Privileged Supervisor Authorization
  const executeWithPermission = (
    permission: Permission,
    actionDescription: string,
    onAuthorized: () => void
  ) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!currentUser.active) {
      alert(`عذراً، هذا الحساب (${currentUser.displayName}) معطل حالياً.`);
      return;
    }
    const userRole = rolesList.find(r => r.id === currentUser.roleId);
    if (userRole && userRole.permissions.includes(permission)) {
      onAuthorized();
      return;
    }

    // Identify eligible supervisor (Admin or Manager with this permission)
    const eligibleSupervisors = usersList.filter(u => {
      if (!u.active) return false;
      const r = rolesList.find(role => role.id === u.roleId);
      return r && r.permissions.includes(permission);
    });
    const defaultSupervisor = eligibleSupervisors[0] || usersList.find(u => u.roleId === 'ADMIN') || usersList[0];

    setPrivilegedAuthDialog({
      isOpen: true,
      requiredPermission: permission,
      actionDescription,
      supervisorUserId: defaultSupervisor ? defaultSupervisor.id : '',
      pin: '',
      error: '',
      onAuthorized
    });
  };

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustBalance, setNewCustBalance] = useState<number>(0);
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustIsSupplier, setNewCustIsSupplier] = useState<boolean>(false);

  // New Supplier Form State
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');
  const [newSuppBalance, setNewSuppBalance] = useState<number>(0);
  const [newSuppAddress, setNewSuppAddress] = useState('');
  const [newSuppNotes, setNewSuppNotes] = useState('');
  const [newSuppIsCustomer, setNewSuppIsCustomer] = useState<boolean>(false);

  // New Item Form State
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('شاشة');
  const [newItemPrice, setNewItemPrice] = useState<number>(100);
  const [newItemStock, setNewItemStock] = useState<number>(50);

  // Voucher Form State
  const [vchName, setVchName] = useState('');
  const [vchAmount, setVchAmount] = useState<number>(0);
  const [vchNotes, setVchNotes] = useState('');
  const [vchPartyType, setVchPartyType] = useState<'customer' | 'supplier' | 'general'>('general');
  const [selectedVchPartyId, setSelectedVchPartyId] = useState<string>('');

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Derived stock categories from inventoryDb (unique, stable order)
  const categories = useMemo(() => {
    const fromDb = inventoryDb.map(i => i.category).filter(Boolean);
    const defaults = ['شاشة', 'جراب', 'شاحن', 'سماعة', 'كابل', 'هاتف', 'إكسسوارات', 'صيانة', 'وصلة'];
    const merged = Array.from(new Set([...fromDb, ...defaults]));
    return merged;
  }, [inventoryDb]);

  // Price level multipliers
  const priceMultipliers = {
    'سعر1': 1.0,
    'سعر2': 0.95,
    'سعر3': 0.90,
    'سعر4': 0.85
  };

  // Smart Product & Pricing Intelligence helper for active input item
  const activeInputDbItem = useMemo(() => {
    if (!itemName.trim() && !codeQuery.trim()) return null;
    const nameQuery = itemName.trim().toLowerCase();
    const code = codeQuery.trim().toLowerCase();
    return inventoryDb.find(i => 
      (nameQuery && i.name.toLowerCase() === nameQuery) ||
      (code && (i.code.toLowerCase() === code || (i.serial && i.serial.toLowerCase() === code)))
    ) || null;
  }, [itemName, codeQuery, inventoryDb]);

  // Last selling price and last purchase price derived from completed invoices
  const itemPricingHistory = useMemo(() => {
    if (!activeInputDbItem) return { lastSellingPrice: null, lastPurchasePrice: null };
    let lastSelling: number | null = null;
    let lastPurchase: number | null = null;

    for (const inv of completedInvoices) {
      const match = inv.items?.find(it => it.code === activeInputDbItem.code || it.name.trim().toLowerCase() === activeInputDbItem.name.trim().toLowerCase());
      if (match) {
        if (inv.type === 'بيع' && lastSelling === null) {
          lastSelling = match.price;
        } else if (inv.type === 'شراء' && lastPurchase === null) {
          lastPurchase = match.price;
        }
      }
      if (lastSelling !== null && lastPurchase !== null) break;
    }
    return { lastSellingPrice: lastSelling, lastPurchasePrice: lastPurchase };
  }, [activeInputDbItem, completedInvoices]);

  // Customer Last Selling Price Intelligence for current item
  const customerLastSellingPrice = useMemo(() => {
    if (activeTabGroup !== 'بيع' && activeTabGroup !== 'مرتجع بيع') return null;
    if (!customerName || !customerName.trim() || customerName.trim() === 'عميل نقدي') return null;
    if (!activeInputDbItem && !itemName.trim()) return null;

    const targetCode = activeInputDbItem?.code;
    const targetName = (activeInputDbItem?.name || itemName).trim().toLowerCase();

    for (const inv of completedInvoices) {
      if (inv.type === 'بيع' && (inv.customerName === customerName || (customerPhone && inv.customerPhone === customerPhone))) {
        const match = inv.items?.find(it => (targetCode && it.code === targetCode) || (it.name && it.name.trim().toLowerCase() === targetName));
        if (match && typeof match.price === 'number') {
          return match.price;
        }
      }
    }
    return null;
  }, [activeTabGroup, customerName, customerPhone, activeInputDbItem, itemName, completedInvoices]);

  // Unreasonable Quantity / Price Warning Dialog State
  const [activeAnomalyWarning, setActiveAnomalyWarning] = useState<{
    type: 'QTY_HIGH' | 'PRICE_LOW' | 'PRICE_HIGH';
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Eligible original invoices for return linking
  const eligibleOriginalInvoices = useMemo(() => {
    if (activeTabGroup === 'مرتجع بيع') {
      return completedInvoices.filter(inv => inv.type === 'بيع');
    }
    if (activeTabGroup === 'مرتجع شراء') {
      return completedInvoices.filter(inv => inv.type === 'شراء');
    }
    return [];
  }, [activeTabGroup, completedInvoices]);

  const currentOriginalInvoice = useMemo(() => {
    if (!selectedOriginalInvoiceId) return null;
    return completedInvoices.find(inv => inv.id === selectedOriginalInvoiceId) || null;
  }, [selectedOriginalInvoiceId, completedInvoices]);

  // Map of maximum returnable quantity per product code or name
  // Returnable Quantity = Original Quantity - Previously Returned Quantity
  const returnableQtyMap = useMemo(() => {
    if (!currentOriginalInvoice) return undefined;
    const map: Record<string, number> = {};

    // 1. Initialize with original quantities
    for (const item of currentOriginalInvoice.items) {
      const key = item.code || item.name;
      map[key] = (map[key] || 0) + item.quantity;
    }

    // 2. Subtract quantities from previous completed returns linked to this original invoice
    const previousReturns = completedInvoices.filter(
      inv => inv.originalInvoiceId === currentOriginalInvoice.id &&
             ((currentOriginalInvoice.type === 'بيع' && inv.type === 'مرتجع بيع') ||
              (currentOriginalInvoice.type === 'شراء' && inv.type === 'مرتجع شراء'))
    );

    for (const retInv of previousReturns) {
      for (const item of retInv.items) {
        const key = item.code || item.name;
        if (map[key] !== undefined) {
          map[key] = Math.max(0, map[key] - item.quantity);
        }
      }
    }

    return map;
  }, [currentOriginalInvoice, completedInvoices]);

  // Smart Customer & Sales Assistance memo
  const activeCustomerRecord = useMemo(() => {
    if (!customerName.trim() && !customerPhone.trim()) return null;
    const nameMatch = customerName.trim().toLowerCase();
    const phoneMatch = customerPhone.trim();
    return customersList.find(c =>
      (phoneMatch && c.phone === phoneMatch) ||
      (nameMatch && c.name.toLowerCase() === nameMatch)
    ) || null;
  }, [customerName, customerPhone, customersList]);

  const activeCustomerIntelligence = useMemo(() => {
    if (!activeCustomerRecord) return null;
    const custInvoices = completedInvoices.filter(i => 
      i.type === 'بيع' && (
        (i.customerPhone && i.customerPhone === activeCustomerRecord.phone) ||
        (i.customerName && i.customerName.toLowerCase() === activeCustomerRecord.name.toLowerCase())
      )
    );

    const totalPurchases = custInvoices.reduce((acc, i) => acc + (i.total || 0), 0);
    const invoiceCount = custInvoices.length;
    const lastInvoice = custInvoices.length > 0 ? custInvoices[0] : null;

    // Favorite / top purchased items
    const itemCounts = new Map<string, { item: InventoryItem; count: number }>();
    custInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const key = it.code || it.name;
        const dbIt = inventoryDb.find(db => db.code === it.code || db.name.toLowerCase() === it.name.toLowerCase());
        const baseItem: InventoryItem = dbIt || {
          code: it.code || `TMP-${Math.floor(Math.random()*1000)}`,
          name: it.name,
          category: 'عام',
          price: it.price,
          costPrice: it.costPrice || it.price * 0.7,
          stock: 50,
          minStock: 5
        };
        if (!itemCounts.has(key)) {
          itemCounts.set(key, { item: baseItem, count: 0 });
        }
        itemCounts.get(key)!.count += it.quantity;
      });
    });

    const favoriteItems = Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(x => x.item);

    return {
      customer: activeCustomerRecord,
      balance: activeCustomerRecord.balance || 0,
      totalPurchases,
      invoiceCount,
      lastInvoiceDate: lastInvoice?.date || null,
      lastInvoiceTotal: lastInvoice?.total || null,
      favoriteItems
    };
  }, [activeCustomerRecord, completedInvoices, inventoryDb]);

  // Active Supplier Record
  const activeSupplierRecord = useMemo(() => {
    if (!supplierName.trim() && !supplierPhone.trim()) return null;
    const nameMatch = supplierName.trim().toLowerCase();
    const phoneMatch = supplierPhone.trim();
    return suppliersList.find(s =>
      (phoneMatch && s.phone === phoneMatch) ||
      (nameMatch && s.name.toLowerCase() === nameMatch)
    ) || null;
  }, [supplierName, supplierPhone, suppliersList]);

  // Calculations
  const subtotal = invoiceItems.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const remaining = Math.max(0, grandTotal - paid);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load persistent data from IndexedDB on startup
  useEffect(() => {
    loadAppData().then((data) => {
      if (data.inventoryDb && data.inventoryDb.length > 0) setInventoryDb(data.inventoryDb);
      if (data.quickProducts && data.quickProducts.length > 0) setQuickProducts(data.quickProducts);
      if (data.customersList && data.customersList.length > 0) setCustomersList(data.customersList);
      if (data.suppliersList && data.suppliersList.length > 0) setSuppliersList(data.suppliersList);
      if (data.vouchersList && data.vouchersList.length > 0) setVouchersList(data.vouchersList);
      if (data.completedInvoices) setCompletedInvoices(data.completedInvoices);
      if (data.heldInvoices) setHeldInvoices(data.heldInvoices);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.users && data.users.length > 0) {
        setUsersList(data.users);
        const adminUsr = data.users.find(u => u.username === 'admin') || data.users[0];
        setCurrentUser(adminUsr);
      }
      if (data.roles && data.roles.length > 0) setRolesList(data.roles);
      if (data.auditLogs) setAuditLogsList(data.auditLogs);
      if (data.treasuries && data.treasuries.length > 0) setTreasuriesList(data.treasuries);
      if (data.banks && data.banks.length > 0) setBanksList(data.banks);
      if (data.specialAccounts && data.specialAccounts.length > 0) setSpecialAccountsList(data.specialAccounts);
      if (data.cheques && data.cheques.length > 0) setChequesList(data.cheques);
      if (data.shifts && data.shifts.length > 0) setShiftsList(data.shifts);
      dbGetFinancialTransfers().then(transfers => {
        if (transfers && transfers.length > 0) setFinancialTransfersList(transfers);
      });
      if (data.settings) {
        if (data.settings.selectedBranch) setSelectedBranch(data.settings.selectedBranch);
        if (data.settings.selectedDrawer) setSelectedDrawer(data.settings.selectedDrawer);
        if (data.settings.selectedPriceLevel) setSelectedPriceLevel(data.settings.selectedPriceLevel);
        if (data.settings.showQuickProducts !== undefined) setShowQuickProducts(data.settings.showQuickProducts);
      }
      if (data.openInvoiceDraft && data.openInvoiceDraft.openInvoices && data.openInvoiceDraft.openInvoices.length > 0) {
        const restoredSessions = data.openInvoiceDraft.openInvoices;
        const restoredActiveId = data.openInvoiceDraft.activeOpenInvoiceId || restoredSessions[0].id;
        setOpenInvoices(restoredSessions);
        setActiveOpenInvoiceId(restoredActiveId);
        const activeSess = restoredSessions.find(s => s.id === restoredActiveId) || restoredSessions[0];
        if (activeSess) {
          isSwitchingSessionRef.current = true;
          setActiveTabGroup(activeSess.type || 'بيع');
          if (activeSess.type === 'شراء' || activeSess.type === 'مرتجع شراء') {
            setSupplierName(activeSess.supplierName || activeSess.customerName || 'مورد عام');
            setSupplierPhone(activeSess.supplierPhone || activeSess.customerPhone || '');
            setSelectedSupplierId(activeSess.supplierId || 'SUP-1');
          } else {
            setCustomerName(activeSess.customerName || 'عميل نقدي');
            setCustomerPhone(activeSess.customerPhone || '');
          }
          setSelectedPriceLevel(activeSess.selectedPriceLevel || 'سعر1');
          setSelectedBranch(activeSess.selectedBranch || 'عاصم فون - الفرع الرئيسي');
          setSelectedDrawer(activeSess.selectedDrawer || 'الدرج الرئيسي');
          setInvoiceItems(activeSess.items || []);
          setDiscount(activeSess.discount || 0);
          setTax(activeSess.tax || 0);
          setPaid(activeSess.paid ?? 0);
          setCurrentPayments(activeSess.payments || []);
          setSelectedOriginalInvoiceId(activeSess.originalInvoiceId || '');
          setTimeout(() => {
            isSwitchingSessionRef.current = false;
            isInitialLoadDoneRef.current = true;
          }, 100);
        }
      } else {
        isInitialLoadDoneRef.current = true;
      }
    }).catch(err => {
      console.error('Error hydrating app state from IndexedDB:', err);
      isInitialLoadDoneRef.current = true;
    });
  }, []);

  // Auto-Draft Persistence: Debounced autosave of open invoices state to IndexedDB
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;
    const timer = setTimeout(() => {
      dbSaveOpenInvoiceDraft({
        openInvoices,
        activeOpenInvoiceId
      }).catch(err => {
        console.error('Error autosaving open invoice draft:', err);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [openInvoices, activeOpenInvoiceId]);

  // Handlers for Shift Management
  const handleOpenShift = async (openingCash: number, notes?: string) => {
    if (!checkPermission('SHIFT_OPEN', 'فتح وردية كاشير')) return;
    const newShiftId = `SH-${Date.now().toString().slice(-6)}`;
    const newShift: Shift = {
      id: newShiftId,
      userId: currentUser?.id || 'admin',
      userName: currentUser?.displayName || currentUser?.username || 'المسؤول',
      branch: selectedBranch,
      drawer: selectedDrawer,
      openedAt: new Date().toISOString(),
      openingCash: openingCash,
      expectedCash: openingCash,
      totalSales: 0,
      totalPurchases: 0,
      totalSalesReturns: 0,
      totalPurchaseReturns: 0,
      totalExpenses: 0,
      totalCashIn: 0,
      totalCashOut: 0,
      invoiceCount: 0,
      status: 'OPEN',
      notes: notes || ''
    };

    await dbSaveShift(newShift);
    setShiftsList(prev => [newShift, ...prev.filter(s => s.id !== newShift.id)]);

    await dbAddAuditLog({
      userId: currentUser?.id || 'admin',
      username: currentUser?.username || 'admin',
      action: 'SHIFT_OPEN',
      details: `تم فتح وردية جديدة رقم [${newShiftId}] برصيد افتتاحي: ${openingCash.toFixed(2)} ج.م`
    });
    const updatedLogs = await dbGetAuditLogs();
    setAuditLogsList(updatedLogs);
  };

  const handleCloseShift = async (shiftId: string, actualCash: number, notes?: string) => {
    if (!checkPermission('SHIFT_CLOSE', 'إغلاق الوردية ومطابقة النقدية')) return;
    const targetShift = shiftsList.find(s => s.id === shiftId);
    if (!targetShift) return;

    // Filter invoices linked to this shift
    const shiftInvoices = completedInvoices.filter(inv => {
      if (inv.shiftId && inv.shiftId === shiftId) return true;
      if (!inv.shiftId) {
        const invTime = new Date(`${inv.date} ${inv.time || '00:00:00'}`).getTime();
        const openTime = new Date(targetShift.openedAt).getTime();
        const closeTime = Date.now();
        return invTime >= openTime && invTime <= closeTime && (!targetShift.userId || inv.userId === targetShift.userId);
      }
      return false;
    });

    const shiftVouchers = vouchersList.filter(vch => {
      if (vch.shiftId && vch.shiftId === shiftId) return true;
      if (!vch.shiftId) {
        const vchTime = new Date(vch.date).getTime();
        const openTime = new Date(targetShift.openedAt).getTime();
        const closeTime = Date.now();
        return vchTime >= openTime && vchTime <= closeTime && (!targetShift.userId || vch.userId === targetShift.userId);
      }
      return false;
    });

    let totalSales = 0;
    let cashSales = 0;
    let creditSales = 0;
    let totalPurchases = 0;
    let cashPurchases = 0;
    let creditPurchases = 0;
    let totalSalesReturns = 0;
    let cashSalesReturns = 0;
    let totalPurchaseReturns = 0;
    let cashPurchaseReturns = 0;

    for (const inv of shiftInvoices) {
      if (inv.type === 'بيع') {
        totalSales += inv.total;
        cashSales += (inv.paid || 0);
        creditSales += (inv.remaining || 0);
      } else if (inv.type === 'شراء') {
        totalPurchases += inv.total;
        cashPurchases += (inv.paid || 0);
        creditPurchases += (inv.remaining || 0);
      } else if (inv.type === 'مرتجع بيع') {
        totalSalesReturns += inv.total;
        const cashRefunded = inv.paid !== undefined ? inv.paid : (inv.status === 'مدفوعة' ? inv.total : 0);
        cashSalesReturns += cashRefunded;
      } else if (inv.type === 'مرتجع شراء') {
        totalPurchaseReturns += inv.total;
        const cashReceived = inv.paid !== undefined ? inv.paid : (inv.status === 'مدفوعة' ? inv.total : 0);
        cashPurchaseReturns += cashReceived;
      }
    }

    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalExpenses = 0;

    for (const vch of shiftVouchers) {
      const isInternalTransfer =
        vch.category === 'تحويل مالي داخلي' ||
        vch.id?.startsWith('VCH-TRF-') ||
        vch.notes?.includes('تحويل مالي');

      if (vch.type === 'قبض') {
        totalCashIn += vch.amount;
      } else if (vch.type === 'صرف') {
        totalCashOut += vch.amount;
        if (!isInternalTransfer && (vch.notes?.includes('مصروف') || vch.partyType === 'expense' || vch.partyType === 'general' || (vch.category && vch.partyType !== 'supplier' && vch.partyType !== 'customer'))) {
          totalExpenses += vch.amount;
        }
      }
    }

    const expectedCash =
      targetShift.openingCash +
      cashSales -
      cashSalesReturns -
      cashPurchases +
      cashPurchaseReturns +
      totalCashIn -
      totalCashOut;

    const cashDifference = actualCash - expectedCash;

    const closedShift: Shift = {
      ...targetShift,
      closedAt: new Date().toISOString(),
      status: 'CLOSED',
      actualCash,
      expectedCash,
      cashDifference,
      totalSales,
      totalPurchases,
      totalSalesReturns,
      totalPurchaseReturns,
      totalCashIn,
      totalCashOut,
      totalExpenses,
      invoiceCount: shiftInvoices.length,
      notes: notes || targetShift.notes
    };

    await dbUpdateShift(closedShift);
    setShiftsList(prev => prev.map(s => s.id === shiftId ? closedShift : s));

    await dbAddAuditLog({
      userId: currentUser?.id || 'admin',
      username: currentUser?.username || 'admin',
      action: 'SHIFT_CLOSE',
      details: `تم إغلاق الوردية [${shiftId}] - المتوقع: ${expectedCash.toFixed(2)} ج.م، الفعلي: ${actualCash.toFixed(2)} ج.م، الفارق: ${cashDifference.toFixed(2)} ج.م`
    });
    const updatedLogs = await dbGetAuditLogs();
    setAuditLogsList(updatedLogs);
  };

  // Keyboard Shortcuts (F12 = Payment & Print, F10 = Save, F9 = Shifts, Ctrl+N = New Open Tab)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F12') {
        e.preventDefault();
        handleSaveAndPrint({ print: true });
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleSaveAndPrint({ print: false });
      } else if (e.key === 'F9') {
        e.preventDefault();
        setShowShiftModal(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNewOpenInvoice();
      } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') || e.key === 'F3') {
        e.preventDefault();
        setShowUniversalSearchModal(true);
      } else if (e.key === 'Escape') {
        setActiveMenu(null);
        setShowPrintModal(false);
        setShowAddCustomerModal(false);
        setShowCustomerListModal(false);
        setShowAddItemModal(false);
        setShowVoucherModal(false);
        setShowDailyReportModal(false);
        setShowAdminSettingsModal(false);
        setShowBackupModal(false);
        setShowCalculatorModal(false);
        setShowShiftModal(false);
        setShowUniversalSearchModal(false);
        setIsCustomerDropdownOpen(false);
        setIsGlobalSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoiceItems, customerName, customerPhone, grandTotal, paid, remaining, discount, tax]);

  // Click outside to close customer dropdown and global search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setIsGlobalSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize active working state into active open invoice session
  useEffect(() => {
    if (!activeOpenInvoiceId || isSwitchingSessionRef.current) return;
    setOpenInvoices((prev) =>
      prev.map((session) => {
        if (session.id === activeOpenInvoiceId) {
          const nameToDisplay = (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء')
            ? (supplierName || session.supplierName || 'مورد عام')
            : (customerName || session.customerName || 'عميل نقدي');
          return {
            ...session,
            type: activeTabGroup,
            customerName: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierName : customerName,
            customerPhone: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierPhone : customerPhone,
            supplierId: selectedSupplierId,
            supplierName: supplierName,
            supplierPhone: supplierPhone,
            selectedPriceLevel,
            selectedBranch,
            selectedDrawer,
            items: invoiceItems,
            discount,
            tax,
            paid,
            payments: currentPayments,
            originalInvoiceId: selectedOriginalInvoiceId || undefined,
            originalInvoiceNumber: selectedOriginalInvoiceId || undefined,
            sessionName: nameToDisplay
          };
        }
        return session;
      })
    );
  }, [
    activeOpenInvoiceId,
    activeTabGroup,
    customerName,
    customerPhone,
    supplierName,
    supplierPhone,
    selectedSupplierId,
    selectedPriceLevel,
    selectedBranch,
    selectedDrawer,
    invoiceItems,
    discount,
    tax,
    paid,
    currentPayments,
    selectedOriginalInvoiceId
  ]);

  // Auto update paid amount to match total by default when creating fresh items
  const prevGrandTotalRef = useRef<number>(grandTotal);
  useEffect(() => {
    if (isSwitchingSessionRef.current) {
      prevGrandTotalRef.current = grandTotal;
      return;
    }
    if (paid === prevGrandTotalRef.current || paid === 0) {
      setPaid(grandTotal);
    }
    prevGrandTotalRef.current = grandTotal;
  }, [grandTotal]);

  // Handler: Code Search Input (Barcode scanner & Fast Search compatibility)
  const handleCodeSearch = () => {
    if (isAddingItemRef.current) return;
    const query = codeQuery.trim();
    if (!query) return;

    isAddingItemRef.current = true;
    try {
      // 1. Exact match in inventoryDb (by code, serial, or exact name)
      const exactDb = inventoryDb.find(i => i.code === query || (i.serial && i.serial === query) || i.name.toLowerCase() === query.toLowerCase());
      const exactQuick = quickProducts.find(q => q.key === query || q.name.toLowerCase() === query.toLowerCase());

      if (exactDb) {
        const price = exactDb.price * priceMultipliers[selectedPriceLevel];
        addOrUpdateItem(exactDb.name, exactDb.category, price, exactDb.code, exactDb.serial);
        setCodeQuery('');
        codeQueryInputRef.current?.focus();
        return;
      }

      if (exactQuick) {
        const price = exactQuick.price * priceMultipliers[selectedPriceLevel];
        setItemName(exactQuick.name);
        setItemCategory(exactQuick.category);
        setItemPrice(price);
        setItemQuantity(1);
        setItemValue(price);
        setItemSerial('');
        setItemNotes('');
        setLastEditedField('quantity');
        setShowAutocomplete(false);
        setCodeQuery('');
        setTimeout(() => {
          itemQtyInputRef.current?.focus();
          itemQtyInputRef.current?.select();
        }, 30);
        return;
      }

      // 2. Partial search in inventoryDb
      const partialDb = inventoryDb.filter(i => 
        i.code.includes(query) || 
        i.name.toLowerCase().includes(query.toLowerCase()) || 
        (i.serial && i.serial.includes(query))
      );

      if (partialDb.length === 1) {
        const found = partialDb[0];
        const price = found.price * priceMultipliers[selectedPriceLevel];
        setItemName(found.name);
        setItemCategory(found.category);
        setItemPrice(price);
        setItemQuantity(1);
        setItemValue(price);
        setItemSerial(found.serial || '');
        setItemNotes('');
        setLastEditedField('quantity');
        setShowAutocomplete(false);
        setCodeQuery('');
        setTimeout(() => {
          itemQtyInputRef.current?.focus();
          itemQtyInputRef.current?.select();
        }, 30);
        return;
      } else if (partialDb.length > 1) {
        setItemName(query);
        setShowAutocomplete(true);
        setAutocompleteSelectedIndex(0);
        setCodeQuery('');
        itemNameInputRef.current?.focus();
        return;
      }

      // 3. Fallback: transfer query to item name and focus quantity
      setItemName(query);
      setCodeQuery('');
      setShowAutocomplete(false);
      setTimeout(() => {
        itemQtyInputRef.current?.focus();
        itemQtyInputRef.current?.select();
      }, 30);
    } finally {
      setTimeout(() => {
        isAddingItemRef.current = false;
      }, 100);
    }
  };

  // Helper: Add or Update Item in Invoice
  const addOrUpdateItem = (name: string, category: string, price: number, code?: string, serial?: string, notes?: string) => {
    const matchingDbItem = inventoryDb.find(i => (code && i.code === code) || i.name === name);
    const costPrice = matchingDbItem?.costPrice;

    const existingIndex = invoiceItems.findIndex(i => i.name === name && !i.serialNumber && !serial);
    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = Math.round(updated[existingIndex].quantity * updated[existingIndex].price * 100) / 100;
      if (costPrice !== undefined && updated[existingIndex].costPrice === undefined) {
        updated[existingIndex].costPrice = costPrice;
      }
      setInvoiceItems(updated);
    } else {
      const newItem: InvoiceItem = {
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        code: code || matchingDbItem?.code || Math.floor(1000 + Math.random() * 9000).toString(),
        name,
        category,
        quantity: 1,
        price,
        costPrice,
        total: Math.round(price * 100) / 100,
        serialNumber: serial || '',
        notes: notes || ''
      };
      setInvoiceItems(prev => [...prev, newItem]);
    }
  };

  // Handler: Add Quick Product directly to input preparation bar
  const handleAddQuickProduct = (prod: QuickProduct) => {
    const adjustedPrice = prod.price * priceMultipliers[selectedPriceLevel];
    setItemName(prod.name);
    setItemCategory(prod.category);
    setItemPrice(adjustedPrice);
    setItemQuantity(1);
    setItemValue(adjustedPrice);
    setItemSerial('');
    setItemNotes('');
    setLastEditedField('quantity');
    setShowAutocomplete(false);
    setTimeout(() => {
      itemQtyInputRef.current?.focus();
      itemQtyInputRef.current?.select();
    }, 30);
  };

  // Handler: Change Quantity in Input Bar (Smart Real-time calculation)
  const handleQuantityChange = (valStr: string) => {
    setItemQuantity(valStr);
    setLastEditedField('quantity');
    const q = parseFloat(valStr);
    const p = typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice));

    if (!isNaN(q) && q > 0 && !isNaN(p) && p >= 0) {
      const valCalc = Math.round(q * p * 100) / 100;
      setItemValue(valCalc);
    } else if (valStr === '' || q === 0) {
      setItemValue('');
    }
  };

  // Handler: Change Unit Price in Input Bar (Smart Real-time calculation)
  const handlePriceChange = (valStr: string) => {
    setItemPrice(valStr);
    setLastEditedField('price');
    const p = parseFloat(valStr);
    const q = typeof itemQuantity === 'number' ? itemQuantity : parseFloat(String(itemQuantity));

    if (!isNaN(p) && p >= 0 && !isNaN(q) && q > 0) {
      const valCalc = Math.round(q * p * 100) / 100;
      setItemValue(valCalc);
    } else if (valStr === '') {
      setItemValue('');
    }
  };

  // Handler: Change Total Value in Input Bar (Smart Real-time calculation: Unit Price = Value / Qty)
  const handleValueChange = (valStr: string) => {
    setItemValue(valStr);
    setLastEditedField('value');
    const v = parseFloat(valStr);
    const q = typeof itemQuantity === 'number' ? itemQuantity : parseFloat(String(itemQuantity));

    if (!isNaN(v) && v >= 0 && !isNaN(q) && q > 0) {
      const priceCalc = Math.round((v / q) * 1000) / 1000;
      setItemPrice(priceCalc);
    } else if (valStr === '') {
      setItemPrice('');
    }
  };

  // Helper: Select Item from Autocomplete / Search — Stage 1: Selection & Input Preparation ONLY
  const handleSelectItemFromList = (item: InventoryItem) => {
    setShowAutocomplete(false);
    setAutocompleteSelectedIndex(0);
    const adjustedPrice = item.price * priceMultipliers[selectedPriceLevel];
    setItemName(item.name);
    setItemCategory(item.category || '');
    setItemPrice(adjustedPrice);
    setItemQuantity(1);
    setItemValue(adjustedPrice);
    setItemSerial(item.serial || '');
    setItemNotes('');
    setLastEditedField('quantity');
    setTimeout(() => {
      itemQtyInputRef.current?.focus();
      itemQtyInputRef.current?.select();
    }, 30);
  };

  // Helper: Commit item to invoice and reset inputs — Stage 2: Final Addition to Invoice
  const doCommitInvoiceItem = (qty: number, finalPrice: number, matchingDbItem?: InventoryItem) => {
    const totalVal = Math.round(qty * finalPrice * 100) / 100;
    const costPrice = matchingDbItem?.costPrice;

    // Check if an item with same name already exists in invoice (and neither has unique serial)
    const existingIndex = invoiceItems.findIndex(
      i => i.name === itemName.trim() && !i.serialNumber && !itemSerial
    );

    if (existingIndex > -1) {
      const updated = [...invoiceItems];
      const newQty = updated[existingIndex].quantity + qty;
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = Math.round(newQty * updated[existingIndex].price * 100) / 100;
      if (itemNotes.trim()) {
        updated[existingIndex].notes = updated[existingIndex].notes
          ? `${updated[existingIndex].notes} | ${itemNotes.trim()}`
          : itemNotes.trim();
      }
      setInvoiceItems(updated);
    } else {
      const newItem: InvoiceItem = {
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        code: matchingDbItem?.code || Math.floor(1000 + Math.random() * 9000).toString(),
        name: itemName.trim(),
        category: itemCategory || matchingDbItem?.category || 'عام',
        quantity: qty,
        price: finalPrice,
        costPrice,
        total: totalVal,
        serialNumber: itemSerial.trim(),
        notes: itemNotes.trim()
      };
      setInvoiceItems(prev => [...prev, newItem]);
    }

    // Reset inputs
    setItemName('');
    setItemSerial('');
    setItemPrice(0);
    setItemQuantity(1);
    setItemValue(0);
    setItemNotes('');
    setLastEditedField('quantity');
    setShowAutocomplete(false);
    setAutocompleteSelectedIndex(0);

    // Return focus to item name for fast continuous entry
    setTimeout(() => {
      itemNameInputRef.current?.focus();
    }, 20);
  };

  // Handler: Add Item manually from input bar
  const handleAddItemFromBar = () => {
    if (isAddingItemRef.current) return;
    if (!itemName.trim()) return;

    isAddingItemRef.current = true;
    try {
      const qtyNum = typeof itemQuantity === 'number' ? itemQuantity : parseFloat(String(itemQuantity));
      const qty = (!isNaN(qtyNum) && qtyNum > 0) ? qtyNum : 1;

      let basePrice = 0;
      if (lastEditedField === 'value') {
        const valNum = typeof itemValue === 'number' ? itemValue : parseFloat(String(itemValue));
        if (!isNaN(valNum) && valNum >= 0 && qty > 0) {
          basePrice = valNum / qty;
        } else {
          const prcNum = typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice));
          basePrice = !isNaN(prcNum) && prcNum >= 0 ? prcNum : 0;
        }
      } else {
        const prcNum = typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice));
        basePrice = !isNaN(prcNum) && prcNum >= 0 ? prcNum : 0;
      }

      const finalPrice = basePrice * priceMultipliers[selectedPriceLevel];

      const matchingDbItem = inventoryDb.find(i => i.name === itemName.trim() || (itemSerial && i.serial === itemSerial.trim()));

      // Anomaly Validation: Large Quantity or Extreme Price Warning
      const isExtremeQty = qty >= 100 && (!matchingDbItem?.stock || qty > (matchingDbItem.stock * 5));
      const isExtremeLowPrice = matchingDbItem && matchingDbItem.price > 0 && finalPrice > 0 && finalPrice <= (matchingDbItem.price * 0.15);
      const isExtremeHighPrice = matchingDbItem && matchingDbItem.price > 0 && finalPrice >= (matchingDbItem.price * 8);

      if (isExtremeQty) {
        setActiveAnomalyWarning({
          type: 'QTY_HIGH',
          title: 'تنبيه: كمية غير معتادة',
          message: `الكمية المدخلة (${qty}) كبيرة جداً. هل ترغب في المتابعة وإدراج الصنف؟`,
          onConfirm: () => {
            doCommitInvoiceItem(qty, finalPrice, matchingDbItem);
            setActiveAnomalyWarning(null);
          }
        });
        return;
      }

      if (isExtremeLowPrice) {
        setActiveAnomalyWarning({
          type: 'PRICE_LOW',
          title: 'تنبيه: سعر بيع منخفض جداً',
          message: `السعر المدخل (${finalPrice} ج.م) منخفض جداً مقارنة بالسعر المعتاد (${matchingDbItem.price} ج.م). هل ترغب في المتابعة؟`,
          onConfirm: () => {
            doCommitInvoiceItem(qty, finalPrice, matchingDbItem);
            setActiveAnomalyWarning(null);
          }
        });
        return;
      }

      if (isExtremeHighPrice) {
        setActiveAnomalyWarning({
          type: 'PRICE_HIGH',
          title: 'تنبيه: سعر بيع مرتفع جداً',
          message: `السعر المدخل (${finalPrice} ج.م) مرتفع جداً مقارنة بالسعر المعتاد (${matchingDbItem.price} ج.م). هل ترغب في المتابعة؟`,
          onConfirm: () => {
            doCommitInvoiceItem(qty, finalPrice, matchingDbItem);
            setActiveAnomalyWarning(null);
          }
        });
        return;
      }

      doCommitInvoiceItem(qty, finalPrice, matchingDbItem);
    } finally {
      setTimeout(() => {
        isAddingItemRef.current = false;
      }, 100);
    }
  };

  // Handler: Update Quantity inline in grid
  const handleUpdateQuantity = (id: string, delta: number) => {
    setInvoiceItems(
      invoiceItems.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, total: newQty * item.price };
        }
        return item;
      })
    );
  };

  // Handler: Update any field of an item inline (Excel style)
  const handleUpdateInvoiceItem = (id: string, updates: Partial<InvoiceItem>) => {
    setInvoiceItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          if (updates.quantity !== undefined || updates.price !== undefined) {
            updated.total = updated.quantity * updated.price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Handler: Add Item directly (from Excel Paste or Quick Add)
  const handleAddDirectItem = (partialItem: Partial<InvoiceItem>) => {
    const qty = partialItem.quantity || 1;
    const prc = partialItem.price || 0;
    const newItem: InvoiceItem = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      code: partialItem.code || Math.floor(1000 + Math.random() * 9000).toString(),
      name: partialItem.name || 'صنف جديد',
      category: partialItem.category || itemCategory,
      quantity: qty,
      price: prc,
      costPrice: partialItem.costPrice || 0,
      total: qty * prc,
      serialNumber: partialItem.serialNumber || '',
      notes: partialItem.notes || ''
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  // Handler: Remove Item
  const handleRemoveItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  // Handlers: Multi-Item Selection / Copy / Delete / Move
  const handleToggleSelectItem = (id: string, selected: boolean) => {
    setInvoiceItems(prev => prev.map(item => item.id === id ? { ...item, selected } : item));
  };

  const handleToggleSelectAll = (selected: boolean) => {
    setInvoiceItems(prev => prev.map(item => ({ ...item, selected })));
  };

  const handleDeleteSelectedItems = () => {
    const selected = invoiceItems.filter(i => i.selected);
    if (selected.length === 0) return;
    if (window.confirm(`هل أنت متأكد من حذف (${selected.length}) صنف محدد من الفاتورة؟`)) {
      setInvoiceItems(prev => prev.filter(i => !i.selected));
    }
  };

  const handleCopySelectedItems = () => {
    const selected = invoiceItems.filter(i => i.selected);
    if (selected.length === 0) return;
    const copied: InvoiceItem[] = selected.map(item => ({
      ...item,
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      selected: false
    }));
    setInvoiceItems(prev => [...prev, ...copied]);
  };

  const handleMoveSelectedItems = (targetInvoiceId?: string) => {
    const selected = invoiceItems.filter(i => i.selected);
    if (selected.length === 0) return;
    const remainingItems = invoiceItems.filter(i => !i.selected);
    const movedItems: InvoiceItem[] = selected.map(i => ({ ...i, selected: false }));

    if (!targetInvoiceId || targetInvoiceId === 'NEW_INVOICE') {
      const newId = 'OPEN-' + (Date.now().toString().slice(-4));
      const newSession: OpenInvoiceSession = {
        id: newId,
        sessionName: `فاتورة منقولة (${movedItems.length})`,
        type: activeTabGroup,
        customerName: customerName,
        customerPhone: customerPhone,
        supplierName: supplierName,
        supplierPhone: supplierPhone,
        supplierId: selectedSupplierId,
        selectedPriceLevel: selectedPriceLevel,
        selectedBranch: selectedBranch,
        selectedDrawer: selectedDrawer,
        items: movedItems,
        discount: 0,
        tax: 0,
        paid: movedItems.reduce((acc, it) => acc + (it.total || 0), 0)
      };
      setInvoiceItems(remainingItems);
      setOpenInvoices(prev => [
        ...prev.map(s => s.id === activeOpenInvoiceId ? { ...s, items: remainingItems } : s),
        newSession
      ]);
    } else {
      setInvoiceItems(remainingItems);
      setOpenInvoices(prev => prev.map(s => {
        if (s.id === activeOpenInvoiceId) {
          return { ...s, items: remainingItems };
        }
        if (s.id === targetInvoiceId) {
          return { ...s, items: [...s.items, ...movedItems] };
        }
        return s;
      }));
    }
  };

  // Handler: Select Open Invoice Session
  const handleSelectOpenInvoice = (sessionId: string) => {
    setActiveSavedInvoiceView(null);
    if (sessionId === activeOpenInvoiceId) return;
    const target = openInvoices.find(s => s.id === sessionId);
    if (!target) return;

    isSwitchingSessionRef.current = true;
    setActiveOpenInvoiceId(sessionId);
    setActiveTabGroup(target.type);
    if (target.type === 'شراء' || target.type === 'مرتجع شراء') {
      setSupplierName(target.supplierName || target.customerName || 'مورد عام');
      setSupplierPhone(target.supplierPhone || target.customerPhone || '');
      setSelectedSupplierId(target.supplierId || 'SUP-1');
    } else {
      setCustomerName(target.customerName || 'عميل نقدي');
      setCustomerPhone(target.customerPhone || '');
    }
    setSelectedPriceLevel(target.selectedPriceLevel || 'سعر1');
    setSelectedBranch(target.selectedBranch || 'عاصم فون - الفرع الرئيسي');
    setSelectedDrawer(target.selectedDrawer || 'الدرج الرئيسي');
    setSelectedOriginalInvoiceId(target.originalInvoiceId || '');
    setInvoiceItems([...target.items]);
    setDiscount(target.discount ?? 0);
    setTax(target.tax ?? 0);
    setPaid(target.paid ?? 0);
    setCurrentPayments(target.payments ? [...target.payments] : []);
    setItemName('');
    setItemSerial('');
    setItemPrice(0);
    setItemQuantity(1);
    setItemValue(0);
    setLastEditedField('quantity');
    setItemNotes('');
    setCodeQuery('');
    setShowAutocomplete(false);
    setInvoiceHistoryIndex(-1);

    setTimeout(() => {
      isSwitchingSessionRef.current = false;
      codeQueryInputRef.current?.focus();
    }, 50);
  };

  // Handler: Create New Open Invoice Session
  const handleCreateNewOpenInvoice = () => {
    setActiveSavedInvoiceView(null);
    const newId = 'OPEN-' + (Date.now().toString().slice(-4));
    const newSession: OpenInvoiceSession = {
      id: newId,
      sessionName: 'عميل نقدي',
      type: activeTabGroup,
      customerName: 'عميل نقدي',
      customerPhone: '',
      supplierName: suppliersList[0]?.name || 'شركة البركة للإلكترونيات',
      supplierPhone: suppliersList[0]?.phone || '01198765432',
      supplierId: suppliersList[0]?.id || 'SUP-1',
      selectedPriceLevel: 'سعر1',
      selectedBranch: selectedBranch,
      selectedDrawer: selectedDrawer,
      items: [],
      discount: 0,
      tax: 0,
      paid: 0,
      originalInvoiceId: undefined,
      originalInvoiceNumber: undefined
    };

    isSwitchingSessionRef.current = true;
    setOpenInvoices(prev => [...prev, newSession]);
    setActiveOpenInvoiceId(newId);
    setInvoiceItems([]);
    setCustomerName('عميل نقدي');
    setCustomerPhone('');
    setSelectedOriginalInvoiceId('');
    setDiscount(0);
    setTax(0);
    setPaid(0);
    setCurrentPayments([]);
    setItemName('');
    setItemSerial('');
    setItemPrice(0);
    setItemQuantity(1);
    setItemValue(0);
    setLastEditedField('quantity');
    setItemNotes('');
    setCodeQuery('');
    setShowAutocomplete(false);
    setAutocompleteSelectedIndex(0);
    setInvoiceHistoryIndex(-1);

    setTimeout(() => {
      isSwitchingSessionRef.current = false;
      codeQueryInputRef.current?.focus();
    }, 50);
  };

  // Handler: Close an Open Invoice Session
  const handleCloseOpenInvoice = (sessionId: string) => {
    if (openInvoices.length <= 1) {
      setInvoiceItems([]);
      setCustomerName('عميل نقدي');
      setCustomerPhone('');
      setDiscount(0);
      setTax(0);
      setPaid(0);
      return;
    }
    const remaining = openInvoices.filter(s => s.id !== sessionId);
    setOpenInvoices(remaining);
    if (activeOpenInvoiceId === sessionId) {
      const nextSession = remaining[0];
      isSwitchingSessionRef.current = true;
      setActiveOpenInvoiceId(nextSession.id);
      setActiveTabGroup(nextSession.type);
      if (nextSession.type === 'شراء' || nextSession.type === 'مرتجع شراء') {
        setSupplierName(nextSession.supplierName || nextSession.customerName || 'مورد عام');
        setSupplierPhone(nextSession.supplierPhone || nextSession.customerPhone || '');
        setSelectedSupplierId(nextSession.supplierId || 'SUP-1');
      } else {
        setCustomerName(nextSession.customerName || 'عميل نقدي');
        setCustomerPhone(nextSession.customerPhone || '');
      }
      setSelectedPriceLevel(nextSession.selectedPriceLevel);
      setSelectedBranch(nextSession.selectedBranch);
      setSelectedDrawer(nextSession.selectedDrawer);
      setSelectedOriginalInvoiceId(nextSession.originalInvoiceId || '');
      setInvoiceItems([...nextSession.items]);
      setDiscount(nextSession.discount ?? 0);
      setTax(nextSession.tax ?? 0);
      setPaid(nextSession.paid ?? 0);
      setCurrentPayments(nextSession.payments ? [...nextSession.payments] : []);
      setTimeout(() => {
        isSwitchingSessionRef.current = false;
      }, 50);
    }
  };

  // Handler: Clear / New Invoice Session
  const handleNewInvoice = () => {
    setMainViewMode('pos');
    setActiveSavedInvoiceView(null);
    if (invoiceItems.length > 0) {
      handleCreateNewOpenInvoice();
      return;
    }
    setInvoiceItems([]);
    setCustomerName('عميل نقدي');
    setCustomerPhone('');
    setSelectedOriginalInvoiceId('');
    setSupplierName('مورد عام');
    setSupplierPhone('');
    setDiscount(0);
    setTax(0);
    setPaid(0);
    setCurrentPayments([]);
    setItemName('');
    setItemSerial('');
    setItemPrice(0);
    setItemQuantity(1);
    setItemValue(0);
    setLastEditedField('quantity');
    setItemNotes('');
    setCodeQuery('');
    setShowAutocomplete(false);
    setInvoiceHistoryIndex(-1);
  };

  // Handler: Hold Invoice (الفواتير المؤجلة)
  const handleHoldInvoice = () => {
    if (invoiceItems.length === 0) return;
    const now = new Date();
    const saved: SavedInvoice = {
      id: 'INV-' + Math.floor(1000 + Math.random() * 9000),
      date: now.toLocaleDateString('ar-EG'),
      time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      type: activeTabGroup,
      customerName,
      customerPhone,
      items: [...invoiceItems],
      total: grandTotal,
      discount,
      tax,
      paid,
      remaining,
      branch: selectedBranch,
      drawer: selectedDrawer,
      status: remaining === 0 ? 'مدفوعة' : remaining === grandTotal ? 'مؤجلة' : 'جزئي',
      userId: currentUser?.id,
      createdByName: currentUser?.displayName || currentUser?.username,
      originalInvoiceId: selectedOriginalInvoiceId || undefined,
      originalInvoiceNumber: selectedOriginalInvoiceId || undefined
    };
    const updatedHeld = [saved, ...heldInvoices];
    setHeldInvoices(updatedHeld);
    dbSaveHeldInvoices(updatedHeld);
    handleNewInvoice();
  };

  // Handler: Save / Finalize Invoice (with optional Print)
  const handleSaveAndPrint = async (options?: { print?: boolean }) => {
    if (isSavingRef.current || invoiceItems.length === 0) return;
    const shouldPrint = options?.print ?? false;

    let reqPerm: Permission = 'SALE_CREATE';
    let actionDesc = 'إنشاء فاتورة بيع';
    if (activeTabGroup === 'شراء') {
      reqPerm = 'PURCHASE_CREATE';
      actionDesc = 'إنشاء فاتورة شراء';
    } else if (activeTabGroup === 'مرتجع بيع') {
      reqPerm = 'SALE_RETURN';
      actionDesc = 'إنشاء مرتجع بيع';
    } else if (activeTabGroup === 'مرتجع شراء') {
      reqPerm = 'PURCHASE_RETURN';
      actionDesc = 'إنشاء مرتجع شراء';
    } else if (activeTabGroup === 'نقل') {
      reqPerm = 'INVENTORY_TRANSFER';
      actionDesc = 'تحويل مخزني';
    } else if (activeTabGroup === 'تالف') {
      reqPerm = 'INVENTORY_DAMAGE';
      actionDesc = 'إثبات تالف';
    } else if (activeTabGroup === 'تسوية') {
      reqPerm = 'INVENTORY_ADJUST';
      actionDesc = 'تسوية كميات مخزنية';
    }

    if (!checkPermission(reqPerm, actionDesc)) return;

    isSavingRef.current = true;

    try {
      // Validate returnable quantities if linked to an original invoice
      if (selectedOriginalInvoiceId && currentOriginalInvoice && returnableQtyMap) {
        for (const item of invoiceItems) {
          const key = item.code || item.name;
          const maxAllowed = returnableQtyMap[key] ?? 0;
          if (item.quantity > maxAllowed) {
            alert(`خطأ: الكمية المرتجعة للصنف "${item.name}" (${item.quantity}) تتجاوز الكمية المتبقية القابلة للإرجاع (${maxAllowed}).`);
            isSavingRef.current = false;
            return;
          }
        }
      }

      // ========================================================
      // UNIVERSAL SERIAL / IMEI INTEGRITY & VALIDATION ENGINE
      // ========================================================
      for (const item of invoiceItems) {
        const dbItem = inventoryDb.find(
          i => (item.code && i.code === item.code) || i.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
        const isSerialTracked = item.trackingMode === 'serial' || dbItem?.trackingMode === 'serial' || (Boolean(dbItem?.serial && dbItem.serial.trim()) && dbItem?.trackingMode !== 'quantity');

        if (isSerialTracked && (!item.serialNumber || !item.serialNumber.trim())) {
          alert(
            `خطأ في مطابقة الأرقام التسلسلية:\nالصنف "${item.name}" يتبع نظام التتبع بالأرقام التسلسلية (Serial/IMEI).\nيرجى إدخال (${item.quantity}) رقم تسلسلي / IMEI للمتابعة وحفظ الفاتورة.`
          );
          isSavingRef.current = false;
          return;
        }

        if (item.serialNumber && item.serialNumber.trim()) {
          const serials = item.serialNumber
            .split(/[\n,;]+/)
            .map(s => s.trim())
            .filter(Boolean);

          if (serials.length > 0) {
            // 1. Quantity-to-Serial Count Constraint
            if (serials.length !== item.quantity) {
              alert(
                `خطأ في مطابقة الأرقام التسلسلية:\nالصنف "${item.name}" بالكمية (${item.quantity}) يتطلب تحديد (${item.quantity}) رقم تسلسلي / IMEI بالضبط.\nالمدخل حالياً: (${serials.length}) أرقام.`
              );
              isSavingRef.current = false;
              return;
            }

            // 2. Intra-Invoice Duplicate Protection
            const serialSet = new Set<string>();
            for (const s of serials) {
              const lower = s.toLowerCase();
              if (serialSet.has(lower)) {
                alert(`خطأ: الرقم التسلسلي / IMEI "${s}" مكرر داخل نفس الفاتورة.`);
                isSavingRef.current = false;
                return;
              }
              serialSet.add(lower);
            }

            // 3. Operation-Specific Serial Validations
            if (activeTabGroup === 'شراء') {
              // Purchase: Prevent registering duplicate active serials
              for (const s of serials) {
                const lower = s.toLowerCase();
                const isAlreadyInActiveDb = inventoryDb.some(
                  i =>
                    i.serial &&
                    i.serial.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower) &&
                    (i.stock ?? 0) > 0
                );
                if (isAlreadyInActiveDb) {
                  alert(
                    `خطأ: الرقم التسلسلي / IMEI "${s}" مسجل بالفعل وموجود بالمخزون النشط. يمنع تكرار تسجيل نفس السيريال النشط.`
                  );
                  isSavingRef.current = false;
                  return;
                }
              }
            } else if (activeTabGroup === 'بيع') {
              // Sale: Validate existence, product ownership, and availability
              for (const s of serials) {
                const lower = s.toLowerCase();
                // Existence check
                const inDb = inventoryDb.filter(
                  i => i.serial && i.serial.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
                );
                const inPurchases = completedInvoices
                  .filter(i => i.type === 'شراء')
                  .flatMap(i => i.items)
                  .filter(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower));

                const allMatches = [...inDb, ...inPurchases];
                if (allMatches.length === 0) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" غير مسجل في النظام ولا ينتمي لأي مخزون.`);
                  isSavingRef.current = false;
                  return;
                }

                // Product ownership check
                const belongsToProduct = allMatches.some(
                  m => (m.code && m.code === item.code) || m.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                if (!belongsToProduct) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" لا ينتمي للمنتج "${item.name}".`);
                  isSavingRef.current = false;
                  return;
                }

                // Sold status check (Sold vs Returned)
                const soldTimes = completedInvoices
                  .filter(i => i.type === 'بيع')
                  .flatMap(i => i.items)
                  .filter(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)).length;
                const returnedTimes = completedInvoices
                  .filter(i => i.type === 'مرتجع بيع')
                  .flatMap(i => i.items)
                  .filter(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)).length;

                const netSold = soldTimes - returnedTimes;
                const dbUnit = inventoryDb.find(
                  i => i.serial && i.serial.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
                );
                if (netSold > 0 || (dbUnit && (dbUnit.stock ?? 0) <= 0)) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" تم بيعه مسبقاً وغير متوفر حالياً للبيع.`);
                  isSavingRef.current = false;
                  return;
                }
              }
            } else if (activeTabGroup === 'مرتجع بيع') {
              // Sales Return: Validate original sale and prevent duplicate returns
              for (const s of serials) {
                const lower = s.toLowerCase();
                // If linked to an original invoice
                if (selectedOriginalInvoiceId && currentOriginalInvoice) {
                  const hasSerialInOrig = currentOriginalInvoice.items.some(
                    it =>
                      ((it.code && it.code === item.code) || it.name.trim().toLowerCase() === item.name.trim().toLowerCase()) &&
                      it.serialNumber &&
                      it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
                  );
                  if (!hasSerialInOrig) {
                    alert(
                      `خطأ: الرقم التسلسلي / IMEI "${s}" غير مسجل في الفاتورة الأصلية "${selectedOriginalInvoiceId}" للصنف "${item.name}".`
                    );
                    isSavingRef.current = false;
                    return;
                  }
                }

                // Check prior sale existence
                const soldOccurrences = completedInvoices
                  .filter(i => i.type === 'بيع')
                  .flatMap(i => i.items)
                  .filter(
                    it =>
                      ((it.code && it.code === item.code) || it.name.trim().toLowerCase() === item.name.trim().toLowerCase()) &&
                      it.serialNumber &&
                      it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
                  ).length;

                if (soldOccurrences === 0) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" لم يتم بيعه مسبقاً للصنف "${item.name}" ولا يمكن إرجاعه.`);
                  isSavingRef.current = false;
                  return;
                }

                // Check duplicate return
                const returnedOccurrences = completedInvoices
                  .filter(i => i.type === 'مرتجع بيع')
                  .flatMap(i => i.items)
                  .filter(
                    it =>
                      it.serialNumber &&
                      it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
                  ).length;

                if (returnedOccurrences >= soldOccurrences) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" تم إرجاعه بالكامل مسبقاً ولا يمكن إرجاعه مرة أخرى.`);
                  isSavingRef.current = false;
                  return;
                }
              }
            } else if (activeTabGroup === 'مرتجع شراء') {
              // Purchase Return: Validate purchase and availability in inventory
              for (const s of serials) {
                const lower = s.toLowerCase();
                const soldTimes = completedInvoices
                  .filter(i => i.type === 'بيع')
                  .flatMap(i => i.items)
                  .filter(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)).length;
                const returnedSaleTimes = completedInvoices
                  .filter(i => i.type === 'مرتجع بيع')
                  .flatMap(i => i.items)
                  .filter(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)).length;

                if (soldTimes > returnedSaleTimes) {
                  alert(`خطأ: الرقم التسلسلي / IMEI "${s}" تم بيعه لعميل ولا يمكن إرجاعه للمورد.`);
                  isSavingRef.current = false;
                  return;
                }
              }
            }
          }
        }
      }

      // Preserve historical purchase cost for serial items during sale
      const finalItems: InvoiceItem[] = invoiceItems.map(item => {
        if (activeTabGroup === 'بيع' && item.serialNumber && item.serialNumber.trim()) {
          const serials = item.serialNumber
            .split(/[\n,;]+/)
            .map(s => s.trim())
            .filter(Boolean);
          
          if (serials.length > 0) {
            let totalUnitCosts = 0;
            let costsFound = 0;
            for (const s of serials) {
              const lower = s.toLowerCase();
              const dbItem = inventoryDb.find(
                i => i.serial && i.serial.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower)
              );
              if (dbItem && dbItem.costPrice !== undefined) {
                totalUnitCosts += dbItem.costPrice;
                costsFound++;
                continue;
              }
              const purchaseUnit = completedInvoices
                .filter(inv => inv.type === 'شراء')
                .flatMap(inv => inv.items)
                .find(it => it.serialNumber && it.serialNumber.split(/[\n,;]+/).map(x => x.trim().toLowerCase()).includes(lower));
              if (purchaseUnit) {
                const histCost = purchaseUnit.costPrice !== undefined ? purchaseUnit.costPrice : purchaseUnit.price;
                totalUnitCosts += histCost;
                costsFound++;
              }
            }
            if (costsFound > 0) {
              return { ...item, costPrice: totalUnitCosts / costsFound };
            }
          }
        }
        return item;
      });

      const now = new Date();
      const currentInvoice: SavedInvoice = {
        id: 'INV-' + Math.floor(10000 + Math.random() * 90000),
        date: now.toLocaleDateString('ar-EG'),
        time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: activeTabGroup,
        customerName: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierName : (customerName || 'عميل نقدي'),
        customerPhone: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierPhone : customerPhone,
        supplierId: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? selectedSupplierId : undefined,
        supplierName: (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierName : undefined,
        items: [...finalItems],
        total: grandTotal,
        discount,
        tax,
        paid,
        remaining,
        branch: selectedBranch,
        drawer: selectedDrawer,
        status: remaining === 0 ? 'مدفوعة' : remaining === grandTotal ? 'مؤجلة' : 'جزئي',
        userId: currentUser?.id,
        createdByName: currentUser?.displayName || currentUser?.username,
        shiftId: activeShift ? activeShift.id : undefined,
        originalInvoiceId: selectedOriginalInvoiceId || undefined,
        originalInvoiceNumber: selectedOriginalInvoiceId || undefined,
        payments: currentPayments && currentPayments.length > 0 ? currentPayments : undefined
      };

      // Calculate stock movement & validate stock sufficiency
      const movementResult = processStockMovementForInvoice(currentInvoice, inventoryDb, stockMovements);
      if (!movementResult.success) {
        alert(movementResult.error);
        isSavingRef.current = false;
        return;
      }

      let updatedMovements = stockMovements;
      let updatedInventory = inventoryDb;

      if (!movementResult.alreadyProcessed && movementResult.newMovements.length > 0) {
        updatedMovements = [...movementResult.newMovements, ...stockMovements];
        updatedInventory = movementResult.updatedInventory;
      }

      let updatedCusts: Customer[] | undefined;
      let updatedSupps: Supplier[] | undefined;

      // Balance update logic on deferred or partial invoices
      if (remaining > 0) {
        if (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') {
          const matchingSupp = suppliersList.find(s => s.id === selectedSupplierId || s.name === supplierName);
          if (matchingSupp) {
            const delta = activeTabGroup === 'شراء' ? remaining : -remaining;
            updatedSupps = suppliersList.map(s => s.id === matchingSupp.id ? { ...s, balance: s.balance + delta } : s);
          }
        } else if (activeTabGroup === 'بيع' || activeTabGroup === 'مرتجع بيع') {
          const matchingCust = customersList.find(c => c.name === customerName || c.phone === customerPhone);
          if (matchingCust && matchingCust.id !== '1') {
            const delta = activeTabGroup === 'بيع' ? remaining : -remaining;
            updatedCusts = customersList.map(c => c.id === matchingCust.id ? { ...c, balance: c.balance + delta } : c);
          }
        }
      }

      const updatedCompleted = [currentInvoice, ...completedInvoices];

      // Atomic Transaction Across IndexedDB Object Stores
      await dbCompleteInvoiceTransaction({
        allCompletedInvoices: updatedCompleted,
        updatedInventory,
        allStockMovements: updatedMovements,
        updatedCustomers: updatedCusts,
        updatedSuppliers: updatedSupps
      });

      // Update React state after successful DB transaction
      setCompletedInvoices(updatedCompleted);
      setStockMovements(updatedMovements);
      setInventoryDb(updatedInventory);
      if (updatedCusts) setCustomersList(updatedCusts);
      if (updatedSupps) setSuppliersList(updatedSupps);

      // Remove this open invoice session from openInvoices upon successful save
      const remainingOpen = openInvoices.filter(s => s.id !== activeOpenInvoiceId);
      if (remainingOpen.length > 0) {
        const nextSession = remainingOpen[0];
        setOpenInvoices(remainingOpen);
        isSwitchingSessionRef.current = true;
        setActiveOpenInvoiceId(nextSession.id);
        setActiveTabGroup(nextSession.type);
        if (nextSession.type === 'شراء' || nextSession.type === 'مرتجع شراء') {
          setSupplierName(nextSession.supplierName || nextSession.customerName || 'مورد عام');
          setSupplierPhone(nextSession.supplierPhone || nextSession.customerPhone || '');
          setSelectedSupplierId(nextSession.supplierId || 'SUP-1');
        } else {
          setCustomerName(nextSession.customerName || 'عميل نقدي');
          setCustomerPhone(nextSession.customerPhone || '');
        }
        setSelectedPriceLevel(nextSession.selectedPriceLevel);
        setSelectedBranch(nextSession.selectedBranch);
        setSelectedDrawer(nextSession.selectedDrawer);
        setInvoiceItems([...nextSession.items]);
        setDiscount(nextSession.discount ?? 0);
        setTax(nextSession.tax ?? 0);
        setPaid(nextSession.paid ?? 0);
        setCurrentPayments(nextSession.payments ? [...nextSession.payments] : []);
        setTimeout(() => {
          isSwitchingSessionRef.current = false;
        }, 50);
      } else {
        const freshSession: OpenInvoiceSession = {
          id: 'OPEN-1',
          sessionName: 'عميل نقدي',
          type: 'بيع',
          customerName: 'عميل نقدي',
          customerPhone: '',
          selectedPriceLevel: 'سعر1',
          selectedBranch: 'عاصم فون - الفرع الرئيسي',
          selectedDrawer: 'الدرج الرئيسي',
          items: [],
          discount: 0,
          tax: 0,
          paid: 0,
          payments: []
        };
        setOpenInvoices([freshSession]);
        setActiveOpenInvoiceId(freshSession.id);
        setCurrentPayments([]);
        handleNewInvoice();
      }

      setLastSavedInvoice(currentInvoice);
      if (shouldPrint) {
        setLastPrintedInvoice(currentInvoice);
        setShowPrintModal(true);
      }
    } catch (err) {
      console.error('Failed to complete invoice transaction:', err);
      alert('حدث خطأ غير متوقع أثناء حفظ الفاتورة.');
    } finally {
      isSavingRef.current = false;
    }
  };

  // Navigation controls (◀ ▶) through completed invoices
  const handleNavigateInvoice = (direction: 'prev' | 'next') => {
    if (completedInvoices.length === 0) return;
    let newIndex = invoiceHistoryIndex;
    if (direction === 'prev') {
      newIndex = Math.min(completedInvoices.length - 1, invoiceHistoryIndex + 1);
    } else {
      newIndex = Math.max(-1, invoiceHistoryIndex - 1);
    }
    setInvoiceHistoryIndex(newIndex);

    if (newIndex >= 0 && newIndex < completedInvoices.length) {
      const inv = completedInvoices[newIndex];
      setInvoiceItems(inv.items);
      setCustomerName(inv.customerName);
      setCustomerPhone(inv.customerPhone);
      setDiscount(inv.discount);
      setTax(inv.tax);
      setPaid(inv.paid);
    } else if (newIndex === -1) {
      handleNewInvoice();
    }
  };

  // Toggle Full Screen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Handler: Save New Customer
  const handleSaveCustomer = () => {
    if (!checkPermission('CUSTOMER_EDIT', 'إضافة / تعديل بيانات عميل')) return;
    if (!newCustName.trim()) return;
    const custId = Date.now().toString();
    const suppId = newCustIsSupplier ? 'SUP-' + Math.floor(100 + Math.random() * 900).toString() : undefined;
    const newC: Customer = {
      id: custId,
      name: newCustName,
      phone: newCustPhone || '0000000000',
      balance: newCustBalance,
      notes: newCustNotes,
      isSupplier: Boolean(newCustIsSupplier),
      supplierId: suppId
    };
    const updatedCustomers = [...customersList, newC];
    setCustomersList(updatedCustomers);
    dbSaveCustomers(updatedCustomers);

    // If marked as dual supplier
    if (newCustIsSupplier && suppId) {
      const newS: Supplier = {
        id: suppId,
        name: newCustName,
        phone: newCustPhone || '0000000000',
        balance: 0,
        address: '',
        notes: `حساب مورد مرتبط بالعميل (${newCustName})`,
        isCustomer: true,
        customerId: custId
      };
      const updatedSuppliers = [...suppliersList, newS];
      setSuppliersList(updatedSuppliers);
      dbSaveSuppliers(updatedSuppliers);
    }

    setCustomerName(newCustName);
    setCustomerPhone(newCustPhone);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustBalance(0);
    setNewCustNotes('');
    setNewCustIsSupplier(false);
    setShowAddCustomerModal(false);
  };

  // Handler: Save / Edit Supplier
  const handleSaveSupplier = () => {
    if (!checkPermission('SUPPLIER_EDIT', 'إضافة / تعديل بيانات مورد')) return;
    if (!newSuppName.trim()) return;
    if (editingSupplier) {
      const updated = suppliersList.map(s => s.id === editingSupplier.id ? {
        ...s,
        name: newSuppName,
        phone: newSuppPhone || '0000000000',
        balance: newSuppBalance,
        address: newSuppAddress,
        notes: newSuppNotes,
        isCustomer: Boolean(newSuppIsCustomer || s.isCustomer)
      } : s);
      setSuppliersList(updated);
      dbSaveSuppliers(updated);
      if (selectedSupplierId === editingSupplier.id) {
        setSupplierName(newSuppName);
        setSupplierPhone(newSuppPhone);
      }
    } else {
      const suppId = 'SUP-' + Math.floor(100 + Math.random() * 900).toString();
      const custId = newSuppIsCustomer ? Date.now().toString() : undefined;
      const newS: Supplier = {
        id: suppId,
        name: newSuppName,
        phone: newSuppPhone || '0000000000',
        balance: newSuppBalance,
        address: newSuppAddress,
        notes: newSuppNotes,
        isCustomer: Boolean(newSuppIsCustomer),
        customerId: custId
      };
      const updated = [...suppliersList, newS];
      setSuppliersList(updated);
      dbSaveSuppliers(updated);

      // If marked as dual customer
      if (newSuppIsCustomer && custId) {
        const newC: Customer = {
          id: custId,
          name: newSuppName,
          phone: newSuppPhone || '0000000000',
          balance: 0,
          notes: `حساب عميل مرتبط بالمورد (${newSuppName})`,
          isSupplier: true,
          supplierId: suppId
        };
        const updatedCusts = [...customersList, newC];
        setCustomersList(updatedCusts);
        dbSaveCustomers(updatedCusts);
      }

      setSupplierName(newSuppName);
      setSupplierPhone(newSuppPhone);
      setSelectedSupplierId(newS.id);
    }
    setNewSuppName('');
    setNewSuppPhone('');
    setNewSuppBalance(0);
    setNewSuppAddress('');
    setNewSuppNotes('');
    setNewSuppIsCustomer(false);
    setEditingSupplier(null);
    setShowAddSupplierModal(false);
  };

  const handleDeleteSupplier = (id: string) => {
    if (!checkPermission('SUPPLIER_EDIT', 'حذف مورد')) return;
    if (!confirm('هل أنت تأكد من حذف هذا المورد؟')) return;
    const updated = suppliersList.filter(s => s.id !== id);
    setSuppliersList(updated);
    dbSaveSuppliers(updated);
  };

  // Handler: Save New Item to Database
  const handleSaveNewItem = () => {
    if (!checkPermission('PRODUCT_CREATE', 'إضافة صنف جديد للمخزون')) return;
    if (!newItemName.trim()) return;
    const code = newItemCode.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    const initialStock = newItemStock || 50;
    const itemObj = { code, name: newItemName, category: newItemCategory, price: newItemPrice, stock: initialStock };
    const updatedInventory = [...inventoryDb, itemObj];
    setInventoryDb(updatedInventory);
    dbSaveInventory(updatedInventory);

    // Also add to quick products
    const key = (quickProducts.length + 1).toString();
    const updatedQuick = [...quickProducts, { key, name: newItemName, category: newItemCategory, price: newItemPrice }];
    setQuickProducts(updatedQuick);
    dbSaveQuickProducts(updatedQuick);

    setNewItemCode('');
    setNewItemName('');
    setNewItemPrice(100);
    setNewItemStock(50);
    setShowAddItemModal(false);
  };

  // Handler: Save Cash Voucher
  const handleSaveVoucher = () => {
    const perm: Permission = voucherType === 'قبض' ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER';
    if (!checkPermission(perm, `إصدار سند ${voucherType}`)) return;
    if (!vchName.trim() || vchAmount <= 0) return;
    const newV: Voucher = {
      id: 'VCH-' + Math.floor(100 + Math.random() * 900),
      type: voucherType,
      date: new Date().toLocaleDateString('ar-EG'),
      name: vchName,
      amount: vchAmount,
      notes: vchNotes,
      drawer: selectedDrawer,
      partyType: vchPartyType,
      partyId: selectedVchPartyId,
      userId: currentUser?.id,
      createdByName: currentUser?.displayName || currentUser?.username,
      shiftId: activeShift ? activeShift.id : undefined
    };
    const updatedVouchers = [newV, ...vouchersList];
    setVouchersList(updatedVouchers);
    dbSaveVouchers(updatedVouchers);

    if (currentUser) {
      dbAddAuditLog({
        userId: currentUser.id,
        username: currentUser.username,
        action: voucherType === 'قبض' ? 'RECEIPT_VOUCHER_CREATE' : 'PAYMENT_VOUCHER_CREATE',
        details: `إصدار سند ${voucherType} بقيمة ${vchAmount} ج.م - الجهة: ${vchName}`
      }).then(() => dbGetAuditLogs().then(setAuditLogsList));
    }

    if (vchPartyType === 'supplier' && selectedVchPartyId) {
      const updatedSupps = suppliersList.map(s => {
        if (s.id === selectedVchPartyId) {
          const delta = voucherType === 'صرف' ? -vchAmount : vchAmount;
          return { ...s, balance: s.balance + delta };
        }
        return s;
      });
      setSuppliersList(updatedSupps);
      dbSaveSuppliers(updatedSupps);
    } else if (vchPartyType === 'customer' && selectedVchPartyId) {
      const updatedCusts = customersList.map(c => {
        if (c.id === selectedVchPartyId) {
          const delta = voucherType === 'قبض' ? -vchAmount : vchAmount;
          return { ...c, balance: c.balance + delta };
        }
        return c;
      });
      setCustomersList(updatedCusts);
      dbSaveCustomers(updatedCusts);
    }

    setVchName('');
    setVchAmount(0);
    setVchNotes('');
    setVchPartyType('general');
    setSelectedVchPartyId('');
    setShowVoucherModal(false);
  };

  // Backup & Restore handlers
  const handleExportBackup = async () => {
    if (!checkPermission('BACKUP', 'تصدير نسخة احتياطية للبيانات')) return;

    try {
      const [treasuries, banks, specialAccounts, cheques, financialTransfers] = await Promise.all([
        dbGetTreasuries(),
        dbGetBanks(),
        dbGetSpecialAccounts(),
        dbGetCheques(),
        dbGetFinancialTransfers()
      ]);

      const backupData = {
        inventoryDb,
        quickProducts,
        customersList,
        suppliers: suppliersList,
        suppliersList,
        vouchersList,
        completedInvoices,
        heldInvoices,
        stockMovements,
        settings: {
          selectedBranch,
          selectedDrawer,
          selectedPriceLevel,
          showQuickProducts
        },
        users: usersList,
        roles: rolesList,
        auditLogs: auditLogsList,
        cheques,
        treasuries,
        banks,
        specialAccounts,
        shifts: shiftsList,
        financialTransfers,
        branch: selectedBranch,
        drawer: selectedDrawer
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ProjectY_POS_Unified_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export unified backup:', err);
      alert('حدث خطأ أثناء تصدير النسخة الاحتياطية.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkPermission('RESTORE', 'استعادة نسخة احتياطية للبيانات')) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        await dbRestoreAll(parsed);
        const data = await loadAppData();
        if (data.inventoryDb) setInventoryDb(data.inventoryDb);
        if (data.quickProducts) setQuickProducts(data.quickProducts);
        if (data.customersList) setCustomersList(data.customersList);
        if (data.suppliersList) setSuppliersList(data.suppliersList);
        if (data.vouchersList) setVouchersList(data.vouchersList);
        if (data.completedInvoices) setCompletedInvoices(data.completedInvoices);
        if (data.heldInvoices) setHeldInvoices(data.heldInvoices);
        if (data.stockMovements) setStockMovements(data.stockMovements);
        if (data.shifts && data.shifts.length > 0) setShiftsList(data.shifts);
        if (data.users && data.users.length > 0) setUsersList(data.users);
        if (data.roles && data.roles.length > 0) setRolesList(data.roles);
        if (data.auditLogs) setAuditLogsList(data.auditLogs);
        if (data.settings?.selectedBranch) setSelectedBranch(data.settings.selectedBranch);
        if (data.settings?.selectedDrawer) setSelectedDrawer(data.settings.selectedDrawer);
        alert('تمت استعادة البيانات بنجاح في قاعدة البيانات المحلية!');
        setShowBackupModal(false);
      } catch (err) {
        console.error('Failed to restore backup:', err);
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
  };

  // Handler: Delete Completed Invoice
  const handleDeleteInvoice = (invoiceId: string) => {
    const inv = completedInvoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const reqPerm: Permission = (inv.type === 'شراء' || inv.type === 'مرتجع شراء') ? 'PURCHASE_DELETE' : 'SALE_DELETE';
    executeWithPermission(reqPerm, `حذف فاتورة رقم ${invoiceId}`, async () => {
      if (!window.confirm(`هل أنت متأكد من حذف الفاتورة رقم ${invoiceId}؟`)) return;

      const updated = completedInvoices.filter(i => i.id !== invoiceId);
      setCompletedInvoices(updated);
      await dbSaveCompletedInvoices(updated);

      await dbAddAuditLog({
        userId: currentUser?.id || 'system',
        username: currentUser?.username || 'admin',
        action: 'INVOICE_DELETE',
        details: `حذف الفاتورة رقم ${invoiceId} من النوع [${inv.type}] بقيمة ${inv.total}`
      });
      setAuditLogsList(await dbGetAuditLogs());
      alert('تم حذف الفاتورة بنجاح!');
    });
  };

  // Handler: Open Admin Settings with permission check
  const handleOpenAdminSettings = () => {
    executeWithPermission('SETTINGS', 'الوصول لإعدادات النظام ولوحة الإدارة', () => {
      setShowAdminSettingsModal(true);
    });
  };

  // Handler: Open Backup Modal with permission check
  const handleOpenBackupModal = () => {
    executeWithPermission('BACKUP', 'إدارة النسخ الاحتياطي واسترجاع البيانات', () => {
      setShowBackupModal(true);
    });
  };

  // Handler: Confirm Privileged Action Authorization
  const handleConfirmPrivilegedAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!privilegedAuthDialog) return;
    const { supervisorUserId, pin, requiredPermission, actionDescription, onAuthorized } = privilegedAuthDialog;

    if (!supervisorUserId) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'يرجى اختيار المشرف المصرح.' } : null);
      return;
    }
    if (!pin) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'يرجى إدخال الرقم السري للمشرف (PIN).' } : null);
      return;
    }

    const supervisor = usersList.find(u => u.id === supervisorUserId);
    if (!supervisor || !supervisor.active) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'المشرف غير موجود أو حسابه معطل.' } : null);
      return;
    }

    const supervisorRole = rolesList.find(r => r.id === supervisor.roleId);
    if (!supervisorRole || !supervisorRole.permissions.includes(requiredPermission)) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'المشرف المختار لا يملك هذه الصلاحية.' } : null);
      return;
    }

    const isPinValid = await verifyUserPin(supervisor, pin);
    if (!isPinValid) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'الرقم السري للمشرف غير صحيح.' } : null);
      await dbAddAuditLog({
        userId: currentUser?.id || 'system',
        username: currentUser?.username || 'unknown',
        action: 'FAILED_PRIVILEGED_AUTH',
        details: `محاولة تصريح فاشلة لعملية [${actionDescription}] باسم المشرف [${supervisor.displayName}]`
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }

    // Success: execute the action once and log
    setPrivilegedAuthDialog(null);

    await dbAddAuditLog({
      userId: supervisor.id,
      username: supervisor.username,
      action: 'PRIVILEGED_ACTION',
      details: `تم تصريح عملية [${actionDescription}] من المشرف [${supervisor.displayName}] للمستخدم [${currentUser?.displayName || 'كاشير'}]`
    });
    setAuditLogsList(await dbGetAuditLogs());

    // Execute callback
    onAuthorized();
  };

  // Handler: Login / Switch User Submit
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('يرجى إدخال اسم المستخدم والرقم السري (PIN).');
      return;
    }
    const foundUser = usersList.find(u => u.username.toLowerCase() === loginUsername.trim().toLowerCase());
    if (!foundUser) {
      setLoginError('اسم المستخدم غير موجود.');
      await dbAddAuditLog({
        userId: 'system',
        username: loginUsername.trim(),
        action: 'FAILED_LOGIN',
        details: `محاولة تسجيل دخول لاسم مستخدم غير موجود: ${loginUsername}`
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }
    if (!foundUser.active) {
      setLoginError('هذا الحساب معطل حالياً من قبل الإدارة.');
      await dbAddAuditLog({
        userId: foundUser.id,
        username: foundUser.username,
        action: 'FAILED_LOGIN',
        details: `محاولة تسجيل دخول لحساب معطل: ${foundUser.username}`
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }

    const isPinValid = await verifyUserPin(foundUser, loginPassword);
    if (!isPinValid) {
      setLoginError('الرقم السري (PIN) غير صحيح.');
      await dbAddAuditLog({
        userId: foundUser.id,
        username: foundUser.username,
        action: 'FAILED_LOGIN',
        details: `محاولة تسجيل دخول برقم سري غير صحيح للمستخدم: ${foundUser.displayName}`
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }

    setCurrentUser(foundUser);
    setShowLoginModal(false);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');

    await dbAddAuditLog({
      userId: foundUser.id,
      username: foundUser.username,
      action: 'LOGIN',
      details: `تسجيل دخول ناجح للمستخدم: ${foundUser.displayName} (${foundUser.roleId})`
    });
    setAuditLogsList(await dbGetAuditLogs());
  };

  // Handler: Privileged Action Authorization Dialog Submit
  const handlePrivilegedAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!privilegedAuthDialog) return;

    const supervisor = usersList.find(u => u.id === privilegedAuthDialog.supervisorUserId || u.username === privilegedAuthDialog.supervisorUserId);
    if (!supervisor || !supervisor.active) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'المشرف المختار غير متاح أو معطل.' } : null);
      return;
    }

    const supRole = rolesList.find(r => r.id === supervisor.roleId);
    if (!supRole || !supRole.permissions.includes(privilegedAuthDialog.requiredPermission)) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'المشرف المختار لا يملك هذه الصلاحية.' } : null);
      return;
    }

    const isPinValid = await verifyUserPin(supervisor, privilegedAuthDialog.pin);
    if (!isPinValid) {
      setPrivilegedAuthDialog(prev => prev ? { ...prev, error: 'الرقم السري للمشرف غير صحيح.' } : null);
      await dbAddAuditLog({
        userId: currentUser?.id || 'unknown',
        username: currentUser?.username || 'unknown',
        action: 'PRIVILEGED_ACTION_FAILED',
        details: `محاولة تفويض فاشلة برقم سري غير صحيح باسم المشرف: ${supervisor.displayName} للعملية: ${privilegedAuthDialog.actionDescription}`
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }

    // Success: log privileged authorization and execute action
    await dbAddAuditLog({
      userId: currentUser?.id || 'unknown',
      username: currentUser?.username || 'unknown',
      action: 'PRIVILEGED_ACTION_APPROVED',
      details: `تم تفويض العملية [${privilegedAuthDialog.actionDescription}] بنجاح بواسطة المشرف [${supervisor.displayName}]`
    });
    setAuditLogsList(await dbGetAuditLogs());

    const callback = privilegedAuthDialog.onAuthorized;
    setPrivilegedAuthDialog(null);
    if (callback) {
      callback();
    }
  };

  // Handler: Change Own PIN
  const handleChangeOwnPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setChangePinError('');
    if (!currentUser) return;

    if (!changePinCurrent || !changePinNew || !changePinConfirm) {
      setChangePinError('يرجى ملء جميع الحقول.');
      return;
    }

    if (changePinNew.length !== 4 || !/^\d{4}$/.test(changePinNew)) {
      setChangePinError('الرقم السري الجديد يجب أن يتكون من 4 أرقام بالضبط.');
      return;
    }

    if (changePinNew !== changePinConfirm) {
      setChangePinError('تأكيد الرقم السري غير متطابق.');
      return;
    }

    const isCurrentValid = await verifyUserPin(currentUser, changePinCurrent);
    if (!isCurrentValid) {
      setChangePinError('الرقم السري الحالي غير صحيح.');
      return;
    }

    const newHash = await hashPassword(changePinNew);
    const updatedUsers = usersList.map(u => u.id === currentUser.id ? {
      ...u,
      passwordHash: newHash,
      updatedAt: new Date().toISOString()
    } : u);

    setUsersList(updatedUsers);
    await dbSaveUsers(updatedUsers);
    setCurrentUser(prev => prev ? { ...prev, passwordHash: newHash } : null);

    await dbAddAuditLog({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'PIN_CHANGED',
      details: `قام المستخدم ${currentUser.displayName} بتغيير الرقم السري الخاص به بنجاح`
    });
    setAuditLogsList(await dbGetAuditLogs());

    setShowChangePinModal(false);
    setChangePinCurrent('');
    setChangePinNew('');
    setChangePinConfirm('');
    setChangePinError('');
    alert('تم تغيير الرقم السري الخاص بك بنجاح!');
  };

  // Handler: Admin Reset User PIN
  const handleAdminResetUserPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdminResetError('');
    if (!adminResetPinTarget) return;

    if (!adminResetNewPin || !adminResetConfirmPin) {
      setAdminResetError('يرجى إدخال الرقم السري وتأكيده.');
      return;
    }

    if (adminResetNewPin.length !== 4 || !/^\d{4}$/.test(adminResetNewPin)) {
      setAdminResetError('الرقم السري يجب أن يكون 4 أرقام بالضبط.');
      return;
    }

    if (adminResetNewPin !== adminResetConfirmPin) {
      setAdminResetError('تأكيد الرقم السري غير متطابق.');
      return;
    }

    const newHash = await hashPassword(adminResetNewPin);
    const updatedUsers = usersList.map(u => u.id === adminResetPinTarget.id ? {
      ...u,
      passwordHash: newHash,
      updatedAt: new Date().toISOString()
    } : u);

    setUsersList(updatedUsers);
    await dbSaveUsers(updatedUsers);

    await dbAddAuditLog({
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'admin',
      action: 'PIN_RESET',
      details: `إعادة تعيين الرقم السري للمستخدم [${adminResetPinTarget.displayName}] بواسطة مسؤول النظام`
    });
    setAuditLogsList(await dbGetAuditLogs());

    alert(`تم إعادة تعيين الرقم السري للمستخدم [${adminResetPinTarget.displayName}] بنجاح!`);
    setAdminResetPinTarget(null);
    setAdminResetNewPin('');
    setAdminResetConfirmPin('');
    setAdminResetError('');
  };

  // Handler: Toggle User Active / Disabled Status
  const handleToggleUserStatus = async (userToToggle: User) => {
    if (userToToggle.roleId === 'ADMIN' && userToToggle.username === 'admin') {
      alert('لا يمكن تعطيل الحساب الرئيسي لمسؤول النظام.');
      return;
    }
    const newActiveState = !userToToggle.active;
    const updatedUsers = usersList.map(u => u.id === userToToggle.id ? {
      ...u,
      active: newActiveState,
      updatedAt: new Date().toISOString()
    } : u);

    setUsersList(updatedUsers);
    await dbSaveUsers(updatedUsers);

    await dbAddAuditLog({
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'admin',
      action: newActiveState ? 'USER_ENABLED' : 'USER_DISABLED',
      details: `${newActiveState ? 'تفعيل' : 'تعطيل'} حساب المستخدم: ${userToToggle.displayName} (${userToToggle.username})`
    });
    setAuditLogsList(await dbGetAuditLogs());
  };

  // Handler: Admin Recovery Code Submit (نسيت الرقم السري)
  const handleAdminRecoverySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryError('');

    if (!recoveryCodeInput.trim() || !recoveryNewPin || !recoveryConfirmPin) {
      setRecoveryError('يرجى ملء جميع الحقول.');
      return;
    }

    const storedCode = await dbGetAdminRecoveryCode();
    if (recoveryCodeInput.trim().toUpperCase() !== storedCode.trim().toUpperCase()) {
      setRecoveryError('كود الاسترداد غير صحيح.');
      await dbAddAuditLog({
        userId: 'system',
        username: 'recovery_flow',
        action: 'FAILED_ADMIN_RECOVERY',
        details: 'محاولة استرداد فاشلة بكود استرداد غير صالح'
      });
      setAuditLogsList(await dbGetAuditLogs());
      return;
    }

    if (recoveryNewPin.length !== 4 || !/^\d{4}$/.test(recoveryNewPin)) {
      setRecoveryError('الرقم السري الجديد للمدير يجب أن يكون 4 أرقام.');
      return;
    }

    if (recoveryNewPin !== recoveryConfirmPin) {
      setRecoveryError('تأكيد الرقم السري غير متطابق.');
      return;
    }

    const adminUser = usersList.find(u => u.roleId === 'ADMIN') || usersList[0];
    if (!adminUser) {
      setRecoveryError('لم يتم العثور على حساب مسؤول النظام.');
      return;
    }

    const newHash = await hashPassword(recoveryNewPin);
    const updatedUsers = usersList.map(u => u.id === adminUser.id ? {
      ...u,
      passwordHash: newHash,
      active: true,
      updatedAt: new Date().toISOString()
    } : u);

    setUsersList(updatedUsers);
    await dbSaveUsers(updatedUsers);

    await dbAddAuditLog({
      userId: adminUser.id,
      username: adminUser.username,
      action: 'ADMIN_RECOVERY_PIN_RESET',
      details: 'تم استرداد حساب مسؤول النظام وإعادة تعيين الرقم السري بنجاح بواسطة كود الاسترداد'
    });
    setAuditLogsList(await dbGetAuditLogs());

    setShowAdminRecoveryModal(false);
    setRecoveryCodeInput('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setRecoveryError('');
    alert('تم إعادة تعيين الرقم السري لمسؤول النظام بنجاح! يمكنك الآن تسجيل الدخول بالرقم السري الجديد (4 أرقام).');
  };

  // Handler: Regenerate Admin Recovery Code
  const handleRegenerateRecoveryCode = async () => {
    const randomPart1 = Math.floor(1000 + Math.random() * 9000);
    const randomPart2 = Math.floor(1000 + Math.random() * 9000);
    const newCode = `RC-${randomPart1}-${randomPart2}`;
    setAdminRecoveryCode(newCode);
    await dbSaveAdminRecoveryCode(newCode);
    await dbAddAuditLog({
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'admin',
      action: 'RECOVERY_CODE_REGENERATED',
      details: 'تم توليد كود استرداد جديد لمسؤول النظام'
    });
    setAuditLogsList(await dbGetAuditLogs());
    alert(`تم توليد كود استرداد جديد بنجاح: ${newCode}\nاحتفظ بهذا الكود في مكان آمن لاستخدامه عند نسيان الرقم السري.`);
  };

  // Handler: Save User Form in Admin Modal
  const handleSaveUserForm = async () => {
    if (!checkPermission('USERS_MANAGE', 'إدارة المستخدمين والصلاحيات')) return;
    if (!userFormUsername.trim() || !userFormDisplayName.trim()) {
      alert('يرجى ملء اسم المستخدم والاسم المعروض.');
      return;
    }

    let updatedUsers = [...usersList];
    if (editingUser) {
      let newHash = editingUser.passwordHash;
      if (userFormPassword.trim()) {
        if (userFormPassword.trim().length !== 4 || !/^\d{4}$/.test(userFormPassword.trim())) {
          alert('الرقم السري (PIN) يجب أن يتكون من 4 أرقام بالضبط.');
          return;
        }
        newHash = await hashPassword(userFormPassword.trim());
      }
      updatedUsers = updatedUsers.map(u => u.id === editingUser.id ? {
        ...u,
        username: userFormUsername.trim(),
        displayName: userFormDisplayName.trim(),
        roleId: userFormRoleId,
        passwordHash: newHash,
        active: userFormActive,
        updatedAt: new Date().toISOString()
      } : u);
    } else {
      if (!userFormPassword.trim() || userFormPassword.trim().length !== 4 || !/^\d{4}$/.test(userFormPassword.trim())) {
        alert('يرجى إدخال الرقم السري (PIN) المكون من 4 أرقام للمستخدم الجديد.');
        return;
      }
      const existing = usersList.find(u => u.username.toLowerCase() === userFormUsername.trim().toLowerCase());
      if (existing) {
        alert('اسم المستخدم موجود بالفعل.');
        return;
      }
      const passHash = await hashPassword(userFormPassword.trim());
      const newUser: User = {
        id: 'usr-' + Date.now(),
        username: userFormUsername.trim(),
        displayName: userFormDisplayName.trim(),
        roleId: userFormRoleId,
        passwordHash: passHash,
        active: userFormActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedUsers.push(newUser);
    }

    setUsersList(updatedUsers);
    await dbSaveUsers(updatedUsers);
    setEditingUser(null);
    setUserFormUsername('');
    setUserFormDisplayName('');
    setUserFormPassword('');

    await dbAddAuditLog({
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'admin',
      action: editingUser ? 'USER_EDIT' : 'USER_CREATE',
      details: `${editingUser ? 'تعديل' : 'إنشاء'} حساب المستخدم ${userFormUsername}`
    });
    setAuditLogsList(await dbGetAuditLogs());
    alert('تم حفظ بيانات المستخدم بنجاح!');
  };

  // Handler: Save Role Permissions in Admin Modal
  const handleSaveRolePermissions = async () => {
    if (!checkPermission('USERS_MANAGE', 'تعديل صلاحيات الأدوار')) return;
    const currentRole = rolesList.find(r => r.id === editingRoleId);
    if (!currentRole) return;

    const updatedRoles = rolesList.map(r => r.id === editingRoleId ? {
      ...r,
      permissions: roleFormPermissions
    } : r);

    setRolesList(updatedRoles);
    await dbSaveRoles(updatedRoles);

    await dbAddAuditLog({
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'admin',
      action: 'ROLE_PERMISSIONS_UPDATE',
      details: `تعديل صلاحيات دور [${currentRole.name}]`
    });
    setAuditLogsList(await dbGetAuditLogs());
    alert(`تم حفظ صلاحيات الدور [${currentRole.name}] بنجاح!`);
  };

  // Menu Definition
  const menuItems: Record<string, { label: string; action: () => void; shortcut?: string }[]> = {
    'البرنامج': [
      { label: 'فاتورة جديدة', action: handleNewInvoice, shortcut: 'Ctrl+N' },
      { label: 'حفظ وطباعة الفاتورة', action: handleSaveAndPrint, shortcut: 'F12' },
      { label: 'تحديث البيانات وقواعد البيانات', action: () => alert('تم تحديث البيانات وقواعد السيرفر بنجاح!') },
    ],
    'لوحة التحكم': [
      { label: 'ملخص مبيعات اليوم والتقرير', action: () => setShowDailyReportModal(true) },
      { label: 'سجل الفواتير المكتملة', action: () => setShowDailyReportModal(true) },
      { label: 'حالة الخزنة والدرج الرئيسي', action: () => setShowDailyReportModal(true) },
    ],
    'السندات': [
      { label: 'إصدار سند قبض كاش', action: () => { setVoucherType('قبض'); setShowVoucherModal(true); } },
      { label: 'إصدار سند صرف كاش', action: () => { setVoucherType('صرف'); setShowVoucherModal(true); } },
      { label: 'سجل المصروفات التشغيلية', action: () => { setMainViewMode('balances'); setActiveAccountsSubTab('مصروفات'); } },
      { label: 'سجل الإيرادات التشغيلية', action: () => { setMainViewMode('balances'); setActiveAccountsSubTab('إيرادات'); } },
      { label: 'كشف حساب العملاء', action: () => setShowCustomerListModal(true) },
      { label: 'كشف حساب الموردين', action: () => setShowSupplierStatementModal(true) },
    ],
    'أدوات': [
      { label: 'البحث الذكي الشامل (Smart Search)', action: () => setShowUniversalSearchModal(true), shortcut: 'Ctrl+F' },
      { label: 'إضافة صنف جديد للمخزن', action: () => setShowAddItemModal(true) },
      { label: 'إضافة عميل جديد', action: () => setShowAddCustomerModal(true) },
      { label: 'إضافة مورد جديد', action: () => setShowAddSupplierModal(true) },
      { label: 'دليل العملاء', action: () => setShowCustomerListModal(true) },
      { label: 'دليل الموردين', action: () => setShowSupplierListModal(true) },
      { label: 'الآلة الحاسبة السريعة', action: () => setShowCalculatorModal(true) },
      { label: 'نسخة احتياطية للبيانات', action: () => setShowBackupModal(true) },
    ],
    'عمليات': [
      { label: 'إدارة وتقارير الورديات والشيفتات', action: () => setShowShiftModal(true), shortcut: 'F9' },
      { label: 'تغيير مستوى الأسعار الفعال', action: () => { const n = selectedPriceLevel === 'سعر1' ? 'سعر2' : 'سعر1'; setSelectedPriceLevel(n); dbSaveSetting('selectedPriceLevel', n); } },
      { label: 'جرد المخزون والمنتجات', action: () => setShowAddItemModal(true) },
      { label: 'إغلاق وردية الشيفت', action: () => setShowShiftModal(true) },
    ],
    'عرض': [
      { label: 'تبديل وضع ملء الشاشة', action: toggleFullScreen },
      { label: showQuickProducts ? 'إخفاء شريط المنتجات السريعة' : 'إظهار شريط المنتجات السريعة', action: () => { const n = !showQuickProducts; setShowQuickProducts(n); dbSaveSetting('showQuickProducts', n); } },
    ],
    'Admin': [
      { label: 'إعدادات الفرع واللوجو والطباعة', action: handleOpenAdminSettings },
      { label: 'إدارة الصلاحيات والمستخدمين', action: handleOpenAdminSettings },
      { label: 'النسخ الاحتياطي والاسترجاع', action: handleOpenBackupModal },
    ]
  };

  // Global Search Results across Products, Customers, Suppliers, and Invoices (Change 2)
  const globalSearchResults = useMemo(() => {
    const q = cashierGlobalSearch.trim().toLowerCase();
    if (!q) {
      return { products: [], customers: [], suppliers: [], invoices: [], total: 0 };
    }

    // 1. Search Products: Name, Code, Barcode, Serial / IMEI, Category
    const matchedProducts = inventoryDb.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const codeMatch = p.code.toLowerCase().includes(q);
      const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      const serialMatch = p.serial ? p.serial.toLowerCase().includes(q) : false;
      const catMatch = p.category.toLowerCase().includes(q);
      return nameMatch || codeMatch || barcodeMatch || serialMatch || catMatch;
    }).slice(0, 10);

    // 2. Search Customers: Name, Phone, ID
    const matchedCustomers = customersList.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch = c.phone ? c.phone.includes(q) : false;
      const idMatch = c.id.toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    }).slice(0, 8);

    // 3. Search Suppliers: Name, Phone, ID
    const matchedSuppliers = suppliersList.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const phoneMatch = s.phone ? s.phone.includes(q) : false;
      const idMatch = s.id.toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    }).slice(0, 8);

    // 4. Search Invoices: ID / Reference, Customer / Supplier, Phone, Date, Type
    const matchedInvoices = completedInvoices.filter(inv => {
      const idMatch = inv.id.toLowerCase().includes(q);
      const customerMatch = inv.customerName ? inv.customerName.toLowerCase().includes(q) : false;
      const supplierMatch = inv.supplierName ? inv.supplierName.toLowerCase().includes(q) : false;
      const phoneMatch = inv.customerPhone ? inv.customerPhone.includes(q) : false;
      const dateMatch = inv.date.includes(q);
      const typeMatch = inv.type.toLowerCase().includes(q);
      return idMatch || customerMatch || supplierMatch || phoneMatch || dateMatch || typeMatch;
    }).slice(0, 8);

    const total = matchedProducts.length + matchedCustomers.length + matchedSuppliers.length + matchedInvoices.length;

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      suppliers: matchedSuppliers,
      invoices: matchedInvoices,
      total
    };
  }, [cashierGlobalSearch, inventoryDb, customersList, suppliersList, completedInvoices]);

  // Visual tab color differentiation (Change 1) - Refined Light Blue + White POS System
  const getOperationTabClasses = (group: string, isActive: boolean) => {
    if (group === 'شراء') {
      return isActive
        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
        : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100';
    }
    if (group === 'مرتجع بيع' || group === 'مرتجع شراء') {
      return isActive
        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100';
    }
    if (group === 'تالف') {
      return isActive
        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
        : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100';
    }
    return isActive
      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
      : 'bg-white text-slate-800 hover:bg-blue-50 hover:text-blue-900 border-slate-300';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans select-none flex flex-col dir-rtl overflow-x-hidden" dir="rtl">
      
      {/* 1. TOP WINDOW TITLE BAR (Refined Professional Enterprise Deep Blue) */}
      <div className="h-7 bg-[#1e3a5f] border-b border-[#142842] px-2 flex items-center justify-between text-xs font-bold text-white select-none">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
            P
          </div>
          <span className="text-[12px] tracking-wide text-white">Project_y V:1870 - عمران</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-white">
          <span className="px-1.5 py-0.5 bg-[#2b4c73] border border-[#3b5e87] text-[10px] text-white">
            {selectedBranch}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={toggleFullScreen} title="تصغير" className="w-5 h-4 bg-[#2b4c73] border border-[#3b5e87] hover:bg-[#3b5e87] flex items-center justify-center text-white">_</button>
            <button onClick={toggleFullScreen} title="تكبير" className="w-5 h-4 bg-[#2b4c73] border border-[#3b5e87] hover:bg-[#3b5e87] flex items-center justify-center text-white">□</button>
            <button onClick={() => alert('إغلاق التطبيق')} title="إغلاق" className="w-5 h-4 bg-rose-600 border border-rose-700 hover:bg-rose-700 flex items-center justify-center text-white font-bold">×</button>
          </div>
        </div>
      </div>

      {/* 2. TOP MENUBAR (Clean White Surface with Professional Blue Active States) */}
      <div className="bg-white border-b border-slate-200 px-2 py-0.5 flex items-center justify-between text-xs text-slate-800 relative z-40 select-none" ref={menuRef}>
        <div className="flex items-center gap-1">
          {['البرنامج', 'لوحة التحكم', 'السندات', 'عمليات', 'أدوات', 'عرض'].map((m) => (
            <div key={m} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === m ? null : m);
                }}
                className={`px-2 py-0.5 font-bold transition-colors text-[11px] ${
                  activeMenu === m ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-900'
                }`}
              >
                {m}
              </button>

              {/* Dropdown Menu Popup */}
              {activeMenu === m && (
                <div className="absolute top-full right-0 mt-0.5 w-56 bg-white border border-slate-200 rounded-none z-50 text-xs py-1 text-right divide-y divide-slate-100 shadow-lg dir-rtl">
                  {menuItems[m]?.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        item.action();
                      }}
                      className="w-full px-3 py-1.5 hover:bg-blue-50 hover:text-blue-900 text-slate-800 flex items-center justify-between text-right font-medium"
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] font-mono opacity-60 mr-2 text-slate-500">{item.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Admin Menu Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'Admin' ? null : 'Admin');
              }}
              className={`px-2 py-0.5 font-bold transition-colors text-[11px] ${
                activeMenu === 'Admin' ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-900'
              }`}
            >
              Admin
            </button>

            {activeMenu === 'Admin' && (
              <div className="absolute top-full right-0 mt-0.5 w-56 bg-white border border-slate-200 rounded-none z-50 text-xs py-1 text-right divide-y divide-slate-100 shadow-lg dir-rtl">
                {menuItems['Admin']?.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      item.action();
                    }}
                    className="w-full px-3 py-1.5 hover:bg-blue-50 hover:text-blue-900 text-slate-800 flex items-center justify-between text-right font-medium"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] font-mono opacity-60 mr-2 text-slate-500">{item.shortcut}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CODE Search Bar, Shift Status, Global Edit Lock & Logged-in User Badge */}
        <div className="flex items-center gap-2">
          {/* Global Edit Lock Control */}
          <button
            onClick={() => setIsEditLocked(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 border text-[11px] font-bold cursor-pointer transition-colors select-none ${
              isEditLocked
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
            title={isEditLocked ? 'التعديل مقفل — انقر للسماح بالتعديل' : 'التعديل مفتوح — انقر لقفل التعديل'}
          >
            {isEditLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>🔒 التعديل مقفل</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>🔓 التعديل مفتوح</span>
              </>
            )}
          </button>

          {/* Shift Status Button */}
          <button
            onClick={() => setShowShiftModal(true)}
            className={`flex items-center gap-1 px-2 py-0.5 border text-[11px] font-bold cursor-pointer transition-colors ${
              activeShift
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
            }`}
            title="إدارة وتقارير الورديات والشيفتات (F9)"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeShift ? `وردية: ${activeShift.id}` : 'فتح وردية (F9)'}</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-slate-800 text-[11px] font-bold cursor-pointer transition-colors"
                title="انقر لتبديل المستخدم"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentUser.displayName}</span>
                <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded-none font-normal">
                  {rolesList.find(r => r.id === currentUser.roleId)?.name || currentUser.roleId}
                </span>
              </button>
              <button
                onClick={() => {
                  setChangePinCurrent('');
                  setChangePinNew('');
                  setChangePinConfirm('');
                  setChangePinError('');
                  setShowChangePinModal(true);
                }}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                title="تغيير الرقم السري الخاص بي (PIN)"
              >
                <Key className="w-3 h-3 text-slate-600" />
                <span className="hidden sm:inline">PIN</span>
              </button>
            </div>
          )}

          {/* Universal Smart Search Button */}
          <button
            onClick={() => setShowUniversalSearchModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-blue-900 text-[11px] font-bold cursor-pointer transition-colors"
            title="البحث الذكي الشامل (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>بحث شامل (Ctrl+F)</span>
          </button>

          <div className="flex items-center gap-1">
            <span className="font-mono font-bold text-slate-700 text-[11px]">CODE:</span>
            <input
              type="text"
              placeholder="بحث بالكود..."
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCodeSearch();
              }}
              className="w-28 px-1 py-0.5 bg-white border border-slate-300 text-[11px] focus:outline-none focus:border-blue-500 font-mono text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* 3. MAIN TAB BAR (Refined Connected Bar in Clean Light Blue Structure) */}
      <div className="bg-[#e2edf6] p-1 border-b border-[#cbd5e1] flex flex-col gap-1 select-none">
        {/* Layer 1: Top Main Views (5 Equal Tabs) */}
        <div className="grid grid-cols-5 gap-[5px] w-full">
          {[
            { id: 'pos', label: 'فواتير' },
            { id: 'balances', label: 'حسابات' },
            { id: 'stores', label: 'مخازن' },
            { id: 'reports', label: 'تقارير' },
            { id: 'invoices', label: 'أرشيف' },
          ].map((tab) => {
            const isActive = mainViewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainViewMode(tab.id as any)}
                className={`h-[22px] flex items-center justify-center text-center font-bold text-xs border rounded-none transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-800 hover:bg-blue-50 hover:text-blue-900 border-[#cbd5e1]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Layer 2: Sub-tabs */}
        {mainViewMode === 'balances' && (
          <div className="grid grid-cols-10 gap-[5px] w-full">
            {(['عملاء', 'موردين', 'موظفين', 'خزن', 'بنوك', 'خاص مدين', 'خاص دائن', 'شيكات', 'مصروفات', 'إيرادات'] as const).map((tab) => {
              const isActive = activeAccountsSubTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveAccountsSubTab(tab);
                  }}
                  className={`h-[22px] flex items-center justify-center text-center font-bold text-[10px] md:text-[11px] border rounded-none transition-colors truncate px-0.5 ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-800 hover:bg-blue-50 hover:text-blue-900 border-[#cbd5e1]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        )}

        {mainViewMode === 'pos' && (
          <div className="flex flex-col gap-1 w-full">
            {/* 1. TRANSACTION BAR (بيع | شراء | مرتجع بيع | مرتجع شراء | تالف | نقل | تسوية) */}
            <div className="grid grid-cols-7 gap-[5px] w-full">
              {[
                'بيع',
                'شراء',
                'مرتجع بيع',
                'مرتجع شراء',
                'تالف',
                'نقل',
                'تسوية',
              ].map((group) => {
                const isActive = activeTabGroup === group;
                return (
                  <button
                    key={group}
                    onClick={() => {
                      setActiveTabGroup(group as any);
                    }}
                    className={`h-[22px] flex items-center justify-center text-center font-bold text-[11px] rounded-none transition-colors border ${getOperationTabClasses(group, isActive)}`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>

            {/* 2. ONE GLOBAL SEARCH BAR (Change 2) */}
            <div className="bg-[#f0f7fc] border border-[#bae6fd] px-2 py-1 relative select-none" ref={globalSearchRef}>
              <div className="relative flex items-center w-full">
                <div className="absolute right-2.5 text-blue-600 flex items-center pointer-events-none">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="البحث الشامل في النظام: اسم صنف، كود، باركود، سيريال/IMEI، عميل، هاتف، مورد، رقم فاتورة..."
                  value={cashierGlobalSearch}
                  onChange={(e) => {
                    setCashierGlobalSearch(e.target.value);
                    setIsGlobalSearchOpen(true);
                  }}
                  onFocus={() => {
                    if (cashierGlobalSearch.trim()) {
                      setIsGlobalSearchOpen(true);
                    }
                  }}
                  className="w-full pr-8 pl-8 py-1 bg-white border border-[#93c5fd] text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-none shadow-2xs placeholder:text-slate-400"
                />
                {cashierGlobalSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCashierGlobalSearch('');
                      setIsGlobalSearchOpen(false);
                    }}
                    className="absolute left-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    title="مسح البحث"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Categorized Dropdown Overlay */}
              {isGlobalSearchOpen && cashierGlobalSearch.trim().length > 0 && (
                <div className="absolute top-full right-2 left-2 mt-0.5 bg-white border border-[#93c5fd] shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs dir-rtl text-right">
                  {globalSearchResults.total === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      لا توجد نتائج مطابقة لبحثك في المنتجات أو العملاء أو الموردين أو الفواتير
                    </div>
                  ) : (
                    <>
                      {/* Customers Section */}
                      {globalSearchResults.customers.length > 0 && (
                        <div className="p-1.5">
                          <div className="text-[10px] font-bold text-blue-900 px-1 py-0.5 bg-[#f0f7fc] border-b border-[#bae6fd] flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 text-blue-600" />
                            <span>العملاء ({globalSearchResults.customers.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {globalSearchResults.customers.map(c => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setCustomerName(c.name);
                                  setCustomerPhone(c.phone || '');
                                  setCustomerTypingValue(null);
                                  setCashierGlobalSearch('');
                                  setIsGlobalSearchOpen(false);
                                }}
                                className="px-2 py-1 hover:bg-[#dceef2] cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-[#222222]">{c.name}</span>
                                  {c.phone && c.phone !== '0000000000' && (
                                    <span className="mr-2 text-[10px] text-gray-500 font-mono">({c.phone})</span>
                                  )}
                                </div>
                                {c.balance !== 0 && (
                                  <span className={`text-[10px] font-bold font-mono px-1 py-0.2 border ${
                                    c.balance > 0 ? 'text-[#b85c5c] bg-[#fff2f0] border-[#b85c5c]' : 'text-[#4f9d69] bg-[#e8f5e9] border-[#4f9d69]'
                                  }`}>
                                    {c.balance > 0 ? `مدين: ${c.balance}` : `دائن: ${Math.abs(c.balance)}`}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Products Section */}
                      {globalSearchResults.products.length > 0 && (
                        <div className="p-1.5">
                          <div className="text-[10px] font-bold text-blue-900 px-1 py-0.5 bg-[#f0f7fc] border-b border-[#bae6fd] flex items-center gap-1 mb-1">
                            <Package className="w-3 h-3 text-blue-600" />
                            <span>المخزون والأصناف ({globalSearchResults.products.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {globalSearchResults.products.map(p => (
                              <div
                                key={p.code || p.name}
                                onClick={() => {
                                  const adjustedPrice = p.price * priceMultipliers[selectedPriceLevel];
                                  addOrUpdateItem(p.name, p.category, adjustedPrice, p.code, p.serial);
                                  setCashierGlobalSearch('');
                                  setIsGlobalSearchOpen(false);
                                }}
                                className="px-2 py-1 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  <span className="mr-2 text-[10px] text-slate-500 font-mono">[{p.code}]</span>
                                  {p.serial && <span className="mr-1 text-[10px] text-amber-700 font-mono">(S: {p.serial})</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-600 font-mono">متاح: {p.quantity} {p.unit}</span>
                                  <span className="font-bold font-mono text-emerald-600">{p.price} ج.م</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suppliers Section */}
                      {globalSearchResults.suppliers.length > 0 && (
                        <div className="p-1.5">
                          <div className="text-[10px] font-bold text-blue-900 px-1 py-0.5 bg-[#f0f7fc] border-b border-[#bae6fd] flex items-center gap-1 mb-1">
                            <Building2 className="w-3 h-3 text-blue-600" />
                            <span>الموردين ({globalSearchResults.suppliers.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {globalSearchResults.suppliers.map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setSupplierName(s.name);
                                  setSupplierPhone(s.phone || '');
                                  setSelectedSupplierId(s.id);
                                  setCashierGlobalSearch('');
                                  setIsGlobalSearchOpen(false);
                                }}
                                className="px-2 py-1 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">{s.name}</span>
                                  {s.phone && s.phone !== '0000000000' && (
                                    <span className="mr-2 text-[10px] text-slate-500 font-mono">({s.phone})</span>
                                  )}
                                </div>
                                {s.balance !== 0 && (
                                  <span className={`text-[10px] font-bold font-mono px-1 py-0.2 border ${
                                    s.balance > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  }`}>
                                    رصيد: {s.balance} ج.م
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invoices Section */}
                      {globalSearchResults.invoices.length > 0 && (
                        <div className="p-1.5">
                          <div className="text-[10px] font-bold text-blue-900 px-1 py-0.5 bg-[#f0f7fc] border-b border-[#bae6fd] flex items-center gap-1 mb-1">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>الفواتير والمستندات ({globalSearchResults.invoices.length})</span>
                          </div>
                          <div className="space-y-0.5">
                            {globalSearchResults.invoices.map(inv => (
                              <div
                                key={inv.id}
                                onClick={() => {
                                  setActiveSavedInvoiceView(inv);
                                  setCashierGlobalSearch('');
                                  setIsGlobalSearchOpen(false);
                                }}
                                className="px-2 py-1 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-bold font-mono text-slate-800">#{inv.id}</span>
                                  <span className="mr-2 px-1 py-0.2 bg-blue-50 text-blue-900 text-[10px] font-semibold border border-blue-100">{inv.type}</span>
                                  <span className="mr-2 text-slate-600">{inv.customerName || inv.supplierName || 'نقدي'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">{inv.date}</span>
                                  <span className="font-bold font-mono text-slate-800">{inv.total.toFixed(2)} ج.م</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 3. Customer Information (Change 3 - Merged Customer Name + Phone) */}
            <div className="bg-white border border-slate-200 p-1.5 flex items-center justify-between gap-1.5 flex-wrap text-xs">
              {(activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingSupplier(null);
                      setNewSuppName('');
                      setNewSuppPhone('');
                      setNewSuppBalance(0);
                      setNewSuppAddress('');
                      setNewSuppNotes('');
                      setShowAddSupplierModal(true);
                    }}
                    title="إضافة مورد جديد"
                    className="w-6 h-6 bg-[#f0f7fc] border border-slate-300 text-blue-900 font-bold flex items-center justify-center hover:bg-blue-50"
                  >
                    +
                  </button>
                  <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-28 px-2 py-0.5 bg-white border border-slate-300 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-900"
                  />
                  <span className="font-bold text-slate-800 text-xs">اسم المورد:</span>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-36 px-2 py-0.5 bg-white border border-slate-300 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-bold"
                  />
                  <button
                    onClick={() => setShowSupplierListModal(true)}
                    className="px-2 py-0.5 bg-[#f0f7fc] border border-slate-300 hover:bg-blue-50 font-bold text-blue-900 text-xs"
                    title="فتح دليل الموردين"
                  >
                    مورد
                  </button>
                  <button
                    onClick={() => setShowCustomerListModal(true)}
                    className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 hover:bg-slate-100 font-bold text-slate-600 text-xs"
                    title="البحث في دليل العملاء والموردين الشامل"
                  >
                    دليل شامل
                  </button>
                  {(() => {
                    const isDual = activeSupplierRecord?.isCustomer || customersList.some(c => (c.supplierId && c.supplierId === activeSupplierRecord?.id) || c.name === supplierName || (supplierPhone && supplierPhone !== '0000000000' && c.phone === supplierPhone));
                    if (!isDual) return null;
                    return (
                      <span className="px-1.5 py-0.5 bg-[#243746] text-white font-bold text-[10px] border border-[#1b2b37] whitespace-nowrap" title="هذا المورد مسجل أيضاً كعميل في النظام">
                        عميل ومورد
                      </span>
                    );
                  })()}
                  {activeSupplierRecord && (
                    <span className={`px-1.5 py-0.5 font-mono font-bold text-[10px] border whitespace-nowrap ${
                      activeSupplierRecord.balance > 0 ? 'bg-[#fff2f0] text-[#b85c5c] border-[#b85c5c]' : 'bg-[#e8f5e9] text-[#4f9d69] border-[#4f9d69]'
                    }`}>
                      رصيد: {activeSupplierRecord.balance} ج.م
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* Combined Customer Name + Phone Field (Change 3) */}
                  <span className="font-bold text-slate-800 text-xs whitespace-nowrap">العميل:</span>
                  <div className="relative flex items-stretch bg-white border border-slate-300 shadow-xs divide-x divide-x-reverse divide-slate-200" ref={customerDropdownRef}>
                    <input
                      type="text"
                      placeholder="العميل: اسم أو هاتف"
                      value={
                        customerTypingValue !== null
                          ? customerTypingValue
                          : (!customerName || customerName === 'عميل نقدي'
                              ? (customerPhone && customerPhone !== '0000000000' ? `عميل نقدي - ${customerPhone}` : 'عميل نقدي')
                              : (customerPhone && customerPhone !== '0000000000' ? `${customerName} - ${customerPhone}` : customerName))
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerTypingValue(val);
                        setIsCustomerDropdownOpen(true);

                        if (val.includes(' - ')) {
                          const parts = val.split(' - ');
                          setCustomerName(parts[0].trim() || 'عميل نقدي');
                          setCustomerPhone(parts.slice(1).join(' - ').trim());
                        } else if (/^[0-9+ ]{4,}$/.test(val.trim())) {
                          const matched = customersList.find(c => c.phone && c.phone.includes(val.trim()));
                          if (matched) {
                            setCustomerName(matched.name);
                            setCustomerPhone(matched.phone || '');
                          } else {
                            setCustomerPhone(val.trim());
                            if (!customerName || customerName === 'عميل نقدي') setCustomerName('عميل نقدي');
                          }
                        } else {
                          const matched = customersList.find(c => c.name.trim().toLowerCase() === val.trim().toLowerCase());
                          if (matched) {
                            setCustomerName(matched.name);
                            setCustomerPhone(matched.phone || '');
                          } else {
                            setCustomerName(val.trim() || 'عميل نقدي');
                          }
                        }
                      }}
                      onFocus={(e) => {
                        if (!customerName || customerName.includes('عميل')) {
                          setCustomerTypingValue('');
                        } else {
                          setCustomerTypingValue(
                            customerPhone && customerPhone !== '0000000000'
                              ? `${customerName} - ${customerPhone}`
                              : customerName
                          );
                          e.target.select();
                        }
                        setIsCustomerDropdownOpen(true);
                      }}
                      onMouseUp={(e) => {
                        if (!customerName || customerName.includes('عميل')) {
                          if (customerTypingValue === null) {
                            setCustomerTypingValue('');
                          }
                        }
                      }}
                      onClick={(e) => {
                        if (customerTypingValue === null && customerName && !customerName.includes('عميل')) {
                          e.currentTarget.select();
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setCustomerTypingValue(null);
                          if (!customerName.trim()) {
                            setCustomerName('عميل نقدي');
                            setCustomerPhone('');
                          }
                        }, 200);
                      }}
                      className="w-56 sm:w-64 px-2 py-0.5 text-xs text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
                      title="العميل: يمكنك البحث بالاسم أو برقم الهاتف مباشرة (مثال: محمد أحمد - 01012345678)"
                    />

                    {/* Visible Dropdown Arrow to show registered customers */}
                    <button
                      type="button"
                      onClick={() => setIsCustomerDropdownOpen(prev => !prev)}
                      className="px-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center h-full cursor-pointer"
                      title="عرض قائمة العملاء المسجلين"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Add Customer Button */}
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      title="إضافة عميل جديد"
                      className="w-6 bg-[#f0f7fc] hover:bg-blue-50 text-blue-900 font-bold flex items-center justify-center text-xs transition-colors"
                    >
                      +
                    </button>

                    {/* Dropdown Menu of registered customers */}
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full right-0 mt-0.5 w-72 max-h-56 overflow-y-auto bg-white border border-slate-300 shadow-lg z-50 text-xs dir-rtl text-right divide-y divide-slate-100">
                        {(() => {
                          const searchQ = (customerTypingValue !== null ? customerTypingValue : customerName).trim().toLowerCase();
                          const filtered = (searchQ && searchQ !== 'عميل نقدي')
                            ? customersList.filter(c =>
                                c.name.toLowerCase().includes(searchQ) ||
                                (c.phone && c.phone.includes(searchQ))
                              )
                            : customersList;

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2 text-center text-slate-400">
                                لا يوجد عملاء مطابقين للبحث
                              </div>
                            );
                          }

                          return filtered.map(c => (
                            <div
                              key={c.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCustomerName(c.name);
                                setCustomerPhone(c.phone || '');
                                setCustomerTypingValue(null);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div>
                                <span className="font-bold text-slate-800 block">{c.name}</span>
                                {c.phone && c.phone !== '0000000000' && (
                                  <span className="text-[10px] text-slate-500 font-mono block">{c.phone}</span>
                                )}
                              </div>
                              {c.balance !== 0 && (
                                <span className={`text-[10px] font-bold font-mono px-1 py-0.2 border ${
                                  c.balance > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                }`}>
                                  {c.balance > 0 ? `مدين: ${c.balance}` : `دائن: ${Math.abs(c.balance)}`}
                                </span>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowCustomerListModal(true)}
                    className="px-2 py-0.5 bg-[#f0f7fc] border border-slate-300 hover:bg-blue-50 font-bold text-blue-900 text-xs"
                    title="فتح دليل العملاء والحسابات"
                  >
                    عميل
                  </button>
                  <button
                    onClick={() => setShowSupplierListModal(true)}
                    className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 hover:bg-slate-100 font-bold text-slate-600 text-xs"
                    title="البحث في دليل الموردين"
                  >
                    مورد
                  </button>
                  {(() => {
                    const isDual = activeCustomerRecord?.isSupplier || suppliersList.some(s => (s.customerId && s.customerId === activeCustomerRecord?.id) || s.name === customerName || (customerPhone && customerPhone !== '0000000000' && s.phone === customerPhone));
                    if (!isDual) return null;
                    return (
                      <span className="px-1.5 py-0.5 bg-[#243746] text-white font-bold text-[10px] border border-[#1b2b37] whitespace-nowrap" title="هذا العميل مسجل أيضاً كمورد في النظام">
                        عميل ومورد
                      </span>
                    );
                  })()}

                  {/* Customer Intelligence Indicators */}
                  {activeCustomerRecord && (
                    <>
                      {activeCustomerRecord.balance > 0 ? (
                        <span
                          className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-300 whitespace-nowrap animate-pulse"
                          title="تنبيه: مديونية سابقة مستحقة على العميل"
                        >
                          ⚠️ مديونية: {activeCustomerRecord.balance} ج.م
                        </span>
                      ) : activeCustomerRecord.balance < 0 ? (
                        <span
                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-300 whitespace-nowrap"
                          title="رصيد دائن لصالح العميل"
                        >
                          ✓ رصيد: {Math.abs(activeCustomerRecord.balance)} ج.م
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 font-bold text-[10px] border border-slate-200 whitespace-nowrap">
                          الرصيد: 0
                        </span>
                      )}

                      {activeCustomerIntelligence && activeCustomerIntelligence.invoiceCount > 0 && (
                        <span
                          className="px-1.5 py-0.5 bg-[#1e3a5f] text-white font-bold text-[10px] border border-[#142842] whitespace-nowrap hidden sm:inline-block cursor-help"
                          title={`إجمالي المشتريات: ${activeCustomerIntelligence.totalPurchases} ج.م | آخر فاتورة: ${activeCustomerIntelligence.lastInvoiceDate || 'سابقاً'}`}
                        >
                          🛒 {activeCustomerIntelligence.invoiceCount} فواتير
                        </span>
                      )}

                      {/* Quick Add Favorite Items */}
                      {activeCustomerIntelligence && activeCustomerIntelligence.favoriteItems.length > 0 && (
                        <div className="hidden lg:flex items-center gap-1 mr-1 border-r border-slate-300 pr-1.5">
                          <span className="text-[10px] font-bold text-slate-600">المفضلة:</span>
                          {activeCustomerIntelligence.favoriteItems.map(fav => (
                            <button
                              key={fav.code}
                              type="button"
                              onClick={() => {
                                addOrUpdateItem(fav.name, fav.category, fav.price, fav.code);
                              }}
                              title={`إضافة ${fav.name} (${fav.price} ج.م)`}
                              className="px-1.5 py-0.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[10px] font-bold border border-slate-300 transition-colors truncate max-w-[90px]"
                            >
                              + {fav.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Original Invoice Selector for Returns */}
              {(activeTabGroup === 'مرتجع بيع' || activeTabGroup === 'مرتجع شراء') && (
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 border border-amber-300">
                  <span className="font-bold text-amber-900 text-xs">الفاتورة الأصلية:</span>
                  <select
                    value={selectedOriginalInvoiceId}
                    onChange={(e) => {
                      const invId = e.target.value;
                      setSelectedOriginalInvoiceId(invId);
                      if (invId) {
                        const orig = completedInvoices.find(inv => inv.id === invId);
                        if (orig) {
                          if (orig.customerName) setCustomerName(orig.customerName);
                          if (orig.customerPhone) setCustomerPhone(orig.customerPhone);
                          if (orig.supplierName) setSupplierName(orig.supplierName);
                          if (orig.supplierPhone) setSupplierPhone(orig.supplierPhone);
                          if (orig.supplierId) setSelectedSupplierId(orig.supplierId);
                          if (orig.branch) setSelectedBranch(orig.branch);

                          const prevReturns = completedInvoices.filter(
                            inv => inv.originalInvoiceId === orig.id &&
                                   ((orig.type === 'بيع' && inv.type === 'مرتجع بيع') ||
                                    (orig.type === 'شراء' && inv.type === 'مرتجع شراء'))
                          );
                          const returnedMap: Record<string, number> = {};
                          for (const retInv of prevReturns) {
                            for (const it of retInv.items) {
                              const k = it.code || it.name;
                              returnedMap[k] = (returnedMap[k] || 0) + it.quantity;
                            }
                          }

                          const prefilledItems: InvoiceItem[] = orig.items
                            .map(it => {
                              const k = it.code || it.name;
                              const alreadyReturned = returnedMap[k] || 0;
                              const returnable = Math.max(0, it.quantity - alreadyReturned);
                              return {
                                ...it,
                                id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                                quantity: returnable,
                                total: returnable * it.price
                              };
                            })
                            .filter(it => it.quantity > 0);

                          setInvoiceItems(prefilledItems);
                        }
                      } else {
                        setInvoiceItems([]);
                      }
                    }}
                    className="px-1.5 py-0.5 bg-white border border-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500 max-w-[200px] text-slate-800"
                  >
                    <option value="">-- اختياري: اختر الفاتورة الأصلية --</option>
                    {eligibleOriginalInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.id} - {inv.customerName || inv.supplierName || 'نقدي'} ({inv.total.toFixed(0)} ج.م) - {inv.date}
                      </option>
                    ))}
                  </select>
                  {selectedOriginalInvoiceId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOriginalInvoiceId('');
                        setInvoiceItems([]);
                      }}
                      title="إلغاء الربط بالفاتورة الأصلية"
                      className="px-1.5 py-0.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs border border-rose-300 font-bold transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* 4. فاتورة جديدة + EXISTING PRICE OPTIONS */}
            <div className="bg-[#f8fafc] border border-slate-200 px-2 py-1 flex items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewInvoice}
                  className="px-3 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border border-emerald-700 rounded-none shadow-xs"
                >
                  فاتورة جديدة
                </button>
              </div>

              {/* Price Level Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-700">مستوى السعر:</span>
                <div className="flex items-center border border-slate-300">
                  {(['سعر1', 'سعر2', 'سعر3', 'سعر4'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedPriceLevel(lvl)}
                      className={`px-2 py-0.5 font-bold text-xs transition-colors ${
                        selectedPriceLevel === lvl
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-800 hover:bg-blue-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. QUICK ACTION BAR (POS WORKFLOW ONLY) */}
      {mainViewMode === 'pos' && (
        <div className="bg-[#f1f5f9] border-b border-slate-200 px-2 py-1 flex items-center justify-between text-xs text-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCodeSearch()}
              title="بحث سريع"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 font-bold text-[11px] text-slate-800"
            >
              Q
            </button>
            <button
              onClick={() => alert('تم تنشيط وتأكيد مزامنة السيرفر والقواعد')}
              title="تحديث"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 font-bold text-[11px] text-slate-800"
            >
              ((
            </button>
            <button
              onClick={() => handleNavigateInvoice('prev')}
              title="الفاتورة السابقة"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 font-bold text-[11px] text-slate-800"
            >
              ◀
            </button>
            <button
              onClick={() => handleNavigateInvoice('next')}
              title="الفاتورة التالية"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 font-bold text-[11px] text-slate-800"
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden">

        {/* VIEW 1: POS WORKSPACE */}
        {mainViewMode === 'pos' && (
          <div className="flex-1 flex flex-row overflow-hidden w-full">
            {/* FAR RIGHT: CATEGORIES PANEL (أنواع الأصناف) */}
            {!showQuickProducts ? (
              <button
                onClick={() => setShowQuickProducts(true)}
                className="w-5 bg-[#f0f7fc] hover:bg-blue-50 border-l border-slate-200 flex flex-col items-center justify-center text-[10px] font-bold text-[#1e3a5f] select-none h-full cursor-pointer py-2"
                title="إظهار أنواع الأصناف"
              >
                <span>&gt;</span>
                <span className="[writing-mode:vertical-rl] mt-2">أنواع الأصناف</span>
              </button>
            ) : (
              <div className="w-32 min-w-[120px] bg-[#f0f7fc] border-l border-slate-200 p-1 flex flex-col font-bold select-none h-full">
                {/* CATEGORIES (أنواع الأصناف) */}
                <div className="bg-[#e2edf6] p-0.5 flex items-center justify-between gap-1 mb-1 text-slate-800 text-[10px] font-bold border border-slate-300 shrink-0">
                  <button
                    onClick={() => setShowQuickProducts(false)}
                    className="px-1 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 font-bold text-[10px] text-slate-700"
                    title="إخفاء أنواع الأصناف"
                  >
                    &lt;
                  </button>
                  <span className="flex-1 text-center font-bold text-[10px] text-[#1e3a5f] truncate">
                    أنواع الأصناف
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 text-[10px]">
                  {categories.map((cat, idx) => {
                    const isSelected = itemCategory === cat;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setItemCategory(cat);
                          setItemName('');
                          setShowAutocomplete(true);
                        }}
                        className={`w-full flex items-center gap-1 cursor-pointer p-0.5 transition-colors ${
                          isSelected ? 'bg-blue-100/60' : 'hover:bg-blue-50'
                        }`}
                      >
                        {/* Index Box */}
                        <span className={`w-4 h-4 border text-[9px] font-mono flex items-center justify-center font-bold shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        {/* Button */}
                        <button
                          className={`flex-1 rounded-none px-1 py-0.5 text-[10px] font-bold truncate text-center border ${
                            isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MAIN INVOICE WORKSPACE (CENTER/LEFT) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* OPERATION VISUAL ACCENT INDICATOR (Change 1) */}
              {activeTabGroup === 'شراء' && (
                <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center justify-between border-r-4 border-r-emerald-600">
                  <span>عملية: فاتورة شراء بضاعة</span>
                  <span className="text-[10px] text-emerald-700 font-normal">وضع توريد بضائع للمخزن</span>
                </div>
              )}
              {(activeTabGroup === 'مرتجع بيع' || activeTabGroup === 'مرتجع شراء') && (
                <div className="bg-amber-50 border-b border-amber-200 px-3 py-1 text-xs font-bold text-amber-900 flex items-center justify-between border-r-4 border-r-amber-600">
                  <span>عملية: {activeTabGroup === 'مرتجع بيع' ? 'مرتجع مبيعات للعميل' : 'مرتجع مشتريات للمورد'}</span>
                  <span className="text-[10px] text-amber-800 font-normal">إعادة صنف مسجل وحساب الفروقات</span>
                </div>
              )}
              {activeTabGroup === 'تالف' && (
                <div className="bg-rose-50 border-b border-rose-200 px-3 py-1 text-xs font-bold text-rose-900 flex items-center justify-between border-r-4 border-r-rose-600">
                  <span>عملية: إثبات هالك وبضاعة تالفة</span>
                  <span className="text-[10px] text-rose-800 font-normal">خصم الصنف من رصيد المخزن كخسارة</span>
                </div>
              )}

              {/* 6. ITEM INPUT ROW */}
              <div className="bg-white border-b border-slate-200 p-1.5 select-none relative flex flex-col gap-1.5 text-xs">
                {/* Row 1: Item Identification & Category Selection */}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-32">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">نوع الصنف</label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full px-1.5 py-0.5 bg-white border border-slate-300 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-medium"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">بحث</label>
                    <input
                      ref={codeQueryInputRef}
                      type="text"
                      placeholder="بحث..."
                      value={codeQuery}
                      onChange={(e) => setCodeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (codeQuery.trim()) {
                            handleCodeSearch();
                          } else {
                            itemNameInputRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full px-1.5 py-0.5 bg-white border border-slate-300 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-900 font-bold"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px] relative">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">اسم الصنف</label>
                    <div className="relative flex items-center">
                      <input
                        ref={itemNameInputRef}
                        type="text"
                        placeholder="اسم الصنف..."
                        value={itemName}
                        onChange={(e) => {
                          setItemName(e.target.value);
                          setShowAutocomplete(true);
                          setAutocompleteSelectedIndex(0);
                        }}
                        onFocus={() => setShowAutocomplete(true)}
                        onKeyDown={(e) => {
                          const matches = inventoryDb.filter(i => {
                            if (itemCategory && !itemName.trim()) return i.category === itemCategory;
                            if (itemName.trim()) {
                              const q = itemName.toLowerCase().trim();
                              return (
                                i.name.toLowerCase().includes(q) ||
                                i.category.toLowerCase().includes(q) ||
                                i.code.toLowerCase().includes(q) ||
                                (i.serial && i.serial.toLowerCase().includes(q))
                              );
                            }
                            return true;
                          });

                          if (showAutocomplete && matches.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setAutocompleteSelectedIndex(prev => (prev + 1) % matches.length);
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setAutocompleteSelectedIndex(prev => (prev - 1 + matches.length) % matches.length);
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowAutocomplete(false);
                              return;
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const chosen = matches[autocompleteSelectedIndex] || matches[0];
                              if (chosen) {
                                const adjustedPrice = chosen.price * priceMultipliers[selectedPriceLevel];
                                setItemName(chosen.name);
                                setItemCategory(chosen.category || '');
                                setItemPrice(adjustedPrice);
                                setItemQuantity(1);
                                setItemValue(adjustedPrice);
                                setItemSerial(chosen.serial || '');
                                setItemNotes('');
                                setLastEditedField('quantity');
                                setShowAutocomplete(false);
                                setAutocompleteSelectedIndex(0);
                                setTimeout(() => {
                                  itemQtyInputRef.current?.focus();
                                  itemQtyInputRef.current?.select();
                                }, 30);
                              } else {
                                setShowAutocomplete(false);
                                itemQtyInputRef.current?.focus();
                                itemQtyInputRef.current?.select();
                              }
                              return;
                            }
                          }

                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setShowAutocomplete(false);
                            if (itemName.trim()) {
                              const q = itemName.trim().toLowerCase();
                              const exact = inventoryDb.find(
                                i => i.name.toLowerCase() === q || i.code.toLowerCase() === q || (i.serial && i.serial.toLowerCase() === q)
                              );
                              if (exact) {
                                const adjustedPrice = exact.price * priceMultipliers[selectedPriceLevel];
                                setItemName(exact.name);
                                setItemCategory(exact.category || '');
                                setItemPrice(adjustedPrice);
                                setItemQuantity(1);
                                setItemValue(adjustedPrice);
                                setItemSerial(exact.serial || '');
                                setItemNotes('');
                                setLastEditedField('quantity');
                                setAutocompleteSelectedIndex(0);
                                setTimeout(() => {
                                  itemQtyInputRef.current?.focus();
                                  itemQtyInputRef.current?.select();
                                }, 30);
                                return;
                              }
                            }
                            itemQtyInputRef.current?.focus();
                            itemQtyInputRef.current?.select();
                          }
                        }}
                        className="w-full pl-6 pr-2 py-0.5 bg-white border border-slate-300 font-bold text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowAutocomplete(prev => !prev)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                        title="عرض قائمة الأصناف"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Autocomplete / Dropdown Popup */}
                    {showAutocomplete && (
                      <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-300 rounded-none z-50 max-h-48 overflow-y-auto shadow-md divide-y divide-slate-100">
                        {inventoryDb
                          .filter(i => {
                            if (itemCategory && !itemName.trim()) {
                              return i.category === itemCategory;
                            }
                            if (itemName.trim()) {
                              const q = itemName.toLowerCase().trim();
                              return (
                                i.name.toLowerCase().includes(q) ||
                                i.category.toLowerCase().includes(q) ||
                                i.code.toLowerCase().includes(q) ||
                                (i.serial && i.serial.toLowerCase().includes(q))
                              );
                            }
                            return true;
                          })
                          .map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSelectItemFromList(item)}
                              className={`p-1.5 cursor-pointer flex justify-between items-center text-xs font-bold transition-colors ${
                                idx === autocompleteSelectedIndex ? 'bg-blue-100/70 text-blue-950' : 'hover:bg-blue-50 text-slate-800'
                              }`}
                            >
                              <span>{item.name} {item.category ? `(${item.category})` : ''}</span>
                              <div className="font-mono text-left font-bold text-xs text-blue-900">
                                [ {item.stock ?? 0} ]
                              </div>
                            </div>
                          ))}
                        {inventoryDb.filter(i => {
                          if (itemCategory && !itemName.trim()) {
                            return i.category === itemCategory;
                          }
                          if (itemName.trim()) {
                            const q = itemName.toLowerCase().trim();
                            return (
                              i.name.toLowerCase().includes(q) ||
                              i.category.toLowerCase().includes(q) ||
                              i.code.toLowerCase().includes(q) ||
                              (i.serial && i.serial.toLowerCase().includes(q))
                            );
                          }
                          return true;
                        }).length === 0 && (
                          <div className="p-2 text-center text-xs text-slate-400">
                            لا توجد أصناف تابعة لـ [{itemCategory}]
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AVAILABLE STOCK DISPLAY & CUSTOMER LAST PRICE ASSIST */}
                  <div className="mr-auto self-end flex items-center gap-1.5 flex-wrap">
                    {customerLastSellingPrice !== null && (
                      <div
                        className="flex items-center gap-1 bg-[#f0f7fc] border border-[#bae6fd] px-2 py-0.5 shadow-2xs h-[25px] whitespace-nowrap"
                        title="آخر سعر بيع تم تسجيله لهذا العميل تحديداً بهذا الصنف"
                      >
                        <span className="font-bold text-[#1e3a5f] text-[11px]">آخر سعر لهذا العميل:</span>
                        <strong className="font-mono font-black text-xs text-blue-600">
                          {customerLastSellingPrice} ج.م
                        </strong>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-0.5 shadow-2xs h-[25px]">
                      <span className="font-bold text-slate-600 text-[11px]">المتاح:</span>
                      <span className={`font-mono font-black text-xs ${
                        activeInputDbItem ? (
                          (activeInputDbItem.stock ?? 0) <= 0 
                            ? 'text-rose-600' 
                            : (activeInputDbItem.stock ?? 0) <= (activeInputDbItem.minStock ?? 5) 
                              ? 'text-amber-600' 
                              : 'text-emerald-600'
                        ) : 'text-slate-400'
                      }`}>
                        {activeInputDbItem ? `${activeInputDbItem.stock ?? 0}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Quantities, Prices, Values & Notes */}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-20">
                    <label className="block font-bold text-rose-700 mb-0.5 text-[11px]">الكمية</label>
                    <input
                      ref={itemQtyInputRef}
                      type="number"
                      min="0"
                      step="any"
                      value={itemQuantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            itemPriceInputRef.current?.focus();
                            itemPriceInputRef.current?.select();
                          } else if (itemName.trim()) {
                            handleAddItemFromBar();
                            itemNameInputRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full px-1.5 py-0.5 bg-white border border-slate-300 font-bold text-rose-700 text-center text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="w-24">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block font-bold text-slate-800 text-[11px]">سعر</label>
                      {activeInputDbItem?.costPrice !== undefined && 
                       (typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice)) || 0) > 0 &&
                       (typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice)) || 0) < activeInputDbItem.costPrice && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-0.5 border border-rose-200" title={`سعر البيع أقل من التكلفة (${activeInputDbItem.costPrice} ج.م)`}>
                          أقل من التكلفة!
                        </span>
                      )}
                    </div>
                    <input
                      ref={itemPriceInputRef}
                      type="number"
                      min="0"
                      step="any"
                      value={itemPrice}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            itemValueInputRef.current?.focus();
                            itemValueInputRef.current?.select();
                          } else if (itemName.trim()) {
                            handleAddItemFromBar();
                            itemNameInputRef.current?.focus();
                          }
                        }
                      }}
                      className={`w-full px-1.5 py-0.5 bg-white border font-bold text-center text-xs focus:outline-none ${
                        activeInputDbItem?.costPrice !== undefined &&
                        (typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice)) || 0) > 0 &&
                        (typeof itemPrice === 'number' ? itemPrice : parseFloat(String(itemPrice)) || 0) < activeInputDbItem.costPrice
                          ? 'border-rose-500 text-rose-600 focus:border-rose-500'
                          : 'border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                    {(itemPricingHistory.lastSellingPrice !== null || itemPricingHistory.lastPurchasePrice !== null || activeInputDbItem?.costPrice !== undefined) && (
                      <div className="flex items-center justify-between gap-1 mt-0.5 text-[9px] text-slate-500 font-mono leading-none">
                        {itemPricingHistory.lastSellingPrice !== null ? (
                          <span title="آخر سعر بيع عام مسجل">ب:{itemPricingHistory.lastSellingPrice}</span>
                        ) : activeInputDbItem?.costPrice !== undefined ? (
                          <span title="تذكير مرجعي مشفر للتكلفة" className="text-slate-400">1.{activeInputDbItem.costPrice}</span>
                        ) : null}
                        {itemPricingHistory.lastPurchasePrice !== null && (
                          <span title="آخر سعر شراء مسجل">ش:{itemPricingHistory.lastPurchasePrice}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-24">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">قيمة</label>
                    <input
                      ref={itemValueInputRef}
                      type="number"
                      min="0"
                      step="any"
                      value={itemValue}
                      onChange={(e) => handleValueChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            itemNotesInputRef.current?.focus();
                            itemNotesInputRef.current?.select();
                          } else if (itemName.trim()) {
                            handleAddItemFromBar();
                            itemNameInputRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full px-1.5 py-0.5 bg-white border border-slate-300 font-bold text-slate-900 text-center text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">رقم مسلسل *</label>
                    <input
                      ref={itemSerialInputRef}
                      type="text"
                      placeholder="SN-0000"
                      value={itemSerial}
                      onChange={(e) => setItemSerial(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            itemNotesInputRef.current?.focus();
                            itemNotesInputRef.current?.select();
                          } else if (itemName.trim()) {
                            handleAddItemFromBar();
                            itemNameInputRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full px-1.5 py-0.5 bg-white border border-slate-300 text-center font-mono text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">ملاحظات</label>
                    <div className="flex items-center gap-1">
                      <input
                        ref={itemNotesInputRef}
                        type="text"
                        placeholder="ملاحظات..."
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (itemName.trim()) {
                              handleAddItemFromBar();
                              itemNameInputRef.current?.focus();
                            }
                          }
                        }}
                        className="w-full px-1.5 py-0.5 bg-white border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleAddItemFromBar}
                        className="px-3 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs whitespace-nowrap border border-emerald-700 rounded-none shadow-xs"
                      >
                        إضافة
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional Purchase Mode Row */}
                {(activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">حد الطلب:</span>
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-16 px-1 py-0.5 bg-white border border-slate-300 text-center text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">سعر1:</span>
                      <input
                        type="number"
                        value={typeof itemPrice === 'number' ? itemPrice : ''}
                        onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-0.5 bg-white border border-slate-300 text-center text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">سعر2:</span>
                      <input
                        type="number"
                        value={typeof itemPrice === 'number' ? (itemPrice * 0.95).toFixed(0) : ''}
                        readOnly
                        className="w-16 px-1 py-0.5 bg-slate-50 border border-slate-200 text-center text-xs text-slate-600"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">سعر3:</span>
                      <input
                        type="number"
                        value={typeof itemPrice === 'number' ? (itemPrice * 0.90).toFixed(0) : ''}
                        readOnly
                        className="w-16 px-1 py-0.5 bg-slate-50 border border-slate-200 text-center text-xs text-slate-600"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">سعر4:</span>
                      <input
                        type="number"
                        value={typeof itemPrice === 'number' ? (itemPrice * 0.85).toFixed(0) : ''}
                        readOnly
                        className="w-16 px-1 py-0.5 bg-slate-50 border border-slate-200 text-center text-xs text-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 7. MINI SUMMARY BAR */}
              <div className="bg-[#f0f7fc] border-b border-[#cbd5e1] px-2 py-0.5 flex items-center justify-between text-[11px] font-bold text-[#1e3a5f]">
                <div className="flex items-center gap-4">
                  <span>عدد الأصناف: <strong className="font-mono text-slate-800">{invoiceItems.length}</strong></span>
                  <span>إجمالي الكمية: <strong className="font-mono text-slate-800">{invoiceItems.reduce((sum, i) => sum + i.quantity, 0)}</strong></span>
                  <span>المبلغ: <strong className="font-mono text-emerald-700">{subtotal.toFixed(2)} ج.م</strong></span>
                  <span>الخصم: <strong className="font-mono text-rose-700">{discount.toFixed(2)} ج.م</strong></span>
                  <span className="text-slate-500 font-mono">التاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alert('تحديث الشاشة')}
                    title="تحديث"
                    className="p-1 hover:bg-blue-100/60 text-[#1e3a5f]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSaveAndPrint({ print: true })}
                    title="طباعة الفاتورة"
                    className="p-1 hover:bg-blue-100/60 text-[#1e3a5f]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSaveAndPrint({ print: false })}
                    title="حفظ الفاتورة"
                    className="p-1 hover:bg-blue-100/60 text-[#1e3a5f]"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 8. INVOICE GRID (EXCEL-LIKE SPREADSHEET GRID) */}
              <ExcelInvoiceGrid
                items={invoiceItems}
                inventoryDb={inventoryDb}
                activeTabGroup={activeTabGroup}
                canChangePrice={!currentUser || (rolesList.find(r => r.id === currentUser?.roleId)?.permissions.includes('PRICE_CHANGE') ?? true)}
                onUpdateItem={handleUpdateInvoiceItem}
                onRemoveItem={handleRemoveItem}
                onAddItemDirect={handleAddDirectItem}
                maxReturnableQtyMap={returnableQtyMap}
                onToggleSelect={handleToggleSelectItem}
                onToggleSelectAll={handleToggleSelectAll}
                onDeleteSelected={handleDeleteSelectedItems}
                onCopySelected={handleCopySelectedItems}
                onMoveSelected={handleMoveSelectedItems}
                openInvoices={openInvoices}
                activeOpenInvoiceId={activeOpenInvoiceId}
              />

              {/* 9. BOTTOM PAYMENT BAR */}
              <div className="bg-[#f8fafc] border-t border-slate-200 p-1.5 select-none">
                <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs">
                  {/* Financial Fields */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Grand Total */}
                    <div className="bg-[#1e3a5f] text-white px-2.5 py-1 border border-[#142842] rounded-none shadow-xs">
                      <span className="text-[10px] text-blue-200 block font-bold">إجمالي الفاتورة</span>
                      <span className="text-base font-black font-mono text-[#4ade80] dir-ltr">
                        {grandTotal.toFixed(2)} <span className="text-[10px] text-white">ج.م</span>
                      </span>
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="block font-bold text-slate-700 text-[10px]">خصـم</label>
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="w-20 px-1.5 py-0.5 bg-white border border-slate-300 font-mono font-bold text-center focus:outline-none focus:border-blue-500 text-xs text-slate-900"
                      />
                    </div>

                    {/* Paid */}
                    <div>
                      <label className="block font-bold text-slate-700 text-[10px] mb-0.5">المـدفـوع</label>
                      <input
                        type="number"
                        min="0"
                        value={paid}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPaid(val);
                          if (currentPayments.length <= 1) {
                            setCurrentPayments([
                              {
                                id: `PAY-${Date.now()}`,
                                method: 'نقد',
                                amount: val,
                                targetName: selectedDrawer || 'الدرج الرئيسي',
                                reference: '',
                                notes: ''
                              }
                            ]);
                          }
                        }}
                        className="w-28 px-1.5 py-1 bg-white border-2 border-emerald-600 font-mono font-bold text-emerald-700 text-center focus:outline-none text-sm rounded-none"
                      />
                    </div>

                    {/* Remaining */}
                    <div className={`px-2 py-0.5 border ${remaining > 0 ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-slate-300 text-slate-800'}`}>
                      <label className="block font-bold text-[10px]">
                        {remaining > 0 ? 'المتبقي (آجل على الحساب)' : 'المتبقي'}
                      </label>
                      <span className="block font-black font-mono text-sm text-left dir-ltr">
                        {remaining.toFixed(2)}
                      </span>
                    </div>

                    {/* Cash Drawer */}
                    <div>
                      <label className="block font-bold text-slate-700 text-[10px]">الخزنة / الدرج</label>
                      <select
                        value={selectedDrawer}
                        onChange={(e) => setSelectedDrawer(e.target.value)}
                        className="px-1.5 py-0.5 bg-white border border-slate-300 font-bold text-xs focus:outline-none text-slate-900"
                      >
                        <option value="الدرج الرئيسي">الدرج الرئيسي</option>
                        <option value="خزنة الكاش">خزنة الكاش</option>
                        <option value="شباك 1">شباك 1</option>
                      </select>
                    </div>
                  </div>

                  {/* UNIFIED FINAL INVOICE ACTION: حفظ الفاتورة + دفع وإنهاء (Change 4) */}
                  <div className="flex items-stretch border border-emerald-700 shadow-xs rounded-none mr-auto overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleSaveAndPrint({ print: true })}
                      disabled={invoiceItems.length === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                      title="حفظ الفاتورة (F12)"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-black whitespace-nowrap">حفظ الفاتورة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaid(grandTotal);
                        setCurrentPayments([
                          {
                            id: `PAY-${Date.now()}`,
                            method: 'نقد',
                            amount: grandTotal,
                            targetName: selectedDrawer || 'الدرج الرئيسي',
                            reference: '',
                            notes: ''
                          }
                        ]);
                        handleSaveAndPrint({ print: true });
                      }}
                      disabled={invoiceItems.length === 0}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs flex items-center gap-1 border-r border-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
                      title="دفع كامل المبلغ وإنهاء الفاتورة مباشرة (F10)"
                    >
                      <span className="text-xs font-bold whitespace-nowrap">دفع وإنهاء</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: STORES & INVENTORY DATA GRID */}
        {mainViewMode === 'stores' && (
          <StoresView
            inventoryDb={inventoryDb}
            categories={categories}
            selectedBranch={selectedBranch}
            completedInvoices={completedInvoices}
            isEditLocked={isEditLocked}
            onAddItem={() => {
              if (isEditLocked) {
                alert('التعديل مقفل — اضغط على قفل التعديل للسماح بالتعديل.');
                return;
              }
              setShowAddItemModal(true);
            }}
            onUpdateItem={(item) => {
              const updated = inventoryDb.map(i => i.code === item.code ? item : i);
              setInventoryDb(updated);
              dbSaveInventory(updated);
            }}
            onDeleteItem={(code) => {
              const updated = inventoryDb.filter(i => i.code !== code);
              setInventoryDb(updated);
              dbSaveInventory(updated);
            }}
          />
        )}

        {/* VIEW 3: REPORTS & ANALYTICS DATA GRID */}
        {mainViewMode === 'reports' && (
          <ReportsView
            completedInvoices={completedInvoices}
            vouchersList={vouchersList}
            stockMovements={stockMovements}
            customersList={customersList}
            suppliersList={suppliersList}
            inventoryDb={inventoryDb}
            treasuriesList={treasuriesList}
            banksList={banksList}
            specialAccountsList={specialAccountsList}
            financialTransfers={financialTransfersList}
            shiftsList={shiftsList}
            activeShift={activeShift}
            selectedBranch={selectedBranch}
            usersList={usersList}
            onOpenShiftModal={() => setShowShiftModal(true)}
          />
        )}

        {/* VIEW 4: INVOICES ARCHIVE & HISTORY */}
        {mainViewMode === 'invoices' && (
          <InvoicesArchiveView
            completedInvoices={completedInvoices}
            heldInvoices={heldInvoices}
            selectedBranch={selectedBranch}
            onSelectInvoiceForPrint={(inv) => {
              const idx = completedInvoices.findIndex(i => i.id === inv.id);
              if (idx >= 0) {
                setInvoiceHistoryIndex(idx);
                setShowPrintModal(true);
              }
            }}
            onNewInvoice={() => {
              handleNewInvoice();
              setMainViewMode('pos');
            }}
          />
        )}

        {/* VIEW 5: BALANCES & FINANCIAL ACCOUNTS */}
        {mainViewMode === 'balances' && (
          <BalancesView
            customersList={customersList}
            suppliersList={suppliersList}
            usersList={usersList}
            rolesList={rolesList}
            completedInvoices={completedInvoices}
            vouchersList={vouchersList}
            selectedBranch={selectedBranch}
            currentUser={currentUser}
            treasuriesList={treasuriesList}
            banksList={banksList}
            specialAccountsList={specialAccountsList}
            chequesList={chequesList}
            financialTransfers={financialTransfersList}
            activeShift={activeShift}
            onUpdateCustomers={(items) => {
              setCustomersList(items);
              dbSaveCustomers(items);
            }}
            onUpdateSuppliers={(items) => {
              setSuppliersList(items);
              dbSaveSuppliers(items);
            }}
            onUpdateVouchers={(items) => {
              setVouchersList(items);
              dbSaveVouchers(items);
            }}
            onUpdateTreasuries={(items) => {
              setTreasuriesList(items);
              dbSaveTreasuries(items);
            }}
            onUpdateBanks={(items) => {
              setBanksList(items);
              dbSaveBanks(items);
            }}
            onUpdateSpecialAccounts={(items) => {
              setSpecialAccountsList(items);
              dbSaveSpecialAccounts(items);
            }}
            onUpdateCheques={(items) => {
              setChequesList(items);
              dbSaveCheques(items);
            }}
            activeSubTab={activeAccountsSubTab}
            onSubTabChange={(tab) => setActiveAccountsSubTab(tab)}
            onOpenCustomerStatement={() => setShowCustomerListModal(true)}
            onOpenSupplierStatement={() => setShowSupplierStatementModal(true)}
            onNewVoucher={(type) => {
              if (type) setVoucherType(type);
              setShowVoucherModal(true);
            }}
            onAddCustomer={() => setShowAddCustomerModal(true)}
            onAddSupplier={() => setShowAddSupplierModal(true)}
          />
        )}

      </div>

      {/* 5. BOTTOM WINDOWS STATUS BAR */}
      <div className="bg-[#555555] border-t border-[#afafaf] px-3 py-1 flex items-center justify-between text-[11px] font-mono text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#4f9d69] text-white border border-[#3f8055] px-1.5 py-0.5 rounded-none font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>متصل</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-white">
          <span className="font-bold">التاريخ: 2026/07/28</span>
          <span className="font-bold">{selectedBranch}</span>
        </div>
      </div>

      {/* --- MODAL 1: PRINT RECEIPT MODAL --- */}
      {showPrintModal && lastPrintedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222]">إيصال فاتورة مبيعات</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-0.5 text-[#666666] hover:text-[#222222]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Printable Receipt Design */}
            <div className="bg-white p-3 border border-[#afafaf] rounded-none font-mono text-xs text-[#222222] space-y-2">
              <div className="text-center border-b border-[#afafaf] pb-2 space-y-0.5">
                <h4 className="font-bold text-sm text-[#222222]">{lastPrintedInvoice.branch}</h4>
                <p className="text-[10px] text-[#666666]">فاتورة {lastPrintedInvoice.type} إلكترونية</p>
                <p className="text-[10px] text-[#666666]">رقم الفاتورة: {lastPrintedInvoice.id}</p>
                {(lastPrintedInvoice.originalInvoiceNumber || lastPrintedInvoice.originalInvoiceId) && (
                  <p className="text-[10px] text-[#8a5d14] font-bold">
                    مرتجع من فاتورة أصلية رقم: {lastPrintedInvoice.originalInvoiceNumber || lastPrintedInvoice.originalInvoiceId}
                  </p>
                )}
                <p className="text-[10px] text-[#666666]">التاريخ: {lastPrintedInvoice.date} {lastPrintedInvoice.time}</p>
              </div>

              <div className="space-y-0.5 border-b border-[#afafaf] pb-1.5">
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-bold">{lastPrintedInvoice.customerName}</span>
                </div>
                {lastPrintedInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span>الهاتف:</span>
                    <span>{lastPrintedInvoice.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1 border-b border-[#afafaf] pb-1.5">
                <div className="flex justify-between font-bold text-[10px] border-b border-dashed border-[#afafaf] pb-1">
                  <span>الصنف</span>
                  <span>العدد × السعر</span>
                  <span>الإجمالي</span>
                </div>
                {lastPrintedInvoice.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[120px]">{i.name}</span>
                    <span>{i.quantity} × {i.price}</span>
                    <span className="font-bold">{i.total}</span>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-0.5 text-xs pt-1">
                <div className="flex justify-between font-bold text-sm">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-[#4f9d69]">{lastPrintedInvoice.total.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>المدفوع:</span>
                  <span>{lastPrintedInvoice.paid.toFixed(2)} ج.م</span>
                </div>
                {lastPrintedInvoice.remaining > 0 && (
                  <div className="flex justify-between text-[#b85c5c] font-bold">
                    <span>المتبقي:</span>
                    <span>{lastPrintedInvoice.remaining.toFixed(2)} ج.م</span>
                  </div>
                )}
              </div>

              {/* Simulated Barcode */}
              <div className="pt-2 text-center border-t border-dashed border-[#afafaf]">
                <div className="h-7 bg-[#222222] mx-auto rounded-none w-3/4 flex items-center justify-center text-white text-[9px] font-mono tracking-widest">
                  ||||| ||| ||||||| ||||
                </div>
                <span className="text-[9px] text-[#666666]">شكراً لزيارتكم!</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                  handleNewInvoice();
                }}
                className="flex-1 py-2 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs flex items-center justify-center gap-1.5 border border-[#3f8055]"
              >
                <Printer className="w-4 h-4" />
                طباعة الفاتورة الآن
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-[#afafaf] text-[#243746] rounded-none text-xs font-bold bg-[#dceef2] hover:bg-[#c9e3e8]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD NEW CUSTOMER MODAL --- */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#243746]" />
                إضافة عميل جديد
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  placeholder="أدخل اسم العميل..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-2 py-1 border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] text-[#222222] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">رقم الهاتف</label>
                <input
                  type="text"
                  placeholder="010XXXXXXXX"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-2 py-1 border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] font-mono text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرصيد الافتتاحي (ج.م)</label>
                <input
                  type="number"
                  value={newCustBalance}
                  onChange={(e) => setNewCustBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] font-mono font-bold text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">ملاحظات العميل</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات العميل والتصنيف..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-2 py-1 border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] text-[#222222]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#afafaf]">
                <input
                  type="checkbox"
                  id="newCustIsSupplierCheckbox"
                  checked={newCustIsSupplier}
                  onChange={(e) => setNewCustIsSupplier(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="newCustIsSupplierCheckbox" className="font-bold text-[#222222] cursor-pointer text-xs select-none">
                  تسجيل كعميل ومورد في نفس الوقت (حساب مزدوج في الموردين)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveCustomer}
                className="flex-1 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs border border-[#3f8055]"
              >
                حفظ العميل
              </button>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] rounded-none text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CUSTOMERS LIST DIRECTORY MODAL --- */}
      {showCustomerListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-2xl w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#243746]" />
                دليل الحسابات (العملاء والموردين)
              </h3>
              <button onClick={() => setShowCustomerListModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهاتف..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-xs focus:outline-none focus:border-[#e8836a]"
              />

              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-[#444444]">تصفية النوع:</span>
                <button
                  type="button"
                  onClick={() => setCounterpartyRoleFilter('all')}
                  className={`px-2 py-0.5 border text-xs font-bold ${
                    counterpartyRoleFilter === 'all'
                      ? 'bg-[#243746] text-white border-[#1b2b37]'
                      : 'bg-white text-[#222222] border-[#afafaf] hover:bg-[#e0e0e0]'
                  }`}
                >
                  الكل ({customersList.length + suppliersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCounterpartyRoleFilter('customer')}
                  className={`px-2 py-0.5 border text-xs font-bold ${
                    counterpartyRoleFilter === 'customer'
                      ? 'bg-[#243746] text-white border-[#1b2b37]'
                      : 'bg-white text-[#222222] border-[#afafaf] hover:bg-[#e0e0e0]'
                  }`}
                >
                  العملاء فقط ({customersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCounterpartyRoleFilter('supplier')}
                  className={`px-2 py-0.5 border text-xs font-bold ${
                    counterpartyRoleFilter === 'supplier'
                      ? 'bg-[#243746] text-white border-[#1b2b37]'
                      : 'bg-white text-[#222222] border-[#afafaf] hover:bg-[#e0e0e0]'
                  }`}
                >
                  الموردون فقط ({suppliersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCounterpartyRoleFilter('dual')}
                  className={`px-2 py-0.5 border text-xs font-bold ${
                    counterpartyRoleFilter === 'dual'
                      ? 'bg-[#243746] text-white border-[#1b2b37]'
                      : 'bg-white text-[#222222] border-[#afafaf] hover:bg-[#e0e0e0]'
                  }`}
                >
                  حسابات مزدوجة (عميل ومورد)
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
              {(() => {
                // Build unified directory entries
                type DirectoryEntry = {
                  id: string;
                  name: string;
                  phone: string;
                  balance: number;
                  notes?: string;
                  isCustomer: boolean;
                  isSupplier: boolean;
                  originalCustomer?: Customer;
                  originalSupplier?: Supplier;
                };

                const entries: DirectoryEntry[] = [];
                const matchedSupplierNames = new Set<string>();

                customersList.forEach(c => {
                  const linkedSupplier = suppliersList.find(s =>
                    (c.supplierId && s.id === c.supplierId) ||
                    s.name.trim().toLowerCase() === c.name.trim().toLowerCase() ||
                    (c.phone && c.phone !== '0000000000' && s.phone === c.phone)
                  );
                  if (linkedSupplier) {
                    matchedSupplierNames.add(linkedSupplier.id);
                  }
                  entries.push({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    balance: c.balance,
                    notes: c.notes,
                    isCustomer: true,
                    isSupplier: Boolean(c.isSupplier || linkedSupplier),
                    originalCustomer: c,
                    originalSupplier: linkedSupplier
                  });
                });

                suppliersList.forEach(s => {
                  if (!matchedSupplierNames.has(s.id)) {
                    entries.push({
                      id: s.id,
                      name: s.name,
                      phone: s.phone,
                      balance: s.balance,
                      notes: s.notes,
                      isCustomer: Boolean(s.isCustomer),
                      isSupplier: true,
                      originalSupplier: s
                    });
                  }
                });

                const q = customerSearchQuery.trim().toLowerCase();
                const filtered = entries.filter(item => {
                  const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.phone.includes(q);
                  if (!matchesSearch) return false;
                  if (counterpartyRoleFilter === 'customer') return item.isCustomer;
                  if (counterpartyRoleFilter === 'supplier') return item.isSupplier;
                  if (counterpartyRoleFilter === 'dual') return item.isCustomer && item.isSupplier;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-6 text-center text-[#888888] font-bold">
                      لا توجد نتائج مطابقة للبحث
                    </div>
                  );
                }

                return filtered.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 border border-[#afafaf] rounded-none bg-white flex items-center justify-between hover:bg-[#e8e8e8]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#222222] text-xs">{entry.name}</h4>
                        {entry.isCustomer && entry.isSupplier ? (
                          <span className="px-1.5 py-0.2 bg-[#243746] text-white text-[10px] font-bold rounded-none">
                            عميل ومورد
                          </span>
                        ) : entry.isCustomer ? (
                          <span className="px-1.5 py-0.2 bg-[#e0f0f5] text-[#243746] border border-[#afafaf] text-[10px] font-bold rounded-none">
                            عميل
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-[#fdf0ea] text-[#e8836a] border border-[#e8836a] text-[10px] font-bold rounded-none">
                            مورد
                          </span>
                        )}
                      </div>
                      <p className="text-[#666666] font-mono text-[11px]">الهاتف: {entry.phone}</p>
                      <p className={`font-mono text-[11px] font-bold ${entry.balance > 0 ? 'text-[#b85c5c]' : 'text-[#4f9d69]'}`}>
                        الرصيد: {entry.balance} ج.م
                      </p>
                      {entry.notes && <p className="text-[#888888] text-[10px]">ملاحظات: {entry.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') {
                            setSupplierName(entry.name);
                            setSupplierPhone(entry.phone);
                            if (entry.originalSupplier) {
                              setSelectedSupplierId(entry.originalSupplier.id);
                            }
                          } else {
                            setCustomerName(entry.name);
                            setCustomerPhone(entry.phone);
                          }
                          setShowCustomerListModal(false);
                        }}
                        className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold rounded-none border border-[#afafaf] text-xs"
                      >
                        اختيار للفاتورة
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: ADD NEW ITEM TO INVENTORY MODAL --- */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#4f9d69]" />
                إضافة صنف جديد للمخزن
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-0.5">كود الصنف (BarCode)</label>
                <input
                  type="text"
                  placeholder="تلقائي أو أدخل كود..."
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اسم الصنف *</label>
                <input
                  type="text"
                  placeholder="أدخل اسم الصنف..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">التصنيف</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">السعر (ج.م)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الكمية الابتدائية بالمخزن</label>
                <input
                  type="number"
                  value={newItemStock}
                  onChange={(e) => setNewItemStock(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveNewItem}
                className="flex-1 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs border border-[#3f8055]"
              >
                حفظ الصنف
              </button>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] rounded-none text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: CASH VOUCHERS MODAL (قبض / صرف) --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#243746]" />
                سند {voucherType} كاش
              </h3>
              <button onClick={() => setShowVoucherModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-1">جهة السند</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setVchPartyType('general'); setSelectedVchPartyId(''); }}
                    className={`flex-1 py-1 px-2 rounded-none font-bold border ${vchPartyType === 'general' ? 'bg-[#e8836a] text-white border-[#d6725a]' : 'bg-[#e8e8e8] text-[#222222] border-[#afafaf]'}`}
                  >
                    عام / أخرى
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVchPartyType('customer'); setSelectedVchPartyId(customersList[0]?.id || ''); if(customersList[0]) setVchName(customersList[0].name); }}
                    className={`flex-1 py-1 px-2 rounded-none font-bold border ${vchPartyType === 'customer' ? 'bg-[#e8836a] text-white border-[#d6725a]' : 'bg-[#e8e8e8] text-[#222222] border-[#afafaf]'}`}
                  >
                    عميل
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVchPartyType('supplier'); setSelectedVchPartyId(suppliersList[0]?.id || ''); if(suppliersList[0]) setVchName(suppliersList[0].name); }}
                    className={`flex-1 py-1 px-2 rounded-none font-bold border ${vchPartyType === 'supplier' ? 'bg-[#e8836a] text-white border-[#d6725a]' : 'bg-[#e8e8e8] text-[#222222] border-[#afafaf]'}`}
                  >
                    مورد
                  </button>
                </div>
              </div>

              {vchPartyType === 'customer' && (
                <div>
                  <label className="block font-bold text-[#222222] mb-0.5">اختر العميل *</label>
                  <select
                    value={selectedVchPartyId}
                    onChange={(e) => {
                      setSelectedVchPartyId(e.target.value);
                      const cust = customersList.find(c => c.id === e.target.value);
                      if (cust) setVchName(cust.name);
                    }}
                    className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  >
                    {customersList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone}) - رصيد: {c.balance}</option>
                    ))}
                  </select>
                </div>
              )}

              {vchPartyType === 'supplier' && (
                <div>
                  <label className="block font-bold text-[#222222] mb-0.5">اختر المورد *</label>
                  <select
                    value={selectedVchPartyId}
                    onChange={(e) => {
                      setSelectedVchPartyId(e.target.value);
                      const supp = suppliersList.find(s => s.id === e.target.value);
                      if (supp) setVchName(supp.name);
                    }}
                    className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  >
                    {suppliersList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone}) - رصيد: {s.balance}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الاسم / البيان *</label>
                <input
                  type="text"
                  placeholder="اسم الشخص أو الخزنة..."
                  value={vchName}
                  onChange={(e) => setVchName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  value={vchAmount}
                  onChange={(e) => setVchAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">السبب / التفاصيل</label>
                <input
                  type="text"
                  placeholder="سبب السند..."
                  value={vchNotes}
                  onChange={(e) => setVchNotes(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveVoucher}
                className="flex-1 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs border border-[#3f8055]"
              >
                إصدار السند
              </button>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] rounded-none text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 7: DAILY SALES REPORT & SHIFT SUMMARY MODAL --- */}
      {showDailyReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-xl w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#243746]" />
                ملخص المبيعات والوردية اليومية
              </h3>
              <button onClick={() => setShowDailyReportModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white border border-[#afafaf] rounded-none">
                <span className="text-[10px] text-[#666666] font-bold block">إجمالي الفواتير</span>
                <span className="text-lg font-bold font-mono text-[#222222]">{completedInvoices.length}</span>
              </div>
              <div className="p-2 bg-white border border-[#afafaf] rounded-none">
                <span className="text-[10px] text-[#4f9d69] font-bold block">إجمالي المبيعات</span>
                <span className="text-lg font-bold font-mono text-[#4f9d69]">
                  {completedInvoices.reduce((acc, i) => acc + i.total, 0).toFixed(2)} ج.م
                </span>
              </div>
              <div className="p-2 bg-white border border-[#afafaf] rounded-none">
                <span className="text-[10px] text-[#243746] font-bold block">عدد السندات</span>
                <span className="text-lg font-bold font-mono text-[#222222]">{vouchersList.length}</span>
              </div>
            </div>

            <div className="border border-[#afafaf] rounded-none bg-white max-h-56 overflow-y-auto text-xs">
              <table className="w-full text-right">
                <thead className="bg-[#e8e8e8] font-bold border-b border-[#afafaf]">
                  <tr>
                    <th className="p-1.5 border-l border-[#afafaf]">رقم الفاتورة</th>
                    <th className="p-1.5 border-l border-[#afafaf]">العميل</th>
                    <th className="p-1.5 border-l border-[#afafaf]">الوقت</th>
                    <th className="p-1.5">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d0d0]">
                  {completedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#999999]">لا توجد فواتير مكتملة اليوم بعد</td>
                    </tr>
                  ) : (
                    completedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#f0f0f0]">
                        <td className="p-1.5 font-mono font-bold border-l border-[#d0d0d0]">{inv.id}</td>
                        <td className="p-1.5 border-l border-[#d0d0d0]">{inv.customerName}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-l border-[#d0d0d0]">{inv.time}</td>
                        <td className="p-1.5 font-mono font-bold text-[#4f9d69]">{inv.total} ج.م</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowDailyReportModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none text-xs"
              >
                حسناً / إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 8: ADMIN SETTINGS & PERMISSIONS MODAL --- */}
      {showAdminSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-2xl w-full p-4 border border-[#afafaf] space-y-3 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2 shrink-0">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#243746]" />
                لوحة التحكم والإعدادات والمستخدمين
              </h3>
              <button onClick={() => setShowAdminSettingsModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Modal Sub-Tabs */}
            <div className="flex border-b border-[#afafaf] shrink-0">
              <button
                onClick={() => setAdminSubTab('settings')}
                className={`px-3 py-1 font-bold text-xs border-b-2 transition-colors ${
                  adminSubTab === 'settings' ? 'border-[#e8836a] bg-white text-[#e8836a]' : 'border-transparent text-[#222222] hover:bg-[#e8e8e8]'
                }`}
              >
                الإعدادات العامة
              </button>
              <button
                onClick={() => setAdminSubTab('users')}
                className={`px-3 py-1 font-bold text-xs border-b-2 transition-colors ${
                  adminSubTab === 'users' ? 'border-[#e8836a] bg-white text-[#e8836a]' : 'border-transparent text-[#222222] hover:bg-[#e8e8e8]'
                }`}
              >
                إدارة المستخدمين ({usersList.length})
              </button>
              <button
                onClick={() => setAdminSubTab('roles')}
                className={`px-3 py-1 font-bold text-xs border-b-2 transition-colors ${
                  adminSubTab === 'roles' ? 'border-[#e8836a] bg-white text-[#e8836a]' : 'border-transparent text-[#222222] hover:bg-[#e8e8e8]'
                }`}
              >
                الصلاحيات والأدوار ({rolesList.length})
              </button>
              <button
                onClick={() => setAdminSubTab('audit')}
                className={`px-3 py-1 font-bold text-xs border-b-2 transition-colors ${
                  adminSubTab === 'audit' ? 'border-[#e8836a] bg-white text-[#e8836a]' : 'border-transparent text-[#222222] hover:bg-[#e8e8e8]'
                }`}
              >
                سجل الحركات والأمان ({auditLogsList.length})
              </button>
            </div>

            {/* Sub-Tab Content 1: General Settings */}
            {adminSubTab === 'settings' && (
              <div className="space-y-3 text-xs overflow-y-auto flex-1 p-1">
                <div>
                  <label className="block font-bold text-[#222222] mb-0.5">اسم الفرع الحالي</label>
                  <input
                    type="text"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] font-bold focus:outline-none focus:border-[#e8836a]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-0.5">الخزنة / الدرج التلقائي</label>
                  <select
                    value={selectedDrawer}
                    onChange={(e) => setSelectedDrawer(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  >
                    <option value="الدرج الرئيسي">الدرج الرئيسي</option>
                    <option value="خزنة الكاش">خزنة الكاش</option>
                    <option value="شباك 1">شباك 1</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-0.5">نوع الطابعة</label>
                  <select className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]">
                    <option value="thermal">طابعة فواتير حرارية 80mm</option>
                    <option value="a4">طابعة أوراق قياسية A4</option>
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      dbSaveSetting('selectedBranch', selectedBranch);
                      dbSaveSetting('selectedDrawer', selectedDrawer);
                      setShowAdminSettingsModal(false);
                    }}
                    className="px-4 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs border border-[#3f8055]"
                  >
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Tab Content 2: Users Management */}
            {adminSubTab === 'users' && (
              <div className="space-y-3 text-xs overflow-y-auto flex-1 p-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#222222]">قائمة مستخدمي النظام</h4>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormUsername('');
                      setUserFormDisplayName('');
                      setUserFormPassword('');
                      setUserFormRoleId('CASHIER');
                      setUserFormActive(true);
                    }}
                    className="px-2 py-1 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold rounded-none flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> مستخدم جديد
                  </button>
                </div>

                {/* Users List Table */}
                <div className="border border-[#afafaf] bg-white overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-[#e8e8e8] font-bold border-b border-[#afafaf]">
                      <tr>
                        <th className="p-1.5 border-l border-[#afafaf]">اسم المستخدم</th>
                        <th className="p-1.5 border-l border-[#afafaf]">الاسم المعروض</th>
                        <th className="p-1.5 border-l border-[#afafaf]">الدور الوظيفي</th>
                        <th className="p-1.5 border-l border-[#afafaf]">الحالة</th>
                        <th className="p-1.5 text-center">إجراءات الأمان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d0d0d0]">
                      {usersList.map((usr) => {
                        const roleObj = rolesList.find(r => r.id === usr.roleId);
                        return (
                          <tr key={usr.id} className="hover:bg-[#f0f0f0]">
                            <td className="p-1.5 font-mono font-bold border-l border-[#d0d0d0]">{usr.username}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0] font-bold">{usr.displayName}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0]">{roleObj?.name || usr.roleId}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0]">
                              {usr.active ? (
                                <span className="px-1.5 py-0.5 bg-[#4f9d69] text-white text-[10px] font-bold">نشط</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-[#b85c5c] text-white text-[10px] font-bold">معطل</span>
                              )}
                            </td>
                            <td className="p-1.5 text-center flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingUser(usr);
                                  setUserFormUsername(usr.username);
                                  setUserFormDisplayName(usr.displayName);
                                  setUserFormPassword('');
                                  setUserFormRoleId(usr.roleId);
                                  setUserFormActive(usr.active);
                                }}
                                className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold text-[10px]"
                                title="تعديل بيانات المستخدم"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => {
                                  setAdminResetPinTarget(usr);
                                  setAdminResetNewPin('');
                                  setAdminResetConfirmPin('');
                                  setAdminResetError('');
                                }}
                                className="px-1.5 py-0.5 bg-[#fff3e0] hover:bg-[#ffe0b2] border border-[#ffb74d] text-[#e65100] font-bold text-[10px] flex items-center gap-0.5"
                                title="إعادة تعيين الرقم السري (PIN)"
                              >
                                <Key className="w-2.5 h-2.5" /> إعادة PIN
                              </button>
                              {usr.roleId !== 'ADMIN' && (
                                <button
                                  onClick={() => handleToggleUserStatus(usr)}
                                  className={`px-1.5 py-0.5 border font-bold text-[10px] ${
                                    usr.active
                                      ? 'bg-[#ffebee] hover:bg-[#ffcdd2] border-[#ef9a9a] text-[#c62828]'
                                      : 'bg-[#e8f5e9] hover:bg-[#c8e6c9] border-[#a5d6a7] text-[#2e7d32]'
                                  }`}
                                  title={usr.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                >
                                  {usr.active ? 'تعطيل' : 'تفعيل'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* User Form Card */}
                <div className="p-3 bg-[#e8e8e8] border border-[#afafaf] space-y-2">
                  <h5 className="font-bold text-[#222222] border-b border-[#afafaf] pb-1">
                    {editingUser ? `تعديل المستخدم [${editingUser.username}]` : 'إضافة مستخدم جديد'}
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-[#222222] mb-0.5">اسم المستخدم (Username) *</label>
                      <input
                        type="text"
                        value={userFormUsername}
                        onChange={(e) => setUserFormUsername(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#222222] mb-0.5">الاسم المعروض (Display Name) *</label>
                      <input
                        type="text"
                        value={userFormDisplayName}
                        onChange={(e) => setUserFormDisplayName(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#222222] mb-0.5">
                        الرقم السري (4 أرقام PIN) {editingUser ? '(اترك فارغاً لعدم التغيير)' : '*'}
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={userFormPassword}
                        onChange={(e) => setUserFormPassword(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] font-mono tracking-widest"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#222222] mb-0.5">الدور الوظيفي *</label>
                      <select
                        value={userFormRoleId}
                        onChange={(e) => setUserFormRoleId(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a]"
                      >
                        {rolesList.map(r => (
                          <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1 font-bold text-[#222222] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userFormActive}
                        onChange={(e) => setUserFormActive(e.target.checked)}
                      />
                      الحساب فعال ونشط
                    </label>
                    <button
                      onClick={handleSaveUserForm}
                      className="mr-auto px-4 py-1 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold rounded-none border border-[#3f8055]"
                    >
                      حفظ المستخدم
                    </button>
                  </div>
                </div>

                {/* Admin Emergency Recovery Code Section */}
                {currentUser?.roleId === 'ADMIN' && (
                  <div className="p-3 bg-[#fff8e1] border border-[#ffe082] space-y-2">
                    <div className="flex items-center justify-between border-b border-[#ffe082] pb-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#f57f17]">
                        <ShieldAlert className="w-4 h-4" />
                        <span>كود استرداد مسؤول النظام للطوارئ (Owner Recovery Code)</span>
                      </div>
                      <span className="text-[10px] text-[#795548] font-normal">سري وخاص بمالك النظام فقط</span>
                    </div>

                    <p className="text-[11px] text-[#5d4037] leading-tight">
                      يُستخدم هذا الكود لاستعادة حساب المدير الرئيسي وإنشاء PIN جديد في حال نسيان الرقم السري. لا تشارك هذا الكود مع الكاشير أو المستخدمين.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 px-2.5 py-1 bg-white border border-[#ffca28] font-mono text-xs font-bold tracking-widest text-[#d84315] flex items-center justify-between">
                        <span>{showRecoveryCodePlain ? adminRecoveryCode : '••••••••••••'}</span>
                        <button
                          type="button"
                          onClick={() => setShowRecoveryCodePlain(!showRecoveryCodePlain)}
                          className="text-[#666666] hover:text-[#222222] text-[10px] flex items-center gap-1 ml-2 font-sans"
                        >
                          {showRecoveryCodePlain ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {showRecoveryCodePlain ? 'إخفاء' : 'إظهار'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRegenerateRecoveryCode}
                        className="px-2.5 py-1 bg-[#f57f17] hover:bg-[#e65100] text-white font-bold text-[11px] flex items-center gap-1"
                        title="توليد كود استرداد عشوائي جديد"
                      >
                        <RefreshCw className="w-3 h-3" />
                        توليد كود جديد
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab Content 3: Roles & Permission Matrix */}
            {adminSubTab === 'roles' && (
              <div className="space-y-3 text-xs overflow-y-auto flex-1 p-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#222222]">اختر الدور للتعديل:</span>
                  <select
                    value={editingRoleId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setEditingRoleId(rId);
                      const selectedR = rolesList.find(r => r.id === rId);
                      if (selectedR) setRoleFormPermissions([...selectedR.permissions]);
                    }}
                    className="px-2 py-1 bg-white border border-[#afafaf] font-bold focus:outline-none"
                  >
                    {rolesList.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.permissions.length} صلاحية)</option>
                    ))}
                  </select>
                </div>

                {/* Permissions Checkbox Matrix */}
                <div className="border border-[#afafaf] bg-white p-3 space-y-3">
                  <h5 className="font-bold text-[#222222] border-b border-[#afafaf] pb-1 flex justify-between">
                    <span>صلاحيات دور: {rolesList.find(r => r.id === editingRoleId)?.name}</span>
                    <button
                      onClick={() => {
                        const allPerms: Permission[] = [
                          'SALE_CREATE', 'SALE_EDIT', 'SALE_DELETE', 'SALE_RETURN',
                          'PURCHASE_CREATE', 'PURCHASE_EDIT', 'PURCHASE_DELETE', 'PURCHASE_RETURN',
                          'INVENTORY_VIEW', 'INVENTORY_ADJUST', 'INVENTORY_TRANSFER', 'INVENTORY_DAMAGE',
                          'PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRICE_CHANGE',
                          'CUSTOMER_VIEW', 'CUSTOMER_EDIT', 'SUPPLIER_VIEW', 'SUPPLIER_EDIT',
                          'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'REPORTS_VIEW', 'BACKUP', 'RESTORE',
                          'SETTINGS', 'USERS_MANAGE'
                        ];
                        const isAll = roleFormPermissions.length === allPerms.length;
                        setRoleFormPermissions(isAll ? [] : allPerms);
                      }}
                      className="text-[#e8836a] hover:underline text-[11px]"
                    >
                      تحديد / إلغاء الكل
                    </button>
                  </h5>

                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {[
                      { key: 'SALE_CREATE', label: 'إنشاء فواتير بيع', cat: 'المبيعات' },
                      { key: 'SALE_EDIT', label: 'تعديل فواتير بيع', cat: 'المبيعات' },
                      { key: 'SALE_DELETE', label: 'حذف فواتير بيع', cat: 'المبيعات' },
                      { key: 'SALE_RETURN', label: 'إنشاء مرتجع بيع', cat: 'المبيعات' },
                      { key: 'PURCHASE_CREATE', label: 'إنشاء فواتير شراء', cat: 'المشتريات' },
                      { key: 'PURCHASE_EDIT', label: 'تعديل فواتير شراء', cat: 'المشتريات' },
                      { key: 'PURCHASE_DELETE', label: 'حذف فواتير شراء', cat: 'المشتريات' },
                      { key: 'PURCHASE_RETURN', label: 'إنشاء مرتجع شراء', cat: 'المشتريات' },
                      { key: 'INVENTORY_VIEW', label: 'عرض وإدارة المخزون', cat: 'المخزون' },
                      { key: 'INVENTORY_ADJUST', label: 'تسوية كميات المخزون', cat: 'المخزون' },
                      { key: 'INVENTORY_TRANSFER', label: 'تحويلات مخزنية', cat: 'المخزون' },
                      { key: 'INVENTORY_DAMAGE', label: 'إثبات تالف بالمخزن', cat: 'المخزون' },
                      { key: 'PRODUCT_CREATE', label: 'إضافة صنف جديد', cat: 'الأصناف' },
                      { key: 'PRODUCT_EDIT', label: 'تعديل بيانات صنف', cat: 'الأصناف' },
                      { key: 'PRODUCT_DELETE', label: 'حذف صنف من المخزن', cat: 'الأصناف' },
                      { key: 'PRICE_CHANGE', label: 'تعديل الأسعار والخصومات', cat: 'الأصناف' },
                      { key: 'CUSTOMER_VIEW', label: 'عرض بيانات العملاء', cat: 'الحسابات' },
                      { key: 'CUSTOMER_EDIT', label: 'إضافة وتعديل العملاء', cat: 'الحسابات' },
                      { key: 'SUPPLIER_VIEW', label: 'عرض بيانات الموردين', cat: 'الحسابات' },
                      { key: 'SUPPLIER_EDIT', label: 'إضافة وتعديل الموردين', cat: 'الحسابات' },
                      { key: 'RECEIPT_VOUCHER', label: 'إصدار سندات قبض', cat: 'السندات' },
                      { key: 'PAYMENT_VOUCHER', label: 'إصدار سندات صرف', cat: 'السندات' },
                      { key: 'REPORTS_VIEW', label: 'عرض التقارير والوردية', cat: 'الإدارة' },
                      { key: 'BACKUP', label: 'تصدير نسخة احتياطية', cat: 'الإدارة' },
                      { key: 'RESTORE', label: 'استعادة نسخة احتياطية', cat: 'الإدارة' },
                      { key: 'SETTINGS', label: 'الوصول لإعدادات النظام', cat: 'الإدارة' },
                      { key: 'USERS_MANAGE', label: 'إدارة المستخدمين والصلاحيات', cat: 'الإدارة' },
                    ].map((p) => {
                      const pKey = p.key as Permission;
                      const isChecked = roleFormPermissions.includes(pKey);
                      return (
                        <label key={p.key} className="flex items-center gap-1.5 p-1 bg-[#f9f9f9] border border-[#d0d0d0] hover:bg-[#e8e8e8] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRoleFormPermissions([...roleFormPermissions, pKey]);
                              } else {
                                setRoleFormPermissions(roleFormPermissions.filter(k => k !== pKey));
                              }
                            }}
                          />
                          <div>
                            <span className="font-bold block text-[#222222]">{p.label}</span>
                            <span className="text-[9px] text-[#666666]">{p.cat} ({p.key})</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveRolePermissions}
                      className="px-4 py-1.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold rounded-none text-xs border border-[#3f8055]"
                    >
                      حفظ صلاحيات الدور
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab Content 4: Audit Logs */}
            {adminSubTab === 'audit' && (
              <div className="space-y-3 text-xs overflow-y-auto flex-1 p-1">
                <h4 className="font-bold text-[#222222]">سجل الحركات الأمنية (Audit Log)</h4>
                <div className="border border-[#afafaf] bg-white overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-right">
                    <thead className="bg-[#e8e8e8] font-bold border-b border-[#afafaf] sticky top-0">
                      <tr>
                        <th className="p-1.5 border-l border-[#afafaf]">التاريخ والوقت</th>
                        <th className="p-1.5 border-l border-[#afafaf]">المستخدم</th>
                        <th className="p-1.5 border-l border-[#afafaf]">نوع الحركة</th>
                        <th className="p-1.5">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d0d0d0]">
                      {auditLogsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-[#999999]">لا توجد حركات مسجلة بالسجل بعد</td>
                        </tr>
                      ) : (
                        auditLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[#f0f0f0]">
                            <td className="p-1.5 font-mono text-[#666666] border-l border-[#d0d0d0]">
                              {new Date(log.timestamp).toLocaleString('ar-EG')}
                            </td>
                            <td className="p-1.5 font-bold border-l border-[#d0d0d0]">{log.username}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0]">
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                log.action === 'BLOCKED_ACTION' ? 'bg-[#b85c5c] text-white' : 'bg-[#dceef2] text-[#243746]'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-1.5 text-[#222222]">{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 10: LOGIN / SWITCH USER MODAL --- */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#243746]" />
                تسجيل الدخول / تبديل المستخدم
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              {loginError && (
                <div className="p-2 bg-[#fdf2f2] border border-[#e0a8a8] text-[#b85c5c] font-bold">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اختر أو اكتب اسم المستخدم *</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {usersList.filter(u => u.active).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setLoginUsername(u.username); setLoginPassword(''); }}
                      className={`px-2 py-0.5 border text-[11px] font-bold transition-colors ${
                        loginUsername === u.username
                          ? 'bg-[#e8836a] text-white border-[#d06b52]'
                          : 'bg-[#dceef2] hover:bg-[#c9e3e8] border-[#afafaf] text-[#243746]'
                      }`}
                    >
                      {u.displayName}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="اسم المستخدم..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="font-bold text-[#222222]">الرقم السري (PIN - 4 أرقام) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setRecoveryCodeInput('');
                      setRecoveryNewPin('');
                      setRecoveryConfirmPin('');
                      setRecoveryError('');
                      setShowAdminRecoveryModal(true);
                    }}
                    className="text-[10px] text-[#e8836a] hover:underline"
                  >
                    نسيت رقم المدير؟
                  </button>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-base font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#afafaf]">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-3 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold rounded-none border border-[#3f8055]"
                >
                  دخول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: PRIVILEGED ACTION AUTHORIZATION (موافقة المشرف / المدير) --- */}
      {privilegedAuthDialog?.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border-2 border-[#e8836a] shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#c62828] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#c62828]" />
                موافقة المدير / المشرف مطلوبة
              </h3>
              <button
                onClick={() => setPrivilegedAuthDialog(null)}
                className="p-0.5 text-[#666666] hover:text-[#222222]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 bg-[#fff3e0] border border-[#ffe0b2] text-[11px] text-[#e65100] space-y-1">
              <div className="font-bold">العملية المطلوبة:</div>
              <div className="font-medium text-[#bf360c]">{privilegedAuthDialog.actionDescription}</div>
            </div>

            <form onSubmit={handlePrivilegedAuthSubmit} className="space-y-3 text-xs">
              {privilegedAuthDialog.error && (
                <div className="p-2 bg-[#fdf2f2] border border-[#e0a8a8] text-[#b85c5c] font-bold">
                  {privilegedAuthDialog.error}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اسم المدير أو المشرف المصرح *</label>
                <select
                  value={privilegedAuthDialog.supervisorUserId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setPrivilegedAuthDialog(prev => prev ? { ...prev, supervisorUserId: sId, error: '' } : null);
                  }}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                >
                  {usersList.filter(u => {
                    if (!u.active) return false;
                    const r = rolesList.find(role => role.id === u.roleId);
                    return r && r.permissions.includes(privilegedAuthDialog.requiredPermission);
                  }).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({rolesList.find(r => r.id === u.roleId)?.name || u.roleId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرقم السري للمشرف (PIN - 4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={privilegedAuthDialog.pin}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrivilegedAuthDialog(prev => prev ? { ...prev, pin: val, error: '' } : null);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-base font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#afafaf]">
                <button
                  type="button"
                  onClick={() => setPrivilegedAuthDialog(null)}
                  className="px-3 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-[#e8836a] hover:bg-[#d06b52] text-white font-bold rounded-none border border-[#d06b52]"
                >
                  تفويض ومتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CHANGE OWN PIN (تغيير الرقم السري الخاص بي) --- */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#243746]" />
                تغيير الرقم السري (PIN) - {currentUser?.displayName}
              </h3>
              <button onClick={() => setShowChangePinModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeOwnPin} className="space-y-3 text-xs">
              {changePinError && (
                <div className="p-2 bg-[#fdf2f2] border border-[#e0a8a8] text-[#b85c5c] font-bold">
                  {changePinError}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرقم السري الحالي (4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={changePinCurrent}
                  onChange={(e) => setChangePinCurrent(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرقم السري الجديد (4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={changePinNew}
                  onChange={(e) => setChangePinNew(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">تأكيد الرقم السري الجديد *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={changePinConfirm}
                  onChange={(e) => setChangePinConfirm(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#afafaf]">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-3 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold rounded-none border border-[#3f8055]"
                >
                  تحديث PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADMIN RESET USER PIN (إعادة تعيين PIN بواسطة المدير) --- */}
      {adminResetPinTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#e65100]" />
                إعادة تعيين PIN للمستخدم [{adminResetPinTarget.displayName}]
              </h3>
              <button onClick={() => setAdminResetPinTarget(null)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminResetUserPin} className="space-y-3 text-xs">
              {adminResetError && (
                <div className="p-2 bg-[#fdf2f2] border border-[#e0a8a8] text-[#b85c5c] font-bold">
                  {adminResetError}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرقم السري الجديد (PIN - 4 أرقام) *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={adminResetNewPin}
                  onChange={(e) => setAdminResetNewPin(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">تأكيد الرقم السري الجديد *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={adminResetConfirmPin}
                  onChange={(e) => setAdminResetConfirmPin(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#afafaf]">
                <button
                  type="button"
                  onClick={() => setAdminResetPinTarget(null)}
                  className="px-3 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#e65100] hover:bg-[#bf360c] text-white font-bold rounded-none border border-[#bf360c]"
                >
                  تعيين PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADMIN EMERGENCY RECOVERY (استرداد حساب المدير عند نسيان الرقم السري) --- */}
      {showAdminRecoveryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-sm w-full p-4 border-2 border-[#f57f17] shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#f57f17] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#f57f17]" />
                استرداد حساب مسؤول النظام للطوارئ
              </h3>
              <button onClick={() => setShowAdminRecoveryModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              أدخل كود الاسترداد السري (Recovery Code) الخاص بالمالك لإنشاء رقم سري (PIN) جديد لحساب المدير.
            </p>

            <form onSubmit={handleAdminRecoverySubmit} className="space-y-3 text-xs">
              {recoveryError && (
                <div className="p-2 bg-[#fdf2f2] border border-[#e0a8a8] text-[#b85c5c] font-bold">
                  {recoveryError}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">كود استرداد مسؤول النظام *</label>
                <input
                  type="text"
                  placeholder="RC-XXXX-XXXX"
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#ffb74d] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#d84315] focus:outline-none focus:border-[#f57f17]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرقم السري الجديد للمدير (4 أرقام PIN) *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={recoveryNewPin}
                  onChange={(e) => setRecoveryNewPin(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">تأكيد الرقم السري الجديد *</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={recoveryConfirmPin}
                  onChange={(e) => setRecoveryConfirmPin(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-center tracking-widest text-sm font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#afafaf]">
                <button
                  type="button"
                  onClick={() => setShowAdminRecoveryModal(false)}
                  className="px-3 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f57f17] hover:bg-[#e65100] text-white font-bold rounded-none border border-[#e65100]"
                >
                  استعادة وتعيين PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 9: BACKUP & RESTORE DATA MODAL --- */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#243746]" />
                نسخة احتياطية للبيانات
              </h3>
              <button onClick={() => setShowBackupModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              يمكنك تصدير قاعدة البيانات الحالية والفواتير والعملاء إلى ملف JSON آمن للرجوع إليه في أي وقت أو استعادة نسخة سابقة.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleExportBackup}
                className="w-full py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-[#243746]" />
                تصدير نسخة احتياطية (JSON)
              </button>

              <label className="w-full py-1.5 bg-[#4f9d69] hover:bg-[#43885a] border border-[#3f8055] text-white font-bold rounded-none text-xs flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                استعادة نسخة احتياطية (JSON)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#afafaf]">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-1.5 border border-[#afafaf] bg-[#e8e8e8] text-[#222222] rounded-none text-xs font-bold hover:bg-[#d0d0d0]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 10: QUICK CALCULATOR MODAL --- */}
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-xs w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#243746]" />
                آلة حاسبة الكاشير
              </h3>
              <button onClick={() => setShowCalculatorModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Display */}
            <div className="bg-[#222222] text-[#4f9d69] p-2 rounded-none text-left font-mono text-xl font-bold tracking-wider overflow-x-auto dir-ltr border border-[#afafaf]">
              {calcDisplay}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-1 font-mono text-xs font-bold dir-ltr">
              {['7', '8', '9', '/'].map(k => (
                <button
                  key={k}
                  onClick={() => setCalcDisplay(calcDisplay === '0' ? k : calcDisplay + k)}
                  className="p-2 bg-white hover:bg-[#e8e8e8] border border-[#afafaf] rounded-none text-[#222222]"
                >
                  {k}
                </button>
              ))}
              {['4', '5', '6', '*'].map(k => (
                <button
                  key={k}
                  onClick={() => setCalcDisplay(calcDisplay === '0' ? k : calcDisplay + k)}
                  className="p-2 bg-white hover:bg-[#e8e8e8] border border-[#afafaf] rounded-none text-[#222222]"
                >
                  {k}
                </button>
              ))}
              {['1', '2', '3', '-'].map(k => (
                <button
                  key={k}
                  onClick={() => setCalcDisplay(calcDisplay === '0' ? k : calcDisplay + k)}
                  className="p-2 bg-white hover:bg-[#e8e8e8] border border-[#afafaf] rounded-none text-[#222222]"
                >
                  {k}
                </button>
              ))}
              {['0', '.', 'C', '+'].map(k => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === 'C') setCalcDisplay('0');
                    else setCalcDisplay(calcDisplay === '0' ? k : calcDisplay + k);
                  }}
                  className="p-2 bg-white hover:bg-[#e8e8e8] border border-[#afafaf] rounded-none text-[#222222]"
                >
                  {k}
                </button>
              ))}
              <button
                onClick={() => {
                  try {
                    // Safe basic evaluation
                    setCalcDisplay(eval(calcDisplay.replace(/[^0-9+\-*/.]/g, '')).toString());
                  } catch {
                    setCalcDisplay('Error');
                  }
                }}
                className="col-span-4 p-2 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] rounded-none text-center font-bold"
              >
                =
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 11: SUPPLIERS DIRECTORY MODAL --- */}
      {showSupplierListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-2xl w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#243746]" />
                دليل الموردين
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setNewSuppName('');
                    setNewSuppPhone('');
                    setNewSuppBalance(0);
                    setNewSuppAddress('');
                    setNewSuppNotes('');
                    setShowAddSupplierModal(true);
                  }}
                  className="px-2.5 py-1 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs flex items-center gap-1 border border-[#3f8055]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مورد
                </button>
                <button onClick={() => setShowSupplierListModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="بحث باسم المورد أو رقم الهاتف..."
              value={supplierSearchQuery}
              onChange={(e) => setSupplierSearchQuery(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-xs focus:outline-none focus:border-[#e8836a]"
            />

            <div className="space-y-1.5 max-h-80 overflow-y-auto text-xs">
              {suppliersList
                .filter(s => s.name.includes(supplierSearchQuery) || s.phone.includes(supplierSearchQuery))
                .map((s) => {
                  const isAlsoCust = Boolean(s.isCustomer || customersList.some(c => (c.supplierId && c.supplierId === s.id) || c.name === s.name || (s.phone && s.phone !== '0000000000' && c.phone === s.phone)));
                  return (
                    <div
                      key={s.id}
                      className="p-2 border border-[#afafaf] rounded-none bg-white flex items-center justify-between hover:bg-[#e8e8e8]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#222222] text-xs">{s.name}</h4>
                          {isAlsoCust ? (
                            <span className="px-1.5 py-0.2 bg-[#243746] text-white text-[10px] font-bold rounded-none">
                              مورد وعميل
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-[#fdf0ea] text-[#e8836a] border border-[#e8836a] text-[10px] font-bold rounded-none">
                              مورد
                            </span>
                          )}
                        </div>
                        <p className="text-[#666666] font-mono">الهاتف: {s.phone} {s.address ? `| العنوان: ${s.address}` : ''}</p>
                        <p className={`font-mono text-[11px] font-bold ${s.balance > 0 ? 'text-[#b85c5c]' : 'text-[#4f9d69]'}`}>
                          المستحق للمورد: {s.balance} ج.م
                        </p>
                        {s.notes && <p className="text-[#666666] text-[10px]">ملاحظات: {s.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSupplierName(s.name);
                            setSupplierPhone(s.phone);
                            setSelectedSupplierId(s.id);
                            setShowSupplierListModal(false);
                          }}
                          className="px-2 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none text-xs"
                        >
                          تحديد للفاتورة
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplierForStatement(s);
                            setShowSupplierStatementModal(true);
                          }}
                          className="px-2 py-1 bg-[#e8e8e8] hover:bg-[#d0d0d0] border border-[#afafaf] text-[#222222] font-bold rounded-none text-xs"
                        >
                          كشف حساب
                        </button>
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setNewSuppName(s.name);
                            setNewSuppPhone(s.phone);
                            setNewSuppBalance(s.balance);
                            setNewSuppAddress(s.address || '');
                            setNewSuppNotes(s.notes || '');
                            setNewSuppIsCustomer(isAlsoCust);
                            setShowAddSupplierModal(true);
                          }}
                          className="px-2 py-1 bg-[#e8836a] hover:bg-[#d6725a] text-white font-bold rounded-none text-xs"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          className="px-2 py-1 bg-[#b85c5c] hover:bg-[#a34b4b] text-white font-bold rounded-none text-xs"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 12: ADD / EDIT SUPPLIER MODAL --- */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#243746]" />
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  placeholder="أدخل اسم المورد..."
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">رقم الهاتف</label>
                <input
                  type="text"
                  placeholder="رقم التواصل..."
                  value={newSuppPhone}
                  onChange={(e) => setNewSuppPhone(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الرصيد الافتتاحي (المستحق للمورد)</label>
                <input
                  type="number"
                  value={newSuppBalance}
                  onChange={(e) => setNewSuppBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">العنوان</label>
                <input
                  type="text"
                  placeholder="عنوان المورد..."
                  value={newSuppAddress}
                  onChange={(e) => setNewSuppAddress(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">ملاحظات</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول المورد..."
                  value={newSuppNotes}
                  onChange={(e) => setNewSuppNotes(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#afafaf]">
                <input
                  type="checkbox"
                  id="newSuppIsCustomerCheckbox"
                  checked={newSuppIsCustomer}
                  onChange={(e) => setNewSuppIsCustomer(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="newSuppIsCustomerCheckbox" className="font-bold text-[#222222] cursor-pointer text-xs select-none">
                  تسجيل كمورد وعميل في نفس الوقت (حساب مزدوج في العملاء)
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveSupplier}
                className="flex-1 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none text-xs border border-[#3f8055]"
              >
                {editingSupplier ? 'حفظ التعديلات' : 'حفظ المورد'}
              </button>
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] rounded-none text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 13: SUPPLIER STATEMENT MODAL --- */}
      {showSupplierStatementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-2xl w-full p-4 border border-[#afafaf] space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#243746]" />
                كشف حساب المورد: {selectedSupplierForStatement ? selectedSupplierForStatement.name : 'جميع الموردين'}
              </h3>
              <button onClick={() => setShowSupplierStatementModal(false)} className="p-0.5 text-[#666666] hover:text-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold">اختر المورد:</label>
              <select
                value={selectedSupplierForStatement?.id || ''}
                onChange={(e) => {
                  const s = suppliersList.find(supp => supp.id === e.target.value);
                  setSelectedSupplierForStatement(s || null);
                }}
                className="flex-1 px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] focus:outline-none focus:border-[#e8836a]"
              >
                <option value="">-- جميع الموردين --</option>
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (رصيد: {s.balance} ج.م)</option>
                ))}
              </select>
            </div>

            <div className="border border-[#afafaf] rounded-none bg-white max-h-72 overflow-y-auto text-xs">
              <table className="w-full text-right">
                <thead className="bg-[#e8e8e8] font-bold border-b border-[#afafaf]">
                  <tr>
                    <th className="p-1.5 border-l border-[#afafaf]">التاريخ</th>
                    <th className="p-1.5 border-l border-[#afafaf]">النوع / الحركة</th>
                    <th className="p-1.5 border-l border-[#afafaf]">البيان / الفاتورة</th>
                    <th className="p-1.5">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d0d0]">
                  {/* Purchase invoices matching supplier */}
                  {completedInvoices
                    .filter(inv => (inv.type === 'شراء' || inv.type === 'مرتجع شراء') &&
                      (!selectedSupplierForStatement || inv.supplierId === selectedSupplierForStatement.id || inv.customerName === selectedSupplierForStatement.name))
                    .map(inv => (
                      <tr key={inv.id} className="hover:bg-[#f0f0f0]">
                        <td className="p-1.5 font-mono text-[#666666] border-l border-[#d0d0d0]">{inv.date}</td>
                        <td className="p-1.5 font-bold text-[#243746] border-l border-[#d0d0d0]">{inv.type}</td>
                        <td className="p-1.5 font-mono border-l border-[#d0d0d0]">{inv.id} - {inv.customerName}</td>
                        <td className="p-1.5 font-mono font-bold text-[#b85c5c]">{inv.total} ج.م</td>
                      </tr>
                    ))}
                  {/* Vouchers matching supplier */}
                  {vouchersList
                    .filter(v => v.partyType === 'supplier' && (!selectedSupplierForStatement || v.partyId === selectedSupplierForStatement.id || v.name === selectedSupplierForStatement.name))
                    .map(v => (
                      <tr key={v.id} className="hover:bg-[#f0f0f0]">
                        <td className="p-1.5 font-mono text-[#666666] border-l border-[#d0d0d0]">{v.date}</td>
                        <td className="p-1.5 font-bold text-[#4f9d69] border-l border-[#d0d0d0]">سند {v.type}</td>
                        <td className="p-1.5 border-l border-[#d0d0d0]">{v.id} - {v.notes || v.name}</td>
                        <td className="p-1.5 font-mono font-bold text-[#4f9d69]">{v.amount} ج.م</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#afafaf] text-xs font-bold">
              <div>
                الرصيد النهائي المستحق: <span className="font-mono text-sm text-[#b85c5c]">{selectedSupplierForStatement ? selectedSupplierForStatement.balance : suppliersList.reduce((acc, s) => acc + s.balance, 0)} ج.م</span>
              </div>
              <button
                onClick={() => setShowSupplierStatementModal(false)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 14: SHIFT MANAGEMENT MODAL --- */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        activeShift={activeShift}
        allShifts={shiftsList}
        completedInvoices={completedInvoices}
        vouchersList={vouchersList}
        currentUser={currentUser}
        selectedBranch={selectedBranch}
        selectedDrawer={selectedDrawer}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        checkPermission={checkPermission}
      />

      {/* --- MODAL 15: MULTI-PAYMENT / SETTLEMENT MODAL --- */}
      <MultiPaymentModal
        isOpen={showMultiPaymentModal}
        onClose={() => setShowMultiPaymentModal(false)}
        grandTotal={grandTotal}
        currentPayments={currentPayments}
        treasuries={treasuriesList}
        banks={banksList}
        selectedDrawer={selectedDrawer}
        onSavePayments={(newPayments) => {
          setCurrentPayments(newPayments);
          const nonCredit = newPayments.filter(p => p.method !== 'آجل');
          const sumPaid = nonCredit.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          setPaid(sumPaid);
        }}
        invoiceType={activeTabGroup}
        partyName={(activeTabGroup === 'شراء' || activeTabGroup === 'مرتجع شراء') ? supplierName : customerName}
      />

      {/* --- MODAL 16: UNREASONABLE QUANTITY / PRICE CONFIRMATION MODAL --- */}
      {activeAnomalyWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 dir-rtl" dir="rtl">
          <div className="bg-[#f0f0f0] rounded-none max-w-md w-full p-4 border-2 border-[#e8836a] shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#afafaf] pb-2">
              <h3 className="font-bold text-sm text-[#b85c5c] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#e8836a]" />
                {activeAnomalyWarning.title}
              </h3>
              <button
                onClick={() => setActiveAnomalyWarning(null)}
                className="p-0.5 text-[#666666] hover:text-[#222222]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#fff9f8] border border-[#f5c6cb] text-xs text-[#222222] leading-relaxed">
              <p>{activeAnomalyWarning.message}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#afafaf] text-xs font-bold">
              <button
                onClick={() => {
                  setActiveAnomalyWarning(null);
                  itemNameInputRef.current?.focus();
                }}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] font-bold rounded-none"
              >
                تعديل القيمة
              </button>
              <button
                onClick={() => activeAnomalyWarning.onConfirm()}
                className="px-4 py-1.5 bg-[#e8836a] hover:bg-[#d67057] text-white font-bold border border-[#cc6850] rounded-none shadow-2xs"
              >
                تأكيد ومتابعة الإدراج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 17: UNIVERSAL SMART SEARCH MODAL --- */}
      <UniversalSmartSearchModal
        isOpen={showUniversalSearchModal}
        onClose={() => setShowUniversalSearchModal(false)}
        inventoryDb={inventoryDb}
        customersList={customersList}
        completedInvoices={completedInvoices}
        onSelectProduct={(product) => {
          if (mainViewMode === 'pos') {
            const adjustedPrice = product.price * priceMultipliers[selectedPriceLevel];
            addOrUpdateItem(product.name, product.category, adjustedPrice, product.code, product.serial);
          } else {
            setMainViewMode('stores');
          }
        }}
        onSelectCustomer={(customer) => {
          if (mainViewMode === 'pos') {
            setCustomerName(customer.name);
            setCustomerPhone(customer.phone || '');
          } else {
            setMainViewMode('balances');
            setActiveAccountsSubTab('عملاء');
          }
        }}
        onSelectInvoice={(invoice) => {
          setActiveSavedInvoiceView(invoice);
          setMainViewMode('invoices');
        }}
      />

    </div>
  );
}
