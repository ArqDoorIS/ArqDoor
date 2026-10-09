// Tipos para o percurso guiado do link de proposta.
// Espelha o contrato em specs/features/2026-09-convite-percurso/03-contrato.md

export type InviteStep = {
  title: string;
  price: number;
  start_date?: string | null;
  end_date?: string | null;
  group_id?: number | null;
  payment_group_id?: number | null;
};

export type PaymentGroup = {
  id: number;
  name: string;
  sequence: number;
};

export type InviteData = {
  id: number;
  token: string;
  title: string;
  description?: string | null;
  status: "draft" | "active" | "accepted" | "cancelled";
  steps: InviteStep[];
  contract_pdf_url?: string | null;
  has_contract_pdf?: boolean;
  // "custom" no convite = modo de pagamento personalizado por grupo
  payment_preference?: "custom";
  // escrow = protegido, standard = direto
  provider_receiving_method?: "escrow" | "standard";
  expires_at?: string | null;
  created_at?: string;
};

export type ProviderData = {
  name?: string;
  profession?: string;
  user?: { name?: string };
};

export type PagamentoDevido = {
  tipo: "grupo" | "deposito";
  group_id?: number;
  nome?: string;
  valor: number;
  etapas?: Array<{ id: number; title: string; price: number }>;
};

export type PagamentoAgora = {
  modo: "protegido" | "direto";
  assinado: boolean;
  devido: PagamentoDevido | null;
  motivo: string;
};

export type AcceptAndSignResponse = {
  success: boolean;
  ticket_id: number;
  conversation_id: number;
  provider_user_id: number;
  assinado: boolean;
  mensagem?: string;
  pagamento: PagamentoAgora;
};

// 1 = Proposta, 2 = Conta, 3 = Revisar e assinar, 4 = Pagamento, 5 = Pronto
export type FlowStep = 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Proposta",
  2: "Conta",
  3: "Assinar",
  4: "Pagamento",
};
