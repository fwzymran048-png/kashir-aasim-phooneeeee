import React, { useState, useEffect } from 'react';
import { Cheque, ChequeType, ChequeStatus, User } from '../../services/storage';
import { CreditCard, X, Check, Trash2 } from 'lucide-react';

interface ChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cheque: Cheque) => void;
  onDelete?: (id: string) => void;
  chequeToEdit?: Cheque | null;
  currentUser?: User | null;
  existingCheques: Cheque[];
}

export default function ChequeModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  chequeToEdit,
  currentUser,
  existingCheques
}: ChequeModalProps) {
  const [chequeNumber, setChequeNumber] = useState('');
  const [type, setType] = useState<ChequeType>('وارد');
  const [bankName, setBankName] = useState('البنك الأهلي التجاري');
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<'عميل' | 'مورد' | 'موظف' | 'أخرى'>('عميل');
  const [amount, setAmount] = useState<number>(0);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<ChequeStatus>('تحت التحصيل');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '/');

  useEffect(() => {
    if (chequeToEdit) {
      setChequeNumber(chequeToEdit.chequeNumber);
      setType(chequeToEdit.type === 'INCOMING' ? 'وارد' : chequeToEdit.type === 'OUTGOING' ? 'صادر' : chequeToEdit.type);
      setBankName(chequeToEdit.bankName || 'البنك الأهلي التجاري');
      setPartyName(chequeToEdit.partyName || '');
      setPartyType((chequeToEdit.partyType as any) || 'عميل');
      setAmount(chequeToEdit.amount || 0);
      setIssueDate(chequeToEdit.issueDate || todayStr);
      setDueDate(chequeToEdit.dueDate || todayStr);
      setStatus(
        chequeToEdit.status === 'UNDER_COLLECTION' ? 'تحت التحصيل' :
        chequeToEdit.status === 'COLLECTED' ? 'محصل' :
        chequeToEdit.status === 'RETURNED' ? 'مرتد' :
        chequeToEdit.status === 'CANCELLED' ? 'ملغي' :
        chequeToEdit.status
      );
      setNotes(chequeToEdit.notes || '');
    } else {
      const nextNum = Math.floor(10000000 + Math.random() * 90000000).toString();
      setChequeNumber(nextNum);
      setType('وارد');
      setBankName('البنك الأهلي التجاري');
      setPartyName('');
      setPartyType('عميل');
      setAmount(0);
      setIssueDate(todayStr);
      setDueDate(todayStr);
      setStatus('تحت التحصيل');
      setNotes('');
    }
    setError('');
  }, [chequeToEdit, existingCheques, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeNumber.trim()) {
      setError('يرجى إدخال رقم الشيك');
      return;
    }
    if (!partyName.trim()) {
      setError('يرجى إدخال اسم الجهة / الساحب / المستفيد');
      return;
    }
    if (amount <= 0) {
      setError('يرجى إدخال مبلغ الشيك بشكل صحيح');
      return;
    }

    const newCheque: Cheque = {
      id: chequeToEdit ? chequeToEdit.id : `CHK-${Date.now()}`,
      chequeNumber: chequeNumber.trim(),
      type,
      bankName: bankName.trim(),
      partyName: partyName.trim(),
      partyType,
      amount: Number(amount),
      issueDate: issueDate || todayStr,
      dueDate: dueDate || todayStr,
      status,
      notes: notes.trim(),
      userId: currentUser?.id,
      createdByName: currentUser?.displayName || currentUser?.username || 'مدير النظام',
      createdAt: chequeToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newCheque);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 dir-rtl" dir="rtl">
      <div className="bg-white rounded-none max-w-lg w-full border border-[#B8D3E3] shadow-2xl text-xs font-medium">
        {/* Header */}
        <div className="bg-[#E6F3FA] p-3 border-b border-[#DCE8EF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#234B67]">
                {chequeToEdit ? 'تعديل بيانات الشيك' : 'تسجيل شيك بنكي جديد (وارد / صادر)'}
              </h3>
              <p className="text-[10px] text-slate-500 font-normal">إدارة الشيكات والأوراق المالية المستحقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-white">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 font-bold text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">نوع الشيك:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ChequeType)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="وارد">شيك وارد (قبض من عميل/جهة)</option>
                <option value="صادر">شيك صادر (صرف لمورد/جهة)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الشيك البنكي:</label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="10048291"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">البنك المسحوب عليه:</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="مثال: البنك الأهلي، مصرف الراجحي"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">قيمة مبلغ الشيك (ج.م):</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono font-black text-sm text-left focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم الجهة / الساحب / المستفيد:</label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="مثال: شركة السلام، محمد أحمد"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">نوع الجهة:</label>
              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as any)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="عميل">عميل</option>
                <option value="مورد">مورد</option>
                <option value="موظف">موظف</option>
                <option value="أخرى">جهة أخرى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ التحرير:</label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono text-center focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ الاستحقاق:</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono text-center font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">حالة الشيك:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ChequeStatus)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="تحت التحصيل">تحت التحصيل</option>
                <option value="محصل">محصل (تم التحصيل)</option>
                <option value="مرتد">مرتد (مرفوض)</option>
                <option value="ملغي">ملغي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات وبيان الشيك:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              placeholder="دفعة سداد، مقابل طلبية..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {chequeToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف الشيك رقم (${chequeToEdit.chequeNumber})؟`)) {
                    onDelete(chequeToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الشيك
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#4A90C2] hover:bg-[#3b7ea9] text-white font-bold border border-[#3b7ea9] flex items-center gap-1 shadow-2xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                حفظ الشيك
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
