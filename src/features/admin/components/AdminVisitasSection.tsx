import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarCheck, Check, Clock, Loader2, MapPin, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SectionCard, StatusBadge } from "./AdminPrimitives";
import { cn } from "../utils";
import { Carregando, Erro, Janela, ler, quando, useApi, type ConteudoJanela } from "./analise/comum";

/**
 * Aba "Visitas" (26/11/2026). Só owner.
 *
 * Lista com filtro (Contestadas, Ativas, Concluídas, Canceladas, Todas), busca e paginação
 * de 20. Detalhe com dados, partes, pagamento, endereço, prazo, histórico e localizações.
 * Contestações abertas (status = disputed): decidir com justificativa obrigatória e confirmação.
 * Botão "Apagar localizações" com confirmação.
 *
 * Backend: GET /admin/visitas, GET /admin/visitas/:id, POST /admin/visit-disputes/:id/resolve,
 * DELETE /admin/visitas/:id/localizacoes.
 */

/* ---------- tipos ---------- */
type FiltroStatus = "contestadas" | "ativas" | "concluidas" | "canceladas" | "";

type VisitaItem = {
  id: number;
  status: string;
  payment_status: string;
  scheduled_start: string | null;
  total_price: number | null;
  prazo_confirmacao_dias: number | null;
  completion_confirmation_due_at: string | null;
  marcada_antes_do_horario: boolean | null;
  completion_disputed_at: string | null;
  cliente: { id: number; name: string; email: string };
  profissional: { id: number; name: string; email: string };
  created_at: string;
};

type VisitaListaResposta = {
  itens: VisitaItem[];
  total: number;
  pagina: number;
  por_pagina: number;
  contestacoes_abertas: number;
};

type Localizacao = {
  id: number;
  acao: string;
  papel: "cliente" | "profissional";
  situacao: string;
  latitude: number | null;
  longitude: number | null;
  precisao_m: number | null;
  simulada: boolean | null;
  distancia_da_obra_m: number | null;
  capturada_em: string | null;
  created_at: string;
  apagada_em: string | null;
};

type HistoricoItem = { quando: string; quem: string; o_que: string };

type VisitaDetalhe = {
  id: number;
  status: string;
  payment_status: string;
  scheduled_start: string | null;
  total_price: number | null;
  prazo_confirmacao_dias: number | null;
  completion_confirmation_due_at: string | null;
  marcada_antes_do_horario: boolean | null;
  completion_disputed_at: string | null;
  provider_completed_at: string | null;
  endereco_obra: Record<string, string> | null;
  motivo_cancelamento?: string | null;
  motivo_disputa?: string | null;
  resolucao_disputa?: string | null;
  created_at: string;
};

type VisitaDetalhada = {
  visita: VisitaDetalhe;
  cliente: { id: number; name: string; email: string; phone?: string | null };
  profissional: { id: number; name: string; email: string; phone?: string | null };
  pagamento: Record<string, unknown> | null;
  historico: HistoricoItem[];
  localizacoes: Localizacao[];
};

/* ---------- utilitários ---------- */
const reais = (v?: number | null) =>
  v == null ? "-" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const diaBr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

const horaBr = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const nomeDaAcao: Record<string, string> = {
  propor: "Proposta enviada",
  aceitar: "Aceita pelo cliente",
  pagar: "Pagamento realizado",
  marcar: "Marcada como realizada (profissional)",
  confirmar: "Confirmada pelo cliente",
  contestar: "Contestada pelo cliente",
  pedir_cancelamento: "Pedido de cancelamento",
  cancelar: "Cancelada",
  recusar_cancelamento: "Cancelamento recusado",
  pedir_reagendamento: "Pedido de reagendamento",
  reagendar: "Reagendada",
};

const nomeDaSituacao: Record<string, string> = {
  ok: "GPS ok",
  sem_permissao: "Sem permissao",
  desligada: "GPS desligado",
  indisponivel: "Indisponivel",
  erro: "Erro no GPS",
  nao_enviada: "Nao enviada",
};

