"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "@/components/shared/install-banner";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transactions": "Transações",
  "/fixed-expenses": "Despesas Fixas",
  "/jars": "Jarros",
  "/analytics": "Analytics",
  "/goals": "Metas",
  "/reports": "Relatórios",
  "/settings": "Configurações",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = PAGE_TITLES[pathname] || "FinPulse";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            {children}
          </div>
        </main>

        <BottomNav />
        <InstallBanner />
      </div>
    </div>
  );
}
