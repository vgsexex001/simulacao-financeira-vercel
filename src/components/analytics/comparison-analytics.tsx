"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
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
import { ArrowUp, ArrowDown, Minus, GitCompare } from "lucide-react";
import { motion } from "framer-motion";

interface ComparisonData {
  currentMonth: {
    month: number;
    year: number;
    categories: Array<{ name: string; color: string; total: number }>;
  };
  previousMonth: {
    month: number;
    year: number;
    categories: Array<{ name: string; color: string; total: number }>;
  };
  categoryTrends: Array<{
    name: string;
    color: string;
    months: Array<{ month: number; value: number }>;
  }>;
}

interface ComparisonAnalyticsProps {
  data: ComparisonData;
}

interface VarianceRow {
  name: string;
  color: string;
  previous: number;
  current: number;
  change: number;
  percentChange: number;
}

export function ComparisonAnalytics({ data }: ComparisonAnalyticsProps) {
  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  const currentLabel = `${MONTHS_SHORT_PT[data.currentMonth.month - 1]}/${data.currentMonth.year}`;
  const previousLabel = `${MONTHS_SHORT_PT[data.previousMonth.month - 1]}/${data.previousMonth.year}`;

  // Build bar chart data: side-by-side bars per category
  const barChartData = useMemo(() => {
    const categoryNames = new Set<string>();
    data.currentMonth.categories.forEach((c) => categoryNames.add(c.name));
    data.previousMonth.categories.forEach((c) => categoryNames.add(c.name));

    return Array.from(categoryNames).map((name) => {
      const current = data.currentMonth.categories.find((c) => c.name === name);
      const previous = data.previousMonth.categories.find((c) => c.name === name);
      return {
        name,
        current: current?.total ?? 0,
        previous: previous?.total ?? 0,
      };
    }).sort((a, b) => (b.current + b.previous) - (a.current + a.previous));
  }, [data.currentMonth.categories, data.previousMonth.categories]);

  // Build variance table rows
  const varianceRows: VarianceRow[] = useMemo(() => {
    const categoryNames = new Set<string>();
    data.currentMonth.categories.forEach((c) => categoryNames.add(c.name));
    data.previousMonth.categories.forEach((c) => categoryNames.add(c.name));

    return Array.from(categoryNames).map((name) => {
      const current = data.currentMonth.categories.find((c) => c.name === name);
      const previous = data.previousMonth.categories.find((c) => c.name === name);
      const currentTotal = current?.total ?? 0;
      const previousTotal = previous?.total ?? 0;
      const change = currentTotal - previousTotal;
      const percentChange = previousTotal === 0
        ? currentTotal > 0 ? 100 : 0
        : ((change) / previousTotal) * 100;

      return {
        name,
        color: current?.color ?? previous?.color ?? "#64748b",
        previous: previousTotal,
        current: currentTotal,
        change,
        percentChange,
      };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [data.currentMonth.categories, data.previousMonth.categories]);

  // Top category trends (sparklines) - take up to 6
  const topTrends = useMemo(() => {
    return data.categoryTrends.slice(0, 6);
  }, [data.categoryTrends]);

  // Total summaries
  const currentTotal = data.currentMonth.categories.reduce((sum, c) => sum + c.total, 0);
  const previousTotal = data.previousMonth.categories.reduce((sum, c) => sum + c.total, 0);
  const totalChange = currentTotal - previousTotal;
  const totalPercentChange = previousTotal === 0
    ? currentTotal > 0 ? 100 : 0
    : (totalChange / previousTotal) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{previousLabel}</p>
              <p className="text-2xl font-bold font-mono text-muted-foreground">
                {formatBRL(previousTotal)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{currentLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {formatBRL(currentTotal)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Variação</p>
              <div className="flex items-center gap-2">
                <p
                  className={`text-2xl font-bold font-mono ${
                    totalChange > 0
                      ? "text-red-500"
                      : totalChange < 0
                        ? "text-green-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {totalChange > 0 ? "+" : ""}
                  {formatBRL(totalChange)}
                </p>
                <span
                  className={`text-sm font-mono ${
                    totalPercentChange > 0
                      ? "text-red-500"
                      : totalPercentChange < 0
                        ? "text-green-500"
                        : "text-muted-foreground"
                  }`}
                >
                  ({totalPercentChange > 0 ? "+" : ""}
                  {totalPercentChange.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Comparison Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompare className="h-4 w-4 text-primary" />
              Comparativo por Categoria
            </CardTitle>
            <CardDescription>
              {previousLabel} vs {currentLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma despesa registrada para comparação
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, barChartData.length * 50)}>
                <BarChart
                  data={barChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatBRL(Number(v ?? 0))}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value ?? 0);
                      const labels: Record<string, string> = {
                        previous: previousLabel,
                        current: currentLabel,
                      };
                      const nameStr = String(name ?? "");
                      return [formatBRL(v), labels[nameStr] || nameStr];
                    }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="previous"
                    fill="hsl(var(--muted-foreground))"
                    opacity={0.4}
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    name="previous"
                  />
                  <Bar
                    dataKey="current"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    name="current"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            {barChartData.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: "hsl(var(--muted-foreground))", opacity: 0.4 }}
                  />
                  <span className="text-xs text-muted-foreground">{previousLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                  <span className="text-xs text-muted-foreground">{currentLabel}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Sparklines */}
      {topTrends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendência por Categoria</CardTitle>
              <CardDescription>
                Mini gráficos dos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topTrends.map((trend, idx) => {
                  const sparkData = trend.months.map((m) => ({
                    month: MONTHS_SHORT_PT[m.month - 1] ?? `M${m.month}`,
                    value: m.value,
                  }));

                  const lastValue = trend.months[trend.months.length - 1]?.value ?? 0;
                  const prevValue = trend.months.length >= 2
                    ? trend.months[trend.months.length - 2]?.value ?? 0
                    : 0;
                  const sparkChange = prevValue === 0
                    ? lastValue > 0 ? 100 : 0
                    : ((lastValue - prevValue) / prevValue) * 100;

                  return (
                    <motion.div
                      key={trend.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + idx * 0.05 }}
                      className="rounded-lg border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: trend.color }}
                          />
                          <span className="text-sm font-medium">{trend.name}</span>
                        </div>
                        <span
                          className={`text-xs font-mono ${
                            sparkChange > 0
                              ? "text-red-500"
                              : sparkChange < 0
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {sparkChange > 0 ? "+" : ""}
                          {sparkChange.toFixed(1)}%
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={48}>
                        <LineChart data={sparkData}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={trend.color}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip
                            formatter={(value) => [formatBRL(Number(value ?? 0)), ""]}
                            labelFormatter={(label) => String(label ?? "")}
                            contentStyle={{
                              ...tooltipStyle,
                              padding: "4px 8px",
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="mt-1 text-right text-xs font-mono text-muted-foreground">
                        {formatBRL(lastValue)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Variance Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tabela de Variação</CardTitle>
            <CardDescription>
              Comparação detalhada por categoria entre {previousLabel} e {currentLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {varianceRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma categoria para comparar
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="pb-2 text-left font-medium">Categoria</th>
                      <th className="pb-2 text-right font-medium">{previousLabel}</th>
                      <th className="pb-2 text-right font-medium">{currentLabel}</th>
                      <th className="pb-2 text-right font-medium">Variação</th>
                      <th className="pb-2 text-center font-medium">%</th>
                      <th className="pb-2 text-center font-medium w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {varianceRows.map((row, idx) => (
                      <motion.tr
                        key={row.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + idx * 0.03 }}
                        className="border-b last:border-0"
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="text-sm">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                          {formatBRL(row.previous)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs">
                          {formatBRL(row.current)}
                        </td>
                        <td
                          className={`py-2.5 text-right font-mono text-xs ${
                            row.change > 0
                              ? "text-red-500"
                              : row.change < 0
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {row.change > 0 ? "+" : ""}
                          {formatBRL(row.change)}
                        </td>
                        <td
                          className={`py-2.5 text-center font-mono text-xs ${
                            row.percentChange > 0
                              ? "text-red-500"
                              : row.percentChange < 0
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {row.percentChange > 0 ? "+" : ""}
                          {row.percentChange.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-center">
                          {row.change > 0 ? (
                            <ArrowUp className="inline-block h-3.5 w-3.5 text-red-500" />
                          ) : row.change < 0 ? (
                            <ArrowDown className="inline-block h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Minus className="inline-block h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="pt-3 text-sm">Total</td>
                      <td className="pt-3 text-right font-mono text-xs text-muted-foreground">
                        {formatBRL(previousTotal)}
                      </td>
                      <td className="pt-3 text-right font-mono text-xs">
                        {formatBRL(currentTotal)}
                      </td>
                      <td
                        className={`pt-3 text-right font-mono text-xs ${
                          totalChange > 0
                            ? "text-red-500"
                            : totalChange < 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {totalChange > 0 ? "+" : ""}
                        {formatBRL(totalChange)}
                      </td>
                      <td
                        className={`pt-3 text-center font-mono text-xs ${
                          totalPercentChange > 0
                            ? "text-red-500"
                            : totalPercentChange < 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {totalPercentChange > 0 ? "+" : ""}
                        {totalPercentChange.toFixed(1)}%
                      </td>
                      <td className="pt-3 text-center">
                        {totalChange > 0 ? (
                          <ArrowUp className="inline-block h-3.5 w-3.5 text-red-500" />
                        ) : totalChange < 0 ? (
                          <ArrowDown className="inline-block h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Minus className="inline-block h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
