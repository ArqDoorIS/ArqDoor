
import { useState, useEffect } from "react";
import { AuthForms } from "@/components/AuthForms";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import LoginLayout from "@/components/layouts/LoginLayout";
import { getResumeRoute } from "@/lib/utils";
import { Check } from "lucide-react";

export default function AuthPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const { isLoggedIn, isInitialized } = useAuth();
  const [, navigate] = useLocation();
  const busca = useSearch();

  // "Cadastrar" no menu chega como `/auth?cadastro=1` e abre direto o cadastro
  // (spec 2026-11-site-ganhos-rapidos).
  useEffect(() => {
    if (new URLSearchParams(busca).get("cadastro") === "1") setIsRegisterOpen(true);
  }, [busca]);

  useEffect(() => {
    if (!isInitialized || !isLoggedIn) return;
    navigate(getResumeRoute("/home"));
  }, [isInitialized, isLoggedIn, navigate]);

  const handleAuthSuccess = () => undefined;
  const vantagens = [
    "Encontre o projetista perfeito para o seu projeto",
    "Compare portfólios e escolha o melhor profissional",
    "Compartilhe projetos e obtenha feedbacks valiosos",
  ];

  return (
    <LoginLayout>
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col items-center justify-center bg-surface p-8 lg:w-1/2">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <img
                src="/images/landing/logo.png"
                alt="ArqDoor"
                className="mx-auto mb-8 h-10 w-auto"
              />
              <h1 className="mb-2 text-4xl font-bold text-ink-strong">Bem-vindo ao ArqDoor!</h1>
              <p className="text-ink">
                Faça login ou crie uma conta para começar na plataforma.
              </p>
            </div>

            <AuthForms
              isRegisterOpen={isRegisterOpen}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onRegisterClose={() => setIsRegisterOpen(false)}
              onSuccess={handleAuthSuccess}
            />
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => navigate("/")}>Voltar ao menu principal</Button>
            </div>
          </div>
        </div>

        <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-brand to-brand-dark lg:flex lg:w-1/2">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
          <div className="relative max-w-md p-8 text-white">
            <img src="/images/landing/logo_branca.png" alt="" className="mb-10 h-10 w-auto" />
            <h2 className="mb-6 text-3xl font-bold">Descubra profissionais incríveis</h2>
            <ul className="space-y-4">
              {vantagens.map((texto) => (
                <li key={texto} className="flex items-start">
                  <span className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="pt-1">{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}
