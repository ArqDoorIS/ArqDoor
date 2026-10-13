// Tipos para o endpoint GET /invites/public/:token/acompanhamento
// Espelha specs/features/2026-10-convite-acompanhamento/03-contrato.md

export type PapelAcompanhamento = "publico" | "cliente" | "prestador";

export type SituacaoEtapa = "aprovada" | "entregue" | "em_andamento" | "aguardando";

export type TipoFaseAtual =
  | "assinatura"
  | "pagamento"
  | "etapa"
  | "concluido"
  | "cancelado";

export type StatusContrato =
  | "aguardando_assinatura"
  | "aguardando_pagamento"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export type EtapaAcompanhamento = {
  numero: number;
  titulo: string;
  situacao: SituacaoEtapa;
  previsto_inicio: string | null;
  previsto_fim: string | null;
  iniciada_em: string | null;
  entregue_em: string | null;
  aprovada_em: string | null;
  // so presente para cliente e prestador
  valor?: number | null;
};

export type GrupoAcompanhamento = {
  nome: string | null;
  pago: boolean;
  // so presente para cliente e prestador
  valor?: number | null;
  etapas: EtapaAcompanhamento[];
};

export type FaseAtual = {
  tipo: TipoFaseAtual;
  etapa_numero?: number | null;
  etapa_titulo?: string | null;
  situacao?: SituacaoEtapa | null;
  grupo_nome?: string | null;
  data?: string | null;
};

export type ContratoInfo = {
  titulo: string | null;
  status: StatusContrato;
  assinado_em: string | null;
  concluido_em: string | null;
  etapas_total: number;
  etapas_aprovadas: number;
  // so para cliente e prestador
  valor_total?: number | null;
  valor_pago?: number | null;
};

export type PrestadorAcompanhamento = {
  nome: string;
  profissao: string | null;
};

export type LinksAcompanhamento = {
  conversa: string;
  pdf: boolean;
};

export type DadosAcompanhamento = {
  papel: PapelAcompanhamento;
  contrato: ContratoInfo;
  prestador: PrestadorAcompanhamento;
  fase_atual: FaseAtual;
  grupos: GrupoAcompanhamento[];
  // so para cliente e prestador
  links?: LinksAcompanhamento | null;
};

export type RespostaAcompanhamento = {
  success: true;
  data: DadosAcompanhamento;
};
