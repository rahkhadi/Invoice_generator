"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { InvoiceDraft } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 70_000);
    let response: Response;
    try {
      response = await fetch("/api/upload-work-order", { method: "POST", body: formData, signal: controller.signal });
    } catch {
      setError("Parsing took too long or the server stopped responding. Try cropping the image closer to the work order, then upload again.");
      setBusy(false);
      window.clearTimeout(timer);
      return;
    }
    window.clearTimeout(timer);
    try {
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        setError((await response.json()).error || "Upload failed.");
        setBusy(false);
        return;
      }
      const draft = (await response.json()) as InvoiceDraft;
      sessionStorage.setItem("invoiceDraft", JSON.stringify(draft));
      router.push("/invoices/new");
    } catch {
      setError("The upload finished with an unreadable response. Please try again.");
      setBusy(false);
    }
  }

  function createManualInvoice() {
    sessionStorage.removeItem("invoiceDraft");
    router.push("/invoices/new");
  }

  return (
    <section className="p-5 md:p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-950">Create Invoice</h1>
        <p className="mt-1 text-sm text-slate-500">Upload a work order PDF/image or start manually for a quotation/new customer.</p>
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Manual invoice</h2>
          <p className="mt-1 text-sm text-slate-500">Prepare an invoice or quotation without a work order PDF.</p>
          <button className="btn-primary mt-4" onClick={createManualInvoice}>Create manually</button>
        </div>
        <form onSubmit={onSubmit} className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <UploadCloud className="h-12 w-12 text-orange-500" />
            <input name="file" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" required className="w-full max-w-md" />
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <button disabled={busy} className="btn-primary" type="submit">{busy ? "Parsing file, this can take up to 1 minute..." : "Parse work order"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
