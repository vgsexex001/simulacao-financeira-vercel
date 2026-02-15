"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBRL } from "@/lib/format";

interface MonthPulseProps {
  dailyExpenses: Record<number, number>;
}

export function MonthPulse({ dailyExpenses }: MonthPulseProps) {
  const today = new Date().getDate();
  const data = Array.from({ length: today }, (_, i) => ({
    day: i + 1,
    amount: dailyExpenses[i + 1] || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Gastos do mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => d.amount === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum gasto registrado
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value) => [formatBRL(Number(value ?? 0)), "Gastos"]}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="amount"
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
