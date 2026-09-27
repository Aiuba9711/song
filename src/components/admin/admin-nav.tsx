"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeDollarSign, Camera, FileStack, LayoutDashboard, Package, Receipt, ScrollText, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { payments: BadgeDollarSign, dashboard: LayoutDashboard, products: Package, orders: Receipt, users: Users, templates: FileStack, settings: Settings, audit: ScrollText, photos: Camera };
export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-56 md:shrink-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:sticky md:top-24 md:flex-col">
        {items.map(({ href, label, icon, count }) => {
          const Icon = ICONS[icon];
          // O item mais específico ganha (ex.: /admin/pedidos/pendentes vs /admin/pedidos).
          const active =
            href === "/admin"
              ? pathname === href
              : pathname.startsWith(href) && !items.some((o) => o.href !== href && o.href.startsWith(href) && pathname.startsWith(o.href));
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
                <Icon className="size-4.5 shrink-0" aria-hidden />
                {label}
                {!!count && (
                  <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${count} por verificar`}>
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
