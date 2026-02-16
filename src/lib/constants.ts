export const JAR_TYPES = {
  NECESSITIES: "necessities",
  EDUCATION: "education",
  SAVINGS: "savings",
  PLAY: "play",
  INVESTMENT: "investment",
  GIVING: "giving",
} as const;

export type JarType = (typeof JAR_TYPES)[keyof typeof JAR_TYPES];

export const JAR_CONFIG = {
  [JAR_TYPES.NECESSITIES]: {
    label: "Necessidades",
    icon: "Home",
    color: "#3b82f6",
    defaultPercent: 55,
    tip: "Se ultrapassa frequentemente, considere cortar custos fixos ou buscar alternativas mais baratas.",
  },
  [JAR_TYPES.EDUCATION]: {
    label: "Educação",
    icon: "GraduationCap",
    color: "#8b5cf6",
    defaultPercent: 10,
    tip: "Invista em você: cursos, livros, mentorias. O maior retorno vem do conhecimento.",
  },
  [JAR_TYPES.SAVINGS]: {
    label: "Poupança",
    icon: "PiggyBank",
    color: "#10b981",
    defaultPercent: 10,
    tip: "Poupança para grandes compras ou projetos de longo prazo. Mantenha a disciplina!",
  },
  [JAR_TYPES.PLAY]: {
    label: "Diversão",
    icon: "PartyPopper",
    color: "#f59e0b",
    defaultPercent: 10,
    tip: "Gaste SEM CULPA — este dinheiro é para aproveitar a vida!",
  },
  [JAR_TYPES.INVESTMENT]: {
    label: "Investimentos",
    icon: "TrendingUp",
    color: "#06b6d4",
    defaultPercent: 10,
    tip: "SAGRADO — nunca gaste, só invista. É a semente da sua liberdade financeira.",
  },
  [JAR_TYPES.GIVING]: {
    label: "Doações",
    icon: "Heart",
    color: "#ec4899",
    defaultPercent: 5,
    tip: "Contribua para causas que você acredita. Generosidade gera abundância.",
  },
} as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
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
] as const;

export const DEFAULT_INCOME_SOURCES = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Outros",
] as const;

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export const MONTHS_SHORT_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

export const ALERT_THRESHOLDS = {
  BUDGET_WARNING_PERCENT: 80,
  BUDGET_DANGER_PERCENT: 100,
  SAVINGS_RATE_GOOD: 20,
  ANOMALY_RATIO: 2,
  DUE_DATE_WARN_DAYS: 3,
  PROJECTION_MIN_DAYS: 5,
} as const;
