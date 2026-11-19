/**
 * Painel > Análise (v2): visão geral com funil desde o download, caminhos com janelas,
 * pessoas com o código do PostHog e a investigação com o botão da IA analista
 * (só roda com confirmação e mostrando o custo antes).
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAnaliseSection } from "@/features/admin/components/AdminAnaliseSection";

const { apiRequestMock, baixarMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn(), baixarMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));
vi.mock("@/features/admin/components/baixarArquivo", () => ({ baixarArquivo: baixarMock }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const VISAO = {
  numeros: { clientes: 12, profissionais: 8 },
  temperaturas: { analisados: 2, quente: 1, morno: 1, frio: 0, divergem_das_regras: 1 },
  follow_ups: [{ user_id: 5, nome: "Ana Lima", papel: "cliente", temperatura: "quente", chance: 0.4, acao: "mensagem_no_app", quando: "hoje", por_que: "Viu a proposta e não respondeu.", mensagem_sugerida: "Oi Ana" }],
  pedidos_sem_oferta: [{ id: 11, titulo: "Piso da sala", user_id: 5, nome: "Ana Lima", criado_em: "2026-11-15T10:00:00Z" }],
  convites_parados: [], propostas_paradas: [],
  kpis: { pedidos: { atual: 33, anterior: 27, serie: [1, 2, 3] }, liquidez: { atual_pct: 64, anterior_pct: 70, meta_pct: 70 }, contratos: { atual: 22, anterior: 20, serie: [1, 2], pct_dos_pedidos: 67 }, valor: { atual: 184000, anterior: 160000, serie: [1, 2], ticket_medio: 8360 } },
  tendencias: { semanas: [{ inicio: "2026-11-10", pedidos: 8, contratos: 3 }], tempo_ate_1a_oferta: [["até 6 h", 4], ["sem oferta", 1]] },
  leads: [{ user_id: 5, nome: "Ana Lima", papel: "cliente", temperatura: "quente", chance: 0.4, categoria: "exigente_detalhista", motivo: "Reabre a proposta.", follow_up_acao: "ligar", follow_up_quando: "hoje", analisado_em: "2026-11-18T10:00:00Z" }],
};
const FUNIL = {
  papel: "cliente", dias: 30, posthog: { ligado: false, motivo: "Sem chave." }, onde_mais_perde: ["criou a conta (perde 27%)"],
  passos: [
    { grupo: "Do download à conta" },
    { id: "baixou", nome: "Baixou o app", sub: null, n: 470, tempo: null, detalhes: [], motivo_saida: null, fonte: "posthog", sem_dado: null },
    { id: "escolheu", nome: "Escolheu ser cliente", sub: null, n: 300, tempo: null, detalhes: [], motivo_saida: null, divide: true, fonte: "posthog", sem_dado: null },
    { id: "teste_ini", nome: "Começou o teste com a IA", sub: null, n: 102, tempo: "40 s", detalhes: [], motivo_saida: null, ramo: true, fonte: "banco", sem_dado: null },
    { id: "conta", nome: "Criou a conta", sub: null, n: 220, tempo: "4 min", detalhes: ["Google 61%"], motivo_saida: "saiu na tela de cadastro", fonte: "banco", sem_dado: null },
  ],
};
const CAMINHOS = {
  papel: "cliente", dias: 30, total: 10, etapas: ["Primeira ação", "Resultado"], alvos: ["fechou"], rotulo_alvo: "fechar",
  nos: { ia: { coluna: 0, nome: "Busca com IA" }, fechou: { coluna: 1, nome: "Fechou e pagou" }, parou: { coluna: 1, nome: "Parou", parou: true } },
  liga: [["ia", "fechou", 4], ["ia", "parou", 6]], sub: {}, voltas: {}, detalhes: { ia: { tempo: "6 min" } },
  pessoas_no: { ia: [5] }, pessoas_liga: { "ia>fechou": [5] }, pessoas: { 5: { nome: "Ana Lima", papel: "cliente", temperatura: "quente", chance: 0.4, situacao: "pediu ajuste" } },
};
const PESSOAS = { total: 1, pagina: 1, pessoas: [{ id: 5, nome: "Ana Lima", papel: "cliente", cidade: "Campinas", uf: "SP", profissao: null, criado_em: "2026-11-12T10:00:00Z", ultimo_acesso: "2026-11-18T10:00:00Z", origem: "Sem indicação", etapa: "Pediu ajuste na proposta", temperatura: "quente", chance: 0.4, categoria: "exigente_detalhista", analisado_em: "2026-11-18T10:00:00Z" }] };
const FICHA = {
  nome: "Ana Lima",
  dossie: { pessoa: { papel: "cliente", cidade: "Campinas", uf: "SP" }, numeros: { pedidos: 1 }, fatos: [{ id: "E1", em: "2026-11-15T10:00:00Z", tipo: "pedido", texto: "pedido 11" }], novos_desde_a_ultima: 1, temperatura_por_codigo: { nivel: "morno", motivos: ["tem pedido aberto"] }, faltou: [] },
  suficiencia: { ok: true, motivo: null },
  custo_estimado_usd: 0.061,
  analises: [{ id: 1, papel: "cliente", temperatura: "quente", temperatura_codigo: "morno", categoria: "decidido_com_pressa", chance: "0.4000", custo_usd: "0.058", fatos: 10, em: "2026-11-18T10:00:00Z",
    previsoes: [{ pergunta: "fecha_contrato", probabilidade: 0.35, vence_em: "2026-12-18T10:00:00Z", aconteceu: null }],
    resultado: { resumo: "Cliente com pressa e pedido claro.", categoria_de_perfil: "decidido_com_pressa", temperatura: { nivel: "quente", motivo: "disse urgente", diverge_das_regras: true, provas: ["E1"] }, tracos: [{ traco: "urgencia_real", nivel: "alto", confianca: "alta", provas: ["E1"] }], chance_de_fechar_90_dias: 0.4, previsoes: [], follow_up: { acao: "ligar", quando: "hoje", por_que: "Está quente.", mensagem_sugerida: "" }, alertas: [], lacunas: [], o_que_mudaria_a_leitura: "", fatos_citados: { E1: { em: "2026-11-15T10:00:00Z", tipo: "pedido", texto: "pedido 11 Piso" } } } }],
  ficha: { papel: "cliente", cidade: "Campinas", uf: "SP", profissao: null, criado_em: "2026-11-12T10:00:00Z", ultimo_acesso: "2026-11-18T10:00:00Z", origem: "Sem indicação", etapa: "Pediu ajuste na proposta", posthog_url: "https://us.posthog.com/project/715328/person/5",
    conta: [["Conta criada", "12/11"]], uso_do_app: null, pedidos: [{ titulo: "Piso da sala", sub: "publicado", campos: { "Onde no imóvel": "Sala" } }], propostas: [], pagamentos: [], sinais: [], conversas_ia: [{ id: 77, tipo: "pedido", quando: "2026-11-19T02:40:00Z", mensagens: 10, custo_usd: 0.01, sinais: 0, trecho: [{ de: "ia", texto: "trecho curto" }] }], caminho: { principal: ["ia"], pos: [] }, trajetoria: [],
    guardados: {
      rascunhos: [{ titulo: "Pedido começado com a IA, não publicado: Reforma do banheiro", sub: "6 mensagens · parou 17/11", campos: { IA: "pedido" }, conversa_id: 77 }],
      arquivados: [{ titulo: "Oferta de Carlos Pinto arquivada", sub: "pedido Piso da sala · 16/11", campos: { "Compatibilidade": "81%" } }],
      aviso_rascunhos: null,
    } },
};
const PARTICIPANTE = (id: number, name: string, type: "prestador" | "contratante") => ({ id, name, type, masked_email: null, is_admin: false, perfil_completo: true, city: null, state: null, perfil: null, banner: null });
/** Cliente reclamou do piso; o profissional propôs R$ 300 de desconto e o cliente aceitou. */
const RECLAMACAO = {
  id: 31, step_id: 2, ticket_id: 700, cliente_id: 5, profissional_id: 50, texto: "O piso ficou desnivelado perto da porta",
  aberta_por: "cliente" as const, situacao: "com_a_arqdoor" as const, prazo_ate: null, disputa: false, motivo_da_disputa: null,
  resposta: "desconto" as const, resposta_valor: 300, resposta_texto: "Posso dar um desconto", respondida_em: "2026-11-18T10:00:00Z",
  cliente_aceitou: true, cliente_respondeu_em: "2026-11-18T12:00:00Z", decisao: null, valor_reembolso: null, valor_ao_profissional: null,
  decisao_motivo: null, decidida_em: null, reembolso_feito_em: null, repasse_feito_em: null, continuar: null, contrato_encerrado_em: null,
  nota_cliente: null, comentario_cliente: null, nota_profissional: null, comentario_profissional: null, created_at: "2026-11-17T10:00:00Z",
};
const OPERACOES = { data: {
  user: PARTICIPANTE(5, "Ana Lima", "contratante"),
  summary: { conversations_count: 1, contracts_count: 1, active_contracts_count: 1, running_payments_count: 0, paid_payments_count: 1, financially_cleared_steps_count: 1, concluded_steps_count: 1, ready_payout_steps_count: 0, ready_payout_total: 0 },
  generated_at: "2026-11-19T03:00:00Z",
  conversations: [{
    conversation_id: 40, created_at: "2026-11-15T10:00:00Z", updated_at: "2026-11-18T10:00:00Z", is_negotiation: true, is_admin_thread: false, message_count: 3,
    last_message_preview: "Posso começar segunda", last_message_at: "2026-11-18T10:00:00Z",
    participants: [PARTICIPANTE(5, "Ana Lima", "contratante"), PARTICIPANTE(50, "Carlos Pinto", "prestador")],
    active_contracts_count: 1, ready_payout_steps_count: 0, ready_payout_total: 0,
    contracts: [{
      id: 700, status: "em andamento", conversation_id: 40, created_at: "2026-11-16T10:00:00Z", updated_at: "2026-11-18T10:00:00Z", total_price: 2400, total_date: 10,
      payment_preference: "per_step", payment_status: "partial_steps", allow_grouped_payment: false, provider_receiving_method: "escrow", provider_receiving_account_label: null,
      provider: PARTICIPANTE(50, "Carlos Pinto", "prestador"), contractor: PARTICIPANTE(5, "Ana Lima", "contratante"),
      running_payments_count: 0, paid_payments_count: 1, failed_payments_count: 0, financially_cleared_steps_count: 1, concluded_steps_count: 1, ready_payout_steps_count: 0, ready_payout_total: 0,
      latest_document: null,
      groups: [
        { key: "b", label: "Banheiro", order: 2, steps_count: 1, financially_cleared_steps_count: 0, concluded_steps_count: 0, payout_ready_steps_count: 0, total_amount: 900, ready_payout_total: 0 },
        { key: "a", label: "Cozinha", order: 1, steps_count: 2, financially_cleared_steps_count: 2, concluded_steps_count: 1, payout_ready_steps_count: 0, total_amount: 2400, ready_payout_total: 0 },
      ],
      reclamacoes: [RECLAMACAO],
      steps: [
        { id: 1, title: "Demolição", status: "Concluido", price: 1200, signature: true, confirm_freelancer: true, confirm_contractor: true, is_financially_cleared: true, payout_ready: false, payout_reason: "", payment_status_bucket: "paid", payout_status: "pago", group_id: null, group_sequence: null, group_key: "a", group_label: "Grupo 1", group_order: 1, created_at: null, updated_at: null, start_date: null, end_date: null, started_at: null, latest_payment: null },
        { id: 2, title: "Assentar piso", status: "Recusado", price: 1200, signature: false, confirm_freelancer: true, confirm_contractor: false, is_financially_cleared: true, payout_ready: false, payout_reason: "", payment_status_bucket: "paid", group_id: null, group_sequence: null, group_key: "a", group_label: "Grupo 1", group_order: 1, created_at: null, updated_at: null, start_date: null, end_date: null, started_at: null, latest_payment: null },
        { id: 3, title: "Louças", status: "Pendente", price: 900, signature: false, confirm_freelancer: false, confirm_contractor: false, is_financially_cleared: false, payout_ready: false, payout_reason: "", payment_status_bucket: "other", group_id: null, group_sequence: null, group_key: "b", group_label: "Grupo 2", group_order: 2, created_at: null, updated_at: null, start_date: null, end_date: null, started_at: null, latest_payment: null },
      ],
    }],
  }],
} };
const CHAT = { data: {
  conversation: { conversation_id: 40, participants: [PARTICIPANTE(5, "Ana Lima", "contratante"), PARTICIPANTE(50, "Carlos Pinto", "prestador")] },
  messages: [
    { message_id: 3, conversation_id: 40, sender_id: 50, content: "Posso começar segunda", createdAt: "2026-11-18T10:00:00Z" },
    { message_id: 1, conversation_id: 40, sender_id: 5, content: "Oi, quanto fica o piso?", createdAt: "2026-11-17T10:00:00Z" },
    { message_id: 2, conversation_id: 40, sender_id: 50, content: "R$ 2.400 com material", createdAt: "2026-11-17T11:00:00Z" },
  ],
} };

