/**
 * O aviso de ambiente na confirmação de um envio em massa (comunicados e personalizadas):
 * PRODUÇÃO, TESTE ou LOCAL conforme o servidor em uso, e para quem vai.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AvisoDoAmbienteDoEnvio, noAmbienteDoEnvio } from "@/features/admin/components/AmbienteDoPainel";

describe("aviso do ambiente do envio", () => {
  it("produção: selo PRODUÇÃO, pessoas reais e o público", () => {
    render(<AvisoDoAmbienteDoEnvio servidor="https://api.arqdoor.com" publico="Todo mundo, profissionais e clientes, 5.000 contas." />);
    const aviso = screen.getByTestId("ambiente-do-envio");
    expect(aviso).toHaveAttribute("data-ambiente", "producao");
    expect(aviso).toHaveTextContent("PRODUÇÃO");
    expect(aviso).toHaveTextContent("Chega em pessoas reais. Servidor api.arqdoor.com.");
    expect(aviso).toHaveTextContent("Para quem: Todo mundo, profissionais e clientes, 5.000 contas.");
    expect(noAmbienteDoEnvio("https://api.arqdoor.com")).toBe("em PRODUÇÃO");
  });

  it("staging: selo TESTE, sem falar em produção", () => {
    render(<AvisoDoAmbienteDoEnvio servidor="https://api.staging.arqdoor.com" publico="Todos os clientes, 12 contas." />);
    const aviso = screen.getByTestId("ambiente-do-envio");
    expect(aviso).toHaveAttribute("data-ambiente", "teste");
    expect(aviso).toHaveTextContent("TESTE");
    expect(aviso).not.toHaveTextContent("PRODUÇÃO");
    expect(aviso).toHaveTextContent("Para quem: Todos os clientes, 12 contas.");
    expect(noAmbienteDoEnvio("https://api.staging.arqdoor.com")).toBe("em TESTE");
  });

  it("servidor local: selo LOCAL", () => {
    render(<AvisoDoAmbienteDoEnvio servidor="http://localhost:3000" publico="Uma pessoa." />);
    const aviso = screen.getByTestId("ambiente-do-envio");
    expect(aviso).toHaveAttribute("data-ambiente", "local");
    expect(aviso).toHaveTextContent("LOCAL");
    expect(aviso).toHaveTextContent("Servidor localhost:3000.");
    expect(noAmbienteDoEnvio("http://localhost:3000")).toBe("em LOCAL");
  });
});
