/**
 * Painel > Visitas (26/11/2026): lista, filtro, detalhe, contestação, apagar localizações,
 * telemetria do app e tarja de descadastro dos comunicados.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminVisitasSection } from "@/features/admin/components/AdminVisitasSection";
import { TABS } from "@/features/admin/constants";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

/* ---------- fixtures ---------- */
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const falha = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });

const VISITA_CONTESTADA = {
  id: 1,
  status: "disputed",
  payment_status: "paid",
  scheduled_start: "2026-11-20T14:00:00Z",
  total_price: 25000,
  prazo_confirmacao_dias: 5,
  completion_confirmation_due_at: "2026-11-25T14:00:00Z",
  marcada_antes_do_horario: true,
  completion_disputed_at: "2026-11-21T10:00:00Z",
  cliente: { id: 10, name: "Carla Lima", email: "carla@x.com" },
  profissional: { id: 20, name: "Pedro Silva", email: "pedro@x.com" },
  created_at: "2026-11-15T10:00:00Z",
};

const VISITA_CONCLUIDA = {
  id: 2,
  status: "completed",
  payment_status: "paid",
  scheduled_start: "2026-11-18T10:00:00Z",
  total_price: 15000,
  prazo_confirmacao_dias: 3,
  completion_confirmation_due_at: null,
  marcada_antes_do_horario: false,
  completion_disputed_at: null,
  cliente: { id: 11, name: "Ana Costa", email: "ana@x.com" },
  profissional: { id: 21, name: "Lucas Prado", email: "lucas@x.com" },
  created_at: "2026-11-10T10:00:00Z",
};

const LISTA_CONTESTADAS = {
  itens: [VISITA_CONTESTADA],
  total: 1,
  pagina: 1,
  por_pagina: 20,
  contestacoes_abertas: 1,
};

const LISTA_TODAS = {
  itens: [VISITA_CONTESTADA, VISITA_CONCLUIDA],
  total: 2,
  pagina: 1,
  por_pagina: 20,
  contestacoes_abertas: 1,
};

const LISTA_VAZIA = {
  itens: [],
  total: 0,
  pagina: 1,
  por_pagina: 20,
  contestacoes_abertas: 0,
};

const DETALHE = {
  visita: {
    ...VISITA_CONTESTADA,
    provider_completed_at: "2026-11-20T13:00:00Z",
    endereco_obra: { rua: "Rua das Flores", numero: "10", bairro: "Centro", cidade: "Campinas", uf: "SP", cep: "13010-000", complemento: "" },
    motivo_disputa: "Servico nao foi realizado direito",
    resolucao_disputa: null,
    motivo_cancelamento: null,
  },
  cliente: { id: 10, name: "Carla Lima", email: "carla@x.com", phone: "19999990000" },
  profissional: { id: 20, name: "Pedro Silva", email: "pedro@x.com", phone: null },
  pagamento: { status: "paid", valor: 25000 },
  historico: [
    { quando: "2026-11-15T10:00:00Z", quem: "carla@x.com", o_que: "Visita proposta" },
    { quando: "2026-11-21T10:00:00Z", quem: "carla@x.com", o_que: "Contestacao aberta" },
  ],
  localizacoes: [
    {
      id: 1, acao: "marcar", papel: "profissional", situacao: "ok",
      latitude: -22.9, longitude: -47.1, precisao_m: 10,
      simulada: false, distancia_da_obra_m: 50,
      capturada_em: "2026-11-20T13:00:00Z", created_at: "2026-11-20T13:00:00Z", apagada_em: null,
    },
    {
      id: 2, acao: "contestar", papel: "cliente", situacao: "sem_permissao",
      latitude: null, longitude: null, precisao_m: null,
      simulada: null, distancia_da_obra_m: null,
      capturada_em: "2026-11-21T10:00:00Z", created_at: "2026-11-21T10:00:00Z", apagada_em: null,
    },
  ],
};

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((_m: string, rota: string) => {
    if (rota.includes("/admin/visitas/1/localizacoes")) return Promise.resolve(ok({ apagadas: 1 }));
    if (rota.includes("/admin/visitas/1")) return Promise.resolve(ok(DETALHE));
    if (rota.includes("/admin/visit-disputes/1/resolve")) return Promise.resolve(ok({ success: true }));
    if (rota.includes("status=contestadas") || rota.includes("pagina=1") && !rota.includes("status=")) return Promise.resolve(ok(LISTA_CONTESTADAS));
    if (rota.includes("status=")) return Promise.resolve(ok(LISTA_VAZIA));
    if (rota.includes("/admin/visitas")) return Promise.resolve(ok(LISTA_CONTESTADAS));
    return Promise.resolve(ok({}));
  });
});

