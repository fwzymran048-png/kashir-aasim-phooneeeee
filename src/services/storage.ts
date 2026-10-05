// IndexedDB Storage Layer for Project_y POS
// Provides persistent offline storage for all POS entities.

import {
  InventoryItem,
  MovementType,
  StockMovement,
  QuickProduct,
  Customer,
  Supplier,
  Voucher,
  InvoiceItem,
  SavedInvoice,
  AppSettings,
  PriceLevel,
  Permission,
  Role,
  User,
  AuditLog,
  AccountsSubTab,
  Cheque,
  ChequeType,
  ChequeStatus,
  Treasury,
  Bank,
  SpecialAccount,
  SpecialAccountType,
  OpenInvoiceSession,
  Shift,
  ShiftStatus,
  FinancialTransfer,
  TransferAccountType,
  TransferStatus
} from '../types/pos';

export type {
  InventoryItem,
  MovementType,
  StockMovement,
  QuickProduct,
  Customer,
  Supplier,
  Voucher,
  InvoiceItem,
  SavedInvoice,
  OpenInvoiceSession,
  AppSettings,
  PriceLevel,
  Permission,
  Role,
  User,
  AuditLog,
  AccountsSubTab,
  Cheque,
  ChequeType,
  ChequeStatus,
  Treasury,
  Bank,
  SpecialAccount,
  SpecialAccountType,
  Shift,
  ShiftStatus,
  FinancialTransfer,
  TransferAccountType,
  TransferStatus
};

const DB_NAME = 'ProjectY_POS_DB';
const DB_VERSION = 7;

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'ADMIN',
    name: 'مدير النظام',
    permissions: [
      'SALE_CREATE', 'SALE_EDIT', 'SALE_DELETE', 'SALE_RETURN',
      'PURCHASE_CREATE', 'PURCHASE_EDIT', 'PURCHASE_DELETE', 'PURCHASE_RETURN',
      'INVENTORY_VIEW', 'INVENTORY_ADJUST', 'INVENTORY_TRANSFER', 'INVENTORY_DAMAGE',
      'PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRICE_CHANGE',
      'CUSTOMER_VIEW', 'CUSTOMER_EDIT', 'SUPPLIER_VIEW', 'SUPPLIER_EDIT',
      'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'REPORTS_VIEW',
      'BACKUP', 'RESTORE', 'SETTINGS', 'USERS_MANAGE',
      'SHIFT_OPEN', 'SHIFT_CLOSE', 'SHIFT_VIEW'
    ]
  },
  {
    id: 'MANAGER',
    name: 'مدير فرع',
    permissions: [
      'SALE_CREATE', 'SALE_EDIT', 'SALE_DELETE', 'SALE_RETURN',
      'PURCHASE_CREATE', 'PURCHASE_EDIT', 'PURCHASE_DELETE', 'PURCHASE_RETURN',
      'INVENTORY_VIEW', 'INVENTORY_ADJUST', 'INVENTORY_TRANSFER', 'INVENTORY_DAMAGE',
      'PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRICE_CHANGE',
      'CUSTOMER_VIEW', 'CUSTOMER_EDIT', 'SUPPLIER_VIEW', 'SUPPLIER_EDIT',
      'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'REPORTS_VIEW',
      'BACKUP', 'SETTINGS',
      'SHIFT_OPEN', 'SHIFT_CLOSE', 'SHIFT_VIEW'
    ]
  },
  {
    id: 'CASHIER',
    name: 'كاشير',
    permissions: [
      'SALE_CREATE', 'SALE_RETURN', 'CUSTOMER_VIEW', 'INVENTORY_VIEW',
      'SHIFT_OPEN', 'SHIFT_CLOSE', 'SHIFT_VIEW'
    ]
  },
  {
    id: 'STOREKEEPER',
    name: 'أمين مخزن',
    permissions: [
      'INVENTORY_VIEW', 'INVENTORY_ADJUST', 'INVENTORY_TRANSFER', 'INVENTORY_DAMAGE',
      'PRODUCT_CREATE', 'PRODUCT_EDIT', 'SUPPLIER_VIEW'
    ]
  },
  {
    id: 'ACCOUNTANT',
    name: 'محاسب',
    permissions: [
      'REPORTS_VIEW', 'RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'CUSTOMER_VIEW', 'SUPPLIER_VIEW', 'INVENTORY_VIEW',
      'SHIFT_VIEW'
    ]
  }
];

export const DEFAULT_ADMIN_RECOVERY_CODE = 'RC-8842-9173';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    displayName: 'مدير النظام',
    roleId: 'ADMIN',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for 1234
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr-manager',
    username: 'manager',
    displayName: 'سعد المنصور (مدير الفرع)',
    roleId: 'MANAGER',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for 1234
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr-cashier',
    username: 'cashier',
    displayName: 'أحمد علي (كاشير)',
    roleId: 'CASHIER',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for 1234
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr-store',
    username: 'storekeeper',
    displayName: 'محمود حسن (أمين المخزن)',
    roleId: 'STOREKEEPER',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for 1234
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr-acc',
    username: 'accountant',
    displayName: 'سامي عبد الله (المحاسب)',
    roleId: 'ACCOUNTANT',
    passwordHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for 1234
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyUserPin(user: User, pin: string): Promise<boolean> {
  if (!user || !pin) return false;
  const pinHash = await hashPassword(pin);
  if (user.passwordHash === pinHash) return true;
  // Backward compatibility with previous seed hash for '123456'
  if (user.passwordHash === '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' && (pin === '1234' || pin === '123456')) {
    return true;
  }
  return false;
}

