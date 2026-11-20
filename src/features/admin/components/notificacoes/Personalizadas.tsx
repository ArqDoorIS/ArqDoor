import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, History, Loader2, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "../AdminPrimitives";
import { Carregando, Erro, Janela, quando, useApi } from "../analise/comum";
import { cn } from "../../utils";
import { Interruptor, classeDoCampo } from "./CamposDoModelo";
import { AvisoDeVariaveis, EnviarTeste, Recado, SecaoEmail, SecaoNotificacao, variaveisComProblema, type Aviso, type EstadoDoEmail } from "./Secoes";
import {
  CAMINHO_CONFIG, CAMINHO_GATILHOS, CAMINHO_PERSONALIZADAS, ligarPersonalizadas, personalizadasLigadas, MINUTOS_DA_UNIDADE, NOME_DO_PAPEL,
  atrasoEmTexto, atrasoParaCampos, camposFaltando, caminhoDoHistorico, modeloOuVazio, comExemplos, criarPersonalizada,
  excluirPersonalizada, faltaNoMolde, modelosCompativeis, normalizarGatilhos, normalizarHistorico, normalizarPersonalizadas,
  pausarPersonalizada, retomarPersonalizada, salvarPersonalizada, testarPersonalizada, valoresParaEnviar,
  type Canais, type CorpoDaPersonalizada, type Gatilhos, type Modelo, type Papel, type Personalizada, type UnidadeDoAtraso, type Variavel,
} from "./api";

/**
 * Sub-aba "Personalizadas" (20/11/2026): notificações a mais que o painel cria. Cada uma dispara
 * a partir de um evento de uma lista fechada (feita em código), com atraso, condição opcional,
 * para quem vai, textos da notificação e do e-mail e um limite por pessoa por dia.
 * As notificações de sempre (Eventos automáticos) continuam presas aos seus eventos.
 */

const rotuloCampo = "block text-xs font-semibold text-slate-600";
const NOME_VAR: Variavel = { chave: "nome", descricao: "Primeiro nome de quem recebe", exemplo: "Ana" };
/** Mesmo intervalo do backend (personalizadas.js): 1 a 10 por pessoa por dia. */
const LIMITE_MAXIMO = 10;
const minuscula = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const contar = (n: number | null, um: string, varios: string) => (n == null ? "—" : `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`);

type Rascunho = Pick<CorpoDaPersonalizada, "evento" | "atraso_minutos" | "condicao" | "para" | "titulo">;

/** "2 dias depois de **Proposta enviada**, se **a proposta ainda não foi assinada**, mandar para o **cliente**: “...”" */
export function FraseDaRegra({ r, gatilhos, emLinha }: { r: Rascunho; gatilhos: Gatilhos; emLinha?: boolean }) {
  const Tag = emLinha ? "span" : "p";
  const evento = gatilhos.eventos.find((e) => e.tipo === r.evento);
  const condicao = r.condicao ? gatilhos.condicoes.find((c) => c.chave === r.condicao) : null;
  const para: ReactNode = !r.para.length ? <b>ninguém</b> : r.para.map((p, i) => (
    <span key={p}>{i ? " e " : ""}o <b>{NOME_DO_PAPEL[p]}</b></span>
  ));
  return (
    <Tag className="text-sm leading-relaxed text-slate-700" data-testid="frase">
      {atrasoEmTexto(r.atraso_minutos)} <b>{evento?.rotulo ?? (r.evento || "um evento")}</b>
      {r.condicao ? <>, se <b>{minuscula(condicao?.rotulo ?? r.condicao)}</b></> : null}
      , mandar para {para}: “{r.titulo || "sem título"}”
    </Tag>
  );
}

function CanaisEmChips({ canais }: { canais: Canais }) {
  const ligados = [canais.sino && "Sino", canais.push && "Push", canais.email && "E-mail"].filter(Boolean) as string[];
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ligados.length ? ligados.map((c) => <span key={c} className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-800 ring-1 ring-orange-200">{c}</span>)
        : <span className="text-[11px] text-slate-400">sem canal</span>}
    </span>
  );
}

