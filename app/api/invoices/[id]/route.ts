import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOrNull, normalizeInvoicePayload, serializeInvoice } from "@/lib/invoicePayload";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice || invoice.userId !== user.id) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json(serializeInvoice(invoice));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = normalizeInvoicePayload(await request.json());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      userId: user?.id,
      invoiceNumber: payload.invoiceNumber,
      workOrderNumber: payload.workOrderNumber,
      workOrderId: payload.workOrderId,
      workOrderType: payload.workOrderType,
      contractor: payload.contractor,
      company: payload.company,
      companyAddress: payload.companyAddress,
      companyPhone: payload.companyPhone,
      soldToName: payload.soldToName,
      soldToAddress: payload.soldToAddress,
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
      items: {
        deleteMany: {},
        create: payload.items
      }
    },
    include: { items: true }
  });
  return NextResponse.json(serializeInvoice(invoice));
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
