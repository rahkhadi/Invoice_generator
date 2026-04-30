import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/lib/invoicePayload";
import { buildInvoicePdf } from "@/lib/pdfExport";
import { getCurrentUser } from "@/lib/auth";
import { putObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwnedInvoice(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice || invoice.userId !== user.id) return { error: NextResponse.json({ error: "Invoice not found." }, { status: 404 }) };
  return { invoice };
}

async function generateAndStorePdf(invoice: any) {
  const serialized = serializeInvoice(invoice);
  const pdf = await buildInvoicePdf({ ...serialized, parserConfidence: 100, warnings: [] });
  const fileName = `${invoice.invoiceNumber.replace(/[^a-z0-9-]/gi, "_")}.pdf`;
  await putObject(`exports/${invoice.userId}/${fileName}`, pdf, "application/pdf", `exports/${fileName}`);
  await prisma.invoice.update({ where: { id: invoice.id }, data: { generatedPdfUrl: `/api/invoices/${invoice.id}/export` } });
  return { pdf, fileName };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOwnedInvoice(id);
  if (result.error) return result.error;

  const { pdf, fileName } = await generateAndStorePdf(result.invoice);
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`
    }
  });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadOwnedInvoice(id);
  if (result.error) return result.error;

  const { pdf, fileName } = await generateAndStorePdf(result.invoice);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
