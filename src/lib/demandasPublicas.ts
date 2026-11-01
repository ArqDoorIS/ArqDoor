import { apiRequest } from "@/lib/queryClient";
import type { Demand } from "@/lib/Interfaces";

/** Demandas por página pedidas ao servidor: o máximo que `/demands/getall` aceita. */
export const DEMANDAS_POR_PAGINA = 100;
/** Teto de páginas: mil demandas. Passou disso, a busca vai para o servidor. */
export const MAXIMO_DE_PAGINAS = 10;

/**
 * Todas as demandas públicas, página por página (spec 2026-11-site-ganhos-rapidos).
 *
 * O site pedia só a primeira página, sem `page`: o servidor devolvia as 20 mais novas e a
 * busca e a ordenação por preço do site só valiam para elas. Hoje são poucas, então trazer
 * todas e manter a busca local é o caminho mais curto; com mais de mil, a busca precisa ir
 * para o servidor, como a de perfis.
 */
export async function buscarTodasAsDemandas(): Promise<Demand[]> {
  const todas: Demand[] = [];
  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina += 1) {
    const resposta = await apiRequest(
      "GET",
      `/demands/getall?page=${pagina}&limit=${DEMANDAS_POR_PAGINA}`
    );
    if (!resposta.ok) throw new Error("Erro ao buscar demandas");
    const corpo = await resposta.json();
    const desta: Demand[] = Array.isArray(corpo?.demands) ? corpo.demands : [];
    todas.push(...desta);
    const totalDePaginas = Number(corpo?.pagination?.totalPages) || 1;
    if (pagina >= totalDePaginas || desta.length === 0) break;
  }
  return todas;
}
