/**
 * Formatos que o backend devolve em /admin/analise/* (Análise v2, 19/11/2026).
 * Contrato combinado com o backend: controllers/admin/adminAnaliseController.js.
 */

export type Temp = "quente" | "morno" | "frio";
export type Papel = "cliente" | "profissional";

/* ---------- visão geral ---------- */
export type Serie = { atual: number; anterior: number; serie: number[] };
export type Kpis = {
  pedidos: Serie;
  liquidez: { atual_pct: number | null; anterior_pct: number | null; meta_pct: number };
  contratos: Serie & { pct_dos_pedidos: number | null };
  valor: Serie & { ticket_medio: number | null };
};
export type Lead = {
  user_id: number; nome: string | null; papel: Papel; temperatura: Temp; chance: number | null; categoria: string | null;
  motivo: string | null; follow_up_acao: string | null; follow_up_quando: string | null; analisado_em: string;
};
export type Visao = {
  numeros: Record<string, number>;
  temperaturas: { analisados: number; quente: number; morno: number; frio: number; divergem_das_regras: number };
  follow_ups: { user_id: number; nome: string | null; papel: string; temperatura: Temp; chance: number; acao: string; quando: string; por_que: string; mensagem_sugerida: string }[];
  pedidos_sem_oferta: { id: number; titulo: string; user_id: number; nome: string | null; criado_em: string }[];
  convites_parados: { id: number; pedido: number; user_id: number; nome: string | null; status: string; criado_em: string }[];
  propostas_paradas: { id: number; valor: number; criado_em: string }[];
  kpis?: Kpis;
  tendencias?: { semanas: { inicio: string; pedidos: number; contratos: number }[]; tempo_ate_1a_oferta: [string, number][] };
  leads?: Lead[];
};

/* ---------- funil ---------- */
export type PassoDoFunil =
  | { grupo: string }
  | {
      id: string; nome: string; sub: string | null; n: number | null; tempo: string | null; detalhes: string[];
      motivo_saida: string | null; ramo?: boolean; divide?: boolean; fim?: boolean; fonte: "banco" | "posthog" | "eventos"; sem_dado: string | null;
    };
export type Funil = { papel: Papel; dias: number; posthog: { ligado: boolean; motivo: string | null }; passos: PassoDoFunil[]; onde_mais_perde: string[] };

/* ---------- caminhos ---------- */
export type PessoaCurta = { nome: string | null; papel: Papel; temperatura: Temp | null; chance: number | null; situacao: string };
export type Caminhos = {
  papel: Papel | "pos"; dias: number; total: number;
  etapas: string[]; alvos: string[]; rotulo_alvo: string;
  nos: Record<string, { coluna: number; nome: string; parou?: boolean }>;
  liga: [string, string, number][];
  sub: Record<string, [string, number][]>;
  voltas: Record<string, [number, string]>;
  detalhes: Record<string, { tempo?: string; obs?: string; motivos?: [string, number][]; perfil?: [string, string][] }>;
  pessoas_no: Record<string, number[]>;
  pessoas_liga: Record<string, number[]>;
  pessoas: Record<string, PessoaCurta>;
};

/* ---------- perfis ---------- */
export type Categoria = {
  id: string; n: number; chance_media_pct: number | null; fecham_pct: number | null; valor_tipico: number | null;
  tracos_comuns: [string, number][]; origens: [string, number][]; acao_mais_comum: string | null;
  pessoas: { id: number; nome: string | null; temperatura: Temp | null; chance: number | null; etapa: string | null }[];
};
export type Perfis = { papel: Papel; media_geral_fecha_pct: number | null; categorias: Categoria[] };

/* ---------- pessoas ---------- */
export type PessoaDaLista = {
  id: number; nome: string | null; papel: Papel; cidade: string | null; uf: string | null; profissao: string | null;
  criado_em: string | null; ultimo_acesso: string | null; origem: string | null; etapa: string | null;
  temperatura: Temp | null; chance: number | null; categoria: string | null; analisado_em: string | null;
};

