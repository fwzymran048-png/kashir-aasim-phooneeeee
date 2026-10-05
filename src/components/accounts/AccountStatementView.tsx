import React, { useState, useMemo } from 'react';
import {
  SavedInvoice,
  Voucher,
  FinancialTransfer,
  Customer,
  Supplier,
  Treasury,
  Bank,
  SpecialAccount,
  User,
  Shift
} from '../../services/storage';
import {
  buildAccountStatement,
  exportStatementToCSV,
  LedgerAccountTarget,
  AccountLedgerType,
  LedgerDatePreset,
  StatementMovement
} from '../../services/financialLedgerEngine';
import {
  FileText,
  Search,
  Download,
  Printer,
  Calendar,
  Layers,
  Filter,
  X,
  Eye,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  Wallet,
  Building2,
  Users,
  Truck,
  UserCheck,
  Receipt,
  Scale
} from 'lucide-react';
import AccountQuickOperationsDropdown from './AccountQuickOperationsDropdown';

interface AccountStatementViewProps {
  isOpen?: boolean;
  initialAccount?: LedgerAccountTarget | null;
  customersList?: Customer[];
  suppliersList?: Supplier[];
  treasuriesList?: Treasury[];
  banksList?: Bank[];
  specialAccountsList?: SpecialAccount[];
  usersList?: User[];
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  financialTransfers?: FinancialTransfer[];
  shiftsList?: Shift[];
  activeShift?: Shift | null;
  currentUser?: User | null;
  selectedBranch?: string;
  isModal?: boolean;
  onUpdateCustomers?: (items: Customer[]) => void;
  onUpdateSuppliers?: (items: Supplier[]) => void;
  onUpdateVouchers?: (items: Voucher[]) => void;
  onClose?: () => void;
}

