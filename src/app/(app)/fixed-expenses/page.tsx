import { getFixedExpenses } from "@/actions/fixed-expense-actions";
import { FixedExpensesPageClient } from "./page-client";

export const metadata = { title: "Despesas Fixas" };

export default async function FixedExpensesPage() {
  const data = await getFixedExpenses();

  return <FixedExpensesPageClient templates={data.templates} categories={data.categories} />;
}
