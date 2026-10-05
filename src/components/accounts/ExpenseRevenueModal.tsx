import React, { useState, useEffect } from 'react';
import {
  Voucher,
  Treasury,
  Shift,
  User
} from '../../types/pos';
import {
  DollarSign,
  X,
  Plus,
  Tag,
  Clock,
  Wallet,
  FileText,
  Hash,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  'كهرباء ومياه',
  'إيجار ومرافق',
  'رواتب وأجور ومكافآت',
  'صيانة ونظافة',
  'أدوات مكتبية ومطبوعات',
  'اتصالات وإنترنت',
  'نقل وشحن وضيافة',
  'تسويق وإعلانات',
  'رسوم وتراخيص حكومية',
  'مصروفات تشغيلية أخرى'
];

export const REVENUE_CATEGORIES = [
  'خدمات وصيانة للغير',
  'عمولات ووساطة',
  'إيراد إيجار وتشغيل أصول',
  'خدمات شحن وتوصيل',
  'تسويات وأرباح رأسمالية',
  'إيرادات تشغيلية أخرى'
];

interface ExpenseRevenueModalProps {
  isOpen: boolean;
  initialType?: 'صرف' | 'قبض';
  initialPartyType?: 'expense' | 'revenue';
  editingVoucher?: Voucher | null;
  treasuriesList?: Treasury[];
  activeShift?: Shift | null;
  currentUser?: User | null;
  onClose: () => void;
  onSave: (voucherData: {
    id?: string;
    type: 'صرف' | 'قبض';
    partyType: 'expense' | 'revenue';
    category: string;
    name: string;
    amount: number;
    drawer: string;
    referenceNumber?: string;
    date: string;
    time: string;
    notes: string;
    shiftId?: string;
  }) => void;
}

