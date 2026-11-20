import { apiRequest } from "@/lib/queryClient";
import { ler } from "../analise/comum";

/**
 * Tudo o que a aba Notificações fala com o servidor fica aqui (20/11/2026), para ajustar
 * num lugar só quando o backend mudar. Rotas só do owner; escritas levam o CSRF pelo apiRequest.
 *
 *   GET    /admin/notificacoes                       eventos automáticos, modelos de e-mail e grupos
 *   PUT    /admin/notificacoes/regras/:tipo          regra de um evento
 *   DELETE /admin/notificacoes/regras/:tipo          volta ao padrão
 *   POST   /admin/notificacoes/previa                { modelo, email_campos, titulo, texto, href, vars? } -> { html, push: { titulo, texto } }
 *   POST   /admin/notificacoes/teste                 { user_id, tipo } ou { user_id, titulo, texto, href, canais, email_modelo }
 *   GET    /admin/notificacoes/publico?tipo=&cidade=&user_ids=   { total }
 *   GET    /admin/notificacoes/envios?pagina=        histórico dos comunicados
 *   POST   /admin/notificacoes/envios                cria (ou agenda) um comunicado
 *   POST   /admin/notificacoes/envios/:id/cancelar   cancela um agendado
 *   GET    /admin/notificacoes/modelos                  os modelos de e-mail (só leitura)
 *
 * Os modelos de e-mail são arquivos no backend (src/services/notifications/modelos-de-email/): um .mjml ou
 * .html e um .json com os campos. O painel só lê: lista, mostra os campos e a prévia, e monta o formulário
 * do e-mail a partir dos `campos`.
 * Os valores vão em `email_campos`; campo que falta usa o padrão do modelo.
 *
 * O servidor pode mandar campos a menos: `normalizarPainel` e `normalizarEnvio` preenchem o que faltar.
 */

/* ---------- tipos ---------- */
export type Canais = { sino: boolean; push: boolean; email: boolean };
/** `obrigatoria`: precisa aparecer no que sai (ex.: o link de redefinir a senha ou um código). */
export type Variavel = { chave: string; descricao: string; exemplo: string; obrigatoria?: boolean };
export type Regra = Canais & {
  ativo: boolean;
  /** null = texto original do evento */
  titulo: string | null;
  texto: string | null;
  email_modelo: string | null;
  /** Valores dos campos do modelo escolhido (o assunto é o campo "assunto"). Chave que falta = padrão do modelo. */
  email_campos: ValoresDosCampos;
  /** Anexos ligados no e-mail deste evento (dentre `anexos_possiveis`). */
  anexos: string[];
};
export type Padrao = Canais & {
  email_modelo: string | null;
  /** Ainda não está no contrato; usados como placeholder se o servidor mandar. */
  titulo?: string | null;
  texto?: string | null;
};
export type Evento = {
  tipo: string; grupo: string; rotulo: string; quando: string; para: string;
  variaveis: Variavel[]; padrao: Padrao; regra: Regra; personalizado: boolean; href?: string | null;
  /** Texto original do evento (o que sai quando o título/texto da regra está vazio). */
  original: { titulo: string | null; texto: string | null };
  anexos_possiveis: string[];
  /** Canais que não podem ser desligados (ex.: o e-mail de redefinir a senha). */
  canais_travados: (keyof Canais)[];
  /** false = o painel só mostra; texto e canais ficam como estão no código. */
  editavel: boolean;
  /** E-mail de acesso à conta (senha, código): sino e push ficam desligados. */
  seguranca: boolean;
};
export type TipoDeCampo = "texto" | "texto_longo" | "url" | "cor" | "imagem_url" | "booleano" | "opcoes";
export type OpcaoDoCampo = { valor: string; rotulo: string };
export type CampoDoModelo = {
  chave: string; rotulo: string; tipo: TipoDeCampo | string; opcoes: OpcaoDoCampo[];
  obrigatorio: boolean; padrao: string | boolean | null; ajuda: string; aceita_variaveis: boolean;
};
export type ValorDoCampo = string | boolean;
export type ValoresDosCampos = Record<string, ValorDoCampo>;
export type Modelo = {
  chave: string; rotulo: string; descricao: string; campos: CampoDoModelo[];
  formato?: "mjml" | "html" | null; arquivo?: string | null;
  /** {{x}} do arquivo que não são campos: o evento precisa trazer (ex.: {{link_redefinicao}}). */
  variaveis_do_molde?: string[];
  /** "erro" = o arquivo do modelo não carregou; `erro` diz por quê. */
  status?: "ok" | "erro"; erro?: string | null;
};
export type Painel = { eventos: Evento[]; modelos: Modelo[]; grupos: string[] };

