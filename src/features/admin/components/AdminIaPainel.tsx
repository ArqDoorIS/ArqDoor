import { useState } from "react";
import { AdminAiSection } from "./AdminAiSection";
import { AdminAiAjustesSection } from "./AdminAiAjustesSection";
import { AdminAiConversasSection } from "./AdminAiConversasSection";

/** Aba "IA" do painel: a chave, os ajustes de cada IA e as conversas. */
export function AdminIaPainel() {
  const [parte, setParte] = useState<"chave" | "ajustes" | "conversas">("chave");
  const abas: [typeof parte, string][] = [["chave", "Chave e liga/desliga"], ["ajustes", "Ajustar cada IA"], ["conversas", "Conversas"]];
  return (
    <div>
      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {abas.map(([k, n]) => (
          <button key={k} type="button" onClick={() => setParte(k)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${parte === k ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {n}
          </button>
        ))}
      </div>
      {parte === "chave" ? <AdminAiSection /> : parte === "ajustes" ? <AdminAiAjustesSection /> : <AdminAiConversasSection />}
    </div>
  );
}
