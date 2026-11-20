import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, FileCode2, FileJson, Loader2, Monitor, Smartphone, Upload, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alternador, Carregando, Erro } from "../analise/comum";
import { cn } from "../../utils";
import { CamposDoModelo, classeDoCampo } from "./CamposDoModelo";
import { MolduraDoEmail } from "./Previas";
import {
  NOME_DO_TIPO, arquivoDoModelo, camposDoJson, chaveDoArquivo, criarModeloEnviado, formatoDoArquivo, novaVersaoDoModelo,
  previaDoUpload, problemaDaChave, valoresParaEnviar,
  type CampoDoModelo, type Modelo, type PreviaDoUpload, type ValoresDosCampos,
} from "./api";

/**
 * Enviar um modelo de e-mail pelo painel (20/11/2026). Sem editor de código: o admin manda o
 * arquivo .mjml ou .html (e, se quiser, o .json com os campos), vê a prévia que o servidor monta,
 * ajusta os campos numa tabela e salva com um motivo. Cada envio é uma versão nova.
 */

const rotuloCampo = "block text-xs font-semibold text-slate-600";
const TAMANHO_MAXIMO = 200 * 1024; // igual ao backend (modelos-de-email)
const LARGURA = { celular: 375, computador: 640 } as const;
const TIPOS = Object.keys(NOME_DO_TIPO);
type Arquivo = { nome: string; conteudo: string };

/** Lê o arquivo como texto (FileReader: funciona em qualquer navegador). */
const lerTexto = (f: File) => new Promise<string>((ok, nao) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result ?? ""));
  r.onerror = () => nao(r.error ?? new Error("Não li o arquivo."));
  r.readAsText(f);
});

