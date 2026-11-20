import { apiRequest } from "@/lib/queryClient";

/**
 * Termos de Uso versionados (backend: controllers/termos/termosController.js, 20/11/2026).
 * Público: GET /termos e GET /termos/versoes/:versao. Logado: GET /users/me/termos e
 * POST /users/me/termos/aceitar. Painel: /admin/termos (só owner).
 */
export type VersaoDosTermos = { versao: number; conteudo: string; resumo: string | null; publicada_em: string | null };
export type SituacaoDosTermos = { versao_atual: number | null; versao_aceita: number | null; precisa_aceitar: boolean; resumo: string | null };

/** Erro com o status e o corpo da resposta (o 409 do aceite traz a versão em vigor). */
export class ErroDaApi extends Error {
  status: number;
  corpo: any;
  constructor(message: string, status: number, corpo: any) {
    super(message);
    this.status = status;
    this.corpo = corpo;
  }
}

export async function lerJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErroDaApi(body?.message || "Não foi possível falar com o servidor.", res.status, body);
  return body;
}

/**
 * O texto de uma versão (ou o da versão em vigor, sem `versao`). O GET /termos vai com
 * Cache-Control max-age=60: quem precisa do texto exato (a janela de aceite) passa `semCache`,
 * que põe um marcador no endereço para o navegador não responder com uma cópia guardada.
 */
export async function buscarTermos(versao?: number | null, opcoes: { semCache?: boolean } = {}): Promise<VersaoDosTermos> {
  let caminho = versao ? `/termos/versoes/${versao}` : "/termos";
  if (opcoes.semCache) caminho += `?_=${Date.now()}`;
  const body = await apiRequest("GET", caminho).then(lerJson);
  return body.data as VersaoDosTermos;
}

export async function buscarMinhaSituacao(): Promise<SituacaoDosTermos> {
  const body = await apiRequest("GET", "/users/me/termos").then(lerJson);
  return body.data as SituacaoDosTermos;
}

export async function aceitarTermos(versao: number) {
  return apiRequest("POST", "/users/me/termos/aceitar", { versao, origem: "site" }).then(lerJson);
}

/** A data da publicação, por extenso curto (20 de novembro de 2026). */
export const dataDaVersao = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";
