import { test, expect } from "./fixtures";

// J-01: paginas publicas abrem sem erro. Especificacao em specs/testes/jornadas-e2e.md.
test.describe("J-01 paginas publicas", () => {
  test("a landing abre", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ArqDoor/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("a tela de acesso abre o formulario de login", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "Bem vindo ArqDoor!" })).toBeVisible();

    await page.getByRole("button", { name: "Entrar" }).click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByPlaceholder("voce@exemplo.com")).toBeVisible();
    await expect(dialogo.getByPlaceholder("••••••••")).toBeVisible();
  });

  test("rota desconhecida sem sessao leva para o login", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-e2e");
    await expect(page.getByRole("heading", { name: "Bem vindo ArqDoor!" })).toBeVisible();
  });
});
