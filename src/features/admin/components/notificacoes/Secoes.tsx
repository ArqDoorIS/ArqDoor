import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Bell, Copy, Loader2, Lock, Mail, Paperclip, Send, Smartphone, X } from "lucide-react";
import { BuscaDePessoa, PapelIcone, type PessoaEscolhida } from "../AdminPunicoesSection";
import { cn } from "../../utils";
import { CamposDoModelo, ChipsDeVariaveis, Interruptor, classeDoCampo, devolverCursor, inserirNoCursor } from "./CamposDoModelo";
import { PreviaDoEmail, PreviaDoPush } from "./Previas";
import {
  MOTIVO_DO_TRAVADO, VARIAVEIS_DO_EMAIL, comExemplos, manterCamposComuns, modeloOuVazio, modelosComMotivo, nomeDoAnexo,
  problemasDoTexto, problemasDosCampos, valoresComExemplos, valoresParaEnviar,
  type Canais, type Modelo, type PedidoDePrevia, type ValoresDosCampos, type Variavel,
} from "./api";

/**
 * Peças da aba Notificações usadas em mais de um lugar (eventos automáticos, comunicados e
 * notificações personalizadas): as duas seções separadas, "Notificação (sino e push)" e "E-mail",
 * o campo de texto com variáveis, o envio de teste e a conferência de variáveis que vazariam.
 */

const rotuloCampo = "block text-xs font-semibold text-slate-600";
export type Icone = ComponentType<{ className?: string }>;
export type Aviso = { texto: string; ruim?: boolean };

/* ---------- peças ---------- */
export function BotaoDoCanal({ ligado, rotulo, icone: I, mudar, apagado, travado }: {
  ligado: boolean; rotulo: string; icone: Icone; mudar: () => void; apagado?: boolean;
  /** Motivo de não poder mudar (vira a dica). */
  travado?: string;
}) {
  return (
    <button
      type="button" aria-pressed={ligado} onClick={mudar} disabled={!!travado}
      title={travado ?? (ligado ? `${rotulo} ligado. Clique para desligar.` : `${rotulo} desligado. Clique para ligar.`)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed",
        ligado ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-400 hover:text-slate-600",
        apagado && "opacity-50",
      )}
    >
      <I className="h-3 w-3" />{rotulo}{travado && ligado ? <Lock className="h-2.5 w-2.5" aria-hidden /> : null}
    </button>
  );
}

export function Recado({ texto, ruim }: Aviso) {
  return <p role="status" className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", ruim ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>{texto}</p>;
}

/** Bloco com título, liga/desliga próprio e o conteúdo (só aparece ligado). */
export function Secao({ titulo, icone: I, ligado, mudar, desligadoTexto, children, testid, travado }: {
  titulo: string; icone: Icone; ligado: boolean; mudar: () => void; desligadoTexto: string; children: ReactNode; testid: string; travado?: string;
}) {
  return (
    <section className={cn("rounded-2xl border", ligado ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/60")} data-testid={testid}>
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg", ligado ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-400")}><I className="h-3.5 w-3.5" /></span>
        <h4 className="text-sm font-semibold text-slate-900">{titulo}</h4>
        <span className="ml-auto text-[11px] font-semibold text-slate-500">{ligado ? "Ligado" : "Desligado"}</span>
        {travado ? <Lock className="h-3.5 w-3.5 text-slate-400" aria-label={travado} /> : null}
        <Interruptor ligado={ligado} mudar={mudar} rotulo={titulo} travado={travado} />
      </header>
      <div className="p-3">{ligado ? children : <p className="text-xs text-slate-500">{desligadoTexto}</p>}</div>
    </section>
  );
}

/** Tarja exibida quando a pessoa se descadastrou dos comunicados. */
function TarjaDescadastrada({ em }: { em: string }) {
  const diaBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div role="alert" data-testid="tarja-descadastrada" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
      <span>Descadastrado dos comunicados em {diaBr(em)}.</span>
    </div>
  );
}

