import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Loader2, AlertTriangle } from 'lucide-react'
import { useLocation } from 'wouter'
import { useEffect, useState } from 'react'

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ackChecked: boolean
  setAckChecked: (checked: boolean) => void
  signaturePassword: string
  setSignaturePassword: (password: string) => void
  showPasswordField: boolean
  signingDocument: boolean
  onAgree: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
  agreeLabel?: string
  passwordPlaceholder?: string
  requireAck?: boolean
  /**
   * Tem senha cadastrada SÓ para assinatura, separada da de login?
   *
   * Só importa para conta Google: ela não tem senha de login utilizável (nasce com uma
   * aleatória que o usuário nunca vê), então sem uma senha própria não há o que digitar.
   * Conta com e-mail e senha assina com a de login e não depende disto.
   */
  signaturePasswordConfigured?: boolean
  /** Conta criada pelo Google: ganha a escolha de assinar sem senha. */
  isGoogleAccount?: boolean
  /** Assina pela própria conta Google, sem senha. Obrigatório quando `isGoogleAccount`. */
  onConfirmWithGoogle?: () => void
}

export function SignatureDialog({
  open,
  onOpenChange,
  ackChecked,
  setAckChecked,
  signaturePassword,
  setSignaturePassword,
  showPasswordField,
  signingDocument,
  onAgree,
  onConfirm,
  title = 'Assinatura Digital',
  description = 'Confirme os termos e insira sua senha.',
  confirmLabel = 'Assinar',
  agreeLabel = 'Prosseguir',
  passwordPlaceholder = 'Digite sua senha',
  requireAck = true,
  signaturePasswordConfigured = true,
  isGoogleAccount = false,
  onConfirmWithGoogle,
}: SignatureDialogProps) {
  const [, navigate] = useLocation()

  /**
   * Conta Google escolhe COMO confirmar antes de qualquer campo aparecer.
   *
   * 'escolha'  -> os três botões
   * 'senha'    -> campo de senha (só faz sentido com senha própria cadastrada)
   * 'cadastrar'-> aviso de que falta cadastrar, com caminho para o perfil
   *
   * Conta com e-mail e senha nunca entra aqui: ela tem senha que o dono conhece, e
   * continua confirmando com ela como sempre fez.
   */
  type Etapa = 'escolha' | 'senha' | 'cadastrar'
  const [etapa, setEtapa] = useState<Etapa>(isGoogleAccount ? 'escolha' : 'senha')

  // Reabrir o diálogo tem que recomeçar a escolha; senão o segundo contrato assinado
  // pula direto para o campo de senha do primeiro.
  useEffect(() => {
    if (open) setEtapa(isGoogleAccount ? 'escolha' : 'senha')
  }, [open, isGoogleAccount])

  /**
   * Conta com e-mail e senha assina com a senha de LOGIN por padrão, então ela nunca é
   * bloqueada por não ter senha própria de assinatura. O bloqueio antigo usava
   * `signature_password_set`, que o backend liga sozinho em todo login: ele nunca
   * significou "definiu senha de assinatura" e travava conta Google sem saída.
   */
  const blocked = isGoogleAccount && etapa === 'cadastrar'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {blocked ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-bg px-3 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning-text mt-0.5" />
              <div className="text-sm text-warning-text">
                <p className="font-semibold">Você ainda não tem senha de assinatura.</p>
                <p className="mt-1">
                  Cadastre uma senha de assinatura antes de usar essa opção. Ela é só para
                  assinar contratos e não altera a forma como você entra na plataforma.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEtapa('escolha')}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onOpenChange(false)
                  navigate("/profile?tab=security")
                }}
              >
                Ir para o perfil
              </Button>
            </div>
          </div>
        ) : isGoogleAccount && etapa === 'escolha' ? (
          <div className="space-y-4">
            {requireAck && (
              <div className="flex items-center gap-2">
                <Checkbox checked={ackChecked} onCheckedChange={c => setAckChecked(!!c)} id="ack-google" />
                <label htmlFor="ack-google" className="text-sm">
                  Eu aceito os{' '}
                  <a href="/termos-de-uso" className="underline cursor-pointer">
                    Termos de uso
                  </a>{' '}
                  da plataforma
                </label>
              </div>
            )}

            <p className="text-sm text-muted-foreground">Escolha como você quer confirmar.</p>

            <Button
              className="w-full"
              disabled={(requireAck && !ackChecked) || signingDocument}
              onClick={() => onConfirmWithGoogle?.()}
            >
              {signingDocument ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-1" />
              )}
              Confirmar com minha conta Google
            </Button>

            <Button
              variant="outline"
              className="w-full border-brand-disabled text-brand-dark hover:bg-brand-soft"
              disabled={requireAck && !ackChecked}
              onClick={() => setEtapa(signaturePasswordConfigured ? 'senha' : 'cadastrar')}
            >
              Confirmar com senha
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requireAck && (
              <div className="flex items-center gap-2">
                <Checkbox checked={ackChecked} onCheckedChange={c => setAckChecked(!!c)} id="ack" />
                <label htmlFor="ack" className="text-sm">
                  Eu aceito os{' '}
                  <a href="/termos-de-uso" className="underline cursor-pointer">
                    Termos de uso
                  </a>{' '}
                  da plataforma
                </label>
              </div>
            )}

            {!showPasswordField ? (
              <Button
                onClick={onAgree}
                disabled={requireAck ? !ackChecked : false}
                className="w-full"
              >
                {agreeLabel}
              </Button>
            ) : (
              <>
                <Input
                  type="password"
                  placeholder={passwordPlaceholder}
                  value={signaturePassword}
                  onChange={e => setSignaturePassword(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={onConfirm}
                  disabled={signingDocument || !signaturePassword.trim()}
                >
                  {signingDocument ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-1" />
                  )}
                  {confirmLabel}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
