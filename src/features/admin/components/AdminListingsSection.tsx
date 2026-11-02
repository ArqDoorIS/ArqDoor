import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Search, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ADMIN_TOKENS } from "../tokens";
import { cn, formatCurrency, formatDateTime, getFileUrl } from "../utils";
import { EmptyState, PaginationControls, SectionCard, StatusBadge } from "./AdminPrimitives";

/**
 * Publicacoes da plataforma: demandas que clientes postaram e ofertas de servico que
 * prestadores anunciaram.
 *
 * Duas acoes, de proposito separadas:
 *  - Ocultar: reversivel. Some das listagens publicas; o dono continua vendo.
 *  - Apagar:  definitivo. Remove do banco (fica um retrato no log de auditoria).
 */

type ListingType = "demands" | "offers";
type Visibility = "all" | "visible" | "hidden";

type ListingRow = {
  id: number;
  type: "demand" | "offer";
  title: string;
  description: string | null;
  price: number | null;
  status: string | null;
  created_at: string | null;
  images?: string[];
  invites_count?: number;
  profession?: string | null;
  author: {
    user_id: number;
    name: string;
    email: string;
    type: string;
    is_hidden: boolean;
    suspended: boolean;
  } | null;
  admin_hidden: boolean;
  admin_hidden_at: string | null;
  admin_hidden_reason: string | null;
};

type Counts = { demands: { total: number; hidden: number }; offers: { total: number; hidden: number } };

const PAGE_SIZE = 20;

const TYPE_TABS: Array<{ key: ListingType; label: string }> = [
  { key: "demands", label: "Demandas de clientes" },
  { key: "offers", label: "Ofertas de profissionais" },
];

const VISIBILITY_OPTIONS: Array<{ key: Visibility; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "visible", label: "Visíveis" },
  { key: "hidden", label: "Ocultas" },
];

const demandStatusTone = (status: string | null) => {
  if (status === "concluída") return "emerald" as const;
  if (status === "em andamento") return "sky" as const;
  if (status === "cancelada") return "rose" as const;
  // Amarelo fica reservado ao selo "Oculta"; status aberto vai em cinza.
  return "slate" as const;
};

const readError = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body?.message || fallback;
};

