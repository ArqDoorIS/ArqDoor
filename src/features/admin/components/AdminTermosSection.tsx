import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DocumentoDosTermos } from "@/features/termos/DocumentoDosTermos";
import type { VersaoDosTermos } from "@/features/termos/api";
import { EmptyState, PaginationControls, SectionCard, StatusBadge } from "./AdminPrimitives";
import { Carregando, Erro, Janela, ler, quando, useApi } from "./analise/comum";
import { cn } from "../utils";

/**
 * Aba "Termos de uso" (20/11/2026). Só owner.
 *  - Nova versão: o texto em formato simples (src/lib/termos/formato.ts) com a prévia ao lado.
 *    Publicar cria a versão N+1 e todas as contas precisam aceitá-la no próximo acesso.
 *  - Versões: as publicadas, com quantas contas aceitaram cada uma.
 *  - Acompanhamento: quem aceitou ou ainda não aceitou uma versão.
 * Backend: GET/POST /admin/termos, GET /admin/termos/pessoas, GET /termos/versoes/:versao.
 */
type ItemDaVersao = { versao: number; resumo: string | null; criado_por: string | null; publicada_em: string | null; aceites: number };
type Painel = { atual: VersaoDosTermos | null; versoes: ItemDaVersao[]; total_contas: number; limites: { minimo: number; maximo: number } };
type Pessoa = { user_id: number; nome: string | null; email: string | null; tipo: string | null; aceito_em: string | null; origem: string | null; ultima_versao_aceita: number | null };
type RespostaPessoas = { versao: number; total: number; por_pagina: number; pessoas: Pessoa[] };

const ORIGEM: Record<string, string> = { cadastro: "Cadastro", app: "App", site: "Site", legado: "Cadastro antigo" };
const TIPO: Record<string, string> = { prestador: "Profissional", contratante: "Cliente" };
const numero = (n: number) => n.toLocaleString("pt-BR");
const campo = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-500";

function ComoEscrever() {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <summary className="cursor-pointer select-none font-semibold text-slate-700">Como escrever</summary>
      <ul className="mt-2 space-y-1">
        <li><code className="font-mono text-slate-900"># Título</code> é o título do documento.</li>
        <li><code className="font-mono text-slate-900">## Parte {"{#id}"}</code> abre uma grande divisão (ex.: Termos de Uso, Política de Privacidade).</li>
        <li><code className="font-mono text-slate-900">### 1. Seção {"{#id}"}</code> abre uma seção. O <code className="font-mono">{"{#id}"}</code> é opcional e vira o endereço da seção (#t1).</li>
        <li><code className="font-mono text-slate-900">&gt; linha</code> é uma linha de apoio do topo (empresa, data da atualização).</li>
        <li><code className="font-mono text-slate-900">1.1. texto</code> é uma cláusula. O recuo sai do número: 1.1. / 1.1.1. / 1.1.1.1.</li>
        <li>Texto sem nada na frente vira um parágrafo comum.</li>
        <li><code className="font-mono text-slate-900">---</code> sozinho na linha: daqui para baixo é o rodapé.</li>
        <li><code className="font-mono text-slate-900">**negrito**</code> e <code className="font-mono text-slate-900">[texto](https://endereço)</code> funcionam dentro do texto.</li>
        <li>Linha em branco separa parágrafos. O índice é montado sozinho a partir das partes e seções.</li>
      </ul>
    </details>
  );
}

