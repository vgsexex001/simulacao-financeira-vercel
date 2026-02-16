"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { startOfMonth, subMonths } from "date-fns";
import { getCustomMonthRange } from "@/lib/date-helpers";

export interface BenchmarkMetric {
  id: string;
  name: string;
  userValue: number;
  benchmarkValue: number;
  unit: "percent" | "currency" | "months" | "ratio";
  status: "excellent" | "good" | "attention" | "critical";
  description: string;
}

export interface BenchmarkData {
  overallScore: number;
  metrics: BenchmarkMetric[];
  savingsRate: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  totalIncome: number;
  totalExpenses: number;
}

function classifyStatus(
  value: number,
  thresholds: { excellent: number; good: number; attention: number },
  higherIsBetter: boolean
): "excellent" | "good" | "attention" | "critical" {
  if (higherIsBetter) {
    if (value >= thresholds.excellent) return "excellent";
    if (value >= thresholds.good) return "good";
    if (value >= thresholds.attention) return "attention";
    return "critical";
  } else {
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.attention) return "attention";
    return "critical";
  }
}

function statusToScore(status: "excellent" | "good" | "attention" | "critical"): number {
  switch (status) {
    case "excellent":
      return 100;
    case "good":
      return 75;
    case "attention":
      return 45;
    case "critical":
      return 20;
  }
}

