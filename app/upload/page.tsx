"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, UploadCloud } from "lucide-react";
import type { InvoiceDraft } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  function isImageFile(file: File) {
    return /^image\/(png|jpe?g|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
  }

  async function prepareImageForOcr(file: File) {
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });
      const maxWidth = 1400;
      const scale = image.width > maxWidth ? maxWidth / image.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      return blob || file;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function extractImageText(file: File) {
    setStatus("Reading image on this device...");
    const image = await prepareImageForOcr(file);
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", undefined, {
      langPath: "/ocr",
      gzip: false,
      logger: (message) => {
        if (message.status === "recognizing text") setStatus(`Reading image ${Math.round(message.progress * 100)}%...`);
        else if (message.status) setStatus(message.status);
      }
    });
    try {
      await worker.setParameters({ preserve_interword_spaces: "1" });
      const result = await worker.recognize(image);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (file instanceof File && isImageFile(file)) {
      try {
        const text = await extractImageText(file);
        formData.set("extractedText", text);
        setStatus("Uploading extracted text...");
      } catch {
        setError("Could not read this image on your device. Try cropping the photo closer to the work order, or upload a PDF scan.");
        setBusy(false);
        setStatus("");
        return;
      }
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 70_000);
    let response: Response;
    try {
      response = await fetch("/api/upload-work-order", { method: "POST", body: formData, signal: controller.signal });
    } catch {
      setError("Parsing took too long or the server stopped responding. Try cropping the image closer to the work order, then upload again.");
      setBusy(false);
      setStatus("");
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
        setStatus("");
        return;
      }
      const draft = (await response.json()) as InvoiceDraft;
      sessionStorage.setItem("invoiceDraft", JSON.stringify(draft));
      router.push("/invoices/new");
    } catch {
      setError("The upload finished with an unreadable response. Please try again.");
      setBusy(false);
      setStatus("");
    }
  }

  function createManualInvoice() {
    sessionStorage.removeItem("invoiceDraft");
    router.push("/invoices/new");
  }

  return (
    <section className="page-shell">
      <div className="max-w-4xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Invoice workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Create Invoice</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Upload a work order PDF or photo, or create a clean manual invoice for a new customer.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel p-5">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-orange-600">
                  <Plus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-950">Manual invoice</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Prepare an invoice or quotation without a work order file.</p>
              </div>
              <button className="btn-primary w-fit" onClick={createManualInvoice}>Create manually</button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="panel p-5">
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-orange-500 shadow-sm">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-950">Upload work order</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">PDF, JPG, PNG, or WEBP. Photos are read on your device before the invoice draft is created.</p>
              <label className="mx-auto mt-5 flex max-w-md cursor-pointer items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50/50">
                <FileText className="h-4 w-4 text-orange-500" />
                <span>{selectedFileName || "Choose work order file"}</span>
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  required
                  className="sr-only"
                  onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || "")}
                />
              </label>
              {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
              {status ? <p className="mt-4 text-sm font-medium text-slate-600">{status}</p> : null}
              <button disabled={busy} className="btn-primary mt-5" type="submit">{busy ? "Parsing file..." : "Parse work order"}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
