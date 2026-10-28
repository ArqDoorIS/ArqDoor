import { useSyncExternalStore } from "react";

/**
 * Store de presenca e digitando (spec specs/features/2026-10-presenca-no-chat).
 *
 * Dado de presenca (online/disponivel) vem de duas fontes:
 *   - Seed inicial: campos `online` e `is_active` de cada `otherUser` da lista GET /conversation.
 *   - Atualizacoes ao vivo: evento socket `presenca:mudou`.
 *
 * Dado de digitando vem de:
 *   - Evento socket `conversa:digitando`: ativa por 5 s para aquela conversa.
 *   - Evento socket `conversa:parou` ou `mensagem:nova`: cancela imediatamente.
 *
 * Os hooks usam `useSyncExternalStore` para que React saiba re-renderizar so quem
 * consome dados que mudaram.
 */

export interface EstadoPresenca {
  online: boolean;
  disponivel: boolean;
}

interface EstadoDigitando {
  userId: number;
  expiraEm: number; // ms timestamp
}

interface PresencaState {
  usuarios: Map<number, EstadoPresenca>;
  digitando: Map<number, EstadoDigitando>; // conversationId -> estado
}

const DIGITANDO_TTL_MS = 5_000;

/** Objeto imutavel para estado neutro (evita criacao de novo objeto a cada render). */
const PRESENCA_NEUTRA: EstadoPresenca = { online: false, disponivel: false };

let estado: PresencaState = {
  usuarios: new Map(),
  digitando: new Map(),
};

const ouvintes = new Set<() => void>();
const timersDigitando = new Map<number, ReturnType<typeof setTimeout>>();

function notificar() {
  ouvintes.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Popula o mapa de presenca a partir da lista de conversas carregada pela API. */
export function semeadoDeConversas(
  conversas: Array<{ otherUser: { id: number; is_active?: boolean; online?: boolean } }>
) {
  const next = new Map(estado.usuarios);
  for (const c of conversas) {
    const { id, is_active, online } = c.otherUser;
    // is_active undefined = padrao verdadeiro (coluna tem DEFAULT TRUE no banco)
    next.set(id, {
      online: Boolean(online),
      disponivel: is_active !== false,
    });
  }
  estado = { ...estado, usuarios: next };
  notificar();
}

/** Atualiza presenca de um usuario a partir do evento socket `presenca:mudou`. */
export function presencaMudou(payload: {
  user_id: number;
  online: boolean;
  disponivel: boolean;
}) {
  const next = new Map(estado.usuarios);
  next.set(payload.user_id, {
    online: payload.online,
    disponivel: payload.disponivel,
  });
  estado = { ...estado, usuarios: next };
  notificar();
}

/** Ativa "digitando..." para uma conversa pelo evento socket `conversa:digitando`. */
export function conversaDigitando(payload: {
  conversation_id: number;
  user_id: number;
}) {
  const { conversation_id, user_id } = payload;

  // Cancela timer anterior da mesma conversa
  const anterior = timersDigitando.get(conversation_id);
  if (anterior) clearTimeout(anterior);

  const next = new Map(estado.digitando);
  next.set(conversation_id, {
    userId: user_id,
    expiraEm: Date.now() + DIGITANDO_TTL_MS,
  });
  estado = { ...estado, digitando: next };

  // Auto-expiry: limpa o estado e notifica depois do TTL
  const timer = setTimeout(() => {
    const d = new Map(estado.digitando);
    d.delete(conversation_id);
    estado = { ...estado, digitando: d };
    timersDigitando.delete(conversation_id);
    notificar();
  }, DIGITANDO_TTL_MS);

  timersDigitando.set(conversation_id, timer);
  notificar();
}

/**
 * Cancela "digitando..." para uma conversa.
 * Chamado por `conversa:parou` ou quando `mensagem:nova` chega nessa conversa.
 */
export function conversaParou(conversationId: number) {
  const timer = timersDigitando.get(conversationId);
  if (timer) {
    clearTimeout(timer);
    timersDigitando.delete(conversationId);
  }

  if (!estado.digitando.has(conversationId)) return;

  const next = new Map(estado.digitando);
  next.delete(conversationId);
  estado = { ...estado, digitando: next };
  notificar();
}

/**
 * Retorna o estado de presenca de um usuario (ou defaults falsos se desconhecido).
 * Safe para userId undefined (retorna estado neutro).
 *
 * Usa PRESENCA_NEUTRA como referencia estavel para o fallback, evitando re-renders
 * infinitos no useSyncExternalStore (que compara snapshots por referencia/igualdade).
 */
export function usePresencaUsuario(userId: number | undefined): EstadoPresenca {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (userId == null) return PRESENCA_NEUTRA;
      return estado.usuarios.get(userId) ?? PRESENCA_NEUTRA;
    },
    () => PRESENCA_NEUTRA
  );
}

/**
 * Retorna se o outro participante esta digitando em uma conversa.
 * O timer interno cuida da expiracao automatica.
 */
export function useDigitando(conversationId: number | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (conversationId == null) return false;
      return estado.digitando.has(conversationId);
    },
    () => false
  );
}

/** Acesso direto ao estado (para testes). */
export function _getEstado(): PresencaState {
  return estado;
}

/** Reseta o store (para testes). */
export function _resetarEstado() {
  timersDigitando.forEach((t) => clearTimeout(t));
  timersDigitando.clear();
  estado = { usuarios: new Map(), digitando: new Map() };
}
