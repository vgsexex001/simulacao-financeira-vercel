"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/format";
import {
  ShieldCheck,
  TrendingUp,
  Home,
  PiggyBank,
  CreditCard,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  Landmark,
} from "lucide-react";
import { motion } from "framer-motion";
import type { BenchmarkData, BenchmarkMetric } from "@/actions/benchmark-actions";

interface FinancialBenchmarkProps {
  data: BenchmarkData;
}

const STATUS_CONFIG = {
  excellent: {
    label: "Excelente",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    ringColor: "ring-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  good: {
    label: "Bom",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    ringColor: "ring-blue-500/20",
    dotColor: "bg-blue-500",
  },
  attention: {
    label: "Atencao",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ringColor: "ring-amber-500/20",
    dotColor: "bg-amber-500",
  },
  critical: {
    label: "Critico",
    color: "bg-red-500/15 text-red-700 dark:text-red-400",
    ringColor: "ring-red-500/20",
    dotColor: "bg-red-500",
  },
} as const;

const METRIC_ICONS: Record<string, React.ElementType> = {
  savings_rate: PiggyBank,
  needs_percent: Home,
  wants_percent: CreditCard,
  emergency_fund: ShieldCheck,
  housing_cost: Landmark,
  debt_to_income: AlertTriangle,
  investment_allocation: TrendingUp,
  jar_compliance: BarChart3,
  goal_progress: Target,
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Saude Financeira Excelente";
  if (score >= 60) return "Saude Financeira Boa";
  if (score >= 40) return "Precisa de Atencao";
  return "Situacao Critica";
}

function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case "currency":
      return formatBRL(value);
    case "percent":
      return `${value}%`;
    case "months":
      return `${value} ${value === 1 ? "mes" : "meses"}`;
    case "ratio":
      return `${value}x`;
    default:
      return String(value);
  }
}

export function FinancialBenchmark({ data }: FinancialBenchmarkProps) {
  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  // SVG circular gauge parameters
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeProgress = (data.overallScore / 100) * gaugeCircumference;
  const gaugeColor = getScoreRingColor(data.overallScore);

  // 50-30-20 comparison bar chart data
  const splitComparisonData = useMemo(() => {
    return [
      {
        label: "Voce",
        Necessidades: data.needsPercent,
        Desejos: data.wantsPercent,
        Poupanca: data.savingsPercent,
      },
      {
        label: "Ideal",
        Necessidades: 50,
        Desejos: 30,
        Poupanca: 20,
      },
    ];
  }, [data.needsPercent, data.wantsPercent, data.savingsPercent]);

  // Group metrics by status for summary
  const statusCounts = useMemo(() => {
    const counts = { excellent: 0, good: 0, attention: 0, critical: 0 };
    for (const metric of data.metrics) {
      counts[metric.status]++;
    }
    return counts;
  }, [data.metrics]);

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Circular Score Gauge */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-44 w-44">
                  <svg
                    className="h-44 w-44 -rotate-90"
                    viewBox="0 0 160 160"
                  >
                    {/* Background circle */}
                    <circle
                      cx="80"
                      cy="80"
                      r={gaugeRadius}
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="10"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r={gaugeRadius}
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeCircumference - gaugeProgress}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Score number centered */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-4xl font-bold font-mono ${getScoreColor(data.overallScore)}`}
                    >
                      {data.overallScore}
                    </span>
                    <span className="text-xs text-muted-foreground">de 100</span>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${getScoreColor(data.overallScore)}`}>
                  {getScoreLabel(data.overallScore)}
                </p>
              </div>

              {/* Status summary */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-muted-foreground text-center sm:text-left">
                  Resumo dos Indicadores
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ["excellent", "good", "attention", "critical"] as const
                  ).map((status) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[status].dotColor}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {STATUS_CONFIG[status].label}
                      </span>
                      <span className="ml-auto text-sm font-bold font-mono">
                        {statusCounts[status]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>
                      Renda: {formatBRL(data.totalIncome)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>
                      Gastos: {formatBRL(data.totalExpenses)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 50-30-20 Rule Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Regra 50-30-20
            </CardTitle>
            <CardDescription>
              Comparacao da sua distribuicao real vs a regra recomendada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={splitComparisonData}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${Number(v ?? 0)}%`}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  width={50}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    name,
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="Necessidades"
                  stackId="stack"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                  barSize={28}
                />
                <Bar
                  dataKey="Desejos"
                  stackId="stack"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                  barSize={28}
                />
                <Bar
                  dataKey="Poupanca"
                  stackId="stack"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Numeric summary below the chart */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-blue-500/10 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Necessidades
                </p>
                <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                  {data.needsPercent}%
                </p>
                <p className="text-[10px] text-muted-foreground">meta: 50%</p>
              </div>
              <div className="rounded-md bg-amber-500/10 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Desejos
                </p>
                <p className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                  {data.wantsPercent}%
                </p>
                <p className="text-[10px] text-muted-foreground">meta: 30%</p>
              </div>
              <div className="rounded-md bg-emerald-500/10 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Poupanca
                </p>
                <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {data.savingsPercent}%
                </p>
                <p className="text-[10px] text-muted-foreground">meta: 20%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Indicadores de Saude Financeira
            </CardTitle>
            <CardDescription>
              Analise detalhada de cada metrica comparada com benchmarks recomendados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.metrics.map((metric, idx) => {
                const Icon = METRIC_ICONS[metric.id] || Info;
                const statusConfig = STATUS_CONFIG[metric.status];

                return (
                  <motion.div
                    key={metric.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + idx * 0.04 }}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                  >
                    {/* Header: icon + name + badge */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium leading-tight">
                          {metric.name}
                        </span>
                      </div>
                      <Badge
                        className={`${statusConfig.color} text-[10px] shrink-0`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Values comparison */}
                    <div className="mb-2 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Seu valor
                        </p>
                        <p className="text-lg font-bold font-mono">
                          {formatMetricValue(metric.userValue, metric.unit)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Referencia
                        </p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {formatMetricValue(metric.benchmarkValue, metric.unit)}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar visual */}
                    <div className="mb-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(100, metric.benchmarkValue > 0 ? (metric.userValue / metric.benchmarkValue) * 100 : 0)}%`,
                            backgroundColor:
                              metric.status === "excellent"
                                ? "#10b981"
                                : metric.status === "good"
                                  ? "#3b82f6"
                                  : metric.status === "attention"
                                    ? "#f59e0b"
                                    : "#ef4444",
                          }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {metric.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
