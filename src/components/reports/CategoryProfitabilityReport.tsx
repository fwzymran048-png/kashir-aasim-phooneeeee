import React, { useState, useMemo } from 'react';
import { SavedInvoice, InventoryItem } from '../../services/storage';
import { Layers, Download, Printer, Filter, DollarSign, TrendingUp, AlertTriangle, Package, Search } from 'lucide-react';

interface CategoryProfitabilityReportProps {
  completedInvoices: SavedInvoice[];
  inventoryDb?: InventoryItem[];
  selectedBranch: string;
  fromDate?: string;
  toDate?: string;
}

export interface CategoryProfitabilityRow {
  category: string;
  itemCount: number;
  distinctSoldItemsCount: number;
  totalSoldQty: number;
  grossRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  historicalCost: number;
  grossProfit: number;
  profitMargin: number;
  invoiceCount: number;
  hasMissingCost: boolean;
  missingCostItemsCount: number;
}

export default function CategoryProfitabilityReport({
  completedInvoices,
  inventoryDb = [],
  selectedBranch,
  fromDate,
  toDate
}: CategoryProfitabilityReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'margin' | 'qty' | 'invoices'>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter invoices by date and type 'بيع' / 'مرتجع بيع'
  const filteredInvoices = useMemo(() => {
    return completedInvoices.filter(inv => {
      if (fromDate && inv.date < fromDate) return false;
      if (toDate && inv.date > toDate) return false;
      return inv.type === 'بيع' || inv.type === 'مرتجع بيع';
    });
  }, [completedInvoices, fromDate, toDate]);

  // Aggregate Category Profitability using strictly recorded historical costPrice
  const categoryData = useMemo(() => {
    const map = new Map<string, {
      category: string;
      itemCount: number;
      distinctSoldCodes: Set<string>;
      totalSoldQty: number;
      grossRevenue: number;
      totalDiscounts: number;
      netRevenue: number;
      historicalCost: number;
      grossProfit: number;
      invoiceIds: Set<string>;
      hasMissingCost: boolean;
      missingCostItemsCount: number;
    }>();

    // Initialize with all categories in inventory database
    inventoryDb.forEach(item => {
      const cat = (item.category && item.category.trim()) || 'عام';
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          itemCount: 0,
          distinctSoldCodes: new Set(),
          totalSoldQty: 0,
          grossRevenue: 0,
          totalDiscounts: 0,
          netRevenue: 0,
          historicalCost: 0,
          grossProfit: 0,
          invoiceIds: new Set(),
          hasMissingCost: false,
          missingCostItemsCount: 0
        });
      }
      const rec = map.get(cat)!;
      rec.itemCount += 1;
    });

    // Aggregate sales invoices
    filteredInvoices.forEach(inv => {
      const isSale = inv.type === 'بيع';
      const sign = isSale ? 1 : -1;
      const invGross = inv.items.reduce((s, x) => s + (x.total || (x.quantity * x.price)), 0);

      inv.items.forEach(it => {
        const dbItem = inventoryDb.find(
          db => db.code === it.code || db.name.trim().toLowerCase() === it.name.trim().toLowerCase()
        );
        const cat = (it.category && it.category.trim()) || dbItem?.category?.trim() || 'عام';

        if (!map.has(cat)) {
          map.set(cat, {
            category: cat,
            itemCount: 1,
            distinctSoldCodes: new Set(),
            totalSoldQty: 0,
            grossRevenue: 0,
            totalDiscounts: 0,
            netRevenue: 0,
            historicalCost: 0,
            grossProfit: 0,
            invoiceIds: new Set(),
            hasMissingCost: false,
            missingCostItemsCount: 0
          });
        }

        const rec = map.get(cat)!;
        rec.invoiceIds.add(inv.id);
        const itemKey = it.code || it.name;
        if (itemKey) rec.distinctSoldCodes.add(itemKey);

        const itemQty = it.quantity * sign;
        const itemGross = (it.total || (it.quantity * it.price)) * sign;
        const itemDiscount = (invGross > 0 && inv.discount) ? ((Math.abs(itemGross) / invGross) * inv.discount * sign) : 0;
        const netRev = itemGross - itemDiscount;

        rec.totalSoldQty += itemQty;
        rec.grossRevenue += itemGross;
        rec.totalDiscounts += itemDiscount;
        rec.netRevenue += netRev;

        // Financial Integrity: Strict Historical Cost only
        if (it.costPrice !== undefined && it.costPrice !== null) {
          const costVal = (it.quantity * it.costPrice) * sign;
          rec.historicalCost += costVal;
          rec.grossProfit += (netRev - costVal);
        } else {
          rec.hasMissingCost = true;
          rec.missingCostItemsCount += 1;
        }
      });
    });

    const rows: CategoryProfitabilityRow[] = Array.from(map.values()).map(r => {
      const netRev = Math.max(0, r.netRevenue);
      const histCost = Math.max(0, r.historicalCost);
      const grossProf = r.hasMissingCost && r.totalSoldQty > 0 && histCost === 0 ? 0 : (netRev - histCost);
      const margin = (!r.hasMissingCost && netRev > 0) ? (grossProf / netRev) * 100 : (netRev > 0 && histCost > 0 ? (grossProf / netRev) * 100 : 0);

      return {
        category: r.category,
        itemCount: r.itemCount,
        distinctSoldItemsCount: r.distinctSoldCodes.size,
        totalSoldQty: r.totalSoldQty,
        grossRevenue: r.grossRevenue,
        totalDiscounts: r.totalDiscounts,
        netRevenue: netRev,
        historicalCost: histCost,
        grossProfit: grossProf,
        profitMargin: margin,
        invoiceCount: r.invoiceIds.size,
        hasMissingCost: r.hasMissingCost,
        missingCostItemsCount: r.missingCostItemsCount
      };
    });

    return rows;
  }, [inventoryDb, filteredInvoices]);

  // Filtered & Sorted Rows
  const displayedRows = useMemo(() => {
    return categoryData
      .filter(r => !searchQuery.trim() || r.category.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'revenue') diff = b.netRevenue - a.netRevenue;
        else if (sortBy === 'profit') diff = b.grossProfit - a.grossProfit;
        else if (sortBy === 'margin') diff = b.profitMargin - a.profitMargin;
        else if (sortBy === 'qty') diff = b.totalSoldQty - a.totalSoldQty;
        else if (sortBy === 'invoices') diff = b.invoiceCount - a.invoiceCount;

        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [categoryData, searchQuery, sortBy, sortOrder]);

  // Overall Totals
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalQty = 0;
    let anyMissing = false;

    displayedRows.forEach(r => {
      totalRevenue += r.netRevenue;
      totalCost += r.historicalCost;
      totalProfit += r.grossProfit;
      totalQty += r.totalSoldQty;
      if (r.hasMissingCost) anyMissing = true;
    });

    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalQty,
      overallMargin,
      anyMissing
    };
  }, [displayedRows]);

  const handleExportCSV = () => {
    const rows = [
      ['التصنيف / نوع الصنف', 'عدد الأصناف المسجلة', 'الأصناف المباعة', 'الكمية المباعة', 'عدد الفواتير', 'إجمالي الإيراد (ج.م)', 'التكلفة التاريخية (COGS)', 'إجمالي الربح (ج.م)', 'هامش الربح %', 'حالة بيانات التكلفة'],
      ...displayedRows.map(r => [
        r.category,
        r.itemCount.toString(),
        r.distinctSoldItemsCount.toString(),
        r.totalSoldQty.toString(),
        r.invoiceCount.toString(),
        r.netRevenue.toFixed(2),
        r.hasMissingCost && r.historicalCost === 0 ? 'غير مكتمل' : r.historicalCost.toFixed(2),
        r.hasMissingCost && r.historicalCost === 0 ? 'غير متاح' : r.grossProfit.toFixed(2),
        r.hasMissingCost && r.historicalCost === 0 ? '-' : `${r.profitMargin.toFixed(1)}%`,
        r.hasMissingCost ? 'يوجد بنود بدون تكلفة تاريخية' : 'مكتملة ومعتمدة'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_ربحية_التصنيفات_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl select-none" dir="rtl">
      
      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
        <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-[#666666]">إجمالي مبيعات الأقسام</span>
            <span className="text-base font-black font-mono text-[#243746]">
              {totals.totalRevenue.toFixed(2)} <span className="text-[10px] text-[#666666]">ج.م</span>
            </span>
          </div>
          <DollarSign className="w-6 h-6 text-[#243746] opacity-30" />
        </div>

        <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-[#666666]">التكلفة التاريخية الفعلية (COGS)</span>
            <span className="text-base font-black font-mono text-[#777777]">
              {totals.totalCost.toFixed(2)} <span className="text-[10px] text-[#666666]">ج.م</span>
            </span>
          </div>
          <Package className="w-6 h-6 text-[#777777] opacity-30" />
        </div>

        <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-[#666666]">مجمل الربح التجاري</span>
            <span className={`text-base font-black font-mono ${totals.totalProfit >= 0 ? 'text-[#4f9d69]' : 'text-[#d9534f]'}`}>
              {totals.totalProfit.toFixed(2)} <span className="text-[10px] text-[#666666]">ج.م</span>
            </span>
          </div>
          <TrendingUp className="w-6 h-6 text-[#4f9d69] opacity-30" />
        </div>

        <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-[#666666]">متوسط هامش الربح %</span>
            <span className="text-base font-black font-mono text-[#e8836a]">
              {totals.overallMargin.toFixed(1)}%
            </span>
          </div>
          <Layers className="w-6 h-6 text-[#e8836a] opacity-30" />
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="بحث في التصنيفات والأقسام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-white border border-[#999999] text-xs font-bold focus:outline-none focus:border-[#e8836a]"
            />
            <Search className="w-4 h-4 text-[#888888] absolute left-2 top-1.5" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[#243746] text-[11px]">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 bg-white border border-[#999999] text-xs font-bold focus:outline-none"
          >
            <option value="profit">مجمل الربح (الأعلى)</option>
            <option value="revenue">إجمالي الإيراد</option>
            <option value="margin">نسبة الهامش %</option>
            <option value="qty">الكمية المباعة</option>
            <option value="invoices">عدد الفواتير</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-2 py-1 bg-white hover:bg-[#dceef2] border border-[#afafaf] font-bold text-xs"
            title="تبديل اتجاه الترتيب (تصاعدي / تنازلي)"
          >
            {sortOrder === 'desc' ? 'تنازلي ↓' : 'تصاعدي ↑'}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>
        </div>
      </div>

      {/* CATEGORY PROFITABILITY DATA TABLE */}
      <div className="flex-1 bg-white border border-[#afafaf] overflow-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#d8d8d8] text-[#222222] font-bold sticky top-0 border-b border-[#afafaf] z-10">
            <tr>
              <th className="p-1.5 border-l border-[#afafaf] w-10 text-center">م</th>
              <th className="p-1.5 border-l border-[#afafaf]">نوع الصنف / التصنيف</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الأصناف المسجلة</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الأصناف المباعة</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">الكمية المباعة</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">عدد الفواتير</th>
              <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">إجمالي المبيعات</th>
              <th className="p-1.5 border-l border-[#afafaf] w-32 text-center">التكلفة التاريخية (COGS)</th>
              <th className="p-1.5 border-l border-[#afafaf] w-28 text-center">مجمل الربح</th>
              <th className="p-1.5 border-l border-[#afafaf] w-24 text-center">نسبة الهامش</th>
              <th className="p-1.5 text-center w-28">حالة التكلفة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-[#888888] font-bold">
                  لا توجد بيانات مطابقة لخيارات التصفية والفترة الزمنية المحددة.
                </td>
              </tr>
            ) : (
              displayedRows.map((row, idx) => (
                <tr
                  key={row.category}
                  className={`hover:bg-[#f2f7f9] ${
                    row.grossProfit < 0 ? 'bg-[#fff5f5]' : row.totalSoldQty > 0 ? 'bg-white' : 'bg-[#fafafa] opacity-75'
                  }`}
                >
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono text-[#666666] font-bold">
                    {idx + 1}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] font-bold text-[#243746]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#243746]"></span>
                      <span>{row.category}</span>
                    </div>
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono text-[#555555]">
                    {row.itemCount}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono text-[#243746] font-bold">
                    {row.distinctSoldItemsCount}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono font-black text-[#222222]">
                    {row.totalSoldQty}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono text-[#555555]">
                    {row.invoiceCount}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono font-bold text-[#243746]">
                    {row.netRevenue.toFixed(2)} ج.م
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono text-[#777777]">
                    {row.hasMissingCost && row.historicalCost === 0 ? (
                      <span className="text-[#b85c5c] font-bold">غير متوفر</span>
                    ) : (
                      `${row.historicalCost.toFixed(2)} ج.م`
                    )}
                  </td>
                  <td className={`p-1.5 border-l border-[#e0e0e0] text-center font-mono font-black ${
                    row.grossProfit > 0 ? 'text-[#4f9d69]' : row.grossProfit < 0 ? 'text-[#d9534f]' : 'text-[#777777]'
                  }`}>
                    {row.hasMissingCost && row.historicalCost === 0 ? (
                      <span className="text-[#888888] font-normal">-</span>
                    ) : (
                      `${row.grossProfit.toFixed(2)} ج.م`
                    )}
                  </td>
                  <td className="p-1.5 border-l border-[#e0e0e0] text-center font-mono font-bold">
                    {row.hasMissingCost && row.historicalCost === 0 ? (
                      <span className="text-[#888888]">-</span>
                    ) : (
                      <span className={`px-1.5 py-0.5 ${
                        row.profitMargin >= 30
                          ? 'bg-[#eaf5ee] text-[#34784d]'
                          : row.profitMargin >= 15
                            ? 'bg-[#f0f4f8] text-[#243746]'
                            : row.profitMargin > 0
                              ? 'bg-[#fff9db] text-[#8a5d14]'
                              : 'bg-[#fde8e8] text-[#b52b27]'
                      }`}>
                        {row.profitMargin.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="p-1.5 text-center">
                    {row.hasMissingCost ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b85c5c] bg-[#fff0f0] px-1.5 py-0.5 border border-[#f5c6cb]" title="يوجد أصناف مباعة بدون تسجيل سعر تكلفة تاريخي">
                        <AlertTriangle className="w-3 h-3" />
                        تكلفة ناقصة ({row.missingCostItemsCount})
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold text-[#4f9d69] bg-[#eaf5ee] px-1.5 py-0.5 border border-[#c3e6cb]">
                        ✓ مكتملة
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER TOTALS BAR */}
      <div className="bg-[#dceef2] border border-[#afafaf] px-3 py-1.5 flex items-center justify-between font-bold text-xs shrink-0">
        <div className="flex items-center gap-4">
          <span>التصنيفات المعروضة: <strong className="font-mono text-[#243746]">{displayedRows.length}</strong></span>
          <span>إجمالي الكميات المباعة: <strong className="font-mono text-[#222222]">{totals.totalQty}</strong></span>
          <span>إجمالي المبيعات: <strong className="font-mono text-[#243746]">{totals.totalRevenue.toFixed(2)} ج.م</strong></span>
          <span>إجمالي التكلفة التاريخية: <strong className="font-mono text-[#777777]">{totals.totalCost.toFixed(2)} ج.م</strong></span>
          <span>صافي مجمل الربح: <strong className={`font-mono ${totals.totalProfit >= 0 ? 'text-[#4f9d69]' : 'text-[#d9534f]'}`}>{totals.totalProfit.toFixed(2)} ج.م</strong></span>
        </div>
        <div>
          <span>هامش الربح الإجمالي: <strong className="font-mono text-[#e8836a]">{totals.overallMargin.toFixed(1)}%</strong></span>
        </div>
      </div>

    </div>
  );
}