export type TipoDePublico = "pessoa" | "profissionais" | "clientes" | "cidade" | "todos";
export type Publico = { tipo: TipoDePublico; user_ids?: number[]; cidade?: string };
export type StatusDoEnvio = "agendado" | "enviando" | "enviado" | "cancelado" | "falhou" | string;
export type Envio = {
  id: number; titulo: string; texto: string; href: string | null; canais: Canais; email_modelo: string | null;
  publico: Publico | string | null; agendado_para: string | null; status: StatusDoEnvio;
  total: number | null; push_ok: number | null; email_ok: number | null; falhas: number | null;
  criado_por: string | null; created_at: string | null; sino_ok: number | null;
};
export type PaginaDeEnvios = { envios: Envio[]; total: number; por_pagina: number };

export type PedidoDePrevia = { modelo: string | null; tipo?: string; email_campos: ValoresDosCampos; titulo: string; texto: string; href: string | null; vars?: Record<string, string> };
/** html null = o modelo não manda e-mail (ex.: "nenhum"). */
export type Previa = { html: string | null; texto: string | null; assunto: string | null; push: { titulo: string; texto: string } };
export type PedidoDeTeste =
  | { user_id: number; tipo: string }
  | { user_id: number; titulo: string; texto: string; href: string | null; canais: Canais; email_modelo: string | null; email_campos: ValoresDosCampos };
/**
 * `titulo`/`texto` são os da notificação (sino e push). O e-mail usa os campos do modelo em
 * `email_campos` (assunto, título, texto...; campo que não veio = padrão do modelo, que costuma ser o da notificação).
 */
export type NovoEnvio = {
  titulo: string; texto: string; href: string | null; canais: Canais;
  email_modelo: string | null; email_campos: ValoresDosCampos;
  publico: Publico; agendado_para: string | null;
};

/* ---------- rotas ---------- */
export const CAMINHO_PAINEL = "/admin/notificacoes";
export const POR_PAGINA_ENVIOS = 20;
const deRegra = (tipo: string) => `/admin/notificacoes/regras/${encodeURIComponent(tipo)}`;
export const caminhoDosEnvios = (pagina: number) => `/admin/notificacoes/envios?pagina=${pagina}`;
/** null quando o público ainda está incompleto (sem pessoa ou sem cidade). */
export function caminhoDoPublico(p: Publico): string | null {
  const q = new URLSearchParams({ tipo: p.tipo });
  if (p.tipo === "pessoa") {
    if (!p.user_ids?.length) return null;
    q.set("user_ids", p.user_ids.join(","));
  }
  if (p.tipo === "cidade") {
    if (!p.cidade?.trim()) return null;
    q.set("cidade", p.cidade.trim());
  }
  return `/admin/notificacoes/publico?${q.toString()}`;
}

/* ---------- chamadas ---------- */
export const salvarRegra = (tipo: string, regra: Regra) =>
  apiRequest("PUT", deRegra(tipo), {
    ativo: regra.ativo, sino: regra.sino, push: regra.push, email: regra.email,
    titulo: regra.titulo, texto: regra.texto, email_modelo: regra.email_modelo, email_campos: regra.email_campos,
    anexos: regra.anexos,
  }).then(ler);
export const voltarAoPadrao = (tipo: string) => apiRequest("DELETE", deRegra(tipo)).then(ler);
export const pedirPrevia = async (p: PedidoDePrevia): Promise<Previa> => {
  const b = desembrulhar(await apiRequest("POST", "/admin/notificacoes/previa", p).then(ler));
  return {
    html: typeof b?.html === "string" && b.html.trim() ? b.html : null,
    texto: [b?.texto_puro, b?.texto_simples, b?.texto].find((t) => typeof t === "string" && t.trim()) ?? null,
    assunto: textoOuNulo(b?.assunto),
    push: { titulo: b?.push?.titulo ?? p.titulo, texto: b?.push?.texto ?? p.texto } };
};
export const enviarTeste = (p: PedidoDeTeste) => apiRequest("POST", "/admin/notificacoes/teste", p).then(ler);
export const criarEnvio = (p: NovoEnvio) => apiRequest("POST", "/admin/notificacoes/envios", p).then(ler);
export const cancelarEnvio = (id: number) => apiRequest("POST", `/admin/notificacoes/envios/${id}/cancelar`).then(ler);

/* ---------- modelos de e-mail ---------- */
export const CAMINHO_MODELOS = "/admin/notificacoes/modelos";

export function normalizarModelos(bruto: any): Modelo[] {
  const b = desembrulhar(bruto);
  const lista = Array.isArray(b) ? b : Array.isArray(b?.modelos) ? b.modelos : [];
  return lista.map(normalizarModelo).filter(Boolean) as Modelo[];
}

/** Modelos que dá para escolher num evento ou comunicado: sem o "nenhum" e sem os que deram erro. */
export const modelosParaEscolher = (modelos: Modelo[]) => modelos.filter((m) => m.chave !== "nenhum" && m.status !== "erro");

