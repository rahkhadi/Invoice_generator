"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, FileDown, Eye } from "lucide-react";
import { calculateTotals } from "@/lib/calculations";
import type { InvoiceDraft, InvoiceItemDraft, InvoiceStatus } from "@/lib/types";

const blankItem: InvoiceItemDraft = { area: "GENERAL", description: "", qty: 1, uom: "EA", unitPrice: 0, lineTotal: 0 };

function emptyDraft(): InvoiceDraft {
  return {
    invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
    subtotal: 0,
    hst: 0,
    total: 0,
    status: "DRAFT",
    myCompanyName: "",
    myCompanyGstNumber: "",
    myCompanyAddress: "",
    paymentTerms: "Net 30",
    notes: "",
    parserConfidence: 100,
    warnings: [],
    items: [{ ...blankItem }]
  };
}

export default function InvoiceEditor({ mode, invoiceId }: { mode: "new" | "edit"; invoiceId?: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode === "new") {
      const stored = sessionStorage.getItem("invoiceDraft");
      if (stored) {
        setInvoice({ ...emptyDraft(), ...JSON.parse(stored) });
        return;
      }
      fetch("/api/me")
        .then((response) => {
          if (response.status === 401) {
            router.push("/login");
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (!data?.user) {
            router.push("/login");
            return;
          }
          setInvoice((current) => ({
            ...current,
            myCompanyName: data.user.profile?.companyName || "",
            myCompanyGstNumber: data.user.profile?.gstNumber || "",
            myCompanyAddress: data.user.profile?.address || ""
          }));
        });
      return;
    }
    fetch(`/api/invoices/${invoiceId}`)
      .then((response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }
        if (!response.ok) {
          setMessage("Invoice not found or not available for this account.");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data) setInvoice({ ...emptyDraft(), ...data, parserConfidence: 100, warnings: [] });
      })
      .finally(() => setLoading(false));
  }, [invoiceId, mode, router]);

  const totals = useMemo(() => calculateTotals(invoice.items), [invoice.items]);

  function updateField(field: keyof InvoiceDraft, value: string) {
    setInvoice((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index: number, patch: Partial<InvoiceItemDraft>) {
    setInvoice((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        if ("qty" in patch || "unitPrice" in patch) next.lineTotal = Number(next.qty || 0) * Number(next.unitPrice || 0);
        return next;
      });
      return { ...current, items };
    });
  }

  async function saveInvoice() {
    setSaving(true);
    setMessage("");
    const payload = { ...invoice, ...totals };
    const response = await fetch(mode === "new" ? "/api/invoices" : `/api/invoices/${invoiceId}`, {
      method: mode === "new" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      if (response.status === 401) {
        setSaving(false);
        router.push("/login");
        return;
      }
      setMessage("Could not save invoice.");
      setSaving(false);
      return;
    }
    const saved = await response.json();
    sessionStorage.removeItem("invoiceDraft");
    setMessage("Invoice saved.");
    setSaving(false);
    if (mode === "new") router.replace(`/invoices/${saved.id}`);
  }

  async function exportPdf() {
    if (!invoiceId) {
      setMessage("Save the invoice before exporting.");
      return;
    }
    const response = await fetch(`/api/invoices/${invoiceId}/export`, { method: "POST" });
    if (!response.ok) {
      setMessage("Could not export PDF.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  function viewPdf() {
    if (!invoiceId) {
      setMessage("Save the invoice before viewing the PDF.");
      return;
    }
    router.push(`/invoices/${invoiceId}/pdf`);
  }

  async function deleteInvoice() {
    if (!invoiceId) return;
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber} and its uploaded/generated files?`)) return;
    const response = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Could not delete invoice.");
      return;
    }
    router.push("/invoices");
  }

  if (loading) return <section className="p-8 text-sm text-slate-500">Loading invoice...</section>;

  return (
    <section className="p-5 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Review/Edit Invoice</h1>
          <p className="text-sm text-slate-500">All extracted fields and line items are editable before saving.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices" className="btn-secondary">Invoices</Link>
          <button onClick={saveInvoice} disabled={saving} className="btn-primary"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save"}</button>
          <button onClick={viewPdf} className="btn-secondary"><Eye className="h-4 w-4" />View PDF</button>
          <button onClick={exportPdf} className="btn-secondary"><FileDown className="h-4 w-4" />Export PDF</button>
          {mode === "edit" ? <button onClick={deleteInvoice} className="btn-secondary text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button> : null}
        </div>
      </div>

      {invoice.warnings?.length ? (
        <div className="mb-5 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <div className="font-semibold">Parser confidence: {invoice.parserConfidence}%</div>
          <ul className="mt-2 list-disc pl-5">
            {invoice.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}
      {message ? <div className="mb-5 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-950">Your company</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Company name" value={invoice.myCompanyName || ""} onChange={(v) => updateField("myCompanyName", v)} />
              <Field label="GST/HST number" value={invoice.myCompanyGstNumber || ""} onChange={(v) => updateField("myCompanyGstNumber", v)} />
              <Field label="Company address" value={invoice.myCompanyAddress || ""} onChange={(v) => updateField("myCompanyAddress", v)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-950">Work order details</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Invoice #" value={invoice.invoiceNumber} onChange={(v) => updateField("invoiceNumber", v)} />
              <Select label="Status" value={invoice.status} onChange={(v) => updateField("status", v as InvoiceStatus)} options={["DRAFT", "SENT", "PAID"]} />
              <Field label="Work order #" value={invoice.workOrderNumber || ""} onChange={(v) => updateField("workOrderNumber", v)} />
              <Field label="Work order Id #" value={invoice.workOrderId || ""} onChange={(v) => updateField("workOrderId", v)} />
              <Field label="Work order from" value={invoice.company || ""} onChange={(v) => updateField("company", v)} />
              <Field label="Work order company address" value={invoice.companyAddress || ""} onChange={(v) => updateField("companyAddress", v)} />
              <Field label="Work order company phone" value={invoice.companyPhone || ""} onChange={(v) => updateField("companyPhone", v)} />
              <Field label="Sold to / original client" value={invoice.soldToName || ""} onChange={(v) => updateField("soldToName", v)} />
              <Field label="Sold to address" value={invoice.soldToAddress || ""} onChange={(v) => updateField("soldToAddress", v)} />
              <Field label="Work completed by" value={invoice.contractor || ""} onChange={(v) => updateField("contractor", v)} />
              <Field label="W/o type" value={invoice.workOrderType || ""} onChange={(v) => updateField("workOrderType", v)} />
              <Field label="Classification" value={invoice.classification || ""} onChange={(v) => updateField("classification", v)} />
              <Field label="Address" value={invoice.address || ""} onChange={(v) => updateField("address", v)} />
              <Field label="Suite/unit" value={invoice.suite || ""} onChange={(v) => updateField("suite", v)} />
              <Field label="Date" type="date" value={invoice.date || ""} onChange={(v) => updateField("date", v)} />
              <Field label="Deadline" type="date" value={invoice.deadline || ""} onChange={(v) => updateField("deadline", v)} />
              <Field label="Payment terms" value={invoice.paymentTerms || ""} onChange={(v) => updateField("paymentTerms", v)} />
            </div>
            <label className="mt-4 block">Notes</label>
            <textarea className="mt-1 w-full" rows={3} value={invoice.notes || ""} onChange={(event) => updateField("notes", event.target.value)} />
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-950">Line items</h2>
              <button className="btn-secondary" onClick={() => setInvoice((current) => ({ ...current, items: [...current.items, { ...blankItem }] }))}>
                <Plus className="h-4 w-4" />Add item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Area</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3">Unit price</th>
                    <th className="p-3">Line total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="p-2"><input value={item.area || ""} onChange={(e) => updateItem(index, { area: e.target.value })} className="w-32" /></td>
                      <td className="p-2"><input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="w-full min-w-72" /></td>
                      <td className="p-2"><input type="number" value={item.qty} onChange={(e) => updateItem(index, { qty: Number(e.target.value) })} className="w-20" /></td>
                      <td className="p-2"><input value={item.uom || ""} onChange={(e) => updateItem(index, { uom: e.target.value })} className="w-20" /></td>
                      <td className="p-2"><input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} className="w-28" /></td>
                      <td className="p-2"><input type="number" value={item.lineTotal} onChange={(e) => updateItem(index, { lineTotal: Number(e.target.value) })} className="w-28" /></td>
                      <td className="p-2">
                        <button aria-label="Delete line item" className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => setInvoice((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Totals</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Subtotal" value={totals.subtotal} />
            <Row label="HST 13%" value={totals.hst} />
            <div className="border-t border-slate-200 pt-3">
              <Row label="Total" value={totals.total} strong />
            </div>
          </div>
          <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
            Raw extracted text is stored with the invoice for debugging after save.
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-lg font-bold text-slate-950" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value.toLocaleString("en-CA", { style: "currency", currency: "CAD" })}</span>
    </div>
  );
}