function NovaVersao({ painel, aoPublicar }: { painel: Painel; aoPublicar: () => void }) {
  const atual = painel.atual;
  const proxima = (atual?.versao ?? 0) + 1;
  const [texto, setTexto] = useState(atual?.conteudo ?? "");
  const [resumo, setResumo] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const previa = useDeferredValue(texto);

  // Chegou outra versão em vigor (publicou agora, ou outra pessoa publicou): recomeça dela.
  useEffect(() => { setTexto(atual?.conteudo ?? ""); }, [atual?.versao, atual?.conteudo]);

  const { minimo, maximo } = painel.limites ?? { minimo: 0, maximo: Infinity };
  const tamanho = texto.trim().length;
  const foraDoLimite = tamanho < minimo || tamanho > maximo;
  const mudou = texto.trim() !== (atual?.conteudo ?? "").trim();
  const podePublicar = mudou && !!resumo.trim() && !foraDoLimite && !publicando;

  const publicar = async () => {
    setPublicando(true);
    setErro(null);
    setFeito(null);
    try {
      const r = await apiRequest("POST", "/admin/termos", { conteudo: texto, resumo: resumo.trim() }).then(ler);
      setResumo("");
      setFeito(`Versão ${r?.versao ?? proxima} publicada. As contas vão ver o aviso no próximo acesso.`);
      aoPublicar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setPublicando(false);
      setConfirmar(false);
    }
  };

  return (
    <SectionCard
      title="Nova versão"
      subtitle={atual ? `Em vigor: versão ${atual.versao}, publicada em ${quando(atual.publicada_em)}` : "Nenhuma versão publicada ainda"}
      dica="Edite o texto e publique. Todas as contas vão precisar aceitar a versão nova no próximo acesso, no site e no app."
    >
      <div className="space-y-3">
        <ComoEscrever />
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">
            Texto dos termos
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              spellCheck={false}
              aria-label="Texto dos termos"
              className={cn(campo, "mt-1 h-[560px] resize-y font-mono text-[13px] leading-6")}
            />
            <span className={cn("mt-1 block font-normal", foraDoLimite ? "text-rose-600" : "text-slate-500")}>
              {numero(tamanho)} de {numero(maximo)} caracteres (mínimo {numero(minimo)})
            </span>
          </label>
          <div className="text-xs font-semibold text-slate-600">
            Prévia
            <div className="mt-1 h-[560px] overflow-y-auto rounded-lg border border-slate-200 bg-white px-4 py-2" data-testid="previa-dos-termos">
              <DocumentoDosTermos conteudo={previa} variante="embutido" prefixo="previa-" className="font-normal" />
            </div>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-600">
          O que mudou nesta versão
          <textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ex.: Nova cláusula sobre o prazo de liberação dos pagamentos por fase."
            className={cn(campo, "mt-1 leading-6")}
          />
          <span className="mt-1 block font-normal text-slate-500">As pessoas leem isto na janela de aceite, antes do texto completo.</span>
        </label>

        {erro ? <Erro msg={erro} /> : null}
        {feito ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feito}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {!mudou ? <span className="text-xs text-slate-500">O texto está igual ao da versão em vigor.</span>
            : !resumo.trim() ? <span className="text-xs text-slate-500">Escreva o que mudou para publicar.</span> : null}
          <button
            type="button"
            disabled={!podePublicar}
            onClick={() => setConfirmar(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publicando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publicar versão {proxima}
          </button>
        </div>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => { if (!publicando) setConfirmar(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar versão {proxima}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as contas vão precisar aceitar a versão {proxima} no próximo acesso. Publicar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publicando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={publicando}
              onClick={(e) => { e.preventDefault(); void publicar(); }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}

function TextoDaVersao({ versao }: { versao: number }) {
  const { dado, erro } = useApi<{ data: VersaoDosTermos }>(`/termos/versoes/${versao}`);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  return (
    <div className="max-h-[68vh] overflow-y-auto rounded-lg border border-slate-200 px-4 py-2">
      <DocumentoDosTermos conteudo={dado.data.conteudo} variante="embutido" prefixo={`v${versao}-`} />
    </div>
  );
}

function Versoes({ painel, aoVer }: { painel: Painel; aoVer: (v: ItemDaVersao) => void }) {
  if (!painel.versoes?.length) return <EmptyState title="Nenhuma versão publicada" description="Publique a primeira versão no editor acima." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2">Versão</th>
            <th className="px-2 py-2">Publicada em</th>
            <th className="px-2 py-2">Por</th>
            <th className="px-2 py-2">O que mudou</th>
            <th className="px-2 py-2">Aceites</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {painel.versoes.map((v) => (
            <tr key={v.versao} className="border-t border-slate-100 align-top">
              <td className="whitespace-nowrap px-2 py-2 font-semibold text-slate-900">
                {v.versao} {v.versao === painel.atual?.versao ? <StatusBadge label="Em vigor" tone="emerald" /> : null}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-slate-600">{quando(v.publicada_em)}</td>
              <td className="px-2 py-2 text-slate-600">{v.criado_por || "—"}</td>
              <td className="max-w-md px-2 py-2 text-slate-700">{v.resumo || "—"}</td>
              <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                {numero(v.aceites)} de {numero(painel.total_contas)} contas
              </td>
              <td className="px-2 py-2 text-right">
                <button type="button" onClick={() => aoVer(v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Eye className="h-3.5 w-3.5" /> Ver texto
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Acompanhamento({ painel }: { painel: Painel }) {
  const [versao, setVersao] = useState<number | null>(painel.atual?.versao ?? null);
  const [situacao, setSituacao] = useState<"aceitou" | "pendente">("aceitou");
  const [digitado, setDigitado] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => { setVersao(painel.atual?.versao ?? null); }, [painel.atual?.versao]);
  useEffect(() => {
    const t = setTimeout(() => setBusca(digitado.trim()), 300);
    return () => clearTimeout(t);
  }, [digitado]);
  useEffect(() => { setPagina(1); }, [versao, situacao, busca]);

  const caminho = useMemo(() => {
    if (!versao) return null;
    const q = new URLSearchParams({ versao: String(versao), situacao, pagina: String(pagina) });
    if (busca) q.set("busca", busca);
    return `/admin/termos/pessoas?${q.toString()}`;
  }, [versao, situacao, busca, pagina]);
  const { dado, erro } = useApi<RespostaPessoas>(caminho);
  const paginas = dado ? Math.max(1, Math.ceil(dado.total / (dado.por_pagina || 1))) : 1;
  const pendente = situacao === "pendente";

  if (!painel.versoes?.length) return <EmptyState title="Sem versão para acompanhar" description="Publique uma versão para ver quem já aceitou." />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">
          Versão{" "}
          <select value={versao ?? ""} onChange={(e) => setVersao(Number(e.target.value))} className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
            {painel.versoes.map((v) => (
              <option key={v.versao} value={v.versao}>{v.versao}{v.versao === painel.atual?.versao ? " (em vigor)" : ""}</option>
            ))}
          </select>
        </label>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm" role="group" aria-label="Situação">
          {([["aceitou", "Aceitaram"], ["pendente", "Ainda não aceitaram"]] as const).map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              aria-pressed={situacao === k}
              onClick={() => setSituacao(k)}
              className={cn("rounded-md px-3 py-1 font-semibold transition-colors", situacao === k ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar por nome ou e-mail" className={cn(campo, "pl-8")} />
        </label>
      </div>

      {erro ? <Erro msg={erro} /> : !dado ? <Carregando /> : (
        <>
          <p className="text-xs text-slate-500">
            {numero(dado.total)} {dado.total === 1 ? "conta" : "contas"} {pendente ? (dado.total === 1 ? "ainda não aceitou" : "ainda não aceitaram") : dado.total === 1 ? "aceitou" : "aceitaram"} a versão {dado.versao ?? versao}
          </p>
          {dado.pessoas.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">E-mail</th>
                    <th className="px-2 py-2">Tipo</th>
                    {pendente ? <th className="px-2 py-2">Última versão aceita</th> : (
                      <>
                        <th className="px-2 py-2">Aceito em</th>
                        <th className="px-2 py-2">Onde</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dado.pessoas.map((p) => (
                    <tr key={p.user_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{p.nome || `Conta ${p.user_id}`}</td>
                      <td className="px-2 py-2 text-slate-600">{p.email || "—"}</td>
                      <td className="px-2 py-2 text-slate-600">{p.tipo ? TIPO[p.tipo] ?? p.tipo : "—"}</td>
                      {pendente ? (
                        <td className="px-2 py-2 text-slate-600">{p.ultima_versao_aceita ? `Versão ${p.ultima_versao_aceita}` : "Nenhuma"}</td>
                      ) : (
                        <>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-600">{quando(p.aceito_em)}</td>
                          <td className="px-2 py-2 text-slate-600">{p.origem ? ORIGEM[p.origem] ?? p.origem : "—"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Ninguém por aqui.</p>
          )}
          {paginas > 1 ? (
            <PaginationControls page={pagina} totalPages={paginas} onPrevious={() => setPagina((p) => Math.max(1, p - 1))} onNext={() => setPagina((p) => Math.min(paginas, p + 1))} />
          ) : null}
        </>
      )}
    </div>
  );
}

export function AdminTermosSection() {
  const { dado: painel, erro, deNovo } = useApi<Painel>("/admin/termos");
  const [vendo, setVendo] = useState<ItemDaVersao | null>(null);

  if (erro && !painel) return <Erro msg={erro} />;
  if (!painel) return <div className="flex justify-center py-10"><Carregando /></div>;

  return (
    <div className="space-y-4">
      <NovaVersao painel={painel} aoPublicar={deNovo} />
      <SectionCard title="Versões" subtitle={`${numero(painel.total_contas)} contas no total`}>
        <Versoes painel={painel} aoVer={setVendo} />
      </SectionCard>
      <SectionCard title="Acompanhamento" dica="Quem já aceitou e quem ainda não aceitou cada versão. Quem não aceitou vê a janela de aceite no próximo acesso.">
        <Acompanhamento painel={painel} />
      </SectionCard>
      <Janela
        conteudo={vendo ? {
          titulo: `Versão ${vendo.versao}`,
          sub: `Publicada em ${quando(vendo.publicada_em)}${vendo.criado_por ? ` por ${vendo.criado_por}` : ""}`,
          corpo: <TextoDaVersao versao={vendo.versao} />,
        } : null}
        fechar={() => setVendo(null)}
      />
    </div>
  );
}

export default AdminTermosSection;
