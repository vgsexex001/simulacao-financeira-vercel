"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, TrendingDown, TrendingUp, Target, Calendar, X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { JAR_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Alert {
  id: string;
  type: "warning" | "danger" | "success" | "info";
  icon: "budget" | "due" | "overspend" | "savings" | "goal" | "projection";
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface SmartAlertsProps {
  jarBalances: Record<string, number>;
  jarRules: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  daysInMonth: number;
  currentDay: number;
  fixedExpensesDue: Array<{
    name: string;
    amount: number;
    dueDay: number;
    isPaid: boolean;
  }>;
  savingsRate: number;
  anomalies?: Array<{
    category: string;
    currentAmount: number;
    averageAmount: number;
    ratio: number;
  }>;
}

const ALERT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  danger: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "text-red-500" },
  warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: "text-yellow-500" },
  info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-500" },
  success: { bg: "bg-green-500/10", border: "border-green-500/30", icon: "text-green-500" },
};

const TYPE_PRIORITY: Record<string, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
};

function getAlertIcon(icon: Alert["icon"], className: string) {
  switch (icon) {
    case "budget": return <AlertTriangle className={className} />;
    case "due": return <Calendar className={className} />;
    case "overspend": return <TrendingDown className={className} />;
    case "savings": return <TrendingUp className={className} />;
    case "goal": return <Target className={className} />;
    case "projection": return <Bell className={className} />;
    default: return <Bell className={className} />;
  }
}

function generateAlerts(props: SmartAlertsProps): Alert[] {
  const alerts: Alert[] = [];

  // Budget alerts per jar
  for (const [jarType, percentage] of Object.entries(props.jarRules)) {
    const allocated = (props.totalIncome * percentage) / 100;
    const spent = props.jarBalances[jarType] || 0;
    if (allocated <= 0) continue;

    const usagePercent = (spent / allocated) * 100;
    const jarLabel = JAR_CONFIG[jarType as keyof typeof JAR_CONFIG]?.label || jarType;

    if (usagePercent >= 100) {
      alerts.push({
        id: `budget-over-${jarType}`,
        type: "danger",
        icon: "budget",
        title: `${jarLabel}: Orçamento estourado!`,
        message: `Você gastou ${formatBRL(spent)} de ${formatBRL(allocated)} alocados (${Math.round(usagePercent)}%).`,
        actionUrl: "/jars",
        actionLabel: "Gerenciar jarros",
      });
    } else if (usagePercent >= 80) {
      alerts.push({
        id: `budget-warn-${jarType}`,
        type: "warning",
        icon: "budget",
        title: `${jarLabel}: ${Math.round(usagePercent)}% usado`,
        message: `Já usou ${formatBRL(spent)} de ${formatBRL(allocated)} alocados.`,
        actionUrl: "/jars",
        actionLabel: "Ver jarros",
      });
    }
  }

  // Fixed expense due reminders
  const today = props.currentDay;
  for (const expense of props.fixedExpensesDue) {
    if (expense.isPaid) continue;
    const daysUntilDue = expense.dueDay - today;

    if (daysUntilDue === 0) {
      alerts.push({
        id: `due-today-${expense.name}`,
        type: "danger",
        icon: "due",
        title: `${expense.name} vence hoje!`,
        message: `Despesa fixa de ${formatBRL(expense.amount)}.`,
        actionUrl: "/fixed-expenses",
        actionLabel: "Ver despesas fixas",
      });
    } else if (daysUntilDue > 0 && daysUntilDue <= 3) {
      alerts.push({
        id: `due-soon-${expense.name}`,
        type: "warning",
        icon: "due",
        title: `${expense.name} vence em ${daysUntilDue} dia${daysUntilDue > 1 ? "s" : ""}`,
        message: `Despesa fixa de ${formatBRL(expense.amount)} vence dia ${expense.dueDay}.`,
        actionUrl: "/fixed-expenses",
        actionLabel: "Ver despesas fixas",
      });
    }
  }

  // Savings rate alerts
  if (props.savingsRate >= 20) {
    alerts.push({
      id: "savings-good",
      type: "success",
      icon: "savings",
      title: "Ótimo ritmo de poupança!",
      message: `Sua taxa de poupança está em ${props.savingsRate.toFixed(1)}%. Continue assim!`,
    });
  }

  // Anomaly alerts
  if (props.anomalies) {
    for (const anomaly of props.anomalies) {
      alerts.push({
        id: `anomaly-${anomaly.category}`,
        type: "warning",
        icon: "overspend",
        title: `${anomaly.category}: gasto incomum`,
        message: `Você gastou ${formatBRL(anomaly.currentAmount)} este mês, ${anomaly.ratio.toFixed(1)}x acima da média de ${formatBRL(anomaly.averageAmount)}.`,
        actionUrl: "/analytics",
        actionLabel: "Ver análises",
      });
    }
  }

  // Projection alert
  if (props.totalIncome > 0 && props.currentDay > 5) {
    const dailyAvg = props.totalExpenses / props.currentDay;
    const projectedExpenses = dailyAvg * props.daysInMonth;
    const projectedSurplus = props.totalIncome - projectedExpenses;

    if (projectedSurplus > 0) {
      alerts.push({
        id: "projection-positive",
        type: "info",
        icon: "projection",
        title: "Projeção positiva",
        message: `Se manter este ritmo, você fecha o mês com ${formatBRL(projectedSurplus)} de sobra.`,
      });
    } else {
      alerts.push({
        id: "projection-negative",
        type: "warning",
        icon: "projection",
        title: "Atenção à projeção",
        message: `No ritmo atual, você pode fechar o mês com ${formatBRL(projectedSurplus)} negativo.`,
      });
    }
  }

  // Sort by priority: danger > warning > info > success
  alerts.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);

  return alerts;
}

const VISIBLE_LIMIT = 3;

export function SmartAlerts(props: SmartAlertsProps) {
  const allAlerts = generateAlerts(props);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const alerts = allAlerts.filter((a) => !dismissedIds.has(a.id));

  if (alerts.length === 0) return null;

  const visible = expanded ? alerts : alerts.slice(0, VISIBLE_LIMIT);
  const hiddenCount = alerts.length - VISIBLE_LIMIT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" />
            Alertas Inteligentes
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              {alerts.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence>
            {visible.map((alert, index) => {
              const style = ALERT_STYLES[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${style.bg} ${style.border}`}
                >
                  {getAlertIcon(alert.icon, `h-4 w-4 mt-0.5 shrink-0 ${style.icon}`)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                    {alert.actionUrl && (
                      <Link
                        href={alert.actionUrl}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        {alert.actionLabel || "Ver mais"}
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissedIds((prev) => new Set(prev).add(alert.id))}
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!expanded && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setExpanded(true)}
            >
              Ver mais ({hiddenCount})
            </Button>
          )}
          {expanded && alerts.length > VISIBLE_LIMIT && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setExpanded(false)}
            >
              Ver menos
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
