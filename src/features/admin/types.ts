import type { ComponentType } from "react";

export type AdminTab =
  | "dashboard"
  | "equipe"
  | "all"
  | "usuarios"
  | "contratos"
  | "pagamentos"
  | "transferencias"
  | "documentos"
  | "verificacao"
  | "taxas"
  | "indicacoes"
  | "conversas"
  | "auditoria";

export type DashboardSection =
  | "all"
  | "usuarios"
  | "contratos"
  | "pagamentos"
  | "transferencias"
  | "documentos"
  | "taxas"
  | "indicacoes"
  | "conversas"
  | "auditoria";

export type UserDetailTab =
  | "cadastro"
  | "perfil"
  | "conversas"
  | "contratos"
  | "etapas"
  | "atendimento";

export type PaymentBucket = "running" | "paid" | "failed" | "other";

export type Participant = {
  id: number;
  name: string;
  masked_email: string | null;
  /** Email completo — disponível só pra admin. */
  email?: string | null;
  /** Telefone em dígitos (10/11). Formatar com formatPhoneBr antes de exibir. */
  phone?: string | null;
  type: "prestador" | "contratante";
  is_admin: boolean;
  perfil_completo: boolean;
  is_hidden?: boolean;
  city: string | null;
  state: string | null;
  perfil: string | null;
  banner: string | null;
  deletion_eligible?: boolean;
  provider_id: number | null;
  profession: string | null;
};

export type AdminUserRow = {
  id: number;
  name: string;
  masked_email: string | null;
  /** Email completo — só exposto pra admin (LGPD interno). */
  email?: string | null;
  /** Telefone em dígitos (10 ou 11). Formatação BR aplicada na UI. */
  phone?: string | null;
  type: "prestador" | "contratante";
  perfil_completo: boolean;
  is_verified: boolean;
  is_verified_at: string | null;
  suspended?: boolean;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  is_hidden?: boolean;
  city: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  provider_id: number | null;
  profession: string | null;
  contracts_count: number;
  running_payments_count: number;
  profile_image: string | null;
  banner: string | null;
  deletion_eligible?: boolean;
};

export type ContractDocument = {
  id: number;
  pdf_path: string;
  download_url?: string | null;
  signed: boolean;
  date: string | null;
};

export type AdminTicketRow = {
  id: number;
  status: string;
  conversation_id: number;
  provider_id: number;
  created_at: string | null;
  updated_at: string | null;
  payment_preference: "per_step" | "at_end" | "custom" | null;
  payment_status: string | null;
  allow_grouped_payment: boolean;
  total_price: number;
  total_date: number;
  steps_count: number;
  signed_documents_count: number;
  has_signed_document: boolean;
  latest_signed_at: string | null;
  latest_document: ContractDocument | null;
  running_payments_count: number;
  paid_payments_count: number;
  running_payments_amount: number;
  provider: Participant | null;
  contractor: Participant | null;
  is_negotiation: boolean;
};

export type AdminPaymentRow = {
  id: number;
  step_id: number | null;
  ticket_id: number;
  status: string;
  status_bucket: PaymentBucket;
  amount: number;
  method: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  provider: Participant | null;
  contractor: Participant | null;
  ticket_status: string | null;
  payment_preference: "per_step" | "at_end" | "custom" | null;
};

export type AdminDocumentRow = {
  id: number;
  ticket_id: number;
  pdf_path: string;
  signed_pdf_path?: string | null;
  signature_hash?: string | null;
  download_url?: string | null;
  download_url_original?: string | null;
  download_url_signed?: string | null;
  signed: boolean;
  signed_at: string | null;
  created_at: string | null;
  contract_status: string | null;
  contract_value: number;
  provider: Participant | null;
  contractor: Participant | null;
};

export type AdminTransferStepRow = {
  id: number;
  title: string;
  status: string;
  price: number;
  updated_at: string | null;
  group_label: string;
  payout_reason: string;
  payout_paid_at: string | null;
};

