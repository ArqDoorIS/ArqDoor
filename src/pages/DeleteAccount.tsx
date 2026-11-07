const SUPPORT_EMAIL = "arqdoor@arqdoor.com";

/**
 * Página pública de exclusão de conta e dados (exigida pela política de
 * "Exclusão de conta" do Google Play). Deve ser acessível SEM login — por isso
 * "/excluir-conta" está em LANDING_ROUTES (App.tsx), evitando o redirect p/ /auth.
 */
export default function DeleteAccount() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Excluir minha conta ArqDoor",
  )}&body=${encodeURIComponent(
    "Olá, gostaria de solicitar a exclusão da minha conta e dos meus dados no ArqDoor.\n\nE-mail cadastrado na conta: \nNome: ",
  )}`;

  return (
    <div className="min-h-screen bg-surface px-5 py-14 text-ink-strong">
      <div className="mx-auto w-full max-w-[760px]">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">
          ArqDoor
        </p>
        <h1 className="mb-3 text-3xl font-bold text-ink-strong sm:text-4xl">
          Exclusão de conta e dados
        </h1>
        <p className="mb-8 leading-relaxed text-ink">
          Esta página explica como você pode solicitar a exclusão da sua conta do
          ArqDoor e dos dados associados a ela. O ArqDoor é uma plataforma que
          conecta clientes e prestadores de serviços de arquitetura e reformas.
        </p>

        <section className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-ink-strong">
            Como solicitar a exclusão
          </h2>
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-ink">
            <li>
              Envie um e-mail para{" "}
              <a href={mailto} className="font-semibold text-brand underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              com o assunto <strong>“Excluir minha conta ArqDoor”</strong>.
            </li>
            <li>
              No corpo do e-mail, informe o <strong>e-mail cadastrado</strong> na
              sua conta ArqDoor e o seu nome, para confirmarmos a titularidade.
            </li>
            <li>
              Após a confirmação, processamos a exclusão e avisamos você por
              e-mail quando estiver concluída.
            </li>
          </ol>
          <a
            href={mailto}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Solicitar exclusão por e-mail
          </a>
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-ink-strong">
            Quais dados são excluídos
          </h2>
          <p className="mb-3 leading-relaxed text-ink">
            Ao concluir a solicitação, removemos permanentemente os dados
            vinculados à sua conta, incluindo:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-ink">
            <li>Dados de perfil (nome, e-mail, telefone, foto, endereço e documentos como CPF/CNPJ)</li>
            <li>Serviços, portfólio e avaliações publicados por você</li>
            <li>Contratos, propostas e histórico de mensagens</li>
            <li>Preferências, conexões e dados de uso da conta</li>
          </ul>
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-ink-strong">
            Dados que podem ser retidos
          </h2>
          <p className="leading-relaxed text-ink">
            Alguns registros — como comprovantes de transações e pagamentos —
            podem ser mantidos pelo período mínimo exigido pela legislação
            aplicável (por exemplo, obrigações fiscais e financeiras). Esses
            dados são conservados apenas pelo prazo legal e, ao término, são
            eliminados de forma definitiva.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-ink-strong">
            Prazo de processamento
          </h2>
          <p className="leading-relaxed text-ink">
            A exclusão é processada em até <strong>30 dias</strong> após a
            confirmação da solicitação.
          </p>
        </section>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Dúvidas sobre privacidade e exclusão de dados? Fale com a gente em{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand underline">
            {SUPPORT_EMAIL}
          </a>
          . Consulte também a nossa{" "}
          <a
            href="/docs/usetermsprivacitypolices.html"
            className="font-semibold text-brand underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
