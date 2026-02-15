"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { MONTHS_PT } from "@/lib/constants";
import { PieChartIcon, BarChart3, TrendingDown } from "lucide-react";
import { SpendingHeatmap } from "./spending-heatmap";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface DailyData {
  day: string;
  total: number;
}

interface TopExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  categoryColor: string;
  date: string;
}

interface MonthlyData {
  categoryBreakdown: CategoryData[];
  dailySpending: DailyData[];
  topExpenses: TopExpense[];
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  dailyExpensesMap: Record<number, number>;
}

interface MonthlyAnalyticsProps {
  data: MonthlyData;
  month: number;
  year: number;
}

export function MonthlyAnalytics({ data, month, year }: MonthlyAnalyticsProps) {
  const monthName = MONTHS_PT[month - 1];

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Receitas</p>
            <p className="text-2xl font-bold text-emerald-500">
              {formatBRL(data.totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold text-red-500">
              {formatBRL(data.totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <p
              className={`text-2xl font-bold ${
                data.balance >= 0 ? "text-blue-500" : "text-red-500"
              }`}
            >
              {formatBRL(data.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut Chart - Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Despesas por Categoria
            </CardTitle>
            <CardDescription>
              {monthName} {year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma despesa registrada neste mês
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatBRL(Number(value ?? 0)), "Total"]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Horizontal BarChart - Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Ranking de Categorias
            </CardTitle>
            <CardDescription>
              Top categorias por gasto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma despesa registrada neste mês
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.categoryBreakdown}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatBRL(v)}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={90}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatBRL(Number(value ?? 0)), "Total"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.categoryBreakdown.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <SpendingHeatmap
        dailyExpenses={data.dailyExpensesMap}
        month={month}
        year={year}
      />

      {/* Daily spending chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-primary" />
            Gasto Diário
          </CardTitle>
          <CardDescription>
            Distribuição dos gastos ao longo do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.dailySpending.every((d) => d.total === 0) ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma despesa registrada neste mês
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailySpending}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  hide
                />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value ?? 0)), "Total"]}
                  labelFormatter={(label) => `Dia ${String(label ?? "")}`}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maiores Despesas</CardTitle>
          <CardDescription>
            As 10 maiores despesas do mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa registrada
            </p>
          ) : (
            <div className="space-y-3">
              {data.topExpenses.map((expense, idx) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{expense.description}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: expense.categoryColor }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {expense.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-500">
                    -{formatBRL(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