/** {{x}} que o arquivo do modelo pede e que este envio não tem (além das embutidas: nome, titulo, texto, link). */
export const faltaNoMolde = (m: Modelo, permitidas: string[]) =>
  (m.variaveis_do_molde ?? []).filter((k) => !VARIAVEIS_DO_EMAIL.includes(k) && !permitidas.includes(k));

/** Os modelos de um envio, cada um com o motivo de não poder ser usado aqui (null = pode). */
export const modelosComMotivo = (modelos: Modelo[], permitidas: string[]) => modelosParaEscolher(modelos).map((m) => {
  const falta = faltaNoMolde(m, permitidas);
  return { modelo: m, motivo: falta.length ? `precisa de ${falta.map((k) => `{{${k}}}`).join(", ")}, que este envio não tem` : null };
});
/** Os que dá para usar neste envio. */
export const modelosCompativeis = (modelos: Modelo[], permitidas: string[]) => modelosComMotivo(modelos, permitidas).filter((x) => !x.motivo).map((x) => x.modelo);

export const NOMES_DOS_ANEXOS: Record<string, string> = {
  ics_visita: "Convite de calendário (.ics)",
  pdf_contrato: "PDF do contrato",
  pdf_proposta: "PDF da proposta",
};
export const nomeDoAnexo = (k: string) => NOMES_DOS_ANEXOS[k] ?? k.replace(/_/g, " ");

/* ---------- normalização (o servidor pode mandar menos) ---------- */
/** Aceita a resposta direto ou dentro de `data`. */
function desembrulhar(b: any) {
  return b && typeof b === "object" && b.data && typeof b.data === "object" && !Array.isArray(b.data) ? { ...b.data, ...b } : b;
}
const listaDeTextos = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const bool = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);
const textoOuNulo = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const numOuNulo = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function regraDoPadrao(padrao: Padrao): Regra {
  return { ativo: true, sino: padrao.sino, push: padrao.push, email: padrao.email, titulo: null, texto: null, email_modelo: padrao.email_modelo, email_campos: {}, anexos: [] };
}

function normalizarValores(v: unknown): ValoresDosCampos {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const fora: ValoresDosCampos = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (typeof x === "boolean" || typeof x === "string") fora[k] = x;
    else if (typeof x === "number") fora[k] = String(x);
  }
  return fora;
}

function normalizarCampo(c: any): CampoDoModelo | null {
  if (!c || typeof c.chave !== "string") return null;
  const opcoes: OpcaoDoCampo[] = (Array.isArray(c.opcoes) ? c.opcoes : [])
    .map((o: any) => (typeof o === "string" ? { valor: o, rotulo: o } : o && o.valor != null ? { valor: String(o.valor), rotulo: String(o.rotulo ?? o.valor) } : null))
    .filter(Boolean);
  const tipo = typeof c.tipo === "string" ? c.tipo : "texto";
  const padrao = typeof c.padrao === "boolean" ? c.padrao : c.padrao == null || c.padrao === "" ? null : String(c.padrao);
  return {
    chave: c.chave, rotulo: textoOuNulo(c.rotulo) ?? c.chave, tipo, opcoes,
    obrigatorio: c.obrigatorio === true, padrao, ajuda: typeof c.ajuda === "string" ? c.ajuda : "", aceita_variaveis: c.aceita_variaveis === true,
  };
}

function normalizarEvento(e: any): Evento | null {
  if (!e || typeof e.tipo !== "string") return null;
  const p = e.padrao ?? {};
  const padrao: Padrao = {
    sino: bool(p.sino, true), push: bool(p.push, false), email: bool(p.email, false),
    email_modelo: textoOuNulo(p.email_modelo), titulo: textoOuNulo(p.titulo), texto: textoOuNulo(p.texto),
  };
  const r = e.regra ?? {};
  const base = regraDoPadrao(padrao);
  const regra: Regra = {
    ativo: bool(r.ativo, base.ativo), sino: bool(r.sino, base.sino), push: bool(r.push, base.push), email: bool(r.email, base.email),
    titulo: textoOuNulo(r.titulo), texto: textoOuNulo(r.texto),
    email_modelo: textoOuNulo(r.email_modelo) ?? base.email_modelo,
    email_campos: normalizarValores(r.email_campos),
    anexos: listaDeTextos(r.anexos),
  };
  const o = e.original ?? {};
  return {
    tipo: e.tipo,
    grupo: textoOuNulo(e.grupo) ?? "Outros",
    rotulo: textoOuNulo(e.rotulo) ?? e.tipo.replace(/_/g, " "),
    quando: textoOuNulo(e.quando) ?? "",
    para: textoOuNulo(e.para) ?? "",
    variaveis: Array.isArray(e.variaveis)
      ? e.variaveis.filter((v: any) => v && typeof v.chave === "string").map((v: any) => ({ chave: v.chave, descricao: v.descricao ?? "", exemplo: v.exemplo == null ? "" : String(v.exemplo), obrigatoria: v.obrigatoria === true }))
      : [],
    padrao, regra,
    personalizado: bool(e.personalizado, false),
    href: textoOuNulo(e.href),
    original: { titulo: textoOuNulo(o.titulo) ?? padrao.titulo ?? null, texto: textoOuNulo(o.texto) ?? padrao.texto ?? null },
    anexos_possiveis: listaDeTextos(e.anexos_possiveis),
    canais_travados: Array.from(new Set([
      ...listaDeTextos(e.canais_travados ?? e.canais_obrigatorios),
      ...(e.email_obrigatorio === true ? ["email"] : []),
    ])).filter((c): c is keyof Canais => c === "sino" || c === "push" || c === "email"),
    editavel: bool(e.editavel, true),
    seguranca: e.seguranca === true,
  };
}