export async function getFinancialBenchmark(): Promise<BenchmarkData> {
  const user = await requireAuth();

  const now = new Date();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const monthStartDay = settings?.monthStartDay ?? 1;
  const { start: currentMonthStart, end: currentMonthEnd } = getCustomMonthRange(now, monthStartDay);
  const threeMonthsAgo = subMonths(now, 3);

  const [expenses3m, incomes3m, currentExpenses, currentIncomes, goals] =
    await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: user.id,
          isPaid: true,
          date: { gte: startOfMonth(threeMonthsAgo), lte: currentMonthEnd },
        },
        include: { category: true },
      }),
      prisma.income.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfMonth(threeMonthsAgo), lte: currentMonthEnd },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId: user.id,
          isPaid: true,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        include: { category: true },
      }),
      prisma.income.findMany({
        where: {
          userId: user.id,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      prisma.goal.findMany({
        where: { userId: user.id },
      }),
    ]);

  // Calculate 3-month averages for stability
  const totalIncome3m = incomes3m.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses3m = expenses3m.reduce((s, e) => s + Number(e.amount), 0);
  const avgMonthlyIncome = totalIncome3m / 3;
  const avgMonthlyExpenses = totalExpenses3m / 3;

  // Current month values
  const currentTotalIncome = currentIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const currentTotalExpenses = currentExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Use current month if available, otherwise use average
  const effectiveIncome = currentTotalIncome > 0 ? currentTotalIncome : avgMonthlyIncome;
  const effectiveExpenses = currentTotalExpenses > 0 ? currentTotalExpenses : avgMonthlyExpenses;

  // ---- Classify expenses into needs / wants / savings ----
  // Category types that count as "needs" (necessities)
  const needsTypes = new Set([
    "housing",
    "food",
    "transport",
    "health",
    "insurance",
    "taxes",
    "debt",
  ]);

  // Category types that count as "wants" (discretionary)
  const wantsTypes = new Set([
    "entertainment",
    "clothing",
    "technology",
    "subscriptions",
    "other",
  ]);

  // Types that count towards savings/investments
  const savingsTypes = new Set(["investments", "donations", "education"]);

  let needsTotal = 0;
  let wantsTotal = 0;
  let savingsExpenseTotal = 0;

  const expensesToClassify = currentTotalExpenses > 0 ? currentExpenses : expenses3m;

  for (const expense of expensesToClassify) {
    const amount = Number(expense.amount);
    const catType = expense.category.type;

    if (needsTypes.has(catType)) {
      needsTotal += amount;
    } else if (savingsTypes.has(catType)) {
      savingsExpenseTotal += amount;
    } else {
      wantsTotal += amount;
    }
  }

  // If using 3-month data, compute monthly average
  if (currentTotalExpenses === 0 && totalExpenses3m > 0) {
    needsTotal = needsTotal / 3;
    wantsTotal = wantsTotal / 3;
    savingsExpenseTotal = savingsExpenseTotal / 3;
  }

  // Calculate percentages of income
  const needsPercent = effectiveIncome > 0 ? (needsTotal / effectiveIncome) * 100 : 0;
  const wantsPercent = effectiveIncome > 0 ? (wantsTotal / effectiveIncome) * 100 : 0;
  const savingsPercent =
    effectiveIncome > 0
      ? ((effectiveIncome - effectiveExpenses + savingsExpenseTotal) / effectiveIncome) * 100
      : 0;

  // Savings rate
  const savingsRate =
    effectiveIncome > 0
      ? ((effectiveIncome - effectiveExpenses) / effectiveIncome) * 100
      : 0;

  // ---- Housing cost ----
  let housingCost = 0;
  const housingExpenses = (currentTotalExpenses > 0 ? currentExpenses : expenses3m).filter(
    (e) => e.category.type === "housing"
  );
  housingCost = housingExpenses.reduce((s, e) => s + Number(e.amount), 0);
  if (currentTotalExpenses === 0 && totalExpenses3m > 0) {
    housingCost = housingCost / 3;
  }
  const housingPercent = effectiveIncome > 0 ? (housingCost / effectiveIncome) * 100 : 0;

  // ---- Emergency fund coverage ----
  const emergencyFundGoal = goals.find((g) => g.type === "emergency_fund");
  const emergencyFundCurrent = emergencyFundGoal ? Number(emergencyFundGoal.currentAmount) : 0;
  const emergencyFundTarget = Number(settings?.emergencyFundGoal || 0);

  // Calculate months of expenses covered
  const monthlyExpenseAvg = avgMonthlyExpenses > 0 ? avgMonthlyExpenses : effectiveExpenses;
  const emergencyMonthsCovered =
    monthlyExpenseAvg > 0 ? emergencyFundCurrent / monthlyExpenseAvg : 0;

  // ---- Debt-to-income ----
  let debtExpenses = 0;
  const debtExpensesList = (currentTotalExpenses > 0 ? currentExpenses : expenses3m).filter(
    (e) => e.category.type === "debt"
  );
  debtExpenses = debtExpensesList.reduce((s, e) => s + Number(e.amount), 0);
  if (currentTotalExpenses === 0 && totalExpenses3m > 0) {
    debtExpenses = debtExpenses / 3;
  }
  const debtToIncomeRatio = effectiveIncome > 0 ? (debtExpenses / effectiveIncome) * 100 : 0;

  // ---- Investment allocation ----
  let investmentExpenses = 0;
  const investExpensesList = (currentTotalExpenses > 0 ? currentExpenses : expenses3m).filter(
    (e) => e.category.type === "investments"
  );
  investmentExpenses = investExpensesList.reduce((s, e) => s + Number(e.amount), 0);
  if (currentTotalExpenses === 0 && totalExpenses3m > 0) {
    investmentExpenses = investmentExpenses / 3;
  }
  const investmentPercent =
    effectiveIncome > 0 ? (investmentExpenses / effectiveIncome) * 100 : 0;

  // ---- Jar compliance (how well the user follows their jar rules) ----
  const jarRules = (settings?.jarRulesJson || {
    necessities: 55,
    education: 10,
    savings: 10,
    play: 10,
    investment: 10,
    giving: 5,
  }) as Record<string, number>;

  const jarExpenses = currentTotalExpenses > 0 ? currentExpenses : expenses3m;
  const jarActual: Record<string, number> = {};
  for (const expense of jarExpenses) {
    if (expense.jarType) {
      jarActual[expense.jarType] = (jarActual[expense.jarType] || 0) + Number(expense.amount);
    }
  }
  if (currentTotalExpenses === 0 && totalExpenses3m > 0) {
    for (const key of Object.keys(jarActual)) {
      jarActual[key] = jarActual[key] / 3;
    }
  }

  // Calculate jar compliance as average deviation from target
  let jarDeviationSum = 0;
  let jarCount = 0;
  const totalJarExpenses = Object.values(jarActual).reduce((s, v) => s + v, 0);
  const jarBase = totalJarExpenses > 0 ? totalJarExpenses : effectiveIncome;

  for (const [jarType, targetPercent] of Object.entries(jarRules)) {
    const actualAmount = jarActual[jarType] || 0;
    const actualPercent = jarBase > 0 ? (actualAmount / jarBase) * 100 : 0;
    const deviation = Math.abs(actualPercent - targetPercent);
    jarDeviationSum += deviation;
    jarCount++;
  }

  // Average deviation: 0 = perfect, higher = worse
  const avgJarDeviation = jarCount > 0 ? jarDeviationSum / jarCount : 0;
  // Convert to a compliance score: 100 - deviation (capped 0-100)
  const jarComplianceScore = Math.max(0, Math.min(100, 100 - avgJarDeviation * 2));

  // ---- Goal progress ----
  const activeGoals = goals.filter((g) => !g.isCompleted);
  const totalGoalTarget = activeGoals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalGoalCurrent = activeGoals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const goalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

  // ---- Build metrics array ----
  const metrics: BenchmarkMetric[] = [
    {
      id: "savings_rate",
      name: "Taxa de Poupanca",
      userValue: Math.round(savingsRate * 10) / 10,
      benchmarkValue: 20,
      unit: "percent",
      status: classifyStatus(
        savingsRate,
        { excellent: 25, good: 20, attention: 10 },
        true
      ),
      description:
        savingsRate >= 20
          ? "Excelente! Voce esta poupando acima do recomendado."
          : savingsRate >= 10
            ? "Bom, mas tente atingir pelo menos 20% da renda."
            : "Sua taxa de poupanca esta abaixo do ideal. Revise seus gastos.",
    },
    {
      id: "needs_percent",
      name: "Necessidades (Regra 50-30-20)",
      userValue: Math.round(needsPercent * 10) / 10,
      benchmarkValue: 50,
      unit: "percent",
      status: classifyStatus(
        needsPercent,
        { excellent: 45, good: 50, attention: 60 },
        false
      ),
      description:
        needsPercent <= 50
          ? "Seus gastos essenciais estao dentro do limite recomendado."
          : "Gastos essenciais acima de 50% da renda. Considere renegociar custos fixos.",
    },
    {
      id: "wants_percent",
      name: "Desejos (Regra 50-30-20)",
      userValue: Math.round(wantsPercent * 10) / 10,
      benchmarkValue: 30,
      unit: "percent",
      status: classifyStatus(
        wantsPercent,
        { excellent: 25, good: 30, attention: 40 },
        false
      ),
      description:
        wantsPercent <= 30
          ? "Gastos com desejos estao dentro do recomendado."
          : "Voce esta gastando mais que 30% com itens nao essenciais.",
    },
    {
      id: "emergency_fund",
      name: "Reserva de Emergencia",
      userValue: Math.round(emergencyMonthsCovered * 10) / 10,
      benchmarkValue: 6,
      unit: "months",
      status: classifyStatus(
        emergencyMonthsCovered,
        { excellent: 6, good: 3, attention: 1 },
        true
      ),
      description:
        emergencyMonthsCovered >= 6
          ? "Reserva de emergencia completa! Voce tem mais de 6 meses cobertos."
          : emergencyMonthsCovered >= 3
            ? "Boa reserva, mas o ideal e cobrir 6 meses de despesas."
            : "Priorize construir sua reserva de emergencia.",
    },
    {
      id: "housing_cost",
      name: "Custo de Moradia",
      userValue: Math.round(housingPercent * 10) / 10,
      benchmarkValue: 30,
      unit: "percent",
      status: classifyStatus(
        housingPercent,
        { excellent: 20, good: 30, attention: 40 },
        false
      ),
      description:
        housingPercent <= 30
          ? "Seu custo de moradia esta dentro do recomendado."
          : "Moradia consome mais de 30% da renda. Considere alternativas.",
    },
    {
      id: "debt_to_income",
      name: "Comprometimento com Dividas",
      userValue: Math.round(debtToIncomeRatio * 10) / 10,
      benchmarkValue: 0,
      unit: "percent",
      status: classifyStatus(
        debtToIncomeRatio,
        { excellent: 5, good: 15, attention: 30 },
        false
      ),
      description:
        debtToIncomeRatio <= 15
          ? "Seu nivel de endividamento esta sob controle."
          : "Alto comprometimento com dividas. Priorize a quitacao.",
    },
    {
      id: "investment_allocation",
      name: "Alocacao em Investimentos",
      userValue: Math.round(investmentPercent * 10) / 10,
      benchmarkValue: 10,
      unit: "percent",
      status: classifyStatus(
        investmentPercent,
        { excellent: 15, good: 10, attention: 5 },
        true
      ),
      description:
        investmentPercent >= 10
          ? "Otimo! Voce esta investindo uma boa parcela da renda."
          : "Tente destinar pelo menos 10% da renda para investimentos.",
    },
    {
      id: "jar_compliance",
      name: "Aderencia aos Jarros",
      userValue: Math.round(jarComplianceScore * 10) / 10,
      benchmarkValue: 100,
      unit: "percent",
      status: classifyStatus(
        jarComplianceScore,
        { excellent: 85, good: 70, attention: 50 },
        true
      ),
      description:
        jarComplianceScore >= 85
          ? "Voce esta seguindo muito bem a distribuicao dos jarros!"
          : jarComplianceScore >= 70
            ? "Boa aderencia, mas ha espaco para ajustes."
            : "Sua distribuicao esta distante das metas dos jarros. Revise sua alocacao.",
    },
    {
      id: "goal_progress",
      name: "Progresso das Metas",
      userValue: Math.round(goalProgress * 10) / 10,
      benchmarkValue: 100,
      unit: "percent",
      status: classifyStatus(
        goalProgress,
        { excellent: 75, good: 50, attention: 25 },
        true
      ),
      description:
        activeGoals.length === 0
          ? "Nenhuma meta ativa. Defina metas para acompanhar seu progresso!"
          : goalProgress >= 75
            ? "Voce esta perto de atingir suas metas. Continue assim!"
            : goalProgress >= 50
              ? "Bom progresso! Continue contribuindo regularmente."
              : "Suas metas precisam de mais atencao. Aumente as contribuicoes.",
    },
  ];

  // ---- Calculate overall score ----
  // Weighted average of all metric scores
  const weights: Record<string, number> = {
    savings_rate: 20,
    needs_percent: 15,
    wants_percent: 10,
    emergency_fund: 15,
    housing_cost: 10,
    debt_to_income: 10,
    investment_allocation: 10,
    jar_compliance: 5,
    goal_progress: 5,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    const weight = weights[metric.id] || 5;
    weightedSum += statusToScore(metric.status) * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallScore,
    metrics,
    savingsRate: Math.round(savingsRate * 10) / 10,
    needsPercent: Math.round(needsPercent * 10) / 10,
    wantsPercent: Math.round(wantsPercent * 10) / 10,
    savingsPercent: Math.round(Math.max(0, savingsPercent) * 10) / 10,
    totalIncome: effectiveIncome,
    totalExpenses: effectiveExpenses,
  };
}
