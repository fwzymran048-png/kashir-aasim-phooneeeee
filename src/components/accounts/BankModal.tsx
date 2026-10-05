import React, { useState, useEffect } from 'react';
import { Bank } from '../../services/storage';
import { Landmark, X, Check, Trash2 } from 'lucide-react';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bank: Bank) => void;
  onDelete?: (id: string) => void;
  bankToEdit?: Bank | null;
  existingBanks: Bank[];
  selectedBranch: string;
}

export default function BankModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  bankToEdit,
  existingBanks,
  selectedBranch
}: BankModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (bankToEdit) {
      setCode(bankToEdit.code);
      setName(bankToEdit.name);
      setAccountNumber(bankToEdit.accountNumber || '');
      setIban(bankToEdit.IBAN || '');
      setOpeningBalance(bankToEdit.openingBalance || 0);
      setActive(bankToEdit.active !== false);
      setNotes(bankToEdit.notes || '');
    } else {
      const nextNum = existingBanks.length + 1;
      setCode(`BNK-${100 + nextNum}`);
      setName('');
      setAccountNumber('');
      setIban('');
      setOpeningBalance(0);
      setActive(true);
      setNotes('');
    }
    setError('');
  }, [bankToEdit, existingBanks, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم البنك أو الحساب');
      return;
    }
    if (!code.trim()) {
      setError('يرجى إدخال كود الحساب البنكي');
      return;
    }

    const newBank: Bank = {
      id: bankToEdit ? bankToEdit.id : `BNK-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      accountNumber: accountNumber.trim() || 'POS-TERMINAL-01',
      IBAN: iban.trim(),
      branchId: selectedBranch,
      openingBalance: Number(openingBalance) || 0,
      active,
      notes: notes.trim(),
      createdAt: bankToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newBank);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 dir-rtl" dir="rtl">
      <div className="bg-white rounded-none max-w-md w-full border border-[#B8D3E3] shadow-2xl text-xs font-medium">
        {/* Header */}
        <div className="bg-[#E6F3FA] p-3 border-b border-[#DCE8EF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#234B67]">
                {bankToEdit ? 'تعديل بيانات الحساب البنكي' : 'إضافة حساب بنكي / شبكة جديد'}
              </h3>
              <p className="text-[10px] text-slate-500 font-normal">بطاقة تعريف البنك والحساب البنكي</p>
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
              <label className="block text-slate-700 font-bold mb-1">كود الحساب:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="BNK-101"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">الفرع المرتبط:</label>
              <input
                type="text"
                value={selectedBranch}
                disabled
                className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم البنك / جهة الدفع الإلكتروني:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              placeholder="مثال: مصرف الراجحي، حساب شبكة مدى POS"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الحساب / الجهاز:</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="SA..."
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">الرصيد الافتتاحي (ج.م):</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono font-bold text-left focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الآيبان (IBAN):</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-mono text-[11px] focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
                placeholder="SA00 0000 0000 0000 0000 0000"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">الحالة:</label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="true">نشط ومتاح للعمليات</option>
                <option value="false">معطل وموقوف</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات وبيان:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              placeholder="أي ملاحظات تخص الحساب..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {bankToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف الحساب البنكي (${bankToEdit.name})؟`)) {
                    onDelete(bankToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الحساب
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
                حفظ الحساب
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
