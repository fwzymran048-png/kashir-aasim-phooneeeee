import { SavedInvoice, Voucher, FinancialTransfer, Customer, Supplier, Treasury, Bank, SpecialAccount, User } from './storage';

export type AccountType =
  | 'customer'
  | 'supplier'
  | 'treasury'
  | 'bank'
  | 'special_debtor'
  | 'special_creditor'
  | 'employee'
  | 'user';

export type AccountLedgerType =
  | 'عميل'
  | 'مورد'
  | 'خزنة'
  | 'خزنة / درج'
  | 'بنك'
  | 'خاص مدين'
  | 'خاص دائن'
  | 'موظف'
  | 'مستخدم';

export type LedgerDatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export interface LedgerAccountTarget {
  type: AccountLedgerType;
  id: string;
  name: string;
  code?: string;
  phone?: string;
  balance?: number;
  openingBalance?: number;
  extraInfo?: string;
}

export interface StatementMovement {
  id: string;
  date: string;
  time: string;
  docNumber: string;
  refId: string;
  movementType: string;
  sourceType: 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'receipt_voucher' | 'payment_voucher' | 'transfer_in' | 'transfer_out' | 'revenue' | 'expense' | 'other';
  notes: string;
  debit: number;
  credit: number;
  runningBalance: number;
  userId?: string;
  userName?: string;
  shiftId?: string;
  branch?: string;
  originalDocument?: any;
}

export interface AccountStatementData {
  account: LedgerAccountTarget;
  dateRange: {
    preset: LedgerDatePreset;
    fromDate?: string;
    toDate?: string;
  };
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  closingBalance: number;
  totalCount: number;
  movements: StatementMovement[];
}

/**
 * Helper to compute date boundaries from a preset
 */
export function getPresetDateRange(preset: LedgerDatePreset): { fromDate: string; toDate: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { fromDate: todayStr, toDate: todayStr };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = y.toISOString().split('T')[0];
    return { fromDate: d, toDate: d };
  }
  if (preset === 'thisWeek') {
    const current = new Date(now);
    const day = current.getDay(); // 0: Sun, 6: Sat
    const diff = (day + 1) % 7; // Sat is start of week
    const start = new Date(current);
    start.setDate(current.getDate() - diff);
    return {
      fromDate: start.toISOString().split('T')[0],
      toDate: todayStr
    };
  }
  if (preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { fromDate: firstDay, toDate: lastDay };
  }
  if (preset === 'lastMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    return { fromDate: firstDay, toDate: lastDay };
  }

  return { fromDate: '', toDate: '' };
}

/**
 * Unified Account Statement Builder Engine
 */