/* ---------- ficha (investigar) ---------- */
export type Fato = { id: string; em: string | null; tipo: string; texto: string };
export type Traco = { traco: string; nivel: string; confianca: string; provas: string[] };
export type Resultado = {
  resumo: string; categoria_de_perfil: string;
  temperatura: { nivel: Temp; motivo: string; diverge_das_regras: boolean; provas: string[] };
  tracos: Traco[]; chance_de_fechar_90_dias: number;
  previsoes: { pergunta: string; probabilidade: number; prazo_dias: number }[];
  follow_up: { acao: string; quando: string; por_que: string; mensagem_sugerida: string };
  alertas: { texto: string; provas: string[] }[]; lacunas: string[]; o_que_mudaria_a_leitura: string;
  fatos_citados?: Record<string, Omit<Fato, "id">>;
};
export type Analise = {
  id: number; papel: string; temperatura: Temp; temperatura_codigo: Temp; categoria: string; chance: number | string;
  resultado: Resultado; previsoes: { pergunta: string; probabilidade: number; vence_em: string; aconteceu: boolean | null }[];
  custo_usd: number | string; fatos: number; em: string;
};
export type Dossie = {
  pessoa: { papel: string; cidade: string | null; uf: string | null }; numeros: Record<string, number | string | null>;
  fatos: Fato[]; novos_desde_a_ultima: number; temperatura_por_codigo: { nivel: Temp; motivos: string[] }; faltou: string[];
};
export type ItemDaFicha = { titulo: string; sub: string; campos: Record<string, string> };
/** Rascunho ou arquivado da conta (Investigar › Conta). `conversa_id` = a conversa com a IA do rascunho. */
export type GuardadoDaConta = ItemDaFicha & { conversa_id?: number };
export type PassoDaTrajetoria = { em: string | null; titulo: string; detalhe: string | null; tipo: "marco" | "ruim" | null } | { pausa: string };
export type Ficha = {
  papel: Papel; cidade: string | null; uf: string | null; profissao: string | null; criado_em: string | null; ultimo_acesso: string | null;
  origem: string | null; etapa: string | null; posthog_url: string;
  conta: [string, string][];
  uso_do_app: { fonte: "posthog" | "eventos" | null; sessoes: number; tempo_medio_seg: number | null; telas: [string, number][]; botoes: [string, number][]; horas: number[]; ultimo_evento: string | null } | null;
  pedidos: ItemDaFicha[]; propostas: ItemDaFicha[]; pagamentos: ItemDaFicha[];
  sinais: { sinal: string; valor: string; prova: string }[];
  conversas_ia: { id: number; tipo: string; quando: string; mensagens: number; custo_usd: number | null; sinais: number; trecho: { de: "pessoa" | "ia"; texto: string }[] }[];
  caminho: { principal: string[]; pos: string[] };
  trajetoria: PassoDaTrajetoria[];
  guardados?: { arquivados: GuardadoDaConta[]; rascunhos: GuardadoDaConta[]; aviso_rascunhos: string | null } | null;
};
export type RespostaDaFicha = {
  nome: string | null; dossie: Dossie; suficiencia: { ok: boolean; motivo: string | null }; custo_estimado_usd: number;
  analises: Analise[]; ficha?: Ficha;
};

/* ---------- precisão ---------- */
export type Nota = {
  conferidas: number; brier: number | null;
  faixas: { faixa: string; previsoes: number; disse: number | null; aconteceu: number | null }[];
  por_pergunta: Record<string, { conferidas: number; aconteceu: number; media_dita: number }>;
};

/* ---------- Kirios (algoritmo de match) ---------- */
export type FaixaKirios = { faixa: string; cartoes: number; disse_media: number | null; fechou_pct: number | null };
export type Kirios = {
  dias: number;
  versao: { nome: string; ligado: boolean; fonte_do_match: "admin" | "kirios" | "misto"; fase: "arranque" | "principal"; contratos_reais: number; minimo_para_selecao: number; transicao_em: number };
  acerto: { cartoes: number; contratos: number; auc: number | null; auc_dentro_do_pedido: number | null; intervalo: [number, number] | null; sem_dado: string | null };
  calibracao: FaixaKirios[];
  funil_por_faixa: { faixa: string; mostrados: number; perfil_aberto: number | null; conversa: number; proposta: number; contrato: number }[];
  posicao: { posicao: number; cartoes: number; contratos: number }[];
  mercado: { pedidos: number; liquidez_48h_pct: number | null; ofertas_por_pedido: number | null; pedidos_sem_oferta: number; retomadas: number | null; profissionais_ativos: number; profissionais_sem_oferta_pct: number | null; concentracao_top10_pct: number | null; sairam: number | null };
  sinais: { sinal: string; pedidos_com: number; pct: number }[];
  semanas: { inicio: string; cartoes: number; contratos: number; auc: number | null }[];
  registro: { em: string; tipo: string; dado: string; motivo: string }[];
};
