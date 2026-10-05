import React, { useState, useMemo } from 'react';
import {
  SavedInvoice,
  Voucher,
  StockMovement,
  Customer,
  Supplier,
  User,
  Shift,
  InventoryItem,
  Treasury
} from '../../services/storage';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Truck,
  Wallet,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart2,
  FileText,
  Percent,
  CheckCircle2,
  Layers,
  RotateCcw,
  ArrowRightLeft,
  ChevronLeft,
  Calendar,
  ShieldAlert,
  Zap,
  Award,
  Tag,
  Activity,
  Flame,
  HelpCircle,
  Eye,
  Sliders,
  AlertCircle,
  ShoppingCart,
  Timer,
  Archive,
  UserX,
  CreditCard
} from 'lucide-react';

interface ManagementDashboardProps {
  completedInvoices: SavedInvoice[];
  vouchersList: Voucher[];
  stockMovements: StockMovement[];
  customersList: Customer[];
  suppliersList: Supplier[];
  inventoryDb?: InventoryItem[];
  treasuriesList?: Treasury[];
  shiftsList?: Shift[];
  activeShift?: Shift | null;
  selectedBranch: string;
  usersList?: User[];
  onOpenShiftModal?: () => void;
}

export default function ManagementDashboard({
  completedInvoices,
  vouchersList,
  stockMovements,
  customersList,
  suppliersList,
  inventoryDb = [],
  treasuriesList = [],
  shiftsList = [],
  activeShift,
  selectedBranch,
  usersList = [],
  onOpenShiftModal
}: ManagementDashboardProps) {
  // Preset date filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom'>('today');

  // Custom date range state
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // Filter state
  const [branchFilter, setBranchFilter] = useState<string>('الكل');
  const [userFilter, setUserFilter] = useState<string>('الكل');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Intelligence Sub-Tab State
  const [intelligenceTab, setIntelligenceTab] = useState<
    | 'priorities'
    | 'consumption'
    | 'profitability'
    | 'deadStock'
    | 'discounts'
    | 'customerIntelligence'
    | 'bestSellers'
    | 'alerts'
    | 'categories'
    | 'expiry'
  >('priorities');
  const [bestSellerSort, setBestSellerSort] = useState<'qty' | 'revenue'>('qty');
  const [consumptionSort, setConsumptionSort] = useState<'daily' | 'coverage' | 'upcoming'>('daily');
  const [customerSort, setCustomerSort] = useState<'purchases' | 'profit' | 'debt' | 'inactivity'>('purchases');

  // Apply Date Preset logic
  const handlePresetChange = (preset: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom') => {
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
    } else if (preset === 'thisWeek') {
      const current = new Date(now);
      const day = current.getDay(); // 0 is Sunday, 6 is Saturday
      // Start of week in Middle East is Saturday (day === 6 ? 0 days back : day + 1 days back)
      const diff = (day + 1) % 7;
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - diff);
      setFromDate(startOfWeek.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
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
    }
  };

  // Filter Invoices by date, branch, user
  const filteredInvoices = useMemo(() => {
    return completedInvoices.filter(inv => {
      // Date range filter
      if (fromDate && inv.date < fromDate) return false;
      if (toDate && inv.date > toDate) return false;

      // Branch filter
      if (branchFilter !== 'الكل' && inv.branch !== branchFilter) return false;

      // User filter
      if (userFilter !== 'الكل') {
        const matchesUserId = inv.userId === userFilter;
        const matchesCreatedName = inv.createdByName === userFilter;
        if (!matchesUserId && !matchesCreatedName) return false;
      }

      return true;
    });
  }, [completedInvoices, fromDate, toDate, branchFilter, userFilter, refreshKey]);

  // Filter Vouchers by date, branch, user
  const filteredVouchers = useMemo(() => {
    return vouchersList.filter(v => {
      if (fromDate && v.date < fromDate) return false;
      if (toDate && v.date > toDate) return false;
      if (userFilter !== 'الكل') {
        if (v.userId !== userFilter && v.createdByName !== userFilter) return false;
      }
      return true;
    });
  }, [vouchersList, fromDate, toDate, userFilter, refreshKey]);

  // Filter Stock Movements by date
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      if (fromDate && m.date < fromDate) return false;
      if (toDate && m.date > toDate) return false;
      return true;
    });
  }, [stockMovements, fromDate, toDate, refreshKey]);

  // ==========================
  // FINANCIAL & SALES METRICS
  // ==========================
  const salesMetrics = useMemo(() => {
    let grossSales = 0;
    let cashSales = 0;
    let creditSales = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let salesCount = 0;

    let totalPurchases = 0;
    let cashPurchases = 0;
    let creditPurchases = 0;
    let purchasesCount = 0;

    let salesReturns = 0;
    let salesReturnsCount = 0;

    let purchaseReturns = 0;
    let purchaseReturnsCount = 0;

    filteredInvoices.forEach(inv => {
      if (inv.type === 'بيع') {
        grossSales += inv.total;
        cashSales += (inv.paid || 0);
        creditSales += (inv.remaining || 0);
        totalTax += (inv.tax || 0);
        totalDiscount += (inv.discount || 0);
        salesCount += 1;
      } else if (inv.type === 'شراء') {
        totalPurchases += inv.total;
        cashPurchases += (inv.paid || 0);
        creditPurchases += (inv.remaining || 0);
        purchasesCount += 1;
      } else if (inv.type === 'مرتجع بيع') {
        salesReturns += inv.total;
        salesReturnsCount += 1;
      } else if (inv.type === 'مرتجع شراء') {
        purchaseReturns += inv.total;
        purchaseReturnsCount += 1;
      }
    });

    const netSales = grossSales - salesReturns;
    const avgTicket = salesCount > 0 ? (grossSales / salesCount) : 0;

    // Strict Historical COGS Calculation from Invoice Items
    let totalSalesCost = 0;
    let knownSalesProfit = 0;
    let hasMissingCost = false;

    filteredInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        let invCost = 0;
        let isInvCostFullyKnown = inv.items.length > 0;

        inv.items.forEach(item => {
          if (item.costPrice !== undefined) {
            invCost += (item.quantity * item.costPrice);
          } else {
            isInvCostFullyKnown = false;
            hasMissingCost = true;
          }
        });

        totalSalesCost += invCost;
        if (isInvCostFullyKnown) {
          knownSalesProfit += (inv.total - invCost);
        }
      });

    const grossProfit = hasMissingCost
      ? (knownSalesProfit > 0 ? knownSalesProfit : null)
      : (netSales - totalSalesCost);

    const profitMargin = (grossProfit !== null && netSales > 0)
      ? (grossProfit / netSales) * 100
      : null;

    return {
      grossSales,
      cashSales,
      creditSales,
      totalTax,
      totalDiscount,
      salesCount,
      totalPurchases,
      cashPurchases,
      creditPurchases,
      purchasesCount,
      salesReturns,
      salesReturnsCount,
      purchaseReturns,
      purchaseReturnsCount,
      netSales,
      avgTicket,
      totalSalesCost,
      grossProfit,
      profitMargin,
      hasMissingCost
    };
  }, [filteredInvoices]);

  // ==========================
  // VOUCHER & TREASURY METRICS
  // ==========================
  const treasuryMetrics = useMemo(() => {
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalOperatingExpenses = 0;
    let totalOperatingRevenues = 0;

    filteredVouchers.forEach(v => {
      const isInternalTransfer =
        v.category === 'تحويل مالي داخلي' ||
        v.id?.startsWith('VCH-TRF-') ||
        v.notes?.includes('تحويل مالي') ||
        v.partyType === 'other';

      if (v.type === 'قبض') {
        totalCashIn += v.amount;
        if (!isInternalTransfer && (v.partyType === 'revenue' || (v.partyType === 'general' && v.category) || (v.category && v.partyType !== 'customer' && v.partyType !== 'supplier'))) {
          totalOperatingRevenues += v.amount;
        }
      } else if (v.type === 'صرف') {
        totalCashOut += v.amount;
        if (!isInternalTransfer && (v.partyType === 'expense' || v.partyType === 'general' || (v.category && v.partyType !== 'supplier' && v.partyType !== 'customer') || v.notes?.includes('مصروف'))) {
          totalOperatingExpenses += v.amount;
        }
      }
    });

    const netVoucherFlow = totalCashIn - totalCashOut;

    // Total Treasury Opening Balances
    const totalTreasuriesBalance = treasuriesList.reduce((acc, t) => acc + (t.openingBalance || 0), 0);

    return {
      totalCashIn,
      totalCashOut,
      totalExpenses: totalOperatingExpenses,
      totalOperatingExpenses,
      totalOperatingRevenues,
      netVoucherFlow,
      totalTreasuriesBalance
    };
  }, [filteredVouchers, treasuriesList]);

  // ==========================
  // INVENTORY METRICS
  // ==========================
  const inventoryMetrics = useMemo(() => {
    const totalItemsCount = inventoryDb.length;
    let totalQuantity = 0;
    let totalStockCost = 0;
    let totalStockSaleValue = 0;
    let lowStockCount = 0;
    const lowStockItems: InventoryItem[] = [];

    inventoryDb.forEach(item => {
      const stock = item.stock || 0;
      const cost = item.costPrice || 0;
      const price = item.price || 0;
      const min = item.minStock !== undefined ? item.minStock : 5;

      totalQuantity += stock;
      totalStockCost += (stock * cost);
      totalStockSaleValue += (stock * price);

      if (stock <= min) {
        lowStockCount += 1;
        lowStockItems.push(item);
      }
    });

    // Check products sold in this period vs products with zero movement
    const soldCodesSet = new Set<string>();
    filteredInvoices.forEach(inv => {
      inv.items.forEach(i => {
        if (i.code) soldCodesSet.add(i.code);
        if (i.name) soldCodesSet.add(i.name);
      });
    });

    const stagnantProductsCount = inventoryDb.filter(
      item => !soldCodesSet.has(item.code) && !soldCodesSet.has(item.name)
    ).length;

    return {
      totalItemsCount,
      totalQuantity,
      totalStockCost,
      totalStockSaleValue,
      lowStockCount,
      lowStockItems: lowStockItems.slice(0, 5),
      stagnantProductsCount
    };
  }, [inventoryDb, filteredInvoices]);

  // ========================================================
  // A — PERIOD DAYS COMPUTATION
  // ========================================================
  const daysInPeriod = useMemo(() => {
    if (!fromDate || !toDate) return 1;
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime();
    const diffDays = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [fromDate, toDate]);

  // ========================================================
  // SMART PRODUCT & PRICING & PROFITABILITY INTELLIGENCE
  // ========================================================
  const productIntelligence = useMemo(() => {
    const map = new Map<string, {
      code: string;
      name: string;
      category: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
      hasMissingCost: boolean;
      profitMargin: number;
      currentStock: number;
      minStock: number;
      avgDailySales: number;
      avgWeeklySales: number;
      avgMonthlySales: number;
      daysCoverage: number | null;
      coverageStatus: 'sufficient' | 'low' | 'critical' | 'noSalesData';
      daysUntilReorder: number | null;
      isUpcomingLowStock: boolean;
      targetStock: number;
      overstockUnits: number;
      healthScore: 'HEALTHY' | 'NEEDS_ATTENTION' | 'REORDER_SOON' | 'CRITICAL' | 'DEAD_STOCK' | 'OVERSTOCK';
    }>();

    // Map all inventory items first so all items get evaluated
    inventoryDb.forEach(item => {
      const key = item.code || item.name;
      const currentStock = item.stock ?? 50;
      const minStock = item.minStock ?? 5;
      const targetStock = minStock * 2;

      map.set(key, {
        code: item.code || '-',
        name: item.name,
        category: item.category || 'عام',
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        hasMissingCost: item.costPrice === undefined,
        profitMargin: 0,
        currentStock,
        minStock,
        avgDailySales: 0,
        avgWeeklySales: 0,
        avgMonthlySales: 0,
        daysCoverage: null,
        coverageStatus: 'noSalesData',
        daysUntilReorder: null,
        isUpcomingLowStock: false,
        targetStock,
        overstockUnits: 0,
        healthScore: 'DEAD_STOCK'
      });
    });

    // Aggregate sales and sales returns from filtered invoices
    filteredInvoices.forEach(inv => {
      const isSale = inv.type === 'بيع';
      const isReturn = inv.type === 'مرتجع بيع' || inv.type === 'مرتجع';
      if (!isSale && !isReturn) return;

      const sign = isSale ? 1 : -1;

      inv.items.forEach(item => {
        const key = item.code || item.name;
        const rev = (item.total || (item.quantity * item.price)) * sign;
        const qty = item.quantity * sign;
        const isCostKnown = item.costPrice !== undefined;
        const cost = isCostKnown ? (item.quantity * item.costPrice!) * sign : 0;
        const profit = isCostKnown ? rev - cost : 0;

        if (map.has(key)) {
          const rec = map.get(key)!;
          rec.quantity += qty;
          rec.revenue += rev;
          if (isCostKnown) {
            rec.cost += cost;
            rec.profit += profit;
          } else {
            rec.hasMissingCost = true;
          }
        } else {
          const dbItem = inventoryDb.find(db => db.code === item.code || db.name.trim().toLowerCase() === item.name.trim().toLowerCase());
          const currentStock = dbItem ? (dbItem.stock ?? 50) : 0;
          const minStock = dbItem ? (dbItem.minStock ?? 5) : 5;
          const targetStock = minStock * 2;

          map.set(key, {
            code: item.code || '-',
            name: item.name,
            category: item.category || dbItem?.category || 'عام',
            quantity: qty,
            revenue: rev,
            cost: isCostKnown ? cost : 0,
            profit: isCostKnown ? profit : 0,
            hasMissingCost: !isCostKnown,
            profitMargin: 0,
            currentStock,
            minStock,
            avgDailySales: 0,
            avgWeeklySales: 0,
            avgMonthlySales: 0,
            daysCoverage: null,
            coverageStatus: 'noSalesData',
            daysUntilReorder: null,
            isUpcomingLowStock: false,
            targetStock,
            overstockUnits: 0,
            healthScore: 'HEALTHY'
          });
        }
      });
    });

    // Compute consumption rates, coverage, predictions, and health scores
    const list = Array.from(map.values()).map(p => {
      const netQty = Math.max(0, p.quantity);
      const avgDailySales = netQty > 0 ? netQty / daysInPeriod : 0;
      const avgWeeklySales = avgDailySales * 7;
      const avgMonthlySales = avgDailySales * 30;

      let daysCoverage: number | null = null;
      let coverageStatus: 'sufficient' | 'low' | 'critical' | 'noSalesData' = 'noSalesData';

      if (avgDailySales > 0) {
        daysCoverage = p.currentStock / avgDailySales;
        if (p.currentStock <= 0 || daysCoverage < 3) {
          coverageStatus = 'critical';
        } else if (daysCoverage <= 14) {
          coverageStatus = 'low';
        } else {
          coverageStatus = 'sufficient';
        }
      } else {
        if (p.currentStock <= 0) {
          coverageStatus = 'critical';
        } else {
          coverageStatus = 'noSalesData';
        }
      }

      // Upcoming low stock prediction
      let daysUntilReorder: number | null = null;
      let isUpcomingLowStock = false;

      if (p.currentStock > p.minStock && avgDailySales > 0) {
        daysUntilReorder = (p.currentStock - p.minStock) / avgDailySales;
        if (daysUntilReorder <= 7) {
          isUpcomingLowStock = true;
        }
      }

      // Overstock evaluation
      const isOverstockCandidate = (p.currentStock >= p.minStock * 4 && p.currentStock >= 30) || (daysCoverage !== null && daysCoverage > 60);
      const overstockUnits = isOverstockCandidate ? Math.max(0, p.currentStock - p.targetStock) : 0;

      // Smart Stock Health Score
      let healthScore: 'HEALTHY' | 'NEEDS_ATTENTION' | 'REORDER_SOON' | 'CRITICAL' | 'DEAD_STOCK' | 'OVERSTOCK' = 'HEALTHY';
      if (p.currentStock <= 0 || p.currentStock <= p.minStock || (daysCoverage !== null && daysCoverage < 3)) {
        healthScore = 'CRITICAL';
      } else if (isUpcomingLowStock) {
        healthScore = 'REORDER_SOON';
      } else if (netQty === 0 && p.currentStock > 0) {
        healthScore = 'DEAD_STOCK';
      } else if (netQty > 0 && netQty <= 2 && p.currentStock > 0) {
        healthScore = 'NEEDS_ATTENTION';
      } else if (overstockUnits > 0) {
        healthScore = 'OVERSTOCK';
      } else {
        healthScore = 'HEALTHY';
      }

      return {
        ...p,
        quantity: netQty,
        avgDailySales,
        avgWeeklySales,
        avgMonthlySales,
        daysCoverage,
        coverageStatus,
        daysUntilReorder,
        isUpcomingLowStock,
        overstockUnits,
        healthScore,
        profitMargin: (!p.hasMissingCost && p.revenue > 0) ? (p.profit / p.revenue) * 100 : 0
      };
    });

    const bestByQty = [...list].filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity);
    const bestByRevenue = [...list].filter(p => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const mostProfitable = [...list].filter(p => p.revenue > 0).sort((a, b) => {
      if (a.hasMissingCost && !b.hasMissingCost) return 1;
      if (!a.hasMissingCost && b.hasMissingCost) return -1;
      return b.profit - a.profit;
    });

    // Sales vs Profit Intelligence:
    // High Sales / Low Profit: in top 40% of sales volume but profit margin < 15%
    const itemsWithSales = list.filter(p => p.quantity > 0 && !p.hasMissingCost && p.revenue > 0);
    const highSalesLowProfit = itemsWithSales
      .filter(p => p.profitMargin < 15)
      .sort((a, b) => b.quantity - a.quantity);

    // Low Sales / High Profit: modest quantity but profit margin > 35%
    const lowSalesHighProfit = itemsWithSales
      .filter(p => p.profitMargin >= 35)
      .sort((a, b) => b.profitMargin - a.profitMargin);

    return {
      all: list,
      bestByQty,
      bestByRevenue,
      mostProfitable,
      highSalesLowProfit,
      lowSalesHighProfit
    };
  }, [filteredInvoices, inventoryDb, daysInPeriod]);

  // Backward compatibility alias for any existing reference
  const topProducts = useMemo(() => productIntelligence.bestByQty.slice(0, 10), [productIntelligence]);

  // ========================================================
  // DEAD & SLOW MOVING STOCK & STOCK AGING INTELLIGENCE
  // ========================================================
  const deadAndSlowStockIntelligence = useMemo(() => {
    const soldQtyMap = new Map<string, number>();
    const soldRevenueMap = new Map<string, number>();

    filteredInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        inv.items.forEach(item => {
          const key = item.code || item.name;
          soldQtyMap.set(key, (soldQtyMap.get(key) || 0) + item.quantity);
          soldRevenueMap.set(key, (soldRevenueMap.get(key) || 0) + (item.total || (item.quantity * item.price)));
        });
      });

    // Calculate stock aging per item from all completed invoices
    const lastSoldDateMap = new Map<string, string>();
    completedInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        inv.items.forEach(it => {
          const key = it.code || it.name;
          if (!lastSoldDateMap.has(key) || inv.date > lastSoldDateMap.get(key)!) {
            lastSoldDateMap.set(key, inv.date);
          }
        });
      });

    const today = new Date();

    const deadItems: {
      item: InventoryItem;
      stock: number;
      costPrice: number | null;
      deadStockValue: number;
      daysSinceLastSale: number | null;
      lastSoldDate: string | null;
    }[] = [];

    const slowItems: {
      item: InventoryItem;
      stock: number;
      costPrice: number | null;
      soldQty: number;
      soldRevenue: number;
      daysSinceLastSale: number | null;
      lastSoldDate: string | null;
    }[] = [];

    let totalDeadStockValue = 0;

    inventoryDb.forEach(item => {
      const key = item.code || item.name;
      const soldQty = soldQtyMap.get(key) || 0;
      const soldRev = soldRevenueMap.get(key) || 0;
      const stock = item.stock ?? 50;
      const costP = item.costPrice !== undefined ? item.costPrice : null;
      const lastDate = lastSoldDateMap.get(key) || null;
      let daysSince: number | null = null;

      if (lastDate) {
        const diffMs = today.getTime() - new Date(lastDate).getTime();
        daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      if (soldQty === 0 && stock > 0) {
        const val = costP !== null ? stock * costP : stock * (item.price * 0.7);
        totalDeadStockValue += val;
        deadItems.push({
          item,
          stock,
          costPrice: costP,
          deadStockValue: val,
          daysSinceLastSale: daysSince,
          lastSoldDate: lastDate
        });
      } else if (soldQty > 0 && soldQty <= 2 && stock > 0) {
        slowItems.push({
          item,
          stock,
          costPrice: costP,
          soldQty,
          soldRevenue: soldRev,
          daysSinceLastSale: daysSince,
          lastSoldDate: lastDate
        });
      }
    });

    return {
      deadItems: deadItems.sort((a, b) => b.deadStockValue - a.deadStockValue),
      slowItems: slowItems.sort((a, b) => a.soldQty - b.soldQty),
      totalDeadStockValue,
      deadCount: deadItems.length,
      slowCount: slowItems.length
    };
  }, [filteredInvoices, completedInvoices, inventoryDb]);

  // ========================================================
  // SMART STOCK ALERTS & REORDER POINT INTELLIGENCE
  // ========================================================
  const smartStockAlerts = useMemo(() => {
    const outOfStockItems: InventoryItem[] = [];
    const lowStockItems: { item: InventoryItem; suggestedReorder: number; targetStock: number }[] = [];
    const overstockItems: InventoryItem[] = [];

    inventoryDb.forEach(item => {
      const stock = item.stock ?? 50;
      const min = item.minStock !== undefined ? item.minStock : 5;
      const targetStock = min * 2;
      const suggested = Math.max(0, targetStock - stock);

      if (stock <= 0) {
        outOfStockItems.push(item);
      } else if (stock <= min) {
        lowStockItems.push({ item, suggestedReorder: suggested, targetStock });
      } else if (stock >= min * 4 && stock >= 30) {
        overstockItems.push(item);
      }
    });

    return {
      outOfStockItems,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      lowStockCount: lowStockItems.length,
      overstockItems,
      overstockCount: overstockItems.length,
      deadStockCount: deadAndSlowStockIntelligence.deadCount,
      slowStockCount: deadAndSlowStockIntelligence.slowCount
    };
  }, [inventoryDb, deadAndSlowStockIntelligence]);

  // ========================================================
  // CATEGORY INTELLIGENCE (SALES, REVENUE, PROFIT, HEALTH)
  // ========================================================
  const categoryIntelligence = useMemo(() => {
    const catMap = new Map<string, {
      category: string;
      itemCount: number;
      totalSoldQty: number;
      grossRevenue: number;
      totalDiscounts: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      hasMissingCost: boolean;
      lowStockCount: number;
      deadStockCount: number;
    }>();

    // Initialize with all unique categories in inventoryDb
    inventoryDb.forEach(item => {
      const cat = item.category || 'عام';
      const stock = item.stock ?? 50;
      const min = item.minStock ?? 5;
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          category: cat,
          itemCount: 0,
          totalSoldQty: 0,
          grossRevenue: 0,
          totalDiscounts: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          hasMissingCost: false,
          lowStockCount: 0,
          deadStockCount: 0
        });
      }
      const rec = catMap.get(cat)!;
      rec.itemCount += 1;
      if (stock <= min) rec.lowStockCount += 1;
    });

    // Aggregate sales in period
    filteredInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        const invGross = inv.items.reduce((s, x) => s + (x.total || (x.quantity * x.price)), 0);
        inv.items.forEach(it => {
          const dbItem = inventoryDb.find(db => db.code === it.code || db.name.trim().toLowerCase() === it.name.trim().toLowerCase());
          const cat = it.category || dbItem?.category || 'عام';
          if (!catMap.has(cat)) {
            catMap.set(cat, {
              category: cat,
              itemCount: 1,
              totalSoldQty: 0,
              grossRevenue: 0,
              totalDiscounts: 0,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              hasMissingCost: false,
              lowStockCount: 0,
              deadStockCount: 0
            });
          }
          const rec = catMap.get(cat)!;
          rec.totalSoldQty += it.quantity;
          const itemGross = it.total || (it.quantity * it.price);
          const itemDiscount = (invGross > 0 && inv.discount) ? ((itemGross / invGross) * inv.discount) : 0;
          const netRev = Math.max(0, itemGross - itemDiscount);

          rec.grossRevenue = (rec.grossRevenue || 0) + itemGross;
          rec.totalDiscounts = (rec.totalDiscounts || 0) + itemDiscount;
          rec.totalRevenue += netRev;

          if (it.costPrice !== undefined) {
            const cost = it.quantity * it.costPrice;
            rec.totalCost += cost;
            rec.totalProfit += (netRev - cost);
          } else {
            rec.hasMissingCost = true;
          }
        });
      });

    // Calculate dead stock per category
    deadAndSlowStockIntelligence.deadItems.forEach(d => {
      const cat = d.item.category || 'عام';
      if (catMap.has(cat)) {
        catMap.get(cat)!.deadStockCount += 1;
      }
    });

    const list = Array.from(catMap.values()).map(c => ({
      ...c,
      grossRevenue: c.grossRevenue || c.totalRevenue,
      totalDiscounts: c.totalDiscounts || 0,
      profitMargin: (!c.hasMissingCost && c.totalRevenue > 0) ? (c.totalProfit / c.totalRevenue) * 100 : 0
    }));

    const topByRevenue = [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topByQty = [...list].sort((a, b) => b.totalSoldQty - a.totalSoldQty);
    const topByProfit = [...list].sort((a, b) => b.totalProfit - a.totalProfit);

    return {
      all: list,
      topByRevenue,
      topByQty,
      topByProfit
    };
  }, [inventoryDb, filteredInvoices, deadAndSlowStockIntelligence]);

  // ========================================================
  // E — FROZEN CAPITAL ANALYSIS (DEAD, SLOW, OVERSTOCK CAPITAL)
  // ========================================================
  const frozenCapitalIntelligence = useMemo(() => {
    let deadStockCapital = 0;
    let slowStockCapital = 0;
    let overstockCapital = 0;
    let deadMissingCostCount = 0;
    let slowMissingCostCount = 0;
    let overstockMissingCostCount = 0;

    deadAndSlowStockIntelligence.deadItems.forEach(d => {
      if (d.costPrice !== null && d.costPrice > 0) {
        deadStockCapital += d.stock * d.costPrice;
      } else {
        deadMissingCostCount += 1;
      }
    });

    deadAndSlowStockIntelligence.slowItems.forEach(s => {
      if (s.costPrice !== null && s.costPrice > 0) {
        slowStockCapital += s.stock * s.costPrice;
      } else {
        slowMissingCostCount += 1;
      }
    });

    smartStockAlerts.overstockItems.forEach(item => {
      const min = item.minStock ?? 5;
      const targetStock = min * 2;
      const stock = item.stock ?? 50;
      const overstockUnits = Math.max(0, stock - targetStock);
      if (item.costPrice !== undefined && item.costPrice > 0) {
        overstockCapital += overstockUnits * item.costPrice;
      } else {
        overstockMissingCostCount += 1;
      }
    });

    const totalFrozenCapital = deadStockCapital + slowStockCapital + overstockCapital;

    return {
      deadStockCapital,
      slowStockCapital,
      overstockCapital,
      totalFrozenCapital,
      deadMissingCostCount,
      slowMissingCostCount,
      overstockMissingCostCount
    };
  }, [deadAndSlowStockIntelligence, smartStockAlerts]);

  // ========================================================
  // J — DISCOUNT PROFIT IMPACT ANALYSIS (READ-ONLY)
  // ========================================================
  const discountProfitImpact = useMemo(() => {
    let grossSalesBeforeDiscount = 0;
    let totalDiscountAmount = 0;
    let netSales = 0;
    let totalCogs = 0;
    let hasMissingCost = false;

    filteredInvoices
      .filter(i => i.type === 'بيع')
      .forEach(inv => {
        let invItemGross = 0;
        inv.items.forEach(it => {
          const itemGross = it.quantity * it.price;
          invItemGross += itemGross;
          if (it.costPrice !== undefined) {
            totalCogs += it.quantity * it.costPrice;
          } else {
            hasMissingCost = true;
          }
        });

        const invDiscount = (inv.discount || 0) + Math.max(0, invItemGross - inv.total);
        grossSalesBeforeDiscount += invItemGross;
        totalDiscountAmount += invDiscount;
        netSales += inv.total;
      });

    const grossProfitBeforeDiscount = grossSalesBeforeDiscount - totalCogs;
    const profitAfterDiscount = netSales - totalCogs;
    const discountImpactPercent = grossProfitBeforeDiscount > 0 ? (totalDiscountAmount / grossProfitBeforeDiscount) * 100 : 0;

    return {
      grossSalesBeforeDiscount,
      totalDiscountAmount,
      netSales,
      totalCogs,
      grossProfitBeforeDiscount,
      profitAfterDiscount,
      discountImpactPercent,
      hasMissingCost
    };
  }, [filteredInvoices]);

  // ========================================================
  // K, L, M — CUSTOMER VALUE, INACTIVITY & DEBT INTELLIGENCE
  // ========================================================
  const customerIntelligenceMetrics = useMemo(() => {
    const today = new Date();
    const customerMap = new Map<string, {
      id: string;
      name: string;
      phone: string;
      currentBalance: number;
      totalPurchases: number;
      invoiceCount: number;
      avgInvoiceValue: number;
      firstInvoiceDate: string | null;
      lastInvoiceDate: string | null;
      daysSinceLastPurchase: number | null;
      inactivityStatus: 'active' | 'inactive' | 'no_purchases';
      totalProfitGenerated: number;
      hasMissingCost: boolean;
      hasOutstandingDebt: boolean;
      isHighDebt: boolean;
    }>();

    // Initialize with registered customers
    customersList.forEach(c => {
      customerMap.set(c.name.trim().toLowerCase(), {
        id: c.id,
        name: c.name,
        phone: c.phone || '-',
        currentBalance: c.balance,
        totalPurchases: 0,
        invoiceCount: 0,
        avgInvoiceValue: 0,
        firstInvoiceDate: null,
        lastInvoiceDate: null,
        daysSinceLastPurchase: null,
        inactivityStatus: 'no_purchases',
        totalProfitGenerated: 0,
        hasMissingCost: false,
        hasOutstandingDebt: c.balance > 0,
        isHighDebt: c.balance >= 1000
      });
    });

    // Scan all completed invoices for customer purchase history
    completedInvoices
      .filter(i => i.type === 'بيع' && i.customerName && i.customerName.trim() !== 'عميل نقدي')
      .forEach(inv => {
        const key = inv.customerName.trim().toLowerCase();
        let profitInInvoice = 0;
        let missingCostInInvoice = false;

        inv.items.forEach(it => {
          if (it.costPrice !== undefined) {
            profitInInvoice += (it.total || (it.quantity * it.price)) - (it.quantity * it.costPrice);
          } else {
            missingCostInInvoice = true;
          }
        });

        if (customerMap.has(key)) {
          const rec = customerMap.get(key)!;
          rec.totalPurchases += inv.total;
          rec.invoiceCount += 1;
          rec.totalProfitGenerated += profitInInvoice;
          if (missingCostInInvoice) rec.hasMissingCost = true;

          if (!rec.firstInvoiceDate || inv.date < rec.firstInvoiceDate) {
            rec.firstInvoiceDate = inv.date;
          }
          if (!rec.lastInvoiceDate || inv.date > rec.lastInvoiceDate) {
            rec.lastInvoiceDate = inv.date;
          }
        } else {
          // Unregistered customer with invoice
          customerMap.set(key, {
            id: `cust-${key}`,
            name: inv.customerName,
            phone: inv.customerPhone || '-',
            currentBalance: 0,
            totalPurchases: inv.total,
            invoiceCount: 1,
            avgInvoiceValue: inv.total,
            firstInvoiceDate: inv.date,
            lastInvoiceDate: inv.date,
            daysSinceLastPurchase: null,
            inactivityStatus: 'active',
            totalProfitGenerated: profitInInvoice,
            hasMissingCost: missingCostInInvoice,
            hasOutstandingDebt: false,
            isHighDebt: false
          });
        }
      });

    // Calculate averages, days since last purchase, and inactivity
    const list = Array.from(customerMap.values()).map(c => {
      let daysSince: number | null = null;
      let status: 'active' | 'inactive' | 'no_purchases' = 'no_purchases';

      if (c.lastInvoiceDate) {
        const diffMs = today.getTime() - new Date(c.lastInvoiceDate).getTime();
        daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        status = daysSince > 30 ? 'inactive' : 'active';
      }

      return {
        ...c,
        avgInvoiceValue: c.invoiceCount > 0 ? c.totalPurchases / c.invoiceCount : 0,
        daysSinceLastPurchase: daysSince,
        inactivityStatus: status
      };
    });

    let totalOutstandingCustomerDebt = 0;
    customersList.forEach(c => {
      if (c.balance > 0) totalOutstandingCustomerDebt += c.balance;
    });

    const activeCount = list.filter(c => c.inactivityStatus === 'active').length;
    const inactiveCount = list.filter(c => c.inactivityStatus === 'inactive').length;
    const debtorsCount = list.filter(c => c.hasOutstandingDebt).length;

    const topByPurchases = [...list].sort((a, b) => b.totalPurchases - a.totalPurchases);
    const topByProfit = [...list].sort((a, b) => b.totalProfitGenerated - a.totalProfitGenerated);
    const topByDebt = [...list].filter(c => c.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
    const inactiveList = [...list].filter(c => c.inactivityStatus === 'inactive').sort((a, b) => (b.daysSinceLastPurchase || 0) - (a.daysSinceLastPurchase || 0));

    return {
      all: list,
      totalOutstandingCustomerDebt,
      activeCount,
      inactiveCount,
      debtorsCount,
      topByPurchases,
      topByProfit,
      topByDebt,
      inactiveList
    };
  }, [customersList, completedInvoices]);

  // ========================================================
  // N — UNIFIED SMART PRIORITIES (EXECUTIVE INTELLIGENCE)
  // ========================================================
  const unifiedSmartPriorities = useMemo(() => {
    // 🔴 Critical: Out of stock or Critical Coverage (< 3 days)
    const criticalItems = productIntelligence.all.filter(
      p => p.currentStock <= 0 || p.coverageStatus === 'critical'
    );

    // 🟠 High Priority: Upcoming Low Stock in <= 7 days OR Stock <= minStock
    const highPriorityItems = productIntelligence.all.filter(
      p => (p.isUpcomingLowStock || p.currentStock <= p.minStock) && p.currentStock > 0 && p.coverageStatus !== 'critical'
    );

    // ⚫ Frozen Capital: Dead stock items
    const frozenCapitalItems = productIntelligence.all.filter(
      p => p.healthScore === 'DEAD_STOCK' && p.currentStock > 0
    ).sort((a, b) => (b.currentStock * (b.cost || 0)) - (a.currentStock * (a.cost || 0)));

    // 🟡 Attention: Slow moving or Overstock items
    const attentionItems = productIntelligence.all.filter(
      p => p.healthScore === 'NEEDS_ATTENTION' || p.healthScore === 'OVERSTOCK'
    );

    // 🟢 Healthy: Balanced stock with normal movement
    const healthyItems = productIntelligence.all.filter(
      p => p.healthScore === 'HEALTHY'
    );

    return {
      criticalItems,
      highPriorityItems,
      frozenCapitalItems,
      attentionItems,
      healthyItems
    };
  }, [productIntelligence]);

  const customerMetrics = useMemo(() => {
    const totalCustomers = customersList.length;
    let totalReceivables = 0;
    const topDebtors = [...customersList]
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    customersList.forEach(c => {
      if (c.balance > 0) {
        totalReceivables += c.balance;
      }
    });

    // Top buyers in filtered invoices
    const buyerMap = new Map<string, { name: string; invoiceCount: number; totalPurchased: number }>();
    filteredInvoices
      .filter(i => i.type === 'بيع' && i.customerName && i.customerName !== 'عميل نقدي')
      .forEach(inv => {
        const name = inv.customerName;
        if (buyerMap.has(name)) {
          const obj = buyerMap.get(name)!;
          obj.invoiceCount += 1;
          obj.totalPurchased += inv.total;
        } else {
          buyerMap.set(name, {
            name,
            invoiceCount: 1,
            totalPurchased: inv.total
          });
        }
      });

    const topBuyers = Array.from(buyerMap.values())
      .sort((a, b) => b.totalPurchased - a.totalPurchased)
      .slice(0, 5);

    return {
      totalCustomers,
      totalReceivables,
      topDebtors,
      topBuyers
    };
  }, [customersList, filteredInvoices]);

  const supplierMetrics = useMemo(() => {
    const totalSuppliers = suppliersList.length;
    let totalPayables = 0;
    const topCreditors = [...suppliersList]
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    suppliersList.forEach(s => {
      if (s.balance > 0) {
        totalPayables += s.balance;
      }
    });

    return {
      totalSuppliers,
      totalPayables,
      topCreditors
    };
  }, [suppliersList]);

  // Extract unique creator names/IDs for user filter dropdown
  const userOptions = useMemo(() => {
    const list: { id: string; name: string }[] = usersList.map(u => ({ id: u.id, name: u.displayName || u.username }));
    completedInvoices.forEach(inv => {
      if (inv.createdByName && !list.some(u => u.name === inv.createdByName || u.id === inv.userId)) {
        list.push({ id: inv.userId || inv.createdByName, name: inv.createdByName });
      }
    });
    return list;
  }, [usersList, completedInvoices]);

  // Last shift (closed or active)
  const lastShift = useMemo(() => {
    if (activeShift) return activeShift;
    if (shiftsList.length > 0) return shiftsList[0];
    return null;
  }, [activeShift, shiftsList]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f0f0] p-1.5 space-y-1.5 overflow-y-auto text-xs dir-rtl" dir="rtl">
      
      {/* 1. TOP TOOLBAR & CONTROLS */}
      <div className="bg-[#e8e8e8] border border-[#afafaf] p-1.5 rounded-none space-y-1.5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          
          {/* Title with icon */}
          <div className="flex items-center gap-2 font-bold text-[#222222] text-sm">
            <BarChart2 className="w-5 h-5 text-[#243746]" />
            <span>لوحة التحكم الإدارية — مؤشرات الأداء والتشغيل والسيولة</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 border border-[#afafaf] rounded-none">
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-2.5 py-1 font-bold rounded-none border text-[11px] ${
                datePreset === 'today' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => handlePresetChange('yesterday')}
              className={`px-2.5 py-1 font-bold rounded-none border text-[11px] ${
                datePreset === 'yesterday' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => handlePresetChange('thisWeek')}
              className={`px-2.5 py-1 font-bold rounded-none border text-[11px] ${
                datePreset === 'thisWeek' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => handlePresetChange('thisMonth')}
              className={`px-2.5 py-1 font-bold rounded-none border text-[11px] ${
                datePreset === 'thisMonth' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePresetChange('lastMonth')}
              className={`px-2.5 py-1 font-bold rounded-none border text-[11px] ${
                datePreset === 'lastMonth' ? 'bg-[#e8836a] text-white border-[#afafaf]' : 'bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] border-[#afafaf]'
              }`}
            >
              الشهر السابق
            </button>
          </div>

          {/* Action buttons: Refresh and Shifts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="px-3 py-1 bg-[#dceef2] hover:bg-[#c9e3e8] text-[#243746] font-bold rounded-none border border-[#afafaf] flex items-center gap-1 text-[11px] cursor-pointer"
              title="تحديث حساب المؤشرات فورياً"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#243746]" />
              <span>تحديث البيانات</span>
            </button>

            {onOpenShiftModal && (
              <button
                onClick={onOpenShiftModal}
                className="px-3 py-1 bg-[#243746] hover:bg-[#1a2833] text-white font-bold rounded-none border border-[#afafaf] flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>إدارة الوردية (F9)</span>
              </button>
            )}
          </div>
        </div>

        {/* DETAILED FILTER STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 items-center text-xs">
          {/* Custom Date Pickers */}
          <div className="md:col-span-2 flex items-center gap-1 bg-white p-1 border border-[#999999] rounded-none">
            <span className="font-bold text-[#222222] text-[11px]">الفترة من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDatePreset('custom'); }}
              className="w-32 px-1 py-0.5 border border-[#999999] font-mono text-[11px]"
            />
            <span className="font-bold text-[#222222] text-[11px]">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDatePreset('custom'); }}
              className="w-32 px-1 py-0.5 border border-[#999999] font-mono text-[11px]"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a] text-[11px]"
            >
              <option value="الكل">الفرع: جميع الفروع</option>
              <option value="عاصم فون - الفرع الرئيسي">عاصم فون - الفرع الرئيسي</option>
              <option value="فرع القاهرة">فرع القاهرة</option>
              <option value="المخزن المركزي">المخزن المركزي</option>
            </select>
          </div>

          {/* User / Cashier Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-[#999999] rounded-none font-bold text-[#222222] focus:outline-none focus:border-[#e8836a] text-[11px]"
            >
              <option value="الكل">المستخدم / الكاشير: الكل</option>
              {userOptions.map(u => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY KPI BANNER (8 DENSE BOXES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 shrink-0">
        
        {/* KPI 1: Gross Sales */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">إجمالي المبيعات</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#0277BD]" />
          </div>
          <div className="font-mono text-base font-bold text-[#0277BD] mt-1">
            {salesMetrics.grossSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">{salesMetrics.salesCount} فاتورة بيع</div>
        </div>

        {/* KPI 2: Sales Returns */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">مرتجع المبيعات</span>
            <RotateCcw className="w-3.5 h-3.5 text-[#b85c5c]" />
          </div>
          <div className="font-mono text-base font-bold text-[#b85c5c] mt-1">
            {salesMetrics.salesReturns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">{salesMetrics.salesReturnsCount} حركة مرتجع</div>
        </div>

        {/* KPI 3: Net Sales */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">صافي المبيعات</span>
            <DollarSign className="w-3.5 h-3.5 text-[#243746]" />
          </div>
          <div className="font-mono text-base font-bold text-[#243746] mt-1">
            {salesMetrics.netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">بعد خصم المرتجعات</div>
        </div>

        {/* KPI 4: COGS */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">تكلفة المباع (COGS)</span>
            <Package className="w-3.5 h-3.5 text-[#795548]" />
          </div>
          <div className="font-mono text-base font-bold text-[#795548] mt-1">
            {salesMetrics.totalSalesCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">
            {salesMetrics.hasMissingCost ? 'تكلفة تقريبية' : 'تكلفة تاريخية دقيقة'}
          </div>
        </div>

        {/* KPI 5: Gross Profit */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">إجمالي الربح</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#4f9d69]" />
          </div>
          <div className="font-mono text-base font-bold text-[#4f9d69] mt-1">
            {salesMetrics.grossProfit !== null
              ? salesMetrics.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : 'غير متاح'}
          </div>
          <div className="text-[10px] text-[#888888]">
            {salesMetrics.grossProfit !== null ? 'صافي ربح البضاعة' : 'تتطلب تكلفة الفواتير'}
          </div>
        </div>

        {/* KPI 6: Profit Margin */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">هامش الربح</span>
            <Percent className="w-3.5 h-3.5 text-[#243746]" />
          </div>
          <div className="font-mono text-base font-bold text-[#243746] mt-1">
            {salesMetrics.profitMargin !== null
              ? `${salesMetrics.profitMargin.toFixed(1)}%`
              : 'غير متاح'}
          </div>
          <div className="text-[10px] text-[#888888]">نسبة الربح من الصافي</div>
        </div>

        {/* KPI 7: Cash vs Credit Sales */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">التحصيل النقدي</span>
            <Wallet className="w-3.5 h-3.5 text-[#0277BD]" />
          </div>
          <div className="font-mono text-base font-bold text-[#0277BD] mt-1">
            {salesMetrics.cashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">
            آجل: {salesMetrics.creditSales.toFixed(2)}
          </div>
        </div>

        {/* KPI 8: Purchases */}
        <div className="bg-white p-2 rounded-none border border-[#afafaf] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666]">
            <span className="font-bold text-[11px]">المشتريات</span>
            <Truck className="w-3.5 h-3.5 text-[#e8836a]" />
          </div>
          <div className="font-mono text-base font-bold text-[#e8836a] mt-1">
            {salesMetrics.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#888888]">{salesMetrics.purchasesCount} فاتورة شراء</div>
        </div>

      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID (3 SECTIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5">

        {/* COLUMN 1: SALES & PROFIT BREAKDOWN + CURRENT SHIFT */}
        <div className="space-y-1.5">
          
          {/* Box 1.1: Sales & Financial Structure */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                تحليل حركة المبيعات والتحصيل
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{filteredInvoices.length} حركة</span>
            </div>

            <div className="p-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">إجمالي قيمة المبيعات (Gross):</span>
                <span className="font-mono font-bold text-[#222222]">{salesMetrics.grossSales.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">المبيعات النقدية المحصلة (Cash):</span>
                <span className="font-mono font-bold text-[#0277BD]">
                  {salesMetrics.cashSales.toFixed(2)} ج.م
                  <span className="text-[10px] text-[#888888] mr-1">
                    ({salesMetrics.grossSales > 0 ? ((salesMetrics.cashSales / salesMetrics.grossSales) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">المبيعات الآجلة (Credit):</span>
                <span className="font-mono font-bold text-[#b85c5c]">
                  {salesMetrics.creditSales.toFixed(2)} ج.م
                  <span className="text-[10px] text-[#888888] mr-1">
                    ({salesMetrics.grossSales > 0 ? ((salesMetrics.creditSales / salesMetrics.grossSales) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">مرتجع المبيعات:</span>
                <span className="font-mono font-bold text-[#b85c5c]">-{salesMetrics.salesReturns.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">ضريبة القيمة المضافة (Tax):</span>
                <span className="font-mono font-bold text-[#222222]">{salesMetrics.totalTax.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">إجمالي الخصومات الممنوحة:</span>
                <span className="font-mono font-bold text-[#b85c5c]">-{salesMetrics.totalDiscount.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#f0f0f0] px-1 font-bold">
                <span className="text-[#243746]">متوسط قيمة الفاتورة (Average Ticket):</span>
                <span className="font-mono text-[#243746]">{salesMetrics.avgTicket.toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>

          {/* Box 1.2: Current / Active Shift Status */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                حالة وردية الكاشير (Shift Status)
              </span>
              {activeShift ? (
                <span className="px-1.5 py-0.2 bg-[#4f9d69] text-white text-[10px] font-bold">نشطة مفتوحة</span>
              ) : (
                <span className="px-1.5 py-0.2 bg-[#afafaf] text-[#222222] text-[10px] font-bold">لا توجد وردية مفتوحة</span>
              )}
            </div>

            <div className="p-2 space-y-1.5 text-xs">
              {lastShift ? (
                <>
                  <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8]">
                    <span className="text-[#555555]">كود الوردية:</span>
                    <span className="font-mono font-bold text-[#222222]">{lastShift.id}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8]">
                    <span className="text-[#555555]">الكاشير المسؤول:</span>
                    <span className="font-bold text-[#243746]">{lastShift.userName}</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8]">
                    <span className="text-[#555555]">وقت الفتح:</span>
                    <span className="font-mono text-[11px] text-[#555555]">
                      {new Date(lastShift.openedAt).toLocaleTimeString('ar-SA')} ({new Date(lastShift.openedAt).toLocaleDateString('ar-SA')})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8]">
                    <span className="text-[#555555]">العهدة الافتتاحية:</span>
                    <span className="font-mono font-bold text-[#222222]">{lastShift.openingCash.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8]">
                    <span className="text-[#555555]">مبيعات الوردية:</span>
                    <span className="font-mono font-bold text-[#0277BD]">{lastShift.totalSales.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between py-1 bg-[#dceef2] px-1 font-bold">
                    <span className="text-[#243746]">المتوقع في الدرج:</span>
                    <span className="font-mono text-[#243746]">{lastShift.expectedCash.toFixed(2)} ج.م</span>
                  </div>
                  {lastShift.status === 'CLOSED' && lastShift.cashDifference !== undefined && (
                    <div className="flex items-center justify-between py-1 px-1 font-bold border border-[#afafaf] mt-1">
                      <span>فارق الإغلاق:</span>
                      <span className={`font-mono ${lastShift.cashDifference === 0 ? 'text-[#4f9d69]' : lastShift.cashDifference < 0 ? 'text-[#b85c5c]' : 'text-[#0277BD]'}`}>
                        {lastShift.cashDifference > 0 ? `+${lastShift.cashDifference.toFixed(2)} (فائض)` : lastShift.cashDifference < 0 ? `${lastShift.cashDifference.toFixed(2)} (عجز)` : '0.00 (مطابق)'}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-[#888888]">لم يتم تسجيل أي وردية في النظام بعد</div>
              )}
            </div>
          </div>

          {/* Box 1.3: Treasury & Voucher Cash Flow */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" />
                حركة السندات والخزينة (Treasury Flow)
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{filteredVouchers.length} سند</span>
            </div>

            <div className="p-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">سندات قبض نقدية (Cash In):</span>
                <span className="font-mono font-bold text-[#4f9d69]">+{treasuryMetrics.totalCashIn.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">سندات صرف ومصروفات (Cash Out):</span>
                <span className="font-mono font-bold text-[#b85c5c]">-{treasuryMetrics.totalCashOut.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8] text-[11px]">
                <span className="text-[#666666] pr-2">↳ منها مصروفات تشغيلية:</span>
                <span className="font-mono font-bold text-[#b85c5c]">{treasuryMetrics.totalOperatingExpenses.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-[#e8e8e8] text-[11px]">
                <span className="text-[#666666] pr-2">↳ منها إيرادات تشغيلية:</span>
                <span className="font-mono font-bold text-[#4f9d69]">{treasuryMetrics.totalOperatingRevenues.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#f0f0f0] px-1 font-bold">
                <span className="text-[#243746]">صافي حركة السندات:</span>
                <span className={`font-mono ${treasuryMetrics.netVoucherFlow >= 0 ? 'text-[#4f9d69]' : 'text-[#b85c5c]'}`}>
                  {treasuryMetrics.netVoucherFlow >= 0 ? `+${treasuryMetrics.netVoucherFlow.toFixed(2)}` : treasuryMetrics.netVoucherFlow.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 2: INVENTORY SUMMARY & LOW STOCK ALERTS */}
        <div className="space-y-1.5">
          
          {/* Box 2.1: Inventory Capital & Stock Valuation */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                ملخص وتقييم المخزون (Inventory Valuation)
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{inventoryMetrics.totalItemsCount} صنف</span>
            </div>

            <div className="p-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">إجمالي عدد الأصناف المعرفة:</span>
                <span className="font-mono font-bold text-[#222222]">{inventoryMetrics.totalItemsCount} صنف</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">إجمالي رصيد القطع المتوفرة:</span>
                <span className="font-mono font-bold text-[#0277BD]">{inventoryMetrics.totalQuantity} وحدة</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">قيمة المخزون بسعر الشراء (التكلفة):</span>
                <span className="font-mono font-bold text-[#795548]">{inventoryMetrics.totalStockCost.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#e8e8e8]">
                <span className="text-[#555555]">قيمة المخزون المتوقعة بسعر البيع:</span>
                <span className="font-mono font-bold text-[#243746]">{inventoryMetrics.totalStockSaleValue.toFixed(2)} ج.م</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#dceef2] px-1 font-bold">
                <span className="text-[#243746]">الربح المحتمل في المخزون:</span>
                <span className="font-mono text-[#4f9d69]">
                  {(inventoryMetrics.totalStockSaleValue - inventoryMetrics.totalStockCost).toFixed(2)} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Box 2.2: Low Stock Warning / Re-order alerts */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#e8836a]" />
                أصناف قاربت على النفاد (تحت حد الطلب)
              </span>
              <span className="px-1.5 py-0.2 bg-[#b85c5c] text-white text-[10px] font-bold font-mono">
                {inventoryMetrics.lowStockCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf]">
                    <th className="p-1 border-r border-[#afafaf]">الكود</th>
                    <th className="p-1 border-r border-[#afafaf]">الصنف</th>
                    <th className="p-1 border-r border-[#afafaf]">المتوفر</th>
                    <th className="p-1">حد الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryMetrics.lowStockItems.length > 0 ? (
                    inventoryMetrics.lowStockItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#fff9f8]">
                        <td className="p-1 font-mono text-[#666666] border-r border-[#e8e8e8]">{item.code || '-'}</td>
                        <td className="p-1 font-bold text-[#222222] border-r border-[#e8e8e8]">{item.name}</td>
                        <td className="p-1 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">{item.stock || 0}</td>
                        <td className="p-1 font-mono text-[#555555]">{item.minStock ?? 5}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-[#4f9d69] font-bold">
                        <CheckCircle2 className="w-4 h-4 inline-block ml-1" />
                        جميع الأصناف أعلى من حد الطلب الأدنى
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 2.3: Recent Stock Movements */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                آخر حركات المخزون المنفذة
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{filteredMovements.length} حركة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf]">
                    <th className="p-1 border-r border-[#afafaf]">النوع</th>
                    <th className="p-1 border-r border-[#afafaf]">الصنف</th>
                    <th className="p-1 border-r border-[#afafaf]">الكمية</th>
                    <th className="p-1">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                      <td className="p-1 font-bold text-[#243746] border-r border-[#e8e8e8]">{m.movementType}</td>
                      <td className="p-1 text-[#222222] border-r border-[#e8e8e8]">{m.productName}</td>
                      <td className="p-1 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{m.quantity}</td>
                      <td className="p-1 font-mono text-[10px] text-[#777777]">{m.date}</td>
                    </tr>
                  ))}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-[#888888]">لا توجد حركات مخزنية في هذه الفترة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMN 3: CUSTOMERS & SUPPLIERS RECEIVABLES / PAYABLES */}
        <div className="space-y-1.5">
          
          {/* Box 3.1: Customers Receivables */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                مديونيات وأرصدة العملاء (Receivables)
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{customerMetrics.totalCustomers} عميل</span>
            </div>

            <div className="p-2 bg-[#f0f0f0] border-b border-[#afafaf] flex items-center justify-between">
              <span className="font-bold text-[#555555]">إجمالي مديونيات العملاء المطلوبة:</span>
              <span className="font-mono font-bold text-[#b85c5c] text-sm">
                {customerMetrics.totalReceivables.toFixed(2)} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf]">
                    <th className="p-1 border-r border-[#afafaf]">العميل</th>
                    <th className="p-1 border-r border-[#afafaf]">الهاتف</th>
                    <th className="p-1">المديونية</th>
                  </tr>
                </thead>
                <tbody>
                  {customerMetrics.topDebtors.length > 0 ? (
                    customerMetrics.topDebtors.map((c, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#fff9f8]">
                        <td className="p-1 font-bold text-[#222222] border-r border-[#e8e8e8]">{c.name}</td>
                        <td className="p-1 font-mono text-[#666666] border-r border-[#e8e8e8]">{c.phone || '-'}</td>
                        <td className="p-1 font-mono font-bold text-[#b85c5c]">{c.balance.toFixed(2)} ج.م</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-[#4f9d69] font-bold">
                        لا توجد مديونيات مستحقة على العملاء
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 3.2: Top Purchasing Customers in Period */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                أعلى العملاء شراءً في الفترة المحددة
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">أعلى 5</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf]">
                    <th className="p-1 border-r border-[#afafaf]">العميل</th>
                    <th className="p-1 border-r border-[#afafaf]">عدد الفواتير</th>
                    <th className="p-1">قيمة المشتريات</th>
                  </tr>
                </thead>
                <tbody>
                  {customerMetrics.topBuyers.length > 0 ? (
                    customerMetrics.topBuyers.map((b, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                        <td className="p-1 font-bold text-[#222222] border-r border-[#e8e8e8]">{b.name}</td>
                        <td className="p-1 font-mono text-[#0277BD] border-r border-[#e8e8e8]">{b.invoiceCount}</td>
                        <td className="p-1 font-mono font-bold text-[#4f9d69]">{b.totalPurchased.toFixed(2)} ج.م</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-[#888888]">لا توجد فواتير عملاء محددين في هذه الفترة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 3.3: Suppliers Payables */}
          <div className="bg-white border border-[#afafaf] rounded-none">
            <div className="bg-[#243746] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                مستحقات والتزامات الموردين (Payables)
              </span>
              <span className="text-[10px] text-[#dceef2] font-mono">{supplierMetrics.totalSuppliers} مورد</span>
            </div>

            <div className="p-2 bg-[#f0f0f0] border-b border-[#afafaf] flex items-center justify-between">
              <span className="font-bold text-[#555555]">إجمالي مستحقات الموردين:</span>
              <span className="font-mono font-bold text-[#e8836a] text-sm">
                {supplierMetrics.totalPayables.toFixed(2)} ج.م
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf]">
                    <th className="p-1 border-r border-[#afafaf]">المورد</th>
                    <th className="p-1 border-r border-[#afafaf]">الهاتف</th>
                    <th className="p-1">المستحق له</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierMetrics.topCreditors.length > 0 ? (
                    supplierMetrics.topCreditors.map((s, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#fff9f8]">
                        <td className="p-1 font-bold text-[#222222] border-r border-[#e8e8e8]">{s.name}</td>
                        <td className="p-1 font-mono text-[#666666] border-r border-[#e8e8e8]">{s.phone || '-'}</td>
                        <td className="p-1 font-mono font-bold text-[#e8836a]">{s.balance.toFixed(2)} ج.م</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-[#4f9d69] font-bold">
                        لا توجد مستحقات معلقة للموردين
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* 4. SMART SALES, CUSTOMER, INVENTORY & PROFIT INTELLIGENCE */}
      <div className="bg-white border border-[#afafaf] rounded-none shrink-0 space-y-0">
        
        {/* Intelligence Header & Sub-Tabs */}
        <div className="bg-[#243746] text-white px-2 py-1.5 font-bold flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#e8836a]" />
            <span>لوحة الذكاء التحليلي المتقدم — المخزون، الاستهلاك، العملاء، رأس المال المجمد والربحية</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1b2b37] p-0.5 border border-[#354f63] flex-wrap">
            <button
              onClick={() => setIntelligenceTab('priorities')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'priorities'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              ⭐ أولويات القرارات ({unifiedSmartPriorities.criticalItems.length + unifiedSmartPriorities.highPriorityItems.length})
            </button>
            <button
              onClick={() => setIntelligenceTab('consumption')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'consumption'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              📈 معدلات السحب والتغطية
            </button>
            <button
              onClick={() => setIntelligenceTab('profitability')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'profitability'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              💰 الربحية والمبيعات
            </button>
            <button
              onClick={() => setIntelligenceTab('deadStock')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'deadStock'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              ⏳ رأس المال المجمد ({deadAndSlowStockIntelligence.deadCount + deadAndSlowStockIntelligence.slowCount})
            </button>
            <button
              onClick={() => setIntelligenceTab('discounts')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'discounts'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              🏷️ أثر الخصومات ({discountProfitImpact.discountImpactPercent.toFixed(1)}%)
            </button>
            <button
              onClick={() => setIntelligenceTab('customerIntelligence')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'customerIntelligence'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              👥 ذكاء العملاء ({customerIntelligenceMetrics.all.length})
            </button>
            <button
              onClick={() => setIntelligenceTab('bestSellers')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'bestSellers'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              🏆 الأكثر مبيعاً
            </button>
            <button
              onClick={() => setIntelligenceTab('alerts')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'alerts'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              🚨 التنبيهات
            </button>
            <button
              onClick={() => setIntelligenceTab('categories')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'categories'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              📁 ذكاء الأقسام
            </button>
            <button
              onClick={() => setIntelligenceTab('expiry')}
              className={`px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors ${
                intelligenceTab === 'expiry'
                  ? 'bg-[#e8836a] text-white shadow-xs'
                  : 'text-[#dceef2] hover:bg-white/10'
              }`}
            >
              ⌛ الصلاحية
            </button>
          </div>
        </div>

        {/* --- VIEW 0: UNIFIED SMART PRIORITIES (EXECUTIVE ADVISORY) --- */}
        {intelligenceTab === 'priorities' && (
          <div className="space-y-2 p-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
              <div className="bg-[#fdf2f2] border border-[#e0a8a8] p-2">
                <div className="flex items-center justify-between text-[#b85c5c] font-bold mb-1">
                  <span>🔴 أولوية قصوى (حرجة)</span>
                  <span className="font-mono text-sm">{unifiedSmartPriorities.criticalItems.length}</span>
                </div>
                <div className="text-[10px] text-[#666666]">أصناف نفدت أو تغطيتها أقل من 3 أيام</div>
              </div>

              <div className="bg-[#fff9f8] border border-[#f5c6cb] p-2">
                <div className="flex items-center justify-between text-[#e8836a] font-bold mb-1">
                  <span>🟠 أولوية عاجلة (نواقص)</span>
                  <span className="font-mono text-sm">{unifiedSmartPriorities.highPriorityItems.length}</span>
                </div>
                <div className="text-[10px] text-[#666666]">تحت حد الطلب أو تنفد خلال أسبوع</div>
              </div>

              <div className="bg-[#fdfaf3] border border-[#e2c486] p-2">
                <div className="flex items-center justify-between text-[#8a5d14] font-bold mb-1">
                  <span>⚫ رأس مال مجمد (رواكد)</span>
                  <span className="font-mono text-sm">{frozenCapitalIntelligence.totalFrozenCapital.toFixed(0)} ج.م</span>
                </div>
                <div className="text-[10px] text-[#666666]">{unifiedSmartPriorities.frozenCapitalItems.length} صنف راكد بالتكلفة الحقيقية</div>
              </div>

              <div className="bg-[#f0f7f9] border border-[#b8dbe3] p-2">
                <div className="flex items-center justify-between text-[#243746] font-bold mb-1">
                  <span>🟡 يحتاج متابعة (فائض/بطيء)</span>
                  <span className="font-mono text-sm">{unifiedSmartPriorities.attentionItems.length}</span>
                </div>
                <div className="text-[10px] text-[#666666]">أصناف فائضة أو حركة بطيئة</div>
              </div>

              <div className="bg-[#f2f9f4] border border-[#a3d9b1] p-2">
                <div className="flex items-center justify-between text-[#4f9d69] font-bold mb-1">
                  <span>🟢 مخزون متوازن (صحي)</span>
                  <span className="font-mono text-sm">{unifiedSmartPriorities.healthyItems.length}</span>
                </div>
                <div className="text-[10px] text-[#666666]">معدلات سحب وتغطية مثالية</div>
              </div>
            </div>

            {/* Critical & High Priority Table */}
            <div className="border border-[#afafaf]">
              <div className="bg-[#243746] text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
                <span>قائمة التدخل السريع — الأصناف ذات الأولوية القصوى والعاجلة</span>
                <span className="text-[10px] text-[#dceef2]">{unifiedSmartPriorities.criticalItems.length + unifiedSmartPriorities.highPriorityItems.length} صنف</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                      <th className="p-1.5 border-r border-[#afafaf]">#</th>
                      <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الفئة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">المخزون الحالي</th>
                      <th className="p-1.5 border-r border-[#afafaf]">حد الطلب</th>
                      <th className="p-1.5 border-r border-[#afafaf]">معدل السحب اليومي</th>
                      <th className="p-1.5 border-r border-[#afafaf]">التغطية المتبقية</th>
                      <th className="p-1.5 border-r border-[#afafaf]">إعادة الطلب المقترحة</th>
                      <th className="p-1.5">الحالة والتوصية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...unifiedSmartPriorities.criticalItems, ...unifiedSmartPriorities.highPriorityItems].length > 0 ? (
                      [...unifiedSmartPriorities.criticalItems, ...unifiedSmartPriorities.highPriorityItems].map((p, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#fff9f8]">
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{p.code}</td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{p.name}</td>
                          <td className="p-1.5 text-[#555555] border-r border-[#e8e8e8]">{p.category}</td>
                          <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">{p.currentStock}</td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{p.minStock}</td>
                          <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{p.avgDailySales.toFixed(1)} / يوم</td>
                          <td className="p-1.5 font-mono font-bold border-r border-[#e8e8e8]">
                            {p.daysCoverage !== null ? (
                              <span className={p.daysCoverage < 3 ? 'text-[#b85c5c]' : 'text-[#e8836a]'}>
                                {p.daysCoverage.toFixed(1)} يوم
                              </span>
                            ) : (
                              <span className="text-[#888888]">غير محدد</span>
                            )}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-[#4f9d69] border-r border-[#e8e8e8]">
                            {Math.max(0, p.targetStock - p.currentStock)} وحدة
                          </td>
                          <td className="p-1.5">
                            {p.currentStock <= 0 ? (
                              <span className="text-[10px] bg-[#b85c5c] text-white px-1.5 py-0.5 font-bold">🔴 نفد - اطلب فوراً</span>
                            ) : p.coverageStatus === 'critical' ? (
                              <span className="text-[10px] bg-[#b85c5c] text-white px-1.5 py-0.5 font-bold">🔴 تغطية حرجة (&lt; 3 أيام)</span>
                            ) : p.isUpcomingLowStock ? (
                              <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">🟠 ينفد خلال {p.daysUntilReorder?.toFixed(0)} يوم</span>
                            ) : (
                              <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">🟠 تحت حد الطلب</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-[#4f9d69] font-bold">
                          ممتاز! لا توجد أصناف ذات أولوية حرجة أو عاجلة حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 1: CONSUMPTION & STOCK COVERAGE INTELLIGENCE --- */}
        {intelligenceTab === 'consumption' && (
          <div className="space-y-1">
            <div className="bg-[#f0f0f0] border-b border-[#afafaf] p-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#555555]">ترتيب حسب:</span>
                <button
                  onClick={() => setConsumptionSort('daily')}
                  className={`px-2 py-0.5 font-bold border text-[11px] ${
                    consumptionSort === 'daily'
                      ? 'bg-[#243746] text-white border-[#243746]'
                      : 'bg-white text-[#222222] border-[#afafaf]'
                  }`}
                >
                  أعلى سحب يومي
                </button>
                <button
                  onClick={() => setConsumptionSort('coverage')}
                  className={`px-2 py-0.5 font-bold border text-[11px] ${
                    consumptionSort === 'coverage'
                      ? 'bg-[#243746] text-white border-[#243746]'
                      : 'bg-white text-[#222222] border-[#afafaf]'
                  }`}
                >
                  أقل تغطية متبقية (أيام)
                </button>
                <button
                  onClick={() => setConsumptionSort('upcoming')}
                  className={`px-2 py-0.5 font-bold border text-[11px] ${
                    consumptionSort === 'upcoming'
                      ? 'bg-[#243746] text-white border-[#243746]'
                      : 'bg-white text-[#222222] border-[#afafaf]'
                  }`}
                >
                  الأقرب لنفاذ المخزون
                </button>
              </div>

              <div className="text-[11px] text-[#666666] font-mono">
                فترة التحليل: <strong>{daysInPeriod} يوم</strong> | صافي كميات البيع المعتمدة
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                    <th className="p-1.5 border-r border-[#afafaf]">#</th>
                    <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">المخزون الحالي</th>
                    <th className="p-1.5 border-r border-[#afafaf]">معدل السحب اليومي</th>
                    <th className="p-1.5 border-r border-[#afafaf]">معدل السحب الأسبوعي</th>
                    <th className="p-1.5 border-r border-[#afafaf]">معدل السحب الشهري</th>
                    <th className="p-1.5 border-r border-[#afafaf]">التغطية المتبقية</th>
                    <th className="p-1.5 border-r border-[#afafaf]">توقع الوصول لحد الطلب</th>
                    <th className="p-1.5 border-r border-[#afafaf]">فائض المخزون</th>
                    <th className="p-1.5">مؤشر الصحة (Health Score)</th>
                  </tr>
                </thead>
                <tbody>
                  {productIntelligence.all
                    .sort((a, b) => {
                      if (consumptionSort === 'daily') return b.avgDailySales - a.avgDailySales;
                      if (consumptionSort === 'coverage') {
                        if (a.daysCoverage === null && b.daysCoverage === null) return 0;
                        if (a.daysCoverage === null) return 1;
                        if (b.daysCoverage === null) return -1;
                        return a.daysCoverage - b.daysCoverage;
                      }
                      if (consumptionSort === 'upcoming') {
                        if (a.daysUntilReorder === null && b.daysUntilReorder === null) return 0;
                        if (a.daysUntilReorder === null) return 1;
                        if (b.daysUntilReorder === null) return -1;
                        return a.daysUntilReorder - b.daysUntilReorder;
                      }
                      return 0;
                    })
                    .map((p, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{p.code}</td>
                        <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{p.name}</td>
                        <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8]">{p.currentStock}</td>
                        <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{p.avgDailySales.toFixed(2)}</td>
                        <td className="p-1.5 font-mono text-[#555555] border-r border-[#e8e8e8]">{p.avgWeeklySales.toFixed(1)}</td>
                        <td className="p-1.5 font-mono text-[#555555] border-r border-[#e8e8e8]">{p.avgMonthlySales.toFixed(0)}</td>
                        <td className="p-1.5 font-mono font-bold border-r border-[#e8e8e8]">
                          {p.daysCoverage !== null ? (
                            <span className={
                              p.daysCoverage < 3 ? 'text-[#b85c5c]' :
                              p.daysCoverage <= 14 ? 'text-[#e8836a]' :
                              'text-[#4f9d69]'
                            }>
                              {p.daysCoverage.toFixed(1)} يوم
                            </span>
                          ) : (
                            <span className="text-[#888888]">لا توجد بيانات سحب</span>
                          )}
                        </td>
                        <td className="p-1.5 font-mono border-r border-[#e8e8e8]">
                          {p.daysUntilReorder !== null ? (
                            <span className={p.daysUntilReorder <= 7 ? 'text-[#e8836a] font-bold' : 'text-[#555555]'}>
                              {p.daysUntilReorder.toFixed(1)} يوم
                            </span>
                          ) : p.currentStock <= p.minStock ? (
                            <span className="text-[#b85c5c] font-bold">تم بلوغ الحد</span>
                          ) : (
                            <span className="text-[#888888]">-</span>
                          )}
                        </td>
                        <td className="p-1.5 font-mono text-[#243746] border-r border-[#e8e8e8]">
                          {p.overstockUnits > 0 ? (
                            <span className="font-bold text-[#0277BD]">+{p.overstockUnits} وحدة</span>
                          ) : (
                            <span className="text-[#888888]">0</span>
                          )}
                        </td>
                        <td className="p-1.5">
                          {p.healthScore === 'CRITICAL' && (
                            <span className="text-[10px] bg-[#b85c5c] text-white px-1.5 py-0.5 font-bold">🔴 حرج / نواقص</span>
                          )}
                          {p.healthScore === 'REORDER_SOON' && (
                            <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">🟠 إعادة طلب قريباً</span>
                          )}
                          {p.healthScore === 'DEAD_STOCK' && (
                            <span className="text-[10px] bg-[#222222] text-white px-1.5 py-0.5 font-bold">⚫ راكد (0 سحب)</span>
                          )}
                          {p.healthScore === 'NEEDS_ATTENTION' && (
                            <span className="text-[10px] bg-[#8a5d14] text-white px-1.5 py-0.5 font-bold">🟡 حركة بطيئة</span>
                          )}
                          {p.healthScore === 'OVERSTOCK' && (
                            <span className="text-[10px] bg-[#0277BD] text-white px-1.5 py-0.5 font-bold">🔵 فائض مخزون</span>
                          )}
                          {p.healthScore === 'HEALTHY' && (
                            <span className="text-[10px] bg-[#4f9d69] text-white px-1.5 py-0.5 font-bold">🟢 صحي</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 2: PROFITABILITY & SALES VS PROFIT --- */}
        {intelligenceTab === 'profitability' && (
          <div className="space-y-2 p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* High Sales / Low Profit Box */}
              <div className="border border-[#e2c486] bg-[#fdfaf3]">
                <div className="bg-[#8a5d14] text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
                  <span>⚠️ أصناف مبيعاتها عالية ولكن بهامش ربح منخفض (&lt; 15%)</span>
                  <span className="text-[10px] font-mono">{productIntelligence.highSalesLowProfit.length} صنف</span>
                </div>
                <div className="p-1.5 text-[11px] text-[#555555] border-b border-[#e2c486]">
                  تستهلك حجم مبيعات وتخزين كبير مع عائد ربحي ضعيف:
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f7edd6] text-[#222222] border-b border-[#e2c486] text-[10px]">
                        <th className="p-1 border-r border-[#e2c486]">الصنف</th>
                        <th className="p-1 border-r border-[#e2c486]">الكمية</th>
                        <th className="p-1 border-r border-[#e2c486]">المبيعات</th>
                        <th className="p-1 border-r border-[#e2c486]">الربح</th>
                        <th className="p-1">الهامش %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productIntelligence.highSalesLowProfit.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="border-b border-[#f7edd6]">
                          <td className="p-1 font-bold text-[#222222] border-r border-[#f7edd6]">{p.name}</td>
                          <td className="p-1 font-mono font-bold text-[#0277BD] border-r border-[#f7edd6]">{p.quantity}</td>
                          <td className="p-1 font-mono text-[#222222] border-r border-[#f7edd6]">{p.revenue.toFixed(2)}</td>
                          <td className="p-1 font-mono font-bold text-[#8a5d14] border-r border-[#f7edd6]">{p.profit.toFixed(2)}</td>
                          <td className="p-1 font-mono font-bold text-[#b85c5c]">{p.profitMargin.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {productIntelligence.highSalesLowProfit.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-[#888888]">لا توجد أصناف بهامش منخفض</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Sales / High Profit Box */}
              <div className="border border-[#a3d9b1] bg-[#f2f9f4]">
                <div className="bg-[#4f9d69] text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
                  <span>💎 أصناف ذات هامش ربح مرتفع (&gt; 35%) وفرصة نمو</span>
                  <span className="text-[10px] font-mono">{productIntelligence.lowSalesHighProfit.length} صنف</span>
                </div>
                <div className="p-1.5 text-[11px] text-[#555555] border-b border-[#a3d9b1]">
                  أصناف مربحة جداً يمكن زيادة مبيعاتها بالترويج وعرضها في واجهة البيع:
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#dcf0e2] text-[#222222] border-b border-[#a3d9b1] text-[10px]">
                        <th className="p-1 border-r border-[#a3d9b1]">الصنف</th>
                        <th className="p-1 border-r border-[#a3d9b1]">الكمية</th>
                        <th className="p-1 border-r border-[#a3d9b1]">المبيعات</th>
                        <th className="p-1 border-r border-[#a3d9b1]">الربح</th>
                        <th className="p-1">الهامش %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productIntelligence.lowSalesHighProfit.slice(0, 5).map((p, idx) => (
                        <tr key={idx} className="border-b border-[#dcf0e2]">
                          <td className="p-1 font-bold text-[#222222] border-r border-[#dcf0e2]">{p.name}</td>
                          <td className="p-1 font-mono font-bold text-[#0277BD] border-r border-[#dcf0e2]">{p.quantity}</td>
                          <td className="p-1 font-mono text-[#222222] border-r border-[#dcf0e2]">{p.revenue.toFixed(2)}</td>
                          <td className="p-1 font-mono font-bold text-[#4f9d69] border-r border-[#dcf0e2]">{p.profit.toFixed(2)}</td>
                          <td className="p-1 font-mono font-bold text-[#4f9d69]">{p.profitMargin.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {productIntelligence.lowSalesHighProfit.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-[#888888]">لا توجد أصناف بهامش مرتفع</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* General Profitability Table */}
            <div className="border border-[#afafaf]">
              <div className="bg-[#243746] text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
                <span>جدول تحليل ربحية المنتجات الشامل بالتكلفة التاريخية</span>
                <span className="text-[10px] text-[#dceef2]">يتم استبعاد التكاليف المجهولة من الاحتساب لحماية الدقة المحاسبية</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                      <th className="p-1.5 border-r border-[#afafaf]">#</th>
                      <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الفئة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الكمية المباعة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">إجمالي المبيعات (ج.م)</th>
                      <th className="p-1.5 border-r border-[#afafaf]">التكلفة التاريخية (ج.م)</th>
                      <th className="p-1.5 border-r border-[#afafaf]">مجمل الربح (ج.م)</th>
                      <th className="p-1.5">هامش الربح %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productIntelligence.mostProfitable.length > 0 ? (
                      productIntelligence.mostProfitable.map((p, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{p.code}</td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{p.name}</td>
                          <td className="p-1.5 text-[#555555] border-r border-[#e8e8e8]">{p.category}</td>
                          <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{p.quantity}</td>
                          <td className="p-1.5 font-mono font-bold text-[#222222] border-r border-[#e8e8e8]">{p.revenue.toFixed(2)}</td>
                          <td className="p-1.5 font-mono text-[#795548] border-r border-[#e8e8e8]">
                            {p.hasMissingCost ? (p.cost > 0 ? p.cost.toFixed(2) : 'غير متاح') : p.cost.toFixed(2)}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-[#4f9d69] border-r border-[#e8e8e8]">
                            {p.hasMissingCost ? 'غير متاح' : p.profit.toFixed(2)}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-[#243746]">
                            {p.hasMissingCost ? 'غير متاح' : `${p.profitMargin.toFixed(1)}%`}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-[#888888]">
                          لا توجد بيانات مبيعات لحساب الربحية في هذه الفترة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 3: FROZEN CAPITAL & DEAD STOCK & AGING --- */}
        {intelligenceTab === 'deadStock' && (
          <div className="space-y-2 p-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="bg-[#fdfaf3] border border-[#e2c486] p-2">
                <div className="text-[11px] text-[#8a5d14] font-bold">رأس مال الرواكد (0 مبيعات)</div>
                <div className="font-mono text-sm font-bold text-[#b85c5c] mt-1">
                  {frozenCapitalIntelligence.deadStockCapital.toFixed(2)} ج.م
                </div>
                <div className="text-[10px] text-[#777777] mt-0.5">{deadAndSlowStockIntelligence.deadCount} صنف راكد</div>
              </div>

              <div className="bg-[#fff9f8] border border-[#f5c6cb] p-2">
                <div className="text-[11px] text-[#e8836a] font-bold">رأس مال البضاعة البطيئة</div>
                <div className="font-mono text-sm font-bold text-[#e8836a] mt-1">
                  {frozenCapitalIntelligence.slowStockCapital.toFixed(2)} ج.م
                </div>
                <div className="text-[10px] text-[#777777] mt-0.5">{deadAndSlowStockIntelligence.slowCount} صنف بطيء</div>
              </div>

              <div className="bg-[#f0f7f9] border border-[#b8dbe3] p-2">
                <div className="text-[11px] text-[#243746] font-bold">رأس مال فائض المخزون</div>
                <div className="font-mono text-sm font-bold text-[#0277BD] mt-1">
                  {frozenCapitalIntelligence.overstockCapital.toFixed(2)} ج.م
                </div>
                <div className="text-[10px] text-[#777777] mt-0.5">{smartStockAlerts.overstockCount} صنف بفائض</div>
              </div>

              <div className="bg-[#243746] text-white p-2">
                <div className="text-[11px] text-[#dceef2] font-bold">إجمالي رأس المال المجمد</div>
                <div className="font-mono text-base font-bold text-[#e8836a] mt-1">
                  {frozenCapitalIntelligence.totalFrozenCapital.toFixed(2)} ج.م
                </div>
                <div className="text-[10px] text-[#dceef2] mt-0.5">محسوب بدقة التكلفة التاريخية الفعلية</div>
              </div>
            </div>

            <div className="border border-[#afafaf]">
              <div className="bg-[#243746] text-white px-2 py-1 text-xs font-bold flex items-center justify-between">
                <span>جدول تحليل الرواكد، تقادم المخزون ورأس المال المعطل</span>
                <span className="text-[10px] text-[#dceef2]">التقادم يوضح عدد الأيام منذ آخر عملية بيع مسجلة</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                      <th className="p-1.5 border-r border-[#afafaf]">#</th>
                      <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الفئة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الكمية المخزنة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">سعر التكلفة الحقيقي (ج.م)</th>
                      <th className="p-1.5 border-r border-[#afafaf]">رأس المال المجمد (ج.م)</th>
                      <th className="p-1.5 border-r border-[#afafaf]">آخر بيع مسجل</th>
                      <th className="p-1.5 border-r border-[#afafaf]">تقادم المخزون (Aging)</th>
                      <th className="p-1.5">التصنيف الإداري</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...deadAndSlowStockIntelligence.deadItems, ...deadAndSlowStockIntelligence.slowItems].length > 0 ? (
                      [...deadAndSlowStockIntelligence.deadItems.map(d => ({ ...d, type: 'dead' })), ...deadAndSlowStockIntelligence.slowItems.map(s => ({ ...s, type: 'slow' }))].map((itemRow, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{itemRow.item.code}</td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{itemRow.item.name}</td>
                          <td className="p-1.5 text-[#555555] border-r border-[#e8e8e8]">{itemRow.item.category}</td>
                          <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">{itemRow.stock}</td>
                          <td className="p-1.5 font-mono text-[#795548] border-r border-[#e8e8e8]">
                            {itemRow.costPrice !== null ? itemRow.costPrice.toFixed(2) : 'غير مسجل'}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">
                            {itemRow.costPrice !== null ? (itemRow.stock * itemRow.costPrice).toFixed(2) : 'غير متاح'}
                          </td>
                          <td className="p-1.5 font-mono text-[#555555] border-r border-[#e8e8e8]">
                            {itemRow.lastSoldDate || 'لا توجد حركة بيع'}
                          </td>
                          <td className="p-1.5 font-mono text-[#243746] border-r border-[#e8e8e8]">
                            {itemRow.daysSinceLastSale !== null ? `${itemRow.daysSinceLastSale} يوم` : 'غير محدد'}
                          </td>
                          <td className="p-1.5">
                            {itemRow.type === 'dead' ? (
                              <span className="text-[10px] bg-[#222222] text-white px-1.5 py-0.5 font-bold">راكد (0 مبيعات)</span>
                            ) : (
                              <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">بطيء الحركة</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-[#4f9d69] font-bold">
                          ممتاز! لا توجد أصناف راكدة أو بطيئة في هذه الفترة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 4: DISCOUNT PROFIT IMPACT ANALYSIS --- */}
        {intelligenceTab === 'discounts' && (
          <div className="space-y-2 p-2">
            <div className="bg-[#f0f0f0] border border-[#afafaf] p-3">
              <div className="font-bold text-sm text-[#243746] mb-2 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-[#e8836a]" />
                <span>تحليل الأثر المالي للخصومات على مجمل الأرباح (Discount Profit Impact)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 border border-[#afafaf]">
                  <div className="text-[#555555]">إجمالي المبيعات قبل الخصم:</div>
                  <div className="font-mono text-sm font-bold text-[#222222] mt-1">
                    {discountProfitImpact.grossSalesBeforeDiscount.toFixed(2)} ج.م
                  </div>
                </div>

                <div className="bg-white p-2 border border-[#afafaf]">
                  <div className="text-[#b85c5c] font-bold">إجمالي الخصومات الممنوحة:</div>
                  <div className="font-mono text-sm font-bold text-[#b85c5c] mt-1">
                    {discountProfitImpact.totalDiscountAmount.toFixed(2)} ج.م
                  </div>
                </div>

                <div className="bg-white p-2 border border-[#afafaf]">
                  <div className="text-[#4f9d69] font-bold">الربح المحقق بعد الخصم:</div>
                  <div className="font-mono text-sm font-bold text-[#4f9d69] mt-1">
                    {discountProfitImpact.profitAfterDiscount.toFixed(2)} ج.م
                  </div>
                </div>

                <div className="bg-[#243746] text-white p-2 border border-[#243746]">
                  <div className="text-[#dceef2]">نسبة تآكل الأرباح بالخصم:</div>
                  <div className="font-mono text-base font-bold text-[#e8836a] mt-1">
                    {discountProfitImpact.discountImpactPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-[#fdfaf3] border border-[#e2c486] text-xs text-[#8a5d14]">
                <strong>ملاحظة تحليلية:</strong> توضح نسبة تآكل الأرباح المقدار الذي اقتطعته الخصومات من مجمل الربح المحتمل للنشاط التجاري. يتم استخراج البيانات بالكامل من واقع فواتير المبيعات المسجلة دون أي تعديل على قيود الحسابات.
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 5: CUSTOMER INTELLIGENCE & VALUE & DEBT --- */}
        {intelligenceTab === 'customerIntelligence' && (
          <div className="space-y-2 p-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="bg-[#f2f9f4] border border-[#a3d9b1] p-2">
                <div className="text-[#4f9d69] font-bold">العملاء النشطون (&lt;= 30 يوم)</div>
                <div className="font-mono text-sm font-bold text-[#4f9d69] mt-1">
                  {customerIntelligenceMetrics.activeCount} عميل
                </div>
              </div>

              <div className="bg-[#fff9f8] border border-[#f5c6cb] p-2">
                <div className="text-[#e8836a] font-bold">العملاء غير النشطين (&gt; 30 يوم)</div>
                <div className="font-mono text-sm font-bold text-[#e8836a] mt-1">
                  {customerIntelligenceMetrics.inactiveCount} عميل
                </div>
              </div>

              <div className="bg-[#fdf2f2] border border-[#e0a8a8] p-2">
                <div className="text-[#b85c5c] font-bold">إجمالي مديونيات العملاء</div>
                <div className="font-mono text-sm font-bold text-[#b85c5c] mt-1">
                  {customerIntelligenceMetrics.totalOutstandingCustomerDebt.toFixed(2)} ج.م
                </div>
              </div>

              <div className="bg-[#f0f7f9] border border-[#b8dbe3] p-2">
                <div className="text-[#243746] font-bold">عملاء لديهم مديونية قائمة</div>
                <div className="font-mono text-sm font-bold text-[#243746] mt-1">
                  {customerIntelligenceMetrics.debtorsCount} عميل
                </div>
              </div>
            </div>

            <div className="border border-[#afafaf]">
              <div className="bg-[#f0f0f0] border-b border-[#afafaf] p-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#555555]">ترتيب العملاء حسب:</span>
                  <button
                    onClick={() => setCustomerSort('purchases')}
                    className={`px-2 py-0.5 font-bold border text-[11px] ${
                      customerSort === 'purchases'
                        ? 'bg-[#243746] text-white border-[#243746]'
                        : 'bg-white text-[#222222] border-[#afafaf]'
                    }`}
                  >
                    إجمالي المشتريات
                  </button>
                  <button
                    onClick={() => setCustomerSort('profit')}
                    className={`px-2 py-0.5 font-bold border text-[11px] ${
                      customerSort === 'profit'
                        ? 'bg-[#243746] text-white border-[#243746]'
                        : 'bg-white text-[#222222] border-[#afafaf]'
                    }`}
                  >
                    مجمل الربح المحقق
                  </button>
                  <button
                    onClick={() => setCustomerSort('debt')}
                    className={`px-2 py-0.5 font-bold border text-[11px] ${
                      customerSort === 'debt'
                        ? 'bg-[#243746] text-white border-[#243746]'
                        : 'bg-white text-[#222222] border-[#afafaf]'
                    }`}
                  >
                    أعلى مديونية
                  </button>
                  <button
                    onClick={() => setCustomerSort('inactivity')}
                    className={`px-2 py-0.5 font-bold border text-[11px] ${
                      customerSort === 'inactivity'
                        ? 'bg-[#243746] text-white border-[#243746]'
                        : 'bg-white text-[#222222] border-[#afafaf]'
                    }`}
                  >
                    أطول فترة انقطاع (Inactive)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                      <th className="p-1.5 border-r border-[#afafaf]">#</th>
                      <th className="p-1.5 border-r border-[#afafaf]">العميل</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الهاتف</th>
                      <th className="p-1.5 border-r border-[#afafaf]">عدد الفواتير</th>
                      <th className="p-1.5 border-r border-[#afafaf]">إجمالي المشتريات</th>
                      <th className="p-1.5 border-r border-[#afafaf]">متوسط قيمة الفاتورة</th>
                      <th className="p-1.5 border-r border-[#afafaf]">الربح المحقق منه</th>
                      <th className="p-1.5 border-r border-[#afafaf]">المديونية الحالية</th>
                      <th className="p-1.5 border-r border-[#afafaf]">آخر عملية شراء</th>
                      <th className="p-1.5">حالة النشاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerIntelligenceMetrics.all
                      .sort((a, b) => {
                        if (customerSort === 'purchases') return b.totalPurchases - a.totalPurchases;
                        if (customerSort === 'profit') return b.totalProfitGenerated - a.totalProfitGenerated;
                        if (customerSort === 'debt') return b.currentBalance - a.currentBalance;
                        if (customerSort === 'inactivity') return (b.daysSinceLastPurchase || 0) - (a.daysSinceLastPurchase || 0);
                        return 0;
                      })
                      .map((c, idx) => (
                        <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                          <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{c.name}</td>
                          <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{c.phone}</td>
                          <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{c.invoiceCount}</td>
                          <td className="p-1.5 font-mono font-bold text-[#222222] border-r border-[#e8e8e8]">{c.totalPurchases.toFixed(2)}</td>
                          <td className="p-1.5 font-mono text-[#555555] border-r border-[#e8e8e8]">{c.avgInvoiceValue.toFixed(2)}</td>
                          <td className="p-1.5 font-mono font-bold text-[#4f9d69] border-r border-[#e8e8e8]">
                            {c.hasMissingCost ? 'غير متاح' : c.totalProfitGenerated.toFixed(2)}
                          </td>
                          <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">
                            {c.currentBalance > 0 ? (
                              <span className={c.isHighDebt ? 'bg-[#fdf2f2] px-1 py-0.5 text-[#b85c5c]' : ''}>
                                {c.currentBalance.toFixed(2)} ج.م
                              </span>
                            ) : (
                              <span className="text-[#888888]">0.00</span>
                            )}
                          </td>
                          <td className="p-1.5 font-mono text-[#555555] border-r border-[#e8e8e8]">
                            {c.lastInvoiceDate ? (
                              <span>{c.lastInvoiceDate} ({c.daysSinceLastPurchase} يوم)</span>
                            ) : (
                              <span className="text-[#888888]">لا توجد فواتير</span>
                            )}
                          </td>
                          <td className="p-1.5">
                            {c.inactivityStatus === 'active' && (
                              <span className="text-[10px] bg-[#4f9d69] text-white px-1.5 py-0.5 font-bold">نشط</span>
                            )}
                            {c.inactivityStatus === 'inactive' && (
                              <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">غير نشط ({c.daysSinceLastPurchase}+ يوم)</span>
                            )}
                            {c.inactivityStatus === 'no_purchases' && (
                              <span className="text-[10px] bg-[#888888] text-white px-1.5 py-0.5 font-bold">بدون مشتريات</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW 6: BEST SELLER PRODUCTS --- */}
        {intelligenceTab === 'bestSellers' && (
          <div className="space-y-1">
            <div className="bg-[#f0f0f0] border-b border-[#afafaf] p-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#555555]">ترتيب حسب:</span>
                <button
                  onClick={() => setBestSellerSort('qty')}
                  className={`px-2 py-0.5 font-bold border text-[11px] ${
                    bestSellerSort === 'qty'
                      ? 'bg-[#243746] text-white border-[#243746]'
                      : 'bg-white text-[#222222] border-[#afafaf]'
                  }`}
                >
                  الكمية المباعة (Volume)
                </button>
                <button
                  onClick={() => setBestSellerSort('revenue')}
                  className={`px-2 py-0.5 font-bold border text-[11px] ${
                    bestSellerSort === 'revenue'
                      ? 'bg-[#243746] text-white border-[#243746]'
                      : 'bg-white text-[#222222] border-[#afafaf]'
                  }`}
                >
                  إجمالي قيمة المبيعات (Revenue)
                </button>
              </div>

              {categoryIntelligence.topByRevenue.length > 0 && (
                <div className="text-[11px] font-bold text-[#243746] bg-[#dceef2] px-2 py-0.5 border border-[#afafaf]">
                  🌟 الفئة الأعلى مبيعاً: <span className="text-[#e8836a]">{categoryIntelligence.topByRevenue[0].category}</span> ({categoryIntelligence.topByRevenue[0].totalRevenue.toFixed(2)} ج.م)
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                    <th className="p-1.5 border-r border-[#afafaf]">#</th>
                    <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الفئة / القسم</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الكمية المباعة</th>
                    <th className="p-1.5 border-r border-[#afafaf]">إجمالي المبيعات (ج.م)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">المخزون الحالي</th>
                    <th className="p-1.5">حالة المخزون</th>
                  </tr>
                </thead>
                <tbody>
                  {(bestSellerSort === 'qty' ? productIntelligence.bestByQty : productIntelligence.bestByRevenue).length > 0 ? (
                    (bestSellerSort === 'qty' ? productIntelligence.bestByQty : productIntelligence.bestByRevenue).map((p, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{p.code}</td>
                        <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{p.name}</td>
                        <td className="p-1.5 text-[#555555] border-r border-[#e8e8e8]">{p.category}</td>
                        <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{p.quantity}</td>
                        <td className="p-1.5 font-mono font-bold text-[#222222] border-r border-[#e8e8e8]">{p.revenue.toFixed(2)}</td>
                        <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8]">{p.currentStock}</td>
                        <td className="p-1.5">
                          {p.currentStock <= 0 ? (
                            <span className="text-[10px] bg-[#b85c5c] text-white px-1.5 py-0.5 font-bold">نفد (0)</span>
                          ) : p.currentStock <= p.minStock ? (
                            <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">تحت حد الطلب ({p.currentStock})</span>
                          ) : (
                            <span className="text-[10px] bg-[#4f9d69] text-white px-1.5 py-0.5 font-bold">متوفر</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-[#888888]">
                        لا توجد مبيعات أصناف مسجلة في هذه الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 7: SMART STOCK ALERTS & REORDER POINT --- */}
        {intelligenceTab === 'alerts' && (
          <div className="space-y-1">
            <div className="bg-[#f0f0f0] border-b border-[#afafaf] p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="bg-[#fdf2f2] border border-[#e0a8a8] p-1.5 flex items-center justify-between">
                <span className="font-bold text-[#b85c5c]">🔴 أصناف نفدت بالكامل (0):</span>
                <span className="font-mono font-bold text-sm text-[#b85c5c]">{smartStockAlerts.outOfStockCount}</span>
              </div>
              <div className="bg-[#fff9f8] border border-[#f5c6cb] p-1.5 flex items-center justify-between">
                <span className="font-bold text-[#e8836a]">🟠 أصناف تحت حد الطلب:</span>
                <span className="font-mono font-bold text-sm text-[#e8836a]">{smartStockAlerts.lowStockCount}</span>
              </div>
              <div className="bg-[#fdfaf3] border border-[#e2c486] p-1.5 flex items-center justify-between">
                <span className="font-bold text-[#8a5d14]">⏳ أصناف راكدة وبطيئة:</span>
                <span className="font-mono font-bold text-sm text-[#8a5d14]">{smartStockAlerts.deadStockCount + smartStockAlerts.slowStockCount}</span>
              </div>
              <div className="bg-[#f0f7f9] border border-[#b8dbe3] p-1.5 flex items-center justify-between">
                <span className="font-bold text-[#243746]">🔵 أصناف فائض مخزون:</span>
                <span className="font-mono font-bold text-sm text-[#243746]">{smartStockAlerts.overstockCount}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                    <th className="p-1.5 border-r border-[#afafaf]">#</th>
                    <th className="p-1.5 border-r border-[#afafaf]">كود الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">اسم الصنف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الفئة</th>
                    <th className="p-1.5 border-r border-[#afafaf]">المخزون الحالي</th>
                    <th className="p-1.5 border-r border-[#afafaf]">حد الطلب (Reorder Point)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الهدف المخزني (Target)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الطلب المقترح (Suggested)</th>
                    <th className="p-1.5">الأولوية / الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {[...smartStockAlerts.outOfStockItems.map(i => ({ item: i, status: 'OUT', suggested: (i.minStock ?? 5) * 2, target: (i.minStock ?? 5) * 2 })), ...smartStockAlerts.lowStockItems.map(l => ({ item: l.item, status: 'LOW', suggested: l.suggestedReorder, target: l.targetStock }))].length > 0 ? (
                    [...smartStockAlerts.outOfStockItems.map(i => ({ item: i, status: 'OUT', suggested: (i.minStock ?? 5) * 2, target: (i.minStock ?? 5) * 2 })), ...smartStockAlerts.lowStockItems.map(l => ({ item: l.item, status: 'LOW', suggested: l.suggestedReorder, target: l.targetStock }))].map((row, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{row.item.code}</td>
                        <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{row.item.name}</td>
                        <td className="p-1.5 text-[#555555] border-r border-[#e8e8e8]">{row.item.category}</td>
                        <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">{row.item.stock ?? 50}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{row.item.minStock ?? 5}</td>
                        <td className="p-1.5 font-mono text-[#243746] border-r border-[#e8e8e8]">{row.target}</td>
                        <td className="p-1.5 font-mono font-bold text-[#4f9d69] border-r border-[#e8e8e8]">{row.suggested}</td>
                        <td className="p-1.5">
                          {row.status === 'OUT' ? (
                            <span className="text-[10px] bg-[#b85c5c] text-white px-1.5 py-0.5 font-bold">🔴 أولوية قصوى - نفد بالكامل</span>
                          ) : (
                            <span className="text-[10px] bg-[#e8836a] text-white px-1.5 py-0.5 font-bold">🟠 أولوية عاجلة - نقص مخزون</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-[#4f9d69] font-bold">
                        جميع مستويات المخزون آمنة وضمن الحدود المطلوبة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 8: CATEGORY INTELLIGENCE --- */}
        {intelligenceTab === 'categories' && (
          <div className="space-y-1">
            <div className="bg-[#f0f0f0] border-b border-[#afafaf] p-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-[#243746]">
                تحليل أداء الأقسام والتصنيفات المخزنية خلال الفترة المحددة
              </span>
              <span className="text-[11px] text-[#666666]">
                إجمالي التصنيفات: {categoryIntelligence.all.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e8e8e8] text-[#222222] border-b border-[#afafaf] text-[11px]">
                    <th className="p-1.5 border-r border-[#afafaf]">#</th>
                    <th className="p-1.5 border-r border-[#afafaf]">التصنيف / القسم</th>
                    <th className="p-1.5 border-r border-[#afafaf]">عدد الأصناف</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الكميات المباعة</th>
                    <th className="p-1.5 border-r border-[#afafaf]">إجمالي المبيعات (ج.م)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">الخصومات (ج.م)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">التكلفة التاريخية (ج.م)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">مجمل الربح (ج.م)</th>
                    <th className="p-1.5 border-r border-[#afafaf]">هامش الربح %</th>
                    <th className="p-1.5 border-r border-[#afafaf]">نواقص المخزون</th>
                    <th className="p-1.5">الأصناف الراكدة</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryIntelligence.topByRevenue.length > 0 ? (
                    categoryIntelligence.topByRevenue.map((cat, idx) => (
                      <tr key={idx} className="border-b border-[#e8e8e8] hover:bg-[#f9f9f9]">
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{idx + 1}</td>
                        <td className="p-1.5 font-bold text-[#222222] border-r border-[#e8e8e8]">{cat.category}</td>
                        <td className="p-1.5 font-mono text-[#666666] border-r border-[#e8e8e8]">{cat.itemCount}</td>
                        <td className="p-1.5 font-mono font-bold text-[#0277BD] border-r border-[#e8e8e8]">{cat.totalSoldQty}</td>
                        <td className="p-1.5 font-mono font-bold text-[#222222] border-r border-[#e8e8e8]">{(cat.grossRevenue || cat.totalRevenue).toFixed(2)}</td>
                        <td className="p-1.5 font-mono text-[#b85c5c] border-r border-[#e8e8e8]">{(cat.totalDiscounts || 0).toFixed(2)}</td>
                        <td className="p-1.5 font-mono text-[#795548] border-r border-[#e8e8e8]">
                          {cat.hasMissingCost ? (cat.totalCost > 0 ? cat.totalCost.toFixed(2) : 'غير متاح') : cat.totalCost.toFixed(2)}
                        </td>
                        <td className="p-1.5 font-mono font-bold text-[#4f9d69] border-r border-[#e8e8e8]">
                          {cat.hasMissingCost ? 'غير متاح' : cat.totalProfit.toFixed(2)}
                        </td>
                        <td className="p-1.5 font-mono font-bold text-[#243746] border-r border-[#e8e8e8]">
                          {cat.hasMissingCost ? 'غير متاح' : `${cat.profitMargin.toFixed(1)}%`}
                        </td>
                        <td className="p-1.5 font-mono font-bold text-[#b85c5c] border-r border-[#e8e8e8]">{cat.lowStockCount}</td>
                        <td className="p-1.5 font-mono font-bold text-[#8a5d14]">{cat.deadStockCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-[#888888]">
                        لا توجد تصنيفات معرفة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW 9: EXPIRY INTELLIGENCE --- */}
        {intelligenceTab === 'expiry' && (
          <div className="p-4 space-y-2">
            <div className="bg-[#f0f0f0] border border-[#afafaf] p-3 text-xs">
              <div className="flex items-center gap-2 text-[#243746] font-bold text-sm mb-1">
                <Clock className="w-4 h-4 text-[#e8836a]" />
                <span>ذكاء صلاحية المنتجات (Expiry Intelligence)</span>
              </div>
              <div className="text-[#555555] leading-relaxed">
                الحالة: <strong className="text-[#888888]">غير متاح (N/A)</strong> — لا توجد تواريخ انتهاء صلاحية مسجلة في هيكل المنتجات الحالي. حفاظاً على معايير النزاهة المحاسبية والرقابية، لا يتم افتراض أو اختلاق أي تواريخ غير موثقة بقاعدة البيانات.
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
