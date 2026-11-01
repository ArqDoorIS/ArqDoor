// Sentry deve ser inicializado antes de qualquer outro import
import { initSentry } from "./lib/sentry";
initSentry();

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { emIframeDeFora } from "./lib/emIframeDeFora";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
if (!googleClientId) {
  console.warn("VITE_GOOGLE_CLIENT_ID não definido; login com Google ficará indisponível.");
}

// O GoogleOAuthProvider precisa SEMPRE envolver a app, mesmo sem clientId.
// O hook useGoogleLogin lança "GoogleOAuthProvider is not in the React tree"
// se chamado fora do provider, derrubando o /auth no ErrorBoundary. Usamos
// um placeholder quando o clientId não está disponível — o botão de login
// social já checa `googleEnabled` antes de disparar, então fica safe.
const effectiveClientId = googleClientId || "placeholder.apps.googleusercontent.com";

const raiz = document.getElementById("root")!;

if (emIframeDeFora()) {
  // Dentro de outro site o app não abre: nada para clicar por baixo de uma isca. Só um
  // link para abrir o ArqDoor na própria aba (src/lib/emIframeDeFora.ts).
  const aviso = document.createElement("p");
  aviso.style.cssText = "font-family: sans-serif; padding: 16px;";
  aviso.textContent = "O ArqDoor não abre dentro de outro site. ";
  const link = document.createElement("a");
  link.href = window.location.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Abrir o ArqDoor";
  aviso.appendChild(link);
  raiz.replaceChildren(aviso);
} else {
  createRoot(raiz).render(
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={effectiveClientId}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}
