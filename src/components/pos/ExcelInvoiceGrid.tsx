import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InvoiceItem, InventoryItem, OpenInvoiceSession } from '../../types/pos';
import { Trash2, Copy, ArrowRightLeft } from 'lucide-react';

export interface ExcelInvoiceGridProps {
  items: InvoiceItem[];
  inventoryDb: InventoryItem[];
  activeTabGroup: string;
  canChangePrice?: boolean;
  maxReturnableQtyMap?: Record<string, number>;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddItemDirect?: (item: Partial<InvoiceItem>) => void;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onToggleSelectAll?: (selected: boolean) => void;
  onDeleteSelected?: () => void;
  onCopySelected?: () => void;
  onMoveSelected?: (targetInvoiceId?: string) => void;
  openInvoices?: OpenInvoiceSession[];
  activeOpenInvoiceId?: string;
}

type EditableColumn = 'name' | 'quantity' | 'price' | 'value' | 'notes';

interface ActiveCell {
  rowIndex: number;
  column: EditableColumn;
}

export const ExcelInvoiceGrid: React.FC<ExcelInvoiceGridProps> = ({
  items,
  inventoryDb,
  activeTabGroup,
  canChangePrice = true,
  maxReturnableQtyMap,
  onUpdateItem,
  onRemoveItem,
  onAddItemDirect,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSelected,
  onCopySelected,
  onMoveSelected,
  openInvoices,
  activeOpenInvoiceId
}) => {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [autocompleteIndex, setAutocompleteIndex] = useState<number>(0);
  const [filteredProducts, setFilteredProducts] = useState<InventoryItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; itemName: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', (e) => {
      // If clicked outside table, close menu
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    });
    return () => {
      window.removeEventListener('click', handleCloseMenu);
    };
  }, []);

  // Keyboard Delete key support on selected / active row
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return; // Allow native delete in text fields
        }

        const selected = items.filter(i => Boolean(i.selected));
        if (selected.length > 0 && onDeleteSelected) {
          e.preventDefault();
          onDeleteSelected();
        } else if (activeCell && items[activeCell.rowIndex]) {
          e.preventDefault();
          onRemoveItem(items[activeCell.rowIndex].id);
          setActiveCell(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [items, activeCell, onDeleteSelected, onRemoveItem]);

  const selectedItems = items.filter(i => Boolean(i.selected));
  const selectedCount = selectedItems.length;
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const columns: EditableColumn[] = ['name', 'quantity', 'price', 'value', 'notes'];

  // Start editing a specific cell
  const startEditing = useCallback((rowIndex: number, column: EditableColumn, initialVal?: string) => {
    const item = items[rowIndex];
    if (!item) return;

    if ((column === 'price' || column === 'value') && !canChangePrice) return;

    setActiveCell({ rowIndex, column });
    let val = initialVal !== undefined ? initialVal : '';
    if (initialVal === undefined) {
      if (column === 'name') val = item.name;
      else if (column === 'quantity') val = item.quantity.toString();
      else if (column === 'price') val = item.price.toString();
      else if (column === 'value') val = (item.total ?? (item.quantity * item.price)).toString();
      else if (column === 'notes') val = item.notes || '';
    }
    setEditingText(val);

    if (column === 'name' && val.trim().length > 0) {
      const matched = inventoryDb.filter(
        p => p.name.includes(val) || p.code.includes(val) || p.category.includes(val) || (p.serial && p.serial.includes(val))
      );
      setFilteredProducts(matched.slice(0, 8));
      setAutocompleteIndex(0);
    } else {
      setFilteredProducts([]);
    }
  }, [items, canChangePrice, inventoryDb]);

  // Focus input on activeCell change
  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  // Commit changes from editing
  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    const { rowIndex, column } = activeCell;
    const item = items[rowIndex];
    if (!item) {
      setActiveCell(null);
      return;
    }

    if (column === 'quantity') {
      const parsed = parseFloat(editingText);
      let newQty = isNaN(parsed) || parsed <= 0 ? 1 : parsed;
      const itemKey = item.code || item.name;
      const maxAllowed = maxReturnableQtyMap?.[itemKey];
      if (maxAllowed !== undefined && newQty > maxAllowed) {
        alert(`تنبيه: أقصى كمية قابلة للإرجاع للصنف "${item.name}" هي ${maxAllowed}`);
        newQty = maxAllowed;
      }
      onUpdateItem(item.id, {
        quantity: newQty,
        total: Math.round(newQty * item.price * 100) / 100
      });
    } else if (column === 'price') {
      if (canChangePrice) {
        const parsed = parseFloat(editingText);
        const newPrice = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        onUpdateItem(item.id, {
          price: newPrice,
          total: Math.round(item.quantity * newPrice * 100) / 100
        });
      }
    } else if (column === 'value') {
      if (canChangePrice) {
        const parsed = parseFloat(editingText);
        const newValue = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        const qty = item.quantity > 0 ? item.quantity : 1;
        const newPrice = Math.round((newValue / qty) * 1000) / 1000;
        onUpdateItem(item.id, {
          price: newPrice,
          total: newValue
        });
      }
    } else if (column === 'notes') {
      onUpdateItem(item.id, {
        notes: editingText.trim()
      });
    } else if (column === 'name') {
      const trimmed = editingText.trim();
      if (trimmed.length > 0) {
        const matched = inventoryDb.find(
          p => p.name.toLowerCase() === trimmed.toLowerCase() || p.code === trimmed || (p.serial && p.serial === trimmed)
        ) || inventoryDb.find(
          p => p.name.toLowerCase().includes(trimmed.toLowerCase()) || (p.serial && p.serial.includes(trimmed))
        );
        if (matched) {
          onUpdateItem(item.id, {
            name: matched.name,
            code: matched.code,
            category: matched.category,
            price: matched.price,
            costPrice: matched.costPrice,
            serialNumber: matched.serial || item.serialNumber,
            total: Math.round(item.quantity * matched.price * 100) / 100
          });
        }
      }
    }

    setFilteredProducts([]);
  }, [activeCell, editingText, items, canChangePrice, maxReturnableQtyMap, inventoryDb, onUpdateItem]);

  // Navigate to another cell
  const navigateCell = useCallback((dRow: number, dCol: number) => {
    commitEdit();
    if (!activeCell) {
      if (items.length > 0) {
        startEditing(0, 'name');
      }
      return;
    }

    const { rowIndex, column } = activeCell;
    const colIdx = columns.indexOf(column);
    let nextColIdx = colIdx + dCol;
    let nextRowIdx = rowIndex + dRow;

    if (nextColIdx >= columns.length) {
      nextColIdx = 0;
      nextRowIdx += 1;
    } else if (nextColIdx < 0) {
      nextColIdx = columns.length - 1;
      nextRowIdx -= 1;
    }

    if (nextRowIdx >= 0 && nextRowIdx < items.length) {
      startEditing(nextRowIdx, columns[nextColIdx]);
    } else if (nextRowIdx >= items.length && dRow > 0 && onAddItemDirect) {
      // Create empty row at bottom if moving down past last row
      setActiveCell(null);
    } else {
      setActiveCell(null);
    }
  }, [activeCell, items, columns, commitEdit, startEditing, onAddItemDirect]);

  // Keyboard navigation handler inside the grid cell
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex(prev => (prev + 1) % filteredProducts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredProducts[autocompleteIndex];
        if (selected && activeCell) {
          const item = items[activeCell.rowIndex];
          if (item) {
            onUpdateItem(item.id, {
              name: selected.name,
              code: selected.code,
              category: selected.category,
              price: selected.price,
              costPrice: selected.costPrice,
              serialNumber: selected.serial || item.serialNumber,
              total: item.quantity * selected.price
            });
          }
          setFilteredProducts([]);
          navigateCell(0, 1); // Move to quantity
          return;
        }
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        navigateCell(0, -1);
      } else {
        navigateCell(0, 1);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      navigateCell(1, 0); // Move down
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveCell(null);
      setFilteredProducts([]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      commitEdit();
      navigateCell(-1, 0);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      commitEdit();
      navigateCell(1, 0);
      return;
    }
  };

  // Autocomplete change for name
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditingText(val);
    if (activeCell?.column === 'name' && val.trim().length > 0) {
      const matched = inventoryDb.filter(
        p => p.name.includes(val) || p.code.includes(val) || p.category.includes(val) || (p.serial && p.serial.includes(val))
      );
      setFilteredProducts(matched.slice(0, 8));
      setAutocompleteIndex(0);
    } else {
      setFilteredProducts([]);
    }
  };

  // Safe Copy-Paste support
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    // Check if multi-line tabular paste (TSV / Excel style)
    const lines = pasteData.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
    if (lines.length > 1 && onAddItemDirect) {
      e.preventDefault();
      lines.forEach(line => {
        const parts = line.split('\t');
        const namePart = parts[0]?.trim();
        const qtyPart = parseFloat(parts[1]?.trim() || '1') || 1;
        const pricePart = parseFloat(parts[2]?.trim() || '0') || 0;
        const notesPart = parts[3]?.trim() || '';

        if (namePart) {
          const matched = inventoryDb.find(
            p => p.name.toLowerCase() === namePart.toLowerCase() || p.code === namePart || (p.serial && p.serial === namePart)
          ) || inventoryDb.find(
            p => p.name.toLowerCase().includes(namePart.toLowerCase()) || (p.serial && p.serial.includes(namePart))
          );
          if (matched) {
            const finalPrice = (canChangePrice && pricePart > 0) ? pricePart : matched.price;
            onAddItemDirect({
              name: matched.name,
              code: matched.code,
              category: matched.category,
              quantity: qtyPart,
              price: finalPrice,
              costPrice: matched.costPrice || 0,
              serialNumber: matched.serial || '',
              total: qtyPart * finalPrice,
              notes: notesPart
            });
          }
        }
      });
      setActiveCell(null);
    }
  };

  return (
    <div
      ref={containerRef}
      onPaste={handlePaste}
      className="flex-1 bg-white border-b border-slate-300 overflow-auto relative select-none flex flex-col"
    >
      {/* MULTI-ITEM SELECTION ACTION BAR */}
      {selectedCount > 0 && (
        <div className="bg-[#f0f7fc] border-b border-[#bae6fd] px-2.5 py-1 flex items-center justify-between text-xs font-bold text-[#1e3a5f] shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#1e3a5f] text-white px-2 py-0.5 text-[11px] font-mono">
              تم تحديد: {selectedCount} من {items.length} صنف
            </span>
            <button
              type="button"
              onClick={() => onToggleSelectAll?.(false)}
              className="text-slate-500 hover:text-slate-800 hover:underline text-[11px] cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy / Duplicate Selected Items */}
            {onCopySelected && (
              <button
                type="button"
                onClick={onCopySelected}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-slate-700 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                title="تكرار ونسخ الأصناف المحددة بالفاتورة"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>نسخ المحدد ({selectedCount})</span>
              </button>
            )}

            {/* Move Selected Items */}
            {onMoveSelected && (
              <div className="flex items-center gap-1">
                {openInvoices && openInvoices.length > 1 ? (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onMoveSelected(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold focus:outline-none"
                  >
                    <option value="" disabled>نقل المحدد إلى فاتورة...</option>
                    {openInvoices
                      .filter(inv => inv.id !== activeOpenInvoiceId)
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          نقل إلى: {inv.sessionName || inv.customerName || 'فاتورة ' + inv.id}
                        </option>
                      ))}
                    <option value="NEW_INVOICE">+ نقل إلى فاتورة مفتوحة جديدة</option>
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMoveSelected?.('NEW_INVOICE')}
                    className="px-2 py-0.5 bg-white hover:bg-blue-50 border border-slate-300 text-slate-700 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                    title="نقل الأصناف المحددة إلى فاتورة مفتوحة جديدة"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>نقل إلى فاتورة جديدة</span>
                  </button>
                )}
              </div>
            )}

            {/* Delete Selected Items */}
            {onDeleteSelected && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                title="حذف جميع الأصناف المحددة من الفاتورة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المحدد ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <table className="w-full text-right text-xs border-collapse">
        <thead className="bg-[#E6F3FA] text-[#234B67] font-bold sticky top-0 border-b border-[#DCE8EF] z-10 select-none">
          <tr>
            <th className="p-1 border-l border-[#DCE8EF] w-8 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                title="تحديد / إلغاء تحديد الكل"
                className="cursor-pointer"
              />
            </th>
            <th className="p-1.5 border-l border-[#DCE8EF] w-10 text-center">م</th>
            <th className="p-1.5 border-l border-[#DCE8EF]">الصنـف ({activeTabGroup})</th>
            <th className="p-1.5 border-l border-[#DCE8EF] w-20 text-center">الكمية</th>
            <th className="p-1.5 border-l border-[#DCE8EF] w-24 text-center">السعر</th>
            <th className="p-1.5 border-l border-[#DCE8EF] w-28 text-center">القيمة</th>
            <th className="p-1.5">ملاحظات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DCE8EF] text-[11px]">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-[#607482] font-semibold">
                الفاتورة فارغة حالياً. أدخل صنفاً من شريط الإدخال أو انقر لبدء الإدخال السريع.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const isRowActive = activeCell?.rowIndex === idx;
              const isSelected = Boolean(item.selected);

              // Find master item from DB to calculate price status and cost comparison
              const invItem = inventoryDb.find(
                p => (item.code && p.code === item.code) || p.name === item.name
              );
              const cost = item.costPrice !== undefined ? item.costPrice : invItem?.costPrice;
              const defaultPrice = invItem?.price;

              const isBelowCost = cost !== undefined && cost > 0 && item.price < cost;
              const isAtCost = cost !== undefined && cost > 0 && item.price === cost;
              const isManualPriceModified = defaultPrice !== undefined && Math.abs(item.price - defaultPrice) > 0.001;

              // Row background styling:
              let rowBgClass = idx % 2 === 1 ? 'bg-[#F8FBFD] hover:bg-[#E6F3FA]/70' : 'bg-[#FFFFFF] hover:bg-[#E6F3FA]/70';
              let rowBorderClass = '';

              if (isSelected) {
                rowBgClass = 'bg-[#DCEFFA] hover:bg-[#DCEFFA]';
              } else if (isBelowCost) {
                rowBgClass = 'bg-rose-50 hover:bg-rose-100/60';
                rowBorderClass = 'border-r-4 border-r-rose-500';
              } else if (isAtCost) {
                rowBgClass = 'bg-emerald-50/60 hover:bg-emerald-100/60';
                rowBorderClass = 'border-r-4 border-r-emerald-500';
              } else if (isManualPriceModified) {
                rowBgClass = 'bg-blue-50/50 hover:bg-blue-100/50';
                rowBorderClass = 'border-r-4 border-r-blue-500';
              } else if (isRowActive) {
                rowBgClass = 'bg-[#F0F7FC] hover:bg-[#E6F3FA]';
              }

              return (
                <tr
                  key={item.id}
                  onClick={() => {
                    if (!activeCell || activeCell.rowIndex !== idx) {
                      setActiveCell({ rowIndex: idx, column: 'quantity' });
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      itemId: item.id,
                      itemName: item.name
                    });
                  }}
                  className={`font-medium transition-colors cursor-pointer text-[#263746] ${rowBgClass} ${rowBorderClass}`}
                >
                  {/* Selection Checkbox */}
                  <td className="p-1 border-l border-[#DCE8EF] text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onToggleSelect?.(item.id, e.target.checked)}
                      className="cursor-pointer"
                    />
                  </td>

                  {/* Row Number */}
                  <td className="p-1.5 border-l border-[#DCE8EF] text-center font-mono text-[#607482] font-bold">
                    {idx + 1}
                  </td>

                  {/* Item Name (Editable Excel Cell) */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(idx, 'name');
                    }}
                    className={`p-1.5 border-l border-[#DCE8EF] font-bold text-[#234B67] cursor-pointer relative ${
                      isRowActive && activeCell?.column === 'name' ? 'bg-[#C9E3F0] ring-1 ring-[#4A90C2]' : ''
                    }`}
                  >
                    {isRowActive && activeCell?.column === 'name' ? (
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingText}
                          onChange={handleNameInputChange}
                          onKeyDown={handleKeyDown}
                          onBlur={commitEdit}
                          className="w-full px-1 py-0.5 bg-white border border-[#4A90C2] text-xs font-bold text-[#263746] focus:outline-none"
                        />
                        {/* Autocomplete Dropdown */}
                        {filteredProducts.length > 0 && (
                          <div className="absolute top-full right-0 left-0 mt-0.5 bg-white border border-[#B8D3E3] shadow-md z-50 max-h-44 overflow-y-auto">
                            {filteredProducts.map((p, pIdx) => (
                              <div
                                key={p.code}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // prevent input blur before select
                                  onUpdateItem(item.id, {
                                    name: p.name,
                                    code: p.code,
                                    category: p.category,
                                    price: p.price,
                                    costPrice: p.costPrice,
                                    serialNumber: p.serial || item.serialNumber,
                                    total: item.quantity * p.price
                                  });
                                  setFilteredProducts([]);
                                  navigateCell(0, 1);
                                }}
                                className={`p-1.5 cursor-pointer flex justify-between items-center text-xs font-bold ${
                                  autocompleteIndex === pIdx ? 'bg-[#DCEFFA] text-[#234B67]' : 'hover:bg-[#F8FBFD]'
                                }`}
                              >
                                <span>{p.name} {p.category ? `(${p.category})` : ''}</span>
                                <span className="font-mono text-xs font-bold text-[#234B67]">[ {p.stock ?? 0} ]</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span>{item.name}</span>
                        {maxReturnableQtyMap && maxReturnableQtyMap[item.code || item.name] !== undefined && (
                          <span className="inline-block mr-1 text-[10px] text-[#234B67] bg-[#E6F3FA] px-1 font-mono font-bold border border-[#B8D3E3]">
                            (أقصى مرتجع: {maxReturnableQtyMap[item.code || item.name]})
                          </span>
                        )}
                        {item.serialNumber && (
                          <span className="block text-[10px] text-[#607482] font-mono font-normal">
                            SN: {item.serialNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Quantity (Editable Excel Cell) */}
                  <td
                    onClick={() => startEditing(idx, 'quantity')}
                    className={`p-1.5 border-l border-[#DCE8EF] text-center font-mono cursor-pointer ${
                      isRowActive && activeCell?.column === 'quantity' ? 'bg-[#C9E3F0] ring-1 ring-[#4A90C2]' : ''
                    }`}
                  >
                    {isRowActive && activeCell?.column === 'quantity' ? (
                      <input
                        ref={inputRef}
                        type="number"
                        min="1"
                        step="any"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        className="w-14 px-1 py-0.5 bg-white border border-[#4A90C2] text-center font-mono font-bold text-[#263746] text-xs focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newQty = Math.max(1, item.quantity - 1);
                            onUpdateItem(item.id, { quantity: newQty, total: newQty * item.price });
                          }}
                          className="w-4 h-4 bg-white hover:bg-[#E6F3FA] border border-[#B8D3E3] text-[#263746] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-[#263746] px-1 font-mono">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const itemKey = item.code || item.name;
                            const maxAllowed = maxReturnableQtyMap?.[itemKey];
                            if (maxAllowed !== undefined && item.quantity + 1 > maxAllowed) {
                              alert(`تنبيه: أقصى كمية قابلة للإرجاع للصنف "${item.name}" هي ${maxAllowed}`);
                              return;
                            }
                            const newQty = item.quantity + 1;
                            onUpdateItem(item.id, { quantity: newQty, total: newQty * item.price });
                          }}
                          className="w-4 h-4 bg-white hover:bg-[#E6F3FA] border border-[#B8D3E3] text-[#263746] font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Price (Editable Excel Cell) */}
                  <td
                    onClick={() => canChangePrice && startEditing(idx, 'price')}
                    className={`p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold ${
                      isBelowCost
                        ? 'text-rose-600'
                        : isAtCost
                        ? 'text-emerald-700'
                        : isManualPriceModified
                        ? 'text-blue-700'
                        : 'text-[#263746]'
                    } ${
                      canChangePrice ? 'cursor-pointer' : 'cursor-default'
                    } ${isRowActive && activeCell?.column === 'price' ? 'bg-[#C9E3F0] ring-1 ring-[#4A90C2]' : ''}`}
                    title={
                      isBelowCost
                        ? `تحذير: سعر البيع أقل من التكلفة (${cost} ج.م)`
                        : isAtCost
                        ? `تنبيه: سعر البيع مساوٍ لسعر التكلفة بالضبط (${cost} ج.م) - هامش ربح صفري`
                        : isManualPriceModified
                        ? `تم تعديل السعر يدوياً (السعر الأصلي: ${defaultPrice} ج.م)`
                        : undefined
                    }
                  >
                    {isRowActive && activeCell?.column === 'price' && canChangePrice ? (
                      <input
                        ref={inputRef}
                        type="number"
                        min="0"
                        step="any"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        className="w-16 px-1 py-0.5 bg-white border border-[#4A90C2] text-center font-mono font-bold text-[#263746] text-xs focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span>{(item.price ?? 0).toFixed(2)}</span>
                        {isBelowCost && (
                          <span className="text-[9px] text-rose-600 font-bold" title={`أقل من التكلفة (${cost} ج.م)`}>⚠</span>
                        )}
                        {isAtCost && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 font-sans font-bold" title="هامش صفري">تكلفة</span>
                        )}
                        {isManualPriceModified && !isBelowCost && !isAtCost && (
                          <span className="text-[8px] bg-blue-100 text-blue-800 px-1 font-sans font-bold" title="سعر معدل يدوياً">معدل</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Total Value (Editable Excel Cell with smart price calculation) */}
                  <td
                    onClick={() => canChangePrice && startEditing(idx, 'value')}
                    className={`p-1.5 border-l border-[#DCE8EF] text-center font-mono font-bold text-emerald-700 ${
                      canChangePrice ? 'cursor-pointer' : 'cursor-default'
                    } ${isRowActive && activeCell?.column === 'value' ? 'bg-[#C9E3F0] ring-1 ring-[#4A90C2]' : 'bg-[#F8FBFD]'}`}
                  >
                    {isRowActive && activeCell?.column === 'value' && canChangePrice ? (
                      <input
                        ref={inputRef}
                        type="number"
                        min="0"
                        step="any"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        className="w-16 px-1 py-0.5 bg-white border border-[#4A90C2] text-center font-mono font-bold text-emerald-700 text-xs focus:outline-none"
                      />
                    ) : (
                      <span>{(item.total ?? 0).toFixed(2)}</span>
                    )}
                  </td>

                  {/* Notes (Editable Excel Cell) */}
                  <td
                    onClick={() => startEditing(idx, 'notes')}
                    className={`p-1.5 border-l border-[#DCE8EF] text-[#607482] cursor-pointer ${
                      isRowActive && activeCell?.column === 'notes' ? 'bg-[#C9E3F0] ring-1 ring-[#4A90C2]' : ''
                    }`}
                  >
                    {isRowActive && activeCell?.column === 'notes' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="ملاحظات..."
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commitEdit}
                        className="w-full px-1 py-0.5 bg-white border border-[#4A90C2] text-xs text-[#263746] focus:outline-none"
                      />
                    ) : (
                      <span>{item.notes || '-'}</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* RIGHT-CLICK CONTEXT MENU FOR SAFE ITEM DELETION */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-[#B8D3E3] shadow-md py-1 text-xs font-bold text-[#263746] min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] text-[#607482] border-b border-[#DCE8EF] truncate max-w-[200px]">
            {contextMenu.itemName}
          </div>
          <button
            type="button"
            onClick={() => {
              onRemoveItem(contextMenu.itemId);
              setContextMenu(null);
            }}
            className="w-full text-right px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف الصنف (Delete)</span>
          </button>
        </div>
      )}
    </div>
  );
};
