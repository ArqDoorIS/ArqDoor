import { ReactNode } from "react";
import Navbar from "@/components/Navbar";

interface ApplicationLayoutProps {
  children: ReactNode;
}

// Quem aplica este layout é o `App.tsx`, para toda rota logada. Página que se embrulha nele
// de novo ganha uma segunda barra de navegação: eram 8 (spec 2026-11-site-ganhos-rapidos).
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
