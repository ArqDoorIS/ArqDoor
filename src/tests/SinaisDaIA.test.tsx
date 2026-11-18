import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SinaisConsolidados, SinaisDoTurno } from "@/features/admin/components/SinaisDaIA";

describe("sinais da conversa no painel", () => {
  it("mostra cada sinal com o valor e a frase que prova", () => {
    render(<SinaisConsolidados sinais={{ pressa: { sinal: "pressa", valor: "sem_pressa", prova: "não tenho pressa nenhuma", origem: "conversa" }, so_orcando: { sinal: "so_orcando", valor: "sim", prova: "só quero saber o preço", origem: "botao", confianca: "media" } }} />);
    expect(screen.getByText("Sinais da conversa (privado)")).toBeInTheDocument();
    expect(screen.getByText(/sem pressa/)).toBeInTheDocument();
    expect(screen.getByText(/“não tenho pressa nenhuma”/)).toBeInTheDocument();
    expect(screen.getByText("botão")).toBeInTheDocument();
    expect(screen.getByText("confiança média")).toBeInTheDocument();
  });

  it("sem sinais não mostra nada", () => {
    const { container } = render(<SinaisConsolidados sinais={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no turno, mostra os recusados com o motivo", () => {
    render(<SinaisDoTurno s={{ aceitos: [], recusados: [{ sinal: "estagio", valor: "decidido", prova: "vou fechar", motivo: "a prova não está nas falas da pessoa" }] }} />);
    expect(screen.getByText(/1 recusado/)).toBeInTheDocument();
    expect(screen.getByText(/a prova não está nas falas da pessoa/)).toBeInTheDocument();
  });
});
