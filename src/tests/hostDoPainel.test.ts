/**
 * Qual host serve o painel.
 *
 * O painel ganhou origem propria (admin.arqdoor.com) e ali a raiz JA e o painel: exigir
 * `/admin` no fim de um host chamado admin e redundante. Mas o MESMO bundle continua
 * servindo arqdoor.com, onde `/` e a home publica.
 *
 * O que estes testes protegem e justamente essa separacao. Se a deteccao passar a valer
 * para arqdoor.com, a home publica vira o painel administrativo para todo visitante.
 */
import { describe, expect, it, afterEach, vi } from "vitest";

import { ehHostDoPainel } from "@/App";

const comHost = (hostname: string) => {
  vi.stubGlobal("window", { ...globalThis.window, location: { ...globalThis.window?.location, hostname } });
};

describe("ehHostDoPainel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconhece o host de producao do painel", () => {
    comHost("admin.arqdoor.com");
    expect(ehHostDoPainel()).toBe(true);
  });

  // Por prefixo, e nao por igualdade, para um admin.staging futuro nao exigir mudanca aqui.
  it("reconhece um admin.staging futuro", () => {
    comHost("admin.staging.arqdoor.com");
    expect(ehHostDoPainel()).toBe(true);
  });

  // A regressao que mais importa: se isto virar true, a home publica de arqdoor.com passa
  // a renderizar o painel administrativo para qualquer visitante.
  it("NAO reconhece o site publico", () => {
    comHost("arqdoor.com");
    expect(ehHostDoPainel()).toBe(false);
  });

  it("NAO reconhece www", () => {
    comHost("www.arqdoor.com");
    expect(ehHostDoPainel()).toBe(false);
  });

  it("NAO reconhece staging do site", () => {
    comHost("staging.arqdoor.com");
    expect(ehHostDoPainel()).toBe(false);
  });

  // "administrativo.arqdoor.com" nao deve casar por acidente: a regra e o rotulo `admin`
  // seguido de ponto, nao qualquer coisa que comece com as letras a-d-m-i-n.
  it("NAO casa com host que apenas comeca com as letras de admin", () => {
    comHost("administrativo.arqdoor.com");
    expect(ehHostDoPainel()).toBe(false);
  });

  it("nao explode em localhost", () => {
    comHost("localhost");
    expect(ehHostDoPainel()).toBe(false);
  });
});
