import type { AdminTabConfig, AdminTab, FilterState } from "./types";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  FileSignature,
  Landmark,
  MessageSquareText,
  Percent,
  Gift,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
} from "lucide-react";

export const TABS: AdminTabConfig[] = [
  { key: "dashboard", label: "Dashboard", icon: Sparkles, papeis: ["owner", "reviewer"] },
  { key: "usuarios", label: "Usuários", icon: Users, papeis: ["owner"] },
  { key: "contratos", label: "Contratos", icon: BriefcaseBusiness, papeis: ["owner"] },
  { key: "pagamentos", label: "Pagamentos", icon: BadgeDollarSign, papeis: ["owner"] },
  { key: "transferencias", label: "Transferências", icon: Landmark, papeis: ["owner"] },
  { key: "documentos", label: "Documentos", icon: FileSignature, papeis: ["owner"] },
  // Separada de "Documentos", que e sobre PDF de CONTRATO. Esta e identidade: RG, CNH,
  // contrato social e comprovante de endereco. Juntar as duas numa aba so misturaria
  // conferir um contrato com conferir o RG de alguem.
  { key: "verificacao", label: "Verificação", icon: ShieldCheck, papeis: ["owner", "reviewer"] },
  { key: "taxas", label: "Taxas", icon: Percent, papeis: ["owner"] },
  { key: "indicacoes", label: "Indicações", icon: Gift, papeis: ["owner"] },
  { key: "conversas", label: "Conversas", icon: MessageSquareText, papeis: ["owner"] },
  { key: "auditoria", label: "Auditoria", icon: ScrollText, papeis: ["owner"] },
  // Gestao do proprio time administrativo. So owner, porque e onde se concede e
  // revoga acesso ao painel.
  { key: "equipe", label: "Equipe", icon: UserCog, papeis: ["owner"] },
];

export const EMPTY_FILTERS: FilterState = {
  search: "",
  state: "",
  city: "",
  userType: "",
  contractStatus: "",
  paymentPreference: "",
  paymentBucket: "",
  signed: "",
  conversationKind: "",
  minValue: "",
  maxValue: "",
  dateFrom: "",
  dateTo: "",
};

export const INITIAL_PAGES: Record<AdminTab, number> = {
  dashboard: 1,
  all: 1,
  usuarios: 1,
  contratos: 1,
  pagamentos: 1,
  transferencias: 1,
  documentos: 1,
  verificacao: 1,
  taxas: 1,
  indicacoes: 1,
  conversas: 1,
  auditoria: 1,
  equipe: 1,
};

export const PAGE_SIZE_BY_TAB: Record<AdminTab, number> = {
  dashboard: 6,
  all: 6,
  usuarios: 12,
  contratos: 9,
  pagamentos: 10,
  transferencias: 8,
  documentos: 9,
  verificacao: 12,
  taxas: 10,
  indicacoes: 10,
  conversas: 10,
  auditoria: 50,
  equipe: 25,
};

export const CLIENT_PAGE_SIZE = 5;
export const CLIENT_MESSAGE_PAGE_SIZE = 12;
