import { test, expect, credenciais } from "./fixtures";

// J-02: login por e-mail e senha. Especificacao em specs/testes/jornadas-e2e.md.
async function abrirLogin(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Entrar" }).click();
  return page.getByRole("dialog");
}

test.describe("J-02 login", () => {
  test("senha errada nao entra", async ({ page }) => {
    const dialogo = await abrirLogin(page);
    await dialogo.getByPlaceholder("voce@exemplo.com").fill("ninguem.e2e@arqdoor.com.br");
    await dialogo.getByPlaceholder("••••••••").fill("senha-errada-e2e");
    await dialogo.getByRole("button", { name: "Entrar" }).click();

    await expect(dialogo).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("cliente entra e cai na home", async ({ page }) => {
    test.skip(
      !credenciais.cliente.email || !credenciais.cliente.senha,
      "defina E2E_CLIENT_EMAIL e E2E_CLIENT_PASSWORD (conta de teste do ambiente alvo)",
    );
    const dialogo = await abrirLogin(page);
    await dialogo.getByPlaceholder("voce@exemplo.com").fill(credenciais.cliente.email!);
    await dialogo.getByPlaceholder("••••••••").fill(credenciais.cliente.senha!);
    await dialogo.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/home/);
  });
});