function normalizarModelo(m: any): Modelo | null {
  if (!m || typeof m.chave !== "string") return null;
  return {
    chave: m.chave, rotulo: m.rotulo || m.chave, descricao: m.descricao ?? "",
    campos: (Array.isArray(m.campos) ? m.campos : []).map(normalizarCampo).filter(Boolean) as CampoDoModelo[],
    formato: m.formato === "mjml" || m.formato === "html" ? m.formato : null,
    variaveis_do_molde: listaDeTextos(m.variaveis_do_molde),
    arquivo: textoOuNulo(m.arquivo),
    status: m.status === "erro" ? "erro" : "ok",
    erro: textoOuNulo(m.erro),
  };
}

export function normalizarPainel(bruto: any): Painel {
  const b = desembrulhar(bruto);
  const eventos = (Array.isArray(b?.eventos) ? b.eventos : []).map(normalizarEvento).filter(Boolean) as Evento[];
  const modelos = normalizarModelos(b?.modelos ?? []);
  // Grupos na ordem do servidor e, depois, os que só aparecem nos eventos.
  const grupos: string[] = Array.isArray(b?.grupos) ? b.grupos.filter((g: unknown) => typeof g === "string") : [];
  for (const e of eventos) if (!grupos.includes(e.grupo)) grupos.push(e.grupo);
  return { eventos, modelos, grupos };
}

export function normalizarEnvio(e: any): Envio {
  const c = e?.canais ?? {};
  return {
    id: Number(e?.id), titulo: e?.titulo ?? "", texto: e?.texto ?? "", href: textoOuNulo(e?.href),
    canais: { sino: bool(c.sino, false), push: bool(c.push, false), email: bool(c.email, false) },
    email_modelo: textoOuNulo(e?.email_modelo), publico: e?.publico ?? null, agendado_para: textoOuNulo(e?.agendado_para),
    status: e?.status ?? "", total: numOuNulo(e?.total), push_ok: numOuNulo(e?.push_ok), email_ok: numOuNulo(e?.email_ok),
    falhas: numOuNulo(e?.falhas), criado_por: textoOuNulo(e?.criado_por), created_at: textoOuNulo(e?.created_at ?? e?.createdAt),
    sino_ok: numOuNulo(e?.sino_ok),
  };
}

export function normalizarEnvios(bruto: any): PaginaDeEnvios {
  const b = desembrulhar(bruto);
  const envios = (Array.isArray(b?.envios) ? b.envios : []).map(normalizarEnvio);
  return { envios, total: numOuNulo(b?.total) ?? envios.length, por_pagina: numOuNulo(b?.por_pagina) ?? POR_PAGINA_ENVIOS };
}

/* ---------- textos ---------- */
/** Troca {chave} pelo exemplo de cada variável. Chave desconhecida fica como está. */
export function comExemplos(texto: string, variaveis: Variavel[]) {
  const mapa = Object.fromEntries(variaveis.map((v) => [v.chave, v.exemplo]));
  return texto.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (todo, k) => (k in mapa && mapa[k] !== "" ? mapa[k] : todo));
}

export const ROTAS_DO_APP: { valor: string; rotulo: string }[] = [
  { valor: "", rotulo: "Nenhuma (só avisa)" },
  { valor: "/", rotulo: "Início" },
  { valor: "/impulsionamento", rotulo: "Impulsionamento" },
  { valor: "/termos", rotulo: "Termos de uso" },
  { valor: "/pedidos", rotulo: "Pedidos" },
  { valor: "/projects", rotulo: "Projetos" },
  { valor: "/financeiro", rotulo: "Carteira" },
];

export const PUBLICOS: { tipo: TipoDePublico; rotulo: string }[] = [
  { tipo: "pessoa", rotulo: "Uma pessoa" },
  { tipo: "profissionais", rotulo: "Todos os profissionais" },
  { tipo: "clientes", rotulo: "Todos os clientes" },
  { tipo: "cidade", rotulo: "Uma cidade" },
  { tipo: "todos", rotulo: "Todo mundo" },
];

