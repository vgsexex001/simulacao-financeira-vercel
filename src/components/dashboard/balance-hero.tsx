"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Landmark } from "lucide-react";
import { motion } from "framer-motion";

interface BalanceHeroProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  cumulativeBalance: number;
}

export function BalanceHero({
  totalIncome,
  totalExpenses,
  balance,
  savingsRate,
  cumulativeBalance,
}: BalanceHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Landmark className="h-4 w-4" />
            Saldo geral
          </div>

          <div
            className={`text-3xl font-bold font-mono ${
              cumulativeBalance >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {formatBRL(cumulativeBalance)}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Receitas do mês
              </div>
              <div className="mt-1 text-sm font-semibold font-mono text-green-500">
                {formatBRL(totalIncome)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Despesas do mês
              </div>
              <div className="mt-1 text-sm font-semibold font-mono text-red-500">
                {formatBRL(totalExpenses)}
              </div>
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
    </motion.div>
  );
}
