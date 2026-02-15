"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  PiggyBank,
  ShoppingCart,
  TrendingUp,
  Target,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { FinancialTip } from "@/actions/advisor-actions";

interface FinancialAdvisorProps {
  tips: FinancialTip[];
}

const CATEGORY_ICONS: Record<FinancialTip["category"], React.ElementType> = {
  saving: PiggyBank,
  spending: ShoppingCart,
  investing: TrendingUp,
  goals: Target,
  general: Lightbulb,
};

const CATEGORY_COLORS: Record<FinancialTip["category"], string> = {
  saving: "text-green-500",
  spending: "text-orange-500",
  investing: "text-blue-500",
  goals: "text-purple-500",
  general: "text-yellow-500",
};

const CATEGORY_BG: Record<FinancialTip["category"], string> = {
  saving: "bg-green-500/10",
  spending: "bg-orange-500/10",
  investing: "bg-blue-500/10",
  goals: "bg-purple-500/10",
  general: "bg-yellow-500/10",
};

const PRIORITY_STYLES: Record<
  FinancialTip["priority"],
  { className: string; label: string }
> = {
  high: { className: "bg-red-500/15 text-red-600 border-red-500/30", label: "Alta" },
  medium: { className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", label: "Media" },
  low: { className: "bg-blue-500/15 text-blue-600 border-blue-500/30", label: "Baixa" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function FinancialAdvisor({ tips }: FinancialAdvisorProps) {
  if (tips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Consultor Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma dica disponivel no momento. Continue registrando suas
              transacoes para receber orientacoes personalizadas.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Consultor Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            <motion.div
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {tips.map((tip) => {
                const Icon = CATEGORY_ICONS[tip.category];
                const iconColor = CATEGORY_COLORS[tip.category];
                const iconBg = CATEGORY_BG[tip.category];
                const priority = PRIORITY_STYLES[tip.priority];

                return (
                  <motion.div
                    key={tip.id}
                    variants={itemVariants}
                    className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">
                          {tip.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${priority.className}`}
                        >
                          {priority.label}
                        </Badge>
                      </div>

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {tip.description}
                      </p>

                      {tip.actionLabel && tip.actionUrl && (
                        <Button
                          variant="link"
                          size="xs"
                          className="h-auto p-0 text-xs"
                          asChild
                        >
                          <Link href={tip.actionUrl}>
                            {tip.actionLabel}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
