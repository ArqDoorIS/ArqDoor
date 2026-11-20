import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Download, ExternalLink, FileCode2, History, Loader2, Monitor, Smartphone, Upload } from "lucide-react";
import { StatusBadge } from "../AdminPrimitives";
import { Alternador, Carregando, Erro, Janela, quando, useApi } from "../analise/comum";
import { cn } from "../../utils";
import { CamposDoModelo, classeDoCampo } from "./CamposDoModelo";
import { EnvioDeModelo } from "./EnvioDeModelo";
import { PreviaDoEmail } from "./Previas";
import { Recado } from "./Secoes";
import {
  CAMINHO_MODELOS, NOME_DO_TIPO, arquivoDoModelo, ativarModelo, caminhoDasVersoes, normalizarModelos, normalizarVersoes,
  restaurarVersaoDoModelo, valoresParaEnviar,
  type Modelo, type PedidoDePrevia, type ValoresDosCampos,
} from "./api";

/**
 * Sub-aba "Modelos de e-mail". Dois tipos:
 *  - Do sistema: arquivos no backend (src/services/notifications/modelos-de-email/), só leitura.
 *  - Enviados pelo painel: o admin manda o .mjml ou .html (e o .json, se quiser), com versões,
 *    baixar o arquivo, voltar para uma versão e ativar/desativar. Sem editor de código.
 */

export const PASTA_DOS_MODELOS = "src/services/notifications/modelos-de-email/";
const EXEMPLO = {
  titulo: "Título de exemplo",
  texto: "Este é um texto de exemplo, só para ver como o modelo fica.\nUma notificação de verdade traz o aviso aqui.",
};
const LARGURA = { celular: 375, computador: 640 } as const;
type Tela = keyof typeof LARGURA;
const padraoLegivel = (v: string | boolean | null) => (v == null || v === "" ? "—" : typeof v === "boolean" ? (v ? "Ligado" : "Desligado") : v);

function Ajuda() {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900" data-testid="ajuda-modelos">
      <p>
        Modelos novos entram de dois jeitos: <b>aqui</b>, no botão "Enviar modelo" (um arquivo <code className="font-mono">.mjml</code> ou{" "}
        <code className="font-mono">.html</code> e, se quiser, o <code className="font-mono">.json</code> com os campos), ou no código, na pasta{" "}
        <code className="font-mono">{PASTA_DOS_MODELOS}</code> do backend (aparecem depois do deploy). Os do código não se mudam pelo painel.
      </p>
      <p className="mt-1">
        O <code className="font-mono">.json</code> declara os campos (texto, texto longo, link, cor, imagem, liga/desliga ou lista de opções), e no arquivo do
        e-mail cada campo entra como <code className="font-mono">{"{{chave}}"}</code>. MJML é uma linguagem que vira um e-mail que funciona em qualquer caixa de entrada:{" "}
        <a href="https://documentation.mjml.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
          documentação do MJML<ExternalLink className="h-3 w-3" />
        </a>.
      </p>
    </div>
  );
}

