"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Plus,
  Trash2,
} from "lucide-react";
import { useTransactionModal } from "@/stores/ui-store";
import { deleteExpense, deleteIncome } from "@/actions/transaction-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionItem {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  date: string;
  categoryName?: string;
  categoryColor?: string | null;
  sourceName?: string;
  isFixed?: boolean;
}

interface TransactionListProps {
  expenses: TransactionItem[];
  incomes: TransactionItem[];
  categories: Array<{ id: string; name: string; color: string | null }>;
  sources: Array<{ id: string; name: string }>;
}

export function TransactionList({
  expenses,
  incomes,
}: TransactionListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "variable" | "fixed" | "income"
  >("all");
  const openModal = useTransactionModal((s) => s.open);

  const all: TransactionItem[] = [...expenses, ...incomes]
    .filter((t) => {
      if (filter === "income" && t.type !== "income") return false;
      if (filter === "variable" && (t.type !== "expense" || t.isFixed))
        return false;
      if (filter === "fixed" && (t.type !== "expense" || !t.isFixed))
        return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const grouped = all.reduce<Record<string, TransactionItem[]>>((acc, t) => {
    const dateKey = format(new Date(t.date), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  async function handleDelete(item: TransactionItem) {
    try {
      if (item.type === "expense") {
        await deleteExpense(item.id);
      } else {
        await deleteIncome(item.id);
      }
      toast.success("Transação removida");
      router.refresh();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transações</CardTitle>
          <Button size="sm" onClick={() => openModal("expense")}>
            <Plus className="mr-1 h-4 w-4" />
            Nova
          </Button>
        </div>
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar transações..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                ["all", "Todas"],
                ["variable", "Variáveis"],
                ["fixed", "Fixas"],
                ["income", "Receitas"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(key as typeof filter)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(grouped).length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, items]) => (
              <div key={dateKey}>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {format(new Date(dateKey), "EEEE, dd 'de' MMMM", {
                    locale: ptBR,
                  })}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background:
                              item.type === "expense"
                                ? item.categoryColor || "#ef4444"
                                : "#10b981",
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {item.description}
                            {item.isFixed && (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                              >
                                Fixa
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.type === "expense"
                              ? item.categoryName
                              : item.sourceName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            item.type === "expense"
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {item.type === "expense" ? "-" : "+"}
                          {formatBRL(item.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
