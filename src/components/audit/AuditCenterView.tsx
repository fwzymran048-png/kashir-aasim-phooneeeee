import React, { useState, useMemo, useEffect } from 'react';
import {
  AuditLog,
  SavedInvoice,
  Voucher,
  StockMovement,
  Shift,
  User,
  Role,
  dbGetAuditLogs
} from '../../services/storage';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Clock,
  Package,
  Layers,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Maximize2,
  Minimize2,
  Info,
  Calendar,
  Lock,
  CornerDownRight,
  TrendingDown,
  TrendingUp,
  Tag,
  Warehouse,
  Receipt
} from 'lucide-react';

export interface AuditCenterViewProps {
  completedInvoices?: SavedInvoice[];
  vouchersList?: Voucher[];
  stockMovements?: StockMovement[];
  shiftsList?: Shift[];
  usersList?: User[];
  rolesList?: Role[];
  auditLogsList?: AuditLog[];
  currentUser?: User | null;
  selectedBranch?: string;
  onRefresh?: () => void;
}

export interface UnifiedAuditEntry {
  id: string;
  timestamp: string;
  rawDate: Date;
  userId: string;
  username: string;
  userDisplayName?: string;
  action: string;
  actionLabel: string;
  module: 'المبيعات' | 'المشتريات' | 'المرتجعات' | 'المخزون' | 'الحسابات والسندات' | 'الورديات' | 'الأمان والصلاحيات' | 'النظام';
  documentType: 'فاتورة بيع' | 'فاتورة شراء' | 'مرتجع بيع' | 'مرتجع شراء' | 'سند قبض' | 'سند صرف' | 'وردية' | 'حركة مخزون' | 'أخرى';
  documentId?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  shiftId?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'BLOCKED' | 'INFO';
  amount?: number;
  // Associated full objects for rapid tracing
  linkedInvoice?: SavedInvoice;
  linkedOriginalInvoice?: SavedInvoice;
  linkedShift?: Shift;
  linkedMovement?: StockMovement;
  linkedVoucher?: Voucher;
}