/** Escolhe uma conta pela mesma busca da aba Punições. */
export function EscolherConta({ pessoa, escolher }: { pessoa: PessoaEscolhida | null; escolher: (p: PessoaEscolhida | null) => void }) {
  if (!pessoa) return <BuscaDePessoa escolher={escolher} />;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2" data-testid="conta-escolhida">
        <b className="text-sm text-slate-900">{pessoa.nome || `#${pessoa.id}`}</b>
        <PapelIcone papel={pessoa.papel} />
        <span className="text-xs text-slate-400">#{pessoa.id}</span>
        <button type="button" onClick={() => escolher(null)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
          <X className="h-3 w-3" />Trocar
        </button>
      </div>
      {pessoa.comunicados_descadastrado_em ? (
        <TarjaDescadastrada em={pessoa.comunicados_descadastrado_em} />
      ) : null}
    </div>
  );
}

type Resultado = { sino?: unknown; push?: unknown; email?: unknown; falhou?: unknown };
const NOMES_DOS_CANAIS: [keyof Canais, string][] = [["sino", "Sino"], ["push", "Push"], ["email", "E-mail"]];
const houveFalha = (f: unknown) => (Array.isArray(f) ? f.length > 0 : typeof f === "number" ? f > 0 : Boolean(f));

/** O que o backend contou do teste: `resultado` por canal (comunicado e personalizada) ou só os `canais` (evento). */
function ResultadoDoTeste({ nome, resposta }: { nome: string; resposta: any }) {
  const r: Resultado | null = resposta?.resultado && typeof resposta.resultado === "object" ? resposta.resultado : null;
  const canais: Partial<Canais> | null = resposta?.canais && typeof resposta.canais === "object" ? resposta.canais : null;
  const usados = NOMES_DOS_CANAIS.filter(([k]) => (canais ? canais[k] : r ? r[k] !== undefined : false));
  return (
    <div role="status" className="space-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900" data-testid="resultado-do-teste">
      <p className="font-semibold">Teste enviado para {nome}.</p>
      {r ? (
        <ul className="flex flex-wrap gap-1.5">
          {(usados.length ? usados : NOMES_DOS_CANAIS).map(([k, rotulo]) => (
            <li key={k} className={cn("rounded-full px-2 py-0.5 font-semibold ring-1", r[k] ? "bg-white text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200")}>
              {rotulo}: {r[k] ? "chegou" : "não chegou"}
            </li>
          ))}
        </ul>
      ) : usados.length ? <p>Pelos canais: {usados.map(([, rotulo]) => rotulo).join(", ")}.</p> : null}
      {r && houveFalha(r.falhou) ? <p className="font-semibold text-rose-700">Algum canal falhou ao enviar. Sem push: a conta pode não ter aparelho com o app; sem e-mail: confira o endereço.</p> : null}
    </div>
  );
}

export function EnviarTeste({ enviar, nota }: { enviar: (userId: number) => Promise<unknown>; nota?: ReactNode }) {
  const [pessoa, setPessoa] = useState<PessoaEscolhida | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [resposta, setResposta] = useState<{ nome: string; corpo: unknown } | null>(null);
  const mandar = async () => {
    if (!pessoa) return;
    setOcupado(true); setAviso(null); setResposta(null);
    try {
      const corpo = await enviar(pessoa.id);
      setResposta({ nome: pessoa.nome || `#${pessoa.id}`, corpo });
    } catch (e) { setAviso({ texto: (e as Error).message, ruim: true }); } finally { setOcupado(false); }
  };
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3" data-testid="enviar-teste">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Enviar teste para mim ou para uma conta</p>
      <p className="text-xs text-slate-500">Busque a sua conta do app (ou a de alguém do time). Só essa conta recebe, pelos canais ligados.</p>
      {nota}
      <EscolherConta pessoa={pessoa} escolher={(p) => { setPessoa(p); setAviso(null); setResposta(null); }} />
      {aviso ? <Recado {...aviso} /> : null}
      {resposta ? <ResultadoDoTeste nome={resposta.nome} resposta={resposta.corpo} /> : null}
      <div className="flex justify-end">
        <button type="button" disabled={!pessoa || ocupado} onClick={() => void mandar()}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300 disabled:opacity-40">
          {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Enviar teste
        </button>
      </div>
    </div>
  );
}