describe("aba Visitas", () => {
  it("existe no menu, só para o owner", () => {
    expect(TABS.find((t) => t.key === "visitas")).toMatchObject({ label: "Visitas", papeis: ["owner"] });
  });

  it("mostra lista de visitas com filtro Contestadas ativo por padrão", async () => {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    expect(itens).toHaveLength(1);
    expect(itens[0]).toHaveTextContent("Visita #1");
    expect(itens[0]).toHaveTextContent("Carla Lima");
    expect(itens[0]).toHaveTextContent("Pedro Silva");
  });

  it("mostra contador de contestações abertas", async () => {
    render(<AdminVisitasSection />);
    await screen.findAllByTestId("visita-na-lista");
    expect(screen.getByTestId("contador-contestacoes")).toHaveTextContent("1 contestação aberta");
  });

  it("chama callback onContestacoes com o número correto", async () => {
    const cb = vi.fn();
    render(<AdminVisitasSection onContestacoes={cb} />);
    await screen.findAllByTestId("visita-na-lista");
    await waitFor(() => expect(cb).toHaveBeenCalledWith(1));
  });

  it("mostra estado vazio quando não há visitas", async () => {
    apiRequestMock.mockImplementation((_m: string, rota: string) => {
      if (rota.includes("/admin/visitas")) return Promise.resolve(ok(LISTA_VAZIA));
      return Promise.resolve(ok({}));
    });
    render(<AdminVisitasSection />);
    await screen.findByText("Nenhuma visita encontrada.");
  });

  it("mostra estado de erro da API", async () => {
    apiRequestMock.mockImplementation(() => Promise.resolve(falha("Falha no servidor")));
    render(<AdminVisitasSection />);
    await screen.findByText("Falha no servidor");
  });
});

describe("detalhe da visita", () => {
  it("abre o detalhe ao clicar na visita e mostra as partes", async () => {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("detalhe-visita");
    expect(screen.getByText("Carla Lima")).toBeInTheDocument();
    expect(screen.getByText("Pedro Silva")).toBeInTheDocument();
  });

  it("mostra aviso de marcada antes do horário agendado", async () => {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("detalhe-visita");
    expect(screen.getByText(/Marcada antes do horário agendado/)).toBeInTheDocument();
  });

  it("mostra a seção de decidir contestação quando status = disputed", async () => {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("decidir-contestacao");
  });
});

describe("decidir contestação", () => {
  async function abrirDetalheComContestacao() {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    return screen.findByTestId("decidir-contestacao");
  }

  it("botão desabilitado enquanto falta decisão ou justificativa", async () => {
    await abrirDetalheComContestacao();
    const btn = screen.getByTestId("btn-confirmar-decisao");
    expect(btn).toBeDisabled();
  });

  it("botão habilitado com decisão e justificativa válida", async () => {
    await abrirDetalheComContestacao();
    fireEvent.click(screen.getByLabelText("Confirmar realização"));
    fireEvent.change(screen.getByLabelText("Justificativa da decisão"), {
      target: { value: "Visita confirmada pelo GPS" },
    });
    expect(screen.getByTestId("btn-confirmar-decisao")).not.toBeDisabled();
  });

  it("botão desabilitado com justificativa muito curta (menos de 3 caracteres)", async () => {
    await abrirDetalheComContestacao();
    fireEvent.click(screen.getByLabelText("Confirmar realização"));
    fireEvent.change(screen.getByLabelText("Justificativa da decisão"), {
      target: { value: "ok" },
    });
    expect(screen.getByTestId("btn-confirmar-decisao")).toBeDisabled();
  });

  it("mostra passo de confirmação ao clicar em Decidir", async () => {
    await abrirDetalheComContestacao();
    fireEvent.click(screen.getByLabelText("Cancelar e estornar"));
    fireEvent.change(screen.getByLabelText("Justificativa da decisão"), {
      target: { value: "Profissional nao foi ao local" },
    });
    fireEvent.click(screen.getByTestId("btn-confirmar-decisao"));
    const passo = await screen.findByTestId("passo-confirmacao");
    expect(passo).toHaveTextContent("Cancelar e estornar");
    expect(passo).toHaveTextContent("Profissional nao foi ao local");
  });

  it("envia a decisão com o corpo correto ao confirmar", async () => {
    await abrirDetalheComContestacao();
    fireEvent.click(screen.getByLabelText("Confirmar realização"));
    fireEvent.change(screen.getByLabelText("Justificativa da decisão"), {
      target: { value: "GPS confirmou presenca no local" },
    });
    fireEvent.click(screen.getByTestId("btn-confirmar-decisao"));
    await screen.findByTestId("passo-confirmacao");
    fireEvent.click(screen.getByTestId("btn-enviar-decisao"));
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "POST",
        "/admin/visit-disputes/1/resolve",
        { decision: "complete", reason: "GPS confirmou presenca no local" }
      )
    );
    await screen.findByTestId("aviso-decisao");
    expect(screen.getByTestId("aviso-decisao")).toHaveTextContent("Contestação decidida com sucesso.");
  });

  it("mostra erro quando o servidor recusa a decisão", async () => {
    apiRequestMock.mockImplementation((_m: string, rota: string) => {
      if (rota.includes("/admin/visit-disputes")) return Promise.resolve(falha("Decisao nao permitida"));
      if (rota.includes("/admin/visitas/1")) return Promise.resolve(ok(DETALHE));
      return Promise.resolve(ok(LISTA_CONTESTADAS));
    });
    await abrirDetalheComContestacao();
    fireEvent.click(screen.getByLabelText("Confirmar realização"));
    fireEvent.change(screen.getByLabelText("Justificativa da decisão"), {
      target: { value: "Visita confirmada" },
    });
    fireEvent.click(screen.getByTestId("btn-confirmar-decisao"));
    await screen.findByTestId("passo-confirmacao");
    fireEvent.click(screen.getByTestId("btn-enviar-decisao"));
    await screen.findByTestId("aviso-decisao");
    expect(screen.getByTestId("aviso-decisao")).toHaveTextContent("Decisao nao permitida");
  });
});

