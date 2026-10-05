import React, { useState, useEffect, useMemo } from 'react';
import {
  Treasury,
  Bank,
  Shift,
  User,
  FinancialTransfer
} from '../../types/pos';
import {
  ArrowRightLeft,
  X,
  Clock,
  Wallet,
  Building2,
  FileText,
  Hash,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Layers
} from 'lucide-react';

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: 'treasury' | 'bank';
  balance: number;
  notes?: string;
}

interface FinancialTransferModalProps {
  isOpen: boolean;
  treasuriesList: Treasury[];
  banksList: Bank[];
  treasuryBalances: Record<string, number>;
  bankBalances: Record<string, number>;
  activeShift?: Shift | null;
  currentUser?: User | null;
  onClose: () => void;
  onSave: (transferData: {
    transferNumber: string;
    date: string;
    time: string;
    sourceType: 'treasury' | 'bank';
    sourceId: string;
    sourceName: string;
    destinationType: 'treasury' | 'bank';
    destinationId: string;
    destinationName: string;
    amount: number;
    referenceNumber?: string;
    notes?: string;
    shiftId?: string;
  }) => Promise<boolean | void> | boolean | void;
}

export default function FinancialTransferModal({
  isOpen,
  treasuriesList = [],
  banksList = [],
  treasuryBalances = {},
  bankBalances = {},
  activeShift = null,
  currentUser = null,
  onClose,
  onSave
}: FinancialTransferModalProps) {
  const [sourceType, setSourceType] = useState<'treasury' | 'bank'>('treasury');
  const [sourceId, setSourceId] = useState<string>('');
  const [destinationType, setDestinationType] = useState<'treasury' | 'bank'>('bank');
  const [destinationId, setDestinationId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Prepare normalized list of available accounts
  const sourceAccounts: AccountOption[] = useMemo(() => {
    if (sourceType === 'treasury') {
      return treasuriesList
        .filter(t => t.active !== false)
        .map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
          type: 'treasury',
          balance: treasuryBalances[t.name] ?? treasuryBalances[t.id] ?? t.openingBalance ?? 0,
          notes: t.notes
        }));
    } else {
      return banksList
        .filter(b => b.active !== false)
        .map(b => ({
          id: b.id,
          code: b.code,
          name: b.name,
          type: 'bank',
          balance: bankBalances[b.name] ?? bankBalances[b.id] ?? b.openingBalance ?? 0,
          notes: b.accountNumber ? `رقم الحساب: ${b.accountNumber}` : b.notes
        }));
    }
  }, [sourceType, treasuriesList, banksList, treasuryBalances, bankBalances]);

  const destinationAccounts: AccountOption[] = useMemo(() => {
    if (destinationType === 'treasury') {
      return treasuriesList
        .filter(t => t.active !== false)
        .map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
          type: 'treasury',
          balance: treasuryBalances[t.name] ?? treasuryBalances[t.id] ?? t.openingBalance ?? 0,
          notes: t.notes
        }));
    } else {
      return banksList
        .filter(b => b.active !== false)
        .map(b => ({
          id: b.id,
          code: b.code,
          name: b.name,
          type: 'bank',
          balance: bankBalances[b.name] ?? bankBalances[b.id] ?? b.openingBalance ?? 0,
          notes: b.accountNumber ? `رقم الحساب: ${b.accountNumber}` : b.notes
        }));
    }
  }, [destinationType, treasuriesList, banksList, treasuryBalances, bankBalances]);

  // Reset/Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      setDate(todayIso);
      setTime(timeStr);
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      setValidationError('');
      setIsSubmitting(false);

      // Default source: First treasury or active shift drawer
      if (treasuriesList.length > 0) {
        setSourceType('treasury');
        const defaultTreasury = (activeShift?.drawer && treasuriesList.find(t => t.name === activeShift.drawer)) || treasuriesList[0];
        setSourceId(defaultTreasury ? defaultTreasury.id : treasuriesList[0].id);
      } else if (banksList.length > 0) {
        setSourceType('bank');
        setSourceId(banksList[0].id);
      }

      // Default destination: First bank or second treasury
      if (banksList.length > 0) {
        setDestinationType('bank');
        setDestinationId(banksList[0].id);
      } else if (treasuriesList.length > 1) {
        setDestinationType('treasury');
        setDestinationId(treasuriesList[1].id);
      }
    }
  }, [isOpen]);

  // Adjust sourceId when source accounts list changes
  useEffect(() => {
    if (sourceAccounts.length > 0 && !sourceAccounts.some(a => a.id === sourceId)) {
      setSourceId(sourceAccounts[0].id);
    }
  }, [sourceAccounts, sourceId]);

  // Adjust destinationId when destination accounts list changes
  useEffect(() => {
    if (destinationAccounts.length > 0 && !destinationAccounts.some(a => a.id === destinationId)) {
      // Pick one that is not equal to source if possible
      const alt = destinationAccounts.find(a => a.id !== sourceId);
      setDestinationId(alt ? alt.id : destinationAccounts[0].id);
    }
  }, [destinationAccounts, destinationId, sourceId]);

  const selectedSource = sourceAccounts.find(a => a.id === sourceId);
  const selectedDestination = destinationAccounts.find(a => a.id === destinationId);

  const numAmount = typeof amount === 'number' ? amount : 0;
  const isSameAccount = selectedSource && selectedDestination && selectedSource.id === selectedDestination.id && sourceType === destinationType;
  const sourceBalance = selectedSource?.balance ?? 0;
  const destinationBalance = selectedDestination?.balance ?? 0;
  const isInsufficientBalance = numAmount > 0 && sourceBalance < numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (isSubmitting) return;

    if (!selectedSource) {
      setValidationError('يرجى تحديد حساب المصدر المحول منه.');
      return;
    }

    if (!selectedDestination) {
      setValidationError('يرجى تحديد حساب الوجهة المحول إليه.');
      return;
    }

    if (isSameAccount) {
      setValidationError('لا يمكن التحويل إلى نفس الحساب. يرجى اختيار حساب وجهة مختلف عن المصدر.');
      return;
    }

    if (!amount || numAmount <= 0) {
      setValidationError('يرجى إدخال مبلغ تحويل صحيح أكبر من الصفر.');
      return;
    }

    if (isInsufficientBalance) {
      setValidationError(`عذراً، رصيد حساب المصدر (${selectedSource.name}) غير كافٍ. الرصيد المتاح: ${sourceBalance.toFixed(2)} ج.م والمبلغ المطلوب: ${numAmount.toFixed(2)} ج.م.`);
      return;
    }

    if (!date) {
      setValidationError('يرجى تحديد تاريخ التحويل.');
      return;
    }

    const transferNumber = 'TRF-' + Date.now().toString().slice(-6);

    setIsSubmitting(true);
    try {
      await onSave({
        transferNumber,
        date,
        time: time || '00:00',
        sourceType,
        sourceId: selectedSource.id,
        sourceName: selectedSource.name,
        destinationType,
        destinationId: selectedDestination.id,
        destinationName: selectedDestination.name,
        amount: numAmount,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        shiftId: activeShift ? activeShift.id : undefined
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'حدث خطأ أثناء حفظ التحويل المالي.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="financial-transfer-modal-overlay"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 select-none overflow-y-auto font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="financial-transfer-modal-container"
        className="bg-white border border-[#B8D3E3] shadow-2xl w-full max-w-2xl text-right flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WinForms Title Bar */}
        <div
          id="financial-transfer-modal-header"
          className="bg-[#E6F3FA] text-[#234B67] px-3 py-2.5 flex items-center justify-between border-b border-[#DCE8EF] select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide">
                التحويل المالي الفعلي بين الخزائن والبنوك (Internal Transfer)
              </span>
              <p className="text-[10px] text-slate-500 font-normal">تحويل وتسوية الأرصدة الداخلية بين حسابات المنشأة</p>
            </div>
          </div>
          <button
            id="financial-transfer-modal-close-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 border border-slate-200 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Shift & User Context Banner */}
        <div className="bg-[#F0F7FC] px-3 py-1.5 border-b border-[#DCE8EF] flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">المستخدم الحالي:</span>
            <span className="text-[#234B67] font-bold">{currentUser?.displayName || currentUser?.username || 'مدير النظام'}</span>
          </div>
          <div className="flex items-center gap-2">
            {activeShift ? (
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-mono font-bold flex items-center gap-1 border border-emerald-700 shadow-2xs">
                <Clock className="w-3 h-3" />
                وردية نشطة #{activeShift.id.slice(-6)}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold">
                خارج الوردية
              </span>
            )}
          </div>
        </div>

        {/* Main Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {validationError && (
            <div
              id="transfer-validation-error-alert"
              className="bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-xs font-bold text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Transfer Accounts Grid (Source & Destination) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* SOURCE ACCOUNT SECTION (من حساب) */}
            <div className="bg-[#F8FBFD] p-3 border border-[#B8D3E3] flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-xs text-red-600 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  المصدر (الخصم / المحول منه)
                </span>
                {/* Source Type Selector */}
                <div className="flex border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setSourceType('treasury')}
                    className={`px-2 py-0.5 text-[11px] font-bold ${
                      sourceType === 'treasury'
                        ? 'bg-[#4A90C2] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    خزينة / درج
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('bank')}
                    className={`px-2 py-0.5 text-[11px] font-bold ${
                      sourceType === 'bank'
                        ? 'bg-[#4A90C2] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    حساب بنكي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر {sourceType === 'treasury' ? 'الخزينة / الدرج' : 'الحساب البنكي'}:
                </label>
                <select
                  id="transfer-source-account-select"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-bold text-slate-800 focus:border-[#4A90C2] focus:outline-none"
                >
                  {sourceAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code}) — الرصيد: {acc.balance.toFixed(2)} ج.م
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Balance Metric */}
              <div className="bg-white p-2 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">الرصيد المتاح حالياً:</span>
                <span className={`font-mono font-bold text-sm ${sourceBalance > 0 ? 'text-[#234B67]' : 'text-red-600'}`}>
                  {sourceBalance.toFixed(2)} ج.م
                </span>
              </div>
            </div>

            {/* DESTINATION ACCOUNT SECTION (إلى حساب) */}
            <div className="bg-[#F8FBFD] p-3 border border-[#B8D3E3] flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-xs text-emerald-600 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  الوجهة (الإيداع / المحول إليه)
                </span>
                {/* Destination Type Selector */}
                <div className="flex border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setDestinationType('treasury')}
                    className={`px-2 py-0.5 text-[11px] font-bold ${
                      destinationType === 'treasury'
                        ? 'bg-[#4A90C2] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    خزينة / درج
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationType('bank')}
                    className={`px-2 py-0.5 text-[11px] font-bold ${
                      destinationType === 'bank'
                        ? 'bg-[#4A90C2] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    حساب بنكي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر {destinationType === 'treasury' ? 'الخزينة / الدرج' : 'الحساب البنكي'}:
                </label>
                <select
                  id="transfer-destination-account-select"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-bold text-slate-800 focus:border-[#4A90C2] focus:outline-none"
                >
                  {destinationAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === sourceId && sourceType === destinationType}>
                      {acc.name} ({acc.code}) {acc.id === sourceId && sourceType === destinationType ? '(غير مسموح - نفس الحساب)' : `— الرصيد: ${acc.balance.toFixed(2)} ج.م`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Balance Metric */}
              <div className="bg-white p-2 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">الرصيد الحالي:</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {destinationBalance.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Amount, Date, Time, Reference row */}
          <div className="bg-[#F8FBFD] p-3 border border-[#B8D3E3] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Amount */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[#234B67] mb-1">
                  مبلغ التحويل <span className="text-red-500">*</span>
                </label>
                <input
                  id="transfer-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-white border-2 border-[#4A90C2] p-1.5 text-sm font-mono font-black text-left text-[#234B67] focus:outline-none"
                />
              </div>

              {/* Reference Number */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم المرجع / الإشعار
                </label>
                <input
                  id="transfer-reference-input"
                  type="text"
                  placeholder="رقم الحوالة / الإيصال"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-mono font-bold text-slate-800 focus:border-[#4A90C2] focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التاريخ <span className="text-red-500">*</span>
                </label>
                <input
                  id="transfer-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-mono font-bold text-slate-800 focus:border-[#4A90C2] focus:outline-none"
                />
              </div>

              {/* Time */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوقت
                </label>
                <input
                  id="transfer-time-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-mono font-bold text-slate-800 focus:border-[#4A90C2] focus:outline-none"
                />
              </div>
            </div>

            {/* Notes / Statement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                بيان التحويل / ملاحظات
              </label>
              <input
                id="transfer-notes-input"
                type="text"
                placeholder="مثال: توريد نقدي من درج الكاشير إلى البنك الأهلي التجاري"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-[#B8D3E3] p-1.5 text-xs font-medium text-slate-800 focus:border-[#4A90C2] focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Balance Simulation / Impact Matrix */}
          <div className="bg-[#E6F3FA]/40 p-3 border border-[#DCE8EF]">
            <div className="flex items-center justify-between text-xs font-bold text-[#234B67] mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#4A90C2]" />
                معاينة الأثر المالي الفعلي على الأرصدة (Balance Integrity Preview)
              </span>
              <span className="text-[11px] text-emerald-700 font-mono">
                صافي التغير في السيولة الإجمالية = 0.00 ج.م (ثبات تام)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Source simulated balance */}
              <div className="bg-white p-2 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-red-600">المصدر: {selectedSource?.name || 'غير محدد'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">خصم</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500">الرصيد قبل: <strong className="font-mono">{sourceBalance.toFixed(2)}</strong></span>
                  <span className="text-red-600 font-bold font-mono">- {numAmount.toFixed(2)}</span>
                  <span className="text-slate-800">الرصيد بعد: <strong className={`font-mono ${sourceBalance - numAmount < 0 ? 'text-red-600' : 'text-[#234B67]'}`}>{(sourceBalance - numAmount).toFixed(2)}</strong> ج.م</span>
                </div>
              </div>

              {/* Destination simulated balance */}
              <div className="bg-white p-2 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-600">الوجهة: {selectedDestination?.name || 'غير محدد'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">إيداع</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500">الرصيد قبل: <strong className="font-mono">{destinationBalance.toFixed(2)}</strong></span>
                  <span className="text-emerald-600 font-bold font-mono">+ {numAmount.toFixed(2)}</span>
                  <span className="text-slate-800">الرصيد بعد: <strong className="font-mono text-emerald-600">{(destinationBalance + numAmount).toFixed(2)}</strong> ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              id="transfer-cancel-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
            >
              إلغاء الأمر
            </button>
            <button
              id="transfer-execute-submit-btn"
              type="submit"
              disabled={isSubmitting || isSameAccount || isInsufficientBalance || numAmount <= 0}
              className={`px-5 py-1.5 font-bold text-xs text-white border flex items-center gap-1.5 transition-colors shadow-2xs ${
                isSubmitting || isSameAccount || isInsufficientBalance || numAmount <= 0
                  ? 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#4A90C2] hover:bg-[#3b7ea9] border-[#3b7ea9]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'جاري تنفيذ التحويل...' : 'تنفيذ التحويل المالي الفعلي'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