/** Campo de texto com as variáveis embaixo; o chip entra onde está o cursor. */
export function TextoComVariaveis({ rotulo, valor, mudar, variaveis, placeholder, longo, ajuda, maxLength, permitidas }: {
  rotulo: string; valor: string; mudar: (v: string) => void; variaveis: Variavel[]; placeholder?: string; longo?: boolean; ajuda?: string; maxLength?: number;
  permitidas: string[];
}) {
  const problemas = problemasDoTexto(valor, permitidas);
  const invalido = problemas.length > 0 || undefined;
  const [el, setEl] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const inserir = (chave: string) => {
    const { novo, pos } = inserirNoCursor(el, valor, chave);
    mudar(novo);
    devolverCursor(el, pos);
  };
  return (
    <div>
      <label className={rotuloCampo}>{rotulo}
        {longo ? (
          <textarea ref={setEl} aria-label={rotulo} aria-invalid={invalido} value={valor} onChange={(e) => mudar(e.target.value)} rows={4} placeholder={placeholder} maxLength={maxLength} className={cn(classeDoCampo, "leading-6", invalido && "border-rose-400")} />
        ) : (
          <input ref={setEl} aria-label={rotulo} aria-invalid={invalido} value={valor} onChange={(e) => mudar(e.target.value)} placeholder={placeholder} maxLength={maxLength} className={cn(classeDoCampo, invalido && "border-rose-400")} />
        )}
      </label>
      <ChipsDeVariaveis variaveis={variaveis} inserir={inserir} rotulo={`Variáveis para ${rotulo}`} />
      {problemas.map((p) => <p key={p} className="mt-0.5 text-[11px] font-semibold text-rose-600" data-testid="variavel-invalida">{p}</p>)}
      {ajuda ? <p className="mt-0.5 text-[11px] text-slate-400">{ajuda}</p> : null}
    </div>
  );
}

/* ---------- as duas seções: notificação e e-mail ---------- */
export function SecaoNotificacao({ canais, mudarCanais, titulo, mudarTitulo, texto, mudarTexto, variaveis, originalTitulo, originalTexto, previa, travados = [], proibida }: {
  canais: Canais; mudarCanais: (c: Canais) => void;
  titulo: string; mudarTitulo: (v: string) => void; texto: string; mudarTexto: (v: string) => void;
  variaveis: Variavel[]; originalTitulo?: string; originalTexto?: string; previa: { titulo: string; texto: string };
  /** Canais que não desligam (estão ligados e a conta precisa deles). */
  travados?: (keyof Canais)[];
  /** Motivo de sino e push não poderem ser ligados (e-mail de acesso à conta). */
  proibida?: string;
}) {
  const ligada = canais.sino || canais.push;
  const trava = (c: keyof Canais) => (proibida && !canais[c] ? proibida : travados.includes(c) && canais[c] ? MOTIVO_DO_TRAVADO[c] : undefined);
  const secaoTravada = proibida && !ligada ? proibida : trava("sino") ?? trava("push");
  const permitidas = variaveis.map((v) => v.chave);
  return (
    <Secao titulo="Notificação (sino e push)" icone={Bell} testid="secao-notificacao" ligado={ligada} travado={secaoTravada}
      mudar={() => mudarCanais({ ...canais, sino: !ligada, push: !ligada })}
      desligadoTexto={proibida ? `${proibida}: o link ou código não pode aparecer no sino nem no push.` : "Não aparece no sino do app nem chega como push no celular."}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Canais da notificação">
            <BotaoDoCanal rotulo="Sino" icone={Bell} ligado={canais.sino} travado={trava("sino")} mudar={() => mudarCanais({ ...canais, sino: !canais.sino })} />
            <BotaoDoCanal rotulo="Push" icone={Smartphone} ligado={canais.push} travado={trava("push")} mudar={() => mudarCanais({ ...canais, push: !canais.push })} />
            <span className="text-[11px] text-slate-400">Sino = lista de avisos dentro do app. Push = aviso no celular.</span>
          </div>
          <TextoComVariaveis rotulo="Título da notificação" valor={titulo} mudar={mudarTitulo} variaveis={variaveis} maxLength={160} permitidas={permitidas}
            placeholder={originalTitulo ?? "Ex.: Novidade no app"} ajuda={originalTitulo !== undefined ? "Vazio = usa o texto original do evento." : undefined} />
          <TextoComVariaveis rotulo="Texto da notificação" valor={texto} mudar={mudarTexto} variaveis={variaveis} longo maxLength={500} permitidas={permitidas}
            placeholder={originalTexto ?? "O que a pessoa vai ler"} ajuda={originalTexto !== undefined ? "Vazio = usa o texto original do evento." : undefined} />
        </div>
        <div className="space-y-1 md:sticky md:top-2 md:self-start">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">No celular</p>
          <PreviaDoPush titulo={previa.titulo} texto={previa.texto} />
          {variaveis.length ? <p className="text-[11px] text-slate-400">Com valores de exemplo no lugar das variáveis.</p> : null}
        </div>
      </div>
    </Secao>
  );
}

