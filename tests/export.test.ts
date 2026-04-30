import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(async () => ({
        id: "invoice-1",
        userId: "user-1",
        invoiceNumber: "INV-TEST",
        workOrderNumber: "WO-1",
        contractor: "Northline Renovations",
        company: "Lakeside Property Management",
        address: "123 King Street West",
        suite: "1904",
        classification: "Repair",
        date: new Date("2026-04-28"),
        deadline: new Date("2026-05-02"),
        subtotal: 100,
        hst: 13,
        total: 113,
        status: "DRAFT",
        paymentTerms: "Net 30",
        notes: "",
        rawExtractedText: "",
        uploadedPdfUrl: "",
        generatedPdfUrl: "",
        items: Array.from({ length: 45 }, (_, index) => ({
          area: index % 2 ? "BATHROOM" : "GENERAL",
          description: `Detailed construction line item ${index + 1}`,
          qty: 1,
          uom: "EA",
          unitPrice: 100,
          lineTotal: 100
        }))
      })),
      update: vi.fn(async () => ({}))
    }
  }
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "user-1" }))
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined)
}));

describe("invoice PDF export route", () => {
  it("returns a PDF response", async () => {
    const route = await import("@/app/api/invoices/[id]/export/route");
    const response = await route.POST(new Request("http://localhost"), { params: Promise.resolve({ id: "invoice-1" }) });
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
