import { FlaskConical, Globe } from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";
import { ambienteDoServidor, trocarAmbienteDoPainel, type AmbienteDoPainel } from "@/lib/ambienteDoPainel";

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