export function buildAccountStatement(params: {
  account: LedgerAccountTarget;
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  financialTransfers?: FinancialTransfer[];
  datePreset?: LedgerDatePreset;
  fromDate?: string;
  toDate?: string;
  searchQuery?: string;
  movementTypeFilter?: string;
}): AccountStatementData {
  const {
    account,
    completedInvoices = [],
    vouchersList = [],
    financialTransfers = [],
    datePreset = 'all',
    fromDate: customFromDate,
    toDate: customToDate,
    searchQuery = '',
    movementTypeFilter = 'الكل'
  } = params;

  // Determine effective date filter
  let effectiveFromDate = '';
  let effectiveToDate = '';

  if (datePreset === 'custom') {
    effectiveFromDate = customFromDate || '';
    effectiveToDate = customToDate || '';
  } else if (datePreset !== 'all') {
    const range = getPresetDateRange(datePreset);
    effectiveFromDate = range.fromDate;
    effectiveToDate = range.toDate;
  }

  const accName = (account.name || '').trim();
  const accCode = (account.code || '').trim();
  const accPhone = (account.phone || '').trim();
  const accId = account.id || '';
  const accType = account.type;

  // Determine whether account is Debit-natured (Asset / Customer) or Credit-natured (Liability / Supplier)
  const isDebitNature =
    accType === 'عميل' ||
    accType === 'خاص مدين' ||
    accType === 'خزنة' ||
    accType === 'خزنة / درج' ||
    accType === 'بنك';

  // Extract raw movements across all transactions
  interface RawEntry {
    date: string;
    time: string;
    docNumber: string;
    refId: string;
    movementType: string;
    sourceType: StatementMovement['sourceType'];
    notes: string;
    debit: number;
    credit: number;
    userId?: string;
    userName?: string;
    shiftId?: string;
    branch?: string;
    originalDocument?: any;
  }

  const allRawEntries: RawEntry[] = [];
  const linkedTransferVoucherIds = new Set<string>();

  // 1. Map Financial Transfers to avoid double counting with vouchers
  financialTransfers.forEach(t => {
    if (t.status === 'CANCELLED') return;
    if (t.outVoucherId) linkedTransferVoucherIds.add(t.outVoucherId);
    if (t.inVoucherId) linkedTransferVoucherIds.add(t.inVoucherId);
    if (t.id) linkedTransferVoucherIds.add(t.id);
  });

  // 2. INVOICE MOVEMENTS
  if (accType === 'عميل') {
    completedInvoices.forEach(inv => {
      const matchCustomer =
        inv.customerName === accName ||
        (accPhone && inv.customerPhone && inv.customerPhone === accPhone) ||
        ((inv as any).customerId && (inv as any).customerId === accId);

      if (matchCustomer) {
        if (inv.type === 'بيع') {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'فاتورة بيع',
            sourceType: 'sale',
            notes: `فاتورة مبيعات (${inv.items.length} صنف) - ${inv.branch || ''}`,
            debit: inv.total || 0,
            credit: inv.paid || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        } else if (inv.type === 'مرتجع بيع') {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مرتجع بيع',
            sourceType: 'sale_return',
            notes: `مرتجع مبيعات ${inv.originalInvoiceNumber ? `من فاتورة #${inv.originalInvoiceNumber}` : ''} (${inv.items.length} صنف)`,
            debit: inv.paid || 0,
            credit: inv.total || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        }
      }
    });
  } else if (accType === 'مورد') {
    completedInvoices.forEach(inv => {
      const matchSupplier =
        inv.supplierId === accId ||
        inv.supplierName === accName ||
        (inv.customerName === accName && inv.type.includes('شراء'));

      if (matchSupplier) {
        if (inv.type === 'شراء') {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'فاتورة شراء',
            sourceType: 'purchase',
            notes: `فاتورة مشتريات (${inv.items.length} صنف) - ${inv.branch || ''}`,
            debit: inv.paid || 0,
            credit: inv.total || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        } else if (inv.type === 'مرتجع شراء') {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مرتجع شراء',
            sourceType: 'purchase_return',
            notes: `مرتجع مشتريات ${inv.originalInvoiceNumber ? `من فاتورة #${inv.originalInvoiceNumber}` : ''} (${inv.items.length} صنف)`,
            debit: inv.total || 0,
            credit: inv.paid || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        }
      }
    });
  } else if (accType === 'خزنة' || accType === 'خزنة / درج') {
    // Treasury cash transactions from invoices
    completedInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(pm => {
          if (pm.method === 'نقد' && pm.amount > 0) {
            const isMatch = (pm.targetName ? pm.targetName === accName : (inv.drawer === accName || (!inv.drawer && accName.includes('الرئيسي'))));
            if (isMatch) {
              if (inv.type === 'بيع') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: 'مبيعات نقدية',
                  sourceType: 'sale',
                  notes: `تحصيل نقدي فاتورة مبيعات (${inv.customerName || 'عميل نقدي'})`,
                  debit: pm.amount,
                  credit: 0,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              } else if (inv.type === 'مرتجع بيع') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: 'مرتجع بيع نقدي',
                  sourceType: 'sale_return',
                  notes: `رد نقدي مرتجع مبيعات #${inv.id}`,
                  debit: 0,
                  credit: pm.amount,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              } else if (inv.type === 'شراء') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: 'مشتريات نقدية',
                  sourceType: 'purchase',
                  notes: `سداد نقدي فاتورة مشتريات (${inv.supplierName || inv.customerName || 'مورد'})`,
                  debit: 0,
                  credit: pm.amount,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              } else if (inv.type === 'مرتجع شراء') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: 'مرتجع شراء نقدي',
                  sourceType: 'purchase_return',
                  notes: `تحصيل نقدي مرتجع مشتريات #${inv.id}`,
                  debit: pm.amount,
                  credit: 0,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              }
            }
          }
        });
      } else if (inv.drawer === accName || (!inv.drawer && accName.includes('الرئيسي'))) {
        if (inv.type === 'بيع' && (inv.paid || 0) > 0) {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مبيعات نقدية',
            sourceType: 'sale',
            notes: `تحصيل نقدي فاتورة مبيعات (${inv.customerName || 'عميل نقدي'})`,
            debit: inv.paid || 0,
            credit: 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        } else if (inv.type === 'مرتجع بيع' && (inv.paid || 0) > 0) {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مرتجع بيع نقدي',
            sourceType: 'sale_return',
            notes: `رد نقدي مرتجع مبيعات #${inv.id}`,
            debit: 0,
            credit: inv.paid || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        } else if (inv.type === 'شراء' && (inv.paid || 0) > 0) {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مشتريات نقدية',
            sourceType: 'purchase',
            notes: `سداد نقدي فاتورة مشتريات (${inv.supplierName || inv.customerName || 'مورد'})`,
            debit: 0,
            credit: inv.paid || 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        } else if (inv.type === 'مرتجع شراء' && (inv.paid || 0) > 0) {
          allRawEntries.push({
            date: inv.date,
            time: inv.time || '00:00',
            docNumber: inv.id,
            refId: inv.id,
            movementType: 'مرتجع شراء نقدي',
            sourceType: 'purchase_return',
            notes: `تحصيل نقدي مرتجع مشتريات #${inv.id}`,
            debit: inv.paid || 0,
            credit: 0,
            userId: inv.userId,
            userName: inv.createdByName,
            shiftId: inv.shiftId,
            branch: inv.branch,
            originalDocument: inv
          });
        }
      }
    });
  } else if (accType === 'بنك') {
    completedInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(pm => {
          if ((pm.method === 'شبكة / بطاقة' || pm.method === 'تحويل بنكي') && pm.amount > 0) {
            const isMatch = !pm.targetName || pm.targetName === accName || pm.targetId === accId || accName.includes(pm.targetName) || (pm.targetName && pm.targetName.includes(accName));
            if (isMatch) {
              if (inv.type === 'بيع' || inv.type === 'مرتجع شراء') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: pm.method === 'تحويل بنكي' ? 'تحويل بنكي وارد' : 'سداد شبكة / بطاقة',
                  sourceType: 'sale',
                  notes: `تحصيل إلكتروني فاتورة #${inv.id} (${inv.customerName || ''}) ${pm.reference ? `- مرجع: ${pm.reference}` : ''}`,
                  debit: pm.amount,
                  credit: 0,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              } else if (inv.type === 'شراء' || inv.type === 'مرتجع بيع') {
                allRawEntries.push({
                  date: inv.date,
                  time: inv.time || '00:00',
                  docNumber: inv.id,
                  refId: inv.id,
                  movementType: pm.method === 'تحويل بنكي' ? 'تحويل بنكي صادر' : 'سداد شبكة / بطاقة',
                  sourceType: 'purchase',
                  notes: `سداد إلكتروني فاتورة #${inv.id} (${inv.supplierName || inv.customerName || ''}) ${pm.reference ? `- مرجع: ${pm.reference}` : ''}`,
                  debit: 0,
                  credit: pm.amount,
                  userId: inv.userId,
                  userName: inv.createdByName,
                  shiftId: inv.shiftId,
                  branch: inv.branch,
                  originalDocument: inv
                });
              }
            }
          }
        });
      }
    });
  } else if (accType === 'موظف' || accType === 'مستخدم') {
    // User / Cashier operations
    completedInvoices.forEach(inv => {
      if (inv.userId === accId || inv.createdByName === accName) {
        allRawEntries.push({
          date: inv.date,
          time: inv.time || '00:00',
          docNumber: inv.id,
          refId: inv.id,
          movementType: `فاتورة ${inv.type}`,
          sourceType: inv.type.includes('بيع') ? 'sale' : 'purchase',
          notes: `إصدار فاتورة ${inv.type} (${inv.items.length} صنف) - ${inv.customerName || inv.supplierName || ''}`,
          debit: inv.total || 0,
          credit: inv.paid || 0,
          userId: inv.userId,
          userName: inv.createdByName,
          shiftId: inv.shiftId,
          branch: inv.branch,
          originalDocument: inv
        });
      }
    });
  }

  // 3. VOUCHERS MOVEMENTS
  vouchersList.forEach(v => {
    // Skip if voucher is an internal transfer that will be handled by financialTransfers
    if (linkedTransferVoucherIds.has(v.id)) return;

    if (accType === 'عميل') {
      const matchCustomer =
        v.name === accName ||
        (v.partyType === 'customer' && (v.partyId === accId || v.name === accName));

      if (matchCustomer) {
        const categoryLabel = (v.category === 'سداد نقدي' || v.category === 'سحب' || v.category === 'خصم' || v.category === 'إضافة')
          ? v.category
          : (v.type === 'قبض' ? 'سند قبض' : 'سند صرف');
        const defaultNotes = v.type === 'قبض' ? 'سداد حساب' : 'صرف حساب';
        const displayNotes = v.notes || `${categoryLabel} (${defaultNotes})${v.drawer && v.drawer !== 'تسوية غير نقدية' ? ` - ${v.drawer}` : ''}`;

        if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: categoryLabel,
            sourceType: 'receipt_voucher',
            notes: displayNotes,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: categoryLabel,
            sourceType: 'payment_voucher',
            notes: displayNotes,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'مورد') {
      const matchSupplier =
        v.name === accName ||
        (v.partyType === 'supplier' && (v.partyId === accId || v.name === accName));

      if (matchSupplier) {
        const categoryLabel = (v.category === 'سداد نقدي' || v.category === 'سحب' || v.category === 'خصم' || v.category === 'إضافة')
          ? v.category
          : (v.type === 'صرف' ? 'سند صرف' : 'سند قبض');
        const defaultNotes = v.type === 'صرف' ? 'سداد حساب مورد' : 'تحصيل من مورد';
        const displayNotes = v.notes || `${categoryLabel} (${defaultNotes})${v.drawer && v.drawer !== 'تسوية غير نقدية' ? ` - ${v.drawer}` : ''}`;

        if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: categoryLabel,
            sourceType: 'payment_voucher',
            notes: displayNotes,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: categoryLabel,
            sourceType: 'receipt_voucher',
            notes: displayNotes,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'خزنة' || accType === 'خزنة / درج') {
      if (v.drawer === accName || (!v.drawer && accName.includes('الرئيسي'))) {
        if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: v.partyType === 'revenue' ? 'إيراد تشغيلي' : 'سند قبض نقدي',
            sourceType: v.partyType === 'revenue' ? 'revenue' : 'receipt_voucher',
            notes: `${v.notes || 'مقبوضات'} - الطرف: ${v.name}`,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: v.partyType === 'expense' ? 'مصروف تشغيلي' : 'سند صرف نقدي',
            sourceType: v.partyType === 'expense' ? 'expense' : 'payment_voucher',
            notes: `${v.notes || 'مدفوعات'} - الطرف: ${v.name}`,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'بنك') {
      const matchBank =
        v.drawer === accName ||
        v.name === accName ||
        (v.notes && v.notes.includes(accName)) ||
        (accCode && v.notes && v.notes.includes(accCode));

      if (matchBank) {
        if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'إيداع بنكي / سند قبض',
            sourceType: 'receipt_voucher',
            notes: `إيداع بنكي (${v.notes || 'إيداع'}) - ${v.name}`,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'سحب بنكي / سند صرف',
            sourceType: 'payment_voucher',
            notes: `سحب بنكي (${v.notes || 'سحب'}) - ${v.name}`,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'خاص مدين') {
      const matchDebtor =
        v.name === accName ||
        (v.notes && v.notes.includes(accName)) ||
        (v.partyId && v.partyId === accId);

      if (matchDebtor) {
        if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'صرف ذمة مدينة',
            sourceType: 'payment_voucher',
            notes: `صرف مالي (${v.notes || 'صرف ذمة'}) - ${v.drawer}`,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'تحصيل ذمة مدينة',
            sourceType: 'receipt_voucher',
            notes: `تحصيل مسدد (${v.notes || 'سداد'}) - ${v.drawer}`,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'خاص دائن') {
      const matchCreditor =
        v.name === accName ||
        (v.notes && v.notes.includes(accName)) ||
        (v.partyId && v.partyId === accId);

      if (matchCreditor) {
        if (v.type === 'قبض') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'إيداع ذمة دائنة',
            sourceType: 'receipt_voucher',
            notes: `إيداع ذمة (${v.notes || 'استحقاق'}) - ${v.drawer}`,
            debit: 0,
            credit: v.amount || 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        } else if (v.type === 'صرف') {
          allRawEntries.push({
            date: v.date,
            time: '00:00',
            docNumber: v.id,
            refId: v.id,
            movementType: 'سداد ذمة دائنة',
            sourceType: 'payment_voucher',
            notes: `سداد مستحق (${v.notes || 'سداد'}) - ${v.drawer}`,
            debit: v.amount || 0,
            credit: 0,
            userId: v.userId,
            userName: v.createdByName,
            originalDocument: v
          });
        }
      }
    } else if (accType === 'موظف' || accType === 'مستخدم') {
      if (v.userId === accId || v.createdByName === accName) {
        allRawEntries.push({
          date: v.date,
          time: '00:00',
          docNumber: v.id,
          refId: v.id,
          movementType: `سند ${v.type}`,
          sourceType: v.type === 'قبض' ? 'receipt_voucher' : 'payment_voucher',
          notes: `تحرير سند ${v.type} (${v.notes || ''}) - الطرف: ${v.name}`,
          debit: v.type === 'قبض' ? v.amount || 0 : 0,
          credit: v.type === 'صرف' ? v.amount || 0 : 0,
          userId: v.userId,
          userName: v.createdByName,
          originalDocument: v
        });
      }
    }
  });

  // 4. FINANCIAL TRANSFERS MOVEMENTS (TREASURIES & BANKS)
  if (accType === 'خزنة' || accType === 'خزنة / درج' || accType === 'بنك') {
    financialTransfers.forEach(t => {
      if (t.status === 'CANCELLED') return;

      const isSource =
        t.sourceId === accId ||
        t.sourceName === accName ||
        (accCode && t.sourceName.includes(accCode));

      const isDestination =
        t.destinationId === accId ||
        t.destinationName === accName ||
        (accCode && t.destinationName.includes(accCode));

      if (isSource) {
        // Outflow from Source -> Credit
        allRawEntries.push({
          date: t.date,
          time: t.time || '00:00',
          docNumber: t.transferNumber || t.id,
          refId: t.id,
          movementType: 'تحويل مالي صادر',
          sourceType: 'transfer_out',
          notes: `تحويل مالي صادر إلى [${t.destinationName}] - ${t.notes || ''}`,
          debit: 0,
          credit: t.amount || 0,
          userId: t.userId,
          userName: t.createdByName,
          shiftId: t.shiftId,
          originalDocument: t
        });
      }

      if (isDestination) {
        // Inflow to Destination -> Debit
        allRawEntries.push({
          date: t.date,
          time: t.time || '00:00',
          docNumber: t.transferNumber || t.id,
          refId: t.id,
          movementType: 'تحويل مالي وارد',
          sourceType: 'transfer_in',
          notes: `تحويل مالي وارد من [${t.sourceName}] - ${t.notes || ''}`,
          debit: t.amount || 0,
          credit: 0,
          userId: t.userId,
          userName: t.createdByName,
          shiftId: t.shiftId,
          originalDocument: t
        });
      }
    });
  }

  // 5. CHRONOLOGICAL SORTING
  allRawEntries.sort((a, b) => {
    // Normalise date: YYYY-MM-DD or DD/MM/YYYY
    const normalizeDate = (dStr: string) => {
      if (!dStr) return '0000-00-00';
      if (dStr.includes('/')) {
        const parts = dStr.split('/');
        if (parts.length === 3) {
          // If DD/MM/YYYY
          if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          // If YYYY/MM/DD
          if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      return dStr;
    };

    const ndA = normalizeDate(a.date);
    const ndB = normalizeDate(b.date);

    if (ndA !== ndB) return ndA.localeCompare(ndB);

    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    return (a.docNumber || a.refId).localeCompare(b.docNumber || b.refId);
  });

  // 6. CALCULATE OPENING BALANCE BEFORE THE SELECTED DATE RANGE
  // We compute total historical balance from official stored balance or openingBalance property
  const currentOfficialBalance = Number(account.balance ?? account.openingBalance ?? 0);

  // Split movements into: Before Period vs In Period
  const beforePeriodMovements: RawEntry[] = [];
  const inPeriodMovements: RawEntry[] = [];

  allRawEntries.forEach(entry => {
    const d = entry.date;
    if (effectiveFromDate && d < effectiveFromDate) {
      beforePeriodMovements.push(entry);
    } else if (effectiveToDate && d > effectiveToDate) {
      // After period (will not be included in current statement period)
    } else {
      inPeriodMovements.push(entry);
    }
  });

  // Compute lifetime net movements
  let lifetimeNet = 0;
  allRawEntries.forEach(m => {
    if (isDebitNature) {
      lifetimeNet += (m.debit || 0) - (m.credit || 0);
    } else {
      lifetimeNet += (m.credit || 0) - (m.debit || 0);
    }
  });

  // Genesis opening balance of the account (before all recorded transactions)
  const genesisOpeningBalance = currentOfficialBalance - lifetimeNet;

  // Opening balance at the start of the filtered period
  let periodOpeningBalance = genesisOpeningBalance;
  beforePeriodMovements.forEach(m => {
    if (isDebitNature) {
      periodOpeningBalance += (m.debit || 0) - (m.credit || 0);
    } else {
      periodOpeningBalance += (m.credit || 0) - (m.debit || 0);
    }
  });

  // 7. APPLY SEARCH QUERY & MOVEMENT TYPE FILTERS TO IN-PERIOD MOVEMENTS
  let runningBal = periodOpeningBalance;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;

  const filteredStatementMovements: StatementMovement[] = [];

  inPeriodMovements.forEach((m, idx) => {
    // Running balance progresses chronologically
    if (isDebitNature) {
      runningBal += (m.debit || 0) - (m.credit || 0);
    } else {
      runningBal += (m.credit || 0) - (m.debit || 0);
    }

    totalPeriodDebit += m.debit || 0;
    totalPeriodCredit += m.credit || 0;

    // Search filter
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matchesSearch =
        m.docNumber.toLowerCase().includes(q) ||
        m.movementType.toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q) ||
        (m.userName && m.userName.toLowerCase().includes(q)) ||
        (m.branch && m.branch.toLowerCase().includes(q));
    }

    // Type filter
    let matchesType = true;
    if (movementTypeFilter !== 'الكل') {
      if (movementTypeFilter === 'فواتير') {
        matchesType = m.sourceType === 'sale' || m.sourceType === 'purchase';
      } else if (movementTypeFilter === 'مرتجعات') {
        matchesType = m.sourceType === 'sale_return' || m.sourceType === 'purchase_return';
      } else if (movementTypeFilter === 'سندات') {
        matchesType = m.sourceType === 'receipt_voucher' || m.sourceType === 'payment_voucher';
      } else if (movementTypeFilter === 'تحويلات') {
        matchesType = m.sourceType === 'transfer_in' || m.sourceType === 'transfer_out';
      } else if (movementTypeFilter === 'إيرادات ومصروفات') {
        matchesType = m.sourceType === 'revenue' || m.sourceType === 'expense';
      }
    }

    if (matchesSearch && matchesType) {
      filteredStatementMovements.push({
        id: `STMT-${idx + 1}-${m.refId}`,
        date: m.date,
        time: m.time || '00:00',
        docNumber: m.docNumber,
        refId: m.refId,
        movementType: m.movementType,
        sourceType: m.sourceType,
        notes: m.notes,
        debit: m.debit,
        credit: m.credit,
        runningBalance: runningBal,
        userId: m.userId,
        userName: m.userName,
        shiftId: m.shiftId,
        branch: m.branch,
        originalDocument: m.originalDocument
      });
    }
  });

  const netMovement = isDebitNature
    ? totalPeriodDebit - totalPeriodCredit
    : totalPeriodCredit - totalPeriodDebit;

  return {
    account,
    dateRange: {
      preset: datePreset,
      fromDate: effectiveFromDate,
      toDate: effectiveToDate
    },
    openingBalance: periodOpeningBalance,
    totalDebit: totalPeriodDebit,
    totalCredit: totalPeriodCredit,
    netMovement,
    closingBalance: runningBal,
    totalCount: filteredStatementMovements.length,
    movements: filteredStatementMovements
  };
}

/**
 * Generate CSV export for Account Statement
 */
export function exportStatementToCSV(statement: AccountStatementData): void {
  const rows: string[][] = [
    ['كشف حساب مالي رسمي - الأستاذ المساعد (PROJECT_Y ERP)'],
    [`اسم الحساب: ${statement.account.name}`, `النوع: ${statement.account.type}`, `الكود: ${statement.account.code || '-'}`, `الهاتف: ${statement.account.phone || '-'}`],
    [`الفترة: ${statement.dateRange.fromDate || 'البداية'} إلى ${statement.dateRange.toDate || 'الآن'}`, `الرصيد الافتتاحي: ${statement.openingBalance.toFixed(2)}`, `الرصيد الختامي: ${statement.closingBalance.toFixed(2)}`],
    [],
    ['م', 'التاريخ', 'الوقت', 'نوع الحركة', 'رقم المستند / المرجع', 'البيان والتفاصيل', 'مدين (له)', 'دائن (عليه)', 'الرصيد التراكمي', 'المستخدم', 'الوردية', 'الفرع']
  ];

  // Opening balance row
  rows.push([
    '0',
    statement.dateRange.fromDate || '-',
    '00:00',
    'رصيد افتتاحي',
    '-',
    'الرصيد الافتتاحي السابق للفترة المحددة',
    '-',
    '-',
    statement.openingBalance.toFixed(2),
    '-',
    '-',
    '-'
  ]);

  // Movements rows
  statement.movements.forEach((m, idx) => {
    rows.push([
      (idx + 1).toString(),
      m.date,
      m.time || '00:00',
      m.movementType,
      m.docNumber,
      m.notes,
      m.debit > 0 ? m.debit.toFixed(2) : '0.00',
      m.credit > 0 ? m.credit.toFixed(2) : '0.00',
      m.runningBalance.toFixed(2),
      m.userName || '-',
      m.shiftId || '-',
      m.branch || '-'
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    'الإجمالي',
    '-',
    '-',
    '-',
    '-',
    `صافي حركة الفترة: ${statement.netMovement.toFixed(2)}`,
    statement.totalDebit.toFixed(2),
    statement.totalCredit.toFixed(2),
    statement.closingBalance.toFixed(2),
    '-',
    '-',
    '-'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `كشف_حساب_${statement.account.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
