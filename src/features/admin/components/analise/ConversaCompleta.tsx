import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "../../utils";
import { baixarConversa, horaDaMensagem, type ConversaParaBaixar } from "../conversaParaBaixar";
import { Carregando, Erro, ler, useApi } from "./comum";

/**
 * A conversa INTEIRA com a IA, numa janela (19/11/2026). A ficha só traz um trecho curto
 * (as últimas mensagens, cortadas) para a tabela; aqui vem tudo de GET /admin/ai-conversas/:id.
 */

export const buscarConversa = (id: number) => apiRequest("GET", `/admin/ai-conversas/${id}`).then(ler).then((b) => b.conversa as ConversaParaBaixar);

export function ConversaCompleta({ id, nome }: { id: number; nome: string }) {
  const { dado, erro } = useApi<{ conversa: ConversaParaBaixar }>(`/admin/ai-conversas/${id}`);
  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;
  const c = dado.conversa;
  const primeiro = nome.split(" ")[0] || "Pessoa";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">{c.mensagens.length} {c.mensagens.length === 1 ? "mensagem" : "mensagens"}</span>
        <span className="ml-auto" />
        <button type="button" onClick={() => baixarConversa(c, "txt")} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Baixar .txt</button>
        <button type="button" onClick={() => baixarConversa(c, "json")} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800"><Download className="h-3.5 w-3.5" />.json</button>
      </div>
      <div className="space-y-1.5" aria-label="Mensagens da conversa">
        {c.mensagens.map((m, i) => {
          const ia = m.de === "ia";
          return (
            <div key={i} data-testid="mensagem-da-conversa" className={cn("max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-1.5", ia ? "bg-slate-100" : "ml-auto bg-orange-50")}>
              <div className="text-[10px] font-semibold text-slate-500">{ia ? "IA" : primeiro}{m.em ? ` · ${horaDaMensagem(m.em)}` : ""}</div>
              {m.texto}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "Baixar" de uma linha: busca a conversa inteira e baixa o .txt. */
export function BotaoBaixarConversa({ id, className }: { id: number; className?: string }) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const baixar = async () => {
    setBaixando(true); setErro(null);
    try { baixarConversa(await buscarConversa(id), "txt"); } catch (e: any) { setErro(e.message); } finally { setBaixando(false); }
  };
  return (
    <button type="button" disabled={baixando} title={erro ?? "Baixar a conversa inteira em .txt"} onClick={(e) => { e.stopPropagation(); void baixar(); }}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-60", erro ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800", className)}>
      {baixando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}{erro ? "Tentar de novo" : "Baixar"}
    </button>
  );
}
