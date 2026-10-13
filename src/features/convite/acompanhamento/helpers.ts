// Helpers puros para textos de data e logica de "Sua vez"
// Testavel sem renderizacao (sem dependencias de React ou browser)

import type { EtapaAcompanhamento, FaseAtual, SituacaoEtapa } from "./types";

/** Formata "dd/mm" a partir de string ISO ou data YYYY-MM-DD */
export function formatDia(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm..."
  const partes = dateStr.replace("T", " ").split(" ")[0].split("-");
  if (partes.length < 3) return "";
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
}

/** Formata "dd/mm/aaaa" a partir de string ISO */
export function formatDataCompleta(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const partes = dateStr.replace("T", " ").split(" ")[0].split("-");
  if (partes.length < 3) return "";
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** Texto de data da etapa conforme o contrato (decisao E) */
export function textoDaEtapa(
  etapa: EtapaAcompanhamento,
  isCliente: boolean
): string {
  switch (etapa.situacao) {
    case "aprovada":
      return `Aprovada em ${formatDia(etapa.aprovada_em)}`;
    case "entregue": {
      const data = formatDia(etapa.entregue_em);
      if (isCliente) {
        return data
          ? `Entregue em ${data}, aguardando sua aprovação`
          : "Entregue, aguardando sua aprovação";
      }
      return data
        ? `Entregue em ${data}, aguardando aprovação`
        : "Entregue, aguardando aprovação";
    }
    case "em_andamento": {
      const data = formatDia(etapa.iniciada_em);
      return data ? `Em andamento desde ${data}` : "Em andamento";
    }
    case "aguardando": {
      const inicio = formatDia(etapa.previsto_inicio);
      const fim = formatDia(etapa.previsto_fim);
      if (inicio && fim) return `Aguardando - previsto de ${inicio} a ${fim}`;
      if (inicio) return `Aguardando - previsto para ${inicio}`;
      return "Aguardando";
    }
  }
}

/** Texto do bloco "Sua vez" para clientes */
export function textoDaSuaVez(faseAtual: FaseAtual): string | null {
  if (!faseAtual) return null;
  if (
    faseAtual.tipo === "etapa" &&
    faseAtual.situacao === "entregue" &&
    faseAtual.etapa_numero != null &&
    faseAtual.etapa_titulo
  ) {
    return `Aprovar a etapa ${faseAtual.etapa_numero}: ${faseAtual.etapa_titulo}`;
  }
  if (faseAtual.tipo === "pagamento" && faseAtual.grupo_nome) {
    return `Pagar o grupo ${faseAtual.grupo_nome}`;
  }
  return null;
}

/** Verifica se ha "Sua vez" para o cliente */
export function temSuaVez(faseAtual: FaseAtual): boolean {
  return textoDaSuaVez(faseAtual) !== null;
}

/** Label do status do contrato para exibicao */
export function labelStatus(
  status: string
): { texto: string; cor: "azul" | "laranja" | "verde" | "vermelho" | "cinza" } {
  switch (status) {
    case "em_andamento":
      return { texto: "Em andamento", cor: "azul" };
    case "aguardando_pagamento":
      return { texto: "Aguardando pagamento", cor: "laranja" };
    case "aguardando_assinatura":
      return { texto: "Aguardando assinatura", cor: "laranja" };
    case "concluido":
      return { texto: "Concluído", cor: "verde" };
    case "cancelado":
      return { texto: "Cancelado", cor: "vermelho" };
    default:
      return { texto: status, cor: "cinza" };
  }
}

/** Formata valor monetario BR */
export function formatValor(valor: number | null | undefined): string {
  if (valor == null) return "";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Texto de situacao da etapa sem "aguardando sua aprovação" (para publico) */
export function textoSituacaoPublico(situacao: SituacaoEtapa): string {
  switch (situacao) {
    case "aprovada":
      return "Aprovada";
    case "entregue":
      return "Entregue, aguardando aprovação";
    case "em_andamento":
      return "Em andamento";
    case "aguardando":
      return "Aguardando";
  }
}
