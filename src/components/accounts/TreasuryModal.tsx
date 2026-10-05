import React, { useState, useEffect } from 'react';
import { Treasury } from '../../services/storage';
import { Wallet, X, Check, Trash2 } from 'lucide-react';

interface TreasuryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treasury: Treasury) => void;
  onDelete?: (id: string) => void;
  treasuryToEdit?: Treasury | null;
  existingTreasuries: Treasury[];
  selectedBranch: string;
}

export default function TreasuryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  treasuryToEdit,
  existingTreasuries,
  selectedBranch
}: TreasuryModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (treasuryToEdit) {
      setCode(treasuryToEdit.code);
      setName(treasuryToEdit.name);
      setOpeningBalance(treasuryToEdit.openingBalance || 0);
      setActive(treasuryToEdit.active !== false);
      setNotes(treasuryToEdit.notes || '');
    } else {
      const nextNum = existingTreasuries.length + 1;
      setCode(`TR-${100 + nextNum}`);
      setName('');
      setOpeningBalance(0);
      setActive(true);
      setNotes('');
    }
    setError('');
  }, [treasuryToEdit, existingTreasuries, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الخزنة أو الدرج');
      return;
    }
    if (!code.trim()) {
      setError('يرجى إدخال كود الخزنة');
      return;
    }

    const newTreasury: Treasury = {
      id: treasuryToEdit ? treasuryToEdit.id : `TREAS-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      branchId: selectedBranch,
      openingBalance: Number(openingBalance) || 0,
      active,
      notes: notes.trim(),
      createdAt: treasuryToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newTreasury);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 dir-rtl" dir="rtl">
      <div className="bg-white rounded-none max-w-md w-full border border-[#B8D3E3] shadow-2xl text-xs font-medium">
        {/* Header */}
        <div className="bg-[#E6F3FA] p-2.5 border-b border-[#DCE8EF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#4A90C2]" />
            <h3 className="font-bold text-sm text-[#234B67]">
              {treasuryToEdit ? 'تعديل بيانات الخزنة / الدرج' : 'إضافة خزنة / درج نقدية جديد'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-white">
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">كود الخزنة:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-1.5 border border-[#B8D3E3] bg-white font-mono font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] rounded-none"
                placeholder="TR-101"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">الفرع المرتبط:</label>
              <input
                type="text"
                value={selectedBranch}
                disabled
                className="w-full p-1.5 border border-slate-200 bg-[#f0f7fc] text-slate-600 font-bold rounded-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">اسم الخزنة / الدرج:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-1.5 border border-[#B8D3E3] bg-white font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] rounded-none"
              placeholder="مثال: درج كاشير 1، الخزنة الرئيسية"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">الرصيد الافتتاحي (ج.م):</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 border border-[#B8D3E3] bg-white font-mono font-bold text-left text-slate-800 focus:outline-none focus:border-[#4A90C2] rounded-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">الحالة:</label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full p-1.5 border border-[#B8D3E3] bg-white font-bold text-slate-800 focus:outline-none focus:border-[#4A90C2] rounded-none"
              >
                <option value="true">نشط ومتاح للاستخدام</option>
                <option value="false">معطل ومغلق</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">ملاحظات وبيان:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-1.5 border border-[#B8D3E3] bg-white text-slate-800 focus:outline-none focus:border-[#4A90C2] rounded-none"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {treasuryToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف الخزنة (${treasuryToEdit.name})؟`)) {
                    onDelete(treasuryToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 flex items-center gap-1 rounded-none cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الخزنة
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-none cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#4A90C2] hover:bg-[#3A759F] text-white font-bold border border-[#3A759F] flex items-center gap-1 rounded-none cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                حفظ الخزنة
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
