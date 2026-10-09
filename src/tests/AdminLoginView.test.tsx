/**
 * Entrada do painel, em dois passos.
 *
 * O que estes testes protegem é o comportamento de segurança visível: o segundo passo só
 * aparece quando existe desafio, o campo do código não aceita lixo, e o aviso de "recebeu
 * sem ter pedido" está na tela no momento em que importa. Esse aviso é a única coisa que
 * diz à pessoa que alguém sabe a senha dela.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminLoginView } from "@/features/admin/components/AdminLoginView";

const renderizar = (over: Record<string, unknown> = {}) => {
  const props = {
    email: "",
    password: "",
    authSubmitting: false,
    authError: null,
    desafio: null,
    codigo: "",
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onCodigoChange: vi.fn(),
    onSubmit: vi.fn(),
    onVerificar: vi.fn(),
    onCancelar: vi.fn(),
    ...over,
  };
  render(<AdminLoginView {...(props as any)} />);
  return props;
};

const DESAFIO = { challenge: "abc", deviceLabel: "Chrome em macOS" };

describe("AdminLoginView", () => {
  describe("passo 1", () => {
    it("pede e-mail e senha", () => {
      renderizar();
      expect(screen.getByPlaceholderText("voce@arqdoor.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("********")).toBeInTheDocument();
    });

    // A regressao: o campo do codigo nao pode existir antes de haver desafio, senao a tela
    // sugere um passo que ainda nao faz sentido.
    it("NAO mostra o campo de codigo sem desafio", () => {
      renderizar();
      expect(screen.queryByPlaceholderText("000000")).not.toBeInTheDocument();
    });

    it("nao oferece mais login por Google", () => {
      renderizar();
      expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
    });
  });

  describe("passo 2", () => {
    it("mostra o campo de codigo e some com a senha", () => {
      renderizar({ desafio: DESAFIO });
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("********")).not.toBeInTheDocument();
    });

    it("diz de qual dispositivo veio o pedido", () => {
      renderizar({ desafio: DESAFIO });
      expect(screen.getByText("Chrome em macOS")).toBeInTheDocument();
    });

    // Sem este aviso, quem recebe um codigo do nada nao tem como saber que a senha vazou.
    it("avisa o que fazer se a pessoa nao pediu o codigo", () => {
      renderizar({ desafio: DESAFIO });
      expect(screen.getByText(/Alguém sabe a sua senha/i)).toBeInTheDocument();
    });

    it("descarta o que nao for digito e para em 6", () => {
      const props = renderizar({ desafio: DESAFIO });
      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "1a2b3c4d5e6f7g" },
      });
      expect(props.onCodigoChange).toHaveBeenCalledWith("1234567".slice(0, 6));
    });

    it("so libera o envio com os 6 digitos", () => {
      renderizar({ desafio: DESAFIO, codigo: "123" });
      expect(screen.getByRole("button", { name: /entrar no painel/i })).toBeDisabled();
    });

    it("libera com 6 digitos", () => {
      renderizar({ desafio: DESAFIO, codigo: "123456" });
      expect(screen.getByRole("button", { name: /entrar no painel/i })).toBeEnabled();
    });

    it("da caminho de volta para outra conta", () => {
      const props = renderizar({ desafio: DESAFIO });
      fireEvent.click(screen.getByText(/usar outra conta/i));
      expect(props.onCancelar).toHaveBeenCalled();
    });

    it("mostra o erro vindo da API", () => {
      renderizar({ desafio: DESAFIO, authError: "Código inválido ou expirado." });
      expect(screen.getByText("Código inválido ou expirado.")).toBeInTheDocument();
    });
  });
});
