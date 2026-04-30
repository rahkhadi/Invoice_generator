import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DownloadPdfButton } from "../../download-pdf-button";

export default async function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pdfUrl = `/api/invoices/${id}/export`;

  return (
    <section className="flex min-h-screen flex-col p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/invoices/${id}`} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />Back to invoice
          </Link>
        </div>
        <DownloadPdfButton invoiceId={id} />
      </div>
      <div className="min-h-[70vh] flex-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <iframe title="Invoice PDF preview" src={pdfUrl} className="h-full min-h-[78vh] w-full" />
      </div>
    </section>
  );
}
