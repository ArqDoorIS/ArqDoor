import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState, SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Limites de gasto da IA (19/11/2026). Backend: GET e PUT /admin/ai-limites.
 *   - teto por pessoa por dia: quem chega nele fica sem IA até o dia seguinte (o app mostra
 *     "Você usou bastante a IA hoje. Ela volta amanhã."). As analistas do painel não contam.
 *   - alertas do mês: quando o gasto do mês passa de cada valor, aparece o aviso aqui (e uma
 *     linha no log do servidor). Alerta não barra nada.
 */
type Alerta = { limite: number; passou: boolean; avisado_em: string | null };
type PessoaHoje = { user_id: number; custo_usd: number; chamadas: number; bateu_o_teto: boolean; pessoa: { id: number; nome?: string; email?: string; tipo?: string } };
export type Limites = {
  mes: string;
  gasto_mes_usd: number;
  teto_pessoa_dia_usd: number;
  alertas_mes_usd: number[];
  padroes: { teto_pessoa_dia_usd: number; alertas_mes_usd: number[] };
  alertas: Alerta[];
  pessoas_hoje: PessoaHoje[];
};

const dolar = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nomeDoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, (m || 1) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
};
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const PAPEIS: Record<string, string> = { cliente: "Cliente", prestador: "Profissional", profissional: "Profissional" };
const PERTO_DO_TETO = 0.75;

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};
const numero = (v: string) => Number(String(v).replace(",", "."));

/** O aviso do mês: o maior alerta que o gasto já passou. */
export function AvisoDeGasto({ limites }: { limites: Limites }) {
  const passados = limites.alertas.filter((a) => a.passou);
  if (!passados.length) return null;
  const maior = passados[passados.length - 1];
  const todos = passados.length === limites.alertas.length;
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${todos ? "border-rose-300 bg-rose-50 text-rose-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">
          Alerta de gasto: a IA já gastou {dolar(limites.gasto_mes_usd)} em {nomeDoMes(limites.mes)} e passou de {dolar(maior.limite)}.
        </p>
        <p className="text-xs">
          {maior.avisado_em ? `Aviso dado em ${quando(maior.avisado_em)}. ` : ""}Nada foi bloqueado: o alerta só avisa. Se quiser segurar o gasto, baixe o teto por pessoa abaixo.
        </p>
      </div>
    </div>
  );
}

