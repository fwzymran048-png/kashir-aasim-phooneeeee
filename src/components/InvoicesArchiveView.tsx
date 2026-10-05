import React, { useState, useMemo } from 'react';
import { SavedInvoice } from '../services/storage';
import { FileText, Search, Download, Printer, Eye, X, Plus, Filter, Calendar, Trash2 } from 'lucide-react';
import { SavedInvoiceBalancesView } from './pos/SavedInvoiceBalancesView';

interface InvoicesArchiveViewProps {
  completedInvoices: SavedInvoice[];
  heldInvoices?: SavedInvoice[];
  selectedBranch: string;
  onSelectInvoiceForPrint: (invoice: SavedInvoice) => void;
  onNewInvoice: () => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export default function InvoicesArchiveView({
  completedInvoices,
  selectedBranch,
  onSelectInvoiceForPrint,
  onNewInvoice,
  onDeleteInvoice
}: InvoicesArchiveViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'sales' | 'purchases' | 'returns'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [branchFilter, setBranchFilter] = useState('الكل');
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<SavedInvoice | null>(null);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let source = completedInvoices;

    return source.filter(inv => {
      // Subtab filter
      if (activeSubTab === 'sales' && inv.type !== 'بيع') return false;
      if (activeSubTab === 'purchases' && inv.type !== 'شراء') return false;
      if (activeSubTab === 'returns' && (inv.type !== 'مرتجع بيع' && inv.type !== 'مرتجع شراء')) return false;

      // Type dropdown filter
      if (typeFilter !== 'الكل' && inv.type !== typeFilter) return false;

      // Status dropdown filter
      if (statusFilter !== 'الكل' && inv.status !== statusFilter) return false;

      // Branch filter
      if (branchFilter !== 'الكل' && inv.branch !== branchFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesCust = inv.customerName.toLowerCase().includes(q);
        const matchesPhone = inv.customerPhone.toLowerCase().includes(q);
        const matchesItems = inv.items.some(
          i =>
            i.name.toLowerCase().includes(q) ||
            (i.code && i.code.toLowerCase().includes(q)) ||
            (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
            (i.notes && i.notes.toLowerCase().includes(q))
        );
        if (!matchesId && !matchesCust && !matchesPhone && !matchesItems) return false;
      }

      return true;
    });
  }, [completedInvoices, activeSubTab, typeFilter, statusFilter, branchFilter, searchQuery]);

  // Overall totals for the filtered grid
  const grandTotalValue = filteredInvoices.reduce((acc, i) => acc + i.total, 0);
  const grandPaidValue = filteredInvoices.reduce((acc, i) => acc + i.paid, 0);
  const grandRemainingValue = filteredInvoices.reduce((acc, i) => acc + i.remaining, 0);
  const grandActualProfit = filteredInvoices
    .filter(i => i.type === 'بيع')
    .reduce((acc, i) => {
      const hasAllCost = i.items && i.items.length > 0 && i.items.every(item => item.costPrice !== undefined);
      if (hasAllCost) {
        const cost = i.items.reduce((cAcc, item) => cAcc + (item.quantity * item.costPrice!), 0);
        return acc + (i.total - cost);
      }
      return acc;
    }, 0);