export default function AuditCenterView({
  completedInvoices = [],
  vouchersList = [],
  stockMovements = [],
  shiftsList = [],
  usersList = [],
  rolesList = [],
  auditLogsList: propAuditLogsList,
  currentUser,
  selectedBranch = 'عاصم فون - الفرع الرئيسي',
  onRefresh
}: AuditCenterViewProps) {
  // Local audit logs state if loaded directly
  const [internalLogs, setInternalLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load audit logs from DB on mount
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await dbGetAuditLogs();
      setInternalLogs(logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const activeAuditLogs = propAuditLogsList || internalLogs;

  // Selected entry for Document/Shift/Inventory Trace Panel
  const [selectedEntry, setSelectedEntry] = useState<UnifiedAuditEntry | null>(null);

  // Filters State
  const todayStr = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'>('thisMonth');
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(todayStr);

  const [userFilter, setUserFilter] = useState<string>('الكل');
  const [moduleFilter, setModuleFilter] = useState<string>('الكل');
  const [actionFilter, setActionFilter] = useState<string>('الكل');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('الكل');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [shiftFilter, setShiftFilter] = useState<string>('الكل');
  const [documentIdQuery, setDocumentIdQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Preset Date Handlers
  const handlePresetChange = (preset: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'all' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const d = now.toISOString().split('T')[0];
      setFromDate(d);
      setToDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split('T')[0];
      setFromDate(d);
      setToDate(d);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (preset === 'all') {
      setFromDate('2020-01-01');
      setToDate('2030-12-31');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    handlePresetChange('thisMonth');
    setUserFilter('الكل');
    setModuleFilter('الكل');
    setActionFilter('الكل');
    setDocumentTypeFilter('الكل');
    setStatusFilter('الكل');
    setShiftFilter('الكل');
    setDocumentIdQuery('');
    setSearchQuery('');
  };

  // Helper map of users for fast name lookup
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersList) {
      map[u.id] = u.displayName || u.username;
      map[u.username] = u.displayName || u.username;
    }
    return map;
  }, [usersList]);

  // Helper map of completed invoices by ID
  const invoiceMap = useMemo(() => {
    const map: Record<string, SavedInvoice> = {};
    for (const inv of completedInvoices) {
      map[inv.id] = inv;
    }
    return map;
  }, [completedInvoices]);

  // Helper map of shifts by ID
  const shiftMap = useMemo(() => {
    const map: Record<string, Shift> = {};
    for (const s of shiftsList) {
      map[s.id] = s;
    }
    return map;
  }, [shiftsList]);

  // Unify and build full comprehensive Audit Stream
  const unifiedEntries: UnifiedAuditEntry[] = useMemo(() => {
    const entries: UnifiedAuditEntry[] = [];
    const processedDocIds = new Set<string>();

    // 1. Process explicit stored audit logs
    for (const log of activeAuditLogs) {
      let rawDate: Date;
      try {
        rawDate = new Date(log.timestamp);
        if (isNaN(rawDate.getTime())) {
          rawDate = new Date();
        }
      } catch {
        rawDate = new Date();
      }

      let module: UnifiedAuditEntry['module'] = 'النظام';
      let docType: UnifiedAuditEntry['documentType'] = 'أخرى';
      let docId: string | undefined;
      let originalInvId: string | undefined;
      let shiftId: string | undefined;
      let status: UnifiedAuditEntry['status'] = 'SUCCESS';
      let actionLabel = log.action;

      // Extract IDs from details if formatted
      const details = log.details || '';

      if (log.action === 'BLOCKED_ACTION') {
        status = 'BLOCKED';
        module = 'الأمان والصلاحيات';
        actionLabel = 'حظر عملية غير مصرحة';
      } else if (log.action === 'LOGIN') {
        module = 'الأمان والصلاحيات';
        actionLabel = 'تسجيل دخول';
      } else if (log.action === 'LOGOUT') {
        module = 'الأمان والصلاحيات';
        actionLabel = 'تسجيل خروج';
      } else if (log.action === 'USER_CREATE' || log.action === 'USER_EDIT') {
        module = 'الأمان والصلاحيات';
        actionLabel = log.action === 'USER_CREATE' ? 'إنشاء مستخدم' : 'تعديل مستخدم';
      } else if (log.action === 'ROLE_PERMISSIONS_UPDATE') {
        module = 'الأمان والصلاحيات';
        actionLabel = 'تعديل صلاحيات دور';
      } else if (log.action === 'RECEIPT_VOUCHER_CREATE') {
        module = 'الحسابات والسندات';
        docType = 'سند قبض';
        actionLabel = 'إصدار سند قبض';
      } else if (log.action === 'PAYMENT_VOUCHER_CREATE') {
        module = 'الحسابات والسندات';
        docType = 'سند صرف';
        actionLabel = 'إصدار سند صرف';
      } else if (log.action === 'INVOICE_DELETE') {
        module = 'المبيعات';
        actionLabel = 'حذف فاتورة';
        status = 'WARNING';
        const m = details.match(/INV-\d+/i);
        if (m) docId = m[0];
      }

      // Check if details reference an invoice
      const invMatch = details.match(/INV-\d+/i);
      if (invMatch && !docId) {
        docId = invMatch[0];
      }

      const linkedInv = docId ? invoiceMap[docId] : undefined;
      if (linkedInv) {
        if (linkedInv.type === 'بيع') {
          module = 'المبيعات';
          docType = 'فاتورة بيع';
        } else if (linkedInv.type === 'شراء') {
          module = 'المشتريات';
          docType = 'فاتورة شراء';
        } else if (linkedInv.type === 'مرتجع بيع') {
          module = 'المرتجعات';
          docType = 'مرتجع بيع';
          originalInvId = linkedInv.originalInvoiceId || linkedInv.originalInvoiceNumber;
        } else if (linkedInv.type === 'مرتجع شراء') {
          module = 'المرتجعات';
          docType = 'مرتجع شراء';
          originalInvId = linkedInv.originalInvoiceId || linkedInv.originalInvoiceNumber;
        }
        if (linkedInv.shiftId) shiftId = linkedInv.shiftId;
      }

      if (docId) processedDocIds.add(docId);

      entries.push({
        id: log.id,
        timestamp: log.timestamp,
        rawDate,
        userId: log.userId,
        username: log.username,
        userDisplayName: userMap[log.userId] || userMap[log.username] || log.username,
        action: log.action,
        actionLabel,
        module,
        documentType: docType,
        documentId: docId,
        originalInvoiceId: originalInvId,
        originalInvoiceNumber: originalInvId,
        shiftId,
        details,
        status,
        linkedInvoice: linkedInv,
        linkedOriginalInvoice: originalInvId ? invoiceMap[originalInvId] : undefined,
        linkedShift: shiftId ? shiftMap[shiftId] : undefined
      });
    }

    // 2. Synthesize entries for Completed Invoices if not already in explicit logs
    for (const inv of completedInvoices) {
      if (processedDocIds.has(inv.id)) continue;

      let module: UnifiedAuditEntry['module'] = 'المبيعات';
      let docType: UnifiedAuditEntry['documentType'] = 'فاتورة بيع';
      let actionLabel = 'إنشاء وحفظ فاتورة بيع';
      let status: UnifiedAuditEntry['status'] = 'SUCCESS';

      if (inv.type === 'شراء') {
        module = 'المشتريات';
        docType = 'فاتورة شراء';
        actionLabel = 'تسجيل فاتورة شراء وارد';
      } else if (inv.type === 'مرتجع بيع') {
        module = 'المرتجعات';
        docType = 'مرتجع بيع';
        actionLabel = inv.originalInvoiceId ? 'إصدار مرتجع بيع مرتبط بأصل' : 'إصدار مرتجع بيع حر';
        status = 'WARNING';
      } else if (inv.type === 'مرتجع شراء') {
        module = 'المرتجعات';
        docType = 'مرتجع شراء';
        actionLabel = inv.originalInvoiceId ? 'إصدار مرتجع شراء مرتبط بأصل' : 'إصدار مرتجع شراء حر';
        status = 'WARNING';
      }

      const origId = inv.originalInvoiceId || inv.originalInvoiceNumber;
      const linkedOrig = origId ? invoiceMap[origId] : undefined;

      let rawDate = new Date();
      try {
        if (inv.date) {
          const parts = inv.date.split(/[-/]/);
          if (parts.length === 3) {
            rawDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          }
        }
      } catch {
        rawDate = new Date();
      }

      const partyName = inv.customerName || inv.supplierName || 'نقدي';
      const itemsCount = inv.items.reduce((s, it) => s + it.quantity, 0);
      const detailsStr = `${actionLabel} بقيمة ${inv.total.toFixed(2)} ج.م (${itemsCount} قطع) - الجهة: ${partyName}${origId ? ` [أصل: ${origId}]` : ''} - الخزينة: ${inv.drawer || 'الدرج الرئيسي'}`;

      entries.push({
        id: `AUDIT-INV-${inv.id}`,
        timestamp: `${inv.date} ${inv.time || ''}`.trim(),
        rawDate,
        userId: inv.userId || 'system',
        username: inv.createdByName || 'كاشير',
        userDisplayName: inv.createdByName || userMap[inv.userId || ''] || 'كاشير',
        action: `INVOICE_${inv.type}`,
        actionLabel,
        module,
        documentType: docType,
        documentId: inv.id,
        originalInvoiceId: origId,
        originalInvoiceNumber: origId,
        shiftId: inv.shiftId,
        details: detailsStr,
        status,
        amount: inv.total,
        linkedInvoice: inv,
        linkedOriginalInvoice: linkedOrig,
        linkedShift: inv.shiftId ? shiftMap[inv.shiftId] : undefined
      });
    }

    // 3. Synthesize entries for Shifts
    for (const shift of shiftsList) {
      let rawOpenDate = new Date();
      try {
        rawOpenDate = new Date(shift.openedAt);
      } catch {
        rawOpenDate = new Date();
      }

      // Shift Open Log
      entries.push({
        id: `AUDIT-SHIFT-OPEN-${shift.id}`,
        timestamp: new Date(shift.openedAt).toLocaleString('ar-EG'),
        rawDate: rawOpenDate,
        userId: shift.userId,
        username: shift.userName,
        userDisplayName: shift.userName || userMap[shift.userId] || shift.userName,
        action: 'SHIFT_OPEN',
        actionLabel: 'فتح وردية كاشير',
        module: 'الورديات',
        documentType: 'وردية',
        documentId: shift.id,
        shiftId: shift.id,
        details: `فتح الوردية رقم [${shift.id}] بعهدة افتتاحية ${shift.openingCash.toFixed(2)} ج.م - الكاشير: ${shift.userName}`,
        status: 'INFO',
        amount: shift.openingCash,
        linkedShift: shift
      });

      // Shift Close Log (if closed)
      if (shift.closedAt) {
        let rawCloseDate = new Date();
        try {
          rawCloseDate = new Date(shift.closedAt);
        } catch {
          rawCloseDate = new Date();
        }

        const isShort = (shift.cashDifference ?? 0) < 0;
        const isOver = (shift.cashDifference ?? 0) > 0;
        const diffText = isShort
          ? `(عجز: ${Math.abs(shift.cashDifference ?? 0).toFixed(2)} ج.م)`
          : isOver
          ? `(زيادة: ${Math.abs(shift.cashDifference ?? 0).toFixed(2)} ج.م)`
          : `(مطابق 100%)`;

        entries.push({
          id: `AUDIT-SHIFT-CLOSE-${shift.id}`,
          timestamp: new Date(shift.closedAt).toLocaleString('ar-EG'),
          rawDate: rawCloseDate,
          userId: shift.userId,
          username: shift.userName,
          userDisplayName: shift.userName || userMap[shift.userId] || shift.userName,
          action: 'SHIFT_CLOSE',
          actionLabel: 'إغلاق ومطابقة الوردية (Z-Report)',
          module: 'الورديات',
          documentType: 'وردية',
          documentId: shift.id,
          shiftId: shift.id,
          details: `إغلاق الوردية رقم [${shift.id}] - المبيعات: ${(shift.totalSales || 0).toFixed(2)} ج.م - المتوقع: ${(shift.expectedCash || 0).toFixed(2)} - الفعلي: ${(shift.actualCash || 0).toFixed(2)} ${diffText}`,
          status: isShort ? 'WARNING' : 'SUCCESS',
          amount: shift.actualCash,
          linkedShift: shift
        });
      }
    }

    // 4. Synthesize entries for Stock Movements
    const movementTypeLabels: Record<string, string> = {
      SALE: 'بيع',
      PURCHASE: 'شراء',
      SALE_RETURN: 'مرتجع بيع',
      PURCHASE_RETURN: 'مرتجع شراء',
      TRANSFER_OUT: 'تحويل صادر',
      TRANSFER_IN: 'تحويل وارد',
      DAMAGE: 'بضاعة تالفة',
      ADJUSTMENT: 'تسوية جردية'
    };

    for (const mov of stockMovements) {
      let rawDate = new Date();
      try {
        rawDate = new Date(mov.date);
      } catch {
        rawDate = new Date();
      }

      let module: UnifiedAuditEntry['module'] = 'المخزون';
      const typeLabel = movementTypeLabels[mov.movementType] || mov.movementType;
      let actionLabel = `حركة مخزون: ${typeLabel}`;
      let status: UnifiedAuditEntry['status'] = 'INFO';

      if (mov.movementType === 'DAMAGE') {
        actionLabel = 'إثبات بضاعة تالفة / مفقودة';
        status = 'WARNING';
      } else if (mov.movementType === 'ADJUSTMENT') {
        actionLabel = 'تسوية جردية للمخزون';
      } else if (mov.movementType === 'TRANSFER_OUT' || mov.movementType === 'TRANSFER_IN') {
        actionLabel = 'تحويل ونقل بضاعة بين المخازن';
      }

      entries.push({
        id: `AUDIT-MOV-${mov.id}`,
        timestamp: mov.date,
        rawDate,
        userId: 'system',
        username: 'المسؤول',
        userDisplayName: 'المسؤول',
        action: `INVENTORY_${mov.movementType}`,
        actionLabel,
        module,
        documentType: 'حركة مخزون',
        documentId: mov.referenceId || mov.id,
        details: `${actionLabel} - الصنف: [${mov.productCode || ''}] ${mov.productName} - الكمية: ${mov.quantity} - المخزن: ${mov.warehouseId || selectedBranch} ${mov.notes ? `(${mov.notes})` : ''}`,
        status,
        linkedMovement: mov
      });
    }

    // Sort descending by timestamp / rawDate
    return entries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [activeAuditLogs, completedInvoices, shiftsList, stockMovements, userMap, invoiceMap, shiftMap, selectedBranch]);

  // Unique lists for filter dropdowns
  const availableUsers = useMemo(() => {
    const set = new Set<string>();
    for (const e of unifiedEntries) {
      if (e.userDisplayName) set.add(e.userDisplayName);
    }
    return Array.from(set);
  }, [unifiedEntries]);

  const availableModules = useMemo(() => {
    const set = new Set<string>();
    for (const e of unifiedEntries) {
      if (e.module) set.add(e.module);
    }
    return Array.from(set);
  }, [unifiedEntries]);

  const availableDocumentTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of unifiedEntries) {
      if (e.documentType) set.add(e.documentType);
    }
    return Array.from(set);
  }, [unifiedEntries]);

  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    for (const e of unifiedEntries) {
      if (e.shiftId) set.add(e.shiftId);
    }
    return Array.from(set);
  }, [unifiedEntries]);

  // Filtered entries based on all user filter criteria
  const filteredEntries = useMemo(() => {
    return unifiedEntries.filter(entry => {
      // Date filtering
      if (fromDate || toDate) {
        const entryDateStr = entry.rawDate.toISOString().split('T')[0];
        if (fromDate && entryDateStr < fromDate) return false;
        if (toDate && entryDateStr > toDate) return false;
      }

      // User filter
      if (userFilter !== 'الكل' && entry.userDisplayName !== userFilter && entry.username !== userFilter) {
        return false;
      }

      // Module filter
      if (moduleFilter !== 'الكل' && entry.module !== moduleFilter) {
        return false;
      }

      // Document Type filter
      if (documentTypeFilter !== 'الكل' && entry.documentType !== documentTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'الكل' && entry.status !== statusFilter) {
        return false;
      }

      // Shift filter
      if (shiftFilter !== 'الكل' && entry.shiftId !== shiftFilter) {
        return false;
      }

      // Document ID query
      if (documentIdQuery.trim()) {
        const query = documentIdQuery.trim().toLowerCase();
        const hasDoc = entry.documentId && entry.documentId.toLowerCase().includes(query);
        const hasOrig = entry.originalInvoiceId && entry.originalInvoiceId.toLowerCase().includes(query);
        const hasShift = entry.shiftId && entry.shiftId.toLowerCase().includes(query);
        if (!hasDoc && !hasOrig && !hasShift) return false;
      }

      // Search Query across text
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchDetails = entry.details.toLowerCase().includes(query);
        const matchUser = (entry.userDisplayName || entry.username).toLowerCase().includes(query);
        const matchAction = entry.actionLabel.toLowerCase().includes(query);
        const matchDoc = entry.documentId ? entry.documentId.toLowerCase().includes(query) : false;
        if (!matchDetails && !matchUser && !matchAction && !matchDoc) return false;
      }

      return true;
    });
  }, [unifiedEntries, fromDate, toDate, userFilter, moduleFilter, documentTypeFilter, statusFilter, shiftFilter, documentIdQuery, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    let salesCount = 0;
    let returnsCount = 0;
    let shiftsCount = 0;
    let inventoryCount = 0;
    let securityCount = 0;
    let blockedCount = 0;

    for (const e of filteredEntries) {
      if (e.module === 'المبيعات') salesCount++;
      if (e.module === 'المرتجعات') returnsCount++;
      if (e.module === 'الورديات') shiftsCount++;
      if (e.module === 'المخزون') inventoryCount++;
      if (e.module === 'الأمان والصلاحيات') securityCount++;
      if (e.status === 'BLOCKED') blockedCount++;
    }

    return {
      total: filteredEntries.length,
      salesCount,
      returnsCount,
      shiftsCount,
      inventoryCount,
      securityCount,
      blockedCount
    };
  }, [filteredEntries]);

  // Export to CSV using standard ERP encoding
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert('لا توجد سجلات مطابقة للتصدير.');
      return;
    }

    const headers = [
      'م',
      'التاريخ والوقت',
      'المستخدم',
      'العملية',
      'الوحدة',
      'نوع المستند',
      'رقم المستند',
      'الفاتورة الأصلية',
      'الوردية',
      'الحالة',
      'التفاصيل والوصف'
    ];

    const rows = filteredEntries.map((e, idx) => [
      (idx + 1).toString(),
      `"${e.timestamp}"`,
      `"${e.userDisplayName || e.username}"`,
      `"${e.actionLabel}"`,
      `"${e.module}"`,
      `"${e.documentType}"`,
      `"${e.documentId || '-'}"`,
      `"${e.originalInvoiceId || '-'}"`,
      `"${e.shiftId || '-'}"`,
      `"${e.status}"`,
      `"${e.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Log_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f4f7fb] overflow-hidden text-xs select-none dir-rtl font-sans" dir="rtl">
      
      {/* 1. TOP AUDIT CENTER TOOLBAR */}
      <div className="bg-[#E6F3FA] border-b border-[#DCE8EF] p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#4A90C2] text-white px-3 py-1 font-bold text-xs shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>مركز التدقيق والمراجعة والرقابة الأمنية (Audit Center)</span>
          </div>
          <span className="text-[11px] text-[#234B67] font-mono font-bold bg-white px-2.5 py-1 border border-[#B8D3E3]">
            السجلات المعروضة: {filteredEntries.length} / {unifiedEntries.length}
          </span>
          {isLoading && (
            <span className="text-[10px] text-[#4A90C2] font-bold animate-pulse">
              جاري تحديث السجلات...
            </span>
          )}
        </div>

        {/* Action Buttons: Refresh, Export, Print */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              loadLogs();
              if (onRefresh) onRefresh();
            }}
            title="تحديث فوري للسجلات من قاعدة البيانات"
            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 flex items-center gap-1 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4A90C2]" />
            تحديث
          </button>
          <button
            onClick={handleExportCSV}
            title="تصدير جدول التدقيق المفلتر إلى ملف CSV / Excel"
            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 flex items-center gap-1 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#4A90C2]" />
            تصدير إكسل
          </button>
          <button
            onClick={() => window.print()}
            title="طباعة سجل التدقيق الحالي"
            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 flex items-center gap-1 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#4A90C2]" />
            طباعة
          </button>
        </div>
      </div>

      {/* 2. COMPACT WINFORMS STATS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 p-2 bg-[#F8FBFD] border-b border-[#DCE8EF] shrink-0 text-xs">
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">إجمالي الأحداث</span>
          <span className="text-sm font-mono font-black text-[#234B67]">{stats.total}</span>
        </div>
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">حركات المبيعات</span>
          <span className="text-sm font-mono font-black text-emerald-600">{stats.salesCount}</span>
        </div>
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">حركات المرتجعات</span>
          <span className="text-sm font-mono font-black text-amber-600">{stats.returnsCount}</span>
        </div>
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">سجل الورديات</span>
          <span className="text-sm font-mono font-black text-[#4A90C2]">{stats.shiftsCount}</span>
        </div>
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">حركات المخزون</span>
          <span className="text-sm font-mono font-black text-slate-600">{stats.inventoryCount}</span>
        </div>
        <div className="bg-white p-2 border border-[#B8D3E3] shadow-2xs">
          <span className="text-[10px] text-slate-500 font-bold block">الأمان والمستخدمين</span>
          <span className="text-sm font-mono font-black text-[#234B67]">{stats.securityCount}</span>
        </div>
        <div className="bg-red-50 p-2 border border-red-200 shadow-2xs">
          <span className="text-[10px] text-red-600 font-bold block">حظر أمني</span>
          <span className="text-sm font-mono font-black text-red-700">{stats.blockedCount}</span>
        </div>
      </div>

      {/* 3. COMPACT WINFORMS FILTER PANEL */}
      <div className="bg-white border-b border-[#DCE8EF] p-2 space-y-2 shrink-0 text-xs">
        
        {/* Row 1: Date presets & Custom Date Range */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {/* Presets */}
          <div className="flex items-center gap-1 bg-[#F8FBFD] p-1 border border-[#B8D3E3]">
            <span className="text-[10px] font-bold text-slate-500 px-1">الفترة:</span>
            {[
              { key: 'today', label: 'اليوم' },
              { key: 'yesterday', label: 'أمس' },
              { key: 'thisMonth', label: 'هذا الشهر' },
              { key: 'lastMonth', label: 'الشهر السابق' },
              { key: 'all', label: 'الكل' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key as any)}
                className={`px-2 py-0.5 text-[11px] font-bold border transition-colors ${
                  datePreset === p.key ? 'bg-[#4A90C2] text-white border-[#4A90C2] shadow-2xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-[#F8FBFD] px-2 py-1 border border-[#B8D3E3]">
            <span className="font-bold text-[11px] text-slate-700">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('custom');
              }}
              className="px-1.5 py-0.5 border border-[#B8D3E3] font-mono text-[11px] bg-white focus:outline-none focus:border-[#4A90C2]"
            />
            <span className="font-bold text-[11px] text-slate-700">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('custom');
              }}
              className="px-1.5 py-0.5 border border-[#B8D3E3] font-mono text-[11px] bg-white focus:outline-none focus:border-[#4A90C2]"
            />
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClearFilters}
            className="px-3 py-1 bg-white hover:bg-red-50 text-red-600 font-bold border border-red-200 text-[11px] shadow-2xs transition-colors"
          >
            مسح الفلاتر
          </button>
        </div>

        {/* Row 2: Detailed Dropdowns and Search Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          {/* User Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-[11px] text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            >
              <option value="الكل">المستخدم: الكل</option>
              {availableUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-[11px] text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            >
              <option value="الكل">الوحدة: جميع الأقسام</option>
              <option value="المبيعات">المبيعات</option>
              <option value="المشتريات">المشتريات</option>
              <option value="المرتجعات">المرتجعات</option>
              <option value="المخزون">المخزون</option>
              <option value="الحسابات والسندات">الحسابات والسندات</option>
              <option value="الورديات">الورديات</option>
              <option value="الأمان والصلاحيات">الأمان والصلاحيات</option>
              <option value="النظام">النظام</option>
            </select>
          </div>

          {/* Document Type Filter */}
          <div>
            <select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-[11px] text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            >
              <option value="الكل">نوع المستند: الكل</option>
              <option value="فاتورة بيع">فاتورة بيع</option>
              <option value="فاتورة شراء">فاتورة شراء</option>
              <option value="مرتجع بيع">مرتجع بيع</option>
              <option value="مرتجع شراء">مرتجع شراء</option>
              <option value="سند قبض">سند قبض</option>
              <option value="سند صرف">سند صرف</option>
              <option value="وردية">وردية</option>
              <option value="حركة مخزون">حركة مخزون</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-[11px] text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            >
              <option value="الكل">الحالة: الكل</option>
              <option value="SUCCESS">ناجحة (SUCCESS)</option>
              <option value="WARNING">تنبيه / مرتجع (WARNING)</option>
              <option value="BLOCKED">حظر أمني (BLOCKED)</option>
              <option value="INFO">معلومة (INFO)</option>
            </select>
          </div>

          {/* Document Number Search */}
          <div>
            <input
              type="text"
              placeholder="رقم المستند / الفاتورة..."
              value={documentIdQuery}
              onChange={(e) => setDocumentIdQuery(e.target.value)}
              className="w-full px-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-mono text-[11px] text-slate-800 placeholder:font-sans focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            />
          </div>

          {/* General Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث في الوصف والتفاصيل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-[#F8FBFD] border border-[#B8D3E3] font-bold text-[11px] text-slate-800 focus:outline-none focus:border-[#4A90C2] focus:bg-white"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
          </div>
        </div>
      </div>

      {/* 4. MAIN SPLIT WORKSPACE: AUDIT LOGS TABLE + TRACE DETAIL PANEL */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT / CENTER: AUDIT LOG DATA TABLE */}
        <div className="flex-1 bg-white border-l border-[#DCE8EF] overflow-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-[#E6F3FA] text-[#234B67] font-bold sticky top-0 border-b border-[#DCE8EF] z-10 select-none">
              <tr>
                <th className="p-2 border-l border-[#DCE8EF] w-10 text-center">م</th>
                <th className="p-2 border-l border-[#DCE8EF] w-32 text-center">التاريخ والوقت</th>
                <th className="p-2 border-l border-[#DCE8EF] w-24 text-center">المستخدم</th>
                <th className="p-2 border-l border-[#DCE8EF] w-24 text-center">الوحدة</th>
                <th className="p-2 border-l border-[#DCE8EF] w-36 text-center">نوع العملية</th>
                <th className="p-2 border-l border-[#DCE8EF] w-28 text-center">رقم المستند</th>
                <th className="p-2 border-l border-[#DCE8EF]">تفاصيل وبيانات الحركة</th>
                <th className="p-2 border-l border-[#DCE8EF] w-20 text-center">الوردية</th>
                <th className="p-2 border-l border-[#DCE8EF] w-16 text-center">الحالة</th>
                <th className="p-2 w-16 text-center">تتبع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8EF] font-medium text-slate-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-bold">
                    لا توجد سجلات تدقيق تطابق معايير الفلترة المحددة.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`cursor-pointer transition-colors border-b border-[#DCE8EF] ${
                        isSelected
                          ? 'bg-[#DCEFFA] font-bold'
                          : entry.status === 'BLOCKED'
                          ? 'bg-red-50 hover:bg-red-100/60'
                          : entry.module === 'المرتجعات'
                          ? 'bg-amber-50/50 hover:bg-amber-100/50'
                          : idx % 2 === 1
                          ? 'bg-[#F8FBFD] hover:bg-[#E6F3FA]/70'
                          : 'bg-white hover:bg-[#E6F3FA]/70'
                      }`}
                    >
                      {/* Index */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Timestamp */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {entry.timestamp}
                      </td>

                      {/* User */}
                      <td className="p-2 border-l border-[#DCE8EF] font-bold text-[#234B67] text-center truncate max-w-[100px]">
                        {entry.userDisplayName || entry.username}
                      </td>

                      {/* Module */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-none font-bold text-[10px] border ${
                          entry.module === 'المبيعات'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : entry.module === 'المرتجعات'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : entry.module === 'المشتريات'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : entry.module === 'الورديات'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : entry.module === 'الأمان والصلاحيات'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : entry.module === 'المخزون'
                            ? 'bg-stone-50 text-stone-700 border-stone-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {entry.module}
                        </span>
                      </td>

                      {/* Action Label */}
                      <td className="p-2 border-l border-[#DCE8EF] text-right font-bold text-slate-800">
                        {entry.actionLabel}
                      </td>

                      {/* Document ID */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center font-mono font-bold text-[#4A90C2]">
                        {entry.documentId || '-'}
                        {entry.originalInvoiceId && (
                          <span className="block text-[9px] text-amber-800 bg-amber-50 px-1 border border-amber-200 mt-0.5">
                            أصل: {entry.originalInvoiceId}
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="p-2 border-l border-[#DCE8EF] text-slate-700 text-[11px] leading-relaxed">
                        {entry.details}
                      </td>

                      {/* Shift ID */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center font-mono text-[10px] text-slate-500">
                        {entry.shiftId || '-'}
                      </td>

                      {/* Status */}
                      <td className="p-2 border-l border-[#DCE8EF] text-center">
                        <span className={`inline-block px-1.5 py-0.5 font-bold text-[9px] shadow-2xs ${
                          entry.status === 'BLOCKED'
                            ? 'bg-red-600 text-white'
                            : entry.status === 'WARNING'
                            ? 'bg-amber-600 text-white'
                            : entry.status === 'SUCCESS'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-600 text-white'
                        }`}>
                          {entry.status === 'BLOCKED' ? 'محظور' : entry.status === 'WARNING' ? 'تنبيه' : entry.status === 'SUCCESS' ? 'ناجح' : 'إشعار'}
                        </span>
                      </td>

                      {/* Trace Action Button */}
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="px-2 py-0.5 bg-[#E6F3FA] hover:bg-[#d8ecf8] border border-[#B8D3E3] text-[10px] font-bold text-[#234B67] transition-colors"
                        >
                          تتبع
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT: INTEGRATED MULTI-TRACE DETAIL PANEL (تتبع المستند والوردية والمخزون) */}
        <div className="w-full lg:w-96 bg-[#F8FBFD] border-t lg:border-t-0 lg:border-r border-[#DCE8EF] flex flex-col overflow-hidden shrink-0">
          <div className="bg-[#E6F3FA] text-[#234B67] p-2.5 flex items-center justify-between border-b border-[#DCE8EF]">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Eye className="w-4 h-4 text-[#4A90C2]" />
              <span>لوحة التتبع والتدقيق التفصيلي (Trace Inspector)</span>
            </div>
            {selectedEntry && (
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-red-600 font-bold text-xs"
                title="إغلاق التتبع"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 text-xs">
            {!selectedEntry ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-10 h-10 text-slate-300" />
                <p className="font-bold text-slate-600">اختر أي سجل من جدول التدقيق لعرض التتبع الشامل للمستند، الوردية، أو المخزون المرتبط.</p>
                <p className="text-[10px] text-slate-400">يدعم النظام تتبع الفواتير الأصلية والمرتجعات، تقارير الورديات، وسجل الأمان بالكامل في وضع القراءة فقط.</p>
              </div>
            ) : (
              <>
                {/* 1. ENTRY OVERVIEW CARD */}
                <div className="bg-white p-2.5 border border-[#B8D3E3] space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-[#234B67]">{selectedEntry.actionLabel}</span>
                    <span className={`px-2 py-0.5 font-mono font-bold text-[9px] text-white shadow-2xs ${
                      selectedEntry.status === 'BLOCKED' ? 'bg-red-600' : selectedEntry.status === 'WARNING' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {selectedEntry.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">المستخدم:</span>
                      <span className="font-bold text-slate-800">{selectedEntry.userDisplayName || selectedEntry.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">التاريخ والوقت:</span>
                      <span className="font-mono text-slate-800">{selectedEntry.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">الوحدة:</span>
                      <span className="font-bold text-[#234B67]">{selectedEntry.module}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">نوع المستند:</span>
                      <span className="font-bold text-slate-800">{selectedEntry.documentType}</span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 block text-[10px] mb-1">نص التفاصيل والوصف:</span>
                    <p className="p-2 bg-[#F8FBFD] border border-slate-200 font-mono text-[10px] text-slate-800 leading-relaxed">
                      {selectedEntry.details}
                    </p>
                  </div>
                </div>

                {/* 2. DOCUMENT TRACE (تتبع الفواتير والمرتجعات) */}
                {(selectedEntry.linkedInvoice || selectedEntry.documentId?.startsWith('INV-') || selectedEntry.originalInvoiceId) && (
                  <div className="bg-white p-2.5 border border-[#B8D3E3] space-y-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[#234B67] font-bold border-b border-slate-100 pb-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#4A90C2]" />
                      <span>تتبع المستند والفاتورة (Document Trace)</span>
                    </div>

                    {selectedEntry.linkedInvoice ? (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between bg-[#E6F3FA] p-1.5 border border-[#DCE8EF]">
                          <span className="font-bold text-[#234B67]">رقم الفاتورة:</span>
                          <span className="font-mono font-bold text-[#4A90C2]">{selectedEntry.linkedInvoice.id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 bg-[#F8FBFD] p-1.5 border border-slate-200">
                          <div>
                            <span className="text-slate-500 block">النوع:</span>
                            <span className="font-bold text-[#234B67]">{selectedEntry.linkedInvoice.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">الحالة:</span>
                            <span className="font-bold text-emerald-600">{selectedEntry.linkedInvoice.status || 'مكتملة'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">العميل / المورد:</span>
                            <span className="font-bold truncate block text-slate-800">{selectedEntry.linkedInvoice.customerName || selectedEntry.linkedInvoice.supplierName || 'نقدي'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">الخزنة:</span>
                            <span className="font-bold truncate block">{selectedEntry.linkedInvoice.drawer}</span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">الإجمالي:</span>
                            <span className="font-mono font-bold text-[#243746]">{selectedEntry.linkedInvoice.total.toFixed(2)} ج.م</span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">المدفوع:</span>
                            <span className="font-mono font-bold text-[#4f9d69]">{selectedEntry.linkedInvoice.paid.toFixed(2)} ج.م</span>
                          </div>
                        </div>

                        {/* Items in Invoice */}
                        <div>
                          <span className="font-bold text-[#243746] block mb-0.5 text-[10px]">
                            أصناف الفاتورة ({selectedEntry.linkedInvoice.items.length} صنف):
                          </span>
                          <div className="max-h-28 overflow-y-auto border border-[#afafaf] bg-white">
                            <table className="w-full text-right text-[10px]">
                              <thead className="bg-[#e8e8e8] font-bold sticky top-0">
                                <tr>
                                  <th className="p-1 border-l border-[#afafaf]">الصنف</th>
                                  <th className="p-1 border-l border-[#afafaf] text-center">الكمية</th>
                                  <th className="p-1 border-l border-[#afafaf] text-center">السعر</th>
                                  <th className="p-1 text-center">الإجمالي</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e0e0e0]">
                                {selectedEntry.linkedInvoice.items.map((it, itIdx) => (
                                  <tr key={itIdx}>
                                    <td className="p-1 border-l border-[#e0e0e0] font-bold">{it.name}</td>
                                    <td className="p-1 border-l border-[#e0e0e0] text-center font-mono">{it.quantity}</td>
                                    <td className="p-1 border-l border-[#e0e0e0] text-center font-mono">{it.price}</td>
                                    <td className="p-1 text-center font-mono font-bold">{it.total}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#666666]">المستند مسجل برقم {selectedEntry.documentId}</p>
                    )}

                    {/* Linked Original Invoice (For Returns) */}
                    {(selectedEntry.originalInvoiceId || selectedEntry.linkedInvoice?.originalInvoiceId) && (
                      <div className="bg-[#fff8e7] p-2 border border-[#e2c486] space-y-1 mt-1">
                        <div className="flex items-center gap-1 text-[#8a5d14] font-bold text-[11px]">
                          <CornerDownRight className="w-3 h-3 text-[#8a5d14]" />
                          <span>الفاتورة الأصلية المرتبطة بهذا المرتجع:</span>
                        </div>
                        <div className="flex justify-between font-mono font-bold text-[#8a5d14] text-xs">
                          <span>رقم الأصل:</span>
                          <span>{selectedEntry.originalInvoiceId || selectedEntry.linkedInvoice?.originalInvoiceId}</span>
                        </div>

                        {selectedEntry.linkedOriginalInvoice && (
                          <div className="text-[10px] text-[#8a5d14] space-y-0.5 pt-1 border-t border-[#e2c486]">
                            <div className="flex justify-between">
                              <span>تاريخ الأصل:</span>
                              <span className="font-mono">{selectedEntry.linkedOriginalInvoice.date}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>إجمالي الأصل:</span>
                              <span className="font-mono font-bold">{selectedEntry.linkedOriginalInvoice.total.toFixed(2)} ج.م</span>
                            </div>
                            <div className="flex justify-between">
                              <span>العميل / المورد:</span>
                              <span>{selectedEntry.linkedOriginalInvoice.customerName || selectedEntry.linkedOriginalInvoice.supplierName}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SHIFT TRACE (تتبع الوردية) */}
                {(selectedEntry.linkedShift || selectedEntry.shiftId) && (
                  <div className="bg-white p-2 border border-[#afafaf] space-y-1.5">
                    <div className="flex items-center gap-1 text-[#0277BD] font-bold border-b border-[#afafaf] pb-1">
                      <Clock className="w-3.5 h-3.5 text-[#0277BD]" />
                      <span>تتبع الوردية المرتبطة (Shift Trace)</span>
                    </div>

                    {selectedEntry.linkedShift ? (
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between bg-[#f0f0f0] p-1 border border-[#afafaf]">
                          <span className="font-bold">كود الوردية:</span>
                          <span className="font-mono font-bold text-[#0277BD]">{selectedEntry.linkedShift.id}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 bg-[#f9f9f9] p-1 border border-[#e0e0e0]">
                          <div>
                            <span className="text-[#666666] block">الكاشير:</span>
                            <span className="font-bold">{selectedEntry.linkedShift.userName}</span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">الحالة:</span>
                            <span className="font-bold text-[#4f9d69]">
                              {selectedEntry.linkedShift.status === 'OPEN' ? 'مفتوحة الآن' : 'مغلقة'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">الافتتاحي:</span>
                            <span className="font-mono">{selectedEntry.linkedShift.openingCash.toFixed(2)} ج.م</span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">المبيعات:</span>
                            <span className="font-mono text-[#4f9d69] font-bold">
                              {(selectedEntry.linkedShift.totalSales || 0).toFixed(2)} ج.م
                            </span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">المتوقع:</span>
                            <span className="font-mono font-bold">{(selectedEntry.linkedShift.expectedCash || 0).toFixed(2)} ج.م</span>
                          </div>
                          <div>
                            <span className="text-[#666666] block">الفعلي:</span>
                            <span className="font-mono font-bold text-[#0277BD]">{(selectedEntry.linkedShift.actualCash || 0).toFixed(2)} ج.م</span>
                          </div>
                        </div>

                        {selectedEntry.linkedShift.cashDifference !== undefined && selectedEntry.linkedShift.cashDifference !== 0 && (
                          <div className={`p-1 border text-center font-bold text-xs ${
                            selectedEntry.linkedShift.cashDifference < 0
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-green-50 text-green-700 border-green-300'
                          }`}>
                            الفارق: {selectedEntry.linkedShift.cashDifference.toFixed(2)} ج.م
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#666666]">مرتبط بوردية كود: {selectedEntry.shiftId}</p>
                    )}
                  </div>
                )}

                {/* 4. INVENTORY TRACE (تتبع حركة المخزون) */}
                {selectedEntry.linkedMovement && (
                  <div className="bg-white p-2 border border-[#afafaf] space-y-1.5">
                    <div className="flex items-center gap-1 text-[#4e342e] font-bold border-b border-[#afafaf] pb-1">
                      <Warehouse className="w-3.5 h-3.5 text-[#4e342e]" />
                      <span>تتبع حركة المخزون (Inventory Trace)</span>
                    </div>

                    <div className="space-y-1 text-[11px] bg-[#f9f9f9] p-1 border border-[#e0e0e0]">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">الصنف:</span>
                        <span className="font-bold text-[#222222]">{selectedEntry.linkedMovement.productName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">الكود:</span>
                        <span className="font-mono font-bold">{selectedEntry.linkedMovement.productCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">نوع الحركة:</span>
                        <span className="font-bold text-[#4f9d69]">{selectedEntry.linkedMovement.movementType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">الكمية:</span>
                        <span className="font-mono font-bold text-base text-[#243746]">{selectedEntry.linkedMovement.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">المخزن:</span>
                        <span>{selectedEntry.linkedMovement.warehouseId || selectedBranch}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
