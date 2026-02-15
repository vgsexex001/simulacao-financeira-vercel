"use client";

import { useOnboarding } from "@/stores/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { JAR_CONFIG, JAR_TYPES } from "@/lib/constants";
import { FlaskConical } from "lucide-react";

const JAR_KEYS = Object.values(JAR_TYPES);

export function StepJars() {
  const { initialBalance, setInitialBalance, jarRules, setJarRules } =
    useOnboarding();

  const total = Object.values(jarRules).reduce((a, b) => a + b, 0);

  function updateJar(key: string, value: number) {
    setJarRules({ ...jarRules, [key]: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Sistema de Jarros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Saldo inicial (R$)</Label>
          <Input
            type="number"
            value={initialBalance || ""}
            onChange={(e) =>
              setInitialBalance(parseFloat(e.target.value) || 0)
            }
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Quanto você tem disponível agora para começar
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina como distribuir sua receita. A soma deve ser 100%.
          </p>

          {JAR_KEYS.map((key) => {
            const config = JAR_CONFIG[key];
            const value = jarRules[key as keyof typeof jarRules];
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
                  onValueChange={([v]) => updateJar(key, v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            );
          })}

          <div
            className={`rounded-lg p-3 text-center text-sm font-semibold ${
              total === 100
                ? "bg-green-500/10 text-green-500"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            Total: {total}% {total !== 100 && `(faltam ${100 - total}%)`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
