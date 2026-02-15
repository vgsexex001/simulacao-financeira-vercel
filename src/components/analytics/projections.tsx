"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatBRL } from "@/lib/format";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
} from "lucide-react";

// ---- Original simulator constants ----
const FIXED_EXPENSES = 1184.9;

const SCENARIOS = [
  { label: "Só Cataliad", income: 1333, color: "#ef4444" },
  { label: "Cataliad + Bico", income: 2033, color: "#f59e0b" },
  { label: "Ponto de equilíbrio", income: 2309, color: "#3b82f6" },
  { label: "Confortável", income: 3000, color: "#10b981" },
] as const;

const PROJECTION_MONTHS = 10;

interface ProjectionsProps {
  initialBalance: number;
  fixedExpensesFromDB: number;
  fixedTemplates: { id: string; name: string; amount: number }[];
}

interface MonthProjection {
  month: number;
  label: string;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  netResult: number;
  accumulatedBalance: number;
}

export function Projections({
  initialBalance,
  fixedExpensesFromDB,
  fixedTemplates,
}: ProjectionsProps) {
  const [income, setIncome] = useState(1333);
  const [variableExpenses, setVariableExpenses] = useState(300);

  // Use FIXED_EXPENSES constant (original app logic)
  const fixedExpenses = FIXED_EXPENSES;

  const projection = useMemo(() => {
    const months: MonthProjection[] = [];
    let accumulated = initialBalance;

    for (let i = 1; i <= PROJECTION_MONTHS; i++) {
      const totalExp = fixedExpenses + variableExpenses;
      const net = income - totalExp;
      accumulated += net;

      months.push({
        month: i,
        label: `Mês ${i}`,
        income,
        fixedExpenses,
        variableExpenses,
        totalExpenses: totalExp,
        netResult: net,
        accumulatedBalance: accumulated,
      });
    }
    return months;
  }, [income, variableExpenses, fixedExpenses, initialBalance]);

  const finalBalance = projection[projection.length - 1]?.accumulatedBalance ?? initialBalance;
  const monthlyNet = income - (fixedExpenses + variableExpenses);
  const breakEvenIncome = fixedExpenses + variableExpenses;
  const monthsUntilZero =
    monthlyNet < 0 && initialBalance > 0
      ? Math.ceil(initialBalance / Math.abs(monthlyNet))
      : null;

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Slider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Renda Mensal
            </CardTitle>
            <CardDescription>
              Ajuste sua renda estimada para a simulação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">R$ 0</span>
              <span className="text-xl font-bold text-emerald-500">
                {formatBRL(income)}
              </span>
              <span className="text-sm text-muted-foreground">R$ 6.000</span>
            </div>
            <Slider
              value={[income]}
              onValueChange={(v) => setIncome(v[0])}
              min={0}
              max={6000}
              step={50}
            />

            {/* Preset Scenarios */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cenários rápidos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SCENARIOS.map((scenario) => (
                  <Button
                    key={scenario.label}
                    variant={income === scenario.income ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2 text-xs"
                    onClick={() => setIncome(scenario.income)}
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: scenario.color }}
                    />
                    {scenario.label}
                    <br />
                    {formatBRL(scenario.income)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variable Expenses Slider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Despesas Variáveis
            </CardTitle>
            <CardDescription>
              Alimentação, transporte, lazer, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">R$ 0</span>
              <span className="text-xl font-bold text-red-500">
                {formatBRL(variableExpenses)}
              </span>
              <span className="text-sm text-muted-foreground">R$ 3.000</span>
            </div>
            <Slider
              value={[variableExpenses]}
              onValueChange={(v) => setVariableExpenses(v[0])}
              min={0}
              max={3000}
              step={50}
            />

            {/* Fixed Expenses Summary */}
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Despesas fixas (referência)
              </p>
              <p className="text-lg font-bold">{formatBRL(fixedExpenses)}</p>
              {fixedTemplates.length > 0 && (
                <div className="space-y-1 pt-1">
                  {fixedTemplates.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>{t.name}</span>
                      <span>{formatBRL(t.amount)}</span>
                    </div>
                  ))}
                  {fixedTemplates.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{fixedTemplates.length - 5} mais...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Monthly summary */}
            <div className="flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm">Total mensal</span>
              <span className="font-bold">
                {formatBRL(fixedExpenses + variableExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Projeção de Saldo Acumulado
          </CardTitle>
          <CardDescription>
            Saldo inicial: {formatBRL(initialBalance)} | Resultado mensal:{" "}
            <span
              className={monthlyNet >= 0 ? "text-emerald-500" : "text-red-500"}
            >
              {monthlyNet >= 0 ? "+" : ""}
              {formatBRL(monthlyNet)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={projection}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatBRL(v)}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value) => [
                  formatBRL(Number(value ?? 0)),
                  "Saldo acumulado",
                ]}
                contentStyle={tooltipStyle}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <Bar dataKey="accumulatedBalance" radius={[4, 4, 0, 0]}>
                {projection.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.accumulatedBalance >= 0 ? "#10b981" : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month-by-month Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento Mês a Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">
                    Mês
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                    Renda
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                    Fixas
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                    Variáveis
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                    Resultado
                  </th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                    Acumulado
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-muted/50">
                  <td className="px-3 py-2 font-medium">Início</td>
                  <td className="px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatBRL(initialBalance)}
                  </td>
                </tr>
                {projection.map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{m.label}</td>
                    <td className="px-3 py-2 text-right text-emerald-500">
                      {formatBRL(m.income)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-500">
                      -{formatBRL(m.fixedExpenses)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-500">
                      -{formatBRL(m.variableExpenses)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        m.netResult >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {m.netResult >= 0 ? "+" : ""}
                      {formatBRL(m.netResult)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        m.accumulatedBalance >= 0
                          ? "text-blue-500"
                          : "text-red-500"
                      }`}
                    >
                      {formatBRL(m.accumulatedBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights / Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Diagnóstico e Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main status */}
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                monthlyNet >= 0
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              {monthlyNet >= 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {monthlyNet >= 0
                    ? "Saldo mensal positivo"
                    : "Saldo mensal negativo"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {monthlyNet >= 0
                    ? `Você sobra ${formatBRL(monthlyNet)} por mês. Em ${PROJECTION_MONTHS} meses seu saldo será ${formatBRL(finalBalance)}.`
                    : `Você gasta ${formatBRL(Math.abs(monthlyNet))} a mais do que ganha por mês.`}
                </p>
              </div>
            </div>

            {/* Break-even info */}
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div>
                <p className="font-medium">Ponto de equilíbrio</p>
                <p className="text-sm text-muted-foreground">
                  Para cobrir todas as suas despesas (fixas + variáveis), você
                  precisa ganhar pelo menos{" "}
                  <strong>{formatBRL(breakEvenIncome)}</strong> por mês.
                </p>
              </div>
            </div>

            {/* Months until zero warning */}
            {monthsUntilZero !== null && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-medium text-red-500">
                    Reserva se esgota em ~{monthsUntilZero} meses
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Com o déficit mensal de{" "}
                    {formatBRL(Math.abs(monthlyNet))}, sua reserva de{" "}
                    {formatBRL(initialBalance)} será consumida em
                    aproximadamente {monthsUntilZero} meses.
                  </p>
                </div>
              </div>
            )}

            {/* Final balance projection */}
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                finalBalance >= 0
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div>
                <p className="font-medium">
                  Projeção em {PROJECTION_MONTHS} meses
                </p>
                <p className="text-sm text-muted-foreground">
                  Saldo inicial de {formatBRL(initialBalance)}{" "}
                  {monthlyNet >= 0 ? "+" : "-"}{" "}
                  {formatBRL(Math.abs(monthlyNet))} x {PROJECTION_MONTHS} meses
                  ={" "}
                  <strong
                    className={
                      finalBalance >= 0 ? "text-blue-500" : "text-red-500"
                    }
                  >
                    {formatBRL(finalBalance)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Scenario comparison */}
            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium">Comparação de cenários</p>
              <div className="space-y-2">
                {SCENARIOS.map((scenario) => {
                  const scenarioNet =
                    scenario.income - (fixedExpenses + variableExpenses);
                  const scenarioFinal =
                    initialBalance + scenarioNet * PROJECTION_MONTHS;
                  return (
                    <div
                      key={scenario.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: scenario.color }}
                        />
                        <span>
                          {scenario.label} ({formatBRL(scenario.income)})
                        </span>
                      </div>
                      <span
                        className={`font-medium ${
                          scenarioFinal >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        {scenarioNet >= 0 ? "+" : ""}
                        {formatBRL(scenarioNet)}/mês → {formatBRL(scenarioFinal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
