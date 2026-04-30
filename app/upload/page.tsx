"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { InvoiceDraft } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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
            {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
            <button disabled={busy} className="btn-primary" type="submit">{busy ? "Parsing file..." : "Parse work order"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
