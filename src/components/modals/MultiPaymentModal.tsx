import React, { useState, useEffect } from 'react';
import { InvoicePayment, PaymentMethod, Treasury, Bank } from '../../types/pos';
import { CreditCard, Plus, Trash2, Check, X, DollarSign, Wallet, Building2, AlertCircle } from 'lucide-react';

interface MultiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  currentPayments: InvoicePayment[];
  treasuries: Treasury[];
  banks: Bank[];
  selectedDrawer: string;
  onSavePayments: (payments: InvoicePayment[]) => void;
  invoiceType?: string;
  partyName?: string;
}

export default function MultiPaymentModal({
  isOpen,
  onClose,
  grandTotal,
  currentPayments,
  treasuries,
  banks,
  selectedDrawer,
  onSavePayments,
  invoiceType = 'بيع',
  partyName = ''
}: MultiPaymentModalProps) {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);

  // Initialize or re-sync with props
  useEffect(() => {
    if (isOpen) {
      if (currentPayments && currentPayments.length > 0) {
        setPayments([...currentPayments]);
      } else {
        // Default initial single cash payment
        const defaultCash: InvoicePayment = {
          id: `PAY-${Date.now()}-1`,
          method: 'نقد',
          amount: grandTotal,
          targetName: selectedDrawer || 'الدرج الرئيسي',
          reference: '',
          notes: ''
        };
        setPayments([defaultCash]);
      }
    }
  }, [isOpen, currentPayments, grandTotal, selectedDrawer]);

  if (!isOpen) return null;

  // Calculations
  const nonCreditPayments = payments.filter(p => p.method !== 'آجل');
  const totalPaid = nonCreditPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const creditPayments = payments.filter(p => p.method === 'آجل');
  const totalCredit = creditPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remainingUnallocated = Math.max(0, grandTotal - totalPaid - totalCredit);
  const isOverpaid = (totalPaid + totalCredit) > grandTotal;

  // Add new payment line
  const handleAddPayment = (method: PaymentMethod = 'نقد') => {
    let target = selectedDrawer || 'الدرج الرئيسي';
    if (method === 'شبكة / بطاقة' || method === 'تحويل بنكي') {
      target = banks[0]?.name || 'البنك الأهلي';
    } else if (method === 'آجل') {
      target = partyName || 'على الحساب';
    }

    const newPayment: InvoicePayment = {
      id: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      method,
      amount: remainingUnallocated > 0 ? remainingUnallocated : 0,
      targetName: target,
      reference: '',
      notes: ''
    };
    setPayments([...payments, newPayment]);
  };

  // Update specific payment line
  const handleUpdatePayment = (id: string, updates: Partial<InvoicePayment>) => {
    setPayments(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          // If method changed, auto-adjust default target
          if (updates.method && updates.method !== p.method) {
            if (updates.method === 'نقد') {
              updated.targetName = selectedDrawer || treasuries[0]?.name || 'الدرج الرئيسي';
            } else if (updates.method === 'شبكة / بطاقة' || updates.method === 'تحويل بنكي') {
              updated.targetName = banks[0]?.name || 'البنك الأهلي';
            } else if (updates.method === 'آجل') {
              updated.targetName = partyName || 'على الحساب';
            }
          }
          return updated;
        }
        return p;
      })
    );
  };

  // Remove payment line
  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  // Auto settle remaining
  const handleSettleRemainingAs = (method: PaymentMethod) => {
    if (remainingUnallocated <= 0) return;
    handleAddPayment(method);
  };

  // Apply and confirm
  const handleConfirm = () => {
    // Filter out zero-amount entries unless it's the only one
    const validPayments = payments.filter(p => (Number(p.amount) || 0) > 0);
    onSavePayments(validPayments.length > 0 ? validPayments : payments);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 dir-rtl font-sans" dir="rtl">
      <div className="bg-white border border-[#B8D3E3] shadow-2xl w-full max-w-2xl text-xs overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="bg-[#E6F3FA] text-[#234B67] border-b border-[#DCE8EF] px-3 py-2 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="w-5 h-5 text-[#4A90C2]" />
            <span>تسوية المدفوعات وتعدد طرق السداد - فاتورة {invoiceType}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="bg-[#f0f7fc] border-b border-slate-200 p-2 grid grid-cols-4 gap-2 text-center select-none font-bold">
          <div className="bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-[10px] text-slate-500 block">إجمالي الفاتورة</span>
            <span className="text-sm font-mono text-[#234B67] dir-ltr block font-bold">{grandTotal.toFixed(2)} ج.م</span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-[10px] text-slate-500 block">إجمالي المسدد فوراً</span>
            <span className="text-sm font-mono text-emerald-700 dir-ltr block font-bold">{totalPaid.toFixed(2)} ج.م</span>
          </div>
          <div className="bg-white border border-slate-200 p-1.5 shadow-2xs">
            <span className="text-[10px] text-slate-500 block">المتبقي على الحساب (آجل)</span>
            <span className="text-sm font-mono text-amber-700 dir-ltr block font-bold">
              {(grandTotal - totalPaid).toFixed(2)} ج.م
            </span>
          </div>
          <div className={`p-1.5 border shadow-2xs ${isOverpaid ? 'bg-rose-50 border-rose-200 text-rose-700' : remainingUnallocated === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-[#234B67]'}`}>
            <span className="text-[10px] block text-slate-500">حالة التسوية</span>
            <span className="text-xs font-bold block mt-0.5">
              {isOverpaid ? '⚠️ زيادة عن الإجمالي' : remainingUnallocated === 0 ? '✓ متوازن تماماً' : `متبقي: ${remainingUnallocated.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* PAYMENTS LIST */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2 bg-[#f4f7fb]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#234B67]">طرق السداد المخصصة للفاتورة:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAddPayment('نقد')}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold border border-slate-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#4A90C2]" />
                <span>+ نقد</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPayment('شبكة / بطاقة')}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold border border-slate-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#4A90C2]" />
                <span>+ شبكة / بطاقة</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPayment('تحويل بنكي')}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 text-[#234B67] font-bold border border-slate-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#4A90C2]" />
                <span>+ تحويل</span>
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white border border-slate-200 p-6 text-center text-slate-400">
              لا توجد دفعات محددة. انقر على أزرار الإضافة أعلاه لإضافة دفعة نقدية أو شبكة.
            </div>
          ) : (
            <div className="border border-slate-200 bg-white">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-[#E6F3FA] text-[#234B67] font-bold border-b border-[#DCE8EF]">
                  <tr>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-32">طريقة الدفع</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-28 text-center">المبلغ (ج.م)</th>
                    <th className="p-1.5 border-l border-[#DCE8EF] w-44">الجهة / الحساب المستهدف</th>
                    <th className="p-1.5 border-l border-[#DCE8EF]">رقم المرجع / ملاحظات</th>
                    <th className="p-1.5 w-10 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE8EF]">
                  {payments.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-[#F8FBFD]">
                      {/* Method */}
                      <td className="p-1 border-l border-[#DCE8EF]">
                        <select
                          value={p.method}
                          onChange={(e) => handleUpdatePayment(p.id, { method: e.target.value as PaymentMethod })}
                          className="w-full px-1 py-1 bg-white border border-[#B8D3E3] font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2]"
                        >
                          <option value="نقد">💵 نقد (كاش)</option>
                          <option value="شبكة / بطاقة">💳 شبكة / بطاقة (مدى)</option>
                          <option value="تحويل بنكي">🏦 تحويل بنكي</option>
                          <option value="آجل">⏳ آجل (على الحساب)</option>
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="p-1 border-l border-[#DCE8EF]">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={p.amount}
                          onChange={(e) => handleUpdatePayment(p.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-1.5 py-1 bg-white border border-[#4A90C2] font-mono font-bold text-center text-slate-800 focus:outline-none"
                        />
                      </td>

                      {/* Target Account */}
                      <td className="p-1 border-l border-[#DCE8EF]">
                        {p.method === 'نقد' ? (
                          <select
                            value={p.targetName || selectedDrawer}
                            onChange={(e) => handleUpdatePayment(p.id, { targetName: e.target.value })}
                            className="w-full px-1 py-1 bg-white border border-[#B8D3E3] focus:outline-none focus:border-[#4A90C2] text-slate-800"
                          >
                            <option value="الدرج الرئيسي">الدرج الرئيسي</option>
                            <option value="خزنة الكاش">خزنة الكاش</option>
                            <option value="شباك 1">شباك 1</option>
                            {treasuries.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        ) : p.method === 'شبكة / بطاقة' || p.method === 'تحويل بنكي' ? (
                          <select
                            value={p.targetName || (banks[0]?.name || 'البنك الأهلي')}
                            onChange={(e) => handleUpdatePayment(p.id, { targetName: e.target.value })}
                            className="w-full px-1 py-1 bg-white border border-[#B8D3E3] focus:outline-none focus:border-[#4A90C2] text-slate-800"
                          >
                            {banks.length > 0 ? (
                              banks.map(b => (
                                <option key={b.id} value={b.name}>{b.name} ({b.accountNumber || b.code})</option>
                              ))
                            ) : (
                              <>
                                <option value="البنك الأهلي">البنك الأهلي</option>
                                <option value="مصرف الراجحي">مصرف الراجحي</option>
                                <option value="بنك الرياض">بنك الرياض</option>
                              </>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={p.targetName || partyName || 'على الحساب'}
                            onChange={(e) => handleUpdatePayment(p.id, { targetName: e.target.value })}
                            className="w-full px-1.5 py-1 bg-[#F8FBFD] border border-slate-200 text-slate-600"
                            readOnly
                          />
                        )}
                      </td>

                      {/* Reference & Notes */}
                      <td className="p-1 border-l border-[#DCE8EF]">
                        <input
                          type="text"
                          placeholder={p.method === 'شبكة / بطاقة' ? 'رقم الإيصال / التفويض...' : 'مرجع / ملاحظة...'}
                          value={p.reference || p.notes || ''}
                          onChange={(e) => handleUpdatePayment(p.id, { reference: e.target.value, notes: e.target.value })}
                          className="w-full px-1.5 py-1 bg-white border border-[#B8D3E3] focus:outline-none focus:border-[#4A90C2] text-slate-800"
                        />
                      </td>

                      {/* Remove Button */}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePayment(p.id)}
                          className="p-1 hover:bg-rose-50 text-rose-600 transition-colors"
                          title="حذف هذا السطر"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Actions Bar */}
          {remainingUnallocated > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-2 flex items-center justify-between text-[11px] font-bold text-amber-800">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>يوجد مبلغ غير مخصص ({remainingUnallocated.toFixed(2)} ج.م).</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSettleRemainingAs('نقد')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px]"
                >
                  سداد المتبقي كاش
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleRemainingAs('شبكة / بطاقة')}
                  className="px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px]"
                >
                  سداد المتبقي شبكة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-[#f0f7fc] border-t border-slate-200 p-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">المدفوع الفعلي:</span>
            <span className="font-mono font-bold text-emerald-700 text-sm dir-ltr">{totalPaid.toFixed(2)} ج.م</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-none cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1 bg-[#4A90C2] hover:bg-[#3A759F] text-white border border-[#3A759F] rounded-none flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              تأكيد وتطبيق المدفوعات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
