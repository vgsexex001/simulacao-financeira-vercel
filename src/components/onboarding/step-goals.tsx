"use client";

import { useOnboarding } from "@/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus, Trash2 } from "lucide-react";

export function StepGoals() {
  const { goals, setGoals } = useOnboarding();

  function addGoal() {
    setGoals([
      ...goals,
      { name: "", targetAmount: 0, icon: "Target", color: "#10b981" },
    ]);
  }

  function removeGoal(index: number) {
    setGoals(goals.filter((_, i) => i !== index));
  }

  function updateGoal(index: number, field: string, value: string | number) {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas financeiras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Opcional — você pode adicionar metas depois também.
        </p>

        {goals.map((goal, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>Meta</Label>
              <Input
                value={goal.name}
                onChange={(e) => updateGoal(i, "name", e.target.value)}
                placeholder="Ex: Reserva de emergência"
              />
            </div>
            <div className="w-36 space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={goal.targetAmount || ""}
                onChange={(e) =>
                  updateGoal(
                    i,
                    "targetAmount",
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeGoal(i)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={addGoal} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar meta
        </Button>
      </CardContent>
    </Card>
  );
}
