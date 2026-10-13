/**
 * Testes da pagina de acompanhamento do contrato via link aceito.
 * specs/features/2026-10-convite-acompanhamento/03-contrato.md
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as queryClientLib from "@/lib/queryClient";
import InvitePublic from "../pages/InvitePublic";
import {
  formatDia,
  formatDataCompleta,
  textoDaEtapa,
  textoDaSuaVez,
  temSuaVez,
  labelStatus,
  formatValor,
} from "../features/convite/acompanhamento/helpers";
import type { EtapaAcompanhamento, FaseAtual } from "../features/convite/acompanhamento/types";

// -----------------------------------------------------------------------
// Mocks comuns
// -----------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useParams: () => ({ token: "tok-acomp" }),
  useLocation: () => ["/convite/tok-acomp", mockNavigate],
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

let mockUser: any = null;
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: !!mockUser,
    updateUserLocal: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

// -----------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------

const conviteAceito = {
  success: true,
  invite: {
    status: "accepted",
    title: "Reforma da cozinha",
    expires_at: null,
    steps: [],
  },
  provider: { name: "Rafael Jesus", profession: "Arquiteto", user: { name: "Rafael Jesus" } },
};

const dadosPublico = {
  papel: "publico",
  contrato: {
    titulo: "Reforma da cozinha",
    status: "em_andamento",
    assinado_em: "2026-10-02T14:00:00.000Z",
    concluido_em: null,
    etapas_total: 4,
    etapas_aprovadas: 1,
  },
  prestador: { nome: "Rafael Jesus", profissao: "Arquiteto" },
  fase_atual: {
    tipo: "etapa",
    etapa_numero: 2,
    etapa_titulo: "Projeto executivo",
    situacao: "entregue",
    grupo_nome: "Projeto",
    data: "2026-10-10T18:00:00.000Z",
  },
  grupos: [
    {
      nome: "Grupo 1 - Projeto",
      pago: true,
      etapas: [
        {
          numero: 1,
          titulo: "Levantamento",
          situacao: "aprovada",
          previsto_inicio: "2026-10-03",
          previsto_fim: "2026-10-05",
          iniciada_em: "2026-10-03T12:00:00.000Z",
          entregue_em: "2026-10-05T17:00:00.000Z",
          aprovada_em: "2026-10-06T10:00:00.000Z",
        },
      ],
    },
  ],
};

const dadosCliente = {
  ...dadosPublico,
  papel: "cliente",
  contrato: {
    ...dadosPublico.contrato,
    valor_total: 18400,
    valor_pago: 6400,
  },
  grupos: [
    {
      nome: "Grupo 1 - Projeto",
      pago: true,
      valor: 6400,
      etapas: [
        {
          ...dadosPublico.grupos[0].etapas[0],
          valor: 2400,
        },
      ],
    },
  ],
  links: { conversa: "/messages/5?ticket=33", pdf: true },
};

const dadosPrestador = {
  ...dadosCliente,
  papel: "prestador",
  links: { conversa: "/messages/12?ticket=33", pdf: true },
};

type ApiMock = { status: number; body: unknown };

function mockApis(
  inviteBody: ApiMock,
  acompBody: ApiMock,
  meuContratoBody?: ApiMock
) {
  vi.spyOn(queryClientLib, "apiRequest").mockImplementation(
    async (_method: string, path: string) => {
      if (path.endsWith("/acompanhamento")) {
        return {
          ok: acompBody.status < 400,
          status: acompBody.status,
          json: async () => acompBody.body,
        } as Response;
      }
      if (path.endsWith("/meu-contrato")) {
        const r = meuContratoBody ?? { status: 404, body: {} };
        return {
          ok: r.status < 400,
          status: r.status,
          json: async () => r.body,
        } as Response;
      }
      return {
        ok: inviteBody.status < 400,
        status: inviteBody.status,
        json: async () => inviteBody.body,
      } as Response;
    }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
  mockUser = null;
});

// -----------------------------------------------------------------------
// Testes de helpers (puros, sem render)
// -----------------------------------------------------------------------

describe("helper: formatDia", () => {
  it("formata data ISO completa", () => {
    expect(formatDia("2026-10-06T10:00:00.000Z")).toBe("06/10");
  });
  it("formata data YYYY-MM-DD", () => {
    expect(formatDia("2026-10-03")).toBe("03/10");
  });
  it("retorna string vazia para null", () => {
    expect(formatDia(null)).toBe("");
  });
  it("retorna string vazia para undefined", () => {
    expect(formatDia(undefined)).toBe("");
  });
});

describe("helper: formatDataCompleta", () => {
  it("formata dd/mm/aaaa", () => {
    expect(formatDataCompleta("2026-10-02T14:00:00.000Z")).toBe("02/10/2026");
  });
});

describe("helper: textoDaEtapa", () => {
  const base: EtapaAcompanhamento = {
    numero: 1,
    titulo: "Levantamento",
    situacao: "aguardando",
    previsto_inicio: "2026-10-20",
    previsto_fim: "2026-10-25",
    iniciada_em: null,
    entregue_em: null,
    aprovada_em: null,
  };

  it("aprovada mostra data de aprovacao", () => {
    const e = { ...base, situacao: "aprovada" as const, aprovada_em: "2026-10-06T10:00:00.000Z" };
    expect(textoDaEtapa(e, false)).toBe("Aprovada em 06/10");
  });

  it("entregue para publico nao diz sua aprovacao", () => {
    const e = { ...base, situacao: "entregue" as const, entregue_em: "2026-10-10T18:00:00.000Z" };
    expect(textoDaEtapa(e, false)).toContain("aguardando aprovação");
    expect(textoDaEtapa(e, false)).not.toContain("sua aprovação");
  });

  it("entregue para cliente diz sua aprovacao", () => {
    const e = { ...base, situacao: "entregue" as const, entregue_em: "2026-10-10T18:00:00.000Z" };
    expect(textoDaEtapa(e, true)).toContain("sua aprovação");
  });

  it("em andamento mostra data de inicio", () => {
    const e = { ...base, situacao: "em_andamento" as const, iniciada_em: "2026-10-03T12:00:00.000Z" };
    expect(textoDaEtapa(e, false)).toBe("Em andamento desde 03/10");
  });

  it("aguardando com datas previstas", () => {
    expect(textoDaEtapa(base, false)).toBe("Aguardando · previsto de 20/10 a 25/10");
  });

  it("aguardando sem datas", () => {
    const e = { ...base, previsto_inicio: null, previsto_fim: null };
    expect(textoDaEtapa(e, false)).toBe("Aguardando");
  });
});

describe("helper: textoDaSuaVez", () => {
  it("retorna texto para etapa entregue", () => {
    const fase: FaseAtual = {
      tipo: "etapa",
      situacao: "entregue",
      etapa_numero: 2,
      etapa_titulo: "Projeto executivo",
    };
    expect(textoDaSuaVez(fase)).toBe("Aprovar a etapa 2: Projeto executivo");
  });

  it("retorna texto para pagamento", () => {
    const fase: FaseAtual = {
      tipo: "pagamento",
      grupo_nome: "Projeto",
    };
    expect(textoDaSuaVez(fase)).toBe("Pagar o grupo Projeto");
  });

  it("retorna null para etapa em andamento", () => {
    const fase: FaseAtual = {
      tipo: "etapa",
      situacao: "em_andamento",
      etapa_numero: 2,
      etapa_titulo: "Projeto executivo",
    };
    expect(textoDaSuaVez(fase)).toBeNull();
  });

  it("retorna null para tipo concluido", () => {
    const fase: FaseAtual = { tipo: "concluido" };
    expect(textoDaSuaVez(fase)).toBeNull();
  });
});

describe("helper: temSuaVez", () => {
  it("true para etapa entregue com titulo", () => {
    const fase: FaseAtual = {
      tipo: "etapa",
      situacao: "entregue",
      etapa_numero: 1,
      etapa_titulo: "Levantamento",
    };
    expect(temSuaVez(fase)).toBe(true);
  });

  it("false para etapa em andamento", () => {
    const fase: FaseAtual = {
      tipo: "etapa",
      situacao: "em_andamento",
      etapa_numero: 1,
      etapa_titulo: "Levantamento",
    };
    expect(temSuaVez(fase)).toBe(false);
  });
});

describe("helper: labelStatus", () => {
  it("em andamento fica azul", () => {
    expect(labelStatus("em_andamento").cor).toBe("azul");
  });
  it("concluido fica verde", () => {
    expect(labelStatus("concluido").cor).toBe("verde");
  });
  it("cancelado fica vermelho", () => {
    expect(labelStatus("cancelado").cor).toBe("vermelho");
  });
});

describe("helper: formatValor", () => {
  it("formata em reais BR", () => {
    const v = formatValor(18400);
    expect(v).toContain("18.400");
    expect(v).toContain("R$");
  });
  it("retorna string vazia para null", () => {
    expect(formatValor(null)).toBe("");
  });
});

// -----------------------------------------------------------------------
// Testes de render
// -----------------------------------------------------------------------

describe("acompanhamento - papel publico", () => {
  it("exibe a pagina de acompanhamento", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPublico } }
    );

    render(<InvitePublic />);

    expect(await screen.findByTestId("pagina-acompanhamento")).toBeTruthy();
    expect(screen.getByTestId("bloco-resumo")).toBeTruthy();
  });

  it("nao exibe valores monetarios para publico", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPublico } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.queryByText(/R\$\s*18/)).toBeNull();
    expect(screen.queryByText(/R\$\s*6/)).toBeNull();
  });

  it("exibe botao de entrar para ver valores", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPublico } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByTestId("btn-entrar-inline")).toBeTruthy();
  });

  it("nao exibe bloco sua vez para publico", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPublico } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.queryByTestId("bloco-sua-vez")).toBeNull();
  });
});

describe("acompanhamento - papel cliente", () => {
  beforeEach(() => {
    mockUser = { id: 10, name: "Marina Costa", cpf: "12345678909" };
  });

  it("exibe valores monetarios", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosCliente } },
      { status: 200, body: { data: { ticket_id: 33, conversation_id: 1, provider_user_id: 5 } } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    // Pode aparecer em mais de um lugar (resumo e grupo); verificamos que existe pelo menos um
    expect(screen.getAllByText(/18\.400/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6\.400/).length).toBeGreaterThan(0);
  });

  it("exibe bloco sua vez quando etapa entregue", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosCliente } },
      { status: 200, body: { data: { ticket_id: 33, conversation_id: 1, provider_user_id: 5 } } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("bloco-sua-vez");
    expect(screen.getByText(/Aprovar a etapa 2/)).toBeTruthy();
  });

  it("exibe botao de ver PDF quando links.pdf = true", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosCliente } },
      { status: 200, body: { data: { ticket_id: 33, conversation_id: 1, provider_user_id: 5 } } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByTestId("btn-ver-pdf")).toBeTruthy();
  });

  it("nao exibe bloco sua vez para etapa em andamento", async () => {
    const dadosEmAndamento = {
      ...dadosCliente,
      fase_atual: {
        tipo: "etapa",
        etapa_numero: 2,
        etapa_titulo: "Projeto executivo",
        situacao: "em_andamento",
        grupo_nome: "Projeto",
        data: "2026-10-05T08:00:00.000Z",
      },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosEmAndamento } },
      { status: 200, body: { data: { ticket_id: 33, conversation_id: 1, provider_user_id: 5 } } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.queryByTestId("bloco-sua-vez")).toBeNull();
  });

  it("exibe bloco sua vez para pagamento", async () => {
    const dadosPagamento = {
      ...dadosCliente,
      contrato: { ...dadosCliente.contrato, status: "aguardando_pagamento" },
      fase_atual: {
        tipo: "pagamento",
        grupo_nome: "Projeto",
      },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPagamento } },
      { status: 200, body: { data: { ticket_id: 33, conversation_id: 1, provider_user_id: 5 } } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("bloco-sua-vez");
    expect(screen.getByText(/Pagar o grupo Projeto/)).toBeTruthy();
  });
});

describe("acompanhamento - papel prestador", () => {
  beforeEach(() => {
    mockUser = { id: 5, name: "Rafael Jesus", cpf: "98765432100" };
  });

  it("nao exibe bloco sua vez para prestador", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPrestador } },
      { status: 404, body: {} }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.queryByTestId("bloco-sua-vez")).toBeNull();
  });

  it("exibe botao abrir o contrato (nao meu contrato)", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPrestador } },
      { status: 404, body: {} }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByTestId("btn-abrir-contrato")).toBeTruthy();
    expect(screen.getByText("Abrir o contrato")).toBeTruthy();
  });

  it("exibe valores para o prestador", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPrestador } },
      { status: 404, body: {} }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByText(/18\.400/)).toBeTruthy();
  });
});

describe("acompanhamento - estados do contrato", () => {
  it("concluido exibe bloco verde", async () => {
    const dadosConcluido = {
      ...dadosPublico,
      contrato: {
        ...dadosPublico.contrato,
        status: "concluido",
        etapas_aprovadas: 4,
        concluido_em: "2026-11-10T18:00:00.000Z",
      },
      fase_atual: { tipo: "concluido" },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosConcluido } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("bloco-concluido");
    expect(screen.getByText(/Tudo entregue e aprovado/)).toBeTruthy();
  });

  it("cancelado exibe bloco cancelado", async () => {
    const dadosCancelado = {
      ...dadosPublico,
      contrato: { ...dadosPublico.contrato, status: "cancelado" },
      fase_atual: { tipo: "cancelado" },
      grupos: [],
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosCancelado } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("bloco-cancelado");
    expect(screen.getByText(/Este contrato foi cancelado/)).toBeTruthy();
  });

  it("aguardando pagamento exibe fase de pagamento", async () => {
    const dadosAguardando = {
      ...dadosPublico,
      contrato: { ...dadosPublico.contrato, status: "aguardando_pagamento" },
      fase_atual: {
        tipo: "pagamento",
        grupo_nome: "Projeto",
      },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosAguardando } }
    );

    render(<InvitePublic />);

    const bloco = await screen.findByTestId("bloco-fase-atual");
    // O bloco de fase atual deve conter texto de pagamento
    expect(bloco.textContent).toMatch(/Pagamento/i);
  });

  it("aguardando assinatura exibe fase de assinatura", async () => {
    const dadosAssinatura = {
      ...dadosPublico,
      contrato: { ...dadosPublico.contrato, status: "aguardando_assinatura" },
      fase_atual: { tipo: "assinatura" },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosAssinatura } }
    );

    render(<InvitePublic />);

    const bloco = await screen.findByTestId("bloco-fase-atual");
    expect(bloco.textContent).toMatch(/Aguardando assinatura/i);
  });
});

describe("acompanhamento - 404 mantem tela antiga", () => {
  it("404 do acompanhamento mostra invite-already-accepted", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 404, body: { success: false, message: "Acompanhamento indisponivel." } }
    );

    render(<InvitePublic />);

    await waitFor(() =>
      expect(screen.getByTestId("invite-already-accepted")).toBeTruthy()
    );
    expect(screen.queryByTestId("pagina-acompanhamento")).toBeNull();
  });
});

describe("acompanhamento - titulo null", () => {
  it("titulo null usa Proposta de <prestador>", async () => {
    const dadosSemTitulo = {
      ...dadosPublico,
      contrato: { ...dadosPublico.contrato, titulo: null },
    };
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosSemTitulo } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByText("Proposta de Rafael Jesus")).toBeTruthy();
  });
});

describe("acompanhamento - profissao do prestador", () => {
  it("exibe nome e profissao no subtitulo", async () => {
    mockApis(
      { status: 200, body: conviteAceito },
      { status: 200, body: { success: true, data: dadosPublico } }
    );

    render(<InvitePublic />);

    await screen.findByTestId("pagina-acompanhamento");
    expect(screen.getByText(/com Rafael Jesus, arquiteto/)).toBeTruthy();
  });
});
