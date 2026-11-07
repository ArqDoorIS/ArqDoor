import { MessageCircle } from "lucide-react";

export function EmptyConversationState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink-strong mb-2">
          Selecione uma conversa
        </h3>
        <p className="text-muted-foreground">
          Escolha uma conversa da lista para começar a trocar mensagens
        </p>
      </div>
    </div>
  );
}
