/**
 * Formulário de cartão do site.
 *
 * Espelha `arqdoor-mobile/src/components/CardForm.tsx`: mesmas validações, mesmas
 * mensagens, mesma saída para PIX quando a falha não é coisa que o cliente conserta
 * digitando de novo.
 *
 * Os dados vão daqui direto para a Pagar.me e voltam como token de uso único. O número
 * do cartão nunca chega ao backend da ArqDoor e nunca é guardado no navegador.
 *
 * Por que existe: o checkout hospedado NÃO divide o valor com o prestador (a API aceita
 * o campo `split` e o ignora em silêncio). Cartão com split só pela Orders API, que
 * exige token. Até 2026-09-09 o site mandava o cliente para esse checkout, ou seja,
 * cobrava sem repassar.
 */
import { useState } from "react";
import { CreditCard, Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";
import {
  mascaraNumero,
  mascaraValidade,
  soDigitos,
  tokenizarCartao,
  type CartaoTokenizado,
  type ErroCartao,
} from "@/lib/pagarme";

type CardFormProps = {
  /** Total que será cobrado, só para o rótulo do botão. */
  total?: number;
  /** A cobrança em si já está a caminho do backend. */
  enviando?: boolean;
  onToken: (cartao: CartaoTokenizado) => void;
  /** Troca a forma de pagamento para PIX, quando o cartão não é caminho. */
  onUsarPix?: () => void;
};

export function CardForm({ total, enviando, onToken, onUsarPix }: CardFormProps) {
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [cvvVisivel, setCvvVisivel] = useState(false);
  const [erro, setErro] = useState<{ campo?: ErroCartao["campo"]; msg: string } | null>(null);
  const [tokenizando, setTokenizando] = useState(false);

  const ocupado = tokenizando || !!enviando;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setTokenizando(true);
    try {
      const cartao = await tokenizarCartao({ numero, nome, validade, cvv });
      // Os dados saem da memória assim que viram token: não há motivo para mantê-los.
      setNumero("");
      setNome("");
      setValidade("");
      setCvv("");
      onToken(cartao);
    } catch (e) {
      const err = e as ErroCartao;
      setErro({ campo: err.campo, msg: err.message });
    } finally {
      setTokenizando(false);
    }
  }

  const borda = (campo: string) =>
    erro?.campo === campo ? "border-danger focus-visible:ring-danger" : "";

  // Erro de campo o cliente resolve digitando de novo. Recusa da operadora, queda de rede
  // e site sem chave de tokenização, não: nesses casos a única saída real é outra forma
  // de pagamento, e ela precisa estar ali no bloco do erro.
  const semConserto = !!erro && (!erro.campo || erro.campo === "config" || erro.campo === "rede");

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CreditCard className="h-4 w-4 text-brand-dark" />
        Dados do cartão
      </div>

      <div className="space-y-1">
        <Label htmlFor="cartao-numero" className="text-xs text-muted-foreground">
          Número do cartão
        </Label>
        <Input
          id="cartao-numero"
          value={numero}
          onChange={(e) => setNumero(mascaraNumero(e.target.value))}
          placeholder="0000 0000 0000 0000"
          inputMode="numeric"
          autoComplete="cc-number"
          disabled={ocupado}
          className={borda("numero")}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="cartao-nome" className="text-xs text-muted-foreground">
          Nome impresso no cartão
        </Label>
        <Input
          id="cartao-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Como está no cartão"
          autoComplete="cc-name"
          disabled={ocupado}
          className={borda("nome")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cartao-validade" className="text-xs text-muted-foreground">
            Validade
          </Label>
          <Input
            id="cartao-validade"
            value={validade}
            onChange={(e) => setValidade(mascaraValidade(e.target.value))}
            placeholder="MM/AA"
            inputMode="numeric"
            autoComplete="cc-exp"
            disabled={ocupado}
            className={borda("validade")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cartao-cvv" className="text-xs text-muted-foreground">
            CVV
          </Label>
          <div className="relative">
            <Input
              id="cartao-cvv"
              value={cvv}
              onChange={(e) => setCvv(soDigitos(e.target.value).slice(0, 4))}
              placeholder="000"
              inputMode="numeric"
              autoComplete="cc-csc"
              type={cvvVisivel ? "text" : "password"}
              disabled={ocupado}
              className={`pr-9 ${borda("cvv")}`}
            />
            <button
              type="button"
              onClick={() => setCvvVisivel((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
              aria-label={cvvVisivel ? "Ocultar CVV" : "Mostrar CVV"}
            >
              {cvvVisivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="space-y-2 rounded-md bg-danger-bg px-3 py-2">
          <p className="text-xs leading-relaxed text-danger-dark">{erro.msg}</p>
          {semConserto && onUsarPix ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUsarPix}
              className="w-full border-danger/30 text-danger-dark hover:bg-danger-bg"
            >
              Pagar com PIX
            </Button>
          ) : null}
        </div>
      )}

      <Button
        type="submit"
        disabled={ocupado}
        className="w-full bg-brand hover:bg-brand-dark"
      >
        {ocupado ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        {ocupado ? "Processando..." : `Pagar ${total != null ? formatPrice(total) : ""}`.trim()}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        Os dados do cartão vão direto para a operadora. A ArqDoor não os armazena.
      </p>
    </form>
  );
}
