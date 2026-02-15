import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { MONTHS_PT } from "@/lib/constants";

async function getReportData(userId: string, month: number, year: number) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    prisma.income.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { source: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  return {
    month,
    year,
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    expenses: expenses.map((e) => ({
      Data: e.date.toISOString().split("T")[0],
      Tipo: "Despesa",
      Descricao: e.description,
      Categoria: e.category.name,
      Jarra: e.jarType || "",
      Valor: Number(e.amount),
    })),
    incomes: incomes.map((i) => ({
      Data: i.date.toISOString().split("T")[0],
      Tipo: "Receita",
      Descricao: i.description,
      Fonte: i.source.name,
      Valor: Number(i.amount),
    })),
  };
}

function buildFlatRows(data: Awaited<ReturnType<typeof getReportData>>) {
  const rows: Array<Record<string, string | number>> = [];

  for (const inc of data.incomes) {
    rows.push({
      Data: inc.Data,
      Tipo: "Receita",
      Descricao: inc.Descricao,
      "Categoria/Fonte": inc.Fonte,
      Jarra: "",
      Valor: inc.Valor,
    });
  }

  for (const exp of data.expenses) {
    rows.push({
      Data: exp.Data,
      Tipo: "Despesa",
      Descricao: exp.Descricao,
      "Categoria/Fonte": exp.Categoria,
      Jarra: exp.Jarra,
      Valor: -exp.Valor,
    });
  }

  rows.sort((a, b) => String(a.Data).localeCompare(String(b.Data)));
  return rows;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const format = searchParams.get("format");
  const month = parseInt(searchParams.get("month") || "0");
  const year = parseInt(searchParams.get("year") || "0");

  if (!format || !month || !year) {
    return NextResponse.json(
      { error: "Parâmetros inválidos" },
      { status: 400 }
    );
  }

  const data = await getReportData(session.user.id!, month, year);
  const rows = buildFlatRows(data);
  const monthName = MONTHS_PT[month - 1];
  const filename = `relatorio-${year}-${String(month).padStart(2, "0")}`;

  switch (format) {
    case "csv": {
      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    case "xlsx": {
      const wb = XLSX.utils.book_new();

      // Transactions sheet
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Transações");

      // Summary sheet
      const summaryData = [
        { Metrica: "Receitas", Valor: data.totalIncome },
        { Metrica: "Despesas", Valor: data.totalExpenses },
        { Metrica: "Saldo", Valor: data.balance },
        {
          Metrica: "Taxa de Poupança (%)",
          Valor: parseFloat(data.savingsRate.toFixed(1)),
        },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    case "pdf": {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text(`Relatório Financeiro`, 14, 20);
      doc.setFontSize(12);
      doc.text(`${monthName} ${year}`, 14, 28);

      // Summary
      doc.setFontSize(14);
      doc.text("Resumo", 14, 42);

      doc.setFontSize(11);
      doc.text(`Receitas: R$ ${data.totalIncome.toFixed(2)}`, 14, 52);
      doc.text(`Despesas: R$ ${data.totalExpenses.toFixed(2)}`, 14, 60);
      doc.text(`Saldo: R$ ${data.balance.toFixed(2)}`, 14, 68);
      doc.text(
        `Taxa de Poupança: ${data.savingsRate.toFixed(1)}%`,
        14,
        76
      );

      // Transactions table
      doc.setFontSize(14);
      doc.text("Transações", 14, 92);

      doc.setFontSize(9);
      let y = 102;
      const colX = [14, 40, 72, 130, 170];
      const headers = ["Data", "Tipo", "Descrição", "Cat./Fonte", "Valor"];

      // Header row
      doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 2;
      doc.line(14, y, 196, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      for (const row of rows) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        doc.text(String(row.Data), colX[0], y);
        doc.text(String(row.Tipo), colX[1], y);

        const desc = String(row.Descricao);
        doc.text(desc.length > 30 ? desc.substring(0, 30) + "..." : desc, colX[2], y);

        doc.text(String(row["Categoria/Fonte"]), colX[3], y);

        const val = Number(row.Valor);
        doc.text(`R$ ${Math.abs(val).toFixed(2)}`, colX[4], y);

        y += 7;
      }

      const pdfBuffer = doc.output("arraybuffer");

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    case "json": {
      const jsonContent = JSON.stringify(
        {
          periodo: `${monthName} ${year}`,
          resumo: {
            receitas: data.totalIncome,
            despesas: data.totalExpenses,
            saldo: data.balance,
            taxaPoupanca: parseFloat(data.savingsRate.toFixed(1)),
          },
          receitas: data.incomes,
          despesas: data.expenses,
        },
        null,
        2
      );

      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    default:
      return NextResponse.json(
        { error: "Formato não suportado" },
        { status: 400 }
      );
  }
}
