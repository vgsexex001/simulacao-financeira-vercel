"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatPercent } from "@/lib/format";
import { MONTHS_PT } from "@/lib/constants";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Landmark,
} from "lucide-react";
import { getMonthlyReport } from "@/actions/report-actions";
import { toast } from "sonner";

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  total: number;
  count: number;
  percentage: number;
}

interface ReportData {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  initialBalance: number;
  byCategory: CategoryRow[];
  byJar: Array<{ jar: string; total: number; count: number }>;
  expenses: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryName: string;
    jarType: string | null;
  }>;
  incomes: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    sourceName: string;
  }>;
}

interface ReportViewerProps {
  initialReport: ReportData;
}

export function ReportViewer({ initialReport }: ReportViewerProps) {
  const now = new Date();
  const [report, setReport] = useState<ReportData>(initialReport);
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );

  function handlePeriodChange(month: string, year: string) {
    setSelectedMonth(month);
    setSelectedYear(year);
    startTransition(async () => {
      try {
        const data = await getMonthlyReport(
          parseInt(month),
          parseInt(year)
        );
        setReport(data);
      } catch {
        toast.error("Erro ao carregar relatório");
      }
    });
  }

  async function handleExport(format: "csv" | "xlsx" | "pdf" | "json") {
    setExporting(format);
    try {
      const params = new URLSearchParams({
        format,
        month: selectedMonth,
        year: selectedYear,
      });

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erro ao exportar");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const extensions: Record<string, string> = {
        csv: "csv",
        xlsx: "xlsx",
        pdf: "pdf",
        json: "json",
      };
      a.download = `relatorio-${selectedYear}-${selectedMonth.padStart(2, "0")}.${extensions[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado");
    } catch {
      toast.error("Erro ao exportar relatório");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Relatório Mensal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={selectedMonth}
                onValueChange={(m) => handlePeriodChange(m, selectedYear)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_PT.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear}
                onValueChange={(y) => handlePeriodChange(selectedMonth, y)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {formatBRL(report.totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {formatBRL(report.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              Balanço do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                report.balance >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatBRL(report.balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Landmark className="h-4 w-4" />
              Saldo geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                report.initialBalance + report.balance >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatBRL(report.initialBalance + report.balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" />
              Taxa de Poupança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                report.savingsRate >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatPercent(report.savingsRate, 1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by category table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {report.byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa neste período
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Categoria
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Qtd
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Total
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.byCategory.map((cat) => (
                    <tr key={cat.categoryId}>
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: cat.categoryColor || "#64748b",
                            }}
                          />
                          {cat.categoryName}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {cat.count}
                      </td>
                      <td className="py-3 text-right font-mono font-medium">
                        {formatBRL(cat.total)}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatPercent(cat.percentage, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right">
                      {report.byCategory.reduce((s, c) => s + c.count, 0)}
                    </td>
                    <td className="pt-3 text-right font-mono">
                      {formatBRL(report.totalExpenses)}
                    </td>
                    <td className="pt-3 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={!!exporting}
            >
              {exporting === "csv" ? "Exportando..." : "CSV"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("xlsx")}
              disabled={!!exporting}
            >
              {exporting === "xlsx" ? "Exportando..." : "Excel (XLSX)"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={!!exporting}
            >
              {exporting === "pdf" ? "Exportando..." : "PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              disabled={!!exporting}
            >
              {exporting === "json" ? "Exportando..." : "JSON"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
