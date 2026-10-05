import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, Customer, SavedInvoice } from '../../types/pos';
import { Search, Package, Users, FileText, X, ArrowRight, ExternalLink, CornerDownLeft, Filter } from 'lucide-react';

export interface UniversalSmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryDb: InventoryItem[];
  customersList: Customer[];
  completedInvoices: SavedInvoice[];
  onSelectProduct?: (product: InventoryItem) => void;
  onSelectCustomer?: (customer: Customer) => void;
  onSelectInvoice?: (invoice: SavedInvoice) => void;
}

type SearchCategoryFilter = 'all' | 'products' | 'customers' | 'invoices';

export default function UniversalSmartSearchModal({
  isOpen,
  onClose,
  inventoryDb,
  customersList,
  completedInvoices,
  onSelectProduct,
  onSelectCustomer,
  onSelectInvoice
}: UniversalSmartSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategoryFilter>('all');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setActiveCategory('all');
      setSelectedResultIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  // Read-only search query execution
  const results = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      return {
        products: [],
        customers: [],
        invoices: [],
        total: 0
      };
    }

    // 1. Search Products: Name, Code, Category, Serial / IMEI
    const matchedProducts = inventoryDb.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(trimmed);
      const codeMatch = p.code.toLowerCase().includes(trimmed);
      const catMatch = p.category.toLowerCase().includes(trimmed);
      const serialMatch = p.serial && p.serial.toLowerCase().includes(trimmed);
      return nameMatch || codeMatch || catMatch || serialMatch;
    }).slice(0, 20);

    // 2. Search Customers: Name, Phone, ID/Code
    const matchedCustomers = customersList.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(trimmed);
      const phoneMatch = c.phone && c.phone.includes(trimmed);
      const idMatch = c.id.toLowerCase().includes(trimmed);
      return nameMatch || phoneMatch || idMatch;
    }).slice(0, 15);

    // 3. Search Invoices: ID / Number, Customer Name, Customer Phone, Date, Type
    const matchedInvoices = completedInvoices.filter(inv => {
      const idMatch = inv.id.toLowerCase().includes(trimmed);
      const nameMatch = inv.customerName.toLowerCase().includes(trimmed);
      const phoneMatch = inv.customerPhone && inv.customerPhone.includes(trimmed);
      const dateMatch = inv.date.includes(trimmed);
      const typeMatch = inv.type.toLowerCase().includes(trimmed);
      return idMatch || nameMatch || phoneMatch || dateMatch || typeMatch;
    }).slice(0, 20);

    const total =
      (activeCategory === 'all' || activeCategory === 'products' ? matchedProducts.length : 0) +
      (activeCategory === 'all' || activeCategory === 'customers' ? matchedCustomers.length : 0) +
      (activeCategory === 'all' || activeCategory === 'invoices' ? matchedInvoices.length : 0);

    return {
      products: matchedProducts,
      customers: matchedCustomers,
      invoices: matchedInvoices,
      total
    };
  }, [searchTerm, inventoryDb, customersList, completedInvoices, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center z-50 p-2 sm:p-6 pt-12 dir-rtl text-xs select-none">
      <div className="bg-white border border-[#B8D3E3] shadow-2xl rounded-none w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* TOP SEARCH HEADER */}
        <div className="bg-[#E6F3FA] text-[#234B67] px-3 py-2.5 flex items-center justify-between border-b border-[#DCE8EF] shrink-0 font-bold">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#4A90C2]" />
            <h3 className="font-bold text-sm text-[#234B67]">
              البحث الذكي الشامل (Universal Smart Search)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 font-bold"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SEARCH INPUT BAR */}
        <div className="p-3 bg-[#f0f7fc] border-b border-slate-200 space-y-2 shrink-0">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث عن: اسم أو كود أو باركود صنف، سيريال/IMEI، اسم أو هاتف عميل، رقم أو تاريخ فاتورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                }
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#B8D3E3] rounded-none focus:outline-none focus:border-[#4A90C2] text-slate-800 font-bold text-sm shadow-2xs"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* FILTER TABS */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 font-bold border rounded-none flex items-center gap-1 cursor-pointer transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-[#4A90C2] text-white border-[#3A759F]'
                    : 'bg-white hover:bg-blue-50 text-[#234B67] border-slate-300'
                }`}
              >
                <span>الكل</span>
                <span className="font-mono text-[10px] opacity-80">({results.total})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('products')}
                className={`px-3 py-1 font-bold border rounded-none flex items-center gap-1 cursor-pointer transition-colors ${
                  activeCategory === 'products'
                    ? 'bg-[#4A90C2] text-white border-[#3A759F]'
                    : 'bg-white hover:bg-blue-50 text-[#234B67] border-slate-300'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>الأصناف ({results.products.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('customers')}
                className={`px-3 py-1 font-bold border rounded-none flex items-center gap-1 cursor-pointer transition-colors ${
                  activeCategory === 'customers'
                    ? 'bg-[#4A90C2] text-white border-[#3A759F]'
                    : 'bg-white hover:bg-blue-50 text-[#234B67] border-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>العملاء ({results.customers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('invoices')}
                className={`px-3 py-1 font-bold border rounded-none flex items-center gap-1 cursor-pointer transition-colors ${
                  activeCategory === 'invoices'
                    ? 'bg-[#4A90C2] text-white border-[#3A759F]'
                    : 'bg-white hover:bg-blue-50 text-[#234B67] border-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>الفواتير ({results.invoices.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              * البحث مباشر وسريع وقراءة فقط (Read-Only)
            </span>
          </div>
        </div>

        {/* RESULTS BODY */}
        <div className="flex-1 p-3 overflow-y-auto space-y-4 bg-[#f4f7fb]">
          {!searchTerm.trim() ? (
            <div className="p-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-[#234B67]">اكتب كلمة البحث للبدء في الاستعلام الموحد</p>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك البحث بالأرقام، الأسماء، الهواتف، الأكواد، أو السيريال نمبر
              </p>
            </div>
          ) : results.total === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-bold text-sm text-rose-600">لا توجد نتائج مطابقة لكلمة البحث "{searchTerm}"</p>
              <p className="text-xs text-slate-500 mt-1">تأكد من صحة الكلمة أو جرب جزءاً منها</p>
            </div>
          ) : (
            <>
              {/* GROUP 1: PRODUCTS */}
              {(activeCategory === 'all' || activeCategory === 'products') && results.products.length > 0 && (
                <div className="bg-white border border-slate-200">
                  <div className="bg-[#E6F3FA] px-3 py-1.5 border-b border-[#DCE8EF] flex items-center justify-between font-bold text-[#234B67]">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#4A90C2]" />
                      <span>الأصناف والمنتجات ({results.products.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">انقر لاختيار الصنف في الفاتورة أو المخزن</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {results.products.map((p) => (
                      <div
                        key={p.code}
                        onClick={() => {
                          onSelectProduct?.(p);
                          onClose();
                        }}
                        className="p-2 hover:bg-[#F8FBFD] cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                              {p.category}
                            </span>
                            {p.serial && (
                              <span className="bg-amber-50 border border-amber-200 px-1 text-[10px] font-mono text-amber-800">
                                SN: {p.serial}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 font-mono">
                            كود: <strong className="text-[#234B67]">{p.code}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-left">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">سعر البيع</span>
                            <span className="font-bold font-mono text-sm text-[#4A90C2]">
                              {p.price.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">رصيد المخزن</span>
                            <span className="font-bold font-mono text-sm text-[#234B67]">
                              {p.stock ?? 0}
                            </span>
                          </div>
                          <CornerDownLeft className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP 2: CUSTOMERS */}
              {(activeCategory === 'all' || activeCategory === 'customers') && results.customers.length > 0 && (
                <div className="bg-white border border-slate-200">
                  <div className="bg-[#E6F3FA] px-3 py-1.5 border-b border-[#DCE8EF] flex items-center justify-between font-bold text-[#234B67]">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#4A90C2]" />
                      <span>العملاء والحسابات ({results.customers.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">انقر لاختيار العميل في الفاتورة أو الحسابات</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {results.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer?.(c);
                          onClose();
                        }}
                        className="p-2 hover:bg-[#F8FBFD] cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                            <span>هاتف: <strong className="font-mono text-[#234B67]">{c.phone || '-'}</strong></span>
                            <span className="text-slate-400">| كود: {c.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">الرصيد الحالي</span>
                            <span className={`font-bold font-mono text-sm ${c.balance > 0 ? 'text-rose-600' : c.balance < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {c.balance.toFixed(2)} ج.م
                            </span>
                          </div>
                          <CornerDownLeft className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GROUP 3: INVOICES */}
              {(activeCategory === 'all' || activeCategory === 'invoices') && results.invoices.length > 0 && (
                <div className="bg-white border border-slate-200">
                  <div className="bg-[#E6F3FA] px-3 py-1.5 border-b border-[#DCE8EF] flex items-center justify-between font-bold text-[#234B67]">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#4A90C2]" />
                      <span>الفواتير والسندات المحفوظة ({results.invoices.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">انقر لمعاينة وتفاصيل الفاتورة</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {results.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          onSelectInvoice?.(inv);
                          onClose();
                        }}
                        className="p-2 hover:bg-[#F8FBFD] cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#234B67] font-mono text-sm">#{inv.id}</span>
                            <span className="bg-[#4A90C2] text-white px-1.5 py-0.2 text-[10px] font-bold">
                              {inv.type}
                            </span>
                            <span className="font-bold text-slate-800">{inv.customerName}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                            <span>التاريخ: <strong className="font-mono">{inv.date} {inv.time}</strong></span>
                            <span>| الأصناف: {inv.items?.length || 0}</span>
                            {inv.customerPhone && <span>| الهاتف: {inv.customerPhone}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">الإجمالي</span>
                            <span className="font-bold font-mono text-sm text-emerald-600">
                              {inv.total.toFixed(2)} ج.م
                            </span>
                          </div>
                          <CornerDownLeft className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#f0f7fc] px-3 py-2 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            البحث الذكي الموحد — اضغط Esc للإغلاق أو انقر على أي نتيجة للانتقال إليها.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-none cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