/** O assunto é o campo "assunto" do modelo; não existe assunto avulso. */
export type EstadoDoEmail = { modelo: string; campos: ValoresDosCampos };

export type Anexos = { possiveis: string[]; marcados: string[]; mudar: (a: string[]) => void };

export function SecaoEmail({ ligado, mudarLigado, modelos: todos, estado, mudar, variaveis, notificacao, href, mostrarErros, tipo, anexos, travado, doEmail }: {
  ligado: boolean; mudarLigado: () => void; modelos: Modelo[]; estado: EstadoDoEmail; mudar: (e: EstadoDoEmail) => void;
  /** As variáveis deste envio (evento, comunicado ou personalizada): filtram os modelos e os chips. */
  variaveis: Variavel[]; notificacao: { titulo: string; texto: string }; href: string | null; mostrarErros: boolean;
  /** Tipo do evento: o servidor usa os exemplos dele na prévia. */
  tipo?: string; anexos?: Anexos; travado?: string;
  /** Variáveis que valem nos campos do e-mail (comunicado tem menos). */
  doEmail?: string[];
}) {
  const chavesDoEnvio = variaveis.map((v) => v.chave);
  const opcoes = modelosComMotivo(todos, chavesDoEnvio);
  const modeloEscolhido = todos.find((m) => m.chave === estado.modelo);
  const modelo = modeloOuVazio(modeloEscolhido);
  const motivoDoEscolhido = opcoes.find((o) => o.modelo.chave === estado.modelo)?.motivo ?? null;
  const permitidas = doEmail ?? Array.from(new Set([...chavesDoEnvio, ...VARIAVEIS_DO_EMAIL]));
  // Campo vazio que o modelo preenche com {titulo}/{texto} recebe o da notificação.
  const reservas = { titulo: notificacao.titulo, texto: notificacao.texto, assunto: notificacao.titulo };
  const vars = useMemo(() => Object.fromEntries(variaveis.map((v) => [v.chave, v.exemplo])), [variaveis]);
  const camposAEnviar = valoresParaEnviar(estado.campos, modelo);
  const pedido = useMemo<PedidoDePrevia | null>(() => (ligado && estado.modelo ? {
    modelo: estado.modelo, ...(tipo ? { tipo } : {}),
    email_campos: valoresComExemplos(camposAEnviar, variaveis),
    titulo: comExemplos(notificacao.titulo, variaveis), texto: comExemplos(notificacao.texto, variaveis),
    href, ...(variaveis.length ? { vars } : {}),
  } : null), [ligado, estado.modelo, tipo, JSON.stringify(camposAEnviar), notificacao.titulo, notificacao.texto, href, variaveis, vars]); // eslint-disable-line react-hooks/exhaustive-deps

  // Só copia para os campos que o modelo tem.
  const copiaveis = (["assunto", "titulo", "texto"] as const).filter((k) => modelo.campos.some((c) => c.chave === k));
  const copiar = () => mudar({
    ...estado,
    campos: { ...estado.campos, ...Object.fromEntries(copiaveis.map((k) => [k, k === "texto" ? notificacao.texto : notificacao.titulo])) },
  });

  return (
    <Secao titulo="E-mail" icone={Mail} testid="secao-email" ligado={ligado} mudar={mudarLigado} desligadoTexto="Não manda e-mail." travado={ligado ? travado : undefined}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className={cn(rotuloCampo, "min-w-[180px] flex-1")}>Modelo de e-mail
              <select aria-label="Modelo de e-mail" value={estado.modelo}
                onChange={(e) => {
                  const novo = todos.find((m) => m.chave === e.target.value);
                  mudar({ ...estado, modelo: e.target.value, campos: manterCamposComuns(estado.campos, modeloOuVazio(novo)) });
                }}
                className={classeDoCampo}>
                <option value="">{opcoes.length ? "Escolha um modelo" : "Nenhum modelo"}</option>
                {opcoes.map(({ modelo: m, motivo }) => (
                  <option key={m.chave} value={m.chave} disabled={!!motivo && m.chave !== estado.modelo}>{m.rotulo}{motivo ? ` (${motivo})` : ""}</option>
                ))}
                {modeloEscolhido && !opcoes.some((o) => o.modelo.chave === modeloEscolhido.chave) ? <option value={modeloEscolhido.chave}>{modeloEscolhido.rotulo}</option> : null}
              </select>
            </label>
            {copiaveis.length ? (
              <button type="button" onClick={copiar} title="Põe o título e o texto da notificação nos campos do e-mail, para editar a partir dali"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:ring-orange-300">
                <Copy className="h-3.5 w-3.5" />Copiar da notificação
              </button>
            ) : null}
          </div>
          {modeloEscolhido?.descricao ? <p className="text-xs text-slate-500">{modeloEscolhido.descricao}</p> : null}
          {modeloEscolhido?.status === "erro" ? <p className="text-xs font-semibold text-rose-600">Este modelo está com erro no backend: {modeloEscolhido.erro || "sem detalhe"}. Escolha outro.</p> : null}
          {motivoDoEscolhido ? <p className="text-xs font-semibold text-rose-600" data-testid="modelo-incompativel">Este modelo {motivoDoEscolhido}. Escolha outro.</p> : null}
          <CamposDoModelo modelo={modelo} valores={estado.campos} mudar={(campos) => mudar({ ...estado, campos })}
            variaveis={variaveis} mostrarErros={mostrarErros} reservas={reservas} permitidas={permitidas} />
          {anexos && anexos.possiveis.length ? (
            <fieldset className="rounded-xl border border-slate-200 p-3" data-testid="anexos">
              <legend className="flex items-center gap-1 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Paperclip className="h-3.5 w-3.5" />Anexos</legend>
              <div className="space-y-1.5">
                {anexos.possiveis.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={anexos.marcados.includes(a)} className="accent-orange-600"
                      onChange={(e) => anexos.mudar(e.target.checked ? [...anexos.marcados, a] : anexos.marcados.filter((x) => x !== a))} />
                    {nomeDoAnexo(a)}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Vão junto com o e-mail deste evento, quando existirem.</p>
            </fieldset>
          ) : null}
        </div>
        <div className="space-y-1 lg:sticky lg:top-2 lg:self-start">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Prévia do e-mail</p>
          <PreviaDoEmail pedido={pedido} />
        </div>
      </div>
    </Secao>
  );
}

/** Tudo o que ia sair sem trocar, nos textos da notificação e do e-mail. Bloqueia salvar/enviar. */
export function variaveisComProblema(p: {
  titulo: string; texto: string; email: EstadoDoEmail; modelos: Modelo[]; daNotificacao: string[];
  /** As que valem nos campos do e-mail (padrão: as da notificação + as embutidas do backend). */
  doEmail?: string[];
}) {
  const doEmail = p.doEmail ?? Array.from(new Set([...p.daNotificacao, ...VARIAVEIS_DO_EMAIL]));
  return [
    ...problemasDoTexto(p.titulo, p.daNotificacao), ...problemasDoTexto(p.texto, p.daNotificacao),
    ...problemasDosCampos(p.email.campos, modeloOuVazio(p.modelos.find((m) => m.chave === p.email.modelo)), doEmail),
  ];
}

export function AvisoDeVariaveis({ problemas }: { problemas: string[] }) {
  if (!problemas.length) return null;
  return (
    <p role="alert" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700" data-testid="aviso-de-variaveis">
      {problemas.length === 1 ? "Uma variável ia sair sem trocar" : `${problemas.length} variáveis iam sair sem trocar`}: corrija o que está em vermelho antes de continuar.
    </p>
  );
}
