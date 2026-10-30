import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, KeyRound, Loader2, MapPin, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminUserProfile, AdminUserProfileUpdate } from "../types";

type FormState = {
  name: string;
  email: string;
  phone: string;
  birth: string;
  gender: AdminUserProfile["account"]["gender"];
  cpf: string;
  cnpj: string;
  accountType: AdminUserProfile["account"]["type"];
  perfilCompleto: boolean;
  active: boolean;
  hidden: boolean;
  emailVerified: boolean;
  password: string;
  passwordConfirmation: string;
  profession: string;
  about: string;
  paymentPreference: "per_step" | "at_end" | "custom";
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  typeLocation: "Residencial" | "Comercial";
  latitude: string;
  longitude: string;
};

type AdminUserEditorPanelProps = {
  profile: AdminUserProfile | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  onSave: (data: AdminUserProfileUpdate) => Promise<boolean | void> | boolean | void;
};

const inputDate = (value: string | null) => (value ? value.slice(0, 10) : "");
const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

const buildForm = (profile: AdminUserProfile): FormState => ({
  name: profile.account.name,
  email: profile.account.email,
  phone: text(profile.account.phone),
  birth: inputDate(profile.account.birth),
  gender: profile.account.gender,
  cpf: text(profile.account.cpf),
  cnpj: text(profile.account.cnpj),
  accountType: profile.account.type,
  perfilCompleto: profile.account.perfil_completo,
  active: profile.account.is_active,
  hidden: profile.account.is_hidden,
  emailVerified: profile.account.is_email_verified,
  password: "",
  passwordConfirmation: "",
  profession: text(profile.provider?.profession),
  about: text(profile.provider?.about),
  paymentPreference: profile.provider?.payment_preference || "at_end",
  cep: text(profile.location?.cep),
  state: text(profile.location?.state),
  city: text(profile.location?.city),
  neighborhood: text(profile.location?.neighborhood),
  street: text(profile.location?.street),
  number: text(profile.location?.number),
  typeLocation: profile.location?.typeLocation || "Residencial",
  latitude: text(profile.location?.latitude),
  longitude: text(profile.location?.longitude),
});

