/**
 * CSP do site (nginx-cabecalhos.conf, a imagem do staging e, depois do Coolify, a de produção):
 * o tempo real abre o socket no endereço da API em uso, e o connect-src libera esse socket.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/queryClient", () => ({ API_BASE_URL: "https://api.staging.arqdoor.com" }));

import { conectarTempoReal, desconectarTempoReal } from "@/lib/tempo-real";

const conf = readFileSync(path.resolve(__dirname, "../../nginx-cabecalhos.conf"), "utf-8");
const politica = conf.match(/Content-Security-Policy-Report-Only "([^"]+)"/)?.[1] ?? "";
const diretiva = (nome: string) =>
  politica.split(";").map((d) => d.trim().split(/\s+/)).find(([n]) => n === nome)?.slice(1) ?? [];

describe("CSP do site e o socket do tempo real", () => {
  it("o socket abre no endereço da API em uso (https vira wss no socket.io)", () => {
    ioMock.mockReturnValue({ on: vi.fn(), removeAllListeners: vi.fn(), disconnect: vi.fn() });
    conectarTempoReal(() => {}, () => {});
    expect(ioMock).toHaveBeenCalledWith("https://api.staging.arqdoor.com", expect.objectContaining({ path: "/socket.io", withCredentials: true }));
    desconectarTempoReal();
  });

  it("connect-src libera https e wss das duas APIs (o painel troca de servidor) e a do host", () => {
    const connect = diretiva("connect-src");
    for (const fonte of [
      "https://api.arqdoor.com", "wss://api.arqdoor.com",
      "https://api.staging.arqdoor.com", "wss://api.staging.arqdoor.com",
      "https://$api_da_previa", "wss://$api_da_previa",
    ]) expect(connect).toContain(fonte);
  });

  it("segue só relatando: a CSP que bloqueia é só a do iframe", () => {
    expect(politica).toContain("report-uri https://$api_da_previa/csp-report");
    expect(conf).toMatch(/add_header Content-Security-Policy "frame-ancestors 'self'" always;/);
  });
});
