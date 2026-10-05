import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import {
  Customer,
  Supplier,
  Voucher,
  Treasury,
  User,
  Shift,
  dbSaveCustomers,
  dbSaveSuppliers,
  dbSaveVouchers,
  dbAddAuditLog
} from '../../services/storage';

export type QuickAccountOperationType = 'سداد نقدي' | 'سحب' | 'خصم' | 'إضافة';

export interface AccountQuickOperationsDropdownProps {
  accountType: 'customer' | 'supplier' | 'عميل' | 'مورد';
  accountId: string;
  accountName: string;
  accountPhone?: string;
  accountCode?: string;
  currentBalance: number;
  customersList: Customer[];
  suppliersList: Supplier[];
  vouchersList: Voucher[];
  treasuriesList?: Treasury[];
  currentUser?: User | null;
  activeShift?: Shift | null;
  selectedBranch?: string;
  onUpdateCustomers?: (items: Customer[]) => void;
  onUpdateSuppliers?: (items: Supplier[]) => void;
  onUpdateVouchers?: (items: Voucher[]) => void;
  onOperationComplete?: (newVoucher: Voucher, updatedBalance: number) => void;
}

export default function AccountQuickOperationsDropdown({
  accountType,
  accountId,
  accountName,
  currentBalance,
  customersList,
  suppliersList,
  vouchersList,
  treasuriesList = [],
  currentUser,
  activeShift,
  selectedBranch = 'الفرع الرئيسي',
  onUpdateCustomers,
  onUpdateSuppliers,
  onUpdateVouchers,
  onOperationComplete
}: AccountQuickOperationsDropdownProps) {
  const [selectedOperation, setSelectedOperation] = useState<QuickAccountOperationType | ''>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  const isCustomer = accountType === 'customer' || accountType === 'عميل';
  const isSupplier = accountType === 'supplier' || accountType === 'مورد';

  // Auto-focus amount input when an operation is selected
  useEffect(() => {
    if (selectedOperation) {
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 50);
    }
  }, [selectedOperation]);

  const handleSelectOperation = (op: QuickAccountOperationType | '') => {
    setSelectedOperation(op);
    setAmountStr('');
    setNotes('');
    setFeedbackMsg(null);
  };

  const handleReset = () => {
    setSelectedOperation('');
    setAmountStr('');
    setNotes('');
    setFeedbackMsg(null);
    setIsSubmitting(false);
  };

  const handleExecute = async () => {
    if (!selectedOperation) return;
    if (isSubmitting) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      amountInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
      const uniqueId = `VOUCH-QOP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const refNumber = `REF-${Date.now().toString().slice(-6)}`;
      const defaultDrawer = treasuriesList.length > 0 ? treasuriesList[0].name : 'الدرج الرئيسي';

      let voucherType: 'قبض' | 'صرف' = 'قبض';
      let targetDrawer = defaultDrawer;
      let newBalance = currentBalance;
      let defaultNotes = '';
      let auditAction = '';

      if (isCustomer) {
        // Customer context
        switch (selectedOperation) {
          case 'سداد نقدي':
            // Cash paid by customer -> reduces balance, increases cash in drawer
            voucherType = 'قبض';
            targetDrawer = defaultDrawer;
            newBalance = currentBalance - amount;
            defaultNotes = 'سداد نقدي من حساب العميل';
            auditAction = 'CUSTOMER_CASH_SETTLEMENT';
            break;
          case 'سحب':
            // Cash taken/refunded to customer -> increases debit balance, cash leaves drawer
            voucherType = 'صرف';
            targetDrawer = defaultDrawer;
            newBalance = currentBalance + amount;
            defaultNotes = 'سحب نقدي من حساب العميل';
            auditAction = 'CUSTOMER_CASH_WITHDRAWAL';
            break;
          case 'خصم':
            // Discount on customer balance -> reduces balance, NO cash drawer impact
            voucherType = 'قبض';
            targetDrawer = 'تسوية غير نقدية';
            newBalance = currentBalance - amount;
            defaultNotes = 'خصم على الحساب';
            auditAction = 'CUSTOMER_ACCOUNT_DISCOUNT';
            break;
          case 'إضافة':
            // Addition to customer balance (service/non-invoice charge) -> increases balance, NO cash drawer impact
            voucherType = 'صرف';
            targetDrawer = 'تسوية غير نقدية';
            newBalance = currentBalance + amount;
            defaultNotes = 'إضافة على الحساب';
            auditAction = 'CUSTOMER_ACCOUNT_ADDITION';
            break;
        }
      } else if (isSupplier) {
        // Supplier context
        switch (selectedOperation) {
          case 'سداد نقدي':
            // Cash paid to supplier -> reduces balance owed, cash leaves drawer
            voucherType = 'صرف';
            targetDrawer = defaultDrawer;
            newBalance = currentBalance - amount;
            defaultNotes = 'سداد نقدي لحساب المورد';
            auditAction = 'SUPPLIER_CASH_SETTLEMENT';
            break;
          case 'سحب':
            // Cash received / refund from supplier -> increases balance, cash enters drawer
            voucherType = 'قبض';
            targetDrawer = defaultDrawer;
            newBalance = currentBalance + amount;
            defaultNotes = 'سحب / استرداد نقدي من المورد';
            auditAction = 'SUPPLIER_CASH_WITHDRAWAL';
            break;
          case 'خصم':
            // Discount from supplier -> reduces balance owed, NO cash drawer impact
            voucherType = 'صرف';
            targetDrawer = 'تسوية غير نقدية';
            newBalance = currentBalance - amount;
            defaultNotes = 'خصم من حساب المورد';
            auditAction = 'SUPPLIER_ACCOUNT_DISCOUNT';
            break;
          case 'إضافة':
            // Addition to supplier balance -> increases balance owed, NO cash drawer impact
            voucherType = 'قبض';
            targetDrawer = 'تسوية غير نقدية';
            newBalance = currentBalance + amount;
            defaultNotes = 'إضافة على حساب المورد';
            auditAction = 'SUPPLIER_ACCOUNT_ADDITION';
            break;
        }
      }

      const finalNotes = notes.trim() || defaultNotes;

      // 1. Construct the Voucher
      const newVoucher: Voucher = {
        id: uniqueId,
        type: voucherType,
        date: todayStr,
        time: timeStr,
        name: accountName,
        amount: amount,
        notes: finalNotes,
        drawer: targetDrawer,
        branch: selectedBranch || 'الفرع الرئيسي',
        partyType: isCustomer ? 'customer' : 'supplier',
        partyId: accountId,
        category: selectedOperation,
        referenceNumber: refNumber,
        userId: currentUser?.id || 'usr-admin',
        createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
        shiftId: activeShift?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Persist Voucher in DB and update state
      const updatedVouchers = [newVoucher, ...vouchersList];
      await dbSaveVouchers(updatedVouchers);
      if (onUpdateVouchers) {
        onUpdateVouchers(updatedVouchers);
      }

      // 3. Update Customer or Supplier record
      if (isCustomer) {
        const updatedCustomers = customersList.map(c =>
          (c.id === accountId || c.name === accountName) ? { ...c, balance: newBalance } : c
        );
        await dbSaveCustomers(updatedCustomers);
        if (onUpdateCustomers) {
          onUpdateCustomers(updatedCustomers);
        }
      } else if (isSupplier) {
        const updatedSuppliers = suppliersList.map(s =>
          (s.id === accountId || s.name === accountName) ? { ...s, balance: newBalance } : s
        );
        await dbSaveSuppliers(updatedSuppliers);
        if (onUpdateSuppliers) {
          onUpdateSuppliers(updatedSuppliers);
        }
      }

      // 4. Audit Log
      await dbAddAuditLog({
        userId: currentUser?.id || 'system',
        username: currentUser?.username || 'admin',
        action: auditAction,
        details: `عملية حساب سريعة (${selectedOperation}) لحساب ${isCustomer ? 'العميل' : 'المورد'}: ${accountName} بمبلغ ${amount} ج.م - بيان: ${finalNotes} [${refNumber}]`
      });

      // 5. Notify parent component
      if (onOperationComplete) {
        onOperationComplete(newVoucher, newBalance);
      }

      // 6. Reset UI
      setSelectedOperation('');
      setAmountStr('');
      setNotes('');
      setFeedbackMsg({ text: `تم تنفيذ عملية (${selectedOperation}) بمبلغ ${amount} ج.م بنجاح.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      console.error('Failed to execute account quick operation:', err);
      alert('حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Primary Entry Point: Dropdown */}
      <div className="relative inline-flex items-center">
        <select
          value={selectedOperation}
          onChange={(e) => handleSelectOperation(e.target.value as QuickAccountOperationType | '')}
          className="appearance-none bg-white border border-[#999999] hover:border-[#243746] pl-6 pr-2 py-1 text-xs font-bold text-[#243746] rounded-none focus:outline-none focus:border-[#243746] cursor-pointer shadow-xs"
          title="عمليات الحساب السريعة"
        >
          <option value="">اختر العملية ▼</option>
          <option value="سداد نقدي">سداد نقدي</option>
          <option value="سحب">سحب</option>
          <option value="خصم">خصم</option>
          <option value="إضافة">إضافة</option>
        </select>
        <ChevronDown className="w-3 h-3 text-[#666666] absolute left-1.5 pointer-events-none" />
      </div>

      {/* Inline Minimum Required Fields (shown only after operation selection) */}
      {selectedOperation && (
        <div className="flex items-center gap-1.5 bg-[#ffffff] border border-[#243746] px-2 py-0.5 shadow-sm animate-in fade-in duration-150">
          <span className="text-[11px] font-bold text-[#243746] bg-[#dceef2] px-1.5 py-0.5 border border-[#b8c8cc]">
            {selectedOperation}
          </span>

          <div className="flex items-center gap-1">
            <label className="text-[11px] font-bold text-[#222222] whitespace-nowrap">المبلغ:</label>
            <input
              ref={amountInputRef}
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  notesInputRef.current?.focus();
                } else if (e.key === 'Escape') {
                  handleReset();
                }
              }}
              className="w-24 sm:w-28 px-1.5 py-0.5 bg-white border border-[#999999] font-mono font-bold text-[#222222] text-center text-xs rounded-none focus:outline-none focus:border-[#243746]"
            />
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[11px] font-bold text-[#222222] whitespace-nowrap">الملاحظات:</label>
            <input
              ref={notesInputRef}
              type="text"
              placeholder={
                selectedOperation === 'إضافة'
                  ? 'سبب الإضافة (مثال: تركيب شاشة + أجرة)...'
                  : selectedOperation === 'خصم'
                  ? 'سبب الخصم...'
                  : 'ملاحظات العملية...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecute();
                } else if (e.key === 'Escape') {
                  handleReset();
                }
              }}
              className="w-36 sm:w-56 px-2 py-0.5 bg-white border border-[#999999] text-xs font-medium text-[#222222] rounded-none focus:outline-none focus:border-[#243746]"
            />
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting || !amountStr}
            className="px-3 py-0.5 bg-[#243746] hover:bg-[#1a2935] text-white font-bold text-xs rounded-none border border-[#1a2935] flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-[#4f9d69]" />
            تنفيذ
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-1.5 py-0.5 bg-[#f0f0f0] hover:bg-[#e0e0e0] text-[#666666] hover:text-[#222222] text-xs rounded-none border border-[#cccccc] cursor-pointer"
            title="إلغاء العملية"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Temporary Success/Error Banner */}
      {feedbackMsg && (
        <span className={`text-[11px] font-bold px-2 py-0.5 border ${
          feedbackMsg.type === 'success' ? 'bg-[#f0f9f4] text-[#2e7d32] border-[#a5d6a7]' : 'bg-[#fdf2f2] text-[#c62828] border-[#ef9a9a]'
        }`}>
          {feedbackMsg.text}
        </span>
      )}
    </div>
  );
}
