import React, { useState, useMemo } from 'react';
import { InventoryItem, SavedInvoice } from '../types/pos';
import { Search, Plus, Printer, Download, Filter, AlertTriangle, Layers, ArrowUpDown, Edit3, Trash2, Tag, Zap, Clock, ShieldAlert, Eye, Barcode, CheckCircle2, Lock } from 'lucide-react';
import BarcodeLabelsModal from './barcode/BarcodeLabelsModal';
import SmartProductProfileModal from './stores/SmartProductProfileModal';
import FastStockCountModal, { CountedStockRecord } from './modals/FastStockCountModal';
import SensitiveInventoryConfirmModal from './stores/SensitiveInventoryConfirmModal';

interface StoresViewProps {
  inventoryDb: InventoryItem[];
  categories: string[];
  selectedBranch: string;
  completedInvoices?: SavedInvoice[];
  isEditLocked?: boolean;
  onAddItem: () => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (code: string) => void;
}

export default function StoresView({
  inventoryDb,
  categories,
  selectedBranch,
  completedInvoices = [],
  isEditLocked = true,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}: StoresViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('جميع التصنيفات');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'shortage' | 'out' | 'reorder' | 'dead' | 'slow' | 'overstock' | 'frozen' | 'aging' | 'normal' | 'review'>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeSelectedItem, setBarcodeSelectedItem] = useState<InventoryItem | null>(null);
  const [profileSelectedItem, setProfileSelectedItem] = useState<InventoryItem | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFastCountModal, setShowFastCountModal] = useState(false);

  // Sensitive Operation Challenge Modal state (Level 2 protection)
  const [sensitiveModalOpen, setSensitiveModalOpen] = useState(false);
  const [sensitiveActionData, setSensitiveActionData] = useState<{
    title: string;
    description: string;
    itemCode?: string;
    itemName?: string;
    onExecute: () => void;
  } | null>(null);

  // Edit Form state
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editWholesalePrice, setEditWholesalePrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(5);
  const [editListName, setEditListName] = useState('');
  const [editListOrder, setEditListOrder] = useState<number>(1);

  // Helper: Detect review issues for a product (Authoritative criteria)
  const getItemReviewIssues = (item: InventoryItem): string[] => {
    const issues: string[] = [];
    if (item.costPrice === undefined || item.costPrice === null || item.costPrice <= 0) {
      issues.push('بدون تكلفة');
    }
    if (item.price === undefined || item.price === null || item.price <= 0) {
      issues.push('بدون سعر بيع');
    }
    if ((item.stock ?? 0) < 0) {
      issues.push('مخزون سالب');
    }
    if (item.minStock === undefined || item.minStock === null || item.minStock <= 0) {
      issues.push('بدون حد طلب');
    }
    if (!item.name?.trim() || !item.category?.trim() || !item.code?.trim()) {
      issues.push('بيانات ناقصة');
    }
    return issues;
  };

  // Sales History Maps for Dead / Slow Intelligence & Aging
  const { soldQtyMap, lastSoldDateMap } = useMemo(() => {
    const sMap = new Map<string, number>();
    const dMap = new Map<string, string>();

    completedInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        inv.items.forEach(it => {
          const key1 = it.code;
          const key2 = it.name.trim().toLowerCase();
          if (key1) sMap.set(key1, (sMap.get(key1) || 0) + it.quantity);
          if (key2) sMap.set(key2, (sMap.get(key2) || 0) + it.quantity);

          if (key1 && (!dMap.has(key1) || inv.date > dMap.get(key1)!)) {
            dMap.set(key1, inv.date);
          }
          if (key2 && (!dMap.has(key2) || inv.date > dMap.get(key2)!)) {
            dMap.set(key2, inv.date);
          }
        });
      });

    return { soldQtyMap: sMap, lastSoldDateMap: dMap };
  }, [completedInvoices]);

  // Filter items based on search, category, and smart stock intelligence status
  const filteredItems = useMemo(() => {
    const today = new Date();

    return inventoryDb.filter(item => {
      const matchesSearch = item.name.includes(searchQuery) || item.code.includes(searchQuery) || (item.listName && item.listName.includes(searchQuery));
      const matchesCategory = selectedCategory === 'جميع التصنيفات' || item.category === selectedCategory;
      
      const currentStock = item.stock ?? 50;
      const minStock = item.minStock ?? 5;
      const soldQty = soldQtyMap.get(item.code) || soldQtyMap.get(item.name.trim().toLowerCase()) || 0;
      const lastDate = lastSoldDateMap.get(item.code) || lastSoldDateMap.get(item.name.trim().toLowerCase()) || null;
      
      let daysSinceLastSale: number | null = null;
      if (lastDate) {
        const diffMs = today.getTime() - new Date(lastDate).getTime();
        daysSinceLastSale = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      let matchesStatus = true;
      if (stockStatusFilter === 'review') {
        matchesStatus = getItemReviewIssues(item).length > 0;
      } else if (stockStatusFilter === 'shortage') {
        matchesStatus = currentStock > 0 && currentStock <= minStock;
      } else if (stockStatusFilter === 'out') {
        matchesStatus = currentStock <= 0;
      } else if (stockStatusFilter === 'reorder') {
        matchesStatus = currentStock <= minStock;
      } else if (stockStatusFilter === 'dead') {
        matchesStatus = currentStock > 0 && soldQty === 0;
      } else if (stockStatusFilter === 'slow') {
        matchesStatus = currentStock > 0 && soldQty > 0 && soldQty <= 2;
      } else if (stockStatusFilter === 'overstock') {
        matchesStatus = currentStock >= minStock * 4 && currentStock >= 30;
      } else if (stockStatusFilter === 'frozen') {
        matchesStatus = currentStock > 0 && (soldQty === 0 || soldQty <= 2);
      } else if (stockStatusFilter === 'normal') {
        matchesStatus = currentStock > minStock && soldQty > 2;
      } else if (stockStatusFilter === 'aging') {
        matchesStatus = currentStock > 0 && (daysSinceLastSale === null || daysSinceLastSale >= 30);
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventoryDb, searchQuery, selectedCategory, stockStatusFilter, soldQtyMap, lastSoldDateMap]);

  // Group items by Category or List Name
  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'عام';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Overall summary totals & smart counts
  const totalItemsCount = filteredItems.length;
  const totalQuantity = filteredItems.reduce((acc, i) => acc + (i.stock ?? 50), 0);
  const totalCostValue = filteredItems.reduce((acc, i) => acc + ((i.costPrice || i.price * 0.7) * (i.stock ?? 50)), 0);
  const totalSaleValue = filteredItems.reduce((acc, i) => acc + (i.price * (i.stock ?? 50)), 0);
  
  const totalNeedsReviewCount = useMemo(() => {
    return inventoryDb.filter(i => getItemReviewIssues(i).length > 0).length;
  }, [inventoryDb]);

  const totalShortagesCount = inventoryDb.filter(i => (i.stock ?? 50) > 0 && (i.stock ?? 50) <= (i.minStock ?? 5)).length;
  const totalOutOfStockCount = inventoryDb.filter(i => (i.stock ?? 50) <= 0).length;
  const totalDeadCount = inventoryDb.filter(i => (i.stock ?? 50) > 0 && (soldQtyMap.get(i.code) || soldQtyMap.get(i.name.trim().toLowerCase()) || 0) === 0).length;
  const totalFrozenCount = inventoryDb.filter(i => {
    const stock = i.stock ?? 50;
    const sold = soldQtyMap.get(i.code) || soldQtyMap.get(i.name.trim().toLowerCase()) || 0;
    return stock > 0 && (sold === 0 || sold <= 2);
  }).length;
  const totalNormalCount = inventoryDb.filter(i => {
    const stock = i.stock ?? 50;
    const min = i.minStock ?? 5;
    const sold = soldQtyMap.get(i.code) || soldQtyMap.get(i.name.trim().toLowerCase()) || 0;
    return stock > min && sold > 2;
  }).length;
  const totalSlowCount = inventoryDb.filter(i => {
    const qty = soldQtyMap.get(i.code) || soldQtyMap.get(i.name.trim().toLowerCase()) || 0;
    return (i.stock ?? 50) > 0 && qty > 0 && qty <= 2;
  }).length;

  const handleOpenEdit = (item: InventoryItem) => {
    if (isEditLocked) {
      alert('التعديل مقفل — اضغط على قفل التعديل للسماح بالتعديل.');
      return;
    }
    setEditingItem(item);
    setEditCode(item.code);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(item.price);
    setEditCostPrice(item.costPrice || Math.round(item.price * 0.7));
    setEditWholesalePrice(item.wholesalePrice || Math.round(item.price * 0.9));
    setEditStock(item.stock ?? 50);
    setEditMinStock(item.minStock ?? 5);
    setEditListName(item.listName || 'عام');
    setEditListOrder(item.listOrder || 1);
  };

  const handleOpenProfile = (item: InventoryItem) => {
    setProfileSelectedItem(item);
    setShowProfileModal(true);
  };

  const handleSaveEdit = () => {
    if (isEditLocked) {
      alert('التعديل مقفل — اضغط على قفل التعديل للسماح بالتعديل.');
      return;
    }
    if (!editingItem || !editName.trim()) return;
    const updated: InventoryItem = {
      ...editingItem,
      code: editCode,
      name: editName,
      category: editCategory,
      price: editPrice,
      costPrice: editCostPrice,
      wholesalePrice: editWholesalePrice,
      stock: editStock,
      minStock: editMinStock,
      listName: editListName,
      listOrder: editListOrder
    };
    onUpdateItem(updated);
    setEditingItem(null);
  };

  const handleRequestDeleteItem = (item: InventoryItem) => {
    if (isEditLocked) {
      alert('التعديل مقفل — اضغط على قفل التعديل للسماح بالتعديل.');
      return;
    }
    setSensitiveActionData({
      title: 'تأكيد حذف صنف من المخزن',
      description: 'أنت على وشك حذف هذا الصنف وجميع بياناته من قاعدة بيانات المخزن نهائياً.',
      itemCode: item.code,
      itemName: item.name,
      onExecute: () => {
        onDeleteItem(item.code);
        setSensitiveModalOpen(false);
        setSensitiveActionData(null);
      }
    });
    setSensitiveModalOpen(true);
  };

  const exportToExcel = () => {
    const rows = [
      ['الكود', 'اسم الصنف', 'نوع الصنف', 'الكمية الحالية', 'حد الطلب', 'سعر التكلفة', 'سعر البيع', 'سعر الجملة', 'اسم القائمة', 'ترتيب القائمة', 'حالة المخزون'],
      ...filteredItems.map(i => [
        i.code,
        i.name,
        i.category,
        (i.stock ?? 50).toString(),
        (i.minStock ?? 5).toString(),
        (i.costPrice || i.price * 0.7).toString(),
        i.price.toString(),
        (i.wholesalePrice || i.price * 0.9).toString(),
        i.listName || 'عام',
        (i.listOrder || 1).toString(),
        (i.stock ?? 50) <= (i.minStock ?? 5) ? 'نواقص (منخفض)' : 'متوفر'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_المخازن_${selectedBranch}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleApplyFastStockAdjustments = (adjustments: CountedStockRecord[]) => {
    if (isEditLocked) {
      alert('التعديل مقفل — اضغط على قفل التعديل للسماح بالتعديل.');
      return;
    }
    setSensitiveActionData({
      title: 'تأكيد تسوية الفروقات المخزنية',
      description: `أنت على وشك اعتماد تسوية جرد وتعديل أرصدة (${adjustments.length}) صنف في المخزن.`,
      onExecute: () => {
        adjustments.forEach(rec => {
          const updatedItem: InventoryItem = {
            ...rec.item,
            stock: rec.physicalStock
          };
          onUpdateItem(updatedItem);
        });
        alert(`تم بنجاح اعتماد تسوية الفروقات المخزنية لعدد (${adjustments.length}) صنف.`);
        setSensitiveModalOpen(false);
        setSensitiveActionData(null);
      }
    });
    setSensitiveModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7fb] p-1.5 space-y-1.5 overflow-hidden text-xs dir-rtl" dir="rtl">
      
      {/* COMPACT INVENTORY STATUS BAR */}
      <div className="bg-white border border-slate-200 px-2 py-1 flex items-center justify-between flex-wrap gap-1.5 text-xs select-none shadow-2xs">
        <div className="flex items-center gap-1 font-bold text-[#1e3a5f]">
          <span className="text-[11px] text-slate-500">مؤشر المخزون:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'out' ? 'all' : 'out')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'out'
                ? 'bg-[#d9534f] text-white border-[#b52b27] shadow-xs'
                : 'bg-[#fff5f5] text-[#b52b27] border-[#f5c6cb] hover:bg-[#ffebeb]'
            }`}
            title="تصفية: الأصناف التي نفد مخزونها بالكامل"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#d9534f]"></span>
            <span>🔴 نفذ</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalOutOfStockCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'shortage' ? 'all' : 'shortage')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'shortage'
                ? 'bg-[#e8836a] text-white border-[#cc654a] shadow-xs'
                : 'bg-[#fff8f6] text-[#cc654a] border-[#fcd8d0] hover:bg-[#fdebe7]'
            }`}
            title="تصفية: الأصناف عند أو تحت حد الطلب (نواقص)"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#e8836a]"></span>
            <span>🟠 نواقص</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalShortagesCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'dead' ? 'all' : 'dead')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'dead'
                ? 'bg-[#f59f00] text-white border-[#d98200] shadow-xs'
                : 'bg-[#fffcf0] text-[#a66a00] border-[#ffe082] hover:bg-[#fff9db]'
            }`}
            title="تصفية: الأصناف الراكدة بدون بيع"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#f59f00]"></span>
            <span>🟡 راكد</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalDeadCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'frozen' ? 'all' : 'frozen')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'frozen'
                ? 'bg-[#243746] text-white border-[#172530] shadow-xs'
                : 'bg-[#f0f4f8] text-[#243746] border-[#c0d0dc] hover:bg-[#e2eaf0]'
            }`}
            title="تصفية: الأصناف ذات رأس المال المجمد (رواكد أو بطيئة الحركة)"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#243746]"></span>
            <span>🔵 رأس مال مجمد</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalFrozenCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'normal' ? 'all' : 'normal')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'normal'
                ? 'bg-[#4f9d69] text-white border-[#3f8055] shadow-xs'
                : 'bg-[#f4faf6] text-[#34784d] border-[#c3e6cb] hover:bg-[#eaf5ee]'
            }`}
            title="تصفية: الأصناف الطبيعية النشطة"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#4f9d69]"></span>
            <span>🟢 طبيعي</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalNormalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStockStatusFilter(prev => prev === 'review' ? 'all' : 'review')}
            className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              stockStatusFilter === 'review'
                ? 'bg-[#b85c5c] text-white border-[#9c4545] shadow-xs'
                : 'bg-[#fff0f0] text-[#b85c5c] border-[#f8d7da] hover:bg-[#fde8e8]'
            }`}
            title="تصفية: أصناف تحتاج مراجعة (بدون تكلفة، بدون سعر، مخزون سالب، بدون حد طلب، بيانات ناقصة)"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#b85c5c]"></span>
            <span>⚠️ يحتاج مراجعة</span>
            <span className="font-mono px-1 bg-black/10 rounded-xs text-[11px]">{totalNeedsReviewCount}</span>
          </button>

          {stockStatusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStockStatusFilter('all')}
              className="px-1.5 py-0.5 bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#555555] border border-[#afafaf] text-[11px] font-bold"
            >
              إلغاء التصفية ✕
            </button>
          )}
        </div>
      </div>

      {/* FILTER & TOOLBAR HEADER */}
      <div className="bg-[#f0f7fc] border border-slate-200 p-1.5 rounded-none space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Layers className="w-5 h-5 text-[#1e3a5f]" />
            <span>إدارة شاشة المخازن والجرد الاصنافي - {selectedBranch}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFastCountModal(true)}
              className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white font-bold border border-[#152a45] rounded-none flex items-center gap-1 shadow-xs cursor-pointer"
              title="الجرد السريع بالأجهزة والباركود أو الإدخال اليدوي وتسوية الفروقات"
            >
              <Barcode className="w-4 h-4 text-sky-300" />
              الجرد السريع
            </button>
            <button
              onClick={() => {
                setBarcodeSelectedItem(null);
                setShowBarcodeModal(true);
              }}
              className="px-3 py-1 bg-[#1e3a5f] hover:bg-[#152a45] text-white font-bold border border-[#152a45] rounded-none flex items-center gap-1 shadow-xs cursor-pointer"
              title="طباعة ملصقات الباركود المتقدمة للأصناف"
            >
              <Tag className="w-4 h-4 text-sky-300" />
              طباعة ملصقات الباركود
            </button>
            <button
              onClick={onAddItem}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-700 rounded-none flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة صنف جديد
            </button>
            <button
              onClick={exportToExcel}
              className="px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 font-bold border border-slate-300 rounded-none flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              تصدير إكسل (CSV)
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 font-bold border border-slate-300 rounded-none flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              طباعة التقرير
            </button>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-1.5 items-center text-xs">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="بحث بالكود، اسم الصنف، القائمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-white border border-[#999999] rounded-none focus:outline-none focus:border-[#e8836a] text-[#222222] font-bold"
            />
            <Search className="w-4 h-4 text-[#999999] absolute left-2 top-1.5" />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222] font-bold focus:outline-none focus:border-[#e8836a]"
            >
              <option value="جميع التصنيفات">جميع التصنيفات ({categories.length})</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Smart Stock Intelligence Status Dropdown */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className={`w-full px-2 py-1 border font-bold focus:outline-none focus:border-[#e8836a] rounded-none ${
                stockStatusFilter !== 'all' ? 'bg-[#243746] text-white border-[#243746]' : 'bg-white text-[#222222] border-[#999999]'
              }`}
            >
              <option value="all">حالة المخزون (الكل)</option>
              <option value="shortage">⚠️ نواقص (تحت حد الطلب) ({totalShortagesCount})</option>
              <option value="out">🔴 نفد بالكامل (0) ({totalOutOfStockCount})</option>
              <option value="reorder">🔄 عند حد إعادة الطلب ({totalShortagesCount})</option>
              <option value="dead">⏳ راكد بدون بيع ({totalDeadCount})</option>
              <option value="slow">🐢 بطيء الحركة ({totalSlowCount})</option>
              <option value="overstock">🔵 فائض مخزون (Overstock)</option>
              <option value="frozen">💰 رأس مال مجمد (رواكد/بطيء)</option>
              <option value="aging">⌛ تقادم المخزون (&gt;30 يوم)</option>
            </select>
          </div>

          {/* Quick Stats Banner */}
          <div className="md:col-span-2 bg-white border border-slate-200 p-1 rounded-none flex items-center justify-around font-bold text-[11px] text-slate-800 shadow-2xs">
            <span>الأصناف: <strong className="font-mono text-[#1e3a5f]">{totalItemsCount}</strong></span>
            <span>الكميات: <strong className="font-mono text-emerald-700">{totalQuantity}</strong></span>
            <span>القيمة بالتكلفة: <strong className="font-mono text-blue-700">{totalCostValue.toFixed(0)} ج.م</strong></span>
          </div>
        </div>
      </div>

      {/* DATA GRID TABLE */}
      <div className="flex-1 bg-white border border-slate-300 rounded-none overflow-auto relative">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#f0f6fa] text-[#1e3a5f] font-bold sticky top-0 border-b border-[#cbd5e1] z-10 select-none">
            <tr>
              <th className="p-1.5 border-l border-[#e2e8f0] w-10 text-center">م</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24">كود الصنف</th>
              <th className="p-1.5 border-l border-[#e2e8f0]">اسم الصنف</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">نوع الصنف</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-16 text-center">الكمية</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-16 text-center">حد الطلب</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-20 text-center">طلب مقترح</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-20 text-center">التكلفة</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-20 text-center">سعر البيع</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-20 text-center">سعر الجملة</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-24 text-center">القائمة</th>
              <th className="p-1.5 border-l border-[#e2e8f0] w-32 text-center">حالة المخزون</th>
              <th className="p-1.5 text-center w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedItems).length === 0 ? (
              <tr>
                <td colSpan={13} className="p-12 text-center text-slate-400 font-bold">
                  لا توجد أصناف مخزنية تطابق شروط البحث والفلترة.
                </td>
              </tr>
            ) : (
              (Object.entries(groupedItems) as [string, InventoryItem[]][]).map(([catName, items]) => {
                const groupQty = items.reduce((acc, i) => acc + (i.stock ?? 50), 0);
                const groupCostVal = items.reduce((acc, i) => acc + ((i.costPrice || i.price * 0.7) * (i.stock ?? 50)), 0);
                const groupSaleVal = items.reduce((acc, i) => acc + (i.price * (i.stock ?? 50)), 0);

                return (
                  <React.Fragment key={catName}>
                    {/* CATEGORY SUMMARY / GROUP HEADER ROW */}
                    <tr className="bg-[#e8f1f8] border-y border-[#cbd5e1] text-[#1e3a5f] font-extrabold text-xs">
                      <td colSpan={3} className="p-1.5 border-l border-[#cbd5e1]">
                        📁 تصنيف: {catName} ({items.length} صنف)
                      </td>
                      <td className="p-1.5 border-l border-[#cbd5e1] text-center font-mono">
                        مجموع الكمية: {groupQty}
                      </td>
                      <td colSpan={3} className="p-1.5 border-l border-[#cbd5e1] text-center font-mono">
                        إجمالي التكلفة: {groupCostVal.toFixed(2)} ج.م
                      </td>
                      <td colSpan={3} className="p-1.5 border-l border-[#cbd5e1] text-center font-mono">
                        إجمالي البيع: {groupSaleVal.toFixed(2)} ج.م
                      </td>
                      <td colSpan={3} className="p-1.5"></td>
                    </tr>

                    {/* ITEMS ROWS */}
                    {items.map((item, idx) => {
                      const stockVal = item.stock ?? 50;
                      const minStockVal = item.minStock ?? 5;
                      const isOutOfStock = stockVal <= 0;
                      const isLowStock = stockVal <= minStockVal;
                      const targetStock = minStockVal * 2;
                      const suggestedReorder = Math.max(0, targetStock - stockVal);
                      const soldCount = soldQtyMap.get(item.code) || soldQtyMap.get(item.name.trim().toLowerCase()) || 0;
                      const isDead = stockVal > 0 && soldCount === 0;
                      const isSlow = stockVal > 0 && soldCount > 0 && soldCount <= 2;
                      const isOverstock = stockVal >= minStockVal * 4 && stockVal >= 30;

                      const costP = item.costPrice || Math.round(item.price * 0.7);
                      const wholesaleP = item.wholesalePrice || Math.round(item.price * 0.9);

                      return (
                        <tr
                          key={item.code}
                          className={`hover:bg-[#e8e8e8] border-b border-[#d0d0d0] text-[#222222] ${
                            isOutOfStock ? 'bg-[#fdf2f2]' : isLowStock ? 'bg-[#fff9f8]' : isDead ? 'bg-[#fdfaf3]' : ''
                          }`}
                        >
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#666666]">
                            {idx + 1}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] font-mono font-bold text-[#243746]">
                            <button
                              onClick={() => handleOpenProfile(item)}
                              className="text-[#243746] hover:underline cursor-pointer font-mono font-bold text-right"
                              title="عرض ملف الصنف الذكي"
                            >
                              {item.code}
                            </button>
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] font-bold text-[#222222]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenProfile(item)}
                                className="text-[#222222] hover:text-[#e8836a] hover:underline cursor-pointer font-bold text-right"
                                title="عرض ملف الصنف والعمليات السريعة"
                              >
                                {item.name}
                              </button>
                              {getItemReviewIssues(item).map(issue => (
                                <span
                                  key={issue}
                                  onClick={() => handleOpenEdit(item)}
                                  className="px-1 py-0.2 bg-[#fff0f0] text-[#b85c5c] border border-[#f8d7da] text-[10px] font-bold cursor-pointer hover:bg-[#ffe5e5]"
                                  title={`يحتاج مراجعة: ${issue} — انقر لتعديل الصنف فوراً`}
                                >
                                  ⚠️ {issue}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#333333]">
                            {item.category}
                          </td>
                          <td className={`p-1.5 border-l border-[#d0d0d0] text-center font-mono font-extrabold text-xs ${
                            isOutOfStock ? 'text-[#b85c5c] font-black' : isLowStock ? 'text-[#e8836a]' : 'text-[#222222]'
                          }`}>
                            {stockVal}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#666666]">
                            {minStockVal}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                            {suggestedReorder > 0 ? `+${suggestedReorder}` : '-'}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#243746]">
                            {(costP ?? 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono font-bold text-[#4f9d69]">
                            {(item.price ?? 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-mono text-[#243746]">
                            {(wholesaleP ?? 0).toFixed(2)}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center text-[#333333]">
                            {item.listName || 'عام'}
                          </td>
                          <td className="p-1.5 border-l border-[#d0d0d0] text-center font-bold">
                            {isOutOfStock ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#b85c5c] text-white text-[10px]">
                                🔴 نفد (0)
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#e8836a] text-white text-[10px]">
                                ⚠️ نقص ({stockVal})
                              </span>
                            ) : isDead ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#222222] text-white text-[10px]">
                                ⏳ راكد
                              </span>
                            ) : isSlow ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#8a5d14] text-white text-[10px]">
                                🐢 بطيء
                              </span>
                            ) : isOverstock ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#243746] text-white text-[10px]">
                                🔵 فائض ({stockVal})
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded-none bg-[#4f9d69] text-white text-[10px]">
                                ✓ متوفر
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenProfile(item)}
                                className="p-1 bg-[#243746] hover:bg-[#1b2b37] text-[#dceef2] hover:text-white border border-[#1b2b37] rounded-none cursor-pointer"
                                title="عرض ملف الصنف الذكي والعمليات السريعة"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#e8836a]" />
                              </button>
                              <button
                                onClick={() => {
                                  setBarcodeSelectedItem(item);
                                  setShowBarcodeModal(true);
                                }}
                                className="p-1 bg-[#243746] hover:bg-[#1b2b37] text-white border border-[#1b2b37] rounded-none cursor-pointer"
                                title="طباعة ملصق باركود لهذا الصنف"
                              >
                                <Tag className="w-3.5 h-3.5 text-[#e8836a]" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border border-[#afafaf] rounded-none cursor-pointer"
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRequestDeleteItem(item)}
                                className="p-1 bg-[#b85c5c] hover:bg-[#a34b4b] text-white border border-[#afafaf] rounded-none cursor-pointer"
                                title="حذف (يتطلب فتح قفل التعديل وكود التأكيد)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* GRAND TOTALS FOOTER ROW */}
          <tfoot className="bg-[#d8d8d8] text-[#222222] font-extrabold sticky bottom-0 border-t-2 border-[#afafaf]">
            <tr>
              <td colSpan={3} className="p-2 border-l border-[#afafaf] text-right">
                إجمالي عام الأصناف المخزنية ({totalItemsCount} صنف)
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono">
                -
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#b85c5c]">
                {totalQuantity}
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono">
                -
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#243746]">
                {totalCostValue.toFixed(2)} ج.م
              </td>
              <td className="p-2 border-l border-[#afafaf] text-center font-mono text-xs text-[#4f9d69]">
                {totalSaleValue.toFixed(2)} ج.م
              </td>
              <td colSpan={5} className="p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 dir-rtl">
          <div className="bg-[#f0f0f0] border border-[#afafaf] rounded-none max-w-lg w-full text-xs">
            <div className="bg-[#555555] text-white p-2 flex items-center justify-between border-b border-[#333333]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#e8836a]" />
                تعديل بيانات الصنف المخزني
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 text-white hover:text-gray-300 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#222222] mb-0.5">كود الصنف</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">نوع الصنف (التصنيف)</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222]"
                >
                  {categories.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-[#222222] mb-0.5">اسم الصنف بالكامل *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">سعر البيع (قطاعي)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#4f9d69]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">سعر التكلفة</label>
                <input
                  type="number"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#243746]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">سعر الجملة</label>
                <input
                  type="number"
                  value={editWholesalePrice}
                  onChange={(e) => setEditWholesalePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#243746]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">الكمية الحالية</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">حد الطلب (النواقص)</label>
                <input
                  type="number"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono font-bold text-[#b85c5c]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">اسم القائمة</label>
                <input
                  type="text"
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none text-[#222222]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222222] mb-0.5">ترتيب القائمة</label>
                <input
                  type="number"
                  value={editListOrder}
                  onChange={(e) => setEditListOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-mono text-[#222222]"
                />
              </div>
            </div>

            <div className="flex gap-2 p-3 border-t border-[#afafaf]">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-bold rounded-none border border-[#3f8055] text-xs"
              >
                حفظ التغييرات
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] rounded-none text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART PRODUCT PROFILE & QUICK ACTIONS MODAL */}
      <SmartProductProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setProfileSelectedItem(null);
        }}
        item={profileSelectedItem}
        completedInvoices={completedInvoices}
        selectedBranch={selectedBranch}
        inventoryDb={inventoryDb}
      />

      {/* BARCODE LABELS PRINTING MODAL */}
      <BarcodeLabelsModal
        isOpen={showBarcodeModal}
        onClose={() => {
          setShowBarcodeModal(false);
          setBarcodeSelectedItem(null);
        }}
        inventoryDb={inventoryDb}
        selectedBranch={selectedBranch}
        initialSelectedItem={barcodeSelectedItem}
      />

      {/* FAST STOCK COUNT & AUDIT MODAL */}
      <FastStockCountModal
        isOpen={showFastCountModal}
        onClose={() => setShowFastCountModal(false)}
        inventoryDb={inventoryDb}
        selectedBranch={selectedBranch}
        onApplyAdjustments={handleApplyFastStockAdjustments}
      />

      {/* SENSITIVE INVENTORY OPERATION NUMERIC CHALLENGE CONFIRMATION MODAL */}
      {sensitiveActionData && (
        <SensitiveInventoryConfirmModal
          isOpen={sensitiveModalOpen}
          title={sensitiveActionData.title}
          actionDescription={sensitiveActionData.description}
          itemCode={sensitiveActionData.itemCode}
          itemName={sensitiveActionData.itemName}
          onConfirm={sensitiveActionData.onExecute}
          onCancel={() => {
            setSensitiveModalOpen(false);
            setSensitiveActionData(null);
          }}
        />
      )}

    </div>
  );
}
