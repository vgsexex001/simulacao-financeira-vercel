"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { JAR_CONFIG, type JarType } from "@/lib/constants";
import { formatBRL } from "@/lib/format";
import { FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { JarDetail } from "./jar-detail";

interface JarGridProps {
  jarRules: Record<string, number>;
  jarBalances: Record<string, number>;
  totalIncome: number;
}

export function JarGrid({ jarRules, jarBalances, totalIncome }: JarGridProps) {
  const jars = Object.entries(JAR_CONFIG) as [JarType, (typeof JAR_CONFIG)[JarType]][];
  const [selectedJar, setSelectedJar] = useState<JarType | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-primary" />
            Jarros do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {jars.map(([key, config], index) => {
              const percent = jarRules[key] || 0;
              const allocated = (totalIncome * percent) / 100;
              const spent = jarBalances[key] || 0;
              const remaining = Math.max(0, allocated - spent);
              const usedPercent =
                allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
              const isOverBudget = spent > allocated && allocated > 0;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`rounded-xl border p-4 space-y-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    isOverBudget
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedJar(key)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ background: config.color }}
                    />
                    <span className="text-sm font-semibold truncate">
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Alocado</p>
                    <p className="text-lg font-bold font-mono">
                      {formatBRL(allocated)}
                    </p>
                  </div>

                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                    style={{ transformOrigin: "left" }}
                  >
                    <Progress
                      value={usedPercent}
                      className="h-2.5"
                      style={
                        {
                          "--progress-color": isOverBudget
                            ? "hsl(var(--destructive))"
                            : config.color,
                        } as React.CSSProperties
                      }
                    />
                  </motion.div>

                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Gasto
                      </p>
                      <p className="text-xs font-semibold font-mono">
                        {formatBRL(spent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Resta
                      </p>
                      <p
                        className={`text-xs font-semibold font-mono ${
                          isOverBudget ? "text-destructive" : ""
                        }`}
                      >
                        {isOverBudget
                          ? `-${formatBRL(spent - allocated)}`
                          : formatBRL(remaining)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">
                      {percent}% da receita
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {usedPercent.toFixed(0)}% usado
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedJar && (
        <JarDetail
          open={!!selectedJar}
          onOpenChange={(open) => !open && setSelectedJar(null)}
          jarType={selectedJar}
          allocated={(totalIncome * (jarRules[selectedJar] || 0)) / 100}
          spent={jarBalances[selectedJar] || 0}
        />
      )}
    </>
  );
}
