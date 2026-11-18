import { useState } from "react";
import { AdminAiSection } from "./AdminAiSection";
import { AdminAiAjustesSection } from "./AdminAiAjustesSection";
import { AdminAiConversasSection } from "./AdminAiConversasSection";
import { AdminAiUsoSection } from "./AdminAiUsoSection";

/** Aba "IA" do painel: a chave, a ficha de cada IA, o uso e custo, e as conversas. */
export function AdminIaPainel() {
  const [parte, setParte] = useState<"chave" | "ajustes" | "uso" | "conversas">("chave");
  const abas: [typeof parte, string][] = [["chave", "Chave e liga/desliga"], ["ajustes", "Ajustar cada IA"], ["uso", "Uso e custo"], ["conversas", "Conversas"]];
  return (
    <div>
      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {abas.map(([k, n]) => (
          <button key={k} type="button" onClick={() => setParte(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${parte === k ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {n}
          </button>
        ))}
      </div>
      {parte === "chave" ? <AdminAiSection /> : parte === "ajustes" ? <AdminAiAjustesSection /> : parte === "uso" ? <AdminAiUsoSection /> : <AdminAiConversasSection />}
    </div>
  );
}
