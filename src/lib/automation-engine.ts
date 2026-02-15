import { JAR_CONFIG, type JarType } from "@/lib/constants";
import { formatBRL } from "@/lib/format";

interface NotificationPayload {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
}

interface JarBalance {
  jarType: string;
  spent: number;
  allocated: number;
}

interface FixedExpenseDue {
  name: string;
  amount: number;
  dueDay: number;
  isPaid: boolean;
}

interface GoalProgress {
  name: string;
  targetAmount: number;
  currentAmount: number;
}

/**
 * Check budget alerts: compare spending vs allocated per jar.
 * Triggers a warning when spending exceeds 80% of the allocated amount.
 */
export function checkBudgetAlerts(
  jarBalances: Record<string, number>,
  jarRules: Record<string, number>,
  totalIncome: number
): NotificationPayload[] {
  const notifications: NotificationPayload[] = [];

  for (const [jarType, percentage] of Object.entries(jarRules)) {
    const allocated = (totalIncome * percentage) / 100;
    const spent = jarBalances[jarType] || 0;

    if (allocated <= 0) continue;

    const usagePercent = (spent / allocated) * 100;
    const config = JAR_CONFIG[jarType as JarType];
    const jarLabel = config?.label || jarType;

    if (usagePercent >= 100) {
      notifications.push({
        title: `${jarLabel}: Orçamento estourado!`,
        message: `Você gastou ${formatBRL(spent)} de ${formatBRL(allocated)} alocados (${Math.round(usagePercent)}%).`,
        type: "error",
      });
    } else if (usagePercent >= 80) {
      notifications.push({
        title: `${jarLabel}: Atenção ao orçamento`,
        message: `Você já usou ${Math.round(usagePercent)}% do orçamento (${formatBRL(spent)} de ${formatBRL(allocated)}).`,
        type: "warning",
      });
    }
  }

  return notifications;
}

/**
 * Check due reminders: fixed expenses due within the next 3 days.
 */
export function checkDueReminders(
  fixedExpenses: FixedExpenseDue[]
): NotificationPayload[] {
  const notifications: NotificationPayload[] = [];
  const today = new Date();
  const currentDay = today.getDate();

  for (const expense of fixedExpenses) {
    if (expense.isPaid) continue;

    const daysUntilDue = expense.dueDay - currentDay;

    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      if (daysUntilDue === 0) {
        notifications.push({
          title: `${expense.name}: Vence hoje!`,
          message: `Despesa fixa de ${formatBRL(expense.amount)} vence hoje.`,
          type: "warning",
        });
      } else {
        notifications.push({
          title: `${expense.name}: Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? "s" : ""}`,
          message: `Despesa fixa de ${formatBRL(expense.amount)} vence no dia ${expense.dueDay}.`,
          type: "info",
        });
      }
    }
  }

  return notifications;
}

/**
 * Check milestones: goals reaching 25%, 50%, 75%, or 100%.
 */
export function checkMilestones(
  goals: GoalProgress[]
): NotificationPayload[] {
  const notifications: NotificationPayload[] = [];
  const milestones = [100, 75, 50, 25];

  for (const goal of goals) {
    if (goal.targetAmount <= 0) continue;

    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    for (const milestone of milestones) {
      if (progress >= milestone) {
        if (milestone === 100) {
          notifications.push({
            title: `Meta alcançada: ${goal.name}!`,
            message: `Parabéns! Você atingiu sua meta de ${formatBRL(goal.targetAmount)}.`,
            type: "success",
          });
        } else {
          notifications.push({
            title: `${goal.name}: ${milestone}% concluído`,
            message: `Você já acumulou ${formatBRL(goal.currentAmount)} de ${formatBRL(goal.targetAmount)}.`,
            type: "info",
          });
        }
        // Only report the highest milestone reached
        break;
      }
    }
  }

  return notifications;
}
