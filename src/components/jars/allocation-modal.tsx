"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JAR_CONFIG, JAR_TYPES } from "@/lib/constants";
import { formatBRL } from "@/lib/format";
import { allocateIncome } from "@/actions/jar-actions";
import { toast } from "sonner";
import { Loader2, ArrowDownToLine } from "lucide-react";

const JAR_KEYS = Object.values(JAR_TYPES);

interface AllocationModalProps {
  jarRules: Record<string, number>;
  totalIncome: number;
}

export function AllocationModal({
  jarRules,
  totalIncome,
}: AllocationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const numAmount = parseFloat(incomeAmount) || 0;

  // Recalculate allocations whenever income amount changes
  useEffect(() => {
    if (numAmount > 0) {
      const calculated: Record<string, number> = {};
      for (const key of JAR_KEYS) {
        const percent = jarRules[key] || 0;
        calculated[key] = Math.round((numAmount * percent) / 100 * 100) / 100;
      }
      setAllocations(calculated);
    } else {
      setAllocations({});
    }
  }, [numAmount, jarRules]);

  const allocationTotal = Object.values(allocations).reduce(
    (sum, v) => sum + v,
    0
  );
  const difference = numAmount - allocationTotal;

  function updateAllocation(key: string, value: number) {
    setAllocations((prev) => ({ ...prev, [key]: value }));
  }

  function resetToDefaults() {
    if (numAmount > 0) {
      const calculated: Record<string, number> = {};
      for (const key of JAR_KEYS) {
        const percent = jarRules[key] || 0;
        calculated[key] = Math.round((numAmount * percent) / 100 * 100) / 100;
      }
      setAllocations(calculated);
    }
  }

  async function handleSubmit() {
    if (numAmount <= 0) {
      toast.error("Informe um valor de receita");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      toast.error("A soma das alocacoes deve ser igual ao valor da receita");
      return;
    }

    setLoading(true);
    try {
      const result = await allocateIncome({
        amount: numAmount,
        allocations,
      });
      if (result.success) {
        toast.success("Receita distribuida nos jarros");
        setOpen(false);
        setIncomeAmount("");
        setAllocations({});
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao alocar");
      }
    } catch {
      toast.error("Erro ao alocar receita");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full" variant="outline">
        <ArrowDownToLine className="mr-2 h-4 w-4" />
        Distribuir Receita nos Jarros
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[85vh] rounded-t-2xl md:max-w-lg md:mx-auto overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Distribuir Receita</SheetTitle>
            <SheetDescription>
              Informe o valor da receita e distribua entre os jarros conforme
              suas regras.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-5 px-4">
            {/* Income amount input */}
            <div className="space-y-2">
              <Label>Valor da Receita (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="text-2xl font-bold font-mono h-14"
              />
            </div>

            {/* Allocation per jar */}
            {numAmount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Alocacao por Jarro
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetToDefaults}
                    className="text-xs h-7"
                  >
                    Resetar
                  </Button>
                </div>

                {JAR_KEYS.map((key) => {
                  const config = JAR_CONFIG[key];
                  const percent = jarRules[key] || 0;
                  const value = allocations[key] || 0;

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: config.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {config.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {percent}% = {formatBRL((numAmount * percent) / 100)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        value={value || ""}
                        onChange={(e) =>
                          updateAllocation(
                            key,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-28 text-right font-mono text-sm"
                      />
                    </div>
                  );
                })}

                {/* Total and difference */}
                <div
                  className={`rounded-lg p-3 text-sm font-semibold flex justify-between ${
                    Math.abs(difference) <= 0.01
                      ? "bg-green-500/10 text-green-500"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span>Total alocado: {formatBRL(allocationTotal)}</span>
                  {Math.abs(difference) > 0.01 && (
                    <span>
                      {difference > 0
                        ? `Falta: ${formatBRL(difference)}`
                        : `Excede: ${formatBRL(Math.abs(difference))}`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-4">
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={loading || numAmount <= 0 || Math.abs(difference) > 0.01}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Distribuicao
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
