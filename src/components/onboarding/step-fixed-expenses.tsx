"use client";

import { useOnboarding } from "@/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Plus, Trash2 } from "lucide-react";

const TEMPLATES = [
  { name: "Aluguel", amount: 0, dueDay: 10, category: "Moradia" },
  { name: "Energia", amount: 0, dueDay: 15, category: "Moradia" },
  { name: "Internet", amount: 0, dueDay: 20, category: "Assinaturas" },
  { name: "Celular", amount: 0, dueDay: 20, category: "Assinaturas" },
  { name: "Streaming", amount: 0, dueDay: 1, category: "Lazer" },
];

export function StepFixedExpenses() {
  const { fixedExpenses, setFixedExpenses } = useOnboarding();

  function addExpense() {
    setFixedExpenses([
      ...fixedExpenses,
      { name: "", amount: 0, dueDay: 1, category: "Outros" },
    ]);
  }

  function addTemplate(template: (typeof TEMPLATES)[0]) {
    if (!fixedExpenses.some((e) => e.name === template.name)) {
      setFixedExpenses([...fixedExpenses, { ...template }]);
    }
  }

  function removeExpense(index: number) {
    setFixedExpenses(fixedExpenses.filter((_, i) => i !== index));
  }

  function updateExpense(
    index: number,
    field: string,
    value: string | number
  ) {
    const updated = [...fixedExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setFixedExpenses(updated);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Despesas fixas mensais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <Button
              key={t.name}
              variant="outline"
              size="sm"
              onClick={() => addTemplate(t)}
              disabled={fixedExpenses.some((e) => e.name === t.name)}
            >
              <Plus className="mr-1 h-3 w-3" />
              {t.name}
            </Button>
          ))}
        </div>

        {fixedExpenses.map((expense, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Nome</Label>
              <Input
                value={expense.name}
                onChange={(e) => updateExpense(i, "name", e.target.value)}
                placeholder="Ex: Aluguel"
              />
            </div>
            <div className="w-28 space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={expense.amount || ""}
                onChange={(e) =>
                  updateExpense(i, "amount", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="w-20 space-y-1">
              <Label>Dia</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={expense.dueDay}
                onChange={(e) =>
                  updateExpense(i, "dueDay", parseInt(e.target.value) || 1)
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeExpense(i)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" onClick={addExpense} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar despesa fixa
        </Button>
      </CardContent>
    </Card>
  );
}
