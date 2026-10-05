import React, { useState, useMemo } from 'react';
import {
  SavedInvoice,
  Voucher,
  StockMovement,
  Customer,
  Supplier,
  User,
  Shift,
  InventoryItem,
  Treasury,
  Bank,
  SpecialAccount,
  FinancialTransfer,
  AuditLog,
  Role
} from '../services/storage';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  BarChart2,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Package,
  UserCheck,
  Clock,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Scale
} from 'lucide-react';
import ManagementDashboard from './reports/ManagementDashboard';
import AuditCenterView from './audit/AuditCenterView';
import AccountStatementView from './accounts/AccountStatementView';
import CategoryProfitabilityReport from './reports/CategoryProfitabilityReport';

interface ReportsViewProps {
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  stockMovements: StockMovement[];
  customersList: Customer[];
  suppliersList: Supplier[];
  inventoryDb?: InventoryItem[];
  treasuriesList?: Treasury[];
  banksList?: Bank[];
  specialAccountsList?: SpecialAccount[];
  financialTransfers?: FinancialTransfer[];
  shiftsList?: Shift[];
  activeShift?: Shift | null;
  selectedBranch: string;
  usersList?: User[];
  rolesList?: Role[];
  auditLogsList?: AuditLog[];
  currentUser?: User | null;
  onOpenShiftModal?: (shift?: Shift) => void;
}

