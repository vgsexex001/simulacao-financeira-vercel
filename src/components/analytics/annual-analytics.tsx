"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { MONTHS_SHORT_PT } from "@/lib/constants";
import { TrendingUp, BarChart3, Layers, Radar as RadarIcon, Table } from "lucide-react";

interface MonthData {
  month: number;
  income: number;
  expenses: number;
  balance: number;
}

interface CategoryTrend {
  name: string;
  color: string;
  months: number[];
}

interface AnnualData {
  monthlyData: MonthData[];
  categoryTrends: CategoryTrend[];
  totalIncome: number;
  totalExpenses: number;
  annualBalance: number;
  initialBalance: number;
}

interface AnnualAnalyticsProps {
  data: AnnualData;
  year: number;
}

export function AnnualAnalytics({ data, year }: AnnualAnalyticsProps) {
  const chartData = data.monthlyData.map((m) => ({
    name: MONTHS_SHORT_PT[m.month - 1],
    income: m.income,
    expenses: m.expenses,
    balance: m.balance,
  }));

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  // Top 5 category trends for the chart
  const topTrends = data.categoryTrends.slice(0, 5);
  const trendChartData = MONTHS_SHORT_PT.map((monthLabel, idx) => {
    const row: Record<string, string | number> = { name: monthLabel };
    for (const trend of topTrends) {
      row[trend.name] = trend.months[idx];
    }
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Receita anual</p>
            <p className="text-2xl font-bold text-emerald-500">
              {formatBRL(data.totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Despesas anuais</p>
            <p className="text-2xl font-bold text-red-500">
              {formatBRL(data.totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Balanço anual</p>
            <p
              className={`text-2xl font-bold ${
                data.annualBalance >= 0 ? "text-blue-500" : "text-red-500"
              }`}
            >
              {formatBRL(data.annualBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Saldo geral</p>
            <p
              className={`text-2xl font-bold ${
                data.initialBalance + data.annualBalance >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatBRL(data.initialBalance + data.annualBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Income / Expenses / Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução Mensal - {year}
          </CardTitle>
          <CardDescription>
            Receitas, despesas e saldo ao longo do ano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatBRL(Number(v ?? 0))}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value ?? 0);
                  const labels: Record<string, string> = {
                    income: "Receitas",
                    expenses: "Despesas",
                    balance: "Saldo",
                  };
                  const nameStr = String(name ?? "");
                  return [formatBRL(v), labels[nameStr] || nameStr];
                }}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    income: "Receitas",
                    expenses: "Despesas",
                    balance: "Saldo",
                  };
                  return labels[value] || value;
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grouped BarChart - Monthly Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparativo Mensal - {year}
          </CardTitle>
          <CardDescription>
            Receitas e despesas lado a lado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatBRL(Number(v ?? 0))}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value ?? 0);
                  const labels: Record<string, string> = {
                    income: "Receitas",
                    expenses: "Despesas",
                  };
                  const nameStr = String(name ?? "");
                  return [formatBRL(v), labels[nameStr] || nameStr];
                }}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    income: "Receitas",
                    expenses: "Despesas",
                  };
                  return labels[value] || value;
                }}
              />
              <Bar
                dataKey="income"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
              <Bar
                dataKey="expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Trends */}
      {topTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Tendência por Categoria - {year}
            </CardTitle>
            <CardDescription>
              Top 5 categorias de despesa ao longo do ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatBRL(Number(v ?? 0))}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value ?? 0)), ""]}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                {topTrends.map((trend) => (
                  <Line
                    key={trend.name}
                    type="monotone"
                    dataKey={trend.name}
                    stroke={trend.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {/* Radar Chart - Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RadarIcon className="h-4 w-4 text-primary" />
            Raio-X Financeiro - {year}
          </CardTitle>
          <CardDescription>
            Indicadores de saúde financeira (0 a 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const savingsRate = data.totalIncome > 0
              ? Math.min(100, Math.max(0, ((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100 * 2))
              : 0;
            const incomeStability = data.monthlyData.filter((m) => m.income > 0).length / 12 * 100;
            const expenseControl = data.totalIncome > 0
              ? Math.min(100, Math.max(0, (1 - data.totalExpenses / data.totalIncome) * 200))
              : 0;
            const consistency = data.monthlyData.filter((m) => m.balance >= 0).length / 12 * 100;
            const diversification = Math.min(100, data.categoryTrends.length * 15);

            const radarData = [
              { metric: "Poupança", value: Math.round(savingsRate) },
              { metric: "Estabilidade", value: Math.round(incomeStability) },
              { metric: "Controle", value: Math.round(expenseControl) },
              { metric: "Consistência", value: Math.round(consistency) },
              { metric: "Diversificação", value: Math.round(diversification) },
            ];

            return (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0)}/100`, "Score"]}
                    contentStyle={tooltipStyle}
                  />
                </RadarChart>
              </ResponsiveContainer>
            );
          })()}
        </CardContent>
      </Card>

      {/* Annual Table - Categories x Months */}
      {data.categoryTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table className="h-4 w-4 text-primary" />
              Raio-X Anual - {year}
            </CardTitle>
            <CardDescription>
              Despesas por categoria e mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground sticky left-0 bg-card">
                      Categoria
                    </th>
                    {MONTHS_SHORT_PT.map((m) => (
                      <th key={m} className="text-right py-2 px-2 font-medium text-muted-foreground">
                        {m}
                      </th>
                    ))}
                    <th className="text-right py-2 pl-3 font-bold text-muted-foreground border-l">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryTrends.slice(0, 10).map((cat) => {
                    const total = cat.months.reduce((s, v) => s + v, 0);
                    const maxMonth = Math.max(...cat.months);
                    return (
                      <tr key={cat.name} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-medium sticky left-0 bg-card">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: cat.color }}
                            />
                            <span className="truncate max-w-[100px]">{cat.name}</span>
                          </div>
                        </td>
                        {cat.months.map((val, idx) => (
                          <td
                            key={idx}
                            className={`text-right py-2 px-2 font-mono ${
                              val === maxMonth && val > 0
                                ? "font-bold text-red-500"
                                : val === 0
                                ? "text-muted-foreground/40"
                                : ""
                            }`}
                          >
                            {val > 0 ? formatBRL(val) : "-"}
                          </td>
                        ))}
                        <td className="text-right py-2 pl-3 font-mono font-bold border-l">
                          {formatBRL(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-2 pr-3 font-bold sticky left-0 bg-card">Total</td>
                    {MONTHS_SHORT_PT.map((_, idx) => {
                      const monthTotal = data.categoryTrends.reduce(
                        (sum, cat) => sum + cat.months[idx],
                        0
                      );
                      return (
                        <td key={idx} className="text-right py-2 px-2 font-mono font-bold">
                          {monthTotal > 0 ? formatBRL(monthTotal) : "-"}
                        </td>
                      );
                    })}
                    <td className="text-right py-2 pl-3 font-mono font-bold border-l text-red-500">
                      {formatBRL(data.totalExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
