import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Power, Save, Trash2, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Chave da IA do assistente de orçamentos do app (Anthropic).
 *
 * Cada ambiente tem a sua: este painel grava no banco do ambiente em que está aberto
 * (staging ou produção). A chave nunca volta do servidor; só os 4 últimos caracteres.
 * Backend: GET/PUT /admin/ai-settings, POST /admin/ai-settings/test.
 */
type AiSettings = {
  enabled: boolean;
  model: string;
  models: string[];
  has_key: boolean;
  key_last4: string | null;
  ready: boolean;
  updated_by: string | null;
  updated_at: string | null;
};

const NOMES: Record<string, string> = {
  "claude-sonnet-5-5": "Claude Sonnet 5.5 (recomendado)",
  "claude-haiku-5-5": "Claude Haiku 5.5 (mais barato e rápido)",
  "claude-opus-5-5": "Claude Opus 5.5 (mais caro)",
};

const ler = async (res: Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || "Não foi possível falar com o servidor.");
  return body;
};

export function AdminAiSection() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [chave, setChave] = useState("");
  const [modelo, setModelo] = useState("");
  const [ocupado, setOcupado] = useState<null | "carregando" | "salvando" | "testando">("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const aplicar = (s: AiSettings) => {
    setSettings(s);
    setModelo(s.model);
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const body = await ler(await apiRequest("GET", "/admin/ai-settings"));
        if (!cancelado) aplicar(body.data);
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Não foi possível carregar a configuração da IA.");
      } finally {
        if (!cancelado) setOcupado(null);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const salvar = async (payload: Record<string, unknown>, mensagem: string) => {
    setOcupado("salvando");
    setErro(null);
    setAviso(null);
    try {
      const body = await ler(await apiRequest("PUT", "/admin/ai-settings", payload));
      aplicar(body.data);
      setChave("");
      setAviso(mensagem);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setOcupado(null);
    }
  };

  const testar = async () => {
    setOcupado("testando");
    setErro(null);
    setAviso(null);
    try {
      const body = await ler(await apiRequest("POST", "/admin/ai-settings/test", {}, undefined, 45000));
      setAviso(`A chave funciona (${NOMES[body.data?.model] ?? body.data?.model}, ${Math.round((body.data?.ms ?? 0) / 100) / 10}s).`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A chave não funcionou.");
    } finally {
      setOcupado(null);
    }
  };

  if (ocupado === "carregando") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configuração da IA...
      </div>
    );
  }

  const campo = "mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
  const botao = "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="mt-2 space-y-2">
      <SectionCard
        title="Assistente de orçamentos com IA"
        subtitle="Chave da API da Anthropic usada pelo app. Vale só para este ambiente."
        action={
          settings ? (
            <StatusBadge
              label={settings.ready ? "Ligada no app" : settings.has_key ? "Desligada" : "Sem chave"}
              tone={settings.ready ? "emerald" : settings.has_key ? "amber" : "slate"}
            />
          ) : undefined
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Chave da API
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder={settings?.has_key ? `Gravada: termina em ${settings.key_last4 ?? "????"}. Cole outra para trocar.` : "sk-ant-..."}
              className={campo}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Modelo
            <select value={modelo} onChange={(e) => setModelo(e.target.value)} className={campo}>
              {(settings?.models ?? []).map((m) => (
                <option key={m} value={m}>{NOMES[m] ?? m}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!!ocupado || (!chave.trim() && modelo === settings?.model)}
            onClick={() => void salvar({ ...(chave.trim() ? { api_key: chave.trim() } : {}), model: modelo }, chave.trim() ? "Chave gravada." : "Modelo salvo.")}
            className={`${botao} bg-orange-600 text-white hover:bg-orange-700`}
          >
            {ocupado === "salvando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
          <button type="button" disabled={!!ocupado || !settings?.has_key} onClick={() => void testar()} className={`${botao} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
            {ocupado === "testando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Testar a chave
          </button>
          <button
            type="button"
            disabled={!!ocupado || !settings?.has_key}
            onClick={() => void salvar({ enabled: !settings?.enabled }, settings?.enabled ? "IA desligada: o assistente sumiu do app." : "IA ligada: o assistente aparece no app.")}
            className={`${botao} border ${settings?.enabled ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
          >
            <Power className="h-4 w-4" />
            {settings?.enabled ? "Desligar no app" : "Ligar no app"}
          </button>
          {settings?.has_key ? (
            <button
              type="button"
              disabled={!!ocupado}
              onClick={() => {
                if (window.confirm("Apagar a chave gravada? A IA também é desligada.")) void salvar({ clear_key: true, enabled: false }, "Chave apagada.");
              }}
              className={`${botao} text-slate-500 hover:text-rose-700`}
            >
              <Trash2 className="h-4 w-4" />
              Apagar chave
            </button>
          ) : null}
        </div>

        {aviso ? <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{aviso}</p> : null}
        {erro ? <p className="mt-2 text-xs text-rose-700">{erro}</p> : null}

        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p className="flex items-center gap-1 font-semibold text-slate-700"><KeyRound className="h-3.5 w-3.5" />Como funciona</p>
          <p>A chave fica criptografada no servidor deste ambiente e nunca volta inteira para a tela. Staging e produção têm chaves separadas.</p>
          <p>Com a IA ligada, o app mostra o assistente para os profissionais. Desligar esconde o assistente na hora.</p>
          {settings?.updated_at ? (
            <p>Última alteração: {new Date(settings.updated_at).toLocaleString("pt-BR")}{settings.updated_by ? ` por ${settings.updated_by}` : ""}.</p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
