import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Bell, Check, FileText, Loader2, Lock, Mail, Megaphone, RotateCcw, Send, Smartphone, Sparkles, Zap } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PaginationControls, SectionCard, StatusBadge } from "./AdminPrimitives";
import { BuscaDePessoa, PapelIcone, type PessoaEscolhida } from "./AdminPunicoesSection";
import { Carregando, Erro, Janela, quando, useApi } from "./analise/comum";
import { CamposDoModelo, ChipsDeVariaveis, Interruptor, classeDoCampo, devolverCursor, inserirNoCursor } from "./notificacoes/CamposDoModelo";
import { ModelosDeEmail } from "./notificacoes/ModelosDeEmail";
import { Personalizadas } from "./notificacoes/Personalizadas";
import {
  AvisoDeVariaveis, BotaoDoCanal, EnviarTeste, EscolherConta, Recado, SecaoEmail, SecaoNotificacao, variaveisComProblema,
  type Aviso, type EstadoDoEmail, type Icone,
} from "./notificacoes/Secoes";
import { PreviaDoEmail, PreviaDoPush } from "./notificacoes/Previas";
import { cn } from "../utils";
import {
  CAMINHO_PAINEL, PUBLICOS, ROTAS_DO_APP, STATUS, VARIAVEIS_DO_COMUNICADO, VARIAVEIS_DO_EMAIL, VARIAVEIS_DO_EMAIL_DO_COMUNICADO, modelosCompativeis, nomeDoAnexo,
  problemasDoTexto, problemasDosCampos, MOTIVO_DA_SEGURANCA, MOTIVO_DO_TRAVADO, faltaNoMolde, obrigatoriasForaDoEmail,
  camposFaltando, cancelarEnvio, caminhoDoPublico, caminhoDosEnvios, modeloOuVazio, comExemplos, contarPublico, criarEnvio,
  descreverPublico, enviarTeste, manterCamposComuns, normalizarEnvios, normalizarPainel, pedirPrevia, regraDoPadrao, salvarRegra,
  valoresComExemplos, valoresParaEnviar, voltarAoPadrao,
  type Canais, type Envio, type Evento, type Modelo, type Painel, type PedidoDePrevia, type Publico, type Regra,
  type TipoDePublico, type ValoresDosCampos, type Variavel,
} from "./notificacoes/api";

/**
 * Aba "Notificações" (20/11/2026). Só owner. Três sub-abas (a escolhida fica no endereço, #comunicados...):
 *  - Personalizadas: notificações a mais, disparadas por um evento de uma lista fechada (./notificacoes/Personalizadas.tsx).
 *  - Comunicados: mensagem avulsa para uma pessoa, um grupo ou todo mundo, na hora ou agendada, e o histórico.
 *  - Eventos automáticos: o que o app manda sozinho, com canais, textos e anexos editáveis.
 *  - Modelos de e-mail: só leitura; os modelos são arquivos no backend (ver ./notificacoes/ModelosDeEmail.tsx).
 *
 * Notificação (sino e push) e e-mail são independentes: qualquer combinação vale. O e-mail usa só
 * os campos que o modelo declara (assunto, título, texto...); campo intocado = padrão do modelo.
 * As rotas e os tipos estão em ./notificacoes/api.ts; o formulário dos modelos em ./notificacoes/CamposDoModelo.tsx.
 */

const numero = (n: number) => n.toLocaleString("pt-BR");
const contas = (n: number) => `${numero(n)} ${n === 1 ? "conta" : "contas"}`;
const rotuloCampo = "block text-xs font-semibold text-slate-600";

/* ---------- 1. eventos automáticos ---------- */
/** Comparação que não liga para a ordem das chaves de email_campos. */
const assinatura = (r: Pick<Regra, "sino" | "push" | "email" | "titulo" | "texto" | "email_modelo" | "email_campos" | "anexos">) =>
  JSON.stringify([r.sino, r.push, r.email, r.titulo, r.texto, r.email_modelo,
    Object.entries(r.email_campos ?? {}).sort(([a], [b]) => a.localeCompare(b)), [...(r.anexos ?? [])].sort()]);

