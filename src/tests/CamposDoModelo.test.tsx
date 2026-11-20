/**
 * Painel > Notificações: formulário dos modelos de e-mail montado a partir dos campos que cada modelo declara.
 */
import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CamposDoModelo } from "@/features/admin/components/notificacoes/CamposDoModelo";
import {
  camposFaltando, manterCamposComuns, modeloOuVazio, normalizarPainel, problemasDoTexto, valoresParaEnviar, type Modelo, type ValoresDosCampos,
} from "@/features/admin/components/notificacoes/api";

const { modelos: [MODELO] } = normalizarPainel({
  modelos: [{
    chave: "completo", rotulo: "Completo", descricao: "Um de cada tipo",
    campos: [
      { chave: "chamada", rotulo: "Chamada", tipo: "texto", obrigatorio: false, padrao: "Olá!", ajuda: "Primeira linha", aceita_variaveis: true },
      { chave: "corpo", rotulo: "Corpo", tipo: "texto_longo", obrigatorio: true, padrao: null, ajuda: "", aceita_variaveis: true },
      { chave: "link", rotulo: "Link do botão", tipo: "url", obrigatorio: false, padrao: "https://arqdoor.com", ajuda: "", aceita_variaveis: false },
      { chave: "cor", rotulo: "Cor do botão", tipo: "cor", obrigatorio: false, padrao: "#ea580c", ajuda: "", aceita_variaveis: false },
      { chave: "imagem", rotulo: "Imagem do topo", tipo: "imagem_url", obrigatorio: false, padrao: "https://cdn.test/topo.png", ajuda: "", aceita_variaveis: false },
      { chave: "rodape", rotulo: "Mostrar rodapé", tipo: "booleano", obrigatorio: false, padrao: true, ajuda: "", aceita_variaveis: false },
      { chave: "tom", rotulo: "Tom", tipo: "opcoes", opcoes: ["Leve", "Sério"], obrigatorio: false, padrao: "Leve", ajuda: "", aceita_variaveis: false },
      { chave: "selo", rotulo: "Selo", tipo: "opcoes", opcoes: [{ valor: "novo", rotulo: "Novo" }], obrigatorio: false, padrao: null, ajuda: "", aceita_variaveis: false },
    ],
  }],
});
const VARIAVEIS = [{ chave: "nome", descricao: "Nome da pessoa", exemplo: "Ana" }];

function Controlado({ modelo = MODELO, inicial = {}, mostrarErros = false }: { modelo?: Modelo; inicial?: ValoresDosCampos; mostrarErros?: boolean }) {
  const [valores, setValores] = useState<ValoresDosCampos>(inicial);
  return (
    <>
      <CamposDoModelo modelo={modelo} valores={valores} mudar={setValores} variaveis={VARIAVEIS} mostrarErros={mostrarErros} />
      <output data-testid="valores">{JSON.stringify(valores)}</output>
    </>
  );
}
const valores = () => JSON.parse(screen.getByTestId("valores").textContent || "{}");

