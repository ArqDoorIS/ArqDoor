import { ReactNode } from "react";
import Navbar from "@/components/Navbar";

interface ApplicationLayoutProps {
  children: ReactNode;
}

// Quem aplica este layout é o `App.tsx`, para toda rota logada. Página que se embrulha nele
// de novo ganha uma segunda barra de navegação: eram 10 (spec 2026-11-site-ganhos-rapidos).
// A barra é `fixed` e não ocupa espaço, então as duas ficavam uma sobre a outra, mas o
// padding das duas camadas somava. Essas telas guardam um `pt-6` (`pt-8` nas mensagens)
// no lugar da camada que saiu, para o conteúdo não subir para baixo da barra.
export default function ApplicationLayout({ children }: ApplicationLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-6">
        {children}
      </main>
    </div>
  );
}
