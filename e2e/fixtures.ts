import { test as base, expect } from "@playwright/test";

// Todo teste falha se a pagina lancar erro de JavaScript nao tratado. Tela que "abre" mas
// quebrou por dentro e o defeito que o smoke existe para pegar.
export const test = base.extend<{ errosDaPagina: string[] }>({
  errosDaPagina: [
    async ({ page }, use) => {
      const erros: string[] = [];
      page.on("pageerror", (erro) => erros.push(erro.message));
      await use(erros);
      expect(erros, "erros de JavaScript na pagina").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const credenciais = {
  cliente: {
    email: process.env.E2E_CLIENT_EMAIL,
    senha: process.env.E2E_CLIENT_PASSWORD,
  },
};
