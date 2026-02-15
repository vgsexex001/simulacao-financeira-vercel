import {
  getMonthlyAnalytics,
  getAnnualAnalytics,
  getProjectionData,
  getWhatIfData,
  getComparisonData,
} from "@/actions/analytics-actions";
import { getFinancialBenchmark } from "@/actions/benchmark-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyAnalytics } from "@/components/analytics/monthly-analytics";
import { AnnualAnalytics } from "@/components/analytics/annual-analytics";
import { Projections } from "@/components/analytics/projections";
import { WhatIfSimulator } from "@/components/analytics/what-if-simulator";
import { ComparisonAnalytics } from "@/components/analytics/comparison-analytics";
import { FinancialBenchmark } from "@/components/analytics/financial-benchmark";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [monthlyData, annualData, projectionData, whatIfData, comparisonData, benchmarkData] =
    await Promise.all([
      getMonthlyAnalytics(currentMonth, currentYear),
      getAnnualAnalytics(currentYear),
      getProjectionData(),
      getWhatIfData(),
      getComparisonData(currentMonth, currentYear),
      getFinancialBenchmark(),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
          <TabsTrigger value="annual">Anual</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          <TabsTrigger value="projections">Projeções</TabsTrigger>
          <TabsTrigger value="whatif">E se...</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <MonthlyAnalytics
            data={monthlyData}
            month={currentMonth}
            year={currentYear}
          />
        </TabsContent>

        <TabsContent value="annual">
          <AnnualAnalytics data={annualData} year={currentYear} />
        </TabsContent>

        <TabsContent value="comparison">
          <ComparisonAnalytics data={comparisonData} />
        </TabsContent>

        <TabsContent value="projections">
          <Projections
            initialBalance={projectionData.initialBalance}
            fixedExpensesFromDB={projectionData.fixedExpensesFromDB}
            fixedTemplates={projectionData.fixedTemplates}
            averageIncome={projectionData.averageIncome}
          />
        </TabsContent>

        <TabsContent value="whatif">
          <WhatIfSimulator
            avgMonthlyIncome={whatIfData.avgMonthlyIncome}
            avgMonthlyExpenses={whatIfData.avgMonthlyExpenses}
            monthlySavings={whatIfData.monthlySavings}
            categories={whatIfData.categories}
            goals={whatIfData.goals}
          />
        </TabsContent>

        <TabsContent value="benchmark">
          <FinancialBenchmark data={benchmarkData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