const KIRIOS = {
  dias: 90,
  versao: { nome: "Kirios Alpha 1.1", ligado: false, fonte_do_match: "admin", fase: "arranque", contratos_reais: 62, minimo_para_selecao: 100, transicao_em: 700 },
  acerto: { cartoes: 412, contratos: 62, auc: 0.71, auc_dentro_do_pedido: 0.63, intervalo: [0.66, 0.76], sem_dado: null },
  calibracao: [{ faixa: "80–100%", cartoes: 50, disse_media: 88, fechou_pct: 34 }],
  funil_por_faixa: [{ faixa: "80–100%", mostrados: 50, perfil_aberto: null, conversa: 29, proposta: 22, contrato: 17 }],
  posicao: [{ posicao: 1, cartoes: 145, contratos: 31 }],
  mercado: { pedidos: 145, liquidez_48h_pct: 64, ofertas_por_pedido: 2.8, pedidos_sem_oferta: 25, retomadas: null, profissionais_ativos: 88, profissionais_sem_oferta_pct: 31, concentracao_top10_pct: 38, sairam: null },
  sinais: [{ sinal: "data_confirmada", pedidos_com: 58, pct: 40 }], semanas: [], registro: [],
};

const TEXTO_LONGO = `Entendi: piso da sala de 20 m², ${"com rodapé novo e nivelamento do contrapiso, ".repeat(10)}fim da mensagem longa.`;
const CONVERSA = {
  id: 77, tipo: "pedido", origem: "inicio_busca", publica: false, turnos: 5, pessoa: { id: 5, nome: "Ana Lima", email: "ana@x.com" },
  mensagens: Array.from({ length: 10 }, (_, i) => ({ de: i % 2 ? "ia" : "eu", texto: i === 9 ? TEXTO_LONGO : `mensagem ${i + 1}`, em: `2026-11-19T02:${String(26 + i).padStart(2, "0")}:00Z` })),
};

