import { test, expect } from "./fixtures";

// J-01: paginas publicas abrem sem erro. Especificacao em specs/testes/jornadas-e2e.md.
test.describe("J-01 paginas publicas", () => {
  test("a landing abre", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ArqDoor/);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("a tela de acesso ja mostra o formulario de login", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "Bem-vindo ao ArqDoor!" })).toBeVisible();

    await expect(page.getByPlaceholder("voce@exemplo.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("criar conta abre o cadastro em modal", async ({ page }) => {
    await page.goto("/auth");

    // No celular, o aviso de cookies do primeiro acesso cobre o link ate ser fechado.
    await page.getByRole("button", { name: "Recusar" }).click();
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByRole("dialog", { name: "Criar conta" })).toBeVisible();
  });

  test("rota desconhecida sem sessao leva para o login", async ({ page }) => {
    await page.goto("/rota-que-nao-existe-e2e");
    await expect(page.getByRole("heading", { name: "Bem-vindo ao ArqDoor!" })).toBeVisible();
  });
});
