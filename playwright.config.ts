import { defineConfig, devices } from "@playwright/test";

// E2E da web. Alvo padrao: staging. Especificacao das jornadas:
// specs/testes/jornadas-e2e.md (raiz do workspace).
//
//   npm run test:e2e                                   # contra staging
//   E2E_BASE_URL=http://localhost:5173 npm run test:e2e # contra o vite local
//
// Teste que cria ou altera dado leva a tag @escrita no titulo. Contra producao ele nao roda.
//
// Credenciais das contas de teste: .env.e2e (fora do git), modelo em env.e2e.example.
try {
  process.loadEnvFile(".env.e2e");
} catch {
  // sem arquivo: os testes que precisam de conta se pulam sozinhos
}
const baseURL = (process.env.E2E_BASE_URL || "https://staging.arqdoor.com").replace(/\/$/, "");
const ehProducao = /^https:\/\/(www\.|admin\.)?arqdoor\.com$/.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  grepInvert: ehProducao ? /@escrita/ : undefined,
  use: {
    baseURL,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
});
