import { z } from "zod";
import { calculateTotals } from "./calculations";

export const invoicePayloadSchema = z.object({
  invoiceNumber: z.string().min(1),
  workOrderNumber: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  workOrderType: z.string().optional().nullable(),
  contractor: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  soldToName: z.string().optional().nullable(),
  soldToAddress: z.string().optional().nullable(),
  myCompanyName: z.string().optional().nullable(),
  myCompanyGstNumber: z.string().optional().nullable(),
  myCompanyAddress: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  suite: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "PAID"]).default("DRAFT"),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  rawExtractedText: z.string().optional().nullable(),
  uploadedPdfUrl: z.string().optional().nullable(),
  generatedPdfUrl: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        area: z.string().optional().nullable(),
        description: z.string().min(1),
        qty: z.coerce.number().default(1),
        uom: z.string().optional().nullable(),
        unitPrice: z.coerce.number().default(0),
        lineTotal: z.coerce.number().default(0)
      })
    )
    .default([])
});

export type InvoicePayload = z.infer<typeof invoicePayloadSchema>;

export function normalizeInvoicePayload(payload: unknown) {
  const parsed = invoicePayloadSchema.parse(payload);
  const items = parsed.items.map((item) => ({
    area: item.area || "GENERAL",
    description: item.description,
    qty: item.qty,
    uom: item.uom || "EA",
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal || item.qty * item.unitPrice
  }));
  const totals = calculateTotals(items);
  return { ...parsed, ...totals, items };
}

export function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    date: invoice.date ? invoice.date.toISOString().slice(0, 10) : "",
    deadline: invoice.deadline ? invoice.deadline.toISOString().slice(0, 10) : ""
  };
}
