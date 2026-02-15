"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePreferences } from "@/actions/settings-actions";
import { toast } from "sonner";
import { Loader2, Palette, Calendar } from "lucide-react";

interface PreferencesFormProps {
  settings: {
    locale: string;
    monthStartDay: number;
    currency: string;
    initialBalance: number;
    jarRules: Record<string, number>;
  } | null;
}

export function PreferencesForm({ settings }: PreferencesFormProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [monthStartDay, setMonthStartDay] = useState(
    String(settings?.monthStartDay || 1)
  );
  const [locale, setLocale] = useState(settings?.locale || "pt-BR");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      const result = await updatePreferences({
        locale,
        monthStartDay: parseInt(monthStartDay),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Preferências atualizadas");
        router.refresh();
      }
    } catch {
      toast.error("Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>
                Escolha o tema da interface.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("light")}
              >
                Claro
              </Button>
              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("dark")}
              >
                Escuro
              </Button>
              <Button
                type="button"
                variant={theme === "system" ? "default" : "outline"}
                className="w-full"
                onClick={() => setTheme("system")}
              >
                Sistema
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Preferências gerais</CardTitle>
              <CardDescription>
                Configure o dia de início do mês e o idioma.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Dia de início do mês</Label>
              <Select value={monthStartDay} onValueChange={setMonthStartDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quando seu mês financeiro começa.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Idioma / Locale</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar preferências
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