export async function dbGetAdminRecoveryCode(): Promise<string> {
  return await getSetting('adminRecoveryCode', DEFAULT_ADMIN_RECOVERY_CODE);
}

export async function dbSaveAdminRecoveryCode(code: string): Promise<void> {
  await saveSetting('adminRecoveryCode', code);
}

// Default Seed Data for First Run
export const DEFAULT_INVENTORY_DB: InventoryItem[] = [
  { code: '8841', name: 'شاشة ايفون تايب سي', category: 'شاشة', price: 250, costPrice: 180, wholesalePrice: 220, stock: 20, minStock: 5, listOrder: 1, listName: 'شاشات ورئسية' },
  { code: '3302', name: 'اسكرينة متنوعة X10', category: 'إكسسوارات', price: 35, costPrice: 15, wholesalePrice: 25, stock: 50, minStock: 10, listOrder: 2, listName: 'إكسسوارات عامة' },
  { code: '5011', name: 'شاشة سامسونج A52', category: 'شاشة', price: 320, costPrice: 240, wholesalePrice: 290, stock: 15, minStock: 5, listOrder: 3, listName: 'شاشات ورئسية' },
  { code: '1002', name: 'جراب هاوس A55', category: 'جراب', price: 60, costPrice: 30, wholesalePrice: 45, stock: 30, minStock: 8, listOrder: 4, listName: 'جرابات وهواتف' },
  { code: '7721', name: 'سماعة Xo هيدفون عالي', category: 'سماعة', price: 150, costPrice: 95, wholesalePrice: 125, stock: 25, minStock: 5, listOrder: 5, listName: 'صوتيات وسماعات' },
  { code: '9901', name: 'شاحن Vx الأصلي', category: 'شاحن', price: 45, costPrice: 22, wholesalePrice: 35, stock: 40, minStock: 10, listOrder: 6, listName: 'شواحن وكوابل' },
  { code: '4410', name: 'وصلة اوتو جي', category: 'وصلة', price: 20, costPrice: 8, wholesalePrice: 14, stock: 60, minStock: 15, listOrder: 7, listName: 'وصلات ومحولات' },
  { code: '6620', name: 'كابل ايفون تايب سي', category: 'كابل', price: 110, costPrice: 65, wholesalePrice: 90, stock: 35, minStock: 10, listOrder: 8, listName: 'شواحن وكوابل' }
];

export const DEFAULT_QUICK_PRODUCTS: QuickProduct[] = [
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
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  { id: '1', name: 'عميل نقدي', phone: '0000000000', balance: 0, notes: 'عميل افتراضي' },
  { id: '2', name: 'محمد أحمد المحمود', phone: '01012345678', balance: 450, notes: 'عميل جملة' },
  { id: '3', name: 'شركة السلام التجارية', phone: '01099887766', balance: 0, notes: 'عميل تجزئة' },
  { id: '4', name: 'مهندس خالد السعدي', phone: '01234567890', balance: 0, notes: 'صيانة دورية' },
  { id: '5', name: 'حودة جلالة', phone: '01012345678', balance: 0, notes: 'عميل منتظم' },
  { id: '6', name: 'حميدة الدرة', phone: '01122334455', balance: 70, notes: 'عميل مميز' },
  { id: '7', name: 'خالد شعيب', phone: '01233445566', balance: 0, notes: 'عميل كاشير' }
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'SUP-1', name: 'شركة البركة للإلكترونيات', phone: '01198765432', balance: 1200, notes: 'مورد معتمد للأجهزة والتطبيقات', address: 'القاهرة' },
  { id: 'SUP-2', name: 'مؤسسة النور للتوريدات', phone: '01055544332', balance: 0, notes: 'مورد إكسسوارات', address: 'الجيزة' },
  { id: 'SUP-3', name: 'شركة العالمية لقطع الغيار', phone: '01288877665', balance: 3500, notes: 'مورد قطع غيار وشاشات', address: 'طنطا' }
];

export const DEFAULT_VOUCHERS: Voucher[] = [
  { id: 'VCH-101', type: 'قبض', date: new Date().toLocaleDateString('ar-EG'), name: 'محمد أحمد المحمود', amount: 500, notes: 'دفعة حساب', drawer: 'الدرج الرئيسي', partyType: 'customer', partyId: '2' },
  { id: 'VCH-102', type: 'صرف', date: new Date().toLocaleDateString('ar-EG'), name: 'مصاريف ضيافة ونظافة', amount: 150, notes: 'نثرية محل', drawer: 'الدرج الرئيسي', partyType: 'general' }
];

