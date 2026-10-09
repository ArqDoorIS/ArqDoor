import { useState } from "react";
import { Filter, Loader2, LogOut, Menu, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TABS } from "@/features/admin/constants";
import { AdminAuditLogSection } from "@/features/admin/components/AdminAuditLogSection";
import { AdminContractsSection } from "@/features/admin/components/AdminContractsSection";
import { AdminConversationsSection } from "@/features/admin/components/AdminConversationsSection";
import { AdminDocumentsSection } from "@/features/admin/components/AdminDocumentsSection";
import { AdminTeamSection } from "@/features/admin/components/AdminTeamSection";
import { AdminVerificationSection } from "@/features/admin/components/AdminVerificationSection";
import { AdminFeesSection } from "@/features/admin/components/AdminFeesSection";
import { AdminReferralsSection } from "@/features/admin/components/AdminReferralsSection";
import { AdminFiltersModal } from "@/features/admin/components/AdminFiltersModal";
import { AdminLoginView } from "@/features/admin/components/AdminLoginView";
import { AdminDashboardView } from "@/features/admin/components/AdminOverviewSection";
import { AdminPaymentsSection } from "@/features/admin/components/AdminPaymentsSection";
import { PaginationControls } from "@/features/admin/components/AdminPrimitives";
import { AdminTransfersSection } from "@/features/admin/components/AdminTransfersSection";
import { AdminUsersSection } from "@/features/admin/components/AdminUsersSection";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { useAdminPageMeta } from "@/features/admin/hooks/useAdminPageMeta";
import { useAdminSession } from "@/features/admin/hooks/useAdminSession";
import type { AdminTab } from "@/features/admin/types";
import { cn, formatRelativeTime, openSecureFile } from "@/features/admin/utils";
import { ADMIN_TOKENS } from "@/features/admin/tokens";

