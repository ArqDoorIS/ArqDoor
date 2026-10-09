import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/queryClient";

const SESSION_EXPIRED_MESSAGE = "Sessão administrativa expirada.";

export type AdminMember = {
  id: number;
  role: "owner" | "reviewer";
};

/**
 * O login tem dois passos. Aparelho ja confiavel fecha no primeiro; aparelho desconhecido
 * recebe um codigo por e-mail e so fecha no segundo.
 */
export type DesafioDeDispositivo = {
  challenge: string;
  deviceLabel: string;
};

export function useAdminSession() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Papel do membro logado. `reviewer` so enxerga dashboard e fila de documentos,
  // entao a UI precisa saber disso para nao oferecer aba que vai dar 403 (ADR-001).
  const [member, setMember] = useState<AdminMember | null>(null);
  const [desafio, setDesafio] = useState<DesafioDeDispositivo | null>(null);
  const [codigo, setCodigo] = useState("");

  const expireSession = useCallback((message: string = SESSION_EXPIRED_MESSAGE) => {
    sessionStorage.removeItem("csrf_token");
    setPassword("");
    setIsAuthenticated(false);
    setAuthSubmitting(false);
    setAuthChecked(true);
    setMember(null);
    setDesafio(null);
    setCodigo("");
    setAuthError(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAdminSession = async () => {
      try {
        const response = await apiRequest("GET", "/admin/auth/session");

        if (!response.ok) {
          if (!cancelled) {
            setIsAuthenticated(false);
          }
          return;
        }

        const payload = (await response.json()) as {
          data?: { csrfToken?: string | null; member?: AdminMember | null };
        };

        if (!cancelled) {
          if (payload?.data?.csrfToken) {
            sessionStorage.setItem("csrf_token", payload.data.csrfToken);
          }
          setMember(payload?.data?.member ?? null);
          setIsAuthenticated(true);
          setAuthError(null);
        }
      } catch (sessionError) {
        if (!cancelled) {
          console.error(sessionError);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    void loadAdminSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setAuthSubmitting(true);
      setAuthError(null);

      try {
        const response = await apiRequest("POST", "/admin/auth/login", {
          email: email.trim(),
          password,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setAuthError(payload?.message || "Não foi possível iniciar a sessão administrativa.");
          return;
        }

        // Aparelho desconhecido: nenhuma sessao sai aqui, so o desafio.
        if (payload?.data?.needs_device_verification) {
          setDesafio({
            challenge: payload.data.challenge,
            deviceLabel: payload.data.device_label || "este dispositivo",
          });
          setCodigo("");
          setAuthError(null);
          return;
        }

        if (payload?.data?.csrfToken) {
          sessionStorage.setItem("csrf_token", payload.data.csrfToken);
        }

        setPassword("");
        setMember(payload?.data?.member ?? null);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (loginError) {
        console.error(loginError);
        setAuthError("Não foi possível iniciar a sessão administrativa.");
      } finally {
        setAuthSubmitting(false);
        setAuthChecked(true);
      }
    },
    [email, password]
  );

  /**
   * Passo 2: confere o codigo que chegou por e-mail e, se pedido, passa a confiar no
   * aparelho para os proximos logins.
   */
  const verificarCodigo = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!desafio) return;

      setAuthSubmitting(true);
      setAuthError(null);

      try {
        const response = await apiRequest("POST", "/admin/auth/verify-device", {
          challenge: desafio.challenge,
          code: codigo.trim(),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setAuthError(payload?.message || "Não foi possível verificar o código.");
          return;
        }

        if (payload?.data?.csrfToken) {
          sessionStorage.setItem("csrf_token", payload.data.csrfToken);
        }

        setCodigo("");
        setDesafio(null);
        setPassword("");
        setMember(payload?.data?.member ?? null);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (erro) {
        console.error(erro);
        setAuthError("Não foi possível verificar o código.");
      } finally {
        setAuthSubmitting(false);
        setAuthChecked(true);
      }
    },
    [codigo, desafio]
  );

  /** Volta ao passo 1, descartando o desafio em aberto. */
  const cancelarVerificacao = useCallback(() => {
    setDesafio(null);
    setCodigo("");
    setAuthError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/admin/auth/logout");
    } catch (logoutError) {
      console.error(logoutError);
    }

    sessionStorage.removeItem("csrf_token");
    setPassword("");
    setMember(null);
    setDesafio(null);
    setCodigo("");
    setIsAuthenticated(false);
    setAuthChecked(true);
    setAuthError(null);
  }, []);

  return {
    member,
    role: member?.role ?? null,
    desafio,
    codigo,
    setCodigo,
    verificarCodigo,
    cancelarVerificacao,
    email,
    password,
    isAuthenticated,
    authChecked,
    authSubmitting,
    authError,
    setEmail,
    setPassword,
    login,
    logout,
    expireSession,
  };
}
