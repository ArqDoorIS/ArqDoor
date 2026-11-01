import { Conversation } from '@/lib/Interfaces';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageCircle, Users } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { formatConversationTime } from '../utils';
import { usePresencaUsuario, useDigitando } from '@/lib/presenca';
import { PresencaDot } from '@/components/PresencaDot';

interface ConversationsSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loading: boolean;
  conversationsError?: unknown;
  unreadMessageCount: number;
  onSelectConversation: (conversation: Conversation) => void;
}

/** Linha individual da lista - consome os hooks de presenca por conversa. */
function ConversationRow({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const presenca = usePresencaUsuario(conversation.otherUser.id);
  const digitando = useDigitando(conversation.id);

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
        isSelected
          ? 'bg-orange-50 border border-orange-200'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar com bolinha de presenca posicionada no canto inferior direito */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.otherUser.avatar || conversation.otherUser.perfil || undefined} />
            <AvatarFallback className="bg-orange-100 text-orange-700">
              {getInitials(conversation.otherUser.name)}
            </AvatarFallback>
          </Avatar>
          {/* Bolinha posicionada sobre o canto inferior direito do avatar */}
          {(presenca.online || presenca.disponivel) && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5"
            >
              <PresencaDot presenca={presenca} tamanho={11} />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900 truncate">
              {conversation.otherUser.name}
            </p>
            <span className="text-xs text-gray-500">
              {formatConversationTime(conversation.updated_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {digitando ? (
              <p
                className="text-sm truncate"
                style={{ color: '#c2410c' }}
              >
                digitando...
              </p>
            ) : (
              <p className="text-sm text-gray-600 truncate">
                {conversation.lastMessage?.content || 'Nenhuma mensagem'}
              </p>
            )}
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
    </div>
  );
}

export function ConversationsSidebar({
  conversations,
  currentConversation,
  loading,
  conversationsError,
  unreadMessageCount,
  onSelectConversation,
}: ConversationsSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Messages
          </h1>
          {unreadMessageCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadMessageCount}
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando conversas...</p>
          </div>
        ) : conversationsError ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-600">Erro ao carregar conversas</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map(conversation => (
              <ConversationRow
                key={conversation.id ?? conversation.otherUser?.id ?? `conv-${conversation.id}`}
                conversation={conversation}
                isSelected={currentConversation?.id === conversation.id}
                onSelect={() => onSelectConversation(conversation)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