export function descreverPublico(p: Envio["publico"]): string {
  if (!p) return "—";
  if (typeof p === "string") return PUBLICOS.find((x) => x.tipo === p)?.rotulo ?? p;
  if (p.tipo === "cidade") return p.cidade ? `Cidade: ${p.cidade}` : "Uma cidade";
  if (p.tipo === "pessoa") {
    const ids = p.user_ids ?? [];
    return ids.length === 1 ? `Conta #${ids[0]}` : ids.length ? `${ids.length} contas` : "Uma pessoa";
  }
  return PUBLICOS.find((x) => x.tipo === p.tipo)?.rotulo ?? String(p.tipo ?? "—");
}

export const STATUS: Record<string, { rotulo: string; tom: "amber" | "emerald" | "slate" | "rose" | "sky" }> = {
  agendado: { rotulo: "Agendado", tom: "amber" },
  enviando: { rotulo: "Enviando", tom: "sky" },
  enviado: { rotulo: "Enviado", tom: "emerald" },
  cancelado: { rotulo: "Cancelado", tom: "slate" },
  falhou: { rotulo: "Falhou", tom: "rose" },
};

/** Quantas contas o público alcança. null se o servidor não disser. */
export const contarPublico = async (caminho: string) => numOuNulo(desembrulhar(await apiRequest("GET", caminho).then(ler))?.total);

/* ---------- campos dos modelos ---------- */
export const NOME_DO_TIPO: Record<string, string> = {
  texto: "Texto curto", texto_longo: "Texto longo", url: "Link", cor: "Cor", imagem_url: "Imagem (link)", booleano: "Liga/desliga", opcoes: "Lista de opções",
};

/** Valor vazio = usa o padrão do modelo. */
export const vazio = (v: ValorDoCampo | undefined) => v === undefined || (typeof v === "string" && !v.trim());

/** Tipos em que o backend guarda "" de propósito (sem saudação, sem rodapé, sem imagem...). */
export const TIPOS_QUE_FICAM_VAZIOS = ["texto", "texto_longo", "url", "imagem_url"];
/** O campo aceita "Deixar vazio": opcional e de um tipo que o backend guarda vazio. */
export const podeFicarVazio = (c: CampoDoModelo) => !c.obrigatorio && TIPOS_QUE_FICAM_VAZIOS.includes(c.tipo);
/** "" exato num campo opcional = vazio de propósito (diferente de não mexer, que usa o padrão). */
export const vazioDeProposito = (c: CampoDoModelo, v: ValorDoCampo | undefined) => v === "" && podeFicarVazio(c);

/** Ao trocar de modelo, guarda só os valores cujas chaves existem no modelo novo. */
export function manterCamposComuns(valores: ValoresDosCampos, modelo: Modelo | null | undefined): ValoresDosCampos {
  if (!modelo) return {};
  const chaves = new Set(modelo.campos.map((c) => c.chave));
  return Object.fromEntries(Object.entries(valores).filter(([k]) => chaves.has(k)));
}

/**
 * O que vai para o servidor: só campos do modelo. Campo sem valor não vai (fica o padrão);
 * "" num opcional vai como "" (vazio de propósito).
 */
export function valoresParaEnviar(valores: ValoresDosCampos, modelo: Modelo | null | undefined): ValoresDosCampos {
  if (!modelo) return {};
  const fora: ValoresDosCampos = {};
  for (const c of modelo.campos) {
    const v = valores[c.chave];
    if (vazioDeProposito(c, v)) fora[c.chave] = "";
    else if (!vazio(v)) fora[c.chave] = typeof v === "string" ? v.trim() : (v as boolean);
  }
  return fora;
}

/** Campos obrigatórios sem valor, sem padrão no modelo e sem reserva (ex.: o texto da notificação). */
export function camposFaltando(valores: ValoresDosCampos, modelo: Modelo | null | undefined, reservas: ValoresDosCampos = {}): CampoDoModelo[] {
  if (!modelo) return [];
  return modelo.campos.filter((c) => c.obrigatorio && c.tipo !== "booleano" && vazio(valores[c.chave]) && (c.padrao == null || c.padrao === "") && vazio(reservas[c.chave]));
}


/** O modelo escolhido, ou um "sem modelo" sem campos. Só os campos que o modelo declara aparecem. */
export function modeloOuVazio(modelo: Modelo | null | undefined): Modelo {
  return modelo ?? { chave: "", rotulo: "Sem modelo", descricao: "", campos: [] };
}

/** Troca {chave} pelos exemplos nos valores de texto (para a prévia). */
export function valoresComExemplos(valores: ValoresDosCampos, variaveis: Variavel[]): ValoresDosCampos {
  return Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, typeof v === "string" ? comExemplos(v, variaveis) : v]));
}