const nomeDoStatus: Record<string, { texto: string; tom: "emerald" | "amber" | "rose" | "sky" | "slate" }> = {
  pending: { texto: "Aguardando aceite", tom: "slate" },
  confirmed: { texto: "Confirmada", tom: "sky" },
  paid: { texto: "Paga", tom: "sky" },
  completion_pending: { texto: "Aguardando confirmacao", tom: "amber" },
  disputed: { texto: "Contestada", tom: "rose" },
  completed: { texto: "Concluida", tom: "emerald" },
  cancelled: { texto: "Cancelada", tom: "slate" },
  cancellation_requested: { texto: "Cancelamento pedido", tom: "amber" },
};

const selaBadge = (s: string) => {
  const info = nomeDoStatus[s];
  return info ? (
    <StatusBadge label={info.texto} tone={info.tom} />
  ) : (
    <StatusBadge label={s} tone="slate" />
  );
};

const enderecoFormatado = (e: Record<string, string> | null | undefined): string => {
  if (!e) return "-";
  const partes = [e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep].filter(Boolean);
  return partes.join(", ") || "-";
};

/* ---------- detalhe: localizacoes ---------- */
function TabelaDeLocalizacoes({
  localizacoes,
  visitaId,
  aoApagar,
}: {
  localizacoes: Localizacao[];
  visitaId: number;
  aoApagar: () => void;
}) {
  const [apagando, setApagando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  const apagar = async () => {
    if (
      !window.confirm(
        "Apagar as coordenadas desta visita? As linhas de localização ficam, mas latitude, longitude, precisao e distancia sao zeradas e fica registrado no historico."
      )
    )
      return;
    setApagando(true);
    setAviso(null);
    try {
      const r = await apiRequest("DELETE", `/admin/visitas/${visitaId}/localizacoes`).then(ler);
      setAviso({
        ok: true,
        msg: `${r.apagadas ?? 0} ${r.apagadas === 1 ? "coordenada apagada" : "coordenadas apagadas"}.`,
      });
      aoApagar();
    } catch (e: any) {
      setAviso({ ok: false, msg: e.message });
    } finally {
      setApagando(false);
    }
  };

  if (!localizacoes.length)
    return <p className="text-sm text-slate-400">Nenhuma localizacao registrada nesta visita.</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {localizacoes.length} {localizacoes.length === 1 ? "registro" : "registros"}
        </p>
        <button
          type="button"
          disabled={apagando}
          onClick={() => void apagar()}
          data-testid="btn-apagar-localizacoes"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          {apagando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Apagar localizacoes
        </button>
      </div>
      {aviso ? (
        <p
          role="status"
          data-testid="aviso-apagar"
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold",
            aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          )}
        >
          {aviso.msg}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-1.5 pr-3">Acao</th>
              <th className="pb-1.5 pr-3">Quem</th>
              <th className="pb-1.5 pr-3">Situacao</th>
              <th className="pb-1.5 pr-3">Dist. obra</th>
              <th className="pb-1.5 pr-3">Precisao</th>
              <th className="pb-1.5 pr-3">Simulada</th>
              <th className="pb-1.5 pr-3">Coordenada</th>
              <th className="pb-1.5">Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {localizacoes.map((l) => {
              const temCoordenada = l.latitude != null && l.longitude != null && !l.apagada_em;
              const mapUrl =
                temCoordenada
                  ? `https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}&zoom=17`
                  : null;
              return (
                <tr key={l.id} className={cn("text-slate-700", l.apagada_em && "opacity-50")}>
                  <td className="py-1 pr-3 font-medium">
                    {nomeDaAcao[l.acao] ?? l.acao}
                  </td>
                  <td className="py-1 pr-3 capitalize">{l.papel}</td>
                  <td className="py-1 pr-3">{nomeDaSituacao[l.situacao] ?? l.situacao}</td>
                  <td className="py-1 pr-3">
                    {l.distancia_da_obra_m != null ? `${l.distancia_da_obra_m} m` : "-"}
                  </td>
                  <td className="py-1 pr-3">
                    {l.precisao_m != null ? `${l.precisao_m} m` : "-"}
                  </td>
                  <td className="py-1 pr-3">
                    {l.simulada == null ? "-" : l.simulada ? "Sim" : "Nao"}
                  </td>
                  <td className="py-1 pr-3 font-mono">
                    {temCoordenada ? (
                      <span>
                        {l.latitude?.toFixed(5)}, {l.longitude?.toFixed(5)}{" "}
                        <a
                          href={mapUrl!}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-orange-600 underline"
                        >
                          Ver no mapa
                        </a>
                      </span>
                    ) : l.apagada_em ? (
                      <span className="text-slate-400">Apagada</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-1 whitespace-nowrap text-slate-500">
                    {horaBr(l.capturada_em ?? l.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- detalhe: decisao de contestacao ---------- */
function DecidirContestacao({
  visitaId,
  aoDecidido,
}: {
  visitaId: number;
  aoDecidido: () => void;
}) {
  const [decision, setDecision] = useState<"complete" | "cancel_and_refund" | "">("");
  const [reason, setReason] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);

  const razoavelmente = reason.trim().length >= 3 && reason.trim().length <= 1000;
  const podeConfirmar = decision !== "" && razoavelmente;

  const confirmar = () => setConfirmando(true);
  const cancelarConfirmacao = () => setConfirmando(false);

  const enviar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      await apiRequest("POST", `/admin/visit-disputes/${visitaId}/resolve`, {
        decision,
        reason: reason.trim(),
      }).then(ler);
      setAviso({ ok: true, msg: "Contestacao decidida com sucesso." });
      setConfirmando(false);
      aoDecidido();
    } catch (e: any) {
      setAviso({ ok: false, msg: e.message });
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3"
      data-testid="decidir-contestacao"
    >
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-800">
        <AlertTriangle className="h-4 w-4" />
        Contestacao aberta - decida
      </h4>
      <div className="space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-slate-600">Decisao</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["complete", "Confirmar realizacao"],
                ["cancel_and_refund", "Cancelar e estornar"],
              ] as const
            ).map(([v, r]) => (
              <label
                key={v}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  decision === v
                    ? "border-rose-400 bg-rose-100 text-rose-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name={`decisao-${visitaId}`}
                  value={v}
                  checked={decision === v}
                  onChange={() => setDecision(v)}
                  className="sr-only"
                  aria-label={r}
                />
                {v === "complete" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-xs font-semibold text-slate-600">
          Justificativa
          <span className="ml-1 font-normal text-slate-400">(3 a 1000 caracteres, obrigatoria)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            aria-label="Justificativa da decisao"
            placeholder="Descreva o motivo da decisao..."
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-normal outline-none focus:border-orange-400"
          />
          <span className="mt-0.5 block text-right font-normal text-slate-400">
            {reason.trim().length}/1000
          </span>
        </label>

        {aviso ? (
          <p
            role="alert"
            data-testid="aviso-decisao"
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
            )}
          >
            {aviso.msg}
          </p>
        ) : null}

        {!confirmando ? (
          <button
            type="button"
            disabled={!podeConfirmar}
            onClick={confirmar}
            data-testid="btn-confirmar-decisao"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            Decidir contestacao
          </button>
        ) : (
          <div
            className="rounded-xl border border-rose-300 bg-white p-3 space-y-2"
            data-testid="passo-confirmacao"
          >
            <p className="text-sm font-semibold text-slate-900">
              Confirmar:{" "}
              <span className="text-rose-700">
                {decision === "complete" ? "Confirmar realizacao" : "Cancelar e estornar"}
              </span>
              ?
            </p>
            <p className="text-xs text-slate-600">"{reason.trim()}"</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={salvando}
                onClick={() => void enviar()}
                data-testid="btn-enviar-decisao"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Sim, confirmar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={cancelarConfirmacao}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- detalhe completo da visita ---------- */
function DetalheDeVisita({
  visitaId,
  aoMudar,
}: {
  visitaId: number;
  aoMudar: () => void;
}) {
  const [vez, setVez] = useState(0);
  const { dado, erro } = useApi<VisitaDetalhada>(`/admin/visitas/${visitaId}`, 90000);
  const recarregar = useCallback(() => setVez((x) => x + 1), []);
  useEffect(() => { if (vez) aoMudar(); }, [vez, aoMudar]);

  if (erro) return <Erro msg={erro} />;
  if (!dado) return <Carregando />;

  const { visita, cliente, profissional, pagamento, historico, localizacoes } = dado;
  const eContestada = visita.status === "disputed";
  const endereco = enderecoFormatado(visita.endereco_obra);

  return (
    <div className="space-y-4" data-testid="detalhe-visita">
      {/* dados principais */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SectionCard title="Visita">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Status</dt>
              <dd>{selaBadge(visita.status)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Data agendada</dt>
              <dd className="text-slate-900">{horaBr(visita.scheduled_start)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Valor total</dt>
              <dd className="font-semibold text-slate-900">{reais(visita.total_price)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Prazo escolhido</dt>
              <dd className="text-slate-900">
                {visita.prazo_confirmacao_dias != null
                  ? `${visita.prazo_confirmacao_dias} dias`
                  : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Data limite</dt>
              <dd className="text-slate-900">{diaBr(visita.completion_confirmation_due_at)}</dd>
            </div>
            {visita.marcada_antes_do_horario ? (
              <div className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                Marcada antes do horario agendado
              </div>
            ) : null}
            {visita.motivo_cancelamento ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Motivo cancelamento</dt>
                <dd className="text-slate-900">{visita.motivo_cancelamento}</dd>
              </div>
            ) : null}
            {visita.motivo_disputa ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Motivo contestacao</dt>
                <dd className="text-slate-900">{visita.motivo_disputa}</dd>
              </div>
            ) : null}
            {visita.resolucao_disputa ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Resolucao</dt>
                <dd className="text-slate-900">{visita.resolucao_disputa}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Criada em</dt>
              <dd className="text-slate-900">{diaBr(visita.created_at)}</dd>
            </div>
          </dl>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Endereco da obra">
            <div className="flex items-start gap-1.5 text-sm text-slate-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span>{endereco}</span>
            </div>
          </SectionCard>

          {pagamento ? (
            <SectionCard title="Pagamento">
              <dl className="space-y-1 text-sm">
                {Object.entries(pagamento)
                  .filter(
                    ([k]) =>
                      !["qr_code", "boleto_url", "linha_digitavel"].includes(k)
                  )
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="capitalize text-slate-500">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-slate-900">{String(v ?? "-")}</dd>
                    </div>
                  ))}
              </dl>
            </SectionCard>
          ) : null}
        </div>
      </div>

      {/* partes */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { titulo: "Cliente", pessoa: cliente },
          { titulo: "Profissional", pessoa: profissional },
        ].map(({ titulo, pessoa }) => (
          <SectionCard key={titulo} title={titulo}>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Nome</dt>
                <dd className="font-semibold text-slate-900">{pessoa.name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">E-mail</dt>
                <dd className="text-slate-900">{pessoa.email}</dd>
              </div>
              {pessoa.phone ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Telefone</dt>
                  <dd className="text-slate-900">{pessoa.phone}</dd>
                </div>
              ) : null}
            </dl>
          </SectionCard>
        ))}
      </div>

      {/* contestacao */}
      {eContestada ? (
        <DecidirContestacao
          visitaId={visitaId}
          aoDecidido={() => { recarregar(); aoMudar(); }}
        />
      ) : null}

      {/* historico */}
      {historico.length ? (
        <SectionCard title="Historico">
          <ol className="space-y-1">
            {historico.map((h, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 text-xs text-slate-700">
                <span className="text-slate-400">{horaBr(h.quando)}</span>
                <span className="font-semibold">{h.quem}</span>
                <span>{h.o_que}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : null}

      {/* localizacoes */}
      <SectionCard title="Localizacoes">
        <TabelaDeLocalizacoes
          localizacoes={localizacoes}
          visitaId={visitaId}
          aoApagar={() => { recarregar(); aoMudar(); }}
        />
      </SectionCard>
    </div>
  );
}

/* ---------- filtros de status ---------- */
const FILTROS: [FiltroStatus, string][] = [
  ["contestadas", "Contestadas"],
  ["ativas", "Ativas"],
  ["concluidas", "Concluidas"],
  ["canceladas", "Canceladas"],
  ["", "Todas"],
];

/* ---------- item da lista ---------- */
function VisitaNaLista({
  v,
  abrir,
}: {
  v: VisitaItem;
  abrir: () => void;
}) {
  const info = nomeDoStatus[v.status];
  const eContestada = v.status === "disputed";
  return (
    <button
      type="button"
      onClick={abrir}
      data-testid="visita-na-lista"
      className={cn(
        "flex w-full flex-wrap items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left text-xs hover:border-orange-300",
        eContestada ? "border-rose-200 bg-rose-50/40" : "border-slate-200"
      )}
    >
      <CalendarCheck
        className={cn("mt-0.5 h-4 w-4 shrink-0", eContestada ? "text-rose-600" : "text-orange-500")}
      />
      <span className="min-w-0 flex-1">
        <b className="block text-[13px] text-slate-900">
          Visita #{v.id} - {v.cliente.name} com {v.profissional.name}
        </b>
        <span className="block text-slate-500">
          {horaBr(v.scheduled_start)} - {reais(v.total_price)}
        </span>
        <span className="block font-semibold">
          {info ? (
            <StatusBadge label={info.texto} tone={info.tom} />
          ) : (
            <span className="text-slate-500">{v.status}</span>
          )}
        </span>
      </span>
      <span className="text-slate-400">›</span>
    </button>
  );
}

/* ---------- secao principal ---------- */
export function AdminVisitasSection({
  onContestacoes,
}: {
  onContestacoes?: (n: number) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroStatus>("contestadas");
  const [busca, setBusca] = useState("");
  const [buscaFeita, setBuscaFeita] = useState("");
  const [pagina, setPagina] = useState(1);
  const [janela, setJanela] = useState<ConteudoJanela>(null);

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => { setBuscaFeita(busca.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const params = new URLSearchParams();
  if (filtro) params.set("status", filtro);
  if (buscaFeita) params.set("busca", buscaFeita);
  params.set("pagina", String(pagina));

  const { dado, erro, deNovo } = useApi<VisitaListaResposta>(
    `/admin/visitas?${params.toString()}`
  );

  useEffect(() => {
    if (dado?.contestacoes_abertas != null) onContestacoes?.(dado.contestacoes_abertas);
  }, [dado?.contestacoes_abertas, onContestacoes]);

  const totalPaginas = dado ? Math.max(1, Math.ceil(dado.total / (dado.por_pagina || 20))) : 1;

  const abrirDetalhe = (v: VisitaItem) => {
    setJanela({
      titulo: `Visita #${v.id}`,
      sub: `${v.cliente.name} com ${v.profissional.name}`,
      corpo: (
        <DetalheDeVisita
          visitaId={v.id}
          aoMudar={deNovo}
        />
      ),
    });
  };

  return (
    <div className="space-y-3">
      {/* contador de contestacoes abertas */}
      {dado?.contestacoes_abertas != null && dado.contestacoes_abertas > 0 ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800"
          data-testid="contador-contestacoes"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {dado.contestacoes_abertas}{" "}
          {dado.contestacoes_abertas === 1 ? "contestacao aberta" : "contestacoes abertas"} - clique
          em "Contestadas" para ver
        </div>
      ) : null}

      {/* filtros e busca */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist">
          {FILTROS.map(([k, r]) => (
            <button
              key={k || "todas"}
              type="button"
              role="tab"
              aria-selected={filtro === k}
              onClick={() => { setFiltro(k); setPagina(1); }}
              data-testid={`filtro-${k || "todas"}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                filtro === k
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm min-w-[200px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Numero, nome ou e-mail"
            aria-label="Buscar visita"
            className="w-full outline-none text-xs"
          />
        </label>
      </div>

      {/* lista */}
      {erro ? (
        <Erro msg={erro} />
      ) : !dado ? (
        <Carregando />
      ) : !dado.itens.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Nenhuma visita encontrada.
        </p>
      ) : (
        <div className="space-y-1.5" data-testid="lista-de-visitas">
          {dado.itens.map((v) => (
            <VisitaNaLista key={v.id} v={v} abrir={() => abrirDetalhe(v)} />
          ))}
        </div>
      )}

      {/* paginacao */}
      {dado && totalPaginas > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-slate-500">
            Pagina {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      ) : null}

      <Janela conteudo={janela} fechar={() => setJanela(null)} />
    </div>
  );
}