/* ---------- formulário ---------- */
function EditorDePersonalizada({ inicial, gatilhos, modelos, aoSalvar, cancelar }: {
  inicial: Personalizada | null; gatilhos: Gatilhos; modelos: Modelo[]; aoSalvar: () => void; cancelar: () => void;
}) {
  const atraso = atrasoParaCampos(inicial?.atraso_minutos ?? 0);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [evento, setEvento] = useState(inicial?.evento ?? "");
  const [unidade, setUnidade] = useState<UnidadeDoAtraso>(atraso.unidade);
  const [quantidade, setQuantidade] = useState(atraso.quantidade ? String(atraso.quantidade) : "1");
  const [condicao, setCondicao] = useState(inicial?.condicao ?? "");
  const [para, setPara] = useState<Papel[]>(inicial?.para ?? []);
  const [canais, setCanais] = useState<Canais>(inicial?.canais ?? { sino: true, push: true, email: false });
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [email, setEmail] = useState<EstadoDoEmail>(() => ({
    modelo: inicial?.email_modelo ?? modelosCompativeis(modelos, gatilhos.eventos.find((e) => e.tipo === inicial?.evento)?.variaveis.map((v) => v.chave) ?? ["nome"])[0]?.chave ?? "",
    campos: { ...(inicial?.email_campos ?? {}) },
  }));
  const [limite, setLimite] = useState(String(inicial?.limite_por_pessoa_dia ?? 1));
  const [mostrarErros, setMostrarErros] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const gatilho = gatilhos.eventos.find((e) => e.tipo === evento);
  const grupos = useMemo(() => Array.from(new Set(gatilhos.eventos.map((e) => e.grupo))), [gatilhos.eventos]);
  const condicoes = gatilhos.condicoes.filter((c) => !c.eventos.length || c.eventos.includes(evento));
  const papeis = gatilho?.papeis ?? [];
  const variaveis = useMemo(() => (gatilho ? [...gatilho.variaveis.filter((v) => v.chave !== "nome"), NOME_VAR] : [NOME_VAR]), [gatilho]);
  const chavesDoEvento = variaveis.map((v) => v.chave);
  const escolhiveis = modelosCompativeis(modelos, chavesDoEvento);

  // Trocou o evento: a condição e o "para quem" só ficam se ainda valem.
  useEffect(() => {
    if (!gatilho) return;
    setCondicao((c) => (c && !gatilhos.condicoes.some((x) => x.chave === c && (!x.eventos.length || x.eventos.includes(gatilho.tipo))) ? "" : c));
    setPara((p) => {
      const ok = p.filter((x) => gatilho.papeis.includes(x));
      return ok.length ? ok : gatilho.papeis.length === 1 ? [...gatilho.papeis] : ok;
    });
  }, [gatilho, gatilhos.condicoes]);

  const minutos = unidade === "na_hora" ? 0 : Math.round(Number(quantidade) * MINUTOS_DA_UNIDADE[unidade]);
  const quantidadeOk = unidade === "na_hora" || (Number.isInteger(Number(quantidade)) && Number(quantidade) >= 1);
  const limiteNum = Number(limite);
  const limiteOk = Number.isInteger(limiteNum) && limiteNum >= 1 && limiteNum <= LIMITE_MAXIMO;
  const notificacaoLigada = canais.sino || canais.push;
  const modeloEf = modeloOuVazio(modelos.find((m) => m.chave === email.modelo));
  const camposEmail = valoresParaEnviar(email.campos, modeloEf);
  const notificacao = { titulo: titulo.trim(), texto: texto.trim() };
  const tituloDoEmail = String(camposEmail.titulo || camposEmail.assunto || "") || notificacao.titulo;
  const textoDoEmail = String(camposEmail.texto ?? "") || notificacao.texto;
  const faltamCampos = canais.email ? camposFaltando(email.campos, modeloEf, notificacao) : [];
  const doMolde = canais.email && email.modelo ? faltaNoMolde(modeloEf, chavesDoEvento) : [];
  const problemas = [
    ...variaveisComProblema({ titulo, texto, email, modelos, daNotificacao: chavesDoEvento }),
    ...(doMolde.length ? [`O modelo "${modeloEf.rotulo}" usa ${doMolde.map((k) => `{{${k}}}`).join(", ")}, que este evento não tem. Escolha outro modelo.`] : []),
  ];
  const semCanal = !notificacaoLigada && !canais.email;

  const falta = !evento ? "Escolha o evento que dispara."
    : !quantidadeOk ? "Diga quanto tempo depois (um número inteiro, 1 ou mais)."
    : !para.length ? "Escolha para quem vai."
    : semCanal ? "Ligue pelo menos um canal: a notificação (sino ou push) ou o e-mail."
    : notificacaoLigada && !notificacao.titulo ? "Escreva o título da notificação."
    : notificacaoLigada && !notificacao.texto ? "Escreva o texto da notificação."
    : canais.email && !email.modelo && escolhiveis.length ? "Escolha o modelo de e-mail."
    : canais.email && !tituloDoEmail ? "Escreva o título da notificação ou o título/assunto do e-mail."
    : canais.email && !textoDoEmail ? "Escreva o texto da notificação ou o texto do e-mail."
    : faltamCampos.length ? `Preencha no e-mail: ${faltamCampos.map((c) => c.rotulo).join(", ")}.`
    : !limiteOk ? `O limite por pessoa por dia vai de 1 a ${LIMITE_MAXIMO}.` : null;
  const pronto = !falta && !problemas.length && !salvando;

  const corpo: CorpoDaPersonalizada = {
    nome: nome.trim() || notificacao.titulo || tituloDoEmail, ativo: inicial?.ativo ?? true, evento, atraso_minutos: minutos,
    condicao: condicao || null, para,
    titulo: notificacaoLigada ? notificacao.titulo : tituloDoEmail, texto: notificacaoLigada ? notificacao.texto : textoDoEmail,
    href: inicial?.href ?? null,
    canais, email_modelo: canais.email ? email.modelo || null : null,
    email_campos: canais.email ? camposEmail : {}, limite_por_pessoa_dia: limiteOk ? limiteNum : 1,
  };

  const salvar = async () => {
    setSalvando(true); setAviso(null);
    try {
      if (inicial) await salvarPersonalizada(inicial.id, corpo); else await criarPersonalizada(corpo);
      aoSalvar();
    } catch (e) { setAviso({ texto: `O servidor não aceitou: ${(e as Error).message}`, ruim: true }); } finally { setSalvando(false); setConfirmar(false); }
  };

  return (
    <div className="space-y-4" data-testid="editor-personalizada">
      <div className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-2">
        <label className={cn(rotuloCampo, "md:col-span-2")}>Nome (só o painel vê)
          <input aria-label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Lembrete de proposta parada" className={classeDoCampo} />
        </label>
        <label className={rotuloCampo}>Quando
          <select aria-label="Quando" value={evento} onChange={(e) => setEvento(e.target.value)} className={classeDoCampo}>
            <option value="">Escolha o evento</option>
            {grupos.map((g) => (
              <optgroup key={g} label={g}>
                {gatilhos.eventos.filter((e) => e.grupo === g).map((e) => <option key={e.tipo} value={e.tipo}>{e.rotulo}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div className={rotuloCampo}>Quanto tempo depois
          <div className="flex gap-2">
            <select aria-label="Quanto tempo depois" value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeDoAtraso)} className={classeDoCampo}>
              <option value="na_hora">Na hora</option>
              <option value="minutos">Minutos depois</option>
              <option value="horas">Horas depois</option>
              <option value="dias">Dias depois</option>
            </select>
            {unidade !== "na_hora" ? (
              <input aria-label="Quantidade" type="number" min={1} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={cn(classeDoCampo, "w-24")} />
            ) : null}
          </div>
        </div>
        <label className={rotuloCampo}>Condição
          <select aria-label="Condição" value={condicao} onChange={(e) => setCondicao(e.target.value)} disabled={!evento} className={classeDoCampo}>
            <option value="">Sem condição</option>
            {condicoes.map((c) => <option key={c.chave} value={c.chave}>{c.rotulo}</option>)}
          </select>
          <span className="mt-1 block font-normal text-slate-400">
            {condicao ? condicoes.find((c) => c.chave === condicao)?.descricao || "Na hora de mandar, confere de novo: se não valer mais, pula."
              : "Na hora de mandar, a condição é conferida de novo; se não valer mais, a notificação é pulada."}
          </span>
        </label>
        <fieldset className={rotuloCampo}>
          <legend>Para quem</legend>
          {!gatilho ? <p className="mt-1 font-normal text-slate-400">Escolha o evento primeiro.</p> : (
            <div className="mt-1.5 flex flex-wrap gap-3" data-testid="para-quem">
              {papeis.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 text-sm font-normal text-slate-700">
                  <input type="checkbox" className="accent-orange-600" checked={para.includes(p)} aria-label={p === "cliente" ? "Cliente" : "Profissional"}
                    onChange={(e) => setPara((x) => (e.target.checked ? [...x, p] : x.filter((y) => y !== p)))} />
                  {p === "cliente" ? "Cliente" : "Profissional"}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <label className={rotuloCampo}>Limite por pessoa por dia
          <input aria-label="Limite por pessoa por dia" type="number" min={1} max={LIMITE_MAXIMO} step={1} value={limite} onChange={(e) => setLimite(e.target.value)} className={cn(classeDoCampo, "w-24")} />
          <span className="mt-1 block font-normal text-slate-400">Passou disso no dia, a notificação é pulada para essa pessoa.</span>
        </label>
        <div className="rounded-xl bg-slate-50 px-3 py-2 md:col-span-2">
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Vai ficar assim</p>
          <FraseDaRegra r={{ evento, atraso_minutos: minutos, condicao: condicao || null, para, titulo: corpo.titulo }} gatilhos={gatilhos} />
        </div>
      </div>

      <SecaoNotificacao
        canais={canais} mudarCanais={setCanais} titulo={titulo} mudarTitulo={setTitulo} texto={texto} mudarTexto={setTexto} variaveis={variaveis}
        previa={{ titulo: comExemplos(notificacao.titulo, variaveis), texto: comExemplos(notificacao.texto, variaveis) }}
      />
      <SecaoEmail
        ligado={canais.email} mudarLigado={() => setCanais((c) => ({ ...c, email: !c.email }))} modelos={modelos}
        estado={email} mudar={setEmail} variaveis={variaveis} notificacao={notificacao} href={null} mostrarErros={mostrarErros}
      />
      <AvisoDeVariaveis problemas={problemas} />
      {inicial ? (
        <EnviarTeste enviar={(userId) => testarPersonalizada(inicial.id, userId)}
          nota={<p className="text-xs text-slate-500">O teste usa o que está salvo, com valores de exemplo do evento.</p>} />
      ) : <p className="text-xs text-slate-500">Para mandar um teste, salve primeiro.</p>}
      {aviso ? <Recado {...aviso} /> : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {falta ? <span className="text-xs text-slate-500">{falta}</span> : null}
        <button type="button" onClick={cancelar} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
        <button type="button" disabled={!pronto && !(faltamCampos.length && !problemas.length)}
          onClick={() => { if (faltamCampos.length) { setMostrarErros(true); return; } setConfirmar(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar
        </button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => { if (!salvando) setConfirmar(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{inicial ? "Salvar as mudanças?" : "Criar esta notificação?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <FraseDaRegra r={corpo} gatilhos={gatilhos} />
                <p className="text-xs text-slate-500">
                  Por {[canais.sino && "sino", canais.push && "push", canais.email && "e-mail"].filter(Boolean).join(", ")}, no máximo {corpo.limite_por_pessoa_dia} por pessoa por dia.
                  {inicial ? "" : " Começa ativa: vale para o que acontecer daqui para a frente."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={(e) => { e.preventDefault(); void salvar(); }} className="bg-orange-600 hover:bg-orange-700">
              {inicial ? "Salvar" : "Criar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- histórico ---------- */
const STATUS_DA_FILA: Record<string, { rotulo: string; tom: "amber" | "emerald" | "slate" | "rose" | "sky" }> = {
  pendente: { rotulo: "Pendente", tom: "amber" }, enviada: { rotulo: "Enviada", tom: "emerald" },
  cancelada: { rotulo: "Cancelada", tom: "slate" }, pulada: { rotulo: "Pulada", tom: "sky" },
};

function HistoricoDaRegra({ id }: { id: number }) {
  const { dado, erro } = useApi<unknown>(caminhoDoHistorico(id));
  const linhas = useMemo(() => (dado ? normalizarHistorico(dado) : null), [dado]);
  if (erro) return <Erro msg={erro} />;
  if (!linhas) return <Carregando />;
  if (!linhas.length) return <p className="text-sm text-slate-400">Ainda não disparou para ninguém.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-[11px] uppercase tracking-wide text-slate-500">
        <tr><th className="px-2 py-1.5">Quem</th><th className="px-2 py-1.5">Papel</th><th className="px-2 py-1.5">Sai em</th><th className="px-2 py-1.5">Situação</th><th className="px-2 py-1.5">Motivo</th></tr>
      </thead>
      <tbody>
        {linhas.map((h, i) => {
          const s = STATUS_DA_FILA[h.status] ?? { rotulo: h.status || "—", tom: "slate" as const };
          return (
            <tr key={i} className="border-t border-slate-100" data-testid="linha-do-historico">
              <td className="px-2 py-1.5 text-slate-900">{h.quem}</td>
              <td className="px-2 py-1.5 capitalize text-slate-600">{h.papel ?? "—"}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{quando(h.enviar_em)}</td>
              <td className="px-2 py-1.5"><StatusBadge label={s.rotulo} tone={s.tom} /></td>
              <td className="px-2 py-1.5 text-xs text-slate-500">{h.motivo ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------- lista ---------- */
function Ajuda() {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900" data-testid="ajuda-personalizadas">
      Aqui você cria notificações <b>a mais</b>, que saem depois de algo acontecer no app (com atraso e uma condição, se quiser).
      As notificações de sempre continuam presas aos seus eventos, na sub-aba Eventos automáticos. Os eventos que disparam e as condições vêm de
      uma lista fixa feita em código: para ter um novo, peça para o time incluir no backend.
    </div>
  );
}

const AVISO_DE_DESLIGAR = "Nenhuma personalizada será enviada até religar. Avisos agendados ficam esperando; os com mais de 24 h são cancelados.";

/**
 * Chave geral: desliga todas as personalizadas de uma vez (as regras continuam editáveis).
 * Enquanto a config carrega, ou se falhou, fica neutra e sem mexer.
 */
function ChaveGeral() {
  const { dado, erro, deNovo } = useApi<unknown>(CAMINHO_CONFIG);
  const doServidor = dado ? personalizadasLigadas(dado) : null;
  const [ligadas, setLigadas] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  useEffect(() => { if (doServidor != null) setLigadas(doServidor); }, [doServidor]);
  const conhecido = ligadas != null;
  const estado = conhecido ? (ligadas ? "Ligadas" : "Desligadas") : erro ? "indisponível" : dado ? "indisponível" : "carregando…";

  const mudar = async () => {
    if (!conhecido || ocupado) return;
    const nova = !ligadas;
    if (!nova && !window.confirm(`Desligar todas as notificações personalizadas? ${AVISO_DE_DESLIGAR}`)) return;
    setOcupado(true); setFalha(null); setLigadas(nova);
    try { await ligarPersonalizadas(nova); } catch (e) { setLigadas(!nova); setFalha((e as Error).message); } finally { setOcupado(false); }
  };

  return (
    <div className="space-y-2" data-testid="chave-geral">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
        <span className="text-sm font-semibold text-slate-900">Notificações personalizadas:</span>
        <span className={cn("text-sm font-bold", !conhecido ? "text-slate-400" : ligadas ? "text-emerald-700" : "text-amber-700")} data-testid="estado-da-chave">{estado}</span>
        {ocupado || (!conhecido && !erro && !dado) ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
        {!conhecido && (erro || dado) ? <button type="button" onClick={deNovo} className="text-xs font-semibold text-slate-500 underline">tentar de novo</button> : null}
        <span className="ml-auto">
          <Interruptor ligado={ligadas === true} rotulo="Notificações personalizadas" mudar={() => void mudar()}
            travado={!conhecido ? (erro ? "Não deu para ler a configuração agora" : "Carregando a configuração") : ocupado ? "Salvando" : undefined} />
        </span>
      </div>
      {erro && !conhecido ? <Erro msg={`Não li se as personalizadas estão ligadas: ${erro}`} /> : null}
      {falha ? <Erro msg={`Não mudou: ${falha}`} /> : null}
      {ligadas === false ? (
        <p role="status" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="personalizadas-desligadas">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>Desligadas.</b> {AVISO_DE_DESLIGAR} Dá para criar e editar normalmente.</span>
        </p>
      ) : null}
    </div>
  );
}

const BOTAO = "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300 disabled:opacity-40";

export function Personalizadas({ modelos }: { modelos: Modelo[] }) {
  const gat = useApi<unknown>(CAMINHO_GATILHOS);
  const { dado, erro, deNovo } = useApi<unknown>(CAMINHO_PERSONALIZADAS);
  const gatilhos = useMemo(() => (gat.dado ? normalizarGatilhos(gat.dado) : null), [gat.dado]);
  const lista = useMemo(() => (dado ? normalizarPersonalizadas(dado) : null), [dado]);
  const [editando, setEditando] = useState<Personalizada | "nova" | null>(null);
  const [vendo, setVendo] = useState<Personalizada | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  const agir = async (r: Personalizada, acao: () => Promise<unknown>) => {
    setOcupado(r.id); setFalha(null);
    try { await acao(); deNovo(); } catch (e) { setFalha((e as Error).message); } finally { setOcupado(null); }
  };
  const [recado, setRecado] = useState<string | null>(null);
  const excluir = (r: Personalizada) => {
    if (!window.confirm(`Excluir "${r.nome || r.titulo}"? Se houver avisos agendados, ela é pausada em vez de apagada.`)) return;
    setRecado(null);
    void agir(r, async () => {
      const res = await excluirPersonalizada(r.id);
      setRecado(res.mensagem ?? (res.apagada ? `"${r.nome || r.titulo}" foi excluída.` : "A notificação foi pausada em vez de apagada."));
    });
  };

  const chave = <ChaveGeral />;
  if (gat.erro || !gatilhos) {
    return (
      <div className="space-y-3">
        {chave}
        {gat.erro ? <Erro msg={`Não carreguei a lista de eventos: ${gat.erro}`} /> : <Carregando />}
      </div>
    );
  }
  if (editando) {
    return (
      <div className="space-y-3">
      {chave}
      <EditorDePersonalizada
        key={editando === "nova" ? "nova" : editando.id}
        inicial={editando === "nova" ? null : editando} gatilhos={gatilhos} modelos={modelos}
        aoSalvar={() => { setEditando(null); deNovo(); }} cancelar={() => setEditando(null)}
      />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chave}
      <Ajuda />
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditando("nova")} disabled={!gatilhos.eventos.length}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40">
          <Plus className="h-4 w-4" />Nova notificação
        </button>
      </div>
      {falha ? <Erro msg={falha} /> : null}
      {recado ? <Recado texto={recado} /> : null}
      {erro ? <Erro msg={erro} /> : !lista ? <Carregando /> : !lista.length ? <p className="text-sm text-slate-400">Nenhuma notificação personalizada ainda.</p> : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {lista.map((r) => (
            <li key={r.id} className={cn("space-y-1.5 px-3 py-2.5", !r.ativo && "bg-slate-50/70")} data-testid="personalizada">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm text-slate-900">{r.nome || r.titulo || `#${r.id}`}</b>
                <StatusBadge label={r.ativo ? "Ativa" : "Pausada"} tone={r.ativo ? "emerald" : "slate"} />
                <CanaisEmChips canais={r.canais} />
                <span className="ml-auto text-[11px] text-slate-500">
                  7 dias: {contar(r.enviadas_7d, "enviada", "enviadas")} · {contar(r.puladas_7d, "pulada", "puladas")} · até {r.limite_por_pessoa_dia}/pessoa/dia
                </span>
              </div>
              <FraseDaRegra r={r} gatilhos={gatilhos} />
              <div className="flex flex-wrap items-center gap-1.5">
                {r.ativo ? (
                  <button type="button" className={BOTAO} disabled={ocupado === r.id} onClick={() => void agir(r, () => pausarPersonalizada(r.id))}><Pause className="h-3 w-3" />Pausar</button>
                ) : (
                  <button type="button" className={BOTAO} disabled={ocupado === r.id} onClick={() => void agir(r, () => retomarPersonalizada(r.id))}><Play className="h-3 w-3" />Retomar</button>
                )}
                <button type="button" className={BOTAO} onClick={() => setEditando(r)}><Pencil className="h-3 w-3" />Editar</button>
                <button type="button" className={BOTAO} onClick={() => setVendo(r)}><History className="h-3 w-3" />Histórico</button>
                <button type="button" className={cn(BOTAO, "hover:ring-rose-300")} disabled={ocupado === r.id} onClick={() => excluir(r)}><Trash2 className="h-3 w-3" />Excluir</button>
                <span className="ml-auto text-[11px] text-slate-400">{[r.criado_por, r.updated_at && `atualizada ${quando(r.updated_at)}`].filter(Boolean).join(" · ")}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Janela
        conteudo={vendo ? { titulo: `Histórico: ${vendo.nome || vendo.titulo}`, sub: <FraseDaRegra r={vendo} gatilhos={gatilhos} emLinha />, corpo: <HistoricoDaRegra id={vendo.id} /> } : null}
        fechar={() => setVendo(null)}
      />
    </div>
  );
}