export default function AccountStatementView({
  isOpen = true,
  initialAccount,
  customersList = [],
  suppliersList = [],
  treasuriesList = [],
  banksList = [],
  specialAccountsList = [],
  usersList = [],
  completedInvoices = [],
  vouchersList = [],
  financialTransfers = [],
  shiftsList = [],
  activeShift,
  currentUser,
  selectedBranch = 'الفرع الرئيسي',
  isModal = false,
  onUpdateCustomers,
  onUpdateSuppliers,
  onUpdateVouchers,
  onClose
}: AccountStatementViewProps) {
  if (isModal && !isOpen) return null;

  // Selected Account Type and Target
  const [selectedAccType, setSelectedAccType] = useState<AccountLedgerType>(initialAccount?.type || 'عميل');
  const [selectedAccId, setSelectedAccId] = useState<string>(initialAccount?.id || '');

  // Date Filter States
  const [datePreset, setDatePreset] = useState<LedgerDatePreset>('all');
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Search & Movement Type Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('الكل');

  // Document Trace Modal State
  const [tracedDocument, setTracedDocument] = useState<StatementMovement | null>(null);

  // Build the unified list of accounts for selector
  const availableAccounts = useMemo(() => {
    const list: LedgerAccountTarget[] = [];

    if (selectedAccType === 'عميل') {
      customersList.forEach(c => {
        list.push({
          type: 'عميل',
          id: c.id,
          name: c.name,
          code: (c as any).code || c.id,
          phone: c.phone,
          balance: c.balance,
          extraInfo: (c as any).branch ? `الفرع: ${(c as any).branch}` : undefined
        });
      });
    } else if (selectedAccType === 'مورد') {
      suppliersList.forEach(s => {
        list.push({
          type: 'مورد',
          id: s.id,
          name: s.name,
          code: (s as any).code || s.id,
          phone: s.phone,
          balance: s.balance,
          extraInfo: s.address ? `العنوان: ${s.address}` : undefined
        });
      });
    } else if (selectedAccType === 'خزنة' || selectedAccType === 'خزنة / درج') {
      treasuriesList.forEach(t => {
        list.push({
          type: 'خزنة / درج',
          id: t.id,
          name: t.name,
          code: t.code,
          balance: (t as any).balance ?? t.openingBalance,
          openingBalance: t.openingBalance,
          extraInfo: (t as any).branchId ? `الفرع: ${(t as any).branchId}` : undefined
        });
      });
    } else if (selectedAccType === 'بنك') {
      banksList.forEach(b => {
        list.push({
          type: 'بنك',
          id: b.id,
          name: b.name,
          code: b.code,
          balance: (b as any).balance ?? b.openingBalance,
          openingBalance: b.openingBalance,
          extraInfo: `رقم الحساب: ${b.accountNumber || b.IBAN || '-'}`
        });
      });
    } else if (selectedAccType === 'خاص مدين') {
      specialAccountsList
        .filter(sa => sa.type === 'DEBTOR' || (sa as any).type === 'خاص مدين')
        .forEach(sa => {
          list.push({
            type: 'خاص مدين',
            id: sa.id,
            name: sa.name,
            code: sa.code,
            balance: (sa as any).balance ?? sa.openingBalance,
            openingBalance: sa.openingBalance,
            extraInfo: sa.notes
          });
        });
    } else if (selectedAccType === 'خاص دائن') {
      specialAccountsList
        .filter(sa => sa.type === 'CREDITOR' || (sa as any).type === 'خاص دائن')
        .forEach(sa => {
          list.push({
            type: 'خاص دائن',
            id: sa.id,
            name: sa.name,
            code: sa.code,
            balance: (sa as any).balance ?? sa.openingBalance,
            openingBalance: sa.openingBalance,
            extraInfo: sa.notes
          });
        });
    } else if (selectedAccType === 'موظف' || selectedAccType === 'مستخدم') {
      usersList.forEach(u => {
        list.push({
          type: 'موظف',
          id: u.id,
          name: u.displayName || u.username,
          code: u.username,
          extraInfo: `الدور: ${u.roleId}`
        });
      });
    }

    return list;
  }, [selectedAccType, customersList, suppliersList, treasuriesList, banksList, specialAccountsList, usersList]);

  // Current active account target
  const currentAccount = useMemo(() => {
    if (initialAccount && initialAccount.id === selectedAccId) {
      return initialAccount;
    }
    const found = availableAccounts.find(a => a.id === selectedAccId || a.name === selectedAccId);
    if (found) return found;
    if (availableAccounts.length > 0) return availableAccounts[0];
    return initialAccount || null;
  }, [availableAccounts, selectedAccId, initialAccount]);

  // Sync selectedAccId when account list changes or type changes
  React.useEffect(() => {
    if (availableAccounts.length > 0 && !availableAccounts.some(a => a.id === selectedAccId)) {
      setSelectedAccId(availableAccounts[0].id);
    }
  }, [availableAccounts, selectedAccId]);

  // Build the Statement Data using pure calculation engine
  const statementData = useMemo(() => {
    if (!currentAccount) return null;

    return buildAccountStatement({
      account: currentAccount,
      completedInvoices,
      vouchersList,
      financialTransfers,
      datePreset,
      fromDate: datePreset === 'custom' ? fromDate : undefined,
      toDate: datePreset === 'custom' ? toDate : undefined,
      searchQuery,
      movementTypeFilter
    });
  }, [
    currentAccount,
    completedInvoices,
    vouchersList,
    financialTransfers,
    datePreset,
    fromDate,
    toDate,
    searchQuery,
    movementTypeFilter
  ]);

  // Preset Date Filter Handler
  const handleDatePresetClick = (preset: LedgerDatePreset) => {
    setDatePreset(preset);
  };

  const isDebtorType =
    currentAccount?.type === 'عميل' ||
    currentAccount?.type === 'خاص مدين' ||
    currentAccount?.type === 'خزنة' ||
    currentAccount?.type === 'خزنة / درج' ||
    currentAccount?.type === 'بنك';

  const containerContent = (
    <div className="flex flex-col h-full bg-[#f0f0f0] text-xs dir-rtl select-none overflow-hidden" dir="rtl">
      {/* 1. TOP TOOLBAR / ACCOUNT SELECTOR & ACTIONS */}
      <div className="bg-[#e8e8e8] border-b border-[#afafaf] p-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Title & Icon */}
          <div className="flex items-center gap-2">
            <div className="bg-[#243746] text-white p-1 border border-[#1a2935]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#222222] text-sm flex items-center gap-1.5">
                <span>كشف الحساب المالي والأستاذ المساعد</span>
                <span className="text-[10px] font-mono text-[#666666] bg-[#dceef2] px-1.5 py-0.5 border border-[#afafaf]">
                  Financial Statement Engine
                </span>
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => statementData && exportStatementToCSV(statementData)}
              disabled={!statementData}
              className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold text-xs border border-[#afafaf] rounded-none flex items-center gap-1"
              title="تصدير كشف الحساب إلى ملف Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </button>

            <button
              onClick={() => window.print()}
              disabled={!statementData}
              className="px-2.5 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold text-xs border border-[#afafaf] rounded-none flex items-center gap-1"
              title="طباعة كشف الحساب الحالي"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>

            {isModal && onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-[#b85c5c] hover:bg-[#a34b4b] text-white font-bold text-xs border border-[#a34b4b] rounded-none flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                إغلاق
              </button>
            )}
          </div>
        </div>

        {/* Account Type Tabs & Account Dropdown */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#d0d0d0]">
          {/* Account Category Selector */}
          <div className="flex items-center gap-1 bg-[#f0f0f0] p-0.5 border border-[#afafaf]">
            <button
              onClick={() => setSelectedAccType('عميل')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'عميل'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <Users className="w-3 h-3" />
              عملاء
            </button>
            <button
              onClick={() => setSelectedAccType('مورد')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'مورد'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <Truck className="w-3 h-3" />
              موردين
            </button>
            <button
              onClick={() => setSelectedAccType('خزنة / درج')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'خزنة / درج' || selectedAccType === 'خزنة'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <Wallet className="w-3 h-3" />
              خزن وأدراج
            </button>
            <button
              onClick={() => setSelectedAccType('بنك')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'بنك'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <Building2 className="w-3 h-3" />
              بنوك
            </button>
            <button
              onClick={() => setSelectedAccType('خاص مدين')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'خاص مدين'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <FileText className="w-3 h-3" />
              خاص مدين
            </button>
            <button
              onClick={() => setSelectedAccType('خاص دائن')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'خاص دائن'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <Receipt className="w-3 h-3" />
              خاص دائن
            </button>
            <button
              onClick={() => setSelectedAccType('موظف')}
              className={`px-2.5 py-1 font-bold rounded-none flex items-center gap-1 text-xs border ${
                selectedAccType === 'موظف' || selectedAccType === 'مستخدم'
                  ? 'bg-[#243746] text-white border-[#1a2935]'
                  : 'bg-white text-[#243746] border-[#afafaf] hover:bg-[#dceef2]'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              المستخدمين
            </button>
          </div>

          {/* Account Picker Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#333333]">اختيار الحساب:</span>
            <select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value)}
              className="px-2 py-1 bg-white border border-[#afafaf] font-bold text-[#243746] text-xs min-w-[200px] max-w-[280px]"
            >
              {availableAccounts.length === 0 ? (
                <option value="">لا توجد حسابات مسجلة في هذا التبويب</option>
              ) : (
                availableAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code ? `[${acc.code}] ` : ''}{acc.name} {acc.balance !== undefined ? `(${Number(acc.balance).toFixed(2)} ج.م)` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Date Presets & Filter Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#d0d0d0]">
          {/* Presets */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#555555] ml-1">الفترة:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'thisWeek', label: 'هذا الأسبوع' },
              { id: 'thisMonth', label: 'هذا الشهر' },
              { id: 'lastMonth', label: 'الشهر السابق' },
              { id: 'custom', label: 'فترة مخصصة' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleDatePresetClick(p.id as LedgerDatePreset)}
                className={`px-2 py-0.5 text-[11px] font-bold border rounded-none ${
                  datePreset === p.id
                    ? 'bg-[#243746] text-white border-[#1a2935]'
                    : 'bg-white text-[#333333] border-[#afafaf] hover:bg-[#dceef2]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-white px-2 py-0.5 border border-[#afafaf]">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#555555]">من:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-1 py-0.5 border border-[#afafaf] text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#555555]">إلى:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-1 py-0.5 border border-[#afafaf] text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Quick Movement Search & Type Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="بحث برقم المستند أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-6 pr-2 py-0.5 bg-white border border-[#afafaf] text-xs w-48 focus:outline-none focus:border-[#243746]"
              />
              <Search className="w-3.5 h-3.5 absolute left-1.5 text-[#888888]" />
            </div>

            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="px-1.5 py-0.5 bg-white border border-[#afafaf] text-xs font-bold"
            >
              <option value="الكل">كل الحركات</option>
              <option value="فواتير">فواتير فقط</option>
              <option value="مرتجعات">مرتجعات فقط</option>
              <option value="سندات">سندات قبض وصرف</option>
              <option value="تحويلات">تحويلات مالية</option>
              <option value="إيرادات ومصروفات">إيرادات ومصروفات</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT HEADER SUMMARY & BALANCES BAR */}
      {currentAccount && statementData && (
        <div className="bg-[#f0f4f8] border-b border-[#afafaf] p-2 flex items-center justify-between flex-wrap gap-2 shrink-0">
          {/* Account Profile Details */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white border border-[#afafaf] px-2 py-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#243746]" />
              <div>
                <div className="font-extrabold text-sm text-[#243746]">
                  {currentAccount.name}
                  {currentAccount.code && <span className="text-xs text-[#666666] font-mono mr-1">({currentAccount.code})</span>}
                </div>
                <div className="text-[10px] text-[#666666] flex items-center gap-2">
                  <span>نوع الحساب: <strong>{currentAccount.type}</strong></span>
                  {currentAccount.phone && <span>الهاتف: <strong className="font-mono">{currentAccount.phone}</strong></span>}
                  {currentAccount.extraInfo && <span>({currentAccount.extraInfo})</span>}
                </div>
              </div>
            </div>

            {/* Official Overall Balance */}
            {currentAccount.balance !== undefined && (
              <div className="bg-white border border-[#afafaf] px-2 py-1 text-center">
                <span className="text-[10px] text-[#666666] block font-bold">الرصيد الإجمالي الرسمي</span>
                <span className={`text-xs font-mono font-black ${
                  (currentAccount.balance || 0) > 0
                    ? isDebtorType ? 'text-[#b85c5c]' : 'text-[#4f9d69]'
                    : (currentAccount.balance || 0) < 0
                    ? isDebtorType ? 'text-[#4f9d69]' : 'text-[#b85c5c]'
                    : 'text-[#222222]'
                }`}>
                  {(currentAccount.balance || 0).toFixed(2)} ج.م
                </span>
              </div>
            )}
          </div>

          {/* 5-BOX CLASSIC ERP FINANCIAL METRICS */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Box 1: Opening Balance */}
            <div className="bg-white border border-[#afafaf] px-2.5 py-1 text-center min-w-[110px]">
              <span className="text-[10px] text-[#666666] block font-bold">رصيد أول الفترة</span>
              <span className="text-xs font-mono font-extrabold text-[#555555]">
                {statementData.openingBalance.toFixed(2)} ج.م
              </span>
            </div>

            {/* Box 2: Total Debit */}
            <div className="bg-[#fff9f8] border border-[#e8c0b8] px-2.5 py-1 text-center min-w-[110px]">
              <span className="text-[10px] text-[#b85c5c] block font-bold">إجمالي مدين (+)</span>
              <span className="text-xs font-mono font-extrabold text-[#b85c5c]">
                {statementData.totalDebit.toFixed(2)} ج.م
              </span>
            </div>

            {/* Box 3: Total Credit */}
            <div className="bg-[#f2f9f4] border border-[#b8dfc4] px-2.5 py-1 text-center min-w-[110px]">
              <span className="text-[10px] text-[#4f9d69] block font-bold">إجمالي دائن (-)</span>
              <span className="text-xs font-mono font-extrabold text-[#4f9d69]">
                {statementData.totalCredit.toFixed(2)} ج.م
              </span>
            </div>

            {/* Box 4: Net Movement */}
            <div className="bg-[#f7f9fa] border border-[#afafaf] px-2.5 py-1 text-center min-w-[110px]">
              <span className="text-[10px] text-[#666666] block font-bold">صافي حركة الفترة</span>
              <span className={`text-xs font-mono font-extrabold ${
                statementData.netMovement > 0 ? 'text-[#b85c5c]' : statementData.netMovement < 0 ? 'text-[#4f9d69]' : 'text-[#555555]'
              }`}>
                {statementData.netMovement > 0 ? `+${statementData.netMovement.toFixed(2)}` : statementData.netMovement.toFixed(2)} ج.م
              </span>
            </div>

            {/* Box 5: Closing Balance */}
            <div className="bg-[#dceef2] border border-[#afafaf] px-3 py-1 text-center min-w-[120px]">
              <span className="text-[10px] text-[#243746] block font-extrabold">الرصيد الختامي للفترة</span>
              <span className="text-sm font-mono font-black text-[#243746]">
                {statementData.closingBalance.toFixed(2)} ج.م
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Account Quick Operations Dropdown Bar for Customer/Supplier */}
      {currentAccount && (selectedAccType === 'عميل' || selectedAccType === 'مورد' || selectedAccType === 'customer' || selectedAccType === 'supplier') && (
        <div className="bg-[#f0f4f8] border-b border-[#afafaf] px-3 py-1.5 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs text-[#243746]">عمليات الحساب السريعة:</span>
            <AccountQuickOperationsDropdown
              accountType={selectedAccType === 'عميل' || selectedAccType === 'customer' ? 'customer' : 'supplier'}
              accountId={currentAccount.id}
              accountName={currentAccount.name}
              accountPhone={currentAccount.phone}
              accountCode={currentAccount.code}
              currentBalance={currentAccount.balance || 0}
              customersList={customersList}
              suppliersList={suppliersList}
              vouchersList={vouchersList}
              treasuriesList={treasuriesList}
              currentUser={currentUser}
              activeShift={activeShift}
              selectedBranch={selectedBranch}
              onUpdateCustomers={onUpdateCustomers}
              onUpdateSuppliers={onUpdateSuppliers}
              onUpdateVouchers={onUpdateVouchers}
            />
          </div>
        </div>
      )}

      {/* 3. MAIN SPREADSHEET LEDGER DATA GRID */}
      <div className="flex-1 bg-white overflow-auto relative">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#dceef2] text-[#243746] font-bold sticky top-0 border-b border-[#afafaf] z-10 select-none">
            <tr>
              <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">التاريخ</th>
              <th className="p-1.5 border-l border-[#afafaf] w-16 text-center">الوقت</th>
              <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">نوع الحركة</th>
              <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">رقم المستند / المرجع</th>
              <th className="p-1.5 border-l border-[#afafaf]">البيان والتفاصيل المحاسبية</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">مدين (له)</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">دائن (عليه)</th>
              <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">الرصيد التراكمي</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">المستخدم</th>
              <th className="p-1.5 text-center w-16">تتبع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d0d0d0] text-[#222222] font-medium">
            {/* Opening Balance Row */}
            {statementData && (
              <tr className="bg-[#f7f9fa] font-bold text-[#555555] border-b border-[#afafaf]">
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">0</td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">{statementData.dateRange.fromDate || '-'}</td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">00:00</td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                  <span className="bg-[#e8e8e8] px-1.5 py-0.2 border border-[#afafaf] text-[10px] text-[#333333]">
                    رصيد افتتاحي
                  </span>
                </td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">-</td>
                <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#555555]">
                  الرصيد الافتتاحي المستحق قبل بداية الفترة المحددة
                </td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">-</td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">-</td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black text-[#243746] bg-[#eef5f8]">
                  {statementData.openingBalance.toFixed(2)}
                </td>
                <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#888888]">-</td>
                <td className="p-1.5 text-center text-[#888888]">-</td>
              </tr>
            )}

            {/* Movements Rows */}
            {!statementData || statementData.movements.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-10 text-center text-[#888888] font-bold">
                  لا توجد حركات مالية مسجلة لهذا الحساب خلال الفترة والخيارات المحددة
                </td>
              </tr>
            ) : (
              statementData.movements.map((m, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-[#e8f1f5] transition-colors border-b border-[#d0d0d0] ${
                      isEven ? 'bg-white' : 'bg-[#fafafa]'
                    }`}
                  >
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#333333]">
                      {m.date}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666] text-[11px]">
                      {m.time}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className={`inline-block px-1.5 py-0.2 border text-[10px] font-bold rounded-none ${
                        m.sourceType === 'sale'
                          ? 'bg-[#eef9f2] text-[#2e7d32] border-[#a5d6a7]'
                          : m.sourceType === 'sale_return'
                          ? 'bg-[#fff3e0] text-[#e65100] border-[#ffcc80]'
                          : m.sourceType === 'purchase'
                          ? 'bg-[#e8f0fe] text-[#1565c0] border-[#90caf9]'
                          : m.sourceType === 'purchase_return'
                          ? 'bg-[#fce4ec] text-[#c2185b] border-[#f48fb1]'
                          : m.sourceType === 'receipt_voucher' || m.sourceType === 'revenue'
                          ? 'bg-[#e0f2f1] text-[#00695c] border-[#80cbc4]'
                          : m.sourceType === 'payment_voucher' || m.sourceType === 'expense'
                          ? 'bg-[#fbe9e7] text-[#d84315] border-[#ffab91]'
                          : m.sourceType === 'transfer_in' || m.sourceType === 'transfer_out'
                          ? 'bg-[#ede7f6] text-[#4527a0] border-[#b39ddb]'
                          : 'bg-[#f5f5f5] text-[#333333] border-[#cccccc]'
                      }`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                      {m.docNumber}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-[#222222] font-medium max-w-[280px] truncate" title={m.notes}>
                      {m.notes}
                    </td>
                    <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold ${
                      m.debit > 0 ? 'text-[#b85c5c] bg-[#fffbfb]' : 'text-[#888888]'
                    }`}>
                      {m.debit > 0 ? m.debit.toFixed(2) : '-'}
                    </td>
                    <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold ${
                      m.credit > 0 ? 'text-[#4f9d69] bg-[#f7fcf8]' : 'text-[#888888]'
                    }`}>
                      {m.credit > 0 ? m.credit.toFixed(2) : '-'}
                    </td>
                    <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-black ${
                      m.runningBalance > 0
                        ? isDebtorType ? 'text-[#b85c5c]' : 'text-[#4f9d69]'
                        : m.runningBalance < 0
                        ? isDebtorType ? 'text-[#4f9d69]' : 'text-[#b85c5c]'
                        : 'text-[#222222]'
                    } bg-[#f5f9fa]`}>
                      {m.runningBalance.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#555555] text-[11px] truncate max-w-[100px]" title={m.userName || '-'}>
                      {m.userName || '-'}
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        onClick={() => setTracedDocument(m)}
                        className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] font-bold text-[10px] flex items-center gap-0.5 mx-auto"
                        title="عرض تفاصيل المستند الأصلي"
                      >
                        <Eye className="w-3 h-3" />
                        عرض
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM STATUS BAR */}
      {statementData && (
        <div className="bg-[#e8e8e8] border-t border-[#afafaf] px-3 py-1.5 flex items-center justify-between text-xs font-bold text-[#243746] shrink-0">
          <div className="flex items-center gap-4">
            <span>عدد الحركات: <strong className="font-mono text-[#222222]">{statementData.totalCount}</strong></span>
            <span>إجمالي مدين: <strong className="font-mono text-[#b85c5c]">{statementData.totalDebit.toFixed(2)} ج.م</strong></span>
            <span>إجمالي دائن: <strong className="font-mono text-[#4f9d69]">{statementData.totalCredit.toFixed(2)} ج.م</strong></span>
            <span>صافي الحركة: <strong className="font-mono text-[#243746]">{statementData.netMovement.toFixed(2)} ج.م</strong></span>
          </div>

          <div>
            <span>الرصيد الختامي: <strong className="font-mono text-sm text-[#243746] bg-white px-2 py-0.5 border border-[#afafaf]">{statementData.closingBalance.toFixed(2)} ج.م</strong></span>
          </div>
        </div>
      )}

      {/* 5. DOCUMENT TRACE MODAL */}
      {tracedDocument && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#f0f0f0] border border-[#afafaf] max-w-lg w-full p-3 space-y-3 font-sans">
            <div className="bg-[#243746] text-white p-2 flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#88d49e]" />
                تفاصيل المستند الأصلي: [{tracedDocument.movementType}] #{tracedDocument.docNumber}
              </span>
              <button
                onClick={() => setTracedDocument(null)}
                className="text-white hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white border border-[#afafaf] p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-[#e0e0e0] pb-2 font-mono">
                <div><strong>رقم المستند:</strong> {tracedDocument.docNumber}</div>
                <div><strong>التاريخ والوقت:</strong> {tracedDocument.date} {tracedDocument.time}</div>
                <div><strong>نوع الحركة:</strong> {tracedDocument.movementType}</div>
                <div><strong>المستخدم / المحرر:</strong> {tracedDocument.userName || '-'}</div>
                {tracedDocument.shiftId && <div><strong>الوردية:</strong> {tracedDocument.shiftId}</div>}
                {tracedDocument.branch && <div><strong>الفرع:</strong> {tracedDocument.branch}</div>}
              </div>

              <div className="py-1">
                <strong>البيان والتفاصيل:</strong>
                <p className="text-[#333333] bg-[#f9f9f9] p-2 border border-[#afafaf] mt-1">
                  {tracedDocument.notes}
                </p>
              </div>

              {/* Items List if Invoice */}
              {tracedDocument.originalDocument?.items && (
                <div className="space-y-1">
                  <strong>الأصناف المدرجة في الفاتورة ({tracedDocument.originalDocument.items.length}):</strong>
                  <div className="max-h-36 overflow-auto border border-[#afafaf]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#dceef2] text-[#243746] font-bold">
                        <tr>
                          <th className="p-1 border-l border-[#afafaf]">الصنف</th>
                          <th className="p-1 border-l border-[#afafaf] text-center">الكمية</th>
                          <th className="p-1 border-l border-[#afafaf] text-center">السعر</th>
                          <th className="p-1 text-center">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tracedDocument.originalDocument.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-[#e0e0e0]">
                            <td className="p-1 border-l border-[#e0e0e0]">{item.name}</td>
                            <td className="p-1 border-l border-[#e0e0e0] text-center font-mono">{item.quantity}</td>
                            <td className="p-1 border-l border-[#e0e0e0] text-center font-mono">{item.price}</td>
                            <td className="p-1 text-center font-mono font-bold">{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial values */}
              <div className="grid grid-cols-2 gap-2 bg-[#f0f4f8] p-2 border border-[#afafaf] font-mono font-bold">
                <div>مدين (المستحق): <span className="text-[#b85c5c]">{tracedDocument.debit.toFixed(2)} ج.م</span></div>
                <div>دائن (المسدد): <span className="text-[#4f9d69]">{tracedDocument.credit.toFixed(2)} ج.م</span></div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTracedDocument(null)}
                className="px-4 py-1 bg-[#243746] text-white font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
        <div className="bg-[#f0f0f0] border-2 border-[#243746] w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
}
