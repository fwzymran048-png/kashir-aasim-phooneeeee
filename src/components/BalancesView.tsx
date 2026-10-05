import React, { useState, useMemo, useEffect } from 'react';
import {
  Customer,
  Supplier,
  Voucher,
  SavedInvoice,
  User,
  Role,
  AccountsSubTab,
  Treasury,
  Bank,
  SpecialAccount,
  Cheque,
  ChequeStatus,
  ChequeType,
  Shift,
  FinancialTransfer,
  dbGetTreasuries,
  dbSaveTreasury,
  dbDeleteTreasury,
  dbGetBanks,
  dbSaveBank,
  dbDeleteBank,
  dbGetSpecialAccounts,
  dbSaveSpecialAccount,
  dbDeleteSpecialAccount,
  dbGetCheques,
  dbSaveCheque,
  dbDeleteCheque,
  dbSaveVouchers,
  dbSaveFinancialTransfer,
  dbAddAuditLog
} from '../services/storage';
import ExpenseRevenueModal, { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from './accounts/ExpenseRevenueModal';
import FinancialTransferModal from './accounts/FinancialTransferModal';
import AccountStatementView from './accounts/AccountStatementView';
import AccountQuickOperationsDropdown from './accounts/AccountQuickOperationsDropdown';
import { buildAccountStatement, AccountType } from '../services/financialLedgerEngine';
import {
  Scale,
  Search,
  Download,
  Printer,
  Plus,
  CreditCard,
  DollarSign,
  Wallet,
  Users,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  UserCheck,
  Receipt,
  FileSpreadsheet,
  Edit,
  Edit2,
  Trash2,
  Check,
  Ban,
  Truck
} from 'lucide-react';
import TreasuryModal from './accounts/TreasuryModal';
import BankModal from './accounts/BankModal';
import SpecialAccountModal from './accounts/SpecialAccountModal';
import ChequeModal from './accounts/ChequeModal';

interface BalancesViewProps {
  customersList: Customer[];
  suppliersList: Supplier[];
  usersList?: User[];
  rolesList?: Role[];
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  selectedBranch: string;
  currentUser?: User | null;
  activeSubTab?: AccountsSubTab;
  activeShift?: Shift | null;
  treasuriesList?: Treasury[];
  banksList?: Bank[];
  specialAccountsList?: SpecialAccount[];
  chequesList?: Cheque[];
  financialTransfers?: FinancialTransfer[];
  onUpdateCustomers?: (items: Customer[]) => void;
  onUpdateSuppliers?: (items: Supplier[]) => void;
  onUpdateVouchers?: (items: Voucher[]) => void;
  onUpdateTreasuries?: (items: Treasury[]) => void;
  onUpdateBanks?: (items: Bank[]) => void;
  onUpdateSpecialAccounts?: (items: SpecialAccount[]) => void;
  onUpdateCheques?: (items: Cheque[]) => void;
  onSubTabChange?: (tab: AccountsSubTab) => void;
  onOpenCustomerStatement?: (customer: Customer) => void;
  onOpenSupplierStatement?: (supplier: Supplier) => void;
  onNewVoucher?: (defaultType?: 'قبض' | 'صرف', defaultPartyName?: string, defaultPartyType?: 'customer' | 'supplier' | 'general') => void;
  onAddCustomer?: () => void;
  onAddSupplier?: () => void;
}

export default function BalancesView({
  customersList,
  suppliersList,
  usersList = [],
  rolesList = [],
  completedInvoices,
  vouchersList,
  selectedBranch,
  currentUser,
  activeSubTab: externalActiveSubTab,
  activeShift,
  treasuriesList: propTreasuriesList,
  banksList: propBanksList,
  specialAccountsList: propSpecialAccountsList,
  chequesList: propChequesList,
  financialTransfers = [],
  onUpdateCustomers,
  onUpdateSuppliers,
  onUpdateVouchers,
  onUpdateTreasuries,
  onUpdateBanks,
  onUpdateSpecialAccounts,
  onUpdateCheques,
  onSubTabChange,
  onOpenCustomerStatement,
  onOpenSupplierStatement,
  onNewVoucher,
  onAddCustomer,
  onAddSupplier
}: BalancesViewProps) {
  // Sub-tabs list in exact required order
  const subTabs: AccountsSubTab[] = [
    'عملاء',
    'موردين',
    'موظفين',
    'خزن',
    'بنوك',
    'خاص مدين',
    'خاص دائن',
    'شيكات',
    'مصروفات',
    'إيرادات'
  ];

  const [internalActiveTab, setInternalActiveTab] = useState<AccountsSubTab>('عملاء');
  const activeTab = externalActiveSubTab || internalActiveTab;

  const handleTabClick = (tab: AccountsSubTab) => {
    setInternalActiveTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [branchFilter, setBranchFilter] = useState('الكل');
  const [chequeTypeFilter, setChequeTypeFilter] = useState<'الكل' | 'وارد' | 'صادر'>('الكل');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<'الكل' | 'محصل' | 'تحت التحصيل' | 'مرتد'>('الكل');

  // Detailed Statement Modal State
  const [selectedStatementAcc, setSelectedStatementAcc] = useState<{
    type: string;
    name: string;
    code?: string;
    phone?: string;
    id?: string;
    balance: number;
    extraInfo?: string;
  } | null>(null);

  // Financial Ledger & Universal Statement Modal
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  const [statementModalInitialAccount, setStatementModalInitialAccount] = useState<{
    id?: string;
    type: AccountType;
    name: string;
    code?: string;
    balance?: number;
  } | null>(null);

  // Persistence States for Treasuries, Banks, Special Accounts, Cheques
  const [treasuries, setTreasuries] = useState<Treasury[]>(propTreasuriesList || []);
  const [banks, setBanks] = useState<Bank[]>(propBanksList || []);
  const [specialAccounts, setSpecialAccounts] = useState<SpecialAccount[]>(propSpecialAccountsList || []);
  const [cheques, setCheques] = useState<Cheque[]>(propChequesList || []);

  // Modals state
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [editingTreasury, setEditingTreasury] = useState<Treasury | null>(null);

  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const [showSpecialAccountModal, setShowSpecialAccountModal] = useState(false);
  const [editingSpecialAccount, setEditingSpecialAccount] = useState<SpecialAccount | null>(null);
  const [specialAccountDefaultType, setSpecialAccountDefaultType] = useState<'DEBTOR' | 'CREDITOR'>('DEBTOR');

  const [showChequeModal, setShowChequeModal] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);

  // Expense & Revenue Modal State & Filters
  const [showExpenseRevenueModal, setShowExpenseRevenueModal] = useState(false);
  const [expenseRevenueModalType, setExpenseRevenueModalType] = useState<'مصروف' | 'إيراد'>('مصروف');
  const [editingExpenseRevenueVoucher, setEditingExpenseRevenueVoucher] = useState<Voucher | null>(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('الكل');
  const [revenueCategoryFilter, setRevenueCategoryFilter] = useState<string>('الكل');
  const [expenseShiftFilter, setExpenseShiftFilter] = useState<string>('الكل');
  const [revenueShiftFilter, setRevenueShiftFilter] = useState<string>('الكل');
  const [treasuryFilter, setTreasuryFilter] = useState<string>('الكل');

  // Real Financial Transfers State
  const [showFinancialTransferModal, setShowFinancialTransferModal] = useState<boolean>(false);

  // Sync props to state if provided
  useEffect(() => {
    if (propTreasuriesList && propTreasuriesList.length > 0) {
      setTreasuries(propTreasuriesList);
    } else {
      dbGetTreasuries().then(items => {
        if (items && items.length > 0) setTreasuries(items);
      });
    }
  }, [propTreasuriesList]);

  useEffect(() => {
    if (propBanksList && propBanksList.length > 0) {
      setBanks(propBanksList);
    } else {
      dbGetBanks().then(items => {
        if (items && items.length > 0) setBanks(items);
      });
    }
  }, [propBanksList]);

  useEffect(() => {
    if (propSpecialAccountsList && propSpecialAccountsList.length > 0) {
      setSpecialAccounts(propSpecialAccountsList);
    } else {
      dbGetSpecialAccounts().then(items => {
        if (items && items.length > 0) setSpecialAccounts(items);
      });
    }
  }, [propSpecialAccountsList]);

  useEffect(() => {
    if (propChequesList && propChequesList.length > 0) {
      setCheques(propChequesList);
    } else {
      dbGetCheques().then(items => {
        if (items && items.length > 0) setCheques(items);
      });
    }
  }, [propChequesList]);

  // CRUD Handlers for Treasuries
  const handleSaveTreasury = async (item: Treasury) => {
    await dbSaveTreasury(item);
    const updated = await dbGetTreasuries();
    setTreasuries(updated);
    if (onUpdateTreasuries) onUpdateTreasuries(updated);
  };

  const handleDeleteTreasury = async (id: string) => {
    await dbDeleteTreasury(id);
    const updated = await dbGetTreasuries();
    setTreasuries(updated);
    if (onUpdateTreasuries) onUpdateTreasuries(updated);
  };

  // CRUD Handlers for Banks
  const handleSaveBank = async (item: Bank) => {
    await dbSaveBank(item);
    const updated = await dbGetBanks();
    setBanks(updated);
    if (onUpdateBanks) onUpdateBanks(updated);
  };

  const handleDeleteBank = async (id: string) => {
    await dbDeleteBank(id);
    const updated = await dbGetBanks();
    setBanks(updated);
    if (onUpdateBanks) onUpdateBanks(updated);
  };

  // CRUD Handlers for Special Accounts
  const handleSaveSpecialAccount = async (item: SpecialAccount) => {
    await dbSaveSpecialAccount(item);
    const updated = await dbGetSpecialAccounts();
    setSpecialAccounts(updated);
    if (onUpdateSpecialAccounts) onUpdateSpecialAccounts(updated);
  };

  const handleDeleteSpecialAccount = async (id: string) => {
    await dbDeleteSpecialAccount(id);
    const updated = await dbGetSpecialAccounts();
    setSpecialAccounts(updated);
    if (onUpdateSpecialAccounts) onUpdateSpecialAccounts(updated);
  };

  // CRUD Handlers for Cheques
  const handleSaveCheque = async (item: Cheque) => {
    await dbSaveCheque(item);
    const updated = await dbGetCheques();
    setCheques(updated);
    if (onUpdateCheques) onUpdateCheques(updated);
  };

  const handleDeleteCheque = async (id: string) => {
    await dbDeleteCheque(id);
    const updated = await dbGetCheques();
    setCheques(updated);
    if (onUpdateCheques) onUpdateCheques(updated);
  };

  const handleUpdateChequeStatus = async (id: string, newStatus: ChequeStatus) => {
    const target = cheques.find(c => c.id === id);
    if (!target) return;
    const updatedCheque: Cheque = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    await dbSaveCheque(updatedCheque);
    const updated = await dbGetCheques();
    setCheques(updated);
    if (onUpdateCheques) onUpdateCheques(updated);
  };

  // Expense & Revenue Handlers
  const handleSaveExpenseRevenue = async (data: any) => {
    const isEdit = !!data.id;
    const vId = data.id || `VOU-${Date.now()}`;
    const voucher: Voucher = {
      id: vId,
      type: data.type,
      partyType: data.partyType,
      category: data.category,
      name: data.name || (data.partyType === 'expense' ? 'مصروف تشغيلي' : 'إيراد تشغيلي'),
      amount: data.amount,
      drawer: data.drawer || data.treasury || 'الخزينة الرئيسية',
      date: data.date,
      time: data.time || new Date().toTimeString().slice(0, 8),
      notes: data.notes || '',
      referenceNumber: data.referenceNumber || '',
      shiftId: data.shiftId || (activeShift ? activeShift.id : undefined),
      branch: selectedBranch,
      createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام'
    };

    let updated: Voucher[];
    if (isEdit && vouchersList.some(v => v.id === vId)) {
      updated = vouchersList.map(v => v.id === vId ? voucher : v);
    } else {
      updated = [voucher, ...vouchersList];
    }
    if (onUpdateVouchers) {
      onUpdateVouchers(updated);
    }
    dbAddAuditLog({
      action: isEdit ? 'UPDATE' : 'CREATE',
      entity: 'VOUCHER',
      entityId: voucher.id,
      details: `${voucher.partyType === 'expense' ? 'سند مصروف تشغيلي' : 'سند إيراد تشغيلي'} بقيمة ${voucher.amount} ج.م - بند: ${voucher.category || '-'} - الخزنة: ${voucher.drawer || '-'}`,
      userName: currentUser?.displayName || currentUser?.username || 'مدير النظام'
    });
    setShowExpenseRevenueModal(false);
    setEditingExpenseRevenueVoucher(null);
  };

  const handleDeleteExpenseRevenue = async (voucher: Voucher) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${voucher.partyType === 'expense' ? 'سند المصروف' : 'سند الإيراد'} رقم ${voucher.id}؟`)) return;
    const updated = vouchersList.filter(v => v.id !== voucher.id);
    if (onUpdateVouchers) {
      onUpdateVouchers(updated);
    }
    dbAddAuditLog({
      action: 'DELETE',
      entity: 'VOUCHER',
      entityId: voucher.id,
      details: `حذف ${voucher.partyType === 'expense' ? 'سند مصروف تشغيلي' : 'سند إيراد تشغيلي'} رقم ${voucher.id}`,
      userName: currentUser?.displayName || currentUser?.username || 'مدير النظام'
    });
  };

  // Real Financial Transfer Handler
  const handleSaveFinancialTransfer = async (transferData: {
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
    referenceNumber?: string;
    notes?: string;
    shiftId?: string;
  }) => {
    const timestamp = Date.now();
    const transferId = 'TRF-' + timestamp;
    const outVoucherId = 'VCH-TRF-OUT-' + timestamp;
    const inVoucherId = 'VCH-TRF-IN-' + timestamp;

    // Shift handling: Assign shiftId only to the voucher whose drawer matches active shift
    const outShiftId = (activeShift && transferData.sourceType === 'treasury' && (!activeShift.drawer || activeShift.drawer === transferData.sourceName))
      ? activeShift.id
      : undefined;

    const inShiftId = (activeShift && transferData.destinationType === 'treasury' && (!activeShift.drawer || activeShift.drawer === transferData.destinationName))
      ? activeShift.id
      : undefined;

    const outVoucher: Voucher = {
      id: outVoucherId,
      type: 'صرف',
      date: transferData.date,
      time: transferData.time || '00:00',
      name: `تحويل مالي إلى: ${transferData.destinationName}`,
      amount: transferData.amount,
      notes: transferData.notes
        ? `${transferData.notes} [تحويل مالي إلى ${transferData.destinationName}]`
        : `تحويل مالي صادر إلى ${transferData.destinationName}`,
      drawer: transferData.sourceName,
      partyType: 'other',
      category: 'تحويل مالي داخلي',
      referenceNumber: transferData.referenceNumber || transferData.transferNumber,
      shiftId: outShiftId,
      createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
      userId: currentUser?.id,
      branch: selectedBranch
    };

    const inVoucher: Voucher = {
      id: inVoucherId,
      type: 'قبض',
      date: transferData.date,
      time: transferData.time || '00:00',
      name: `تحويل مالي وارد من: ${transferData.sourceName}`,
      amount: transferData.amount,
      notes: transferData.notes
        ? `${transferData.notes} [تحويل مالي وارد من ${transferData.sourceName}]`
        : `تحويل مالي وارد من ${transferData.sourceName}`,
      drawer: transferData.destinationName,
      partyType: 'other',
      category: 'تحويل مالي داخلي',
      referenceNumber: transferData.referenceNumber || transferData.transferNumber,
      shiftId: inShiftId,
      createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
      userId: currentUser?.id,
      branch: selectedBranch
    };

    const transferRecord: FinancialTransfer = {
      id: transferId,
      transferNumber: transferData.transferNumber,
      date: transferData.date,
      time: transferData.time,
      sourceType: transferData.sourceType,
      sourceId: transferData.sourceId,
      sourceName: transferData.sourceName,
      destinationType: transferData.destinationType,
      destinationId: transferData.destinationId,
      destinationName: transferData.destinationName,
      amount: transferData.amount,
      notes: transferData.notes,
      referenceNumber: transferData.referenceNumber,
      userId: currentUser?.id,
      createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
      shiftId: transferData.shiftId || (activeShift ? activeShift.id : undefined),
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
      outVoucherId,
      inVoucherId
    };

    // 1. Save to persistent Financial Transfers
    await dbSaveFinancialTransfer(transferRecord);

    // 2. Add both vouchers to vouchersList and persistent DB
    const updatedVouchers = [outVoucher, inVoucher, ...vouchersList];
    if (onUpdateVouchers) {
      onUpdateVouchers(updatedVouchers);
    }
    await dbSaveVouchers(updatedVouchers);

    // 3. Log to Audit
    await dbAddAuditLog({
      action: 'TRANSFER_CREATE',
      entity: 'TRANSFER',
      entityId: transferId,
      userId: currentUser?.id || 'admin',
      userName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
      details: `تحويل مالي فعلي بمبلغ ${transferData.amount.toFixed(2)} ج.م من [${transferData.sourceName}] إلى [${transferData.destinationName}] (رقم التحويل: ${transferData.transferNumber})`
    });

    setShowFinancialTransferModal(false);
  };

  // 1. CUSTOMERS CALCULATION
  const customersData = useMemo(() => {
    return customersList.map((c, idx) => {
      const invs = completedInvoices.filter(
        i => i.customerName === c.name || (i.customerPhone && c.phone && i.customerPhone === c.phone)
      );
      const vouts = vouchersList.filter(
        v => v.name === c.name || (v.partyType === 'customer' && v.partyId === c.id)
      );
      const mCount = invs.length + vouts.length;
      const bal = c.balance;

      return {
        id: c.id || `CUST-${idx + 1}`,
        code: `CUST-${(idx + 1).toString().padStart(3, '0')}`,
        name: c.name,
        phone: c.phone || '',
        notes: c.notes || 'عميل مسجل',
        debit: bal > 0 ? bal : 0,
        credit: bal < 0 ? Math.abs(bal) : 0,
        balance: bal,
        movementCount: mCount,
        branch: selectedBranch
      };
    });
  }, [customersList, completedInvoices, vouchersList, selectedBranch]);

  // 2. SUPPLIERS CALCULATION
  const suppliersData = useMemo(() => {
    return suppliersList.map((s, idx) => {
      const invs = completedInvoices.filter(
        i => i.supplierId === s.id || i.supplierName === s.name || i.customerName === s.name
      );
      const vouts = vouchersList.filter(
        v => v.name === s.name || (v.partyType === 'supplier' && v.partyId === s.id)
      );
      const mCount = invs.length + vouts.length;
      const bal = s.balance;

      return {
        id: s.id || `SUPP-${idx + 1}`,
        code: `SUPP-${(idx + 1).toString().padStart(3, '0')}`,
        name: s.name,
        phone: s.phone || '',
        address: s.address || 'غير محدد',
        notes: s.notes || 'مورد معتمد',
        debit: bal < 0 ? Math.abs(bal) : 0,
        credit: bal > 0 ? bal : 0,
        balance: bal,
        movementCount: mCount,
        branch: selectedBranch
      };
    });
  }, [suppliersList, completedInvoices, vouchersList, selectedBranch]);

  // 3. EMPLOYEES CALCULATION (Real users from storage)
  const employeesData = useMemo(() => {
    return usersList.map((u, idx) => {
      const roleName = rolesList.find(r => r.id === u.roleId)?.name || u.roleId;
      
      const userInvoices = completedInvoices.filter(
        i => i.userId === u.id || i.createdByName === u.displayName || i.createdByName === u.username
      );
      const userVouchers = vouchersList.filter(
        v => v.userId === u.id || v.createdByName === u.displayName || v.createdByName === u.username
      );

      const totalSales = userInvoices
        .filter(i => i.type === 'بيع')
        .reduce((sum, i) => sum + i.total, 0);

      const totalCollections = userVouchers
        .filter(v => v.type === 'قبض')
        .reduce((sum, v) => sum + v.amount, 0);

      const totalPayments = userVouchers
        .filter(v => v.type === 'صرف')
        .reduce((sum, v) => sum + v.amount, 0);

      const totalOperations = userInvoices.length + userVouchers.length;

      return {
        id: u.id,
        code: `EMP-${(idx + 1).toString().padStart(3, '0')}`,
        displayName: u.displayName,
        username: u.username,
        roleName: roleName,
        active: u.active,
        totalSales: totalSales,
        totalCollections: totalCollections,
        totalPayments: totalPayments,
        totalOperations: totalOperations,
        createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '2026/01/01',
        branch: selectedBranch
      };
    });
  }, [usersList, rolesList, completedInvoices, vouchersList, selectedBranch]);

  // 4. TREASURIES / CASH DRAWERS CALCULATION (From persistent storage)
  const treasuriesData = useMemo(() => {
    return treasuries.map(d => {
      // Sales cash in
      const cashSales = completedInvoices
        .filter(i => (i.drawer === d.name || i.drawer === d.code) && i.type === 'بيع')
        .reduce((sum, i) => sum + i.paid, 0);

      // Sales return cash out
      const cashSalesReturns = completedInvoices
        .filter(i => (i.drawer === d.name || i.drawer === d.code) && i.type === 'مرتجع بيع')
        .reduce((sum, i) => sum + i.paid, 0);

      // Purchases cash out
      const cashPurchases = completedInvoices
        .filter(i => (i.drawer === d.name || i.drawer === d.code) && i.type === 'شراء')
        .reduce((sum, i) => sum + i.paid, 0);

      // Purchase return cash in
      const cashPurchaseReturns = completedInvoices
        .filter(i => (i.drawer === d.name || i.drawer === d.code) && i.type === 'مرتجع شراء')
        .reduce((sum, i) => sum + i.paid, 0);

      // Vouchers cash in (قبض)
      const vouchersIn = vouchersList
        .filter(v => (v.drawer === d.name || v.drawer === d.code) && v.type === 'قبض')
        .reduce((sum, v) => sum + v.amount, 0);

      // Vouchers cash out (صرف)
      const vouchersOut = vouchersList
        .filter(v => (v.drawer === d.name || v.drawer === d.code) && v.type === 'صرف')
        .reduce((sum, v) => sum + v.amount, 0);

      const opBal = d.openingBalance || 0;
      const totalInflow = cashSales + cashPurchaseReturns + vouchersIn;
      const totalOutflow = cashSalesReturns + cashPurchases + vouchersOut;
      const netCashBalance = opBal + totalInflow - totalOutflow;

      const movementCount =
        completedInvoices.filter(i => i.drawer === d.name || i.drawer === d.code).length +
        vouchersList.filter(v => v.drawer === d.name || v.drawer === d.code).length;

      return {
        id: d.id,
        rawItem: d,
        code: d.code,
        name: d.name,
        opening: opBal,
        cashSales,
        cashPurchases,
        vouchersIn,
        vouchersOut,
        totalInflow,
        totalOutflow,
        balance: netCashBalance,
        movementCount,
        active: d.active !== false,
        notes: d.notes || '',
        branch: d.branchId || selectedBranch
      };
    });
  }, [treasuries, completedInvoices, vouchersList, selectedBranch]);

  // 5. BANKS / ELECTRONIC ACCOUNTS CALCULATION (From persistent storage)
  const banksData = useMemo(() => {
    return banks.map(b => {
      // Vouchers targeting this bank or network
      const bankVouchers = vouchersList.filter(
        v => v.drawer === b.name || v.drawer === b.code || v.notes?.includes(b.name) || (b.accountNumber && v.notes?.includes(b.accountNumber))
      );

      const deposits = bankVouchers
        .filter(v => v.type === 'قبض')
        .reduce((sum, v) => sum + v.amount, 0);

      const withdrawals = bankVouchers
        .filter(v => v.type === 'صرف')
        .reduce((sum, v) => sum + v.amount, 0);

      const opBal = b.openingBalance || 0;
      const netBalance = opBal + deposits - withdrawals;

      return {
        id: b.id,
        rawItem: b,
        code: b.code,
        name: b.name,
        accNumber: b.accountNumber || '',
        iban: b.IBAN || '',
        opening: opBal,
        deposits,
        withdrawals,
        balance: netBalance,
        movementCount: bankVouchers.length,
        active: b.active !== false,
        notes: b.notes || '',
        branch: b.branchId || selectedBranch
      };
    });
  }, [banks, vouchersList, selectedBranch]);

  // Real-time lookup balance maps for Transfer System
  const treasuryBalancesMap = useMemo(() => {
    const map: Record<string, number> = {};
    treasuriesData.forEach(t => {
      map[t.name] = t.balance;
      map[t.id] = t.balance;
      map[t.code] = t.balance;
    });
    return map;
  }, [treasuriesData]);

  const bankBalancesMap = useMemo(() => {
    const map: Record<string, number> = {};
    banksData.forEach(b => {
      map[b.name] = b.balance;
      map[b.id] = b.balance;
      map[b.code] = b.balance;
    });
    return map;
  }, [banksData]);

  // 6. SPECIAL DEBTORS (خاص مدين) CALCULATION (From persistent storage)
  const specialDebtorsData = useMemo(() => {
    const debtorAccounts = specialAccounts.filter(a => a.type === 'DEBTOR' || (a.type as string) === 'خاص مدين');

    return debtorAccounts.map(d => {
      const vouts = vouchersList.filter(
        v => v.name === d.name || v.notes?.includes(d.name) || (v.partyType === 'general' && v.partyId === d.id)
      );

      const addDebit = vouts
        .filter(v => v.type === 'صرف')
        .reduce((sum, v) => sum + v.amount, 0);

      const addCredit = vouts
        .filter(v => v.type === 'قبض')
        .reduce((sum, v) => sum + v.amount, 0);

      const opBal = d.openingBalance || 0;
      const netBalance = opBal + addDebit - addCredit;

      return {
        id: d.id,
        rawItem: d,
        code: d.code,
        name: d.name,
        notes: d.notes || 'حساب خاص مدين',
        opening: opBal,
        debit: opBal + addDebit,
        credit: addCredit,
        balance: netBalance,
        movementCount: vouts.length,
        active: d.active !== false,
        branch: d.branchId || selectedBranch
      };
    });
  }, [specialAccounts, vouchersList, selectedBranch]);

  // 7. SPECIAL CREDITORS (خاص دائن) CALCULATION (From persistent storage)
  const specialCreditorsData = useMemo(() => {
    const creditorAccounts = specialAccounts.filter(a => a.type === 'CREDITOR' || (a.type as string) === 'خاص دائن');

    return creditorAccounts.map(c => {
      const vouts = vouchersList.filter(
        v => v.name === c.name || v.notes?.includes(c.name) || (v.partyType === 'general' && v.partyId === c.id)
      );

      const addCredit = vouts
        .filter(v => v.type === 'قبض')
        .reduce((sum, v) => sum + v.amount, 0);

      const addDebit = vouts
        .filter(v => v.type === 'صرف')
        .reduce((sum, v) => sum + v.amount, 0);

      const opBal = c.openingBalance || 0;
      const netBalance = opBal + addCredit - addDebit;

      return {
        id: c.id,
        rawItem: c,
        code: c.code,
        name: c.name,
        notes: c.notes || 'حساب خاص دائن',
        opening: opBal,
        credit: opBal + addCredit,
        debit: addDebit,
        balance: netBalance,
        movementCount: vouts.length,
        active: c.active !== false,
        branch: c.branchId || selectedBranch
      };
    });
  }, [specialAccounts, vouchersList, selectedBranch]);

  // 8. CHEQUES (شيكات) CALCULATION (From persistent storage)
  const chequesData = useMemo(() => {
    return cheques.map(chk => {
      const normalizedType: 'وارد' | 'صادر' =
        chk.type === 'INCOMING' ? 'وارد' : chk.type === 'OUTGOING' ? 'صادر' : chk.type;
      
      const normalizedStatus: 'تحت التحصيل' | 'محصل' | 'مرتد' | 'ملغي' =
        chk.status === 'UNDER_COLLECTION' ? 'تحت التحصيل' :
        chk.status === 'COLLECTED' ? 'محصل' :
        chk.status === 'RETURNED' ? 'مرتد' :
        chk.status === 'CANCELLED' ? 'ملغي' :
        chk.status;

      return {
        id: chk.id,
        rawItem: chk,
        chequeNumber: chk.chequeNumber,
        type: normalizedType,
        bankName: chk.bankName,
        partyName: chk.partyName,
        partyType: chk.partyType || 'عميل',
        amount: chk.amount,
        issueDate: chk.issueDate || '2026/01/01',
        dueDate: chk.dueDate || '2026/01/01',
        status: normalizedStatus,
        createdByName: chk.createdByName || 'مدير النظام',
        notes: chk.notes || ''
      };
    });
  }, [cheques]);

  // 9. EXPENSES (مصروفات تشغيلية) CALCULATION
  const expensesData = useMemo(() => {
    return vouchersList
      .filter(v => v.type === 'صرف' && (v.partyType === 'expense' || v.partyType === 'general' || (v.category && v.partyType !== 'supplier' && v.partyType !== 'customer') || v.notes?.includes('مصروف')))
      .map(v => ({
        id: v.id,
        rawItem: v,
        date: v.date,
        time: v.time || '',
        category: v.category || 'مصروفات متنوعة',
        amount: v.amount,
        treasury: v.drawer || 'الخزينة الرئيسية',
        notes: v.notes || '',
        createdByName: v.createdByName || 'المدير',
        shiftId: v.shiftId,
        branch: v.branch || selectedBranch
      }));
  }, [vouchersList, selectedBranch]);

  // 10. REVENUES (إيرادات تشغيلية) CALCULATION
  const revenuesData = useMemo(() => {
    return vouchersList
      .filter(v => v.type === 'قبض' && (v.partyType === 'revenue' || (v.partyType === 'general' && v.category) || (v.category && v.partyType !== 'customer' && v.partyType !== 'supplier')))
      .map(v => ({
        id: v.id,
        rawItem: v,
        date: v.date,
        time: v.time || '',
        category: v.category || 'إيرادات متنوعة',
        amount: v.amount,
        treasury: v.drawer || 'الخزينة الرئيسية',
        notes: v.notes || '',
        createdByName: v.createdByName || 'المدير',
        shiftId: v.shiftId,
        branch: v.branch || selectedBranch
      }));
  }, [vouchersList, selectedBranch]);

  // Filtered Lists based on active tab & search
  const filteredCustomers = useMemo(() => {
    return customersData.filter(c => {
      if (statusFilter === 'أرصدة مدينة' && c.balance <= 0) return false;
      if (statusFilter === 'أرصدة دائنة' && c.balance >= 0) return false;
      if (statusFilter === 'أرصدة صفرية' && c.balance !== 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.phone.includes(q)
        );
      }
      return true;
    });
  }, [customersData, statusFilter, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return suppliersData.filter(s => {
      if (statusFilter === 'أرصدة دائنة' && s.balance <= 0) return false;
      if (statusFilter === 'أرصدة مدينة' && s.balance >= 0) return false;
      if (statusFilter === 'أرصدة صفرية' && s.balance !== 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.phone.includes(q)
        );
      }
      return true;
    });
  }, [suppliersData, statusFilter, searchQuery]);

  const filteredEmployees = useMemo(() => {
    return employeesData.filter(e => {
      if (statusFilter !== 'الكل' && e.roleName !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.displayName.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.roleName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employeesData, statusFilter, searchQuery]);

  const filteredTreasuries = useMemo(() => {
    return treasuriesData.filter(t => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [treasuriesData, searchQuery]);

  const filteredBanks = useMemo(() => {
    return banksData.filter(b => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.accNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [banksData, searchQuery]);

  const filteredSpecialDebtors = useMemo(() => {
    return specialDebtorsData.filter(d => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          d.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [specialDebtorsData, searchQuery]);

  const filteredSpecialCreditors = useMemo(() => {
    return specialCreditorsData.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [specialCreditorsData, searchQuery]);

  const filteredCheques = useMemo(() => {
    return chequesData.filter(c => {
      if (chequeTypeFilter !== 'الكل' && c.type !== chequeTypeFilter) return false;
      if (chequeStatusFilter !== 'الكل' && c.status !== chequeStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.chequeNumber.includes(q) ||
          c.bankName.toLowerCase().includes(q) ||
          c.partyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [chequesData, chequeTypeFilter, chequeStatusFilter, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expensesData.filter(e => {
      if (expenseCategoryFilter !== 'الكل' && e.category !== expenseCategoryFilter) return false;
      if (treasuryFilter !== 'الكل' && e.treasury !== treasuryFilter) return false;
      if (expenseShiftFilter === 'current') {
        if (!activeShift || e.shiftId !== activeShift.id) return false;
      } else if (expenseShiftFilter === 'none') {
        if (e.shiftId) return false;
      } else if (expenseShiftFilter !== 'الكل' && e.shiftId !== expenseShiftFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.id.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.treasury.toLowerCase().includes(q) ||
          e.createdByName.toLowerCase().includes(q) ||
          (e.shiftId && e.shiftId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expensesData, expenseCategoryFilter, treasuryFilter, expenseShiftFilter, activeShift, searchQuery]);

  const filteredRevenues = useMemo(() => {
    return revenuesData.filter(r => {
      if (revenueCategoryFilter !== 'الكل' && r.category !== revenueCategoryFilter) return false;
      if (treasuryFilter !== 'الكل' && r.treasury !== treasuryFilter) return false;
      if (revenueShiftFilter === 'current') {
        if (!activeShift || r.shiftId !== activeShift.id) return false;
      } else if (revenueShiftFilter === 'none') {
        if (r.shiftId) return false;
      } else if (revenueShiftFilter !== 'الكل' && r.shiftId !== revenueShiftFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          r.treasury.toLowerCase().includes(q) ||
          r.createdByName.toLowerCase().includes(q) ||
          (r.shiftId && r.shiftId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [revenuesData, revenueCategoryFilter, treasuryFilter, revenueShiftFilter, activeShift, searchQuery]);

  // Detailed Account Statement Movements Calculation (using Financial Ledger Engine)
  const statementMovementsData = useMemo(() => {
    if (!selectedStatementAcc) return { movements: [], openingBalance: 0, closingBalance: 0 };

    const accountParam = {
      id: selectedStatementAcc.id,
      name: selectedStatementAcc.name,
      code: selectedStatementAcc.code,
      phone: selectedStatementAcc.phone,
      type: selectedStatementAcc.type as any,
      balance: selectedStatementAcc.balance
    };

    const statement = buildAccountStatement({
      account: accountParam,
      completedInvoices,
      vouchersList,
      financialTransfers
    });

    return {
      movements: statement.movements,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance
    };
  }, [selectedStatementAcc, completedInvoices, vouchersList, financialTransfers]);

  // Auto-select first item when activeTab or filtered list changes if no valid selection
  useEffect(() => {
    if (activeTab === 'عملاء' && filteredCustomers.length > 0) {
      const match = filteredCustomers.find(c => c.id === selectedStatementAcc?.id || c.name === selectedStatementAcc?.name);
      if (!match) {
        const c = filteredCustomers[0];
        setSelectedStatementAcc({
          type: 'عميل',
          name: c.name,
          code: c.code,
          phone: c.phone,
          id: c.id,
          balance: c.balance
        });
      }
    } else if (activeTab === 'موردين' && filteredSuppliers.length > 0) {
      const match = filteredSuppliers.find(s => s.id === selectedStatementAcc?.id || s.name === selectedStatementAcc?.name);
      if (!match) {
        const s = filteredSuppliers[0];
        setSelectedStatementAcc({
          type: 'مورد',
          name: s.name,
          code: s.code,
          phone: s.phone,
          id: s.id,
          balance: s.balance
        });
      }
    } else if (activeTab === 'موظفين' && filteredEmployees.length > 0) {
      const match = filteredEmployees.find(e => e.id === selectedStatementAcc?.id || e.displayName === selectedStatementAcc?.name);
      if (!match) {
        const e = filteredEmployees[0];
        setSelectedStatementAcc({
          type: 'موظف',
          name: e.displayName,
          code: e.code,
          id: e.id,
          balance: e.totalSales,
          extraInfo: `الدور: ${e.roleName} | العمليات: ${e.totalOperations}`
        });
      }
    } else if (activeTab === 'خزن' && filteredTreasuries.length > 0) {
      const match = filteredTreasuries.find(t => t.id === selectedStatementAcc?.id || t.name === selectedStatementAcc?.name);
      if (!match) {
        const t = filteredTreasuries[0];
        setSelectedStatementAcc({
          type: 'خزنة / درج',
          name: t.name,
          code: t.code,
          id: t.id,
          balance: t.balance,
          extraInfo: `الرصيد الافتتاحي: ${t.opening.toFixed(2)} ج.م`
        });
      }
    } else if (activeTab === 'بنوك' && filteredBanks.length > 0) {
      const match = filteredBanks.find(b => b.id === selectedStatementAcc?.id || b.name === selectedStatementAcc?.name);
      if (!match) {
        const b = filteredBanks[0];
        setSelectedStatementAcc({
          type: 'بنك',
          name: b.name,
          code: b.code,
          id: b.id,
          balance: b.balance,
          extraInfo: `رقم الحساب: ${b.accNumber || b.iban || '-'}`
        });
      }
    } else if (activeTab === 'خاص مدين' && filteredSpecialDebtors.length > 0) {
      const match = filteredSpecialDebtors.find(d => d.id === selectedStatementAcc?.id || d.name === selectedStatementAcc?.name);
      if (!match) {
        const d = filteredSpecialDebtors[0];
        setSelectedStatementAcc({
          type: 'خاص مدين',
          name: d.name,
          code: d.code,
          id: d.id,
          balance: d.balance
        });
      }
    } else if (activeTab === 'خاص دائن' && filteredSpecialCreditors.length > 0) {
      const match = filteredSpecialCreditors.find(c => c.id === selectedStatementAcc?.id || c.name === selectedStatementAcc?.name);
      if (!match) {
        const c = filteredSpecialCreditors[0];
        setSelectedStatementAcc({
          type: 'خاص دائن',
          name: c.name,
          code: c.code,
          id: c.id,
          balance: c.balance
        });
      }
    } else if (activeTab === 'شيكات' && filteredCheques.length > 0) {
      const match = filteredCheques.find(c => c.id === selectedStatementAcc?.id || c.chequeNumber === selectedStatementAcc?.code);
      if (!match) {
        const chk = filteredCheques[0];
        setSelectedStatementAcc({
          type: 'شيك',
          name: `${chk.type} - ${chk.bankName} (${chk.chequeNumber})`,
          code: chk.chequeNumber,
          id: chk.id,
          balance: chk.amount,
          extraInfo: `الطرف: ${chk.partyName} | الاستحقاق: ${chk.dueDate}`
        });
      }
    }
  }, [activeTab, filteredCustomers, filteredSuppliers, filteredEmployees, filteredTreasuries, filteredBanks, filteredSpecialDebtors, filteredSpecialCreditors, filteredCheques]);

  // Export CSV Handler
  const exportActiveTabCSV = () => {
    let rows: (string | number)[][] = [];
    let filename = `حسابات_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'عملاء') {
      rows = [
        ['كود العميل', 'اسم العميل', 'رقم الهاتف', 'الفرع', 'مدين (له)', 'دائن (عليه)', 'الرصيد النهائي (ج.م)', 'عدد الحركات', 'ملاحظات'],
        ...filteredCustomers.map(c => [
          c.code,
          c.name,
          c.phone,
          c.branch,
          c.debit.toFixed(2),
          c.credit.toFixed(2),
          c.balance.toFixed(2),
          c.movementCount,
          c.notes
        ])
      ];
    } else if (activeTab === 'موردين') {
      rows = [
        ['كود المورد', 'اسم المورد', 'رقم الهاتف', 'العنوان', 'الفرع', 'مدين (له)', 'دائن (عليه)', 'الرصيد النهائي (ج.م)', 'عدد الحركات', 'ملاحظات'],
        ...filteredSuppliers.map(s => [
          s.code,
          s.name,
          s.phone,
          s.address,
          s.branch,
          s.debit.toFixed(2),
          s.credit.toFixed(2),
          s.balance.toFixed(2),
          s.movementCount,
          s.notes
        ])
      ];
    } else if (activeTab === 'موظفين') {
      rows = [
        ['كود الموظف', 'اسم الموظف', 'اسم المستخدم', 'الدور الوظيفي', 'الحالة', 'إجمالي المبيعات', 'التحصيلات', 'المصروفات', 'عدد العمليات'],
        ...filteredEmployees.map(e => [
          e.code,
          e.displayName,
          e.username,
          e.roleName,
          e.active ? 'نشط' : 'معطل',
          e.totalSales.toFixed(2),
          e.totalCollections.toFixed(2),
          e.totalPayments.toFixed(2),
          e.totalOperations
        ])
      ];
    } else if (activeTab === 'خزن') {
      rows = [
        ['كود الخزنة', 'اسم الخزنة / الدرج', 'الرصيد الافتتاحي', 'مبيعات نقدية واردة', 'مشتريات نقدية منصرفة', 'سندات قبض', 'سندات صرف', 'الرصيد النقدي الحالي'],
        ...filteredTreasuries.map(t => [
          t.code,
          t.name,
          t.opening.toFixed(2),
          t.cashSales.toFixed(2),
          t.cashPurchases.toFixed(2),
          t.vouchersIn.toFixed(2),
          t.vouchersOut.toFixed(2),
          t.balance.toFixed(2)
        ])
      ];
    } else if (activeTab === 'بنوك') {
      rows = [
        ['كود البنك', 'اسم البنك / الحساب', 'رقم الحساب / الآيبان', 'الرصيد الافتتاحي', 'إجمالي الإيداعات (مدين)', 'إجمالي المسحوبات (دائن)', 'الرصيد البنكي الحالي'],
        ...filteredBanks.map(b => [
          b.code,
          b.name,
          b.accNumber,
          b.opening.toFixed(2),
          b.deposits.toFixed(2),
          b.withdrawals.toFixed(2),
          b.balance.toFixed(2)
        ])
      ];
    } else if (activeTab === 'خاص مدين') {
      rows = [
        ['كود الحساب', 'اسم الحساب الخاص', 'الرصيد الافتتاحي', 'المدين (لنا)', 'الدائن (المسدد)', 'الرصيد المتبقي', 'ملاحظات'],
        ...filteredSpecialDebtors.map(d => [
          d.code,
          d.name,
          d.opening.toFixed(2),
          d.debit.toFixed(2),
          d.credit.toFixed(2),
          d.balance.toFixed(2),
          d.notes
        ])
      ];
    } else if (activeTab === 'خاص دائن') {
      rows = [
        ['كود الحساب', 'اسم الحساب الدائن', 'الرصيد الافتتاحي', 'الدائن (المستحق)', 'المدين (المسدد)', 'الرصيد المستحق', 'ملاحظات'],
        ...filteredSpecialCreditors.map(c => [
          c.code,
          c.name,
          c.opening.toFixed(2),
          c.credit.toFixed(2),
          c.debit.toFixed(2),
          c.balance.toFixed(2),
          c.notes
        ])
      ];
    } else if (activeTab === 'شيكات') {
      rows = [
        ['رقم الشيك', 'نوع الشيك', 'البنك المسحوب عليه', 'تاريخ الاستحقاق', 'الجهة / الساحب', 'المبلغ', 'الحالة', 'المستخدم', 'ملاحظات'],
        ...filteredCheques.map(c => [
          c.chequeNumber,
          c.type,
          c.bankName,
          c.dueDate,
          c.partyName,
          c.amount.toFixed(2),
          c.status,
          c.createdByName,
          c.notes
        ])
      ];
    } else if (activeTab === 'مصروفات') {
      rows = [
        ['رقم السند', 'التاريخ', 'الوقت', 'بند المصروف', 'المبلغ', 'الخزنة', 'الوردية', 'المستخدم', 'ملاحظات'],
        ...filteredExpenses.map(e => [
          e.id,
          e.date,
          e.time,
          e.category,
          e.amount.toFixed(2),
          e.treasury,
          e.shiftId || 'بدون وردية',
          e.createdByName,
          e.notes
        ])
      ];
    } else if (activeTab === 'إيرادات') {
      rows = [
        ['رقم السند', 'التاريخ', 'الوقت', 'بند الإيراد', 'المبلغ', 'الخزنة', 'الوردية', 'المستخدم', 'ملاحظات'],
        ...filteredRevenues.map(r => [
          r.id,
          r.date,
          r.time,
          r.category,
          r.amount.toFixed(2),
          r.treasury,
          r.shiftId || 'بدون وردية',
          r.createdByName,
          r.notes
        ])
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportStatementCSV = () => {
    if (!selectedStatementAcc) return;
    const rows = [
      [`كشف حساب تفصيلي: ${selectedStatementAcc.name}`],
      [`النوع: ${selectedStatementAcc.type}`, `الهاتف/الكود: ${selectedStatementAcc.phone || selectedStatementAcc.code || '-'}`, `الرصيد الحالي: ${(selectedStatementAcc.balance || 0).toFixed(2)} ج.م`],
      ['م', 'التاريخ والوقت', 'نوع الحركة', 'رقم المرجع', 'البيان والتفاصيل', 'مدين (له)', 'دائن (عليه)', 'الرصيد التراكمي', 'المستخدم'],
      ['0', '-', 'رصيد افتتاحي', '-', 'رصيد افتتاحي سابق الحساب', '-', '-', (statementMovementsData.openingBalance || 0).toFixed(2), '-'],
      ...statementMovementsData.movements.map((m, idx) => [
        (idx + 1).toString(),
        `${m.date} ${m.time}`,
        m.type,
        m.refId,
        m.notes,
        m.debit > 0 ? (m.debit || 0).toFixed(2) : '0.00',
        m.credit > 0 ? (m.credit || 0).toFixed(2) : '0.00',
        (m.runningBalance || 0).toFixed(2),
        m.createdByName || 'غير محدد'
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `كشف_حساب_${selectedStatementAcc.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] overflow-hidden text-xs dir-rtl" dir="rtl">
      
      {/* 2. SUB-TAB TOOLBAR & ACTIONS */}
      <div className="bg-[#f0f7fc] border-b border-slate-200 p-1.5 shrink-0 flex items-center justify-between flex-wrap gap-1.5 text-xs">
        
        {/* Left Side: Title & Status Count */}
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#1e3a5f]" />
          <span className="font-extrabold text-slate-800 text-xs">
            سجل {activeTab}
          </span>
          <span className="bg-white border border-slate-200 px-1.5 py-0.2 font-mono font-bold text-[#1e3a5f] text-[11px] shadow-2xs">
            {activeTab === 'عملاء' && `${filteredCustomers.length} عميل`}
            {activeTab === 'موردين' && `${filteredSuppliers.length} مورد`}
            {activeTab === 'موظفين' && `${filteredEmployees.length} موظف`}
            {activeTab === 'خزن' && `${filteredTreasuries.length} خزنة/درج`}
            {activeTab === 'بنوك' && `${filteredBanks.length} حساب بنكي`}
            {activeTab === 'خاص مدين' && `${filteredSpecialDebtors.length} حساب مدين`}
            {activeTab === 'خاص دائن' && `${filteredSpecialCreditors.length} حساب دائن`}
            {activeTab === 'شيكات' && `${filteredCheques.length} شيك`}
            {activeTab === 'مصروفات' && `${filteredExpenses.length} سند مصروف`}
            {activeTab === 'إيرادات' && `${filteredRevenues.length} سند إيراد`}
          </span>
        </div>

        {/* Center / Right: Search & Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder={`بحث في سجل ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 pl-7 pr-2 py-0.5 bg-white border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-1.5" />
          </div>

          {/* Context Filter Dropdown */}
          {activeTab === 'عملاء' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
            >
              <option value="الكل">جميع الأرصدة</option>
              <option value="أرصدة مدينة">أرصدة مدينة (له)</option>
              <option value="أرصدة دائنة">أرصدة دائنة (عليه)</option>
              <option value="أرصدة صفرية">أرصدة صفرية</option>
            </select>
          )}

          {activeTab === 'موردين' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
            >
              <option value="الكل">جميع الأرصدة</option>
              <option value="أرصدة دائنة">مستحق للمورد (دائن)</option>
              <option value="أرصدة مدينة">مقدمات للمورد (مدين)</option>
              <option value="أرصدة صفرية">أرصدة صفرية</option>
            </select>
          )}

          {activeTab === 'موظفين' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
            >
              <option value="الكل">جميع الأدوار</option>
              {rolesList.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          )}

          {activeTab === 'شيكات' && (
            <>
              <select
                value={chequeTypeFilter}
                onChange={(e) => setChequeTypeFilter(e.target.value as any)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">نوع الشيك: الكل</option>
                <option value="وارد">شيكات واردة (قبض)</option>
                <option value="صادر">شيكات صادرة (صرف)</option>
              </select>
              <select
                value={chequeStatusFilter}
                onChange={(e) => setChequeStatusFilter(e.target.value as any)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">حالة الشيك: الكل</option>
                <option value="تحت التحصيل">تحت التحصيل</option>
                <option value="محصل">محصل</option>
                <option value="مرتد">مرتد</option>
              </select>
            </>
          )}

          {activeTab === 'مصروفات' && (
            <>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع بنود المصروفات</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={treasuryFilter}
                onChange={(e) => setTreasuryFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع الخزائن</option>
                {treasuries.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <select
                value={expenseShiftFilter}
                onChange={(e) => setExpenseShiftFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع الورديات</option>
                {activeShift && <option value="current">الوردية الحالية ({activeShift.id})</option>}
                <option value="none">بدون وردية</option>
              </select>
            </>
          )}

          {activeTab === 'إيرادات' && (
            <>
              <select
                value={revenueCategoryFilter}
                onChange={(e) => setRevenueCategoryFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع بنود الإيرادات</option>
                {REVENUE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={treasuryFilter}
                onChange={(e) => setTreasuryFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع الخزائن</option>
                {treasuries.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <select
                value={revenueShiftFilter}
                onChange={(e) => setRevenueShiftFilter(e.target.value)}
                className="px-2 py-0.5 bg-white border border-[#afafaf] font-bold text-xs focus:outline-none"
              >
                <option value="الكل">جميع الورديات</option>
                {activeShift && <option value="current">الوردية الحالية ({activeShift.id})</option>}
                <option value="none">بدون وردية</option>
              </select>
            </>
          )}

          {/* Action Buttons */}
          {activeTab === 'عملاء' && onAddCustomer && (
            <button
              onClick={onAddCustomer}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              عميل جديد
            </button>
          )}

          {activeTab === 'موردين' && onAddSupplier && (
            <button
              onClick={onAddSupplier}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              مورد جديد
            </button>
          )}

          {activeTab === 'خزن' && (
            <>
              <button
                onClick={() => {
                  setEditingTreasury(null);
                  setShowTreasuryModal(true);
                }}
                className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                خزنة / درج جديد
              </button>
              <button
                onClick={() => setShowFinancialTransferModal(true)}
                className="px-2.5 py-0.5 bg-[#243746] hover:bg-[#1a2935] text-white font-bold text-xs border border-[#1a2935] rounded-none flex items-center gap-1"
                title="تحويل مالي من / إلى الخزينة"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#88d49e]" />
                تحويل مالي
              </button>
            </>
          )}

          {activeTab === 'بنوك' && (
            <>
              <button
                onClick={() => {
                  setEditingBank(null);
                  setShowBankModal(true);
                }}
                className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                حساب بنكي جديد
              </button>
              <button
                onClick={() => setShowFinancialTransferModal(true)}
                className="px-2.5 py-0.5 bg-[#243746] hover:bg-[#1a2935] text-white font-bold text-xs border border-[#1a2935] rounded-none flex items-center gap-1"
                title="تحويل مالي من / إلى البنك"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#88d49e]" />
                تحويل مالي
              </button>
            </>
          )}

          {activeTab === 'خاص مدين' && (
            <button
              onClick={() => {
                setSpecialAccountDefaultType('DEBTOR');
                setEditingSpecialAccount(null);
                setShowSpecialAccountModal(true);
              }}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              حساب مدين جديد
            </button>
          )}

          {activeTab === 'خاص دائن' && (
            <button
              onClick={() => {
                setSpecialAccountDefaultType('CREDITOR');
                setEditingSpecialAccount(null);
                setShowSpecialAccountModal(true);
              }}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              حساب دائن جديد
            </button>
          )}

          {activeTab === 'شيكات' && (
            <button
              onClick={() => {
                setEditingCheque(null);
                setShowChequeModal(true);
              }}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              تسجيل شيك جديد
            </button>
          )}

          {activeTab === 'مصروفات' && (
            <button
              onClick={() => {
                setExpenseRevenueModalType('مصروف');
                setEditingExpenseRevenueVoucher(null);
                setShowExpenseRevenueModal(true);
              }}
              className="px-2.5 py-0.5 bg-[#b85c5c] hover:bg-[#a34b4b] text-white font-bold text-xs border border-[#a34b4b] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              تسجيل مصروف جديد
            </button>
          )}

          {activeTab === 'إيرادات' && (
            <button
              onClick={() => {
                setExpenseRevenueModalType('إيراد');
                setEditingExpenseRevenueVoucher(null);
                setShowExpenseRevenueModal(true);
              }}
              className="px-2.5 py-0.5 bg-[#4f9d69] hover:bg-[#3f8055] text-white font-bold text-xs border border-[#3f8055] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              تسجيل إيراد جديد
            </button>
          )}

          {onNewVoucher && (
            <button
              onClick={() => onNewVoucher()}
              className="px-2 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold text-xs border border-[#afafaf] rounded-none flex items-center gap-1"
            >
              <Receipt className="w-3.5 h-3.5" />
              سند قبض / صرف
            </button>
          )}

          <button
            onClick={() => setShowFinancialTransferModal(true)}
            className="px-2.5 py-0.5 bg-[#243746] hover:bg-[#1a2935] text-white font-bold text-xs border border-[#1a2935] rounded-none flex items-center gap-1"
            title="تحويل مالي فعلي بين الخزائن والبنوك"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#88d49e]" />
            تحويل مالي بين الخزائن والبنوك
          </button>

          <button
            onClick={() => {
              setStatementModalInitialAccount(null);
              setShowAccountStatementModal(true);
            }}
            className="px-2.5 py-0.5 bg-[#243746] hover:bg-[#1a2935] text-white font-bold text-xs border border-[#1a2935] rounded-none flex items-center gap-1"
            title="محرك الأستاذ وكشوف الحسابات الموحد لجميع الحسابات"
          >
            <Scale className="w-3.5 h-3.5 text-[#e8836a]" />
            كشف حسابات موحد
          </button>

          <button
            onClick={exportActiveTabCSV}
            title="تصدير بيانات التبويب الحالي إلى ملف Excel / CSV"
            className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 font-bold text-xs border border-slate-300 rounded-none flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            تصدير إكسل
          </button>

          <button
            onClick={() => window.print()}
            title="طباعة سجل التبويب الحالي"
            className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-700 font-bold text-xs border border-slate-300 rounded-none flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            طباعة
          </button>
        </div>
      </div>

      {/* 3. MAIN DATA GRID AREA PER SUB-TAB */}
      <div className="flex-1 bg-white border-b border-slate-300 overflow-auto relative">

        {/* ===================== TAB 1: عملاء (CUSTOMERS) ===================== */}
        {activeTab === 'عملاء' && (
          <div className="flex h-full w-full divide-x divide-x-reverse divide-slate-200">
            {/* RIGHT SIDE: CUSTOMERS MASTER LIST */}
            <div className="w-[380px] lg:w-[430px] shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-hidden">
              <div className="bg-[#f0f7fc] px-2 py-1.5 border-b border-slate-200 text-xs font-bold text-[#1e3a5f] flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  قائمة العملاء ({filteredCustomers.length})
                </span>
                <span className="text-[10px] text-slate-500">اختر عميلاً لعرض حركاته</span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
                    <tr>
                      <th className="p-1.5 border-l border-[#e2e8f0] w-8 text-center">م</th>
                      <th className="p-1.5 border-l border-[#e2e8f0] w-16 text-center">الكود</th>
                      <th className="p-1.5 border-l border-[#e2e8f0]">اسم العميل</th>
                      <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#888888] font-bold">
                          لا توجد بيانات عملاء
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c, idx) => {
                        const isSelected = selectedStatementAcc?.id === c.id || (selectedStatementAcc?.type === 'عميل' && selectedStatementAcc?.code === c.code);
                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              setSelectedStatementAcc({
                                type: 'عميل',
                                name: c.name,
                                code: c.code,
                                phone: c.phone,
                                id: c.id,
                                balance: c.balance,
                                extraInfo: c.branch ? `الفرع: ${c.branch}` : undefined
                              });
                            }}
                            className={`cursor-pointer border-b border-[#d0d0d0] select-none transition-colors ${
                              isSelected
                                ? 'bg-[#dceef2] text-[#243746] font-bold ring-1 ring-inset ring-[#243746]'
                                : 'hover:bg-[#f2f7f9]'
                            }`}
                          >
                            <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{c.code}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0] font-bold truncate max-w-[150px]" title={c.name}>
                              <div>{c.name}</div>
                              {c.phone && <div className="text-[10px] text-[#666666] font-mono">{c.phone}</div>}
                            </td>
                            <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                              c.balance > 0 ? 'text-[#b85c5c]' : c.balance < 0 ? 'text-[#4f9d69]' : 'text-[#222222]'
                            }`}>
                              {(c.balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEFT SIDE: SPREADSHEET DETAIL MOVEMENTS TABLE */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedStatementAcc ? (
                <>
                  {/* Account Header Ribbon */}
                  <div className="bg-[#f0f4f8] p-2 border-b border-[#afafaf] flex items-center justify-between flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-[#dceef2] border border-[#afafaf] px-2 py-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#243746]" />
                        <span className="font-bold text-xs text-[#243746]">كشف حساب:</span>
                        <strong className="text-xs text-[#222222] font-black">{selectedStatementAcc.name}</strong>
                        <span className="text-[10px] text-[#666666] font-mono">({selectedStatementAcc.code})</span>
                      </div>
                      {selectedStatementAcc.phone && (
                        <span className="text-xs text-[#666666] font-mono font-bold">هاتف: {selectedStatementAcc.phone}</span>
                      )}
                      <div className="text-xs font-bold">
                        <span className="text-[#666666]">الرصيد الحالي: </span>
                        <span className={`font-mono font-black ${(selectedStatementAcc.balance || 0) > 0 ? 'text-[#b85c5c]' : 'text-[#4f9d69]'}`}>
                          {(selectedStatementAcc.balance || 0).toFixed(2)} ج.م
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Operations Dropdown */}
                      <AccountQuickOperationsDropdown
                        accountType="customer"
                        accountId={selectedStatementAcc.id}
                        accountName={selectedStatementAcc.name}
                        accountPhone={selectedStatementAcc.phone}
                        accountCode={selectedStatementAcc.code}
                        currentBalance={selectedStatementAcc.balance || 0}
                        customersList={customersList}
                        suppliersList={suppliersList}
                        vouchersList={vouchersList}
                        treasuriesList={treasuries}
                        currentUser={currentUser}
                        activeShift={activeShift}
                        selectedBranch={selectedBranch}
                        onUpdateCustomers={onUpdateCustomers}
                        onUpdateSuppliers={onUpdateSuppliers}
                        onUpdateVouchers={onUpdateVouchers}
                        onOperationComplete={(voucher, newBalance) => {
                          setSelectedStatementAcc(prev => prev ? { ...prev, balance: newBalance } : null);
                        }}
                      />

                      <div className="h-4 w-px bg-[#afafaf]" />

                      <button
                        onClick={() => {
                          setStatementModalInitialAccount({
                            id: selectedStatementAcc.id,
                            type: 'customer',
                            name: selectedStatementAcc.name,
                            code: selectedStatementAcc.code,
                            balance: selectedStatementAcc.balance
                          });
                          setShowAccountStatementModal(true);
                        }}
                        className="px-2.5 py-1 bg-[#243746] hover:bg-[#1a2935] text-white font-bold border border-[#1a2935] text-xs flex items-center gap-1"
                        title="فتح كشف الحساب الموسع والشامل"
                      >
                        <Scale className="w-3.5 h-3.5 text-[#e8836a]" />
                        كشف حساب موسع
                      </button>
                      <button
                        onClick={exportStatementCSV}
                        className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-xs flex items-center gap-1"
                        title="تصدير إلى CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        تصدير CSV
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-xs flex items-center gap-1"
                        title="طباعة كشف الحساب"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        طباعة
                      </button>
                    </div>
                  </div>

                  {/* Movements Spreadsheet Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
                        <tr>
                          <th className="p-1.5 border-l border-[#afafaf] w-8 text-center">م</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">التاريخ والوقت</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">نوع الحركة</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">رقم المرجع</th>
                          <th className="p-1.5 border-l border-[#afafaf]">البيان والتفاصيل</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">مدين (له)</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">دائن (عليه)</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد التراكمي</th>
                          <th className="p-1.5 text-center w-24">المستخدم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d0d0d0] text-[#222222]">
                        {/* Opening Balance Row */}
                        <tr className="bg-[#f0f4f8] font-bold">
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">0</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                            <span className="px-1.5 py-0.5 bg-[#e2e8f0] text-[#243746] text-[10px] border border-[#afafaf]">
                              رصيد سابق
                            </span>
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-[#666666]">رصيد افتتاحي سابق الحساب</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#243746]">
                            {(statementMovementsData.openingBalance || 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center text-[#999999]">-</td>
                        </tr>

                        {statementMovementsData.movements.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-12 text-center text-[#888888] font-bold">
                              لا توجد حركات مسجلة لهذا الحساب.
                            </td>
                          </tr>
                        ) : (
                          statementMovementsData.movements.map((m, idx) => (
                            <tr key={idx} className="hover:bg-[#f5f5f5] border-b border-[#d0d0d0]">
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                                {m.date} {m.time}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold">
                                <span className="px-1 py-0.5 bg-[#dceef2] text-[#243746] text-[10px] border border-[#afafaf]">
                                  {m.type}
                                </span>
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                                {m.refId}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] font-medium text-[#222222]">
                                {m.notes}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                                {m.debit > 0 ? (m.debit || 0).toFixed(2) : '-'}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                                {m.credit > 0 ? (m.credit || 0).toFixed(2) : '-'}
                              </td>
                              <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                                (m.runningBalance || 0) > 0 ? 'text-[#b85c5c]' : 'text-[#4f9d69]'
                              }`}>
                                {(m.runningBalance || 0).toFixed(2)}
                              </td>
                              <td className="p-1.5 text-center text-[#243746] font-bold text-[10px]">
                                {m.createdByName || 'غير محدد'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Account Statement Mini-Footer */}
                  <div className="bg-[#e8e8e8] px-3 py-1.5 border-t border-[#afafaf] flex items-center justify-between text-xs font-bold text-[#243746] shrink-0">
                    <span>عدد الحركات: <strong className="font-mono">{statementMovementsData.movements.length}</strong></span>
                    <div className="flex items-center gap-4">
                      <span>إجمالي مدين: <strong className="font-mono text-[#b85c5c]">{statementMovementsData.movements.reduce((s, m) => s + (m.debit || 0), 0).toFixed(2)}</strong></span>
                      <span>إجمالي دائن: <strong className="font-mono text-[#4f9d69]">{statementMovementsData.movements.reduce((s, m) => s + (m.credit || 0), 0).toFixed(2)}</strong></span>
                      <span>الرصيد الختامي: <strong className="font-mono text-[#243746]">{(statementMovementsData.closingBalance || 0).toFixed(2)} ج.م</strong></span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[#888888]">
                  <FileText className="w-12 h-12 text-[#cccccc] mb-2" />
                  <p className="font-bold text-sm text-[#666666]">يرجى اختيار عميل من القائمة لعرض كشف الحساب التفصيلي</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 2: موردين (SUPPLIERS) ===================== */}
        {activeTab === 'موردين' && (
          <div className="flex h-full w-full divide-x divide-x-reverse divide-[#afafaf]">
            {/* RIGHT SIDE: SUPPLIERS MASTER LIST */}
            <div className="w-[380px] lg:w-[430px] shrink-0 flex flex-col bg-white border-l border-[#afafaf] overflow-hidden">
              <div className="bg-[#e8e8e8] px-2 py-1.5 border-b border-[#afafaf] text-xs font-bold text-[#243746] flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  قائمة الموردين ({filteredSuppliers.length})
                </span>
                <span className="text-[10px] text-[#666666]">اختر مورداً لعرض حركاته</span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
                    <tr>
                      <th className="p-1.5 border-l border-[#afafaf] w-8 text-center">م</th>
                      <th className="p-1.5 border-l border-[#afafaf] w-16 text-center">الكود</th>
                      <th className="p-1.5 border-l border-[#afafaf]">اسم المورد</th>
                      <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#888888] font-bold">
                          لا توجد بيانات موردين
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((s, idx) => {
                        const isSelected = selectedStatementAcc?.id === s.id || (selectedStatementAcc?.type === 'مورد' && selectedStatementAcc?.code === s.code);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => {
                              setSelectedStatementAcc({
                                type: 'مورد',
                                name: s.name,
                                code: s.code,
                                phone: s.phone,
                                id: s.id,
                                balance: s.balance,
                                extraInfo: s.address ? `العنوان: ${s.address}` : undefined
                              });
                            }}
                            className={`cursor-pointer border-b border-[#d0d0d0] select-none transition-colors ${
                              isSelected
                                ? 'bg-[#dceef2] text-[#243746] font-bold ring-1 ring-inset ring-[#243746]'
                                : 'hover:bg-[#f2f7f9]'
                            }`}
                          >
                            <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{s.code}</td>
                            <td className="p-1.5 border-l border-[#d0d0d0] font-bold truncate max-w-[150px]" title={s.name}>
                              <div>{s.name}</div>
                              {s.phone && <div className="text-[10px] text-[#666666] font-mono">{s.phone}</div>}
                            </td>
                            <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                              (s.balance || 0) > 0 ? 'text-[#4f9d69]' : (s.balance || 0) < 0 ? 'text-[#b85c5c]' : 'text-[#222222]'
                            }`}>
                              {(s.balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEFT SIDE: SPREADSHEET DETAIL MOVEMENTS TABLE */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedStatementAcc ? (
                <>
                  {/* Account Header Ribbon */}
                  <div className="bg-[#f0f4f8] p-2 border-b border-[#afafaf] flex items-center justify-between flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-[#dceef2] border border-[#afafaf] px-2 py-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#243746]" />
                        <span className="font-bold text-xs text-[#243746]">كشف حساب:</span>
                        <strong className="text-xs text-[#222222] font-black">{selectedStatementAcc.name}</strong>
                        <span className="text-[10px] text-[#666666] font-mono">({selectedStatementAcc.code})</span>
                      </div>
                      {selectedStatementAcc.phone && (
                        <span className="text-xs text-[#666666] font-mono font-bold">هاتف: {selectedStatementAcc.phone}</span>
                      )}
                      <div className="text-xs font-bold">
                        <span className="text-[#666666]">الرصيد الحالي: </span>
                        <span className={`font-mono font-black ${(selectedStatementAcc.balance || 0) > 0 ? 'text-[#4f9d69]' : 'text-[#b85c5c]'}`}>
                          {(selectedStatementAcc.balance || 0).toFixed(2)} ج.م
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Operations Dropdown */}
                      <AccountQuickOperationsDropdown
                        accountType="supplier"
                        accountId={selectedStatementAcc.id}
                        accountName={selectedStatementAcc.name}
                        accountPhone={selectedStatementAcc.phone}
                        accountCode={selectedStatementAcc.code}
                        currentBalance={selectedStatementAcc.balance || 0}
                        customersList={customersList}
                        suppliersList={suppliersList}
                        vouchersList={vouchersList}
                        treasuriesList={treasuries}
                        currentUser={currentUser}
                        activeShift={activeShift}
                        selectedBranch={selectedBranch}
                        onUpdateCustomers={onUpdateCustomers}
                        onUpdateSuppliers={onUpdateSuppliers}
                        onUpdateVouchers={onUpdateVouchers}
                        onOperationComplete={(voucher, newBalance) => {
                          setSelectedStatementAcc(prev => prev ? { ...prev, balance: newBalance } : null);
                        }}
                      />

                      <div className="h-4 w-px bg-[#afafaf]" />

                      <button
                        onClick={() => {
                          setStatementModalInitialAccount({
                            id: selectedStatementAcc.id,
                            type: 'supplier',
                            name: selectedStatementAcc.name,
                            code: selectedStatementAcc.code,
                            balance: selectedStatementAcc.balance
                          });
                          setShowAccountStatementModal(true);
                        }}
                        className="px-2.5 py-1 bg-[#243746] hover:bg-[#1a2935] text-white font-bold border border-[#1a2935] text-xs flex items-center gap-1"
                        title="فتح كشف الحساب الموسع والشامل"
                      >
                        <Scale className="w-3.5 h-3.5 text-[#e8836a]" />
                        كشف حساب موسع
                      </button>
                      <button
                        onClick={exportStatementCSV}
                        className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-xs flex items-center gap-1"
                        title="تصدير إلى CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        تصدير CSV
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-xs flex items-center gap-1"
                        title="طباعة كشف الحساب"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        طباعة
                      </button>
                    </div>
                  </div>

                  {/* Movements Spreadsheet Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
                        <tr>
                          <th className="p-1.5 border-l border-[#afafaf] w-8 text-center">م</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">التاريخ والوقت</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">نوع الحركة</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">رقم المرجع</th>
                          <th className="p-1.5 border-l border-[#afafaf]">البيان والتفاصيل</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">مدين (له)</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">دائن (عليه)</th>
                          <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد التراكمي</th>
                          <th className="p-1.5 text-center w-24">المستخدم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d0d0d0] text-[#222222]">
                        {/* Opening Balance Row */}
                        <tr className="bg-[#f0f4f8] font-bold">
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">0</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                            <span className="px-1.5 py-0.5 bg-[#e2e8f0] text-[#243746] text-[10px] border border-[#afafaf]">
                              رصيد سابق
                            </span>
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-[#666666]">رصيد افتتاحي سابق الحساب</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">-</td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#243746]">
                            {(statementMovementsData.openingBalance || 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center text-[#999999]">-</td>
                        </tr>

                        {statementMovementsData.movements.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-12 text-center text-[#888888] font-bold">
                              لا توجد حركات مسجلة لهذا الحساب.
                            </td>
                          </tr>
                        ) : (
                          statementMovementsData.movements.map((m, idx) => (
                            <tr key={idx} className="hover:bg-[#f5f5f5] border-b border-[#d0d0d0]">
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                                {m.date} {m.time}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold">
                                <span className="px-1 py-0.5 bg-[#dceef2] text-[#243746] text-[10px] border border-[#afafaf]">
                                  {m.type}
                                </span>
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                                {m.refId}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] font-medium text-[#222222]">
                                {m.notes}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                                {m.debit > 0 ? (m.debit || 0).toFixed(2) : '-'}
                              </td>
                              <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                                {m.credit > 0 ? (m.credit || 0).toFixed(2) : '-'}
                              </td>
                              <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                                (m.runningBalance || 0) > 0 ? 'text-[#4f9d69]' : 'text-[#b85c5c]'
                              }`}>
                                {(m.runningBalance || 0).toFixed(2)}
                              </td>
                              <td className="p-1.5 text-center text-[#243746] font-bold text-[10px]">
                                {m.createdByName || 'غير محدد'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Account Statement Mini-Footer */}
                  <div className="bg-[#e8e8e8] px-3 py-1.5 border-t border-[#afafaf] flex items-center justify-between text-xs font-bold text-[#243746] shrink-0">
                    <span>عدد الحركات: <strong className="font-mono">{statementMovementsData.movements.length}</strong></span>
                    <div className="flex items-center gap-4">
                      <span>إجمالي مدين: <strong className="font-mono text-[#b85c5c]">{statementMovementsData.movements.reduce((s, m) => s + (m.debit || 0), 0).toFixed(2)}</strong></span>
                      <span>إجمالي دائن: <strong className="font-mono text-[#4f9d69]">{statementMovementsData.movements.reduce((s, m) => s + (m.credit || 0), 0).toFixed(2)}</strong></span>
                      <span>الرصيد الختامي: <strong className="font-mono text-[#243746]">{(statementMovementsData.closingBalance || 0).toFixed(2)} ج.م</strong></span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-[#888888]">
                  <FileText className="w-12 h-12 text-[#cccccc] mb-2" />
                  <p className="font-bold text-sm text-[#666666]">يرجى اختيار مورد من القائمة لعرض كشف الحساب التفصيلي</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: موظفين (EMPLOYEES) ===================== */}
        {activeTab === 'موظفين' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">كود الموظف</th>
                <th className="p-1.5 border-l border-[#afafaf]">اسم الموظف / العرض</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">اسم المستخدم</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الدور الوظيفي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-20 text-center">الحالة</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي المبيعات</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">التحصيلات</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">المصروفات</th>
                <th className="p-1.5 border-l border-[#afafaf] w-20 text-center">العمليات</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">تاريخ التسجيل</th>
                <th className="p-1.5 text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد بيانات موظفين مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{e.code}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">{e.displayName}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">{e.username}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className="inline-block px-1.5 py-0.2 bg-[#dceef2] text-[#243746] border border-[#afafaf] text-[10px] font-bold">
                        {e.roleName}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold ${
                        e.active ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' : 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
                      }`}>
                        {e.active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                      {e.totalSales.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {e.totalCollections.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                      {e.totalPayments.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                      {e.totalOperations}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[10px] text-[#666666]">
                      {e.createdAt}
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        onClick={() => {
                          setStatementModalInitialAccount({
                            id: e.id,
                            type: 'employee',
                            name: e.displayName,
                            code: e.code
                          });
                          setShowAccountStatementModal(true);
                        }}
                        className="px-2 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px]"
                        title="كشف حساب وسجل حركات الموظف"
                      >
                        سجل العمليات
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 4: خزن (TREASURIES) ===================== */}
        {activeTab === 'خزن' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">كود الخزنة</th>
                <th className="p-1.5 border-l border-[#afafaf]">اسم الخزنة / الدرج</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الرصيد الافتتاحي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">مبيعات نقدية (+)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">مشتريات نقدية (-)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">سندات قبض (+)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">سندات صرف (-)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">الرصيد النقدي الحالي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-20 text-center">الحركات</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredTreasuries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد خزن أو أدراج كاش مسجلة. اضغط على "خزنة / درج جديد" لإضافة خزنة.
                  </td>
                </tr>
              ) : (
                filteredTreasuries.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{t.code}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#243746]" />
                        <span>{t.name}</span>
                        {!t.active && <span className="text-[10px] bg-red-100 text-red-700 px-1 border border-red-200">معطلة</span>}
                      </div>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                      {t.opening.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {t.cashSales > 0 ? `+${t.cashSales.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                      {t.cashPurchases > 0 ? `-${t.cashPurchases.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {t.vouchersIn > 0 ? `+${t.vouchersIn.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                      {t.vouchersOut > 0 ? `-${t.vouchersOut.toFixed(2)}` : '-'}
                    </td>
                    <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                      t.balance >= 0 ? 'text-[#243746] bg-[#f0f9ff]' : 'text-[#b85c5c] bg-[#fdf2f2]'
                    }`}>
                      {t.balance.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                      {t.movementCount}
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setStatementModalInitialAccount({
                              id: t.id,
                              type: 'treasury',
                              name: t.name,
                              code: t.code,
                              balance: t.balance
                            });
                            setShowAccountStatementModal(true);
                          }}
                          className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px]"
                          title="كشف حركة الخزنة"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => {
                            setEditingTreasury(t.rawItem);
                            setShowTreasuryModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل الخزنة"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTreasury(t.id)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف الخزنة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 5: بنوك (BANKS) ===================== */}
        {activeTab === 'بنوك' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">كود الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf]">اسم البنك / الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf] w-48 text-center">رقم الحساب / الآيبان</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد الافتتاحي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي الإيداعات (+)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي المسحوبات (-)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">الرصيد البنكي الحالي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-20 text-center">الحركات</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredBanks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد حسابات بنكية مسجلة. اضغط على "حساب بنكي جديد" لإضافة حساب.
                  </td>
                </tr>
              ) : (
                filteredBanks.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{b.code}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-[#243746]" />
                        <span>{b.name}</span>
                        {!b.active && <span className="text-[10px] bg-red-100 text-red-700 px-1 border border-red-200">معطل</span>}
                      </div>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px] text-[#444444]">{b.accNumber || b.iban || '-'}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{b.opening.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {b.deposits > 0 ? `+${b.deposits.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">
                      {b.withdrawals > 0 ? `-${b.withdrawals.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#243746] bg-[#f0f9ff]">
                      {b.balance.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{b.movementCount}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setStatementModalInitialAccount({
                              id: b.id,
                              type: 'bank',
                              name: b.name,
                              code: b.code,
                              balance: b.balance
                            });
                            setShowAccountStatementModal(true);
                          }}
                          className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px]"
                          title="كشف حساب البنك"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => {
                            setEditingBank(b.rawItem);
                            setShowBankModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل الحساب البنكي"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteBank(b.id)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف الحساب البنكي"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 6: خاص مدين (SPECIAL DEBTORS) ===================== */}
        {activeTab === 'خاص مدين' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">كود الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf]">اسم الحساب الخاص</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">طبيعة الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد الافتتاحي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي مدين (لنا)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي دائن (المسدد)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">الرصيد المتبقي</th>
                <th className="p-1.5 border-l border-[#afafaf]">ملاحظات وبيان</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredSpecialDebtors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد حسابات خاصة مدينة مسجلة. اضغط على "حساب مدين جديد" لإضافة حساب.
                  </td>
                </tr>
              ) : (
                filteredSpecialDebtors.map((d, idx) => (
                  <tr key={d.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{d.code}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">{d.name}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className="inline-block px-1.5 py-0.2 bg-[#fdf2f2] text-[#b85c5c] border border-[#afafaf] text-[10px] font-bold">
                        خاص مدين
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">{d.opening.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">{d.debit.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">{d.credit.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#b85c5c] bg-[#fdf2f2]">
                      {d.balance.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-[#666666] text-[11px]">{d.notes}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setStatementModalInitialAccount({
                              id: d.id,
                              type: 'special_debtor',
                              name: d.name,
                              code: d.code,
                              balance: d.balance
                            });
                            setShowAccountStatementModal(true);
                          }}
                          className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px]"
                          title="كشف الحساب"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => {
                            setEditingSpecialAccount(d.rawItem);
                            setSpecialAccountDefaultType('DEBTOR');
                            setShowSpecialAccountModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل الحساب"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpecialAccount(d.id)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف الحساب"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 7: خاص دائن (SPECIAL CREDITORS) ===================== */}
        {activeTab === 'خاص دائن' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">كود الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf]">اسم الحساب الدائن</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">طبيعة الحساب</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد الافتتاحي</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي دائن (المستحق)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">إجمالي مدين (المسدد)</th>
                <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">الرصيد المستحق</th>
                <th className="p-1.5 border-l border-[#afafaf]">ملاحظات وبيان</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredSpecialCreditors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد حسابات خاصة دائنة مسجلة. اضغط على "حساب دائن جديد" لإضافة حساب.
                  </td>
                </tr>
              ) : (
                filteredSpecialCreditors.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{c.code}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">{c.name}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className="inline-block px-1.5 py-0.2 bg-[#f0f9ff] text-[#243746] border border-[#afafaf] text-[10px] font-bold">
                        خاص دائن
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">{c.opening.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">{c.credit.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#b85c5c]">{c.debit.toFixed(2)}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#4f9d69] bg-[#f0f9ff]">
                      {c.balance.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-[#666666] text-[11px]">{c.notes}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setStatementModalInitialAccount({
                              id: c.id,
                              type: 'special_creditor',
                              name: c.name,
                              code: c.code,
                              balance: c.balance
                            });
                            setShowAccountStatementModal(true);
                          }}
                          className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px]"
                          title="كشف الحساب"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => {
                            setEditingSpecialAccount(c.rawItem);
                            setSpecialAccountDefaultType('CREDITOR');
                            setShowSpecialAccountModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل الحساب"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpecialAccount(c.id)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف الحساب"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 8: شيكات (CHEQUES) ===================== */}
        {activeTab === 'شيكات' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">رقم الشيك</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">نوع الشيك</th>
                <th className="p-1.5 border-l border-[#afafaf]">البنك المسحوب عليه</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">تاريخ الاستحقاق</th>
                <th className="p-1.5 border-l border-[#afafaf]">الجهة / الساحب / المستفيد</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">قيمة الشيك</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">حالة الشيك</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">المستخدم</th>
                <th className="p-1.5 border-l border-[#afafaf]">ملاحظات</th>
                <th className="p-1.5 text-center w-40">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد شيكات مسجلة مطابقة للبحث والفلترة. اضغط على "تسجيل شيك جديد" لإضافة شيك.
                  </td>
                </tr>
              ) : (
                filteredCheques.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{c.chequeNumber}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border border-[#afafaf] ${
                        c.type === 'وارد' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'
                      }`}>
                        {c.type === 'وارد' ? 'شيك وارد (قبض)' : 'شيك صادر (صرف)'}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">{c.bankName}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px]">{c.dueDate}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">{c.partyName}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#243746]">
                      {c.amount.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border ${
                        c.status === 'محصل'
                          ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                          : c.status === 'تحت التحصيل'
                          ? 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
                          : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[11px] text-[#666666]">{c.createdByName}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-[#666666] text-[11px]">{c.notes}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {c.status === 'تحت التحصيل' && (
                          <>
                            <button
                              onClick={() => handleUpdateChequeStatus(c.id, 'COLLECTED')}
                              className="px-1.5 py-0.5 bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] border border-[#ceead6] font-bold text-[10px]"
                              title="تحصيل الشيك"
                            >
                              تحصيل
                            </button>
                            <button
                              onClick={() => handleUpdateChequeStatus(c.id, 'RETURNED')}
                              className="px-1.5 py-0.5 bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] border border-[#fad2cf] font-bold text-[10px]"
                              title="ارتداد الشيك"
                            >
                              مرتد
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingCheque(c.rawItem);
                            setShowChequeModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل الشيك"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCheque(c.id)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف الشيك"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 9: مصروفات (OPERATING EXPENSES) ===================== */}
        {activeTab === 'مصروفات' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">رقم السند</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">التاريخ والوقت</th>
                <th className="p-1.5 border-l border-[#afafaf] w-36">بند المصروف</th>
                <th className="p-1.5 border-l border-[#afafaf]">البيان والتفاصيل</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الخزنة / الدرج</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">المبلغ المنصرف</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الوردية</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">المستخدم</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد سندات مصروفات تشغيلية مسجلة. اضغط على "تسجيل مصروف جديد" لإضافة سند صرف.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{exp.id}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px]">
                      <div>{exp.date}</div>
                      {exp.time && <div className="text-[10px] text-[#666666]">{exp.time}</div>}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#b85c5c]">
                      <span className="inline-block px-1.5 py-0.2 bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      {exp.notes || 'مصروف تشغيلي عام'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold text-[#243746]">
                      {exp.treasury}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#c5221f] bg-[#fff5f5]">
                      {exp.amount.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px]">
                      {exp.shiftId ? (
                        <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border ${
                          activeShift && exp.shiftId === activeShift.id
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {exp.shiftId}
                        </span>
                      ) : (
                        <span className="text-[#888888]">-</span>
                      )}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[11px] text-[#666666]">{exp.createdByName}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExpenseRevenueVoucher(exp.rawItem);
                            setExpenseRevenueModalType('مصروف');
                            setShowExpenseRevenueModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل السند"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpenseRevenue(exp.rawItem)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف السند"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ===================== TAB 10: إيرادات (OPERATING REVENUES) ===================== */}
        {activeTab === 'إيرادات' && (
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">رقم السند</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">التاريخ والوقت</th>
                <th className="p-1.5 border-l border-[#afafaf] w-36">بند الإيراد</th>
                <th className="p-1.5 border-l border-[#afafaf]">البيان والتفاصيل</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الخزنة المستلمة</th>
                <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">المبلغ المقبوض</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الوردية</th>
                <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">المستخدم</th>
                <th className="p-1.5 text-center w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredRevenues.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-[#888888] font-bold">
                    لا توجد سندات إيرادات تشغيلية مسجلة. اضغط على "تسجيل إيراد جديد" لإضافة سند قبض.
                  </td>
                </tr>
              ) : (
                filteredRevenues.map((rev, idx) => (
                  <tr key={rev.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">{idx + 1}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">{rev.id}</td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px]">
                      <div>{rev.date}</div>
                      {rev.time && <div className="text-[10px] text-[#666666]">{rev.time}</div>}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#137333]">
                      <span className="inline-block px-1.5 py-0.2 bg-[#e6f4ea] text-[#137333] border border-[#ceead6] text-[10px]">
                        {rev.category}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      {rev.notes || 'إيراد تشغيلي عام'}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold text-[#243746]">
                      {rev.treasury}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#137333] bg-[#f0fdf4]">
                      {rev.amount.toFixed(2)} ج.م
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px]">
                      {rev.shiftId ? (
                        <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border ${
                          activeShift && rev.shiftId === activeShift.id
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {rev.shiftId}
                        </span>
                      ) : (
                        <span className="text-[#888888]">-</span>
                      )}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[11px] text-[#666666]">{rev.createdByName}</td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExpenseRevenueVoucher(rev.rawItem);
                            setExpenseRevenueModalType('إيراد');
                            setShowExpenseRevenueModal(true);
                          }}
                          className="p-1 bg-white hover:bg-gray-100 text-[#243746] border border-[#afafaf]"
                          title="تعديل السند"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpenseRevenue(rev.rawItem)}
                          className="p-1 bg-white hover:bg-red-50 text-red-600 border border-[#afafaf]"
                          title="حذف السند"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* 4. TOTALS SUMMARY FOOTER BAR */}
      <div className="bg-[#dceef2] border-t-2 border-[#afafaf] p-2 shrink-0 flex items-center justify-between text-xs font-bold text-[#243746] select-none">
        
        {/* Dynamic Summary based on active tab */}
        {activeTab === 'عملاء' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي عدد العملاء: <strong className="font-mono text-[#243746]">{filteredCustomers.length}</strong></span>
              <span>إجمالي مدين (لنا): <strong className="font-mono text-[#b85c5c]">{filteredCustomers.reduce((s, c) => s + (c.debit || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي دائن (علينا): <strong className="font-mono text-[#4f9d69]">{filteredCustomers.reduce((s, c) => s + (c.credit || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>صافي أرصدة العملاء: </span>
              <strong className="font-mono text-sm">{filteredCustomers.reduce((s, c) => s + (c.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'موردين' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي عدد الموردين: <strong className="font-mono text-[#243746]">{filteredSuppliers.length}</strong></span>
              <span>إجمالي مستحق للموردين (دائن): <strong className="font-mono text-[#4f9d69]">{filteredSuppliers.reduce((s, m) => s + (m.credit || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي دفعات مقدمة (مدين): <strong className="font-mono text-[#b85c5c]">{filteredSuppliers.reduce((s, m) => s + (m.debit || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>صافي حسابات الموردين: </span>
              <strong className="font-mono text-sm">{filteredSuppliers.reduce((s, m) => s + (m.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'موظفين' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي الموظفين: <strong className="font-mono text-[#243746]">{filteredEmployees.length}</strong></span>
              <span>الموظفين النشطين: <strong className="font-mono text-[#137333]">{filteredEmployees.filter(e => e.active).length}</strong></span>
              <span>إجمالي مبيعات فريق العمل: <strong className="font-mono text-[#243746]">{filteredEmployees.reduce((s, e) => s + (e.totalSales || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>إجمالي العمليات المنفذة: </span>
              <strong className="font-mono text-sm">{filteredEmployees.reduce((s, e) => s + (e.totalOperations || 0), 0)} عملية</strong>
            </div>
          </>
        )}

        {activeTab === 'خزن' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي عدد الخزائن والدرج: <strong className="font-mono text-[#243746]">{filteredTreasuries.length}</strong></span>
              <span>إجمالي الوارد النقدي (+): <strong className="font-mono text-[#4f9d69]">{filteredTreasuries.reduce((s, t) => s + (t.totalInflow || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي المنصرف النقدي (-): <strong className="font-mono text-[#b85c5c]">{filteredTreasuries.reduce((s, t) => s + (t.totalOutflow || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>إجمالي السيولة النقدية بالخزائن: </span>
              <strong className="font-mono text-sm">{filteredTreasuries.reduce((s, t) => s + (t.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'بنوك' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي الحسابات البنكية: <strong className="font-mono text-[#243746]">{filteredBanks.length}</strong></span>
              <span>إجمالي الإيداعات: <strong className="font-mono text-[#4f9d69]">{filteredBanks.reduce((s, b) => s + (b.deposits || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي المسحوبات: <strong className="font-mono text-[#b85c5c]">{filteredBanks.reduce((s, b) => s + (b.withdrawals || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>إجمالي الأرصدة البنكية والشبكات: </span>
              <strong className="font-mono text-sm">{filteredBanks.reduce((s, b) => s + (b.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'خاص مدين' && (
          <>
            <div className="flex items-center gap-4">
              <span>عدد الحسابات الخاصة المدينة: <strong className="font-mono text-[#243746]">{filteredSpecialDebtors.length}</strong></span>
              <span>إجمالي المبالغ المستحقة لنا: <strong className="font-mono text-[#b85c5c]">{filteredSpecialDebtors.reduce((s, d) => s + (d.debit || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي المسدد: <strong className="font-mono text-[#4f9d69]">{filteredSpecialDebtors.reduce((s, d) => s + (d.credit || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>صافي المستحق طرف المدينين: </span>
              <strong className="font-mono text-sm">{filteredSpecialDebtors.reduce((s, d) => s + (d.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'خاص دائن' && (
          <>
            <div className="flex items-center gap-4">
              <span>عدد الحسابات الخاصة الدائنة: <strong className="font-mono text-[#243746]">{filteredSpecialCreditors.length}</strong></span>
              <span>إجمالي الالتزامات الدائنة: <strong className="font-mono text-[#4f9d69]">{filteredSpecialCreditors.reduce((s, c) => s + (c.credit || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>إجمالي المسدد منها: <strong className="font-mono text-[#b85c5c]">{filteredSpecialCreditors.reduce((s, c) => s + (c.debit || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>صافي الالتزامات المستحقة: </span>
              <strong className="font-mono text-sm">{filteredSpecialCreditors.reduce((s, c) => s + (c.balance || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'شيكات' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي الشيكات: <strong className="font-mono text-[#243746]">{filteredCheques.length}</strong></span>
              <span>شيكات واردة: <strong className="font-mono text-[#137333]">{filteredCheques.filter(c => c.type === 'وارد').reduce((s, c) => s + (c.amount || 0), 0).toFixed(2)} ج.م</strong></span>
              <span>شيكات صادرة: <strong className="font-mono text-[#c5221f]">{filteredCheques.filter(c => c.type === 'صادر').reduce((s, c) => s + (c.amount || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>تحت التحصيل: </span>
              <strong className="font-mono text-sm text-[#b06000]">
                {filteredCheques.filter(c => c.status === 'تحت التحصيل').reduce((s, c) => s + (c.amount || 0), 0).toFixed(2)} ج.م
              </strong>
            </div>
          </>
        )}

        {activeTab === 'مصروفات' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي عدد سندات المصروفات: <strong className="font-mono text-[#243746]">{filteredExpenses.length}</strong></span>
              <span>مصروفات الوردية الحالية: <strong className="font-mono text-[#b85c5c]">{filteredExpenses.filter(e => activeShift && e.shiftId === activeShift.id).reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>إجمالي المنصرف التشغيلي: </span>
              <strong className="font-mono text-sm text-[#c5221f]">{filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

        {activeTab === 'إيرادات' && (
          <>
            <div className="flex items-center gap-4">
              <span>إجمالي عدد سندات الإيرادات: <strong className="font-mono text-[#243746]">{filteredRevenues.length}</strong></span>
              <span>إيرادات الوردية الحالية: <strong className="font-mono text-[#137333]">{filteredRevenues.filter(r => activeShift && r.shiftId === activeShift.id).reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)} ج.م</strong></span>
            </div>
            <div className="bg-white border border-[#afafaf] px-3 py-1 text-[#243746]">
              <span>إجمالي المقبوض التشغيلي: </span>
              <strong className="font-mono text-sm text-[#137333]">{filteredRevenues.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2)} ج.م</strong>
            </div>
          </>
        )}

      </div>

      {/* ===================== ENTITY CRUD MODALS ===================== */}
      {showTreasuryModal && (
        <TreasuryModal
          isOpen={showTreasuryModal}
          treasuryToEdit={editingTreasury}
          existingTreasuries={treasuries}
          selectedBranch={selectedBranch}
          onClose={() => {
            setShowTreasuryModal(false);
            setEditingTreasury(null);
          }}
          onSave={handleSaveTreasury}
          onDelete={handleDeleteTreasury}
        />
      )}

      {showBankModal && (
        <BankModal
          isOpen={showBankModal}
          bankToEdit={editingBank}
          existingBanks={banks}
          selectedBranch={selectedBranch}
          onClose={() => {
            setShowBankModal(false);
            setEditingBank(null);
          }}
          onSave={handleSaveBank}
          onDelete={handleDeleteBank}
        />
      )}

      {showSpecialAccountModal && (
        <SpecialAccountModal
          isOpen={showSpecialAccountModal}
          accountToEdit={editingSpecialAccount}
          defaultType={specialAccountDefaultType}
          existingAccounts={specialAccounts}
          selectedBranch={selectedBranch}
          onClose={() => {
            setShowSpecialAccountModal(false);
            setEditingSpecialAccount(null);
          }}
          onSave={handleSaveSpecialAccount}
          onDelete={handleDeleteSpecialAccount}
        />
      )}

      {showChequeModal && (
        <ChequeModal
          isOpen={showChequeModal}
          chequeToEdit={editingCheque}
          currentUser={currentUser}
          existingCheques={cheques}
          onClose={() => {
            setShowChequeModal(false);
            setEditingCheque(null);
          }}
          onSave={handleSaveCheque}
          onDelete={handleDeleteCheque}
        />
      )}

      {showExpenseRevenueModal && (
        <ExpenseRevenueModal
          isOpen={showExpenseRevenueModal}
          initialType={expenseRevenueModalType === 'مصروف' ? 'صرف' : 'قبض'}
          initialPartyType={expenseRevenueModalType === 'مصروف' ? 'expense' : 'revenue'}
          editingVoucher={editingExpenseRevenueVoucher}
          treasuriesList={treasuries}
          activeShift={activeShift}
          currentUser={currentUser}
          onClose={() => {
            setShowExpenseRevenueModal(false);
            setEditingExpenseRevenueVoucher(null);
          }}
          onSave={handleSaveExpenseRevenue}
        />
      )}

      {showFinancialTransferModal && (
        <FinancialTransferModal
          isOpen={showFinancialTransferModal}
          treasuriesList={treasuries}
          banksList={banks}
          treasuryBalances={treasuryBalancesMap}
          bankBalances={bankBalancesMap}
          activeShift={activeShift}
          currentUser={currentUser}
          onClose={() => setShowFinancialTransferModal(false)}
          onSave={handleSaveFinancialTransfer}
        />
      )}

      {showAccountStatementModal && (
        <AccountStatementView
          isOpen={showAccountStatementModal}
          isModal={true}
          initialAccount={statementModalInitialAccount || undefined}
          customersList={customersList}
          suppliersList={suppliersList}
          treasuriesList={treasuries}
          banksList={banks}
          specialAccountsList={specialAccounts}
          usersList={usersList}
          completedInvoices={completedInvoices}
          vouchersList={vouchersList}
          financialTransfers={financialTransfers}
          shiftsList={[]}
          currentUser={currentUser}
          activeShift={activeShift}
          selectedBranch={selectedBranch}
          onUpdateCustomers={onUpdateCustomers}
          onUpdateSuppliers={onUpdateSuppliers}
          onUpdateVouchers={onUpdateVouchers}
          onClose={() => {
            setShowAccountStatementModal(false);
            setStatementModalInitialAccount(null);
          }}
        />
      )}


    </div>
  );
}