export default function ExpenseRevenueModal({
  isOpen,
  initialType = 'صرف',
  initialPartyType = 'expense',
  editingVoucher = null,
  treasuriesList = [],
  activeShift = null,
  currentUser = null,
  onClose,
  onSave
}: ExpenseRevenueModalProps) {
  const [type, setType] = useState<'صرف' | 'قبض'>(initialType);
  const [partyType, setPartyType] = useState<'expense' | 'revenue'>(initialPartyType);
  const [category, setCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [drawer, setDrawer] = useState<string>('الدرج الرئيسي');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

      if (editingVoucher) {
        setType(editingVoucher.type);
        const pType = editingVoucher.partyType === 'revenue' || (editingVoucher.type === 'قبض' && !editingVoucher.partyType) ? 'revenue' : 'expense';
        setPartyType(pType);
        
        const cat = editingVoucher.category || '';
        const list = pType === 'expense' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;
        if (cat && !list.includes(cat)) {
          setIsCustomCategory(true);
          setCustomCategoryInput(cat);
          setCategory('custom');
        } else {
          setIsCustomCategory(false);
          setCategory(cat || list[0]);
        }

        setName(editingVoucher.name || '');
        setAmount(editingVoucher.amount || '');
        setDrawer(editingVoucher.drawer || treasuriesList[0]?.name || 'الدرج الرئيسي');
        setReferenceNumber(editingVoucher.referenceNumber || '');
        setDate(editingVoucher.date || todayIso);
        setTime(editingVoucher.time || timeStr);
        setNotes(editingVoucher.notes || '');
      } else {
        setType(initialType);
        setPartyType(initialPartyType);
        const defaultCat = initialPartyType === 'expense' ? EXPENSE_CATEGORIES[0] : REVENUE_CATEGORIES[0];
        setCategory(defaultCat);
        setIsCustomCategory(false);
        setCustomCategoryInput('');
        setName('');
        setAmount('');
        setDrawer(treasuriesList[0]?.name || 'الدرج الرئيسي');
        setReferenceNumber('');
        setDate(todayIso);
        setTime(timeStr);
        setNotes('');
      }
      setValidationError('');
    }
  }, [isOpen, editingVoucher, initialType, initialPartyType, treasuriesList]);

  if (!isOpen) return null;

  const currentCategories = partyType === 'expense' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;

  const handleTypeSwitch = (targetPartyType: 'expense' | 'revenue') => {
    setPartyType(targetPartyType);
    setType(targetPartyType === 'expense' ? 'صرف' : 'قبض');
    setIsCustomCategory(false);
    setCategory(targetPartyType === 'expense' ? EXPENSE_CATEGORIES[0] : REVENUE_CATEGORIES[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : category;
    if (!finalCategory) {
      setValidationError('يرجى تحديد أو إدخال بند التصنيف');
      return;
    }

    if (!name.trim()) {
      setValidationError('يرجى إدخال اسم الجهة / البيان');
      return;
    }

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setValidationError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    onSave({
      id: editingVoucher?.id,
      type,
      partyType,
      category: finalCategory,
      name: name.trim(),
      amount: numAmount,
      drawer: drawer || 'الدرج الرئيسي',
      referenceNumber: referenceNumber.trim() || undefined,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toTimeString().split(' ')[0].substring(0, 5),
      notes: notes.trim(),
      shiftId: activeShift ? activeShift.id : editingVoucher?.shiftId
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 dir-rtl font-sans" dir="rtl">
      <div className="bg-white border border-[#B8D3E3] rounded-none w-full max-w-lg shadow-2xl flex flex-col text-xs">
        {/* MODAL HEADER */}
        <div className="bg-[#E6F3FA] px-3 py-2.5 flex items-center justify-between font-bold border-b border-[#DCE8EF]">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 flex items-center justify-center ${partyType === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#234B67]">
                {editingVoucher
                  ? `تعديل سند ${partyType === 'expense' ? 'مصروف تشغيلي' : 'إيراد تشغيلي'} (${editingVoucher.id})`
                  : partyType === 'expense'
                  ? 'تسجيل مصروف تشغيلي جديد (سند صرف)'
                  : 'تسجيل إيراد تشغيلي جديد (سند قبض)'}
              </span>
              <p className="text-[10px] text-slate-500 font-normal">تسجيل ومتابعة الحركات النقدية والتشغيلية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 border border-slate-200 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TYPE SWITCHER STRIP */}
        <div className="bg-[#F8FBFD] p-2 border-b border-[#DCE8EF] flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTypeSwitch('expense')}
            className={`flex-1 py-1.5 px-2 font-bold text-xs border transition-colors flex items-center justify-center gap-1.5 ${
              partyType === 'expense'
                ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>مصروف تشغيلي (سند صرف نقدية)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('revenue')}
            className={`flex-1 py-1.5 px-2 font-bold text-xs border transition-colors flex items-center justify-center gap-1.5 ${
              partyType === 'revenue'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>إيراد تشغيلي (سند قبض نقدية)</span>
          </button>
        </div>

        {/* ACTIVE SHIFT STATUS NOTICE */}
        <div className="px-3 py-1.5 bg-[#F0F7FC] border-b border-[#DCE8EF] flex items-center justify-between text-[11px] text-slate-700">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock className="w-3.5 h-3.5 text-[#4A90C2]" />
            {activeShift ? (
              <span>
                الوردية الحالية: <strong className="font-mono text-[#234B67]">{activeShift.id}</strong> ({activeShift.userName})
              </span>
            ) : (
              <span className="text-slate-500">لا توجد وردية مفتوحة حالياً (سيتم ترحيل الحركة للخزينة مباشرة)</span>
            )}
          </div>
          {currentUser && (
            <span className="font-mono text-[10px] text-slate-500">
              المسؤول: {currentUser.displayName || currentUser.username}
            </span>
          )}
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2 flex items-center gap-2 font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ROW 1: CATEGORY SELECTION */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-[#4A90C2]" />
              <span>{partyType === 'expense' ? 'بند المصروف التشغيلي *' : 'بند الإيراد التشغيلي *'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <select
                value={isCustomCategory ? 'custom' : category}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-2 py-1.5 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
              >
                {currentCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">-- كتابة بند تصنيف مخصص --</option>
              </select>

              {isCustomCategory ? (
                <input
                  type="text"
                  placeholder="اكتب اسم البند المخصص هنا..."
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="w-full px-2 py-1.5 bg-amber-50 border border-amber-300 rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] text-xs"
                  autoFocus
                />
              ) : (
                <div className="flex items-center px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  <span>التصنيف المالي: </span>
                  <span className="font-bold text-[#234B67] mr-1">
                    {partyType === 'expense' ? 'مصروفات تشغيلية وأعباء' : 'إيرادات تشغيلية وأرباح'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: NAME / BENEFICIARY / DESCRIPTION */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#4A90C2]" />
              <span>{partyType === 'expense' ? 'اسم المستفيد / البيان التفصيلي *' : 'اسم الدافع / مصدر الإيراد *'}</span>
            </label>
            <input
              type="text"
              placeholder={partyType === 'expense' ? 'مثال: سداد فاتورة كهرباء شهر يوليو / صيانة تكييف الفرع' : 'مثال: تحصيل عمولة حوالات / أتعاب خدمة صيانة خاصة'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
            />
          </div>

          {/* ROW 3: AMOUNT & TREASURY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>المبلغ (ج.م) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className={`w-full px-2 py-1.5 bg-[#F8FBFD] border font-mono font-bold text-sm focus:outline-none focus:bg-white rounded-none ${
                  partyType === 'expense'
                    ? 'border-red-300 text-red-700 focus:border-red-500'
                    : 'border-emerald-300 text-emerald-700 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#4A90C2]" />
                <span>الخزنة / الدرج النقدي *</span>
              </label>
              <select
                value={drawer}
                onChange={(e) => setDrawer(e.target.value)}
                className="w-full px-2 py-1.5 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
              >
                {treasuriesList.length > 0 ? (
                  treasuriesList.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} (رصيد افتتاحي: {t.openingBalance} ج.م)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="الدرج الرئيسي">الدرج الرئيسي</option>
                    <option value="خزنة الكاش">خزنة الكاش</option>
                    <option value="شباك 1">شباك 1</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* ROW 4: REFERENCE NUMBER, DATE, TIME */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#4A90C2]" />
                <span>رقم المرجع / الإيصال</span>
              </label>
              <input
                type="text"
                placeholder="رقم الفاتورة الورقية..."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-mono text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-mono text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الوقت</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none font-mono text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* ROW 5: NOTES */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات وشروحات إضافية</label>
            <textarea
              rows={2}
              placeholder="أي تفاصيل أو اعتمادات إدارية تخص هذا السند..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] rounded-none text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white text-xs resize-none"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="submit"
              className={`flex-1 py-2 text-white font-bold rounded-none text-xs flex items-center justify-center gap-1.5 cursor-pointer border shadow-2xs transition-colors ${
                partyType === 'expense'
                  ? 'bg-red-600 hover:bg-red-700 border-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingVoucher ? 'تحديث وحفظ التعديلات' : `حفظ وإصدار سند ${partyType === 'expense' ? 'المصروف' : 'الإيراد'}`}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-none text-xs transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
