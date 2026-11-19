import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState, SectionCard } from "./AdminPrimitives";

/**
 * Uso e custo de cada IA (18/11/2026). Backend: GET /admin/ai-uso?dias=N.
 * O custo é calculado pelo servidor com a tabela de preços da Anthropic, em dólar.
 */
type LinhaDoTipo = { tipo: string; chamadas: number; erros: number; tokens_entrada: number; tokens_saida: number; tokens_cache: number; custo_usd: number; hoje_usd: number };
type Uso = { desde: string; dias: number; tipos: LinhaDoTipo[]; por_dia: { dia: string; custo_usd: number }[] };

const NOMES: Record<string, string> = {
  pedido: "Pedido do cliente",
  proposta: "Proposta com IA",
  contrato: "Texto do orçamento",
  perfil: "Perfil de demanda",
  fases: "Explicação das fases",
  analise_cliente: "Analista do cliente (painel)",
  analise_profissional: "Analista do profissional (painel)",
  analise_perguntas: "Pergunte à IA (painel)",
  teste: "Teste da chave",
};
const PERIODOS = [7, 30, 90];

const dolar = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 4 : 2 })}`;
const mil = (v: number) => v.toLocaleString("pt-BR");

export function AdminAiUsoSection() {
  const [dias, setDias] = useState(30);
  const [uso, setUso] = useState<Uso | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let cancelado = false;
    setUso(null); setErro(null);
    apiRequest("GET", `/admin/ai-uso?dias=${dias}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
        return body;
      })
      .then((b) => { if (!cancelado) setUso(b.uso); })
      .catch((e) => { if (!cancelado) setErro(e.message); });
    return () => { cancelado = true; };
  }, [dias]);

  const total = (uso?.tipos ?? []).reduce((s, t) => s + t.custo_usd, 0);
  const maiorDia = Math.max(0.0001, ...(uso?.por_dia ?? []).map((d) => d.custo_usd));
  return (
    <div className="mt-2 space-y-2">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {PERIODOS.map((p) => (
          <button key={p} type="button" onClick={() => setDias(p)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dias === p ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {p} dias
          </button>
        ))}
      </div>
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
      {!uso && !erro ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando o uso da IA…</div> : null}
      {uso ? (
        <SectionCard title={`Gasto nos últimos ${uso.dias} dias: ${dolar(total)}`} subtitle="Cada chamada à IA, somada por área. Erros contam à parte e não custam.">
          {!uso.tipos.length ? (
            <EmptyState title="Nenhum uso no período" description="Quando alguém conversar com a IA, o gasto aparece aqui." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">IA</th>
                      <th className="py-2 pr-3 font-medium">Respostas</th>
                      <th className="py-2 pr-3 font-medium">Erros</th>
                      <th className="py-2 pr-3 font-medium">Custo no período</th>
                      <th className="py-2 pr-3 font-medium">Custo hoje</th>
                      <th className="py-2 pr-3 font-medium">Custo por resposta</th>
                      <th className="py-2 font-medium">Lido do cache</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uso.tipos.map((t) => {
                      const lidos = t.tokens_entrada + t.tokens_cache;
                      return (
                        <tr key={t.tipo} className="border-t border-slate-100">
                          <td className="py-2 pr-3 font-semibold text-slate-800">{NOMES[t.tipo] ?? t.tipo}</td>
                          <td className="py-2 pr-3">{mil(t.chamadas)}</td>
                          <td className="py-2 pr-3">{t.erros ? <span className="text-amber-700">{mil(t.erros)}</span> : "0"}</td>
                          <td className="py-2 pr-3">{dolar(t.custo_usd)}</td>
                          <td className="py-2 pr-3">{dolar(t.hoje_usd)}</td>
                          <td className="py-2 pr-3">{t.chamadas ? dolar(t.custo_usd / t.chamadas) : "-"}</td>
                          <td className="py-2">{lidos ? `${Math.round((t.tokens_cache / lidos) * 100)}%` : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500">Gasto por dia</p>
                <div className="mt-2 flex h-24 items-end gap-1" role="img" aria-label="Gasto por dia">
                  {uso.por_dia.map((d) => (
                    <div key={d.dia} title={`${d.dia}: ${dolar(d.custo_usd)}`} className="min-w-[4px] flex-1 rounded-t bg-orange-500" style={{ height: `${Math.max(2, (d.custo_usd / maiorDia) * 100)}%` }} />
                  ))}
                </div>
              </div>
            </>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
