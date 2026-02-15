"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface FinancialTip {
  id: string;
  category: "saving" | "spending" | "investing" | "goals" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
}

const JAR_LABELS: Record<string, string> = {
  necessities: "Necessidades",
  education: "Educacao",
  savings: "Poupanca",
  play: "Diversao",
  investment: "Investimentos",
  giving: "Doacoes",
};

export async function getFinancialAdvice(): Promise<FinancialTip[]> {
  const user = await requireAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Query all user data in parallel
  const [
    settings,
    monthExpenses,
    monthIncomes,
    goals,
    recentSnapshots,
    fixedTemplates,
  ] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.monthSnapshot.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: subMonths(now, 6) },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.fixedExpenseTemplate.findMany({
      where: { userId: user.id, isActive: true },
    }),
  ]);

  const tips: FinancialTip[] = [];

  // Calculate totals
  const totalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const totalExpenses = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Jar rules and balances
  const jarRules = (settings?.jarRulesJson || {
    necessities: 55,
    education: 10,
    savings: 10,
    play: 10,
    investment: 10,
    giving: 5,
  }) as Record<string, number>;

  const jarBalances: Record<string, number> = {};
  for (const expense of monthExpenses) {
    if (expense.jarType) {
      jarBalances[expense.jarType] =
        (jarBalances[expense.jarType] || 0) + Number(expense.amount);
    }
  }

  // Category breakdown
  const categoryTotals: Record<string, { name: string; total: number }> = {};
  for (const expense of monthExpenses) {
    const catId = expense.categoryId;
    if (!categoryTotals[catId]) {
      categoryTotals[catId] = { name: expense.category.name, total: 0 };
    }
    categoryTotals[catId].total += Number(expense.amount);
  }

  const totalFixed = fixedTemplates.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  // ---- Rule 1: Savings rate warnings ----
  if (totalIncome > 0 && savingsRate < 10) {
    tips.push({
      id: "savings-rate-low",
      category: "saving",
      priority: "high",
      title: "Taxa de poupanca baixa",
      description: `Sua taxa de poupanca este mes esta em ${savingsRate.toFixed(1)}%. O ideal e poupar pelo menos 10% da renda. Tente identificar gastos que podem ser reduzidos.`,
      actionLabel: "Ver gastos",
      actionUrl: "/analytics",
    });
  }

  // ---- Rule 2: Congratulate high savings ----
  if (totalIncome > 0 && savingsRate >= 20) {
    tips.push({
      id: "savings-rate-great",
      category: "saving",
      priority: "low",
      title: "Excelente taxa de poupanca!",
      description: `Parabens! Voce esta poupando ${savingsRate.toFixed(1)}% da sua renda este mes. Continue assim e considere investir o excedente para fazer seu dinheiro crescer.`,
      actionLabel: "Ver metas",
      actionUrl: "/goals",
    });
  }

  // ---- Rule 3: Jar over 100% allocated ----
  for (const [jarType, percentage] of Object.entries(jarRules)) {
    if (totalIncome <= 0) break;
    const allocated = (totalIncome * percentage) / 100;
    const spent = jarBalances[jarType] || 0;
    if (allocated > 0 && spent > allocated) {
      const overPercent = ((spent / allocated) * 100).toFixed(0);
      const jarLabel = JAR_LABELS[jarType] || jarType;
      tips.push({
        id: `jar-over-${jarType}`,
        category: "spending",
        priority: "high",
        title: `Jarro "${jarLabel}" estourado`,
        description: `Voce gastou ${overPercent}% do orcamento alocado para ${jarLabel}. Considere reduzir os gastos nessa categoria ou realocar o orcamento dos jarros.`,
        actionLabel: "Gerenciar jarros",
        actionUrl: "/jars",
      });
    }
  }

  // ---- Rule 4: Goals near completion ----
  const activeGoals = goals.filter((g) => !g.isCompleted);
  for (const goal of activeGoals) {
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    if (target > 0) {
      const progress = (current / target) * 100;
      if (progress >= 75) {
        const remaining = target - current;
        tips.push({
          id: `goal-near-${goal.id}`,
          category: "goals",
          priority: "medium",
          title: `Meta "${goal.name}" quase la!`,
          description: `Voce ja alcancou ${progress.toFixed(0)}% da meta. Faltam apenas R$ ${remaining.toFixed(2).replace(".", ",")} para concluir. Nao desista agora!`,
          actionLabel: "Contribuir",
          actionUrl: "/goals",
        });
      }
    }
  }

  // ---- Rule 5: Expenses trending up over last 3 months ----
  if (recentSnapshots.length >= 3) {
    const lastThree = recentSnapshots.slice(-3);
    const expenses = lastThree.map((s) => Number(s.totalExpenses));
    const isIncreasing =
      expenses[2] > expenses[1] && expenses[1] > expenses[0];
    if (isIncreasing) {
      const increasePercent =
        expenses[0] > 0
          ? (((expenses[2] - expenses[0]) / expenses[0]) * 100).toFixed(0)
          : "0";
      tips.push({
        id: "expenses-trending-up",
        category: "spending",
        priority: "high",
        title: "Gastos em tendencia de alta",
        description: `Seus gastos aumentaram nos ultimos 3 meses consecutivos (${increasePercent}% de aumento). Revise suas despesas para identificar onde e possivel economizar.`,
        actionLabel: "Analisar tendencias",
        actionUrl: "/analytics",
      });
    }
  }

  // ---- Rule 6: Single category > 30% of total expenses ----
  if (totalExpenses > 0) {
    for (const [, catData] of Object.entries(categoryTotals)) {
      const catPercent = (catData.total / totalExpenses) * 100;
      if (catPercent > 30) {
        tips.push({
          id: `category-dominant-${catData.name}`,
          category: "spending",
          priority: "medium",
          title: `"${catData.name}" concentra ${catPercent.toFixed(0)}% dos gastos`,
          description: `A categoria "${catData.name}" representa mais de 30% dos seus gastos totais. Considere diversificar suas despesas e buscar alternativas mais economicas.`,
          actionLabel: "Ver detalhes",
          actionUrl: "/analytics",
        });
      }
    }
  }

  // ---- Rule 7: Compare against 50-30-20 rule ----
  if (totalIncome > 0) {
    const necessitiesSpent = jarBalances["necessities"] || 0;
    const playSpent = jarBalances["play"] || 0;
    const savingsSpent = jarBalances["savings"] || 0;
    const investmentSpent = jarBalances["investment"] || 0;

    const necessitiesPercent = (necessitiesSpent / totalIncome) * 100;
    const wantsPercent = (playSpent / totalIncome) * 100;
    const savingsAndInvestPercent =
      ((savingsSpent + investmentSpent) / totalIncome) * 100;

    if (necessitiesPercent > 50) {
      tips.push({
        id: "rule-503020-necessities",
        category: "spending",
        priority: "medium",
        title: "Necessidades acima de 50% da renda",
        description: `Pela regra 50-30-20, necessidades nao devem ultrapassar 50% da renda. Atualmente estao em ${necessitiesPercent.toFixed(0)}%. Tente renegociar contas fixas ou buscar alternativas mais baratas.`,
        actionLabel: "Despesas fixas",
        actionUrl: "/fixed-expenses",
      });
    }

    if (wantsPercent > 30) {
      tips.push({
        id: "rule-503020-wants",
        category: "spending",
        priority: "medium",
        title: "Desejos acima de 30% da renda",
        description: `Pela regra 50-30-20, gastos com desejos nao devem ultrapassar 30% da renda. Atualmente estao em ${wantsPercent.toFixed(0)}%. Avalie quais gastos sao realmente necessarios.`,
        actionLabel: "Ver jarros",
        actionUrl: "/jars",
      });
    }

    if (savingsAndInvestPercent < 20 && savingsRate >= 0) {
      tips.push({
        id: "rule-503020-savings",
        category: "investing",
        priority: "medium",
        title: "Poupanca e investimentos abaixo de 20%",
        description: `Pela regra 50-30-20, voce deveria destinar pelo menos 20% da renda para poupanca e investimentos. Atualmente esta em ${savingsAndInvestPercent.toFixed(0)}%.`,
        actionLabel: "Definir metas",
        actionUrl: "/goals",
      });
    }
  }

  // ---- Rule 8: No emergency fund goal ----
  const hasEmergencyGoal = goals.some(
    (g) =>
      (g as unknown as { type?: string }).type === "emergency_fund" ||
      g.name.toLowerCase().includes("emergencia") ||
      g.name.toLowerCase().includes("reserva")
  );
  if (!hasEmergencyGoal) {
    const suggestedAmount =
      totalFixed > 0
        ? totalFixed * 6
        : totalExpenses > 0
          ? totalExpenses * 6
          : 0;
    tips.push({
      id: "no-emergency-fund",
      category: "saving",
      priority: "high",
      title: "Crie uma reserva de emergencia",
      description: `Voce ainda nao tem uma meta de reserva de emergencia. Especialistas recomendam ter de 3 a 6 meses de despesas guardados.${suggestedAmount > 0 ? ` Sugestao: R$ ${suggestedAmount.toFixed(2).replace(".", ",")}` : ""}`,
      actionLabel: "Criar meta",
      actionUrl: "/goals",
    });
  }

  // ---- Rule 9: General tips based on income bracket ----
  if (totalIncome > 0 && totalIncome < 3000) {
    tips.push({
      id: "income-tip-low",
      category: "general",
      priority: "low",
      title: "Dica: invista em conhecimento",
      description:
        "Com uma renda menor, o melhor investimento e em educacao e capacitacao profissional. Busque cursos e certificacoes que possam aumentar seu potencial de ganhos.",
      actionLabel: "Explorar",
      actionUrl: "/analytics",
    });
  } else if (totalIncome >= 3000 && totalIncome < 8000) {
    tips.push({
      id: "income-tip-mid",
      category: "general",
      priority: "low",
      title: "Dica: automatize suas financas",
      description:
        "Nesta faixa de renda, automatizar transferencias para poupanca e investimentos no dia do pagamento pode fazer grande diferenca. Crie o habito de pagar-se primeiro.",
    });
  } else if (totalIncome >= 8000) {
    tips.push({
      id: "income-tip-high",
      category: "general",
      priority: "low",
      title: "Dica: diversifique investimentos",
      description:
        "Com uma renda mais elevada, considere diversificar entre renda fixa, renda variavel e ativos reais. Consulte um assessor de investimentos para otimizar sua carteira.",
    });
  }

  // ---- Bonus: No income registered this month ----
  if (totalIncome === 0) {
    tips.push({
      id: "no-income",
      category: "general",
      priority: "high",
      title: "Registre suas receitas",
      description:
        "Voce ainda nao registrou receitas este mes. Registrar suas fontes de renda e essencial para que possamos gerar analises precisas e dicas personalizadas.",
      actionLabel: "Adicionar receita",
      actionUrl: "/transactions",
    });
  }

  // ---- Bonus: No expenses registered ----
  if (totalExpenses === 0 && totalIncome > 0) {
    tips.push({
      id: "no-expenses",
      category: "general",
      priority: "medium",
      title: "Registre seus gastos",
      description:
        "Voce tem receitas registradas mas nenhum gasto este mes. Manter um controle detalhado das despesas e fundamental para a saude financeira.",
      actionLabel: "Adicionar despesa",
      actionUrl: "/transactions",
    });
  }

  // ---- Bonus: Completed goals encouragement ----
  const completedGoals = goals.filter((g) => g.isCompleted);
  if (completedGoals.length > 0 && activeGoals.length === 0) {
    tips.push({
      id: "all-goals-completed",
      category: "goals",
      priority: "low",
      title: "Todas as metas concluidas!",
      description: `Parabens! Voce completou ${completedGoals.length} meta${completedGoals.length > 1 ? "s" : ""}. Que tal definir novas metas para continuar avancando?`,
      actionLabel: "Nova meta",
      actionUrl: "/goals",
    });
  }

  // Sort by priority: high -> medium -> low
  const priorityOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}
