import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentoDosTermos } from "./DocumentoDosTermos";
import { aceitarTermos, buscarMinhaSituacao, buscarTermos, ErroDaApi, type VersaoDosTermos } from "./api";

/**
 * Janela "Os termos de uso mudaram" (20/11/2026). Quem está logado no site e ainda não aceitou
 * a versão em vigor vê o texto inteiro e só segue aceitando (ou sai da conta). Não fecha
 * clicando fora nem com Esc. Contas novas aceitam no cadastro e não veem a janela.
 *
 * Fica fora de: /termos-de-uso (a própria leitura), /excluir-conta (quem não aceita pode pedir a
 * exclusão, cláusula 1.7.1), o link do convite (/convite/..., tem cadastro próprio) e o painel
 * admin (outro login). Espera a janela de completar o cadastro, para as duas não se empilharem.
 */
const ehForaDaJanela = (rota: string) =>
  rota === "/termos-de-uso" ||
  rota === "/excluir-conta" ||
  rota.startsWith("/convite/") ||
  rota === "/admin" ||
  rota.startsWith("/admin/") ||
  (typeof window !== "undefined" && window.location.hostname.startsWith("admin."));

/**
 * O texto exato da versão que falta aceitar: a `versao_atual` da situação (ou a do corpo do
 * 409), sem passar pela cópia de até 60s que o navegador guarda do GET /termos.
 */
const textoDaVersao = (versao: number | null | undefined) => buscarTermos(versao ?? null, { semCache: true });

export default function AceiteDosTermos() {
  const { user, isLoggedIn, isInitialized, needsOnboarding, logout } = useAuth();
  const [rota, navegar] = useLocation();
  const [doc, setDoc] = useState<VersaoDosTermos | null>(null);
  const [aceitei, setAceitei] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const foraDaJanela = ehForaDaJanela(rota);
  const userId = user?.id;

  // A janela já aberta não precisa de nova consulta a cada troca de página.
  const abertaRef = useRef(false);
  abertaRef.current = !!doc;

  /** Confere a situação e, se faltar aceitar, devolve o texto da versão em vigor. */
  const conferir = useCallback(async (): Promise<VersaoDosTermos | null> => {
    const situacao = await buscarMinhaSituacao();
    if (!situacao?.precisa_aceitar) return null;
    return textoDaVersao(situacao.versao_atual);
  }, []);

  // Confere uma vez a cada troca de página: pega termos publicados durante a sessão e, se a
  // consulta anterior falhou, tenta de novo na página seguinte (sem travar a pessoa).
  useEffect(() => {
    if (!isInitialized || !isLoggedIn || !userId) { setDoc(null); return; }
    if (foraDaJanela || abertaRef.current) return;
    let vivo = true;
    conferir()
      .then((d) => { if (vivo && d) setDoc(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [isInitialized, isLoggedIn, userId, foraDaJanela, rota, conferir]);

  const aberta = !!doc && isLoggedIn && !foraDaJanela && !needsOnboarding;

  const aceitar = async () => {
    if (!doc || !aceitei) return;
    setEnviando(true);
    setAviso(null);
    try {
      await aceitarTermos(doc.versao);
      setDoc(null);
      setAceitei(false);
    } catch (e) {
      if (e instanceof ErroDaApi && e.status === 409) {
        // Saiu uma versão nova enquanto a pessoa lia: mostra a nova e pede o aceite de novo.
        // O 409 diz qual é a versão em vigor; sem ela, pergunta a situação.
        setAceitei(false);
        const nova = Number(e.corpo?.versao_atual) || null;
        try {
          const d = nova ? await textoDaVersao(nova) : await conferir();
          setDoc(d);
        } catch { /* fica a que estava */ }
        setAviso("Os termos mudaram de novo enquanto você lia. Esta é a versão mais nova.");
      } else {
        setAviso((e as Error).message || "Não foi possível registrar o aceite. Tente de novo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  const sair = async () => {
    setDoc(null);
    await logout();
    navegar("/auth");
  };

  const naoFecha = (e: Event) => e.preventDefault();

  return (
    <DialogPrimitive.Root open={aberta}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={naoFecha}
          onInteractOutside={naoFecha}
          onEscapeKeyDown={naoFecha}
          className="fixed left-1/2 top-1/2 z-[60] flex max-h-[92vh] w-[min(760px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-white p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 duration-300 sm:p-6"
        >
          <div>
            <DialogPrimitive.Title className="text-xl font-semibold text-ink-strong">Os termos de uso mudaram</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-ink">
              Para continuar usando a ArqDoor, leia e aceite a versão {doc?.versao}.
            </DialogPrimitive.Description>
          </div>

          {doc?.resumo ? (
            <div className="rounded-xl border border-line bg-brand-tint px-4 py-3 text-sm text-ink" data-testid="resumo-dos-termos">
              <span className="font-semibold text-ink-strong">O que mudou: </span>
              {doc.resumo}
            </div>
          ) : null}

          <div className="min-h-[180px] flex-1 overflow-y-auto rounded-xl border border-line px-4 py-2 sm:px-6" data-testid="texto-dos-termos">
            {doc ? <DocumentoDosTermos conteudo={doc.conteudo} variante="embutido" prefixo="aceite-" /> : null}
          </div>

          {aviso ? <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-text" role="alert">{aviso}</p> : null}

          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-strong">
            <Checkbox checked={aceitei} onCheckedChange={(v) => setAceitei(v === true)} className="mt-0.5" aria-label="Li e aceito os Termos de Uso e a Política de Privacidade" />
            <span>Li e aceito os Termos de Uso e a Política de Privacidade</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={sair} disabled={enviando}>Sair da conta</Button>
            <Button onClick={aceitar} disabled={!aceitei || enviando}>
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Aceitar
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
