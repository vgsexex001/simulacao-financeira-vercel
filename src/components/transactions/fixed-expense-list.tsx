"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatBRL } from "@/lib/format";
import {
  Plus,
  Trash2,
  CalendarClock,
  Loader2,
  History,
} from "lucide-react";
import {
  updateFixedTemplate,
  deleteFixedTemplate,
  autoRegisterFixedExpenses,
} from "@/actions/fixed-expense-actions";
import { toast } from "sonner";
import { FixedExpenseHistory } from "./fixed-expense-history";

interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
}

interface FixedExpenseListProps {
  templates: FixedExpenseItem[];
  onAdd: () => void;
}

export function FixedExpenseList({ templates, onAdd }: FixedExpenseListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FixedExpenseItem | null>(null);

  const totalFixed = templates
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + t.amount, 0);

  async function handleToggleActive(item: FixedExpenseItem) {
    setLoadingId(item.id);
    try {
      await updateFixedTemplate(item.id, { isActive: !item.isActive });
      toast.success(
        item.isActive ? "Despesa desativada" : "Despesa ativada"
      );
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(item: FixedExpenseItem) {
    setLoadingId(item.id);
    try {
      await deleteFixedTemplate(item.id);
      toast.success("Despesa fixa removida");
      router.refresh();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleAutoRegister() {
    setAutoLoading(true);
    try {
      const result = await autoRegisterFixedExpenses();
      if (result.created > 0) {
        toast.success(
          `${result.created} despesa(s) registrada(s) para este mês`
        );
      } else {
        toast.info("Todas as despesas fixas já foram registradas este mês");
      }
      router.refresh();
    } catch {
      toast.error("Erro ao registrar despesas");
    } finally {
      setAutoLoading(false);
    }
  }

  function openHistory(item: FixedExpenseItem) {
    setSelectedTemplate(item);
    setHistoryOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Despesas Fixas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Total mensal: <span className="font-mono font-semibold text-red-500">{formatBRL(totalFixed)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoRegister}
                disabled={autoLoading}
              >
                {autoLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="mr-1 h-4 w-4" />
                )}
                Gerar mês
              </Button>
              <Button size="sm" onClick={onAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Nova
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma despesa fixa cadastrada
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: item.categoryColor || "#ef4444",
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge
                          variant={item.isActive ? "default" : "secondary"}
                        >
                          {item.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.categoryName} &middot; Dia {item.dueDay}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-red-500">
                      {formatBRL(item.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openHistory(item)}
                      title="Ver histórico"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item)}
                      disabled={loadingId === item.id}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item)}
                      disabled={loadingId === item.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate && (
        <FixedExpenseHistory
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          templateName={selectedTemplate.name}
          categoryId={selectedTemplate.categoryId}
        />
      )}
    </>
  );
}
