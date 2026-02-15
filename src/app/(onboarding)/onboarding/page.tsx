"use client";

import { useRouter } from "next/navigation";
import { useOnboarding } from "@/stores/onboarding-store";
import { completeOnboarding } from "@/actions/onboarding-actions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepIncome } from "@/components/onboarding/step-income";
import { StepFixedExpenses } from "@/components/onboarding/step-fixed-expenses";
import { StepCategories } from "@/components/onboarding/step-categories";
import { StepJars } from "@/components/onboarding/step-jars";
import { StepGoals } from "@/components/onboarding/step-goals";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

const STEP_LABELS = [
  "Perfil",
  "Receitas",
  "Despesas Fixas",
  "Categorias",
  "Jarros",
  "Metas",
];

export default function OnboardingPage() {
  const router = useRouter();
  const store = useOnboarding();
  const [loading, setLoading] = useState(false);

  const progress = (store.step / 6) * 100;

  async function handleComplete() {
    setLoading(true);
    try {
      const result = await completeOnboarding({
        name: store.name,
        incomeSources: store.incomeSources,
        fixedExpenses: store.fixedExpenses,
        categories: store.categories,
        initialBalance: store.initialBalance,
        jarRules: store.jarRules,
        goals: store.goals,
      });
      if (result.success) {
        toast.success("Configuração concluída!");
        window.location.href = "/dashboard";
      }
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  }

  function canProceed(): boolean {
    switch (store.step) {
      case 1:
        return store.name.trim().length >= 2;
      case 2:
        return store.incomeSources.some((s) => s.name.trim());
      case 3:
        return true;
      case 4:
        return store.categories.length > 0;
      case 5: {
        const sum = Object.values(store.jarRules).reduce((a, b) => a + b, 0);
        return sum === 100;
      }
      case 6:
        return true;
      default:
        return false;
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Configurar FinPulse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Passo {store.step} de 6 — {STEP_LABELS[store.step - 1]}
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      <AnimatePresence mode="wait">
        <motion.div
          key={store.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {store.step === 1 && <StepProfile />}
          {store.step === 2 && <StepIncome />}
          {store.step === 3 && <StepFixedExpenses />}
          {store.step === 4 && <StepCategories />}
          {store.step === 5 && <StepJars />}
          {store.step === 6 && <StepGoals />}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={store.prevStep}
          disabled={store.step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {store.step < 6 ? (
          <Button onClick={store.nextStep} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
