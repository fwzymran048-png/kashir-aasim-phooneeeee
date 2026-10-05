// Centralized Type Definitions for Project_y POS

export interface InventoryItem {
  code: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number;
  stock?: number;
  minStock?: number;
  listOrder?: number;
  listName?: string;
  serial?: string;
}

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'DAMAGE'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  movementType: MovementType;
  date: string;
  referenceId: string;
  warehouseId?: string;
  notes?: string;
}

export interface QuickProduct {
  key: string;
  name: string;
  category: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  notes?: string;
  isSupplier?: boolean;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
  notes?: string;
  address?: string;
  isCustomer?: boolean;
  customerId?: string;
}

export interface Voucher {
  id: string;
  type: 'قبض' | 'صرف';
  date: string;
  time?: string;
  name: string;
  amount: number;
  notes: string;
  drawer: string;
  branch?: string;
  partyType?: 'customer' | 'supplier' | 'general' | 'expense' | 'revenue' | 'employee' | 'other';
  partyId?: string;
  category?: string;
  referenceNumber?: string;
  userId?: string;
  createdByName?: string;
  shiftId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  code?: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  costPrice?: number;
  total: number;
  serialNumber?: string;
  notes?: string;
  selected?: boolean;
}

export type PaymentMethod = 'نقد' | 'شبكة / بطاقة' | 'تحويل بنكي' | 'آجل';

export interface InvoicePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  targetId?: string;
  targetName?: string;
  reference?: string;
  notes?: string;
}

export interface SavedInvoice {
  id: string;
  date: string;
  time: string;
  type: 'بيع' | 'شراء' | 'مرتجع بيع' | 'مرتجع شراء' | 'نقل' | 'تالف' | 'تسوية';
  customerName: string;
  customerPhone: string;
  supplierId?: string;
  supplierName?: string;
  items: InvoiceItem[];
  total: number;
  discount: number;
  tax: number;
  paid: number;
  remaining: number;
  branch: string;
  drawer: string;
  status: 'مدفوعة' | 'مؤجلة' | 'جزئي';
  userId?: string;
  createdByName?: string;
  shiftId?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  payments?: InvoicePayment[];
}

export interface OpenInvoiceSession {
  id: string;
  sessionName: string;
  type: TabGroupType;
  customerName: string;
  customerPhone: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  counterpartyRole?: 'customer' | 'supplier';
  selectedPriceLevel: PriceLevel;
  selectedBranch: string;
  selectedDrawer: string;
  items: InvoiceItem[];
  discount: number;
  tax: number;
  paid: number;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  payments?: InvoicePayment[];
}

export interface AppSettings {
  selectedBranch: string;
  selectedDrawer: string;
  selectedPriceLevel: PriceLevel;
  showQuickProducts: boolean;
}

export type PriceLevel = 'سعر1' | 'سعر2' | 'سعر3' | 'سعر4';

export type TabGroupType = 'بيع' | 'شراء' | 'مرتجع بيع' | 'مرتجع شراء' | 'نقل' | 'تالف' | 'تسوية';

export type AccountsSubTab =
  | 'عملاء'
  | 'موردين'
  | 'موظفين'
  | 'خزن'
  | 'بنوك'
  | 'خاص مدين'
  | 'خاص دائن'
  | 'شيكات'
  | 'مصروفات'
  | 'إيرادات';

export type MainViewMode = 'pos' | 'stores' | 'reports' | 'invoices' | 'balances' | 'suppliers';

export type Permission =
  | 'SALE_CREATE'
  | 'SALE_EDIT'
  | 'SALE_DELETE'
  | 'SALE_RETURN'
  | 'PURCHASE_CREATE'
  | 'PURCHASE_EDIT'
  | 'PURCHASE_DELETE'
  | 'PURCHASE_RETURN'
  | 'INVENTORY_VIEW'
  | 'INVENTORY_ADJUST'
  | 'INVENTORY_TRANSFER'
  | 'INVENTORY_DAMAGE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_EDIT'
  | 'PRODUCT_DELETE'
  | 'PRICE_CHANGE'
  | 'CUSTOMER_VIEW'
  | 'CUSTOMER_EDIT'
  | 'SUPPLIER_VIEW'
  | 'SUPPLIER_EDIT'
  | 'RECEIPT_VOUCHER'
  | 'PAYMENT_VOUCHER'
  | 'EXPENSE_MANAGE'
  | 'REVENUE_MANAGE'
  | 'REPORTS_VIEW'
  | 'BACKUP'
  | 'RESTORE'
  | 'SETTINGS'
  | 'USERS_MANAGE'
  | 'SHIFT_OPEN'
  | 'SHIFT_CLOSE'
  | 'SHIFT_VIEW';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  roleId: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
}

export type ChequeType = 'INCOMING' | 'OUTGOING' | 'وارد' | 'صادر';
export type ChequeStatus = 'UNDER_COLLECTION' | 'COLLECTED' | 'RETURNED' | 'CANCELLED' | 'تحت التحصيل' | 'محصل' | 'مرتد' | 'ملغي';

export interface Cheque {
  id: string;
  chequeNumber: string;
  type: ChequeType;
  bankName: string;
  bankAccount?: string;
  drawerId?: string;
  accountId?: string;
  issueDate: string;
  dueDate: string;
  drawerDate?: string;
  partyName: string;
  partyId?: string;
  partyType?: 'customer' | 'supplier' | 'employee' | 'other' | 'عميل' | 'مورد' | 'موظف' | 'أخرى';
  amount: number;
  status: ChequeStatus;
  notes?: string;
  userId?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Treasury {
  id: string;
  code: string;
  name: string;
  branchId?: string;
  openingBalance: number;
  active: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  accountNumber: string;
  IBAN?: string;
  branchId?: string;
  openingBalance: number;
  active: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SpecialAccountType = 'DEBTOR' | 'CREDITOR' | 'خاص مدين' | 'خاص دائن';

export interface SpecialAccount {
  id: string;
  code: string;
  name: string;
  type: 'DEBTOR' | 'CREDITOR';
  openingBalance: number;
  branchId?: string;
  active: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  totalSales: number;
  totalPurchases: number;
  totalSalesReturns: number;
  totalPurchaseReturns: number;
  totalExpenses: number;
  totalCashIn: number;
  totalCashOut: number;
  invoiceCount: number;
  status: ShiftStatus;
  notes?: string;
  drawer?: string;
  branch?: string;
}

export type TransferAccountType = 'treasury' | 'bank' | 'خزينة' | 'بنك';
export type TransferStatus = 'COMPLETED' | 'CANCELLED';

export interface FinancialTransfer {
  id: string;
  transferNumber: string;
  date: string;
  time: string;
  sourceType: 'treasury' | 'bank';
  sourceId: string;
  sourceName: string;
  destinationType: 'treasury' | 'bank';
  destinationId: string;
  destinationName: string;
  amount: number;
  notes?: string;
  referenceNumber?: string;
  userId?: string;
  createdByName?: string;
  shiftId?: string;
  createdAt?: string;
  status: TransferStatus;
  outVoucherId?: string;
  inVoucherId?: string;
}

