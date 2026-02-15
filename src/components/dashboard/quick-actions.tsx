"use client";

import { Button } from "@/components/ui/button";
import { useTransactionModal } from "@/stores/ui-store";
import { Plus, TrendingUp, ArrowLeftRight, Target } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const openModal = useTransactionModal((s) => s.open);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Button
        variant="outline"
        className="h-auto flex-col gap-2 py-4"
        onClick={() => openModal("expense")}
      >
        <Plus className="h-5 w-5 text-red-500" />
        <span className="text-xs">Add Gasto</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto flex-col gap-2 py-4"
        onClick={() => openModal("income")}
      >
        <TrendingUp className="h-5 w-5 text-green-500" />
        <span className="text-xs">Add Receita</span>
      </Button>
      <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
        <Link href="/jars">
          <ArrowLeftRight className="h-5 w-5 text-blue-500" />
          <span className="text-xs">Transferir</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
        <Link href="/goals">
          <Target className="h-5 w-5 text-emerald-500" />
          <span className="text-xs">Contribuir Meta</span>
        </Link>
      </Button>
    </div>
  );
}
