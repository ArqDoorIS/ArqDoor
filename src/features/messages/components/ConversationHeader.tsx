import { Conversation } from '@/lib/Interfaces';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { usePresencaUsuario, useDigitando } from '@/lib/presenca';
import { PresencaDot } from '@/components/PresencaDot';

interface ConversationHeaderProps {
  conversation: Conversation;
  canCreateProposal: boolean;
  canViewProfile?: boolean;
  onOpenProposal: () => void;
  onViewProfile: () => void;
  onBack?: () => void;
}

/**
 * Rotulo de status abaixo do nome do outro participante.
 *
 * Prioridade: digitando > online > disponivel > indisponivel.
 * Cores conforme o contrato 2026-10-presenca-no-chat.
 */
function StatusLabel({
  presenca,
  digitando,
}: {
  presenca: { online: boolean; disponivel: boolean };
  digitando: boolean;
}) {
  if (digitando) {
    return (
      <span className="text-xs font-medium text-brand-dark">
        digitando...
      </span>
    );
  }
  if (presenca.online) {
    return (
      <span className="text-xs font-medium text-success-dark">
        Online
      </span>
    );
  }
  if (presenca.disponivel) {
    return (
      <span className="text-xs font-medium text-success-dark">
        Disponível
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-muted-foreground">
      Indisponível
    </span>
  );
}

export function ConversationHeader({
  conversation,
  canCreateProposal,
  canViewProfile = true,
  onOpenProposal,
  onViewProfile,
  onBack,
}: ConversationHeaderProps) {
  const presenca = usePresencaUsuario(conversation.otherUser.id);
  const digitando = useDigitando(conversation.id);

  return (
    <div className="p-4 bg-white border-b border-line flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-1"
            onClick={onBack}
          >
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
        )}
        {/* Avatar com bolinha de presenca */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.otherUser.avatar || conversation.otherUser.perfil || undefined} />
            <AvatarFallback className="bg-brand-soft text-brand-dark">
              {getInitials(conversation.otherUser.name)}
            </AvatarFallback>
          </Avatar>
          {(presenca.online || presenca.disponivel) && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5"
            >
              <PresencaDot presenca={presenca} tamanho={11} />
            </span>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-ink-strong">
            {conversation.otherUser.name}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusLabel presenca={presenca} digitando={digitando} />
            <Badge
              variant={
                conversation.otherUser.type === 'prestador'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs"
            >
              {conversation.otherUser.type === 'prestador'
                ? 'Prestador'
                : 'Cliente'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canViewProfile && (
          <Button variant="outline" onClick={onViewProfile}>
            Ver perfil
          </Button>
        )}
        {canCreateProposal && (
          <Button
            onClick={onOpenProposal}
            className="bg-brand hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Proposta
          </Button>
        )}
      </div>
    </div>
  );
}
