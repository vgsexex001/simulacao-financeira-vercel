"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";


import { formatBRL } from "@/lib/format";
import {
  Plus,
  Target,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
} from "@/actions/goal-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  createdAt: string;
  contributionsCount: number;
}

interface GoalsListProps {
  goals: GoalItem[];
}

const GOAL_COLORS = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#f97316", label: "Laranja" },
];

export function GoalsList({ goals }: GoalsListProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(
    null
  );
  const [contributionAmount, setContributionAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");

  function openNewGoal() {
    setEditingGoal(null);
    setFormName("");
    setFormTarget("");
    setFormDeadline("");
    setFormColor("#3b82f6");
    setSheetOpen(true);
  }

  function openEditGoal(goal: GoalItem) {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(String(goal.targetAmount));
    setFormDeadline(goal.deadline ? goal.deadline.split("T")[0] : "");
    setFormColor(goal.color || "#3b82f6");
    setSheetOpen(true);
  }

  async function handleSubmitGoal() {
    if (!formName.trim() || !formTarget) {
      toast.error("Preencha o nome e o valor alvo");
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formName.trim(),
        targetAmount: parseFloat(formTarget),
        deadline: formDeadline || undefined,
        color: formColor,
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, data);
        toast.success("Meta atualizada");
      } else {
        await createGoal(data);
        toast.success("Meta criada");
      }

      setSheetOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar meta");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(goalId: string) {
    try {
      await deleteGoal(goalId);
      toast.success("Meta removida");
      router.refresh();
    } catch {
      toast.error("Erro ao remover meta");
    }
  }

  async function handleContribute(goalId: string) {
    const amount = parseFloat(contributionAmount);
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      const result = await contributeToGoal({ goalId, amount });
      if (result.isCompleted) {
        toast.success("Parabéns! Meta concluída!");
      } else {
        toast.success("Contribuição registrada");
      }
      setContributingGoalId(null);
      setContributionAmount("");
      router.refresh();
    } catch {
      toast.error("Erro ao contribuir");
    } finally {
      setLoading(false);
    }
  }

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas Financeiras
            </CardTitle>
            <Button size="sm" onClick={openNewGoal}>
              <Plus className="mr-1 h-4 w-4" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma meta definida. Crie sua primeira meta!
            </p>
          ) : (
            <div className="space-y-8">
              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Em andamento ({activeGoals.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeGoals.map((goal) => {
                      const percent =
                        goal.targetAmount > 0
                          ? (goal.currentAmount / goal.targetAmount) * 100
                          : 0;

                      return (
                        <Card
                          key={goal.id}
                          className="relative overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 h-1 w-full"
                            style={{
                              backgroundColor: goal.color || "#3b82f6",
                            }}
                          />
                          <CardContent className="pt-5 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">
                                  {goal.name}
                                </h4>
                                {goal.deadline && (
                                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(
                                      new Date(goal.deadline),
                                      "dd/MM/yyyy",
                                      { locale: ptBR }
                                    )}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditGoal(goal)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(goal.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {formatBRL(goal.currentAmount)}
                                </span>
                                <span className="font-medium">
                                  {formatBRL(goal.targetAmount)}
                                </span>
                              </div>
                              <Progress
                                value={Math.min(percent, 100)}
                                className="h-2.5"
                              />
                              <p className="text-xs text-right text-muted-foreground">
                                {percent.toFixed(1)}%
                              </p>
                            </div>

                            {/* Contribution section */}
                            {contributingGoalId === goal.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Valor"
                                  value={contributionAmount}
                                  onChange={(e) =>
                                    setContributionAmount(e.target.value)
                                  }
                                  className="h-8 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                                <Button
                                  size="sm"
                                  className="h-8 shrink-0"
                                  disabled={loading}
                                  onClick={() => handleContribute(goal.id)}
                                >
                                  OK
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 shrink-0"
                                  onClick={() => {
                                    setContributingGoalId(null);
                                    setContributionAmount("");
                                  }}
                                >
                                  X
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                  setContributingGoalId(goal.id)
                                }
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Contribuir
                              </Button>
                            )}

                            <p className="text-xs text-muted-foreground text-center">
                              {goal.contributionsCount} contribuição
                              {goal.contributionsCount !== 1 ? "ões" : ""}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    Concluídas ({completedGoals.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {completedGoals.map((goal) => (
                      <Card
                        key={goal.id}
                        className="relative overflow-hidden opacity-80"
                      >
                        <div
                          className="absolute top-0 left-0 h-1 w-full"
                          style={{
                            backgroundColor: goal.color || "#10b981",
                          }}
                        />
                        <CardContent className="pt-5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                {goal.name}
                                <Badge
                                  variant="default"
                                  className="bg-green-500 text-xs"
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Concluída
                                </Badge>
                              </h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(goal.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Progress value={100} className="h-2.5" />
                            <p className="text-xs text-muted-foreground text-right">
                              {formatBRL(goal.currentAmount)} /{" "}
                              {formatBRL(goal.targetAmount)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet modal for creating/editing goals */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingGoal ? "Editar Meta" : "Nova Meta"}
            </SheetTitle>
            <SheetDescription>
              {editingGoal
                ? "Atualize os dados da sua meta financeira."
                : "Defina uma nova meta financeira para acompanhar seu progresso."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nome da meta</Label>
              <Input
                id="goal-name"
                placeholder="Ex: Fundo de emergência"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-target">Valor alvo (R$)</Label>
              <Input
                id="goal-target"
                type="number"
                placeholder="0.00"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <select
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="border-input bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              >
                {GOAL_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitGoal}
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : editingGoal
                  ? "Atualizar Meta"
                  : "Criar Meta"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
