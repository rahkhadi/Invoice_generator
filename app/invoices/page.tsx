"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Search, Trash2 } from "lucide-react";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  workOrderNumber?: string;
  contractor?: string;
  address?: string;
  status: "DRAFT" | "SENT" | "PAID";
  total: number;
  updatedAt: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    fetch("/api/invoices").then((response) => response.json()).then(setInvoices);
  }, []);

  async function deleteInvoice(id: string, invoiceNumber: string) {
    if (!window.confirm(`Delete invoice ${invoiceNumber} and its uploaded/generated files?`)) return;
    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert("Could not delete this invoice.");
      return;
    }
    setInvoices((current) => current.filter((invoice) => invoice.id !== id));
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return invoices.filter((invoice) => {
      const text = `${invoice.invoiceNumber} ${invoice.workOrderNumber || ""} ${invoice.contractor || ""} ${invoice.address || ""}`.toLowerCase();
      return (status === "ALL" || invoice.status === status) && text.includes(q);
    });
  }, [invoices, query, status]);

  return (
    <section className="p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Invoices</h1>
          <p className="text-sm text-slate-500">Search, filter, edit, and export saved invoices.</p>
        </div>
        <Link href="/upload" className="btn-primary">Upload work order</Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-9" placeholder="Search invoice, work order, contractor, address" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>ALL</option>
          <option>DRAFT</option>
          <option>SENT</option>
          <option>PAID</option>
        </select>
      </div>
      <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">Work order</th>
                <th className="p-3">Contractor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-950"><Link href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td>
                  <td className="p-3">{invoice.workOrderNumber || "-"}</td>
                  <td className="p-3">{invoice.contractor || "-"}</td>
                  <td className="p-3"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{invoice.status}</span></td>
                  <td className="p-3">{invoice.total.toLocaleString("en-CA", { style: "currency", currency: "CAD" })}</td>
                  <td className="p-3">{new Date(invoice.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <a className="btn-secondary px-3 py-1.5" href={`/api/invoices/${invoice.id}/export`} target="_blank" rel="noreferrer">
                        <Eye className="h-4 w-4" />View
                      </a>
                      <a className="btn-secondary px-3 py-1.5" href={`/api/invoices/${invoice.id}/export?download=1`}>
                        <Download className="h-4 w-4" />Download
                      </a>
                      <button className="btn-secondary px-3 py-1.5 text-red-600 hover:bg-red-50" onClick={() => deleteInvoice(invoice.id, invoice.invoiceNumber)}>
                        <Trash2 className="h-4 w-4" />Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr><td className="p-6 text-center text-slate-500" colSpan={7}>No invoices found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
