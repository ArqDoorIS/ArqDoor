/**
 * Aba "Termos de uso" do painel (20/11/2026): publicar versão nova e acompanhar os aceites.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import v1 from "./termos-v1.fixture.txt?raw";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: apiRequestMock, API_BASE_URL: "https://api.test" }));

import { AdminTermosSection } from "@/features/admin/components/AdminTermosSection";

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const PAINEL = {
  atual: { versao: 1, conteudo: v1, resumo: null, publicada_em: "2026-11-20T12:00:00Z" },
  versoes: [{ versao: 1, resumo: "Versão inicial", criado_por: "dono@arqdoor.com", publicada_em: "2026-11-20T12:00:00Z", aceites: 312 }],
  total_contas: 1050,
  limites: { minimo: 200, maximo: 300000 },
};
const PESSOAS = {
  versao: 1, total: 1, por_pagina: 25,
  pessoas: [{ user_id: 9, nome: "Ana Lima", email: "ana@exemplo.com", tipo: "prestador", aceito_em: "2026-11-20T13:00:00Z", origem: "legado", ultima_versao_aceita: 1 }],
};

let resposta: { publicar: () => unknown };
beforeEach(() => {
  resposta = { publicar: () => ok({ success: true, versao: 2 }, 201) };
  apiRequestMock.mockReset();
  apiRequestMock.mockImplementation(async (metodo: string, caminho: string) => {
    if (metodo === "POST" && caminho === "/admin/termos") return resposta.publicar();
    if (caminho === "/admin/termos") return ok(PAINEL);
    if (caminho.startsWith("/admin/termos/pessoas")) return ok(PESSOAS);
    throw new Error(`inesperado ${metodo} ${caminho}`);
  });
});

describe("aba Termos de uso", () => {
  it("mostra versões com os aceites e quem aceitou", async () => {
    render(<AdminTermosSection />);
    expect(await screen.findByText("312 de 1.050 contas")).toBeTruthy();
    expect(screen.getByText("Versão inicial")).toBeTruthy();
    expect(await screen.findByText("Ana Lima")).toBeTruthy();
    expect(screen.getByText("Profissional")).toBeTruthy();
    expect(screen.getByText("Cadastro antigo")).toBeTruthy();
    expect(apiRequestMock.mock.calls.some(([, c]) => c === "/admin/termos/pessoas?versao=1&situacao=aceitou&pagina=1")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Ainda não aceitaram" }));
    await waitFor(() => expect(apiRequestMock.mock.calls.some(([, c]) => c === "/admin/termos/pessoas?versao=1&situacao=pendente&pagina=1")).toBe(true));
  });

  it("publica a versão 2 com confirmação e o corpo certo", async () => {
    render(<AdminTermosSection />);
    const editor = (await screen.findByLabelText("Texto dos termos")) as HTMLTextAreaElement;
    expect(editor.value).toBe(v1);
    const botao = screen.getByRole("button", { name: "Publicar versão 2" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    const novo = v1.replace("Última atualização: 29 de julho de 2026.", "Última atualização: 20 de novembro de 2026.");
    fireEvent.change(editor, { target: { value: novo } });
    expect(botao.disabled).toBe(true); // falta o "o que mudou"
    fireEvent.change(screen.getByPlaceholderText(/Nova cláusula/), { target: { value: "Data de atualização nova." } });
    expect(botao.disabled).toBe(false);
    // a prévia acompanha o texto
    await waitFor(() => expect(within(screen.getByTestId("previa-dos-termos")).getByText("Última atualização: 20 de novembro de 2026.")).toBeTruthy());

    fireEvent.click(botao);
    expect(await screen.findByText("Todas as contas vão precisar aceitar a versão 2 no próximo acesso. Publicar?")).toBeTruthy();
    expect(apiRequestMock.mock.calls.some(([m]) => m === "POST")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("POST", "/admin/termos", { conteudo: novo, resumo: "Data de atualização nova." }));
    expect(await screen.findByText(/Versão 2 publicada/)).toBeTruthy();
    expect(apiRequestMock.mock.calls.filter(([m, c]) => m === "GET" && c === "/admin/termos").length).toBeGreaterThanOrEqual(2);
  });

  it("mostra o erro da API ao publicar", async () => {
    resposta.publicar = () => ok({ message: "O texto dos termos ficou curto demais." }, 400);
    render(<AdminTermosSection />);
    const editor = await screen.findByLabelText("Texto dos termos");
    fireEvent.change(editor, { target: { value: v1 + "\n1.1. Mais uma." } });
    fireEvent.change(screen.getByPlaceholderText(/Nova cláusula/), { target: { value: "Teste" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar versão 2" }));
    fireEvent.click(await screen.findByRole("button", { name: "Publicar" }));
    expect(await screen.findByText("O texto dos termos ficou curto demais.")).toBeTruthy();
  });
});
