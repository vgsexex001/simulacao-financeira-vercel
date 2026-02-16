import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SOURCE_TYPE_MAP: Record<string, string> = {
  "salário clt": "salary",
  "freelance / projetos": "freelance",
  "vendas online": "sales",
  "consultoria": "consulting",
  "rendimentos / investimentos": "investments",
  "aluguel recebido": "rent",
  "comissões": "commissions",
  "bônus / participação": "bonus",
  "renda extra / bico": "extra",
  "outros": "other",
};

const FREQUENCY_MAP: Record<string, string> = {
  "mensal fixo": "monthly_fixed",
  "variável/projeto": "per_project",
  "variável": "monthly_variable",
  "por demanda": "sporadic",
  "mensal (juros)": "monthly_fixed",
  "semestral": "sporadic",
  "esporádico": "sporadic",
};

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "moradia": { icon: "Home", color: "#8b5cf6" },
  "alimentação": { icon: "UtensilsCrossed", color: "#f59e0b" },
  "transporte": { icon: "Car", color: "#3b82f6" },
  "saúde": { icon: "Heart", color: "#ef4444" },
  "educação": { icon: "GraduationCap", color: "#10b981" },
  "lazer / diversão": { icon: "Gamepad2", color: "#f97316" },
  "lazer": { icon: "Gamepad2", color: "#f97316" },
  "vestuário": { icon: "Shirt", color: "#ec4899" },
  "assinaturas": { icon: "CreditCard", color: "#6366f1" },
  "tecnologia": { icon: "Monitor", color: "#06b6d4" },
  "impostos": { icon: "Receipt", color: "#f43f5e" },
  "seguros": { icon: "Shield", color: "#14b8a6" },
  "investimentos": { icon: "TrendingUp", color: "#22c55e" },
  "doações": { icon: "HeartHandshake", color: "#ec4899" },
  "dívida": { icon: "AlertTriangle", color: "#ef4444" },
  "documentação": { icon: "FileText", color: "#64748b" },
};

function excelDateToJSDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function parseDateCell(cell: unknown, year: number, monthIdx: number): Date | null {
  if (typeof cell === "number") {
    if (cell > 40000) return excelDateToJSDate(cell);
    if (cell >= 1 && cell <= 31) return new Date(year, monthIdx, Math.min(cell, 28));
    return null;
  }
  const str = String(cell ?? "").trim();
  if (!str) return null;
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) return new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
  const dayNum = parseInt(str);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) return new Date(year, monthIdx, Math.min(dayNum, 28));
  return null;
}

function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return Math.round(Math.abs(raw) * 100) / 100;
  const str = String(raw ?? "").trim().replace(/[R$\s]/g, "");
  if (!str) return 0;
  let cleaned = str.replace(/[()]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  return Math.round(Math.abs(parseFloat(cleaned) || 0) * 100) / 100;
}

