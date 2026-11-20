/**
 * Página do convite (arqdoor.com/convite/<token>) para o cliente que não tem o app: ver a
 * proposta, criar a conta, assinar, pagar e depois acompanhar e controlar a obra pelo link.
 * Estética do APP (features/convite/web/convite.css), não a do site.
 *
 * Acesso (decisão do Rafael, 20/11/2026):
 *   - antes de criar a conta, o link é público (com a trava de CPF quando o profissional
 *     escolheu um destinatário);
 *   - criou a conta (ou entrou) pelo link: a conta fica vinculada ao convite
 *     (POST /invites/public/:token/vincular) e só ela vê a proposta;
 *   - depois de assinado, o contrato só abre logado com essa conta.
 * Quem não quer o app pode só voltar a este link para acompanhar e aprovar as fases.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useLocation } from "wouter";
import {
  Check, ChevronRight, Clock, CreditCard, FileText, Hammer, Loader2, Lock, MessageCircle, PenLine, ShieldCheck, User as UserIcon, X,
} from "lucide-react";

import "@/features/convite/web/convite.css";
import icone from "@/features/convite/web/icone.png";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { falhaDoConvitePublico, type FalhaDoConvite } from "@/lib/invite-validity";
import { cpfBate, formatarCpfFinal } from "@/lib/invite-cpf";
import { StepConta } from "@/features/convite/StepConta";
import { StepRevisar } from "@/features/convite/StepRevisar";
import { StepPagamento } from "@/features/convite/StepPagamento";
import type { AcceptAndSignResponse, InviteData, PagamentoAgora, ProviderData } from "@/features/convite/types";
import {
  brl, comPartes, descontoPix, dia, diaMes, gruposDoContrato, gruposDosPrecos, iniciais, MEIO, precoDasOpcoes,
  primeiroNome, somarDias, totalDe, type FaseVista, type GrupoVista,
} from "@/features/convite/web/dados";

const PLAY = "https://play.google.com/store/apps/details?id=com.arqdoor.app";

type Prestador = ProviderData & { id?: number | null; foto?: string | null; sobre?: string | null; verificado?: boolean };
type Folha = null | "conta" | "assinar" | "pagar" | "aprovar" | "ajuste";
type Momento = "carregando" | "falha" | "outra_conta" | "entrar" | "proposta" | "assinar" | "pagar" | "obra" | "concluido";

const json = async (res: Response) => res.json().catch(() => ({}));
const urlDaFoto = (p?: string | null) => (!p ? null : p.startsWith("http") ? p : `${API_BASE_URL}/${p.replace(/^\/+/, "")}`);

export default function InvitePublic() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoggedIn, logout } = useAuth();
  const [, navigate] = useLocation();

  const [invite, setInvite] = useState<(InviteData & { vinculado_a_mim?: boolean; escopo?: any }) | null>(null);
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [falha, setFalha] = useState<FalhaDoConvite | null>(null);
  const [outraConta, setOutraConta] = useState<string | null>(null);
  const [precos, setPrecos] = useState<any>(null);
  const [contrato, setContrato] = useState<{ ticketId: number; prestadorUserId: number | null; grupos: GrupoVista[] } | null | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);
  const [folha, setFolha] = useState<Folha>(null);
  const [faseEmFoco, setFaseEmFoco] = useState<FaseVista | null>(null);
  const [pagamentoAgora, setPagamentoAgora] = useState<PagamentoAgora | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [outraPessoa, setOutraPessoa] = useState(false);

  // ── carregar ──────────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    try {
      const res = await apiRequest("GET", `/invites/public/${token}`);
      const body = await json(res);
      if (res.status === 403 && body?.motivo === "CONVITE_VINCULADO") {
        setOutraConta(body?.invite?.title || "Proposta");
        setPrestador(body?.provider || null);
        setInvite(null);
        return;
      }
      const f = res.ok ? null : falhaDoConvitePublico(res.status, body);
      if (f || !res.ok) {
        setFalha(f || { tipo: "nao_encontrado" });
        return;
      }
      setFalha(null);
      setOutraConta(null);
      setInvite(body.invite);
      setPrestador(body.provider || null);
      // preços com as taxas (antes de assinar; depois, só para as partes)
      const rp = await apiRequest("GET", `/invites/public/${token}/precos`);
      setPrecos(rp.ok ? (await json(rp))?.data ?? null : null);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar, isLoggedIn]);

  // contrato assinado: só para a conta que assinou
  const carregarContrato = useCallback(async () => {
    if (!token || invite?.status !== "accepted" || !isLoggedIn) { setContrato(undefined); return; }
    const rm = await apiRequest("GET", `/invites/public/${token}/meu-contrato`);
    if (!rm.ok) { setContrato(null); return; }
    const meu = (await json(rm))?.data;
    const rg = await apiRequest("GET", `/ticket/${meu.ticket_id}/payment-groups`);
    let grupos = gruposDoContrato((await json(rg))?.data);
    // preço de cada pagamento em aberto pela mesma conta da cobrança
    grupos = await Promise.all(grupos.map(async (g) => {
      if (g.pago) return comPartes(g);
      const ids = g.stepId ? [g.stepId] : g.fases.map((f) => f.id).filter(Boolean);
      const ro = await apiRequest("GET", `/payments/options?step_ids=${ids.join(",")}`).catch(() => null);
      const op = ro && ro.ok ? (await json(ro))?.data?.options : null;
      return comPartes({ ...g, ...(op ? precoDasOpcoes(op) : { cartao: g.base ?? null }) });
    }));
    setContrato({ ticketId: Number(meu.ticket_id), prestadorUserId: meu.provider_user_id ?? null, grupos });
  }, [token, invite?.status, isLoggedIn]);

  useEffect(() => { void carregarContrato(); }, [carregarContrato]);

  // ── momento da página ───────────────────────────────────────────────────────
  const momento: Momento = useMemo(() => {
    if (carregando && !invite && !falha && !outraConta) return "carregando";
    if (falha) return "falha";
    if (outraConta) return "outra_conta";
    if (!invite) return "carregando";
    if (invite.status === "accepted") {
      if (!isLoggedIn || contrato === null) return "entrar";
      if (!contrato) return "carregando";
      const fases = contrato.grupos.flatMap((g) => g.fases);
      if (fases.length && fases.every((f) => f.situacao === "aprovada")) return "concluido";
      if (!contrato.grupos.some((g) => g.pago)) return "pagar";
      return "obra";
    }
    if (isLoggedIn && invite.vinculado_a_mim) return "assinar";
    return "proposta";
  }, [carregando, invite, falha, outraConta, isLoggedIn, contrato]);

  const grupos: GrupoVista[] = useMemo(() => {
    if (contrato?.grupos) return contrato.grupos;
    return gruposDosPrecos(precos);
  }, [contrato, precos]);
  const total = useMemo(() => totalDe(grupos), [grupos]);
  const fases = grupos.flatMap((g) => g.fases);
  const nome = primeiroNome(prestador?.name || prestador?.user?.name);
  const prazo = Number(precos?.prazo_conferencia_dias) || 3;
  const proximo = grupos.find((g) => !g.pago) || null;
  const entregue = fases.find((f) => f.situacao === "entregue") || null;

  // ── ações ─────────────────────────────────────────────────────────────────
  // criou a conta ou entrou: prende a conta ao convite e segue para a assinatura
  const vincular = useCallback(async () => {
    const r = await apiRequest("POST", `/invites/public/${token}/vincular`, {});
    const b = await json(r);
    if (r.ok) { setFolha("assinar"); await carregar(); return; }
    if (b?.motivo === "CPF_OBRIGATORIO") { setFolha("conta"); return; }
    if (b?.motivo === "CPF_DIFERENTE") { setFolha(null); setOutraPessoa(true); return; }
    if (r.status === 423) { setFolha(null); bloqueou(); return; }
    if (r.status === 409) { setFolha(null); setOutraConta(invite?.title || "Proposta"); return; }
    setAviso(r.status === 400 && /pr[oó]prio/i.test(b?.message || "") ? "Você é o profissional desta proposta. Mande este link para o cliente assinar." : b?.message || "Não foi possível abrir a proposta com a sua conta.");
    setFolha(null);
  }, [token, carregar, invite?.title]);

  const bloqueou = () => setFalha({ tipo: "bloqueado", titulo: invite?.title || "Proposta", prestador: prestador?.name || prestador?.user?.name || null });

  const comecarAssinatura = () => {
    if (!isLoggedIn) { setFolha("conta"); return; }
    // destinado a um CPF: confere aqui antes, para não gastar uma das tentativas do link
    const meuCpf = String(user?.cpf || "").replace(/\D/g, "");
    const final = (invite as any)?.destinatario?.cpf_final;
    if (final && meuCpf.length === 11 && !cpfBate(meuCpf, final)) { setOutraPessoa(true); return; }
    void vincular();
  };

  const abrirPagamento = (g: GrupoVista) => {
    setPagamentoAgora({
      modo: "protegido",
      assinado: true,
      motivo: `${g.nome ? `Pagamento ${grupos.indexOf(g) + 1} · ${g.nome}` : "Pagamento"}: o valor fica guardado e só vai a ${nome || "o profissional"} quando você aprova cada fase.`,
      devido: {
        ...(g.stepId ? { tipo: "etapa" as const, step_id: g.stepId } : { tipo: "grupo" as const, group_id: g.id }),
        nome: g.nome,
        valor: g.base ?? 0,
        etapas: g.fases.map((f) => ({ id: f.id!, title: f.titulo, price: f.peso })),
        precoPix: g.pix,
        precoCartao: g.cartao,
        maxParcelas: g.parcelas?.vezes ?? 1,
      },
    });
    setFolha("pagar");
  };

  // Assinou com pagamento devido: abre a folha quando o contrato carregar, já com o
  // preço e o limite de parcelas do primeiro pagamento (o mesmo que a página mostra).
  const [pagarAoCarregar, setPagarAoCarregar] = useState(false);
  const assinou = async (r: AcceptAndSignResponse) => {
    setFolha(null);
    if (r?.pagamento?.devido) setPagarAoCarregar(true);
    await carregar();
  };
  useEffect(() => {
    if (!pagarAoCarregar || !contrato) return;
    setPagarAoCarregar(false);
    const g = contrato.grupos.find((x) => !x.pago);
    if (g) abrirPagamento(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagarAoCarregar, contrato]);

  // ── conteúdo ──────────────────────────────────────────────────────────────
  if (momento === "carregando") {
    return <div className="cv"><Topo logado={isLoggedIn} user={user} /><div className="vazio"><Loader2 className="ico" style={{ margin: "40px auto", animation: "spin 1s linear infinite" }} /></div></div>;
  }
  if (momento === "falha" && falha) return <Indisponivel falha={falha} />;
  if (outraPessoa && momento !== "falha") {
    const final = (invite as any)?.destinatario?.cpf_final;
    return (
      <Vazio titulo="Esta proposta é para outra pessoa" icone={<Lock className="ico" style={{ width: 30, height: 30 }} />}
        texto={`${prestador?.name ? primeiroNome(prestador.name) : "O profissional"} fez esta proposta para o CPF terminado em ${final ? formatarCpfFinal(final) : "outro número"}, e a sua conta tem outro CPF. Se ela é para você, entre com a conta certa ou peça um link novo.`}
        acao={<button className="btn cheio largo" data-testid="sair-outra-pessoa" onClick={() => { void logout(); setOutraPessoa(false); }}>Entrar com outra conta</button>} />
    );
  }
  if (momento === "outra_conta") {
    return (
      <Vazio titulo="Esta proposta já está ligada a uma conta" icone={<Lock className="ico" style={{ width: 30, height: 30 }} />}
        texto={`"${outraConta}" foi aberta com outra conta. Entre com a conta que você usou para criar a proposta${prestador?.name ? `, ou peça um link novo a ${primeiroNome(prestador.name)}` : ""}.`}
        acao={isLoggedIn
          ? <button className="btn cheio largo" onClick={() => { void logout(); setOutraConta(null); }}>Sair desta conta</button>
          : <div style={{ textAlign: "left", width: "100%" }}><StepConta user={null} onSuccess={() => void carregar()} /></div>} />
    );
  }
  if (momento === "entrar") {
    return (
      <div className="cv">
        <Topo logado={isLoggedIn} user={user} />
        <div className="vazio">
          <div className="bola"><Lock className="ico" style={{ width: 30, height: 30 }} /></div>
          <h1>{invite?.title || "Contrato"}</h1>
          <p>{contrato === null ? "Este contrato foi assinado com outra conta. Entre com a conta que assinou para acompanhar." : "Este contrato já foi assinado. Entre com a conta que assinou para acompanhar a obra, aprovar as fases e pagar."}</p>
          <div style={{ textAlign: "left" }}><StepConta user={user} onSuccess={() => void carregarContrato()} /></div>
          <AvisoDoApp />
        </div>
      </div>
    );
  }
  if (!invite) return null;

  const vez = suaVez();
  const situacao = {
    proposta: "Aguardando sua assinatura", assinar: "Aguardando sua assinatura", pagar: "Assinada · falta o pagamento",
    obra: "Em andamento", concluido: "Concluída",
  }[momento as "proposta"] || "";
  const inicio = fases.map((f) => f.inicio).filter(Boolean).sort()[0];
  const fim = fases.map((f) => f.fim).filter(Boolean).sort().slice(-1)[0];
  const aprovadas = fases.filter((f) => f.situacao === "aprovada").length;
  const escopo = (invite as any).escopo || null;
  const resumo = precos?.resumo ?? invite.description ?? "";

  return (
    <div className="cv">
      <Topo logado={isLoggedIn} user={user} />
      <main className="pagina">
        <div className="col">
          <section className="hero" data-testid="convite-hero">
            <span className="pilula branca situacao">{situacao}</span>
            <div className="de">Proposta de {prestador?.name || "um profissional da ArqDoor"}</div>
            <h1>{invite.title || "Proposta"}</h1>
            <div className="meta">
              <span>{total.pagamentos} {total.pagamentos === 1 ? "pagamento" : "pagamentos"}</span>
              <span>{fases.length} {fases.length === 1 ? "fase" : "fases"}</span>
              {inicio && fim && <span>{dia(inicio, false)} a {dia(fim, false)}</span>}
            </div>
          </section>

          {momento === "proposta" && (invite as any).destinatario?.cpf_final && (
            <div className="nota" data-testid="faixa-convite-pessoal"><Lock className="ico" style={{ width: 16, height: 16, marginTop: 1 }} />
              <span><b>Convite pessoal.</b> Feito para o CPF terminado em <b>{formatarCpfFinal((invite as any).destinatario.cpf_final)}</b>. Só essa pessoa consegue assinar.</span></div>
          )}
          <AvisoDoApp />
          {aviso && <div className="erro">{aviso}</div>}
          <div className="so-celular">{vez.cartao}</div>

          {momento === "obra" || momento === "concluido" ? (
            <section className="secao"><h2>Andamento da obra</h2>
              <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>{aprovadas} de {fases.length} fases aprovadas</span><span style={{ color: "var(--acentoTexto)" }}>{fases.length ? Math.round((aprovadas / fases.length) * 100) : 0}%</span></div>
                <div className="progresso"><i style={{ width: `${fases.length ? (aprovadas / fases.length) * 100 : 0}%` }} /></div>
                <div className="apoio">O valor de cada fase só é liberado a {nome || "o profissional"} quando você aprova (ou após {prazo} dias sem contestação).</div>
              </div>
            </section>
          ) : (
            <Passos atual={{ proposta: isLoggedIn ? 1 : 0, assinar: 2, pagar: 3 }[momento as "proposta"] ?? 0} />
          )}

          {resumo && momento === "proposta" && <div className="cartao"><div className="rotulo" style={{ marginBottom: 6 }}>Sobre o serviço</div><div>{resumo}</div></div>}

          <section className="secao"><h2>Pagamentos</h2>
            <div className="sub">Cada pagamento é feito antes das fases dele começarem e fica guardado até você aprovar.</div>
            <NotaDeParcelas grupos={grupos} nome={nome} />
            {grupos.map((g, gi) => (
              <BlocoDoPagamento key={`${g.id ?? g.stepId ?? gi}`} g={g} gi={gi} prazo={prazo}
                proximo={g === proximo && (momento === "pagar" || momento === "obra")}
                aoPagar={momento === "pagar" || momento === "obra" ? () => abrirPagamento(g) : undefined}
                aoAprovar={(f) => { setFaseEmFoco(f); setFolha("aprovar"); }}
                aoAjuste={(f) => { setFaseEmFoco(f); setFolha("ajuste"); }} />
            ))}
            <div className="cartao total" data-testid="convite-total">
              <div className="linha1"><span>Total dos {total.pagamentos} pagamentos</span><b>{brl(total.cartao)}</b></div>
              <div className="apoio">No cartão à vista, ou {brl(total.pix)} pagando tudo no Pix{descontoPix(total.cartao, total.pix) >= 0.1 ? ` (−${descontoPix(total.cartao, total.pix).toLocaleString("pt-BR")}%)` : ""}.</div>
            </div>
          </section>

          <QuemVaiFazer p={prestador} />
          <Combinado escopo={escopo} />
          <ComoFunciona nome={nome} prazo={prazo} />
          <div className="so-celular" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Documentos token={token} nome={nome} temContrato={!!invite.has_contract_pdf} />
            {contrato && <Conversa nome={nome} ir={() => navigate(`/messages/${contrato.prestadorUserId}?ticket=${contrato.ticketId}`)} />}
          </div>
          <div className="rodape-site">ArqDoor · <a href="/termos-de-uso">Termos de Uso</a> · <a href="mailto:suporte@arqdoor.com">Ajuda</a></div>
        </div>
        <aside className="lado">
          {vez.cartao}
          <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="rotulo">Resumo</div>
            {grupos.map((g, gi) => (
              <div key={gi} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}><span>Pagamento {gi + 1}{g.nome ? ` · ${g.nome}` : ""}</span><b>{brl(g.pago ? g.pagoValor : g.cartao)}</b></div>
            ))}
            <div style={{ borderTop: "1px solid var(--linha)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800 }}><span>Total</span><span style={{ color: "var(--acentoTexto)" }}>{brl(total.cartao)}</span></div>
          </div>
          <Documentos token={token} nome={nome} temContrato={!!invite.has_contract_pdf} />
          {contrato && <Conversa nome={nome} ir={() => navigate(`/messages/${contrato.prestadorUserId}?ticket=${contrato.ticketId}`)} />}
        </aside>
      </main>
      <BarraDeAcao vez={vez} />

      {folha === "conta" && (
        <FolhaBase titulo={isLoggedIn ? "Confirme o seu CPF" : "Entre para assinar"} fechar={() => setFolha(null)}>
          <div className="apoio" style={{ marginTop: -6 }}>{isLoggedIn
            ? "Para assinar você precisa ter o CPF na conta."
            : "Crie a sua conta grátis ou entre. É com ela que você assina, paga e acompanha a obra; depois disso, a proposta só abre com esta conta."}</div>
          <div className="cv-form"><StepConta user={user} onSuccess={() => void vincular()} /></div>
        </FolhaBase>
      )}
      {folha === "assinar" && (
        <FolhaBase titulo="Revisar e assinar" fechar={() => setFolha(null)}>
          <div className="cv-form">
            <StepRevisar invite={invite} provider={prestador} token={token} pdfUrl={invite.contract_pdf_url ? `${API_BASE_URL}/${invite.contract_pdf_url.replace(/^\/+/, "")}` : ""} total={total.cartao}
              onSuccess={(r) => void assinou(r)} onCpfRequired={() => setFolha("conta")}
              onOwnerError={() => setAviso("Você não pode assinar a própria proposta.")}
              onCpfDiferente={() => { setFolha(null); setOutraPessoa(true); }}
              onBloqueado={() => { setFolha(null); bloqueou(); }} />
          </div>
        </FolhaBase>
      )}
      {folha === "pagar" && pagamentoAgora && contrato !== null && (
        <FolhaBase titulo="Pagamento" fechar={() => setFolha(null)}>
          <div className="cv-form">
            <StepPagamento pagamento={pagamentoAgora} ticketId={contrato?.ticketId ?? 0}
              onSuccess={() => { setFolha(null); void carregarContrato(); }} onSkip={() => setFolha(null)} />
          </div>
        </FolhaBase>
      )}
      {folha === "aprovar" && faseEmFoco && (
        <FolhaAprovar fase={faseEmFoco} nome={nome} fechar={() => setFolha(null)} pronto={() => { setFolha(null); void carregarContrato(); }} />
      )}
      {folha === "ajuste" && faseEmFoco && (
        <FolhaAjuste fase={faseEmFoco} nome={nome} fechar={() => setFolha(null)} pronto={() => { setFolha(null); void carregarContrato(); }} />
      )}
    </div>
  );

  // o que fazer agora, num cartão só (e na barra do celular)
  function suaVez() {
    const g0 = proximo;
    const textos: Record<string, { t: string; p: string; b?: string; a?: () => void; b2?: string; a2?: () => void; bt: string; bs: string }> = {
      proposta: {
        t: "Gostou da proposta?", p: `Crie a sua conta grátis e assine.${grupos[0]?.cartao ? ` Você só paga o primeiro pagamento (${brl(grupos[0].cartao)}) depois de assinar.` : ""}`,
        b: "Assinar proposta", a: comecarAssinatura, bt: total.cartao ? `Total ${brl(total.cartao)}` : invite?.title || "Proposta", bs: invite?.expires_at ? `Link válido até ${dia(invite.expires_at)}` : "",
      },
      assinar: { t: "Revise e assine", p: "Confira os pagamentos e o que está combinado. A assinatura fica registrada com a sua conta, a data e a hora.", b: "Assinar proposta", a: () => setFolha("assinar"), bt: total.cartao ? `Total ${brl(total.cartao)}` : "Revise e assine", bs: "Falta a sua assinatura" },
      pagar: {
        t: "Pague o primeiro pagamento", p: g0 ? `${brl(g0.cartao)} no cartão${g0.pix ? ` ou ${brl(g0.pix)} no Pix` : ""}${g0.fases[0]?.inicio ? `, até ${dia(g0.fases[0].inicio)}` : ""}. O valor fica guardado e só vai a ${nome || "o profissional"} quando você aprova cada fase.` : "",
        b: "Pagar agora", a: () => g0 && abrirPagamento(g0), bt: g0 ? `Pagamento 1${g0.nome ? ` · ${g0.nome}` : ""}` : "Pagamento", bs: g0?.fases[0]?.inicio ? `Até ${dia(g0.fases[0].inicio)}` : "",
      },
      obra: entregue ? {
        t: `${nome || "O profissional"} entregou: ${entregue.titulo}`, p: `Confira o serviço e aprove${entregue.fim ? ` até ${dia(somarDias(entregue.fim, prazo))}` : ""}.${entregue.parte ? ` Aprovando, ${brl(entregue.parte)} são liberados a ${nome || "o profissional"}.` : ""} Se algo estiver errado, peça ajuste.`,
        b: "Aprovar fase", a: () => { setFaseEmFoco(entregue); setFolha("aprovar"); }, b2: "Pedir ajuste", a2: () => { setFaseEmFoco(entregue); setFolha("ajuste"); }, bt: "Fase entregue", bs: "Confira e aprove",
      } : g0 ? {
        t: "Próximo pagamento", p: `${g0.nome ? `${g0.nome}: ` : ""}${brl(g0.cartao)}${g0.fases[0]?.inicio ? `, até ${dia(g0.fases[0].inicio)}` : ""}. Pague antes das fases dele começarem.`,
        b: "Pagar agora", a: () => abrirPagamento(g0), bt: "Próximo pagamento", bs: g0.fases[0]?.inicio ? `Até ${dia(g0.fases[0].inicio)}` : "",
      } : { t: "Tudo em dia", p: `${nome || "O profissional"} está trabalhando. Você recebe um aviso quando uma fase for entregue.`, bt: "Tudo em dia", bs: "" },
      concluido: { t: "Obra concluída", p: `Todas as fases foram aprovadas. Obrigado por usar a ArqDoor com ${nome || "o profissional"}.`, bt: "Obra concluída", bs: "" },
    };
    const v = textos[momento] || textos.proposta;
    return {
      cartao: (
        <section className="vez" data-testid="sua-vez">
          <span className="rotulo rot">Sua vez</span>
          <h3>{v.t}</h3>
          <p>{v.p}</p>
          {v.b && <button className="btn cheio largo" onClick={v.a} data-testid="acao-principal">{v.b}</button>}
          {v.b2 && <button className="btn linha largo" onClick={v.a2}>{v.b2}</button>}
          {(momento === "proposta" || momento === "assinar") && invite?.expires_at && <div className="apoio" style={{ textAlign: "center" }}>Link válido até {dia(invite.expires_at)}</div>}
        </section>
      ),
      botao: v.b ? <button className="btn cheio" onClick={v.a}>{v.b}</button> : null,
      bt: v.bt, bs: v.bs,
    };
  }
}

// ── peças ────────────────────────────────────────────────────────────────────

function Topo({ logado, user }: { logado: boolean; user: any }) {
  return (
    <header className="topo"><div className="in">
      <a className="marca" href="/"><img src={icone} alt="" />ArqDoor</a>
      <div className="esp" />
      <span className="pilula ok so-notebook"><Lock className="ico" style={{ width: 14, height: 14 }} />Pagamento protegido</span>
      {logado ? <span className="eu" title={user?.name || "Você"}>{iniciais(user?.name)}</span> : null}
    </div></header>
  );
}

/**
 * Se o Chrome já ofereceu o app (beforeinstallprompt, guardado no index.html), o botão abre
 * a janela de instalação da Play do próprio navegador; senão segue o link da loja.
 */
