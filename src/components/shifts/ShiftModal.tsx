import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  History,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { Shift, SavedInvoice, Voucher, User } from '../../types/pos';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftsList: Shift[];
  activeShift: Shift | null;
  currentUser: User | null;
  selectedBranch: string;
  selectedDrawer: string;
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  onOpenShift: (openingCash: number, notes?: string) => Promise<void>;
  onCloseShift: (shiftId: string, actualCash: number, notes?: string) => Promise<void>;
  checkPermission: (perm: any, desc: string) => boolean;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  shiftsList,
  activeShift,
  currentUser,
  selectedBranch,
  selectedDrawer,
  completedInvoices,
  vouchersList,
  onOpenShift,
  onCloseShift,
  checkPermission
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'report'>('current');
  const [selectedHistoricalShift, setSelectedHistoricalShift] = useState<Shift | null>(null);

  // Form states for opening shift
  const [openCashInput, setOpenCashInput] = useState<string>('0');
  const [openNotesInput, setOpenNotesInput] = useState<string>('');

  // Form states for closing shift
  const [closeActualCashInput, setCloseActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');

  // History filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [historyUserFilter, setHistoryUserFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  // Calculate live financial metrics for active shift or a specified shift
  const calculateShiftMetrics = (shift: Shift | null) => {
    if (!shift) {
      return {
        openingCash: 0,
        totalSales: 0,
        cashSales: 0,
        creditSales: 0,
        totalPurchases: 0,
        cashPurchases: 0,
        creditPurchases: 0,
        totalSalesReturns: 0,
        totalPurchaseReturns: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        totalExpenses: 0,
        expectedCash: 0,
        invoiceCount: 0,
        shiftInvoices: [] as SavedInvoice[],
        shiftVouchers: [] as Voucher[]
      };
    }

    // Filter invoices linked to this shift
    const shiftInvoices = completedInvoices.filter(inv => {
      if (inv.shiftId && inv.shiftId === shift.id) return true;
      if (!inv.shiftId) {
        // Fallback: match by timestamp and user if shiftId wasn't attached
        const invTime = new Date(`${inv.date} ${inv.time || '00:00:00'}`).getTime();
        const openTime = new Date(shift.openedAt).getTime();
        const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
        return invTime >= openTime && invTime <= closeTime && (!shift.userId || inv.userId === shift.userId);
      }
      return false;
    });

    // Filter vouchers linked to this shift
    const shiftVouchers = vouchersList.filter(vch => {
      if (vch.shiftId && vch.shiftId === shift.id) return true;
      if (!vch.shiftId) {
        const vchTime = new Date(vch.date).getTime();
        const openTime = new Date(shift.openedAt).getTime();
        const closeTime = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();
        return vchTime >= openTime && vchTime <= closeTime && (!shift.userId || vch.userId === shift.userId);
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
    let totalRevenues = 0;

    for (const vch of shiftVouchers) {
      const isInternalTransfer =
        vch.category === 'تحويل مالي داخلي' ||
        vch.id?.startsWith('VCH-TRF-') ||
        vch.notes?.includes('تحويل مالي');

      if (vch.type === 'قبض') {
        totalCashIn += vch.amount;
        if (!isInternalTransfer && (vch.partyType === 'revenue' || (vch.partyType === 'general' && vch.category) || (vch.category && vch.partyType !== 'customer' && vch.partyType !== 'supplier'))) {
          totalRevenues += vch.amount;
        }
      } else if (vch.type === 'صرف') {
        totalCashOut += vch.amount;
        if (!isInternalTransfer && (vch.partyType === 'expense' || vch.partyType === 'general' || (vch.category && vch.partyType !== 'supplier' && vch.partyType !== 'customer') || vch.notes?.includes('مصروف'))) {
          totalExpenses += vch.amount;
        }
      }
    }

    // Expected cash in drawer
    const expectedCash =
      shift.openingCash +
      cashSales -
      cashSalesReturns -
      cashPurchases +
      cashPurchaseReturns +
      totalCashIn -
      totalCashOut;

    return {
      openingCash: shift.openingCash,
      totalSales,
      cashSales,
      creditSales,
      totalPurchases,
      cashPurchases,
      creditPurchases,
      totalSalesReturns,
      cashSalesReturns,
      totalPurchaseReturns,
      cashPurchaseReturns,
      totalCashIn,
      totalCashOut,
      totalExpenses,
      totalRevenues,
      expectedCash,
      invoiceCount: shiftInvoices.length,
      shiftInvoices,
      shiftVouchers
    };
  };

  const activeMetrics = calculateShiftMetrics(activeShift);
  const activeExpectedCash = activeMetrics.expectedCash;

  // Handle open shift submit
  const handleOpenSubmit = async () => {
    if (!checkPermission('SHIFT_OPEN', 'فتح وردية جديدة')) return;
    const cash = parseFloat(openCashInput) || 0;
    if (cash < 0) {
      alert('لا يمكن أن يكون الرصيد الافتتاحي سالباً');
      return;
    }
    await onOpenShift(cash, openNotesInput);
    setOpenCashInput('0');
    setOpenNotesInput('');
  };

  // Handle close shift submit
  const handleCloseSubmit = async () => {
    if (!activeShift) return;
    if (!checkPermission('SHIFT_CLOSE', 'إغلاق الوردية')) return;
    if (closeActualCashInput.trim() === '') {
      alert('يرجى إدخال المبلغ الفعلي في الدرج قبل الإغلاق.');
      return;
    }
    const actual = parseFloat(closeActualCashInput);
    if (isNaN(actual)) {
      alert('يرجى إدخال قيمة عددية صحيحة للمبلغ الفعلي.');
      return;
    }

    const diff = actual - activeExpectedCash;
    let confirmMsg = `هل أنت متأكد من رغبتك في إغلاق الوردية [${activeShift.id}]؟\n`;
    confirmMsg += `- الرصيد المتوقع: ${activeExpectedCash.toFixed(2)} ج.م\n`;
    confirmMsg += `- الرصيد الفعلي: ${actual.toFixed(2)} ج.م\n`;
    if (diff === 0) {
      confirmMsg += `✓ المطابقة: مطابق تماماً (0.00 ج.م)\n`;
    } else if (diff > 0) {
      confirmMsg += `+ الفارق: زيادة قدرها +${diff.toFixed(2)} ج.م\n`;
    } else {
      confirmMsg += `- الفارق: عجز قدره ${diff.toFixed(2)} ج.م\n`;
    }

    if (confirm(confirmMsg)) {
      await onCloseShift(activeShift.id, actual, closeNotesInput);
      setCloseActualCashInput('');
      setCloseNotesInput('');
      setActiveTab('history');
    }
  };

  // Filtered history list
  const filteredShifts = shiftsList.filter(s => {
    if (historyStatusFilter !== 'ALL' && s.status !== historyStatusFilter) return false;
    if (historyUserFilter !== 'ALL' && s.userId !== historyUserFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

  // Report shift to view/print
  const shiftForReport = selectedHistoricalShift || activeShift;
  const reportMetrics = calculateShiftMetrics(shiftForReport);

  const parsedActualCash = parseFloat(closeActualCashInput);
  const liveDiff = !isNaN(parsedActualCash) ? parsedActualCash - activeExpectedCash : null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 dir-rtl text-xs font-sans select-none overflow-y-auto">
      <div className="bg-white rounded-none max-w-4xl w-full border border-[#B8D3E3] shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Top Window Title Bar */}
        <div className="h-8 bg-[#E6F3FA] border-b border-[#DCE8EF] px-3 flex items-center justify-between text-xs font-bold text-[#234B67] shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4A90C2]" />
            <span className="tracking-wide">إدارة وتقارير الورديات والشيفتات — PROJECT_Y</span>
          </div>
          <div className="flex items-center gap-2">
            {activeShift ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-300">
                ● وردية نشطة: {activeShift.id} ({activeShift.userName})
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-300">
                ○ لا توجد وردية نشطة
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 px-1 py-0.5 font-bold cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (Sub-Navigation) */}
        <div className="grid grid-cols-3 w-full border-b border-slate-200 bg-[#f0f7fc] shrink-0">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-2 text-center font-bold text-xs border-l border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'current'
                ? 'bg-[#4A90C2] text-white font-bold'
                : 'bg-[#f0f7fc] text-[#234B67] hover:bg-blue-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>الوردية الحالية {activeShift ? '(مفتوحة)' : '(مغلقة)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 text-center font-bold text-xs border-l border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#4A90C2] text-white font-bold'
                : 'bg-[#f0f7fc] text-[#234B67] hover:bg-blue-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل وأرشيف الورديات ({shiftsList.length})</span>
          </button>
          <button
            onClick={() => {
              if (!selectedHistoricalShift && activeShift) {
                setSelectedHistoricalShift(activeShift);
              }
              setActiveTab('report');
            }}
            className={`py-2 text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-[#4A90C2] text-white font-bold'
                : 'bg-[#f0f7fc] text-[#234B67] hover:bg-blue-50'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>معاينة وطباعة تقرير الوردية (Z-Report)</span>
          </button>
        </div>

        {/* Modal Main Content Body */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3 bg-[#f4f7fb]">
          
          {/* TAB 1: CURRENT ACTIVE SHIFT OR OPEN SHIFT FORM */}
          {activeTab === 'current' && (
            <div>
              {activeShift ? (
                <div className="space-y-3">
                  {/* Active Shift Header Card */}
                  <div className="bg-white border border-slate-200 p-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs">
                          ● وردية مفتوحة نشطة
                        </span>
                        <span className="font-mono font-bold text-[#234B67] text-sm">
                          كود الوردية: {activeShift.id}
                        </span>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        وقت البدء: {new Date(activeShift.openedAt).toLocaleString('ar-SA')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">المستخدم / الكاشير:</span>
                        <span className="font-bold text-slate-800">{activeShift.userName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الفرع:</span>
                        <span className="font-bold text-slate-800">{activeShift.branch || selectedBranch}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الدرج / الخزينة:</span>
                        <span className="font-bold text-slate-800">{activeShift.drawer || selectedDrawer}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الرصيد الافتتاحي:</span>
                        <span className="font-mono font-bold text-[#4A90C2]">
                          {activeShift.openingCash.toFixed(2)} ج.م
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white border border-slate-200 p-2 shadow-2xs">
                      <span className="text-[11px] text-slate-500 font-bold block">إجمالي المبيعات</span>
                      <span className="text-base font-bold font-mono text-emerald-700">
                        {activeMetrics.totalSales.toFixed(2)} ج.م
                      </span>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                        <span>كاش: {activeMetrics.cashSales.toFixed(2)}</span>
                        <span>آجل: {activeMetrics.creditSales.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-2 shadow-2xs">
                      <span className="text-[11px] text-slate-500 font-bold block">إجمالي المشتريات</span>
                      <span className="text-base font-bold font-mono text-rose-700">
                        {activeMetrics.totalPurchases.toFixed(2)} ج.م
                      </span>
                      <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                        <span>كاش: {activeMetrics.cashPurchases.toFixed(2)}</span>
                        <span>آجل: {activeMetrics.creditPurchases.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-2 shadow-2xs">
                      <span className="text-[11px] text-slate-500 font-bold block">مقبوضات ومصروفات</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold font-mono text-emerald-700">
                          قبض: +{activeMetrics.totalCashIn.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold font-mono text-rose-700">
                          صرف: -{activeMetrics.totalCashOut.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        مرتجع بيع: {activeMetrics.totalSalesReturns.toFixed(2)} ج.م
                      </div>
                    </div>

                    <div className="bg-[#E6F3FA] border border-[#B8D3E3] p-2 shadow-2xs">
                      <span className="text-[11px] text-[#234B67] font-bold block">النقدية المتوقعة في الدرج</span>
                      <span className="text-lg font-bold font-mono text-[#234B67]">
                        {activeExpectedCash.toFixed(2)} ج.م
                      </span>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        عدد الحركات: {activeMetrics.invoiceCount} فاتورة
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table for this Active Shift */}
                  <div className="bg-white border border-slate-200 shadow-2xs">
                    <div className="bg-[#f0f7fc] px-2 py-1.5 border-b border-slate-200 font-bold text-xs flex justify-between items-center text-[#234B67]">
                      <span>حركات وفواتير الوردية الحالية ({activeMetrics.shiftInvoices.length})</span>
                      <button
                        onClick={() => {
                          setSelectedHistoricalShift(activeShift);
                          setActiveTab('report');
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-[#234B67] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-[#4A90C2]" />
                        طباعة تقرير لحظي (X-Report)
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-right text-[11px]">
                        <thead className="bg-[#E6F3FA] text-[#234B67] font-bold border-b border-[#DCE8EF] sticky top-0">
                          <tr>
                            <th className="p-1 border-l border-[#DCE8EF]">رقم الحركة</th>
                            <th className="p-1 border-l border-[#DCE8EF]">النوع</th>
                            <th className="p-1 border-l border-[#DCE8EF]">الطرف / العميل</th>
                            <th className="p-1 border-l border-[#DCE8EF]">الوقت</th>
                            <th className="p-1 border-l border-[#DCE8EF]">المبلغ الكلي</th>
                            <th className="p-1">المدفوع كاش</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE8EF]">
                          {activeMetrics.shiftInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 text-center text-slate-400">
                                لم يتم إصدار فواتير في هذه الوردية بعد
                              </td>
                            </tr>
                          ) : (
                            activeMetrics.shiftInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-[#F8FBFD]">
                                <td className="p-1 font-mono font-bold border-l border-[#DCE8EF] text-[#234B67]">{inv.id}</td>
                                <td className="p-1 border-l border-[#DCE8EF]">
                                  <span className={`px-1 py-0.2 text-[10px] font-bold ${
                                    inv.type === 'بيع' ? 'bg-emerald-50 text-emerald-700' :
                                    inv.type === 'شراء' ? 'bg-rose-50 text-rose-700' :
                                    'bg-amber-50 text-amber-700'
                                  }`}>
                                    {inv.type}
                                  </span>
                                </td>
                                <td className="p-1 border-l border-[#DCE8EF] truncate max-w-[120px] text-slate-800">{inv.customerName}</td>
                                <td className="p-1 font-mono text-slate-500 border-l border-[#DCE8EF]">{inv.time}</td>
                                <td className="p-1 font-mono font-bold border-l border-[#DCE8EF] text-[#234B67]">{inv.total.toFixed(2)}</td>
                                <td className="p-1 font-mono font-bold text-emerald-700">{inv.paid.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Close Shift Form & Cash Reconciliation Section */}
                  <div className="bg-amber-50/70 border border-amber-200 p-3 space-y-2 shadow-2xs">
                    <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                      <Lock className="w-4 h-4 text-amber-700" />
                      إغلاق الوردية ومطابقة النقدية (Shift Close & Cash Reconciliation)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5">
                          النقدية المتوقعة في الخزنة:
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`${activeExpectedCash.toFixed(2)} ج.م`}
                          className="w-full px-2 py-1 bg-white border border-slate-300 font-mono font-bold text-sm text-[#234B67] focus:outline-none cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5">
                          المبلغ الفعلي المعدود في الدرج *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="أدخل المبلغ الفعلي كاش..."
                          value={closeActualCashInput}
                          onChange={(e) => setCloseActualCashInput(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-[#B8D3E3] font-mono font-bold text-sm text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5">
                          الفارق المالي (عجز / زيادة):
                        </label>
                        <div className={`px-2 py-1 border font-mono font-bold text-sm flex items-center justify-between ${
                          liveDiff === null ? 'bg-white border-slate-300 text-slate-500' :
                          liveDiff === 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                          liveDiff > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' :
                          'bg-rose-50 border-rose-300 text-rose-700'
                        }`}>
                          <span>
                            {liveDiff === null ? 'بانتظار العد' : `${liveDiff > 0 ? '+' : ''}${liveDiff.toFixed(2)} ج.م`}
                          </span>
                          <span className="text-[10px]">
                            {liveDiff === null ? '' : liveDiff === 0 ? '(مطابق)' : liveDiff > 0 ? '(فائض)' : '(عجز)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">
                        ملاحظات إغلاق الوردية
                      </label>
                      <input
                        type="text"
                        placeholder="أي ملاحظات حول العجز أو الزيادة أو حركة الدرج..."
                        value={closeNotesInput}
                        onChange={(e) => setCloseNotesInput(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#B8D3E3] text-xs focus:outline-none focus:border-[#4A90C2]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={handleCloseSubmit}
                        disabled={closeActualCashInput.trim() === ''}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs border border-rose-700 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        تأكيد إغلاق الوردية وترحيل الحسابات
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Active Shift: Display Open Shift Form */
                <div className="max-w-md mx-auto bg-white border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <div className="text-center border-b border-slate-200 pb-3">
                    <Clock className="w-8 h-8 text-[#4A90C2] mx-auto mb-1" />
                    <h3 className="font-bold text-sm text-[#234B67]">فتح وردية كاشير جديدة</h3>
                    <p className="text-[11px] text-slate-500">
                      يرجى إدخال الرصيد الافتتاحي في درج الكاش لبدء الوردية وتسجيل العمليات
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">المستخدم الحالي:</span>
                      <div className="px-2 py-1 bg-[#f0f7fc] border border-slate-200 font-bold text-[#234B67]">
                        {currentUser?.displayName || currentUser?.username || 'مستخدم غير معروف'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block mb-0.5">الفرع:</span>
                        <div className="px-2 py-1 bg-[#f0f7fc] border border-slate-200 font-bold text-[#234B67]">
                          {selectedBranch}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">الخزنة / الدرج:</span>
                        <div className="px-2 py-1 bg-[#f0f7fc] border border-slate-200 font-bold text-[#234B67]">
                          {selectedDrawer}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#234B67] mb-0.5">
                        الرصيد الافتتاحي في الدرج (العهدة النقدية) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={openCashInput}
                        onChange={(e) => setOpenCashInput(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-[#B8D3E3] font-mono font-bold text-base text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                        placeholder="0.00"
                        autoFocus
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        المبلغ النقدي المتواجد في الدرج عند استلام الوردية
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-[#234B67] mb-0.5">
                        ملاحظات الفتح
                      </label>
                      <input
                        type="text"
                        placeholder="ملاحظات اختيارية..."
                        value={openNotesInput}
                        onChange={(e) => setOpenNotesInput(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-[#B8D3E3] focus:outline-none focus:border-[#4A90C2] text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleOpenSubmit}
                      className="w-full py-2 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-[#3A759F] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      فتح وبدء الوردية الآن
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHIFTS HISTORY & ARCHIVE */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {/* History Filters */}
              <div className="bg-white p-2 border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#234B67]">تصفية الحالة:</span>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                    className="px-2 py-1 bg-white border border-[#B8D3E3] text-xs font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                  >
                    <option value="ALL">جميع الحالات ({shiftsList.length})</option>
                    <option value="OPEN">مفتوحة فقط</option>
                    <option value="CLOSED">مغلقة فقط</option>
                  </select>

                  <span className="font-bold text-[#234B67] mr-2">المستخدم:</span>
                  <select
                    value={historyUserFilter}
                    onChange={(e) => setHistoryUserFilter(e.target.value)}
                    className="px-2 py-1 bg-white border border-[#B8D3E3] text-xs font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                  >
                    <option value="ALL">جميع المستخدمين</option>
                    {Array.from(new Set(shiftsList.map(s => s.userId))).map(uid => {
                      const userShift = shiftsList.find(s => s.userId === uid);
                      return (
                        <option key={uid} value={uid}>
                          {userShift?.userName || uid}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="font-mono text-slate-500">
                  إجمالي الورديات المعروضة: {filteredShifts.length}
                </div>
              </div>

              {/* History Data Table */}
              <div className="bg-white border border-slate-200 max-h-96 overflow-y-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#E6F3FA] text-[#234B67] font-bold border-b border-[#DCE8EF] sticky top-0">
                    <tr>
                      <th className="p-1.5 border-l border-[#DCE8EF]">كود الوردية</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">المستخدم</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">وقت الفتح</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">وقت الإغلاق</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">الافتتاحي</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">المبيعات</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">المتوقع</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">الفعلي</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">الفارق</th>
                      <th className="p-1.5 border-l border-[#DCE8EF]">الحالة</th>
                      <th className="p-1.5">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE8EF]">
                    {filteredShifts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-400">
                          لا توجد ورديات مسجلة تطابق التصفية
                        </td>
                      </tr>
                    ) : (
                      filteredShifts.map((shift) => {
                        const isDiffShort = (shift.cashDifference ?? 0) < 0;
                        const isDiffOver = (shift.cashDifference ?? 0) > 0;
                        return (
                          <tr key={shift.id} className="hover:bg-[#F8FBFD]">
                            <td className="p-1.5 font-mono font-bold border-l border-[#DCE8EF] text-[#234B67]">{shift.id}</td>
                            <td className="p-1.5 border-l border-[#DCE8EF] text-slate-800">{shift.userName}</td>
                            <td className="p-1.5 font-mono text-[11px] border-l border-[#DCE8EF] text-slate-500">
                              {new Date(shift.openedAt).toLocaleDateString('ar-SA')} {new Date(shift.openedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-1.5 font-mono text-[11px] border-l border-[#DCE8EF] text-slate-500">
                              {shift.closedAt ? (
                                `${new Date(shift.closedAt).toLocaleDateString('ar-SA')} ${new Date(shift.closedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`
                              ) : (
                                <span className="text-emerald-700 font-bold">نشطة الآن</span>
                              )}
                            </td>
                            <td className="p-1.5 font-mono border-l border-[#DCE8EF] text-slate-700">{shift.openingCash.toFixed(2)}</td>
                            <td className="p-1.5 font-mono font-bold text-emerald-700 border-l border-[#DCE8EF]">
                              {shift.totalSales.toFixed(2)}
                            </td>
                            <td className="p-1.5 font-mono border-l border-[#DCE8EF] text-[#234B67]">{shift.expectedCash.toFixed(2)}</td>
                            <td className="p-1.5 font-mono border-l border-[#DCE8EF] text-slate-700">
                              {shift.actualCash !== undefined ? shift.actualCash.toFixed(2) : '-'}
                            </td>
                            <td className="p-1.5 font-mono font-bold border-l border-[#DCE8EF]">
                              {shift.cashDifference !== undefined ? (
                                <span className={isDiffShort ? 'text-rose-700' : isDiffOver ? 'text-blue-700' : 'text-emerald-700'}>
                                  {shift.cashDifference > 0 ? `+${shift.cashDifference.toFixed(2)}` : shift.cashDifference.toFixed(2)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-1.5 border-l border-[#DCE8EF]">
                              <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                shift.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                              </span>
                            </td>
                            <td className="p-1.5">
                              <button
                                onClick={() => {
                                  setSelectedHistoricalShift(shift);
                                  setActiveTab('report');
                                }}
                                className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-[#234B67] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-[#4A90C2]" />
                                تقرير Z
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Z-REPORT THERMAL PRINT PREVIEW */}
          {activeTab === 'report' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white p-2 border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#234B67]">تقرير الوردية المحددة:</span>
                  <select
                    value={shiftForReport?.id || ''}
                    onChange={(e) => {
                      const found = shiftsList.find(s => s.id === e.target.value);
                      if (found) setSelectedHistoricalShift(found);
                    }}
                    className="px-2 py-1 bg-white border border-[#B8D3E3] text-xs font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                  >
                    {shiftsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} - {s.userName} ({s.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold rounded-none text-xs flex items-center gap-1.5 border border-[#3A759F] cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة التقرير الآن
                  </button>
                </div>
              </div>

              {shiftForReport ? (
                /* Thermal Printable Z-Report */
                <div className="max-w-md mx-auto bg-white p-4 border border-slate-300 font-mono text-xs text-slate-800 space-y-2 shadow-2xs">
                  {/* Header */}
                  <div className="text-center border-b border-slate-200 pb-2 space-y-0.5">
                    <h3 className="font-bold text-sm text-[#234B67]">{shiftForReport.branch || selectedBranch}</h3>
                    <h4 className="font-bold text-xs text-[#4A90C2]">
                      {shiftForReport.status === 'OPEN' ? 'تقرير وردية مؤقت (X-REPORT)' : 'تقرير إغلاق الوردية (Z-REPORT)'}
                    </h4>
                    <p className="text-[10px] text-slate-500">رقم الوردية: {shiftForReport.id}</p>
                    <p className="text-[10px] text-slate-500">الكاشير: {shiftForReport.userName}</p>
                    <p className="text-[10px] text-slate-500">
                      من: {new Date(shiftForReport.openedAt).toLocaleString('ar-SA')}
                    </p>
                    {shiftForReport.closedAt && (
                      <p className="text-[10px] text-slate-500">
                        إلى: {new Date(shiftForReport.closedAt).toLocaleString('ar-SA')}
                      </p>
                    )}
                  </div>

                  {/* Financial Metrics Breakdown */}
                  <div className="space-y-1 border-b border-slate-200 pb-2 text-[11px]">
                    <div className="flex justify-between">
                      <span>الرصيد الافتتاحي:</span>
                      <span className="font-bold">{shiftForReport.openingCash.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي المبيعات:</span>
                      <span className="font-bold text-emerald-700">+{reportMetrics.totalSales.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pl-2 text-[10px] text-slate-500">
                      <span>- مبيعات نقدية:</span>
                      <span>{reportMetrics.cashSales.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between pl-2 text-[10px] text-slate-500">
                      <span>- مبيعات آجلة:</span>
                      <span>{reportMetrics.creditSales.toFixed(2)} ج.م</span>
                    </div>

                    <div className="flex justify-between">
                      <span>مرتجع مبيعات:</span>
                      <span className="font-bold text-rose-700">-{reportMetrics.totalSalesReturns.toFixed(2)} ج.م</span>
                    </div>

                    <div className="flex justify-between">
                      <span>مشتريات نقدية:</span>
                      <span className="font-bold text-rose-700">-{reportMetrics.cashPurchases.toFixed(2)} ج.م</span>
                    </div>

                    <div className="flex justify-between">
                      <span>سندات قبض نقدية:</span>
                      <span className="font-bold text-emerald-700">+{reportMetrics.totalCashIn.toFixed(2)} ج.م</span>
                    </div>

                    <div className="flex justify-between">
                      <span>سندات صرف ومصروفات:</span>
                      <span className="font-bold text-rose-700">-{reportMetrics.totalCashOut.toFixed(2)} ج.م</span>
                    </div>
                  </div>

                  {/* Summary & Discrepancy */}
                  <div className="space-y-1 border-b border-slate-200 pb-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>النقدية المتوقعة في الدرج:</span>
                      <span className="text-[#234B67]">{reportMetrics.expectedCash.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>النقدية الفعلية المعدودة:</span>
                      <span>
                        {shiftForReport.actualCash !== undefined
                          ? `${shiftForReport.actualCash.toFixed(2)} ج.م`
                          : '(لم تغلق بعد)'}
                      </span>
                    </div>
                    {shiftForReport.cashDifference !== undefined && (
                      <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-slate-300">
                        <span>الفارق المالي (عجز / زيادة):</span>
                        <span className={shiftForReport.cashDifference < 0 ? 'text-rose-700' : shiftForReport.cashDifference > 0 ? 'text-blue-700' : 'text-emerald-700'}>
                          {shiftForReport.cashDifference > 0 ? `+${shiftForReport.cashDifference.toFixed(2)}` : shiftForReport.cashDifference.toFixed(2)} ج.م
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Operational Stats */}
                  <div className="space-y-0.5 text-[10px] text-slate-500 border-b border-slate-200 pb-2">
                    <div className="flex justify-between">
                      <span>عدد الفواتير المنفذة:</span>
                      <span>{reportMetrics.invoiceCount}</span>
                    </div>
                    {shiftForReport.notes && (
                      <div className="pt-1">
                        <span>ملاحظات: </span>
                        <span className="text-slate-800">{shiftForReport.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="pt-3 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
                    <div className="border-t border-dashed border-slate-300 pt-1">
                      توقيع الكاشير
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1">
                      توقيع المشرف / المدير
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 text-center text-slate-400">
                  يرجى اختيار وردية من القائمة لعرض التقرير
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Bar */}
        <div className="h-9 bg-[#f0f7fc] border-t border-slate-200 px-3 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 font-mono text-[11px]">
            PROJECT_Y Shift Manager • Enterprise Edition
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-none text-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
