/**
 * Painel > Notificações > Modelos de e-mail: enviar um .mjml/.html pelo painel (sem editor de código),
 * prévia do servidor, campos detectados, salvar, versão nova, voltar versão e desativar.
 * Respostas geradas rodando modelosDoPainel.previaUpload do backend (fixtures/notificacoesBackend.ts).
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ModelosDeEmail } from "@/features/admin/components/notificacoes/ModelosDeEmail";
import { normalizarPainel } from "@/features/admin/components/notificacoes/api";
import {
  ARQUIVO_DO_MODELO_REAL, ARQUIVO_ENVIADO, DESATIVAR_EM_USO_REAL, MODELO_DO_PAINEL_REAL, PAINEL_REAL,
  PREVIA_REAL, PREVIA_UPLOAD_COM_JSON_REAL, PREVIA_UPLOAD_INSEGURA_REAL, PREVIA_UPLOAD_REAL, VERSOES_REAIS,
} from "./fixtures/notificacoesBackend";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const MODELOS = [MODELO_DO_PAINEL_REAL, ...PAINEL_REAL.modelos];
let previaUpload: (corpo: any) => unknown = () => PREVIA_UPLOAD_REAL;

beforeEach(() => {
  previaUpload = (corpo) => (corpo?.campos?.length === 1 ? PREVIA_UPLOAD_COM_JSON_REAL : PREVIA_UPLOAD_REAL);
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation((m: string, rota: string, corpo?: any) => {
    if (rota === "/admin/notificacoes/modelos" && m === "GET") return Promise.resolve(ok({ success: true, modelos: MODELOS }));
    if (rota === "/admin/notificacoes/modelos/previa-upload") return Promise.resolve(ok(previaUpload(corpo)));
    if (rota === "/admin/notificacoes/modelos" && m === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({ success: true, modelo: { ...MODELO_DO_PAINEL_REAL, versao: 1 }, avisos: [] }) });
    if (rota === "/admin/notificacoes/modelos/boas_vindas" && m === "PUT") return Promise.resolve(ok({ success: true, modelo: { ...MODELO_DO_PAINEL_REAL, versao: 3 }, avisos: [] }));
    if (rota === "/admin/notificacoes/modelos/boas_vindas/arquivo") return Promise.resolve(ok(ARQUIVO_DO_MODELO_REAL));
    if (rota === "/admin/notificacoes/modelos/boas_vindas/versoes") return Promise.resolve(ok(VERSOES_REAIS));
    if (rota === "/admin/notificacoes/modelos/boas_vindas/restaurar") return Promise.resolve(ok({ success: true, modelo: { ...MODELO_DO_PAINEL_REAL, versao: 3 } }));
    if (rota === "/admin/notificacoes/modelos/boas_vindas/ativo") return Promise.resolve({ ok: false, status: 409, json: async () => DESATIVAR_EM_USO_REAL });
    if (rota === "/admin/notificacoes/previa") return Promise.resolve(ok(PREVIA_REAL));
    return Promise.resolve(ok({ success: true }));
  });
});

const chamadas = (m: string, rota: string) => apiRequestMock.mock.calls.filter(([mm, r]) => mm === m && r === rota);
const arquivo = (nome: string, texto: string, tipo = "text/html") => new File([texto], nome, { type: tipo });
const abrirEnvio = async () => {
  render(<ModelosDeEmail reserva={normalizarPainel(PAINEL_REAL).modelos} />);
  fireEvent.click(await screen.findByRole("button", { name: "Enviar modelo" }));
  return within(await screen.findByTestId("envio-de-modelo"));
};
const enviarArquivo = (p: ReturnType<typeof within>, f: File) => fireEvent.change(p.getByLabelText("Arquivo do modelo (.mjml ou .html)"), { target: { files: [f] } });

describe("modelos de e-mail enviados pelo painel", () => {
  it("separa do sistema e do painel; só os do painel têm ações", async () => {
    render(<ModelosDeEmail reserva={[]} />);
    const cartoes = await screen.findAllByTestId("modelo-de-email");
    const painel = cartoes.find((c) => c.textContent?.includes("Boas-vindas"))!;
    expect(within(painel).getByTestId("origem")).toHaveTextContent("Enviado pelo painel");
    expect(painel).toHaveTextContent("versão 2");
    expect(within(painel).getByRole("button", { name: "Enviar nova versão" })).toBeInTheDocument();
    const sistema = cartoes.find((c) => c.textContent?.includes("simples.mjml"))!;
    expect(within(sistema).getByTestId("origem")).toHaveTextContent("Do sistema");
    expect(within(sistema).queryByRole("button", { name: "Enviar nova versão" })).toBeNull();
    expect(screen.getByTestId("ajuda-modelos")).toHaveTextContent("Enviar modelo");
  });

  it("enviar arquivo: lê o texto, chama previa-upload e mostra formato, prévia, texto e avisos", async () => {
    const p = await abrirEnvio();
    enviarArquivo(p, arquivo("Boas Vindas.html", ARQUIVO_ENVIADO));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/modelos/previa-upload", { nome_arquivo: "Boas Vindas.html", conteudo: ARQUIVO_ENVIADO }));
    expect(await p.findByTestId("formato-detectado")).toHaveTextContent("html");
    expect(p.getByLabelText("Chave")).toHaveValue("boas_vindas");
    expect(p.getByLabelText("Nome do modelo")).toHaveValue("Boas Vindas");
    expect(await p.findByTitle("Prévia do e-mail")).toHaveAttribute("sandbox", "");
    expect(p.getByTestId("texto-puro-do-upload")).toHaveTextContent("Título de exemplo");
    expect(p.getByTestId("avisos-do-upload")).toHaveTextContent("sem lista de campos");
    expect(p.queryByTestId("erros-do-upload")).toBeNull();
    // Campos: os {{x}} achados, numa tabela de dados (sem editor de código).
    expect(p.getAllByTestId(/^linha-campo-/).map((l) => l.getAttribute("data-testid"))).toEqual(
      PREVIA_UPLOAD_REAL.campos_detectados.map((c) => `linha-campo-${c.chave}`),
    );
    expect(p.queryByRole("textbox", { name: /código/i })).toBeNull();
  });

  it("erro do arquivo bloqueia o salvar", async () => {
    previaUpload = () => PREVIA_UPLOAD_INSEGURA_REAL;
    const p = await abrirEnvio();
    enviarArquivo(p, arquivo("promo.html", "<p>{{titulo}}</p><script>alert(1)</script>"));
    expect(await p.findByTestId("erros-do-upload")).toHaveTextContent("molde inseguro: tem <script>");
    fireEvent.change(p.getByLabelText("Motivo"), { target: { value: "teste" } });
    expect(p.getByRole("button", { name: "Salvar modelo" })).toBeDisabled();
    expect(p.getByTestId("falta-no-envio")).toHaveTextContent("Corrija os erros do arquivo");
  });

  it("ajustar os campos detectados e os valores de teste refaz a prévia; salvar manda o corpo do contrato", async () => {
    const p = await abrirEnvio();
    enviarArquivo(p, arquivo("Boas Vindas.html", ARQUIVO_ENVIADO));
    await p.findByTestId("linha-campo-cor_destaque");
    fireEvent.change(p.getByLabelText("Tipo de cor_destaque"), { target: { value: "cor" } });
    fireEvent.change(p.getByLabelText("Padrão de cor_destaque"), { target: { value: "#e75812" } });
    fireEvent.change(p.getByLabelText("Rótulo de botao_rotulo"), { target: { value: "Texto do botão" } });
    fireEvent.click(p.getByLabelText("Obrigatório: botao_rotulo"));
    fireEvent.change(p.getByLabelText("Texto do botão"), { target: { value: "Começar" } });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/modelos/previa-upload", expect.objectContaining({
      valores: { botao_rotulo: "Começar" },
      campos: expect.arrayContaining([expect.objectContaining({ chave: "cor_destaque", tipo: "cor", padrao: "#e75812", aceita_variaveis: false })]),
    })));

    fireEvent.change(p.getByLabelText("Chave"), { target: { value: "Boas Vindas!" } });
    expect(p.getByText("Use de 2 a 40 letras minúsculas, números ou _.")).toBeInTheDocument();
    fireEvent.change(p.getByLabelText("Chave"), { target: { value: "simples" } });
    expect(p.getByText("Já existe um modelo com essa chave.")).toBeInTheDocument();
    fireEvent.change(p.getByLabelText("Chave"), { target: { value: "boas_vindas_2" } });
    fireEvent.change(p.getByLabelText("Descrição"), { target: { value: "Primeiro e-mail" } });
    expect(p.getByRole("button", { name: "Salvar modelo" })).toBeDisabled();
    fireEvent.change(p.getByLabelText("Motivo"), { target: { value: "Primeira versão" } });
    await waitFor(() => expect(p.getByRole("button", { name: "Salvar modelo" })).toBeEnabled());
    fireEvent.click(p.getByRole("button", { name: "Salvar modelo" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(chamadas("POST", "/admin/notificacoes/modelos")).toHaveLength(1));
    const corpo = chamadas("POST", "/admin/notificacoes/modelos")[0][2];
    expect(corpo).toMatchObject({ chave: "boas_vindas_2", rotulo: "Boas Vindas", descricao: "Primeiro e-mail", nome_arquivo: "Boas Vindas.html", conteudo: ARQUIVO_ENVIADO, motivo: "Primeira versão" });
    expect(corpo.campos.find((c: any) => c.chave === "botao_rotulo")).toEqual({ chave: "botao_rotulo", rotulo: "Texto do botão", tipo: "texto", obrigatorio: true, padrao: "", ajuda: "", aceita_variaveis: true });
    expect(await screen.findByText('Modelo "Boas Vindas" salvo.')).toBeInTheDocument();
  });

  it("com o .json, os campos vêm dele", async () => {
    const p = await abrirEnvio();
    const json = JSON.stringify({ rotulo: "Boas-vindas", descricao: "Do arquivo", campos: [{ chave: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true, padrao: "{titulo}", ajuda: "", aceita_variaveis: true }] });
    fireEvent.change(p.getByLabelText("Arquivo dos campos (.json)"), { target: { files: [arquivo("boas_vindas.json", json, "application/json")] } });
    enviarArquivo(p, arquivo("boas_vindas.html", ARQUIVO_ENVIADO));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/modelos/previa-upload", expect.objectContaining({
      campos: [expect.objectContaining({ chave: "titulo", obrigatorio: true, padrao: "{titulo}" })],
    })));
    expect(await p.findByTestId("campos-do-json")).toHaveTextContent("Título");
    expect(p.queryByTestId("tabela-de-campos")).toBeNull();
    expect(p.getByLabelText("Nome do modelo")).toHaveValue("Boas-vindas");
    expect(await p.findByTestId("avisos-do-upload")).toHaveTextContent("{{saudacao}} não é campo");
  });

  it("versão nova: começa do arquivo atual, chave fixa e manda PUT", async () => {
    render(<ModelosDeEmail reserva={[]} />);
    const cartao = (await screen.findAllByTestId("modelo-de-email")).find((c) => c.textContent?.includes("Boas-vindas"))!;
    fireEvent.click(within(cartao).getByRole("button", { name: "Enviar nova versão" }));
    const p = within(await screen.findByTestId("envio-de-modelo"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/modelos/previa-upload", expect.objectContaining({ nome_arquivo: "boas_vindas.html", conteudo: ARQUIVO_ENVIADO })));
    expect(p.getByLabelText("Chave")).toBeDisabled();
    expect(p.getByLabelText("Chave")).toHaveValue("boas_vindas");
    enviarArquivo(p, arquivo("boas_vindas.html", ARQUIVO_ENVIADO.replace("{{texto}}", "{{texto}}<p>Rodapé novo</p>")));
    fireEvent.change(p.getByLabelText("Motivo"), { target: { value: "Rodapé novo" } });
    await waitFor(() => expect(p.getByRole("button", { name: "Salvar versão nova" })).toBeEnabled());
    fireEvent.click(p.getByRole("button", { name: "Salvar versão nova" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(chamadas("PUT", "/admin/notificacoes/modelos/boas_vindas")).toHaveLength(1));
    const corpo = chamadas("PUT", "/admin/notificacoes/modelos/boas_vindas")[0][2];
    expect(corpo).toMatchObject({ rotulo: "Boas-vindas", nome_arquivo: "boas_vindas.html", motivo: "Rodapé novo" });
    expect(corpo.conteudo).toContain("Rodapé novo");
    expect(corpo).not.toHaveProperty("chave");
    expect(await screen.findByText('Versão nova de "Boas-vindas" salva (versão 3).')).toBeInTheDocument();
  });

  it("versões: voltar para uma anterior pede confirmação e manda versão e motivo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ModelosDeEmail reserva={[]} />);
    const cartao = (await screen.findAllByTestId("modelo-de-email")).find((c) => c.textContent?.includes("Boas-vindas"))!;
    fireEvent.click(within(cartao).getByRole("button", { name: "Versões" }));
    const linhas = await screen.findAllByTestId("versao-do-modelo");
    expect(linhas[0]).toHaveTextContent("Valendo");
    expect(within(linhas[0]).queryByRole("button", { name: "Voltar para esta" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Motivo para voltar (opcional)"), { target: { value: "a nova quebrou no Outlook" } });
    fireEvent.click(within(linhas[1]).getByRole("button", { name: "Voltar para esta" }));
    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining("versão 1"));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/notificacoes/modelos/boas_vindas/restaurar", { versao: 1, motivo: "a nova quebrou no Outlook" }));
    expect(await screen.findByText("Voltou para a versão 1.")).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("desativar um modelo em uso mostra a recusa com quem usa", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ModelosDeEmail reserva={[]} />);
    const cartao = (await screen.findAllByTestId("modelo-de-email")).find((c) => c.textContent?.includes("Boas-vindas"))!;
    fireEvent.click(within(cartao).getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("PATCH", "/admin/notificacoes/modelos/boas_vindas/ativo", { ativo: false }));
    expect(await within(cartao).findByTestId("recusa-do-modelo")).toHaveTextContent(DESATIVAR_EM_USO_REAL.message);
    confirmar.mockRestore();
  });
});
