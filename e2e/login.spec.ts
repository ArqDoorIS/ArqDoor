import { test, expect, credenciais } from "./fixtures";

// J-02: login por e-mail e senha. Especificacao em specs/testes/jornadas-e2e.md.
async function entrar(page: import("@playwright/test").Page, email: string, senha: string) {
  await page.goto("/auth");
  await page.getByPlaceholder("voce@exemplo.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("J-02 login", () => {
  test("senha errada nao entra", async ({ page }) => {
    await entrar(page, "ninguem.e2e@arqdoor.com.br", "senha-errada-e2e");

    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("cliente entra e cai na home", async ({ page }) => {
    test.skip(
      !credenciais.cliente.email || !credenciais.cliente.senha,
      "defina E2E_CLIENT_EMAIL e E2E_CLIENT_PASSWORD (conta de teste do ambiente alvo)",
    );
    await entrar(page, credenciais.cliente.email!, credenciais.cliente.senha!);

    await expect(page).toHaveURL(/\/home/);
  });
});