/** Os botões de ação de um pedaço da tela (sem o ícone "i" de explicação). */
const botoes = (el: HTMLElement) => within(el).getAllByRole("button").filter((b) => b.getAttribute("aria-label") !== "O que é isto?").map((b) => b.textContent);

/** A linha da conversa com a IA na aba Conta (a única com custo em US$). */
const linhaDaIA = async () => {
  await screen.findByText(/US\$ 0,01/);
  return screen.getAllByRole("row").find((r) => within(r).queryByText(/US\$ 0,01/))!;
};

beforeEach(() => {
  apiRequestMock.mockReset();
  baixarMock.mockReset();
  apiRequestMock.mockImplementation((_metodo: string, rota: string, corpo?: { confirmar?: boolean }) => {
    if (rota === "/admin/analise/perguntar") return Promise.resolve(ok(corpo?.confirmar ? { success: true, resposta: "Ligue hoje para PH #5: está quente, chance de 40%.", sabe: true, fontes: ["Últimas análises"], custo_usd: 0.05 } : { success: true, previa: true, custo_estimado_usd: 0.072 }));
    if (rota.startsWith("/admin/analise/previsoes")) return Promise.resolve(ok({ pendentes: 0, conferidas_agora: 0, geral: null }));
    if (rota === "/admin/users/5/operations") return Promise.resolve(ok(OPERACOES));
    if (rota === "/admin/conversations/40/messages") return Promise.resolve(ok(CHAT));
    if (rota === "/admin/ai-conversas/77") return Promise.resolve(ok({ conversa: CONVERSA }));
    if (rota === "/admin/analise/exportar") return Promise.resolve(ok({ planilhas: { Pessoas: { colunas: ["id", "nome"], linhas: [[5, "Ana Lima"]] } } }));
    if (rota.startsWith("/admin/analise/visao")) return Promise.resolve(ok(VISAO));
    if (rota.startsWith("/admin/analise/funil")) return Promise.resolve(ok(FUNIL));
    if (rota.startsWith("/admin/analise/caminhos")) return Promise.resolve(ok(CAMINHOS));
    if (rota.startsWith("/admin/analise/kirios")) return Promise.resolve(ok(KIRIOS));
    if (rota.startsWith("/admin/analise/pessoas/5/analisar")) return Promise.resolve(ok({ success: true }));
    if (rota.startsWith("/admin/analise/pessoas/5")) return Promise.resolve(ok(FICHA));
    if (rota.startsWith("/admin/analise/pessoas")) return Promise.resolve(ok(PESSOAS));
    return Promise.resolve(ok({}));
  });
});

