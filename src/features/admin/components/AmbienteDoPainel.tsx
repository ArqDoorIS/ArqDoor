import { AlertTriangle, FlaskConical, Globe, Laptop } from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import {
  NOME_DO_AMBIENTE, ambienteDoEnvio, ambienteDoServidor, explicacaoDoAmbiente, noAmbiente, trocarAmbienteDoPainel,
  type AmbienteDoEnvio, type AmbienteDoPainel,
} from "@/lib/ambienteDoPainel";
import { cn } from "../utils";

/**
 * Seletor "Produção | Staging" do painel e a faixa que deixa claro quando se está no
 * staging (lib/ambienteDoPainel.ts). A troca recarrega a página; cada ambiente tem o seu
 * login, o seu banco e os seus dados.
 */
const OPCOES: { valor: AmbienteDoPainel; rotulo: string; Icone: typeof Globe }[] = [
  { valor: "producao", rotulo: "Produção", Icone: Globe },
  { valor: "staging", rotulo: "Staging", Icone: FlaskConical },
];

export function ambienteAtualDoPainel(): AmbienteDoPainel {
  return ambienteDoServidor(API_BASE_URL);
}

export function SeletorDeAmbiente({ compacto = false }: { compacto?: boolean }) {
  const atual = ambienteAtualDoPainel();
  return (
    <div role="radiogroup" aria-label="Ambiente do painel" className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = valor === atual;
        const corAtiva = valor === "staging" ? "bg-violet-600 text-white" : "bg-slate-900 text-white";
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => {
              if (ativo) return;
              const aviso = valor === "producao"
                ? "Ir para PRODUÇÃO? Lá estão as contas, contratos e pagamentos reais. Você vai precisar entrar de novo."
                : "Ir para STAGING? É o ambiente de teste, com outro banco de dados. Você vai precisar entrar de novo.";
              if (window.confirm(aviso)) trocarAmbienteDoPainel(valor);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${ativo ? corAtiva : "text-slate-600 hover:text-slate-900"}`}
          >
            <Icone className="h-3.5 w-3.5" />
            {compacto ? <span className="hidden sm:inline">{rotulo}</span> : rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Faixa no topo quando o painel está no staging (em produção não aparece nada). */
export function FaixaDoAmbiente() {
  if (ambienteAtualDoPainel() !== "staging") return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-violet-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      STAGING: ambiente de teste, com banco de dados próprio e pagamentos de teste. Nada aqui afeta clientes reais.
    </div>
  );
}

const ESTILO_DO_ENVIO: Record<AmbienteDoEnvio, { caixa: string; selo: string; Icone: typeof Globe }> = {
  producao: { caixa: "border-rose-400 bg-rose-50 text-rose-900", selo: "bg-rose-600", Icone: AlertTriangle },
  teste: { caixa: "border-violet-300 bg-violet-50 text-violet-900", selo: "bg-violet-600", Icone: FlaskConical },
  local: { caixa: "border-slate-300 bg-slate-50 text-slate-800", selo: "bg-slate-700", Icone: Laptop },
};

/** "em PRODUÇÃO", "em TESTE" ou "em LOCAL": o fim do botão final de um envio em massa. */
export const noAmbienteDoEnvio = (servidor = API_BASE_URL) => noAmbiente(servidor);

/**
 * Na confirmação de um envio em massa: em que ambiente ele cai e para quem vai.
 * PRODUÇÃO em vermelho de alerta, TESTE no roxo da faixa do staging, LOCAL em cinza.
 * O ambiente é o do servidor em uso (lib/ambienteDoPainel.ts, ambienteDoEnvio).
 */
export function AvisoDoAmbienteDoEnvio({ publico, servidor = API_BASE_URL }: { publico: string; servidor?: string }) {
  const ambiente = ambienteDoEnvio(servidor);
  const { caixa, selo, Icone } = ESTILO_DO_ENVIO[ambiente];
  return (
    <div data-testid="ambiente-do-envio" data-ambiente={ambiente} className={cn("rounded-xl border-2 p-3 text-left text-sm", caixa)}>
      <p className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-black tracking-wide text-white", selo)}>
          <Icone className="h-3.5 w-3.5" />{NOME_DO_AMBIENTE[ambiente]}
        </span>
        <span className="font-semibold">{explicacaoDoAmbiente(servidor)}</span>
      </p>
      <p className="mt-1.5"><b>Para quem:</b> {publico}</p>
    </div>
  );
}
