import { CheckCircle2, MessageCircle, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { AcceptAndSignResponse } from "./types";

type Props = {
  result: AcceptAndSignResponse;
  paymentDone: boolean;
  token: string;
  pdfUrl: string;
};

function isAndroidBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function StepPronto({ result, paymentDone, token, pdfUrl }: Props) {
  const [, navigate] = useLocation();
  const android = isAndroidBrowser();

  const playStoreUrl =
    "https://play.google.com/store/apps/details?id=com.arqdoor.app&referrer=" +
    encodeURIComponent(`invite_token=${token}`);

  const modoProtegido = result.pagamento?.modo === "protegido";
  const devePagar = !!result.pagamento?.devido;

  return (
    <div className="space-y-6" data-testid="step-pronto">
      {/* Cabecalho de sucesso */}
      <div className="flex flex-col items-center text-center gap-3 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Pronto!</h1>
        <p className="text-sm text-slate-600 max-w-sm">
          Você aceitou e assinou o contrato. Agora a conversa está aberta e o projeto pode começar.
        </p>
      </div>

      {/* Linha do tempo */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Linha do tempo
        </h2>
        <div className="space-y-3">
          <TimelineItem
            done
            label="Contrato assinado"
            detail={result.assinado ? "Assinatura registrada com hash de verificação." : "Assinatura pendente."}
          />
          {modoProtegido ? (
            <TimelineItem
              done={paymentDone}
              label={paymentDone ? "Pagamento confirmado" : "Pagamento pendente"}
              detail={
                paymentDone
                  ? "Pagamento recebido e aguardando liberação ao profissional."
                  : "Você pode pagar mais tarde pela tela de conversas."
              }
            />
          ) : (
            <TimelineItem
              done={false}
              label="Pagamento direto"
              detail={result.pagamento?.motivo || "Você paga cada etapa quando ela for concluída."}
            />
          )}
          <TimelineItem
            done={false}
            label="Próxima etapa"
            detail="O profissional inicia quando o pagamento for confirmado."
          />
        </div>
      </div>

      {/* Acoes principais */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() =>
            navigate(
              `/messages/${result.provider_user_id}?ticket=${result.ticket_id}`
            )
          }
          className="flex-1 bg-orange-600 hover:bg-orange-700 h-12 gap-2 text-base font-semibold rounded-xl"
        >
          <MessageCircle className="h-5 w-5" />
          Abrir conversa
        </Button>
        {pdfUrl && (
          <Button
            variant="outline"
            onClick={() => window.open(pdfUrl, "_blank")}
            className="flex-1 h-12 gap-2 rounded-xl"
          >
            <FileText className="h-5 w-5" />
            Ver contrato
          </Button>
        )}
      </div>

      {/* Cartao "Baixar no app" - somente em Android */}
      {android && (
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
          data-testid="android-app-card"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">Baixar e continuar no app</p>
              <p className="text-xs text-slate-500">
                Acompanhe as etapas, mensagens e pagamentos pelo aplicativo ArqDoor.
              </p>
            </div>
          </div>
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" />
              Baixar na Google Play
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
          done
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-slate-300 block" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}
