"use client";

import { useState } from "react";
import { FixedExpenseList } from "@/components/transactions/fixed-expense-list";
import { FixedExpenseModal } from "@/components/transactions/fixed-expense-modal";

interface FixedExpensesPageClientProps {
  templates: Array<{
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    isActive: boolean;
    categoryId: string;
    categoryName: string;
    categoryColor: string | null;
    categoryIcon: string | null;
  }>;
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  }>;
}

export function FixedExpensesPageClient({
  templates,
  categories,
}: FixedExpensesPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <FixedExpenseList templates={templates} onAdd={() => setModalOpen(true)} />
      <FixedExpenseModal
        categories={categories}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
