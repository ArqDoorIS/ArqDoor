import { useEffect, useState } from "react";
import { Cpu, LayoutDashboard, Layers, Loader2, Route, Search, Target, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "../utils";
import { Alternador, Janela, ler, type ConteudoJanela } from "./analise/comum";
import { AbaVisaoGeral } from "./analise/VisaoGeral";
import { AbaCaminhos } from "./analise/Caminhos";
import { AbaPerfis } from "./analise/Perfis";
import { AbaPessoas } from "./analise/Pessoas";
import { AbaInvestigar } from "./analise/Investigar";
import { AbaPrecisao } from "./analise/Precisao";
import { AbaKirios } from "./analise/Kirios";

/**
 * Painel > Análise (v2, 19/11/2026). Sete abas:
 *
 *   Visão geral     os 4 números, o funil desde o download (cliente e profissional), a fila de ação,
 *                   a temperatura dos leads e as tendências
 *   Caminhos        o diagrama de fluxo (cliente, profissional e depois de fechar), com janelas de detalhe
 *   Perfis          um cartão por tipo de pessoa que a IA analista classificou
 *   Pessoas         todo mundo, com filtro e busca pelo nome ou pelo código do PostHog
 *   Investigar      a ficha de uma pessoa: resumo da IA, mapa do caminho dela, dados, conversas e previsões
 *   Algoritmo       o desempenho do algoritmo de match (Kirios): o % de cada cartão acerta quem fecha?
 *   Precisão da IA  as previsões da IA analista conferidas pelo código quando vencem
 *
 * O código PH #id é o mesmo da pessoa no PostHog (o app manda o id do usuário como distinct_id).
 * O log de cada clique fica no PostHog; aqui entra só o resumo. A IA analista só roda por botão.
 * Backend: /admin/analise/* (controllers/admin/adminAnaliseController.js).
 */

type Aba = "visao" | "caminhos" | "perfis" | "pessoas" | "investigar" | "kirios" | "precisao";
const ABAS: [Aba, string, typeof Users][] = [
  ["visao", "Visão geral", LayoutDashboard], ["caminhos", "Caminhos", Route], ["perfis", "Perfis", Layers],
  ["pessoas", "Pessoas", Users], ["investigar", "Investigar", Search], ["kirios", "Algoritmo", Cpu], ["precisao", "Precisão da IA", Target],
];

/** Liga o PostHog para os passos antes do login (chave pessoal de leitura, guardada cifrada no servidor). */
function AjustesDoPosthog({ fechar }: { fechar: () => void }) {
  const [atual, setAtual] = useState<{ ligado: boolean; projeto_id: string | null; host: string | null; chave_final: string | null } | null>(null);
  const [projeto, setProjeto] = useState("715328");
  const [host, setHost] = useState("https://us.posthog.com");
  const [chave, setChave] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    apiRequest("GET", "/admin/analise/posthog").then(ler).then((b) => { setAtual(b); if (b.projeto_id) setProjeto(String(b.projeto_id)); if (b.host) setHost(b.host); }).catch((e) => setMsg(e.message));
  }, []);
  const salvar = async () => {
    setSalvando(true); setMsg(null);
    try { await apiRequest("PUT", "/admin/analise/posthog", { projeto_id: projeto.trim(), host: host.trim(), chave: chave.trim() || undefined }).then(ler); setMsg("Salvo. Os números do PostHog aparecem na próxima vez que a aba carregar."); setChave(""); }
    catch (e: any) { setMsg(e.message); } finally { setSalvando(false); }
  };
  return (
    <div className="space-y-3">
      <p>Os passos antes do login (baixou, abriu, boas-vindas, escolheu o papel, teste com a IA) e o uso do app de cada pessoa vêm do PostHog. Para o painel ler, ponha uma <b>chave pessoal</b> do PostHog com permissão só de leitura (Settings › Personal API keys › escopo <i>query: read</i>). Ela começa com <b>phx_</b>.</p>
      {atual ? <p className="text-xs text-slate-500">Situação: <b>{atual.ligado ? `ligado (chave …${atual.chave_final ?? ""})` : "desligado"}</b></p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Projeto<input value={projeto} onChange={(e) => setProjeto(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" /></label>
        <label className="text-xs font-semibold text-slate-600">Endereço<input value={host} onChange={(e) => setHost(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" /></label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Chave pessoal (fica guardada cifrada; deixe vazio para manter a atual)<input type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal" /></label>
      {msg ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{msg}</p> : null}
      <div className="flex gap-2"><button type="button" disabled={salvando} onClick={() => void salvar()} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">{salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Salvar</button><button type="button" onClick={fechar} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold">Fechar</button></div>
    </div>
  );
}

export function AdminAnaliseSection() {
  const [aba, setAba] = useState<Aba>("visao");
  const [dias, setDias] = useState<"7" | "30" | "90">("30");
  const [pessoa, setPessoa] = useState<number | null>(null);
  const [janela, setJanela] = useState<ConteudoJanela>(null);
  const investigar = (id: number) => { setJanela(null); setPessoa(id); setAba("investigar"); window.scrollTo({ top: 0 }); };
  const configurarPosthog = () => setJanela({ titulo: "Ligar o PostHog", sub: "Para o funil desde o download e o uso do app", corpo: <AjustesDoPosthog fechar={() => setJanela(null)} /> });
  const comPeriodo = aba === "visao" || aba === "caminhos";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist">
          {ABAS.map(([k, r, I]) => (
            <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition", aba === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
              <I className="h-4 w-4" />{r}
            </button>
          ))}
        </div>
        {comPeriodo ? <div className="ml-auto"><Alternador valor={dias} mudar={setDias} opcoes={[["7", "7 dias"], ["30", "30 dias"], ["90", "90 dias"]]} /></div> : null}
      </div>
      {comPeriodo ? <p className="-mt-2 text-right text-[11px] text-slate-400">Comparado com os {dias} dias anteriores</p> : null}

      {aba === "visao" ? <AbaVisaoGeral dias={Number(dias)} investigar={investigar} irParaPessoas={() => setAba("pessoas")} configurarPosthog={configurarPosthog} /> : null}
      {aba === "caminhos" ? <AbaCaminhos dias={Number(dias)} abrir={setJanela} investigar={investigar} /> : null}
      {aba === "perfis" ? <AbaPerfis abrir={setJanela} investigar={investigar} /> : null}
      {aba === "pessoas" ? <AbaPessoas investigar={investigar} /> : null}
      {aba === "investigar" ? <AbaInvestigar id={pessoa} abrir={setJanela} investigar={investigar} irParaPerfis={() => { setJanela(null); setAba("perfis"); }} /> : null}
      {aba === "kirios" ? <AbaKirios /> : null}
      {aba === "precisao" ? <AbaPrecisao /> : null}

      <Janela conteudo={janela} fechar={() => setJanela(null)} />
    </div>
  );
}