export function AdminListingsSection() {
  const [type, setType] = useState<ListingType>("demands");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type,
        visibility,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      const response = await apiRequest("GET", `/admin/listings?${params.toString()}`);
      if (!response.ok) throw new Error(await readError(response, "Erro ao carregar publicações."));
      const body = await response.json();
      setRows(Array.isArray(body?.data) ? body.data : []);
      setCounts(body?.counts || null);
      setTotalPages(body?.pagination?.total_pages || 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar publicações.");
    } finally {
      setLoading(false);
    }
  }, [type, visibility, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeType = (next: ListingType) => {
    setType(next);
    setPage(1);
  };

  const changeVisibility = (next: Visibility) => {
    setVisibility(next);
    setPage(1);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const toggleHidden = async (row: ListingRow) => {
    const hide = !row.admin_hidden;
    let reason: string | null = null;
    if (hide) {
      reason = window.prompt(
        `Ocultar "${row.title}"?\n\nEla some das listagens públicas, mas continua existindo e o autor continua vendo. Dá para reexibir depois.\n\nMotivo (opcional):`,
        ""
      );
      if (reason === null) return;
    }
    const key = `hide-${row.type}-${row.id}`;
    setBusyKey(key);
    setError(null);
    try {
      const response = await apiRequest("PATCH", `/admin/listings/${type}/${row.id}/visibility`, {
        hidden: hide,
        reason: reason || undefined,
      });
      if (!response.ok) throw new Error(await readError(response, "Erro ao alterar visibilidade."));
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Erro ao alterar visibilidade.");
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (row: ListingRow) => {
    const confirmed = window.confirm(
      `APAGAR DEFINITIVAMENTE "${row.title}"?\n\nIsso remove a publicação do banco${row.type === "demand" ? ", junto com as fotos e os convites enviados" : ""}. Não dá para desfazer.\n\nSe a intenção é só tirar do ar, use "Ocultar".`
    );
    if (!confirmed) return;
    const reason = window.prompt("Motivo da exclusão (fica no log de auditoria, opcional):", "");
    if (reason === null) return;
    const key = `delete-${row.type}-${row.id}`;
    setBusyKey(key);
    setError(null);
    try {
      const response = await apiRequest("DELETE", `/admin/listings/${type}/${row.id}`, {
        reason: reason || undefined,
      });
      if (!response.ok) throw new Error(await readError(response, "Erro ao apagar publicação."));
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Erro ao apagar publicação.");
    } finally {
      setBusyKey(null);
    }
  };

  const currentCounts = counts ? counts[type] : null;

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => {
          const tabCounts = counts?.[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeType(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                type === tab.key
                  ? cn(ADMIN_TOKENS.selectable.active, "border-orange-600")
                  : cn(ADMIN_TOKENS.selectable.inactive, "border-slate-200 bg-white")
              )}
            >
              {tab.label}
              {tabCounts ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    type === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {tabCounts.total}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      <SectionCard
        title={type === "demands" ? "Demandas de clientes" : "Ofertas de profissionais"}
        subtitle={
          currentCounts
            ? `${currentCounts.total} no total · ${currentCounts.hidden} oculta${currentCounts.hidden === 1 ? "" : "s"}`
            : "Publicações postadas na plataforma"
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => changeVisibility(option.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                  visibility === option.key ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <form onSubmit={submitSearch} className="flex min-w-[220px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Buscar por título, descrição, nome ou e-mail do autor"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <button type="submit" className={cn("h-9 rounded-lg px-3 text-xs font-semibold", ADMIN_TOKENS.primaryButton)}>
              Buscar
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando publicações...
          </div>
        ) : !rows.length ? (
          <EmptyState
            title="Nada por aqui"
            description={
              search || visibility !== "all"
                ? "Nenhuma publicação com esses filtros."
                : type === "demands"
                  ? "Quando clientes postarem demandas, elas aparecem aqui."
                  : "Quando profissionais anunciarem serviços, eles aparecem aqui."
            }
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const hideBusy = busyKey === `hide-${row.type}-${row.id}`;
              const deleteBusy = busyKey === `delete-${row.type}-${row.id}`;
              const firstImage = row.images?.[0] ? getFileUrl(row.images[0]) : null;
              return (
                <li
                  key={`${row.type}-${row.id}`}
                  className={cn(
                    "rounded-xl border p-3",
                    row.admin_hidden ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{row.title}</p>
                        <span className="text-xs text-slate-400">#{row.id}</span>
                        {row.admin_hidden ? <StatusBadge label="Oculta" tone="amber" /> : null}
                        {row.type === "demand" && row.status ? (
                          <StatusBadge label={row.status} tone={demandStatusTone(row.status)} />
                        ) : null}
                        {row.profession ? <StatusBadge label={row.profession} tone="sky" /> : null}
                      </div>
                      {row.description ? (
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{row.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {row.price != null ? formatCurrency(row.price) : "Sem valor"}
                        </span>
                        <span>
                          {row.author ? (
                            <>
                              {row.author.name} · {row.author.email}
                              {row.author.suspended ? " · conta suspensa" : ""}
                              {row.author.is_hidden ? " · perfil invisível" : ""}
                            </>
                          ) : (
                            "Autor removido"
                          )}
                        </span>
                        <span>Postada {formatDateTime(row.created_at)}</span>
                        {row.type === "demand" ? (
                          <span>
                            {row.invites_count || 0} convite{row.invites_count === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      {row.admin_hidden ? (
                        <p className="mt-2 text-xs text-amber-800">
                          Oculta {formatDateTime(row.admin_hidden_at)}
                          {row.admin_hidden_reason ? ` — ${row.admin_hidden_reason}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => void toggleHidden(row)}
                        disabled={Boolean(busyKey)}
                        className={cn(
                          "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60",
                          row.admin_hidden
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        )}
                      >
                        {hideBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : row.admin_hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {row.admin_hidden ? "Reexibir" : "Ocultar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row)}
                        disabled={Boolean(busyKey)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {deleteBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Apagar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && totalPages > 1 ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
