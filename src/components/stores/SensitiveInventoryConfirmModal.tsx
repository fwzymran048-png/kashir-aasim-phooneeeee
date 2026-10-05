import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';

interface SensitiveInventoryConfirmModalProps {
  isOpen: boolean;
  title?: string;
  actionDescription: string;
  itemCode?: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SensitiveInventoryConfirmModal({
  isOpen,
  title = 'تأكيد العملية الحساسة',
  actionDescription,
  itemCode,
  itemName,
  onConfirm,
  onCancel
}: SensitiveInventoryConfirmModalProps) {
  const [challengeCode, setChallengeCode] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate a fresh random 4-digit code whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const freshCode = Math.floor(1000 + Math.random() * 9000).toString();
      setChallengeCode(freshCode);
      setUserInput('');
      setErrorMsg('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    const freshCode = Math.floor(1000 + Math.random() * 9000).toString();
    setChallengeCode(freshCode);
    setUserInput('');
    setErrorMsg('');
    inputRef.current?.focus();
  };

  const handleVerifyAndConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!userInput.trim()) {
      setErrorMsg('يرجى إدخال رقم التأكيد الظاهر أمامك.');
      inputRef.current?.focus();
      return;
    }

    if (userInput.trim() !== challengeCode) {
      setErrorMsg('رقم التأكيد غير مطابق. تم رفض تنفيذ العملية لمنع الأخطاء غير المقصودة.');
      // Regenerate code on failure for security
      handleRegenerateCode();
      return;
    }

    // Success: execute approved sensitive operation
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 dir-rtl font-sans" dir="rtl">
      <div className="bg-white border border-red-300 rounded-none shadow-2xl max-w-md w-full p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Title Bar */}
        <div className="bg-red-700 text-white px-3 py-2.5 flex items-center justify-between font-bold text-xs select-none">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white" />
            <span className="text-sm tracking-wide">{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="w-5 h-5 bg-red-800 hover:bg-red-900 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            title="إلغاء (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleVerifyAndConfirm} className="p-4 space-y-3.5 text-xs text-slate-800 bg-white">
          
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-xs">تحذير أمان: عملية مخزنية حساسة</p>
              <p className="text-[11px] leading-relaxed text-red-700">
                {actionDescription}
              </p>
              {itemName && (
                <p className="font-bold text-[11px] text-[#234B67]">
                  الصنف: {itemName} {itemCode ? `[كود: ${itemCode}]` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Random Challenge Display */}
          <div className="bg-[#F8FBFD] border border-[#B8D3E3] p-3 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
              <span>الرقم المطلوب للتأكيد:</span>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="text-slate-500 hover:text-slate-800 p-0.5"
                title="توليد رقم جديد"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="inline-block px-5 py-1.5 bg-white border-2 border-dashed border-[#4A90C2] rounded-none shadow-2xs">
              <span className="font-mono font-black text-2xl tracking-widest text-[#234B67] select-all">
                {challengeCode}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              اكتب الرقم الظاهر أعلاه في الحقل أدناه للموافقة على التنفيذ:
            </p>
          </div>

          {/* Input Challenge */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 block">
              أدخل الرقم المطلوب للتأكيد:
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="____"
              className="w-full px-3 py-2 bg-[#F8FBFD] border-2 border-[#B8D3E3] focus:border-red-600 font-mono font-bold text-lg text-center tracking-widest text-slate-900 rounded-none focus:outline-none focus:bg-white"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 text-center font-bold text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-none border border-slate-300 cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-none border border-red-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              تأكيد التنفيذ
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
