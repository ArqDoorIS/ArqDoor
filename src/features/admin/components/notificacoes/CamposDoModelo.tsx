import { useRef, useState } from "react";
import { ImageOff, Lock } from "lucide-react";
import { cn } from "../../utils";
import {
  NOME_DO_TIPO, camposFaltando, podeFicarVazio, problemasDoTexto, vazio, vazioDeProposito,
  type CampoDoModelo, type Modelo, type ValorDoCampo, type ValoresDosCampos, type Variavel,
} from "./api";

/**
 * Formulário de um modelo de e-mail, montado a partir dos `campos` que o modelo declara no backend.
 * Cada tipo vira um controle: texto, texto longo, link, cor, imagem por link, liga/desliga e lista de opções.
 * Campo vazio = usa o padrão do modelo (aparece como placeholder).
 */

export const classeDoCampo = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-orange-500";

/** `travado`: não muda, e o texto vira a dica ao passar o mouse. */
export function Interruptor({ ligado, mudar, rotulo, travado }: { ligado: boolean; mudar: () => void; rotulo: string; travado?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={ligado} aria-label={rotulo} onClick={mudar} disabled={!!travado} title={travado}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60", ligado ? "bg-orange-600" : "bg-slate-300")}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", ligado ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

type Editavel = HTMLInputElement | HTMLTextAreaElement;

/** Põe `{chave}` onde está o cursor (ou no fim) e devolve o texto novo e a posição do cursor. */
export function inserirNoCursor(el: Editavel | null, atual: string, chave: string) {
  const ini = el?.selectionStart ?? atual.length;
  const fim = el?.selectionEnd ?? atual.length;
  const marca = `{${chave}}`;
  return { novo: atual.slice(0, ini) + marca + atual.slice(fim), pos: ini + marca.length };
}

export function devolverCursor(el: Editavel | null, pos: number) {
  setTimeout(() => { el?.focus(); el?.setSelectionRange(pos, pos); }, 0);
}

/** Botões das variáveis. Não roubam o foco do campo, para o cursor continuar onde estava. */
export function ChipsDeVariaveis({ variaveis, inserir, rotulo }: { variaveis: Variavel[]; inserir: (chave: string) => void; rotulo?: string }) {
  if (!variaveis.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1" role="group" aria-label={rotulo ?? "Variáveis"}>
      {variaveis.map((v) => (
        <button key={v.chave} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => inserir(v.chave)}
          title={`${v.descricao || v.chave}${v.exemplo ? ` (ex.: ${v.exemplo})` : ""}${v.obrigatoria ? ". Obrigatória: precisa aparecer no que sai." : ""}`}
          className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold hover:bg-orange-50 hover:text-orange-800",
            v.obrigatoria ? "bg-amber-50 text-amber-900 ring-1 ring-amber-300" : "bg-slate-100 text-slate-700")}>
          {v.obrigatoria ? <Lock className="h-3 w-3" aria-hidden /> : null}{`{${v.chave}}`}
          {v.obrigatoria ? <span className="font-sans text-[10px] font-bold">obrigatória</span> : null}
        </button>
      ))}
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const textoDoPadrao = (c: CampoDoModelo) => {
  if (c.padrao == null || c.padrao === "") return "";
  if (typeof c.padrao === "boolean") return c.padrao ? "ligado" : "desligado";
  if (c.tipo === "opcoes") return c.opcoes.find((o) => o.valor === c.padrao)?.rotulo ?? c.padrao;
  return c.padrao;
};

function Miniatura({ src, rotulo }: { src: string; rotulo: string }) {
  const [quebrou, setQuebrou] = useState<string | null>(null);
  if (!src) return null;
  if (quebrou === src) return <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400" title="Não abriu essa imagem"><ImageOff className="h-4 w-4" /></span>;
  return <img src={src} alt={`Miniatura: ${rotulo}`} onError={() => setQuebrou(src)} className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover" />;
}

function UmCampo({ campo: c, valor, mudar, variaveis, mostrarErro, reserva, permitidas }: {
  campo: CampoDoModelo; valor: ValorDoCampo | undefined; mudar: (v: ValorDoCampo | undefined) => void; variaveis: Variavel[]; mostrarErro: boolean;
  /** Texto que entra se o campo ficar vazio (ex.: o da notificação). */
  reserva?: string;
  /** Variáveis que existem aqui; com isso, o campo aponta {x} que ia sair sem trocar. */
  permitidas?: string[];
}) {
  const ref = useRef<Editavel | null>(null);
  const [mexeu, setMexeu] = useState(false);
  const texto = typeof valor === "string" ? valor : "";
  const padrao = textoDoPadrao(c);
  const id = `campo-email-${c.chave}`;
  const faltando = c.obrigatorio && c.tipo !== "booleano" && vazio(valor) && !padrao && !reserva;
  const deProposito = vazioDeProposito(c, valor);
  /** Apagar tudo digitando volta ao padrão; só "Deixar vazio" grava "" de propósito. */
  const digitar = (v: string) => mudar(v === "" ? undefined : v);
  const erro = faltando && (mostrarErro || mexeu);
  const vazamentos = permitidas && typeof valor === "string" ? problemasDoTexto(valor, permitidas, c.aceita_variaveis) : [];
  const comChips = c.aceita_variaveis && variaveis.length > 0 && ["texto", "texto_longo", "url", "imagem_url"].includes(c.tipo);
  const comum = {
    id, "aria-label": c.rotulo, "aria-invalid": erro || vazamentos.length > 0 || undefined, "aria-required": c.obrigatorio || undefined,
    value: texto,
    placeholder: deProposito ? "Vazio de propósito: não aparece no e-mail" : reserva ? `Vazio = usa o da notificação: ${reserva}` : padrao ? `Padrão: ${padrao}` : c.obrigatorio ? "Obrigatório" : "Opcional",
    onBlur: () => setMexeu(true),
    className: cn(classeDoCampo, erro && "border-rose-400 focus:border-rose-500"),
  };
  const inserir = (chave: string) => {
    const { novo, pos } = inserirNoCursor(ref.current, texto, chave);
    mudar(novo);
    devolverCursor(ref.current, pos);
  };

  let controle;
  switch (c.tipo) {
    case "texto_longo":
      controle = <textarea {...comum} ref={(el) => { ref.current = el; }} rows={3} onChange={(e) => digitar(e.target.value)} className={cn(comum.className, "leading-6")} />;
      break;
    case "url":
      controle = <input {...comum} ref={(el) => { ref.current = el; }} type="url" inputMode="url" onChange={(e) => digitar(e.target.value)} />;
      break;
    case "imagem_url":
      controle = (
        <div className="flex items-center gap-2">
          <input {...comum} ref={(el) => { ref.current = el; }} type="url" inputMode="url" onChange={(e) => digitar(e.target.value)} />
          {!deProposito ? <Miniatura src={texto.trim() || (typeof c.padrao === "string" ? c.padrao : "")} rotulo={c.rotulo} /> : null}
        </div>
      );
      break;
    case "cor": {
      const cor = HEX.test(texto) ? texto : typeof c.padrao === "string" && HEX.test(c.padrao) ? c.padrao : "#000000";
      controle = (
        <div className="mt-1 flex items-center gap-2">
          <input type="color" aria-label={`${c.rotulo}: escolher no seletor`} value={cor} onChange={(e) => mudar(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" />
          <input {...comum} className={cn(comum.className, "mt-0 max-w-[140px] font-mono")} maxLength={7} onChange={(e) => digitar(e.target.value)} />
          {texto && !HEX.test(texto) ? <span className="text-[11px] text-amber-700">Use o formato #RRGGBB.</span> : null}
        </div>
      );
      break;
    }
    case "booleano": {
      const ligado = typeof valor === "boolean" ? valor : c.padrao === true;
      controle = (
        <div className="mt-1 flex items-center gap-2">
          <Interruptor ligado={ligado} rotulo={c.rotulo} mudar={() => mudar(!ligado)} />
          <span className="text-xs font-normal text-slate-500">{ligado ? "Ligado" : "Desligado"}{typeof valor !== "boolean" ? " (padrão)" : ""}</span>
        </div>
      );
      break;
    }
    case "opcoes":
      controle = (
        <select id={id} aria-label={c.rotulo} aria-invalid={erro || undefined} value={texto} onChange={(e) => mudar(e.target.value || undefined)} onBlur={() => setMexeu(true)}
          className={cn(classeDoCampo, erro && "border-rose-400")}>
          <option value="">{padrao ? `Padrão: ${padrao}` : c.obrigatorio ? "Escolha uma opção" : "Nenhuma"}</option>
          {c.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
      );
      break;
    default:
      controle = <input {...comum} ref={(el) => { ref.current = el; }} type="text" onChange={(e) => digitar(e.target.value)} />;
  }

  return (
    <div data-testid={`campo-${c.chave}`} data-tipo={c.tipo}>
      <label htmlFor={c.tipo === "booleano" || c.tipo === "cor" ? undefined : id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {c.rotulo}
        {c.obrigatorio ? <span className="text-rose-600" title="Obrigatório">*</span> : null}
        <span className="text-[10px] font-normal text-slate-400">{NOME_DO_TIPO[c.tipo] ?? c.tipo}</span>
        {deProposito ? <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200" data-testid="vazio-de-proposito">vazio de propósito</span> : null}
        <span className="ml-auto flex items-center gap-2">
          {podeFicarVazio(c) && !deProposito ? (
            <button type="button" onClick={() => mudar("")} title="Manda o campo vazio: o pedaço some do e-mail (sem saudação, sem rodapé...)"
              className="text-[10px] font-semibold text-slate-400 hover:text-orange-700">Deixar vazio</button>
          ) : null}
          {(!vazio(valor) || deProposito) && c.tipo !== "booleano" ? (
            <button type="button" onClick={() => mudar(undefined)} className="text-[10px] font-semibold text-slate-400 hover:text-orange-700">usar padrão</button>
          ) : null}
        </span>
      </label>
      {controle}
      {comChips ? <ChipsDeVariaveis variaveis={variaveis} inserir={inserir} rotulo={`Variáveis para ${c.rotulo}`} /> : null}
      {erro ? <p className="mt-0.5 text-[11px] font-semibold text-rose-600">Preencha este campo: o modelo não tem valor padrão para ele.</p> : null}
      {vazamentos.map((v) => <p key={v} className="mt-0.5 text-[11px] font-semibold text-rose-600" data-testid="variavel-invalida">{v}</p>)}
      {c.ajuda ? <p className="mt-0.5 text-[11px] text-slate-400">{c.ajuda}</p> : null}
    </div>
  );
}

/**
 * O que o campo vazio vira quando o padrão do modelo usa {titulo}/{texto}: o texto da notificação.
 * Padrão fixo (ex.: "Redefinição de senha - ArqDoor") não tem reserva: fica o padrão.
 */
function reservaDe(c: CampoDoModelo, reservas: Record<string, string>) {
  const p = typeof c.padrao === "string" ? c.padrao : "";
  if (!/\{(titulo|texto)\}/.test(p)) return undefined;
  const r = p.replace(/\{(titulo|texto)\}/g, (_m, k: string) => reservas[k] || `{${k}}`).trim();
  return r || undefined;
}

export function CamposDoModelo({ modelo, valores, mudar, variaveis = [], mostrarErros = false, reservas = {}, permitidas }: {
  modelo: Modelo | null | undefined; valores: ValoresDosCampos; mudar: (v: ValoresDosCampos) => void;
  variaveis?: Variavel[]; mostrarErros?: boolean;
  /** Valor usado quando o campo fica vazio, por chave (ex.: titulo/texto da notificação). */
  reservas?: Record<string, string>;
  /** Variáveis que existem aqui (ver problemasDoTexto). Sem isso, não confere. */
  permitidas?: string[];
}) {
  if (!modelo) return null;
  if (!modelo.campos.length) return <p className="text-xs text-slate-400">Este modelo não tem campos para preencher.</p>;
  const faltam = camposFaltando(valores, modelo, reservas);
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3" data-testid="campos-do-modelo">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Campos do e-mail{modelo.chave ? ` (modelo “${modelo.rotulo}”)` : ""} <span className="font-normal normal-case tracking-normal text-slate-400">· vazio usa o padrão · <span className="text-rose-600">*</span> obrigatório</span>
      </p>
      {modelo.campos.map((c) => (
        <UmCampo key={c.chave} campo={c} valor={valores[c.chave]} variaveis={variaveis} mostrarErro={mostrarErros} reserva={reservaDe(c, reservas)} permitidas={permitidas}
          mudar={(v) => {
            const novo = { ...valores };
            if (v === undefined) delete novo[c.chave]; else novo[c.chave] = v;
            mudar(novo);
          }} />
      ))}
      {mostrarErros && faltam.length ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
          Falta preencher: {faltam.map((c) => c.rotulo).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
