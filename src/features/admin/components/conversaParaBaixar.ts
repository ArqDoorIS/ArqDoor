import { baixarArquivo } from "./baixarArquivo";

/**
 * Conversa com a IA para baixar (19/11/2026): um .txt fácil de ler ou um .json.
 * Usada em Análise › Investigar › Conversas com a IA e em IA › Conversas.
 *
 *   [18/11 23:26] Pessoa: quero trocar o piso da sala
 *   [18/11 23:26] IA: Qual o tamanho da sala?
 *
 * A conversa vem inteira de GET /admin/ai-conversas/:id (nada cortado).
 */
export type MensagemDaConversa = { de: "eu" | "ia" | string; texto: string; em?: string | null };
export type ConversaParaBaixar = {
  id: number;
  tipo: string;
  origem?: string | null;
  publica?: boolean;
  turnos?: number;
  criada_em?: string | null;
  created_at?: string | null;
  ultima_em?: string | null;
  pessoa?: { id: number; nome?: string | null } | null;
  mensagens: MensagemDaConversa[];
};

/** "18/11 23:26" no horário de Brasília. */
export function horaDaMensagem(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

const quemFala = (de: string) => (de === "ia" ? "IA" : "Pessoa");

/** A conversa inteira em texto. */
export function conversaEmTexto(c: ConversaParaBaixar): string {
  const conta = c.publica ? "sem conta (teste)" : c.pessoa ? `${c.pessoa.nome ?? "sem nome"} (PH #${c.pessoa.id})` : "não informada";
  const topo = [
    `Conversa com a IA #${c.id}`,
    `IA: ${c.tipo}${c.origem ? ` · entrou por: ${c.origem}` : ""}`,
    `Conta: ${conta}`,
    `Mensagens: ${c.mensagens.length}`,
    "",
  ];
  const falas = c.mensagens.map((m) => {
    const h = horaDaMensagem(m.em);
    return `${h ? `[${h}] ` : ""}${quemFala(m.de)}: ${String(m.texto ?? "").replace(/\r\n/g, "\n")}`;
  });
  return `${[...topo, ...falas].join("\n")}\n`;
}

/** Só o que interessa da conversa, sem e-mail. */
export function conversaEmJson(c: ConversaParaBaixar): string {
  return JSON.stringify({
    id: c.id, tipo: c.tipo, origem: c.origem ?? null, publica: !!c.publica,
    pessoa: c.pessoa ? { id: c.pessoa.id, nome: c.pessoa.nome ?? null } : null,
    criada_em: c.criada_em ?? c.created_at ?? null, ultima_em: c.ultima_em ?? null,
    mensagens: c.mensagens.map((m) => ({ de: m.de === "ia" ? "ia" : "pessoa", texto: m.texto, em: m.em ?? null })),
  }, null, 2);
}

export const nomeDoArquivoDaConversa = (c: ConversaParaBaixar, ext: "txt" | "json") => `conversa-ia-${c.id}-${c.tipo}.${ext}`;

export function baixarConversa(c: ConversaParaBaixar, formato: "txt" | "json" = "txt") {
  if (formato === "json") baixarArquivo(conversaEmJson(c), nomeDoArquivoDaConversa(c, "json"), "application/json;charset=utf-8");
  else baixarArquivo(`﻿${conversaEmTexto(c)}`, nomeDoArquivoDaConversa(c, "txt"), "text/plain;charset=utf-8");
}
