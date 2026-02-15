"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatBRL } from "@/lib/format";
import { HelpCircle, TrendingUp, Target, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface WhatIfProps {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  monthlySavings: number;
  categories: Array<{
    id: string;
    name: string;
    color: string;
    avgMonthly: number;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    remaining: number;
  }>;
}

export function WhatIfSimulator({
  avgMonthlyIncome,
  avgMonthlyExpenses,
  monthlySavings,
  categories,
  goals,
}: WhatIfProps) {
  const [incomeBoost, setIncomeBoost] = useState(0);
  const [expenseCut, setExpenseCut] = useState(0);
  const [investMonthly, setInvestMonthly] = useState(0);

  const projectedIncome = avgMonthlyIncome + incomeBoost;
  const projectedExpenses = avgMonthlyExpenses - expenseCut;
  const projectedSavings = projectedIncome - projectedExpenses;
  const additionalSavings = projectedSavings - monthlySavings;

  const goalProjections = useMemo(() => {
    return goals.map((goal) => {
      const monthsWithCurrent =
        monthlySavings > 0
          ? Math.ceil(goal.remaining / monthlySavings)
          : Infinity;
      const monthsWithChanges =
        projectedSavings > 0
          ? Math.ceil(goal.remaining / projectedSavings)
          : Infinity;
      return {
        ...goal,
        monthsWithCurrent,
        monthsWithChanges,
        monthsSaved:
          monthsWithCurrent !== Infinity && monthsWithChanges !== Infinity
            ? monthsWithCurrent - monthsWithChanges
            : 0,
      };
    });
  }, [goals, monthlySavings, projectedSavings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-primary" />
            E se eu...
          </CardTitle>
          <CardDescription>
            Simule mudanças e veja o impacto nas suas finanças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Income boost */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Aumentasse a renda em
              </Label>
              <span className="font-mono text-sm font-bold text-green-500">
                +{formatBRL(incomeBoost)}
              </span>
            </div>
            <Slider
              value={[incomeBoost]}
              onValueChange={([v]) => setIncomeBoost(v)}
              min={0}
              max={5000}
              step={100}
            />
          </div>

          {/* Expense cut */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-red-500" />
                Cortasse despesas em
              </Label>
              <span className="font-mono text-sm font-bold text-red-500">
                -{formatBRL(expenseCut)}
              </span>
            </div>
            <Slider
              value={[expenseCut]}
              onValueChange={([v]) => setExpenseCut(v)}
              min={0}
              max={Math.round(avgMonthlyExpenses * 0.5)}
              step={50}
            />
          </div>

          {/* Invest monthly */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Investisse por mês
              </Label>
              <span className="font-mono text-sm font-bold text-blue-500">
                {formatBRL(investMonthly)}
              </span>
            </div>
            <Slider
              value={[investMonthly]}
              onValueChange={([v]) => setInvestMonthly(v)}
              min={0}
              max={3000}
              step={50}
            />
          </div>

          {/* Results */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold">Resultado da simulação</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Poupança atual/mês</p>
                <p className={`text-sm font-bold font-mono ${monthlySavings >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatBRL(monthlySavings)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Poupança projetada/mês</p>
                <p className={`text-sm font-bold font-mono ${projectedSavings >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatBRL(projectedSavings)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                <p className="text-[10px] uppercase text-muted-foreground">Diferença mensal</p>
                <p className={`text-sm font-bold font-mono ${additionalSavings >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {additionalSavings >= 0 ? "+" : ""}{formatBRL(additionalSavings)}
                </p>
              </div>
            </div>

            {investMonthly > 0 && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs">
                  Investindo {formatBRL(investMonthly)}/mês, em 12 meses você terá{" "}
                  <span className="font-bold">{formatBRL(investMonthly * 12)}</span> investido.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goal projections */}
      {goalProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Quando atinjo minhas metas?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goalProjections.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Falta {formatBRL(goal.remaining)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Atual:{" "}
                    {goal.monthsWithCurrent === Infinity
                      ? "Nunca"
                      : `${goal.monthsWithCurrent} meses`}
                  </p>
                  {(incomeBoost > 0 || expenseCut > 0) && (
                    <p className="text-xs font-semibold text-green-500">
                      Projetado:{" "}
                      {goal.monthsWithChanges === Infinity
                        ? "Nunca"
                        : `${goal.monthsWithChanges} meses`}
                      {goal.monthsSaved > 0 && ` (-${goal.monthsSaved})`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
