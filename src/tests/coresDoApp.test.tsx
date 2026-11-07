/**
 * Telas logadas com as cores do app (spec specs/features/2026-11-webapp-cores-do-app).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import tailwindConfig from '../../tailwind.config';

const raiz = path.resolve(__dirname, '..', '..');
const ler = (relativo: string) => readFileSync(path.join(raiz, relativo), 'utf8');

// Fora do escopo: admin (interno), landing (já tem spec), testes e o Footer, que é código morto.
const FORA = /^src\/(tests|components\/landing|features\/admin)\/|^src\/pages\/Admin|^src\/components\/Footer\.tsx$/;

function arquivos(pasta: string): string[] {
  return readdirSync(path.join(raiz, pasta)).flatMap((nome) => {
    const relativo = `${pasta}/${nome}`;
    if (FORA.test(relativo + '/')) return [];
    if (statSync(path.join(raiz, relativo)).isDirectory()) return arquivos(relativo);
    return /\.tsx?$/.test(nome) && !FORA.test(relativo) ? [relativo] : [];
  });
}

const FAMILIAS = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILIDADES = 'bg|text|border(?:-[trblxy])?|ring|from|via|to|fill|stroke|divide|outline|placeholder|accent|decoration|shadow';
// Classes dark: não entram: o modo escuro nunca é ligado.
const CRUA = new RegExp(`(?<![\\w:-])(?:(?!dark:)[a-z-]+:)*(?:${UTILIDADES})-(?:${FAMILIAS})-\\d{2,3}\\b`, 'g');

describe('tokens', () => {
  const cores = (tailwindConfig as any).theme.extend.colors;

  it('as cores de status têm os valores do app', () => {
    expect(cores.success).toEqual({ DEFAULT: '#4caf50', dark: '#2e7d32', bg: '#e8f5e9' });
    expect(cores.info).toEqual({ DEFAULT: '#2196f3', dark: '#1565c0', bg: '#e3f2fd' });
    expect(cores.danger).toEqual({ DEFAULT: '#f44336', dark: '#c62828', bg: '#ffebee' });
    expect(cores.category).toEqual({ DEFAULT: '#9c27b0', dark: '#6a1b9a', bg: '#f3e5f5' });
    // text é só do site: o warning.dark do app dá 2,41:1 como texto.
    expect(cores.warning).toEqual({ DEFAULT: '#ff9800', dark: '#f57f17', bg: '#fff3e0', text: '#a15500' });
  });

  it('a base do site usa a paleta do app', () => {
    const css = ler('src/index.css');
    expect(css).toMatch(/--foreground:\s*18 17% 15%;/);
    expect(css).toMatch(/--border:\s*30 35% 91%;/);
    expect(css).toMatch(/--muted-foreground:\s*20 7% 41%;/);
    expect(css).toMatch(/--destructive:\s*0 66% 47%;/);
  });

  it('o creme fica no body: campos e modais seguem brancos', () => {
    const css = ler('src/index.css');
    expect(css).toMatch(/body\s*{[^}]*bg-surface/);
    expect(css).not.toMatch(/--background:/);
  });
});

describe('telas logadas', () => {
  const todos = arquivos('src');

  it('nenhuma família crua do Tailwind', () => {
    const achados = todos.flatMap((arquivo) => (ler(arquivo).match(CRUA) ?? []).map((classe) => `${arquivo}: ${classe}`));
    expect(achados).toEqual([]);
  });

  it('nenhuma cor em hexadecimal nas classes', () => {
    const achados = todos.flatMap((arquivo) => (ler(arquivo).match(/\b(?:bg|text|border|ring)-\[#[0-9a-fA-F]{3,8}\]/g) ?? []).map((classe) => `${arquivo}: ${classe}`));
    expect(achados).toEqual([]);
  });

  it('nenhuma cor fixa fora dos logotipos e do ponto de presença', () => {
    const permitidos = /(AuthForms|StepConta|PresencaDot|Navbar)\.tsx$/;
    const achados = todos
      .filter((arquivo) => !permitidos.test(arquivo) && !arquivo.endsWith('brazilianBanks.ts'))
      .flatMap((arquivo) => (ler(arquivo).match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((cor) => `${arquivo}: ${cor}`));
    expect(achados).toEqual([]);
  });

  it('as páginas não põem fundo branco por cima do creme', () => {
    expect(ler('src/features/home/ProviderHomeDashboard.tsx')).not.toContain('<div className="bg-white">');
    expect(ler('src/features/home/ClientHomeDashboard.tsx')).not.toContain('<div className="bg-white xl:');
  });

  it('nenhum botão ou fundo em azul-marinho no lugar da marca', () => {
    expect(ler('src/pages/DemandsFeed.tsx')).not.toContain('bg-ink-strong');
    expect(ler('src/pages/ServicesFeed.tsx')).not.toContain('bg-ink-strong');
  });
});

describe('status', () => {
  it('existe um mapa único, e as telas usam ele', () => {
    expect(existsSync(path.join(raiz, 'src/lib/statusTone.ts'))).toBe(true);
    for (const arquivo of [
      'src/pages/KanbanPage.tsx',
      'src/pages/Invites.tsx',
      'src/components/DemandsManager.tsx',
      'src/features/messages/components/ProposalCard.tsx',
      'src/features/convite/acompanhamento/ContratoAcompanhamento.tsx',
    ]) {
      expect({ arquivo, usa: ler(arquivo).includes('statusTone') }).toEqual({ arquivo, usa: true });
    }
  });

  it('as colunas do Kanban são neutras, com um ponto de cor', () => {
    const kanban = ler('src/pages/KanbanPage.tsx');
    expect(kanban).not.toContain('colorClass');
    expect(kanban).toContain('ponto');
  });
});