export default function Admin() {
  useAdminPageMeta();

  const [navigationOpen, setNavigationOpen] = useState(false);
  const session = useAdminSession();
  const admin = useAdminDashboard({
    isAuthenticated: session.isAuthenticated,
    onUnauthorized: session.expireSession,
  });

  const selectTab = (tab: AdminTab) => {
    admin.setActiveTab(tab);
    setNavigationOpen(false);
  };

  if (!session.authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Verificando sessão administrativa...
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <AdminLoginView
        email={session.email}
        password={session.password}
        authSubmitting={session.authSubmitting}
        authError={session.authError}
        onEmailChange={session.setEmail}
        onPasswordChange={session.setPassword}
        onSubmit={session.login}
        desafio={session.desafio}
        codigo={session.codigo}
        onCodigoChange={session.setCodigo}
        onVerificar={session.verificarCodigo}
        onCancelar={session.cancelarVerificacao}
      />
    );
  }

  const dashboard = admin.dashboard;
  // Um reviewer nao deve ver aba que sempre responde 403: a tela pareceria quebrada em
  // vez de restrita. Enquanto o papel nao chegou, mostra so o que todo mundo alcanca,
  // para nao piscar abas que vao sumir (ADR-001).
  const papel = session.role;
  const abasVisiveis = TABS.filter((tab) => (papel ? tab.papeis.includes(papel) : tab.papeis.includes("reviewer")));
  const activeTab = TABS.find((tab) => tab.key === admin.activeTab);
  const ActiveTabIcon = activeTab?.icon;
  const showPagination = Boolean(
    admin.activePagination &&
      !["dashboard", "all", "taxas", "auditoria"].includes(admin.activeTab)
  );

  const renderActiveSection = () => {
    if (!dashboard) return null;

    switch (admin.activeTab) {
      case "usuarios":
        return (
          <AdminUsersSection
            users={dashboard.users}
            selectedUserId={admin.selectedUserId}
            selectedUser={admin.selectedUser}
            onSelectUser={admin.selectUser}
            detailTab={admin.userDetailTab}
            onDetailTabChange={admin.setUserDetailTab}
            userProfile={admin.userProfile}
            loadingUserProfile={admin.loadingUserProfile}
            userProfileError={admin.userProfileError}
            savingUserProfile={admin.savingUserProfile}
            saveUserProfileError={admin.saveUserProfileError}
            onUpdateUserProfile={admin.updateUserProfile}
            operationsOverview={admin.operationsOverview}
            loadingOperationsOverview={admin.loadingOperationsOverview}
            operationsOverviewError={admin.operationsOverviewError}
            selectedOperationsConversationId={admin.selectedOperationsConversationId}
            onSelectOperationsConversation={admin.selectOperationsConversation}
            selectedOperationsTicketId={admin.selectedOperationsTicketId}
            onSelectOperationsTicket={admin.selectOperationsTicket}
            paginatedUserConversations={admin.paginatedUserConversations}
            paginatedUserContracts={admin.paginatedUserContracts}
            paginatedUserSteps={admin.paginatedUserSteps}
            onPrevUserConversationsPage={admin.prevUserConversationsPage}
            onNextUserConversationsPage={admin.nextUserConversationsPage}
            onPrevUserContractsPage={admin.prevUserContractsPage}
            onNextUserContractsPage={admin.nextUserContractsPage}
            onPrevUserStepsPage={admin.prevUserStepsPage}
            onNextUserStepsPage={admin.nextUserStepsPage}
            directConversation={admin.directConversation}
            loadingDirectConversation={admin.loadingDirectConversation}
            directConversationError={admin.directConversationError}
            paginatedAdminMessages={admin.paginatedAdminMessages}
            onPrevAdminMessagesPage={admin.prevAdminMessagesPage}
            onNextAdminMessagesPage={admin.nextAdminMessagesPage}
            messageDraft={admin.messageDraft}
            onMessageDraftChange={admin.setMessageDraft}
            sendingMessage={admin.sendingMessage}
            adminMessageError={admin.adminMessageError}
            onSendAdminMessage={admin.sendAdminMessage}
            onVerifyUser={admin.verifyUser}
            verifyingUserId={admin.verifyingUserId}
            verifyUserError={admin.verifyUserError}
            onUpdateStepStatus={admin.updateStepStatus}
            updatingStepId={admin.updatingStepId}
            updateStepError={admin.updateStepError}
            onSuspendUser={admin.suspendUser}
            suspendingUserId={admin.suspendingUserId}
            suspendUserError={admin.suspendUserError}
            onDeleteEarlyUser={admin.deleteEarlyUser}
            deletingUserId={admin.deletingUserId}
            deleteUserError={admin.deleteUserError}
          />
        );
      case "contratos":
        return <AdminContractsSection tickets={dashboard.tickets} />;
      case "pagamentos":
        return <AdminPaymentsSection dashboard={dashboard} />;
      case "transferencias":
        return (
          <AdminTransfersSection
            transfers={dashboard.transfers}
            onPayTransfer={admin.payTransfer}
            payingTicketId={admin.payingTransferTicketId}
            payTransferError={admin.payTransferError}
          />
        );
      case "documentos":
        return <AdminDocumentsSection documents={dashboard.documents} />;
      case "verificacao":
        return <AdminVerificationSection />;
      case "equipe":
        return <AdminTeamSection />;
      case "taxas":
        return <AdminFeesSection />;
      case "indicacoes":
        return <AdminReferralsSection />;
      case "conversas":
        return (
          <AdminConversationsSection
            conversations={dashboard.conversations}
            selectedConversationId={admin.selectedConversationId}
            selectedConversationRow={admin.selectedConversationRow}
            conversationViewer={admin.conversationViewer}
            loadingConversationViewer={admin.loadingConversationViewer}
            conversationViewerError={admin.conversationViewerError}
            paginatedConversationMessages={admin.paginatedConversationMessages}
            onSelectConversation={admin.loadConversationViewer}
            onPrevMessagesPage={admin.prevConversationMessagesPage}
            onNextMessagesPage={admin.nextConversationMessagesPage}
            onOpenTicket={() => selectTab("contratos")}
          />
        );
      case "auditoria":
        return <AdminAuditLogSection />;
      default:
        return (
          <AdminDashboardView
            activeTab={admin.activeTab}
            dashboard={dashboard}
            onOpenDocument={openSecureFile}
            onOpenConversation={admin.loadConversationViewer}
            onNavigateToTab={selectTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setNavigationOpen((open) => !open)}
            aria-label={navigationOpen ? "Fechar navegação" : "Abrir navegação"}
            aria-expanded={navigationOpen}
          >
            {navigationOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">ArqDoor</p>
            <div className="flex min-w-0 items-center gap-2">
              {ActiveTabIcon ? <ActiveTabIcon className="h-4 w-4 shrink-0 text-orange-600" /> : null}
              <h1 className="truncate text-base font-semibold text-slate-950">
                {activeTab?.label || "Painel administrativo"}
              </h1>
            </div>
          </div>

          <div className="hidden text-right text-xs text-slate-500 xl:block">
            <p>Atualização automática a cada minuto</p>
            <p>{dashboard?.meta.generated_at ? `Dados ${formatRelativeTime(dashboard.meta.generated_at)}` : "Carregando dados"}</p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={admin.refreshDashboard}
            disabled={admin.loading}
            aria-label="Atualizar dados"
            title="Atualizar dados"
          >
            {admin.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => admin.setShowFilters(true)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {admin.appliedFilterCount ? (
              <span className="rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {admin.appliedFilterCount}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void session.logout()}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white p-3 shadow-lg lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-4 lg:shadow-none",
            navigationOpen ? "block" : "hidden"
          )}
        >
          <nav className="grid gap-1 sm:grid-cols-2 lg:block" aria-label="Seções administrativas">
            {abasVisiveis.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  admin.activeTab === key
                    ? ADMIN_TOKENS.selectable.active
                    : ADMIN_TOKENS.selectable.inactive
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
          {admin.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {admin.error}
            </div>
          ) : null}

          {dashboard ? renderActiveSection() : null}

          {!dashboard && admin.loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando painel...
            </div>
          ) : null}

          {showPagination && admin.activePagination ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <PaginationControls
                page={admin.activePagination.page}
                totalPages={admin.activePagination.total_pages}
                onPrevious={admin.goToPreviousPage}
                onNext={admin.goToNextPage}
              />
            </div>
          ) : null}
        </main>
      </div>

      <AdminFiltersModal
        open={admin.showFilters}
        activeTab={admin.activeTab}
        dashboard={dashboard}
        draftFilters={admin.draftFilters}
        onClose={() => admin.setShowFilters(false)}
        onReset={admin.resetFilters}
        onApply={admin.applyFilters}
        onChange={admin.updateDraftFilter}
      />
    </div>
  );
}
