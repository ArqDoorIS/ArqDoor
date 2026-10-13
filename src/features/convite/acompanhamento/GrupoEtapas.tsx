/**
 * Linha do tempo de etapas de um grupo de pagamento.
 * specs/features/2026-10-convite-acompanhamento/03-contrato.md
 */

import { Check } from "lucide-react";
import { textoDaEtapa, formatValor } from "./helpers";
import type { GrupoAcompanhamento, EtapaAcompanhamento, SituacaoEtapa } from "./types";

type EtapaItemProps = {
  etapa: EtapaAcompanhamento;
  isUltima: boolean;
  isCliente: boolean;
  isDetalhado: boolean;
};

function IconeEtapa({ situacao }: { situacao: SituacaoEtapa }) {
  if (situacao === "aprovada") {
    return (
      <div
        aria-hidden="true"
        className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0"
      >
        <Check className="w-3 h-3 text-white stroke-[3]" />
      </div>
    );
  }
  if (situacao === "entregue") {
    return (
      <div
        aria-hidden="true"
        className="w-5 h-5 rounded-full border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/40 shrink-0 box-border"
      />
    );
  }
  if (situacao === "em_andamento") {
    return (
      <div
        aria-hidden="true"
        className="w-5 h-5 rounded-full border-2 border-orange-400 bg-orange-50 dark:bg-orange-900/40 shrink-0 box-border"
      />
    );
  }
  // aguardando
  return (
    <div
      aria-hidden="true"
      className="w-5 h-5 rounded-full border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 shrink-0 box-border"
    />
  );
}

function corTextoData(situacao: SituacaoEtapa): string {
  switch (situacao) {
    case "aprovada":
      return "text-green-700 dark:text-green-400";
    case "entregue":
      return "text-amber-700 dark:text-amber-400";
    case "em_andamento":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-stone-400 dark:text-stone-500";
  }
}

function EtapaItem({ etapa, isUltima, isCliente, isDetalhado }: EtapaItemProps) {
  const textoData = textoDaEtapa(etapa, isCliente);
  const cor = corTextoData(etapa.situacao);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <IconeEtapa situacao={etapa.situacao} />
        {!isUltima && (
          <div
            className={`w-0.5 flex-1 mt-1 ${
              etapa.situacao === "aprovada"
                ? "bg-green-100 dark:bg-green-900/50"
                : "bg-stone-100 dark:bg-stone-700"
            }`}
          />
        )}
      </div>
      <div
        className={`flex flex-1 min-w-0 justify-between gap-3 ${isUltima ? "" : "pb-3"}`}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-bold text-stone-900 dark:text-stone-50 truncate">
            {etapa.numero}. {etapa.titulo}
          </span>
          {textoData && (
            <span className={`text-xs font-semibold ${cor}`}>{textoData}</span>
          )}
        </div>
        {isDetalhado && etapa.valor != null && (
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 shrink-0 pt-0.5">
            {formatValor(etapa.valor)}
          </span>
        )}
      </div>
    </div>
  );
}

type Props = {
  grupo: GrupoAcompanhamento;
  isCliente: boolean;
  isDetalhado: boolean;
};

export function GrupoEtapas({ grupo, isCliente, isDetalhado }: Props) {
  const nomeGrupo = grupo.nome ?? "Etapas";
  const badgePago = grupo.pago
    ? {
        texto: isDetalhado && grupo.valor != null ? `Pago - ${formatValor(grupo.valor)}` : "Pago",
        cls: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      }
    : {
        texto:
          isDetalhado && grupo.valor != null
            ? `A pagar - ${formatValor(grupo.valor)}`
            : "Aguardando pagamento",
        cls: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
      };

  return (
    <div
      data-testid="grupo-etapas"
      className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold text-stone-900 dark:text-stone-50">
          {nomeGrupo}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${badgePago.cls}`}
        >
          {badgePago.texto}
        </span>
      </div>

      {grupo.etapas.map((etapa, i) => (
        <EtapaItem
          key={etapa.numero}
          etapa={etapa}
          isUltima={i === grupo.etapas.length - 1}
          isCliente={isCliente}
          isDetalhado={isDetalhado}
        />
      ))}
    </div>
  );
}
