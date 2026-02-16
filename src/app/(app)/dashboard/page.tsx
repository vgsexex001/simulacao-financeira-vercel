import { getDashboardData } from "@/actions/dashboard-actions";
import { detectAnomalies } from "@/actions/analytics-actions";
import { getFinancialAdvice } from "@/actions/advisor-actions";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TodayFeed } from "@/components/dashboard/today-feed";
import { MonthPulse } from "@/components/dashboard/month-pulse";
import { JarStatusGrid } from "@/components/dashboard/jar-status-grid";
import { GoalsCarousel } from "@/components/dashboard/goals-carousel";
import { CashflowMiniChart } from "@/components/dashboard/cashflow-mini-chart";
import { SmartAlerts } from "@/components/dashboard/smart-alerts";
import { FinancialAdvisor } from "@/components/dashboard/financial-advisor";
import { TopCategoriesChart } from "@/components/dashboard/top-categories-chart";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [data, anomalies, tips] = await Promise.all([
    getDashboardData(),
    detectAnomalies(),
    getFinancialAdvice(),
  ]);

  return (
    <div className="space-y-6">
      <BalanceHero
        totalIncome={data.totalIncome}
        totalExpenses={data.totalExpenses}
        balance={data.balance}
        savingsRate={data.savingsRate}
        cumulativeBalance={data.cumulativeBalance}
        balanceExplainer={data.balanceExplainer}
        expenseByCategory={data.expenseByCategory}
        incomeBreakdown={data.incomeBreakdown}
        trends={data.trends}
      />

      <QuickActions />

      <SmartAlerts
        jarBalances={data.jarBalances}
        jarRules={data.jarRules}
        totalIncome={data.totalIncome}
        totalExpenses={data.totalExpenses}
        daysInMonth={data.daysInMonth}
        currentDay={data.currentDay}
        fixedExpensesDue={data.fixedExpensesDue}
        savingsRate={data.savingsRate}
        anomalies={anomalies}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <TodayFeed
          expenses={data.todayExpenses}
          incomes={data.todayIncomes}
        />
        <MonthPulse dailyExpenses={data.dailyExpenses} />
      </div>

      <JarStatusGrid
        jarRules={data.jarRules}
        jarBalances={data.jarBalances}
        totalIncome={data.totalIncome}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <GoalsCarousel goals={data.goals} />
        <TopCategoriesChart data={data.expenseByCategory.slice(0, 5)} />
      </div>

      <CashflowMiniChart data={data.cashflow} />

      <FinancialAdvisor tips={tips} />
    </div>
  );
}