async function main() {
  const filePath = "Planilha atualizada - Controle financeiro (1).xlsx";
  console.log(`Reading: ${filePath}`);
  const wb = XLSX.readFile(filePath, { raw: true });

  // Find user
  const user = await prisma.user.findFirst({ where: { email: "admin@finpulse.com" } });
  if (!user) {
    console.error("User admin@finpulse.com not found. Run npm run db:seed first.");
    process.exit(1);
  }
  console.log(`User: ${user.email} (${user.id})`);

  // ═══════════════════════════════════════════
  // DELETE ALL EXISTING DATA
  // ═══════════════════════════════════════════
  console.log("\n=== Deleting all existing data ===");
  await prisma.goalContribution.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.monthSnapshot.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.income.deleteMany({ where: { userId: user.id } });
  await prisma.fixedExpenseTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.expenseCategory.deleteMany({ where: { userId: user.id } });
  await prisma.incomeSource.deleteMany({ where: { userId: user.id } });
  await prisma.userSettings.deleteMany({ where: { userId: user.id } });
  console.log("All data deleted.");

  // ═══════════════════════════════════════════
  // PARSE CONFIGURAÇÃO SHEET
  // ═══════════════════════════════════════════
  console.log("\n=== Parsing Configuração ===");
  const configSheet = wb.Sheets["Configuração"];
  const config = XLSX.utils.sheet_to_json<unknown[]>(configSheet, { header: 1, defval: "", raw: true });

  // Row references (0-indexed):
  // 5: Saldo Inicial, 6: Renda Estimada, 7: Reserva Emergência, 8: Patrimônio Investido,
  // 9: Patrimônio Total, 10: Renda Passiva Atual, 11: Renda Passiva Meta
  const num = (row: number, col: number) => typeof config[row]?.[col] === "number" ? config[row][col] as number : 0;

  // Jar rules (rows 28-33): values are fractions like 0.55
  const jarRules = {
    necessities: Math.round((num(28, 2) || 0.55) * 100),
    investment: Math.round((num(29, 2) || 0.10) * 100),  // CFL = investment
    savings: Math.round((num(30, 2) || 0.10) * 100),     // PELP = savings
    education: Math.round((num(31, 2) || 0.10) * 100),
    play: Math.round((num(32, 2) || 0.10) * 100),
    giving: Math.round((num(33, 2) || 0.05) * 100),
  };

  await prisma.userSettings.create({
    data: {
      userId: user.id,
      initialBalance: num(5, 2),
      estimatedMonthlyIncome: num(6, 2),
      emergencyFundGoal: num(7, 2),
      investedPatrimonyGoal: num(8, 2),
      totalPatrimonyGoal: num(9, 2),
      passiveIncomeCurrent: num(10, 2),
      passiveIncomeGoal: num(11, 2),
      jarRulesJson: jarRules,
    },
  });
  console.log("UserSettings created:", { jarRules, initialBalance: num(5, 2) });

  // Income Sources (rows 15-24)
  const sourceMap: Record<string, string> = {};
  for (let i = 15; i <= 24; i++) {
    const row = config[i] as unknown[];
    if (!row) continue;
    const name = String(row[1] ?? "").trim();
    if (!name) continue;
    const isActive = String(row[2] ?? "").toLowerCase() === "sim";
    const freq = String(row[3] ?? "").toLowerCase();
    const sourceType = SOURCE_TYPE_MAP[name.toLowerCase()] || "other";
    const frequency = FREQUENCY_MAP[freq] || "sporadic";
    const created = await prisma.incomeSource.create({
      data: { userId: user.id, name, type: sourceType, isActive, frequency, sortOrder: i - 15 },
    });
    sourceMap[name.toLowerCase()] = created.id;
  }
  console.log(`${Object.keys(sourceMap).length} income sources created`);

  // Collect ALL unique category names from config templates + all month sheets
  const categoryNames = new Set<string>();

  // From config fixed templates (rows 38-59)
  for (let i = 38; i <= 59; i++) {
    const cat = String((config[i] as unknown[])?.[3] ?? "").trim();
    if (cat) categoryNames.add(cat);
  }

  // From all month sheets
  for (const monthName of MONTHS) {
    const sheet = wb.Sheets[monthName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
    // Fixed (rows 32-61): col 4
    for (let i = 32; i < 62; i++) {
      const cat = String((rows[i] as unknown[])?.[4] ?? "").trim();
      if (cat) categoryNames.add(cat);
    }
    // Variable (rows 67-100): col 4
    for (let i = 67; i < 101; i++) {
      const cat = String((rows[i] as unknown[])?.[4] ?? "").trim();
      if (cat) categoryNames.add(cat);
    }
  }

  // Create expense categories
  const categoryMap: Record<string, string> = {};
  let catIdx = 0;
  for (const name of categoryNames) {
    const lower = name.toLowerCase();
    const meta = CATEGORY_META[lower] || { icon: "MoreHorizontal", color: "#64748b" };
    const created = await prisma.expenseCategory.create({
      data: { userId: user.id, name, icon: meta.icon, color: meta.color, isDefault: true, sortOrder: catIdx++ },
    });
    categoryMap[lower] = created.id;
  }
  console.log(`${categoryNames.size} categories created: ${[...categoryNames].join(", ")}`);

  // Fixed Expense Templates (from Configuração rows 38-59)
  let templateCount = 0;
  for (let i = 38; i <= 59; i++) {
    const row = config[i] as unknown[];
    if (!row) continue;
    const name = String(row[1] ?? "").trim();
    const amount = parseAmount(row[2]);
    const cat = String(row[3] ?? "").trim();
    const dueDay = typeof row[4] === "number" ? Math.min(Math.max(Math.round(row[4]), 1), 28) : 1;
    if (!name || !cat) continue;
    const categoryId = categoryMap[cat.toLowerCase()];
    if (!categoryId) continue;
    await prisma.fixedExpenseTemplate.create({
      data: { userId: user.id, name, amount, dueDay, categoryId, isActive: amount > 0 },
    });
    templateCount++;
  }
  console.log(`${templateCount} fixed expense templates created`);

  // ═══════════════════════════════════════════
  // PARSE MONTH SHEETS
  // ═══════════════════════════════════════════
  console.log("\n=== Importing transactions ===");
  let totalIncomes = 0;
  let totalFixed = 0;
  let totalVariable = 0;

  for (let monthIdx = 0; monthIdx < MONTHS.length; monthIdx++) {
    const monthName = MONTHS[monthIdx];
    const sheet = wb.Sheets[monthName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });

    // Extract year from title row (e.g., "📅 JANEIRO 2026 — CONTROLE COMPLETO")
    let year = 2026;
    const titleMatch = String(rows[0]?.[0] ?? "").match(/(\d{4})/);
    if (titleMatch) year = parseInt(titleMatch[1]);

    let monthIncomes = 0;
    let monthFixed = 0;
    let monthVariable = 0;

    // INCOMES (rows 13-27)
    for (let i = 13; i < 28; i++) {
      const row = rows[i] as unknown[];
      if (!row) continue;
      const desc = String(row[2] ?? "").trim();
      const amount = parseAmount(row[3]);
      const sourceName = String(row[4] ?? "").trim();
      if (!desc || amount <= 0) continue;

      const date = parseDateCell(row[1], year, monthIdx);
      if (!date) continue;

      // Find or auto-create source
      let sourceId = sourceMap[sourceName.toLowerCase()];
      if (!sourceId && sourceName) {
        const created = await prisma.incomeSource.create({
          data: { userId: user.id, name: sourceName, type: "other" },
        });
        sourceMap[sourceName.toLowerCase()] = created.id;
        sourceId = created.id;
        console.log(`  Auto-created source: "${sourceName}"`);
      }
      if (!sourceId) sourceId = Object.values(sourceMap)[0];

      await prisma.income.create({
        data: { userId: user.id, sourceId, amount, description: desc, date, isConfirmed: true },
      });
      monthIncomes++;
    }

    // FIXED EXPENSES (rows 32-61)
    for (let i = 32; i < 62; i++) {
      const row = rows[i] as unknown[];
      if (!row) continue;
      const desc = String(row[2] ?? "").trim();
      const amount = parseAmount(row[3]);
      const cat = String(row[4] ?? "").trim();
      if (!desc || amount <= 0) continue;

      const isPaid = String(row[5] ?? "").includes("✅");
      const dueDayRaw = typeof row[1] === "number" ? row[1] : parseInt(String(row[1] ?? ""));
      const dueDay = !isNaN(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 31 ? Math.min(dueDayRaw, 28) : 1;
      const date = new Date(year, monthIdx, dueDay);
      const categoryId = categoryMap[cat.toLowerCase()] || Object.values(categoryMap)[0];

      await prisma.expense.create({
        data: { userId: user.id, categoryId, amount, description: desc, date, isFixed: true, isPaid },
      });
      monthFixed++;
    }

    // VARIABLE EXPENSES (rows 67-100)
    const PAYMENT_MAP: Record<string, string> = {
      pix: "pix", débito: "debit", debito: "debit", crédito: "credit", credito: "credit",
      dinheiro: "cash", boleto: "boleto", transferência: "transfer", transferencia: "transfer",
    };

    for (let i = 67; i < 101; i++) {
      const row = rows[i] as unknown[];
      if (!row) continue;
      const desc = String(row[2] ?? "").trim();
      const amount = parseAmount(row[3]);
      const cat = String(row[4] ?? "").trim();
      if (!desc || amount <= 0) continue;

      const date = parseDateCell(row[1], year, monthIdx);
      if (!date) continue;

      const categoryId = categoryMap[cat.toLowerCase()] || Object.values(categoryMap)[0];
      const paymentLabel = String(row[6] ?? "").trim().toLowerCase();
      const paymentMethod = PAYMENT_MAP[paymentLabel] || "pix";

      await prisma.expense.create({
        data: { userId: user.id, categoryId, amount, description: desc, date, isFixed: false, isPaid: true, paymentMethod },
      });
      monthVariable++;
    }

    totalIncomes += monthIncomes;
    totalFixed += monthFixed;
    totalVariable += monthVariable;

    if (monthIncomes > 0 || monthFixed > 0 || monthVariable > 0) {
      console.log(`  ${monthName} ${year}: ${monthIncomes} incomes, ${monthFixed} fixed, ${monthVariable} variable`);
    }
  }

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  console.log("\n=== Import complete ===");
  console.log(`Income sources: ${Object.keys(sourceMap).length}`);
  console.log(`Expense categories: ${categoryNames.size}`);
  console.log(`Fixed expense templates: ${templateCount}`);
  console.log(`Income transactions: ${totalIncomes}`);
  console.log(`Fixed expense transactions: ${totalFixed}`);
  console.log(`Variable expense transactions: ${totalVariable}`);
  console.log(`Total transactions: ${totalIncomes + totalFixed + totalVariable}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Import failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