/* ---------- variáveis: nada pode sair sem trocar ---------- */
/** Igual a modelos-de-email EMBUTIDAS: todo e-mail recebe estas, além das variáveis do evento. */
export const VARIAVEIS_DO_EMAIL = ["nome", "nome_completo", "titulo", "texto", "link"];
/** Comunicado não tem evento por trás: só {nome}. */
export const VARIAVEIS_DO_COMUNICADO = ["nome"];
/** envios.js VARIAVEIS_DO_EMAIL_DO_COMUNICADO: nos campos do e-mail de um comunicado. */
export const VARIAVEIS_DO_EMAIL_DO_COMUNICADO = ["nome", "titulo", "texto", "link"];

const lista = (ks: string[]) => ks.map((k) => `{${k}}`).join(", ");

/**
 * O que vai vazar sem trocar num texto digitado: {{campo}} (é do código do modelo, não do texto),
 * {variavel} que não existe aqui, ou qualquer {variavel} num campo que não aceita variáveis.
 */
export function problemasDoTexto(texto: string, permitidas: string[], aceita = true): string[] {
  if (!texto) return [];
  const fora: string[] = [];
  const semDuplas = texto.replace(/\{\{([^{}]*)\}\}/g, (todo, dentro: string) => {
    const k = dentro.trim();
    fora.push(aceita && permitidas.includes(k) ? `${todo} não funciona aqui: use {${k}}, com uma chave só.` : `${todo} não é trocado por nada aqui.`);
    return "";
  });
  // Como no backend: só {letra_ou_sublinhado...} é variável; {1} ou { nome } é texto comum.
  for (const m of Array.from(semDuplas.matchAll(/\{([a-z_][a-z0-9_]*)\}/gi))) {
    const k = m[1];
    if (!aceita) fora.push(`${m[0]}: este campo não aceita variáveis.`);
    else if (!permitidas.includes(k)) fora.push(permitidas.length ? `${m[0]} não existe aqui. Dá para usar: ${lista(permitidas)}.` : `${m[0]} não existe aqui: este texto não tem variáveis.`);
  }
  return Array.from(new Set(fora));
}

/** Problemas de todos os campos de texto preenchidos de um modelo. */
export function problemasDosCampos(valores: ValoresDosCampos, modelo: Modelo, permitidas: string[]): string[] {
  return modelo.campos.flatMap((c) => {
    const v = valores[c.chave];
    return typeof v === "string" ? problemasDoTexto(v, permitidas, c.aceita_variaveis).map((p) => `${c.rotulo}: ${p}`) : [];
  });
}

/** Restos no texto já montado: {x}, {{x}}, "undefined" ou "null". */
export const SOBRA = /\{\{[^{}]*\}\}|\{[a-z_][a-z0-9_]*\}|\bundefined\b|\bnull\b/gi;
export const sobrasDoTexto = (texto: string) => Array.from(new Set(texto.match(SOBRA) ?? []));

/** O texto visível do HTML (e links/imagens), sem <style>, comentários e tags, para procurar sobras. */
export function sobrasDoHtml(html: string): string[] {
  const semCodigo = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, " ");
  const atributos = Array.from(semCodigo.matchAll(/\s(?:href|src|alt|title)\s*=\s*"([^"]*)"/gi)).map((m) => m[1]).join(" ");
  const texto = semCodigo.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  return sobrasDoTexto(`${texto} ${atributos}`);
}

/**
 * Variáveis obrigatórias (link de redefinir a senha, código) que não vão estar no e-mail. Como o
 * backend: vale se o arquivo do modelo já tem {{x}} ou se algum campo preenchido tem {x}.
 * Só o e-mail é conferido: esse link nunca vai por sino nem push.
 */
export function obrigatoriasForaDoEmail(variaveis: Variavel[], modelo: Modelo, valores: ValoresDosCampos): string[] {
  return variaveis.filter((v) => v.obrigatoria).filter((v) => {
    const noMolde = (modelo.variaveis_do_molde ?? []).includes(v.chave);
    const nosCampos = Object.values(valores).some((x) => typeof x === "string" && x.includes(`{${v.chave}}`));
    return !noMolde && !nosCampos;
  }).map((v) => `O e-mail precisa ter {${v.chave}}: sem ela a pessoa não consegue entrar. Coloque {${v.chave}} num campo do e-mail ou escolha um modelo que já traga.`);
}

/** Eventos de acesso à conta: o link/código nunca vai por sino nem push. */
export const MOTIVO_DA_SEGURANCA = "Por segurança, este aviso só vai por e-mail";

export const MOTIVO_DO_TRAVADO: Record<keyof Canais, string> = {
  email: "Este e-mail é necessário para a conta funcionar",
  push: "Este aviso é necessário para a conta funcionar",
  sino: "Este aviso é necessário para a conta funcionar",
};



