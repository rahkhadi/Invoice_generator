import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const invoices = await prisma.invoice.findMany({ where: { userId: user.id } });
  const totalRevenue = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
  const pending = invoices.filter((i) => i.status === "SENT").reduce((sum, i) => sum + i.total, 0);
  const drafts = invoices.filter((i) => i.status === "DRAFT").length;
  const cards = [
    ["Total revenue", totalRevenue.toLocaleString("en-CA", { style: "currency", currency: "CAD" })],
    ["Pending amount", pending.toLocaleString("en-CA", { style: "currency", currency: "CAD" })],
    ["Total invoices", String(invoices.length)],
    ["Drafts", String(drafts)]
  ];
  return (
    <section className="p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">Invoice totals, draft count, and upload entry point.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/new" className="btn-secondary">Manual invoice</Link>
          <Link href="/upload" className="btn-primary">Upload work order</Link>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-2xl font-bold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
