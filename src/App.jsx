import { useState, useMemo } from "react";

const FIXED_EXPENSES = 1184.90;
const FEB_VARIABLE = 1123.98;
const FEB_BALANCE = 2149.22;
const MONTHS = ["Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const SCENARIOS = [
  {
    id: "cataliad",
    name: "Só Cataliad",
    desc: "Apenas a renda recorrente da Cataliad (~R$ 1.333/mês)",
    income: 1333,
    color: "#ef4444",
    icon: "⚠️"
  },
  {
    id: "cataliad_extra",
    name: "Cataliad + Bico",
    desc: "Cataliad + uma renda extra de ~R$ 700/mês",
    income: 2033,
    color: "#f59e0b",
    icon: "🟡"
  },
  {
    id: "equilibrio",
    name: "Ponto de equilíbrio",
    desc: "Renda mínima para cobrir fixas + variáveis (~R$ 2.309)",
    income: 2309,
    color: "#3b82f6",
    icon: "⚖️"
  },
  {
    id: "confortavel",
    name: "Confortável",
    desc: "Renda que permite poupar ~20% por mês (~R$ 3.000)",
    income: 3000,
    color: "#10b981",
    icon: "✅"
  },
];

function formatBRL(val) {
  const sign = val < 0 ? "-" : "";
  return sign + "R$ " + Math.abs(val).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function FinancialSimulator() {
  const [variableExpenses, setVariableExpenses] = useState(Math.round(FEB_VARIABLE));
  const [activeScenario, setActiveScenario] = useState("cataliad");
  const [customIncome, setCustomIncome] = useState(null);

  const scenario = SCENARIOS.find(s => s.id === activeScenario);
  const income = customIncome !== null ? customIncome : scenario.income;

  const simulation = useMemo(() => {
    let balance = FEB_BALANCE;
    const months = [];
    for (let i = 0; i < 10; i++) {
      const totalExpense = FIXED_EXPENSES + variableExpenses;
      const monthBalance = income - totalExpense;
      balance += monthBalance;
      months.push({
        name: MONTHS[i],
        income,
        expenses: totalExpense,
        monthBalance,
        accumulated: balance
      });
    }
    return months;
  }, [income, variableExpenses]);

  const finalBalance = simulation[simulation.length - 1].accumulated;
  const monthlyBalance = income - (FIXED_EXPENSES + variableExpenses);
  const savingsRate = income > 0 ? ((monthlyBalance / income) * 100) : 0;
  const maxAcc = Math.max(...simulation.map(m => m.accumulated));
  const minAcc = Math.min(...simulation.map(m => m.accumulated));
  const chartMax = Math.max(Math.abs(maxAcc), Math.abs(minAcc), 1);

  const monthsUntilEmergency = monthlyBalance > 0
    ? Math.ceil((30000 - Math.max(0, FEB_BALANCE)) / monthlyBalance)
    : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1a",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "24px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 6px; border-radius: 3px;
          background: #1e293b; outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #6366f1; cursor: pointer;
          border: 2px solid #0a0f1a;
          box-shadow: 0 0 10px rgba(99,102,241,0.5);
        }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 3,
            color: "#6366f1", textTransform: "uppercase", marginBottom: 8,
            fontFamily: "'DM Mono', monospace"
          }}>
            Simulação Financeira 2026
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, margin: 0,
            background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Março → Dezembro
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
            Partindo do saldo de fevereiro: {formatBRL(FEB_BALANCE)}
          </p>
        </div>

        {/* Scenario Selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 2,
            color: "#475569", textTransform: "uppercase", marginBottom: 10,
            fontFamily: "'DM Mono', monospace"
          }}>
            Cenários de renda mensal
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveScenario(s.id); setCustomIncome(null); }}
                style={{
                  background: activeScenario === s.id && customIncome === null
                    ? `${s.color}18` : "#111827",
                  border: `1.5px solid ${activeScenario === s.id && customIncome === null
                    ? s.color : "#1e293b"}`,
                  borderRadius: 12, padding: "12px 14px",
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
                  {s.icon} {s.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div style={{
          background: "#111827", borderRadius: 14,
          border: "1px solid #1e293b", padding: 20, marginBottom: 24
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                Renda mensal estimada
              </span>
              <span style={{
                fontSize: 15, fontWeight: 700, color: "#6366f1",
                fontFamily: "'DM Mono', monospace"
              }}>
                {formatBRL(income)}
              </span>
            </div>
            <input
              type="range" min={0} max={6000} step={50}
              value={customIncome !== null ? customIncome : scenario.income}
              onChange={e => setCustomIncome(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4 }}>
              <span>R$ 0</span><span>R$ 6.000</span>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                Despesas variáveis/mês
              </span>
              <span style={{
                fontSize: 15, fontWeight: 700, color: "#f59e0b",
                fontFamily: "'DM Mono', monospace"
              }}>
                {formatBRL(variableExpenses)}
              </span>
            </div>
            <input
              type="range" min={0} max={3000} step={50}
              value={variableExpenses}
              onChange={e => setVariableExpenses(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4 }}>
              <span>R$ 0</span><span>R$ 3.000</span>
            </div>
          </div>

          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 8,
            background: "#0a0f1a", fontSize: 12, color: "#64748b"
          }}>
            Fixas: {formatBRL(FIXED_EXPENSES)} + Variáveis: {formatBRL(variableExpenses)} = <strong style={{ color: "#e2e8f0" }}>Total saídas: {formatBRL(FIXED_EXPENSES + variableExpenses)}</strong>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            {
              label: "Saldo mensal",
              value: formatBRL(monthlyBalance),
              color: monthlyBalance >= 0 ? "#10b981" : "#ef4444"
            },
            {
              label: "Taxa poupança",
              value: income > 0 ? `${savingsRate.toFixed(0)}%` : "—",
              color: savingsRate >= 20 ? "#10b981" : savingsRate >= 0 ? "#f59e0b" : "#ef4444"
            },
            {
              label: "Saldo em Dez",
              value: formatBRL(finalBalance),
              color: finalBalance >= 0 ? "#10b981" : "#ef4444"
            }
          ].map((m, i) => (
            <div key={i} style={{
              background: "#111827", borderRadius: 12,
              border: "1px solid #1e293b", padding: "14px 12px", textAlign: "center"
            }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
                {m.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'DM Mono', monospace" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          background: "#111827", borderRadius: 14,
          border: "1px solid #1e293b", padding: 20, marginBottom: 24
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 2,
            color: "#475569", textTransform: "uppercase", marginBottom: 16,
            fontFamily: "'DM Mono', monospace"
          }}>
            Saldo acumulado — projeção mensal
          </div>

          <div style={{ position: "relative", height: 200 }}>
            {/* Zero line */}
            <div style={{
              position: "absolute", left: 0, right: 0,
              top: `${(chartMax / (chartMax * 2)) * 100}%`,
              borderTop: "1px dashed #334155", zIndex: 1
            }}>
              <span style={{
                position: "absolute", left: 0, top: -8,
                fontSize: 9, color: "#475569", fontFamily: "'DM Mono', monospace"
              }}>0</span>
            </div>

            <div style={{
              display: "flex", alignItems: "flex-end", height: "100%",
              gap: 4, position: "relative", zIndex: 2
            }}>
              {simulation.map((m, i) => {
                const height = Math.abs(m.accumulated) / chartMax * 50;
                const isPositive = m.accumulated >= 0;
                return (
                  <div key={i} style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", height: "100%",
                    justifyContent: "center", position: "relative"
                  }}>
                    {/* Bar */}
                    <div style={{
                      position: "absolute",
                      ...(isPositive
                        ? { bottom: "50%", height: `${height}%` }
                        : { top: "50%", height: `${height}%` }
                      ),
                      width: "70%", borderRadius: 4,
                      background: isPositive
                        ? "linear-gradient(180deg, #10b981, #059669)"
                        : "linear-gradient(0deg, #ef4444, #dc2626)",
                      opacity: 0.85,
                      transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }} />
                    {/* Value label */}
                    <div style={{
                      position: "absolute",
                      ...(isPositive
                        ? { bottom: `${50 + height + 1}%` }
                        : { top: `${50 + height + 1}%` }
                      ),
                      fontSize: 8, fontWeight: 600,
                      color: isPositive ? "#10b981" : "#ef4444",
                      fontFamily: "'DM Mono', monospace",
                      whiteSpace: "nowrap"
                    }}>
                      {(m.accumulated / 1000).toFixed(1)}k
                    </div>
                    {/* Month label */}
                    <div style={{
                      position: "absolute", bottom: -18,
                      fontSize: 10, color: "#64748b", fontWeight: 500
                    }}>
                      {m.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Month Table */}
        <div style={{
          background: "#111827", borderRadius: 14,
          border: "1px solid #1e293b", padding: 20, marginBottom: 24,
          overflowX: "auto"
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 2,
            color: "#475569", textTransform: "uppercase", marginBottom: 12,
            fontFamily: "'DM Mono', monospace"
          }}>
            Projeção mês a mês
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                {["Mês","Receita","Despesas","Saldo mês","Acumulado"].map(h => (
                  <th key={h} style={{
                    padding: "8px 6px", textAlign: "right", color: "#475569",
                    fontWeight: 600, fontSize: 10, letterSpacing: 1,
                    fontFamily: "'DM Mono', monospace",
                    textTransform: "uppercase",
                    ...(h === "Mês" ? { textAlign: "left" } : {})
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simulation.map((m, i) => (
                <tr key={i} style={{
                  borderBottom: "1px solid #0f172a",
                  background: i % 2 === 0 ? "transparent" : "#0c1322"
                }}>
                  <td style={{ padding: "8px 6px", fontWeight: 600, color: "#94a3b8" }}>{m.name}</td>
                  <td style={{ padding: "8px 6px", textAlign: "right", color: "#6366f1", fontFamily: "'DM Mono', monospace" }}>
                    {formatBRL(m.income)}
                  </td>
                  <td style={{ padding: "8px 6px", textAlign: "right", color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>
                    {formatBRL(m.expenses)}
                  </td>
                  <td style={{
                    padding: "8px 6px", textAlign: "right", fontWeight: 600,
                    color: m.monthBalance >= 0 ? "#10b981" : "#ef4444",
                    fontFamily: "'DM Mono', monospace"
                  }}>
                    {formatBRL(m.monthBalance)}
                  </td>
                  <td style={{
                    padding: "8px 6px", textAlign: "right", fontWeight: 700,
                    color: m.accumulated >= 0 ? "#10b981" : "#ef4444",
                    fontFamily: "'DM Mono', monospace"
                  }}>
                    {formatBRL(m.accumulated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div style={{
          background: "#111827", borderRadius: 14,
          border: "1px solid #1e293b", padding: 20
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 2,
            color: "#475569", textTransform: "uppercase", marginBottom: 14,
            fontFamily: "'DM Mono', monospace"
          }}>
            Diagnóstico
          </div>

          {monthlyBalance < 0 && (
            <div style={{
              background: "#ef444412", border: "1px solid #ef444430",
              borderRadius: 10, padding: 14, marginBottom: 10
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>
                Déficit mensal de {formatBRL(Math.abs(monthlyBalance))}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                O saldo de fevereiro ({formatBRL(FEB_BALANCE)}) será consumido em{" "}
                <strong style={{ color: "#e2e8f0" }}>
                  {Math.floor(FEB_BALANCE / Math.abs(monthlyBalance))} meses
                </strong>. Depois disso o saldo fica negativo.
              </div>
            </div>
          )}

          {monthlyBalance >= 0 && monthlyBalance < 200 && (
            <div style={{
              background: "#f59e0b12", border: "1px solid #f59e0b30",
              borderRadius: 10, padding: 14, marginBottom: 10
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b", marginBottom: 4 }}>
                Equilíbrio apertado
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                Sobra pouco por mês. Qualquer imprevisto pode comprometer o orçamento.
                Tente buscar mais R$ 300–500/mês para ter margem de segurança.
              </div>
            </div>
          )}

          {monthlyBalance >= 200 && (
            <div style={{
              background: "#10b98112", border: "1px solid #10b98130",
              borderRadius: 10, padding: 14, marginBottom: 10
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#10b981", marginBottom: 4 }}>
                Cenário saudável
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                Poupando {formatBRL(monthlyBalance)}/mês ({savingsRate.toFixed(0)}% da renda).
                {monthsUntilEmergency && monthsUntilEmergency > 0 && (
                  <> Nesse ritmo, você atinge a reserva de emergência de R$ 30k em{" "}
                  <strong style={{ color: "#e2e8f0" }}>{monthsUntilEmergency} meses</strong>.</>
                )}
              </div>
            </div>
          )}

          <div style={{
            background: "#6366f112", border: "1px solid #6366f130",
            borderRadius: 10, padding: 14
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>
              Renda mínima necessária
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
              Para cobrir fixas + variáveis estimadas:{" "}
              <strong style={{ color: "#e2e8f0" }}>
                {formatBRL(FIXED_EXPENSES + variableExpenses)}
              </strong>/mês.
              Para poupar 20%:{" "}
              <strong style={{ color: "#e2e8f0" }}>
                {formatBRL((FIXED_EXPENSES + variableExpenses) / 0.8)}
              </strong>/mês.
            </div>
          </div>
        </div>

        <div style={{
          textAlign: "center", marginTop: 20,
          fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace"
        }}>
          Simulação baseada nos dados reais de Fev/2026 • Ajuste os controles para explorar cenários
        </div>
      </div>
    </div>
  );
}
