"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, TrendingDown, TrendingUp, Target, Calendar } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: string;
  type: "warning" | "danger" | "success" | "info";
  icon: "budget" | "due" | "overspend" | "savings" | "goal" | "projection";
  title: string;
  message: string;
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

const JAR_LABELS: Record<string, string> = {
  necessities: "Necessidades",
  education: "Educação",
  savings: "Poupança",
  play: "Diversão",
  investment: "Investimentos",
  giving: "Doações",
};

const ALERT_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: "text-yellow-500" },
  danger: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "text-red-500" },
  success: { bg: "bg-green-500/10", border: "border-green-500/30", icon: "text-green-500" },
  info: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-500" },
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
    const jarLabel = JAR_LABELS[jarType] || jarType;

    if (usagePercent >= 100) {
      alerts.push({
        id: `budget-over-${jarType}`,
        type: "danger",
        icon: "budget",
        title: `${jarLabel}: Orçamento estourado!`,
        message: `Você gastou ${formatBRL(spent)} de ${formatBRL(allocated)} alocados (${Math.round(usagePercent)}%).`,
      });
    } else if (usagePercent >= 80) {
      alerts.push({
        id: `budget-warn-${jarType}`,
        type: "warning",
        icon: "budget",
        title: `${jarLabel}: ${Math.round(usagePercent)}% usado`,
        message: `Já usou ${formatBRL(spent)} de ${formatBRL(allocated)} alocados.`,
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
      });
    } else if (daysUntilDue > 0 && daysUntilDue <= 3) {
      alerts.push({
        id: `due-soon-${expense.name}`,
        type: "warning",
        icon: "due",
        title: `${expense.name} vence em ${daysUntilDue} dia${daysUntilDue > 1 ? "s" : ""}`,
        message: `Despesa fixa de ${formatBRL(expense.amount)} vence dia ${expense.dueDay}.`,
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

  return alerts;
}

export function SmartAlerts(props: SmartAlertsProps) {
  const alerts = generateAlerts(props);

  if (alerts.length === 0) return null;

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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence>
            {alerts.slice(0, 5).map((alert, index) => {
              const style = ALERT_STYLES[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${style.bg} ${style.border}`}
                >
                  {getAlertIcon(alert.icon, `h-4 w-4 mt-0.5 shrink-0 ${style.icon}`)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