export function AdminAiLimitesCard() {
  const [limites, setLimites] = useState<Limites | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [teto, setTeto] = useState("");
  const [alertas, setAlertas] = useState<string[]>(["", ""]);

  const carregar = () =>
    apiRequest("GET", "/admin/ai-limites").then(ler).then((b) => {
      const l: Limites = b.limites;
      setLimites(l);
      setTeto(String(l.teto_pessoa_dia_usd));
      const lista = l.alertas_mes_usd.map(String);
      setAlertas(lista.length >= 2 ? lista : [...lista, ""].slice(0, 2));
    });

  useEffect(() => {
    let cancelado = false;
    carregar().catch((e) => { if (!cancelado) setErro(e.message); });
    return () => { cancelado = true; };
  }, []);

  const salvar = async () => {
    setAviso(null); setErro(null);
    const valorDoTeto = numero(teto);
    const valores = alertas.filter((v) => v.trim() !== "").map(numero);
    if (!(valorDoTeto > 0)) return setErro("O teto por pessoa precisa ser um valor maior que zero.");
    if (valores.some((v) => !(v > 0))) return setErro("Os alertas precisam ser valores maiores que zero.");
    setSalvando(true);
    try {
      await ler(await apiRequest("PUT", "/admin/ai-limites", { teto_pessoa_dia_usd: valorDoTeto, alertas_mes_usd: valores }));
      await carregar();
      setAviso("Limites salvos. Valem no app em até 30 segundos.");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (!limites && !erro) return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando os limites da IA…</div>;

  const campo = "mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
  const rotulo = "block text-sm font-medium text-slate-700";
  const topoDaBarra = limites ? Math.max(limites.gasto_mes_usd, ...limites.alertas_mes_usd, 1) * 1.1 : 1;

  return (
    <div className="space-y-2">
      {limites ? <AvisoDeGasto limites={limites} /> : null}
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
      {aviso ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{aviso}</p> : null}
      {limites ? (
        <SectionCard title="Limites de gasto" subtitle="O teto por pessoa para a IA de quem passou do valor no dia. Os alertas do mês só avisam, não param nada.">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-700">
                Gasto em {nomeDoMes(limites.mes)}: <span className="font-semibold text-slate-900">{dolar(limites.gasto_mes_usd)}</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {limites.alertas.map((a) => (
                  <StatusBadge key={a.limite} label={`${dolar(a.limite)}: ${a.passou ? "passou" : "ainda não"}`} tone={a.passou ? "rose" : "emerald"} />
                ))}
              </div>
            </div>
            <div className="relative mt-2 h-3 rounded-full bg-slate-100" role="img" aria-label={`Gasto do mês: ${dolar(limites.gasto_mes_usd)}`}>
              <div className="h-3 rounded-full bg-orange-500" style={{ width: `${Math.min(100, (limites.gasto_mes_usd / topoDaBarra) * 100)}%` }} />
              {limites.alertas_mes_usd.map((l) => (
                <div key={l} title={`Alerta em ${dolar(l)}`} className="absolute top-[-3px] h-[18px] w-0.5 bg-slate-700" style={{ left: `${(l / topoDaBarra) * 100}%` }} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className={rotulo}>
              Teto por pessoa por dia (US$)
              <input aria-label="Teto por pessoa por dia" type="number" min={0.5} step={0.5} placeholder={`Padrão: ${limites.padroes.teto_pessoa_dia_usd}`} value={teto} onChange={(e) => setTeto(e.target.value)} className={campo} />
            </label>
            {alertas.map((v, i) => (
              <label key={i} className={rotulo}>
                {`Alerta ${i + 1} do mês (US$)`}
                <input
                  aria-label={`Alerta ${i + 1} do mês`}
                  type="number" min={1} step={5}
                  placeholder={limites.padroes.alertas_mes_usd[i] != null ? `Padrão: ${limites.padroes.alertas_mes_usd[i]}` : "Sem alerta"}
                  value={v}
                  onChange={(e) => setAlertas(alertas.map((x, j) => (j === i ? e.target.value : x)))}
                  className={campo}
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tudo em dólar porque a Anthropic cobra em dólar. O teto soma todas as IAs que a pessoa usou no dia (o dia vira à meia-noite UTC, 21h em Brasília). As analistas do painel não contam. Cada alerta sai uma vez por mês.
          </p>
          <div className="mt-2 flex justify-end">
            <button type="button" disabled={salvando} onClick={() => void salvar()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar limites
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">Quem mais usou a IA hoje</p>
            {!limites.pessoas_hoje.length ? (
              <EmptyState title="Ninguém usou a IA hoje" description="Quando alguém logado conversar com a IA, o gasto da pessoa aparece aqui." />
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Pessoa</th>
                      <th className="py-2 pr-3 font-medium">Gasto hoje</th>
                      <th className="py-2 pr-3 font-medium">Respostas</th>
                      <th className="py-2 font-medium">Teto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limites.pessoas_hoje.map((p) => {
                      const parte = p.custo_usd / limites.teto_pessoa_dia_usd;
                      return (
                        <tr key={p.user_id} className="border-t border-slate-100">
                          <td className="py-2 pr-3">
                            <span className="font-semibold text-slate-800">{p.pessoa.nome || "Sem nome"}</span>
                            <span className="block text-xs text-slate-500">
                              #{p.user_id}{p.pessoa.email ? ` · ${p.pessoa.email}` : ""}{p.pessoa.tipo ? ` · ${PAPEIS[p.pessoa.tipo] ?? p.pessoa.tipo}` : ""}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            {dolar(p.custo_usd)}
                            <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                              <div className={`h-1.5 rounded-full ${p.bateu_o_teto ? "bg-rose-500" : parte >= PERTO_DO_TETO ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, parte * 100)}%` }} />
                            </div>
                          </td>
                          <td className="py-2 pr-3">{p.chamadas.toLocaleString("pt-BR")}</td>
                          <td className="py-2">
                            {p.bateu_o_teto ? <StatusBadge label="Bateu o teto" tone="rose" /> : parte >= PERTO_DO_TETO ? <StatusBadge label="Perto do teto" tone="amber" /> : <StatusBadge label="Normal" tone="emerald" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
