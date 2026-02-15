"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/format";
import { Target } from "lucide-react";
import Link from "next/link";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string | null;
  icon: string | null;
}

interface GoalsCarouselProps {
  goals: Goal[];
}

export function GoalsCarousel({ goals }: GoalsCarouselProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Metas
          </span>
          <Link
            href="/goals"
            className="text-xs text-primary hover:underline"
          >
            Ver todas
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma meta definida
          </p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const percent =
                goal.targetAmount > 0
                  ? (goal.currentAmount / goal.targetAmount) * 100
                  : 0;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBRL(goal.currentAmount)} / {formatBRL(goal.targetAmount)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percent, 100)}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