function CartaoDoModelo({ modelo, acoes }: { modelo: Modelo; acoes?: ReactNode }) {
  const [valores, setValores] = useState<ValoresDosCampos>({});
  const [tela, setTela] = useState<Tela>("computador");
  const comErro = modelo.status === "erro";
  const camposEnviados = valoresParaEnviar(valores, modelo);
  const chaveValores = JSON.stringify(camposEnviados);
  const pedido = useMemo<PedidoDePrevia | null>(() => (comErro ? null : {
    modelo: modelo.chave, email_campos: JSON.parse(chaveValores), titulo: EXEMPLO.titulo, texto: EXEMPLO.texto, href: "/",
  }), [comErro, modelo.chave, chaveValores]);

  return (
    <article className="rounded-2xl border border-slate-200 p-3" data-testid="modelo-de-email">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-slate-900">{modelo.rotulo}</h4>
        {modelo.formato ? (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{modelo.formato}</span>
        ) : null}
        {modelo.arquivo ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500"><FileCode2 className="h-3.5 w-3.5" />{modelo.arquivo}</span>
        ) : null}
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", modelo.origem === "painel" ? "bg-orange-50 text-orange-800 ring-orange-200" : "bg-slate-100 text-slate-600 ring-slate-200")} data-testid="origem">
          {modelo.origem === "painel" ? "Enviado pelo painel" : "Do sistema"}
        </span>
        {modelo.origem === "painel" && modelo.versao ? <span className="text-[11px] text-slate-500">versão {modelo.versao}</span> : null}
        {modelo.ativo === false ? <StatusBadge label="Desativado" tone="slate" /> : null}
        <span className="ml-auto font-mono text-[11px] text-slate-400">{modelo.chave}</span>
      </header>
      {acoes ? <div className="mb-3 flex flex-wrap items-center gap-1.5">{acoes}</div> : null}
      {modelo.descricao ? <p className="mb-3 text-sm text-slate-600">{modelo.descricao}</p> : null}
      {modelo.variaveis_do_molde?.length ? (
        <p className="mb-3 text-xs text-slate-500" data-testid="variaveis-do-molde">
          O arquivo usa do evento: {modelo.variaveis_do_molde.map((k) => <code key={k} className="mr-1 font-mono text-slate-800">{`{{${k}}}`}</code>)}
          — só aparece para escolher nos envios que têm essas variáveis.
        </p>
      ) : null}
      {comErro ? (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>Este modelo não carregou.</b> {modelo.erro || "O servidor não disse o motivo."} Corrija o arquivo no backend; enquanto isso ele não aparece para escolher.</span>
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,660px)]">
        <div className="space-y-3">
          {modelo.campos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="campos-declarados">
                <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="py-1 pr-2">Campo</th><th className="py-1 pr-2">Tipo</th><th className="py-1 pr-2">Obrigatório</th><th className="py-1 pr-2">Padrão</th><th className="py-1">Variáveis</th></tr>
                </thead>
                <tbody>
                  {modelo.campos.map((c) => (
                    <tr key={c.chave} className="border-t border-slate-100 align-top">
                      <td className="py-1 pr-2 text-slate-800">{c.rotulo}<span className="block font-mono text-[10px] text-slate-400">{`{{${c.chave}}}`}</span></td>
                      <td className="py-1 pr-2 text-slate-600">{NOME_DO_TIPO[c.tipo] ?? c.tipo}</td>
                      <td className="py-1 pr-2 text-slate-600">{c.obrigatorio ? "Sim" : "Não"}</td>
                      <td className="max-w-[160px] truncate py-1 pr-2 text-slate-600" title={String(padraoLegivel(c.padrao))}>
                        {c.tipo === "cor" && typeof c.padrao === "string" ? <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle ring-1 ring-slate-200" style={{ background: c.padrao }} /> : null}
                        {padraoLegivel(c.padrao)}
                      </td>
                      <td className="py-1 text-slate-600">{c.aceita_variaveis ? "Aceita" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-slate-400">Sem campos para preencher.</p>}
          {!comErro && modelo.campos.length ? (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Valores de teste</p>
              <CamposDoModelo modelo={modelo} valores={valores} mudar={setValores} reservas={EXEMPLO} />
            </div>
          ) : null}
        </div>
        {!comErro ? (
          <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Prévia</p>
              <span className="ml-auto">
                <Alternador valor={tela} mudar={setTela} opcoes={[["celular", "Celular", Smartphone], ["computador", "Computador", Monitor]]} />
              </span>
            </div>
            <PreviaDoEmail pedido={pedido} altura={520} largura={LARGURA[tela]} comTexto />
          </div>
        ) : null}
      </div>
    </article>
  );
}

const BOTAO = "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300 disabled:opacity-40";

/** Baixa o texto como arquivo. */
function salvarComo(nome: string, conteudo: string) {
  if (typeof URL.createObjectURL !== "function") return;
  const url = URL.createObjectURL(new Blob([conteudo], { type: /\.mjml$/i.test(nome) ? "text/plain" : "text/html" }));
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function VersoesDoModelo({ modelo, aoMudar }: { modelo: Modelo; aoMudar: () => void }) {
  const { dado, erro, deNovo } = useApi<unknown>(caminhoDasVersoes(modelo.chave));
  const versoes = useMemo(() => (dado ? normalizarVersoes(dado) : null), [dado]);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; ruim?: boolean } | null>(null);
  const voltar = async (versao: number) => {
    if (!window.confirm(`Voltar "${modelo.rotulo}" para a versão ${versao}? Os envios que usam o modelo passam a mandar essa versão. Isso vira uma versão nova; nada se perde.`)) return;
    setOcupado(versao); setAviso(null);
    try {
      await restaurarVersaoDoModelo(modelo.chave, versao, motivo.trim());
      setAviso({ texto: `Voltou para a versão ${versao}.` }); setMotivo("");
      deNovo(); aoMudar();
    } catch (e) { setAviso({ texto: (e as Error).message, ruim: true }); } finally { setOcupado(null); }
  };
  if (erro) return <Erro msg={erro} />;
  if (!versoes) return <Carregando />;
  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-600">Motivo para voltar (opcional)
        <input aria-label="Motivo para voltar" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: a versão nova quebrou no Outlook" className={classeDoCampo} />
      </label>
      {aviso ? <Recado {...aviso} /> : null}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
        {versoes.map((v) => {
          const atual = v.atual ?? v.versao === modelo.versao;
          return (
            <li key={v.versao} className="flex flex-wrap items-center gap-2 px-3 py-2" data-testid="versao-do-modelo">
              <b className="text-slate-900">Versão {v.versao}</b>
              {atual ? <StatusBadge label="Valendo" tone="emerald" /> : null}
              <span className="min-w-0 flex-1 text-xs text-slate-600">{v.motivo || "Sem motivo"}<span className="block text-slate-400">{[v.nome_arquivo, v.criado_por, quando(v.created_at)].filter(Boolean).join(" · ")}</span></span>
              {!atual ? (
                <button type="button" className={BOTAO} disabled={ocupado != null} onClick={() => void voltar(v.versao)}>
                  {ocupado === v.versao ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Voltar para esta
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AcoesDoEnviado({ modelo, novaVersao, verVersoes, aoMudar }: { modelo: Modelo; novaVersao: () => void; verVersoes: () => void; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState<"baixar" | "ativo" | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const baixar = async () => {
    setOcupado("baixar"); setFalha(null);
    try { const a = await arquivoDoModelo(modelo.chave); salvarComo(a.nome_arquivo, a.conteudo); } catch (e) { setFalha((e as Error).message); } finally { setOcupado(null); }
  };
  const alternar = async () => {
    const ativar = modelo.ativo === false;
    if (!ativar && !window.confirm(`Desativar "${modelo.rotulo}"? Ele some das escolhas nos eventos, comunicados e personalizadas.`)) return;
    setOcupado("ativo"); setFalha(null);
    try { await ativarModelo(modelo.chave, ativar); aoMudar(); } catch (e) { setFalha((e as Error).message); } finally { setOcupado(null); }
  };
  return (
    <>
      <button type="button" className={BOTAO} onClick={novaVersao}><Upload className="h-3 w-3" />Enviar nova versão</button>
      <button type="button" className={BOTAO} disabled={ocupado === "baixar"} onClick={() => void baixar()}><Download className="h-3 w-3" />Baixar arquivo</button>
      <button type="button" className={BOTAO} onClick={verVersoes}><History className="h-3 w-3" />Versões</button>
      <button type="button" className={cn(BOTAO, modelo.ativo !== false && "hover:ring-rose-300")} disabled={ocupado === "ativo"} onClick={() => void alternar()}>
        {ocupado === "ativo" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}{modelo.ativo === false ? "Ativar" : "Desativar"}
      </button>
      {falha ? <p role="alert" className="w-full rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700" data-testid="recusa-do-modelo">{falha}</p> : null}
    </>
  );
}

/**
 * `reserva` são os modelos que já vieram em GET /admin/notificacoes, caso a rota própria falhe.
 * `aoMudar` avisa a aba para recarregar (os modelos aparecem nas escolhas dos envios).
 */
export function ModelosDeEmail({ reserva, aoMudar }: { reserva: Modelo[]; aoMudar?: () => void }) {
  const { dado, erro, deNovo } = useApi<unknown>(CAMINHO_MODELOS);
  const modelos = useMemo(() => (dado ? normalizarModelos(dado) : erro ? reserva : null), [dado, erro, reserva]);
  const [envio, setEnvio] = useState<Modelo | "novo" | null>(null);
  const [vendo, setVendo] = useState<Modelo | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const mudou = () => { deNovo(); aoMudar?.(); };
  useEffect(() => { if (envio) setRecado(null); }, [envio]);

  if (envio) {
    return (
      <EnvioDeModelo
        key={envio === "novo" ? "novo" : envio.chave} base={envio === "novo" ? null : envio}
        existentes={[...(modelos ?? reserva).map((m) => m.chave), "nenhum"]}
        aoSalvar={(msg) => { setEnvio(null); setRecado(msg); mudou(); }} cancelar={() => setEnvio(null)}
      />
    );
  }

  const doSistema = (modelos ?? []).filter((m) => m.origem !== "painel");
  const doPainel = (modelos ?? []).filter((m) => m.origem === "painel");
  return (
    <div className="space-y-4">
      <Ajuda />
      {recado ? <Recado texto={recado} /> : null}
      <div className="flex justify-end">
        <button type="button" onClick={() => setEnvio("novo")} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
          <Upload className="h-4 w-4" />Enviar modelo
        </button>
      </div>
      {!modelos ? <Carregando /> : (
        <>
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Enviados pelo painel</h4>
            {doPainel.length ? doPainel.map((m) => (
              <CartaoDoModelo key={m.chave} modelo={m}
                acoes={<AcoesDoEnviado modelo={m} novaVersao={() => setEnvio(m)} verVersoes={() => setVendo(m)} aoMudar={mudou} />} />
            )) : <p className="text-sm text-slate-400">Nenhum ainda. Use "Enviar modelo".</p>}
          </section>
          <section className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Do sistema</h4>
            {doSistema.length ? doSistema.map((m) => <CartaoDoModelo key={m.chave} modelo={m} />) : <p className="text-sm text-slate-400">Nenhum modelo de e-mail.</p>}
          </section>
        </>
      )}
      <Janela
        conteudo={vendo ? { titulo: `Versões: ${vendo.rotulo}`, sub: "Voltar para uma versão cria uma versão nova igual a ela.", corpo: <VersoesDoModelo modelo={vendo} aoMudar={mudou} /> } : null}
        fechar={() => setVendo(null)}
      />
    </div>
  );
}
