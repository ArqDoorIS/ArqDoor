import { useEffect, useState } from "react";
import { Hammer, Loader2, Search, User, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard } from "./AdminPrimitives";
import { cn } from "../utils";
import { Carregando, Erro, ler, quando, useApi } from "./analise/comum";

/**
 * Punições de conta (20/11/2026), para profissionais e clientes. Só owner.
 *
 *   GET    /admin/punicoes                       as que estão valendo agora
 *   GET    /admin/users/:userId/punicoes         histórico da pessoa (inclui revogadas)
 *   POST   /admin/users/:userId/punicoes         { nivel, motivo, nota_interna, valido_ate }
 *   DELETE /admin/users/:userId/punicoes/:id     revoga (não apaga)
 *
 * A busca de pessoa usa a mesma lista da aba Análise (/admin/analise/pessoas?busca=).
 */
export type Nivel = "aviso" | "fora_do_algoritmo" | "congelada" | "banida";
type PapelDaPessoa = "cliente" | "profissional";
export type PessoaEscolhida = { id: number; nome: string | null; papel: PapelDaPessoa | null };

type Punicao = {
  id: number; user_id: number; nivel: Nivel; motivo: string; nota_interna: string | null; valido_ate: string | null;
  criado_por: string | null; created_at: string | null; visto_em: string | null;
  revogada_em?: string | null; revogada_por?: string | null;
  pessoa?: { id: number; name: string | null; email: string | null; type: "prestador" | "contratante" | string } | null;
};
type Achado = { id: number; nome: string | null; papel: PapelDaPessoa; cidade: string | null; uf: string | null; profissao: string | null };

export const NIVEIS: { nivel: Nivel; nome: string; descricao: string; soProfissional?: boolean; cor: string }[] = [
  { nivel: "aviso", nome: "Aviso", cor: "bg-sky-50 text-sky-700 ring-sky-200",
    descricao: "Só um aviso. A pessoa vê um aviso no app com o motivo abaixo até dar ciência." },
  { nivel: "fora_do_algoritmo", nome: "Fora do algoritmo", soProfissional: true, cor: "bg-amber-50 text-amber-800 ring-amber-200",
    descricao: "Deixa de ser sugerido pelo algoritmo. Continua fechando por convite e com quem já conhece." },
  { nivel: "congelada", nome: "Conta congelada", cor: "bg-orange-50 text-orange-800 ring-orange-200",
    descricao: "Conta congelada. Usa o app, mas não envia convites, propostas nem pedidos e não começa contratos novos. Só conversa com quem tem contrato em andamento, para terminar. Depois disso não fala com mais ninguém." },
  { nivel: "banida", nome: "Banida", cor: "bg-rose-50 text-rose-700 ring-rose-200",
    descricao: "Banimento total. Não entra mais na conta, não manda mensagem e não recebe nada. Use só em caso grave." },
];
const DO_NIVEL = Object.fromEntries(NIVEIS.map((n) => [n.nivel, n])) as Record<Nivel, (typeof NIVEIS)[number]>;

const diaBr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const papelDoTipo = (t?: string | null): PapelDaPessoa | null => (t === "prestador" ? "profissional" : t === "contratante" ? "cliente" : null);
const venceu = (iso?: string | null) => !!iso && new Date(iso).getTime() < Date.now();
const entrada = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-400";

function SeloDoNivel({ nivel }: { nivel: Nivel }) {
  const n = DO_NIVEL[nivel];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", n?.cor ?? "bg-slate-100 text-slate-600 ring-slate-200")}>{n?.nome ?? nivel}</span>;
}

function PapelIcone({ papel }: { papel: PapelDaPessoa | null }) {
  if (!papel) return null;
  const I = papel === "profissional" ? Hammer : User;
  return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><I className="h-3.5 w-3.5" />{papel === "profissional" ? "Profissional" : "Cliente"}</span>;
}

