"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/actions/achievement-actions";

interface AchievementsProps {
  achievements: Achievement[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function Achievements({ achievements }: AchievementsProps) {
  const unlocked = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Conquistas
        </h3>
        <span className="text-xs text-muted-foreground">
          {unlocked}/{achievements.length} desbloqueadas
        </span>
      </div>

      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {achievements.map((achievement) => {
          const progressPercent =
            achievement.target > 0
              ? Math.min(
                  (achievement.progress / achievement.target) * 100,
                  100
                )
              : 0;

          return (
            <motion.div key={achievement.id} variants={item}>
              <Card
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  achievement.isUnlocked
                    ? "border-primary/30 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.2)]"
                    : "grayscale opacity-50"
                )}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <span
                    className={cn(
                      "text-3xl leading-none select-none",
                      achievement.isUnlocked && "drop-shadow-sm"
                    )}
                    role="img"
                    aria-label={achievement.title}
                  >
                    {achievement.icon}
                  </span>

                  <h4 className="text-xs font-semibold leading-tight">
                    {achievement.title}
                  </h4>

                  <p className="text-[10px] leading-snug text-muted-foreground line-clamp-2">
                    {achievement.description}
                  </p>

                  {!achievement.isUnlocked && achievement.target > 1 && (
                    <div className="w-full space-y-1 mt-1">
                      <Progress
                        value={progressPercent}
                        className="h-1.5"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {achievement.progress}/{achievement.target}
                      </p>
                    </div>
                  )}

                  {achievement.isUnlocked && (
                    <span className="text-[10px] font-medium text-primary">
                      Desbloqueada
                    </span>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
