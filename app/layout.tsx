import type { Metadata } from "next";
import Link from "next/link";
import { PwaRegister } from "./pwa-register";
import { SidebarNav } from "./sidebar-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toronto Construction Invoices",
  description: "Upload construction work orders, review extracted invoice data, and export professional PDFs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Construct Bill"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <div className="min-h-screen md:grid md:grid-cols-[248px_1fr]">
          <aside className="bg-navy text-white md:min-h-screen">
            <div className="flex items-center justify-between px-5 py-4 md:sticky md:top-0 md:block md:px-4 md:py-6">
              <Link href="/dashboard" className="block">
                <div className="text-lg font-bold tracking-tight">Construct Bill</div>
                <div className="text-xs text-slate-400">Toronto invoice desk</div>
              </Link>
              <SidebarNav />
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
