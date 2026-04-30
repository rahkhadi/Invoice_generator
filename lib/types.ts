export type InvoiceStatus = "DRAFT" | "SENT" | "PAID";

export type InvoiceItemDraft = {
  area?: string;
  description: string;
  qty: number;
  uom?: string;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDraft = {
  invoiceNumber: string;
  workOrderNumber?: string;
  workOrderId?: string;
  workOrderType?: string;
  contractor?: string;
  company?: string;
  companyAddress?: string;
  companyPhone?: string;
  soldToName?: string;
  soldToAddress?: string;
  myCompanyName?: string;
  myCompanyGstNumber?: string;
  myCompanyAddress?: string;
  address?: string;
  suite?: string;
  classification?: string;
  date?: string;
  deadline?: string;
  subtotal: number;
  hst: number;
  total: number;
  status: InvoiceStatus;
  paymentTerms?: string;
  notes?: string;
  rawExtractedText?: string;
  uploadedPdfUrl?: string;
  generatedPdfUrl?: string;
  parserConfidence: number;
  warnings: string[];
  items: InvoiceItemDraft[];
};
