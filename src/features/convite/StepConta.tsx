import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2, Eye, EyeOff, Mail, Lock, User, CalendarDays, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCpf, validateCpf } from "@/lib/utils";
import type { User as UserType } from "@/lib/Interfaces";

type Props = {
  user: UserType | null;
  onSuccess: () => void;
};

type Mode = "opcoes" | "login" | "cadastro";

// Icone do Google (SVG nativo, sem imagem externa)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormLogin({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await login({ email, password });
      if (ok) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoComplete="email"
            required
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative pl-0">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <div className="pl-9">
            {/* O icone de olho fica dentro do PasswordInput via pr-10 */}
          </div>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            placeholder="Sua senha"
            autoComplete="current-password"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 h-11"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}

function FormCadastro({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termos, setTermos] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfDigits = cpf.replace(/\D/g, "");

    if (!validateCpf(cpfDigits)) {
      toast({ title: "CPF invalido", description: "Verifique os digitos.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "A confirmacao precisa ser igual a senha.", variant: "destructive" });
      return;
    }
    if (!termos) {
      toast({ title: "Aceite os termos", description: "E necessario aceitar os termos para continuar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/users", {
        name: nome.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpfDigits,
        birth: nascimento,
        gender: "Outro",
        type: "contratante",
        password,
        confirmPassword,
        termos_aceitos: true,
      });
      const body = await res.json().catch(() => null);

      if (res.status === 409) {
        toast({
          title: "E-mail ou CPF ja cadastrado",
          description: body?.message || "Tente fazer login.",
          variant: "destructive",
        });
        return;
      }
      if (!res.ok || body?.success === false) {
        toast({
          title: "Erro no cadastro",
          description:
            body?.error?.details?.[0]?.message ||
            body?.message ||
            "Revise os dados e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Cadastro OK: faz login automaticamente
      const loggedIn = await login({ email: email.trim().toLowerCase(), password });
      if (loggedIn) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="cad-nome">Nome completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="cad-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome completo"
            autoComplete="name"
            required
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cad-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="cad-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoComplete="email"
            required
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cad-cpf">
          CPF <span className="text-orange-600">*</span>
        </Label>
        <div className="relative">
          <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="cad-cpf"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            autoComplete="off"
            inputMode="numeric"
            required
            className="pl-9"
          />
        </div>
        <p className="text-xs text-slate-400">Necessario para assinar o contrato.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cad-nascimento">Data de nascimento</Label>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="cad-nascimento"
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            required
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cad-password">Senha</Label>
        <PasswordInput
          id="cad-password"
          value={password}
          onChange={setPassword}
          placeholder="Minimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cad-confirm">Confirmar senha</Label>
        <PasswordInput
          id="cad-confirm"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repita a senha"
          autoComplete="new-password"
        />
      </div>
      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="cad-termos"
          checked={termos}
          onCheckedChange={(v) => setTermos(v === true)}
        />
        <Label htmlFor="cad-termos" className="text-xs leading-relaxed text-slate-600 cursor-pointer">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" rel="noreferrer" className="underline text-orange-600">
            Termos de uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" rel="noreferrer" className="underline text-orange-600">
            Politica de privacidade
          </a>
          .
        </Label>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 h-11"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Criar conta e continuar
      </Button>
    </form>
  );
}

function FormCpf({ user, onSuccess }: { user: UserType; onSuccess: () => void }) {
  const { updateUserLocal } = useAuth();
  const { toast } = useToast();
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cpf.replace(/\D/g, "");
    if (!validateCpf(digits)) {
      toast({ title: "CPF invalido", description: "Verifique os digitos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("PUT", `/users/${user.id}`, { cpf: digits });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Erro ao salvar CPF.");
      }
      updateUserLocal({ cpf: digits });
      toast({ title: "CPF salvo." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao salvar CPF", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-slate-700">
        Sua conta nao tem CPF cadastrado. Voce precisa informar o CPF para assinar o contrato.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="cpf-field">CPF</Label>
        <div className="relative">
          <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="cpf-field"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            required
            className="pl-9"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={saving}
        className="w-full bg-orange-600 hover:bg-orange-700 h-11"
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Salvar e continuar
      </Button>
    </form>
  );
}

export function StepConta({ user, onSuccess }: Props) {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("opcoes");
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Caso especial: usuario logado sem CPF
  const cpfDigits = (user?.cpf || "").replace(/\D/g, "");
  const needsCpf = !!user && cpfDigits.length !== 11;
  if (needsCpf) {
    return (
      <div className="space-y-5" data-testid="step-conta">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Confirmar CPF</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Para assinar voce precisa ter CPF cadastrado.
          </p>
        </div>
        <FormCpf user={user} onSuccess={onSuccess} />
      </div>
    );
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const result = await loginWithGoogle({
          accessToken: tokenResponse.access_token,
          type: "contratante",
          mode: "login",
        });
        if (result?.status === "logged_in" || result?.status === "logged_in_needs_onboarding") {
          onSuccess();
        } else if (result?.status === "registered") {
          toast({
            title: "Conta criada",
            description: "Faca login com Google para continuar.",
          });
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast({ title: "Erro no login com Google", variant: "destructive" });
      setGoogleLoading(false);
    },
  });

  return (
    <div className="space-y-5" data-testid="step-conta">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Entre para assinar</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Faca login ou crie sua conta para assinar o contrato.
        </p>
      </div>

      {mode === "opcoes" && (
        <div className="space-y-3">
          {googleEnabled && (
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-sm font-medium"
              onClick={() => handleGoogleLogin()}
              disabled={googleLoading}
              aria-label="Entrar com Google"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Entrar com Google
            </Button>
          )}

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium"
            onClick={() => setMode("login")}
          >
            Entrar com e-mail e senha
          </Button>
          <Button
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-sm font-medium"
            onClick={() => setMode("cadastro")}
          >
            Criar uma conta nova
          </Button>
        </div>
      )}

      {mode === "login" && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 -ml-1"
            onClick={() => setMode("opcoes")}
          >
            Voltar
          </Button>
          <FormLogin onSuccess={onSuccess} />
          <p className="text-sm text-center text-slate-500">
            Nao tem conta?{" "}
            <button
              type="button"
              onClick={() => setMode("cadastro")}
              className="text-orange-600 font-medium hover:underline"
            >
              Criar uma
            </button>
          </p>
        </div>
      )}

      {mode === "cadastro" && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 -ml-1"
            onClick={() => setMode("opcoes")}
          >
            Voltar
          </Button>
          {googleEnabled && (
            <>
              <Button
                variant="outline"
                className="w-full h-11 gap-3 text-sm font-medium"
                onClick={() => handleGoogleLogin()}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Cadastrar com Google
              </Button>
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">ou</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            </>
          )}
          <FormCadastro onSuccess={onSuccess} />
          <p className="text-sm text-center text-slate-500">
            Ja tem conta?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-orange-600 font-medium hover:underline"
            >
              Entrar
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
