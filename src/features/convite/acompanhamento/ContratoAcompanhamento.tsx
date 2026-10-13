/**
 * Pagina de acompanhamento do contrato via link de convite aceito.
 * specs/features/2026-10-convite-acompanhamento/03-contrato.md - Telas > Site
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { linkDoAppParaConvite, navegadorAndroid } from "@/lib/invite-app-link";
import { StepConta } from "@/features/convite/StepConta";
import { GrupoEtapas } from "./GrupoEtapas";
import {
  formatDataCompleta,
  labelStatus,
  formatValor,
  textoDaSuaVez,
  temSuaVez,
} from "./helpers";
import type { DadosAcompanhamento } from "./types";
import type { User } from "@/lib/Interfaces";
import { useLocation } from "wouter";

type Props = {
  dados: DadosAcompanhamento;
  token: string;
  user: User | null;
  isLoggedIn: boolean;
  /** Chamado depois que o login no bloco inline conclui (para recarregar os dados) */
  onLoginSuccess: () => void;
};

function BadgeStatus({ status }: { status: string }) {
  const { texto, cor } = labelStatus(status);
  const cls = {
    azul: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    laranja: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    verde: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    vermelho: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    cinza: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  }[cor];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${cls}`}
    >
      {texto}
    </span>
  );
}

function ProgressoBar({ total, aprovadas }: { total: number; aprovadas: number }) {
  const pct = total > 0 ? Math.round((aprovadas / total) * 100) : 0;
  const concluido = pct === 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>
          {aprovadas} de {total} etapa{total !== 1 ? "s" : ""} aprovada{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
        <div
          className={`h-full rounded-full transition-all ${concluido ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BlocoResumo({
  dados,
  token,
  onBaixarPdf,
  pdfLoading,
}: {
  dados: DadosAcompanhamento;
  token: string;
  onBaixarPdf: () => void;
  pdfLoading: boolean;
}) {
  const { contrato, prestador, papel } = dados;
  const titulo =
    contrato.titulo || `Proposta de ${prestador.nome}`;
  const profissao = prestador.profissao
    ? `, ${prestador.profissao.toLowerCase()}`
    : "";
  const isDetalhado = papel === "cliente" || papel === "prestador";
  const labelContrato =
    papel === "cliente" ? "Seu contrato" : "Contrato";

  return (
    <section
      data-testid="bloco-resumo"
      className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {labelContrato}
        </span>
        <BadgeStatus status={contrato.status} />
      </div>

      <h1 className="text-2xl font-extrabold leading-snug text-stone-900 dark:text-stone-50 tracking-tight">
        {titulo}
      </h1>

      <p className="text-sm text-stone-500 dark:text-stone-400">
        com {prestador.nome}{profissao}
      </p>

      {isDetalhado &&
        contrato.valor_total != null &&
        contrato.valor_pago != null && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-xs text-stone-400 dark:text-stone-500">Total</span>
              <span className="text-base font-extrabold text-stone-900 dark:text-stone-50">
                {formatValor(contrato.valor_total)}
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-xs text-stone-400 dark:text-stone-500">Pago</span>
              <span className="text-base font-extrabold text-green-600 dark:text-green-400">
                {formatValor(contrato.valor_pago)}
              </span>
            </div>
          </div>
        )}

      {contrato.etapas_total > 0 && (
        <ProgressoBar
          total={contrato.etapas_total}
          aprovadas={contrato.etapas_aprovadas}
        />
      )}

      {contrato.assinado_em && contrato.status !== "aguardando_assinatura" && (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Assinado em {formatDataCompleta(contrato.assinado_em)}
        </p>
      )}

      {contrato.status === "concluido" && contrato.concluido_em && (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Concluído em {formatDataCompleta(contrato.concluido_em)}
        </p>
      )}

      {isDetalhado && dados.links?.pdf && (
        <button
          type="button"
          onClick={onBaixarPdf}
          disabled={pdfLoading}
          className="text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 text-left flex items-center gap-1.5 py-1"
          data-testid="btn-ver-pdf"
        >
          {pdfLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Ver contrato (PDF)
        </button>
      )}
    </section>
  );
}

function BlocoFaseAtual({ dados }: { dados: DadosAcompanhamento }) {
  const { fase_atual, contrato, papel } = dados;
  const isCliente = papel === "cliente";

  if (contrato.status === "cancelado") {
    return (
      <section
        data-testid="bloco-cancelado"
        className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5 flex flex-col gap-2"
      >
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
          Este contrato foi cancelado
        </h2>
        <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Se a proposta foi refeita, o prestador manda um link novo.
        </p>
      </section>
    );
  }

  if (contrato.status === "concluido") {
    return (
      <section
        data-testid="bloco-concluido"
        className="rounded-2xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30 p-5 flex flex-col gap-2"
      >
        <h2 className="text-lg font-extrabold text-green-900 dark:text-green-100">
          Tudo entregue e aprovado
        </h2>
        <p className="text-sm leading-relaxed text-green-700 dark:text-green-300">
          Todos os grupos pagos. O histórico completo fica no contrato, depois de entrar.
        </p>
      </section>
    );
  }

  if (fase_atual.tipo === "assinatura") {
    return (
      <section
        data-testid="bloco-fase-atual"
        className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 p-5 flex flex-col gap-1.5"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
          Fase atual
        </span>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
          Aguardando assinatura
        </h2>
      </section>
    );
  }

  if (fase_atual.tipo === "pagamento") {
    return (
      <section
        data-testid="bloco-fase-atual"
        className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 p-5 flex flex-col gap-1.5"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
          Fase atual
        </span>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
          Pagamento do{fase_atual.grupo_nome ? ` ${fase_atual.grupo_nome}` : " primeiro grupo"}
        </h2>
        <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
          O trabalho começa depois do pagamento do primeiro grupo.
        </p>
      </section>
    );
  }

  if (fase_atual.tipo === "etapa") {
    const num = fase_atual.etapa_numero;
    const titulo = fase_atual.etapa_titulo;
    const total = dados.contrato.etapas_total;
    const resumo = num && titulo ? `Etapa ${num}${total ? ` de ${total}` : ""}: ${titulo}` : "Em andamento";

    // Texto de detalhe da fase
    let detalhe = "";
    if (fase_atual.situacao === "entregue") {
      const data = fase_atual.data
        ? `${fase_atual.data.split("T")[0].split("-").reverse().slice(0, 2).join("/")}`
        : null;
      if (isCliente) {
        detalhe = data
          ? `Entregue em ${data}. Confira e aprove, ou peça ajuste.`
          : "Entregue. Confira e aprove, ou peça ajuste.";
      } else {
        detalhe = data
          ? `Entregue em ${data}. Aguardando a aprovação do cliente.`
          : "Entregue. Aguardando a aprovação do cliente.";
      }
    } else if (fase_atual.situacao === "em_andamento") {
      detalhe = "Em andamento pelo prestador.";
    } else if (fase_atual.situacao === "aguardando") {
      detalhe = "Ainda não iniciada.";
    }

    return (
      <section
        data-testid="bloco-fase-atual"
        className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 p-5 flex flex-col gap-1.5"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
          Fase atual
        </span>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
          {resumo}
        </h2>
        {detalhe && (
          <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            {detalhe}
          </p>
        )}
      </section>
    );
  }

  return null;
}

function BlocoSuaVez({
  dados,
  onAbrirContrato,
}: {
  dados: DadosAcompanhamento;
  onAbrirContrato: () => void;
}) {
  if (dados.papel !== "cliente") return null;
  const texto = textoDaSuaVez(dados.fase_atual);
  if (!texto) return null;

  return (
    <section
      data-testid="bloco-sua-vez"
      className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30 p-5 flex flex-col gap-3"
    >
      <span className="text-xs font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">
        Sua vez
      </span>
      <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
        {texto}
      </h2>
      <Button
        onClick={onAbrirContrato}
        className="h-12 bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 font-bold text-sm"
        data-testid="btn-abrir-meu-contrato"
      >
        Abrir meu contrato
      </Button>
    </section>
  );
}

function BlocoPublico({
  token,
  onLoginSuccess,
  user,
}: {
  token: string;
  onLoginSuccess: () => void;
  user: User | null;
}) {
  const [mostrandoLogin, setMostrandoLogin] = useState(false);
  const isAndroid = navegadorAndroid(typeof navigator !== "undefined" ? navigator.userAgent : "");
  const appLink = linkDoAppParaConvite(
    token,
    typeof window !== "undefined" ? window.location.host : "",
    typeof window !== "undefined" ? window.location.href : ""
  );

  if (mostrandoLogin) {
    return (
      <section
        data-testid="bloco-login-inline"
        className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5"
      >
        <StepConta user={user} onSuccess={onLoginSuccess} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 pt-1">
      {isAndroid && (
        <a
          href={appLink}
          data-testid="btn-abrir-app"
          className="flex h-12 items-center justify-center rounded-xl bg-orange-600 font-bold text-sm text-white hover:bg-orange-700 transition-colors"
        >
          Abrir no app ArqDoor
        </a>
      )}
      <Button
        variant="outline"
        className="h-12 font-bold text-sm border-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
        onClick={() => setMostrandoLogin(true)}
        data-testid="btn-entrar-inline"
      >
        Entrar para ver valores e agir
      </Button>
      <p className="text-center text-xs leading-relaxed text-stone-400 dark:text-stone-500">
        Valores, contrato em PDF, pagamentos e aprovações aparecem depois de entrar.
      </p>
    </section>
  );
}

function BlocoAcoesDetalhado({
  dados,
  token,
  onAbrirContrato,
}: {
  dados: DadosAcompanhamento;
  token: string;
  onAbrirContrato: () => void;
}) {
  const { papel } = dados;
  const isAndroid = navegadorAndroid(typeof navigator !== "undefined" ? navigator.userAgent : "");
  const appLink = linkDoAppParaConvite(
    token,
    typeof window !== "undefined" ? window.location.host : "",
    typeof window !== "undefined" ? window.location.href : ""
  );

  const labelBotao = papel === "cliente" ? "Abrir meu contrato" : "Abrir o contrato";

  return (
    <div className="flex flex-col gap-3">
      {dados.links?.conversa && (
        <Button
          onClick={onAbrirContrato}
          className="h-12 bg-orange-600 hover:bg-orange-700 font-bold text-sm"
          data-testid="btn-abrir-contrato"
        >
          {labelBotao}
        </Button>
      )}
      {isAndroid && (
        <a
          href={appLink}
          data-testid="btn-abrir-app"
          className="flex h-12 items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-sm text-stone-900 dark:text-stone-50 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          Abrir no app ArqDoor
        </a>
      )}
    </div>
  );
}

export function ContratoAcompanhamento({ dados, token, user, isLoggedIn, onLoginSuccess }: Props) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [pdfLoading, setPdfLoading] = useState(false);

  const { papel, grupos, fase_atual, contrato } = dados;
  const isDetalhado = papel === "cliente" || papel === "prestador";

  const handleBaixarPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await apiRequest("GET", `/invites/public/${token}/pdf`);
      if (!res.ok) {
        toast({
          title: "PDF não disponível",
          description: "Não foi possível baixar o contrato.",
          variant: "destructive",
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contrato.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar o PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAbrirContrato = () => {
    if (dados.links?.conversa) {
      navigate(dados.links.conversa);
    }
  };

  const mostrarEtapas =
    grupos.length > 0 &&
    contrato.status !== "cancelado" &&
    contrato.status !== "aguardando_assinatura";

  // Layout responsivo: celular = coluna unica; md+ = 2 colunas (resumo/acoes | etapas)
  return (
    <div
      data-testid="acompanhamento-contrato"
      className="w-full max-w-5xl mx-auto px-4 pt-24 pb-10 md:pt-28"
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Coluna esquerda: resumo + fase atual + acoes */}
        <div className="flex flex-col gap-4 md:w-80 lg:w-96 md:shrink-0">
          <BlocoResumo
            dados={dados}
            token={token}
            onBaixarPdf={handleBaixarPdf}
            pdfLoading={pdfLoading}
          />

          <BlocoFaseAtual dados={dados} />

          {/* Bloco "Sua vez" so para cliente quando houver acao */}
          {papel === "cliente" && temSuaVez(fase_atual) && (
            <BlocoSuaVez dados={dados} onAbrirContrato={handleAbrirContrato} />
          )}

          {/* Acoes: botao de app/contrato */}
          {isDetalhado ? (
            <BlocoAcoesDetalhado
              dados={dados}
              token={token}
              onAbrirContrato={handleAbrirContrato}
            />
          ) : (
            <BlocoPublico
              token={token}
              onLoginSuccess={onLoginSuccess}
              user={user}
            />
          )}
        </div>

        {/* Coluna direita: lista de etapas por grupo */}
        {mostrarEtapas && (
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-50">
              Etapas
            </h2>
            {grupos.map((grupo, i) => (
              <GrupoEtapas
                key={i}
                grupo={grupo}
                isCliente={papel === "cliente"}
                isDetalhado={isDetalhado}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