export type AdminTransferContractRow = {
  ticket_id: number;
  conversation_id: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  total_price: number;
  payment_preference: "per_step" | "at_end" | "custom" | null;
  contractor: Participant | null;
  provider_receiving_method: "escrow" | "standard";
  provider_receiving_account_label: string | null;
  provider_bank_name: string | null;
  provider_bank_agency: string | null;
  provider_bank_account: string | null;
  provider_bank_document: string | null;
  provider_pix_key: string | null;
  ready_steps_count: number;
  ready_total: number;
  steps: AdminTransferStepRow[];
};

export type AdminTransferRow = {
  provider_id: number | null;
  provider: Participant | null;
  active_contracts_count: number;
  contracts_count: number;
  ready_steps_count: number;
  ready_total: number;
  contracts: AdminTransferContractRow[];
};

export type AdminConversationRow = {
  conversation_id: number;
  created_at: string | null;
  updated_at: string | null;
  is_negotiation: boolean;
  is_admin_thread: boolean;
  message_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  participants: Participant[];
};

export type SummaryCounters = {
  users: number;
  providers: number;
  clients: number;
  contracts: number;
  running_payments: number;
  signed_documents: number;
  conversations: number;
};

export type FilterOptions = {
  states: string[];
  cities: string[];
  user_types: string[];
  contract_statuses: string[];
  payment_buckets: string[];
  payment_preferences: string[];
  signed_filters: string[];
  conversation_kinds: string[];
};

export type TopLocation = {
  label: string;
  value: number;
};

export type SectionPagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PaymentsPagination = SectionPagination & {
  running_total: number;
  paid_total: number;
  failed_total: number;
};

export type DashboardData = {
  summary: {
    totals: SummaryCounters;
    filtered: SummaryCounters;
    monetary: {
      contracts_volume: number;
      running_payments_volume: number;
    };
    top_locations: {
      states: TopLocation[];
      cities: TopLocation[];
    };
  };
  filters: {
    applied: Record<string, string | number | null>;
    options: FilterOptions;
  };
  users: AdminUserRow[];
  tickets: AdminTicketRow[];
  documents: AdminDocumentRow[];
  conversations: AdminConversationRow[];
  transfers: AdminTransferRow[];
  payments: {
    items: AdminPaymentRow[];
    pending: AdminPaymentRow[];
    paid: AdminPaymentRow[];
    failed: AdminPaymentRow[];
  };
  highlights: {
    recent_users: AdminUserRow[];
    recent_contracts: AdminTicketRow[];
    recent_payments: AdminPaymentRow[];
    recent_documents: AdminDocumentRow[];
    support_threads: AdminConversationRow[];
  };
  meta: {
    section: DashboardSection;
    page: number;
    page_size: number;
    generated_at: string;
    pagination: {
      users: SectionPagination;
      tickets: SectionPagination;
      transfers: SectionPagination;
      documents: SectionPagination;
      conversations: SectionPagination;
      payments: PaymentsPagination;
    };
    partial_failures: Array<{
      section: string;
      message: string;
    }>;
  };
};

export type AdminMessageRow = {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  createdAt: string;
  read?: boolean;
};

export type AdminDirectConversation = {
  conversation_id: number;
  messages: AdminMessageRow[];
  admin_id: number | null;
};

export type AdminOperationalPayment = {
  id: number;
  status: string;
  amount: number;
  method: string | null;
  due_date: string | null;
  paid_at: string | null;
  asaas_invoice_url: string | null;
  checkout_url: string | null;
};

export type AdminOperationalStep = {
  id: number;
  title: string;
  status: string;
  price: number;
  signature: boolean;
  confirm_freelancer: boolean;
  confirm_contractor: boolean;
  is_financially_cleared: boolean;
  payout_ready: boolean;
  payout_reason: string;
  payment_status_bucket: PaymentBucket;
  group_id: number | null;
  group_sequence: number | null;
  group_key: string;
  group_label: string;
  group_order: number;
  created_at: string | null;
  updated_at: string | null;
  start_date: string | null;
  end_date: string | null;
  started_at: string | null;
  latest_payment: AdminOperationalPayment | null;
};

export type AdminOperationalGroup = {
  key: string;
  label: string;
  order: number;
  steps_count: number;
  financially_cleared_steps_count: number;
  concluded_steps_count: number;
  payout_ready_steps_count: number;
  total_amount: number;
  ready_payout_total: number;
};

