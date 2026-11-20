import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const normalizeDate = (value?: string) => {
  if (!value) return "";
  const trimmed = value.split("T")[0];
  return trimmed === "1970-01-01" ? "" : trimmed;
};

export default function CompleteProfileModal() {
  const {
    user,
    isLoggedIn,
    needsOnboarding,
    setNeedsOnboarding,
    onboardingOptional,
    setOnboardingOptional,
    updateUserLocal,
  } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [gender, setGender] = useState(user?.gender || "");
  const [birth, setBirth] = useState(normalizeDate(user?.birth));
  const [isPrestador, setIsPrestador] = useState(user?.type === "prestador");
  const [hasCnpj, setHasCnpj] = useState(!!user?.cnpj);
  const [cpf, setCpf] = useState(user?.cpf || "");
  const [cnpj, setCnpj] = useState(user?.cnpj || "");
  const [cep, setCep] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [typeLocation, setTypeLocation] = useState("Residencial");
  const [cepLoading, setCepLoading] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState("");
  const [signaturePasswordConfirm, setSignaturePasswordConfirm] = useState("");

  // No link do convite a pessoa só quer assinar: a janela espera ela sair dali (abria por
  // cima da folha de assinatura e a senha não chegava ao campo, teste de rotas de 20/11/2026).
  const [local] = useLocation();
  const shouldOpen = isLoggedIn && needsOnboarding && !!user?.id && !local.startsWith("/convite/");
  const canSkip = onboardingOptional;

  const cleanedCpf = useMemo(() => digitsOnly(cpf), [cpf]);
  const cleanedCnpj = useMemo(() => digitsOnly(cnpj), [cnpj]);
  const cleanedCep = useMemo(() => digitsOnly(cep), [cep]);

  const showError = (message: string) => {
    toast({
      title: "Complete seu cadastro",
      description: message,
      variant: "destructive",
    });
  };

  const needsDocuments = isPrestador && !(user?.cpf || user?.cnpj);
  const shouldAskIdentity = !onboardingOptional;
  const shouldDefineSignaturePassword = !onboardingOptional;
  const signaturePasswordValue = signaturePassword.trim();
  const signaturePasswordConfirmValue = signaturePasswordConfirm.trim();

  useEffect(() => {
    if (!shouldOpen || !user) return;
    setGender(user.gender || "");
    setBirth(normalizeDate(user.birth));
    setIsPrestador(user.type === "prestador");
    setHasCnpj(!!user.cnpj);
    setCpf(user.cpf || "");
    setCnpj(user.cnpj || "");
  }, [
    shouldOpen,
    user?.id,
    user?.gender,
    user?.birth,
    user?.type,
    user?.cpf,
    user?.cnpj,
  ]);

  const validate = () => {
    if (shouldAskIdentity) {
      if (!gender) return showError("Selecione o gênero.");
      if (!birth) return showError("Informe a data de nascimento.");
    }
    if (cleanedCep.length !== 8) return showError("Informe um CEP válido (8 dígitos).");
    if (state.trim().length !== 2) return showError("Informe o estado com 2 letras (UF).");
    if (!city.trim()) return showError("Informe a cidade.");
    if (!number.trim()) return showError("Informe o número.");

    if (isPrestador && (!onboardingOptional || needsDocuments)) {
      if (hasCnpj && cleanedCnpj.length !== 14) {
        return showError("Informe um CNPJ válido (14 dígitos).");
      }
      if (!hasCnpj && cleanedCpf && cleanedCpf.length !== 11) {
        return showError("Informe um CPF válido (11 dígitos) ou marque CNPJ.");
      }
    }

    if (shouldDefineSignaturePassword || signaturePasswordValue || signaturePasswordConfirmValue) {
      if (!signaturePasswordValue) return showError("Defina uma senha de assinatura.");
      if (signaturePasswordValue.length < 6) return showError("A senha deve ter ao menos 6 caracteres.");
      if (signaturePasswordValue !== signaturePasswordConfirmValue) {
        return showError("As senhas de assinatura não conferem.");
      }
    }
    return true;
  };

  useEffect(() => {
    if (cleanedCep.length !== 8) return;
    let cancelled = false;
    const controller = new AbortController();
    const fetchCep = async () => {
      try {
        setCepLoading(true);
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (cancelled) return;
        if (data?.erro) {
          showError("CEP não encontrado.");
          return;
        }
        if (data?.uf) setState(data.uf);
        if (data?.localidade) setCity(data.localidade);
        if (data?.bairro !== undefined) setNeighborhood(data.bairro);
        if (data?.logradouro !== undefined) setStreet(data.logradouro);
      } catch (err) {
        if (!cancelled) {
          showError("Falha ao consultar o CEP.");
        }
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    };

    const timeout = setTimeout(fetchCep, 350);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [cleanedCep]);

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!validate()) return;

    setIsSaving(true);
    try {
      // Sempre usar o checkbox isPrestador para determinar o tipo, não o tipo antigo do usuário
      // Isso garante que se o usuário marcar prestador no formulário, será salvo como prestador
      const finalType = isPrestador ? "prestador" : "contratante";
      const userPayload: Record<string, any> = {
        type: finalType,
        perfil_completo: true,
      };
      if (shouldAskIdentity || gender) userPayload.gender = gender;
      if (shouldAskIdentity || birth) userPayload.birth = birth;
      if (cleanedCpf) userPayload.cpf = cleanedCpf;
      if (cleanedCnpj) userPayload.cnpj = cleanedCnpj;
      if (signaturePasswordValue) userPayload.password = signaturePasswordValue;

      const updateUserRes = await apiRequest("PUT", `/users/${user.id}`, userPayload);
      if (!updateUserRes.ok) {
        const errorBody = await updateUserRes.json().catch(() => null);
        throw new Error(errorBody?.message || "Falha ao atualizar dados do usuário.");
      }

      if (finalType === "prestador") {
        const providerRes = await apiRequest("POST", "/providers", { user_id: user.id });
        if (!providerRes.ok) {
          const errorBody = await providerRes.json().catch(() => null);
          throw new Error(errorBody?.message || "Falha ao criar perfil de prestador.");
        }
      }

      const locationPayload: Record<string, any> = {
        cep: cleanedCep,
        state: state.toUpperCase(),
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        street: street.trim() || undefined,
        number: number ? Number(number) : undefined,
        typeLocation,
      };
      const locationRes = await apiRequest("POST", "/locationuser", locationPayload);
      if (!locationRes.ok) {
        const errorBody = await locationRes.json().catch(() => null);
        throw new Error(errorBody?.message || "Falha ao salvar endereço.");
      }

      updateUserLocal({
        gender,
        birth,
        type: finalType as "prestador" | "contratante",
        cpf: cleanedCpf || undefined,
        cnpj: cleanedCnpj || undefined,
        perfil_completo: true,
        signature_password_set: signaturePasswordValue ? true : user?.signature_password_set,
      });

      setNeedsOnboarding(false);
      setOnboardingOptional(false);
      toast({
        title: "Cadastro completo",
        description: "Seus dados foram salvos com sucesso.",
      });
    } catch (err) {
      console.error(err);
      showError((err as Error).message || "Falha ao salvar seus dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && canSkip) {
      setNeedsOnboarding(false);
      setOnboardingOptional(false);
    }
  };

  return (
    <Dialog open={shouldOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Complete seu cadastro</DialogTitle>
          <DialogDescription>
            {(user as any)?.provider === "google"
              ? "Para continuar, confirme seus dados e informe endereço. Alguns campos não vêm do Google."
              : "Para continuar, confirme seus dados e informe seu endereço."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 py-1">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm">Nome</label>
            <Input value={user?.name || ""} disabled className="mt-1" />
          </div>
          <div>
            <label className="text-sm">E-mail</label>
            <Input value={user?.email || ""} disabled className="mt-1" />
          </div>
          {shouldAskIdentity ? (
            <>
              <div>
                <label className="text-sm">Gênero</label>
                <select
                  className="mt-1 w-full rounded-md border bg-background p-2"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Prefiro não dizer">Prefiro não dizer</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Data de nascimento</label>
                <Input
                  type="date"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : null}
        </div>

        {!onboardingOptional ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border p-3">
            <Checkbox
              id="perfil-prestador"
              checked={isPrestador}
              onCheckedChange={(checked) => setIsPrestador(checked === true)}
            />
            <label htmlFor="perfil-prestador" className="text-sm leading-none">
              Sou prestador
            </label>
          </div>
        ) : null}

        {isPrestador && (!onboardingOptional || needsDocuments) ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="possui-cnpj"
                checked={hasCnpj}
                onCheckedChange={(checked) => setHasCnpj(checked === true)}
              />
              <label htmlFor="possui-cnpj" className="text-sm leading-none">
                Possuo CNPJ
              </label>
            </div>
            {hasCnpj ? (
              <div>
                <label className="text-sm">CNPJ</label>
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="mt-1"
                  placeholder="Somente números"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm">CPF (opcional)</label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="mt-1"
                  placeholder="Somente números"
                />
              </div>
            )}
          </div>
        ) : null}

        {shouldDefineSignaturePassword ? (
          <div className="mt-6">
            <h3 className="text-sm font-medium">Definir senha de assinatura</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use esta senha para assinar contratos e confirmar etapas. Para contas
              criadas com e-mail/senha, ela é a mesma do login. Se entrou com
              Google, defina aqui.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm">Senha de assinatura</label>
                <Input
                  type="password"
                  value={signaturePassword}
                  onChange={(e) => setSignaturePassword(e.target.value)}
                  className="mt-1"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="text-sm">Confirmar senha</label>
                <Input
                  type="password"
                  value={signaturePasswordConfirm}
                  onChange={(e) => setSignaturePasswordConfirm(e.target.value)}
                  className="mt-1"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <h3 className="text-sm font-medium">Endereço</h3>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">CEP</label>
              <Input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="mt-1"
                placeholder="Somente números"
              />
              {cepLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">Buscando endereço...</p>
              ) : null}
            </div>
            <div>
              <label className="text-sm">Estado (UF)</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="mt-1"
                placeholder="SP"
              />
            </div>
            <div>
              <label className="text-sm">Cidade</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Bairro</label>
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Rua</label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Número</label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm">Tipo de endereço</label>
              <select
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={typeLocation}
                onChange={(e) => setTypeLocation(e.target.value)}
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
          </div>
        </div>

        </div>
        <DialogFooter className="mt-4 pt-2 border-t">
          {canSkip ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNeedsOnboarding(false);
                setOnboardingOptional(false);
              }}
              disabled={isSaving}
            >
              Mais tarde
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
