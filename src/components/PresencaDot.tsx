/**
 * Bolinha indicadora de presenca (spec 2026-10-presenca-no-chat).
 *
 * Online: #22c55e (verde forte)
 * Disponivel: #a7dcb8 (verde apagado)
 * Indisponivel: nenhuma bolinha
 *
 * O elemento e decorativo (aria-hidden); o texto que carrega o estado fica
 * no rotulo adjacente (StatusPresenca ou similar).
 */

import { EstadoPresenca } from "@/lib/presenca";

interface PresencaDotProps {
  presenca: EstadoPresenca;
  /** Tamanho do circulo em pixels. Padrao: 10. */
  tamanho?: number;
}

export function PresencaDot({ presenca, tamanho = 10 }: PresencaDotProps) {
  const cor = presenca.online
    ? "#22c55e"
    : presenca.disponivel
    ? "#a7dcb8"
    : null;

  if (!cor) return null;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: tamanho,
        height: tamanho,
        borderRadius: "50%",
        backgroundColor: cor,
        flexShrink: 0,
        border: "1.5px solid white",
      }}
    />
  );
}
