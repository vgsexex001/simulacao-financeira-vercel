"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/format";
import {
  Shield,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from "lucide-react";

interface FreedomDashboardProps {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalDebt: number;
  emergencyFundTarget: number;
  emergencyFundCurrent: number;
}

function calculateFreedomScore(props: FreedomDashboardProps): number {
  const {
    totalIncome,
    totalExpenses,
    totalDebt,
    emergencyFundTarget,
    emergencyFundCurrent,
  } = props;

  // Savings rate score (0-40 points)
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const savingsScore = Math.min(Math.max(savingsRate, 0), 40);

  // Emergency fund coverage score (0-30 points)
  const emergencyCoverage =
    emergencyFundTarget > 0
      ? (emergencyFundCurrent / emergencyFundTarget) * 100
      : 0;
  const emergencyScore = Math.min(emergencyCoverage * 0.3, 30);

  // Debt-to-income score (0-30 points) - lower is better
  const debtToIncome = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;
  const debtScore = Math.max(30 - debtToIncome * 0.3, 0);

  return Math.round(savingsScore + emergencyScore + debtScore);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-emerald-500";
  if (score >= 40) return "text-yellow-500";
  if (score >= 20) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  if (score >= 20) return "Atenção";
  return "Crítico";
}

export function FreedomDashboard(props: FreedomDashboardProps) {
  const {
    totalIncome,
    totalExpenses,
    emergencyFundTarget,
    emergencyFundCurrent,
  } = props;

  const freedomScore = calculateFreedomScore(props);
  const scoreColor = getScoreColor(freedomScore);
  const scoreLabel = getScoreLabel(freedomScore);

  const monthlyExpenses = totalExpenses > 0 ? totalExpenses : 1;
  const monthsOfRunway =
    props.totalSavings > 0
      ? Math.floor(props.totalSavings / monthlyExpenses)
      : 0;

  const savingsRate =
    totalIncome > 0
      ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)
      : "0.0";

  const emergencyPercent =
    emergencyFundTarget > 0
      ? (emergencyFundCurrent / emergencyFundTarget) * 100
      : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        Painel de Liberdade Financeira
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Freedom Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score de Liberdade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${scoreColor}`}>
                {freedomScore}
              </span>
              <span className="text-sm text-muted-foreground mb-1">/100</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${scoreColor}`}>
              {scoreLabel}
            </p>
            <Progress
              value={freedomScore}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Months of Runway */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              Meses de Reserva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">
                {monthsOfRunway}
              </span>
              <span className="text-sm text-muted-foreground mb-1">
                {monthsOfRunway === 1 ? "mês" : "meses"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reserva total: {formatBRL(props.totalSavings)}
            </p>
            {monthsOfRunway < 3 && (
              <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Recomendado: mínimo 6 meses
              </p>
            )}
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Taxa de Poupança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{savingsRate}</span>
              <span className="text-sm text-muted-foreground mb-1">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBRL(totalIncome - totalExpenses)} poupado este mês
            </p>
          </CardContent>
        </Card>

        {/* Emergency Fund */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              Fundo de Emergência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">
                {Math.min(emergencyPercent, 100).toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground mb-1">%</span>
            </div>
            <Progress
              value={Math.min(emergencyPercent, 100)}
              className="mt-3 h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBRL(emergencyFundCurrent)} /{" "}
              {formatBRL(emergencyFundTarget)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
