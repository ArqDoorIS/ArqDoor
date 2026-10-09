/**
 * Entrada do painel, em dois passos.
 *
 *   1. e-mail e senha;
 *   2. se o aparelho for desconhecido, um código de 6 dígitos que chega por e-mail.
 *
 * Isto substituiu a allowlist de IP no nginx, que trancava o próprio time fora a cada
 * rotação do provedor e, de tão afrouxada, não protegia mais.
 *
 * A tela do segundo passo diz qual dispositivo pediu o código e o que fazer se não foi a
 * pessoa. Código chegando sem ninguém ter tentado entrar significa que alguém sabe a
 * senha, e isso precisa estar escrito na hora, não num manual.
 */
import type { FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";

import type { DesafioDeDispositivo } from "../hooks/useAdminSession";

type AdminLoginViewProps = {
  email: string;
  password: string;
  authSubmitting: boolean;
  authError: string | null;
  desafio: DesafioDeDispositivo | null;
  codigo: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCodigoChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onVerificar: (event: FormEvent) => void;
  onCancelar: () => void;
};

const caixa =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-50";

export function AdminLoginView({
  email,
  password,
  authSubmitting,
  authError,
  desafio,
  codigo,
  onEmailChange,
  onPasswordChange,
  onCodigoChange,
  onSubmit,
  onVerificar,
  onCancelar,
}: AdminLoginViewProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              ArqDoor Admin
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {desafio ? "Confirme que é você" : "Painel interno da operação"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {desafio
                ? "Enviamos um código de 6 dígitos para o seu e-mail."
                : "Acesso restrito para acompanhamento de contratos, pagamentos, documentos e conversas."}
            </p>
          </div>

          {desafio ? (
            <form className="space-y-4" onSubmit={onVerificar}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Código do e-mail</span>
                <input
                  value={codigo}
                  onChange={(event) => onCodigoChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-3xl font-semibold tracking-[0.5em] text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
                />
              </label>

              <p className="text-xs leading-5 text-slate-500">
                Pedido a partir de <strong>{desafio.deviceLabel}</strong>. Vamos lembrar deste
                dispositivo, então da próxima vez só a senha basta.
              </p>

              <button
                type="submit"
                disabled={authSubmitting || codigo.length < 6}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
              >
                {authSubmitting ? "Verificando..." : "Entrar no painel"}
              </button>

              <button
                type="button"
                onClick={onCancelar}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Usar outra conta
              </button>

              {authError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {authError}
                </div>
              ) : null}

              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Recebeu este código sem ter tentado entrar? Alguém sabe a sua senha. Troque a
                  senha e avise a equipe. Sem o código ninguém entra.
                </span>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email administrativo</span>
                <div className={caixa}>
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="voce@arqdoor.com"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Senha</span>
                <div className={caixa}>
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="********"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={authSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
              >
                {authSubmitting ? "Entrando..." : "Entrar no painel"}
              </button>

              {authError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {authError}
                </div>
              ) : null}
            </form>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            CPF, senha de login e senha de contrato ficam fora desse painel por padrão.
          </div>
        </div>
      </div>
    </div>
  );
}
