import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, FileCode2, Monitor, Smartphone } from "lucide-react";
import { Alternador, Carregando, useApi } from "../analise/comum";
import { CamposDoModelo } from "./CamposDoModelo";
import { PreviaDoEmail } from "./Previas";
import {
  CAMINHO_MODELOS, NOME_DO_TIPO, normalizarModelos, valoresParaEnviar,
  type Modelo, type PedidoDePrevia, type ValoresDosCampos,
} from "./api";

/**
 * Sub-aba "Modelos de e-mail" (só leitura). Os modelos são arquivos no backend: `nome.mjml` ou
 * `nome.html` e `nome.json` com os campos, na pasta src/services/notifications/modelos-de-email/.
 * Aqui só se vê cada um: campos, prévia com valores de teste e a versão só texto.
 */

export const PASTA_DOS_MODELOS = "src/services/notifications/modelos-de-email/";
const EXEMPLO = {
  titulo: "Título de exemplo",
  texto: "Este é um texto de exemplo, só para ver como o modelo fica.\nUma notificação de verdade traz o aviso aqui.",
};
const LARGURA = { celular: 375, computador: 640 } as const;
type Tela = keyof typeof LARGURA;
const padraoLegivel = (v: string | boolean | null) => (v == null || v === "" ? "—" : typeof v === "boolean" ? (v ? "Ligado" : "Desligado") : v);

function Ajuda() {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900" data-testid="ajuda-modelos">
      <p>
        Modelos novos entram pelo código: coloque <code className="font-mono">nome.mjml</code> ou <code className="font-mono">nome.html</code> e{" "}
        <code className="font-mono">nome.json</code> na pasta <code className="font-mono">{PASTA_DOS_MODELOS}</code> do backend; depois do deploy aparecem aqui.
      </p>
      <p className="mt-1">
        O <code className="font-mono">.json</code> declara os campos (texto, texto longo, link, cor, imagem, liga/desliga ou lista de opções), e no arquivo do
        e-mail cada campo entra como <code className="font-mono">{"{{chave}}"}</code>. MJML é uma linguagem que vira um e-mail que funciona em qualquer caixa de entrada:{" "}
        <a href="https://documentation.mjml.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
          documentação do MJML<ExternalLink className="h-3 w-3" />
        </a>.
      </p>
    </div>
  );
}

function CartaoDoModelo({ modelo }: { modelo: Modelo }) {
  const [valores, setValores] = useState<ValoresDosCampos>({});
  const [tela, setTela] = useState<Tela>("computador");
  const comErro = modelo.status === "erro";
  const camposEnviados = valoresParaEnviar(valores, modelo);
  const chaveValores = JSON.stringify(camposEnviados);
  const pedido = useMemo<PedidoDePrevia | null>(() => (comErro ? null : {
    modelo: modelo.chave, email_campos: JSON.parse(chaveValores), titulo: EXEMPLO.titulo, texto: EXEMPLO.texto, href: "/",
  }), [comErro, modelo.chave, chaveValores]);

  return (
    <article className="rounded-2xl border border-slate-200 p-3" data-testid="modelo-de-email">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-slate-900">{modelo.rotulo}</h4>
        {modelo.formato ? (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{modelo.formato}</span>
        ) : null}
        {modelo.arquivo ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500"><FileCode2 className="h-3.5 w-3.5" />{modelo.arquivo}</span>
        ) : null}
        <span className="ml-auto font-mono text-[11px] text-slate-400">{modelo.chave}</span>
      </header>
      {modelo.descricao ? <p className="mb-3 text-sm text-slate-600">{modelo.descricao}</p> : null}
      {modelo.variaveis_do_molde?.length ? (
        <p className="mb-3 text-xs text-slate-500" data-testid="variaveis-do-molde">
          O arquivo usa do evento: {modelo.variaveis_do_molde.map((k) => <code key={k} className="mr-1 font-mono text-slate-800">{`{{${k}}}`}</code>)}
          — só aparece para escolher nos envios que têm essas variáveis.
        </p>
      ) : null}
      {comErro ? (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>Este modelo não carregou.</b> {modelo.erro || "O servidor não disse o motivo."} Corrija o arquivo no backend; enquanto isso ele não aparece para escolher.</span>
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,660px)]">
        <div className="space-y-3">
          {modelo.campos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="campos-declarados">
                <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                  <tr><th className="py-1 pr-2">Campo</th><th className="py-1 pr-2">Tipo</th><th className="py-1 pr-2">Obrigatório</th><th className="py-1 pr-2">Padrão</th><th className="py-1">Variáveis</th></tr>
                </thead>
                <tbody>
                  {modelo.campos.map((c) => (
                    <tr key={c.chave} className="border-t border-slate-100 align-top">
                      <td className="py-1 pr-2 text-slate-800">{c.rotulo}<span className="block font-mono text-[10px] text-slate-400">{`{{${c.chave}}}`}</span></td>
                      <td className="py-1 pr-2 text-slate-600">{NOME_DO_TIPO[c.tipo] ?? c.tipo}</td>
                      <td className="py-1 pr-2 text-slate-600">{c.obrigatorio ? "Sim" : "Não"}</td>
                      <td className="max-w-[160px] truncate py-1 pr-2 text-slate-600" title={String(padraoLegivel(c.padrao))}>
                        {c.tipo === "cor" && typeof c.padrao === "string" ? <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle ring-1 ring-slate-200" style={{ background: c.padrao }} /> : null}
                        {padraoLegivel(c.padrao)}
                      </td>
                      <td className="py-1 text-slate-600">{c.aceita_variaveis ? "Aceita" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-slate-400">Sem campos para preencher.</p>}
          {!comErro && modelo.campos.length ? (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Valores de teste</p>
              <CamposDoModelo modelo={modelo} valores={valores} mudar={setValores} reservas={EXEMPLO} />
            </div>
          ) : null}
        </div>
        {!comErro ? (
          <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Prévia</p>
              <span className="ml-auto">
                <Alternador valor={tela} mudar={setTela} opcoes={[["celular", "Celular", Smartphone], ["computador", "Computador", Monitor]]} />
              </span>
            </div>
            <PreviaDoEmail pedido={pedido} altura={520} largura={LARGURA[tela]} comTexto />
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** `reserva` são os modelos que já vieram em GET /admin/notificacoes, caso a rota própria falhe. */
export function ModelosDeEmail({ reserva }: { reserva: Modelo[] }) {
  const { dado, erro } = useApi<unknown>(CAMINHO_MODELOS);
  const modelos = useMemo(() => (dado ? normalizarModelos(dado) : erro ? reserva : null), [dado, erro, reserva]);
  return (
    <div className="space-y-3">
      <Ajuda />
      {!modelos ? <Carregando /> : !modelos.length ? <p className="text-sm text-slate-400">Nenhum modelo de e-mail.</p> : (
        modelos.map((m) => <CartaoDoModelo key={m.chave} modelo={m} />)
      )}
    </div>
  );
}