/* ---------- notificações personalizadas ---------- */
/**
 * Notificações a mais que o painel cria, disparadas por um evento de uma lista FECHADA (feita em código).
 *   GET    /admin/notificacoes/gatilhos                   { eventos: [...], condicoes: [...] }
 *   GET    /admin/notificacoes/personalizadas
 *   POST   /admin/notificacoes/personalizadas             corpo de CorpoDaPersonalizada
 *   PUT    /admin/notificacoes/personalizadas/:id         o mesmo corpo
 *   POST   /admin/notificacoes/personalizadas/:id/pausar | /retomar
 *   DELETE /admin/notificacoes/personalizadas/:id
 *   POST   /admin/notificacoes/personalizadas/:id/teste   { user_id }
 *   GET    /admin/notificacoes/personalizadas/:id/historico
 */
export type Papel = "cliente" | "profissional";
export type Gatilho = { tipo: string; rotulo: string; grupo: string; papeis: Papel[]; variaveis: Variavel[] };
export type Condicao = { chave: string; rotulo: string; descricao: string; eventos: string[] };
export type Gatilhos = { eventos: Gatilho[]; condicoes: Condicao[] };
export type CorpoDaPersonalizada = {
  nome: string; ativo: boolean; evento: string; atraso_minutos: number; condicao: string | null; para: Papel[];
  titulo: string; texto: string; href: string | null; canais: Canais; email_modelo: string | null;
  email_campos: ValoresDosCampos; limite_por_pessoa_dia: number;
};
export type Personalizada = CorpoDaPersonalizada & {
  id: number; enviadas_7d: number | null; puladas_7d: number | null; criado_por: string | null; updated_at: string | null;
};
export type StatusDaFila = "pendente" | "enviada" | "cancelada" | "pulada" | string;
export type LinhaDoHistorico = { quem: string; papel: string | null; enviar_em: string | null; status: StatusDaFila; motivo: string | null; atualizado_em: string | null };

export const CAMINHO_GATILHOS = "/admin/notificacoes/gatilhos";
export const CAMINHO_PERSONALIZADAS = "/admin/notificacoes/personalizadas";
const dePersonalizada = (id: number) => `${CAMINHO_PERSONALIZADAS}/${id}`;
export const caminhoDoHistorico = (id: number) => `${dePersonalizada(id)}/historico`;
export const criarPersonalizada = (c: CorpoDaPersonalizada) => apiRequest("POST", CAMINHO_PERSONALIZADAS, c).then(ler);
export const salvarPersonalizada = (id: number, c: CorpoDaPersonalizada) => apiRequest("PUT", dePersonalizada(id), c).then(ler);
export const pausarPersonalizada = (id: number) => apiRequest("POST", `${dePersonalizada(id)}/pausar`).then(ler);
export const retomarPersonalizada = (id: number) => apiRequest("POST", `${dePersonalizada(id)}/retomar`).then(ler);
/** Com envio na fila, o backend pausa em vez de apagar e devolve `message`. */
export const excluirPersonalizada = async (id: number): Promise<{ apagada: boolean; mensagem: string | null }> => {
  const b = desembrulhar(await apiRequest("DELETE", dePersonalizada(id)).then(ler));
  return { apagada: b?.apagada !== false, mensagem: textoOuNulo(b?.message) };
};
export const testarPersonalizada = (id: number, userId: number) => apiRequest("POST", `${dePersonalizada(id)}/teste`, { user_id: userId }).then(ler);

const PAPEIS: Papel[] = ["cliente", "profissional"];
const papeisDe = (v: unknown): Papel[] => {
  const xs = Array.isArray(v) ? v : typeof v === "string" ? (v === "ambos" || v === "todos" ? PAPEIS : [v]) : [];
  return PAPEIS.filter((p) => xs.includes(p));
};
const variaveisDe = (v: unknown): Variavel[] => (Array.isArray(v) ? v : [])
  .filter((x: any) => x && typeof x.chave === "string")
  .map((x: any) => ({ chave: x.chave, descricao: x.descricao ?? "", exemplo: x.exemplo == null ? "" : String(x.exemplo), obrigatoria: x.obrigatoria === true }));

export function normalizarGatilhos(bruto: any): Gatilhos {
  const b = desembrulhar(bruto);
  const eventos = (Array.isArray(b?.eventos) ? b.eventos : []).filter((e: any) => e && typeof e.tipo === "string").map((e: any) => ({
    tipo: e.tipo, rotulo: textoOuNulo(e.rotulo) ?? e.tipo.replace(/_/g, " "), grupo: textoOuNulo(e.grupo) ?? "Outros",
    papeis: papeisDe(e.papeis).length ? papeisDe(e.papeis) : PAPEIS, variaveis: variaveisDe(e.variaveis),
  }));
  const condicoes = (Array.isArray(b?.condicoes) ? b.condicoes : []).filter((c: any) => c && typeof c.chave === "string").map((c: any) => ({
    chave: c.chave, rotulo: textoOuNulo(c.rotulo) ?? c.chave.replace(/_/g, " "), descricao: c.descricao ?? "", eventos: listaDeTextos(c.eventos),
  }));
  return { eventos, condicoes };
}

