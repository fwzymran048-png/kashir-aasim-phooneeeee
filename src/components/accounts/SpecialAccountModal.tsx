import React, { useState, useEffect } from 'react';
import { SpecialAccount } from '../../services/storage';
import { Building2, X, Check, Trash2 } from 'lucide-react';

interface SpecialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: SpecialAccount) => void;
  onDelete?: (id: string) => void;
  accountToEdit?: SpecialAccount | null;
  defaultType: 'DEBTOR' | 'CREDITOR';
  existingAccounts: SpecialAccount[];
  selectedBranch: string;
}

export default function SpecialAccountModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  accountToEdit,
  defaultType,
  existingAccounts,
  selectedBranch
}: SpecialAccountModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'DEBTOR' | 'CREDITOR'>(defaultType);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setCode(accountToEdit.code);
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setOpeningBalance(accountToEdit.openingBalance || 0);
      setActive(accountToEdit.active !== false);
      setNotes(accountToEdit.notes || '');
    } else {
      setType(defaultType);
      const prefix = defaultType === 'DEBTOR' ? 'D' : 'C';
      const count = existingAccounts.filter(a => a.type === defaultType).length + 1;
      setCode(`${prefix}-${300 + count}`);
      setName('');
      setOpeningBalance(0);
      setActive(true);
      setNotes('');
    }
    setError('');
  }, [accountToEdit, defaultType, existingAccounts, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الحساب الخاص');
      return;
    }
    if (!code.trim()) {
      setError('يرجى إدخال كود الحساب');
      return;
    }

    const newAccount: SpecialAccount = {
      id: accountToEdit ? accountToEdit.id : `SPEC-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      type,
      branchId: selectedBranch,
      openingBalance: Number(openingBalance) || 0,
      active,
      notes: notes.trim(),
      createdAt: accountToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newAccount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 dir-rtl" dir="rtl">
      <div className="bg-white rounded-none max-w-md w-full border border-[#B8D3E3] shadow-2xl text-xs font-medium">
        {/* Header */}
        <div className="bg-[#E6F3FA] p-3 border-b border-[#DCE8EF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#4A90C2]/15 flex items-center justify-center text-[#234B67]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#234B67]">
                {accountToEdit ? 'تعديل الحساب الخاص' : type === 'DEBTOR' ? 'إضافة حساب خاص مدين (لنا)' : 'إضافة حساب خاص دائن (علينا)'}
              </h3>
              <p className="text-[10px] text-slate-500 font-normal">بطاقة الحسابات والعهد والأمانات الخاصة</p>
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
                placeholder={type === 'DEBTOR' ? 'D-301' : 'C-401'}
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">طبيعة الحساب:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="DEBTOR">خاص مدين (مستحق لنا / عهد وسلف وتأمينات)</option>
                <option value="CREDITOR">خاص دائن (مستحق علينا / شركاء وأمانات وقروض)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم الحساب الخاص:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              placeholder={type === 'DEBTOR' ? 'مثال: عهدة كاشير الفرع، تأمينات إيجار' : 'مثال: جاري الشركاء، أمانات صيانة'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-slate-700 font-bold mb-1">الحالة:</label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] font-bold focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              >
                <option value="true">نشط</option>
                <option value="false">موقوف</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">ملاحظات وبيان الحساب:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-[#B8D3E3] bg-[#F8FBFD] focus:outline-none focus:border-[#4A90C2] focus:bg-white text-slate-800"
              placeholder="وصف طبيعة هذا الحساب والغرض منه..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {accountToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف الحساب الخاص (${accountToEdit.name})؟`)) {
                    onDelete(accountToEdit.id);
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
