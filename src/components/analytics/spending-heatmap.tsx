"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { motion } from "framer-motion";

interface SpendingHeatmapProps {
  dailyExpenses: Record<number, number>;
  month: number;
  year: number;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getIntensity(amount: number, max: number): string {
  if (amount === 0) return "bg-muted/30";
  const ratio = amount / max;
  if (ratio <= 0.25) return "bg-green-500/30";
  if (ratio <= 0.5) return "bg-yellow-500/40";
  if (ratio <= 0.75) return "bg-orange-500/50";
  return "bg-red-500/60";
}

export function SpendingHeatmap({
  dailyExpenses,
  month,
  year,
}: SpendingHeatmapProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const maxSpending = Math.max(
    ...Object.values(dailyExpenses),
    1
  );

  // Build calendar grid
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Pad first week
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Pad last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            Mapa de Calor de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] text-muted-foreground font-medium"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => {
                  if (day === null) {
                    return <div key={dayIdx} className="aspect-square" />;
                  }

                  const amount = dailyExpenses[day] || 0;
                  const intensity = getIntensity(amount, maxSpending);

                  return (
                    <div
                      key={dayIdx}
                      className={`aspect-square rounded-sm flex items-center justify-center cursor-default group relative ${intensity}`}
                      title={`Dia ${day}: ${formatBRL(amount)}`}
                    >
                      <span className="text-[9px] text-foreground/60">
                        {day}
                      </span>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                        <div className="rounded-md bg-popover border px-2 py-1 text-[10px] whitespace-nowrap shadow-md">
                          {formatBRL(amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-3">
            <span className="text-[10px] text-muted-foreground mr-1">Menos</span>
            <div className="h-3 w-3 rounded-sm bg-muted/30" />
            <div className="h-3 w-3 rounded-sm bg-green-500/30" />
            <div className="h-3 w-3 rounded-sm bg-yellow-500/40" />
            <div className="h-3 w-3 rounded-sm bg-orange-500/50" />
            <div className="h-3 w-3 rounded-sm bg-red-500/60" />
            <span className="text-[10px] text-muted-foreground ml-1">Mais</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
