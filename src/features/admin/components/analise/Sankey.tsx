import { useEffect, useMemo, useRef, useState } from "react";
import type { Caminhos } from "./tipos";

/**
 * Diagrama de caminhos (Sankey): colunas = etapas, blocos = onde as pessoas estavam, faixas = quantas
 * passaram de um bloco a outro. ▸ abre as ramificações de um bloco; ↺ mostra quem voltou à etapa.
 * `destaque` acende o caminho de uma pessoa.
 */

const proximo = (c: Caminhos, id: string) => c.liga.filter((l) => l[0] === id);
const anterior = (c: Caminhos, id: string) => c.liga.filter((l) => l[1] === id);
export const valorDe = (c: Caminhos, id: string) => (c.nos[id]?.coluna === 0 ? proximo(c, id) : anterior(c, id)).reduce((s, l) => s + l[2], 0);

/** Chance de chegar a um dos alvos saindo deste bloco (pelas proporções das faixas). */
export function chanceDe(c: Caminhos, id: string, memo: Record<string, number> = {}): number {
  if (id in memo) return memo[id];
  if (c.alvos.includes(id)) return (memo[id] = 1);
  memo[id] = 0; // evita laço
  const sai = proximo(c, id);
  const tot = sai.reduce((s, l) => s + l[2], 0);
  return (memo[id] = tot ? sai.reduce((s, l) => s + (l[2] / tot) * chanceDe(c, l[1], memo), 0) : 0);
}
export { proximo, anterior };

const LARG = 16, TOPO = 30, BASE = 10, VAO = 20;

