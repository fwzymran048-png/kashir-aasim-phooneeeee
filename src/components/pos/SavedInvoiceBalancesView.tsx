import React, { useState } from 'react';
import { FileText, Search, Download, Printer, Plus } from 'lucide-react';
import { SavedInvoice } from '../../types/pos';

interface SavedInvoiceBalancesViewProps {
  invoice: SavedInvoice;
  onNewInvoice?: () => void;
  onPrint?: () => void;
  onBackToEdit?: () => void;
}

export const SavedInvoiceBalancesView: React.FC<SavedInvoiceBalancesViewProps> = ({
  invoice,
  onNewInvoice,
  onPrint,
  onBackToEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const isPurchase = invoice.type === 'شراء' || invoice.type === 'مرتجع شراء';
  const partyLabel = isPurchase ? 'المورد' : 'العميل';
  const partyName = invoice.customerName || (isPurchase ? 'مورد عام' : 'عميل نقدي');

  const filteredItems = invoice.items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  });

  const exportInvoiceCSV = () => {
    const rows = [
      [`فاتورة ${invoice.type}: ${invoice.id}`],
      [`الطرف: ${partyName}`, `الهاتف: ${invoice.customerPhone || '-'}`, `الفرع: ${invoice.branch || 'الرئيسي'}`, `التاريخ: ${invoice.date} ${invoice.time}`],
      ['م', 'كود الصنف', 'اسم الصنف والبيان', 'القسم', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'الملاحظات / السيريال'],
      ...invoice.items.map((item, idx) => [
        (idx + 1).toString(),
        item.code || '-',
        item.name,
        item.category || 'عام',
        item.quantity.toString(),
        item.price.toFixed(2),
        item.total.toFixed(2),
        item.serialNumber ? `SN: ${item.serialNumber}` : item.notes || '-'
      ]),
      ['الإجمالي الصافي', invoice.total.toFixed(2), 'المدفوع', invoice.paid.toFixed(2), 'المتبقي', invoice.remaining.toFixed(2)]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `فاتورة_${invoice.id}_${invoice.date.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] overflow-hidden text-xs dir-rtl" dir="rtl">
      
      {/* 1. SUB-TAB TOOLBAR & ACTIONS (EXACT BALANCES VIEW SPEC) */}
      <div className="bg-[#f0f7fc] border-b border-slate-200 p-1.5 shrink-0 flex items-center justify-between flex-wrap gap-1.5 text-xs">
        
        {/* Left Side: Title & Status Count */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#234B67]" />
          <span className="font-bold text-[#234B67] text-xs">
            سجل فاتورة {invoice.type} (محفوظة)
          </span>
          <span className="bg-white border border-slate-300 px-1.5 py-0.2 font-mono font-bold text-[#234B67] text-[11px]">
            رقم: {invoice.id}
          </span>
          <span className="bg-white border border-slate-300 px-1.5 py-0.2 font-mono font-bold text-[#234B67] text-[11px]">
            {filteredItems.length} صنف
          </span>
          <span className={`px-1.5 py-0.2 font-bold text-[11px] border ${
            invoice.status === 'مدفوعة'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : invoice.status === 'مؤجلة'
              ? 'bg-rose-50 text-rose-700 border-rose-300'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            {invoice.status || (invoice.remaining === 0 ? 'مدفوعة' : 'آجل')}
          </span>
          {(invoice.originalInvoiceNumber || invoice.originalInvoiceId) && (
            <span className="bg-amber-50 border border-amber-200 px-1.5 py-0.2 font-mono font-bold text-amber-800 text-[11px]">
              مرتجع من فاتورة أصلية: {invoice.originalInvoiceNumber || invoice.originalInvoiceId}
            </span>
          )}
        </div>

        {/* Center / Right: Search & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث في أصناف الفاتورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 pl-7 pr-2 py-0.5 bg-white border border-[#B8D3E3] font-bold text-xs text-slate-800 rounded-none focus:outline-none focus:border-[#4A90C2]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-1.5" />
          </div>

          {onNewInvoice && (
            <button
              onClick={onNewInvoice}
              className="px-2.5 py-0.5 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold text-xs border border-[#3A759F] rounded-none flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              فاتورة جديدة
            </button>
          )}

          <button
            onClick={exportInvoiceCSV}
            title="تصدير بيانات الفاتورة إلى ملف Excel / CSV"
            className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold text-xs border border-slate-300 rounded-none flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير إكسل
          </button>

          {onPrint && (
            <button
              onClick={onPrint}
              title="طباعة إيصال الفاتورة (يدوي)"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold text-xs border border-slate-300 rounded-none flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>
          )}

          {onBackToEdit && (
            <button
              onClick={onBackToEdit}
              title="العودة لشاشة التحرير"
              className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold text-xs border border-slate-300 rounded-none flex items-center gap-1"
            >
              العودة للتحرير
            </button>
          )}
        </div>
      </div>

      {/* 2. METADATA INFO BANNER (EXACT BALANCES VIEW SPEC) */}
      <div className="bg-white p-2.5 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-bold">
        <div className="border-l border-slate-200 pl-2">
          <span className="text-slate-500 block text-[10px]">الاسم والطرف ({partyLabel}):</span>
          <span className="text-slate-800 font-bold truncate block">{partyName}</span>
        </div>
        <div className="border-l border-slate-200 pl-2">
          <span className="text-slate-500 block text-[10px]">الهاتف / الفرع:</span>
          <span className="font-mono text-[#234B67] block truncate">
            {invoice.customerPhone || '-'} | {invoice.branch || 'الفرع الرئيسي'}
          </span>
        </div>
        <div className="border-l border-slate-200 pl-2">
          <span className="text-slate-500 block text-[10px]">التاريخ والوقت / الخزينة:</span>
          <span className="text-[#234B67] font-mono block truncate">
            {invoice.date} {invoice.time} | {invoice.drawer || 'الدرج الرئيسي'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">الصافي المستحق:</span>
          <span className="font-mono font-bold text-sm text-emerald-600">
            {invoice.total.toFixed(2)} ج.م
          </span>
        </div>
      </div>

      {/* 3. MAIN DATA GRID AREA (MATCHING BALANCES GRID EXACT STRUCTURE & COLORS) */}
      <div className="flex-1 bg-white border-b border-slate-200 overflow-auto relative">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#E6F3FA] text-[#234B67] font-bold sticky top-0 border-b border-[#DCE8EF] z-10 select-none">
            <tr>
              <th className="p-1.5 border-l border-[#DCE8EF] w-10 text-center">م</th>
              <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">كود الصنف</th>
              <th className="p-1.5 border-l border-[#DCE8EF]">اسم الصنف والبيان</th>
              <th className="p-1.5 border-l border-[#DCE8EF] w-28 text-center">القسم</th>
              <th className="p-1.5 border-l border-[#DCE8EF] w-20 text-center">الكمية</th>
              <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">سعر الوحدة</th>
              <th className="p-1.5 border-l border-[#DCE8EF] w-28 text-center">الإجمالي</th>
              <th className="p-1.5 border-l border-[#DCE8EF]">الملاحظات / السيريال</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE8EF] font-medium text-slate-800">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                  لا توجد أصناف مطابقة للبحث.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-[#F8FBFD] border-b border-[#DCE8EF]">
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-[#234B67]">
                    {item.code || '-'}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] font-bold text-slate-800">
                    {item.name}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center text-[11px] text-slate-600">
                    {item.category || 'عام'}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-slate-800">
                    {item.quantity}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-[#234B67]">
                    {item.price.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-emerald-700">
                    {item.total.toFixed(2)} ج.م
                  </td>
                  <td className="p-1.5 border-l border-[#DCE8EF] text-slate-500 text-[11px] truncate max-w-xs">
                    {item.serialNumber ? `SN: ${item.serialNumber}` : item.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALS SUMMARY FOOTER BAR (EXACT BALANCES VIEW SUMMARY BAR) */}
      <div className="bg-[#f0f7fc] border-t border-slate-200 p-2 shrink-0 flex items-center justify-between text-xs font-bold text-slate-700 select-none">
        <div className="flex items-center gap-4 flex-wrap">
          <span>إجمالي الأصناف: <strong className="font-mono text-[#234B67]">{invoice.items.length}</strong></span>
          <span>إجمالي الكمية: <strong className="font-mono text-[#234B67]">{invoice.items.reduce((s, i) => s + i.quantity, 0)}</strong></span>
          <span>الخصم: <strong className="font-mono text-rose-600">{invoice.discount ? invoice.discount.toFixed(2) : '0.00'} ج.م</strong></span>
          <span>الضريبة: <strong className="font-mono text-[#234B67]">{invoice.tax ? invoice.tax.toFixed(2) : '0.00'} ج.م</strong></span>
          <span>المدفوع نقدًا: <strong className="font-mono text-emerald-600">{invoice.paid.toFixed(2)} ج.م</strong></span>
          <span>المتبقي / الآجل: <strong className="font-mono text-amber-600">{invoice.remaining.toFixed(2)} ج.م</strong></span>
        </div>
        <div className="bg-white border border-slate-300 px-3 py-1 text-[#234B67]">
          <span>الإجمالي الصافي: </span>
          <strong className="font-mono text-sm text-emerald-600">{invoice.total.toFixed(2)} ج.م</strong>
        </div>
      </div>

    </div>
  );
};
