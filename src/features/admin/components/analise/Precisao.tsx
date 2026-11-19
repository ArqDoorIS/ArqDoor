import { CheckCircle2, Clock3, Target, TrendingUp } from "lucide-react";
import { SectionCard, StatCard } from "../AdminPrimitives";
import { Carregando, Erro, PERGUNTAS, useApi } from "./comum";
import type { Nota } from "./tipos";

type Resposta = { pendentes: number; conferidas_agora: number; geral: Nota; cliente: Nota; profissional: Nota };

function Calibracao({ titulo, x }: { titulo: string; x: Nota }) {
  return (
    <SectionCard title={titulo} subtitle={x.conferidas ? `${x.conferidas} previsão(ões) conferida(s) · nota (Brier) ${x.brier}` : "Nenhuma previsão vencida ainda"}>
      {!x.conferidas ? <p className="text-sm text-slate-500">Assim que os prazos vencerem, a nota aparece aqui.</p> : (
        <div className="space-y-3">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">A IA disse</th><th>Previsões</th><th>Média dita</th><th>Aconteceu</th><th className="w-1/3" /></tr></thead>
            <tbody>{(x.faixas ?? []).map((f) => (
              <tr key={f.faixa} className="border-t border-slate-100">
                <td className="py-1.5 font-semibold">{f.faixa}</td><td>{f.previsoes}</td><td>{f.disse == null ? "—" : `${f.disse}%`}</td><td className="font-bold">{f.aconteceu == null ? "—" : `${f.aconteceu}%`}</td>
                <td>{f.disse != null && f.aconteceu != null ? (
                  <div className="relative h-2 rounded-full bg-slate-100"><i className="absolute inset-y-0 left-0 rounded-full bg-orange-300" style={{ width: `${f.aconteceu}%` }} /><b className="absolute -top-1 h-4 w-0.5 bg-slate-900" style={{ left: `${f.disse}%` }} title="o que a IA disse" /></div>
                ) : null}</td>
              </tr>
            ))}</tbody>
          </table>
          {Object.keys(x.por_pergunta ?? {}).length ? (
            <div className="flex flex-wrap gap-2 text-xs">{Object.entries(x.por_pergunta).map(([k, g]) => <span key={k} className="rounded-lg border border-slate-200 px-2 py-1"><b>{PERGUNTAS[k] ?? k}</b>: disse {Math.round(g.media_dita * 100)}%, aconteceu {Math.round((g.aconteceu / g.conferidas) * 100)}% ({g.conferidas})</span>)}</div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

export function AbaPrecisao() {
  const { dado: n, erro } = useApi<Resposta>("/admin/analise/previsoes", 120000);
  if (erro) return <Erro msg={erro} />;
  if (!n) return <Carregando />;
  if (!n.geral) return <p className="text-sm text-slate-500">Ainda sem previsões.</p>;
  const acertoQuente = (n.geral.faixas ?? []).filter((f) => f.disse != null && f.disse >= 60).reduce((s, f) => s + f.previsoes, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Previsões conferidas" value={n.geral.conferidas} helper={`${n.pendentes} aguardando o prazo`} icon={CheckCircle2} />
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Nota (Brier)</p><p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{n.geral.brier == null ? "—" : n.geral.brier.toFixed(2).replace(".", ",")}</p><p className="mt-0.5 text-[11px] text-slate-500">0 = perfeita · 0,25 = chute de 50%</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600"><Target className="h-3.5 w-3.5" /></div></div>
        </div>
        <StatCard label="Previsões de 60% ou mais" value={acertoQuente} helper="as apostas mais fortes da IA" icon={TrendingUp} />
        <StatCard label="Conferidas agora" value={n.conferidas_agora} helper="vencidas e checadas no banco" icon={Clock3} />
      </div>
      <p className="text-sm text-slate-600">Bem calibrada é quando, das vezes que a IA diz ~30%, umas 30 em 100 acontecem. A barra laranja é o que aconteceu; o traço preto é o que a IA disse.</p>
      <Calibracao titulo="Geral" x={n.geral} />
      <div className="grid gap-4 lg:grid-cols-2">{n.cliente ? <Calibracao titulo="Clientes" x={n.cliente} /> : null}{n.profissional ? <Calibracao titulo="Profissionais" x={n.profissional} /> : null}</div>
    </div>
  );
}