export function Sankey({ dados, destaque, aoClicarNo, aoClicarLiga, alturaMin = 560 }: {
  dados: Caminhos; destaque?: string[] | null; aoClicarNo: (id: string) => void; aoClicarLiga: (i: number) => void; alturaMin?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(1200);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [dica, setDica] = useState<{ x: number; y: number; texto: string } | null>(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setAbertos(new Set()), [dados]);

  const desenho = useMemo(() => {
    const ids = Object.keys(dados.nos ?? {});
    if (!ids.length || !dados.liga?.length || !dados.etapas?.length) return null;
    const ncol = dados.etapas.length;
    const W = Math.max(largura, 1100);
    const valor: Record<string, number> = {};
    for (const id of ids) valor[id] = valorDe(dados, id);
    const extra = (id: string) => (abertos.has(id) && dados.sub?.[id] ? dados.sub[id].length * 15 + 6 : 0);
    const colunas = Array.from({ length: ncol }, (_, c) => ids.filter((id) => dados.nos[id].coluna === c && valor[id] > 0).sort((a, b) => Number(!!dados.nos[a].parou) - Number(!!dados.nos[b].parou)));
    const H = Math.max(alturaMin, ...colunas.map((col) => col.length * 52 + col.reduce((s, id) => s + extra(id), 0) + 80));
    const escala = Math.min(...colunas.filter((c) => c.length).map((col) => (H - TOPO - BASE - VAO * (col.length - 1) - col.reduce((s, id) => s + extra(id) + 36, 0)) / Math.max(1, col.reduce((s, id) => s + valor[id], 0))));
    const colX = (c: number) => 10 + c * ((W - 260) / Math.max(1, ncol - 1));
    const pos: Record<string, { x: number; y: number; h: number; saida: number; entrada: number }> = {};
    colunas.forEach((col, c) => { let y = TOPO; for (const id of col) { const h = Math.max(6, valor[id] * escala); pos[id] = { x: colX(c), y, h, saida: y, entrada: y }; y += h + 36 + extra(id) + VAO; } });
    const faixas = dados.liga.map(([a, b, v], i) => {
      const A = pos[a], B = pos[b];
      if (!A || !B || !v) return null;
      const h = v * escala;
      const x0 = A.x + LARG, x1 = B.x, y0 = A.saida + h / 2, y1 = B.entrada + h / 2, m = (x0 + x1) / 2;
      A.saida += h; B.entrada += h;
      return { i, a, b, v, d: `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1}`, h };
    }).filter(Boolean) as { i: number; a: string; b: string; v: number; d: string; h: number }[];
    return { W, H, valor, colX, pos, faixas, ids: ids.filter((id) => pos[id]) };
  }, [dados, largura, abertos, alturaMin]);

  if (!desenho) return <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">Ainda não há gente suficiente neste período para desenhar os caminhos.</p>;
  const { W, H, valor, colX, pos, faixas, ids } = desenho;
  const cam = destaque?.filter((id) => pos[id]) ?? null;
  const naRota = (a: string, b: string) => !!cam && cam.indexOf(a) >= 0 && cam.indexOf(b) === cam.indexOf(a) + 1;
  const ponto = (id: string) => [pos[id].x + LARG / 2, pos[id].y + pos[id].h / 2];
  let rota = "";
  cam?.forEach((id, i) => { const [x, y] = ponto(id); if (!i) rota += `M${x},${y}`; else { const [px, py] = ponto(cam[i - 1]); const m = (px + x) / 2; rota += ` C${m},${py} ${m},${y} ${x},${y}`; } });
  const mostrar = (e: React.MouseEvent, texto: string) => {
    const r = caixa.current!.getBoundingClientRect();
    setDica({ x: e.clientX - r.left + caixa.current!.scrollLeft + 14, y: e.clientY - r.top + 14, texto });
  };
  const alternar = (id: string) => setAbertos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div ref={caixa} className="relative overflow-x-auto" onMouseLeave={() => setDica(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block select-none" role="img" aria-label="Diagrama de caminhos">
        {dados.etapas.map((e, c) => <text key={e} x={colX(c)} y={14} className="fill-slate-400 text-[11px] font-bold uppercase tracking-wide">{e}</text>)}
        {faixas.map((f) => (
          <path key={f.i} d={f.d} fill="none" stroke={dados.nos[f.b].parou ? "#cbd5e1" : "#fdba74"} strokeWidth={Math.max(2, f.h)}
            opacity={cam ? (naRota(f.a, f.b) ? 0.65 : 0.15) : 0.5} className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseMove={(e) => mostrar(e, `${dados.nos[f.a].nome} → ${dados.nos[f.b].nome}: ${f.v} · clique para detalhes`)} onClick={() => aoClicarLiga(f.i)} />
        ))}
        {cam && cam.length > 1 ? <path d={rota} stroke="#ea580c" strokeWidth={4} fill="none" strokeLinecap="round" pointerEvents="none" /> : null}
        {cam?.map((id) => { const [x, y] = ponto(id); return <circle key={id} cx={x} cy={y} r={7} fill="#fff" stroke="#ea580c" strokeWidth={3} pointerEvents="none" />; })}
        {ids.map((id) => {
          const p = pos[id], no = dados.nos[id], ativo = !cam || cam.includes(id);
          const cor = no.parou ? "#94a3b8" : dados.alvos?.includes(id) ? "#047857" : "#f97316";
          const sub = abertos.has(id) ? dados.sub?.[id] : null;
          let yy = p.y;
          const tot = sub ? sub.reduce((s, x) => s + x[1], 0) || 1 : 1;
          return (
            <g key={id} opacity={ativo ? 1 : 0.35} className="cursor-pointer" onClick={() => aoClicarNo(id)} onMouseMove={(e) => mostrar(e, `${no.nome}: ${valor[id]} · clique para detalhes`)}>
              <rect x={p.x} y={p.y} width={LARG} height={p.h} rx={4} fill={cor} />
              {sub?.map(([, n], k) => { const hh = (n / tot) * p.h; const r = <rect key={k} x={p.x} y={yy} width={LARG} height={hh} fill={k % 2 ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.12)"} pointerEvents="none" />; yy += hh; return r; })}
            </g>
          );
        })}
        {ids.map((id) => {
          const p = pos[id], no = dados.nos[id], op = !cam || cam.includes(id) ? 1 : 0.45;
          const linhas: string[] = [];
          for (const w of no.nome.split(" ")) { const u = linhas[linhas.length - 1]; if (u && (u + " " + w).length <= 17) linhas[linhas.length - 1] = u + " " + w; else linhas.push(w); }
          const x = p.x + LARG + 7, temSub = !!dados.sub?.[id]?.length, aberto = abertos.has(id), volta = dados.voltas?.[id];
          const yAbre = p.y + 13 + linhas.length * 15 + 16;
          return (
            <g key={`t-${id}`} opacity={op}>
              <text x={x} y={p.y + 13} className="cursor-pointer fill-slate-800 text-[12.5px] font-semibold" onClick={() => aoClicarNo(id)}>
                {linhas.map((l, k) => <tspan key={k} x={x} dy={k ? 15 : 0}>{l}</tspan>)}
                <tspan x={x} dy={16} className="fill-slate-500 font-bold">{valor[id]} · {Math.round((valor[id] / Math.max(1, dados.total)) * 100)}%</tspan>
                {volta ? <tspan dx={6} className="fill-orange-600 font-bold">↺ {volta[0]}</tspan> : null}
              </text>
              {temSub ? <text x={x} y={yAbre} className="cursor-pointer fill-orange-600 text-[11.5px] font-bold" onClick={(e) => { e.stopPropagation(); alternar(id); }}>{aberto ? "▾ fechar" : `▸ abrir ${dados.sub[id].length} ramificações`}</text> : null}
              {temSub && aberto ? dados.sub[id].map(([r, n], k) => <text key={k} x={x + 8} y={yAbre + 16 + k * 15} className="fill-slate-600 text-[11.5px]">· {r} <tspan className="font-bold">{n}</tspan></text>) : null}
            </g>
          );
        })}
      </svg>
      {dica ? <div className="pointer-events-none absolute z-10 max-w-xs rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: dica.x, top: dica.y }}>{dica.texto}</div> : null}
    </div>
  );
}
