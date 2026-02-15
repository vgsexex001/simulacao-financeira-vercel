"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactionModal } from "@/stores/ui-store";

const BOTTOM_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "#fab", label: "Novo", icon: Plus, isFab: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Mais", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();
  const openModal = useTransactionModal((s) => s.open);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {BOTTOM_ITEMS.map((item) => {
          if (item.isFab) {
            return (
              <button
                key={item.href}
                onClick={() => openModal("expense")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