export const DEFAULT_SETTINGS: AppSettings = {
  selectedBranch: 'عاصم فون - الفرع الرئيسي',
  selectedDrawer: 'الدرج الرئيسي',
  selectedPriceLevel: 'سعر1',
  showQuickProducts: true
};

export const DEFAULT_TREASURIES: Treasury[] = [
  { id: 'TREAS-01', code: 'TR-101', name: 'الدرج الرئيسي', openingBalance: 1000, active: true, notes: 'الدرج النقدي الرئيسي للكاشير' },
  { id: 'TREAS-02', code: 'TR-102', name: 'خزنة الكاش', openingBalance: 2500, active: true, notes: 'خزنة فرعية لحفظ السيولة' },
  { id: 'TREAS-03', code: 'TR-103', name: 'شباك 1', openingBalance: 500, active: true, notes: 'شباك بيع واستلام' }
];

export const DEFAULT_BANKS: Bank[] = [
  { id: 'BNK-01', code: 'BNK-101', name: 'البنك الأهلي التجاري', accountNumber: 'SA44 1000 0001 2345 6789 0100', IBAN: 'SA44 1000 0001 2345 6789 0100', openingBalance: 15000, active: true, notes: 'الحساب الجاري الرئيسي' },
  { id: 'BNK-02', code: 'BNK-102', name: 'مصرف الراجحي', accountNumber: 'SA88 8000 0002 9876 5432 0200', IBAN: 'SA88 8000 0002 9876 5432 0200', openingBalance: 8500, active: true, notes: 'حساب المدفوعات والموردين' },
  { id: 'BNK-03', code: 'BNK-103', name: 'حساب شبكة مدى ونقاط البيع', accountNumber: 'POS-TERMINAL-NET-01', openingBalance: 4200, active: true, notes: 'تحصيلات أجهزة نقاط البيع' },
  { id: 'BNK-04', code: 'BNK-104', name: 'حساب التحويلات البنكية السريعة', accountNumber: 'INSTANT-TRANSFER-01', openingBalance: 1000, active: true, notes: 'تحويلات العملاء الفورية' }
];

export const DEFAULT_SPECIAL_ACCOUNTS: SpecialAccount[] = [
  { id: 'DEBT-01', code: 'D-301', name: 'عهدة كاشير الفرع المؤقتة', type: 'DEBTOR', openingBalance: 1200, active: true, notes: 'عهدة نقدية للمشتريات العاجلة' },
  { id: 'DEBT-02', code: 'D-302', name: 'سلف ومستحقات الموظفين', type: 'DEBTOR', openingBalance: 850, active: true, notes: 'سلفيات عمل قابلة للاستقطاع' },
  { id: 'DEBT-03', code: 'D-303', name: 'جاري الشركاء (مدين)', type: 'DEBTOR', openingBalance: 4500, active: true, notes: 'مسحوبات شخصية للشركاء' },
  { id: 'DEBT-04', code: 'D-304', name: 'تأمينات مستردة لدى الغير', type: 'DEBTOR', openingBalance: 6000, active: true, notes: 'تأمين إيجار المحل والعدادات' },
  { id: 'DEBT-05', code: 'D-305', name: 'مصروفات تشغيل مدفوعة مقدماً', type: 'DEBTOR', openingBalance: 950, active: true, notes: 'تجديد اشتراكات وصيانة سنوية' },
  { id: 'CRED-01', code: 'C-401', name: 'جاري الشركاء (دائن)', type: 'CREDITOR', openingBalance: 25000, active: true, notes: 'تمويلات إضافية ورأس مال عامل' },
  { id: 'CRED-02', code: 'C-402', name: 'أمانات ومستحقات صيانة طرف الغير', type: 'CREDITOR', openingBalance: 1800, active: true, notes: 'أجهزة وتأمينات صيانة للعملاء' },
  { id: 'CRED-03', code: 'C-403', name: 'مصروفات والتزامات مستحقة الدفع', type: 'CREDITOR', openingBalance: 3200, active: true, notes: 'فواتير كهرباء وإيجارات تحت التسوية' },
  { id: 'CRED-04', code: 'C-404', name: 'قروض وتمويلات تشغيلية قصيرة', type: 'CREDITOR', openingBalance: 10000, active: true, notes: 'تمويل تشغيلي مستحق السداد' }
];