describe("Análise no painel", () => {
  it("visão geral mostra os números, o funil com o teste da IA como opcional e a fila de ação", async () => {
    render(<AdminAnaliseSection />);
    expect(await screen.findByText("33")).toBeInTheDocument();
    expect(await screen.findByText(/Começou o teste com a IA/)).toBeInTheDocument();
    expect(screen.getByText("opcional")).toBeInTheDocument();
    expect(screen.getByText("dividiu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ligar o PostHog" })).toBeInTheDocument();
    expect(screen.getByText(/Piso da sala/)).toBeInTheDocument();
    expect(screen.getAllByText(/Mandar mensagem no app/).length).toBeGreaterThan(0);
  });

  it("pessoas têm a etiqueta com o mesmo código do PostHog e a busca aceita o código", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    const etiqueta = await screen.findByText("PH #5");
    expect(etiqueta.closest("a")).toHaveAttribute("href", "https://us.posthog.com/project/715328/person/5");
    fireEvent.change(screen.getByPlaceholderText(/código do PostHog/), { target: { value: "#5" } });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("GET", expect.stringContaining("busca=5")));
  });

  it("um bloco dos caminhos abre a janela com as pessoas e leva à investigação", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Caminhos/ }));
    fireEvent.click((await screen.findAllByText("Busca com IA"))[0]);
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByText("pediu ajuste")).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole("button", { name: "investigar" }));
    expect(await screen.findByText("Cliente com pressa e pedido claro.")).toBeInTheDocument();
  });

  it("investigar roda a IA só depois de confirmar o custo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    expect(await screen.findByText("Cliente com pressa e pedido claro.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA/ }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("US$ 0,061"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/analise/pessoas/5/analisar", { confirmar: true, mesmo_com_pouco_dado: false }, undefined, 180000));
    confirmar.mockRestore();
  });

  it("sem confirmar, não chama a IA", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: /Analisar com IA/ }));
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", expect.stringContaining("/analisar"), expect.anything(), undefined, 180000);
    confirmar.mockRestore();
  });

  it("a aba Algoritmo é separada da precisão da IA e mostra o acerto do % dos cartões", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Algoritmo/ }));
    expect(await screen.findByText("Algoritmo de match")).toBeInTheDocument();
    expect(screen.getByText("versão Alpha 1.1")).toBeInTheDocument();
    expect(screen.queryByText(/Kirios/)).not.toBeInTheDocument();
    expect(screen.getByText("ainda não ligado no app")).toBeInTheDocument();
    expect(screen.getByText(/entre 0,66 e 0,76/)).toBeInTheDocument();
    expect(screen.getByText("1º cartão")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("GET", expect.stringContaining("/previsoes"), undefined, undefined, 120000);
  });

  it("perfis elegíveis: o admin tira e põe profissionais no match", async () => {
    const LISTA = { profissionais: [
      { user_id: 50, nome: "Carlos Pinto", profissao: "Pedreiro", profissoes_reconhecidas: ["Pedreiro"], cidade: "Campinas", verificado: true, perfil_publico: true, suspenso: false, tem_perfil_de_demanda: true, nota: 4.8, avaliacoes: 6, elegivel: true },
      { user_id: 51, nome: "Dora Lima", profissao: "Faz tudo", profissoes_reconhecidas: [], cidade: "Campinas", verificado: false, perfil_publico: true, suspenso: false, tem_perfil_de_demanda: false, nota: null, avaliacoes: 0, elegivel: true },
    ] };
    const padrao = apiRequestMock.getMockImplementation()!;
    apiRequestMock.mockImplementation((m: string, rota: string, c?: any) => (rota === "/admin/algoritmo/elegiveis" ? Promise.resolve(ok(m === "GET" ? LISTA : { success: true, mudou: 1 })) : padrao(m, rota, c)));
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Algoritmo/ }));
    expect(await screen.findAllByTestId("perfil-elegivel")).toHaveLength(2);
    expect(screen.getByTestId("contagem-elegiveis")).toHaveTextContent("2 de 2 elegíveis");
    expect(screen.getByText(/sem profissão reconhecida: nunca é sugerido/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Carlos Pinto no match"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/admin/algoritmo/elegiveis", { ids: [50], elegivel: false }));
    expect(screen.getByTestId("contagem-elegiveis")).toHaveTextContent("1 de 2 elegíveis");
    fireEvent.click(screen.getByRole("button", { name: "Fora do match" }));
    expect(screen.getAllByTestId("perfil-elegivel")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Marcar os da lista" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/admin/algoritmo/elegiveis", { ids: [50], elegivel: true }));
  });
});