describe("apagar localizações", () => {
  it("mostra tabela de localizações com link Ver no mapa", async () => {
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("detalhe-visita");
    const link = screen.getByRole("link", { name: "Ver no mapa" });
    expect(link).toHaveAttribute("href", expect.stringContaining("openstreetmap.org"));
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("apaga localizações depois de confirmar e mostra quantas foram apagadas", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("btn-apagar-localizacoes");
    fireEvent.click(screen.getByTestId("btn-apagar-localizacoes"));
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/visitas/1/localizacoes")
    );
    await screen.findByTestId("aviso-apagar");
    expect(screen.getByTestId("aviso-apagar")).toHaveTextContent("1 coordenada apagada");
    confirmar.mockRestore();
  });

  it("não apaga se o usuário cancelar a confirmação", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("btn-apagar-localizacoes");
    fireEvent.click(screen.getByTestId("btn-apagar-localizacoes"));
    await new Promise((r) => setTimeout(r, 50));
    expect(apiRequestMock).not.toHaveBeenCalledWith("DELETE", "/admin/visitas/1/localizacoes");
    confirmar.mockRestore();
  });

  /**
   * Regressão: DetalheDeVisita deve usar deNovo do useApi para forçar o re-fetch real.
   * Sem a correção, recarregar() só incrementava vez local sem afetar useApi, e o detalhe
   * continuava mostrando as coordenadas antigas depois de apagar.
   */
  it("depois de apagar, busca o detalhe de novo e mostra a linha como apagada", async () => {
    const DETALHE_APOS_APAGAR = {
      ...DETALHE,
      localizacoes: [
        { ...DETALHE.localizacoes[0], latitude: null, longitude: null, apagada_em: "2026-11-26T10:00:00Z" },
        { ...DETALHE.localizacoes[1], apagada_em: "2026-11-26T10:00:00Z" },
      ],
    };
    let chamadas = 0;
    apiRequestMock.mockImplementation((_m: string, rota: string) => {
      if (rota.includes("/admin/visitas/1/localizacoes")) return Promise.resolve(ok({ apagadas: 2 }));
      if (rota.includes("/admin/visitas/1")) {
        chamadas++;
        return Promise.resolve(ok(chamadas <= 1 ? DETALHE : DETALHE_APOS_APAGAR));
      }
      return Promise.resolve(ok(LISTA_CONTESTADAS));
    });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminVisitasSection />);
    const itens = await screen.findAllByTestId("visita-na-lista");
    fireEvent.click(itens[0]);
    await screen.findByTestId("btn-apagar-localizacoes");

    // antes de apagar: link "Ver no mapa" visível (coordenadas existem)
    expect(screen.getByRole("link", { name: "Ver no mapa" })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-apagar-localizacoes"));

    // depois de apagar: detalhe re-buscado e linha exibe "Apagada"
    await waitFor(() =>
      expect(screen.getAllByText("Apagada").length).toBeGreaterThanOrEqual(1)
    );
    // link "Ver no mapa" não deve mais aparecer (coordenadas apagadas)
    expect(screen.queryByRole("link", { name: "Ver no mapa" })).toBeNull();

    confirmar.mockRestore();
  });
});