export const DEFAULT_CHEQUES: Cheque[] = [
  {
    id: 'CHK-9001',
    chequeNumber: '10048291',
    type: 'وارد',
    bankName: 'البنك الأهلي التجاري',
    dueDate: '2026/08/30',
    issueDate: '2026/07/15',
    partyName: 'شركة السلام التجارية',
    partyType: 'customer',
    amount: 3500,
    status: 'تحت التحصيل',
    createdByName: 'مدير النظام',
    notes: 'دفعة سداد فاتورة رقم 102'
  },
  {
    id: 'CHK-9002',
    chequeNumber: '44819022',
    type: 'صادر',
    bankName: 'مصرف الراجحي',
    dueDate: '2026/09/05',
    issueDate: '2026/07/20',
    partyName: 'شركة البركة للإلكترونيات',
    partyType: 'supplier',
    amount: 6000,
    status: 'تحت التحصيل',
    createdByName: 'مدير النظام',
    notes: 'شيك مؤجل مقابل طلبية شاشات'
  },
  {
    id: 'CHK-9003',
    chequeNumber: '77219034',
    type: 'وارد',
    bankName: 'بنك الرياض',
    dueDate: '2026/07/25',
    issueDate: '2026/07/01',
    partyName: 'محمد أحمد المحمود',
    partyType: 'customer',
    amount: 1500,
    status: 'محصل',
    createdByName: 'أحمد علي (كاشير)',
    notes: 'تم التحصيل وإيداعه في الخزنة'
  },
  {
    id: 'CHK-9004',
    chequeNumber: '33109482',
    type: 'وارد',
    bankName: 'بنك القاهرة',
    dueDate: '2026/07/10',
    issueDate: '2026/06/28',
    partyName: 'مهندس خالد السعدي',
    partyType: 'customer',
    amount: 800,
    status: 'مرتد',
    createdByName: 'مدير النظام',
    notes: 'شيك مرتد لعدم كفاية الرصيد'
  }
];