function EditorDoEvento({ evento, regra, modelos, aoSalvar, aoVoltarAoPadrao, personalizado }: {
  evento: Evento; regra: Regra; modelos: Modelo[]; personalizado: boolean;
  /** null = salvou; texto = o motivo da recusa do servidor. */
  aoSalvar: (nova: Regra) => Promise<string | null>; aoVoltarAoPadrao: () => Promise<void>;
}) {
  const [recusa, setRecusa] = useState<string | null>(null);
  // E-mail de acesso à conta: o link/código nunca vai por sino nem push.
  const [canais, setCanais] = useState<Canais>(evento.seguranca ? { sino: false, push: false, email: regra.email } : { sino: regra.sino, push: regra.push, email: regra.email });
  const [titulo, setTitulo] = useState(regra.titulo ?? "");
  const [texto, setTexto] = useState(regra.texto ?? "");
  const [email, setEmail] = useState<EstadoDoEmail>({ modelo: regra.email_modelo ?? "", campos: { ...regra.email_campos } });
  const [anexos, setAnexos] = useState<string[]>(regra.anexos ?? []);
  const [mostrarErros, setMostrarErros] = useState(false);
  const [ocupado, setOcupado] = useState<"salvar" | "padrao" | null>(null);

  const originalTitulo = evento.original.titulo ?? evento.rotulo;
  const originalTexto = evento.original.texto ?? "";
  const notificacao = { titulo: titulo.trim() || originalTitulo, texto: texto.trim() || originalTexto };
  const modeloEf = modeloOuVazio(modelos.find((m) => m.chave === email.modelo));
  const chavesDoEvento = evento.variaveis.map((v) => v.chave);
  const nova: Regra = {
    ...regra, ...canais, titulo: titulo.trim() || null, texto: texto.trim() || null,
    email_modelo: email.modelo || null, email_campos: valoresParaEnviar(email.campos, modeloEf),
    // Só os anexos que este evento aceita, na ordem do servidor.
    anexos: evento.anexos_possiveis.filter((a) => anexos.includes(a)),
  };
  const mudou = assinatura(nova) !== assinatura(regra);
  const faltam = canais.email ? camposFaltando(email.campos, modeloEf, notificacao) : [];
  const desligado = !canais.sino && !canais.push && !canais.email;
  const doMolde = canais.email && email.modelo ? faltaNoMolde(modeloEf, chavesDoEvento) : [];
  const problemas = [
    ...variaveisComProblema({ titulo, texto, email, modelos, daNotificacao: chavesDoEvento }),
    // Variável obrigatória (link de redefinir a senha) só se confere no e-mail.
    ...(canais.email ? obrigatoriasForaDoEmail(evento.variaveis, modeloEf, nova.email_campos) : []),
    ...(doMolde.length ? [`O modelo "${modeloEf.rotulo}" usa ${doMolde.map((k) => `{{${k}}}`).join(", ")}, que este evento não tem. Escolha outro modelo.`] : []),
  ];
  const obrigatorias = evento.variaveis.filter((v) => v.obrigatoria);
  const editavel = evento.editavel;

  const salvar = async () => {
    if (problemas.length) return;
    if (faltam.length) { setMostrarErros(true); return; }
    setOcupado("salvar"); setRecusa(null);
    setRecusa(await aoSalvar(nova));
    setOcupado(null);
  };
  const padrao = async () => {
    if (!window.confirm(`Voltar "${evento.rotulo}" ao padrão? Os canais, os textos da notificação e do e-mail e o modelo voltam a ser os originais.`)) return;
    setOcupado("padrao");
    try { await aoVoltarAoPadrao(); } finally { setOcupado(null); }
  };

  return (
    <div className="space-y-4" data-testid="editor-do-evento">
      <p className="text-xs text-slate-500">
        <b className="text-slate-700">Quando:</b> {evento.quando || "—"} · <b className="text-slate-700">Para:</b> {evento.para || "—"}
        {!regra.ativo ? <span className="ml-2 font-semibold text-amber-700">O evento está desligado na lista; nada sai até ligar.</span> : null}
      </p>
      {!editavel ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700" data-testid="somente-leitura">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><b>Só para ver.</b> Este aviso não pode ser mudado nem testado pelo painel: o texto e os canais ficam como estão no código porque a conta depende dele.</span>
        </p>
      ) : null}
      {obrigatorias.length ? (
        <p className="flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="variaveis-obrigatorias">
          <Lock className="h-3.5 w-3.5" />Precisam estar no e-mail (nunca vão por sino nem push):
          {obrigatorias.map((v) => <span key={v.chave}><code className="font-mono font-semibold">{`{${v.chave}}`}</code>{v.descricao ? ` (${v.descricao})` : ""}</span>)}
        </p>
      ) : null}
      <fieldset disabled={!editavel} className="m-0 min-w-0 space-y-4 border-0 p-0">
      <SecaoNotificacao travados={evento.canais_travados} proibida={evento.seguranca ? MOTIVO_DA_SEGURANCA : undefined}
        canais={canais} mudarCanais={setCanais} titulo={titulo} mudarTitulo={setTitulo} texto={texto} mudarTexto={setTexto}
        variaveis={evento.variaveis} originalTitulo={originalTitulo} originalTexto={originalTexto}
        previa={{ titulo: comExemplos(notificacao.titulo, evento.variaveis), texto: comExemplos(notificacao.texto, evento.variaveis) }}
      />
      <SecaoEmail
        ligado={canais.email} mudarLigado={() => setCanais((c) => ({ ...c, email: !c.email }))} modelos={modelos}
        estado={email} mudar={setEmail} variaveis={evento.variaveis} notificacao={notificacao} href={evento.href ?? null} mostrarErros={mostrarErros}
        tipo={evento.tipo} anexos={{ possiveis: evento.anexos_possiveis, marcados: anexos, mudar: setAnexos }}
        travado={evento.canais_travados.includes("email") ? MOTIVO_DO_TRAVADO.email : undefined}
      />
      </fieldset>
      {desligado ? <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">Notificação e e-mail desligados: este evento não manda nada.</p> : null}
      {editavel ? <AvisoDeVariaveis problemas={problemas} /> : null}
      {editavel && problemas.length ? (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-rose-700" data-testid="lista-de-problemas">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
      ) : null}
      {recusa ? <Erro msg={`O servidor não aceitou: ${recusa}`} /> : null}
      {editavel ? (
        <EnviarTeste
          enviar={(userId) => enviarTeste({ user_id: userId, tipo: evento.tipo })}
          nota={mudou ? <p className="text-xs font-semibold text-amber-700">O teste usa o que está salvo. Salve antes para testar o que mudou.</p> : null}
        />
      ) : null}
      {editavel ? <div className="flex flex-wrap items-center justify-end gap-2">
        {personalizado ? (
          <button type="button" disabled={!!ocupado} onClick={() => void padrao()}
            className="mr-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:ring-rose-300 disabled:opacity-40">
            {ocupado === "padrao" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Voltar ao padrão
          </button>
        ) : null}
        {mostrarErros && faltam.length ? <span className="text-xs font-semibold text-rose-600">Preencha os campos obrigatórios do e-mail.</span> : null}
        <button type="button" disabled={!!ocupado || !mudou || problemas.length > 0} onClick={() => void salvar()}
          className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-40">
          {ocupado === "salvar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Salvar
        </button>
      </div> : null}
    </div>
  );
}

const CANAIS: { chave: keyof Canais; rotulo: string; icone: Icone }[] = [
  { chave: "sino", rotulo: "Sino", icone: Bell },
  { chave: "push", rotulo: "Push", icone: Smartphone },
  { chave: "email", rotulo: "E-mail", icone: Mail },
];

function EventosAutomaticos({ painel, recarregar }: { painel: Painel; recarregar: () => void }) {
  const [regras, setRegras] = useState<Record<string, Regra>>({});
  const [personalizados, setPersonalizados] = useState<Record<string, boolean>>({});
  const [salvo, setSalvo] = useState<{ tipo: string; vez: number } | null>(null);
  const [falha, setFalha] = useState<{ tipo: string; msg: string } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    setRegras(Object.fromEntries(painel.eventos.map((e) => [e.tipo, e.regra])));
    setPersonalizados(Object.fromEntries(painel.eventos.map((e) => [e.tipo, e.personalizado])));
  }, [painel]);
  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(null), 2500);
    return () => clearTimeout(t);
  }, [salvo]);

  const regraDe = (e: Evento) => regras[e.tipo] ?? e.regra;
  const personalizado = (e: Evento) => personalizados[e.tipo] ?? e.personalizado;

  /** Salva na hora; se o servidor recusar, volta ao que era. */
  const gravar = async (e: Evento, nova: Regra): Promise<string | null> => {
    const antes = regraDe(e);
    setRegras((r) => ({ ...r, [e.tipo]: nova }));
    setFalha(null);
    try {
      const b = await salvarRegra(e.tipo, nova);
      const veio = b?.evento?.personalizado ?? b?.personalizado;
      setPersonalizados((p) => ({ ...p, [e.tipo]: typeof veio === "boolean" ? veio : true }));
      setSalvo({ tipo: e.tipo, vez: Date.now() });
      return null;
    } catch (err) {
      setRegras((r) => ({ ...r, [e.tipo]: antes }));
      setFalha({ tipo: e.tipo, msg: (err as Error).message });
      return (err as Error).message;
    }
  };

  const evento = aberto ? painel.eventos.find((e) => e.tipo === aberto) ?? null : null;

  if (!painel.eventos.length) return <EmptyState title="Nenhum evento" description="O servidor ainda não mandou a lista de eventos automáticos." />;

  return (
    <div className="space-y-4">
      {painel.grupos.map((grupo) => {
        const doGrupo = painel.eventos.filter((e) => e.grupo === grupo);
        if (!doGrupo.length) return null;
        return (
          <section key={grupo} data-testid="grupo-de-eventos">
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{grupo}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
              {doGrupo.map((e) => {
                const r = regraDe(e);
                const nadaSai = !r.ativo || (!r.sino && !r.push && !r.email);
                const trava = (c: keyof Canais) => (!e.editavel ? "Só para ver: este aviso não pode ser mudado pelo painel"
                  : e.seguranca && c !== "email" && !r[c] ? MOTIVO_DA_SEGURANCA
                  : e.canais_travados.includes(c) && r[c] ? MOTIVO_DO_TRAVADO[c] : undefined);
                const travaDoEvento = !e.editavel ? trava("email") : e.canais_travados.length ? "Este aviso é necessário para a conta funcionar" : undefined;
                return (
                  <li key={e.tipo} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2" data-testid="evento">
                    <button type="button" onClick={() => setAberto(e.tipo)} className={cn("min-w-0 flex-1 text-left", nadaSai && "opacity-60")}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 hover:text-orange-700">{e.rotulo}</span>
                        {nadaSai ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">Desligado</span> : null}
                        {!e.editavel ? <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"><Lock className="h-2.5 w-2.5" />só para ver</span> : null}
                        {personalizado(e) ? <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200">personalizado</span> : null}
                      </span>
                      <span className="block text-xs text-slate-500">{[e.quando, e.para && `Para: ${e.para}`].filter(Boolean).join(" · ") || "—"}</span>
                    </button>
                    <span className="flex items-center gap-1">
                      {CANAIS.map((c) => (
                        <BotaoDoCanal key={c.chave} rotulo={c.rotulo} icone={c.icone} ligado={r[c.chave]} apagado={!r.ativo} travado={trava(c.chave)}
                          mudar={() => void gravar(e, { ...r, [c.chave]: !r[c.chave] })} />
                      ))}
                    </span>
                    <span className="flex w-24 items-center justify-end gap-2">
                      {salvo?.tipo === e.tipo ? <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600"><Check className="h-3 w-3" />salvo</span> : null}
                      <Interruptor ligado={r.ativo} rotulo={r.ativo ? "Evento ligado" : "Evento desligado"} travado={r.ativo ? travaDoEvento : undefined} mudar={() => void gravar(e, { ...r, ativo: !r.ativo })} />
                    </span>
                    {falha?.tipo === e.tipo ? <p className="w-full text-xs text-rose-600">Não salvou: {falha.msg}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <Janela
        conteudo={evento ? {
          titulo: evento.rotulo,
          sub: evento.grupo,
          corpo: (
            <EditorDoEvento
              key={evento.tipo} evento={evento} regra={regraDe(evento)} modelos={painel.modelos} personalizado={personalizado(evento)}
              aoSalvar={async (nova) => { const recusa = await gravar(evento, nova); if (!recusa) setAberto(null); return recusa; }}
              aoVoltarAoPadrao={async () => {
                try {
                  await voltarAoPadrao(evento.tipo);
                  setRegras((r) => ({ ...r, [evento.tipo]: regraDoPadrao(evento.padrao) }));
                  setPersonalizados((p) => ({ ...p, [evento.tipo]: false }));
                  setAberto(null);
                  recarregar();
                } catch (err) { setFalha({ tipo: evento.tipo, msg: (err as Error).message }); setAberto(null); }
              }}
            />
          ),
        } : null}
        fechar={() => setAberto(null)}
      />
    </div>
  );
}

/* ---------- 2. comunicados ---------- */
/** Quantas contas o público alcança, com uma pausa enquanto digita a cidade. */
function useTotalDoPublico(caminho: string | null) {
  const [estado, setEstado] = useState<{ total: number | null; erro: string | null; carregando: boolean }>({ total: null, erro: null, carregando: false });
  useEffect(() => {
    if (!caminho) { setEstado({ total: null, erro: null, carregando: false }); return; }
    let vivo = true;
    setEstado({ total: null, erro: null, carregando: true });
    const t = setTimeout(() => {
      contarPublico(caminho)
        .then((total) => { if (vivo) setEstado({ total, erro: null, carregando: false }); })
        .catch((e) => { if (vivo) setEstado({ total: null, erro: (e as Error).message, carregando: false }); });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [caminho]);
  return estado;
}

/** Comunicado não tem evento por trás: a única variável é {nome}. */
const VARIAVEIS_COMUNICADO: Variavel[] = [{ chave: "nome", descricao: "Primeiro nome de quem recebe", exemplo: "Ana" }];

function NovoComunicado({ modelos, aoEnviar }: { modelos: Modelo[]; aoEnviar: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [href, setHref] = useState("");
  const [canais, setCanais] = useState<Canais>({ sino: true, push: true, email: false });
  // Só modelos que não pedem variável que um comunicado não tem (ex.: {{link_redefinicao}}).
  const escolhiveis = useMemo(() => modelosCompativeis(modelos, VARIAVEIS_DO_COMUNICADO), [modelos]);
  const [email, setEmail] = useState<EstadoDoEmail>({ modelo: escolhiveis[0]?.chave ?? "", campos: {} });
  const [tipo, setTipo] = useState<TipoDePublico>("profissionais");
  const [pessoa, setPessoa] = useState<PessoaEscolhida | null>(null);
  const [cidade, setCidade] = useState("");
  const [agendar, setAgendar] = useState("");
  const [mostrarErros, setMostrarErros] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => { if (!email.modelo && escolhiveis[0]) setEmail((e) => ({ ...e, modelo: escolhiveis[0].chave })); }, [escolhiveis, email.modelo]);

  const publico = useMemo<Publico>(() => (
    tipo === "pessoa" ? { tipo, user_ids: pessoa ? [pessoa.id] : [] } : tipo === "cidade" ? { tipo, cidade: cidade.trim() } : { tipo }
  ), [tipo, pessoa, cidade]);
  const caminho = caminhoDoPublico(publico);
  const { total, erro: erroTotal, carregando } = useTotalDoPublico(caminho);

  const notificacaoLigada = canais.sino || canais.push;
  const modeloEf = modeloOuVazio(modelos.find((m) => m.chave === email.modelo));
  const camposEmail = valoresParaEnviar(email.campos, modeloEf);
  const notificacao = { titulo: titulo.trim(), texto: texto.trim() };
  const tituloDoEmail = String(camposEmail.titulo || camposEmail.assunto || "") || notificacao.titulo;
  const textoDoEmail = String(camposEmail.texto ?? "") || notificacao.texto;
  const faltamCampos = canais.email ? camposFaltando(email.campos, modeloEf, notificacao) : [];

  const quandoAgendado = agendar ? new Date(agendar) : null;
  const erroAgenda = quandoAgendado && !(quandoAgendado.getTime() > Date.now()) ? "Escolha um dia e hora no futuro para agendar." : null;
  const semCanal = !notificacaoLigada && !canais.email;
  const falta = semCanal ? null
    : notificacaoLigada && !notificacao.titulo ? "Escreva o título da notificação."
    : notificacaoLigada && !notificacao.texto ? "Escreva o texto da notificação."
    : canais.email && !email.modelo && escolhiveis.length ? "Escolha o modelo de e-mail."
    : canais.email && !tituloDoEmail ? "Escreva o título da notificação ou o título/assunto do e-mail: o e-mail usa como título."
    : canais.email && !textoDoEmail ? "Escreva o texto da notificação ou o texto do e-mail."
    : faltamCampos.length ? `Preencha no e-mail: ${faltamCampos.map((c) => c.rotulo).join(", ")}.`
    : !caminho ? (tipo === "pessoa" ? "Escolha a pessoa." : "Escreva a cidade.")
    : total === 0 ? "Ninguém nesse público." : null;
  const problemas = variaveisComProblema({ titulo, texto, email, modelos, daNotificacao: VARIAVEIS_DO_COMUNICADO, doEmail: VARIAVEIS_DO_EMAIL_DO_COMUNICADO });
  const pronto = !semCanal && !falta && !erroAgenda && !problemas.length && total != null && total > 0 && !enviando && !carregando;

  const corpoEmail = {
    email_modelo: canais.email ? email.modelo || null : null,
    email_campos: canais.email ? camposEmail : {},
  };
  // Só e-mail: o título/texto principal do envio vira o do e-mail (o servidor pede os dois).
  const tituloPrincipal = notificacaoLigada ? notificacao.titulo : tituloDoEmail;
  const textoPrincipal = notificacaoLigada ? notificacao.texto : textoDoEmail;

  const enviar = async () => {
    setEnviando(true); setAviso(null);
    try {
      await criarEnvio({
        titulo: tituloPrincipal, texto: textoPrincipal, href: href || null, canais, ...corpoEmail, publico,
        agendado_para: quandoAgendado ? quandoAgendado.toISOString() : null,
      });
      setAviso({ texto: quandoAgendado ? `Comunicado agendado para ${quando(quandoAgendado.toISOString())}.` : `Comunicado enviado para ${contas(total ?? 0)}.` });
      setTitulo(""); setTexto(""); setAgendar(""); setEmail((e) => ({ ...e, campos: {} })); setMostrarErros(false);
      aoEnviar();
    } catch (e) { setAviso({ texto: (e as Error).message, ruim: true }); } finally { setEnviando(false); setConfirmar(false); }
  };
  const tentarEnviar = () => {
    if (faltamCampos.length) { setMostrarErros(true); return; }
    setConfirmar(true);
  };

  const paraTodos = tipo === "todos";
  const n = total ?? 0;
  const canaisDoTexto = [canais.sino && "sino", canais.push && "push", canais.email && "e-mail"].filter(Boolean).join(", ");

  return (
    <div className="space-y-4" data-testid="novo-comunicado">
      <SecaoNotificacao
        canais={canais} mudarCanais={setCanais} titulo={titulo} mudarTitulo={setTitulo} texto={texto} mudarTexto={setTexto}
        variaveis={VARIAVEIS_COMUNICADO}
        previa={{ titulo: comExemplos(notificacao.titulo, VARIAVEIS_COMUNICADO), texto: comExemplos(notificacao.texto, VARIAVEIS_COMUNICADO) }}
      />
      <SecaoEmail
        ligado={canais.email} mudarLigado={() => setCanais((c) => ({ ...c, email: !c.email }))} modelos={modelos}
        estado={email} mudar={setEmail} variaveis={VARIAVEIS_COMUNICADO} notificacao={notificacao} href={href || null} mostrarErros={mostrarErros} doEmail={VARIAVEIS_DO_EMAIL_DO_COMUNICADO}
      />
      <AvisoDeVariaveis problemas={problemas} />
      {semCanal ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Ligue pelo menos um canal: a notificação (sino ou push) ou o e-mail.</p> : null}

      <div className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-2">
        <label className={rotuloCampo}>Abrir no app
          <select aria-label="Abrir no app" value={href} onChange={(e) => setHref(e.target.value)} className={classeDoCampo}>
            {ROTAS_DO_APP.map((r) => <option key={r.valor || "nenhuma"} value={r.valor}>{r.rotulo}</option>)}
          </select>
          <span className="mt-1 block font-normal text-slate-400">A tela que abre quando a pessoa toca no aviso ou no botão do e-mail.</span>
        </label>
        <div>
          <label className={rotuloCampo}>Agendar (opcional)
            <input aria-label="Agendar" type="datetime-local" value={agendar} onChange={(e) => setAgendar(e.target.value)} className={classeDoCampo} />
            <span className="mt-1 block font-normal text-slate-400">Vazio = sai agora.</span>
          </label>
          {erroAgenda ? <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{erroAgenda}</p> : null}
        </div>
        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-xs font-semibold text-slate-600">Para quem</legend>
          <div className="flex flex-wrap gap-1.5">
            {PUBLICOS.map((p) => (
              <label key={p.tipo} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", tipo === p.tipo ? "border-orange-400 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-600")}>
                <input type="radio" name="publico-do-comunicado" value={p.tipo} checked={tipo === p.tipo} onChange={() => setTipo(p.tipo)} className="sr-only" aria-label={p.rotulo} />
                {p.rotulo}
              </label>
            ))}
          </div>
          {tipo === "pessoa" ? <EscolherConta pessoa={pessoa} escolher={setPessoa} /> : null}
          {tipo === "cidade" ? <input aria-label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex.: Campinas" className={cn(classeDoCampo, "mt-0 max-w-xs")} /> : null}
          <p className="text-sm" data-testid="total-do-publico">
            {erroTotal ? <span className="text-rose-600">{erroTotal}</span>
              : carregando ? <span className="inline-flex items-center gap-1 text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Contando…</span>
              : total != null ? <span className={cn("font-semibold", paraTodos ? "text-rose-700" : "text-slate-900")}>Vai para {contas(total)}</span>
              : caminho ? null : <span className="text-slate-400">{tipo === "pessoa" ? "Escolha a pessoa." : "Escreva a cidade."}</span>}
          </p>
        </fieldset>
      </div>

      <EnviarTeste
        enviar={(userId) => {
          if (semCanal) return Promise.reject(new Error("Ligue pelo menos um canal antes de testar."));
          if (!tituloPrincipal || !textoPrincipal) return Promise.reject(new Error("Escreva o título e o texto antes de testar."));
          return enviarTeste({ user_id: userId, titulo: tituloPrincipal, texto: textoPrincipal, href: href || null, canais, ...corpoEmail });
        }}
      />
      {aviso ? <Recado {...aviso} /> : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {falta ? <span className="text-xs text-slate-500">{falta}</span> : null}
        <button type="button" disabled={problemas.length > 0 || (!pronto && !(faltamCampos.length && !semCanal))} onClick={tentarEnviar}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{quandoAgendado ? "Agendar" : "Enviar"}
        </button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => { if (!enviando) setConfirmar(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{paraTodos ? "Enviar para todo mundo?" : quandoAgendado ? "Agendar comunicado?" : "Enviar comunicado?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {paraTodos
                ? `Isto vai para todas as ${contas(n)} da ArqDoor, profissionais e clientes, por ${canaisDoTexto}. Confira o texto com calma: depois de enviado, não dá para desfazer.`
                : `Vai para ${contas(n)}, por ${canaisDoTexto}. Depois de enviado, não dá para desfazer.`}
              {quandoAgendado ? ` Sai em ${quando(quandoAgendado.toISOString())}; até lá dá para cancelar no histórico.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={enviando} onClick={(e) => { e.preventDefault(); void enviar(); }}
              className={paraTodos ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-600 hover:bg-orange-700"}>
              {quandoAgendado ? `Agendar para ${contas(n)}` : `Enviar para ${contas(n)}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Entregas({ e }: { e: Envio }) {
  const partes = [
    e.total != null ? contas(e.total) : null,
    e.canais.push && e.push_ok != null ? `Push ${numero(e.push_ok)}` : null,
    e.canais.email && e.email_ok != null ? `E-mail ${numero(e.email_ok)}` : null,
    e.falhas ? `${numero(e.falhas)} ${e.falhas === 1 ? "falha" : "falhas"}` : null,
  ].filter(Boolean);
  return <>{partes.length ? partes.join(" · ") : "—"}</>;
}

function Historico({ vez }: { vez: number }) {
  const [pagina, setPagina] = useState(1);
  const { dado, erro, deNovo } = useApi<unknown>(caminhoDosEnvios(pagina));
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  useEffect(() => { if (vez) deNovo(); }, [vez, deNovo]);
  const lista = useMemo(() => (dado ? normalizarEnvios(dado) : null), [dado]);

  const cancelar = async (e: Envio) => {
    if (!window.confirm(`Cancelar o comunicado "${e.titulo}"? Ele não sai mais.`)) return;
    setOcupado(e.id); setFalha(null);
    try { await cancelarEnvio(e.id); deNovo(); } catch (err) { setFalha((err as Error).message); } finally { setOcupado(null); }
  };

  if (erro) return <Erro msg={erro} />;
  if (!lista) return <Carregando />;
  if (!lista.envios.length) return <p className="text-sm text-slate-400">Nenhum comunicado ainda.</p>;
  const paginas = Math.max(1, Math.ceil(lista.total / (lista.por_pagina || 1)));

  return (
    <div className="space-y-3">
      {falha ? <Erro msg={falha} /> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">Quando</th>
              <th className="px-2 py-2">Comunicado</th>
              <th className="px-2 py-2">Para</th>
              <th className="px-2 py-2">Canais</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2">Entregas</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.envios.map((e) => {
              const s = STATUS[e.status] ?? { rotulo: e.status || "—", tom: "slate" as const };
              return (
                <tr key={e.id} className="border-t border-slate-100 align-top" data-testid="envio">
                  <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                    {quando(e.agendado_para ?? e.created_at)}
                    {e.criado_por ? <span className="block text-xs text-slate-400">{e.criado_por}</span> : null}
                  </td>
                  <td className="max-w-sm px-2 py-2">
                    <span className="block font-semibold text-slate-900">{e.titulo || "—"}</span>
                    <span className="line-clamp-2 text-xs text-slate-500">{e.texto}</span>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{descreverPublico(e.publico)}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">{[e.canais.sino && "Sino", e.canais.push && "Push", e.canais.email && "E-mail"].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-2 py-2"><StatusBadge label={s.rotulo} tone={s.tom} /></td>
                  <td className="px-2 py-2 text-xs text-slate-600"><Entregas e={e} /></td>
                  <td className="px-2 py-2 text-right">
                    {e.status === "agendado" ? (
                      <button type="button" disabled={ocupado === e.id} onClick={() => void cancelar(e)}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-rose-300">
                        {ocupado === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancelar"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paginas > 1 ? (
        <PaginationControls page={pagina} totalPages={paginas} onPrevious={() => setPagina((p) => Math.max(1, p - 1))} onNext={() => setPagina((p) => Math.min(paginas, p + 1))} />
      ) : null}
    </div>
  );
}

/* ---------- aba ---------- */
type SubAba = "comunicados" | "personalizadas" | "eventos" | "modelos";
const SUB_ABAS: { chave: SubAba; rotulo: string; icone: Icone; ancora: string }[] = [
  { chave: "comunicados", rotulo: "Comunicados", icone: Megaphone, ancora: "comunicados" },
  { chave: "personalizadas", rotulo: "Personalizadas", icone: Sparkles, ancora: "personalizadas" },
  { chave: "eventos", rotulo: "Eventos automáticos", icone: Zap, ancora: "eventos-automaticos" },
  { chave: "modelos", rotulo: "Modelos de e-mail", icone: FileText, ancora: "modelos-de-email" },
];
const subAbaDoEndereco = (): SubAba => {
  try {
    const h = window.location.hash.replace(/^#/, "");
    return SUB_ABAS.find((a) => a.ancora === h)?.chave ?? "comunicados";
  } catch { return "comunicados"; }
};

export function AdminNotificacoesSection() {
  const { dado, erro, deNovo } = useApi<unknown>(CAMINHO_PAINEL);
  const painel = useMemo(() => (dado ? normalizarPainel(dado) : null), [dado]);
  const [vez, setVez] = useState(0);
  const [aba, setAba] = useState<SubAba>(subAbaDoEndereco);

  const escolher = (a: SubAba) => {
    setAba(a);
    // Guarda no endereço sem pular a página nem criar entrada no histórico.
    try { window.history.replaceState(null, "", `#${SUB_ABAS.find((x) => x.chave === a)!.ancora}`); } catch { /* sem histórico: fica só no estado */ }
  };

  if (erro && !painel) return <Erro msg={erro} />;
  if (!painel) return <div className="flex justify-center py-10"><Carregando /></div>;

  return (
    <div className="mt-2 space-y-4">
      <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-0.5 text-sm" role="tablist" aria-label="Partes das notificações">
        {SUB_ABAS.map(({ chave, rotulo, icone: I }) => (
          <button key={chave} type="button" role="tab" aria-selected={aba === chave} onClick={() => escolher(chave)}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-colors", aba === chave ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
            <I className="h-4 w-4" />{rotulo}
          </button>
        ))}
      </div>

      {aba === "comunicados" ? (
        <>
          <SectionCard title="Novo comunicado" subtitle="Uma mensagem avulsa, na hora ou agendada."
            dica="Notificação e e-mail são separados: pode mandar só um dos dois, ou os dois com textos diferentes. Antes de enviar, mande um teste para a sua conta.">
            <NovoComunicado modelos={painel.modelos} aoEnviar={() => setVez((v) => v + 1)} />
          </SectionCard>
          <SectionCard title="Comunicados enviados" dica="Os agendados podem ser cancelados até a hora de sair.">
            <Historico vez={vez} />
          </SectionCard>
        </>
      ) : null}
      {aba === "personalizadas" ? (
        <SectionCard title="Notificações personalizadas" subtitle="Notificações a mais, que saem depois de algo acontecer no app."
          dica="Escolha o evento que dispara, quanto tempo depois, uma condição (se quiser) e para quem vai. Os textos e o e-mail funcionam igual aos dos eventos automáticos.">
          <Personalizadas modelos={painel.modelos} />
        </SectionCard>
      ) : null}
      {aba === "eventos" ? (
        <SectionCard title="Eventos automáticos" subtitle="O que o app manda sozinho quando algo acontece."
          dica="Sino, push e e-mail são independentes: ligue qualquer combinação. O botão da direita liga ou desliga o evento inteiro. Salva na hora. Clique no nome para mudar os textos da notificação e do e-mail.">
          <EventosAutomaticos painel={painel} recarregar={deNovo} />
        </SectionCard>
      ) : null}
      {aba === "modelos" ? (
        <SectionCard title="Modelos de e-mail" subtitle="Os modelos que existem no backend, os campos de cada um e como ficam."
          dica="Só leitura. Cada modelo é um arquivo no backend e declara os próprios campos; o formulário do e-mail nos eventos e comunicados é montado a partir deles.">
          <ModelosDeEmail reserva={painel.modelos} />
        </SectionCard>
      ) : null}
    </div>
  );
}

export default AdminNotificacoesSection;
