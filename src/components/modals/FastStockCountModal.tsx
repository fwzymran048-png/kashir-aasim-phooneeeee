import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InventoryItem } from '../../types/pos';
import { Barcode, Search, Check, X, Trash2, AlertTriangle, Layers, FileCheck, ArrowRight, ShieldCheck, DollarSign, Package } from 'lucide-react';

export interface CountedStockRecord {
  item: InventoryItem;
  systemStock: number;
  physicalStock: number;
  diff: number;
  unitCost: number;
  financialDiff: number;
  hasMissingCost: boolean;
  notes: string;
}

interface FastStockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryDb: InventoryItem[];
  selectedBranch: string;
  onApplyAdjustments: (adjustments: CountedStockRecord[]) => void;
}

export default function FastStockCountModal({
  isOpen,
  onClose,
  inventoryDb,
  selectedBranch,
  onApplyAdjustments
}: FastStockCountModalProps) {
  // Workflow Step: 'count' -> 'review'
  const [activeStep, setActiveStep] = useState<'count' | 'review'>('count');
  const [scanQuery, setScanQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [physicalCountInput, setPhysicalCountInput] = useState<string>('');
  const [countNotes, setCountNotes] = useState<string>('');
  const [countedList, setCountedList] = useState<CountedStockRecord[]>([]);
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [confirmAdjustment, setConfirmAdjustment] = useState(false);
  const [filterDifferenceOnly, setFilterDifferenceOnly] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const physicalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveStep('count');
      setScanQuery('');
      setSelectedItem(null);
      setPhysicalCountInput('');
      setCountNotes('');
      setCountedList([]);
      setConfirmAdjustment(false);
      setFilterDifferenceOnly(false);
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Scan / Search change
  const handleQueryChange = (query: string) => {
    setScanQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const trimmed = query.trim().toLowerCase();
    const exact = inventoryDb.find(
      i => i.code.toLowerCase() === trimmed || (i.serial && i.serial.toLowerCase() === trimmed)
    );

    if (exact) {
      setSelectedItem(exact);
      setPhysicalCountInput('');
      setShowSearchResults(false);
      setTimeout(() => {
        physicalInputRef.current?.focus();
      }, 20);
      return;
    }

    const matches = inventoryDb.filter(
      i =>
        i.name.toLowerCase().includes(trimmed) ||
        i.code.toLowerCase().includes(trimmed) ||
        i.category.toLowerCase().includes(trimmed) ||
        (i.serial && i.serial.toLowerCase().includes(trimmed))
    ).slice(0, 8);

    setSearchResults(matches);
    setShowSearchResults(matches.length > 0);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setScanQuery(item.name);
    setShowSearchResults(false);
    setPhysicalCountInput('');
    setTimeout(() => {
      physicalInputRef.current?.focus();
    }, 20);
  };

  const handleAddCountRecord = () => {
    if (!selectedItem) return;
    const physicalVal = parseFloat(physicalCountInput);
    if (isNaN(physicalVal) || physicalVal < 0) {
      alert('يرجى إدخال كمية جرد فعلية صحيحة (أكبر من أو تساوي 0)');
      physicalInputRef.current?.focus();
      return;
    }

    const systemVal = selectedItem.stock ?? 0;
    const diff = physicalVal - systemVal;
    const hasMissingCost = selectedItem.costPrice === undefined || selectedItem.costPrice === null;
    const unitCost = !hasMissingCost ? (selectedItem.costPrice || 0) : 0;
    const financialDiff = diff * unitCost;

    // Check if item already counted in this session
    const existingIndex = countedList.findIndex(c => c.item.code === selectedItem.code);
    const newRecord: CountedStockRecord = {
      item: selectedItem,
      systemStock: systemVal,
      physicalStock: physicalVal,
      diff,
      unitCost,
      financialDiff,
      hasMissingCost,
      notes: countNotes
    };

    if (existingIndex >= 0) {
      const updated = [...countedList];
      updated[existingIndex] = newRecord;
      setCountedList(updated);
    } else {
      setCountedList(prev => [newRecord, ...prev]);
    }

    // Reset current entry
    setSelectedItem(null);
    setScanQuery('');
    setPhysicalCountInput('');
    setCountNotes('');
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 20);
  };

  const handleRemoveRecord = (code: string) => {
    setCountedList(prev => prev.filter(c => c.item.code !== code));
  };

  const handleConfirmCommit = () => {
    if (countedList.length === 0) return;
    onApplyAdjustments(countedList);
    onClose();
  };

  // Metrics Calculations
  const totalCountedItems = countedList.length;
  const totalSystemQty = countedList.reduce((acc, c) => acc + c.systemStock, 0);
  const totalPhysicalQty = countedList.reduce((acc, c) => acc + c.physicalStock, 0);
  const netDifferenceQty = totalPhysicalQty - totalSystemQty;

  const surplusItems = countedList.filter(c => c.diff > 0);
  const shortageItems = countedList.filter(c => c.diff < 0);
  const matchedItems = countedList.filter(c => c.diff === 0);

  const totalSurplusQty = surplusItems.reduce((acc, c) => acc + c.diff, 0);
  const totalSurplusValue = surplusItems.reduce((acc, c) => acc + c.financialDiff, 0);

  const totalShortageQty = Math.abs(shortageItems.reduce((acc, c) => acc + c.diff, 0));
  const totalShortageValue = Math.abs(shortageItems.reduce((acc, c) => acc + c.financialDiff, 0));

  const netFinancialDiff = countedList.reduce((acc, c) => acc + c.financialDiff, 0);

  const currentDiff = selectedItem && physicalCountInput !== '' && !isNaN(parseFloat(physicalCountInput))
    ? parseFloat(physicalCountInput) - (selectedItem.stock ?? 0)
    : null;

  const displayedList = filterDifferenceOnly ? countedList.filter(c => c.diff !== 0) : countedList;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 dir-rtl text-xs select-none">
      <div className="bg-white border border-[#B8D3E3] shadow-2xl rounded-none w-full max-w-5xl max-h-[94vh] flex flex-col">
        
        {/* HEADER */}
        <div className="bg-[#E6F3FA] text-[#234B67] px-3 py-2 flex items-center justify-between border-b border-[#DCE8EF] shrink-0 font-bold">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-[#4A90C2]" />
            <h3 className="font-bold text-sm text-[#234B67]">
              نظام الجرد المخزني الذكي وتسوية الفروقات (Stocktaking Workflow) — {selectedBranch}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Step Badges */}
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-300 shadow-2xs">
              <span className={`px-2 py-0.5 font-bold ${activeStep === 'count' ? 'bg-[#4A90C2] text-white' : 'text-slate-400'}`}>
                1. إدخال وحصر الجرد
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 font-bold ${activeStep === 'review' ? 'bg-[#4A90C2] text-white' : 'text-slate-400'}`}>
                2. مراجعة وتأكيد التسوية
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 font-bold"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-3 space-y-2.5 flex-1 overflow-y-auto bg-[#f4f7fb]">
          
          {/* STEP 1: COUNTING ENTRY */}
          {activeStep === 'count' && (
            <div className="bg-white border border-slate-200 p-2.5 space-y-2 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                
                {/* Product Scan / Search */}
                <div className="sm:col-span-6 relative">
                  <label className="block font-bold text-[#234B67] mb-0.5 text-[11px]">
                    امسح الباركود أو ابحث بالاسم / الكود / السيريال (Enter)
                  </label>
                  <div className="relative">
                    <input
                      ref={scanInputRef}
                      type="text"
                      placeholder="امسح الباركود أو اكتب كود / اسم الصنف..."
                      value={scanQuery}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (searchResults.length > 0) {
                            handleSelectItem(searchResults[0]);
                          } else if (selectedItem) {
                            physicalInputRef.current?.focus();
                          }
                        }
                      }}
                      className="w-full pl-8 pr-2 py-1 bg-white border border-[#B8D3E3] rounded-none focus:outline-none focus:border-[#4A90C2] text-slate-800 font-bold shadow-2xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1.5" />
                  </div>

                  {/* Search Autocomplete Dropdown */}
                  {showSearchResults && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-300 rounded-none z-50 max-h-48 overflow-y-auto shadow-md">
                      {searchResults.map((item) => (
                        <div
                          key={item.code}
                          onClick={() => handleSelectItem(item)}
                          className="p-1.5 border-b border-slate-100 hover:bg-[#F8FBFD] cursor-pointer flex justify-between items-center text-xs font-bold"
                        >
                          <div>
                            <span className="text-slate-800">{item.name}</span>
                            <span className="text-slate-500 text-[10px] mr-1">({item.category})</span>
                            {item.serial && (
                              <span className="bg-amber-50 border border-amber-200 text-amber-800 px-1 mr-1 text-[10px] font-mono">
                                SN: {item.serial}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-slate-500">كود: {item.code}</span>
                            <span className="text-[#234B67]">رصيد النظام: {item.stock ?? 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Stock Indicator */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 mb-0.5 text-[11px]">رصيد النظام</label>
                  <div className="w-full px-2 py-1 bg-[#f0f7fc] border border-slate-300 font-mono font-bold text-center text-sm text-[#234B67]">
                    {selectedItem ? (selectedItem.stock ?? 0) : '-'}
                  </div>
                </div>

                {/* Physical Count Input */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#234B67] mb-0.5 text-[11px]">الكمية الفعلية *</label>
                  <input
                    ref={physicalInputRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={physicalCountInput}
                    onChange={(e) => setPhysicalCountInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCountRecord();
                      }
                    }}
                    className="w-full px-2 py-1 bg-white border border-[#4A90C2] rounded-none font-mono font-bold text-center text-sm text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Live Difference Badge */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-500 mb-0.5 text-[11px]">الفرق التقديري</label>
                  <div className={`w-full px-2 py-1 border font-mono font-bold text-center text-sm ${
                    currentDiff === null
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : currentDiff === 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : currentDiff > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}>
                    {currentDiff !== null ? (currentDiff > 0 ? `+${currentDiff} (فائض)` : currentDiff < 0 ? `${currentDiff} (عجز)` : '0 (مطابق)') : '-'}
                  </div>
                </div>
              </div>

              {/* Selected Item Details Bar */}
              {selectedItem && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200 flex-wrap">
                  <span className="font-bold text-[#234B67]">الصنف:</span>
                  <span className="font-bold text-[#4A90C2]">{selectedItem.name}</span>
                  <span className="font-mono text-slate-500">[{selectedItem.code}]</span>
                  <span className="text-slate-600">التكلفة التاريخية: <strong className="font-mono text-[#234B67]">{selectedItem.costPrice !== undefined ? `${selectedItem.costPrice} ج.م` : 'غير مسجلة'}</strong></span>
                  {selectedItem.serial && (
                    <span className="bg-amber-50 border border-amber-200 px-1 text-[11px] font-mono text-amber-800">
                      سيريال: {selectedItem.serial}
                    </span>
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="ملاحظات الجرد لهذا الصنف..."
                      value={countNotes}
                      onChange={(e) => setCountNotes(e.target.value)}
                      className="w-full px-2 py-0.5 bg-white border border-[#B8D3E3] text-xs focus:outline-none focus:border-[#4A90C2]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCountRecord}
                    className="px-3 py-1 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold text-xs border border-[#3A759F] rounded-none cursor-pointer"
                  >
                    إدراج في مسيرة الجرد ↵
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SUMMARY DASHBOARD BANNER */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 shrink-0">
            <div className="bg-white border border-slate-200 p-2 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold block">الأصناف المحصورة</span>
              <span className="text-base font-bold font-mono text-[#234B67]">
                {totalCountedItems} <span className="text-[10px] text-slate-400">صنف</span>
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-2 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold block">إجمالي رصيد النظام / الفعلي</span>
              <span className="text-sm font-bold font-mono text-slate-800">
                {totalSystemQty} <span className="text-[10px] text-slate-400">/</span> {totalPhysicalQty}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-2 shadow-2xs">
              <span className="text-[10px] text-blue-700 font-bold block">أصناف الفائض (+ الزيادة)</span>
              <span className="text-sm font-bold font-mono text-blue-700">
                +{totalSurplusQty} <span className="text-[10px]">({totalSurplusValue.toFixed(2)} ج.م)</span>
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-2 shadow-2xs">
              <span className="text-[10px] text-rose-700 font-bold block">أصناف العجز (- النقص)</span>
              <span className="text-sm font-bold font-mono text-rose-700">
                -{totalShortageQty} <span className="text-[10px]">({totalShortageValue.toFixed(2)} ج.م)</span>
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-2 shadow-2xs">
              <span className="text-[10px] text-[#234B67] font-bold block">صافي القيمة المالية للفروقات</span>
              <span className={`text-base font-bold font-mono ${netFinancialDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netFinancialDiff >= 0 ? `+${netFinancialDiff.toFixed(2)}` : `${netFinancialDiff.toFixed(2)}`} <span className="text-[10px]">ج.م</span>
              </span>
            </div>
          </div>

          {/* COUNTED ITEMS LIST TABLE */}
          <div className="bg-white border border-slate-200 overflow-hidden flex flex-col flex-1 shadow-2xs">
            <div className="bg-[#f0f7fc] px-2.5 py-1.5 border-b border-slate-200 font-bold text-[#234B67] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>مسيرة الجرد التفصيلية ({countedList.length} صنف)</span>
                <span className="text-[11px] text-slate-500">
                  * الأرصدة والمحاسبة لم تتغير — الجرد قيد الحصر والتدقيق
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-[11px] font-bold text-rose-700">
                  <input
                    type="checkbox"
                    checked={filterDifferenceOnly}
                    onChange={(e) => setFilterDifferenceOnly(e.target.checked)}
                    className="rounded-none"
                  />
                  <span>عرض الفروقات فقط (عجز / فائض)</span>
                </label>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-[#E6F3FA] text-[#234B67] font-bold sticky top-0 border-b border-[#DCE8EF] z-10">
                  <tr>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-8 text-center">م</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-24">كود الصنف</th>
                    <th className="p-1.5 border-l border-[#DCE8EF]">اسم الصنف</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-24">التصنيف / السيريال</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-20 text-center">رصيد النظام</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-20 text-center">العد الفعلي</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">فرق الكمية</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">سعر التكلفة</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">القيمة المالية للفرق</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-20 text-center">الحالة</th>
                    <th className="p-1.5 border-l border-[#DCE8EF]">ملاحظات</th>
                    <th className="p-1.5 w-10 text-center">إلغاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE8EF]">
                  {displayedList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 font-bold">
                        {countedList.length === 0
                          ? 'لم يتم جرد أي أصناف بعد. ابدأ بمسح الباركود أو اختيار الصنف أعلاه.'
                          : 'لا توجد أصناف بها فروقات تطابق خيار التصفية.'}
                      </td>
                    </tr>
                  ) : (
                    displayedList.map((rec, idx) => (
                      <tr
                        key={rec.item.code}
                        className={`hover:bg-[#F8FBFD] ${
                          rec.diff < 0 ? 'bg-rose-50/50' : rec.diff > 0 ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono text-slate-500 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] font-mono font-bold text-[#234B67]">
                          {rec.item.code}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] font-bold text-slate-800">
                          {rec.item.name}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-slate-500 text-[11px]">
                          <span>{rec.item.category}</span>
                          {rec.item.serial && (
                            <span className="block font-mono text-[10px] text-amber-800">
                              SN: {rec.item.serial}
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-slate-600">
                          {rec.systemStock}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-[#234B67]">
                          {rec.physicalStock}
                        </td>
                        <td className={`p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold ${
                          rec.diff === 0
                            ? 'text-emerald-700'
                            : rec.diff > 0
                              ? 'text-blue-700'
                              : 'text-rose-700'
                        }`}>
                          {rec.diff > 0 ? `+${rec.diff}` : `${rec.diff}`}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono text-slate-500">
                          {rec.hasMissingCost ? 'غير محدد' : `${rec.unitCost.toFixed(2)} ج.م`}
                        </td>
                        <td className={`p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold ${
                          rec.financialDiff > 0 ? 'text-emerald-700' : rec.financialDiff < 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}>
                          {rec.hasMissingCost ? '-' : `${rec.financialDiff >= 0 ? `+${rec.financialDiff.toFixed(2)}` : rec.financialDiff.toFixed(2)} ج.م`}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-center font-bold">
                          {rec.diff === 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 border border-emerald-200 text-[10px]">
                              مطابق
                            </span>
                          ) : rec.diff > 0 ? (
                            <span className="text-blue-700 bg-blue-50 px-1 py-0.5 border border-blue-200 text-[10px]">
                              فائض
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 px-1 py-0.5 border border-rose-200 text-[10px]">
                              عجز
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 border-l border-[#DCE8EF] text-slate-500 text-[11px]">
                          {rec.notes || '-'}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRecord(rec.item.code)}
                            className="p-1 text-rose-600 hover:bg-rose-50"
                            title="حذف من مسيرة الجرد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONFIRMATION & REVIEW PANEL */}
          {confirmAdjustment && (
            <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#234B67]">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>إقرار واعتماد تسوية الجرد الفعلي للمخزون (Audit Authorization)</span>
              </div>
              <p className="leading-relaxed">
                أنت على وشك اعتماد وتطبيق تسوية المخزون لعدد <strong>({countedList.length})</strong> صنف.
                سيتم تحديث الأرصدة الفعلية في النظام وتسجيل حركة تسوية رسمية مسندة بالسجل الرقابي والفرع.
                لا ينتج عن هذه الحركة إيرادات بيع أو شراء وهمية.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setConfirmAdjustment(false)}
                  className="px-3 py-1 bg-white border border-slate-300 font-bold text-slate-700 cursor-pointer"
                >
                  تراجع ومراجعة
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCommit}
                  className="px-4 py-1 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold border border-[#3A759F] rounded-none cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  اعتماد وتطبيق التسوية المخزنية الآن
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CONTROLS */}
        <div className="bg-[#f0f7fc] px-3 py-2 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              نظام الجرد المتكامل — الدقة والشفافية الرقابية.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-none cursor-pointer"
            >
              إلغاء وإغلاق
            </button>
            <button
              type="button"
              disabled={countedList.length === 0}
              onClick={() => setConfirmAdjustment(true)}
              className={`px-4 py-1 font-bold border rounded-none flex items-center gap-1 cursor-pointer ${
                countedList.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#4A90C2] hover:bg-[#3A759F] text-white border-[#3A759F]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              مراجعة واعتماد التسوية المخزنية ({countedList.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
