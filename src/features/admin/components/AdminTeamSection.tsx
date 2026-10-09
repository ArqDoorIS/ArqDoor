/**
 * Equipe administrativa.
 *
 * É onde se concede e revoga acesso ao painel, então é a tela mais perigosa do admin:
 * um clique aqui dá a alguém o poder de aprovar RG e pagar repasse. O desenho assume isso:
 *
 *   - promover a owner pede confirmação, com o nome à vista. Owner gerencia a própria
 *     equipe, ou seja, quem vira owner pode promover mais gente;
 *   - desativar pede confirmação e avisa que derruba as sessões abertas na hora;
 *   - o backend impede rebaixar ou desativar o último owner. A tela também esconde a
 *     opção, mas a trava que vale é a do servidor.
 *
 * Quem entra usa e-mail e senha da própria conta do ArqDoor, e em dispositivo novo recebe
 * um código por e-mail (ADR-002). Definir a senha de alguém é um passo explícito no
 * servidor, via scripts/set-admin-password.js.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCcw, ShieldCheck, UserPlus } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard, StatusBadge } from "./AdminPrimitives";
import { formatDateTime } from "../utils";

type PapelAdmin = "owner" | "reviewer";

type MembroDoAdmin = {
  id: number;
  user_id: number;
  role: PapelAdmin;
  active: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at?: string;
  user: { id: number; name: string; email: string } | null;
};

const DESCRICAO_DO_PAPEL: Record<PapelAdmin, string> = {
  owner: "Acesso total, inclusive gerenciar esta equipe.",
  reviewer: "Só o dashboard e a fila de verificação de documentos.",
};

export function AdminTeamSection() {
  const [membros, setMembros] = useState<MembroDoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  const [novoEmail, setNovoEmail] = useState("");
  const [novoPapel, setNovoPapel] = useState<PapelAdmin>("reviewer");
  const [adicionando, setAdicionando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await apiRequest("GET", "/admin/members");
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.message || "Não foi possível carregar a equipe.");
        return;
      }
      setMembros(corpo?.data ?? []);
      setErro(null);
    } catch {
      // Erro de rede NÃO pode virar lista vazia: "nenhum membro" e "não consegui
      // carregar" são coisas diferentes, e confundir as duas já enganou a gente antes.
      setErro("Não foi possível carregar a equipe.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ownersAtivos = membros.filter((m) => m.role === "owner" && m.active).length;

  const adicionar = async () => {
    const email = novoEmail.trim();
    if (!email) return;

    if (novoPapel === "owner") {
      const ok = window.confirm(
        `Dar acesso de OWNER a ${email}?\n\nOwner pode aprovar documentos, pagar repasses, excluir usuários e promover outras pessoas.`
      );
      if (!ok) return;
    }

    setAdicionando(true);
    try {
      const resposta = await apiRequest("POST", "/admin/members", {
        email,
        role: novoPapel,
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.message || "Não foi possível adicionar.");
        return;
      }
      setNovoEmail("");
      setNovoPapel("reviewer");
      setErro(null);
      await carregar();
    } finally {
      setAdicionando(false);
    }
  };

  const atualizar = async (membro: MembroDoAdmin, mudancas: Record<string, unknown>) => {
    setSalvandoId(membro.id);
    try {
      const resposta = await apiRequest("PATCH", `/admin/members/${membro.id}`, mudancas);
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.message || "Não foi possível atualizar.");
        return;
      }
      setErro(null);
      await carregar();
    } finally {
      setSalvandoId(null);
    }
  };

  const revogarSessoes = async (membro: MembroDoAdmin) => {
    const nome = membro.user?.name || membro.user?.email || `membro ${membro.id}`;
    if (!window.confirm(`Encerrar todas as sessões abertas de ${nome}?`)) return;
    setSalvandoId(membro.id);
    try {
      await apiRequest("POST", `/admin/members/${membro.id}/revoke-sessions`);
      await carregar();
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Dar acesso ao painel"
        subtitle="A pessoa precisa já ter conta no ArqDoor. O acesso é concedido ao e-mail dela."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1.5">
            <span className="text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Papel</span>
            <select
              value={novoPapel}
              onChange={(e) => setNovoPapel(e.target.value as PapelAdmin)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 sm:w-48"
            >
              <option value="reviewer">Reviewer</option>
              <option value="owner">Owner</option>
            </select>
          </label>

          <Button onClick={adicionar} disabled={adicionando || !novoEmail.trim()}>
            {adicionando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Adicionar
          </Button>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">{DESCRICAO_DO_PAPEL[novoPapel]}</p>
      </SectionCard>

      <SectionCard
        title="Quem tem acesso"
        subtitle="Mudança de papel e desativação derrubam as sessões abertas na hora."
        action={
          <Button variant="outline" size="sm" onClick={() => void carregar()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        }
      >
        {erro ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        {carregando ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando equipe...
          </div>
        ) : membros.length === 0 && !erro ? (
          <EmptyState title="Nenhum membro" description="Ninguém tem acesso ao painel ainda." />
        ) : (
          <div className="space-y-3">
            {membros.map((membro) => {
              const salvando = salvandoId === membro.id;
              const ultimoOwner = membro.role === "owner" && membro.active && ownersAtivos <= 1;
              const travado =
                membro.locked_until && new Date(membro.locked_until).getTime() > Date.now();

              return (
                <div
                  key={membro.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {membro.user?.name || `Usuário ${membro.user_id}`}
                      </p>
                      <p className="truncate text-xs text-slate-500">{membro.user?.email}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Último acesso: {membro.last_login_at ? formatDateTime(membro.last_login_at) : "nunca"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={membro.role === "owner" ? "Owner" : "Reviewer"}
                        tone={membro.role === "owner" ? "amber" : "slate"}
                      />
                      <StatusBadge
                        label={membro.active ? "Ativo" : "Desativado"}
                        tone={membro.active ? "emerald" : "rose"}
                      />
                      {travado ? <StatusBadge label="Travado" tone="rose" /> : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {ultimoOwner ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Último owner ativo: promova outra pessoa antes de mudar este.
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salvando}
                          onClick={() => {
                            const alvo: PapelAdmin = membro.role === "owner" ? "reviewer" : "owner";
                            if (alvo === "owner") {
                              const nome = membro.user?.name || membro.user?.email || "";
                              if (
                                !window.confirm(
                                  `Promover ${nome} a OWNER?\n\nOwner pode pagar repasses, excluir usuários e promover outras pessoas.`
                                )
                              ) {
                                return;
                              }
                            }
                            void atualizar(membro, { role: alvo });
                          }}
                        >
                          {membro.role === "owner" ? "Rebaixar a reviewer" : "Promover a owner"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={salvando}
                          onClick={() => {
                            const nome = membro.user?.name || membro.user?.email || "";
                            if (membro.active) {
                              if (
                                !window.confirm(
                                  `Desativar ${nome}?\n\nO acesso cai na hora e as sessões abertas são encerradas.`
                                )
                              ) {
                                return;
                              }
                            }
                            void atualizar(membro, { active: !membro.active });
                          }}
                        >
                          {membro.active ? "Desativar" : "Reativar"}
                        </Button>
                      </>
                    )}

                    {travado ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvando}
                        onClick={() => void atualizar(membro, { unlock: true })}
                      >
                        Destravar
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={salvando}
                      onClick={() => void revogarSessoes(membro)}
                    >
                      Encerrar sessões
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          A pessoa entra com o e-mail e a senha da conta dela no ArqDoor. Em um dispositivo
          novo, um código de 6 dígitos chega por e-mail antes de a sessão abrir.
        </p>
      </SectionCard>
    </div>
  );
}
