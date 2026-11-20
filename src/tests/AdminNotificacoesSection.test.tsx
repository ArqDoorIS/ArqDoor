/**
 * Painel > Notificações, com as respostas REAIS do backend (src/tests/fixtures/notificacoesBackend.ts):
 * sub-abas, eventos automáticos (canais, editor, e-mail com os campos do modelo, anexos, e-mails
 * de acesso, só leitura), comunicados, histórico e modelos de e-mail.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminNotificacoesSection } from "@/features/admin/components/AdminNotificacoesSection";
import { TABS } from "@/features/admin/constants";
import {
  ENVIOS_REAIS, PAINEL_REAL, PREVIA_REAL, TESTE_COMUNICADO_REAL, TESTE_EVENTO_REAL, eventoSalvo,
} from "./fixtures/notificacoesBackend";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const recusa = (message: string) => ({ ok: false, json: async () => ({ success: false, message }) });
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

let painel = copia(PAINEL_REAL) as any;
let falharPut: string | null = null;
let previa: (corpo: any) => unknown = (corpo) => (corpo?.modelo === "nenhum" ? { success: true, html: null, texto: null, assunto: null, push: PREVIA_REAL.push } : PREVIA_REAL);

beforeEach(() => {
  painel = copia(PAINEL_REAL);
  falharPut = null;
  previa = (corpo) => (corpo?.modelo === "nenhum" ? { success: true, html: null, texto: null, assunto: null, push: PREVIA_REAL.push } : PREVIA_REAL);
  window.history.replaceState(null, "", "/");
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((m: string, rota: string, corpo?: any) => {
    if (rota === "/admin/notificacoes" && m === "GET") return Promise.resolve(ok(painel));
    if (rota === "/admin/notificacoes/modelos") return Promise.resolve(ok({ success: true, modelos: painel.modelos }));
    if (rota.startsWith("/admin/notificacoes/regras/") && m === "PUT") {
      return Promise.resolve(falharPut ? recusa(falharPut) : ok(eventoSalvo(decodeURIComponent(rota.split("/").pop()!), corpo)));
    }
    if (rota.startsWith("/admin/notificacoes/regras/") && m === "DELETE") return Promise.resolve(ok({ success: true, evento: painel.eventos[0] }));
    if (rota === "/admin/notificacoes/previa") return Promise.resolve(ok(previa(corpo)));
    if (rota === "/admin/notificacoes/teste") return Promise.resolve(ok(corpo?.tipo ? TESTE_EVENTO_REAL : TESTE_COMUNICADO_REAL));
    if (rota.startsWith("/admin/notificacoes/publico?")) return Promise.resolve(ok({ success: true, total: rota.includes("tipo=todos") ? 5000 : 1234 }));
    if (rota.startsWith("/admin/notificacoes/envios?")) return Promise.resolve(ok(ENVIOS_REAIS));
    if (rota === "/admin/notificacoes/envios" && m === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({ success: true, envio: { id: 8 } }) });
    if (/\/admin\/notificacoes\/envios\/\d+\/cancelar/.test(rota)) return Promise.resolve(ok({ success: true, envio: { id: 7, status: "cancelado" } }));
    if (rota.startsWith("/admin/analise/pessoas?")) return Promise.resolve(ok({ pessoas: [{ id: 9, nome: "Gil Souza", papel: "profissional", cidade: "Campinas", uf: "SP", profissao: "Eletricista" }] }));
    return Promise.resolve(ok({ success: true }));
  });
});

const chamadas = (m: string, rota: string) => apiRequestMock.mock.calls.filter(([mm, r]) => mm === m && r === rota);
const irPara = async (nome: string) => fireEvent.click(await screen.findByRole("tab", { name: nome }));
const naNotificacao = (raiz: HTMLElement) => within(within(raiz).getByTestId("secao-notificacao"));
const noEmail = (raiz: HTMLElement) => within(within(raiz).getByTestId("secao-email"));
const linhaDe = async (rotulo: string) => (await screen.findAllByTestId("evento")).find((l) => l.textContent?.includes(rotulo))!;
const abrirEvento = async (rotulo: string) => {
  render(<AdminNotificacoesSection />);
  await irPara("Eventos automáticos");
  fireEvent.click(within(await linhaDe(rotulo)).getByRole("button", { name: new RegExp(rotulo) }));
  return screen.findByTestId("editor-do-evento");
};
const comunicado = async () => { render(<AdminNotificacoesSection />); return screen.findByTestId("novo-comunicado"); };
const putDe = (tipo: string) => chamadas("PUT", `/admin/notificacoes/regras/${encodeURIComponent(tipo)}`);

describe("aba Notificações (respostas reais do backend)", () => {
  it("existe no menu, só para o owner", () => {
    expect(TABS.find((t) => t.key === "notificacoes")).toMatchObject({ label: "Notificações", papeis: ["owner"] });
  });

  it("sub-abas: Comunicados primeiro, e a escolhida fica no endereço", async () => {
    render(<AdminNotificacoesSection />);
    const abas = await screen.findAllByRole("tab");
    expect(abas.map((a) => a.textContent)).toEqual(["Comunicados", "Personalizadas", "Eventos automáticos", "Modelos de e-mail"]);
    expect(abas[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(abas[2]);
    expect(window.location.hash).toBe("#eventos-automaticos");
    expect(await screen.findAllByTestId("grupo-de-eventos")).toHaveLength(3);
  });

  it("abre na sub-aba que está no endereço", async () => {
    window.history.replaceState(null, "", "/#modelos-de-email");
    render(<AdminNotificacoesSection />);
    expect(await screen.findByRole("tab", { name: "Modelos de e-mail" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findAllByTestId("modelo-de-email")).toHaveLength(painel.modelos.length);
  });

  /* ---------- eventos automáticos ---------- */
  it("mostra os eventos do catálogo agrupados, com quando e para quem", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    const grupos = await screen.findAllByTestId("grupo-de-eventos");
    expect(grupos.map((g) => g.querySelector("h3")?.textContent)).toEqual(["Contratos e fases", "Visitas", "Conta e acesso"]);
    const [fase, proposta] = within(grupos[0]).getAllByTestId("evento");
    expect(fase).toHaveTextContent("Fase entregue");
    expect(fase).toHaveTextContent("Quando o profissional marca uma fase como entregue.");
    expect(fase).toHaveTextContent("Para: cliente");
    // proposal_created é só sino no padrão
    expect(within(proposta).getByRole("button", { name: "Sino" })).toHaveAttribute("aria-pressed", "true");
    expect(within(proposta).getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "false");
  });

  it("ligar/desligar um canal salva na hora com o PUT do contrato (sem email_assunto)", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    const linha = await linhaDe("Fase entregue");
    fireEvent.click(within(linha).getByRole("button", { name: "Push" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/notificacoes/regras/step_delivered", {
      ativo: true, sino: true, push: false, email: true, titulo: null, texto: null, email_modelo: "legado", email_campos: {}, anexos: [],
    }));
    expect(await within(linha).findByText("salvo")).toBeInTheDocument();
    expect(within(linha).getByText("personalizado")).toBeInTheDocument();
  });

  it("desfaz o canal se o servidor recusar", async () => {
    falharPut = "Sem permissão.";
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    const linha = await linhaDe("Fase entregue");
    const push = within(linha).getByRole("button", { name: "Push" });
    fireEvent.click(push);
    expect(await within(linha).findByText(/Não salvou: Sem permissão/)).toBeInTheDocument();
    expect(push).toHaveAttribute("aria-pressed", "true");
  });

  it("editor: texto original como placeholder e na prévia; chip de variável; e-mail só com os campos do modelo", async () => {
    const editor = await abrirEvento("Fase entregue");
    const notif = naNotificacao(editor);
    expect(notif.getByLabelText("Título da notificação")).toHaveAttribute("placeholder", "Etapa Entregue! 🚀");
    const push = within(editor).getByTestId("previa-push");
    expect(push).toHaveTextContent("Etapa Entregue! 🚀");
    expect(push).toHaveTextContent("O prestador entregou a etapa Projeto executivo.");
    expect(push).not.toHaveTextContent("Sem título");

    const titulo = notif.getByLabelText("Título da notificação");
    fireEvent.change(titulo, { target: { value: "Fase pronta: " } });
    fireEvent.click(within(notif.getByRole("group", { name: "Variáveis para Título da notificação" })).getByRole("button", { name: "{fase}" }));
    expect(titulo).toHaveValue("Fase pronta: {fase}");
    expect(push).toHaveTextContent("Fase pronta: Projeto executivo");

    const email = noEmail(editor);
    // Nada de "Título do e-mail" inventado: só os campos que o legado.json (padrão dos eventos) declara.
    expect(email.queryByLabelText("Título do e-mail")).toBeNull();
    expect(email.queryByLabelText("Assunto do e-mail")).toBeNull();
    expect(email.getByLabelText("Assunto")).toHaveAttribute("placeholder", "Vazio = usa o da notificação: Fase pronta: {fase}");
    expect(email.queryByLabelText("Saudação")).toBeNull();
    fireEvent.change(email.getByLabelText("Título"), { target: { value: "A fase {fase} chegou" } });

    // O assunto da prévia é o que o servidor montou.
    expect(await within(editor).findByTestId("assunto-da-previa")).toHaveTextContent("Assunto: Etapa Entregue! 🚀");
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/previa", expect.objectContaining({
      modelo: "legado", tipo: "step_delivered", email_campos: { titulo: "A fase Projeto executivo chegou" },
    })));

    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(putDe("step_delivered")).toHaveLength(1));
    const corpo = putDe("step_delivered")[0][2];
    expect(corpo).toEqual({
      ativo: true, sino: true, push: true, email: true, titulo: "Fase pronta: {fase}", texto: null,
      email_modelo: "legado", email_campos: { titulo: "A fase {fase} chegou" }, anexos: [],
    });
    expect(corpo).not.toHaveProperty("email_assunto");
  });

  it("\"Deixar vazio\" manda \"\" de propósito; campo intocado não vai; vazio salvo antes não some", async () => {
    Object.assign(painel.eventos.find((e: any) => e.tipo === "step_delivered").regra, { email_modelo: "simples", email_campos: { rodape: "" } });
    const editor = await abrirEvento("Fase entregue");
    const email = noEmail(editor);
    expect(within(email.getByTestId("campo-rodape")).getByTestId("vazio-de-proposito")).toBeInTheDocument();
    expect(email.getByLabelText("Rodapé")).toHaveAttribute("placeholder", "Vazio de propósito: não aparece no e-mail");

    fireEvent.click(within(email.getByTestId("campo-saudacao")).getByRole("button", { name: "Deixar vazio" }));
    expect(within(email.getByTestId("campo-saudacao")).getByTestId("vazio-de-proposito")).toBeInTheDocument();
    // Campo obrigatório não tem "Deixar vazio".
    expect(within(email.getByTestId("campo-titulo")).queryByRole("button", { name: "Deixar vazio" })).toBeNull();
    // Apagar o que digitou volta ao padrão (não vira vazio de propósito).
    fireEvent.change(email.getByLabelText("Pré-cabeçalho"), { target: { value: "oi" } });
    fireEvent.change(email.getByLabelText("Pré-cabeçalho"), { target: { value: "" } });

    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(putDe("step_delivered")).toHaveLength(1));
    expect(putDe("step_delivered")[0][2].email_campos).toEqual({ saudacao: "", rodape: "" });
  });

  it("vazio de propósito salvo continua no PUT de um canal da lista", async () => {
    painel.eventos.find((e: any) => e.tipo === "step_delivered").regra.email_campos = { rodape: "" };
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    fireEvent.click(within(await linhaDe("Fase entregue")).getByRole("button", { name: "Sino" }));
    await waitFor(() => expect(putDe("step_delivered")).toHaveLength(1));
    expect(putDe("step_delivered")[0][2].email_campos).toEqual({ rodape: "" });
  });

  it("só oferece modelos cujo arquivo não pede variável que o evento não tem", async () => {
    const editor = await abrirEvento("Fase entregue");
    const opcoes = within(noEmail(editor).getByLabelText("Modelo de e-mail")).getAllByRole("option") as HTMLOptionElement[];
    const porNome = (t: string) => opcoes.find((o) => o.textContent?.startsWith(t))!;
    expect(porNome("Simples").disabled).toBe(false);
    expect(porNome("Redefinição de senha (o de sempre)").disabled).toBe(true);
    expect(porNome("Redefinição de senha (o de sempre)").textContent).toContain("precisa de {{email}}, {{link_redefinicao}}");
    expect(opcoes.some((o) => o.value === "nenhum")).toBe(false);
  });

  it("anexos do evento vão no PUT", async () => {
    const editor = await abrirEvento("Visita proposta");
    const anexos = within(within(editor).getByTestId("anexos"));
    fireEvent.click(anexos.getByLabelText("Convite de calendário (.ics)"));
    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/notificacoes/regras/visit_proposed", expect.objectContaining({ anexos: ["ics_visita"] })));
  });

  it("variável desconhecida ou {{campo}} bloqueia o Salvar; {1} é texto comum", async () => {
    const editor = await abrirEvento("Fase entregue");
    fireEvent.change(naNotificacao(editor).getByLabelText("Título da notificação"), { target: { value: "Passo {1}: {etapa} de {{nome}}" } });
    const erros = within(editor).getAllByTestId("variavel-invalida").map((e) => e.textContent);
    expect(erros).toHaveLength(2);
    expect(erros[0]).toContain("{{nome}} não funciona aqui: use {nome}");
    expect(erros[1]).toContain("{etapa} não existe aqui");
    expect(within(editor).getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(within(editor).getByTestId("variavel-sem-valor")).toHaveTextContent("{etapa}");
    expect(within(editor).getByTestId("variavel-sem-valor")).not.toHaveTextContent("{1}");
  });

  it("mostra no editor a recusa do servidor ao salvar", async () => {
    falharPut = "Título: a variável {x} não existe para este envio.";
    const editor = await abrirEvento("Fase entregue");
    fireEvent.change(naNotificacao(editor).getByLabelText("Título da notificação"), { target: { value: "Oi {nome}" } });
    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }));
    expect(await within(editor).findByText("O servidor não aceitou: Título: a variável {x} não existe para este envio.")).toBeInTheDocument();
  });

  it("voltar ao padrão pede confirmação e apaga a regra", async () => {
    painel.eventos.find((e: any) => e.tipo === "step_delivered").personalizado = true;
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const editor = await abrirEvento("Fase entregue");
    fireEvent.click(within(editor).getByRole("button", { name: "Voltar ao padrão" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/admin/notificacoes/regras/step_delivered"));
    confirmar.mockRestore();
  });

  it("teste do evento mostra por quais canais saiu", async () => {
    const editor = await abrirEvento("Fase entregue");
    const teste = within(within(editor).getByTestId("enviar-teste"));
    fireEvent.change(teste.getByLabelText("Buscar pessoa"), { target: { value: "Gil" } });
    fireEvent.click(await teste.findByTestId("pessoa-achada"));
    fireEvent.click(teste.getByRole("button", { name: "Enviar teste" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/teste", { user_id: 9, tipo: "step_delivered" }));
    expect(await teste.findByTestId("resultado-do-teste")).toHaveTextContent("Pelos canais: Sino, Push, E-mail.");
  });

  /* ---------- e-mails de acesso à conta ---------- */
  it("redefinir senha: sino/push travados, e-mail não desliga e salvar a regra real funciona", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    const linha = await linhaDe("Link para redefinir a senha");
    expect(within(linha).getByRole("button", { name: "Sino" })).toBeDisabled();
    expect(within(linha).getByRole("button", { name: "Sino" })).toHaveAttribute("title", "Por segurança, este aviso só vai por e-mail");
    expect(within(linha).getByRole("button", { name: "E-mail" })).toHaveAttribute("title", "Este e-mail é necessário para a conta funcionar");
    expect(within(linha).getByRole("switch")).toBeDisabled();

    fireEvent.click(within(linha).getByRole("button", { name: /Link para redefinir a senha/ }));
    const editor = await screen.findByTestId("editor-do-evento");
    expect(within(editor).getByTestId("variaveis-obrigatorias")).toHaveTextContent("{link_redefinicao}");
    expect(within(editor).getByRole("switch", { name: "Notificação (sino e push)" })).toBeDisabled();
    expect(within(editor).getByRole("switch", { name: "E-mail" })).toHaveAttribute("title", "Este e-mail é necessário para a conta funcionar");
    // O modelo redefinir_senha já traz {{link_redefinicao}} no arquivo: nada a cobrar.
    expect(within(editor).queryByTestId("aviso-de-variaveis")).toBeNull();
    const email = noEmail(editor);
    expect(email.getByLabelText("Modelo de e-mail")).toHaveValue("redefinir_senha");
    expect(email.queryByLabelText("Título")).toBeNull();
    fireEvent.change(email.getByLabelText("Assunto"), { target: { value: "Crie sua senha nova" } });
    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PUT", "/admin/notificacoes/regras/conta.redefinir_senha", {
      ativo: true, sino: false, push: false, email: true, titulo: null, texto: null,
      email_modelo: "redefinir_senha", email_campos: { assunto: "Crie sua senha nova" }, anexos: [],
    }));
  });

  it("redefinir senha num modelo sem o link: cobra {link_redefinicao} no e-mail", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    fireEvent.click(within(await linhaDe("Link para redefinir a senha")).getByRole("button", { name: /Link para redefinir a senha/ }));
    const editor = await screen.findByTestId("editor-do-evento");
    const email = noEmail(editor);
    fireEvent.change(email.getByLabelText("Modelo de e-mail"), { target: { value: "simples" } });
    expect(within(editor).getByTestId("lista-de-problemas")).toHaveTextContent("O e-mail precisa ter {link_redefinicao}");
    expect(within(editor).getByRole("button", { name: "Salvar" })).toBeDisabled();
    fireEvent.change(email.getByLabelText("Texto"), { target: { value: "Crie a senha nova em {link_redefinicao}" } });
    expect(within(editor).queryByTestId("lista-de-problemas")).toBeNull();
    expect(within(editor).getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("evento que não é editável fica só para ver, sem teste", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Eventos automáticos");
    const linha = await linhaDe("Código de acesso ao painel");
    expect(linha).toHaveTextContent("só para ver");
    fireEvent.click(within(linha).getByRole("button", { name: /Código de acesso ao painel/ }));
    const editor = await screen.findByTestId("editor-do-evento");
    expect(within(editor).getByTestId("somente-leitura")).toHaveTextContent("não pode ser mudado nem testado pelo painel");
    expect(within(editor).queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(within(editor).queryByTestId("enviar-teste")).toBeNull();
  });

  /* ---------- comunicados ---------- */
  it("comunicado: mostra quantas contas, confirma e manda o corpo do contrato", async () => {
    const raiz = await comunicado();
    fireEvent.change(naNotificacao(raiz).getByLabelText("Título da notificação"), { target: { value: "Novidade" } });
    fireEvent.change(naNotificacao(raiz).getByLabelText("Texto da notificação"), { target: { value: "Chegou a carteira, {nome}." } });
    fireEvent.change(within(raiz).getByLabelText("Abrir no app"), { target: { value: "/financeiro" } });
    expect(await within(raiz).findByText("Vai para 1.234 contas")).toBeInTheDocument();
    fireEvent.click(within(raiz).getByRole("button", { name: "Enviar" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Vai para 1.234 contas, por sino, push.");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar para 1.234 contas" }));
    await waitFor(() => expect(chamadas("POST", "/admin/notificacoes/envios")).toHaveLength(1));
    expect(chamadas("POST", "/admin/notificacoes/envios")[0][2]).toEqual({
      titulo: "Novidade", texto: "Chegou a carteira, {nome}.", href: "/financeiro", canais: { sino: true, push: true, email: false },
      email_modelo: null, email_campos: {}, publico: { tipo: "profissionais" }, agendado_para: null,
    });
  });

  it("comunicado para todo mundo avisa mais forte", async () => {
    const raiz = await comunicado();
    fireEvent.change(naNotificacao(raiz).getByLabelText("Título da notificação"), { target: { value: "Aviso" } });
    fireEvent.change(naNotificacao(raiz).getByLabelText("Texto da notificação"), { target: { value: "Texto" } });
    fireEvent.click(within(raiz).getByLabelText("Todo mundo"));
    expect(await within(raiz).findByText("Vai para 5.000 contas")).toBeInTheDocument();
    fireEvent.click(within(raiz).getByRole("button", { name: "Enviar" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Enviar para todo mundo?");
    expect(dialogo).toHaveTextContent("todas as 5.000 contas da ArqDoor");
  });

  it("comunicado só por e-mail: canais só com e-mail, campos do modelo e modelos compatíveis", async () => {
    const raiz = await comunicado();
    fireEvent.click(within(raiz).getByRole("switch", { name: "Notificação (sino e push)" }));
    expect(await within(raiz).findByText(/Ligue pelo menos um canal/)).toBeInTheDocument();
    fireEvent.click(within(raiz).getByRole("switch", { name: "E-mail" }));
    const email = noEmail(raiz);
    const opcoes = within(email.getByLabelText("Modelo de e-mail")).getAllByRole("option") as HTMLOptionElement[];
    expect(opcoes.find((o) => o.value === "redefinir_senha")!.disabled).toBe(true);
    expect(opcoes.find((o) => o.value === "legado")!.disabled).toBe(false);
    fireEvent.change(email.getByLabelText("Modelo de e-mail"), { target: { value: "simples" } });
    fireEvent.change(email.getByLabelText("Título"), { target: { value: "Sua carteira chegou" } });
    fireEvent.change(email.getByLabelText("Texto"), { target: { value: "Agora dá para ver tudo o que recebeu." } });
    await within(raiz).findByText("Vai para 1.234 contas");
    fireEvent.click(within(raiz).getByRole("button", { name: "Enviar" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Enviar para 1.234 contas" }));
    await waitFor(() => expect(chamadas("POST", "/admin/notificacoes/envios")).toHaveLength(1));
    expect(chamadas("POST", "/admin/notificacoes/envios")[0][2]).toEqual({
      titulo: "Sua carteira chegou", texto: "Agora dá para ver tudo o que recebeu.", href: null,
      canais: { sino: false, push: false, email: true }, email_modelo: "simples",
      email_campos: { titulo: "Sua carteira chegou", texto: "Agora dá para ver tudo o que recebeu." },
      publico: { tipo: "profissionais" }, agendado_para: null,
    });
  });

  it("teste do comunicado mostra o resultado de cada canal", async () => {
    const raiz = await comunicado();
    fireEvent.change(naNotificacao(raiz).getByLabelText("Título da notificação"), { target: { value: "Oi" } });
    fireEvent.change(naNotificacao(raiz).getByLabelText("Texto da notificação"), { target: { value: "Teste" } });
    const teste = within(within(raiz).getByTestId("enviar-teste"));
    fireEvent.change(teste.getByLabelText("Buscar pessoa"), { target: { value: "Gil" } });
    fireEvent.click(await teste.findByTestId("pessoa-achada"));
    fireEvent.click(teste.getByRole("button", { name: "Enviar teste" }));
    const resultado = await teste.findByTestId("resultado-do-teste");
    expect(resultado).toHaveTextContent("Sino: chegou");
    expect(resultado).toHaveTextContent("Push: não chegou");
    expect(resultado).not.toHaveTextContent("E-mail:");
    expect(chamadas("POST", "/admin/notificacoes/teste")[0][2]).not.toHaveProperty("email_assunto");
  });

  it("comunicado só aceita {nome}: {fase} bloqueia o envio", async () => {
    const raiz = await comunicado();
    fireEvent.change(naNotificacao(raiz).getByLabelText("Título da notificação"), { target: { value: "Oi {nome}" } });
    fireEvent.change(naNotificacao(raiz).getByLabelText("Texto da notificação"), { target: { value: "Sua {fase} foi liberada." } });
    await within(raiz).findByText("Vai para 1.234 contas");
    expect(within(raiz).getByTestId("variavel-invalida")).toHaveTextContent("{fase} não existe aqui. Dá para usar: {nome}.");
    expect(within(raiz).getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(within(raiz).getByTestId("previa-push")).toHaveTextContent("Oi Ana");
  });

  it("agendar no passado é recusado", async () => {
    const raiz = await comunicado();
    fireEvent.change(naNotificacao(raiz).getByLabelText("Título da notificação"), { target: { value: "Aviso" } });
    fireEvent.change(naNotificacao(raiz).getByLabelText("Texto da notificação"), { target: { value: "Texto" } });
    await within(raiz).findByText("Vai para 1.234 contas");
    fireEvent.change(within(raiz).getByLabelText("Agendar"), { target: { value: "2020-01-01T10:00" } });
    expect(within(raiz).getByText(/Escolha um dia e hora no futuro/)).toBeInTheDocument();
    expect(within(raiz).getByRole("button", { name: "Agendar" })).toBeDisabled();
    expect(chamadas("POST", "/admin/notificacoes/envios")).toHaveLength(0);
  });

  it("histórico lê as linhas do banco (created_at ou createdAt) e cancela o agendado", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminNotificacoesSection />);
    const linhas = await screen.findAllByTestId("envio");
    expect(linhas[0]).toHaveTextContent("Agendado");
    expect(linhas[0]).toHaveTextContent("Todo mundo");
    expect(linhas[1]).toHaveTextContent("Cidade: Campinas");
    expect(linhas[1]).toHaveTextContent("40 contas · Push 31 · E-mail 38 · 2 falhas");
    expect(linhas[1]).toHaveTextContent("19/11/26");
    fireEvent.click(within(linhas[0]).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/envios/7/cancelar"));
    confirmar.mockRestore();
  });

  /* ---------- modelos de e-mail ---------- */
  it("modelos: só leitura, com formato, arquivo, campos, variáveis do arquivo e prévia com assunto do servidor", async () => {
    render(<AdminNotificacoesSection />);
    await irPara("Modelos de e-mail");
    expect(screen.getByTestId("ajuda-modelos")).toHaveTextContent("src/services/notifications/modelos-de-email/");
    const cartoes = await screen.findAllByTestId("modelo-de-email");
    const de = (t: string) => cartoes.find((c) => c.textContent?.includes(t))!;
    const senha = de("Redefinição de senha (o de sempre)");
    expect(senha).toHaveTextContent("redefinir_senha.html");
    expect(within(senha).getByTestId("variaveis-do-molde")).toHaveTextContent("{{email}}");
    expect(within(senha).getByTestId("variaveis-do-molde")).toHaveTextContent("{{link_redefinicao}}");
    const simples = de("simples.mjml");
    expect(within(simples).getByTestId("campos-declarados")).toHaveTextContent("Cor de destaque");
    expect(await within(simples).findByTestId("assunto-da-previa")).toHaveTextContent("Assunto: Etapa Entregue! 🚀");
    expect(within(simples).getByTestId("texto-puro")).toHaveTextContent("O prestador entregou a etapa");
    fireEvent.click(within(simples).getByRole("button", { name: "Celular" }));
    expect(within(simples).getByTitle("Prévia do e-mail")).toHaveStyle({ width: "375px" });
    expect(await within(de("Sem e-mail")).findByText("Este modelo não manda e-mail.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo modelo|Editar|Salvar/ })).toBeNull();
  });

  it("prévia marca variável sem valor, undefined e null (mas não o CSS)", async () => {
    previa = () => ({ ...PREVIA_REAL, html: "<html><head><style>p{color:red}</style></head><body><p>Oi {nome}, valor undefined</p><a href=\"null\">abrir</a></body></html>", texto: "Oi {nome}" });
    render(<AdminNotificacoesSection />);
    await irPara("Modelos de e-mail");
    const simples = (await screen.findAllByTestId("modelo-de-email")).find((c) => c.textContent?.includes("simples.mjml"))!;
    const chip = await within(simples).findByTestId("variavel-sem-valor");
    expect(chip).toHaveTextContent("{nome}");
    expect(chip).toHaveTextContent("undefined");
    expect(chip).toHaveTextContent("null");
    expect(chip).not.toHaveTextContent("color");
  });
});