function abrirJanelaDaPlay(e: { preventDefault: () => void }) {
  const pedido = (window as any).__pedidoDoApp;
  if (!pedido?.prompt) return;
  e.preventDefault();
  (window as any).__pedidoDoApp = null;
  pedido.prompt().catch(() => window.open(PLAY, "_blank", "noopener"));
}

function AvisoDoApp() {
  return (
    <div className="app" data-testid="aviso-do-app">
      <img src={icone} alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>Acompanhe pelo app ArqDoor</b>
        <span>Avisos de cada fase, fotos e chat no celular. Ou volte a este link quando quiser.</span>
      </div>
      <a href={PLAY} target="_blank" rel="noreferrer" onClick={abrirJanelaDaPlay}>Baixar</a>
    </div>
  );
}

function Passos({ atual }: { atual: number }) {
  const itens: [string, ReactNode][] = [
    ["Proposta", <FileText className="ico" key="a" />], ["Conta", <UserIcon className="ico" key="b" />],
    ["Assinatura", <PenLine className="ico" key="c" />], ["Pagamento", <CreditCard className="ico" key="d" />],
  ];
  return (
    <section className="secao"><h2>Seu andamento</h2>
      <div className="cartao">
        <div className="passos"><span className="barra" style={{ width: `${(atual / 3) * 75}%` }} />
          {itens.map(([t, ic], i) => (
            <div key={t} className={`passo ${i < atual ? "feito" : i === atual ? "agora" : ""}`}><span className="bola">{i < atual ? <Check className="ico" /> : ic}</span>{t}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NotaDeParcelas({ grupos, nome }: { grupos: GrupoVista[]; nome: string }) {
  const abertos = grupos.filter((g) => !g.pago);
  if (!abertos.length) return null;
  const limites = abertos.map((g) => g.parcelas?.vezes || 1);
  const iguais = limites.every((n) => n === limites[0]);
  const texto = iguais
    ? limites[0] > 1 ? `No cartão, cada pagamento pode ser parcelado em até ${limites[0]}×.` : "No cartão, os pagamentos são à vista."
    : `No cartão, cada pagamento tem o seu limite de parcelas, definido por ${nome || "o profissional"}: ${abertos.map((g, i) => `${g.nome || `pagamento ${i + 1}`} em até ${limites[i]}×`).join(", ")}.`;
  return <div className="nota"><CreditCard className="ico" style={{ width: 16, height: 16, marginTop: 1 }} /><span>{texto} No Pix, sempre à vista e mais barato.</span></div>;
}

function BlocoDoPagamento({ g, gi, prazo, proximo, aoPagar, aoAprovar, aoAjuste }: {
  g: GrupoVista; gi: number; prazo: number; proximo: boolean; aoPagar?: () => void; aoAprovar: (f: FaseVista) => void; aoAjuste: (f: FaseVista) => void;
}) {
  const ate = g.fases[0]?.inicio;
  return (
    <article className={`grupo ${g.pago ? "pago" : ""}`} data-testid="bloco-pagamento">
      <div className="cab">
        <span className="ic">{g.pago ? <Check className="ico" /> : <CreditCard className="ico" />}</span>
        <div style={{ minWidth: 0 }}>
          <div className="nome">Pagamento {gi + 1}{g.nome ? ` · ${g.nome}` : ""}</div>
          {g.pago ? (
            <div className="quando"><Check className="ico" style={{ color: "var(--ok)" }} /><span style={{ color: "var(--okTexto)", fontWeight: 700 }}>Pago{g.pagoMeio ? ` no ${MEIO[g.pagoMeio] || g.pagoMeio}` : ""}{g.pagoEm ? ` em ${dia(g.pagoEm, false)}` : ""}</span></div>
          ) : (
            <>
              <div className="quando"><Clock className="ico" /><span>{proximo && <b style={{ color: "var(--alertaTexto)" }}>Próximo pagamento · </b>}{ate ? `Pagar até ${dia(ate)}` : "Pagar antes da 1ª fase"}</span></div>
              <div className="quando"><CreditCard className="ico" /><span>{g.parcelas ? `No cartão, em até ${g.parcelas.vezes}× de ${brl(g.parcelas.valor)}` : "No cartão, só à vista"}</span></div>
            </>
          )}
        </div>
        <div className="preco"><b>{brl(g.pago ? g.pagoValor : g.cartao)}</b><span>{g.pago ? "pago" : "no cartão à vista"}</span></div>
      </div>
      {!g.pago && proximo && aoPagar && <div className="pagar"><button className="btn cheio largo" onClick={aoPagar}>Pagar agora</button></div>}
      <div className="fases">
        {g.fases.map((f, i) => {
          const st = f.situacao;
          const rot = { aprovada: "Aprovada · valor liberado", entregue: `Entregue${f.fim ? ` · confira até ${dia(somarDias(f.fim, prazo), false)}` : ""}`, execucao: "Em execução", aguardando: g.pago ? "A seguir" : "" }[st];
          const Ic = st === "aprovada" ? Check : st === "execucao" ? Hammer : Clock;
          return (
            <div key={f.id ?? i} className={`fase ${st === "execucao" ? "execucao" : st}`}>
              <span className="ponto"><Ic className="ico" /></span>
              <div><div className="t">{f.titulo}</div><div className="d">{f.inicio && f.fim ? `${diaMes(f.inicio)} – ${diaMes(f.fim)}` : ""}{rot ? ` · ${rot}` : ""}</div></div>
              <div className="v">{f.parte != null && <><b>{brl(f.parte)}</b>{st === "aprovada" ? "liberado" : "ao aprovar"}</>}</div>
              {st === "entregue" && f.id && (
                <div className="acoes">
                  <button className="btn cheio" onClick={() => aoAprovar(f)}><Check className="ico" />Aprovar fase</button>
                  <button className="btn linha" onClick={() => aoAjuste(f)}>Pedir ajuste</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function QuemVaiFazer({ p }: { p: Prestador | null }) {
  if (!p?.name) return null;
  const foto = urlDaFoto(p.foto);
  return (
    <section className="secao"><h2>Quem vai fazer</h2>
      <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="pro">
          <div className="avatar">{foto ? <img src={foto} alt="" /> : iniciais(p.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
            {p.profession && <div className="apoio">{p.profession}</div>}
            {p.verificado && <div style={{ marginTop: 6 }}><span className="pilula ok"><ShieldCheck className="ico" style={{ width: 14, height: 14 }} />Perfil verificado</span></div>}
          </div>
        </div>
        {p.sobre && <p style={{ margin: 0, color: "var(--texto)" }}>{p.sobre}</p>}
        {p.id && <a href={`/providers/${p.id}`} style={{ fontWeight: 700, fontSize: 13.5 }}>Ver perfil e portfólio →</a>}
      </div>
    </section>
  );
}

function Combinado({ escopo }: { escopo: any }) {
  const inc: string[] = escopo?.incluso || [];
  const nao: string[] = escopo?.nao_incluso || [];
  if (!inc.length && !nao.length) return null;
  return (
    <section className="secao"><h2>O que está combinado</h2>
      <div className="cartao" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {inc.length > 0 && <div><div className="rotulo" style={{ marginBottom: 8 }}>Está incluso</div><ul className="lista">{inc.map((x) => <li key={x}><span className="m sim">✓</span>{x}</li>)}</ul></div>}
        {nao.length > 0 && <div><div className="rotulo" style={{ marginBottom: 8 }}>Não está incluso</div><ul className="lista">{nao.map((x) => <li key={x}><span className="m nao">✕</span>{x}</li>)}</ul></div>}
      </div>
    </section>
  );
}

function ComoFunciona({ nome, prazo }: { nome: string; prazo: number }) {
  return (
    <section className="secao"><h2>Como funciona o pagamento protegido</h2>
      <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="tres">
          <div><b>01</b>Você paga cada pagamento antes das fases dele começarem.</div>
          <div><b>02</b>O valor fica guardado com segurança na Pagar.me.</div>
          <div><b>03</b>Cada fase é liberada a {nome || "o profissional"} depois da sua aprovação ou após {prazo} dias sem contestação.</div>
        </div>
        <div className="apoio">Algo errado numa fase? Você pede ajuste ou abre uma reclamação, e o valor dela fica guardado até resolver. Pix ou cartão de crédito; nada vai direto ao profissional.</div>
      </div>
    </section>
  );
}

function Documentos({ token, nome, temContrato }: { token: string; nome: string; temContrato: boolean }) {
  const abrir = (caminho: string) => window.open(`${API_BASE_URL}/invites/public/${token}/${caminho}?origem=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener");
  return (
    <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="rotulo">Documentos</div>
      <button className="doc" onClick={() => abrir("proposta-pdf")}><span className="ic"><FileText className="ico" /></span><span style={{ flex: 1 }}><b>Proposta em PDF</b><span className="apoio">Capa, cronograma e pagamentos</span></span><ChevronRight className="ico" /></button>
      {temContrato && <button className="doc" onClick={() => abrir("pdf")}><span className="ic"><PenLine className="ico" /></span><span style={{ flex: 1 }}><b>Contrato{nome ? ` de ${nome}` : ""}</b><span className="apoio">Anexado pelo profissional</span></span><ChevronRight className="ico" /></button>}
    </div>
  );
}

function Conversa({ nome, ir }: { nome: string; ir: () => void }) {
  return (
    <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="rotulo">Conversa</div>
      <div className="apoio">Dúvidas, orçamento ou ajustes: chame {nome || "o profissional"} quando quiser.</div>
      <button className="btn linha largo" onClick={ir}><MessageCircle className="ico" />Chamar {nome || "o profissional"} no chat</button>
    </div>
  );
}

function BarraDeAcao({ vez }: { vez: { botao: ReactNode; bt: string; bs: string } }) {
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cartao = document.querySelector(".cv .so-celular .vez");
    if (!cartao || !barra.current || !("IntersectionObserver" in window)) return;
    const ob = new IntersectionObserver(([e]) => barra.current?.classList.toggle("visivel", !e.isIntersecting && e.boundingClientRect.top < 0));
    ob.observe(cartao);
    return () => ob.disconnect();
  });
  if (!vez.botao) return null;
  return <div className="barra-acao" ref={barra}><div className="txt"><b>{vez.bt}</b><span>{vez.bs}</span></div>{vez.botao}</div>;
}

function FolhaBase({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [fechar]);
  return (
    <div className="cv-veu cv" style={{ minHeight: 0, background: "rgba(20,14,10,.45)" }} onClick={(e) => e.target === e.currentTarget && fechar()} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="folha">
        <div className="cabf"><h3>{titulo}</h3><button className="fechar" onClick={fechar} aria-label="Fechar"><X className="ico" style={{ width: 16, height: 16 }} /></button></div>
        {children}
      </div>
    </div>
  );
}

/** Aprovar a fase entregue: assinatura com a senha. */
function FolhaAprovar({ fase, nome, fechar, pronto }: { fase: FaseVista; nome: string; fechar: () => void; pronto: () => void }) {
  const { user, updateUserLocal } = useAuth();
  // Só com senha (conta Google não assina): sem senha de assinatura, cria antes de aprovar.
  const criar = !user?.signature_password_configured && ((user as any)?.provider === "google" || !user?.signature_password_set);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const aprovar = async () => {
    if (!senha) { setErro(criar ? "Crie a sua senha de assinatura." : "Digite a sua senha para aprovar."); return; }
    if (criar && (senha.length < 6 || senha !== senha2)) { setErro(senha.length < 6 ? "A senha precisa ter ao menos 6 caracteres." : "As duas senhas não são iguais."); return; }
    setEnviando(true); setErro(null);
    if (criar) {
      const rs = await apiRequest("PUT", "/users/me/signature-password", { password: senha });
      if (!rs.ok) { setEnviando(false); setErro((await json(rs))?.message || "Não foi possível criar a senha de assinatura."); return; }
      updateUserLocal?.({ signature_password_configured: true });
    }
    const r = await apiRequest("PATCH", `/step/signature/${fase.id}`, { password: senha });
    const b = await json(r);
    setEnviando(false);
    if (!r.ok || b?.success === false) { setErro(b?.message || "Não foi possível aprovar. Confira a senha."); return; }
    pronto();
  };
  return (
    <FolhaBase titulo="Aprovar fase" fechar={fechar}>
      <div className="cartao" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800 }}>{fase.titulo}</div>
        {fase.inicio && fase.fim && <div className="apoio">{diaMes(fase.inicio)} – {diaMes(fase.fim)}</div>}
        {fase.parte != null && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span>Liberado a {nome || "o profissional"}</span><b>{brl(fase.parte)}</b></div>}
      </div>
      <div className="apoio">Aprovando, você confirma que a fase foi entregue como combinado. O valor vai para {nome || "o profissional"} e não volta.</div>
      {criar ? (
        <>
          <div className="apoio">Você entrou pelo Google, então a aprovação usa uma senha de assinatura. Crie a sua agora.</div>
          <div className="campo"><label htmlFor="senha-aprovar">Senha de assinatura</label><input id="senha-aprovar" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" /></div>
          <div className="campo"><label htmlFor="senha-aprovar-2">Repita a senha</label><input id="senha-aprovar-2" type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" /></div>
        </>
      ) : (
        <div className="campo"><label htmlFor="senha-aprovar">Confirme com a sua senha</label><input id="senha-aprovar" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></div>
      )}
      {erro && <div className="erro">{erro}</div>}
      <button className="btn cheio largo" disabled={enviando} onClick={() => void aprovar()}>{enviando ? <Loader2 className="ico" /> : <Check className="ico" />}Aprovar e liberar</button>
    </FolhaBase>
  );
}

/** Pedir ajuste: a fase volta para o profissional com o motivo escrito (vira reclamação). */
function FolhaAjuste({ fase, nome, fechar, pronto }: { fase: FaseVista; nome: string; fechar: () => void; pronto: () => void }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (texto.trim().length < 10) { setErro("Conte com um pouco mais de detalhe o que precisa ser refeito."); return; }
    setEnviando(true); setErro(null);
    const r = await apiRequest("PATCH", `/step/${fase.id}`, { status: "Recusado", motivo: texto.trim() });
    const b = await json(r);
    setEnviando(false);
    if (!r.ok || b?.success === false) { setErro(b?.message || "Não foi possível enviar o pedido."); return; }
    pronto();
  };
  return (
    <FolhaBase titulo="Pedir ajuste" fechar={fechar}>
      <div className="apoio" style={{ marginTop: -6 }}>Conte o que precisa ser refeito em "{fase.titulo}". {nome || "O profissional"} responde pelo app, e o valor da fase fica guardado até resolver.</div>
      <div className="campo"><label htmlFor="texto-ajuste">O que está errado</label><textarea id="texto-ajuste" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: o rejunte ficou manchado perto do ralo." /></div>
      {erro && <div className="erro">{erro}</div>}
      <button className="btn cheio largo" disabled={enviando} onClick={() => void enviar()}>{enviando ? <Loader2 className="ico" /> : null}Enviar pedido de ajuste</button>
    </FolhaBase>
  );
}

function Vazio({ titulo, texto, icone: ic, acao }: { titulo: string; texto: string; icone: ReactNode; acao?: ReactNode }) {
  return (
    <div className="cv">
      <Topo logado={false} user={null} />
      <div className="vazio"><div className="bola">{ic}</div><h1>{titulo}</h1><p>{texto}</p>{acao}<AvisoDoApp /></div>
    </div>
  );
}

function Indisponivel({ falha }: { falha: FalhaDoConvite }) {
  if (falha.tipo === "expirado") {
    return <Vazio titulo="Este link venceu" icone={<Clock className="ico" style={{ width: 30, height: 30 }} />}
      texto={`A proposta "${falha.titulo}"${falha.prestador ? ` de ${falha.prestador}` : ""} não está mais disponível por este link. Peça um link novo${falha.prestador ? ` a ${primeiroNome(falha.prestador)}` : " ao profissional"}: a proposta continua a mesma.`} />;
  }
  if (falha.tipo === "bloqueado") {
    return <Vazio titulo="Este link foi bloqueado" icone={<Lock className="ico" style={{ width: 30, height: 30 }} />}
      texto={`Houve tentativas de abrir "${falha.titulo}" com outro CPF. Peça um link novo${falha.prestador ? ` a ${primeiroNome(falha.prestador)}` : " ao profissional"}.`} />;
  }
  return <Vazio titulo="Proposta não encontrada" icone={<FileText className="ico" style={{ width: 30, height: 30 }} />} texto="Confira o link que você recebeu ou peça um novo ao profissional." />;
}
