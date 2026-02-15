"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { JAR_CONFIG, type JarType } from "@/lib/constants";
import { MONTHS_SHORT_PT } from "@/lib/constants";
import { getJarDetail } from "@/actions/jar-actions";
import { Loader2, Lightbulb } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface JarDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jarType: JarType;
  allocated: number;
  spent: number;
}

export function JarDetail({
  open,
  onOpenChange,
  jarType,
  allocated,
  spent,
}: JarDetailProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    transactions: Array<{
      id: string;
      amount: number;
      description: string;
      date: string;
      categoryName: string;
      categoryColor: string | null;
    }>;
    monthlyHistory: Array<{ month: number; year: number; spent: number }>;
  } | null>(null);

  const config = JAR_CONFIG[jarType];

  useEffect(() => {
    if (open) {
      setLoading(true);
      getJarDetail(jarType)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [open, jarType]);

  const chartData = data?.monthlyHistory.map((h) => ({
    name: MONTHS_SHORT_PT[h.month - 1],
    gasto: h.spent,
    alocado: allocated,
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: config.color }}
            />
            {config.label}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Alocado</p>
                  <p className="text-sm font-bold font-mono">{formatBRL(allocated)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Gasto</p>
                  <p className="text-sm font-bold font-mono text-red-500">{formatBRL(spent)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Resta</p>
                  <p className={`text-sm font-bold font-mono ${allocated - spent >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatBRL(Math.max(0, allocated - spent))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{config.tip}</p>
            </div>

            {/* History chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Gastos nos últimos 6 meses
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => formatBRL(Number(value ?? 0))}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="gasto" fill={config.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Transactions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Transações do mês
              </p>
              {data?.transactions.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhuma transação neste jarro este mês
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {data?.transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: t.categoryColor || "#6366f1" }}
                        />
                        <div>
                          <p className="text-xs font-medium">{t.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.categoryName} &middot;{" "}
                            {new Date(t.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold">
                        {formatBRL(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
