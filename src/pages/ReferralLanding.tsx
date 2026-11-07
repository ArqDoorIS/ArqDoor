import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, ExternalLink, Gift } from "lucide-react";

const PLAY_PACKAGE = "com.arqdoor.app";

const validCode = (value: string | null) => Boolean(value && /^[A-Za-z0-9]{6,24}$/.test(value));

export default function ReferralLanding() {
  const [, navigate] = useLocation();
  const [attempted, setAttempted] = useState(false);
  const code = useMemo(() => new URLSearchParams(window.location.search).get("ref"), []);
  const normalizedCode = validCode(code) ? String(code).toUpperCase() : null;
  const appUrl = normalizedCode
    ? `arqdoormobile://signup?referralCode=${encodeURIComponent(normalizedCode)}`
    : "arqdoormobile://signup";
  const playUrl = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}${normalizedCode ? `&referrer=${encodeURIComponent(`referral_code=${normalizedCode}`)}` : ""}`;

  const openApp = () => {
    setAttempted(true);
    let pageHidden = false;
    const onVisibility = () => { if (document.visibilityState === "hidden") pageHidden = true; };
    document.addEventListener("visibilitychange", onVisibility, { once: true });
    window.location.href = appUrl;
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (!pageHidden && document.visibilityState === "visible") window.location.href = playUrl;
    }, 1400);
  };

  useEffect(() => {
    if (!normalizedCode) return;
    const timer = window.setTimeout(openApp, 350);
    return () => window.clearTimeout(timer);
  // The link is intentionally opened once when this referral page loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCode]);

  if (!normalizedCode) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6">
        <div className="w-full rounded-2xl border border-line bg-white p-7 text-center shadow-sm"><Gift className="mx-auto h-9 w-9 text-brand-dark" /><h1 className="mt-4 text-2xl font-bold text-ink-strong">Link de indicação inválido</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Peça um novo link à pessoa que enviou o convite.</p><button type="button" onClick={() => navigate("/")} className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">Ir para ArqDoor</button></div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-line bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft"><Gift className="h-7 w-7 text-brand-dark" /></div>
        <h1 className="mt-5 text-2xl font-bold text-ink-strong">Você foi indicado para a ArqDoor</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Vamos abrir o app para concluir seu cadastro. Se ele ainda não estiver instalado, a Google Play será aberta.</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={openApp} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white"><ExternalLink className="h-4 w-4" />Abrir app</button>
          <a href={playUrl} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink"><Download className="h-4 w-4" />Google Play</a>
        </div>
        {attempted ? <p className="mt-4 text-xs text-muted-foreground">Se nada abrir, toque em Google Play.</p> : null}
      </div>
    </main>
  );
}
