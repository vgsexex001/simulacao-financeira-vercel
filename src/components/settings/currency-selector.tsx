"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "@/lib/currencies";
import { updateUserCurrency } from "@/actions/currency-actions";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";

interface CurrencySelectorProps {
  currentCurrency: string;
}

export function CurrencySelector({ currentCurrency }: CurrencySelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(currentCurrency);

  async function handleChange(value: string) {
    setSelected(value);
    setLoading(true);

    try {
      const result = await updateUserCurrency(value);
      if (result.error) {
        toast.error(result.error);
        setSelected(currentCurrency);
      } else {
        toast.success("Moeda atualizada com sucesso");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao atualizar moeda");
      setSelected(currentCurrency);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Moeda</CardTitle>
            <CardDescription>
              Escolha a moeda padrão para exibição de valores.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Moeda padrão</Label>
          <div className="relative">
            <Select value={selected} onValueChange={handleChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a moeda">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {getCurrencySymbol(selected)}
                    </span>
                    <span>
                      {selected} &mdash;{" "}
                      {SUPPORTED_CURRENCIES.find((c) => c.code === selected)?.name ?? selected}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm w-8 text-right">
                        {currency.symbol}
                      </span>
                      <span>
                        {currency.code} &mdash; {currency.name}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Todos os valores no app serão exibidos nesta moeda.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
