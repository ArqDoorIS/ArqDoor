/**
 * Painel > Notificações > Personalizadas, com as respostas REAIS do backend
 * (src/tests/fixtures/notificacoesBackend.ts): frase, formulário, corpo do POST, pausar/retomar,
 * excluir com fila, histórico ({ agendadas }), teste por canal e o interruptor geral.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { Personalizadas } from "@/features/admin/components/notificacoes/Personalizadas";
import { normalizarPainel } from "@/features/admin/components/notificacoes/api";
import {
  APAGAR_COM_FILA_REAL, GATILHOS_REAIS, HISTORICO_REAL, PAINEL_REAL, PERSONALIZADAS_REAIS, TESTE_PERSONALIZADA_REAL,
} from "./fixtures/notificacoesBackend";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const falha = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });
const MODELOS = normalizarPainel(PAINEL_REAL).modelos;

let config: "ligada" | "desligada" | "falha" | "pendente" = "ligada";
let gatilhosFalham = false;
beforeEach(() => {
  config = "ligada";
  gatilhosFalham = false;
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((m: string, rota: string, corpo?: any) => {
    if (rota === "/admin/notificacoes/gatilhos") return Promise.resolve(gatilhosFalham ? falha("Erro ao processar as notificações.") : ok(GATILHOS_REAIS));
    if (rota === "/admin/notificacoes/config" && m === "GET") {
      if (config === "pendente") return new Promise(() => {});
      return Promise.resolve(config === "falha" ? falha("Erro ao processar as notificações.") : ok({ success: true, personalizadas_ligadas: config === "ligada" }));
    }
    if (rota === "/admin/notificacoes/config" && m === "PUT") return Promise.resolve(ok({ success: true, personalizadas_ligadas: corpo.personalizadas_ligadas }));
    if (rota === "/admin/notificacoes/personalizadas" && m === "GET") return Promise.resolve(ok(PERSONALIZADAS_REAIS));
    if (rota === "/admin/notificacoes/personalizadas" && m === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({ success: true, personalizada: { id: 9 } }) });
    if (rota === "/admin/notificacoes/personalizadas/4/historico") return Promise.resolve(ok(HISTORICO_REAL));
    if (rota === "/admin/notificacoes/personalizadas/5" && m === "DELETE") return Promise.resolve(ok(APAGAR_COM_FILA_REAL));
    if (rota === "/admin/notificacoes/personalizadas/4/teste") return Promise.resolve(ok(TESTE_PERSONALIZADA_REAL));
    if (rota === "/admin/notificacoes/previa") return Promise.resolve(ok({ success: true, html: "<p>ok</p>", texto: "ok", assunto: "ok", push: {} }));
    if (rota.startsWith("/admin/analise/pessoas?")) return Promise.resolve(ok({ pessoas: [{ id: 7, nome: "Ana Lima", papel: "cliente", cidade: null, uf: null, profissao: null }] }));
    return Promise.resolve(ok({ success: true }));
  });
});

const formulario = async () => {
  render(<Personalizadas modelos={MODELOS} />);
  fireEvent.click(await screen.findByRole("button", { name: "Nova notificação" }));
  return within(await screen.findByTestId("editor-personalizada"));
};
const opcoes = (el: HTMLElement) => within(el).getAllByRole("option").map((o) => o.textContent);

describe("notificações personalizadas (respostas reais do backend)", () => {
  it("lista as regras como frase, com situação, canais e números da semana", async () => {
    render(<Personalizadas modelos={MODELOS} />);
    const itens = await screen.findAllByTestId("personalizada");
    expect(itens).toHaveLength(2);
    expect(within(itens[0]).getByTestId("frase").textContent).toBe(
      "2 dias depois de Proposta recebida, se a proposta ainda não foi assinada, mandar para o cliente: “Sua proposta está esperando”",
    );
    expect(itens[0]).toHaveTextContent("Ativa");
    expect(itens[0]).toHaveTextContent("12 enviadas · 3 puladas");
    expect(within(itens[1]).getByTestId("frase").textContent).toBe("Logo depois de Fase entregue, mandar para o cliente: “Confira a fase {fase}”");
    expect(itens[1]).toHaveTextContent("Pausada");
    // updatedAt (camelCase) também vale
    expect(itens[1]).toHaveTextContent("atualizada 19/11/26");
  });

  it("pausa e retoma", async () => {
    render(<Personalizadas modelos={MODELOS} />);
    const itens = await screen.findAllByTestId("personalizada");
    fireEvent.click(within(itens[0]).getByRole("button", { name: "Pausar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/personalizadas/4/pausar"));
    fireEvent.click(within(itens[1]).getByRole("button", { name: "Retomar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/personalizadas/5/retomar"));
  });

  it("excluir com envio na fila: avisa que pausa e mostra a mensagem do servidor", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Personalizadas modelos={MODELOS} />);
    const itens = await screen.findAllByTestId("personalizada");
    fireEvent.click(within(itens[1]).getByRole("button", { name: "Excluir" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("Se houver avisos agendados, ela é pausada em vez de apagada."));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/notificacoes/personalizadas/5"));
    expect(await screen.findByText(APAGAR_COM_FILA_REAL.message)).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("histórico lê { agendadas }", async () => {
    render(<Personalizadas modelos={MODELOS} />);
    const [item] = await screen.findAllByTestId("personalizada");
    fireEvent.click(within(item).getByRole("button", { name: "Histórico" }));
    const linhas = await screen.findAllByTestId("linha-do-historico");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent("#7");
    expect(linhas[0]).toHaveTextContent("Pulada");
    expect(linhas[0]).toHaveTextContent("condição não vale mais");
    expect(linhas[1]).toHaveTextContent("Enviada");
  });

  it("teste mostra o resultado de cada canal", async () => {
    render(<Personalizadas modelos={MODELOS} />);
    const [item] = await screen.findAllByTestId("personalizada");
    fireEvent.click(within(item).getByRole("button", { name: "Editar" }));
    const teste = within(within(await screen.findByTestId("editor-personalizada")).getByTestId("enviar-teste"));
    fireEvent.change(teste.getByLabelText("Buscar pessoa"), { target: { value: "Ana" } });
    fireEvent.click(await teste.findByTestId("pessoa-achada"));
    fireEvent.click(teste.getByRole("button", { name: "Enviar teste" }));
    const r = await teste.findByTestId("resultado-do-teste");
    expect(r).toHaveTextContent("Sino: chegou");
    expect(r).toHaveTextContent("Push: chegou");
    expect(r).toHaveTextContent("E-mail: não chegou");
    expect(r).toHaveTextContent("Algum canal falhou");
    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/personalizadas/4/teste", { user_id: 7 });
  });

  it("condições filtram pelo evento e para quem fica limitado aos papéis dele", async () => {
    const f = await formulario();
    fireEvent.change(f.getByLabelText("Quando"), { target: { value: "proposal_created" } });
    expect(opcoes(f.getByLabelText("Condição"))).toEqual(["Sem condição", "A proposta ainda não foi assinada"]);
    expect(f.getByLabelText("Cliente")).toBeChecked();
    expect(f.queryByLabelText("Profissional")).toBeNull();
    fireEvent.change(f.getByLabelText("Condição"), { target: { value: "proposta_ainda_nao_assinada" } });

    fireEvent.change(f.getByLabelText("Quando"), { target: { value: "visit_cancelled" } });
    expect(opcoes(f.getByLabelText("Condição"))).toEqual(["Sem condição"]);
    expect(f.getByLabelText("Condição")).toHaveValue("");
    expect(within(f.getByTestId("para-quem")).getAllByRole("checkbox")).toHaveLength(2);
  });

  it("variável fora do evento bloqueia o Salvar", async () => {
    const f = await formulario();
    fireEvent.change(f.getByLabelText("Quando"), { target: { value: "step_delivered" } });
    const notif = within(f.getByTestId("secao-notificacao"));
    fireEvent.change(notif.getByLabelText("Título da notificação"), { target: { value: "Oi {nome}" } });
    fireEvent.change(notif.getByLabelText("Texto da notificação"), { target: { value: "A proposta #{numero_proposta} da fase {fase}." } });
    expect(f.getByTestId("variavel-invalida")).toHaveTextContent("{numero_proposta} não existe aqui");
    expect(f.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("cria com o corpo que o backend valida (limite 1 a 10, sem email_assunto)", async () => {
    const f = await formulario();
    fireEvent.change(f.getByLabelText("Nome"), { target: { value: "Proposta parada" } });
    fireEvent.change(f.getByLabelText("Quando"), { target: { value: "proposal_created" } });
    fireEvent.change(f.getByLabelText("Quanto tempo depois"), { target: { value: "dias" } });
    fireEvent.change(f.getByLabelText("Quantidade"), { target: { value: "2" } });
    fireEvent.change(f.getByLabelText("Condição"), { target: { value: "proposta_ainda_nao_assinada" } });
    const notif = within(f.getByTestId("secao-notificacao"));
    fireEvent.change(notif.getByLabelText("Título da notificação"), { target: { value: "Sua proposta está esperando" } });
    fireEvent.change(notif.getByLabelText("Texto da notificação"), { target: { value: "A proposta #{numero_proposta} ainda não foi assinada." } });

    fireEvent.change(f.getByLabelText("Limite por pessoa por dia"), { target: { value: "11" } });
    expect(f.getByText("O limite por pessoa por dia vai de 1 a 10.")).toBeInTheDocument();
    expect(f.getByRole("button", { name: "Salvar" })).toBeDisabled();
    fireEvent.change(f.getByLabelText("Limite por pessoa por dia"), { target: { value: "2" } });

    fireEvent.click(f.getByRole("button", { name: "Salvar" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("2 dias depois de Proposta recebida, se a proposta ainda não foi assinada");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/personalizadas", {
      nome: "Proposta parada", ativo: true, evento: "proposal_created", atraso_minutos: 2880, condicao: "proposta_ainda_nao_assinada", para: ["cliente"],
      titulo: "Sua proposta está esperando", texto: "A proposta #{numero_proposta} ainda não foi assinada.", href: null,
      canais: { sino: true, push: true, email: false }, email_modelo: null, email_campos: {}, limite_por_pessoa_dia: 2,
    }));
  });

  it("editar mantém o vazio de propósito e o href", async () => {
    render(<Personalizadas modelos={MODELOS} />);
    const itens = await screen.findAllByTestId("personalizada");
    fireEvent.click(within(itens[1]).getByRole("button", { name: "Editar" }));
    const f = within(await screen.findByTestId("editor-personalizada"));
    fireEvent.change(f.getByLabelText("Limite por pessoa por dia"), { target: { value: "3" } });
    fireEvent.click(f.getByRole("button", { name: "Salvar" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/notificacoes/personalizadas/5", expect.objectContaining({
      limite_por_pessoa_dia: 3, href: "/projects", email_modelo: "simples", email_campos: { saudacao: "" }, ativo: false,
    })));
  });

  /* ---------- interruptor geral ---------- */
  it("interruptor: desligar pede confirmação, manda o PUT e mostra a faixa amarela", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Personalizadas modelos={MODELOS} />);
    const chave = within(await screen.findByTestId("chave-geral"));
    await waitFor(() => expect(chave.getByTestId("estado-da-chave")).toHaveTextContent("Ligadas"));
    fireEvent.click(chave.getByRole("switch", { name: "Notificações personalizadas" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("Nenhuma personalizada será enviada até religar."));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/notificacoes/config", { personalizadas_ligadas: false }));
    expect(screen.getByTestId("personalizadas-desligadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova notificação" })).toBeEnabled();
    confirmar.mockRestore();
  });

  it("interruptor neutro e travado enquanto carrega ou se a config falhar", async () => {
    config = "pendente";
    const { unmount } = render(<Personalizadas modelos={MODELOS} />);
    let chave = within(await screen.findByTestId("chave-geral"));
    expect(chave.getByTestId("estado-da-chave")).toHaveTextContent("carregando…");
    expect(chave.getByRole("switch")).toBeDisabled();
    unmount();

    config = "falha";
    render(<Personalizadas modelos={MODELOS} />);
    chave = within(await screen.findByTestId("chave-geral"));
    await waitFor(() => expect(chave.getByTestId("estado-da-chave")).toHaveTextContent("indisponível"));
    expect(chave.getByRole("switch")).toBeDisabled();
    expect(screen.queryByTestId("personalizadas-desligadas")).toBeNull();
  });

  it("interruptor continua visível se a lista de eventos falhar", async () => {
    gatilhosFalham = true;
    render(<Personalizadas modelos={MODELOS} />);
    expect(await screen.findByText(/Não carreguei a lista de eventos/)).toBeInTheDocument();
    const chave = within(screen.getByTestId("chave-geral"));
    await waitFor(() => expect(chave.getByTestId("estado-da-chave")).toHaveTextContent("Ligadas"));
  });
});
