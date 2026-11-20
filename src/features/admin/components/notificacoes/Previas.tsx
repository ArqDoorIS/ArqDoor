import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Bell, MailX } from "lucide-react";
import { cn } from "../../utils";
import { Carregando, Erro } from "../analise/comum";
import { SOBRA, pedirPrevia, sobrasDoHtml, sobrasDoTexto, type PedidoDePrevia } from "./api";

/** Chip de aviso: algo saiu sem trocar ({x}, {{x}}, undefined, null). */
export function AvisoDeSobra({ sobras }: { sobras: string[] }) {
  if (!sobras.length) return null;
  return (
    <p role="status" data-testid="variavel-sem-valor" className="flex flex-wrap items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
      <AlertTriangle className="h-3.5 w-3.5" />Variável sem valor:
      {sobras.map((x) => <code key={x} className="rounded bg-rose-100 px-1 font-mono">{x}</code>)}
    </p>
  );
}

/** O texto com as sobras marcadas em vermelho. */
export function ComDestaque({ texto }: { texto: string }) {
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const m of Array.from(texto.matchAll(new RegExp(SOBRA.source, "g")))) {
    const i = m.index ?? 0;
    if (i > ultimo) partes.push(texto.slice(ultimo, i));
    partes.push(<mark key={i} className="rounded bg-rose-100 px-0.5 text-rose-700">{m[0]}</mark>);
    ultimo = i + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}

/** Notificação como aparece na tela do celular. */
export function PreviaDoPush({ titulo, texto }: { titulo: string; texto: string }) {
  const sobras = sobrasDoTexto(`${titulo}\n${texto}`);
  return (
    <div className="space-y-1.5">
    <div className="rounded-[28px] bg-slate-900 p-2.5" data-testid="previa-push">
      <div className="rounded-[22px] bg-gradient-to-b from-slate-700 to-slate-800 px-3 pb-6 pt-3">
        <p className="mb-3 text-center text-[11px] font-semibold text-white/70">9:41</p>
        <div className="rounded-2xl bg-white/90 px-3 py-2 shadow">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-orange-600 text-white"><Bell className="h-2.5 w-2.5" /></span>
            ArqDoor <span className="ml-auto normal-case tracking-normal">agora</span>
          </div>
          <p className="text-[13px] font-semibold leading-snug text-slate-900">{titulo ? <ComDestaque texto={titulo} /> : "Sem título"}</p>
          <p className="line-clamp-4 whitespace-pre-line text-[12px] leading-snug text-slate-700">{texto ? <ComDestaque texto={texto} /> : "Sem texto"}</p>
        </div>
      </div>
    </div>
    <AvisoDeSobra sobras={sobras} />
    </div>
  );
}

/**
 * O HTML do e-mail num iframe sem scripts (sandbox vazio). Altura e largura fixas em px:
 * iframe sem altura explícita sai com 150px ou em branco em captura de tela.
 */
export function MolduraDoEmail({ html, altura = 420, largura }: { html: string; altura?: number; largura?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-100">
      <iframe
        title="Prévia do e-mail" sandbox="" srcDoc={html}
        style={{ height: altura, width: largura ?? "100%", minWidth: largura }}
        className="mx-auto block border-0 bg-white"
      />
    </div>
  );
}

function Vazio({ altura, children }: { altura: number; children: ReactNode }) {
  return <div style={{ minHeight: Math.min(altura, 160) }} className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500">{children}</div>;
}

/** Pede a prévia ao servidor (com uma pausa enquanto digita) e mostra. */
export function PreviaDoEmail({ pedido, altura = 420, largura, comTexto }: { pedido: PedidoDePrevia | null; altura?: number; largura?: number; comTexto?: boolean }) {
  const chave = pedido ? JSON.stringify(pedido) : "";
  const [estado, setEstado] = useState<{ chave: string; html: string | null; texto: string | null; assunto: string | null; erro: string | null } | null>(null);
  useEffect(() => {
    if (!chave) { setEstado(null); return; }
    let vivo = true;
    const t = setTimeout(() => {
      pedirPrevia(JSON.parse(chave))
        .then((p) => { if (vivo) setEstado({ chave, html: p.html, texto: p.texto, assunto: p.assunto, erro: null }); })
        .catch((e) => { if (vivo) setEstado({ chave, html: null, texto: null, assunto: null, erro: (e as Error).message }); });
    }, 400);
    return () => { vivo = false; clearTimeout(t); };
  }, [chave]);
  if (!pedido) return <Vazio altura={altura}>Sem prévia.</Vazio>;
  if (!estado) return <div style={{ height: altura }} className="flex items-center justify-center rounded-lg border border-slate-200"><Carregando /></div>;
  if (estado.erro) return <Erro msg={`Não deu para montar a prévia: ${estado.erro}`} />;
  if (!estado.html) return <Vazio altura={altura}><MailX className="h-4 w-4" />Este modelo não manda e-mail.</Vazio>;
  const sobras = Array.from(new Set([...sobrasDoHtml(estado.html), ...sobrasDoTexto(estado.texto ?? ""), ...sobrasDoTexto(estado.assunto ?? "")]));
  return (
    <div className={cn("space-y-2", estado.chave !== chave && "opacity-60 transition-opacity")}>
      {/* O assunto que o servidor montou, igual ao que chega na caixa de entrada. */}
      <p className="truncate rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600" data-testid="assunto-da-previa">
        <b>Assunto:</b> {estado.assunto ? <ComDestaque texto={estado.assunto} /> : "—"}
      </p>
      <AvisoDeSobra sobras={sobras} />
      <MolduraDoEmail html={estado.html} altura={altura} largura={largura} />
      {comTexto ? (
        <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-semibold text-slate-700">Versão só texto</summary>
          {estado.texto
            ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans" data-testid="texto-puro"><ComDestaque texto={estado.texto} /></pre>
            : <p className="mt-2 text-slate-400">O servidor não mandou a versão só texto.</p>}
        </details>
      ) : null}
    </div>
  );
}