export function normalizarPersonalizadas(bruto: any): Personalizada[] {
  const b = desembrulhar(bruto);
  const lista = Array.isArray(b) ? b : Array.isArray(b?.personalizadas) ? b.personalizadas : Array.isArray(b?.regras) ? b.regras : [];
  return lista.filter((r: any) => r && Number.isFinite(Number(r.id))).map((r: any) => {
    const c = r.canais ?? {};
    return {
      id: Number(r.id), nome: r.nome ?? "", ativo: bool(r.ativo, true), evento: r.evento ?? "", atraso_minutos: numOuNulo(r.atraso_minutos) ?? 0,
      condicao: textoOuNulo(r.condicao), para: papeisDe(r.para), titulo: r.titulo ?? "", texto: r.texto ?? "",
      canais: { sino: bool(c.sino, false), push: bool(c.push, false), email: bool(c.email, false) },
      href: textoOuNulo(r.href), email_modelo: textoOuNulo(r.email_modelo), email_campos: normalizarValores(r.email_campos),
      limite_por_pessoa_dia: numOuNulo(r.limite_por_pessoa_dia) ?? 1,
      enviadas_7d: numOuNulo(r.enviadas_7d), puladas_7d: numOuNulo(r.puladas_7d), criado_por: textoOuNulo(r.criado_por), updated_at: textoOuNulo(r.updated_at ?? r.updatedAt),
    };
  });
}

export function normalizarHistorico(bruto: any): LinhaDoHistorico[] {
  const b = desembrulhar(bruto);
  const lista = Array.isArray(b) ? b : Array.isArray(b?.agendadas) ? b.agendadas : Array.isArray(b?.historico) ? b.historico : [];
  return lista.map((h: any) => {
    const u = h?.user ?? h?.usuario;
    const quem = u && typeof u === "object" ? (u.nome || u.name || (u.id != null ? `#${u.id}` : "—")) : u != null ? String(u) : h?.user_id != null ? `#${h.user_id}` : "—";
    return {
      quem, papel: textoOuNulo(h?.papel), enviar_em: textoOuNulo(h?.enviar_em), status: h?.status ?? "", motivo: textoOuNulo(h?.motivo),
      atualizado_em: textoOuNulo(h?.atualizado_em ?? h?.updated_at ?? h?.updatedAt),
    };
  });
}

/** Atraso em minutos para "Logo depois", "30 minutos", "2 horas", "3 dias". */
export type UnidadeDoAtraso = "na_hora" | "minutos" | "horas" | "dias";
export const MINUTOS_DA_UNIDADE: Record<UnidadeDoAtraso, number> = { na_hora: 0, minutos: 1, horas: 60, dias: 1440 };
export function atrasoParaCampos(minutos: number): { unidade: UnidadeDoAtraso; quantidade: number } {
  if (!minutos) return { unidade: "na_hora", quantidade: 0 };
  if (minutos % 1440 === 0) return { unidade: "dias", quantidade: minutos / 1440 };
  if (minutos % 60 === 0) return { unidade: "horas", quantidade: minutos / 60 };
  return { unidade: "minutos", quantidade: minutos };
}
export function atrasoEmTexto(minutos: number): string {
  const { unidade, quantidade: n } = atrasoParaCampos(minutos);
  if (unidade === "na_hora") return "Logo depois de";
  const nome = unidade === "dias" ? (n === 1 ? "dia" : "dias") : unidade === "horas" ? (n === 1 ? "hora" : "horas") : n === 1 ? "minuto" : "minutos";
  return `${n.toLocaleString("pt-BR")} ${nome} depois de`;
}
export const NOME_DO_PAPEL: Record<Papel, string> = { cliente: "cliente", profissional: "profissional" };

/* ---------- chave geral das personalizadas ---------- */
/** GET/PUT /admin/notificacoes/config { personalizadas_ligadas }. O GET das personalizadas também traz o valor. */
export const CAMINHO_CONFIG = "/admin/notificacoes/config";
export const ligarPersonalizadas = (ligadas: boolean) => apiRequest("PUT", CAMINHO_CONFIG, { personalizadas_ligadas: ligadas }).then(ler);
/** true/false se a resposta disser; null se não disser. */
export function personalizadasLigadas(bruto: any): boolean | null {
  const b = desembrulhar(bruto);
  const v = b?.personalizadas_ligadas ?? b?.config?.personalizadas_ligadas;
  return typeof v === "boolean" ? v : null;
}
