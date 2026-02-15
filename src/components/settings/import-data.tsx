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

interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category?: string;
  source?: string;
}

export function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRow = useCallback(
    (row: Record<string, string>): ParsedTransaction | null => {
      // Normalize keys to lowercase and trim
      const normalized: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        normalized[key.toLowerCase().trim()] = (row[key] ?? "").trim();
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
        Papa.parse<Record<string, string>>(fileContent, {
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
      const workbook = XLSX.read(fileContent, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
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
        toast.success(`${result.imported} transacoes importadas com sucesso!`);
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
