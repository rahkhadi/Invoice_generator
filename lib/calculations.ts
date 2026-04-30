import type { InvoiceItemDraft } from "./types";

export const HST_RATE = 0.13;

export function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function calculateTotals(items: Pick<InvoiceItemDraft, "qty" | "unitPrice" | "lineTotal">[]) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => {
      const derived = Number(item.qty || 0) * Number(item.unitPrice || 0);
      return sum + (Number(item.lineTotal) > 0 ? Number(item.lineTotal) : derived);
    }, 0)
  );
  const hst = roundCurrency(subtotal * HST_RATE);
  return { subtotal, hst, total: roundCurrency(subtotal + hst) };
}
