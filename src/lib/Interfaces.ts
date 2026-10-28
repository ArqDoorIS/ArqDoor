export interface LogFunc {
  (message?: any, ...optionalParams: any[]): void
}
export interface LoginInterface {
  email: string;
  password: string;
}
export interface GoogleLoginPayload {
  idToken?: string;
  accessToken?: string;
  type?: "contratante" | "prestador";
  mode?: "login" | "register";
}
export interface GoogleLoginResult {
  status: "logged_in" | "logged_in_needs_onboarding" | "already_connected" | "failed" | "registered";
}
export interface RegisterInterface {
  name: string;
  email: string;
  gender: string;
  birth: string;
  type: "contratante" | "prestador";
  password: string;
  confirmPassword: string;
  termos_aceitos: boolean;
}
export interface User {
  id: number;
  name: string;
  email: string;
  about: string;
  cpf?: string;
  cnpj?: string;
  birth: string;
  gender: string;
  provider_id?: number;
  payload: string;
  type: "contratante" | "prestador";
  termos_aceitos: boolean;
  perfil_completo?: boolean;
  /**
   * NAO significa "definiu uma senha de assinatura".
   * O backend liga esta flag em QUALQUER login quando ela esta nula, entao na pratica ela
   * quer dizer "tem senha de login". Use `signature_password_configured` para saber se
   * existe senha SO de assinatura.
   */
  signature_password_set?: boolean | null;
  /**
   * Tem senha cadastrada so para assinar, separada da de login?
   * Importa para conta Google, que nao tem senha de login utilizavel: sem esta, o unico
   * caminho e assinar pela propria conta Google.
   */
  signature_password_configured?: boolean | null;
  perfil?: string;
  banner?: string | null;
  avatar?: string | null;
  /** Disponivel para trabalho (gravado no banco). */
  is_active?: boolean;
}
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isInitialized: boolean;
  login: (data: LoginInterface) => Promise<boolean>;
  loginWithGoogle: (payload: GoogleLoginPayload) => Promise<GoogleLoginResult | undefined>;
  register: (data: RegisterInterface) => Promise<boolean>;
  logout: () => Promise<void>;
  needsOnboarding: boolean;
  setNeedsOnboarding: (value: boolean) => void;
  onboardingOptional: boolean;
  setOnboardingOptional: (value: boolean) => void;
  updateUserLocal: (data: Partial<User>) => void;
}
export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  isNegotiation: boolean;
  created_at: string;
  updated_at: string;
  otherUser: {
    id: number;
    name: string;
    email: string;
    type: "prestador" | "contratante";
    provider_id?: number | null;
    perfil?: string | null;
    avatar?: string | null;
    banner?: string | null;
    is_hidden?: boolean;
    is_active?: boolean;
    /** Presenca atual: true se o usuario tem conexao aberta agora. Vem de GET /conversation. */
    online?: boolean;
  };
  lastMessage?: {
    id: number;
    content: string;
    created_at: string;
    sender_id: number;
    type?: string;
  };
  unreadCount: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  tempId?: string;
  type?: 'text' | 'proposal'; // Novo campo para tipo de mensagem
  proposal_data?: {
    ticket_id: number;
    steps: Array<{
      id: number;
      title: string;
      price: number;
      status?: string;
    }>;
    total: number;
  };
}

export interface CreateConversationRequest {
  user1_id: number;
  user2_id: number;
}

export interface CreateMessageRequest {
  conversation_id: number;
  content: string;
  type?: 'text' | 'proposal';
  proposal_data?: any;
}

export interface CreateTicketRequest {
  conversation_id: number;
  payment_preference?: "per_step" | "at_end" | "custom";
  provider_receiving_method?: "escrow" | "standard";
  provider_receiving_account_id?: number | null;
  provider_receiving_account_label?: string | null;
  provider_bank_name?: string | null;
  provider_bank_agency?: string | null;
  provider_bank_account?: string | null;
  provider_bank_document?: string | null;
  provider_pix_key?: string | null;
  allow_grouped_payment?: boolean;
  allowGroupedPayment?: boolean;
  grouped_payment?: boolean;
  grouped_payment_enabled?: boolean;
  payment?: boolean;
  provider_id?: number;
}

export interface CreateStepRequest {
  ticket_id: number;
  title: string;
  price: number;
}

export interface UpdateStepRequest {
  title?: string;
  price?: number;
  status?: string;
  provider_completed?: boolean;
  client_confirmed?: boolean;
}

export interface SignDocumentRequest {
  ticket_id: number;
  password: string;
  user_id: number;
}

export type StepStatus = string;

export interface Step {
  id: number;
  ticket_id: number;
  title: string;
  price: number;
  status?: StepStatus;
  sequence?: number;
  started_at?: string | null;
  completed_at?: string | null;
  provider_completed?: boolean;
  client_confirmed?: boolean;
  confirm_freelancer?: boolean;
  confirmFreelancer?: boolean;
  confirm_contractor?: boolean;
  confirmContractor?: boolean;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  group_id?: number;
  group_sequence?: number;
  payment_group_id?: number;
  payment_group?: {
    id: number;
    name: string;
  };
  paymentGroup?: {
    id: number;
    name: string;
  };
}

