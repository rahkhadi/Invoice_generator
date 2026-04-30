"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function DownloadPdfButton({ invoiceId, label = "Download PDF", className = "btn-primary" }: { invoiceId: string; label?: string; className?: string }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/export?download=1`);
      if (!response.ok) throw new Error("PDF download failed.");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || `invoice-${invoiceId}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.alert("Could not download this PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button type="button" onClick={downloadPdf} disabled={downloading} className={className}>
      <Download className="h-4 w-4" />{downloading ? "Downloading..." : label}
    </button>
  );
}