describe("campos do modelo de e-mail", () => {
  it("mostra o controle certo para cada tipo, com ajuda, obrigatório e o padrão no placeholder", () => {
    render(<Controlado />);
    const campo = (k: string) => screen.getByTestId(`campo-${k}`);
    expect(within(campo("chamada")).getByLabelText("Chamada")).toHaveAttribute("type", "text");
    expect(within(campo("chamada")).getByLabelText("Chamada")).toHaveAttribute("placeholder", "Padrão: Olá!");
    expect(campo("chamada")).toHaveTextContent("Primeira linha");
    expect(within(campo("corpo")).getByLabelText("Corpo").tagName).toBe("TEXTAREA");
    expect(campo("corpo")).toHaveTextContent("*");
    expect(within(campo("link")).getByLabelText("Link do botão")).toHaveAttribute("type", "url");
    expect(within(campo("cor")).getByLabelText("Cor do botão: escolher no seletor")).toHaveAttribute("type", "color");
    expect(within(campo("cor")).getByLabelText("Cor do botão: escolher no seletor")).toHaveValue("#ea580c");
    expect(within(campo("cor")).getByLabelText("Cor do botão")).toHaveAttribute("placeholder", "Padrão: #ea580c");
    expect(within(campo("imagem")).getByLabelText("Imagem do topo")).toHaveAttribute("type", "url");
    expect(within(campo("imagem")).getByRole("img")).toHaveAttribute("src", "https://cdn.test/topo.png");
    expect(within(campo("rodape")).getByRole("switch", { name: "Mostrar rodapé" })).toHaveAttribute("aria-checked", "true");
    const tom = within(campo("tom")).getByLabelText("Tom");
    expect(tom.tagName).toBe("SELECT");
    expect(within(tom).getAllByRole("option").map((o) => o.textContent)).toEqual(["Padrão: Leve", "Leve", "Sério"]);
    expect(within(within(campo("selo")).getByLabelText("Selo")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Nenhuma", "Novo"]);
    // Só os campos que aceitam variáveis têm os chips.
    expect(within(campo("chamada")).getByRole("group", { name: "Variáveis para Chamada" })).toBeInTheDocument();
    expect(within(campo("link")).queryByRole("group")).toBeNull();
  });

  it("guarda os valores de cada tipo; vazio volta ao padrão", () => {
    render(<Controlado />);
    fireEvent.change(screen.getByLabelText("Cor do botão: escolher no seletor"), { target: { value: "#112233" } });
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar rodapé" }));
    fireEvent.change(screen.getByLabelText("Tom"), { target: { value: "Sério" } });
    fireEvent.change(screen.getByLabelText("Imagem do topo"), { target: { value: "https://cdn.test/outra.png" } });
    expect(valores()).toEqual({ cor: "#112233", rodape: false, tom: "Sério", imagem: "https://cdn.test/outra.png" });
    expect(within(screen.getByTestId("campo-imagem")).getByRole("img")).toHaveAttribute("src", "https://cdn.test/outra.png");
    fireEvent.click(within(screen.getByTestId("campo-tom")).getByRole("button", { name: "usar padrão" }));
    expect(valores()).not.toHaveProperty("tom");
  });

  it("aponta o obrigatório sem valor e sem padrão", () => {
    render(<Controlado mostrarErros />);
    expect(screen.getByLabelText("Corpo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("campo-corpo")).toHaveTextContent("Preencha este campo");
    expect(screen.getByRole("alert")).toHaveTextContent("Falta preencher: Corpo.");
    fireEvent.change(screen.getByLabelText("Corpo"), { target: { value: "Pronto" } });
    expect(screen.queryByRole("alert")).toBeNull();

    expect(camposFaltando({}, MODELO).map((c) => c.chave)).toEqual(["corpo"]);
    expect(camposFaltando({ corpo: "  " }, MODELO).map((c) => c.chave)).toEqual(["corpo"]);
    expect(camposFaltando({}, MODELO, { corpo: "texto da notificação" })).toEqual([]);
  });

  it("chip de variável entra onde está o cursor", async () => {
    render(<Controlado />);
    const chamada = screen.getByLabelText("Chamada") as HTMLInputElement;
    fireEvent.change(chamada, { target: { value: "Oi, tudo bem?" } });
    chamada.setSelectionRange(3, 3);
    fireEvent.click(within(screen.getByRole("group", { name: "Variáveis para Chamada" })).getByRole("button", { name: "{nome}" }));
    expect(valores()).toEqual({ chamada: "Oi,{nome} tudo bem?" });
  });

  it("troca de modelo guarda só as chaves que existem no novo; não inventa campos", () => {
    const outro: Modelo = { chave: "outro", rotulo: "Outro", descricao: "", campos: [MODELO.campos[0]] };
    expect(manterCamposComuns({ chamada: "Oi", corpo: "x", titulo: "T" }, modeloOuVazio(outro))).toEqual({ chamada: "Oi" });
    expect(modeloOuVazio(outro).campos.map((c) => c.chave)).toEqual(["chamada"]);
    expect(modeloOuVazio(null).campos).toEqual([]);
  });

  it("envia só o que mexeu; \"\" de propósito vai só em opcional de texto/link", () => {
    expect(valoresParaEnviar({ chamada: " Oi ", corpo: "", estranho: "z", rodape: false, link: "", cor: "", tom: "" }, MODELO))
      .toEqual({ chamada: "Oi", rodape: false, link: "" });
    expect(valoresParaEnviar({ chamada: "   " }, MODELO)).toEqual({});
  });

  it("\"Deixar vazio\" só nos opcionais de texto/link; apagar digitando volta ao padrão", () => {
    render(<Controlado />);
    expect(within(screen.getByTestId("campo-corpo")).queryByRole("button", { name: "Deixar vazio" })).toBeNull();
    expect(within(screen.getByTestId("campo-cor")).queryByRole("button", { name: "Deixar vazio" })).toBeNull();
    fireEvent.click(within(screen.getByTestId("campo-chamada")).getByRole("button", { name: "Deixar vazio" }));
    expect(valores()).toEqual({ chamada: "" });
    expect(within(screen.getByTestId("campo-chamada")).getByTestId("vazio-de-proposito")).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("campo-chamada")).getByRole("button", { name: "usar padrão" }));
    expect(valores()).toEqual({});
    fireEvent.change(screen.getByLabelText("Chamada"), { target: { value: "Oi" } });
    fireEvent.change(screen.getByLabelText("Chamada"), { target: { value: "" } });
    expect(valores()).toEqual({});
  });

  it("só {letra...} e {{...}} contam como variável, igual ao backend", () => {
    expect(problemasDoTexto("Passo {1} de { nome }", ["nome"])).toEqual([]);
    expect(problemasDoTexto("Oi {Nome_2}", ["nome"])).toHaveLength(1);
    expect(problemasDoTexto("{{ link }}", ["link"])[0]).toContain("use {link}");
  });
});
