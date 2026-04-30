"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Gauge, Upload, UserRound } from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:mt-8 md:block md:space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
              active ? "bg-white text-navy shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
