import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// Em português e com saída: a versão anterior era a do template, em inglês, perguntando se
// alguém tinha esquecido de registrar a rota (spec 2026-11-site-ganhos-rapidos).
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-warning-text" />
            <h1 className="text-2xl font-bold text-ink-strong">Página não encontrada</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            O endereço pode ter mudado ou estar incompleto.
          </p>

          <Button asChild className="mt-6">
            <Link href="/">Voltar para o início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
