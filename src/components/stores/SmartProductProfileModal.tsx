import React, { useState, useMemo } from 'react';
import { InventoryItem, SavedInvoice } from '../../types/pos';
import {
  X,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  TrendingUp,
  Tag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Archive,
  BarChart2,
  Eye,
  Hash,
  ShieldCheck,
  Zap,
  RotateCcw
} from 'lucide-react';

export interface SerialLifecycleRecord {
  serial: string;
  status: 'in_stock' | 'sold' | 'returned_sale' | 'returned_purchase';
  purchaseInvoiceId?: string;
  purchaseDate?: string;
  supplierName?: string;
  saleInvoiceId?: string;
  saleDate?: string;
  customerName?: string;
}

export interface SmartProductProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  completedInvoices: SavedInvoice[];
  selectedBranch: string;
  inventoryDb?: InventoryItem[];
}

export default function SmartProductProfileModal({
  isOpen,
  onClose,
  item,
  completedInvoices = [],
  selectedBranch,
  inventoryDb = []
}: SmartProductProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'serials' | 'locations'>('overview');
  const [searchHistory, setSearchHistory] = useState('');

  // 1. Sales & Purchases History Analysis for this specific product
  const productAnalytics = useMemo(() => {
    if (!item) {
      return {
        salesInvoices: [],
        purchaseInvoices: [],
        returnSalesInvoices: [],
        returnPurchaseInvoices: [],
        totalSoldQty: 0,
        totalSoldRevenue: 0,
        totalPurchasedQty: 0,
        totalPurchasedCost: 0,
        lastSaleDate: null as string | null,
        lastPurchaseDate: null as string | null,
        lastSalePrice: null as number | null,
        lastPurchasePrice: null as number | null,
        daysSinceLastSale: null as number | null,
        totalProfit: 0,
        hasMissingCost: false,
        serialsList: [] as SerialLifecycleRecord[]
      };
    }

    const itemCode = item.code?.trim();
    const itemName = item.name?.trim().toLowerCase();

    const matchesItem = (it: { code?: string; name: string }) => {
      if (itemCode && it.code && it.code.trim() === itemCode) return true;
      if (itemName && it.name && it.name.trim().toLowerCase() === itemName) return true;
      return false;
    };

    const salesInvoices: { invoice: SavedInvoice; lineItem: any }[] = [];
    const purchaseInvoices: { invoice: SavedInvoice; lineItem: any }[] = [];
    const returnSalesInvoices: { invoice: SavedInvoice; lineItem: any }[] = [];
    const returnPurchaseInvoices: { invoice: SavedInvoice; lineItem: any }[] = [];

    let totalSoldQty = 0;
    let totalSoldRevenue = 0;
    let totalPurchasedQty = 0;
    let totalPurchasedCost = 0;
    let lastSaleDate: string | null = null;
    let lastPurchaseDate: string | null = null;
    let lastSalePrice: number | null = null;
    let lastPurchasePrice: number | null = null;
    let totalProfit = 0;
    let hasMissingCost = false;

    // Track serials lifecycle
    const serialMap = new Map<string, SerialLifecycleRecord>();

    // If item has a registered serial
    if (item.serial && item.serial.trim()) {
      item.serial.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).forEach(s => {
        serialMap.set(s, {
          serial: s,
          status: 'in_stock'
        });
      });
    }

    // Sort invoices chronologically
    const sortedInvoices = [...completedInvoices].sort((a, b) => {
      const dateA = `${a.date} ${a.time || '00:00'}`;
      const dateB = `${b.date} ${b.time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    sortedInvoices.forEach(inv => {
      inv.items.forEach(it => {
        if (!matchesItem(it)) return;

        const itQty = it.quantity || 0;
        const itPrice = it.price || 0;
        const itCost = it.costPrice !== undefined ? it.costPrice : (item.costPrice !== undefined ? item.costPrice : null);
        const itTotal = it.total || (itQty * itPrice);
        const itSerial = it.serialNumber || (it as any).serial;

        if (inv.type === 'بيع') {
          salesInvoices.push({ invoice: inv, lineItem: it });
          totalSoldQty += itQty;
          totalSoldRevenue += itTotal;
          if (!lastSaleDate || inv.date >= lastSaleDate) {
            lastSaleDate = inv.date;
            lastSalePrice = itPrice;
          }
          if (itCost !== null) {
            totalProfit += itTotal - (itQty * itCost);
          } else {
            hasMissingCost = true;
          }

          if (itSerial) {
            const existing: SerialLifecycleRecord = serialMap.get(itSerial) || { serial: itSerial, status: 'in_stock' };
            existing.status = 'sold';
            existing.saleInvoiceId = inv.id;
            existing.saleDate = inv.date;
            existing.customerName = inv.customerName;
            serialMap.set(itSerial, existing);
          }
        } else if (inv.type === 'شراء') {
          purchaseInvoices.push({ invoice: inv, lineItem: it });
          totalPurchasedQty += itQty;
          totalPurchasedCost += itTotal;
          if (!lastPurchaseDate || inv.date >= lastPurchaseDate) {
            lastPurchaseDate = inv.date;
            lastPurchasePrice = itPrice;
          }

          if (itSerial) {
            const existing: SerialLifecycleRecord = serialMap.get(itSerial) || { serial: itSerial, status: 'in_stock' };
            existing.purchaseInvoiceId = inv.id;
            existing.purchaseDate = inv.date;
            existing.supplierName = inv.customerName;
            if (existing.status !== 'sold') {
              existing.status = 'in_stock';
            }
            serialMap.set(itSerial, existing);
          }
        } else if (inv.type === 'مرتجع بيع') {
          returnSalesInvoices.push({ invoice: inv, lineItem: it });
          totalSoldQty -= itQty;
          totalSoldRevenue -= itTotal;
          if (itCost !== null) {
            totalProfit -= itTotal - (itQty * itCost);
          }

          if (itSerial) {
            const existing: SerialLifecycleRecord = serialMap.get(itSerial) || { serial: itSerial, status: 'in_stock' };
            existing.status = 'returned_sale';
            serialMap.set(itSerial, existing);
          }
        } else if (inv.type === 'مرتجع شراء') {
          returnPurchaseInvoices.push({ invoice: inv, lineItem: it });
          totalPurchasedQty -= itQty;
          totalPurchasedCost -= itTotal;

          if (itSerial) {
            const existing: SerialLifecycleRecord = serialMap.get(itSerial) || { serial: itSerial, status: 'in_stock' };
            existing.status = 'returned_purchase';
            serialMap.set(itSerial, existing);
          }
        }
      });
    });

    let daysSinceLastSale: number | null = null;
    if (lastSaleDate) {
      const today = new Date();
      const diffMs = today.getTime() - new Date(lastSaleDate).getTime();
      daysSinceLastSale = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      salesInvoices: salesInvoices.reverse(),
      purchaseInvoices: purchaseInvoices.reverse(),
      returnSalesInvoices,
      returnPurchaseInvoices,
      totalSoldQty: Math.max(0, totalSoldQty),
      totalSoldRevenue: Math.max(0, totalSoldRevenue),
      totalPurchasedQty: Math.max(0, totalPurchasedQty),
      totalPurchasedCost: Math.max(0, totalPurchasedCost),
      lastSaleDate,
      lastPurchaseDate,
      lastSalePrice,
      lastPurchasePrice,
      daysSinceLastSale,
      totalProfit,
      hasMissingCost,
      serialsList: Array.from(serialMap.values())
    };
  }, [item, completedInvoices]);

  if (!isOpen || !item) return null;

  const currentStock = item.stock ?? 50;
  const minStock = item.minStock ?? 5;
  const targetStock = minStock * 2;
  const suggestedReorder = Math.max(0, targetStock - currentStock);
  const costPrice = item.costPrice !== undefined ? item.costPrice : Math.round(item.price * 0.7);
  const sellingPrice = item.price || 0;
  const wholesalePrice = item.wholesalePrice || Math.round(item.price * 0.9);
  const unitProfitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;
  const unitGrossProfit = sellingPrice - costPrice;
  const frozenCapital = currentStock > 0 ? currentStock * costPrice : 0;

  // Health / Status Badge
  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= minStock;
  const isReorderPoint = currentStock <= minStock;
  const isDead = currentStock > 0 && productAnalytics.totalSoldQty === 0;
  const isSlow = currentStock > 0 && productAnalytics.totalSoldQty > 0 && productAnalytics.totalSoldQty <= 2;
  const isOverstock = currentStock >= minStock * 4 && currentStock >= 30;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 dir-rtl text-xs font-sans" dir="rtl">
      <div className="bg-white border border-[#B8D3E3] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="bg-[#E6F3FA] text-[#234B67] p-3 flex items-center justify-between border-b border-[#DCE8EF] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#234B67]">{item.name}</span>
                <span className="font-mono text-[11px] bg-white text-[#234B67] px-2 py-0.5 border border-[#B8D3E3] font-bold">
                  كود: {item.code}
                </span>
                {productAnalytics.serialsList.length > 0 && (
                  <span className="text-[10px] bg-[#4A90C2] text-white px-2 py-0.5 font-bold shadow-2xs">
                    📱 منتج بالسيريال ({productAnalytics.serialsList.length})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                التصنيف: {item.category || 'عام'} | القائمة: {item.listName || 'الرئيسية'} | الفرع: {selectedBranch}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP METRIC CARDS / STATUS BAR */}
        <div className="bg-[#F8FBFD] border-b border-[#DCE8EF] p-2.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 shrink-0 text-xs">
          
          {/* Stock & Reorder Status */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">المخزون الحالي</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-base font-black font-mono ${
                isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {currentStock}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">حد الطلب: {minStock}</span>
            </div>
            <div className="mt-1">
              {isOutOfStock ? (
                <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold">🔴 نفد المخزون</span>
              ) : isLowStock ? (
                <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold">⚠️ نواقص (منخفض)</span>
              ) : isDead ? (
                <span className="inline-block px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold">⏳ راكد</span>
              ) : isSlow ? (
                <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-bold">🐢 بطيء الحركة</span>
              ) : isOverstock ? (
                <span className="inline-block px-1.5 py-0.5 bg-[#E6F3FA] text-[#234B67] border border-[#B8D3E3] text-[9px] font-bold">🔵 فائض مخزون</span>
              ) : (
                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold">🟢 مخزون سليم</span>
              )}
            </div>
          </div>

          {/* Suggested Reorder */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">طلب مقترح / الهدف</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-black font-mono text-[#234B67]">
                {suggestedReorder > 0 ? `+${suggestedReorder}` : 'مكتفٍ'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">الهدف: {targetStock}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {suggestedReorder > 0 ? 'يوصى بالشراء' : 'الرصيد يغطي الطلب'}
            </div>
          </div>

          {/* Pricing & Cost */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">سعر البيع / التكلفة</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-black font-mono text-emerald-600">{sellingPrice.toFixed(2)}</span>
              <span className="text-[11px] font-mono text-[#234B67] font-bold">{costPrice.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>جملة: {wholesalePrice.toFixed(0)}</span>
              <span className="text-emerald-600 font-bold font-mono">%{unitProfitMargin.toFixed(0)}</span>
            </div>
          </div>

          {/* Sales Volume */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">إجمالي المبيعات</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-black font-mono text-[#234B67]">
                {productAnalytics.totalSoldQty} <span className="text-[10px] font-normal text-slate-400">وحدة</span>
              </span>
            </div>
            <div className="text-[10px] text-emerald-600 font-mono font-bold mt-1">
              {productAnalytics.totalSoldRevenue.toFixed(0)} ج.م
            </div>
          </div>

          {/* Realized Gross Profit */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">الأرباح المحققة</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-black font-mono text-emerald-600">
                {productAnalytics.totalProfit.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {productAnalytics.hasMissingCost ? '⚠️ تقديرية جزئياً' : '✓ دقيقة ومؤكدة'}
            </div>
          </div>

          {/* Stock Age / Frozen Capital */}
          <div className="bg-white border border-[#B8D3E3] p-2 flex flex-col justify-between shadow-2xs">
            <span className="text-slate-500 text-[10px] font-bold">عمر المخزون / المجمد</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-black font-mono text-amber-700">
                {productAnalytics.daysSinceLastSale !== null ? `${productAnalytics.daysSinceLastSale} يوم` : 'لا مبيعات'}
              </span>
            </div>
            <div className="text-[10px] text-amber-700 font-mono font-bold mt-1">
              رأس مال: {frozenCapital.toFixed(0)} ج.م
            </div>
          </div>

        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="bg-[#E6F3FA] px-2 pt-1 flex items-center gap-1 border-b border-[#DCE8EF] shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-[#234B67] border-[#4A90C2] shadow-2xs'
                : 'text-slate-600 hover:bg-white/60 border-transparent'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            نظرة تشغيلية عامة
          </button>
          
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'sales'
                ? 'bg-white text-[#234B67] border-[#4A90C2] shadow-2xs'
                : 'text-slate-600 hover:bg-white/60 border-transparent'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            سجل المبيعات ({productAnalytics.salesInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'purchases'
                ? 'bg-white text-[#234B67] border-[#4A90C2] shadow-2xs'
                : 'text-slate-600 hover:bg-white/60 border-transparent'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            سجل المشتريات والتوريد ({productAnalytics.purchaseInvoices.length})
          </button>

          <button
            onClick={() => setActiveTab('serials')}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'serials'
                ? 'bg-white text-[#234B67] border-[#4A90C2] shadow-2xs'
                : 'text-slate-600 hover:bg-white/60 border-transparent'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            السيريالات وIMEI ({productAnalytics.serialsList.length})
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'locations'
                ? 'bg-white text-[#234B67] border-[#4A90C2] shadow-2xs'
                : 'text-slate-600 hover:bg-white/60 border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            الموقع والأفرع
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 p-3 overflow-y-auto bg-white">
          
          {/* TAB 1: OVERVIEW & INTELLIGENCE */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              
              {/* Strategic Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                
                {/* Cost vs Selling Dynamics */}
                <div className="bg-[#f9f9f9] border border-[#afafaf] p-2.5 space-y-2">
                  <h4 className="font-bold text-[#243746] flex items-center gap-1.5 border-b border-[#afafaf] pb-1">
                    <DollarSign className="w-4 h-4 text-[#4f9d69]" />
                    هيكل التسعير وهامش الربحية
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">سعر التكلفة المعتمد:</span>
                      <span className="font-mono font-bold text-[#243746]">{costPrice.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">سعر البيع قطاعي (الحالي):</span>
                      <span className="font-mono font-bold text-[#4f9d69]">{sellingPrice.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">سعر الجملة:</span>
                      <span className="font-mono font-bold text-[#243746]">{wholesalePrice.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">ربح الوحدة الواحدة:</span>
                      <span className="font-mono font-bold text-[#4f9d69]">+{unitGrossProfit.toFixed(2)} ج.م</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#666666]">نسبة هامش الربح:</span>
                      <span className="font-mono font-black text-[#4f9d69]">%{unitProfitMargin.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Movement & Velocity */}
                <div className="bg-[#f9f9f9] border border-[#afafaf] p-2.5 space-y-2">
                  <h4 className="font-bold text-[#243746] flex items-center gap-1.5 border-b border-[#afafaf] pb-1">
                    <TrendingUp className="w-4 h-4 text-[#e8836a]" />
                    حركة الصنف وسرعة الدوران
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">تاريخ آخر حركة بيع:</span>
                      <span className="font-mono font-bold text-[#222222]">
                        {productAnalytics.lastSaleDate || 'لا توجد حركة سابقة'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">آخر سعر بيع تم به:</span>
                      <span className="font-mono font-bold text-[#4f9d69]">
                        {productAnalytics.lastSalePrice !== null ? `${productAnalytics.lastSalePrice.toFixed(2)} ج.م` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">تاريخ آخر حركة شراء:</span>
                      <span className="font-mono font-bold text-[#222222]">
                        {productAnalytics.lastPurchaseDate || 'لا توجد حركة سابقة'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-[#e8e8e8]">
                      <span className="text-[#666666]">آخر سعر شراء تم به:</span>
                      <span className="font-mono font-bold text-[#243746]">
                        {productAnalytics.lastPurchasePrice !== null ? `${productAnalytics.lastPurchasePrice.toFixed(2)} ج.م` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#666666]">عمر المخزون الراكد:</span>
                      <span className="font-mono font-bold text-[#8a5d14]">
                        {productAnalytics.daysSinceLastSale !== null ? `${productAnalytics.daysSinceLastSale} يوماً` : 'جديد'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Reorder Recommendation Box */}
              <div className="p-3 border border-[#afafaf] bg-[#f0f7f9] space-y-1">
                <div className="flex items-center justify-between font-bold text-[#243746]">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#e8836a]" />
                    التوصية التشغيلية الذكية لإعادة الطلب
                  </span>
                  <span className="text-xs font-mono font-bold text-[#4f9d69]">
                    الهدف: {targetStock} وحدة
                  </span>
                </div>
                <p className="text-[#555555] text-xs leading-relaxed">
                  {isOutOfStock ? (
                    <strong className="text-[#b85c5c]">
                      الصنف نفد تماماً من المخزن! يوصى بطلب توريد عاجل بكمية لا تقل عن {suggestedReorder} وحدة لتغطية نقطة الطلب الآمنة.
                    </strong>
                  ) : isLowStock ? (
                    <strong className="text-[#e8836a]">
                      الكمية الحالية ({currentStock}) أقل من حد الأمان ({minStock}). يوصى بطلب توريد {suggestedReorder} وحدة للوصول للمخزون المستهدف ({targetStock}).
                    </strong>
                  ) : isDead ? (
                    <strong className="text-[#222222]">
                      الصنف راكد ولم يسجل أي عملية بيع حتى الآن. يوصى بعدم شراء كميات إضافية وعمل عروض ترويجية لتسييل رأس المال المجمد ({frozenCapital.toFixed(0)} ج.م).
                    </strong>
                  ) : isSlow ? (
                    <strong className="text-[#8a5d14]">
                      حركة الصنف بطيئة جداً. تجنب زيادة المخزون فوق حد الطلب لتفادي تجميد السيولة.
                    </strong>
                  ) : (
                    <strong className="text-[#4f9d69]">
                      مستوى المخزون ممتاز ومطابق لمعدلات السحب والتشغيل. لا يلزم أي إجراء حالياً.
                    </strong>
                  )}
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: SALES INVOICES HISTORY */}
          {activeTab === 'sales' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#243746] flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#4f9d69]" />
                  سجل فواتير مبيعات الصنف ({productAnalytics.salesInvoices.length} فاتورة)
                </h4>
                <span className="text-xs font-mono font-bold text-[#4f9d69]">
                  إجمالي المباع: {productAnalytics.totalSoldQty} وحدة | {productAnalytics.totalSoldRevenue.toFixed(2)} ج.م
                </span>
              </div>

              {productAnalytics.salesInvoices.length === 0 ? (
                <div className="p-8 text-center text-[#888888] bg-[#f9f9f9] border border-dashed border-[#afafaf]">
                  لم يتم تسجيل أي فواتير بيع لهذا الصنف بعد.
                </div>
              ) : (
                <div className="border border-[#afafaf] overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-[#e8e8e8] text-[#222222] font-bold border-b border-[#afafaf]">
                      <tr>
                        <th className="p-1.5 border-r border-[#afafaf]">رقم الفاتورة</th>
                        <th className="p-1.5 border-r border-[#afafaf]">التاريخ والوقت</th>
                        <th className="p-1.5 border-r border-[#afafaf]">العميل</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">الكمية</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">سعر البيع</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">الإجمالي</th>
                        <th className="p-1.5 border-r border-[#afafaf]">السيريال / IMEI</th>
                        <th className="p-1.5">الفرع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalytics.salesInvoices.map(({ invoice, lineItem }, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8]">
                            #{invoice.id}
                          </td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">
                            {invoice.date} {invoice.time || ''}
                          </td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">
                            {invoice.customerName || 'عميل نقدي'}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-center border-r border-[#e8e8e8]">
                            {lineItem.quantity}
                          </td>
                          <td className="p-1.5 font-mono text-center text-[#4f9d69] font-bold border-r border-[#e8e8e8]">
                            {(lineItem.price || 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 font-mono text-center font-bold text-[#243746] border-r border-[#e8e8e8]">
                            {(lineItem.total || (lineItem.quantity * lineItem.price)).toFixed(2)} ج.م
                          </td>
                          <td className="p-1.5 font-mono text-[#222222] border-r border-[#e8e8e8]">
                            {lineItem.serialNumber || lineItem.serial || '-'}
                          </td>
                          <td className="p-1.5 text-[#666666]">
                            {invoice.branch || selectedBranch}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PURCHASES INVOICES HISTORY */}
          {activeTab === 'purchases' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#243746] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#e8836a]" />
                  سجل فواتير الشراء والتوريد ({productAnalytics.purchaseInvoices.length} فاتورة)
                </h4>
                <span className="text-xs font-mono font-bold text-[#243746]">
                  إجمالي التوريد: {productAnalytics.totalPurchasedQty} وحدة | {productAnalytics.totalPurchasedCost.toFixed(2)} ج.م
                </span>
              </div>

              {productAnalytics.purchaseInvoices.length === 0 ? (
                <div className="p-8 text-center text-[#888888] bg-[#f9f9f9] border border-dashed border-[#afafaf]">
                  لم يتم تسجيل أي فواتير شراء لهذا الصنف بعد.
                </div>
              ) : (
                <div className="border border-[#afafaf] overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-[#e8e8e8] text-[#222222] font-bold border-b border-[#afafaf]">
                      <tr>
                        <th className="p-1.5 border-r border-[#afafaf]">رقم الفاتورة</th>
                        <th className="p-1.5 border-r border-[#afafaf]">التاريخ والوقت</th>
                        <th className="p-1.5 border-r border-[#afafaf]">المورد</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">الكمية</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">سعر الشراء</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">الإجمالي</th>
                        <th className="p-1.5 border-r border-[#afafaf]">السيريال / IMEI</th>
                        <th className="p-1.5">الفرع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalytics.purchaseInvoices.map(({ invoice, lineItem }, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8]">
                            #{invoice.id}
                          </td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">
                            {invoice.date} {invoice.time || ''}
                          </td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">
                            {invoice.customerName || 'مورد عام'}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-center border-r border-[#e8e8e8]">
                            {lineItem.quantity}
                          </td>
                          <td className="p-1.5 font-mono text-center text-[#243746] font-bold border-r border-[#e8e8e8]">
                            {(lineItem.price || lineItem.costPrice || 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 font-mono text-center font-bold text-[#243746] border-r border-[#e8e8e8]">
                            {(lineItem.total || (lineItem.quantity * lineItem.price)).toFixed(2)} ج.م
                          </td>
                          <td className="p-1.5 font-mono text-[#222222] border-r border-[#e8e8e8]">
                            {lineItem.serialNumber || lineItem.serial || '-'}
                          </td>
                          <td className="p-1.5 text-[#666666]">
                            {invoice.branch || selectedBranch}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SERIALS / IMEI TRACKER */}
          {activeTab === 'serials' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#243746] flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-[#e8836a]" />
                  سجل الأجهزة والسيريالات وIMEI المسجلة ({productAnalytics.serialsList.length} سيريال)
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#4f9d69] font-bold">
                    🟢 بالمخزن: {productAnalytics.serialsList.filter(s => s.status === 'in_stock').length}
                  </span>
                  <span className="text-[#243746] font-bold">
                    🔵 مباع: {productAnalytics.serialsList.filter(s => s.status === 'sold').length}
                  </span>
                </div>
              </div>

              {productAnalytics.serialsList.length === 0 ? (
                <div className="p-8 text-center text-[#888888] bg-[#f9f9f9] border border-dashed border-[#afafaf]">
                  هذا الصنف غير مرتبط بأرقام تسلسلية (سيريال / IMEI) مسجلة.
                </div>
              ) : (
                <div className="border border-[#afafaf] overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-[#e8e8e8] text-[#222222] font-bold border-b border-[#afafaf]">
                      <tr>
                        <th className="p-1.5 border-r border-[#afafaf]">م</th>
                        <th className="p-1.5 border-r border-[#afafaf]">الرقم التسلسلي (Serial / IMEI)</th>
                        <th className="p-1.5 border-r border-[#afafaf] text-center">الحالة الحالية</th>
                        <th className="p-1.5 border-r border-[#afafaf]">فاتورة الشراء / المورد</th>
                        <th className="p-1.5">فاتورة البيع / العميل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAnalytics.serialsList.map((s, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono text-[#888888] border-r border-[#e8e8e8]">{idx + 1}</td>
                          <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8] select-all">
                            {s.serial}
                          </td>
                          <td className="p-1.5 text-center border-r border-[#e8e8e8]">
                            {s.status === 'in_stock' ? (
                              <span className="px-1.5 py-0.5 bg-[#4f9d69] text-white text-[10px] font-bold">
                                🟢 متوفر بالمخزن
                              </span>
                            ) : s.status === 'sold' ? (
                              <span className="px-1.5 py-0.5 bg-[#243746] text-white text-[10px] font-bold">
                                🔵 تم البيع
                              </span>
                            ) : s.status === 'returned_sale' ? (
                              <span className="px-1.5 py-0.5 bg-[#8a5d14] text-white text-[10px] font-bold">
                                🟡 مرتجع بيع
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-[#b85c5c] text-white text-[10px] font-bold">
                                🔴 مرتجع شراء
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 border-r border-[#e8e8e8] text-[11px]">
                            {s.purchaseInvoiceId ? (
                              <div>
                                <span className="font-mono font-bold">#{s.purchaseInvoiceId}</span> ({s.purchaseDate})
                                <div className="text-[#666666]">{s.supplierName || 'مورد'}</div>
                              </div>
                            ) : (
                              <span className="text-[#888888]">رصيد افتتاحي / مخزن</span>
                            )}
                          </td>
                          <td className="p-1.5 text-[11px]">
                            {s.saleInvoiceId ? (
                              <div>
                                <span className="font-mono font-bold text-[#4f9d69]">#{s.saleInvoiceId}</span> ({s.saleDate})
                                <div className="text-[#666666]">{s.customerName || 'عميل'}</div>
                              </div>
                            ) : (
                              <span className="text-[#888888]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LOCATIONS & MULTI-BRANCH */}
          {activeTab === 'locations' && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#243746] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#243746]" />
                توزيع المخزون عبر المواقع والأفرع
              </h4>

              <div className="border border-[#afafaf]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-[#e8e8e8] text-[#222222] font-bold border-b border-[#afafaf]">
                    <tr>
                      <th className="p-1.5 border-r border-[#afafaf]">الفرع / الموقع المخزني</th>
                      <th className="p-1.5 border-r border-[#afafaf] text-center">الكمية المتوفرة</th>
                      <th className="p-1.5 border-r border-[#afafaf] text-center">حد الطلب</th>
                      <th className="p-1.5 border-r border-[#afafaf] text-center">المخزون المستهدف</th>
                      <th className="p-1.5">الحالة والتوصية</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e8e8e8] bg-[#fdfaf3]">
                      <td className="p-2 font-bold text-[#243746] border-r border-[#e8e8e8]">
                        📍 {selectedBranch} (الفرع الحالي)
                      </td>
                      <td className="p-2 font-mono font-bold text-center border-r border-[#e8e8e8] text-sm">
                        <span className={isOutOfStock ? 'text-[#b85c5c]' : isLowStock ? 'text-[#e8836a]' : 'text-[#4f9d69]'}>
                          {currentStock}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-center border-r border-[#e8e8e8] text-[#666666]">
                        {minStock}
                      </td>
                      <td className="p-2 font-mono text-center border-r border-[#e8e8e8] text-[#243746] font-bold">
                        {targetStock}
                      </td>
                      <td className="p-2">
                        {isOutOfStock ? (
                          <span className="text-[#b85c5c] font-bold">🔴 نفد المخزون بالكامل - طلب عاجل</span>
                        ) : isLowStock ? (
                          <span className="text-[#e8836a] font-bold">⚠️ تحت حد الطلب - يوصى بتوريد {suggestedReorder} وحدة</span>
                        ) : (
                          <span className="text-[#4f9d69] font-bold">🟢 رصيد كافٍ ومطابق للحدود الآمنة</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2.5 bg-[#f9f9f9] border border-[#afafaf] text-[11px] text-[#666666] space-y-1">
                <div className="font-bold text-[#222222]">معلومات الرف والقائمة الداخلية:</div>
                <div>اسم القائمة / الرف: <strong>{item.listName || 'عام'}</strong></div>
                <div>ترتيب العرض بالقائمة: <strong>#{item.listOrder || 1}</strong></div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-[#F8FBFD] border-t border-[#DCE8EF] p-2.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            البيانات مستخرجة بصورة حية من محرك الفواتير والمخازن التراكمي.
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#4A90C2] hover:bg-[#3b7ea9] text-white font-bold text-xs rounded-none border border-[#3b7ea9] cursor-pointer shadow-2xs transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