describe("Pergunte à IA, planilha e conversa inteira", () => {
  it("o Pergunte à IA mostra o custo e só chama a IA depois de confirmar", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Precisão da IA/ }));
    expect(await screen.findByText("Pergunte à IA")).toBeInTheDocument();
    // o custo aparece no botão antes de enviar
    expect(await screen.findByRole("button", { name: /Perguntar · ≈ US\$ 0,072/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quem devo ligar hoje?" }));
    expect(screen.getByDisplayValue("Quem devo ligar hoje?")).toBeInTheDocument();

    // 1ª vez: cancela na confirmação, a IA não é chamada
    fireEvent.click(screen.getByRole("button", { name: /Perguntar/ }));
    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(confirmar.mock.calls[0][0]).toContain("US$ 0,072");
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", "/admin/analise/perguntar", expect.objectContaining({ confirmar: true }), undefined, 180000);

    // 2ª vez: confirma e a resposta aparece, com o código PH clicável e o nome ao lado
    await waitFor(() => expect(screen.getByRole("button", { name: /Perguntar/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /Perguntar/ }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/analise/perguntar", { pergunta: "Quem devo ligar hoje?", historico: [], confirmar: true }, undefined, 180000));
    expect(await screen.findByText(/está quente, chance de 40%/)).toBeInTheDocument();
    expect(screen.getByText("Últimas análises")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /PH #5\s*Ana Lima/ })).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("Baixar planilha busca as abas e baixa um .xlsx", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("button", { name: /Baixar planilha/ }));
    await waitFor(() => expect(baixarMock).toHaveBeenCalledTimes(1));
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/analise/exportar", undefined, undefined, 180000);
    const [bytes, nome, tipo] = baixarMock.mock.calls[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(nome).toMatch(/^analise-arqdoor-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(tipo).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("ver abre a conversa inteira e Baixar monta o .txt", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conversas" }));
    fireEvent.click(within(await linhaDaIA()).getByRole("button", { name: "ver" }));
    const janela = await screen.findByRole("dialog");
    await waitFor(() => expect(within(janela).getAllByTestId("mensagem-da-conversa")).toHaveLength(10));
    // nada cortado: a mensagem longa aparece inteira
    expect(within(janela).getByText(TEXTO_LONGO)).toBeInTheDocument();
    expect(within(janela).queryByText("trecho curto")).not.toBeInTheDocument();
    expect(within(janela).getAllByText(/18\/11 23:26/).length).toBeGreaterThan(0);
    fireEvent.click(within(janela).getByRole("button", { name: /Baixar \.txt/ }));
    expect(baixarMock).toHaveBeenCalledTimes(1);
    const [conteudo, nome, tipo] = baixarMock.mock.calls[0];
    expect(nome).toBe("conversa-ia-77-pedido.txt");
    expect(tipo).toContain("text/plain");
    expect(conteudo).toContain("[18/11 23:26] Pessoa: mensagem 1");
    expect(conteudo).toContain("[18/11 23:27] IA: mensagem 2");
    expect(conteudo).toContain(TEXTO_LONGO);
    expect(conteudo).not.toContain("ana@x.com");
  });

  it("Baixar na linha da conversa busca a conversa inteira", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conversas" }));
    fireEvent.click(within(await linhaDaIA()).getByRole("button", { name: "Baixar" }));
    await waitFor(() => expect(baixarMock).toHaveBeenCalledTimes(1));
    expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/ai-conversas/77");
    expect(baixarMock.mock.calls[0][0]).toContain("Mensagens: 10");
  });

  it("o gráfico por semana mostra o número de pedidos e de contratos", async () => {
    render(<AdminAnaliseSection />);
    const semana = await screen.findByTestId("semana");
    expect(within(semana).getByLabelText("8 pedidos")).toHaveTextContent("8");
    expect(within(semana).getByLabelText("3 contratos")).toHaveTextContent("3");
  });

  it("aba Conta mostra os contratos com as fases, rascunhos e arquivados, sem as conversas", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    expect(await screen.findByText(/1 de 3 fases concluídas · 1 recusada/)).toBeInTheDocument();
    expect(screen.getByText(/Reforma do banheiro/)).toBeInTheDocument();
    expect(screen.getByText("Oferta de Carlos Pinto arquivada")).toBeInTheDocument();
    expect(screen.queryByText("Conversas no chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversas com a IA")).not.toBeInTheDocument();
  });

  it("aba Conversas mostra o chat inteiro na ordem e baixa o .txt", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conversas" }));
    expect(await screen.findByText("Posso começar segunda")).toBeInTheDocument();
    expect(screen.getByText("Conversas com a IA")).toBeInTheDocument();
    expect(screen.queryByText(/contrato 700/)).not.toBeInTheDocument();

    const linhaDoChat = screen.getAllByRole("row").find((r) => within(r).queryByText("Posso começar segunda"))!;
    fireEvent.click(within(linhaDoChat).getByRole("button", { name: "ver" }));
    const janela = await screen.findByRole("dialog");
    await waitFor(() => expect(within(janela).getAllByTestId("mensagem-do-chat")).toHaveLength(3));
    // na ordem em que foram mandadas
    expect(within(janela).getAllByTestId("mensagem-do-chat")[0]).toHaveTextContent("Oi, quanto fica o piso?");
    fireEvent.click(within(janela).getByRole("button", { name: /Baixar \.txt/ }));
    const [conteudo, nome] = baixarMock.mock.calls[0];
    expect(nome).toBe("chat-40.txt");
    expect(conteudo).toContain("Entre: Ana Lima (PH #5) e Carlos Pinto (PH #50)");
    expect(conteudo.indexOf("Oi, quanto fica o piso?")).toBeLessThan(conteudo.indexOf("Posso começar segunda"));
  });

  it("contrato abre o detalhe com cada fase", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    // grupos de pagamento na ordem do contrato, cada um com as suas fases
    const grupos = within(janela).getAllByRole("region", { name: /Grupo de pagamento/ });
    expect(grupos.map((g) => g.getAttribute("aria-label"))).toEqual(["Grupo de pagamento: Cozinha", "Grupo de pagamento: Banheiro"]);
    expect(within(grupos[0]).getByText("Pago")).toBeInTheDocument();
    expect(within(grupos[1]).getByText("Esperando pagamento")).toBeInTheDocument();
    expect(within(janela).getByText("parte das fases paga")).toBeInTheDocument();
    expect(within(janela).getByTestId("situacao-agora")).toHaveTextContent('Reclamação de "Assentar piso". Os dois se acertaram');

    const [demolicao, piso, loucas] = within(janela).getAllByTestId("fase");
    // fase repassada: não muda mais, só os avisos de como o dinheiro foi liberado
    expect(within(demolicao).getByText("Repassada ao profissional")).toBeInTheDocument();
    expect(within(demolicao).getAllByRole("button").map((b) => b.textContent)).toEqual(["Avisar: liberado pelo prazo", "Avisar: liberado com acordo"]);
    expect(within(demolicao).getByText(/já saiu/)).toBeInTheDocument();
    // recusada: refazer ou liberar com acordo
    // reclamação: o texto do cliente, a proposta do profissional e as decisões da ArqDoor
    expect(within(piso).getByText("Reclamação aberta")).toBeInTheDocument();
    expect(within(piso).getByTestId("reclamacao")).toHaveTextContent("“O piso ficou desnivelado perto da porta”");
    expect(within(piso).getByTestId("reclamacao")).toHaveTextContent("Carlos Pinto propôs um desconto de R$ 300");
    expect(within(piso).getByTestId("reclamacao")).toHaveTextContent("Ana Lima aceitou a proposta");
    expect(botoes(piso)).toEqual(["Reabrir para refazer", "Reembolso total", "Reembolso parcial", "Liberar sem reembolso"]);
    // o desconto aceito é a decisão sugerida
    expect(within(piso).getByRole("button", { name: /Reembolso parcial/ }).className).toContain("bg-orange-600");
    // grupo sem pagamento: a fase espera e o lembrete fica no grupo (pago de uma vez)
    expect(within(loucas).queryAllByRole("button")).toHaveLength(0);
    expect(within(loucas).getByText(/Começa quando o cliente pagar o grupo Banheiro/)).toBeInTheDocument();
    expect(within(grupos[1]).getByRole("button", { name: /Lembrar o cliente de pagar/ })).toBeInTheDocument();
  });

  it("reembolso parcial decide pela reclamação com o valor aceito, avisa os dois e recarrega", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    const piso = within(janela).getAllByTestId("fase")[1];
    fireEvent.click(within(piso).getByRole("button", { name: /Reembolso parcial/ }));
    const caixa = within(piso).getByRole("group", { name: /Confirmar: Reembolso parcial/ });
    const confirmar = within(caixa).getByRole("button", { name: "Confirmar" });
    expect(within(caixa).getByLabelText(/Quanto volta ao cliente/)).toHaveValue("300");
    expect(confirmar).toBeDisabled();
    fireEvent.change(within(caixa).getByPlaceholderText(/cliente confirmou/), { target: { value: "Desconto aceito pelos dois" } });
    expect(within(caixa).getByLabelText("Aviso para o cliente")).toHaveValue('ArqDoor: decidimos reembolsar R$ 300 da fase "Assentar piso" do contrato 700. Avisamos quando o reembolso for feito.');
    fireEvent.click(confirmar);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/reclamacoes/31/decidir", { decisao: "reembolso_parcial", motivo: "Desconto aceito pelos dois", valor_reembolso: 300 }));
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", expect.stringContaining("/admin/steps/"), expect.anything());
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", expect.objectContaining({ userId: 5 })));
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", expect.objectContaining({ userId: 50 }));
    expect(await within(janela).findByRole("status")).toHaveTextContent("As duas pessoas foram avisadas");
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("GET", "/admin/users/5/operations", undefined, undefined, 90000));
  });

  it("fase já aprovada: avisar liberado com acordo manda um texto para cada um, sem mexer na fase", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    const demolicao = within(janela).getAllByTestId("fase")[0];
    fireEvent.click(within(demolicao).getByRole("button", { name: /Avisar: liberado com acordo/ }));
    expect(within(demolicao).getByLabelText("Aviso para o cliente")).toHaveValue('ArqDoor: como você e o profissional concordaram, a fase "Demolição" do contrato 700 foi aprovada. O valor de R$ 1.200 foi liberado para o profissional.');
    expect(within(demolicao).getByLabelText("Aviso para o profissional")).toHaveValue('ArqDoor: o cliente concordou e a fase "Demolição" do contrato 700 foi aprovada. O valor de R$ 1.200 foi liberado para você.');
    fireEvent.click(within(demolicao).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", { userId: 50, content: expect.stringContaining("liberado para você") }));
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", { userId: 5, content: expect.stringContaining("como você e o profissional concordaram") });
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", expect.stringContaining("/admin/steps/"), expect.anything());
  });

  it("fase aprovada sozinha pelo prazo: o aviso do prazo é o botão principal", async () => {
    const op = JSON.parse(JSON.stringify(OPERACOES));
    Object.assign(op.data.conversations[0].contracts[0].steps[0], { payout_status: null, auto_approved_at: "2026-11-18T10:00:00Z" });
    const padrao = apiRequestMock.getMockImplementation()!;
    apiRequestMock.mockImplementation((m: string, rota: string, c?: any) => (rota === "/admin/users/5/operations" ? Promise.resolve(ok(op)) : padrao(m, rota, c)));
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    const demolicao = within(janela).getAllByTestId("fase")[0];
    expect(within(demolicao).getByRole("button", { name: /Avisar: liberado pelo prazo/ }).className).toContain("bg-orange-600");
    expect(within(demolicao).getByRole("button", { name: /Avisar: liberado com acordo/ }).className).not.toContain("bg-orange-600");
    expect(within(demolicao).getByRole("button", { name: /Voltar para em andamento/ })).toBeInTheDocument();
    fireEvent.click(within(demolicao).getByRole("button", { name: /Avisar: liberado pelo prazo/ }));
    expect((within(demolicao).getByLabelText("Aviso para o cliente") as HTMLTextAreaElement).value).toContain("o prazo de 3 dias para você conferir");
  });

  it("reclamação resolvida com reembolso: marcar reembolso feito; cliente sem querer continuar: encerrar", async () => {
    const op = JSON.parse(JSON.stringify(OPERACOES));
    const t = op.data.conversations[0].contracts[0];
    Object.assign(t.reclamacoes[0], { situacao: "resolvida", decisao: "reembolso_total", valor_reembolso: 1200, valor_ao_profissional: 0, decisao_motivo: "Sem resposta" });
    Object.assign(t.steps[1], { payout_status: "reembolsado" });
    const padrao = apiRequestMock.getMockImplementation()!;
    apiRequestMock.mockImplementation((m: string, rota: string, c?: any) => (rota === "/admin/users/5/operations" ? Promise.resolve(ok(op)) : padrao(m, rota, c)));
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    const piso = within(janela).getAllByTestId("fase")[1];
    expect(within(piso).getByText("Reembolsada ao cliente")).toBeInTheDocument();
    expect(botoes(piso)).toEqual(["Marcar reembolso feito (R$ 1.200)"]);
    fireEvent.click(within(piso).getByRole("button", { name: /Marcar reembolso feito/ }));
    // marcar o que já foi feito não pede motivo
    fireEvent.click(within(piso).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/reclamacoes/31/reembolso-feito", {}));
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", { userId: 5, content: expect.stringContaining("Quer continuar o contrato") });
  });

  it("Visão geral lista as reclamações e abre o contrato da reclamação", async () => {
    const padrao = apiRequestMock.getMockImplementation()!;
    apiRequestMock.mockImplementation((m: string, rota: string, c?: any) => (rota === "/admin/reclamacoes?abertas=1"
      ? Promise.resolve(ok({ data: [{ ...RECLAMACAO, fase: { id: 2, titulo: "Assentar piso", valor: 1200 }, cliente: { id: 5, nome: "Ana Lima" }, profissional: { id: 50, nome: "Carlos Pinto" } }] }))
      : padrao(m, rota, c)));
    render(<AdminAnaliseSection />);
    const item = await screen.findByTestId("reclamacao-na-lista");
    expect(item).toHaveTextContent("Assentar piso · R$ 1.200 · Ana Lima com Carlos Pinto");
    expect(item).toHaveTextContent("Os dois se acertaram: falta a ArqDoor executar (reembolso parcial ao cliente)");
    fireEvent.click(item);
    const janela = await screen.findByRole("dialog");
    expect(await within(janela).findByTestId("reclamacao")).toHaveTextContent("O piso ficou desnivelado");
  });

  it("lembrar de pagar só manda mensagem ao cliente, sem mexer na fase", async () => {
    render(<AdminAnaliseSection />);
    fireEvent.click(screen.getByRole("tab", { name: /Pessoas/ }));
    fireEvent.click(await screen.findByText("Ana Lima"));
    fireEvent.click(await screen.findByRole("button", { name: "Conta" }));
    fireEvent.click(await screen.findByText(/contrato 700 · com Carlos Pinto/));
    const janela = await screen.findByRole("dialog");
    const banheiro = within(janela).getByRole("region", { name: "Grupo de pagamento: Banheiro" });
    fireEvent.click(within(banheiro).getByRole("button", { name: /Lembrar o cliente de pagar/ }));
    fireEvent.click(within(banheiro).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/message", expect.objectContaining({ userId: 5, content: expect.stringContaining('o grupo "Banheiro" do contrato 700') })));
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", "/admin/message", expect.objectContaining({ userId: 50 }));
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", expect.stringContaining("/admin/steps/"), expect.anything());
  });
});
