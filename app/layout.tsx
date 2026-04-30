import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Gauge, Upload, UserRound } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toronto Construction Invoices",
  description: "Upload construction work orders, review extracted invoice data, and export professional PDFs."
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
          <aside className="bg-navy text-white md:min-h-screen">
            <div className="flex items-center justify-between px-5 py-4 md:block">
              <Link href="/dashboard" className="block">
                <div className="text-lg font-bold">Construct Bill</div>
                <div className="text-xs text-slate-300">Toronto invoice desk</div>
              </Link>
              <nav className="flex gap-1 md:mt-8 md:block md:space-y-1">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
