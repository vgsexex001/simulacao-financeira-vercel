"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { Clock, PlusCircle } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: "expense" | "income";
  time: Date;
  category?: string;
  categoryColor?: string | null;
  source?: string;
}

interface TodayFeedProps {
  expenses: Transaction[];
  incomes: Transaction[];
}

export function TodayFeed({ expenses, incomes }: TodayFeedProps) {
  const all = [...expenses, ...incomes].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma transação hoje
            </p>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Registrar transação
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {all.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        t.type === "expense"
                          ? t.categoryColor || "#ef4444"
                          : "#10b981",
                    }}
                  />
                  <span className="text-foreground">{t.description}</span>
                </div>
                <span
                  className={`font-mono font-semibold ${
                    t.type === "expense" ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {t.type === "expense" ? "-" : "+"}
                  {formatBRL(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
