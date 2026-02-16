"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatBRL, formatPercent } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface BalanceExplainer {
  initialBalance: number;
  monthIncome: number;
  monthExpenses: number;
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  color: string | null;
}

interface IncomeBreakdown {
  name: string;
  amount: number;
}

interface Trends {
  incomeChange: number | null;
  expenseChange: number | null;
}

interface BalanceHeroProps {
  totalIncome: number;
  totalExpenses: number;
  totalPending: number;
  balance: number;
  savingsRate: number;
  cumulativeBalance: number;
  balanceExplainer: BalanceExplainer;
  expenseByCategory: CategoryBreakdown[];
  incomeBreakdown: IncomeBreakdown[];
  trends: Trends;
}

function TrendBadge({
  change,
  invertColors = false,
}: {
  change: number | null;
  /** When true, up=red and down=green (used for expenses where less is better) */
  invertColors?: boolean;
}) {
  if (change === null) return null;
  const isUp = change > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  const isPositive = invertColors ? !isUp : isUp;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isPositive ? "text-green-500" : "text-red-500"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

export function BalanceHero({
  totalIncome,
  totalExpenses,
  totalPending,
  balance,
  savingsRate,
  cumulativeBalance,
  balanceExplainer,
  expenseByCategory,
  incomeBreakdown,
  trends,
}: BalanceHeroProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                  <Landmark className="h-4 w-4" />
                  Saldo geral
                  <Info className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between gap-4">
                    <span>Saldo inicial:</span>
                    <span>{formatBRL(balanceExplainer.initialBalance)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-green-400">
                    <span>+ Receitas do mês:</span>
                    <span>{formatBRL(balanceExplainer.monthIncome)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-red-400">
                    <span>- Despesas do mês:</span>
                    <span>{formatBRL(balanceExplainer.monthExpenses)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-1 flex justify-between gap-4 font-bold">
                    <span>=</span>
                    <span>{formatBRL(cumulativeBalance)}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={() => setSheetOpen(true)}
            className={`text-3xl font-bold font-mono cursor-pointer hover:opacity-80 transition-opacity ${
              cumulativeBalance >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {formatBRL(cumulativeBalance)}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Receitas do mês
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-sm font-semibold font-mono text-green-500">
                  {formatBRL(totalIncome)}
                </span>
                <TrendBadge change={trends.incomeChange} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Despesas do mês
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-sm font-semibold font-mono text-red-500">
                  {formatBRL(totalExpenses)}
                </span>
                <TrendBadge change={trends.expenseChange} invertColors />
              </div>
              {totalPending > 0 && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  +{formatBRL(totalPending)} pendentes
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                Balanço do mês
              </div>
              <div
                className={`mt-1 text-sm font-semibold font-mono ${
                  balance >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {formatBRL(balance)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Taxa de poupança
              </div>
              <div
                className={`mt-1 text-sm font-semibold font-mono ${
                  savingsRate >= 20
                    ? "text-green-500"
                    : savingsRate >= 0
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {formatPercent(savingsRate)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhamento do Saldo</SheetTitle>
            <SheetDescription>Como seu saldo geral é calculado</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-4">
            {/* Formula */}
            <div className="rounded-lg border p-4 space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo inicial</span>
                <span>{formatBRL(balanceExplainer.initialBalance)}</span>
              </div>
              <div className="flex justify-between text-green-500">
                <span>+ Receitas do mês</span>
                <span>{formatBRL(balanceExplainer.monthIncome)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>- Despesas do mês</span>
                <span>{formatBRL(balanceExplainer.monthExpenses)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>= Saldo geral</span>
                <span className={cumulativeBalance >= 0 ? "text-green-500" : "text-red-500"}>
                  {formatBRL(cumulativeBalance)}
                </span>
              </div>
              {totalPending > 0 && (
                <div className="mt-2 flex justify-between text-yellow-500 text-xs">
                  <span>Despesas pendentes</span>
                  <span>{formatBRL(totalPending)}</span>
                </div>
              )}
            </div>

            {/* Income breakdown */}
            {incomeBreakdown.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Receitas
                </h4>
                <div className="space-y-2">
                  {incomeBreakdown.map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-mono text-green-500">{formatBRL(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expense breakdown */}
            {expenseByCategory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Despesas por categoria
                </h4>
                <div className="space-y-2">
                  {expenseByCategory.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: item.color || "#64748b" }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono text-red-500">{formatBRL(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