/** Revoga depois de confirmar. true se deu certo. */
async function revogarPunicao(p: Punicao, nome: string | null) {
  if (!window.confirm(`Revogar "${DO_NIVEL[p.nivel]?.nome ?? p.nivel}" de ${nome || `#${p.user_id}`}? Fica no histórico como revogada.`)) return false;
  await apiRequest("DELETE", `/admin/users/${p.user_id}/punicoes/${p.id}`).then(ler);
  return true;
}

function EmVigor({ vez, aoMudar, abrir }: { vez: number; aoMudar: () => void; abrir: (p: PessoaEscolhida) => void }) {
  const { dado, erro, deNovo } = useApi<{ punicoes: Punicao[] }>("/admin/punicoes");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  useEffect(() => { if (vez) deNovo(); }, [vez, deNovo]);

  const revogar = async (p: Punicao) => {
    setOcupado(p.id); setFalha(null);
    try { if (await revogarPunicao(p, p.pessoa?.name ?? null)) aoMudar(); }
    catch (e: any) { setFalha(e.message); } finally { setOcupado(null); }
  };
  const lista = dado?.punicoes ?? [];

  return (
    <SectionCard title="Em vigor" subtitle="As punições valendo agora, a mais nova primeiro."
      dica="Revogar tira o efeito na hora. Nada é apagado: fica no histórico da pessoa.">
      {falha ? <div className="mb-2"><Erro msg={falha} /></div> : null}
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !lista.length ? <p className="text-sm text-slate-400">Nenhuma punição em vigor.</p> : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm" data-testid="punicoes-em-vigor">
          {lista.map((p) => {
            const nome = p.pessoa?.name || `#${p.user_id}`;
            const papel = papelDoTipo(p.pessoa?.type);
            return (
              <li key={p.id} className="flex flex-wrap items-start gap-2 px-3 py-2" data-testid="punicao-em-vigor">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => abrir({ id: p.user_id, nome: p.pessoa?.name ?? null, papel })} className="font-semibold text-slate-900 hover:text-orange-700 hover:underline">{nome}</button>
                    <PapelIcone papel={papel} />
                    <SeloDoNivel nivel={p.nivel} />
                  </span>
                  <span className="mt-0.5 block text-slate-700">{p.motivo}</span>
                  {p.nota_interna ? <span className="block text-xs text-slate-500">Nota interna: {p.nota_interna}</span> : null}
                  <span className="block text-xs text-slate-400">
                    {quando(p.created_at)} · {p.criado_por ?? "—"} · {p.valido_ate ? `até ${diaBr(p.valido_ate)}` : "sem prazo"}
                    {p.nivel === "aviso" ? (p.visto_em ? ` · viu em ${quando(p.visto_em)}` : " · ainda não viu") : ""}
                  </span>
                </span>
                <button type="button" disabled={ocupado === p.id} onClick={() => void revogar(p)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-rose-300">
                  {ocupado === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revogar"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function BuscaDePessoa({ escolher }: { escolher: (p: PessoaEscolhida) => void }) {
  const [busca, setBusca] = useState("");
  const [feita, setFeita] = useState("");
  useEffect(() => { const t = setTimeout(() => setFeita(busca.trim().replace(/^#/, "")), 350); return () => clearTimeout(t); }, [busca]);
  const { dado, erro } = useApi<{ pessoas: Achado[] }>(feita ? `/admin/analise/pessoas?pagina=1&busca=${encodeURIComponent(feita)}` : null);
  const achados = feita ? (dado?.pessoas ?? []).slice(0, 8) : [];
  return (
    <div>
      <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome ou pelo código da conta" aria-label="Buscar pessoa" className="w-full outline-none" />
      </label>
      {feita ? (
        erro ? <div className="mt-2"><Erro msg={erro} /></div> : !dado ? <div className="mt-2"><Carregando /></div> : !achados.length ? <p className="mt-2 text-sm text-slate-400">Ninguém encontrado.</p> : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {achados.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => escolher({ id: a.id, nome: a.nome, papel: a.papel })} data-testid="pessoa-achada" className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <b className="text-slate-900">{a.nome || `#${a.id}`}</b>
                  <PapelIcone papel={a.papel} />
                  <span className="text-xs text-slate-400">{[a.profissao, a.cidade && `${a.cidade}${a.uf ? `/${a.uf}` : ""}`, `#${a.id}`].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function HistoricoDaPessoa({ pessoa, vez, aoMudar }: { pessoa: PessoaEscolhida; vez: number; aoMudar: () => void }) {
  const { dado, erro, deNovo } = useApi<{ punicoes: Punicao[] }>(`/admin/users/${pessoa.id}/punicoes`);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  useEffect(() => { if (vez) deNovo(); }, [vez, deNovo]);
  const revogar = async (p: Punicao) => {
    setOcupado(p.id); setFalha(null);
    try { if (await revogarPunicao(p, pessoa.nome)) aoMudar(); }
    catch (e: any) { setFalha(e.message); } finally { setOcupado(null); }
  };
  const lista = dado?.punicoes ?? [];
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Histórico desta pessoa</p>
      {falha ? <div className="mb-2"><Erro msg={falha} /></div> : null}
      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : !lista.length ? <p className="text-sm text-slate-400">Nenhuma punição até hoje.</p> : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
          {lista.map((p) => {
            const fora = !!p.revogada_em || venceu(p.valido_ate);
            return (
              <li key={p.id} className={cn("flex flex-wrap items-start gap-2 px-3 py-2", fora && "opacity-50")} data-testid="punicao-do-historico">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><SeloDoNivel nivel={p.nivel} /><span className="text-slate-700">{p.motivo}</span></span>
                  {p.nota_interna ? <span className="block text-xs text-slate-500">Nota interna: {p.nota_interna}</span> : null}
                  <span className="block text-xs text-slate-400">
                    {quando(p.created_at)} · {p.criado_por ?? "—"} · {p.valido_ate ? `até ${diaBr(p.valido_ate)}` : "sem prazo"}
                    {p.revogada_em ? ` · revogada em ${quando(p.revogada_em)} por ${p.revogada_por ?? "—"}` : venceu(p.valido_ate) ? " · venceu" : " · em vigor"}
                  </span>
                </span>
                {!fora ? (
                  <button type="button" disabled={ocupado === p.id} onClick={() => void revogar(p)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-rose-300">
                    {ocupado === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revogar"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AplicarPunicao({ pessoa, aoAplicar }: { pessoa: PessoaEscolhida; aoAplicar: () => void }) {
  const [nivel, setNivel] = useState<Nivel>("aviso");
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);

  const cliente = pessoa.papel === "cliente";
  useEffect(() => { if (cliente && nivel === "fora_do_algoritmo") setNivel("aviso"); }, [cliente, nivel]);

  const pronto = motivo.trim().length >= 5 && !salvando;
  const nome = pessoa.nome || `#${pessoa.id}`;
  const aplicar = async () => {
    if (nivel === "banida" && !window.confirm(`Banir ${nome}? A pessoa não entra mais na conta, não manda mensagem e não recebe nada. Dá para revogar depois aqui mesmo.`)) return;
    if (nivel === "congelada" && !window.confirm(`Congelar a conta de ${nome}? A pessoa continua entrando no app, mas não envia convites, propostas nem pedidos e não começa contratos novos. Só conversa com quem tem contrato em andamento, para terminar. Dá para revogar depois aqui mesmo.`)) return;
    setSalvando(true); setAviso(null);
    try {
      await apiRequest("POST", `/admin/users/${pessoa.id}/punicoes`, {
        nivel, motivo: motivo.trim(), nota_interna: nota.trim(), valido_ate: nivel === "banida" ? "" : validoAte,
      }).then(ler);
      setAviso({ texto: `${DO_NIVEL[nivel].nome} aplicado a ${nome}.` });
      setMotivo(""); setNota(""); setValidoAte("");
      aoAplicar();
    } catch (e: any) { setAviso({ texto: e.message, ruim: true }); } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-3" data-testid="aplicar-punicao">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Nível</legend>
        {NIVEIS.map((n) => {
          const bloqueado = n.soProfissional && cliente;
          return (
            <label key={n.nivel} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2", nivel === n.nivel ? (n.nivel === "banida" ? "border-rose-400 bg-rose-50/50" : "border-orange-400 bg-orange-50/50") : "border-slate-200", bloqueado && "cursor-not-allowed opacity-40")}>
              <input type="radio" name="nivel-da-punicao" value={n.nivel} checked={nivel === n.nivel} disabled={bloqueado} onChange={() => setNivel(n.nivel)} className="mt-1" aria-label={n.nome} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{n.nome}{n.soProfissional ? <span className="ml-1 text-[11px] font-normal text-slate-400">só profissionais</span> : null}</span>
                <span className="block text-xs text-slate-500">{n.descricao}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">Motivo
          <textarea aria-label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="A pessoa vai ler isto" className={entrada} />
          <span className="block text-[11px] font-normal text-slate-400">A pessoa vai ler isto. Pelo menos 5 letras.</span>
        </label>
        <label className="block text-xs font-semibold text-slate-700">Nota interna (opcional)
          <textarea aria-label="Nota interna" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Só o painel vê" className={entrada} />
          <span className="block text-[11px] font-normal text-slate-400">Só o painel vê.</span>
        </label>
        {nivel !== "banida" ? (
          <label className="block text-xs font-semibold text-slate-700">Válido até (opcional)
            <input aria-label="Válido até" type="date" min={hoje()} value={validoAte} onChange={(e) => setValidoAte(e.target.value)} className={entrada} />
            <span className="block text-[11px] font-normal text-slate-400">Vazio = até alguém revogar.</span>
          </label>
        ) : (
          <p className="self-center text-xs text-slate-500">Banimento não tem prazo: vale até alguém revogar.</p>
        )}
      </div>
      {aviso ? <p role="status" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", aviso.ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{aviso.texto}</p> : null}
      <div className="flex justify-end">
        <button type="button" disabled={!pronto} onClick={() => void aplicar()}
          className={cn("inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40", nivel === "banida" ? "bg-rose-600" : "bg-orange-600")}>
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{nivel === "banida" ? "Banir conta" : "Aplicar punição"}
        </button>
      </div>
    </div>
  );
}

/**
 * `pessoaInicial` vem do botão "Punições" da aba Usuários. Depois de usada, a aba avisa por
 * `aoUsarPessoaInicial`, para quem a guardou limpar: voltar pela barra lateral abre a aba vazia.
 */
export function AdminPunicoesSection({ pessoaInicial, aoUsarPessoaInicial }: { pessoaInicial?: PessoaEscolhida | null; aoUsarPessoaInicial?: () => void }) {
  const [pessoa, setPessoa] = useState<PessoaEscolhida | null>(pessoaInicial ?? null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!pessoaInicial) return;
    setPessoa(pessoaInicial);
    aoUsarPessoaInicial?.();
  }, [pessoaInicial, aoUsarPessoaInicial]);
  const mudou = () => setVez((v) => v + 1);

  return (
    <div className="mt-2 space-y-4">
      <EmVigor vez={vez} aoMudar={mudou} abrir={setPessoa} />
      <SectionCard title="Aplicar punição" subtitle="Para profissionais e clientes."
        dica="Escolha a pessoa, o nível e escreva o motivo. A pessoa lê o motivo no app; a nota interna fica só aqui.">
        <div className="space-y-4">
          {pessoa ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2" data-testid="pessoa-escolhida">
              <b className="text-sm text-slate-900">{pessoa.nome || `#${pessoa.id}`}</b>
              <PapelIcone papel={pessoa.papel} />
              <span className="text-xs text-slate-400">#{pessoa.id}</span>
              <button type="button" onClick={() => setPessoa(null)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200"><X className="h-3 w-3" />Trocar pessoa</button>
            </div>
          ) : <BuscaDePessoa escolher={setPessoa} />}
          {pessoa ? (
            <>
              <AplicarPunicao key={pessoa.id} pessoa={pessoa} aoAplicar={mudou} />
              <HistoricoDaPessoa key={`h-${pessoa.id}`} pessoa={pessoa} vez={vez} aoMudar={mudou} />
            </>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
