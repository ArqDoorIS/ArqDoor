
// src/components/AuthModals.tsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Mail, Lock, UserRound, CalendarDays, Eye, EyeOff, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RegisterInterface, LoginInterface } from "@/lib/Interfaces";
import { useGoogleLogin } from "@react-oauth/google";
import { apiRequest } from "@/lib/queryClient";

// --- Small helpers -----------------------------------------------------------

// O modal de cadastro passa da altura de um celular (1011 px numa tela de 844). Sem teto e
// sem rolagem, o título, o X e o fim do formulário ficavam fora da tela.
// Spec 2026-11-site-paleta-do-app.
const CONTEUDO_DO_MODAL =
  "w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto border-0 bg-transparent p-0 shadow-none";

// Mesma altura, fonte e foco do <Input>.
const CAMPO_DE_SELECAO =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
function DialogShell({
  title,
  description,
  children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-background shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44" />

      <div className="relative p-7 sm:p-8">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft ring-1 ring-brand/30">
              <BadgeCheck className="h-5 w-5 text-brand" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-muted-foreground">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {children}
      </div>
    </div>
  );
}

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <FieldIcon icon={Lock} />
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10"
      />
      <button
        type="button"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-2 inline-flex items-center rounded-md px-2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="relative my-2 flex items-center">
      <div className="h-px w-full bg-border" />
      {label ? (
        <span className="mx-2 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="h-px w-full bg-border" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
      <path fill="#EA4335" d="M24 9.5c3.15 0 5.98 1.08 8.21 3.2l6.12-6.12C34.8 3.01 29.76 1 24 1 14.62 1 6.51 6.68 2.88 14.56l7.14 5.54C11.7 14.29 17.27 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.14 24.5c0-1.58-.14-3.09-.4-4.5H24v8.5h12.45c-.54 2.76-2.14 5.1-4.54 6.66l7.01 5.44C43.87 36.64 46.14 30.96 46.14 24.5z" />
      <path fill="#FBBC05" d="M10.02 28.9c-.45-1.35-.71-2.79-.71-4.4 0-1.62.26-3.05.71-4.4l-7.14-5.54C1.64 17.24 1 20.02 1 23c0 2.98.64 5.76 1.88 8.34l7.14-5.54z" />
      <path fill="#34A853" d="M24 47c6.48 0 11.9-2.13 15.86-5.82l-7.01-5.44c-1.95 1.31-4.44 2.11-7.4 2.11-6.73 0-12.3-4.79-14.1-11.27l-7.14 5.54C6.51 41.32 14.62 47 24 47z" />
      <path fill="none" d="M1 1h46v46H1z" />
    </svg>
  );
}

