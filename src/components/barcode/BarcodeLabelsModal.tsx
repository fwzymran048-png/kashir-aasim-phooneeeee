import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../../types/pos';
import {
  Printer,
  X,
  Search,
  CheckSquare,
  Square,
  Sliders,
  Eye,
  Layers,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Tag,
  Copy,
  Plus,
  Minus
} from 'lucide-react';
import BarcodeView from './BarcodeView';

export interface BarcodeLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryDb: InventoryItem[];
  selectedBranch: string;
  initialSelectedItem?: InventoryItem | null;
}

export type BarcodeTemplateId =
  | 'minimal'
  | 'standard'
  | 'detailed'
  | 'thermal_compact'
  | 'a4_grid'
  | 'jewelry';

export interface LabelPrintConfig {
  template: BarcodeTemplateId;
  labelWidthMm: number;
  labelHeightMm: number;
  columnsA4: number;
  showStoreName: boolean;
  storeNameText: string;
  showProductName: boolean;
  showPrice: boolean;
  pricePrefix: string;
  currencySymbol: string;
  showTaxIncluded: boolean;
  showItemCode: boolean;
  showCategory: boolean;
  barcodeHeight: number;
  barcodeBarWidth: number;
  fontSize: number;
}

const DEFAULT_CONFIG: LabelPrintConfig = {
  template: 'standard',
  labelWidthMm: 50,
  labelHeightMm: 30,
  columnsA4: 3,
  showStoreName: true,
  storeNameText: 'Project_y POS',
  showProductName: true,
  showPrice: true,
  pricePrefix: 'السعر:',
  currencySymbol: 'ج.م',
  showTaxIncluded: true,
  showItemCode: true,
  showCategory: false,
  barcodeHeight: 32,
  barcodeBarWidth: 1.5,
  fontSize: 11
};

const STORAGE_KEY = 'project_y_barcode_settings';

