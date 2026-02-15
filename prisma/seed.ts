import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Reuse constants from the app
const DEFAULT_EXPENSE_CATEGORIES = [
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
];

const DEFAULT_INCOME_SOURCES = [
  { name: "Salário", type: "salary" },
  { name: "Freelance", type: "freelance" },
  { name: "Investimentos", type: "investments" },
  { name: "Outros", type: "other" },
];

const DEFAULT_JAR_RULES = {
  necessities: 55,
  education: 10,
  savings: 10,
  play: 10,
  investment: 10,
  giving: 5,
};

const JAR_TYPES = [
  "necessities",
  "education",
  "savings",
  "play",
  "investment",
  "giving",
] as const;

async function main() {
  const email = "admin@finpulse.com";

  // Check if user already has full seed data
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { expenseCategories: true },
  });

  if (existing && existing.expenseCategories.length > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);

  // Upsert admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: { onboarded: true },
    create: {
      name: "Admin",
      email,
      hashedPassword,
      onboarded: true,
    },
  });

  console.log(`User ready: ${user.email} (id: ${user.id})`);

  // UserSettings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      currency: "BRL",
      locale: "pt-BR",
      initialBalance: 2500,
      estimatedMonthlyIncome: 4500,
      jarRulesJson: DEFAULT_JAR_RULES,
    },
  });
  console.log("UserSettings created");

  // Expense Categories
  const categories: Record<string, string> = {};
  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    const cat = DEFAULT_EXPENSE_CATEGORIES[i];
    const created = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        sortOrder: i,
      },
    });
    categories[cat.name] = created.id;
  }
  console.log(`${DEFAULT_EXPENSE_CATEGORIES.length} ExpenseCategories created`);

  // Income Sources
  const sources: Record<string, string> = {};
  for (let i = 0; i < DEFAULT_INCOME_SOURCES.length; i++) {
    const src = DEFAULT_INCOME_SOURCES[i];
    const created = await prisma.incomeSource.create({
      data: {
        userId: user.id,
        name: src.name,
        type: src.type,
        sortOrder: i,
      },
    });
    sources[src.name] = created.id;
  }
  console.log(`${DEFAULT_INCOME_SOURCES.length} IncomeSources created`);

  // Fixed Expense Templates
  const fixedExpenses = [
    { name: "Aluguel", amount: 1200, dueDay: 5, category: "Moradia" },
    { name: "Energia", amount: 180, dueDay: 10, category: "Moradia" },
    { name: "Internet", amount: 120, dueDay: 15, category: "Assinaturas" },
    { name: "Água", amount: 80, dueDay: 12, category: "Moradia" },
    { name: "Celular", amount: 65, dueDay: 20, category: "Assinaturas" },
  ];

  for (const fe of fixedExpenses) {
    await prisma.fixedExpenseTemplate.create({
      data: {
        userId: user.id,
        categoryId: categories[fe.category],
        name: fe.name,
        amount: fe.amount,
        dueDay: fe.dueDay,
        isActive: true,
      },
    });
  }
  console.log(`${fixedExpenses.length} FixedExpenseTemplates created`);

  // Generate 3 months of data (Dec 2025, Jan 2026, Feb 2026)
  const months = [
    { month: 12, year: 2025 },
    { month: 1, year: 2026 },
    { month: 2, year: 2026 },
  ];

  for (const { month, year } of months) {
    // Income entries
    const salaryAmount = 4000 + Math.round(Math.random() * 500);
    const freelanceAmount = 300 + Math.round(Math.random() * 400);

    await prisma.income.create({
      data: {
        userId: user.id,
        sourceId: sources["Salário"],
        amount: salaryAmount,
        description: `Salário ${month}/${year}`,
        date: new Date(year, month - 1, 5),
        isRecurring: true,
        isConfirmed: true,
      },
    });

    await prisma.income.create({
      data: {
        userId: user.id,
        sourceId: sources["Freelance"],
        amount: freelanceAmount,
        description: `Projeto freelance ${month}/${year}`,
        date: new Date(year, month - 1, 15),
        isConfirmed: true,
      },
    });

    const totalIncome = salaryAmount + freelanceAmount;

    // Expense entries distributed across categories and jars
    const expenseData = [
      { desc: "Aluguel", amount: 1200, cat: "Moradia", jar: "necessities", day: 5, isFixed: true },
      { desc: "Supermercado", amount: 450 + Math.round(Math.random() * 100), cat: "Alimentação", jar: "necessities", day: 8, isFixed: false },
      { desc: "Energia elétrica", amount: 180, cat: "Moradia", jar: "necessities", day: 10, isFixed: true },
      { desc: "Internet", amount: 120, cat: "Assinaturas", jar: "necessities", day: 15, isFixed: true },
      { desc: "Combustível", amount: 200 + Math.round(Math.random() * 80), cat: "Transporte", jar: "necessities", day: 12, isFixed: false },
      { desc: "Farmácia", amount: 80 + Math.round(Math.random() * 50), cat: "Saúde", jar: "necessities", day: 18, isFixed: false },
      { desc: "Curso online", amount: 150, cat: "Educação", jar: "education", day: 7, isFixed: false },
      { desc: "Cinema e restaurante", amount: 120 + Math.round(Math.random() * 60), cat: "Lazer", jar: "play", day: 20, isFixed: false },
      { desc: "Água", amount: 80, cat: "Moradia", jar: "necessities", day: 12, isFixed: true },
      { desc: "Celular", amount: 65, cat: "Assinaturas", jar: "necessities", day: 20, isFixed: true },
      { desc: "Ração pet", amount: 90, cat: "Pets", jar: "necessities", day: 14, isFixed: false },
      { desc: "Roupas", amount: 100 + Math.round(Math.random() * 50), cat: "Vestuário", jar: "play", day: 22, isFixed: false },
    ];

    let totalExpenses = 0;
    for (const exp of expenseData) {
      const day = Math.min(exp.day, 28); // avoid invalid dates
      await prisma.expense.create({
        data: {
          userId: user.id,
          categoryId: categories[exp.cat],
          amount: exp.amount,
          description: exp.desc,
          date: new Date(year, month - 1, day),
          jarType: exp.jar,
          isFixed: exp.isFixed,
          isPaid: true,
          paymentMethod: exp.isFixed ? "boleto" : "pix",
        },
      });
      totalExpenses += exp.amount;
    }

    const totalFixed = expenseData
      .filter((e) => e.isFixed)
      .reduce((s, e) => s + e.amount, 0);
    const totalVariable = totalExpenses - totalFixed;
    const balance = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0
        ? Math.round((balance / totalIncome) * 10000) / 100
        : 0;

    console.log(
      `Month ${month}/${year}: income=${totalIncome}, expenses=${totalExpenses}, balance=${balance}`
    );

    // MonthSnapshot (only for past months, not the current one)
    if (!(month === 2 && year === 2026)) {
      await prisma.monthSnapshot.create({
        data: {
          userId: user.id,
          month,
          year,
          totalIncome,
          totalFixedExpenses: totalFixed,
          totalVariableExpenses: totalVariable,
          totalExpenses,
          balance,
          savingsRate,
          closedAt: new Date(year, month, 1), // closed at start of next month
        },
      });
    }
  }

  console.log("3 months of Income/Expense data created");
  console.log("2 MonthSnapshots created");

  // Goals
  const goalsData = [
    {
      name: "Reserva de emergência",
      type: "emergency_fund",
      target: 15000,
      current: 4500,
      icon: "Shield",
      color: "#10b981",
    },
    {
      name: "Viagem de férias",
      type: "purchase",
      target: 5000,
      current: 1800,
      icon: "Plane",
      color: "#3b82f6",
      deadline: new Date(2026, 11, 31),
    },
    {
      name: "Novo notebook",
      type: "purchase",
      target: 4000,
      current: 2200,
      icon: "Laptop",
      color: "#8b5cf6",
      deadline: new Date(2026, 5, 30),
    },
  ];

  for (const g of goalsData) {
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        name: g.name,
        type: g.type,
        targetAmount: g.target,
        currentAmount: g.current,
        icon: g.icon,
        color: g.color,
        deadline: g.deadline,
      },
    });

    // Add some contributions to each goal
    const contributionCount = 3;
    const perContribution = g.current / contributionCount;
    for (let i = 0; i < contributionCount; i++) {
      await prisma.goalContribution.create({
        data: {
          userId: user.id,
          goalId: goal.id,
          amount: Math.round(perContribution * 100) / 100,
          note: `Contribuição ${i + 1}`,
          date: new Date(2025, 11 + i, 15), // Dec, Jan, Feb
        },
      });
    }
  }

  console.log(`${goalsData.length} Goals with contributions created`);
  console.log("Seed completed successfully!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