export interface TicketService {
  id: number;
  conversation_id: number;
  provider_id: number;
  status: string;
  payment_preference?: "per_step" | "at_end" | "custom";
  provider_receiving_method?: "escrow" | "standard";
  provider_receiving_account_id?: number | null;
  provider_receiving_account_label?: string | null;
  provider_bank_name?: string | null;
  provider_bank_agency?: string | null;
  provider_bank_account?: string | null;
  provider_bank_document?: string | null;
  provider_pix_key?: string | null;
  allow_grouped_payment?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  conversation_id: number;
  provider_id?: number;
  status?: string;
  payment_preference?: "per_step" | "at_end" | "custom";
  paymentPreference?: "per_step" | "at_end" | "custom";
  /**
   * Quando o pagamento acontece, e nao como ele e fatiado.
   *
   * escrow: o cliente paga ANTES e o valor fica retido ate a conclusao.
   * standard: o cliente paga DEPOIS da entrega.
   *
   * Campo diferente de `payment_preference`, e confundir os dois trava o contrato: a
   * guarda de "so inicia depois de pago" lia a preferencia, que vale "custom" em toda
   * proposta, e assim bloqueava tambem o standard, onde pagar depende de concluir.
   */
  provider_receiving_method?: "escrow" | "standard";
  providerReceivingMethod?: "escrow" | "standard";
  provider_receiving_account_id?: number | null;
  provider_receiving_account_label?: string | null;
  provider_bank_name?: string | null;
  provider_bank_agency?: string | null;
  provider_bank_account?: string | null;
  provider_bank_document?: string | null;
  provider_pix_key?: string | null;
  allow_grouped_payment?: boolean;
  grouped_payment?: boolean;
  grouped_payment_enabled?: boolean;
  payment?: boolean;
  has_linked_payments?: boolean;
  contract_pdf_url?: string | null;
  signed_at?: string | null;
  signed_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Demand {
  id_demand: number;
  id_user: number;
  title: string;
  description: string;
  price: number;
  status: string;
  created_at: string;
  createdAt?: string;
  updated_at?: string;
  User?: Partial<User> & {
    perfil?: string | null;
  };
}

export interface EnrichedDemand extends Demand {
  userName: string;
  userEmail: string;
  userPerfil?: string | null;
  createdAt: string;
}

export interface ClientConnection {
  id: number;
  provider_user_id: number;
  client_user_id: number;
  requested_by_user_id: number;
  demand_id?: number | null;
  status: "pending" | "accepted" | "rejected";
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
  can_message?: boolean;
  provider_profile_id?: number | null;
  counterpart?: {
    id: number;
    name: string;
    email?: string | null;
    type: "prestador" | "contratante";
    perfil?: string | null;
  } | null;
}

export interface ProviderDashboardData {
  summary: {
    clients_contacted: number;
    open_contracts: number;
    finished_contracts: number;
    completed_payments: number;
    completed_payments_volume: number;
  };
  recent_clients: Array<{
    id: number;
    name: string;
    perfil?: string | null;
    last_interaction_at: string;
    conversation_id: number;
  }>;
  recent_contracts: Array<{
    id: number;
    status: string;
    total_price: number;
    created_at: string;
    updated_at: string;
    conversation_id: number;
  }>;
  recent_payments: Array<{
    id: number;
    amount: number;
    method: string;
    paid_at?: string | null;
    ticket_id: number;
    status: string;
  }>;
  filters: {
    date_from?: string;
    date_to?: string;
  };
  meta?: {
    generated_at: string;
  };
}

export interface ServiceProvider {
  provider_id: number;
  user_id: number;
  profession: string;
  views_profile?: number;
  about?: string | null;
}

export interface ServiceFreelancer {
  id_serviceFreelancer: number;
  id_provider: number;
  title: string;
  description: string;
  price: string;
  createdAt: string;
  updatedAt?: string;
  ServiceProvider: ServiceProvider;
}

export interface ServicesResponse {
  code?: number;
  message?: string;
  servicesFreelancer: ServiceFreelancer[];
  success?: boolean;
}

export interface EnrichedService extends ServiceFreelancer {
  userName: string;
  userEmail: string;
  userType: string;
  userPerfil?: string | null;
}

// Pagamento Avulso (Additional Payment)
export interface AdditionalPayment {
  id: number;
  ticket_id: number;
  provider_id: number;
  contractor_id: number;
  payment_id?: number | null;
  title: string;
  description: string;
  amount: number;
  status: "PENDING" | "ACCEPTED" | "REFUSED" | "PAID" | "CANCELLED";
  refusal_reason?: string | null;
  created_at: string;
  updated_at: string;
  payment?: {
    id: number;
    status: string;
    method?: string | null;
    amount?: number | string | null;
    asaas_payment_id?: string | null;
    asaas_invoice_url?: string | null;
    checkout_url?: string | null;
    pix_payload?: string | null;
    pix_image?: string | null;
    pix_expires_at?: string | null;
    boleto_url?: string | null;
    boleto_barcode?: string | null;
    due_date?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
}

export interface CreateAdditionalPaymentRequest {
  ticket_id: number;
  title: string;
  description: string;
  amount: number;
}

export interface RespondAdditionalPaymentRequest {
  action: "accept" | "refuse";
  method?: "PIX" | "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD";
  reason?: string;
}