// Open database connection
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('inventoryDb')) {
        db.createObjectStore('inventoryDb', { keyPath: 'code' });
      }
      if (!db.objectStoreNames.contains('quickProducts')) {
        db.createObjectStore('quickProducts', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('customersList')) {
        db.createObjectStore('customersList', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vouchersList')) {
        db.createObjectStore('vouchersList', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('completedInvoices')) {
        db.createObjectStore('completedInvoices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('heldInvoices')) {
        db.createObjectStore('heldInvoices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stockMovements')) {
        db.createObjectStore('stockMovements', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('roles')) {
        db.createObjectStore('roles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('auditLogs')) {
        db.createObjectStore('auditLogs', { keyPath: 'id' });
      }
      // New persistent stores for accounts
      if (!db.objectStoreNames.contains('cheques')) {
        db.createObjectStore('cheques', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('treasuries')) {
        db.createObjectStore('treasuries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('banks')) {
        db.createObjectStore('banks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('specialAccounts')) {
        db.createObjectStore('specialAccounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('shifts')) {
        db.createObjectStore('shifts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('financialTransfers')) {
        db.createObjectStore('financialTransfers', { keyPath: 'id' });
      }
    };
  });
}

// Generic helper to get all items from an object store
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error reading from store ${storeName}:`, err);
    return [];
  }
}

// Generic helper to replace/set entire store array
async function saveAllToStore<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Error saving to store ${storeName}:`, err);
  }
}

// Generic helper to save or update a single item in an object store
async function saveOneToStore<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Error saving item to store ${storeName}:`, err);
  }
}

// Generic helper to delete an item by key from an object store
async function deleteOneFromStore(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Error deleting item from store ${storeName}:`, err);
  }
}

// Generic helper to save a single setting
async function saveSetting(key: string, value: any): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Error saving setting ${key}:`, err);
  }
}

// Helper to load setting
async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

// Main API functions for App.tsx

export async function loadAppData() {
  try {
    let inventory = await getAllFromStore<InventoryItem>('inventoryDb');
    let quick = await getAllFromStore<QuickProduct>('quickProducts');
    let customers = await getAllFromStore<Customer>('customersList');
    let suppliers = await getAllFromStore<Supplier>('suppliers');
    let vouchers = await getAllFromStore<Voucher>('vouchersList');
    let completed = await getAllFromStore<SavedInvoice>('completedInvoices');
    let held = await getAllFromStore<SavedInvoice>('heldInvoices');
    let stockMovements = await getAllFromStore<StockMovement>('stockMovements');
    let users = await getAllFromStore<User>('users');
    let roles = await getAllFromStore<Role>('roles');
    let auditLogs = await getAllFromStore<AuditLog>('auditLogs');
    let treasuries = await getAllFromStore<Treasury>('treasuries');
    let banks = await getAllFromStore<Bank>('banks');
    let specialAccounts = await getAllFromStore<SpecialAccount>('specialAccounts');
    let cheques = await getAllFromStore<Cheque>('cheques');
    let shifts = await getAllFromStore<Shift>('shifts');
    let financialTransfers = await getAllFromStore<FinancialTransfer>('financialTransfers');

    // Seed database if empty on first run
    if (inventory.length === 0) {
      inventory = DEFAULT_INVENTORY_DB;
      await saveAllToStore('inventoryDb', inventory);
    } else {
      // Ensure all inventory items have stock set
      inventory = inventory.map(item => ({ ...item, stock: item.stock ?? 50 }));
    }
    if (quick.length === 0) {
      quick = DEFAULT_QUICK_PRODUCTS;
      await saveAllToStore('quickProducts', quick);
    }
    if (customers.length === 0) {
      customers = DEFAULT_CUSTOMERS;
      await saveAllToStore('customersList', customers);
    }
    if (suppliers.length === 0) {
      suppliers = DEFAULT_SUPPLIERS;
      await saveAllToStore('suppliers', suppliers);
    }
    if (vouchers.length === 0) {
      vouchers = DEFAULT_VOUCHERS;
      await saveAllToStore('vouchersList', vouchers);
    }
    if (roles.length === 0) {
      roles = DEFAULT_ROLES;
      await saveAllToStore('roles', roles);
    }
    if (users.length === 0) {
      users = DEFAULT_USERS;
      await saveAllToStore('users', users);
    }
    if (treasuries.length === 0) {
      treasuries = DEFAULT_TREASURIES;
      await saveAllToStore('treasuries', treasuries);
    }
    if (banks.length === 0) {
      banks = DEFAULT_BANKS;
      await saveAllToStore('banks', banks);
    }
    if (specialAccounts.length === 0) {
      specialAccounts = DEFAULT_SPECIAL_ACCOUNTS;
      await saveAllToStore('specialAccounts', specialAccounts);
    }
    if (cheques.length === 0) {
      cheques = DEFAULT_CHEQUES;
      await saveAllToStore('cheques', cheques);
    }

    const selectedBranch = await getSetting('selectedBranch', DEFAULT_SETTINGS.selectedBranch);
    const selectedDrawer = await getSetting('selectedDrawer', DEFAULT_SETTINGS.selectedDrawer);
    const selectedPriceLevel = await getSetting('selectedPriceLevel', DEFAULT_SETTINGS.selectedPriceLevel);
    const showQuickProducts = await getSetting('showQuickProducts', DEFAULT_SETTINGS.showQuickProducts);
    const openInvoiceDraft = await getSetting<OpenInvoiceDraftData | null>('openInvoiceDraft', null);

    return {
      inventoryDb: inventory,
      quickProducts: quick,
      customersList: customers,
      suppliersList: suppliers,
      vouchersList: vouchers,
      completedInvoices: completed,
      heldInvoices: held,
      stockMovements,
      users,
      roles,
      auditLogs,
      treasuries,
      banks,
      specialAccounts,
      cheques,
      shifts,
      financialTransfers,
      openInvoiceDraft,
      settings: {
        selectedBranch,
        selectedDrawer,
        selectedPriceLevel,
        showQuickProducts
      }
    };
  } catch (err) {
    console.error('Failed to load app data from IndexedDB:', err);
    return {
      inventoryDb: DEFAULT_INVENTORY_DB,
      quickProducts: DEFAULT_QUICK_PRODUCTS,
      customersList: DEFAULT_CUSTOMERS,
      suppliersList: DEFAULT_SUPPLIERS,
      vouchersList: DEFAULT_VOUCHERS,
      completedInvoices: [],
      heldInvoices: [],
      stockMovements: [],
      users: DEFAULT_USERS,
      roles: DEFAULT_ROLES,
      auditLogs: [],
      treasuries: DEFAULT_TREASURIES,
      banks: DEFAULT_BANKS,
      specialAccounts: DEFAULT_SPECIAL_ACCOUNTS,
      cheques: DEFAULT_CHEQUES,
      shifts: [],
      financialTransfers: [],
      openInvoiceDraft: null,
      settings: DEFAULT_SETTINGS
    };
  }
}

export interface OpenInvoiceDraftData {
  openInvoices: OpenInvoiceSession[];
  activeOpenInvoiceId: string;
}

export async function dbSaveOpenInvoiceDraft(draft: OpenInvoiceDraftData | null): Promise<void> {
  await saveSetting('openInvoiceDraft', draft);
}

export async function dbGetOpenInvoiceDraft(): Promise<OpenInvoiceDraftData | null> {
  return await getSetting<OpenInvoiceDraftData | null>('openInvoiceDraft', null);
}

export async function dbClearOpenInvoiceDraft(): Promise<void> {
  await saveSetting('openInvoiceDraft', null);
}

export async function dbSaveInventory(items: InventoryItem[]): Promise<void> {
  await saveAllToStore('inventoryDb', items);
}

export async function dbSaveQuickProducts(items: QuickProduct[]): Promise<void> {
  await saveAllToStore('quickProducts', items);
}

export async function dbSaveCustomers(items: Customer[]): Promise<void> {
  await saveAllToStore('customersList', items);
}

export async function dbSaveSuppliers(items: Supplier[]): Promise<void> {
  await saveAllToStore('suppliers', items);
}

export async function dbSaveVouchers(items: Voucher[]): Promise<void> {
  await saveAllToStore('vouchersList', items);
}

export async function dbSaveCompletedInvoices(items: SavedInvoice[]): Promise<void> {
  await saveAllToStore('completedInvoices', items);
}

export async function dbSaveHeldInvoices(items: SavedInvoice[]): Promise<void> {
  await saveAllToStore('heldInvoices', items);
}

export async function dbGetStockMovements(): Promise<StockMovement[]> {
  return await getAllFromStore<StockMovement>('stockMovements');
}

export async function dbSaveStockMovements(items: StockMovement[]): Promise<void> {
  await saveAllToStore('stockMovements', items);
}

export async function dbSaveSetting(key: string, value: any): Promise<void> {
  await saveSetting(key, value);
}

export async function dbGetUsers(): Promise<User[]> {
  const users = await getAllFromStore<User>('users');
  if (users.length === 0) {
    await saveAllToStore('users', DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  return users;
}

export async function dbSaveUsers(items: User[]): Promise<void> {
  await saveAllToStore('users', items);
}

export async function dbGetRoles(): Promise<Role[]> {
  const roles = await getAllFromStore<Role>('roles');
  if (roles.length === 0) {
    await saveAllToStore('roles', DEFAULT_ROLES);
    return DEFAULT_ROLES;
  }
  return roles;
}

export async function dbSaveRoles(items: Role[]): Promise<void> {
  await saveAllToStore('roles', items);
}

export async function dbGetAuditLogs(): Promise<AuditLog[]> {
  return await getAllFromStore<AuditLog>('auditLogs');
}

export async function dbAddAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const fullLog: AuditLog = {
      ...log,
      id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString('ar-EG')
    };
    const db = await openDatabase();
    const tx = db.transaction('auditLogs', 'readwrite');
    const store = tx.objectStore('auditLogs');
    store.put(fullLog);
  } catch (err) {
    console.error('Failed to add audit log:', err);
  }
}

export async function dbGetCheques(): Promise<Cheque[]> {
  const items = await getAllFromStore<Cheque>('cheques');
  if (items.length === 0) {
    await saveAllToStore('cheques', DEFAULT_CHEQUES);
    return DEFAULT_CHEQUES;
  }
  return items;
}

export async function dbSaveCheques(items: Cheque[]): Promise<void> {
  await saveAllToStore('cheques', items);
}

export async function dbSaveCheque(item: Cheque): Promise<void> {
  await saveOneToStore('cheques', item);
}

export async function dbUpdateCheque(item: Cheque): Promise<void> {
  await saveOneToStore('cheques', item);
}

export async function dbDeleteCheque(id: string): Promise<void> {
  await deleteOneFromStore('cheques', id);
}

export async function dbGetTreasuries(): Promise<Treasury[]> {
  const items = await getAllFromStore<Treasury>('treasuries');
  if (items.length === 0) {
    await saveAllToStore('treasuries', DEFAULT_TREASURIES);
    return DEFAULT_TREASURIES;
  }
  return items;
}

export async function dbSaveTreasuries(items: Treasury[]): Promise<void> {
  await saveAllToStore('treasuries', items);
}

export async function dbSaveTreasury(item: Treasury): Promise<void> {
  await saveOneToStore('treasuries', item);
}

export async function dbUpdateTreasury(item: Treasury): Promise<void> {
  await saveOneToStore('treasuries', item);
}

export async function dbDeleteTreasury(id: string): Promise<void> {
  await deleteOneFromStore('treasuries', id);
}

export async function dbGetBanks(): Promise<Bank[]> {
  const items = await getAllFromStore<Bank>('banks');
  if (items.length === 0) {
    await saveAllToStore('banks', DEFAULT_BANKS);
    return DEFAULT_BANKS;
  }
  return items;
}

export async function dbSaveBanks(items: Bank[]): Promise<void> {
  await saveAllToStore('banks', items);
}

export async function dbSaveBank(item: Bank): Promise<void> {
  await saveOneToStore('banks', item);
}

export async function dbUpdateBank(item: Bank): Promise<void> {
  await saveOneToStore('banks', item);
}

export async function dbDeleteBank(id: string): Promise<void> {
  await deleteOneFromStore('banks', id);
}

export async function dbGetSpecialAccounts(): Promise<SpecialAccount[]> {
  const items = await getAllFromStore<SpecialAccount>('specialAccounts');
  if (items.length === 0) {
    await saveAllToStore('specialAccounts', DEFAULT_SPECIAL_ACCOUNTS);
    return DEFAULT_SPECIAL_ACCOUNTS;
  }
  return items;
}

export async function dbSaveSpecialAccounts(items: SpecialAccount[]): Promise<void> {
  await saveAllToStore('specialAccounts', items);
}

export async function dbSaveSpecialAccount(item: SpecialAccount): Promise<void> {
  await saveOneToStore('specialAccounts', item);
}

export async function dbUpdateSpecialAccount(item: SpecialAccount): Promise<void> {
  await saveOneToStore('specialAccounts', item);
}

export async function dbDeleteSpecialAccount(id: string): Promise<void> {
  await deleteOneFromStore('specialAccounts', id);
}

// Shifts Persistent Storage
export async function dbGetShifts(): Promise<Shift[]> {
  return await getAllFromStore<Shift>('shifts');
}

export async function dbSaveShifts(items: Shift[]): Promise<void> {
  await saveAllToStore('shifts', items);
}

export async function dbSaveShift(item: Shift): Promise<void> {
  await saveOneToStore('shifts', item);
}

export async function dbUpdateShift(item: Shift): Promise<void> {
  await saveOneToStore('shifts', item);
}

export async function dbDeleteShift(id: string): Promise<void> {
  await deleteOneFromStore('shifts', id);
}

// Financial Transfers Persistent Storage
export async function dbGetFinancialTransfers(): Promise<FinancialTransfer[]> {
  return await getAllFromStore<FinancialTransfer>('financialTransfers');
}

export async function dbSaveFinancialTransfers(items: FinancialTransfer[]): Promise<void> {
  await saveAllToStore('financialTransfers', items);
}

export async function dbSaveFinancialTransfer(item: FinancialTransfer): Promise<void> {
  await saveOneToStore('financialTransfers', item);
}

export async function dbDeleteFinancialTransfer(id: string): Promise<void> {
  await deleteOneFromStore('financialTransfers', id);
}

export async function dbRestoreAll(backup: {
  inventoryDb?: InventoryItem[];
  quickProducts?: QuickProduct[];
  customersList?: Customer[];
  suppliersList?: Supplier[];
  vouchersList?: Voucher[];
  completedInvoices?: SavedInvoice[];
  heldInvoices?: SavedInvoice[];
  stockMovements?: StockMovement[];
  users?: User[];
  roles?: Role[];
  auditLogs?: AuditLog[];
  treasuries?: Treasury[];
  banks?: Bank[];
  specialAccounts?: SpecialAccount[];
  cheques?: Cheque[];
  shifts?: Shift[];
  financialTransfers?: FinancialTransfer[];
  settings?: Partial<AppSettings>;
  branch?: string;
  drawer?: string;
}): Promise<void> {
  if (backup.inventoryDb) await saveAllToStore('inventoryDb', backup.inventoryDb);
  if (backup.quickProducts) await saveAllToStore('quickProducts', backup.quickProducts);
  if (backup.customersList) await saveAllToStore('customersList', backup.customersList);
  if (backup.suppliersList) await saveAllToStore('suppliers', backup.suppliersList);
  else if ((backup as any).suppliers) await saveAllToStore('suppliers', (backup as any).suppliers);
  if (backup.vouchersList) await saveAllToStore('vouchersList', backup.vouchersList);
  if (backup.completedInvoices) await saveAllToStore('completedInvoices', backup.completedInvoices);
  if (backup.heldInvoices) await saveAllToStore('heldInvoices', backup.heldInvoices);
  if (backup.stockMovements) await saveAllToStore('stockMovements', backup.stockMovements);
  if (backup.users) await saveAllToStore('users', backup.users);
  if (backup.roles) await saveAllToStore('roles', backup.roles);
  if (backup.auditLogs) await saveAllToStore('auditLogs', backup.auditLogs);
  if (backup.treasuries) await saveAllToStore('treasuries', backup.treasuries);
  if (backup.banks) await saveAllToStore('banks', backup.banks);
  if (backup.specialAccounts) await saveAllToStore('specialAccounts', backup.specialAccounts);
  if (backup.cheques) await saveAllToStore('cheques', backup.cheques);
  if (backup.shifts) await saveAllToStore('shifts', backup.shifts);
  if (backup.financialTransfers) await saveAllToStore('financialTransfers', backup.financialTransfers);
  if (backup.branch) await saveSetting('selectedBranch', backup.branch);
  if (backup.drawer) await saveSetting('selectedDrawer', backup.drawer);
  if (backup.settings) {
    if (backup.settings.selectedBranch) await saveSetting('selectedBranch', backup.settings.selectedBranch);
    if (backup.settings.selectedDrawer) await saveSetting('selectedDrawer', backup.settings.selectedDrawer);
    if (backup.settings.selectedPriceLevel) await saveSetting('selectedPriceLevel', backup.settings.selectedPriceLevel);
    if (backup.settings.showQuickProducts !== undefined) await saveSetting('showQuickProducts', backup.settings.showQuickProducts);
  }
}

export function processStockMovementForInvoice(
  invoice: SavedInvoice,
  currentInventory: InventoryItem[],
  existingMovements: StockMovement[]
): {
  success: boolean;
  updatedInventory: InventoryItem[];
  newMovements: StockMovement[];
  alreadyProcessed?: boolean;
  error?: string;
} {
  // Prevent duplicate execution for the same referenceId (invoice.id)
  const alreadyProcessed = existingMovements.some(m => m.referenceId === invoice.id);
  if (alreadyProcessed) {
    return {
      success: true,
      updatedInventory: currentInventory,
      newMovements: [],
      alreadyProcessed: true
    };
  }

  let movementType: MovementType = 'SALE';
  let multiplier = -1;

  switch (invoice.type) {
    case 'بيع':
      movementType = 'SALE';
      multiplier = -1;
      break;
    case 'شراء':
      movementType = 'PURCHASE';
      multiplier = 1;
      break;
    case 'مرتجع بيع':
      movementType = 'SALE_RETURN';
      multiplier = 1;
      break;
    case 'مرتجع شراء':
      movementType = 'PURCHASE_RETURN';
      multiplier = -1;
      break;
    case 'نقل':
      movementType = 'TRANSFER_OUT';
      multiplier = -1;
      break;
    case 'تالف':
      movementType = 'DAMAGE';
      multiplier = -1;
      break;
    case 'تسوية':
      movementType = 'ADJUSTMENT';
      multiplier = 1;
      break;
  }

  // Prevent negative stock for stock-deducting operations
  if (multiplier < 0) {
    for (const item of invoice.items) {
      const invItem = currentInventory.find(
        i => (item.code && i.code === item.code) || i.name.trim() === item.name.trim()
      );
      const availableStock = invItem ? (invItem.stock ?? 0) : 0;
      if (availableStock < item.quantity) {
        return {
          success: false,
          updatedInventory: currentInventory,
          newMovements: [],
          error: `عذراً، الكمية غير متوفرة في المخزون للمنتج "${item.name}". المتاح حالياً: ${availableStock}، والكمية المطلوبة: ${item.quantity}.`
        };
      }
    }
  }

  // Calculate new inventory & generate stock movement records
  const inventoryClone: InventoryItem[] = currentInventory.map(i => ({ ...i, stock: i.stock ?? 0 }));
  const createdMovements: StockMovement[] = [];
  const nowStr = invoice.date + ' ' + (invoice.time || '');

  for (const item of invoice.items) {
    let invItem = inventoryClone.find(
      i => (item.code && i.code === item.code) || i.name.trim() === item.name.trim()
    );

    if (!invItem) {
      invItem = {
        code: item.code || Math.floor(1000 + Math.random() * 9000).toString(),
        name: item.name,
        category: item.category || 'عام',
        price: item.price,
        stock: 0
      };
      inventoryClone.push(invItem);
    }

    const oldStock = invItem.stock ?? 0;
    let delta = item.quantity * multiplier;

    if (invoice.type === 'تسوية') {
      // In Adjustment, item.quantity is the target actual count
      delta = item.quantity - oldStock;
      invItem.stock = item.quantity;
    } else {
      invItem.stock = Math.max(0, oldStock + delta);
    }

    if (invoice.type === 'شراء') {
      if (item.costPrice !== undefined || item.price !== undefined) {
        invItem.costPrice = item.costPrice !== undefined ? item.costPrice : item.price;
      }
      if (item.serialNumber) {
        const existingSerials = (invItem.serial || '')
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
        const newSerials = item.serialNumber
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
        const combined = Array.from(new Set([...existingSerials, ...newSerials]));
        invItem.serial = combined.join('\n');
      }
    } else if (invoice.type === 'بيع' || invoice.type === 'مرتجع شراء') {
      if (item.serialNumber && invItem.serial) {
        const toRemove = new Set(
          item.serialNumber
            .split(/[\n,;]+/)
            .map(s => s.trim().toLowerCase())
            .filter(Boolean)
        );
        const currentSerials = invItem.serial
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
        const remaining = currentSerials.filter(s => !toRemove.has(s.toLowerCase()));
        invItem.serial = remaining.join('\n');
      }
    } else if (invoice.type === 'مرتجع بيع') {
      if (item.serialNumber) {
        const existingSerials = (invItem.serial || '')
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
        const returnedSerials = item.serialNumber
          .split(/[\n,;]+/)
          .map(s => s.trim())
          .filter(Boolean);
        const combined = Array.from(new Set([...existingSerials, ...returnedSerials]));
        invItem.serial = combined.join('\n');
      }
    }

    const movement: StockMovement = {
      id: 'SM-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      productCode: invItem.code,
      productName: invItem.name,
      quantity: delta,
      movementType,
      date: nowStr,
      referenceId: invoice.id,
      notes: `عملية ${invoice.type} - فاتورة رقم ${invoice.id}`
    };
    createdMovements.push(movement);
  }

  return {
    success: true,
    updatedInventory: inventoryClone,
    newMovements: createdMovements
  };
}

// Atomic Multi-Store Transaction for Completing Invoices
export async function dbCompleteInvoiceTransaction(params: {
  allCompletedInvoices: SavedInvoice[];
  updatedInventory: InventoryItem[];
  allStockMovements: StockMovement[];
  updatedCustomers?: Customer[];
  updatedSuppliers?: Supplier[];
}): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const storesToLock = ['completedInvoices', 'inventoryDb', 'stockMovements'];
      if (params.updatedCustomers) storesToLock.push('customersList');
      if (params.updatedSuppliers) storesToLock.push('suppliers');

      const tx = db.transaction(storesToLock, 'readwrite');

      const invStore = tx.objectStore('completedInvoices');
      invStore.clear();
      for (const inv of params.allCompletedInvoices) {
        invStore.put(inv);
      }

      const stockStore = tx.objectStore('inventoryDb');
      stockStore.clear();
      for (const item of params.updatedInventory) {
        stockStore.put(item);
      }

      const movStore = tx.objectStore('stockMovements');
      movStore.clear();
      for (const mov of params.allStockMovements) {
        movStore.put(mov);
      }

      if (params.updatedCustomers) {
        const custStore = tx.objectStore('customersList');
        custStore.clear();
        for (const cust of params.updatedCustomers) {
          custStore.put(cust);
        }
      }

      if (params.updatedSuppliers) {
        const suppStore = tx.objectStore('suppliers');
        suppStore.clear();
        for (const supp of params.updatedSuppliers) {
          suppStore.put(supp);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch (err) {
    console.error('Error executing dbCompleteInvoiceTransaction:', err);
    throw err;
  }
}
