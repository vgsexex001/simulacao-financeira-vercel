"use client";

import { useOnboarding } from "@/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, Trash2 } from "lucide-react";

export function StepIncome() {
  const { incomeSources, setIncomeSources } = useOnboarding();

  function addSource() {
    setIncomeSources([...incomeSources, { name: "", amount: 0 }]);
  }

  function removeSource(index: number) {
    setIncomeSources(incomeSources.filter((_, i) => i !== index));
  }

  function updateSource(
    index: number,
    field: "name" | "amount",
    value: string | number
  ) {
    const updated = [...incomeSources];
    updated[index] = { ...updated[index], [field]: value };
    setIncomeSources(updated);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Fontes de receita
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomeSources.map((source, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>Fonte</Label>
              <Input
                value={source.name}
                onChange={(e) => updateSource(i, "name", e.target.value)}
                placeholder="Ex: Salário, Freelance"
              />
            </div>
            <div className="w-36 space-y-1">
              <Label>Valor mensal (R$)</Label>
              <Input
                type="number"
                value={source.amount || ""}
                onChange={(e) =>
                  updateSource(i, "amount", parseFloat(e.target.value) || 0)
                }
                placeholder="0,00"
              />
            </div>
            {incomeSources.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSource(i)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" onClick={addSource} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar fonte
        </Button>
      </CardContent>
    </Card>
  );
}
