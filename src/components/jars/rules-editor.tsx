"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { JAR_CONFIG, JAR_TYPES } from "@/lib/constants";
import { updateJarRules } from "@/actions/jar-actions";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

const JAR_KEYS = Object.values(JAR_TYPES);

interface RulesEditorProps {
  jarRules: Record<string, number>;
}

export function RulesEditor({ jarRules }: RulesEditorProps) {
  const router = useRouter();
  const [rules, setRules] = useState<Record<string, number>>({ ...jarRules });
  const [loading, setLoading] = useState(false);

  const total = Object.values(rules).reduce((a, b) => a + b, 0);
  const isValid = total === 100;
  const hasChanges = JSON.stringify(rules) !== JSON.stringify(jarRules);

  function updateRule(key: string, value: number) {
    setRules((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!isValid) {
      toast.error("A soma das porcentagens deve ser 100%");
      return;
    }

    setLoading(true);
    try {
      const result = await updateJarRules(rules);
      if (result.success) {
        toast.success("Regras atualizadas com sucesso");
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar regras");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          Regras de Distribuicao
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Defina como distribuir sua receita entre os jarros. A soma deve ser
          100%.
        </p>

        {JAR_KEYS.map((key) => {
          const config = JAR_CONFIG[key];
          const value = rules[key] ?? config.defaultPercent;
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: config.color }}
                  />
                  {config.label}
                </Label>
                <span className="text-sm font-mono font-semibold">
                  {value}%
                </span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([v]) => updateRule(key, v)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          );
        })}

        {/* Total validation indicator */}
        <div
          className={`rounded-lg p-3 text-center text-sm font-semibold ${
            isValid
              ? "bg-green-500/10 text-green-500"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          Total: {total}%{" "}
          {!isValid &&
            (total < 100
              ? `(faltam ${100 - total}%)`
              : `(excede em ${total - 100}%)`)}
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          className="w-full"
          disabled={!isValid || loading || !hasChanges}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Regras
        </Button>
      </CardContent>
    </Card>
  );
}
