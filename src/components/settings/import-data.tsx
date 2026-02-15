"use client";

import { useState, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { importTransactions } from "@/actions/import-actions";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { MONTHS_PT } from "@/lib/constants";

interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category?: string;
  source?: string;
  paymentMethod?: string;
  jarType?: string;
  isFixed?: boolean;
}

// --- Financial dashboard parser (Mente Milionária layout) ---

const JAR_LABEL_MAP: Record<string, string> = {
  necessidades: "necessities",
  educacao: "education",
  poupanca: "savings",
  diversao: "play",
  investimentos: "investment",
  investimento: "investment",
  doacoes: "giving",
  doacao: "giving",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  pix: "pix",
  debito: "debit",
  credito: "credit",
  cartao: "credit",
  dinheiro: "cash",
  boleto: "boleto",
  transferencia: "transfer",
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseAmountBR(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Math.abs(raw);

  const str = String(raw).trim();
  if (!str || str === "-" || str === "\u2013") return 0;

  let cleaned = str.replace(/[R$\s]/g, "");
  const isNegative = cleaned.includes("(") && cleaned.includes(")");
  cleaned = cleaned.replace(/[()]/g, "");
  if (!cleaned) return 0;

  // Detect BR vs US format by position of last comma vs last dot
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > lastDot) {
    // BR format: "1.234,56" → comma is decimal
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // US format or plain number: remove commas (thousands)
    cleaned = cleaned.replace(/,/g, "");
  }

  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return isNegative ? 0 : Math.abs(value);
}

function parseDateCell(
  cell: unknown,
  year: number,
  monthIndex: number
): string | null {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
  }

  const str = String(cell ?? "").trim();
  if (!str) return null;

  // DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  }

  // ISO format
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Just a day number → build date from month context
  const dayNum = parseInt(str);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
    const day = Math.min(dayNum, 28);
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function isSectionEnd(row: unknown[]): boolean {
  if (!row || row.length === 0) return false;

  // TOTAL row
  for (let j = 0; j < Math.min(3, row.length); j++) {
    if (String(row[j] ?? "").toLowerCase().includes("total")) return true;
  }

  // Next section marker
  const first = normalizeText(String(row[0] ?? ""));
  if (
    first.includes("receitas") ||
    first.includes("despesas fixas") ||
    first.includes("despesas vari")
  ) {
    return true;
  }

  return false;
}

function parseFinancialDashboard(
  workbook: XLSX.WorkBook,
  monthSheets: string[]
): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];

  for (const sheetName of monthSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: "",
    });

    // Determine month index
    const monthIndex = MONTHS_PT.findIndex((m) =>
      normalizeText(sheetName).includes(normalizeText(m))
    );
    if (monthIndex === -1) continue;

    // Extract year from first rows
    let year = new Date().getFullYear();
    let yearFound = false;
    for (let i = 0; i < Math.min(5, rows.length) && !yearFound; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const match = String(cell ?? "").match(/\b(20\d{2})\b/);
        if (match) {
          year = parseInt(match[1]);
          yearFound = true;
          break;
        }
      }
    }

    // Find section markers
    let incomeStart = -1;
    let fixedStart = -1;
    let variableStart = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      if (!row || row.length === 0) continue;
      const firstCell = normalizeText(String(row[0] ?? ""));

      if (firstCell.includes("receitas") && incomeStart === -1) {
        incomeStart = i;
      } else if (firstCell.includes("despesas fixas") && fixedStart === -1) {
        fixedStart = i;
      } else if (
        firstCell.includes("despesas vari") &&
        variableStart === -1
      ) {
        variableStart = i;
      }
    }

    // Parse income section (marker+1 = header, marker+2 = first data row)
    if (incomeStart !== -1) {
      for (let i = incomeStart + 2; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        if (!row) continue;
        if (isSectionEnd(row)) break;

        const description = String(row[2] ?? "").trim();
        const amount = parseAmountBR(row[3]);
        const source = String(row[4] ?? "").trim();

        if (!description || amount <= 0) continue;

        const dateStr = parseDateCell(row[1], year, monthIndex);
        if (!dateStr) continue;

        results.push({
          type: "income",
          amount,
          description,
          date: dateStr,
          source: source || undefined,
        });
      }
    }

    // Parse fixed expenses section
    if (fixedStart !== -1) {
      for (let i = fixedStart + 2; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        if (!row) continue;
        if (isSectionEnd(row)) break;

        const description = String(row[2] ?? "").trim();
        const amount = parseAmountBR(row[3]);
        const category = String(row[4] ?? "").trim();

        if (!description || amount <= 0) continue;

        // Build date from due day + month/year of this sheet
        const dueDay = parseInt(String(row[1] ?? ""));
        const day = isNaN(dueDay)
          ? 1
          : Math.min(Math.max(dueDay, 1), 28);
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        results.push({
          type: "expense",
          amount,
          description,
          date: dateStr,
          category: category || undefined,
          isFixed: true,
        });
      }
    }

    // Parse variable expenses section
    if (variableStart !== -1) {
      for (let i = variableStart + 2; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        if (!row) continue;
        if (isSectionEnd(row)) break;

        const description = String(row[2] ?? "").trim();
        const amount = parseAmountBR(row[3]);
        const category = String(row[4] ?? "").trim();
        const jarLabel = normalizeText(String(row[5] ?? ""));
        const paymentLabel = normalizeText(String(row[6] ?? ""));

        if (!description || amount <= 0) continue;

        const dateStr = parseDateCell(row[1], year, monthIndex);
        if (!dateStr) continue;

        results.push({
          type: "expense",
          amount,
          description,
          date: dateStr,
          category: category || undefined,
          jarType: JAR_LABEL_MAP[jarLabel] || undefined,
          paymentMethod: PAYMENT_METHOD_MAP[paymentLabel] || undefined,
        });
      }
    }
  }

  return results;
}

