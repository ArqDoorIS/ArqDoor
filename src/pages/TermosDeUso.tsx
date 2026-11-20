import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { DocumentoDosTermos, MarcaArqDoor } from "@/features/termos/DocumentoDosTermos";
import { buscarTermos, type VersaoDosTermos } from "@/features/termos/api";

/**
 * Página pública dos Termos de Uso e da Política de Privacidade (20/11/2026). Mostra a versão
 * em vigor, lida do servidor; `?versao=N` mostra uma versão antiga. Os endereços antigos
 * (/docs/usetermsprivacitypolices.html, a ficha da Play) redirecionam para cá.
 */
const PDF = "/docs/usetermsprivacitypolices.pdf";

export default function TermosDeUso() {
  const busca = useSearch();
  const pedida = Number(new URLSearchParams(busca).get("versao")) || null;
  const [doc, setDoc] = useState<VersaoDosTermos | null>(null);
  const [erro, setErro] = useState(false);
  // Pediu ?versao=N: confere se N não é a própria versão em vigor antes de avisar.
  const [emVigor, setEmVigor] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    setDoc(null);
    setErro(false);
    buscarTermos(pedida)
      .then((d) => { if (vivo) setDoc(d); })
      .catch(() => { if (vivo) setErro(true); });
    if (pedida) buscarTermos().then((d) => { if (vivo) setEmVigor(d.versao); }).catch(() => {});
    return () => { vivo = false; };
  }, [pedida]);
  // Só avisa "não é a versão em vigor" quando a em vigor é conhecida e é outra.
  const antiga = !!pedida && !!doc && emVigor !== null && doc.versao !== emVigor;

  useEffect(() => {
    const anterior = document.title;
    document.title = "Termos de Uso e Política de Privacidade | ArqDoor";
    return () => { document.title = anterior; };
  }, []);

  // O texto chega depois da página: o salto para #seção do endereço (ex.: #privacidade, dos
  // links "Política de privacidade") é feito aqui, depois de o documento estar na tela.
  useEffect(() => {
    if (!doc) return;
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const ir = () => document.getElementById(id)?.scrollIntoView?.({ block: "start" });
    ir();
    const quadro = typeof requestAnimationFrame === "function" ? requestAnimationFrame(ir) : null;
    return () => { if (quadro !== null) cancelAnimationFrame(quadro); };
  }, [doc]);

  return (
    <div className="td-fundo">
      {doc ? (
        <DocumentoDosTermos
          conteudo={doc.conteudo}
          variante="pagina"
          marca
          className="animate-in fade-in-0 duration-300"
          aviso={antiga && doc ? (
            <>Versão {doc.versao} (não é a versão em vigor). <a href="/termos-de-uso">Ver a versão em vigor</a></>
          ) : undefined}
        />
      ) : (
        <div className="td td-pagina">
          <header className="td-cabecalho">
            <MarcaArqDoor />
            <h1>Termos de Uso e Política de Privacidade</h1>
          </header>
          {erro ? (
            <p className="td-lead" role="alert">
              Não foi possível carregar os termos agora. Tente de novo em instantes ou{" "}
              <a href={PDF} target="_blank" rel="noreferrer" style={{ color: "var(--td-brand)", textDecoration: "underline" }}>abra a versão em PDF</a>.
            </p>
          ) : (
            <p className="td-lead">Carregando os termos...</p>
          )}
        </div>
      )}
    </div>
  );
}