export default function BarcodeLabelsModal({
  isOpen,
  onClose,
  inventoryDb,
  selectedBranch,
  initialSelectedItem
}: BarcodeLabelsModalProps) {
  // Quantities map: { [itemCode: string]: number }
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [activeTab, setActiveTab] = useState<'selection' | 'preview' | 'settings'>('selection');

  // Print Config state loaded from localStorage if exists
  const [config, setConfig] = useState<LabelPrintConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved), storeNameText: selectedBranch || DEFAULT_CONFIG.storeNameText };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_CONFIG, storeNameText: selectedBranch || DEFAULT_CONFIG.storeNameText };
  });

  // Save config on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // If initialSelectedItem is provided, select it with quantity 1
  useEffect(() => {
    if (initialSelectedItem) {
      setQuantities({ [initialSelectedItem.code]: 1 });
      setActiveTab('preview');
    }
  }, [initialSelectedItem]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventoryDb.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [inventoryDb]);

  // Filtered inventory items for selection
  const filteredItems = useMemo(() => {
    return inventoryDb.filter((item) => {
      const matchesCategory = categoryFilter === 'الكل' || item.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.listName && item.listName.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [inventoryDb, searchQuery, categoryFilter]);

  // Selected items list with non-zero quantity
  const selectedItemsWithQty = useMemo(() => {
    return inventoryDb
      .filter((item) => (quantities[item.code] || 0) > 0)
      .map((item) => ({
        item,
        qty: quantities[item.code] || 0
      }));
  }, [inventoryDb, quantities]);

  // Total labels count
  const totalLabelsCount = useMemo(() => {
    return selectedItemsWithQty.reduce((acc, curr) => acc + curr.qty, 0);
  }, [selectedItemsWithQty]);

  // Flattened array of all labels to render in preview/print
  const flattenedLabels = useMemo(() => {
    const result: InventoryItem[] = [];
    selectedItemsWithQty.forEach(({ item, qty }) => {
      for (let i = 0; i < qty; i++) {
        result.push(item);
      }
    });
    return result;
  }, [selectedItemsWithQty]);

  // Handlers for quantity
  const handleSetQty = (code: string, qty: number) => {
    setQuantities((prev) => {
      const val = Math.max(0, Math.min(1000, qty));
      if (val === 0) {
        const next = { ...prev };
        delete next[code];
        return next;
      }
      return { ...prev, [code]: val };
    });
  };

  const handleToggleItem = (code: string) => {
    setQuantities((prev) => {
      if (prev[code] && prev[code] > 0) {
        const next = { ...prev };
        delete next[code];
        return next;
      }
      return { ...prev, [code]: 1 };
    });
  };

  const handleSelectAllFiltered = (qty: number = 1) => {
    setQuantities((prev) => {
      const next = { ...prev };
      filteredItems.forEach((i) => {
        next[i.code] = qty;
      });
      return next;
    });
  };

  const handleSelectAllMatchStock = () => {
    setQuantities((prev) => {
      const next = { ...prev };
      filteredItems.forEach((i) => {
        next[i.code] = Math.max(1, Math.min(100, i.stock ?? 1));
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setQuantities({});
  };

  // Change Template Pre-sets
  const applyTemplate = (tmpl: BarcodeTemplateId) => {
    switch (tmpl) {
      case 'minimal':
        setConfig((prev) => ({
          ...prev,
          template: 'minimal',
          labelWidthMm: 40,
          labelHeightMm: 22,
          showStoreName: false,
          showProductName: true,
          showPrice: false,
          showItemCode: true,
          showCategory: false,
          barcodeHeight: 30,
          barcodeBarWidth: 1.4,
          fontSize: 10
        }));
        break;
      case 'standard':
        setConfig((prev) => ({
          ...prev,
          template: 'standard',
          labelWidthMm: 50,
          labelHeightMm: 30,
          showStoreName: true,
          showProductName: true,
          showPrice: true,
          showTaxIncluded: true,
          showItemCode: true,
          showCategory: false,
          barcodeHeight: 32,
          barcodeBarWidth: 1.5,
          fontSize: 11
        }));
        break;
      case 'detailed':
        setConfig((prev) => ({
          ...prev,
          template: 'detailed',
          labelWidthMm: 60,
          labelHeightMm: 40,
          showStoreName: true,
          showProductName: true,
          showPrice: true,
          showTaxIncluded: true,
          showItemCode: true,
          showCategory: true,
          barcodeHeight: 38,
          barcodeBarWidth: 1.6,
          fontSize: 12
        }));
        break;
      case 'thermal_compact':
        setConfig((prev) => ({
          ...prev,
          template: 'thermal_compact',
          labelWidthMm: 38,
          labelHeightMm: 25,
          showStoreName: false,
          showProductName: true,
          showPrice: true,
          showTaxIncluded: false,
          showItemCode: true,
          showCategory: false,
          barcodeHeight: 26,
          barcodeBarWidth: 1.3,
          fontSize: 9
        }));
        break;
      case 'a4_grid':
        setConfig((prev) => ({
          ...prev,
          template: 'a4_grid',
          labelWidthMm: 65,
          labelHeightMm: 35,
          columnsA4: 3,
          showStoreName: true,
          showProductName: true,
          showPrice: true,
          showTaxIncluded: true,
          showItemCode: true,
          showCategory: false,
          barcodeHeight: 32,
          barcodeBarWidth: 1.5,
          fontSize: 11
        }));
        break;
      case 'jewelry':
        setConfig((prev) => ({
          ...prev,
          template: 'jewelry',
          labelWidthMm: 35,
          labelHeightMm: 18,
          showStoreName: false,
          showProductName: true,
          showPrice: true,
          showTaxIncluded: false,
          showItemCode: true,
          showCategory: false,
          barcodeHeight: 20,
          barcodeBarWidth: 1.1,
          fontSize: 8
        }));
        break;
    }
  };

  const handlePrint = () => {
    if (totalLabelsCount === 0) {
      alert('يرجى تحديد صنف واحد على الأقل وتحديد كمية الملصقات للطباعة.');
      return;
    }
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 dir-rtl text-xs font-sans">
      {/* MODAL WRAPPER */}
      <div className="bg-white border border-[#B8D3E3] shadow-2xl flex flex-col w-full max-w-6xl h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="bg-[#E6F3FA] text-[#234B67] px-3 py-2.5 flex items-center justify-between border-b border-[#DCE8EF] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#234B67]">
                  نظام طباعة ملصقات الباركود المتقدم (Barcode Label Studio)
                </span>
                <span className="bg-white px-2 py-0.5 text-[11px] font-mono text-[#234B67] border border-[#B8D3E3] font-bold">
                  الفرع: {selectedBranch}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal">تصميم وتخصيص ملصقات الباركود وتوليد قوالب الطباعة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#4A90C2] text-white px-2.5 py-0.5 font-bold font-mono text-xs shadow-2xs">
              إجمالي الملصقات: {totalLabelsCount}
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="bg-[#F8FBFD] border-b border-[#DCE8EF] px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('selection')}
              className={`px-4 py-1.5 font-bold flex items-center gap-1.5 border transition-all ${
                activeTab === 'selection'
                  ? 'bg-white border-[#B8D3E3] text-[#234B67] shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Layers className="w-4 h-4 text-[#4A90C2]" />
              1. اختيار الأصناف والكميات ({selectedItemsWithQty.length})
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 font-bold flex items-center gap-1.5 border transition-all ${
                activeTab === 'preview'
                  ? 'bg-white border-[#B8D3E3] text-[#234B67] shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Eye className="w-4 h-4 text-[#4A90C2]" />
              2. معاينة الملصقات الحية ({totalLabelsCount} ملصق)
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 font-bold flex items-center gap-1.5 border transition-all ${
                activeTab === 'settings'
                  ? 'bg-white border-[#B8D3E3] text-[#234B67] shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-[#4A90C2]" />
              3. تخصيص القوالب والمقاسات
            </button>
          </div>

          {/* Quick Action Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="px-4 py-1.5 bg-[#4A90C2] hover:bg-[#3b7ea9] text-white font-bold flex items-center gap-1.5 border border-[#3b7ea9] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              طباعة الملصقات الآن ({totalLabelsCount})
            </button>
          </div>
        </div>

        {/* TAB 1: ITEMS SELECTION */}
        {activeTab === 'selection' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden space-y-2 bg-[#f4f7fb]">
            {/* Search and Quick Batch Controls */}
            <div className="bg-white border border-[#B8D3E3] p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="بحث سريع بالاسم، الكود، الباركود..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#F8FBFD] border border-[#B8D3E3] text-slate-800 font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
                >
                  <option value="الكل">جميع التصنيفات ({categories.length})</option>
                  {categories.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Selector Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleSelectAllFiltered(1)}
                  className="px-2.5 py-1 bg-[#E6F3FA] hover:bg-[#d8ecf8] text-[#234B67] font-bold border border-[#B8D3E3] flex items-center gap-1 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  تحديد الكل (1 ملصق)
                </button>
                <button
                  onClick={() => handleSelectAllFiltered(5)}
                  className="px-2.5 py-1 bg-[#E6F3FA] hover:bg-[#d8ecf8] text-[#234B67] font-bold border border-[#B8D3E3] transition-colors"
                >
                  الكل (5 ملصقات)
                </button>
                <button
                  onClick={handleSelectAllMatchStock}
                  className="px-2.5 py-1 bg-[#E6F3FA] hover:bg-[#d8ecf8] text-[#234B67] font-bold border border-[#B8D3E3] transition-colors"
                  title="تحديد عدد ملصقات يساوي كمية الرصيد الحالي بالمخزن"
                >
                  حسب رصيد المخزن
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 flex items-center gap-1 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="flex-1 bg-white border border-[#B8D3E3] overflow-auto shadow-2xs">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-[#E6F3FA] text-[#234B67] font-bold sticky top-0 border-b border-[#DCE8EF] z-10 select-none">
                  <tr>
                    <th className="p-2 border-l border-[#DCE8EF] w-12 text-center">تحديد</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-28">كود الصنف</th>
                    <th className="p-2 border-l border-[#DCE8EF]">اسم الصنف</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-24 text-center">التصنيف</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-20 text-center">الرصيد</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-24 text-center">سعر البيع</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-48 text-center">معاينة الباركود</th>
                    <th className="p-2 border-l border-[#DCE8EF] w-36 text-center">عدد الملصقات</th>
                    <th className="p-2 text-center w-24">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE8EF]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد أصناف مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const qty = quantities[item.code] || 0;
                      const isSelected = qty > 0;
                      return (
                        <tr
                          key={item.code}
                          className={`hover:bg-[#E6F3FA]/50 transition-colors ${
                            isSelected ? 'bg-[#DCEFFA]' : ''
                          }`}
                        >
                          <td className="p-2 border-l border-[#DCE8EF] text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(item.code)}
                              className="w-4 h-4 cursor-pointer accent-[#4A90C2]"
                            />
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF] font-mono font-bold text-[#234B67]">
                            {item.code}
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF] font-bold text-slate-800">
                            {item.name}
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF] text-center text-slate-500">
                            {item.category || 'عام'}
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF] text-center font-mono font-bold text-slate-700">
                            {item.stock ?? 0}
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF] text-center font-mono font-bold text-emerald-600">
                            {(item.price ?? 0).toFixed(2)} ج.م
                          </td>
                          <td className="p-1 border-l border-[#DCE8EF] text-center">
                            <div className="max-w-[140px] mx-auto py-0.5">
                              <BarcodeView
                                value={item.code}
                                options={{
                                  height: 22,
                                  width: 1.2,
                                  fontSize: 8,
                                  margin: 1
                                }}
                              />
                            </div>
                          </td>
                          <td className="p-2 border-l border-[#DCE8EF]">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSetQty(item.code, qty - 1)}
                                className="w-6 h-6 bg-[#e0e0e0] hover:bg-[#d0d0d0] text-[#222222] font-bold flex items-center justify-center border border-[#999999]"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={1000}
                                value={qty}
                                onChange={(e) =>
                                  handleSetQty(item.code, parseInt(e.target.value) || 0)
                                }
                                className="w-14 text-center py-0.5 border border-[#999999] font-mono font-bold text-[#243746] bg-white focus:outline-none focus:border-[#e8836a]"
                              />
                              <button
                                onClick={() => handleSetQty(item.code, qty + 1)}
                                className="w-6 h-6 bg-[#e0e0e0] hover:bg-[#d0d0d0] text-[#222222] font-bold flex items-center justify-center border border-[#999999]"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSetQty(item.code, 1)}
                                className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-[10px]"
                              >
                                1
                              </button>
                              <button
                                onClick={() => handleSetQty(item.code, 5)}
                                className="px-1.5 py-0.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] text-[10px]"
                              >
                                5
                              </button>
                              <button
                                onClick={() => handleSetQty(item.code, item.stock ?? 1)}
                                className="px-1.5 py-0.5 bg-[#e8e8e8] hover:bg-[#d8d8d8] text-[#222222] font-bold border border-[#afafaf] text-[10px]"
                                title="المخزون"
                              >
                                مخزن
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Status Row */}
            <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between font-bold text-xs shrink-0">
              <div className="flex items-center gap-4 text-[#222222]">
                <span>
                  الأصناف المحددة: <strong className="text-[#243746] font-mono">{selectedItemsWithQty.length}</strong>
                </span>
                <span>
                  إجمالي عدد الملصقات للطباعة: <strong className="text-[#4f9d69] font-mono text-sm">{totalLabelsCount} ملصق</strong>
                </span>
              </div>
              <button
                onClick={() => setActiveTab('preview')}
                disabled={totalLabelsCount === 0}
                className="px-4 py-1 bg-[#243746] hover:bg-[#1b2b37] text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                الانتقال للمعاينة الحية &larr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE PREVIEW & PRINT READY VIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden space-y-2 bg-[#e8e8e8]">
            {/* Preview Toolbar */}
            <div className="bg-white border border-[#afafaf] p-2 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#222222]">القالب الحالي:</span>
                <span className="px-2 py-0.5 bg-[#dceef2] text-[#243746] font-bold border border-[#afafaf]">
                  {config.template === 'minimal' && 'موجز (Minimal)'}
                  {config.template === 'standard' && 'قياسي (Standard Retail)'}
                  {config.template === 'detailed' && 'تفصيلي (Detailed / SKU)'}
                  {config.template === 'thermal_compact' && 'حراري صغير (38x25mm)'}
                  {config.template === 'a4_grid' && 'ورق A4 متعدد الملصقات'}
                  {config.template === 'jewelry' && 'مجوهرات واكسسوارات'}
                </span>
                <span className="text-[#666666] font-mono text-xs">
                  (أبعاد الملصق: {config.labelWidthMm}mm × {config.labelHeightMm}mm)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf] flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  تعديل القالب / المقاسات
                </button>
                <button
                  onClick={handlePrint}
                  disabled={totalLabelsCount === 0}
                  className="px-5 py-1 bg-[#4f9d69] hover:bg-[#43885a] text-white font-extrabold flex items-center gap-1.5 border border-[#3f8055] disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الآن ({totalLabelsCount})
                </button>
              </div>
            </div>

            {/* Preview Stage Container */}
            <div className="flex-1 bg-gray-300 border border-[#afafaf] p-4 overflow-auto flex justify-center">
              {totalLabelsCount === 0 ? (
                <div className="m-auto text-center p-8 bg-white border border-[#afafaf] max-w-md">
                  <Tag className="w-12 h-12 text-[#999999] mx-auto mb-2" />
                  <h4 className="font-bold text-[#222222] text-sm">لم يتم تحديد أي أصناف بعد</h4>
                  <p className="text-[#666666] text-xs mt-1 mb-3">
                    يرجى العودة لتبويب "اختيار الأصناف" وتحديد كمية الملصقات المطلوبة.
                  </p>
                  <button
                    onClick={() => setActiveTab('selection')}
                    className="px-4 py-1.5 bg-[#243746] text-white font-bold text-xs"
                  >
                    الذهاب لاختيار الأصناف
                  </button>
                </div>
              ) : (
                <div
                  id="barcode-preview-grid"
                  className={`bg-white shadow-lg p-4 border border-[#afafaf] w-full max-w-5xl ${
                    config.template === 'a4_grid'
                      ? 'grid gap-3'
                      : 'flex flex-wrap gap-3 justify-start content-start'
                  }`}
                  style={
                    config.template === 'a4_grid'
                      ? {
                          gridTemplateColumns: `repeat(${config.columnsA4 || 3}, minmax(0, 1fr))`
                        }
                      : {}
                  }
                >
                  {flattenedLabels.map((item, index) => (
                    <div
                      key={`${item.code}-${index}`}
                      className="border border-dashed border-[#999999] p-2 bg-white flex flex-col justify-between items-center text-center overflow-hidden transition-all hover:border-[#243746]"
                      style={{
                        width: `${config.labelWidthMm * 3.78}px`,
                        minHeight: `${config.labelHeightMm * 3.78}px`,
                        fontSize: `${config.fontSize}px`,
                        pageBreakInside: 'avoid'
                      }}
                    >
                      {/* Store Name Header */}
                      {config.showStoreName && config.storeNameText && (
                        <div className="font-bold text-[9px] text-[#555555] truncate w-full border-b border-gray-200 pb-0.5 mb-0.5">
                          {config.storeNameText}
                        </div>
                      )}

                      {/* Product Name */}
                      {config.showProductName && (
                        <div className="font-extrabold text-[#222222] line-clamp-2 w-full my-0.5 leading-tight">
                          {item.name}
                        </div>
                      )}

                      {/* Barcode SVG Vector */}
                      <div className="w-full my-1 flex justify-center items-center">
                        <BarcodeView
                          value={item.code}
                          options={{
                            height: config.barcodeHeight,
                            width: config.barcodeBarWidth,
                            fontSize: config.fontSize - 2,
                            displayValue: config.showItemCode,
                            margin: 1
                          }}
                        />
                      </div>

                      {/* Details Row: Category & Code if not in barcode */}
                      {config.showCategory && item.category && (
                        <div className="text-[8px] text-[#666666] truncate w-full">
                          التصنيف: {item.category}
                        </div>
                      )}

                      {/* Price Section */}
                      {config.showPrice && (
                        <div className="w-full flex items-center justify-between border-t border-gray-200 pt-0.5 mt-0.5">
                          <span className="text-[9px] text-[#666666] font-bold">
                            {config.pricePrefix}
                          </span>
                          <span className="font-black font-mono text-[#222222] text-xs">
                            {(item.price ?? 0).toFixed(2)} {config.currencySymbol}
                          </span>
                        </div>
                      )}

                      {config.showTaxIncluded && (
                        <div className="text-[7px] text-[#888888] w-full text-center">
                          شامل ضريبة القيمة المضافة 15%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEMPLATES & CONFIGURATION */}
        {activeTab === 'settings' && (
          <div className="flex-1 p-4 bg-[#f0f0f0] overflow-y-auto space-y-4">
            {/* Quick Templates Selector */}
            <div className="bg-white border border-[#afafaf] p-3 space-y-2">
              <h4 className="font-extrabold text-sm text-[#243746] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#e8836a]" />
                اختر القالب الجاهز المناسب لنوع الطابعة والمقاس
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {/* Template 1 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('standard')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'standard'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    🏷️ 1. قياسي للمحلات (50x30 mm)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    اسم المتجر + اسم الصنف + باركود + سعر البيع شامل الضريبة.
                  </div>
                </button>

                {/* Template 2 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('thermal_compact')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'thermal_compact'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    🖨️ 2. حراري صغير (38x25 mm)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    طابعات الرول الحرارية (Xprinter, Zebra, Bixolon) مقاس صغير.
                  </div>
                </button>

                {/* Template 3 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('a4_grid')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'a4_grid'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    📄 3. ورق A4 استيكر (3 أعمدة)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    طباعة مجمعة على أوراق A4 اللاصقة (Avery Sheets).
                  </div>
                </button>

                {/* Template 4 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('detailed')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'detailed'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    📦 4. تفصيلي للمخازن (60x40 mm)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    يشمل كود الصنف، التصنيف، الباركود، والأسعار.
                  </div>
                </button>

                {/* Template 5 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('minimal')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'minimal'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    ⚡ 5. موجز بدون سعر (40x22 mm)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    فقط اسم الصنف والباركود للمنتجات ذات الأسعار المتغيرة.
                  </div>
                </button>

                {/* Template 6 */}
                <button
                  type="button"
                  onClick={() => applyTemplate('jewelry')}
                  className={`p-2.5 text-right border text-xs font-bold transition-all cursor-pointer ${
                    config.template === 'jewelry'
                      ? 'bg-[#f0f9ff] border-[#243746] shadow-xs'
                      : 'bg-white border-[#afafaf] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <div className="font-extrabold text-[#243746] mb-0.5">
                    💎 6. مجوهرات واكسسوارات (35x18 mm)
                  </div>
                  <div className="text-[10px] text-[#666666] font-normal">
                    ملصق دقيق للنظارات والمجوهرات والقطع الصغيرة.
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Settings Form */}
            <div className="bg-white border border-[#afafaf] p-3 space-y-3">
              <h4 className="font-extrabold text-sm text-[#243746]">
                إعدادات الأبعاد والعناصر المعروضة
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#222222] mb-1">عرض الملصق (mm)</label>
                  <input
                    type="number"
                    min={20}
                    max={150}
                    value={config.labelWidthMm}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        labelWidthMm: parseFloat(e.target.value) || 50
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">ارتفاع الملصق (mm)</label>
                  <input
                    type="number"
                    min={15}
                    max={150}
                    value={config.labelHeightMm}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        labelHeightMm: parseFloat(e.target.value) || 30
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">أعمدة الطباعة لورق A4</label>
                  <select
                    value={config.columnsA4}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        columnsA4: parseInt(e.target.value, 10) || 3
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-bold"
                  >
                    <option value={2}>عمودين (2 Columns)</option>
                    <option value={3}>3 أعمدة (3 Columns - الافتراضي)</option>
                    <option value={4}>4 أعمدة (4 Columns)</option>
                    <option value={5}>5 أعمدة (5 Columns)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">ارتفاع خطوط الباركود</label>
                  <input
                    type="number"
                    min={15}
                    max={80}
                    value={config.barcodeHeight}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        barcodeHeight: parseInt(e.target.value, 10) || 30
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#222222] mb-1">عنوان المتجر / الترويسة</label>
                  <input
                    type="text"
                    value={config.storeNameText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        storeNameText: e.target.value
                      }))
                    }
                    placeholder="اسم المتجر أو الفرع..."
                    className="w-full px-2 py-1 border border-[#999999] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">رمز العملة</label>
                  <input
                    type="text"
                    value={config.currencySymbol}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        currencySymbol: e.target.value
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#222222] mb-1">حجم الخط الأساسي</label>
                  <input
                    type="number"
                    min={7}
                    max={16}
                    value={config.fontSize}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        fontSize: parseInt(e.target.value, 10) || 11
                      }))
                    }
                    className="w-full px-2 py-1 border border-[#999999] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="border-t border-[#afafaf] pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showStoreName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showStoreName: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إظهار اسم المتجر</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showProductName}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showProductName: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إظهار اسم الصنف</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showPrice}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showPrice: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إظهار سعر البيع</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showItemCode}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showItemCode: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إظهار أرقام الباركود</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showTaxIncluded}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showTaxIncluded: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إشعار "شامل الضريبة"</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#f9f9f9] p-2 border border-[#e0e0e0]">
                  <input
                    type="checkbox"
                    checked={config.showCategory}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showCategory: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#243746]"
                  />
                  <span>إظهار التصنيف</span>
                </label>
              </div>

              {/* Reset to Default */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="px-3 py-1 bg-[#e8e8e8] hover:bg-[#d8d8d8] text-[#666666] font-bold border border-[#afafaf] flex items-center gap-1 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  استعادة الإعدادات الافتراضية
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="bg-[#e8e8e8] border-t border-[#afafaf] px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[#666666]">
            <span>✓ متوافق مع كافة طابعات الباركود الحرارية القياسية وورق A4</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold border border-[#afafaf]"
            >
              إغلاق
            </button>
            <button
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="px-5 py-1.5 bg-[#4f9d69] hover:bg-[#43885a] text-white font-extrabold border border-[#3f8055] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              تأكيد والطباعة ({totalLabelsCount})
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED PRINT CONTAINER (Shown ONLY when window.print() is called) */}
      <div id="barcode-print-section" className="hidden print:block">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #barcode-print-section, #barcode-print-section * {
                visibility: visible !important;
              }
              #barcode-print-section {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              @page {
                size: auto;
                margin: ${config.template === 'a4_grid' ? '8mm' : '0mm'};
              }
              .barcode-label-print-unit {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
              }
            }
          `
        }} />

        <div
          className={
            config.template === 'a4_grid'
              ? 'grid gap-2'
              : 'flex flex-wrap gap-1'
          }
          style={
            config.template === 'a4_grid'
              ? {
                  gridTemplateColumns: `repeat(${config.columnsA4 || 3}, minmax(0, 1fr))`
                }
              : {}
          }
        >
          {flattenedLabels.map((item, index) => (
            <div
              key={`print-${item.code}-${index}`}
              className="barcode-label-print-unit border border-gray-300 p-1.5 bg-white flex flex-col justify-between items-center text-center overflow-hidden"
              style={{
                width: `${config.labelWidthMm}mm`,
                height: `${config.labelHeightMm}mm`,
                maxHeight: `${config.labelHeightMm}mm`,
                fontSize: `${config.fontSize}px`
              }}
            >
              {config.showStoreName && config.storeNameText && (
                <div className="font-bold text-[8px] text-gray-700 truncate w-full border-b border-gray-300 pb-0.5 mb-0.5">
                  {config.storeNameText}
                </div>
              )}

              {config.showProductName && (
                <div className="font-bold text-black line-clamp-2 w-full my-0.5 leading-tight">
                  {item.name}
                </div>
              )}

              <div className="w-full my-0.5 flex justify-center items-center">
                <BarcodeView
                  value={item.code}
                  options={{
                    height: config.barcodeHeight,
                    width: config.barcodeBarWidth,
                    fontSize: config.fontSize - 2,
                    displayValue: config.showItemCode,
                    margin: 1
                  }}
                />
              </div>

              {config.showCategory && item.category && (
                <div className="text-[7px] text-gray-600 truncate w-full">
                  {item.category}
                </div>
              )}

              {config.showPrice && (
                <div className="w-full flex items-center justify-between border-t border-gray-300 pt-0.5 mt-0.5">
                  <span className="text-[8px] font-bold text-gray-700">
                    {config.pricePrefix}
                  </span>
                  <span className="font-black font-mono text-black text-xs">
                    {(item.price ?? 0).toFixed(2)} {config.currencySymbol}
                  </span>
                </div>
              )}

              {config.showTaxIncluded && (
                <div className="text-[6px] text-gray-500 w-full text-center">
                  شامل الضريبة 15%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