// --- Component ---------------------------------------------------------------
export const AuthModals: React.FC<{
  isLoginOpen: boolean;
  isRegisterOpen: boolean;
  onLoginClose: () => void;
  onRegisterClose: () => void;
  onSuccess?: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
  preFilledEmail?: string;
}> = ({
  isLoginOpen,
  isRegisterOpen,
  onLoginClose,
  onRegisterClose,
  onSuccess,
  onSwitchToRegister,
  onSwitchToLogin,
  preFilledEmail = "",
}) => {
    const { toast } = useToast();
    const { login, register, loginWithGoogle } = useAuth();
    const [loginLoading, setLoginLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
    const [googleRegisterLoading, setGoogleRegisterLoading] = useState(false);
    const [emailToPreFill, setEmailToPreFill] = useState<string>("");
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const googleModeRef = useRef<"login" | "register" | null>(null);
    const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // forms
    const loginForm = useForm<LoginInterface>({
      defaultValues: { email: "", password: "" },
    });
    const registerForm = useForm<RegisterInterface>({
      defaultValues: {
        name: "",
        email: "",
        gender: "",
        birth: "",
        type: "contratante",
        password: "",
        confirmPassword: "",
        termos_aceitos: false,
      },
    });

  // Pre-fill email in login form when provided
  useEffect(() => {
    if (preFilledEmail && isLoginOpen) {
      loginForm.setValue("email", preFilledEmail);
    }
  }, [preFilledEmail, isLoginOpen, loginForm]);

  // Pre-fill email from internal state (after registration)
  useEffect(() => {
    if (emailToPreFill && isLoginOpen) {
      loginForm.setValue("email", emailToPreFill);
      setEmailToPreFill(""); // Clear after setting
    }
  }, [emailToPreFill, isLoginOpen, loginForm]);

    const googleAuth = useGoogleLogin({
      flow: "implicit",
      scope: "openid email profile",
      onSuccess: async (tokenResponse) => {
        const mode = googleModeRef.current;
        const isRegisterMode = mode === "register";
        const selectedType = registerForm.getValues("type");
        const userType =
          isRegisterMode && selectedType === "prestador"
            ? "prestador"
            : isRegisterMode
            ? "contratante"
            : undefined;

        if (!tokenResponse?.access_token) {
          toast({
            title: "Erro no login com Google",
            description: "Token não recebido. Tente novamente.",
            variant: "destructive",
          });
          if (isRegisterMode) {
            setGoogleRegisterLoading(false);
          } else {
            setGoogleLoginLoading(false);
          }
          googleModeRef.current = null;
          return;
        }

        try {
          const result = await loginWithGoogle({
            accessToken: tokenResponse?.access_token,
            type: userType,
            mode: mode || "login",
          });

          if (isRegisterMode) {
            // Registration via Google - don't auto-login
            if (result?.status === "registered") {
              onRegisterClose();
              onSwitchToLogin();
            } else if (result?.status === "already_connected") {
              onSwitchToLogin();
            }
          } else {
          // Login via Google
            if (result?.status === "logged_in" || result?.status === "logged_in_needs_onboarding") {
              onSuccess?.();
            } else if (result?.status === "already_connected") {
              onSwitchToLogin();
            }
          }
        } catch (err) {
          toast({
            title: "Erro no login com Google",
            description: (err as Error)?.message || "Não foi possível concluir o login.",
            variant: "destructive",
          });
        } finally {
          if (isRegisterMode) {
            setGoogleRegisterLoading(false);
          } else {
            setGoogleLoginLoading(false);
          }
          googleModeRef.current = null;
        }
      },
      onError: () => {
        toast({
          title: "Erro no login com Google",
          description: "Não foi possível abrir o login. Verifique se pop-ups estão liberados.",
          variant: "destructive",
        });
        const mode = googleModeRef.current;
        if (mode === "register") {
          setGoogleRegisterLoading(false);
        } else {
          setGoogleLoginLoading(false);
        }
        googleModeRef.current = null;
      },
    });

    const handleGoogleClick = (mode: "login" | "register") => {
      if (!googleEnabled) {
        toast({
          title: "Google login indisponível",
          description: "Defina VITE_GOOGLE_CLIENT_ID para habilitar o login social.",
          variant: "destructive",
        });
        return;
      }
      googleModeRef.current = mode;
      if (mode === "register") {
        setGoogleRegisterLoading(true);
      } else {
        setGoogleLoginLoading(true);
      }
      try {
        googleAuth();
      } catch (err) {
        toast({
          title: "Erro ao iniciar Google",
          description: "Não foi possível abrir o login, tente novamente.",
          variant: "destructive",
        });
        if (mode === "register") {
          setGoogleRegisterLoading(false);
        } else {
          setGoogleLoginLoading(false);
        }
        googleModeRef.current = null;
      }
    };

    async function handleLogin(data: LoginInterface) {
      // Validação client-side antes de bater no backend.
      // Evita roundtrip pra erros óbvios e dá feedback imediato.
      const email = data.email?.trim() || "";
      const password = data.password || "";
      if (!email) {
        toast({
          title: "Email obrigatório",
          description: "Informe seu email pra continuar.",
          variant: "destructive",
        });
        return;
      }
      // Validação simples de formato — não substitui validação do backend
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: "Email inválido",
          description: "Formato de email inválido. Ex: voce@exemplo.com",
          variant: "destructive",
        });
        return;
      }
      if (!password) {
        toast({
          title: "Senha obrigatória",
          description: "Informe sua senha pra continuar.",
          variant: "destructive",
        });
        return;
      }

      setLoginLoading(true);
      try {
        const ok = await login(data);
        if (ok) {
          onSuccess?.();
        }
      } catch (err) {
        toast({
          title: "Erro no login",
          description: (err as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoginLoading(false);
      }
    }

    async function handleRegister(data: RegisterInterface) {
      // validações rápidas
      if (!data.name?.trim())
        return toast({ title: "Nome inválido", description: "Preencha o nome.", variant: "destructive" });
      if (data.name.trim().length < 3)
        return toast({ title: "Nome inválido", description: "Informe pelo menos 3 caracteres no nome.", variant: "destructive" });
      if (!data.email?.trim())
        return toast({ title: "Email inválido", description: "Preencha um email válido.", variant: "destructive" });
      if (!data.gender)
        return toast({ title: "Gênero não preenchido", description: "Selecione o gênero.", variant: "destructive" });
      if (!data.birth)
        return toast({ title: "Nascimento não preenchido", description: "Informe a data de nascimento.", variant: "destructive" });
      if (!data.password)
        return toast({ title: "Senha obrigatória", description: "Informe sua senha.", variant: "destructive" });
      if (data.password.length < 6)
        return toast({ title: "Senha inválida", description: "A senha precisa ter pelo menos 6 caracteres.", variant: "destructive" });
      if (data.password !== data.confirmPassword)
        return toast({ title: "Senhas não coincidem", description: "As senhas devem ser iguais.", variant: "destructive" });
      if (!data.termos_aceitos)
        return toast({ title: "Termos não aceitos", description: "Aceite os termos para continuar.", variant: "destructive" });

      try {
        setRegisterLoading(true);
        const selectedType = data.type === "prestador" ? "prestador" : "contratante";
        const registerData: RegisterInterface = {
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          gender: data.gender,
          birth: data.birth,
          type: selectedType === "prestador" ? "prestador" : "contratante",
          termos_aceitos: data.termos_aceitos,
        };

        const registered = await register(registerData);
        if (!registered) return;

        // Don't auto-login, redirect to login with email pre-filled
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Faça login para continuar",
        });

        setEmailToPreFill(registerData.email);
        onRegisterClose();
        onSwitchToLogin();
      } catch (err) {
        toast({
          title: "Erro no cadastro",
          description: (err as Error).message,
          variant: "destructive"
        });
      } finally {
        setRegisterLoading(false);
      }
    }

    // subtle password meter (client-side only, visual)
    const passwordScore = useMemo(() => {
      const p = registerForm.getValues("password");
      let s = 0;
      if (p?.length >= 6) s++;
      if (/[A-Z]/.test(p || "")) s++;
      if (/[0-9]/.test(p || "")) s++;
      if (/[^A-Za-z0-9]/.test(p || "")) s++;
      return s; // 0..4
    }, [registerForm.watch("password")]);

    async function handleForgotPassword() {
      if (!forgotEmail.trim()) {
        toast({ title: "Informe o e-mail", variant: "destructive" });
        return;
      }
      setForgotLoading(true);
      try {
        const res = await apiRequest("POST", "/auth/forgot-password", { email: forgotEmail.trim() });
        const json = await res.json();
        if (json.success) {
          setForgotSent(true);
        } else {
          toast({ title: json.message || "Erro ao enviar e-mail", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erro ao enviar e-mail", variant: "destructive" });
      } finally {
        setForgotLoading(false);
      }
    }

    return (
      <>
        {/* FORGOT PASSWORD */}
        <Dialog open={forgotOpen} onOpenChange={(v) => { setForgotOpen(v); if (!v) { setForgotSent(false); setForgotEmail(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Esqueci minha senha</DialogTitle>
              <DialogDescription>
                {forgotSent
                  ? "Verifique seu e-mail — enviamos o link de redefinição."
                  : "Informe seu e-mail e enviaremos um link para redefinir a senha."}
              </DialogDescription>
            </DialogHeader>
            {!forgotSent ? (
              <div className="space-y-4 pt-1">
                <Input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                />
                <Button className="w-full" disabled={forgotLoading} onClick={handleForgotPassword}>
                  {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full mt-2" onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(""); }}>
                Fechar
              </Button>
            )}
          </DialogContent>
        </Dialog>

        {/* LOGIN */}
        <Dialog open={isLoginOpen} onOpenChange={onLoginClose}>
          <DialogContent className={CONTEUDO_DO_MODAL + " max-w-md"}>
            <DialogShell title="Login" description="Entre com seu e‑mail e senha.">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E‑mail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FieldIcon icon={Mail} />
                            <Input type="email" {...field} className="pl-9" placeholder="voce@exemplo.com" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <PasswordInput value={field.value} onChange={field.onChange} placeholder="••••••••" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-left">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:underline"
                      onClick={() => setForgotOpen(true)}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <Button type="submit" disabled={loginLoading} className="w-full">
                    {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={googleLoginLoading || !googleEnabled}
                    className="w-full"
                    onClick={() => handleGoogleClick("login")}
                  >
                    {googleLoginLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="mr-2 inline-flex">
                        <GoogleIcon />
                      </span>
                    )}
                    Fazer login com Google
                  </Button>
                  <div className="text-center text-sm">
                    <button
                      type="button"
                      className="font-medium text-brand hover:underline"
                      onClick={onSwitchToRegister}
                    >
                      Criar uma conta
                    </button>
                  </div>
                </form>
              </Form>
            </DialogShell>
          </DialogContent>
        </Dialog>

        {/* REGISTER */}
        <Dialog open={isRegisterOpen} onOpenChange={onRegisterClose}>
          <DialogContent className={CONTEUDO_DO_MODAL + " max-w-lg"}>
            <DialogShell title="Criar conta" description="Preencha os dados para começar.">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FieldIcon icon={UserRound} />
                              <Input {...field} className="pl-9" placeholder="Seu nome" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E‑mail</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FieldIcon icon={Mail} />
                              <Input type="email" {...field} className="pl-9" placeholder="voce@exemplo.com" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={registerForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className={`${CAMPO_DE_SELECAO} ${field.value ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              <option value="" disabled>
                                Selecione...
                              </option>
                              <option value="Masculino">Masculino</option>
                              <option value="Feminino">Feminino</option>
                              <option value="Prefiro não dizer">Prefiro não informar</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de nascimento</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FieldIcon icon={CalendarDays} />
                              <Input type="date" {...field} className="pl-9" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="rounded-xl border border-line bg-brand-tint p-3 space-y-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">
                            Utilize a ArqDoor como profissional.
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Marque a opção "sou prestador" e utilize a ArqDoor para
                            realizar o seu trabalho e receber propostas de clientes.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Checkbox
                              id="sou-prestador"
                              checked={field.value === "prestador"}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  checked === true ? "prestador" : "contratante"
                                )
                              }
                            />
                          </FormControl>
                          <label htmlFor="sou-prestador" className="text-sm leading-none font-medium">
                            Sou prestador
                          </label>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <PasswordInput value={field.value} onChange={field.onChange} placeholder="Mínimo 8 caracteres" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar senha</FormLabel>
                          <FormControl>
                            <PasswordInput value={field.value} onChange={field.onChange} placeholder="Repita a senha" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* visual password meter */}
                  <AnimatePresence>
                    {registerForm.watch("password") ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="grid grid-cols-4 gap-1"
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 rounded ${i < passwordScore ? "bg-brand" : "bg-muted"}`}
                          />
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <FormField
                    control={registerForm.control}
                    name="termos_aceitos"
                    defaultValue={false}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3">
                        <FormControl>
                          <Checkbox
                            id="termos_aceitos"
                            checked={!!field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            Declaro que li e aceito os {" "}
                            <a href="/docs/usetermsprivacitypolices.html" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                              Termos de uso
                            </a>
                            {" e "}
                            <a href="/docs/usetermsprivacitypolices.html" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                              Política de privacidade
                            </a>
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={registerLoading} className="w-full">
                    {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={googleRegisterLoading || !googleEnabled}
                    className="w-full"
                    onClick={() => handleGoogleClick("register")}
                  >
                    {googleRegisterLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="mr-2 inline-flex">
                        <GoogleIcon />
                      </span>
                    )}
                    Registrar com o Google
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    Já tem cadastro?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="font-medium text-brand hover:underline"
                    >
                      Faça login
                    </button>
                  </div>
                </form>
              </Form>
            </DialogShell>
          </DialogContent>
        </Dialog>
      </>
    );
  };

export default AuthModals;
