import type { AdminTabConfig, AdminTab, FilterState } from "./types";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  FileSignature,
  FileCheck,
  Landmark,
  Megaphone,
  MessageSquareText,
  Percent,
  Gift,
  Gavel,
  Rocket,
  Bot,
  Bug,
  Star,
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
  // Chave da API da IA do assistente de orcamentos do app. So owner: e um segredo.
  { key: "ia", label: "IA", icon: Bot, papeis: ["owner"] },
  // vendas, follow-up e perfil de cada conta (a IA analista só roda por botão)
  { key: "analise", label: "Análise", icon: ChartNoAxesCombined, papeis: ["owner"] },
  { key: "indicacoes", label: "Indicações", icon: Gift, papeis: ["owner"] },
  // Demandas que clientes postaram e ofertas que prestadores anunciaram. Daqui o owner
  // oculta (reversivel) ou apaga (definitivo) uma publicacao.
  { key: "publicacoes", label: "Publicações", icon: Megaphone, papeis: ["owner"] },
  { key: "conversas", label: "Conversas", icon: MessageSquareText, papeis: ["owner"] },
  { key: "auditoria", label: "Auditoria", icon: ScrollText, papeis: ["owner"] },
  // O número de cada profissional: regras gerais em versões e o ajuste de cada um (20/11/2026)
  { key: "impulsionamento", label: "Impulsionamento", icon: Rocket, papeis: ["owner"] },
  // Aviso, fora do algoritmo, congelar ou banir uma conta (profissional ou cliente)
  { key: "punicoes", label: "Punições", icon: Gavel, papeis: ["owner"] },
  // Espaço só dos erros: os do app e da API (sozinhos, com log e contexto para investigar e
  // reproduzir) e as conversas com a IA que deram erro
  { key: "erros", label: "Auditoria de erros", icon: Bug, papeis: ["owner"] },
  // textos do app editáveis (ex.: a página do foguete) e as estrelas que o app pede
  { key: "app", label: "Textos e avaliações", icon: Star, papeis: ["owner"] },
  // Termos de Uso versionados: editar, publicar versão nova e ver quem já aceitou (20/11/2026)
  { key: "termos", label: "Termos de uso", icon: FileCheck, papeis: ["owner"] },
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
  ia: 1,
  analise: 1,
  erros: 1,
  app: 1,
  termos: 1,
  indicacoes: 1,
  publicacoes: 1,
  conversas: 1,
  auditoria: 1,
  impulsionamento: 1,
  punicoes: 1,
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
  ia: 10,
  analise: 25,
  erros: 30,
  app: 30,
  termos: 30,
  indicacoes: 10,
  publicacoes: 20,
  conversas: 10,
  auditoria: 50,
  impulsionamento: 25,
  punicoes: 25,
  equipe: 25,
};

export const CLIENT_PAGE_SIZE = 5;
export const CLIENT_MESSAGE_PAGE_SIZE = 12;