  const exportCSV = () => {
    const rows = [
      ['رقم الفاتورة', 'التاريخ والوقت', 'نوع الفاتورة', 'اسم العميل / المورد', 'الهاتف', 'الإجمالي', 'المدفوع', 'الآجل', 'الربح الفعلي', 'الفرع', 'الحالة'],
      ...filteredInvoices.map(i => {
        const hasAllCost = i.type === 'بيع' && i.items && i.items.length > 0 && i.items.every(item => item.costPrice !== undefined);
        let profitStr = '0';
        if (i.type === 'بيع') {
          if (hasAllCost) {
            const cost = i.items.reduce((acc, item) => acc + (item.quantity * item.costPrice!), 0);
            profitStr = (i.total - cost).toFixed(2);
          } else {
            profitStr = 'غير متاح';
          }
        }
        return [
          i.id,
          `${i.date} ${i.time}`,
          i.type,
          i.customerName || i.supplierName || 'عميل نقدي',
          i.customerPhone || '',
          i.total.toString(),
          i.paid.toString(),
          i.remaining.toString(),
          profitStr,
          i.branch,
          i.status
        ];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `سجل_الفواتير_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (selectedInvoiceModal) {
    return (
      <SavedInvoiceBalancesView
        invoice={selectedInvoiceModal}
        onBackToEdit={() => setSelectedInvoiceModal(null)}
        onNewInvoice={() => {
          setSelectedInvoiceModal(null);
          onNewInvoice();
        }}
        onPrint={() => onSelectInvoiceForPrint(selectedInvoiceModal)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
      
      {/* FILTER & SUBTAB RIBBON */}
      <div className="bg-[#f0f7fc] border border-slate-200 p-1.5 rounded-none space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <FileText className="w-5 h-5 text-[#1e3a5f]" />
            <span>سجل وأرشيف الفواتير المكتملة</span>
          </div>

          {/* Subtabs Buttons */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 border border-slate-300 rounded-none">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`h-[24px] px-3 font-bold rounded-none border text-xs cursor-pointer transition-colors ${activeSubTab === 'all' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'}`}
            >
              جميع الفواتير ({completedInvoices.length})
            </button>
            <button
              onClick={() => setActiveSubTab('sales')}
              className={`h-[24px] px-3 font-bold rounded-none border text-xs cursor-pointer transition-colors ${activeSubTab === 'sales' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'}`}
            >
              فواتير المبيعات
            </button>
            <button
              onClick={() => setActiveSubTab('purchases')}
              className={`h-[24px] px-3 font-bold rounded-none border text-xs cursor-pointer transition-colors ${activeSubTab === 'purchases' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'}`}
            >
              فواتير المشتريات
            </button>
            <button
              onClick={() => setActiveSubTab('returns')}
              className={`h-[24px] px-3 font-bold rounded-none border text-xs cursor-pointer transition-colors ${activeSubTab === 'returns' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'}`}
            >
              المرتجعات
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewInvoice}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none border border-emerald-700 flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              فاتورة جديدة
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 font-bold rounded-none border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              تصدير إكسل
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 font-bold rounded-none border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              طباعة
            </button>
          </div>
        </div>

        {/* DETAILED CONTROLS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5 items-center text-xs">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="بحث برقم الفاتورة، اسم العميل، الهاتف، أو الصنف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-white border border-slate-300 rounded-none font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1.5" />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-none font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="الكل">النوع: جميع الأنواع</option>
              <option value="بيع">بيع</option>
              <option value="شراء">شراء</option>
              <option value="مرتجع بيع">مرتجع بيع</option>
              <option value="مرتجع شراء">مرتجع شراء</option>
              <option value="نقل">نقل وتحويل</option>
              <option value="تالف">تالف</option>
              <option value="تسوية">تسوية</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-none font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="الكل">الحالة المالية: الكل</option>
              <option value="مدفوعة">مدفوعة كاش بالكامل</option>
              <option value="مؤجلة">مؤجلة بالكامل (آجل)</option>
              <option value="جزئي">مدفوع جزئي</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded-none font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="الكل">الفرع: جميع الفروع</option>
              <option value="عاصم فون - الفرع الرئيسي">عاصم فون - الفرع الرئيسي</option>
              <option value="فرع القاهرة">فرع القاهرة</option>
              <option value="المخزن المركزي">المخزن المركزي</option>
            </select>
          </div>
        </div>
      </div>

      {/* INVOICES DATA GRID */}
      <div className="flex-1 bg-white border border-slate-300 rounded-none overflow-auto relative">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
            <tr>
              <th className="p-1.5 border-l border-[#e2e8f0] w-10 text-center">م</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">رقم الفاتورة</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">التاريخ والوقت</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">نوع الفاتورة</th>
              <th className="p-1.5 border-l border-[#e2e8f0]">اسم العميل / المورد</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">قيمة الفاتورة</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">المدفوع</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الآجل / المتبقي</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الربح (الفعلي)</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-28 text-center">الفرع / الدرج</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">الحالة</th>
              <th className="p-1.5 text-center w-16">تفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d0d0d0] font-medium text-[#222222]">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-12 text-center text-[#999999] font-bold">
                  لا توجد فواتير مطابقة لخيارات البحث والفلترة.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv, idx) => {
                const hasAllCost = inv.type === 'بيع' && inv.items && inv.items.length > 0 && inv.items.every(item => item.costPrice !== undefined);
                let profitDisplay = '-';
                if (inv.type === 'بيع') {
                  if (hasAllCost) {
                    const cost = inv.items.reduce((acc, item) => acc + (item.quantity * item.costPrice!), 0);
                    profitDisplay = (inv.total - cost).toFixed(2);
                  } else {
                    profitDisplay = 'غير متاح';
                  }
                }

                return (
                  <tr key={inv.id} className="hover:bg-[#e8e8e8] border-b border-[#d0d0d0]">
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                      {inv.id}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                      {inv.date} {inv.time}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded-none font-bold text-[10px] bg-[#dceef2] text-[#243746] border border-[#afafaf]">
                        {inv.type}
                      </span>
                      {(inv.originalInvoiceNumber || inv.originalInvoiceId) && (
                        <span className="block text-[9px] text-[#8a5d14] font-mono mt-0.5 bg-[#fff8e7] px-1 border border-[#e2c486]">
                          أصل: {inv.originalInvoiceNumber || inv.originalInvoiceId}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                      {inv.customerName || inv.supplierName || 'عميل نقدي'}
                      {inv.customerPhone && (
                        <span className="block text-[10px] text-[#666666] font-mono font-normal">
                          {inv.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                      {inv.total.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#222222]">
                      {inv.paid.toFixed(2)}
                    </td>
                    <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold ${
                      inv.remaining > 0 ? 'text-[#b85c5c] bg-[#fdf2f2]' : 'text-[#666666]'
                    }`}>
                      {inv.remaining.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#d39b45]">
                      {profitDisplay}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#666666] text-[11px]">
                      {inv.branch}
                    </td>
                    <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold">
                      {inv.status === 'مدفوعة' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#4f9d69] text-white text-[10px]">
                          ✓ مدفوعة
                        </span>
                      ) : inv.status === 'مؤجلة' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#b85c5c] text-white text-[10px]">
                          ⏳ مؤجلة
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#d39b45] text-white text-[10px]">
                          ⚖️ جزئي
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoiceModal(inv)}
                          className="p-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] rounded-none flex items-center justify-center"
                          title="معاينة التفاصيل والطباعة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteInvoice && (
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="p-1 bg-[#fdf2f2] hover:bg-[#f8d7d7] text-[#b85c5c] border border-[#e0a8a8] rounded-none flex items-center justify-center"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* GRAND TOTALS FOOTER ROW */}
          <tfoot className="bg-[#d8d8d8] text-[#222222] font-extrabold sticky bottom-0 border-t-2 border-[#afafaf]">
            <tr>
              <td colSpan={5} className="p-2 border-l border-[#afafaf] text-right">
                إجمالي عام الفواتير المعروضة ({filteredInvoices.length} فاتورة)
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#4f9d69]">
                {grandTotalValue.toFixed(2)} ج.م
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#222222]">
                {grandPaidValue.toFixed(2)} ج.م
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#b85c5c]">
                {grandRemainingValue.toFixed(2)} ج.م
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#d39b45]">
                {grandActualProfit.toFixed(2)} ج.م
              </td>
              <td colSpan={3} className="p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