export default function ReportsView({
  completedInvoices,
  vouchersList,
  stockMovements,
  customersList,
  suppliersList,
  inventoryDb = [],
  treasuriesList = [],
  banksList = [],
  specialAccountsList = [],
  financialTransfers = [],
  shiftsList = [],
  activeShift,
  selectedBranch,
  usersList = [],
  rolesList = [],
  auditLogsList,
  currentUser,
  onOpenShiftModal
}: ReportsViewProps) {
  // Report View Mode: 'dashboard' vs 'invoices' vs 'products' vs 'categories' vs 'shifts' vs 'audit' vs 'ledger'
  const [reportViewMode, setReportViewMode] = useState<'dashboard' | 'invoices' | 'products' | 'categories' | 'shifts' | 'audit' | 'ledger'>('dashboard');

  // Preset date filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom'>('today');
  
  // Custom date range
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Other filters
  const [movementFilter, setMovementFilter] = useState<string>('الكل');
  const [branchFilter, setBranchFilter] = useState<string>('الكل');
  const [userFilter, setUserFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique creator names/IDs for user filter dropdown
  const userOptions = useMemo(() => {
    const list: { id: string; name: string }[] = usersList.map(u => ({ id: u.id, name: u.displayName || u.username }));
    
    // Add any creator names from invoices not present in usersList
    completedInvoices.forEach(inv => {
      if (inv.createdByName && !list.some(u => u.name === inv.createdByName || u.id === inv.userId)) {
        list.push({ id: inv.userId || inv.createdByName, name: inv.createdByName });
      }
    });
    return list;
  }, [usersList, completedInvoices]);

  // Apply Date Preset logic
  const handlePresetChange = (preset: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const d = now.toISOString().split('T')[0];
      setFromDate(d);
      setToDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split('T')[0];
      setFromDate(d);
      setToDate(d);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    }
  };

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return completedInvoices.filter(inv => {
      // Branch filter
      if (branchFilter !== 'الكل' && inv.branch !== branchFilter) return false;

      // User filter
      if (userFilter !== 'الكل') {
        const matchesUserId = inv.userId === userFilter;
        const matchesCreatedName = inv.createdByName === userFilter;
        if (!matchesUserId && !matchesCreatedName) return false;
      }

      // Type filter
      if (movementFilter !== 'الكل' && movementFilter !== 'سندات' && inv.type !== movementFilter) return false;
      if (movementFilter === 'سندات') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCust = inv.customerName.toLowerCase().includes(q);
        const matchesSupp = inv.supplierName ? inv.supplierName.toLowerCase().includes(q) : false;
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesUser = inv.createdByName ? inv.createdByName.toLowerCase().includes(q) : false;
        const matchesItems = inv.items.some(i => i.name.toLowerCase().includes(q) || (i.code && i.code.toLowerCase().includes(q)));
        if (!matchesCust && !matchesSupp && !matchesId && !matchesUser && !matchesItems) return false;
      }

      return true;
    });
  }, [completedInvoices, branchFilter, userFilter, movementFilter, searchQuery]);

  // Filter Vouchers
  const filteredVouchers = useMemo(() => {
    if (movementFilter !== 'الكل' && movementFilter !== 'سندات' && movementFilter !== 'قبض' && movementFilter !== 'صرف') {
      return [];
    }

    return vouchersList.filter(v => {
      if (movementFilter === 'قبض' && v.type !== 'قبض') return false;
      if (movementFilter === 'صرف' && v.type !== 'صرف') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesId = v.id.toLowerCase().includes(q);
        const matchesNotes = v.notes ? v.notes.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesId && !matchesNotes) return false;
      }

      return true;
    });
  }, [vouchersList, movementFilter, searchQuery]);

  // Calculate Metrics using actual historical costPrice when available
  const totalSales = filteredInvoices
    .filter(i => i.type === 'بيع')
    .reduce((acc, i) => acc + i.total, 0);

  const totalPurchases = filteredInvoices
    .filter(i => i.type === 'شراء')
    .reduce((acc, i) => acc + i.total, 0);

  const totalSalesReturns = filteredInvoices
    .filter(i => i.type === 'مرتجع بيع')
    .reduce((acc, i) => acc + i.total, 0);

  const totalPurchaseReturns = filteredInvoices
    .filter(i => i.type === 'مرتجع شراء')
    .reduce((acc, i) => acc + i.total, 0);

  // Total Tax & Total Discount across filtered invoices
  const totalTax = filteredInvoices
    .reduce((acc, i) => acc + (i.tax || 0), 0);

  const totalDiscount = filteredInvoices
    .reduce((acc, i) => acc + (i.discount || 0), 0);

  // Exact COGS & Net Profit calculation using historical costPrice
  let totalSalesCost = 0;
  let knownSalesProfit = 0;
  let hasMissingSalesCost = false;

  filteredInvoices
    .filter(i => i.type === 'بيع')
    .forEach(i => {
      const hasAllCost = i.items.length > 0 && i.items.every(item => item.costPrice !== undefined);
      const invCost = i.items.reduce((cAcc, item) => {
        return cAcc + (item.costPrice !== undefined ? item.quantity * item.costPrice : 0);
      }, 0);

      totalSalesCost += invCost;
      if (hasAllCost) {
        knownSalesProfit += (i.total - invCost);
      } else {
        hasMissingSalesCost = true;
      }
    });

  const netProfit = hasMissingSalesCost
    ? (knownSalesProfit > 0 ? knownSalesProfit : null)
    : (totalSales - totalSalesReturns) - totalSalesCost;

  const totalReceiptsVouchers = filteredVouchers
    .filter(v => v.type === 'قبض')
    .reduce((acc, v) => acc + v.amount, 0);

  const totalPaymentVouchers = filteredVouchers
    .filter(v => v.type === 'صرف')
    .reduce((acc, v) => acc + v.amount, 0);

  // Aggregated Product Sales Summary calculation
  const productSalesSummary = useMemo(() => {
    const map = new Map<string, { code: string; name: string; category: string; quantity: number; revenue: number; cost: number; profit: number; hasMissingCost: boolean }>();

    filteredInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        inv.items.forEach(item => {
          const key = item.code || item.name;
          const itemRev = item.total || (item.quantity * item.price);
          const isCostKnown = item.costPrice !== undefined;
          const itemCost = isCostKnown ? item.quantity * item.costPrice! : 0;
          const itemProf = isCostKnown ? itemRev - itemCost : 0;

          if (map.has(key)) {
            const existing = map.get(key)!;
            existing.quantity += item.quantity;
            existing.revenue += itemRev;
            if (isCostKnown) {
              existing.cost += itemCost;
              existing.profit += itemProf;
            } else {
              existing.hasMissingCost = true;
            }
          } else {
            map.set(key, {
              code: item.code || 'غير محدد',
              name: item.name,
              category: item.category || 'عام',
              quantity: item.quantity,
              revenue: itemRev,
              cost: itemCost,
              profit: itemProf,
              hasMissingCost: !isCostKnown
            });
          }
        });
      });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // Filter Shifts
  const filteredShifts = useMemo(() => {
    return shiftsList.filter(shift => {
      // Branch filter
      if (branchFilter !== 'الكل' && shift.branch && shift.branch !== branchFilter) return false;

      // User filter
      if (userFilter !== 'الكل' && shift.userId !== userFilter && shift.userName !== userFilter) return false;

      // Date range filter based on shift openedAt
      const shiftDate = shift.openedAt ? shift.openedAt.split('T')[0] : '';
      if (shiftDate) {
        if (fromDate && shiftDate < fromDate) return false;
        if (toDate && shiftDate > toDate) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }, [shiftsList, branchFilter, userFilter, fromDate, toDate]);

  const exportCSV = () => {
    let rows: string[][] = [];

    if (reportViewMode === 'shifts') {
      rows = [
        ['كود الوردية', 'المستخدم / الكاشير', 'وقت الفتح', 'وقت الإغلاق', 'الرصيد الافتتاحي', 'إجمالي المبيعات', 'المتوقع في الخزينة', 'الفعلي المعدود', 'الفارق المالي', 'عدد الفواتير', 'الحالة', 'الفرع'],
        ...filteredShifts.map(s => [
          s.id,
          s.userName,
          new Date(s.openedAt).toLocaleString('ar-SA'),
          s.closedAt ? new Date(s.closedAt).toLocaleString('ar-SA') : 'مفتوحة نشطة',
          s.openingCash.toFixed(2),
          s.totalSales.toFixed(2),
          s.expectedCash.toFixed(2),
          s.actualCash !== undefined ? s.actualCash.toFixed(2) : '-',
          s.cashDifference !== undefined ? s.cashDifference.toFixed(2) : '-',
          s.invoiceCount.toString(),
          s.status === 'OPEN' ? 'مفتوحة' : 'مغلقة',
          s.branch || selectedBranch
        ])
      ];
    } else if (reportViewMode === 'products') {
      rows = [
        ['كود الصنف', 'اسم الصنف', 'الفئة', 'الكمية المباعة', 'إجمالي الإيراد (ج.م)', 'إجمالي التكلفة (ج.م)', 'إجمالي الربح (ج.م)'],
        ...productSalesSummary.map(p => [
          p.code,
          p.name,
          p.category,
          p.quantity.toString(),
          p.revenue.toFixed(2),
          p.hasMissingCost ? (p.cost > 0 ? p.cost.toFixed(2) : 'غير متاح') : p.cost.toFixed(2),
          p.hasMissingCost ? 'غير متاح' : p.profit.toFixed(2)
        ])
      ];
    } else {
      rows = [
        ['نوع الحركة', 'رقم الحركة', 'التاريخ والوقت', 'اسم العميل / المورد / البيان', 'المستخدم / الكاشير', 'عدد المواد', 'الإجمالي', 'المدفوع', 'المتبقي (الآجل)', 'الفرع'],
        ...filteredInvoices.map(i => [
          i.type,
          i.id,
          `${i.date} ${i.time}`,
          i.customerName || i.supplierName || 'عميل نقدي',
          i.createdByName || 'غير محدد',
          i.items.reduce((acc, item) => acc + item.quantity, 0).toString(),
          i.total.toString(),
          i.paid.toString(),
          i.remaining.toString(),
          i.branch
        ]),
        ...filteredVouchers.map(v => [
          `سند ${v.type}`,
          v.id,
          v.date,
          v.name,
          v.createdByName || 'غير محدد',
          '1',
          v.amount.toString(),
          v.amount.toString(),
          '0',
          v.drawer
        ])
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_${reportViewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (reportViewMode === 'dashboard') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
        {/* HEADER SUB-NAV */}
        <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
              <LayoutDashboard className="w-5 h-5 text-[#243746]" />
              <span>لوحة التحكم الإدارية (Management Dashboard)</span>
            </div>

            {/* Report View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
              <button
                onClick={() => setReportViewMode('dashboard')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#243746] text-white border-[#afafaf]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم الإدارية
              </button>
              <button
                onClick={() => setReportViewMode('invoices')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5" />
                جدول الفواتير والسندات
              </button>
              <button
                onClick={() => setReportViewMode('products')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Package className="w-3.5 h-3.5" />
                تجميع المبيعات حسب الأصناف
              </button>
              <button
                onClick={() => setReportViewMode('categories')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5 text-[#e8836a]" />
                ربحية الأقسام والتصنيفات
              </button>
              <button
                onClick={() => setReportViewMode('shifts')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Clock className="w-3.5 h-3.5" />
                سجل وتقارير الورديات ({shiftsList.length})
              </button>
              <button
                onClick={() => setReportViewMode('ledger')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Scale className="w-3.5 h-3.5" />
                كشف الحسابات والأستاذ المالي
              </button>
              <button
                onClick={() => setReportViewMode('audit')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#e8836a]" />
                مركز التدقيق والمراجعة
              </button>
            </div>
          </div>
        </div>

        {/* DASHBOARD COMPONENT */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ManagementDashboard
            completedInvoices={completedInvoices}
            vouchersList={vouchersList}
            stockMovements={stockMovements}
            customersList={customersList}
            suppliersList={suppliersList}
            inventoryDb={inventoryDb}
            treasuriesList={treasuriesList}
            shiftsList={shiftsList}
            activeShift={activeShift}
            selectedBranch={selectedBranch}
            usersList={usersList}
            onOpenShiftModal={onOpenShiftModal}
          />
        </div>
      </div>
    );
  }

  // RENDER DEDICATED FINANCIAL LEDGER & STATEMENT VIEW
  if (reportViewMode === 'ledger') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
        {/* HEADER SUB-NAV */}
        <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
              <Scale className="w-5 h-5 text-[#243746]" />
              <span>محرك الأستاذ وكشوف الحسابات الموحد (Financial Ledger & Account Statement Engine)</span>
            </div>

            {/* Report View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
              <button
                onClick={() => setReportViewMode('dashboard')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم الإدارية
              </button>
              <button
                onClick={() => setReportViewMode('invoices')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5" />
                جدول الفواتير والسندات
              </button>
              <button
                onClick={() => setReportViewMode('products')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Package className="w-3.5 h-3.5" />
                تجميع المبيعات حسب الأصناف
              </button>
              <button
                onClick={() => setReportViewMode('categories')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5 text-[#e8836a]" />
                ربحية الأقسام والتصنيفات
              </button>
              <button
                onClick={() => setReportViewMode('shifts')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Clock className="w-3.5 h-3.5" />
                سجل وتقارير الورديات ({shiftsList.length})
              </button>
              <button
                onClick={() => setReportViewMode('ledger')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#243746] text-white border-[#afafaf]"
              >
                <Scale className="w-3.5 h-3.5" />
                كشف الحسابات والأستاذ المالي
              </button>
              <button
                onClick={() => setReportViewMode('audit')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#e8836a]" />
                مركز التدقيق والمراجعة
              </button>
            </div>
          </div>
        </div>

        {/* ACCOUNT STATEMENT VIEW COMPONENT */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 border border-[#afafaf]">
          <AccountStatementView
            customersList={customersList}
            suppliersList={suppliersList}
            treasuriesList={treasuriesList}
            banksList={banksList}
            specialAccountsList={specialAccountsList}
            usersList={usersList}
            completedInvoices={completedInvoices}
            vouchersList={vouchersList}
            financialTransfers={financialTransfers}
            shiftsList={shiftsList}
            selectedBranch={selectedBranch}
          />
        </div>
      </div>
    );
  }

  // RENDER DEDICATED AUDIT CENTER VIEW
  if (reportViewMode === 'audit') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
        {/* HEADER SUB-NAV */}
        <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
              <ShieldCheck className="w-5 h-5 text-[#e8836a]" />
              <span>مركز التدقيق والمراجعة والرقابة الأمنية (Audit & Compliance Center)</span>
            </div>

            {/* Report View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
              <button
                onClick={() => setReportViewMode('dashboard')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم الإدارية
              </button>
              <button
                onClick={() => setReportViewMode('invoices')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5" />
                جدول الفواتير والسندات
              </button>
              <button
                onClick={() => setReportViewMode('products')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Package className="w-3.5 h-3.5" />
                تجميع المبيعات حسب الأصناف
              </button>
              <button
                onClick={() => setReportViewMode('categories')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5 text-[#e8836a]" />
                ربحية الأقسام والتصنيفات
              </button>
              <button
                onClick={() => setReportViewMode('shifts')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Clock className="w-3.5 h-3.5" />
                سجل وتقارير الورديات ({shiftsList.length})
              </button>
              <button
                onClick={() => setReportViewMode('ledger')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Scale className="w-3.5 h-3.5" />
                كشف الحسابات والأستاذ المالي
              </button>
              <button
                onClick={() => setReportViewMode('audit')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#243746] text-white border-[#afafaf]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#e8836a]" />
                مركز التدقيق والمراجعة
              </button>
            </div>
          </div>
        </div>

        {/* AUDIT CENTER COMPONENT */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <AuditCenterView
            completedInvoices={completedInvoices}
            vouchersList={vouchersList}
            stockMovements={stockMovements}
            shiftsList={shiftsList}
            usersList={usersList}
            rolesList={rolesList}
            auditLogsList={auditLogsList}
            currentUser={currentUser}
            selectedBranch={selectedBranch}
          />
        </div>
      </div>
    );
  }

  // RENDER DEDICATED CATEGORY PROFITABILITY VIEW
  if (reportViewMode === 'categories') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
        {/* HEADER SUB-NAV */}
        <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
              <Layers className="w-5 h-5 text-[#e8836a]" />
              <span>تقرير تحليل ربحية النشاط حسب نوع الصنف والتصنيف (Category Profitability Intelligence)</span>
            </div>

            {/* Report View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
              <button
                onClick={() => setReportViewMode('dashboard')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                لوحة التحكم الإدارية
              </button>
              <button
                onClick={() => setReportViewMode('invoices')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5" />
                جدول الفواتير والسندات
              </button>
              <button
                onClick={() => setReportViewMode('products')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Package className="w-3.5 h-3.5" />
                تجميع المبيعات حسب الأصناف
              </button>
              <button
                onClick={() => setReportViewMode('categories')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#243746] text-white border-[#afafaf]"
              >
                <Layers className="w-3.5 h-3.5 text-[#e8836a]" />
                ربحية الأقسام والتصنيفات
              </button>
              <button
                onClick={() => setReportViewMode('shifts')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Clock className="w-3.5 h-3.5" />
                سجل وتقارير الورديات ({shiftsList.length})
              </button>
              <button
                onClick={() => setReportViewMode('ledger')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <Scale className="w-3.5 h-3.5" />
                كشف الحسابات والأستاذ المالي
              </button>
              <button
                onClick={() => setReportViewMode('audit')}
                className="px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#e8836a]" />
                مركز التدقيق والمراجعة
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY PROFITABILITY COMPONENT */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <CategoryProfitabilityReport
            completedInvoices={completedInvoices}
            inventoryDb={inventoryDb}
            selectedBranch={selectedBranch}
            fromDate={fromDate}
            toDate={toDate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
      
      {/* HEADER & PRESET TABS BAR */}
      <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
            <BarChart2 className="w-5 h-5 text-[#243746]" />
            <span>لوحة تقارير الحركة اليومية والشهرية والربحية</span>
          </div>

          {/* Report View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
            <button
              onClick={() => setReportViewMode('dashboard')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'dashboard' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              لوحة التحكم الإدارية
            </button>
            <button
              onClick={() => setReportViewMode('invoices')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'invoices' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              جدول الفواتير والسندات
            </button>
            <button
              onClick={() => setReportViewMode('products')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'products' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <Package className="w-3.5 h-3.5" />
              تجميع المبيعات حسب الأصناف
            </button>
            <button
              onClick={() => setReportViewMode('categories')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'categories' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <Layers className="w-3.5 h-3.5 text-[#e8836a]" />
              ربحية الأقسام والتصنيفات
            </button>
            <button
              onClick={() => setReportViewMode('shifts')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'shifts' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              سجل وتقارير الورديات ({shiftsList.length})
            </button>
            <button
              onClick={() => setReportViewMode('ledger')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'ledger' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <Scale className="w-3.5 h-3.5" />
              كشف الحسابات والأستاذ المالي
            </button>
            <button
              onClick={() => setReportViewMode('audit')}
              className={`px-2.5 py-1 font-bold rounded-none border flex items-center gap-1 ${reportViewMode === 'audit' ? 'bg-[#243746] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#e8836a]" />
              مركز التدقيق والمراجعة
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-2.5 py-1 font-bold rounded-none border ${datePreset === 'today' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              اليوم الحالي
            </button>
            <button
              onClick={() => handlePresetChange('yesterday')}
              className={`px-2.5 py-1 font-bold rounded-none border ${datePreset === 'yesterday' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              اليوم السابق
            </button>
            <button
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-2.5 py-1 font-bold rounded-none border ${datePreset === 'thisMonth' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => handlePresetChange('lastMonth')}
              className={`px-2.5 py-1 font-bold rounded-none border ${datePreset === 'lastMonth' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'}`}
            >
              الشهر السابق
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={exportCSV}
              className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold rounded-none border border-[#afafaf] flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              تصدير إكسل
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold rounded-none border border-[#afafaf] flex items-center gap-1"
            >
              <Printer className="w-4 h-4" />
              طباعة التقرير
            </button>
          </div>
        </div>

        {/* DETAILED FILTERS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-1.5 items-center text-xs">
          {/* Custom Date Range */}
          <div className="md:col-span-2 flex items-center gap-1 bg-white p-1 border border-[#999999] rounded-none">
            <span className="font-bold text-[#222222] text-[11px]">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDatePreset('custom'); }}
              className="w-28 px-1 py-0.5 border border-[#999999] font-mono text-[11px]"
            />
            <span className="font-bold text-[#222222] text-[11px]">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDatePreset('custom'); }}
              className="w-28 px-1 py-0.5 border border-[#999999] font-mono text-[11px]"
            />
          </div>

          {/* Movement Type Filter */}
          <div>
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
            >
              <option value="الكل">نوع الحركة: جميع الحركات</option>
              <option value="بيع">فواتير بيع</option>
              <option value="شراء">فواتير شراء</option>
              <option value="مرتجع بيع">مرتجع بيع</option>
              <option value="مرتجع شراء">مرتجع شراء</option>
              <option value="نقل">تحويل ونقل</option>
              <option value="تالف">تالف ومفقود</option>
              <option value="تسوية">تسوية مخزنية</option>
              <option value="سندات">سندات مالية (قبض/صرف)</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
            >
              <option value="الكل">الفرع: جميع الفروع</option>
              <option value="عاصم فون - الفرع الرئيسي">عاصم فون - الفرع الرئيسي</option>
              <option value="فرع القاهرة">فرع القاهرة</option>
              <option value="المخزن المركزي">المخزن المركزي</option>
            </select>
          </div>

          {/* User / Cashier Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
            >
              <option value="الكل">المستخدم: جميع المستخدمين</option>
              {userOptions.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث باسم العميل، المورد، رقم الفاتورة، المستخدم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a]"
            />
            <Search className="w-4 h-4 text-[#999999] absolute left-2 top-1.5" />
          </div>
        </div>
      </div>

      {/* METRIC CARDS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-1.5 text-xs">
        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">إجمالي المبيعات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#4f9d69]">
            {totalSales.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">إجمالي المشتريات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#243746]">
            {totalPurchases.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">مجمل الربح (الفعلي)</span>
          <span className={`text-base font-black font-mono dir-ltr text-left block ${netProfit !== null && netProfit >= 0 ? 'text-[#d39b45]' : 'text-[#b85c5c]'}`}>
            {netProfit !== null ? `${netProfit.toFixed(2)} ج.م` : 'غير متاح'}
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">إجمالي الضريبة</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#243746]">
            {totalTax.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">إجمالي الخصومات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#b85c5c]">
            {totalDiscount.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">مقبوضات السندات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#4f9d69]">
            {totalReceiptsVouchers.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">مدفوعات السندات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#b85c5c]">
            {totalPaymentVouchers.toFixed(2)} <span className="text-xs text-[#666666]">ج.م</span>
          </span>
        </div>

        <div className="bg-white p-2 rounded-none border border-[#afafaf]">
          <span className="text-[10px] text-[#666666] font-bold block">عدد الحركات</span>
          <span className="text-base font-black font-mono dir-ltr text-left block text-[#222222]">
            {filteredInvoices.length + filteredVouchers.length}
          </span>
        </div>
      </div>

      {/* REPORTS DATA TABLE */}
      <div className="flex-1 bg-white border border-[#afafaf] rounded-none overflow-auto relative">
        {reportViewMode === 'shifts' ? (
          /* SHIFTS & DRAWER RECONCILIATION TABLE */
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#e2e8f0] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">كود الوردية</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">المستخدم</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-32 text-center">وقت الفتح</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-32 text-center">وقت الإغلاق</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الافتتاحي</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">المبيعات</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">المتوقع</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الفعلي</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الفارق</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-20 text-center">الحالة</th>
                <th className="p-1.5 text-center w-24">تقرير Z</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-[#999999] font-bold">
                    لا توجد ورديات مسجلة تطابق شروط الفلترة والتاريخ.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift, idx) => {
                  const isShort = (shift.cashDifference ?? 0) < 0;
                  const isOver = (shift.cashDifference ?? 0) > 0;
                  return (
                    <tr key={shift.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                        {idx + 1}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#0277BD]">
                        {shift.id}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                        {shift.userName}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px] text-[#666666]">
                        {new Date(shift.openedAt).toLocaleDateString('ar-SA')} {new Date(shift.openedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[11px] text-[#666666]">
                        {shift.closedAt ? (
                          `${new Date(shift.closedAt).toLocaleDateString('ar-SA')} ${new Date(shift.closedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                        ) : (
                          <span className="text-[#4f9d69] font-bold">نشطة الآن</span>
                        )}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">
                        {shift.openingCash.toFixed(2)}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                        {shift.totalSales.toFixed(2)}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#0277BD]">
                        {shift.expectedCash.toFixed(2)}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">
                        {shift.actualCash !== undefined ? shift.actualCash.toFixed(2) : '-'}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold">
                        {shift.cashDifference !== undefined ? (
                          <span className={isShort ? 'text-[#b85c5c]' : isOver ? 'text-[#0277BD]' : 'text-[#4f9d69]'}>
                            {shift.cashDifference > 0 ? `+${shift.cashDifference.toFixed(2)}` : shift.cashDifference.toFixed(2)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                        <span className={`px-1.5 py-0.5 rounded-none text-[10px] font-bold ${
                          shift.status === 'OPEN' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#e5e7eb] text-[#374151]'
                        }`}>
                          {shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                        </span>
                      </td>
                      <td className="p-1.5 text-center">
                        {onOpenShiftModal && (
                          <button
                            onClick={() => onOpenShiftModal(shift)}
                            className="px-2 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] border border-[#afafaf] text-[#243746] text-[11px] font-bold flex items-center justify-center gap-1 mx-auto"
                          >
                            <FileText className="w-3 h-3" />
                            تقرير
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-[#d8d8d8] text-[#222222] font-extrabold sticky bottom-0 border-t-2 border-[#afafaf]">
              <tr>
                <td colSpan={5} className="p-2 border-l border-[#afafaf] text-right">
                  إجمالي الورديات المفلترة ({filteredShifts.length} وردية)
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs">
                  {filteredShifts.reduce((acc, s) => acc + s.openingCash, 0).toFixed(2)}
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#4f9d69]">
                  {filteredShifts.reduce((acc, s) => acc + s.totalSales, 0).toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#0277BD]">
                  {filteredShifts.reduce((acc, s) => acc + s.expectedCash, 0).toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs">
                  {filteredShifts.reduce((acc, s) => acc + (s.actualCash || 0), 0).toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs">
                  {filteredShifts.reduce((acc, s) => acc + (s.cashDifference || 0), 0).toFixed(2)} ج.م
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        ) : reportViewMode === 'products' ? (
          /* AGGREGATED PRODUCT SALES TABLE */
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#e2e8f0] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">كود الصنف</th>
                <th className="p-1.5 border-l border-[#e2e8f0]">اسم الصنف</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">الفئة</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الكمية المباعة</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">إجمالي الإيراد (ج.م)</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">إجمالي التكلفة (ج.م)</th>
                <th className="p-1.5 text-center w-28">إجمالي الربح (ج.م)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {productSalesSummary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#999999] font-bold">
                    لا توجد مبيعات أصناف مطابقة للفلترة الحالية.
                  </td>
                </tr>
              ) : (
                productSalesSummary.map((prod, idx) => (
                  <tr key={prod.code + '-' + idx} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                      {prod.code}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      {prod.name}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#666666]">
                      {prod.category}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#222222]">
                      {prod.quantity}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {prod.revenue.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#243746]">
                      {prod.hasMissingCost ? (prod.cost > 0 ? `${prod.cost.toFixed(2)} (جزئي)` : 'غير متاح') : prod.cost.toFixed(2)}
                    </td>
                    <td className={`p-1.5 text-center font-mono font-bold ${!prod.hasMissingCost && prod.profit >= 0 ? 'text-[#d39b45]' : 'text-[#b85c5c]'}`}>
                      {prod.hasMissingCost ? 'غير متاح' : prod.profit.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#d8d8d8] text-[#222222] font-extrabold sticky bottom-0 border-t-2 border-[#afafaf]">
              <tr>
                <td colSpan={4} className="p-2 border-l border-[#afafaf] text-right">
                  إجمالي تجميع الأصناف المباعة ({productSalesSummary.length} صنف)
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs">
                  {productSalesSummary.reduce((acc, p) => acc + p.quantity, 0)}
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#4f9d69]">
                  {productSalesSummary.reduce((acc, p) => acc + p.revenue, 0).toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#243746]">
                  {productSalesSummary.reduce((acc, p) => acc + p.cost, 0).toFixed(2)} ج.م
                </td>
                <td className="p-2 text-center font-mono text-xs text-[#d39b45]">
                  {productSalesSummary.reduce((acc, p) => acc + p.profit, 0).toFixed(2)} ج.م
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          /* STANDARD INVOICES & VOUCHERS TABLE */
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
              <tr>
                <th className="p-1.5 border-l border-[#e2e8f0] w-10 text-center">م</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">التاريخ والوقت</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">نوع الحركة</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">رقم المرجع</th>
                <th className="p-1.5 border-l border-[#e2e8f0]">اسم العميل / المورد / البيان</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">المستخدم</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-16 text-center">الكمية</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">التكلفة (ج.م)</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">الإجمالي (ج.م)</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الربح (ج.م)</th>
                <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">الفرع والدرج</th>
                <th className="p-1.5 text-center w-28">الرصيد الحالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
              {filteredInvoices.length === 0 && filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-[#999999] font-bold">
                    لا توجد حركات أو فواتير مطابقة لشرط الفلترة والتاريخ.
                  </td>
                </tr>
              ) : (
                <>
                  {/* INVOICES SECTION */}
                  {filteredInvoices.map((inv, idx) => {
                    const qtySum = inv.items.reduce((acc, i) => acc + i.quantity, 0);
                    const hasAllCost = inv.type === 'بيع' && inv.items.length > 0 && inv.items.every(i => i.costPrice !== undefined);
                    const invCost = inv.type === 'بيع'
                      ? inv.items.reduce((acc, i) => acc + (i.costPrice !== undefined ? i.quantity * i.costPrice : 0), 0)
                      : inv.total;
                    const profitEst = inv.type === 'بيع'
                      ? (hasAllCost ? inv.total - invCost : null)
                      : 0;
                    
                    // Match Customer or Supplier Balance
                    let matchBal = 0;
                    if (inv.type === 'شراء' || inv.type === 'مرتجع شراء') {
                      const supp = suppliersList.find(s => s.id === inv.supplierId || s.name === inv.customerName);
                      if (supp) matchBal = supp.balance;
                    } else {
                      const cust = customersList.find(c => c.name === inv.customerName);
                      if (cust) matchBal = cust.balance;
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                          {inv.date} {inv.time}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-none font-bold text-[10px] bg-[#dceef2] text-[#243746] border border-[#afafaf]">
                            {inv.type}
                          </span>
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                          {inv.id}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                          {inv.customerName}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#243746] font-bold text-[11px]">
                          {inv.createdByName || 'غير محدد'}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#222222]">
                          {qtySum}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#243746]">
                          {inv.type === 'بيع' && !hasAllCost ? (invCost > 0 ? `${invCost.toFixed(2)} (جزئي)` : 'غير متاح') : invCost.toFixed(2)}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                          {inv.total.toFixed(2)}
                        </td>
                        <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold ${profitEst !== null && profitEst >= 0 ? 'text-[#d39b45]' : 'text-[#b85c5c]'}`}>
                          {inv.type === 'بيع' ? (profitEst !== null ? profitEst.toFixed(2) : 'غير متاح') : '0.00'}
                        </td>
                        <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#666666] text-[11px]">
                          {inv.branch} ({inv.drawer})
                        </td>
                        <td className={`p-1.5 text-center font-mono font-bold ${matchBal > 0 ? 'text-[#b85c5c]' : 'text-[#4f9d69]'}`}>
                          {matchBal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* VOUCHERS SECTION */}
                  {filteredVouchers.map((v, vIdx) => (
                    <tr key={v.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0] bg-[#f9f9f9]">
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                        V-{vIdx + 1}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                        {v.date}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded-none font-bold text-[10px] bg-[#dceef2] text-[#243746] border border-[#afafaf]">
                          سند {v.type}
                        </span>
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                        {v.id}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                        {v.name} {v.notes ? `(${v.notes})` : ''}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#243746] font-bold text-[11px]">
                        {v.createdByName || 'غير محدد'}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono">
                        1
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">
                        -
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                        {v.amount.toFixed(2)}
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#999999]">
                        -
                      </td>
                      <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#666666] text-[11px]">
                        {v.drawer}
                      </td>
                      <td className="p-1.5 text-center font-mono text-[#666666]">
                        -
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>

            {/* GRAND TOTALS FOOTER ROW */}
            <tfoot className="bg-[#d8d8d8] text-[#222222] font-extrabold sticky bottom-0 border-t-2 border-[#afafaf]">
              <tr>
                <td colSpan={6} className="p-2 border-l border-[#afafaf] text-right">
                  إجمالي حركة الفترة التجميعية ({filteredInvoices.length} فاتورة + {filteredVouchers.length} سند)
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs">
                  {filteredInvoices.reduce((acc, i) => acc + i.items.reduce((cAcc, item) => cAcc + item.quantity, 0), 0)}
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#243746]">
                  {totalSalesCost.toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#4f9d69]">
                  {(totalSales + totalReceiptsVouchers).toFixed(2)} ج.م
                </td>
                <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#d39b45]">
                  {netProfit !== null ? `${netProfit.toFixed(2)} ج.م` : 'غير متاح'}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

    </div>
  );
}
