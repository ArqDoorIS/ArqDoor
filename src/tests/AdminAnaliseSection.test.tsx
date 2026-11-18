/**
 * Painel > Análise: vendas por código, ficha da conta e o botão que roda a IA analista
 * (só com confirmação e mostrando o custo antes).
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminAnaliseSection } from "@/features/admin/components/AdminAnaliseSection";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const VISAO = {
  numeros: { clientes: 12, profissionais: 8, pedidos_abertos: 3, abertos_sem_oferta_2_dias: 1 },
  temperaturas: { analisados: 2, quente: 1, morno: 1, frio: 0, divergem_das_regras: 1 },
  follow_ups: [{ user_id: 5, nome: "Ana Lima", papel: "cliente", temperatura: "quente", chance: 0.4, acao: "mensagem_no_app", quando: "hoje", por_que: "Viu a proposta e não respondeu.", mensagem_sugerida: "Oi Ana, ficou alguma dúvida?" }],
  pedidos_sem_oferta: [{ id: 11, titulo: "Piso da sala", user_id: 5, nome: "Ana Lima", criado_em: "2026-11-15T10:00:00Z" }],
  convites_parados: [], propostas_paradas: [],
};
const FICHA = {
  nome: "Ana Lima",
  dossie: { pessoa: { papel: "cliente", cidade: "Campinas", uf: "SP" }, numeros: { pedidos: 1 }, fatos: [{ id: "E1", em: "2026-11-15T10:00:00Z", tipo: "pedido", texto: "pedido 11" }], novos_desde_a_ultima: 1, temperatura_por_codigo: { nivel: "morno", motivos: ["tem pedido aberto"] }, faltou: [] },
  suficiencia: { ok: true, motivo: null },
  custo_estimado_usd: 0.061,
  analises: [{ id: 1, papel: "cliente", temperatura: "quente", temperatura_codigo: "morno", categoria: "decidido_com_pressa", chance: "0.4000", custo_usd: "0.058", fatos: 10, em: "2026-11-18T10:00:00Z",
    previsoes: [{ pergunta: "fecha_contrato", probabilidade: 0.35, vence_em: "2026-12-18T10:00:00Z", aconteceu: null }],
    resultado: { resumo: "Cliente com pressa e pedido claro.", categoria_de_perfil: "decidido_com_pressa", temperatura: { nivel: "quente", motivo: "disse urgente", diverge_das_regras: true, provas: ["E1"] }, tracos: [{ traco: "urgencia_real", nivel: "alto", confianca: "alta", provas: ["E1"] }], chance_de_fechar_90_dias: 0.4, previsoes: [], follow_up: { acao: "ligar", quando: "hoje", por_que: "Está quente.", mensagem_sugerida: "" }, alertas: [], lacunas: [], o_que_mudaria_a_leitura: "", fatos_citados: { E1: { em: "2026-11-15T10:00:00Z", tipo: "pedido", texto: "pedido 11 Piso" } } } }],
};

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((metodo: string, rota: string) => {
    if (rota === "/admin/analise/visao") return Promise.resolve(ok(VISAO));
    if (rota.startsWith("/admin/analise/pessoas/5/analisar")) return Promise.resolve(ok({ success: true }));
    if (rota.startsWith("/admin/analise/pessoas/5")) return Promise.resolve(ok(FICHA));
    return Promise.resolve(ok({}));
  });
});

describe("Análise no painel", () => {
  it("Vendas mostra os números, a temperatura e o follow-up sugerido", async () => {
    render(<AdminAnaliseSection />);
    expect(await screen.findByText("Follow-ups para fazer")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Mandar mensagem no app/)).toBeInTheDocument();
    expect(screen.getByText(/“Oi Ana, ficou alguma dúvida\?”/)).toBeInTheDocument();
    expect(screen.getByText(/Piso da sala/)).toBeInTheDocument();
  });

  it("a ficha mostra a análise com prova e o botão roda só depois de confirmar o custo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminAnaliseSection />);
    fireEvent.click((await screen.findAllByText("Ana Lima"))[0]);
    expect(await screen.findByText("Cliente com pressa e pedido claro.")).toBeInTheDocument();
    expect(screen.getByText("discorda das regras")).toBeInTheDocument();
    expect(screen.getAllByText(/pedido 11 Piso/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Analisar com IA · US\$ 0\.061/ }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("US$ 0.061"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/analise/pessoas/5/analisar", { confirmar: true, mesmo_com_pouco_dado: false }, undefined, 180000));
    confirmar.mockRestore();
  });

  it("sem confirmar, não chama a IA", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminAnaliseSection />);
    fireEvent.click((await screen.findAllByText("Ana Lima"))[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Analisar com IA/ }));
    expect(apiRequestMock).not.toHaveBeenCalledWith("POST", expect.stringContaining("/analisar"), expect.anything(), undefined, 180000);
    confirmar.mockRestore();
  });
});
