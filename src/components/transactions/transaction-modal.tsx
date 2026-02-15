"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransactionModal } from "@/stores/ui-store";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpense, createIncome } from "@/actions/transaction-actions";
import { suggestCategory } from "@/actions/analytics-actions";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp, X, Mic, MicOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface TransactionModalProps {
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  }>;
  sources: Array<{ id: string; name: string }>;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
];

const DATE_PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "Ontem", days: -1 },
];

export function TransactionModal({
  categories,
  sources,
}: TransactionModalProps) {
  const router = useRouter();
  const { isOpen, type, close } = useTransactionModal();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Basic fields
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [jarType, setJarType] = useState("");

  // Advanced fields
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");

  function reset() {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setSourceId("");
    setDate(new Date().toISOString().split("T")[0]);
    setJarType("");
    setPaymentMethod("pix");
    setInstallmentTotal("");
    setIsRecurring(false);
    setTags([]);
    setTagInput("");
    setNotes("");
    setLocation("");
    setShowAdvanced(false);
  }

  function setDatePreset(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  // --- Auto-categorization ---
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSuggested, setAutoSuggested] = useState(false);

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      setAutoSuggested(false);

      if (type !== "expense" || categoryId) return;
      if (value.length < 3) return;

      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      suggestTimeoutRef.current = setTimeout(async () => {
        try {
          const suggested = await suggestCategory(value);
          if (suggested && !categoryId) {
            setCategoryId(suggested);
            setAutoSuggested(true);
          }
        } catch {
          // silently ignore
        }
      }, 500);
    },
    [type, categoryId]
  );

  // --- Voice input (Web Speech API) ---
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const supportsVoice = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      if (type === "expense") {
        if (!categoryId) {
          toast.error("Selecione uma categoria");
          setLoading(false);
          return;
        }
        const numInstallments = parseInt(installmentTotal) || 0;
        await createExpense({
          amount: numAmount,
          description,
          categoryId,
          date,
          jarType: jarType || undefined,
          paymentMethod,
          installmentCurrent: numInstallments > 1 ? 1 : undefined,
          installmentTotal: numInstallments > 1 ? numInstallments : undefined,
          tags: tags.length > 0 ? tags : undefined,
          notes: notes || undefined,
          location: location || undefined,
          isRecurring,
        });
      } else {
        if (!sourceId) {
          toast.error("Selecione uma fonte");
          setLoading(false);
          return;
        }
        await createIncome({
          amount: numAmount,
          description,
          sourceId,
          date,
          tags: tags.length > 0 ? tags : undefined,
          notes: notes || undefined,
          isRecurring,
        });
      }
      toast.success(
        type === "expense" ? "Gasto registrado!" : "Receita registrada!"
      );
      reset();
      close();
      router.refresh();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl md:max-w-lg md:mx-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {type === "expense" ? "Novo gasto" : "Nova receita"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {type === "expense"
              ? "Formulário para registrar novo gasto"
              : "Formulário para registrar nova receita"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount - Hero style */}
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              autoFocus
              className="text-2xl font-bold font-mono h-14"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <div className="flex gap-2">
              <Input
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Ex: Almoço, Salário..."
                className="flex-1"
              />
              {supportsVoice && (
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleVoice}
                  className="shrink-0"
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {autoSuggested && (
              <p className="text-xs text-muted-foreground">
                Categoria sugerida automaticamente
              </p>
            )}
          </div>

          {/* Category / Source */}
          {type === "expense" ? (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setAutoSuggested(false); }}>
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
          ) : (
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((src) => (
                    <SelectItem key={src.id} value={src.id}>
                      {src.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date with presets */}
          <div className="space-y-2">
            <Label>Data</Label>
            <div className="flex gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDatePreset(preset.days)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment method (expense only) */}
          {type === "expense" && (
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                      paymentMethod === method.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Jar (expense only) */}
          {type === "expense" && (
            <div className="space-y-2">
              <Label>Jarro (opcional)</Label>
              <Select value={jarType} onValueChange={setJarType}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="necessities">Necessidades</SelectItem>
                  <SelectItem value="education">Educação</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="play">Diversão</SelectItem>
                  <SelectItem value="investment">Investimentos</SelectItem>
                  <SelectItem value="giving">Doações</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Mais detalhes
          </button>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Installments (credit card only) */}
              {type === "expense" && paymentMethod === "credit" && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select
                    value={installmentTotal}
                    onValueChange={setInstallmentTotal}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="À vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">À vista</SelectItem>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Recurring toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring">Transação recorrente?</Label>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Ex: supermercado"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                  >
                    +
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 text-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma observação?"
                  rows={2}
                />
              </div>

              {/* Location (expense only) */}
              {type === "expense" && (
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Shopping, Supermercado..."
                  />
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "expense" ? "Salvar gasto" : "Salvar receita"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
