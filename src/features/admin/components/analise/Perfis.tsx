import { useState } from "react";
import { Hammer, Lightbulb, User } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import {
  ACOES, Alternador, Barras, COMO_RECONHECE, Carregando, Erro, EtiquetaPH, ICONE_CATEGORIA, MiniKpis, SeloTemp, nomeCategoria, pct, reais, rotulo, useApi,
  type ConteudoJanela,
} from "./comum";
import type { Categoria, Papel, Perfis } from "./tipos";

export function janelaDaCategoria(c: Categoria, papel: Papel, media: number | null, investigar: (id: number) => void): ConteudoJanela {
  const I = ICONE_CATEGORIA[c.id] ?? User;
  return {
    titulo: <span className="inline-flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-orange-600"><I className="h-4.5 w-4.5" /></span>{nomeCategoria(c.id)}</span>,
    sub: `Perfil de ${papel}`,
    corpo: (
      <>
        <MiniKpis itens={[
          ["Pessoas", c.n, papel === "cliente" ? "clientes analisados" : "profissionais analisados"],
          ["Fecham em 90 dias", c.fecham_pct == null ? "—" : `${c.fecham_pct}%`, c.fecham_pct == null ? "ainda sem previsões vencidas" : `média geral ${media ?? "—"}%`],
          ["Chance média (IA)", pct(c.chance_media_pct), "da última análise"],
          ["Valor típico", reais(c.valor_tipico), "dos contratos"],
        ]} />
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">Como a IA reconhece: <b>{COMO_RECONHECE[c.id] ?? "—"}</b>.{c.acao_mais_comum ? <> Follow-up mais sugerido: <b>{ACOES[c.acao_mais_comum] ?? rotulo(c.acao_mais_comum)}</b>.</> : null}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Traços em comum (nível alto)</h5><Barras linhas={(c.tracos_comuns ?? []).map(([t, n]) => [rotulo(t), n])} total={c.n} /></section>
          <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">De onde vieram</h5><Barras linhas={c.origens ?? []} total={c.n} /></section>
        </div>
        <section>
          <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pessoas neste perfil</h5>
          {!c.pessoas?.length ? <p className="text-xs text-slate-400">Ninguém.</p> : (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Pessoa</th><th>PostHog</th><th>Etapa agora</th><th>Temperatura</th><th>Chance</th><th /></tr></thead>
              <tbody>{(c.pessoas ?? []).map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-1.5 font-semibold text-slate-900">{p.nome ?? `Conta ${p.id}`}</td><td><EtiquetaPH id={p.id} leve /></td><td className="text-slate-600">{p.etapa ?? "—"}</td>
                  <td><SeloTemp t={p.temperatura} /></td><td>{pct(p.chance)}</td>
                  <td className="text-right"><button type="button" onClick={() => investigar(p.id)} className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">investigar</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {c.n > (c.pessoas?.length ?? 0) ? <p className="mt-1 text-xs text-slate-400">+ {c.n - (c.pessoas?.length ?? 0)} pessoas</p> : null}
        </section>
      </>
    ),
  };
}

export function AbaPerfis({ abrir, investigar }: { abrir: (c: ConteudoJanela) => void; investigar: (id: number) => void }) {
  const [papel, setPapel] = useState<Papel>("cliente");
  const { dado, erro } = useApi<Perfis>(`/admin/analise/perfis?papel=${papel}`);
  return (
    <SectionCard
      title="Tipos de perfil · quem a IA analista já classificou"
      subtitle="Cada cartão é um tipo de pessoa: quantos são, quanto fecham e o que funciona com eles. Clique num cartão para ver os números e a lista de pessoas."
      action={<Alternador valor={papel} mudar={setPapel} opcoes={[["cliente", "Clientes", User], ["profissional", "Profissionais", Hammer]]} />}
    >
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !dado.categorias?.length ? (
        <p className="text-sm text-slate-500">Ninguém analisado ainda. Rode a IA analista em Pessoas para os perfis aparecerem.</p>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {dado.categorias.map((c) => {
            const I = ICONE_CATEGORIA[c.id] ?? User;
            const fecha = c.fecham_pct ?? c.chance_media_pct;
            return (
              <button key={c.id} type="button" onClick={() => abrir(janelaDaCategoria(c, papel, dado.media_geral_fecha_pct, investigar))} className="rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                <h4 className="flex items-center gap-2 text-[15px] font-semibold text-slate-950"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-orange-600"><I className="h-4 w-4" /></span>{nomeCategoria(c.id)}</h4>
                <p className="mt-1 text-xs text-slate-500">{COMO_RECONHECE[c.id] ?? ""}</p>
                <div className="my-2 flex gap-4">
                  <div className="text-[11px] text-slate-500"><b className="block text-lg text-slate-950">{c.n}</b>pessoas</div>
                  <div className="text-[11px] text-slate-500"><b className="block text-lg text-slate-950">{fecha == null ? "—" : `${Math.round(fecha)}%`}</b>{c.fecham_pct == null ? "chance média" : "fecham"}</div>
                  <div className="text-[11px] text-slate-500"><b className="block text-lg text-slate-950">{reais(c.valor_tipico)}</b>valor típico</div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-orange-400" style={{ width: `${fecha ?? 0}%` }} /></div>
                {c.acao_mais_comum ? <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-700"><Lightbulb className="mt-px h-3.5 w-3.5 flex-none" />{ACOES[c.acao_mais_comum] ?? rotulo(c.acao_mais_comum)}</p> : null}
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