export type AdminOperationalTicket = {
  id: number;
  status: string;
  conversation_id: number;
  created_at: string | null;
  updated_at: string | null;
  total_price: number;
  total_date: number;
  payment_preference: "per_step" | "at_end" | "custom" | null;
  payment_status: string | null;
  allow_grouped_payment: boolean;
  provider_receiving_method: "escrow" | "standard";
  provider_receiving_account_label: string | null;
  provider: Participant | null;
  contractor: Participant | null;
  running_payments_count: number;
  paid_payments_count: number;
  failed_payments_count: number;
  financially_cleared_steps_count: number;
  concluded_steps_count: number;
  ready_payout_steps_count: number;
  ready_payout_total: number;
  latest_document: ContractDocument | null;
  groups: AdminOperationalGroup[];
  steps: AdminOperationalStep[];
};

export type AdminOperationalConversation = {
  conversation_id: number;
  created_at: string | null;
  updated_at: string | null;
  is_negotiation: boolean;
  is_admin_thread: boolean;
  message_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  participants: Participant[];
  active_contracts_count: number;
  ready_payout_steps_count: number;
  ready_payout_total: number;
  contracts: AdminOperationalTicket[];
};

export type AdminUserOperationsOverview = {
  user: Participant;
  summary: {
    conversations_count: number;
    contracts_count: number;
    active_contracts_count: number;
    running_payments_count: number;
    paid_payments_count: number;
    financially_cleared_steps_count: number;
    concluded_steps_count: number;
    ready_payout_steps_count: number;
    ready_payout_total: number;
  };
  conversations: AdminOperationalConversation[];
  generated_at: string;
};

export type AdminUserProfile = {
  account: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    birth: string | null;
    gender: "Masculino" | "Feminino" | "Prefiro não dizer";
    cpf: string | null;
    cnpj: string | null;
    type: "prestador" | "contratante";
    auth_provider: "local" | "google" | string;
    password_configured: boolean;
    perfil_completo: boolean;
    is_active: boolean;
    is_hidden: boolean;
    is_email_verified: boolean;
    is_verified: boolean;
    suspended: boolean;
    created_at: string | null;
    updated_at: string | null;
  };
  provider: {
    provider_id: number;
    profession: string;
    about: string | null;
    payment_preference: "per_step" | "at_end" | "custom";
  } | null;
  location: {
    cep: string | null;
    state: string | null;
    city: string | null;
    neighborhood: string | null;
    street: string | null;
    number: string | null;
    typeLocation: "Residencial" | "Comercial";
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export type AdminUserProfileUpdate = {
  account?: {
    name?: string;
    email?: string;
    phone?: string | null;
    birth?: string;
    gender?: "Masculino" | "Feminino" | "Prefiro não dizer";
    cpf?: string | null;
    cnpj?: string | null;
    perfil_completo?: boolean;
    is_active?: boolean;
    is_hidden?: boolean;
    is_email_verified?: boolean;
    password?: string;
  };
  provider?: {
    profession?: string;
    about?: string | null;
    payment_preference?: "per_step" | "at_end" | "custom";
  };
  location?: {
    cep?: string | null;
    state?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    street?: string | null;
    number?: string | null;
    typeLocation?: "Residencial" | "Comercial";
    latitude?: number | null;
    longitude?: number | null;
  };
};

export type ConversationViewer = {
  conversation: {
    conversation_id: number;
    created_at: string | null;
    updated_at: string | null;
    is_negotiation: boolean;
    is_admin_thread: boolean;
    participants: Participant[];
  };
  messages: AdminMessageRow[];
};

export type FilterState = {
  search: string;
  state: string;
  city: string;
  userType: string;
  contractStatus: string;
  paymentPreference: string;
  paymentBucket: string;
  signed: string;
  conversationKind: string;
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
};

export type ClientPagination<T> = {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
};

export type AdminRole = "owner" | "reviewer";

export type AdminTabConfig = {
  key: AdminTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  // Quais papeis enxergam a aba. Sem isso, um reviewer veria abas que sempre respondem
  // 403, e a tela pareceria quebrada em vez de restrita (ADR-001).
  papeis: AdminRole[];
};
