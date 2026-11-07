import React from "react";
import { Check, ChevronsUpDown, Edit2, Landmark, Loader2, Plus, QrCode, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCnpj, formatCpf } from "@/lib/utils";
import { BRAZILIAN_BANKS } from "../constants/brazilianBanks";
import type { ProviderReceivingAccountApi } from "../types";

export type ReceivingAccountDraft = {
  nickname: string;
  bank_code: string;
  bank_name: string;
  bank_agency: string;
  bank_account: string;
  bank_document: string;
  pix_key: string;
};

type Props = {
  accounts: ProviderReceivingAccountApi[];
  loading: boolean;
  onCreate: (draft: ReceivingAccountDraft) => Promise<boolean>;
  onUpdate: (accountId: number, draft: ReceivingAccountDraft) => Promise<boolean>;
  onDelete: (accountId: number) => Promise<boolean>;
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const emptyDraft = (): ReceivingAccountDraft => ({
  nickname: "",
  bank_code: "",
  bank_name: "",
  bank_agency: "",
  bank_account: "",
  bank_document: "",
  pix_key: "",
});

const formatDocument = (value: string) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 11) return formatCpf(digits);
  return formatCnpj(digits.slice(0, 14));
};

const maskAccount = (value: string | null | undefined) => {
  const text = (value || "").trim();
  if (text.length <= 4) return text;
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
};

const hasBankDetails = (account: {
  bank_code?: string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;
  bank_document?: string | null;
}) =>
  Boolean(
    account.bank_code ||
      account.bank_name ||
      account.bank_agency ||
      account.bank_account ||
      account.bank_document
  );

const formatBankLabel = (account: {
  bank_code?: string | null;
  bank_name?: string | null;
}) => {
  const code = (account.bank_code || "").trim();
  const name = (account.bank_name || "").trim();
  if (code && name) return `${code} · ${name}`;
  if (name) return name;
  if (code) return `Banco ${code}`;
  return "Banco não informado";
};

const normalizeBankSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function ReceivingAccountsCard({
  accounts,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<ReceivingAccountDraft>(emptyDraft());
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [bankPickerOpen, setBankPickerOpen] = React.useState(false);

  const selectedBank = React.useMemo(() => {
    const selectedCode = draft.bank_code?.trim();
    if (!selectedCode) return null;
    return BRAZILIAN_BANKS.find((bank) => bank.code === selectedCode) || null;
  }, [draft.bank_code]);

  const openCreate = () => {
    setEditingId(0);
    setDraft(emptyDraft());
    setBankPickerOpen(false);
  };

  const openEdit = (account: ProviderReceivingAccountApi) => {
    setEditingId(account.id);
    setDraft({
      nickname: account.nickname,
      bank_code: account.bank_code || "",
      bank_name: account.bank_name || "",
      bank_agency: account.bank_agency || "",
      bank_account: account.bank_account || "",
      bank_document: account.bank_document || "",
      pix_key: account.pix_key || "",
    });
    setBankPickerOpen(false);
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setBankPickerOpen(false);
  };

  const handleSelectBank = (bankCode: string) => {
    const bank = BRAZILIAN_BANKS.find((entry) => entry.code === bankCode);
    setDraft((prev) => ({
      ...prev,
      bank_code: bank?.code || "",
      bank_name: bank?.name || "",
    }));
    setBankPickerOpen(false);
  };

  const handleClearBank = () => {
    setDraft((prev) => ({
      ...prev,
      bank_code: "",
      bank_name: "",
      bank_agency: "",
      bank_account: "",
      bank_document: "",
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok =
        editingId && editingId > 0
          ? await onUpdate(editingId, draft)
          : await onCreate(draft);
      if (ok) closeEditor();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: number) => {
    setDeletingId(accountId);
    try {
      await onDelete(accountId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Carteira de recebimento
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre dados para reaproveitar no método padrão. Você pode salvar uma conta
              bancária, só uma chave PIX, ou os dois juntos.
            </p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando carteira...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma conta cadastrada ainda. Adicione pelo menos uma opção para usar o método
              padrão nos contratos e links.
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const showBank = hasBankDetails(account);
                const showPix = Boolean(account.pix_key);

                return (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-line bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">
                            {account.nickname}
                          </span>
                          {showBank ? (
                            <span className="rounded-full bg-surface-warm px-2.5 py-1 text-xs font-medium text-ink">
                              Conta bancária
                            </span>
                          ) : null}
                          {showPix ? (
                            <span className="rounded-full bg-info-bg px-2.5 py-1 text-xs font-medium text-info-dark">
                              PIX
                            </span>
                          ) : null}
                        </div>

                        {showBank ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-ink-strong">
                              {formatBankLabel(account)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Agência {account.bank_agency || "—"} · Conta{" "}
                              {maskAccount(account.bank_account)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Documento {formatDocument(account.bank_document || "") || "—"}
                            </p>
                          </div>
                        ) : null}

                        {showPix ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-ink-strong">Chave PIX</p>
                            <p className="text-sm text-muted-foreground break-all">
                              {account.pix_key}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(account)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-danger-dark hover:text-danger-dark"
                          onClick={() => handleDelete(account.id)}
                          disabled={deletingId === account.id}
                        >
                          {deletingId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-ink-strong">
              <Landmark className="h-4 w-4 text-brand-dark" />
              {editingId && editingId > 0 ? "Editar conta" : "Nova conta"}
            </DialogTitle>
            <DialogDescription>
              {editingId && editingId > 0
                ? "Os dados atuais já estão carregados para você ajustar somente o que precisar."
                : "Cadastre uma opção de recebimento para reutilizar nos contratos e links."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Apelido</Label>
              <Input
                value={draft.nickname}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, nickname: e.target.value }))
                }
                placeholder="Ex.: Conta PJ principal"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-strong">Conta bancária</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Opcional. Se quiser, selecione o banco pelo código ou nome e complete os
                      demais dados da conta.
                    </p>
                  </div>
                  {hasBankDetails(draft) ? (
                    <Button variant="outline" size="sm" onClick={handleClearBank}>
                      Limpar banco
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Popover open={bankPickerOpen} onOpenChange={setBankPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={bankPickerOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedBank
                            ? `${selectedBank.code} · ${selectedBank.name}`
                            : draft.bank_name
                              ? formatBankLabel(draft)
                              : "Digite o código ou nome do banco"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar banco por código ou nome..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma instituição encontrada.</CommandEmpty>
                          <CommandGroup heading="Instituições registradas">
                            {BRAZILIAN_BANKS.map((bank) => (
                              <CommandItem
                                key={bank.code}
                                value={[
                                  bank.code,
                                  bank.name,
                                  bank.shortName,
                                  bank.ispb,
                                  normalizeBankSearchValue(
                                    `${bank.code} ${bank.name} ${bank.shortName} ${bank.ispb}`
                                  ),
                                ].join(" ")}
                                onSelect={() => handleSelectBank(bank.code)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedBank?.code === bank.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-ink-strong">
                                    {bank.code} · {bank.name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    ISPB {bank.ispb} · {bank.shortName}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input
                      value={draft.bank_agency}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, bank_agency: e.target.value }))
                      }
                      placeholder="0001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input
                      value={draft.bank_account}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, bank_account: e.target.value }))
                      }
                      placeholder="12345-6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CPF ou CNPJ da conta</Label>
                  <Input
                    value={formatDocument(draft.bank_document)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        bank_document: e.target.value.replace(/\D/g, "").slice(0, 14),
                      }))
                    }
                    placeholder="Somente números"
                  />
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-info/30 bg-info-bg/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-info-bg p-2 text-info-dark">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-strong">PIX independente</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Opcional. Você pode cadastrar só a chave PIX e deixar a conta bancária em
                      branco se preferir.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input
                    value={draft.pix_key}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, pix_key: e.target.value }))
                    }
                    placeholder="email, telefone, documento ou chave aleatória"
                  />
                </div>

                <div className="rounded-xl border border-info/30 bg-white/80 px-3 py-3 text-sm text-muted-foreground">
                  O administrador verá exatamente os dados cadastrados aqui quando houver repasse
                  pronto para o prestador.
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEditor}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingId && editingId > 0 ? (
                "Salvar alterações"
              ) : (
                "Cadastrar conta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
