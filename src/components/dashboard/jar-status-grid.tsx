"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JAR_CONFIG, type JarType } from "@/lib/constants";
import { formatBRL } from "@/lib/format";
import { FlaskConical } from "lucide-react";

interface JarStatusGridProps {
  jarRules: Record<string, number>;
  jarBalances: Record<string, number>;
  totalIncome: number;
}

export function JarStatusGrid({
  jarRules,
  jarBalances,
  totalIncome,
}: JarStatusGridProps) {
  const jars = Object.entries(JAR_CONFIG);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4 text-primary" />
          Jarros
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalIncome === 0 && (
          <p className="mb-3 text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
            Registre receitas para ver a alocação dos jarros. Os valores são calculados com base na renda do mês.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {jars.map(([key, config]) => {
            const percent = jarRules[key] || 0;
            const allocated = (totalIncome * percent) / 100;
            const spent = jarBalances[key] || 0;
            const remaining = Math.max(0, allocated - spent);
            const usedPercent =
              allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;

            return (
              <div
                key={key}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {percent}%
                  </span>
                </div>
                <Progress
                  value={usedPercent}
                  className="h-2"
                  style={
                    {
                      "--progress-color": config.color,
                    } as React.CSSProperties
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatBRL(spent)} usado</span>
                  <span>{formatBRL(remaining)} resta</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