const calculateAge = (birth: string) => {
  if (!birth) return null;
  const date = new Date(`${birth}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasNotHadBirthday =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  if (hasNotHadBirthday) age -= 1;
  return age >= 0 ? age : null;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b border-slate-100 py-2">
      <Label className="text-sm text-slate-700">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function AdminUserEditorPanel({
  profile,
  loading,
  error,
  saving,
  saveError,
  onSave,
}: AdminUserEditorPanelProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm(buildForm(profile));
      setFormError(null);
    }
  }, [profile]);

  const age = useMemo(() => calculateAge(form?.birth || ""), [form?.birth]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-slate-500">Carregando cadastro...</div>;
  }
  if (error) {
    return <div className="border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">{error}</div>;
  }
  if (!profile || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (form.password && form.password !== form.passwordConfirmation) {
      setFormError("A confirmação da nova senha não confere.");
      return;
    }
    const isProvider = form.accountType === "prestador";
    const typeChanged = form.accountType !== profile.account.type;

    if (isProvider && form.profession.trim() === "" && (profile.provider || typeChanged)) {
      setFormError("Informe a profissão do prestador.");
      return;
    }
    if (typeChanged) {
      const target = isProvider ? "prestador" : "cliente";
      const confirmed = window.confirm(
        `Trocar a conta de ${profile.account.name} para ${target}? ` +
          "O usuário precisa sair e entrar de novo no app para ver o novo perfil."
      );
      if (!confirmed) return;
    }

    const hasLocation = Boolean(
      profile.location ||
        [form.cep, form.state, form.city, form.neighborhood, form.street, form.number, form.latitude, form.longitude].some(Boolean)
    );
    const hasProviderUpdate =
      isProvider &&
      Boolean(profile.provider || form.profession || form.about);

    const payload: AdminUserProfileUpdate = {
      account: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        birth: form.birth,
        gender: form.gender,
        cpf: form.cpf.trim() || null,
        cnpj: form.cnpj.trim() || null,
        ...(typeChanged ? { type: form.accountType } : {}),
        perfil_completo: form.perfilCompleto,
        is_active: form.active,
        is_hidden: form.hidden,
        is_email_verified: form.emailVerified,
        ...(form.password ? { password: form.password } : {}),
      },
      ...(hasProviderUpdate
        ? {
            provider: {
              profession: form.profession.trim(),
              about: form.about.trim() || null,
              payment_preference: form.paymentPreference,
            },
          }
        : {}),
      ...(hasLocation
        ? {
            location: {
              cep: form.cep.trim() || null,
              state: form.state.trim() || null,
              city: form.city.trim() || null,
              neighborhood: form.neighborhood.trim() || null,
              street: form.street.trim() || null,
              number: form.number.trim() || null,
              typeLocation: form.typeLocation,
              latitude: form.latitude.trim() ? Number(form.latitude) : null,
              longitude: form.longitude.trim() ? Number(form.longitude) : null,
            },
          }
        : {}),
    };

    await onSave(payload);
  };

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Cadastro de {profile.account.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {profile.account.type === "prestador" ? "Prestador" : "Cliente"}
            {age !== null ? ` · ${age} anos` : ""}
            {` · ${profile.account.auth_provider === "google" ? "Google" : "Senha"}`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setForm(buildForm(profile));
            setFormError(null);
          }}
          disabled={saving}
        >
          Restaurar
        </Button>
      </div>

      {(formError || saveError) && (
        <div className="border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          {formError || saveError}
        </div>
      )}

      <section className="border-b border-slate-200 pb-7">
        <SectionTitle icon={<UserRound className="h-4 w-4" />} title="Conta e identidade" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome completo"><Input value={form.name} onChange={(event) => set("name", event.target.value)} required /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></Field>
          <Field label="Telefone"><Input inputMode="tel" value={form.phone} onChange={(event) => set("phone", event.target.value.replace(/\D/g, "").slice(0, 11))} /></Field>
          <Field label="Data de nascimento"><Input type="date" value={form.birth} onChange={(event) => set("birth", event.target.value)} required /></Field>
          <Field label="Gênero">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.gender} onChange={(event) => set("gender", event.target.value as FormState["gender"])}>
              <option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Prefiro não dizer">Prefiro não dizer</option>
            </select>
          </Field>
          <Field label="CPF"><Input inputMode="numeric" value={form.cpf} onChange={(event) => set("cpf", event.target.value.replace(/\D/g, "").slice(0, 11))} /></Field>
          <Field label="CNPJ"><Input inputMode="numeric" value={form.cnpj} onChange={(event) => set("cnpj", event.target.value.replace(/\D/g, "").slice(0, 14))} /></Field>
          <Field label="Tipo de conta">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.accountType} onChange={(event) => set("accountType", event.target.value as FormState["accountType"])}>
              <option value="contratante">Cliente</option><option value="prestador">Prestador</option>
            </select>
          </Field>
        </div>
        {form.accountType !== profile.account.type && (
          <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {form.accountType === "prestador"
              ? profile.provider
                ? "A conta volta a ser prestador com o perfil profissional que já tinha."
                : "Preencha a profissão em Perfil profissional para criar o perfil de prestador."
              : "O perfil profissional fica guardado e volta se a conta virar prestador de novo."}
            {" "}A troca é recusada se houver contrato ou visita em aberto.
          </p>
        )}
        <div className="mt-4 grid gap-x-8 md:grid-cols-3">
          <ToggleField label="Perfil completo" checked={form.perfilCompleto} onCheckedChange={(checked) => set("perfilCompleto", checked)} />
          <ToggleField label="Conta ativa" checked={form.active} onCheckedChange={(checked) => set("active", checked)} />
          <ToggleField label="Ocultar do app" checked={form.hidden} onCheckedChange={(checked) => set("hidden", checked)} />
          <ToggleField label="E-mail verificado" checked={form.emailVerified} onCheckedChange={(checked) => set("emailVerified", checked)} />
        </div>
      </section>

      <section className="border-b border-slate-200 pb-7">
        <SectionTitle icon={<KeyRound className="h-4 w-4" />} title="Redefinir senha" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Nova senha"><Input type="password" autoComplete="new-password" value={form.password} onChange={(event) => set("password", event.target.value)} /></Field>
          <Field label="Confirmar nova senha"><Input type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(event) => set("passwordConfirmation", event.target.value)} /></Field>
        </div>
      </section>

      {form.accountType === "prestador" && (
        <section className="border-b border-slate-200 pb-7">
          <SectionTitle icon={<BriefcaseBusiness className="h-4 w-4" />} title="Perfil profissional" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Profissão"><Input value={form.profession} onChange={(event) => set("profession", event.target.value)} /></Field>
            <Field label="Recebimento padrão">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.paymentPreference} onChange={(event) => set("paymentPreference", event.target.value as FormState["paymentPreference"])}>
                <option value="per_step">Por etapa</option><option value="at_end">Ao final</option><option value="custom">Personalizado</option>
              </select>
            </Field>
            <div className="md:col-span-2"><Field label="Apresentação"><Textarea value={form.about} onChange={(event) => set("about", event.target.value)} rows={4} /></Field></div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={<MapPin className="h-4 w-4" />} title="Localização" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="CEP"><Input inputMode="numeric" value={form.cep} onChange={(event) => set("cep", event.target.value.replace(/\D/g, "").slice(0, 8))} /></Field>
          <Field label="UF"><Input value={form.state} maxLength={2} onChange={(event) => set("state", event.target.value.toUpperCase())} /></Field>
          <Field label="Cidade"><Input value={form.city} onChange={(event) => set("city", event.target.value)} /></Field>
          <Field label="Bairro"><Input value={form.neighborhood} onChange={(event) => set("neighborhood", event.target.value)} /></Field>
          <Field label="Logradouro"><Input value={form.street} onChange={(event) => set("street", event.target.value)} /></Field>
          <Field label="Número"><Input value={form.number} onChange={(event) => set("number", event.target.value)} /></Field>
          <Field label="Tipo"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.typeLocation} onChange={(event) => set("typeLocation", event.target.value as FormState["typeLocation"])}><option value="Residencial">Residencial</option><option value="Comercial">Comercial</option></select></Field>
          <Field label="Latitude"><Input inputMode="decimal" value={form.latitude} onChange={(event) => set("latitude", event.target.value)} /></Field>
          <Field label="Longitude"><Input inputMode="decimal" value={form.longitude} onChange={(event) => set("longitude", event.target.value)} /></Field>
        </div>
      </section>

      <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-white py-4">
        <Button type="submit" disabled={saving} className="bg-orange-600 text-white hover:bg-orange-700">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar cadastro
        </Button>
      </div>
    </form>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">{icon}{title}</h3>;
}