export function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRow = useCallback(
    (row: Record<string, unknown>): ParsedTransaction | null => {
      // Normalize keys to lowercase and coerce all values to strings
      // (XLSX returns native types: numbers, Dates, booleans)
      const normalized: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const val = row[key];
        let str: string;
        if (val instanceof Date) {
          str = `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
        } else {
          str = String(val ?? "").trim();
        }
        normalized[key.toLowerCase().trim()] = str;
      }

      const tipo = normalized["tipo"] ?? "";
      const valor = normalized["valor"] ?? "";
      const descricao = normalized["descricao"] ?? normalized["descrição"] ?? "";
      const data = normalized["data"] ?? "";
      const categoria = normalized["categoria"] ?? "";
      const fonte = normalized["fonte"] ?? "";

      // Determine type
      const tipoLower = tipo.toLowerCase();
      let type: "income" | "expense";
      if (tipoLower === "receita" || tipoLower === "income") {
        type = "income";
      } else if (tipoLower === "despesa" || tipoLower === "expense") {
        type = "expense";
      } else {
        return null;
      }

      // Parse amount - handle Brazilian format (1.234,56) and standard (1234.56)
      const rawValor = valor.replace(/[^\d.,-]/g, "");
      let amount: number;
      if (rawValor.includes(",")) {
        // Brazilian format: dots are thousands separators, comma is decimal
        amount = parseFloat(rawValor.replace(/\./g, "").replace(",", "."));
      } else {
        amount = parseFloat(rawValor);
      }

      if (isNaN(amount) || amount <= 0) {
        return null;
      }

      if (!descricao) {
        return null;
      }

      // Parse date - try multiple formats
      let parsedDate: string;
      if (data.match(/^\d{4}-\d{2}-\d{2}/)) {
        // ISO format: 2024-01-15
        parsedDate = data.substring(0, 10);
      } else if (data.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // BR format: 15/01/2024
        const [day, month, year] = data.split("/");
        parsedDate = `${year}-${month}-${day}`;
      } else if (data.match(/^\d{2}-\d{2}-\d{4}$/)) {
        // BR format with dashes: 15-01-2024
        const [day, month, year] = data.split("-");
        parsedDate = `${year}-${month}-${day}`;
      } else {
        return null;
      }

      // Validate the parsed date
      const dateObj = new Date(parsedDate);
      if (isNaN(dateObj.getTime())) {
        return null;
      }

      return {
        type,
        amount,
        description: descricao,
        date: parsedDate,
        category: type === "expense" ? categoria || undefined : undefined,
        source: type === "income" ? (fonte || categoria || undefined) : undefined,
      };
    },
    []
  );

  const parseCSV = useCallback(
    (fileContent: File): Promise<ParsedTransaction[]> => {
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(fileContent, {
          header: true,
          skipEmptyLines: true,
          encoding: "UTF-8",
          complete: (results) => {
            const parsed: ParsedTransaction[] = [];
            for (const row of results.data) {
              const tx = parseRow(row);
              if (tx) {
                parsed.push(tx);
              }
            }
            resolve(parsed);
          },
          error: (error: Error) => {
            reject(error);
          },
        });
      });
    },
    [parseRow]
  );

  const parseXLSX = useCallback(
    (fileContent: ArrayBuffer): ParsedTransaction[] => {
      const workbook = XLSX.read(fileContent, { type: "array", cellDates: true });

      // Auto-detect dashboard layout (sheets named after months)
      const monthSheets = workbook.SheetNames.filter((name) =>
        MONTHS_PT.some((m) =>
          normalizeText(name).includes(normalizeText(m))
        )
      );

      if (monthSheets.length > 0) {
        return parseFinancialDashboard(workbook, monthSheets);
      }

      // Fallback: simple tabular parser
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      const parsed: ParsedTransaction[] = [];
      for (const row of rows) {
        const tx = parseRow(row);
        if (tx) {
          parsed.push(tx);
        }
      }
      return parsed;
    },
    [parseRow]
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
      toast.error("Formato não suportado. Use arquivos CSV ou XLSX.");
      return;
    }

    setFile(selectedFile);
    setTransactions([]);
    setImported(false);
    setParsing(true);

    try {
      let parsed: ParsedTransaction[];

      if (extension === "csv") {
        parsed = await parseCSV(selectedFile);
      } else {
        const buffer = await selectedFile.arrayBuffer();
        parsed = parseXLSX(buffer);
      }

      if (parsed.length === 0) {
        toast.error(
          "Nenhuma transacao valida encontrada. Verifique se o arquivo possui as colunas: tipo, valor, descricao, data"
        );
        setFile(null);
      } else {
        setTransactions(parsed);
        toast.success(`${parsed.length} transacoes encontradas`);
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo. Verifique o formato.");
      setFile(null);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (transactions.length === 0) return;

    setImporting(true);
    try {
      const result = await importTransactions({ transactions });
      if (result.success) {
        if (result.failed && result.failed > 0) {
          toast.warning(
            `${result.imported} importadas, ${result.failed} falharam`
          );
        } else {
          toast.success(
            `${result.imported} transacoes importadas com sucesso!`
          );
        }
        setImported(true);
      } else {
        toast.error(result.error || "Erro ao importar transacoes");
      }
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar transacoes. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setTransactions([]);
    setImported(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const incomeCount = transactions.filter((t) => t.type === "income").length;
  const expenseCount = transactions.filter((t) => t.type === "expense").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Importar dados</CardTitle>
            <CardDescription>
              Importe transacoes a partir de arquivos CSV ou XLSX.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        {!file && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Clique para selecionar um arquivo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: CSV, XLSX
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Colunas esperadas: tipo (receita/despesa), valor, descricao, data,
              categoria/fonte
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Parsing state */}
        {parsing && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Processando arquivo...
            </span>
          </div>
        )}

        {/* File info and preview */}
        {file && !parsing && transactions.length > 0 && (
          <div className="space-y-4">
            {/* File info bar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {incomeCount} receita{incomeCount !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="secondary">
                  {expenseCount} despesa{expenseCount !== 1 ? "s" : ""}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={importing}
                >
                  Trocar arquivo
                </Button>
              </div>
            </div>

            {/* Preview table */}
            <div className="max-h-80 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Descricao
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Categoria/Fonte
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            tx.type === "income" ? "default" : "destructive"
                          }
                        >
                          {tx.type === "income" ? "Receita" : "Despesa"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {tx.amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(tx.date + "T00:00:00").toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {tx.category || tx.source || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            {!imported ? (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar {transactions.length} transac
                    {transactions.length === 1 ? "ao" : "oes"}
                  </>
                )}
              </Button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Importacao concluida com sucesso!
                  </span>
                </div>
                <Button variant="outline" onClick={handleReset}>
                  Importar outro arquivo
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
