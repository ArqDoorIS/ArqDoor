import { Fragment, useMemo, type MouseEvent, type ReactNode } from "react";
import { indiceDosTermos, lerTermos, type Bloco, type Linha } from "@/lib/termos/formato";
import icone from "@/features/convite/web/icone.png";
import "./documento.css";

/**
 * Desenha os Termos de Uso a partir do texto da versão (src/lib/termos/formato.ts), em
 * elementos React: nada de HTML vindo do servidor. O visual é o da antiga página estática.
 *
 * - variante "pagina": a página pública /termos-de-uso (segue o tema escuro do aparelho).
 * - variante "embutido": dentro de uma janela ou da prévia do painel (sempre claro).
 * - prefixo: vai na frente de cada id, para dois documentos na mesma tela não colidirem
 *   (a página pública não usa, para /termos-de-uso#t1 continuar valendo).
 */
type Props = {
  conteudo?: string;
  blocos?: Bloco[];
  variante?: "pagina" | "embutido";
  prefixo?: string;
  /** ícone do app + "ArqDoor", com link para o início, no topo (só na página pública) */
  marca?: boolean;
  /** aviso no topo, acima do título (ex.: versão antiga) */
  aviso?: ReactNode;
  className?: string;
};

/** A marca do topo da página pública: o ícone do app e o nome, como no cabeçalho do convite. */
export function MarcaArqDoor() {
  return (
    <a className="td-marca" href="/">
      <img src={icone} alt="" width={30} height={30} />
      ArqDoor
    </a>
  );
}

const NIVEL_CLASSE = ["td-c", "td-c", "td-c-sub", "td-c-sub2"];
/** O índice numera sozinho (lista ordenada), como a página antiga: tira o "1. " da seção. */
const semNumero = (s: string) => s.replace(/^\d+\.\s+/, "");

function Trechos({ linha, prefixo }: { linha: Linha; prefixo: string }) {
  return (
    <>
      {linha.map((t, i) => {
        if (t.t === "negrito") return <strong key={i}>{t.v}</strong>;
        if (t.t === "link") return <Link key={i} href={t.href} prefixo={prefixo}>{t.v}</Link>;
        return <Fragment key={i}>{t.v}</Fragment>;
      })}
    </>
  );
}

function Linhas({ linhas, prefixo }: { linhas: Linha[]; prefixo: string }) {
  return (
    <>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          <Trechos linha={l} prefixo={prefixo} />
        </Fragment>
      ))}
    </>
  );
}

/** Vai até o id dentro da página (ou da área que rola, numa janela). */
function irPara(e: MouseEvent<HTMLAnchorElement>, id: string, mudarEndereco: boolean) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  e.preventDefault();
  alvo.scrollIntoView?.({ behavior: "smooth", block: "start" });
  if (mudarEndereco) {
    try { window.history.replaceState(null, "", `#${id}`); } catch { /* sem histórico */ }
  }
}

function Link({ href, prefixo, children }: { href: string; prefixo: string; children: ReactNode }) {
  if (href.startsWith("#")) {
    const id = prefixo + href.slice(1);
    return <a href={`#${id}`} onClick={(e) => irPara(e, id, !prefixo)}>{children}</a>;
  }
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  return <a href={href}>{children}</a>;
}

export function DocumentoDosTermos({ conteudo, blocos: dados, variante = "pagina", prefixo = "", marca = false, aviso, className }: Props) {
  const blocos = useMemo(() => dados ?? lerTermos(conteudo ?? ""), [dados, conteudo]);
  const indice = useMemo(() => indiceDosTermos(blocos), [blocos]);

  // O cabeçalho é o título e as linhas de apoio do começo; o rodapé, o que vem depois do ---.
  let inicio = 0;
  while (inicio < blocos.length && (blocos[inicio].tipo === "titulo" || blocos[inicio].tipo === "meta")) inicio++;
  const topo = blocos.slice(0, inicio);
  const corpo = blocos.slice(inicio).filter((b) => b.tipo !== "rodape");
  const rodape = blocos.filter((b) => b.tipo === "rodape");

  const desenhar = (b: Bloco, i: number): ReactNode => {
    switch (b.tipo) {
      case "titulo":
        return <h1 key={i}>{b.texto}</h1>;
      case "meta":
        return b.linhas.map((l, j) => <p key={`${i}-${j}`} className="td-meta"><Trechos linha={l} prefixo={prefixo} /></p>);
      case "parte":
        return <h2 key={i} id={prefixo + b.id} className="td-doc">{b.texto}</h2>;
      case "secao":
        return <h2 key={i} id={prefixo + b.id}>{b.texto}</h2>;
      case "clausula": {
        const nivel = Math.min(Math.max(b.nivel, 1), 3);
        return (
          <p key={i} className={NIVEL_CLASSE[nivel]} data-nivel={nivel}>
            <span className="td-n">{b.numero}</span> <Linhas linhas={b.linhas} prefixo={prefixo} />
          </p>
        );
      }
      case "paragrafo":
        return <p key={i} className="td-lead"><Linhas linhas={b.linhas} prefixo={prefixo} /></p>;
      default:
        return null;
    }
  };

  return (
    <article className={["td", variante === "pagina" ? "td-pagina" : "td-embutido", className].filter(Boolean).join(" ")}>
      {topo.length || marca || aviso ? (
        <header className="td-cabecalho">
          {marca ? <MarcaArqDoor /> : null}
          {aviso ? <div className="td-aviso" role="note">{aviso}</div> : null}
          {topo.map(desenhar)}
        </header>
      ) : null}

      {indice.length ? (
        <nav className="td-indice" aria-label="Índice">
          <p>Índice</p>
          <ol>
            {indice.map((item) => (
              <li key={item.id}>
                <Link href={`#${item.id}`} prefixo={prefixo}>{item.filhos.length ? item.texto : semNumero(item.texto)}</Link>
                {item.filhos.length ? (
                  <ol>
                    {item.filhos.map((f) => (
                      <li key={f.id}><Link href={`#${f.id}`} prefixo={prefixo}>{semNumero(f.texto)}</Link></li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {corpo.map(desenhar)}

      {rodape.length ? (
        <footer className="td-rodape">
          {rodape.map((b, i) => (b.tipo === "rodape" ? <p key={i}><Linhas linhas={b.linhas} prefixo={prefixo} /></p> : null))}
        </footer>
      ) : null}
    </article>
  );
}

export default DocumentoDosTermos;
