import { getTransactions } from "@/actions/transaction-actions";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionModal } from "@/components/transactions/transaction-modal";

export const metadata = { title: "Transações" };

export default async function TransactionsPage() {
  const data = await getTransactions({});

  return (
    <div className="space-y-6">
      <TransactionList
        expenses={data.expenses}
        incomes={data.incomes}
        categories={data.categories}
        sources={data.sources}
      />
      <TransactionModal
        categories={data.categories}
        sources={data.sources}
      />
    </div>
  );
}
