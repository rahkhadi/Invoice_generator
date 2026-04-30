import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOrNull, normalizeInvoicePayload, serializeInvoice } from "@/lib/invoicePayload";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([]);
  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json(invoices.map(serializeInvoice));
}

export async function POST(request: Request) {
  const payload = normalizeInvoicePayload(await request.json());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in before saving invoices." }, { status: 401 });
  const invoice = await prisma.invoice.create({
    data: {
      userId: user?.id,
      invoiceNumber: payload.invoiceNumber,
      workOrderNumber: payload.workOrderNumber,
      workOrderId: payload.workOrderId,
      workOrderType: payload.workOrderType,
      contractor: payload.contractor,
      company: payload.company,
      myCompanyName: payload.myCompanyName,
      myCompanyGstNumber: payload.myCompanyGstNumber,
      myCompanyAddress: payload.myCompanyAddress,
      address: payload.address,
      suite: payload.suite,
      classification: payload.classification,
      date: dateOrNull(payload.date),
      deadline: dateOrNull(payload.deadline),
      subtotal: payload.subtotal,
      hst: payload.hst,
      total: payload.total,
      status: payload.status,
      paymentTerms: payload.paymentTerms,
      notes: payload.notes,
      rawExtractedText: payload.rawExtractedText,
      uploadedPdfUrl: payload.uploadedPdfUrl,
      generatedPdfUrl: payload.generatedPdfUrl,
      items: { create: payload.items }
    },
    include: { items: true }
  });
  return NextResponse.json(serializeInvoice(invoice), { status: 201 });
}
