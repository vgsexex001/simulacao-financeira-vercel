import { create } from "zustand";

interface IncomeSourceInput {
  name: string;
  amount: number;
}

interface FixedExpenseInput {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
}

interface CategoryInput {
  name: string;
  icon: string;
  color: string;
}

interface GoalInput {
  name: string;
  targetAmount: number;
  icon: string;
  color: string;
}

interface JarRules {
  [key: string]: number;
  necessities: number;
  education: number;
  savings: number;
  play: number;
  investment: number;
  giving: number;
}

interface OnboardingState {
  step: number;
  name: string;
  incomeSources: IncomeSourceInput[];
  fixedExpenses: FixedExpenseInput[];
  categories: CategoryInput[];
  initialBalance: number;
  jarRules: JarRules;
  goals: GoalInput[];

  setStep: (step: number) => void;
  setName: (name: string) => void;
  setIncomeSources: (sources: IncomeSourceInput[]) => void;
  setFixedExpenses: (expenses: FixedExpenseInput[]) => void;
  setCategories: (categories: CategoryInput[]) => void;
  setInitialBalance: (balance: number) => void;
  setJarRules: (rules: JarRules) => void;
  setGoals: (goals: GoalInput[]) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useOnboarding = create<OnboardingState>((set) => ({
  step: 1,
  name: "",
  incomeSources: [{ name: "Salário", amount: 0 }],
  fixedExpenses: [],
  categories: [
    { name: "Alimentação", icon: "UtensilsCrossed", color: "#f59e0b" },
    { name: "Transporte", icon: "Car", color: "#3b82f6" },
    { name: "Moradia", icon: "Home", color: "#8b5cf6" },
    { name: "Saúde", icon: "Heart", color: "#ef4444" },
    { name: "Educação", icon: "GraduationCap", color: "#10b981" },
    { name: "Lazer", icon: "Gamepad2", color: "#f97316" },
    { name: "Vestuário", icon: "Shirt", color: "#ec4899" },
    { name: "Assinaturas", icon: "CreditCard", color: "#6366f1" },
    { name: "Pets", icon: "Dog", color: "#84cc16" },
    { name: "Outros", icon: "MoreHorizontal", color: "#64748b" },
  ],
  initialBalance: 0,
  jarRules: {
    necessities: 55,
    education: 10,
    savings: 10,
    play: 10,
    investment: 10,
    giving: 5,
  },
  goals: [],

  setStep: (step) => set({ step }),
  setName: (name) => set({ name }),
  setIncomeSources: (incomeSources) => set({ incomeSources }),
  setFixedExpenses: (fixedExpenses) => set({ fixedExpenses }),
  setCategories: (categories) => set({ categories }),
  setInitialBalance: (initialBalance) => set({ initialBalance }),
  setJarRules: (jarRules) => set({ jarRules }),
  setGoals: (goals) => set({ goals }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 6) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
}));
