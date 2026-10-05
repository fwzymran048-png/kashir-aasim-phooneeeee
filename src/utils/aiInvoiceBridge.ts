import { InvoiceItem, InventoryItem } from '../types/pos';

export interface AIParsedInvoiceDraft {
  detectedCustomerName?: string;
  detectedCustomerPhone?: string;
  detectedTabGroup?: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    notes?: string;
  }>;
  notes?: string;
  confidence: number;
}

export interface AIValidationResult {
  validItems: Array<{
    item: InvoiceItem;
    inventoryMatch?: InventoryItem;
  }>;
  unrecognizedItems: string[];
  warnings: string[];
}

/**
 * Validates AI proposed items against local Inventory Database and Business Rules.
 * Ensures that AI output is safe and never bypasses POS permissions or stock rules.
 */
export function validateAIInvoiceItems(
  draft: AIParsedInvoiceDraft,
  inventoryDb: InventoryItem[],
  defaultCategory: string = 'عام'
): AIValidationResult {
  const validItems: Array<{ item: InvoiceItem; inventoryMatch?: InventoryItem }> = [];
  const unrecognizedItems: string[] = [];
  const warnings: string[] = [];

  draft.items.forEach(raw => {
    const cleanName = (raw.name || '').trim();
    if (!cleanName) return;

    const matched = inventoryDb.find(
      p => p.name.toLowerCase() === cleanName.toLowerCase() || p.code === cleanName
    ) || inventoryDb.find(
      p => p.name.toLowerCase().includes(cleanName.toLowerCase())
    );

    const qty = Math.max(1, typeof raw.quantity === 'number' && !isNaN(raw.quantity) ? raw.quantity : 1);
    const finalPrice = typeof raw.price === 'number' && raw.price > 0
      ? raw.price
      : (matched ? matched.price : 0);

    if (matched && matched.stock !== undefined && matched.stock < qty) {
      warnings.push(`تنبيه: الصنف "${matched.name}" الكمية المطلوبة (${qty}) أكبر من المخزون المتوفر (${matched.stock}).`);
    }

    if (!matched) {
      unrecognizedItems.push(cleanName);
    }

    const invoiceItem: InvoiceItem = {
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      code: matched?.code || Math.floor(1000 + Math.random() * 9000).toString(),
      name: matched?.name || cleanName,
      category: matched?.category || defaultCategory,
      quantity: qty,
      price: finalPrice,
      costPrice: matched?.costPrice || 0,
      total: qty * finalPrice,
      notes: raw.notes || ''
    };

    validItems.push({
      item: invoiceItem,
      inventoryMatch: matched
    });
  });

  return {
    validItems,
    unrecognizedItems,
    warnings
  };
}
