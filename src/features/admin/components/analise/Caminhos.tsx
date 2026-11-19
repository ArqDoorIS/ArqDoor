import { useState } from "react";
import { Hammer, User } from "lucide-react";
import { SectionCard } from "../AdminPrimitives";
import { Alternador, Barras, Carregando, Erro, EtiquetaPH, MiniKpis, SeloTemp, parte, pct, useApi, type ConteudoJanela } from "./comum";
import { Sankey, anterior, chanceDe, proximo, valorDe } from "./Sankey";
import type { Caminhos as TCaminhos } from "./tipos";

type Abrir = (c: ConteudoJanela) => void;

/** Tabela das pessoas de um bloco ou faixa; clicar abre a investigação. */
export function TabelaDePessoas({ dados, ids, total, investigar }: { dados: TCaminhos; ids: number[]; total: number; investigar: (id: number) => void }) {
  if (!ids?.length) return <p className="text-xs text-slate-400">Sem pessoas listadas.</p>;
  return (
    <>
      <table className="w-full text-left text-xs">
        <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="py-1">Pessoa</th><th>PostHog</th><th>Situação agora</th><th>Temperatura</th><th>Chance</th><th /></tr></thead>
        <tbody>
          {ids.map((id) => {
            const p = dados.pessoas?.[String(id)];
            return (
              <tr key={id} className="border-t border-slate-100">
                <td className="py-1.5 font-semibold text-slate-900">{p?.nome ?? `Conta ${id}`}</td>
                <td><EtiquetaPH id={id} leve /></td>
                <td className="text-slate-600">{p?.situacao ?? "—"}</td>
                <td><SeloTemp t={p?.temperatura} /></td>
                <td>{pct(p?.chance)}</td>
                <td className="text-right"><button type="button" onClick={() => investigar(id)} className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white">investigar</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total > ids.length ? <p className="mt-1 text-xs text-slate-400">+ {total - ids.length} pessoas</p> : null}
    </>
  );
}

export function janelaDoBloco(dados: TCaminhos, id: string, investigar: (id: number) => void): ConteudoJanela {
  const no = dados.nos[id];
  const v = valorDe(dados, id), d = dados.detalhes?.[id] || {};
  const ent = anterior(dados, id), sai = proximo(dados, id);
  const chance = Math.round(chanceDe(dados, id) * 100);
  const media = parte(dados.alvos.reduce((s, a) => s + (dados.nos[a] ? valorDe(dados, a) : 0), 0), dados.total);
  const seguiram = sai.filter((l) => !dados.nos[l[1]]?.parou).reduce((s, l) => s + l[2], 0);
  return {
    titulo: no.nome,
    sub: `${dados.etapas[no.coluna]}${no.parou ? " · onde o caminho terminou" : ""}`,
    corpo: (
      <>
        <MiniKpis itens={[
          ["Pessoas", v, `${parte(v, dados.total)}% do total`],
          [`Chance de ${dados.rotulo_alvo}`, `${chance}%`, chance >= media ? `acima da média (${media}%)` : `abaixo da média (${media}%)`],
          ["Tempo nesta etapa", d.tempo || "—", "mediana"],
          [no.parou ? "Terminou aqui" : "Seguiram em frente", no.parou ? v : seguiram, no.parou ? "sem seguir" : `${parte(seguiram, v)}% deste bloco`],
        ]} />
        {d.obs ? <p className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">{d.obs}</p> : null}
        {dados.voltas?.[id] ? <p className="rounded-xl border border-dashed border-orange-300 px-3 py-2">↺ <b>{dados.voltas[id][0]}</b> {dados.voltas[id][1]} (voltaram a esta etapa)</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {ent.length ? <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">De onde vieram</h5><Barras linhas={ent.map(([a, , n]) => [dados.nos[a]?.nome ?? a, n])} total={v} /></section> : null}
          {sai.length ? <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Para onde foram</h5><Barras linhas={sai.map(([, b, n]) => [dados.nos[b]?.nome ?? b, n, dados.nos[b]?.parou ? "parou" : undefined])} total={v} /></section> : null}
          {dados.sub?.[id]?.length ? <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Ramificações dentro deste bloco</h5><Barras linhas={dados.sub[id]} total={v} cor="bg-orange-600" /></section> : null}
          {d.motivos?.length ? <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Por que pararam</h5><Barras linhas={d.motivos} total={d.motivos.reduce((s, x) => s + x[1], 0)} cor="bg-slate-400" /></section> : null}
          {d.perfil?.length ? <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Quem são</h5><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">{d.perfil.map(([k, x]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-800">{x}</dd></div>)}</dl></section> : null}
        </div>
        <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pessoas neste bloco</h5><TabelaDePessoas dados={dados} ids={dados.pessoas_no?.[id] ?? []} total={v} investigar={investigar} /></section>
      </>
    ),
  };
}

export function janelaDaFaixa(dados: TCaminhos, i: number, investigar: (id: number) => void): ConteudoJanela {
  const [a, b, v] = dados.liga[i];
  const va = valorDe(dados, a);
  const outros = proximo(dados, a).filter((l) => l[1] !== b);
  return {
    titulo: `${dados.nos[a].nome} → ${dados.nos[b].nome}`,
    sub: `${dados.etapas[dados.nos[a].coluna]} → ${dados.etapas[dados.nos[b].coluna]}`,
    corpo: (
      <>
        <MiniKpis itens={[
          ["Pessoas", v, `${parte(v, va)}% de ${dados.nos[a].nome}`],
          [`Chance de ${dados.rotulo_alvo} depois`, `${Math.round(chanceDe(dados, b) * 100)}%`, `a partir de ${dados.nos[b].nome}`],
          ["Tempo no bloco seguinte", dados.detalhes?.[b]?.tempo || "—", "mediana"],
          ["Seguiram por aqui", `${parte(v, va)}%`, "das saídas do bloco"],
        ]} />
        <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">As saídas de {dados.nos[a].nome}</h5><Barras linhas={[[`${dados.nos[b].nome} (esta)`, v], ...outros.map(([, x, n]) => [dados.nos[x]?.nome ?? x, n] as [string, number])]} total={va} /></section>
        <section><h5 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Pessoas que fizeram esse caminho</h5><TabelaDePessoas dados={dados} ids={dados.pessoas_liga?.[`${a}>${b}`] ?? []} total={v} investigar={investigar} /></section>
      </>
    ),
  };
}

export function AbaCaminhos({ dias, abrir, investigar }: { dias: number; abrir: Abrir; investigar: (id: number) => void }) {
  const [papel, setPapel] = useState<"cliente" | "profissional">("cliente");
  const principal = useApi<TCaminhos>(`/admin/analise/caminhos?papel=${papel}&dias=${dias}`);
  const pos = useApi<TCaminhos>(`/admin/analise/caminhos?papel=pos&dias=${dias}`);
  const titulo = papel === "cliente" ? "Caminhos dos clientes" : "Caminhos dos profissionais";
  return (
    <div className="space-y-4">
      <SectionCard
        title={principal.dado ? `${titulo} · ${principal.dado.total ?? 0} ${papel === "cliente" ? "pessoas que chegaram" : "pedidos que chegaram a eles"} em ${dias} dias` : titulo}
        subtitle="Clique num bloco ou numa faixa para ver os detalhes e as pessoas. ▸ abre as ramificações; ↺ é quem voltou a uma etapa."
        action={<Alternador valor={papel} mudar={setPapel} opcoes={[["cliente", "Cliente", User], ["profissional", "Profissional", Hammer]]} />}
      >
        {principal.erro ? <Erro msg={principal.erro} /> : !principal.dado ? <Carregando /> : (
          <Sankey dados={principal.dado} aoClicarNo={(id) => abrir(janelaDoBloco(principal.dado!, id, investigar))} aoClicarLiga={(i) => abrir(janelaDaFaixa(principal.dado!, i, investigar))} alturaMin={680} />
        )}
        <Legenda />
      </SectionCard>
      <SectionCard title={pos.dado ? `Depois de fechar · ${pos.dado.total ?? 0} contratos pagos` : "Depois de fechar"} subtitle="Da 1ª fase paga à avaliação, à indicação e ao novo pedido">
        {pos.erro ? <Erro msg={pos.erro} /> : !pos.dado ? <Carregando /> : (
          <Sankey dados={pos.dado} aoClicarNo={(id) => abrir(janelaDoBloco(pos.dado!, id, investigar))} aoClicarLiga={(i) => abrir(janelaDaFaixa(pos.dado!, i, investigar))} alturaMin={420} />
        )}
      </SectionCard>
    </div>
  );
}

export function Legenda() {
  return (
    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-500" />segue em frente</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-700" />chegou ao fim (fechou)</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" />parou aqui</span>
      <span className="inline-flex items-center gap-1.5"><span className="font-bold text-orange-600">↺</span>voltou a uma etapa</span>
    </div>
  );
}
