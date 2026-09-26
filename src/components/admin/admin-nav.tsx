"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, LayoutDashboard, Package, Receipt, ScrollText, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { dashboard: LayoutDashboard, products: Package, orders: Receipt, users: Users, templates: FileStack, settings: Settings, audit: ScrollText };
export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-56 md:shrink-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:sticky md:top-24 md:flex-col">
        {items.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap",
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon className="size-4.5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
