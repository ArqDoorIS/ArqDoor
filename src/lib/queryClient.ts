import { QueryClient } from "@tanstack/react-query";
import { servidorDoSite } from "@/lib/ambienteDoPainel";

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
};

const getStoredCsrfToken = () => {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem("csrf_token");
};

const getBuildBaseUrl = () => {
  const v1 = import.meta.env.VITE_API_URL;
  const v2 = import.meta.env.VITE_API_BASE_URL;
  if (v1 && v1 !== "undefined") return v1;
  if (v2 && v2 !== "undefined") return v2;
  return "https://api.arqdoor.com";
};
/** O servidor da compilação; no painel admin, o do ambiente escolhido (lib/ambienteDoPainel.ts). */
const getBaseUrl = () => servidorDoSite(getBuildBaseUrl());
/** O servidor para o qual o site foi compilado (o painel mostra o ambiente a partir dele). */
export const BUILD_API_BASE_URL = getBuildBaseUrl();
export const API_BASE_URL = getBaseUrl();

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown,
  extraHeaders?: Record<string, string>,
  timeout: number = 30000 // 30 seconds default
): Promise<Response> {
  const url = API_BASE_URL + path;
  const normalizedMethod = method.toUpperCase();
  const headers: Record<string, string> = { ...(extraHeaders || {}) };

  let bodyContent: BodyInit | undefined;

  if (data) {
    if (data instanceof FormData) {
      bodyContent = data;
    } else {
      headers["Content-Type"] = "application/json";
      bodyContent = JSON.stringify(data);
    }
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(normalizedMethod) && !headers["X-CSRF-Token"]) {
    const csrfToken = getStoredCsrfToken() || getCookieValue("csrf_token");
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Implement timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: normalizedMethod,
      headers,
      body: bodyContent,
      credentials: "include", // envia o cookie HttpOnly automaticamente
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado - verifique sua internet');
    }
    throw error;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