/** Tabela dos campos detectados: só dados (rótulo, tipo, obrigatório, padrão, ajuda, variáveis), nada de código. */
function TabelaDeCampos({ campos, mudar }: { campos: CampoDoModelo[]; mudar: (c: CampoDoModelo[]) => void }) {
  const muda = (i: number, parte: Partial<CampoDoModelo>) => mudar(campos.map((c, j) => (j === i ? { ...c, ...parte } : c)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs" data-testid="tabela-de-campos">
        <thead className="text-[10px] uppercase tracking-wide text-slate-400">
          <tr><th className="py-1 pr-2">Campo</th><th className="py-1 pr-2">Rótulo</th><th className="py-1 pr-2">Tipo</th><th className="py-1 pr-2">Obrig.</th><th className="py-1 pr-2">Padrão</th><th className="py-1 pr-2">Ajuda</th><th className="py-1">Variáveis</th></tr>
        </thead>
        <tbody>
          {campos.map((c, i) => (
            <tr key={c.chave} className="border-t border-slate-100 align-top" data-testid={`linha-campo-${c.chave}`}>
              <td className="py-1.5 pr-2 font-mono text-[11px] text-slate-700">{`{{${c.chave}}}`}</td>
              <td className="py-1.5 pr-2"><input aria-label={`Rótulo de ${c.chave}`} value={c.rotulo} onChange={(e) => muda(i, { rotulo: e.target.value })} className={cn(classeDoCampo, "mt-0 py-1 text-xs")} /></td>
              <td className="py-1.5 pr-2">
                <select aria-label={`Tipo de ${c.chave}`} value={c.tipo} className={cn(classeDoCampo, "mt-0 py-1 text-xs")}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    muda(i, { tipo, padrao: tipo === "booleano" ? false : typeof c.padrao === "string" ? c.padrao : null, aceita_variaveis: ["texto", "texto_longo", "url", "imagem_url"].includes(tipo) ? c.aceita_variaveis : false });
                  }}>
                  {TIPOS.map((t) => <option key={t} value={t}>{NOME_DO_TIPO[t]}</option>)}
                </select>
                {c.tipo === "opcoes" ? (
                  <input aria-label={`Opções de ${c.chave}`} placeholder="Opções separadas por vírgula" className={cn(classeDoCampo, "py-1 text-xs")}
                    value={c.opcoes.map((o) => o.valor).join(", ")}
                    onChange={(e) => muda(i, { opcoes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).map((v) => ({ valor: v, rotulo: v })) })} />
                ) : null}
              </td>
              <td className="py-1.5 pr-2"><input type="checkbox" aria-label={`Obrigatório: ${c.chave}`} className="accent-orange-600" checked={c.obrigatorio} onChange={(e) => muda(i, { obrigatorio: e.target.checked })} /></td>
              <td className="py-1.5 pr-2">
                {c.tipo === "booleano" ? (
                  <input type="checkbox" aria-label={`Padrão de ${c.chave}`} className="accent-orange-600" checked={c.padrao === true} onChange={(e) => muda(i, { padrao: e.target.checked })} />
                ) : (
                  <input aria-label={`Padrão de ${c.chave}`} value={typeof c.padrao === "string" ? c.padrao : ""} onChange={(e) => muda(i, { padrao: e.target.value || null })} className={cn(classeDoCampo, "mt-0 py-1 text-xs")} />
                )}
              </td>
              <td className="py-1.5 pr-2"><input aria-label={`Ajuda de ${c.chave}`} value={c.ajuda} onChange={(e) => muda(i, { ajuda: e.target.value })} className={cn(classeDoCampo, "mt-0 py-1 text-xs")} /></td>
              <td className="py-1.5"><input type="checkbox" aria-label={`Aceita variáveis: ${c.chave}`} className="accent-orange-600" checked={c.aceita_variaveis} onChange={(e) => muda(i, { aceita_variaveis: e.target.checked })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** `base` = modelo do painel recebendo versão nova (chave fixa, já preenchido). */
export function EnvioDeModelo({ base, existentes, aoSalvar, cancelar }: {
  base: Modelo | null; existentes: string[]; aoSalvar: (mensagem: string) => void; cancelar: () => void;
}) {
  const [arquivo, setArquivo] = useState<Arquivo | null>(null);
  const [json, setJson] = useState<{ nome: string; campos: CampoDoModelo[] } | null>(null);
  const [problemaDoArquivo, setProblemaDoArquivo] = useState<string | null>(null);
  const [campos, setCampos] = useState<CampoDoModelo[]>(base?.campos ?? []);
  // Campos só vão para a prévia depois que o admin mexe (antes, o servidor tira do arquivo sozinho).
  const [camposMexidos, setCamposMexidos] = useState(!!base);
  const [valores, setValores] = useState<ValoresDosCampos>({});
  const [chave, setChave] = useState(base?.chave ?? "");
  const [chaveMexida, setChaveMexida] = useState(!!base);
  const [rotulo, setRotulo] = useState(base?.rotulo ?? "");
  const [descricao, setDescricao] = useState(base?.descricao ?? "");
  const [motivo, setMotivo] = useState("");
  const [previa, setPrevia] = useState<{ carregando: boolean; dado: PreviaDoUpload | null; erro: string | null }>({ carregando: false, dado: null, erro: null });
  const [tela, setTela] = useState<keyof typeof LARGURA>("computador");
  const [arrastando, setArrastando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [recusa, setRecusa] = useState<string | null>(null);
  const entradaDoModelo = useRef<HTMLInputElement>(null);
  const entradaDoJson = useRef<HTMLInputElement>(null);
  /** O nome que veio do arquivo (o .json pode trocar por um melhor). */
  const nomeDoArquivo = useRef<string | null>(null);

  // Versão nova: começa do arquivo que está valendo.
  useEffect(() => {
    if (!base) return;
    let vivo = true;
    arquivoDoModelo(base.chave).then((a) => { if (vivo && a.conteudo) setArquivo({ nome: a.nome_arquivo, conteudo: a.conteudo }); })
      .catch((e) => { if (vivo) setProblemaDoArquivo(`Não baixei o arquivo atual: ${(e as Error).message}. Envie o arquivo novo.`); });
    return () => { vivo = false; };
  }, [base]);

  const camposEmUso = json ? json.campos : campos;
  const camposDaPrevia = json ? json.campos : camposMexidos ? campos : [];
  const modeloDeTeste = useMemo<Modelo>(() => ({ chave: chave || "novo", rotulo: rotulo || "Novo modelo", descricao, campos: camposEmUso }), [chave, rotulo, descricao, camposEmUso]);
  const valoresDeTeste = valoresParaEnviar(valores, modeloDeTeste);
  const chaveDaPrevia = arquivo ? JSON.stringify([arquivo.nome, arquivo.conteudo, camposDaPrevia, valoresDeTeste]) : "";

  // O servidor monta a prévia e diz o formato, os {{campos}} que achou, erros e avisos.
  useEffect(() => {
    if (!arquivo) return;
    let vivo = true;
    setPrevia((p) => ({ ...p, carregando: true, erro: null }));
    const t = setTimeout(() => {
      previaDoUpload({ nome_arquivo: arquivo.nome, conteudo: arquivo.conteudo, ...(camposDaPrevia.length ? { campos: camposDaPrevia } : {}), ...(Object.keys(valoresDeTeste).length ? { valores: valoresDeTeste } : {}) })
        .then((d) => {
          if (!vivo) return;
          setPrevia({ carregando: false, dado: d, erro: null });
          // Sem .json: os campos vêm dos {{x}} achados no arquivo; o que já foi ajustado fica.
          if (!json) {
            setCampos((atuais) => {
              const novos = d.campos_detectados.map((x) => atuais.find((c) => c.chave === x.chave) ?? x);
              return novos.map((c) => c.chave).join() === atuais.map((c) => c.chave).join() ? atuais : novos;
            });
          }
        })
        .catch((e) => { if (vivo) setPrevia({ carregando: false, dado: null, erro: (e as Error).message }); });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [chaveDaPrevia]); // eslint-disable-line react-hooks/exhaustive-deps

  const receber = async (lista: FileList | File[] | null) => {
    setProblemaDoArquivo(null);
    for (const f of Array.from(lista ?? [])) {
      if (f.size > TAMANHO_MAXIMO) { setProblemaDoArquivo(`${f.name} passou de 200 KB.`); continue; }
      const texto = await lerTexto(f).catch((e) => { setProblemaDoArquivo(`Não li ${f.name}: ${(e as Error).message}`); return null; });
      if (texto == null) continue;
      if (/\.json$/i.test(f.name)) {
        const r = camposDoJson(texto);
        if ("erro" in r) { setProblemaDoArquivo(r.erro); continue; }
        setJson({ nome: f.name, campos: r.campos });
        // O nome do .json vale mais que o do arquivo do e-mail (mas não apaga o que o admin escreveu).
        if (r.rotulo) setRotulo((x) => (!x || x === nomeDoArquivo.current ? r.rotulo! : x));
        if (r.descricao) setDescricao((x) => x || r.descricao!);
      } else if (formatoDoArquivo(f.name)) {
        setArquivo({ nome: f.name, conteudo: texto });
        setValores({});
        if (!chaveMexida) setChave(chaveDoArquivo(f.name));
        const nome = f.name.replace(/\.[^.]+$/, "");
        setRotulo((x) => { if (x) return x; nomeDoArquivo.current = nome; return nome; });
      } else setProblemaDoArquivo(`${f.name}: envie um arquivo .mjml, .html ou .json.`);
    }
  };
  const soltar = (e: DragEvent) => { e.preventDefault(); setArrastando(false); void receber(e.dataTransfer?.files ?? null); };

  const erroDaChave = base ? null : problemaDaChave(chave, existentes);
  const erros = previa.dado?.erros ?? [];
  const semOpcoes = camposEmUso.filter((c) => c.tipo === "opcoes" && !c.opcoes.length);
  const falta = !arquivo ? "Envie o arquivo .mjml ou .html."
    : previa.carregando || !previa.dado ? (previa.erro ? "A prévia não saiu: confira o arquivo." : "Montando a prévia…")
    : erros.length ? "Corrija os erros do arquivo antes de salvar."
    : erroDaChave ? `Chave: ${erroDaChave}`
    : !rotulo.trim() ? "Dê um nome para o modelo."
    : semOpcoes.length ? `Diga as opções de: ${semOpcoes.map((c) => c.chave).join(", ")}.`
    : !motivo.trim() ? "Escreva o motivo desta versão." : null;

  const salvar = async () => {
    if (!arquivo) return;
    setSalvando(true); setRecusa(null);
    const corpo = { rotulo: rotulo.trim(), descricao: descricao.trim(), nome_arquivo: arquivo.nome, conteudo: arquivo.conteudo, campos: camposEmUso, motivo: motivo.trim() };
    try {
      const b = base ? await novaVersaoDoModelo(base.chave, corpo) : await criarModeloEnviado(chave, corpo);
      const versao = b?.modelo?.versao ?? b?.versao;
      aoSalvar(base ? `Versão nova de "${rotulo.trim()}" salva${versao ? ` (versão ${versao})` : ""}.` : `Modelo "${rotulo.trim()}" salvo.`);
    } catch (e) { setRecusa((e as Error).message); } finally { setSalvando(false); setConfirmar(false); }
  };

  const formato = previa.dado?.formato ?? (arquivo ? formatoDoArquivo(arquivo.nome) : null);

  return (
    <div className="space-y-4" data-testid="envio-de-modelo">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{base ? `Nova versão de "${base.rotulo}"` : "Enviar modelo"}</h4>
        <button type="button" onClick={cancelar} className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"><X className="h-3.5 w-3.5" />Voltar para a lista</button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)} onDrop={soltar}
        className={cn("rounded-2xl border-2 border-dashed p-4 text-center text-sm transition-colors", arrastando ? "border-orange-400 bg-orange-50" : "border-slate-300 bg-slate-50")}
        data-testid="area-de-soltar"
      >
        <Upload className="mx-auto mb-1 h-5 w-5 text-slate-400" />
        <p className="text-slate-700">Arraste aqui o arquivo do e-mail (<b>.mjml</b> ou <b>.html</b>) e, se tiver, o <b>.json</b> com os campos.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => entradaDoModelo.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300">
            <FileCode2 className="h-3.5 w-3.5" />Escolher .mjml ou .html
          </button>
          <button type="button" onClick={() => entradaDoJson.current?.click()} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200 hover:ring-orange-300">
            <FileJson className="h-3.5 w-3.5" />Escolher .json dos campos (opcional)
          </button>
        </div>
        <input ref={entradaDoModelo} type="file" accept=".mjml,.html,.htm,text/html" aria-label="Arquivo do modelo (.mjml ou .html)" className="sr-only" onChange={(e) => { void receber(e.target.files); e.target.value = ""; }} />
        <input ref={entradaDoJson} type="file" accept=".json,application/json" aria-label="Arquivo dos campos (.json)" className="sr-only" onChange={(e) => { void receber(e.target.files); e.target.value = ""; }} />
        {arquivo ? <p className="mt-2 text-xs text-slate-600">Arquivo: <b className="font-mono">{arquivo.nome}</b>{formato ? <span className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white" data-testid="formato-detectado">{formato}</span> : null}</p> : null}
        {json ? (
          <p className="mt-1 text-xs text-slate-600">Campos: <b className="font-mono">{json.nome}</b>
            <button type="button" onClick={() => setJson(null)} className="ml-2 font-semibold text-slate-500 underline">tirar o .json</button></p>
        ) : null}
      </div>
      {problemaDoArquivo ? <Erro msg={problemaDoArquivo} /> : null}

      {arquivo ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,660px)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={rotuloCampo}>Chave
                <input aria-label="Chave" value={chave} disabled={!!base} onChange={(e) => { setChave(e.target.value); setChaveMexida(true); }} className={cn(classeDoCampo, "font-mono", erroDaChave && "border-rose-400")} />
                <span className={cn("mt-1 block font-normal", erroDaChave ? "text-rose-600" : "text-slate-400")}>{erroDaChave ?? (base ? "A chave não muda entre versões." : "É como os eventos chamam o modelo. Sai do nome do arquivo.")}</span>
              </label>
              <label className={rotuloCampo}>Nome
                <input aria-label="Nome do modelo" value={rotulo} onChange={(e) => setRotulo(e.target.value)} maxLength={80} className={classeDoCampo} />
              </label>
              <label className={cn(rotuloCampo, "sm:col-span-2")}>Descrição
                <input aria-label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} placeholder="Para que serve este modelo" className={classeDoCampo} />
              </label>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Campos</p>
              {json ? (
                <>
                  <p className="mb-1 text-xs text-slate-500">Vêm do <b>{json.nome}</b>.</p>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-xs" data-testid="campos-do-json">
                    {json.campos.map((c) => (
                      <li key={c.chave} className="flex flex-wrap gap-2 px-3 py-1.5">
                        <span className="font-mono text-slate-700">{`{{${c.chave}}}`}</span><span>{c.rotulo}</span>
                        <span className="text-slate-400">{NOME_DO_TIPO[c.tipo] ?? c.tipo}{c.obrigatorio ? " · obrigatório" : ""}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : campos.length ? (
                <>
                  <p className="mb-1 text-xs text-slate-500">Achados no arquivo (cada <code className="font-mono">{"{{x}}"}</code>). Ajuste o que cada um é; o arquivo não muda.</p>
                  <TabelaDeCampos campos={campos} mudar={(c) => { setCampos(c); setCamposMexidos(true); }} />
                </>
              ) : <p className="text-xs text-slate-400">{previa.carregando ? "Procurando os campos…" : "Nenhum {{campo}} no arquivo."}</p>}
            </div>

            {camposEmUso.length ? (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Valores de teste</p>
                <CamposDoModelo modelo={modeloDeTeste} valores={valores} mudar={setValores} />
              </div>
            ) : null}

            <label className={rotuloCampo}>Motivo desta versão
              <input aria-label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ex.: novo rodapé com o telefone do suporte" className={classeDoCampo} />
            </label>
          </div>

          <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Prévia</p>
              {previa.carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
              <span className="ml-auto"><Alternador valor={tela} mudar={setTela} opcoes={[["celular", "Celular", Smartphone], ["computador", "Computador", Monitor]]} /></span>
            </div>
            {previa.erro ? <Erro msg={`A prévia não saiu: ${previa.erro}`} /> : null}
            {erros.length ? (
              <ul role="alert" className="space-y-0.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" data-testid="erros-do-upload">
                {erros.map((e) => <li key={e}>{e}</li>)}
              </ul>
            ) : null}
            {previa.dado?.avisos.length ? (
              <ul className="space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="avisos-do-upload">
                {previa.dado.avisos.map((a) => <li key={a} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{a}</li>)}
              </ul>
            ) : null}
            {previa.dado?.assunto ? <p className="truncate rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600" data-testid="assunto-do-upload"><b>Assunto:</b> {previa.dado.assunto}</p> : null}
            {previa.dado?.html ? <MolduraDoEmail html={previa.dado.html} altura={560} largura={LARGURA[tela]} />
              : previa.carregando ? <div className="flex h-40 items-center justify-center rounded-lg border border-slate-200"><Carregando /></div> : null}
            {previa.dado?.texto ? (
              <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <summary className="cursor-pointer select-none font-semibold text-slate-700">Versão só texto</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans" data-testid="texto-puro-do-upload">{previa.dado.texto}</pre>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {recusa ? <Erro msg={`O servidor não aceitou: ${recusa}`} /> : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {falta ? <span className="text-xs text-slate-500" data-testid="falta-no-envio">{falta}</span> : null}
        <button type="button" disabled={!!falta || salvando} onClick={() => setConfirmar(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{base ? "Salvar versão nova" : "Salvar modelo"}
        </button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => { if (!salvando) setConfirmar(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{base ? "Salvar versão nova?" : "Salvar este modelo?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {base
                ? `Os eventos e personalizadas que usam "${base.rotulo}" passam a mandar a versão nova. Dá para voltar para uma versão anterior depois.`
                : `"${rotulo.trim()}" (${chave}) fica disponível para escolher nos eventos, comunicados e personalizadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={salvando} onClick={(e) => { e.preventDefault(); void salvar(); }} className="bg-orange-600 hover:bg-orange-700">Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

