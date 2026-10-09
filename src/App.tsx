import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import LandingLayout from "@/components/layouts/LandingLayout";
import ApplicationLayout from "@/components/layouts/ApplicationLayout";
import CompleteProfileModal from "@/components/modals/CompleteProfileModal";
import CookieConsent from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setResumeRoute } from "@/lib/utils";

const LANDING_ROUTES = ["/", "/auth", "/nova-senha", "/excluir-conta", "/cadastro"];
const ADMIN_ROUTES = ["/admin"];

/**
 * O painel tem origem propria (admin.arqdoor.com), e ali a raiz JA e o painel: obrigar
 * `/admin` no fim de um host que se chama admin seria redundante.
 *
 * A checagem e por prefixo `admin.` em vez de igualdade com o dominio de producao, para
 * um admin.staging.arqdoor.com futuro funcionar sem mexer aqui.
 *
 * O mesmo bundle continua servindo arqdoor.com, onde `/` e a home e o painel segue em
 * `/admin`. Quem decide e o host, nao o build.
 */
export const ehHostDoPainel = () =>
  typeof window !== "undefined" && window.location.hostname.startsWith("admin.");

// Route-level code splitting: reduces the initial JS payload in production.
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const Profile = lazy(() => import("@/pages/Profile"));
const AppHome = lazy(() => import("@/pages/AppHome"));
const DemandsFeed = lazy(() => import("@/pages/DemandsFeed"));
const ServicePage = lazy(() => import("@/pages/ServicePage"));
const ServicesFeed = lazy(() => import("@/pages/ServicesFeed"));
const ProviderProfile = lazy(() => import("@/pages/ProviderProfile"));
const ClientProfile = lazy(() => import("@/pages/ClientProfile"));
const Messages = lazy(() => import("@/pages/Messages"));
const Admin = lazy(() => import("@/pages/Admin"));
const Invites = lazy(() => import("@/pages/Invites"));
const InvitePublic = lazy(() => import("@/pages/InvitePublic"));
const Connections = lazy(() => import("@/pages/Connections"));
const KanbanPage = lazy(() => import("@/pages/KanbanPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const TermsRedirect = lazy(() => import("@/pages/TermsRedirect"));
const DeleteAccount = lazy(() => import("@/pages/DeleteAccount"));
const ReferralLanding = lazy(() => import("@/pages/ReferralLanding"));

function RouteLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
      Carregando...
    </div>
  );
}

// Wrapper que isola cada rota num ErrorBoundary próprio. Se um componente lazy
// falhar, o erro é contido nessa rota — restante da app (navbar, outras rotas)
// continua funcional. Sem isso, qualquer erro em Messages.tsx (~2400 linhas)
// derruba a UI inteira pro fallback global.
function RouteBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PlainLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/">
          <RouteBoundary>{ehHostDoPainel() ? <Admin /> : <Home />}</RouteBoundary>
        </Route>
        <Route path="/auth"><RouteBoundary><AuthPage /></RouteBoundary></Route>
        <Route path="/cadastro"><RouteBoundary><ReferralLanding /></RouteBoundary></Route>
        <Route path="/profile"><RouteBoundary><Profile /></RouteBoundary></Route>
        <Route path="/home"><RouteBoundary><AppHome /></RouteBoundary></Route>
        <Route path="/demands"><RouteBoundary><DemandsFeed /></RouteBoundary></Route>
        <Route path="/services/viewService"><RouteBoundary><ServicePage /></RouteBoundary></Route>
        <Route path="/services"><RouteBoundary><ServicesFeed /></RouteBoundary></Route>
        <Route path="/providers/:provider_id"><RouteBoundary><ProviderProfile /></RouteBoundary></Route>
        <Route path="/user/:user_id"><RouteBoundary><ClientProfile /></RouteBoundary></Route>
        <Route path="/messages/:userId?"><RouteBoundary><Messages /></RouteBoundary></Route>
        <Route path="/connections"><RouteBoundary><Connections /></RouteBoundary></Route>
        <Route path="/admin"><RouteBoundary><Admin /></RouteBoundary></Route>
        <Route path="/convites"><RouteBoundary><Invites /></RouteBoundary></Route>
        <Route path="/convite/:token"><RouteBoundary><InvitePublic /></RouteBoundary></Route>
        <Route path="/kanban"><RouteBoundary><KanbanPage /></RouteBoundary></Route>
        <Route path="/nova-senha"><RouteBoundary><ResetPasswordPage /></RouteBoundary></Route>
        <Route path="/termos-de-uso"><RouteBoundary><TermsRedirect /></RouteBoundary></Route>
        <Route path="/excluir-conta"><RouteBoundary><DeleteAccount /></RouteBoundary></Route>
        <Route><RouteBoundary><NotFound /></RouteBoundary></Route>
      </Switch>
    </Suspense>
  );
}
function AppContent() {
  const [location, navigate] = useLocation();
  const { isLoggedIn, isInitialized } = useAuth();

  const isInvitePublic = location.startsWith("/convite/");
  // Sem o segundo termo, a raiz do host do painel cairia no LandingLayout e apareceria
  // com a navbar do site em volta do admin.
  const isAdminRoute =
    ADMIN_ROUTES.includes(location) || (ehHostDoPainel() && location === "/");
  const isPublic = LANDING_ROUTES.includes(location) || isInvitePublic || isAdminRoute;
  const Layout = isInvitePublic
    ? (ApplicationLayout as any)
    : isAdminRoute
      ? (PlainLayout as any)
    : isPublic
      ? (LandingLayout as any)
      : (ApplicationLayout as any);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isLoggedIn && !isPublic) {
      navigate("/auth");
    }
  }, [isInitialized, isLoggedIn, isPublic, navigate]);

  useEffect(() => {
    setResumeRoute(location);
  }, [location]);

  return (
    <Layout>
      <Router />
    </Layout>
  );
}
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <CompleteProfileModal />
      <CookieConsent />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
