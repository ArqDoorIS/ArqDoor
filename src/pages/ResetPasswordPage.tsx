import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function getParam(name: string) {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const token = getParam("token");
  const userId = getParam("id");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/auth/reset-password", { token, userId, newPassword: password });
      const json = await res.json();
      if (json.success) {
        setDone(true);
      } else {
        toast({ title: json.message || "Link inválido ou expirado.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao redefinir senha.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!token || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center space-y-3">
          <p className="text-zinc-500">Link inválido ou expirado.</p>
          <Button variant="outline" onClick={() => navigate("/auth")}>Voltar ao login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold text-zinc-900">Senha redefinida!</h2>
            <p className="text-sm text-zinc-500">Você já pode fazer login com a nova senha.</p>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Ir para o login
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <KeyRound className="w-5 h-5 text-brand" />
              <h2 className="text-xl font-semibold text-zinc-900">Nova senha</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir senha
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
