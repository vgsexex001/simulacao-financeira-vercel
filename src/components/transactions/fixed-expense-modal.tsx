"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFixedTemplate } from "@/actions/fixed-expense-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FixedExpenseModalProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_TEMPLATES = [
  { name: "Aluguel", icon: "🏠" },
  { name: "Energia", icon: "⚡" },
  { name: "Internet", icon: "🌐" },
  { name: "Agua", icon: "💧" },
  { name: "Celular", icon: "📱" },
];

export function FixedExpenseModal({
  categories,
  open,
  onOpenChange,
}: FixedExpenseModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [categoryId, setCategoryId] = useState("");

  function reset() {
    setName("");
    setAmount("");
    setDueDay("");
    setCategoryId("");
  }

  function applyQuickTemplate(templateName: string) {
    setName(templateName);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Informe um valor valido");
      return;
    }

    const numDueDay = parseInt(dueDay, 10);
    if (!numDueDay || numDueDay < 1 || numDueDay > 31) {
      toast.error("Informe um dia de vencimento entre 1 e 31");
      return;
    }

    if (!categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    if (!name.trim()) {
      toast.error("Informe o nome da despesa");
      return;
    }

    setLoading(true);
    try {
      await createFixedTemplate({
        name: name.trim(),
        amount: numAmount,
        dueDay: numDueDay,
        categoryId,
      });
      toast.success("Despesa fixa criada");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[85vh] rounded-t-2xl md:mx-auto md:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Nova despesa fixa</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((qt) => (
            <Button
              key={qt.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyQuickTemplate(qt.name)}
              className={name === qt.name ? "border-primary bg-primary/10" : ""}
            >
              {qt.icon} {qt.name}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel, Internet..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="font-mono text-2xl font-bold h-14"
            />
          </div>

          <div className="space-y-2">
            <Label>Dia de vencimento</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="1-31"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
