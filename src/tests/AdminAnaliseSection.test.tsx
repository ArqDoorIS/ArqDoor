/**
 * Painel > Análise (v2): visão geral com funil desde o download, caminhos com janelas,
 * pessoas com o código do PostHog e a investigação com o botão da IA analista
 * (só roda com confirmação e mostrando o custo antes).
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAnaliseSection } from "@/features/admin/components/AdminAnaliseSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

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
    conta: [["Conta criada", "12/11"]], uso_do_app: null, pedidos: [{ titulo: "Piso da sala", sub: "publicado", campos: { "Onde no imóvel": "Sala" } }], propostas: [], pagamentos: [], sinais: [], conversas_ia: [], caminho: { principal: ["ia"], pos: [] }, trajetoria: [] },
};

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((_metodo: string, rota: string) => {
    if (rota.startsWith("/admin/analise/visao")) return Promise.resolve(ok(VISAO));
    if (rota.startsWith("/admin/analise/funil")) return Promise.resolve(ok(FUNIL));
    if (rota.startsWith("/admin/analise/caminhos")) return Promise.resolve(ok(CAMINHOS));
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
});
