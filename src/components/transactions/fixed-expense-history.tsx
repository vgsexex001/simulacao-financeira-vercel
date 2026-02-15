"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";
import { getFixedExpenseHistory } from "@/actions/fixed-expense-actions";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  date: string;
  isPaid: boolean;
  month: number;
  year: number;
}

interface FixedExpenseHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  categoryId: string;
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function FixedExpenseHistory({
  open,
  onOpenChange,
  templateName,
  categoryId,
}: FixedExpenseHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && templateName && categoryId) {
      setLoading(true);
      getFixedExpenseHistory(templateName, categoryId)
        .then(setPayments)
        .finally(() => setLoading(false));
    }
  }, [open, templateName, categoryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico — {templateName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento registrado nos últimos 12 meses
          </p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {payment.isPaid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-yellow-500" />
                  )}
                  <div>
                    <span className="text-sm font-medium">
                      {MONTH_NAMES[payment.month - 1]} {payment.year}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {payment.isPaid ? "Pago" : "Pendente"}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatBRL(payment.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
